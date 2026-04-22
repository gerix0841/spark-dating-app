import api from '../api/axios';

/** Silently sync the device's GPS position to the backend. No-op if geolocation is unavailable. */
export const syncLocation = () => {
  if (!navigator.geolocation) return;

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await api.post('/users/me/location', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      } catch {
        // Location sync is best-effort; errors are non-critical
      }
    },
    () => {
      // User denied permission — acceptable, discovery still works without location
    },
    { enableHighAccuracy: true },
  );
};
