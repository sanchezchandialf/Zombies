// Arsenal de ERA Z · API pública (ver docs/ARQUITECTURA.md §Arsenal).
//   crearModeloArma(armaId) → Group       cañón a +Z, empuñadura (mano derecha) en el origen, +Y arriba, metros.
//        userData: armaId, boca (Vector3), manoIzq (Vector3|null), doble (bool), pose ('larga'|'pistola'|'doble'|'pesada'|'cuerpo'|'arrojadiza'), longitud
//   crearModeloTorreta(eraIdx) → Group        userData.cabeza (gira en Y), boca (local a la cabeza), canones (grupo que gira en Z al disparar)
//   crearModeloEmplazamiento(eraIdx) → Group  ídem + userData.asiento (Vector3 local a la base: dónde se coloca el tirador)
//   crearIconoArma(armaId, tam=128) → HTMLCanvasElement   silueta blanca de perfil (proporción 2:1: tam × tam/2), cacheada
// Las geometrías (fusionadas por material) y los materiales se crean una sola vez y se comparten entre todas las instancias.
import * as THREE from 'three';
import { matArma, liberarMaterialesArsenal } from './materiales.js';
import { Constructor } from './piezas.js';
import { ARMAS_E0 } from './era0.js';
import { ARMAS_E1 } from './era1.js';
import { ARMAS_E2 } from './era2.js';
import { ARMAS_E3 } from './era3.js';
import { ARMAS_E4 } from './era4.js';
import { ARMAS_E5 } from './era5.js';
import { TORRETAS } from './torretas.js';
import { EMPLAZAMIENTOS } from './emplazamientos.js';

const FABRICAS = { ...ARMAS_E0, ...ARMAS_E1, ...ARMAS_E2, ...ARMAS_E3, ...ARMAS_E4, ...ARMAS_E5 };
export const IDS_ARMAS = Object.keys(FABRICAS);

const cacheArma = new Map();   // id → { partes:[{mat,geo}], ud }
const cacheEsc = new Map();    // 'torreta:i' | 'emplazamiento:i' → { grupos, ud }
const cacheIcono = new Map();

const v3 = (a) => (a ? new THREE.Vector3(a[0], a[1], a[2]) : null);

function datosArma(id) {
  let d = cacheArma.get(id);
  if (d) return d;
  const f = FABRICAS[id];
  const b = new Constructor();
  let ud;
  if (f) ud = f(b);
  else { b.caja('acero', [0.05, 0.08, 0.7], [0, 0.04, 0.25], 0.008); ud = { boca: [0, 0.05, 0.6], manoIzq: [0, 0.03, 0.3], pose: 'larga' }; }
  const partes = b.construir();
  // longitud total para encuadre
  const box = new THREE.Box3();
  for (const p of partes) box.union(p.geo.boundingBox);
  d = { partes, ud: { ...ud, longitud: box.max.z - box.min.z, caja: box } };
  cacheArma.set(id, d);
  return d;
}

/** Modelo de arma: cañón hacia +Z, empuñadura en el origen, arriba +Y. */
export function crearModeloArma(armaId) {
  const d = datosArma(armaId);
  const g = new THREE.Group();
  g.name = 'arma_' + armaId;
  for (const p of d.partes) {
    const m = new THREE.Mesh(p.geo, matArma(p.mat));
    m.castShadow = true; m.matrixAutoUpdate = true;
    g.add(m);
  }
  const u = d.ud;
  g.userData = {
    armaId, boca: v3(u.boca), manoIzq: v3(u.manoIzq), doble: !!u.doble, pose: u.pose || 'larga', longitud: u.longitud,
    // posición del segundo arma (mano izquierda) en armas dobles, y punto de la boca del segundo
    bocaIzq: v3(u.bocaIzq),
  };
  return g;
}

function datosEscena(clave, def) {
  let d = cacheEsc.get(clave);
  if (d) return d;
  const r = def();
  const sec = (c) => (c ? c.construir() : []);
  d = { base: sec(r.base), cabeza: sec(r.cabeza), canones: sec(r.canones), r };
  cacheEsc.set(clave, d);
  return d;
}
function montar(clave, def) {
  const d = datosEscena(clave, def), r = d.r;
  const g = new THREE.Group(); g.name = clave;
  const malla = (p) => { const m = new THREE.Mesh(p.geo, matArma(p.mat)); m.castShadow = true; return m; };
  for (const p of d.base) g.add(malla(p));
  const cabeza = new THREE.Group(); cabeza.name = 'cabeza'; cabeza.position.set(...(r.posCabeza || [0, 1, 0])); g.add(cabeza);
  for (const p of d.cabeza) cabeza.add(malla(p));
  let canones = null;
  if (d.canones.length) {
    canones = new THREE.Group(); canones.name = 'canones'; canones.position.set(...(r.posCanones || [0, 0, 0])); cabeza.add(canones);
    for (const p of d.canones) canones.add(malla(p));
  }
  g.userData = { cabeza, canones, boca: v3(r.boca), altura: r.altura ?? 1.2, radio: r.radio ?? 0.6, nombre: r.nombre };
  if (r.asiento) g.userData.asiento = v3(r.asiento);
  if (r.ruedas) g.userData.ruedas = r.ruedas;
  return g;
}
const eraIdx = (i) => Math.max(0, Math.min(5, i | 0));

/** Torreta automática del Ingeniero de la era. */
export function crearModeloTorreta(i = 0) { i = eraIdx(i); return montar('torreta:' + i, TORRETAS[i]); }
/** Arma fija tripulable de la era. */
export function crearModeloEmplazamiento(i = 0) { i = eraIdx(i); return montar('emplazamiento:' + i, EMPLAZAMIENTOS[i]); }

// ───────────────────────────── Iconos ─────────────────────────────
/** Silueta de perfil (blanca sobre transparente) rasterizada en 2D a partir de la geometría del modelo; sin WebGL. */
export function crearIconoArma(armaId, tam = 128) {
  const clave = armaId + ':' + tam;
  let c = cacheIcono.get(clave);
  if (c) return c;
  const d = datosArma(armaId);
  const W = tam, H = Math.round(tam / 2);
  c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  const bx = d.ud.caja;
  const zmin = bx.min.z, zmax = bx.max.z, ymin = bx.min.y, ymax = bx.max.y;
  const margen = Math.max(2, Math.round(tam * 0.04));
  const esc = Math.min((W - margen * 2) / (zmax - zmin), (H - margen * 2) / (ymax - ymin));
  const ox = (W - (zmax - zmin) * esc) / 2 - zmin * esc, oy = (H + (ymax - ymin) * esc) / 2 + ymin * esc;
  g.fillStyle = '#fff'; g.strokeStyle = '#fff'; g.lineJoin = 'round'; g.lineWidth = Math.max(0.6, tam / 220);
  g.beginPath();
  for (const p of d.partes) {
    if (p.mat === 'negro' || p.mat === 'vidrio_c') continue;
    const pos = p.geo.attributes.position;
    for (let i = 0; i < pos.count; i += 3) {
      let ax = pos.getZ(i) * esc + ox, ay = oy - pos.getY(i) * esc, bx2 = pos.getZ(i + 1) * esc + ox, by = oy - pos.getY(i + 1) * esc;
      let cx = pos.getZ(i + 2) * esc + ox, cy = oy - pos.getY(i + 2) * esc;
      if ((bx2 - ax) * (cy - ay) - (by - ay) * (cx - ax) < 0) { const tx = bx2, ty = by; bx2 = cx; by = cy; cx = tx; cy = ty; } // mismo giro: el relleno no se anula
      g.moveTo(ax, ay); g.lineTo(bx2, by); g.lineTo(cx, cy); g.closePath();
    }
  }
  g.fill('nonzero'); g.stroke();
  cacheIcono.set(clave, c);
  return c;
}

/** Libera geometrías cacheadas y materiales del Arsenal (los modelos ya creados dejarán de ser válidos). */
export function liberarArsenal() {
  for (const d of cacheArma.values()) for (const p of d.partes) p.geo.dispose();
  for (const d of cacheEsc.values()) for (const k of ['base', 'cabeza', 'canones']) for (const p of d[k]) p.geo.dispose();
  cacheArma.clear(); cacheEsc.clear(); cacheIcono.clear();
  liberarMaterialesArsenal();
}
export { matArma };
