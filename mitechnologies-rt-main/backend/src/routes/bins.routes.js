const express = require('express');
const router = express.Router();

// Ajusta este import según tu estructura real:
const { Location } = require('../models/sequelize'); 
// Si tu export es distinto, aquí lo acomodamos cuando me pegues tu index.js

// (Opcional) Si proteges rutas:
// const { requireAuth } = require('../middleware/auth');

function buildBins() {
  const bins = [];

  const make = (areaName, prefix, kindLabel, start, end) => {
    for (let i = start; i <= end; i++) {
      const n = String(i).padStart(2, '0');
      bins.push({
        code: `${prefix}${n}`,
        area: areaName,       // si tu tabla no tiene "area", lo quitamos
        kind: kindLabel,      // si tu tabla no tiene "kind/type", lo quitamos
      });
    }
  };

  // TECHNICAL
  make('TECHNICAL', 'MTY-MAXX-TECH-AREA', 'ENTRADA', 1, 5);
  make('TECHNICAL', 'MTY-MAXX-TECH-RETURN', 'SALIDA', 1, 5);

  // OPENCELL
  make('OPENCELL', 'MTY-MAXX-OPENCELL-AREA', 'ENTRADA', 1, 5);
  make('OPENCELL', 'MTY-MAXX-OPENCELL-RETURN', 'SALIDA', 1, 5);

  return bins;
}

router.post('/seed-bins', /* requireAuth, */ async (req, res) => {
  try {
    const bins = buildBins();

    const created = [];
    const existing = [];

    for (const b of bins) {
      // ✅ No duplica: busca por "code"
      const [row, wasCreated] = await Location.findOrCreate({
        where: { code: b.code },
        defaults: b,
      });

      if (wasCreated) created.push(row.code);
      else existing.push(row.code);
    }

    return res.json({
      ok: true,
      total: bins.length,
      createdCount: created.length,
      existingCount: existing.length,
      created,
      existing,
    });
  } catch (err) {
    console.error('seed-bins error:', err);
    return res.status(500).json({ ok: false, message: 'Error al sembrar bines', error: String(err) });
  }
});

module.exports = router;