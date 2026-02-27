const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ProductionRequest, User } = require('../models/sequelize');

const router = express.Router();

// ✅ Seguimos usando P1..P4 en DB (NO rompe nada)
const AREA_MAP = {
    P1: { label: 'Sorting', subareas: ['Sorting'] },
    P2: { label: 'FFT', subareas: ['PNP/POC/PEN', 'BOX PREP', 'Accesorios'] },
    P3: { label: 'Palletizing', subareas: ['Midea', 'O.C', 'ACC', 'OC'] },
    P4: { label: 'OpenCell', subareas: ['OpenCell'] },
};

const ALLOWED_AREAS = Object.keys(AREA_MAP);
const ALLOWED_STATUS = ['PENDIENTE', 'EN PROCESO', 'COMPLETADA', 'CANCELADA'];

function normalizeItems(items) {
    if (!Array.isArray(items)) return [];
    return items
        .map(i => ({
            sku: String(i?.sku || '').trim(),
            qty: Number(i?.qty || 0),
        }))
        .filter(i => i.sku && i.qty > 0);
}

// Permite que front mande "FFT" y lo convertimos a "P2" (sin romper compatibilidad)
function normalizeArea(areaInput) {
    const raw = String(areaInput || '').trim();
    if (!raw) return null;

    const up = raw.toUpperCase();

    // ya viene P1..P4
    if (ALLOWED_AREAS.includes(up)) return up;

    // viene por label (sorting/fft/palletizing/opencell)
    const found = ALLOWED_AREAS.find((k) => AREA_MAP[k].label.toUpperCase() === up);
    if (found) return found;

    return null;
}

function normalizeSubarea(areaCode, subareaInput) {
    const s = String(subareaInput || '').trim();
    if (!s) return null;

    const allowed = AREA_MAP[areaCode]?.subareas || [];
    // Validación “suave”: si no coincide exacto, lo guardamos igual (para no bloquear operación)
    // pero si quieres “estricta”, aquí se valida con includes().
    // return allowed.includes(s) ? s : null;

    return s;
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
            return {...j, _id: String(j.id) };
        }));
    } catch (e) { next(e); }
});

/**
 * POST /api/production
 * body: { area: 'P1'..'P4' OR 'FFT'|'Sorting'..., subarea?: string, items: [...], note?: string }
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

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const safeSubarea = normalizeSubarea(safeArea, subarea);

        const row = await ProductionRequest.create({
            area: safeArea,
            subarea: safeSubarea,
            requestedByUserId: userId,
            items: safeItems,
            note: note || '',
            status: 'PENDIENTE',
        });

        const out = row.toJSON();
        res.status(201).json({...out, _id: String(out.id) });
    } catch (e) { next(e); }
});

/**
 * PATCH /api/production/:id/status
 */
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { status } = req.body || {};
        const safeStatus = String(status || '').toUpperCase();

        if (!ALLOWED_STATUS.includes(safeStatus)) {
            return res.status(400).json({ message: 'Status inválido' });
        }

        const row = await ProductionRequest.findByPk(req.params.id);
        if (!row) return res.status(404).json({ message: 'No encontrado' });

        row.status = safeStatus;
        await row.save();

        const out = row.toJSON();
        res.json({...out, _id: String(out.id) });
    } catch (e) { next(e); }
});

module.exports = router;