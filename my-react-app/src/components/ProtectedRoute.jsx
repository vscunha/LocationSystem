import { Navigate } from 'react-router-dom';

const ProtectedRoute = ({ children, requiredRole = null }) => {
  const token = localStorage.getItem('token');
  const role = localStorage.getItem('role');

  if (!token) {
    // Not logged in, redirect to login page
    return <Navigate to="/login" />;
  }

  if (requiredRole && role !== requiredRole) {
    // Wrong role, redirect to home page
    return <Navigate to="/" />;
  }

  return children;
};

export default ProtectedRoute;
