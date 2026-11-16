import { test } from 'node:test';
import assert from 'node:assert/strict';
import { carryOver, skipRates, adaptedShares, remainingPlan, suggestPlan, catchUpBlocks } from '../js/lib/daily.js';
import { SLOTS } from '../js/lib/nutrition.js';
import { addDays } from '../js/lib/dates.js';

test('rattrapage : moitié du manque de la veille, plafonné, jamais négatif', () => {
  assert.equal(carryOver({ base: 2890, yesterday: { kcal: 2400, complete: true } }).carry, 250);
  assert.equal(carryOver({ base: 2890, yesterday: { kcal: 1500, complete: true } }).carry, 300);
  assert.equal(carryOver({ base: 2890, yesterday: { kcal: 2800, complete: true } }).carry, 0);
  assert.equal(carryOver({ base: 2890, yesterday: { kcal: 3500, complete: true } }).carry, 0);
  assert.equal(carryOver({ base: 2890, yesterday: { kcal: 1500, complete: false } }).carry, 0); // journée incomplète : on ne sait pas
});

test('créneaux sautés et parts ajustées', () => {
  const T = '2026-11-30', meals = [];
  for (let i = 1; i <= 10; i++) for (const s of ['petitdej', 'midi', 'c16', 'diner', 'coucher']) meals.push({ date: addDays(T, -i), slot: s });
  const r = skipRates(meals, T);
  assert.equal(r.c10.rate, 1); assert.equal(r.c10.days, 10); assert.equal(r.midi.rate, 0);
  const { shares, skipped } = adaptedShares(r);
  assert.deepEqual(skipped, ['c10']);
  assert.ok(Math.abs(Object.values(shares).reduce((t, x) => t + x, 0) - 1) < 1e-9);
  assert.ok(shares.c10 < 0.1 && shares.petitdej > 0.2);
  assert.deepEqual(adaptedShares(skipRates(meals.slice(0, 10), T)).skipped, []); // trop peu de jours
});

test('répartition dynamique du reste de la journée', () => {
  const shares = Object.fromEntries(SLOTS.map((s) => [s.id, s.share]));
  // 16h10, petit-déj sauté (passé depuis longtemps), midi mangé
  const plan = remainingPlan({ target: { kcal: 2890, protein: 116 }, eaten: { midi: { kcal: 700, p: 25 } }, nowMin: 16 * 60 + 10, shares });
  assert.deepEqual(plan.map((x) => x.id), ['c16', 'diner', 'coucher']);
  const k = plan.reduce((t, x) => t + x.kcal, 0);
  assert.ok(Math.abs(k - 2190) <= 20, `reste réparti ${k}`);
  assert.ok(plan.find((x) => x.id === 'diner').kcal > 1000); // le dîner absorbe le petit-déj sauté
  // 15h40, déjeuner pas encore noté : il reste « à faire » (probablement mangé, pas noté)
  const p2 = remainingPlan({ target: { kcal: 2890, protein: 116 }, eaten: { petitdej: { kcal: 600, p: 22 } }, nowMin: 15 * 60 + 40, shares });
  assert.deepEqual(p2.map((x) => x.id), ['midi', 'c16', 'diner', 'coucher']);
});

test('plan de fin de journée : colle au reste, préfère les habitudes', () => {
  const plan = [{ id: 'c16', kcal: 400, p: 15 }, { id: 'diner', kcal: 1000, p: 35 }];
  const cand = {
    c16: [{ name: 'Petite collation', kcal: 150, p: 5 }, { name: 'Amandes et dattes', kcal: 305, p: 7, habit: true }, { name: 'Smoothie', kcal: 650, p: 22 }],
    diner: [{ name: 'Pâtes pesto', kcal: 700, p: 25, habit: true }, { name: 'Curry + riz', kcal: 950, p: 30 }, { name: 'Très copieux', kcal: 1250, p: 40 }],
  };
  const s = suggestPlan(plan, cand);
  const tot = s.reduce((t, x) => t + x.option.kcal, 0);
  assert.equal(s.length, 2);
  assert.ok(Math.abs(tot - 1400) <= 250, `total ${tot}`);
});

test('mini-séance sur les muscles en retard', () => {
  const pool = [{ ex: 'pompes', muscle: 'pecs' }, { ex: 'rowing', muscle: 'dos' }, { ex: 'squat', muscle: 'quadriceps' }, { ex: 'pont', muscle: 'ischios' }, { ex: 'pike', muscle: 'epaules' }];
  const b = catchUpBlocks({ volume: { pecs: 9, dos: 4, quadriceps: 3, ischios: 9, epaules: 2 }, targets: { pecs: 10, dos: 10, quadriceps: 10, ischios: 10, epaules: 10 }, pool });
  assert.deepEqual(b.map((x) => x.ex), ['pike', 'squat', 'rowing']);
  assert.equal(catchUpBlocks({ volume: {}, targets: { pecs: 10 }, pool, weekendMissed: true })[0].sets, 3);
});
