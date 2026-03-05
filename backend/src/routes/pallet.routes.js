const express = require('express');
const { Pallet, Location, Movement } = require('../models/sequelize');
const { Op } = require('sequelize');

const { requireAuth, requireRole, requireOutboundAuthorization } = require('../middleware/auth');
const { validate } = require('../validation/validate');
const { createPalletSchema, transferSchema, outSchema, adjustSchema } = require('../validation/schemas');
const { makePalletCode } = require('../utils/code');
const { qrDataUrl } = require('../utils/qr');

const router = express.Router();

function emitRT(req, payload = {}) {
    const io = req.app?.get?.('io');
    if (!io) return;
    io.emit('movement:new', payload);
    io.emit('dashboard:update', payload);
}

router.get('/top', requireAuth, async(req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);

        const pallets = await Pallet.findAll({ where: { status: 'IN_STOCK' }, raw: true });

        const skuMap = new Map();
        for (const p of pallets) {
            for (const it of(p.items || [])) {
                const qty = Number(it.qty) || 0;
                skuMap.set(it.sku, (skuMap.get(it.sku) || 0) + qty);
            }
        }

        const topSkus = [...skuMap.entries()]
            .map(([sku, qty]) => ({ sku, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, limit);

        res.json(topSkus);
    } catch (e) { next(e); }
});

router.post(
    '/',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR', 'OPERADOR'),
    validate(createPalletSchema),
    async(req, res, next) => {
        try {
            const { lot, supplier, receivedAt, locationId, items } = req.body;

            const loc = await Location.findByPk(locationId);
            if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
            if (loc.blocked) return res.status(400).json({ message: 'Ubicación bloqueada' });

            const existing = await Pallet.findOne({ where: { locationId: loc.id, status: 'IN_STOCK' } });
            if (existing) return res.status(400).json({ message: 'Ubicación ocupada' });

            const code = makePalletCode();

            const pallet = await Pallet.create({
                code,
                lot: lot || '',
                supplier: supplier || '',
                receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
                items,
                locationId: loc.id
            });

            await Movement.create({
                type: 'IN',
                palletId: pallet.id,
                userId: req.user.id,
                fromLocationId: null,
                toLocationId: loc.id,
                itemsSnapshot: pallet.items,
                note: 'Entrada'
            });

            emitRT(req, { type: 'IN', palletId: String(pallet.id) });

            const qr = await qrDataUrl(code);

            res.status(201).json({ pallet: pallet.toJSON(), qr });
        } catch (e) { next(e); }
    }
);
// ✅ GET /api/pallets/by-code?code=XXXX
router.get('/by-code', requireAuth, async(req, res, next) => {
    try {
        const code = String(req.query?.code || '').trim()
        if (!code) return res.status(400).json({ message: 'code requerido' })

        const p = await Pallet.findOne({
            where: { code },
            include: [{ model: Location, as: 'location' }]
        })

        if (!p) return res.status(404).json({ message: 'No existe tarima para ese código' })
        res.json(p.toJSON())
    } catch (e) { next(e) }
})
router.get('/', requireAuth, async(req, res, next) => {
    try {
        const { q } = req.query;
        const where = {};
        if (q) {
            where[Op.or] = [
                { code: {
                        [Op.like]: `%${q}%` } },
                { lot: {
                        [Op.like]: `%${q}%` } }
            ];
        }
        const pallets = await Pallet.findAll({
            where,
            include: [{ model: Location, as: 'location' }],
            order: [
                ['createdAt', 'DESC']
            ]
        });

        res.json(pallets.map(p => p.toJSON()));
    } catch (e) { next(e); }
});

router.get('/by-qr/:code', requireAuth, async(req, res, next) => {
    try {
        const p = await Pallet.findOne({
            where: { code: req.params.code },
            include: [{ model: Location, as: 'location' }]
        });
        if (!p) return res.status(404).json({ message: 'No existe tarima para ese código' });
        res.json(p.toJSON());
    } catch (e) { next(e); }
});

router.get('/:id', requireAuth, async(req, res, next) => {
    try {
        const p = await Pallet.findByPk(req.params.id, {
            include: [{ model: Location, as: 'location' }]
        });
        if (!p) return res.status(404).json({ message: 'Tarima no encontrada' });
        res.json(p.toJSON());
    } catch (e) { next(e); }
});

router.patch(
    '/:id/transfer',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR', 'OPERADOR'),
    validate(transferSchema),
    async(req, res, next) => {
        try {
            const { toLocationId, note } = req.body;

            const pallet = await Pallet.findByPk(req.params.id);
            if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

            const fromLoc = await Location.findByPk(pallet.locationId);
            const toLoc = await Location.findByPk(toLocationId);
            if (!toLoc) return res.status(404).json({ message: 'Ubicación destino no encontrada' });
            if (toLoc.blocked) return res.status(400).json({ message: 'Ubicación destino bloqueada' });

            const occupied = await Pallet.findOne({ where: { locationId: toLoc.id, status: 'IN_STOCK' } });
            if (occupied) return res.status(400).json({ message: 'Ubicación destino ocupada' });

            pallet.locationId = toLoc.id;
            await pallet.save();

            await Movement.create({
                type: 'TRANSFER',
                palletId: pallet.id,
                userId: req.user.id,
                fromLocationId: fromLoc?.id || null,
                toLocationId: toLoc.id,
                itemsSnapshot: pallet.items,
                note: note || 'Transferencia'
            });

            emitRT(req, { type: 'TRANSFER', palletId: String(pallet.id) });

            const populated = await Pallet.findByPk(pallet.id, {
                include: [{ model: Location, as: 'location' }]
            });
            res.json(populated.toJSON());
        } catch (e) { next(e); }
    }
);

router.post(
    '/:id/out',
    requireAuth,
    requireOutboundAuthorization,
    validate(outSchema),
    async(req, res, next) => {
        try {
            const pallet = await Pallet.findByPk(req.params.id);
            if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

            const fromLoc = await Location.findByPk(pallet.locationId);

            pallet.status = 'OUT';
            await pallet.save();

            await Movement.create({
                type: 'OUT',
                palletId: pallet.id,
                userId: req.user.id,
                fromLocationId: fromLoc?.id || null,
                toLocationId: null,
                itemsSnapshot: pallet.items,
                note: `Salida: ${req.body.destinationType}${req.body.destinationRef ? ' ' + req.body.destinationRef : ''}. ${req.body.note || ''}`.trim()
            });

            emitRT(req, { type: 'OUT', palletId: String(pallet.id) });

            res.json({ ok: true });
        } catch (e) { next(e); }
    }
);

router.post(
    '/:id/adjust',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR'),
    validate(adjustSchema),
    async(req, res, next) => {
        try {
            const { items, note } = req.body;

            const pallet = await Pallet.findByPk(req.params.id);
            if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

            pallet.items = items;
            pallet.status = 'ADJUSTED';
            await pallet.save();

            await Movement.create({
                type: 'ADJUST',
                palletId: pallet.id,
                userId: req.user.id,
                fromLocationId: pallet.locationId,
                toLocationId: pallet.locationId,
                itemsSnapshot: pallet.items,
                note: note || 'Ajuste'
            });

            emitRT(req, { type: 'ADJUST', palletId: String(pallet.id) });

            const populated = await Pallet.findByPk(pallet.id, {
                include: [{ model: Location, as: 'location' }]
            });
            res.json(populated.toJSON());
        } catch (e) { next(e); }
    }
);

router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { status, note } = req.body || {};
        const allowed = ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED'];
        if (!allowed.includes(status)) return res.status(400).json({ message: 'Status inválido' });

        const pallet = await Pallet.findByPk(req.params.id);
        if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

        const fromLoc = await Location.findByPk(pallet.locationId);

        pallet.status = status;
        await pallet.save();

        await Movement.create({
            type: 'ADJUST',
            palletId: pallet.id,
            userId: req.user.id,
            fromLocationId: fromLoc?.id || null,
            toLocationId: fromLoc?.id || null,
            itemsSnapshot: pallet.items,
            note: `Cambio de status a ${status}. ${note || ''}`.trim()
        });

        emitRT(req, { type: 'STATUS', status, palletId: String(pallet.id) });

        const populated = await Pallet.findByPk(pallet.id, {
            include: [{ model: Location, as: 'location' }]
        });
        res.json(populated.toJSON());
    } catch (e) { next(e); }
});

module.exports = router;