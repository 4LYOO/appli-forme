// Cap de poids : 65 kg d'abord, puis paliers suivants (+3 kg) pour continuer au-delà.
import { addDays } from './dates.js';

/** Palier en cours : le premier palier pas encore atteint (65, puis 68, 71…). */
export function currentGoal(goalKg, currentKg, step = 3) {
  let g = goalKg;
  while (currentKg >= g) g += step;
  return g;
}

/**
 * Avancement vers le palier.
 * rate : rythme mesuré (kg/sem) si fiable, sinon rythme visé. Jamais d'échéance si le rythme est ≤ 0.
 */
export function goalProgress({ startKg, currentKg, goalKg, rate = null, plannedRate = 0.3, today, step = 3 }) {
  const goal = currentGoal(goalKg, currentKg, step);
  const from = goal === goalKg ? startKg : goal - step;
  const span = Math.max(0.1, goal - from);
  const pct = Math.max(0, Math.min(1, (currentKg - from) / span));
  const remaining = Math.max(0, Math.round((goal - currentKg) * 10) / 10);
  const useRate = rate != null && rate > 0.05 ? rate : plannedRate;
  const weeks = useRate > 0 ? Math.ceil(remaining / useRate) : null;
  return {
    goal, from, pct, remaining, weeks, measured: rate != null && rate > 0.05,
    eta: weeks != null ? addDays(today, weeks * 7) : null,
    passed: goal > goalKg, // premier cap déjà atteint : on continue au-delà
    gained: Math.round((currentKg - startKg) * 10) / 10,
  };
}
