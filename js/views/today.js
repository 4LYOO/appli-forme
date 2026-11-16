// Écran « Aujourd'hui » : questionnaire du matin, score, objectifs du jour, prochain repas, journée minimale.
import * as db from '../db.js';
import { h, mount, why, fmt, chips, progressBar, toast } from '../ui.js';
import { todayISO, longDate, isWeekend, addDays, nowMinutes, weekday } from '../lib/dates.js';
import { QUESTIONS, computeScore, recommend } from '../lib/score.js';
import { SLOTS, slotById, slotTargets, currentSlot } from '../lib/nutrition.js';
import { computeStreak, regularity } from '../lib/streak.js';
import { getDay, effectiveTargets, metDates, habitsForSlot, getProfile, DEFAULT_INTENTIONS } from '../state.js';
import { go, refresh } from '../main.js';
import { repeatMeal } from './meals.js';

export async function render(root, params) {
  const date = todayISO();
  const [day, targets, profile] = await Promise.all([getDay(date), effectiveTargets(), getProfile()]);
  const checkin = day.day.checkin;
  const editing = params.focus === 'questionnaire' && params.edit === '1';

  mount(root, h('div.page-head', h('div', h('h1', 'Aujourd\'hui'), h('div.sub', longDate(date)))));

  if (!checkin || editing) mount(root, await questionnaire(date, checkin, day.weight));
  else mount(root, await scoreCard(date, checkin));

  mount(root, objectives(day, targets));
  mount(root, await nextMeal(day, targets));
  mount(root, await minimumCard(day, date));
  mount(root, intentionCard(day));
  mount(root, tipCard(day, targets, profile));
}

// ---------- Questionnaire du matin ----------
async function questionnaire(date, prev, weight) {
  const ans = { ...(prev || {}) };
  let kg = weight?.kg ?? null;
  const submit = h('button.btn.btn-primary', { onclick: save }, 'Valider');
  const check = () => { submit.disabled = QUESTIONS.filter((q) => q.id !== 'sleep').some((q) => ans[q.id] == null); };

  async function save() {
    const score = computeScore(ans);
    const yesterdayWk = (await db.byDate('workouts', addDays(date, -1))).some((w) => w.status === 'terminee');
    const rec = recommend(score, { weekend: isWeekend(date), sleep: ans.sleep ?? null, trainedYesterday: yesterdayWk });
    const ops = [['days', 'put', { ...(await db.get('days', date)), date, checkin: { ...pick(ans), score, level: rec.level, ts: Date.now() } }]];
    if (kg && kg > 25 && kg < 250) ops.push(['weights', 'put', { date, kg: Math.round(kg * 10) / 10, ts: Date.now() }]);
    try { await db.batch(ops); toast('Questionnaire enregistré'); go('aujourdhui', {}, { replace: true }); } catch {}
  }

  const card = h('div.card#questionnaire',
    h('div.card-head', h('h2', 'Questionnaire du matin'), why(['score', 'sommeil_muscle'])),
    QUESTIONS.map((q) => h('div.q-row',
      h('div.q-label', h('span', q.label), h('span.hint', `1 ${q.low} · 5 ${q.high}`)),
      chips([1, 2, 3, 4, 5], ans[q.id] ?? null, (v) => { ans[q.id] = v; check(); }, { cls: 'fill' }))),
    h('div.q-row', h('div.q-label', h('span', 'Poids (facultatif)'), h('span.hint', 'au réveil, après les toilettes')),
      h('input.input.input-big', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: '–', value: kg ?? '',
        oninput: (e) => { kg = parseFloat(e.target.value.replace(',', '.')) || null; } })),
    h('p.tiny.muted', 'La nuit sera importée automatiquement de ton journal de sommeil en phase 2 ; d\'ici là, un tap suffit.'),
    h('div', { style: { marginTop: '12px' } }, submit));
  check();
  return card;
}
const pick = (a) => Object.fromEntries(QUESTIONS.map((q) => [q.id, a[q.id] ?? null]));

// ---------- Score et recommandation ----------
async function scoreCard(date, c) {
  const yesterdayWk = (await db.byDate('workouts', addDays(date, -1))).some((w) => w.status === 'terminee');
  const rec = recommend(c.score, { weekend: isWeekend(date), sleep: c.sleep, trainedYesterday: yesterdayWk });
  const todayWk = (await db.byDate('workouts', date)).find((w) => w.status === 'terminee');
  const R = 40, C = 2 * Math.PI * R;
  const ring = h('div.score-ring', { html: `<svg viewBox="0 0 92 92" aria-hidden="true"><circle cx="46" cy="46" r="${R}" fill="none" stroke="#2a2a2c" stroke-width="8"/><circle cx="46" cy="46" r="${R}" fill="none" stroke="var(--accent)" stroke-width="8" stroke-linecap="round" stroke-dasharray="${(C * c.score) / 100} ${C}"/></svg>` },
    h('span.val', { 'aria-label': `Score ${c.score} sur 100` }, String(c.score)));
  const session = weekday(date) === 6 ? 'A' : weekday(date) === 0 ? 'B' : 'M';
  let action = null;
  if (todayWk) action = h('p.small.accent', '✓ Séance faite aujourd\'hui. Bravo.');
  else if (rec.level === 'complete' || rec.level === 'allegee' || rec.level === 'mini') {
    action = h('button.btn.btn-primary', { onclick: () => go('seance', { start: session, mode: rec.level }) },
      rec.level === 'mini' ? 'Faire la mini-séance (15-20 min)' : `Démarrer la séance ${session}${rec.level === 'allegee' ? ' allégée' : ''}`);
  } else if (rec.level === 'mobilite') action = h('button.btn', { onclick: () => go('seance', { start: 'mobilite' }) }, 'Lancer la routine mobilité');
  else action = h('p.small.muted', 'Repos : la récupération fait partie du programme. Mange bien, couche-toi à l\'heure.');

  return h('div.card',
    h('div.score-wrap', ring,
      h('div.grow',
        h('div.small.muted', 'Score du jour'),
        h('div.reco-label', rec.label),
        rec.reasons.length ? h('div.small.muted', rec.reasons.join(' · ')) : null)),
    h('div', { style: { marginTop: '14px' } }, action),
    h('div.row.between', { style: { marginTop: '6px' } },
      why(['score', 'autoregulation', 'sommeil_muscle']),
      h('button.why', { onclick: () => go('aujourdhui', { focus: 'questionnaire', edit: '1' }) }, 'Modifier mes réponses')));
}

// ---------- Objectifs ----------
function objectives(day, t) {
  const left = Math.max(0, t.kcal - day.totals.kcal), leftP = Math.max(0, t.protein - day.totals.p);
  const remaining = SLOTS.filter((s) => !day.meals.some((m) => m.slot === s.id));
  return h('div.card',
    h('div.card-head', h('h2', 'Objectifs du jour'), why(['surplus', 'proteines'])),
    progressBar(day.totals.kcal, t.kcal, { label: 'Calories', unit: ' kcal' }),
    progressBar(day.totals.p, t.protein, { label: 'Protéines', unit: ' g' }),
    h('p.small.muted', { style: { marginTop: '12px' } },
      left > 0 || leftP > 0 ? `Reste ${fmt.int(left)} kcal et ${fmt.int(leftP)} g de protéines` : 'Objectifs atteints 🎯',
      remaining.length ? ` · ${remaining.length} prise${remaining.length > 1 ? 's' : ''} à venir (${remaining.map((s) => s.short).join(', ')})` : ''));
}

// ---------- Prochain repas ----------
async function nextMeal(day, t) {
  const done = new Set(day.meals.map((m) => m.slot));
  const sid = currentSlot(nowMinutes(), done);
  if (!sid) return h('div');
  const s = slotById(sid), st = slotTargets(t, sid);
  const habits = await habitsForSlot(sid, 2);
  return h('div.card',
    h('div.card-head', h('div', h('div.small.muted', `Prochaine prise · ${s.time.replace(':', 'h')}`), h('h2', s.label)),
      h('div.slot-meta', `≈ ${fmt.int(st.kcal)} kcal · ${st.protein} g`)),
    habits.length ? h('div.stack-sm', habits.map((hb) => h('button.btn', { onclick: async () => { await repeatMeal(hb.last, day.date, sid); refresh(); } },
      `↻ ${hb.name}`, h('span.muted.small', ` ${fmt.int(hb.last.total.kcal)} kcal`)))) : h('p.small.muted', 'Tes repas habituels apparaîtront ici pour être ajoutés en un tap.'),
    h('div', { style: { marginTop: '10px' } }, h('button.btn.btn-primary', { onclick: () => go('repas', { slot: sid, add: '1' }) }, '+ Ajouter')),
    sid === 'coucher' ? h('div.row', { style: { marginTop: '6px' } }, h('span.small.muted.grow', 'Vise 30-40 g de protéines (fromage blanc, skyr).'), why('coucher')) : null);
}

// ---------- Journée minimale et série ----------
async function minimumCard(day, date) {
  const met = await metDates();
  if (day.minimum.met) met.add(date);
  const first = await db.kvGet('firstDay');
  const st = computeStreak(met, date, first);
  const reg = regularity(met, date, 30, first);
  return h('div.card',
    h('div.card-head', h('h2', 'Journée minimale'), h('span.slot-meta', `${day.minimum.count}/${day.minimum.total}`)),
    h('div.checklist', day.minimum.items.map((i) => h(`span.check${i.done ? '.done' : ''}`, h('span.box', i.done ? '✓' : ''), i.label))),
    h('div.row.between', { style: { marginTop: '14px' } },
      h('div.streak', h('span.mid', String(st.streak)), h('span.muted', st.streak > 1 ? 'jours de suite' : 'jour de suite')),
      h('div.small.muted', { style: { textAlign: 'right' } }, `Régularité : ${reg.count}/${reg.days || 0} j`, h('br'), st.forgiven ? `${st.forgiven} jour${st.forgiven > 1 ? 's' : ''} pardonné${st.forgiven > 1 ? 's' : ''}` : '')),
    h('div', why(['habitudes', 'journee_minimale'])));
}

// ---------- Intention de mise en œuvre ----------
function intentionCard(day) {
  const done = new Set(day.meals.map((m) => m.slot));
  const sid = currentSlot(nowMinutes(), done) || 'coucher';
  const list = DEFAULT_INTENTIONS;
  const it = list.find((i) => i.slot === sid) || list[0];
  return h('div.card', h('div.card-head', h('h2', 'Mon intention'), why('intentions')), h('p.intention', it.text));
}

// ---------- Un conseil ----------
function tipCard(day, t, profile) {
  const m = nowMinutes();
  let tip;
  if (m >= 18 * 60 && day.totals.p < t.protein * 0.6) tip = { text: `Il te manque ${fmt.int(t.protein - day.totals.p)} g de protéines : un grand fromage blanc ou skyr ce soir en apporte 30.`, src: 'coucher' };
  else if (m >= 15 * 60 && day.totals.kcal < t.kcal * 0.4) tip = { text: 'Journée en retard sur les calories : un smoothie lait-banane-avoine-beurre de cacahuète apporte ≈ 650 kcal sans te remplir.', src: 'liquides' };
  else {
    const rot = [
      { text: 'Pas besoin de peser : choisis « assiette normale » ou « repas normal », et sois régulier. L\'appli corrigera.', src: 'saisie_rapide' },
      { text: 'Ajoute une cuillère d\'huile d\'olive ou une poignée de fromage râpé à ton plat : +100 kcal sans plus de volume.', src: 'densite' },
      { text: 'Dernier café avant 14h : avec un coucher vers 22h30, la caféine de l\'après-midi raccourcit la nuit.', src: 'cafeine' },
      { text: 'Lève-toi à la même heure tous les jours, même le week-end : c\'est le pilier n° 1 contre l\'insomnie.', src: 'tcci' },
      { text: 'La créatine (3-5 g/j) est une option sûre et efficace, surtout en végétarien. Note la date si tu commences.', src: 'creatine' },
      { text: 'Œufs, laitages, soja et légumineuses + céréales : varie tes protéines pour couvrir tous les acides aminés.', src: 'vegetarien' },
      { text: 'Un bilan sanguin (B12, ferritine) une fois par an est utile en végétarien : demande-le à ton médecin.', src: 'b12fer' },
      { text: 'Mange à heure fixe, même sans faim : chez toi, la faim est un mauvais réveil.', src: 'heures_fixes' },
    ];
    tip = rot[Math.floor(Date.now() / 86400000) % rot.length];
  }
  return h('div.card', h('div.card-head', h('h2', 'Conseil'), why(tip.src)), h('p', tip.text));
}
