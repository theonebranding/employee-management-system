import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';

const LateCheckInsTable = ({ filteredLateCheckIns, sortConfig, handleSort, formatLateBy }) => {
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
          <th className="text-left py-4 px-6">Predefined Check-in</th>
          <th
            className="text-left py-4 px-6 cursor-pointer"
            onClick={() => handleSort('actualCheckInTime')}
          >
            Actual Check-in {renderSortIcon('actualCheckInTime')}
          </th>
          <th
            className="text-left py-4 px-6 cursor-pointer"
            onClick={() => handleSort('lateByMinutes')}
          >
            Late By {renderSortIcon('lateByMinutes')}
          </th>
        </tr>
      </thead>
      <tbody>
        {filteredLateCheckIns.map(record => (
          <tr
            key={record._id}
            className="hover:bg-light-bg dark:hover:bg-dark-bg transition-colors border-b border-light-border dark:border-dark-border"
          >
            <td className="py-4 px-6">{new Date(record.date).toLocaleDateString()}</td>
            <td className="py-4 px-6">{record.predefinedCheckInTime}</td>
            <td className="py-4 px-6">
              {record.actualCheckInTime
                ? new Date(record.actualCheckInTime).toLocaleTimeString()
                : '-'}
            </td>
            <td className="py-4 px-6 text-warning">{formatLateBy(record.lateByMinutes)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default LateCheckInsTable;
