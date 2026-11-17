// Recetas de efectos: cada una lanza partículas al motor (humo/brillo), calcos, escombros, trazadoras o luces.
// Las recetas no crean objetos por partícula: los colores son constantes de módulo o arrays creados una vez por llamada.
import * as THREE from 'three';
import { F } from './particulas.js';

// índices de celda del atlas de partículas
const HUMO = 0, LLAMA = 4, BRILLO = 8, DISCO = 9, ESQ = 10, ANILLO = 11, ESTRELLA = 12, ESTELA = 13, MANCHA = 14, ESFERA = 15;

const _c = new THREE.Color();
/** Color lineal [r,g,b,a] (con multiplicador HDR) desde hex/cadena. */
export const col = (hex, a = 1, m = 1) => { _c.set(hex); return [_c.r * m, _c.g * m, _c.b * m, a]; };

// paletas de fuego (HDR para el bloom)
const FU0 = [3.6, 2.6, 1.1, 0.95], FU1 = [2.5, 0.95, 0.22, 0.85], FU2 = [0.5, 0.07, 0.012, 0];
const FUF0 = [3.0, 1.9, 0.7, 0.9], FUF1 = [2.0, 0.65, 0.12, 0.8], FUF2 = [0.35, 0.04, 0.0, 0];
const CHI0 = [4.2, 2.8, 1.0, 1], CHI1 = [2.4, 0.8, 0.14, 0.9], CHI2 = [0.35, 0.05, 0.0, 0];
const FLASH0 = [7, 5.2, 2.4, 1], FLASH1 = [4, 1.8, 0.5, 0.75], FLASH2 = [0.8, 0.15, 0.0, 0];
const SANG0 = [0.6, 0.008, 0.012, 1], SANG1 = [0.55, 0.007, 0.011, 1], SANG2 = [0.42, 0.006, 0.01, 0.92];
const SANGM0 = [0.62, 0.01, 0.014, 0.0], SANGM1 = [0.6, 0.008, 0.012, 0.85], SANGM2 = [0.5, 0.006, 0.01, 0];
const BRASA0 = [3.0, 1.1, 0.25, 1], BRASA1 = [1.6, 0.3, 0.05, 0.8], BRASA2 = [0.2, 0.02, 0, 0];

function gris(l, a, a2 = a) { return [[l * 0.86, l * 0.85, l * 0.84, a * 0.9], [l, l * 0.995, l * 0.99, a], [l * 1.12, l * 1.11, l * 1.1, 0]]; }
const HUMO_OSC = gris(0.07, 0.86), HUMO_GRIS = gris(0.2, 0.7), HUMO_BLANCO = [[0.82, 0.8, 0.76, 0.5], [0.8, 0.78, 0.74, 0.46], [0.72, 0.7, 0.68, 0]];
const HUMO_BLANCO2 = [[0.84, 0.82, 0.78, 0.3], [0.8, 0.78, 0.74, 0.28], [0.75, 0.73, 0.7, 0]];
const POLVO_C = [[0.5, 0.42, 0.32, 0.55], [0.48, 0.41, 0.32, 0.4], [0.46, 0.4, 0.33, 0]];
const VAPOR_C = [[0.95, 0.96, 0.98, 0.3], [0.92, 0.94, 0.97, 0.26], [0.9, 0.92, 0.96, 0]];
const GAS_C = [[0.4, 0.6, 0.12, 0.0], [0.36, 0.58, 0.1, 0.4], [0.3, 0.5, 0.1, 0]];

export function crearEfectos(ctx) {
  const { juego, motor, calcos, escombros, trazadoras } = ctx;
  const H = motor.humo, B = motor.brillo, S = motor.S, lanzar = motor.lanzar;
  const rng = juego.rng ?? Math.random;
  const rr = (a, b) => a + (b - a) * rng();
  const sg = () => (rng() < 0.5 ? -1 : 1);
  const TAU = Math.PI * 2;
  const Q = () => ctx.factor;
  const cnt = (n) => Math.max(1, Math.round(n * ctx.factor));

  let DX = 0, DZ = 1;
  /** Dirección de la opción (dirX/dirZ o rot). Devuelve true si venía indicada. */
  function dirDe(op) {
    const l = Math.hypot(op.dirX ?? 0, op.dirZ ?? 0);
    if (l > 1e-4) { DX = op.dirX / l; DZ = op.dirZ / l; return true; }
    if (op.rot !== undefined) { DX = Math.sin(op.rot); DZ = Math.cos(op.rot); return true; }
    DX = 0; DZ = 1; return false;
  }
  const Y = (p, d = 1) => (p.y === undefined ? d : p.y);

  // ─────────────────────────────── fuego ───────────────────────────────
  /** Una lengua de llama que nace en (x,z) sobre el suelo. */
  function lengua(x, y0, z, e, vel = 1, dur = 1) {
    const tam = rr(0.7, 1.15) * e;
    S.drag = 1.7; S.grav = -3.2 * vel; S.rot = rr(-0.22, 0.22); S.nfr = 4; S.flags = F.FUEGO | F.SIN_SUELO; S.luz = 0;
    lanzar(B, x, y0 + tam * 0.5, z, rr(-0.35, 0.35) * e, rr(0.5, 1.4) * e * vel, rr(-0.35, 0.35) * e, rr(0.5, 0.95) * dur, tam, tam * rr(0.25, 0.5), LLAMA, FU0, FU1, FU2);
  }
  function chispaBrasa(x, y, z, e) {
    S.drag = 0.7; S.grav = -1.2; S.stretch = 0.02; S.flags = F.SIN_SUELO; S.luz = 0;
    lanzar(B, x, y, z, rr(-1, 1) * e, rr(1.5, 4.5) * e, rr(-1, 1) * e, rr(0.9, 1.8), 0.09 * e, 0.03 * e, ESTELA, BRASA0, BRASA1, BRASA2);
  }
  function humoFuego(x, y, z, e) {
    const tam = rr(0.6, 1.0) * e;
    S.drag = 0.7; S.grav = -0.9; S.rot = rng() * TAU; S.rotV = rr(-0.4, 0.4); S.flags = F.SALE; S.luz = 0.9;
    lanzar(H, x, y, z, rr(-0.4, 0.4), rr(1.3, 2.4) * Math.sqrt(e), rr(-0.4, 0.4), rr(1.8, 3.0), tam * 0.7, tam * 2.4, (rng() * 4) | 0, HUMO_OSC[0], HUMO_OSC[1], HUMO_OSC[2]);
  }
  function brilloSuelo(x, z, e, y = 0.06) {
    S.flags = F.PLANO | F.SIN_SUELO; S.rot = rng() * TAU; S.drag = 0; S.luz = 0;
    lanzar(B, x, y, z, 0, 0, 0, 0.45, 3.4 * e, 3.0 * e, BRILLO, [1.5, 0.55, 0.12, 0.34], [1.3, 0.45, 0.1, 0.28], [0.8, 0.2, 0.04, 0]);
  }

  /** Ráfaga de fuego (cantidad de lenguas). */
  function fuego(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 5);
    const y = Math.max(0, Y(p, 0.1) - 0.1);
    for (let i = 0; i < n; i++) { const a = rng() * TAU, r = Math.sqrt(rng()) * 0.3 * e; lengua(p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r, e); }
    if (n >= 3) { chispaBrasa(p.x, y + 0.4 * e, p.z, e); humoFuego(p.x, y + 0.9 * e, p.z, e); brilloSuelo(p.x, p.z, e, y + 0.05); }
  }

  /** Paso de un emisor continuo de fuego (tasas por segundo ∝ escala). */
  function fuegoCont(p, e, dt, acum) {
    const area = Math.pow(e, 1.35);
    acum.a += dt * 30 * area * ctx.factor; acum.b += dt * 5 * area * ctx.factor; acum.c += dt * 6.5 * area * ctx.factor; acum.d += dt * 3.2;
    const y = Math.max(0, Y(p, 0.05));
    while (acum.a >= 1) { acum.a--; const a = rng() * TAU, r = Math.sqrt(rng()) * 0.5 * e; lengua(p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r, e * rr(0.8, 1.15)); }
    while (acum.b >= 1) { acum.b--; chispaBrasa(p.x + rr(-0.3, 0.3) * e, y + 0.3 * e, p.z + rr(-0.3, 0.3) * e, e); }
    while (acum.c >= 1) { acum.c--; humoFuego(p.x + rr(-0.3, 0.3) * e, y + rr(0.9, 1.6) * e, p.z + rr(-0.3, 0.3) * e, e); }
    while (acum.d >= 1) { acum.d--; brilloSuelo(p.x, p.z, e, y + 0.06); }
  }

  // ─────────────────────────────── fogonazos ───────────────────────────────
  const COL_FOG = { plasma: 0x66e8ff, riel: 0xbfd6ff, electrico: 0xb08cff, onda: 0xff8ae6, cohete: 0xffa44a };
  function estrella(x, y, z, tam, vida, c0, c1, c2, rot) { S.rot = rot ?? rng() * TAU; S.flags = F.SALE | F.SIN_SUELO; S.drag = 0; S.luz = 0; lanzar(B, x, y, z, 0, 0, 0, vida, tam, tam * 0.55, ESTRELLA, c0, c1, c2); }
  function disco(x, y, z, tam, tam1, vida, c0, c1, c2) { S.flags = F.SIN_SUELO; S.drag = 0; S.luz = 0; lanzar(B, x, y, z, 0, 0, 0, vida, tam, tam1, BRILLO, c0, c1, c2); }
  function chispaDir(x, y, z, dx, dz, vel, e, c0, c1, c2, grav = 9, vida = 0.4) {
    const a = Math.atan2(dz, dx) + rr(-0.5, 0.5);
    const v = vel * rr(0.4, 1.1);
    S.drag = 0.5; S.grav = grav; S.stretch = 0.03; S.flags = F.SIN_SUELO; S.luz = 0; S.suelo = 0.02;
    lanzar(B, x, y, z, Math.cos(a) * v, rr(-0.5, 2.5), Math.sin(a) * v, vida * rr(0.6, 1.2), 0.11 * e, 0.05 * e, ESTELA, c0, c1, c2);
  }
  function nubeBlanca(x, y, z, vx, vy, vz, tam0, tam1, vida, paleta) {
    S.drag = 2.0; S.grav = -0.12; S.rot = rng() * TAU; S.rotV = rr(-0.25, 0.25); S.flags = F.SALE; S.luz = 1;
    lanzar(H, x, y, z, vx, vy, vz, vida, tam0, tam1, (rng() * 4) | 0, paleta[0], paleta[1], paleta[2]);
  }

  function fogonazo(p, op = {}) {
    const tipo = op.tipo ?? 'moderno', e = op.escala ?? 1;
    dirDe(op);
    const x = p.x, y = Y(p, 1), z = p.z;
    const cInt = op.color !== undefined ? col(op.color, 1, 1) : null;
    switch (tipo) {
      case 'polvora': case 'polvora_grande': {
        const g = tipo === 'polvora_grande' ? 1.55 : 1, s = e * g;
        estrella(x + DX * 0.2, y, z + DZ * 0.2, 2.1 * s, 0.1, FLASH0, FLASH1, FLASH2);
        disco(x + DX * 0.5, y, z + DZ * 0.5, 2.4 * s, 1.2 * s, 0.14, [2.6, 1.15, 0.3, 0.55], [1.8, 0.6, 0.12, 0.35], [0.4, 0.1, 0, 0]);
        // llamarada: lenguas alargadas hacia delante y núcleos de fuego
        for (let i = 0; i < cnt(5 * g); i++) {
          const a = Math.atan2(DZ, DX) + rr(-0.28, 0.28), v = rr(11, 20) * s;
          S.drag = 3.2; S.stretch = 0.075; S.flags = F.SIN_SUELO; S.luz = 0;
          lanzar(B, x, y, z, Math.cos(a) * v, rr(-0.4, 0.9), Math.sin(a) * v, rr(0.09, 0.17), 0.42 * s, 0.7 * s, ESTELA, FUF0, FUF1, FUF2);
        }
        for (let i = 0; i < 3; i++) {
          S.drag = 4; S.nfr = 4; S.flags = F.FUEGO | F.SIN_SUELO | F.SALE; S.rot = rng() * TAU; S.luz = 0;
          lanzar(B, x + DX * 0.5 * (i + 1) * s, y, z + DZ * 0.5 * (i + 1) * s, DX * 3, 0.4, DZ * 3, rr(0.14, 0.24), 0.45 * s, rr(0.95, 1.4) * s, HUMO, FU0, FU1, FU2);
        }
        for (let i = 0; i < cnt(7 * g); i++) chispaDir(x + DX * 0.3, y, z + DZ * 0.3, DX * 3 + rr(-1, 1), DZ * 3 + rr(-1, 1), 11 * s, e, CHI0, CHI1, CHI2, 11, 0.5);
        // nube de humo blanco: densa junto a la boca, deriva hacia delante y permanece varios segundos
        for (let i = 0; i < cnt(8 * g); i++) {
          const d = rr(0.2, 1.3) * s, v = rr(2.5, 7) * s;
          nubeBlanca(x + DX * d + rr(-0.15, 0.15), y + rr(-0.1, 0.25), z + DZ * d + rr(-0.15, 0.15), DX * v + rr(-0.9, 0.9), rr(0.25, 0.9), DZ * v + rr(-0.9, 0.9), rr(0.38, 0.6) * s, rr(1.7, 2.7) * s, rr(2.8, 5.0), HUMO_BLANCO);
        }
        for (let i = 0; i < 2; i++) {      // bolsa persistente que se queda donde se disparó
          S.drag = 3.2; S.grav = -0.05; S.rot = rng() * TAU; S.rotV = rr(-0.1, 0.1); S.flags = F.SALE; S.luz = 1;
          lanzar(H, x + DX * 0.6, y - 0.1, z + DZ * 0.6, DX * 1.2, 0.18, DZ * 1.2, rr(5, 7), 0.8 * s, rr(2.6, 3.4) * s, (rng() * 4) | 0, HUMO_BLANCO2[0], HUMO_BLANCO2[1], HUMO_BLANCO2[2]);
        }
        motor.resplandor(0.28 * s, 0.14 * s, 0.03 * s);
        break;
      }
      case 'moderno': case 'moderno_grande': {
        const g = tipo === 'moderno_grande' ? 1.5 : 1, s = e * g;
        estrella(x + DX * 0.12, y, z + DZ * 0.12, 1.25 * s, 0.06, [6, 4.4, 2.0, 1], [3.2, 1.6, 0.5, 0.7], [0.5, 0.1, 0, 0]);
        for (let i = 0; i < 2; i++) {
          const a = Math.atan2(DZ, DX) + rr(-0.12, 0.12), v = rr(16, 24) * s;
          S.drag = 4; S.stretch = 0.09; S.flags = F.SIN_SUELO; S.luz = 0;
          lanzar(B, x, y, z, Math.cos(a) * v, rr(-0.1, 0.2), Math.sin(a) * v, rr(0.045, 0.075), 0.26 * s, 0.34 * s, ESTELA, [5, 3.4, 1.4, 1], [3, 1.4, 0.4, 0.7], [0.4, 0.1, 0, 0]);
        }
        for (let i = 0; i < cnt(3 * g); i++) chispaDir(x, y, z, DX * 2 + rr(-1, 1), DZ * 2 + rr(-1, 1), 8 * s, e, CHI0, CHI1, CHI2, 10, 0.32);
        nubeBlanca(x + DX * 0.6, y, z + DZ * 0.6, DX * 2.2 + rr(-0.3, 0.3), rr(0.25, 0.55), DZ * 2.2 + rr(-0.3, 0.3), 0.13 * s, rr(0.55, 0.85) * s, rr(0.5, 0.85), HUMO_BLANCO2);
        motor.resplandor(0.07 * s, 0.04 * s, 0.01 * s);
        break;
      }
      case 'plasma': {
        const c = cInt ?? col(COL_FOG.plasma, 1, 1), m = 3.6 / Math.max(c[0], c[1], c[2], 0.05);
        const c0 = [c[0] * m, c[1] * m, c[2] * m, 1], c1 = [c[0] * m * 0.55, c[1] * m * 0.55, c[2] * m * 0.55, 0.75], c2 = [c[0], c[1], c[2], 0];
        estrella(x, y, z, 1.6 * e, 0.1, c0, c1, c2);
        disco(x, y, z, 2.3 * e, 0.8 * e, 0.16, [c0[0] * 0.5, c0[1] * 0.5, c0[2] * 0.5, 0.6], c1, c2);
        S.drag = 0; S.flags = F.SALE | F.SIN_SUELO; S.luz = 0;
        lanzar(B, x + DX * 0.1, y, z + DZ * 0.1, DX * 2, 0, DZ * 2, 0.16, 0.2 * e, 1.5 * e, ANILLO, c0, c1, c2);
        for (let i = 0; i < cnt(7); i++) chispaDir(x, y, z, DX * 1.5 + rr(-1.5, 1.5), DZ * 1.5 + rr(-1.5, 1.5), 7 * e, e, c0, c1, c2, 3, 0.4);
        motor.resplandor(c[0] * 0.08, c[1] * 0.08, c[2] * 0.08);
        break;
      }
      case 'riel': {
        const c = cInt ?? col(COL_FOG.riel), m = 4 / Math.max(c[0], c[1], c[2], 0.05);
        const c0 = [c[0] * m, c[1] * m, c[2] * m, 1], c1 = [c[0] * m * 0.45, c[1] * m * 0.45, c[2] * m * 0.5, 0.7], c2 = [c[0], c[1], c[2], 0];
        estrella(x, y, z, 3.0 * e, 0.16, c0, c1, c2);
        S.drag = 0; S.stretch = 0.12; S.flags = F.SIN_SUELO | F.SALE; S.luz = 0;
        lanzar(B, x, y, z, DX * 26, 0, DZ * 26, 0.14, 0.9 * e, 1.2 * e, ESTELA, c0, c1, c2);
        S.drag = 0; S.flags = F.SALE | F.SIN_SUELO; S.luz = 0;
        lanzar(B, x + DX * 0.3, y, z + DZ * 0.3, DX * 4, 0, DZ * 4, 0.3, 0.3 * e, 3.2 * e, ANILLO, c0, c1, c2);
        S.t0 = 0.06; S.drag = 0; S.flags = F.SALE | F.SIN_SUELO; S.luz = 0;
        lanzar(B, x + DX * 0.3, y, z + DZ * 0.3, DX * 4, 0, DZ * 4, 0.28, 0.2 * e, 2.2 * e, ANILLO, c0, c1, c2);
        for (let i = 0; i < cnt(10); i++) chispaDir(x, y, z, DX * 2 + rr(-2, 2), DZ * 2 + rr(-2, 2), 10 * e, e, c0, c1, c2, 5, 0.5);
        motor.resplandor(c[0] * 0.1, c[1] * 0.1, c[2] * 0.12);
        break;
      }
      case 'electrico': {
        const c = cInt ?? col(COL_FOG.electrico), m = 3.8 / Math.max(c[0], c[1], c[2], 0.05);
        const c0 = [c[0] * m, c[1] * m, c[2] * m, 1], c1 = [c[0] * m * 0.5, c[1] * m * 0.5, c[2] * m * 0.55, 0.7], c2 = [c[0], c[1], c[2], 0];
        estrella(x, y, z, 1.7 * e, 0.09, c0, c1, c2);
        for (let i = 0; i < 2; i++) trazadoras.crear({ x, y, z }, { x: x + DX * 1.6 * e + rr(-0.7, 0.7), y: y + rr(-0.4, 0.4), z: z + DZ * 1.6 * e + rr(-0.7, 0.7) }, { tipo: 'arco', color: op.color, duracion: 0.1, ancho: 0.05 });
        for (let i = 0; i < cnt(6); i++) chispaDir(x, y, z, rr(-1, 1), rr(-1, 1), 6 * e, e, c0, c1, c2, 4, 0.3);
        break;
      }
      case 'cohete': {
        const s = e;
        estrella(x + DX * 0.3, y, z + DZ * 0.3, 2.6 * s, 0.12, FLASH0, FLASH1, FLASH2);
        // llama trasera y gran nube hacia atrás
        for (let i = 0; i < 4; i++) {
          const a = Math.atan2(-DZ, -DX) + rr(-0.35, 0.35), v = rr(9, 17) * s;
          S.drag = 3; S.stretch = 0.08; S.flags = F.SIN_SUELO; S.luz = 0;
          lanzar(B, x, y, z, Math.cos(a) * v, rr(-0.4, 0.5), Math.sin(a) * v, rr(0.12, 0.22), 0.5 * s, 0.9 * s, ESTELA, FUF0, FUF1, FUF2);
        }
        for (let i = 0; i < cnt(10); i++) {
          const a = Math.atan2(-DZ, -DX) + rr(-0.7, 0.7), v = rr(2.5, 8) * s;
          nubeBlanca(x - DX * rr(0.1, 0.8), y + rr(-0.2, 0.2), z - DZ * rr(0.1, 0.8), Math.cos(a) * v, rr(0.2, 1.2), Math.sin(a) * v, rr(0.4, 0.7) * s, rr(2, 3.4) * s, rr(2.6, 4.4), HUMO_BLANCO);
        }
        for (let i = 0; i < cnt(6); i++) chispaDir(x, y, z, -DX * 2 + rr(-2, 2), -DZ * 2 + rr(-2, 2), 9 * s, e, CHI0, CHI1, CHI2, 10, 0.5);
        motor.resplandor(0.35 * s, 0.18 * s, 0.05 * s);
        break;
      }
      case 'onda': {
        const c = cInt ?? col(COL_FOG.onda), m = 3.4 / Math.max(c[0], c[1], c[2], 0.05);
        const c0 = [c[0] * m, c[1] * m, c[2] * m, 0.9], c1 = [c[0] * m * 0.6, c[1] * m * 0.6, c[2] * m * 0.6, 0.6], c2 = [c[0], c[1], c[2], 0];
        for (let i = 0; i < 3; i++) {
          S.t0 = i * 0.05; S.drag = 0; S.flags = F.SALE | F.SIN_SUELO; S.luz = 0;
          lanzar(B, x + DX * 0.2, y, z + DZ * 0.2, DX * 5, 0, DZ * 5, 0.3, 0.25 * e, (2.6 + i * 0.5) * e, ANILLO, c0, c1, c2);
        }
        disco(x, y, z, 2.0 * e, 0.7 * e, 0.15, [c0[0] * 0.5, c0[1] * 0.5, c0[2] * 0.5, 0.5], c1, c2);
        for (let i = 0; i < cnt(5); i++) chispaDir(x, y, z, DX * 2 + rr(-1.5, 1.5), DZ * 2 + rr(-1.5, 1.5), 6 * e, e, c0, c1, c2, 2, 0.35);
        break;
      }
      default: estrella(x, y, z, 1.2 * e, 0.07, FLASH0, FLASH1, FLASH2);
    }
  }

  // ─────────────────────────────── humo, polvo, esquirlas ───────────────────────────────
  function humo(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 3);
    const tiene = dirDe(op);
    const dy = op.dirY ?? 0.2;
    let pal = HUMO_GRIS;
    if (op.color !== undefined) { const c = col(op.color, 1, 1); pal = [[c[0], c[1], c[2], 0.78], [c[0] * 1.15, c[1] * 1.15, c[2] * 1.15, 0.7], [c[0] * 1.5 + 0.05, c[1] * 1.5 + 0.05, c[2] * 1.5 + 0.05, 0]]; }
    for (let i = 0; i < n; i++) {
      const v = tiene ? rr(0.8, 2.4) : rr(0.2, 0.7), a = rng() * TAU;
      const t0 = rr(0.3, 0.5) * e;
      S.drag = 1.6; S.grav = -0.35; S.rot = rng() * TAU; S.rotV = rr(-0.5, 0.5); S.flags = F.SALE; S.luz = 1;
      lanzar(H, p.x + rr(-0.1, 0.1), Y(p, 1) + rr(-0.05, 0.1), p.z + rr(-0.1, 0.1),
        (tiene ? DX * v : Math.cos(a) * v) + rr(-0.3, 0.3), dy * 3 + rr(0.2, 0.9), (tiene ? DZ * v : Math.sin(a) * v) + rr(-0.3, 0.3),
        rr(1.0, 2.0), t0, t0 * rr(3.2, 4.8), (rng() * 4) | 0, pal[0], pal[1], pal[2]);
    }
  }

  function polvo(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 4);
    const tiene = dirDe(op);
    const col0 = op.color !== undefined ? (() => { const c = col(op.color); return [[c[0], c[1], c[2], 0.55], [c[0], c[1], c[2], 0.4], [c[0], c[1], c[2], 0]]; })() : POLVO_C;
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, v = rr(0.6, 2.4) * e;
      S.drag = 2.4; S.grav = -0.15; S.rot = rng() * TAU; S.rotV = rr(-0.4, 0.4); S.flags = F.SALE; S.luz = 1;
      lanzar(H, p.x + rr(-0.15, 0.15) * e, Math.max(0.12, Y(p, 0.2)) + rr(0, 0.15), p.z + rr(-0.15, 0.15) * e,
        Math.cos(a) * v + (tiene ? DX * 0.8 : 0), rr(0.3, 1.2) * e, Math.sin(a) * v + (tiene ? DZ * 0.8 : 0),
        rr(0.7, 1.4), 0.3 * e, rr(1.0, 1.7) * e, (rng() * 4) | 0, col0[0], col0[1], col0[2]);
    }
  }

  function esquirlas(p, op, color, n, vel, tam) {
    const tiene = dirDe(op);
    const b = tiene ? [-DX, -DZ] : [0, 0];
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, v = rr(0.4, 1.1) * vel;
      const k = rr(0.85, 1.15);
      const c = [color[0] * k, color[1] * k, color[2] * k, 1];
      S.drag = 0.7; S.grav = 14; S.rot = rng() * TAU; S.rotV = rr(-14, 14); S.flags = F.SIN_SUELO; S.luz = 1; S.suelo = 0.03;
      lanzar(H, p.x, Y(p, 1), p.z, Math.cos(a) * v + b[0] * v * 0.5, rr(1.5, 5.5) * vel * 0.25 + 1, Math.sin(a) * v + b[1] * v * 0.5, rr(0.5, 1.0), tam * rr(0.7, 1.4), tam * rr(0.5, 1.0), ESQ, c, c, [c[0], c[1], c[2], 0.9]);
    }
  }

  function astillas(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 6);
    esquirlas(p, op, [0.34, 0.19, 0.085], n, 5.5 * e, 0.16 * e);
    polvo(p, { escala: 0.45 * e, cantidad: 1, color: 0x7a5a38, dirX: op.dirX, dirZ: op.dirZ });
  }
  function piedra(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 5);
    esquirlas(p, op, [0.32, 0.3, 0.27], n, 5 * e, 0.18 * e);
    polvo(p, { escala: 0.8 * e, cantidad: 2, dirX: op.dirX, dirZ: op.dirZ });
    for (let i = 0; i < cnt(2); i++) chispaDir(p.x, Y(p, 0.6), p.z, rr(-1, 1), rr(-1, 1), 5 * e, e, CHI0, CHI1, CHI2, 10, 0.3);
  }

  function chispas(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 6);
    const tiene = dirDe(op);
    const y = Y(p, 1);
    S.flags = F.SALE | F.SIN_SUELO;
    estrella(p.x, y, p.z, 0.55 * e, 0.07, [6, 4.6, 2.2, 1], [3, 1.4, 0.4, 0.6], [0.4, 0.08, 0, 0]);
    for (let i = 0; i < n; i++) {
      const bx = tiene ? DX * 2.2 : 0, bz = tiene ? DZ * 2.2 : 0;
      chispaDir(p.x, y, p.z, bx + rr(-1.4, 1.4), bz + rr(-1.4, 1.4), 7.5 * e, e, CHI0, CHI1, CHI2, 11, 0.55);
    }
  }

  function casquillo(p, op = {}) {
    const e = op.escala ?? 1;
    const dx = op.dirX ?? 1, dz = op.dirZ ?? 0;
    const v = rr(1.8, 3.2);
    const c = [0.85, 0.5, 0.1, 1];
    S.drag = 0.2; S.grav = 17; S.rot = rng() * TAU; S.rotV = rr(-30, 30); S.flags = F.SIN_SUELO; S.luz = 1; S.suelo = 0.03;
    lanzar(H, p.x, Y(p, 1), p.z, dx * v + rr(-0.4, 0.4), rr(2, 3.6), dz * v + rr(-0.4, 0.4), 0.9, 0.075 * e, 0.075 * e, ESQ, c, c, [c[0], c[1], c[2], 0.9]);
  }

  // ─────────────────────────────── sangre ───────────────────────────────
  function gotasSangre(p, n, vel, tam, tiene, e, programarSuelo) {
    for (let i = 0; i < n; i++) {
      // más gotas hacia donde va el disparo; el resto en abanico
      let a = tiene && rng() < 0.7 ? Math.atan2(DZ, DX) + rr(-0.9, 0.9) : rng() * TAU;
      const v = vel * rr(0.2, 1.1), vy = rr(0.8, 5.2) * Math.sqrt(vel / 5);
      const t = tam * rr(0.55, 1.3);
      S.drag = 0.25; S.grav = 17; S.stretch = 0.045; S.flags = F.SIN_SUELO; S.luz = 0.6; S.suelo = 0.04;
      const vx = Math.cos(a) * v, vz = Math.sin(a) * v, py = Y(p, 1) + rr(-0.15, 0.15);
      const tl = lanzar(H, p.x, py, p.z, vx, vy, vz, 1.4, t, t * 0.8, ESFERA, SANG0, SANG1, SANG2);
      if (programarSuelo && tl < 1.3 && i % programarSuelo === 0) {
        const k = 0.25, ee = (1 - Math.exp(-k * tl)) / k;
        calcos.programar(tl, 'sangre', p.x + vx * ee, p.z + vz * ee, rr(0.3, 0.62) * e * (0.7 + t * 2.5), vx, vz);
      }
    }
  }
  function brumaSangre(p, n, vel, tam, tiene) {
    for (let i = 0; i < n; i++) {
      const a = tiene ? Math.atan2(DZ, DX) + rr(-0.8, 0.8) : rng() * TAU, v = vel * rr(0.3, 1);
      S.drag = 4.8; S.grav = 1.5; S.rot = rng() * TAU; S.rotV = rr(-2, 2); S.flags = F.SALE | F.SIN_SUELO; S.luz = 0.6;
      lanzar(H, p.x, Y(p, 1) + rr(-0.1, 0.2), p.z, Math.cos(a) * v, rr(0.2, 1.4), Math.sin(a) * v, rr(0.4, 0.75), tam * 0.35, tam * rr(0.9, 1.5), MANCHA, SANGM0, SANGM1, SANGM2);
    }
  }

  function sangre(p, op = {}) {
    const e = op.escala ?? 1, tiene = dirDe(op);
    const n = cnt(op.cantidad ?? 8);
    const y = Y(p, 1);
    gotasSangre(p, n, 5.5 * e, 0.17 * e, tiene, e, 2);
    brumaSangre(p, Math.max(1, Math.round(n / 4)), 2.8 * e, 0.8 * e, tiene);
    if (!op.sinCalco && (op.calco !== false)) {
      const k = Math.min(1, y);
      calcos.calco('sangre', p.x + (tiene ? DX * 0.45 : 0), p.z + (tiene ? DZ * 0.45 : 0), rr(0.8, 1.35) * e * (0.7 + 0.3 * Math.min(1, n / 8)), tiene ? { dirX: DX, dirZ: DZ } : undefined);
    }
  }

  function sangreGrande(p, op = {}) {
    const e = op.escala ?? 1, tiene = dirDe(op);
    const n = cnt(op.cantidad ?? 26);
    gotasSangre(p, n, 8.5 * e, 0.22 * e, tiene, e, 2);
    gotasSangre(p, Math.round(n * 0.35), 3.2 * e, 0.3 * e, false, e, 3);
    brumaSangre(p, cnt(7), 4 * e, 1.4 * e, tiene);
    estallido(p, e);
    if (op.calco !== false) {
      calcos.calco('sangre', p.x + (tiene ? DX * 0.4 : 0), p.z + (tiene ? DZ * 0.4 : 0), rr(2.4, 3.4) * e, { charco: false });
      for (let i = 0; i < cnt(4); i++) {
        const a = rng() * TAU, d = rr(0.8, 2.4) * e;
        calcos.programar(rr(0.05, 0.4), 'sangre', p.x + Math.cos(a) * d, p.z + Math.sin(a) * d, rr(0.9, 1.9) * e, tiene ? DX : 0, tiene ? DZ : 0);
      }
    }
    if (op.trozos) escombros.lanzar({ x: p.x, y: Y(p, 0.8), z: p.z, cantidad: cnt(op.trozos), material: 'carne', fuerza: 6.5 * e, dirX: tiene ? DX : 0, dirZ: tiene ? DZ : 0 });
  }
  function estallido(p, e) {  // nube roja densa que se lee desde lejos
    for (let i = 0; i < 3; i++) {
      S.drag = 3; S.rot = rng() * TAU; S.rotV = rr(-1, 1); S.flags = F.SALE | F.SIN_SUELO; S.luz = 0.6;
      lanzar(H, p.x, Y(p, 1) + rr(-0.1, 0.3), p.z, rr(-1.5, 1.5), rr(0.4, 1.4), rr(-1.5, 1.5), rr(0.5, 0.9), 0.6 * e, rr(2.0, 2.8) * e, MANCHA, SANGM0, [0.58, 0.008, 0.012, 0.7], SANGM2);
    }
  }

  function salpicadura(p, op = {}) {
    const e = op.escala ?? 1, c = col(op.color ?? 0xa8d4e6);
    const pal = [[c[0], c[1], c[2], 0.9], [c[0], c[1], c[2], 0.8], [c[0], c[1], c[2], 0.5]];
    const y = Math.max(0.05, Y(p, 0.1));
    for (let i = 0; i < cnt(op.cantidad ?? 12); i++) {
      const a = rng() * TAU, v = rr(0.6, 3.2) * e;
      S.drag = 0.3; S.grav = 15; S.stretch = 0.04; S.flags = F.SIN_SUELO; S.luz = 0.8; S.suelo = 0.03;
      lanzar(H, p.x, y, p.z, Math.cos(a) * v, rr(2, 5.5) * e, Math.sin(a) * v, 1.1, 0.1 * e, 0.07 * e, ESFERA, pal[0], pal[1], pal[2]);
    }
    S.flags = F.PLANO | F.SALE | F.SIN_SUELO; S.luz = 0.7;
    lanzar(H, p.x, y + 0.03, p.z, 0, 0, 0, 0.7, 0.25 * e, 2.4 * e, ANILLO, [c[0], c[1], c[2], 0.5], [c[0], c[1], c[2], 0.3], [c[0], c[1], c[2], 0]);
  }

  // ─────────────────────────────── explosiones ───────────────────────────────
  const PAL = {
    explosivo: { f0: FU0, f1: FU1, f2: FU2, humo: HUMO_OSC, luz: 0xffa050 },
    fuego: { f0: [3.6, 2.2, 0.7, 0.95], f1: [2.8, 0.85, 0.12, 0.88], f2: [0.5, 0.05, 0.01, 0], humo: gris(0.05, 0.8), luz: 0xff8a30 },
    veneno: { f0: [1.8, 3.4, 0.9, 0.95], f1: [0.7, 2.2, 0.2, 0.85], f2: [0.1, 0.4, 0.02, 0], humo: [[0.2, 0.34, 0.08, 0.7], [0.22, 0.36, 0.09, 0.62], [0.24, 0.38, 0.1, 0]], luz: 0x9aff40 },
    energia: { f0: [2.4, 3.6, 4.2, 0.95], f1: [0.7, 2.2, 3.6, 0.85], f2: [0.1, 0.2, 0.7, 0], humo: [[0.2, 0.22, 0.32, 0.45], [0.2, 0.22, 0.34, 0.4], [0.22, 0.24, 0.36, 0]], luz: 0x66e8ff },
  };
  PAL.acido = PAL.veneno;

  function explosion(p, op = {}, grande = false) {
    const e0 = op.escala ?? 1, e = e0 * (grande ? 1.45 : 1);
    const tipo = PAL[op.tipo] ? op.tipo : 'explosivo', P = PAL[tipo];
    const R = 2.2 * e, x = p.x, z = p.z, y0 = Math.max(0.3, Y(p, 0.6));
    const calor = tipo === 'fuego' || tipo === 'explosivo';
    // destello y resplandor
    estrella(x, y0 + R * 0.3, z, R * 3.3, 0.16, FLASH0, FLASH1, FLASH2);
    disco(x, y0 + R * 0.3, z, R * 5.6, R * 3.0, 0.4, [P.f0[0] * 0.8, P.f0[1] * 0.55, P.f0[2] * 0.4, 0.75], [P.f1[0], P.f1[1] * 0.7, P.f1[2], 0.5], [P.f2[0], P.f2[1], P.f2[2], 0]);
    // bola de fuego: nubes fotograma a fotograma en llamas
    const nF = cnt(8 + 7 * Math.sqrt(e));
    for (let i = 0; i < nF; i++) {
      const a = rng() * TAU, rad = R * 0.5 * Math.sqrt(rng()), h = R * (0.1 + rng() * 0.6);
      const v = R * rr(0.9, 2.4);
      S.drag = 2.7; S.grav = -rr(0.8, 2.2); S.rot = rng() * TAU; S.rotV = rr(-1.2, 1.2); S.nfr = 4; S.flags = F.FUEGO | F.SALE | F.SIN_SUELO; S.luz = 0; S.t0 = rng() * 0.06;
      lanzar(B, x + Math.cos(a) * rad, y0 + h, z + Math.sin(a) * rad, Math.cos(a) * v * 0.7, rr(0.8, 2.6) * Math.sqrt(e), Math.sin(a) * v * 0.7, rr(0.55, 1.05) * (0.85 + 0.15 * e), R * rr(0.5, 0.75), R * rr(1.5, 2.2), HUMO, P.f0, P.f1, P.f2);
    }
    for (let i = 0; i < 4; i++) {   // núcleo candente
      S.drag = 3; S.rot = rng() * TAU; S.nfr = 4; S.flags = F.FUEGO | F.SALE | F.SIN_SUELO; S.luz = 0;
      lanzar(B, x + rr(-0.2, 0.2) * R, y0 + R * 0.45, z + rr(-0.2, 0.2) * R, 0, rr(0.5, 1.5), 0, rr(0.35, 0.55), R * 0.8, R * rr(1.4, 1.9), HUMO, [5, 4, 2.2, 1], P.f1, P.f2);
    }
    // columna de humo
    if (tipo !== 'energia') {
      const nH = cnt(9 + 7 * Math.sqrt(e));
      for (let i = 0; i < nH; i++) {
        const a = rng() * TAU, rad = R * 0.4 * Math.sqrt(rng());
        S.drag = 0.85; S.grav = -rr(0.2, 0.7); S.rot = rng() * TAU; S.rotV = rr(-0.3, 0.3); S.flags = F.SALE; S.luz = 1; S.t0 = rng() * 0.18;
        lanzar(H, x + Math.cos(a) * rad, y0 + R * rr(0.2, 0.9), z + Math.sin(a) * rad, Math.cos(a) * R * rr(0.2, 1.1), rr(2.0, 5.8) * Math.sqrt(e) * (1 + i / nH), Math.sin(a) * R * rr(0.2, 1.1), rr(2.8, 5.2), R * rr(0.7, 1.0), R * rr(2.3, 3.6), (rng() * 4) | 0, P.humo[0], P.humo[1], P.humo[2]);
      }
    }
    // polvo a ras de suelo
    if (calor) {
      const nD = cnt(10 + 7 * Math.sqrt(e));
      for (let i = 0; i < nD; i++) {
        const a = (i / nD) * TAU + rr(-0.2, 0.2), v = R * rr(2.4, 4.2);
        S.drag = 2.5; S.grav = -0.1; S.rot = rng() * TAU; S.rotV = rr(-0.5, 0.5); S.flags = F.SALE; S.luz = 1;
        lanzar(H, x + Math.cos(a) * R * 0.3, 0.3, z + Math.sin(a) * R * 0.3, Math.cos(a) * v, rr(0.3, 1.0), Math.sin(a) * v, rr(1.3, 2.4), R * 0.45, R * rr(1.3, 1.9), (rng() * 4) | 0, POLVO_C[0], POLVO_C[1], POLVO_C[2]);
      }
    }
    // chispas y brasas
    const nS = cnt(Math.round(36 * Math.pow(e, 0.7)));
    for (let i = 0; i < nS; i++) {
      const a = rng() * TAU, hv = R * rr(2.5, 8), vy = rr(1, 1.1 + 0.9 * rng()) * R * rr(1.5, 4);
      S.drag = 0.45; S.grav = 11; S.stretch = 0.026; S.flags = F.SIN_SUELO; S.luz = 0; S.suelo = 0.02;
      lanzar(B, x, y0 + 0.3, z, Math.cos(a) * hv, vy, Math.sin(a) * hv, rr(0.7, 1.6), 0.17, 0.05, ESTELA, CHI0, CHI1, CHI2);
    }
    for (let i = 0; i < cnt(10); i++) {
      const a = rng() * TAU, hv = R * rr(0.8, 2.8);
      S.drag = 0.4; S.grav = 3.5; S.flags = F.SIN_SUELO; S.luz = 0;
      lanzar(B, x, y0 + 0.5, z, Math.cos(a) * hv, rr(2, 6), Math.sin(a) * hv, rr(1.4, 2.8), 0.16 * e0, 0.04, BRILLO, BRASA0, BRASA1, BRASA2);
    }
    // anillos de onda de choque sobre el suelo
    S.flags = F.PLANO | F.SALE | F.SIN_SUELO; S.rot = 0; S.luz = 0;
    lanzar(B, x, 0.13, z, 0, 0, 0, 0.55, R * 0.6, R * 5.4, ANILLO, [2.8, 1.9, 1.0, 0.9], [1.5, 0.8, 0.35, 0.5], [0.2, 0.1, 0.03, 0]);
    S.flags = F.PLANO | F.SALE | F.SIN_SUELO; S.t0 = 0.07; S.luz = 0;
    lanzar(B, x, 0.14, z, 0, 0, 0, 0.5, R * 0.4, R * 3.6, ANILLO, [1.8, 1.2, 0.7, 0.7], [1.0, 0.6, 0.3, 0.4], [0.2, 0.1, 0.03, 0]);
    // marcas permanentes y trozos
    if (op.calco !== false && calor) {
      calcos.calco('crater', x, z, R * 2.0, { alfa: 0.85 });
      calcos.calco('quemadura', x, z, R * 3.6, { alfa: 0.95 });
    } else if (op.calco !== false && tipo === 'veneno') calcos.calco('acido', x, z, R * 2.2);
    if (calor && op.escombros !== false) escombros.lanzar({ x, y: 0.5, z, cantidad: cnt(5 + 5 * e), material: 'piedra', fuerza: 6.5 + e * 2.2 });
    if (!op.sinLuz) {
      ctx.destello({ x, y: y0 + R * 0.5, z }, P.luz, 7 + 4 * e, 0.5 + 0.12 * e, R * 4.2);
      motor.resplandor(P.f0[0] * 0.3, P.f0[1] * 0.18, P.f0[2] * 0.08);
    }
  }

  // ─────────────────────────────── energía, gas, ácido, otros ───────────────────────────────
  function plasma(p, op = {}) {
    const e = op.escala ?? 1, c = col(op.color ?? 0x66e8ff), m = 3.8 / Math.max(c[0], c[1], c[2], 0.05);
    const c0 = [c[0] * m, c[1] * m, c[2] * m, 1], c1 = [c[0] * m * 0.5, c[1] * m * 0.5, c[2] * m * 0.5, 0.7], c2 = [c[0], c[1], c[2], 0];
    const y = Y(p, 1);
    estrella(p.x, y, p.z, 1.3 * e, 0.14, c0, c1, c2);
    disco(p.x, y, p.z, 1.9 * e, 0.6 * e, 0.28, [c0[0] * 0.5, c0[1] * 0.5, c0[2] * 0.5, 0.6], c1, c2);
    S.flags = F.SALE | F.SIN_SUELO; S.luz = 0; S.drag = 0;
    lanzar(B, p.x, y, p.z, 0, 0, 0, 0.3, 0.2 * e, 1.8 * e, ANILLO, c0, c1, c2);
    for (let i = 0; i < cnt(8); i++) chispaDir(p.x, y, p.z, rr(-1, 1), rr(-1, 1), 5.5 * e, e, c0, c1, c2, 4, 0.5);
    motor.resplandor(c[0] * 0.05, c[1] * 0.05, c[2] * 0.05);
  }

  function electrico(p, op = {}) {
    const e = op.escala ?? 1, y = Y(p, 1);
    const c = col(op.color ?? 0xb8a4ff), m = 3.8 / Math.max(c[0], c[1], c[2], 0.05);
    const c0 = [c[0] * m, c[1] * m, c[2] * m, 1], c1 = [c[0] * m * 0.5, c[1] * m * 0.5, c[2] * m * 0.55, 0.7], c2 = [c[0], c[1], c[2], 0];
    estrella(p.x, y, p.z, 1.6 * e, 0.12, c0, c1, c2);
    const n = cnt(3 + Math.round(e));
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, d = rr(0.6, 1.5) * e;
      trazadoras.crear({ x: p.x, y, z: p.z }, { x: p.x + Math.cos(a) * d, y: Math.max(0.1, y + rr(-0.6, 0.5)), z: p.z + Math.sin(a) * d }, { tipo: 'arco', color: op.color, duracion: rr(0.1, 0.2), ancho: 0.06 });
    }
    for (let i = 0; i < cnt(7); i++) chispaDir(p.x, y, p.z, rr(-1, 1), rr(-1, 1), 6 * e, e, c0, c1, c2, 5, 0.4);
    motor.resplandor(c[0] * 0.06, c[1] * 0.06, c[2] * 0.08);
  }

  function gasToxico(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 1);
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, r = Math.sqrt(rng()) * 0.7 * e;
      S.drag = 0.5; S.grav = -0.1; S.rot = rng() * TAU; S.rotV = rr(-0.25, 0.25); S.flags = F.SALE; S.luz = 0.5;
      lanzar(H, p.x + Math.cos(a) * r, Math.max(0.35 * e, Y(p, 0.3)) + rr(0, 0.4) * e, p.z + Math.sin(a) * r, rr(-0.3, 0.3), rr(0.3, 0.9), rr(-0.3, 0.3), rr(2.2, 3.6), 0.9 * e, rr(2.2, 3.4) * e, (rng() * 4) | 0, GAS_C[0], GAS_C[1], GAS_C[2]);
    }
    if (rng() < 0.35) {
      S.drag = 0.3; S.grav = -0.6; S.flags = F.SIN_SUELO; S.luz = 0;
      lanzar(B, p.x + rr(-0.5, 0.5) * e, 0.4, p.z + rr(-0.5, 0.5) * e, 0, 0, 0, 1.6, 0.1 * e, 0.18 * e, BRILLO, [0.5, 1.4, 0.2, 0.0], [0.5, 1.5, 0.2, 0.5], [0.3, 1.0, 0.1, 0]);
    }
  }

  function acido(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 4);
    const y = Math.max(0.05, Y(p, 0.1));
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, r = Math.sqrt(rng()) * 0.5 * e;
      S.drag = 0.3; S.grav = 9; S.flags = F.SIN_SUELO; S.luz = 0; S.suelo = 0.03;
      lanzar(B, p.x + Math.cos(a) * r, y, p.z + Math.sin(a) * r, rr(-0.6, 0.6) * e, rr(1.8, 3.8) * e, rr(-0.6, 0.6) * e, 0.9, 0.12 * e, 0.07 * e, DISCO, [0.9, 3.0, 0.2, 1], [0.5, 2.0, 0.1, 0.8], [0.2, 0.7, 0.05, 0]);
    }
    if (rng() < 0.5) {      // ampolla que revienta
      S.flags = F.PLANO | F.SALE | F.SIN_SUELO; S.luz = 0;
      const a = rng() * TAU, r = Math.sqrt(rng()) * 0.7 * e;
      lanzar(B, p.x + Math.cos(a) * r, 0.07, p.z + Math.sin(a) * r, 0, 0, 0, 0.5, 0.1 * e, 0.7 * e, ANILLO, [0.7, 2.8, 0.2, 0.9], [0.4, 1.8, 0.1, 0.5], [0.2, 0.8, 0.05, 0]);
    }
    if (rng() < 0.4) {
      S.drag = 0.7; S.grav = -0.4; S.rot = rng() * TAU; S.flags = F.SALE; S.luz = 0.4;
      lanzar(H, p.x + rr(-0.5, 0.5) * e, y + 0.2, p.z + rr(-0.5, 0.5) * e, rr(-0.2, 0.2), rr(0.5, 1.1), rr(-0.2, 0.2), rr(1.2, 2.0), 0.35 * e, 1.1 * e, (rng() * 4) | 0, [0.45, 0.75, 0.12, 0.0], [0.45, 0.75, 0.12, 0.3], [0.4, 0.7, 0.1, 0]);
    }
  }

  function vapor(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 2);
    for (let i = 0; i < n; i++) {
      S.drag = 0.7; S.grav = -0.7; S.rot = rng() * TAU; S.rotV = rr(-0.3, 0.3); S.flags = F.SALE; S.luz = 1;
      lanzar(H, p.x + rr(-0.2, 0.2) * e, Y(p, 0.8), p.z + rr(-0.2, 0.2) * e, rr(-0.35, 0.35) + (op.dirX ?? 0) * 0.8, rr(1.1, 2.3) * Math.sqrt(e), rr(-0.35, 0.35) + (op.dirZ ?? 0) * 0.8, rr(1.4, 2.4), 0.35 * e, rr(1.5, 2.3) * e, (rng() * 4) | 0, VAPOR_C[0], VAPOR_C[1], VAPOR_C[2]);
    }
  }

  function curacion(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 6), y = Y(p, 0.6);
    const c = op.color !== undefined ? col(op.color) : [0.3, 1, 0.6, 1], m = 2.8 / Math.max(c[0], c[1], c[2], 0.05);
    const c0 = [c[0] * m, c[1] * m, c[2] * m, 1], c1 = [c[0] * m * 0.6, c[1] * m * 0.6, c[2] * m * 0.6, 0.8], c2 = [c[0], c[1], c[2], 0];
    for (let i = 0; i < n; i++) {
      const a = rng() * TAU, r = Math.sqrt(rng()) * 0.55 * e;
      S.drag = 0.8; S.grav = -1.2; S.rot = rr(-0.3, 0.3); S.flags = F.SIN_SUELO; S.luz = 0;
      lanzar(B, p.x + Math.cos(a) * r, Math.max(0.1, y - 0.5 + rr(0, 0.7)), p.z + Math.sin(a) * r, rr(-0.15, 0.15), rr(0.6, 1.6), rr(-0.15, 0.15), rr(0.8, 1.5), 0.3 * e, 0.12 * e, ESTRELLA, c0, c1, c2);
    }
    if (n >= 3) {
      S.flags = F.PLANO | F.SALE | F.SIN_SUELO; S.luz = 0;
      lanzar(B, p.x, 0.1, p.z, 0, 0, 0, 0.7, 0.3 * e, 2.0 * e, ANILLO, [c0[0] * 0.6, c0[1] * 0.6, c0[2] * 0.6, 0.7], c1, c2);
      disco(p.x, Math.max(0.3, y - 0.2), p.z, 1.4 * e, 0.8 * e, 0.4, [c[0], c[1], c[2], 0.28], [c[0], c[1], c[2], 0.18], [c[0], c[1], c[2], 0]);
    }
  }

  function onda(p, op = {}) {
    const e = op.escala ?? 1;
    const c = col(op.color ?? 0xffb070), m = 3.4 / Math.max(c[0], c[1], c[2], 0.05);
    const c0 = [c[0] * m, c[1] * m, c[2] * m, 0.9], c1 = [c[0] * m * 0.6, c[1] * m * 0.6, c[2] * m * 0.6, 0.55], c2 = [c[0], c[1], c[2], 0];
    const y = Math.max(0.12, Y(p, 0.15));
    for (let i = 0; i < 2; i++) {
      S.t0 = i * 0.06; S.flags = F.PLANO | F.SALE | F.SIN_SUELO; S.luz = 0; S.rot = 0;
      lanzar(B, p.x, y, p.z, 0, 0, 0, 0.6 - i * 0.1, 0.4 * e, (6.4 - i * 1.6) * e, ANILLO, c0, c1, c2);
    }
    S.flags = F.SALE | F.SIN_SUELO; S.luz = 0;
    lanzar(B, p.x, y + 0.2, p.z, 0, 0, 0, 0.3, 0.3 * e, 4.0 * e, ANILLO, [c0[0], c0[1], c0[2], 0.45], [c1[0], c1[1], c1[2], 0.25], c2);
    disco(p.x, y + 0.4, p.z, 3.2 * e, 1.2 * e, 0.22, [c[0] * 1.5, c[1] * 1.5, c[2] * 1.5, 0.45], [c[0], c[1], c[2], 0.2], [c[0], c[1], c[2], 0]);
  }

  function aparicion(p, op = {}) {
    const e = op.escala ?? 1, c = col(op.color ?? 0x9ff0c0), m = 2.6 / Math.max(c[0], c[1], c[2], 0.05);
    const c0 = [c[0] * m, c[1] * m, c[2] * m, 0.9], c1 = [c[0] * m * 0.6, c[1] * m * 0.6, c[2] * m * 0.6, 0.6], c2 = [c[0], c[1], c[2], 0];
    S.flags = F.PLANO | F.SALE | F.SIN_SUELO; S.luz = 0;
    lanzar(B, p.x, 0.1, p.z, 0, 0, 0, 0.6, 0.3 * e, 2.6 * e, ANILLO, c0, c1, c2);
    polvo({ x: p.x, y: 0.2, z: p.z }, { escala: 0.8 * e, cantidad: cnt(op.cantidad ?? 4) });
    for (let i = 0; i < cnt(5); i++) {
      const a = rng() * TAU, r = rr(0.2, 0.9) * e;
      S.drag = 0.6; S.grav = -0.8; S.flags = F.SIN_SUELO; S.luz = 0;
      lanzar(B, p.x + Math.cos(a) * r, 0.1, p.z + Math.sin(a) * r, 0, rr(1.5, 3.2), 0, rr(0.6, 1.0), 0.12 * e, 0.04 * e, BRILLO, c0, c1, c2);
    }
  }

  function singularidad(p, op = {}) {
    const e = op.escala ?? 1, y = Y(p, 0.8);
    // núcleo oscuro que traga la luz
    S.drag = 0; S.rot = rng() * TAU; S.flags = F.SIN_SUELO; S.luz = 0;
    lanzar(H, p.x, y, p.z, 0, 0, 0, 0.34, 1.4 * e, 1.9 * e, DISCO, [0.0, 0.0, 0.0, 0.0], [0.01, 0.0, 0.03, 0.85], [0.0, 0.0, 0.0, 0]);
    disco(p.x, y, p.z, 3.4 * e, 2.2 * e, 0.34, [1.1, 0.4, 2.4, 0.5], [0.7, 0.25, 1.9, 0.35], [0.2, 0.05, 0.6, 0]);
    // anillo de acreción que gira
    S.drag = 0; S.rot = rng() * TAU; S.rotV = 4; S.flags = F.SIN_SUELO; S.luz = 0;
    lanzar(B, p.x, y, p.z, 0, 0, 0, 0.34, 3.4 * e, 2.4 * e, ANILLO, [3.4, 1.2, 5, 0.85], [2.2, 0.7, 4, 0.6], [0.6, 0.15, 1.4, 0]);
    // estelas que caen hacia el centro
    for (let i = 0; i < cnt(10); i++) {
      const a = rng() * TAU, r = rr(1.8, 3.2) * e, vida = rr(0.28, 0.4);
      S.drag = 0; S.stretch = 0.12; S.flags = F.SIN_SUELO; S.luz = 0;
      lanzar(B, p.x + Math.cos(a) * r, y + rr(-0.5, 0.5) * e, p.z + Math.sin(a) * r, -Math.cos(a) * r / vida * 0.95, 0, -Math.sin(a) * r / vida * 0.95, vida, 0.14 * e, 0.06 * e, ESTELA, [2.6, 1.0, 4.4, 1], [1.8, 0.6, 3.4, 0.8], [0.3, 0.1, 0.8, 0]);
    }
    motor.resplandor(0.1, 0.03, 0.2);
  }

  /** Chorro de lanzallamas dirigido. */
  function llama(p, op = {}) {
    const e = op.escala ?? 1, n = cnt(op.cantidad ?? 3);
    dirDe(op);
    const y = Y(p, 1);
    for (let i = 0; i < n; i++) {
      const a = Math.atan2(DZ, DX) + rr(-0.13, 0.13) * (0.5 + e), v = rr(10, 16) * (0.7 + 0.5 * e);
      const t0 = rr(0.35, 0.55) * (0.7 + 0.5 * e);
      S.drag = 1.15; S.grav = -rr(1.2, 3.2); S.rot = rng() * TAU; S.rotV = rr(-1.5, 1.5); S.nfr = 4; S.flags = F.FUEGO | F.SALE | F.SIN_SUELO; S.luz = 0;
      lanzar(B, p.x, y + rr(-0.05, 0.1), p.z, Math.cos(a) * v, rr(-0.4, 0.8), Math.sin(a) * v, rr(0.42, 0.7), t0, t0 * rr(2.8, 3.8), HUMO, FU0, FU1, FU2);
    }
    if (rng() < 0.7) {
      const a = Math.atan2(DZ, DX) + rr(-0.22, 0.22), v = rr(7, 12);
      S.drag = 0.8; S.grav = 4; S.stretch = 0.03; S.flags = F.SIN_SUELO; S.luz = 0; S.suelo = 0.02;
      lanzar(B, p.x, y, p.z, Math.cos(a) * v, rr(0.4, 2), Math.sin(a) * v, rr(0.4, 0.9), 0.1, 0.05, ESTELA, CHI0, CHI1, CHI2);
    }
    if (rng() < 0.25) {
      S.drag = 0.9; S.grav = -0.8; S.rot = rng() * TAU; S.flags = F.SALE; S.luz = 1;
      const v = rr(5, 9);
      lanzar(H, p.x + DX * 1.5, y, p.z + DZ * 1.5, DX * v, rr(0.8, 1.8), DZ * v, rr(1.2, 2.0), 0.5 * e, rr(1.5, 2.2) * e, (rng() * 4) | 0, HUMO_OSC[0], HUMO_OSC[1], HUMO_OSC[2]);
    }
  }

  // ─────────────────────────────── tabla ───────────────────────────────
  const tabla = {
    fogonazo, humo, sangre, sangre_grande: sangreGrande, chispas, astillas, polvo, piedra,
    explosion: (p, o) => explosion(p, o, false), explosion_grande: (p, o) => explosion(p, o, true),
    fuego, gas_toxico: gasToxico, acido, plasma, electrico, vapor, casquillo, curacion, onda, aparicion, salpicadura, singularidad, llama,
  };
  return { tabla, fuegoCont, explosion, sangre, sangreGrande, polvo, chispas, astillas, piedra, plasma, esquirlas };
}
