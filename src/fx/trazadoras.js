// Trazadoras: cintas orientadas a cámara en una sola malla dinámica (48 ranuras × 48 puntos), una sola llamada de dibujo.
// Tipos: bala (estela que viaja), pulso (bola de energía con cola), riel (núcleo + espiral que se disipa), aguja (muy fina y rápida),
// arco (rayo quebrado que parpadea, con ramas) y laser (haz continuo).
import * as THREE from 'three';

const SLOTS = 48, MAXP = 48;
const VS = /* glsl */`
attribute vec4 aCol; attribute float aAcross;
varying vec4 vCol; varying float vAcross;
void main() { vCol = aCol; vAcross = aAcross; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`;
const FS = /* glsl */`
varying vec4 vCol; varying float vAcross;
void main() {
  float x = abs(vAcross);
  float nucleo = pow(max(0.0, 1.0 - x), 2.6);
  float halo = exp(-x * x * 3.4) * (1.0 - smoothstep(0.7, 1.0, x));
  vec3 c = vCol.rgb * (nucleo * 1.35 + halo * 0.5) + vec3(nucleo * nucleo * 0.7) * vCol.a;
  gl_FragColor = vec4(c * vCol.a, 0.0);
}
`;

const _c = new THREE.Color();
const hexA = (h, m = 1) => { _c.set(h); return [_c.r * m, _c.g * m, _c.b * m]; };
const COLORES = {
  bala: [3.4, 2.3, 0.95], pulso: [0.5, 2.6, 3.4], riel: [1.4, 2.2, 3.6], aguja: [3.2, 0.9, 2.6], arco: [1.7, 1.5, 3.8], laser: [3.4, 0.5, 0.45],
};

export function crearTrazadoras(juego, escena) {
  const nV = SLOTS * MAXP * 2;
  const pos = new Float32Array(nV * 3), col = new Float32Array(nV * 4), acr = new Float32Array(nV);
  for (let s = 0; s < SLOTS * MAXP; s++) { acr[s * 2] = -1; acr[s * 2 + 1] = 1; }
  const idx = new Uint16Array(SLOTS * (MAXP - 1) * 6);
  let k = 0;
  for (let s = 0; s < SLOTS; s++) for (let i = 0; i < MAXP - 1; i++) {
    const a = (s * MAXP + i) * 2;
    idx[k++] = a; idx[k++] = a + 1; idx[k++] = a + 2; idx[k++] = a + 1; idx[k++] = a + 3; idx[k++] = a + 2;
  }
  const g = new THREE.BufferGeometry();
  const aPos = new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage), aCol = new THREE.BufferAttribute(col, 4).setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('position', aPos); g.setAttribute('aCol', aCol); g.setAttribute('aAcross', new THREE.BufferAttribute(acr, 1));
  g.setIndex(new THREE.BufferAttribute(idx, 1));
  const mat = new THREE.ShaderMaterial({
    vertexShader: VS, fragmentShader: FS, transparent: true, depthWrite: false, depthTest: true, toneMapped: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor, blendSrcAlpha: THREE.OneFactor, blendDstAlpha: THREE.OneFactor,
  });
  const malla = new THREE.Mesh(g, mat);
  malla.frustumCulled = false; malla.renderOrder = 10; malla.name = 'fx_trazadoras';
  escena.add(malla);

  // estado de las ranuras
  const act = new Uint8Array(SLOTS), tipo = new Uint8Array(SLOTS), semilla = new Float32Array(SLOTS);
  const T = new Float32Array(SLOTS), D = new Float32Array(SLOTS), VEL = new Float32Array(SLOTS), LARGO = new Float32Array(SLOTS), ANCHO = new Float32Array(SLOTS);
  const A = new Float32Array(SLOTS * 3), B = new Float32Array(SLOTS * 3), CC = new Float32Array(SLOTS * 3);
  const LEN = new Float32Array(SLOTS), usados = new Uint8Array(SLOTS);
  const TIPOS = ['bala', 'pulso', 'riel', 'aguja', 'arco', 'laser', 'nucleo', 'rama'];
  let sig = 0;
  const rng = juego.rng ?? Math.random;
  const camPos = new THREE.Vector3(0, 20, 20);
  const P = new Float32Array(MAXP * 3), PA = new Float32Array(MAXP), PW = new Float32Array(MAXP);
  const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };

  function ranura(t, ax, ay, az, bx, by, bz, c, dur, ancho, vel, largo) {
    let i = -1;
    for (let n = 0; n < SLOTS; n++) { const j = (sig + n) % SLOTS; if (!act[j]) { i = j; break; } }
    if (i < 0) i = sig;
    sig = (i + 1) % SLOTS;
    act[i] = 1; tipo[i] = t; T[i] = 0; D[i] = dur; ANCHO[i] = ancho; VEL[i] = vel; LARGO[i] = largo; semilla[i] = rng() * 100;
    A[i * 3] = ax; A[i * 3 + 1] = ay; A[i * 3 + 2] = az; B[i * 3] = bx; B[i * 3 + 1] = by; B[i * 3 + 2] = bz;
    CC[i * 3] = c[0]; CC[i * 3 + 1] = c[1]; CC[i * 3 + 2] = c[2];
    LEN[i] = Math.hypot(bx - ax, by - ay, bz - az);
    return i;
  }

  /** desde, hasta {x,y,z}; opciones { tipo, color, ancho, duracion } */
  function crear(desde, hasta, o = {}) {
    const t = o.tipo ?? 'bala';
    const base = COLORES[t] ?? COLORES.bala;
    let c = base;
    if (o.color !== undefined && o.color !== null) { c = hexA(o.color, 1); const m = Math.max(c[0], c[1], c[2]) || 1; const k = (t === 'riel' || t === 'arco' ? 3.4 : 3) / m; c = [c[0] * k + 0.1, c[1] * k + 0.1, c[2] * k + 0.1]; }
    const ax = desde.x, ay = desde.y ?? 1, az = desde.z, bx = hasta.x, by = hasta.y ?? 1, bz = hasta.z;
    const L = Math.hypot(bx - ax, by - ay, bz - az);
    switch (t) {
      case 'bala': ranura(0, ax, ay, az, bx, by, bz, c, 0.07 + L / 320, o.ancho ?? 0.05, 320, Math.min(3.2, 1 + L * 0.12)); break;
      case 'pulso': ranura(1, ax, ay, az, bx, by, bz, c, 0.07 + L / 130, o.ancho ?? 0.2, 130, Math.min(4.5, 1.5 + L * 0.14)); break;
      case 'aguja': ranura(3, ax, ay, az, bx, by, bz, c, 0.06 + L / 420, o.ancho ?? 0.028, 420, Math.min(6, 2 + L * 0.2)); break;
      case 'riel': ranura(6, ax, ay, az, bx, by, bz, c, 0.34, o.ancho ?? 0.13, 0, 0); ranura(2, ax, ay, az, bx, by, bz, c, 0.7, 0.05, 0, 0); break;
      case 'arco': {
        const i = ranura(4, ax, ay, az, bx, by, bz, c, o.duracion ?? 0.16, o.ancho ?? 0.07, 0, 0);
        const nr = L > 2.5 ? 2 : 1;
        for (let r = 0; r < nr; r++) { const j = ranura(7, ax, ay, az, bx, by, bz, c, o.duracion ?? 0.16, (o.ancho ?? 0.07) * 0.6, 0, 0); semilla[j] = semilla[i] + 7.3 * (r + 1); VEL[j] = 0.25 + rng() * 0.5; }
        break;
      }
      case 'laser': ranura(5, ax, ay, az, bx, by, bz, c, o.duracion ?? 0.12, o.ancho ?? 0.06, 0, 0); break;
      default: ranura(0, ax, ay, az, bx, by, bz, c, 0.1, 0.05, 300, 2); break;
    }
  }

  // ───── generación de puntos por tipo (en P/PA/PW), devuelve el número de puntos ─────
  function recta(i, s0, s1, n, anchoFn, alfaFn) {
    const ax = A[i * 3], ay = A[i * 3 + 1], az = A[i * 3 + 2], dx = B[i * 3] - ax, dy = B[i * 3 + 1] - ay, dz = B[i * 3 + 2] - az;
    for (let k = 0; k < n; k++) {
      const u = n > 1 ? k / (n - 1) : 0, s = s0 + (s1 - s0) * u;
      P[k * 3] = ax + dx * s; P[k * 3 + 1] = ay + dy * s; P[k * 3 + 2] = az + dz * s;
      PW[k] = anchoFn(u, s); PA[k] = alfaFn(u, s);
    }
    return n;
  }

  function generar(i) {
    const t = T[i], d = D[i], f = t / d, ty = tipo[i], L = LEN[i];
    if (L < 1e-4) return 0;
    const w = ANCHO[i];
    switch (ty) {
      case 0: case 1: case 3: {            // proyectil con cola
        const avance = Math.min(1, (t * VEL[i]) / L);
        const cabeza = avance, cola = Math.max(0, avance - LARGO[i] / L);
        const fin = t * VEL[i] > L ? Math.max(0, 1 - (t * VEL[i] - L) / (LARGO[i] + 1)) : 1;
        const n = 8;
        const pulso = ty === 1;
        return recta(i, cola, cabeza, n, (u) => w * (pulso ? 0.35 + 0.65 * u : 0.3 + 0.7 * u), (u) => Math.pow(u, 1.4) * fin * (1 - f * f * 0.5));
      }
      case 5: {                             // láser: haz estable con un leve latido
        const a = (1 - f * f) * (0.88 + 0.12 * Math.sin(t * 90 + semilla[i]));
        return recta(i, 0, 1, 2, () => w * (1 + 0.15 * Math.sin(t * 70)), () => a);
      }
      case 6: {                             // núcleo del riel
        return recta(i, 0, 1, 2, () => w * (1 - f * 0.7), () => Math.pow(1 - f, 2.2) * 1.6);
      }
      case 2: {                             // espiral del riel
        const n = MAXP, ax = A[i * 3], ay = A[i * 3 + 1], az = A[i * 3 + 2];
        const dx = (B[i * 3] - ax) / L, dy = (B[i * 3 + 1] - ay) / L, dz = (B[i * 3 + 2] - az) / L;
        // base ortonormal alrededor del eje
        let ux = -dz, uy = 0, uz = dx; let ul = Math.hypot(ux, uz); if (ul < 1e-4) { ux = 1; uz = 0; ul = 1; } ux /= ul; uz /= ul;
        const vx = dy * uz - dz * uy, vy = dz * ux - dx * uz, vz = dx * uy - dy * ux;
        const vueltas = L * 0.55;
        for (let k = 0; k < n; k++) {
          const s = k / (n - 1), ang = s * vueltas * 6.2832 + t * 9 + semilla[i];
          const rad = (0.2 + 0.5 * f) * (0.35 + 0.65 * Math.sin(s * 3.1416)) * (1 - f * 0.4);
          const co = Math.cos(ang) * rad, si = Math.sin(ang) * rad;
          P[k * 3] = ax + dx * L * s + ux * co + vx * si; P[k * 3 + 1] = ay + dy * L * s + uy * co + vy * si; P[k * 3 + 2] = az + dz * L * s + uz * co + vz * si;
          PW[k] = w * (1 - f * 0.5); PA[k] = Math.pow(Math.max(0, 1 - f * (1.2 + (1 - s) * 0.9)), 1.6) * 0.9;
        }
        return n;
      }
      case 4: case 7: {                     // rayo quebrado: se regenera a ~28 Hz
        const paso = Math.floor(t * 28), sd = semilla[i] + paso * 3.17;
        const ax = A[i * 3], ay = A[i * 3 + 1], az = A[i * 3 + 2];
        let dx = B[i * 3] - ax, dy = B[i * 3 + 1] - ay, dz = B[i * 3 + 2] - az;
        let n = Math.min(MAXP, Math.max(5, Math.ceil(L / 0.42)));
        let ox = 0, oy = 0, oz = 0, sx0 = 0, sx1 = 1;
        let ux = -dz, uz = dx; let ul = Math.hypot(ux, uz) || 1; ux /= ul; uz /= ul;     // lateral horizontal
        const vx = (dy * uz), vy = (dz * ux - dx * uz) / L, vz = -(dy * ux);            // vertical aprox.
        let base = 1;
        if (ty === 7) {                      // rama: parte de un punto del rayo principal hacia un lado
          const s0 = 0.2 + hash(sd, 1) * 0.6; sx0 = s0;
          ox = dx * s0; oy = dy * s0; oz = dz * s0;
          const ang = (hash(sd, 2) - 0.5) * 2.2, len = L * (0.18 + hash(sd, 3) * 0.2);
          const c = Math.cos(ang), s = Math.sin(ang);
          const ndx = (dx * c + ux * L * s) / L * len, ndz = (dz * c + uz * L * s) / L * len, ndy = (hash(sd, 4) - 0.5) * len * 0.6;
          dx = ndx; dy = ndy; dz = ndz; n = Math.min(MAXP, Math.max(4, Math.ceil(len / 0.35))); base = 0.6;
        }
        const Ll = Math.hypot(dx, dy, dz) || 1, desv = 0.13 + Ll * 0.012;
        for (let k = 0; k < n; k++) {
          const s = k / (n - 1), amort = Math.sin(s * 3.1416);
          const j1 = (hash(sd + k, 5) - 0.5) * 2 * desv * amort, j2 = (hash(sd + k, 6) - 0.5) * 2 * desv * amort * 0.8;
          P[k * 3] = ax + ox + dx * s + ux * j1; P[k * 3 + 1] = ay + oy + dy * s + j2; P[k * 3 + 2] = az + oz + dz * s + uz * j1;
          PW[k] = w * (0.75 + 0.5 * hash(sd + k, 7)) * base; PA[k] = (1 - f * f) * (0.8 + 0.2 * hash(sd, k)) * (ty === 7 ? 0.75 : 1);
        }
        PA[0] *= 0.6; PA[n - 1] *= ty === 7 ? 0.1 : 0.7;
        return n;
      }
    }
    return 0;
  }

  const lado = new THREE.Vector3(), tan = new THREE.Vector3(), haz = new THREE.Vector3(), pt = new THREE.Vector3();
  function escribir(i, n) {
    const base = i * MAXP;
    for (let k = 0; k < MAXP; k++) {
      const v = (base + k) * 2;
      if (k >= n) {
        const kk = n - 1;
        for (let h = 0; h < 2; h++) { pos[(v + h) * 3] = P[kk * 3]; pos[(v + h) * 3 + 1] = P[kk * 3 + 1]; pos[(v + h) * 3 + 2] = P[kk * 3 + 2]; col[(v + h) * 4 + 3] = 0; }
        continue;
      }
      const a = Math.max(0, k - 1), b = Math.min(n - 1, k + 1);
      tan.set(P[b * 3] - P[a * 3], P[b * 3 + 1] - P[a * 3 + 1], P[b * 3 + 2] - P[a * 3 + 2]);
      pt.set(P[k * 3], P[k * 3 + 1], P[k * 3 + 2]);
      haz.copy(camPos).sub(pt);
      lado.crossVectors(tan, haz);
      const l = lado.length(); if (l < 1e-6) lado.set(0, 1, 0); else lado.divideScalar(l);
      const w = PW[k] * 0.5;
      for (let h = 0; h < 2; h++) {
        const sg = h === 0 ? -1 : 1, o = (v + h) * 3;
        pos[o] = pt.x + lado.x * w * sg; pos[o + 1] = pt.y + lado.y * w * sg; pos[o + 2] = pt.z + lado.z * w * sg;
        const c = (v + h) * 4; col[c] = CC[i * 3]; col[c + 1] = CC[i * 3 + 1]; col[c + 2] = CC[i * 3 + 2]; col[c + 3] = PA[k];
      }
    }
    usados[i] = 1;
  }

  function vaciar(i) {
    const base = i * MAXP * 2;
    pos.fill(0, base * 3, (base + MAXP * 2) * 3); col.fill(0, base * 4, (base + MAXP * 2) * 4); usados[i] = 0;
  }

  let sucio = false;
  function actualizar(dt) {
    const cam = juego.render?.camara; if (cam) camPos.copy(cam.position);
    for (let i = 0; i < SLOTS; i++) {
      if (!act[i]) { if (usados[i]) { vaciar(i); sucio = true; } continue; }
      T[i] += dt;
      if (T[i] >= D[i]) { act[i] = 0; vaciar(i); sucio = true; continue; }
      const n = generar(i);
      if (n >= 2) { escribir(i, n); sucio = true; }
    }
    if (sucio) { aPos.needsUpdate = true; aCol.needsUpdate = true; sucio = false; }
  }
  function limpiar() { for (let i = 0; i < SLOTS; i++) { act[i] = 0; vaciar(i); } aPos.needsUpdate = true; aCol.needsUpdate = true; }
  function liberar() { malla.removeFromParent(); g.dispose(); mat.dispose(); }
  function cuenta() { let n = 0; for (let i = 0; i < SLOTS; i++) n += act[i]; return n; }
  return { crear, actualizar, limpiar, liberar, cuenta };
}
