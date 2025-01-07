// src/App.jsx
import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import Navbar from "./components/Navbar/Navbar";
import Login from "./components/Login/Login";
import AccessPending from "./components/AccessPending/AccessPending";
import Confirm from "./components/Confirm/Confirm";
import Map from "./components/Map/Map";
import AfterRegister from "./components/AfterRegister/AfterRegister";
import Register from "./components/Register/Register";
import Index from "./components/Index/Index";
import Admin from "./components/Admin/Admin";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";
import Ride from "./components/Ride/Ride";
import RidesList from "./components/RidesList/RidesList";
import LocationTracker from "./components/LocationTracker/LocationTracker";

// Create a wrapper component to handle navbar visibility
const AppContent = ({ handleLogout }) => {
  const location = useLocation();
  const isRidePage = location.pathname.startsWith("/ride/");

  return (
    <>
      <LocationTracker />
      {!isRidePage && <Navbar onLogout={handleLogout} />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/login" element={<Login />} />
        <Route path="/access-pending" element={<AccessPending />} />
        <Route path="/confirm" element={<Confirm />} />
        <Route path="/ride/:hash" element={<Ride />} />
        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <Map />
            </ProtectedRoute>
          }
        />
        <Route path="/register" element={<Register />} />
        <Route path="/after-register" element={<AfterRegister />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute requiredRole="admin">
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/rides"
          element={
            <ProtectedRoute>
              <RidesList />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
};

const App = () => {
  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/";
  };

  return (
    <Router>
      <AppContent handleLogout={handleLogout} />
    </Router>
  );
};

export default App;
