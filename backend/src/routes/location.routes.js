const express = require('express');
const Location = require('../models/Location');
const Pallet = require('../models/Pallet');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, async(req, res, next) => {
    try {
        const { area } = req.query;
        const filter = {};
        if (area) filter.area = area;

        const locations = await Location.find(filter).lean();
        const locIds = locations.map(l => l._id);

        const pallets = await Pallet.find({
            location: { $in: locIds },
            status: { $in: ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED'] }
        }).select('location').lean();

        const occupied = new Set(pallets.map(p => String(p.location)));

        res.json(locations.map(l => ({
            ...l,
            state: l.blocked ? 'BLOQUEADO' : (occupied.has(String(l._id)) ? 'OCUPADO' : 'VACIO')
        })));
    } catch (e) { next(e); }
});

router.patch('/:id', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const allowed = {};
        for (const k of['type', 'maxPallets', 'notes'])
            if (req.body?.[k] !== undefined) allowed[k] = req.body[k];
        const loc = await Location.findByIdAndUpdate(req.params.id, allowed, { new: true });
        if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
        res.json(loc);
    } catch (e) { next(e); }
});

router.patch('/:id/block', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const reason = req.body?.reason || 'Mantenimiento';
        const loc = await Location.findByIdAndUpdate(req.params.id, { blocked: true, blockedReason: reason }, { new: true });
        if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
        res.json(loc);
    } catch (e) { next(e); }
});

router.patch('/:id/unblock', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const loc = await Location.findByIdAndUpdate(req.params.id, { blocked: false, blockedReason: '' }, { new: true });
        if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
        res.json(loc);
    } catch (e) { next(e); }
});

// ============================
// SEED: crear ubicaciones racks
// POST /api/locations/seed-racks
// (ADMIN/SUPERVISOR)
// ============================
router.post('/seed-racks', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const totalRacks = 125;
        const levels = ['A', 'B', 'C'];
        const slots = 12;

        // Si quieres A01..A03 por rack, define posiciones aquí:
        const positions = [1]; // o [1,2,3] si quieres A01/A02/A03

        const ops = [];
        for (let i = 1; i <= totalRacks; i++) {
            const rackCode = `F${String(i).padStart(3,'0')}`; // F001..F125

            for (const level of levels) {
                for (const position of positions) {
                    for (let slot = 1; slot <= slots; slot++) {

                        const code = `${level}${String(position).padStart(2,'0')}-${rackCode}-${String(slot).padStart(3,'0')}`;

                        ops.push({
                            updateOne: {
                                filter: { code },
                                update: {
                                    $setOnInsert: {
                                        area: 'MAIN',
                                        rackCode,
                                        level,
                                        position,
                                        slot,
                                        type: 'RACK',
                                        maxPallets: 1,
                                        blocked: false,
                                        blockedReason: '',
                                        code,
                                    }
                                },
                                upsert: true
                            }
                        });
                    }
                }
            }
        }

        if (!ops.length) return res.json({ ok: true, inserted: 0 });

        const r = await Location.bulkWrite(ops, { ordered: false });
        res.json({
            ok: true,
            upserted: r.upsertedCount || 0,
            matched: r.matchedCount || 0,
            modified: r.modifiedCount || 0
        });
    } catch (e) { next(e); }
});


// ============================
// MAPA DE UN RACK
// GET /api/locations/racks/F059
// ============================
router.get('/racks/:rackCode', requireAuth, async(req, res, next) => {
    try {
        const rackCode = String(req.params.rackCode || '').toUpperCase();

        const locations = await Location.find({ rackCode, type: 'RACK' }).lean();
        const locIds = locations.map(l => l._id);

        const pallets = await Pallet.find({
            location: { $in: locIds },
            status: { $in: ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED'] }
        }).select('location status').lean();

        const occMap = new Map(pallets.map(p => [String(p.location), p.status]));

        // regresamos listo para pintar en frontend
        const result = locations.map(l => {
            const occupiedStatus = occMap.get(String(l._id));
            const state = l.blocked ? 'BLOQUEADO' : (occupiedStatus ? 'OCUPADO' : 'VACIO');

            return {
                _id: l._id,
                code: l.code,
                rackCode: l.rackCode,
                level: l.level,
                position: l.position,
                slot: l.slot,
                blocked: l.blocked,
                state,
                occupiedStatus: occupiedStatus || null,
            };
        });

        res.json({
            rackCode,
            locations: result
        });
    } catch (e) { next(e); }
});

module.exports = router;