self.addEventListener('install', (event) => {
  console.log('Service Worker installed.');
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker activated.');
});

self.addEventListener('periodicsync', (event) => {
  console.log('Periodic sync started.');
  if (event.tag === 'send-location') {
    event.waitUntil(sendLocation());
  }
});

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

    // Send location to server
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
