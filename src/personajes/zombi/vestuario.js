// Vestuario por era, armaduras del Acorazado y explosivos del Detonador. Todo son piezas sobre las articulaciones del esqueleto.
import { J } from './matematica.js';
import { MAT } from './granja.js';

const lin = (h) => [(((h >> 16) & 255) / 255) ** 2, (((h >> 8) & 255) / 255) ** 2, ((h & 255) / 255) ** 2];
const mul = (c, k) => [c[0] * k, c[1] * k, c[2] * k];
const SANGRE = lin(0x4a0b0d), BARRO = lin(0x3a2e22);
const luz = (h, k) => mul(lin(h), k);

// ───────────────────────── utilidades de prenda ─────────────────────────
function camisa(c, col, { alto = 0.94, ancho = 1.08, hondo = 1.12, y = 0, mat = MAT.MATE } = {}) {
  const { d, p } = c;
  p('torso', mat, J.TORSO, [0, d.th * (0.5 - (1 - alto) * 0.5) + y, 0.003], [d.tw * ancho, d.th * alto, d.td * hondo], col);
}
function mangas(c, col, f1 = 0.92, f2 = 0.55, g = 1.16) {
  const { d, p } = c;
  for (const s of [-1, 1]) {
    const dim = s < 0 ? d.brI : d.brD, a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D;
    const gg = 0.092 * d.G * dim.g * g, L1 = d.ua * dim.l * f1, L2 = d.fa * dim.l * f2;
    p('segmento', MAT.MATE, a, [0, -L1 / 2 - 0.005, 0], [gg, L1, gg], col);
    if (c.hand[s]) p('segmento', MAT.MATE, b, [0, -L2 / 2 + 0.01, 0], [0.074 * d.G * dim.g * g, L2 * 1.0, 0.074 * d.G * dim.g * g], col);
  }
}
function pantalon(c, col, f = 0.8, g = 1.14) {
  const { d, p } = c;
  p('almohada', MAT.MATE, J.PELVIS, [0, 0.035 * d.H, 0], [d.tw * 0.93 * (c.clase === 'apestado' ? 1.25 : 1), 0.21 * d.H, d.td * 1.02], col);
  for (const s of [-1, 1]) {
    const m = s < 0 ? J.MUSLO_I : J.MUSLO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D;
    const g1 = 0.15 * d.G * g * (c.clase === 'apestado' ? 1.1 : 1), g2 = 0.115 * d.G * g * (c.clase === 'apestado' ? 1.1 : 1);
    c.p('segmento', MAT.MATE, m, [0, -d.muslo / 2 + 0.01, 0], [g1, d.muslo * 1.08, g1 * 1.02], col);
    if (f > 0) c.p('segmento', MAT.MATE, t, [0, -d.tibia * f / 2 + 0.01, 0], [g2, d.tibia * f * 1.02, g2], col);
  }
}
function botas(c, col, alto = 0.5, g = 1.2) {
  const { d, p } = c;
  for (const s of [-1, 1]) {
    const t = s < 0 ? J.TIBIA_I : J.TIBIA_D, f = s < 0 ? J.PIE_I : J.PIE_D;
    p('almohada', MAT.MATE, f, [0, -0.02 * d.H, 0.06 * d.H], [0.125 * d.G * 1.1, 0.1 * d.H * 1.15, 0.3 * d.H * 1.1], col);
    if (alto > 0) p('segmento', MAT.MATE, t, [0, -d.tibia * (1 - alto / 2) + 0.01, 0], [0.115 * d.G * g, d.tibia * alto, 0.115 * d.G * g], col);
  }
}
function cinturon(c, col, hebilla = true) {
  const { d, p } = c;
  p('cilindro', MAT.MATE, J.TORSO, [0, 0.035 * d.H, 0], [d.tw * 0.9, 0.05, d.td * 1.03], col);
  if (hebilla) p('bloque', MAT.METAL, J.TORSO, [0, 0.035 * d.H, d.td * 0.53], [0.05, 0.05, 0.02], lin(0xc8a64a), { lod: true });
}
function botones(c, col, n = 5, y0 = 0.15, y1 = 0.85) {
  const { d, p } = c;
  for (let k = 0; k < n; k++) p('esfera', MAT.METAL, J.TORSO, [d.tw * 0.07, d.th * (y0 + (y1 - y0) * k / Math.max(1, n - 1)), d.td * 0.52], [0.022, 0.022, 0.016], col, { lod: true });
}
function desgarro(c, n = 3, color = null) {
  const { d, p, rng } = c;
  for (let k = 0; k < n; k++) p('almohada', MAT.MATE, J.TORSO, [rng.rango(-0.4, 0.4) * d.tw, d.th * rng.rango(0.15, 0.8), d.td * 0.54], [rng.rango(0.06, 0.13), rng.rango(0.06, 0.12), 0.012], color || c.piel, { rz: rng.rango(0, 3), lod: true });
}
function manchas(c, n = 3) {
  const { d, p, rng } = c;
  for (let k = 0; k < n; k++) p('almohada', MAT.MATE, J.TORSO, [rng.rango(-0.4, 0.4) * d.tw, d.th * rng.rango(0.1, 0.85), d.td * 0.55], [rng.rango(0.07, 0.16), rng.rango(0.08, 0.18), 0.012], rng() < 0.6 ? SANGRE : BARRO, { rz: rng.rango(0, 3), lod: true });
}
function pelo(c, col, tipo = 'corto') {
  const { d, p, rng } = c; const hr = d.hr;
  if (tipo === 'corto') p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.32, -hr * 0.12], [hr * 1.8, hr * 1.1, hr * 1.9], col);
  else if (tipo === 'ralo') for (let k = 0; k < 6; k++) p('cono', MAT.MATE, J.CABEZA, [rng.rango(-hr * 0.5, hr * 0.5), hr * 1.8, rng.rango(-hr * 0.6, 0)], [hr * 0.25, hr * 0.5, hr * 0.25], col, { rx: rng.rango(-0.5, 0.2), rz: rng.rango(-0.5, 0.5), lod: true });
  else if (tipo === 'largo') { p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.3, -hr * 0.15], [hr * 1.85, hr * 1.1, hr * 2.0], col); p('almohada', MAT.MATE, J.CABEZA, [0, hr * 0.6, -hr * 0.85], [hr * 1.7, hr * 1.8, hr * 0.6], col); }
  else if (tipo === 'tupe') { p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.32, -hr * 0.1], [hr * 1.8, hr * 1.0, hr * 1.9], col); p('almohada', MAT.MATE, J.CABEZA, [0, hr * 1.95, hr * 0.35], [hr * 1.3, hr * 0.6, hr * 1.1], col, { rx: -0.35 }); }
}
const hex = (a) => a;
const elegirCol = (c, lista) => lin(c.rng.elegir(lista));

// ───────────────────────── ERA 0 · 1800 ─────────────────────────
function era0(c) {
  const { d, p, rng } = c; const hr = d.hr;
  const v = rng.entero(0, 3);
  const calzas = c.v(lin(v === 1 ? 0x6a5a40 : 0xd7d0bc), 0.08);
  pantalon(c, calzas, 0.62, 1.1);
  botas(c, c.v(lin(0x241a14)), v === 1 ? 0.3 : 0.62);
  if (v === 0 || v === 2) {
    const casaca = c.v(lin(v === 0 ? rng.elegir([0x7a1d1d, 0x1d2f6a]) : 0x6d1f34), 0.08);
    camisa(c, casaca, { alto: 0.98, ancho: 1.11, hondo: 1.14 });
    mangas(c, casaca, 0.95, 0.6, 1.17);
    for (const s of [-1, 1]) if (c.hand[s]) p('segmento', MAT.MATE, s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D, [0, -0.04, 0], [0.098 * d.G * 1.25, 0.09, 0.098 * d.G * 1.25], lin(0xd8d0bc));
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.5, d.td * 0.46], [d.tw * 0.34, d.th * 0.8, 0.05], lin(0xd6cfb8));      // chaleco/camisa
    botones(c, lin(0xc8a64a), 6);
    // faldones rotos
    for (const s of [-1, 1]) p('almohada', MAT.MATE, J.PELVIS, [s * d.tw * 0.28, -0.14 * d.H, -d.td * 0.42], [d.tw * 0.4, 0.4 * d.H, 0.05], casaca, { rx: 0.14, lod: false });
    // bandolera
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.52, d.td * 0.03], [0.07, d.th * 1.12, d.td * 1.16], lin(0xd8d0b8), { rz: 0.62 });
    // cuello de la casaca
    p('toro', MAT.MATE, J.CABEZA, [0, -0.05 * d.cab, 0], [0.19 * d.cab, 0.06, 0.19 * d.cab], casaca);
    cinturon(c, lin(0x2a1c12));
    if (v === 0) {   // tricornio
      p('tricornio', MAT.MATE, J.CABEZA, [0, hr * 1.62, hr * 0.0], [hr * 3.4, hr * 1.0, hr * 3.4], lin(0x1a1714), { ry: 0 });
      p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.78, -hr * 0.02], [hr * 1.85, hr * 0.7, hr * 1.9], lin(0x1a1714));
      p('toro', MAT.METAL, J.CABEZA, [0, hr * 1.6, 0], [hr * 3.2, hr * 0.2, hr * 3.2], lin(0xb8944a), { lod: true });
    } else {         // peluca empolvada + coleta
      p('esfera', MAT.MATE, J.CABEZA, [0, hr * 1.2, -hr * 0.12], [hr * 2.25, hr * 1.7, hr * 2.3], lin(0xcfcabf));
      for (const s of [-1, 1]) for (let k = 0; k < 2; k++) p('toro', MAT.MATE, J.CABEZA, [s * hr * 1.0, hr * (0.95 - k * 0.3), 0], [hr * 0.65, hr * 0.5, hr * 0.65], lin(0xc4bfb2), { rz: 1.57 });
      p('segmento', MAT.MATE, J.CABEZA, [0, hr * 0.6, -hr * 1.1], [hr * 0.4, hr * 1.5, hr * 0.4], lin(0xbfbaae), { rx: -0.25 });
      p('almohada', MAT.MATE, J.CABEZA, [0, hr * 0.85, -hr * 1.0], [hr * 0.45, hr * 0.25, hr * 0.2], lin(0x161214), { lod: true });
    }
  } else if (v === 1) {   // campesino con sombrero de paja
    const camisaC = c.v(lin(0xb8ae94), 0.1);
    camisa(c, camisaC, { alto: 0.9, ancho: 1.07 });
    mangas(c, camisaC, 0.9, 0.5, 1.14);
    camisa(c, c.v(lin(0x5a4026), 0.1), { alto: 0.62, ancho: 1.1, hondo: 1.14, y: -0.05 });    // chaleco
    cinturon(c, lin(0x3a2a18));
    p('cilindro', MAT.MATE, J.CABEZA, [0, hr * 1.5, 0], [hr * 3.6, hr * 0.16, hr * 3.6], lin(0xb89a58));
    p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.7, -hr * 0.04], [hr * 2.0, hr * 0.9, hr * 2.0], lin(0xc0a262));
    p('toro', MAT.MATE, J.CABEZA, [0, hr * 1.52, 0], [hr * 2.05, hr * 0.12, hr * 2.05], lin(0x5a2a22), { lod: true });
    desgarro(c, 2);
  } else {   // criado: camisa y delantal de cuero, gorro
    camisa(c, c.v(lin(0xc8bca0), 0.1), { alto: 0.95, ancho: 1.07 });
    mangas(c, lin(0xc8bca0), 0.92, 0.4);
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.36, d.td * 0.5], [d.tw * 0.8, d.th * 0.75, 0.05], lin(0x4a3220));
    pelo(c, lin(0x3a2c20), 'ralo');
  }
  manchas(c, 3);
}

// ───────────────────────── ERA 1 · 1850 ─────────────────────────
function era1(c) {
  const { d, p, rng } = c; const hr = d.hr;
  const v = rng.entero(0, 2);
  if (v === 0) {   // minero: mono de trabajo y casco con lámpara
    const mono = c.v(lin(0x5e5646), 0.1);
    pantalon(c, mono, 0.85, 1.14);
    camisa(c, mono, { alto: 0.7, ancho: 1.1, hondo: 1.14, y: -0.02 });
    camisa(c, c.v(lin(0x8a3a2a), 0.1), { alto: 0.36, ancho: 1.04, hondo: 1.1, y: d.th * 0.34 });      // camisa roja bajo el peto
    mangas(c, lin(0x8a3a2a), 0.9, 0.85, 1.12);
    for (const s of [-1, 1]) p('bloque', MAT.MATE, J.TORSO, [s * d.tw * 0.26, d.th * 0.78, d.td * 0.1], [0.06, d.th * 0.5, d.td * 1.05], lin(0x3e2e1a), { rx: 0.0 });    // tirantes
    botas(c, lin(0x2a2018), 0.3);
    p('cupula', MAT.METAL, J.CABEZA, [0, hr * 1.6, 0], [hr * 2.1, hr * 1.1, hr * 2.2], lin(0x9a8a46));
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.18, 0], [hr * 2.3, hr * 0.1, hr * 2.4], lin(0x8a7a3e));
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.78, hr * 0.98], [hr * 0.5, hr * 0.5, hr * 0.5], lin(0x4a4a4a), { rx: 1.57 });
    p('esfera', MAT.EMISIVO, J.CABEZA, [0, hr * 1.78, hr * 1.28], [hr * 0.36, hr * 0.36, hr * 0.2], [3.0, 2.3, 0.9], { pulso: 1 });
    p('cilindro', MAT.MATE, J.X0, [-d.tw * 0.45, d.th * 0.05, -d.td * 0.1], [0.09, d.th * 0.8, 0.09], lin(0x7a5a2a), { rz: 0.25, lod: true });   // pico a la espalda
    p('bloque', MAT.METAL, J.X0, [-d.tw * 0.72, d.th * 0.46, -d.td * 0.1], [0.34, 0.07, 0.07], lin(0x555555), { lod: true });
  } else if (v === 1) {   // pistolero: sombrero ancho, chaleco, pañuelo
    camisa(c, c.v(lin(0xc9c0a8), 0.1), { alto: 0.95 });
    mangas(c, lin(0xc9c0a8), 0.94, 0.8, 1.12);
    camisa(c, c.v(lin(0x2a2420), 0.1), { alto: 0.7, ancho: 1.1, hondo: 1.14, y: -0.02 });
    botones(c, lin(0xb8b8b0), 5);
    pantalon(c, c.v(lin(0x4a4034), 0.1), 0.9, 1.12);
    botas(c, lin(0x2c2018), 0.4);
    cinturon(c, lin(0x2a1a10));
    p('toro', MAT.MATE, J.CABEZA, [0, -0.06 * d.cab, 0.0], [0.19 * d.cab, 0.07, 0.19 * d.cab], lin(0x9a2a24));
    p('cilindro', MAT.MATE, J.CABEZA, [0, hr * 1.42, 0], [hr * 4.0, hr * 0.14, hr * 4.0], lin(0x2c2420));
    p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.78, 0], [hr * 2.05, hr * 1.1, hr * 2.1], lin(0x2c2420));
    p('toro', MAT.MATE, J.CABEZA, [0, hr * 1.5, 0], [hr * 2.1, hr * 0.14, hr * 2.1], lin(0x8a6a3a), { lod: true });
    p('cilindro', MAT.MATE, J.PELVIS, [-d.tw * 0.46, -0.02, 0.08], [0.1, 0.16, 0.06], lin(0x2a1a10), { lod: true });   // funda
  } else {   // ferroviario: gorra, mono con tirantes
    camisa(c, c.v(lin(0x6a7a8a), 0.1), { alto: 0.94, ancho: 1.1 });
    mangas(c, lin(0x6a7a8a), 0.94, 0.9, 1.14);
    pantalon(c, c.v(lin(0x4a4e5a), 0.1), 0.92, 1.13);
    botas(c, lin(0x2a2420), 0.25);
    p('cilindro', MAT.MATE, J.CABEZA, [0, hr * 1.55, 0], [hr * 2.0, hr * 0.5, hr * 2.05], lin(0x2c3038));
    p('cilindro', MAT.MATE, J.CABEZA, [0, hr * 1.35, hr * 1.0], [hr * 1.5, hr * 0.08, hr * 0.7], lin(0x1c1e24));
    p('esfera', MAT.METAL, J.CABEZA, [0, hr * 1.55, hr * 1.06], [hr * 0.3, hr * 0.3, hr * 0.12], lin(0xc8a64a), { lod: true });
    p('toro', MAT.MATE, J.CABEZA, [0, -0.06 * d.cab, 0.0], [0.19 * d.cab, 0.07, 0.19 * d.cab], lin(0xb8b0a0));
    p('almohada', MAT.MATE, J.TORSO, [d.tw * 0.28, d.th * 0.55, d.td * 0.5], [0.12, 0.12, 0.02], lin(0xb83a2a), { lod: true });
  }
  manchas(c, 3); desgarro(c, 2, c.piel);
}

// ───────────────────────── ERA 2 · 1900 ─────────────────────────
function era2(c) {
  const { d, p, rng } = c; const hr = d.hr;
  const v = rng.entero(0, 2);
  const caqui = c.v(lin(rng.elegir([0x5a5c3c, 0x6a6244, 0x4e5238])), 0.08);
  camisa(c, caqui, { alto: 0.97, ancho: 1.1, hondo: 1.14 });
  mangas(c, caqui, 0.95, 0.8, 1.15);
  pantalon(c, c.v(mul(caqui, 0.9), 0.06), 0.4, 1.12);
  // bandas (puttees) y botas
  for (const s of [-1, 1]) { const t = s < 0 ? J.TIBIA_I : J.TIBIA_D; for (let k = 0; k < 4; k++) p('toro', MAT.MATE, t, [0, -d.tibia * (0.08 + 0.1 * k) - d.tibia * 0.33, 0.0], [0.15 * d.G, 0.05, 0.15 * d.G], c.v(mul(caqui, 0.8), 0.06), { lod: true }); p('segmento', MAT.MATE, t, [0, -d.tibia * 0.66, 0], [0.12 * d.G * 1.14, d.tibia * 0.5, 0.12 * d.G * 1.14], mul(caqui, 0.82)); }
  botas(c, lin(0x2a2118), 0, 1);
  // cartucheras y correaje
  p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.5, d.td * 0.03], [0.06, d.th * 1.1, d.td * 1.16], lin(0x3a2c1a), { rz: -0.55 });
  for (let k = 0; k < 3; k++) p('bloque', MAT.MATE, J.TORSO, [-d.tw * 0.36 + k * 0.1, d.th * 0.1, d.td * 0.5], [0.08, 0.1, 0.06], lin(0x3a2c1a));
  cinturon(c, lin(0x2a1e12));
  p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.58, -d.td * 0.62], [d.tw * 0.8, d.th * 0.65, d.td * 0.4], lin(0x3d3a28));      // mochila
  p('cilindro', MAT.MATE, J.TORSO, [0, d.th * 0.2, -d.td * 0.8], [0.12, d.tw * 0.9, 0.12], mul(caqui, 0.8), { rz: 1.57 });         // manta enrollada
  if (v === 0) {         // casco Brodie
    p('cupula', MAT.METAL, J.CABEZA, [0, hr * 1.5, 0], [hr * 2.25, hr * 1.2, hr * 2.3], c.v(lin(0x5a5e48), 0.06));
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.36, 0], [hr * 3.15, hr * 0.1, hr * 3.2], lin(0x4e5240));
  } else if (v === 1) {  // máscara antigás
    p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.6, -hr * 0.05], [hr * 2.0, hr * 1.0, hr * 2.05], lin(0x2c2a24));
    p('almohada', MAT.MATE, J.CABEZA, [0, hr * 0.85, hr * 0.45], [hr * 1.8, hr * 1.55, hr * 1.7], lin(0x38382e));
    for (const s of [-1, 1]) { p('esfera', MAT.METAL, J.CABEZA, [s * hr * 0.42, hr * 1.12, hr * 1.05], [hr * 0.62, hr * 0.62, hr * 0.3], lin(0x14181a)); p('toro', MAT.METAL, J.CABEZA, [s * hr * 0.42, hr * 1.12, hr * 1.1], [hr * 0.72, hr * 0.2, hr * 0.72], lin(0x6a6a60), { rx: 1.57, lod: true }); }
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 0.5, hr * 1.4], [hr * 0.85, hr * 0.7, hr * 0.85], lin(0x4a4c40), { rx: 1.57 });
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 0.5, hr * 1.82], [hr * 0.55, hr * 0.12, hr * 0.55], lin(0x2a2a24), { rx: 1.57 });
    p('segmento', MAT.MATE, J.CABEZA, [0, hr * 0.15, hr * 1.35], [hr * 0.16, hr * 1.0, hr * 0.16], lin(0x1e1c18), { rx: 0.4, lod: true });
  } else {               // gorra de plato de oficial + abrigo
    camisa(c, c.v(lin(0x3c4030), 0.06), { alto: 1.0, ancho: 1.14, hondo: 1.18 });
    mangas(c, lin(0x3c4030), 1.0, 0.75, 1.18);
    p('cilindro', MAT.MATE, J.CABEZA, [0, hr * 1.52, 0], [hr * 2.3, hr * 0.5, hr * 2.35], lin(0x3a3e2c));
    p('cilindro', MAT.MATE, J.CABEZA, [0, hr * 1.4, hr * 0.9], [hr * 2.0, hr * 0.08, hr * 1.0], lin(0x1a1a14), { rx: 0.1 });
    p('esfera', MAT.METAL, J.CABEZA, [0, hr * 1.5, hr * 1.2], [hr * 0.3, hr * 0.3, hr * 0.12], lin(0xc8a64a), { lod: true });
    for (const s of [-1, 1]) p('bloque', MAT.METAL, J.TORSO, [s * d.tw * 0.5, d.th * 0.9, 0], [0.12, 0.03, 0.08], lin(0xc8a64a), { lod: true });
  }
  manchas(c, 4); desgarro(c, 2, caqui);
  for (let k = 0; k < 2; k++) p('almohada', MAT.MATE, J.PELVIS, [rng.rango(-0.12, 0.12), -d.muslo * rng.rango(0.2, 0.7), d.td * 0.55], [0.14, 0.2, 0.02], BARRO, { lod: true });   // barro
}

// ───────────────────────── ERA 3 · 1950-1990 ─────────────────────────
function era3(c) {
  const { d, p, rng } = c; const hr = d.hr;
  const v = rng.entero(0, 3);
  if (v === 0) {           // cuero y vaqueros, tupé
    pantalon(c, c.v(lin(0x2d4f8a), 0.08), 0.95, 1.12);
    botas(c, lin(0x1a1614), 0.3);
    const cuero = lin(0x1a1816);
    camisa(c, cuero, { alto: 0.86, ancho: 1.12, hondo: 1.16 });
    mangas(c, cuero, 0.96, 0.92, 1.16);
    camisa(c, lin(0xd8d8d0), { alto: 0.4, ancho: 1.02, hondo: 1.1, y: d.th * 0.22 });
    for (const s of [-1, 1]) p('almohada', MAT.MATE, J.TORSO, [s * d.tw * 0.2, d.th * 0.82, d.td * 0.48], [d.tw * 0.28, d.th * 0.3, 0.04], lin(0x232120), { rz: s * 0.5 });      // solapas
    for (let k = 0; k < 4; k++) p('esfera', MAT.METAL, J.TORSO, [d.tw * (0.46), d.th * (0.83 - 0.04 * k) * 1.0, d.td * 0.2 - k * 0.0], [0.03, 0.03, 0.02], lin(0xcfcfd0), { lod: true });
    cinturon(c, lin(0x161412));
    pelo(c, lin(0x14100e), 'tupe');
  } else if (v === 1) {    // camarera: vestido turquesa, delantal, cofia
    const vest = c.v(lin(0x2a9a9a), 0.06);
    camisa(c, vest, { alto: 0.98, ancho: 1.1, hondo: 1.14 });
    mangas(c, vest, 0.7, 0, 1.15);
    p('cilindro', MAT.MATE, J.PELVIS, [0, -0.1 * d.H, 0], [d.tw * 1.35, 0.4 * d.H, d.td * 1.8], vest);        // falda
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.45, d.td * 0.53], [d.tw * 0.7, d.th * 0.9, 0.025], lin(0xe8e4dc));  // delantal
    p('almohada', MAT.MATE, J.PELVIS, [0, -0.12 * d.H, d.td * 0.82], [d.tw * 1.0, 0.38 * d.H, 0.03], lin(0xe8e4dc), { rx: -0.08 });
    p('toro', MAT.MATE, J.CABEZA, [0, -0.04 * d.cab, 0], [0.2 * d.cab, 0.06, 0.2 * d.cab], lin(0xe8e4dc));
    p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.86, hr * 0.1], [hr * 1.3, hr * 0.5, hr * 1.2], lin(0xe8e4dc), { rx: 0.1 });
    pelo(c, lin(0x3a2418), 'largo');
    botas(c, lin(0xe0dcd4), 0, 1);
  } else if (v === 2) {    // gasolinero: mono blanco, gorra roja
    const mono = c.v(lin(0xcfccc0), 0.06);
    camisa(c, mono, { alto: 0.96, ancho: 1.1, hondo: 1.14 });
    mangas(c, mono, 0.95, 0.9, 1.14);
    pantalon(c, mono, 0.95, 1.14);
    botas(c, lin(0x2a2420), 0.2);
    p('almohada', MAT.MATE, J.TORSO, [d.tw * 0.26, d.th * 0.7, d.td * 0.53], [0.14, 0.07, 0.02], lin(0xc02a24));
    p('cupula', MAT.MATE, J.CABEZA, [0, hr * 1.55, 0], [hr * 2.0, hr * 0.9, hr * 2.05], lin(0xc02a24));
    p('cilindro', MAT.MATE, J.CABEZA, [0, hr * 1.36, hr * 0.95], [hr * 1.5, hr * 0.08, hr * 0.8], lin(0xa8221e));
    manchas(c, 2); for (let k = 0; k < 4; k++) p('almohada', MAT.MATE, J.TORSO, [rng.rango(-0.12, 0.12), d.th * rng.rango(0.1, 0.9), d.td * 0.56], [0.12, 0.1, 0.012], lin(0x161210), { lod: true });
    pelo(c, lin(0x2a2018), 'ralo');
  } else {                 // camiseta, vaqueros y gafas de sol
    camisa(c, c.v(lin(rng.elegir([0xc8c0b0, 0x8a2a2a, 0x2a5a8a])), 0.08), { alto: 0.9, ancho: 1.06 });
    mangas(c, lin(0xc0b8a8), 0.45, 0, 1.15);
    pantalon(c, lin(0x2a4a80), 0.95, 1.12);
    botas(c, lin(0x6a4a2a), 0.12);
    p('bloque', MAT.METAL, J.CABEZA, [0, hr * 1.12, hr * 0.92], [hr * 1.5, hr * 0.32, hr * 0.2], lin(0x08080a));
    pelo(c, lin(0x2a2018), 'tupe');
  }
  manchas(c, 3);
}

// ───────────────────────── ERA 4 · 2000-2040 ─────────────────────────
function era4(c) {
  const { d, p, rng } = c; const hr = d.hr;
  const v = rng.entero(0, 3);
  if (v === 0) {           // sudadera con capucha
    const sud = c.v(lin(rng.elegir([0x3a3a42, 0x6a2a2a, 0x2a4a6a, 0x4a4a3a])), 0.08);
    camisa(c, sud, { alto: 0.94, ancho: 1.14, hondo: 1.18 });
    mangas(c, sud, 0.96, 0.86, 1.18);
    pantalon(c, lin(0x20232a), 0.95, 1.12);
    botas(c, lin(0xc8c8c8), 0.0, 1);
    p('toro', MAT.MATE, J.CABEZA, [0, -0.02 * d.cab, -0.01], [0.26 * d.cab, 0.1, 0.26 * d.cab], sud);
    p('esfera', MAT.MATE, J.CABEZA, [0, hr * 0.95, -hr * 0.3], [hr * 2.55, hr * 2.6, hr * 2.45], sud);          // capucha
    p('esfera', MAT.MATE, J.CABEZA, [0, hr * 1.0, hr * 0.5], [hr * 1.5, hr * 1.5, hr * 1.2], lin(0x0c0a0a));   // sombra del interior
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.18, d.td * 0.54], [d.tw * 0.7, d.th * 0.2, 0.03], mul(sud, 0.8));  // bolsillo
  } else if (v === 1) {    // bata de laboratorio
    const bata = c.v(lin(0xcfd2d0), 0.05);
    camisa(c, bata, { alto: 1.0, ancho: 1.14, hondo: 1.18 });
    mangas(c, bata, 1.0, 0.9, 1.16);
    p('cilindro', MAT.MATE, J.PELVIS, [0, -0.2 * d.H, 0], [d.tw * 1.2, 0.5 * d.H, d.td * 1.7], bata);
    p('almohada', MAT.MATE, J.TORSO, [d.tw * 0.28, d.th * 0.22, d.td * 0.54], [0.12, 0.12, 0.02], mul(bata, 0.8));
    pantalon(c, lin(0x2a2e3a), 0.9, 1.0);
    botas(c, lin(0x1a1a1e), 0.1);
    for (let k = 0; k < 4; k++) p('almohada', MAT.MATE, J.TORSO, [rng.rango(-0.4, 0.4) * d.tw, d.th * rng.rango(0.1, 0.9), d.td * 0.56], [rng.rango(0.1, 0.2), rng.rango(0.08, 0.16), 0.014], SANGRE, { lod: true });
    p('toro', MAT.MATE, J.TORSO, [0, d.th * 0.92, d.td * 0.1], [0.3, 0.05, 0.22], lin(0x2a8a9a), { lod: true });
    p('bloque', MAT.MATE, J.TORSO, [-d.tw * 0.15, d.th * 0.65, d.td * 0.54], [0.09, 0.05, 0.01], lin(0xe0e0e0), { lod: true });
    pelo(c, lin(0x3a3a3a), 'ralo');
  } else if (v === 2) {    // traje NBQ amarillo con capucha y visor
    const traje = c.v(lin(0xd8b82a), 0.05);
    camisa(c, traje, { alto: 1.0, ancho: 1.18, hondo: 1.22 });
    mangas(c, traje, 1.0, 1.0, 1.22);
    pantalon(c, traje, 1.0, 1.2);
    botas(c, lin(0x1a1a1c), 0.38, 1.28);
    p('esfera', MAT.MATE, J.CABEZA, [0, hr * 0.95, -hr * 0.1], [hr * 2.4, hr * 2.4, hr * 2.4], traje);
    p('esfera', MAT.METAL, J.CABEZA, [0, hr * 1.05, hr * 0.62], [hr * 1.7, hr * 1.1, hr * 1.1], lin(0x10241c));
    p('esfera', MAT.EMISIVO, J.CABEZA, [0, hr * 1.02, hr * 1.12], [hr * 0.9, hr * 0.3, hr * 0.12], [0.1, 0.5, 0.35], { lod: true });
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 0.35, hr * 1.1], [hr * 0.7, hr * 0.6, hr * 0.7], lin(0x3a3c3a), { rx: 1.57 });
    p('cilindro', MAT.MATE, J.TORSO, [d.tw * 0.55, d.th * 0.2, -d.td * 0.2], [0.1, 0.5, 0.1], lin(0x2a2a2c), { lod: true });
    p('bloque', MAT.MATE, J.TORSO, [0, d.th * 0.5, d.td * 0.56], [d.tw * 0.45, 0.07, 0.02], lin(0x1a1a1c), { lod: true });   // franja de peligro
    p('bloque', MAT.EMISIVO, J.TORSO, [0, d.th * 0.5, d.td * 0.58], [d.tw * 0.2, 0.03, 0.01], [2.2, 1.6, 0.1], { lod: true });
    manchas(c, 2);
  } else {                 // oficinista: camisa, corbata, pantalón de traje
    camisa(c, c.v(lin(0xd0d2d4), 0.05), { alto: 0.96, ancho: 1.07 });
    mangas(c, lin(0xd0d2d4), 0.95, 0.5, 1.12);
    p('bloque', MAT.MATE, J.TORSO, [0, d.th * 0.62, d.td * 0.55], [0.06, d.th * 0.55, 0.02], lin(0x7a1f2a));
    pantalon(c, lin(0x1c1e26), 0.96, 1.1);
    botas(c, lin(0x14120f), 0.1);
    pelo(c, lin(0x2a2420), 'corto');
    manchas(c, 4);
  }
}

// ───────────────────────── ERA 5 · 2050-2100 ─────────────────────────
function era5(c) {
  const { d, p, rng } = c; const hr = d.hr;
  const acento = rng.elegir([[0.1, 1.8, 2.2], [2.2, 0.2, 1.6], [0.2, 2.0, 0.9]]);
  const traje = c.v(lin(rng.elegir([0x1a1c22, 0x23242c, 0x2a2430])), 0.1);
  camisa(c, traje, { alto: 0.96, ancho: 1.09, hondo: 1.14 });
  mangas(c, traje, 0.9, 0.7, 1.14);
  pantalon(c, mul(traje, 0.8), 0.9, 1.12);
  botas(c, lin(0x111216), 0.3, 1.2);
  // Franjas de neón y circuitos
  p('bloque', MAT.EMISIVO, J.TORSO, [0, d.th * 0.56, d.td * 0.575], [0.02, d.th * 0.56, 0.01], acento, { pulso: 3 });
  for (const s of [-1, 1]) {
    p('bloque', MAT.EMISIVO, J.PELVIS, [s * d.tw * 0.46, -0.18 * d.H, d.td * 0.1], [0.02, 0.5 * d.H, 0.02], acento, { lod: true, pulso: 3 });
    const a = s < 0 ? J.BRAZO_I : J.BRAZO_D;
    p('segmento', MAT.EMISIVO, a, [s * 0.0, -d.ua * 0.5, 0.075 * d.G], [0.016, d.ua * 0.7, 0.016], acento, { lod: true, pulso: 3 });
    p('almohada', MAT.METAL, a, [0, 0.02, 0], [0.19 * d.G, 0.12, 0.2 * d.G], lin(0x8a8e96));          // hombrera cromada
  }
  // Implantes: placa craneal, ojo cibernético, cables
  const v = rng.entero(0, 2);
  p('almohada', MAT.METAL, J.CABEZA, [rng.signo() * hr * 0.55, hr * 1.5, hr * 0.15], [hr * 1.0, hr * 0.8, hr * 1.2], lin(0x9a9ea6));
  if (v !== 1) { p('esfera', MAT.EMISIVO, J.CABEZA, [hr * 0.4, hr * 1.12, hr * 0.92], [hr * 0.34, hr * 0.34, hr * 0.2], acento, { pulso: 3 }); p('toro', MAT.METAL, J.CABEZA, [hr * 0.4, hr * 1.12, hr * 0.9], [hr * 0.54, hr * 0.14, hr * 0.54], lin(0xaaaeb6), { rx: 1.57 }); }
  if (v === 1) { p('bloque', MAT.EMISIVO, J.CABEZA, [0, hr * 1.12, hr * 0.92], [hr * 1.7, hr * 0.22, hr * 0.14], acento, { pulso: 3 }); }
  for (let k = 0; k < 3; k++) {
    p('segmento', MAT.MATE, J.CABEZA, [rng.rango(-0.5, 0.5) * hr, hr * 0.2, -hr * 0.9], [0.018, hr * 1.6, 0.018], lin(0x0a0a0c), { rx: 0.5 + k * 0.1, rz: rng.rango(-0.4, 0.4), lod: true });
  }
  p('toro', MAT.METAL, J.CABEZA, [0, -0.04 * d.cab, 0], [0.2 * d.cab, 0.06, 0.2 * d.cab], lin(0x9a9ea6));
  p('cilindro', MAT.METAL, J.TORSO, [-d.tw * 0.4, d.th * 0.5, -d.td * 0.55], [0.1, d.th * 0.5, 0.1], lin(0x70747c), { lod: true });
  p('esfera', MAT.EMISIVO, J.TORSO, [0, d.th * 0.34, d.td * 0.5], [0.07, 0.07, 0.03], acento, { pulso: 2, lod: true });
  pelo(c, lin(0x1a1a22), 'ralo');
  manchas(c, 2);
}

const ERAS = [era0, era1, era2, era3, era4, era5];
export function vestirEra(c) { (ERAS[c.era] || era0)(c); }

// ───────────────────────── ACORAZADO ─────────────────────────
export function armadura(c) {
  const { d, p, rng, era } = c; const hr = d.hr;
  const sub = c.v(lin([0x5a2a22, 0x3a342a, 0x4a4a32, 0x1a1a1e, 0x4a4a3a, 0x20242c][era]), 0.06);
  camisa(c, sub, { alto: 0.96, ancho: 1.08 });
  mangas(c, sub, 0.96, 0.9, 1.14);
  pantalon(c, mul(sub, 0.9), 0.96, 1.16);
  botas(c, lin(0x1c1814), 0.4, 1.25);
  const placa = (col, mat = MAT.METAL) => ({ col, mat });
  const E = era;
  if (E === 0) {          // peto de coracero, casco con crin
    const acero = c.v(lin(0xb4b9c2), 0.05), oro = lin(0xc8a64a);
    p('torso', MAT.METAL, J.TORSO, [0, d.th * 0.56, d.td * 0.1], [d.tw * 1.2, d.th * 0.72, d.td * 1.28], acero);
    p('torso', MAT.METAL, J.TORSO, [0, d.th * 0.56, -d.td * 0.08], [d.tw * 1.16, d.th * 0.7, d.td * 1.1], mul(acero, 0.85));
    p('cono', MAT.METAL, J.TORSO, [0, d.th * 0.55, d.td * 0.68], [0.05, d.th * 0.7, 0.08], mul(acero, 1.2), { lod: true });
    p('toro', MAT.METAL, J.TORSO, [0, d.th * 0.2, 0], [d.tw * 1.2, 0.04, d.td * 1.3], oro);
    p('toro', MAT.METAL, J.TORSO, [0, d.th * 0.92, 0], [d.tw * 0.7, 0.04, d.td * 0.8], oro, { lod: true });
    for (let k = 0; k < 6; k++) p('esfera', MAT.METAL, J.TORSO, [(k - 2.5) * d.tw * 0.15, d.th * 0.35, d.td * 0.69], [0.02, 0.02, 0.015], oro, { lod: true });
    for (const s of [-1, 1]) {
      const a = s < 0 ? J.BRAZO_I : J.BRAZO_D;
      p('cupula', MAT.METAL, a, [0, 0.04, 0], [0.26 * d.G, 0.2, 0.28 * d.G], acero, { rz: s * 0.0 });
      p('toro', MAT.METAL, a, [0, 0.0, 0], [0.26 * d.G, 0.04, 0.28 * d.G], oro, { lod: true });
      p('almohada', MAT.METAL, J.PELVIS, [s * d.tw * 0.32, -0.14 * d.H, d.td * 0.4], [d.tw * 0.46, 0.3 * d.H, 0.05], mul(acero, 0.9), { rx: 0.1 });   // faldones
    }
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.5, 0], [hr * 2.15, hr * 1.5, hr * 2.2], acero);
    p('cupula', MAT.METAL, J.CABEZA, [0, hr * 2.15, 0], [hr * 2.1, hr * 0.8, hr * 2.15], acero);
    p('bloque', MAT.METAL, J.CABEZA, [0, hr * 1.1, hr * 1.1], [hr * 0.08, hr * 0.7, hr * 0.1], mul(acero, 0.8), { lod: true });
    p('arcoFino', MAT.MATE, J.CABEZA, [0, hr * 2.5, -hr * 0.4], [hr * 0.3, hr * 1.2, hr * 2.5], lin(0xa02420), { rx: 0.2 });   // crin
    p('segmento', MAT.MATE, J.CABEZA, [0, hr * 1.5, -hr * 1.3], [hr * 0.4, hr * 2.0, hr * 0.4], lin(0xa02420), { rx: -0.3 });
    p('toro', MAT.METAL, J.CABEZA, [0, hr * 1.0, 0], [hr * 2.2, hr * 0.14, hr * 2.25], oro, { lod: true });
  } else if (E === 1) {   // plancha de caldera remachada
    const hierro = c.v(lin(0x4a4a4e), 0.06), oxido = lin(0x7a4a2a);
    p('torso', MAT.METAL, J.TORSO, [0, d.th * 0.52, d.td * 0.08], [d.tw * 1.28, d.th * 0.9, d.td * 1.34], hierro);
    p('bloque', MAT.METAL, J.TORSO, [d.tw * 0.18, d.th * 0.5, d.td * 0.7], [d.tw * 0.5, d.th * 0.55, 0.06], oxido);
    p('bloque', MAT.METAL, J.TORSO, [-d.tw * 0.2, d.th * 0.62, d.td * 0.72], [d.tw * 0.4, d.th * 0.3, 0.05], mul(hierro, 1.3));
    for (let i = 0; i < 4; i++) for (let k = 0; k < 6; k++) p('esfera', MAT.METAL, J.TORSO, [(k - 2.5) * d.tw * 0.18, d.th * (0.28 + i * 0.17), d.td * 0.76], [0.03, 0.03, 0.025], lin(0x9a8a7a), { lod: true });
    for (const s of [-1, 1]) {
      const a = s < 0 ? J.BRAZO_I : J.BRAZO_D;
      p('arco', MAT.METAL, a, [0, 0.02, 0], [0.34 * d.G, 0.24, 0.34 * d.G], hierro, { ry: s * 1.57 });
      p('esfera', MAT.METAL, a, [0, 0.12, 0], [0.04, 0.04, 0.03], lin(0x9a8a7a), { lod: true });
    }
    p('cilindro', MAT.METAL, J.TORSO, [d.tw * 0.62, d.th * 0.96, -d.td * 0.1], [0.12, 0.34, 0.12], oxido, { rz: -0.3 });  // chimenea de vapor
    p('esfera', MAT.EMISIVO, J.TORSO, [d.tw * 0.7, d.th * 1.18, -d.td * 0.1], [0.12, 0.12, 0.1], [1.5, 0.6, 0.15], { pulso: 1, lod: true });
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.2, 0], [hr * 2.2, hr * 1.9, hr * 2.25], hierro);     // yelmo de caldera
    p('cupula', MAT.METAL, J.CABEZA, [0, hr * 1.95, 0], [hr * 2.15, hr * 0.6, hr * 2.2], mul(hierro, 1.1));
    p('bloque', MAT.EMISIVO, J.CABEZA, [0, hr * 1.12, hr * 1.1], [hr * 1.5, hr * 0.12, hr * 0.06], [2.6, 0.9, 0.15], { pulso: 1 });
    for (let k = 0; k < 6; k++) p('esfera', MAT.METAL, J.CABEZA, [Math.sin(k * 1.0 - 2.5) * hr * 1.05, hr * 1.7, Math.cos(k * 1.0 - 2.5) * hr * 1.05], [0.03, 0.03, 0.03], lin(0x9a8a7a), { lod: true });
    for (const s of [-1, 1]) p('almohada', MAT.METAL, J.PELVIS, [s * d.tw * 0.32, -0.12 * d.H, d.td * 0.4], [d.tw * 0.4, 0.26 * d.H, 0.05], oxido);
  } else if (E === 2) {   // casco y peto de trinchera
    const acero = c.v(lin(0x5a5e50), 0.06), correa = lin(0x3a2c1a);
    p('cupula', MAT.METAL, J.CABEZA, [0, hr * 1.5, 0], [hr * 2.3, hr * 1.25, hr * 2.4], acero);
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.34, 0], [hr * 3.3, hr * 0.12, hr * 3.4], mul(acero, 0.9));
    p('segmento', MAT.MATE, J.CABEZA, [0, hr * 0.5, hr * 0.9], [hr * 0.14, hr * 1.2, hr * 0.14], correa, { lod: true });
    p('torso', MAT.METAL, J.TORSO, [0, d.th * 0.58, d.td * 0.1], [d.tw * 1.18, d.th * 0.66, d.td * 1.26], acero);
    p('almohada', MAT.METAL, J.TORSO, [0, d.th * 0.62, d.td * 0.73], [d.tw * 0.62, d.th * 0.4, 0.05], mul(acero, 1.15));
    for (let k = 0; k < 4; k++) p('esfera', MAT.METAL, J.TORSO, [(k - 1.5) * d.tw * 0.16, d.th * 0.82, d.td * 0.74], [0.025, 0.025, 0.02], lin(0xa0a090), { lod: true });
    for (const s of [-1, 1]) {
      const a = s < 0 ? J.BRAZO_I : J.BRAZO_D;
      p('arco', MAT.METAL, a, [0, 0.03, 0], [0.3 * d.G, 0.2, 0.3 * d.G], acero, { ry: s * 1.57 });
      p('almohada', MAT.MATE, J.TORSO, [s * d.tw * 0.52, d.th * 0.32, d.td * 0.3], [0.1, 0.14, 0.1], correa);       // cartuchera
      p('almohada', MAT.METAL, J.PELVIS, [s * d.tw * 0.32, -0.12 * d.H, d.td * 0.4], [d.tw * 0.4, 0.26 * d.H, 0.05], mul(acero, 0.85));
    }
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.5, -d.td * 0.62], [d.tw * 0.9, d.th * 0.7, d.td * 0.4], lin(0x3d3a28));
    p('esfera', MAT.METAL, J.CABEZA, [0, hr * 0.6, hr * 1.0], [hr * 1.1, hr * 0.9, hr * 0.7], lin(0x38382e));      // protector facial
  } else if (E === 3) {   // antidisturbios
    const negro = c.v(lin(0x1c1e24), 0.06), visor = lin(0x1a2a3a), azul = lin(0x2a4a8a);
    p('cupula', MAT.METAL, J.CABEZA, [0, hr * 1.45, 0], [hr * 2.25, hr * 1.4, hr * 2.3], negro);
    p('bloque', MAT.METAL, J.CABEZA, [0, hr * 0.95, hr * 1.0], [hr * 1.85, hr * 1.1, hr * 0.5], visor);
    p('bloque', MAT.EMISIVO, J.CABEZA, [0, hr * 1.28, hr * 1.2], [hr * 1.6, hr * 0.06, hr * 0.06], [0.2, 0.5, 2.0], { lod: true });
    p('almohada', MAT.MATE, J.CABEZA, [0, hr * 0.15, -hr * 0.3], [hr * 2.1, hr * 0.7, hr * 1.5], negro);       // protector de nuca
    p('torso', MAT.MATE, J.TORSO, [0, d.th * 0.56, d.td * 0.08], [d.tw * 1.22, d.th * 0.82, d.td * 1.3], negro);
    p('bloque', MAT.METAL, J.TORSO, [0, d.th * 0.62, d.td * 0.72], [d.tw * 0.8, d.th * 0.48, 0.06], mul(negro, 1.4));
    p('bloque', MAT.MATE, J.TORSO, [0, d.th * 0.2, d.td * 0.7], [d.tw * 0.7, 0.04, 0.04], azul, { lod: true });
    for (const s of [-1, 1]) {
      const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D;
      p('almohada', MAT.MATE, a, [0, 0.0, 0], [0.26 * d.G, 0.22, 0.26 * d.G], negro);
      if (c.hand[s]) p('segmento', MAT.METAL, b, [0, -d.fa * 0.4, 0.01], [0.115 * d.G, d.fa * 0.75, 0.115 * d.G], mul(negro, 1.3));
      p('almohada', MAT.METAL, t, [0, -d.tibia * 0.35, 0.03], [0.13 * d.G * 1.2, d.tibia * 0.6, 0.12 * d.G * 1.3], negro);
      p('almohada', MAT.MATE, J.PELVIS, [s * d.tw * 0.32, -0.12 * d.H, d.td * 0.4], [d.tw * 0.4, 0.26 * d.H, 0.05], negro);
    }
    if (c.hand[-1]) {        // escudo transparente
      p('bloque', MAT.METAL, J.ANTEBRAZO_I, [-0.06, -d.fa * 0.5, 0.28], [0.06, 0.95, 0.5], lin(0x253a50));
      p('bloque', MAT.METAL, J.ANTEBRAZO_I, [-0.06, -d.fa * 0.5, 0.28], [0.08, 0.99, 0.54], lin(0x101418), { lod: true });
      p('bloque', MAT.EMISIVO, J.ANTEBRAZO_I, [-0.1, -d.fa * 0.5 + 0.25, 0.28], [0.01, 0.06, 0.4], [0.3, 0.5, 1.4], { lod: true });
    }
  } else if (E === 4) {   // blindaje militar
    const tan = c.v(lin(0x6a6446), 0.06), oscuro = lin(0x2c2e26);
    p('cupula', MAT.METAL, J.CABEZA, [0, hr * 1.5, 0], [hr * 2.2, hr * 1.2, hr * 2.3], tan);
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.36, 0], [hr * 2.55, hr * 0.1, hr * 2.65], mul(tan, 0.9));
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 1.68, hr * 1.2], [hr * 0.5, hr * 0.7, hr * 0.5], oscuro, { rx: 1.57 });
    p('esfera', MAT.EMISIVO, J.CABEZA, [0, hr * 1.68, hr * 1.58], [hr * 0.38, hr * 0.38, hr * 0.1], [0.3, 2.4, 0.5], { pulso: 3 });
    p('torso', MAT.MATE, J.TORSO, [0, d.th * 0.55, d.td * 0.1], [d.tw * 1.22, d.th * 0.86, d.td * 1.34], tan);
    p('bloque', MAT.METAL, J.TORSO, [0, d.th * 0.6, d.td * 0.74], [d.tw * 0.88, d.th * 0.52, 0.08], mul(tan, 1.2));
    for (let k = 0; k < 3; k++) p('almohada', MAT.MATE, J.TORSO, [(k - 1) * d.tw * 0.3, d.th * 0.2, d.td * 0.74], [d.tw * 0.24, 0.13, 0.08], oscuro);
    for (const s of [-1, 1]) {
      const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D, m = s < 0 ? J.MUSLO_I : J.MUSLO_D;
      p('cupula', MAT.METAL, a, [0, 0.05, 0], [0.3 * d.G, 0.24, 0.3 * d.G], tan);
      p('almohada', MAT.METAL, t, [0, 0.0, d.G * 0.1], [0.15 * d.G, 0.14, 0.12], oscuro);       // rodillera
      p('almohada', MAT.MATE, m, [s * 0.02, -d.muslo * 0.6, 0.12 * d.G], [0.14, 0.2, 0.08], oscuro, { lod: true });
      p('almohada', MAT.METAL, J.PELVIS, [s * d.tw * 0.32, -0.1 * d.H, d.td * 0.42], [d.tw * 0.36, 0.22 * d.H, 0.05], tan);
    }
    p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.55, -d.td * 0.7], [d.tw * 0.95, d.th * 0.8, d.td * 0.5], mul(tan, 0.8));
    p('bloque', MAT.EMISIVO, J.TORSO, [d.tw * 0.35, d.th * 0.82, d.td * 0.78], [0.05, 0.02, 0.01], [0.3, 2.0, 0.5], { lod: true, pulso: 3 });
  } else {                // exoesqueleto
    const chasis = c.v(lin(0xd6d8de), 0.04), gris = lin(0x3a3e48), cian = [0.1, 2.0, 2.4];
    p('torso', MAT.METAL, J.TORSO, [0, d.th * 0.55, d.td * 0.1], [d.tw * 1.3, d.th * 0.88, d.td * 1.4], chasis);
    p('toro', MAT.EMISIVO, J.TORSO, [0, d.th * 0.55, d.td * 0.74], [d.tw * 0.5, 0.05, d.tw * 0.5], cian, { rx: 1.57, pulso: 3 });
    p('esfera', MAT.EMISIVO, J.TORSO, [0, d.th * 0.55, d.td * 0.74], [d.tw * 0.28, d.tw * 0.28, 0.06], [0.3, 2.2, 2.6], { pulso: 2 });
    p('almohada', MAT.METAL, J.TORSO, [0, d.th * 0.5, -d.td * 0.7], [d.tw * 1.0, d.th * 0.9, d.td * 0.5], gris);
    for (const s of [-1, 1]) p('cilindro', MAT.METAL, J.TORSO, [s * d.tw * 0.3, d.th * 0.98, -d.td * 0.78], [0.12, 0.34, 0.12], chasis, { rx: 0.4, lod: true });
    for (const s of [-1, 1]) {
      const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D, m = s < 0 ? J.MUSLO_I : J.MUSLO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D;
      p('esfera', MAT.METAL, a, [0, 0.03, 0], [0.34 * d.G, 0.28, 0.34 * d.G], chasis);
      p('esfera', MAT.EMISIVO, a, [s * 0.14 * d.G, 0.03, 0.0], [0.05, 0.05, 0.05], cian, { lod: true, pulso: 3 });
      p('segmento', MAT.METAL, a, [0, -d.ua * 0.5, 0.0], [0.13 * d.G, d.ua * 0.9, 0.13 * d.G], gris);
      if (c.hand[s]) { p('segmento', MAT.METAL, b, [0, -d.fa * 0.4, 0.0], [0.115 * d.G, d.fa * 0.8, 0.115 * d.G], chasis); p('esfera', MAT.EMISIVO, b, [0, 0.0, 0.0], [0.09, 0.09, 0.09], cian, { lod: true, pulso: 3 }); }
      p('segmento', MAT.METAL, m, [0, -d.muslo * 0.5, 0.0], [0.19 * d.G, d.muslo * 0.95, 0.19 * d.G], chasis);
      p('esfera', MAT.EMISIVO, t, [0, 0, 0.1 * d.G], [0.09, 0.09, 0.06], cian, { pulso: 3 });
      p('segmento', MAT.METAL, t, [0, -d.tibia * 0.5, 0.0], [0.15 * d.G, d.tibia * 0.95, 0.15 * d.G], gris);
      p('almohada', MAT.METAL, J.PELVIS, [s * d.tw * 0.32, -0.1 * d.H, d.td * 0.4], [d.tw * 0.36, 0.22 * d.H, 0.05], chasis);
    }
    p('esfera', MAT.METAL, J.CABEZA, [0, hr * 1.1, 0], [hr * 2.35, hr * 2.2, hr * 2.4], chasis);
    p('bloque', MAT.EMISIVO, J.CABEZA, [0, hr * 1.05, hr * 1.0], [hr * 1.9, hr * 0.38, hr * 0.5], cian, { pulso: 3 });
    p('cilindro', MAT.METAL, J.CABEZA, [0, hr * 2.25, -hr * 0.4], [hr * 0.18, hr * 0.8, hr * 0.18], gris, { rx: -0.2, lod: true });
  }
  // desgaste: sangre y golpes sobre el blindaje
  for (let k = 0; k < 3; k++) p('almohada', MAT.MATE, J.TORSO, [rng.rango(-0.4, 0.4) * d.tw, d.th * rng.rango(0.2, 0.85), d.td * 0.78], [rng.rango(0.06, 0.12), rng.rango(0.06, 0.1), 0.012], k ? BARRO : SANGRE, { rz: rng.rango(0, 3), lod: true });
}

// ───────────────────────── DETONADOR ─────────────────────────
export function explosivoEra(c) {
  const { d, p, rng, era } = c;
  const y = d.th * 0.46, z = d.td * 0.5 + 0.17;
  const X = J.X0;
  const mecha = (px, py, pz) => {
    p('segmento', MAT.MATE, X, [px, py + 0.05, pz], [0.02, 0.14, 0.02], lin(0x2a1e14), { rz: 0.4 });
    p('esfera', MAT.EMISIVO, X, [px + 0.03, py + 0.13, pz], [0.1, 0.1, 0.1], [2.4, 1.0, 0.15], { pulso: 1 });
    c.anclas.mecha = { j: X, x: px + 0.03, y: py + 0.13, z: pz };
  };
  if (era === 0) {        // barril de pólvora
    p('barril', MAT.MATE, X, [0, y, z], [0.34, 0.46, 0.34], lin(0x6a4a2a));
    for (const k of [-0.15, 0.0, 0.15]) p('toro', MAT.METAL, X, [0, y + k, z], [0.36, 0.04, 0.36], lin(0x2c2c2e), { lod: true });
    p('cilindro', MAT.MATE, X, [0, y + 0.235, z], [0.3, 0.02, 0.3], lin(0x1a1410), { lod: true });
    mecha(0, y + 0.24, z);
    p('bloque', MAT.MATE, X, [0, y, z + 0.17], [0.16, 0.12, 0.01], lin(0xb8a888), { lod: true });
  } else if (era === 1) { // manojo de dinamita
    for (let k = 0; k < 6; k++) { const a = k * 1.047, r = k ? 0.075 : 0; p('cilindro', MAT.MATE, X, [Math.sin(a) * r, y, z + Math.cos(a) * r * 0.5], [0.07, 0.4, 0.07], lin(k % 2 ? 0xb02a1e : 0xc8381f), { rx: 0.0 }); }
    p('bloque', MAT.MATE, X, [0, y, z + 0.04], [0.26, 0.05, 0.2], lin(0xc8bda0));
    p('bloque', MAT.MATE, X, [0, y + 0.1, z + 0.04], [0.26, 0.04, 0.2], lin(0xc8bda0), { lod: true });
    mecha(0, y + 0.2, z);
  } else if (era === 2) { // bidón de gasolina
    p('bloque', MAT.METAL, X, [0, y, z], [0.34, 0.44, 0.18], lin(0x7a2a20));
    p('cilindro', MAT.METAL, X, [0.1, y + 0.26, z], [0.09, 0.08, 0.09], lin(0x3a3a38));
    p('bloque', MAT.METAL, X, [0, y, z + 0.1], [0.28, 0.08, 0.02], lin(0xb0a890), { lod: true });
    p('bloque', MAT.METAL, X, [-0.08, y + 0.24, z], [0.12, 0.06, 0.04], lin(0x4a1c16), { lod: true });
    mecha(0.1, y + 0.31, z);
  } else if (era === 3) { // bombona de gas
    p('cilindro', MAT.METAL, X, [0, y, z], [0.26, 0.5, 0.26], lin(0xe0801e));
    p('cupula', MAT.METAL, X, [0, y + 0.25, z], [0.26, 0.14, 0.26], lin(0xe0801e));
    p('cilindro', MAT.METAL, X, [0, y + 0.34, z], [0.08, 0.08, 0.08], lin(0x9a9a98));
    p('toro', MAT.METAL, X, [0, y + 0.22, z], [0.3, 0.03, 0.3], lin(0x8a8a88), { lod: true });
    p('bloque', MAT.MATE, X, [0, y, z + 0.13], [0.14, 0.12, 0.01], lin(0x1a1a1a), { lod: true });
    mecha(0, y + 0.38, z);
  } else if (era === 4) { // C4 con detonador parpadeante
    for (let k = 0; k < 3; k++) p('bloque', MAT.MATE, X, [0, y + (k - 1) * 0.11, z], [0.34, 0.1, 0.14], lin(0xb4ac8a));
    for (let k = 0; k < 3; k++) p('bloque', MAT.MATE, X, [0, y + (k - 1) * 0.11, z + 0.075], [0.3, 0.02, 0.01], lin(0x2a2a28), { lod: true });
    p('bloque', MAT.MATE, X, [0.08, y + 0.2, z + 0.06], [0.14, 0.08, 0.05], lin(0x1a1c22));
    p('esfera', MAT.EMISIVO, X, [0.08, y + 0.25, z + 0.08], [0.06, 0.06, 0.06], [3.2, 0.2, 0.1], { pulso: 4 });
    p('segmento', MAT.MATE, X, [-0.06, y + 0.2, z + 0.06], [0.015, 0.18, 0.015], lin(0x2a8a3a), { rz: 1.2, lod: true });
    c.anclas.mecha = { j: X, x: 0.08, y: y + 0.25, z: z + 0.08 };
  } else {                // célula de plasma
    p('cilindro', MAT.METAL, X, [0, y, z], [0.26, 0.5, 0.26], lin(0x2a2e36));
    p('cilindro', MAT.EMISIVO, X, [0, y, z], [0.2, 0.42, 0.2], [0.2, 1.6, 2.6], { pulso: 2 });
    p('toro', MAT.METAL, X, [0, y + 0.24, z], [0.3, 0.04, 0.3], lin(0x7a7e88), { lod: true });
    p('toro', MAT.METAL, X, [0, y - 0.24, z], [0.3, 0.04, 0.3], lin(0x7a7e88), { lod: true });
    p('esfera', MAT.EMISIVO, X, [0, y + 0.3, z], [0.1, 0.1, 0.1], [0.4, 2.4, 3.0], { pulso: 4 });
    c.anclas.mecha = { j: X, x: 0, y: y + 0.3, z };
  }
  // Correas que lo sujetan
  p('almohada', MAT.MATE, J.TORSO, [0, d.th * 0.5, d.td * 0.5], [d.tw * 1.2, 0.05, d.td * 0.1], lin(0x2a2018), { lod: true });
}
