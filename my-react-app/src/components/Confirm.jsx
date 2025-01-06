// src/components/Confirm.jsx
import React from "react";

const Confirm = () => (
  <div className="container text-center mt-5">
    <h2>Seu email foi confirmado!</h2>
    <p>
      No entanto, o acesso à sua conta está pendente. Por favor, entre em
      contato com o administrador para ativar sua conta.
    </p>
    <img
      src="https://via.placeholder.com/300x200?text=Contatar+Administrador"
      alt="Contatar Administrador"
    />
    <div className="mt-3">
      <a href="/login" className="btn btn-primary">
        Página de Login
      </a>
    </div>
  </div>
);

export default Confirm;
