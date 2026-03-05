const express = require('express')
const { OutboundOrder, Pallet, Location, Movement, User } = require('../models/sequelize')
const { requireAuth, requireRole } = require('../middleware/auth')

const router = express.Router()

/**
 * Autorización para crear/fulfill/cambiar status de salidas.
 * (NO cambia tu seguridad: solo lo mantiene)
 */
const requireOutboundAuthorization = requireRole('ADMIN', 'SUPERVISOR')

function emitRT(req, payload) {
    const io = req.app.get('io')
    if (!io) return
    io.emit('dashboard:update', { at: new Date().toISOString(), ...payload })
    io.emit('orders:update', { at: new Date().toISOString(), ...payload })
}

/**
 * UI status -> DB status
 */
function uiToDbStatus(s) {
    const x = String(s || '').toUpperCase().trim()
    if (x === 'PENDIENTE') return 'PENDING_PICK'
    if (x === 'COMPLETADA') return 'SHIPPED'
    if (x === 'CANCELADA') return 'CANCELLED'
    return x
}

/**
 * DB status -> UI status
 */
function dbToUiStatus(s) {
    const x = String(s || '').toUpperCase().trim()
    if (x === 'PENDING_PICK' || x === 'DRAFT') return 'PENDIENTE'
    if (x === 'PICKED') return 'PENDIENTE' // sigue pendiente hasta enviar
    if (x === 'SHIPPED') return 'COMPLETADA'
    if (x === 'CANCELLED') return 'CANCELADA'
    return x
}

function shapeOrder(o) {
    const j = o?.toJSON ? o.toJSON() : o
    return {
        ...j,
        status: dbToUiStatus(j.status),
    }
}

function makeOrderNumber() {
    const d = new Date()
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`
    const rand = Math.floor(Math.random() * 9000) + 1000
    return `SO-${ymd}-${rand}`
}

/**
 * GET /api/orders
 */
router.get('/', requireAuth, async(req, res, next) => {
    try {
        const rows = await OutboundOrder.findAll({
            include: [
                { model: User, as: 'createdBy', attributes: ['email'] },
                { model: User, as: 'authorizedBy', attributes: ['email'] }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        })

        res.json(rows.map(shapeOrder))
    } catch (e) { next(e) }
})

/**
 * GET /api/orders/:id
 */
router.get('/:id', requireAuth, async(req, res, next) => {
    try {
        const row = await OutboundOrder.findByPk(req.params.id, {
            include: [
                { model: User, as: 'createdBy', attributes: ['email'] },
                { model: User, as: 'authorizedBy', attributes: ['email'] }
            ]
        })
        if (!row) return res.status(404).json({ message: 'Orden no encontrada' })
        res.json(shapeOrder(row))
    } catch (e) { next(e) }
})

/**
 * POST /api/orders
 */
router.post('/', requireAuth, requireOutboundAuthorization, async(req, res, next) => {
    try {
        const { destinationType, destinationRef, lines, notes } = req.body || {}

        if (!Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ message: 'Líneas requeridas' })
        }

        const row = await OutboundOrder.create({
            orderNumber: makeOrderNumber(),
            destinationType: destinationType || 'OTHER',
            destinationRef: destinationRef || '',
            status: 'PENDING_PICK',
            lines,
            notes: notes || '',
            createdById: req.user.id,
            authorizedById: req.user.id
        })

        emitRT(req, { reason: 'order:created', orderId: row.id })
        res.status(201).json(shapeOrder(row))
    } catch (e) { next(e) }
})

/**
 * POST /api/orders/:id/fulfill
 * Body: { palletIds: [], note: "" }
 */
router.post('/:id/fulfill', requireAuth, requireOutboundAuthorization, async(req, res, next) => {
    try {
        const { palletIds, note } = req.body || {}
        if (!Array.isArray(palletIds) || palletIds.length === 0) {
            return res.status(400).json({ message: 'palletIds requerido' })
        }

        const order = await OutboundOrder.findByPk(req.params.id)
        if (!order) return res.status(404).json({ message: 'Orden no encontrada' })

        // no editable si cancelada/enviada
        if (['CANCELLED', 'SHIPPED'].includes(String(order.status))) {
            return res.status(400).json({ message: 'Orden no editable' })
        }

        const pallets = await Pallet.findAll({ where: { id: palletIds } })

        if (pallets.length !== palletIds.length) {
            const found = new Set(pallets.map(p => p.id))
            const missing = palletIds.filter(id => !found.has(id))
            return res.status(400).json({ message: `Tarimas no encontradas: ${missing.join(', ')}` })
        }

        // validar disponibilidad
        for (const p of pallets) {
            if (p.status !== 'IN_STOCK') {
                return res.status(400).json({ message: `Tarima ${p.code || p.id} no está disponible` })
            }
        }

        // locations batch
        const locIds = [...new Set(pallets.map(p => p.locationId).filter(Boolean))]
        const locs = await Location.findAll({ where: { id: locIds }, raw: true })
        const locMap = new Map(locs.map(l => [l.id, l]))

        // OUT + movement por pallet
        for (const p of pallets) {
            const fromLoc = p.locationId ? locMap.get(p.locationId) : null

            p.status = 'OUT'
            await p.save()

            const mv = await Movement.create({
                type: 'OUT',
                palletId: p.id,
                userId: req.user.id,
                fromLocationId: fromLoc?.id || null,
                toLocationId: null,
                itemsSnapshot: p.items,
                note: `Salida por orden ${order.orderNumber}. ${note || ''}`.trim()
            })

            emitRT(req, { reason: 'order:fulfill:movement', movementId: mv.id, palletId: p.id, orderId: order.id })
        }

        order.status = 'PICKED'
        order.pallets = palletIds
        order.fulfilledAt = new Date()
        await order.save()

        emitRT(req, { reason: 'order:fulfilled', orderId: order.id })
        res.json({ ok: true })
    } catch (e) { next(e) }
})

/**
 * PATCH /api/orders/:id/status
 * Soporta UI: PENDIENTE/COMPLETADA/CANCELADA
 * y DB: DRAFT/PENDING_PICK/PICKED/SHIPPED/CANCELLED
 */
router.patch('/:id/status', requireAuth, requireOutboundAuthorization, async(req, res, next) => {
    try {
        const raw = req.body?.status
        const status = uiToDbStatus(raw)

        const allowed = ['DRAFT', 'PENDING_PICK', 'PICKED', 'SHIPPED', 'CANCELLED']
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: 'Status inválido' })
        }

        const [updated] = await OutboundOrder.update({ status }, { where: { id: req.params.id } })
        if (!updated) return res.status(404).json({ message: 'No encontrado' })

        const row = await OutboundOrder.findByPk(req.params.id, {
            include: [
                { model: User, as: 'createdBy', attributes: ['email'] },
                { model: User, as: 'authorizedBy', attributes: ['email'] }
            ]
        })

        emitRT(req, { reason: 'order:status', orderId: req.params.id, status })
        res.json(shapeOrder(row))
    } catch (e) { next(e) }
})

/**
 * DELETE /api/orders/:id
 */
router.delete('/:id', requireAuth, requireOutboundAuthorization, async(req, res, next) => {
    try {
        const deleted = await OutboundOrder.destroy({ where: { id: req.params.id } })
        if (!deleted) return res.status(404).json({ message: 'No encontrado' })
        emitRT(req, { reason: 'order:deleted', orderId: req.params.id })
        res.json({ ok: true })
    } catch (e) { next(e) }
})

module.exports = router