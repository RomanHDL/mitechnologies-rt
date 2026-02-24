const express = require('express');
const { OutboundOrder, Pallet, Location, Movement, User } = require('../models/sequelize');

// 👇 Aquí está la clave: NO uses requireOutboundAuthorization si no existe.
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * Autorización para crear/fulfill/cambiar status de salidas.
 * Ajusta roles si quieres.
 */
const requireOutboundAuthorization = requireRole('ADMIN', 'SUPERVISOR');

function emitRT(req, payload) {
    const io = req.app.get('io');
    if (!io) return;
    io.emit('movement:new', payload);
    io.emit('dashboard:update', { at: new Date().toISOString() });
}

function makeOrderNumber() {
    const d = new Date();
    const ymd = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(Math.random() * 9000) + 1000;
    return `SO-${ymd}-${rand}`;
}

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
        });
        res.json(rows.map(r => r.toJSON()));
    } catch (e) { next(e); }
});

router.post('/', requireAuth, requireOutboundAuthorization, async(req, res, next) => {
    try {
        const { destinationType, destinationRef, lines, notes } = req.body || {};
        if (!Array.isArray(lines) || lines.length === 0) {
            return res.status(400).json({ message: 'Líneas requeridas' });
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
        });

        res.status(201).json(row.toJSON());
    } catch (e) { next(e); }
});

router.post('/:id/fulfill', requireAuth, requireOutboundAuthorization, async(req, res, next) => {
    try {
        const { palletIds, note } = req.body || {};
        if (!Array.isArray(palletIds) || palletIds.length === 0) {
            return res.status(400).json({ message: 'palletIds requerido' });
        }

        const order = await OutboundOrder.findByPk(req.params.id);
        if (!order) return res.status(404).json({ message: 'Orden no encontrada' });
        if (['CANCELLED', 'SHIPPED'].includes(order.status)) {
            return res.status(400).json({ message: 'Orden no editable' });
        }

        const pallets = await Pallet.findAll({ where: { id: palletIds } });

        // ✅ si mandaron IDs que no existen
        if (pallets.length !== palletIds.length) {
            const found = new Set(pallets.map(p => p.id));
            const missing = palletIds.filter(id => !found.has(id));
            return res.status(400).json({ message: `Tarimas no encontradas: ${missing.join(', ')}` });
        }

        // ✅ validar disponibilidad
        for (const p of pallets) {
            if (p.status !== 'IN_STOCK') {
                return res.status(400).json({ message: `Tarima ${p.code || p.id} no está disponible` });
            }
        }

        // ✅ traer locations en batch
        const locIds = [...new Set(pallets.map(p => p.locationId).filter(Boolean))];
        const locs = await Location.findAll({ where: { id: locIds }, raw: true });
        const locMap = new Map(locs.map(l => [l.id, l]));

        // ✅ marcar OUT + crear movement por cada pallet
        for (const p of pallets) {
            const fromLoc = p.locationId ? locMap.get(p.locationId) : null;

            p.status = 'OUT';
            await p.save();

            const mv = await Movement.create({
                type: 'OUT',
                palletId: p.id,
                userId: req.user.id,
                fromLocationId: fromLoc?.id || null,
                toLocationId: null,
                itemsSnapshot: p.items,
                note: `Salida por orden ${order.orderNumber}. ${note || ''}`.trim()
            });

            emitRT(req, mv.toJSON());
        }

        order.status = 'PICKED';
        order.pallets = palletIds; // si tu modelo tiene este campo (JSON)
        order.fulfilledAt = new Date();
        await order.save();

        res.json({ ok: true });
    } catch (e) { next(e); }
});

router.patch('/:id/status', requireAuth, requireOutboundAuthorization, async(req, res, next) => {
    try {
        const { status } = req.body || {};
        if (!['DRAFT', 'PENDING_PICK', 'PICKED', 'SHIPPED', 'CANCELLED'].includes(status)) {
            return res.status(400).json({ message: 'Status inválido' });
        }

        const [updated] = await OutboundOrder.update({ status }, { where: { id: req.params.id } });
        if (!updated) return res.status(404).json({ message: 'No encontrado' });

        const row = await OutboundOrder.findByPk(req.params.id, { raw: true });
        res.json(row);
    } catch (e) { next(e); }
});

module.exports = router;