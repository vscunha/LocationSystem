// src/components/AfterRegister.jsx
import React from 'react';

const AfterRegister = () => (
  <div className="container text-center mt-5">
    <h2>Thank you for registering!</h2>
    <p>We’ve sent you an email to confirm your account. Please check your inbox and click the confirmation link.</p>
    <a href="/login" className="btn btn-primary">Back to Login</a>
  </div>
);

export default AfterRegister;
