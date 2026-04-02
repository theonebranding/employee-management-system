/* eslint-disable simple-import-sort/imports */
import {
  AlertCircle,
  BadgeCheck,
  Building,
  CalendarDays,
  ChevronLeft,
  ClipboardList,
  DollarSign,
  Download,
  Info,
  Mail,
  Send,
  UserCheck,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import { useTheme } from '../../../../../context/themeContext';
import { defaultPayslipTemplates } from '../../../../../utils/payslipTemplates';

import AbsentDayDeduction from './components/absentDayDeduction';
import HalfDayDeduction from './components/halfDayDeduction';
import LateCheckinDeduction from './components/lateCheckinDeduction';
import OverallCalculation from './components/overallCalculation';

const AdminEmployeeSalaryProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [showSalaryModal, setShowSalaryModal] = useState(false);
  const [employeeData, setEmployeeData] = useState(null);
  const [salaryData, setSalaryData] = useState([]);
  const [activeTab, setActiveTab] = useState('salary');
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({
    baseSalary: '',
    bonuses: '',
    deductions: '',
  });
  const [deductions, setDeductions] = useState({
    lateCheckinsTotalDeduction: 0,
    totalHalfDayDeduction: 0,
    totalAbsentDayDeduction: 0,
  });
  const [newSalary, setNewSalary] = useState({
    baseSalary: '',
    bonuses: 0,
    deductions: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState(defaultPayslipTemplates);
  const [selectedTemplateId, setSelectedTemplateId] = useState('classic-template');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { theme } = useTheme();

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const handleLateCheckinDeduction = lateDeduction => {
    setDeductions(prev => ({
      ...prev,
      totalLateCheckinDeduction: lateDeduction,
    }));
  };

  const handleHalfDayDeduction = halfDayDeduction => {
    setDeductions(prev => ({
      ...prev,
      totalHalfDayDeduction: halfDayDeduction,
    }));
  };

  const handleAbsentDayDeduction = absentDeduction => {
    setDeductions(prev => ({
      ...prev,
      totalAbsentDayDeduction: absentDeduction,
    }));
  };

  const fetchEmployeeDetails = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/find?id=${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch employee details.');
      const data = await response.json();
      setEmployeeData(data.employee);
    } catch (error) {
      console.error('Error fetching employee details:', error);
      toast.error('Failed to fetch employee details.');
    }
  };

  const fetchSalaryDetails = async () => {
    try {
      const response = await fetch(`${BASE_URL}/salary/find/${id}`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to fetch salary details.');
      const data = await response.json();
      setSalaryData(data.salaries);
    } catch (error) {
      console.error('Error fetching salary details:', error);
      toast.error('Failed to fetch salary details.');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPayslipSettings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/payslip-settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) return;
      const data = await response.json();
      if (data.settings?.templates?.length) {
        setTemplates(data.settings.templates);
      }
      if (data.settings?.activeTemplateId) {
        setSelectedTemplateId(data.settings.activeTemplateId);
      }
    } catch {
      // fallback templates are already set
    }
  };

  const generatePayslip = async sendByEmail => {
    try {
      const salary = salaryData[0];
      const response = await fetch(`${BASE_URL}/salary/generate/${id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          salaryId: salary?._id,
          month: selectedMonth,
          year: selectedYear,
          templateId: selectedTemplateId,
          sendByEmail,
          baseSalary: Number(salary?.baseSalary || 0),
          bonuses: Number(salary?.bonuses || 0),
          deductions: Number(salary?.deductions || 0),
        }),
      });

      if (!response.ok) throw new Error('Failed to generate payslip');
      const data = await response.json();
      toast.success(data.message || 'Payslip generated successfully');

      if (!sendByEmail && data.payslipHtml) {
        const printWindow = window.open('', '_blank', 'width=900,height=700');
        printWindow.document.write(data.payslipHtml);
        printWindow.document.close();
        setTimeout(() => printWindow.print(), 400);
      }

      fetchSalaryDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to generate payslip');
    }
  };

  const sendExistingPayslipEmail = async salaryId => {
    try {
      const response = await fetch(`${BASE_URL}/salary/${salaryId}/send-email`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) throw new Error('Failed to send payslip email');
      toast.success('Payslip emailed successfully');
      fetchSalaryDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to send payslip email');
    }
  };

  const handleEdit = salary => {
    setEditData({
      baseSalary: salary.baseSalary,
      bonuses: salary.bonuses,
      deductions: salary.deductions,
    });
    setIsEditing(true);
  };

  const handleUpdate = async salaryId => {
    try {
      const response = await fetch(`${BASE_URL}/salary/${salaryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(editData),
      });
      if (!response.ok) throw new Error('Failed to update salary details.');
      toast.success('Salary updated successfully!');
      setIsEditing(false);
      fetchSalaryDetails();
    } catch (error) {
      console.error('Error updating salary details:', error);
      toast.error('Failed to update salary details.');
    }
  };

  const addEmployeeSalary = async () => {
    setShowSalaryModal(true);
  };

  const handleSubmitNewSalary = async () => {
    if (!newSalary.baseSalary || newSalary.baseSalary <= 0) {
      toast.error('Please enter a valid base salary');
      return;
    }
    const employeeId = id;
    try {
      const response = await fetch(`${BASE_URL}/salary/add/${employeeId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          baseSalary: Number(newSalary.baseSalary),
          bonuses: Number(newSalary.bonuses),
          deductions: Number(newSalary.deductions),
        }),
      });

      if (!response.ok) throw new Error('Failed to add salary details.');

      toast.success('Salary added successfully!');
      setShowSalaryModal(false);
      setNewSalary({ baseSalary: '', bonuses: 0, deductions: 0 });
      fetchSalaryDetails();
    } catch (error) {
      console.error('Error adding salary details:', error);
      toast.error('Failed to add salary details.');
    }
  };

  const calculateTotalSalary = () => {
    const base = Number(newSalary.baseSalary) || 0;
    const bonus = Number(newSalary.bonuses) || 0;
    const deduct = Number(newSalary.deductions) || 0;
    return base + bonus - deduct;
  };

  useEffect(() => {
    fetchEmployeeDetails();
    fetchSalaryDetails();
    fetchPayslipSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const yearOptions = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: new Date(0, i).toLocaleString('default', { month: 'long' }),
  }));

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employeeData || salaryData.length === 0) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center text-light-text dark:text-dark-text">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">No Data Available</h2>
          <p className="text-light-text dark:text-dark-text  mb-6">
            We couldn't find any salary details for this employee.
          </p>
          <button
            onClick={() => navigate(-1)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
            aria-label="Go back"
          >
            Go Back
          </button>
          <button
            onClick={addEmployeeSalary}
            className="ml-6 px-4 py-2 bg-success text-white rounded-lg hover:bg-success/80"
            aria-label="Add salary"
          >
            Add Salary
          </button>
        </div>

        {showSalaryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">
                Add New Salary
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="text-light-text dark:text-dark-text  block mb-1">
                    Base Salary *
                  </label>
                  <input
                    type="number"
                    value={newSalary.baseSalary}
                    onChange={e => setNewSalary({ ...newSalary, baseSalary: e.target.value })}
                    className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border"
                    required
                    aria-label="Base salary"
                  />
                </div>
                <div>
                  <label className="text-light-text dark:text-dark-text  block mb-1">Bonuses</label>
                  <input
                    type="number"
                    value={newSalary.bonuses}
                    onChange={e => setNewSalary({ ...newSalary, bonuses: e.target.value })}
                    className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border"
                    placeholder="0"
                    aria-label="Bonuses"
                  />
                </div>
                <div>
                  <label className="text-light-text dark:text-dark-text  block mb-1">
                    Deductions
                  </label>
                  <input
                    type="number"
                    value={newSalary.deductions}
                    onChange={e => setNewSalary({ ...newSalary, deductions: e.target.value })}
                    className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border"
                    placeholder="0"
                    aria-label="Deductions"
                  />
                </div>
                <div className="bg-light-card/50 dark:bg-dark-card/50 p-4 rounded-lg mt-4">
                  <p className="text-light-text dark:text-dark-text  mb-2">Total Salary</p>
                  <p className="text-2xl font-bold text-light-text dark:text-dark-text">
                    ₹{calculateTotalSalary()}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-4">
                <button
                  onClick={() => setShowSalaryModal(false)}
                  className="px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg hover:bg-light-card/80 dark:hover:bg-dark-card/80"
                  aria-label="Cancel"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitNewSalary}
                  className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/80"
                  aria-label="Add salary"
                >
                  Add Salary
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  const tabs = [
    { id: 'salary', label: 'Salary Details', icon: DollarSign },
    { id: 'late-checkins', label: 'Late Check-ins', icon: ClipboardList },
    { id: 'absent-days', label: 'Absent Days', icon: UserCheck },
    { id: 'half-day', label: 'Half Days', icon: CalendarDays },
    { id: 'overview', label: 'Overview', icon: BadgeCheck },
  ];

  const renderSalaryDetails = () => {
    return salaryData.map(salary => (
      <div key={salary._id} className="space-y-6">
        <h2 className="text-2xl font-bold mb-6 text-light-text dark:text-dark-text">
          Salary Information
        </h2>
        <div className="mb-5 p-4 rounded-lg bg-light-card/50 dark:bg-dark-card/50 border border-light-border dark:border-dark-border">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-sm">Payslip Template</label>
              <select
                value={selectedTemplateId}
                onChange={event => setSelectedTemplateId(event.target.value)}
                className="w-full mt-1 px-3 py-2 rounded-lg bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border"
              >
                {templates.map(template => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={() => generatePayslip(false)}
              className="px-4 py-2 bg-primary text-white rounded-lg inline-flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Generate & Download
            </button>
            <button
              onClick={() => generatePayslip(true)}
              className="px-4 py-2 bg-success text-white rounded-lg inline-flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Generate & Email
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-light-card/50 dark:bg-dark-card/50 p-6 rounded-lg">
            <DollarSign className="w-8 h-8 text-success mb-4" />
            <p className="text-light-text dark:text-dark-text  mb-2">Base Salary</p>
            <p className="text-2xl font-bold text-light-text dark:text-dark-text">
              ₹{salary?.baseSalary}
            </p>
          </div>
          <div className="bg-light-card/50 dark:bg-dark-card/50 p-6 rounded-lg">
            <Info className="w-8 h-8 text-warning mb-4" />
            <p className="text-light-text dark:text-dark-text  mb-2">Bonuses</p>
            <p className="text-2xl font-bold text-light-text dark:text-dark-text">
              ₹{salary?.bonuses}
            </p>
          </div>
          <div className="bg-light-card/50 dark:bg-dark-card/50 p-6 rounded-lg">
            <AlertCircle className="w-8 h-8 text-danger mb-4" />
            <p className="text-light-text dark:text-dark-text  mb-2">Deductions</p>
            <p className="text-2xl font-bold text-light-text dark:text-dark-text">
              ₹{salary?.deductions}
            </p>
          </div>
        </div>
        <div className="bg-light-card/50 dark:bg-dark-card/50 p-6 rounded-lg">
          <p className="text-light-text dark:text-dark-text  mb-2">Total Salary</p>
          <p className="text-2xl font-bold text-light-text dark:text-dark-text">
            ₹{salary?.totalSalary}
          </p>
        </div>
        <button
          onClick={() => handleEdit(salary)}
          className="mt-4 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
          aria-label="Edit salary"
        >
          Edit Salary
        </button>
        <div className="mt-4 p-4 rounded-lg border border-light-border dark:border-dark-border bg-light-card/50 dark:bg-dark-card/50">
          <p className="text-sm mb-2">Payslip Status: {salary.payslipStatus || 'draft'}</p>
          <p className="text-sm mb-3">
            Last emailed:{' '}
            {salary.emailedAt ? new Date(salary.emailedAt).toLocaleString() : 'Not emailed yet'}
          </p>
          <button
            onClick={() => sendExistingPayslipEmail(salary._id)}
            className="px-4 py-2 bg-info text-white rounded-lg inline-flex items-center gap-2"
          >
            <Mail className="w-4 h-4" /> Send Existing Payslip Email
          </button>
        </div>
      </div>
    ));
  };

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'salary':
        return renderSalaryDetails();
      case 'late-checkins':
        return (
          <LateCheckinDeduction
            employeeId={id}
            onDataFetched={handleLateCheckinDeduction}
            month={selectedMonth}
            year={selectedYear}
          />
        );
      case 'half-day':
        return (
          <HalfDayDeduction
            employeeId={id}
            onDataFetched={handleHalfDayDeduction}
            month={selectedMonth}
            year={selectedYear}
          />
        );
      case 'absent-days':
        return (
          <AbsentDayDeduction
            employeeId={id}
            onDataFetched={handleAbsentDayDeduction}
            month={selectedMonth}
            year={selectedYear}
          />
        );
      case 'overview':
        return (
          <OverallCalculation
            baseSalary={salaryData[0].baseSalary}
            bonuses={salaryData[0].bonuses}
            deductions={deductions}
            month={selectedMonth}
            year={selectedYear}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => navigate(-1)}
            className="mb-6 px-4 py-2 bg-light-card dark:bg-dark-card rounded-lg hover:bg-light-card/80 dark:hover:bg-dark-card/80 transition-all flex items-center gap-2 text-light-text dark:text-dark-text  hover:text-light-text dark:hover:text-dark-text hover:opacity-100"
            aria-label="Back to salary management"
          >
            <ChevronLeft className="w-5 h-5" />
            <span className="font-medium">Back to Salary Management</span>
          </button>

          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-lg">
            <div className="flex items-start justify-between">
              <div className="space-y-1">
                <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
                  {employeeData.name}
                </h1>
                <div className="flex items-center gap-4 text-light-text dark:text-dark-text ">
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span>{employeeData.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    <span>Employee ID: {id}</span>
                  </div>
                </div>
              </div>
              <div className="bg-primary/10 px-4 py-2 rounded-lg">
                <p className="text-primary font-semibold">Active Employee</p>
              </div>
            </div>
          </div>
        </div>

        <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex-1">
            <label className="text-light-text dark:text-dark-text  block mb-1">Month</label>
            <select
              value={selectedMonth}
              onChange={e => setSelectedMonth(Number(e.target.value))}
              className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Select month"
            >
              {monthOptions.map(month => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex-1">
            <label className="text-light-text dark:text-dark-text  block mb-1">Year</label>
            <select
              value={selectedYear}
              onChange={e => setSelectedYear(Number(e.target.value))}
              className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border focus:outline-none focus:ring-2 focus:ring-primary"
              aria-label="Select year"
            >
              {yearOptions.map(year => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-2 px-4 py-3 rounded-lg transition-all ${
                activeTab === id
                  ? 'bg-primary text-white'
                  : 'bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text  hover:bg-light-card/80 dark:hover:bg-dark-card/80 hover:text-light-text dark:hover:text-dark-text hover:opacity-100'
              }`}
              aria-label={`Switch to ${label} tab`}
            >
              <Icon className="w-4 h-4" />
              <span className="font-medium">{label}</span>
            </button>
          ))}
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-lg">
          {renderActiveTab()}
        </div>
      </div>

      {isEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6 w-full max-w-lg">
            <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">
              Edit Salary
            </h2>
            <div className="space-y-4">
              <div>
                <label className="text-light-text dark:text-dark-text  block mb-1">
                  Base Salary
                </label>
                <input
                  type="number"
                  value={editData.baseSalary}
                  onChange={e => setEditData({ ...editData, baseSalary: e.target.value })}
                  className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border"
                  aria-label="Base salary"
                />
              </div>
              <div>
                <label className="text-light-text dark:text-dark-text  block mb-1">Bonuses</label>
                <input
                  type="number"
                  value={editData.bonuses}
                  onChange={e => setEditData({ ...editData, bonuses: e.target.value })}
                  className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border"
                  aria-label="Bonuses"
                />
              </div>
              <div>
                <label className="text-light-text dark:text-dark-text  block mb-1">
                  Deductions
                </label>
                <input
                  type="number"
                  value={editData.deductions}
                  onChange={e => setEditData({ ...editData, deductions: e.target.value })}
                  className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border"
                  aria-label="Deductions"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg hover:bg-light-card/80 dark:hover:bg-dark-card/80"
                aria-label="Cancel"
              >
                Cancel
              </button>
              <button
                onClick={() => handleUpdate(salaryData[0]._id)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
                aria-label="Update salary"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        theme={theme}
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
      />
    </div>
  );
};

export default AdminEmployeeSalaryProfile;
