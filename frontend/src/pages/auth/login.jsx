import 'react-toastify/dist/ReactToastify.css';

import { Moon, Sun } from 'lucide-react';
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

import { useAuth } from '../../context/authContext';
import { useLocation } from '../../context/locationContext';
import { useTheme } from '../../context/themeContext';

const Login = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [initialDelay, setInitialDelay] = useState(true);
  const navigate = useNavigate();
  const { login } = useAuth();
  const {
    isLocationPermissionGranted,
    loading: locationLoading,
    location,
    locationAttempts,
    locationResolved,
  } = useLocation();
  const { theme, toggleTheme } = useTheme();

  // Initial delay to fetch location
  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialDelay(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const validateForm = () => {
    const newErrors = {};
    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    if (!formData.password) {
      newErrors.password = 'Password is required';
    }
    return newErrors;
  };

  const handleSubmit = async e => {
    e.preventDefault();

    if (!isLocationPermissionGranted || !location.latitude || !location.longitude) {
      toast.error('Cannot login without location access. Please enable location services.');
      return;
    }

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
        body: JSON.stringify(formData),
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

  // After max attempts or if we get a good location, or if initial delay ends
  const shouldShowLoginForm = !initialDelay && (locationResolved || locationAttempts >= 2);

  // Show loading screen while getting location
  if (!shouldShowLoginForm) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
        <div className="text-center">
          <div className="mb-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary mx-auto"></div>
          </div>
          <p className="text-lg font-semibold text-light-text dark:text-dark-text">
            {locationAttempts === 0
              ? 'Initializing location services...'
              : locationAttempts === 1
                ? 'Getting your location...'
                : 'Improving location accuracy...'}
          </p>
          <p className="mt-2 text-sm text-light-text dark:text-dark-text opacity-70">
            Please wait while we retrieve your precise location (Attempt {locationAttempts}/2)
          </p>
        </div>
      </div>
    );
  }

  // Show permission denied message if explicitly denied
  if (
    isLocationPermissionGranted === false ||
    (!location?.latitude && !locationLoading && locationResolved)
  ) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
        <div className="text-center">
          <p className="text-lg font-semibold text-danger">Location Access Required</p>
          <p className="mt-2 text-sm text-light-text dark:text-dark-text opacity-70">
            We couldn't fetch your location. Please enable location services in your browser
            settings and refresh the page.
          </p>
        </div>
      </div>
    );
  }

  // Show login form when location is resolved or max attempts reached
  return (
    <div className="relative flex items-center justify-center min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <button
        onClick={toggleTheme}
        className="absolute top-4 left-4 p-2 rounded-full bg-light-card dark:bg-dark-card text-light-text dark:text-dark-text hover:bg-primary hover:text-white transition-colors"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
      </button>

      {location?.accuracy && (
        <div className="absolute top-4 right-4 bg-light-card dark:bg-dark-card rounded-md px-3 py-1 text-xs text-light-text dark:text-dark-text opacity-70 ring-1 ring-light-border dark:ring-dark-border">
          Location accuracy: {Math.round(location.accuracy)}m
        </div>
      )}

      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md bg-light-card dark:bg-dark-card rounded-lg shadow-card p-8 ring-1 ring-light-border dark:ring-dark-border"
      >
        <h2 className="text-3xl font-extrabold text-center text-primary mb-6">Welcome Back</h2>

        {errors.apiError && <p className="text-danger text-center mb-4">{errors.apiError}</p>}

        <div className="mb-6">
          <label className="block text-sm font-medium text-light-text dark:text-dark-text mb-2">
            Email
          </label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={`w-full px-4 py-2 border ${
              errors.email ? 'border-danger' : 'border-light-border dark:border-dark-border'
            } rounded-md bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text placeholder-opacity-50 dark:placeholder-dark-text focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
            placeholder="Enter your email"
            autoComplete="email"
          />
          {errors.email && <p className="mt-1 text-sm text-danger">{errors.email}</p>}
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
            } rounded-md bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text placeholder-light-text placeholder-opacity-50 dark:placeholder-dark-text focus:ring-2 focus:ring-primary focus:border-primary transition-all`}
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

        <p className="mt-6 text-center text-sm text-light-text dark:text-dark-text opacity-70">
          Don't have an account?{' '}
          <a href="/signup" className="text-primary hover:underline font-medium">
            Sign Up
          </a>
        </p>
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
