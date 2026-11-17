// ERA Z · Biblioteca de materiales PBR procedurales.  Documentación: docs/MATERIALES.md
//
//   materiales.obtener(nombre, { color?, repetir?, desgaste?, mojado?, emisivo?, semilla? }) → Material compartido
//   materiales.lista() → [{ nombre, grupo, descripcion }]
//   materiales.texturas(nombre) → { map, normalMap, orm, emissiveMap }     materiales.info(nombre) → { escala, grupo, … }
//   uvMundo(geometria, escala | nombre) → geometría con UV por proyección de caja (en metros / escala)
//   materiales.mezclaSuelo(a, b, { mascara }) → material que mezcla dos suelos sin repetición
import * as THREE from 'three';
import { crearContexto, finalizar, ruidoMacro, col } from './texturas.js';
import { parchear, reloj } from './shader.js';
import { CATALOGO } from './catalogo/index.js';

const defs = new Map(CATALOGO.map((d) => [d.nombre, d]));
const paquetes = new Map();   // nombre|semilla → { map, normalMap, orm, emissiveMap, def }
const cache = new Map();      // clave de opciones → material
const config = { anisotropia: 8, calidad: 'alta' };
let macroTex = null;

function textura(datos, N, srgb, mips) {
  const t = new THREE.DataTexture(datos, N, N, THREE.RGBAFormat, THREE.UnsignedByteType);
  t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  t.anisotropy = config.anisotropia;
  t.flipY = false;
  if (mips) { t.mipmaps = mips; t.generateMipmaps = false; } else t.generateMipmaps = true;
  t.needsUpdate = true;
  return t;
}

function macro() {
  if (macroTex) return macroTex;
  const m = ruidoMacro(256);
  macroTex = textura(m.data, m.N, false, null);
  return macroTex;
}

function tamano(def) {
  const t = def.tam ?? 512;
  return config.calidad === 'baja' ? Math.min(t, 256) : config.calidad === 'media' ? Math.min(t, 512) : t;
}

function paquete(nombre, semilla = 1) {
  const clave = nombre + '|' + semilla;
  let p = paquetes.get(clave);
  if (p) return p;
  const def = defs.get(nombre);
  if (!def) throw new Error('Material desconocido: ' + nombre);
  const N = tamano(def);
  const c = crearContexto(N, semilla * 97 + nombre.length * 13 + (nombre.charCodeAt(0) | 0));
  def.generar(c, { semilla });
  const im = finalizar(c);
  p = {
    def, N,
    map: textura(im.albedo, N, true, null),
    normalMap: textura(im.normal, N, false, im.mipNormal),
    orm: textura(im.orm, N, false, im.mipOrm),
    emissiveMap: im.emi ? textura(im.emi, N, true, null) : null,
  };
  paquetes.set(clave, p);
  return p;
}

const clonar = (t, rep) => { if (!t) return null; const c = t.clone(); c.repeat.set(rep[0], rep[1]); c.needsUpdate = true; return c; };
const normRep = (r) => (r == null ? [1, 1] : Array.isArray(r) ? [r[0], r[1] ?? r[0]] : [r, r]);

function crear(nombre, o) {
  const p = paquete(nombre, o.semilla ?? 1);
  const def = p.def, m = def.material || {};
  const rep = normRep(o.repetir);
  const props = { roughness: 1, metalness: 1, envMapIntensity: 1, ...(m.props || {}) };
  const Clase = m.tipo === 'physical' ? THREE.MeshPhysicalMaterial : THREE.MeshStandardMaterial;
  const mat = new Clase(props);
  mat.name = nombre;
  mat.map = clonar(p.map, rep);
  mat.normalMap = clonar(p.normalMap, rep);
  mat.normalScale.set(m.normal ?? 1, m.normal ?? 1);
  if (p.emissiveMap) {
    mat.emissiveMap = clonar(p.emissiveMap, rep);
    const ce = o.color != null && m.colorEmisivo ? new THREE.Color(o.color) : new THREE.Color(m.colorBase ?? 0xffffff);
    mat.emissive = ce;
    mat.emissiveIntensity = (m.emisivo ?? 1) * (o.emisivo ?? 1);
  }
  if (o.color != null && !m.colorEmisivo) mat.color = new THREE.Color(o.color);
  else if (m.colorBase != null && !m.colorEmisivo) mat.color = new THREE.Color(m.colorBase);
  if (m.transparente) { mat.transparent = true; mat.depthWrite = !!m.depthWrite; }
  if (m.doble) mat.side = THREE.DoubleSide;
  parchear(mat, {
    orm: p.orm, macro: macro(), mv: m.macro, anim: m.anim,
    desgaste: o.desgaste ?? m.desgaste ?? 0.25, mojado: o.mojado ?? 0,
  });
  return mat;
}

const LISTA = CATALOGO.map((d) => ({ nombre: d.nombre, grupo: d.grupo, descripcion: d.descripcion }));

export const materiales = {
  /** Material compartido y cacheado por opciones. No lo modifiques: clónalo si necesitas variantes. */
  obtener(nombre, opciones = {}) {
    if (!defs.has(nombre)) { console.warn('[materiales] desconocido:', nombre); nombre = 'hormigon'; }
    const o = opciones;
    const k = [nombre, o.color ?? '', JSON.stringify(o.repetir ?? ''), o.desgaste ?? '', o.mojado ?? '', o.emisivo ?? '', o.semilla ?? ''].join('|');
    let m = cache.get(k);
    if (!m) { m = crear(nombre, o); cache.set(k, m); }
    return m;
  },
  lista() { return LISTA.map((x) => ({ ...x })); },
  existe(nombre) { return defs.has(nombre); },
  info(nombre) {
    const d = defs.get(nombre); if (!d) return null;
    return { nombre, grupo: d.grupo, descripcion: d.descripcion, escala: d.escala ?? 2, tam: tamano(d) };
  },
  /** Texturas base (compartidas, sin repetición ajustada). */
  texturas(nombre, semilla = 1) { const p = paquete(nombre, semilla); return { map: p.map, normalMap: p.normalMap, orm: p.orm, emissiveMap: p.emissiveMap }; },
  /** Genera de antemano (cede el hilo entre materiales). Devuelve una promesa. */
  async precargar(nombres, opciones = {}) {
    for (const n of nombres) { materiales.obtener(n, opciones); await new Promise((r) => setTimeout(r, 0)); }
  },
  /** Ajustes globales: { anisotropia: 8, calidad: 'alta'|'media'|'baja' } (llamar antes de generar). */
  configurar(o = {}) { Object.assign(config, o); },
  /** Fija el reloj de los materiales animados (agua, pantallas, neón); por defecto avanza solo. */
  tiempo(t) { reloj.manual = true; reloj.value = t; },
  /**
   * Mezcla dos suelos con una máscara para romper la repetición.
   * opciones: { mascara: Texture|null (canal R; por defecto ruido procedural de baja frecuencia), escalaMascara: 0.05,
   *             umbral: 0.5, contraste: 3, repetirB: 1.0, desgaste, mojado }
   */
  mezclaSuelo(a, b, opciones = {}) {
    const k = ['mezcla', a, b, opciones.mascara?.uuid ?? '', opciones.escalaMascara ?? '', opciones.umbral ?? '', opciones.contraste ?? '', opciones.repetirB ?? '', opciones.desgaste ?? '', opciones.mojado ?? ''].join('|');
    let m = cache.get(k); if (m) return m;
    const pa = paquete(a), pb = paquete(b);
    const base = (pa.def.material || {});
    m = new THREE.MeshStandardMaterial({ roughness: 1, metalness: 1, ...(base.props || {}) });
    m.name = `mezcla(${a},${b})`;
    m.map = pa.map.clone(); m.map.needsUpdate = true;
    m.normalMap = pa.normalMap.clone(); m.normalMap.needsUpdate = true;
    parchear(m, {
      orm: pa.orm, macro: macro(), mv: base.macro, desgaste: opciones.desgaste ?? 0.3, mojado: opciones.mojado ?? 0,
      mezcla: { mapB: pb.map, ormB: pb.orm, normB: pb.normalMap, mascara: opciones.mascara || null, repB: opciones.repetirB ?? 1, escalaMascara: opciones.escalaMascara ?? 0.05, umbral: opciones.umbral ?? 0.5, contraste: opciones.contraste ?? 3 },
    });
    cache.set(k, m);
    return m;
  },
  /** Libera todo lo generado (texturas y materiales). */
  liberar() {
    for (const m of cache.values()) { m.dispose(); m.map?.dispose(); m.normalMap?.dispose(); m.emissiveMap?.dispose(); }
    for (const p of paquetes.values()) { p.map.dispose(); p.normalMap.dispose(); p.orm.dispose(); p.emissiveMap?.dispose(); }
    cache.clear(); paquetes.clear(); macroTex?.dispose(); macroTex = null;
  },
};

/**
 * UV por proyección de caja: cada triángulo se proyecta según su normal dominante; 1 unidad de UV = `escala` metros.
 * `escala` puede ser un número o el nombre de un material (usa su tamaño de mosaico). Si la geometría tiene índice
 * se devuelve una copia sin índice; úsala siempre: `geo = uvMundo(geo, 'ladrillo_rojo')`.
 * opciones: { matriz: Matrix4 (espacio mundo, si se da), desfase: [x,y,z] en metros, rotar: bool (gira 90° los muros) }
 */
export function uvMundo(geo, escala = 2, opciones = {}) {
  if (typeof escala === 'string') escala = materiales.info(escala)?.escala ?? 2;
  let g = geo.index ? geo.toNonIndexed() : geo;
  const pos = g.attributes.position;
  const n = pos.count;
  const uv = new Float32Array(n * 2);
  const v = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), nn = new THREE.Vector3();
  const M = opciones.matriz || null, off = opciones.desfase || [0, 0, 0];
  const nm = M ? new THREE.Matrix3().getNormalMatrix(M) : null;
  const inv = 1 / escala;
  const P = [a, b, c];
  for (let i = 0; i < n; i += 3) {
    for (let k = 0; k < 3; k++) { P[k].fromBufferAttribute(pos, i + k); if (M) P[k].applyMatrix4(M); P[k].x += off[0]; P[k].y += off[1]; P[k].z += off[2]; }
    nn.subVectors(c, b).cross(v.subVectors(a, b));
    const ax = Math.abs(nn.x), ay = Math.abs(nn.y), az = Math.abs(nn.z);
    for (let k = 0; k < 3; k++) {
      const p = P[k]; let u, w;
      if (ay >= ax && ay >= az) { u = p.x; w = -p.z * Math.sign(nn.y || 1); }      // suelo/techo
      else if (ax >= az) { u = -p.z * Math.sign(nn.x || 1); w = p.y; }              // caras ±X
      else { u = p.x * Math.sign(nn.z || 1); w = p.y; }                              // caras ±Z
      if (opciones.rotar && !(ay >= ax && ay >= az)) { const t = u; u = w; w = -t; }
      uv[(i + k) * 2] = u * inv; uv[(i + k) * 2 + 1] = w * inv;
    }
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  return g;
}
