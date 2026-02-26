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
    // A01 = level + position(2)
    // 012 = position(3)
    const level = safeUpper(loc.level || 'A');
    const pos = Number(loc.position || 1);
    const pos2 = String(pos).padStart(2, '0');
    const pos3 = String(pos).padStart(3, '0');
    return `${level}${pos2}-${rackCode}-${pos3}`;
}

function rackFilter(loc, rackCode) {
    // ✅ PRO: si tu DB tiene columna rack
    const dbRack = safeUpper(loc.rack);
    if (dbRack) return dbRack === rackCode;

    // ✅ Fallback: si tu DB tiene code tipo A01-F059-012
    const code = safeUpper(loc.code);
    if (code) return code.includes(`-${rackCode}-`);

    // ❗️Si no hay rack ni code, NO se puede inferir el rack con certeza.
    // Para NO romper y NO traer TODO el almacén, regresamos false.
    return false;
}

/**
 * =====================================================
 * ✅ GET /api/locations/racks/:rackCode
 * VERSION PRO — NO ROMPE NADA EXISTENTE
 * Devuelve: { rackCode, locations:[ { ...loc, state, pallet, lastMoveAt, lastMoveBy } ] }
 * =====================================================
 */
router.get('/racks/:rackCode', requireAuth, async(req, res, next) => {
    try {
        const rackCode = safeUpper(req.params.rackCode);

        if (!/^F\d{3}$/.test(rackCode)) {
            return res.status(400).json({ message: 'Rack inválido' });
        }

        // ===============================
        // 1️⃣ Locations (todas) + filtrar por rack (real)
        // ===============================
        const locations = await Location.findAll({ raw: true });

        const rackLocs = locations
            .filter((l) => rackFilter(l, rackCode))
            .sort((a, b) => {
                const la = String(a.level || '').localeCompare(String(b.level || ''));
                if (la !== 0) return la;
                return (Number(a.position) || 0) - (Number(b.position) || 0);
            });

        const locIds = rackLocs.map((l) => l.id).filter(Boolean);

        if (!locIds.length) {
            // Si tu DB no tiene rack/code, aquí verás vacío (es correcto).
            // Para que funcione el rack, necesitas guardar rack o code en Location.
            return res.json({ rackCode, locations: [] });
        }

        // ===============================
        // 2️⃣ Pallets en esas locations (ocupación)
        // ===============================
        const pallets = await Pallet.findAll({
            where: {
                locationId: {
                    [Op.in]: locIds
                },
                status: {
                    [Op.in]: ACTIVE_PALLET_STATUS
                }
            },
            raw: true
        });

        const palletByLocation = new Map();
        for (const p of pallets) palletByLocation.set(p.locationId, p);

        // ===============================
        // 3️⃣ Últimos movimientos por pallet (más eficiente)
        // ===============================
        const palletIds = pallets.map((p) => p.id).filter(Boolean);

        // Mapa palletId -> { createdAt, userEmail }
        const lastMoveByPallet = new Map();

        if (palletIds.length) {
            // ✅ Optimización:
            // traemos movimientos recientes ordenados DESC y nos quedamos con el primero por pallet
            // (limit alto para racks “normales”, evita bajar TODO)
            const movements = await Movement.findAll({
                where: {
                    palletId: {
                        [Op.in]: palletIds
                    }
                },
                include: [{ model: User, as: 'user', attributes: ['email'] }],
                order: [
                    ['createdAt', 'DESC']
                ],
                limit: 5000 // seguridad por si hay muchos movimientos
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

        // ===============================
        // 4️⃣ Shape final
        // ===============================
        const shaped = rackLocs.map((loc) => {
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

            // code: si DB trae loc.code lo respetamos; si no, lo calculamos
            const computedCode = loc.code || computeLocationCode(loc, rackCode);

            return {
                ...loc,
                code: computedCode,
                state,

                pallet: pallet ? {
                    id: pallet.id,
                    code: pallet.code,
                    lot: pallet.lot,
                    sku: firstItem?.sku || null,
                    qty: firstItem?.qty || 0,
                    status: pallet.status
                } : null,

                lastMoveAt,
                lastMoveBy
            };
        });

        res.json({ rackCode, locations: shaped });
    } catch (e) {
        next(e);
    }
});

/**
 * =====================================================
 * ✅ GET /api/locations
 * (con area opcional) + calcula state (OCUPADO/VACIO/BLOQUEADO)
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
                    [Op.in]: locIds
                },
                status: {
                    [Op.in]: ACTIVE_PALLET_STATUS
                }
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
 * (NO tocado: solo permite type/maxPallets/notes)
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

/**
 * =====================================================
 * ✅ PATCH /api/locations/:id/block
 * =====================================================
 */
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

/**
 * =====================================================
 * ✅ PATCH /api/locations/:id/unblock
 * =====================================================
 */
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