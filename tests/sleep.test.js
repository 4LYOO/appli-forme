import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseSleepNotes, parseClock, parseDuration } from '../js/lib/sleep.js';

const NOTE = `Nuit se terminant le 16/11/2026
* Mise au lit : 22:25
* Heure à laquelle j’ai essayé de dormir : 22:30
* Temps estimé avant l’endormissement : 20 min
* Nombre de réveils nocturnes : 1
* Durée totale estimée des réveils : 30 min
* Réveil définitif : 11:00
* Heure de lever : 11:10
* Sieste(s) et durée(s) : non

Conditions de sommeil

* Fond sonore : non
* Conditions inhabituelles (bruit, lumière, inconfort…) : Nouvelle appartement et nouveau canapé !!
* Donormyl ou autre produit, quantité et heure : Donormyl entier 22:25

Impression générale : bonne`;

test('lecture de la note de sommeil réelle', () => {
  const [n] = parseSleepNotes(NOTE);
  assert.equal(n.date, '2026-11-16');
  assert.equal(n.bed, 22 * 60 + 25);
  assert.equal(n.tryAt, 22 * 60 + 30);
  assert.equal(n.latency, 20);
  assert.equal(n.awakenings, 1);
  assert.equal(n.waso, 30);
  assert.equal(n.finalWake, 11 * 60);
  assert.equal(n.outOfBed, 11 * 60 + 10);
  assert.equal(n.tst, 700); // 22:30 → 11:00 = 750 − 20 − 30
  assert.equal(n.tib, 765); // 22:25 → 11:10
  assert.equal(n.efficiency, 92);
  assert.equal(n.medicationTaken, true);
  assert.match(n.conditions, /canapé/);
  assert.equal(n.impressionScore, 4);
  assert.equal(n.quality, 4);
});

test('plusieurs notes, doublons et nuit courte', () => {
  const short = NOTE.replace('16/11/2026', '17/11/2026').replace('Réveil définitif : 11:00', 'Réveil définitif : 03:30').replace('Impression générale : bonne', 'Impression générale : moyenne');
  const again = NOTE.replace('Impression générale : bonne', 'Impression générale : très bonne');
  const nights = parseSleepNotes(`${NOTE}\n\n${short}\n\n${again}`);
  assert.equal(nights.length, 2);
  assert.equal(nights.find((x) => x.date === '2026-11-16').impressionScore, 5); // la dernière remplace
  const s = nights.find((x) => x.date === '2026-11-17');
  assert.equal(s.tst, 250); // 22:30 → 3:30 = 300 − 50
  assert.equal(s.quality, 1); // moyenne (3) − nuit < 6 h − efficacité < 75 %
});

test('formats d\'heures et de durées', () => {
  assert.equal(parseClock('7h'), 420);
  assert.equal(parseClock('07 h 05'), 425);
  assert.equal(parseDuration('1h30'), 90);
  assert.equal(parseDuration('non'), 0);
  assert.equal(parseSleepNotes('texte quelconque').length, 0);
});
