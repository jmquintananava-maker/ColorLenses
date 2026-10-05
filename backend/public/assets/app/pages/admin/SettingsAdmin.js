import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { apiFetch as fetch } from "../../utils/api.js";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2, RotateCcw, X, ImagePlus } from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar.js";
const API_URL = ("" || "");
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
            if (!endpoint)
                return;
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
        }
        catch (err) {
            console.log("❌ Error cargando configuración:", err);
        }
    };
    const getCurrentList = () => {
        if (activeTab === "brands")
            return brands;
        if (activeTab === "categories")
            return categories;
        if (activeTab === "colors")
            return colors;
        if (activeTab === "banners")
            return banners;
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
        }
        else {
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
            }
            else {
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
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo guardar");
                return;
            }
            alert(editingId
                ? "✅ Actualizado correctamente"
                : "✅ Creado correctamente");
            resetForm();
            loadData();
        }
        catch (err) {
            console.log("❌ Error guardando configuración:", err);
            alert("Error al guardar");
        }
    };
    const deleteItem = async (id) => {
        const confirmDelete = window.confirm("¿Desactivar este elemento?");
        if (!confirmDelete)
            return;
        try {
            const response = await fetch(getDeleteEndpoint(id), {
                method: "DELETE"
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo desactivar");
                return;
            }
            alert("✅ Desactivado correctamente");
            loadData();
        }
        catch (err) {
            console.log("❌ Error desactivando:", err);
            alert("Error al desactivar");
        }
    };
    const reactivateItem = async (id) => {
        const confirmReactivate = window.confirm("¿Reactivar este elemento?");
        if (!confirmReactivate)
            return;
        try {
            const response = await fetch(getReactivateEndpoint(id), {
                method: "PUT"
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo reactivar");
                return;
            }
            alert("✅ Reactivado correctamente");
            loadData();
        }
        catch (err) {
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
    return (_jsxs("div", { className: "admin-page", children: [_jsx(AdminSidebar, {}), _jsxs("main", { className: "admin-content", children: [_jsxs("div", { className: "admin-header-row", children: [_jsxs("div", { className: "admin-header", children: [_jsx("h1", { children: "Configuraci\u00F3n" }), _jsx("p", { children: "Administra marcas, categor\u00EDas, colores y banners de la p\u00E1gina." })] }), _jsxs("button", { className: "admin-add-btn", onClick: openCreateForm, children: [_jsx(Plus, { size: 18 }), "Nuevo"] })] }), _jsxs("div", { className: "settings-tabs", children: [_jsx("button", { className: activeTab === "brands" ? "active" : "", onClick: () => changeTab("brands"), children: "Marcas" }), _jsx("button", { className: activeTab === "categories" ? "active" : "", onClick: () => changeTab("categories"), children: "Categor\u00EDas" }), _jsx("button", { className: activeTab === "colors" ? "active" : "", onClick: () => changeTab("colors"), children: "Colores" }), _jsx("button", { className: activeTab === "banners" ? "active" : "", onClick: () => changeTab("banners"), children: "Banners" })] }), _jsxs("div", { className: "product-mode-buttons", children: [_jsx("button", { className: viewMode === "active"
                                    ? "product-mode-btn active"
                                    : "product-mode-btn", onClick: () => {
                                    setViewMode("active");
                                    resetForm();
                                }, children: "Activos" }), _jsx("button", { className: viewMode === "inactive"
                                    ? "product-mode-btn active"
                                    : "product-mode-btn", onClick: () => {
                                    setViewMode("inactive");
                                    resetForm();
                                }, children: "Inactivos" })] }), showForm && (_jsxs("div", { className: "admin-form-card", children: [_jsxs("div", { className: "admin-form-header", children: [_jsx("h2", { children: editingId
                                            ? `Editar ${itemLabel[activeTab]}`
                                            : `Nuevo ${itemLabel[activeTab]}` }), _jsx("button", { className: "admin-close-btn", onClick: resetForm, children: _jsx(X, { size: 18 }) })] }), activeTab !== "banners" && (_jsxs("div", { className: "admin-form-grid", children: [_jsx("input", { type: "text", placeholder: `Nombre de ${itemLabel[activeTab]}`, value: simpleName, onChange: (e) => setSimpleName(e.target.value) }), _jsx("button", { className: "admin-save-btn", onClick: saveItem, children: editingId ? "Actualizar" : "Guardar" })] })), activeTab === "banners" && (_jsxs("div", { className: "admin-form-grid", children: [_jsx("input", { type: "text", placeholder: "T\u00EDtulo del banner", value: bannerForm.Title, onChange: (e) => setBannerForm({
                                            ...bannerForm,
                                            Title: e.target.value
                                        }) }), _jsx("input", { type: "text", placeholder: "Subt\u00EDtulo", value: bannerForm.Subtitle, onChange: (e) => setBannerForm({
                                            ...bannerForm,
                                            Subtitle: e.target.value
                                        }) }), _jsx("input", { type: "text", placeholder: "Texto del bot\u00F3n", value: bannerForm.ButtonText, onChange: (e) => setBannerForm({
                                            ...bannerForm,
                                            ButtonText: e.target.value
                                        }) }), _jsx("input", { type: "text", placeholder: "Link del bot\u00F3n, ejemplo: /catalog", value: bannerForm.ButtonLink, onChange: (e) => setBannerForm({
                                            ...bannerForm,
                                            ButtonLink: e.target.value
                                        }) }), _jsx("input", { type: "number", placeholder: "Orden", value: bannerForm.DisplayOrder, onChange: (e) => setBannerForm({
                                            ...bannerForm,
                                            DisplayOrder: e.target.value
                                        }) }), _jsxs("select", { value: bannerForm.Status, onChange: (e) => setBannerForm({
                                            ...bannerForm,
                                            Status: e.target.value
                                        }), children: [_jsx("option", { value: "Activo", children: "Activo" }), _jsx("option", { value: "Inactivo", children: "Inactivo" })] }), _jsx("input", { type: "file", onChange: (e) => setBannerImageFile(e.target.files[0]) }), bannerForm.Image && (_jsx("div", { className: "settings-banner-preview", children: _jsx("img", { src: `${API_URL}${bannerForm.Image}`, alt: bannerForm.Title }) })), _jsxs("button", { className: "admin-save-btn", onClick: saveItem, children: [_jsx(ImagePlus, { size: 18 }), editingId ? "Actualizar Banner" : "Guardar Banner"] })] }))] })), _jsxs("div", { className: "admin-form-card", children: [_jsx("h2", { children: tabTitle[activeTab] }), _jsx("div", { className: "admin-table-wrapper settings-table-wrapper", children: _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: activeTab !== "banners" ? (_jsxs("tr", { children: [_jsx("th", { children: "ID" }), _jsx("th", { children: "Nombre" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Acciones" })] })) : (_jsxs("tr", { children: [_jsx("th", { children: "Imagen" }), _jsx("th", { children: "T\u00EDtulo" }), _jsx("th", { children: "Bot\u00F3n" }), _jsx("th", { children: "Orden" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Acciones" })] })) }), _jsxs("tbody", { children: [currentList.map((item) => activeTab !== "banners" ? (_jsxs("tr", { children: [_jsx("td", { "data-label": "ID", children: item.Id }), _jsx("td", { "data-label": "Nombre", children: item.Name }), _jsx("td", { "data-label": "Status", children: item.Status }), _jsx("td", { "data-label": "Acciones", children: _jsxs("div", { className: "admin-actions", children: [_jsx("button", { className: "edit-btn", onClick: () => openEditForm(item), children: _jsx(Pencil, { size: 16 }) }), viewMode === "active" ? (_jsx("button", { className: "delete-btn", onClick: () => deleteItem(item.Id), children: _jsx(Trash2, { size: 16 }) })) : (_jsx("button", { className: "edit-btn", onClick: () => reactivateItem(item.Id), children: _jsx(RotateCcw, { size: 16 }) }))] }) })] }, item.Id)) : (_jsxs("tr", { children: [_jsx("td", { "data-label": "Imagen", children: item.Image ? (_jsx("img", { className: "settings-banner-thumb", src: `${API_URL}${item.Image}`, alt: item.Title })) : ("Sin imagen") }), _jsxs("td", { "data-label": "T\u00EDtulo", children: [_jsx("strong", { children: item.Title }), _jsx("p", { children: item.Subtitle })] }), _jsx("td", { "data-label": "Bot\u00F3n", children: item.ButtonText || "Sin botón" }), _jsx("td", { "data-label": "Orden", children: item.DisplayOrder }), _jsx("td", { "data-label": "Status", children: item.Status }), _jsx("td", { "data-label": "Acciones", children: _jsxs("div", { className: "admin-actions", children: [_jsx("button", { className: "edit-btn", onClick: () => openEditForm(item), children: _jsx(Pencil, { size: 16 }) }), viewMode === "active" ? (_jsx("button", { className: "delete-btn", onClick: () => deleteItem(item.Id), children: _jsx(Trash2, { size: 16 }) })) : (_jsx("button", { className: "edit-btn", onClick: () => reactivateItem(item.Id), children: _jsx(RotateCcw, { size: 16 }) }))] }) })] }, item.Id))), currentList.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: activeTab === "banners" ? "6" : "4", "data-label": "Configuraci\u00F3n", children: viewMode === "active"
                                                            ? `No hay ${tabTitle[activeTab].toLowerCase()} activos.`
                                                            : `No hay ${tabTitle[activeTab].toLowerCase()} inactivos.` }) }))] })] }) })] })] })] }));
}
export default SettingsAdmin;
