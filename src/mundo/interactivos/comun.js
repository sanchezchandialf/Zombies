// Utilidades comunes de los interactivos de era (MUNDO-ERAS). Interno del módulo `src/mundo/interactivos/`.
//  · Malla: acumula geometría por material y la fusiona (una malla por material).
//  · Interactivo: clase base (Dañable, registro de uso, luces/emisores/cuerpos con limpieza, enfriamiento).
//  · Rayos: arcos eléctricos en una sola malla aditiva (se actualizan cada cuadro).
//  · Helpers de efectos tolerantes a sistemas ausentes (fx?., audio?., combate?.).
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materiales, uvMundo } from '../../render/materiales/index.js';
import { CAPA } from '../../nucleo/fisica.js';

export { THREE, CAPA };
export const TAU = Math.PI * 2;
export const rango = (a, b) => a + Math.random() * (b - a);
export const lim = (v, a, b) => (v < a ? a : v > b ? b : v);
export const suave = (t) => { t = lim(t, 0, 1); return t * t * (3 - 2 * t); };

// ───────────────────────── Materiales ─────────────────────────
const _emis = new Map();
const _gris = new THREE.MeshStandardMaterial({ color: 0x777777, roughness: 0.7, metalness: 0.2 });

/** Material por nombre del catálogo (`'acero_pintado'`), `[nombre, opciones]` o un Material ya hecho. */
export function mat(spec) {
  if (spec && spec.isMaterial) return spec;
  const [n, o] = Array.isArray(spec) ? spec : [spec, undefined];
  try { return materiales.obtener(n, o); } catch (e) { return _gris; }
}
/** Material emisivo compartido (llama, cristal luminoso, piloto). */
export function emisivo(color, intensidad = 2, extra = {}) {
  const k = `${color}|${intensidad}|${JSON.stringify(extra)}`;
  let m = _emis.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: new THREE.Color(color).multiplyScalar(0.25), emissive: color, emissiveIntensity: intensidad, roughness: 0.4, metalness: 0, ...extra });
    _emis.set(k, m);
  }
  return m;
}
/** Material aditivo translúcido (halos, arcos, avisos). No compartido: lo libera quien lo pide. */
export function matAditivo(color, opacidad = 1) {
  return new THREE.MeshBasicMaterial({ color, transparent: true, opacity: opacidad, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
}

// ───────────────────────── Geometrías ─────────────────────────
export const caja = (w, h, d, r = 0.015, seg = 2) => new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2.01, h / 2.01, d / 2.01));
export const cil = (rs, ri, h, seg = 20) => new THREE.CylinderGeometry(rs, ri, h, seg, 1);
export const esfera = (r, seg = 20) => new THREE.SphereGeometry(r, seg, Math.max(8, seg >> 1));
export const toro = (R, r, seg = 24, tub = 8) => new THREE.TorusGeometry(R, r, tub, seg);
/** Sólido de revolución: puntos [[radio, y], …] (de abajo arriba). */
export const torno = (pts, seg = 28) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
/** Tubo por una polilínea de [x,y,z]. */
export function tubo(pts, radio = 0.02, seg = 24, rad = 6, cerrado = false) {
  const c = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), cerrado, 'catmullrom', 0.3);
  return new THREE.TubeGeometry(c, seg, radio, rad, cerrado);
}
/** Extrusión biselada de un perfil 2D (en XY) con profundidad en Z, centrada en Z. */
export function extruir(pts, prof, bisel = 0.02) {
  const s = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
  const g = new THREE.ExtrudeGeometry(s, { depth: prof, bevelEnabled: bisel > 0, bevelSize: bisel, bevelThickness: bisel, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -prof / 2);
  return g;
}

const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3();
/** tr: { p:[x,y,z], r:[rx,ry,rz], s: n | [sx,sy,sz] } */
export function matriz(tr = {}, out = new THREE.Matrix4()) {
  const p = tr.p || [0, 0, 0], r = tr.r || [0, 0, 0];
  const s = typeof tr.s === 'number' ? [tr.s, tr.s, tr.s] : tr.s || [1, 1, 1];
  _e.set(r[0], r[1], r[2], 'YXZ'); _q.setFromEuler(_e);
  return out.compose(_v.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
}

/** Acumulador de geometría estática por material. */
export class Malla {
  constructor() { this.grupos = new Map(); this.geos = []; }
  add(geo, spec, tr) {
    const M = matriz(tr);
    const nombre = typeof spec === 'string' ? spec : Array.isArray(spec) ? spec[0] : null;
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (geo.index || true) {
      for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    }
    if (nombre && !(spec && spec.isMaterial) && materiales.info?.(nombre)) g = uvMundo(g, nombre, { matriz: M });
    g.applyMatrix4(M);
    const clave = spec && spec.isMaterial ? spec.uuid : Array.isArray(spec) ? JSON.stringify(spec) : String(spec);
    let gr = this.grupos.get(clave);
    if (!gr) { gr = { spec, lista: [] }; this.grupos.set(clave, gr); }
    gr.lista.push(g);
    return this;
  }
  /** Fusiona y añade las mallas al padre. Devuelve las mallas. */
  construir(padre, { sombra = true, recibe = true } = {}) {
    const res = [];
    for (const { spec, lista } of this.grupos.values()) {
      const g = mergeGeometries(lista, false);
      for (const l of lista) l.dispose();
      if (!g) continue;
      const m = new THREE.Mesh(g, mat(spec));
      m.castShadow = sombra; m.receiveShadow = recibe;
      padre.add(m); res.push(m); this.geos.push(g);
    }
    this.grupos.clear();
    return res;
  }
}

// ───────────────────────── Rayos eléctricos ─────────────────────────
/** Arcos eléctricos como cintas cruzadas (vertical + horizontal) en una sola malla aditiva. */
export class Rayos {
  constructor(padre, { color = 0x9fd8ff, ancho = 0.05, maxSegmentos = 160, nucleo = 0xffffff } = {}) {
    this.max = maxSegmentos; this.ancho = ancho; this.n = 0;
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(maxSegmentos * 8 * 3);
    const ind = [];
    for (let i = 0; i < maxSegmentos * 2; i++) { const b = i * 4; ind.push(b, b + 1, b + 2, b + 2, b + 1, b + 3); }
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(ind);
    this.mat = matAditivo(color, 1);
    this.mesh = new THREE.Mesh(this.geo, this.mat);
    this.mesh.frustumCulled = false; this.mesh.renderOrder = 6;
    padre.add(this.mesh);
    // núcleo blanco más fino
    this.pos2 = new Float32Array(this.pos.length);
    this.geo2 = new THREE.BufferGeometry();
    this.geo2.setAttribute('position', new THREE.BufferAttribute(this.pos2, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo2.setIndex(ind);
    this.mat2 = matAditivo(nucleo, 1);
    this.mesh2 = new THREE.Mesh(this.geo2, this.mat2);
    this.mesh2.frustumCulled = false; this.mesh2.renderOrder = 7;
    padre.add(this.mesh2);
    this.geo.setDrawRange(0, 0); this.geo2.setDrawRange(0, 0);
  }
  limpiar() { this.n = 0; }
  _quad(arr, k, ax, ay, az, bx, by, bz, ux, uy, uz) {
    let o = k * 12;
    arr[o++] = ax - ux; arr[o++] = ay - uy; arr[o++] = az - uz;
    arr[o++] = ax + ux; arr[o++] = ay + uy; arr[o++] = az + uz;
    arr[o++] = bx - ux; arr[o++] = by - uy; arr[o++] = bz - uz;
    arr[o++] = bx + ux; arr[o++] = by + uy; arr[o++] = bz + uz;
  }
  /** Arco irregular de A a B (coordenadas de mundo o del padre). */
  arco(ax, ay, az, bx, by, bz, { seg = 8, jitter = 0.3, ancho = this.ancho, ramas = true } = {}) {
    const dx = bx - ax, dy = by - ay, dz = bz - az, L = Math.hypot(dx, dy, dz) || 1;
    // base ortogonal
    let px = -dz, pz = dx, pl = Math.hypot(px, pz); if (pl < 1e-4) { px = 1; pz = 0; pl = 1; }
    px /= pl; pz /= pl;
    const qx = (dy * pz) / L, qy = (dz * px - dx * pz) / L, qz = (-dy * px) / L;
    let x0 = ax, y0 = ay, z0 = az;
    for (let i = 1; i <= seg; i++) {
      if (this.n >= this.max) return;
      const t = i / seg, f = i === seg ? 0 : jitter * Math.sin(Math.PI * t) + jitter * 0.25;
      const a1 = rango(-f, f), a2 = rango(-f, f);
      const x1 = ax + dx * t + px * a1 + qx * a2, y1 = ay + dy * t + qy * a2, z1 = az + dz * t + pz * a1 + qz * a2;
      this._seg(x0, y0, z0, x1, y1, z1, ancho);
      if (ramas && i > 1 && i < seg && Math.random() < 0.18 && this.n < this.max - 3) {
        this._seg(x1, y1, z1, x1 + rango(-1, 1) * L * 0.12, y1 + rango(-0.5, 0.5) * L * 0.1, z1 + rango(-1, 1) * L * 0.12, ancho * 0.6);
      }
      x0 = x1; y0 = y1; z0 = z1;
    }
  }
  _seg(ax, ay, az, bx, by, bz, w) {
    const k = this.n * 2;
    this._quad(this.pos, k, ax, ay, az, bx, by, bz, 0, w, 0);
    this._quad(this.pos, k + 1, ax, ay, az, bx, by, bz, w, 0, 0);
    this._quad(this.pos2, k, ax, ay, az, bx, by, bz, 0, w * 0.35, 0);
    this._quad(this.pos2, k + 1, ax, ay, az, bx, by, bz, w * 0.35, 0, 0);
    this.n++;
  }
  subir(opacidad = 1) {
    const c = this.n * 12;
    this.geo.setDrawRange(0, this.n * 12); this.geo2.setDrawRange(0, this.n * 12);
    this.geo.attributes.position.needsUpdate = true; this.geo2.attributes.position.needsUpdate = true;
    this.mat.opacity = opacidad; this.mat2.opacity = opacidad;
    this.mesh.visible = this.mesh2.visible = this.n > 0;
  }
  destruir() {
    this.mesh.removeFromParent(); this.mesh2.removeFromParent();
    this.geo.dispose(); this.geo2.dispose(); this.mat.dispose(); this.mat2.dispose();
  }
}

/** Disco plano sobre el suelo (aviso, charco, halo). Material propio (lo libera el dueño con `liberar`). */
export function discoSuelo(radio, color, opacidad = 0.5, { aditivo = true, anillo = 0 } = {}) {
  const g = anillo > 0 ? new THREE.RingGeometry(radio * (1 - anillo), radio, 48) : new THREE.CircleGeometry(radio, 48);
  g.rotateX(-Math.PI / 2);
  const m = aditivo ? matAditivo(color, opacidad) : new THREE.MeshStandardMaterial({ color, transparent: true, opacity: opacidad, roughness: 0.3, depthWrite: false });
  if (!aditivo) { m.polygonOffset = true; m.polygonOffsetFactor = -2; }
  const mesh = new THREE.Mesh(g, m);
  mesh.position.y = 0.04; mesh.renderOrder = 2;
  return mesh;
}

// ───────────────────────── Clase base ─────────────────────────
export class Interactivo {
  /**
   * @param {object} juego
   * @param {string} tipo
   * @param {object} o  opciones de `crear` ({x, z, rot, …})
   * @param {{vida?:number, material?:string, radio?:number, resist?:object}} cfg
   */
  constructor(juego, tipo, o = {}, cfg = {}) {
    this.juego = juego; this.tipo = tipo; this.opciones = o;
    this.pos = new THREE.Vector3(o.x ?? 0, 0, o.z ?? 0);
    this.rot = o.rot ?? 0;
    this.bando = 'neutral'; this.material = cfg.material || 'madera';
    this.vidaMax = this.vida = cfg.vida ?? 100; this.radio = cfg.radio ?? 0.6;
    this.resist = cfg.resist || {};
    this.vivo = true; this.t = 0;
    this.estado = 'disponible';          // 'disponible' | 'activo' | 'enfriamiento' | 'destruido'
    this._cdTotal = 0; this._cdRest = 0;
    this.grupo = new THREE.Group();
    this.grupo.name = tipo;
    this.grupo.position.copy(this.pos); this.grupo.rotation.y = this.rot;
    this._escena = juego.render?.escena ?? null;
    this._luces = []; this._emisores = []; this._cuerpos = []; this._mallas = []; this._propios = []; this._reg = null; this._extras = [];
    this._escena?.add(this.grupo);
  }

  // ── enfriamiento (0 = listo, 1 = recién usado)
  get enfriamiento() { return this._cdTotal > 0 ? lim(this._cdRest / this._cdTotal, 0, 1) : 0; }
  get listo() { return this._cdRest <= 0 && this.vivo; }
  iniciarEnfriamiento(s) { this._cdTotal = this._cdRest = s; }

  // ── construcción
  malla() { const m = new Malla(); this._mallas.push(m); return m; }
  construir(m, padre = this.grupo, o) { return m.construir(padre, o); }
  /** Material propio (clon) que se libera al destruir. */
  propio(m) { const c = m.clone(); this._propios.push(c); return c; }
  /** Añade un objeto 3D con recursos propios (geometrías/materiales) que se liberan al destruir. */
  propioObj(o, padre = this.grupo) { padre.add(o); this._extras.push(o); return o; }
  cuerpo(def) { const c = this.juego.fisica?.crearCuerpo({ datos: this, ...def }); if (c) this._cuerpos.push(c); return c; }
  quitarCuerpo(c) { if (!c) return; this.juego.fisica?.eliminarCuerpo(c); const i = this._cuerpos.indexOf(c); if (i >= 0) this._cuerpos.splice(i, 1); }
  luz(o) {
    const l = this.juego.render?.luzPuntual?.({ color: 0xffaa55, intensidad: 50, distancia: 8, ...o });
    if (l) this._luces.push(l);
    return l;
  }
  quitarLuz(l) { if (!l) return; try { l.quitar?.(); } catch (e) { /* */ } const i = this._luces.indexOf(l); if (i >= 0) this._luces.splice(i, 1); }
  emisor(nombre, x, y, z, o) {
    const e = this.juego.fx?.crearEmisor?.(nombre, { x, y, z }, o);
    if (e) this._emisores.push(e);
    return e;
  }
  quitarEmisor(e) { if (!e) return; try { e.detener?.(); } catch (er) { /* */ } const i = this._emisores.indexOf(e); if (i >= 0) this._emisores.splice(i, 1); }

  /** Registra el interactivo en el mundo. cfg: { radioUso, etiqueta (string o ()=>string), puedeUsar(j), usar(j), mantener? } */
  registrar(cfg) {
    const yo = this;
    const reg = {
      pos: this.pos, objeto: this, radioUso: cfg.radioUso ?? 2.2, mantener: cfg.mantener,
      get etiqueta() { try { return typeof cfg.etiqueta === 'function' ? cfg.etiqueta() : cfg.etiqueta; } catch (e) { return ''; } },
      puedeUsar: (j) => { try { return yo.vivo && (cfg.puedeUsar ? !!cfg.puedeUsar(j) : yo.listo); } catch (e) { return false; } },
      usar: (j) => { try { if (yo.vivo) cfg.usar(j); } catch (e) { console.error(`[${yo.tipo}] usar`, e); } },
    };
    if (cfg.mantener === undefined) delete reg.mantener;
    this._reg = this.juego.mundo?.registrarInteractivo?.(reg) || reg;
    this.reg = reg;
    return reg;
  }

  // ── efectos tolerantes
  fx(nombre, x, y, z, o) { this.juego.fx?.emitir?.(nombre, { x, y, z }, o); }
  fxAqui(nombre, dy = 0.5, o) { this.fx(nombre, this.pos.x, dy, this.pos.z, o); }
  destello(x, y, z, color, intensidad, dur, radio) { this.juego.fx?.destello?.({ x, y, z }, color, intensidad, dur, radio); }
  calco(tipo, x, z, tam, o) { this.juego.fx?.calco?.(tipo, x, z, tam, o); }
  escombros(o) { this.juego.fx?.escombros?.(o); }
  sonido(nombre, o = {}) { this.juego.audio?.reproducir?.(nombre, { x: this.pos.x, z: this.pos.z, ...o }); }
  bucle(nombre, o = {}) { return this.juego.audio?.bucle?.(nombre, { x: this.pos.x, z: this.pos.z, ...o }) ?? null; }
  mensaje(texto, tipo = 'aviso', duracion = 3) { this.juego.eventos?.emitir?.('mensaje', { texto, tipo, duracion }); }
  sacudir(f, d) { this.juego.render?.sacudir?.(f, d); }
  explotar(o) {
    if (this.juego.combate?.explotar) this.juego.combate.explotar({ tipo: 'explosivo', atacante: null, ...o });
    else this.fx('explosion_grande', o.x, 0.5, o.z, { escala: o.radio / 5 });
  }
  zona(o) { return this.juego.combate?.crearZona?.({ tipo: 'fuego', dps: 10, afecta: 'todos', ...o }) ?? null; }
  danioA(objetivo, info) {
    if (!objetivo || objetivo.vivo === false) return 0;
    if (this.juego.combate?.aplicarDanio) return this.juego.combate.aplicarDanio(objetivo, info);
    return objetivo.recibirDanio?.(info) ?? 0;
  }
  /** Sistema de zombis (juego.zombis es la lista de entidades; el sistema vive en juego.sistemas.zombis). */
  get sisZombis() { return this.juego.sistemas?.zombis ?? this.juego.zombis; }
  atraer(x, z, r, d) { const s = this.sisZombis; if (typeof s?.atraer === 'function') s.atraer(x, z, r, d); }
  rehacerNavegacion() { const n = this.sisZombis?.navegacion; if (n) (n.reconstruirSuave ?? n.reconstruir)?.call(n); }
  /** Recorre zombis vivos (y opcionalmente jugadores vivos) a menos de r de (x,z). */
  alrededor(x, z, r, cb, { jugadores = false, zombis = true } = {}) {
    if (zombis) for (const e of this.juego.zombis || []) { if (e && e.vivo !== false && e.pos) { const d = Math.hypot(e.pos.x - x, e.pos.z - z); if (d <= r + (e.radio ?? 0.4)) cb(e, d); } }
    if (jugadores) for (const e of this.juego.jugadores || []) { if (e && e.vivo !== false && !e.caido && e.pos) { const d = Math.hypot(e.pos.x - x, e.pos.z - z); if (d <= r + 0.4) cb(e, d); } }
  }
  /** Fuego activo cercano (zonas de combate) */
  hayFuegoEn(x, z, r) {
    for (const zn of this.juego.combate?.zonas || []) if (zn.activo && zn.tipo === 'fuego' && Math.hypot(zn.x - x, zn.z - z) <= zn.radio + r) return true;
    return false;
  }
  /** ¿Está el punto (x,z) dentro de la caja local (centro pos, giro rot, semiejes hx,hz) más un margen? Devuelve distancia local o null. */
  enCajaLocal(x, z, hx, hz, margen = 0.3, cx = this.pos.x, cz = this.pos.z, rot = this.rot) {
    const dx = x - cx, dz = z - cz, c = Math.cos(rot), s = Math.sin(rot);
    const lx = dx * c - dz * s, lz = dx * s + dz * c;
    return Math.abs(lx) <= hx + margen && Math.abs(lz) <= hz + margen ? { lx, lz } : null;
  }

  // ── Dañable
  recibirDanio(info) {
    if (!this.vivo || !info) return 0;
    const mult = this.resist[info.tipo] ?? 1;
    const cant = (info.cantidad || 0) * mult;
    if (cant <= 0) return 0;
    const antes = this.vida;
    this.vida = Math.max(0, this.vida - cant);
    try { this.alDanio?.(info, cant); } catch (e) { console.error(`[${this.tipo}] alDanio`, e); }
    if (this.vida <= 0 && this.vivo) {
      this.vivo = false; this.estado = 'destruido';
      try { this.alDestruirse?.(info); } catch (e) { console.error(`[${this.tipo}] alDestruirse`, e); }
    }
    return antes - this.vida;
  }

  // ── ciclo de vida
  actualizar(dt) {
    if (!(dt > 0)) return;
    this.t += dt;
    if (this._cdRest > 0) { this._cdRest = Math.max(0, this._cdRest - dt); }
    try { this.paso?.(dt); } catch (e) { if (!this._errPaso) { this._errPaso = true; console.error(`[${this.tipo}] paso`, e); } }
  }
  destruir() {
    this.vivo = false;
    try { this.alLimpiar?.(); } catch (e) { /* */ }
    if (this._reg) this.juego.mundo?.quitarInteractivo?.(this._reg);
    if (this.reg && this.reg !== this._reg) this.juego.mundo?.quitarInteractivo?.(this.reg);
    this._reg = null;
    for (const c of [...this._cuerpos]) this.juego.fisica?.eliminarCuerpo(c);
    this._cuerpos.length = 0;
    for (const l of [...this._luces]) { try { l.quitar?.(); } catch (e) { /* */ } }
    this._luces.length = 0;
    for (const e of [...this._emisores]) { try { e.detener?.(); } catch (er) { /* */ } }
    this._emisores.length = 0;
    this.grupo.removeFromParent();
    this.grupo.traverse((n) => { if (n.isMesh) n.geometry?.dispose?.(); });
    for (const m of this._propios) m.dispose();
    for (const m of this._mallas) for (const g of m.geos) g.dispose();
    for (const x of this._extras) x.traverse?.((n) => { n.geometry?.dispose?.(); if (n.material && !n.material.userData?.compartido) n.material.dispose?.(); });
    this._propios.length = 0;
  }
}

/** Añade una fábrica al registro con captura de errores. */
export function dirDe(rot) { return { x: Math.sin(rot), z: Math.cos(rot) }; }
