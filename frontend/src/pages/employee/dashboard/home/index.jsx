import {
  BarController,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Title,
  Tooltip,
} from 'chart.js';
import { CheckCircle, FileText, Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import { useTheme } from '../../../../context/themeContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend
);

// IST helpers ----------------------------------------------------------------
// Attendance dates from the API are UTC ISO strings. The dashboard needs the
// matching IST day, weekday, and week-of-month so the chart buckets line up
// with how employees experience the calendar.
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

const toIstParts = iso => {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const ist = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: ist.getUTCFullYear(),
    month: ist.getUTCMonth() + 1, // 1-12
    day: ist.getUTCDate(), // 1-31
    weekday: ist.getUTCDay(), // 0 = Sun ... 6 = Sat
  };
};

const WEEK_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const computeStats = (records, monthIndex, year) => {
  // Bucket per-day working minutes for the active month, keyed by IST day-of-month.
  const minutesByDay = new Map();
  let totalWorkingMinutes = 0;
  let presentDays = 0;
  let halfDays = 0;
  let leaveDays = 0;
  let holidayDays = 0;
  let absentDays = 0;
  let workingDayCount = 0; // present + half + leave (paid) -- cap denominator

  for (const record of records) {
    const parts = toIstParts(record.date);
    if (!parts) continue;
    if (parts.month !== monthIndex || parts.year !== year) continue;

    const minutes = Number(record.totalWorkingTime || 0);
    totalWorkingMinutes += minutes;
    minutesByDay.set(parts.day, (minutesByDay.get(parts.day) || 0) + minutes);

    switch (record.status) {
      case 'full-day':
        presentDays += 1;
        workingDayCount += 1;
        break;
      case 'half-day':
        halfDays += 1;
        workingDayCount += 1;
        break;
      case 'leave':
        leaveDays += 1;
        workingDayCount += 1;
        break;
      case 'holiday':
        holidayDays += 1;
        break;
      case 'absent':
        absentDays += 1;
        break;
      default:
        break;
    }
  }

  // Daily working hours for the *current ISO week*: anchor at the most recent
  // Monday and walk forward seven days. Days outside the active month or
  // without an attendance record render as zero.
  const todayParts = toIstParts(new Date().toISOString()) || {
    year,
    month: monthIndex,
    day: 1,
    weekday: 1,
  };
  const today = new Date(Date.UTC(todayParts.year, todayParts.month - 1, todayParts.day));
  // Day-of-week starting Monday (0..6).
  const todayDow = (todayParts.weekday + 6) % 7;
  const weekStart = new Date(today.getTime());
  weekStart.setUTCDate(weekStart.getUTCDate() - todayDow);

  const dailyHoursThisWeek = WEEK_LABELS.map((_, idx) => {
    const cursor = new Date(weekStart.getTime());
    cursor.setUTCDate(cursor.getUTCDate() + idx);
    const sameMonth = cursor.getUTCFullYear() === year && cursor.getUTCMonth() + 1 === monthIndex;
    if (!sameMonth) return 0;
    const minutes = minutesByDay.get(cursor.getUTCDate()) || 0;
    return Number((minutes / 60).toFixed(2));
  });

  const totalHoursThisWeek = Number(
    dailyHoursThisWeek.reduce((sum, hours) => sum + hours, 0).toFixed(2)
  );
  const activeDaysThisWeek = dailyHoursThisWeek.filter(h => h > 0).length;

  // Weekly buckets across the calendar month (1-7, 8-14, 15-21, 22-end).
  const daysInMonth = new Date(year, monthIndex, 0).getDate();
  const weekRanges = [
    [1, 7],
    [8, 14],
    [15, 21],
    [22, daysInMonth],
  ];
  const weeklyHours = weekRanges.map(([start, end]) => {
    let minutes = 0;
    for (let day = start; day <= end; day += 1) {
      minutes += minutesByDay.get(day) || 0;
    }
    return Number((minutes / 60).toFixed(2));
  });
  const weeklyLabels = weekRanges.map(([start, end], idx) => `Week ${idx + 1} (${start}-${end})`);

  // Attendance percentage = (present + half*0.5) / countable days, where
  // countable days = present + half + absent. Leaves/holidays are excluded
  // from both numerator and denominator so they don't penalize the score.
  const attendanceDenominator = presentDays + halfDays + absentDays;
  const monthlyAttendancePct = attendanceDenominator
    ? Math.round(((presentDays + halfDays * 0.5) / attendanceDenominator) * 100)
    : 0;

  return {
    dailyHoursThisWeek,
    weeklyHours,
    weeklyLabels,
    totalHoursThisWeek,
    activeDaysThisWeek,
    monthlyAttendancePct,
    totals: {
      presentDays,
      halfDays,
      leaveDays,
      holidayDays,
      absentDays,
      workingDayCount,
      totalWorkingMinutes,
    },
  };
};

const DashboardHome = () => {
  const lineChartRef = useRef(null);
  const barChartRef = useRef(null);
  const lineChartInstanceRef = useRef(null);
  const barChartInstanceRef = useRef(null);
  const { theme } = useTheme();

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const employeeId = localStorage.getItem('_id');

  const now = useMemo(() => new Date(), []);
  const monthIndex = now.getMonth() + 1;
  const year = now.getFullYear();

  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const fetchMonthlyAttendance = async () => {
      if (!employeeId) return;
      setLoading(true);
      try {
        const response = await fetch(
          `${BASE_URL}/attendance-summary/monthly?employeeId=${employeeId}&month=${monthIndex}&year=${year}`,
          {
            headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
          }
        );
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch monthly attendance');
        }
        if (cancelled) return;
        setRecords(Array.isArray(data.records) ? data.records : []);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error('Error fetching monthly attendance:', err);
        setError(err.message || 'Failed to fetch monthly attendance');
        toast.error(err.message || 'Failed to fetch monthly attendance');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMonthlyAttendance();
    return () => {
      cancelled = true;
    };
  }, [BASE_URL, employeeId, monthIndex, year]);

  const stats = useMemo(() => computeStats(records, monthIndex, year), [records, monthIndex, year]);

  useEffect(() => {
    const textColor = theme === 'dark' ? '#E5E7EB' : '#1F2937';
    const gridColor = theme === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)';

    if (lineChartInstanceRef.current) {
      lineChartInstanceRef.current.destroy();
      lineChartInstanceRef.current = null;
    }
    if (barChartInstanceRef.current) {
      barChartInstanceRef.current.destroy();
      barChartInstanceRef.current = null;
    }

    if (lineChartRef.current) {
      lineChartInstanceRef.current = new ChartJS(lineChartRef.current, {
        type: 'line',
        data: {
          labels: WEEK_LABELS,
          datasets: [
            {
              label: 'Daily Working Hours',
              data: stats.dailyHoursThisWeek,
              borderColor: '#4F46E5',
              backgroundColor: 'rgba(79, 70, 229, 0.3)',
              tension: 0.4,
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: {
              ticks: { color: textColor },
              grid: { color: gridColor },
              beginAtZero: true,
            },
          },
        },
      });
    }

    if (barChartRef.current) {
      barChartInstanceRef.current = new ChartJS(barChartRef.current, {
        type: 'bar',
        data: {
          labels: stats.weeklyLabels,
          datasets: [
            {
              label: 'Hours Worked',
              data: stats.weeklyHours,
              backgroundColor: '#22C55E',
            },
          ],
        },
        options: {
          responsive: true,
          plugins: { legend: { labels: { color: textColor } } },
          scales: {
            x: { ticks: { color: textColor }, grid: { color: gridColor } },
            y: {
              ticks: { color: textColor },
              grid: { color: gridColor },
              beginAtZero: true,
            },
          },
        },
      });
    }

    return () => {
      if (lineChartInstanceRef.current) {
        lineChartInstanceRef.current.destroy();
        lineChartInstanceRef.current = null;
      }
      if (barChartInstanceRef.current) {
        barChartInstanceRef.current.destroy();
        barChartInstanceRef.current = null;
      }
    };
  }, [theme, stats]);

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg text-light-text dark:bg-dark-bg dark:text-dark-text transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        <Header
          title="Dashboard Home"
          description="Daily working, weekly hours worked, and attendance metrics."
          icon={<FileText className="w-8 h-8" />}
        />

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-emerald-500/10 text-emerald-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-emerald-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Total Hours Worked This Week</h3>
            <p className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin inline" />
              ) : (
                `${stats.totalHoursThisWeek} hrs`
              )}
            </p>
          </div>

          <div className="bg-yellow-500/10 text-yellow-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-yellow-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Active Days This Week</h3>
            <p className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin inline" />
              ) : (
                `${stats.activeDaysThisWeek} ${stats.activeDaysThisWeek === 1 ? 'Day' : 'Days'}`
              )}
            </p>
          </div>

          <div className="bg-red-500/10 text-red-800 dark:text-white dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:scale-105 transform transition-all duration-300">
            <CheckCircle className="w-8 h-8 text-red-800 dark:text-white mb-4" />
            <h3 className="text-lg font-semibold">Monthly Attendance</h3>
            <p className="text-2xl font-bold">
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin inline" />
              ) : (
                `${stats.monthlyAttendancePct}%`
              )}
            </p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold mb-4">Daily Working Hours</h3>
            <canvas ref={lineChartRef}></canvas>
          </div>

          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border">
            <h3 className="text-lg font-semibold mb-4">Weekly Hours Worked</h3>
            <canvas ref={barChartRef}></canvas>
          </div>
        </div>

        {error && !loading ? <p className="mt-4 text-sm text-danger">{error}</p> : null}
      </div>

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1000}
      />
    </div>
  );
};

export default DashboardHome;
