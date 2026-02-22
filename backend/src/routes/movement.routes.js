const express = require('express');
const { Movement, Pallet, User, Location } = require('../models/sequelize');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function toCsv(rows) {
  const header = ['date','type','palletCode','userEmail','from','to','note'];
  const esc = (v) => `"${String(v ?? '').replaceAll('"','""')}"`;
  const lines = [header.join(',')];
  for (const r of rows) {
    lines.push([
      r.createdAt?.toISOString?.() || '',
      r.type,
      r.pallet?.code || '',
      r.user?.email || '',
      r.fromLocation ? `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}` : '',
      r.toLocation ? `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}` : '',
      (r.note || '').replaceAll('\n',' ')
    ].map(esc).join(','));
  }
  return lines.join('\n');
}

router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { export: exp } = req.query;

    const rows = await Movement.findAll({
      include: [
        { model: Pallet, as: 'pallet', attributes: ['code'] },
        { model: User, as: 'user', attributes: ['email'] },
        { model: Location, as: 'fromLocation', attributes: ['area', 'level', 'position'] },
        { model: Location, as: 'toLocation', attributes: ['area', 'level', 'position'] }
      ],
      order: [['createdAt', 'DESC']],
      limit: 2000
    });

    const rowsJson = rows.map(r => r.toJSON());

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
