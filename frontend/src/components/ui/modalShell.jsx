import React from 'react';
import { twMerge } from 'tailwind-merge';

const ModalShell = ({ children, className = '' }) => {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start sm:items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div
        className={twMerge(
          'w-full max-w-md rounded-2xl bg-light-card dark:bg-dark-card ring-1 ring-light-border dark:ring-dark-border shadow-card p-5 sm:p-8 max-h-[calc(100vh-1.5rem)] sm:max-h-[calc(100vh-2rem)] overflow-y-auto',
          className
        )}
      >
        {children}
      </div>
    </div>
  );
};

export default ModalShell;
