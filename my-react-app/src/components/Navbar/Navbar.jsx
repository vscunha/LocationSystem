import React, { useEffect } from "react";
import "./Navbar.scss";

const Navbar = ({ onLogout }) => {
  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    const loginLink = document.getElementById("loginLink");
    const registerLink = document.getElementById("registerLink");
    const logoutLink = document.getElementById("logoutLink");
    const mapTab = document.getElementById("mapTab");
    const adminTab = document.getElementById("adminTab");
    const ridesTab = document.getElementById("ridesTab");
    const rideGeneratorTab = document.getElementById("rideGeneratorTab");

    if (token && role) {
      // Logged-in state
      loginLink?.classList.add("d-none");
      registerLink?.classList.add("d-none");
      logoutLink?.classList.remove("d-none");
      mapTab?.classList.remove("d-none");
      ridesTab?.classList.remove("d-none");
      rideGeneratorTab?.classList.remove("d-none");

      if (role === "admin") {
        adminTab?.classList.remove("d-none");
      }
    } else {
      // Logged-out state
      loginLink?.classList.remove("d-none");
      registerLink?.classList.remove("d-none");
      logoutLink?.classList.add("d-none");
      mapTab?.classList.add("d-none");
      adminTab?.classList.add("d-none");
      ridesTab?.classList.add("d-none");
      rideGeneratorTab?.classList.add("d-none");
    }
  }, []);

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark">
      <div className="container-fluid">
        <a className="navbar-brand" href="/">
          Portal de Corridas
        </a>
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarSupportedContent"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav ms-auto">
            <li className="nav-item">
              <a className="nav-link" id="loginLink" href="/login">
                Login
              </a>
            </li>
            <li className="nav-item">
              <a className="nav-link" id="registerLink" href="/register">
                Registrar
              </a>
            </li>
            <li className="nav-item d-none" id="mapTab">
              <a className="nav-link" href="/map">
                Mapa
              </a>
            </li>
            <li className="nav-item d-none" id="ridesTab">
              <a className="nav-link" href="/rides">
                Lista de Viagens
              </a>
            </li>
            <li className="nav-item d-none" id="adminTab">
              <a className="nav-link" href="/admin">
                Controle de Acesso
              </a>
            </li>
            <li className="nav-item d-none" id="logoutLink">
              <a className="nav-link" href="#" onClick={onLogout}>
                Sair
              </a>
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
