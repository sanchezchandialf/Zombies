// Caballo de guerra de la Era de la Pólvora: cuadrúpedo articulado con paso, trote y galope procedurales, silla, bridas y estribos.
import * as THREE from 'three';
import { Acum, loft, caja, cilX, cilZ, tubo, torno, esfera, barra, T } from '../geo.js';
import { lib, est } from '../mats.js';
import { mat4, base } from './comun.js';

const C = (h) => new THREE.Color(h);
/** Colorea por vértice: base + oscurecido hacia abajo (`bajo`: y local por debajo del cual pasa al color oscuro) + ruido. */
function pelo(g, col, { oscuro = null, yOsc = -9, yMin = -9, ruido = 0.07, clara = null, yClara = -9, semilla = 1 } = {}) {
  const p = g.attributes.position, n = p.count, arr = new Float32Array(n * 3);
  const c = new THREE.Color(), cd = oscuro ? C(oscuro) : null, cc = clara ? C(clara) : null;
  for (let i = 0; i < n; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
    c.copy(C(col));
    if (cd) { const t = Math.min(1, Math.max(0, (yOsc - y) / 0.12)); c.lerp(cd, t); }
    if (cc) { const t = Math.min(1, Math.max(0, (yClara - y) / 0.05)); c.lerp(cc, t); }
    const h = Math.sin(x * 91.7 + semilla) * 43758.5 + Math.sin(z * 57.3 + y * 31.1 + semilla * 2) * 12345.6;
    const r = (h - Math.floor(h)) - 0.5;
    const k = 1 + r * ruido * 2 + Math.sin(z * 9 + semilla) * 0.025;
    arr[i * 3] = c.r * k; arr[i * 3 + 1] = c.g * k; arr[i * 3 + 2] = c.b * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
const lerp = (a, b, t) => a + (b - a) * t;
const suave = (t) => t * t * (3 - 2 * t);

export function crearCaballo() {
  const { grupo, chasis } = base();
  const corpo = new THREE.Group(); chasis.add(corpo);
  const piel = est('caballo_piel', { color: 0xffffff, vertexColors: true, roughness: 0.72, metalness: 0.0 });
  const M = {
    cuero: lib('cuero', { color: 0x6a3a1c }), cueroO: lib('cuero', { color: 0x2a1a12 }), lona: lib('lona', { color: 0x8c2a22 }), lonaB: lib('lona', { color: 0x4a5a3a }),
    laton: lib('laton_bronce'), acero: lib('acero_cepillado'), hierro: lib('hierro_forjado'), cuerda: lib('cuerda'),
    ojo: est('caballo_ojo', { color: 0x070504, roughness: 0.05, metalness: 0.2 }), pelo: est('caballo_crin', { color: 0x16110d, roughness: 0.9 }),
  };
  const COL = 0x7a4a29, COLO = 0x2b1a12, CRIN = 0x15100c;
  const a = new Acum();
  // ───── torso ─────
  const tor = loft([
    { z: -1.0, w: 0.25, yb: 0.98, yt: 1.30, e: 2.4 },
    { z: -0.75, w: 0.33, yb: 0.88, yt: 1.40, e: 2.5 },
    { z: -0.3, w: 0.355, yb: 0.76, yt: 1.37, e: 2.5 },
    { z: 0.2, w: 0.35, yb: 0.73, yt: 1.40, e: 2.4 },
    { z: 0.6, w: 0.33, yb: 0.77, yt: 1.46, e: 2.4 },
    { z: 0.95, w: 0.29, yb: 0.88, yt: 1.40, e: 2.2 },
    { z: 1.12, w: 0.2, yb: 1.02, yt: 1.32, e: 2.1 },
  ], { aro: 28, pasos: 8 });
  a.add(pelo(tor, COL, { semilla: 1, ruido: 0.06 }), piel);
  // cuello (arco hacia delante y arriba) y base
  a.add(pelo(tubo([[0, 1.24, 0.82], [0, 1.52, 1.0], [0, 1.78, 1.12], [0, 1.96, 1.22]], 0.19, 14, 12, false, 0.105), COL, { semilla: 2, ruido: 0.05 }), piel);
  a.add(pelo(esfera(0.27, 14, 10).scale(1.0, 1.0, 1.15).translate(0, 1.22, 0.78), COL, { semilla: 3 }), piel);
  // cola: nacimiento
  a.add(pelo(esfera(0.13, 10, 8).translate(0, 1.3, -1.0), COL, { semilla: 4 }), piel);
  a.volcar(corpo);
  // ───── cabeza ─────
  const cab = new THREE.Group(); cab.position.set(0, 1.95, 1.22); corpo.add(cab);
  {
    const b = new Acum();
    const head = loft([
      { z: -0.1, w: 0.1, yb: -0.12, yt: 0.13, e: 2.3 },
      { z: 0.12, w: 0.115, yb: -0.14, yt: 0.12, e: 2.3 },
      { z: 0.3, w: 0.09, yb: -0.16, yt: 0.06, e: 2.3 },
      { z: 0.5, w: 0.075, yb: -0.14, yt: 0.0, e: 2.2 },
      { z: 0.6, w: 0.07, yb: -0.12, yt: -0.02, e: 2.2 },
    ], { aro: 20, pasos: 6 });
    b.add(pelo(head, COL, { semilla: 5, ruido: 0.04, oscuro: 0x3a2418, yOsc: -0.0 }), piel);
    // quijada y morro oscuro
    b.add(pelo(esfera(0.082, 10, 8).scale(1, 0.85, 1.1).translate(0, -0.08, 0.58), 0x2a1b14, { semilla: 6 }), piel);
    for (const s of [-1, 1]) {
      b.add(esfera(0.028, 8, 6), M.ojo, mat4(s * 0.1, 0.045, 0.1));
      b.add(esfera(0.011, 6, 5), est('ojo_brillo', { color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.5 }), mat4(s * 0.118, 0.055, 0.115));
      b.add(pelo(barra([s * 0.07, 0.12, -0.04], [s * 0.1, 0.3, -0.07], 0.034, 0.008, 6), COL), piel);                     // orejas
      b.add(esfera(0.014, 6, 5), M.ojo, mat4(s * 0.04, -0.02, 0.64));                                                        // ollares
    }
    // cabezada y bocado
    b.add(tubo([[-0.105, 0.06, 0.12], [-0.12, -0.03, 0.12], [0, -0.17, 0.1], [0.12, -0.03, 0.12], [0.105, 0.06, 0.12]], 0.012, 16, 5, false), M.cueroO);
    b.add(tubo([[-0.08, -0.02, 0.5], [0, -0.09, 0.56], [0.08, -0.02, 0.5]], 0.011, 10, 5), M.cueroO);
    b.add(tubo([[-0.1, 0.08, 0.1], [0, 0.145, 0.12], [0.1, 0.08, 0.1]], 0.011, 10, 5), M.cueroO);
    for (const s of [-1, 1]) { b.add(torno([[0.018, 0], [0.026, 0.01], [0.018, 0.02]], 8).rotateZ(Math.PI / 2), M.laton, mat4(s * 0.085, -0.06, 0.38)); }
    b.add(cilX(0.007, 0.17, 6), M.laton, mat4(0, -0.06, 0.38));
    b.volcar(cab);
  }
  cab.rotation.x = 0.85;
  // ───── crin y flequillo ─────
  const crin = new THREE.Group(); corpo.add(crin);
  {
    const c = new Acum();
    const curva = new THREE.CatmullRomCurve3([[0, 1.46, 0.82], [0, 1.72, 1.0], [0, 1.92, 1.12], [0, 2.07, 1.22]].map((p) => new THREE.Vector3(...p)));
    for (let i = 0; i < 16; i++) {
      const t = i / 15, p = curva.getPoint(t);
      const lado = 0.1 + t * 0.03, len = 0.36 - t * 0.12;
      c.add(barra([0, p.y + 0.04, p.z - 0.05], [-lado - 0.04, p.y - len, p.z - 0.2 - t * 0.04], 0.04, 0.008, 5), M.pelo);
      c.add(barra([0, p.y + 0.04, p.z - 0.02], [-lado + 0.02 + (i % 3) * 0.01, p.y - len * 0.8, p.z - 0.16], 0.03, 0.006, 5), M.pelo);
    }
    for (let i = 0; i < 5; i++) c.add(barra([0, 2.0, 1.36], [(i - 2) * 0.02, 1.8 - Math.abs(i - 2) * 0.02, 1.52 + i * 0.01], 0.02, 0.004, 5), M.pelo);
    c.volcar(crin);
  }
  // ───── cola ─────
  const cola = new THREE.Group(); cola.position.set(0, 1.3, -1.06); corpo.add(cola);
  {
    const c = new Acum();
    for (let i = 0; i < 7; i++) {
      const o = (i - 3) * 0.022;
      c.add(tubo([[o, 0, 0], [o * 2, -0.18, -0.12], [o * 3.2, -0.5, -0.2 - (i % 2) * 0.04], [o * 4, -0.82 - (i % 3) * 0.05, -0.18]], 0.04, 12, 5, false, 0.008), M.pelo);
    }
    c.volcar(cola);
  }
  // ───── patas ─────
  const patas = [];
  const largos = { f: [0.47, 0.4, 0.2], h: [0.56, 0.4, 0.2] };
  function crearPata(tipo, lado, z) {
    const L = largos[tipo], g0 = new THREE.Group();
    const y0 = tipo === 'f' ? 1.07 : 1.1;
    g0.position.set(lado * (tipo === 'f' ? 0.19 : 0.2), y0, z);
    const mk = (len, r0, r1, col, opt) => {
      const geo = barra([0, 0, 0], [0, -len, 0], r0, r1, 10);
      return pelo(geo, col, { semilla: lado * 3 + len * 10, ruido: 0.05, ...opt });
    };
    const s1 = new Acum(); s1.add(mk(L[0], tipo === 'f' ? 0.1 : 0.125, 0.056, COL), piel); s1.add(pelo(esfera(tipo === 'f' ? 0.1 : 0.13, 10, 8).scale(1, 1.1, 1.1), COL), piel); s1.add(pelo(esfera(0.06, 8, 6).translate(0, -L[0], 0), COLO), piel); s1.volcar(g0);
    const g1 = new THREE.Group(); g1.position.y = -L[0]; g0.add(g1);
    const s2 = new Acum(); s2.add(mk(L[1], 0.05, 0.042, COLO), piel); s2.add(pelo(esfera(0.052, 8, 6).translate(0, -L[1], 0), COLO), piel); s2.volcar(g1);
    const g2 = new THREE.Group(); g2.position.y = -L[1]; g1.add(g2);
    const s3 = new Acum();
    s3.add(mk(L[2] * 0.62, 0.042, 0.04, COLO), piel);
    const casco = torno([[0.05, 0], [0.078, -0.035], [0.098, -0.095], [0.098, -0.105], [0.0, -0.105]], 14); casco.translate(0, -L[2] * 0.62 + 0.02, 0.012);
    s3.add(pelo(casco, 0x1b1511, { semilla: 9, ruido: 0.03 }), piel);
    s3.volcar(g2);
    grupo.userData.x = 0;
    corpo.add(g0);
    const calcia = (tipo === 'h' && lado > 0) ? 1 : 0;
    void calcia;
    return { g0, g1, g2, tipo, lado, x: g0.position.x, z };
  }
  const LF = crearPata('f', 1, 0.62), RF = crearPata('f', -1, 0.62), LH = crearPata('h', 1, -0.62), RH = crearPata('h', -1, -0.62);
  patas.push(LF, RF, LH, RH);
  // ───── silla, manta, cincha, estribos, alforjas ─────
  const t = new Acum();
  t.add(caja(0.72, 0.04, 0.78, 0.02), M.lona, mat4(0, 1.43, -0.05));                                         // manta
  t.add(caja(0.66, 0.012, 0.74, 0.005, 1), M.lonaB, mat4(0, 1.446, -0.05));
  for (const s of [-1, 1]) { t.add(caja(0.04, 0.3, 0.7, 0.02), M.lona, mat4(s * 0.33, 1.26, -0.05, 0, 0, s * 0.18)); }
  const silla = loft([
    { z: -0.38, w: 0.17, yb: 1.44, yt: 1.58, e: 2.6 },
    { z: -0.2, w: 0.2, yb: 1.44, yt: 1.52, e: 2.8 },
    { z: 0.05, w: 0.17, yb: 1.44, yt: 1.5, e: 2.8 },
    { z: 0.28, w: 0.13, yb: 1.44, yt: 1.58, e: 2.4 },
    { z: 0.36, w: 0.08, yb: 1.44, yt: 1.62, e: 2.2 },
  ], { aro: 20, pasos: 8 });
  t.add(silla, M.cuero);
  for (const s of [-1, 1]) {
    t.add(caja(0.14, 0.38, 0.3, 0.04), M.cuero, mat4(s * 0.3, 1.3, 0.0, 0, 0, s * 0.2));                       // faldones
    t.add(barra([s * 0.3, 1.46, 0.0], [s * 0.4, 0.98, 0.0], 0.02, 0.02, 6), M.cuero);                          // ramal del estribo
    t.add(torno([[0.0, 0.0], [0.07, 0.0], [0.07, 0.02], [0.0, 0.02]], 14).rotateX(Math.PI / 2), M.hierro, mat4(s * 0.4, 0.93, 0.0, 0, 0, 0));
    t.add(caja(0.02, 0.1, 0.12, 0.008, 1), M.hierro, mat4(s * 0.4 - 0.03, 0.95, 0));
    t.add(caja(0.02, 0.1, 0.12, 0.008, 1), M.hierro, mat4(s * 0.4 + 0.03, 0.95, 0));
    t.add(caja(0.08, 0.016, 0.14, 0.006, 1), M.hierro, mat4(s * 0.4, 0.9, 0));
    t.add(torno([[0.012, 0], [0.02, 0.01], [0.012, 0.02]], 8).rotateZ(Math.PI / 2), M.laton, mat4(s * 0.31, 1.45, 0.0));
  }
  t.add(tubo([[-0.36, 1.2, 0.18], [-0.38, 0.9, 0.2], [0, 0.72, 0.2], [0.38, 0.9, 0.2], [0.36, 1.2, 0.18]], 0.022, 20, 6), M.cuero);   // cincha
  t.add(caja(0.06, 0.07, 0.03, 0.01, 1), M.laton, mat4(0.38, 1.0, 0.2));
  const rollo = cilX(0.1, 0.8, 14); t.add(rollo, M.lonaB, mat4(0, 1.58, -0.6));                                  // rollo de manta
  for (const x of [-0.25, 0.25]) t.add(torno([[0.1, -0.01], [0.101, 0.01]], 10).rotateZ(Math.PI / 2), M.cuero, mat4(x, 1.58, -0.6));
  for (const s of [-1, 1]) t.add(caja(0.14, 0.26, 0.3, 0.05), M.cuero, mat4(s * 0.3, 1.38, -0.62));            // alforjas
  // sable envainado en el flanco izquierdo
  t.add(barra([0.33, 1.2, 0.2], [0.33, 0.84, -0.7], 0.022, 0.016, 8), M.cueroO);
  t.add(barra([0.33, 1.2, 0.2], [0.34, 1.32, 0.3], 0.016, 0.016, 6), M.laton);
  t.volcar(corpo);
  // riendas
  const riendas = new Acum();
  riendas.add(tubo([[-0.085, 1.78, 1.5], [-0.07, 1.62, 1.0], [-0.04, 1.6, 0.55], [-0.07, 1.54, 0.3]], 0.008, 16, 5), M.cueroO);
  riendas.add(tubo([[0.085, 1.78, 1.5], [0.07, 1.62, 1.0], [0.04, 1.6, 0.55], [0.07, 1.54, 0.3]], 0.008, 16, 5), M.cueroO);
  riendas.volcar(corpo);
  const asiento = new THREE.Object3D(); asiento.position.set(0, 1.58, -0.1); corpo.add(asiento);

  // hooves positions for dust
  const ruedas = patas.map((p) => ({ giro: null, virar: null, radio: 0, x: p.x, y: 0, z: p.z, delantera: p.tipo === 'f' }));
  // ───── animación ─────
  let fase = 0, aliento = 0, cabeceo = 0, colaT = 0;
  const reposo = { f: [0, 0, 0], h: [-0.28, 0.52, -0.22] };
  function pose(p, ph, A, duty, alza, vel) {
    let ang, flex;
    if (vel < 0.3) { ang = 0; flex = 0; }
    else if (ph < duty) { const u = ph / duty; ang = lerp(-A, A, u); flex = 0.1 * (1 - u); }
    else { const u = (ph - duty) / (1 - duty); const e = suave(u); ang = lerp(A, -A, e); flex = alza * Math.sin(Math.PI * Math.pow(u, 0.85)); }
    const r = reposo[p.tipo];
    if (p.tipo === 'f') {
      p.g0.rotation.x = ang * 0.95 + r[0];
      p.g1.rotation.x = flex * 1.9 + r[1];
      p.g2.rotation.x = -flex * 0.6 - ang * 0.3 + (vel > 0.3 && ph < duty ? 0 : -flex * 0.2) + r[2];
    } else {
      p.g0.rotation.x = ang * 0.85 + r[0];
      p.g1.rotation.x = flex * 1.5 + r[1] + ang * 0.18;
      p.g2.rotation.x = -flex * 0.5 - ang * 0.35 + r[2];
    }
  }
  const modelo = {
    grupo, chasis, ruedas, asiento, faros: [{ x: 0, y: 1.6, z: 1.5 }], escapes: [],
    arma: null, corpo,
    anim(dt, E) {
      const s = Math.abs(E.vf) < 0.25 ? 0 : Math.abs(E.vel), t = E.t;
      aliento += dt * (s > 0.5 ? 6 : 1.7);
      const marcha = s < 0.3 ? 0 : s < 2.6 ? 1 : s < 6.8 ? 2 : 3;
      let Ls = 1.1, duty = 0.64, alza = 0.55, off = [0, 0.5, 0.25, 0.75]; // LF, RF, LH, RH
      if (marcha === 2) { Ls = 2.3; duty = 0.5; alza = 0.7; off = [0, 0.5, 0.5, 0]; }
      if (marcha === 3) { Ls = 3.9; duty = 0.4; alza = 0.9; off = [0.5, 0.62, 0.0, 0.1]; }
      const f = marcha === 0 ? 0 : Math.min(3.4, Math.max(0.5, s / Ls));
      fase = (fase + f * dt * Math.sign(E.vf || 1)) % 1; if (fase < 0) fase += 1;
      const A = Math.min(0.66, Math.max(0.16, (Ls * duty) / 2.1));
      const dir = E.vf < 0 ? -1 : 1;
      patas.forEach((p, i) => pose(p, ((fase * dir + off[i]) % 1 + 1) % 1, A, duty, alza, s));
      // cuerpo: vaivén según el aire
      const bob = marcha === 3 ? Math.abs(Math.sin(fase * Math.PI * 2 + 0.6)) * 0.07 : marcha === 2 ? Math.abs(Math.sin(fase * Math.PI * 2)) * 0.035 : marcha === 1 ? Math.sin(fase * Math.PI * 4) * 0.012 : Math.sin(aliento) * 0.006;
      corpo.position.y = lerp(corpo.position.y, bob, Math.min(1, dt * 18));
      const cab0 = marcha === 3 ? Math.sin(fase * Math.PI * 2 - 0.3) * 0.07 : marcha === 1 ? Math.sin(fase * Math.PI * 2) * 0.03 : 0;
      corpo.rotation.x = lerp(corpo.rotation.x, cab0 * 0.7 - E.af * 0.004, Math.min(1, dt * 10));
      cabeceo = lerp(cabeceo, (marcha === 3 ? 0.18 : marcha === 2 ? 0.07 : 0) + Math.sin(fase * Math.PI * 2 * (marcha === 1 ? 1 : 1)) * (marcha ? 0.07 : 0) + Math.sin(t * 0.6) * 0.02, Math.min(1, dt * 8));
      cab.rotation.x = 0.85 + cabeceo * (marcha === 3 ? 1 : 0.5) - (marcha === 0 ? Math.abs(Math.sin(t * 0.37)) * 0.25 * Math.max(0, Math.sin(t * 0.37 + 1)) : 0);
      cab.rotation.y = lerp(cab.rotation.y, -E.steer * 0.5 + (marcha === 0 ? Math.sin(t * 0.5) * 0.18 : 0), Math.min(1, dt * 6));
      crin.rotation.x = cab.rotation.x * 0.0;
      colaT += dt * (1.5 + s * 0.6);
      cola.rotation.x = (marcha === 3 ? -0.55 : marcha === 2 ? -0.25 : 0.05) + Math.sin(colaT) * 0.08;
      cola.rotation.z = Math.sin(colaT * 0.8) * (0.15 + 0.1 * (marcha === 0 ? 1 : 0)) - E.w * 0.2;
      corpo.rotation.z = lerp(corpo.rotation.z, -E.w * 0.06, Math.min(1, dt * 6));
      corpo.scale.y = 1 + Math.sin(aliento) * 0.004;
      if (E.cansado) cab.rotation.x += 0.12 + Math.sin(t * 6) * 0.03;
    },
    restos(v) {
      corpo.rotation.set(0, 0, 1.5); corpo.position.y = 0.35; corpo.position.x = 0.2;
      patas.forEach((p, i) => { p.g0.rotation.x = -0.9 + (i % 2) * 0.5; p.g1.rotation.x = 0.4; p.g2.rotation.x = 0.1; });
      cab.rotation.x = 0.4; cola.rotation.x = 0.5;
    },
    liberar() {},
  };
  return modelo;
}
