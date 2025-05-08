import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();

  const validateEmail = value => {
    if (!value) {
      return 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value)) {
      return 'Invalid email address';
    }
    return null;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    const emailError = validateEmail(email);

    if (emailError) {
      setErrors({ email: emailError });
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      if (response.ok) {
        toast.success('OTP sent successfully! Redirecting to verification...');
        setTimeout(() => {
          navigate('/verify-otp', { state: { email } });
        }, 1500); // Navigate after a delay to allow the toast to display
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to send OTP');
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
        <h2 className="text-3xl font-extrabold text-center text-yellow-500 mb-6">
          Forgot Password
        </h2>
        <p className="text-center text-gray-400 mb-4">
          Enter your email to receive an OTP for password reset.
        </p>

        {/* Email Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
          <input
            type="email"
            name="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className={`w-full px-4 py-2 border ${
              errors.email ? 'border-red-500' : 'border-gray-700'
            } rounded-md bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none`}
            placeholder="Enter your email"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-sm text-red-500">{errors.email}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 rounded-md transition-colors font-semibold text-black bg-yellow-500 hover:bg-yellow-600 ${
            isLoading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {isLoading ? 'Sending...' : 'Send OTP'}
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

export default ForgotPassword;
