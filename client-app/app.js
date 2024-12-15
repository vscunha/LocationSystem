let watchId = null;
const serverUrl = '/api/locacao'; // URL configurável


// app.js

let deferredPrompt;
const installButton = document.getElementById('install-button');

// Hide the install button initially
installButton.style.display = 'none';

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired');
  // Prevent the mini-infobar from appearing on mobile
  e.preventDefault();
  // Stash the event so it can be triggered later
  deferredPrompt = e;
  // Show the install button
  installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
  // Hide the install button
  installButton.style.display = 'none';
  // Show the install prompt
  deferredPrompt.prompt();
  // Wait for the user's response to the prompt
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  // Clear the deferredPrompt variable
  deferredPrompt = null;
});

document.getElementById('consent-button').addEventListener('click', () => {
  if ('geolocation' in navigator) {
    watchId = navigator.geolocation.watchPosition(
        position => {
          const { latitude, longitude } = position.coords;
          fetch('https://locationsystemtest.zapto.org/api/locacao', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ latitude, longitude, timestamp: Date.now() })
          });
      },
      (error) => {
        console.error('Erro ao obter localização:', error);
      },
      { enableHighAccuracy: true }
    );
  } else {
    alert('Geolocalização não é suportada neste dispositivo.');
  }
});


// app.js

async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('service-worker.js');
      console.log('Service Worker registered:', registration);

      if ('periodicSync' in registration) {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync',
        });

        if (status.state === 'granted') {
          await registration.periodicSync.register('send-location', {
            minInterval: 30 * 1000, // 5 minutes in milliseconds
          });
          console.log('Periodic background sync registered.');
        } else {
          console.log('Periodic background sync permission not granted.');
        }
      } else {
        console.log('Periodic Sync not supported in this browser.');
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  } else {
    if (!('serviceWorker' in navigator)) {
      alert('Service Workers are not supported in this browser.');
    } else if (!('periodicSync' in registration)) {
      alert('Periodic Background Sync is not supported in this browser.');
    }
  }
  navigator.serviceWorker.ready.then(registration => {
      navigator.serviceWorker.addEventListener('message', async event => {
          if (event.data.type === 'REQUEST_LOCATION') {
              console.log('Service Worker requested location');
              const position = await getCurrentPosition();
              registration.active.postMessage({
                  type: 'LOCATION_RESPONSE',
                  payload: {
                      latitude: position.coords.latitude,
                      longitude: position.coords.longitude,
                      timestamp: Date.now()
                  }
              });
          }
      });
  });
}

function getCurrentPosition() {
  return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 5000
      });
  });
}

registerServiceWorker();

if (navigator.geolocation) {
  setInterval(() => {
      navigator.geolocation.getCurrentPosition(position => {
          fetch(serverUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
              })
          });
      });
  }, 300000); // Every 5 minutes
}

if ('Notification' in window && navigator.serviceWorker) {
  Notification.requestPermission().then(permission => {
      if (permission === 'granted') {
          console.log('Notification permission granted!');
          subscribeToPushNotifications();
      } else {
          console.log('Notification permission denied.');
      }
  });
}

function subscribeToPushNotifications() {
  navigator.serviceWorker.ready.then(registration => {
      registration.pushManager.subscribe({
          userVisibleOnly: true, // Mandatory
          applicationServerKey: urlBase64ToUint8Array('BBxYaFUxGyX1LJWoek5zZZwS04IfX3U1wHclg51a5K8ss51Zpi0ib2KP7wfTiAs6CAfPx2CvRPOokMpGxiS0bCo')
      }).then(subscription => {
          console.log('Push subscription:', subscription);
          // Send the subscription to your server to store it
          fetch('/api/subscribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(subscription)
          });
      }).catch(error => console.error('Push subscription failed:', error));
  });
}

if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then(registration => {
      return registration.sync.register('syncLocation');
  });
}

navigator.serviceWorker.ready.then(registration => {
  if ('periodicSync' in registration) {
      registration.periodicSync.register({
          tag: 'locationFetch',
          minInterval: 300, // Fetch every 5 minutes
      });
  }
});

// self.registration.showNotification('Tracking Active', {
//   body: 'Your location is being tracked for valuable purposes!',
//   requireInteraction: true, // Keeps the notification open
//   silent: true // Ensures no annoying sound
// });

setInterval(() => {
  if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'locationPing' });
  }
}, 300000);

// Helper function for VAPID key conversion
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(char => char.charCodeAt(0)));
}

setInterval(async () => {
  const position = await getCurrentPosition();
  if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
          type: 'LOCATION_UPDATE',
          payload: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              timestamp: Date.now()
          }
      });
  }
}, 30000); // 5 minutes