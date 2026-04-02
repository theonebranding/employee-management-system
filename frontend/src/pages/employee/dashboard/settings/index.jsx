import 'react-toastify/dist/ReactToastify.css';

import { Building, CreditCard, Shield, User, UserCog } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('personalInfo');
  const [formData, setFormData] = useState({
    personalInfo: {
      name: '',
      email: '',
      phoneNumber: '',
      dateofBirth: '',
      address: '',
      state: '',
      city: '',
      district: '',
      pinCode: '',
    },
    professionalInfo: {
      jobRole: '',
      joinedDate: '',
      serviceTime: '',
    },
    bankAccountInfo: {
      bankName: '',
      branchName: '',
      accountNumber: '',
      confirmAccountNumber: '',
      ifscCode: '',
    },
    identificationInfo: {
      aadharNumber: '',
      panNumber: '',
      licenseInfo: '',
    },
  });

  const [loading, setLoading] = useState(false);
  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/employee/my-profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch profile data');

      const { employee } = await response.json();
      setFormData({
        personalInfo: {
          name: employee.name || '',
          email: employee.email || '',
          phoneNumber: employee.phoneNumber || '',
          dateofBirth: employee.dateofBirth
            ? new Date(employee.dateofBirth).toISOString().split('T')[0]
            : '',
          address: employee.address || '',
          state: employee.state || '',
          city: employee.city || '',
          district: employee.district || '',
          pinCode: employee.pinCode || '',
        },
        professionalInfo: {
          jobRole: employee.jobRole || '',
          joinedDate: employee.joinedDate
            ? new Date(employee.joinedDate).toISOString().split('T')[0]
            : '',
          serviceTime: employee.serviceTime || '',
        },
        bankAccountInfo: {
          bankName: employee.bankName || '',
          branchName: employee.branchName || '',
          accountNumber: employee.bankAccountNumber || '',
          confirmAccountNumber: employee.bankAccountNumber || '',
          ifscCode: employee.ifscCode || '',
        },
        identificationInfo: {
          aadharNumber: employee.aadharNumber || '',
          panNumber: employee.panNumber || '',
          licenseInfo: employee.licenseInfo || '',
        },
      });
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast.error(error.message || 'Failed to fetch profile data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tabs = [
    {
      id: 'personalInfo',
      label: 'Personal Info',
      icon: User,
      color: 'text-success',
    },
    {
      id: 'professionalInfo',
      label: 'Professional Info',
      icon: Building,
      color: 'text-warning',
    },
    {
      id: 'bankAccountInfo',
      label: 'Bank Info',
      icon: CreditCard,
      color: 'text-info',
    },
    {
      id: 'identificationInfo',
      label: 'Identification',
      icon: Shield,
      color: 'text-secondary',
    },
  ];

  const renderFields = (section, fields) => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.entries(fields).map(([key, value]) => (
          <div
            key={key}
            className="group relative bg-light-card dark:bg-dark-card rounded-xl p-4 ring-1 ring-light-border dark:ring-dark-border shadow-card transition-all duration-300"
          >
            <label className="block text-sm font-medium mb-2 text-light-text dark:text-dark-text capitalize">
              {key.replace(/([A-Z])/g, ' $1')}
            </label>
            <div className="relative">
              <div className="w-full p-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg text-light-text dark:text-dark-text">
                {value || 'Not provided'}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          title="Settings"
          description="Manage your profile settings and information."
          icon={<UserCog className="w-8 h-8 text-light-text dark:text-dark-text" />}
        />

        {/* Tabs */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border">
          <div className="flex flex-col md:flex-row gap-4 mb-8">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-6 py-4 rounded-xl font-medium transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-primary/10 text-primary ring-1 ring-primary/50'
                    : 'text-light-text dark:text-dark-text hover:bg-light-bg dark:hover:bg-dark-bg'
                }`}
              >
                <tab.icon className={`w-5 h-5 ${tab.color}`} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Content */}
          <div className="bg-light-bg dark:bg-dark-bg rounded-xl p-6">
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="text-light-text dark:text-dark-text opacity-70">
                  Loading profile data...
                </div>
              </div>
            ) : (
              renderFields(activeTab, formData[activeTab])
            )}
          </div>
        </div>
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

export default Settings;
