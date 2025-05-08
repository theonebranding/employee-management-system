import { AlertCircle, CheckSquare, Clock, Users } from 'lucide-react';
import React from 'react';

const StatsCard = ({ totalDays, averageWorkHours, onTimeCheckins, totalLateCheckins }) => {
  const stats = [
    {
      title: 'Total Days',
      value: totalDays,
      icon: Users,
      color: 'text-info',
      bgColor: 'bg-info/10',
      borderColor: 'ring-info/20',
    },
    {
      title: 'Average Hours/Day',
      value: `${averageWorkHours}h`,
      icon: Clock,
      color: 'text-success',
      bgColor: 'bg-success/10',
      borderColor: 'ring-success/20',
    },
    {
      title: 'On-Time Check-ins',
      value: onTimeCheckins,
      icon: CheckSquare,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      borderColor: 'ring-secondary/20',
    },
    {
      title: 'Late Check-ins',
      value: totalLateCheckins,
      icon: AlertCircle,
      color: 'text-danger',
      bgColor: 'bg-danger/10',
      borderColor: 'ring-danger/20',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {stats.map((stat, index) => (
        <div
          key={index}
          className={`p-6 rounded-2xl ring-1 ${stat.borderColor} ${stat.bgColor} bg-light-card dark:bg-dark-card shadow-card ring-light-border dark:ring-dark-border`}
        >
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${stat.bgColor} ${stat.color}`}>
              <stat.icon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-light-text dark:text-dark-text opacity-70 text-sm">{stat.title}</p>
              <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsCard;
