import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "./Ride.scss";

const Ride = () => {
  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { hash } = useParams();
  const navigate = useNavigate();

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
    // Store ride information
    localStorage.setItem("driverName", rideData.driverName);
    localStorage.setItem("corridaNumber", rideData.rideId);

    // Start geolocation tracking
    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          fetch("/api/location", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              latitude,
              longitude,
              driverName: rideData.driverName,
              corridaNumber: rideData.rideId,
              preciseLocation: true,
            }),
          });
        },
        (error) => console.error("Error obtaining location:", error),
        { enableHighAccuracy: true },
      );
    } else {
      alert("Geolocation is not supported on this device.");
    }

    // Navigate to main page or map view
    navigate("/");
  };

  const finishRide = async () => {
    await updateRideStatus("Finished");
    navigate("/");
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

  return (
    <div className="ride-container">
      <h2>Detalhes da Viagem</h2>
      <div className="ride-info">
        <p>
          <strong>Motorista:</strong> {rideData.driverName}
        </p>
        <p>
          <strong>ID da Viagem:</strong> {rideData.rideId}
        </p>
        <p>
          <strong>Partida:</strong> {rideData.departureLocation}
        </p>
        <p>
          <strong>Destino:</strong> {rideData.finalLocation}
        </p>
        <p>
          <strong>Status:</strong> {rideData.status}
        </p>
      </div>
      {rideData.status !== "Cancelled" && (
        <>
          {rideData.status === "Waiting for Confirmation" && (
            <button className="btn btn-primary" onClick={startRide}>
              Iniciar Viagem
            </button>
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
