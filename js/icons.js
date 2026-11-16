// Icônes SVG au trait (style SF Symbols), héritent de currentColor.
const s = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${d}</svg>`;
export const ICONS = {
  today: s('<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>'),
  meals: s('<path d="M7 2v8a2 2 0 0 0 2 2v10M11 2v8M7 6h4M17 2c-1.7 1-3 3.2-3 6v5h3v9"/>'),
  training: s('<path d="M6.5 6.5v11M17.5 6.5v11M3.5 9v6M20.5 9v6M6.5 12h11"/>'),
  weight: s('<path d="M3 17l5-5 4 4 8-8"/><path d="M15 8h5v5"/>'),
  more: s('<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>'),
  camera: s('<path d="M4 8h3l2-3h6l2 3h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="3.5"/>'),
  plus: s('<path d="M12 5v14M5 12h14"/>'),
  check: s('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
  flame: s('<path d="M12 22c4 0 7-2.8 7-6.6 0-3.7-2.6-6-4.3-8.4-.5 2-1.6 3.2-2.7 3.6.2-3-1-6.1-3.5-8.6.1 3.6-3.5 6.3-3.5 11 0 4.6 3 9 7 9z"/>'),
  chevron: s('<path d="M9 6l6 6-6 6"/>'),
  repeat: s('<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>'),
  moon: s('<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>'),
  search: s('<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.5-3.5"/>'),
  close: s('<path d="M6 6l12 12M18 6L6 18"/>'),
};
export const icon = (name, cls = 'ico') => { const span = document.createElement('span'); span.className = cls; span.innerHTML = ICONS[name]; return span; };
