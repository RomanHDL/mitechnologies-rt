const express = require('express')
const multer = require('multer')
const XLSX = require('xlsx')
const { requireAuth, requireAdmin } = require('../middleware/auth')
const {
    sequelize,
    PalletDashboardItem,
    PalletDashboardDetail,
    ProductionRequest,
    Location,
    Product,
    User,
} = require('../models/sequelize')

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

function toISODate(val) {
    if (!val) return ''
    if (val instanceof Date && !Number.isNaN(val.getTime())) return val.toISOString().slice(0, 10)
    if (typeof val === 'number') {
        const d = XLSX.SSF.parse_date_code(val)
        if (d?.y && d?.m && d?.d) {
            const yyyy = String(d.y).padStart(4, '0')
            const mm = String(d.m).padStart(2, '0')
            const dd = String(d.d).padStart(2, '0')
            return `${yyyy}-${mm}-${dd}`
        }
    }
    const s = String(val).trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/')
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }
    return ''
}

function sheetToRows(wb, name) {
    const ws = wb.Sheets[name]
    if (!ws) return []
    return XLSX.utils.sheet_to_json(ws, { defval: '' })
}

// ✅ Busca hoja aunque el nombre no sea exacto
function pickSheetName(wb, candidates = []) {
    const names = wb?.SheetNames || []
    if (!names.length) return null

    const norm = (s) => String(s || '')
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '')
        .replace(/[-_]/g, '')

    const normNames = names.map(n => ({ raw: n, n: norm(n) }))

    for (const c of candidates) {
        const target = norm(c)
        const exact = normNames.find(x => x.n === target)
        if (exact) return exact.raw
    }

    // fallback: contiene palabra clave
    for (const c of candidates) {
        const target = norm(c)
        const contains = normNames.find(x => x.n.includes(target) || target.includes(x.n))
        if (contains) return contains.raw
    }

    return null
}

function pickSheetRows(wb, candidates) {
    const name = pickSheetName(wb, candidates)
    if (!name) return { name: null, rows: [] }
    return { name, rows: sheetToRows(wb, name) }
}

router.post('/admin/import-excel', requireAuth, requireAdmin, upload.single('file'), async(req, res, next) => {
    try {
        if (!req.file?.buffer) return res.status(400).json({ message: 'Archivo requerido' })

        const wb = XLSX.read(req.file.buffer, { type: 'buffer' })

        // ✅ Más flexible con nombres de hojas
        const palletsPick = pickSheetRows(wb, ['PalletDashboard', 'Pallet Dashboard', 'Dashboard', 'Paletizado', 'Pallets'])
        const detailsPick = pickSheetRows(wb, ['PalletDetails', 'Pallet Details', 'Details', 'Detalle', 'PalletDetalle'])
        const prodReqsPick = pickSheetRows(wb, ['ProductionRequests', 'Production Requests', 'Produccion', 'Producción', 'Requests'])
        const locationsPick = pickSheetRows(wb, ['Locations', 'Ubicaciones', 'Location'])
        const productsPick = pickSheetRows(wb, ['Products', 'Productos', 'Product'])

        const pallets = palletsPick.rows
        const details = detailsPick.rows
        const prodReqs = prodReqsPick.rows
        const locations = locationsPick.rows
        const products = productsPick.rows

        const result = {
            sheets: {
                PalletDashboard: palletsPick.name,
                PalletDetails: detailsPick.name,
                ProductionRequests: prodReqsPick.name,
                Locations: locationsPick.name,
                Products: productsPick.name,
            },
            PalletDashboard: { inserted: 0, replacedDays: new Set() },
            PalletDetails: { inserted: 0, replacedDays: new Set() },
            ProductionRequests: { inserted: 0 },
            Locations: { insertedOrUpdated: 0 },
            Products: { insertedOrUpdated: 0 },
        }

        await sequelize.transaction(async(t) => {
            // ✅ 1) PalletDashboard (reemplaza por día)
            if (pallets.length) {
                const days = [...new Set(pallets.map(r => toISODate(r.day || r.Day || r.Fecha || r.FECHA)).filter(Boolean))]
                for (const day of days) {
                    await PalletDashboardItem.destroy({ where: { day }, transaction: t })
                    result.PalletDashboard.replacedDays.add(day)
                }

                const safe = pallets.map(r => {
                    const day = toISODate(r.day || r.Day || r.Fecha || r.FECHA)
                    const palletId = String(r.palletId || r.PalletID || r.PalletId || r.PALLETID || '').trim()
                    const statusRaw = String(r.status || r.Status || r.ESTATUS || 'PENDIENTE').trim().toUpperCase()
                    const status = statusRaw === 'PROCESADO' ? 'PROCESADO' : 'PENDIENTE'
                    return { day, palletId, status }
                }).filter(x => x.day && x.palletId)

                if (safe.length) {
                    await PalletDashboardItem.bulkCreate(safe, { transaction: t })
                    result.PalletDashboard.inserted += safe.length
                }
            }

            // ✅ 2) PalletDetails (reemplaza por día)
            if (details.length) {
                const days = [...new Set(details.map(r => toISODate(r.day || r.Day || r.Fecha || r.FECHA)).filter(Boolean))]
                for (const day of days) {
                    await PalletDashboardDetail.destroy({ where: { day }, transaction: t })
                    result.PalletDetails.replacedDays.add(day)
                }

                const safe = details.map(r => {
                    const day = toISODate(r.day || r.Day || r.Fecha || r.FECHA)
                    const palletId = String(r.palletId || r.PalletID || r.PalletId || r.PALLETID || '').trim()
                    const sku = String(r.sku || r.SKU || r.Condicion || r.CONDICION || '').trim() || null
                    const qty = Number(r.qty ?? r.Qty ?? r.Piezas ?? r.PIEZAS ?? 0) || 0
                    const note = String(r.note || r.Ubicacion || r.Location || r.UBICACION || '').trim() || null
                    return { day, palletId, sku, qty, note }
                }).filter(x => x.day && x.palletId && (x.sku || x.qty > 0 || x.note))

                if (safe.length) {
                    await PalletDashboardDetail.bulkCreate(safe, { transaction: t })
                    result.PalletDetails.inserted += safe.length
                }
            }

            // ✅ 3) ProductionRequests (inserta)
            if (prodReqs.length) {
                for (const r of prodReqs) {
                    const area = String(r.area || r.Area || r.AREA || '').trim()
                    const subarea = String(r.subarea || r.SubArea || r['Sub-área'] || r.SUBAREA || '').trim()
                    const sku = String(r.sku || r.SKU || '').trim()
                    const qty = Number(r.qty ?? r.Qty ?? r.Piezas ?? 0) || 0
                    const note = String(r.note || r.Nota || r.NOTA || '').trim()
                    const status = String(r.status || r.Status || 'PENDIENTE').trim().toUpperCase()
                    const email = String(r.requestedByEmail || r.Email || r.EMAIL || '').trim().toLowerCase()

                    if (!area || !subarea || !sku || qty <= 0) continue

                    let requestedByUserId = null
                    if (email) {
                        const u = await User.findOne({ where: { email }, transaction: t })
                        requestedByUserId = u?.id ?? null
                    }

                    await ProductionRequest.create({
                        area,
                        subarea,
                        items: [{ sku, qty }],
                        note,
                        status: ['PENDIENTE', 'EN PROCESO', 'COMPLETADA', 'CANCELADA'].includes(status) ? status : 'PENDIENTE',
                        requestedByUserId,
                    }, { transaction: t })

                    result.ProductionRequests.inserted++
                }
            }

            // ✅ 4) Locations (upsert)
            if (locations.length) {
                for (const r of locations) {
                    const code = String(r.code || r.Code || r.CODIGO || '').trim()
                    if (!code) continue
                    const area = String(r.area || r.Area || r.AREA || '').trim()
                    const level = String(r.level || r.Level || r.Nivel || '').trim()
                    const position = String(r.position || r.Position || r.Posicion || '').trim()

                    await Location.upsert({ code, area, level, position }, { transaction: t })
                    result.Locations.insertedOrUpdated++
                }
            }

            // ✅ 5) Products (upsert)
            if (products.length) {
                for (const r of products) {
                    const sku = String(r.sku || r.SKU || '').trim()
                    if (!sku) continue
                    const name = String(r.name || r.Name || r.NOMBRE || '').trim()

                    await Product.upsert({ sku, name }, { transaction: t })
                    result.Products.insertedOrUpdated++
                }
            }
        })

        const affectedDays = [
            ...new Set([
                ...result.PalletDashboard.replacedDays,
                ...result.PalletDetails.replacedDays
            ])
        ]

        // ✅ REALTIME: estos eventos los emitirá tu server.js (middleware res.locals.emit)
        // Ajusta el frontend para escuchar estos eventos y hacer refresh().
        res.locals.emit = [
            { event: 'dashboard:update', data: { at: new Date().toISOString(), reason: 'admin-import-excel' } },
            { event: 'palletDashboard:update', data: { at: new Date().toISOString(), days: affectedDays } },
            { event: 'production:update', data: { at: new Date().toISOString(), reason: 'admin-import-excel' } },
        ]

        res.json({
            ok: true,
            result: {
                ...result,
                PalletDashboard: {...result.PalletDashboard, replacedDays: [...result.PalletDashboard.replacedDays] },
                PalletDetails: {...result.PalletDetails, replacedDays: [...result.PalletDetails.replacedDays] },
            }
        })
    } catch (e) { next(e) }
})

module.exports = router