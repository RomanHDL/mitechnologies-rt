const express = require("express");
const { PalletDashboardDetail } = require("../models/sequelize");

const router = express.Router();

/**
 * GET /api/inventory/top
 * Devuelve SKUs con mayor cantidad
 */
router.get("/inventory/top", async(req, res, next) => {
    try {
        const limit = Number(req.query.limit || 5);

        const rows = await PalletDashboardDetail.findAll();

        const map = {};

        for (const r of rows) {
            if (!r.sku) continue;

            map[r.sku] = (map[r.sku] || 0) + Number(r.qty || 0);
        }

        const result = Object.entries(map)
            .map(([sku, totalQty]) => ({ sku, totalQty }))
            .sort((a, b) => b.totalQty - a.totalQty)
            .slice(0, limit);

        res.json(result);
    } catch (err) {
        next(err);
    }
});

module.exports = router;