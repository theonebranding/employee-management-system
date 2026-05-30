import { ArrowDown, ArrowUp } from 'lucide-react';
import React, { useEffect, useRef } from 'react';

const AttendanceTable = ({
  filteredRecords,
  sortConfig,
  handleSort,
  formatLocation,
  formatTime,
}) => {
  const tableScrollRef = useRef(null);
  const scrollIntervalRef = useRef(null);

  const stopAutoScroll = () => {
    if (scrollIntervalRef.current) {
      clearInterval(scrollIntervalRef.current);
      scrollIntervalRef.current = null;
    }
  };

  const startAutoScroll = direction => {
    if (!tableScrollRef.current) return;
    stopAutoScroll();
    const step = direction === 'left' ? -18 : 18;
    scrollIntervalRef.current = setInterval(() => {
      tableScrollRef.current?.scrollBy({ left: step, behavior: 'auto' });
    }, 16);
  };

  useEffect(() => () => stopAutoScroll(), []);

  const renderSortIcon = key => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 inline ml-1" />
    );
  };

  // The attendance records store ISO timestamps in UTC. Render times in IST
  // so they match what employees see across the rest of the app (matches the
  // IST formatters used by the admin reports).
  const formatIstTime = (value) => {
    if (!value || value === 'N/A') return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatIstDate = (value) => {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="relative group/table">
      <div ref={tableScrollRef} className="overflow-x-auto">
        <table className="min-w-full text-light-text dark:text-dark-text">
        <thead className="text-light-text dark:text-dark-text">
        <tr className="border-b border-light-border dark:border-dark-border">
          <th className="text-left py-4 px-6 cursor-pointer" onClick={() => handleSort('date')}>
            Date {renderSortIcon('date')}
          </th>
          <th
            className="text-left py-4 px-6 cursor-pointer"
            onClick={() => handleSort('checkInTime')}
          >
            Check-in Time {renderSortIcon('checkInTime')}
          </th>
          <th className="text-left py-4 px-6">Check-in Location</th>
          <th
            className="text-left py-4 px-6 cursor-pointer"
            onClick={() => handleSort('checkOutTime')}
          >
            Check-out Time {renderSortIcon('checkOutTime')}
          </th>
          <th className="text-left py-4 px-6">Check-out Location</th>
          <th className="text-left py-4 px-6">Break Duration</th>
          <th
            className="text-left py-4 px-6 cursor-pointer"
            onClick={() => handleSort('totalWorkingTime')}
          >
            Total Working Time {renderSortIcon('totalWorkingTime')}
          </th>
        </tr>
      </thead>
      <tbody>
        {filteredRecords.map(record => (
          <tr
            key={record._id}
            className="hover:bg-light-bg dark:hover:bg-dark-bg transition-colors border-b border-light-border dark:border-dark-border"
          >
            <td className="py-4 px-6">{formatIstDate(record.date)}</td>
            <td className="py-4 px-6">{formatIstTime(record.checkInTime)}</td>
            <td className="py-4 px-6">
              {formatLocation(record.checkInLocation, 'checkIn', record)}
            </td>
            <td className="py-4 px-6">{formatIstTime(record.checkOutTime)}</td>
            <td className="py-4 px-6">
              {formatLocation(record.checkOutLocation, 'checkOut', record)}
            </td>
            <td className="py-4 px-6">
              {record.totalRecessDuration
                ? `${Math.floor(record.totalRecessDuration / 60000)} minutes`
                : '0 minutes'}
            </td>
            <td className="py-4 px-6">
              {record.totalWorkingTime ? formatTime(record.totalWorkingTime) : '0 hours 0 minutes'}
            </td>
          </tr>
        ))}
      </tbody>
        </table>
      </div>
      <div
        className="absolute left-0 top-0 bottom-0 z-10 w-12 cursor-w-resize"
        onMouseEnter={() => startAutoScroll('left')}
        onMouseLeave={stopAutoScroll}
        aria-hidden="true"
      />
      <div
        className="absolute right-0 top-0 bottom-0 z-10 w-12 cursor-e-resize"
        onMouseEnter={() => startAutoScroll('right')}
        onMouseLeave={stopAutoScroll}
        aria-hidden="true"
      />
    </div>
  );
};

export default AttendanceTable;
