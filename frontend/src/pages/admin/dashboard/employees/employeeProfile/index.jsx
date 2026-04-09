/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-unused-vars */
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import AttendanceTab from './components/attendanceTab/index';
import HolidaysTab from './components/holidaysTab';
import InformationTab from './components/informationTab';
import LeaveRequestsTab from './components/leaveRequestsTab';

const AdminEmployeeProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('attendance');
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmEmployeeId, setConfirmEmployeeId] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/employee/find?id=${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch employee details.');
      const data = await response.json();
      setEmployeeDetails(data.employee);
    } catch (error) {
      toast.error(error.message || 'Failed to fetch employee details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployeeData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDeleteEmployee = async () => {
    const employeeCode = employeeDetails?.employeeCode || '';
    if (confirmEmployeeId !== employeeCode) {
      toast.error("Employee ID doesn't match");
      return;
    }

    setDeleteLoading(true);
    try {
      const response = await fetch(
        `${BASE_URL}/employee/delete-by-code/${employeeCode}`,
        {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        }
      );

      if (!response.ok) throw new Error('Failed to delete employee');

      toast.success('Employee deleted successfully');
      setShowDeleteModal(false);
      setTimeout(() => navigate(-1), 1500);
    } catch (error) {
      toast.error(error.message || 'Failed to delete employee');
    } finally {
      setDeleteLoading(false);
    }
  };

  const TabButton = ({ label, tab }) => (
    <button
      className={`px-6 py-3 text-sm font-medium transition-all duration-200 border-b-2 hover:text-primary ${
        activeTab === tab
          ? 'border-primary text-primary bg-light-card dark:bg-dark-card'
          : 'border-transparent text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card hover:border-primary/30'
      }`}
      onClick={() => setActiveTab(tab)}
      aria-label={`Switch to ${label} tab`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-6 ml-8 min-h-screen pl-20 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="p-2.5 rounded-lg bg-light-card dark:bg-dark-card hover:bg-light-card/80 dark:hover:bg-dark-card/80 transition-all duration-200 border border-light-border dark:border-dark-border hover:border-light-border/80 dark:hover:border-dark-border/80"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5 text-light-text dark:text-dark-text" />
            </button>
            <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
              Employee Profile
            </h1>
          </div>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 rounded-lg bg-danger hover:bg-danger/80 transition-all duration-200 text-white font-medium"
            aria-label="Delete employee"
          >
            Delete Employee
          </button>
        </div>

        <div className="flex gap-2 mb-6 border-b border-light-border/50 dark:border-dark-border/50">
          <TabButton label="Information" tab="information" />
          <TabButton label="Holidays" tab="holidays" />
          <TabButton label="Leave Requests" tab="leaves" />
          <TabButton label="Attendance" tab="attendance" />
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {activeTab === 'information' && <InformationTab employeeId={id} />}
            {activeTab === 'holidays' && <HolidaysTab employeeId={id} />}
            {activeTab === 'leaves' && <LeaveRequestsTab employeeId={id} />}
            {activeTab === 'attendance' && <AttendanceTab employeeId={id} />}
          </>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
            <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6 max-w-md w-full border border-light-border dark:border-dark-border shadow-xl">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle className="w-6 h-6 text-danger" />
                <h3 className="text-xl font-bold text-light-text dark:text-dark-text">
                  Delete Employee
                </h3>
              </div>

              <div className="mb-6">
                <p className="text-light-text dark:text-dark-text mb-4">
                  This action <span className="font-bold text-danger">cannot be undone</span>. All
                  employee data including attendance, leave, and personal information will be
                  permanently deleted.
                </p>
                <div className="bg-danger/30 border border-danger/50 rounded-lg p-3 mb-4">
                  <p className="dark:text-red-500 text-black text-sm">
                    To confirm deletion, please enter the Employee ID:{' '}
                    <span className="font-mono font-medium dark:text-red-500 text-black">
                      {employeeDetails?.employeeCode || 'N/A'}
                    </span>
                  </p>
                </div>
                <input
                  type="text"
                  autoFocus
                  placeholder="Enter employee ID to confirm"
                  value={confirmEmployeeId}
                  onChange={e => setConfirmEmployeeId(e.target.value)}
                  className="w-full p-3 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text placeholder-light-text dark:placeholder-dark-text focus:outline-none focus:ring-2 focus:ring-danger focus:border-transparent"
                />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setConfirmEmployeeId('');
                  }}
                  className="px-4 py-2 rounded-lg bg-light-card dark:bg-dark-card hover:bg-light-card/80 dark:hover:bg-dark-card/80 transition-all duration-200 text-light-text dark:text-dark-text"
                  aria-label="Cancel deletion"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteEmployee}
                  disabled={
                    confirmEmployeeId !== (employeeDetails?.employeeCode || '') || deleteLoading
                  }
                  className={`px-4 py-2 rounded-lg flex items-center gap-2 ${
                    confirmEmployeeId === (employeeDetails?.employeeCode || '') && !deleteLoading
                      ? 'bg-danger hover:bg-danger/80'
                      : 'bg-danger/50 cursor-not-allowed'
                  } transition-all duration-200 text-white font-medium`}
                  aria-label="Confirm deletion"
                >
                  {deleteLoading && <Loader2 className="w-4 h-4 animate-spin text-white" />}
                  Delete Permanently
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
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

export default AdminEmployeeProfile;
