// components/CheckoutModal.jsx
import { X } from 'lucide-react';

const CheckoutModal = ({
  showModal,
  setShowModal,
  countdown,
  setCountdown,
  handleAttendanceAction,
}) =>
  showModal && (
    <div className="fixed min-h-full inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-light-card dark:bg-dark-card rounded-2xl p-6 w-full max-w-md mx-4 border border-light-border dark:border-dark-border shadow-card">
        <button
          onClick={() => {
            setShowModal(false);
            setCountdown(10);
          }}
          className="absolute top-4 right-4 text-light-text dark:text-dark-text hover:text-primary"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
            Confirm Checkout
          </h2>
          <p className="text-light-text dark:text-dark-text opacity-70">
            Automatic checkout in <span className="text-danger font-semibold">{countdown}</span>{' '}
            seconds.
            <br />
            Click cancel to stop.
          </p>
        </div>
        <div className="flex justify-center mb-6">
          <div className="relative w-20 h-20 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                className="text-gray-700"
                strokeWidth="4"
                stroke="currentColor"
                fill="transparent"
                r="36"
                cx="40"
                cy="40"
              />
              <circle
                className="text-danger"
                strokeWidth="4"
                strokeDasharray={226.2}
                strokeDashoffset={226.2 * (1 - countdown / 10)}
                strokeLinecap="round"
                stroke="currentColor"
                fill="transparent"
                r="36"
                cx="40"
                cy="40"
              />
            </svg>
            <span className="absolute text-2xl font-bold text-light-text dark:text-dark-text">
              {countdown}
            </span>
          </div>
        </div>
        <div className="flex gap-4">
          <button
            onClick={() => {
              setShowModal(false);
              setCountdown(10);
            }}
            className="flex-1 px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text rounded-xl hover:bg-light-card dark:hover:bg-dark-card transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              setShowModal(false);
              handleAttendanceAction('checkout');
            }}
            className="flex-1 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger-dark transition-colors"
          >
            Checkout Now
          </button>
        </div>
      </div>
    </div>
  );

export default CheckoutModal;
