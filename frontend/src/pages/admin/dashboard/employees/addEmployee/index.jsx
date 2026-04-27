import { ArrowLeft, Check, ChevronRight, Pencil, Plus, Save, Trash2, UserPlus } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../../components/pageHeader';

const INITIAL_FORM = {
  name: '',
  email: '',
  phoneNumber: '',
  department: '',
  designation: '',
  employmentType: '',
  workLocation: '',
  joinedDate: '',
  dateofBirth: '',
  aadharNumber: '',
  panNumber: '',
  bankName: '',
  branchName: '',
  bankAccountNumber: '',
  ifscCode: '',
  address: '',
  state: '',
  city: '',
  district: '',
  pinCode: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  baseSalary: '',
  salaryEffectiveFrom: '',
  salaryRevisionReason: 'Initial onboarding salary',
  password: '1234',
};

const STEPS = [
  { id: 'basic', label: 'Basic Details' },
  { id: 'work', label: 'Work Assignment' },
  { id: 'compliance', label: 'Compliance & Contact' },
  { id: 'payroll', label: 'Payroll Setup' },
  { id: 'review', label: 'Review & Submit' },
];

const DEPARTMENT_OPTIONS = [
  'Engineering',
  'Human Resources',
  'Finance',
  'Sales',
  'Marketing',
  'Operations',
  'Support',
];
const DESIGNATION_OPTIONS = [
  'Intern',
  'Associate',
  'Software Engineer',
  'Senior Software Engineer',
  'Team Lead',
  'Manager',
  'Senior Manager',
];

const REQUIRED_FOR_CREATE = ['name', 'email', 'phoneNumber'];
const REQUIRED_FOR_ONBOARDING = [
  'department',
  'designation',
  'employmentType',
  'workLocation',
  'joinedDate',
  'bankName',
  'branchName',
  'bankAccountNumber',
  'ifscCode',
];
const STEP_REQUIRED_FIELDS = {
  0: ['name', 'email', 'phoneNumber'],
  1: ['department', 'designation', 'employmentType', 'workLocation', 'joinedDate'],
  2: [],
  3: ['bankName', 'branchName', 'bankAccountNumber', 'ifscCode'],
  4: [],
};
const PHONE_REGEX = /^[0-9]{10,15}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const AADHAR_REGEX = /^[0-9]{12}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const PIN_REGEX = /^[0-9]{6}$/;
const ACCOUNT_REGEX = /^[0-9]{8,20}$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z\s.'-]{1,99}$/;

const AdminAddEmployee = () => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [stepIndex, setStepIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [masterOptionsLoading, setMasterOptionsLoading] = useState(false);
  const [masterOptions, setMasterOptions] = useState({
    departments: DEPARTMENT_OPTIONS,
    designations: DESIGNATION_OPTIONS,
  });
  const [managerSection, setManagerSection] = useState('departments');
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingValue, setEditingValue] = useState('');
  const [stepErrors, setStepErrors] = useState({});
  const navigate = useNavigate();
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const onboardingComplete = useMemo(
    () => REQUIRED_FOR_ONBOARDING.every(field => String(form[field] || '').trim()),
    [form]
  );

  const completionCount = useMemo(
    () => REQUIRED_FOR_ONBOARDING.filter(field => String(form[field] || '').trim()).length,
    [form]
  );

  const validateField = (field, value) => {
    const trimmed = String(value || '').trim();
    if (!trimmed) return '';

    switch (field) {
      case 'name':
        return NAME_REGEX.test(trimmed)
          ? ''
          : 'Enter a valid full name (letters/spaces only).';
      case 'email':
        return EMAIL_REGEX.test(trimmed) ? '' : 'Enter a valid email address.';
      case 'phoneNumber':
      case 'emergencyContactPhone':
        return PHONE_REGEX.test(trimmed) ? '' : 'Contact number must be 10-15 digits only.';
      case 'aadharNumber':
        return AADHAR_REGEX.test(trimmed) ? '' : 'Aadhar number must be exactly 12 digits.';
      case 'panNumber':
        return PAN_REGEX.test(trimmed.toUpperCase()) ? '' : 'PAN format should be ABCDE1234F.';
      case 'ifscCode':
        return IFSC_REGEX.test(trimmed.toUpperCase()) ? '' : 'IFSC format should be like HDFC0001234.';
      case 'pinCode':
        return PIN_REGEX.test(trimmed) ? '' : 'PIN code must be exactly 6 digits.';
      case 'bankAccountNumber':
        return ACCOUNT_REGEX.test(trimmed) ? '' : 'Account number must be 8-20 digits.';
      case 'baseSalary':
        return Number(trimmed) > 0 ? '' : 'Base salary must be greater than 0.';
      case 'joinedDate': {
        const joined = new Date(trimmed);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return joined > today ? 'Joining date cannot be in the future.' : '';
      }
      case 'dateofBirth': {
        const dob = new Date(trimmed);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return dob >= today ? 'Date of birth must be in the past.' : '';
      }
      default:
        return '';
    }
  };

  const handleChange = e => {
    const { name, value } = e.target;
    const normalizedValue =
      name === 'panNumber' || name === 'ifscCode' ? value.toUpperCase() : value;
    setForm(prev => ({ ...prev, [name]: normalizedValue }));
    setStepErrors(prev => ({ ...prev, [name]: validateField(name, normalizedValue) }));
  };

  useEffect(() => {
    const fetchMasterOptions = async () => {
      setMasterOptionsLoading(true);
      try {
        const response = await fetch(`${BASE_URL}/admin/employee-master-options`, {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(data.message || 'Failed to fetch employee master options');
        }
        const settings = data.settings || {};
        setMasterOptions({
          departments:
            Array.isArray(settings.departments) && settings.departments.length
              ? settings.departments
              : DEPARTMENT_OPTIONS,
          designations:
            Array.isArray(settings.designations) && settings.designations.length
              ? settings.designations
              : DESIGNATION_OPTIONS,
        });
      } catch (error) {
        toast.error(error.message || 'Failed to load role/department/designation settings');
      } finally {
        setMasterOptionsLoading(false);
      }
    };
    fetchMasterOptions();
  }, [BASE_URL]);

  const getManagerList = () => {
    if (managerSection === 'departments') return masterOptions.departments;
    return masterOptions.designations;
  };

  const persistMasterOptions = async nextOptions => {
    setMasterOptions(nextOptions);
    const response = await fetch(`${BASE_URL}/admin/employee-master-options`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
      body: JSON.stringify(nextOptions),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || 'Failed to save employee master options');
    }
  };

  const updateManagerList = async nextList => {
    if (managerSection === 'departments') {
      const nextOptions = { ...masterOptions, departments: nextList };
      await persistMasterOptions(nextOptions);
      if (!nextList.includes(form.department)) {
        setForm(prev => ({ ...prev, department: '' }));
      }
      return;
    }
    const nextOptions = { ...masterOptions, designations: nextList };
    await persistMasterOptions(nextOptions);
    if (!nextList.includes(form.designation)) {
      setForm(prev => ({ ...prev, designation: '' }));
    }
  };

  const handleAddOption = async () => {
    const value = newOptionValue.trim();
    if (!value) {
      toast.error('Please enter a value.');
      return;
    }
    const list = getManagerList();
    if (list.some(item => item.toLowerCase() === value.toLowerCase())) {
      toast.error('This value already exists.');
      return;
    }
    try {
      await updateManagerList([...list, value]);
      setNewOptionValue('');
      toast.success('Added successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to add option');
    }
  };

  const handleDeleteOption = async index => {
    const list = getManagerList();
    if (list.length <= 1) {
      toast.error('At least one option is required.');
      return;
    }
    try {
      await updateManagerList(list.filter((_, idx) => idx !== index));
      toast.success('Deleted successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to delete option');
    }
  };

  const handleStartEdit = (index, value) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const openManager = section => {
    setManagerSection(section);
    setShowManagerModal(true);
    setEditingIndex(-1);
    setEditingValue('');
    setNewOptionValue('');
  };

  const handleSaveEdit = async () => {
    const nextValue = editingValue.trim();
    if (!nextValue) {
      toast.error('Please enter a valid value.');
      return;
    }
    const list = getManagerList();
    if (
      list.some((item, idx) => idx !== editingIndex && item.toLowerCase() === nextValue.toLowerCase())
    ) {
      toast.error('This value already exists.');
      return;
    }
    const nextList = [...list];
    nextList[editingIndex] = nextValue;
    try {
      await updateManagerList(nextList);
      setEditingIndex(-1);
      setEditingValue('');
      toast.success('Updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update option');
    }
  };

  const validateStep = index => {
    const requiredFields = STEP_REQUIRED_FIELDS[index] || [];
    const nextErrors = {};
    requiredFields.forEach(field => {
      const currentValue = String(form[field] || '').trim();
      if (!currentValue) {
        nextErrors[field] = 'This field is required';
        return;
      }
      const fieldError = validateField(field, currentValue);
      if (fieldError) nextErrors[field] = fieldError;
    });
    const optionalFieldsByStep = {
      0: ['dateofBirth'],
      1: [],
      2: ['aadharNumber', 'panNumber', 'emergencyContactPhone', 'pinCode'],
      3: ['baseSalary'],
      4: [],
    };
    (optionalFieldsByStep[index] || []).forEach(field => {
      const currentValue = String(form[field] || '').trim();
      if (!currentValue) return;
      const fieldError = validateField(field, currentValue);
      if (fieldError) nextErrors[field] = fieldError;
    });
    setStepErrors(prev => ({ ...prev, ...nextErrors }));
    return Object.keys(nextErrors).length === 0;
  };

  const goNext = () => {
    if (!validateStep(stepIndex)) {
      toast.error('Please complete required fields before continuing.');
      return;
    }
    setStepIndex(prev => Math.min(prev + 1, STEPS.length - 1));
  };
  const goBack = () => setStepIndex(prev => Math.max(prev - 1, 0));

  const handleCreateEmployee = async () => {
    if (stepIndex < STEPS.length - 1) {
      return;
    }

    const hasMissingCreateFields = REQUIRED_FOR_CREATE.some(field => !String(form[field] || '').trim());
    if (hasMissingCreateFields) {
      toast.error('Please complete all mandatory employee fields.');
      if (stepIndex !== 0) setStepIndex(0);
      return;
    }
    const finalValidationFields = [
      'name',
      'email',
      'phoneNumber',
      'dateofBirth',
      'joinedDate',
      'aadharNumber',
      'panNumber',
      'bankAccountNumber',
      'ifscCode',
      'pinCode',
      'emergencyContactPhone',
    ];
    const finalErrors = {};
    finalValidationFields.forEach(field => {
      const val = String(form[field] || '').trim();
      if (!val) return;
      const error = validateField(field, val);
      if (error) finalErrors[field] = error;
    });
    if (Object.keys(finalErrors).length > 0) {
      setStepErrors(prev => ({ ...prev, ...finalErrors }));
      toast.error('Please fix validation errors before creating employee.');
      return;
    }

    if (onboardingComplete && (!form.baseSalary || Number(form.baseSalary) <= 0)) {
      setStepIndex(3);
      setStepErrors(prev => ({ ...prev, baseSalary: 'Base salary is required for completed onboarding' }));
      toast.error('Base salary is required when onboarding is complete.');
      return;
    }

    setLoading(true);
    try {
      const employeePayload = {
        ...form,
        onboardingStatus: onboardingComplete ? 'onboarding_complete' : 'draft',
      };
      delete employeePayload.baseSalary;
      delete employeePayload.salaryEffectiveFrom;
      delete employeePayload.salaryRevisionReason;

      const employeeResponse = await fetch(`${BASE_URL}/employee/add`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(employeePayload),
      });

      const employeeData = await employeeResponse.json().catch(() => ({}));
      if (!employeeResponse.ok) {
        throw new Error(employeeData.message || 'Failed to add new employee');
      }

      const createdEmployeeId = employeeData?.employee?._id;

      if (createdEmployeeId && form.baseSalary && Number(form.baseSalary) > 0) {
        const salaryResponse = await fetch(`${BASE_URL}/salary/add/${createdEmployeeId}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
          body: JSON.stringify({
            baseSalary: Number(form.baseSalary),
            bonuses: 0,
            deductions: 0,
            effectiveFrom: form.salaryEffectiveFrom || undefined,
            revisionReason: form.salaryRevisionReason || 'Initial onboarding salary',
          }),
        });

        if (!salaryResponse.ok) {
          const salaryError = await salaryResponse.json().catch(() => ({}));
          toast.warn(
            salaryError.message ||
              'Employee added, but initial base salary was not assigned. You can assign it from salary profile.'
          );
        } else if (onboardingComplete) {
          await fetch(`${BASE_URL}/employee/update/${createdEmployeeId}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
            body: JSON.stringify({ onboardingStatus: 'payroll_ready' }),
          });
        }
      }

      toast.success('Employee created successfully');
      navigate('/admin/dashboard/employees');
    } catch (error) {
      toast.error(error.message || 'Failed to add employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen px-6 py-6 lg:ml-16 bg-light-bg dark:bg-dark-bg">
      <div className="max-w-6xl mx-auto space-y-6">
        <Header
          title="Add Employee"
          description="Step-wise onboarding with required and optional details. Employee code generation remains unchanged."
          icon={<UserPlus className="w-8 h-8 text-primary" />}
        />

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-4 border border-light-border dark:border-dark-border">
          {masterOptionsLoading && (
            <p className="text-xs text-light-text/70 dark:text-dark-text/70 mb-3">
              Loading role, department and designation settings...
            </p>
          )}
          <div className="flex items-center justify-between gap-3 overflow-x-auto">
            {STEPS.map((step, index) => {
              const isActive = index === stepIndex;
              const isDone = index < stepIndex;
              return (
                <div key={step.id} className="flex items-center gap-2 min-w-max">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isDone
                        ? 'bg-success text-white'
                        : isActive
                          ? 'bg-primary text-white'
                          : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text'
                    }`}
                  >
                    {isDone ? <Check className="w-4 h-4" /> : index + 1}
                  </div>
                  <span className={`text-sm ${isActive ? 'text-primary font-semibold' : 'text-light-text dark:text-dark-text'}`}>
                    {step.label}
                  </span>
                  {index < STEPS.length - 1 && <ChevronRight className="w-4 h-4 text-light-text/50" />}
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-light-card dark:bg-dark-card rounded-xl p-6 border border-light-border dark:border-dark-border space-y-6">
          {stepIndex === 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Full Name *" name="name" value={form.name} onChange={handleChange} placeholder="John Doe" required error={stepErrors.name} />
              <Input label="Email *" name="email" type="email" value={form.email} onChange={handleChange} placeholder="john@company.com" required error={stepErrors.email} />
              <Input label="Phone Number *" name="phoneNumber" value={form.phoneNumber} onChange={handleChange} placeholder="9876543210" required error={stepErrors.phoneNumber} inputMode="numeric" maxLength={15} />
              <Input label="Date of Birth (Optional)" name="dateofBirth" type="date" value={form.dateofBirth} onChange={handleChange} />
            </div>
          )}

          {stepIndex === 1 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">Department *</label>
                  <button
                    type="button"
                    onClick={() => openManager('departments')}
                    className="text-xs px-2 py-1 rounded bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                  >
                    Manage
                  </button>
                </div>
                <select
                  name="department"
                  value={form.department}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text ${
                    stepErrors.department
                      ? 'border-danger'
                      : 'border-light-border dark:border-dark-border'
                  }`}
                >
                  <option value="">Select</option>
                  {masterOptions.departments.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {stepErrors.department && (
                  <p className="text-xs text-danger mt-1">{stepErrors.department}</p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-sm font-medium text-light-text dark:text-dark-text">Designation *</label>
                  <button
                    type="button"
                    onClick={() => openManager('designations')}
                    className="text-xs px-2 py-1 rounded bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                  >
                    Manage
                  </button>
                </div>
                <select
                  name="designation"
                  value={form.designation}
                  onChange={handleChange}
                  className={`w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text ${
                    stepErrors.designation
                      ? 'border-danger'
                      : 'border-light-border dark:border-dark-border'
                  }`}
                >
                  <option value="">Select</option>
                  {masterOptions.designations.map(option => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {stepErrors.designation && (
                  <p className="text-xs text-danger mt-1">{stepErrors.designation}</p>
                )}
              </div>
              <Select label="Employment Type *" name="employmentType" value={form.employmentType} onChange={handleChange} options={['Full Time', 'Part Time', 'Contract', 'Intern']} error={stepErrors.employmentType} />
              <Input label="Work Location *" name="workLocation" value={form.workLocation} onChange={handleChange} placeholder="Mumbai" error={stepErrors.workLocation} />
              <Input label="Joining Date *" name="joinedDate" type="date" value={form.joinedDate} onChange={handleChange} error={stepErrors.joinedDate} />
            </div>
          )}

          {stepIndex === 2 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Aadhar Number (Optional)" name="aadharNumber" value={form.aadharNumber} onChange={handleChange} error={stepErrors.aadharNumber} inputMode="numeric" maxLength={12} />
              <Input label="PAN Number (Optional)" name="panNumber" value={form.panNumber} onChange={handleChange} error={stepErrors.panNumber} maxLength={10} />
              <Input label="Emergency Contact Name (Optional)" name="emergencyContactName" value={form.emergencyContactName} onChange={handleChange} />
              <Input label="Emergency Contact Phone (Optional)" name="emergencyContactPhone" value={form.emergencyContactPhone} onChange={handleChange} error={stepErrors.emergencyContactPhone} inputMode="numeric" maxLength={15} />
              <Input label="Address (Optional)" name="address" value={form.address} onChange={handleChange} />
              <Input label="State (Optional)" name="state" value={form.state} onChange={handleChange} />
              <Input label="City (Optional)" name="city" value={form.city} onChange={handleChange} />
              <Input label="District (Optional)" name="district" value={form.district} onChange={handleChange} />
              <Input label="Pin Code (Optional)" name="pinCode" value={form.pinCode} onChange={handleChange} error={stepErrors.pinCode} inputMode="numeric" maxLength={6} />
            </div>
          )}

          {stepIndex === 3 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input label="Bank Name *" name="bankName" value={form.bankName} onChange={handleChange} placeholder="HDFC Bank" error={stepErrors.bankName} />
              <Input label="Branch Name *" name="branchName" value={form.branchName} onChange={handleChange} placeholder="Andheri East" error={stepErrors.branchName} />
              <Input label="Bank Account Number *" name="bankAccountNumber" value={form.bankAccountNumber} onChange={handleChange} error={stepErrors.bankAccountNumber} inputMode="numeric" maxLength={20} />
              <Input label="IFSC Code *" name="ifscCode" value={form.ifscCode} onChange={handleChange} placeholder="HDFC0000001" error={stepErrors.ifscCode} />
              <Input label="Base Salary (required when onboarding is complete)" name="baseSalary" type="number" min="0" value={form.baseSalary} onChange={handleChange} placeholder="50000" error={stepErrors.baseSalary} />
              <Input label="Salary Effective From (Optional)" name="salaryEffectiveFrom" type="date" value={form.salaryEffectiveFrom} onChange={handleChange} />
              <div className="md:col-span-2">
                <Input label="Salary Reason (Optional)" name="salaryRevisionReason" value={form.salaryRevisionReason} onChange={handleChange} />
              </div>
            </div>
          )}

          {stepIndex === 4 && (
            <div className="space-y-4">
              <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-4 border border-light-border dark:border-dark-border">
                <p className="text-sm text-light-text dark:text-dark-text">
                  Onboarding completion: <span className="font-semibold">{completionCount}/{REQUIRED_FOR_ONBOARDING.length}</span>
                </p>
                <p className="text-sm text-light-text/70 dark:text-dark-text/70 mt-1">
                  Status on create: <span className="font-semibold">{onboardingComplete ? 'Onboarding Complete' : 'Draft'}</span>
                </p>
                <p className="text-sm text-light-text/70 dark:text-dark-text/70 mt-1">
                  Employee code stays auto-generated by existing settings.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                <Summary label="Name" value={form.name} />
                <Summary label="Email" value={form.email} />
                <Summary label="Phone" value={form.phoneNumber} />
                <Summary label="Department" value={form.department} />
                <Summary label="Designation" value={form.designation} />
                <Summary label="Joining Date" value={form.joinedDate} />
                <Summary label="Base Salary" value={form.baseSalary ? `₹${form.baseSalary}` : ''} />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between pt-2">
            <div className="flex items-center gap-3">
              <Link
                to="/admin/dashboard/employees"
                className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text inline-flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </Link>
              {stepIndex > 0 && (
                <button
                  type="button"
                  onClick={goBack}
                  className="px-4 py-2 rounded-lg border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
                >
                  Previous
                </button>
              )}
            </div>

            {stepIndex < STEPS.length - 1 ? (
              <button
                type="button"
                onClick={goNext}
                className="px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-dark"
              >
                Next
              </button>
            ) : (
              <button
                type="button"
                onClick={handleCreateEmployee}
                disabled={loading}
                className="px-4 py-2 rounded-lg bg-success text-white hover:bg-success/80 inline-flex items-center gap-2"
              >
                <Save className="w-4 h-4" /> {loading ? 'Creating...' : 'Create Employee'}
              </button>
            )}
          </div>

        </div>
      </div>
      {showManagerModal && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setShowManagerModal(false)}
            className="absolute inset-0 bg-black/50"
            aria-label="Close panel overlay"
          />
          <div className="absolute right-0 top-0 h-full w-full max-w-md bg-light-card dark:bg-dark-card border-l border-light-border dark:border-dark-border shadow-2xl p-4 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-semibold text-light-text dark:text-dark-text">
                Manage {managerSection === 'departments' ? 'Departments' : 'Designations'}
              </h3>
              <button
                type="button"
                onClick={() => setShowManagerModal(false)}
                className="px-2 py-1 text-sm rounded border border-light-border dark:border-dark-border text-light-text dark:text-dark-text"
              >
                Close
              </button>
            </div>
            <div className="flex-1 min-h-0">
              <InlineManager
                title={managerSection === 'departments' ? 'Department' : 'Designation'}
                items={getManagerList()}
                newOptionValue={newOptionValue}
                setNewOptionValue={setNewOptionValue}
                editingIndex={editingIndex}
                editingValue={editingValue}
                setEditingValue={setEditingValue}
                onAdd={handleAddOption}
                onEditStart={handleStartEdit}
                onEditSave={handleSaveEdit}
                onDelete={handleDeleteOption}
              />
            </div>
          </div>
        </div>
      )}

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        closeOnClick={true}
        autoClose={1200}
      />
    </div>
  );
};

const Input = ({ label, error, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">{label}</label>
    <input
      {...props}
      className={`w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text ${
        error ? 'border-danger' : 'border-light-border dark:border-dark-border'
      }`}
    />
    {error && <p className="text-xs text-danger mt-1">{error}</p>}
  </div>
);

const Select = ({ label, options = [], error, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-1">{label}</label>
    <select
      {...props}
      className={`w-full px-4 py-2.5 bg-light-bg dark:bg-dark-bg border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text ${
        error ? 'border-danger' : 'border-light-border dark:border-dark-border'
      }`}
    >
      <option value="">Select</option>
      {options.map(option => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
    {error && <p className="text-xs text-danger mt-1">{error}</p>}
  </div>
);

const InlineManager = ({
  title,
  items,
  newOptionValue,
  setNewOptionValue,
  editingIndex,
  editingValue,
  setEditingValue,
  onAdd,
  onEditStart,
  onEditSave,
  onDelete,
}) => (
  <div className="mt-2 h-full flex flex-col space-y-2 border border-light-border dark:border-dark-border rounded-lg p-2 bg-light-card/60 dark:bg-dark-card/60">
    <div className="flex items-center gap-2">
      <input
        type="text"
        value={newOptionValue}
        onChange={e => setNewOptionValue(e.target.value)}
        placeholder={`Add ${title}`}
        className="w-full px-3 py-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text text-sm"
      />
      <button type="button" onClick={onAdd} className="px-3 py-2 bg-success text-white rounded-lg inline-flex items-center gap-1 text-sm">
        <Plus className="w-4 h-4" /> Add
      </button>
    </div>
    <div className="space-y-1 flex-1 overflow-y-auto">
      {items.map((item, index) => (
        <div key={`${item}-${index}`} className="flex items-center justify-between gap-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg p-2">
          {editingIndex === index ? (
            <input
              type="text"
              value={editingValue}
              onChange={e => setEditingValue(e.target.value)}
              className="w-full px-2 py-1 bg-light-card dark:bg-dark-card border border-light-border dark:border-dark-border rounded focus:outline-none focus:ring-2 focus:ring-primary text-light-text dark:text-dark-text text-sm"
            />
          ) : (
            <span className="text-sm text-light-text dark:text-dark-text">{item}</span>
          )}
          <div className="flex items-center gap-1">
            {editingIndex === index ? (
              <button type="button" onClick={onEditSave} className="px-2 py-1 rounded bg-primary text-white text-xs">
                Save
              </button>
            ) : (
              <button type="button" onClick={() => onEditStart(index, item)} className="p-1.5 rounded bg-info text-white">
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button type="button" onClick={() => onDelete(index)} className="p-1.5 rounded bg-danger text-white">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const Summary = ({ label, value }) => (
  <div className="bg-light-bg dark:bg-dark-bg rounded-lg p-3 border border-light-border dark:border-dark-border">
    <p className="text-xs text-light-text/70 dark:text-dark-text/70">{label}</p>
    <p className="font-medium text-light-text dark:text-dark-text">{value || 'Not provided'}</p>
  </div>
);

export default AdminAddEmployee;
