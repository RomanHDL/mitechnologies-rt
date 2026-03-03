/* eslint-disable no-console */
require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });

const path = require('path');
const XLSX = require('xlsx');
const { sequelize } = require('../src/config/mysql');
const PalletDashboardItem = require('../src/models/sequelize/PalletDashboardItem');

function toISODateFromSheetName(name) {
    // Ej: "27 feb" -> 2026-02-27 (asumimos 2026 por tu archivo)
    // Si tu año cambia, lo hacemos dinámico luego
    const m = String(name).trim().toLowerCase().match(/^(\d{1,2})\s*(feb|ene|mar|abr|may|jun|jul|ago|sep|oct|nov|dic)/);
    if (!m) return null;

    const day = String(m[1]).padStart(2, '0');
    const monthMap = {
        ene: '01',
        feb: '02',
        mar: '03',
        abr: '04',
        may: '05',
        jun: '06',
        jul: '07',
        ago: '08',
        sep: '09',
        oct: '10',
        nov: '11',
        dic: '12',
    };
    const mm = monthMap[m[2]];
    const yyyy = '2026';
    return `${yyyy}-${mm}-${day}`;
}

function extractPalletIdsFromSheet(sheetToJson) {
    // Saca strings tipo palletId de cualquier celda
    // Filtra vacíos y encabezados
    const out = new Set();

    for (const row of sheetToJson) {
        for (const v of Object.values(row)) {
            const s = String(v ?? '').trim();
            if (!s) continue;
            // filtros suaves: evita textos largos o títulos
            if (s.length > 40) continue;
            if (/dashboard|control|periodo|generado/i.test(s)) continue;
            // si parecen números grandes, también aceptamos
            out.add(s);
        }
    }
    return [...out];
}

async function main() {
    const file = process.argv[2];
    if (!file) {
        console.error('Uso: node scripts/import_pallet_dashboard.js <ruta_excel>');
        process.exit(1);
    }

    const abs = path.resolve(file);
    const wb = XLSX.readFile(abs);

    await sequelize.authenticate();
    console.log('DB OK');

    let inserted = 0;
    let updated = 0;

    for (const sheetName of wb.SheetNames) {
        // Solo hojas con fecha tipo "27 feb", "26 feb", etc.
        const day = toISODateFromSheetName(sheetName);
        if (!day) continue;

        const ws = wb.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(ws, { defval: '' });
        const palletIds = extractPalletIdsFromSheet(json);

        for (const palletId of palletIds) {
            // upsert por (day, palletId)
            const [row, created] = await PalletDashboardItem.findOrCreate({
                where: { day, palletId },
                defaults: { day, palletId, status: 'PENDIENTE', sourceSheet: sheetName }
            });

            if (!created) {
                // si ya existía, solo aseguramos sheet
                const did = await PalletDashboardItem.update({ sourceSheet: sheetName }, { where: { id: row.id } });
                if (did[0]) updated++;
            } else {
                inserted++;
            }
        }
    }

    console.log({ inserted, updated });
    process.exit(0);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});