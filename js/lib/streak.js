// Séries tolérantes (Lally 2010 : un jour manqué ne compromet pas l'habitude ; la régularité compte).
import { addDays } from './dates.js';

/**
 * met : Set des dates où la journée minimale est atteinte.
 * Règles :
 *  - aujourd'hui compte s'il est atteint ; sinon il est « en cours » et ne casse rien ;
 *  - un jour manqué isolé est pardonné (il ne compte pas, mais ne remet pas à zéro) ;
 *  - deux jours manqués d'affilée terminent la série.
 * firstDay : premier jour d'utilisation (on ne remonte pas avant).
 */
export function computeStreak(met, today, firstDay) {
  let d = met.has(today) ? today : addDays(today, -1);
  let streak = 0, misses = 0, forgiven = 0;
  while (!firstDay || d >= firstDay) {
    if (met.has(d)) { streak++; misses = 0; }
    else {
      misses++;
      if (misses >= 2) break;
      // un trou n'est pardonné que s'il y a un jour réussi juste avant
      if (!met.has(addDays(d, -1))) break;
      forgiven++;
    }
    d = addDays(d, -1);
  }
  return { streak, forgiven };
}

/** Régularité : jours atteints sur les n derniers jours (aujourd'hui exclu s'il n'est pas encore atteint). */
export function regularity(met, today, n = 30, firstDay = null) {
  let count = 0, days = 0;
  const start = met.has(today) ? 0 : 1;
  for (let i = start; i < n + start; i++) {
    const d = addDays(today, -i);
    if (firstDay && d < firstDay) break;
    days++;
    if (met.has(d)) count++;
  }
  return { count, days };
}
