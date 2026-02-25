const express = require('express');
const bcrypt = require('bcryptjs');

const { User } = require('../models/sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * GET /api/users
 * Admin: lista usuarios con búsqueda simple
 * Query:
 *  - q (busca por employeeNumber, email, fullName)
 *  - page (default 1)
 *  - limit (default 25, max 100)
 */
router.get('/', requireAuth, requireRole('ADMIN'), async(req, res, next) => {
    try {
        const q = String(req.query.q || '').trim();
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limitRaw = parseInt(req.query.limit || '25', 10);
        const limit = Math.min(Math.max(limitRaw, 1), 100);
        const offset = (page - 1) * limit;

        // Importa Op aquí para evitar tocar otros archivos
        const { Op } = require('sequelize');

        const where = {};
        if (q) {
            where[Op.or] = [{
                    employeeNumber: {
                        [Op.like]: `%${q}%`
                    }
                },
                {
                    email: {
                        [Op.like]: `%${q}%`
                    }
                },
                {
                    fullName: {
                        [Op.like]: `%${q}%`
                    }
                },
            ];
        }

        const { rows, count } = await User.findAndCountAll({
            where,
            order: [
                ['createdAt', 'DESC']
            ],
            limit,
            offset,
            attributes: ['id', 'employeeNumber', 'email', 'fullName', 'role', 'position', 'isActive', 'createdAt', 'updatedAt'],
        });

        res.json({
            data: rows,
            page,
            limit,
            total: count,
            totalPages: Math.ceil(count / limit),
        });
    } catch (e) {
        next(e);
    }
});

/**
 * PATCH /api/users/:id
 * Admin: actualizar campos permitidos
 * Nota: no cambiamos password aquí.
 */
router.patch('/:id', requireAuth, requireRole('ADMIN'), async(req, res, next) => {
    try {
        const allowed = {};
        const body = req.body || {};

        // Solo estos campos
        for (const k of['employeeNumber', 'email', 'fullName', 'role', 'position', 'isActive']) {
            if (body[k] !== undefined) allowed[k] = body[k];
        }

        // Normalizaciones mínimas
        if (allowed.email) allowed.email = String(allowed.email).toLowerCase().trim();
        if (allowed.employeeNumber) allowed.employeeNumber = String(allowed.employeeNumber).trim();

        const [updated] = await User.update(allowed, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'Usuario no encontrado' });

        const user = await User.findByPk(req.params.id, {
            attributes: ['id', 'employeeNumber', 'email', 'fullName', 'role', 'position', 'isActive', 'createdAt', 'updatedAt'],
        });

        res.json({ data: user });
    } catch (e) {
        next(e);
    }
});

// ✅ handler compartido para POST/PATCH reset-password (no borra nada, solo compatibilidad)
async function handleResetPassword(req, res, next) {
    try {
        const newPassword = String(req.body ? .newPassword || '');
        if (newPassword.length < 6) {
            return res.status(400).json({ message: 'newPassword debe tener mínimo 6 caracteres' });
        }

        const user = await User.findByPk(req.params.id);
        if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });

        const passwordHash = await bcrypt.hash(newPassword, 10);

        // actualiza passwordHash (columna real)
        await User.update({ passwordHash }, { where: { id: user.id } });

        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
}

/**
 * POST /api/users/:id/reset-password
 * Admin: resetea password (recibe newPassword)
 */
router.post('/:id/reset-password', requireAuth, requireRole('ADMIN'), handleResetPassword);

/**
 * PATCH /api/users/:id/reset-password
 * ✅ extra compatibilidad por si quedó algún cliente usando PATCH
 */
router.patch('/:id/reset-password', requireAuth, requireRole('ADMIN'), handleResetPassword);

module.exports = router;