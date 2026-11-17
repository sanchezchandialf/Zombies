// ERA Z · Geometría auxiliar para escenarios: cajas biseladas, extrusiones, tornos, prismas y lotes fusionados.
// Todo en metros. Las UV se generan en espacio de mundo (uvMundo) al añadir la pieza a un lote.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { materiales, uvMundo } from '../../render/materiales/index.js';

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v = new THREE.Vector3(), _s = new THREE.Vector3(1, 1, 1);

/** Matriz de colocación (x, y, z, giro Y, giro X, giro Z, escala). */
export function matriz(x = 0, y = 0, z = 0, rotY = 0, rotX = 0, rotZ = 0, esc = 1) {
  _e.set(rotX, rotY, rotZ, 'YXZ'); _q.setFromEuler(_e);
  _v.set(x, y, z);
  const s = typeof esc === 'number' ? _s.set(esc, esc, esc) : _s.set(esc[0], esc[1], esc[2]);
  return new THREE.Matrix4().compose(_v, _q, s);
}

const cacheCajas = new Map();
/** Caja con aristas redondeadas (radio ≈ bisel). Geometría cacheada por parámetros: NO la modifiques, clónala. */
export function cajaRedondeada(w, h, d, radio = 0.04, seg = 2) {
  const r = Math.min(radio, Math.min(w, h, d) * 0.49);
  const k = [w, h, d, r, seg].map((n) => n.toFixed(3)).join('|');
  let g = cacheCajas.get(k);
  if (!g) { g = new RoundedBoxGeometry(w, h, d, seg, r); cacheCajas.set(k, g); }
  return g;
}

/** Cilindro con bisel simple (torno). Eje Y, base en y=0. */
export function cilindro(radioAbajo, radioArriba, alto, seg = 16, bisel = 0.02) {
  const b = Math.min(bisel, alto * 0.3, Math.min(radioAbajo, radioArriba) * 0.3);
  const perfil = [[0, 0], [radioAbajo - b, 0], [radioAbajo, b], [radioArriba, alto - b], [radioArriba - b, alto], [0, alto]];
  return torno(perfil, seg);
}

/** Torno: gira un perfil [[radio, y], …] alrededor de Y. */
export function torno(perfil, seg = 20) {
  const pts = perfil.map(([r, y]) => new THREE.Vector2(r, y));
  const g = new THREE.LatheGeometry(pts, seg);
  return g;
}

/**
 * Extruye un contorno plano [[x,z], …] hacia arriba (base en y=0, altura `alto`) con bisel opcional.
 * `huecos`: lista de contornos interiores.
 */
export function extruir(puntos, alto, { bisel = 0.03, huecos = [], segBisel = 1 } = {}) {
  const forma = new THREE.Shape(puntos.map(([x, z]) => new THREE.Vector2(x, -z)));
  for (const h of huecos) forma.holes.push(new THREE.Path(h.map(([x, z]) => new THREE.Vector2(x, -z))));
  const b = Math.min(bisel, alto * 0.45);
  const g = new THREE.ExtrudeGeometry(forma, {
    depth: Math.max(0.001, alto - 2 * b), bevelEnabled: b > 0, bevelThickness: b, bevelSize: b, bevelOffset: -b, bevelSegments: segBisel, curveSegments: 10,
  });
  g.rotateX(-Math.PI / 2);
  g.translate(0, b, 0);
  return g;
}

/** Polígono regular / círculo extruido (base en y=0). */
export function disco(radio, alto, seg = 24, bisel = 0.02) {
  const pts = [];
  for (let i = 0; i < seg; i++) { const a = (i / seg) * Math.PI * 2; pts.push([Math.cos(a) * radio, Math.sin(a) * radio]); }
  return extruir(pts, alto, { bisel });
}

/**
 * Prisma de tejado a dos aguas. Cumbrera paralela a X local, centrado en (0,0,0) con base en y=0.
 * ancho = largo en X (cumbrera), fondo = ancho en Z (de alero a alero), alto = altura de la cumbrera.
 * `grosor` da un canto de tejado (faldón) de ese espesor: el tejado es una cáscara maciza visible por los hastiales.
 */
export function tejadoDosAguas(ancho, fondo, alto) {
  const hx = ancho / 2, hz = fondo / 2;
  // 2 faldones + 2 hastiales (triángulos) + base. Normales planas.
  const P = [];
  const tri = (a, b, c) => P.push(...a, ...b, ...c);
  const A = [-hx, 0, hz], B = [hx, 0, hz], C = [hx, 0, -hz], D = [-hx, 0, -hz], R1 = [-hx, alto, 0], R2 = [hx, alto, 0];
  tri(A, B, R2); tri(A, R2, R1);            // faldón sur
  tri(C, D, R1); tri(C, R1, R2);            // faldón norte
  tri(B, C, R2);                            // hastial este
  tri(D, A, R1);                            // hastial oeste
  tri(A, D, C); tri(A, C, B);               // base
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals();
  return g;
}

/** Tejado a cuatro aguas (pirámide truncada o cumbrera corta). `cumbrera` = fracción del largo que mide la cumbrera (0 = pirámide). */
export function tejadoCuatroAguas(ancho, fondo, alto, cumbrera = 0.4) {
  const hx = ancho / 2, hz = fondo / 2;
  const m = Math.min(hx, hz);
  const ex = ancho >= fondo ? (hx - m) * cumbrera + 0.001 : 0.001, ez = ancho >= fondo ? 0.001 : (hz - m) * cumbrera + 0.001;
  const P = [];
  const tri = (a, b, c) => P.push(...a, ...b, ...c);
  const A = [-hx, 0, hz], B = [hx, 0, hz], C = [hx, 0, -hz], D = [-hx, 0, -hz];
  const a = [-ex, alto, ez], b = [ex, alto, ez], c = [ex, alto, -ez], d = [-ex, alto, -ez];
  tri(A, B, b); tri(A, b, a);
  tri(B, C, c); tri(B, c, b);
  tri(C, D, d); tri(C, d, c);
  tri(D, A, a); tri(D, a, d);
  tri(a, b, c); tri(a, c, d);
  tri(A, D, C); tri(A, C, B);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  g.computeVertexNormals();
  return g;
}

/** Normaliza una geometría para poder fusionarla: no indexada, con position, normal y uv. */
function normalizar(g) {
  let r = g.index ? g.toNonIndexed() : g.clone();
  for (const k of Object.keys(r.attributes)) if (k !== 'position' && k !== 'normal' && k !== 'uv') r.deleteAttribute(k);
  if (!r.attributes.normal) r.computeVertexNormals();
  if (!r.attributes.uv) r.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(r.attributes.position.count * 2), 2));
  return r;
}

/**
 * Lote de geometría estática: acumula piezas y construye UNA malla por material (con sombras).
 *   lote.anadir(geo, material, matriz?, { uv: true | 'nombre' | número })  // uv: proyección de mundo (por defecto, según material.name)
 *   lote.caja(material, cx, cy, cz, w, h, d, { rotY, radio, seg })        // caja biselada centrada
 *   lote.cajaBase(material, cx, y0, cz, w, h, d, opc)                      // caja con la cara inferior en y0
 *   lote.construir({ sombras, nombre }) → THREE.Group
 */
export function crearLote() {
  const mapa = new Map(); // material → geometrías
  let piezas = 0;
  const lote = {
    get piezas() { return piezas; },
    get materiales() { return mapa.size; },
    anadir(geo, material, m = null, opc = {}) {
      let g = normalizar(geo);
      if (m) g.applyMatrix4(m);
      const uv = opc.uv ?? true;
      if (uv !== false) {
        const nombre = typeof uv === 'string' ? uv : (typeof uv === 'number' ? uv : (materiales.info(material.name) ? material.name : 2));
        // uvMundo devuelve la misma geometría (ya sin índice) o una copia
        g = uvMundo(g, nombre, opc.uvOpc || {});
      }
      let l = mapa.get(material);
      if (!l) mapa.set(material, (l = []));
      l.push(g);
      piezas++;
      return lote;
    },
    caja(material, cx, cy, cz, w, h, d, opc = {}) {
      const g = cajaRedondeada(w, h, d, opc.radio ?? 0.04, opc.seg ?? 1);
      return lote.anadir(g, material, matriz(cx, cy, cz, opc.rotY || 0, opc.rotX || 0, opc.rotZ || 0), opc);
    },
    cajaBase(material, cx, y0, cz, w, h, d, opc = {}) { return lote.caja(material, cx, y0 + h / 2, cz, w, h, d, opc); },
    /** Combina otro lote dentro de éste (para estructuras reutilizables). */
    construir({ sombras = true, nombre = 'lote', recibir = true } = {}) {
      const grupo = new THREE.Group();
      grupo.name = nombre;
      for (const [mat, lista] of mapa) {
        const geo = mergeGeometries(lista, false);
        if (!geo) continue;
        geo.computeBoundingSphere(); geo.computeBoundingBox();
        const malla = new THREE.Mesh(geo, mat);
        malla.castShadow = sombras; malla.receiveShadow = recibir;
        malla.name = `${nombre}:${mat.name || 'mat'}`;
        grupo.add(malla);
        for (const g of lista) g.dispose();
      }
      mapa.clear(); piezas = 0;
      return grupo;
    },
  };
  return lote;
}
