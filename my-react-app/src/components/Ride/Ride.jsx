import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LocationTracker from "../LocationTracker/LocationTracker";
import "./Ride.scss";

const Ride = () => {
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { hash } = useParams();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [completionStatus, setCompletionStatus] = useState(null); // Add this line
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
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

  // Register the service worker
  const registerServiceWorkers = () => {
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
              const driverName = getCookie("driverName") || "Unknown Driver";
              const corridaNumber = getCookie("corridaNumber") || "N/A";

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
  };

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
            driverPhone: driverPhone,
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

  const startGeolocation = () => {
    registerServiceWorkers();

    // Update to use state values instead of DOM elements
    setCookie("driverName", driverName);
    setCookie("corridaNumber", rideData.rideId);

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
    const fetchRideData = async () => {
      try {
        const response = await fetch(`/api/ride/${hash}`);
        if (!response.ok) {
          throw new Error("Ride not found");
        }
        const data = await response.json();
        setRideData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (hash) {
      fetchRideData();
    }
  }, [hash]);

  const updateRideStatus = async (newStatus) => {
    try {
      const response = await fetch("/api/ride/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, status: newStatus }),
      });

      if (!response.ok) throw new Error("Failed to update status");

      setRideData((prev) => ({ ...prev, status: newStatus }));
    } catch (err) {
      setError(err.message);
    }
  };

  const startRide = async () => {
    await updateRideStatus("Running");
    startGeolocation();
    setCompletionStatus("confirming");

    // Wait 10 seconds before showing success screen
    setTimeout(() => {
      setCompletionStatus("started");
    }, 10000);
  };

  const finishRide = async () => {
    await updateRideStatus("Finished");
    setCompletionStatus("finished");
  };

  const statusMapping = {
    Waiting: "Aguardando Início",
    Running: "Em Andamento",
    Finished: "Finalizada",
    Cancelled: "Cancelada",
  };

  const getStatusInPortuguese = (status) => {
    return statusMapping[status] || status;
  };

  if (loading) return <div>Loading...</div>;
  if (error)
    return (
      <div className="ride-container">
        <div className="error-container">
          <div className="warning-symbol">⚠️</div>
          <div className="error-message">Viagem não encontrada</div>
        </div>
      </div>
    );
  if (!rideData)
    return (
      <div className="ride-container">
        <div className="error-container">
          <div className="warning-symbol">⚠️</div>
          <div className="error-message">Dados da viagem não encontrados</div>
        </div>
      </div>
    );
  if (completionStatus === "confirming") {
    return (
      <div className="ride-container">
        <header className="banner" />
        <div className="ride-info confirmation-screen">
          <div className="loading-spinner">
            <i className="fas fa-circle-notch fa-spin"></i>
          </div>
          <p>Confirmando Corrida</p>
        </div>
      </div>
    );
  }

  if (completionStatus === "started") {
    return (
      <div className="ride-container">
        <header className="banner" />
        <div className="ride-info success-message-container">
          <div className="success-message">
            <h2>CORRIDA CONFIRMADA!</h2>
            <p>BOA VIAGEM! DIRIJA COM SEGURANÇA.</p>
            <i className="fas fa-truck-fast"></i>
            <p className="ride-code">
              CÓDIGO DA CORRIDA
              <br />
              {rideData.rideId}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (completionStatus === "finished") {
    return (
      <div className="ride-container">
        <header className="banner" />
        <div className="ride-info finish-message-container">
          <div className="success-message">
            <h2>Corrida Finalizada com sucesso!</h2>
            <p>Obrigado por utilizar nosso sistema.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ride-container">
      <header className="banner-small" />
      <h2>Confirmação de Corrida</h2>
      <div className="ride-info">
        {rideData.status === "Waiting" ? (
          <>
            <div className="input-group">
              <input
                type="text"
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Nome"
                className="form-control"
              />
            </div>
            <div className="input-group">
              <input
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="Telefone"
                className="form-control"
              />
            </div>
          </>
        ) : (
          <p>
            <strong>Motorista:</strong> {driverName || rideData.driverName}
          </p>
        )}
        <p>
          <strong>Partida:</strong> {rideData.departureLocation}
        </p>
        <p>
          <strong>Destino:</strong> {rideData.finalLocation}
        </p>
        <p>
          <strong>Status:</strong> {getStatusInPortuguese(rideData.status)}
        </p>
      </div>
      {rideData.status !== "Cancelled" && (
        <>
          {rideData.status === "Waiting" && (
            <>
              <button className="btn btn-primary" onClick={startRide}>
                INICIAR VIAGEM
              </button>
              <div>
                <br />
                OBRIGADO POR FAZER PARTE DO TIME VRB LOG!{" "}
                <i className="fas fa-truck"></i>
              </div>
              <div>
                <br />
                SUA JORNADA É ESSENCIAL PARA ENTREGARMOS AGILIDADE E CONFIANÇA A
                CADA CLIENTE.
              </div>
              <div>
                <br />
                DIRIJA COM SEGURANÇA E CONTE CONOSCO PARA QUALQUER SUPORTE.
              </div>
              <div>
                <br />
                BOA VIAGEM E ATÉ O PROXIMO DESTINO!
              </div>
            </>
          )}
          {rideData.status === "Running" && (
            <button className="btn btn-danger" onClick={finishRide}>
              Finalizar Viagem
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Ride;
