// Poids : pesée du matin, courbe (pesées + tendance), moyenne 7 jours, rythme hebdomadaire.
import * as db from '../db.js';
import { h, mount, why, fmt, toast, confirmSheet, sheet, pickImage, resizeImage } from '../ui.js';
import { compositionSignal } from '../lib/weekly.js';
import { todayISO, addDays, diffDays, shortDate } from '../lib/dates.js';
import { trendSeries, movingAverage7, weeklyRate, rateStatus } from '../lib/weight.js';
import { targetGainRange } from '../lib/nutrition.js';
import { refresh } from '../main.js';
import { goalData } from '../state.js';

let range = 30;

export async function render(root, params) {
  const today = todayISO();
  const entries = (await db.getAll('weights')).sort((a, b) => (a.date < b.date ? -1 : 1));
  const series = trendSeries(entries);
  const last = series.at(-1);
  const ma = movingAverage7(entries, today);
  const r = weeklyRate(entries, today, 14);
  const status = rateStatus(r.ok ? r.rate : null, last?.trend);
  const todayEntry = entries.find((e) => e.date === today);
  const goal = targetGainRange(last?.trend ?? 58);

  let kg = todayEntry?.kg ?? '';
  const input = h('input.input.input-big', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: last ? fmt.kg(last.kg) : '58,0', value: kg,
    oninput: (e) => (kg = parseFloat(e.target.value.replace(',', '.'))) });
  async function save() {
    if (!(kg > 25 && kg < 250)) { toast('Poids invalide'); return; }
    try { await db.put('weights', { date: today, kg: Math.round(kg * 10) / 10, ts: Date.now() }); toast('Pesée enregistrée'); refresh(); } catch {}
  }

  mount(root, 
    h('div.page-head', h('div', h('h1', 'Poids'), h('div.sub', 'Pèse-toi au réveil, après les toilettes'))),
    await capCard(),
    h('div.card#saisie', h('div.card-head', h('h2', todayEntry ? 'Pesée du jour : notée' : 'Pesée du jour')), input,
      h('div', { style: { marginTop: '10px' } }, h('button.btn.btn-primary', { onclick: save }, todayEntry ? 'Corriger' : 'Enregistrer'))),
  );

  const lastW = entries.at(-1);
  if (!lastW || diffDays(lastW.date, today) >= 7) {
    root.append(h('div.card', { style: { marginTop: '12px' } },
      h('h2', 'Pas de balance ?'),
      h('p.small', { style: { marginTop: '6px' } }, 'Pas grave : une pesée par semaine suffit à l\'appli pour estimer ta dépense (avec une confiance plus faible). Les pharmacies ont souvent une balance gratuite ; une salle de sport ou un proche aussi.'),
      h('p.small.muted', { style: { marginTop: '6px' } }, 'Pour comparer : même jour de la semaine, le matin si possible, à jeun, mêmes vêtements légers. Note le poids ici le jour même.'),
      h('p.small.muted', { style: { marginTop: '6px' } }, 'En attendant, les mensurations (mètre ruban, ≈ 2 €) montrent si tu prends du muscle.')));
  }

  if (!entries.length) {
    mount(root, h('div.card', h('p.muted', 'Ta courbe apparaîtra après quelques pesées. Une pesée par jour est idéale, mais 4-5 par semaine suffisent.')));
    return;
  }

  mount(root, 
    h('div.card',
      h('div.kpis',
        h('div.kpi', h('div.label', 'Tendance'), h('div.value', fmt.kg(last.trend), h('span.unit', 'kg'))),
        h('div.kpi', h('div.label', 'Moyenne 7 jours'), h('div.value', ma ? fmt.kg(ma) : '–', h('span.unit', 'kg'))),
        h('div.kpi', h('div.label', 'Rythme (14 j)'), h('div.value', r.ok ? fmt.signed(r.rate, 2) : '–', h('span.unit', 'kg/sem'))),
        h('div.kpi', h('div.label', 'Statut'), h('div', { style: { fontWeight: 700, marginTop: '4px' } }, status.label))),
      h('p.small.muted', { style: { marginTop: '10px' } }, `Cible : +${fmt.kg(goal.min, 2)} à +${fmt.kg(goal.max, 2)} kg par semaine (0,25-0,5 % du poids). ${r.ok ? `Calculé sur ${r.n} pesées.` : 'Il faut au moins 5 pesées sur 7 jours.'}`),
      h('div.row', why(['tendance', 'surplus']))),
    chartCard(series),
    await expenditureCard(),
    await measuresCard(),
    h('div.section-title', 'Dernières pesées'),
    h('div.list', [...entries].reverse().slice(0, 14).map((e) => h('div.list-item',
      h('span.grow', shortDate(e.date)), h('strong.num', `${fmt.kg(e.kg)} kg`),
      h('button.icon-btn', { 'aria-label': `Supprimer la pesée du ${shortDate(e.date)}`, style: { width: '36px', height: '36px', fontSize: '18px' },
        onclick: async () => { if (await confirmSheet('Supprimer cette pesée ?', `${shortDate(e.date)} : ${fmt.kg(e.kg)} kg`, 'Supprimer', true)) { try { await db.del('weights', e.date); refresh(); } catch {} } } }, '×')))),
  );
  if (params.focus === 'saisie') setTimeout(() => input.focus(), 100);
}

// ---------- Le cap : 65 kg d'abord, puis des paliers de 3 kg ----------
async function capCard() {
  const g = await goalData().catch(() => null);
  if (!g) return null;
  const mois = (iso) => new Date(iso + 'T12:00:00').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  return h('div.card',
    h('div.card-head', h('h2', g.passed ? `Cap suivant : ${fmt.kg(g.goal, 0)} kg` : `Cap : ${fmt.kg(g.goal, 0)} kg`), why(['surplus', 'cap'])),
    h('div.cap-bar', h('div', { style: { width: `${Math.round(g.pct * 100)}%` } })),
    h('div.cap-steps', h('span', `${fmt.kg(g.from)} kg`), h('span', `${fmt.kg(g.currentKg)} kg`), h('span', `${fmt.kg(g.goal, 0)} kg`)),
    h('p.small', { style: { marginTop: '10px' } }, g.remaining > 0
      ? `Encore ${fmt.kg(g.remaining)} kg. ${g.eta ? `Au rythme ${g.measured ? 'mesuré' : 'visé (+0,3 kg/sem)'}, ≈ ${mois(g.eta)} (${g.weeks} semaines).` : ''}`
      : 'Cap atteint.'),
    h('p.small.muted', g.passed
      ? `Premier cap de ${fmt.kg(g.goal - 3, 0)} kg dépassé : on continue par paliers de 3 kg, en gardant un tour de taille stable (mensurations).`
      : 'Ensuite, on continue par paliers de 3 kg. Le rythme lent (0,25-0,5 % du poids par semaine) maximise la part de muscle.'));
}

function chartCard(series) {
  const wrap = h('div');
  const tip = h('div.chart-tip', ' ');
  const seg = h('div.seg', [[30, '1 mois'], [90, '3 mois'], [0, 'Tout']].map(([d, l]) =>
    h(`button${range === d ? '.on' : ''}`, { onclick: (e) => { range = d; seg.querySelectorAll('button').forEach((b) => b.classList.remove('on')); e.target.classList.add('on'); draw(); } }, l)));

  function draw() {
    wrap.innerHTML = '';
    const end = todayISO();
    const start = range ? addDays(end, -(range - 1)) : series[0].date;
    const pts = series.filter((p) => p.date >= start);
    if (pts.length < 2) { wrap.append(h('p.small.muted', { style: { padding: '40px 0', textAlign: 'center' } }, 'Pas encore assez de pesées sur cette période.')); return; }
    const W = 360, H = 220, L = 36, R = 8, T = 10, B = 24;
    const days = Math.max(1, diffDays(start, end));
    const vals = pts.flatMap((p) => [p.kg, p.trend]);
    let lo = Math.min(...vals), hi = Math.max(...vals);
    const pad = Math.max(0.3, (hi - lo) * 0.15); lo -= pad; hi += pad;
    const x = (d) => L + (diffDays(start, d) / days) * (W - L - R);
    const y = (v) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const step = (hi - lo) > 4 ? 1 : 0.5;
    let grid = '';
    for (let v = Math.ceil(lo / step) * step; v <= hi; v += step) grid += `<line x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text x="${L - 6}" y="${y(v) + 4}" text-anchor="end">${v.toFixed(step < 1 ? 1 : 0).replace('.', ',')}</text>`;
    const ticks = [start, addDays(start, Math.round(days / 2)), end].map((d, i) => `<text x="${x(d)}" y="${H - 6}" text-anchor="${['start', 'middle', 'end'][i]}">${shortDate(d)}</text>`).join('');
    const path = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.trend).toFixed(1)}`).join('');
    const dots = pts.map((p) => `<circle class="raw" cx="${x(p.date).toFixed(1)}" cy="${y(p.kg).toFixed(1)}" r="3.5"/>`).join('');
    const svg = h('div', { html: `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Courbe de poids : pesées et tendance">
      <g class="grid axis">${grid}</g><g class="axis">${ticks}</g>${dots}<path class="trend" d="${path}"/>
      <line class="cross" x1="0" x2="0" y1="${T}" y2="${H - B}" visibility="hidden"/><circle class="hl" r="5" fill="var(--accent)" stroke="#000" stroke-width="2" visibility="hidden"/></svg>` }).firstChild;
    const cross = svg.querySelector('.cross'), hl = svg.querySelector('.hl');
    const pick = (ev) => {
      const rect = svg.getBoundingClientRect();
      const cx = ((ev.touches ? ev.touches[0].clientX : ev.clientX) - rect.left) * (W / rect.width);
      let best = pts[0];
      for (const p of pts) if (Math.abs(x(p.date) - cx) < Math.abs(x(best.date) - cx)) best = p;
      cross.setAttribute('x1', x(best.date)); cross.setAttribute('x2', x(best.date)); cross.setAttribute('visibility', 'visible');
      hl.setAttribute('cx', x(best.date)); hl.setAttribute('cy', y(best.trend)); hl.setAttribute('visibility', 'visible');
      tip.textContent = `${shortDate(best.date)} · pesée ${fmt.kg(best.kg)} kg · tendance ${fmt.kg(best.trend, 2)} kg`;
    };
    svg.addEventListener('pointerdown', pick); svg.addEventListener('pointermove', (e) => e.buttons && pick(e)); svg.addEventListener('touchmove', pick, { passive: true });
    wrap.append(svg);
  }
  draw();
  return h('div.card',
    h('div.card-head', h('h2', 'Courbe'), seg),
    wrap, tip,
    h('div.legend', h('span', h('i', { style: { background: '#6b6b70' } }), 'Pesées'), h('span', h('i', { style: { background: 'var(--accent)' } }), 'Tendance lissée')),
    h('p.tiny.muted', { style: { marginTop: '6px' } }, 'Touche la courbe pour voir une date.'));
}

// ---------- Dépense estimée ----------
async function expenditureCard() {
  const [t, st, first, lw] = await Promise.all([db.kvGet('targets'), db.kvGet('adaptState'), db.kvGet('firstDay'), db.kvGet('lastWeekly')]);
  const days = first ? diffDays(first, todayISO()) : 0;
  const body = st?.calibrated
    ? [h('div.kpis',
        h('div.kpi', h('div.label', 'Ta dépense réelle'), h('div.value', fmt.int(st.tdee), h('span.unit', 'kcal'))),
        h('div.kpi', h('div.label', 'Formule de départ'), h('div.value', fmt.int(t?.maintenance), h('span.unit', 'kcal')))),
      h('p.small.muted', { style: { marginTop: '10px' } }, `Confiance ${lw?.confidence || '–'}. Recalculée chaque semaine à partir de tes apports et de ta tendance de poids ; ton objectif suit (${fmt.int(t?.kcal)} kcal).`)]
    : [h('p.small', `Pour l'instant : formule de départ, ${fmt.int(t?.maintenance)} kcal.`),
      h('p.small.muted', { style: { marginTop: '6px' } }, days < 14 ? `Premier calcul sur tes données dans ${14 - days} jour${14 - days > 1 ? 's' : ''} (il faut des journées complètes et des pesées régulières).` : 'Premier calcul à la prochaine ouverture du lundi, si assez de journées complètes et de pesées.')];
  return h('div.card', h('div.card-head', h('h2', 'Dépense énergétique'), why('bilan')), body);
}

// ---------- Mensurations (1 fois par mois) ----------
const FIELDS = [['arm', 'Bras (contracté)'], ['chest', 'Torse'], ['waist', 'Taille (nombril)'], ['thigh', 'Cuisse']];
async function measuresCard() {
  const ms = (await db.getAll('measures')).sort((a, b) => (a.date < b.date ? -1 : 1));
  const last = ms.at(-1), first = ms[0];
  const due = !last || diffDays(last.date, todayISO()) >= 28;
  const sig = compositionSignal(ms);
  return h('div.card',
    h('div.card-head', h('h2', 'Mensurations'), h('button.btn.btn-sm' + (due ? '.btn-primary' : ''), { onclick: () => measureSheet(last) }, due ? 'Mesurer' : 'Nouvelle')),
    last ? h('div.kpis', FIELDS.map(([k, l]) => h('div.kpi', h('div.label', l), h('div.value', last[k] != null ? fmt.kg(last[k]) : '–', h('span.unit', 'cm')),
      first !== last && first[k] != null && last[k] != null ? h('div.tiny.muted', `${fmt.signed(last[k] - first[k], 1)} cm depuis le ${shortDate(first.date)}`) : null)))
      : h('p.small.muted', 'Une fois par mois, au réveil, mètre ruban souple : bras, torse, taille, cuisse. Les photos (face et profil) restent sur ton iPhone.'),
    ms.length >= 2 ? h('p.small', { style: { marginTop: '10px' } }, sig.text) : null,
    last ? h('p.tiny.muted', { style: { marginTop: '6px' } }, `Dernière mesure : ${shortDate(last.date)}${due ? ' · à refaire' : ''}`) : null,
    h('div', why('surplus')));
}

function measureSheet(prev) {
  const v = {};
  const photos = { front: null, side: null };
  sheet('Mensurations du jour', (close) => {
    const photoBtn = (key, label) => {
      const b = h('button.btn', { onclick: async () => {
        const f = await pickImage(); if (!f) return;
        try { const blob = await resizeImage(f); photos[key] = await db.put('photos', { blob, date: todayISO(), ts: Date.now(), kind: 'composition' }); b.textContent = `${label} : prise`; } catch (e) { toast(e.message); }
      } }, label);
      return b;
    };
    return h('div.stack',
      h('p.small.muted', 'Au réveil, muscles relâchés (sauf le bras : contracté). Même endroit à chaque fois.'),
      h('div.grid2', FIELDS.map(([k, l]) => h('label.field', h('span', l), h('input.input', { type: 'number', inputmode: 'decimal', step: '0.1', placeholder: prev?.[k] != null ? String(prev[k]).replace('.', ',') : 'cm',
        oninput: (e) => { const x = parseFloat(e.target.value.replace(',', '.')); v[k] = x > 0 ? x : undefined; } })))),
      h('div.btn-row', photoBtn('front', 'Photo de face'), photoBtn('side', 'Photo de profil')),
      h('button.btn.btn-primary', { onclick: async () => {
        if (!Object.values(v).some(Boolean)) { toast('Indique au moins une mesure'); return; }
        try { await db.put('measures', { date: todayISO(), ...v, photoIds: Object.values(photos).filter(Boolean), ts: Date.now() }); close(); toast('Mensurations enregistrées'); refresh(); } catch {}
      } }, 'Enregistrer'));
  });
}
