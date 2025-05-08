import { Search } from 'lucide-react';
import React from 'react';

const SearchBar = ({
  month,
  year,
  onMonthChange,
  onYearChange,
  onSearchChange,
  searchDate,
  onFetch,
  loading,
}) => {
  return (
    <div className="flex flex-col justify-center gap-6 bg-light-card dark:bg-dark-card rounded-2xl p-8 shadow-card ring-1 ring-light-border dark:ring-dark-border">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex flex-wrap gap-4 items-center">
          <select
            value={month}
            onChange={onMonthChange}
            className="p-3 rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary focus:border-primary transition-all hover:bg-light-card dark:hover:bg-dark-card"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(0, i).toLocaleString('default', { month: 'long' })}
              </option>
            ))}
          </select>
          <input
            type="number"
            value={year}
            onChange={onYearChange}
            className="p-3 rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary focus:border-primary transition-all w-32 hover:bg-light-card dark:hover:bg-dark-card"
            min="2000"
            max={new Date().getFullYear()}
          />
          <button
            onClick={onFetch}
            disabled={loading}
            className="px-6 py-3 rounded-xl bg-primary text-white font-semibold hover:bg-primary-dark focus:ring-2 focus:ring-primary-light transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-card hover:shadow-primary/20"
          >
            <Search className="w-5 h-5" />
            {loading ? 'Loading...' : 'Show Records'}
          </button>
        </div>
      </div>
      <div className="bg-light-bg dark:bg-dark-bg rounded-2xl p-6 ring-1 ring-light-border dark:ring-dark-border">
        <div className="flex items-center">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-light-text dark:text-dark-text opacity-70" />
            </div>
            <input
              type="text"
              placeholder="Search by date (MM/DD/YYYY)"
              value={searchDate}
              onChange={onSearchChange}
              className="p-3 pl-10 w-full rounded-xl bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text border border-light-border dark:border-dark-border focus:ring-2 focus:ring-primary focus:border-primary transition-all hover:bg-light-card dark:hover:bg-dark-card"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SearchBar;
