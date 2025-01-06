import React, { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
} from "@react-google-maps/api";
import "./Map.scss"; // Import the SASS file

const Map = () => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: -23.55052,
    lng: -46.633308,
  });
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  useEffect(() => {
    fetch("/api/recent-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })
      .then((response) => response.json())
      .then((data) => {
        const validLocations = data.filter(
          (location) =>
            location.driverName &&
            location.corridaNumber &&
            location.driverName !== "Unknown Driver" &&
            location.corridaNumber !== "N/A",
        );

        setMarkers(validLocations);

        if (validLocations.length > 0) {
          const bounds = new window.google.maps.LatLngBounds();
          validLocations.forEach((location) => {
            bounds.extend({ lat: location.latitude, lng: location.longitude });
          });
          if (map) {
            map.fitBounds(bounds);
          } else {
            const center = bounds.getCenter();
            setMapCenter({ lat: center.lat(), lng: center.lng() });
          }
        }
      })
      .catch((error) => console.error("Error fetching locations:", error));
  }, [map]);

  useEffect(() => {
    if (map && markers.length > 0) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      map.fitBounds(bounds);
    }
  }, [map, markers]);

  const handleMarkerClick = (marker) => {
    setSelectedMarker(marker);
    if (map) {
      map.panTo({ lat: marker.latitude, lng: marker.longitude });
    }
  };

  const handleMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  const handleCenterControlClick = () => {
    if (map) {
      const bounds = new window.google.maps.LatLngBounds();
      markers.forEach((marker) => {
        bounds.extend({ lat: marker.latitude, lng: marker.longitude });
      });
      map.fitBounds(bounds);
      setSelectedMarker(null); // Close all opened info windows
    }
  };

  return (
    <div className="container mt-5 text-center">
      <LoadScript googleMapsApiKey={apiKey}>
        <GoogleMap
          mapContainerClassName="map-container"
          zoom={10}
          center={mapCenter}
          onLoad={handleMapLoad}
        >
          {markers.map((marker) => (
            <Marker
              key={marker.corridaNumber}
              position={{ lat: marker.latitude, lng: marker.longitude }}
              onClick={() => handleMarkerClick(marker)}
              title={`${marker.driverName} - ${marker.corridaNumber}`}
            />
          ))}

          {selectedMarker && (
            <InfoWindow
              position={{
                lat: selectedMarker.latitude,
                lng: selectedMarker.longitude,
              }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div>
                <h5>Driver: {selectedMarker.driverName}</h5>
                <p>Corrida: {selectedMarker.corridaNumber}</p>
                <p>
                  Última localização:{" "}
                  {new Date(selectedMarker.timestamp + "Z").toLocaleString(
                    "pt-BR",
                    {
                      timeZone: "America/Sao_Paulo",
                    },
                  )}
                </p>
              </div>
            </InfoWindow>
          )}

          <div
            className="center-control"
            title="Click to recenter the map"
            onClick={handleCenterControlClick}
          >
            <div className="center-control-icon"></div>
          </div>
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default Map;
