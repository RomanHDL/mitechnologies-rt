const express = require('express');
const { CycleCount, Location, Pallet, User } = require('../models/sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

async function systemSnapshotForLocation(locationId) {
    const pallet = await Pallet.findOne({
        where: {
            locationId,
            status: ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED']
        },
        raw: true
    });
    return pallet?.items || [];
}

function diff(systemItems, countedItems) {
    const mapSys = new Map();
    for (const it of(systemItems || [])) mapSys.set(it.sku, (mapSys.get(it.sku) || 0) + (it.qty || 0));
    const mapCnt = new Map();
    for (const it of(countedItems || [])) mapCnt.set(it.sku, (mapCnt.get(it.sku) || 0) + (it.qty || 0));
    const skus = new Set([...mapSys.keys(), ...mapCnt.keys()]);
    const out = [];
    for (const sku of skus) {
        const s = mapSys.get(sku) || 0;
        const c = mapCnt.get(sku) || 0;
        if (s != c) out.push({ sku, systemQty: s, countedQty: c, diff: c - s });
    }
    return out;
}

// ✅ helper: normaliza status legacy del frontend sin romper nada
function normalizeStatus(input) {
    const s = String(input || '').trim().toUpperCase();

    // compatibilidad: frontend viejo mandaba VALIDATED
    if (s === 'VALIDATED') return 'APPROVED';

    // statuses válidos del modelo
    const allowed = new Set(['OPEN', 'REVIEW', 'APPROVED', 'CLOSED', 'CANCELLED']);
    if (!allowed.has(s)) return null;
    return s;
}

router.get('/', requireAuth, async(req, res, next) => {
    try {
        const rows = await CycleCount.findAll({
            include: [
                { model: User, as: 'createdBy', attributes: ['email'] },
                { model: User, as: 'approvedBy', attributes: ['email'] }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        });
        res.json(rows.map(r => r.toJSON()));
    } catch (e) { next(e); }
});

router.post('/', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { name, scope, area, level, notes } = req.body || {};
        const sc = scope || 'AREA';
        let filter = {};
        if (sc === 'AREA') filter = { area };
        if (sc === 'LEVEL') filter = { area, level };
        if (!filter.area) return res.status(400).json({ message: 'Área requerida' });

        const locs = await Location.findAll({ where: filter, raw: true });
        const lines = [];
        for (const l of locs) {
            const sys = await systemSnapshotForLocation(l.id);
            lines.push({ location: l.id, countedItems: [], systemItems: sys, difference: [] });
        }

        const row = await CycleCount.create({
            name: name || `Conteo ${filter.area}${filter.level ? '-' + filter.level : ''}`,
            scope: sc,
            area: filter.area,
            level: filter.level || '',
            status: 'OPEN',
            lines,
            notes: notes || '',
            createdById: req.user.id
        });

        res.status(201).json(row.toJSON());
    } catch (e) { next(e); }
});

router.post('/:id/line/:locationId', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { countedItems } = req.body || {};
        if (!Array.isArray(countedItems)) return res.status(400).json({ message: 'countedItems requerido' });

        const cc = await CycleCount.findByPk(req.params.id);
        if (!cc) return res.status(404).json({ message: 'Conteo no encontrado' });
        if (!['OPEN', 'REVIEW'].includes(cc.status)) return res.status(400).json({ message: 'Conteo no editable' });

        const lines = cc.lines || [];
        const line = lines.find(l => String(l.location) === String(req.params.locationId));
        if (!line) return res.status(404).json({ message: 'Ubicación fuera del conteo' });

        line.countedItems = countedItems;
        line.difference = diff(line.systemItems, line.countedItems);
        cc.status = 'REVIEW';
        cc.lines = lines;
        await cc.save();

        res.json({ ok: true, difference: line.difference });
    } catch (e) { next(e); }
});

// ✅ NUEVO: compatibilidad con frontend (PATCH /api/counts/:id/status)
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const ns = normalizeStatus(req.body?.status);
        if (!ns) return res.status(400).json({ message: 'Status inválido' });

        const cc = await CycleCount.findByPk(req.params.id);
        if (!cc) return res.status(404).json({ message: 'Conteo no encontrado' });

        // reglas suaves (no te rompo el flujo)
        const cur = String(cc.status || '').toUpperCase();

        // no permitir cambios si ya está cerrado/cancelado
        if (['CLOSED', 'CANCELLED'].includes(cur)) {
            return res.status(400).json({ message: 'Conteo ya cerrado/cancelado' });
        }

        // si mandan APPROVED: marca approvedBy/approvedAt (equivalente al /approve)
        if (ns === 'APPROVED') {
            cc.status = 'APPROVED';
            cc.approvedById = req.user.id;
            cc.approvedAt = new Date();
            await cc.save();
            return res.json({ ok: true, status: cc.status });
        }

        // cerrar: recomendado solo si ya está APPROVED (pero no forzamos duro)
        if (ns === 'CLOSED') {
            cc.status = 'CLOSED';
            await cc.save();
            return res.json({ ok: true, status: cc.status });
        }

        // OPEN/REVIEW/CANCELLED
        cc.status = ns;
        await cc.save();
        return res.json({ ok: true, status: cc.status });
    } catch (e) { next(e); }
});

router.post('/:id/approve', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const cc = await CycleCount.findByPk(req.params.id);
        if (!cc) return res.status(404).json({ message: 'Conteo no encontrado' });
        if (['APPROVED', 'CLOSED'].includes(cc.status)) return res.status(400).json({ message: 'Conteo ya aprobado/cerrado' });

        cc.status = 'APPROVED';
        cc.approvedById = req.user.id;
        cc.approvedAt = new Date();
        await cc.save();

        res.json({ ok: true });
    } catch (e) { next(e); }
});

module.exports = router;