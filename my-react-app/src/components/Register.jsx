// src/components/Register.jsx
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const Register = () => {
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    const email = e.target.registerEmail.value;
    const password = e.target.registerPassword.value;

    try {
      const res = await fetch("/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage(data.error || "Registration failed.");
        setIsSuccess(false);
      } else {
        setMessage("Registration successful! Redirecting...");
        setIsSuccess(true);
        setTimeout(() => {
          navigate("/after-register");
        }, 2000);
      }
    } catch (error) {
      console.error("Error during registration:", error);
      setMessage("An error occurred. Please try again later.");
      setIsSuccess(false);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center mt-5">
        <div className="col-md-6">
          <h3>Registrar</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="registerEmail" className="form-label">
                Email
              </label>
              <input
                type="email"
                className="form-control"
                id="registerEmail"
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="registerPassword" className="form-label">
                Senha
              </label>
              <input
                type="password"
                className="form-control"
                id="registerPassword"
                required
              />
            </div>
            <button type="submit" className="btn btn-primary">
              Registrar
            </button>
          </form>
          {message && (
            <div
              className={`mt-3 ${isSuccess ? "text-success" : "text-danger"}`}
            >
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Register;
