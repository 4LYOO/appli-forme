const fs = require('fs'); const { chromium } = require('playwright');
const svg = fs.readFileSync(__dirname + '/icon-repas-sport.svg', 'utf8');
(async () => {
  const b = await chromium.launch();
  for (const [name, size] of [['apple-touch-icon.png', 180], ['icon-192.png', 192], ['icon-512.png', 512]]) {
    const p = await b.newPage({ viewport: { width: size, height: size } });
    await p.setContent(`<style>*{margin:0}svg{width:${size}px;height:${size}px;display:block}</style>${svg}`);
    await p.screenshot({ path: __dirname + '/../../icons/' + name, omitBackground: false }); await p.close();
  }
  await b.close();
})();
