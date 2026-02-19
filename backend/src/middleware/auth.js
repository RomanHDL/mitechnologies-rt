const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ message: 'Missing token' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(payload.sub).lean();
    if (!user || !user.isActive) return res.status(401).json({ message: 'Invalid user' });

    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (!roles.includes(req.user.role)) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

// Salidas: supervisor/coordinador/gerente (por puesto) o rol supervisor/admin
function requireOutboundAuthorization(req, res, next) {
  const allowedPositions = ['Supervisor', 'Coordinador', 'Gerente'];
  if (req.user.role === 'ADMIN' || req.user.role === 'SUPERVISOR') return next();
  if (allowedPositions.includes((req.user.position || '').trim())) return next();
  return res.status(403).json({ message: 'No autorizado para salidas' });
}

module.exports = { requireAuth, requireRole, requireOutboundAuthorization };


const ROLE_PERMISSIONS = {
  ADMIN: ['*'],
  SUPERVISOR: ['view_reports','authorize_outbound','manage_locations','manage_products','manage_cyclecounts','view_audit','manage_alerts'],
  OPERADOR: ['scan','create_movements','view_inventory','view_racks']
};

function computePermissions(user) {
  const base = ROLE_PERMISSIONS[user.role] || [];
  const perms = new Set(base);
  // Puestos que autorizan salidas (según tu regla)
  const pos = (user.position || '').trim().toLowerCase();
  if (['supervisor','coordinador','gerente'].includes(pos)) {
    perms.add('authorize_outbound');
    perms.add('view_reports');
  }
  // Admin tiene todo
  if (perms.has('*')) return ['*'];
  return [...perms];
}

function requirePermission(...needed) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    const perms = computePermissions(req.user);
    req.user.permissions = perms;
    if (perms.includes('*')) return next();
    const ok = needed.every(p => perms.includes(p));
    if (!ok) return res.status(403).json({ message: 'Forbidden' });
    next();
  };
}

module.exports.computePermissions = computePermissions;
module.exports.requirePermission = requirePermission;
