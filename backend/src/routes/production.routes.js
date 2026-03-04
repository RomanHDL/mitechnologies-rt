const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ProductionRequest, User } = require('../models/sequelize');

const router = express.Router();

// ✅ DB sigue igual P1..P4
const AREA_MAP = {
    P1: { label: 'Sorting', subareas: ['Sorting'] },
    P2: { label: 'FFT', subareas: ['Accesorios', 'Produccion', 'Paletizado'] },
    P3: { label: 'Shipping', subareas: ['Shipping'] },
    P4: { label: 'OpenCell', subareas: ['OpenCell', 'Technical'] },
};

const ALLOWED_AREAS = Object.keys(AREA_MAP);

// ✅ Status que UI maneja
const UI_STATUS = ['PENDIENTE', 'EN PROCESO', 'COMPLETADA', 'CANCELADA'];

// ✅ Legacy por si existen datos viejos (NO rompe nada)
const LEGACY_STATUS = ['OPEN', 'FULFILLED', 'CANCELLED'];

function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map(i => ({
            sku: String(i ? .sku || '').trim(),
            qty: Number(i ? .qty || 0),
        }))
        .filter(i => i.sku && i.qty > 0);
}

function normalizeArea(areaInput) {
    const raw = String(areaInput || '').trim();
    if (!raw) return null;

    const up = raw.toUpperCase();

    if (ALLOWED_AREAS.includes(up)) return up;

    const found = ALLOWED_AREAS.find((k) => AREA_MAP[k].label.toUpperCase() === up);
    if (found) return found;

    return null;
}

function normalizeSubarea(areaCode, subareaInput) {
    const s = String(subareaInput || '').trim();
    if (!s) return null;
    // Validación suave (no bloquea operación)
    return s;
}

/**
 * ✅ Convierte legacy -> UI para que TODO lo que vea el frontend sea consistente
 */
function toUiStatus(dbStatus) {
    const s = String(dbStatus || '').toUpperCase();
    if (UI_STATUS.includes(s)) return s;

    if (s === 'OPEN') return 'PENDIENTE';
    if (s === 'FULFILLED') return 'COMPLETADA';
    if (s === 'CANCELLED') return 'CANCELADA';

    return s || 'PENDIENTE';
}

/**
 * ✅ Convierte UI -> DB para guardar correctamente
 * Nota: si mandan EN PROCESO lo guardamos como EN PROCESO (ya está permitido en el modelo)
 */
function toDbStatus(input) {
    const s = String(input || '').toUpperCase();

    // si ya viene UI
    if (UI_STATUS.includes(s)) return s;

    // si viene legacy
    if (LEGACY_STATUS.includes(s)) return s;

    // compat extra (por si te mandan sin espacio)
    if (s === 'ENPROCESO') return 'EN PROCESO';

    return null;
}

/**
 * GET /api/production
 */
router.get('/', requireAuth, async(req, res, next) => {
    try {
        const rows = await ProductionRequest.findAll({
            include: [{
                model: User,
                as: 'requestedBy',
                attributes: ['id', 'email', 'fullName'],
                required: false,
            }],
            order: [
                ['createdAt', 'DESC']
            ],
        });

        res.json(rows.map(r => {
            const j = r.toJSON();
            // ✅ Mandamos status UI siempre
            return {...j, status: toUiStatus(j.status), _id: String(j.id) };
        }));
    } catch (e) { next(e); }
});

/**
 * POST /api/production
 */
router.post('/', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { area, subarea, items, note } = req.body || {};

        const safeArea = normalizeArea(area);
        if (!safeArea) {
            return res.status(400).json({ message: 'Área de producción inválida' });
        }

        const safeItems = normalizeItems(items);
        if (!safeItems.length) {
            return res.status(400).json({ message: 'Items requeridos' });
        }

        const userId = req.user ? .id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const safeSubarea = normalizeSubarea(safeArea, subarea);

        // ✅ FIX: ahora guardamos el status correcto que tu UI usa
        const row = await ProductionRequest.create({
            area: safeArea,
            subarea: safeSubarea,
            requestedByUserId: userId,
            items: safeItems,
            note: note || '',
            status: 'PENDIENTE',
        });

        const out = row.toJSON();
        res.status(201).json({...out, status: toUiStatus(out.status), _id: String(out.id) });
    } catch (e) { next(e); }
});

/**
 * PATCH /api/production/:id/status
 */
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const dbStatus = toDbStatus(req.body ? .status);
        if (!dbStatus) {
            return res.status(400).json({ message: 'Status inválido' });
        }

        const row = await ProductionRequest.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'No encontrado' });

        row.status = dbStatus;
        await row.save();

        const out = row.toJSON();
        res.json({...out, status: toUiStatus(out.status), _id: String(out.id) });
    } catch (e) { next(e); }
});

module.exports = router;