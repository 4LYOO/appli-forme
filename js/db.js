// Stockage local IndexedDB. Chaque écriture n'est considérée réussie qu'au « complete » de la transaction ;
// sinon l'erreur est remontée ET signalée à l'interface (aucune perte silencieuse).

const DB_NAME = 'appli-forme';
const DB_VERSION = 2; // v2 : ajout du magasin « sleep »
export const STORES = {
  kv: { keyPath: 'k' },
  days: { keyPath: 'date' },
  weights: { keyPath: 'date' },
  meals: { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  favorites: { keyPath: 'id', autoIncrement: true },
  photos: { keyPath: 'id', autoIncrement: true },
  workouts: { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  exstate: { keyPath: 'ex' },
  adjustments: { keyPath: 'id', autoIncrement: true, indexes: ['date'] },
  sleep: { keyPath: 'date' },
};

let dbp = null;
let errorHandler = (e) => console.error(e);
export const onDbError = (fn) => { errorHandler = fn; };

export function open() {
  if (dbp) return dbp;
  dbp = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const [name, o] of Object.entries(STORES)) {
        if (db.objectStoreNames.contains(name)) continue;
        const s = db.createObjectStore(name, { keyPath: o.keyPath, autoIncrement: !!o.autoIncrement });
        for (const ix of o.indexes || []) s.createIndex(ix, ix);
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      db.onversionchange = () => { db.close(); location.reload(); };
      resolve(db);
    };
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Base de données bloquée : ferme les autres onglets de l\'appli.'));
  });
  dbp.catch((e) => { dbp = null; errorHandler(e, 'ouverture'); });
  return dbp;
}

function wrap(req) {
  return new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = () => rej(req.error); });
}

async function tx(stores, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    let t;
    try { t = db.transaction(stores, mode); } catch (e) { reject(e); return; }
    let result;
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error || new Error('Erreur de transaction'));
    t.onabort = () => reject(t.error || new Error('Transaction annulée (espace de stockage plein ?)'));
    Promise.resolve(fn(t)).then((r) => { result = r; }, (e) => { try { t.abort(); } catch {} reject(e); });
  });
}

async function write(stores, fn, what) {
  try { return await tx(stores, 'readwrite', fn); }
  catch (e) { errorHandler(e, what); throw e; }
}

export const get = (store, key) => tx([store], 'readonly', (t) => wrap(t.objectStore(store).get(key)));
export const getAll = (store) => tx([store], 'readonly', (t) => wrap(t.objectStore(store).getAll()));
export const byIndex = (store, index, range) => tx([store], 'readonly', (t) => wrap(t.objectStore(store).index(index).getAll(range)));
export const byDate = (store, date) => byIndex(store, 'date', IDBKeyRange.only(date));
export const byDateRange = (store, from, to) => byIndex(store, 'date', IDBKeyRange.bound(from, to));

export const put = (store, value) => write([store], (t) => wrap(t.objectStore(store).put(value)), store);
export const del = (store, key) => write([store], (t) => wrap(t.objectStore(store).delete(key)), store);

/** Plusieurs écritures atomiques : ops = [[store, 'put'|'delete', value|key], …] */
export const batch = (ops) => write([...new Set(ops.map((o) => o[0]))], (t) => {
  for (const [s, op, v] of ops) t.objectStore(s)[op](v);
}, 'lot');

// Clé-valeur
export async function kvGet(k, def = null) { const r = await get('kv', k); return r ? r.v : def; }
export const kvSet = (k, v) => put('kv', { k, v });

// ---------- Sauvegarde ----------
const blobToDataURL = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result); r.onerror = () => rej(r.error); r.readAsDataURL(b); });
async function dataURLToBlob(u) { return (await fetch(u)).blob(); }

export async function exportAll({ includePhotos = false } = {}) {
  const data = {};
  for (const s of Object.keys(STORES)) {
    if (s === 'photos' && !includePhotos) continue;
    let rows = await getAll(s);
    if (s === 'photos') rows = await Promise.all(rows.map(async (p) => ({ ...p, blob: await blobToDataURL(p.blob) })));
    data[s] = rows;
  }
  return { app: 'appli-forme', format: 1, exportedAt: new Date().toISOString(), includePhotos, data };
}

export function validateBackup(obj) {
  if (!obj || obj.app !== 'appli-forme' || !obj.data || typeof obj.data !== 'object') throw new Error('Ce fichier n\'est pas une sauvegarde de l\'appli.');
  if (obj.format > 1) throw new Error('Sauvegarde créée par une version plus récente de l\'appli : mets l\'appli à jour.');
  // Les sauvegardes d'une version antérieure n'ont pas toutes les sections : on les accepte.
  for (const [s, rows] of Object.entries(obj.data)) {
    if (!STORES[s]) throw new Error(`Section inconnue dans la sauvegarde : ${s}`);
    if (!Array.isArray(rows)) throw new Error(`Section invalide : ${s}`);
  }
  return true;
}

/** Remplace tout le contenu par la sauvegarde, en une seule transaction (tout ou rien). Les photos absentes de la sauvegarde sont conservées. */
export async function importAll(obj) {
  validateBackup(obj);
  const photos = obj.data.photos ? await Promise.all(obj.data.photos.map(async (p) => ({ ...p, blob: await dataURLToBlob(p.blob) }))) : null;
  const stores = Object.keys(STORES).filter((s) => (s !== 'photos' || photos) && (s in obj.data || s === 'photos'));
  return write(stores, (t) => {
    for (const s of stores) {
      const os = t.objectStore(s);
      os.clear();
      for (const row of (s === 'photos' ? photos : obj.data[s] || [])) os.put(row);
    }
  }, 'restauration');
}

/** Stockage persistant (évite l'effacement automatique par le navigateur). */
export async function ensurePersistence() {
  if (!navigator.storage || !navigator.storage.persist) return { supported: false, persisted: false };
  let persisted = await navigator.storage.persisted();
  if (!persisted) persisted = await navigator.storage.persist();
  let usage = null;
  try { const e = await navigator.storage.estimate(); usage = e; } catch {}
  return { supported: true, persisted, usage };
}
