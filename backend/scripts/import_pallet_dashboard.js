/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') })

const path = require('path')
const XLSX = require('xlsx')

const { sequelize } = require('../src/config/mysql')
const PalletDashboardItem = require('../src/models/sequelize/PalletDashboardItem')
const PalletDashboardDetail = require('../src/models/sequelize/PalletDashboardDetail')

function toISODate(value) {
    // Convierte fechas de Excel (número) o texto "DD/MM/YYYY" a "YYYY-MM-DD"
    if (value == null || value === '') return ''

    // Excel guarda fechas como número (serial date)
    if (typeof value === 'number') {
        const d = XLSX.SSF.parse_date_code(value)
        if (!d || !d.y || !d.m || !d.d) return ''
        return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
    }

    const s = String(value).trim()
    if (!s) return ''

    // Si ya viene ISO
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s.slice(0, 10)

    // "DD/MM/YYYY" (tu excel)
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s)) {
        const [dd, mm, yyyy] = s.split('/')
        return `${yyyy}-${String(mm).padStart(2, '0')}-${String(dd).padStart(2, '0')}`
    }

    // A veces Excel puede traer Date string raro; último intento
    const dt = new Date(s)
    if (!Number.isNaN(dt.getTime())) {
        return dt.toISOString().slice(0, 10)
    }

    return ''
}

async function main() {
    const file = process.argv[2]

    if (!file) {
        console.log('Uso: node scripts/import_pallet_dashboard.js archivo.xlsx')
        process.exit(1)
    }

    const abs = path.resolve(file)
    const wb = XLSX.readFile(abs)

    await sequelize.authenticate()
    console.log('DB OK')

    let palletsInsertados = 0
    let detallesInsertados = 0

    for (const sheetName of wb.SheetNames) {
        const ws = wb.Sheets[sheetName]
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' })

        for (const r of rows) {
            const palletId = String(r.PalletID || '').trim()

            // En tu Excel "Piezas" es cantidad
            const piezas = Number(r.Piezas || 0) || 0

            // En tu Excel "Condicion" la estabas usando como sku (lo dejo igual para NO romper tu lógica)
            const sku = String(r.Condicion || '').trim()

            const fecha = toISODate(r.Fecha)

            const ubicacion = String(r.Ubicacion || '').trim()

            if (!palletId) continue
            if (!fecha) continue // evita insertar day inválido (como 46056-01-01)

            // Crear pallet si no existe (una fila por (day, palletId))
            const [pallet, created] = await PalletDashboardItem.findOrCreate({
                where: { day: fecha, palletId },
                defaults: {
                    day: fecha,
                    palletId,
                    status: 'PENDIENTE',
                },
            })

            if (created) palletsInsertados++

                // Insertar detalle (pueden existir varios por pallet)
                await PalletDashboardDetail.create({
                    day: fecha,
                    palletId,
                    sku: sku || null,
                    qty: piezas,
                    note: ubicacion || null,
                })

            detallesInsertados++
        }
    }

    console.log('Pallets insertados:', palletsInsertados)
    console.log('Detalles insertados:', detallesInsertados)

    process.exit(0)
}

main().catch((e) => {
    console.error(e)
    process.exit(1)
})