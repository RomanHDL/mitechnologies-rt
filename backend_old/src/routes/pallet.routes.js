const express = require('express');
const Pallet = require('../models/Pallet');
const Location = require('../models/Location');
const Movement = require('../models/Movement');

const { requireAuth, requireRole, requireOutboundAuthorization } = require('../middleware/auth');
const { validate } = require('../validation/validate');
const { createPalletSchema, transferSchema, outSchema, adjustSchema } = require('../validation/schemas');
const { makePalletCode } = require('../utils/code');
const { qrDataUrl } = require('../utils/qr');

const router = express.Router();

// ✅ helper: emitir tiempo real si existe Socket.IO
function emitRT(req, payload = {}) {
    try {
        const io = req.app.get('io'); // Express siempre tiene req.app
        if (!io) return;
        io.emit('movement:new', payload);
        io.emit('dashboard:update', payload);
    } catch (e) {
        // No romper si socket no existe
    }
}

/**
 * ✅ TOP SKUs (por qty total en stock)
 * GET /api/pallets/top?limit=5
 */
router.get('/top', requireAuth, async(req, res, next) => {
    try {
        const limit = Math.min(parseInt(req.query.limit || '10', 10), 50);

        const pallets = await Pallet.find({ status: 'IN_STOCK' }).lean();

        const skuMap = new Map();
        for (const p of pallets) {
            for (const it of(p.items || [])) {
                const sku = String(it.sku || '').trim();
                if (!sku) continue;
                const qty = Number(it.qty) || 0;
                skuMap.set(sku, (skuMap.get(sku) || 0) + qty);
            }
        }

        const topSkus = [...skuMap.entries()]
            .map(([sku, qty]) => ({ sku, qty }))
            .sort((a, b) => b.qty - a.qty)
            .slice(0, limit);

        res.json(topSkus);
    } catch (e) {
        next(e);
    }
});

// Crear tarima (ENTRADA)
router.post(
    '/',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR', 'OPERADOR'),
    validate(createPalletSchema),
    async(req, res, next) => {
        try {
            const { lot, supplier, receivedAt, locationId, items } = req.body;

            const loc = await Location.findById(locationId);
            if (!loc) return res.status(404).json({ message: 'Ubicación no encontrada' });
            if (loc.blocked) return res.status(400).json({ message: 'Ubicación bloqueada' });

            // 1 tarima por ubicación (si hay IN_STOCK ya ocupada)
            const existing = await Pallet.findOne({ location: loc._id, status: 'IN_STOCK' });
            if (existing) return res.status(400).json({ message: 'Ubicación ocupada' });

            const code = makePalletCode();

            const pallet = await Pallet.create({
                code,
                lot: lot || '',
                supplier: supplier || '',
                receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
                items,
                location: loc._id
            });

            await Movement.create({
                type: 'IN',
                pallet: pallet._id,
                user: req.user._id,
                fromLocation: null,
                toLocation: loc._id,
                itemsSnapshot: pallet.items,
                note: 'Entrada'
            });

            emitRT(req, { type: 'IN', palletId: String(pallet._id) });

            const qr = await qrDataUrl(code);

            res.status(201).json({ pallet, qr });
        } catch (e) {
            next(e);
        }
    }
);

router.get('/', requireAuth, async(req, res, next) => {
    try {
        const { q } = req.query;
        const filter = {};
        if (q) {
            filter.$or = [
                { code: new RegExp(String(q), 'i') },
                { 'items.sku': new RegExp(String(q), 'i') },
                { lot: new RegExp(String(q), 'i') }
            ];
        }

        const pallets = await Pallet.find(filter)
            .populate('location')
            .sort({ createdAt: -1 })
            .lean();

        res.json(pallets);
    } catch (e) {
        next(e);
    }
});

// ✅ IMPORTANTE: esta ruta debe ir ANTES que "/:id"
router.get('/by-qr/:code', requireAuth, async(req, res, next) => {
    try {
        const p = await Pallet.findOne({ code: req.params.code }).populate('location').lean();
        if (!p) return res.status(404).json({ message: 'No existe tarima para ese código' });
        res.json(p);
    } catch (e) {
        next(e);
    }
});

router.get('/:id', requireAuth, async(req, res, next) => {
    try {
        const p = await Pallet.findById(req.params.id).populate('location').lean();
        if (!p) return res.status(404).json({ message: 'Tarima no encontrada' });
        res.json(p);
    } catch (e) {
        next(e);
    }
});

// Transferencia
router.patch(
    '/:id/transfer',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR', 'OPERADOR'),
    validate(transferSchema),
    async(req, res, next) => {
        try {
            const { toLocationId, note } = req.body;

            const pallet = await Pallet.findById(req.params.id);
            if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

            const fromLoc = await Location.findById(pallet.location);
            const toLoc = await Location.findById(toLocationId);
            if (!toLoc) return res.status(404).json({ message: 'Ubicación destino no encontrada' });
            if (toLoc.blocked) return res.status(400).json({ message: 'Ubicación destino bloqueada' });

            const occupied = await Pallet.findOne({ location: toLoc._id, status: 'IN_STOCK' });
            if (occupied) return res.status(400).json({ message: 'Ubicación destino ocupada' });

            pallet.location = toLoc._id;
            await pallet.save();

            await Movement.create({
                type: 'TRANSFER',
                pallet: pallet._id,
                user: req.user._id,
                fromLocation: fromLoc ? fromLoc._id : null,
                toLocation: toLoc._id,
                itemsSnapshot: pallet.items,
                note: note || 'Transferencia'
            });

            emitRT(req, { type: 'TRANSFER', palletId: String(pallet._id) });

            const populated = await Pallet.findById(pallet._id).populate('location').lean();
            res.json(populated);
        } catch (e) {
            next(e);
        }
    }
);

// Salida (requiere autorización)
router.post(
    '/:id/out',
    requireAuth,
    requireOutboundAuthorization,
    validate(outSchema),
    async(req, res, next) => {
        try {
            const pallet = await Pallet.findById(req.params.id);
            if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

            const fromLoc = await Location.findById(pallet.location);

            pallet.status = 'OUT';
            await pallet.save();

            await Movement.create({
                type: 'OUT',
                pallet: pallet._id,
                user: req.user._id,
                fromLocation: fromLoc ? fromLoc._id : null,
                toLocation: null,
                itemsSnapshot: pallet.items,
                note: `Salida: ${req.body.destinationType}${req.body.destinationRef ? ' ' + req.body.destinationRef : ''}. ${req.body.note || ''}`.trim()
            });

            emitRT(req, { type: 'OUT', palletId: String(pallet._id) });

            res.json({ ok: true });
        } catch (e) {
            next(e);
        }
    }
);

// Ajuste (inventario físico)
router.post(
    '/:id/adjust',
    requireAuth,
    requireRole('ADMIN', 'SUPERVISOR'),
    validate(adjustSchema),
    async(req, res, next) => {
        try {
            const { items, note } = req.body;

            const pallet = await Pallet.findById(req.params.id);
            if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

            pallet.items = items;
            pallet.status = 'ADJUSTED';
            await pallet.save();

            await Movement.create({
                type: 'ADJUST',
                pallet: pallet._id,
                user: req.user._id,
                fromLocation: pallet.location,
                toLocation: pallet.location,
                itemsSnapshot: pallet.items,
                note: note || 'Ajuste'
            });

            emitRT(req, { type: 'ADJUST', palletId: String(pallet._id) });

            const populated = await Pallet.findById(pallet._id).populate('location').lean();
            res.json(populated);
        } catch (e) {
            next(e);
        }
    }
);

// Cambiar status de tarima (calidad): ADMIN o SUPERVISOR
router.patch('/:id/status', requireAuth, requireRole('ADMIN', 'SUPERVISOR'), async(req, res, next) => {
    try {
        const { status, note } = req.body || {};
        const allowed = ['IN_STOCK', 'QUARANTINE', 'DAMAGED', 'RETURNED'];
        if (!allowed.includes(status)) return res.status(400).json({ message: 'Status inválido' });

        const pallet = await Pallet.findById(req.params.id);
        if (!pallet) return res.status(404).json({ message: 'Tarima no encontrada' });

        const fromLoc = await Location.findById(pallet.location);

        pallet.status = status;
        await pallet.save();

        await Movement.create({
            type: 'ADJUST',
            pallet: pallet._id,
            user: req.user._id,
            fromLocation: fromLoc ? fromLoc._id : null,
            toLocation: fromLoc ? fromLoc._id : null,
            itemsSnapshot: pallet.items,
            note: `Cambio de status a ${status}. ${note || ''}`.trim()
        });

        emitRT(req, { type: 'STATUS', status, palletId: String(pallet._id) });

        const populated = await Pallet.findById(pallet._id).populate('location').lean();
        res.json(populated);
    } catch (e) {
        next(e);
    }
});

module.exports = router;