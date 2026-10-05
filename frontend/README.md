# Frontend ColorLenses 2.0

React + Vite. Leer `../INSTALACION.md` antes de publicar.

- Desarrollo: `npm ci`, luego `npm run dev` (proxy API a puerto 3000).
- Producción: `npm run build:deploy` compila con Vite y copia dist a ../backend/public.
- Mismo origen Node/API: VITE_API_URL vacío.

El catálogo obtiene productos reales de la API; no se incluyen registros ficticios. Se mantienen las pantallas de administración existentes y se integran inventarios, reportes XLSX y diseño responsive.
