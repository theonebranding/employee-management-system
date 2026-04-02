/* eslint-disable sonarjs/cognitive-complexity */
/* eslint-disable sonarjs/no-duplicate-string */
/* eslint-disable simple-import-sort/imports */
import {
  BadgeDollarSign,
  Clock,
  Eye,
  EyeOff,
  Loader2,
  Lock,
  Mail,
  Phone,
  Save,
  Settings,
  Shield,
  User,
} from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { toast, ToastContainer } from 'react-toastify';

import Header from '../../../../components/pageHeader';
import {
  defaultPayslipSettings,
  defaultPayslipTemplates,
} from '../../../../utils/payslipTemplates';

import AdminAttendanceSettings from './adminAttendanceSetting';

const AdminSettings = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
  });
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [originalData, setOriginalData] = useState({});
  const [loading, setLoading] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [mfaLoading, setMfaLoading] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState('profile');
  const [payslipSettings, setPayslipSettings] = useState(defaultPayslipSettings);
  const [payslipLoading, setPayslipLoading] = useState(false);

  const BASE_URL = import.meta.env.VITE_BACKEND_URL;

  const convertFileToDataUrl = file =>
    new Promise((resolve, reject) => {
      const reader = new window.FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsDataURL(file);
    });

  const fetchPayslipSettings = async () => {
    try {
      const response = await fetch(`${BASE_URL}/admin/payslip-settings`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch payslip settings');
      }

      const data = await response.json();
      setPayslipSettings({
        ...defaultPayslipSettings,
        ...data.settings,
        templates: data.settings?.templates?.length
          ? data.settings.templates
          : defaultPayslipTemplates,
      });
    } catch (error) {
      toast.error(error.message || 'Failed to fetch payslip settings');
    }
  };

  const updatePayslipSettings = async event => {
    event.preventDefault();
    try {
      setPayslipLoading(true);
      const response = await fetch(`${BASE_URL}/admin/payslip-settings`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(payslipSettings),
      });

      if (!response.ok) {
        throw new Error('Failed to update payslip settings');
      }

      toast.success('Payslip settings updated successfully');
    } catch (error) {
      toast.error(error.message || 'Failed to update payslip settings');
    } finally {
      setPayslipLoading(false);
    }
  };

  const handleImageUpload = async (event, targetField) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const imageData = await convertFileToDataUrl(file);
      setPayslipSettings(previous => ({ ...previous, [targetField]: imageData }));
    } catch {
      toast.error('Unable to process selected image');
    }
  };

  // Fetch Admin Profile
  const fetchAdminSettings = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${BASE_URL}/admin/my-profile`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });

      if (!response.ok) throw new Error('Failed to fetch settings');

      const data = await response.json();
      setFormData({
        name: data.admin.name || '',
        email: data.admin.email || '',
        phoneNumber: data.admin.phoneNumber || '',
      });
      setOriginalData({
        name: data.admin.name || '',
        email: data.admin.email || '',
        phoneNumber: data.admin.phoneNumber || '',
      });
      setMfaEnabled(Boolean(data.admin.mfaEnabled));
    } catch (error) {
      console.error('Error fetching admin settings:', error);
      toast.error(error.message || 'Failed to fetch admin settings.');
    } finally {
      setLoading(false);
    }
  };

  // Update Admin Profile
  const updateAdminSettings = async e => {
    e.preventDefault();

    const updatedData = Object.keys(formData).reduce((acc, key) => {
      if (formData[key] !== originalData[key]) {
        acc[key] = formData[key];
      }
      return acc;
    }, {});

    if (Object.keys(updatedData).length === 0) {
      toast.info('No changes detected.');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${BASE_URL}/admin/update-profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(updatedData),
      });

      if (!response.ok) throw new Error('Failed to update settings');

      const data = await response.json();
      setOriginalData(formData);
      toast.success(data.message || 'Settings updated successfully.');
    } catch (error) {
      console.error('Error updating admin settings:', error);
      toast.error(error.message || 'Failed to update settings.');
    } finally {
      setLoading(false);
    }
  };

  // Update Admin Password
  const updatePassword = async e => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setPasswordError('');

    try {
      setPasswordLoading(true);
      const response = await fetch(`${BASE_URL}/admin/update-password`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ newPassword: passwordData.newPassword }),
      });

      if (!response.ok) throw new Error('Failed to update password');

      const data = await response.json();
      toast.success(data.message || 'Password updated successfully.');

      setPasswordData({
        newPassword: '',
        confirmPassword: '',
      });
    } catch (error) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const updateMfaPreference = async enabled => {
    try {
      setMfaLoading(true);
      const response = await fetch(`${BASE_URL}/auth/mfa-preference`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Failed to update MFA setting');
      }

      setMfaEnabled(Boolean(data.mfaEnabled));
      toast.success(data.message || 'MFA preference updated');
    } catch (error) {
      toast.error(error.message || 'Failed to update MFA preference');
    } finally {
      setMfaLoading(false);
    }
  };

  // Handle Input Changes
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  // Handle Password Input Changes
  const handlePasswordChange = e => {
    const { name, value } = e.target;
    setPasswordData({ ...passwordData, [name]: value });

    if (passwordError) {
      setPasswordError('');
    }
  };

  // Password strength validation
  const getPasswordStrength = password => {
    if (!password) return { strength: 0, label: '', color: '' };

    const hasLower = /[a-z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const length = password.length;

    let strength = 0;
    if (length > 7) strength += 1;
    if (length > 10) strength += 1;
    if (hasLower) strength += 1;
    if (hasUpper) strength += 1;
    if (hasNumber) strength += 1;
    if (hasSpecial) strength += 1;

    let label = '';
    let color = '';

    if (strength <= 2) {
      label = 'Weak';
      color = 'bg-danger';
    } else if (strength <= 4) {
      label = 'Medium';
      color = 'bg-warning';
    } else {
      label = 'Strong';
      color = 'bg-success';
    }

    return {
      strength: Math.min(Math.floor((strength / 6) * 100), 100),
      label,
      color,
    };
  };

  const passwordStrength = getPasswordStrength(passwordData.newPassword);

  useEffect(() => {
    fetchAdminSettings();
    fetchPayslipSettings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen pl-16 sm:pl-20 px-3 sm:px-5 lg:px-6 py-4 sm:py-6 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <Header
          title="Settings"
          description="Manage your profile, attendance settings and information."
          icon={<Settings className="w-8 h-8 text-primary" />}
        />
        <div className="flex flex-col md:flex-row md:items-center md:justify-center mb-8">
          <div className="flex space-x-2 p-4 bg-light-card dark:bg-dark-card rounded-lg border border-light-border dark:border-dark-border">
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'profile'
                  ? 'bg-primary text-white'
                  : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg'
              }`}
            >
              <User size={18} />
              <span>Profile</span>
            </button>
            <button
              onClick={() => setActiveTab('security')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'security'
                  ? 'bg-primary text-white'
                  : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg'
              }`}
            >
              <Shield size={18} />
              <span>Security</span>
            </button>
            <button
              onClick={() => setActiveTab('attendance-settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'attendance-settings'
                  ? 'bg-primary text-white'
                  : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg'
              }`}
            >
              <Clock size={18} />
              <span>Attendance Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('payslip-settings')}
              className={`flex items-center gap-2 px-4 py-2 rounded-md transition-all ${
                activeTab === 'payslip-settings'
                  ? 'bg-primary text-white'
                  : 'text-light-text dark:text-dark-text opacity-70 hover:bg-light-bg dark:hover:bg-dark-bg'
              }`}
            >
              <BadgeDollarSign size={18} />
              <span>Payslip Settings</span>
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center min-h-[300px]">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
            <span className="ml-3 text-light-text dark:text-dark-text opacity-70">
              Loading settings...
            </span>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Profile Section */}
            {activeTab === 'profile' && (
              <div className="bg-light-card dark:bg-dark-card p-8 rounded-xl border border-light-border dark:border-dark-border shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                      Profile Information
                    </h2>
                    <p className="text-light-text dark:text-dark-text opacity-70 text-sm mt-1">
                      Update your personal information
                    </p>
                  </div>
                </div>

                <form onSubmit={updateAdminSettings} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Name */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <User
                            size={18}
                            className="text-light-text dark:text-dark-text opacity-50"
                          />
                        </div>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          className="w-full py-3 pl-10 pr-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-light-text dark:text-dark-text"
                          placeholder="Enter your name"
                          required
                        />
                      </div>
                    </div>

                    {/* Email */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                        Email Address
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail
                            size={18}
                            className="text-light-text dark:text-dark-text opacity-50"
                          />
                        </div>
                        <input
                          type="email"
                          name="email"
                          value={formData.email}
                          onChange={handleChange}
                          className="w-full py-3 pl-10 pr-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-light-text dark:text-dark-text"
                          placeholder="Enter your email"
                          required
                        />
                      </div>
                    </div>

                    {/* Phone */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                        Phone Number
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Phone
                            size={18}
                            className="text-light-text dark:text-dark-text opacity-50"
                          />
                        </div>
                        <input
                          type="text"
                          name="phoneNumber"
                          value={formData.phoneNumber}
                          onChange={handleChange}
                          className="w-full py-3 pl-10 pr-3 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-light-text dark:text-dark-text"
                          placeholder="Enter your phone number"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-light-border dark:border-dark-border">
                    <button
                      type="submit"
                      disabled={loading}
                      className={`flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg transition ${
                        loading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {loading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Save size={18} />
                          <span>Save Changes</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="pt-4 border-t border-light-border dark:border-dark-border flex items-center justify-between">
                    <div>
                      <p className="font-medium text-light-text dark:text-dark-text">Multi-factor authentication</p>
                      <p className="text-sm opacity-70 text-light-text dark:text-dark-text">
                        Require OTP verification after password login.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => updateMfaPreference(!mfaEnabled)}
                      disabled={mfaLoading}
                      className={`px-4 py-2 rounded-lg text-white ${mfaEnabled ? 'bg-danger' : 'bg-success'} ${mfaLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      {mfaLoading ? 'Updating...' : mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Password Section */}
            {activeTab === 'security' && (
              <div className="bg-light-card dark:bg-dark-card p-8 rounded-xl border border-light-border dark:border-dark-border shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <Lock className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                      Security Settings
                    </h2>
                    <p className="text-light-text dark:text-dark-text opacity-70 text-sm mt-1">
                      Update your password to keep your account secure
                    </p>
                  </div>
                </div>

                <form onSubmit={updatePassword} className="space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* New Password */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                        New Password
                      </label>
                      <div className="relative">
                        <input
                          type={showNewPassword ? 'text' : 'password'}
                          name="newPassword"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                          className="w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition text-light-text dark:text-dark-text pr-10"
                          placeholder="Enter new password"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text dark:text-dark-text opacity-70 hover:opacity-100 focus:outline-none transition"
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          {showNewPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>

                      {/* Password strength meter */}
                      {passwordData.newPassword && (
                        <div className="mt-3">
                          <div className="flex justify-between items-center mb-1">
                            <span className="text-xs text-light-text dark:text-dark-text opacity-70">
                              Password Strength
                            </span>
                            <span
                              className={`text-xs font-medium ${
                                passwordStrength.label === 'Strong'
                                  ? 'text-success'
                                  : passwordStrength.label === 'Medium'
                                    ? 'text-warning'
                                    : 'text-danger'
                              }`}
                            >
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="w-full bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${passwordStrength.color}`}
                              style={{ width: `${passwordStrength.strength}%` }}
                            ></div>
                          </div>
                          <div className="mt-2 text-xs text-light-text dark:text-dark-text opacity-70">
                            <p>For a strong password, include:</p>
                            <ul className="list-disc ml-4 mt-1 space-y-1">
                              <li
                                className={
                                  /[A-Z]/.test(passwordData.newPassword) ? 'text-success' : ''
                                }
                              >
                                Uppercase letters
                              </li>
                              <li
                                className={
                                  /[a-z]/.test(passwordData.newPassword) ? 'text-success' : ''
                                }
                              >
                                Lowercase letters
                              </li>
                              <li
                                className={
                                  /\d/.test(passwordData.newPassword) ? 'text-success' : ''
                                }
                              >
                                Numbers
                              </li>
                              <li
                                className={
                                  /[!@#$%^&*(),.?":{}|<>]/.test(passwordData.newPassword)
                                    ? 'text-success'
                                    : ''
                                }
                              >
                                Special characters
                              </li>
                              <li
                                className={
                                  passwordData.newPassword.length >= 8 ? 'text-success' : ''
                                }
                              >
                                At least 8 characters
                              </li>
                            </ul>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Confirm Password */}
                    <div className="space-y-2">
                      <label className="block text-sm font-medium mb-1 text-light-text dark:text-dark-text">
                        Confirm Password
                      </label>
                      <div className="relative">
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          name="confirmPassword"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                          className={`w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border ${
                            passwordError
                              ? 'border-danger'
                              : 'border-light-border dark:border-dark-border'
                          } rounded-lg focus:outline-none focus:ring-2 ${
                            passwordError ? 'focus:ring-danger' : 'focus:ring-primary'
                          } focus:border-transparent transition text-light-text dark:text-dark-text pr-10`}
                          placeholder="Confirm new password"
                          required
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-light-text dark:text-dark-text opacity-70 hover:opacity-100 focus:outline-none transition"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                        </button>
                      </div>
                      {passwordError && (
                        <p className="mt-1 text-sm text-danger flex items-center gap-1">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-4 w-4"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                          </svg>
                          {passwordError}
                        </p>
                      )}

                      {passwordData.confirmPassword &&
                        passwordData.newPassword === passwordData.confirmPassword && (
                          <p className="mt-1 text-sm text-success flex items-center gap-1">
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-4 w-4"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Passwords match
                          </p>
                        )}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-4 border-t border-light-border dark:border-dark-border">
                    <button
                      type="submit"
                      disabled={passwordLoading}
                      className={`flex items-center justify-center gap-2 px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg font-medium shadow-lg focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-light-bg dark:focus:ring-offset-dark-bg transition ${
                        passwordLoading ? 'opacity-50 cursor-not-allowed' : ''
                      }`}
                    >
                      {passwordLoading ? (
                        <>
                          <Loader2 size={18} className="animate-spin" />
                          <span>Updating...</span>
                        </>
                      ) : (
                        <>
                          <Lock size={18} />
                          <span>Update Password</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {activeTab === 'attendance-settings' && <AdminAttendanceSettings />}

            {activeTab === 'payslip-settings' && (
              <div className="bg-light-card dark:bg-dark-card p-8 rounded-xl border border-light-border dark:border-dark-border shadow-lg">
                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-primary/20 rounded-lg">
                    <BadgeDollarSign className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
                      Payslip Branding and Template
                    </h2>
                    <p className="text-light-text dark:text-dark-text opacity-70 text-sm mt-1">
                      Update payslip layout, logo, signature, and color structure.
                    </p>
                  </div>
                </div>

                <form onSubmit={updatePayslipSettings} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <input
                      className="w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
                      placeholder="Company Name"
                      value={payslipSettings.companyName}
                      onChange={event =>
                        setPayslipSettings(previous => ({
                          ...previous,
                          companyName: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
                      placeholder="Company Email"
                      value={payslipSettings.companyEmail}
                      onChange={event =>
                        setPayslipSettings(previous => ({
                          ...previous,
                          companyEmail: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
                      placeholder="Company Phone"
                      value={payslipSettings.companyPhone}
                      onChange={event =>
                        setPayslipSettings(previous => ({
                          ...previous,
                          companyPhone: event.target.value,
                        }))
                      }
                    />
                    <input
                      className="w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
                      placeholder="Company Address"
                      value={payslipSettings.companyAddress}
                      onChange={event =>
                        setPayslipSettings(previous => ({
                          ...previous,
                          companyAddress: event.target.value,
                        }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm mb-2">Primary Color</label>
                      <input
                        type="color"
                        value={payslipSettings.primaryColor}
                        onChange={event =>
                          setPayslipSettings(previous => ({
                            ...previous,
                            primaryColor: event.target.value,
                          }))
                        }
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Secondary Color</label>
                      <input
                        type="color"
                        value={payslipSettings.secondaryColor}
                        onChange={event =>
                          setPayslipSettings(previous => ({
                            ...previous,
                            secondaryColor: event.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm mb-2">Company Logo</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={event => handleImageUpload(event, 'logoData')}
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">Authorized Signature</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={event => handleImageUpload(event, 'signatureData')}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Payslip Template</label>
                    <select
                      value={payslipSettings.activeTemplateId}
                      onChange={event =>
                        setPayslipSettings(previous => ({
                          ...previous,
                          activeTemplateId: event.target.value,
                        }))
                      }
                      className="w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
                    >
                      {payslipSettings.templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} - {template.description}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm mb-2">Footer Note</label>
                    <textarea
                      value={payslipSettings.footerNote}
                      onChange={event =>
                        setPayslipSettings(previous => ({
                          ...previous,
                          footerNote: event.target.value,
                        }))
                      }
                      className="w-full py-3 px-4 bg-light-bg dark:bg-dark-bg border border-light-border dark:border-dark-border rounded-lg"
                      rows={3}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={payslipLoading}
                    className="px-6 py-3 bg-primary hover:bg-primary-dark text-white rounded-lg"
                  >
                    {payslipLoading ? 'Saving...' : 'Save Payslip Settings'}
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>
      <ToastContainer
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
      />
    </div>
  );
};

export default AdminSettings;
