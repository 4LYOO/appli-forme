// Lecture d'un code-barres sur une photo (zxing-wasm, embarqué dans vendor/, fonctionne hors ligne).
let ready = null;
async function lib() {
  if (!ready) ready = import('../vendor/zxing-reader.js').then((m) => {
    const wasm = new URL('../vendor/zxing_reader.wasm', import.meta.url).href;
    m.prepareZXingModule({ overrides: { locateFile: (path, prefix) => (path.endsWith('.wasm') ? wasm : prefix + path) } });
    return m;
  });
  return ready;
}

export async function readBarcode(blob) {
  const { readBarcodes } = await lib();
  const res = await readBarcodes(blob, { formats: ['EAN-13', 'EAN-8', 'UPC-A', 'UPC-E'], tryHarder: true, maxNumberOfSymbols: 1 });
  const ok = res.find((r) => r.isValid && r.text);
  return ok ? ok.text : null;
}
