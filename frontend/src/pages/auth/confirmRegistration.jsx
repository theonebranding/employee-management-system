import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';

const ConfirmRegistration = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async e => {
    e.preventDefault();

    if (!otp) {
      toast.error('OTP is required');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_BACKEND_URL}/auth/confirm-registration`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email, otp }),
        }
      );

      if (response.ok) {
        toast.success('OTP verified successfully! Please login to continue.');
        navigate('/login');
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
          An OTP has been sent to <strong className="text-yellow-500">{email}</strong>
        </p>

        {/* OTP Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-300 mb-2">OTP</label>
          <input
            type="text"
            name="otp"
            value={otp}
            onChange={e => setOtp(e.target.value)}
            className="w-full px-4 py-2 border border-gray-700 rounded-md bg-gray-800 text-white placeholder-gray-500 focus:ring-2 focus:ring-yellow-500 focus:outline-none"
            placeholder="Enter OTP"
          />
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
        theme="dark"
        position="top-right"
        pauseOnHover={false}
        limit={1}
        autoClose={2000}
      />
    </div>
  );
};

export default ConfirmRegistration;
