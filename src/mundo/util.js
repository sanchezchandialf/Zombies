// Ayudas compartidas del módulo Mundo (las usan src/mundo/*.js y src/mundo/interactivos/*.js).
//
// API
// ───────────────────────────────────────────────────────────────────────────────────────────────
//  Materiales
//    mat(nombre, opciones?, respaldo?)   Material de la biblioteca PBR (docs/MATERIALES.md) con respaldo si falla. Compartido: no lo modifiques.
//    matSimple(color, { rugosidad, metal, emisivo, emisivoInt, transparente, opacidad })   Material estándar cacheado por parámetros.
//    matMadera(variante = 'tablones')    'tablones' | 'vieja' | 'oscura' | 'lacada' | 'troncos'
//    matMetal(variante = 'forjado')      'forjado' | 'oxidado' | 'laton' | 'acero' | 'cromo' | 'pintado' (opciones.color)
//    matEmisivo(color, intensidad = 2)   Material emisivo para bloom (luces, pantallas, cristales de energía).
//
//  Daño
//    crearDaniable(destino, { juego, vida, material, bando = 'neutral', radio, pos, resistencias, alDanio(info, real), alMorir(info) })
//        Añade a `destino` la interfaz Dañable (bando, vivo, pos, radio, material, vida, vidaMax, recibirDanio, reparar) y lo devuelve.
//        `resistencias` = { bala: 0.5, explosivo: 1.5 … } multiplica el daño por tipo. recibirDanio guarda `ultimoDanio` (info) y `tDanio`.
//
//  Física
//    crearCuerpoProp(juego, { x, z, radio | hx,hz, rot, masa, amortiguacion, rebote, capa, datos, … })   Cuerpo dinámico (círculo) o estático (caja).
//
//  Construcción de modelos (geometría fusionada por material, UV por mundo para los materiales de la biblioteca)
//    new Ensamble()  →  .caja(mat, [w,h,d], pos, { rot:[x,y,z], radio })  .cil(mat, radioSup, alto, pos, { rot, r2, seg })
//                       .esf(mat, r, pos, { esc:[x,y,z], seg })  .toro(mat, R, r, pos, { rot, seg })  .perfil(mat, [[r,y],…], pos, { seg, rot })
//                       .geo(mat, geometria, pos, { rot, esc, plano })   (plano: true = normales por cara, para sólidos facetados)  .construir(nombre?) → Group (una malla por material)
//    `mat` = Material (de mat()/matSimple()…). Los de la biblioteca se proyectan en metros automáticamente.
//    modeloCacheado(clave, fn) → Group    Construye una vez `fn()` y devuelve clones que comparten geometría y materiales.
//    cajaRedondeada(w, h, d, radio, seg = 2) → BufferGeometry
//
//  Resaltado e interacción
//    crearResaltador(juego) → { marcar(indiceJugador, obj), actualizar(dt), limpiar() }   Halo pulsante en el suelo bajo el interactivo cercano.
//
//  Varios
//    colorEra(eraIdx), ruidoHash(a, b), quitarGrupo(grupo)  (retira de la escena; no libera geometría compartida),
//    emitir(juego, nombre, x, y, z, opciones)  (FX con encadenamiento opcional),  sonar(juego, nombre, x, z, opciones)  (audio con encadenamiento opcional),
//    anilloSuelo(radio, color, opacidad)  → Mesh plano (disco con borde) para zonas/avisos.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { materiales, uvMundo } from '../render/materiales/index.js';
import { CAPA, TODAS } from '../nucleo/fisica.js';
import { ERAS } from '../datos/eras.js';

// ───────────────────────────── Materiales ─────────────────────────────
const cacheSimple = new Map();
const avisados = new Set();

export function mat(nombre, opciones = {}, respaldo = 0x888888) {
  try { return materiales.obtener(nombre, opciones); } catch (e) {
    if (!avisados.has(nombre)) { avisados.add(nombre); console.warn('[mundo] material no disponible:', nombre, e?.message); }
    return matSimple(respaldo);
  }
}

export function matSimple(color, o = {}) {
  const k = [color, o.rugosidad ?? '', o.metal ?? '', o.emisivo ?? '', o.emisivoInt ?? '', o.transparente ?? '', o.opacidad ?? ''].join('|');
  let m = cacheSimple.get(k);
  if (m) return m;
  m = new THREE.MeshStandardMaterial({
    color, roughness: o.rugosidad ?? 0.6, metalness: o.metal ?? 0.1,
    emissive: o.emisivo ?? 0x000000, emissiveIntensity: o.emisivoInt ?? 1,
    transparent: !!o.transparente, opacity: o.opacidad ?? 1,
  });
  if (o.transparente) m.depthWrite = false;
  cacheSimple.set(k, m);
  return m;
}

export function matEmisivo(color, intensidad = 2) {
  const k = 'em|' + color + '|' + intensidad;
  let m = cacheSimple.get(k);
  if (!m) {
    m = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.4, metalness: 0, emissive: new THREE.Color(color), emissiveIntensity: intensidad });
    cacheSimple.set(k, m);
  }
  return m;
}

export function matMadera(variante = 'tablones') {
  switch (variante) {
    case 'vieja': return mat('tablas_viejas', {}, 0x8a7a62);
    case 'oscura': return mat('madera_lacada', { color: 0x4a2c16, desgaste: 0.5 }, 0x4a2c16);
    case 'lacada': return mat('madera_lacada', { color: 0x8a5a2e }, 0x8a5a2e);
    case 'troncos': return mat('troncos', {}, 0x6a4a2a);
    default: return mat('tablones', {}, 0x9a7a4a);
  }
}

export function matMetal(variante = 'forjado', o = {}) {
  switch (variante) {
    case 'oxidado': return mat('hierro_oxidado', {}, 0x7a4a30);
    case 'laton': return mat('laton_bronce', {}, 0xb08a40);
    case 'acero': return mat('acero_cepillado', {}, 0xaaaaaa);
    case 'cromo': return mat('cromo', {}, 0xdddddd);
    case 'pintado': return mat('acero_pintado', { color: o.color ?? 0x8a2a20, desgaste: o.desgaste ?? 0.5 }, o.color ?? 0x8a2a20);
    default: return mat('hierro_forjado', {}, 0x2a2a2e);
  }
}

// ───────────────────────────── Daño ─────────────────────────────
export function crearDaniable(d, o = {}) {
  d.bando = o.bando ?? 'neutral';
  d.vivo = true;
  d.pos = o.pos ?? d.pos ?? new THREE.Vector3(o.x ?? 0, 0, o.z ?? 0);
  d.radio = o.radio ?? d.radio ?? 0.5;
  d.material = o.material ?? 'madera';
  d.vidaMax = o.vida ?? 50;
  d.vida = d.vidaMax;
  d.ultimoDanio = null; d.tDanio = -99;
  const res = o.resistencias || null;
  d.recibirDanio = function recibirDanio(info) {
    if (!this.vivo || !info) return 0;
    let c = Number(info.cantidad) || 0;
    if (res && res[info.tipo] != null) c *= res[info.tipo];
    if (this.inmune) c = 0;
    if (c <= 0) return 0;
    const real = Math.min(this.vida, c);
    this.vida -= real;
    this.ultimoDanio = info;
    this.tDanio = o.juego?.tiempo?.ahora ?? 0;
    try { o.alDanio?.call(this, info, real); } catch (e) { console.error('[mundo] alDanio', e); }
    if (this.vida <= 0.0001) {
      this.vida = 0; this.vivo = false;
      try { o.alMorir?.call(this, info); } catch (e) { console.error('[mundo] alMorir', e); }
    }
    return real;
  };
  d.reparar = function reparar(cantidad) {
    if (!this.vivo) return 0;
    const antes = this.vida;
    this.vida = Math.min(this.vidaMax, this.vida + cantidad);
    if (this.vida > antes) o.alReparar?.call(this, this.vida - antes);
    return this.vida - antes;
  };
  return d;
}

// ───────────────────────────── Física ─────────────────────────────
export function crearCuerpoProp(juego, o) {
  const dinamico = (o.masa ?? 0) > 0;
  const base = {
    x: o.x, z: o.z, rot: o.rot || 0, masa: o.masa ?? 0,
    capa: o.capa ?? CAPA.PROP, mascara: o.mascara ?? TODAS,
    amortiguacion: o.amortiguacion ?? (dinamico ? 5 : 0), rebote: o.rebote ?? 0.15, rigidez: o.rigidez ?? 1,
    datos: o.datos ?? null, alColisionar: o.alColisionar, bloqueaBalas: o.bloqueaBalas ?? true,
    bloqueaVision: o.bloqueaVision ?? false, sensor: o.sensor,
  };
  if (o.hx != null) Object.assign(base, { forma: 'caja', hx: o.hx, hz: o.hz ?? o.hx });
  else Object.assign(base, { forma: 'circulo', radio: o.radio ?? 0.5 });
  return juego.fisica.crearCuerpo(base);
}

// ───────────────────────────── Ensamble de modelos ─────────────────────────────
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3();

export function cajaRedondeada(w, h, d, r = 0.02, seg = 2) {
  return new RoundedBoxGeometry(w, h, d, seg, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4));
}

export class Ensamble {
  constructor() { this.piezas = new Map(); }
  /** Añade una geometría ya creada, con transformación. */
  geo(material, geometria, pos = [0, 0, 0], o = {}) {
    const rot = o.rot || [0, 0, 0], esc = o.esc || [1, 1, 1];
    _e.set(rot[0], rot[1], rot[2], 'YXZ'); _q.setFromEuler(_e);
    _p.set(pos[0], pos[1], pos[2]); _s.set(esc[0], esc[1], esc[2]);
    _m4.compose(_p, _q, _s);
    let g = geometria.clone();
    g.applyMatrix4(_m4);
    const info = material.name && materiales.existe?.(material.name) ? materiales.info(material.name) : null;
    if (info) g = uvMundo(g, info.escala);        // proyección en metros (espacio ya transformado)
    else if (g.index) g = g.toNonIndexed();
    if (o.plano) g.computeVertexNormals();      // caras planas (duelas, facetas)
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') g.deleteAttribute(k);
    let l = this.piezas.get(material);
    if (!l) this.piezas.set(material, (l = []));
    l.push(g);
    geometria.dispose();
    return this;
  }
  caja(material, [w, h, d], pos, o = {}) { return this.geo(material, cajaRedondeada(w, h, d, o.radio ?? Math.min(w, h, d) * 0.12, o.seg ?? 2), pos, o); }
  cil(material, r, alto, pos, o = {}) { return this.geo(material, new THREE.CylinderGeometry(o.r2 ?? r, r, alto, o.seg ?? 16, 1, !!o.abierto), pos, o); }
  esf(material, r, pos, o = {}) { return this.geo(material, new THREE.SphereGeometry(r, o.seg ?? 16, Math.max(6, (o.seg ?? 16) >> 1)), pos, o); }
  toro(material, R, r, pos, o = {}) { return this.geo(material, new THREE.TorusGeometry(R, r, o.seg2 ?? 8, o.seg ?? 24), pos, { rot: [Math.PI / 2, 0, 0], ...o }); }
  /** Sólido de revolución: perfil [[radio, y], …] de abajo arriba. */
  perfil(material, pts, pos, o = {}) {
    const g = new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), o.seg ?? 20);
    return this.geo(material, g, pos, o);
  }
  construir(nombre = 'modelo') {
    const grupo = new THREE.Group(); grupo.name = nombre;
    for (const [material, lista] of this.piezas) {
      const g = mergeGeometries(lista, false);
      for (const x of lista) x.dispose();
      if (!g) continue;
      g.computeBoundingSphere();
      const m = new THREE.Mesh(g, material);
      m.castShadow = true; m.receiveShadow = true;
      m.userData.geoPropia = true;
      grupo.add(m);
    }
    this.piezas.clear();
    return grupo;
  }
}

const modelos = new Map();
/** Construye una vez `fn()` (que devuelve un Group) y entrega clones que comparten geometría y materiales. */
export function modeloCacheado(clave, fn) {
  let g = modelos.get(clave);
  if (!g) { g = fn(); modelos.set(clave, g); }
  const c = g.clone(true);
  c.traverse((o) => { if (o.userData) o.userData = { ...o.userData, geoPropia: false }; });
  return c;
}
export function liberarModelos() {
  for (const g of modelos.values()) g.traverse((o) => { if (o.geometry && o.userData.geoPropia) o.geometry.dispose(); });
  modelos.clear();
}

// ───────────────────────────── Varios ─────────────────────────────
export const colorEra = (eraIdx) => ERAS[Math.max(0, Math.min(5, eraIdx | 0))].color;
export function ruidoHash(a, b = 0) {
  let h = Math.imul((a * 374761393) ^ (b * 668265263), 1274126177) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 1103515245) >>> 0;
  return (h & 0xffff) / 65535;
}
export function quitarGrupo(g) { g?.parent?.remove(g); }
export function emitir(juego, nombre, x, y, z, o) { try { juego.fx?.emitir?.(nombre, { x, y, z }, o); } catch (e) { /* FX opcional */ } }
export function sonar(juego, nombre, x, z, o = {}) { try { juego.audio?.reproducir?.(nombre, { x, z, ...o }); } catch (e) { /* audio opcional */ } }

let _texAnillo = null;
function texturaAnillo() {
  if (_texAnillo) return _texAnillo;
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  const gr = g.createRadialGradient(64, 64, 8, 64, 64, 62);
  gr.addColorStop(0, 'rgba(255,255,255,0)'); gr.addColorStop(0.55, 'rgba(255,255,255,0.10)');
  gr.addColorStop(0.82, 'rgba(255,255,255,0.55)'); gr.addColorStop(0.9, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 128, 128);
  _texAnillo = new THREE.CanvasTexture(c); _texAnillo.colorSpace = THREE.SRGBColorSpace;
  return _texAnillo;
}

/** Disco plano en el suelo con borde brillante (halos, áreas de aviso). Material propio: libéralo con `m.material.dispose()`. */
export function anilloSuelo(radio, color = 0xffffff, opacidad = 0.6) {
  const m = new THREE.MeshBasicMaterial({ map: texturaAnillo(), color, transparent: true, opacity: opacidad, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(radio * 2, radio * 2), m);
  mesh.rotation.x = -Math.PI / 2; mesh.position.y = 0.06; mesh.renderOrder = 3; mesh.frustumCulled = false;
  return mesh;
}

/** Halo pulsante bajo el interactivo más cercano de cada jugador. Se llama a `marcar` desde interactivoCercano y a `actualizar` cada cuadro. */
export function crearResaltador(juego) {
  const halos = [];
  const _c = new THREE.Color();
  function asegurar(i) {
    if (halos[i]) return halos[i];
    const m = anilloSuelo(1, 0xffffff, 0.0);
    m.visible = false; m.name = 'haloInteractivo';
    juego.render?.escena?.add(m);
    return (halos[i] = { malla: m, marcado: 0, obj: null, nivel: 0 });
  }
  return {
    marcar(i, obj) { const h = asegurar(i ?? 0); h.obj = obj; h.marcado = 2; },
    actualizar(dt) {
      const t = juego.tiempo?.real ?? 0;
      for (const h of halos) {
        if (!h) continue;
        if (h.marcado > 0) h.marcado--;
        const quiere = h.marcado > 0 && h.obj ? 1 : 0;
        h.nivel += (quiere - h.nivel) * Math.min(1, dt * 12 + (dt === 0 ? 1 : 0));
        const vis = h.nivel > 0.02;
        h.malla.visible = vis;
        if (!vis) continue;
        if (!h.malla.parent) juego.render?.escena?.add(h.malla);
        const o = h.obj, p = o.pos;
        const r = (o.radioHalo ?? Math.max(0.8, (o.radioUso ?? 1.8) * 0.42));
        const pulso = 0.5 + 0.5 * Math.sin(t * 4.2);
        h.malla.position.set(p.x, 0.07, p.z);
        h.malla.scale.setScalar(r * (1 + pulso * 0.08));
        _c.set(o.colorHalo ?? 0xfff2c0);
        h.malla.material.color.copy(_c);
        h.malla.material.opacity = h.nivel * (0.35 + 0.4 * pulso);
      }
    },
    limpiar() {
      for (const h of halos) if (h) { h.malla.parent?.remove(h.malla); h.malla.geometry.dispose(); h.malla.material.dispose(); }
      halos.length = 0;
    },
  };
}

// ───────────────────────────── Vuelco visual de props físicos ─────────────────────────────
/**
 * Resorte de inclinación para objetos empujables: ante un cambio brusco de velocidad se inclina (vuelco visual) y recupera.
 *   const inc = crearInclinacion({ rigidez: 60, amort: 6, sensibilidad: 0.07 });
 *   inc.actualizar(cuerpo, dt) → { x, z, y }   // ángulos (rad) alrededor de X y Z del mundo y elevación (m)
 */
export function crearInclinacion(o = {}) {
  const k = o.rigidez ?? 70, c = o.amort ?? 6.5, s = o.sensibilidad ?? 0.075, tope = o.tope ?? 0.7;
  const e = { x: 0, z: 0, vx: 0, vz: 0, y: 0, pvx: 0, pvz: 0, ok: false, salida: { x: 0, z: 0, y: 0 } };
  e.actualizar = function (cuerpo, dt) {
    const dvx = cuerpo.vx - e.pvx, dvz = cuerpo.vz - e.pvz;
    if (e.ok && dt > 0) {
      const m = Math.hypot(dvx, dvz);
      if (m > 1.2) { e.vz += -dvx * s * 14; e.vx += dvz * s * 14; }     // un golpe fuerte vuelca el objeto en el sentido del impulso
    }
    e.ok = true; e.pvx = cuerpo.vx; e.pvz = cuerpo.vz;
    // resorte amortiguado (subpasos para estabilidad con dt grandes)
    const n = Math.max(1, Math.ceil(dt / 0.012)), h = dt / n;
    for (let i = 0; i < n; i++) {
      e.vx += (-k * e.x - c * e.vx) * h; e.vz += (-k * e.z - c * e.vz) * h;
      e.x = Math.max(-tope, Math.min(tope, e.x + e.vx * h)); e.z = Math.max(-tope, Math.min(tope, e.z + e.vz * h));
    }
    // se apoya un poco inclinado: sube un pelo al volcar
    e.y = Math.min(0.2, Math.hypot(e.x, e.z) * 0.18);
    e.salida.x = e.x; e.salida.z = e.z; e.salida.y = e.y;
    return e.salida;
  };
  return e;
}
