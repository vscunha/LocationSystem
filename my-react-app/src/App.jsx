// src/App.jsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Login from "./components/Login";
import AccessPending from "./components/AccessPending";
import Confirm from "./components/Confirm";
import Map from "./components/Map";
import AfterRegister from "./components/AfterRegister";
import Register from "./components/Register";
import Index from "./components/Index";
import Admin from "./components/Admin";

const App = () => {
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  return (
    <Router>
      <Navbar onLogout={handleLogout} />
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/access-pending" element={<AccessPending />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/map" element={<Map />} />
        <Route path="/register" element={<Register />} />
        <Route path="/after-register" element={<AfterRegister />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
    </Router>
  );
};

export default App;
