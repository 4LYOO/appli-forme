// Bibliothèque d'exercices au poids du corps. Chaque exercice = une échelle de niveaux (Overcoming Gravity, S. Low).
// muscles : 1 = travail direct, 0,5 = travail indirect (comptage fractionnaire, Pelland 2024).
// equipment : [] = aucun matériel. Prévu pour plus tard : 'elastique', 'barre', 'halteres'.

export const MUSCLES = {
  pecs: 'Pectoraux',
  dos: 'Dos',
  epaules: 'Épaules',
  triceps: 'Triceps',
  biceps: 'Biceps',
  quadriceps: 'Quadriceps',
  ischios: 'Ischios & fessiers',
  mollets: 'Mollets',
  abdos: 'Abdos',
};

// Muscles suivis pour le volume hebdomadaire (les bras sont comptés via le travail indirect pour l'instant).
export const TRACKED = ['pecs', 'dos', 'epaules', 'quadriceps', 'ischios', 'triceps', 'biceps', 'mollets', 'abdos'];

export const EXERCISES = [
  {
    id: 'pompes', name: 'Pompes', muscles: { pecs: 1, triceps: 0.5, epaules: 0.5 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Pompes contre un mur', min: 10, max: 20, cues: 'Mains à hauteur d\'épaules, corps gainé, la poitrine vient toucher le mur.' },
      { name: 'Pompes inclinées (mains sur une table)', min: 8, max: 15, cues: 'Corps droit des talons à la tête, coudes à environ 45° du buste, poitrine jusqu\'au bord de la table.' },
      { name: 'Pompes inclinées basses (mains sur une chaise ou le canapé)', min: 8, max: 15, cues: 'Même placement, appui plus bas = plus difficile. Descends jusqu\'à frôler l\'appui.' },
      { name: 'Pompes', min: 6, max: 15, cues: 'Mains un peu plus larges que les épaules, fesses serrées, poitrine à 2-3 cm du sol, remonte en poussant le sol.' },
      { name: 'Pompes déclinées (pieds sur une chaise)', min: 6, max: 15, cues: 'Pieds surélevés, bassin aligné. Plus de travail pour le haut des pectoraux et les épaules.' },
      { name: 'Pompes archer inclinées', min: 5, max: 10, cues: 'Mains très écartées sur une table, descends vers une main en tendant l\'autre bras. Chaque côté = 1 répétition.' },
      { name: 'Pompes archer', min: 5, max: 10, cues: 'Au sol, descends vers une main, l\'autre bras reste presque tendu. Alterne les côtés.' },
    ],
  },
  {
    id: 'pompes_serrees', name: 'Pompes serrées', muscles: { triceps: 1, pecs: 0.5, epaules: 0.5 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Pompes serrées inclinées (table)', min: 8, max: 15, cues: 'Mains écartées de la largeur des épaules, coudes collés au corps.' },
      { name: 'Pompes serrées inclinées basses (chaise)', min: 8, max: 15, cues: 'Coudes qui frôlent les côtes, descente contrôlée.' },
      { name: 'Pompes serrées', min: 6, max: 15, cues: 'Au sol, mains sous les épaules, coudes le long du corps.' },
      { name: 'Pompes diamant', min: 6, max: 12, cues: 'Pouces et index se touchent sous la poitrine. Corps bien gainé.' },
    ],
  },
  {
    id: 'pike', name: 'Pompes piquées (épaules)', muscles: { epaules: 1, triceps: 0.5 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Pompes piquées inclinées (mains sur une chaise)', min: 6, max: 12, cues: 'Fesses hautes en V inversé, la tête descend entre les mains.' },
      { name: 'Pompes piquées', min: 6, max: 12, cues: 'Au sol, V inversé, la tête descend devant les mains (triangle tête-mains).' },
      { name: 'Pompes piquées pieds surélevés', min: 5, max: 12, cues: 'Pieds sur une chaise, buste plus vertical.' },
      { name: 'Pompes piquées pieds surélevés hauts', min: 5, max: 10, cues: 'Pieds plus hauts (canapé + coussin), presque à la verticale.' },
    ],
  },
  {
    id: 'rowing', name: 'Rowing (tirage horizontal)', muscles: { dos: 1, biceps: 0.5 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Tirage serviette à une porte', min: 10, max: 20, cues: 'Serviette passée autour d\'une poignée de porte FERMÉE et solide, pieds proches de la porte, tire en serrant les omoplates. Plus tes pieds avancent, plus c\'est dur.' },
      { name: 'Rowing sous une table, genoux pliés', min: 8, max: 15, cues: 'Allongé sous une table TRÈS solide, mains au bord, tire la poitrine vers la table, corps gainé. Vérifie que la table ne bascule pas.' },
      { name: 'Rowing sous une table, jambes tendues', min: 8, max: 15, cues: 'Talons au sol, corps droit, poitrine jusqu\'au bord.' },
      { name: 'Rowing sous une table, pieds surélevés', min: 6, max: 12, cues: 'Pieds sur une chaise, corps horizontal.' },
      { name: 'Rowing archer sous une table', min: 5, max: 10, cues: 'Mains écartées, tire vers une main en gardant l\'autre bras tendu.' },
    ],
  },
  {
    id: 'superman', name: 'Haut du dos (Y-T au sol)', muscles: { dos: 0.5, epaules: 0.5 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Y-T allongé sur le ventre', min: 10, max: 20, cues: 'Front au sol, lève les bras en Y puis en T, pouces vers le plafond, tiens 2 s en haut.' },
      { name: 'Y-T avec bouteilles d\'eau', min: 10, max: 20, cues: 'Même mouvement avec une petite bouteille dans chaque main.' },
    ],
  },
  {
    id: 'squat', name: 'Squat', muscles: { quadriceps: 1, ischios: 0.5 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Squat sur une chaise', min: 10, max: 20, cues: 'Assieds-toi lentement en 3 s, effleure la chaise, relève-toi sans t\'aider des mains.' },
      { name: 'Squat au poids du corps', min: 12, max: 25, cues: 'Pieds largeur d\'épaules, genoux dans l\'axe des pieds, descends au moins cuisses parallèles.' },
      { name: 'Squat tempo (descente 4 s, pause 2 s)', min: 10, max: 20, cues: 'Descente très lente, pause en bas sans rebond.' },
      { name: 'Squat pistol assisté (tenir une porte)', min: 5, max: 12, cues: 'Sur une jambe, l\'autre devant, tiens le chambranle pour t\'aider juste ce qu\'il faut.' },
      { name: 'Pistol sur une chaise', min: 5, max: 10, cues: 'Sur une jambe, descends t\'asseoir sur la chaise et remonte sans élan.' },
      { name: 'Squat pistol', min: 3, max: 8, cues: 'Sur une jambe, descente complète et contrôlée.' },
    ],
  },
  {
    id: 'bulgare', name: 'Fentes bulgares', muscles: { quadriceps: 1, ischios: 0.5 }, equipment: [], unilateral: true,
    levels: [
      { name: 'Fentes arrière', min: 8, max: 15, cues: 'Grand pas en arrière, genou arrière frôle le sol, buste droit. Répétitions par jambe.' },
      { name: 'Fentes bulgares (pied arrière sur une chaise)', min: 8, max: 15, cues: 'Pied arrière posé sur la chaise, le genou avant suit les orteils. Par jambe.' },
      { name: 'Fentes bulgares tempo (descente 3 s)', min: 8, max: 15, cues: 'Descente en 3 s, pause 1 s en bas. Par jambe.' },
      { name: 'Fentes bulgares avec sac à dos lesté', min: 8, max: 15, cues: 'Sac à dos rempli de livres ou bouteilles. Par jambe.' },
    ],
  },
  {
    id: 'pont', name: 'Pont fessier / ischios', muscles: { ischios: 1 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Pont fessier', min: 12, max: 25, cues: 'Sur le dos, pieds près des fesses, pousse dans les talons, serre les fessiers 2 s en haut.' },
      { name: 'Pont fessier sur une jambe', min: 8, max: 15, cues: 'Une jambe tendue en l\'air, bassin bien horizontal. Par jambe.' },
      { name: 'Hip thrust sur une jambe (dos sur le canapé)', min: 8, max: 15, cues: 'Haut du dos sur le canapé, monte jusqu\'à l\'alignement genou-hanche-épaule. Par jambe.' },
      { name: 'Leg curl glissé (serviette, sol lisse)', min: 6, max: 12, cues: 'En pont, talons sur une serviette, tends puis ramène les jambes sans laisser tomber le bassin.' },
      { name: 'Nordic curl négatif (pieds sous le canapé)', min: 3, max: 8, cues: 'À genoux, chevilles bloquées, descends le plus lentement possible, rattrape-toi avec les mains.' },
    ],
  },
  {
    id: 'mollets', name: 'Mollets', muscles: { mollets: 1 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Mollets debout sur une marche', min: 12, max: 25, cues: 'Avant des pieds sur une marche, descends talons bas puis monte au maximum, pause 1 s en haut.' },
      { name: 'Mollets sur une jambe (marche)', min: 10, max: 20, cues: 'Une jambe, amplitude complète, main au mur pour l\'équilibre. Par jambe.' },
    ],
  },
  {
    id: 'gainage', name: 'Gainage', muscles: { abdos: 1 }, equipment: [], unilateral: false, unit: 's',
    levels: [
      { name: 'Planche sur les genoux', min: 20, max: 60, cues: 'Coudes sous les épaules, dos plat. Durée en secondes.' },
      { name: 'Planche', min: 20, max: 60, cues: 'Corps droit, fesses et abdos serrés. Durée en secondes.' },
      { name: 'Planche RKC (contraction maximale)', min: 15, max: 40, cues: 'Coudes rapprochés des hanches, tout serrer au maximum. Durée en secondes.' },
      { name: 'Hollow body', min: 15, max: 45, cues: 'Sur le dos, bas du dos plaqué au sol, bras et jambes tendus juste au-dessus du sol. Durée en secondes.' },
    ],
  },
  {
    id: 'releves', name: 'Relevés de jambes', muscles: { abdos: 1 }, equipment: [], unilateral: false,
    levels: [
      { name: 'Relevés de genoux allongé', min: 10, max: 20, cues: 'Sur le dos, mains sous les fesses, ramène les genoux vers la poitrine en enroulant le bassin.' },
      { name: 'Relevés de jambes tendues allongé', min: 8, max: 15, cues: 'Jambes tendues, descente lente sans cambrer.' },
    ],
  },
  // ----- Avec matériel (activés dans Plus → Matériel) -----
  {
    id: 'tractions', name: 'Tractions (barre)', muscles: { dos: 1, biceps: 0.5 }, equipment: ['barre'], unilateral: false,
    levels: [
      { name: 'Suspension active (omoplates)', min: 6, max: 12, cues: 'Suspendu bras tendus, tire les épaules vers le bas sans plier les coudes, tiens 1 s.' },
      { name: 'Tractions négatives (descente 5 s)', min: 3, max: 8, cues: 'Monte menton au-dessus de la barre avec une chaise, puis descends le plus lentement possible.' },
      { name: 'Tractions assistées (un pied sur une chaise)', min: 5, max: 10, cues: 'Le pied aide juste ce qu\'il faut. Menton au-dessus de la barre.' },
      { name: 'Tractions', min: 3, max: 10, cues: 'Prise en pronation un peu plus large que les épaules, départ bras tendus, menton au-dessus de la barre.' },
      { name: 'Tractions lestées (sac à dos)', min: 4, max: 10, cues: 'Sac à dos avec des livres ou des bouteilles.' },
    ],
  },
  {
    id: 'curl_elastique', name: 'Curl biceps (élastique)', muscles: { biceps: 1 }, equipment: ['elastique'], unilateral: false,
    levels: [
      { name: 'Curl élastique léger', min: 12, max: 20, cues: 'Pieds sur l\'élastique, coudes collés au corps, monte et redescends en 2 s.' },
      { name: 'Curl élastique moyen', min: 10, max: 20, cues: 'Élastique plus dur ou tenu plus court.' },
      { name: 'Curl élastique fort', min: 8, max: 15, cues: 'Élastique le plus dur, pause 1 s en haut.' },
    ],
  },
  {
    id: 'facepull', name: 'Tirage visage (élastique)', muscles: { epaules: 1, dos: 0.5 }, equipment: ['elastique'], unilateral: false,
    levels: [
      { name: 'Tirage visage élastique', min: 12, max: 20, cues: 'Élastique accroché à hauteur des yeux, tire vers le visage en écartant les mains, coudes hauts.' },
      { name: 'Tirage visage élastique fort', min: 10, max: 20, cues: 'Élastique plus dur, pause 1 s en arrière.' },
    ],
  },
];

export const EQUIPMENT = [
  { id: 'barre', label: 'Barre de traction (porte)', hint: '≈ 20-30 € : le meilleur achat pour le dos et les biceps' },
  { id: 'elastique', label: 'Élastiques de musculation', hint: '≈ 15-25 € le lot : biceps, épaules, assistance aux tractions' },
  { id: 'halteres', label: 'Haltères', hint: 'Plus tard : variantes lestées' },
];

export const exerciseById = (id) => EXERCISES.find((e) => e.id === id);

// Séances. sets = séries de travail de base. pair = exercices enchaînés en alternance (gain de temps).
export const SESSIONS = {
  A: {
    id: 'A', name: 'Séance A', day: 'samedi', duration: '40-50 min',
    blocks: [
      { ex: 'pompes', sets: 4, pair: 1 }, { ex: 'rowing', sets: 4, pair: 1 },
      { ex: 'bulgare', sets: 3, pair: 2 }, { ex: 'pike', sets: 3, pair: 2 },
      { ex: 'pont', sets: 3, pair: 3 }, { ex: 'mollets', sets: 2, pair: 3 },
      { ex: 'gainage', sets: 2, pair: 4 },
      { ex: 'tractions', sets: 3, pair: 4, requires: 'barre' },
      { ex: 'curl_elastique', sets: 2, pair: 3, requires: 'elastique' },
    ],
  },
  B: {
    id: 'B', name: 'Séance B', day: 'dimanche', duration: '40-50 min',
    blocks: [
      { ex: 'pompes_serrees', sets: 4, pair: 1 }, { ex: 'rowing', sets: 4, pair: 1 },
      { ex: 'squat', sets: 3, pair: 2 }, { ex: 'pike', sets: 3, pair: 2 },
      { ex: 'pont', sets: 3, pair: 3 }, { ex: 'superman', sets: 2, pair: 3 },
      { ex: 'mollets', sets: 2, pair: 4 }, { ex: 'releves', sets: 2, pair: 4 },
      { ex: 'tractions', sets: 3, pair: 3, requires: 'barre', replaces: 'superman' },
      { ex: 'facepull', sets: 2, pair: 3, requires: 'elastique', replaces: 'superman' },
    ],
  },
  M: {
    id: 'M', name: 'Mini-séance', day: 'semaine', duration: '15-20 min',
    blocks: [
      { ex: 'pompes', sets: 2, pair: 1 }, { ex: 'rowing', sets: 2, pair: 1 }, { ex: 'squat', sets: 2, pair: 1 },
    ],
  },
};

export const MOBILITY = [
  { name: 'Chat-vache (à quatre pattes)', sec: 60 },
  { name: 'Fente basse, étirement des hanches (chaque côté)', sec: 90 },
  { name: 'Rotations thoraciques à quatre pattes (chaque côté)', sec: 60 },
  { name: 'Squat profond tenu (tenir une porte si besoin)', sec: 60 },
  { name: 'Ouverture de poitrine contre un chambranle', sec: 60 },
  { name: 'Ischios : jambe tendue sur une chaise (chaque côté)', sec: 60 },
  { name: 'Avant-bras : paume vers l\'avant, tire doucement les doigts vers toi (chaque bras)', sec: 60 },
  { name: 'Avant-bras : poing fermé vers le bas, plie le poignet (chaque bras)', sec: 60 },
  { name: 'Respiration lente allongé (inspire 4 s, expire 6 s)', sec: 90 },
];

// Exercices qui sollicitent bras, épaules et prise (déjà très utilisés par un métier manuel du haut du corps)
export const UPPER = new Set(['pompes', 'pompes_serrees', 'pike', 'rowing', 'superman', 'tractions', 'curl_elastique', 'facepull']);

/**
 * Blocs d'une séance selon le matériel disponible (les blocs « replaces » remplacent l'exercice sans matériel).
 * upperBodyJob : métier qui fatigue le haut du corps. La séance B (dimanche, veille de travail) retire 1 série
 * à chaque exercice du haut (minimum 2) et ajoute 1 série au squat et au pont : le volume hebdomadaire du haut
 * reste proche de 8-10 séries grâce au travail, celui des jambes (grands muscles, plus de masse) augmente.
 */
export function sessionBlocks(sessionId, equipment = [], { upperBodyJob = false } = {}) {
  const all = SESSIONS[sessionId].blocks;
  const active = all.filter((b) => !b.requires || equipment.includes(b.requires));
  const replaced = new Set(active.filter((b) => b.replaces).map((b) => b.replaces));
  let blocks = active.filter((b) => !replaced.has(b.ex)).sort((a, b) => a.pair - b.pair);
  if (upperBodyJob && sessionId === 'B') {
    blocks = blocks.map((b) => (UPPER.has(b.ex) ? { ...b, sets: Math.max(2, b.sets - 1) } : ['squat', 'pont'].includes(b.ex) ? { ...b, sets: b.sets + 1 } : b));
  }
  return blocks;
}

export const WARMUP = [
  'Cercles des poignets et ouverture-fermeture des mains, 30 s',
  'Cercles de bras, 30 s',
  '10 squats lents',
  '6-8 pompes faciles (mains sur une table)',
  '8 tirages légers (serviette ou table)',
  '5 fentes par jambe',
];
