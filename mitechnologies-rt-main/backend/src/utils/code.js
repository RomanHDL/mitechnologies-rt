const crypto = require('crypto');

function makePalletCode() {
  // corto y único: PLT-YYYYMMDD-<6>
  const d = new Date();
  const ymd = `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `PLT-${ymd}-${rand}`;
}

module.exports = { makePalletCode };
