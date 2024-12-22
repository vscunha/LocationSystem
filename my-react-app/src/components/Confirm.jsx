// src/components/Confirm.jsx
import React from "react";

const Confirm = () => (
  <div className="container text-center mt-5">
    <h2>Your email has been confirmed!</h2>
    <p>
      However, your account access is pending. Please contact the administrator
      to enable your account.
    </p>
    <img
      src="https://via.placeholder.com/300x200?text=Contact+Administrator"
      alt="Contact Administrator"
    />
    <div className="mt-3">
      <a href="/login" className="btn btn-primary">
        Login Page
      </a>
    </div>
  </div>
);

export default Confirm;
