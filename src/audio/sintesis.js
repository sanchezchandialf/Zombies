// Efectos sintetizados: cada entrada es { f(c, t, o), dur, prio, rev?, enf?, max?, g? }.
//   c = { ctx, dest, rev }  (en línea o fuera de línea)   o = { p: tono, r: azar 0..1 }
//   dur  = segundos hasta el silencio (sin reverb) · prio 0..10 · enf = reguladora de repeticiones (s) · max = voces simultáneas
//   g    = ganancia de normalización (calibrada con pruebas/audio.html)
import { osc, ruido, formantes, mtof } from './ayudas.js';

export const EFECTOS = {};
const def = (nombre, dur, f, ex = {}) => { EFECTOS[nombre] = { f, dur, prio: 5, g: 1, ...ex }; };
const alias = (n, de, ex = {}) => { EFECTOS[n] = { ...EFECTOS[de], ...ex }; };

// ───────────────────────────── armas de fuego ─────────────────────────────
// crack [hp Hz, dur, g] · cuerpo [f0, f1, g, dur, q] · sub [f0, f1, dur, g] · cola [f0, f1, dur, g]
function armaFuego(P) {
  const ret = P.ret ?? 0;
  const f = (c, t, o) => {
    const p = o.p, t0 = t + ret;
    if (P.siseo) ruido(c, t, ret + 0.02, { f: { t: 'highpass', a: 4500 }, g: 0.07, a: 0.004 });
    ruido(c, t0, P.crack[1], { f: { t: 'highpass', a: P.crack[0] * p, q: 0.6 }, g: P.crack[2], a: 0.0008, sat: 2 });
    ruido(c, t0, P.cuerpo[3], { col: 'r', f: { t: 'lowpass', a: P.cuerpo[0] * p, b: P.cuerpo[1] * p, q: P.cuerpo[4] ?? 1 }, g: P.cuerpo[2], a: 0.001, sat: 2.5 });
    osc(c, 'sine', P.sub[0] * p, t0, P.sub[2], { f1: P.sub[1] * p, g: P.sub[3], a: 0.002 });
    if (P.cola) ruido(c, t0 + 0.012, P.cola[2], { col: 'm', f: { t: 'lowpass', a: P.cola[0] * p, b: P.cola[1] * p, q: 0.7 }, g: P.cola[3], a: 0.02, rev: P.rev ?? 0.6 });
    if (P.eco) ruido(c, t0 + 0.03, 0.6, { col: 'r', f: { t: 'bandpass', a: 900 * p, b: 300 * p, q: 1 }, g: P.eco, a: 0.05, rev: 1 });
  };
  return { f, dur: ret + Math.max(P.cola ? P.cola[2] + 0.04 : 0, P.cuerpo[3], P.sub[2]) + 0.1 };
}
const arma = (nombre, P, ex = {}) => { const a = armaFuego(P); def(nombre, a.dur, a.f, { prio: 6, g: 0.55, enf: 0.02, max: 6, ...ex }); };

arma('mosquete',        { ret: 0.045, siseo: 1, crack: [1800, 0.05, 0.25], cuerpo: [900, 120, 0.45, 0.35], sub: [90, 35, 0.4, 0.5], cola: [500, 90, 1.8, 0.28], rev: 0.9, eco: 0.05 }, { prio: 7 });
arma('pistola_chispa',  { ret: 0.04, siseo: 1, crack: [2500, 0.04, 0.28], cuerpo: [1400, 200, 0.22, 0.25], sub: [140, 60, 0.2, 0.35], cola: [700, 150, 0.8, 0.15], rev: 0.5 });
arma('rifle_antiguo',   { ret: 0.02, crack: [2200, 0.05, 0.3], cuerpo: [1200, 150, 0.3, 0.45], sub: [100, 40, 0.3, 0.45], cola: [600, 100, 1.3, 0.2], rev: 0.8 }, { prio: 7 });
arma('trabuco',         { ret: 0.05, siseo: 1, crack: [1200, 0.07, 0.25], cuerpo: [700, 80, 0.5, 0.55, 0.9], sub: [70, 28, 0.6, 0.65], cola: [350, 60, 2.4, 0.35], rev: 1, eco: 0.08 }, { prio: 8 });
arma('carabina',        { ret: 0.03, siseo: 1, crack: [2000, 0.05, 0.28], cuerpo: [1000, 160, 0.3, 0.42], sub: [110, 45, 0.3, 0.45], cola: [550, 110, 1.2, 0.18], rev: 0.7 });
arma('rifle_palanca',   { crack: [2600, 0.04, 0.3], cuerpo: [1500, 200, 0.3, 0.4], sub: [120, 50, 0.25, 0.4], cola: [800, 150, 1.0, 0.15], rev: 0.5 });
arma('revolver',        { crack: [3000, 0.035, 0.35], cuerpo: [1800, 300, 0.28, 0.3], sub: [160, 70, 0.18, 0.35], cola: [900, 200, 0.7, 0.12], rev: 0.4 });
arma('rifle_pesado',    { crack: [2000, 0.05, 0.3], cuerpo: [900, 120, 0.35, 0.5], sub: [85, 35, 0.45, 0.5], cola: [500, 90, 1.6, 0.22], rev: 0.8 }, { prio: 7 });
arma('escopeta_doble',  { crack: [1500, 0.06, 0.3], cuerpo: [900, 110, 0.5, 0.5], sub: [80, 32, 0.5, 0.6], cola: [400, 80, 1.6, 0.3], rev: 0.8 }, { prio: 7 });
arma('recortada',       { crack: [1800, 0.05, 0.3], cuerpo: [1000, 130, 0.45, 0.4], sub: [90, 36, 0.4, 0.55], cola: [450, 90, 1.2, 0.25], rev: 0.6 });
arma('subfusil',        { crack: [3000, 0.03, 0.3], cuerpo: [1800, 250, 0.3, 0.16], sub: [150, 70, 0.1, 0.3], cola: [900, 200, 0.4, 0.1], rev: 0.3 }, { enf: 0.03 });
arma('pistola',         { crack: [3200, 0.03, 0.33], cuerpo: [2000, 300, 0.3, 0.22], sub: [170, 70, 0.14, 0.35], cola: [1000, 200, 0.6, 0.12], rev: 0.4 });
arma('fusil_cerrojo',   { crack: [2400, 0.05, 0.3], cuerpo: [1100, 140, 0.32, 0.4], sub: [95, 38, 0.4, 0.5], cola: [600, 100, 1.4, 0.22], rev: 0.8 }, { prio: 7 });
arma('carabina_m',      { crack: [3200, 0.03, 0.3], cuerpo: [2000, 250, 0.28, 0.15], sub: [140, 60, 0.1, 0.28], cola: [900, 200, 0.4, 0.09], rev: 0.3 });
arma('escopeta',        { crack: [1800, 0.05, 0.3], cuerpo: [1000, 120, 0.45, 0.4], sub: [90, 35, 0.4, 0.55], cola: [450, 80, 1.1, 0.28], rev: 0.7 }, { prio: 7 });
arma('fusil_asalto',    { crack: [3000, 0.04, 0.3], cuerpo: [1500, 200, 0.35, 0.2], sub: [120, 50, 0.15, 0.35], cola: [800, 150, 0.8, 0.15], rev: 0.4 });
arma('magnum',          { crack: [2400, 0.05, 0.35], cuerpo: [1100, 140, 0.4, 0.4], sub: [100, 38, 0.4, 0.55], cola: [600, 100, 1.4, 0.25], rev: 0.8 }, { prio: 7 });
arma('francotirador',   { crack: [2500, 0.06, 0.3], cuerpo: [1000, 120, 0.35, 0.55], sub: [90, 32, 0.5, 0.5], cola: [500, 80, 2.2, 0.3], rev: 1 }, { prio: 8 });
arma('subfusil_rapido', { crack: [3400, 0.025, 0.28], cuerpo: [2200, 300, 0.26, 0.1], sub: [160, 80, 0.08, 0.25], cola: [1000, 200, 0.35, 0.08], rev: 0.25 }, { enf: 0.03 });
arma('carabina_tactica',{ crack: [4000, 0.02, 0.26], cuerpo: [2400, 300, 0.3, 0.15], sub: [150, 70, 0.1, 0.3], cola: [1200, 250, 0.5, 0.1], rev: 0.4 });
arma('pistola_tactica', { crack: [3600, 0.025, 0.3], cuerpo: [2200, 300, 0.28, 0.14], sub: [180, 80, 0.1, 0.3], cola: [1100, 220, 0.5, 0.1], rev: 0.35 });
arma('antimaterial',    { crack: [1800, 0.08, 0.35], cuerpo: [800, 90, 0.5, 0.6], sub: [80, 26, 0.7, 0.7], cola: [400, 60, 2.8, 0.4], rev: 1.1, eco: 0.1 }, { prio: 9 });
arma('pdw',             { crack: [4000, 0.02, 0.22], cuerpo: [2600, 400, 0.22, 0.1], sub: [200, 90, 0.06, 0.2], cola: [1300, 300, 0.3, 0.07], rev: 0.25 }, { enf: 0.03 });
arma('escopeta_auto',   { crack: [2000, 0.04, 0.28], cuerpo: [1200, 160, 0.4, 0.25], sub: [100, 40, 0.2, 0.45], cola: [600, 100, 0.7, 0.2], rev: 0.5 });

// lanzagranadas: golpe hueco de tubo + «bloop»
def('lanzagranadas', 0.9, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 190 * p, t, 0.22, { f1: 55 * p, g: 0.55, a: 0.002 });
  ruido(c, t, 0.12, { f: { t: 'lowpass', a: 1800 * p, b: 200 * p }, g: 0.4, a: 0.001, sat: 2 });
  osc(c, 'triangle', 520 * p, t, 0.18, { f1: 140 * p, g: 0.2, a: 0.002 });
  ruido(c, t + 0.02, 0.7, { col: 'm', f: { t: 'lowpass', a: 500 * p, b: 90 * p }, g: 0.22, a: 0.02, rev: 0.7 });
}, { prio: 7, g: 0.8, enf: 0.05 });

// lanzacohetes: ignición, «whoomph» y estela de motor
def('lanzacohetes', 2.0, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.14, { f: { t: 'highpass', a: 2000 }, g: 0.3, a: 0.001, sat: 2 });
  ruido(c, t, 0.5, { col: 'r', f: { t: 'lowpass', a: 2500 * p, b: 220 * p, q: 0.8 }, g: 0.5, a: 0.004, sat: 2 });
  osc(c, 'sine', 120 * p, t, 0.6, { f1: 34 * p, g: 0.6, a: 0.004 });
  ruido(c, t + 0.03, 1.8, { col: 'r', f: { t: 'bandpass', a: 700 * p, b: 1700 * p, q: 0.5, d: 0.5 }, g: 0.28, a: 0.06, rev: 0.7 });
  ruido(c, t + 0.1, 1.6, { col: 'm', f: { t: 'lowpass', a: 600 * p, b: 120 * p }, g: 0.3, a: 0.08, rev: 0.8 });
}, { prio: 8, g: 0.8 });

// lanzallamas: una ráfaga corta (la reproducción continua usa el bucle `lanzallamas`)
def('lanzallamas', 1.2, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 1.1, { col: 'r', f: { t: 'bandpass', a: 500 * p, b: 1400 * p, q: 0.6, d: 0.25 }, g: 0.5, a: 0.03, s: 0.7, r: 0.3, d: 0.2, rev: 0.3 });
  ruido(c, t, 1.1, { col: 'm', f: { t: 'lowpass', a: 400 * p, q: 0.7 }, g: 0.35, a: 0.04, s: 0.8, r: 0.4, d: 0.3 });
}, { prio: 6, g: 0.8 });

def('molotov', 1.6, (c, t, o) => {
  const p = o.p;
  for (let i = 0; i < 9; i++) { // vidrio roto
    const tt = t + i * 0.012 + Math.random() * 0.01;
    osc(c, 'sine', (3200 + Math.random() * 3600) * p, tt, 0.07, { g: 0.1, a: 0.001 });
  }
  ruido(c, t, 0.12, { f: { t: 'highpass', a: 3500 }, g: 0.3, a: 0.001 });
  ruido(c, t + 0.05, 1.3, { col: 'r', f: { t: 'bandpass', a: 400 * p, b: 1300 * p, q: 0.6, d: 0.3 }, g: 0.5, a: 0.05, rev: 0.5 });
  osc(c, 'sine', 90 * p, t + 0.05, 0.6, { f1: 40, g: 0.35, a: 0.01 });
}, { prio: 7, g: 0.8 });

// armas de energía
def('pistola_plasma', 0.5, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 1100 * p, t, 0.32, { f1: 240 * p, g: 0.4, a: 0.002, fm: { r: 1.5, i0: 3.2, i1: 0.1 }, rev: 0.3 });
  osc(c, 'triangle', 330 * p, t, 0.3, { f1: 90 * p, g: 0.3, a: 0.002 });
  ruido(c, t, 0.06, { f: { t: 'highpass', a: 3000 }, g: 0.2, a: 0.001 });
}, { prio: 6, g: 0.85, enf: 0.04 });

def('rifle_pulsos', 0.28, (c, t, o) => {
  const p = o.p;
  osc(c, 'sawtooth', 2100 * p, t, 0.15, { f1: 380 * p, g: 0.3, a: 0.001, f: { t: 'lowpass', a: 6000, b: 900 } });
  osc(c, 'sine', 160 * p, t, 0.1, { f1: 70 * p, g: 0.4, a: 0.002 });
  ruido(c, t, 0.04, { f: { t: 'bandpass', a: 4000, q: 1 }, g: 0.22, a: 0.001 });
  osc(c, 'sine', 900 * p, t + 0.005, 0.2, { f1: 500 * p, g: 0.14, a: 0.003, rev: 0.4 });
}, { prio: 5, g: 0.85, enf: 0.03 });

def('agujas', 0.14, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 3400 * p, t, 0.08, { f1: 1500 * p, g: 0.28, a: 0.001, fm: { r: 2.01, i0: 2, i1: 0.1 } });
  ruido(c, t, 0.03, { f: { t: 'highpass', a: 6000 }, g: 0.18, a: 0.001 });
  osc(c, 'sine', 220 * p, t, 0.06, { f1: 110, g: 0.22, a: 0.001 });
}, { prio: 4, g: 0.9, enf: 0.03 });

def('proyector_ondas', 0.9, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 420 * p, t, 0.7, { f1: 55 * p, g: 0.5, a: 0.004, fm: { r: 0.5, i0: 2.2, i1: 0.1 }, rev: 0.5 });
  osc(c, 'sawtooth', 160 * p, t, 0.5, { f1: 48 * p, g: 0.3, a: 0.004, n: 3, sp: 25, f: { t: 'lowpass', a: 1800, b: 180 } });
  ruido(c, t, 0.35, { col: 'r', f: { t: 'bandpass', a: 2400 * p, b: 400 * p, q: 1.2 }, g: 0.3, a: 0.004 });
  osc(c, 'sine', 90 * p, t, 0.5, { f1: 32, g: 0.5, a: 0.003 });
}, { prio: 7, g: 0.75 });

def('canon_riel', 1.8, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.09, { f: { t: 'highpass', a: 1500 }, g: 0.4, a: 0.0006, sat: 3 });
  osc(c, 'sine', 90 * p, t, 0.6, { f1: 26 * p, g: 0.7, a: 0.002 });
  osc(c, 'sine', 2300 * p, t, 1.4, { f1: 2100 * p, g: 0.16, a: 0.001, fm: { r: 1.41, i0: 1.4, i1: 0.05 }, rev: 0.8 });
  osc(c, 'sine', 5200 * p, t, 0.5, { f1: 4400 * p, g: 0.1, a: 0.001 });
  osc(c, 'sawtooth', 900 * p, t, 0.3, { f1: 60 * p, g: 0.25, a: 0.001, f: { t: 'lowpass', a: 5000, b: 200 } });
  ruido(c, t + 0.02, 1.4, { col: 'm', f: { t: 'lowpass', a: 800 * p, b: 80 }, g: 0.3, a: 0.02, rev: 1 });
  ruido(c, t + 0.1, 0.6, { f: { t: 'bandpass', a: 6000, q: 3 }, g: 0.05, a: 0.05, rev: 0.5 });
}, { prio: 9, g: 0.7 });

def('canon_arco', 0.3, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.26, { f: { t: 'bandpass', a: 1800 * p, b: 3600 * p, q: 1.5 }, g: 0.4, a: 0.002, sat: 3 });
  osc(c, 'sawtooth', 58 * p, t, 0.26, { g: 0.35, a: 0.003, f: { t: 'highpass', a: 120 }, sat: 4, n: 2, sp: 30 });
  for (let i = 0; i < 5; i++) osc(c, 'square', (900 + Math.random() * 3000) * p, t + i * 0.045, 0.03, { g: 0.12, a: 0.001 });
  osc(c, 'sine', 100 * p, t, 0.2, { f1: 55, g: 0.3, a: 0.003 });
}, { prio: 5, g: 0.8, enf: 0.04 });

def('hoja_termica', 0.7, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.35, { col: 'r', f: { t: 'bandpass', a: 500 * p, b: 3500 * p, q: 0.9 }, g: 0.45, a: 0.04, sat: 1.5 });
  osc(c, 'sawtooth', 180 * p, t, 0.5, { f1: 700 * p, g: 0.16, a: 0.04, f: { t: 'lowpass', a: 900, b: 2600 }, rev: 0.3 });
  ruido(c, t + 0.1, 0.5, { f: { t: 'highpass', a: 5000 }, g: 0.14, a: 0.02 });
  osc(c, 'sine', 80 * p, t, 0.3, { f1: 45, g: 0.3, a: 0.004 });
}, { prio: 5, g: 0.85 });

def('singularidad', 2.4, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.7, { col: 'r', f: { t: 'bandpass', a: 200 * p, b: 5000 * p, q: 1.8 }, g: 0.3, a: 0.5, rev: 0.6 });
  osc(c, 'sawtooth', 70 * p, t, 0.7, { f1: 900 * p, g: 0.2, a: 0.5, f: { t: 'lowpass', a: 300, b: 3000 } });
  osc(c, 'sine', 1200 * p, t + 0.62, 1.4, { f1: 36 * p, g: 0.6, a: 0.005, rev: 0.6 });
  ruido(c, t + 0.62, 1.6, { col: 'm', f: { t: 'lowpass', a: 900 * p, b: 60, q: 1 }, g: 0.5, a: 0.006, rev: 1 });
  ruido(c, t + 0.62, 0.1, { f: { t: 'highpass', a: 1500 }, g: 0.25, a: 0.001 });
  osc(c, 'sine', 40 * p, t + 0.62, 1.6, { g: 0.5, a: 0.02 });
}, { prio: 9, g: 0.75 });

// ───────────────────────────── explosiones ─────────────────────────────
function explosion(tam, tipo) { // tam 0 pequeña · 1 media · 2 grande
  const durs = [1.4, 2.2, 3.4];
  return (c, t, o) => {
    const p = o.p, k = [0.8, 1, 1.25][tam];
    const polvora = tipo === 'polvora', din = tipo === 'dinamita', ener = tipo === 'energia';
    ruido(c, t, 0.08, { f: { t: 'highpass', a: 1200 }, g: 0.35, a: 0.0006, sat: 3 });
    ruido(c, t, 0.3 * k + 0.1, { col: 'r', f: { t: 'lowpass', a: (polvora ? 1800 : 3500) * p, b: 160 * p, q: 0.8 }, g: 0.55, a: 0.001, sat: 3 });
    osc(c, 'sine', 110 * p / k, t, 0.9 * k, { f1: 22 * p, g: 0.9, a: 0.002 });             // sub-grave
    osc(c, 'sine', 55 * p / k, t + 0.02, 1.4 * k, { f1: 28, g: 0.5, a: 0.01 });
    ruido(c, t + 0.03, durs[tam] * 0.8, { col: 'm', f: { t: 'lowpass', a: 700 * p, b: 60, q: 0.8 }, g: 0.5, a: 0.02, rev: 1 }); // cola
    // crepitar de escombros
    const n = 6 + tam * 4;
    for (let i = 0; i < n; i++) {
      const tt = t + 0.1 + Math.random() * 0.6 * k;
      ruido(c, tt, 0.05, { f: { t: 'bandpass', a: 1200 + Math.random() * 3500, q: 2 }, g: 0.06 + Math.random() * 0.05, a: 0.001, rev: 0.4 });
    }
    if (din) ruido(c, t, 0.18, { f: { t: 'bandpass', a: 2400, b: 500, q: 0.8 }, g: 0.3, a: 0.001 });
    if (ener) { osc(c, 'sine', 1800 * p, t, 0.8, { f1: 90, g: 0.3, a: 0.001, fm: { r: 1.5, i0: 3, i1: 0.1 }, rev: 0.6 }); }
    if (tam === 2) ruido(c, t + 0.25, 1.8, { col: 'm', f: { t: 'lowpass', a: 300, b: 45 }, g: 0.45, a: 0.1, rev: 1 });
  };
}
def('explosion_pequena', 1.5, explosion(0), { prio: 7, g: 0.7, enf: 0.04, max: 4 });
def('explosion', 2.4, explosion(1), { prio: 8, g: 0.62, enf: 0.04, max: 4 });
def('explosion_grande', 3.5, explosion(2), { prio: 9, g: 0.55, enf: 0.06, max: 3 });
def('explosion_polvora', 2.4, explosion(1, 'polvora'), { prio: 8, g: 0.62, enf: 0.04, max: 4 });
def('explosion_dinamita', 2.5, explosion(1, 'dinamita'), { prio: 8, g: 0.62, enf: 0.04, max: 4 });
def('explosion_energia', 2.4, explosion(1, 'energia'), { prio: 8, g: 0.62, enf: 0.04, max: 4 });

// ───────────────────────────── cuerpo a cuerpo ─────────────────────────────
def('tajo', 0.5, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.16, { f: { t: 'bandpass', a: 1200 * p, b: 4800 * p, q: 1.1, d: 0.12 }, g: 0.4, a: 0.025 });
  osc(c, 'sine', 2400 * p, t + 0.07, 0.35, { g: 0.05, a: 0.001, rev: 0.5 });
  osc(c, 'sine', 3350 * p, t + 0.07, 0.25, { g: 0.04, a: 0.001 });
  ruido(c, t + 0.08, 0.06, { f: { t: 'bandpass', a: 3000, q: 2 }, g: 0.12, a: 0.001 });
}, { prio: 5, g: 0.9, enf: 0.05 });
def('golpe_madera', 0.4, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 230 * p, t + 0.04, 0.15, { f1: 85 * p, g: 0.6, a: 0.001 });
  ruido(c, t + 0.04, 0.09, { f: { t: 'bandpass', a: 900 * p, q: 1.4 }, g: 0.4, a: 0.001 });
  osc(c, 'triangle', 520 * p, t + 0.04, 0.12, { f1: 380, g: 0.15, a: 0.001, rev: 0.3 });
  ruido(c, t, 0.14, { f: { t: 'bandpass', a: 600 * p, b: 2400 * p, q: 0.9 }, g: 0.2, a: 0.03 });
}, { prio: 5, g: 0.9, enf: 0.05 });
def('golpe_metal', 0.9, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.1, { f: { t: 'bandpass', a: 1800 * p, b: 600, q: 0.8 }, g: 0.3, a: 0.001 });
  [[1, 0.3, 0.55], [2.76, 0.22, 0.32], [5.4, 0.12, 0.2], [8.9, 0.07, 0.12]].forEach(([r, g, d]) => osc(c, 'sine', 330 * r * p, t + 0.02, d + 0.15, { g, a: 0.001, rev: 0.4 }));
  osc(c, 'sine', 100 * p, t + 0.02, 0.12, { f1: 55, g: 0.4, a: 0.001 });
}, { prio: 5, g: 0.85, enf: 0.05 });
def('golpe_cuerpo', 0.3, (c, t, o) => {
  ruido(c, t, 0.22, { f: { t: 'bandpass', a: 500 * o.p, b: 1800 * o.p, q: 0.8, d: 0.15 }, g: 0.25, a: 0.06 });
}, { prio: 3, g: 0.8, enf: 0.1 });
def('lanzar', 0.4, (c, t, o) => {
  ruido(c, t, 0.3, { f: { t: 'bandpass', a: 400 * o.p, b: 2200 * o.p, q: 0.9, d: 0.2 }, g: 0.3, a: 0.08 });
}, { prio: 3, g: 0.8, enf: 0.1 });

// ───────────────────────────── recargas y mecanismos ─────────────────────────────
const clic = (c, t, f, g = 0.3, d = 0.025) => {
  ruido(c, t, d, { f: { t: 'bandpass', a: f, q: 2.5 }, g, a: 0.0008 });
  osc(c, 'sine', f * 0.5, t, d * 1.6, { f1: f * 0.3, g: g * 0.8, a: 0.001 });
};
def('arma_vacia', 0.2, (c, t, o) => { clic(c, t, 3200 * o.p, 0.35, 0.02); clic(c, t + 0.035, 2000 * o.p, 0.18, 0.02); }, { prio: 4, g: 0.9, enf: 0.12 });
alias('sin_municion', 'arma_vacia');
def('cargador_sale', 0.3, (c, t, o) => {
  clic(c, t, 1800 * o.p, 0.22, 0.03);
  ruido(c, t + 0.03, 0.12, { f: { t: 'bandpass', a: 900, b: 600, q: 1 }, g: 0.12, a: 0.01 });
  clic(c, t + 0.14, 700 * o.p, 0.12, 0.03);
}, { prio: 3, g: 0.9, enf: 0.1 });
def('cargador_entra', 0.3, (c, t, o) => {
  ruido(c, t, 0.1, { f: { t: 'bandpass', a: 500, b: 1200, q: 1 }, g: 0.12, a: 0.01 });
  clic(c, t + 0.09, 1300 * o.p, 0.32, 0.04);
  osc(c, 'sine', 160, t + 0.09, 0.08, { f1: 80, g: 0.3, a: 0.002 });
}, { prio: 3, g: 0.9, enf: 0.1 });
def('cerrojo', 0.5, (c, t, o) => {
  clic(c, t, 1500 * o.p, 0.3, 0.04); ruido(c, t + 0.05, 0.1, { f: { t: 'bandpass', a: 1000, b: 1800, q: 1.5 }, g: 0.12, a: 0.01 });
  clic(c, t + 0.2, 2200 * o.p, 0.35, 0.03); osc(c, 'sine', 130, t + 0.2, 0.08, { f1: 70, g: 0.3, a: 0.002 });
}, { prio: 3, g: 0.9, enf: 0.1 });
def('recarga_cartucho', 0.3, (c, t, o) => {
  clic(c, t, 2600 * o.p, 0.22, 0.02); osc(c, 'sine', 1800 * o.p, t + 0.02, 0.1, { g: 0.05, a: 0.001 });
  osc(c, 'sine', 140, t + 0.03, 0.08, { f1: 70, g: 0.25, a: 0.002 });
}, { prio: 3, g: 0.9, enf: 0.08 });
def('bombeo', 0.45, (c, t, o) => {
  ruido(c, t, 0.08, { f: { t: 'bandpass', a: 800, b: 1400, q: 1 }, g: 0.2, a: 0.005 });
  clic(c, t + 0.02, 1400 * o.p, 0.3, 0.035);
  clic(c, t + 0.2, 1000 * o.p, 0.34, 0.04); osc(c, 'sine', 120, t + 0.2, 0.08, { f1: 60, g: 0.35, a: 0.002 });
}, { prio: 3, g: 0.9, enf: 0.1 });
def('recarga_polvora', 1.7, (c, t, o) => {
  ruido(c, t, 0.4, { f: { t: 'highpass', a: 3500 }, g: 0.08, a: 0.06 });                    // verter pólvora
  for (let i = 0; i < 4; i++) { const tt = t + 0.5 + i * 0.16; ruido(c, tt, 0.1, { f: { t: 'bandpass', a: 700 * o.p, q: 2 }, g: 0.14, a: 0.004 }); osc(c, 'sine', 120 * o.p, tt, 0.09, { f1: 70, g: 0.2, a: 0.002 }); }
  clic(c, t + 1.3, 1200 * o.p, 0.3, 0.05); clic(c, t + 1.48, 2400 * o.p, 0.25, 0.03);
}, { prio: 3, g: 0.9, enf: 0.2 });
def('recarga_energia', 1.0, (c, t, o) => {
  osc(c, 'sine', 300 * o.p, t, 0.7, { f1: 1900 * o.p, g: 0.12, a: 0.05, fm: { r: 2, i0: 0.5, i1: 0.1 }, rev: 0.3 });
  clic(c, t + 0.72, 1800, 0.25, 0.03); osc(c, 'sine', 880 * o.p, t + 0.74, 0.2, { g: 0.08, a: 0.003, rev: 0.4 });
}, { prio: 3, g: 0.9, enf: 0.2 });
def('casquillo', 0.8, (c, t, o) => {
  const f = (3000 + o.r * 900) * o.p;
  [0, 0.13, 0.22].forEach((d, i) => { osc(c, 'sine', f * (1 - i * 0.08), t + d, 0.1, { g: 0.06 / (i + 1), a: 0.001 }); osc(c, 'sine', f * 1.5, t + d, 0.06, { g: 0.03 / (i + 1), a: 0.001, rev: 0.3 }); });
}, { prio: 1, g: 0.8, enf: 0.06, max: 4 });
def('cambio_arma', 0.4, (c, t, o) => {
  ruido(c, t, 0.15, { f: { t: 'bandpass', a: 700, b: 1600, q: 0.8 }, g: 0.14, a: 0.03 }); clic(c, t + 0.12, 1700 * o.p, 0.25, 0.03);
}, { prio: 3, g: 0.9, enf: 0.1 });
def('arma_sobrecalentada', 1.2, (c, t, o) => {
  ruido(c, t, 0.9, { f: { t: 'highpass', a: 3000 }, g: 0.2, a: 0.02, s: 0.5, r: 0.3 });
  for (let i = 0; i < 3; i++) osc(c, 'square', 1500, t + i * 0.2, 0.08, { g: 0.08, a: 0.002, f: { t: 'lowpass', a: 3000 } });
}, { prio: 5, g: 0.85, enf: 0.5 });
def('arma_fria', 0.5, (c, t, o) => { osc(c, 'sine', 1320 * o.p, t, 0.4, { g: 0.1, a: 0.003, rev: 0.4 }); osc(c, 'sine', 1980 * o.p, t, 0.3, { g: 0.05, a: 0.003 }); }, { prio: 3, g: 0.9, enf: 0.3 });

// ───────────────────────────── impactos ─────────────────────────────
def('impacto_carne', 0.4, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 170 * p, t, 0.14, { f1: 55 * p, g: 0.55, a: 0.001 });
  ruido(c, t, 0.1, { col: 'r', f: { t: 'lowpass', a: 1600 * p, b: 300, q: 1 }, g: 0.4, a: 0.001, sat: 2 });
  ruido(c, t + 0.02, 0.18, { f: { t: 'bandpass', a: 1100 * p, b: 500, q: 2 }, g: 0.12, a: 0.01 });  // chapoteo
}, { prio: 3, g: 0.85, enf: 0.04, max: 5 });
def('impacto_metal', 0.8, (c, t, o) => {
  const p = o.p, f = (1500 + o.r * 800) * p;
  ruido(c, t, 0.03, { f: { t: 'bandpass', a: 4000, q: 1 }, g: 0.28, a: 0.0008 });
  osc(c, 'sine', f, t, 0.5, { g: 0.2, a: 0.001, rev: 0.4 }); osc(c, 'sine', f * 1.83, t, 0.35, { g: 0.12, a: 0.001 }); osc(c, 'sine', f * 2.76, t, 0.2, { g: 0.08, a: 0.001 });
  osc(c, 'sine', 180, t, 0.06, { f1: 90, g: 0.3, a: 0.001 });
}, { prio: 3, g: 0.85, enf: 0.04, max: 5 });
def('impacto_madera', 0.45, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 260 * p, t, 0.1, { f1: 100, g: 0.5, a: 0.001 });
  ruido(c, t, 0.08, { f: { t: 'bandpass', a: 1200 * p, q: 1.6 }, g: 0.35, a: 0.001 });
  for (let i = 0; i < 3; i++) ruido(c, t + 0.03 + i * 0.03, 0.03, { f: { t: 'bandpass', a: 2500 + Math.random() * 2000, q: 3 }, g: 0.07, a: 0.001 });
}, { prio: 3, g: 0.85, enf: 0.04, max: 5 });
def('impacto_piedra', 0.4, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.05, { f: { t: 'bandpass', a: 2800 * p, b: 1200, q: 1.2 }, g: 0.4, a: 0.0008 });
  osc(c, 'sine', 140 * p, t, 0.1, { f1: 60, g: 0.4, a: 0.001 });
  for (let i = 0; i < 3; i++) osc(c, 'sine', (2200 + Math.random() * 1600) * p, t + 0.04 + i * 0.035, 0.05, { g: 0.05, a: 0.001 });
}, { prio: 3, g: 0.85, enf: 0.04, max: 5 });
def('impacto_energia', 0.4, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.12, { f: { t: 'bandpass', a: 4500 * p, b: 1500, q: 2 }, g: 0.25, a: 0.001, sat: 2 });
  osc(c, 'sawtooth', 900 * p, t, 0.14, { f1: 150, g: 0.2, a: 0.001, f: { t: 'lowpass', a: 4000, b: 400 } });
  osc(c, 'sine', 120, t, 0.1, { f1: 60, g: 0.3, a: 0.001 });
}, { prio: 3, g: 0.85, enf: 0.04, max: 5 });
def('impacto_suelo', 0.3, (c, t, o) => {
  ruido(c, t, 0.1, { col: 'r', f: { t: 'lowpass', a: 1500 * o.p, b: 250 }, g: 0.35, a: 0.001 });
  osc(c, 'sine', 110, t, 0.08, { f1: 50, g: 0.3, a: 0.001 });
}, { prio: 2, g: 0.8, enf: 0.05, max: 4 });
def('rebote', 0.5, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 2800 * p, t, 0.28, { f1: 900 * p, g: 0.22, a: 0.001, fm: { r: 1.3, i0: 1.2, i1: 0.1 }, rev: 0.4 });
  ruido(c, t, 0.04, { f: { t: 'bandpass', a: 4500, q: 2 }, g: 0.25, a: 0.0008 });
  osc(c, 'sine', 1900 * p, t, 0.12, { g: 0.1, a: 0.001 });
}, { prio: 3, g: 0.85, enf: 0.06, max: 4 });
def('critico', 0.5, (c, t, o) => {
  osc(c, 'sine', 1760 * o.p, t, 0.35, { g: 0.15, a: 0.001, rev: 0.5 }); osc(c, 'sine', 2640 * o.p, t, 0.22, { g: 0.08, a: 0.001 });
  osc(c, 'sine', 90, t, 0.12, { f1: 45, g: 0.35, a: 0.001 });
}, { prio: 4, g: 0.85, enf: 0.1, max: 3 });
def('choque_pesado', 1.4, (c, t, o) => {
  const p = o.p;
  osc(c, 'sine', 120 * p, t, 0.5, { f1: 30, g: 0.75, a: 0.002 });
  ruido(c, t, 0.4, { col: 'r', f: { t: 'lowpass', a: 2200 * p, b: 150, q: 0.8 }, g: 0.5, a: 0.001, sat: 2.5 });
  [[1, 0.2], [2.4, 0.12], [3.7, 0.08]].forEach(([r, g]) => osc(c, 'sine', 210 * r * p, t, 0.6, { g, a: 0.001, rev: 0.5 }));
  ruido(c, t + 0.05, 1.1, { col: 'm', f: { t: 'lowpass', a: 500, b: 60 }, g: 0.3, a: 0.02, rev: 0.8 });
}, { prio: 8, g: 0.7, enf: 0.15 });

// ───────────────────────────── fuego, ácido, gas, zonas ─────────────────────────────
def('llamarada', 1.6, (c, t, o) => {
  ruido(c, t, 1.4, { col: 'r', f: { t: 'bandpass', a: 300 * o.p, b: 1400 * o.p, q: 0.6, d: 0.25 }, g: 0.45, a: 0.05, rev: 0.4 });
  osc(c, 'sine', 80, t, 0.8, { f1: 40, g: 0.4, a: 0.02 });
  for (let i = 0; i < 8; i++) ruido(c, t + 0.1 + Math.random() * 1, 0.04, { f: { t: 'bandpass', a: 1500 + Math.random() * 3000, q: 3 }, g: 0.05, a: 0.001 });
}, { prio: 5, g: 0.8, enf: 0.3, max: 3 });
def('acido', 1.2, (c, t, o) => {
  ruido(c, t, 1.0, { f: { t: 'bandpass', a: 5500 * o.p, b: 3000, q: 1.5 }, g: 0.18, a: 0.05, rev: 0.3 });
  for (let i = 0; i < 10; i++) {
    const tt = t + Math.random() * 0.9, f = 300 + Math.random() * 700;
    osc(c, 'sine', f * o.p, tt, 0.07, { f1: f * 2.2 * o.p, g: 0.1, a: 0.002 });
  }
}, { prio: 4, g: 0.85, enf: 0.25, max: 3 });
def('gas', 1.4, (c, t, o) => {
  ruido(c, t, 1.3, { f: { t: 'bandpass', a: 2500 * o.p, b: 1500, q: 0.7 }, g: 0.25, a: 0.12, s: 0.7, r: 0.4, rev: 0.4 });
  ruido(c, t, 1.2, { col: 'r', f: { t: 'lowpass', a: 700 }, g: 0.2, a: 0.1, s: 0.6, r: 0.4 });
}, { prio: 4, g: 0.85, enf: 0.3, max: 3 });
def('zona_gravedad', 2.0, (c, t, o) => {
  osc(c, 'sine', 60, t, 1.8, { f1: 30, g: 0.4, a: 0.15 });
  ruido(c, t, 1.8, { col: 'r', f: { t: 'bandpass', a: 300, b: 3000, q: 2 }, g: 0.2, a: 0.6, rev: 0.7 });
}, { prio: 5, g: 0.8, enf: 0.3 });

// ───────────────────────────── voces de zombi ─────────────────────────────
const VOCALES = { a: [[800, 7, 1], [1200, 9, 0.6]], o: [[500, 7, 1], [900, 9, 0.5]], u: [[320, 6, 1], [800, 8, 0.4]], e: [[560, 8, 1], [1900, 10, 0.4]] };
function gruñido(P) {
  return (c, t, o) => {
    const p = o.p * (0.94 + o.r * 0.12);
    const f0 = P.f0 * p, f1 = P.f1 * p;
    const vocal = (P.v || 'o');
    const [F1, F2] = VOCALES[vocal];
    const l = [[F1[0] * (P.fk ?? 1), F1[1], F1[2], F1[0] * (P.fk ?? 1) * 1.5], [F2[0] * (P.fk ?? 1), F2[1], F2[2] * 0.8, F2[0] * (P.fk ?? 1) * 0.7]];
    formantes(c, t, P.dur, f0, f1, l, { g: P.g ?? 0.6, a: P.a ?? 0.12, s: 0.8, d: P.dur * 0.3, r: P.dur * 0.35, rasp: P.rasp ?? 0.6, raspHz: P.raspHz ?? 30, aire: P.aire ?? 0.5, vib: P.vib, sat: P.sat ?? 2, f: { t: 'lowpass', a: P.lp ?? 3500, q: 0.5 }, rev: P.rev ?? 0.35 });
    if (P.sub) osc(c, 'sine', f0 * 0.5, t, P.dur, { f1: f1 * 0.5, g: P.sub, a: 0.12, s: 0.8, r: P.dur * 0.3 });
  };
}
def('zombi_caminante', 1.5, gruñido({ f0: 105, f1: 62, dur: 1.2, v: 'o', rasp: 0.7, aire: 0.6 }), { prio: 3, g: 0.8, enf: 0.12, max: 4 });
def('zombi_corredor', 1.0, gruñido({ f0: 190, f1: 120, dur: 0.7, v: 'a', rasp: 0.8, raspHz: 40, aire: 0.9, a: 0.05 }), { prio: 3, g: 0.8, enf: 0.12, max: 4 });
def('zombi_acorazado', 1.6, (c, t, o) => {
  gruñido({ f0: 78, f1: 52, dur: 1.3, v: 'u', rasp: 0.6, sub: 0.2, rev: 0.5 })(c, t, o);
  [[1, 0.1], [2.76, 0.07], [5.4, 0.04]].forEach(([r, g]) => osc(c, 'sine', 240 * r * o.p, t + 0.05, 0.4, { g, a: 0.001, rev: 0.4 })); // chapa
  ruido(c, t + 0.05, 0.1, { f: { t: 'bandpass', a: 1800, q: 1 }, g: 0.1, a: 0.002 });
}, { prio: 4, g: 0.8, enf: 0.2, max: 3 });
def('zombi_escupidor', 1.3, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.9, { f: { t: 'bandpass', a: 4500 * p, b: 7500 * p, q: 2, d: 0.5 }, g: 0.18, a: 0.08, s: 0.8, r: 0.3 });
  osc(c, 'sine', 140 * p, t, 0.9, { f1: 100 * p, g: 0.18, a: 0.1, fm: { r: 0.25, i0: 5, i1: 2 } });
  for (let i = 0; i < 5; i++) { const tt = t + 0.15 + i * 0.11; osc(c, 'sine', (250 + o.r * 120 + i * 40) * p, tt, 0.07, { f1: 700 * p, g: 0.1, a: 0.002 }); }
  ruido(c, t + 0.95, 0.12, { f: { t: 'bandpass', a: 1500, q: 1.2 }, g: 0.22, a: 0.002 });
}, { prio: 4, g: 0.85, enf: 0.3, max: 3 });
def('zombi_apestado', 1.6, (c, t, o) => {
  const p = o.p;
  for (let i = 0; i < 9; i++) {
    const tt = t + i * 0.11 + Math.random() * 0.05, f = (160 + Math.random() * 180) * p;
    osc(c, 'sine', f, tt, 0.09, { f1: f * 2.8, g: 0.18, a: 0.003, rev: 0.2 });
  }
  gruñido({ f0: 70, f1: 48, dur: 1.2, v: 'u', rasp: 0.9, raspHz: 14, aire: 0.9, lp: 1400, rev: 0.4 })(c, t + 0.1, o);
  ruido(c, t, 1.3, { col: 'r', f: { t: 'lowpass', a: 600, b: 200 }, g: 0.18, a: 0.1, s: 0.6, r: 0.3 });
}, { prio: 4, g: 0.85, enf: 0.3, max: 3 });
def('zombi_mole', 2.4, (c, t, o) => {
  const p = o.p;
  gruñido({ f0: 58, f1: 34, dur: 1.9, v: 'o', rasp: 0.8, raspHz: 22, aire: 0.4, sub: 0.55, sat: 3.5, lp: 1800, rev: 0.7, fk: 0.7, a: 0.2 })(c, t, o);
  ruido(c, t, 1.9, { col: 'm', f: { t: 'lowpass', a: 400 * p, b: 80 }, g: 0.3, a: 0.2, s: 0.7, r: 0.5, rev: 0.6 });
}, { prio: 7, g: 0.7, enf: 0.3, max: 2 });
alias('mole_rugido', 'zombi_mole', { prio: 8 });
def('zombi_aullador', 2.0, (c, t, o) => {
  const p = o.p;
  formantes(c, t, 1.7, 820 * p, 2300 * p, [[1100, 10, 1, 2600], [3200, 12, 0.7, 4200]], { g: 0.4, a: 0.15, s: 0.85, d: 0.4, r: 0.5, vib: [7.5, 45], aire: 0.25, sat: 2.5, rasp: 0.25, raspHz: 55, rev: 0.7 });
  osc(c, 'sawtooth', 1650 * p, t + 0.1, 1.5, { f1: 3400 * p, g: 0.08, a: 0.2, s: 0.8, r: 0.5, f: { t: 'bandpass', a: 2500, q: 2 }, vib: [8, 60, 0.2] });
  ruido(c, t, 1.6, { f: { t: 'bandpass', a: 3500, b: 6000, q: 1.2 }, g: 0.08, a: 0.2, s: 0.8, r: 0.5 });
}, { prio: 7, g: 0.75, enf: 0.4, max: 2 });
alias('aullador_grito', 'zombi_aullador', { prio: 8 });
def('zombi_detonador', 1.3, (c, t, o) => {
  const p = o.p;
  gruñido({ f0: 150, f1: 210, dur: 0.9, v: 'e', rasp: 0.9, raspHz: 45, aire: 0.6 })(c, t, o);
  ruido(c, t, 1.2, { f: { t: 'highpass', a: 4000 }, g: 0.07, a: 0.05, s: 0.8, r: 0.3 });
  osc(c, 'square', 2400 * p, t + 0.5, 0.06, { g: 0.07, a: 0.002, f: { t: 'lowpass', a: 5000 } });
  osc(c, 'square', 2400 * p, t + 0.75, 0.06, { g: 0.07, a: 0.002, f: { t: 'lowpass', a: 5000 } });
}, { prio: 4, g: 0.85, enf: 0.3, max: 2 });
def('zombi_ataque', 0.7, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.18, { f: { t: 'bandpass', a: 700 * p, b: 1800 * p, q: 1, d: 0.1 }, g: 0.18, a: 0.03 });
  gruñido({ f0: 130, f1: 80, dur: 0.4, v: 'a', rasp: 0.9, aire: 0.8, g: 0.45, a: 0.03 })(c, t + 0.02, o);
}, { prio: 3, g: 0.85, enf: 0.1, max: 3 });
def('zombi_muerte', 1.2, (c, t, o) => {
  const p = o.p;
  gruñido({ f0: 140, f1: 45, dur: 0.9, v: 'o', rasp: 0.7, aire: 0.8, g: 0.5, a: 0.04 })(c, t, o);
  osc(c, 'sine', 110, t + 0.5, 0.2, { f1: 50, g: 0.25, a: 0.002 });
  ruido(c, t + 0.52, 0.14, { col: 'r', f: { t: 'lowpass', a: 900, b: 200 }, g: 0.2, a: 0.002 });
}, { prio: 3, g: 0.85, enf: 0.08, max: 4 });
def('zombi_aparece', 1.4, (c, t, o) => { // emergen de la tierra
  ruido(c, t, 0.8, { col: 'r', f: { t: 'lowpass', a: 500, b: 1500, q: 0.8 }, g: 0.22, a: 0.2, s: 0.6, r: 0.3 });
  gruñido({ f0: 90, f1: 65, dur: 0.9, v: 'o', rasp: 0.8, aire: 0.5, g: 0.4, a: 0.2 })(c, t + 0.2, o);
}, { prio: 2, g: 0.8, enf: 0.2, max: 3 });
def('zombi_dolor', 0.5, gruñido({ f0: 170, f1: 110, dur: 0.35, v: 'a', rasp: 0.6, aire: 0.7, g: 0.45, a: 0.02 }), { prio: 2, g: 0.8, enf: 0.15, max: 3 });

// ───────────────────────────── jefes ─────────────────────────────
def('jefe_coracero', 3.0, (c, t, o) => { // bramido grave con eco de bocina
  gruñido({ f0: 70, f1: 42, dur: 2.2, v: 'o', rasp: 0.5, raspHz: 18, aire: 0.3, sub: 0.5, sat: 3, lp: 2200, rev: 0.9, fk: 0.8, a: 0.25 })(c, t, o);
  osc(c, 'sawtooth', 110, t + 0.1, 2.2, { f1: 104, g: 0.22, a: 0.3, s: 0.8, r: 0.6, n: 3, sp: 14, f: { t: 'lowpass', a: 900 }, rev: 0.8 });
  osc(c, 'sawtooth', 165, t + 0.1, 2.2, { f1: 156, g: 0.12, a: 0.3, s: 0.8, r: 0.6, n: 3, sp: 14, f: { t: 'lowpass', a: 900 }, rev: 0.8 });
  for (let i = 0; i < 6; i++) osc(c, 'sine', 800 + Math.random() * 1500, t + 0.15 + i * 0.1, 0.25, { g: 0.03, a: 0.001, rev: 0.5 }); // armadura
}, { prio: 10, g: 0.65, enf: 0.5, max: 1 });
def('jefe_fogonero', 3.0, (c, t, o) => {
  gruñido({ f0: 62, f1: 38, dur: 2.2, v: 'u', rasp: 0.7, raspHz: 16, aire: 0.5, sub: 0.45, sat: 3, lp: 1700, rev: 0.8, a: 0.2 })(c, t, o);
  ruido(c, t + 0.4, 2.2, { f: { t: 'highpass', a: 3500 }, g: 0.1, a: 0.3, s: 0.7, r: 0.8, rev: 0.4 });           // escape de vapor
  osc(c, 'triangle', 330, t, 1.5, { f1: 300, g: 0.1, a: 0.05, s: 0.8, r: 0.5, vib: [5, 20], rev: 0.5 });          // silbato de caldera
  for (let i = 0; i < 4; i++) osc(c, 'sine', 90 + o.r * 10, t + 0.3 + i * 0.28, 0.2, { f1: 40, g: 0.3, a: 0.003 });
}, { prio: 10, g: 0.65, enf: 0.5, max: 1 });
def('jefe_mariscal', 3.0, (c, t, o) => {
  gruñido({ f0: 100, f1: 55, dur: 1.9, v: 'a', rasp: 0.7, aire: 0.4, sub: 0.35, sat: 3, lp: 2600, rev: 0.8, a: 0.1 })(c, t, o);
  osc(c, 'sawtooth', 233, t, 2.4, { g: 0.16, a: 0.04, s: 0.7, r: 0.7, n: 4, sp: 18, f: { t: 'lowpass', a: 700, b: 2200, d: 0.15 }, rev: 0.8 }); // trompa de guerra
  osc(c, 'sawtooth', 350, t + 0.02, 2.4, { g: 0.12, a: 0.04, s: 0.7, r: 0.7, n: 4, sp: 18, f: { t: 'lowpass', a: 700, b: 2200, d: 0.15 }, rev: 0.8 });
  for (let i = 0; i < 8; i++) ruido(c, t + 1.0 + i * 0.07, 0.06, { f: { t: 'bandpass', a: 2800, q: 1 }, g: 0.18, a: 0.001, rev: 0.3 });
}, { prio: 10, g: 0.65, enf: 0.5, max: 1 });
def('jefe_rey_asfalto', 3.0, (c, t, o) => {
  gruñido({ f0: 72, f1: 40, dur: 2.0, v: 'o', rasp: 0.9, raspHz: 38, aire: 0.4, sub: 0.4, sat: 4, lp: 2200, rev: 0.7, a: 0.15 })(c, t, o);
  for (let i = 0; i < 3; i++) osc(c, 'sawtooth', 45, t + 0.3 + i * 0.5, 0.45, { f1: 130 + i * 20, g: 0.2, a: 0.02, sat: 4, f: { t: 'lowpass', a: 700, b: 1400 }, rev: 0.4 }); // acelerones
  ruido(c, t + 1.8, 0.6, { f: { t: 'bandpass', a: 1800, b: 900, q: 1 }, g: 0.12, a: 0.02, rev: 0.4 });
}, { prio: 10, g: 0.65, enf: 0.5, max: 1 });
def('jefe_paciente_cero', 3.2, (c, t, o) => {
  gruñido({ f0: 120, f1: 50, dur: 2.2, v: 'e', rasp: 1, raspHz: 31, aire: 0.7, sub: 0.3, sat: 4, lp: 3000, rev: 0.9, a: 0.1 })(c, t, o);
  for (let i = 0; i < 12; i++) osc(c, 'square', 300 + Math.random() * 2200, t + 0.2 + i * 0.12, 0.05, { g: 0.05, a: 0.001, f: { t: 'bandpass', a: 1500, q: 2 }, rev: 0.4 }); // cortes digitales
  ruido(c, t, 2.4, { col: 'r', f: { t: 'bandpass', a: 700, b: 2400, q: 3, d: 2 }, g: 0.1, a: 0.3, s: 0.6, r: 0.8, rev: 0.7 });
}, { prio: 10, g: 0.65, enf: 0.5, max: 1 });
def('jefe_omega', 4.0, (c, t, o) => {
  [110, 164.8, 220, 277.2, 329.6].forEach((f, i) => osc(c, 'sawtooth', f, t + i * 0.12, 3.2, { f1: f * 0.5, fd: 3, g: 0.13, a: 0.5, s: 0.8, r: 1, n: 3, sp: 25, f: { t: 'lowpass', a: 600, b: 3500, d: 1.5 }, rev: 0.9 }));
  osc(c, 'sine', 55, t, 3.4, { f1: 28, g: 0.55, a: 0.3, s: 0.8, r: 0.8 });
  osc(c, 'sine', 1400, t, 3, { f1: 220, g: 0.1, a: 0.6, s: 0.7, r: 1, fm: { r: 1.5, i0: 2, i1: 0.3 }, rev: 0.8 });
  ruido(c, t, 3.2, { f: { t: 'bandpass', a: 400, b: 5000, q: 1.5, d: 2.5 }, g: 0.14, a: 0.8, s: 0.6, r: 0.8, rev: 0.7 });
}, { prio: 10, g: 0.62, enf: 0.5, max: 1 });
def('jefe_ataque', 1.2, (c, t, o) => {
  const p = o.p;
  ruido(c, t, 0.5, { col: 'r', f: { t: 'bandpass', a: 200 * p, b: 2000 * p, q: 0.9, d: 0.3 }, g: 0.35, a: 0.12, rev: 0.5 });
  gruñido({ f0: 90 * p, f1: 55 * p, dur: 0.7, v: 'a', rasp: 0.8, aire: 0.5, sub: 0.3, sat: 3, g: 0.45, a: 0.08, rev: 0.6 })(c, t + 0.05, { p: 1, r: o.r });
  osc(c, 'sine', 80, t + 0.45, 0.4, { f1: 30, g: 0.5, a: 0.003 });
}, { prio: 8, g: 0.7, enf: 0.2, max: 2 });
def('jefe_fase', 2.4, (c, t, o) => {
  osc(c, 'sine', 70, t, 1.8, { f1: 24, g: 0.8, a: 0.01 });
  ruido(c, t, 1.4, { col: 'm', f: { t: 'lowpass', a: 600, b: 60 }, g: 0.5, a: 0.02, rev: 1 });
  osc(c, 'sawtooth', 82, t, 2.0, { f1: 41, g: 0.2, a: 0.05, s: 0.7, r: 0.8, n: 4, sp: 30, f: { t: 'lowpass', a: 500, b: 3000, d: 0.3 }, rev: 0.8 });
  ruido(c, t, 0.12, { f: { t: 'highpass', a: 1500 }, g: 0.3, a: 0.001, sat: 3 });
}, { prio: 10, g: 0.65, enf: 0.4, max: 1 });
def('jefe_muerte', 4.0, (c, t, o) => {
  gruñido({ f0: 90, f1: 22, dur: 3.0, v: 'o', rasp: 0.9, raspHz: 14, aire: 0.5, sub: 0.5, sat: 3, lp: 1500, rev: 1, a: 0.2 })(c, t, o);
  osc(c, 'sine', 120, t + 1.2, 2.5, { f1: 18, g: 0.7, a: 0.01 });
  ruido(c, t + 1.2, 2.5, { col: 'm', f: { t: 'lowpass', a: 700, b: 40 }, g: 0.5, a: 0.02, rev: 1 });
  for (let i = 0; i < 10; i++) ruido(c, t + 1.4 + i * 0.18, 0.1, { col: 'r', f: { t: 'lowpass', a: 900, b: 200 }, g: 0.15, a: 0.002, rev: 0.6 });
}, { prio: 10, g: 0.62, enf: 0.5, max: 1 });

// ───────────────────────────── jugador ─────────────────────────────
def('jugador_danio', 0.6, (c, t, o) => {
  const p = o.p * (o.r < 0.5 ? 1 : 1.18);
  gruñido({ f0: 175 * p, f1: 120 * p, dur: 0.32, v: o.r < 0.5 ? 'a' : 'e', rasp: 0.2, aire: 0.5, g: 0.5, a: 0.015, vib: [14, 20], rev: 0.25 })(c, t, { p: 1, r: o.r });
  osc(c, 'sine', 95, t, 0.1, { f1: 55, g: 0.28, a: 0.002 });
}, { prio: 6, g: 0.85, enf: 0.18, max: 2 });
def('jugador_muerte', 1.8, (c, t, o) => {
  gruñido({ f0: 210 * o.p, f1: 70 * o.p, dur: 1.2, v: 'o', rasp: 0.25, aire: 0.55, g: 0.5, a: 0.04, vib: [9, 25], rev: 0.5 })(c, t, { p: 1, r: o.r });
  osc(c, 'sine', 80, t + 0.9, 0.5, { f1: 30, g: 0.5, a: 0.003 });
  ruido(c, t + 0.9, 0.4, { col: 'r', f: { t: 'lowpass', a: 800, b: 120 }, g: 0.25, a: 0.003, rev: 0.4 });
}, { prio: 9, g: 0.8, enf: 0.5, max: 2 });
def('jugador_caido', 1.4, (c, t, o) => {
  osc(c, 'sine', 100, t, 0.3, { f1: 38, g: 0.6, a: 0.002 });
  ruido(c, t, 0.2, { col: 'r', f: { t: 'lowpass', a: 1200, b: 180 }, g: 0.4, a: 0.002 });
  gruñido({ f0: 150 * o.p, f1: 90 * o.p, dur: 0.9, v: 'o', rasp: 0.3, aire: 0.7, g: 0.35, a: 0.1, vib: [6, 30], rev: 0.5 })(c, t + 0.1, { p: 1, r: o.r });
}, { prio: 9, g: 0.8, enf: 0.4, max: 2 });
def('reanimar', 1.2, (c, t, o) => {
  ruido(c, t, 0.5, { col: 'r', f: { t: 'bandpass', a: 600, b: 1800, q: 1 }, g: 0.18, a: 0.15 });                 // bocanada
  [0, 0.28].forEach((d) => { osc(c, 'sine', 75, t + 0.3 + d, 0.18, { f1: 45, g: 0.45, a: 0.004 }); });          // latido
  [523.25, 659.25, 783.99].forEach((f, i) => osc(c, 'sine', f, t + 0.55 + i * 0.07, 0.5, { g: 0.1, a: 0.01, rev: 0.6 }));
}, { prio: 8, g: 0.85, enf: 0.3 });
def('curacion', 1.0, (c, t, o) => {
  [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { osc(c, 'sine', f * o.p, t + i * 0.06, 0.5, { g: 0.12, a: 0.008, rev: 0.7 }); osc(c, 'triangle', f * 2 * o.p, t + i * 0.06, 0.3, { g: 0.03, a: 0.008 }); });
}, { prio: 4, g: 0.85, enf: 0.25 });
def('habilidad_lista', 0.9, (c, t, o) => {
  osc(c, 'sine', 880, t, 0.35, { g: 0.12, a: 0.004, rev: 0.6 }); osc(c, 'sine', 1318.5, t + 0.1, 0.5, { g: 0.12, a: 0.004, rev: 0.6 });
  osc(c, 'triangle', 1760, t + 0.1, 0.3, { g: 0.04, a: 0.004 });
}, { prio: 5, g: 0.85, enf: 0.5 });
def('habilidad_generica', 1.0, (c, t, o) => {
  osc(c, 'sawtooth', 200, t, 0.6, { f1: 900, g: 0.16, a: 0.03, f: { t: 'lowpass', a: 600, b: 4000 }, rev: 0.4 });
  osc(c, 'sine', 70, t, 0.4, { f1: 40, g: 0.4, a: 0.005 });
  osc(c, 'sine', 1200, t + 0.35, 0.5, { g: 0.1, a: 0.004, rev: 0.6 });
}, { prio: 6, g: 0.85, enf: 0.3 });
def('habilidad_supresion', 1.4, (c, t, o) => {
  osc(c, 'sawtooth', 120, t, 0.9, { f1: 520, g: 0.18, a: 0.05, f: { t: 'lowpass', a: 500, b: 2800 }, rev: 0.3 });
  for (let i = 0; i < 8; i++) clic(c, t + 0.4 + i * 0.07, 1800 + i * 150, 0.15, 0.02);
  osc(c, 'sine', 60, t + 0.9, 0.4, { f1: 40, g: 0.4, a: 0.005 });
}, { prio: 6, g: 0.85, enf: 0.5 });
def('habilidad_suero', 1.2, (c, t, o) => {
  for (let i = 0; i < 4; i++) osc(c, 'sine', 220 + i * 40, t + i * 0.09, 0.1, { f1: 600, g: 0.2, a: 0.003 });
  ruido(c, t + 0.3, 0.7, { f: { t: 'bandpass', a: 5000, q: 2 }, g: 0.08, a: 0.1, rev: 0.5 });
  [659.25, 880, 1318.5].forEach((f, i) => osc(c, 'sine', f, t + 0.4 + i * 0.08, 0.6, { g: 0.1, a: 0.01, rev: 0.7 }));
}, { prio: 6, g: 0.85, enf: 0.5 });
def('habilidad_torreta', 1.2, (c, t, o) => {
  clic(c, t, 900, 0.3, 0.05); osc(c, 'sawtooth', 90, t + 0.05, 0.5, { f1: 220, g: 0.16, a: 0.03, f: { t: 'lowpass', a: 700 } });
  clic(c, t + 0.5, 1600, 0.3, 0.04); osc(c, 'sine', 1500, t + 0.6, 0.4, { g: 0.1, a: 0.003, rev: 0.5 });
  osc(c, 'sine', 80, t + 0.5, 0.2, { f1: 40, g: 0.4, a: 0.003 });
}, { prio: 6, g: 0.85, enf: 0.5 });
def('habilidad_barricada', 1.2, (c, t, o) => {
  for (let i = 0; i < 4; i++) { const tt = t + i * 0.2; osc(c, 'sine', 230, tt, 0.1, { f1: 90, g: 0.5, a: 0.001 }); ruido(c, tt, 0.07, { f: { t: 'bandpass', a: 1100, q: 1.4 }, g: 0.3, a: 0.001 }); clic(c, tt + 0.03, 2800, 0.12, 0.02); }
}, { prio: 6, g: 0.85, enf: 0.5 });
def('habilidad_acecho', 1.4, (c, t, o) => {
  osc(c, 'sine', 1800, t, 1.0, { f1: 200, g: 0.14, a: 0.01, fm: { r: 1.5, i0: 1.5, i1: 0.1 }, rev: 0.8 });
  ruido(c, t, 0.9, { f: { t: 'bandpass', a: 6000, b: 600, q: 2 }, g: 0.14, a: 0.02, rev: 0.6 });
}, { prio: 6, g: 0.85, enf: 0.5 });
def('habilidad_terremoto', 2.4, (c, t, o) => {
  osc(c, 'sine', 55, t, 1.8, { f1: 26, g: 0.8, a: 0.01 });
  ruido(c, t, 1.8, { col: 'm', f: { t: 'lowpass', a: 500, b: 60 }, g: 0.55, a: 0.02, rev: 1 });
  for (let i = 0; i < 12; i++) ruido(c, t + 0.1 + i * 0.12, 0.09, { f: { t: 'bandpass', a: 900 + Math.random() * 1600, q: 2 }, g: 0.12, a: 0.001, rev: 0.4 });
}, { prio: 8, g: 0.7, enf: 0.5 });
def('habilidad_bloqueada', 0.4, (c, t, o) => {
  osc(c, 'square', 150, t, 0.14, { g: 0.14, a: 0.003, f: { t: 'lowpass', a: 900 } }); osc(c, 'square', 140, t + 0.17, 0.2, { g: 0.14, a: 0.003, f: { t: 'lowpass', a: 800 } });
}, { prio: 4, g: 0.85, enf: 0.4 });
def('esquivar', 0.5, (c, t, o) => {
  ruido(c, t, 0.3, { f: { t: 'bandpass', a: 800 * o.p, b: 2600 * o.p, q: 0.8, d: 0.2 }, g: 0.26, a: 0.06 });
  osc(c, 'sine', 120, t + 0.12, 0.1, { f1: 60, g: 0.2, a: 0.003 });
}, { prio: 4, g: 0.85, enf: 0.12 });
def('reparar', 0.8, (c, t, o) => {
  for (let i = 0; i < 4; i++) clic(c, t + i * 0.07, 1500 + i * 220, 0.18, 0.02);
  osc(c, 'sine', 2400, t + 0.34, 0.3, { g: 0.08, a: 0.002, rev: 0.4 });
  osc(c, 'sine', 140, t + 0.3, 0.1, { f1: 70, g: 0.3, a: 0.002 });
}, { prio: 4, g: 0.85, enf: 0.2 });
// pasos por superficie de cada era (tierra, arena/madera, barro, asfalto, hormigón, aleación)
const SUELOS = [[[500, 1500, 0.2, 90]], [[650, 1800, 0.14, 100]], [[300, 900, 0.3, 70]], [[900, 2400, 0.14, 130]], [[1100, 2600, 0.14, 150]], [[1400, 3600, 0.12, 180, 1]]];
SUELOS.forEach(([[f0, f1, g, fs, metal]], i) => def('paso_' + i, 0.22, (c, t, o) => {
  ruido(c, t, 0.08, { col: 'r', f: { t: 'bandpass', a: (f0 + o.r * 200) * o.p, b: f1 * 0.5, q: 0.8 }, g, a: 0.002 });
  osc(c, 'sine', fs * o.p, t, 0.07, { f1: fs * 0.5, g: 0.2, a: 0.001 });
  if (metal) osc(c, 'sine', (2200 + o.r * 600) * o.p, t, 0.1, { g: 0.03, a: 0.001 });
}, { prio: 1, g: 0.8, enf: 0.1, max: 6 }));

// ───────────────────────────── recogidas, puntos, mejoras ─────────────────────────────
def('recogida_municion', 0.5, (c, t, o) => { clic(c, t, 1500, 0.25, 0.03); clic(c, t + 0.06, 2300, 0.22, 0.03); osc(c, 'sine', 988 * o.p, t + 0.1, 0.25, { g: 0.07, a: 0.003, rev: 0.3 }); }, { prio: 4, g: 0.9, enf: 0.1 });
def('recogida_vida', 0.8, (c, t, o) => { [659.25, 987.77].forEach((f, i) => osc(c, 'sine', f * o.p, t + i * 0.08, 0.5, { g: 0.12, a: 0.006, rev: 0.6 })); }, { prio: 4, g: 0.9, enf: 0.1 });
def('recogida_generica', 0.6, (c, t, o) => { [880, 1318.5].forEach((f, i) => osc(c, 'triangle', f * o.p, t + i * 0.07, 0.3, { g: 0.1, a: 0.004, rev: 0.4 })); }, { prio: 3, g: 0.9, enf: 0.08 });
def('puntos', 0.2, (c, t, o) => { osc(c, 'sine', 1200 * o.p, t, 0.1, { g: 0.07, a: 0.002 }); osc(c, 'sine', 1800 * o.p, t + 0.02, 0.08, { g: 0.04, a: 0.002 }); }, { prio: 1, g: 0.9, enf: 0.07, max: 3 });
def('mejora', 1.4, (c, t, o) => {
  [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { osc(c, 'triangle', f, t + i * 0.07, 0.5, { g: 0.1, a: 0.005, rev: 0.6 }); osc(c, 'sine', f * 2, t + i * 0.07, 0.4, { g: 0.04, a: 0.005 }); });
  osc(c, 'sine', 98, t, 0.5, { f1: 70, g: 0.3, a: 0.01 });
}, { prio: 6, g: 0.85, enf: 0.3 });
def('aviso', 0.5, (c, t, o) => { osc(c, 'triangle', 660, t, 0.18, { g: 0.1, a: 0.004, rev: 0.3 }); osc(c, 'triangle', 495, t + 0.12, 0.25, { g: 0.1, a: 0.004, rev: 0.3 }); }, { prio: 3, g: 0.9, enf: 0.4 });
def('logro', 0.9, (c, t, o) => { [523.25, 783.99, 1046.5].forEach((f, i) => osc(c, 'sine', f, t + i * 0.08, 0.6, { g: 0.1, a: 0.006, rev: 0.7 })); }, { prio: 4, g: 0.9, enf: 0.4 });

// ───────────────────────────── interfaz ─────────────────────────────
def('ui_hover', 0.1, (c, t, o) => { osc(c, 'sine', 1900 * o.p, t, 0.05, { g: 0.05, a: 0.002 }); }, { prio: 2, g: 0.9, enf: 0.04, max: 2 });
def('ui_clic', 0.2, (c, t, o) => { osc(c, 'sine', 700 * o.p, t, 0.08, { f1: 420, g: 0.16, a: 0.002 }); ruido(c, t, 0.02, { f: { t: 'bandpass', a: 3000, q: 1 }, g: 0.12, a: 0.001 }); }, { prio: 5, g: 0.9, enf: 0.04 });
def('ui_confirmar', 0.6, (c, t, o) => { osc(c, 'triangle', 660, t, 0.18, { g: 0.12, a: 0.003, rev: 0.4 }); osc(c, 'triangle', 990, t + 0.07, 0.3, { g: 0.12, a: 0.003, rev: 0.5 }); osc(c, 'sine', 1980, t + 0.07, 0.2, { g: 0.03, a: 0.003 }); }, { prio: 6, g: 0.9, enf: 0.08 });
def('ui_atras', 0.3, (c, t, o) => { osc(c, 'triangle', 600, t, 0.1, { f1: 400, g: 0.12, a: 0.003 }); }, { prio: 5, g: 0.9, enf: 0.06 });
def('ui_error', 0.4, (c, t, o) => { osc(c, 'square', 170, t, 0.12, { g: 0.12, a: 0.003, f: { t: 'lowpass', a: 1000 } }); osc(c, 'square', 140, t + 0.14, 0.2, { g: 0.12, a: 0.003, f: { t: 'lowpass', a: 900 } }); }, { prio: 5, g: 0.9, enf: 0.1 });
def('pausa', 0.5, (c, t, o) => { osc(c, 'sine', 400, t, 0.35, { f1: 180, g: 0.14, a: 0.01, rev: 0.4 }); }, { prio: 5, g: 0.9, enf: 0.2 });

// ───────────────────────────── hitos de la partida ─────────────────────────────
function campana(c, t, f0, dur, g, rev = 0.8) {
  [[0.5, 0.5, 1], [1, 1, 0.9], [1.19, 0.6, 0.7], [1.56, 0.4, 0.55], [2, 0.5, 0.5], [2.51, 0.25, 0.4], [3.01, 0.2, 0.3], [4.12, 0.12, 0.2]].forEach(([r, a, d]) =>
    osc(c, 'sine', f0 * r, t, dur * d, { g: g * a, a: 0.002, rev }));
  ruido(c, t, 0.03, { f: { t: 'bandpass', a: 2500, q: 1 }, g: g * 0.4, a: 0.0008 });
}
def('campana_iglesia', 7.0, (c, t, o) => { [0, 1.9, 3.8].forEach((d, i) => campana(c, t + d, 196 * o.p, 4.2, 0.2 - i * 0.03, 0.9)); }, { prio: 8, g: 0.8, enf: 1 });
def('dia_superado', 5.0, (c, t, o) => {
  [0, 0.45, 0.9].forEach((d, i) => campana(c, t + d, [392, 523.25, 659.25][i] * o.p, 2.6 + i * 0.4, 0.15, 0.8));
  osc(c, 'sine', 65, t, 1.2, { f1: 40, g: 0.4, a: 0.01 });
  [1.5].forEach((d) => [523.25, 659.25, 783.99, 1046.5].forEach((f) => osc(c, 'triangle', f, t + d, 2.4, { g: 0.05, a: 0.05, s: 0.7, r: 1.4, rev: 0.9 })));
}, { prio: 9, g: 0.75, enf: 1 });
def('oleada_anuncio', 3.4, (c, t, o) => {
  const era = o.era ?? 0;
  [0, 0.55, 1.1].forEach((d, i) => { osc(c, 'sine', 70, t + d, 0.4, { f1: 36, g: 0.7, a: 0.003 }); ruido(c, t + d, 0.25, { col: 'r', f: { t: 'lowpass', a: 700, b: 120 }, g: 0.3, a: 0.003, rev: 0.6 }); });
  const f = [196, 220, 233, 247, 262, 277][era % 6];
  osc(c, 'sawtooth', f, t + 0.2, 2.6, { g: 0.12, a: 0.25, s: 0.8, r: 1.2, n: 4, sp: 14, f: { t: 'lowpass', a: 400, b: 1600, d: 0.5 }, rev: 0.9 });
  osc(c, 'sawtooth', f * 1.5, t + 0.2, 2.6, { g: 0.08, a: 0.25, s: 0.8, r: 1.2, n: 4, sp: 14, f: { t: 'lowpass', a: 400, b: 1600, d: 0.5 }, rev: 0.9 });
}, { prio: 9, g: 0.8, enf: 1 });
def('oleada_jefe', 4.0, (c, t, o) => {
  osc(c, 'sine', 55, t, 2.6, { f1: 30, g: 0.7, a: 0.02 });
  [0, 0.4, 0.8, 1.2].forEach((d) => osc(c, 'sine', 80, t + d, 0.3, { f1: 38, g: 0.7, a: 0.003 }));
  osc(c, 'sawtooth', 98, t, 3.0, { g: 0.12, a: 0.5, s: 0.8, r: 1.2, n: 4, sp: 28, f: { t: 'lowpass', a: 300, b: 1500, d: 1.5 }, rev: 0.9 });
  osc(c, 'sawtooth', 103.8, t, 3.0, { g: 0.1, a: 0.5, s: 0.8, r: 1.2, n: 4, sp: 28, f: { t: 'lowpass', a: 300, b: 1500, d: 1.5 }, rev: 0.9 });
}, { prio: 9, g: 0.75, enf: 1 });
def('salto_temporal', 3.6, (c, t, o) => {
  ruido(c, t, 1.4, { col: 'r', f: { t: 'bandpass', a: 150, b: 7000, q: 2, d: 1.3 }, g: 0.3, a: 1.0, rev: 0.7 });
  osc(c, 'sawtooth', 50, t, 1.4, { f1: 1600, g: 0.16, a: 1.0, n: 3, sp: 40, f: { t: 'lowpass', a: 300, b: 5000, d: 1.4 }, rev: 0.6 });
  osc(c, 'sine', 1200, t + 1.35, 2.0, { f1: 30, g: 0.8, a: 0.004, rev: 0.5 });
  ruido(c, t + 1.35, 2.0, { col: 'm', f: { t: 'lowpass', a: 1200, b: 70 }, g: 0.5, a: 0.004, rev: 1 });
  [392, 587.33, 783.99].forEach((f, i) => osc(c, 'sine', f, t + 1.4 + i * 0.1, 2.0, { g: 0.08, a: 0.02, rev: 1 }));
}, { prio: 10, g: 0.7, enf: 2 });
def('inicio_partida', 1.6, (c, t, o) => {
  osc(c, 'sine', 90, t, 0.8, { f1: 40, g: 0.6, a: 0.005 });
  ruido(c, t, 0.7, { f: { t: 'bandpass', a: 300, b: 3000, q: 1, d: 0.6 }, g: 0.16, a: 0.4, rev: 0.6 });
  [196, 293.66].forEach((f) => osc(c, 'sawtooth', f, t + 0.3, 1.2, { g: 0.06, a: 0.1, s: 0.7, r: 0.7, n: 3, sp: 14, f: { t: 'lowpass', a: 900 }, rev: 0.7 }));
}, { prio: 8, g: 0.8, enf: 1 });
def('intermedio_inicio', 1.6, (c, t, o) => { [523.25, 659.25, 783.99].forEach((f, i) => campana(c, t + i * 0.18, f, 1.2, 0.07, 0.8)); }, { prio: 5, g: 0.85, enf: 1 });
def('victoria_sting', 3.6, (c, t, o) => { [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) => { osc(c, 'sawtooth', f, t + i * 0.12, 2.4, { g: 0.08, a: 0.02, s: 0.7, r: 1.2, n: 3, sp: 14, f: { t: 'lowpass', a: 2400 }, rev: 0.8 }); }); osc(c, 'sine', 65, t, 1, { f1: 40, g: 0.4, a: 0.01 }); }, { prio: 9, g: 0.75, enf: 1 });
def('derrota_sting', 3.8, (c, t, o) => { [196, 185, 164.8].forEach((f, i) => osc(c, 'sawtooth', f, t + i * 0.5, 2.4, { g: 0.1, a: 0.05, s: 0.7, r: 1.2, n: 3, sp: 14, f: { t: 'lowpass', a: 800 }, rev: 0.9 })); osc(c, 'sine', 60, t, 2, { f1: 28, g: 0.5, a: 0.01 }); }, { prio: 9, g: 0.75, enf: 1 });

// ───────────────────────────── vehículos (puntuales) ─────────────────────────────
def('vehiculo_subir', 1.2, (c, t, o) => {
  clic(c, t, 900, 0.3, 0.05); osc(c, 'sine', 90, t, 0.12, { f1: 50, g: 0.5, a: 0.002 });
  osc(c, 'sawtooth', 40, t + 0.3, 0.7, { f1: 90, g: 0.2, a: 0.1, sat: 3, f: { t: 'lowpass', a: 500, b: 300 } });
}, { prio: 6, g: 0.85, enf: 0.4 });
def('vehiculo_bajar', 0.8, (c, t, o) => { clic(c, t, 1100, 0.3, 0.05); osc(c, 'sine', 80, t, 0.1, { f1: 45, g: 0.4, a: 0.002 }); osc(c, 'sawtooth', 70, t + 0.1, 0.5, { f1: 35, g: 0.12, a: 0.05, f: { t: 'lowpass', a: 400 } }); }, { prio: 5, g: 0.85, enf: 0.4 });
def('atropello', 0.8, (c, t, o) => {
  osc(c, 'sine', 120, t, 0.3, { f1: 40, g: 0.7, a: 0.002 }); ruido(c, t, 0.2, { col: 'r', f: { t: 'lowpass', a: 1800, b: 200 }, g: 0.5, a: 0.001, sat: 2 });
}, { prio: 7, g: 0.8, enf: 0.1, max: 3 });

// ───────────────────────────── interactivos ─────────────────────────────
def('silbato_tren', 2.6, (c, t, o) => {
  [[392, 0.12], [466, 0.1]].forEach(([f, g]) => {
    osc(c, 'sawtooth', f * o.p, t, 2.2, { g, a: 0.08, s: 0.85, d: 0.3, r: 0.5, f: { t: 'bandpass', a: f * 2, q: 1.5 }, vib: [5, 12, 0.5], rev: 0.8 });
    osc(c, 'sine', f * o.p * 2, t, 2.2, { g: g * 0.3, a: 0.08, s: 0.85, r: 0.5 });
  });
  ruido(c, t, 2.2, { f: { t: 'highpass', a: 3500 }, g: 0.06, a: 0.08, s: 0.8, r: 0.5 });
}, { prio: 8, g: 0.8, enf: 1 });
def('tren', 4.5, (c, t, o) => {
  for (let i = 0; i < 14; i++) {
    const tt = t + i * 0.28, a = Math.sin(Math.PI * i / 14);
    ruido(c, tt, 0.16, { col: 'r', f: { t: 'lowpass', a: 900, b: 250 }, g: 0.3 * a + 0.03, a: 0.01 });
    osc(c, 'sine', 70, tt, 0.12, { f1: 40, g: 0.3 * a, a: 0.004 });
  }
  ruido(c, t, 4.2, { col: 'm', f: { t: 'lowpass', a: 300 }, g: 0.22, a: 1.2, s: 0.8, r: 1.5, d: 0.5 });
}, { prio: 6, g: 0.8, enf: 2 });
def('sirena_antiaerea', 6.0, (c, t, o) => {
  const s = (f0, f1, ti, d) => osc(c, 'sawtooth', f0, t + ti, d, { f1, fd: d, lin: true, g: 0.2, a: 0.05, s: 0.9, d: 0.1, r: 0.2, f: { t: 'lowpass', a: 1800 }, sat: 1.5, rev: 0.9 });
  s(300, 780, 0, 2.6); s(780, 300, 2.6, 3.0);
  ruido(c, t, 5.6, { f: { t: 'bandpass', a: 800, q: 0.6 }, g: 0.04, a: 0.3, s: 0.8, r: 0.5 });
}, { prio: 8, g: 0.8, enf: 2 });
def('alarma_coche', 3.2, (c, t, o) => {
  for (let i = 0; i < 8; i++) {
    const tt = t + i * 0.38;
    osc(c, 'square', i % 2 ? 1250 : 980, tt, 0.34, { g: 0.1, a: 0.005, s: 0.9, r: 0.02, f: { t: 'lowpass', a: 3500 }, rev: 0.4 });
  }
  clic(c, t, 1800, 0.2, 0.03);
}, { prio: 6, g: 0.85, enf: 1 });
def('zumbido_electrico', 2.0, (c, t, o) => {
  osc(c, 'sawtooth', 60, t, 1.8, { g: 0.2, a: 0.05, s: 0.9, r: 0.3, sat: 3, f: { t: 'lowpass', a: 1400, q: 1 } });
  osc(c, 'sine', 120, t, 1.8, { g: 0.12, a: 0.05, s: 0.9, r: 0.3 });
  ruido(c, t, 1.8, { f: { t: 'bandpass', a: 3500, q: 3 }, g: 0.04, a: 0.05, s: 0.8, r: 0.3 });
  for (let i = 0; i < 6; i++) ruido(c, t + Math.random() * 1.6, 0.03, { f: { t: 'bandpass', a: 2500 + Math.random() * 3000, q: 2 }, g: 0.12, a: 0.001 });
}, { prio: 4, g: 0.85, enf: 0.5 });
alias('valla_electrica', 'zumbido_electrico'); alias('transformador', 'zumbido_electrico');
def('generador', 1.8, (c, t, o) => {
  osc(c, 'sawtooth', 44, t, 1.6, { g: 0.2, a: 0.1, s: 0.9, r: 0.3, sat: 3, f: { t: 'lowpass', a: 600 } }); ruido(c, t, 1.6, { col: 'm', f: { t: 'lowpass', a: 500 }, g: 0.15, a: 0.1, s: 0.9, r: 0.3 });
}, { prio: 4, g: 0.85, enf: 0.5 });
def('torre_tesla', 1.6, (c, t, o) => {
  osc(c, 'sine', 100, t, 0.5, { f1: 900, g: 0.15, a: 0.1, rev: 0.4 });
  for (let i = 0; i < 9; i++) {
    const tt = t + 0.35 + i * 0.07 + Math.random() * 0.04;
    ruido(c, tt, 0.12, { f: { t: 'bandpass', a: 2000 + Math.random() * 4000, b: 800, q: 2 }, g: 0.25, a: 0.001, sat: 3, rev: 0.4 });
    osc(c, 'sawtooth', 60 + Math.random() * 40, tt, 0.1, { g: 0.12, a: 0.002, sat: 4, f: { t: 'highpass', a: 150 } });
  }
  osc(c, 'sine', 70, t + 0.35, 0.4, { f1: 35, g: 0.5, a: 0.003 });
  ruido(c, t + 0.35, 1.0, { col: 'r', f: { t: 'bandpass', a: 5000, b: 1500, q: 1 }, g: 0.08, a: 0.01, rev: 0.7 });
}, { prio: 7, g: 0.75, enf: 0.2, max: 2 });
def('mina', 0.7, (c, t, o) => { osc(c, 'square', 2000, t, 0.06, { g: 0.1, a: 0.002 }); osc(c, 'square', 2000, t + 0.18, 0.06, { g: 0.1, a: 0.002 }); clic(c, t + 0.36, 900, 0.3, 0.04); }, { prio: 5, g: 0.85, enf: 0.3 });
def('alambrada', 0.6, (c, t, o) => { for (let i = 0; i < 5; i++) osc(c, 'sine', 1800 + Math.random() * 2200, t + i * 0.035, 0.12, { g: 0.07, a: 0.001, rev: 0.3 }); ruido(c, t, 0.12, { f: { t: 'bandpass', a: 4000, q: 1 }, g: 0.1, a: 0.001 }); }, { prio: 4, g: 0.85, enf: 0.2 });
def('interactivo_usar', 0.5, (c, t, o) => { clic(c, t, 1300, 0.3, 0.04); osc(c, 'sine', 700, t + 0.04, 0.25, { g: 0.1, a: 0.003, rev: 0.4 }); }, { prio: 4, g: 0.9, enf: 0.1 });


// ───────────────────────────── extras pedidos por mundo y vehículos ─────────────────────────────
def('vidrio_rotura', 1.0, (c, t, o) => {
  ruido(c, t, 0.1, { f: { t: 'highpass', a: 3000 }, g: 0.3, a: 0.001, sat: 2 });
  for (let i = 0; i < 14; i++) osc(c, 'sine', (2800 + Math.random() * 4200) * o.p, t + Math.random() * 0.35, 0.09, { g: 0.07, a: 0.001, rev: 0.4 });
}, { prio: 5, g: 0.85, enf: 0.1 });
def('metal_cae', 1.2, (c, t, o) => {
  osc(c, 'sine', 100, t, 0.15, { f1: 50, g: 0.5, a: 0.001 });
  [[1, 0.2, 0.7], [2.76, 0.14, 0.5], [5.4, 0.08, 0.3]].forEach(([r, g, d], i) => { for (const dd of [0, 0.16, 0.26]) osc(c, 'sine', 420 * r * o.p * (1 - dd * 0.3), t + dd, d * (1 - dd), { g: g * (1 - dd * 2), a: 0.001, rev: 0.5 }); });
}, { prio: 5, g: 0.8, enf: 0.1 });
def('silbido', 1.2, (c, t, o) => { osc(c, 'sine', 1800 * o.p, t, 1.0, { f1: 2300 * o.p, g: 0.1, a: 0.05, s: 0.8, r: 0.3, vib: [6, 25, 0.1], rev: 0.4 }); ruido(c, t, 1.0, { f: { t: 'bandpass', a: 2000, q: 6 }, g: 0.04, a: 0.05, s: 0.8, r: 0.3 }); }, { prio: 4, g: 0.85, enf: 0.3 });
def('derrape', 1.0, (c, t, o) => { ruido(c, t, 0.9, { f: { t: 'bandpass', a: 1900 * o.p, b: 1100, q: 3 }, g: 0.2, a: 0.08, s: 0.8, r: 0.3, rev: 0.2 }); osc(c, 'sawtooth', 700 * o.p, t, 0.8, { f1: 520, g: 0.04, a: 0.08, s: 0.8, r: 0.3, f: { t: 'bandpass', a: 1200, q: 3 } }); }, { prio: 4, g: 0.85, enf: 0.3, max: 2 });
def('choque_vehiculo', 1.4, (c, t, o) => {
  osc(c, 'sine', 130, t, 0.4, { f1: 32, g: 0.7, a: 0.002 });
  ruido(c, t, 0.35, { col: 'r', f: { t: 'lowpass', a: 3000, b: 200 }, g: 0.5, a: 0.001, sat: 2.5 });
  [[1, 0.15], [2.4, 0.12], [3.9, 0.08]].forEach(([r, g]) => osc(c, 'sine', 260 * r * o.p, t, 0.7, { g, a: 0.001, rev: 0.5 }));
  for (let i = 0; i < 6; i++) osc(c, 'sine', 1500 + Math.random() * 3000, t + 0.1 + Math.random() * 0.4, 0.06, { g: 0.05, a: 0.001, rev: 0.4 });
}, { prio: 8, g: 0.7, enf: 0.15, max: 3 });
def('caballo_muerte', 1.6, (c, t, o) => {
  formantes(c, t, 1.2, 520, 180, [[900, 8, 1, 600], [2200, 10, 0.5, 1200]], { g: 0.45, a: 0.04, s: 0.8, d: 0.4, r: 0.5, vib: [11, 60], aire: 0.4, rasp: 0.3, raspHz: 40, sat: 2, rev: 0.6 });
  osc(c, 'sine', 90, t + 1.0, 0.4, { f1: 35, g: 0.5, a: 0.003 });
}, { prio: 8, g: 0.8, enf: 0.5 });
def('mecha', 1.4, (c, t, o) => {
  ruido(c, t, 1.3, { f: { t: 'highpass', a: 4200 }, g: 0.12, a: 0.03, s: 0.8, r: 0.3 });
  for (let i = 0; i < 14; i++) ruido(c, t + Math.random() * 1.2, 0.025, { f: { t: 'bandpass', a: 2500 + Math.random() * 4000, q: 3 }, g: 0.12, a: 0.001 });
}, { prio: 4, g: 0.85, enf: 0.2 });
for (let i = 0; i < 6; i++) {
  const n = ['caballo', 'locomovil', 'autoblindado', 'muscle_car', 'blindado_tactico', 'aerodeslizador'][i];
  def('motor_' + n, 1.2, (c, t, o) => { osc(c, 'sawtooth', 40 * o.p, t, 1.0, { g: 0.2, a: 0.1, s: 0.8, r: 0.2, sat: 3, f: { t: 'lowpass', a: 500 } }); ruido(c, t, 1.0, { col: 'm', f: { t: 'lowpass', a: 400 }, g: 0.15, a: 0.1, s: 0.8, r: 0.2 }); }, { prio: 2, g: 0.8, enf: 0.5 });
}

export const NOMBRES_EFECTOS = Object.keys(EFECTOS);
