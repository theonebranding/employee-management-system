/* global navigator*/
import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';

export const LocationContext = createContext();

export const LocationProvider = ({ children }) => {
  const [location, setLocation] = useState({ latitude: null, longitude: null });
  const [isLocationPermissionGranted, setIsLocationPermissionGranted] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locationError, setLocationError] = useState(null);
  const [locationAttempts, setLocationAttempts] = useState(0);
  const [bestLocation, setBestLocation] = useState(null);
  const [locationResolved, setLocationResolved] = useState(false);
  const watchIdRef = useRef(null);
  const MAX_ATTEMPTS = 5; // Maximum number of location attempts

  // Timeout with progressive backoff
  const getTimeoutValue = () => {
    // Start with 10 seconds, increase by 5 seconds per attempt (max 30 seconds)
    return Math.min(10000 + locationAttempts * 5000, 30000);
  };

  const handleLocationError = error => {
    console.error('Error getting location:', error);
    setLocationError(error);

    if (error.code === 1) {
      // Permission denied
      setIsLocationPermissionGranted(false);
      toast.error(
        'Location access denied. Please enable location services in your browser settings.'
      );
      setLoading(false);
      setLocationResolved(true);
    } else if (error.code === 2 || error.code === 3) {
      // Position unavailable or Timeout
      // toast.error(error.code === 2 ? "Location unavailable. Please ensure GPS is enabled." : "Location request timed out.");
      if (locationAttempts >= MAX_ATTEMPTS) {
        finalizeLocation();
      } else {
        // Retry after 2 seconds
        setTimeout(() => requestLocation(), 2000);
      }
    }
  };

  const finalizeLocation = () => {
    setLoading(false);
    setLocationResolved(true);
    if (bestLocation) {
      setLocation(bestLocation);
      // toast.info("Using best available location after maximum attempts.");
    } else {
      setLocation({
        latitude: null,
        longitude: null,
        usingFallback: true,
      });
      toast.error('Unable to get location after maximum attempts. Using default location.');
    }
    // Start watching location if permission is granted
    if (isLocationPermissionGranted) {
      startWatchingLocation();
    }
  };

  const requestLocation = () => {
    if (navigator.geolocation) {
      if (locationAttempts >= MAX_ATTEMPTS) {
        finalizeLocation();
        return;
      }

      setLoading(true);
      setLocationAttempts(prev => prev + 1);
      // console.log(`Location attempt ${locationAttempts + 1} of ${MAX_ATTEMPTS}`);

      // Clear any existing watch
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }

      navigator.geolocation.getCurrentPosition(
        position => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          // console.log("New location received:", newLocation);
          setLocation(newLocation);

          // Update best location if this is better
          if (!bestLocation || newLocation.accuracy < bestLocation.accuracy) {
            setBestLocation(newLocation);
          }

          setIsLocationPermissionGranted(true);
          setLocationError(null);

          // Stop if max attempts reached or accuracy is good enough
          if (locationAttempts >= MAX_ATTEMPTS || newLocation.accuracy <= 30) {
            finalizeLocation();
          } else {
            // Try again after 2 seconds for better accuracy
            setTimeout(() => requestLocation(), 2000);
          }
        },
        handleLocationError,
        {
          enableHighAccuracy: true,
          timeout: getTimeoutValue(),
          maximumAge: 0,
        }
      );
    } else {
      setIsLocationPermissionGranted(false);
      toast.error('Geolocation is not supported by your browser.');
      setLoading(false);
      setLocationResolved(true);
    }
  };

  const startWatchingLocation = () => {
    if (navigator.geolocation && isLocationPermissionGranted) {
      watchIdRef.current = navigator.geolocation.watchPosition(
        position => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };

          // console.log("Watch location update:", newLocation);
          setLocation(newLocation);

          if (!bestLocation || newLocation.accuracy < bestLocation.accuracy) {
            setBestLocation(newLocation);
          }

          setLocationError(null);
        },
        error => {
          // console.warn("Watch position error:", error);
          if (error.code === 1) {
            setIsLocationPermissionGranted(false);
            setLocation({ latitude: null, longitude: null });
            setLoading(false);
            setLocationResolved(true);
            toast.error('Location access revoked.');
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 5000,
        }
      );
    }
  };

  useEffect(() => {
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(permissionStatus => {
        const initialState = permissionStatus.state;
        setIsLocationPermissionGranted(initialState === 'granted');
        setLoading(false);
        setLocationResolved(true);

        if (initialState === 'denied') {
          setIsLocationPermissionGranted(false);
        }

        permissionStatus.onchange = () => {
          if (permissionStatus.state === 'denied') {
            setIsLocationPermissionGranted(false);
            setLocation({ latitude: null, longitude: null });
            setLoading(false);
            setLocationResolved(true);
            if (watchIdRef.current !== null) {
              navigator.geolocation.clearWatch(watchIdRef.current);
              watchIdRef.current = null;
            }
          } else if (permissionStatus.state === 'granted') {
            setIsLocationPermissionGranted(true);
          }
        };
        return null;
      });
    } else {
      setLoading(false);
      setLocationResolved(true);
    }

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = {
    location: bestLocation || location,
    isLocationPermissionGranted,
    loading,
    locationError,
    requestLocation,
    locationAttempts,
    locationResolved,
  };

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};

export const useLocation = () => {
  const context = useContext(LocationContext);
  if (!context) {
    throw new Error('useLocation must be used within a LocationProvider');
  }
  return context;
};
