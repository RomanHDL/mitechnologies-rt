const express = require('express');
const Movement = require('../models/Movement');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toCsv(rows) {
    const header = ['date', 'type', 'palletCode', 'userEmail', 'from', 'to', 'note'];
    const esc = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
    const lines = [header.join(',')];
    for (const r of rows) {
        lines.push([
            r.createdAt ? .toISOString ? .() || '',
            r.type,
            r.pallet ? .code || '',
            r.user ? .email || '',
            r.fromLocation ? `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}` : '',
            r.toLocation ? `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}` : '',
            (r.note || '').replaceAll('\n', ' ')
        ].map(esc).join(','));
    }
    return lines.join('\n');
}

router.get('/', requireAuth, async(req, res, next) => {
    try {
        const { export: exp } = req.query;

        const rows = await Movement.find({})
            .populate('pallet', 'code')
            .populate('user', 'email')
            .populate('fromLocation', 'area level position')
            .populate('toLocation', 'area level position')
            .sort({ createdAt: -1 })
            .limit(2000)
            .lean();

        if (exp === 'csv') {
            const csv = toCsv(rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="movimientos.csv"');
            return res.send(csv);
        }

        res.json(rows);
    } catch (e) { next(e); }
});

module.exports = router;
module.exports = router;