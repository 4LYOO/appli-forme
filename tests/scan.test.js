import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productToFood, isBarcode, fetchProduct } from '../js/lib/off.js';

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

