import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import LocationTracker from "../LocationTracker/LocationTracker";
import { confirm } from "react-confirm-box";
import "./Ride.scss";

const Ride = () => {
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { hash } = useParams();
  const navigate = useNavigate();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isPwaInstalled, setIsPwaInstalled] = useState(false);
  const [completionStatus, setCompletionStatus] = useState(null);
  const [driverName, setDriverName] = useState("");
  const [driverPhone, setDriverPhone] = useState("");
  const [permissionError, setPermissionError] = useState(null);
  const [locationPromptShown, setLocationPromptShown] = useState(false);
  const [showLocationPrompt, setShowLocationPrompt] = useState(true);
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
    checkLocationPermission();
  }, []);

  // Register the service worker
  const registerServiceWorkers = () => {
    // Update to use state values instead of DOM elements
    setCookie("driverName", driverName);
    setCookie("corridaNumber", rideData.rideId);

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

  const subscribeToPushNotifications = (
    registration,
    userVisibleOnly = false,
  ) => {
    registration.pushManager
      .subscribe({
        userVisibleOnly: userVisibleOnly,
        applicationServerKey: urlBase64ToUint8Array(
          "BBxYaFUxGyX1LJWoek5zZZwS04IfX3U1wHclg51a5K8ss51Zpi0ib2KP7wfTiAs6CAfPx2CvRPOokMpGxiS0bCo",
        ),
      })
      .catch(() => {
        if (!userVisibleOnly) {
          subscribeToPushNotifications(registration, true);
        }
        console.error("User denied permission to send notifications.");
        return;
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

  const requestGeolocationPermission = () => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        () => {
          // Permission granted
          startGeolocation();
        },
        (error) => {
          console.error("Geolocation permission denied:", error);
        },
      );
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

  const allowLocation = async () => {
    const locationPermission = await navigator.permissions.query({
      name: "geolocation",
    });

    if (locationPermission.state === "granted") {
      startGeolocation();
      setCompletionStatus(null);
    } else {
      setShowLocationPrompt(false);
      requestGeolocationPermission();
    }

    setTimeout(() => {
      allowLocation();
    }, 5000);
  };

  const startRide = async () => {
    setCompletionStatus("confirming");

    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        await updateRideStatus("Running");
        registerServiceWorkers();
        setCompletionStatus("location_prompt");
        setLocationPromptShown(true);

        const locationPermission = await navigator.permissions.query({
          name: "geolocation",
        });
        if (locationPermission.state === "granted") {
          startGeolocation();
          setCompletionStatus(null);
        }
      } else {
        setPermissionError(
          "Notificações não autorizadas. Por favor, permita as notificações para continuar.",
        );
        setCompletionStatus(null);
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      setPermissionError("Erro ao solicitar permissão de notificação.");
      setCompletionStatus(null);
    }
  };

  const finishRide = async () => {
    const options = {
      labels: {
        confirmable: "Sim",
        cancellable: "Não",
      },
      render: (message, onConfirm, onCancel) => {
        return (
          <div className="confirmation-dialog">
            <h3>Confirmar Finalização</h3>
            <p>
              Tem certeza que deseja finalizar esta viagem agora? Você já chegou
              no destino final ?
            </p>
            <div className="confirmation-buttons">
              <button onClick={onCancel} className="btn btn-secondary">
                Não
              </button>
              <button onClick={onConfirm} className="btn btn-primary">
                Sim
              </button>
            </div>
          </div>
        );
      },
    };

    const result = await confirm("", options);

    if (result) {
      await updateRideStatus("Finished");
      setCompletionStatus("finished");
    }
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

  const checkLocationPermission = async () => {
    const locationPermission = await navigator.permissions.query({
      name: "geolocation",
    });
    setShowLocationPrompt(locationPermission.state !== "granted");
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
          <h2>Permissão Necessária</h2>
          <p>
            Para prosseguir, precisamos da sua permissão para enviar
            notificações.
          </p>
          <p>
            Por favor, aceite a solicitação de permissão que aparecerá em
            seguida.
          </p>
        </div>
      </div>
    );
  }

  if (completionStatus === "location_prompt") {
    return (
      <div className="ride-container">
        <header className="banner" />
        <div className="ride-info confirmation-screen">
          <h2>Confirmar localização de partida</h2>
          <p>É necessário validar o ponto de partida da corrida.</p>
          <p>
            Para isso basta clicar em permitir sua localização atual e a corrida
            será autorizada pelo sistema.
          </p>
          {showLocationPrompt ? (
            <>
              <button className="btn btn-primary" onClick={allowLocation}>
                Permitir Localização
              </button>
            </>
          ) : (
            <>
              <p>Aguarde enquanto processamos...</p>
              <div className="loading-spinner">
                <i className="fas fa-circle-notch fa-spin"></i>
              </div>
            </>
          )}
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
      {rideData.status === "Waiting" ? (
        <h2>Confirmação de Corrida</h2>
      ) : (
        <h2>Comprovante de corrida</h2>
      )}
      {permissionError && (
        <div className="error-alert">
          <i className="fas fa-exclamation-triangle"></i>
          {permissionError}
        </div>
      )}
      <div className="ride-info">
        <p>
          <strong>Motorista:</strong> {rideData.driverName}
        </p>
        <p>
          <strong>Placa:</strong> {rideData.plate}
        </p>
        <p>
          <strong>Origem:</strong> {rideData.departureLocation}
        </p>
        <p>
          <strong>Destino:</strong> {rideData.finalLocation}
        </p>
        <p>
          <strong>Status:</strong> {getStatusInPortuguese(rideData.status)}
        </p>
        {rideData.status !== "Waiting" && (
          <p>
            <strong>Pagamento:</strong> Em processamento
          </p>
        )}
      </div>
      {rideData.status !== "Cancelled" && (
        <>
          {rideData.status === "Waiting" && (
            <>
              <button className="btn btn-primary" onClick={startRide}>
                CONFIRMAR CORRIDA
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
              FINALIZAR VIAGEM AGORA
            </button>
          )}
        </>
      )}
    </div>
  );
};

export default Ride;
