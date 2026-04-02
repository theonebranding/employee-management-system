import Attendance from '../models/attendanceSchema.js';
import Employee from '../models/employeeSchema.js';
import Leave from '../models/leaveSchema.js';
import Salary from '../models/salarySchema.js';

const round = (value, digits = 2) => Number(Number(value || 0).toFixed(digits));

const getMonthRange = (month, year) => {
  const now = new Date();
  const numericMonth = Number(month) || now.getUTCMonth() + 1;
  const numericYear = Number(year) || now.getUTCFullYear();

  return {
    month: numericMonth,
    year: numericYear,
    start: new Date(Date.UTC(numericYear, numericMonth - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(numericYear, numericMonth, 0, 23, 59, 59, 999)),
    prevMonth: numericMonth === 1 ? 12 : numericMonth - 1,
    prevYear: numericMonth === 1 ? numericYear - 1 : numericYear,
  };
};

const countWorkingDaysInRange = (start, end) => {
  let total = 0;
  const cursor = new Date(start);

  while (cursor <= end) {
    const day = cursor.getUTCDay();
    if (day !== 0) total += 1;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return total;
};

const buildEmployeeFilter = ({ department, location, managerId }) => {
  const filter = {};
  if (department) filter.department = department;
  if (location) filter.location = location;
  if (managerId) filter.manager = managerId;
  return filter;
};

const buildDailyPresenceSet = (attendanceRecords = []) => {
  const present = new Set();
  attendanceRecords.forEach((record) => {
    if (record.checkInTime) {
      const day = new Date(record.date).toISOString().split('T')[0];
      present.add(`${record.employee.toString()}:${day}`);
    }
  });
  return present;
};

export const generateExecutiveKpis = async ({ month, year, department, location, managerId }) => {
  const range = getMonthRange(month, year);
  const employeeFilter = buildEmployeeFilter({ department, location, managerId });
  const employees = await Employee.find(employeeFilter).select('_id department location manager').lean();
  const employeeIds = employees.map((employee) => employee._id);

  if (employeeIds.length === 0) {
    return {
      period: { month: range.month, year: range.year },
      filters: { department: department || null, location: location || null, managerId: managerId || null },
      kpis: {
        absenteeismRate: 0,
        overtimeCost: 0,
        leaveLiability: 0,
        payrollVariance: 0,
        headcount: 0,
      },
      totals: { workingDays: 0, potentialWorkDays: 0, presentDays: 0, absentDays: 0 },
    };
  }

  const [attendanceRecords, approvedLeaves, salariesCurrent, salariesPrev] = await Promise.all([
    Attendance.find({
      employee: { $in: employeeIds },
      date: { $gte: range.start, $lte: range.end },
    }).select('employee date totalWorkingTime checkInTime').lean(),
    Leave.find({
      employee: { $in: employeeIds },
      status: 'approved',
      startDate: { $lte: range.end },
      endDate: { $gte: range.start },
    }).select('employee startDate endDate').lean(),
    Salary.find({
      employee: { $in: employeeIds },
      salaryMonth: range.month,
      salaryYear: range.year,
    }).select('employee baseSalary totalSalary').lean(),
    Salary.find({
      employee: { $in: employeeIds },
      salaryMonth: range.prevMonth,
      salaryYear: range.prevYear,
    }).select('employee totalSalary').lean(),
  ]);

  const workingDays = countWorkingDaysInRange(range.start, range.end);
  const potentialWorkDays = workingDays * employeeIds.length;
  const presentDays = buildDailyPresenceSet(attendanceRecords).size;
  const absentDays = Math.max(0, potentialWorkDays - presentDays);
  const absenteeismRate = potentialWorkDays > 0 ? (absentDays / potentialWorkDays) * 100 : 0;

  let overtimeCost = 0;
  const salaryByEmployee = new Map(salariesCurrent.map((salary) => [String(salary.employee), salary]));
  attendanceRecords.forEach((record) => {
    const overtimeMinutes = Math.max(0, Number(record.totalWorkingTime || 0) - 480);
    if (overtimeMinutes <= 0) return;
    const salary = salaryByEmployee.get(String(record.employee));
    const hourlyRate = salary ? Number(salary.baseSalary || 0) / (22 * 8) : 0;
    overtimeCost += (overtimeMinutes / 60) * hourlyRate;
  });

  let leaveLiability = 0;
  approvedLeaves.forEach((leave) => {
    const salary = salaryByEmployee.get(String(leave.employee));
    if (!salary) return;

    const dailyRate = Number(salary.baseSalary || 0) / 30;
    const leaveStart = new Date(Math.max(new Date(leave.startDate).getTime(), range.start.getTime()));
    const leaveEnd = new Date(Math.min(new Date(leave.endDate).getTime(), range.end.getTime()));
    const days = Math.floor((leaveEnd.getTime() - leaveStart.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    leaveLiability += Math.max(0, days) * dailyRate;
  });

  const currentNet = salariesCurrent.reduce((acc, salary) => acc + Number(salary.totalSalary || 0), 0);
  const previousNet = salariesPrev.reduce((acc, salary) => acc + Number(salary.totalSalary || 0), 0);
  const payrollVariance = currentNet - previousNet;

  return {
    period: { month: range.month, year: range.year },
    filters: {
      department: department || null,
      location: location || null,
      managerId: managerId || null,
    },
    kpis: {
      absenteeismRate: round(absenteeismRate),
      overtimeCost: round(overtimeCost),
      leaveLiability: round(leaveLiability),
      payrollVariance: round(payrollVariance),
      headcount: employeeIds.length,
    },
    totals: {
      workingDays,
      potentialWorkDays,
      presentDays,
      absentDays,
    },
  };
};

export const generateDrilldowns = async ({ month, year }) => {
  const range = getMonthRange(month, year);
  const employees = await Employee.find({}).select('_id department location manager name email').lean();
  const employeeIds = employees.map((employee) => employee._id);

  const [attendanceRecords, approvedLeaves, salaries] = await Promise.all([
    Attendance.find({
      employee: { $in: employeeIds },
      date: { $gte: range.start, $lte: range.end },
    }).select('employee date totalWorkingTime checkInTime').lean(),
    Leave.find({
      employee: { $in: employeeIds },
      status: 'approved',
      startDate: { $lte: range.end },
      endDate: { $gte: range.start },
    }).select('employee startDate endDate').lean(),
    Salary.find({
      employee: { $in: employeeIds },
      salaryMonth: range.month,
      salaryYear: range.year,
    }).select('employee totalSalary').lean(),
  ]);

  const groupMetrics = new Map();
  const employeeMap = new Map(employees.map((employee) => [String(employee._id), employee]));
  const salaryMap = new Map(salaries.map((salary) => [String(salary.employee), Number(salary.totalSalary || 0)]));

  const ensureGroup = (key) => {
    if (!groupMetrics.has(key)) {
      groupMetrics.set(key, {
        headcount: 0,
        presentDays: 0,
        overtimeMinutes: 0,
        leaveDays: 0,
        payroll: 0,
      });
    }
    return groupMetrics.get(key);
  };

  employees.forEach((employee) => {
    const departmentKey = `department:${employee.department || 'Unassigned'}`;
    const locationKey = `location:${employee.location || 'Unassigned'}`;
    const managerKey = `manager:${employee.manager ? employee.manager.toString() : 'Unassigned'}`;

    [departmentKey, locationKey, managerKey].forEach((key) => {
      const entry = ensureGroup(key);
      entry.headcount += 1;
      entry.payroll += salaryMap.get(String(employee._id)) || 0;
    });
  });

  attendanceRecords.forEach((record) => {
    const employee = employeeMap.get(String(record.employee));
    if (!employee) return;

    const keys = [
      `department:${employee.department || 'Unassigned'}`,
      `location:${employee.location || 'Unassigned'}`,
      `manager:${employee.manager ? employee.manager.toString() : 'Unassigned'}`,
    ];

    keys.forEach((key) => {
      const entry = ensureGroup(key);
      if (record.checkInTime) entry.presentDays += 1;
      entry.overtimeMinutes += Math.max(0, Number(record.totalWorkingTime || 0) - 480);
    });
  });

  approvedLeaves.forEach((leave) => {
    const employee = employeeMap.get(String(leave.employee));
    if (!employee) return;

    const keys = [
      `department:${employee.department || 'Unassigned'}`,
      `location:${employee.location || 'Unassigned'}`,
      `manager:${employee.manager ? employee.manager.toString() : 'Unassigned'}`,
    ];

    const days =
      Math.floor((new Date(leave.endDate).getTime() - new Date(leave.startDate).getTime()) / (24 * 60 * 60 * 1000)) +
      1;
    keys.forEach((key) => {
      const entry = ensureGroup(key);
      entry.leaveDays += Math.max(0, days);
    });
  });

  const normalize = (prefix) =>
    [...groupMetrics.entries()]
      .filter(([key]) => key.startsWith(`${prefix}:`))
      .map(([key, value]) => ({
        group: key.replace(`${prefix}:`, ''),
        ...value,
        overtimeHours: round(value.overtimeMinutes / 60),
        payroll: round(value.payroll),
      }))
      .sort((a, b) => b.headcount - a.headcount);

  return {
    period: { month: range.month, year: range.year },
    byDepartment: normalize('department'),
    byLocation: normalize('location'),
    byManager: normalize('manager'),
  };
};

export const generateTrendSeries = async ({ months = 6 }) => {
  const totalMonths = Math.max(3, Math.min(Number(months) || 6, 18));
  const now = new Date();
  const points = [];

  for (let i = totalMonths - 1; i >= 0; i -= 1) {
    const cursor = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    const month = cursor.getUTCMonth() + 1;
    const year = cursor.getUTCFullYear();
    points.push({ month, year, label: `${year}-${String(month).padStart(2, '0')}` });
  }

  const employeeDocs = await Employee.find({}).select('_id location manager').lean();
  const employeeIds = employeeDocs.map((employee) => employee._id);
  const employeeMap = new Map(employeeDocs.map((employee) => [String(employee._id), employee]));

  const byMonth = [];

  for (const point of points) {
    const range = getMonthRange(point.month, point.year);
    const [attendanceRecords, salaries] = await Promise.all([
      Attendance.find({ employee: { $in: employeeIds }, date: { $gte: range.start, $lte: range.end } })
        .select('employee date checkInTime totalWorkingTime')
        .lean(),
      Salary.find({ salaryMonth: point.month, salaryYear: point.year })
        .select('employee totalSalary')
        .lean(),
    ]);

    const uniquePresence = buildDailyPresenceSet(attendanceRecords).size;
    const workingDays = countWorkingDaysInRange(range.start, range.end);
    const potentialDays = workingDays * employeeIds.length;
    const absenteeismRate = potentialDays ? ((potentialDays - uniquePresence) / potentialDays) * 100 : 0;
    const payrollTotal = salaries.reduce((acc, salary) => acc + Number(salary.totalSalary || 0), 0);

    const locationMap = new Map();
    const managerMap = new Map();

    salaries.forEach((salary) => {
      const employee = employeeMap.get(String(salary.employee));
      if (!employee) return;
      const locationKey = employee.location || 'Unassigned';
      const managerKey = employee.manager ? employee.manager.toString() : 'Unassigned';

      locationMap.set(locationKey, (locationMap.get(locationKey) || 0) + Number(salary.totalSalary || 0));
      managerMap.set(managerKey, (managerMap.get(managerKey) || 0) + Number(salary.totalSalary || 0));
    });

    byMonth.push({
      month: point.month,
      year: point.year,
      label: point.label,
      absenteeismRate: round(absenteeismRate),
      payrollTotal: round(payrollTotal),
      topLocations: [...locationMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([group, value]) => ({ group, payroll: round(value) })),
      topManagers: [...managerMap.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([group, value]) => ({ group, payroll: round(value) })),
    });
  }

  return { months: totalMonths, series: byMonth };
};
