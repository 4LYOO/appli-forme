import { test } from 'node:test';
import assert from 'node:assert/strict';
import { goalProgress, currentGoal } from '../js/lib/goal.js';

test('cap 65 kg depuis 58 kg', () => {
  const g = goalProgress({ startKg: 58, currentKg: 59.4, goalKg: 65, today: '2026-11-23' });
  assert.equal(g.goal, 65); assert.equal(g.remaining, 5.6); assert.equal(g.weeks, 19);
  assert.ok(Math.abs(g.pct - 0.2) < 1e-9); assert.equal(g.passed, false);
});
test('au-delà de 65 : palier suivant 68', () => {
  assert.equal(currentGoal(65, 65.2), 68);
  const g = goalProgress({ startKg: 58, currentKg: 66.5, goalKg: 65, today: '2026-11-23', rate: 0.25 });
  assert.equal(g.goal, 68); assert.equal(g.from, 65); assert.equal(g.passed, true); assert.equal(g.weeks, 6);
});
test('rythme nul ou négatif : rythme visé', () => {
  const g = goalProgress({ startKg: 58, currentKg: 58, goalKg: 65, rate: -0.1, today: '2026-11-23' });
  assert.equal(g.measured, false); assert.equal(g.weeks, 24);
});
