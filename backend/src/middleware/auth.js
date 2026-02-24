const jwt = require('jsonwebtoken');
const { User } = require('../models/sequelize');

async function requireAuth(req, res, next) {
    try {
        const header = req.headers.authorization || '';
        const [type, token] = header.split(' ');

        if (type !== 'Bearer' || !token) {
            return res.status(401).json({ message: 'No token provided' });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) {
            return res.status(500).json({ message: 'Missing JWT_SECRET in env' });
        }

        const payload = jwt.verify(token, secret);

        // tu JWT usa sub
        const userId = payload.sub;

        const user = await User.findByPk(userId);
        if (!user || !user.isActive) {
            return res.status(401).json({ message: 'Invalid user' });
        }

        // guardamos usuario completo en req.user
        req.user = {
            id: user.id,
            email: user.email,
            fullName: user.fullName,
            role: user.role,
            position: user.position,
            employeeNumber: user.employeeNumber,
            // ✅ opcional: si en tu tabla User tienes permisos, los metemos aquí
            permissions: Array.isArray(user.permissions) ?
                user.permissions :
                (typeof user.permissions === 'string' ? safeParsePermissions(user.permissions) : []),
        };

        next();
    } catch (err) {
        return res.status(401).json({ message: 'Invalid token' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        const role = req.user?.role;
        if (!role || !roles.includes(role)) {
            return res.status(403).json({ message: 'Forbidden (role)' });
        }
        next();
    };
}

/**
 * ✅ requirePermission('view_reports')
 * - Si tu app usa permisos por rol, aquí está el mapa
 * - Si tu usuario trae permissions en BD, también lo soporta
 */
function requirePermission(permission) {
    return (req, res, next) => {
        try {
            const role = req.user?.role;

            // 1) Si el usuario trae permisos directos (req.user.permissions)
            const directPerms = req.user?.permissions;
            if (Array.isArray(directPerms) && directPerms.includes(permission)) {
                return next();
            }

            // 2) Si manejas permisos por rol (MAPA)
            const rolePerms = ROLE_PERMISSIONS[role] || [];
            if (rolePerms.includes(permission)) {
                return next();
            }

            return res.status(403).json({
                message: 'Forbidden (permission)',
                permission,
            });
        } catch (err) {
            return next(err);
        }
    };
}

/**
 * ✅ Ajusta esto a tus roles reales.
 * Puedes dejarlo así para arrancar YA.
 * Si tu admin debe ver reportes, aquí se permite.
 */
const ROLE_PERMISSIONS = {
    ADMIN: ['view_reports', 'view_dashboard', 'manage_users', 'manage_inventory'],
    admin: ['view_reports', 'view_dashboard', 'manage_users', 'manage_inventory'],
    MANAGER: ['view_reports', 'view_dashboard'],
    manager: ['view_reports', 'view_dashboard'],
    SUPERVISOR: ['view_reports'],
    supervisor: ['view_reports'],
};

function safeParsePermissions(val) {
    try {
        // si viene tipo JSON string: '["view_reports"]'
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // si viene tipo CSV: "view_reports,view_dashboard"
        return String(val)
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);
    }
}

module.exports = { requireAuth, requireRole, requirePermission };