// ERA Z · Estructuras auxiliares del kit: vallas, postes, catenarias, farolas, escaleras, bloques, rocas y árboles.
// Convención de segmentos: el eje X local de la pieza va a lo largo del segmento (rot = atan2(-dz, dx)), igual que los cuerpos de la física.
import * as THREE from 'three';
import { materiales } from '../../render/materiales/index.js';
import { cajaRedondeada, cilindro, matriz, extruir } from './geometria.js';
import { crearRng } from '../../nucleo/util.js';

const mm = (m, ...r) => new THREE.Matrix4().multiplyMatrices(m, matriz(...r));

/** Divide una polilínea en segmentos {cx,cz,L,rot,ux,uz,x1,z1,x2,z2}. */
export function segmentos(puntos, cerrada = false) {
  const out = [];
  const n = puntos.length;
  for (let i = 0; i < (cerrada ? n : n - 1); i++) {
    const [x1, z1] = puntos[i], [x2, z2] = puntos[(i + 1) % n];
    const dx = x2 - x1, dz = z2 - z1, L = Math.hypot(dx, dz);
    if (L < 0.01) continue;
    out.push({ x1, z1, x2, z2, cx: (x1 + x2) / 2, cz: (z1 + z2) / 2, L, rot: Math.atan2(-dz, dx), ux: dx / L, uz: dz / L });
  }
  return out;
}

// ───────────────────────── vallas ─────────────────────────
export function construirValla(kit, o = {}) {
  const pts = o.puntos ?? [o.desde, o.hasta];
  const tipo = o.tipo ?? 'madera';
  const alto = o.alto ?? (tipo === 'barrera' ? 0.9 : tipo === 'alambre' ? 1.3 : 1.25);
  const cada = o.postesCada ?? 2.4;
  const lote = o.lote ?? kit.lote0;
  const col = o.colision ?? 'baja';
  const mat = (n, op) => materiales.obtener(n, op);
  const mPoste = tipo === 'madera' || tipo === 'tablas' ? mat('tablas_viejas', { color: o.colorPoste }) : tipo === 'barrera' ? mat('hormigon', { color: o.color }) : mat('hierro_forjado');
  const mTabla = mat(o.material ?? (tipo === 'tablas' ? 'tablas_pintadas' : 'tablas_viejas'), { color: o.color });
  const mHierro = mat('hierro_forjado');
  const mOx = mat('hierro_oxidado');
  const rng = crearRng((o.semilla ?? 1) * 313 + Math.floor((pts[0][0] + pts[0][1]) * 11));
  const segs = segmentos(pts, o.cerrada);
  for (const s of segs) {
    const n = Math.max(1, Math.round(s.L / cada)), paso = s.L / n;
    const M = matriz(s.cx, 0, s.cz, s.rot);
    const al = (u, y, w, h, d, m, op = {}) => lote.anadir(cajaRedondeada(w, h, d, op.radio ?? 0.015, 1), m, mm(M, u, y, op.z ?? 0), op);
    if (tipo === 'barrera') {
      // barreras de hormigón tipo New Jersey de 2,4 m
      const nb = Math.max(1, Math.round(s.L / 2.4)), pb = s.L / nb;
      const perfil = [[-0.32, 0], [0.32, 0], [0.24, 0.32], [0.13, 0.9], [-0.13, 0.9], [-0.24, 0.32]];
      for (let i = 0; i < nb; i++) {
        const sh = new THREE.Shape(perfil.map(([x, y]) => new THREE.Vector2(x, y)));
        const g = new THREE.ExtrudeGeometry(sh, { depth: pb - 0.06, bevelEnabled: true, bevelThickness: 0.03, bevelSize: 0.03, bevelSegments: 1 });
        g.translate(0, 0, -(pb - 0.06) / 2);
        // extruido a lo largo de Z → girar para que el largo vaya en X local
        g.rotateY(Math.PI / 2);
        lote.anadir(g, mPoste, mm(M, -s.L / 2 + pb * (i + 0.5), 0, 0));
      }
    } else {
      for (let i = 0; i <= n; i++) {
        const u = -s.L / 2 + paso * i;
        if (!o.cerrada && false) continue;
        const h = alto + (rng() - 0.5) * 0.1;
        if (tipo === 'madera' || tipo === 'tablas') { al(u, h / 2, 0.14, h, 0.14, mPoste, { radio: 0.03 }); al(u, h + 0.03, 0.18, 0.06, 0.18, mPoste, { radio: 0.02 }); }
        else { al(u, h / 2, 0.07, h + 0.1, 0.07, mPoste, { radio: 0.02 }); lote.anadir(cilindro(0.06, 0.03, 0.12, 8, 0.01), mPoste, mm(M, u, h + 0.1, 0)); }
      }
      if (tipo === 'madera') {
        for (const f of [0.38, 0.82]) al(0, alto * f, s.L, 0.11, 0.05, mTabla, { z: 0.07, radio: 0.012 });
        al(0, alto * 0.6, s.L, 0.09, 0.05, mTabla, { z: -0.07, radio: 0.012 });
      } else if (tipo === 'tablas') {
        const np = Math.round(s.L / 0.19);
        for (let i = 0; i < np; i++) { const u = -s.L / 2 + (i + 0.5) * (s.L / np); const h = alto * (0.92 + rng() * 0.12); al(u, h / 2 + 0.05, (s.L / np) * 0.9, h, 0.035, mTabla, { z: 0.06, radio: 0.008 }); }
        al(0, alto * 0.25, s.L, 0.1, 0.04, mPoste, { z: -0.0 }); al(0, alto * 0.75, s.L, 0.1, 0.04, mPoste, { z: -0.0 });
      } else if (tipo === 'hierro' || tipo === 'cadena') {
        const sep = tipo === 'hierro' ? 0.15 : 0.32, nb = Math.floor(s.L / sep);
        al(0, alto - 0.05, s.L, 0.05, 0.05, mHierro); al(0, 0.18, s.L, 0.05, 0.05, mHierro); if (tipo === 'cadena') al(0, alto * 0.55, s.L, 0.03, 0.03, mHierro);
        for (let i = 0; i < nb; i++) {
          const u = -s.L / 2 + (i + 0.5) * (s.L / nb);
          al(u, alto / 2, 0.022, alto - 0.12, 0.022, mHierro, { radio: 0.008 });
          if (tipo === 'hierro') lote.anadir(new THREE.ConeGeometry(0.03, 0.1, 5), mHierro, mm(M, u, alto + 0.0, 0));
        }
      } else if (tipo === 'alambre') {
        for (const f of [0.25, 0.5, 0.78, 1.0]) {
          const mf = M; const y = alto * f;
          lote.anadir(cajaRedondeada(s.L, 0.012, 0.012, 0.004, 1), mOx, mm(mf, 0, y, 0.0));
        }
      }
    }
    // colisión
    if (col === 'baja') kit.vallaBaja(s.cx, s.cz, s.L, s.rot, { ancho: o.ancho ?? 0.2 });
    else if (col === 'alta') kit.muro(s.cx, s.cz, s.L, o.ancho ?? 0.22, s.rot, { nombre: 'valla' });
  }
  return { segmentos: segs };
}

// ───────────────────────── postes y cables ─────────────────────────
export function construirPoste(kit, o = {}) {
  const { x = 0, z = 0 } = o, alto = o.alto ?? 7, tipo = o.tipo ?? 'madera', rot = o.rot ?? 0;
  const lote = o.lote ?? kit.lote0;
  const mat = tipo === 'hormigon' ? materiales.obtener('hormigon', { color: o.color }) : tipo === 'metal' ? materiales.obtener('acero_pintado', { color: o.color ?? 0x66707a }) : materiales.obtener('tablas_viejas', { color: o.color });
  const mH = materiales.obtener('hierro_forjado');
  const M = matriz(x, 0, z, rot);
  lote.anadir(cilindro(tipo === 'madera' ? 0.16 : 0.14, tipo === 'madera' ? 0.11 : 0.09, alto, 12, 0.02), mat, M, { uv: tipo === 'madera' ? 'tablas_viejas' : undefined });
  const brazos = o.brazos ?? (tipo === 'madera' ? 2 : 1);
  const mAisl = materiales.obtener('cristal', { color: 0x4d8b6a });
  for (let b = 0; b < brazos; b++) {
    const yb = alto - 0.35 - b * 0.7, w = 1.9 - b * 0.3;
    lote.anadir(cajaRedondeada(w, 0.1, 0.1, 0.02, 1), mat, mm(M, 0, yb, 0), { uv: tipo === 'madera' ? 'tablas_viejas' : undefined });
    for (const s of [-1, -0.45, 0.45, 1]) lote.anadir(cilindro(0.045, 0.03, 0.17, 8, 0.01), mAisl, mm(M, s * w / 2 * 0.95, yb + 0.05, 0));
    lote.anadir(cajaRedondeada(0.07, 0.07, 0.8, 0.015, 1), mH, mm(M, 0, yb - 0.55, 0.0, 0, 0, 0), { });
  }
  if (o.colision !== false) kit.pilar(x, z, 0.2, { nombre: 'poste' });
  return { x, z, alto, puntaY: alto - 0.35 };
}

export function construirCatenaria(kit, o) {
  const [x1, y1, z1] = o.desde, [x2, y2, z2] = o.hasta, caida = o.caida ?? 0.7;
  const seg = o.segmentos ?? 14;
  const pts = [];
  for (let i = 0; i <= seg; i++) { const t = i / seg; pts.push(new THREE.Vector3(x1 + (x2 - x1) * t, y1 + (y2 - y1) * t - caida * 4 * t * (1 - t), z1 + (z2 - z1) * t)); }
  const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), seg * 2, o.grosor ?? 0.022, 5, false);
  const m = o.material ? materiales.obtener(o.material) : materiales.obtener('hierro_forjado');
  (o.lote ?? kit.lote0).anadir(g, m, null, { uv: false });
}

// ───────────────────────── farolas ─────────────────────────
export function construirFarola(kit, o = {}) {
  const { x = 0, z = 0, tipo = 'aceite', rot = 0 } = o;
  const lote = o.lote ?? kit.lote0;
  const mH = materiales.obtener('hierro_forjado', { color: o.colorPoste });
  const mMetal = tipo === 'led' || tipo === 'sintetica' ? materiales.obtener('acero_pintado', { color: o.colorPoste ?? 0x39434d }) : mH;
  const col = o.color ?? { aceite: 0xffa347, gas: 0xffd08a, sodio: 0xffa84a, electrica: 0xfff1cf, led: 0xcfeaff, sintetica: 0x6ff0ff }[tipo] ?? 0xffc070;
  const alto = o.alto ?? { aceite: 3.4, gas: 4.2, sodio: 7, electrica: 7.2, led: 6.5, sintetica: 6.5 }[tipo] ?? 4;
  const M = matriz(x, 0, z, rot);
  const emisivo = kit.emisivo(col, o.brillo ?? 2.6);
  let yLuz = alto;
  // base y fuste
  lote.anadir(cilindro(0.22, 0.15, 0.55, 10, 0.03), mMetal, M);
  lote.anadir(cilindro(0.075, 0.055, alto - 0.5, 10, 0.01), mMetal, mm(M, 0, 0.5, 0));
  lote.anadir(cilindro(0.13, 0.08, 0.2, 10, 0.02), mMetal, mm(M, 0, 0.45, 0));
  if (tipo === 'aceite' || tipo === 'gas') {
    // brazo en voladizo con farol de cristal
    const lx = 0.45;
    lote.anadir(cajaRedondeada(lx + 0.1, 0.05, 0.05, 0.01, 1), mMetal, mm(M, lx / 2, alto - 0.35, 0));
    const fx = lx;
    lote.anadir(cajaRedondeada(0.3, 0.05, 0.3, 0.01, 1), mMetal, mm(M, fx, alto - 0.5, 0));
    lote.anadir(cajaRedondeada(0.22, 0.34, 0.22, 0.03, 1), emisivo, mm(M, fx, alto - 0.3, 0), { uv: false });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) lote.anadir(cajaRedondeada(0.025, 0.4, 0.025, 0.005, 1), mMetal, mm(M, fx + sx * 0.125, alto - 0.3, sz * 0.125));
    lote.anadir(new THREE.ConeGeometry(0.22, 0.2, 4), mMetal, mm(M, fx, alto - 0.03, 0, Math.PI / 4), { uv: false });
    lote.anadir(cajaRedondeada(0.3, 0.05, 0.3, 0.01, 1), mMetal, mm(M, fx, alto - 0.14, 0));
    yLuz = alto - 0.3;
    o._lx = fx;
  } else {
    // brazo curvo y cabezal
    const lx = o.brazo ?? 1.5;
    lote.anadir(cajaRedondeada(lx + 0.15, 0.09, 0.09, 0.02, 1), mMetal, mm(M, lx / 2, alto - 0.05, 0));
    lote.anadir(cajaRedondeada(0.9, 0.12, 0.38, 0.05, 2), mMetal, mm(M, lx, alto, 0));
    lote.anadir(cajaRedondeada(0.78, 0.04, 0.3, 0.015, 1), emisivo, mm(M, lx, alto - 0.07, 0), { uv: false });
    yLuz = alto - 0.15; o._lx = lx;
  }
  const wl = new THREE.Vector3(o._lx, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), rot);
  if (o.luz !== false) kit.luz({ x: x + wl.x, y: yLuz, z: z + wl.z, color: col, intensidad: o.intensidad ?? (tipo === 'aceite' ? 16 : 34), distancia: o.distancia ?? (tipo === 'aceite' ? 10 : 15) });
  if (o.colision !== false) kit.pilar(x, z, 0.17, { nombre: 'farola' });
  return { x, z, luzX: x + wl.x, luzZ: z + wl.z, alto };
}

// ───────────────────────── escaleras ─────────────────────────
/** Escalera de peldaños macizos. Sube hacia +Z local (rot). No bloquea (la altura es visual). */
export function construirEscalera(kit, o = {}) {
  const { x = 0, z = 0, rot = 0, ancho = 2, peldanos = 5, alto = 0.9, fondoPeldano = 0.34 } = o;
  const m = materiales.obtener(o.material ?? 'silleria', { color: o.color });
  const lote = o.lote ?? kit.lote0, M = matriz(x, 0, z, rot);
  const hp = alto / peldanos, total = fondoPeldano * peldanos;
  for (let i = 0; i < peldanos; i++) {
    const h = hp * (i + 1), dep = fondoPeldano * (peldanos - i);
    lote.anadir(cajaRedondeada(ancho, h, dep, 0.02, 1), m, mm(M, 0, h / 2, -total / 2 + i * fondoPeldano + dep / 2));
  }
  if (o.barandilla) {
    const mH = materiales.obtener('hierro_forjado');
    const L = Math.hypot(total, alto), ang = -Math.atan2(alto, total);
    for (const s of [-1, 1]) {
      lote.anadir(cajaRedondeada(0.05, 0.05, L, 0.01, 1), mH, mm(M, s * (ancho / 2 + 0.05), alto / 2 + 0.9, 0, 0, ang, 0));
      for (let k = 0; k <= peldanos; k++) lote.anadir(cajaRedondeada(0.03, 0.9, 0.03, 0.005, 1), mH, mm(M, s * (ancho / 2 + 0.05), (hp * k) + 0.45, -total / 2 + k * fondoPeldano));
    }
  }
  return { x, z, rot };
}

// ───────────────────────── bloques, rocas y árboles ─────────────────────────
export function construirBloque(kit, o = {}) {
  const { x = 0, z = 0, ancho = 2, fondo = 2, alto = 1.2, rot = 0 } = o;
  const m = o.mat ?? materiales.obtener(o.material ?? 'hormigon', { color: o.color, desgaste: o.desgaste });
  (o.lote ?? kit.lote0).anadir(cajaRedondeada(ancho, alto, fondo, o.radio ?? 0.06, 2), m, matriz(x, (o.y ?? 0) + alto / 2, z, rot));
  if (o.colision !== false) return kit.muro(x, z, ancho, fondo, rot, { bloqueaBalas: o.bloqueaBalas ?? alto >= 1.0, nombre: o.nombre || 'bloque' });
  return null;
}

export function construirRoca(kit, o = {}) {
  const { x = 0, z = 0, radio = 1.2 } = o;
  const rng = crearRng((o.semilla ?? 1) * 17 + Math.floor(x * 5 + z * 3));
  const g = new THREE.IcosahedronGeometry(1, 2);
  const p = g.attributes.position;
  const sx = rng.rango(0.8, 1.2), sy = rng.rango(0.55, 0.85), sz = rng.rango(0.8, 1.2);
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i).normalize();
    const n = 1 + (Math.sin(v.x * 4.1 + 1) * Math.cos(v.y * 3.3) + Math.sin(v.z * 5.7 + v.x * 2)) * 0.16;
    p.setXYZ(i, v.x * n * sx, Math.max(-0.35, v.y * n * sy), v.z * n * sz);
  }
  g.computeVertexNormals();
  const m = materiales.obtener(o.material ?? 'silleria', { color: o.color ?? 0x8c8a84 });
  (o.lote ?? kit.lote0).anadir(g, m, matriz(x, radio * 0.28, z, rng() * 6.28, 0, 0, radio));
  if (o.colision !== false) kit.pilar(x, z, radio * 0.82, { nombre: 'roca' });
}

export function construirArbol(kit, o = {}) {
  const { x = 0, z = 0, tipo = 'roble', escala = 1 } = o;
  const rng = crearRng((o.semilla ?? 1) * 97 + Math.floor(x * 3 + z * 5));
  const lote = o.lote ?? kit.lote0;
  const mT = materiales.obtener('troncos', { color: o.colorTronco ?? 0x6a5642 });
  const M = matriz(x, 0, z, rng() * 6.28, 0, 0, escala);
  const H = (o.alto ?? (tipo === 'pino' ? 9 : tipo === 'muerto' ? 5.5 : 7)) ;
  lote.anadir(cilindro(0.32, 0.16, H * 0.55, 10, 0.02), mT, M, { uv: 'tablas_viejas' });
  if (tipo === 'muerto') {
    for (let i = 0; i < 5; i++) {
      const y = H * (0.3 + rng() * 0.45), a = rng() * 6.28, l = rng.rango(1.3, 2.4);
      const g = cilindro(0.1, 0.03, l, 6, 0.01);
      lote.anadir(g, mT, mm(M, 0, y, 0, a, Math.PI / 2 - rng.rango(0.5, 1.0), 0), { uv: 'tablas_viejas' });
    }
  } else {
    const mF = materiales.obtener('hierba', { color: o.colorHojas ?? (tipo === 'pino' ? 0x2e4a2a : 0x5a7a2c), desgaste: 0.5 });
    const n = tipo === 'pino' ? 4 : 5;
    for (let i = 0; i < n; i++) {
      const g = new THREE.IcosahedronGeometry(1, 2);
      const p = g.attributes.position;
      for (let k = 0; k < p.count; k++) { const f = 1 + 0.14 * Math.sin(p.getX(k) * 5 + i) * Math.cos(p.getZ(k) * 4 + i * 2); p.setXYZ(k, p.getX(k) * f, p.getY(k) * f * (tipo === 'pino' ? 1.25 : 0.85), p.getZ(k) * f); }
      g.computeVertexNormals();
      const r = tipo === 'pino' ? 2.0 - i * 0.35 : rng.rango(1.5, 2.3);
      const a = rng() * 6.28, d = tipo === 'pino' ? 0 : rng.rango(0.3, 1.5);
      lote.anadir(g, mF, mm(M, Math.cos(a) * d, H * (tipo === 'pino' ? 0.38 + i * 0.17 : 0.62) + rng() * 0.9, Math.sin(a) * d, 0, 0, 0, r));
    }
  }
  if (o.colision !== false) kit.pilar(x, z, 0.32 * escala, { nombre: 'arbol' });
}

void extruir;
