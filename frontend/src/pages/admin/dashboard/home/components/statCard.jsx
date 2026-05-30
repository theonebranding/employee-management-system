/* eslint-disable react-hooks/exhaustive-deps */
import { format } from 'date-fns';
import { CalendarDays, Clock, LogOut, Plane, UserCheck, Users, UserX } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StatCard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    presentToday: 0,
    absentToday: 0,
    checkedInToday: 0,
    checkedOutToday: 0,
    onLeaveToday: 0,
    onHolidayToday: 0,
    lateArrivals: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;
  const navigate = useNavigate();

  const onNavigateClick = () => {
    navigate('/admin/dashboard/attendance');
  };

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const todayDate = format(new Date(), 'yyyy-MM-dd');
        const response = await fetch(`${BASE_URL}/attendance-summary/date?date=${todayDate}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!response.ok) throw new Error('Failed to fetch attendance stats');

        const data = await response.json();
        // Prefer the backend-computed counters (they apply the same
        // resolvedStatus rule the lists below use, so leave/holiday rows are
        // excluded). Fall back to a client-side recompute against the summary
        // for backward compat with older backends.
        const summary = Array.isArray(data.summary) ? data.summary : [];
        const NON_WORKING = ['leave', 'holiday', 'absent'];
        const fallbackCheckedOut = summary.filter(
          emp =>
            emp.hasCheckInPunch && emp.hasCheckOutPunch && !NON_WORKING.includes(emp.resolvedStatus)
        ).length;
        const fallbackCheckedIn = summary.filter(
          emp =>
            emp.hasCheckInPunch &&
            !emp.hasCheckOutPunch &&
            !NON_WORKING.includes(emp.resolvedStatus)
        ).length;
        const fallbackOnLeave = summary.filter(emp => emp.resolvedStatus === 'leave').length;

        setStats({
          totalEmployees: data.totalEmployees || 0,
          presentToday: data.present || 0,
          absentToday: data.absent || 0,
          checkedInToday: typeof data.checkedIn === 'number' ? data.checkedIn : fallbackCheckedIn,
          checkedOutToday:
            typeof data.checkedOut === 'number' ? data.checkedOut : fallbackCheckedOut,
          onLeaveToday: typeof data.onLeave === 'number' ? data.onLeave : fallbackOnLeave,
          onHolidayToday: data.onHoliday || 0,
          lateArrivals: data.late || 0,
        });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const statItems = [
    {
      icon: Users,
      label: 'Total Employees',
      key: 'totalEmployees',
      color: 'bg-primary/10 text-primary',
    },
    {
      icon: UserCheck,
      label: 'Present Today',
      key: 'presentToday',
      color: 'bg-success/10 text-success',
    },
    {
      icon: Clock,
      label: 'Checked In',
      key: 'checkedInToday',
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      icon: LogOut,
      label: 'Checked Out',
      key: 'checkedOutToday',
      color: 'bg-green-500/10 text-green-500',
    },
    {
      icon: UserX,
      label: 'Absent Today',
      key: 'absentToday',
      color: 'bg-danger/10 text-danger',
    },
    {
      icon: Plane,
      label: 'On Leave',
      key: 'onLeaveToday',
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      icon: CalendarDays,
      label: 'On Holiday',
      key: 'onHolidayToday',
      color: 'bg-amber-500/10 text-amber-500',
    },
    {
      icon: Clock,
      label: 'Late Arrivals',
      key: 'lateArrivals',
      color: 'bg-warning/10 text-warning',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statItems.map(item => (
          <div
            key={item.key}
            className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border animate-pulse"
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="h-4 w-24 bg-light-bg dark:bg-dark-bg rounded mb-1"></div>
                <div className="h-8 w-16 bg-light-bg dark:bg-dark-bg rounded"></div>
                <div className="h-4 w-20 bg-light-bg dark:bg-dark-bg rounded mt-2"></div>
              </div>
              <div className={`p-3 rounded-lg ${item.color}`}>
                <item.icon className="w-6 h-6 " />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    console.error('Error fetching stats:', error);
    return <p className="text-danger">Error fetching attendance stats.</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {statItems.map(item => (
        <div
          key={item.key}
          className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border hover:border-primary/50 transition-all cursor-pointer"
          onClick={onNavigateClick}
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-light-text dark:text-dark-text  text-sm font-medium mb-1">
                {item.label}
              </p>
              <h3 className="text-2xl font-bold text-light-text dark:text-dark-text">
                {stats[item.key]}
              </h3>
            </div>
            <div className={`p-3 rounded-lg ${item.color}`}>
              <item.icon className="w-6 h-6" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatCard;
