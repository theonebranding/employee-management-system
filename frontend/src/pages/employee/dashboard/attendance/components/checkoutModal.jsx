// components/CheckoutModal.jsx
import { X } from 'lucide-react';
import React from 'react';

const CheckoutModal = ({ showModal, setShowModal, loading, onSubmit }) => {
  if (!showModal) return null;

  return (
    <div className="fixed min-h-full inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-light-card dark:bg-dark-card rounded-2xl p-6 w-full max-w-lg mx-4 border border-light-border dark:border-dark-border shadow-card">
        <button
          onClick={() => setShowModal(false)}
          className="absolute top-4 right-4 text-light-text dark:text-dark-text hover:text-primary"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-5">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text mb-2">
            Checkout
          </h2>
          <p className="text-light-text dark:text-dark-text opacity-70 text-sm">
            Confirm checkout for today. Daily report can be managed from the Daily Report button.
          </p>
        </div>

        <div className="flex gap-4">
          <button
            onClick={() => setShowModal(false)}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text rounded-xl hover:bg-light-card dark:hover:bg-dark-card transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              const isSuccessful = await onSubmit();
              if (isSuccessful) {
                setShowModal(false);
              }
            }}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-danger text-white rounded-xl hover:bg-danger-dark transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? 'Submitting...' : 'Submit & Checkout'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
