import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import "./RidesList.scss";

const RidesList = () => {
  const [rides, setRides] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCancelled, setShowCancelled] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newRide, setNewRide] = useState({
    departureLocation: "",
    finalLocation: "",
    driverName: "",
    rideId: "",
  });

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

  const cancelRide = async (hash) => {
    try {
      const response = await fetch("/api/ride/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hash, status: "Cancelled" }),
      });

      if (!response.ok) throw new Error("Failed to cancel ride");

      setRides((prevRides) =>
        prevRides.map((ride) =>
          ride.hash === hash ? { ...ride, status: "Cancelled" } : ride,
        ),
      );
    } catch (err) {
      setError(err.message);
    }
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

  const filteredRides = showCancelled
    ? rides
    : rides.filter((ride) => ride.status !== "Cancelled");

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
          id="show-cancelled"
          checked={showCancelled}
          onChange={(e) => setShowCancelled(e.target.checked)}
        />
        <label htmlFor="show-cancelled">Mostrar viagens canceladas</label>
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
                <label>ID da Viagem</label>
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
              <th>ID da Viagem</th>
              <th>Motorista</th>
              <th>Partida</th>
              <th>Destino</th>
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
                <td>{ride.rideId}</td>
                <td>{ride.driverName}</td>
                <td>{ride.departureLocation}</td>
                <td>{ride.finalLocation}</td>
                <td>{getStatusBadge(ride.status)}</td>
                <td>
                  <Link to={`/ride/${ride.hash}`}>link</Link>
                </td>
                <td>
                  {ride.status === "Waiting" && (
                    <button
                      onClick={() => cancelRide(ride.hash)}
                      className="btn btn-sm btn-secondary"
                    >
                      Cancelar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RidesList;
