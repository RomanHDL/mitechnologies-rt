const express = require('express');
const { Movement, Pallet, User, Location } = require('../models/sequelize');
const { requireAuth } = require('../middleware/auth');
const { Op } = require('sequelize');

const router = express.Router();

function toCsv(rows) {
    const header = ['date', 'type', 'palletCode', 'userEmail', 'from', 'to', 'note'];
    const esc = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
    const lines = [header.join(',')];
    for (const r of rows) {
        lines.push([
            r.createdAt?.toISOString?.() || '',
            r.type,
            r.pallet?.code || '',
            r.user?.email || '',
            r.fromLocation ? (r.fromLocation.code || `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}`) : '',
            r.toLocation ? (r.toLocation.code || `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}`) : '',
            (r.note || '').replaceAll('\n', ' ')
        ].map(esc).join(','));
    }
    return lines.join('\n');
}

// helper: sku dentro de itemsSnapshot
function movementHasSku(mov, skuUpper) {
    const snap = mov?.itemsSnapshot || [];
    for (const it of snap) {
        if (String(it?.sku || '').toUpperCase() === skuUpper) return true;
    }
    return false;
}

router.get('/', requireAuth, async(req, res, next) => {
    try {
        const { export: exp, palletId, palletCode, sku } = req.query;
        const limit = Math.min(parseInt(req.query.limit || '2000', 10), 5000);

        const where = {};
        if (palletId) where.palletId = String(palletId);

        // filtro por palletCode lo hacemos en include (sin romper nada)
        const palletInclude = { model: Pallet, as: 'pallet', attributes: ['id', 'code'] };
        if (palletCode) {
            palletInclude.where = {
                code: {
                    [Op.like]: `%${String(palletCode)}%`
                }
            };
            palletInclude.required = true;
        }

        const rows = await Movement.findAll({
            where,
            include: [
                palletInclude,
                { model: User, as: 'user', attributes: ['email'] },

                // ✅ agregamos code (para "ir a ubicaciones / racks")
                { model: Location, as: 'fromLocation', attributes: ['id', 'code', 'area', 'level', 'position'] },
                { model: Location, as: 'toLocation', attributes: ['id', 'code', 'area', 'level', 'position'] }
            ],
            order: [
                ['createdAt', 'DESC']
            ],
            limit
        });

        let rowsJson = rows.map(r => r.toJSON());

        // ✅ filtro por SKU en backend (modo seguro) usando itemsSnapshot
        if (sku) {
            const skuUpper = String(sku).trim().toUpperCase();
            rowsJson = rowsJson.filter(m => movementHasSku(m, skuUpper));
        }

        if (exp === 'csv') {
            const csv = toCsv(rowsJson);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="movimientos.csv"');
            return res.send(csv);
        }

        res.json(rowsJson);
    } catch (e) { next(e); }
});

module.exports = router;