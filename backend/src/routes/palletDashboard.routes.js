const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { PalletDashboardItem } = require('../models/sequelize');

const router = express.Router();

// GET /api/pallet-dashboard?day=YYYY-MM-DD
router.get('/', requireAuth, async(req, res, next) => {
    try {
        const day = req.query.day;
        if (!day) return res.status(400).json({ message: 'day requerido (YYYY-MM-DD)' });

        const rows = await PalletDashboardItem.findAll({
            where: { day },
            order: [
                ['palletId', 'ASC']
            ],
            raw: true
        });

        const resumen = {
            total: rows.length,
            pendientes: rows.filter(r => r.status === 'PENDIENTE').length,
            procesados: rows.filter(r => r.status === 'PROCESADO').length,
        };

        res.json({ day, resumen, rows });
    } catch (e) { next(e); }
});

// PATCH /api/pallet-dashboard/:id/status
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { status } = req.body || {};
        if (!['PENDIENTE', 'PROCESADO'].includes(status)) {
            return res.status(400).json({ message: 'status inválido' });
        }

        const [updated] = await PalletDashboardItem.update({ status }, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'No encontrado' });

        const row = await PalletDashboardItem.findByPk(req.params.id, { raw: true });
        res.json(row);
    } catch (e) { next(e); }
});

module.exports = router;