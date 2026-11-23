import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays } from '../js/lib/dates.js';
import { dailyIntake, runWeekly, weekReview, priorityAdvice } from '../js/lib/weekly.js';

const START = '2026-11-02'; // lundi
function data({ days = 28, kcal = 3000, gainPerDay = 0.3 / 7, completeEvery = 1 }) {
  const meals = [], weights = [], dayRecs = [];
  for (let i = 0; i < days; i++) {
    const date = addDays(START, i);
    if (i % completeEvery === 0) for (const slot of ['petitdej', 'midi', 'diner']) meals.push({ date, slot, total: { kcal: kcal / 3, p: 40 } });
    weights.push({ date, kg: 58 + gainPerDay * i });
  }
  return { meals, weights, dayRecs };
}
const targets = { kcal: 2890, protein: 116, maintenance: 2510 };

test('apports par jour et jours complets', () => {
  const { meals } = data({ days: 3 });
  meals.pop(); // dîner du 3e jour manquant
  const it = dailyIntake(meals, [], START, addDays(START, 2));
  assert.deepEqual(it.map((d) => d.complete), [true, true, false]);
  assert.equal(it[0].kcal, 3000);
  assert.equal(dailyIntake(meals, [{ date: addDays(START, 2), complete: true }], START, addDays(START, 2))[2].complete, true);
});

test('mise à jour hebdomadaire : pas avant 14 jours, puis une fois par semaine', () => {
  const { meals, weights } = data({ days: 28 });
  const intake = dailyIntake(meals, [], START, addDays(START, 27));
  assert.equal(runWeekly({ today: addDays(START, 10), firstDay: START, intake, weights, targets }).due, false);
  const r = runWeekly({ today: addDays(START, 28), firstDay: START, intake, weights, targets });
  assert.equal(r.due, true);
  assert.equal(r.est.confidence, 'bonne');
  assert.ok(Math.abs(r.est.tdee - 2670) < 30, `dépense ${r.est.tdee}`); // 3000 − 0,3×7700/7
  assert.equal(r.change, 110); // idéal ≈ 2670 + 330 = 3000 ; objectif actuel 2890 → +110
  assert.match(r.text, /jours complets/);
  assert.equal(runWeekly({ today: addDays(START, 30), firstDay: START, intake, weights, targets, state: r.state }).due, false);
});

test('stagnation avec apports au niveau de l\'objectif → +kcal', () => {
  const { meals, weights } = data({ days: 28, kcal: 2900, gainPerDay: 0 });
  const intake = dailyIntake(meals, [], START, addDays(START, 27));
  const r = runWeekly({ today: addDays(START, 28), firstDay: START, intake, weights, targets });
  assert.equal(r.diag.cause, 'depense');
  assert.ok(r.change > 0);
});

test('bilan du dimanche et conseil prioritaire unique', () => {
  const { meals, weights } = data({ days: 14 });
  const intake = dailyIntake(meals, [], START, addDays(START, 13));
  const wk = [{ date: addDays(START, 12), session: 'A', status: 'terminee' }];
  const r = weekReview({ date: addDays(START, 13), intake, weights, workouts: wk, targets });
  assert.equal(r.completeDays, 7);
  assert.equal(r.kcalAvg, 3000);
  assert.equal(r.sessions, 1);
  assert.match(r.priority.text, /1\/2 séances/);
  assert.match(priorityAdvice({ completeDays: 2 }, targets).text, /Seulement 2 jours/);
  assert.match(priorityAdvice({ completeDays: 7, kcalAvg: 2500, weekendSessions: 2 }, targets).text, /87 %/);
});

test('composition à partir des mensurations', async () => {
  const { compositionSignal } = await import('../js/lib/weekly.js');
  assert.equal(compositionSignal([{ date: '2026-11-01', waist: 70 }]).status, 'inconnu');
  assert.equal(compositionSignal([{ date: '2026-11-01', arm: 27, chest: 85, thigh: 48, waist: 70 }, { date: '2027-01-01', arm: 27.2, chest: 85.5, thigh: 48.2, waist: 73 }]).status, 'gras');
  assert.equal(compositionSignal([{ date: '2026-11-01', arm: 27, chest: 85, thigh: 48, waist: 70 }, { date: '2027-01-01', arm: 28, chest: 87, thigh: 49.5, waist: 70.5 }]).status, 'muscle');
});

test('sans balance : une pesée par semaine suffit pour une estimation (confiance limitée)', async () => {
  const { estimateTDEE } = await import('../js/lib/adaptive.js');
  const days = [], weights = [];
  for (let i = 0; i < 42; i++) {
    const date = addDays(START, i);
    days.push({ date, kcal: 3000, complete: true });
    if (i % 7 === 6) weights.push({ date, kg: 58 + (0.25 / 7) * i + (i % 14 === 6 ? 0.3 : -0.3) }); // pesées bruitées ±0,3 kg
  }
  const e = estimateTDEE({ days, weights, prior: 2500, endDate: addDays(START, 41) });
  assert.equal(e.sparse, true);
  assert.equal(e.nWeigh, 6);
  assert.ok(['faible', 'moyenne'].includes(e.confidence), e.confidence); // jamais « bonne » avec si peu de pesées
  assert.ok(e.tdee > 2500 && e.tdee < 3000, `${e.tdee}`); // tire vers la vraie valeur (≈ 2 725) sans y aller d'un coup
});
