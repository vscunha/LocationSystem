import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./RidesList.scss";

const RidesList = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showRunning, setShowRunning] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [newRide, setNewRide] = useState({
    departureLocation: "",
    finalLocation: "",
    driverName: "",
    rideId: "",
    phone: "",
    plate: "",
  });
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
  });
  const [copiedHash, setCopiedHash] = useState(null);
  const [locationStatus, setLocationStatus] = useState({});

  useEffect(() => {
    const fetchRides = async () => {
      try {
        const response = await fetch("/api/rides/all-rides");
        if (!response.ok) {
          throw new Error("Failed to fetch rides");
        }
        const data = await response.json();
        setRides(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchRides();
  }, []);

  useEffect(() => {
    const checkLocations = async () => {
      const statuses = {};
      for (const ride of rides) {
        if (ride.status === "Running") {
          try {
            const response = await fetch(`/api/location/check/${ride.rideId}`);
            const data = await response.json();
            statuses[ride.rideId] = data.hasRecentLocation;
          } catch (err) {
            console.error("Error checking location for ride:", ride.rideId);
          }
        }
      }
      setLocationStatus(statuses);
    };

    // Initial check
    checkLocations();

    // Set up periodic checking every 30 seconds
    const interval = setInterval(checkLocations, 30000);

    return () => clearInterval(interval);
  }, [rides]);

  const changeRideStatus = async (hash, newStatus) => {
    const action = newStatus === "Cancelled" ? "cancelar" : "finalizar";
    setConfirmDialog({
      isOpen: true,
      message: `Tem certeza que deseja ${action} esta viagem?`,
      onConfirm: async () => {
        try {
          const response = await fetch("/api/ride/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ hash, status: newStatus }),
          });

          if (!response.ok) throw new Error(`Failed to ${action} ride`);

          setRides((prevRides) =>
            prevRides.map((ride) =>
              ride.hash === hash ? { ...ride, status: newStatus } : ride,
            ),
          );
        } catch (err) {
          setError(err.message);
        } finally {
          setConfirmDialog({ isOpen: false, message: "", onConfirm: null });
        }
      },
    });
  };

  const getStatusBadge = (status) => {
    const statusMap = {
      Waiting: {
        text: "Aguardando",
        className: "waiting",
      },
      Running: {
        text: "Em Andamento",
        className: "running",
      },
      Finished: {
        text: "Finalizada",
        className: "finished",
      },
      Cancelled: {
        text: "Cancelada",
        className: "cancelled",
      },
    };

    const defaultStatus = {
      text: "Aguardando",
      className: "waiting",
    };

    const statusInfo = statusMap[status] || defaultStatus;

    return (
      <span className={`status-badge ${statusInfo.className}`}>
        {statusInfo.text}
      </span>
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewRide((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/rides/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRide),
      });

      if (!response.ok) throw new Error("Failed to generate ride");

      const data = await response.json();

      // Refresh rides list
      const updatedResponse = await fetch("/api/rides/all-rides");
      const updatedRides = await updatedResponse.json();
      setRides(updatedRides);

      // Reset form and close modal
      setNewRide({
        departureLocation: "",
        finalLocation: "",
        driverName: "",
        rideId: "",
        phone: "",
        plate: "",
      });
      setShowModal(false);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (showModal) {
      document.body.classList.add("modal-open");
    } else {
      document.body.classList.remove("modal-open");
    }

    // Cleanup
    return () => {
      document.body.classList.remove("modal-open");
    };
  }, [showModal]);

  const handleCloseModal = () => {
    setShowModal(false);
    setNewRide({
      departureLocation: "",
      finalLocation: "",
      driverName: "",
      rideId: "",
    });
  };

  const copyToClipboard = (ride) => {
    const text = `${window.location.origin}/ride/${ride.hash}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopiedHash(ride.hash);
      setTimeout(() => setCopiedHash(null), 2000); // Reset after 2 seconds
    });
  };

  const filteredRides = showRunning
    ? rides.filter(
        (ride) => ride.status === "Waiting" || ride.status === "Running",
      )
    : rides;

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="rides-list-container">
      <div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          Nova Viagem
        </button>
      </div>
      <div className="rides-header">
        <h2>Lista de Viagens</h2>
      </div>
      <div className="show-cancelled">
        <input
          type="checkbox"
          id="show-running"
          checked={showRunning}
          onChange={(e) => setShowRunning(e.target.checked)}
        />
        <label htmlFor="show-running">
          Mostrar apenas viagens em andamento
        </label>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Gerar Nova Viagem</h3>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Local de Partida</label>
                <input
                  type="text"
                  name="departureLocation"
                  value={newRide.departureLocation}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Destino</label>
                <input
                  type="text"
                  name="finalLocation"
                  value={newRide.finalLocation}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Nome do Motorista</label>
                <input
                  type="text"
                  name="driverName"
                  value={newRide.driverName}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Telefone</label>
                <input
                  type="text"
                  name="phone"
                  value={newRide.phone}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Placa</label>
                <input
                  type="text"
                  name="plate"
                  value={newRide.plate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>CTE</label>
                <input
                  type="text"
                  name="rideId"
                  value={newRide.rideId}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCloseModal}
                >
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Gerar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="table-responsive">
        <table className="rides-table">
          <thead>
            <tr>
              <th>CTE</th>
              <th>Motorista</th>
              <th>Partida</th>
              <th>Destino</th>
              <th>Telefone</th>
              <th>Placa</th>
              <th>Status</th>
              <th>Link</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {filteredRides.map((ride) => (
              <tr
                key={ride.rideId}
                className={ride.status === "Cancelled" ? "cancelled" : ""}
              >
                <td className="ride-id-cell">
                  {ride.status === "Running" && (
                    <span
                      className={`location-led ${
                        locationStatus[ride.rideId] ? "active" : "inactive"
                      }`}
                      title={
                        locationStatus[ride.rideId]
                          ? "Motorista enviando localização"
                          : "Sem localização recente"
                      }
                    />
                  )}
                  {ride.rideId}
                </td>
                <td>{ride.driverName}</td>
                <td>{ride.departureLocation}</td>
                <td>{ride.finalLocation}</td>
                <td>{ride.phone}</td>
                <td>{ride.plate}</td>
                <td>{getStatusBadge(ride.status)}</td>
                <td className="action-buttons">
                  <Link
                    to={`/ride/${ride.hash}`}
                    className="btn btn-sm btn-primary"
                  >
                    Link
                  </Link>
                  <button
                    onClick={() => copyToClipboard(ride)}
                    className={`btn btn-sm ${copiedHash === ride.hash ? "btn-success" : "btn-primary"}`}
                  >
                    {copiedHash === ride.hash ? "Copiado!" : "Copiar Link"}
                  </button>
                </td>
                <td>
                  {ride.status === "Waiting" ? (
                    <button
                      onClick={() => changeRideStatus(ride.hash, "Cancelled")}
                      className="btn btn-sm btn-secondary"
                    >
                      Cancelar
                    </button>
                  ) : (
                    ride.status === "Running" && (
                      <button
                        onClick={() => changeRideStatus(ride.hash, "Finished")}
                        className="btn btn-sm btn-secondary"
                      >
                        Finalizar
                      </button>
                    )
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {confirmDialog.isOpen && (
        <div className="confirm-dialog-overlay">
          <div className="confirm-dialog">
            <p>{confirmDialog.message}</p>
            <div className="confirm-dialog-actions">
              <button
                className="btn btn-secondary"
                onClick={() =>
                  setConfirmDialog({
                    isOpen: false,
                    message: "",
                    onConfirm: null,
                  })
                }
              >
                Não
              </button>
              <button
                className="btn btn-primary"
                onClick={() => {
                  confirmDialog.onConfirm();
                }}
              >
                Sim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RidesList;
