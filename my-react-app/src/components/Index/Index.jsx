// src/components/Index.jsx
import React, { useEffect, useState } from "react";
import * as bootstrap from "bootstrap";
import "./Index.scss"; // Import the SASS file

const serverUrl = "/api/location"; // URL configurable

const Index = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  let watchId = null;

  const setCookie = (name, value, days = 7) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/`;
  };

  const getCookie = (name) => {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2)
      return decodeURIComponent(parts.pop().split(";").shift());
    return null;
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
      document.getElementById("loginLink").classList.add("d-none");
      document.getElementById("registerLink").classList.add("d-none");
      document.getElementById("logoutLink").classList.remove("d-none");
      document.getElementById("mapTab").classList.remove("d-none");

      if (role === "admin") {
        document.getElementById("adminTab").classList.remove("d-none");
      }
    }
  }, []);

  useEffect(() => {
    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e); // Save the event for later
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

    // Check if PWA is already installed
    window.addEventListener("appinstalled", () => {
      console.log("PWA installed!");
      setIsPwaInstalled(true);
    });

    // Cleanup listeners
    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
    };
  }, []);

  useEffect(() => {
    // Register the service worker
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((registration) => {
          console.log("Service Worker registered:", registration);

          if ("periodicSync" in registration) {
            navigator.permissions
              .query({ name: "periodic-background-sync" })
              .then((status) => {
                if (status.state === "granted") {
                  registration.periodicSync.register("send-location", {
                    minInterval: 30 * 1000, // 30 seconds
                  });
                  console.log("Periodic background sync registered.");
                }
              });
          }

          navigator.serviceWorker.addEventListener("message", async (event) => {
            if (event.data.type === "REQUEST_LOCATION") {
              console.log("Service Worker requested location");
              const position = await getCurrentPosition();
              const driverName =
                localStorage.getItem("driverName") || "Unknown Driver";
              const corridaNumber =
                localStorage.getItem("corridaNumber") || "N/A";

              registration.active.postMessage({
                type: "LOCATION_RESPONSE",
                payload: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  driverName,
                  corridaNumber,
                  timestamp: Date.now(),
                },
              });
            }
          });

          // Push Notifications
          if ("Notification" in window && registration.pushManager) {
            Notification.requestPermission().then((permission) => {
              if (permission === "granted") {
                console.log("Notification permission granted!");
                subscribeToPushNotifications(registration);
              } else {
                console.log("Notification permission denied.");
              }
            });
          }
        })
        .catch((error) =>
          console.error("Service Worker registration failed:", error),
        );
    }
  }, []);

  const subscribeToPushNotifications = (registration) => {
    registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(
          "BBxYaFUxGyX1LJWoek5zZZwS04IfX3U1wHclg51a5K8ss51Zpi0ib2KP7wfTiAs6CAfPx2CvRPOokMpGxiS0bCo",
        ),
      })
      .then((subscription) => {
        console.log("Push subscription:", subscription);
        const corridaNumber = getCookie("corridaNumber") || "N/A";
        const driverName = getCookie("driverName") || "Unknown Driver";
        fetch("/api/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subscription,
            corridaNumber: corridaNumber,
            driverName: driverName,
          }),
        });
      })
      .catch((error) => console.error("Push subscription failed:", error));
  };

  const urlBase64ToUint8Array = (base64String) => {
    const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, "+")
      .replace(/_/g, "/");
    const rawData = atob(base64);
    return new Uint8Array([...rawData].map((char) => char.charCodeAt(0)));
  };

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt(); // Show the install prompt

    const choiceResult = await deferredPrompt.userChoice;
    console.log(`User choice: ${choiceResult.outcome}`);

    setDeferredPrompt(null); // Clear the saved prompt
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
    fetch(serverUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude,
        longitude,
        driverName: getCookie("driverName") || "Unknown Driver",
        corridaNumber: getCookie("corridaNumber") || "N/A",
        preciseLocation: true,
      }),
    });
  };

  const startGeolocation = () => {
    handleInstallClick();
    const driverName = document.getElementById("driverName").value;
    const corridaNumber = document.getElementById("corridaNumber").innerText;

    // Save to cookies
    setCookie("driverName", driverName);
    setCookie("corridaNumber", corridaNumber);

    if ("geolocation" in navigator) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetchLocationData(latitude, longitude);
        },
        (error) => {
          console.error("Error obtaining location:", error);
        },
        { enableHighAccuracy: true },
      );
    } else {
      alert("Geolocation is not supported on this device.");
    }
  };

  useEffect(() => {
    const fetchLocation = async () => {
      const position = await getCurrentPosition();
      fetchLocationData(position.coords.latitude, position.coords.longitude);
    };
    //const printpos = (position) => {
    //  console.log(position.coords.latitude, position.coords.longitude);
    //}
    //navigator.geolocation.getCurrentPosition(printpos);
    //startGeolocation();
    fetchLocation();

    const intervalId = setInterval(() => fetchLocation(), 300000); // 5 minutes

    return () => clearInterval(intervalId);
  }, []);

  return (
    <div className="main-content container">
      <header className="banner" />
    </div>
  );
};

export default Index;
