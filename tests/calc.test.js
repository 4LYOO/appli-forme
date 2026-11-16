import { test } from 'node:test';
import assert from 'node:assert/strict';
import { addDays, diffDays, ageOn, mondayOf, isWeekend, shortDate, longDate } from '../js/lib/dates.js';
import { mifflin, initialTargets, minimumDay, currentSlot, slotTargets, SLOTS } from '../js/lib/nutrition.js';
import { trendSeries, weeklyRate, rateStatus, movingAverage7 } from '../js/lib/weight.js';
import { computeScore, recommend } from '../js/lib/score.js';
import { computeStreak, regularity } from '../js/lib/streak.js';
import { nextTarget, adjustForReadiness, volumeByMuscle, volumeDelta, deloadAdvice } from '../js/lib/training.js';
import { EXERCISES, SESSIONS, exerciseById } from '../js/data/exercises.js';
import { estimateTDEE, weeklyTarget, diagnose } from '../js/lib/adaptive.js';

test('dates', () => {
  assert.equal(addDays('2026-03-28', 2), '2026-03-30'); // passage à l'heure d'été
  assert.equal(diffDays('2026-12-31', '2027-01-02'), 2);
  assert.equal(ageOn('2002-12-09', '2026-11-16'), 23);
  assert.equal(ageOn('2002-12-09', '2026-12-09'), 24);
  assert.equal(mondayOf('2026-11-22'), '2026-11-16'); // dimanche → lundi
  assert.ok(isWeekend('2026-11-21') && !isWeekend('2026-11-20'));
  assert.equal(shortDate('2026-11-16'), '16 nov.');
  assert.equal(longDate('2026-11-01'), 'Dimanche 1er novembre');
});

test('Mifflin-St Jeor et objectifs de départ', () => {
  assert.equal(mifflin({ sex: 'H', weightKg: 58, heightCm: 184, age: 23 }), 1620);
  const t = initialTargets({ sex: 'H', weightKg: 58, heightCm: 184, age: 23, activity: 'modere' });
  assert.equal(t.maintenance, 2510);
  assert.equal(t.surplus, 380); // 15 % de 2511
  assert.equal(t.kcal, 2890);
  assert.equal(t.protein, 116);
  const s = initialTargets({ sex: 'H', weightKg: 50, heightCm: 160, age: 60, activity: 'sedentaire' });
  assert.equal(s.surplus, 300); // borne basse
});

test('répartition par créneau', () => {
  const shares = SLOTS.reduce((t, s) => t + s.share, 0);
  const pshares = SLOTS.reduce((t, s) => t + s.pshare, 0);
  assert.ok(Math.abs(shares - 1) < 1e-9 && Math.abs(pshares - 1) < 1e-9);
  assert.ok(slotTargets({ kcal: 2890, protein: 116 }, 'coucher').protein >= 30); // 30-40 g au coucher
});

test('journée minimale et créneau courant', () => {
  const e = ['petitdej', 'midi', 'diner', 'c16'].map((slot) => ({ slot }));
  assert.equal(minimumDay(e, true).met, true);
  assert.equal(minimumDay(e, false).met, false);
  assert.equal(minimumDay(e.slice(0, 3), true).met, false);
  assert.equal(currentSlot(16 * 60 + 10, new Set(['petitdej', 'c10', 'midi'])), 'c16');
  assert.equal(currentSlot(16 * 60 + 10, new Set(['petitdej', 'c10', 'midi', 'c16'])), 'diner');
  assert.equal(currentSlot(5 * 60), 'petitdej');
});

test('tendance de poids et rythme', () => {
  const entries = [];
  for (let i = 0; i < 21; i++) entries.push({ date: addDays('2026-11-01', i), kg: 58 + i * 0.04 + (i % 2 ? 0.3 : -0.3) });
  const t = trendSeries(entries);
  assert.equal(t.length, 21);
  assert.ok(t[20].trend > 58 && t[20].trend < 59);
  const r = weeklyRate(entries, '2026-11-21');
  assert.ok(r.ok);
  assert.ok(Math.abs(r.rate - 0.28) < 0.08, `rythme ${r.rate}`); // bruit ±0,3 kg : 14 j donnent une estimation approximative
  assert.equal(rateStatus(0.05, 58).id, 'lent');
  assert.equal(rateStatus(0.2, 58).id, 'cible');
  assert.equal(rateStatus(0.6, 58).id, 'trop_rapide');
  assert.equal(weeklyRate(entries.slice(0, 3), '2026-11-03').ok, false);
  assert.ok(Math.abs(movingAverage7(entries, '2026-11-07') - (58 + 0.12 - 0.3 / 7)) < 0.01);
});

test('score du jour et recommandation', () => {
  assert.equal(computeScore({ sleep: 5, energy: 5, soreness: 1, stress: 1, motivation: 5 }), 100);
  assert.equal(computeScore({ sleep: 1, energy: 1, soreness: 5, stress: 5, motivation: 1 }), 0);
  assert.equal(computeScore({ sleep: 3, energy: 3, soreness: 3, stress: 3, motivation: 3 }), 50);
  assert.equal(computeScore({ energy: 5, soreness: 1, stress: 1, motivation: 5 }), 100); // nuit absente → renormalisé
  assert.equal(computeScore({}), null);
  assert.equal(recommend(80, { weekend: true }).level, 'complete');
  assert.equal(recommend(80, { weekend: true, sleep: 1 }).level, 'allegee'); // garde-fou nuit blanche
  assert.equal(recommend(55, { weekend: true }).level, 'allegee');
  assert.equal(recommend(40, { weekend: true }).level, 'mobilite');
  assert.equal(recommend(20, { weekend: true }).level, 'repos');
  assert.equal(recommend(70, { weekend: false }).level, 'mini');
  assert.equal(recommend(50, { weekend: false }).level, 'mobilite');
});

test('séries tolérantes', () => {
  const met = new Set(['2026-11-10', '2026-11-11', '2026-11-13', '2026-11-14', '2026-11-15']);
  // 12 manqué isolé → pardonné ; aujourd'hui (16) pas encore atteint → ne casse rien
  assert.deepEqual(computeStreak(met, '2026-11-16', '2026-11-01'), { streak: 5, forgiven: 1 });
  met.delete('2026-11-15'); met.delete('2026-11-14'); // 2 jours manqués d'affilée → série terminée
  assert.equal(computeStreak(met, '2026-11-16', '2026-11-01').streak, 0);
  assert.deepEqual(regularity(new Set(['2026-11-14', '2026-11-15']), '2026-11-16', 30, '2026-11-14'), { count: 2, days: 2 });
});

test('progression par exercice', () => {
  const ex = exerciseById('pompes'); // niveau 1 : 8-15
  assert.equal(nextTarget(ex, [], 1).decision, 'debut');
  const s = (reps, rir = 2) => reps.map((r) => ({ reps: r, rir }));
  assert.equal(nextTarget(ex, [{ level: 1, sets: s([15, 15, 15]) }], 1).decision, 'monter');
  assert.equal(nextTarget(ex, [{ level: 1, sets: s([15, 15, 15]) }], 1).level, 2);
  const c = nextTarget(ex, [{ level: 1, sets: s([12, 11, 10]) }], 1);
  assert.equal(c.decision, 'continuer'); assert.equal(c.targetReps, 13);
  assert.equal(nextTarget(ex, [{ level: 1, sets: s([10, 10, 10], 5) }], 1).decision, 'plus_pres');
  const stag = [{ level: 1, sets: s([12, 11, 10]) }, { level: 1, sets: s([12, 10, 10]) }, { level: 1, sets: s([11, 11, 10]) }];
  assert.equal(nextTarget(ex, stag, 1).decision, 'varier');
  // baisse après une mauvaise nuit : pas de « stagnation », on maintient
  const tired = [{ level: 1, sets: s([12, 11, 10]) }, { level: 1, sets: s([10, 9, 8]), fatigued: true }];
  assert.equal(nextTarget(ex, tired, 1).decision, 'maintenir');
  assert.equal(nextTarget(ex, [...stag.slice(0, 2), { ...stag[2], fatigued: true }], 1).decision !== 'varier', true);
  const down = nextTarget(ex, [{ level: 3, sets: s([4, 3, 3], 0) }], 3); // pompes : 6-15
  assert.equal(down.decision, 'descendre'); assert.equal(down.level, 2);
  const last = nextTarget(ex, [{ level: 6, sets: s([10, 10]) }], 6);
  assert.equal(last.decision, 'varier'); // dernier niveau
});

test('séance allégée et volume', () => {
  const light = adjustForReadiness(SESSIONS.A.blocks, 'allegee');
  assert.deepEqual(light.map((b) => b.sets), [2, 2, 2, 2, 2, 1, 1]);
  const wk = [SESSIONS.A, SESSIONS.B, SESSIONS.M].map((se) => ({ exercises: se.blocks.map((b) => ({ ex: b.ex, sets: Array(b.sets).fill({ reps: 10 }) })) }));
  const v = volumeByMuscle(wk, exerciseById);
  for (const m of ['pecs', 'dos', 'epaules', 'quadriceps', 'ischios']) assert.ok(v[m] >= 8 && v[m] <= 12, `${m} = ${v[m]}`);
  assert.equal(volumeDelta({ pump: 2, soreness: 1, pain: true }, 'hausse', 10).delta, -2);
  assert.equal(volumeDelta({ pump: 1, soreness: 1, pain: false }, 'hausse', 10).delta, 1);
  assert.equal(volumeDelta({ pump: 3, soreness: 3, pain: false }, 'stable', 10).delta, -1);
  assert.equal(deloadAdvice({ scores: [40, 45, 30, 48, 70, 72, 60] }).needed, true);
  assert.equal(deloadAdvice({ weeksSinceDeload: 9 }).suggest, true);
});

test('dépense adaptative : cas simple exact', () => {
  // Mange 3000 kcal, prend 0,3 kg/sem → dépense = 3000 − 0,3×7700/7 = 2670
  const days = [], weights = [];
  for (let i = 0; i < 21; i++) {
    const date = addDays('2026-11-01', i);
    days.push({ date, kcal: 3000, complete: true });
    weights.push({ date, kg: 58 + (0.3 / 7) * i });
  }
  const e = estimateTDEE({ days, weights, prior: 2500, endDate: '2026-11-21', window: 21 });
  assert.equal(e.observed, 2670);
  assert.equal(e.confidence, 'bonne');
  assert.equal(e.tdee, 2670);
  // Peu de données → reste près de la formule
  const few = estimateTDEE({ days: days.slice(-5), weights: weights.slice(-5), prior: 2500, endDate: '2026-11-21' });
  assert.equal(few.tdee, 2500); assert.equal(few.confidence, 'aucune');
  const wt = weeklyTarget({ tdee: 3100, currentTarget: 2700 });
  assert.equal(wt.change, 250); // pas limité
  assert.equal(weeklyTarget({ tdee: 2600, currentTarget: 2920 }).change, 0); // zone morte : écart < 60 kcal
});

test('diagnostic de stagnation', () => {
  assert.equal(diagnose({ rate: 0.2 }).status, 'ok');
  assert.equal(diagnose({ rate: 0.6 }).cause, 'surplus');
  assert.equal(diagnose({ rate: 0.05, missingDays: 6 }).cause, 'saisie');
  assert.equal(diagnose({ rate: 0.05, adherence: 0.88 }).cause, 'apport');
  assert.equal(diagnose({ rate: 0.05, adherence: 0.95 }).cause, 'depense'); // 95 % = bruit de saisie, pas un déficit
  assert.equal(diagnose({ rate: 0.05, adherence: 1, sleepAvg: 2 }).cause, 'sommeil');
  assert.equal(diagnose({ rate: 0.05, adherence: 1, sleepAvg: 4, sessionsDone: 1, sessionsPlanned: 4 }).cause, 'seances');
  assert.equal(diagnose({ rate: 0.05, adherence: 1, sleepAvg: 4 }).cause, 'depense');
});

test('chaque exercice a des niveaux cohérents', () => {
  for (const ex of EXERCISES) {
    assert.ok(ex.levels.length >= 2, ex.id);
    for (const l of ex.levels) assert.ok(l.min < l.max && l.cues, `${ex.id} ${l.name}`);
  }
  for (const se of Object.values(SESSIONS)) for (const b of se.blocks) assert.ok(exerciseById(b.ex), b.ex);
});
