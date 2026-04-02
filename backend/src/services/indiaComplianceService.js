const inr = (value) => Number(value || 0);

const calculatePf = (baseSalary) => {
  const wage = Math.min(inr(baseSalary), 15000);
  return Number((wage * 0.12).toFixed(2));
};

const calculateEsi = (grossSalary) => {
  const gross = inr(grossSalary);
  if (gross > 21000) return 0;
  return Number((gross * 0.0075).toFixed(2));
};

const calculateProfessionalTax = (grossSalary) => {
  const gross = inr(grossSalary);
  if (gross <= 15000) return 0;
  if (gross <= 25000) return 150;
  return 200;
};

const calculateTdsPlaceholder = (annualTaxableIncome) => {
  const yearly = inr(annualTaxableIncome);
  if (yearly <= 700000) return 0;
  return Number((yearly * 0.05 / 12).toFixed(2));
};

export const computeIndiaComplianceForSalary = (salary) => {
  const gross = inr(salary.baseSalary) + inr(salary.bonuses);
  const statutoryPf = calculatePf(salary.baseSalary);
  const statutoryEsi = calculateEsi(gross);
  const statutoryPt = calculateProfessionalTax(gross);
  const statutoryTds = calculateTdsPlaceholder(gross * 12);

  const expectedStatutory = statutoryPf + statutoryEsi + statutoryPt + statutoryTds;
  const actualDeductions = inr(salary.deductions);

  const errors = [];
  const warnings = [];

  if (actualDeductions + 1 < expectedStatutory) {
    errors.push(
      `Statutory deductions shortfall. Expected >= ${expectedStatutory.toFixed(2)}, found ${actualDeductions.toFixed(2)}`
    );
  }

  if (!salary.employeeEmail) {
    errors.push('Employee email missing for statutory export records.');
  }

  if (salary.baseSalary <= 0) {
    errors.push('Base salary must be greater than zero.');
  }

  if (!salary.salaryMonth || !salary.salaryYear) {
    warnings.push('Salary period incomplete (month/year).');
  }

  return {
    employeeId: salary.employee,
    employeeEmail: salary.employeeEmail,
    salaryId: salary._id,
    components: {
      pf: statutoryPf,
      esi: statutoryEsi,
      pt: statutoryPt,
      tds: statutoryTds,
      expectedStatutory,
      actualDeductions,
    },
    errors,
    warnings,
  };
};

export const generateComplianceExports = (records, { month, year }) => {
  const pfRows = [];
  const esiRows = [];
  const ptRows = [];
  const tdsRows = [];

  records.forEach((record) => {
    const row = `${record.employeeEmail},${record.components.pf},${record.components.esi},${record.components.pt},${record.components.tds}`;
    if (record.components.pf > 0) pfRows.push(row);
    if (record.components.esi > 0) esiRows.push(row);
    if (record.components.pt > 0) ptRows.push(row);
    if (record.components.tds > 0) tdsRows.push(row);
  });

  return {
    pf: [`employee_email,pf_amount,month,year`, ...pfRows.map((r) => `${r.split(',')[0]},${r.split(',')[1]},${month},${year}`)],
    esi: [`employee_email,esi_amount,month,year`, ...esiRows.map((r) => `${r.split(',')[0]},${r.split(',')[2]},${month},${year}`)],
    pt: [`employee_email,pt_amount,month,year`, ...ptRows.map((r) => `${r.split(',')[0]},${r.split(',')[3]},${month},${year}`)],
    tds: [`employee_email,tds_amount,month,year`, ...tdsRows.map((r) => `${r.split(',')[0]},${r.split(',')[4]},${month},${year}`)],
  };
};
