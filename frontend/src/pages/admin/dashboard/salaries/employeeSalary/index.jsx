import { Building, ChevronLeft, Mail, Pencil, PlusCircle, Save } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import { useTheme } from '../../../../../context/themeContext';

const EMPTY_SALARY_FORM = {
  baseSalary: '',
  bonuses: 0,
  deductions: 0,
  effectiveFrom: '',
  revisionReason: '',
};

const AdminEmployeeSalaryProfile = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const [employeeData, setEmployeeData] = useState(null);
  const [salaryData, setSalaryData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [showAddSalaryModal, setShowAddSalaryModal] = useState(false);
  const [editData, setEditData] = useState(EMPTY_SALARY_FORM);
  const [newSalary, setNewSalary] = useState({
    ...EMPTY_SALARY_FORM,
    revisionReason: 'Initial onboarding salary',
  });

  const authHeaders = useMemo(
    () => ({ Authorization: `Bearer ${localStorage.getItem('token')}` }),
    []
  );

  const fetchEmployeeDetails = async () => {
    const response = await fetch(`${BASE_URL}/employee/find?id=${id}`, { headers: authHeaders });
    if (!response.ok) throw new Error('Failed to fetch employee details.');
    const data = await response.json();
    setEmployeeData(data.employee);
  };

  const fetchSalaryDetails = async () => {
    const response = await fetch(`${BASE_URL}/salary/find/${id}`, {
      method: 'GET',
      headers: authHeaders,
    });
    if (!response.ok) {
      if (response.status === 404) {
        setSalaryData([]);
        return;
      }
      throw new Error('Failed to fetch salary details.');
    }
    const data = await response.json();
    setSalaryData(data.salaries || []);
  };

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      try {
        await Promise.all([fetchEmployeeDetails(), fetchSalaryDetails()]);
      } catch (error) {
        toast.error(error.message || 'Failed to load salary profile.');
      } finally {
        setIsLoading(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const latestSalary = salaryData[0] || null;
  const isFromEmployeeInformation =
    location.state?.source === 'employee-information' && Boolean(location.state?.returnTo);

  const handleBack = () => {
    if (isFromEmployeeInformation) {
      navigate(location.state.returnTo);
      return;
    }
    navigate(-1);
  };

  const openEdit = salary => {
    setEditData({
      baseSalary: salary.baseSalary ?? '',
      bonuses: salary.bonuses ?? 0,
      deductions: salary.deductions ?? 0,
      effectiveFrom: salary.effectiveFrom
        ? new Date(salary.effectiveFrom).toISOString().slice(0, 10)
        : '',
      revisionReason: salary.revisionReason || '',
    });
    setIsEditing(true);
  };

  const handleUpdate = async salaryId => {
    try {
      const response = await fetch(`${BASE_URL}/salary/${salaryId}`, {
        method: 'PATCH',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...editData,
          effectiveFrom: editData.effectiveFrom || undefined,
        }),
      });
      if (!response.ok) throw new Error('Failed to update salary details.');
      toast.success('Salary updated successfully');
      setIsEditing(false);
      await fetchSalaryDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to update salary details.');
    }
  };

  const handleSubmitNewSalary = async () => {
    if (!newSalary.baseSalary || Number(newSalary.baseSalary) <= 0) {
      toast.error('Please enter a valid base salary');
      return;
    }

    try {
      const response = await fetch(`${BASE_URL}/salary/add/${id}`, {
        method: 'POST',
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          baseSalary: Number(newSalary.baseSalary),
          bonuses: Number(newSalary.bonuses || 0),
          deductions: Number(newSalary.deductions || 0),
          effectiveFrom: newSalary.effectiveFrom || undefined,
          revisionReason: newSalary.revisionReason || 'Initial onboarding salary',
        }),
      });

      if (!response.ok) throw new Error('Failed to add salary details.');

      toast.success('Salary added successfully');
      setShowAddSalaryModal(false);
      setNewSalary({ ...EMPTY_SALARY_FORM, revisionReason: 'Initial onboarding salary' });
      await fetchSalaryDetails();
    } catch (error) {
      toast.error(error.message || 'Failed to add salary details.');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!employeeData) {
    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg flex items-center justify-center text-light-text dark:text-dark-text">
        Failed to load employee details.
      </div>
    );
  }

  return (
    <div className="ml-10 p-6 min-h-screen bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text">
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        <button
          onClick={handleBack}
          className="px-4 py-2 bg-light-card dark:bg-dark-card rounded-lg hover:bg-light-card/80 dark:hover:bg-dark-card/80 transition-all flex items-center gap-2"
          aria-label={
            isFromEmployeeInformation ? 'Back to employee information' : 'Back to salary management'
          }
        >
          <ChevronLeft className="w-5 h-5" />
          <span className="font-medium">
            {isFromEmployeeInformation
              ? 'Back to Employee Information'
              : 'Back to Salary Management'}
          </span>
        </button>

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-lg">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h1 className="text-3xl font-bold text-light-text dark:text-dark-text">
                {employeeData.name}
              </h1>
              <div className="flex items-center gap-4 text-light-text dark:text-dark-text">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  <span>{employeeData.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  <span>Employee ID: {employeeData.employeeCode || id}</span>
                </div>
              </div>
            </div>
            {!latestSalary && (
              <button
                onClick={() => setShowAddSalaryModal(true)}
                className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/80 inline-flex items-center gap-2"
                aria-label="Add salary"
              >
                <PlusCircle className="w-4 h-4" /> Add Salary
              </button>
            )}
          </div>
        </div>

        {latestSalary ? (
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-lg space-y-6">
            <h2 className="text-2xl font-bold">Salary Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Stat
                label="Base Salary"
                value={`₹${Number(latestSalary.baseSalary || 0).toFixed(2)}`}
              />
              <Stat label="Bonuses" value={`₹${Number(latestSalary.bonuses || 0).toFixed(2)}`} />
              <Stat
                label="Deductions"
                value={`₹${Number(latestSalary.deductions || 0).toFixed(2)}`}
              />
              <Stat
                label="Total Salary"
                value={`₹${Number(latestSalary.totalSalary || 0).toFixed(2)}`}
              />
              <Stat
                label="Effective From"
                value={
                  latestSalary.effectiveFrom
                    ? new Date(latestSalary.effectiveFrom).toLocaleDateString()
                    : 'Not Set'
                }
              />
              <Stat label="Revision Reason" value={latestSalary.revisionReason || 'Not Provided'} />
            </div>

            <button
              onClick={() => openEdit(latestSalary)}
              className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark inline-flex items-center gap-2"
              aria-label="Edit salary"
            >
              <Pencil className="w-4 h-4" /> Edit Salary
            </button>
          </div>
        ) : (
          <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 shadow-lg text-center">
            <p className="mb-4">No salary record found for this employee.</p>
            <button
              onClick={() => setShowAddSalaryModal(true)}
              className="px-4 py-2 bg-success text-white rounded-lg hover:bg-success/80 inline-flex items-center gap-2"
              aria-label="Add salary"
            >
              <PlusCircle className="w-4 h-4" /> Add Salary
            </button>
          </div>
        )}
      </div>

      {showAddSalaryModal && (
        <SalaryFormModal
          title="Add Salary"
          form={newSalary}
          setForm={setNewSalary}
          onClose={() => setShowAddSalaryModal(false)}
          onSubmit={handleSubmitNewSalary}
          submitLabel="Add Salary"
        />
      )}

      {isEditing && latestSalary && (
        <SalaryFormModal
          title="Edit Salary"
          form={editData}
          setForm={setEditData}
          onClose={() => setIsEditing(false)}
          onSubmit={() => handleUpdate(latestSalary._id)}
          submitLabel="Update Salary"
          submitIcon={<Save className="w-4 h-4" />}
        />
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

const Stat = ({ label, value }) => (
  <div className="bg-light-bg/70 dark:bg-dark-bg/70 border border-light-border dark:border-dark-border rounded-lg p-4">
    <p className="text-xs text-light-text/70 dark:text-dark-text/70 mb-1">{label}</p>
    <p className="font-semibold text-light-text dark:text-dark-text">{value}</p>
  </div>
);

const SalaryFormModal = ({ title, form, setForm, onClose, onSubmit, submitLabel, submitIcon }) => (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
    <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-6 w-full max-w-lg">
      <h2 className="text-xl font-bold mb-4 text-light-text dark:text-dark-text">{title}</h2>
      <div className="space-y-4">
        <FormInput
          label="Base Salary"
          type="number"
          value={form.baseSalary}
          onChange={value => setForm({ ...form, baseSalary: value })}
        />
        <FormInput
          label="Bonuses"
          type="number"
          value={form.bonuses}
          onChange={value => setForm({ ...form, bonuses: value })}
        />
        <FormInput
          label="Deductions"
          type="number"
          value={form.deductions}
          onChange={value => setForm({ ...form, deductions: value })}
        />
        <FormInput
          label="Effective From"
          type="date"
          value={form.effectiveFrom}
          onChange={value => setForm({ ...form, effectiveFrom: value })}
        />
        <FormInput
          label="Revision Reason"
          value={form.revisionReason}
          onChange={value => setForm({ ...form, revisionReason: value })}
        />
      </div>
      <div className="mt-6 flex justify-end gap-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg hover:bg-light-card/80 dark:hover:bg-dark-card/80"
          aria-label="Cancel"
        >
          Cancel
        </button>
        <button
          onClick={onSubmit}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark inline-flex items-center gap-2"
          aria-label={submitLabel}
        >
          {submitIcon || <Save className="w-4 h-4" />} {submitLabel}
        </button>
      </div>
    </div>
  </div>
);

const FormInput = ({ label, value, onChange, type = 'text' }) => (
  <div>
    <label className="text-light-text dark:text-dark-text block mb-1">{label}</label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full px-4 py-2 bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text rounded-lg border border-light-border dark:border-dark-border"
    />
  </div>
);

export default AdminEmployeeSalaryProfile;
