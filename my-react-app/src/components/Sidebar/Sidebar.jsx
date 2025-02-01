import React, { useState } from "react";
import "./Sidebar.scss";

const Sidebar = ({ drivers, onDriverSelect, selectedDriver }) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredDrivers = drivers.filter((driver) =>
    driver.corridaNumber.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  return (
    <div className="sidebar">
      <input
        type="text"
        className="search-box"
        placeholder="Search drivers..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <ul className="drivers-list">
        <li
          className={`driver-item ${!selectedDriver ? "selected" : ""}`}
          onClick={() => onDriverSelect(null)}
        >
          Show All Drivers
        </li>
        {filteredDrivers.map((driver) => (
          <li
            key={driver.corridaNumber}
            className={`driver-item ${selectedDriver?.corridaNumber === driver.corridaNumber ? "selected" : ""}`}
            onClick={() => onDriverSelect(driver)}
          >
            <div>{driver.driverName}</div>
            <small>CTE: {driver.corridaNumber}</small>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default Sidebar;
