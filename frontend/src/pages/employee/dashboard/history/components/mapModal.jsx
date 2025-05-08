import React from 'react';

import LocationMap from '../../../../../components/locationMap';

const MapModal = ({
  showMapModal,
  setShowMapModal,
  selectedLocation,
  locationType,
  filteredRecords,
}) => {
  if (!showMapModal || !selectedLocation) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 w-full max-w-3xl shadow-card ring-1 ring-light-border dark:ring-dark-border">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-light-text dark:text-dark-text">
            {locationType === 'checkIn' ? 'Check-in' : 'Check-out'} Location
          </h2>
          <button
            onClick={() => setShowMapModal(false)}
            className="text-light-text dark:text-dark-text hover:text-primary"
          >
            ✕
          </button>
        </div>
        <LocationMap
          checkInLocation={locationType === 'checkIn' ? selectedLocation : {}}
          checkOutLocation={locationType === 'checkOut' ? selectedLocation : {}}
          isLocationPermissionGranted={true}
          requestLocation={() => {}}
          checkInTime={
            locationType === 'checkIn'
              ? filteredRecords.find(r => r.checkInLocation === selectedLocation)?.checkInTime
              : null
          }
          checkOutTime={
            locationType === 'checkOut'
              ? filteredRecords.find(r => r.checkOutLocation === selectedLocation)?.checkOutTime
              : null
          }
          deviceLocation={{}}
        />
      </div>
    </div>
  );
};

export default MapModal;
