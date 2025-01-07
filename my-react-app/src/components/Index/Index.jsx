// src/components/Index.jsx
import React, { useEffect, useState } from "react";
import * as bootstrap from "bootstrap";
import "./Index.scss"; // Import the SASS file

const serverUrl = "/api/location"; // URL configurable

const Index = () => {
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

  return (
    <div className="main-content container">
      <header className="banner" />
    </div>
  );
};

export default Index;
