import { useEffect, useState } from "react";

import {
  Plus,
  Pencil,
  Trash2,
  RotateCcw,
  X,
  ImagePlus
} from "lucide-react";

import AdminSidebar from "../../components/AdminSidebar";

const API_URL = import.meta.env.VITE_API_URL;

function SettingsAdmin() {
  const [activeTab, setActiveTab] = useState("brands");

  const [viewMode, setViewMode] = useState("active");

  const [brands, setBrands] = useState([]);
  const [categories, setCategories] = useState([]);
  const [colors, setColors] = useState([]);
  const [banners, setBanners] = useState([]);

  const [showForm, setShowForm] = useState(false);

  const [editingId, setEditingId] = useState(null);

  const [simpleName, setSimpleName] = useState("");

  const [bannerImageFile, setBannerImageFile] = useState(null);

  const [bannerForm, setBannerForm] = useState({
    Title: "",
    Subtitle: "",
    ButtonText: "",
    ButtonLink: "",
    Image: "",
    DisplayOrder: 0,
    Status: "Activo"
  });

  useEffect(() => {
    loadData();
  }, [activeTab, viewMode]);

  const getEndpoint = () => {
    if (activeTab === "brands") {
      return viewMode === "active"
        ? `${API_URL}/api/settings/brands`
        : `${API_URL}/api/settings/brands-inactive`;
    }

    if (activeTab === "categories") {
      return viewMode === "active"
        ? `${API_URL}/api/settings/categories`
        : `${API_URL}/api/settings/categories-inactive`;
    }

    if (activeTab === "colors") {
      return viewMode === "active"
        ? `${API_URL}/api/settings/colors`
        : `${API_URL}/api/settings/colors-inactive`;
    }

    if (activeTab === "banners") {
      return viewMode === "active"
        ? `${API_URL}/api/settings/banners`
        : `${API_URL}/api/settings/banners-inactive`;
    }

    return "";
  };

  const getPostEndpoint = () => {
    if (activeTab === "brands") {
      return `${API_URL}/api/settings/brands`;
    }

    if (activeTab === "categories") {
      return `${API_URL}/api/settings/categories`;
    }

    if (activeTab === "colors") {
      return `${API_URL}/api/settings/colors`;
    }

    if (activeTab === "banners") {
      return `${API_URL}/api/settings/banners`;
    }

    return "";
  };

  const getPutEndpoint = (id) => {
    if (activeTab === "brands") {
      return `${API_URL}/api/settings/brands/${id}`;
    }

    if (activeTab === "categories") {
      return `${API_URL}/api/settings/categories/${id}`;
    }

    if (activeTab === "colors") {
      return `${API_URL}/api/settings/colors/${id}`;
    }

    if (activeTab === "banners") {
      return `${API_URL}/api/settings/banners/${id}`;
    }

    return "";
  };

  const getDeleteEndpoint = (id) => {
    if (activeTab === "brands") {
      return `${API_URL}/api/settings/brands/${id}`;
    }

    if (activeTab === "categories") {
      return `${API_URL}/api/settings/categories/${id}`;
    }

    if (activeTab === "colors") {
      return `${API_URL}/api/settings/colors/${id}`;
    }

    if (activeTab === "banners") {
      return `${API_URL}/api/settings/banners/${id}`;
    }

    return "";
  };

  const getReactivateEndpoint = (id) => {
    if (activeTab === "brands") {
      return `${API_URL}/api/settings/brands/${id}/reactivate`;
    }

    if (activeTab === "categories") {
      return `${API_URL}/api/settings/categories/${id}/reactivate`;
    }

    if (activeTab === "colors") {
      return `${API_URL}/api/settings/colors/${id}/reactivate`;
    }

    if (activeTab === "banners") {
      return `${API_URL}/api/settings/banners/${id}/reactivate`;
    }

    return "";
  };

  const loadData = async () => {
    try {
      const endpoint = getEndpoint();

      if (!endpoint) return;

      const response = await fetch(endpoint);
      const data = await response.json();

      if (activeTab === "brands") {
        setBrands(Array.isArray(data) ? data : []);
      }

      if (activeTab === "categories") {
        setCategories(Array.isArray(data) ? data : []);
      }

      if (activeTab === "colors") {
        setColors(Array.isArray(data) ? data : []);
      }

      if (activeTab === "banners") {
        setBanners(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.log("❌ Error cargando configuración:", err);
    }
  };

  const getCurrentList = () => {
    if (activeTab === "brands") return brands;
    if (activeTab === "categories") return categories;
    if (activeTab === "colors") return colors;
    if (activeTab === "banners") return banners;

    return [];
  };

  const resetForm = () => {
    setSimpleName("");

    setBannerForm({
      Title: "",
      Subtitle: "",
      ButtonText: "",
      ButtonLink: "",
      Image: "",
      DisplayOrder: 0,
      Status: "Activo"
    });

    setBannerImageFile(null);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    resetForm();
    setShowForm(true);
  };

  const openEditForm = (item) => {
    setEditingId(item.Id);

    if (activeTab === "banners") {
      setBannerForm({
        Title: item.Title || "",
        Subtitle: item.Subtitle || "",
        ButtonText: item.ButtonText || "",
        ButtonLink: item.ButtonLink || "",
        Image: item.Image || "",
        DisplayOrder: item.DisplayOrder || 0,
        Status: item.Status || "Activo"
      });
    } else {
      setSimpleName(item.Name || "");
    }

    setShowForm(true);
  };

  const uploadBannerImage = async () => {
    if (!bannerImageFile) {
      return bannerForm.Image;
    }

    const uploadData = new FormData();

    uploadData.append("image", bannerImageFile);

    const uploadResponse = await fetch(`${API_URL}/api/upload`, {
      method: "POST",
      body: uploadData
    });

    const uploadResult = await uploadResponse.json();

    return uploadResult.imageUrl || "";
  };

  const saveItem = async () => {
    try {
      let payload = {};

      if (activeTab === "banners") {
        const imageUrl = await uploadBannerImage();

        payload = {
          ...bannerForm,
          Image: imageUrl,
          DisplayOrder: Number(bannerForm.DisplayOrder || 0)
        };
      } else {
        if (!simpleName.trim()) {
          alert("Escribe un nombre");
          return;
        }

        payload = {
          Name: simpleName.trim(),
          Status: "Activo"
        };
      }

      const url = editingId
        ? getPutEndpoint(editingId)
        : getPostEndpoint();

      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo guardar"
        );

        return;
      }

      alert(
        editingId
          ? "✅ Actualizado correctamente"
          : "✅ Creado correctamente"
      );

      resetForm();
      loadData();
    } catch (err) {
      console.log("❌ Error guardando configuración:", err);
      alert("Error al guardar");
    }
  };

  const deleteItem = async (id) => {
    const confirmDelete = window.confirm(
      "¿Desactivar este elemento?"
    );

    if (!confirmDelete) return;

    try {
      const response = await fetch(getDeleteEndpoint(id), {
        method: "DELETE"
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo desactivar"
        );

        return;
      }

      alert("✅ Desactivado correctamente");

      loadData();
    } catch (err) {
      console.log("❌ Error desactivando:", err);
      alert("Error al desactivar");
    }
  };

  const reactivateItem = async (id) => {
    const confirmReactivate = window.confirm(
      "¿Reactivar este elemento?"
    );

    if (!confirmReactivate) return;

    try {
      const response = await fetch(getReactivateEndpoint(id), {
        method: "PUT"
      });

      const data = await response.json();

      if (!response.ok) {
        alert(
          data.sqlMessage ||
            data.message ||
            "No se pudo reactivar"
        );

        return;
      }

      alert("✅ Reactivado correctamente");

      loadData();
    } catch (err) {
      console.log("❌ Error reactivando:", err);
      alert("Error al reactivar");
    }
  };

  const changeTab = (tab) => {
    setActiveTab(tab);
    setViewMode("active");
    resetForm();
  };

  const tabTitle = {
    brands: "Marcas",
    categories: "Categorías",
    colors: "Colores",
    banners: "Banners"
  };

  const itemLabel = {
    brands: "marca",
    categories: "categoría",
    colors: "color",
    banners: "banner"
  };

  const currentList = getCurrentList();

  return (
    <div className="admin-page">
      <AdminSidebar />

      <main className="admin-content">
        <div className="admin-header-row">
          <div className="admin-header">
            <h1>Configuración</h1>

            <p>
              Administra marcas, categorías, colores y banners de la página.
            </p>
          </div>

          <button
            className="admin-add-btn"
            onClick={openCreateForm}
          >
            <Plus size={18} />
            Nuevo
          </button>
        </div>

        <div className="settings-tabs">
          <button
            className={activeTab === "brands" ? "active" : ""}
            onClick={() => changeTab("brands")}
          >
            Marcas
          </button>

          <button
            className={activeTab === "categories" ? "active" : ""}
            onClick={() => changeTab("categories")}
          >
            Categorías
          </button>

          <button
            className={activeTab === "colors" ? "active" : ""}
            onClick={() => changeTab("colors")}
          >
            Colores
          </button>

          <button
            className={activeTab === "banners" ? "active" : ""}
            onClick={() => changeTab("banners")}
          >
            Banners
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
              resetForm();
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
              resetForm();
            }}
          >
            Inactivos
          </button>
        </div>

        {showForm && (
          <div className="admin-form-card">
            <div className="admin-form-header">
              <h2>
                {editingId
                  ? `Editar ${itemLabel[activeTab]}`
                  : `Nuevo ${itemLabel[activeTab]}`}
              </h2>

              <button
                className="admin-close-btn"
                onClick={resetForm}
              >
                <X size={18} />
              </button>
            </div>

            {activeTab !== "banners" && (
              <div className="admin-form-grid">
                <input
                  type="text"
                  placeholder={`Nombre de ${itemLabel[activeTab]}`}
                  value={simpleName}
                  onChange={(e) => setSimpleName(e.target.value)}
                />

                <button
                  className="admin-save-btn"
                  onClick={saveItem}
                >
                  {editingId ? "Actualizar" : "Guardar"}
                </button>
              </div>
            )}

            {activeTab === "banners" && (
              <div className="admin-form-grid">
                <input
                  type="text"
                  placeholder="Título del banner"
                  value={bannerForm.Title}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      Title: e.target.value
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Subtítulo"
                  value={bannerForm.Subtitle}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      Subtitle: e.target.value
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Texto del botón"
                  value={bannerForm.ButtonText}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      ButtonText: e.target.value
                    })
                  }
                />

                <input
                  type="text"
                  placeholder="Link del botón, ejemplo: /catalog"
                  value={bannerForm.ButtonLink}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      ButtonLink: e.target.value
                    })
                  }
                />

                <input
                  type="number"
                  placeholder="Orden"
                  value={bannerForm.DisplayOrder}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      DisplayOrder: e.target.value
                    })
                  }
                />

                <select
                  value={bannerForm.Status}
                  onChange={(e) =>
                    setBannerForm({
                      ...bannerForm,
                      Status: e.target.value
                    })
                  }
                >
                  <option value="Activo">Activo</option>
                  <option value="Inactivo">Inactivo</option>
                </select>

                <input
                  type="file"
                  onChange={(e) =>
                    setBannerImageFile(e.target.files[0])
                  }
                />

                {bannerForm.Image && (
                  <div className="settings-banner-preview">
                    <img
                      src={`${API_URL}${bannerForm.Image}`}
                      alt={bannerForm.Title}
                    />
                  </div>
                )}

                <button
                  className="admin-save-btn"
                  onClick={saveItem}
                >
                  <ImagePlus size={18} />
                  {editingId ? "Actualizar Banner" : "Guardar Banner"}
                </button>
              </div>
            )}
          </div>
        )}

        <div className="admin-form-card">
          <h2>{tabTitle[activeTab]}</h2>

          <div className="admin-table-wrapper settings-table-wrapper">
            <table className="admin-table">
              <thead>
                {activeTab !== "banners" ? (
                  <tr>
                    <th>ID</th>
                    <th>Nombre</th>
                    <th>Status</th>
                    <th>Acciones</th>
                  </tr>
                ) : (
                  <tr>
                    <th>Imagen</th>
                    <th>Título</th>
                    <th>Botón</th>
                    <th>Orden</th>
                    <th>Status</th>
                    <th>Acciones</th>
                  </tr>
                )}
              </thead>

              <tbody>
                {currentList.map((item) =>
                  activeTab !== "banners" ? (
                    <tr key={item.Id}>
                      <td data-label="ID">
                        {item.Id}
                      </td>

                      <td data-label="Nombre">
                        {item.Name}
                      </td>

                      <td data-label="Status">
                        {item.Status}
                      </td>

                      <td data-label="Acciones">
                        <div className="admin-actions">
                          <button
                            className="edit-btn"
                            onClick={() => openEditForm(item)}
                          >
                            <Pencil size={16} />
                          </button>

                          {viewMode === "active" ? (
                            <button
                              className="delete-btn"
                              onClick={() => deleteItem(item.Id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button
                              className="edit-btn"
                              onClick={() => reactivateItem(item.Id)}
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    <tr key={item.Id}>
                      <td data-label="Imagen">
                        {item.Image ? (
                          <img
                            className="settings-banner-thumb"
                            src={`${API_URL}${item.Image}`}
                            alt={item.Title}
                          />
                        ) : (
                          "Sin imagen"
                        )}
                      </td>

                      <td data-label="Título">
                        <strong>{item.Title}</strong>
                        <p>{item.Subtitle}</p>
                      </td>

                      <td data-label="Botón">
                        {item.ButtonText || "Sin botón"}
                      </td>

                      <td data-label="Orden">
                        {item.DisplayOrder}
                      </td>

                      <td data-label="Status">
                        {item.Status}
                      </td>

                      <td data-label="Acciones">
                        <div className="admin-actions">
                          <button
                            className="edit-btn"
                            onClick={() => openEditForm(item)}
                          >
                            <Pencil size={16} />
                          </button>

                          {viewMode === "active" ? (
                            <button
                              className="delete-btn"
                              onClick={() => deleteItem(item.Id)}
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <button
                              className="edit-btn"
                              onClick={() => reactivateItem(item.Id)}
                            >
                              <RotateCcw size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}

                {currentList.length === 0 && (
                  <tr>
                    <td
                      colSpan={activeTab === "banners" ? "6" : "4"}
                      data-label="Configuración"
                    >
                      {viewMode === "active"
                        ? `No hay ${tabTitle[activeTab].toLowerCase()} activos.`
                        : `No hay ${tabTitle[activeTab].toLowerCase()} inactivos.`}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}

export default SettingsAdmin;