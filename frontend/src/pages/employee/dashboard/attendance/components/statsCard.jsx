// components/StatsCard.jsx
import React from 'react';

const StatsCard = ({ icon: Icon, title, value, colorClass, subText, onClick, disabled }) => {
  const IconComponent = onClick ? (
    <button
      onClick={onClick}
      disabled={disabled}
      type="button"
      className={`p-3 rounded-xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-primary/40 border border-transparent shadow-sm ${colorClass} ${
        disabled
          ? 'opacity-30 cursor-not-allowed shadow-none'
          : 'hover:scale-105 hover:shadow-md active:scale-95 cursor-pointer hover:border-current'
      }`}
      title={`Click to trigger ${title}`}
    >
      <Icon className="w-6 h-6" />
    </button>
  ) : (
    <div className={`p-2.5 rounded-xl border border-transparent ${colorClass}`}>
      <Icon className="w-5.5 h-5.5" />
    </div>
  );

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border flex flex-col justify-between min-h-[145px] transition-all duration-300 hover:shadow-md">
      <div>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text tracking-tight">
            {title}
          </h3>
          {IconComponent}
        </div>
        {subText && (
          <div className="mb-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-warning/15 text-warning ring-1 ring-warning/30">
              {subText}
            </span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-[10px] text-light-text/50 dark:text-dark-text/50 uppercase tracking-widest font-semibold mb-0.5">
          {onClick ? 'Action Status' : 'Details'}
        </p>
        <p className="text-light-text dark:text-dark-text font-medium text-sm sm:text-base leading-relaxed break-words">
          {value}
        </p>
      </div>
    </div>
  );
};

export default StatsCard;
