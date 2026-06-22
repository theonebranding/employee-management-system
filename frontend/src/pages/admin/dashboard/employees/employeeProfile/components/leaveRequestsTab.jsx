import 'react-toastify/dist/ReactToastify.css';

import {
  AlertCircle,
  Calendar,
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  Loader2,
  XCircle,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

const LeaveRequestsTab = ({ employeeId }) => {
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchLeaveRequests = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/leaves/employee-leaves/${employeeId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch leave requests.');
      }
      const { leaves } = await response.json();
      const sortedLeaves = leaves.sort((a, b) => new Date(a.startDate) - new Date(b.startDate));
      setLeaveRequests(sortedLeaves);
    } catch (error) {
      console.error('Error fetching leave requests:', error);
      toast.error(error.message || 'Failed to fetch leave requests.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (employeeId) {
      fetchLeaveRequests();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId]);

  const getStatusDetails = status => {
    switch (status.toLowerCase()) {
      case 'approved':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600 dark:text-emerald-400',
          bgColor: 'bg-emerald-50 dark:bg-emerald-400/10',
          borderColor: 'border-emerald-200 dark:border-emerald-400/20',
        };
      case 'rejected':
        return {
          icon: XCircle,
          color: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-400/10',
          borderColor: 'border-red-200 dark:border-red-400/20',
        };
      case 'pending':
      default:
        return {
          icon: Clock,
          color: 'text-yellow-600 dark:text-yellow-400',
          bgColor: 'bg-yellow-50 dark:bg-yellow-400/10',
          borderColor: 'border-yellow-200 dark:border-yellow-400/20',
        };
    }
  };

  const formatDate = date => {
    return new Date(date).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <div className="flex items-center space-x-3 px-4 py-2 bg-light-card dark:bg-dark-card border border-light-border/50 dark:border-dark-border/50 rounded-lg">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
          <span className="text-sm font-medium text-light-text dark:text-dark-text">Loading leave requests...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Calendar className="w-5 h-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">Leave Requests</h3>
        </div>
        <span className="text-sm text-light-text/60 dark:text-dark-text/60">{leaveRequests.length} total requests</span>
      </div>

      {leaveRequests.length > 0 ? (
        <div className="grid gap-4">
          {leaveRequests.map(request => {
            const statusDetails = getStatusDetails(request.status);
            const StatusIcon = statusDetails.icon;

            return (
              <div
                key={request._id}
                className={`p-5 rounded-xl bg-light-card dark:bg-dark-card/40 border ${statusDetails.borderColor} hover:bg-light-card/80 dark:hover:bg-dark-card/60 transition-all duration-200`}
              >
                <div className="space-y-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-light-text dark:text-dark-text mb-1">{request.reason}</h4>
                      <div className="flex items-center space-x-2 text-light-text/60 dark:text-dark-text/60">
                        <CalendarIcon className="w-4 h-4 text-primary" />
                        <span className="text-sm">
                          {formatDate(request.startDate)} - {formatDate(request.endDate)}
                        </span>
                      </div>
                    </div>
                    <div
                      className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg ${statusDetails.bgColor}`}
                    >
                      <StatusIcon className={`w-4 h-4 ${statusDetails.color}`} />
                      <span className={`text-sm font-medium ${statusDetails.color} capitalize`}>
                        {request.status}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 bg-light-card dark:bg-dark-card/30 rounded-xl border border-light-border/50 dark:border-dark-border/50">
          <AlertCircle className="w-8 h-8 text-light-text/50 dark:text-dark-text/50 mb-3" />
          <p className="text-light-text dark:text-dark-text font-medium">No leave requests found</p>
          <p className="text-light-text/60 dark:text-dark-text/60 text-sm mt-1">Your leave requests will appear here</p>
        </div>
      )}

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1000}
      />
    </div>
  );
};

export default LeaveRequestsTab;
