let watchId = null;
const serverUrl = '/api/locacao'; // URL configurável

document.getElementById('start').addEventListener('click', () => {
  if ('geolocation' in navigator) {
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        sendLocation(position.coords.latitude, position.coords.longitude);
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

document.getElementById('stop').addEventListener('click', () => {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
    alert('Envio de localização parado.');
  }
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
