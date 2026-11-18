// Música procedural adaptativa: un tema por era con instrumentos sintetizados de la época.
//   const sec = new Secuenciador({ ctx, destino, rev });  sec.configurar({ eraIdx, modo, intensidad });  sec.avanzar(tHasta)
// Los cambios de era/modo se aplican en la barra de compás y se enlazan con fundido cruzado.
import { osc, ruido, mtof } from './ayudas.js';

// ───────────────────────────── instrumentos ─────────────────────────────
// Firma común: (c, t, m|notas, dur s, vel 0..1).  c = { ctx, dest, rev }
const II = {};
const clickN = (c, t, f, g) => ruido(c, t, 0.012, { f: { t: 'bandpass', a: f, q: 1 }, g, a: 0.0008 });

II.clavecin = (c, t, m, dur, v) => {
  const f = mtof(m);
  osc(c, 'sawtooth', f, t, Math.max(0.5, dur * 1.3), { g: 0.11 * v, a: 0.002, n: 2, sp: 7, f: { t: 'lowpass', a: Math.min(9000, f * 8), b: f * 1.5, q: 1, d: 0.3 }, rev: 0.45 });
  osc(c, 'square', f * 2, t, 0.16, { g: 0.03 * v, a: 0.001, f: { t: 'bandpass', a: f * 4, q: 2 } });
  clickN(c, t, f * 3, 0.06 * v);
};
II.pizz = (c, t, m, dur, v) => {
  const f = mtof(m);
  osc(c, 'triangle', f, t, 0.3, { g: 0.22 * v, a: 0.002, f: { t: 'lowpass', a: f * 5, b: f * 1.2, d: 0.15 }, rev: 0.3 });
  osc(c, 'sine', f * 2, t, 0.12, { g: 0.04 * v, a: 0.001 });
  clickN(c, t, f * 2.5, 0.07 * v);
};
II.timbal = (c, t, m, v) => {
  const f = mtof(m);
  osc(c, 'sine', f * 1.7, t, 0.55, { f1: f, fd: 0.12, g: 0.55 * v, a: 0.002, rev: 0.5 });
  ruido(c, t, 0.12, { col: 'r', f: { t: 'lowpass', a: 500, b: 150 }, g: 0.25 * v, a: 0.001 });
};
II.pad = (c, t, notas, dur, v, o = {}) => {
  const a = Math.min(o.a ?? dur * 0.35, dur * 0.6), r = Math.min(o.r ?? dur * 0.3, 1.5);
  for (const m of notas) {
    const f = mtof(m);
    osc(c, o.tipo || 'sawtooth', f, t, dur, { g: (o.g ?? 0.03) * v, a, s: 0.85, d: a, r, n: o.n ?? 3, sp: o.sp ?? 12, f: { t: 'lowpass', a: o.lp ?? 800, b: (o.lp ?? 800) * 1.3, q: 0.6, d: dur }, rev: o.rev ?? 0.7 });
    if (o.tri !== false) osc(c, 'triangle', f * 2, t, dur, { g: (o.g ?? 0.03) * v * 0.5, a, s: 0.85, d: a, r });
  }
};
II.guitarra = (c, t, m, dur, v) => {
  const f = mtof(m);
  osc(c, 'sawtooth', f, t, 1.0, { g: 0.13 * v, a: 0.002, n: 2, sp: 5, f: { t: 'lowpass', a: Math.min(7000, f * 8), b: f * 1.4, q: 1.4, d: 0.5 }, rev: 0.35 });
  osc(c, 'triangle', f * 2, t, 0.4, { g: 0.03 * v, a: 0.001 });
  clickN(c, t, f * 3, 0.08 * v);
};
II.armonica = (c, t, m, dur, v) => {
  const f = mtof(m);
  osc(c, 'sawtooth', f, t, dur, { g: 0.12 * v, a: 0.045, s: 0.8, d: 0.12, r: 0.12, n: 2, sp: 9, vib: [5.5, 18, 0.2], f: { t: 'bandpass', a: f * 2.2, q: 0.9 }, f2: { t: 'lowpass', a: 4200 }, rev: 0.5 });
  ruido(c, t, dur, { f: { t: 'bandpass', a: f * 3, q: 1.2 }, g: 0.03 * v, a: 0.05, s: 0.8, r: 0.1 });
};
II.palmas = (c, t, v) => {
  [0, 0.011, 0.024].forEach((d, i) => ruido(c, t + d, 0.06, { f: { t: 'bandpass', a: 1300 + i * 250, q: 0.9 }, g: 0.28 * v, a: 0.001, rev: 0.35 }));
};
II.yunque = (c, t, v) => {
  [[1, 0.2, 0.5], [2.76, 0.14, 0.35], [5.4, 0.08, 0.22], [8.9, 0.04, 0.12]].forEach(([r, g, d]) => osc(c, 'sine', 780 * r, t, d, { g: g * v, a: 0.001, rev: 0.4 }));
  ruido(c, t, 0.03, { f: { t: 'bandpass', a: 3000, q: 1 }, g: 0.18 * v, a: 0.0008 });
};
II.caja = (c, t, v, o = {}) => {
  ruido(c, t, o.d ?? 0.14, { f: { t: 'bandpass', a: 2700, q: 0.7 }, f2: { t: 'highpass', a: 900 }, g: 0.26 * v, a: 0.001, rev: o.rev ?? 0.25 });
  osc(c, 'sine', 200, t, 0.09, { f1: 130, g: 0.22 * v, a: 0.001 });
  ruido(c, t, 0.08, { f: { t: 'highpass', a: 5500 }, g: 0.1 * v, a: 0.001 });
};
II.bombo = (c, t, v, o = {}) => {
  osc(c, 'sine', o.f0 ?? 130, t, o.d ?? 0.24, { f1: o.f1 ?? 46, fd: 0.12, g: 0.75 * v, a: 0.001, sat: o.sat });
  ruido(c, t, 0.02, { f: { t: 'bandpass', a: 2500, q: 1 }, g: 0.12 * v, a: 0.0006 });
};
II.metal = (c, t, m, dur, v, o = {}) => { // metales graves
  const f = mtof(m), a = o.a ?? 0.12;
  osc(c, 'sawtooth', f, t, dur, { g: (o.g ?? 0.06) * v, a, s: 0.8, d: 0.12, r: 0.15, n: 3, sp: 12, f: { t: 'lowpass', a: f * 1.6, b: f * (o.brillo ?? 5), q: 1.1, d: a + 0.05 }, rev: 0.55 });
  osc(c, 'square', f * 0.5, t, dur, { g: (o.g ?? 0.06) * v * 0.5, a, s: 0.8, r: 0.15, f: { t: 'lowpass', a: f * 2 } });
};
II.cuerdas = (c, t, m, dur, v) => {
  const f = mtof(m);
  osc(c, 'sawtooth', f, t, dur, { g: 0.045 * v, a: Math.min(0.5, dur * 0.4), s: 0.85, d: 0.3, r: 0.5, n: 4, sp: 20, vib: [5.3, 22, 0.35], f: { t: 'lowpass', a: f * 3.5 }, f2: { t: 'highpass', a: 250 }, rev: 0.7 });
};
II.tuba = (c, t, m, dur, v) => {
  const f = mtof(m);
  osc(c, 'sawtooth', f, t, dur, { g: 0.2 * v, a: 0.012, s: 0.5, d: 0.15, r: 0.06, f: { t: 'lowpass', a: f * 5, b: f * 2, d: 0.2 }, rev: 0.2 });
  osc(c, 'sine', f, t, dur, { g: 0.2 * v, a: 0.01, s: 0.6, d: 0.15, r: 0.06 });
};
II.bajoSynth = (c, t, m, dur, v, o = {}) => {
  const f = mtof(m);
  osc(c, o.tipo || 'sawtooth', f, t, dur, { g: (o.g ?? 0.17) * v, a: 0.004, s: 0.6, d: 0.1, r: 0.03, sat: o.sat, f: { t: 'lowpass', a: o.lp ?? f * 9, b: f * 1.8, q: o.q ?? 2.5, d: 0.18 } });
  osc(c, 'sine', f, t, dur, { g: 0.22 * v, a: 0.004, s: 0.8, d: 0.1, r: 0.03 });
};
II.arp = (c, t, m, dur, v, o = {}) => {
  const f = mtof(m);
  osc(c, o.tipo || 'sawtooth', f, t, Math.max(0.12, dur), { g: (o.g ?? 0.085) * v, a: 0.003, n: 2, sp: 10, f: { t: 'lowpass', a: f * (o.br ?? 10), b: f * 1.8, q: 3, d: 0.16 }, rev: o.rev ?? 0.3 });
};
II.lead = (c, t, m, dur, v, o = {}) => {
  const f = mtof(m);
  osc(c, o.tipo || 'sawtooth', f, t, dur, { g: (o.g ?? 0.07) * v, a: 0.012, s: 0.7, d: 0.12, r: 0.14, n: o.n ?? 5, sp: o.sp ?? 24, vib: [5.5, 12, 0.25], f: { t: 'lowpass', a: f * 7, b: f * 3, d: dur }, rev: o.rev ?? 0.4, sat: o.sat });
};
II.surf = (c, t, m, dur, v) => {
  const f = mtof(m), n = Math.max(1, Math.min(6, Math.round(dur / 0.07)));
  for (let i = 0; i < n; i++) { // trémolo de púa
    const tt = t + i * (dur / n);
    osc(c, 'sawtooth', f, tt, Math.max(0.1, dur / n * 1.7), { g: 0.08 * v * (i ? 0.8 : 1), a: 0.002, f: { t: 'lowpass', a: f * 6, b: f * 2, q: 1.5 }, f2: { t: 'highpass', a: 180 }, rev: 0.9 });
  }
  osc(c, 'triangle', f * 2, t, dur, { g: 0.03 * v, a: 0.005, s: 0.6, r: 0.1, rev: 0.8 });
};
II.charles = (c, t, v, abierto) => ruido(c, t, abierto ? 0.18 : 0.04, { f: { t: 'highpass', a: 7500 }, g: (abierto ? 0.09 : 0.1) * v, a: 0.001 });
II.snareGate = (c, t, v) => {
  ruido(c, t, 0.17, { f: { t: 'lowpass', a: 6500 }, f2: { t: 'highpass', a: 800 }, g: 0.24 * v, a: 0.002, s: 0.9, d: 0.02, r: 0.012, rev: 0.9 });
  osc(c, 'sine', 230, t, 0.1, { f1: 150, g: 0.25 * v, a: 0.001 });
};
II.clap = (c, t, v) => { [0, 0.01, 0.022, 0.034].forEach((d) => ruido(c, t + d, d === 0.034 ? 0.12 : 0.02, { f: { t: 'bandpass', a: 1500, q: 0.8 }, g: 0.18 * v, a: 0.001, rev: 0.5 })); };
II.clank = (c, t, v) => {
  [1, 2.35, 3.9, 5.2].forEach((r, i) => osc(c, 'sine', 410 * r, t, 0.22 - i * 0.03, { g: (0.13 - i * 0.025) * v, a: 0.001, rev: 0.4 }));
  ruido(c, t, 0.04, { f: { t: 'highpass', a: 2500 }, g: 0.16 * v, a: 0.0008, sat: 2 });
};
II.riser = (c, t, dur, v) => {
  ruido(c, t, dur, { f: { t: 'bandpass', a: 300, b: 7000, q: 2, d: dur }, g: 0.12 * v, a: dur * 0.92, rev: 0.4 });
  osc(c, 'sawtooth', 80, t, dur, { f1: 1200, g: 0.04 * v, a: dur * 0.92, f: { t: 'lowpass', a: 400, b: 4000, d: dur } });
};
II.acid = (c, t, m, dur, v) => {
  const f = mtof(m);
  osc(c, 'sawtooth', f, t, dur, { g: 0.16 * v, a: 0.004, s: 0.5, d: 0.08, r: 0.02, sat: 3, f: { t: 'lowpass', a: f * 14, b: f * 1.5, q: 9, d: 0.12 } });
};
II.stab = (c, t, notas, dur, v, o = {}) => {
  for (const m of notas) osc(c, 'sawtooth', mtof(m), t, dur, { g: (o.g ?? 0.05) * v, a: 0.004, s: 0.5, d: 0.05, r: 0.04, n: 3, sp: 18, sat: o.sat, f: { t: 'lowpass', a: 3000, b: 700, d: dur }, rev: 0.3 });
};

// ───────────────────────────── teoría ─────────────────────────────
const INT = { m: [0, 3, 7], M: [0, 4, 7], '7': [0, 4, 7, 10], d: [0, 3, 6] };
const ESCALAS = { };

/** Convierte [[paso global, semitono desde la tónica, duración en pasos]] en un mapa por posición. */
function mapa(motivo) { const mp = new Map(); for (const [p, s, d] of motivo) { if (!mp.has(p)) mp.set(p, []); mp.get(p).push([s, d]); } return mp; }
const MV = (compases, pasos) => compases.flatMap((lst, b) => lst.map(([s, n, d]) => [b * pasos + s, n, d]));

// ───────────────────────────── temas ─────────────────────────────
// capa: { id, tipo: 'pad'|'bajo'|'ritmo'|'arm'|'mel'|'tension'|'jefe', min, f(c, t, e) }
// e: { s, compas, b, acorde[], raiz, dp, v, int, modo, nm[], tonica, ultimo, par }
const nota = (e, i, oct = 0) => { const n = e.acorde.length; return e.acorde[((i % n) + n) % n] + 12 * (Math.floor(i / n) + oct); };

const TEMAS = [];

// 0 · 1800 — clavecín, pizzicato y timbales; vals fúnebre gótico en re menor
TEMAS[0] = {
  bpm: 88, pasos: 12, tonica: 50,
  prog: [[0, 'm'], [0, 'm'], [8, 'M'], [7, 'M'], [0, 'm'], [5, 'm'], [7, '7'], [0, 'm']],
  motivo: mapa(MV([
    [[0, 19, 4], [4, 15, 2], [6, 17, 2], [8, 19, 4]],
    [[0, 24, 6], [6, 23, 2], [8, 24, 2], [10, 26, 2]],
    [[0, 24, 4], [4, 27, 4], [8, 24, 4]],
    [[0, 23, 4], [4, 26, 4], [8, 19, 4]],
    [[0, 27, 4], [4, 26, 2], [6, 24, 2], [8, 19, 4]],
    [[0, 20, 4], [4, 24, 4], [8, 20, 4]],
    [[0, 23, 2], [2, 26, 2], [4, 29, 4], [8, 26, 2], [10, 23, 2]],
    [[0, 24, 8]],
  ], 12)),
  capas: [
    { id: 'organo', tipo: 'pad', min: 0, f: (c, t, e) => { if (e.s === 0) II.pad(c, t, e.acorde.map((m) => m - 12).concat([e.raiz - 24]), e.dp * 12, e.v, { lp: 650, g: 0.034, rev: 0.8 }); } },
    { id: 'contrabajo', tipo: 'bajo', min: 0.08, f: (c, t, e) => { if (e.s === 0) II.pizz(c, t, e.raiz - 12, 0.5, 1.2 * e.v); else if (e.s === 8) II.pizz(c, t, e.acorde[2] - 12, 0.5, 0.9 * e.v); } },
    { id: 'pizz', tipo: 'arm', min: 0.28, f: (c, t, e) => { if (e.s === 4 || e.s === 8) e.acorde.forEach((m, i) => II.pizz(c, t + i * 0.006, m + 12, 0.3, 0.55 * e.v)); } },
    { id: 'timbal', tipo: 'ritmo', min: 0.18, f: (c, t, e) => {
      if (e.s === 0) II.timbal(c, t, e.raiz - 12, 0.95 * e.v);
      if (e.s === 8 && e.int > 0.55) II.timbal(c, t, e.raiz - 5, 0.7 * e.v);
      if (e.ultimo && e.s >= 6 && e.int > 0.4 && e.s % 2 === 0) II.timbal(c, t, e.raiz - 12, (0.35 + (e.s - 6) * 0.1) * e.v);
    } },
    { id: 'arpegio', tipo: 'arm', min: 0.45, f: (c, t, e) => { if (e.s % 2 === 0) II.clavecin(c, t, nota(e, [0, 1, 2, 1, 2, 1][(e.s / 2) % 6] + 3 * 0, 1), e.dp * 2, 0.55 * e.v); } },
    { id: 'clavecin', tipo: 'mel', min: 0.28, f: (c, t, e) => { for (const [m, d] of e.nm) { II.clavecin(c, t, m, d * e.dp, e.v); if (e.int > 0.65) II.clavecin(c, t, m - 12, d * e.dp, 0.5 * e.v); } } },
    { id: 'cuerdas', tipo: 'tension', min: 0.7, f: (c, t, e) => { if (e.s === 0) { II.cuerdas(c, t, e.raiz + 25, e.dp * 12, 0.9 * e.v); II.cuerdas(c, t, e.raiz + 26, e.dp * 12, 0.7 * e.v); } } },
    { id: 'redoble', tipo: 'tension', min: 0.78, f: (c, t, e) => { if (e.s % 2 === 1 && e.s > 5) II.timbal(c, t, e.raiz - 12, 0.28 * e.v); } },
    { id: 'jefe', tipo: 'jefe', min: 0, f: (c, t, e) => { if (e.s % 3 === 0) II.timbal(c, t, e.raiz - (e.s === 0 ? 12 : 7), (e.s === 0 ? 1 : 0.7) * e.v); if (e.s === 0) II.metal(c, t, e.raiz - 12, e.dp * 12, 0.9 * e.v, { brillo: 4 }); } },
  ],
};

// 1 · 1850 — guitarra wéstern, armónica, palmas y yunque; la menor
TEMAS[1] = {
  bpm: 96, pasos: 16, tonica: 45,
  prog: [[0, 'm'], [0, 'm'], [8, 'M'], [7, 'M'], [0, 'm'], [10, 'M'], [8, 'M'], [7, 'M']],
  motivo: mapa(MV([
    [[0, 31, 6], [6, 27, 2], [8, 29, 4], [12, 31, 4]],
    [[0, 27, 4], [4, 26, 4], [8, 24, 8]],
    [[0, 24, 6], [6, 27, 2], [8, 24, 4], [12, 27, 4]],
    [[0, 26, 4], [4, 23, 4], [8, 31, 8]],
    [[0, 31, 4], [4, 29, 2], [6, 27, 2], [8, 31, 8]],
    [[0, 29, 4], [4, 26, 4], [8, 22, 4], [12, 26, 4]],
    [[0, 27, 4], [4, 24, 4], [8, 20, 8]],
    [[0, 23, 4], [4, 26, 4], [8, 31, 7]],
  ], 16)),
  capas: [
    { id: 'bordon', tipo: 'pad', min: 0, f: (c, t, e) => { if (e.s === 0) II.pad(c, t, [e.raiz - 12, e.raiz - 5], e.dp * 16, e.v, { lp: 420, g: 0.04, rev: 0.6, n: 2, tri: false }); } },
    { id: 'bajo', tipo: 'bajo', min: 0.08, f: (c, t, e) => { if (e.s === 0) II.guitarra(c, t, e.raiz - 12, 1, 1.1 * e.v); else if (e.s === 8) II.guitarra(c, t, e.acorde[2] - 12, 1, 0.9 * e.v); else if (e.s === 12 && e.int > 0.4) II.guitarra(c, t, e.raiz - 5, 1, 0.6 * e.v); } },
    { id: 'rasgueo', tipo: 'arm', min: 0.25, f: (c, t, e) => { if (e.s === 4 || e.s === 12) e.acorde.concat([e.acorde[0] + 12]).forEach((m, i) => II.guitarra(c, t + i * 0.014, m, 0.5, 0.65 * e.v)); } },
    { id: 'palmas', tipo: 'ritmo', min: 0.15, f: (c, t, e) => { if (e.s === 4 || e.s === 12) II.palmas(c, t, e.v); if (e.int > 0.55 && (e.s === 6 || e.s === 14)) II.palmas(c, t, 0.5 * e.v); } },
    { id: 'yunque', tipo: 'ritmo', min: 0.45, f: (c, t, e) => { if (e.s === 0) II.yunque(c, t, e.v); if (e.int > 0.65 && e.s === 8) II.yunque(c, t, 0.7 * e.v); } },
    { id: 'armonica', tipo: 'mel', min: 0.28, f: (c, t, e) => { for (const [m, d] of e.nm) II.armonica(c, t, m, d * e.dp * 0.95, e.v); } },
    { id: 'trémolo', tipo: 'tension', min: 0.72, f: (c, t, e) => { if (e.s % 2 === 0) II.guitarra(c, t, e.acorde[1] + 24, 0.2, 0.4 * e.v); } },
    { id: 'jefe', tipo: 'jefe', min: 0, f: (c, t, e) => { if (e.s % 4 === 0) II.yunque(c, t, e.v); if (e.s % 2 === 0) II.guitarra(c, t, e.raiz - 12, 0.3, 0.7 * e.v); if (e.s === 0) II.timbal(c, t, e.raiz - 12, e.v); } },
  ],
};

// 2 · 1900 — caja militar, metales graves y cuerdas tensas; do menor, marcha
TEMAS[2] = {
  bpm: 100, pasos: 16, tonica: 48,
  prog: [[0, 'm'], [0, 'm'], [8, 'M'], [7, 'M'], [0, 'm'], [5, 'm'], [7, 'M'], [0, 'm']],
  motivo: mapa(MV([
    [[0, 19, 6], [6, 24, 2], [8, 22, 4], [12, 19, 4]],
    [[0, 17, 4], [4, 15, 4], [8, 12, 8]],
    [[0, 24, 6], [6, 27, 2], [8, 26, 4], [12, 24, 4]],
    [[0, 23, 4], [4, 26, 4], [8, 23, 4], [12, 19, 4]],
    [[0, 19, 6], [6, 24, 2], [8, 27, 4], [12, 26, 2], [14, 24, 2]],
    [[0, 24, 4], [4, 20, 4], [8, 17, 4], [12, 20, 4]],
    [[0, 23, 4], [4, 19, 4], [8, 26, 6], [14, 23, 2]],
    [[0, 24, 12]],
  ], 16)),
  capas: [
    { id: 'metales', tipo: 'pad', min: 0, f: (c, t, e) => { if (e.s === 0) e.acorde.forEach((m) => II.metal(c, t, m - 12, e.dp * 16, 0.8 * e.v, { a: e.dp * 6, brillo: 3.5, g: 0.05 })); } },
    { id: 'tuba', tipo: 'bajo', min: 0.08, f: (c, t, e) => { if (e.s % 4 === 0) II.tuba(c, t, (e.s % 8 === 0 ? e.raiz : e.acorde[2]) - 12, e.dp * 3, e.v); } },
    { id: 'bombo', tipo: 'ritmo', min: 0.12, f: (c, t, e) => { if (e.s === 0 || e.s === 8) II.bombo(c, t, 0.9 * e.v, { f0: 95, f1: 50, d: 0.3 }); } },
    { id: 'caja', tipo: 'ritmo', min: 0.18, f: (c, t, e) => {
      const patron = [1, 0, 0.45, 0, 1, 0, 0.45, 0.6, 1, 0, 0.45, 0, 1, 0.5, 0.45, 0.6];
      if (patron[e.s] > 0 && (e.int > 0.4 || e.s % 4 === 0)) II.caja(c, t, patron[e.s] * e.v * (e.s % 4 === 0 ? 1 : 0.6));
      if (e.ultimo && e.s >= 12 && e.int > 0.5) II.caja(c, t + e.dp * 0.5, 0.5 * e.v);   // redoble
    } },
    { id: 'staccato', tipo: 'arm', min: 0.4, f: (c, t, e) => { if (e.s === 6 || e.s === 14) II.metal(c, t, e.acorde[0], e.dp * 1.4, 0.8 * e.v, { a: 0.01, brillo: 5, g: 0.06 }); } },
    { id: 'trompa', tipo: 'mel', min: 0.28, f: (c, t, e) => { for (const [m, d] of e.nm) II.metal(c, t, m, d * e.dp * 0.92, 0.9 * e.v, { a: 0.03, brillo: 6, g: 0.055 }); } },
    { id: 'cuerdas', tipo: 'tension', min: 0.55, f: (c, t, e) => { if (e.s === 0) { II.cuerdas(c, t, e.raiz + 24, e.dp * 16, 0.9 * e.v); II.cuerdas(c, t, e.raiz + 25, e.dp * 16, 0.7 * e.v); II.cuerdas(c, t, e.raiz + 31, e.dp * 16, 0.6 * e.v); } } },
    { id: 'jefe', tipo: 'jefe', min: 0, f: (c, t, e) => { if (e.s % 4 === 0) II.bombo(c, t, e.v, { f0: 90, f1: 42, d: 0.32 }); if (e.s % 2 === 0) II.caja(c, t, 0.5 * e.v); if (e.s === 0) II.metal(c, t, e.raiz - 12, e.dp * 16, e.v, { brillo: 4 }); } },
  ],
};

// 3 · 1950 — synthwave retro, batería con reverb gated y guitarra surf; la menor
TEMAS[3] = {
  bpm: 106, pasos: 16, tonica: 45,
  prog: [[0, 'm'], [8, 'M'], [3, 'M'], [10, 'M'], [0, 'm'], [8, 'M'], [3, 'M'], [7, 'M']],
  motivo: mapa(MV([
    [[0, 24, 3], [3, 27, 1], [4, 31, 4], [8, 29, 2], [10, 27, 2], [12, 24, 4]],
    [[0, 24, 4], [4, 29, 4], [8, 27, 2], [10, 24, 2], [12, 20, 4]],
    [[0, 31, 4], [4, 27, 2], [6, 31, 2], [8, 34, 4], [12, 31, 4]],
    [[0, 29, 4], [4, 26, 4], [8, 22, 4], [12, 26, 4]],
    [[0, 24, 4], [4, 27, 4], [8, 31, 6], [14, 29, 2]],
    [[0, 32, 4], [4, 29, 4], [8, 27, 4], [12, 24, 4]],
    [[0, 27, 2], [2, 31, 2], [4, 34, 4], [8, 31, 4], [12, 27, 4]],
    [[0, 26, 4], [4, 23, 4], [8, 31, 8]],
  ], 16)),
  capas: [
    { id: 'pad', tipo: 'pad', min: 0, f: (c, t, e) => { if (e.s === 0) II.pad(c, t, e.acorde, e.dp * 16, e.v, { lp: 1400, g: 0.03, rev: 0.7, n: 4, sp: 16 }); } },
    { id: 'bajo', tipo: 'bajo', min: 0.12, f: (c, t, e) => { if (e.s % 2 === 0) II.bajoSynth(c, t, e.raiz - 12 + (e.s % 8 === 6 ? 12 : 0), e.dp * 1.8, e.v, { lp: 1800 }); } },
    { id: 'bombo', tipo: 'ritmo', min: 0.12, f: (c, t, e) => { if (e.s === 0 || e.s === 8 || (e.s === 10 && e.int > 0.5)) II.bombo(c, t, 0.85 * e.v); } },
    { id: 'charles', tipo: 'ritmo', min: 0.15, f: (c, t, e) => { if (e.s % 2 === 0 || e.int > 0.6) II.charles(c, t, (e.s % 4 === 2 ? 1 : 0.6) * e.v, e.s === 14); } },
    { id: 'caja', tipo: 'ritmo', min: 0.22, f: (c, t, e) => { if (e.s === 4 || e.s === 12) II.snareGate(c, t, e.v); } },
    { id: 'arpegio', tipo: 'arm', min: 0.38, f: (c, t, e) => { II.arp(c, t, nota(e, [0, 1, 2, 3, 2, 1, 2, 1][e.s % 8] , 1), e.dp * 1.4, 0.75 * e.v, { rev: 0.4 }); } },
    { id: 'surf', tipo: 'mel', min: 0.32, f: (c, t, e) => { for (const [m, d] of e.nm) II.surf(c, t, m, d * e.dp * 0.95, e.v); } },
    { id: 'subida', tipo: 'tension', min: 0.78, f: (c, t, e) => { if (e.ultimo && e.s === 0) II.riser(c, t, e.dp * 16, e.v); } },
    { id: 'jefe', tipo: 'jefe', min: 0, f: (c, t, e) => { if (e.s % 4 === 0) II.bombo(c, t, e.v); if (e.s % 4 === 2) II.charles(c, t, e.v, true); if (e.s % 8 === 0) II.stab(c, t, e.acorde.map((m) => m - 12), e.dp * 2, e.v, { sat: 2 }); } },
  ],
};

// 4 · 2000 — electrónica industrial; mi menor, golpes metálicos y bajo ácido saturado
TEMAS[4] = {
  bpm: 126, pasos: 16, tonica: 40,
  prog: [[0, 'm'], [0, 'm'], [8, 'M'], [10, 'M'], [0, 'm'], [0, 'm'], [1, 'M'], [7, 'm']],
  motivo: mapa(MV([
    [[0, 31, 3], [3, 30, 1], [4, 31, 4], [8, 27, 4], [12, 30, 4]],
    [[0, 24, 8], [10, 25, 2], [12, 24, 4]],
    [[0, 32, 4], [4, 31, 4], [8, 27, 4], [12, 31, 4]],
    [[0, 34, 2], [2, 31, 2], [4, 29, 4], [8, 26, 8]],
    [[0, 31, 3], [3, 30, 1], [4, 31, 4], [8, 34, 4], [12, 31, 4]],
    [[0, 24, 4], [4, 27, 4], [8, 31, 8]],
    [[0, 29, 4], [4, 32, 4], [8, 37, 4], [12, 32, 4]],
    [[0, 31, 6], [6, 30, 2], [8, 26, 8]],
  ], 16)),
  capas: [
    { id: 'zumbido', tipo: 'pad', min: 0, f: (c, t, e) => { if (e.s === 0) II.pad(c, t, [e.raiz - 12, e.raiz - 5, e.raiz], e.dp * 16, e.v, { lp: 500, g: 0.035, rev: 0.5, n: 3, sp: 30, tri: false }); } },
    { id: 'acido', tipo: 'bajo', min: 0.1, f: (c, t, e) => {
      const patron = [1, 0, 0.7, 0, 1, 0.5, 0, 0.7, 1, 0, 0.7, 0, 1, 0.5, 0.8, 0];
      if (patron[e.s]) II.acid(c, t, e.raiz - 12 + ([0, 0, 12, 0, 0, 7, 0, 12, 0, 0, 12, 0, 0, 7, 3, 0][e.s]), e.dp * 1.4, patron[e.s] * e.v);
    } },
    { id: 'bombo', tipo: 'ritmo', min: 0.1, f: (c, t, e) => { if (e.s % 4 === 0) II.bombo(c, t, e.v, { f0: 160, f1: 42, d: 0.26, sat: 3 }); } },
    { id: 'chasquido', tipo: 'ritmo', min: 0.28, f: (c, t, e) => { if (e.s === 4 || e.s === 12) II.clap(c, t, e.v); if (e.s % 4 === 2) II.charles(c, t, e.v, true); } },
    { id: 'metal', tipo: 'ritmo', min: 0.42, f: (c, t, e) => { if (e.s === 3 || e.s === 10) II.clank(c, t, 0.8 * e.v); if (e.int > 0.6 && e.s % 2 === 1) II.charles(c, t, 0.5 * e.v, false); } },
    { id: 'acordes', tipo: 'arm', min: 0.4, f: (c, t, e) => { if (e.s === 3 || e.s === 6 || e.s === 11) II.stab(c, t, e.acorde, e.dp * 1.5, e.v, { sat: 3 }); } },
    { id: 'lead', tipo: 'mel', min: 0.45, f: (c, t, e) => { for (const [m, d] of e.nm) II.lead(c, t, m, d * e.dp * 0.95, e.v, { tipo: 'square', n: 3, sp: 14, sat: 2.5, g: 0.06 }); } },
    { id: 'subida', tipo: 'tension', min: 0.72, f: (c, t, e) => { if (e.ultimo && e.s === 0) II.riser(c, t, e.dp * 16, e.v); if (e.ultimo && e.s >= 8 && e.s % 2 === 0) II.caja(c, t, (0.3 + (e.s - 8) * 0.08) * e.v, { d: 0.08 }); } },
    { id: 'jefe', tipo: 'jefe', min: 0, f: (c, t, e) => { II.charles(c, t, 0.7 * e.v, e.s % 4 === 2); if (e.s % 4 === 2) II.clank(c, t, 0.6 * e.v); if (e.s === 0) II.stab(c, t, [e.raiz - 12, e.raiz - 5], e.dp * 4, e.v, { sat: 4 }); } },
  ],
};

// 5 · 2050 — ciberpunk: arpegiadores con eco, bajo distorsionado y lead supersaw; re menor
TEMAS[5] = {
  bpm: 112, pasos: 16, tonica: 50,
  prog: [[0, 'm'], [8, 'M'], [5, 'm'], [7, 'M'], [0, 'm'], [8, 'M'], [5, 'm'], [7, '7']],
  motivo: mapa(MV([
    [[0, 24, 3], [3, 26, 1], [4, 27, 4], [8, 26, 4], [12, 24, 4]],
    [[0, 22, 4], [4, 24, 4], [8, 27, 4], [12, 24, 4]],
    [[0, 22, 4], [4, 20, 2], [6, 22, 2], [8, 24, 8]],
    [[0, 23, 4], [4, 26, 4], [8, 31, 4], [12, 26, 4]],
    [[0, 27, 4], [4, 29, 4], [8, 31, 4], [12, 29, 4]],
    [[0, 27, 4], [4, 24, 4], [8, 22, 4], [12, 24, 4]],
    [[0, 29, 4], [4, 27, 4], [8, 24, 4], [12, 22, 4]],
    [[0, 23, 4], [4, 26, 4], [8, 29, 6], [14, 26, 2]],
  ], 16)),
  capas: [
    { id: 'cristal', tipo: 'pad', min: 0, f: (c, t, e) => { if (e.s === 0) II.pad(c, t, e.acorde.map((m) => m + 12), e.dp * 16, e.v, { lp: 2400, g: 0.022, rev: 0.9, n: 3, sp: 10, tipo: 'sawtooth' }); } },
    { id: 'bajo', tipo: 'bajo', min: 0.1, f: (c, t, e) => { if (e.s % 2 === 0) II.bajoSynth(c, t, e.raiz - 12 + (e.s % 8 === 6 || e.s === 14 ? 12 : 0), e.dp * 1.7, e.v, { sat: 4, lp: 1400, g: 0.15 }); } },
    { id: 'bombo', tipo: 'ritmo', min: 0.12, f: (c, t, e) => { if (e.s === 0 || e.s === 8 || (e.int > 0.5 && e.s === 6)) II.bombo(c, t, 0.9 * e.v, { f0: 150, f1: 44, d: 0.22, sat: 2 }); } },
    { id: 'caja', tipo: 'ritmo', min: 0.2, f: (c, t, e) => { if (e.s === 4 || e.s === 12) { II.caja(c, t, 0.9 * e.v, { rev: 0.5 }); II.clap(c, t, 0.5 * e.v); } } },
    { id: 'charles', tipo: 'ritmo', min: 0.25, f: (c, t, e) => { II.charles(c, t, (e.s % 4 === 2 ? 1 : 0.5) * e.v, e.s === 14); if (e.int > 0.7 && e.s % 8 === 7) II.charles(c, t + e.dp * 0.5, 0.5 * e.v, false); } },
    { id: 'arpegiador', tipo: 'arm', min: 0.3, f: (c, t, e) => {
      const m = nota(e, [0, 1, 2, 3, 2, 1, 2, 3][e.s % 8] + (e.s >= 8 ? 1 : 0), 1);
      II.arp(c, t, m, e.dp * 1.3, e.v, { rev: 0.5, br: 12 });
      II.arp(c, t + e.dp * 3, m, e.dp * 1.2, 0.35 * e.v, { rev: 0.7, br: 8 });   // eco punteado
    } },
    { id: 'lead', tipo: 'mel', min: 0.45, f: (c, t, e) => { for (const [m, d] of e.nm) II.lead(c, t, m, d * e.dp * 0.95, e.v, { g: 0.06 }); } },
    { id: 'subida', tipo: 'tension', min: 0.75, f: (c, t, e) => { if (e.ultimo && e.s === 0) II.riser(c, t, e.dp * 16, e.v); if (e.int > 0.85 && e.s % 2 === 1) II.arp(c, t, e.raiz + 36 + (e.s % 6), e.dp * 0.7, 0.6 * e.v, { br: 6 }); } },
    { id: 'jefe', tipo: 'jefe', min: 0, f: (c, t, e) => { if (e.s % 4 === 0) II.bombo(c, t, e.v, { f0: 150, f1: 44, sat: 2 }); II.arp(c, t, e.raiz + 24 + [0, 3, 7, 10][e.s % 4], e.dp * 0.9, 0.7 * e.v, { br: 14, tipo: 'square' }); if (e.s === 0) II.stab(c, t, [e.raiz - 12, e.raiz - 5], e.dp * 4, e.v, { sat: 4 }); } },
  ],
};

export const TEMAS_MUSICA = TEMAS;

// ───────────────────────────── secuenciador ─────────────────────────────
const TIPOS_MODO = {
  menu: ['pad', 'mel', 'bajo'], intermedio: ['pad', 'mel'], combate: ['pad', 'bajo', 'ritmo', 'arm', 'mel', 'tension'],
  jefe: ['pad', 'bajo', 'ritmo', 'arm', 'mel', 'tension', 'jefe'], victoria: ['pad', 'mel', 'bajo', 'ritmo'], derrota: ['pad', 'mel'],
};
const TEMPO_MODO = { menu: 0.9, intermedio: 0.85, combate: 1, jefe: 1.1, victoria: 1, derrota: 0.7 };
const PROG_MODO = {
  victoria: [[0, 'M'], [5, 'M'], [7, 'M'], [0, 'M']],
  derrota: [[0, 'm'], [10, 'M'], [8, 'M'], [7, 'M']],
};
export const MODOS_MUSICA = Object.keys(TIPOS_MODO);

export class Secuenciador {
  /** opciones: { ctx, destino, rev, offline, t0 } */
  constructor({ ctx, destino, rev, offline = false, t0 }) {
    this.ctx = ctx; this.destino = destino; this.rev = rev; this.offline = offline;
    this.t = t0 ?? (ctx.currentTime + 0.12);
    this.paso = 0; this.compas = 0;
    this.pend = null; this.cfg = null; this.sesion = null; this.activo = true;
    this.e = { s: 0, compas: 0, b: 0, acorde: [0, 0, 0], raiz: 0, dp: 0.15, v: 1, int: 0.3, modo: 'menu', nm: [], tonica: 0, ultimo: false };
  }
  configurar(cfg) {
    this.pend = { eraIdx: Math.max(0, Math.min(5, cfg.eraIdx | 0)), modo: TIPOS_MODO[cfg.modo] ? cfg.modo : 'combate', intensidad: Math.max(0, Math.min(1, cfg.intensidad ?? 0.3)) };
    if (!this.cfg) this.cfg = null;
  }
  detener(fundido = 1.2) {
    this.activo = false;
    this._cerrar(this.sesion, this.ctx.currentTime, fundido);
    this.sesion = null;
  }
  _cerrar(s, t, dur) {
    if (!s) return;
    const g = s.bus.gain; g.cancelScheduledValues(t); g.setValueAtTime(Math.max(0.0001, g.value || 1), t); g.linearRampToValueAtTime(0.0001, t + dur);
    if (!this.offline) setTimeout(() => { try { s.bus.disconnect(); } catch { /* ya desconectado */ } }, (dur + 0.5) * 1000);
  }
  _durPaso() { return 60 / (this.sesion.tema.bpm * (TEMPO_MODO[this.sesion.modo] ?? 1)) / 4; }
  _inicioCompas() {
    const p = this.pend;
    if (p) {
      const ses = this.sesion;
      const nueva = !ses || ses.eraIdx !== p.eraIdx || ses.modo !== p.modo;
      if (nueva) {
        const tema = TEMAS[p.eraIdx];
        const bus = this.ctx.createGain();
        bus.connect(this.destino);
        const dpAnt = ses ? this._durPaso() : 0.15;
        const barra = dpAnt * (ses ? ses.tema.pasos : tema.pasos);
        const rapido = p.modo === 'victoria' || p.modo === 'derrota' || p.modo === 'jefe';
        const fin = rapido ? 0.25 : Math.min(2.2, barra * 0.8);
        bus.gain.setValueAtTime(0.0001, this.t); bus.gain.linearRampToValueAtTime(1, this.t + (ses ? fin : 0.08));
        if (ses) this._cerrar(ses, this.t, fin);
        this.sesion = { bus, tema, eraIdx: p.eraIdx, modo: p.modo, compas: 0 };
        this.paso = 0; this.compas = 0;
      }
      this.sesion.int = p.intensidad;
      this.pend = null; this.cfg = p;
    }
    if (!this.sesion) return false;
    const s = this.sesion, tema = s.tema, e = this.e;
    const prog = PROG_MODO[s.modo] ?? tema.prog;
    const [r, cal] = prog[this.compas % prog.length];
    e.raiz = tema.tonica + r;
    e.acorde = INT[cal].map((i) => e.raiz + i);
    e.compas = this.compas; e.b = this.compas % prog.length; e.ultimo = e.b === prog.length - 1;
    e.tonica = tema.tonica; e.modo = s.modo;
    const baseInt = { menu: 0.35, intermedio: 0.25, victoria: 0.55, derrota: 0.2 }[s.modo];
    e.int = baseInt ?? (s.modo === 'jefe' ? Math.max(0.9, s.int ?? 0.9) : (s.int ?? 0.3));
    e.v = (0.78 + 0.22 * e.int) * (s.modo === 'jefe' ? 0.66 : 1);
    return true;
  }
  _paso() {
    const s = this.sesion, tema = s.tema, e = this.e;
    e.s = this.paso; e.dp = this._durPaso();
    const tipos = TIPOS_MODO[s.modo];
    // notas melódicas de este paso
    e.nm.length = 0;
    if (s.modo === 'victoria') {
      if (e.s % 4 === 0) { const k = e.s / 4 + (e.b % 2) * 2; e.nm.push([nota(e, k, 1), 3]); if (e.s === 0) e.nm.push([e.raiz + 24, 8]); }
    } else if (s.modo === 'derrota') {
      if (e.s === 0) e.nm.push([nota(e, 2, 1), 8]); else if (e.s === 8) e.nm.push([nota(e, 1, 1), 6]);
    } else {
      const m = tema.motivo.get((this.compas % tema.prog.length) * tema.pasos + e.s);
      if (m) for (const [semi, d] of m) e.nm.push([tema.tonica + semi, d]);
    }
    const c = { ctx: this.ctx, dest: s.bus, rev: this.rev };
    for (const capa of tema.capas) {
      if (!tipos.includes(capa.tipo)) continue;
      if (capa.tipo !== 'jefe' && e.int < capa.min) continue;
      if (capa.tipo === 'tension' && s.modo !== 'combate' && s.modo !== 'jefe') continue;
      capa.f(c, this.t, e);
    }
  }
  /** Programa todos los pasos con inicio anterior a `hasta` (instante del contexto). */
  avanzar(hasta) {
    let guarda = 0;
    while (this.activo && this.t < hasta && guarda++ < 4000) {
      if (this.paso === 0 && !this._inicioCompas()) { this.t = hasta; return; }
      if (!this.sesion) { this.t = hasta; return; }
      this._paso();
      this.t += this._durPaso();
      this.paso++;
      if (this.paso >= this.sesion.tema.pasos) { this.paso = 0; this.compas++; }
    }
  }
  /** Duración de un compás en segundos para la configuración actual. */
  duracionCompas(eraIdx, modo = 'combate') { return 60 / (TEMAS[eraIdx].bpm * (TEMPO_MODO[modo] ?? 1)) / 4 * TEMAS[eraIdx].pasos; }
}
