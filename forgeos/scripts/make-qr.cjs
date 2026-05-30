// Generate a scannable QR PNG for a URL: node scripts/make-qr.cjs <url> [outfile]
const QRCode = require('qrcode');
const url = process.argv[2];
const out = process.argv[3] || 'qr.png';
if (!url) {
  console.error('usage: node scripts/make-qr.cjs <url> [outfile]');
  process.exit(1);
}
QRCode.toFile(out, url, { width: 600, margin: 2, color: { dark: '#0b0e14', light: '#ffffff' } }, (err) => {
  if (err) throw err;
  console.log('wrote', out, 'for', url);
});
