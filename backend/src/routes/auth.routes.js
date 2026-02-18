const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const AuthLog = require('../models/AuthLog');
const { validate } = require('../validation/validate');
const { loginSchema, registerSchema } = require('../validation/schemas');
const { requireAuth, requireRole, computePermissions } = require('../middleware/auth');

const router = express.Router();

function reqMeta(req) {
    return {
        ip: req.headers['x-forwarded-for'] ?.toString().split(',')[0] ?.trim() || req.ip || '',
        ua: req.headers['user-agent'] || ''
    };
}

// ======================================
// LOGIN (por employeeNumber + password)
// ======================================
router.post('/login', validate(loginSchema), async(req, res, next) => {
    try {
        const { employeeNumber, password } = req.body;
        const meta = reqMeta(req);

        const emp = String(employeeNumber || '').trim();
        if (!emp) return res.status(400).json({ message: 'Número de empleado requerido' });

        const user = await User.findOne({ employeeNumber: emp });
        if (!user || !user.isActive) {
            await AuthLog.create({ user: user?._id || null, email: user?.email || '', event: 'LOGIN_FAIL', ...meta });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const ok = await bcrypt.compare(String(password || ''), user.passwordHash);
        if (!ok) {
            await AuthLog.create({ user: user._id, email: user.email, event: 'LOGIN_FAIL', ...meta });
            return res.status(401).json({ message: 'Credenciales inválidas' });
        }

        const token = jwt.sign({ sub: user._id.toString(), role: user.role },
            process.env.JWT_SECRET, { expiresIn: '12h' }
        );

        await AuthLog.create({ user: user._id, email: user.email, event: 'LOGIN_SUCCESS', ...meta });

        const permissions = typeof computePermissions === 'function' ?
            computePermissions(user) :
            undefined;

        res.json({
            token,
            user: {
                id: user._id,
                email: user.email,
                fullName: user.fullName,
                role: user.role,
                position: user.position,
                employeeNumber: user.employeeNumber,
                permissions
            }
        });
    } catch (e) { next(e); }
});

// ======================================
// LOGOUT
// ======================================
router.post('/logout', requireAuth, async(req, res, next) => {
    try {
        const meta = reqMeta(req);
        await AuthLog.create({ user: req.user._id, email: req.user.email, event: 'LOGOUT', ...meta });
        res.json({ ok: true });
    } catch (e) { next(e); }
});

// ======================================
// ME
// ======================================
router.get('/me', requireAuth, async(req, res) => {
    const u = req.user;
    const permissions = typeof computePermissions === 'function' ?
        computePermissions(u) :
        undefined;

    res.json({
        id: u._id,
        email: u.email,
        fullName: u.fullName,
        role: u.role,
        position: u.position,
        employeeNumber: u.employeeNumber,
        permissions
    });
});

// ======================================================
// BOOTSTRAP: crear el primer ADMIN si no existe ninguno
// (solo funciona cuando NO hay usuarios en la DB)
// ======================================================
router.post('/bootstrap-admin', async(req, res, next) => {
    try {
        const usersCount = await User.countDocuments({});
        if (usersCount > 0) {
            return res.status(403).json({ message: 'Bootstrap deshabilitado: ya existen usuarios' });
        }

        const { email, password, employeeNumber, fullName, position } = req.body;

        if (!email || !password || !employeeNumber) {
            return res.status(400).json({ message: 'email, password y employeeNumber son requeridos' });
        }

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email: email.toLowerCase().trim(),
            passwordHash,
            employeeNumber: String(employeeNumber).trim(),
            fullName: fullName || '',
            role: 'ADMIN',
            position: position || 'Gerente',
            isActive: true
        });

        return res.status(201).json({
            ok: true,
            user: {
                id: user._id,
                email: user.email,
                employeeNumber: user.employeeNumber,
                role: user.role,
                position: user.position
            }
        });
    } catch (e) { next(e); }
});

// ======================================
// REGISTER (solo ADMIN)
// ======================================
router.post('/register', requireAuth, requireRole('ADMIN'), validate(registerSchema), async(req, res, next) => {
    try {
        const { email, password, employeeNumber, fullName, role, position, isActive } = req.body;

        const exists = await User.findOne({ email: email.toLowerCase().trim() });
        if (exists) return res.status(409).json({ message: 'El correo ya existe' });

        const emp = String(employeeNumber || '').trim();
        if (!emp) return res.status(400).json({ message: 'Número de empleado requerido' });

        const existsEmp = await User.findOne({ employeeNumber: emp });
        if (existsEmp) return res.status(409).json({ message: 'El número de empleado ya existe' });

        const passwordHash = await bcrypt.hash(password, 10);
        const user = await User.create({
            email: email.toLowerCase().trim(),
            passwordHash,
            employeeNumber: emp,
            fullName: fullName || '',
            role: role || 'OPERADOR',
            position: position || '',
            isActive: isActive ?? true
        });

        res.status(201).json({
            id: user._id,
            email: user.email,
            employeeNumber: user.employeeNumber,
            role: user.role,
            position: user.position,
            isActive: user.isActive
        });
    } catch (e) { next(e); }
});

module.exports = router;