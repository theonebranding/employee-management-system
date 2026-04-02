import React from 'react';

import LocationMap from '../locationMap';

const LocationModal = ({
  open,
  onClose,
  selectedLocation,
  locationType,
  checkInTime = null,
  checkOutTime = null,
}) => {
  if (!open || !selectedLocation) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-light-bg dark:bg-dark-bg rounded-2xl p-6 w-full max-w-3xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
            {locationType === 'checkIn' ? 'Check-in' : 'Check-out'} Location
          </h2>
          <button
            onClick={onClose}
            className="text-light-text dark:text-dark-text opacity-70 hover:text-primary"
            aria-label="Close map modal"
          >
            ✕
          </button>
        </div>
        <LocationMap
          checkInLocation={locationType === 'checkIn' ? selectedLocation : {}}
          checkOutLocation={locationType === 'checkOut' ? selectedLocation : {}}
          isLocationPermissionGranted={true}
          requestLocation={() => {}}
          checkInTime={checkInTime}
          checkOutTime={checkOutTime}
          deviceLocation={{}}
        />
      </div>
    </div>
  );
};

export default LocationModal;
