// ERA Z · Villa de Santa Ceniza: piezas propias del mapa (fuente, campanario, puestos, tumbas, carros, barriles, niebla…).
// Todo se funde en el lote principal del kit (una malla por material) salvo lo instanciado y los planos de niebla.
import * as THREE from 'three';

// ───────────────────────── utilidades ─────────────────────────
/** Marco local de una pieza: (x, z, rot) en el mundo; las piezas se colocan en coordenadas locales. */
export function marco(kit, x, z, rot = 0, y0 = 0) {
  const M0 = kit.matriz(x, y0, z, rot);
  const L = (lx, ly, lz, ry = 0, rx = 0, rz = 0, e = 1) => new THREE.Matrix4().multiplyMatrices(M0, kit.matriz(lx, ly, lz, ry, rx, rz, e));
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const lote = kit.lote0;
  return {
    L, x, z, rot,
    mundo: (lx, lz) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs],
    caja: (mat, lx, ly, lz, w, h, d, o = {}) => lote.anadir(kit.cajaRedondeada(w, h, d, o.radio ?? 0.03, 1), mat, L(lx, ly, lz, o.ry, o.rx, o.rz), o),
    geo: (g, mat, lx, ly, lz, o = {}) => lote.anadir(g, mat, L(lx, ly, lz, o.ry, o.rx, o.rz, o.e), o),
  };
}

const cache = new Map();
const unico = (k, f) => { let g = cache.get(k); if (!g) { g = f(); cache.set(k, g); } return g; };

/** Forma con arco de medio punto extruida en +Z (ventanas, lápidas): ancho w, alto total h, profundidad prof. */
export function arcoGeo(w, h, prof, bisel = 0) {
  return unico(`arco|${w}|${h}|${prof}|${bisel}`, () => {
    const s = new THREE.Shape(), hw = w / 2, y0 = Math.max(0.01, h - hw);
    s.moveTo(-hw, 0); s.lineTo(hw, 0); s.lineTo(hw, y0); s.absarc(0, y0, hw, 0, Math.PI, false); s.lineTo(-hw, 0);
    return new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: bisel > 0, bevelThickness: bisel, bevelSize: bisel, bevelSegments: 1, curveSegments: 10 });
  });
}

/** Material propio (se libera con el mapa). */
export function propio(kit, nombre, params) {
  const m = new THREE.MeshStandardMaterial(params);
  m.name = nombre; kit._propios.push(m);
  return m;
}

// ───────────────────────── barriles ─────────────────────────
const PERFIL_BARRIL = [[0, 0], [0.31, 0], [0.35, 0.05], [0.4, 0.38], [0.41, 0.5], [0.4, 0.62], [0.35, 0.95], [0.31, 1.0], [0.0, 1.0]];
const AROS = [[0.1, 0.35], [0.3, 0.385], [0.7, 0.385], [0.9, 0.355]];

/** Barril de madera con aros de hierro; `y` base, `rotZ` para tumbarlo. */
export function barril(kit, x, y, z, rot = 0, esc = 1, tumbado = false) {
  const gB = unico('barril', () => kit.torno(PERFIL_BARRIL, 18));
  const mM = kit.mat('tablas_viejas', { color: 0x9a7a55 }), mH = kit.mat('hierro_forjado');
  const rz = tumbado ? Math.PI / 2 : 0;
  // tumbado: el eje queda horizontal; se eleva su radio
  const base = tumbado ? kit.matriz(x, y + 0.4 * esc, z, rot, 0, rz, esc) : kit.matriz(x, y, z, rot, 0, 0, esc);
  const desfaseTumbado = tumbado ? new THREE.Matrix4().makeTranslation(0, -0.5, 0) : null;
  const M = desfaseTumbado ? new THREE.Matrix4().multiplyMatrices(base, desfaseTumbado) : base;
  kit.lote0.anadir(gB, mM, M);
  for (const [h, r] of AROS) kit.lote0.anadir(unico(`aro|${h}`, () => kit.cilindro(r + 0.014, r + 0.014, 0.05, 18, 0.01)), mH, new THREE.Matrix4().multiplyMatrices(M, new THREE.Matrix4().makeTranslation(0, h - 0.025, 0)), { uv: false });
}

/** Grupo de barriles con una sola colisión. forma: 'par' | 'trio' | 'fila' | 'solo'. */
export function grupoBarriles(kit, x, z, rot = 0, forma = 'par') {
  const f = marco(kit, x, z, rot);
  const pos = {
    solo: [[0, 0, 0, 0]], par: [[-0.45, 0, 0, 0.3], [0.45, 0, 0.1, 1.2]],
    trio: [[-0.45, 0, 0, 0.3], [0.45, 0, 0.05, 1.2], [0, 0.98, 0.02, 2.4]],
    fila: [[-1.0, 0, 0, 0.3], [0, 0, 0.05, 1.2], [1.0, 0, 0, 2.1], [-0.5, 0.98, 0.0, 0.7], [0.5, 0.98, 0.02, 1.9]],
  }[forma];
  for (const [lx, ly, lz, r] of pos) { const [wx, wz] = f.mundo(lx, lz); barril(kit, wx, ly, wz, rot + r, 1); }
  const largo = forma === 'fila' ? 2.9 : forma === 'solo' ? 0.9 : 1.9;
  const [cx, cz] = f.mundo(0, 0);
  kit.muro(cx, cz, largo, forma === 'solo' ? 0.9 : 1.1, rot, { bloqueaBalas: false, nombre: 'barriles', material: 'madera' });
}

// ───────────────────────── fuente de piedra ─────────────────────────
export function fuente(kit, x, z) {
  const piedra = kit.mat('silleria', { color: 0xbab3a4 }), piedra2 = kit.mat('silleria', { color: 0xa39d90 });
  const p = (geo, mat, y = 0) => kit.lote0.anadir(geo, mat, kit.matriz(x, y, z, 0.2));
  // taza baja
  p(kit.torno([[0, 0], [2.3, 0], [2.36, 0.08], [2.36, 0.52], [2.18, 0.66], [1.9, 0.66], [1.9, 0.52], [1.2, 0.5], [0, 0.5]], 20), piedra);
  p(kit.torno([[2.2, 0.02], [2.45, 0.02], [2.45, 0.14], [2.2, 0.14]], 20), piedra2);          // peana
  // pedestal y taza alta
  p(kit.torno([[0, 0.5], [0.7, 0.5], [0.64, 0.8], [0.36, 1.0], [0.26, 1.18], [0.26, 1.5], [0.52, 1.64], [0.98, 1.86], [1.04, 2.0], [0.9, 2.0], [0.74, 1.88], [0.22, 1.82],
    [0.2, 2.2], [0.34, 2.32], [0.2, 2.62], [0.08, 2.98], [0, 3.05]], 20), piedra);
  // cuatro mascarones-caño en la taza baja
  const mB = kit.mat('laton_bronce');
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.2;
    kit.lote0.anadir(kit.cilindro(0.07, 0.05, 0.3, 8, 0.01), mB, kit.matriz(x + Math.cos(a) * 2.1, 0.42, z + Math.sin(a) * 2.1, 0, 0, 0));
  }
  // agua
  const agua = kit.mat('agua', { color: 0x5f8497 });
  const g1 = new THREE.CircleGeometry(1.88, 36); g1.rotateX(-Math.PI / 2);
  const g2 = new THREE.CircleGeometry(0.86, 28); g2.rotateX(-Math.PI / 2);
  for (const [g, y] of [[g1, 0.58], [g2, 1.88]]) {
    const m = new THREE.Mesh(g, agua); m.position.set(x, y, z); m.receiveShadow = true; m.name = 'fuente_agua'; m.renderOrder = 2;
    kit.anadir(m);
  }
  // chorro: tres hilos finos de agua cayendo de la taza alta (translúcidos)
  const chorro = propio(kit, 'chorro', { color: 0xbfe0f0, roughness: 0.1, metalness: 0, transparent: true, opacity: 0.45, emissive: 0x4a7a98, emissiveIntensity: 0.4, depthWrite: false });
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.05, 1.3, 6, 1, true), chorro);
    m.position.set(x + Math.cos(a) * 0.98, 1.27, z + Math.sin(a) * 0.98); m.renderOrder = 3; kit.anadir(m);
  }
  const m = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.1, 0.9, 8, 1, true), chorro);
  m.position.set(x, 2.45, z); m.renderOrder = 3; kit.anadir(m);
  kit.pilar(x, z, 2.4, { nombre: 'fuente', material: 'piedra' });
}

// ───────────────────────── campanario ─────────────────────────
/** Torre-campanario de la iglesia (cal y sillería, belvedere con arcos, reloj, tejado piramidal de teja). */
export function campanario(kit, x, z, alto = 13.2) {
  const f = marco(kit, x, z, 0), W = 5.0;
  const cal = kit.mat('ladrillo_encalado', { color: 0xeee4cc }), sill = kit.mat('silleria', { color: 0xc4bcab }), teja = kit.mat('teja_arabe');
  const hierro = kit.mat('hierro_forjado'), bronce = kit.mat('laton_bronce');
  const oscuro = kit.vidrio(false), luz = kit.vidrio(true);
  f.caja(cal, 0, alto / 2, 0, W, alto, W, { radio: 0.06 });
  f.caja(sill, 0, 0.6, 0, W + 0.3, 1.2, W + 0.3, { radio: 0.05 });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.caja(sill, sx * (W / 2 - 0.2), alto / 2, sz * (W / 2 - 0.2), 0.6, alto - 0.2, 0.6, { radio: 0.05 });
  for (const y of [6.5, 8.0, alto - 0.15]) f.caja(sill, 0, y, 0, W + 0.5, y > 7 && y < 9 ? 0.16 : 0.3, W + 0.5, { radio: 0.04 });
  // ventanas arqueadas en la cara sur y en las laterales; belvedere con arcos abiertos en cuatro caras
  const cara = (th, fn) => { const c = Math.cos(th), s = Math.sin(th); fn((u, y, w, o = {}) => ({ u, y, w, th, ox: -s * 0, c, s, o })); };
  void cara;
  const caras = [[0, W / 2], [Math.PI, W / 2], [Math.PI / 2, W / 2], [-Math.PI / 2, W / 2]];
  caras.forEach(([th, D], i) => {
    const G = new THREE.Matrix4().multiplyMatrices(kit.matriz(x, 0, z, th), new THREE.Matrix4());
    const pos = (u, y, dz) => new THREE.Matrix4().multiplyMatrices(G, kit.matriz(u, y, D + dz));
    // belvedere (alto 8.5–11.9): gran arco oscuro con marco de sillería y antepecho
    kit.lote0.anadir(arcoGeo(2.0, 3.3, 0.22), sill, pos(0, 8.5, -0.1));
    kit.lote0.anadir(arcoGeo(1.5, 3.0, 0.1), oscuro, pos(0, 8.55, 0.1), { uv: false });
    for (let k = -1; k <= 1; k += 2) kit.lote0.anadir(kit.cajaRedondeada(0.1, 0.5, 0.12, 0.02, 1), sill, pos(k * 0.55, 8.4 + 0.25, 0.18));
    // ventana pequeña iluminada a media altura
    if (i === 0 || i >= 2) {
      kit.lote0.anadir(arcoGeo(0.9, 1.7, 0.2), sill, pos(0, 3.4, -0.08));
      kit.lote0.anadir(arcoGeo(0.64, 1.45, 0.1), i === 0 ? luz : oscuro, pos(0, 3.45, 0.1), { uv: false });
    }
  });
  // campana de bronce visible en el belvedere
  f.geo(kit.torno([[0, 0.0], [0.62, 0.0], [0.6, 0.12], [0.5, 0.45], [0.34, 0.9], [0.2, 1.1], [0.12, 1.2], [0, 1.22]], 16), bronce, 0, 8.65, 0, { uv: false });
  f.caja(kit.mat('tablas_viejas'), 0, 10.1, 0, 1.6, 0.14, 0.14);
  // reloj en la cara sur (sobre la ventana, bajo el belvedere)
  const rel = kit.emisivo(0xffe9b8, 0.9);
  const D = W / 2;
  f.geo(kit.cilindro(0.82, 0.82, 0.1, 24, 0.02), sill, 0, 6.8, D + 0.02, { rx: Math.PI / 2, uv: false });
  f.geo(kit.cilindro(0.68, 0.68, 0.06, 24, 0.01), rel, 0, 6.8, D + 0.1, { rx: Math.PI / 2, uv: false });
  f.caja(hierro, 0, 6.95, D + 0.14, 0.05, 0.46, 0.03, { radio: 0.008 });
  f.caja(hierro, 0.14, 6.8, D + 0.14, 0.34, 0.05, 0.03, { radio: 0.008, rz: 0.4 });
  // tejado piramidal y cruz
  const h = 3.8;
  f.geo(kit.tejadoCuatroAguas(W + 1.2, W + 1.2, h, 0), teja, 0, alto, 0, { uv: 'teja_arabe' });
  f.caja(hierro, 0, alto + h + 0.7, 0, 0.1, 1.5, 0.1, { radio: 0.02 });
  f.caja(hierro, 0, alto + h + 1.0, 0, 0.8, 0.1, 0.1, { radio: 0.02 });
  kit.muro(x, z, W + 0.4, W + 0.4, 0, { nombre: 'campanario' });
}

// ───────────────────────── iglesia: frontispicio barroco ─────────────────────────
/** Añade al frente (cara sur en zF) de una nave de ancho `w` y alto `h0` el frontón ondulado, pilastras, rosetón y cruz. */
export function frontisIglesia(kit, x, zF, w, h0, hFalsa) {
  const f = marco(kit, x, zF, 0);
  const cal = kit.mat('ladrillo_encalado', { color: 0xf2ead9 }), sill = kit.mat('silleria', { color: 0xc7bfae }), hierro = kit.mat('hierro_forjado');
  const yb = h0 + hFalsa + 0.2;
  // frontón: contorno ondulado simétrico
  const pts = [];
  const N = 40, hw = w / 2 + 0.1;
  for (let i = 0; i <= N; i++) { const u = -hw + (2 * hw * i) / N, a = Math.abs(u) / hw; pts.push(new THREE.Vector2(u, 0.35 + 3.5 * Math.pow(1 - a, 1.7) + 0.28 * Math.sin(a * 11) * (1 - a))); }
  pts.push(new THREE.Vector2(hw, 0), new THREE.Vector2(-hw, 0));
  const g = new THREE.ExtrudeGeometry(new THREE.Shape(pts), { depth: 0.34, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
  f.geo(g, cal, 0, yb, -0.14, {});
  // moldura de sillería siguiendo el contorno (hilo fino)
  const g2 = new THREE.ExtrudeGeometry(new THREE.Shape(pts.map((p) => new THREE.Vector2(p.x * 0.88, p.y * 0.0 + (p.y > 0.2 ? p.y * 0.82 + 0.12 : p.y)))), { depth: 0.1, bevelEnabled: false });
  f.geo(g2, kit.mat('silleria', { color: 0xdcd3c0 }), 0, yb + 0.05, 0.16, {});
  // pilastras de sillería
  for (const sx of [-1, 1]) for (const k of [0, 1]) {
    const px = sx * (w / 2 - 0.45 - k * 2.3);
    f.caja(sill, px, (h0 + hFalsa) / 2, 0.14, 0.62, h0 + hFalsa, 0.34, { radio: 0.04 });
    f.caja(sill, px, h0 + hFalsa + 0.1, 0.16, 0.78, 0.22, 0.42, { radio: 0.04 });
    f.caja(sill, px, 0.2, 0.17, 0.8, 0.4, 0.4, { radio: 0.04 });
  }
  // rosetón
  const yR = 6.8;
  f.geo(kit.cilindro(1.42, 1.42, 0.16, 28, 0.03), sill, 0, yR, 0.0, { rx: Math.PI / 2, uv: false });
  f.geo(kit.cilindro(1.1, 1.1, 0.1, 28, 0.01), kit.emisivo(0xffa352, 1.7), 0, yR, 0.14, { rx: Math.PI / 2, uv: false });
  f.geo(kit.cilindro(0.3, 0.3, 0.12, 14, 0.01), sill, 0, yR, 0.22, { rx: Math.PI / 2, uv: false });
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI; f.caja(hierro, 0, yR, 0.2, 2.2, 0.06, 0.05, { rz: a, radio: 0.01 }); }
  // cruz sobre el frontón
  f.caja(sill, 0, yb + 4.1 + 0.6, 0.05, 0.16, 1.3, 0.16, { radio: 0.03 });
  f.caja(sill, 0, yb + 4.1 + 0.95, 0.05, 0.8, 0.16, 0.16, { radio: 0.03 });
  // faroles de piedra: pináculos en las esquinas del frontón
  for (const sx of [-1, 1]) f.geo(kit.cilindro(0.2, 0.05, 1.0, 8, 0.02), sill, sx * (hw - 0.15), yb, 0.05, {});
}

/** Contrafuertes laterales de la nave. */
export function contrafuertes(kit, x, z, ancho, fondo, h) {
  const sill = kit.mat('silleria', { color: 0xc2baa8 });
  for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) {
    const cz = z - fondo / 2 + 2.6 + i * (fondo - 4) / 2;
    kit.lote0.anadir(kit.cajaRedondeada(0.9, h * 0.8, 0.7, 0.05, 1), sill, kit.matriz(x + sx * (ancho / 2 + 0.4), h * 0.4, cz));
    kit.lote0.anadir(kit.cajaRedondeada(1.0, 0.25, 0.8, 0.05, 1), sill, kit.matriz(x + sx * (ancho / 2 + 0.45), h * 0.8, cz));
  }
}

// ───────────────────────── balcón de madera (voladizo con ménsulas) ─────────────────────────
export function balconMadera(kit, casa, u = 0, ancho = 4.2, pisoY = null) {
  const f = marco(kit, casa.x, casa.z, casa.rot);
  const D = casa.fondo / 2, y = pisoY ?? casa.alto / casa.pisos;
  const mad = kit.mat('tablas_viejas', { color: 0x6b4a30 }), tab = kit.mat('tablones', { color: 0x7a5a3c });
  const prof = 1.25;
  f.caja(tab, u, y - 0.1, D + prof / 2, ancho, 0.12, prof, { radio: 0.015 });
  for (const s of [-1, 1]) for (const k of [0.15, 0.85]) f.caja(mad, u + s * ancho * 0.5 * k, y - 0.42, D + prof * 0.45, 0.1, 0.1, prof * 0.9, { radio: 0.02 });
  for (const s of [-1, 1]) for (let k = 0; k < 3; k++) f.caja(mad, u + s * (ancho / 2 - 0.2 - k * 0.9), y - 0.5, D + 0.3, 0.09, 0.09, 0.3, { radio: 0.015, rx: 0.5 });
  // barandilla torneada
  f.caja(mad, u, y + 1.0, D + prof - 0.05, ancho, 0.08, 0.08, { radio: 0.02 });
  f.caja(mad, u, y + 0.1, D + prof - 0.05, ancho, 0.07, 0.07, { radio: 0.02 });
  for (const s of [-1, 1]) { f.caja(mad, u + s * ancho / 2, y + 1.0, D + prof / 2, 0.08, 0.08, prof, { radio: 0.02 }); f.caja(mad, u + s * ancho / 2, y + 0.5, D + prof - 0.05, 0.12, 1.1, 0.12, { radio: 0.02 }); }
  const nb = Math.round(ancho / 0.22);
  for (let i = 1; i < nb; i++) f.caja(mad, u - ancho / 2 + (i / nb) * ancho, y + 0.55, D + prof - 0.05, 0.045, 0.9, 0.045, { radio: 0.01 });
}

// ───────────────────────── puestos de mercado ─────────────────────────
export function puesto(kit, ctx, { x, z, rot = 0, lona = [0xb04a35, 0xe5d6ad], tipo = 'fruta', luz = false }) {
  const f = marco(kit, x, z, rot);
  const mTab = kit.mat('tablas_viejas'), mTabl = kit.mat('tablones', { color: 0x8a6a48 }), mHierro = kit.mat('hierro_forjado');
  const mL = [kit.mat('lona', { color: lona[0] }), kit.mat('lona', { color: lona[1] })];
  for (const [px, pz, h] of [[-1.65, 1.15, 2.4], [1.65, 1.15, 2.4], [-1.65, -1.15, 2.87], [1.65, -1.15, 2.87]]) f.caja(mTab, px, h / 2, pz, 0.1, h, 0.1, { radio: 0.02 });
  f.caja(mTabl, 0, 0.45, 0.55, 3.1, 0.9, 0.72, { radio: 0.02 });
  f.caja(kit.mat('madera_lacada', { color: 0x4a3322 }), 0, 0.93, 0.55, 3.3, 0.06, 0.94, { radio: 0.02 });
  f.caja(mTab, 0, 1.3, -1.2, 3.3, 2.0, 0.1, { radio: 0.02 });          // fondo de tablas
  f.caja(mTab, 0, 1.25, -0.95, 3.1, 0.06, 0.4, { radio: 0.015 });      // estante
  // toldo a rayas, inclinado hacia el cliente
  for (let i = 0; i < 5; i++) f.caja(mL[i % 2], -1.52 + i * 0.76, 2.62, 0, 0.76, 0.05, 2.95, { rx: 0.2, radio: 0.012 });
  for (let i = 0; i < 10; i++) f.caja(mL[i % 2], -1.71 + i * 0.38, 2.2, 1.42, 0.37, 0.27, 0.03, { rx: 0.1, radio: 0.008 });
  f.caja(mHierro, 0, 2.4, 1.15, 3.4, 0.04, 0.04, { radio: 0.01 });
  // mercancía
  const crate = (lx, lz) => { f.caja(mTab, lx, 0.93 + 0.14, lz, 0.72, 0.26, 0.5, { radio: 0.02 }); };
  if (tipo === 'fruta') {
    for (const lx of [-1.05, 0, 1.05]) {
      crate(lx, 0.55);
      for (let i = 0; i < 9; i++) {
        const [wx, wz] = f.mundo(lx + ((i % 3) - 1) * 0.2, 0.55 + (Math.floor(i / 3) - 1) * 0.15);
        ctx.frutas.push({ x: wx, y: 1.32 + ((i * 7) % 3) * 0.01, z: wz, esc: 0.085 + (i % 2) * 0.01, color: [0xb53a2a, 0xd88a2c, 0x86a846, 0xc9442f][(i + Math.round(lx * 2)) & 3] });
      }
    }
  } else if (tipo === 'telas') {
    const colores = [0x9b3f36, 0x3a5c7a, 0xd9c28a, 0x5a7a4a, 0x7a4a6a, 0xe6dccb];
    for (let i = 0; i < 6; i++) f.geo(kit.cilindro(0.13, 0.13, 0.8, 10, 0.01), kit.mat('tela', { color: colores[i] }), -1.1 + (i % 3) * 1.1, 1.06 + (i > 2 ? 0.25 : 0.0), 0.5 + (i > 2 ? 0.0 : 0), { rz: Math.PI / 2, uv: false });
    f.caja(kit.mat('tela', { color: 0x8a3b32 }), 0.2, 1.2, 0.95, 1.4, 0.04, 0.03, { rx: 0.0 });
  } else if (tipo === 'ceramica') {
    const jarro = kit.torno([[0, 0], [0.16, 0], [0.2, 0.1], [0.24, 0.26], [0.2, 0.42], [0.1, 0.5], [0.12, 0.58], [0.14, 0.62], [0.09, 0.62], [0.08, 0.5], [0, 0.5]], 12);
    const arcilla = kit.mat('yeso', { color: 0xb07048 });
    for (let i = 0; i < 7; i++) f.geo(jarro, arcilla, -1.3 + i * 0.43, 0.96, 0.45 + ((i * 3) % 2) * 0.18, { ry: i, e: 0.9 + (i % 3) * 0.12 });
    for (let i = 0; i < 4; i++) f.geo(jarro, arcilla, -1.0 + i * 0.7, 1.28, -0.95, { ry: i * 2, e: 1.2 });
  } else if (tipo === 'sacos') {
    for (const [lx, lz, i] of [[-1.1, 0.5, 0], [-0.5, 0.45, 1], [0.1, 0.55, 2], [0.8, 0.45, 3], [-0.8, 0.6, 4], [1.2, 0.6, 5]]) {
      const [wx, wz] = f.mundo(lx, lz); ctx.sacos.push({ x: wx, y: 0.96 + (i > 3 ? 0.28 : 0), z: wz, rot: rot + i, esc: [0.36, 0.3, 0.3], color: [0xd8c9a6, 0xcdbd95, 0xe0d4b6][i % 3] });
    }
    crate(1.1, 0.55);
  }
  // velas y farolillo del puesto
  ctx.velas.push(...[-1.3, 1.35].map((lx) => { const [wx, wz] = f.mundo(lx, 0.9); return { x: wx, y: 0.96, z: wz }; }));
  const mE = kit.emisivo(0xffb04a, 3.2), [lx2, lz2] = f.mundo(1.5, 1.15);
  f.caja(mE, 1.5, 2.02, 1.15, 0.16, 0.22, 0.16, { radio: 0.04, uv: false });
  f.caja(mHierro, 1.5, 2.2, 1.15, 0.2, 0.04, 0.2, { radio: 0.01 });
  if (luz) kit.luz({ x: lx2, y: 2.0, z: lz2, color: 0xffa650, intensidad: 16, distancia: 11 });
  // sacos de pie junto al puesto
  const [bx, bz] = f.mundo(2.2, 0.5);
  ctx.sacos.push({ x: bx, y: 0, z: bz, rot: rot + 0.4, esc: [0.38, 0.44, 0.34], color: 0xd2c29c });
  const [cx, cz] = f.mundo(0, -0.1);
  kit.muro(cx, cz, 3.5, 2.7, rot, { bloqueaBalas: false, nombre: 'puesto', material: 'madera' });
}

/** Vuelca las listas de instancias del mercado (frutas, sacos, velas) en mallas instanciadas / piezas del lote. */
export function volcarMercado(kit, ctx) {
  if (ctx.frutas.length) {
    const g = new THREE.IcosahedronGeometry(1, 1);
    const m = propio(kit, 'fruta', { color: 0xffffff, roughness: 0.55, metalness: 0 });
    kit.instancias(g, m, ctx.frutas.map((a) => ({ x: a.x, y: a.y, z: a.z, esc: a.esc, color: a.color })), { nombre: 'frutas' });
  }
  if (ctx.sacos.length) {
    const g = new THREE.IcosahedronGeometry(1, 2); g.deleteAttribute('uv');
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setXYZ(i, p.getX(i) * (1 - 0.12 * y), y > 0 ? y * 0.9 : y * 0.6, p.getZ(i) * (1 - 0.12 * y)); }
    g.computeVertexNormals();
    kit.instancias(g, kit.mat('saco_arena'), ctx.sacos.map((a) => ({ x: a.x, y: a.y + a.esc[1] * 0.62, z: a.z, rot: a.rot, esc: a.esc, color: a.color })), { nombre: 'sacos' });
  }
}

// ───────────────────────── velas ─────────────────────────
export function velas(kit, lista) {
  const cera = kit.mat('yeso', { color: 0xf0e6c8 }), llama = kit.emisivo(0xffb347, 4.2);
  const gC = kit.cilindro(0.028, 0.03, 0.13, 8, 0.005), gL = new THREE.SphereGeometry(0.028, 6, 5); gL.scale(0.8, 1.7, 0.8);
  for (const v of lista) {
    kit.lote0.anadir(gC, cera, kit.matriz(v.x, v.y, v.z), { uv: false });
    kit.lote0.anadir(gL, llama, kit.matriz(v.x, v.y + 0.16, v.z), { uv: false });
  }
}

// ───────────────────────── carros ─────────────────────────
export function carro(kit, x, z, rot, carga = 'heno') {
  const f = marco(kit, x, z, rot);
  const mad = kit.mat('tablas_viejas', { color: 0x8a6a48 }), mad2 = kit.mat('tablas_viejas', { color: 0x6b4d33 }), hi = kit.mat('hierro_forjado');
  for (let i = 0; i < 6; i++) f.caja(mad, -0.7 + i * 0.28, 0.82, 0, 0.27, 0.07, 2.4, { radio: 0.01 });
  for (const s of [-1, 1]) {
    f.caja(mad2, s * 0.68, 0.72, 0, 0.12, 0.14, 2.6, { radio: 0.02 });
    f.caja(mad2, s * 0.84, 1.2, 0, 0.06, 0.5, 2.3, { radio: 0.01 });
    f.caja(mad2, s * 0.84, 1.47, 0, 0.08, 0.07, 2.4, { radio: 0.015 });
    for (let k = 0; k < 5; k++) f.caja(mad2, s * 0.84, 1.1, -1.0 + k * 0.5, 0.07, 0.6, 0.07, { radio: 0.01 });
    // ruedas: llanta, cubo y radios
    const rx = s * 1.0, rz = 0.1;
    f.geo(unico('llanta', () => new THREE.TorusGeometry(0.62, 0.05, 6, 24)), hi, rx, 0.64, rz, { ry: Math.PI / 2, uv: false });
    f.geo(unico('llanta2', () => new THREE.TorusGeometry(0.56, 0.04, 6, 24)), mad2, rx, 0.64, rz, { ry: Math.PI / 2, uv: false });
    f.geo(kit.cilindro(0.1, 0.1, 0.22, 10, 0.02), mad2, rx - s * 0.0 - 0.11, 0.64, rz, { rz: Math.PI / 2, uv: false });
    for (let i = 0; i < 4; i++) f.caja(mad2, rx, 0.64, rz, 0.05, 1.12, 0.06, { rx: (i * Math.PI) / 4, radio: 0.01 });
  }
  f.caja(hi, 0, 0.64, 0.1, 2.0, 0.05, 0.05, { radio: 0.01 });                                    // eje
  for (const s of [-1, 1]) f.caja(mad2, s * 0.42, 0.7, 2.1, 0.08, 0.08, 1.9, { radio: 0.015, rx: -0.05 });  // varas
  if (carga === 'heno') {
    f.geo(unico('montoncillo', () => { const g = new THREE.SphereGeometry(1, 14, 10); const p = g.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setY(i, y < 0 ? y * 0.2 : y); p.setX(i, p.getX(i) * (1 + 0.08 * Math.sin(p.getY(i) * 7))); } g.computeVertexNormals(); g.deleteAttribute('uv'); return g; }),
      kit.mat('paja', { color: 0xd1b265 }), 0, 1.0, 0, { e: [0.95, 1.0, 1.35], uv: 'paja' });
  } else if (carga === 'barriles') {
    const [a, b] = [f.mundo(-0.4, -0.5), f.mundo(0.45, 0.3)];
    barril(kit, a[0], 0.86, a[1], rot, 0.9); barril(kit, b[0], 0.86, b[1], rot + 1, 0.9);
  } else if (carga === 'cajas') {
    f.caja(kit.mat('tablas_viejas', { color: 0x9a7a55 }), -0.3, 1.2, -0.5, 0.8, 0.6, 0.8, { radio: 0.03 });
    f.caja(kit.mat('tablas_viejas', { color: 0x9a7a55 }), 0.35, 1.15, 0.45, 0.7, 0.5, 0.7, { radio: 0.03, ry: 0.4 });
  }
  const [cx, cz] = f.mundo(0, 0.2);
  kit.muro(cx, cz, 2.1, 2.9, rot, { bloqueaBalas: false, nombre: 'carro', material: 'madera' });
}

// ───────────────────────── pajares y pozo ─────────────────────────
export function pajar(kit, x, z, esc = 1, rot = 0) {
  const g = unico('pajar', () => kit.torno([[0, 0], [1.5, 0], [1.62, 0.25], [1.55, 0.9], [1.3, 1.5], [0.95, 2.0], [0.5, 2.45], [0.18, 2.78], [0, 2.9]], 16));
  const paja = kit.mat('paja', { color: 0xcfae5f });
  kit.lote0.anadir(g, paja, kit.matriz(x, 0, z, rot, 0, 0, esc), { uv: 'paja' });
  kit.lote0.anadir(kit.torno([[1.58, 0.82], [1.6, 0.86], [1.56, 0.96], [1.54, 0.92]], 16), kit.mat('cuerda'), kit.matriz(x, 0, z, rot, 0, 0, esc), { uv: false });
  kit.pilar(x, z, 1.4 * esc, { bloqueaBalas: true, nombre: 'pajar', material: 'madera' });
}

export function pozo(kit, x, z) {
  const sill = kit.mat('silleria', { color: 0xb5ad9c }), mad = kit.mat('tablas_viejas', { color: 0x6b4d33 }), teja = kit.mat('teja_arabe');
  kit.lote0.anadir(kit.torno([[0.62, 0], [1.05, 0], [1.08, 0.1], [1.08, 0.95], [0.98, 1.0], [0.7, 1.0], [0.62, 0.9]], 16), sill, kit.matriz(x, 0, z));
  const agua = new THREE.Mesh(new THREE.CircleGeometry(0.62, 16), kit.mat('agua', { color: 0x1d2a30 }));
  agua.rotation.x = -Math.PI / 2; agua.position.set(x, 0.55, z); kit.anadir(agua);
  const f = marco(kit, x, z, 0.3);
  for (const s of [-1, 1]) f.caja(mad, s * 0.95, 1.55, 0, 0.14, 1.9, 0.14, { radio: 0.02 });
  f.caja(mad, 0, 2.45, 0, 2.2, 0.14, 0.18, { radio: 0.02 });
  f.geo(kit.tejadoDosAguas(2.6, 1.7, 0.7), teja, 0, 2.5, 0, { uv: 'teja_arabe' });
  f.geo(kit.cilindro(0.04, 0.04, 1.2, 8, 0.01), kit.mat('cuerda'), 0, 1.0, 0, { rz: Math.PI / 2, uv: false, e: [1, 1, 1], ry: Math.PI / 2 });
  f.caja(kit.mat('hierro_forjado'), 0, 1.0, 0.0, 0.3, 0.3, 0.3, { radio: 0.03 });
  kit.pilar(x, z, 1.1, { nombre: 'pozo', material: 'piedra' });
}

// ───────────────────────── cementerio ─────────────────────────
export function lapida(kit, x, z, rot = 0, tipo = 0, esc = 1) {
  const f = marco(kit, x, z, rot);
  const col = [0xa9a69b, 0x95948a, 0xb5b0a0, 0x8c8b84][tipo & 3];
  const sill = kit.mat('silleria', { color: col }), hierro = kit.mat('hierro_forjado');
  if (tipo % 3 === 2) {   // cruz de piedra sobre peana
    f.caja(sill, 0, 0.14, 0, 0.7 * esc, 0.28, 0.5 * esc, { radio: 0.03 });
    f.caja(sill, 0, 0.78, 0, 0.17 * esc, 1.1 * esc, 0.14, { radio: 0.03 });
    f.caja(sill, 0, 1.05 * esc, 0, 0.7 * esc, 0.16, 0.14, { radio: 0.03 });
  } else if (tipo % 3 === 1) {   // cruz de hierro forjado
    f.caja(sill, 0, 0.1, 0, 0.5, 0.2, 0.4, { radio: 0.03 });
    f.caja(hierro, 0, 0.8, 0, 0.07, 1.4 * esc, 0.07, { radio: 0.015 });
    f.caja(hierro, 0, 1.1 * esc, 0, 0.6, 0.07, 0.07, { radio: 0.015 });
    f.caja(hierro, 0, 1.35 * esc, 0, 0.3, 0.05, 0.05, { radio: 0.01 });
  } else {   // lápida de arco
    f.geo(arcoGeo(0.72, 1.05, 0.16, 0.02), sill, 0, 0.0, -0.08, { e: esc });
    f.caja(sill, 0, 0.08, 0.05, 0.95, 0.16, 0.5, { radio: 0.03 });
  }
  kit.pilar(x, z, 0.3, { bloqueaBalas: false, nombre: 'lapida', material: 'piedra' });
}

export function tumba(kit, x, z, rot = 0) {
  const f = marco(kit, x, z, rot);
  const sill = kit.mat('silleria', { color: 0x9d9a8f }), sill2 = kit.mat('silleria', { color: 0xb2ad9f });
  f.caja(sill, 0, 0.18, 0, 1.15, 0.36, 2.2, { radio: 0.04 });
  f.caja(sill2, 0, 0.42, 0, 0.95, 0.14, 2.0, { radio: 0.05 });
  f.geo(arcoGeo(0.8, 1.0, 0.14, 0.02), sill2, 0, 0.0, -1.35, {});
  f.caja(kit.mat('hierro_forjado'), 0, 0.5, 0.2, 0.05, 0.05, 1.2, { radio: 0.01 });
  const [cx, cz] = f.mundo(0, -0.2);
  kit.muro(cx, cz, 1.2, 2.9, rot, { bloqueaBalas: false, nombre: 'tumba', material: 'piedra' });
}

/** Tumba abierta de la que sale un zombi: foso oscuro con brillo enfermizo, tierra removida y losa partida. */
export function fosaAbierta(kit, x, z, rot = 0) {
  const f = marco(kit, x, z, rot);
  const tierra = propio(kit, 'tierra_removida', { color: 0x2a1f16, roughness: 1, metalness: 0 });
  const fondo = kit.emisivo(0x2fbf7a, 0.55), sill = kit.mat('silleria', { color: 0x8f8c82 });
  f.caja(kit.mat('silleria', { color: 0x9d9a8f }), 0, 0.06, 0, 1.4, 0.1, 2.5, { radio: 0.03 });
  f.caja(tierra, 0, 0.12, 0, 1.0, 0.04, 2.0, { radio: 0.01, uv: false });
  f.caja(fondo, 0, 0.145, 0.0, 0.84, 0.01, 1.84, { radio: 0.004, uv: false });
  const mont = unico('montoncito', () => { const g = new THREE.SphereGeometry(1, 12, 8); g.deleteAttribute('uv'); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, Math.max(p.getY(i), 0) * 0.5); g.computeVertexNormals(); return g; });
  f.geo(mont, tierra, -0.95, 0.0, 0.2, { e: [0.5, 0.4, 1.0], uv: false });
  f.geo(mont, tierra, 0.9, 0.0, -0.3, { e: [0.45, 0.35, 0.8], uv: false });
  f.geo(mont, tierra, 0.1, 0.0, 1.35, { e: [0.9, 0.3, 0.45], uv: false });
  f.caja(sill, 0.35, 0.5, -1.2, 0.9, 0.12, 1.0, { rx: -0.9, rz: 0.2, radio: 0.02 });   // losa apoyada
  f.caja(sill, -0.2, 0.18, 1.5, 0.8, 0.12, 0.6, { ry: 0.5, radio: 0.02 });             // fragmento
  f.geo(arcoGeo(0.7, 1.0, 0.14, 0.02), sill, 0, 0.0, -1.55, { rx: -0.12 });
  const [cx, cz] = f.mundo(0, 0);
  kit.muro(cx, cz, 1.0, 1.4, rot, { bloqueaBalas: false, nombre: 'fosa', material: 'piedra' });
}

/** Mausoleo de piedra con tejado de pizarra. */
export function mausoleo(kit, x, z) {
  const casa = kit.edificio({
    x, z, ancho: 5.4, fondo: 5.2, pisos: 1, alto: 4.0, estilo: 'piedra', muro: 'silleria', colorMuro: 0xaaa699, ventanas: false,
    tejado: { tipo: 'dos_aguas', material: 'pizarra', pendiente: 0.85, alero: 0.35 },
    puertas: [{ cara: 'sur', u: 0, ancho: 1.5, alto: 2.6, arco: true, escalones: 3, material: 'hierro_forjado' }], nombre: 'mausoleo', semilla: 9,
  });
  const f = marco(kit, x, z, 0);
  const sill = kit.mat('silleria', { color: 0xbab5a6 });
  const top = 4.0 + 0.85 * (5.2 + 0.7) / 2;
  f.caja(sill, 0, top + 0.5, 0, 0.18, 1.2, 0.18, { radio: 0.03 });
  f.caja(sill, 0, top + 0.82, 0, 0.8, 0.18, 0.18, { radio: 0.03 });
  for (const sx of [-1, 1]) f.caja(sill, sx * 1.4, 1.6, 2.7, 0.5, 3.2, 0.5, { radio: 0.04 });   // pilastras de la puerta
  return casa;
}

// ───────────────────────── niebla baja ─────────────────────────
export function niebla(kit, { cuantos = 9, area = [-42, -42, 42, 42], semilla = 3, centros = [] } = {}) {
  const rng = kit.rng(semilla);
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  gr.addColorStop(0, 'rgba(255,255,255,0.95)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.45)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.MeshBasicMaterial({ map: tex, color: 0x9fb6d6, transparent: true, opacity: 0.11, depthWrite: false, fog: false });
  const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
  const planos = [];
  for (let i = 0; i < cuantos; i++) {
    const c = centros[i];
    const m = new THREE.Mesh(geo, mat);
    const tam = rng.rango(18, 30);
    m.scale.set(tam, 1, tam * rng.rango(0.5, 0.8));
    const x = c ? c[0] : rng.rango(area[0], area[2]), z = c ? c[1] : rng.rango(area[1], area[3]);
    m.position.set(x, 0.22 + i * 0.012, z); m.rotation.y = rng.rango(0, 3.14); m.renderOrder = 5; m.frustumCulled = false; m.name = 'niebla';
    m.userData = { x0: x, z0: z, fase: rng.rango(0, 6.28), v: rng.rango(0.05, 0.12) };
    kit.anadir(m); planos.push(m);
  }
  let t = 0;
  return {
    actualizar(dt) {
      t += dt;
      for (const m of planos) { const u = m.userData; m.position.x = u.x0 + Math.sin(t * u.v + u.fase) * 3.5; m.position.z = u.z0 + Math.cos(t * u.v * 0.8 + u.fase) * 2.2; }
    },
    destruir() { mat.dispose(); tex.dispose(); },
  };
}

// ───────────────────────── banderines ─────────────────────────
export function banderines(kit, a, b, caida = 0.7, cuantos = 18, semilla = 1) {
  const rng = kit.rng(semilla);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute([-0.17, 0, 0, 0.17, 0, 0, 0, -0.4, 0], 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 0, 1, 0, 0, 1, 0, 0, 1], 3));
  const m = propio(kit, 'banderin', { color: 0xffffff, roughness: 0.85, metalness: 0, side: THREE.DoubleSide });
  const cols = [0xd9c9a0, 0x4e6f8c, 0xa8493a, 0x6c8a52, 0xcfa24a];
  const lista = [];
  for (let i = 1; i <= cuantos; i++) {
    const t = i / (cuantos + 1);
    lista.push({ x: a[0] + (b[0] - a[0]) * t, y: a[1] + (b[1] - a[1]) * t - caida * 4 * t * (1 - t) - 0.03, z: a[2] + (b[2] - a[2]) * t, rot: rng.rango(-0.15, 0.15), color: rng.elegir(cols), esc: rng.rango(0.9, 1.15) });
  }
  const mesh = kit.instancias(g, m, lista, { sombras: false, nombre: 'banderines' });
  kit.catenaria({ desde: a, hasta: b, caida, material: 'cuerda' });
  return mesh;
}

/** Mástil de madera sencillo para los banderines. */
export function mastil(kit, x, z, alto = 5.4) {
  const mad = kit.mat('tablas_viejas', { color: 0x6b4d33 });
  kit.lote0.anadir(kit.cilindro(0.13, 0.08, alto, 10, 0.02), mad, kit.matriz(x, 0, z), { uv: 'tablas_viejas' });
  kit.lote0.anadir(kit.cilindro(0.15, 0.15, 0.1, 10, 0.02), kit.mat('hierro_forjado'), kit.matriz(x, alto - 0.5, z), { uv: false });
  kit.pilar(x, z, 0.2, { nombre: 'mastil', material: 'madera' });
  return alto - 0.35;
}

/** Matas de hierba (instanciadas): tres hojas cruzadas. */
export function matas(kit, puntos, mat) {
  const pos = [];
  const hoja = (ang, h, w) => { const c = Math.cos(ang), s = Math.sin(ang); pos.push(-c * w, 0, -s * w, c * w, 0, s * w, c * 0.04, h, s * 0.04); };
  hoja(0, 0.34, 0.07); hoja(1.05, 0.42, 0.07); hoja(2.1, 0.3, 0.07); hoja(0.5, 0.26, 0.06);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.computeVertexNormals(); g.attributes.normal.array.forEach((_, i, a) => { if (i % 3 === 1) a[i] = Math.abs(a[i]) + 0.8; });
  const mesh = kit.instancias(g, mat, puntos, { sombras: false, nombre: 'matas' });
  return mesh;
}
