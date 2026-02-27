const express = require('express');
const { Op } = require('sequelize');
const { Location, Pallet, Movement, User } = require('../models/sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// status que cuentan como “ocupado” en el almacén
const ACTIVE_PALLET_STATUS = ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED', 'ADJUSTED'];

/**
 * Helpers (no rompen nada)
 */
function safeUpper(v) {
    return String(v || '').trim().toUpperCase();
}

function computeLocationCode(loc, rackCode) {
    // Formato UI esperado: A01-F059-012
    const level = safeUpper(loc.level || 'A');
    const pos = Number(loc.position || 1);
    const pos2 = String(pos).padStart(2, '0');
    const pos3 = String(pos).padStart(3, '0');
    return `${level}${pos2}-${rackCode}-${pos3}`;
}

function rackFilter(loc, rackCode) {
    const dbRack = safeUpper(loc.rack);
    if (dbRack) return dbRack === rackCode;

    const code = safeUpper(loc.code);
    if (code) return code.includes(`-${rackCode}-`);

    return false;
}

// ✅ Enriquecedor reutilizable (pallet + last move + state)
async function enrichLocations(rawLocations, { rackCodeForCompute } = {}) {
    const locations = (rawLocations || []).map((l) => ({...l }));
    const locIds = locations.map((l) => l.id).filter(Boolean);
    if (!locIds.length) return [];

    // pallets activos en esas locations
    const pallets = await Pallet.findAll({
        where: {
            locationId: {
                [Op.in]: locIds },
            status: {
                [Op.in]: ACTIVE_PALLET_STATUS }
        },
        raw: true
    });

    const palletByLocation = new Map();
    for (const p of pallets) palletByLocation.set(p.locationId, p);

    // últimos movimientos por pallet
    const palletIds = pallets.map((p) => p.id).filter(Boolean);
    const lastMoveByPallet = new Map();

    if (palletIds.length) {
        const movements = await Movement.findAll({
            where: { palletId: {
                    [Op.in]: palletIds } },
            include: [{ model: User, as: 'user', attributes: ['email'] }],
            order: [
                ['createdAt', 'DESC']
            ],
            limit: 5000
        });

        for (const m of movements) {
            const pid = m.palletId;
            if (!lastMoveByPallet.has(pid)) {
                lastMoveByPallet.set(pid, {
                    createdAt: m.createdAt || null,
                    userEmail: m.user?.email || null
                });
            }
        }
    }

    // shape final
    return locations.map((loc) => {
        const pallet = palletByLocation.get(loc.id) || null;

        let state = 'VACIO';
        if (loc.blocked) state = 'BLOQUEADO';
        else if (pallet) state = 'OCUPADO';

        let lastMoveAt = null;
        let lastMoveBy = null;

        if (pallet) {
            const mv = lastMoveByPallet.get(pallet.id);
            if (mv) {
                lastMoveAt = mv.createdAt;
                lastMoveBy = mv.userEmail;
            }
        }

        const firstItem = pallet?.items?.[0] || null;

        // code: si trae loc.code lo respetamos; si no, lo calculamos si tenemos rackCodeForCompute
        const computedCode =
            loc.code ||
            (rackCodeForCompute ? computeLocationCode(loc, rackCodeForCompute) : null);

        return {
            ...loc,
            code: computedCode || loc.code || null,
            state,
            pallet: pallet ?
                {
                    id: pallet.id,
                    code: pallet.code,
                    lot: pallet.lot,
                    sku: firstItem?.sku || null,
                    qty: firstItem?.qty || 0,
                    status: pallet.status
                } :
                null,
            lastMoveAt,
            lastMoveBy
        };
    });
}

/**
 * =====================================================
 * ✅ GET /api/locations/racks/:rackCode
 * (TU ENDPOINT EXISTENTE - NO TOCADO, solo usa enrich)
 * =====================================================
 */
router.get('/racks/:rackCode', requireAuth, async(req, res, next) => {
    try {
        const rackCode = safeUpper(req.params.rackCode);

        if (!/^F\d{3}$/.test(rackCode)) {
            return res.status(400).json({ message: 'Rack inválido' });
        }

        const locations = await Location.findAll({ raw: true });

        const rackLocs = locations
            .filter((l) => rackFilter(l, rackCode))
            .sort((a, b) => {
                const la = String(a.level || '').localeCompare(String(b.level || ''));
                if (la !== 0) return la;
                return (Number(a.position) || 0) - (Number(b.position) || 0);
            });

        if (!rackLocs.length) return res.json({ rackCode, locations: [] });

        const shaped = await enrichLocations(rackLocs, { rackCodeForCompute: rackCode });
        res.json({ rackCode, locations: shaped });
    } catch (e) {
        next(e);
    }
});

/**
 * =====================================================
 * ✅ NUEVO: GET /api/locations/bins?area=A1&subarea=...
 * Devuelve bins “normales” para grid
 * =====================================================
 */
router.get('/bins', requireAuth, async(req, res, next) => {
    try {
        const { area, subarea } = req.query;

        const where = {};
        if (area) where.area = String(area).trim();
        if (subarea) where.subarea = String(subarea).trim();

        const locations = await Location.findAll({ where, raw: true });
        const shaped = await enrichLocations(locations, { rackCodeForCompute: null });

        // orden estable
        shaped.sort((a, b) => {
            const ra = String(a.rack || '').localeCompare(String(b.rack || ''));
            if (ra !== 0) return ra;
            const la = String(a.level || '').localeCompare(String(b.level || ''));
            if (la !== 0) return la;
            return (Number(a.position) || 0) - (Number(b.position) || 0);
        });

        res.json({ area: area || null, subarea: subarea || null, locations: shaped });
    } catch (e) {
        next(e);
    }
});

/**
 * =====================================================
 * ✅ NUEVO: GET /api/locations/fft/accesorios?area=A1
 * Caso especial “estantes por altura” (H1..H5)
 *
 * Interpreta:
 * - Alturas = rack F001..F005 (1 abajo → 5 arriba)
 * - Si hay más de 1 row por altura (por tu insert anterior), usa la position mínima
 * =====================================================
 */
router.get('/fft/accesorios', requireAuth, async(req, res, next) => {
    try {
        const { area } = req.query;

        const where = {
            rack: {
                [Op.in]: ['F001', 'F002', 'F003', 'F004', 'F005'] }
        };
        if (area) where.area = String(area).trim();

        const all = await Location.findAll({ where, raw: true });

        // agrupa por rack (altura) y toma el registro con position mínima
        const byRack = new Map();
        for (const l of all) {
            const r = safeUpper(l.rack);
            if (!r) continue;
            const prev = byRack.get(r);
            if (!prev) byRack.set(r, l);
            else if (Number(l.position || 9999) < Number(prev.position || 9999)) byRack.set(r, l);
        }

        const heights = ['F001', 'F002', 'F003', 'F004', 'F005'].map((rackCode) => {
            const loc = byRack.get(rackCode) || null;
            return { rackCode, loc };
        });

        // enrich solo los que existen
        const existingLocs = heights.map(h => h.loc).filter(Boolean);
        const enriched = await enrichLocations(existingLocs, { rackCodeForCompute: null });
        const enrichedById = new Map(enriched.map(l => [l.id, l]));

        const result = heights.map((h, idx) => {
            const raw = h.loc ? (enrichedById.get(h.loc.id) || h.loc) : null;
            // H1..H5 (texto UI)
            const heightLabel = `H${idx + 1}`;
            return {
                height: heightLabel,
                rackCode: h.rackCode,
                state: raw?.state || 'VACIO',
                code: raw?.code || null,
                blockedReason: raw?.blockedReason || raw?.blocked_reason || '',
                pallet: raw?.pallet || null,
                lastMoveAt: raw?.lastMoveAt || null,
                lastMoveBy: raw?.lastMoveBy || null
            };
        });

        res.json({ area: area || null, heights: result });
    } catch (e) {
        next(e);
    }
});

/**
 * =====================================================
 * ✅ GET /api/locations
 * (EXISTENTE)
 * =====================================================
 */
router.get('/', requireAuth, async(req, res, next) => {
    try {
        const { area } = req.query;
        const where = {};
        if (area) where.area = area;

        const locations = await Location.findAll({ where, raw: true });
        const locIds = locations.map((l) => l.id).filter(Boolean);

        if (!locIds.length) return res.json([]);

        const pallets = await Pallet.findAll({
            where: {
                locationId: {
                    [Op.in]: locIds },
                status: {
                    [Op.in]: ACTIVE_PALLET_STATUS }
            },
            attributes: ['locationId'],
            raw: true
        });

        const occupied = new Set(pallets.map((p) => p.locationId));

        res.json(
            locations.map((l) => ({
                ...l,
                state: l.blocked ? 'BLOQUEADO' : occupied.has(l.id) ? 'OCUPADO' : 'VACIO'
            }))
        );
    } catch (e) {
        next(e);
    }
});

/**
 * =====================================================
 * ✅ PATCH /api/locations/:id
 * (EXISTENTE)
 * =====================================================
 */
router.patch('/:id', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const allowed = {};
        for (const k of['type', 'maxPallets', 'notes']) {
            if (req.body && req.body[k] !== undefined) allowed[k] = req.body[k];
        }

        const [updated] = await Location.update(allowed, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

        const loc = await Location.findByPk(req.params.id, { raw: true });
        res.json(loc);
    } catch (e) {
        next(e);
    }
});

router.patch('/:id/block', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const reason = req.body?.reason || 'Mantenimiento';
        const [updated] = await Location.update({ blocked: true, blockedReason: reason }, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

        const loc = await Location.findByPk(req.params.id, { raw: true });
        res.json(loc);
    } catch (e) {
        next(e);
    }
});

router.patch('/:id/unblock', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const [updated] = await Location.update({ blocked: false, blockedReason: '' }, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'Ubicación no encontrada' });

        const loc = await Location.findByPk(req.params.id, { raw: true });
        res.json(loc);
    } catch (e) {
        next(e);
    }
});

module.exports = router;