// Módulo 9: Auditoría completa
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { AuditLog, User } = require('../models/sequelize');
const { Op } = require('sequelize');

// GET /api/audit — list audit logs
router.get('/', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { entity, entityId, userId, action, from, to, limit } = req.query;
    const where = {};
    if (entity) where.entity = entity;
    if (entityId) where.entityId = entityId;
    if (userId) where.userId = userId;
    if (action) where.action = action;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt[Op.gte] = new Date(from);
      if (to) where.createdAt[Op.lte] = new Date(to);
    }
    const rows = await AuditLog.findAll({
      where,
      order: [['createdAt','DESC']],
      limit: Math.min(parseInt(limit) || 200, 1000),
      include: [{ model: User, as: 'user', attributes: ['id','fullName','employeeNumber'] }],
    });
    res.json(rows);
  } catch(e) { next(e); }
});

// GET /api/audit/entity/:entity/:entityId — history of specific entity
router.get('/entity/:entity/:entityId', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const rows = await AuditLog.findAll({
      where: { entity: req.params.entity, entityId: req.params.entityId },
      order: [['createdAt','DESC']],
      include: [{ model: User, as: 'user', attributes: ['id','fullName','employeeNumber'] }],
    });
    res.json(rows);
  } catch(e) { next(e); }
});

module.exports = router;
