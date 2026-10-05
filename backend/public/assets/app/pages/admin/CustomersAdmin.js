import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { apiFetch as fetch } from "../../utils/api.js";
import { useEffect, useMemo, useState } from "react";
import { Plus, Pencil, Trash2, X, RotateCcw, Search } from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar.js";
const API_URL = ("" || "");
const emptyForm = {
    FullName: "",
    Phone: "",
    Email: "",
    Notes: "",
    CardSlug: "",
    QRCode: "",
    Status: "Activo",
    Points: 0,
    Level: "Silver"
};
function CustomersAdmin() {
    const [customers, setCustomers] = useState([]);
    const [viewMode, setViewMode] = useState("active");
    const [search, setSearch] = useState("");
    const [form, setForm] = useState(emptyForm);
    const [editingId, setEditingId] = useState(null);
    const [showForm, setShowForm] = useState(false);
    useEffect(() => {
        getCustomers();
    }, [viewMode]);
    const getCustomers = async () => {
        try {
            const endpoint = viewMode === "active"
                ? `${API_URL}/api/customers`
                : `${API_URL}/api/customers-inactive`;
            const response = await fetch(endpoint);
            const data = await response.json();
            setCustomers(Array.isArray(data) ? data : []);
        }
        catch (err) {
            console.log(err);
        }
    };
    const filteredCustomers = useMemo(() => {
        const searchText = search.toLowerCase().trim();
        if (!searchText)
            return customers;
        return customers.filter((customer) => {
            return (String(customer.Id || "")
                .toLowerCase()
                .includes(searchText) ||
                String(customer.FullName || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.Phone || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.Email || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.Points || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.Level || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.TotalSpent || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.Visits || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.CardSlug || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(customer.Status || "")
                    .toLowerCase()
                    .includes(searchText));
        });
    }, [customers, search]);
    const createSlug = (name) => {
        return name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "FullName") {
            const slug = createSlug(value);
            setForm({
                ...form,
                FullName: value,
                CardSlug: slug,
                QRCode: `/card/${slug}`
            });
            return;
        }
        setForm({
            ...form,
            [name]: value
        });
    };
    const openCreateForm = () => {
        setForm(emptyForm);
        setEditingId(null);
        setShowForm(true);
    };
    const openEditForm = (customer) => {
        setForm({
            FullName: customer.FullName || "",
            Phone: customer.Phone || "",
            Email: customer.Email || "",
            Notes: customer.Notes || "",
            CardSlug: customer.CardSlug || "",
            QRCode: customer.QRCode || "",
            Status: customer.Status || "Activo",
            Points: customer.Points || 0,
            Level: customer.Level || "Silver"
        });
        setEditingId(customer.Id);
        setShowForm(true);
    };
    const saveCustomer = async (e) => {
        e.preventDefault();
        try {
            const url = editingId
                ? `${API_URL}/api/customers/${editingId}`
                : `${API_URL}/api/customers`;
            const method = editingId ? "PUT" : "POST";
            const payload = {
                ...form,
                Points: Number(form.Points || 0)
            };
            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });
            const data = await response.json();
            if (!response.ok) {
                console.log("❌ Error guardando cliente:", data);
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo guardar el cliente");
                return;
            }
            setShowForm(false);
            setForm(emptyForm);
            setEditingId(null);
            getCustomers();
        }
        catch (err) {
            console.log("❌ Error frontend save customer:", err);
            alert("Error al guardar cliente");
        }
    };
    const deleteCustomer = async (id) => {
        const confirmDelete = window.confirm("¿Desactivar cliente? Ya no aparecerá en ventas, pero se conservará su historial.");
        if (!confirmDelete)
            return;
        try {
            const response = await fetch(`${API_URL}/api/customers/${id}`, {
                method: "DELETE"
            });
            const data = await response.json();
            if (!response.ok) {
                console.log("❌ Error al desactivar:", data);
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo desactivar el cliente");
                return;
            }
            alert("✅ Cliente desactivado");
            getCustomers();
        }
        catch (err) {
            console.log("❌ Error frontend delete customer:", err);
            alert("Error al desactivar cliente");
        }
    };
    const reactivateCustomer = async (id) => {
        const confirmReactivate = window.confirm("¿Reactivar cliente? Volverá a aparecer en ventas y conservará su historial.");
        if (!confirmReactivate)
            return;
        try {
            const response = await fetch(`${API_URL}/api/customers/${id}/reactivate`, {
                method: "PUT"
            });
            const data = await response.json();
            if (!response.ok) {
                console.log("❌ Error al reactivar:", data);
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo reactivar el cliente");
                return;
            }
            alert("✅ Cliente reactivado");
            getCustomers();
        }
        catch (err) {
            console.log("❌ Error frontend reactivate customer:", err);
            alert("Error al reactivar cliente");
        }
    };
    return (_jsxs("div", { className: "admin-page", children: [_jsx(AdminSidebar, {}), _jsxs("main", { className: "admin-content", children: [_jsxs("div", { className: "admin-header admin-header-row", children: [_jsxs("div", { children: [_jsx("h1", { children: "Clientes" }), _jsx("p", { children: "Registra clientes, administra tarjetas digitales y puntos." })] }), _jsxs("button", { className: "admin-add-btn", onClick: openCreateForm, children: [_jsx(Plus, { size: 20 }), "Nuevo Cliente"] })] }), _jsxs("div", { className: "product-mode-buttons", children: [_jsx("button", { className: viewMode === "active"
                                    ? "product-mode-btn active"
                                    : "product-mode-btn", onClick: () => {
                                    setViewMode("active");
                                    setSearch("");
                                    setShowForm(false);
                                    setForm(emptyForm);
                                    setEditingId(null);
                                }, children: "Activos" }), _jsx("button", { className: viewMode === "inactive"
                                    ? "product-mode-btn active"
                                    : "product-mode-btn", onClick: () => {
                                    setViewMode("inactive");
                                    setSearch("");
                                    setShowForm(false);
                                    setForm(emptyForm);
                                    setEditingId(null);
                                }, children: "Inactivos" })] }), showForm && (_jsxs("div", { className: "admin-form-card", children: [_jsxs("div", { className: "admin-form-header", children: [_jsx("h2", { children: editingId ? "Editar Cliente" : "Nuevo Cliente" }), _jsx("button", { className: "admin-close-btn", onClick: () => setShowForm(false), children: _jsx(X, { size: 18 }) })] }), _jsxs("form", { onSubmit: saveCustomer, className: "admin-form-grid", children: [_jsx("input", { name: "FullName", placeholder: "Nombre completo", value: form.FullName, onChange: handleChange, required: true }), _jsx("input", { name: "Phone", placeholder: "Tel\u00E9fono", value: form.Phone, onChange: handleChange }), _jsx("input", { name: "Email", placeholder: "Correo", value: form.Email, onChange: handleChange }), _jsxs("select", { name: "Status", value: form.Status, onChange: handleChange, children: [_jsx("option", { value: "Activo", children: "Activo" }), _jsx("option", { value: "Inactivo", children: "Inactivo" })] }), _jsx("input", { name: "Points", type: "number", min: "0", placeholder: "Puntos", value: form.Points, onChange: handleChange }), _jsxs("select", { name: "Level", value: form.Level, onChange: handleChange, children: [_jsx("option", { value: "Silver", children: "Silver" }), _jsx("option", { value: "Gold", children: "Gold" }), _jsx("option", { value: "Black", children: "Black" })] }), _jsx("input", { name: "CardSlug", placeholder: "Slug tarjeta", value: form.CardSlug, onChange: handleChange }), _jsx("input", { name: "QRCode", placeholder: "Ruta QR / tarjeta", value: form.QRCode, onChange: handleChange }), _jsx("textarea", { name: "Notes", placeholder: "Notas", value: form.Notes, onChange: handleChange }), _jsx("button", { className: "admin-save-btn", type: "submit", children: editingId ? "Actualizar Cliente" : "Guardar Cliente" })] })] })), _jsxs("div", { className: "customers-toolbar", children: [_jsxs("div", { className: "customers-search-box", children: [_jsx(Search, { size: 18 }), _jsx("input", { type: "text", placeholder: "Buscar cliente por nombre, tel\u00E9fono, correo, nivel, puntos...", value: search, onChange: (e) => setSearch(e.target.value) }), search && (_jsx("button", { type: "button", className: "customers-clear-search", onClick: () => setSearch(""), children: "\u2715" }))] }), _jsxs("div", { className: "customers-count-box", children: [filteredCustomers.length, " de ", customers.length, " clientes"] })] }), _jsx("div", { className: "admin-table-wrapper", children: _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Cliente" }), _jsx("th", { children: "Tel\u00E9fono" }), _jsx("th", { children: "Email" }), _jsx("th", { children: "Puntos" }), _jsx("th", { children: "Nivel" }), _jsx("th", { children: "Gastado" }), _jsx("th", { children: "Visitas" }), _jsx("th", { children: "Tarjeta" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Acciones" })] }) }), _jsxs("tbody", { children: [filteredCustomers.map((customer) => (_jsxs("tr", { children: [_jsx("td", { "data-label": "ID", children: customer.Id }), _jsx("td", { "data-label": "Cliente", children: customer.FullName }), _jsx("td", { "data-label": "Tel\u00E9fono", children: customer.Phone }), _jsx("td", { "data-label": "Email", children: customer.Email }), _jsxs("td", { "data-label": "Puntos", children: ["\uD83C\uDF81 ", customer.Points || 0] }), _jsxs("td", { "data-label": "Nivel", children: ["\u2B50 ", customer.Level || "Silver"] }), _jsxs("td", { "data-label": "Gastado", children: ["$", Number(customer.TotalSpent || 0).toFixed(2)] }), _jsxs("td", { "data-label": "Visitas", children: ["\uD83D\uDCE6 ", customer.Visits || 0] }), _jsx("td", { "data-label": "Tarjeta", children: _jsx("a", { href: customer.QRCode, target: "_blank", rel: "noreferrer", children: customer.CardSlug }) }), _jsx("td", { "data-label": "Status", children: customer.Status || "Activo" }), _jsx("td", { "data-label": "Acciones", children: _jsxs("div", { className: "admin-actions", children: [_jsx("button", { className: "edit-btn", onClick: () => openEditForm(customer), children: _jsx(Pencil, { size: 16 }) }), viewMode === "active" ? (_jsx("button", { className: "delete-btn", onClick: () => deleteCustomer(customer.Id), children: _jsx(Trash2, { size: 16 }) })) : (_jsx("button", { className: "edit-btn", onClick: () => reactivateCustomer(customer.Id), title: "Reactivar cliente", children: _jsx(RotateCcw, { size: 16 }) }))] }) })] }, customer.Id))), filteredCustomers.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: "11", "data-label": "Clientes", children: search
                                                    ? "No se encontraron clientes con esa búsqueda."
                                                    : viewMode === "active"
                                                        ? "No hay clientes activos."
                                                        : "No hay clientes inactivos." }) }))] })] }) })] })] }));
}
export default CustomersAdmin;
