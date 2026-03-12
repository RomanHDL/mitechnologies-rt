// Módulo 12: Sistema de webhooks
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { Webhook, User } = require('../models/sequelize');
const crypto = require('crypto');

// GET /api/webhooks
router.get('/', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const rows = await Webhook.findAll({
      order: [['createdAt','DESC']],
      include: [{ model: User, as: 'createdBy', attributes: ['id','fullName'] }],
    });
    res.json(rows);
  } catch(e) { next(e); }
});

// POST /api/webhooks
router.post('/', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const { name, url, events } = req.body;
    if (!name || !url) return res.status(400).json({ message: 'name and url required' });
    const wh = await Webhook.create({
      name, url,
      events: events || [],
      secret: crypto.randomBytes(32).toString('hex'),
      createdById: req.user.id,
    });
    res.status(201).json(wh);
  } catch(e) { next(e); }
});

// PATCH /api/webhooks/:id
router.patch('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const wh = await Webhook.findByPk(req.params.id);
    if (!wh) return res.status(404).json({ message: 'Not found' });
    const { name, url, events, isActive } = req.body;
    if (name !== undefined) wh.name = name;
    if (url !== undefined) wh.url = url;
    if (events !== undefined) wh.events = events;
    if (isActive !== undefined) wh.isActive = isActive;
    await wh.save();
    res.json(wh);
  } catch(e) { next(e); }
});

// DELETE /api/webhooks/:id
router.delete('/:id', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const wh = await Webhook.findByPk(req.params.id);
    if (!wh) return res.status(404).json({ message: 'Not found' });
    await wh.destroy();
    res.json({ ok: true });
  } catch(e) { next(e); }
});

// POST /api/webhooks/:id/test — send test event
router.post('/:id/test', requireAuth, requireRole('ADMIN'), async (req, res, next) => {
  try {
    const wh = await Webhook.findByPk(req.params.id);
    if (!wh) return res.status(404).json({ message: 'Not found' });

    const payload = JSON.stringify({ event: 'test', data: { message: 'Test webhook from MiTechnologies WMS', at: new Date().toISOString() } });
    const signature = crypto.createHmac('sha256', wh.secret).update(payload).digest('hex');

    try {
      const response = await fetch(wh.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Signature': signature },
        body: payload,
        signal: AbortSignal.timeout(10000),
      });
      wh.lastStatus = response.status;
      wh.lastError = response.ok ? null : await response.text();
      wh.lastSentAt = new Date();
      await wh.save();
      res.json({ ok: response.ok, status: response.status });
    } catch(fetchErr) {
      wh.lastStatus = 0;
      wh.lastError = fetchErr.message;
      wh.lastSentAt = new Date();
      await wh.save();
      res.json({ ok: false, error: fetchErr.message });
    }
  } catch(e) { next(e); }
});

module.exports = router;
