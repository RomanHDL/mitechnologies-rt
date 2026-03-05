const express = require('express');
const multer = require('multer');
const XLSX = require('xlsx');

// intenta tomar middlewares existentes
const auth = require('../middleware/auth') || {};
const requireAuth = auth.requireAuth || ((req, res, next) => next());

// ✅ si requireAdmin no existe en tu middleware/auth, usamos un fallback seguro
const requireAdmin =
    auth.requireAdmin ||
    ((req, res, next) => {
        // intenta varios formatos comunes de auth
        const u = req.user || req.auth || {};
        const role = (u.role || u.rol || '').toString().toLowerCase();
        const isAdmin =
            u.isAdmin === true ||
            u.admin === true ||
            role === 'admin' ||
            role === 'administrator';

        if (!isAdmin) {
            return res.status(403).json({ message: 'Solo admin' });
        }
        return next();
    });

const {
    sequelize,
    PalletDashboardItem,
    PalletDashboardDetail,
    ProductionRequest,
    Location,
    Product,
    User,
} = require('../models/sequelize');

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

function toISODate(val) {
    if (!val) return '';
    if (val instanceof Date && !Number.isNaN(val.getTime())) return val.toISOString().slice(0, 10);

    if (typeof val === 'number') {
        const d = XLSX.SSF.parse_date_code(val);
        if (d && d.y && d.m && d.d) {
            const yyyy = String(d.y).padStart(4, '0');
            const mm = String(d.m).padStart(2, '0');
            const dd = String(d.d).padStart(2, '0');
            return `${yyyy}-${mm}-${dd}`;
        }
    }

    const s = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/');
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`;
    }
    return '';
}

function sheetToRows(wb, name) {
    const ws = wb.Sheets[name];
    if (!ws) return [];
    return XLSX.utils.sheet_to_json(ws, { defval: '' });
}

/**
 * POST /api/admin/import-excel
 * Form-data: file (xlsx)
 */
router.post(
    '/admin/import-excel',
    requireAuth,
    requireAdmin,
    upload.single('file'),
    async(req, res, next) => {
        try {
            if (!req.file || !req.file.buffer) {
                return res.status(400).json({ message: 'Archivo requerido' });
            }

            const wb = XLSX.read(req.file.buffer, { type: 'buffer' });

            // Nombres de hojas esperadas (ajústalos si tu Excel usa otros)
            const pallets = sheetToRows(wb, 'PalletDashboard');
            const details = sheetToRows(wb, 'PalletDetails');
            const prodReqs = sheetToRows(wb, 'ProductionRequests');
            const locations = sheetToRows(wb, 'Locations');
            const products = sheetToRows(wb, 'Products');

            const result = {
                PalletDashboard: { inserted: 0, replacedDays: new Set() },
                PalletDetails: { inserted: 0, replacedDays: new Set() },
                ProductionRequests: { inserted: 0 },
                Locations: { insertedOrUpdated: 0 },
                Products: { insertedOrUpdated: 0 },
            };

            await sequelize.transaction(async(t) => {
                // 1) PalletDashboard (reemplaza por día)
                if (pallets.length) {
                    const days = [
                        ...new Set(
                            pallets
                            .map((r) => toISODate(r.day || r.Day || r.Fecha || r.FECHA))
                            .filter(Boolean)
                        ),
                    ];

                    for (const day of days) {
                        await PalletDashboardItem.destroy({ where: { day }, transaction: t });
                        result.PalletDashboard.replacedDays.add(day);
                    }

                    const safe = pallets
                        .map((r) => {
                            const day = toISODate(r.day || r.Day || r.Fecha || r.FECHA);
                            const palletId = String(r.palletId || r.PalletID || r.PalletId || r.PALLETID || '').trim();
                            const statusRaw = String(r.status || r.Status || 'PENDIENTE')
                                .trim()
                                .toUpperCase();
                            const status = statusRaw === 'PROCESADO' ? 'PROCESADO' : 'PENDIENTE';
                            return { day, palletId, status };
                        })
                        .filter((x) => x.day && x.palletId);

                    if (safe.length) {
                        await PalletDashboardItem.bulkCreate(safe, { transaction: t });
                        result.PalletDashboard.inserted += safe.length;
                    }
                }

                // 2) PalletDetails (reemplaza por día)
                if (details.length) {
                    const days = [
                        ...new Set(
                            details
                            .map((r) => toISODate(r.day || r.Day || r.Fecha || r.FECHA))
                            .filter(Boolean)
                        ),
                    ];

                    for (const day of days) {
                        await PalletDashboardDetail.destroy({ where: { day }, transaction: t });
                        result.PalletDetails.replacedDays.add(day);
                    }

                    const safe = details
                        .map((r) => {
                            const day = toISODate(r.day || r.Day || r.Fecha || r.FECHA);
                            const palletId = String(r.palletId || r.PalletID || r.PalletId || r.PALLETID || '').trim();
                            const sku = String(r.sku || r.SKU || r.Condicion || '').trim() || null;
                            const qty = Number(r.qty ?? r.Qty ?? r.Piezas ?? r.PIEZAS ?? 0) || 0;
                            const note = String(r.note || r.Ubicacion || r.Location || '').trim() || null;
                            return { day, palletId, sku, qty, note };
                        })
                        .filter((x) => x.day && x.palletId && (x.sku || x.qty > 0 || x.note));

                    if (safe.length) {
                        await PalletDashboardDetail.bulkCreate(safe, { transaction: t });
                        result.PalletDetails.inserted += safe.length;
                    }
                }

                // 3) ProductionRequests (inserta)
                if (prodReqs.length) {
                    for (const r of prodReqs) {
                        const area = String(r.area || r.Area || '').trim();
                        const subarea = String(r.subarea || r.SubArea || r['Sub-área'] || r['Sub-area'] || '').trim();
                        const sku = String(r.sku || r.SKU || '').trim();
                        const qty = Number(r.qty ?? r.Qty ?? r.Piezas ?? 0) || 0;
                        const note = String(r.note || r.Nota || '').trim();
                        const statusRaw = String(r.status || r.Status || 'PENDIENTE').trim().toUpperCase();
                        const email = String(r.requestedByEmail || r.Email || '').trim().toLowerCase();

                        if (!area || !subarea || !sku || qty <= 0) continue;

                        let requestedByUserId = null;
                        if (email) {
                            const u = await User.findOne({ where: { email }, transaction: t });
                            requestedByUserId = u ? u.id : null;
                        }

                        const statusOk = ['PENDIENTE', 'EN PROCESO', 'COMPLETADA', 'CANCELADA'].includes(statusRaw) ?
                            statusRaw :
                            'PENDIENTE';

                        await ProductionRequest.create({
                            area,
                            subarea,
                            items: [{ sku, qty }],
                            note,
                            status: statusOk,
                            requestedByUserId,
                        }, { transaction: t });

                        result.ProductionRequests.inserted++;
                    }
                }

                // 4) Locations (upsert)
                if (locations.length) {
                    for (const r of locations) {
                        const code = String(r.code || r.Code || '').trim();
                        if (!code) continue;

                        const area = String(r.area || r.Area || '').trim();
                        const level = String(r.level || r.Level || '').trim();
                        const position = String(r.position || r.Position || '').trim();

                        await Location.upsert({ code, area, level, position }, { transaction: t });

                        result.Locations.insertedOrUpdated++;
                    }
                }

                // 5) Products (upsert)
                if (products.length) {
                    for (const r of products) {
                        const sku = String(r.sku || r.SKU || '').trim();
                        if (!sku) continue;

                        const name = String(r.name || r.Name || '').trim();

                        await Product.upsert({ sku, name }, { transaction: t });

                        result.Products.insertedOrUpdated++;
                    }
                }
            });

            return res.json({
                ok: true,
                result: {
                    ...result,
                    PalletDashboard: {
                        ...result.PalletDashboard,
                        replacedDays: [...result.PalletDashboard.replacedDays],
                    },
                    PalletDetails: {
                        ...result.PalletDetails,
                        replacedDays: [...result.PalletDetails.replacedDays],
                    },
                },
            });
        } catch (e) {
            return next(e);
        }
    }
);

module.exports = router;