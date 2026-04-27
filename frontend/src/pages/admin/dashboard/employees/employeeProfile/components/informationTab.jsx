import {
  Briefcase,
  Building,
  Calendar,
  Clock,
  Edit,
  FileText,
  Home,
  Loader2,
  Mail,
  Map,
  MapPin,
  Phone,
  Save,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

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

const InfoCard = ({ icon: Icon, label, value, color, editable, onChange, inputType = 'text', options = [] }) => (
  <div className="flex items-center gap-3 p-4 rounded-lg bg-light-card/50 dark:bg-dark-card/50 border border-light-border/50 dark:border-dark-border/50 hover:border-light-border/80 dark:hover:border-dark-border/80 transition-all">
    <div className={`p-2 rounded-lg ${color}`}>
      <Icon className="w-5 h-5" />
    </div>
    <div className="flex-1">
      <p className="text-xs font-medium text-light-text dark:text-dark-text">{label}</p>
      {editable && inputType === 'select' ? (
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
      ) : editable ? (
        <input
          type="text"
          className="w-full text-sm font-medium text-light-text dark:text-dark-text bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded px-2 py-1 focus:outline-none focus:border-info/50 transition-colors"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
        />
      ) : (
        <p className="text-sm font-medium text-light-text dark:text-dark-text">
          {value || 'Not Provided'}
        </p>
      )}
    </div>
  </div>
);

const InformationTab = () => {
  const { id } = useParams();
  const [employeeDetails, setEmployeeDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [masterOptions, setMasterOptions] = useState({
    departments: [],
    designations: [],
  });

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

  const fetchMasterOptions = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/employee-master-options`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || 'Failed to fetch master options');
      const settings = data.settings || {};
      setMasterOptions({
        departments: Array.isArray(settings.departments) ? settings.departments : [],
        designations: Array.isArray(settings.designations) ? settings.designations : [],
      });
    } catch (error) {
      toast.error(error.message || 'Failed to fetch department/designation options.');
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
                  editable={editing}
                  inputType={field === 'department' || field === 'designation' ? 'select' : 'text'}
                  options={
                    field === 'department'
                      ? masterOptions.departments
                      : field === 'designation'
                        ? masterOptions.designations
                        : []
                  }
                  onChange={val => setEmployeeDetails({ ...employeeDetails, [field]: val })}
                />
              );
            })}
          </CategorySection>
        ))}
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

export default InformationTab;
