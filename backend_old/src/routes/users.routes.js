const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// LISTAR (con búsqueda)
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const q = (req.query.q || '').trim();
    const filter = q
      ? {
          $or: [
            { email: new RegExp(q, 'i') },
            { fullName: new RegExp(q, 'i') },
            { employeeNumber: new RegExp(q, 'i') },
            { position: new RegExp(q, 'i') }
          ]
        }
      : {};

    const users = await User.find(filter)
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();

    res.json(users);
  } catch (e) {
    next(e);
  }
});

// EDITAR (role/position/fullName/isActive)
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { role, position, fullName, isActive } = req.body;

    const update = {};
    if (role) update.role = role;
    if (position !== undefined) update.position = position;
    if (fullName !== undefined) update.fullName = fullName;
    if (isActive !== undefined) update.isActive = !!isActive;

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select('-passwordHash')
      .lean();

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json(user);
  } catch (e) {
    next(e);
  }
});

// RESET PASSWORD (ADMIN)
router.post('/:id/reset-password', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    if (!newPassword || String(newPassword).length < 6) {
      return res.status(400).json({ message: 'Contraseña inválida (mínimo 6 caracteres)' });
    }

    const passwordHash = await bcrypt.hash(String(newPassword), 10);
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { passwordHash },
      { new: true }
    ).select('-passwordHash').lean();

    if (!user) return res.status(404).json({ message: 'Usuario no encontrado' });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
