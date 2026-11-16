// Tendance de poids. Voir SPEC D3 et RECHERCHE.md §1.
import { diffDays, addDays } from './dates.js';

const byDate = (a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

/**
 * Moyenne mobile exponentielle (« Hacker's Diet »), α = 0,1 par jour.
 * Après un trou de g jours, α effectif = 1 − (1 − α)^g, pour rattraper sans à-coup.
 * Retourne [{date, kg, trend}] trié.
 */
export function trendSeries(entries, alpha = 0.1) {
  const s = [...entries].sort(byDate);
  const out = [];
  let trend = null, last = null;
  for (const e of s) {
    if (trend === null) trend = e.kg;
    else {
      const g = Math.max(1, diffDays(last, e.date));
      const a = 1 - Math.pow(1 - alpha, g);
      trend = trend + a * (e.kg - trend);
    }
    last = e.date;
    out.push({ date: e.date, kg: e.kg, trend });
  }
  return out;
}

/** Moyenne simple des pesées des 7 derniers jours (date incluse). */
export function movingAverage7(entries, date) {
  const from = addDays(date, -6);
  const w = entries.filter((e) => e.date >= from && e.date <= date);
  if (!w.length) return null;
  return w.reduce((t, e) => t + e.kg, 0) / w.length;
}

/** Régression linéaire simple : pente (kg/jour) et ordonnée. */
export function linreg(points) {
  const n = points.length;
  if (n < 2) return null;
  let sx = 0, sy = 0, sxx = 0, sxy = 0;
  for (const [x, y] of points) { sx += x; sy += y; sxx += x * x; sxy += x * y; }
  const den = n * sxx - sx * sx;
  if (den === 0) return null;
  const slope = (n * sxy - sx * sy) / den;
  return { slope, intercept: (sy - slope * sx) / n };
}

/**
 * Rythme de prise en kg/semaine sur une fenêtre (défaut 14 j), par régression sur les pesées brutes
 * (pas de retard, contrairement à la pente de la moyenne exponentielle).
 * ok = au moins 5 pesées couvrant au moins 7 jours.
 */
export function weeklyRate(entries, endDate, windowDays = 14) {
  const from = addDays(endDate, -(windowDays - 1));
  const w = entries.filter((e) => e.date >= from && e.date <= endDate);
  const span = w.length ? diffDays(w.reduce((m, e) => (e.date < m ? e.date : m), w[0].date), endDate) : 0;
  const reg = linreg(w.map((e) => [diffDays(from, e.date), e.kg]));
  const ok = w.length >= 5 && span >= 7 && !!reg;
  return { rate: reg ? reg.slope * 7 : null, n: w.length, windowDays, ok };
}

/** Classement du rythme par rapport à la cible (SPEC D2). */
export function rateStatus(rate, weightKg) {
  if (rate == null) return { id: 'inconnu', label: 'Pas encore assez de pesées' };
  const w = weightKg || 58;
  const lo = 0.0025 * w, hi = 0.005 * w, tooFast = 0.5; // 0,25-0,5 %/sem ; > 0,5 kg/sem = trop rapide
  if (rate < lo) return { id: 'lent', label: 'En dessous de la cible' };
  if (rate <= hi) return { id: 'cible', label: 'Dans la cible' };
  if (rate <= tooFast) return { id: 'rapide', label: 'Un peu rapide, toléré' };
  return { id: 'trop_rapide', label: 'Trop rapide' };
}
