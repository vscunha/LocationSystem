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
  // Hide consent message
  document.getElementById('consent-message').style.display = 'none';
  document.getElementById('consent-button').style.display = 'none';

  // Register service worker and periodic sync
  registerServiceWorker();
});

function sendLocation(lat, lng) {
  fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ latitude: lat, longitude: lng })
  })
    .then((response) => response.json())
    .then((data) => {
      console.log('Localização enviada com sucesso:', data);
    })
    .catch((error) => {
      console.error('Erro ao enviar localização:', error);
    });
}

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
}

registerServiceWorker();
