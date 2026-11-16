import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productToFood, isBarcode, fetchProduct } from '../js/lib/off.js';
import { toCartItems, systemPrompt, VISION_SCHEMA } from '../js/lib/vision.js';

const COMPOTE = { code: '3045320094084', product_name_fr: 'Compote pomme nature', brands: 'Andros,Andros SA', serving_quantity: '90', product_quantity: '360',
  nutriments: { 'energy-kcal_100g': 68, proteins_100g: 0.3, carbohydrates_100g: 15.6, fat_100g: 0.2 } };

test('produit Open Food Facts → aliment de l\'appli', () => {
  const f = productToFood(COMPOTE);
  assert.equal(f.name, 'Compote pomme nature — Andros');
  assert.equal(f.kcal, 68); assert.equal(f.p, 0.3);
  assert.deepEqual(f.portions.map((p) => p.g), [90, 360, 100]);
  assert.equal(f.id, 'off-3045320094084');
  // énergie en kJ seulement
  assert.equal(productToFood({ code: '1', product_name: 'X', nutriments: { energy_100g: 418.4 } }).kcal, 100);
  assert.equal(productToFood({ code: '1', product_name: 'X', nutriments: {} }), null);
  assert.ok(isBarcode('3045320094084') && isBarcode('12345678') && !isBarcode('12345'));
});

test('lecture de l\'API (réponse simulée)', async () => {
  const fake = async () => ({ ok: true, status: 200, json: async () => ({ status: 1, product: COMPOTE }) });
  assert.equal((await fetchProduct('3045320094084', fake)).brand, 'Andros');
  const none = async () => ({ ok: false, status: 404, json: async () => ({ status: 0 }) });
  assert.equal(await fetchProduct('000', none), null);
});

test('réponse de l\'IA → panier (base de l\'appli prioritaire)', () => {
  const foods = [{ id: 'croissant', name: 'Croissant', kcal: 420, p: 8, g: 45, l: 22 }];
  const items = toCartItems({ items: [
    { name: 'Croissant', brand: null, barcode: null, match_id: 'croissant', grams: 60, portion_label: '1 croissant', kcal: 999, protein: 0, carbs: 0, fat: 0, confidence: 'bonne' },
    { name: 'Compote de pommes', brand: 'Andros', barcode: null, match_id: null, grams: 90, portion_label: '1 gourde', kcal: 61, protein: 0.3, carbs: 14, fat: 0.2, confidence: 'moyenne' },
    { name: 'Rien', brand: null, barcode: null, match_id: 'inconnu', grams: 0, portion_label: '', kcal: 0, protein: 0, carbs: 0, fat: 0, confidence: 'faible' },
  ], note: '' }, foods);
  assert.equal(items.length, 2);
  assert.equal(items[0].kcal, 252); assert.equal(items[0].source, 'base'); // 420 × 0,6, pas les 999 de l'IA
  assert.equal(items[1].name, 'Compote de pommes — Andros'); assert.equal(items[1].kcal, 61); assert.equal(items[1].source, 'ia');
});

test('consigne et schéma', () => {
  const sp = systemPrompt([{ id: 'croissant', name: 'Croissant' }]);
  assert.match(sp, /croissant : Croissant/);
  assert.equal(VISION_SCHEMA.additionalProperties, false);
  assert.deepEqual(VISION_SCHEMA.properties.items.items.required.length, Object.keys(VISION_SCHEMA.properties.items.items.properties).length);
});
