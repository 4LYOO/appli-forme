// Bilan de la semaine (dimanche) : tendance, dépense, moyennes, séances, sommeil, ajustements, UN conseil.
import { h, why, fmt, sheet } from '../ui.js';
import { icon } from '../icons.js';
import { shortDate, addDays, mondayOf, todayISO } from '../lib/dates.js';
import { fmtDuration } from '../lib/sleep.js';
import { reviewFor } from '../state.js';
import * as db from '../db.js';

export async function reviewSheet(date = todayISO()) {
  const { review: r } = await reviewFor(date);
  const t = await db.kvGet('targets');
  const st = await db.kvGet('adaptState');
  const kpi = (label, value, unit = '', sub = null) => h('div.kpi', h('div.label', label), h('div.value', value, unit ? h('span.unit', unit) : null), sub ? h('div.tiny.muted', sub) : null);
  sheet(`Bilan · ${shortDate(r.mon)} → ${shortDate(r.sun)}`, h('div.stack',
    h('div.card.hero', h('div.eyebrow', 'Le conseil de la semaine'), h('p', { style: { marginTop: '6px', fontSize: '17px' } }, r.priority.text), why(r.priority.src)),
    h('div.kpis',
      kpi('Poids (tendance)', r.weightNow != null ? fmt.kg(r.weightNow) : '–', 'kg', r.weightDelta != null ? `${fmt.signed(r.weightDelta, 2)} kg sur la semaine` : null),
      kpi('Rythme (14 j)', r.rate != null ? fmt.signed(r.rate, 2) : '–', 'kg/sem', 'cible +0,15 à +0,29'),
      kpi('Calories / jour', r.kcalAvg != null ? fmt.int(r.kcalAvg) : '–', 'kcal', `objectif actuel ${fmt.int(t?.kcal)} · ${r.completeDays}/7 j complets`),
      kpi('Protéines / jour', r.protAvg != null ? fmt.int(r.protAvg) : '–', 'g', `objectif ${fmt.int(t?.protein)}`),
      kpi('Séances', String(r.sessions), '', `${r.weekendSessions}/2 du week-end`),
      kpi('Sommeil moyen', r.sleepAvgMin != null ? fmtDuration(Math.round(r.sleepAvgMin)) : '–', '', r.nights ? `${r.nights} nuit${r.nights > 1 ? 's' : ''} importée${r.nights > 1 ? 's' : ''}` : 'aucune nuit importée'),
      kpi('Dépense estimée', st?.calibrated ? fmt.int(st.tdee) : '–', st?.calibrated ? 'kcal' : '', st?.calibrated ? 'calculée sur tes données' : 'après 2-3 semaines de saisie'),
      kpi('Score moyen', r.scoreAvg != null ? fmt.int(r.scoreAvg) : '–', '/100')),
    h('div.section-title', 'Ajustements de la semaine'),
    r.adjustments.length ? h('div.list', r.adjustments.map((a) => h('div.list-item', h('span.grow', h('strong', a.title), a.text ? h('div.small.muted', a.text) : null))))
      : h('p.small.muted', 'Aucun changement cette semaine.'),
    why(['bilan', 'habitudes'])), { full: true });
}

/** Faut-il proposer le bilan ? Dimanche à partir de 16h (semaine en cours) ou lundi (semaine passée). */
export function reviewDue(now = new Date()) {
  const d = now.getDay();
  if (d === 0 && now.getHours() >= 16) return todayISO();
  if (d === 1) return addDays(mondayOf(todayISO()), -1);
  return null;
}
export { icon };
