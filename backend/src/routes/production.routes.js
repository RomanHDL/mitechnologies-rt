const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { ProductionRequest, User } = require('../models/sequelize');

const router = express.Router();

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

        res.json(rows);
    } catch (e) { next(e); }
});

/**
 * POST /api/production
 * Crea solicitud
 * body: { area: 'P1'|'P2'|'P3'|'P4', items: [...], note?: string }
 */
router.post('/', requireAuth, async(req, res, next) => {
    try {
        const { area, items, note } = req.body || {};

        if (!['P1', 'P2', 'P3', 'P4'].includes(area)) {
            return res.status(400).json({ message: 'Área de producción inválida' });
        }
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Items requeridos' });
        }

        // compat: depende de cómo tu middleware setea req.user
        const userId = req.user?.id || req.user?.userId || req.user?._id;
        if (!userId) return res.status(401).json({ message: 'No autenticado' });

        const row = await ProductionRequest.create({
            area,
            requestedByUserId: userId,
            items,
            note: note || '',
            status: 'OPEN',
        });

        res.status(201).json(row);
    } catch (e) { next(e); }
});

/**
 * PATCH /api/production/:id/status
 * body: { status: 'OPEN'|'FULFILLED'|'CANCELLED' }
 */
router.patch('/:id/status', requireAuth, async(req, res, next) => {
    try {
        const { status } = req.body || {};
        if (!['OPEN', 'FULFILLED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido' });
        }

        const [updated] = await ProductionRequest.update({ status }, { where: { id: req.params.id } });

        if (!updated) return res.status(404).json({ message: 'No encontrado' });

        const row = await ProductionRequest.findByPk(req.params.id);
        res.json(row);
    } catch (e) { next(e); }
});

module.exports = router;