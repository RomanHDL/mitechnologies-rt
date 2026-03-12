const express = require('express');
const dayjs = require('dayjs');
const { Op } = require('sequelize');

const { Movement, Pallet, Location, Product, User } = require('../models/sequelize');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

router.get('/productivity', requireAuth, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(90, Number(req.query.days || 7)));
    const since = dayjs().subtract(days, 'day').toDate();

    const rows = await Movement.findAll({
      where: { createdAt: { [Op.gte]: since } },
      include: [{ model: User, as: 'user', attributes: ['email'] }],
      attributes: ['type', 'userId'],
      raw: true
    });

    const byUser = {};
    for (const r of rows) {
      const email = r['user.email'];
      if (!email) continue;
      byUser[email] = byUser[email] || { user: email, totals: 0, byType: {} };
      byUser[email].byType[r.type] = (byUser[email].byType[r.type] || 0) + 1;
      byUser[email].totals += 1;
    }

    res.json({ days, rows: Object.values(byUser).sort((a,b)=>b.totals-a.totals) });
  } catch (e) { next(e); }
});

router.get('/alerts', requireAuth, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const products = await Product.findAll({ raw: true });
    const pallets = await Pallet.findAll({
      where: { status: { [Op.in]: ['IN_STOCK','QUARANTINE','DAMAGED','RETURNED','ADJUSTED'] } },
      include: [{ model: Location, as: 'location' }]
    });

    const inv = new Map();
    for (const p of pallets) {
      for (const it of (p.items || [])) {
        inv.set(it.sku, (inv.get(it.sku) || 0) + (Number(it.qty) || 0));
      }
    }

    const lowStock = [];
    for (const pr of products) {
      const minStock = Number(pr.minStock || 0);
      if (!minStock) continue;
      const qty = inv.get(pr.sku) || 0;
      if (qty < minStock) {
        lowStock.push({ sku: pr.sku, qty, minStock, description: pr.description || '' });
      }
    }

    const locs = await Location.findAll({ raw: true });
    const totalByArea = {};
    for (const l of locs) totalByArea[l.area] = (totalByArea[l.area] || 0) + 1;

    const occupied = new Set(pallets.map(p => p.location?.id || p.locationId).filter(Boolean));
    const occByArea = {};
    for (const l of locs) {
      if (occupied.has(l.id)) occByArea[l.area] = (occByArea[l.area] || 0) + 1;
    }

    const rackFull = Object.keys(totalByArea).map(area => {
      const total = totalByArea[area] || 0;
      const occ = occByArea[area] || 0;
      const pct = total ? (occ / total) : 0;
      return { area, total, occupied: occ, occupancyPct: Math.round(pct * 1000) / 10, isFull: pct >= 0.9 };
    }).filter(x => x.isFull);

    res.json({ lowStock, rackFull });
  } catch (e) { next(e); }
});

module.exports = router;
