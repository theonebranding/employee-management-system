import React from 'react';
import { twMerge } from 'tailwind-merge';

const toneClasses = {
  success: 'bg-success/10 text-success ring-success/30',
  warning: 'bg-warning/10 text-warning ring-warning/30',
  danger: 'bg-danger/10 text-danger ring-danger/30',
  info: 'bg-info/10 text-info ring-info/30',
  neutral: 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text ring-light-border dark:ring-dark-border',
};

const StatusBadge = ({ label, icon = null, tone = 'neutral', className = '' }) => {
  return (
    <div
      className={twMerge(
        'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg ring-1 text-sm',
        toneClasses[tone] || toneClasses.neutral,
        className
      )}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
};

export default StatusBadge;
