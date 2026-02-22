const express = require('express');
const Location = require('../models/Location');
const Pallet = require('../models/Pallet');
const Movement = require('../models/Movement');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

async function getKpis(req, res, next) {
    try {
        const locations = await Location.find({}).lean();
        const pallets = await Pallet.find({ status: 'IN_STOCK' }).populate('location').lean();

        const total = locations.length;
        const occupied = pallets.length;

        const occByArea = { A1: 0, A2: 0, A3: 0, A4: 0 };
        for (const p of pallets) {
            const a = p.location?.area;
            if (a && occByArea[a] !== undefined) occByArea[a] += 1;
        }

        // Movimientos últimos 14 días
        const since = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
        const mv = await Movement.find({ createdAt: { $gte: since } }).lean();

        const perDay = {};
        for (const m of mv) {
            const d = new Date(m.createdAt);
            const key = d.toISOString().slice(0, 10);
            perDay[key] = perDay[key] || { IN: 0, OUT: 0, TRANSFER: 0, ADJUST: 0 };
            perDay[key][m.type] = (perDay[key][m.type] || 0) + 1;
        }

        // Top SKUs (por qty total en stock)
        const skuMap = new Map();
        for (const p of pallets) {
            for (const it of(p.items || [])) {
                skuMap.set(it.sku, (skuMap.get(it.sku) || 0) + (it.qty || 0));
            }
        }
        const topSkus = [...skuMap.entries()]
            .map(([sku, qty]) => ({ sku, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, 10);

        res.json({
            occupancy: {
                totalLocations: total,
                occupiedLocations: occupied,
                percent: total ? Math.round((occupied / total) * 100) : 0,
                byArea: occByArea
            },
            movementsPerDay: perDay,
            topSkus
        });
    } catch (e) {
        next(e);
    }
}

// ✅ AHORA funcionan:
// GET /api/dashboard
// GET /api/dashboard/kpis
router.get('/', requireAuth, getKpis);
router.get('/kpis', requireAuth, getKpis);

module.exports = router;