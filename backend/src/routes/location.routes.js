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

    // últimos movimientos por pallet
    const palletIds = pallets.map((p) => p.id).filter(Boolean);
    const lastMoveByPallet = new Map();

    if (palletIds.length) {
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
                [Op.in]: ['F001', 'F002', 'F003', 'F004', 'F005']
            }
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
                state: (raw?.state) || 'VACIO',
                code: (raw?.code) || null,
                blockedReason: (raw?.blockedReason) || (raw?.blocked_reason) || '',
                pallet: (raw?.pallet) || null,
                lastMoveAt: (raw?.lastMoveAt) || null,
                lastMoveBy: (raw?.lastMoveBy) || null
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

/**
 * =====================================================
 * ✅ NUEVO: POST /api/locations/seed-tech-opencell-bins
 * Crea bines TECHNICAL y OPENCELL (entrada/salida)
 * - No elimina nada
 * - No duplica (busca por code)
 * =====================================================
 *
 * Body opcional:
 * {
 *   "area": "A1",          // A1..A4 (default A1)
 *   "level": "A",          // A|B|C (default A)
 *   "startPosition": 800   // (default 800) para evitar choques
 * }
 */
router.post(
    '/seed-tech-opencell-bins',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR'),
    async(req, res, next) => {
        try {
            const area = String((req.body?.area) || 'A1').trim();
            const level = String((req.body?.level) || 'A').trim().toUpperCase();
            const startPosition = Number((req.body?.startPosition) || 800);

            // Validaciones suaves (para no romper)
            const validAreas = new Set(['A1', 'A2', 'A3', 'A4']);
            const validLevels = new Set(['A', 'B', 'C']);

            if (!validAreas.has(area)) {
                return res.status(400).json({ message: 'area inválida. Usa A1, A2, A3 o A4' });
            }
            if (!validLevels.has(level)) {
                return res.status(400).json({ message: 'level inválido. Usa A, B o C' });
            }

            // Helpers
            const makeList = (prefix, from, to) => {
                const out = [];
                for (let i = from; i <= to; i++) {
                    out.push(`${prefix}${String(i).padStart(2, '0')}`);
                }
                return out;
            };

            const TECH_IN = makeList('MTY-MAXX-TECH-AREA', 1, 5);
            const TECH_OUT = makeList('MTY-MAXX-TECH-RETURN', 1, 5);

            const OPEN_IN = makeList('MTY-MAXX-OPENCELL-AREA', 1, 5);
            const OPEN_OUT = makeList('MTY-MAXX-OPENCELL-RETURN', 1, 5);

            // Armado final (type FLOOR para ENTRADA, RETURNS para SALIDA)
            const desired = [
                ...TECH_IN.map((code) => ({ code, subarea: 'TECHNICAL', type: 'FLOOR' })),
                ...TECH_OUT.map((code) => ({ code, subarea: 'TECHNICAL', type: 'RETURNS' })),
                ...OPEN_IN.map((code) => ({ code, subarea: 'OPENCELL', type: 'FLOOR' })),
                ...OPEN_OUT.map((code) => ({ code, subarea: 'OPENCELL', type: 'RETURNS' })),
            ];

            let pos = startPosition;

            const created = [];
            const updated = [];
            const existing = [];

            for (const item of desired) {
                const found = await Location.findOne({ where: { code: item.code } });

                if (!found) {
                    // ✅ Creamos nuevo, sin tocar racks (rack=null)
                    const row = await Location.create({
                        area,
                        subarea: item.subarea,
                        rack: null,
                        level,
                        position: pos++,
                        type: item.type,
                        maxPallets: 1,
                        notes: `${item.subarea} - ${item.type === 'FLOOR' ? 'ENTRADA' : 'SALIDA'}`,
                        blocked: false,
                        blockedReason: '',
                        code: item.code,
                    });
                    created.push(row.code);
                    continue;
                }

                // ✅ Ya existe: NO lo borramos.
                // Solo lo "completamos" si le faltan campos clave (sin corromper)
                const patch = {};
                if (!found.subarea) patch.subarea = item.subarea;
                if (!found.type) patch.type = item.type;
                if (!found.area) patch.area = area;
                if (!found.level) patch.level = level;
                if (!found.position) patch.position = pos++; // solo si le falta

                const patchKeys = Object.keys(patch);
                if (patchKeys.length) {
                    await Location.update(patch, { where: { id: found.id } });
                    updated.push(item.code);
                } else {
                    existing.push(item.code);
                }
            }

            return res.json({
                ok: true,
                total: desired.length,
                createdCount: created.length,
                updatedCount: updated.length,
                existingCount: existing.length,
                created,
                updated,
                existing,
            });
        } catch (e) {
            next(e);
        }
    }
);

/**
 * =====================================================
 * ✅ NUEVO: POST /api/locations/rebalance-racks
 * Reacomoda racks 120 (30 por área):
 * A1: F001-F030
 * A2: F031-F060
 * A3: F061-F090
 * A4: F091-F120
 *
 * - NO borra nada
 * - Detecta colisiones (unique area+rack+level+position)
 * - Usa transacción
 *
 * Body opcional:
 * { "dryRun": true }  // solo simula
 * =====================================================
 */
router.post(
    '/rebalance-racks',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR'),
    async(req, res, next) => {
        const t = await Location.sequelize.transaction();
        try {
            const dryRun = !!(req.body?.dryRun);

            const all = await Location.findAll({ raw: true, transaction: t });

            // Solo ubicaciones que son racks (rack = F###)
            const rackLocs = all.filter(l => {
                const r = String(l.rack || '').toUpperCase().trim();
                return /^F\d{3}$/.test(r);
            });

            const parseRackNum = (rack) => Number(String(rack).replace(/^F/i, ''));

            const targetAreaByRack = (rackCode) => {
                const n = parseRackNum(rackCode);
                if (n >= 1 && n <= 30) return 'A1';
                if (n >= 31 && n <= 60) return 'A2';
                if (n >= 61 && n <= 90) return 'A3';
                if (n >= 91 && n <= 120) return 'A4';
                return null; // fuera de 120 no tocamos
            };

            // 1) Detectar qué se movería
            const changes = [];
            for (const l of rackLocs) {
                const rackCode = String(l.rack).toUpperCase().trim();
                const targetArea = targetAreaByRack(rackCode);
                if (!targetArea) continue; // no tocar F121+ o raros
                if (String(l.area) !== targetArea) {
                    changes.push({
                        id: l.id,
                        fromArea: l.area,
                        toArea: targetArea,
                        rack: rackCode,
                        level: l.level,
                        position: l.position
                    });
                }
            }

            // 2) Checar colisiones por índice único: area+rack+level+position
            // Vamos a simular el estado final en memoria.
            const key = (area, rack, level, position) =>
                `${area}|${String(rack || '').toUpperCase()}|${String(level || '').toUpperCase()}|${Number(position || 0)}`;

            // estado actual
            const finalMap = new Map();
            for (const l of rackLocs) {
                const k = key(l.area, l.rack, l.level, l.position);
                if (!finalMap.has(k)) finalMap.set(k, []);
                finalMap.get(k).push(l.id);
            }

            // aplicar cambios en memoria (remover clave vieja y agregar clave nueva)
            const idToLoc = new Map(rackLocs.map(l => [l.id, l]));
            const collisions = [];

            for (const ch of changes) {
                const loc = idToLoc.get(ch.id);
                if (!loc) continue;

                const oldK = key(loc.area, loc.rack, loc.level, loc.position);
                const newK = key(ch.toArea, loc.rack, loc.level, loc.position);

                // quitar de oldK
                const arrOld = finalMap.get(oldK) || [];
                finalMap.set(oldK, arrOld.filter(x => x !== loc.id));

                // agregar a newK
                const arrNew = finalMap.get(newK) || [];
                arrNew.push(loc.id);
                finalMap.set(newK, arrNew);

                // si newK queda con 2+ ids => colisión
                if (arrNew.length > 1) {
                    collisions.push({
                        key: newK,
                        rack: String(loc.rack).toUpperCase(),
                        level: loc.level,
                        position: loc.position,
                        ids: arrNew.slice()
                    });
                }
            }

            if (collisions.length) {
                await t.rollback();
                return res.status(409).json({
                    ok: false,
                    message: 'Se detectaron colisiones (area+rack+level+position). No se aplicó nada.',
                    collisions,
                    previewChangesCount: changes.length,
                    previewFirstChanges: changes.slice(0, 20)
                });
            }

            // 3) Si dryRun, no aplicar
            if (dryRun) {
                await t.rollback();
                return res.json({
                    ok: true,
                    dryRun: true,
                    wouldChangeCount: changes.length,
                    sample: changes.slice(0, 30)
                });
            }

            // 4) Aplicar updates
            let updatedCount = 0;
            for (const ch of changes) {
                const [u] = await Location.update({ area: ch.toArea }, { where: { id: ch.id }, transaction: t });
                updatedCount += Number(u || 0);
            }

            await t.commit();
            return res.json({
                ok: true,
                updatedCount,
                totalCandidates: rackLocs.length,
                changesCount: changes.length
            });
        } catch (e) {
            await t.rollback();
            next(e);
        }
    }
);

module.exports = router;