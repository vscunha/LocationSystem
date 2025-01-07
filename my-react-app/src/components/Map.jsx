// src/components/Map.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  GoogleMap,
  LoadScript,
  Marker,
  InfoWindow,
  Circle,
} from "@react-google-maps/api";

import "./Map.scss";
import { circleStyles } from "./Map.constants.js";

const Map = () => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: -23.55052,
    lng: -46.633308,
  });
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  const markerIcon = {
    path: window.google?.maps?.SymbolPath?.CIRCLE,
    fillColor: "#4dabf7",
    fillOpacity: 1,
    strokeWeight: 1,
    strokeColor: "#4dabf7",
    scale: 8,
  };

  const calculateBoundsWithRadius = (locations) => {
    const bounds = new window.google.maps.LatLngBounds();
    locations.forEach((location) => {
      const point = { lat: location.latitude, lng: location.longitude };
      bounds.extend(point);

      // If not precise, extend bounds to include circle radius (10km)
      if (!location.preciseLocation) {
        // Approximate 10km in degrees at the equator (adjust based on latitude for more precision)
        const radiusInDeg = 10000 / 111320; // 111320 meters per degree

        bounds.extend({
          lat: location.latitude + radiusInDeg,
          lng: location.longitude + radiusInDeg,
        });
        bounds.extend({
          lat: location.latitude - radiusInDeg,
          lng: location.longitude - radiusInDeg,
        });
      }
    });
    return bounds;
  };

  useEffect(() => {
    if (map) {
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
            const bounds = calculateBoundsWithRadius(validLocations);
            if (map) {
              map.fitBounds(bounds);
            } else {
              const center = bounds.getCenter();
              setMapCenter({ lat: center.lat(), lng: center.lng() });
            }
          }
        })
        .catch((error) => console.error("Error fetching locations:", error));
    }
  }, [map]);

  useEffect(() => {
    if (map && markers.length > 0) {
      const bounds = calculateBoundsWithRadius(markers);
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
      const bounds = calculateBoundsWithRadius(markers);
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
          {markers.map((marker) =>
            marker.preciseLocation ? (
              <Marker
                key={marker.corridaNumber}
                position={{ lat: marker.latitude, lng: marker.longitude }}
                onClick={() => handleMarkerClick(marker)}
                title={`${marker.driverName} - ${marker.corridaNumber}`}
                icon={markerIcon}
              />
            ) : (
              <Circle
                key={marker.corridaNumber}
                center={{ lat: marker.latitude, lng: marker.longitude }}
                radius={10000}
                options={{
                  strokeColor: circleStyles.default.strokeColor,
                  strokeOpacity: circleStyles.default.strokeOpacity,
                  strokeWeight: circleStyles.default.strokeWeight,
                  fillColor: circleStyles.default.fillColor,
                  fillOpacity: circleStyles.default.fillOpacity,
                }}
                onClick={() => handleMarkerClick(marker)}
              />
            ),
          )}

          {selectedMarker && (
            <InfoWindow
              position={{
                lat: selectedMarker.latitude,
                lng: selectedMarker.longitude,
              }}
              onCloseClick={() => setSelectedMarker(null)}
            >
              <div>
                <h5>Motorista: {selectedMarker.driverName}</h5>
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
                <p>
                  Localização{" "}
                  {selectedMarker.preciseLocation ? "precisa" : "aproximada"}
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
