const express = require('express');
const Location = require('../models/Location');
const Pallet = require('../models/Pallet');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

/**
 * IA simple: sugerir ubicación óptima (heurística)
 * GET /api/ai/suggest-location?sku=TV-55-4K
 * Regla:
 * - solo ubicaciones RACK
 * - no bloqueadas
 * - vacías
 * - preferir el área con menor ocupación
 */
router.get('/suggest-location', requireAuth, async (req, res, next) => {
  try {
    const sku = String(req.query.sku || '').trim();
    // sku por ahora no cambia heurística, pero queda en endpoint para futuro (clusters por familia)
    const locs = await Location.find({ type: 'RACK', blocked: false }).lean();

    const pallets = await Pallet.find({
      status: { $in: ['IN_STOCK','QUARANTINE','DAMAGED','RETURNED','ADJUSTED'] }
    }).select('location').lean();
    const occupied = new Set(pallets.map(p => String(p.location)));

    const free = locs.filter(l => !occupied.has(String(l._id)));

    // occupancy per area
    const totalByArea = {};
    const occByArea = {};
    for (const l of locs) totalByArea[l.area] = (totalByArea[l.area] || 0) + 1;
    for (const id of occupied) {
      const l = locs.find(x => String(x._id) === String(id));
      if (l) occByArea[l.area] = (occByArea[l.area] || 0) + 1;
    }
    const areas = Object.keys(totalByArea).map(a => {
      const total = totalByArea[a] || 1;
      const occ = occByArea[a] || 0;
      return { area: a, occupancy: occ / total };
    }).sort((a,b)=>a.occupancy-b.occupancy);

    const preferredAreas = areas.map(a=>a.area);
    free.sort((a,b)=> preferredAreas.indexOf(a.area) - preferredAreas.indexOf(b.area) || a.level.localeCompare(b.level) || a.position-b.position);

    const pick = free[0] || null;
    if (!pick) return res.status(404).json({ message: 'No hay ubicaciones disponibles' });

    res.json({
      sku,
      locationId: pick._id,
      area: pick.area,
      level: pick.level,
      position: pick.position,
      label: `${pick.area}-${pick.level}${pick.position}`
    });
  } catch (e) { next(e); }
});

module.exports = router;
