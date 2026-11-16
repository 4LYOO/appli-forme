// Écran « Aujourd'hui » : UNE action principale, les deux anneaux du jour, la journée en une ligne, le score.
import * as db from '../db.js';
import { h, mount, why, fmt, chips, toast, sheet, showWhy } from '../ui.js';
import { icon } from '../icons.js';
import { todayISO, longDate, isWeekend, addDays, nowMinutes, weekday } from '../lib/dates.js';
import { QUESTIONS, computeScore, recommend } from '../lib/score.js';
import { SLOTS, slotById, slotTargets, currentSlot } from '../lib/nutrition.js';
import { computeStreak, regularity } from '../lib/streak.js';
import { fmtDuration } from '../lib/sleep.js';
import { getDay, effectiveTargets, metDates, habitsForSlot, getNight, DEFAULT_INTENTIONS, maybeRunWeekly, undoWeekly } from '../state.js';
import { reviewSheet, reviewDue } from './review.js';
import { go, refresh } from '../main.js';
import { repeatMeal, openAdd } from './meals.js';
import { sleepImportSheet } from './more.js';

const IMPRESSIONS = ['', 'très mauvaise', 'mauvaise', 'moyenne', 'bonne', 'très bonne'];

export async function render(root, params) {
  const date = todayISO();
  await maybeRunWeekly().catch((e) => console.error('hebdo', e));
  const [day, t, night] = await Promise.all([getDay(date), effectiveTargets(), getNight(date)]);
  const checkin = day.day.checkin;
  const met = await metDates();
  if (day.minimum.met) met.add(date);
  const first = await db.kvGet('firstDay');
  const st = computeStreak(met, date, first);

  mount(root,
    h('div.page-head',
      h('div', h('h1', 'Aujourd\'hui'), h('div.sub', longDate(date))),
      h('button.pill-chip', { onclick: () => showWhy(['habitudes', 'journee_minimale']), 'aria-label': `Série : ${st.streak} jours` }, icon('flame'), String(st.streak))),
    await welcome(),
    await weeklyCard(),
    reviewCard(),
    await hero(day, t, checkin, night, date),
    rings(day, t),
    dayCard(day, checkin, st, met, date, first),
    checkin ? await scoreRow(date, checkin, night) : null,
    tip(day, t));

  if (params.focus === 'questionnaire') setTimeout(() => checkinSheet(date, checkin, day.weight, night), 50);
}

// ---------- Première ouverture : 3 lignes pour s'orienter ----------
async function welcome() {
  if (await db.kvGet('tourDone')) return null;
  const card = h('div.card',
    h('div.card-head', h('h2', 'Comment ça marche'), h('button.why', { onclick: async () => { await db.kvSet('tourDone', true).catch(() => {}); card.remove(); } }, 'Compris')),
    h('div.stack-sm.small',
      h('p', h('strong', '1. Le matin : '), 'le check-in (20 s) donne ton score et la séance du jour.'),
      h('p', h('strong', '2. À chaque prise : '), 'une photo ou un tap. Le bouton du haut te montre toujours la prochaine.'),
      h('p', h('strong', '3. Le week-end : '), 'les deux séances, dans l\'onglet Séance.')));
  return card;
}

// ---------- Ajustement automatique de la semaine ----------
async function weeklyCard() {
  const lw = await db.kvGet('lastWeekly');
  if (!lw || lw.seen) return null;
  const seen = async () => { await db.kvSet('lastWeekly', { ...lw, seen: true }).catch(() => {}); refresh(); };
  return h('div.card.accent-border',
    h('div.eyebrow.small.accent', 'Ajustement de la semaine'),
    h('div', { style: { fontWeight: 700, fontSize: '19px', marginTop: '4px' } }, lw.title),
    h('p.small.muted', { style: { marginTop: '6px' } }, lw.text),
    h('div.row', { style: { marginTop: '10px' } },
      h('button.btn.btn-sm.btn-primary', { onclick: seen }, 'Compris'),
      lw.change ? h('button.btn.btn-sm', { onclick: async () => { await undoWeekly().catch(() => {}); toast('Ajustement annulé'); refresh(); } }, 'Annuler') : null,
      why(['bilan', 'surplus'])));
}

function reviewCard() {
  const d = reviewDue();
  if (!d) return null;
  return h('div.card', h('button.compact', { onclick: () => reviewSheet(d) },
    h('div.grow', h('div', { style: { fontWeight: 700 } }, 'Bilan de la semaine'), h('div.small.muted', 'Tendance, moyennes, séances, sommeil et un conseil prioritaire')),
    h('span.chev', icon('chevron'))));
}

// ---------- L'action du moment ----------
async function hero(day, t, checkin, night, date) {
  if (!checkin) {
    return h('div.card.hero',
      h('div.eyebrow', 'Pour commencer'),
      h('div.title', 'Check-in du matin'),
      h('div.subtitle', night ? `Nuit importée : ${fmtDuration(night.tst)}, ${IMPRESSIONS[night.quality] || ''}. Plus que 4 questions.` : '5 questions et ton poids · 20 secondes'),
      h('div', { style: { marginTop: '14px' } }, h('button.btn.btn-primary', { onclick: () => checkinSheet(date, null, day.weight, night) }, 'Commencer')));
  }
  const done = new Set(day.meals.map((m) => m.slot));
  const sid = currentSlot(nowMinutes(), done);
  if (!sid) {
    return h('div.card.hero', h('div.eyebrow', 'Journée terminée'), h('div.title', 'Toutes les prises sont notées'),
      h('div.subtitle', 'Bonne nuit. Pense à te coucher vers 22h30.'));
  }
  const s = slotById(sid), st = slotTargets(t, sid);
  const habits = await habitsForSlot(sid, 3);
  const intent = DEFAULT_INTENTIONS.find((i) => i.slot === sid);
  return h('div.card.hero',
    h('div.eyebrow', `Maintenant · ${s.time.replace(':', 'h')}`),
    h('div.title', s.label),
    h('div.subtitle', `Vise ≈ ${fmt.int(st.kcal)} kcal et ${st.protein} g de protéines`),
    h('div.actions',
      h('button.btn.btn-primary', { onclick: () => openAdd({ date: day.date, slot: sid, photo: true }) }, icon('camera'), 'Photo'),
      h('button.btn', { onclick: () => openAdd({ date: day.date, slot: sid }) }, icon('plus'), 'Ajouter')),
    habits.length ? h('div.quick-repeat', habits.map((hb) => h('button', { onclick: async () => { await repeatMeal(hb.last, day.date, sid); refresh(); } },
      icon('repeat'), `${short(hb.name)} · ${fmt.int(hb.last.total.kcal)}`))) : null,
    intent ? h('div.intention', `« ${intent.text} »`) : null);
}
const short = (s, n = 24) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

// ---------- Anneaux calories / protéines ----------
function ring(value, target, label, unit) {
  const R = 27, C = 2 * Math.PI * R, pct = target ? Math.min(1, value / target) : 0;
  return h('div.ring-box',
    h('div.ring', { html: `<svg viewBox="0 0 64 64"><circle cx="32" cy="32" r="${R}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="7"/><circle cx="32" cy="32" r="${R}" fill="none" stroke="url(#g${label})" stroke-width="7" stroke-linecap="round" stroke-dasharray="${C * pct} ${C}"/><defs><linearGradient id="g${label}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#7af2e7"/><stop offset="1" stop-color="#19b8ab"/></linearGradient></defs></svg>` },
      h('span.val', `${Math.round(pct * 100)}%`)),
    h('div', h('div.ring-label', label), h('div.ring-num', fmt.int(value), h('small', ` / ${fmt.int(target)}${unit}`))));
}
function rings(day, t) {
  const left = Math.max(0, t.kcal - day.totals.kcal), leftP = Math.max(0, t.protein - day.totals.p);
  return h('div.card',
    h('div.rings', ring(day.totals.kcal, t.kcal, 'Calories', ''), ring(day.totals.p, t.protein, 'Protéines', ' g')),
    h('div.row.between', { style: { marginTop: '10px' } },
      h('span.small.muted', left > 0 || leftP > 0 ? `Reste ${fmt.int(left)} kcal · ${fmt.int(leftP)} g` : 'Objectifs atteints'),
      why(['surplus', 'proteines'])));
}

// ---------- La journée en une ligne ----------
function dayCard(day, checkin, st, met, date, first) {
  const done = new Set(day.meals.map((m) => m.slot));
  const now = checkin ? currentSlot(nowMinutes(), done) : 'checkin';
  const items = [{ id: 'checkin', label: 'Check-in', done: !!checkin }, ...SLOTS.map((s) => ({ id: s.id, label: s.short, done: done.has(s.id) }))];
  const reg = regularity(met, date, 30, first);
  const missing = day.minimum.items.filter((i) => !i.done).map((i) => i.label.toLowerCase());
  return h('div.card',
    h('div.daybar', items.map((i) => h(`button${i.done ? '.done' : ''}${i.id === now ? '.now' : ''}`, {
      'aria-label': `${i.label}${i.done ? ' : fait' : ''}`,
      onclick: () => (i.id === 'checkin' ? checkinSheet(date, checkin, day.weight, null) : openAdd({ date, slot: i.id })),
    }, h('span.dot', i.done ? icon('check') : null), i.label))),
    h('div.row.between', { style: { marginTop: '10px' } },
      h('span.small.muted', day.minimum.met ? `Journée minimale atteinte · régularité ${reg.count}/${reg.days || 1} j` : `Journée minimale ${day.minimum.count}/${day.minimum.total} · reste : ${missing.join(', ')}`),
      why(['journee_minimale', 'habitudes'])));
}

// ---------- Score et séance du jour ----------
async function scoreRow(date, c, night) {
  const yesterdayWk = (await db.byDate('workouts', addDays(date, -1))).some((w) => w.status === 'terminee');
  const rec = recommend(c.score, { weekend: isWeekend(date), sleep: c.sleep, trainedYesterday: yesterdayWk });
  const todayWk = (await db.byDate('workouts', date)).find((w) => w.status === 'terminee');
  const R = 21, C = 2 * Math.PI * R;
  const session = weekday(date) === 6 ? 'A' : weekday(date) === 0 ? 'B' : 'M';
  let action = null;
  if (todayWk) action = h('span.small.accent', 'Séance faite ✓');
  else if (['complete', 'allegee', 'mini'].includes(rec.level)) action = h('button.btn.btn-sm.btn-primary', { onclick: (e) => { e.stopPropagation(); go('seance', { start: session, mode: rec.level }); } }, 'Démarrer');
  else if (rec.level === 'mobilite') action = h('button.btn.btn-sm', { onclick: (e) => { e.stopPropagation(); go('seance', { start: 'mobilite' }); } }, '10 min');
  return h('div.card',
    h('button.compact', { onclick: () => scoreSheet(date, c, rec, night) },
      h('div.score-mini', { html: `<svg viewBox="0 0 50 50"><circle cx="25" cy="25" r="${R}" fill="none" stroke="rgba(255,255,255,0.1)" stroke-width="5"/><circle cx="25" cy="25" r="${R}" fill="none" stroke="var(--accent)" stroke-width="5" stroke-linecap="round" stroke-dasharray="${(C * c.score) / 100} ${C}"/></svg>` }, h('span.val', String(c.score))),
      h('div.grow', h('div.small.muted', 'Score du jour'), h('div', { style: { fontWeight: 700 } }, rec.label),
        night ? h('div.sleep-line', icon('moon'), `${fmtDuration(night.tst)} de sommeil · ${IMPRESSIONS[night.quality] || ''}`) : null),
      action));
}

function scoreSheet(date, c, rec, night) {
  sheet('Score du jour', (close) => h('div.stack',
    h('div.row', h('span.big', String(c.score)), h('div', h('div.reco-label', rec.label), rec.reasons.length ? h('div.small.muted', rec.reasons.join(' · ')) : null)),
    night ? h('div.card.stack-sm',
      h('div.sleep-line', icon('moon'), h('strong', 'Nuit importée')),
      h('div.small.muted', `Sommeil ${fmtDuration(night.tst)} · efficacité ${night.efficiency ?? '–'} % · ${night.awakenings ?? 0} réveil(s) · impression ${night.impression || '–'}`)) : null,
    h('p.small.muted', 'Week-end : ≥ 70 séance complète, 50-69 allégée, 35-49 mobilité, < 35 repos. Semaine : ≥ 65 mini-séance facultative. Après une très mauvaise nuit, jamais de séance complète.'),
    why(['score', 'autoregulation', 'sommeil_muscle']),
    h('button.btn', { onclick: () => { close(); checkinSheet(date, c, null, night); } }, 'Modifier mes réponses')));
}

// ---------- Check-in (feuille) ----------
export async function checkinSheet(date, prev, weight, night) {
  night = night ?? (await getNight(date));
  weight = weight ?? (await db.get('weights', date));
  const ans = { ...(prev || {}) };
  if (night?.quality) ans.sleep = night.quality;
  let kg = weight?.kg ?? null;
  const qs = QUESTIONS.filter((q) => !(q.id === 'sleep' && night?.quality));
  sheet('Check-in du matin', (close) => {
    const submit = h('button.btn.btn-primary', { onclick: save }, 'Valider');
    const check = () => { submit.disabled = QUESTIONS.filter((q) => q.id !== 'sleep').some((q) => ans[q.id] == null); };
    async function save() {
      const score = computeScore(ans);
      const yesterdayWk = (await db.byDate('workouts', addDays(date, -1))).some((w) => w.status === 'terminee');
      const rec = recommend(score, { weekend: isWeekend(date), sleep: ans.sleep ?? null, trainedYesterday: yesterdayWk });
      const ops = [['days', 'put', { ...(await db.get('days', date)), date, checkin: { ...Object.fromEntries(QUESTIONS.map((q) => [q.id, ans[q.id] ?? null])), sleepSource: night?.quality ? 'import' : 'declare', score, level: rec.level, ts: Date.now() } }]];
      if (kg && kg > 25 && kg < 250) ops.push(['weights', 'put', { date, kg: Math.round(kg * 10) / 10, ts: Date.now() }]);
      try { await db.batch(ops); close(); toast(`Score ${score} · ${rec.label}`); go('aujourdhui', {}, { replace: true }); } catch {}
    }
    const body = h('div',
      night?.quality ? h('div.sleep-line', { style: { marginBottom: '6px' } }, icon('moon'), `Nuit importée : ${fmtDuration(night.tst)}, ${IMPRESSIONS[night.quality]}`)
        : h('button.why', { onclick: () => { close(); sleepImportSheet(() => checkinSheet(date, prev, weight)); } }, 'Importer ma nuit depuis mon journal'),
      qs.map((q) => h('div.q-row',
        h('div.q-label', h('span', q.label), h('span.hint', `1 ${q.low} · 5 ${q.high}`)),
        chips([1, 2, 3, 4, 5], ans[q.id] ?? null, (v) => { ans[q.id] = v; check(); }, { cls: 'fill' }))),
      h('div.q-row', h('div.q-label', h('span', 'Poids (facultatif)'), h('span.hint', 'au réveil')),
        h('input.input.input-big', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: '–', value: kg ?? '',
          oninput: (e) => { kg = parseFloat(e.target.value.replace(',', '.')) || null; } })),
      h('div', { style: { marginTop: '12px' } }, submit));
    check();
    return body;
  });
}

// ---------- Un conseil ----------
function tip(day, t) {
  const m = nowMinutes();
  let tp;
  if (m >= 18 * 60 && day.totals.p < t.protein * 0.6) tp = { text: `Il te manque ${fmt.int(t.protein - day.totals.p)} g de protéines : un grand fromage blanc ou skyr ce soir en apporte 30.`, src: 'coucher' };
  else if (m >= 15 * 60 && day.totals.kcal < t.kcal * 0.4) tp = { text: 'En retard sur les calories : un smoothie lait-banane-avoine-beurre de cacahuète apporte ≈ 650 kcal sans te remplir.', src: 'liquides' };
  else {
    const rot = [
      { text: 'Pas besoin de peser : « assiette normale » ou « repas normal » suffit, si tu le fais chaque jour.', src: 'saisie_rapide' },
      { text: 'Une cuillère d\'huile d\'olive ou une poignée de fromage râpé dans ton plat : +100 kcal sans plus de volume.', src: 'densite' },
      { text: 'Dernier café avant 14h : avec un coucher vers 22h30, la caféine de l\'après-midi raccourcit la nuit.', src: 'cafeine' },
      { text: 'Lève-toi à la même heure tous les jours, même le week-end : c\'est le pilier n° 1 contre l\'insomnie.', src: 'tcci' },
      { text: 'La créatine (3-5 g/j) est une option sûre et efficace, surtout en végétarien.', src: 'creatine' },
      { text: 'Œufs, laitages, soja, légumineuses + céréales : varie tes protéines.', src: 'vegetarien' },
      { text: 'Un bilan sanguin (B12, ferritine) une fois par an est utile en végétarien.', src: 'b12fer' },
      { text: 'Mange à heure fixe, même sans faim : chez toi, la faim est un mauvais réveil.', src: 'heures_fixes' },
    ];
    tp = rot[Math.floor(Date.now() / 86400000) % rot.length];
  }
  return h('div.card', h('p.small', tp.text), why(tp.src));
}
