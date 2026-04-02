import React from 'react';

import LocationModal from '../../../../../components/location/locationModal';

const MapModal = ({
  showMapModal,
  setShowMapModal,
  selectedLocation,
  locationType,
  selectedRecord,
}) => {
  return (
    <LocationModal
      open={showMapModal}
      onClose={() => setShowMapModal(false)}
      selectedLocation={selectedLocation}
      locationType={locationType}
      checkInTime={locationType === 'checkIn' ? selectedRecord?.checkInTime : null}
      checkOutTime={locationType === 'checkOut' ? selectedRecord?.checkOutTime : null}
    />
  );
};

export default MapModal;
