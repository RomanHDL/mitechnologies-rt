const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const AuthLog = require('../models/AuthLog');
const { validate } = require('../validation/validate');
const { loginSchema, registerSchema } = require('../validation/schemas');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

function reqMeta(req) {
  return {
    ip: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip || '',
    ua: req.headers['user-agent'] || ''
  };
}

router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password, employeeNumber } = req.body;
    const meta = reqMeta(req);

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.isActive) {
      await AuthLog.create({ user: user?._id || null, email, event: 'LOGIN_FAIL', ...meta });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    if ((user.employeeNumber || '').trim() !== String(employeeNumber).trim()) {
      await AuthLog.create({ user: user._id, email, event: 'LOGIN_FAIL', ...meta });
      return res.status(401).json({ message: 'Número de empleado incorrecto' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      await AuthLog.create({ user: user._id, email, event: 'LOGIN_FAIL', ...meta });
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }

    const token = jwt.sign({ sub: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: '12h' });
    await AuthLog.create({ user: user._id, email, event: 'LOGIN_SUCCESS', ...meta });

    res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        position: user.position,
        employeeNumber: user.employeeNumber
      }
    });
  } catch (e) { next(e); }
});

router.post('/logout', requireAuth, async (req, res, next) => {
  try {
    const meta = reqMeta(req);
    await AuthLog.create({ user: req.user._id, email: req.user.email, event: 'LOGOUT', ...meta });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.get('/me', requireAuth, async (req, res) => {
  const u = req.user;
  res.json({
    id: u._id,
    email: u.email,
    fullName: u.fullName,
    role: u.role,
    position: u.position,
    employeeNumber: u.employeeNumber
  });
});

router.post('/register', requireAuth, requireRole('ADMIN'), validate(registerSchema), async (req, res, next) => {
  try {
    const { email, password, employeeNumber, fullName, role, position, isActive } = req.body;

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ message: 'El correo ya existe' });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      email: email.toLowerCase().trim(),
      passwordHash,
      employeeNumber: String(employeeNumber).trim(),
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
