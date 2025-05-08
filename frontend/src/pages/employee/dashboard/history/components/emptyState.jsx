import { Calendar, CheckSquare } from 'lucide-react';
import React from 'react';

const EmptyState = ({ isLateTab, searchDate }) => {
  return (
    <div className="text-center py-12">
      {isLateTab ? (
        <CheckSquare className="w-16 h-16 text-success mx-auto mb-4" />
      ) : (
        <Calendar className="w-16 h-16 text-light-text dark:text-dark-text opacity-50 mx-auto mb-4" />
      )}
      <p className="text-light-text dark:text-dark-text opacity-70">
        {searchDate
          ? isLateTab
            ? 'No late check-ins match your search criteria.'
            : 'No records match your search criteria.'
          : isLateTab
            ? 'No late check-ins for the selected month and year.'
            : 'No records available for the selected month and year.'}
      </p>
    </div>
  );
};

export default EmptyState;
