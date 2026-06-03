import {
  Banknote,
  Briefcase,
  Building,
  Calendar,
  ChevronRight,
  Clock,
  Edit,
  FileText,
  Home,
  Loader2,
  Mail,
  Map,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Save,
  Trash2,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

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

const CategorySection = ({ title, children, icon: Icon }) => (
  <div className="space-y-4">
    <h2 className="text-xl font-semibold text-light-text dark:text-dark-text flex items-center gap-2">
      <Icon className="w-5 h-5 text-light-text dark:text-dark-text" />
      {title}
    </h2>
    <div className="grid grid-cols-2 gap-4">{children}</div>
  </div>
);

const fieldStyle = {
  personalInfoStyle: 'bg-info/10 text-info',
  locationInfoStyle: 'bg-success/10 text-success',
  workInfoStyle: 'bg-secondary/10 text-secondary',
};

const InfoCard = ({
  icon: Icon,
  label,
  value,
  color,
  editable,
  onChange,
  inputType = 'text',
  options = [],
  onManage,
  onClick,
}) => (
  <div className="flex items-center gap-3 p-4 rounded-lg bg-light-card/50 dark:bg-dark-card/50 border border-light-border/50 dark:border-dark-border/50 hover:border-light-border/80 dark:hover:border-dark-border/80 transition-all">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="text-xs font-medium text-light-text dark:text-dark-text">{label}</p>
      {editable && inputType === 'select' ? (
        <>
          <select
            className="w-full text-sm font-medium text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded px-2 py-1 focus:outline-none focus:border-info/50 transition-colors"
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          >
            <option value="">Select</option>
            {options.map(option => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {onManage && (
            <button
              type="button"
              onClick={onManage}
              className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-info hover:text-info/80"
            >
              Manage options
            </button>
          )}
        </>
      ) : editable ? (
        <input
          type="text"
          className="w-full text-sm font-medium text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded px-2 py-1 focus:outline-none focus:border-info/50 transition-colors"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      ) : onClick ? (
        <button
          type="button"
          onClick={onClick}
          className="mt-1 w-full inline-flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-left transition-colors hover:bg-primary/10"
        >
          <span className="flex flex-col gap-0.5">
            <span className="text-sm font-semibold text-primary">View Salary Details</span>
            <span className="text-xs font-medium text-light-text/70 dark:text-dark-text/70">
              {value || 'Not Provided'}
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-primary shrink-0" />
        </button>
      ) : (
        <p className="text-sm font-medium text-light-text dark:text-dark-text">
          {value || 'Not Provided'}
        </p>
      )}
    </div>
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
      <button
        type="button"
        onClick={onAdd}
        className="px-3 py-2 bg-success text-white rounded-lg inline-flex items-center gap-1 text-sm"
      >
        <Plus className="w-4 h-4" /> Add
      </button>
    </div>
    <div className="space-y-1 flex-1 overflow-y-auto">
      {items.map((item, index) => (
        <div
          key={`${item}-${index}`}
          className="flex items-center justify-between gap-2 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg p-2"
        >
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
              <button
                type="button"
                onClick={onEditSave}
                className="px-2 py-1 rounded bg-primary text-white text-xs"
              >
                Save
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onEditStart(index, item)}
                className="p-1.5 rounded bg-info text-white"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => onDelete(index)}
              className="p-1.5 rounded bg-danger text-white"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

const InformationTab = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [latestSalary, setLatestSalary] = useState(null);
  const [masterOptions, setMasterOptions] = useState({
    departments: DEPARTMENT_OPTIONS,
    designations: DESIGNATION_OPTIONS,
  });
  const [managerSection, setManagerSection] = useState('departments');
  const [showManagerModal, setShowManagerModal] = useState(false);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [editingIndex, setEditingIndex] = useState(-1);
  const [editingValue, setEditingValue] = useState('');

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const categoryMap = {
    personalInfo: {
      title: 'Personal Information',
      icon: User,
      fields: {
        name: { icon: User, color: fieldStyle.personalInfoStyle },
        email: { icon: Mail, color: fieldStyle.personalInfoStyle },
        phoneNumber: { icon: Phone, color: fieldStyle.personalInfoStyle },
        dateofBirth: { icon: Calendar, color: fieldStyle.personalInfoStyle },
        aadharNumber: { icon: FileText, color: fieldStyle.personalInfoStyle },
        panNumber: { icon: FileText, color: fieldStyle.personalInfoStyle },
      },
    },
    locationInfo: {
      title: 'Location Information',
      icon: Map,
      fields: {
        address: { icon: Home, color: fieldStyle.locationInfoStyle },
        city: { icon: Building, color: fieldStyle.locationInfoStyle },
        district: { icon: MapPin, color: fieldStyle.locationInfoStyle },
        state: { icon: Map, color: fieldStyle.locationInfoStyle },
        pinCode: { icon: MapPin, color: fieldStyle.locationInfoStyle },
      },
    },
    professionalInfo: {
      title: 'Professional Information',
      icon: Briefcase,
      fields: {
        baseSalaryMaster: { icon: Banknote, color: fieldStyle.workInfoStyle },
        onboardingStatus: { icon: FileText, color: fieldStyle.workInfoStyle },
        department: { icon: Building, color: fieldStyle.workInfoStyle },
        designation: { icon: Briefcase, color: fieldStyle.workInfoStyle },
        employmentType: { icon: Briefcase, color: fieldStyle.workInfoStyle },
        workLocation: { icon: MapPin, color: fieldStyle.workInfoStyle },
        joinedDate: { icon: Calendar, color: fieldStyle.workInfoStyle },
        predefinedCheckInTime: {
          icon: Clock,
          color: fieldStyle.workInfoStyle,
        },
        bankName: { icon: FileText, color: fieldStyle.workInfoStyle },
        branchName: {
          icon: FileText,
          color: fieldStyle.workInfoStyle,
        },
        bankAccountNumber: {
          icon: FileText,
          color: fieldStyle.workInfoStyle,
        },
        ifscCode: { icon: FileText, color: fieldStyle.workInfoStyle },
        emergencyContactName: { icon: User, color: fieldStyle.workInfoStyle },
        emergencyContactPhone: { icon: Phone, color: fieldStyle.workInfoStyle },
      },
    },
  };

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

  const fetchLatestSalary = async () => {
    try {
      const response = await fetch(`${BASE_URL}/salary/find/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      if (!response.ok) {
        setLatestSalary(null);
        return;
      }
      const data = await response.json();
      setLatestSalary((data.salaries || [])[0] || null);
    } catch {
      setLatestSalary(null);
    }
  };

  const fetchMasterOptions = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/employee-master-options`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch master options');
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
      toast.error(error.message || 'Failed to fetch department/designation options.');
    }
  };

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
      if (!nextList.includes(employeeDetails?.department)) {
        setEmployeeDetails(prev => ({ ...prev, department: '' }));
      }
      return;
    }
    const nextOptions = { ...masterOptions, designations: nextList };
    await persistMasterOptions(nextOptions);
    if (!nextList.includes(employeeDetails?.designation)) {
      setEmployeeDetails(prev => ({ ...prev, designation: '' }));
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
      list.some(
        (item, idx) => idx !== editingIndex && item.toLowerCase() === nextValue.toLowerCase()
      )
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

  const updateEmployeeData = async () => {
    try {
      const response = await fetch(`${BASE_URL}/employee/update/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(employeeDetails),
      });
      if (!response.ok) throw new Error('Failed to update employee details.');
      toast.success('Employee details updated successfully');
      setEditing(false);
      fetchEmployeeData();
    } catch (error) {
      toast.error(error.message || 'Update failed.');
    }
  };

  useEffect(() => {
    fetchEmployeeData();
    fetchMasterOptions();
    fetchLatestSalary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[300px]">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
        <span className="text-sm font-medium text-light-text dark:text-dark-text ml-3">
          Loading employee data...
        </span>
      </div>
    );
  }

  if (!employeeDetails) {
    return (
      <div className="text-center text-light-text dark:text-dark-text">
        Failed to load employee details. Please try again later.
      </div>
    );
  }

  const formatDate = dateString => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="space-y-8 p-6 bg-light-bg dark:bg-dark-bg">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-light-text dark:text-dark-text">
          Employee Information
        </h1>
        {editing ? (
          <button
            onClick={updateEmployeeData}
            className="bg-success hover:bg-success/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            aria-label="Save changes"
          >
            <Save className="w-4 h-4" /> Save Changes
          </button>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="bg-info hover:bg-info/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            aria-label="Edit details"
          >
            <Edit className="w-4 h-4" /> Edit Details
          </button>
        )}
      </div>

      <div className="space-y-8">
        {Object.entries(categoryMap).map(([category, { title, icon, fields }]) => (
          <CategorySection key={category} title={title} icon={icon}>
            {Object.entries(fields).map(([field, { icon, color }]) => {
              let value = employeeDetails[field];
              let onClick;
              if (field === 'baseSalaryMaster') {
                value = latestSalary
                  ? `₹${Number(latestSalary.baseSalary || 0).toFixed(2)}`
                  : 'Not Provided';
                onClick =
                  editing && latestSalary
                    ? () =>
                        navigate(`/admin/dashboard/salaries/${id}`, {
                          state: {
                            returnTo: `/admin/dashboard/employees/${id}`,
                            source: 'employee-information',
                          },
                        })
                    : undefined;
              }
              if (field === 'dateofBirth' || field === 'joinedDate') {
                value = formatDate(value);
              }
              return (
                <InfoCard
                  key={field}
                  icon={icon}
                  label={field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                  value={value}
                  color={color}
                  editable={editing && field !== 'baseSalaryMaster'}
                  inputType={field === 'department' || field === 'designation' ? 'select' : 'text'}
                  options={
                    field === 'department'
                      ? masterOptions.departments
                      : field === 'designation'
                        ? masterOptions.designations
                        : []
                  }
                  onManage={
                    field === 'department'
                      ? () => openManager('departments')
                      : field === 'designation'
                        ? () => openManager('designations')
                        : undefined
                  }
                  onClick={onClick}
                  onChange={val => setEmployeeDetails({ ...employeeDetails, [field]: val })}
                />
              );
            })}
          </CategorySection>
        ))}
      </div>

      {showManagerModal && (
        <div className="fixed inset-0 z-50">
          <button
            type="button"
            onClick={() => setShowManagerModal(false)}
            className="absolute inset-0 bg-transparent"
            aria-label="Close panel overlay"
          />
          <div className="fixed right-0 top-0 h-full w-full max-w-md bg-light-card dark:bg-dark-card border-l border-light-border dark:border-dark-border shadow-2xl px-4 py-3 flex flex-col">
            <div className="flex items-center justify-between mb-4 pt-1">
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
        autoClose={1000}
      />
    </div>
  );
};

export default InformationTab;
