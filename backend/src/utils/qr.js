const QRCode = require('qrcode');

async function qrDataUrl(payload) {
  return await QRCode.toDataURL(payload, { errorCorrectionLevel: 'M', margin: 1, scale: 6 });
}

module.exports = { qrDataUrl };
