// Modelos procedurales del módulo Mundo: explosivos, cajas, empujables, recogidas y barricadas por era.
// Todos miran a +Z, apoyan en y = 0 y se construyen con `Ensamble` (geometría fusionada por material, UV en metros).
// Los materiales de la biblioteca se generan al primer uso; las funciones se llaman a través de `modeloCacheado`.
import * as THREE from 'three';
import { Ensamble, mat, matSimple, matMadera, matMetal, matEmisivo, cajaRedondeada } from './util.js';

const PI = Math.PI;
const trio = (n, f = 0) => Array.from({ length: n }, (_, i) => f + (i / n) * 2 * PI);

// ───────────────────────────── utilidades de ensamble ─────────────────────────────
/** Cruz de primeros auxilios en las dos caras ±Z de un panel. */
function cruzMedica(e, material, x, y, z, tam, caraZ = 1) {
  e.caja(material, [tam, tam * 0.3, 0.012], [x, y, z * caraZ], { radio: 0.004 });
  e.caja(material, [tam * 0.3, tam, 0.012], [x, y, z * caraZ], { radio: 0.004 });
}
function remaches(e, material, puntos, r = 0.012, eje = 'z', fuera = 0.0) {
  for (const p of puntos) e.esf(material, r, p, { seg: 6 });
}
/** Tablones horizontales apilados formando un cuerpo hueco de caja (w × h × d). */
function cajaDeTablas(e, mTabla, mMarco, w, h, d, n = 4) {
  const th = h / n;
  for (let i = 0; i < n; i++) {
    const y = th * (i + 0.5) + 0.04;
    const f = 0.985 + ((i * 37) % 7) * 0.003;
    e.caja(mTabla, [w * f, th * 0.92, d * f], [0, y, 0], { radio: 0.008 });
  }
  const px = w / 2 - 0.03, pz = d / 2 - 0.03;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) e.caja(mMarco, [0.07, h + 0.02, 0.07], [sx * px, h / 2 + 0.04, sz * pz], { radio: 0.01 });
}

// ───────────────────────────── Explosivos ─────────────────────────────
export function barrilPolvora() {
  const e = new Ensamble();
  const madera = matMadera('oscura'), hierro = matMetal('forjado'), rojo = matSimple(0x8c1f17, { rugosidad: 0.55 }), laton = matMetal('laton');
  // cuerpo facetado (duelas): 14 caras planas con panza
  const P = [[0, 0.0], [0.3, 0.0], [0.345, 0.07], [0.40, 0.25], [0.43, 0.46], [0.40, 0.67], [0.345, 0.85], [0.3, 0.92], [0.28, 0.9], [0, 0.9]];
  e.perfil(madera, P, [0, 0.03, 0], { seg: 14, plano: true });
  // aros de hierro
  for (const [y, r] of [[0.1, 0.345], [0.28, 0.408], [0.64, 0.408], [0.84, 0.35]]) e.toro(hierro, r + 0.004, 0.017, [0, y + 0.03, 0], { seg: 24, seg2: 6 });
  // banda roja de aviso y tapa con tapón
  e.cil(rojo, 0.432, 0.1, [0, 0.52, 0], { seg: 14, r2: 0.432 });
  e.cil(madera, 0.28, 0.02, [0, 0.93, 0], { seg: 16 });
  e.cil(laton, 0.055, 0.03, [0.1, 0.955, 0.05], { seg: 10 });
  e.cil(hierro, 0.045, 0.012, [0.1, 0.975, 0.05], { seg: 8 });
  // asas de cuerda
  for (const s of [-1, 1]) e.toro(matSimple(0xb89a68, { rugosidad: 0.9 }), 0.07, 0.014, [s * 0.14, 0.97, -0.1], { rot: [0, 0, 0], seg: 10, seg2: 5 });
  return e.construir('barril_polvora');
}

export function cajaDinamita() {
  const e = new Ensamble();
  const tabla = matMadera('tablones'), marco = matMadera('vieja'), hierro = matMetal('forjado');
  const rojo = matSimple(0xb3261e, { rugosidad: 0.7 }), cuerda = matSimple(0xc2a874, { rugosidad: 0.95 }), negro = matSimple(0x16120f, { rugosidad: 0.8 });
  cajaDeTablas(e, tabla, marco, 0.68, 0.34, 0.46, 3);
  // aspas de refuerzo en las caras laterales
  for (const s of [-1, 1]) {
    e.caja(marco, [0.74, 0.05, 0.022], [0, 0.21, s * 0.232], { rot: [0, 0, 0.5], radio: 0.006 });
    e.caja(marco, [0.74, 0.05, 0.022], [0, 0.21, s * 0.232], { rot: [0, 0, -0.5], radio: 0.006 });
  }
  // tapa entreabierta y cartuchos
  e.caja(tabla, [0.7, 0.03, 0.2], [0.0, 0.405, 0.15], { rot: [0.1, 0, 0] });
  for (let f = 0; f < 3; f++) for (let c = 0; c < 6; c++) {
    const x = -0.26 + c * 0.104, z = -0.12 + f * 0.1;
    e.cil(rojo, 0.04, 0.4, [x, 0.4, z], { rot: [0, 0, 0], seg: 10 });
    e.cil(negro, 0.041, 0.012, [x, 0.6, z], { seg: 10 });
  }
  // mecha que asoma
  e.cil(cuerda, 0.012, 0.16, [0.14, 0.7, 0.0], { rot: [0.2, 0, -0.25], seg: 5 });
  // cintas de hierro y remaches
  for (const x of [-0.28, 0.28]) e.caja(hierro, [0.04, 0.36, 0.48], [x, 0.21, 0], { radio: 0.004 });
  // etiqueta de peligro
  e.caja(matSimple(0xe9e2c8, { rugosidad: 0.9 }), [0.3, 0.14, 0.008], [0, 0.22, 0.235], { radio: 0.002 });
  e.caja(rojo, [0.22, 0.03, 0.01], [0, 0.22, 0.238], { radio: 0.002 });
  return e.construir('caja_dinamita');
}

export function bidonCombustible() {
  const e = new Ensamble();
  const pintura = matMetal('pintado', { color: 0xa52f1f, desgaste: 0.7 }), acero = matMetal('forjado'), laton = matMetal('laton');
  const peligro = mat('rayas_peligro', {}, 0xe8c020);
  e.perfil(pintura, [[0, 0], [0.265, 0], [0.29, 0.04], [0.29, 0.82], [0.265, 0.86], [0, 0.86]], [0, 0.02, 0], { seg: 22 });
  for (const y of [0.22, 0.62]) e.toro(pintura, 0.292, 0.022, [0, y + 0.02, 0], { seg: 28, seg2: 6 });
  e.cil(peligro, 0.294, 0.13, [0, 0.43, 0], { seg: 28 });
  e.toro(acero, 0.29, 0.014, [0, 0.885, 0], { seg: 24, seg2: 5 });
  // tapones
  e.cil(laton, 0.05, 0.035, [0.13, 0.895, 0.07], { seg: 10 });
  e.cil(acero, 0.035, 0.03, [-0.12, 0.895, -0.08], { seg: 10 });
  e.toro(acero, 0.055, 0.008, [0.13, 0.91, 0.07], { seg: 12, seg2: 4 });
  return e.construir('bidon_combustible');
}

export function surtidorGasolina() {
  const e = new Ensamble();
  const roja = matMetal('pintado', { color: 0xc0302a, desgaste: 0.35 }), cromo = matMetal('cromo'), negro = matSimple(0x141414, { rugosidad: 0.5 });
  const blanca = matMetal('pintado', { color: 0xf0eadb, desgaste: 0.3 });
  const cristal = matSimple(0x1b2c34, { rugosidad: 0.1, metal: 0.3 });
  const neon = matEmisivo(0x41f0ff, 2.2);
  e.caja(negro, [0.62, 0.1, 0.46], [0, 0.05, 0], { radio: 0.02 });
  e.caja(roja, [0.5, 1.12, 0.36], [0, 0.66, 0], { radio: 0.06 });
  e.caja(blanca, [0.52, 0.22, 0.37], [0, 0.4, 0], { radio: 0.03 });
  e.caja(cromo, [0.54, 0.035, 0.39], [0, 0.78, 0], { radio: 0.012 });
  // cabezal: visor de cristal y esfera luminosa
  e.caja(cromo, [0.52, 0.34, 0.37], [0, 1.0, 0], { radio: 0.05 });
  e.caja(cristal, [0.4, 0.2, 0.01], [0, 1.0, 0.19], { radio: 0.01 });
  e.caja(cristal, [0.4, 0.2, 0.01], [0, 1.0, -0.19], { radio: 0.01 });
  for (const s of [-1, 1]) for (let i = 0; i < 4; i++) e.caja(neon, [0.045, 0.1, 0.012], [-0.14 + i * 0.095, 1.0, s * 0.196], { radio: 0.003 });
  e.cil(cromo, 0.13, 0.05, [0, 1.2, 0], { seg: 18 });
  e.esf(matSimple(0xeaf6ff, { rugosidad: 0.1, emisivo: 0x8fe8ff, emisivoInt: 1.1 }), 0.15, [0, 1.36, 0], { seg: 18 });
  // manguera y pistola
  e.toro(negro, 0.17, 0.018, [0.31, 0.45, 0.0], { rot: [0, PI / 2, 0], seg: 18, seg2: 6 });
  e.caja(cromo, [0.06, 0.22, 0.1], [-0.3, 0.7, 0.0], { radio: 0.02 });
  e.cil(cromo, 0.016, 0.22, [-0.3, 0.56, 0.1], { rot: [PI / 2, 0, 0], seg: 8 });
  return e.construir('surtidor_gasolina');
}

export function bombonaGas() {
  const e = new Ensamble();
  const cuerpo = matMetal('pintado', { color: 0xd75a1f, desgaste: 0.5 }), banda = matMetal('pintado', { color: 0xe9e4d4, desgaste: 0.4 });
  const laton = matMetal('laton'), acero = matMetal('acero'), negro = matSimple(0x161616, { rugosidad: 0.5 });
  e.perfil(cuerpo, [[0, 0], [0.17, 0], [0.2, 0.04], [0.205, 0.2], [0.205, 0.72], [0.19, 0.92], [0.15, 1.04], [0.09, 1.1], [0.06, 1.12], [0, 1.12]], [0, 0.07, 0], { seg: 22 });
  e.cil(banda, 0.209, 0.14, [0, 0.52, 0], { seg: 22 });
  e.cil(matSimple(0x1c1c1c), 0.21, 0.012, [0, 0.45, 0], { seg: 22 });
  // base anular y cuello con válvula
  e.toro(acero, 0.19, 0.025, [0, 0.075, 0], { seg: 22, seg2: 6 });
  e.cil(acero, 0.07, 0.07, [0, 1.22, 0], { seg: 12 });
  e.cil(laton, 0.045, 0.09, [0, 1.3, 0], { seg: 10 });
  e.caja(negro, [0.2, 0.025, 0.04], [0, 1.37, 0], { radio: 0.008 });
  e.cil(laton, 0.02, 0.07, [0.07, 1.3, 0], { rot: [0, 0, PI / 2], seg: 8 });
  // asas de protección
  for (const s of [-1, 1]) e.toro(acero, 0.14, 0.012, [0, 1.21, s * 0.01], { rot: [0, 0, 0], seg: 14, seg2: 4 });
  return e.construir('bombona_gas');
}

export function celulaPlasma() {
  const e = new Ensamble();
  const oscuro = mat('composite_futurista', { color: 0x35e6ff }, 0x1a1c24), gris = matSimple(0x23262e, { rugosidad: 0.3, metal: 0.8 });
  const cian = matEmisivo(0x38e8ff, 3.2), magenta = matEmisivo(0xff3fd0, 2.4);
  const vidrio = matSimple(0x9ff4ff, { rugosidad: 0.05, metal: 0.0, emisivo: 0x2ad7ff, emisivoInt: 0.7, transparente: true, opacidad: 0.38 });
  e.cil(oscuro, 0.3, 0.14, [0, 0.07, 0], { seg: 6 });
  e.cil(gris, 0.32, 0.04, [0, 0.16, 0], { seg: 6 });
  e.cil(oscuro, 0.3, 0.14, [0, 1.0, 0], { seg: 6 });
  e.cil(gris, 0.32, 0.04, [0, 0.9, 0], { seg: 6 });
  // columnas laterales
  for (const a of trio(6, PI / 6)) e.caja(gris, [0.05, 0.74, 0.05], [Math.sin(a) * 0.27, 0.53, Math.cos(a) * 0.27], { rot: [0, a, 0], radio: 0.01 });
  e.cil(vidrio, 0.22, 0.74, [0, 0.53, 0], { seg: 20 });
  e.esf(cian, 0.12, [0, 0.53, 0], { seg: 16 });
  e.esf(magenta, 0.07, [0, 0.53, 0], { seg: 12 });
  for (const y of [0.3, 0.76]) e.toro(cian, 0.23, 0.012, [0, y, 0], { seg: 24, seg2: 5 });
  for (const a of trio(6)) e.caja(magenta, [0.03, 0.03, 0.1], [Math.sin(a) * 0.255, 1.04, Math.cos(a) * 0.255], { rot: [0, a, 0], radio: 0.004 });
  return e.construir('celula_plasma');
}

// ───────────────────────────── Cajas (destructibles) ─────────────────────────────
export function cajaEra(eraIdx) {
  const e = new Ensamble();
  const hierro = matMetal('forjado');
  switch (eraIdx) {
    case 0: { // caja de madera con herrajes y aspas
      const tabla = matMadera('tablones'), marco = matMadera('vieja');
      cajaDeTablas(e, tabla, marco, 0.9, 0.82, 0.9, 5);
      for (const s of [-1, 1]) {
        e.caja(marco, [1.0, 0.07, 0.03], [0, 0.45, s * 0.455], { rot: [0, 0, 0.74], radio: 0.008 });
        e.caja(marco, [0.07, 0.9, 0.03], [0, 0.45, s * 0.455], { radio: 0.008 });
        e.caja(hierro, [0.94, 0.045, 0.02], [0, 0.18, s * 0.46], { radio: 0.004 });
        e.caja(hierro, [0.94, 0.045, 0.02], [0, 0.78, s * 0.46], { radio: 0.004 });
      }
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) e.caja(hierro, [0.1, 0.1, 0.1], [sx * 0.43, 0.09, sz * 0.43], { radio: 0.012 });
      break;
    }
    case 1: { // cajón de carga con letras pintadas y cinchas
      const tabla = matMadera('tablones'), marco = matMadera('vieja'), cinta = matSimple(0xc8bda4, { rugosidad: 0.9 });
      cajaDeTablas(e, tabla, marco, 0.95, 0.86, 0.75, 6);
      for (const x of [-0.3, 0.3]) e.caja(hierro, [0.05, 0.92, 0.79], [x, 0.47, 0], { radio: 0.006 });
      e.caja(cinta, [0.42, 0.2, 0.008], [0, 0.5, 0.384], { radio: 0.002 });
      e.caja(matSimple(0x8c2a1c, { rugosidad: 0.7 }), [0.3, 0.05, 0.01], [0, 0.5, 0.388], { radio: 0.002 });
      e.caja(matSimple(0x8c2a1c, { rugosidad: 0.7 }), [0.3, 0.05, 0.01], [0, 0.5, -0.388], { radio: 0.002 });
      for (const s of [-1, 1]) e.toro(matSimple(0xb8a070, { rugosidad: 0.9 }), 0.07, 0.012, [s * 0.485, 0.62, 0], { rot: [0, PI / 2, 0], seg: 10, seg2: 4 });
      break;
    }
    case 2: { // caja de suministros militar de acero verde oliva (tono medio claro: bajo la luz de trinchera debe leerse desde arriba)
      const pint = matMetal('pintado', { color: 0xa2ad74, desgaste: 0.5 }), borde = matMetal('pintado', { color: 0x6f7a4a, desgaste: 0.7 });
      const blanco = matSimple(0xe4dfc6, { rugosidad: 0.7 }), amar = matSimple(0xe0b82a, { rugosidad: 0.6 }), asa = matSimple(0x3a3d32, { rugosidad: 0.6, metal: 0.4 });
      e.caja(pint, [0.92, 0.7, 0.62], [0, 0.39, 0], { radio: 0.03 });
      e.caja(borde, [0.96, 0.05, 0.66], [0, 0.07, 0], { radio: 0.012 });
      e.caja(borde, [0.96, 0.04, 0.66], [0, 0.74, 0], { radio: 0.012 });
      for (const x of [-0.25, 0.25]) for (const s of [-1, 1]) e.caja(pint, [0.05, 0.64, 0.02], [x, 0.4, s * 0.32], { radio: 0.006 });
      for (const s of [-1, 1]) { e.caja(borde, [0.2, 0.05, 0.02], [s * 0.2, 0.62, 0.318], { radio: 0.006 }); e.toro(asa, 0.07, 0.01, [0, 0.55, s * 0.33], { rot: [0, 0, 0], seg: 12, seg2: 4 }); }
      e.caja(amar, [0.28, 0.1, 0.01], [-0.2, 0.42, 0.317], { radio: 0.002 });
      // tapa: rotulado en plantilla y franja de aviso, visibles desde la cámara cenital
      e.caja(blanco, [0.5, 0.012, 0.06], [-0.12, 0.764, 0.1], { radio: 0.002 });
      e.caja(blanco, [0.3, 0.012, 0.05], [-0.22, 0.764, -0.02], { radio: 0.002 });
      e.caja(amar, [0.08, 0.012, 0.5], [0.36, 0.764, 0], { radio: 0.002 });
      e.caja(asa, [0.34, 0.03, 0.05], [0, 0.78, -0.24], { radio: 0.012 });
      remaches(e, asa, [[-0.42, 0.765, 0.3], [0.42, 0.765, 0.3], [-0.42, 0.765, -0.3], [0.42, 0.765, -0.3]], 0.014);
      break;
    }
    case 3: { // caja de embalaje pintada de blanco con esquineros
      const pint = mat('tablas_pintadas', { color: 0xdad2b8 }, 0xd8cfb0), acero = matMetal('cromo');
      cajaDeTablas(e, pint, pint, 0.9, 0.8, 0.8, 4);
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) e.caja(acero, [0.1, 0.84, 0.1], [sx * 0.43, 0.46, sz * 0.38], { radio: 0.015 });
      e.caja(matSimple(0xc0302a, { rugosidad: 0.6 }), [0.4, 0.14, 0.01], [0, 0.55, 0.41], { radio: 0.003 });
      e.caja(matSimple(0xf4eee0, { rugosidad: 0.6 }), [0.3, 0.05, 0.012], [0, 0.55, 0.415], { radio: 0.002 });
      break;
    }
    case 4: { // maletín rígido de polímero gris pizarra con cierres amarillos
      const pol = matSimple(0x77828c, { rugosidad: 0.42, metal: 0.05 }), amar = matSimple(0xf0c01c, { rugosidad: 0.45 }), tapa = matSimple(0x8f9aa3, { rugosidad: 0.4, metal: 0.05 });
      e.caja(pol, [0.96, 0.7, 0.66], [0, 0.4, 0], { radio: 0.07, seg: 3 });
      e.caja(tapa, [1.0, 0.06, 0.7], [0, 0.42, 0], { radio: 0.02 });
      e.caja(tapa, [0.86, 0.02, 0.56], [0, 0.762, 0], { radio: 0.008 });
      e.caja(amar, [0.34, 0.012, 0.1], [0.2, 0.772, 0.14], { radio: 0.004 });   // etiqueta en la tapa
      e.caja(matSimple(0x25282b, { rugosidad: 0.6 }), [0.5, 0.012, 0.03], [0.2, 0.774, 0.14], { radio: 0.002 });
      for (const x of [-0.3, 0.0, 0.3]) e.caja(amar, [0.1, 0.12, 0.02], [x, 0.42, 0.335], { radio: 0.01 });
      for (const s of [-1, 1]) e.caja(matSimple(0x3a4047, { rugosidad: 0.5 }), [0.3, 0.06, 0.06], [0, 0.62, s * 0.34], { radio: 0.02 });
      for (const sx of [-1, 1]) e.caja(matSimple(0x3a4047, { rugosidad: 0.6 }), [0.1, 0.07, 0.7], [sx * 0.4, 0.04, 0], { radio: 0.02 });
      break;
    }
    default: { // contenedor de composite con rayas de energía
      const comp = matSimple(0xc2ccd8, { rugosidad: 0.3, metal: 0.25 }), cian = matEmisivo(0x38e8ff, 2.6);
      e.caja(comp, [0.94, 0.72, 0.7], [0, 0.4, 0], { radio: 0.06, seg: 3 });
      for (const s of [-1, 1]) {
        e.caja(cian, [0.7, 0.025, 0.012], [0, 0.52, s * 0.356], { radio: 0.003 });
        e.caja(cian, [0.7, 0.025, 0.012], [0, 0.3, s * 0.356], { radio: 0.003 });
        e.caja(cian, [0.012, 0.025, 0.4], [s * 0.476, 0.4, 0], { radio: 0.003 });
      }
      e.caja(matEmisivo(0xff3fd0, 2.2), [0.12, 0.04, 0.012], [0.3, 0.64, 0.357], { radio: 0.003 });
      e.caja(matSimple(0x16181e, { rugosidad: 0.3, metal: 0.8 }), [0.98, 0.05, 0.74], [0, 0.05, 0], { radio: 0.012 });
      // tapa: dos tiras de energía y un panel oscuro central, legibles desde arriba
      e.caja(matSimple(0x2b3340, { rugosidad: 0.35, metal: 0.5 }), [0.5, 0.012, 0.36], [-0.1, 0.766, 0], { radio: 0.004 });
      for (const s of [-1, 1]) e.caja(cian, [0.8, 0.014, 0.025], [0, 0.768, s * 0.24], { radio: 0.003 });
      e.caja(cian, [0.025, 0.014, 0.5], [0.36, 0.768, 0], { radio: 0.003 });
    }
  }
  return e.construir('caja_' + eraIdx);
}

// ───────────────────────────── Empujables ─────────────────────────────
export function empujableEra(eraIdx) {
  const e = new Ensamble();
  switch (eraIdx) {
    case 0: { // fardo de heno atado con cuerda
      const heno = mat('paja', {}, 0xc9a44a), cuerda = matSimple(0x7a5e34, { rugosidad: 0.95 });
      e.caja(heno, [0.95, 0.62, 0.62], [0, 0.33, 0], { radio: 0.14, seg: 3 });
      for (const x of [-0.26, 0.26]) e.caja(cuerda, [0.03, 0.66, 0.66], [x, 0.33, 0], { radio: 0.012 });
      break;
    }
    case 1: { // tonel de agua con tres aros
      const madera = matMadera('lacada'), hierro = matMetal('forjado');
      e.perfil(madera, [[0, 0], [0.34, 0], [0.4, 0.2], [0.44, 0.45], [0.4, 0.75], [0.34, 0.92], [0, 0.92]], [0, 0.03, 0], { seg: 14, plano: true });
      for (const [y, r] of [[0.1, 0.36], [0.3, 0.42], [0.66, 0.42], [0.86, 0.36]]) e.toro(hierro, r + 0.004, 0.018, [0, y + 0.03, 0], { seg: 24, seg2: 6 });
      e.cil(matSimple(0x3b6f86, { rugosidad: 0.1, metal: 0.2 }), 0.3, 0.01, [0, 0.93, 0], { seg: 18 });
      break;
    }
    case 2: { // pila de sacos de arena
      const saco = mat('saco_arena', {}, 0xb09a68);
      for (let i = 0; i < 3; i++) e.caja(saco, [0.62, 0.2, 0.34], [(i - 1) * 0.02, 0.12, (i - 1) * 0.24], { radio: 0.09, seg: 3, rot: [0, (i - 1) * 0.08, 0] });
      for (let i = 0; i < 2; i++) e.caja(saco, [0.62, 0.2, 0.34], [0.02, 0.32, (i - 0.5) * 0.28], { radio: 0.09, seg: 3, rot: [0, 0.05 - i * 0.07, 0] });
      e.caja(saco, [0.6, 0.2, 0.34], [0, 0.5, 0], { radio: 0.09, seg: 3, rot: [0, 0.12, 0] });
      break;
    }
    case 3: { // cubo de basura metálico con tapa
      const acero = matMetal('acero'), negro = matSimple(0x1a1a1a, { rugosidad: 0.6 });
      e.perfil(acero, [[0, 0], [0.26, 0], [0.3, 0.8], [0, 0.8]], [0, 0.02, 0], { seg: 22 });
      for (const y of [0.18, 0.42, 0.66]) e.toro(acero, 0.28 + y * 0.05, 0.012, [0, y, 0], { seg: 22, seg2: 5 });
      e.cil(acero, 0.32, 0.05, [0, 0.85, 0], { seg: 22, r2: 0.3 });
      e.esf(acero, 0.05, [0, 0.9, 0], { seg: 10 });
      for (const s of [-1, 1]) e.caja(negro, [0.03, 0.1, 0.05], [s * 0.3, 0.6, 0], { radio: 0.008 });
      break;
    }
    case 4: { // barrera de plástico bicolor
      const naranja = matSimple(0xe0651b, { rugosidad: 0.45 }), blanco = matSimple(0xece9e0, { rugosidad: 0.45 });
      e.caja(naranja, [1.1, 0.34, 0.4], [0, 0.17, 0], { radio: 0.08, seg: 3 });
      e.caja(blanco, [1.0, 0.18, 0.34], [0, 0.43, 0], { radio: 0.07, seg: 3 });
      e.caja(naranja, [0.92, 0.15, 0.3], [0, 0.6, 0], { radio: 0.07, seg: 3 });
      e.caja(matEmisivo(0xff7a1a, 1.0), [0.14, 0.05, 0.02], [0.35, 0.44, 0.17], { radio: 0.005 });
      e.caja(matEmisivo(0xff7a1a, 1.0), [0.14, 0.05, 0.02], [-0.35, 0.44, -0.17], { radio: 0.005 });
      break;
    }
    default: { // bloque holográfico de datos
      const comp = mat('composite_futurista', { color: 0xff3fd0 }, 0x1d1f27), mag = matEmisivo(0xff3fd0, 2.6);
      e.caja(comp, [0.7, 0.7, 0.7], [0, 0.36, 0], { radio: 0.07, seg: 3 });
      for (const a of [0, PI / 2]) e.caja(mag, [0.72, 0.03, 0.03], [0, 0.36, 0], { rot: [0, a, 0], radio: 0.004 });
      e.caja(mag, [0.03, 0.72, 0.03], [0, 0.36, 0], { radio: 0.004 });
      e.caja(matSimple(0x15161c, { metal: 0.8, rugosidad: 0.3 }), [0.76, 0.05, 0.76], [0, 0.03, 0], { radio: 0.01 });
    }
  }
  return e.construir('empujable_' + eraIdx);
}

// ───────────────────────────── Recogidas ─────────────────────────────
const CRUZ_ROJA = 0xd5261f;
export function botiquinEra(eraIdx) {
  const e = new Ensamble();
  const rojo = matSimple(CRUZ_ROJA, { rugosidad: 0.5 }), blanco = matSimple(0xf1ede2, { rugosidad: 0.55 });
  if (eraIdx <= 1) { // bolsa/maletín de cuero con correa y cruz
    const cuero = mat('cuero', { color: eraIdx ? 0x6e3f22 : 0x8a5430 }, 0x7a4a2a), laton = matMetal('laton'), tela = matSimple(0xd7cfb6, { rugosidad: 0.9 });
    e.caja(cuero, [0.5, 0.34, 0.26], [0, 0.17, 0], { radio: 0.07, seg: 3 });
    e.caja(cuero, [0.5, 0.08, 0.28], [0, 0.36, 0], { radio: 0.04 });
    e.caja(tela, [0.2, 0.2, 0.012], [0, 0.18, 0.136], { radio: 0.004 });
    cruzMedica(e, rojo, 0, 0.18, 0.143, 0.16, 1);
    e.caja(tela, [0.2, 0.2, 0.012], [0, 0.18, -0.136], { radio: 0.004 });
    cruzMedica(e, rojo, 0, 0.18, 0.143, 0.16, -1);
    e.caja(laton, [0.07, 0.06, 0.02], [0, 0.35, 0.146], { radio: 0.008 });
    for (const sx of [-1, 1]) e.caja(laton, [0.03, 0.4, 0.28], [sx * 0.2, 0.19, 0], { radio: 0.004 });
    e.toro(cuero, 0.12, 0.014, [0, 0.4, 0], { rot: [0, 0, 0], seg: 16, seg2: 5, esc: [1, 0.9, 1] });
  } else if (eraIdx <= 3) { // maletín metálico con cruz
    const metal = eraIdx === 2 ? matMetal('pintado', { color: 0x6a7448, desgaste: 0.7 }) : matMetal('pintado', { color: 0xe9e6dc, desgaste: 0.35 }), cromo = matMetal('cromo');
    e.caja(metal, [0.54, 0.36, 0.22], [0, 0.2, 0], { radio: 0.05, seg: 3 });
    e.caja(cromo, [0.56, 0.02, 0.24], [0, 0.205, 0], { radio: 0.006 });
    e.caja(blanco, [0.26, 0.26, 0.012], [0, 0.22, 0.116], { radio: 0.004 }); e.caja(blanco, [0.26, 0.26, 0.012], [0, 0.22, -0.116], { radio: 0.004 });
    cruzMedica(e, rojo, 0, 0.22, 0.123, 0.2, 1); cruzMedica(e, rojo, 0, 0.22, 0.123, 0.2, -1);
    for (const x of [-0.16, 0.16]) e.caja(cromo, [0.05, 0.05, 0.03], [x, 0.2, 0.118], { radio: 0.008 });
    e.caja(matSimple(0x222222), [0.22, 0.04, 0.05], [0, 0.4, 0], { radio: 0.015 });
  } else { // inyector de nanomedicina: cápsula luminosa
    const cian = matEmisivo(eraIdx === 4 ? 0x3dff90 : 0x38e8ff, 3), cuerpo = matSimple(0xe8edf0, { rugosidad: 0.25, metal: 0.3 }), oscuro = matSimple(0x20252b, { rugosidad: 0.3, metal: 0.8 });
    const vidrio = matSimple(0xaaf8ff, { rugosidad: 0.05, emisivo: eraIdx === 4 ? 0x3dff90 : 0x38e8ff, emisivoInt: 0.8, transparente: true, opacidad: 0.5 });
    e.caja(oscuro, [0.54, 0.09, 0.24], [0, 0.045, 0], { radio: 0.03 });
    e.cil(cuerpo, 0.075, 0.4, [0, 0.27, 0], { rot: [0, 0, PI / 2], seg: 16 });
    e.cil(vidrio, 0.06, 0.26, [0, 0.27, 0.0], { rot: [0, 0, PI / 2], seg: 16 });
    e.cil(cian, 0.04, 0.2, [0, 0.27, 0.0], { rot: [0, 0, PI / 2], seg: 12 });
    e.cil(oscuro, 0.02, 0.18, [0.28, 0.27, 0], { rot: [0, 0, PI / 2], seg: 8, r2: 0.004 });
    e.esf(cuerpo, 0.075, [-0.2, 0.27, 0], { seg: 12 });
    cruzMedica(e, rojo, 0, 0.27, 0.078, 0.07, 1); cruzMedica(e, rojo, 0, 0.27, 0.078, 0.07, -1);
  }
  return e.construir('botiquin_' + eraIdx);
}

export function municionEra(eraIdx) {
  const e = new Ensamble();
  const roja = matMetal('pintado', { color: 0xc42a1c, desgaste: 0.45 }), laton = matMetal('laton'), blanco = matSimple(0xf1ede2, { rugosidad: 0.6 });
  const hierro = matMetal('forjado'), plomo = matSimple(0x8a8a90, { rugosidad: 0.35, metal: 0.8 });
  const bala = (x, z, h = 0.18) => { e.cil(laton, 0.03, h, [x, 0.4 + h / 2 - 0.02, z], { seg: 8 }); e.cil(plomo, 0.03, 0.05, [x, 0.4 + h, z], { seg: 8, r2: 0.012 }); };
  if (eraIdx === 0) { // caja roja de madera con cuerda y cartuchos
    const madera = matSimple(0xa32b1e, { rugosidad: 0.8 }), cuerda = matSimple(0xc2a874, { rugosidad: 0.95 }), tabla = matMadera('vieja');
    e.caja(madera, [0.5, 0.3, 0.32], [0, 0.17, 0], { radio: 0.03 });
    for (const x of [-0.17, 0.17]) e.caja(hierro, [0.035, 0.32, 0.34], [x, 0.17, 0], { radio: 0.004 });
    e.caja(tabla, [0.5, 0.03, 0.32], [0, 0.33, 0], { radio: 0.006 });
    for (const s of [-1, 1]) e.toro(cuerda, 0.08, 0.012, [0, 0.34, s * 0.0], { rot: [0, 0, 0], seg: 10, seg2: 4, esc: [1, 1, 1] });
    for (let i = 0; i < 3; i++) bala(-0.1 + i * 0.1, 0.0);
  } else if (eraIdx === 1) { // caja roja con bandas de latón
    e.caja(roja, [0.52, 0.3, 0.34], [0, 0.17, 0], { radio: 0.035 });
    for (const x of [-0.17, 0.17]) e.caja(laton, [0.04, 0.32, 0.36], [x, 0.17, 0], { radio: 0.005 });
    e.caja(laton, [0.1, 0.07, 0.02], [0, 0.26, 0.178], { radio: 0.006 });
    for (let i = 0; i < 4; i++) bala(-0.15 + i * 0.1, 0.0);
  } else if (eraIdx === 2) { // caja de munición de acero rojo con asa
    e.caja(roja, [0.5, 0.28, 0.3], [0, 0.16, 0], { radio: 0.03 });
    e.caja(hierro, [0.52, 0.03, 0.32], [0, 0.3, 0], { radio: 0.008 });
    e.toro(hierro, 0.08, 0.012, [0, 0.35, 0], { rot: [0, 0, 0], seg: 12, seg2: 5, esc: [1, 0.6, 1] });
    e.caja(blanco, [0.2, 0.08, 0.012], [0, 0.17, 0.152], { radio: 0.004 });
    for (let i = 0; i < 4; i++) bala(-0.15 + i * 0.1, 0.0, 0.14);
  } else if (eraIdx === 3) { // caja cromada con cinta roja y balas
    const cromo = matMetal('cromo');
    e.caja(roja, [0.52, 0.28, 0.3], [0, 0.16, 0], { radio: 0.04 });
    e.caja(cromo, [0.54, 0.035, 0.32], [0, 0.3, 0], { radio: 0.01 });
    e.caja(blanco, [0.22, 0.09, 0.012], [0, 0.17, 0.152], { radio: 0.004 });
    for (let i = 0; i < 5; i++) bala(-0.18 + i * 0.09, 0.0, 0.16);
  } else if (eraIdx === 4) { // caja de polímero rojo táctica
    const pol = matSimple(0xc2261d, { rugosidad: 0.42 }), negro = matSimple(0x1b1c1e, { rugosidad: 0.5 });
    e.caja(pol, [0.52, 0.3, 0.32], [0, 0.17, 0], { radio: 0.06, seg: 3 });
    e.caja(negro, [0.54, 0.035, 0.34], [0, 0.31, 0], { radio: 0.012 });
    e.caja(blanco, [0.2, 0.08, 0.012], [0, 0.18, 0.162], { radio: 0.004 });
    for (let i = 0; i < 5; i++) bala(-0.18 + i * 0.09, 0.0, 0.16);
  } else { // caja roja con celdas de energía
    const pol = matSimple(0xc2261d, { rugosidad: 0.35, metal: 0.2 }), cian = matEmisivo(0x38e8ff, 3), negro = matSimple(0x16181e, { rugosidad: 0.3, metal: 0.8 });
    e.caja(pol, [0.52, 0.3, 0.32], [0, 0.17, 0], { radio: 0.06, seg: 3 });
    e.caja(negro, [0.54, 0.035, 0.34], [0, 0.31, 0], { radio: 0.012 });
    e.caja(cian, [0.3, 0.025, 0.012], [0, 0.19, 0.162], { radio: 0.003 });
    for (let i = 0; i < 4; i++) { e.cil(cian, 0.028, 0.17, [-0.15 + i * 0.1, 0.46, 0], { seg: 8 }); e.cil(negro, 0.032, 0.025, [-0.15 + i * 0.1, 0.36, 0], { seg: 8 }); }
  }
  return e.construir('municion_' + eraIdx);
}

function rayo(forma) {
  const pts = [[0.0, 0.5], [-0.2, -0.02], [-0.04, -0.02], [-0.12, -0.5], [0.2, 0.08], [0.04, 0.08], [0.14, 0.5]];
  forma.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) forma.lineTo(pts[i][0], pts[i][1]); forma.closePath();
  return forma;
}
export function potenciadorEra(eraIdx) {
  const e = new Ensamble();
  const tapa = [matMetal('laton'), matMetal('laton'), matMetal('forjado'), matMetal('cromo'), matMetal('acero'), matSimple(0x1a1c24, { rugosidad: 0.25, metal: 0.9 })][Math.max(0, Math.min(5, eraIdx))];
  const oro = matEmisivo(0xffc233, 3.2);
  const vidrio = matSimple(0xffe9a0, { rugosidad: 0.05, emisivo: 0xffa21f, emisivoInt: 0.55, transparente: true, opacidad: 0.4 });
  e.cil(tapa, 0.21, 0.06, [0, 0.03, 0], { seg: 20, r2: 0.24 });
  e.toro(tapa, 0.2, 0.025, [0, 0.07, 0], { seg: 22, seg2: 6 });
  e.esf(vidrio, 0.27, [0, 0.4, 0], { seg: 22 });
  e.toro(tapa, 0.26, 0.02, [0, 0.4, 0], { seg: 24, seg2: 6 });
  e.cil(tapa, 0.1, 0.05, [0, 0.69, 0], { seg: 14, r2: 0.07 });
  const bolt = new THREE.ExtrudeGeometry(rayo(new THREE.Shape()), { depth: 0.05, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.012, bevelSegments: 1 });
  bolt.translate(0, 0, -0.025);
  e.geo(oro, bolt, [0, 0.4, 0], { esc: [0.78, 0.78, 1] });
  return e.construir('potenciador_' + eraIdx);
}

// ───────────────────────────── Barricadas ─────────────────────────────
/**
 * Devuelve un Group cuyos hijos son segmentos (de izquierda a derecha en X) que la barricada oculta/hunde al degradarse.
 * userData: { ancho, fondo, alto, segmentos: Group[], energia: bool }
 */
export function barricadaEra(eraIdx) {
  const raiz = new THREE.Group(); raiz.name = 'barricada_' + eraIdx;
  const ancho = 3.0, N = eraIdx === 5 ? 3 : 4;
  const w = ancho / N;
  const segs = [];
  for (let i = 0; i < N; i++) {
    const e = new Ensamble();
    const cx = -ancho / 2 + w * (i + 0.5);
    const par = i % 2 === 0;
    switch (eraIdx) {
      case 0: { // carro con tablones: ruedas, caja de carga y tablones clavados en cruz
        const tabla = matMadera('vieja'), marco = matMadera('tablones'), hierro = matMetal('forjado');
        if (i === 0 || i === N - 1) { // ruedas laterales
          const s = i === 0 ? -1 : 1;
          e.cil(marco, 0.55, 0.1, [cx, 0.55, 0], { rot: [0, 0, PI / 2], seg: 20, r2: 0.55 });
          e.cil(hierro, 0.57, 0.04, [cx + s * 0.0, 0.55, 0], { rot: [0, 0, PI / 2], seg: 20 });
          for (const a of trio(6)) e.caja(marco, [0.08, 0.07, 1.0], [cx, 0.55, 0], { rot: [a, 0, 0], radio: 0.01 });
          e.cil(hierro, 0.09, 0.14, [cx, 0.55, 0], { rot: [0, 0, PI / 2], seg: 10 });
        }
        e.caja(tabla, [w * 0.98, 0.26, 0.2], [cx, 0.35 + (par ? 0 : 0.05), 0.16], { radio: 0.01, rot: [0, 0, (par ? 1 : -1) * 0.02] });
        e.caja(tabla, [w * 0.98, 0.26, 0.2], [cx, 0.72, -0.12], { radio: 0.01, rot: [0, 0, (par ? -1 : 1) * 0.04] });
        e.caja(marco, [w * 1.05, 0.14, 0.07], [cx, 0.52, 0.28], { rot: [0.0, 0.0, (par ? 0.5 : -0.5)], radio: 0.01 });
        e.caja(hierro, [0.2, 0.04, 0.2], [cx, 0.08, 0], { radio: 0.01 });
        break;
      }
      case 1: { // entablado con X de caballetes y barriles
        const tabla = matMadera('vieja'), marco = matMadera('tablones'), hierro = matMetal('oxidado');
        for (let k = 0; k < 4; k++) e.caja(tabla, [w * 0.97, 0.2, 0.1], [cx, 0.14 + k * 0.22, 0.04 + (k % 2) * 0.03], { radio: 0.008, rot: [0, 0, ((i + k) % 2 ? 1 : -1) * 0.015] });
        e.caja(marco, [0.12, 1.05, 0.14], [cx - w / 2 + 0.07, 0.52, -0.08], { radio: 0.01 });
        e.caja(marco, [0.12, 1.05, 0.14], [cx + w / 2 - 0.07, 0.52, -0.08], { radio: 0.01 });
        e.caja(marco, [w * 1.05, 0.12, 0.06], [cx, 0.52, 0.12], { rot: [0, 0, (par ? 0.62 : -0.62)], radio: 0.01 });
        for (const y of [0.2, 0.7]) e.caja(hierro, [w * 0.98, 0.04, 0.02], [cx, y, 0.1], { radio: 0.004 });
        break;
      }
      case 2: { // sacos terreros con alambrada
        const saco = mat('saco_arena', {}, 0xb09a68), alambre = matMetal('forjado');
        for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) {
          const off = (k % 2) * 0.18;
          e.caja(saco, [w * 0.62, 0.22, 0.34], [cx - w * 0.22 + j * w * 0.5 + off * 0.2, 0.13 + k * 0.2, 0.0], { radio: 0.09, seg: 3, rot: [0, ((i + j + k) % 3 - 1) * 0.06, 0] });
        }
        e.caja(saco, [w * 0.7, 0.22, 0.34], [cx, 0.74, 0], { radio: 0.09, seg: 3 });
        for (const a of [0, 1, 2]) e.toro(alambre, 0.17, 0.008, [cx - w * 0.3 + a * w * 0.3, 0.95, 0.0], { rot: [0, PI / 2, 0], seg: 12, seg2: 4 });
        e.cil(alambre, 0.015, 1.0, [cx - w / 2 + 0.03, 0.62, 0.25], { seg: 6 });
        break;
      }
      case 3: { // vallas New Jersey de hormigón rayado
        const horm = mat('hormigon', {}, 0x9a9a96), raya = matSimple(0xe8c020, { rugosidad: 0.6 });
        const perfil = [[-0.34, 0], [-0.27, 0.35], [-0.12, 0.62], [-0.1, 0.94], [0.1, 0.94], [0.12, 0.62], [0.27, 0.35], [0.34, 0]];
        const shape = new THREE.Shape(); shape.moveTo(perfil[0][0], perfil[0][1]); for (let k = 1; k < perfil.length; k++) shape.lineTo(perfil[k][0], perfil[k][1]); shape.closePath();
        const g = new THREE.ExtrudeGeometry(shape, { depth: w * 0.94, bevelEnabled: true, bevelThickness: 0.025, bevelSize: 0.025, bevelSegments: 2 });
        g.translate(0, 0, -w * 0.47); g.rotateY(PI / 2);
        e.geo(horm, g, [cx, 0, 0], {});
        e.caja(raya, [w * 0.9, 0.12, 0.22], [cx, 0.8, 0], { radio: 0.01 });
        e.caja(matSimple(0x1a1a1a, { rugosidad: 0.7 }), [w * 0.3, 0.12, 0.225], [cx + (par ? -0.2 : 0.2), 0.8, 0.0], { radio: 0.01 });
        break;
      }
      case 4: { // vallas prefabricadas con alambre de concertina y luz de emergencia
        const horm = mat('hormigon_bunker', {}, 0x8f9390), alam = matMetal('acero'), rojo = matEmisivo(0xff2a1a, 2.6);
        e.caja(horm, [w * 0.94, 0.82, 0.5], [cx, 0.41, 0], { radio: 0.04, seg: 2 });
        e.caja(matSimple(0x2a2d30, { rugosidad: 0.5, metal: 0.4 }), [w * 0.94, 0.06, 0.52], [cx, 0.84, 0], { radio: 0.01 });
        for (let k = 0; k < 4; k++) e.toro(alam, 0.17, 0.008, [cx - w * 0.36 + k * w * 0.24, 1.02, 0], { rot: [0, PI / 2, 0], seg: 12, seg2: 4 });
        e.caja(rojo, [0.1, 0.04, 0.02], [cx, 0.58, 0.255], { radio: 0.004 });
        e.caja(matSimple(0xd8c25a, { rugosidad: 0.5 }), [w * 0.5, 0.06, 0.012], [cx, 0.3, 0.256], { radio: 0.003 });
        break;
      }
      default: { // barrera de energía: pilones con emisor y panel de plasma
        const comp = mat('composite_futurista', { color: 0x35e6ff }, 0x1d1f27), cian = matEmisivo(0x38e8ff, 3.4);
        const pilones = [];
        if (i === 0) pilones.push(cx - (w / 2 - 0.14));
        if (i === N - 1) pilones.push(cx + (w / 2 - 0.14));
        for (const px of pilones) {
          e.cil(comp, 0.16, 0.9, [px, 0.45, 0], { seg: 6, r2: 0.12 });
          e.esf(cian, 0.08, [px, 0.96, 0], { seg: 10 });
          e.toro(cian, 0.15, 0.012, [px, 0.35, 0], { seg: 12, seg2: 4 });
        }
        e.caja(matSimple(0x16181e, { rugosidad: 0.3, metal: 0.8 }), [w * 0.98, 0.05, 0.3], [cx, 0.03, 0], { radio: 0.01 });
        e.caja(cian, [w * 0.98, 0.02, 0.02], [cx, 0.08, 0.12], { radio: 0.002 });
        e.caja(cian, [w * 0.98, 0.02, 0.02], [cx, 0.08, -0.12], { radio: 0.002 });
      }
    }
    const g = e.construir('seg' + i);
    g.userData.cx = cx;
    raiz.add(g); segs.push(g);
  }
  if (eraIdx === 5) { // panel de energía (traslúcido, aditivo)
    const m = new THREE.MeshBasicMaterial({ color: 0x38e8ff, transparent: true, opacity: 0.34, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
    const p = new THREE.Mesh(new THREE.PlaneGeometry(ancho - 0.35, 0.95, 1, 1), m);
    p.position.y = 0.52; p.name = 'panelEnergia'; p.userData.geoPropia = true;
    raiz.add(p);
    raiz.userData.panel = p;
  }
  raiz.userData = { ...raiz.userData, ancho, fondo: eraIdx === 3 ? 0.7 : eraIdx === 4 ? 0.55 : 0.5, alto: eraIdx === 2 ? 0.9 : 1.0, segmentos: segs, energia: eraIdx === 5 };
  return raiz;
}
