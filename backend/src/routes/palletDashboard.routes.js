const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { PalletDashboardItem } = require('../models/sequelize')

const router = express.Router()

// GET /api/pallet-dashboard?day=YYYY-MM-DD
router.get('/pallet-dashboard', requireAuth, async(req, res, next) => {
    try {
        const day = String(req.query.day || '').slice(0, 10)
        if (!day) return res.status(400).json({ message: 'day requerido (YYYY-MM-DD)' })

        const rows = await PalletDashboardItem.findAll({
            where: { day },
            order: [
                ['palletId', 'ASC']
            ],
            raw: true
        })

        const total = rows.length
        const procesados = rows.filter(r => r.status === 'PROCESADO').length
        const pendientes = total - procesados

        res.json({
            day,
            resumen: { total, pendientes, procesados },
            rows: rows.map(r => ({ id: r.id, palletId: r.palletId, status: r.status }))
        })
    } catch (e) {
        next(e)
    }
})

// PATCH /api/pallet-dashboard/:id/status
router.patch('/pallet-dashboard/:id/status', requireAuth, async(req, res, next) => {
    try {
        const id = req.params.id
        const status = String(req.body?.status || '')

        if (!['PENDIENTE', 'PROCESADO'].includes(status)) {
            return res.status(400).json({ message: 'status inválido (PENDIENTE|PROCESADO)' })
        }

        const [updated] = await PalletDashboardItem.update({ status }, { where: { id } })
        if (!updated) return res.status(404).json({ message: 'No encontrado' })

        const row = await PalletDashboardItem.findByPk(id, { raw: true })
        res.json(row)
    } catch (e) {
        next(e)
    }
})

module.exports = router