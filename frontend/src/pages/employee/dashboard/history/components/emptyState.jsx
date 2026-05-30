import { Calendar, CheckSquare, UserX } from 'lucide-react';
import React from 'react';

const EmptyState = ({ tab = 'attendance', searchDate }) => {
  // Backwards compat: older callers pass `isLateTab` instead of `tab`. Map it
  // here so the component stays a drop-in replacement.
  const resolvedTab = tab;

  const Icon =
    resolvedTab === 'late' ? CheckSquare : resolvedTab === 'absent' ? UserX : Calendar;
  const iconClass =
    resolvedTab === 'late'
      ? 'text-success'
      : resolvedTab === 'absent'
        ? 'text-success'
        : 'text-light-text dark:text-dark-text opacity-50';

  let message;
  if (searchDate) {
    if (resolvedTab === 'late') {
      message = 'No late check-ins match your search criteria.';
    } else if (resolvedTab === 'absent') {
      message = 'No absent days match your search criteria.';
    } else {
      message = 'No records match your search criteria.';
    }
  } else if (resolvedTab === 'late') {
    message = 'No late check-ins for the selected month and year.';
  } else if (resolvedTab === 'absent') {
    message = 'No absent days for the selected month and year.';
  } else {
    message = 'No records available for the selected month and year.';
  }

  return (
    <div className="text-center py-12">
      <Icon className={`w-16 h-16 ${iconClass} mx-auto mb-4`} />
      <p className="text-light-text dark:text-dark-text opacity-70">{message}</p>
    </div>
  );
};

export default EmptyState;
