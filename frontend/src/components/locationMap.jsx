import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';

const LocationMap = ({
  checkInLocation,
  checkOutLocation,
  checkInTime,
  checkOutTime,
  // isLocationPermissionGranted,
  // requestLocation,
  // deviceLocation,
}) => {
  const [mapStyle, setMapStyle] = useState('standard');

  const mapStyles = {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'Standard',
    },
  };

  const createCustomIcon = color => {
    return L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  };

  const checkInIcon = createCustomIcon('#10b981'); // emerald-500
  const checkOutIcon = createCustomIcon('#ef4444'); // red-500

  const getDefaultCenter = () => {
    if (checkInLocation.latitude && checkInLocation.longitude) {
      return [checkInLocation.latitude, checkInLocation.longitude];
    }
    if (checkOutLocation.latitude && checkOutLocation.longitude) {
      return [checkOutLocation.latitude, checkOutLocation.longitude];
    }
    return [51.505, -0.09]; // Default: London
  };

  return (
    <div className="bg-gray-800/50 rounded-2xl p-6 backdrop-blur-sm ring-1 ring-white/10 relative">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-200">Location Map</h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">Map style:</span>
          <select
            value={mapStyle}
            onChange={e => setMapStyle(e.target.value)}
            className="bg-gray-700/50 text-gray-200 text-sm rounded-md px-2 py-1 border-none focus:ring-1 focus:ring-indigo-500"
          >
            {Object.entries(mapStyles).map(([key, style]) => (
              <option key={key} value={key}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <MapContainer
        center={getDefaultCenter()}
        zoom={13}
        style={{ height: '400px', width: '100%' }}
        className="rounded-xl overflow-hidden"
        attributionControl={true}
      >
        <TileLayer
          url={mapStyles[mapStyle].url}
          attribution={mapStyles[mapStyle].attribution}
          maxZoom={20}
          minZoom={2}
        />

        {checkInLocation.latitude && checkInLocation.longitude && (
          <Marker
            position={[checkInLocation.latitude, checkInLocation.longitude]}
            icon={checkInIcon}
          >
            <Popup>Check-in: {checkInTime ? new Date(checkInTime).toLocaleString() : 'N/A'}</Popup>
          </Marker>
        )}
        {checkOutLocation.latitude && checkOutLocation.longitude && (
          <Marker
            position={[checkOutLocation.latitude, checkOutLocation.longitude]}
            icon={checkOutIcon}
          >
            <Popup>
              Check-out: {checkOutTime ? new Date(checkOutTime).toLocaleString() : 'N/A'}
            </Popup>
          </Marker>
        )}

        <FullscreenControl position="topright" />
      </MapContainer>
    </div>
  );
};

export default LocationMap;
