// Séance : programme du week-end, mini-séance, saisie série par série (répétitions + RIR), minuteur, retour par muscle.
import * as db from '../db.js';
import { h, mount, why, fmt, toast, sheet, chips, stepper, clear, confirmSheet } from '../ui.js';
import { todayISO, mondayOf, addDays, weekday, shortDate } from '../lib/dates.js';
import { EXERCISES, SESSIONS, MUSCLES, TRACKED, MOBILITY, WARMUP, exerciseById, sessionBlocks } from '../data/exercises.js';
import { nextTarget, adjustForReadiness, volumeByMuscle, volumeDelta, perfTrend, deloadAdvice } from '../lib/training.js';
import { diffDays } from '../lib/dates.js';
import { catchUpBlocks } from '../lib/daily.js';
import { LEVELS } from '../lib/score.js';
import { logAdjustment } from '../state.js';
import { go, refresh } from '../main.js';

const START_LEVEL = { tractions: 0, curl_elastique: 0, facepull: 0, pompes: 3, pompes_serrees: 1, pike: 1, rowing: 1, superman: 0, squat: 1, bulgare: 1, pont: 1, mollets: 0, gainage: 1, releves: 0 };
export const VOLUME_TARGET = { pecs: 10, dos: 10, epaules: 10, quadriceps: 10, ischios: 10, triceps: 6, biceps: 4, mollets: 4, abdos: 4 };
const PAIR_LABEL = ['', 'A', 'B', 'C', 'D', 'E'];

async function exLevel(id) { return (await db.get('exstate', id))?.level ?? START_LEVEL[id] ?? 0; }

/** Historique d'un exercice (séances terminées), du plus ancien au plus récent. */
async function exHistory(id, excludeWorkoutId = null) {
  const all = (await db.getAll('workouts')).filter((w) => w.status === 'terminee' && w.id !== excludeWorkoutId).sort((a, b) => a.startedAt - b.startedAt);
  const out = [];
  for (const w of all) for (const e of w.exercises) if (e.ex === id && e.sets.length) {
    const r = w.readiness || {};
    out.push({ date: w.date, level: e.level, sets: e.sets, fatigued: w.mode === 'allegee' || (r.score != null && r.score < 50) || (r.sleep != null && r.sleep <= 2) });
  }
  return out;
}

export async function render(root, params) {
  const open = (await db.getAll('workouts')).find((w) => w.status === 'en_cours');
  if (params.start === 'mobilite') return mobility(root);
  if (params.start && !open) {
    const w = await createWorkout(params.start, params.mode || 'complete');
    history.replaceState(null, '', `?page=seance&w=${w.id}`);
    return workoutView(root, w.id);
  }
  if (params.w || open) return workoutView(root, +(params.w || open.id));
  return overview(root);
}

// ---------- Vue d'ensemble ----------
async function overview(root) {
  const today = todayISO();
  const wd = weekday(today);
  const suggested = wd === 6 ? 'A' : wd === 0 ? 'B' : 'M';
  const mon = mondayOf(today);
  const week = (await db.byDateRange('workouts', mon, addDays(mon, 6))).filter((w) => w.status === 'terminee');
  const vol = volumeByMuscle(week, exerciseById);
  const checkin = (await db.get('days', today))?.checkin;
  const deloadUntil = await db.kvGet('deloadUntil');
  const inDeload = deloadUntil && today <= deloadUntil;
  const mode = inDeload || checkin?.level === 'allegee' ? 'allegee' : 'complete';
  const equipment = await db.kvGet('equipment', []);
  const deload = inDeload ? null : await deloadState(today);

  mount(root, 
    h('div.page-head', h('div', h('h1', 'Séance'), h('div.sub', 'Full body au poids du corps, sans matériel'))),
    h('div.card.accent-border',
      h('div.small.muted', suggested === 'M' ? 'En semaine (facultatif)' : `Aujourd'hui, ${wd === 6 ? 'samedi' : 'dimanche'}`),
      h('h2', `${SESSIONS[suggested].name} · ${SESSIONS[suggested].duration}`),
      checkin ? h('p.small.muted', `Score du jour ${checkin.score} → ${LEVELS[checkin.level].label.toLowerCase()}`) : h('p.small.muted', 'Fais le questionnaire du matin pour adapter la séance.'),
      h('div.stack', { style: { marginTop: '12px' } },
        h('button.btn.btn-primary', { onclick: () => go('seance', { start: suggested, mode: suggested === 'M' ? 'complete' : mode }) },
          `Démarrer${mode === 'allegee' && suggested !== 'M' ? ' (allégée)' : ''}`),
        h('div.btn-row',
          ...Object.values(SESSIONS).filter((s) => s.id !== suggested).map((s) => h('button.btn', { onclick: () => go('seance', { start: s.id, mode: 'complete' }) }, s.name))),
        h('button.btn', { onclick: () => go('seance', { start: 'mobilite' }) }, 'Routine mobilité 10 min'))),
    inDeload ? h('div.card', h('div', { style: { fontWeight: 650 } }, 'Semaine légère en cours'), h('p.small.muted', `Jusqu'au ${shortDate(deloadUntil)} : séances allégées (−40 % de séries). On repart plein pot ensuite.`), why('decharge')) : null,
    deload && (deload.needed || deload.suggest) ? h('div.card',
      h('div', { style: { fontWeight: 650 } }, deload.needed ? 'Semaine légère conseillée' : 'Semaine légère possible'),
      h('p.small.muted', `${deload.reason}. Une semaine avec 40 % de séries en moins laisse la fatigue retomber.`),
      h('div.row', { style: { marginTop: '8px' } },
        h('button.btn.btn-sm.btn-primary', { onclick: async () => {
          const until = addDays(mon, 6);
          try { await db.kvSet('deloadUntil', until); await db.kvSet('lastDeload', today); await logAdjustment('Semaine légère', `${deload.reason}. Séances allégées jusqu'au ${shortDate(until)}.`, 'programme'); refresh(); } catch {}
        } }, 'Activer cette semaine'), why('decharge'))) : null,
    h('div.section-title', 'Volume de la semaine (séries)'),
    h('div.card',
      TRACKED.map((m) => {
        const v = vol[m] || 0, t = VOLUME_TARGET[m];
        return h('div.vol-row', h('span', MUSCLES[m]), h('div.vol-track', h('div.vol-fill', { style: { width: `${Math.min(100, (v / t) * 100)}%` } })), h('span.vol-num', `${fmt.kg(v, v % 1 ? 1 : 0)}/${t}`));
      }),
      h('p.tiny.muted', { style: { marginTop: '8px' } }, 'Séries directes = 1, indirectes = ½. Avec les 2 séances et 1 mini-séance, tu es à environ 10 séries par grand muscle.'),
      !equipment.includes('barre') ? h('p.tiny.muted', 'Sans barre de traction, le dos et les biceps sont les points faibles du programme : une barre de porte (≈ 25 €) est l\'achat le plus utile. À cocher dans Plus → Matériel.') : null,
      why(['volume', 'poids_du_corps'])),
    h('div.section-title', 'Exercices'),
    h('div.list', await Promise.all(EXERCISES.filter((ex) => !ex.equipment.length || ex.equipment.some((e) => equipment.includes(e))).map(async (ex) => {
      const lvl = await exLevel(ex.id);
      return h('button.list-item', { onclick: () => exerciseSheet(ex) },
        h('span.grow', h('span', { style: { fontWeight: 600 } }, ex.name), h('br'), h('span.small.muted', `Niveau ${lvl + 1}/${ex.levels.length} · ${ex.levels[lvl].name}`)), h('span.chev', '›'));
    }))),
    h('div.section-title', 'Historique'),
    await historyList(),
    h('div.list', { style: { marginTop: '12px' } }, h('button.list-item', { onclick: () => go('plus', { section: 'materiel' }) }, h('span.grow', 'Mon matériel', h('br'), h('span.small.muted', equipment.length ? equipment.join(', ') : 'Aucun (poids du corps)')), h('span.chev', '›'))),
  );
}

async function historyList() {
  const ws = (await db.getAll('workouts')).filter((w) => w.status === 'terminee').sort((a, b) => b.startedAt - a.startedAt).slice(0, 10);
  if (!ws.length) return h('div.card', h('p.small.muted', 'Tes séances apparaîtront ici.'));
  return h('div.list', ws.map((w) => h('div.list-item',
    h('span.grow', `${SESSIONS[w.session]?.name || w.session}${w.mode === 'allegee' ? ' (allégée)' : ''}`, h('br'),
      h('span.small.muted', `${shortDate(w.date)} · ${w.exercises.reduce((t, e) => t + e.sets.length, 0)} séries`)))));
}

async function exerciseSheet(ex) {
  const lvl = await exLevel(ex.id);
  const hist = (await exHistory(ex.id)).slice(-6).reverse();
  sheet(ex.name, (close) => h('div.stack',
    h('p.small.muted', `Muscles : ${Object.entries(ex.muscles).map(([m, f]) => `${MUSCLES[m]}${f < 1 ? ' (indirect)' : ''}`).join(', ')}`),
    h('div.list', ex.levels.map((l, i) => h('div.list-item', { style: i === lvl ? { background: 'var(--accent-dim)' } : {} },
      h('div.grow', h('div', { style: { fontWeight: 600 } }, `${i + 1}. ${l.name}`), h('div.small.muted', `${l.min}-${l.max} ${ex.unit === 's' ? 's' : 'rép.'} · ${l.cues}`)),
      i === lvl ? h('span.badge.badge-fort', 'actuel') : h('button.btn.btn-sm', { onclick: async () => {
        try { await db.put('exstate', { ex: ex.id, level: i }); await logAdjustment(`${ex.name} : niveau ${i + 1}`, `Choix manuel : « ${l.name} ».`, 'programme'); close(); refresh(); } catch {}
      } }, 'Choisir')))),
    hist.length ? h('div', h('div.section-title', 'Dernières séances'),
      h('div.list', hist.map((s) => h('div.list-item', h('span.grow', shortDate(s.date), h('br'), h('span.small.muted', ex.levels[s.level].name)),
        h('span.num.small', s.sets.map((x) => x.reps).join(' · ')))))) : null,
    why(['progression', 'rir'])));
}

/** Fatigue des 7 derniers jours (scores) et baisses de performance récentes → conseil de semaine légère. */
async function deloadState(today) {
  const days = await db.byDateRange('days', addDays(today, -6), today).catch(() => []);
  const ws = (await db.getAll('workouts')).filter((w) => w.status === 'terminee').sort((a, b) => a.startedAt - b.startedAt);
  if (!ws.length) return null;
  let drops = 0;
  for (const w of [...ws].reverse()) { if (w.perfDrop) drops++; else break; }
  const last = (await db.kvGet('lastDeload')) || ws[0].date;
  return deloadAdvice({ scores: days.map((d) => d.checkin?.score ?? null), drops, weeksSinceDeload: Math.floor(diffDays(last, today) / 7) });
}

/** Mini-séance : les 3 muscles les plus en retard sur leur volume de la semaine (3 séries si le week-end a sauté). */
async function catchUpSession(equipment) {
  const today = todayISO(), mon = mondayOf(today);
  const week = (await db.byDateRange('workouts', mon, addDays(mon, 6))).filter((w) => w.status === 'terminee');
  const lastSat = addDays(mon, -2), lastSun = addDays(mon, -1);
  const wd = weekday(today);
  const lastWeekend = (await db.byDateRange('workouts', lastSat, lastSun)).filter((w) => w.status === 'terminee' && (w.session === 'A' || w.session === 'B'));
  const pool = [
    { ex: 'pompes', muscle: 'pecs' }, { ex: equipment.includes('barre') ? 'tractions' : 'rowing', muscle: 'dos' },
    { ex: 'squat', muscle: 'quadriceps' }, { ex: 'pont', muscle: 'ischios' }, { ex: 'pike', muscle: 'epaules' },
    ...(equipment.includes('elastique') ? [{ ex: 'curl_elastique', muscle: 'biceps' }] : []),
  ];
  return catchUpBlocks({ volume: volumeByMuscle(week, exerciseById), targets: VOLUME_TARGET, pool, weekendMissed: wd >= 1 && wd <= 5 && lastWeekend.length === 0 })
    .map((b) => ({ ...b, why: b.why.replace(/^(\w+)/, (m) => MUSCLES[m] || m) }));
}

// ---------- Création d'une séance ----------
async function createWorkout(sessionId, mode) {
  const equipment = await db.kvGet('equipment', []);
  const deloadUntil = await db.kvGet('deloadUntil');
  if (deloadUntil && todayISO() <= deloadUntil) mode = 'allegee';
  const adj = (await db.kvGet('setsAdj', {}))[sessionId] || {};
  let blocks = sessionId === 'M' ? await catchUpSession(equipment)
    : sessionBlocks(sessionId, equipment).map((b) => ({ ...b, sets: Math.min(6, Math.max(1, b.sets + (adj[b.ex] || 0))) }));
  blocks = adjustForReadiness(blocks, mode);
  const exercises = [];
  for (const b of blocks) {
    const ex = exerciseById(b.ex);
    const lvl = await exLevel(b.ex);
    const t = nextTarget(ex, await exHistory(b.ex), lvl);
    if (t.level !== lvl) {
      await db.put('exstate', { ex: b.ex, level: t.level });
      await logAdjustment(`${ex.name} : ${t.decision === 'monter' ? 'niveau supérieur' : 'niveau inférieur'}`, t.message, 'programme');
    }
    exercises.push({ ex: b.ex, pair: b.pair, level: t.level, plannedSets: b.sets, targetReps: t.targetReps, decision: t.decision, message: b.why ? `${b.why}. ${t.message}` : t.message, rirTarget: b.rirTarget, sets: [] });
  }
  const c = (await db.get('days', todayISO()))?.checkin;
  const w = { date: todayISO(), session: sessionId, mode, status: 'en_cours', exercises, startedAt: Date.now(), readiness: c ? { score: c.score, sleep: c.sleep } : null };
  w.id = await db.put('workouts', w);
  return w;
}

// ---------- Séance en cours ----------
async function workoutView(root, id) {
  const w = await db.get('workouts', id);
  if (!w) { go('seance', {}, { replace: true }); return; }
  const se = SESSIONS[w.session];
  const done = w.status === 'terminee';
  const save = async () => { await db.put('workouts', w); };

  const pairCount = {};
  mount(root, 
    h('div.page-head', h('div', h('h1', se.name), h('div.sub', `${w.mode === 'allegee' ? 'Allégée · ' : ''}${se.duration} · ${done ? 'terminée' : 'en cours'}`)),
      !done && h('button.btn.btn-sm', { onclick: async () => { if (await confirmSheet('Abandonner la séance ?', 'Les séries déjà notées seront supprimées.', 'Abandonner', true)) { try { await db.del('workouts', w.id); stopTimer(); go('seance', {}, { replace: true }); } catch {} } } }, 'Abandonner')),
    w.session === 'M' ? h('div.coach', 'Mini-séance ciblée : les 3 muscles les plus en retard sur leur volume de la semaine. ', why('mini_rattrapage')) : null,
    h('div.coach', w.mode === 'allegee' ? 'Séance allégée : moins de séries, garde 3 répétitions en réserve. L\'important est de garder l\'habitude.' : 'Séries de travail à 1-2 répétitions en réserve. Enchaîne les exercices d\'une même lettre (A1 puis A2), repos 60-90 s.',
      ' ', why(w.mode === 'allegee' ? ['autoregulation', 'sommeil_muscle'] : ['rir', 'volume'])),
    !done && !w.exercises.some((e) => e.sets.length) ? h('details.card', { style: { marginTop: '12px' } }, h('summary', { style: { fontWeight: 650 } }, 'Échauffement (3 min)'),
      h('ul.small.muted', { style: { margin: '8px 0 0', paddingLeft: '18px' } }, WARMUP.map((x) => h('li', x)))) : null,
  );

  for (const e of w.exercises) {
    const ex = exerciseById(e.ex);
    const lvl = ex.levels[e.level];
    pairCount[e.pair] = (pairCount[e.pair] || 0) + 1;
    const unit = ex.unit === 's' ? 's' : '';
    const rows = [];
    const total = Math.max(e.plannedSets, e.sets.length);
    for (let i = 0; i < total; i++) {
      const s = e.sets[i];
      rows.push(h(`div.set-row${s ? '.done' : ''}`,
        h('span.set-n', String(i + 1)),
        h('span.set-main', s ? `${s.reps}${unit || ' rép.'} · RIR ${s.rir >= 4 ? '4+' : s.rir}` : h('span.muted', `vise ${e.targetReps}${unit || ' rép.'}${ex.unilateral ? ' par jambe' : ''}`)),
        !done && h('button.set-btn', { onclick: () => setSheet(e, ex, i, async () => { await save(); refresh(); startTimer(e.pair && w.exercises.filter((x) => x.pair === e.pair).length > 1 ? 60 : 90); }) }, s ? 'Modifier' : 'Noter')));
    }
    mount(root, h('div.card.ex-card', { style: { marginTop: '12px' } },
      h('div.card-head', h('div', h('div.small.muted', `${PAIR_LABEL[e.pair] || ''}${pairCount[e.pair]} · ${ex.name}`), h('h3', lvl.name)),
        h('button.why', { onclick: () => sheet(lvl.name, h('div.stack', h('p', lvl.cues), h('p.small.muted', `Fourchette : ${lvl.min}-${lvl.max}${unit || ' répétitions'}${ex.unilateral ? ' par jambe' : ''}.`), why('poids_du_corps'))) }, 'Consignes')),
      h('p.small.muted', e.message),
      rows,
      !done && h('button.why', { onclick: async () => { e.plannedSets = Math.max(e.plannedSets, e.sets.length) + 1; await save(); refresh(); } }, '+ Ajouter une série')));
  }

  if (!done) mount(root, h('div', { style: { marginTop: '16px' } }, h('button.btn.btn-primary', { onclick: () => finishSheet(w) }, 'Terminer la séance')));
  else mount(root, h('div', { style: { marginTop: '16px' } }, h('button.btn', { onclick: () => go('seance', {}, { replace: true }) }, 'Retour')));
}

function setSheet(e, ex, i, onSaved) {
  const prev = e.sets[i] || e.sets[i - 1];
  let reps = prev?.reps ?? e.targetReps, rir = e.sets[i]?.rir ?? null;
  const unit = ex.unit === 's' ? ' s' : '';
  sheet(`Série ${i + 1} · ${ex.levels[e.level].name}`, (close) => {
    const btn = h('button.btn.btn-primary', { disabled: rir == null, onclick: async () => {
      e.sets[i] = { reps, rir, ts: Date.now() };
      unlockAudio();
      try { await onSaved(); close(); } catch {}
    } }, 'Enregistrer');
    return h('div.stack',
      h('div.small.muted', ex.unit === 's' ? 'Durée tenue' : `Répétitions faites${ex.unilateral ? ' (par jambe)' : ''}`),
      stepper(reps, { min: 0, max: 300, step: ex.unit === 's' ? 5 : 1, unit, onChange: (v) => (reps = v) }),
      h('div.small.muted', 'Combien en avais-tu encore en réserve ?'),
      chips([{ value: 0, label: '0' }, { value: 1, label: '1' }, { value: 2, label: '2' }, { value: 3, label: '3' }, { value: 4, label: '4+' }], rir, (v) => { rir = v; btn.disabled = v == null; }, { cls: 'fill' }),
      h('p.tiny.muted', '0 = impossible d\'en faire une de plus. Vise 1-2.'),
      btn);
  });
}

async function finishSheet(w) {
  const muscles = [...new Set(w.exercises.filter((e) => e.sets.length).flatMap((e) => Object.entries(exerciseById(e.ex).muscles).filter(([, f]) => f === 1).map(([m]) => m)))];
  const fb = Object.fromEntries(muscles.map((m) => [m, { pump: 2, soreness: 1, pain: false }]));
  sheet('Comment ça s\'est passé ?', (close) => h('div.stack',
    h('p.small.muted', 'Un tap par ligne (valeurs par défaut déjà cochées). Ça ajuste tes séries de la prochaine fois.'),
    h('div', muscles.map((m) => h('div.fb-row',
      h('div', { style: { fontWeight: 600 } }, MUSCLES[m]),
      h('div.fb-q', 'Congestion pendant la séance'),
      chips([{ value: 1, label: 'Faible' }, { value: 2, label: 'Moyenne' }, { value: 3, label: 'Forte' }], fb[m].pump, (v) => (fb[m].pump = v ?? 2), { cls: 'fill' }),
      h('div.fb-q', 'Courbatures depuis la dernière séance'),
      chips([{ value: 1, label: 'Aucune' }, { value: 2, label: 'Légères' }, { value: 3, label: 'Encore là' }], fb[m].soreness, (v) => (fb[m].soreness = v ?? 1), { cls: 'fill' }),
      h('div.fb-q', 'Douleur articulaire'),
      chips([{ value: false, label: 'Non' }, { value: true, label: 'Oui' }], fb[m].pain, (v) => (fb[m].pain = !!v), { cls: 'fill' })))),
    why('retour_muscle'),
    h('button.btn.btn-primary', { onclick: async () => {
      try {
        w.status = 'terminee'; w.endedAt = Date.now(); w.feedback = fb;
        w.exercises = w.exercises.filter((e) => e.sets.length);
        let down = 0;
        for (const e of w.exercises) {
          const prev = (await exHistory(e.ex, w.id)).filter((x) => x.level === e.level).at(-1);
          if (prev && e.sets.reduce((t, x) => t + x.reps, 0) < prev.sets.reduce((t, x) => t + x.reps, 0) * 0.9) down++;
        }
        w.perfDrop = down >= 2;
        await db.put('workouts', w);
        await applyVolumeFeedback(w, fb);
        stopTimer(); close();
        toast('Séance enregistrée. Bien joué !');
        go('seance', {}, { replace: true });
      } catch {}
    } }, 'Enregistrer la séance')));
}

/** Ajuste les séries de la prochaine séance du même type, muscle par muscle (petits pas, plafond 6 séries/exercice). */
async function applyVolumeFeedback(w, fb) {
  const adjAll = await db.kvGet('setsAdj', {});
  const adj = adjAll[w.session] || {};
  const changes = [];
  for (const [m, f] of Object.entries(fb)) {
    const main = w.exercises.find((e) => exerciseById(e.ex).muscles[m] === 1);
    if (!main) continue;
    const hist = await exHistory(main.ex);
    const perf = perfTrend(hist);
    const d = volumeDelta(f, perf, main.plannedSets);
    if (!d.delta) continue;
    const base = SESSIONS[w.session].blocks.find((b) => b.ex === main.ex)?.sets ?? main.plannedSets;
    const cur = adj[main.ex] || 0;
    const next = Math.min(6 - base, Math.max(1 - base, cur + Math.sign(d.delta) * Math.min(Math.abs(d.delta), 2)));
    if (next === cur) continue;
    adj[main.ex] = next;
    changes.push(`${MUSCLES[m]} : ${d.delta > 0 ? '+' : ''}${next - cur} série (${exerciseById(main.ex).name}). ${d.reason}`);
  }
  if (!changes.length) return;
  adjAll[w.session] = adj;
  await db.kvSet('setsAdj', adjAll);
  await logAdjustment(`${SESSIONS[w.session].name} : volume ajusté`, changes.join(' '), 'programme');
}

// ---------- Mobilité ----------
function mobility(root) {
  let i = -1, end = 0, iv = null;
  const now = h('div.big.center', '10:00');
  const label = h('h2.center', 'Routine mobilité');
  const list = h('div.list', MOBILITY.map((m, k) => h('div.list-item', { 'data-k': k }, h('span.grow', m.name), h('span.small.muted', `${m.sec} s`))));
  const startBtn = h('button.btn.btn-primary', { onclick: () => { unlockAudio(); next(); } }, 'Démarrer');
  function next() {
    i++;
    list.querySelectorAll('.list-item').forEach((el) => (el.style.background = +el.dataset.k === i ? 'var(--accent-dim)' : ''));
    if (i >= MOBILITY.length) { clearInterval(iv); label.textContent = 'Terminé, bravo !'; now.textContent = 'OK'; beep(); startBtn.classList.add('hidden'); return; }
    label.textContent = MOBILITY[i].name; end = Date.now() + MOBILITY[i].sec * 1000; beep(0.08);
    startBtn.textContent = 'Passer'; clearInterval(iv);
    iv = setInterval(() => { const s = Math.max(0, Math.ceil((end - Date.now()) / 1000)); now.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; if (!s) next(); }, 250);
  }
  mount(root, h('div.page-head', h('div', h('h1', 'Mobilité'), h('div.sub', '≈ 10 min, sans matériel'))),
    h('div.card.stack', label, now, startBtn, h('button.btn', { onclick: () => { clearInterval(iv); go('seance', {}, { replace: true }); } }, 'Quitter')),
    h('div', { style: { marginTop: '12px' } }, list));
}

// ---------- Minuteur de repos ----------
let timerEnd = 0, timerIv = null, actx = null;
function unlockAudio() { try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); if (actx.state === 'suspended') actx.resume(); } catch {} }
function beep(len = 0.25) {
  try { unlockAudio(); const o = actx.createOscillator(), g = actx.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g).connect(actx.destination); o.start(); o.stop(actx.currentTime + len); } catch {}
  navigator.vibrate?.(200);
}
export function stopTimer() { clearInterval(timerIv); timerIv = null; clear(document.getElementById('timer-host')); document.body.classList.remove('has-timer'); }
function startTimer(sec) {
  stopTimer();
  timerEnd = Date.now() + sec * 1000;
  const t = h('span.t', '');
  const box = h('div.timer', { role: 'timer', 'aria-label': 'Repos' }, h('span', 'Repos'), t,
    h('button', { onclick: () => { timerEnd += 15000; tick(); } }, '+15 s'),
    h('button', { onclick: stopTimer }, 'OK'));
  document.getElementById('timer-host').append(box);
  document.body.classList.add('has-timer');
  const tick = () => {
    const s = Math.ceil((timerEnd - Date.now()) / 1000);
    if (s <= 0) { t.textContent = 'C\'est reparti'; box.classList.add('done'); clearInterval(timerIv); timerIv = null; beep(); setTimeout(() => { if (!timerIv) stopTimer(); }, 8000); return; }
    t.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  };
  tick(); timerIv = setInterval(tick, 250);
}
