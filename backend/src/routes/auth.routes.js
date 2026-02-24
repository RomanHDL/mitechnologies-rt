const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { User, AuthLog } = require('../models/sequelize');
const { validate } = require('../validation/validate');
const { loginSchema, registerSchema } = require('../validation/schemas');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function reqMeta(req) {
    return {
        ip: req.headers['x-forwarded-for'] ?
            req.headers['x-forwarded-for'].toString().split(',')[0].trim() : req.ip || '',
        ua: req.headers['user-agent'] || ''
    };
}

router.post('/login', validate(loginSchema), async(req, res, next) => {
    try {
        const { employeeNumber, password, pin } = req.body;
        const meta = reqMeta(req);

        const user = await User.findOne({ where: { employeeNumber: String(employeeNumber).trim() } });

        if (!user || !user.isActive) {
            await AuthLog.create({ userId: user?.id || null, email: user?.email || null, event: 'LOGIN_FAIL', ...meta });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // ✅ bloqueo por intentos PIN
        if (user.pinLockedUntil && new Date(user.pinLockedUntil).getTime() > Date.now()) {
            return res.status(423).json({ message: 'Cuenta bloqueada por intentos. Intenta más tarde.' });
        }

        // ✅ OPERADOR: preferir PIN si existe pinHash (y si mandan pin)
        if (pin) {
            if (!user.pinHash) {
                return res.status(403).json({ message: 'PIN no configurado' });
            }

            const okPin = await bcrypt.compare(String(pin), user.pinHash);

            if (!okPin) {
                const attempts = (user.pinFailedCount || 0) + 1;
                const update = { pinFailedCount: attempts };

                // 5 intentos = bloqueo 10 min
                if (attempts >= 5) {
                    update.pinLockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                    update.pinFailedCount = 0;
                }

                await user.update(update);
                await AuthLog.create({ userId: user.id, email: user.email, event: 'LOGIN_FAIL', ...meta });
                return res.status(401).json({ message: 'Credenciales inválidas' });
            }

            // PIN correcto: reset intentos
            await user.update({ pinFailedCount: 0, pinLockedUntil: null });

            const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
            await AuthLog.create({ userId: user.id, email: user.email, event: 'LOGIN_SUCCESS', ...meta });

            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    position: user.position,
                    employeeNumber: user.employeeNumber,
                    mustChangePin: user.pinMustChange || false
                }
            });
        }

        // ✅ ADMIN/SUPERVISOR/otro: password normal
        const okPass = await bcrypt.compare(String(password || ''), user.passwordHash);
        if (!okPass) {
            await AuthLog.create({ userId: user.id, email: user.email, event: 'LOGIN_FAIL', ...meta });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ sub: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
        await AuthLog.create({ userId: user.id, email: user.email, event: 'LOGIN_SUCCESS', ...meta });

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                position: user.position,
                employeeNumber: user.employeeNumber,
                mustChangePin: user.mustChangePin || false
            }
        });
    } catch (e) { next(e); }
});

router.post('/logout', requireAuth, async(req, res, next) => {
    try {
        const meta = reqMeta(req);
        await AuthLog.create({ userId: req.user.id, email: req.user.email, event: 'LOGOUT', ...meta });
        res.json({ ok: true });
    } catch (e) { next(e); }
});

router.get('/me', requireAuth, async(req, res) => {
    const u = req.user;
    res.json({
        id: u.id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        employeeNumber: u.employeeNumber
    });
});

router.post('/register', requireAuth, requireRole('ADMIN'), validate(registerSchema), async(req, res, next) => {
    try {
        const { email, password, employeeNumber, fullName, role, position, isActive } = req.body;

        const exists = await User.findOne({ where: { email: email.toLowerCase().trim() } });
        if (exists) return res.status(409).json({ message: 'El correo ya existe' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email: email.toLowerCase().trim(),
            passwordHash,
            employeeNumber: String(employeeNumber).trim(),
            fullName: fullName || '',
            role: role || 'OPERADOR',
            position: position || '',
            isActive: isActive ? isActive : true
        });

        res.status(201).json({
            id: user.id,
            email: user.email,
            employeeNumber: user.employeeNumber,
            role: user.role,
            position: user.position,
            isActive: user.isActive
        });
    } catch (e) { next(e); }
});

module.exports = router;