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
import { circleStyles, markerIconStyles } from "./Map.constants.js";

const Map = () => {
  const [map, setMap] = useState(null);
  const [markers, setMarkers] = useState([]);
  const [selectedMarker, setSelectedMarker] = useState(null);
  const [selectedRide, setSelectedRide] = useState(null);
  const [mapCenter, setMapCenter] = useState({
    lat: -23.55052,
    lng: -46.633308,
  });
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
      // First fetch locations
      fetch("/api/recent-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((response) => response.json())
        .then(async (data) => {
          // Filter valid corridaNumbers first
          const validLocations = data.filter(
            (location) =>
              location.corridaNumber && location.corridaNumber !== "N/A",
          );

          // Fetch ride status for each location
          const locationsWithStatus = await Promise.all(
            validLocations.map(async (location) => {
              try {
                const rideResponse = await fetch(
                  `/api/rides/${location.corridaNumber}`,
                );
                const rideData = await rideResponse.json();
                return {
                  ...location,
                  status: rideData.status,
                };
              } catch (error) {
                console.error(
                  `Error fetching ride ${location.corridaNumber}:`,
                  error,
                );
                return null;
              }
            }),
          );

          // Filter only running rides and remove null entries
          const runningLocations = locationsWithStatus.filter(
            (location) => location && location.status === "Running",
          );

          setMarkers(runningLocations);

          if (runningLocations.length > 0) {
            const bounds = calculateBoundsWithRadius(runningLocations);
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

  const handleMarkerClick = async (marker) => {
    try {
      const response = await fetch(`/api/rides/${marker.corridaNumber}`);
      const rideData = await response.json();

      if (rideData) {
        setSelectedMarker(marker);
        setSelectedRide(rideData);
        if (map) {
          map.panTo({ lat: marker.latitude, lng: marker.longitude });
        }
      }
    } catch (error) {
      console.error("Error fetching ride data:", error);
    }
  };

  const handleMapLoad = (mapInstance) => {
    setMap(mapInstance);
  };

  const handleCenterControlClick = () => {
    if (map) {
      if (markers.length > 0) {
        const bounds = calculateBoundsWithRadius(markers);
        map.fitBounds(bounds);
      } else {
        // Default to São Paulo coordinates
        map.setCenter({ lat: -23.55052, lng: -46.633308 });
        map.setZoom(10);
      }
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
                title={marker.corridaNumber}
                icon={markerIconStyles.default}
              />
            ) : (
              <Circle
                key={marker.corridaNumber}
                center={{ lat: marker.latitude, lng: marker.longitude }}
                radius={10000}
                options={circleStyles.default}
                onClick={() => handleMarkerClick(marker)}
              />
            ),
          )}

          {selectedMarker && selectedRide && (
            <InfoWindow
              position={{
                lat: selectedMarker.latitude,
                lng: selectedMarker.longitude,
              }}
              onCloseClick={() => {
                setSelectedMarker(null);
                setSelectedRide(null);
              }}
            >
              <div>
                <h5>CTE: {selectedRide.corridaNumber}</h5>
                <p>Status: {selectedRide.status}</p>
                <p>Origem: {selectedRide.origin}</p>
                <p>Destino: {selectedRide.destination}</p>
                <p>Motorista: {selectedRide.driverName}</p>
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
