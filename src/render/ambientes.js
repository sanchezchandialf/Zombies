// Atmósferas de las seis eras de ERA Z (paleta de docs/ARTE.md §5).
// Cada era define cuatro «claves» horarias (amanecer 0 · mediodía 0.25 · atardecer 0.5 · medianoche 0.75) que se
// interpolan de forma cíclica y suave, más constantes de era (luna, gradación de color, postproceso, nubes y clima).
// Todos los colores son sRGB (hex) y se convierten a lineal al cargar. Este módulo no toca el renderer.
import * as THREE from 'three';

export const CLAVES = ['amanecer', 'mediodia', 'atardecer', 'noche'];

/**
 * Campos de una clave horaria:
 *  cenit/horizonte  colores del cielo · sol  color de la luz principal · solI  intensidad pico del sol (lux «three»)
 *  niebla/nieblaD   color y densidad (FogExp2) · hemiC/hemiS/hemiI  hemisférica (cielo, suelo, intensidad)
 *  exp  exposición · envI  intensidad del entorno PMREM · bloom  intensidad del bloom
 */
const AMBIENTES_DEF = [
  // ───────────────────────────── 0 · Era de la Pólvora: sepia dorado, niebla azul fría, luz de faroles
  {
    idx: 0, id: 'polvora', nombre: 'Pólvora',
    claves: {
      amanecer: { cenit: 0x4a6896, horizonte: 0xf0b384, sol: 0xffc48a, solI: 3.45, niebla: 0xb7b2b6, nieblaD: 0.017, hemiC: 0x8fa3c9, hemiS: 0x5c4a3a, hemiI: 0.57, exp: 1.0, envI: 0.46, bloom: 0.55 },
      mediodia: { cenit: 0x4f86c6, horizonte: 0xd2dadb, sol: 0xfff0d2, solI: 4.94, niebla: 0xc6ced2, nieblaD: 0.011, hemiC: 0xaac3e8, hemiS: 0x6b5a46, hemiI: 0.63, exp: 0.95, envI: 0.56, bloom: 0.4 },
      atardecer: { cenit: 0x3c4f88, horizonte: 0xff9a4d, sol: 0xffa05a, solI: 4.02, niebla: 0xc58c68, nieblaD: 0.015, hemiC: 0x8b8fba, hemiS: 0x5a3d2a, hemiI: 0.54, exp: 1.0, envI: 0.46, bloom: 0.6 },
      noche: { cenit: 0x0d1736, horizonte: 0x2c4170, sol: 0x8aa6ff, solI: 1.4, niebla: 0x3b5478, nieblaD: 0.021, hemiC: 0x3d5594, hemiS: 0x1b1f2e, hemiI: 1.0, exp: 1.3, envI: 0.65, bloom: 0.85 },
    },
    luna: { color: 0x8aa6ff, intensidad: 1.6 },
    estrellas: 1.0,
    nubes: { cobertura: 0.42, claro: 0xfff0dc, oscuro: 0x6d7690, velocidad: 0.004 },
    grade: { sombras: [0.95, 0.94, 0.97], luces: [1.07, 1.0, 0.86], sat: 0.84, contraste: 1.1 },
    post: { umbral: 1.0, vineta: 0.42, grano: 0.035, aberracion: 0.0016, ao: 0.78, aoRadio: 1.0 },
    clima: { tipo: 'niebla', cantidad: 0.85 },
  },
  // ───────────────────────────── 1 · Era del Vapor: polvo naranja, atardecer rojo, hierro negro
  {
    idx: 1, id: 'vapor', nombre: 'Vapor',
    claves: {
      amanecer: { cenit: 0x6f6e92, horizonte: 0xf2a266, sol: 0xffb070, solI: 3.68, niebla: 0xc7916a, nieblaD: 0.019, hemiC: 0x9a90b0, hemiS: 0x5a3d2c, hemiI: 0.54, exp: 1.0, envI: 0.46, bloom: 0.55 },
      mediodia: { cenit: 0x6c97c2, horizonte: 0xe9c392, sol: 0xffe2b0, solI: 5.17, niebla: 0xd9b88e, nieblaD: 0.015, hemiC: 0xb8c4d8, hemiS: 0x7a5a3a, hemiI: 0.60, exp: 0.95, envI: 0.56, bloom: 0.45 },
      atardecer: { cenit: 0x5a2f4a, horizonte: 0xff5a28, sol: 0xff6a30, solI: 4.83, niebla: 0xb8573a, nieblaD: 0.017, hemiC: 0x9a6a78, hemiS: 0x4a2418, hemiI: 0.51, exp: 1.0, envI: 0.50, bloom: 0.75 },
      noche: { cenit: 0x0f1224, horizonte: 0x3a2e3c, sol: 0x90a2e0, solI: 1.3, niebla: 0x3c3140, nieblaD: 0.019, hemiC: 0x40497a, hemiS: 0x20161a, hemiI: 0.95, exp: 1.3, envI: 0.6, bloom: 0.85 },
    },
    luna: { color: 0x90a2e0, intensidad: 1.5 },
    estrellas: 0.8,
    nubes: { cobertura: 0.3, claro: 0xffd9b0, oscuro: 0x6a4a50, velocidad: 0.006 },
    grade: { sombras: [0.9, 0.94, 1.02], luces: [1.1, 0.99, 0.82], sat: 1.04, contraste: 1.13 },
    post: { umbral: 1.0, vineta: 0.45, grano: 0.04, aberracion: 0.0018, ao: 0.8, aoRadio: 1.0 },
    clima: { tipo: 'polvo', cantidad: 0.9 },
  },
  // ───────────────────────────── 2 · Era de las Trincheras: verdes y marrones desaturados, lluvia, gas amarillento
  {
    idx: 2, id: 'trincheras', nombre: 'Trincheras',
    claves: {
      amanecer: { cenit: 0x58625c, horizonte: 0xa49a78, sol: 0xe6dcb4, solI: 2.53, niebla: 0x8f9272, nieblaD: 0.026, hemiC: 0x8c9a8e, hemiS: 0x50472f, hemiI: 0.60, exp: 1.05, envI: 0.50, bloom: 0.5 },
      mediodia: { cenit: 0x66726a, horizonte: 0x9aa58c, sol: 0xf0efd8, solI: 3.10, niebla: 0x86917a, nieblaD: 0.022, hemiC: 0x9fae9e, hemiS: 0x55503a, hemiI: 0.66, exp: 1.0, envI: 0.56, bloom: 0.4 },
      atardecer: { cenit: 0x4a4a42, horizonte: 0xb08a52, sol: 0xffc880, solI: 2.76, niebla: 0x8a7a54, nieblaD: 0.026, hemiC: 0x8a8a78, hemiS: 0x45381f, hemiI: 0.57, exp: 1.05, envI: 0.46, bloom: 0.55 },
      noche: { cenit: 0x0c120f, horizonte: 0x25302a, sol: 0x9fb4c8, solI: 1.2, niebla: 0x2d3a32, nieblaD: 0.028, hemiC: 0x3d5249, hemiS: 0x1a1d14, hemiI: 1.0, exp: 1.35, envI: 0.6, bloom: 0.8 },
    },
    luna: { color: 0x9fb4c8, intensidad: 1.35 },
    estrellas: 0.25,
    nubes: { cobertura: 0.95, claro: 0xb4baa4, oscuro: 0x474e48, velocidad: 0.009 },
    grade: { sombras: [0.92, 1.0, 0.93], luces: [1.03, 1.03, 0.88], sat: 0.62, contraste: 1.12 },
    post: { umbral: 1.0, vineta: 0.55, grano: 0.06, aberracion: 0.0014, ao: 0.85, aoRadio: 1.1 },
    clima: { tipo: 'lluvia', cantidad: 0.85 },
    relampagos: true,
  },
  // ───────────────────────────── 3 · Era Atómica: neón rosa y turquesa sobre asfalto mojado, noche azul
  {
    idx: 3, id: 'atomica', nombre: 'Atómica',
    claves: {
      amanecer: { cenit: 0x3a5fa0, horizonte: 0xff9db8, sol: 0xffd0c0, solI: 3.79, niebla: 0xb69ab8, nieblaD: 0.015, hemiC: 0x8aa0d0, hemiS: 0x50384a, hemiI: 0.57, exp: 1.0, envI: 0.53, bloom: 0.65 },
      mediodia: { cenit: 0x3a8fd8, horizonte: 0xbfe6ef, sol: 0xfff6e6, solI: 5.06, niebla: 0xb4d4dc, nieblaD: 0.011, hemiC: 0xa8caf0, hemiS: 0x5a5260, hemiI: 0.63, exp: 0.95, envI: 0.62, bloom: 0.5 },
      atardecer: { cenit: 0x5a2d86, horizonte: 0xff6a9a, sol: 0xff8a7a, solI: 4.25, niebla: 0xa65a86, nieblaD: 0.015, hemiC: 0x9a78c0, hemiS: 0x40204a, hemiI: 0.54, exp: 1.0, envI: 0.53, bloom: 0.8 },
      noche: { cenit: 0x070a2a, horizonte: 0x1d2c6c, sol: 0x7a9cff, solI: 1.4, niebla: 0x1c2a60, nieblaD: 0.019, hemiC: 0x3550b4, hemiS: 0x1c1034, hemiI: 1.1, exp: 1.4, envI: 0.7, bloom: 1.05 },
    },
    luna: { color: 0x7a9cff, intensidad: 1.75 },
    estrellas: 0.9,
    nubes: { cobertura: 0.3, claro: 0xffc8e0, oscuro: 0x3d3a78, velocidad: 0.005 },
    grade: { sombras: [0.9, 0.97, 1.14], luces: [1.05, 0.99, 1.06], sat: 1.2, contraste: 1.15 },
    post: { umbral: 0.9, vineta: 0.45, grano: 0.035, aberracion: 0.002, ao: 0.8, aoRadio: 1.0 },
    clima: { tipo: 'neon', cantidad: 0.7 },
  },
  // ───────────────────────────── 4 · Era Digital: azul clínico frío, rojo de emergencia, cristal
  {
    idx: 4, id: 'digital', nombre: 'Digital',
    claves: {
      amanecer: { cenit: 0x5c7ea3, horizonte: 0xd1d8e2, sol: 0xe8f0ff, solI: 3.56, niebla: 0xa4b2c2, nieblaD: 0.016, hemiC: 0x94aacc, hemiS: 0x40464e, hemiI: 0.60, exp: 1.0, envI: 0.53, bloom: 0.5 },
      mediodia: { cenit: 0x4f8bc4, horizonte: 0xcfe0ee, sol: 0xf4f8ff, solI: 4.83, niebla: 0xb8c8d6, nieblaD: 0.012, hemiC: 0xa9c6e6, hemiS: 0x4e545a, hemiI: 0.63, exp: 0.95, envI: 0.62, bloom: 0.4 },
      atardecer: { cenit: 0x3a4a70, horizonte: 0xd58a7a, sol: 0xffa088, solI: 3.56, niebla: 0x8a7a88, nieblaD: 0.017, hemiC: 0x8090b8, hemiS: 0x3e3238, hemiI: 0.54, exp: 1.0, envI: 0.50, bloom: 0.6 },
      noche: { cenit: 0x060b18, horizonte: 0x14243c, sol: 0x8fb8ff, solI: 1.3, niebla: 0x1a2a40, nieblaD: 0.019, hemiC: 0x3a5a8c, hemiS: 0x141a24, hemiI: 1.05, exp: 1.35, envI: 0.65, bloom: 0.9 },
    },
    luna: { color: 0x8fb8ff, intensidad: 1.6 },
    estrellas: 0.55,
    nubes: { cobertura: 0.55, claro: 0xc8d0da, oscuro: 0x4a5260, velocidad: 0.007 },
    grade: { sombras: [0.9, 0.99, 1.1], luces: [0.98, 1.02, 1.07], sat: 0.76, contraste: 1.14 },
    post: { umbral: 1.0, vineta: 0.5, grano: 0.045, aberracion: 0.0018, ao: 0.85, aoRadio: 1.1 },
    clima: { tipo: 'ceniza', cantidad: 0.9 },
  },
  // ───────────────────────────── 5 · Era Sintética: magenta y cian, hologramas, lluvia luminosa, negro brillante
  {
    idx: 5, id: 'sintetica', nombre: 'Sintética',
    claves: {
      amanecer: { cenit: 0x2a2468, horizonte: 0xff6ad0, sol: 0xffa8e4, solI: 3.33, niebla: 0x6a3a8c, nieblaD: 0.019, hemiC: 0x8a70d0, hemiS: 0x1c1a44, hemiI: 0.60, exp: 1.05, envI: 0.56, bloom: 0.8 },
      mediodia: { cenit: 0x3d5fc2, horizonte: 0xcc8cf0, sol: 0xf0e8ff, solI: 4.25, niebla: 0x8a8ad0, nieblaD: 0.015, hemiC: 0x9cb0f0, hemiS: 0x2c3068, hemiI: 0.63, exp: 1.0, envI: 0.62, bloom: 0.65 },
      atardecer: { cenit: 0x1e1054, horizonte: 0xff3fb0, sol: 0xff70c8, solI: 3.79, niebla: 0x7a2a8a, nieblaD: 0.018, hemiC: 0x9060d8, hemiS: 0x24104a, hemiI: 0.57, exp: 1.05, envI: 0.56, bloom: 0.95 },
      noche: { cenit: 0x050314, horizonte: 0x2a0e4a, sol: 0x78d8ff, solI: 1.4, niebla: 0x1a1048, nieblaD: 0.02, hemiC: 0x4a3cb0, hemiS: 0x0e1c30, hemiI: 1.1, exp: 1.4, envI: 0.75, bloom: 1.2 },
    },
    luna: { color: 0x78d8ff, intensidad: 1.7 },
    estrellas: 0.7,
    nubes: { cobertura: 0.45, claro: 0xff9ae8, oscuro: 0x2a1c60, velocidad: 0.01 },
    grade: { sombras: [0.88, 0.96, 1.16], luces: [1.1, 0.98, 1.12], sat: 1.26, contraste: 1.18 },
    post: { umbral: 0.85, vineta: 0.5, grano: 0.03, aberracion: 0.0028, ao: 0.78, aoRadio: 1.0 },
    clima: { tipo: 'luminosa', cantidad: 0.85 },
  },
];

const _c = (hex) => new THREE.Color(hex);

/** Convierte los hex en THREE.Color (lineal) una sola vez. */
function preparar(def) {
  const claves = CLAVES.map((k) => {
    const o = def.claves[k], r = {};
    for (const n in o) r[n] = typeof o[n] === 'number' && ['cenit', 'horizonte', 'sol', 'niebla', 'hemiC', 'hemiS'].includes(n) ? _c(o[n]) : o[n];
    return r;
  });
  return {
    ...def, claveLista: claves,
    luna: { color: _c(def.luna.color), intensidad: def.luna.intensidad },
    nubes: { ...def.nubes, claro: _c(def.nubes.claro), oscuro: _c(def.nubes.oscuro) },
  };
}

export const AMBIENTES = AMBIENTES_DEF.map(preparar);

/** Estado atmosférico muestreado (todos los campos son numéricos o THREE.Color; se reutiliza sin asignar memoria). */
export function crearEstadoAtmosfera() {
  return {
    cenit: new THREE.Color(), horizonte: new THREE.Color(), sol: new THREE.Color(), niebla: new THREE.Color(),
    hemiC: new THREE.Color(), hemiS: new THREE.Color(), luna: new THREE.Color(),
    nubeClaro: new THREE.Color(), nubeOscuro: new THREE.Color(),
    sombras: new THREE.Color(), luces: new THREE.Color(),
    solI: 3, nieblaD: 0.015, hemiI: 1, exp: 1, envI: 0.8, bloom: 0.5, lunaI: 1.5,
    sat: 1, contraste: 1, umbral: 1, vineta: 0.4, grano: 0.03, aberracion: 0.0015, ao: 0.8, aoRadio: 1, estrellas: 1, nubes: 0.4, nubesVel: 0.005,
  };
}

const sua = (t) => t * t * (3 - 2 * t);
const COLORES = ['cenit', 'horizonte', 'sol', 'niebla', 'hemiC', 'hemiS'];
const NUMEROS = ['solI', 'nieblaD', 'hemiI', 'exp', 'envI', 'bloom'];

/** Rellena `e` con la atmósfera de la era `eraIdx` a la hora `hora` (0..1 cíclica). */
export function muestrearAtmosfera(eraIdx, hora, e) {
  const A = AMBIENTES[Math.max(0, Math.min(AMBIENTES.length - 1, eraIdx | 0))];
  const h = (((hora % 1) + 1) % 1) * 4;
  const i = Math.floor(h) % 4, j = (i + 1) % 4, t = sua(h - Math.floor(h));
  const a = A.claveLista[i], b = A.claveLista[j];
  for (const n of COLORES) e[n].copy(a[n]).lerp(b[n], t);
  for (const n of NUMEROS) e[n] = a[n] + (b[n] - a[n]) * t;
  e.luna.copy(A.luna.color); e.lunaI = A.luna.intensidad;
  e.nubeClaro.copy(A.nubes.claro); e.nubeOscuro.copy(A.nubes.oscuro); e.nubes = A.nubes.cobertura; e.nubesVel = A.nubes.velocidad;
  e.sombras.setRGB(A.grade.sombras[0], A.grade.sombras[1], A.grade.sombras[2], THREE.LinearSRGBColorSpace);
  e.luces.setRGB(A.grade.luces[0], A.grade.luces[1], A.grade.luces[2], THREE.LinearSRGBColorSpace);
  e.sat = A.grade.sat; e.contraste = A.grade.contraste;
  const p = A.post;
  e.umbral = p.umbral; e.vineta = p.vineta; e.grano = p.grano; e.aberracion = p.aberracion; e.ao = p.ao; e.aoRadio = p.aoRadio;
  e.estrellas = A.estrellas;
  return A;
}

/** Copia (en sitio) `destino ← destino + (objetivo - destino)·f` para todos los campos del estado. */
export function acercarAtmosfera(destino, objetivo, f) {
  for (const k in destino) {
    const v = destino[k];
    if (v && v.isColor) v.lerp(objetivo[k], f);
    else if (typeof v === 'number') destino[k] = v + (objetivo[k] - v) * f;
  }
}
export function copiarAtmosfera(destino, objetivo) {
  for (const k in destino) {
    const v = destino[k];
    if (v && v.isColor) v.copy(objetivo[k]); else if (typeof v === 'number') destino[k] = objetivo[k];
  }
}
