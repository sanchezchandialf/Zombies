// Muertes físicas: cuerpo rígido (varilla con radio) con gravedad, rebote y fricción para el cadáver y para cada miembro
// desmembrado; los miembros se animan con resortes (muñeco). Sangre, fuego y desintegración se encadenan con juego.fx.
import { J, NJ, PADRE, G, articular, matDeQuat, integrarQuat, ease, clamp01 } from './matematica.js';

const GRAV = 9.81;
const R9 = new Float32Array(9);

export function nuevaVarilla() {
  return { cx: 0, cy: 0, cz: 0, vx: 0, vy: 0, vz: 0, q: [0, 0, 0, 1], wx: 0, wy: 0, wz: 0, ux: 0, uy: 1, uz: 0, h: 0.5, r: 0.15, I: 0.1,
    c0x: 0, c0y: 0, c0z: 0, dormido: false, tQuieto: 0, impacto: 0, rebote: 0.28, mu: 0.85 };
}

/** Avanza la varilla; devuelve la intensidad del mayor impacto con el suelo (para animar y emitir sangre). */
export function pasoVarilla(b, dt) {
  if (b.dormido) return 0;
  const n = Math.min(8, Math.ceil(dt * 120)), sdt = dt / n;
  let mayor = 0;
  const I = b.I;
  for (let s = 0; s < n; s++) {
    b.vy -= GRAV * sdt;
    b.cx += b.vx * sdt; b.cy += b.vy * sdt; b.cz += b.vz * sdt;
    integrarQuat(b.q, b.wx, b.wy, b.wz, sdt);
    matDeQuat(R9, 0, b.q[0], b.q[1], b.q[2], b.q[3]);
    const ax = (R9[0] * b.ux + R9[3] * b.uy + R9[6] * b.uz) * b.h, ay = (R9[1] * b.ux + R9[4] * b.uy + R9[7] * b.uz) * b.h, az = (R9[2] * b.ux + R9[5] * b.uy + R9[8] * b.uz) * b.h;
    for (let e = -1; e <= 1; e += 2) {
      const rx = e * ax, ry = e * ay - b.r, rz = e * az;
      const py = b.cy + ry;
      if (py >= 0) continue;
      b.cy -= py;
      const vpx = b.vx + (b.wy * rz - b.wz * ry), vpy = b.vy + (b.wz * rx - b.wx * rz), vpz = b.vz + (b.wx * ry - b.wy * rx);
      if (vpy >= 0) continue;
      const denom = 1 + (rx * rx + rz * rz) / I;
      const rest = vpy < -2 ? b.rebote : 0;
      const j = -(1 + rest) * vpy / denom;
      b.vy += j; b.wx += -rz * j / I; b.wz += rx * j / I;
      if (-vpy > mayor) mayor = -vpy;
      const st = Math.hypot(vpx, vpz);
      if (st > 1e-4) {
        const dT = 1 + (rx * rx + ry * ry + rz * rz) / I * 0.6;
        const jt = Math.min(st / dT, b.mu * j * 1.0 + 0.0);
        const tx = -vpx / st * jt, tz = -vpz / st * jt;
        b.vx += tx; b.vz += tz;
        b.wx += (ry * tz - rz * 0) / I; b.wy += (rz * tx - rx * tz) / I; b.wz += (rx * 0 - ry * tx) / I;
      }
    }
    const am = Math.exp(-0.35 * sdt);
    b.vx *= am; b.vz *= am; b.wx *= am; b.wy *= am; b.wz *= am;
    if (b.cy < b.r * 1.6 + b.h * 0.2 && Math.abs(ay) < b.h * 0.4) { const f = Math.exp(-1.8 * sdt); b.wy *= f; }
  }
  const lento = Math.hypot(b.vx, b.vy, b.vz) < 0.25 && Math.hypot(b.wx, b.wy, b.wz) < 0.6;
  b.tQuieto = lento ? b.tQuieto + dt : 0;
  if (b.tQuieto > 0.45) { b.dormido = true; b.vx = b.vy = b.vz = b.wx = b.wy = b.wz = 0; }
  return mayor;
}

/** Transforma 12 floats (src) con la rotación relativa y la posición de la varilla → dst. */
export function aplicarDelta(dst, o, src, so, b) {
  matDeQuat(R9, 0, b.q[0], b.q[1], b.q[2], b.q[3]);
  const a0 = R9[0], a1 = R9[1], a2 = R9[2], b0 = R9[3], b1 = R9[4], b2 = R9[5], c0 = R9[6], c1 = R9[7], c2 = R9[8];
  for (let k = 0; k < 9; k += 3) {
    const x = src[so + k], y = src[so + k + 1], z = src[so + k + 2];
    dst[o + k] = a0 * x + b0 * y + c0 * z; dst[o + k + 1] = a1 * x + b1 * y + c1 * z; dst[o + k + 2] = a2 * x + b2 * y + c2 * z;
  }
  const x = src[so + 9] - b.c0x, y = src[so + 10] - b.c0y, z = src[so + 11] - b.c0z;
  dst[o + 9] = a0 * x + b0 * y + c0 * z + b.cx; dst[o + 10] = a1 * x + b1 * y + c1 * z + b.cy; dst[o + 11] = a2 * x + b2 * y + c2 * z + b.cz;
}

const GRUPOS_J = [[], [J.CABEZA, J.MANDIBULA, J.X2], [J.BRAZO_I, J.ANTEBRAZO_I], [J.BRAZO_D, J.ANTEBRAZO_D], [J.MUSLO_I, J.TIBIA_I, J.PIE_I], [J.MUSLO_D, J.TIBIA_D, J.PIE_D]];
const LAX = new Float32Array(NJ * 3);

/** Inicia la muerte de un visual. sis = estado del sistema (juego, restos, cadaveres, rng). */
export function iniciarMuerte(sis, it, info) {
  const { juego } = sis;
  const dirL = Math.hypot(info.dirX || 0, info.dirZ || 0);
  let dx = dirL > 0.01 ? info.dirX / dirL : Math.sin(it.rot + Math.PI), dz = dirL > 0.01 ? info.dirZ / dirL : Math.cos(it.rot + Math.PI);
  const fuerza = Math.max(0, info.fuerza ?? 0.5), tipo = info.tipo || 'bala';
  const rnd = sis.rng;
  it.vivo = false; it.estadoV = 'muerto'; it.acc = null; it.golpe = null;
  it.tMuerte = 0; it.ttl = 15 + rnd() * 7; it.hundido = 0; it.fx[2] = 0;
  const explosivo = tipo === 'explosivo';
  const fuego = tipo === 'fuego', energia = tipo === 'energia';
  const vuela = explosivo || fuerza > 1.15;
  const desm = (explosivo && fuerza > 0.6) || fuerza > 1.9 || (tipo === 'perforante' && fuerza > 1.2 && rnd() < 0.5);
  it.modoMuerte = energia ? 'energia' : fuego ? 'fuego' : 'caida';
  // varilla del cuerpo
  const b = it.varilla = nuevaVarilla();
  const alto = it.altura, r = Math.max(0.14, it.d.tw * 0.45);
  b.r = r; b.h = Math.max(0.2, (alto * 0.88 - 2 * r) / 2);
  b.I = b.h * b.h / 3 + r * r * 0.25 + 0.03;
  const hc = r + b.h;
  // matriz de raíz al morir
  const W = it.W;
  it.W0 = new Float32Array(12); for (let i = 0; i < 12; i++) it.W0[i] = W[i];
  b.c0x = W[9] + W[3] * hc; b.c0y = W[10] + W[4] * hc; b.c0z = W[11] + W[5] * hc;      // centro = origen + eje Y local * hc
  b.cx = b.c0x; b.cy = b.c0y; b.cz = b.c0z;
  b.ux = W[3]; b.uy = W[4]; b.uz = W[5]; const ul = Math.hypot(b.ux, b.uy, b.uz); b.ux /= ul; b.uy /= ul; b.uz /= ul;
  b.vx = it.vx * 0.5; b.vz = it.vz * 0.5;
  const sp = vuela ? 5 + fuerza * 5 : 0.5 + fuerza * 2.2;
  b.vx += dx * sp; b.vz += dz * sp; b.vy = vuela ? 3.5 + fuerza * 2.6 : 0.3;
  const om = vuela ? 5 + fuerza * 5 : 1.4 + fuerza * 2.4;
  // eje de vuelco = Y × dir
  b.wx = dz * om * -1 * -1; b.wy = (rnd() - 0.5) * 2 * (vuela ? 4 : 0.8); b.wz = -dx * om;
  b.wx = dz * om; // (up × dir) = (dz, 0, -dx)
  b.wz = -dx * om;
  b.rebote = vuela ? 0.34 : 0.2;
  // resortes de las extremidades
  it.LA = new Float32Array(NJ * 3); it.LV = new Float32Array(NJ * 3);
  for (let i = 0; i < NJ * 3; i++) { it.LA[i] = it.A[i]; it.LV[i] = (rnd() - 0.5) * (vuela ? 14 : 5); }
  it.LV[J.BRAZO_I * 3] -= 4 * fuerza; it.LV[J.BRAZO_D * 3] -= 4 * fuerza;
  // laxos de reposo (aleatorios por zombi)
  const L = it.lax = new Float32Array(NJ * 3);
  L[J.BRAZO_I * 3] = (rnd() - 0.5) * 0.8; L[J.BRAZO_D * 3] = (rnd() - 0.5) * 0.8;
  L[J.BRAZO_I * 3 + 2] = -0.25 - rnd() * 0.5; L[J.BRAZO_D * 3 + 2] = 0.25 + rnd() * 0.5;
  L[J.ANTEBRAZO_I * 3] = -0.2 - rnd() * 0.5; L[J.ANTEBRAZO_D * 3] = -0.2 - rnd() * 0.5;
  L[J.MUSLO_I * 3] = -0.1 + rnd() * 0.4; L[J.MUSLO_D * 3] = -0.1 + rnd() * 0.4;
  L[J.MUSLO_I * 3 + 2] = -0.1 - rnd() * 0.2; L[J.MUSLO_D * 3 + 2] = 0.1 + rnd() * 0.2;
  L[J.TIBIA_I * 3] = rnd() * 0.5; L[J.TIBIA_D * 3] = rnd() * 0.5;
  L[J.CABEZA * 3 + 2] = (rnd() - 0.5) * 0.7; L[J.CABEZA * 3] = (rnd() - 0.5) * 0.6; L[J.MANDIBULA * 3] = 0.3 + rnd() * 0.4;
  L[J.TORSO * 3] = (rnd() - 0.5) * 0.2;
  // FX de la muerte
  const px = it.x, pz = it.z, py = 1.1;
  const fx = juego.fx;
  fx?.emitir?.(explosivo ? 'sangre_grande' : 'sangre', { x: px, y: py, z: pz }, { dirX: dx, dirY: 0.3, dirZ: dz, escala: explosivo ? 1.4 : 0.9 + fuerza * 0.2 });
  fx?.calco?.('sangre', px + dx * 0.5, pz + dz * 0.5, (explosivo ? 2.2 : 1.1) + rnd() * 0.8, { dirX: dx, dirZ: dz });
  if (energia) {
    fx?.emitir?.('plasma', { x: px, y: py, z: pz }, { escala: 0.8, cantidad: 16 });
    fx?.emitir?.('chispas', { x: px, y: py, z: pz }, { escala: 0.9, cantidad: 14 });
  }
  if (fuego) {
    fx?.emitir?.('fuego', { x: px, y: 0.8, z: pz }, { escala: 0.8 });
    it.emisor = fx?.crearEmisor?.('fuego', { x: px, y: 0.4, z: pz }, { escala: 0.9 }) || null;
    it.tFuego = 2.4 + rnd() * 1.6;
  }
  if (desm) {
    const n = Math.min(5, 1 + Math.floor(fuerza * 1.5 + rnd() * 1.6));
    const orden = [1, 2, 3, 4, 5].sort(() => rnd() - 0.5);
    for (let k = 0; k < n; k++) separar(sis, it, orden[k], dx, dz, fuerza, explosivo);
  } else if (tipo === 'bala' && fuerza > 0.8 && rnd() < 0.22 + 0.2 * (fuerza - 0.8)) {
    separar(sis, it, G.CABEZA, dx, dz, fuerza, false);
  }
  // reciclaje de cadáveres
  sis.cadaveres.push(it);
  while (sis.cadaveres.length > sis.maxCadaveres) { const v = sis.cadaveres.shift(); if (v.estadoV === 'muerto') v.ttl = Math.min(v.ttl, v.tMuerte + 0.2); }
}

function separar(sis, it, grupo, dx, dz, fuerza, explosivo) {
  const { juego } = sis, rnd = sis.rng;
  if (it.mascara & (1 << grupo)) return;
  if (grupo === G.BRAZO_I && it.brazoFalta === -1 || grupo === G.BRAZO_D && it.brazoFalta === 1) return;
  it.mascara |= 1 << grupo;
  const W = it.W, js = GRUPOS_J[grupo];
  const r = nuevaVarilla();
  const t = (j) => [W[j * 12 + 9], W[j * 12 + 10], W[j * 12 + 11]];
  const yAx = (j) => [W[j * 12 + 3], W[j * 12 + 4], W[j * 12 + 5]];
  let a, bpt;
  if (grupo === G.CABEZA) {
    const y = yAx(J.CABEZA), p = t(J.CABEZA), hr = it.d.hr;
    a = [p[0] + y[0] * hr * 0.4, p[1] + y[1] * hr * 0.4, p[2] + y[2] * hr * 0.4]; bpt = [p[0] + y[0] * hr * 1.5, p[1] + y[1] * hr * 1.5, p[2] + y[2] * hr * 1.5];
    r.r = hr * 0.95; 
  } else {
    const ult = js[js.length - 1], y = yAx(ult), p1 = t(js[0]), p2 = t(ult);
    const largo = grupo <= 3 ? it.d.fa * 1.35 : it.d.tibia * 1.0;
    a = p1; bpt = [p2[0] - y[0] * largo, p2[1] - y[1] * largo, p2[2] - y[2] * largo];
    r.r = grupo <= 3 ? 0.06 : 0.08;
  }
  r.c0x = r.cx = (a[0] + bpt[0]) / 2; r.c0y = r.cy = (a[1] + bpt[1]) / 2; r.c0z = r.cz = (a[2] + bpt[2]) / 2;
  const ex = bpt[0] - a[0], ey = bpt[1] - a[1], ez = bpt[2] - a[2], len = Math.hypot(ex, ey, ez) || 0.2;
  r.ux = ex / len; r.uy = ey / len; r.uz = ez / len; r.h = Math.max(0.03, len / 2 - r.r);
  r.I = r.h * r.h / 3 + r.r * r.r * 0.25 + 0.02;
  const sp = explosivo ? 4 + fuerza * 5 : 1.5 + fuerza * 3;
  const lat = (rnd() - 0.5) * 2;
  r.vx = it.varilla.vx + dx * sp + -dz * lat * sp * 0.6 + (rnd() - 0.5) * 2; r.vz = it.varilla.vz + dz * sp + dx * lat * sp * 0.6 + (rnd() - 0.5) * 2;
  r.vy = (explosivo ? 4 : 2) + rnd() * 4 + fuerza;
  r.wx = (rnd() - 0.5) * 24; r.wy = (rnd() - 0.5) * 12; r.wz = (rnd() - 0.5) * 24;
  r.rebote = 0.38;
  const resto = { modelo: it.modelo, mascara: ~(1 << grupo) & 63, grupo, varilla: r, W: new Float32Array(NJ * 12), Wsnap: new Float32Array(W), js,
    fx: [0, it.fx[1], 0, 0], tinte: it.tinte, t: 0, ttl: 14 + rnd() * 6, hundido: 0, semilla: it.semilla, tSangre: 0, nSangre: 0, cae: false, lax: 0 };
  sis.restos.push(resto);
  while (sis.restos.length > sis.maxRestos) sis.restos.shift();
  juego.fx?.emitir?.('sangre_grande', { x: r.cx, y: r.cy, z: r.cz }, { dirX: dx, dirY: 0.5, dirZ: dz, escala: 0.8 });
}

/** Actualiza el cadáver: física, resortes de miembros, fuego/desintegración, hundimiento. Devuelve false si debe liberarse. */
export function actualizarMuerto(sis, it, dt) {
  const b = it.varilla, rnd = sis.rng;
  it.tMuerte += dt;
  const imp = pasoVarilla(b, dt);
  if (imp > 1.2) {
    const k = Math.min(1, imp / 7);
    for (const j of [J.BRAZO_I, J.BRAZO_D, J.MUSLO_I, J.MUSLO_D, J.CABEZA, J.TORSO]) { it.LV[j * 3] += (rnd() - 0.5) * 22 * k; it.LV[j * 3 + 2] += (rnd() - 0.5) * 22 * k; }
    if (it.tMuerte - (it.tSangreT || -1) > 0.25 && imp > 2.5 && sis.juego.fx) { it.tSangreT = it.tMuerte; sis.juego.fx.emitir?.('sangre', { x: b.cx, y: 0.2, z: b.cz }, { escala: 0.6 }); }
  }
  if (b.dormido && !it.reposo) {
    it.reposo = true;
    sis.juego.fx?.calco?.('sangre', b.cx, b.cz, 1.3 + rnd() * 0.8 + (it.modoMuerte === 'fuego' ? 0 : 0.3));
    if (it.modoMuerte === 'fuego') sis.juego.fx?.calco?.('quemadura', b.cx, b.cz, 1.6);
  }
  // resortes
  const kS = 38, kD = 6;
  const LA = it.LA, LV = it.LV, L = it.lax;
  for (let i = 0; i < NJ * 3; i++) {
    const tgt = L[i];
    LV[i] += (-kS * (LA[i] - tgt) - kD * LV[i]) * dt;
    LA[i] += LV[i] * dt;
  }
  // fuego / energía
  const fxv = it.fx;
  if (it.modoMuerte === 'fuego') {
    fxv[1] = clamp01(it.tMuerte / 2.2) * 0.96;
    const q = it.tFuego - it.tMuerte;
    fxv[0] = q > 0 ? (0.55 + 0.35 * Math.sin(it.tMuerte * 18)) * clamp01(q / 0.8) : Math.max(0, fxv[0] - dt * 0.6);
    if (it.emisor) { it.emisor.pos.x = b.cx; it.emisor.pos.z = b.cz; it.emisor.pos.y = Math.max(0.2, b.cy - 0.2); if (q <= 0) { it.emisor.detener?.(); it.emisor = null; } }
  } else if (it.modoMuerte === 'energia') {
    const u = clamp01((it.tMuerte - 0.12) / 1.15);
    fxv[3] = u; fxv[2] = 0.25 * (1 - u);
    if (u > 0 && (it.tMuerte * 14) % 1 < dt * 14 && sis.juego.fx) sis.juego.fx.emitir?.('chispas', { x: b.cx + (rnd() - 0.5), y: b.cy + (rnd() - 0.2), z: b.cz + (rnd() - 0.5) }, { escala: 0.5, cantidad: 3 });
    if (u >= 1) return false;
  }
  // hundimiento al final de su vida
  if (it.tMuerte > it.ttl) { it.hundido += dt * 0.55; if (it.hundido > 0.62) return false; }
  // matriz raíz del cadáver
  const W = it.W;
  aplicarDelta(W, 0, it.W0, 0, b);
  const q = it.q; q.sX0 = 1;
  const A = it.A;
  A.set(LA);
  const rest = it.rest;
  for (let j = 1; j < NJ; j++) { const o3 = j * 3; articular(W, j * 12, W, PADRE[j] * 12, rest[o3], rest[o3 + 1], rest[o3 + 2], A[o3], A[o3 + 1], A[o3 + 2], 1); }
  if (it.hundido > 0) for (let j = 0; j < NJ; j++) W[j * 12 + 10] -= it.hundido;
  return true;
}

/** Actualiza un miembro desmembrado. Devuelve false cuando debe retirarse. */
export function actualizarResto(sis, r, dt) {
  const b = r.varilla;
  r.t += dt;
  const imp = pasoVarilla(b, dt);
  if (imp > 2.5 && r.nSangre < 3 && r.t - r.tSangre > 0.2) { r.tSangre = r.t; r.nSangre++; sis.juego.fx?.emitir?.('sangre', { x: b.cx, y: 0.15, z: b.cz }, { escala: 0.55 }); if (r.nSangre === 1) sis.juego.fx?.calco?.('sangre', b.cx, b.cz, 0.7 + sis.rng() * 0.4); }
  if (r.t > r.ttl) { r.hundido += dt * 0.6; if (r.hundido > 0.55) return false; }
  const W = r.W;
  for (const j of r.js) aplicarDelta(W, j * 12, r.Wsnap, j * 12, b);
  if (r.hundido > 0) for (const j of r.js) W[j * 12 + 10] -= r.hundido;
  return true;
}
