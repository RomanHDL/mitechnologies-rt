// Módulo 8: Reportes de productividad por operador
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { Movement, User, WarehouseTask } = require('../models/sequelize');
const { Op, fn, col, literal } = require('sequelize');

// GET /api/productivity/operators — stats per operator
router.get('/operators', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const dateFilter = {};
    if (from) dateFilter[Op.gte] = new Date(from);
    if (to) dateFilter[Op.lte] = new Date(to);
    const movWhere = {};
    if (from || to) movWhere.createdAt = dateFilter;

    // movements per user
    const movements = await Movement.findAll({
      where: movWhere,
      attributes: ['userId','type'],
      include: [{ model: User, as: 'user', attributes: ['id','fullName','employeeNumber','role','position'] }],
    });

    const byUser = {};
    movements.forEach(m => {
      const uid = m.userId;
      if (!byUser[uid]) {
        byUser[uid] = {
          user: m.user ? { id: m.user.id, fullName: m.user.fullName, employeeNumber: m.user.employeeNumber, role: m.user.role, position: m.user.position } : null,
          movements: { total: 0, IN: 0, OUT: 0, TRANSFER: 0, ADJUST: 0 },
          tasks: { total: 0, completed: 0 },
        };
      }
      byUser[uid].movements.total++;
      byUser[uid].movements[m.type] = (byUser[uid].movements[m.type] || 0) + 1;
    });

    // tasks per user (if available)
    try {
      const taskWhere = { status: 'COMPLETED' };
      if (from || to) taskWhere.completedAt = dateFilter;
      const tasks = await WarehouseTask.findAll({ where: taskWhere, attributes: ['assignedToId','type'] });
      tasks.forEach(t => {
        const uid = t.assignedToId;
        if (!uid) return;
        if (!byUser[uid]) byUser[uid] = { user: null, movements: { total: 0 }, tasks: { total: 0, completed: 0 } };
        byUser[uid].tasks.total++;
        byUser[uid].tasks.completed++;
      });
    } catch(_) { /* WarehouseTask table might not exist yet */ }

    res.json({ period: { from: from || null, to: to || null }, operators: Object.values(byUser) });
  } catch(e) { next(e); }
});

// GET /api/productivity/summary — global summary
router.get('/summary', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { from, to } = req.query;
    const where = {};
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }
    const total = await Movement.count({ where });
    const byType = await Movement.findAll({
      where, attributes: ['type', [fn('COUNT','*'), 'count']], group: ['type'], raw: true,
    });
    res.json({ total, byType });
  } catch(e) { next(e); }
});

module.exports = router;
