import { useState } from "react";
import { useNavigate } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL;

function LoginAdmin() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    Username: "",
    Password: ""
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  };

  const login = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setMessage("");

      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(form)
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.message || "Error al iniciar sesión");
        setLoading(false);
        return;
      }

      localStorage.setItem("adminToken", data.token);
      localStorage.setItem("adminUser", JSON.stringify(data.user));

      navigate("/admin");
    } catch (err) {
      console.log(err);
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-admin-page">
      <div className="login-admin-card">
        <h1>ColorLenses</h1>

        <p>Acceso administrativo</p>

        <form onSubmit={login}>
          <input
            type="text"
            name="Username"
            placeholder="Usuario"
            value={form.Username}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="Password"
            placeholder="Contraseña"
            value={form.Password}
            onChange={handleChange}
            required
          />

          {message && (
            <div className="login-error">
              {message}
            </div>
          )}

          <button type="submit" disabled={loading}>
            {loading ? "Entrando..." : "Entrar"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default LoginAdmin;