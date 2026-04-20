const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

const publicDir = path.join(__dirname, '..', 'public');
const pngPath = path.join(publicDir, 'favicon-48.png');
const outPath = path.join(publicDir, 'favicon.ico');

if (!fs.existsSync(pngPath)) {
  console.error('Missing', pngPath, '- generate it from src/assets/ratolabs_logo.svg (e.g. sharp-cli resize 48 48).');
  process.exit(1);
}

pngToIco([pngPath])
  .then((buf) => {
    fs.writeFileSync(outPath, buf);
    console.log('Wrote', outPath, `(${buf.length} bytes)`);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
