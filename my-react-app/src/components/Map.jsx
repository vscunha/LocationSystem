import React, { useEffect, useRef } from 'react';

const Map = () => {
  const mapRef = useRef(null);

  useEffect(() => {
    if (!window.google) {
      loadGoogleMapsScript()
        .then(() => {
          initMap();
        })
        .catch((err) => {
          console.error("Google Maps script failed to load", err);
        });
    } else {
      initMap();
    }
  }, []);

  const loadGoogleMapsScript = () => {
    return new Promise((resolve, reject) => {
      const existingScript = document.getElementById('google-maps-script');
      if (existingScript) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.id = 'google-maps-script';
      script.src = `https://maps.googleapis.com/maps/api/js?key=AIzaSyAuaCwbztg77qEGzqHFq2JZbh9Ngcf8uC0`;
      script.async = true;
      script.defer = true;

      script.onload = () => resolve();
      script.onerror = (error) => reject(error);

      document.body.appendChild(script);
    });
  };

  const initMap = () => {
    const mapElement = mapRef.current;

    if (!mapElement) {
      console.error("Map element not found.");
      return;
    }

    const map = new google.maps.Map(mapElement, {
      zoom: 10,
      center: { lat: -23.55052, lng: -46.633308 }, // São Paulo as default
    });

    const bounds = new google.maps.LatLngBounds();

    // Add the custom CenterControl button
    const centerControlDiv = document.createElement('div');
    CenterControl(centerControlDiv, map, bounds);
    centerControlDiv.index = 1;
    map.controls[google.maps.ControlPosition.RIGHT_TOP].push(centerControlDiv);

    // Fetch locations and add markers
    fetch('/api/recent-locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })
      .then((response) => response.json())
      .then((data) => {
        data.forEach((location) => {
          const position = { lat: location.latitude, lng: location.longitude };

          const marker = new google.maps.Marker({
            position,
            map,
            title: `${location.driverName} - ${location.corridaNumber}`,
          });

          bounds.extend(position);

          const infoWindow = new google.maps.InfoWindow({
            content: `
              <div>
                <h5>Driver: ${location.driverName}</h5>
                <p>Corrida: ${location.corridaNumber}</p>
                <p>Timestamp: ${location.timestamp}</p>
              </div>
            `,
          });

          marker.addListener('click', () => {
            infoWindow.open(map, marker);
          });
        });

        map.fitBounds(bounds);
      })
      .catch((error) => console.error('Error fetching locations:', error));
  };

  const CenterControl = (controlDiv, map, bounds) => {
    const controlUI = document.createElement('div');
    controlUI.style.backgroundColor = '#fff';
    controlUI.style.border = '2px solid #fff';
    controlUI.style.borderRadius = '3px';
    controlUI.style.boxShadow = '0 2px 6px rgba(0,0,0,.3)';
    controlUI.style.cursor = 'pointer';
    controlUI.style.marginTop = '10px';
    controlUI.style.marginRight = '10px';
    controlUI.style.textAlign = 'center';
    controlUI.title = 'Click to recenter the map';
    controlDiv.appendChild(controlUI);

    const controlIcon = document.createElement("div");
    controlIcon.style.backgroundImage = "url('https://maps.gstatic.com/tactile/mylocation/mylocation-sprite-1x.png')";
    controlIcon.style.backgroundSize = "160px 16px";
    controlIcon.style.backgroundPosition = "0 0";
    controlIcon.style.width = "16px";
    controlIcon.style.height = "16px";
    controlIcon.style.margin = "10px";
    controlUI.appendChild(controlIcon);

    controlUI.addEventListener("click", () => {
      map.fitBounds(bounds);
    });
  };

  return (
    <div className="container mt-5 text-center">
      <h1>Map Page</h1>
      <div
        id="map"
        ref={mapRef}
        style={{ height: '80vh', width: '100%' }}
      ></div>
    </div>
  );
};

export default Map;
