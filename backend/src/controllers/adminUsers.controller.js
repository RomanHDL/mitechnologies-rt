const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
const { User } = require('../models/sequelize');

function safeUser(u) {
    return {
        id: u.id,
        email: u.email,
        employeeNumber: u.employeeNumber,
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        isActive: u.isActive,
        mustChangePin: u.mustChangePin || false,
        pinAttempts: u.pinAttempts || 0,
        pinLockedUntil: u.pinLockedUntil || null,
        createdAt: u.createdAt,
        updatedAt: u.updatedAt,
    };
}

async function listUsers(req, res, next) {
    try {
        const search = (req.query.search || '').trim();
        const where = {};

        if (search) {
            where[Op.or] = [
                { employeeNumber: {
                        [Op.like]: `%${search}%` } },
                { email: {
                        [Op.like]: `%${search}%` } },
                { fullName: {
                        [Op.like]: `%${search}%` } },
            ];
        }

        const users = await User.findAll({
            where,
            order: [
                ['createdAt', 'DESC']
            ],
            limit: 200,
        });

        res.json(users.map(safeUser));
    } catch (e) {
        next(e);
    }
}

async function createUser(req, res, next) {
    try {
        const { employeeNumber, password, email, fullName, role, position, isActive } = req.body;

        if (!employeeNumber || !password) {
            return res.status(400).json({ message: 'employeeNumber y password son requeridos' });
        }

        const finalEmail = (email && String(email).trim()) || `${String(employeeNumber).trim()}@mitech.local`;

        const passwordHash = await bcrypt.hash(String(password), 10);

        const user = await User.create({
            employeeNumber: String(employeeNumber).trim(),
            email: finalEmail.toLowerCase().trim(),
            passwordHash,
            fullName: fullName || '',
            role: role || 'OPERADOR',
            position: position || '',
            isActive: typeof isActive === 'boolean' ? isActive : true,
            mustChangePin: true,
            pinAttempts: 0,
            pinLockedUntil: null,
        });

        res.status(201).json(safeUser(user));
    } catch (e) {
        next(e);
    }
}

async function setActive(req, res, next) {
    try {
        const { id } = req.params;
        const { isActive } = req.body;

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.isActive = Boolean(isActive);
        await user.save();

        res.json(safeUser(user));
    } catch (e) {
        next(e);
    }
}

async function resetPassword(req, res, next) {
    try {
        const { id } = req.params;
        const { newPassword } = req.body;

        if (!newPassword) return res.status(400).json({ message: 'newPassword requerido' });

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.passwordHash = await bcrypt.hash(String(newPassword), 10);
        await user.save();

        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
}

async function resetPin(req, res, next) {
    try {
        const { id } = req.params;
        const { newPin } = req.body;

        if (!newPin) return res.status(400).json({ message: 'newPin requerido' });

        const pin = String(newPin).trim();
        if (!/^\d{4,8}$/.test(pin)) {
            return res.status(400).json({ message: 'PIN debe ser 4 a 8 dígitos' });
        }

        const user = await User.findByPk(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        user.pinHash = await bcrypt.hash(pin, 10);
        user.mustChangePin = false;
        user.pinAttempts = 0;
        user.pinLockedUntil = null;

        await user.save();

        res.json({ ok: true });
    } catch (e) {
        next(e);
    }
}

module.exports = { listUsers, createUser, setActive, resetPassword, resetPin };