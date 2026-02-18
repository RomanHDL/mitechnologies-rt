const Movement = require('../models/Movement');
const Location = require('../models/Location');
const Product = require('../models/Product');

// Si tienes Pallet / Order / Count, agrégalos aquí:
// const Pallet = require('../models/Pallet');
// const Order = require('../models/Order');
// const Count = require('../models/Count');

function startOfDay(d = new Date()) {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
}

function daysAgo(n) {
    const d = new Date();
    d.setDate(d.getDate() - n);
    return d;
}

async function buildDashboard({ days = 7 } = {}) {
    const since = startOfDay(daysAgo(days - 1));
    const today = startOfDay(new Date());
    const tomorrow = startOfDay(new Date(Date.now() + 24 * 60 * 60 * 1000));

    // =========================
    // KPIs (ajusta según tus campos reales)
    // =========================

    // Ocupación: si Location tiene isOccupied (boolean)
    const [totalLoc, occupiedLoc] = await Promise.all([
        Location.countDocuments({}),
        Location.countDocuments({ isOccupied: true }),
    ]);

    const occupancyPct = totalLoc ? Math.round((occupiedLoc / totalLoc) * 100) : 0;

    // Entradas / Salidas hoy: si Movement tiene type: 'ENTRADA' | 'SALIDA'
    const [entriesToday, exitsToday] = await Promise.all([
        Movement.countDocuments({ type: 'ENTRADA', createdAt: { $gte: today, $lt: tomorrow } }),
        Movement.countDocuments({ type: 'SALIDA', createdAt: { $gte: today, $lt: tomorrow } }),
    ]);

    // =========================
    // Serie últimos N días (movimientos por día)
    // =========================
    const daily = await Movement.aggregate([
        { $match: { createdAt: { $gte: since } } },
        {
            $group: {
                _id: {
                    y: { $year: '$createdAt' },
                    m: { $month: '$createdAt' },
                    d: { $dayOfMonth: '$createdAt' },
                    type: '$type',
                },
                count: { $sum: 1 },
            },
        },
        {
            $project: {
                _id: 0,
                y: '$_id.y',
                m: '$_id.m',
                d: '$_id.d',
                type: '$_id.type',
                count: 1,
            },
        },
        { $sort: { y: 1, m: 1, d: 1 } },
    ]);

    // Normalizar a formato: [{date:'YYYY-MM-DD', entradas:0, salidas:0}]
    const map = new Map();
    for (const row of daily) {
        const mm = String(row.m).padStart(2, '0');
        const dd = String(row.d).padStart(2, '0');
        const key = `${row.y}-${mm}-${dd}`;

        if (!map.has(key)) map.set(key, { date: key, entradas: 0, salidas: 0 });

        const item = map.get(key);
        if (row.type === 'ENTRADA') item.entradas = row.count;
        if (row.type === 'SALIDA') item.salidas = row.count;
    }
    const series = Array.from(map.values());

    // =========================
    // Top SKUs (si Movement guarda sku en items.sku)
    // =========================
    const topSkus = await Movement.aggregate([
        { $match: { createdAt: { $gte: since } } },
        { $unwind: '$items' },
        { $group: { _id: '$items.sku', qty: { $sum: '$items.qty' } } },
        { $sort: { qty: -1 } },
        { $limit: 8 },
        { $project: { _id: 0, sku: '$_id', qty: 1 } },
    ]);

    return {
        kpis: {
            occupancyPct,
            totalLoc,
            occupiedLoc,
            entriesToday,
            exitsToday,
        },
        series,
        topSkus,
        updatedAt: new Date().toISOString(),
    };
}

module.exports = { buildDashboard };