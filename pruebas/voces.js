// Comprueba que cada mp3 de public/voces carga y decodifica (duración > 0). Resultado en window.__voces.
import { GUION, RUTA_VOCES } from '../src/audio/voces.js';
const ctx = new OfflineAudioContext(1, 44100, 44100);
const filas = [], res = [];
for (const id of Object.keys(GUION)) {
  try {
    const r = await fetch(RUTA_VOCES + id + '.mp3');
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const b = await ctx.decodeAudioData(await r.arrayBuffer());
    res.push({ id, ok: b.duration > 0, dur: +b.duration.toFixed(2) });
    filas.push(`<span class="${b.duration > 0 ? 'ok' : 'mal'}">OK  ${id}  ${b.duration.toFixed(2)} s</span>`);
  } catch (e) { res.push({ id, ok: false, error: String(e.message || e) }); filas.push(`<span class="mal">FALTA ${id}  (${e.message || e})</span>`); }
}
window.__voces = res;
document.getElementById('res').innerHTML = filas.join('\n');
