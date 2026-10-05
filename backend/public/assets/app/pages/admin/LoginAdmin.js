import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { apiFetch as fetch } from "../../utils/api.js";
import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
const API_URL = ("" || "");
function LoginAdmin() {
    const navigate = useNavigate();
    const location = useLocation();
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
            navigate(location.state?.from?.startsWith("/admin/") && !location.state.from.startsWith("/admin/login") ? location.state.from : "/admin", { replace: true });
        }
        catch (err) {
            console.log(err);
            setMessage("Error de conexión");
        }
        finally {
            setLoading(false);
        }
    };
    return (_jsx("div", { className: "login-admin-page", children: _jsxs("div", { className: "login-admin-card", children: [_jsx("h1", { children: "ColorLenses" }), _jsx("p", { children: "Acceso administrativo" }), _jsxs("form", { onSubmit: login, children: [_jsx("input", { type: "text", name: "Username", placeholder: "Usuario", value: form.Username, onChange: handleChange, required: true }), _jsx("input", { type: "password", name: "Password", placeholder: "Contrase\u00F1a", value: form.Password, onChange: handleChange, required: true }), message && (_jsx("div", { className: "login-error", children: message })), _jsx("button", { type: "submit", disabled: loading, children: loading ? "Entrando..." : "Entrar" })] })] }) }));
}
export default LoginAdmin;
