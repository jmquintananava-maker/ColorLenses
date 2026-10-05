import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { request } from "../../utils/api.js";
import ProductFilters, { emptyFilters } from "../../components/ProductFilters.js";
import { matchesProduct as matchesProductFilters, categoryKey } from "../../utils/productFilters.js";
import { apiFetch as fetch } from "../../utils/api.js";
import { useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { Pencil, Trash2, Plus, RotateCcw, Download, Search, ChevronLeft, ChevronRight, Images } from "lucide-react";
import AdminSidebar from "../../components/AdminSidebar.js";
const API_URL = ("" || "");
const PAGE_SIZE = 10;
function ProductsAdmin() {
    const [products, setProducts] = useState([]);
    const [brands, setBrands] = useState([]);
    const [categories, setCategories] = useState([]);
    const [colors, setColors] = useState([]);
    const [powers, setPowers] = useState([]);
    const [viewMode, setViewMode] = useState(() => new URLSearchParams(window.location.search).get("view") === "pending" ? "pending" : "active");
    const [search, setSearch] = useState("");
    const [advancedFilters, setAdvancedFilters] = useState({ ...emptyFilters });
    const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
    const [codeSearch, setCodeSearch] = useState("");
    const [codeSearchMessage, setCodeSearchMessage] = useState("");
    const [isCodeSearching, setIsCodeSearching] = useState(false);
    const [showSearchCodeScanner, setShowSearchCodeScanner] = useState(false);
    const [searchScannerCameras, setSearchScannerCameras] = useState([]);
    const [selectedSearchScannerCameraId, setSelectedSearchScannerCameraId] = useState("");
    const [isSearchCodeScannerStarting, setIsSearchCodeScannerStarting] = useState(false);
    const [brandFilter, setBrandFilter] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [productFilter, setProductFilter] = useState("");
    const [powerFilter, setPowerFilter] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [showForm, setShowForm] = useState(false);
    const [editingVariantId, setEditingVariantId] = useState(null);
    const [editingProductId, setEditingProductId] = useState(null);
    const [imageFile, setImageFile] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [showGalleryForm, setShowGalleryForm] = useState(false);
    const [selectedGalleryProduct, setSelectedGalleryProduct] = useState(null);
    const [isGallerySaving, setIsGallerySaving] = useState(false);
    const [galleryForm, setGalleryForm] = useState({
        Image: "",
        Image2: "",
        Image3: ""
    });
    const [galleryFiles, setGalleryFiles] = useState({
        Image: null,
        Image2: null,
        Image3: null
    });
    const [showCodeScanner, setShowCodeScanner] = useState(false);
    const [scannerMessage, setScannerMessage] = useState("");
    const [scannerCameras, setScannerCameras] = useState([]);
    const [selectedScannerCameraId, setSelectedScannerCameraId] = useState("");
    const [isCodeScannerStarting, setIsCodeScannerStarting] = useState(false);
    const codeScannerRef = useRef(null);
    const codeScannerProcessingRef = useRef(false);
    const audioContextRef = useRef(null);
    const [formData, setFormData] = useState({
        SKU: "",
        Category: "",
        Marca: "",
        Modelo: "",
        Description: "",
        Image: "",
        Image2: "",
        Image3: "",
        Color: "",
        Power: "0.00",
        PowerLabel: "Sin graduación",
        Price: "",
        Stock: "",
        CodeMode: "FACTORY",
        CodeType: "BARCODE",
        FactoryCode: "",
        InternalCode: "",
        ScanCode: ""
    });
    useEffect(() => {
        loadProducts();
    }, [viewMode]);
    useEffect(() => {
        loadSettingsOptions();
    }, []);
    useEffect(() => {
        return () => {
            stopCodeScanner();
        };
    }, []);
    useEffect(() => {
        setCurrentPage(1);
    }, [
        search,
        brandFilter,
        categoryFilter,
        productFilter,
        powerFilter,
        viewMode
    ]);
    const normalizeText = (value) => {
        return String(value || "").trim().toLowerCase();
    };
    const getVariantId = (product) => {
        return Number(product.ProductVariantId || product.Id || 0);
    };
    const getProductId = (product) => {
        return Number(product.ProductId || 0);
    };
    const getImageUrl = (image) => {
        if (!image)
            return "";
        return String(image).startsWith("http")
            ? image
            : `${API_URL}${image}`;
    };
    const normalizeProductVariant = (product) => {
        return {
            ...product,
            ProductVariantId: product.ProductVariantId ||
                product.VariantId ||
                product.Id,
            ProductId: product.ProductId ||
                product.ProductID,
            SKU: product.SKU || "",
            Category: product.Category || "",
            Marca: product.Marca || "",
            Modelo: product.Modelo || "",
            Description: product.Description || "",
            Image: product.Image || "",
            Image2: product.Image2 || "",
            Image3: product.Image3 || "",
            Color: product.Color || "",
            Power: product.Power ?? 0,
            PowerLabel: product.PowerLabel ||
                (Number(product.Power || 0) === 0
                    ? "Sin graduación"
                    : Number(product.Power || 0).toFixed(2)),
            Price: Number(product.Price || 0),
            Stock: Number(product.Stock || 0),
            FactoryCode: product.FactoryCode || "",
            InternalCode: product.InternalCode || "",
            ScanCode: product.ScanCode ||
                product.FactoryCode ||
                product.InternalCode ||
                "",
            CodeType: product.CodeType || "INTERNAL",
            Status: product.Status || "Activo",
            ProductStatus: product.ProductStatus || "Activo"
        };
    };
    const unlockScanSound = () => {
        try {
            const AudioContext = window.AudioContext ||
                window.webkitAudioContext;
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            if (audioContextRef.current.state === "suspended") {
                audioContextRef.current.resume();
            }
        }
        catch (err) {
            console.log("No se pudo activar audio:", err);
        }
    };
    const playScanSound = () => {
        try {
            const AudioContext = window.AudioContext ||
                window.webkitAudioContext;
            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext();
            }
            const audioContext = audioContextRef.current;
            if (audioContext.state === "suspended") {
                audioContext.resume();
            }
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(880, audioContext.currentTime);
            gainNode.gain.setValueAtTime(0.001, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.25, audioContext.currentTime + 0.01);
            gainNode.gain.exponentialRampToValueAtTime(0.001, audioContext.currentTime + 0.18);
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            if (navigator.vibrate) {
                navigator.vibrate(80);
            }
        }
        catch (err) {
            console.log("No se pudo reproducir sonido:", err);
        }
    };
    const loadSettingsOptions = async () => {
        try {
            const [brandsRes, categoriesRes, colorsRes, powersRes] = await Promise.all([
                fetch(`${API_URL}/api/settings/brands`),
                fetch(`${API_URL}/api/settings/categories`),
                fetch(`${API_URL}/api/settings/colors`),
                fetch(`${API_URL}/api/powers`)
            ]);
            const brandsData = await brandsRes.json();
            const categoriesData = await categoriesRes.json();
            const colorsData = await colorsRes.json();
            const powersData = await powersRes.json();
            setBrands(Array.isArray(brandsData) ? brandsData : []);
            setCategories(Array.isArray(categoriesData) ? categoriesData : []);
            setColors(Array.isArray(colorsData) ? colorsData : []);
            setPowers(Array.isArray(powersData) ? powersData : []);
        }
        catch (err) {
            console.log("❌ Error cargando opciones:", err);
        }
    };
    const loadProducts = async () => {
        try {
            const endpoint = viewMode === "pending"
                ? `${API_URL}/api/inventory/drafts`
                : viewMode === "active"
                    ? `${API_URL}/api/product-variants`
                    : `${API_URL}/api/product-variants-inactive`;
            const response = await fetch(endpoint);
            const data = await response.json();
            const sortedData = Array.isArray(data)
                ? [...data]
                    .map(normalizeProductVariant)
                    .sort((a, b) => getVariantId(b) - getVariantId(a))
                : [];
            setProducts(sortedData);
        }
        catch (err) {
            console.log("❌ Error cargando variantes:", err);
        }
    };
    const uniqueProductModels = useMemo(() => {
        const models = products
            .map((product) => product.Modelo)
            .filter(Boolean);
        return [...new Set(models)].sort((a, b) => String(a).localeCompare(String(b)));
    }, [products]);
    const filteredProducts = useMemo(() => {
        const searchText = normalizeText(search);
        const cleanBrandFilter = normalizeText(brandFilter);
        const cleanCategoryFilter = normalizeText(categoryFilter);
        const cleanProductFilter = normalizeText(productFilter);
        const cleanPowerFilter = normalizeText(powerFilter);
        const filtered = products.filter((product) => {
            const productBrand = normalizeText(product.Marca);
            const productCategory = normalizeText(product.Category);
            const productModel = normalizeText(product.Modelo);
            const productPower = normalizeText(product.PowerLabel);
            const matchesBrand = !cleanBrandFilter || productBrand === cleanBrandFilter;
            const matchesCategory = !cleanCategoryFilter || productCategory === cleanCategoryFilter;
            const matchesProduct = !cleanProductFilter || productModel === cleanProductFilter;
            const matchesPower = !cleanPowerFilter || productPower === cleanPowerFilter;
            const matchesSearch = !searchText ||
                String(product.ProductVariantId || product.Id || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.ProductId || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Category || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Modelo || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Marca || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Color || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.PowerLabel || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Power || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Price || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Stock || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.ScanCode || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.FactoryCode || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.InternalCode || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.CodeType || "")
                    .toLowerCase()
                    .includes(searchText) ||
                String(product.Status || "")
                    .toLowerCase()
                    .includes(searchText);
            return (matchesProductFilters(product, advancedFilters) &&
                matchesBrand &&
                matchesCategory &&
                matchesProduct &&
                matchesPower &&
                matchesSearch);
        });
        return filtered.sort((a, b) => getVariantId(b) - getVariantId(a));
    }, [
        products,
        search,
        brandFilter,
        categoryFilter,
        productFilter,
        powerFilter,
        advancedFilters
    ]);
    const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
    const safeCurrentPage = Math.min(currentPage, totalPages);
    const paginatedProducts = useMemo(() => {
        const startIndex = (safeCurrentPage - 1) * PAGE_SIZE;
        const endIndex = startIndex + PAGE_SIZE;
        return filteredProducts.slice(startIndex, endIndex);
    }, [filteredProducts, safeCurrentPage]);
    const showingStart = filteredProducts.length === 0
        ? 0
        : (safeCurrentPage - 1) * PAGE_SIZE + 1;
    const showingEnd = Math.min(safeCurrentPage * PAGE_SIZE, filteredProducts.length);
    const clearFilters = () => {
        setAdvancedFilters({ ...emptyFilters });
        setSearch("");
        setBrandFilter("");
        setCategoryFilter("");
        setProductFilter("");
        setPowerFilter("");
        setCodeSearch("");
        setCodeSearchMessage("");
        setShowSearchCodeScanner(false);
        setCurrentPage(1);
    };
    const findVariantByCode = (code, list = products) => {
        const cleanCode = normalizeText(code);
        if (!cleanCode)
            return null;
        return list.find((product) => {
            const candidates = [
                product.ScanCode,
                product.FactoryCode,
                product.InternalCode,
                product.ProductVariantId,
                product.Id
            ]
                .map((value) => normalizeText(value))
                .filter(Boolean);
            return candidates.some((candidate) => {
                return candidate === cleanCode || candidate.includes(cleanCode);
            });
        });
    };
    const getApiProductFromResponse = (data) => {
        if (!data)
            return null;
        if (Array.isArray(data)) {
            return data[0] || null;
        }
        if (data.product)
            return data.product;
        if (data.variant)
            return data.variant;
        if (data.item)
            return data.item;
        if (data.data)
            return getApiProductFromResponse(data.data);
        return data;
    };
    const searchProductByCode = async (forcedCode = null) => {
        if (isCodeSearching)
            return;
        const cleanCode = String(forcedCode || codeSearch || "").trim();
        if (!cleanCode) {
            setCodeSearchMessage("Escribe o escanea un código primero.");
            return;
        }
        try {
            setIsCodeSearching(true);
            setCodeSearchMessage("Buscando producto...");
            let foundProduct = findVariantByCode(cleanCode, products);
            if (foundProduct) {
                setCodeSearchMessage(`✅ Producto encontrado: ${foundProduct.Marca} ${foundProduct.Modelo}`);
                editProduct(foundProduct);
                setIsCodeSearching(false);
                return;
            }
            try {
                const scanResponse = await fetch(`${API_URL}/api/products/scan/${encodeURIComponent(cleanCode)}`);
                const scanData = await scanResponse.json().catch(() => null);
                if (scanResponse.ok) {
                    const apiProduct = getApiProductFromResponse(scanData);
                    if (apiProduct) {
                        foundProduct = normalizeProductVariant(apiProduct);
                    }
                }
            }
            catch (err) {
                console.log("No se encontró con endpoint scan:", err);
            }
            if (foundProduct && (foundProduct.ProductVariantId || foundProduct.Id)) {
                setCodeSearchMessage(`✅ Producto encontrado: ${foundProduct.Marca} ${foundProduct.Modelo}`);
                editProduct(foundProduct);
                setIsCodeSearching(false);
                return;
            }
            const [activeRes, inactiveRes] = await Promise.all([
                fetch(`${API_URL}/api/product-variants`),
                fetch(`${API_URL}/api/product-variants-inactive`)
            ]);
            const activeData = await activeRes.json();
            const inactiveData = await inactiveRes.json();
            const activeList = Array.isArray(activeData)
                ? activeData.map(normalizeProductVariant)
                : [];
            const inactiveList = Array.isArray(inactiveData)
                ? inactiveData.map(normalizeProductVariant)
                : [];
            foundProduct =
                findVariantByCode(cleanCode, activeList) ||
                    findVariantByCode(cleanCode, inactiveList);
            if (!foundProduct) {
                setCodeSearchMessage("No se encontró ningún producto con ese código.");
                setIsCodeSearching(false);
                return;
            }
            const foundIsInactive = String(foundProduct.Status || "Activo") === "Inactivo";
            if (foundIsInactive) {
                setViewMode("inactive");
                setProducts(inactiveList.sort((a, b) => getVariantId(b) - getVariantId(a)));
            }
            else {
                setViewMode("active");
                setProducts(activeList.sort((a, b) => getVariantId(b) - getVariantId(a)));
            }
            setCodeSearchMessage(`✅ Producto encontrado: ${foundProduct.Marca} ${foundProduct.Modelo}`);
            editProduct(foundProduct);
            setIsCodeSearching(false);
        }
        catch (err) {
            console.log("❌ Error buscando por código:", err);
            setCodeSearchMessage(err.message || "Error buscando producto por código.");
            setIsCodeSearching(false);
        }
    };
    const releaseSearchCodeScanner = (clearDelay = 1800) => {
        setTimeout(() => {
            codeScannerProcessingRef.current = false;
        }, 1000);
        setTimeout(() => {
            setCodeSearchMessage("");
        }, clearDelay);
    };
    const startSearchCodeScanner = async (cameraId = null) => {
        if (isSearchCodeScannerStarting)
            return;
        try {
            setIsSearchCodeScannerStarting(true);
            const reader = document.getElementById("products-admin-search-code-reader");
            if (reader) {
                reader.innerHTML = "";
            }
            await stopCodeScanner();
            codeScannerProcessingRef.current = false;
            const finalCameraId = cameraId || selectedSearchScannerCameraId;
            if (!finalCameraId) {
                setCodeSearchMessage("No se encontró cámara seleccionada");
                setIsSearchCodeScannerStarting(false);
                return;
            }
            const scanner = new Html5Qrcode("products-admin-search-code-reader", {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.DATA_MATRIX
                ]
            });
            codeScannerRef.current = scanner;
            const config = {
                fps: 10,
                qrbox: {
                    width: window.innerWidth < 768 ? 260 : 280,
                    height: window.innerWidth < 768 ? 180 : 180
                },
                aspectRatio: 1.333
            };
            await scanner.start(finalCameraId, config, async (decodedText) => {
                if (codeScannerProcessingRef.current)
                    return;
                codeScannerProcessingRef.current = true;
                const cleanCode = String(decodedText || "").trim();
                if (!cleanCode) {
                    codeScannerProcessingRef.current = false;
                    return;
                }
                const lowerCode = cleanCode.toLowerCase();
                const looksLikeCustomerQR = lowerCode.includes("/admin/sales/") ||
                    lowerCode.includes("/card/") ||
                    lowerCode.includes("/customer/");
                if (looksLikeCustomerQR) {
                    setCodeSearchMessage("Este QR es de cliente. Aquí debes escanear un código de producto.");
                    releaseSearchCodeScanner(2200);
                    return;
                }
                playScanSound();
                setCodeSearch(cleanCode);
                setCodeSearchMessage(`✅ Código leído: ${cleanCode}`);
                await stopCodeScanner();
                setShowSearchCodeScanner(false);
                setTimeout(() => {
                    searchProductByCode(cleanCode);
                }, 120);
            }, () => { });
            setIsSearchCodeScannerStarting(false);
            setCodeSearchMessage("");
        }
        catch (err) {
            console.log("❌ Error startSearchCodeScanner:", err);
            setIsSearchCodeScannerStarting(false);
            codeScannerProcessingRef.current = false;
            setCodeSearchMessage("No se pudo acceder a la cámara. Cierra otras pestañas que usen cámara o revisa permisos del navegador.");
        }
    };
    const openSearchCodeScanner = async () => {
        try {
            unlockScanSound();
            await stopCodeScanner();
            codeScannerProcessingRef.current = false;
            setShowSearchCodeScanner(true);
            setCodeSearchMessage("Cargando cámara...");
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                setCodeSearchMessage("No se encontró cámara disponible");
                return;
            }
            setSearchScannerCameras(cameras);
            const preferredCamera = getPreferredScannerCamera(cameras);
            if (!preferredCamera) {
                setCodeSearchMessage("No se encontró cámara disponible");
                return;
            }
            setSelectedSearchScannerCameraId(preferredCamera.id);
            setTimeout(() => {
                startSearchCodeScanner(preferredCamera.id);
            }, 300);
        }
        catch (err) {
            console.log("❌ Error openSearchCodeScanner:", err);
            codeScannerProcessingRef.current = false;
            setCodeSearchMessage("No se pudo abrir el escáner. Revisa permisos o cierra otra pestaña que use cámara.");
        }
    };
    const changeSearchCodeScannerCamera = async (cameraId) => {
        setSelectedSearchScannerCameraId(cameraId);
        codeScannerProcessingRef.current = false;
        setCodeSearchMessage("Cambiando cámara...");
        await startSearchCodeScanner(cameraId);
    };
    const closeSearchCodeScanner = async () => {
        await stopCodeScanner();
        codeScannerProcessingRef.current = false;
        setCodeSearchMessage("");
        setShowSearchCodeScanner(false);
    };
    const getPowerLabel = (powerValue) => {
        const cleanPower = Number(powerValue || 0);
        if (cleanPower === 0) {
            return "Sin graduación";
        }
        const foundPower = powers.find((item) => Number(item.Power) === cleanPower);
        if (foundPower) {
            return foundPower.PowerLabel;
        }
        return cleanPower.toFixed(2);
    };
    const getSuggestedPrice = (powerValue, brandValue = formData.Marca) => {
        const cleanPower = Number(powerValue || 0);
        const cleanBrand = normalizeText(brandValue);
        if (cleanBrand.includes("urban") && cleanPower === 0) {
            return 350;
        }
        if (cleanBrand.includes("urban") && cleanPower !== 0) {
            return 700;
        }
        return formData.Price;
    };
    const handleChange = (e) => {
        const { name, value } = e.target;
        if (name === "Power") {
            const nextPowerLabel = getPowerLabel(value);
            setFormData((prev) => ({
                ...prev,
                Power: value,
                PowerLabel: nextPowerLabel,
                Price: prev.Marca &&
                    normalizeText(prev.Marca).includes("urban")
                    ? getSuggestedPrice(value, prev.Marca)
                    : prev.Price
            }));
            return;
        }
        if (name === "Marca") {
            const cleanPower = Number(formData.Power || 0);
            setFormData((prev) => ({
                ...prev,
                Marca: value,
                Price: normalizeText(value).includes("urban")
                    ? cleanPower === 0
                        ? 350
                        : 700
                    : prev.Price
            }));
            return;
        }
        if (name === "CodeMode") {
            if (value === "INTERNAL") {
                setFormData((prev) => ({
                    ...prev,
                    CodeMode: value,
                    CodeType: "INTERNAL",
                    FactoryCode: "",
                    ScanCode: ""
                }));
            }
            else {
                setFormData((prev) => ({
                    ...prev,
                    CodeMode: value,
                    CodeType: "BARCODE",
                    InternalCode: "",
                    ScanCode: prev.FactoryCode || ""
                }));
            }
            return;
        }
        if (name === "FactoryCode") {
            setFormData((prev) => ({
                ...prev,
                FactoryCode: value,
                ScanCode: value
            }));
            return;
        }
        setFormData((prev) => ({
            ...prev,
            [name]: value
        }));
    };
    const handleImage = (e) => {
        setImageFile(e.target.files[0]);
    };
    const resetForm = () => {
        setFormData({
            SKU: "",
            Category: "",
            Marca: "",
            Modelo: "",
            Description: "",
            Image: "",
            Image2: "",
            Image3: "",
            Color: "",
            Power: "0.00",
            PowerLabel: "Sin graduación",
            Price: "",
            Stock: "",
            CodeMode: "FACTORY",
            CodeType: "BARCODE",
            FactoryCode: "",
            InternalCode: "",
            ScanCode: ""
        });
        setEditingVariantId(null);
        setEditingProductId(null);
        setImageFile(null);
        setShowCodeScanner(false);
        setScannerMessage("");
        setIsSaving(false);
    };
    const openCreateForm = () => {
        resetForm();
        setShowForm(true);
        setShowGalleryForm(false);
    };
    const closeProductForm = async () => {
        await stopCodeScanner();
        setShowForm(false);
        resetForm();
    };
    const validateForm = () => {
        if (!formData.Category) {
            alert("Selecciona una categoría");
            return false;
        }
        if (!formData.Marca) {
            alert("Selecciona una marca");
            return false;
        }
        if (!formData.Modelo.trim()) {
            alert("Escribe el producto/modelo");
            return false;
        }
        if (!formData.Color) {
            alert("Selecciona un color");
            return false;
        }
        if (formData.Price === "" || Number(formData.Price) <= 0) {
            alert("Escribe un precio válido");
            return false;
        }
        if (formData.Stock === "" || Number(formData.Stock) < 0) {
            alert("Escribe un stock válido");
            return false;
        }
        if (formData.CodeMode === "FACTORY" &&
            !String(formData.FactoryCode || "").trim()) {
            alert("Escanea o escribe el código de fábrica");
            return false;
        }
        return true;
    };
    const uploadSingleImage = async (file) => {
        if (!file) {
            return "";
        }
        const uploadData = new FormData();
        uploadData.append("image", file);
        const uploadResponse = await fetch(`${API_URL}/api/upload`, {
            method: "POST",
            body: uploadData
        });
        const uploadResult = await uploadResponse.json();
        if (!uploadResponse.ok) {
            throw new Error(uploadResult.message || "No se pudo subir la imagen");
        }
        return uploadResult.imageUrl;
    };
    const uploadImageIfNeeded = async () => {
        let imageUrl = formData.Image;
        if (imageFile) {
            imageUrl = await uploadSingleImage(imageFile);
        }
        return imageUrl;
    };
    const findExistingBaseProduct = () => {
        const cleanCategory = normalizeText(formData.Category);
        const cleanMarca = normalizeText(formData.Marca);
        const cleanModelo = normalizeText(formData.Modelo);
        return products.find((product) => {
            return (normalizeText(product.Category) === cleanCategory &&
                normalizeText(product.Marca) === cleanMarca &&
                normalizeText(product.Modelo) === cleanModelo);
        });
    };
    const findExistingBaseProductOnServer = async (productPayload) => {
        const response = await fetch(`${API_URL}/api/products/find-base`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Category: productPayload.Category,
                Marca: productPayload.Marca,
                Modelo: productPayload.Modelo
            })
        });
        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.sqlMessage ||
                data.message ||
                "No se pudo buscar el producto base");
        }
        return data;
    };
    const productVariantAlreadyExists = () => {
        const cleanCategory = normalizeText(formData.Category);
        const cleanMarca = normalizeText(formData.Marca);
        const cleanModelo = normalizeText(formData.Modelo);
        const cleanColor = normalizeText(formData.Color);
        const cleanPower = Number(formData.Power || 0);
        return products.some((product) => {
            const variantId = product.ProductVariantId || product.Id;
            if (editingVariantId &&
                String(variantId) === String(editingVariantId)) {
                return false;
            }
            return (normalizeText(product.Category) === cleanCategory &&
                normalizeText(product.Marca) === cleanMarca &&
                normalizeText(product.Modelo) === cleanModelo &&
                normalizeText(product.Color) === cleanColor &&
                Number(product.Power || 0) === cleanPower);
        });
    };
    const saveProduct = async () => {
        if (isSaving)
            return;
        try {
            setIsSaving(true);
            if (!validateForm()) {
                setIsSaving(false);
                return;
            }
            if (productVariantAlreadyExists()) {
                alert("Ya existe una variante con la misma marca, categoría, producto, color y graduación.");
                setIsSaving(false);
                return;
            }
            const imageUrl = await uploadImageIfNeeded();
            const productPayload = {
                SKU: formData.SKU || "",
                Category: String(formData.Category || "").trim(),
                Marca: String(formData.Marca || "").trim(),
                Modelo: String(formData.Modelo || "").trim(),
                Description: formData.Description || "",
                Image: imageUrl || "",
                Image2: formData.Image2 || "",
                Image3: formData.Image3 || ""
            };
            let productId = editingProductId;
            const serverBaseProduct = await findExistingBaseProductOnServer(productPayload);
            const existingBaseProductId = serverBaseProduct?.found && serverBaseProduct?.ProductId
                ? serverBaseProduct.ProductId
                : null;
            if (editingVariantId &&
                existingBaseProductId &&
                String(existingBaseProductId) !== String(editingProductId)) {
                productId = existingBaseProductId;
            }
            if (!editingVariantId && existingBaseProductId) {
                productId = existingBaseProductId;
            }
            if (editingVariantId &&
                editingProductId &&
                (!existingBaseProductId ||
                    String(existingBaseProductId) === String(editingProductId))) {
                const productResponse = await fetch(`${API_URL}/api/products/${editingProductId}`, {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        ...productPayload,
                        Status: "Activo"
                    })
                });
                const productData = await productResponse.json();
                if (!productResponse.ok) {
                    alert(productData.sqlMessage ||
                        productData.message ||
                        "No se pudo actualizar el producto base");
                    setIsSaving(false);
                    return;
                }
                productId = editingProductId;
            }
            if (!editingVariantId && !productId) {
                const productResponse = await fetch(`${API_URL}/api/products`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(productPayload)
                });
                const productData = await productResponse.json();
                if (!productResponse.ok) {
                    alert(productData.sqlMessage ||
                        productData.message ||
                        "No se pudo crear el producto base");
                    setIsSaving(false);
                    return;
                }
                productId = productData.ProductId;
            }
            if (!productId) {
                alert("No se pudo obtener el ProductId");
                setIsSaving(false);
                return;
            }
            const cleanPower = Number(formData.Power || 0);
            const cleanPowerLabel = cleanPower === 0
                ? "Sin graduación"
                : formData.PowerLabel || cleanPower.toFixed(2);
            const isInternal = formData.CodeMode === "INTERNAL";
            const factoryCode = isInternal
                ? ""
                : String(formData.FactoryCode || "").trim();
            const internalCode = isInternal
                ? String(formData.InternalCode || "").trim()
                : "";
            const scanCode = isInternal ? internalCode : factoryCode;
            const cleanStock = Number(formData.Stock || 0);
            const variantPayload = {
                ProductId: productId,
                Color: String(formData.Color || "").trim(),
                Power: cleanPower,
                PowerLabel: cleanPowerLabel,
                Price: Number(formData.Price || 0),
                Stock: cleanStock,
                FactoryCode: factoryCode,
                InternalCode: internalCode,
                ScanCode: scanCode,
                CodeType: isInternal ? "INTERNAL" : formData.CodeType || "BARCODE",
                Status: cleanStock <= 0 ? "Inactivo" : "Activo"
            };
            const variantUrl = editingVariantId
                ? `${API_URL}/api/product-variants/${editingVariantId}`
                : `${API_URL}/api/product-variants`;
            const variantMethod = editingVariantId ? "PUT" : "POST";
            const variantResponse = await fetch(variantUrl, {
                method: variantMethod,
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(variantPayload)
            });
            const variantData = await variantResponse.json();
            if (!variantResponse.ok) {
                alert(variantData.sqlMessage ||
                    variantData.message ||
                    "No se pudo guardar la variante");
                setIsSaving(false);
                return;
            }
            await loadProducts();
            resetForm();
            setShowForm(false);
            setCurrentPage(1);
            alert(editingVariantId
                ? "✅ Variante actualizada"
                : "✅ Variante creada correctamente");
            setIsSaving(false);
        }
        catch (err) {
            console.log("❌ Error save product:", err);
            alert(err.message || "Error al guardar producto");
            setIsSaving(false);
        }
    };
    const editProduct = (product) => {
        const variantId = product.ProductVariantId || product.Id;
        setEditingVariantId(variantId);
        setEditingProductId(product.ProductId);
        const cleanPower = Number(product.Power || 0);
        const isInternal = product.CodeType === "INTERNAL";
        setFormData({
            SKU: product.SKU || "",
            Category: product.Category || "",
            Marca: product.Marca || "",
            Modelo: product.Modelo || "",
            Description: product.Description || "",
            Image: product.Image || "",
            Image2: product.Image2 || "",
            Image3: product.Image3 || "",
            Color: product.Color || "",
            Power: cleanPower.toFixed(2),
            PowerLabel: product.PowerLabel ||
                (cleanPower === 0 ? "Sin graduación" : cleanPower.toFixed(2)),
            Price: product.Price || "",
            Stock: product.Stock || "",
            CodeMode: isInternal ? "INTERNAL" : "FACTORY",
            CodeType: product.CodeType || (isInternal ? "INTERNAL" : "BARCODE"),
            FactoryCode: product.FactoryCode || "",
            InternalCode: product.InternalCode || "",
            ScanCode: product.ScanCode ||
                product.FactoryCode ||
                product.InternalCode ||
                ""
        });
        setImageFile(null);
        setScannerMessage("");
        setShowCodeScanner(false);
        setShowGalleryForm(false);
        setShowForm(true);
    };
    const openGalleryForm = async (product) => {
        await stopCodeScanner();
        setSelectedGalleryProduct(product);
        setGalleryForm({
            Image: product.Image || "",
            Image2: product.Image2 || "",
            Image3: product.Image3 || ""
        });
        setGalleryFiles({
            Image: null,
            Image2: null,
            Image3: null
        });
        setShowForm(false);
        setShowGalleryForm(true);
    };
    const closeGalleryForm = () => {
        setSelectedGalleryProduct(null);
        setGalleryForm({
            Image: "",
            Image2: "",
            Image3: ""
        });
        setGalleryFiles({
            Image: null,
            Image2: null,
            Image3: null
        });
        setIsGallerySaving(false);
        setShowGalleryForm(false);
    };
    const handleGalleryFile = (field, file) => {
        setGalleryFiles((prev) => ({
            ...prev,
            [field]: file
        }));
    };
    const removeGalleryImage = (field) => {
        setGalleryForm((prev) => ({
            ...prev,
            [field]: ""
        }));
        setGalleryFiles((prev) => ({
            ...prev,
            [field]: null
        }));
    };
    const saveGalleryImages = async () => {
        if (!selectedGalleryProduct || isGallerySaving)
            return;
        try {
            setIsGallerySaving(true);
            let nextImage = galleryForm.Image || "";
            let nextImage2 = galleryForm.Image2 || "";
            let nextImage3 = galleryForm.Image3 || "";
            if (galleryFiles.Image) {
                nextImage = await uploadSingleImage(galleryFiles.Image);
            }
            if (galleryFiles.Image2) {
                nextImage2 = await uploadSingleImage(galleryFiles.Image2);
            }
            if (galleryFiles.Image3) {
                nextImage3 = await uploadSingleImage(galleryFiles.Image3);
            }
            const response = await fetch(`${API_URL}/api/products/${selectedGalleryProduct.ProductId}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    SKU: selectedGalleryProduct.SKU || "",
                    Category: selectedGalleryProduct.Category || "",
                    Marca: selectedGalleryProduct.Marca || "",
                    Modelo: selectedGalleryProduct.Modelo || "",
                    Description: selectedGalleryProduct.Description || "",
                    Image: nextImage,
                    Image2: nextImage2,
                    Image3: nextImage3,
                    Status: selectedGalleryProduct.ProductStatus || "Activo"
                })
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudieron actualizar las fotos");
                setIsGallerySaving(false);
                return;
            }
            await loadProducts();
            alert("✅ Fotos actualizadas correctamente");
            closeGalleryForm();
        }
        catch (err) {
            console.log("❌ Error save gallery:", err);
            alert(err.message || "Error al actualizar fotos");
            setIsGallerySaving(false);
        }
    };
    const releaseCodeScanner = (clearDelay = 1800) => {
        setTimeout(() => {
            codeScannerProcessingRef.current = false;
        }, 1000);
        setTimeout(() => {
            setScannerMessage("");
        }, clearDelay);
    };
    const stopCodeScanner = async () => {
        try {
            if (codeScannerRef.current) {
                const scanner = codeScannerRef.current;
                codeScannerRef.current = null;
                await scanner.stop().catch(() => { });
                scanner.clear();
            }
        }
        catch (err) {
            console.log("Scanner ya estaba detenido:", err);
        }
        finally {
            codeScannerProcessingRef.current = false;
            setIsCodeScannerStarting(false);
            setIsSearchCodeScannerStarting(false);
        }
    };
    const startCodeScanner = async (cameraId = null) => {
        if (isCodeScannerStarting)
            return;
        try {
            setIsCodeScannerStarting(true);
            const reader = document.getElementById("product-code-reader");
            if (reader) {
                reader.innerHTML = "";
            }
            await stopCodeScanner();
            codeScannerProcessingRef.current = false;
            const finalCameraId = cameraId || selectedScannerCameraId;
            if (!finalCameraId) {
                setScannerMessage("No se encontró cámara seleccionada");
                setIsCodeScannerStarting(false);
                return;
            }
            const scanner = new Html5Qrcode("product-code-reader", {
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.QR_CODE,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.EAN_8,
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.UPC_A,
                    Html5QrcodeSupportedFormats.UPC_E,
                    Html5QrcodeSupportedFormats.DATA_MATRIX
                ]
            });
            codeScannerRef.current = scanner;
            const config = {
                fps: 10,
                qrbox: {
                    width: window.innerWidth < 768 ? 260 : 280,
                    height: window.innerWidth < 768 ? 180 : 180
                },
                aspectRatio: 1.333
            };
            await scanner.start(finalCameraId, config, async (decodedText) => {
                if (codeScannerProcessingRef.current)
                    return;
                codeScannerProcessingRef.current = true;
                const cleanCode = String(decodedText || "").trim();
                if (!cleanCode) {
                    codeScannerProcessingRef.current = false;
                    return;
                }
                const lowerCode = cleanCode.toLowerCase();
                const looksLikeCustomerQR = lowerCode.includes("/admin/sales/") ||
                    lowerCode.includes("/card/") ||
                    lowerCode.includes("/customer/");
                if (looksLikeCustomerQR) {
                    setScannerMessage("Este QR es de cliente. Aquí debes escanear un código de producto.");
                    releaseCodeScanner(2200);
                    return;
                }
                playScanSound();
                setFormData((prev) => ({
                    ...prev,
                    CodeMode: "FACTORY",
                    CodeType: cleanCode.length >= 8 ? "BARCODE" : "QR",
                    FactoryCode: cleanCode,
                    ScanCode: cleanCode
                }));
                setScannerMessage(`✅ Código leído: ${cleanCode}`);
                await stopCodeScanner();
                setTimeout(() => {
                    setShowCodeScanner(false);
                    setScannerMessage("");
                }, 600);
            }, () => { });
            setIsCodeScannerStarting(false);
            setScannerMessage("");
        }
        catch (err) {
            console.log("❌ Error startCodeScanner:", err);
            setIsCodeScannerStarting(false);
            codeScannerProcessingRef.current = false;
            setScannerMessage("No se pudo acceder a la cámara. Cierra otras pestañas que usen cámara o revisa permisos del navegador.");
        }
    };
    const getPreferredScannerCamera = (availableCameras) => {
        if (!availableCameras || availableCameras.length === 0) {
            return null;
        }
        const normalizedCameras = availableCameras.map((camera) => ({
            ...camera,
            cleanLabel: String(camera.label || "").toLowerCase()
        }));
        const ultraWideCamera = normalizedCameras.find((camera) => camera.cleanLabel.includes("ultra")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("gran angular")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("wide")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("dual"));
        if (ultraWideCamera) {
            return ultraWideCamera;
        }
        const backCamera = normalizedCameras.find((camera) => camera.cleanLabel.includes("back")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("rear")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("environment")) ||
            normalizedCameras.find((camera) => camera.cleanLabel.includes("trasera"));
        if (backCamera) {
            return backCamera;
        }
        return availableCameras[availableCameras.length - 1];
    };
    const openCodeScanner = async () => {
        try {
            unlockScanSound();
            await stopCodeScanner();
            codeScannerProcessingRef.current = false;
            setShowCodeScanner(true);
            setScannerMessage("Cargando cámara...");
            const cameras = await Html5Qrcode.getCameras();
            if (!cameras || cameras.length === 0) {
                setScannerMessage("No se encontró cámara disponible");
                return;
            }
            setScannerCameras(cameras);
            const preferredCamera = getPreferredScannerCamera(cameras);
            if (!preferredCamera) {
                setScannerMessage("No se encontró cámara disponible");
                return;
            }
            setSelectedScannerCameraId(preferredCamera.id);
            setTimeout(() => {
                startCodeScanner(preferredCamera.id);
            }, 300);
        }
        catch (err) {
            console.log("❌ Error openCodeScanner:", err);
            codeScannerProcessingRef.current = false;
            setScannerMessage("No se pudo abrir el escáner. Revisa permisos o cierra otra pestaña que use cámara.");
        }
    };
    const changeCodeScannerCamera = async (cameraId) => {
        setSelectedScannerCameraId(cameraId);
        codeScannerProcessingRef.current = false;
        setScannerMessage("Cambiando cámara...");
        await startCodeScanner(cameraId);
    };
    const closeCodeScanner = async () => {
        await stopCodeScanner();
        codeScannerProcessingRef.current = false;
        setScannerMessage("");
        setShowCodeScanner(false);
    };
    const downloadProductQR = (product) => {
        try {
            const scanCode = product.ScanCode ||
                product.FactoryCode ||
                product.InternalCode;
            if (!scanCode) {
                alert("Esta variante no tiene código escaneable.");
                return;
            }
            const variantId = product.ProductVariantId || product.Id;
            const svgElement = document.getElementById(`product-qr-${variantId}`);
            if (!svgElement) {
                alert("No se encontró el QR para descargar.");
                return;
            }
            const serializer = new XMLSerializer();
            const svgString = serializer.serializeToString(svgElement);
            const svgBlob = new Blob([svgString], {
                type: "image/svg+xml;charset=utf-8"
            });
            const url = URL.createObjectURL(svgBlob);
            const image = new Image();
            image.onload = () => {
                const canvas = document.createElement("canvas");
                const canvasSize = 700;
                const qrSize = 430;
                canvas.width = canvasSize;
                canvas.height = canvasSize;
                const ctx = canvas.getContext("2d");
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, canvas.width, canvas.height);
                const qrX = (canvasSize - qrSize) / 2;
                const qrY = 45;
                ctx.drawImage(image, qrX, qrY, qrSize, qrSize);
                ctx.fillStyle = "#111111";
                ctx.font = "bold 30px Arial";
                ctx.textAlign = "center";
                ctx.fillText(`${product.Marca || ""} ${product.Modelo || ""}`, canvasSize / 2, 510);
                ctx.font = "24px Arial";
                ctx.fillText(`${product.Color || ""} ${product.PowerLabel || ""}`, canvasSize / 2, 550);
                ctx.font = "bold 22px Arial";
                ctx.fillText(String(scanCode), canvasSize / 2, 600);
                const pngUrl = canvas.toDataURL("image/png");
                const link = document.createElement("a");
                const cleanName = `${product.Marca || ""}-${product.Modelo || ""}-${product.Color || ""}-${product.PowerLabel || ""}`
                    .replace(/\s+/g, "-")
                    .replace(/[^a-zA-Z0-9-_]/g, "");
                link.download = `${scanCode}-${cleanName}.png`;
                link.href = pngUrl;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            };
            image.src = url;
        }
        catch (err) {
            console.log("❌ Error descargando QR:", err);
            alert("No se pudo descargar el QR.");
        }
    };
    const deleteProduct = async (id) => {
        const confirmDelete = window.confirm("¿Desactivar esta variante? Ya no aparecerá en ventas, pero se conservará en el historial.");
        if (!confirmDelete)
            return;
        try {
            const response = await fetch(`${API_URL}/api/product-variants/${id}`, {
                method: "DELETE"
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo desactivar la variante");
                return;
            }
            alert("✅ Variante desactivada");
            await loadProducts();
        }
        catch (err) {
            console.log("❌ Error frontend delete:", err);
            alert("Error al desactivar variante");
        }
    };
    const reactivateProduct = async (id) => {
        const confirmReactivate = window.confirm("¿Reactivar esta variante? Volverá a aparecer en ventas.");
        if (!confirmReactivate)
            return;
        try {
            const response = await fetch(`${API_URL}/api/product-variants/${id}/reactivate`, {
                method: "PUT"
            });
            const data = await response.json();
            if (!response.ok) {
                alert(data.sqlMessage ||
                    data.message ||
                    "No se pudo reactivar la variante");
                return;
            }
            alert("✅ Variante reactivada");
            await loadProducts();
        }
        catch (err) {
            console.log("❌ Error frontend reactivate:", err);
            alert("Error al reactivar variante");
        }
    };
    const publishPending = async (product) => {
        if (!window.confirm(`Publicar ${product.Modelo}: confirma que marca, modelo, color, graduación y precio ya corresponden al producto físico. Esta acción habilitará la venta.`))
            return;
        try {
            await request(`/api/inventory/drafts/${getVariantId(product)}/publish`, { method: 'POST', body: { confirmDetails: true } });
            await loadProducts();
        }
        catch (e) {
            alert(e.message);
        }
    };
    const advancedOptions = {
        brands: [...new Set([...brands.map(b => b.Name), ...products.map(p => p.Marca)].filter(Boolean))],
        categories: [...new Set([...categories.map(c => categoryKey(c.Name)), ...products.map(p => categoryKey(p.Category))].filter(Boolean))],
        colors: [...new Set([...colors.map(c => c.Name), ...products.map(p => p.Color)].filter(Boolean))],
        powers: [...new Set(products.filter(p => !Number(p.NeedsReview)).map(p => Number(p.Power)))].sort((a, b) => b - a)
    };
    return (_jsxs("div", { className: "admin-page", children: [_jsx(AdminSidebar, {}), _jsxs("main", { className: "admin-content", children: [_jsxs("div", { className: "admin-header-row", children: [_jsxs("div", { className: "admin-header", children: [_jsx("h1", { children: "Productos" }), _jsx("p", { children: "Gestiona productos base, variantes, graduaci\u00F3n, stock y c\u00F3digos escaneables." })] }), _jsxs("button", { className: "admin-add-btn", onClick: openCreateForm, children: [_jsx(Plus, { size: 18 }), "Nuevo"] })] }), _jsxs("div", { className: "product-mode-buttons", children: [_jsx("button", { className: viewMode === "active"
                                    ? "product-mode-btn active"
                                    : "product-mode-btn", onClick: () => {
                                    setViewMode("active");
                                    setSearch("");
                                    void closeProductForm();
                                    closeGalleryForm();
                                    clearFilters();
                                }, children: "Activos" }), _jsx("button", { className: viewMode === "inactive"
                                    ? "product-mode-btn active"
                                    : "product-mode-btn", onClick: () => {
                                    setViewMode("inactive");
                                    setSearch("");
                                    void closeProductForm();
                                    closeGalleryForm();
                                    clearFilters();
                                }, children: "Inactivos" }), _jsx("button", { className: viewMode === 'pending' ? 'product-mode-btn active' : 'product-mode-btn', onClick: () => { setViewMode('pending'); clearFilters(); void closeProductForm(); }, children: "Pendientes de completar" })] }), viewMode === 'pending' && _jsx("div", { className: "cl-alert", children: _jsx("span", { children: "Estos c\u00F3digos se crearon durante un inventario. Conservan su stock, pero no se muestran al p\u00FAblico ni se venden. Completa sus datos con Editar y despu\u00E9s pulsa Publicar. Una marca en inventario debe finalizarse antes de editar." }) }), _jsxs("div", { className: "cl-admin-filter-toggle", children: [_jsx("button", { className: "cl-btn cl-btn-light", onClick: () => setShowAdvancedFilters(!showAdvancedFilters), children: "Filtros m\u00FAltiples: marcas, colores y graduaciones" }), _jsx("a", { className: "cl-text-btn", href: "/admin/reports/products", children: "Exportar reporte configurable \u2192" })] }), showAdvancedFilters && _jsx("div", { className: "cl-panel cl-admin-multifilters", children: _jsx(ProductFilters, { options: advancedOptions, filters: advancedFilters, onChange: next => { setAdvancedFilters(next); setCurrentPage(1); } }) }), _jsxs("div", { className: "products-code-search-panel", children: [_jsxs("div", { children: [_jsx("h3", { children: "Buscar por c\u00F3digo" }), _jsx("p", { children: "Escanea o escribe el c\u00F3digo de barras, QR, c\u00F3digo interno o c\u00F3digo de f\u00E1brica. Al encontrarlo se abrir\u00E1 el modal de editar variante." })] }), _jsxs("div", { className: "products-code-search-row", children: [_jsxs("div", { className: "products-code-search-input", children: [_jsx(Search, { size: 18 }), _jsx("input", { type: "text", placeholder: "C\u00F3digo del producto...", value: codeSearch, onChange: (e) => {
                                                    setCodeSearch(e.target.value);
                                                    setCodeSearchMessage("");
                                                }, onKeyDown: (e) => {
                                                    if (e.key === "Enter") {
                                                        searchProductByCode();
                                                    }
                                                } }), codeSearch && (_jsx("button", { type: "button", onClick: () => {
                                                    setCodeSearch("");
                                                    setCodeSearchMessage("");
                                                }, children: "\u2715" }))] }), _jsx("button", { type: "button", className: "admin-save-btn products-scan-code-btn", onClick: openSearchCodeScanner, children: "\uD83D\uDCF7 Escanear" }), _jsx("button", { type: "button", className: "admin-save-btn", onClick: () => searchProductByCode(), disabled: isCodeSearching, children: isCodeSearching
                                            ? "Buscando..."
                                            : "Buscar y editar" })] }), codeSearchMessage && (_jsx("div", { className: "products-code-search-message", children: codeSearchMessage })), showSearchCodeScanner && (_jsxs("div", { className: "product-code-scanner-card products-search-scanner-card", children: [_jsxs("div", { className: "admin-form-header", children: [_jsx("h3", { children: "Escanear c\u00F3digo para editar" }), _jsx("button", { type: "button", className: "admin-close-btn", onClick: closeSearchCodeScanner, children: "\u2715" })] }), searchScannerCameras.length > 1 && (_jsxs("div", { className: "camera-select-box", children: [_jsx("label", { children: "C\u00E1mara" }), _jsx("select", { value: selectedSearchScannerCameraId, onChange: (e) => changeSearchCodeScannerCamera(e.target.value), children: searchScannerCameras.map((camera, index) => (_jsx("option", { value: camera.id, children: camera.label || `Cámara ${index + 1}` }, camera.id))) })] })), _jsx("div", { id: "products-admin-search-code-reader", className: "qr-reader" }), _jsx("button", { type: "button", className: "admin-save-btn", onClick: () => startSearchCodeScanner(selectedSearchScannerCameraId), disabled: isSearchCodeScannerStarting, children: isSearchCodeScannerStarting
                                            ? "Iniciando cámara..."
                                            : "Reiniciar cámara" })] }))] }), showForm && (_jsx("div", { className: "product-admin-modal-overlay", onClick: () => {
                            void closeProductForm();
                        }, children: _jsxs("div", { className: "admin-form-card product-admin-modal-card", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "admin-form-header", children: [_jsx("h2", { children: editingVariantId
                                                ? "Editar Variante"
                                                : "Nuevo Producto + Variante" }), _jsx("button", { className: "admin-close-btn", onClick: () => {
                                                void closeProductForm();
                                            }, children: "\u2715" })] }), _jsx("h3", { className: "product-form-section-title", children: "Producto base" }), _jsxs("div", { className: "admin-form-grid", children: [_jsxs("select", { name: "Category", value: formData.Category, onChange: handleChange, children: [_jsx("option", { value: "", children: "Seleccionar categor\u00EDa" }), categories.map((category) => (_jsx("option", { value: category.Name, children: category.Name }, category.Id)))] }), _jsxs("select", { name: "Marca", value: formData.Marca, onChange: handleChange, children: [_jsx("option", { value: "", children: "Seleccionar marca" }), brands.map((brand) => (_jsx("option", { value: brand.Name, children: brand.Name }, brand.Id)))] }), _jsx("input", { type: "text", name: "Modelo", placeholder: "Producto / modelo", value: formData.Modelo, onChange: handleChange }), _jsx("input", { type: "number", name: "Price", placeholder: "Precio", value: formData.Price, onChange: handleChange }), _jsx("input", { type: "number", name: "Stock", placeholder: "Stock", value: formData.Stock, onChange: handleChange }), _jsx("input", { type: "file", onChange: handleImage }), formData.Image && (_jsx("div", { className: "product-form-preview", children: _jsx("img", { src: getImageUrl(formData.Image), alt: formData.Modelo }) }))] }), _jsx("h3", { className: "product-form-section-title", children: "Variante vendible" }), _jsxs("div", { className: "admin-form-grid", children: [_jsxs("select", { name: "Color", value: formData.Color, onChange: handleChange, children: [_jsx("option", { value: "", children: "Seleccionar color" }), colors.map((color) => (_jsx("option", { value: color.Name, children: color.Name }, color.Id)))] }), _jsx("select", { name: "Power", value: formData.Power, onChange: handleChange, children: powers.map((power) => (_jsx("option", { value: Number(power.Power).toFixed(2), children: power.PowerLabel }, power.Id))) })] }), _jsx("h3", { className: "product-form-section-title", children: "C\u00F3digo escaneable" }), _jsxs("div", { className: "admin-form-grid", children: [_jsxs("select", { name: "CodeMode", value: formData.CodeMode, onChange: handleChange, children: [_jsx("option", { value: "FACTORY", children: "Usar c\u00F3digo de f\u00E1brica" }), _jsx("option", { value: "INTERNAL", children: "Generar c\u00F3digo interno" })] }), formData.CodeMode === "FACTORY" && (_jsxs(_Fragment, { children: [_jsxs("select", { name: "CodeType", value: formData.CodeType, onChange: handleChange, children: [_jsx("option", { value: "BARCODE", children: "C\u00F3digo de barras" }), _jsx("option", { value: "QR", children: "QR de f\u00E1brica" })] }), _jsxs("div", { className: "factory-code-row", children: [_jsx("input", { type: "text", name: "FactoryCode", placeholder: "Escanea o escribe el c\u00F3digo de la caja", value: formData.FactoryCode, onChange: handleChange }), _jsx("button", { type: "button", className: "admin-save-btn", onClick: openCodeScanner, children: "\uD83D\uDCF7 Escanear" })] })] })), formData.CodeMode === "INTERNAL" && (_jsx("div", { className: "sales-product-empty", children: "El sistema generar\u00E1 un c\u00F3digo interno autom\u00E1ticamente al guardar." })), formData.ScanCode && (_jsx("input", { type: "text", name: "ScanCode", placeholder: "C\u00F3digo escaneable", value: formData.ScanCode, readOnly: true })), showCodeScanner && (_jsxs("div", { className: "product-code-scanner-card", children: [_jsxs("div", { className: "admin-form-header", children: [_jsx("h3", { children: "Escanear c\u00F3digo de producto" }), _jsx("button", { type: "button", className: "admin-close-btn", onClick: closeCodeScanner, children: "\u2715" })] }), scannerCameras.length > 1 && (_jsxs("div", { className: "camera-select-box", children: [_jsx("label", { children: "C\u00E1mara" }), _jsx("select", { value: selectedScannerCameraId, onChange: (e) => changeCodeScannerCamera(e.target.value), children: scannerCameras.map((camera, index) => (_jsx("option", { value: camera.id, children: camera.label || `Cámara ${index + 1}` }, camera.id))) })] })), _jsx("div", { id: "product-code-reader", className: "qr-reader" }), scannerMessage && (_jsx("div", { className: "scanner-message", children: scannerMessage })), _jsx("button", { type: "button", className: "admin-save-btn", onClick: () => startCodeScanner(selectedScannerCameraId), disabled: isCodeScannerStarting, children: isCodeScannerStarting
                                                        ? "Iniciando cámara..."
                                                        : "Reiniciar cámara" })] })), _jsx("button", { className: "admin-save-btn", onClick: saveProduct, disabled: isSaving, children: isSaving
                                                ? "Guardando..."
                                                : editingVariantId
                                                    ? "Actualizar"
                                                    : "Guardar" })] })] }) })), showGalleryForm && selectedGalleryProduct && (_jsx("div", { className: "product-admin-modal-overlay", onClick: closeGalleryForm, children: _jsxs("div", { className: "admin-form-card product-admin-modal-card product-gallery-modal-card", onClick: (e) => e.stopPropagation(), children: [_jsxs("div", { className: "admin-form-header", children: [_jsxs("div", { children: [_jsx("h2", { children: "Fotos del producto" }), _jsxs("p", { children: [selectedGalleryProduct.Marca, " ", selectedGalleryProduct.Modelo] })] }), _jsx("button", { className: "admin-close-btn", onClick: closeGalleryForm, children: "\u2715" })] }), _jsxs("div", { className: "product-gallery-grid", children: [_jsxs("div", { className: "product-gallery-item", children: [_jsx("label", { children: "Imagen principal" }), galleryForm.Image ? (_jsx("img", { src: getImageUrl(galleryForm.Image), alt: "Imagen principal" })) : (_jsx("div", { className: "product-gallery-placeholder", children: "Sin imagen" })), _jsx("input", { type: "file", onChange: (e) => handleGalleryFile("Image", e.target.files[0]) }), _jsx("button", { type: "button", className: "gallery-remove-btn", onClick: () => removeGalleryImage("Image"), children: "Quitar" })] }), _jsxs("div", { className: "product-gallery-item", children: [_jsx("label", { children: "Imagen 2" }), galleryForm.Image2 ? (_jsx("img", { src: getImageUrl(galleryForm.Image2), alt: "Imagen 2" })) : (_jsx("div", { className: "product-gallery-placeholder", children: "Sin imagen" })), _jsx("input", { type: "file", onChange: (e) => handleGalleryFile("Image2", e.target.files[0]) }), _jsx("button", { type: "button", className: "gallery-remove-btn", onClick: () => removeGalleryImage("Image2"), children: "Quitar" })] }), _jsxs("div", { className: "product-gallery-item", children: [_jsx("label", { children: "Imagen 3" }), galleryForm.Image3 ? (_jsx("img", { src: getImageUrl(galleryForm.Image3), alt: "Imagen 3" })) : (_jsx("div", { className: "product-gallery-placeholder", children: "Sin imagen" })), _jsx("input", { type: "file", onChange: (e) => handleGalleryFile("Image3", e.target.files[0]) }), _jsx("button", { type: "button", className: "gallery-remove-btn", onClick: () => removeGalleryImage("Image3"), children: "Quitar" })] })] }), _jsx("button", { className: "admin-save-btn", onClick: saveGalleryImages, disabled: isGallerySaving, children: isGallerySaving
                                        ? "Guardando fotos..."
                                        : "Guardar fotos" })] }) })), _jsxs("div", { className: "products-toolbar", children: [_jsxs("div", { className: "products-search-box", children: [_jsx(Search, { size: 18 }), _jsx("input", { type: "text", placeholder: "Buscar por modelo, marca, color, graduaci\u00F3n, c\u00F3digo, stock...", value: search, onChange: (e) => setSearch(e.target.value) }), search && (_jsx("button", { type: "button", className: "products-clear-search", onClick: () => setSearch(""), children: "\u2715" }))] }), _jsxs("div", { className: "products-count-box", children: [filteredProducts.length, " de ", products.length, " variantes"] })] }), _jsxs("div", { className: "products-toolbar", children: [_jsx("div", { className: "products-search-box", children: _jsxs("select", { value: brandFilter, onChange: (e) => setBrandFilter(e.target.value), children: [_jsx("option", { value: "", children: "Todas las marcas" }), brands.map((brand) => (_jsx("option", { value: brand.Name, children: brand.Name }, brand.Id)))] }) }), _jsx("div", { className: "products-search-box", children: _jsxs("select", { value: productFilter, onChange: (e) => setProductFilter(e.target.value), children: [_jsx("option", { value: "", children: "Todos los productos" }), uniqueProductModels.map((model) => (_jsx("option", { value: model, children: model }, model)))] }) }), _jsx("div", { className: "products-search-box", children: _jsxs("select", { value: categoryFilter, onChange: (e) => setCategoryFilter(e.target.value), children: [_jsx("option", { value: "", children: "Todas las categor\u00EDas" }), categories.map((category) => (_jsx("option", { value: category.Name, children: category.Name }, category.Id)))] }) }), _jsx("div", { className: "products-search-box", children: _jsxs("select", { value: powerFilter, onChange: (e) => setPowerFilter(e.target.value), children: [_jsx("option", { value: "", children: "Todas las graduaciones" }), powers.map((power) => (_jsx("option", { value: power.PowerLabel, children: power.PowerLabel }, power.Id)))] }) }), _jsx("button", { type: "button", className: "products-count-box", onClick: clearFilters, children: "Limpiar filtros" })] }), _jsxs("div", { className: "products-pagination-box", children: [_jsxs("span", { children: ["Mostrando ", showingStart, " - ", showingEnd, " de ", filteredProducts.length] }), _jsxs("div", { className: "products-pagination-actions", children: [_jsxs("button", { type: "button", disabled: safeCurrentPage <= 1, onClick: () => setCurrentPage((page) => Math.max(1, page - 1)), children: [_jsx(ChevronLeft, { size: 16 }), "Anterior"] }), _jsxs("strong", { children: ["P\u00E1gina ", safeCurrentPage, " de ", totalPages] }), _jsxs("button", { type: "button", disabled: safeCurrentPage >= totalPages, onClick: () => setCurrentPage((page) => Math.min(totalPages, page + 1)), children: ["Siguiente", _jsx(ChevronRight, { size: 16 })] })] })] }), _jsx("div", { className: "admin-table-wrapper", children: _jsxs("table", { className: "admin-table", children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Imagen" }), _jsx("th", { children: "Marca" }), _jsx("th", { children: "Producto" }), _jsx("th", { children: "Color" }), _jsx("th", { children: "Categor\u00EDa" }), _jsx("th", { children: "Graduaci\u00F3n" }), _jsx("th", { children: "Precio" }), _jsx("th", { children: "Stock" }), _jsx("th", { children: "C\u00F3digo" }), _jsx("th", { children: "Tipo" }), _jsx("th", { children: "Status" }), _jsx("th", { children: "Acciones" })] }) }), _jsxs("tbody", { children: [paginatedProducts.map((product) => {
                                            const variantId = product.ProductVariantId || product.Id;
                                            const scanCode = product.ScanCode ||
                                                product.FactoryCode ||
                                                product.InternalCode ||
                                                "";
                                            return (_jsxs("tr", { children: [_jsx("td", { "data-label": "Imagen", children: product.Image && (_jsx("img", { src: getImageUrl(product.Image), alt: product.Modelo, className: "admin-product-img" })) }), _jsx("td", { "data-label": "Marca", children: product.Marca }), _jsx("td", { "data-label": "Producto", children: product.Modelo }), _jsx("td", { "data-label": "Color", children: product.Color }), _jsx("td", { "data-label": "Categor\u00EDa", children: product.Category }), _jsx("td", { "data-label": "Graduaci\u00F3n", children: product.PowerLabel || "Sin graduación" }), _jsxs("td", { "data-label": "Precio", children: ["$", Number(product.Price || 0).toFixed(2)] }), _jsx("td", { "data-label": "Stock", children: product.Stock }), _jsx("td", { "data-label": "C\u00F3digo", children: scanCode ? (_jsxs("div", { className: "product-qr-box", children: [_jsx(QRCodeSVG, { id: `product-qr-${variantId}`, value: String(scanCode), size: 90, level: "H", includeMargin: true }), _jsx("small", { children: scanCode }), _jsxs("button", { className: "qr-download-btn", onClick: () => downloadProductQR(product), children: [_jsx(Download, { size: 14 }), "Descargar QR"] })] })) : ("Sin código") }), _jsx("td", { "data-label": "Tipo", children: product.CodeType || "INTERNAL" }), _jsx("td", { "data-label": "Status", children: product.Status || "Activo" }), _jsx("td", { "data-label": "Acciones", children: _jsxs("div", { className: "admin-actions", children: [_jsx("button", { className: "edit-btn", onClick: () => editProduct(product), title: "Editar variante", children: _jsx(Pencil, { size: 16 }) }), _jsx("button", { className: "edit-btn", onClick: () => openGalleryForm(product), title: "Editar fotos", children: _jsx(Images, { size: 16 }) }), viewMode === "pending" || Number(product.NeedsReview) ? (_jsx("button", { className: "reactivate-btn", title: "Publicar producto revisado", onClick: () => publishPending(product), children: "Publicar" })) : viewMode === "active" ? (_jsx("button", { className: "delete-btn", onClick: () => deleteProduct(variantId), title: "Desactivar variante", children: _jsx(Trash2, { size: 16 }) })) : (_jsx("button", { className: "edit-btn", onClick: () => reactivateProduct(variantId), title: "Reactivar variante", children: _jsx(RotateCcw, { size: 16 }) }))] }) })] }, variantId));
                                        }), filteredProducts.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: "12", "data-label": "Productos", children: search ||
                                                    brandFilter ||
                                                    categoryFilter ||
                                                    productFilter ||
                                                    powerFilter
                                                    ? "No se encontraron variantes con esos filtros."
                                                    : viewMode === "active"
                                                        ? "No hay variantes activas."
                                                        : viewMode === "pending" ? "No hay productos pendientes de completar." : "No hay variantes inactivas." }) }))] })] }) }), _jsxs("div", { className: "products-pagination-box", children: [_jsxs("span", { children: ["Mostrando ", showingStart, " - ", showingEnd, " de ", filteredProducts.length] }), _jsxs("div", { className: "products-pagination-actions", children: [_jsxs("button", { type: "button", disabled: safeCurrentPage <= 1, onClick: () => setCurrentPage((page) => Math.max(1, page - 1)), children: [_jsx(ChevronLeft, { size: 16 }), "Anterior"] }), _jsxs("strong", { children: ["P\u00E1gina ", safeCurrentPage, " de ", totalPages] }), _jsxs("button", { type: "button", disabled: safeCurrentPage >= totalPages, onClick: () => setCurrentPage((page) => Math.min(totalPages, page + 1)), children: ["Siguiente", _jsx(ChevronRight, { size: 16 })] })] })] })] })] }));
}
export default ProductsAdmin;
