// src/components/Admin.jsx
import React, { useEffect, useState } from "react";

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
    if (window.confirm(`Are you sure you want to delete user ${email}?`)) {
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
      <h2>User Control Panel</h2>
      <table className="table table-bordered">
        <thead>
          <tr>
            <th>Email</th>
            <th>Confirmed</th>
            <th>Enabled</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.email}>
              <td>{user.email}</td>
              <td>{user.confirmed ? "Yes" : "No"}</td>
              <td>{user.enabled ? "Yes" : "No"}</td>
              <td>{user.role}</td>
              <td>
                <button
                  className="btn btn-danger"
                  onClick={() => handleDelete(user.email)}
                >
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default Admin;
