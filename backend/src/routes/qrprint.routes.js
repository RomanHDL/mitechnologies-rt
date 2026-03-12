// Módulo 4: Impresión de etiquetas QR para pallets
const router = require('express').Router();
const { requireAuth } = require('../middleware/auth');
const { Pallet, Location } = require('../models/sequelize');
const { qrDataUrl } = require('../utils/qr');

// GET /api/qr/pallet/:id — generate QR label data for a pallet
router.get('/pallet/:id', requireAuth, async (req, res, next) => {
  try {
    const pallet = await Pallet.findByPk(req.params.id, {
      include: [{ model: Location, as: 'location' }],
    });
    if (!pallet) return res.status(404).json({ message: 'Pallet not found' });

    const qr = await qrDataUrl(pallet.code);
    const items = Array.isArray(pallet.items) ? pallet.items : [];
    const skuList = items.map(i => i.sku).join(', ');
    const totalQty = items.reduce((sum, i) => sum + (i.qty || 0), 0);
    const locCode = pallet.location ? (pallet.location.code || pallet.location.area + '-' + pallet.location.rack + '-' + pallet.location.level + pallet.location.position) : 'N/A';

    res.json({
      code: pallet.code,
      qrDataUrl: qr,
      lot: pallet.lot || '',
      supplier: pallet.supplier || '',
      location: locCode,
      skus: skuList,
      totalQty,
      receivedAt: pallet.receivedAt,
      status: pallet.status,
    });
  } catch(e) { next(e); }
});

// POST /api/qr/batch — generate QR labels for multiple pallets
router.post('/batch', requireAuth, async (req, res, next) => {
  try {
    const { palletIds } = req.body;
    if (!Array.isArray(palletIds) || !palletIds.length) {
      return res.status(400).json({ message: 'palletIds array required' });
    }
    const pallets = await Pallet.findAll({
      where: { id: palletIds },
      include: [{ model: Location, as: 'location' }],
    });
    const labels = [];
    for (const p of pallets) {
      const qr = await qrDataUrl(p.code);
      const items = Array.isArray(p.items) ? p.items : [];
      labels.push({
        code: p.code,
        qrDataUrl: qr,
        lot: p.lot || '',
        supplier: p.supplier || '',
        location: p.location ? (p.location.code || p.location.area) : 'N/A',
        skus: items.map(i => i.sku).join(', '),
        totalQty: items.reduce((s, i) => s + (i.qty || 0), 0),
      });
    }
    res.json(labels);
  } catch(e) { next(e); }
});

module.exports = router;
