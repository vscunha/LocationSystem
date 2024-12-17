let watchId = null;
const serverUrl = '/api/location'; // URL configurável

// Assume driverName and corridaNumber are saved in localStorage by your modal code.
// Example: localStorage.setItem("driverName", "<the name>");
//          localStorage.setItem("corridaNumber", "<the corrida>");

let deferredPrompt;
const installButton = document.getElementById('startRideBtn');

// Listen for the beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  console.log('beforeinstallprompt event fired');
  e.preventDefault();
  deferredPrompt = e;
  installButton.style.display = 'block';
});

installButton.addEventListener('click', async () => {
  const driverName = document.getElementById("driverName").value;
  const corridaNumber = document.getElementById("corridaNumber").value;

  // Save to localStorage
  localStorage.setItem("driverName", driverName);
  localStorage.setItem("corridaNumber", corridaNumber || "");

  console.log("Data saved to localStorage:", {
    driverName,
    corridaNumber,
  });

  if ('geolocation' in navigator) {
    watchId = navigator.geolocation.watchPosition(
      position => {
        const { latitude, longitude } = position.coords;
        fetch('https://locationsystemtest.zapto.org/api/location', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            latitude,
            longitude,
            driverName,   // Added
            corridaNumber // Added
          })
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

  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`User response to the install prompt: ${outcome}`);
  deferredPrompt = null;
});

// Register Service Worker
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
            minInterval: 30 * 1000, // 30 seconds (adjust as needed)
          });
          console.log('Periodic background sync registered.');
        } else {
          console.log('Periodic background sync permission not granted.');
        }
      } else {
        console.log('Periodic Sync not supported in this browser.');
      }

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', async event => {
        if (event.data.type === 'REQUEST_LOCATION') {
          console.log('Service Worker requested location');
          const position = await getCurrentPosition();
          const driverName = localStorage.getItem("driverName") || "Unknown Driver";
          const corridaNumber = localStorage.getItem("corridaNumber") || "N/A";
      
          registration.active.postMessage({
            type: 'LOCATION_RESPONSE',
            payload: {
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              driverName: driverName,
              corridaNumber: corridaNumber,
              timestamp: Date.now()
            }
          });
        }
      });

    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  } else {
    if (!('serviceWorker' in navigator)) {
      alert('Service Workers are not supported in this browser.');
    }
    // If 'periodicSync' is not supported, you can optionally alert or ignore
  }
}
registerServiceWorker();

// Utility function: get current position
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 5000
    });
  });
}

// Periodic location updates every 5 minutes (300000 ms)
if (navigator.geolocation) {
  setInterval(() => {
    navigator.geolocation.getCurrentPosition(position => {
      // Retrieve driver/corrida from localStorage
      const driverName = localStorage.getItem("driverName") || "Unknown Driver";
      const corridaNumber = localStorage.getItem("corridaNumber") || "N/A";

      fetch(serverUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          driverName,
          corridaNumber
        })
      });
    });
  }, 300000); // 5 minutes
}

// Push Notifications (optional)
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
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array('BBxYaFUxGyX1LJWoek5zZZwS04IfX3U1wHclg51a5K8ss51Zpi0ib2KP7wfTiAs6CAfPx2CvRPOokMpGxiS0bCo')
    }).then(subscription => {
      console.log('Push subscription:', subscription);
      // Send subscription to your server
      fetch('/api/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
    }).catch(error => console.error('Push subscription failed:', error));
  });
}

// Register a sync event if supported
if ('serviceWorker' in navigator && 'SyncManager' in window) {
  navigator.serviceWorker.ready.then(registration => {
    return registration.sync.register('syncLocation');
  });
}

// Register a periodicSync (additional approach) if supported
navigator.serviceWorker.ready.then(registration => {
  if ('periodicSync' in registration) {
    registration.periodicSync.register({
      tag: 'locationFetch',
      minInterval: 300, // every 5 minutes
    });
  }
});

// Ping location every 5 minutes
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

// Periodically post location data from the active tab every 30s (example)
setInterval(async () => {
  const position = await getCurrentPosition();
  const driverName = localStorage.getItem("driverName") || "Unknown Driver";
  const corridaNumber = localStorage.getItem("corridaNumber") || "N/A";
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({
      type: 'LOCATION_UPDATE',
      payload: {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        driverName,
        corridaNumber
      }
    });
  }
}, 30000); // 30s (adjust as needed)