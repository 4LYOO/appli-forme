// Simulation sur 8 semaines avec données fictives : dépense adaptative, diagnostic de stagnation,
// score du jour et progression. Usage : node tools/simulate.mjs [--write]  (--write met à jour docs/SIMULATIONS.md)
import { writeFileSync } from 'node:fs';
import { addDays, isWeekend } from '../js/lib/dates.js';
import { initialTargets, KCAL_PER_KG } from '../js/lib/nutrition.js';
import { weeklyRate, trendSeries } from '../js/lib/weight.js';
import { estimateTDEE, weeklyTarget, diagnose } from '../js/lib/adaptive.js';
import { computeScore, recommend } from '../js/lib/score.js';
import { nextTarget } from '../js/lib/training.js';
import { exerciseById } from '../js/data/exercises.js';

// Générateur pseudo-aléatoire reproductible
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
function gauss(r) { let u = 0, v = 0; while (!u) u = r(); while (!v) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

const START = '2026-11-16';
const base = initialTargets({ sex: 'H', weightKg: 58, heightCm: 184, age: 23, activity: 'modere' });

function runNutrition({ name, trueTDEE = 3000, adherence = () => 1, logFactor = 1, pComplete = 1, pWeigh = 1, sleepBad = () => false, seed = 1 }) {
  const r = rng(seed);
  let w = 58, target = base.kcal, prior = base.maintenance, calibrated = false;
  const days = [], weights = [], rows = [];
  for (let i = 0; i < 56; i++) {
    const date = addDays(START, i);
    // l'utilisateur mange jusqu'à ce que sa SAISIE atteigne l'objectif × adhérence (s'il sous-déclare, il mange donc plus)
    const real = (target * adherence(i)) / logFactor + gauss(r) * 250;
    // la prise de poids réelle suit le bilan énergétique
    w += (real - trueTDEE) / KCAL_PER_KG;
    const complete = r() < pComplete;
    days.push({ date, kcal: Math.round(real * logFactor), complete, sleep: sleepBad(i) ? 2 : 4 });
    if (r() < pWeigh) weights.push({ date, kg: Math.round((w + gauss(r) * 0.35) * 10) / 10 });
    if ((i + 1) % 7 === 0) {
      const week = (i + 1) / 7;
      const est = estimateTDEE({ days, weights, prior, endDate: date, chained: calibrated });
      if (est.weight > 0) { prior = est.tdee; calibrated = true; }
      const rate = weeklyRate(weights, date, 14);
      const last14 = days.slice(-14);
      const done = last14.filter((d) => d.complete);
      const adh = done.length ? done.reduce((t, d) => t + d.kcal, 0) / done.length / target : null;
      const diag = week >= 2 ? diagnose({ rate: rate.ok ? rate.rate : null, weightKg: w, adherence: adh, missingDays: 14 - done.length, sleepAvg: last14.reduce((t, d) => t + d.sleep, 0) / 14 }) : null;
      let change = 0;
      if (week >= 2 && est.weight >= 0.4) { const wt = weeklyTarget({ tdee: est.tdee, currentTarget: target, confidence: est.confidence }); change = wt.change; target = wt.target; }
      rows.push({ week, trueW: w, trend: trendSeries(weights).at(-1)?.trend, rate: rate.ok ? rate.rate : null, est, target, change, diag });
    }
  }
  return { name, trueTDEE, rows, logFactor };
}

const scenarios = [
  runNutrition({ name: '1. Régulier (dépense réelle 3 000 kcal)', seed: 11 }),
  runNutrition({ name: '2. Dépense sous-estimée (réelle 3 300 kcal) → stagnation', trueTDEE: 3300, seed: 12 }),
  runNutrition({ name: '3. Apports insuffisants (mange 85 % de l\'objectif)', adherence: () => 0.85, seed: 13 }),
  runNutrition({ name: '4. Jours non saisis (35 % de jours incomplets, 4 pesées/sem)', pComplete: 0.65, pWeigh: 0.57, seed: 14 }),
  runNutrition({ name: '5. Sous-déclaration constante (note 85 % de ce qu\'il mange)', logFactor: 0.85, seed: 15 }),
  runNutrition({ name: '6 bis. Sans balance : une pesée par semaine (pharmacie)', pWeigh: 1 / 7, seed: 17 }),
  runNutrition({ name: '6. Mauvais sommeil semaines 4-5 (et mange 90 %)', trueTDEE: 3000, sleepBad: (i) => i >= 21 && i < 35, adherence: (i) => (i >= 21 && i < 35 ? 0.9 : 1), seed: 16 }),
];

const f = (x, d = 0) => (x == null ? '–' : x.toFixed(d).replace('.', ','));
let md = `# Simulations sur 8 semaines (données fictives)\n\nGénéré par \`node tools/simulate.mjs --write\`. Point de départ commun : 58 kg, objectif initial ${base.kcal} kcal (maintenance estimée par la formule : ${base.maintenance} kcal). Le poids « mesuré » = poids réel + bruit quotidien de ±0,35 kg (eau, digestion). Apports quotidiens bruités de ±250 kcal.\n\nColonnes : **dépense estimée** par l'appli (confiance), **objectif** de la semaine suivante (variation), **rythme** mesuré sur 14 jours, **diagnostic** de stagnation.\n\n`;
for (const s of scenarios) {
  md += `## ${s.name}\n\nDépense réelle simulée : ${s.trueTDEE}${s.logFactor !== 1 ? ` kcal (soit ${Math.round(s.trueTDEE * s.logFactor)} kcal « en unités saisies »)` : ' kcal'}.\n\n| Sem. | Poids réel | Tendance | Rythme 14 j | Dépense estimée | Objectif suivant | Diagnostic |\n|---|---|---|---|---|---|---|\n`;
  for (const r of s.rows) {
    const d = r.diag ? (r.diag.status === 'ok' ? 'OK' : r.diag.status === 'stagnation' ? `Stagnation → ${r.diag.cause}` : r.diag.status === 'trop_rapide' ? 'Trop rapide' : '–') : '–';
    md += `| ${r.week} | ${f(r.trueW, 1)} | ${f(r.trend, 1)} | ${r.rate == null ? '–' : (r.rate > 0 ? '+' : '') + f(r.rate, 2)} | ${r.est.tdee} (${r.est.confidence}, ${r.est.nComplete} j, ${r.est.nWeigh} pesées) | ${r.target}${r.change ? ` (${r.change > 0 ? '+' : ''}${r.change})` : ''} | ${d} |\n`;
  }
  const last = s.rows.at(-1);
  const firstDiag = s.rows.find((r) => r.diag && r.diag.status === 'stagnation');
  md += `\n${firstDiag ? `Action proposée (semaine ${firstDiag.week}) : « ${firstDiag.diag.action} »\n\n` : ''}Bilan : ${f(last.trueW - 58, 1)} kg en 8 semaines ; dépense estimée finale ${last.est.tdee} kcal pour ${Math.round(s.trueTDEE * s.logFactor)} réels (écart ${f(((last.est.tdee - s.trueTDEE * s.logFactor) / (s.trueTDEE * s.logFactor)) * 100, 1)} %).\n\n`;
}

// ---------- Score du jour ----------
md += `## 7. Score du jour sur 8 semaines (nuits mauvaises en semaines 4-5)\n\n| Sem. | Score moyen | Week-end : recommandations | Semaine : recommandations |\n|---|---|---|---|\n`;
{
  const r = rng(21);
  for (let wk = 0; wk < 8; wk++) {
    const bad = wk === 3 || wk === 4;
    const scores = []; const we = {}; const wd = {};
    for (let d = 0; d < 7; d++) {
      const date = addDays(START, wk * 7 + d);
      const jitter = () => Math.round(gauss(r) * 0.7);
      const clamp = (x) => Math.min(5, Math.max(1, x));
      const a = bad ? { sleep: clamp(2 + jitter()), energy: clamp(2 + jitter()), soreness: clamp(3 + jitter()), stress: clamp(3 + jitter()), motivation: clamp(3 + jitter()) }
        : { sleep: clamp(4 + jitter()), energy: clamp(4 + jitter()), soreness: clamp(2 + jitter()), stress: clamp(2 + jitter()), motivation: clamp(4 + jitter()) };
      const s = computeScore(a); scores.push(s);
      const rec = recommend(s, { weekend: isWeekend(date), sleep: a.sleep });
      const bucket = isWeekend(date) ? we : wd;
      bucket[rec.short] = (bucket[rec.short] || 0) + 1;
    }
    const fmtB = (b) => Object.entries(b).map(([k, v]) => `${k} ×${v}`).join(', ');
    md += `| ${wk + 1}${bad ? ' (mauvais sommeil)' : ''} | ${Math.round(scores.reduce((t, x) => t + x, 0) / 7)} | ${fmtB(we)} | ${fmtB(wd)} |\n`;
  }
}

// ---------- Progression ----------
md += `\n## 8. Progression des pompes sur 16 séances de week-end\n\nModèle : capacité maximale qui progresse d'environ 0,7 répétition par séance, −15 % pendant les semaines de mauvais sommeil (séances 7 à 10) ; l'utilisateur s'arrête à 1-2 répétitions en réserve, fatigue de −1 répétition par série. Une stagnation est ajoutée sur les séances 12 à 14.\n\n| Séance | Niveau | Répétitions (4 séries) | Décision pour la suivante |\n|---|---|---|---|\n`;
{
  const ex = exerciseById('pompes');
  let level = 3, cap = 11; // « Pompes » : capacité ≈ 11 au départ
  const hist = [];
  for (let s = 1; s <= 16; s++) {
    const bad = s >= 7 && s <= 10;
    const stall = s >= 12 && s <= 14;
    const t = nextTarget(ex, hist, level);
    if (t.level !== level) { cap = t.level > level ? cap * 0.6 : cap / 0.6; level = t.level; }
    const eff = cap * (bad ? 0.85 : 1);
    const sets = [0, 1, 2, 3].map((k) => ({ reps: Math.max(1, Math.min(t.targetReps + 1, Math.round(eff - 1.5 - k))), rir: 2 }));
    hist.push({ level, sets, fatigued: bad });
    const nt = nextTarget(ex, hist, level);
    md += `| ${s}${bad ? ' (sommeil)' : ''}${stall ? ' (plateau)' : ''} | ${level + 1}. ${ex.levels[level].name} | ${sets.map((x) => x.reps).join(' · ')} | ${nt.decision} : ${nt.message} |\n`;
    if (!stall) cap += 0.7;
  }
}
md += `\nLecture : la montée de niveau ne se déclenche que quand les 4 séries atteignent le haut de la fourchette ; pendant le mauvais sommeil la cible reste stable (pas de montée forcée) ; un plateau de 3 séances déclenche « varier » (tempo lent ou variante).\n`;

if (process.argv.includes('--write')) { writeFileSync(new URL('../docs/SIMULATIONS.md', import.meta.url), md); console.log('docs/SIMULATIONS.md écrit'); }
else console.log(md);
