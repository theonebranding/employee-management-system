import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';

const AttendanceTable = ({
  filteredRecords,
  sortConfig,
  handleSort,
  formatLocation,
  formatTime,
}) => {
  const renderSortIcon = key => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? (
      <ArrowUp className="h-4 w-4 inline ml-1" />
    ) : (
      <ArrowDown className="h-4 w-4 inline ml-1" />
    );
  };

  return (
    <table className="w-full text-light-text dark:text-dark-text">
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
            <td className="py-4 px-6">{new Date(record.date).toLocaleDateString()}</td>
            <td className="py-4 px-6">
              {record.checkInTime && record.checkInTime !== 'N/A'
                ? new Date(record.checkInTime).toLocaleTimeString()
                : '-'}
            </td>
            <td className="py-4 px-6">
              {formatLocation(record.checkInLocation, 'checkIn', record)}
            </td>
            <td className="py-4 px-6">
              {record.checkOutTime && record.checkOutTime !== 'N/A'
                ? new Date(record.checkOutTime).toLocaleTimeString()
                : '-'}
            </td>
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
  );
};

export default AttendanceTable;
