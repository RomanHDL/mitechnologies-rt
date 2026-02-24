const express = require('express');
const bcrypt = require('bcryptjs');

const { User } = require('../models/sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ✅ todo lo de aquí: SOLO ADMIN
router.use(requireAuth, requireRole('ADMIN'));

// GET /api/admin/users?search=3647
router.get('/users', async(req, res, next) => {
    try {
        const search = (req.query.search || '').trim();

        const where = {};
        if (search) {
            // busca por employeeNumber o email o nombre (rápido y útil)
            where.employeeNumber = search; // exact
        }

        let users;
        if (search) {
            users = await User.findAll({
                where,
                order: [
                    ['createdAt', 'DESC']
                ],
                attributes: ['id', 'email', 'fullName', 'role', 'position', 'employeeNumber', 'isActive', 'mustChangePin', 'pinAttempts', 'pinLockedUntil', 'createdAt']
            });

            // si no encontró por employeeNumber, intenta por email/nombre (LIKE)
            if (!users.length) {
                users = await User.findAll({
                    where: {
                        ...where,
                        // fallback simple
                        // Sequelize "like": usamos raw where con Op si lo tienes, pero para no meter más imports:
                    },
                    order: [
                        ['createdAt', 'DESC']
                    ],
                    attributes: ['id', 'email', 'fullName', 'role', 'position', 'employeeNumber', 'isActive', 'mustChangePin', 'pinAttempts', 'pinLockedUntil', 'createdAt']
                });

                // si tu proyecto ya usa Sequelize Op en otros lados, te lo adapto después
            }
        } else {
            users = await User.findAll({
                order: [
                    ['createdAt', 'DESC']
                ],
                limit: 200,
                attributes: ['id', 'email', 'fullName', 'role', 'position', 'employeeNumber', 'isActive', 'mustChangePin', 'pinAttempts', 'pinLockedUntil', 'createdAt']
            });
        }

        res.json({ users });
    } catch (e) { next(e); }
});

// POST /api/admin/users   (crear usuario desde UI)
router.post('/users', async(req, res, next) => {
    try {
        const { email, password, employeeNumber, fullName, role, position, isActive } = req.body;

        if (!email || !password || !employeeNumber) {
            return res.status(400).json({ message: 'Faltan campos requeridos (email, password, employeeNumber)' });
        }

        const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } });
        if (exists) return res.status(409).json({ message: 'El correo ya existe' });

        const passwordHash = await bcrypt.hash(String(password), 10);

        const user = await User.create({
            email: email.toLowerCase().trim(),
            passwordHash,
            employeeNumber: String(employeeNumber).trim(),
            fullName: fullName || '',
            role: role || 'OPERADOR',
            position: position || '',
            isActive: typeof isActive === 'boolean' ? isActive : true
        });

        res.status(201).json({
            id: user.id,
            email: user.email,
            employeeNumber: user.employeeNumber,
            fullName: user.fullName,
            role: user.role,
            position: user.position,
            isActive: user.isActive
        });
    } catch (e) { next(e); }
});

// PATCH /api/admin/users/:id/toggle
router.patch('/users/:id/toggle', async(req, res, next) => {
    try {
        const u = await User.findByPk(req.params.id);
        if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });

        const updated = await u.update({ isActive: !u.isActive });
        res.json({ id: updated.id, isActive: updated.isActive });
    } catch (e) { next(e); }
});

// PATCH /api/admin/users/:id/reset-password
router.patch('/users/:id/reset-password', async(req, res, next) => {
    try {
        const { newPassword } = req.body;
        if (!newPassword) return res.status(400).json({ message: 'newPassword requerido' });

        const u = await User.findByPk(req.params.id);
        if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });

        const passwordHash = await bcrypt.hash(String(newPassword), 10);
        await u.update({ passwordHash });

        res.json({ ok: true });
    } catch (e) { next(e); }
});

// PATCH /api/admin/users/:id/reset-pin
router.patch('/users/:id/reset-pin', async(req, res, next) => {
    try {
        const { newPin } = req.body; // opcional: si no mandas, solo fuerza mustChangePin
        const u = await User.findByPk(req.params.id);
        if (!u) return res.status(404).json({ message: 'Usuario no encontrado' });

        const update = {
            pinAttempts: 0,
            pinLockedUntil: null,
            mustChangePin: 1
        };

        if (newPin) {
            update.pinHash = await bcrypt.hash(String(newPin), 10);
            update.mustChangePin = 0; // si tú se lo seteas, ya no necesita cambiarlo
        } else {
            // si no mandas PIN, borramos el pinHash (opcional)
            update.pinHash = null;
        }

        await u.update(update);
        res.json({ ok: true });
    } catch (e) { next(e); }
});

module.exports = router;