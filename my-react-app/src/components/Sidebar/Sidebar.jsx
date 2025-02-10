import React, { useState, useEffect } from "react";
import "./Sidebar.scss";

const Sidebar = ({
  drivers,
  onDriverSelect,
  selectedDrivers,
  isActive,
  onClose,
}) => {
  // Get mobile breakpoint from CSS variable
  const getMobileBreakpoint = () => {
    return parseInt(
      getComputedStyle(document.documentElement)
        .getPropertyValue("--mobile-breakpoint")
        .trim(),
    );
  };

  const [searchTerm, setSearchTerm] = useState("");

  const filteredDrivers = drivers.filter(
    (driver) =>
      driver.driverName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.corridaNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleDriverClick = (driver) => {
    onDriverSelect(driver);
    if (window.innerWidth <= getMobileBreakpoint()) {
      onClose();
    }
  };

  const isDriverSelected = (driver) => {
    return selectedDrivers.some(
      (d) => d.corridaNumber === driver.corridaNumber,
    );
  };

  return (
    <div className={`sidebar ${isActive ? "active" : ""}`}>
      {window.innerWidth <= getMobileBreakpoint() && (
        <button className="close-button" onClick={onClose}>
          ×
        </button>
      )}
      <input
        type="text"
        className="search-box"
        placeholder="Buscar motoristas..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <ul className="drivers-list">
        <li
          className={`driver-item ${selectedDrivers.length === 0 ? "selected" : ""}`}
          onClick={() => handleDriverClick(null)}
        >
          Show All Drivers
        </li>
        {filteredDrivers.map((driver) => (
          <li
            key={driver.corridaNumber}
            className={`driver-item ${isDriverSelected(driver) ? "selected" : ""}`}
            onClick={() => handleDriverClick(driver)}
          >
            <div className="driver-name">{driver.driverName}</div>
            <div className="driver-info">
              <div className="driver-cte">CTE: {driver.corridaNumber}</div>
              <div className="driver-location-time">
                {new Date(driver.timestamp + "Z").toLocaleString("pt-BR", {
                  timeZone: "America/Sao_Paulo",
                  day: "2-digit",
                  month: "2-digit",
                  year: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
