'use strict';
// Un único criterio para el contador y la lista. No cambia estados de publicación.
// La base histórica desactiva variantes al agotarse: se muestran como inactivas, no se reactivan.
const LOW_STOCK_LIMIT = 5;
const LOW_STOCK_FROM = "FROM ProductVariants v JOIN Products p ON p.Id=v.ProductId WHERE p.Status='Activo' AND (v.Status='Activo' OR (v.Status='Inactivo' AND v.Stock=0)) AND v.Stock<=5";
module.exports = { LOW_STOCK_LIMIT, LOW_STOCK_FROM };
