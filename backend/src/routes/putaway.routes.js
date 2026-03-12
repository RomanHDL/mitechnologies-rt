// Módulo 7: Putaway sugerido automático
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { Location, Pallet } = require('../models/sequelize');
const { Op } = require('sequelize');

// GET /api/putaway/suggest?area=A1&sku=SKU001 — suggest best location
router.get('/suggest', requireAuth, async (req, res, next) => {
  try {
    const { area, sku, preferRack } = req.query;

    // 1. Find all empty, unblocked locations
    const where = { blocked: false };
    if (area) where.area = area;
    if (preferRack) where.rack = preferRack;

    const locations = await Location.findAll({
      where,
      include: [{ model: Pallet, as: 'pallets', where: { status: 'IN_STOCK' }, required: false }],
      order: [['rack','ASC'],['level','ASC'],['position','ASC']],
    });

    // 2. Filter locations with available capacity
    const available = locations.filter(loc => {
      const currentPallets = loc.pallets ? loc.pallets.length : 0;
      return currentPallets < (loc.maxPallets || 1);
    });

    // 3. Scoring algorithm
    const scored = available.map(loc => {
      let score = 0;
      const currentPallets = loc.pallets ? loc.pallets.length : 0;

      // prefer empty locations
      if (currentPallets === 0) score += 10;

      // prefer same-SKU grouping (if SKU pallets already nearby)
      if (sku && loc.pallets) {
        const hasSameSku = loc.pallets.some(p => {
          const items = Array.isArray(p.items) ? p.items : [];
          return items.some(i => String(i.sku).toUpperCase() === String(sku).toUpperCase());
        });
        if (hasSameSku) score += 20;
      }

      // prefer lower levels for heavy items (A=ground)
      if (loc.level === 'A') score += 5;
      else if (loc.level === 'B') score += 3;
      else score += 1;

      // prefer lower position numbers (closer to dock)
      score += Math.max(0, 13 - (loc.position || 0));

      return { location: loc, score, capacity: (loc.maxPallets || 1) - currentPallets };
    });

    // sort by score descending
    scored.sort((a, b) => b.score - a.score);

    const suggestions = scored.slice(0, 5).map(s => ({
      locationId: s.location.id,
      code: s.location.code || `${s.location.area}-${s.location.rack || ''}-${s.location.level}${s.location.position}`,
      area: s.location.area,
      rack: s.location.rack,
      level: s.location.level,
      position: s.location.position,
      score: s.score,
      availableCapacity: s.capacity,
    }));

    res.json({ query: { area, sku, preferRack }, suggestions });
  } catch(e) { next(e); }
});

module.exports = router;
