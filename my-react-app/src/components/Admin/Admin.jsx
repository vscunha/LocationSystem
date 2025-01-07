// src/components/Admin.jsx
import React, { useEffect, useState } from "react";
import "./Admin.scss"; // Import the SASS file

const Admin = () => {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem("token");

      if (!token || localStorage.getItem("role") !== "admin") {
        window.location.href = "/login";
        return;
      }

      const res = await fetch("/api/admin/users", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setUsers(await res.json());
      } else {
        console.error("Error fetching users");
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = async (email) => {
    const token = localStorage.getItem("token");
    if (window.confirm(`Tem certeza que deseja excluir o usuário ${email}?`)) {
      await fetch("/api/admin/deleteUser", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      setUsers(users.filter((user) => user.email !== email));
    }
  };

  return (
    <div className="container mt-5">
      <h2>Controle de Acesso</h2>
      <div className="table-responsive">
        <table className="table table-bordered">
          <thead>
            <tr>
              <th>Email</th>
              <th>Confirmado</th>
              <th>Ativo</th>
              <th>Acesso</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.email}>
                <td>{user.email}</td>
                <td>{user.confirmed ? "Sim" : "Não"}</td>
                <td>{user.enabled ? "Sim" : "Não"}</td>
                <td>{user.role}</td>
                <td>
                  <button
                    className="btn btn-danger"
                    onClick={() => handleDelete(user.email)}
                  >
                    Deletar
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Admin;
