// src/components/Map.jsx
import React, { useEffect, useRef, useState } from "react";
import Sidebar from "../Sidebar/Sidebar";
import { circleStyles, markerIconStyles } from "./Map.constants";
import "./Map.scss";

const Map = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [markersData, setMarkersData] = useState([]); // Raw data from API
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [filteredMarkersData, setFilteredMarkersData] = useState([]);
  const markersRef = useRef({}); // Will store google.maps.Marker objects keyed by corridaNumber
  const circlesRef = useRef({}); // For circles when location is not precise
  const infoWindowRef = useRef(null);
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  // Utility: Dynamically load the Google Maps script
  const loadScript = (url) => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${url}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = url;
      script.async = true;
      script.defer = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load script " + url));
      document.head.appendChild(script);
    });
  };

  // Utility: Calculate a LatLngBounds given an array of location objects.
  const calculateBoundsWithRadius = (locations) => {
    const bounds = new window.google.maps.LatLngBounds();
    locations.forEach((location) => {
      const point = new window.google.maps.LatLng(
        location.latitude,
        location.longitude,
      );
      bounds.extend(point);
      // If location is not precise, extend bounds by an approximated radius (10km)
      if (!location.preciseLocation) {
        const radiusInDeg = 10000 / 111320; // Rough conversion (meters to degrees)
        bounds.extend(
          new window.google.maps.LatLng(
            location.latitude + radiusInDeg,
            location.longitude + radiusInDeg,
          ),
        );
        bounds.extend(
          new window.google.maps.LatLng(
            location.latitude - radiusInDeg,
            location.longitude - radiusInDeg,
          ),
        );
      }
    });
    return bounds;
  };

  // Initialize the Google Map
  useEffect(() => {
    const initMap = async () => {
      try {
        await loadScript(
          `https://maps.googleapis.com/maps/api/js?key=${apiKey}`,
        );
        const googleMap = new window.google.maps.Map(mapContainerRef.current, {
          center: { lat: -23.55052, lng: -46.633308 },
          zoom: 10,
        });
        setMap(googleMap);

        // Create a custom control for recentering the map
        const centerControlDiv = document.createElement("div");
        centerControlDiv.className = "center-control";
        centerControlDiv.title = "Click to recenter the map";
        centerControlDiv.innerHTML = `<div class="center-control-icon"></div>`;
        centerControlDiv.addEventListener("click", handleCenterControlClick);
        googleMap.controls[window.google.maps.ControlPosition.TOP_RIGHT].push(
          centerControlDiv,
        );
      } catch (err) {
        console.error("Failed to load Google Maps script", err);
      }
    };

    initMap();
  }, [apiKey]);

  // Fetch markers data (locations and rides) once the map is ready
  useEffect(() => {
    if (map) {
      fetch("/api/recent-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
        .then((response) => response.json())
        .then(async (data) => {
          // Filter out invalid locations
          const validLocations = data.filter(
            (loc) => loc.corridaNumber && loc.corridaNumber !== "N/A",
          );

          // For each valid location, fetch its ride status
          const locationsWithStatus = await Promise.all(
            validLocations.map(async (loc) => {
              try {
                const rideResponse = await fetch(
                  `/api/rides/${loc.corridaNumber}`,
                );
                const rideData = await rideResponse.json();
                return { ...loc, status: rideData.status };
              } catch (error) {
                console.error(
                  `Error fetching ride ${loc.corridaNumber}:`,
                  error,
                );
                return null;
              }
            }),
          );

          // Keep only rides that are running
          const runningLocations = locationsWithStatus.filter(
            (loc) => loc && loc.status === "Running",
          );

          setMarkersData(runningLocations);
          setFilteredMarkersData(runningLocations);

          // Fit the map to show all running locations
          const bounds = calculateBoundsWithRadius(runningLocations);
          map.fitBounds(bounds);
        })
        .catch((error) => console.error("Error fetching locations:", error));
    }
  }, [map]);

  // Create markers/circles when markersData changes.
  // This creates (or re-creates) all the markers and circles on the map.
  useEffect(() => {
    if (map && markersData.length) {
      // Remove any existing markers/circles from the map
      Object.values(markersRef.current).forEach((marker) =>
        marker.setMap(null),
      );
      Object.values(circlesRef.current).forEach((circle) =>
        circle.setMap(null),
      );

      // Clear the references
      markersRef.current = {};
      circlesRef.current = {};

      // Create new markers/circles from the data
      markersData.forEach((data) => {
        if (data.preciseLocation) {
          // Create a marker
          const marker = new window.google.maps.Marker({
            position: { lat: data.latitude, lng: data.longitude },
            map: map,
            title: data.corridaNumber,
            icon: markerIconStyles.default,
          });
          marker.addListener("click", () => handleMarkerClick(data));
          markersRef.current[data.corridaNumber] = marker;
        } else {
          // Create a circle for approximate location
          const circle = new window.google.maps.Circle({
            center: { lat: data.latitude, lng: data.longitude },
            radius: 10000,
            ...circleStyles.default,
            map: map,
          });
          circle.addListener("click", () => handleMarkerClick(data));
          circlesRef.current[data.corridaNumber] = circle;
        }
      });
    }
  }, [map, markersData]);

  // When filteredMarkersData changes, update which markers/circles are visible.
  useEffect(() => {
    if (map) {
      // For markers
      Object.entries(markersRef.current).forEach(([key, marker]) => {
        const isVisible = filteredMarkersData.find(
          (m) => m.corridaNumber === key,
        );
        marker.setMap(isVisible ? map : null);
      });
      // For circles
      Object.entries(circlesRef.current).forEach(([key, circle]) => {
        const isVisible = filteredMarkersData.find(
          (m) => m.corridaNumber === key,
        );
        circle.setMap(isVisible ? map : null);
      });

      // Optionally, adjust the map bounds to the filtered markers if any are visible.
      if (filteredMarkersData.length) {
        const bounds = calculateBoundsWithRadius(filteredMarkersData);
        map.fitBounds(bounds);
      }
    }
  }, [filteredMarkersData, map]);

  // Update filteredMarkersData when selectedDriver changes.
  useEffect(() => {
    if (selectedDriver) {
      const filtered = markersData.filter(
        (m) => m.corridaNumber === selectedDriver.corridaNumber,
      );
      setFilteredMarkersData(filtered);
    } else {
      setFilteredMarkersData(markersData);
    }
  }, [selectedDriver, markersData]);

  // Called when a marker (or circle) is clicked.
  const handleMarkerClick = async (data) => {
    try {
      const response = await fetch(`/api/rides/${data.corridaNumber}`);
      const rideData = await response.json();

      // Close any previously opened infoWindow.
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }

      // Create a new InfoWindow.
      infoWindowRef.current = new window.google.maps.InfoWindow({
        content: `<div>
                    <h5>CTE: ${rideData.corridaNumber}</h5>
                    <p>Status: ${rideData.status}</p>
                    <p>Origem: ${rideData.origin}</p>
                    <p>Destino: ${rideData.destination}</p>
                    <p>Motorista: ${rideData.driverName}</p>
                    <p>Última localização: ${new Date(
                      data.timestamp + "Z",
                    ).toLocaleString("pt-BR", {
                      timeZone: "America/Sao_Paulo",
                    })}</p>
                    <p>Localização ${
                      data.preciseLocation ? "precisa" : "aproximada"
                    }</p>
                  </div>`,
      });

      // Open the InfoWindow. For markers we attach it to the marker,
      // for circles we attach it at the center.
      if (data.preciseLocation) {
        const marker = markersRef.current[data.corridaNumber];
        infoWindowRef.current.open(map, marker);
      } else {
        infoWindowRef.current.setPosition({
          lat: data.latitude,
          lng: data.longitude,
        });
        infoWindowRef.current.open(map);
      }
    } catch (error) {
      console.error("Error fetching ride data:", error);
    }
  };

  // Custom control click handler: recenter the map to show all markers.
  const handleCenterControlClick = () => {
    if (map) {
      if (markersData.length) {
        const bounds = calculateBoundsWithRadius(markersData);
        map.fitBounds(bounds);
      } else {
        map.setCenter({ lat: -23.55052, lng: -46.633308 });
        map.setZoom(10);
      }
      if (infoWindowRef.current) {
        infoWindowRef.current.close();
      }
    }
  };

  // Called when a driver is selected from the Sidebar.
  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
    if (infoWindowRef.current) {
      infoWindowRef.current.close();
    }
  };

  return (
    <div className="container mt-5">
      <div className="map-wrapper">
        <Sidebar
          drivers={markersData}
          onDriverSelect={handleDriverSelect}
          selectedDriver={selectedDriver}
        />
        <div ref={mapContainerRef} className="map-container"></div>
      </div>
    </div>
  );
};

export default Map;
