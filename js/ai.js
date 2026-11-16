// Appel à l'API Claude (SDK Anthropic officiel, embarqué dans vendor/) pour reconnaître les aliments d'une photo.
// La clé d'API reste sur l'iPhone (IndexedDB) et n'est jamais incluse dans les sauvegardes.
import * as db from './db.js';
import { VISION_SCHEMA, systemPrompt, userText } from './lib/vision.js';

const blobToBase64 = (b) => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result).split(',')[1]); r.onerror = () => rej(r.error); r.readAsDataURL(b); });

export async function aiSettings() {
  return { key: await db.kvGet('aiKey', ''), model: await db.kvGet('aiModel', 'claude-opus-5-5') };
}

export async function recognizeMeal({ blob, foods, hint = '', slotLabel = '' }) {
  const { key, model } = await aiSettings();
  if (!key) throw new Error('Ajoute ta clé d\'API dans Plus → Reconnaissance des plats.');
  const { default: Anthropic } = await import('../vendor/anthropic-sdk.js');
  // Clé saisie par l'utilisateur et gardée sur son propre appareil : appel direct depuis le navigateur.
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60_000 });
  const params = {
    model,
    max_tokens: 4000,
    output_config: { effort: 'low', format: { type: 'json_schema', schema: VISION_SCHEMA } },
    system: [{ type: 'text', text: systemPrompt(foods), cache_control: { type: 'ephemeral' } }],
    messages: [{ role: 'user', content: [
      { type: 'image', source: { type: 'base64', media_type: blob.type || 'image/jpeg', data: await blobToBase64(blob) } },
      { type: 'text', text: userText(hint, slotLabel) },
    ] }],
  };
  let response;
  try {
    // Repli automatique côté serveur en cas de refus (non disponible pour Haiku).
    response = model.startsWith('claude-haiku')
      ? await client.messages.create(params)
      : await client.beta.messages.create({ ...params, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' });
  } catch (e) {
    if (e instanceof Anthropic.AuthenticationError) throw new Error('Clé d\'API refusée : vérifie-la dans Plus → Reconnaissance des plats.');
    if (e instanceof Anthropic.PermissionDeniedError) throw new Error('Clé sans accès à ce modèle : choisis-en un autre dans Plus.');
    if (e instanceof Anthropic.RateLimitError) throw new Error('Trop de demandes ou crédit épuisé : réessaie dans un moment, ou vérifie ton crédit sur console.anthropic.com.');
    if (e instanceof Anthropic.BadRequestError) throw new Error(`Demande refusée par l'API : ${e.message}`);
    if (e instanceof Anthropic.APIConnectionError) throw new Error('Pas de connexion : la reconnaissance a besoin d\'internet.');
    if (e instanceof Anthropic.APIError) throw new Error(`Erreur de l'API (${e.status}) : ${e.message}`);
    throw e;
  }
  if (response.stop_reason === 'refusal') throw new Error('L\'IA n\'a pas pu analyser cette photo. Essaie une autre photo ou une saisie manuelle.');
  if (response.stop_reason === 'max_tokens') throw new Error('Réponse incomplète : réessaie avec une photo plus simple.');
  const text = response.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
  try { return JSON.parse(text); } catch { throw new Error('Réponse illisible de l\'IA : réessaie.'); }
}

/** Petit test de la clé (requête minimale). */
export async function testKey() {
  const { key, model } = await aiSettings();
  const { default: Anthropic } = await import('../vendor/anthropic-sdk.js');
  const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 0 });
  await client.models.retrieve(model);
  return true;
}
