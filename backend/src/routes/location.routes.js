const express = require('express');
const { Location, Pallet } = require('../models/sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// ✅ NUEVO: GET /api/locations/racks/:rackCode
// Devuelve { rackCode, locations: [...] } para tu RacksPage
router.get('/racks/:rackCode', requireAuth, async(req, res, next) => {
    try {
        const rackCode = String(req.params.rackCode || '').trim().toUpperCase(); // F001

        if (!/^F\d{3}$/.test(rackCode)) {
            return res.status(400).json({ message: 'Rack inválido' });
        }

        // Trae ubicaciones cuyo código tenga "-Fxxx-" (ej: A01-F059-012)
        const locations = await Location.findAll({ raw: true });

        const rackLocs = locations
            .filter(l => String(l.code || '').toUpperCase().includes(`-${rackCode}-`))
            .map(l => ({...l }));

        const locIds = rackLocs.map(l => l.id);

        const pallets = await Pallet.findAll({
            where: {
                locationId: locIds,
                status: ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED'],
            },
            attributes: ['locationId'],
            raw: true,
        });

        const occupied = new Set(pallets.map(p => p.locationId));

        const shaped = rackLocs.map(l => ({
            ...l,
            state: l.blocked ? 'BLOQUEADO' : (occupied.has(l.id) ? 'OCUPADO' : 'VACIO'),
            // Tu frontend a veces usa level/position; si no existen en DB, los inferimos del code
            ...inferLevelPosition(l.code),
        }));

        res.json({ rackCode, locations: shaped });
    } catch (e) {
        next(e);
    }
});

// EXISTENTE: GET /api/locations
router.get('/', requireAuth, async(req, res, next) => {
    try {
        const { area } = req.query;
        const where = {};
        if (area) where.area = area;

        const locations = await Location.findAll({ where, raw: true });
        const locIds = locations.map(l => l.id);

        const pallets = await Pallet.findAll({
            where: {
                locationId: locIds,
                status: ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED']
            },
            attributes: ['locationId'],
            raw: true
        });

        const occupied = new Set(pallets.map(p => p.locationId));

        res.json(locations.map(l => ({
            ...l,
            state: l.blocked ? 'BLOQUEADO' : (occupied.has(l.id) ? 'OCUPADO' : 'VACIO')
        })));
    } catch (e) { next(e); }
});

router.patch('/:id', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const allowed = {};
        for (const k of ['type', 'maxPallets', 'notes'])
            if (req.body && req.body[k] !== undefined) allowed[k] = req.body[k];

        const [updated] = await Location.update(allowed, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

        const loc = await Location.findByPk(req.params.id, { raw: true });
        res.json(loc);
    } catch (e) { next(e); }
});

router.patch('/:id/block', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const reason = req.body?.reason || 'Mantenimiento';
        const [updated] = await Location.update({ blocked: true, blockedReason: reason }, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

        const loc = await Location.findByPk(req.params.id, { raw: true });
        res.json(loc);
    } catch (e) { next(e); }
});

router.patch('/:id/unblock', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const [updated] = await Location.update({ blocked: false, blockedReason: '' }, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

        const loc = await Location.findByPk(req.params.id, { raw: true });
        res.json(loc);
    } catch (e) { next(e); }
});

function inferLevelPosition(code) {
    // Esperado: A01-F059-012
    const c = String(code || '').toUpperCase();
    const m = c.match(/^([A-Z])(\d{2})-F\d{3}-(\d{3})$/);
    if (!m) return {};
    const level = m[1]; // A/B/C
    // Para tu UI, position debería ser 1..12. Tomamos el último segmento 012 -> 12
    const pos = Number(m[3]) || null;
    return { level, position: pos };
}

module.exports = router;