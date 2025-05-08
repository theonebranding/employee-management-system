import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

const VerifyOTP = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email; // Retrieve email from the previous step

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validateField = (field, value) => {
    const newErrors = { ...errors };

    switch (field) {
      case 'otp':
        if (!value) {
          newErrors.otp = 'OTP is required';
        } else if (!/^\d{6}$/.test(value)) {
          newErrors.otp = 'OTP must be a 6-digit number';
        } else {
          delete newErrors.otp;
        }
        break;

      default:
        break;
    }

    setErrors(newErrors);
  };

  const handleChange = e => {
    const { name, value } = e.target;
    setOtp(value);
    validateField(name, value);
  };

  const handleSubmit = async e => {
    e.preventDefault();

    // Validate OTP
    validateField('otp', otp);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, otp }),
      });

      if (response.ok) {
        toast.success('OTP verified successfully! Redirecting to reset password...');
        setTimeout(() => {
          navigate('/reset-password', { state: { email } });
        }, 1500);
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Invalid OTP');
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
        <h2 className="text-3xl font-extrabold text-center text-yellow-500 mb-6">Verify OTP</h2>
        <p className="text-center text-gray-400 mb-4">
          Enter the OTP sent to <strong className="text-yellow-500">{email}</strong> for password
          reset
        </p>

        {/* OTP Input */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-300 mb-2">OTP</label>
          <input
            type="text"
            name="otp"
            value={otp}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${
              errors.otp ? 'border-red-500' : 'border-gray-700'
            } rounded-md bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none`}
            placeholder="Enter 6-digit OTP"
          />
          {errors.otp && <p className="mt-1 text-sm text-red-500">{errors.otp}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-md transition-colors font-semibold text-black bg-yellow-500 hover:bg-yellow-600 ${
            isLoading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {isLoading ? 'Verifying...' : 'Verify OTP'}
        </button>
      </form>

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

export default VerifyOTP;
