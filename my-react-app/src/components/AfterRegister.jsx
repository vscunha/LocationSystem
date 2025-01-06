// src/components/AfterRegister.jsx
import React from "react";

const AfterRegister = () => (
  <div className="container text-center mt-5">
    <h2>Obrigado por se registrar!</h2>
    <p>
      Enviamos um email para confirmar sua conta. Por favor, verifique sua caixa
      de entrada e clique no link de confirmação.
    </p>
    <a href="/" className="btn btn-primary">
      Voltar para Login
    </a>
  </div>
);

export default AfterRegister;
