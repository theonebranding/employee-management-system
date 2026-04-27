import React from 'react';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children, size = 'md' }) => {
  if (!isOpen) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 sm:items-center sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
      />

      {/* Modal */}
      <div className={`relative z-10 w-full ${sizeClasses[size]} bg-white dark:bg-dark-card rounded-2xl shadow-lg border border-light-border/70 dark:border-dark-border max-h-[90vh] overflow-hidden flex flex-col`}>
        {/* Header */}
        <div className="flex items-center justify-between border-b border-light-border/70 dark:border-dark-border p-6 shrink-0">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-light-bg dark:hover:bg-dark-bg transition-colors"
          >
            <X className="w-5 h-5 text-light-text/60 dark:text-dark-text/60" />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto modal-hide-scrollbar"
          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
        >
          {children}
        </div>
      </div>
      <style>{`.modal-hide-scrollbar::-webkit-scrollbar{display:none;}`}</style>
    </div>
  );
};

export default Modal;
