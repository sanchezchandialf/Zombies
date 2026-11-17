// Diseños de los seis jefes. Cada función recibe el VisualJefe y construye su esqueleto, piezas, emisivos y animaciones extra.
import * as THREE from 'three';
import { J } from './matematica.js';

const PI = Math.PI;
const vap = (B, pos) => B.juego.fx?.crearEmisor?.('vapor', pos, { escala: 1.2 }) || null;

/** Miembros genéricos: brazos y piernas con las mallas dadas. */
function miembros(B, o) {
  const d = B.dim, g = o.g ?? 1;
  for (const s of [-1, 1]) {
    const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D;
    const g1 = 0.2 * g * (o.gB ?? 1) * (s > 0 ? (o.gD ?? 1) : 1), g2 = 0.16 * g * (o.gB ?? 1) * (s > 0 ? (o.gD ?? 1) : 1);
    B.pieza('esfera', o.mRopa || o.mPiel, a, [0, 0, 0], [g1 * 1.5, g1 * 1.4, g1 * 1.5]);
    B.pieza('segmento', o.mPielB || o.mPiel, a, [0, -d.brazo / 2, 0], [g1, d.brazo * 1.05, g1]);
    B.pieza('esfera', o.mPiel, b, [0, 0, 0], [g2 * 1.4, g2 * 1.35, g2 * 1.4]);
    if (!(o.sinAntebrazo && s === o.sinAntebrazo)) {
      B.pieza('segmento', o.mPiel, b, [0, -d.brazo * 0.45, 0], [g2, d.brazo * 0.92, g2]);
      if (!o.sinManos) B.pieza('almohada', o.mPielO || o.mPiel, b, [0, -d.brazo * 0.95, 0], [g2 * 1.7, g2 * 2.0, g2 * 1.3]);
    }
  }
  if (o.sinPiernas) return;
  for (const s of [-1, 1]) {
    const m = s < 0 ? J.MUSLO_I : J.MUSLO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D, f = s < 0 ? J.PIE_I : J.PIE_D;
    const g1 = 0.26 * g * (o.gP ?? 1) * (s > 0 ? (o.gPD ?? 1) : 1), g2 = 0.2 * g * (o.gP ?? 1) * (s > 0 ? (o.gPD ?? 1) : 1);
    B.pieza('segmento', o.mPierna || o.mRopa || o.mPiel, m, [0, -d.muslo / 2, 0], [g1, d.muslo * 1.06, g1 * 1.02]);
    B.pieza('esfera', o.mPierna || o.mPiel, t, [0, 0, 0.01], [g2 * 1.25, g2 * 1.2, g2 * 1.25]);
    B.pieza('segmento', o.mBota || o.mPierna || o.mPiel, t, [0, -d.tibia / 2, 0], [g2, d.tibia * 1.05, g2]);
    B.pieza('almohada', o.mBota || o.mPierna, f, [0, -0.07, 0.12 * g * 1.3], [0.28 * g * (o.gP ?? 1), 0.2 * g, 0.62 * g]);
  }
}
function cabeza(B, mat, r, y = 0.2, z = 0.03) {
  B.pieza('cabeza', mat, J.CABEZA, [0, y + r * 0.95, z], [r * 1.75, r * 2.0, r * 1.9]);
}
function mandibula(B, mat, r) { B.pieza('mandibula', mat, J.MANDIBULA, [0, -r * 0.28, r * 0.72], [r * 1.35, r * 0.75, r * 1.2]); }
function cadena(B, parent, mat, n, largo, tam) {
  const g = B.grupo(parent, [0, 0, 0]); const eslabones = [];
  for (let i = 0; i < n; i++) { const e = B.pieza('toro', mat, g, [0, -i * largo, 0], [tam, tam * 1.2, tam * 0.7], [i % 2 ? PI / 2 : 0, 0, i % 2 ? 0 : PI / 2]); eslabones.push(e); }
  return { g, eslabones };
}

// ═══════════════════════════ EL CORACERO ═══════════════════════════
function coracero(B) {
  B.altura = 3.9;
  B.esqueleto({ pie: 0.18, tibia: 0.84, muslo: 0.84, cintura: 0.22, torso: 1.15, hombroX: 0.66, brazo: 0.78, cadera: 0.27, cuello: 1.14, cabR: 0.3 });
  Object.assign(B.P.anim, { zancada: 2.7, pierna: 0.38, rodilla: 0.5, inclina: 0.1, cabInc: 0, bI: [-0.25, 0.22, -0.4], bD: [-1.05, 0.22, -0.55], cadera: 0.1, vref: 2.6 });
  const piel = B.mat({ color: 0x77867f, rough: 0.82 }), pielO = B.mat({ color: 0x5c6a64, rough: 0.85 });
  const azul = B.mat({ color: 0x1b2a52, rough: 0.8 }), blanco = B.mat({ color: 0xcfc8b4, rough: 0.8 }), bota = B.mat({ color: 0x141210, rough: 0.5, metal: 0.2 });
  const acero = B.mat({ color: 0xaeb4bd, metal: 0.92, rough: 0.28, rim: 0.2 }), oro = B.mat({ color: 0xc8a64a, metal: 0.9, rough: 0.32 });
  const rojo = B.mat({ color: 0x8a1818, rough: 0.85 }), ojo = B.mat({ color: 0x300800, emis: 0xff5a1f, ei: 3.2 }), brasa = B.mat({ color: 0x401000, emis: 0xff7a22, ei: 1.6 });
  miembros(B, { mPiel: piel, mRopa: azul, mPierna: blanco, mBota: bota, g: 1.2 });
  // greabas y espuelas
  for (const s of [-1, 1]) {
    const t = s < 0 ? J.TIBIA_I : J.TIBIA_D, a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D, f = s < 0 ? J.PIE_I : J.PIE_D;
    B.pieza('segmento', acero, t, [0, -0.42, 0.01], [0.3, 0.78, 0.32]);
    B.pieza('cupula', acero, t, [0, 0.04, 0.12], [0.34, 0.2, 0.3], [PI / 2, 0, 0]);
    B.pieza('cono', acero, f, [0, -0.1, -0.35], [0.07, 0.2, 0.07], [-PI / 2, 0, 0]);
    // hombreras de láminas
    for (let k = 0; k < 3; k++) B.pieza('cupula', acero, a, [0, 0.14 - k * 0.15, 0], [0.62 - k * 0.04, 0.3, 0.64 - k * 0.04]);
    B.pieza('toro', oro, a, [0, 0.0, 0], [0.62, 0.1, 0.64]);
    B.pieza('segmento', acero, b, [0, -0.42, 0], [0.24, 0.75, 0.24]);
    B.pieza('almohada', acero, b, [0, -0.8, 0], [0.3, 0.3, 0.24]);
  }
  // torso y coraza
  B.pieza('torso', azul, J.TORSO, [0, 0.55, 0], [1.1, 1.15, 0.7]);
  B.pieza('torso', acero, J.TORSO, [0, 0.66, 0.1], [1.34, 0.9, 0.88]);
  B.pieza('torso', acero, J.TORSO, [0, 0.62, -0.12], [1.28, 0.9, 0.76]);
  B.pieza('cono', acero, J.TORSO, [0, 0.66, 0.5], [0.08, 0.86, 0.14]);
  B.pieza('toro', oro, J.TORSO, [0, 0.2, 0], [1.3, 0.09, 0.9]); B.pieza('toro', oro, J.TORSO, [0, 1.06, 0], [0.86, 0.09, 0.62]);
  for (let k = 0; k < 7; k++) B.pieza('esfera', oro, J.TORSO, [(k - 3) * 0.17, 0.3, 0.46 - Math.abs(k - 3) * 0.015], [0.05, 0.05, 0.04]);
  for (let k = 0; k < 4; k++) B.pieza('bloque', brasa, J.TORSO, [(k - 1.5) * 0.2, 0.55 + (k % 2) * 0.1, 0.55], [0.09, 0.02, 0.02], [0, 0, k * 0.6]);
  // faldón / tonelete
  for (const s of [-1, 1]) B.pieza('almohada', acero, J.PELVIS, [s * 0.3, -0.35, 0.28], [0.5, 0.7, 0.06], [0.1, 0, s * 0.05]);
  B.pieza('cilindro', acero, J.PELVIS, [0, 0.05, 0], [0.98, 0.28, 0.66]);
  // cabeza con casco de cimera
  cabeza(B, piel, 0.3); mandibula(B, pielO, 0.3);
  B.pieza('cilindro', acero, J.CABEZA, [0, 0.46, 0], [0.68, 0.6, 0.7]);
  B.pieza('cupula', acero, J.CABEZA, [0, 0.82, 0], [0.66, 0.4, 0.7]);
  B.pieza('bloque', ojo, J.CABEZA, [0, 0.42, 0.33], [0.46, 0.06, 0.04]);
  B.pieza('arcoFino', acero, J.CABEZA, [0, 0.4, 0.0], [0.72, 0.5, 0.74]);
  B.pieza('toro', oro, J.CABEZA, [0, 0.2, 0], [0.7, 0.1, 0.74]);
  B.pieza('cilindro', acero, J.CABEZA, [0, 0.0, 0], [0.4, 0.2, 0.4]);
  const cresta = B.grupo(J.CABEZA, [0, 1.0, -0.05]);
  B.pieza('arcoFino', acero, cresta, [0, 0.06, 0], [0.12, 0.2, 0.7], [0, 0, 0]);
  const crin = []; let p = cresta;
  for (let i = 0; i < 4; i++) { const g = B.grupo(p, [0, i ? 0 : 0.1, i ? -0.2 : -0.05]); B.pieza('almohada', rojo, g, [0, 0.0, -0.1], [0.12, 0.1, 0.34 - i * 0.04]); crin.push(g); p = g; }
  // capa
  const capa = B.grupo(J.TORSO, [0, 1.0, -0.42]); const caps = []; p = capa;
  for (let i = 0; i < 4; i++) { const g = B.grupo(p, [0, i ? -0.5 : 0, 0]); B.pieza('almohada', rojo, g, [0, -0.25, 0], [1.1 - i * 0.07, 0.56, 0.05]); caps.push(g); p = g; }
  // sable espectral
  const mano = J.ANTEBRAZO_D;
  B.pieza('cilindro', oro, mano, [0, -0.82, 0], [0.12, 0.34, 0.12]);
  B.pieza('bloque', oro, mano, [0, -0.98, 0], [0.62, 0.07, 0.12]);
  B.pieza('bloque', acero, mano, [0, -2.35, 0.0], [0.13, 2.7, 0.04]);
  B.pieza('bloque', brasa, mano, [0, -2.35, 0.03], [0.04, 2.5, 0.03]);
  B.pieza('cono', acero, mano, [0, -3.78, 0], [0.13, 0.22, 0.04], [PI, 0, 0]);
  B.extras.push((B2, dt, t) => {
    const v = Math.min(1, B2.vel / 2.6);
    crin.forEach((g, i) => { g.rotation.x = -0.15 - 0.25 * v + Math.sin(t * 4 - i) * 0.1 * (0.3 + v); g.rotation.z = Math.sin(t * 2.5 - i * 0.8) * 0.08; });
    caps.forEach((g, i) => { g.rotation.x = 0.1 + 0.28 * v * (1 + i * 0.4) + Math.sin(t * 3 - i * 0.9) * 0.1 * (0.4 + v); g.rotation.z = Math.sin(t * 1.7 - i) * 0.06; });
  });
}

// ═══════════════════════════ EL FOGONERO ═══════════════════════════
function fogonero(B) {
  B.altura = 4.2;
  B.esqueleto({ pie: 0.2, tibia: 0.8, muslo: 0.78, cintura: 0.2, torso: 1.2, hombroX: 0.84, brazo: 0.82, cadera: 0.32, cuello: 1.12, cabR: 0.3, cabZ: 0.12 });
  Object.assign(B.P.anim, { zancada: 2.4, pierna: 0.3, rodilla: 0.38, inclina: 0.24, cabInc: 0.12, bI: [-0.8, 0.45, -0.8], bD: [-0.75, 0.45, -0.7], cadera: 0.12, rebote: 0.04, vref: 2.3 });
  const piel = B.mat({ color: 0x5b554e, rough: 0.9 }), tela = B.mat({ color: 0x33343a, rough: 0.9 }), cuero = B.mat({ color: 0x3a281a, rough: 0.7 });
  const hierro = B.mat({ color: 0x3b3e45, metal: 0.8, rough: 0.5 }), cobre = B.mat({ color: 0xb0653a, metal: 0.9, rough: 0.32, rim: 0.2 }), orin = B.mat({ color: 0x6a4228, metal: 0.6, rough: 0.7 });
  const horno = B.mat({ color: 0x401000, emis: 0xff6a10, ei: 2.6 }), brasa = B.mat({ color: 0x200800, emis: 0xff4a08, ei: 1.5 }), lente = B.mat({ color: 0x301000, emis: 0xffb040, ei: 3 }), esfera = B.mat({ color: 0xe8e0c8, emis: 0xfff0c0, ei: 0.5, rough: 0.4 });
  miembros(B, { mPiel: piel, mRopa: tela, mPierna: tela, mBota: cuero, g: 1.3, gB: 1.05 });
  for (const s of [-1, 1]) {
    const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D;
    B.pieza('segmento', tela, a, [0, -0.3, 0], [0.34, 0.6, 0.34]);
    B.pieza('segmento', cuero, b, [0, -0.5, 0], [0.26, 0.55, 0.26]);                 // guante
    B.pieza('esfera', brasa, a, [s * 0.18, 0.12, 0.1], [0.18, 0.15, 0.18]);          // carbón incrustado
    B.pieza('almohada', cuero, t, [0, -0.5, 0.04], [0.38, 0.5, 0.38]);               // polaina
  }
  // torso con la caldera
  B.pieza('torso', tela, J.TORSO, [0, 0.6, -0.02], [1.35, 1.2, 0.95]);
  B.pieza('toro', cuero, J.TORSO, [0, 0.12, 0], [1.3, 0.12, 0.98]);
  // caldera: cilindro horizontal (eje Z)
  const cal = B.grupo(J.TORSO, [0, 0.72, 0.5]);
  B.pieza('cilindro', hierro, cal, [0, 0.05, 0], [1.3, 1.0, 1.3], [PI / 2, 0, 0]);
  for (const z of [-0.36, 0, 0.36]) B.pieza('toro', cobre, cal, [0, 0.05, z], [1.34, 0.1, 1.34], [PI / 2, 0, 0]);
  B.pieza('cupula', hierro, cal, [0, 0.05, 0.56], [1.28, 0.34, 1.28], [PI / 2, 0, 0]);
  B.pieza('esfera', horno, cal, [0, 0.0, 0.7], [0.62, 0.52, 0.12]);
  B.pieza('toro', cobre, cal, [0, 0.0, 0.7], [0.74, 0.1, 0.74], [PI / 2, 0, 0]);
  for (let k = 0; k < 10; k++) { const a = k / 10 * PI * 2; B.pieza('esfera', cobre, cal, [Math.sin(a) * 0.46, 0.05 + Math.cos(a) * 0.46, 0.74], [0.04, 0.04, 0.04]); }
  for (let k = 0; k < 8; k++) { const a = k / 8 * PI * 2; B.pieza('esfera', hierro, cal, [Math.sin(a) * 0.63, 0.05 + Math.cos(a) * 0.63, 0.5], [0.05, 0.05, 0.05]); }
  // manómetros
  for (const s of [-1, 1]) { const g = B.grupo(cal, [s * 0.38, 0.62, 0.45]); B.pieza('cilindro', cobre, g, [0, 0, 0], [0.26, 0.08, 0.26], [PI / 2, 0, 0]); B.pieza('cilindro', esfera, g, [0, 0, 0.045], [0.2, 0.02, 0.2], [PI / 2, 0, 0]); B.pieza('bloque', horno, g, [0.02 * s, 0.03, 0.06], [0.015, 0.1, 0.01], [0, 0, s * 0.8]); }
  // tuberías y válvulas a los hombros
  for (const s of [-1, 1]) {
    B.pieza('cilindro', cobre, J.TORSO, [s * 0.52, 1.14, 0.16], [0.1, 0.66, 0.1], [0, 0, -s * 0.5]);
    B.pieza('esfera', cobre, J.TORSO, [s * 0.76, 0.98, 0.16], [0.2, 0.2, 0.2]);
    B.pieza('toro', hierro, J.TORSO, [s * 0.76, 1.1, 0.16], [0.22, 0.05, 0.22]);
    B.pieza('cilindro', hierro, J.TORSO, [s * 0.4, 0.28, 0.56], [0.1, 0.5, 0.1], [0.4, 0, s * 1.2]);
  }
  // chimenea trasera
  const chim = B.grupo(J.TORSO, [0.2, 0.9, -0.5]);
  B.pieza('cilindro', hierro, chim, [0, 0.55, 0], [0.38, 1.3, 0.38], [-0.15, 0, 0]);
  B.pieza('toro', cobre, chim, [0, 0.5, 0.05], [0.44, 0.1, 0.44]); B.pieza('toro', cobre, chim, [0, 1.12, -0.11], [0.44, 0.1, 0.44], [-0.15, 0, 0]);
  B.pieza('cilindro', hierro, J.TORSO, [-0.38, 0.9, -0.42], [0.24, 0.9, 0.24], [-0.2, 0, 0.12]);
  B.pieza('cilindro', horno, chim, [0, 1.2, -0.12], [0.26, 0.04, 0.26], [-0.15, 0, 0]);
  B.chimenea = chim;
  // cabeza: gorra de maquinista y gafas
  cabeza(B, piel, 0.3, 0.1, 0.08); mandibula(B, piel, 0.3);
  B.pieza('cilindro', tela, J.CABEZA, [0, 0.62, 0.08], [0.7, 0.3, 0.72]); B.pieza('cilindro', tela, J.CABEZA, [0, 0.5, 0.42], [0.62, 0.05, 0.4], [0.15, 0, 0]);
  B.pieza('cilindro', cuero, J.CABEZA, [0, 0.53, 0.08], [0.72, 0.08, 0.74]);
  for (const s of [-1, 1]) { B.pieza('toro', cobre, J.CABEZA, [s * 0.14, 0.36, 0.34], [0.24, 0.08, 0.24], [PI / 2, 0, 0]); B.pieza('cilindro', lente, J.CABEZA, [s * 0.14, 0.36, 0.34], [0.17, 0.04, 0.17], [PI / 2, 0, 0]); }
  B.pieza('bloque', cuero, J.CABEZA, [0, 0.36, 0.1], [0.74, 0.06, 0.72]);
  // pala gigante en la mano derecha
  const m = J.ANTEBRAZO_D;
  B.pieza('cilindro', orin, m, [0, -1.0, 0.0], [0.09, 2.5, 0.09], [0, 0, 0]);
  B.pieza('bloque', hierro, m, [0, -2.3, 0.2], [0.8, 0.9, 0.06], [-0.6, 0, 0]);
  B.pieza('esfera', brasa, m, [0, -2.1, 0.38], [0.5, 0.2, 0.3], [-0.6, 0, 0]);
  B.pieza('esfera', horno, m, [0.1, -0.8, 0.0], [0.26, 0.26, 0.26]);       // carbón en la mano izquierda
  // carbón en la mano izquierda
  B.pieza('esfera', brasa, J.ANTEBRAZO_I, [0, -0.95, 0.05], [0.34, 0.3, 0.34]);
  B.pieza('esfera', horno, J.ANTEBRAZO_I, [0, -0.98, 0.08], [0.22, 0.2, 0.2]);
  B.emisor = vap(B, { x: 0, y: 3.2, z: 0 });
  B.extras.push((B2, dt, t) => {
    if (B2.emisor) { const p = new THREE.Vector3(); B2.chimenea.getWorldPosition(p); B2.emisor.pos.set(p.x, p.y + 1.5, p.z); B2.emisor.activo = !B2.muerto; }
    B2.piv[J.X0].scale.setScalar(1 + Math.sin(t * 2.2) * 0.012);
  });
  const lib = B.liberar.bind(B); B.liberar = (a) => { B.emisor?.detener?.(); B.emisor = null; lib(a); };
}

// ═══════════════════════════ EL MARISCAL ═══════════════════════════
function mariscal(B) {
  B.altura = 4.0;
  B.esqueleto({ pie: 0.18, tibia: 0.9, muslo: 0.9, cintura: 0.22, torso: 1.2, hombroX: 0.58, brazo: 0.82, cadera: 0.24, cuello: 1.2, cabR: 0.3 });
  Object.assign(B.P.anim, { zancada: 2.8, pierna: 0.34, rodilla: 0.4, inclina: 0.04, cabInc: -0.03, bI: [-0.18, 0.2, -0.2], bD: [-0.95, 0.3, -0.4], cadera: 0.1, vref: 2.4 });
  const piel = B.mat({ color: 0x8a948c, rough: 0.85 }), abrigo = B.mat({ color: 0x4a4c36, rough: 0.9 }), abrigoO = B.mat({ color: 0x35372a, rough: 0.9 }), cuero = B.mat({ color: 0x2a1c12, rough: 0.6 });
  const alambre = B.mat({ color: 0x8a8c90, metal: 0.9, rough: 0.35 }), oro = B.mat({ color: 0xc8a64a, metal: 0.9, rough: 0.3 }), goma = B.mat({ color: 0x24261e, rough: 0.7 });
  const lente = B.mat({ color: 0x102008, emis: 0x9aff6a, ei: 2.2 }), gas = B.mat({ color: 0x182a10, emis: 0x7aff40, ei: 1.1 }), cal = B.mat({ color: 0xd8d4c0, rough: 0.6 }), medalla = B.mat({ color: 0x504010, emis: 0xffd040, ei: 1.2, metal: 0.8 });
  miembros(B, { mPiel: piel, mRopa: abrigoO, mPierna: abrigoO, mBota: cuero, g: 1.15 });
  for (const s of [-1, 1]) {
    const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D;
    B.pieza('segmento', abrigo, a, [0, -0.4, 0], [0.34, 0.84, 0.34]); B.pieza('segmento', abrigo, b, [0, -0.35, 0], [0.28, 0.66, 0.28]);
    B.pieza('toro', alambre, b, [0, -0.7, 0], [0.34, 0.06, 0.34]); B.pieza('toro', alambre, b, [0, -0.15, 0], [0.34, 0.06, 0.34]);
    B.pieza('almohada', goma, b, [0, -0.96, 0], [0.3, 0.3, 0.26]);                 // guantes
    B.pieza('almohada', oro, a, [0, 0.14, 0], [0.56, 0.08, 0.34]);                  // charreteras
    for (let k = 0; k < 4; k++) B.pieza('cono', alambre, a, [(k - 1.5) * 0.12, 0.22, 0], [0.05, 0.2, 0.05], [0, 0, (k - 1.5) * 0.2]);
    B.pieza('segmento', cuero, t, [0, -0.55, 0.03], [0.3, 0.7, 0.3]);
  }
  // abrigo largo
  B.pieza('torso', abrigo, J.TORSO, [0, 0.58, 0], [1.22, 1.22, 0.78]);
  B.pieza('cilindro', abrigo, J.PELVIS, [0, -0.55, 0], [1.2, 1.5, 0.88]);
  B.pieza('cilindro', abrigoO, J.PELVIS, [0, -0.06, 0], [1.24, 0.12, 0.92]);
  // alambre de espino enrollado
  for (let k = 0; k < 5; k++) B.pieza('toro', alambre, J.PELVIS, [0, -0.3 - k * 0.26, 0], [1.26 + k * 0.045, 0.045, 0.92 + k * 0.045], [0.0, 0, 0.03 * (k % 2 ? 1 : -1)]);
  for (let k = 0; k < 4; k++) B.pieza('toro', alambre, J.TORSO, [0, 0.2 + k * 0.28, 0], [1.28, 0.04, 0.84], [0.1 * (k % 2 ? 1 : -1), 0, 0]);
  for (let k = 0; k < 22; k++) { const a = k / 22 * PI * 2; const y = -0.4 - (k % 5) * 0.27, rr = 0.62 + (k % 5) * 0.025; B.pieza('cono', alambre, J.PELVIS, [Math.sin(a) * rr * 1.0, y, Math.cos(a) * rr * 0.76], [0.045, 0.2, 0.045], [Math.cos(a) * 1.2, 0, -Math.sin(a) * 1.2]); }
  B.pieza('cilindro', cuero, J.TORSO, [0, 0.1, 0], [1.26, 0.1, 0.84]); B.pieza('bloque', oro, J.TORSO, [0, 0.1, 0.44], [0.14, 0.12, 0.04]);
  B.pieza('bloque', cuero, J.TORSO, [0.0, 0.6, 0.4], [0.07, 1.1, 0.04], [0, 0, 0.7]);                                        // bandolera
  for (let k = 0; k < 6; k++) B.pieza('esfera', medalla, J.TORSO, [-0.3 + (k % 3) * 0.1, 0.85 - Math.floor(k / 3) * 0.1, 0.4], [0.06, 0.06, 0.03]);
  // mochila de gas
  for (const s of [-1, 1]) { B.pieza('cilindro', goma, J.TORSO, [s * 0.28, 0.65, -0.55], [0.34, 1.1, 0.34]); B.pieza('toro', gas, J.TORSO, [s * 0.28, 0.9, -0.55], [0.36, 0.06, 0.36]); B.pieza('toro', gas, J.TORSO, [s * 0.28, 0.4, -0.55], [0.36, 0.06, 0.36]); B.pieza('esfera', gas, J.TORSO, [s * 0.28, 1.22, -0.55], [0.24, 0.12, 0.24]); }
  // cabeza con máscara antigás
  cabeza(B, piel, 0.3); mandibula(B, piel, 0.3);
  B.pieza('almohada', goma, J.CABEZA, [0, 0.4, 0.2], [0.62, 0.66, 0.5]);
  for (const s of [-1, 1]) { B.pieza('toro', alambre, J.CABEZA, [s * 0.17, 0.52, 0.45], [0.3, 0.08, 0.3], [PI / 2, 0, 0]); B.pieza('cilindro', lente, J.CABEZA, [s * 0.17, 0.52, 0.45], [0.22, 0.05, 0.22], [PI / 2, 0, 0]); }
  B.pieza('cilindro', alambre, J.CABEZA, [0, 0.22, 0.58], [0.3, 0.3, 0.3], [PI / 2, 0, 0]); B.pieza('cilindro', goma, J.CABEZA, [0, 0.22, 0.74], [0.22, 0.12, 0.22], [PI / 2, 0, 0]);
  B.pieza('segmento', goma, J.CABEZA, [0, -0.1, 0.3], [0.07, 0.5, 0.07], [0.7, 0, 0]);
  B.pieza('cilindro', abrigo, J.CABEZA, [0, 0.82, 0.02], [0.7, 0.28, 0.72]); B.pieza('cilindro', cuero, J.CABEZA, [0, 0.7, 0.38], [0.62, 0.05, 0.36], [0.2, 0, 0]);
  B.pieza('esfera', cal, J.CABEZA, [0, 0.86, 0.38], [0.12, 0.12, 0.05]); B.pieza('toro', oro, J.CABEZA, [0, 0.7, 0.02], [0.72, 0.07, 0.74]);
  // fusta en la mano derecha
  B.pieza('segmento', cuero, J.ANTEBRAZO_D, [0, -1.5, 0.0], [0.05, 1.5, 0.05]);
  B.pieza('cono', alambre, J.ANTEBRAZO_D, [0, -2.3, 0.0], [0.08, 0.3, 0.08], [PI, 0, 0]);
  B.extras.push((B2, dt, t) => { B2.piv[J.PELVIS].rotation.z += 0; });
}

// ═══════════════════════════ EL REY DEL ASFALTO ═══════════════════════════
function rey(B) {
  B.altura = 4.5;
  B.esqueleto({ pie: 0, tibia: 0.8, muslo: 0.8, cintura: 0.3, torso: 1.3, hombroX: 0.92, brazo: 1.0, cadera: 0.3, cuello: 1.3, cabR: 0.33 });
  Object.assign(B.P.anim, { zancada: 4.2, pierna: 0.0, rodilla: 0, inclina: 0.2, cabInc: -0.1, bI: [-0.9, 0.5, -0.9], bD: [-0.9, 0.5, -0.9], cadera: 0.03, rebote: 0.05, vref: 3.4, arrastre: 0 });
  const piel = B.mat({ color: 0x8c7a6a, rough: 0.8 }), cuero = B.mat({ color: 0x151515, rough: 0.45, metal: 0.15 }), cromo = B.mat({ color: 0xd8dce2, metal: 1, rough: 0.14, rim: 0.2 }), acero = B.mat({ color: 0x3a3c44, metal: 0.85, rough: 0.4 });
  const goma = B.mat({ color: 0x0c0c0e, rough: 0.9 }), rojo = B.mat({ color: 0x9a1a1a, rough: 0.35, metal: 0.4 }), faro = B.mat({ color: 0x302810, emis: 0xfff2b0, ei: 4 }), llama = B.mat({ color: 0x401800, emis: 0xff7a1a, ei: 3 }), ojo = B.mat({ color: 0x300500, emis: 0xff3a1a, ei: 3.4 });
  B.piv[J.TIBIA_I].visible = false;
  for (const j of [J.MUSLO_I, J.MUSLO_D]) B.piv[j].visible = false;
  // ── Moto: bastidor sobre la pelvis ──
  const ruedaT = B.grupo(J.PELVIS, [0, -0.85, -1.55]), ruedaD = B.grupo(J.PELVIS, [0, -0.85, 1.75]);
  for (const r of [ruedaT, ruedaD]) {
    B.pieza('toro', goma, r, [0, 0, 0], [1.5, 2.2, 1.5], [0, 0, PI / 2]);
    B.pieza('toro', cromo, r, [0, 0, 0], [1.02, 0.5, 1.02], [0, 0, PI / 2]);
    B.pieza('cilindro', cromo, r, [0, 0, 0], [0.3, 0.7, 0.3], [0, 0, PI / 2]);
    for (let k = 0; k < 6; k++) B.pieza('cilindro', cromo, r, [0, 0, 0], [0.05, 0.9, 0.05], [k * PI / 6, 0, 0]);
    B.pieza('cilindro', rojo, r, [0, 0, 0], [0.12, 0.42, 0.12], [0, 0, PI / 2]);
  }
  B.pieza('bloque', acero, J.PELVIS, [0, -0.55, 0.15], [0.8, 0.8, 1.3]);
  for (let k = 0; k < 4; k++) B.pieza('cilindro', cromo, J.PELVIS, [(k % 2 ? 0.28 : -0.28), -0.24, 0.45 - Math.floor(k / 2) * 0.55], [0.22, 0.3, 0.22], [0, 0, k % 2 ? -0.4 : 0.4]);
  B.pieza('almohada', rojo, J.PELVIS, [0, -0.1, 0.9], [0.72, 0.6, 1.0]);                      // depósito
  B.pieza('almohada', cuero, J.PELVIS, [0, -0.1, -0.5], [0.8, 0.28, 1.1]);                    // asiento
  for (const s of [-1, 1]) { B.pieza('cilindro', cromo, J.PELVIS, [s * 0.34, -0.5, 1.58], [0.1, 1.5, 0.1], [0.3, 0, 0]); B.pieza('cilindro', cromo, J.PELVIS, [s * 0.26, -0.78, -1.0], [0.1, 1.7, 0.1], [-1.35, 0, 0]); }
  B.pieza('cilindro', cromo, J.PELVIS, [0, 0.02, 1.4], [1.7, 0.1, 0.1], [0, 0, PI / 2]);       // manillar
  for (const s of [-1, 1]) { B.pieza('cono', cromo, J.PELVIS, [s * 0.95, 0.12, 1.4], [0.12, 0.7, 0.12], [0, 0, -s * 1.1]); }
  B.pieza('esfera', faro, J.PELVIS, [0, -0.1, 2.12], [0.5, 0.5, 0.34]); B.pieza('toro', cromo, J.PELVIS, [0, -0.1, 2.08], [0.56, 0.08, 0.56], [PI / 2, 0, 0]);
  // tubos de escape en la espalda
  const tubos = [];
  for (const s of [-1, 1]) for (let k = 0; k < 2; k++) {
    const g = B.grupo(J.TORSO, [s * (0.46 + k * 0.2), 0.55 + k * 0.2, -0.5]);
    B.pieza('cilindro', cromo, g, [0, 0.55, -0.12], [0.2, 1.4, 0.2], [-0.3, 0, s * 0.1]);
    B.pieza('cilindro', acero, g, [0, 1.25, -0.4], [0.28, 0.3, 0.28], [-0.3, 0, s * 0.1]);
    const f = B.pieza('cono', llama, g, [0, 1.55, -0.5], [0.22, 0.6, 0.22], [-0.3, 0, s * 0.1]); tubos.push(f);
  }
  // torso: chaqueta de cuero, motor V8 en el pecho
  B.pieza('torso', cuero, J.TORSO, [0, 0.65, 0], [1.5, 1.3, 0.95]);
  B.pieza('bloque', acero, J.TORSO, [0, 0.7, 0.5], [0.78, 0.62, 0.34]);
  for (let k = 0; k < 4; k++) { const x = (k % 2 ? 0.2 : -0.2), z = 0.5; B.pieza('cilindro', cromo, J.TORSO, [x, 1.05, z + (k < 2 ? 0.04 : -0.04)], [0.14, 0.26, 0.14], [0, 0, x * 0.6]); B.pieza('esfera', llama, J.TORSO, [x, 1.2, z + (k < 2 ? 0.04 : -0.04)], [0.1, 0.1, 0.1]); }
  B.pieza('toro', cromo, J.TORSO, [0, 0.45, 0.6], [0.3, 0.05, 0.3], [PI / 2, 0, 0]);
  for (let k = 0; k < 5; k++) B.pieza('esfera', cromo, J.TORSO, [-0.6 + k * 0.3, 0.12, 0.5], [0.05, 0.05, 0.04]);
  for (const s of [-1, 1]) {
    const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D;
    B.pieza('esfera', piel, a, [0, 0, 0], [0.5, 0.46, 0.5]); B.pieza('segmento', piel, a, [0, -0.5, 0], [0.4, 1.06, 0.4]);
    B.pieza('cupula', cuero, a, [0, 0.16, 0], [0.84, 0.46, 0.8]);
    for (let k = 0; k < 4; k++) B.pieza('cono', cromo, a, [(k - 1.5) * 0.17, 0.42 - Math.abs(k - 1.5) * 0.06, 0], [0.1, 0.38, 0.1], [0, 0, (k - 1.5) * 0.28]);
    B.pieza('esfera', piel, b, [0, 0, 0], [0.34, 0.3, 0.34]); B.pieza('segmento', piel, b, [0, -0.14, 0], [0.3, 0.3, 0.3]);
    B.pieza('toro', cuero, b, [0, -0.28, 0], [0.38, 0.1, 0.38]);
    // cadena brazo
    const c = cadena(B, b, cromo, 7, 0.34, 0.3); c.g.position.set(0, -0.34, 0); B.cadenas = B.cadenas || []; B.cadenas.push(c.g);
    const bola = B.grupo(c.g, [0, -7 * 0.34 - 0.2, 0]);
    B.pieza('esfera', acero, bola, [0, 0, 0], [0.7, 0.7, 0.7]); for (let k = 0; k < 8; k++) { const th = k * 0.9, ph = (k % 4) * 0.8 - 1.1; B.pieza('cono', cromo, bola, [Math.cos(th) * Math.cos(ph) * 0.36, Math.sin(ph) * 0.36, Math.sin(th) * Math.cos(ph) * 0.36], [0.12, 0.3, 0.12], [Math.sin(th) * 1.4, 0, -Math.cos(th) * 1.4 + (ph)]); }
  }
  // cabeza: casco de calavera y cresta
  cabeza(B, piel, 0.33, 0.1); mandibula(B, piel, 0.33);
  B.pieza('cupula', cromo, J.CABEZA, [0, 0.52, -0.02], [0.82, 0.62, 0.86]);
  B.pieza('bloque', ojo, J.CABEZA, [0, 0.42, 0.37], [0.62, 0.12, 0.05]);
  for (let k = 0; k < 7; k++) B.pieza('cono', cromo, J.CABEZA, [0, 0.9 - Math.abs(k - 3) * 0.04, 0.3 - k * 0.14], [0.08, 0.5 - Math.abs(k - 3) * 0.04, 0.12], [0.2 * (k - 3) * 0.3, 0, 0]);
  B.pieza('bloque', cromo, J.MANDIBULA, [0, -0.08, 0.28], [0.34, 0.16, 0.14]);
  for (let k = 0; k < 5; k++) B.pieza('cono', cromo, J.MANDIBULA, [(k - 2) * 0.06, 0.1, 0.33], [0.04, 0.12, 0.04], [PI, 0, 0]);
  // estado: ruedas giran con la velocidad
  B.rueda = 0;
  B.extras.push((B2, dt, t) => {
    B2.rueda += B2.vel / 0.75 * dt;
    ruedaT.rotation.x = B2.rueda; ruedaD.rotation.x = B2.rueda;
    tubos.forEach((f, i) => { const k = 0.8 + 0.5 * Math.sin(t * 40 + i * 2) + B2.vel * 0.1; f.scale.set(0.22 * k, 0.6 * (0.8 + k * 0.5), 0.22 * k); });
    if (B2.cadenas) B2.cadenas.forEach((c, i) => { c.rotation.x = Math.sin(t * 2.3 + i) * 0.15 + (B2.vel > 0.5 ? -0.3 : 0.0); c.rotation.z = Math.sin(t * 1.9 + i * 2) * 0.1; });
    B2.piv[J.PELVIS].rotation.z = Math.sin(t * 1.6) * 0.02 + (B2.acc && B2.acc.n === 'cargar' ? 0.04 : 0);
  });
}

// ═══════════════════════════ PACIENTE CERO ═══════════════════════════
function paciente(B) {
  B.altura = 4.6;
  B.esqueleto({ pie: 0.15, tibia: 0.92, muslo: 0.9, cintura: 0.25, torso: 1.4, hombroX: 0.78, brazo: 1.05, cadera: 0.32, cuello: 1.4, cabR: 0.38, cabZ: 0.25 });
  Object.assign(B.P.anim, { zancada: 2.5, pierna: 0.34, rodilla: 0.5, inclina: 0.5, cabInc: 0.1, cabLado: 0.35, boca: 0.5, bI: [-0.95, 0.5, -0.9], bD: [-0.55, 0.75, -0.5], cadera: 0.2, temblor: 1.4, arrastre: 0, vref: 2.8 });
  const piel = B.mat({ color: 0xa9b79a, rough: 0.7, rim: 0.2 }), pielO = B.mat({ color: 0x8a9a80, rough: 0.7 }), carne = B.mat({ color: 0x7a1c34, rough: 0.5, emis: 0xff3a8a, ei: 0.5 }), bata = B.mat({ color: 0x8fb6c0, rough: 0.9 });
  const hueso = B.mat({ color: 0xd8d0b8, rough: 0.6 }), saco = B.mat({ color: 0x223000, emis: 0xb6ff3a, ei: 1.5, rough: 0.3 }), ojo = B.mat({ color: 0x200030, emis: 0xff5aff, ei: 3 }), tent = B.mat({ color: 0x6a5a7a, rough: 0.45, emis: 0x8a2aff, ei: 0.3 }), punta = B.mat({ color: 0x300040, emis: 0xe060ff, ei: 2.6 });
  miembros(B, { mPiel: piel, mRopa: piel, mPierna: piel, mBota: pielO, g: 1.25, gPD: 0.7, gD: 1.5, sinManos: false });
  // torso deformado
  B.pieza('torso', piel, J.TORSO, [0, 0.7, 0], [1.4, 1.4, 1.0]);
  B.pieza('torso', carne, J.TORSO, [0, 0.72, 0.1], [0.9, 1.1, 0.9]);
  for (let k = 0; k < 6; k++) B.pieza('arcoFino', hueso, J.TORSO, [0, 0.36 + k * 0.15, 0.1], [0.98 - k * 0.03, 0.045, 0.96]);
  B.pieza('cilindro', hueso, J.TORSO, [0, 0.7, 0.14], [0.05, 0.95, 0.05]);
  B.pieza('esfera', carne, J.TORSO, [0, 0.7, 0.2], [0.5, 0.7, 0.4]);
  // joroba con espinas
  B.pieza('esfera', piel, J.TORSO, [0, 1.1, -0.5], [1.1, 0.9, 0.7]);
  for (let k = 0; k < 8; k++) B.pieza('cono', hueso, J.TORSO, [0, 1.5 - k * 0.14, -0.78 - Math.sin(k * 0.4) * 0.08], [0.12, 0.42, 0.12], [-0.7 - k * 0.04, 0, 0]);
  // bata rota
  B.pieza('almohada', bata, J.PELVIS, [0, -0.3, 0.1], [1.0, 0.9, 0.7]); B.pieza('almohada', bata, J.TORSO, [-0.3, 1.15, 0.05], [0.7, 0.2, 0.9], [0, 0, 0.2]);
  // sacos de esporas y tumores
  const sacos = [];
  const pos = [[-0.55, 0.9, 0.35, 0.34], [0.5, 0.5, 0.45, 0.28], [0.62, 1.2, -0.2, 0.36], [-0.6, 0.35, -0.3, 0.3], [0.1, 1.5, -0.4, 0.26], [-0.2, 0.2, 0.5, 0.22]];
  for (const [x, y, z, r] of pos) { const g = B.grupo(J.TORSO, [x, y, z]); B.pieza('esfera', saco, g, [0, 0, 0], [r * 2, r * 2, r * 2]); B.pieza('esfera', carne, g, [0, -r * 0.4, 0], [r * 2.3, r * 1.2, r * 2.3]); sacos.push(g); }
  // cabeza: múltiples ojos, mandíbula descomunal
  cabeza(B, pielO, 0.38, 0.1, 0.12); mandibula(B, pielO, 0.38);
  for (const [x, y, z, r] of [[-0.18, 0.64, 0.4, 0.1], [0.18, 0.64, 0.4, 0.1], [-0.3, 0.48, 0.34, 0.07], [0.3, 0.48, 0.34, 0.07], [0, 0.82, 0.34, 0.06]]) B.pieza('esfera', ojo, J.CABEZA, [x, y, z], [r * 2, r * 2, r * 1.5]);
  for (let k = 0; k < 8; k++) { B.pieza('cono', hueso, J.MANDIBULA, [(k - 3.5) * 0.08, 0.1, 0.42], [0.04, 0.18, 0.04], [PI, 0, 0]); B.pieza('cono', hueso, J.CABEZA, [(k - 3.5) * 0.08, 0.1, 0.46], [0.04, 0.16, 0.04]); }
  B.pieza('esfera', carne, J.CABEZA, [0.5, 0.3, -0.1], [0.34, 0.4, 0.3]);       // tumor
  // garra derecha gigante
  const mG = J.ANTEBRAZO_D;
  B.pieza('esfera', carne, mG, [0, -0.7, 0], [0.7, 0.9, 0.6]);
  for (let k = 0; k < 4; k++) B.pieza('cono', hueso, mG, [(k - 1.5) * 0.18, -1.35, 0.1], [0.12, 0.8, 0.1], [PI, 0, (k - 1.5) * 0.12]);
  // brazos pequeños extra en el costado
  const extra = [];
  for (const s of [-1, 1]) { const g = B.grupo(J.TORSO, [s * 0.6, 0.4, 0.3]); B.pieza('segmento', pielO, g, [0, -0.3, 0], [0.12, 0.7, 0.12]); const g2 = B.grupo(g, [0, -0.6, 0]); B.pieza('segmento', pielO, g2, [0, -0.25, 0], [0.1, 0.55, 0.1]); B.pieza('almohada', carne, g2, [0, -0.55, 0], [0.16, 0.2, 0.1]); extra.push([g, g2, s]); }
  // tentáculos
  const tents = [];
  for (let i = 0; i < 6; i++) {
    const base = B.grupo(J.TORSO, [(i - 2.5) * 0.24, 0.9 + (i % 2) * 0.2, -0.6], [-0.9, (i - 2.5) * 0.25, 0]);
    let p = base; const seg = [];
    for (let k = 0; k < 6; k++) { const g = B.grupo(p, [0, k ? 0.62 : 0, 0]); const w = 0.17 * (1 - k * 0.12); B.pieza('segmento', tent, g, [0, 0.31, 0], [w, 0.7, w], [PI, 0, 0]); p = g; seg.push(g); }
    B.pieza('esfera', punta, p, [0, 0.64, 0], [0.18, 0.2, 0.18]); tents.push({ seg, i });
  }
  B.extras.push((B2, dt, t) => {
    const tel = B2.tel, atq = B2.acc && B2.acc.extra === 'tentaculos' ? 1 : 0;
    tents.forEach(({ seg, i }) => seg.forEach((g, k) => { g.rotation.x = 0.1 + Math.sin(t * 2.2 + i * 1.1 - k * 0.7) * 0.28 + tel * 0.5 * (atq ? 1 : 0.3) + (B2.vel > 0.5 ? 0.12 : 0); g.rotation.z = Math.sin(t * 1.6 + i * 2 - k * 0.5) * 0.25; }));
    sacos.forEach((g, i) => g.scale.setScalar(1 + Math.sin(t * 2.6 + i * 1.7) * 0.07 + B2.tel * 0.2));
    extra.forEach(([g, g2, s]) => { g.rotation.x = -0.6 + Math.sin(t * 3 + s) * 0.3; g.rotation.z = s * (0.5 + Math.sin(t * 2.1) * 0.25); g2.rotation.x = -0.8 + Math.sin(t * 4 + s * 2) * 0.35; });
  });
}

// ═══════════════════════════ OMEGA ═══════════════════════════
function omega(B) {
  B.altura = 5.1;
  B.esqueleto({ pie: 0.24, tibia: 1.0, muslo: 1.02, cintura: 0.28, torso: 1.5, hombroX: 1.0, brazo: 1.15, cadera: 0.4, cuello: 1.55, cabR: 0.36 });
  Object.assign(B.P.anim, { zancada: 3.0, pierna: 0.3, rodilla: 0.38, inclina: 0.12, cabInc: 0, bI: [-0.45, 0.45, -0.5], bD: [-0.95, 0.35, -0.2], cadera: 0.08, rebote: 0.03, vref: 3.0 });
  const cromo = B.mat({ color: 0xcfd3da, metal: 0.95, rough: 0.2, rim: 0.2 }), gun = B.mat({ color: 0x23262e, metal: 0.85, rough: 0.4 }), carne = B.mat({ color: 0x7a4a52, rough: 0.6, rim: 0.2 }), carneO = B.mat({ color: 0x5a3040, rough: 0.7 });
  const cian = B.mat({ color: 0x021a20, emis: 0x18e6ff, ei: 2.4 }), magenta = B.mat({ color: 0x200012, emis: 0xff2a9a, ei: 2 }), nucleo = B.mat({ color: 0x102030, emis: 0x66f0ff, ei: 4.4 }), hueso = B.mat({ color: 0xd8d0b8, rough: 0.6 });
  miembros(B, { mPiel: carne, mPielB: gun, mRopa: gun, mPierna: gun, mBota: cromo, g: 1.35, gP: 1.1 });
  for (const s of [-1, 1]) {
    const a = s < 0 ? J.BRAZO_I : J.BRAZO_D, b = s < 0 ? J.ANTEBRAZO_I : J.ANTEBRAZO_D, m = s < 0 ? J.MUSLO_I : J.MUSLO_D, t = s < 0 ? J.TIBIA_I : J.TIBIA_D, f = s < 0 ? J.PIE_I : J.PIE_D;
    B.pieza('segmento', cromo, m, [0, -0.5, 0.0], [0.5, 1.0, 0.5]); B.pieza('esfera', cian, m, [0, 0.0, 0.0], [0.34, 0.34, 0.34]);
    B.pieza('cilindro', gun, m, [s * 0.18, -0.5, 0.12], [0.08, 0.9, 0.08]);
    B.pieza('esfera', magenta, t, [0, 0.0, 0.14], [0.22, 0.22, 0.2]); B.pieza('segmento', cromo, t, [0, -0.52, 0.02], [0.42, 1.0, 0.44]);
    B.pieza('almohada', cromo, f, [0, -0.1, 0.22], [0.54, 0.26, 0.9]);
    B.pieza('esfera', cromo, a, [0, 0.05, 0], [0.7, 0.62, 0.7]); B.pieza('toro', cian, a, [0, 0.05, 0], [0.72, 0.08, 0.72]);
  }
  // brazo derecho máquina con cañón; izquierdo carne con garra
  B.pieza('segmento', cromo, J.BRAZO_D, [0, -0.55, 0], [0.4, 1.1, 0.4]);
  B.pieza('cilindro', gun, J.ANTEBRAZO_D, [0, -0.7, 0], [0.5, 1.2, 0.5]);
  B.pieza('cilindro', cian, J.ANTEBRAZO_D, [0, -1.34, 0], [0.34, 0.1, 0.34]);
  B.pieza('toro', cian, J.ANTEBRAZO_D, [0, -1.18, 0], [0.5, 0.06, 0.5]); B.pieza('toro', cian, J.ANTEBRAZO_D, [0, -0.5, 0], [0.5, 0.06, 0.5]);
  B.pieza('esfera', carneO, J.BRAZO_I, [0, -0.5, 0.0], [0.42, 1.0, 0.42]);
  for (let k = 0; k < 3; k++) B.pieza('cono', cromo, J.ANTEBRAZO_I, [(k - 1) * 0.16, -1.2, 0.04], [0.1, 0.62, 0.08], [PI, 0, (k - 1) * 0.15]);
  // torso: mitad cromo, mitad carne; núcleo expuesto
  B.pieza('torso', cromo, J.TORSO, [0, 0.76, 0], [1.6, 1.5, 1.1]);
  B.pieza('torso', carne, J.TORSO, [-0.28, 0.82, 0.12], [0.86, 1.28, 1.0]);
  for (let k = 0; k < 5; k++) B.pieza('arcoFino', hueso, J.TORSO, [-0.3, 0.4 + k * 0.18, 0.12], [0.8, 0.045, 0.9]);
  B.pieza('esfera', carneO, J.TORSO, [-0.46, 0.7, 0.5], [0.3, 0.5, 0.2]);
  B.pieza('cilindro', gun, J.TORSO, [0, 0.84, 0.5], [0.76, 0.2, 0.76], [PI / 2, 0, 0]);
  B.pieza('toro', cian, J.TORSO, [0, 0.84, 0.62], [0.76, 0.06, 0.76], [PI / 2, 0, 0]);
  const nuc = B.grupo(J.TORSO, [0, 0.84, 0.5]);
  B.pieza('esfera', nucleo, nuc, [0, 0, 0.0], [0.5, 0.5, 0.5]); B.pieza('toro', magenta, nuc, [0, 0, 0.1], [0.62, 0.05, 0.62], [PI / 2, 0.5, 0]);
  const placas = [];
  for (let k = 0; k < 4; k++) { const g = B.grupo(nuc, [0, 0, 0.14], [0, 0, k * PI / 2]); const pl = B.pieza('almohada', cromo, g, [0, 0.34, 0.1], [0.3, 0.3, 0.07]); placas.push(g); }
  for (let k = 0; k < 6; k++) B.pieza('bloque', cian, J.TORSO, [-0.74 + (k % 3) * 0.04, 0.3 + k * 0.17, 0.4], [0.03, 0.12, 0.03]);
  // hombros: cañón de plasma y enjambre
  const cano = B.grupo(J.TORSO, [1.1, 1.55, -0.1]);
  B.pieza('cilindro', gun, cano, [0, 0, 0.0], [0.5, 0.9, 0.5], [PI / 2, 0, 0]); B.pieza('cilindro', cromo, cano, [0, 0, 0.6], [0.3, 0.7, 0.3], [PI / 2, 0, 0]); B.pieza('toro', cian, cano, [0, 0, 0.9], [0.36, 0.05, 0.36], [PI / 2, 0, 0]);
  const dron = B.grupo(J.TORSO, [-1.1, 1.5, -0.1]); B.pieza('bloque', gun, dron, [0, 0.1, 0], [0.8, 0.5, 0.8]);
  for (let k = 0; k < 6; k++) B.pieza('esfera', cian, dron, [(k % 3 - 1) * 0.22, 0.38, (Math.floor(k / 3) - 0.5) * 0.3], [0.14, 0.1, 0.14]);
  // reactor y cables en la espalda
  const reactor = B.grupo(J.TORSO, [0, 0.9, -0.62]);
  B.pieza('toro', cian, reactor, [0, 0, 0], [1.0, 0.1, 1.0], [PI / 2, 0, 0]); B.pieza('toro', magenta, reactor, [0, 0, 0], [0.62, 0.08, 0.62], [PI / 2, 0, 0]); B.pieza('cilindro', gun, reactor, [0, 0, -0.1], [0.6, 0.3, 0.6], [PI / 2, 0, 0]);
  for (let k = 0; k < 4; k++) B.pieza('segmento', gun, J.TORSO, [(k - 1.5) * 0.3, 1.3, -0.55], [0.06, 0.9, 0.06], [0.3, 0, (k - 1.5) * 0.2]);
  B.pieza('toro', cian, J.PELVIS, [0, 0.0, 0], [1.1, 0.07, 0.76]);
  B.pieza('cilindro', cromo, J.PELVIS, [0, 0.02, 0], [1.05, 0.34, 0.76]);
  // cabeza: cráneo metálico con visor y antenas
  B.pieza('cabeza', carne, J.CABEZA, [0, 0.38, 0.03], [0.68, 0.76, 0.72]);
  B.pieza('cupula', cromo, J.CABEZA, [0, 0.58, -0.04], [0.76, 0.5, 0.82]);
  B.pieza('bloque', cian, J.CABEZA, [0, 0.46, 0.34], [0.62, 0.09, 0.05]); B.pieza('esfera', magenta, J.CABEZA, [0.17, 0.3, 0.36], [0.1, 0.1, 0.08]);
  B.pieza('mandibula', gun, J.MANDIBULA, [0, -0.1, 0.26], [0.5, 0.28, 0.46]);
  for (let k = 0; k < 5; k++) { B.pieza('cilindro', gun, J.CABEZA, [(k - 2) * 0.12, 0.98 + (k % 2) * 0.12, -0.15], [0.03, 0.55 + (k % 2) * 0.2, 0.03], [0.2, 0, (k - 2) * 0.12]); B.pieza('esfera', cian, J.CABEZA, [(k - 2) * 0.12 + (k - 2) * 0.03, 1.27 + (k % 2) * 0.22, -0.1], [0.07, 0.07, 0.07]); }
  B.extras.push((B2, dt, t) => {
    const abre = B2.furiaK;
    placas.forEach((g, k) => { g.children[0].position.y = 0.34 + 0.24 * abre; g.children[0].rotation.x = -0.6 * abre; });
    nuc.scale.setScalar(1 + 0.08 * Math.sin(t * 5) + 0.25 * abre); nuc.rotation.z = t * 0.8;
    reactor.rotation.z = t * 1.4;
  });
}

export const DISENOS = { coracero, fogonero, mariscal, rey_asfalto: rey, paciente_cero: paciente, omega };
