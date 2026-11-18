// Banco de pruebas de audio: botones para oír todo y verificación numérica con OfflineAudioContext.
import { crearAudio } from '../src/audio/index.js';
import { EFECTOS } from '../src/audio/sintesis.js';
import { BUCLES } from '../src/audio/bucles.js';
import { Secuenciador, MODOS_MUSICA } from '../src/audio/musica.js';
import { crearBuses, impulsoReverb } from '../src/audio/ayudas.js';

const SR = 44100;
const juegoFalso = { eventos: { en: () => () => {}, emitir() {} }, estado: { eraIdx: 0 }, jugadores: [], zombis: [], render: null, simulando: false };
const audio = crearAudio(juegoFalso);
window.audio = audio;

function medir(bufer, desde = 0) {
  let pico = 0, suma = 0, n = 0, nan = false, cola = 0;
  for (let ch = 0; ch < bufer.numberOfChannels; ch++) {
    const d = bufer.getChannelData(ch);
    for (let i = 0; i < d.length; i++) {
      const v = d[i];
      if (!Number.isFinite(v)) { nan = true; continue; }
      const a = Math.abs(v); if (a > pico) pico = a; suma += v * v; n++;
      if (i >= desde && a > cola) cola = a;
    }
  }
  return { pico, rms: Math.sqrt(suma / Math.max(1, n)), nan, cola };
}
const db = (x) => (x > 0 ? (20 * Math.log10(x)).toFixed(1) : '-inf');

async function renderEfecto(nombre, conRev) {
  const def = EFECTOS[nombre];
  const dur = def.dur + (conRev ? 3 : 0.6);
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * dur), SR);
  const g = ctx.createGain(); g.gain.value = def.g; g.connect(ctx.destination);
  let rev = null;
  if (conRev) { const e = ctx.createGain(); e.gain.value = def.g; const cv = ctx.createConvolver(); cv.buffer = impulsoReverb(ctx); const r = ctx.createGain(); r.gain.value = 0.55; e.connect(cv); cv.connect(r); r.connect(ctx.destination); rev = e; }
  def.f({ ctx, dest: g, rev }, 0.01, { p: 1, r: 0.5, era: 2 });
  const b = await ctx.startRendering();
  return { b, dur };
}

async function verificarEfectos(log) {
  const filas = [];
  for (const nombre of Object.keys(EFECTOS)) {
    try {
      const a = await renderEfecto(nombre, false);
      const m = medir(a.b, Math.floor(SR * (EFECTOS[nombre].dur + 0.2)));
      const r = await renderEfecto(nombre, true);
      const mr = medir(r.b);
      const falla = [];
      if (m.nan || mr.nan) falla.push('NaN');
      if (m.pico < 0.01) falla.push('silencio');
      if (m.rms < 0.001) falla.push('RMS bajo');
      if (mr.pico >= 1) falla.push('satura(rev)');
      if (m.pico >= 1) falla.push('satura');
      if (m.cola > 0.01) falla.push('cola>dur');
      filas.push({ tipo: 'efecto', nombre, dur: EFECTOS[nombre].dur, pico: m.pico, picoRev: mr.pico, rms: m.rms, cola: m.cola, falla });
    } catch (e) { filas.push({ tipo: 'efecto', nombre, falla: ['excepción ' + e.message] }); }
  }
  return filas;
}

async function renderTema(eraIdx, modo, int, compases = 4) {
  const tmp = new OfflineAudioContext(2, 1000, SR);
  const sec0 = new Secuenciador({ ctx: tmp, destino: tmp.destination, offline: true, t0: 0 });
  const dur = sec0.duracionCompas(eraIdx, modo) * compases;
  const ctx = new OfflineAudioContext(2, Math.ceil(SR * (dur + 1.5)), SR);
  const mus = ctx.createGain(); mus.gain.value = 0.6; mus.connect(ctx.destination);
  const e = ctx.createGain(); const cv = ctx.createConvolver(); cv.buffer = impulsoReverb(ctx); const r = ctx.createGain(); r.gain.value = 0.55; e.gain.value = 0.55; e.connect(cv); cv.connect(r); r.connect(ctx.destination);
  const sec = new Secuenciador({ ctx, destino: mus, rev: e, offline: true, t0: 0.02 });
  sec.configurar({ eraIdx, modo, intensidad: int });
  sec.avanzar(dur);
  const b = await ctx.startRendering();
  return { b, dur };
}
async function verificarTemas() {
  const filas = [];
  const casos = [['menu', 0.3], ['intermedio', 0.2], ['combate', 0.2], ['combate', 0.6], ['combate', 1], ['jefe', 1], ['victoria', 0.5], ['derrota', 0.2]];
  for (let era = 0; era < 6; era++) for (const [modo, int] of casos) {
    const nombre = `tema${era}_${modo}_${int}`;
    try {
      const { b, dur } = await renderTema(era, modo, int, 4);
      const m = medir(b);
      const falla = [];
      if (m.nan) falla.push('NaN'); if (m.pico < 0.02) falla.push('silencio'); if (m.rms < 0.003) falla.push('RMS bajo'); if (m.pico >= 1) falla.push('satura');
      filas.push({ tipo: 'tema', nombre, dur, pico: m.pico, rms: m.rms, falla });
    } catch (e) { filas.push({ tipo: 'tema', nombre, falla: ['excepción ' + e.message] }); }
  }
  return filas;
}
async function verificarBucles() {
  const filas = [];
  for (const nombre of Object.keys(BUCLES)) {
    try {
      const ctx = new OfflineAudioContext(2, SR * 6, SR);
      const g = ctx.createGain(); g.connect(ctx.destination);
      const e = ctx.createGain(); e.gain.value = 0.3; const cv = ctx.createConvolver(); cv.buffer = impulsoReverb(ctx); e.connect(cv); cv.connect(ctx.destination);
      const inst = BUCLES[nombre]({ ctx, dest: g, rev: e }, { volumen: 1 });
      inst.out.gain.setValueAtTime(1, 0);
      inst.ajustar?.({ tono: 1.2 });
      for (let t = 0; t < 6; t += 0.1) inst.tick?.(t, 0.1);
      const b = await ctx.startRendering();
      const m = medir(b);
      const falla = [];
      if (m.nan) falla.push('NaN'); if (m.pico < 0.003) falla.push('silencio'); if (m.pico >= 1) falla.push('satura');
      filas.push({ tipo: 'bucle', nombre, dur: 6, pico: m.pico, rms: m.rms, falla });
    } catch (e) { filas.push({ tipo: 'bucle', nombre, falla: ['excepción ' + e.message] }); }
  }
  return filas;
}
function tabla(filas) {
  const t = ['tipo\tnombre\tdur\tpico dBFS\tRMS dBFS\testado'];
  for (const f of filas) t.push([f.tipo, f.nombre, f.dur?.toFixed?.(2), db(f.pico), db(f.rms), f.falla.length ? 'FALLA: ' + f.falla.join(',') : 'ok'].join('\t'));
  return t.join('\n');
}
window.verificar = async (que = 'todo') => {
  let filas = [];
  if (que === 'todo' || que === 'efectos') filas = filas.concat(await verificarEfectos());
  if (que === 'todo' || que === 'bucles') filas = filas.concat(await verificarBucles());
  if (que === 'todo' || que === 'temas') filas = filas.concat(await verificarTemas());
  window.__filas = filas;
  const fallos = filas.filter((f) => f.falla.length);
  const html = '<h2>Verificación: ' + filas.length + ' casos, ' + fallos.length + ' fallos</h2><table><tr><th>tipo</th><th>nombre</th><th>dur</th><th>pico</th><th>RMS</th><th>estado</th></tr>' +
    filas.map((f) => `<tr><td>${f.tipo} ${f.nombre}</td><td>${f.tipo}</td><td>${f.dur?.toFixed?.(2) ?? ''}</td><td>${db(f.pico)}</td><td>${db(f.rms)}</td><td class="${f.falla.length ? 'mal' : 'ok'}">${f.falla.length ? f.falla.join(', ') : 'ok'}</td></tr>`).join('') + '</table>';
  document.getElementById('res').innerHTML = html;
  return { total: filas.length, fallos: fallos.map((f) => f.nombre + ': ' + f.falla.join(',') + (f.pico !== undefined ? ` pico=${f.pico.toFixed(2)} rev=${(f.picoRev ?? 0).toFixed(2)} cola=${(f.cola ?? 0).toFixed(3)}` : '')) };
};
window.tablaTexto = () => tabla(window.__filas || []);

// ───── interfaz para escuchar ─────
const barra = document.getElementById('barra');
const panel = document.getElementById('panel');
const btn = (txt, fn, padre) => { const b = document.createElement('button'); b.textContent = txt; b.onclick = () => { audio.desbloquear(); fn(); }; padre.appendChild(b); return b; };
btn('Verificar todo (offline)', () => window.verificar('todo'), barra);
const vol = document.createElement('input'); vol.type = 'range'; vol.min = 0; vol.max = 1; vol.step = 0.05; vol.value = 0.85; vol.oninput = () => audio.volumen(+vol.value); barra.appendChild(vol);
function grupo(titulo, items, fn) { const h = document.createElement('h2'); h.textContent = titulo; panel.appendChild(h); for (const n of items) btn(n, () => fn(n), panel); }
const nombres = Object.keys(EFECTOS);
const arm = nombres.filter((n) => !/^(zombi|jefe|jugador|habilidad|ui_|paso|explosion|impacto|motor|recarga|campana|silbato|sirena|alarma|zumbido|torre|tren|oleada|dia_|salto|vehiculo|mejora|recogida)/.test(n));
grupo('Armas y mecanismos', arm, (n) => audio.reproducir(n));
grupo('Explosiones e impactos', nombres.filter((n) => /^(explosion|impacto)/.test(n)), (n) => audio.reproducir(n));
grupo('Voces', nombres.filter((n) => /^(zombi|jefe|jugador)/.test(n)), (n) => audio.reproducir(n));
grupo('Jugador, interfaz y hitos', nombres.filter((n) => /^(habilidad|ui_|paso|oleada|dia_|salto|vehiculo|mejora|recogida)/.test(n)), (n) => audio.reproducir(n));
grupo('Interactivos', nombres.filter((n) => /^(campana|silbato|sirena|alarma|zumbido|torre|tren)/.test(n)), (n) => audio.reproducir(n));
let bActual = null;
grupo('Bucles (clic: alterna)', Object.keys(BUCLES), (n) => { if (bActual?.n === n) { bActual.h.detener(); bActual = null; return; } bActual?.h.detener(); bActual = { n, h: audio.bucle(n, { volumen: 1, tono: 1 }) }; });
const h = document.createElement('h2'); h.textContent = 'Música (era · modo)'; panel.appendChild(h);
for (let e = 0; e < 6; e++) for (const [m, i] of [['menu', 0.3], ['combate', 0.3], ['combate', 0.7], ['combate', 1], ['jefe', 1], ['intermedio', 0.2], ['victoria', 0.5], ['derrota', 0.2]]) btn(`${e} ${m} ${i}`, () => audio.musica({ eraIdx: e, modo: m, intensidad: i }), panel);
let rt = performance.now(); setInterval(() => { const n = performance.now(); audio.actualizar((n - rt) / 1000); rt = n; }, 50);
document.getElementById('res').textContent = 'Listo. Efectos: ' + nombres.length;
window.__lista = true;
