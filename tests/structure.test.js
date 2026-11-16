// Vérifie que tous les fichiers de l'appli sont bien mis en cache par le service worker (sinon : panne hors ligne).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const assets = [...sw.matchAll(/'\.\/([^']*)'/g)].map((m) => m[1]).filter(Boolean);

function walk(dir) {
  return readdirSync(join(root, dir)).flatMap((f) => {
    const p = join(dir, f);
    return statSync(join(root, p)).isDirectory() ? walk(p) : [p];
  });
}

test('chaque fichier précaché existe', () => {
  for (const a of assets) assert.ok(existsSync(join(root, a)), `manquant : ${a}`);
});

test('chaque module JS, CSS, donnée et icône est précaché', () => {
  const files = ['js', 'css', 'data', 'icons'].flatMap(walk);
  for (const f of files) assert.ok(assets.includes(f), `non précaché dans sw.js : ${f}`);
});

test('base d\'aliments valide', () => {
  const { foods } = JSON.parse(readFileSync(join(root, 'data/foods.json'), 'utf8'));
  assert.ok(foods.length > 100);
  const ids = new Set();
  for (const f of foods) {
    assert.ok(!ids.has(f.id), `id en double ${f.id}`); ids.add(f.id);
    assert.ok(f.kcal >= 0 && f.p >= 0 && f.portions.length, f.name);
    // cohérence énergétique : 4 kcal/g P et G, 9 kcal/g L (± 25 % ; fibres et alcools non comptés)
    const calc = 4 * f.p + 4 * f.g + 9 * f.l;
    assert.ok(Math.abs(calc - f.kcal) <= Math.max(25, f.kcal * 0.25), `${f.name} : ${f.kcal} kcal vs ${calc.toFixed(0)} calculées`);
  }
});

test('les assiettes types ne référencent que des aliments existants', async () => {
  const { PLATES } = await import('../js/data/plates.js');
  const { foods } = JSON.parse(readFileSync(join(root, 'data/foods.json'), 'utf8'));
  const names = new Set(foods.map((f) => f.name));
  for (const p of PLATES) for (const [n] of p.items) assert.ok(names.has(n), `${p.name} → ${n}`);
});

test('chaque source citée par les écrans existe', async () => {
  const { SOURCES } = await import('../js/data/sources.js');
  const code = walk('js').filter((f) => f.endsWith('.js')).map((f) => readFileSync(join(root, f), 'utf8')).join('\n');
  const ids = new Set([...code.matchAll(/why\(\s*(\[[^\]]*\]|'[^']*')/g)].flatMap((m) => [...m[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1])));
  for (const id of ids) assert.ok(SOURCES[id], `source inconnue : ${id}`);
  assert.ok(ids.size > 15);
});
