// Módulo 2: Alertas de stock mínimo
const router = require('express').Router();
const { requireAuth, requireRole } = require('../middleware/auth');
const { StockAlert, Product, Pallet } = require('../models/sequelize');
const { Op } = require('sequelize');

// POST /api/alerts/check — recalculate stock alerts against Product.minStock
router.post('/check', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const products = await Product.findAll({ where: { isActive: true, minStock: { [Op.gt]: 0 } } });
    const pallets = await Pallet.findAll({ where: { status: 'IN_STOCK' } });

    // aggregate current stock per SKU
    const stockMap = {};
    pallets.forEach(p => {
      const items = Array.isArray(p.items) ? p.items : [];
      items.forEach(it => {
        stockMap[it.sku] = (stockMap[it.sku] || 0) + (it.qty || 0);
      });
    });

    const created = [];
    for (const prod of products) {
      const current = stockMap[prod.sku] || 0;
      if (current < prod.minStock) {
        // avoid duplicate active alerts
        const existing = await StockAlert.findOne({
          where: { sku: prod.sku, alertType: current === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK', status: 'ACTIVE' }
        });
        if (!existing) {
          const alert = await StockAlert.create({
            sku: prod.sku,
            productId: prod.id,
            alertType: current === 0 ? 'OUT_OF_STOCK' : 'LOW_STOCK',
            currentQty: current,
            minStock: prod.minStock,
          });
          created.push(alert);
        }
      } else {
        // auto-resolve if stock recovered
        await StockAlert.update(
          { status: 'RESOLVED', resolvedAt: new Date() },
          { where: { sku: prod.sku, status: 'ACTIVE', alertType: { [Op.in]: ['LOW_STOCK','OUT_OF_STOCK'] } } }
        );
      }
    }
    // Check for expiring pallets (within 30 days)
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const expiringPallets = await Pallet.findAll({
      where: { status: 'IN_STOCK', expiryDate: { [Op.ne]: null, [Op.lte]: thirtyDaysFromNow } }
    });
    for (const p of expiringPallets) {
      const items = Array.isArray(p.items) ? p.items : [];
      for (const it of items) {
        const isExpired = new Date(p.expiryDate) <= new Date();
        const alertType = isExpired ? 'EXPIRED' : 'EXPIRING_SOON';
        const existing = await StockAlert.findOne({
          where: { sku: it.sku, alertType, status: 'ACTIVE' }
        });
        if (!existing) {
          const alert = await StockAlert.create({
            sku: it.sku, productId: null, alertType,
            currentQty: it.qty || 0, minStock: 0,
          });
          created.push(alert);
        }
      }
    }
    res.json({ checked: products.length, alertsCreated: created.length, alerts: created });
  } catch(e) { next(e); }
});

// GET /api/alerts — list all alerts
router.get('/', requireAuth, async (req, res, next) => {
  try {
    const { status, type } = req.query;
    const where = {};
    if (status) where.status = status;
    if (type) where.alertType = type;
    const rows = await StockAlert.findAll({
      where, order: [['createdAt','DESC']],
      include: [{ model: Product, as: 'product', attributes: ['id','sku','description','minStock'] }]
    });
    res.json(rows);
  } catch(e) { next(e); }
});

// PATCH /api/alerts/:id/acknowledge
router.patch('/:id/acknowledge', requireAuth, async (req, res, next) => {
  try {
    const alert = await StockAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Not found' });
    alert.status = 'ACKNOWLEDGED';
    await alert.save();
    res.json(alert);
  } catch(e) { next(e); }
});

// PATCH /api/alerts/:id/resolve
router.patch('/:id/resolve', requireAuth, requireRole('ADMIN','SUPERVISOR'), async (req, res, next) => {
  try {
    const alert = await StockAlert.findByPk(req.params.id);
    if (!alert) return res.status(404).json({ message: 'Not found' });
    alert.status = 'RESOLVED';
    alert.resolvedAt = new Date();
    alert.resolvedById = req.user.id;
    await alert.save();
    res.json(alert);
  } catch(e) { next(e); }
});

module.exports = router;
