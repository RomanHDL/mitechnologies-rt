const express = require('express');
const { Location, Pallet, Movement } = require('../models/sequelize');
const { Op } = require('sequelize');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function safeNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sumPalletItemsQty(pallet) {
  if (!pallet || !Array.isArray(pallet.items)) return 0;
  return pallet.items.reduce((acc, it) => acc + safeNum(it?.qty), 0);
}

async function getKpis(req, res, next) {
  try {
    const locations = await Location.findAll({ raw: true });

    const pallets = await Pallet.findAll({
      where: { status: 'IN_STOCK' },
      include: [{ model: Location, as: 'location' }]
    });

    const total = locations.length;
    const occupied = pallets.length;

    const occByArea = { A1: 0, A2: 0, A3: 0, A4: 0 };
    for (const p of pallets) {
      const a = p.location?.area;
      if (a && occByArea[a] !== undefined) occByArea[a] += 1;
    }

    const blocked = locations.filter(l => {
      const s = String(l.status || '').toUpperCase();
      return s === 'BLOCKED' || s === 'BLOQUEADA' || s === 'BLOQUEADO';
    }).length;

    const since14 = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const today = startOfToday();

    const mv = await Movement.findAll({
      where: { createdAt: { [Op.gte]: since14 } },
      raw: true
    });

    const perDay = {};
    for (const m of mv) {
      const d = new Date(m.createdAt);
      const key = d.toISOString().slice(0, 10);
      perDay[key] = perDay[key] || { IN: 0, OUT: 0, TRANSFER: 0, ADJUST: 0 };
      perDay[key][m.type] = (perDay[key][m.type] || 0) + 1;
    }

    const skuMap = new Map();
    for (const p of pallets) {
      for (const it of (p.items || [])) {
        skuMap.set(it.sku, (skuMap.get(it.sku) || 0) + (it.qty || 0));
      }
    }

    const topSkus = [...skuMap.entries()]
      .map(([sku, qty]) => ({ sku, qty }))
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 10);

    // ✅ métricas de HOY
    const todayMovements = mv.filter(m => new Date(m.createdAt) >= today);

    const entradasHoy = todayMovements.filter(m => String(m.type).toUpperCase() === 'IN').length;
    const salidasHoy = todayMovements.filter(m => String(m.type).toUpperCase() === 'OUT').length;

    // ✅ pallets tocados hoy por entrada/salida
    const entradasPalletIds = [
      ...new Set(
        todayMovements
          .filter(m => String(m.type).toUpperCase() === 'IN')
          .map(m => m.palletId)
          .filter(Boolean)
      )
    ];

    const salidasPalletIds = [
      ...new Set(
        todayMovements
          .filter(m => String(m.type).toUpperCase() === 'OUT')
          .map(m => m.palletId)
          .filter(Boolean)
      )
    ];

    const entradaPalletsRows = entradasPalletIds.length
      ? await Pallet.findAll({ where: { id: entradasPalletIds } })
      : [];

    const salidaPalletsRows = salidasPalletIds.length
      ? await Pallet.findAll({ where: { id: salidasPalletIds } })
      : [];

    const entradasPiezas = entradaPalletsRows.reduce((acc, p) => acc + sumPalletItemsQty(p), 0);
    const salidasPiezas = salidaPalletsRows.reduce((acc, p) => acc + sumPalletItemsQty(p), 0);

    // ✅ equivalencias para tu dashboard dibujado
    const entradasCamiones = entradasHoy;
    const salidasOrdenes = salidasHoy;
    const entradasPallets = entradasPalletIds.length;
    const salidasPallets = salidasPalletIds.length;

    res.json({
      // ✅ formato viejo, por compatibilidad
      occupancy: {
        totalLocations: total,
        occupiedLocations: occupied,
        percent: total ? Math.round((occupied / total) * 100) : 0,
        byArea: occByArea
      },
      movementsPerDay: perDay,
      topSkus,

      // ✅ formato nuevo, para DashboardPage.jsx
      occupancyPct: total ? Math.round((occupied / total) * 100) : 0,
      occupied,
      total,
      bloqueadas: blocked,

      entradasHoy,
      salidasHoy,

      entradasCamiones,
      entradasPallets,
      entradasPiezas,

      salidasOrdenes,
      salidasPallets,
      salidasPiezas
    });
  } catch (e) {
    next(e);
  }
}

// ✅ funcionan:
// GET /api/dashboard
// GET /api/dashboard/kpis
router.get('/', requireAuth, getKpis);
router.get('/kpis', requireAuth, getKpis);

module.exports = router;