// components/LocationMap.jsx
import 'leaflet/dist/leaflet.css';

import L from 'leaflet';
import { Locate, Route } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from 'react-leaflet';
import { FullscreenControl } from 'react-leaflet-fullscreen';

// Custom map controller
const MapController = ({
  manualCenter,
  manualZoom,
  showRoute,
  checkInLocation,
  checkOutLocation,
}) => {
  const map = useMap();

  useEffect(() => {
    if (manualCenter && manualZoom !== undefined) {
      map.setView(manualCenter, manualZoom, { animate: true });
    }
  }, [map, manualCenter, manualZoom]);

  useEffect(() => {
    if (showRoute && checkInLocation.latitude && checkOutLocation.latitude) {
      const bounds = L.latLngBounds(
        [checkInLocation.latitude, checkInLocation.longitude],
        [checkOutLocation.latitude, checkOutLocation.longitude]
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, showRoute, checkInLocation, checkOutLocation]);

  useEffect(() => {
    map.options.maxZoom = 20;
    map.options.minZoom = 2;
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
  }, [map]);

  return null;
};

// Custom hook for map styles
const useMapStyles = () => {
  const mapStyles = {
    standard: {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      attribution:
        '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      name: 'Standard',
    },
  };
  return mapStyles;
};

const LocationMap = ({
  isLocationPermissionGranted,
  requestLocation,
  checkInTime,
  checkOutTime,
  checkInLocation,
  checkOutLocation,
  deviceLocation,
}) => {
  const [activeView, setActiveView] = useState('all');
  const [showDistanceInfo, setShowDistanceInfo] = useState(false);
  const [showRoute, setShowRoute] = useState(false);
  const [mapStyle, setMapStyle] = useState('standard');
  const [manualCenter, setManualCenter] = useState(null);
  const [manualZoom, setManualZoom] = useState(13);

  const mapStyles = useMapStyles('standard');

  const createCustomIcon = useCallback(color => {
    return L.divIcon({
      className: 'custom-marker-icon',
      html: `<div style="background-color: ${color}; width: 16px; height: 16px; border-radius: 50%; border: 2px solid white; box-shadow: 0 0 4px rgba(0,0,0,0.5);"></div>`,
      iconSize: [16, 16],
      iconAnchor: [8, 8],
      popupAnchor: [0, -8],
    });
  }, []);

  const checkInIcon = createCustomIcon('#22c55e'); // success
  const checkOutIcon = createCustomIcon('#ef4444'); // danger
  const currentLocationIcon = createCustomIcon('#0ea5e9'); // info

  const calculateDistance = useCallback(() => {
    if (!checkInLocation.latitude || !checkOutLocation.latitude) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (checkOutLocation.latitude - checkInLocation.latitude) * (Math.PI / 180);
    const dLon = (checkOutLocation.longitude - checkInLocation.longitude) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(checkInLocation.latitude * (Math.PI / 180)) *
        Math.cos(checkOutLocation.latitude * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;

    return distance < 1 ? `${(distance * 1000).toFixed(0)} meters` : `${distance.toFixed(2)} km`;
  }, [checkInLocation, checkOutLocation]);

  const centerOnCurrentLocation = () => {
    requestLocation();
    if (deviceLocation.latitude && deviceLocation.longitude) {
      setManualCenter([deviceLocation.latitude, deviceLocation.longitude]);
      setManualZoom(16);
    }
  };

  const getDefaultCenter = () => {
    if (deviceLocation.latitude && deviceLocation.longitude) {
      return [deviceLocation.latitude, deviceLocation.longitude];
    }
    if (checkInLocation.latitude && checkInLocation.longitude) {
      return [checkInLocation.latitude, checkInLocation.longitude];
    }
    if (checkOutLocation.latitude && checkOutLocation.longitude) {
      return [checkOutLocation.latitude, checkOutLocation.longitude];
    }
    return [51.505, -0.09]; // Default: London
  };

  return (
    <div className="bg-light-card dark:bg-dark-card rounded-2xl p-6 shadow-card ring-1 ring-light-border dark:ring-dark-border relative">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
        <h3 className="text-lg font-semibold text-light-text dark:text-dark-text">
          Location Tracking
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-light-text dark:text-dark-text">Map style:</span>
          <select
            value={mapStyle}
            onChange={e => setMapStyle(e.target.value)}
            className="bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text text-sm rounded-md px-2 py-1 border-none focus:ring-1 focus:ring-primary"
          >
            {Object.entries(mapStyles).map(([key, style]) => (
              <option key={key} value={key}>
                {style.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center mb-4 gap-2">
        <button
          onClick={() => setActiveView('checkIn')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
            activeView === 'checkIn'
              ? 'bg-success/20 text-success ring-1 ring-success/50'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card'
          } transition`}
        >
          <span className="w-2 h-2 bg-success rounded-full"></span>
          Check-in
        </button>
        <button
          onClick={() => setActiveView('checkOut')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
            activeView === 'checkOut'
              ? 'bg-danger/20 text-danger ring-1 ring-danger/50'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card'
          } transition`}
        >
          <span className="w-2 h-2 bg-danger rounded-full"></span>
          Check-out
        </button>
        <button
          onClick={() => setActiveView('all')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
            activeView === 'all'
              ? 'bg-primary/20 text-primary ring-1 ring-primary/50'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card'
          } transition`}
        >
          All points
        </button>
        <button
          onClick={() => setActiveView('current')}
          className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
            activeView === 'current'
              ? 'bg-info/20 text-info ring-1 ring-info/50'
              : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text hover:bg-light-card dark:hover:bg-dark-card'
          } transition`}
        >
          <span className="w-2 h-2 bg-info rounded-full"></span>
          Current
        </button>
      </div>

      {checkInLocation.latitude && checkOutLocation.latitude && (
        <div className="flex flex-wrap gap-2 mb-4">
          <button
            onClick={() => setShowRoute(!showRoute)}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
              showRoute
                ? 'bg-secondary/20 text-secondary ring-1 ring-secondary/30'
                : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text'
            } transition`}
          >
            <Route className="text-lg" />
            {showRoute ? 'Hide Route' : 'Show Route'}
          </button>
          <button
            onClick={() => setShowDistanceInfo(!showDistanceInfo)}
            className={`px-3 py-1.5 text-sm rounded-lg flex items-center gap-1 ${
              showDistanceInfo
                ? 'bg-warning/20 text-warning ring-1 ring-warning/30'
                : 'bg-light-bg dark:bg-dark-bg text-light-text dark:text-dark-text'
            } transition`}
          >
            {showDistanceInfo ? 'Hide Distance' : 'Show Distance'}
          </button>
        </div>
      )}

      {showDistanceInfo && checkInLocation.latitude && checkOutLocation.latitude && (
        <div className="bg-light-card dark:bg-dark-card p-3 rounded-lg mb-4 text-sm shadow-card">
          <p className="text-light-text dark:text-dark-text">
            <span className="font-medium">Distance:</span>{' '}
            <span className="text-warning">{calculateDistance()}</span>
          </p>
          {checkInTime && checkOutTime && (
            <p className="text-light-text dark:text-dark-text">
              <span className="font-medium">Duration:</span>{' '}
              <span className="text-warning">
                {(() => {
                  const duration = new Date(checkOutTime) - new Date(checkInTime);
                  const hours = Math.floor(duration / (1000 * 60 * 60));
                  const minutes = Math.floor((duration % (1000 * 60 * 60)) / (1000 * 60));
                  return `${hours}h ${minutes}m`;
                })()}
              </span>
            </p>
          )}
        </div>
      )}

      {!isLocationPermissionGranted ? (
        <div className="text-center py-12 bg-light-bg dark:bg-dark-bg rounded-xl">
          <p className="text-light-text dark:text-dark-text mb-4">
            Location permission required to use this feature
          </p>
          <button
            onClick={requestLocation}
            className="px-4 py-2 bg-primary/10 text-primary ring-1 ring-primary/50 rounded-lg hover:bg-primary/20 transition"
          >
            Grant Location Access
          </button>
        </div>
      ) : (
        <div className="relative">
          <div className="bg-light-card dark:bg-dark-card p-3 rounded-lg absolute top-4 left-4 z-[1000] text-sm text-light-text dark:text-dark-text shadow-card">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-success rounded-full" />
                <span>Check-in</span>
                <span className="text-gray-400 text-xs">
                  {checkInTime
                    ? new Date(checkInTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Yet to be done'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-danger rounded-full" />
                <span>Check-out</span>
                <span className="text-gray-400 text-xs">
                  {checkOutTime
                    ? new Date(checkOutTime).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'Yet to be done'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 bg-info rounded-full" />
                <span>Current</span>
              </div>
            </div>
          </div>

          <button
            onClick={centerOnCurrentLocation}
            className="absolute bottom-8 right-4 z-[1000] bg-light-card dark:bg-dark-card text-info p-2 rounded-full shadow-card hover:bg-info/10 transition"
            title="Center on my location"
          >
            <Locate size={22} />
          </button>

          <MapContainer
            center={getDefaultCenter()}
            zoom={13}
            style={{ height: '60vh', width: '100%' }}
            className="rounded-xl overflow-hidden"
            attributionControl={true}
          >
            <TileLayer
              url={mapStyles[mapStyle].url}
              attribution={mapStyles[mapStyle].attribution}
              maxZoom={20}
              minZoom={2}
            />

            {(activeView === 'checkIn' || activeView === 'all') && checkInLocation.latitude && (
              <Marker
                position={[checkInLocation.latitude, checkInLocation.longitude]}
                icon={checkInIcon}
              >
                <Popup>Check-in: {new Date(checkInTime).toLocaleString()}</Popup>
              </Marker>
            )}
            {(activeView === 'checkOut' || activeView === 'all') && checkOutLocation.latitude && (
              <Marker
                position={[checkOutLocation.latitude, checkOutLocation.longitude]}
                icon={checkOutIcon}
              >
                <Popup>Check-out: {new Date(checkOutTime).toLocaleString()}</Popup>
              </Marker>
            )}
            {(activeView === 'current' || activeView === 'all') && deviceLocation.latitude && (
              <Marker
                position={[deviceLocation.latitude, deviceLocation.longitude]}
                icon={currentLocationIcon}
              >
                <Popup>Your Current Location</Popup>
              </Marker>
            )}

            {showRoute && checkInLocation.latitude && checkOutLocation.latitude && (
              <Polyline
                positions={[
                  [checkInLocation.latitude, checkInLocation.longitude],
                  [checkOutLocation.latitude, checkOutLocation.longitude],
                ]}
                color="#8b5cf6" // secondary
                weight={4}
                opacity={0.7}
              />
            )}

            <FullscreenControl position="topright" />
            <MapController
              manualCenter={manualCenter}
              manualZoom={manualZoom}
              showRoute={showRoute}
              checkInLocation={checkInLocation}
              checkOutLocation={checkOutLocation}
            />
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default LocationMap;
