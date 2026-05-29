import { useEffect, useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  X,
  RotateCcw
} from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

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

  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    getCustomers();
  }, [viewMode]);

  const getCustomers = async () => {
    try {
      const endpoint =
        viewMode === "active"
          ? `${API_URL}/api/customers`
          : `${API_URL}/api/customers-inactive`;

      const response = await fetch(endpoint);
      const data = await response.json();

      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.log(err);
    }
  };

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

        alert(
          data.sqlMessage ||
          data.message ||
          "No se pudo guardar el cliente"
        );

        return;
      }

      setShowForm(false);
      setForm(emptyForm);
      setEditingId(null);
      getCustomers();
    } catch (err) {
      console.log("❌ Error frontend save customer:", err);

      alert("Error al guardar cliente");
    }
  };

  const deleteCustomer = async (id) => {
    const confirmDelete = window.confirm(
      "¿Desactivar cliente? Ya no aparecerá en ventas, pero se conservará su historial."
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(`${API_URL}/api/customers/${id}`, {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        console.log("❌ Error al desactivar:", data);

        alert(
          data.sqlMessage ||
          data.message ||
          "No se pudo desactivar el cliente"
        );

        return;
      }

      alert("✅ Cliente desactivado");
      getCustomers();
    } catch (err) {
      console.log("❌ Error frontend delete customer:", err);

      alert("Error al desactivar cliente");
    }
  };

  const reactivateCustomer = async (id) => {
    const confirmReactivate = window.confirm(
      "¿Reactivar cliente? Volverá a aparecer en ventas y conservará su historial."
    );

    if (!confirmReactivate) return;

    try {
      const response = await fetch(
        `${API_URL}/api/customers/${id}/reactivate`,
        {
          method: "PUT"
        }
      );

      const data = await response.json();

      if (!response.ok) {
        console.log("❌ Error al reactivar:", data);

        alert(
          data.sqlMessage ||
          data.message ||
          "No se pudo reactivar el cliente"
        );

        return;
      }

      alert("✅ Cliente reactivado");
      getCustomers();
    } catch (err) {
      console.log("❌ Error frontend reactivate customer:", err);

      alert("Error al reactivar cliente");
    }
  };

  return (
    <div className="admin-page">
      <AdminSidebar />

      <main className="admin-content">
        <div className="admin-header admin-header-row">
          <div>
            <h1>Clientes</h1>

            <p>
              Registra clientes, administra tarjetas digitales y puntos.
            </p>
          </div>

          <button
            className="admin-add-btn"
            onClick={openCreateForm}
          >
            <Plus size={20} />
            Nuevo Cliente
          </button>
        </div>

        <div className="product-mode-buttons">
          <button
            className={
              viewMode === "active"
                ? "product-mode-btn active"
                : "product-mode-btn"
            }
            onClick={() => {
              setViewMode("active");
              setShowForm(false);
              setForm(emptyForm);
              setEditingId(null);
            }}
          >
            Activos
          </button>

          <button
            className={
              viewMode === "inactive"
                ? "product-mode-btn active"
                : "product-mode-btn"
            }
            onClick={() => {
              setViewMode("inactive");
              setShowForm(false);
              setForm(emptyForm);
              setEditingId(null);
            }}
          >
            Inactivos
          </button>
        </div>

        {showForm && (
          <div className="admin-form-card">
            <div className="admin-form-header">
              <h2>
                {editingId ? "Editar Cliente" : "Nuevo Cliente"}
              </h2>

              <button
                className="admin-close-btn"
                onClick={() => setShowForm(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveCustomer} className="admin-form-grid">
              <input
                name="FullName"
                placeholder="Nombre completo"
                value={form.FullName}
                onChange={handleChange}
                required
              />

              <input
                name="Phone"
                placeholder="Teléfono"
                value={form.Phone}
                onChange={handleChange}
              />

              <input
                name="Email"
                placeholder="Correo"
                value={form.Email}
                onChange={handleChange}
              />

              <select
                name="Status"
                value={form.Status}
                onChange={handleChange}
              >
                <option value="Activo">Activo</option>
                <option value="Inactivo">Inactivo</option>
              </select>

              <input
                name="Points"
                type="number"
                min="0"
                placeholder="Puntos"
                value={form.Points}
                onChange={handleChange}
              />

              <select
                name="Level"
                value={form.Level}
                onChange={handleChange}
              >
                <option value="Silver">Silver</option>
                <option value="Gold">Gold</option>
                <option value="Black">Black</option>
              </select>

              <input
                name="CardSlug"
                placeholder="Slug tarjeta"
                value={form.CardSlug}
                onChange={handleChange}
              />

              <input
                name="QRCode"
                placeholder="Ruta QR / tarjeta"
                value={form.QRCode}
                onChange={handleChange}
              />

              <textarea
                name="Notes"
                placeholder="Notas"
                value={form.Notes}
                onChange={handleChange}
              />

              <button className="admin-save-btn" type="submit">
                {editingId ? "Actualizar Cliente" : "Guardar Cliente"}
              </button>
            </form>
          </div>
        )}

        <div className="admin-table-wrapper">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Teléfono</th>
                <th>Email</th>
                <th>Puntos</th>
                <th>Nivel</th>
                <th>Gastado</th>
                <th>Visitas</th>
                <th>Tarjeta</th>
                <th>Status</th>
                <th>Acciones</th>
              </tr>
            </thead>

            <tbody>
              {customers.map((customer) => (
                <tr key={customer.Id}>
                  <td data-label="ID">
                    {customer.Id}
                  </td>

                  <td data-label="Cliente">
                    {customer.FullName}
                  </td>

                  <td data-label="Teléfono">
                    {customer.Phone}
                  </td>

                  <td data-label="Email">
                    {customer.Email}
                  </td>

                  <td data-label="Puntos">
                    🎁 {customer.Points || 0}
                  </td>

                  <td data-label="Nivel">
                    ⭐ {customer.Level || "Silver"}
                  </td>

                  <td data-label="Gastado">
                    $
                    {Number(
                      customer.TotalSpent || 0
                    ).toFixed(2)}
                  </td>

                  <td data-label="Visitas">
                    📦 {customer.Visits || 0}
                  </td>

                  <td data-label="Tarjeta">
                    <a
                      href={customer.QRCode}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {customer.CardSlug}
                    </a>
                  </td>

                  <td data-label="Status">
                    {customer.Status || "Activo"}
                  </td>

                  <td data-label="Acciones">
                    <div className="admin-actions">
                      <button
                        className="edit-btn"
                        onClick={() => openEditForm(customer)}
                      >
                        <Pencil size={16} />
                      </button>

                      {viewMode === "active" ? (
                        <button
                          className="delete-btn"
                          onClick={() =>
                            deleteCustomer(customer.Id)
                          }
                        >
                          <Trash2 size={16} />
                        </button>
                      ) : (
                        <button
                          className="edit-btn"
                          onClick={() =>
                            reactivateCustomer(customer.Id)
                          }
                          title="Reactivar cliente"
                        >
                          <RotateCcw size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {customers.length === 0 && (
                <tr>
                  <td
                    colSpan="11"
                    data-label="Clientes"
                  >
                    {viewMode === "active"
                      ? "No hay clientes activos."
                      : "No hay clientes inactivos."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}

export default CustomersAdmin;