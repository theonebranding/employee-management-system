import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

const ResetPassword = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email || globalThis.sessionStorage.getItem('passwordResetEmail');
  const resetToken =
    location.state?.resetToken || globalThis.sessionStorage.getItem('passwordResetToken');

  const [formData, setFormData] = useState({
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  const validateField = (field, value) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'password':
        if (!value) {
          newErrors.password = 'Password is required';
        } else if (
          !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(value)
        ) {
          newErrors.password =
            'Password must be at least 8 characters, include uppercase, lowercase, number, and a symbol';
        } else {
          delete newErrors.password;
        }
        break;

      case 'confirmPassword':
        if (!value) {
          newErrors.confirmPassword = 'Confirm Password is required';
        } else if (value !== formData.password) {
          newErrors.confirmPassword = 'Passwords do not match';
        } else {
          delete newErrors.confirmPassword;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prevFormData => ({
      ...prevFormData,
      [name]: value,
    }));
    validateField(name, value);
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!email || !resetToken) {
      toast.error('Reset session expired. Please verify OTP again.');
      setTimeout(() => {
        navigate('/forgot-password');
      }, 1500);
      return;
    }

    Object.keys(formData).forEach(key => {
      validateField(key, formData[key]);
    });

    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password: formData.password, resetToken }),
      });

      if (response.ok) {
        globalThis.sessionStorage.removeItem('passwordResetEmail');
        globalThis.sessionStorage.removeItem('passwordResetToken');
        toast.success('Password reset successfully! Redirecting to login...');
        setTimeout(() => {
          navigate('/login');
        }, 1500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to reset password');
      }
    } catch (error) {
      console.error('An error occurred:', error);
      toast.error('Network error. Please try again later.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-black">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-gray-900 rounded-lg shadow-xl p-8"
      >
        <h2 className="text-3xl font-extrabold text-center text-yellow-500 mb-6">Reset Password</h2>
        <p className="text-center text-gray-400 mb-4">
          Resetting password for <strong className="text-yellow-500">{email}</strong>
        </p>

        {/* Password Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${
              errors.password ? 'border-red-500' : 'border-gray-700'
            } rounded-md bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none`}
            placeholder="Enter new password"
          />
          {errors.password && <p className="mt-1 text-sm text-red-500">{errors.password}</p>}
        </div>

        {/* Confirm Password Field */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">Confirm Password</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${
              errors.confirmPassword ? 'border-red-500' : 'border-gray-700'
            } rounded-md bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && (
            <p className="mt-1 text-sm text-red-500">{errors.confirmPassword}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-md transition-colors font-semibold text-black bg-yellow-500 hover:bg-yellow-600 ${
            isLoading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {isLoading ? 'Resetting...' : 'Reset Password'}
        </button>
      </form>

      <ToastContainer
        toastClassName="bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text ring-1 ring-light-border dark:ring-dark-border"
        theme="dark"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
      />
    </div>
  );
};

export default ResetPassword;
