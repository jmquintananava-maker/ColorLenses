'use strict';
const jwt = require('jsonwebtoken');
function auth(db) {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 24) throw new Error('Configura JWT_SECRET con al menos 24 caracteres en backend/.env. No se usa una clave predeterminada.');
  function createToken(user) {
    return jwt.sign({ id: user.Id, username: user.Username, fullName: user.FullName, role: user.Role }, secret, { expiresIn: '8h', algorithm: 'HS256' });
  }
  async function verifyToken(req, res, next) {
    try {
      const value = req.headers.authorization || '';
      if (!/^Bearer\s+\S+$/i.test(value)) return res.status(401).json({ message: 'Inicia sesión para continuar.' });
      const decoded = jwt.verify(value.split(/\s+/)[1], secret, { algorithms: ['HS256'] });
      const [rows] = await db.execute('SELECT Id, Username, FullName, Role, Status FROM AdminUsers WHERE Id=? LIMIT 1', [decoded.id]);
      if (!rows[0] || rows[0].Status !== 'Activo') return res.status(403).json({ message: 'El acceso administrativo está desactivado.' });
      req.user = { id: rows[0].Id, username: rows[0].Username, fullName: rows[0].FullName, role: rows[0].Role };
      next();
    } catch (error) {
      if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' || error.name === 'NotBeforeError') return res.status(401).json({ message: 'Sesión expirada o inválida. Inicia sesión nuevamente.' });
      console.error('[Auth]', error.code || error.name);
      return res.status(503).json({ message: 'No se pudo verificar la sesión. Revisa la conexión con la base de datos.' });
    }
  }
  return { createToken, verifyToken };
}
module.exports = auth;
