const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { ProductionRequest, User } = require('../models/sequelize');

const router = express.Router();

const ALLOWED_AREAS = ['P1', 'P2', 'P3', 'P4'];
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

/**
 * GET /api/production
 * Lista solicitudes de producción (más nuevas primero)
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
 * Crea solicitud
 * body: { area: 'P1'|'P2'|'P3'|'P4', items: [...], note?: string }
 */
router.post('/', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { area, items, note } = req.body || {};
        const safeArea = String(area || '').toUpperCase();

        if (!ALLOWED_AREAS.includes(safeArea)) {
            return res.status(400).json({ message: 'Área de producción inválida' });
        }

        const safeItems = normalizeItems(items);
        if (!safeItems.length) {
            return res.status(400).json({ message: 'Items requeridos' });
        }

        const userId = req.user?.id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const row = await ProductionRequest.create({
            area: safeArea,
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
 * body: { status: 'PENDIENTE'|'EN PROCESO'|'COMPLETADA'|'CANCELADA' }
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