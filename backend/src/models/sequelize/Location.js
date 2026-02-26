const express = require('express');
const { Location, Pallet, Movement, User } = require('../models/sequelize');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

/**
 * =====================================================
 * ✅ GET /api/locations/racks/:rackCode
 * VERSION PRO — NO ROMPE NADA EXISTENTE
 * =====================================================
 */
router.get('/racks/:rackCode', requireAuth, async(req, res, next) => {
    try {

        const rackCode = String(req.params.rackCode || '')
            .trim()
            .toUpperCase();

        if (!/^F\d{3}$/.test(rackCode)) {
            return res.status(400).json({ message: 'Rack inválido' });
        }

        // ===============================
        // 1️⃣ Locations
        // ===============================
        const locations = await Location.findAll({
            raw: true
        });

        // Filtrar rack
        const rackLocs = locations.filter(l =>
            `${l.area}-${rackCode}`.includes(rackCode)
        );

        const locIds = rackLocs.map(l => l.id);

        // ===============================
        // 2️⃣ Pallets en esas locations
        // ===============================
        const pallets = await Pallet.findAll({
            where: { locationId: locIds },
            raw: true
        });

        const palletMap = new Map();
        for (const p of pallets) {
            palletMap.set(p.locationId, p);
        }

        // ===============================
        // 3️⃣ Últimos movimientos
        // ===============================
        const palletIds = pallets.map(p => p.id);

        const movements = await Movement.findAll({
            where: { palletId: palletIds },
            include: [
                { model: User, as: 'user', attributes: ['email'] }
            ],
            order: [
                ['createdAt', 'DESC']
            ]
        });

        const lastMoveMap = new Map();

        for (const m of movements) {
            const pid = m.palletId;
            if (!lastMoveMap.has(pid)) {
                lastMoveMap.set(pid, m);
            }
        }

        // ===============================
        // 4️⃣ Shape final
        // ===============================
        const shaped = rackLocs.map(loc => {

            const pallet = palletMap.get(loc.id);

            let state = 'VACIO';
            if (loc.blocked) state = 'BLOQUEADO';
            else if (pallet) state = 'OCUPADO';

            let lastMoveAt = null;
            let lastMoveBy = null;

            if (pallet) {
                const mv = lastMoveMap.get(pallet.id);
                if (mv) {
                    lastMoveAt = mv.createdAt;
                    lastMoveBy = mv.user?.email || null;
                }
            }

            const firstItem = pallet?.items?.[0];

            return {
                ...loc,

                code: `${loc.level}${String(loc.position).padStart(2,'0')}-${rackCode}-${String(loc.position).padStart(3,'0')}`,

                state,

                pallet: pallet ? {
                    id: pallet.id,
                    code: pallet.code,
                    lot: pallet.lot,
                    sku: firstItem?.sku || null,
                    qty: firstItem?.qty || 0,
                    status: pallet.status
                } : null,

                lastMoveAt,
                lastMoveBy
            };
        });

        res.json({
            rackCode,
            locations: shaped
        });

    } catch (e) {
        next(e);
    }
});

/**
 * =====================================================
 * EXISTENTES (NO TOCADOS)
 * =====================================================
 */

router.get('/', requireAuth, async(req, res, next) => {
    try {
        const locations = await Location.findAll({ raw: true });
        res.json(locations);
    } catch (e) { next(e); }
});

router.patch('/:id', requireAuth, requireRole('ADMIN', 'SUPERVISOR'),
    async(req, res, next) => {
        try {
            const [updated] = await Location.update(req.body, {
                where: { id: req.params.id }
            });

            if (!updated)
                return res.status(404).json({ message: 'Ubicación no encontrada' });

            const loc = await Location.findByPk(req.params.id, { raw: true });
            res.json(loc);

        } catch (e) { next(e) }
    });

module.exports = router;