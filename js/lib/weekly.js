// Moteur hebdomadaire (phase 2) : dépense réelle, nouvel objectif, diagnostic, bilan du dimanche.
// Fonctions pures, utilisées telles quelles par l'appli et par tools/simulate.mjs.
import { addDays, diffDays, mondayOf } from './dates.js';
import { isCompleteDay, sumMacros } from './nutrition.js';
import { weeklyRate, trendSeries } from './weight.js';
import { estimateTDEE, weeklyTarget, diagnose } from './adaptive.js';
import { deloadAdvice } from './training.js';

/** Apports par jour à partir des repas et des fiches jour : [{ date, kcal, p, complete, logged }] */
export function dailyIntake(meals, days, from, to) {
  const byDate = new Map();
  for (const m of meals) { if (m.date < from || m.date > to) continue; if (!byDate.has(m.date)) byDate.set(m.date, []); byDate.get(m.date).push(m); }
  const marked = new Map(days.map((d) => [d.date, !!d.complete]));
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) {
    const ms = byDate.get(d) || [];
    const t = sumMacros(ms.map((m) => m.total));
    out.push({ date: d, kcal: Math.round(t.kcal), p: Math.round(t.p), complete: ms.length > 0 && isCompleteDay(ms, marked.get(d)), logged: ms.length > 0 });
  }
  return out;
}

const pct = (x) => `${Math.round(x * 100)} %`;
const sign = (x, d = 2) => `${x > 0 ? '+' : x < 0 ? '−' : '±'}${Math.abs(x).toFixed(d).replace('.', ',')}`;

/**
 * Mise à jour hebdomadaire. À lancer au plus une fois tous les 7 jours, après 14 jours d'utilisation.
 * state : { tdee, calibrated, lastRun } (persisté par l'appli)
 * Retourne { due, est, target, change, diag, title, text, state }.
 */
export function runWeekly({ today, firstDay, intake, weights, sleep = [], targets, state = {}, goalKgWeek = 0.3 }) {
  if (!firstDay || diffDays(firstDay, today) < 14) return { due: false, reason: 'Moins de 14 jours de données.' };
  if (state.lastRun && diffDays(state.lastRun, today) < 7) return { due: false, reason: 'Déjà fait cette semaine.' };
  const end = addDays(today, -1); // on n'utilise que des journées terminées
  const prior = state.tdee ?? targets.maintenance;
  const est = estimateTDEE({ days: intake, weights, prior, endDate: end, chained: !!state.calibrated });
  const r = weeklyRate(weights, end, 14);
  const last14 = intake.filter((d) => d.date > addDays(end, -14) && d.date <= end);
  const done = last14.filter((d) => d.complete);
  const adherence = done.length ? done.reduce((t, d) => t + d.kcal, 0) / done.length / targets.kcal : null;
  const nights = sleep.filter((n) => n.date > addDays(end, -14) && n.date <= end && n.quality);
  const sleepAvg = nights.length >= 5 ? nights.reduce((t, n) => t + n.quality, 0) / nights.length : null;
  const w = trendSeries(weights).at(-1)?.trend ?? null;
  const diag = diagnose({ rate: r.ok ? r.rate : null, weightKg: w ?? 58, adherence, missingDays: 14 - done.length, sleepAvg });

  let target = targets.kcal, change = 0;
  if (est.weight >= 0.4) { const wt = weeklyTarget({ tdee: est.tdee, currentTarget: targets.kcal, goalKgWeek, confidence: est.confidence }); target = wt.target; change = wt.change; }
  const facts = [
    est.observed != null ? `dépense estimée ${est.tdee} kcal (confiance ${est.confidence}, ${est.nComplete} jours complets, ${est.nWeigh} pesées)` : `pas encore assez de données complètes (${est.nComplete} jours, ${est.nWeigh} pesées)`,
    r.ok ? `rythme ${sign(r.rate)} kg/sem sur 14 j` : 'rythme pas encore mesurable',
    adherence != null ? `apports à ${pct(adherence)} de l'objectif` : null,
  ].filter(Boolean);
  const title = change ? `${change > 0 ? '+' : '−'}${Math.abs(change)} kcal : nouvel objectif ${target} kcal` : `Objectif maintenu à ${target} kcal`;
  return {
    due: true, est, rate: r, adherence, sleepAvg, diag, target, change, title,
    text: `${facts.join(' ; ')}.${diag.action ? ` Action : ${diag.action}` : ''}`,
    state: { tdee: est.weight > 0 ? est.tdee : prior, calibrated: state.calibrated || est.weight > 0, lastRun: today },
  };
}

/**
 * Bilan de la semaine (lundi → dimanche contenant `date`).
 */
export function weekReview({ date, intake, weights, sleep = [], workouts = [], adjustments = [], targets, checkins = [] }) {
  const mon = mondayOf(date), sun = addDays(mon, 6);
  const inWeek = (x) => x.date >= mon && x.date <= sun;
  const days = intake.filter(inWeek);
  const complete = days.filter((d) => d.complete);
  const avg = (arr, k) => (arr.length ? arr.reduce((t, x) => t + x[k], 0) / arr.length : null);
  const r = weeklyRate(weights, sun > date ? date : sun, 14);
  const trend = trendSeries(weights.filter((x) => x.date <= sun));
  const startTrend = trendSeries(weights.filter((x) => x.date < mon)).at(-1)?.trend ?? trend[0]?.trend ?? null;
  const nights = sleep.filter(inWeek);
  const sessions = workouts.filter((w) => inWeek(w) && w.status === 'terminee');
  const weekend = sessions.filter((w) => w.session === 'A' || w.session === 'B').length;
  const scores = checkins.filter(inWeek).map((c) => c.score);
  const res = {
    mon, sun,
    loggedDays: days.filter((d) => d.logged).length, completeDays: complete.length,
    kcalAvg: avg(complete, 'kcal'), protAvg: avg(complete, 'p'),
    weightNow: trend.at(-1)?.trend ?? null, weightDelta: trend.length && startTrend != null ? trend.at(-1).trend - startTrend : null,
    rate: r.ok ? r.rate : null,
    sleepAvgMin: nights.length ? avg(nights.filter((n) => n.tst != null), 'tst') : null, sleepQuality: nights.length ? avg(nights.filter((n) => n.quality), 'quality') : null, nights: nights.length,
    sessions: sessions.length, weekendSessions: weekend,
    adjustments: adjustments.filter(inWeek),
    scoreAvg: scores.length ? scores.reduce((t, x) => t + x, 0) / scores.length : null,
  };
  res.priority = priorityAdvice(res, targets, nights);
  return res;
}

/** UN seul conseil prioritaire, dans l'ordre de ce qui compte le plus pour la prise de masse. */
export function priorityAdvice(r, targets, nights = []) {
  if (r.completeDays < 4) return { text: `Seulement ${r.completeDays} jour${r.completeDays > 1 ? 's' : ''} complet${r.completeDays > 1 ? 's' : ''} cette semaine. Priorité : noter les 3 repas chaque jour, même en estimation rapide.`, src: 'saisie_rapide' };
  if (r.kcalAvg != null && r.kcalAvg < targets.kcal * 0.93) return { text: `Tu es à ${Math.round((r.kcalAvg / targets.kcal) * 100)} % de l'objectif calorique. Ajoute une collation liquide et dense chaque jour (smoothie, lait chocolaté) plutôt que de grossir les repas.`, src: 'liquides' };
  if (r.protAvg != null && r.protAvg < targets.protein * 0.85) return { text: `Protéines à ${Math.round(r.protAvg)} g/j pour ${targets.protein} visés : un skyr ou fromage blanc le soir règle l'essentiel.`, src: 'coucher' };
  if (r.weekendSessions < 2) return { text: `${r.weekendSessions}/2 séances du week-end faites. Elles portent l'essentiel du volume : bloque le créneau samedi et dimanche.`, src: 'volume' };
  const waketimes = nights.map((n) => n.finalWake).filter((x) => x != null);
  if (waketimes.length >= 4 && Math.max(...waketimes) - Math.min(...waketimes) > 90) return { text: 'Ton heure de réveil a varié de plus de 1 h 30 cette semaine. Une heure de lever fixe, même le week-end, est le levier n° 1 du sommeil.', src: 'tcci' };
  if (r.sleepQuality != null && r.sleepQuality < 2.8) return { text: 'Semaine de sommeil difficile : garde le lit pour dormir, lève-toi si tu ne dors pas au bout de 20 min, et coupe la caféine avant 14h.', src: 'tcci' };
  return { text: 'Semaine solide. Continue exactement pareil : la régularité fait le résultat.', src: 'habitudes' };
}

/**
 * Composition (mensurations mensuelles) : distingue grossièrement prise de muscle et prise de gras.
 * measures : [{ date, arm, chest, waist, thigh }] (cm). Compare la plus ancienne et la plus récente sur ≥ 4 semaines.
 */
export function compositionSignal(measures) {
  const m = [...measures].filter((x) => x.waist).sort((a, b) => (a.date < b.date ? -1 : 1));
  if (m.length < 2) return { status: 'inconnu', text: 'Il faut au moins 2 séries de mensurations (une par mois).' };
  const a = m[0], b = m.at(-1);
  if (diffDays(a.date, b.date) < 28) return { status: 'inconnu', text: 'Attends au moins 4 semaines entre deux mesures.' };
  const d = (k) => (a[k] != null && b[k] != null ? b[k] - a[k] : null);
  const waist = d('waist'), limbs = [d('arm'), d('chest'), d('thigh')].filter((x) => x != null);
  const limbAvg = limbs.length ? limbs.reduce((t, x) => t + x, 0) / limbs.length : 0;
  const f = (x) => `${x > 0 ? '+' : ''}${x.toFixed(1).replace('.', ',')} cm`;
  if (waist >= 2 && limbAvg < waist / 2) return { status: 'gras', waist, limbAvg, goal: 0.2, text: `Tour de taille ${f(waist)} contre ${f(limbAvg)} en moyenne pour bras, torse et cuisses : la prise est plutôt grasse. Rythme visé abaissé à +0,2 kg/sem.` };
  if (limbAvg > 0.5 && waist < 1.5) return { status: 'muscle', waist, limbAvg, text: `Bras, torse et cuisses ${f(limbAvg)} en moyenne pour un tour de taille ${f(waist)} : la prise est de bonne qualité.` };
  return { status: 'neutre', waist, limbAvg, text: `Tour de taille ${f(waist)}, autres mesures ${f(limbAvg)} en moyenne : rien d'inquiétant.` };
}
