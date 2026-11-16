// Configuration initiale (et modification du profil).
import { h, mount, why, fmt, toast } from '../ui.js';
import { ACTIVITY_LEVELS } from '../lib/nutrition.js';
import { targetGainRange } from '../lib/nutrition.js';
import { DEFAULT_PROFILE, getProfile, getTargets, computeInitial, saveProfileAndTargets, ageNow } from '../state.js';
import { go } from '../main.js';

export async function render(root) {
  const existing = await getProfile();
  const p = { ...DEFAULT_PROFILE, ...(existing || {}) };
  const prevTargets = await getTargets();
  let override = prevTargets ? { kcal: prevTargets.kcal, proteinPerKg: prevTargets.proteinPerKg } : null;

  const result = h('div.card.accent-border');
  const num = (key, label, { step = 1, min, max, unit } = {}) => h('label.field', h('span', label),
    h('input.input', { type: 'number', inputmode: 'decimal', step, min, max, value: p[key],
      oninput: (e) => { const v = parseFloat(e.target.value.replace(',', '.')); if (!isNaN(v)) { p[key] = v; override = null; update(); } } }));

  function update() {
    result.innerHTML = '';
    if (!p.birthdate || !p.heightCm || !p.weightKg) return;
    const t = computeInitial(p);
    const kcal = override?.kcal ?? t.kcal;
    const ppk = override?.proteinPerKg ?? t.proteinPerKg;
    const range = targetGainRange(p.weightKg);
    mount(result, 
      h('div.card-head', h('h2', 'Tes objectifs de départ'), why(['mifflin', 'surplus', 'proteines'])),
      h('div.kpis',
        h('div.kpi', h('div.label', 'Calories / jour'), h('div.value', fmt.int(kcal), h('span.unit', 'kcal'))),
        h('div.kpi', h('div.label', 'Protéines / jour'), h('div.value', fmt.int(ppk * p.weightKg), h('span.unit', 'g')))),
      h('p.small.muted', { style: { marginTop: '12px' } },
        `Métabolisme de base ${fmt.int(t.bmr)} kcal × ${String(t.factor).replace('.', ',')} = maintenance estimée ${fmt.int(t.maintenance)} kcal, + surplus ${fmt.int(t.surplus)} kcal (15 %). `,
        `Prise visée : ${fmt.kg(range.min, 2)} à ${fmt.kg(range.max, 2)} kg par semaine. Ces chiffres seront remplacés par ta dépense réelle après 2-3 semaines de saisie.`),
      h('div.grid2', { style: { marginTop: '12px' } },
        h('label.field', h('span', 'Ajuster les calories'), h('input.input', { type: 'number', inputmode: 'numeric', step: 50, value: kcal,
          onchange: (e) => { override = { ...(override || {}), kcal: Math.round(+e.target.value / 10) * 10 }; update(); } })),
        h('label.field', h('span', 'Protéines (g/kg)'), h('input.input', { type: 'number', inputmode: 'decimal', step: 0.1, min: 1.6, max: 2.2, value: ppk,
          onchange: (e) => { override = { ...(override || {}), proteinPerKg: Math.min(2.2, Math.max(1.6, +String(e.target.value).replace(',', '.'))) }; update(); } }))),
    );
    result.dataset.kcal = kcal; result.dataset.ppk = ppk;
  }

  async function save() {
    const t = computeInitial(p);
    const kcal = +result.dataset.kcal, ppk = +result.dataset.ppk;
    const targets = { ...t, kcal, proteinPerKg: ppk, protein: Math.round(ppk * p.weightKg), source: override?.kcal ? 'manuel' : 'formule' };
    const reason = override?.kcal && override.kcal !== t.kcal
      ? `Valeur choisie à la main (formule : ${t.kcal} kcal).`
      : `Mifflin-St Jeor : ${t.bmr} kcal × ${t.factor} (${ACTIVITY_LEVELS.find((a) => a.id === p.activity).label.toLowerCase()}) = ${t.maintenance} kcal, + ${t.surplus} kcal de surplus. Protéines ${ppk} g/kg × ${p.weightKg} kg.`;
    try {
      await saveProfileAndTargets(p, targets, reason);
      toast('Profil enregistré');
      go('aujourdhui', {}, { replace: true });
    } catch { /* bandeau d'erreur déjà affiché */ }
  }

  mount(root, 
    h('div.page-head', h('div', h('h1', existing ? 'Profil' : 'Bienvenue'), h('div.sub', existing ? 'Modifie tes informations' : 'Quelques infos pour calculer ton point de départ'))),
    h('div.card.stack',
      h('div.grid2',
        h('label.field', h('span', 'Date de naissance'), h('input.input', { type: 'date', value: p.birthdate, onchange: (e) => { p.birthdate = e.target.value; update(); } })),
        h('label.field', h('span', 'Âge'), h('div.input', { style: { display: 'flex', alignItems: 'center' } }, `${ageNow(p)} ans`))),
      h('div.grid2', num('heightCm', 'Taille (cm)', { min: 120, max: 230 }), num('weightKg', 'Poids (kg)', { step: 0.1, min: 30, max: 200 })),
      h('label.field', h('span', 'Niveau d\'activité (hors séances)'),
        h('select.input', { onchange: (e) => { p.activity = e.target.value; override = null; update(); } },
          ACTIVITY_LEVELS.map((a) => h('option', { value: a.id, selected: a.id === p.activity }, `${a.label} — ${a.hint}`)))),
      h('p.tiny.muted', 'Avec tes trajets en train et tes journées dehors, « modérément actif » est un bon départ ; l\'adaptation corrigera.'),
      h('div.grid2',
        h('label.field', h('span', 'Œufs'), h('select.input', { onchange: (e) => (p.eggs = e.target.value === 'oui') }, h('option', { selected: p.eggs }, 'oui'), h('option', { selected: !p.eggs }, 'non'))),
        h('label.field', h('span', 'Produits laitiers'), h('select.input', { onchange: (e) => (p.dairy = e.target.value === 'oui') }, h('option', { selected: p.dairy }, 'oui'), h('option', { selected: !p.dairy }, 'non')))),
      h('div.grid2',
        h('label.field', h('span', 'Réveil'), h('input.input', { type: 'time', value: p.wake, onchange: (e) => (p.wake = e.target.value) })),
        h('label.field', h('span', 'Coucher visé'), h('input.input', { type: 'time', value: p.bedtime, onchange: (e) => (p.bedtime = e.target.value) }))),
      h('label.field', h('span', 'Heure des séances du week-end'), h('input.input', { type: 'time', value: p.sessionTime, onchange: (e) => (p.sessionTime = e.target.value) })),
    ),
    h('div', { style: { marginTop: '12px' } }, result),
    h('div.stack', { style: { marginTop: '16px' } },
      h('button.btn.btn-primary', { onclick: save }, existing ? 'Enregistrer' : 'C\'est parti'),
      existing && h('button.btn', { onclick: () => history.back() }, 'Annuler')),
  );
  update();
}
