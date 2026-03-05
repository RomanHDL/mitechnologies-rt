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
 * Soporta permisos directos o permisos por rol.
 */
function requirePermission(permission) {
    return (req, res, next) => {
        try {
            const role = req.user?.role;

            // 1) permisos directos del usuario
            const directPerms = req.user?.permissions;
            if (Array.isArray(directPerms) && directPerms.includes(permission)) {
                return next();
            }

            // 2) permisos por rol
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
 * ✅ requireOutboundAuthorization
 * Middleware para permitir salidas (/pallets/:id/out).
 */
function requireOutboundAuthorization(req, res, next) {
    try {
        const role = req.user?.role;
        const perms = req.user?.permissions || [];

        // Roles que pueden sacar tarima
        if (role === 'ADMIN' || role === 'SUPERVISOR' || role === 'admin' || role === 'supervisor') {
            return next();
        }

        // Permisos que pueden permitir salida
        if (Array.isArray(perms) && (perms.includes('outbound') || perms.includes('pallet_out'))) {
            return next();
        }

        return res.status(403).json({ message: 'Forbidden (outbound)' });
    } catch (err) {
        return next(err);
    }
}

/**
 * ✅ Ajusta a tus roles reales.
 */
const ROLE_PERMISSIONS = {
    ADMIN: ['view_reports', 'view_dashboard', 'manage_users', 'manage_inventory', 'outbound', 'pallet_out'],
    admin: ['view_reports', 'view_dashboard', 'manage_users', 'manage_inventory', 'outbound', 'pallet_out'],

    SUPERVISOR: ['view_reports', 'view_dashboard', 'outbound', 'pallet_out'],
    supervisor: ['view_reports', 'view_dashboard', 'outbound', 'pallet_out'],

    OPERADOR: [],
    operador: [],
};

function requireAdmin(req, res, next) {
    const u = req.user;
    const isAdmin = u?.role === 'ADMIN' || u?.role === 'admin' || u?.isAdmin === true;
    if (!isAdmin) return res.status(403).json({ message: 'Solo admin' });
    next();
}

function safeParsePermissions(val) {
    try {
        const parsed = JSON.parse(val);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return String(val)
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
    }
}

module.exports = {
    requireAuth,
    requireAdmin,
    requireRole,
    requirePermission,
    requireOutboundAuthorization,
};