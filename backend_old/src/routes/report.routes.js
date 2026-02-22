const express = require('express');
const dayjs = require('dayjs');

const Movement = require('../models/Movement');
const Pallet = require('../models/Pallet');
const Location = require('../models/Location');
const Product = require('../models/Product');
const { requireAuth } = require('../middleware/auth');
const { requirePermission } = require('../middleware/auth');

const router = express.Router();

/**
 * Productividad por usuario (movimientos por tipo)
 * GET /api/reports/productivity?days=7
 */
router.get('/productivity', requireAuth, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const days = Math.max(1, Math.min(90, Number(req.query.days || 7)));
    const since = dayjs().subtract(days, 'day').toDate();

    const rows = await Movement.aggregate([
      { $match: { createdAt: { $gte: since } } },
      { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'u' } },
      { $unwind: '$u' },
      { $group: { _id: { user: '$u.email', type: '$type' }, count: { $sum: 1 } } },
      { $sort: { 'count': -1 } }
    ]);

    // shape: by user
    const byUser = {};
    for (const r of rows) {
      const email = r._id.user;
      byUser[email] = byUser[email] || { user: email, totals: 0, byType: {} };
      byUser[email].byType[r._id.type] = r.count;
      byUser[email].totals += r.count;
    }

    res.json({ days, rows: Object.values(byUser).sort((a,b)=>b.totals-a.totals) });
  } catch (e) { next(e); }
});

/**
 * Alertas
 * - stock bajo: Product.minStock (si existe)
 * - rack lleno: >=90% por área
 * GET /api/reports/alerts
 */
router.get('/alerts', requireAuth, requirePermission('view_reports'), async (req, res, next) => {
  try {
    const products = await Product.find({}).lean();
    const pallets = await Pallet.find({ status: { $in: ['IN_STOCK','QUARANTINE','DAMAGED','RETURNED','ADJUSTED'] } }).populate('location').lean();

    // Inventory per SKU
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

    // Rack full per area (occupied locations / total locations)
    const locs = await Location.find({}).lean();
    const totalByArea = {};
    for (const l of locs) totalByArea[l.area] = (totalByArea[l.area] || 0) + 1;

    const occupied = new Set(pallets.map(p => String(p.location?._id || p.location)));
    const occByArea = {};
    for (const l of locs) {
      if (occupied.has(String(l._id))) occByArea[l.area] = (occByArea[l.area] || 0) + 1;
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
