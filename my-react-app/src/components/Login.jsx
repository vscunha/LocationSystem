// src/components/Login.jsx
import React, { useState } from 'react';

const Login = () => {
  const [message, setMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    const email = e.target.loginEmail.value;
    const password = e.target.loginPassword.value;

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error || 'Login failed.');
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('role', data.role);
        window.location.href = '/';
      }
    } catch {
      setMessage('Error logging in.');
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-6">
          <h3>Login</h3>
          <form id="loginForm" onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="loginEmail" className="form-label">Email</label>
              <input type="email" className="form-control" id="loginEmail" required />
            </div>
            <div className="mb-3">
              <label htmlFor="loginPassword" className="form-label">Password</label>
              <input type="password" className="form-control" id="loginPassword" required />
            </div>
            <button type="submit" className="btn btn-primary">Login</button>
            <a href="/register" className="btn btn-link">Register</a>
          </form>
          {message && <div className="mt-3 text-danger">{message}</div>}
        </div>
      </div>
    </div>
  );
};

export default Login;
