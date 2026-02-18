const express = require('express');
const Movement = require('../models/Movement');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function csvEscape(v) {
    // CSV: envolver en comillas y duplicar comillas internas
    const s = String(v ?? '');
    const safe = s.replace(/"/g, '""').replace(/\r?\n/g, ' ');
    return `"${safe}"`;
}

function toCsv(rows) {
    const header = ['date', 'type', 'palletCode', 'userEmail', 'from', 'to', 'note'];
    const lines = [header.join(',')];

    for (const r of rows) {
        const fromStr = r.fromLocation ?
            `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}` :
            '';
        const toStr = r.toLocation ?
            `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}` :
            '';

        lines.push([
            r.createdAt ? new Date(r.createdAt).toISOString() : '',
            r.type || '',
            (r.pallet && r.pallet.code) ? r.pallet.code : '',
            (r.user && r.user.email) ? r.user.email : '',
            fromStr,
            toStr,
            r.note || ''
        ].map(csvEscape).join(','));
    }

    return lines.join('\n');
}

router.get('/', requireAuth, async(req, res, next) => {
    try {
        const exp = req.query.export;

        // soportar ?limit=10 (tu frontend lo manda)
        const limit = Math.min(parseInt(req.query.limit || '2000', 10) || 2000, 5000);

        const rows = await Movement.find({})
            .populate('pallet', 'code')
            .populate('user', 'email')
            .populate('fromLocation', 'area level position')
            .populate('toLocation', 'area level position')
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean();

        if (exp === 'csv') {
            const csv = toCsv(rows);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', 'attachment; filename="movimientos.csv"');
            return res.send(csv);
        }

        return res.json(rows);
    } catch (e) {
        next(e);
    }
});

module.exports = router;