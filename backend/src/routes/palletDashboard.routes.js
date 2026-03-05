// src/routes/palletDashboard.routes.js
const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { PalletDashboardItem, PalletDashboardDetail } = require('../models/sequelize')

const router = express.Router()

// ✅ GET /api/pallet-dashboard/details?day=YYYY-MM-DD
router.get('/pallet-dashboard/details', requireAuth, async(req, res, next) => {
    try {
        const day = String(req.query.day || '').slice(0, 10)
        if (!day) return res.status(400).json({ message: 'day requerido (YYYY-MM-DD)' })

        const rows = await PalletDashboardDetail.findAll({
            where: { day },
            order: [
                ['palletId', 'ASC'],
                ['id', 'ASC'],
            ],
            raw: true,
        })

        res.json({ day, rows })
    } catch (e) {
        next(e)
    }
})

// ✅ POST /api/pallet-dashboard/import
// body: { day: 'YYYY-MM-DD', items: [{palletId, status}], details: [{palletId, sku, qty, note}] }
router.post('/pallet-dashboard/import', requireAuth, async(req, res, next) => {
    try {
        // ✅ FIX: sin espacio, usando optional chaining correcto
        const day = String(req.body ? .day || '').slice(0, 10)

        const items = Array.isArray(req.body ? .items) ? req.body.items : []
        const details = Array.isArray(req.body ? .details) ? req.body.details : []

        if (!day) return res.status(400).json({ message: 'day requerido (YYYY-MM-DD)' })

        // 1) Limpia solo ese día (para reimportar sin duplicar)
        await PalletDashboardItem.destroy({ where: { day } })
        await PalletDashboardDetail.destroy({ where: { day } })

        // 2) Inserta items (control diario)
        const safeItems = items
            .map((x) => ({
                day,
                palletId: String(x ? .palletId ? ? '').trim(),
                status: String(x ? .status ? ? 'PENDIENTE').trim().toUpperCase() === 'PROCESADO' ? 'PROCESADO' : 'PENDIENTE',
            }))
            .filter((x) => x.palletId)

        if (safeItems.length) await PalletDashboardItem.bulkCreate(safeItems)

        // 3) Inserta detalles (piezas / sku / qty)
        const safeDetails = details
            .map((d) => ({
                day,
                palletId: String(d ? .palletId ? ? '').trim(),
                sku: d ? .sku == null ? null : String(d.sku).trim(),
                qty: Number(d ? .qty ? ? 0) || 0,
                note: d ? .note == null ? null : String(d.note),
            }))
            .filter((d) => d.palletId && (d.sku || d.qty > 0 || d.note))

        if (safeDetails.length) await PalletDashboardDetail.bulkCreate(safeDetails)

        res.json({ ok: true, day, inserted: { items: safeItems.length, details: safeDetails.length } })
    } catch (e) {
        next(e)
    }
})

module.exports = router