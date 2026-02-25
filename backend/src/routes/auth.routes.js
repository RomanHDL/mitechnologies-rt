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

// ✅ helper: obtiene el hash real de password aunque la tabla tenga otro nombre
function getPasswordHash(user) {
    // prioridad: passwordHash (tu modelo actual)
    // fallback: password_hash (tablas legacy)
    // fallback: password (legacy)
    return (
        user?.passwordHash ||
        user?.password_hash ||
        user?.password ||
        null
    );
}

router.post('/login', validate(loginSchema), async(req, res, next) => {
    try {
        const { employeeNumber, password, pin } = req.body;
        const meta = reqMeta(req);

        const user = await User.findOne({
            where: { employeeNumber: String(employeeNumber).trim() },
        });

        if (!user || !user.isActive) {
            await AuthLog.create({
                userId: user?.id || null,
                email: user?.email || null,
                event: 'LOGIN_FAIL',
                ...meta
            });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        // ✅ bloqueo por intentos PIN
        if (user.pinLockedUntil && new Date(user.pinLockedUntil).getTime() > Date.now()) {
            return res.status(423).json({ message: 'Cuenta bloqueada por intentos. Intenta más tarde.' });
        }

        // ✅ Si mandan PIN => validar PIN
        if (pin) {
            if (!user.pinHash) {
                return res.status(403).json({ message: 'PIN no configurado' });
            }

            const okPin = await bcrypt.compare(String(pin), user.pinHash);

            if (!okPin) {
                // ✅ TU BD tiene pinAttempts (no pinFailedCount)
                const attempts = (user.pinAttempts || 0) + 1;
                const update = { pinAttempts: attempts };

                // 5 intentos = bloqueo 10 min
                if (attempts >= 5) {
                    update.pinLockedUntil = new Date(Date.now() + 10 * 60 * 1000);
                    update.pinAttempts = 0;
                }

                await user.update(update);

                await AuthLog.create({
                    userId: user.id,
                    email: user.email,
                    event: 'LOGIN_FAIL',
                    ...meta
                });

                return res.status(401).json({ message: 'Credenciales inválidas' });
            }

            // PIN correcto: reset intentos
            await user.update({ pinAttempts: 0, pinLockedUntil: null });

            const token = jwt.sign({ sub: user.id, role: user.role },
                process.env.JWT_SECRET, { expiresIn: '12h' }
            );

            await AuthLog.create({
                userId: user.id,
                email: user.email,
                event: 'LOGIN_SUCCESS',
                ...meta
            });

            return res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    fullName: user.fullName,
                    role: user.role,
                    position: user.position,
                    employeeNumber: user.employeeNumber,
                    mustChangePin: Boolean(user.mustChangePin)
                }
            });
        }

        // ✅ login normal por password
        const passHash = getPasswordHash(user);

        // 🔥 si por alguna razón el usuario no trae hash, es un problema de esquema/DB
        if (!passHash) {
            console.error('[LOGIN] Usuario sin password hash:', {
                userId: user.id,
                employeeNumber: user.employeeNumber,
                keys: Object.keys(user?.toJSON?.() || user || {})
            });
            return res.status(500).json({ message: 'Usuario sin contraseña configurada (schema mismatch)' });
        }

        const okPass = await bcrypt.compare(String(password || ''), passHash);
        if (!okPass) {
            await AuthLog.create({
                userId: user.id,
                email: user.email,
                event: 'LOGIN_FAIL',
                ...meta
            });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ sub: user.id, role: user.role },
            process.env.JWT_SECRET, { expiresIn: '12h' }
        );

        await AuthLog.create({
            userId: user.id,
            email: user.email,
            event: 'LOGIN_SUCCESS',
            ...meta
        });

        return res.json({
            token,
            user: {
                id: user.id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                position: user.position,
                employeeNumber: user.employeeNumber,
                mustChangePin: Boolean(user.mustChangePin)
            }
        });
    } catch (e) {
        next(e);
    }
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

router.post(
    '/register',
    requireAuth,
    requireRole('ADMIN'),
    validate(registerSchema),
    async(req, res, next) => {
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
                isActive: (isActive !== undefined ? isActive : true)
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
    }
);

// ✅ ESTO ES LO QUE TE FALTABA (si no estaba) Y ES LO QUE ROMPE EL SERVER EN RAILWAY
module.exports = router;