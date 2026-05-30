/* eslint-disable react-hooks/exhaustive-deps */
import { AlertCircle } from 'lucide-react';
import React, { useEffect, useState } from 'react';

const EmployeeLeaveAlerts = () => {
  const [leaves, setLeaves] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  useEffect(() => {
    const fetchLeaves = async () => {
      try {
        setLoading(true);
        const today = new Date();
        const currentMonth = today.getMonth() + 1;
        const year = today.getFullYear();

        // Fetch leaves for current and next month
        const startDate = `${year}-${String(currentMonth).padStart(2, '0')}-01`;
        const endDate = `${year}-${String(currentMonth + 1).padStart(2, '0')}-31`;

        const response = await fetch(
          `${BASE_URL}/leaves/?startDate=${startDate}&endDate=${endDate}&status=approved&limit=100`,
          {
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch leaves');

        const data = await response.json();
        setLeaves(data.leaves || []);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchLeaves();
  }, []);

  const formatDate = date =>
    new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });

  const LeaveItem = ({ leave }) => (
    <div className="py-3 border-b border-light-border dark:border-dark-border last:border-b-0">
      <div className="flex items-center justify-between">
        <span className="text-light-text dark:text-dark-text text-sm">{leave.employee.name}</span>
        <span className="text-light-text dark:text-dark-text text-xs">{leave.employee.email}</span>
      </div>
      <div className="mt-1 text-sm text-primary">
        {formatDate(leave.startDate)} - {formatDate(leave.endDate)}
      </div>
    </div>
  );

  if (loading) return <div className="p-4 text-light-text dark:text-dark-text ">Loading...</div>;
  if (error) return <div className="p-4 text-danger">Error: {error}</div>;

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-lg">
      {/* Header */}
      <div className="p-4 border-b border-light-border dark:border-dark-border flex items-center gap-2">
        <AlertCircle className="w-4 h-4 text-warning" />
        <h3 className="text-light-text dark:text-dark-text text-sm font-medium">
          Upcoming Leaves ({leaves.length})
        </h3>
      </div>

      {/* Content */}
      <div className="p-4">
        {leaves.length === 0 ? (
          <p className="text-light-text dark:text-dark-text text-sm text-center py-4">
            No upcoming leaves this month or next
          </p>
        ) : (
          leaves.map(leave => <LeaveItem key={leave._id} leave={leave} />)
        )}
      </div>
    </div>
  );
};

export default EmployeeLeaveAlerts;
