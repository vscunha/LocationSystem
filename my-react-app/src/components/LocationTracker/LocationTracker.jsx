import { useEffect } from "react";

const LocationTracker = () => {
  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2)
      return decodeURIComponent(parts.pop().split(";").shift());
    return null;
  };

  const checkLocationPermission = async () => {
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      return result.state === "granted";
    } catch (error) {
      console.error("Error checking location permission:", error);
      return false;
    }
  };

  const getCurrentPosition = () => {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 5000,
      });
    });
  };

  const fetchLocationData = (latitude, longitude) => {
    const driverName = getCookie("driverName") || "Unknown Driver";
    const corridaNumber = getCookie("corridaNumber") || "N/A";

    fetch("/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude,
        longitude,
        driverName,
        corridaNumber,
        preciseLocation: true,
      }),
    });
  };

  useEffect(() => {
    const fetchLocation = async () => {
      const hasPermission = await checkLocationPermission();
      if (!hasPermission) {
        return;
      }

      const position = await getCurrentPosition();
      fetchLocationData(position.coords.latitude, position.coords.longitude);
    };

    fetchLocation();
    const intervalId = setInterval(() => fetchLocation(), 300000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  return null; // This component doesn't render anything
};

export default LocationTracker;
