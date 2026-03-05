const express = require('express')
const { requireAuth } = require('../middleware/auth')
const { PalletDashboardItem, PalletDashboardDetail } = require('../models/sequelize')

const router = express.Router()

// ✅ GET /api/pallet-dashboard?day=YYYY-MM-DD
router.get('/pallet-dashboard', requireAuth, async(req, res, next) => {
    try {
        const day = String((req.query && req.query.day) ? req.query.day : '').slice(0, 10)
        if (!day) return res.status(400).json({ message: 'day requerido (YYYY-MM-DD)' })

        const items = await PalletDashboardItem.findAll({
            where: { day },
            order: [
                ['palletId', 'ASC'],
                ['id', 'ASC']
            ],
            raw: true
        })

        const total = items.length
        const procesados = items.filter(x => x.status === 'PROCESADO').length
        const pendientes = items.filter(x => x.status !== 'PROCESADO').length

        res.json({
            day,
            resumen: { total, pendientes, procesados },
            rows: items.map(x => ({
                id: x.id,
                palletId: x.palletId,
                status: x.status
            }))
        })
    } catch (e) {
        next(e)
    }
})

// ✅ GET /api/pallet-dashboard/details?day=YYYY-MM-DD
router.get('/pallet-dashboard/details', requireAuth, async(req, res, next) => {
    try {
        const day = String((req.query && req.query.day) ? req.query.day : '').slice(0, 10)
        if (!day) return res.status(400).json({ message: 'day requerido (YYYY-MM-DD)' })

        const rows = await PalletDashboardDetail.findAll({
            where: { day },
            order: [
                ['palletId', 'ASC'],
                ['id', 'ASC']
            ],
            raw: true
        })

        res.json({ day, rows })
    } catch (e) {
        next(e)
    }
})

// ✅ PATCH /api/pallet-dashboard/:id/status
router.patch('/pallet-dashboard/:id/status', requireAuth, async(req, res, next) => {
    try {
        const id = req.params.id
        const statusRaw = String((req.body && req.body.status) ? req.body.status : '').trim().toUpperCase()
        const status = (statusRaw === 'PROCESADO') ? 'PROCESADO' : 'PENDIENTE'

        const row = await PalletDashboardItem.findByPk(id)
        if (!row) return res.status(404).json({ message: 'No encontrado' })

        await row.update({ status })

        // ✅ realtime opcional
        if (res.locals) {
            res.locals.emit = [
                { event: 'pallet-dashboard:update', data: { id: row.id, day: row.day, status: row.status } },
                { event: 'dashboard:update', data: { at: new Date().toISOString(), reason: 'pallet-dashboard-status' } }
            ]
        }

        res.json({ ok: true })
    } catch (e) {
        next(e)
    }
})

// ✅ POST /api/pallet-dashboard/import
// body: { day: 'YYYY-MM-DD', items: [{palletId, status}], details: [{palletId, sku, qty, note}] }
router.post('/pallet-dashboard/import', requireAuth, async(req, res, next) => {
    try {
        const day = String((req.body && req.body.day) ? req.body.day : '').slice(0, 10)
        const items = Array.isArray(req.body && req.body.items) ? req.body.items : []
        const details = Array.isArray(req.body && req.body.details) ? req.body.details : []

        if (!day) return res.status(400).json({ message: 'day requerido (YYYY-MM-DD)' })

        // 1) Limpia solo ese día (para reimportar sin duplicar)
        await PalletDashboardItem.destroy({ where: { day } })
        await PalletDashboardDetail.destroy({ where: { day } })

        // 2) Inserta items (control diario)
        const safeItems = items
            .map(x => ({
                day,
                palletId: String((x && x.palletId) ? x.palletId : '').trim(),
                status: (String((x && x.status) ? x.status : 'PENDIENTE').trim().toUpperCase() === 'PROCESADO') ?
                    'PROCESADO' :
                    'PENDIENTE'
            }))
            .filter(x => x.palletId)

        if (safeItems.length) await PalletDashboardItem.bulkCreate(safeItems)

        // 3) Inserta detalles (piezas / sku / qty)
        const safeDetails = details
            .map(d => ({
                day,
                palletId: String((d && d.palletId) ? d.palletId : '').trim(),
                sku: (d && d.sku != null) ? String(d.sku).trim() : null,
                qty: Number((d && d.qty) ? d.qty : 0) || 0,
                note: (d && d.note != null) ? String(d.note) : null
            }))
            .filter(d => d.palletId && (d.sku || d.qty > 0 || d.note))

        if (safeDetails.length) await PalletDashboardDetail.bulkCreate(safeDetails)

        // ✅ realtime opcional
        if (res.locals) {
            res.locals.emit = [
                { event: 'pallet-dashboard:import', data: { day, inserted: { items: safeItems.length, details: safeDetails.length } } },
                { event: 'dashboard:update', data: { at: new Date().toISOString(), reason: 'pallet-dashboard-import' } }
            ]
        }

        res.json({ ok: true, day, inserted: { items: safeItems.length, details: safeDetails.length } })
    } catch (e) {
        next(e)
    }
})

module.exports = router