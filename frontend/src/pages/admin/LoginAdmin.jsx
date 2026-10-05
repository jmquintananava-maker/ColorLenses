import BrandLogo from '../../components/BrandLogo';
import { apiFetch as fetch } from "../../utils/api";
import { useState } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";

const API_URL = (import.meta.env.VITE_API_URL || "");

function LoginAdmin() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    Username: "",
    Password: ""
  });

  const [visible, setVisible] = useState(false);
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

      navigate(location.state?.from?.startsWith("/admin/") && !location.state.from.startsWith("/admin/login") ? location.state.from : "/admin", {replace:true});
    } catch (err) {
      console.log(err);
      setMessage("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="login-admin-page">
      <section className="cl-login-story"><Link to="/" className="cl-logo"><BrandLogo dark/></Link><span className="cl-eyebrow">BACKSTAGE / TU NEGOCIO</span><h1>DETRÁS DE<br/>CADA <em>mirada.</em></h1><p>Productos, ventas e inventario.<br/>Todo en un mismo lugar.</p><div className="cl-login-orbit" aria-hidden="true"><div className="cl-mini-iris"/></div><small>COLORLENSES — CENTRO DE CONTROL</small></section>
      <section className="cl-login-form-side"><Link to="/" className="cl-underlined-link">← Volver a la tienda</Link><div className="login-admin-card"><span className="cl-eyebrow">ACCESO ADMINISTRATIVO</span><h2>Qué bueno<br/>tenerte de vuelta.</h2><p>Ingresa con tu cuenta de administración.</p>
        <form onSubmit={login}>
          <label className="cl-field">Usuario<input type="text" name="Username" placeholder="Tu usuario" value={form.Username} onChange={handleChange} autoComplete="username" required/></label>
          <label className="cl-field">Contraseña<span className="cl-password-field"><input type={visible?'text':'password'} name="Password" placeholder="Tu contraseña" value={form.Password} onChange={handleChange} autoComplete="current-password" required/><button type="button" onClick={()=>setVisible(v=>!v)} aria-label={visible?'Ocultar contraseña':'Mostrar contraseña'}>{visible?'Ocultar':'Ver'}</button></span></label>
          {message && <div className="login-error" role="alert">{message}</div>}
          <button className="cl-btn cl-btn-dark" type="submit" disabled={loading}>{loading ? "Entrando…" : "Entrar a mi espacio ↗"}</button>
        </form><small className="cl-login-help">¿Olvidaste tu contraseña? Solicita a quien administra la base de datos que restablezca tu acceso.</small>
      </div><small className="cl-login-version">COLORLENSES / 3.0.1</small></section>
    </main>
  );
}
export default LoginAdmin;
