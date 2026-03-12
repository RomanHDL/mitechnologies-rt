// Módulo 5: Cola de tareas para operadores
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { WarehouseTask, User } = require('../models/sequelize');
const { Op } = require('sequelize');

// GET /api/tasks — list (optionally filter by assignee, status, type)
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, type, assignedToId, mine } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.type = type;
    if (assignedToId) where.assignedToId = assignedToId;
    if (mine === '1') where.assignedToId = req.user.id;
    const rows = await WarehouseTask.findAll({
      where, order: [['priority','ASC'],['createdAt','ASC']],
      include: [
        { model: User, as: 'assignedTo', attributes: ['id','fullName','employeeNumber'] },
        { model: User, as: 'createdBy', attributes: ['id','fullName','employeeNumber'] },
      ]
    });
    res.json(rows);
  } catch(e) { next(e); }
});

// POST /api/tasks — create task
router.post('/', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const { type, priority, title, description, assignedToId, palletId, locationId, targetLocationId, referenceId, referenceType } = req.body;
    if (!title || !type) return res.status(400).json({ message: 'title and type required' });
    const task = await WarehouseTask.create({
      type, priority: priority || 'NORMAL', title,
      description: description || '',
      assignedToId: assignedToId || null,
      palletId: palletId || null,
      locationId: locationId || null,
      targetLocationId: targetLocationId || null,
      referenceId: referenceId || null,
      referenceType: referenceType || null,
      createdById: req.user.id,
      status: assignedToId ? 'ASSIGNED' : 'PENDING',
    });
    res.locals.emit = [{ event: 'task:update', data: { id: task.id } }];
    res.status(201).json(task);
  } catch(e) { next(e); }
});

// PATCH /api/tasks/:id/assign
router.patch('/:id/assign', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const task = await WarehouseTask.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    task.assignedToId = req.body.assignedToId;
    task.status = 'ASSIGNED';
    await task.save();
    res.locals.emit = [{ event: 'task:update', data: { id: task.id } }];
    res.json(task);
  } catch(e) { next(e); }
});

// PATCH /api/tasks/:id/start
router.patch('/:id/start', requireAuth, async (req, res, next) => {
  try {
    const task = await WarehouseTask.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    task.status = 'IN_PROGRESS';
    task.startedAt = new Date();
    await task.save();
    res.locals.emit = [{ event: 'task:update', data: { id: task.id } }];
    res.json(task);
  } catch(e) { next(e); }
});

// PATCH /api/tasks/:id/complete
router.patch('/:id/complete', requireAuth, async (req, res, next) => {
  try {
    const task = await WarehouseTask.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    task.status = 'COMPLETED';
    task.completedAt = new Date();
    task.notes = req.body.notes || task.notes;
    await task.save();
    res.locals.emit = [{ event: 'task:update', data: { id: task.id } }];
    res.json(task);
  } catch(e) { next(e); }
});

// PATCH /api/tasks/:id/cancel
router.patch('/:id/cancel', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const task = await WarehouseTask.findByPk(req.params.id);
    if (!task) return res.status(404).json({ message: 'Not found' });
    task.status = 'CANCELLED';
    await task.save();
    res.locals.emit = [{ event: 'task:update', data: { id: task.id } }];
    res.json(task);
  } catch(e) { next(e); }
});

// GET /api/tasks/stats — productivity stats
router.get('/stats', requireAuth, async (req, res, next) => {
  try {
    const { from, to, userId } = req.query;
    const where = { status: 'COMPLETED' };
    if (userId) where.assignedToId = userId;
    if (from || to) {
      where.completedAt = {};
      if (from) where.completedAt[Op.gte] = new Date(from);
      if (to) where.completedAt[Op.lte] = new Date(to);
    }
    const tasks = await WarehouseTask.findAll({ where, attributes: ['type','assignedToId','completedAt','startedAt','createdAt'] });
    // group by user
    const byUser = {};
    tasks.forEach(t => {
      const uid = t.assignedToId || 'unassigned';
      if (!byUser[uid]) byUser[uid] = { total: 0, byType: {} };
      byUser[uid].total++;
      byUser[uid].byType[t.type] = (byUser[uid].byType[t.type] || 0) + 1;
    });
    res.json({ total: tasks.length, byUser });
  } catch(e) { next(e); }
});

module.exports = router;
