// Construcción de la anatomía de cada clase de zombi: proporciones, piel, rasgos propios. El vestuario va en vestuario.js.
import { KIND } from './geometrias.js';
import { MAT, Modelo } from './granja.js';
import { J, NJ } from './matematica.js';
import { crearRng } from '../../nucleo/util.js';
import { vestirEra, armadura, explosivoEra } from './vestuario.js';

export const lin = (h) => [(((h >> 16) & 255) / 255) ** 2, (((h >> 8) & 255) / 255) ** 2, ((h & 255) / 255) ** 2];
export const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
export const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];

// Proporciones (H altura, W anchura de tronco, G grosor de miembros …) y parámetros de animación por clase.
export const PERFIL = {
  caminante: {
    H: 1.0, W: 1.0, G: 1.0, tw: 1.0, td: 1.0, th: 1.0, cuello: 0, cabeza: 1.0, altura: 1.82,
    pieles: [0x7d8f6c, 0x8a9477, 0x948f78, 0x77888a, 0x859a72], ojos: 0xe8e0a0,
    anim: { zancada: 1.15, pierna: 0.42, rodilla: 0.55, brazo: 0.09, inclina: 0.3, cabInc: 0.18, cabLado: 0.26, boca: 0.2,
      bI: [-1.18, 0.1, -0.35], bD: [-0.1, 0.08, -0.14], arrastre: 1, hombro: 0.1, cadera: 0.16, rebote: 0.03, vref: 2.0, temblor: 0.5 },
  },
  corredor: {
    H: 1.03, W: 0.8, G: 0.78, tw: 0.84, td: 0.86, th: 1.0, cuello: 0.04, cabeza: 0.98, altura: 1.8,
    pieles: [0xa89a58, 0xb4a468, 0x9c9a6a, 0xb09a62], ojos: 0xfff0a0,
    anim: { zancada: 2.3, pierna: 0.98, rodilla: 1.5, brazo: 0.62, inclina: 0.66, cabInc: -0.5, cabLado: 0.1, boca: 0.5,
      bI: [0.75, 0.25, -1.0], bD: [0.75, 0.25, -1.0], arrastre: 0, hombro: 0, cadera: 0.12, rebote: 0.07, vref: 6.4, temblor: 0.9 },
  },
  acorazado: {
    H: 1.06, W: 1.32, G: 1.28, tw: 1.3, td: 1.28, th: 1.0, cuello: 0, cabeza: 1.0, altura: 1.95,
    pieles: [0x7d8890, 0x899088, 0x808a86], ojos: 0xdde8ff,
    anim: { zancada: 1.05, pierna: 0.33, rodilla: 0.38, brazo: 0.1, inclina: 0.1, cabInc: 0.04, cabLado: 0.06, boca: 0.1,
      bI: [-0.95, 0.28, -0.3], bD: [-0.8, 0.3, -0.3], arrastre: 0, hombro: 0, cadera: 0.1, rebote: 0.02, vref: 1.7, temblor: 0.2 },
  },
  escupidor: {
    H: 1.04, W: 0.88, G: 0.86, tw: 0.9, td: 0.9, th: 0.95, cuello: 0.34, cabeza: 0.92, altura: 2.0,
    pieles: [0x8aa84a, 0x98b25a, 0x7fa05c, 0x92aa55], ojos: 0xd8ff70,
    anim: { zancada: 1.2, pierna: 0.38, rodilla: 0.5, brazo: 0.1, inclina: 0.22, cabInc: 0.2, cabLado: 0.18, boca: 0.4,
      bI: [-0.55, 0.22, -0.9], bD: [-0.5, 0.22, -0.95], arrastre: 0, hombro: 0.05, cadera: 0.14, rebote: 0.025, vref: 2.4, temblor: 0.5 },
  },
  apestado: {
    H: 0.93, W: 1.5, G: 1.18, tw: 1.75, td: 1.9, th: 0.95, cuello: 0, cabeza: 0.86, altura: 1.75,
    pieles: [0x86a864, 0x94a870, 0x7f9f66, 0x90a47a], ojos: 0xf0ff80,
    anim: { zancada: 1.0, pierna: 0.28, rodilla: 0.22, brazo: 0.07, inclina: 0.1, cabInc: 0.1, cabLado: 0.12, boca: 0.3,
      bI: [-0.28, 0.82, -0.2], bD: [-0.22, 0.8, -0.2], arrastre: 0, hombro: 0, cadera: 0.28, rebote: 0.03, vref: 1.6, temblor: 0.3 },
  },
  mole: {
    H: 1.38, W: 1.55, G: 1.5, tw: 1.5, td: 1.45, th: 1.05, cuello: 0, cabeza: 0.7, altura: 2.6,
    pieles: [0x9a6a5e, 0x8c6258, 0xa07466, 0x946c62], ojos: 0xffd8b0,
    anim: { zancada: 1.5, pierna: 0.36, rodilla: 0.3, brazo: 0.08, inclina: 0.28, cabInc: 0.1, cabLado: 0.1, boca: 0.2,
      bI: [-0.1, 0.34, -0.15], bD: [-0.22, 0.4, -0.18], arrastre: 0, hombro: 0, cadera: 0.1, rebote: 0.03, vref: 2.2, temblor: 0.2 },
    brazoI: { l: 0.82, g: 0.7 }, brazoD: { l: 1.18, g: 2.5 },
  },
  aullador: {
    H: 1.05, W: 0.74, G: 0.74, tw: 0.8, td: 0.82, th: 1.0, cuello: 0.02, cabeza: 1.1, altura: 1.9,
    pieles: [0xb896b4, 0xa890a8, 0xb89ca6, 0xa6a0b4], ojos: 0xffe0f0,
    anim: { zancada: 1.15, pierna: 0.4, rodilla: 0.5, brazo: 0.08, inclina: 0.2, cabInc: -0.3, cabLado: 0.16, boca: 0.95,
      bI: [-1.85, 0.35, -1.85], bD: [-1.75, 0.35, -1.9], arrastre: 0, hombro: 0, cadera: 0.14, rebote: 0.02, vref: 2.6, temblor: 1.1 },
  },
  detonador: {
    H: 1.0, W: 0.96, G: 0.95, tw: 0.98, td: 0.98, th: 1.0, cuello: 0, cabeza: 1.0, altura: 1.8,
    pieles: [0xb88860, 0xa87c58, 0xb4875f, 0xa07f66], ojos: 0xffd070,
    anim: { zancada: 1.7, pierna: 0.62, rodilla: 0.95, brazo: 0.05, inclina: 0.34, cabInc: -0.1, cabLado: 0.1, boca: 0.35,
      bI: [-1.15, -0.3, -1.25], bD: [-1.15, -0.3, -1.25], arrastre: 0, hombro: 0, cadera: 0.18, rebote: 0.045, vref: 4.6, temblor: 0.5 },
  },
};

export const SANGRE = lin(0x4a0b0d);
export const HUESO = lin(0xd8d0b8);

export function crearModeloZombi(claseId, eraIdx, semilla, elite) {
  const P = PERFIL[claseId] || PERFIL.caminante;
  const rng = crearRng((semilla >>> 0) + 1337);
  const M = new Modelo(120);
  const eliteK = elite ? 1.1 : 1;
  const H = P.H * rng.rango(0.95, 1.07) * eliteK, Wc = P.W * rng.rango(0.92, 1.1) * (elite ? 1.08 : 1), Gc = P.G * rng.rango(0.92, 1.1) * (elite ? 1.08 : 1);
  const alto = Math.pow(H, 0.85);                         // la altura de piernas/torso crece algo menos que H
  // Dimensiones (m)
  const hf = 0.08 * H, muslo = 0.42 * H, tibia = 0.42 * H;
  const brI = P.brazoI || { l: 1, g: 1 }, brD = P.brazoD || { l: 1, g: 1 };
  const d = {
    H, W: Wc, G: Gc, hf, muslo, tibia, hy: hf + muslo + tibia,
    th: 0.56 * H * P.th, tw: 0, td: 0,
    ua: 0.3 * H, fa: 0.28 * H, cab: P.cabeza, neckL: P.cuello * H, brI, brD,
  };
  d.tw = 0.4 * (0.5 + 0.5 * Wc) * P.tw; d.td = 0.24 * (0.5 + 0.5 * Wc) * P.td;
  if (claseId === 'apestado') { d.tw = 0.4 * 1.55; d.td = 0.24 * 1.9; }
  d.sx = d.tw * 0.5 + 0.035 * Gc; d.sy = d.th * 0.9;
  d.cabY = d.th * 0.98 + d.neckL; d.cabZ = d.neckL * 0.35;
  d.hr = 0.13 * P.cabeza * 1.12 * (0.96 + 0.08 * rng());   // radio de cabeza
  const piel = lin(rng.elegir(P.pieles));
  const pielB = mul(piel, 0.86), pielO = mul(piel, 0.62);
  const ctx = { M, d, rng, era: eraIdx, anclas: {}, clase: claseId, P, piel, pielB, pielO, elite, J, MAT, KIND, hand: {} };
  ctx.p = (kind, mat, joint, pos, tam, col, o) => M.anadir(KIND[kind], mat, joint, pos[0], pos[1], pos[2], tam[0], tam[1], tam[2], col, o);
  ctx.v = (c, k = 0.06) => { const f = 1 + (rng() - 0.5) * 2 * k; return [c[0] * f, c[1] * f, c[2] * f]; };

  // ── Offsets de reposo de las articulaciones ──
  const rest = new Float32Array(NJ * 3);
  const set = (j, x, y, z) => { rest[j * 3] = x; rest[j * 3 + 1] = y; rest[j * 3 + 2] = z; };
  const caderaX = 0.095 * Wc * (claseId === 'apestado' ? 1.5 : 1) * (claseId === 'mole' ? 1.3 : 1);
  set(J.RAIZ, 0, 0, 0);
  set(J.PELVIS, 0, d.hy, 0);
  set(J.TORSO, 0, 0.1 * H, 0);
  set(J.CABEZA, 0, d.cabY, d.cabZ);
  set(J.MANDIBULA, 0, -0.06 * d.cab, 0.0);
  set(J.BRAZO_I, -d.sx, d.sy, 0); set(J.BRAZO_D, d.sx, d.sy, 0);
  set(J.ANTEBRAZO_I, 0, -d.ua * brI.l, 0); set(J.ANTEBRAZO_D, 0, -d.ua * brD.l, 0);
  set(J.MUSLO_I, -caderaX, -0.04 * H, 0); set(J.MUSLO_D, caderaX, -0.04 * H, 0);
  set(J.TIBIA_I, 0, -muslo, 0); set(J.TIBIA_D, 0, -muslo, 0);
  set(J.PIE_I, 0, -tibia, 0); set(J.PIE_D, 0, -tibia, 0);
  set(J.X0, 0, d.th * 0.5, 0); set(J.X1, 0, d.th * 0.5, 0); set(J.X2, 0, 0, 0);
  ctx.rest = rest;
  // El modelo "izquierdo" es −X (el zombi mira a +Z, su izquierda queda en −X… con +Y arriba la mano derecha es −X).
  // Convención de este módulo: I = −X, D = +X.

  anatomia(ctx);
  rasgosClase(ctx);
  if (claseId === 'acorazado') armadura(ctx); else vestirEra(ctx);
  if (claseId === 'detonador') explosivoEra(ctx);
  heridas(ctx);
  ojos(ctx);

  return { modelo: M, rest, d, P, rng, piel, altura: P.altura * eliteK * rng.rango(0.97, 1.04), anclas: ctx.anclas || {}, brazoFalta: ctx.brazoFalta | 0, hand: ctx.hand };
}

function anatomia(c) {
  const { d, P, p, piel, pielB, pielO, rng, clase } = c;
  const Wc = d.W, Gc = d.G;
  c.brazoFalta = (rng() < 0.1 && clase !== 'mole' && clase !== 'detonador' && clase !== 'acorazado') ? (rng() < 0.5 ? -1 : 1) : 0;
  // Pelvis (el vestuario la recolorea si lleva pantalón: se pinta con color de pantalón después)
  c.pelvisCol = mul(piel, 0.7);
  p('almohada', MAT.MATE, J.PELVIS, [0, 0.035 * d.H, 0], [d.tw * 0.9 * (clase === 'apestado' ? 1.25 : 1), 0.2 * d.H, d.td * 0.98], c.pelvisCol);
  // Torso
  p('torso', MAT.MATE, J.TORSO, [0, d.th * 0.5 - 0.01, 0], [d.tw, d.th, d.td], piel);
  // Cuello
  if (d.neckL < 0.05) p('cilindro', MAT.MATE, J.CABEZA, [0, -0.045 * d.cab, 0], [0.095 * d.cab, 0.1 * d.cab, 0.095 * d.cab], pielB);
  // Cabeza
  const hr = d.hr, hz = 0.02;
  p('cabeza', MAT.MATE, J.CABEZA, [0, hr * 0.92, hz], [hr * 1.72, hr * 2.0, hr * 1.9], piel);
  p('mandibula', MAT.MATE, J.MANDIBULA, [0, -hr * 0.28, hr * 0.72], [hr * 1.35, hr * 0.75, hr * 1.2], pielB);
  // Dientes (detalle)
  p('bloque', MAT.MATE, J.MANDIBULA, [0, hr * 0.12, hr * 1.22], [hr * 0.9, hr * 0.08, hr * 0.1], lin(0xcfc6a0), { lod: true });
  p('bloque', MAT.MATE, J.CABEZA, [0, hr * 0.5, hr * 1.1], [hr * 0.9, hr * 0.08, hr * 0.14], lin(0xcfc6a0), { lod: true });
  // Cuencas oculares oscuras (ojos se pintan en ojos())
  for (const s of [-1, 1]) p('esfera', MAT.MATE, J.CABEZA, [s * hr * 0.4, hr * 1.12, hr * 0.78], [hr * 0.44, hr * 0.36, hr * 0.3], lin(0x120c0a));
  // Nariz hundida
  p('cono', MAT.MATE, J.CABEZA, [0, hr * 0.92, hr * 1.0], [hr * 0.2, hr * 0.3, hr * 0.22], pielB, { rx: 1.2, lod: true });
  // Brazos
  for (const s of [-1, 1]) {
    const dim = s < 0 ? d.brI : d.brD;
    const J1 = s < 0 ? J.BRAZO_I : J.BRAZO_D, J2 = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D;
    const g = 0.092 * Gc * dim.g, L1 = d.ua * dim.l, L2 = d.fa * dim.l;
    p('esfera', MAT.MATE, J1, [0, 0, 0], [g * 1.06, g * 1.04, g * 1.06], piel);                       // deltoides
    p('segmento', MAT.MATE, J1, [0, -L1 / 2, 0], [g, L1 * 1.04, g], piel);
    const falta = s === c.brazoFalta;
    if (falta) {
      p('esfera', MAT.MATE, J1, [0, -L1 + 0.01, 0], [g * 0.9, g * 0.7, g * 0.9], SANGRE);
      p('cilindro', MAT.MATE, J1, [0, -L1 - 0.0, 0], [g * 0.3, g * 0.55, g * 0.3], HUESO, { lod: true });
      c.hand[s] = null;
      continue;
    }
    const g2 = 0.074 * Gc * dim.g;
    p('esfera', MAT.MATE, J2, [0, 0, 0], [g2 * 1.05, g2 * 1.03, g2 * 1.05], pielB);                      // codo
    p('segmento', MAT.MATE, J2, [0, -L2 / 2, 0], [g2, L2 * 1.04, g2], pielB);
    const hs = 0.085 * 1.15 * Gc * Math.min(1.6, dim.g * 0.8 + 0.2);
    p('almohada', MAT.MATE, J2, [0, -L2 - hs * 0.45, 0], [hs * 0.95, hs * 1.15, hs * 0.6], pielO);   // mano
    c.hand[s] = { j: J2, y: -L2 - hs * 0.45, hs };
    for (let k = -1; k <= 1; k++) p('segmento', MAT.MATE, J2, [k * hs * 0.32, -L2 - hs * 1.25, hs * 0.05], [hs * 0.22, hs * 0.9, hs * 0.22], pielO, { rx: 0.2, lod: true });
  }
  // Piernas
  for (const s of [-1, 1]) {
    const Jm = s < 0 ? J.MUSLO_I : J.MUSLO_D, Jt = s < 0 ? J.TIBIA_I : J.TIBIA_D, Jp = s < 0 ? J.PIE_I : J.PIE_D;
    const g = 0.15 * Gc * (clase === 'apestado' ? 1.1 : 1), g2 = 0.115 * Gc * (clase === 'apestado' ? 1.1 : 1);
    p('segmento', MAT.MATE, Jm, [0, -d.muslo / 2 + 0.01, 0], [g, d.muslo * 1.06, g * 1.02], c.pelvisCol);
    p('esfera', MAT.MATE, Jt, [0, 0, 0.005], [g2 * 1.03, g2 * 1.0, g2 * 1.03], pielB);
    p('segmento', MAT.MATE, Jt, [0, -d.tibia / 2 + 0.01, 0], [g2, d.tibia * 1.04, g2], pielB);
    // pie (se recolorea con botas en el vestuario)
    p('almohada', MAT.MATE, Jp, [0, -0.025 * d.H, 0.055 * d.H], [0.115 * Gc * 1.1, 0.085 * d.H * 1.15, 0.27 * d.H * 1.1], pielO);
  }
}

function rasgosClase(c) {
  const { d, P, p, piel, pielB, pielO, rng, clase, elite } = c;
  const hr = d.hr;
  if (clase === 'escupidor') {
    // Cuello largo desde el torso hasta la cabeza
    const len = Math.hypot(d.neckL, d.cabZ), ang = Math.atan2(d.cabZ, d.neckL);
    p('segmento', MAT.MATE, J.TORSO, [0, d.th * 0.97 + d.neckL / 2, d.cabZ / 2], [0.105, len * 1.12, 0.105], pielB, { rx: ang });
    for (let k = 0; k < 4; k++) p('toro', MAT.MATE, J.TORSO, [0, d.th * 0.97 + d.neckL * (0.2 + 0.2 * k), d.cabZ * (0.2 + 0.2 * k)], [0.14, 0.08, 0.14], mul(pielB, 0.8), { lod: true });
    // Buche verde brillante
    const verde = [0.22, 1.5, 0.12];
    p('esfera', MAT.EMISIVO, J.X0, [0, d.th * 0.3, d.td * 0.5 + 0.04], [0.3, 0.34, 0.28], verde, { pulso: 2 });
    p('esfera', MAT.MATE, J.X0, [0, d.th * 0.46, d.td * 0.5 - 0.02], [0.25, 0.1, 0.2], lin(0x4a6a2a), { lod: true });
    for (let k = 0; k < 5; k++) {
      const a = rng.rango(-0.9, 0.9), b = rng.rango(-0.35, 0.3);
      p('esfera', MAT.EMISIVO, J.X0, [Math.sin(a) * 0.16, d.th * 0.3 + b * 0.5, d.td * 0.5 + 0.15 - Math.abs(a) * 0.1], [0.08, 0.08, 0.08], [0.5, 1.9, 0.2], { pulso: 2, lod: true });
    }
    // baba/ácido de la barbilla
    p('segmento', MAT.EMISIVO, J.MANDIBULA, [0, -hr * 0.9, hr * 1.2], [hr * 0.18, hr * 1.1, hr * 0.18], [0.35, 1.5, 0.12], { lod: true });
    c.anclas.boca = { j: J.MANDIBULA, x: 0, y: -hr * 0.4, z: hr * 1.4 };
  }
  if (clase === 'apestado') {
    // Panza hinchada y pústulas emisivas
    p('almohada', MAT.MATE, J.X0, [0, -d.th * 0.12, d.td * 0.28], [d.tw * 1.05, d.th * 0.8, d.td * 1.05], piel);
    p('esfera', MAT.MATE, J.X0, [-d.tw * 0.28, -d.th * 0.05, d.td * 0.58], [0.26, 0.24, 0.2], mul(pielB, 1.05), { lod: true });
    p('esfera', MAT.MATE, J.TORSO, [0, d.th * 0.8, -d.td * 0.1], [d.tw * 0.9, d.th * 0.3, d.td * 0.9], pielB);   // joroba
    const n = elite ? 12 : 9;
    for (let k = 0; k < n; k++) {
      const a = rng.rango(-1.7, 1.7), v = rng.rango(-0.5, 0.45), s = rng.rango(0.07, 0.15);
      const r = d.tw * 0.52, z = d.td * 0.55 * Math.cos(a) + d.td * 0.18;
      const col = rng() < 0.7 ? [1.35, 1.6, 0.18] : [1.7, 0.75, 0.1];
      p('esfera', MAT.EMISIVO, J.X0, [Math.sin(a) * r * 1.05, v * d.th * 0.8, Math.max(0.0, z)], [s, s * 0.9, s], col, { pulso: 2 });
      p('esfera', MAT.MATE, J.X0, [Math.sin(a) * r * 1.0, v * d.th * 0.8 - 0.01, Math.max(0.0, z) - 0.02], [s * 1.5, s * 1.3, s * 1.4], mul(pielO, 1.1), { lod: true });
    }
    p('esfera', MAT.EMISIVO, J.CABEZA, [hr * 0.7, hr * 1.25, hr * 0.4], [0.07, 0.07, 0.07], [1.5, 1.6, 0.2], { pulso: 2, lod: true });
    // barrigas colgantes: pliegue
    p('toro', MAT.MATE, J.X0, [0, -d.th * 0.32, d.td * 0.28], [d.tw * 1.15, 0.1, d.td * 1.1], mul(pielB, 0.8), { lod: true });
  }
  if (clase === 'mole') {
    // Hombros enormes, joroba y brazo gigante con muñón de hueso y cicatrices
    p('almohada', MAT.MATE, J.TORSO, [0.12, d.th * 0.82, -d.td * 0.15], [d.tw * 1.1, d.th * 0.34, d.td * 1.0], piel);
    p('esfera', MAT.MATE, J.BRAZO_D, [0.02, 0.0, 0.0], [0.5, 0.46, 0.5], piel);
    const d2 = d.brD, hs = 0.085 * 1.15 * d.G * Math.min(1.6, d2.g * 0.8 + 0.2);
    // puño gigante
    p('almohada', MAT.MATE, J.ANTEBRAZO_D, [0, -d.fa * d2.l - 0.1, 0.02], [0.4, 0.42, 0.36], pielO);
    for (let k = -1.5; k <= 1.5; k++) p('esfera', MAT.MATE, J.ANTEBRAZO_D, [k * 0.095, -d.fa * d2.l - 0.28, 0.1], [0.11, 0.1, 0.11], pielB, { lod: true });
    // puntas de hueso asomando del antebrazo
    for (let k = 0; k < 3; k++) p('cono', MAT.MATE, J.ANTEBRAZO_D, [rng.rango(-0.1, 0.1), -d.fa * 0.4 - k * 0.12, 0.2 + k * 0.02], [0.05, 0.16, 0.05], HUESO, { rx: 1.4, lod: true });
    // costuras / cicatrices
    for (let k = 0; k < 3; k++) p('almohada', MAT.MATE, J.TORSO, [rng.rango(-0.2, 0.2), d.th * rng.rango(0.3, 0.75), d.td * 0.46], [0.22, 0.03, 0.02], SANGRE, { rz: rng.rango(-0.6, 0.6), lod: true });
    c.pelvisCol = mul(piel, 0.7);
  }
  if (clase === 'aullador') {
    // Costillas abiertas: interior oscuro + arcos de hueso
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.52, d.td * 0.2], [d.tw * 0.78, d.th * 0.5, d.td * 0.72], lin(0x3a0a10));
    for (let k = 0; k < 5; k++) {
      const y = d.th * (0.34 + k * 0.1);
      p('arcoFino', MAT.MATE, J.TORSO, [0, y, d.td * 0.04], [d.tw * 1.0 * (1 - 0.05 * k), 0.034, d.td * 1.05], HUESO);
    }
    p('cilindro', MAT.MATE, J.TORSO, [0, d.th * 0.52, d.td * 0.06], [0.035, d.th * 0.5, 0.035], HUESO, { lod: true });   // esternón
    // boca abierta y garganta roja
    p('esfera', MAT.EMISIVO, J.CABEZA, [0, hr * 0.42, hr * 0.5], [hr * 0.7, hr * 0.26, hr * 0.3], [0.8, 0.1, 0.08], { pulso: 2, lod: true });
    // cabello largo y lacio
    for (let k = 0; k < 5; k++) p('segmento', MAT.MATE, J.CABEZA, [(k - 2) * hr * 0.35, hr * 1.2, -hr * 0.7], [hr * 0.5, hr * 2.2, hr * 0.28], lin(0x2a2420), { rx: 0.18 });
    // tendones del cuello
    for (const s of [-1, 1]) p('segmento', MAT.MATE, J.CABEZA, [s * hr * 0.4, -hr * 0.1, hr * 0.5], [hr * 0.18, hr * 0.8, hr * 0.18], mul(pielO, 0.8), { rx: 0.3, lod: true });
    c.anclas.boca = { j: J.MANDIBULA, x: 0, y: -hr * 0.3, z: hr * 1.2 };
  }
  if (clase === 'corredor') {
    // Costillas marcadas y columna a la vista; pelo revuelto
    for (let k = 0; k < 4; k++) p('arcoFino', MAT.MATE, J.TORSO, [0, d.th * (0.42 + k * 0.09), d.td * 0.1], [d.tw * 0.98, 0.02, d.td * 1.0], mul(piel, 1.15), { lod: true });
    for (let k = 0; k < 7; k++) p('cono', MAT.MATE, J.CABEZA, [rng.rango(-hr * 0.5, hr * 0.5), hr * rng.rango(1.5, 1.95), rng.rango(-hr * 0.7, hr * 0.3)], [hr * 0.28, hr * 0.7, hr * 0.28], lin(0x2c2418), { rx: rng.rango(-0.7, 0.4), rz: rng.rango(-0.6, 0.6) });
  }
  if (clase === 'caminante') {
    // Hombro caído asimétrico: la clavícula sobresale; trozo de carne arrancada
    p('almohada', MAT.MATE, J.TORSO, [d.tw * 0.28, d.th * 0.86, d.td * 0.05], [0.18, 0.06, 0.12], SANGRE, { lod: true });
  }
}

function heridas(c) {
  const { d, p, rng, clase, era } = c;
  const n = clase === 'acorazado' ? 1 : rng.entero(1, 3);
  for (let k = 0; k < n; k++) {
    const y = d.th * rng.rango(0.25, 0.85), x = rng.rango(-0.35, 0.35) * d.tw;
    const s = rng.rango(0.04, 0.085);
    p('almohada', MAT.MATE, J.TORSO, [x, y, d.td * 0.5 * 0.86], [s * 1.6, s * 1.2, 0.02], rng() < 0.5 ? SANGRE : lin(0x1a0808), { rz: rng.rango(-0.8, 0.8), lod: true });
  }
  if (rng() < 0.35) p('almohada', MAT.MATE, J.CABEZA, [rng.signo() * c.d.hr * 0.5, c.d.hr * 1.15, c.d.hr * 0.65], [0.07, 0.09, 0.03], SANGRE, { lod: true });
}

function ojos(c) {
  const { d, p, P, elite, clase } = c;
  const hr = d.hr;
  const col = lin(P.ojos);
  for (const s of [-1, 1]) {
    if (elite) p('esfera', MAT.EMISIVO, J.CABEZA, [s * hr * 0.4, hr * 1.12, hr * 0.9], [hr * 0.3, hr * 0.26, hr * 0.2], [3.2, 0.9, 0.18], { pulso: 3 });
    else p('esfera', MAT.EMISIVO, J.CABEZA, [s * hr * 0.4, hr * 1.12, hr * 0.9], [hr * 0.17, hr * 0.15, hr * 0.12], [col[0] * 1.1, col[1] * 1.1, col[2] * 1.1], { pulso: 3, lod: true });
  }
}
