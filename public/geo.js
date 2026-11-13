// Shared helpers for locations (used by the home page and the map page)

// Haversine formula: the distance in km between two points on Earth,
// using their latitude and longitude.
function distanceKm(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in km

  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Asks the browser for the user's location.
// onSuccess gets (lat, lng); onError gets a message to show.
function getUserLocation(onSuccess, onError) {
  if (!navigator.geolocation) {
    onError('Your browser does not support location.');
    return;
  }

  navigator.geolocation.getCurrentPosition(
    function (position) {
      onSuccess(position.coords.latitude, position.coords.longitude);
    },
    function () {
      onError('We could not get your location. Please allow location access and try again.');
    },
    { timeout: 10000 }
  );
}

// Makes text safe to put inside HTML (stops XSS)
function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
