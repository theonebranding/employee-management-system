import 'react-toastify/dist/ReactToastify.css';

import { Moon, Sun } from 'lucide-react';
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import { useAuth } from '../../context/authContext';
import { useTheme } from '../../context/themeContext';

const Login = () => {
  const [formData, setFormData] = useState({
    identifier: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const validateForm = () => {
    const newErrors = {};
    if (!formData.identifier) {
      newErrors.identifier = 'Email or employee ID is required';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    return newErrors;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setErrors({});
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identifier: formData.identifier,
          password: formData.password,
        }),
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        login(result.token, result.role, result._id, result.email);
        toast.success('Login successful! Redirecting to dashboard...');
        if (result.role === 'admin') {
          setTimeout(() => {
            navigate('/admin/dashboard/attendance');
          }, 1000);
        } else if (result.role === 'employee') {
          setTimeout(() => {
            navigate('/employee/dashboard/attendance');
          }, 1000);
        }
      } else {
        const errorData = await response.json();
        setErrors({ apiError: errorData.message || 'Invalid credentials' });
        toast.error(errorData.message || 'Invalid credentials');
      }
    } catch (error) {
      setErrors({ apiError: 'Network error. Please try again later.' });
      toast.error('Network error. Please try again later.', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleChange = e => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="relative flex min-h-screen items-center justify-center sm:justify-end pr-4 sm:pr-8 md:pr-16 lg:pr-24 overflow-hidden bg-light-bg transition-colors duration-300 dark:bg-dark-bg">
      {/* CSS Animations */}
      <style>{`
        @keyframes floatUp {
          0%, 100% { transform: translateY(0px) scale(1); }
          50% { transform: translateY(-20px) scale(1.02); }
        }
        @keyframes ringPulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99,102,241,0.25), 0 0 40px rgba(99,102,241,0.1); }
          50% { box-shadow: 0 0 0 12px rgba(99,102,241,0), 0 0 60px rgba(99,102,241,0.15); }
        }
        @keyframes fadeSlideIn {
          0% { opacity: 0; transform: translateX(-20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes fadeSlideInRight {
          0% { opacity: 0; transform: translateX(20px); }
          100% { opacity: 1; transform: translateX(0); }
        }
        @keyframes scaleIn {
          0% { opacity: 0; transform: scale(0.5); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes drift {
          0%, 100% { transform: translateX(0) rotate(-12deg); }
          50% { transform: translateX(10px) rotate(-10deg); }
        }
        @keyframes driftReverse {
          0%, 100% { transform: translateX(0) rotate(12deg); }
          50% { transform: translateX(-10px) rotate(14deg); }
        }
        .digol-float { animation: floatUp 6s ease-in-out infinite; }
        .digol-ring { animation: ringPulse 3s ease-in-out infinite; }
        .digol-left { animation: fadeSlideIn 1s ease-out 0.3s both; }
        .digol-right { animation: fadeSlideInRight 1s ease-out 0.3s both; }
        .digol-o { animation: scaleIn 0.8s ease-out both; }
        .digol-drift { animation: drift 10s ease-in-out infinite; }
        .digol-drift-reverse { animation: driftReverse 10s ease-in-out infinite; }
      `}</style>

      {/* Background gradients */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.22),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_70%_85%,rgba(139,92,246,0.18),transparent_32%)] dark:bg-[radial-gradient(circle_at_15%_20%,rgba(99,102,241,0.28),transparent_30%),radial-gradient(circle_at_85%_15%,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_70%_85%,rgba(139,92,246,0.22),transparent_32%)]" />
        <div className="absolute inset-0 opacity-[0.12] dark:opacity-[0.08] bg-[linear-gradient(90deg,rgba(99,102,241,0.35)_1px,transparent_1px),linear-gradient(rgba(99,102,241,0.35)_1px,transparent_1px)] bg-[size:44px_44px]" />
      </div>

      {/* Main "digol" branding - large, visible, animated */}
      <div className="digol-float pointer-events-none absolute inset-0 flex items-center justify-center sm:justify-start pl-4 sm:pl-8 md:pl-16 lg:pl-24">
        <div className="flex items-center select-none">
          {/* "dig" slides in from left */}
          <span className="digol-left text-[5.5rem] sm:text-[7.5rem] md:text-[9.5rem] lg:text-[10.5rem] xl:text-[12rem] font-black tracking-wide text-primary/20 dark:text-primary-light/25">
            Dig
          </span>
          {/* "o" replaced by just a ring circle - no letter visible */}
          <span className="digol-o relative inline-flex items-center justify-center text-[5.5rem] sm:text-[7.5rem] md:text-[9.5rem] lg:text-[10.5rem] xl:text-[12rem]">
            <span className="digol-ring inline-block h-[0.55em] w-[0.55em] rounded-full border-4 sm:border-[6px] md:border-8 lg:border-[10px] border-primary/30 dark:border-primary-light/35"></span>
          </span>
          {/* "l" slides in from right */}
          <span className="digol-right text-[5.5rem] sm:text-[7.5rem] md:text-[9.5rem] lg:text-[10.5rem] xl:text-[12rem] font-black tracking-wide text-primary/20 dark:text-primary-light/25">
            l
          </span>
        </div>
      </div>

      {/* Floating watermark texts */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="digol-drift absolute -left-6 top-[14%] text-6xl sm:text-7xl font-extrabold tracking-widest text-primary/10 dark:text-primary-light/12">
          Digol
        </div>
        <div className="digol-drift-reverse absolute -right-4 bottom-[16%] text-6xl sm:text-7xl font-extrabold tracking-widest text-secondary/10 dark:text-secondary-light/12">
          Digol
        </div>
      </div>

      {/* Theme toggle */}
      <button
        onClick={toggleTheme}
        className="absolute left-4 top-4 z-20 rounded-full bg-light-card/80 p-2 text-light-text shadow-card ring-1 ring-light-border transition-colors hover:bg-primary hover:text-white dark:bg-dark-card/80 dark:text-dark-text dark:ring-dark-border"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {/* Login form - transparent so digol is visible through it */}
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-white/20 bg-white/5 p-8 shadow-xl dark:border-white/10 dark:bg-white/[0.02]"
      >
        <h2 className="text-3xl font-extrabold text-center text-primary mb-6">Welcome Back</h2>

        {errors.apiError && <p className="text-danger text-center mb-4">{errors.apiError}</p>}

        <div className="mb-6">
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
            Email or Employee ID
          </label>
          <input
            type="text"
            name="identifier"
            value={formData.identifier}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${
              errors.identifier ? 'border-danger' : 'border-light-border dark:border-dark-border'
            } rounded-md bg-light-bg/80 dark:bg-dark-bg/80 text-light-text dark:text-dark-text placeholder-light-text placeholder-opacity-50 dark:placeholder-dark-text focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
            placeholder="Enter your email or employee ID"
            autoComplete="username"
          />
          {errors.identifier && <p className="mt-1 text-sm text-danger">{errors.identifier}</p>}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
            Password
          </label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${
              errors.password ? 'border-danger' : 'border-light-border dark:border-dark-border'
            } rounded-md bg-light-bg/80 dark:bg-dark-bg/80 text-light-text dark:text-dark-text placeholder-light-text placeholder-opacity-50 dark:placeholder-dark-text focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
            placeholder="Enter your password"
            autoComplete="current-password"
          />
          {errors.password && <p className="mt-1 text-sm text-danger">{errors.password}</p>}
        </div>

        <div className="text-right mb-6">
          <a href="/forgot-password" className="text-sm text-primary hover:underline">
            Forgot Password?
          </a>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className={`w-full py-3 bg-primary text-white font-semibold rounded-md hover:bg-primary-dark focus:ring-2 focus:ring-primary-light transition-all ${
            isLoading ? 'cursor-not-allowed opacity-50' : ''
          }`}
        >
          {isLoading ? 'Logging in...' : 'Log In'}
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

export default Login;
