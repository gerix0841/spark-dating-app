import api from '../api/axios';

export const syncLocation = () => {
  if (!navigator.geolocation) {
    console.warn("Geolocation not supported");
    return;
  }

  navigator.geolocation.getCurrentPosition(
    async (position) => {
      try {
        await api.post('/users/me/location', {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      } catch (err) {
        console.error("Location sync failed ❌", err);
      }
    },
    (error) => {
      console.warn("Location access denied by user.");
    },
    { enableHighAccuracy: true }
  );
};