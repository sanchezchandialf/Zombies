// Constructor de piezas: acumula geometría por hueso y material y la fusiona (una malla por hueso+material).
// El resultado se cachea por rol+era y se comparte entre todas las instancias.
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { geoCaja, geoEsfera, geoDomo, geoCil, geoCono, geoToro, geoCapsula, geoSeg, geoAbierto } from './geo.js';
import { mat } from './mat.js';

// Dimensiones del esqueleto (m, cuerpo base)
export const D = {
  muslo: 0.42, pierna: 0.40, pie: 0.07, cadera: 0.095,
  espina: 0.06, pecho0: 0.15, cuello0: 0.42, cabeza0: 0.08,
  brazo: 0.31, antebrazo: 0.29, hombroY: 0.36,
};
D.alturaCadera = D.pie + D.muslo + D.pierna; // 0,89

const _e = new THREE.Euler(), _q = new THREE.Quaternion(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _m = new THREE.Matrix4();
const arr = (v) => (Array.isArray(v) ? v : [v, v, v]);

export class Con {
  constructor() { this.items = []; }
  put(h, geo, m, p, rot, s, tmp = false) {
    p = p || [0, 0, 0]; rot = rot || [0, 0, 0]; s = s || [1, 1, 1];
    _e.set(rot[0], rot[1], rot[2], 'XYZ'); _q.setFromEuler(_e);
    _m.compose(_p.set(p[0], p[1], p[2]), _q, _s.set(s[0], s[1], s[2]));
    this.items.push({ h, geo, m, mx: _m.clone(), tmp });
  }
  caja(h, m, d, p, rot, r = 0.02) { this.put(h, geoCaja(d[0], d[1], d[2], r), m, p, rot); }
  esf(h, m, r3, p, rot) { this.put(h, geoEsfera(), m, p, rot, arr(r3)); }
  domo(h, m, r3, p, rot) { this.put(h, geoDomo(), m, p, rot, arr(r3)); }
  cil(h, m, rt, rb, hh, p, rot, esc, seg) { this.put(h, geoCil(rt, rb, hh, seg), m, p, rot, esc); }
  cono(h, m, r, hh, p, rot, esc, seg) { this.put(h, geoCono(r, hh, seg), m, p, rot, esc); }
  toro(h, m, R, r, p, rot, esc) { this.put(h, geoToro(R, r), m, p, rot, esc); }
  cap(h, m, r, len, p, rot, esc) { this.put(h, geoCapsula(r, len), m, p, rot, esc); }
  /** Cilindro abierto parcial (faldones, capas, viseras). th0: inicio (0 = +Z), thL: arco. */
  abierto(h, m, rt, rb, hh, th0, thL, p, rot, esc) { this.put(h, geoAbierto(rt, rb, hh, th0, thL), m, p, rot, esc); }
  seg(h, m, rt, rb, len, p, rot) { this.put(h, geoSeg(rt, rb, len), m, p, rot); }
  /** Tubo por una curva de puntos (se desecha tras fusionar). */
  tubo(h, m, pts, r, cerrado = false, seg = 40, rad = 6) {
    const curva = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(p[0], p[1], p[2])), cerrado);
    this.put(h, new THREE.TubeGeometry(curva, seg, r, rad, cerrado), m, [0, 0, 0], [0, 0, 0], [1, 1, 1], true);
  }
  /** Lazo cerrado alrededor del eje Y: fp(φ) → [x,y,z]. */
  lazo(h, m, fp, r, n = 36) {
    const pts = []; for (let i = 0; i < n; i++) pts.push(fp((i / n) * Math.PI * 2));
    this.tubo(h, m, pts, r, true, n * 2, 5);
  }
  /** Lazo sobre el elipsoide del pecho: banda diagonal (tilt) o horizontal (tilt=0). */
  banda(h, m, cy, ry, rx, rz, y0, tilt, r, fase = 0, k = 1.0) {
    this.lazo(h, m, (f) => {
      const y = y0 + tilt * Math.sin(f + fase);
      const e = Math.sqrt(Math.max(0.02, 1 - ((y - cy) / ry) ** 2)) * k;
      return [Math.sin(f) * rx * e, y, Math.cos(f) * rz * e];
    }, r);
  }
  /** Fusiona por hueso+material. Devuelve [{ h, geo, m }]. */
  fusionar() {
    const grupos = new Map();
    for (const it of this.items) {
      const k = it.h + '|' + it.m.uuid;
      let g = grupos.get(k); if (!g) { g = { h: it.h, m: it.m, l: [] }; grupos.set(k, g); }
      let geo = it.geo.index ? it.geo.toNonIndexed() : it.geo.clone();
      for (const n of Object.keys(geo.attributes)) if (n !== 'position' && n !== 'normal' && n !== 'uv') geo.deleteAttribute(n);
      geo.applyMatrix4(it.mx);
      g.l.push(geo);
      if (it.tmp) it.geo.dispose();
    }
    const out = [];
    for (const g of grupos.values()) {
      const geo = g.l.length === 1 ? g.l[0] : mergeGeometries(g.l, false);
      if (g.l.length > 1) for (const x of g.l) x.dispose();
      geo.computeBoundingSphere();
      out.push({ h: g.h, geo, m: g.m });
    }
    return out;
  }
}

/** Ejecuta fn para cada lado: s = -1 (derecha, +X local es la izquierda del personaje) y +1. */
export const lados = (fn) => { fn(-1, 'D'); fn(1, 'I'); };

/** Cuerpo base: huesos, extremidades, rostro y pelo. O = materiales de prendas del atuendo. */
export function cuerpoBase(c, R, O) {
  const w = R.w, piel = mat('piel', R.piel);
  // Pelvis y tronco
  c.caja('pelvis', O.pantalon, [0.31 * w + 0.01, 0.17, 0.2 + 0.02 * w], [0, -0.01, 0], null, 0.07);
  c.esf('espina', O.camisa, [0.15 * w + (R.barriga ?? 0), 0.12, 0.105 + (R.barriga ?? 0)], [0, 0.08, 0]);
  c.esf('pecho', O.camisa, [0.2 * w, 0.245, 0.135], [0, 0.2, 0]);
  c.esf('pecho', O.camisa, [0.225 * w * R.hom, 0.095, 0.115], [0, 0.31, 0]);
  c.cil('cuello', piel, 0.046 * w ** 0.5, 0.052 * w ** 0.5, 0.11, [0, 0.03, 0]);
  lados((s, sf) => {
    // Hombro y brazo
    c.esf('hombro' + sf, O.manga, 0.064 * w * R.hom ** 0.3, [0, 0, 0]);
    c.seg('hombro' + sf, O.manga, 0.054 * w, 0.044 * w, D.brazo, [0, 0, 0]);
    c.seg('codo' + sf, O.antebrazo, 0.042 * w, 0.032 * w, D.antebrazo, [0, 0, 0]);
    // Mano: puño con pulgar
    const mm = O.guante;
    c.caja('mano' + sf, mm, [0.074 * w ** 0.6, 0.08, 0.05], [0, -0.045, 0.002], null, 0.02);
    c.caja('mano' + sf, mm, [0.07 * w ** 0.6, 0.032, 0.03], [0, -0.092, 0.016], null, 0.012);
    c.cap('mano' + sf, mm, 0.014 * w ** 0.5, 0.04, [-s * 0.03 * w ** 0.5, -0.045, 0.026], [0.5, 0, -s * 0.3]);
    // Pierna
    c.seg('cadera' + sf, O.muslo, 0.088 * w, 0.063 * w, D.muslo, [0, 0, 0]);
    c.seg('rodilla' + sf, O.pierna, 0.061 * w, 0.044 * w, D.pierna, [0, 0, 0]);
    // Pie (bota base)
    c.caja('tobillo' + sf, O.bota, [0.1 * w ** 0.7, 0.075, 0.27], [0, -0.036, 0.055], null, 0.03);
    c.esf('tobillo' + sf, O.bota, [0.048 * w ** 0.7, 0.04, 0.06], [0, -0.042, 0.165]);
    c.caja('tobillo' + sf, mat('goma', 0x15110e), [0.104 * w ** 0.7, 0.016, 0.285], [0, -0.066, 0.05], null, 0.007);
  });
  cabeza(c, R, piel);
}

function cabeza(c, R, piel) {
  const j = R.mand, ns = R.nariz;
  c.esf('cabeza', piel, [0.103, 0.123, 0.114], [0, 0.125, 0]);               // cráneo
  c.esf('cabeza', piel, [0.083 * j, 0.072, 0.093], [0, 0.058, 0.026]);        // mandíbula
  c.esf('cabeza', piel, [0.04 * j, 0.03, 0.04], [0, 0.028, 0.07]);            // mentón
  c.esf('cabeza', piel, [0.019 * ns, 0.03 * ns, 0.032 * ns], [0, 0.098, 0.116], [0.3, 0, 0]); // nariz
  c.esf('cabeza', piel, [0.016 * ns, 0.014, 0.02], [0, 0.082, 0.126]);
  const bl = mat('blanco', 0xe8e4dc), ir = mat('goma', R.ojo), neg = mat('goma', 0x0a0806);
  const pelo = mat('pelo', R.pelo);
  lados((s) => {
    c.esf('cabeza', piel, [0.014, 0.03, 0.02], [s * 0.103, 0.12, -0.005]);       // oreja
    c.esf('cabeza', bl, [0.016, 0.0105, 0.008], [s * 0.042, 0.135, 0.104]);
    c.esf('cabeza', ir, [0.0085, 0.0085, 0.006], [s * 0.042, 0.135, 0.109]);
    c.esf('cabeza', neg, [0.004, 0.004, 0.004], [s * 0.042, 0.135, 0.114]);
    // ceja
    c.caja('cabeza', pelo, [0.05 * R.ceja ** 0.5, 0.011 * R.ceja, 0.016], [s * 0.04, 0.16 + (R.ceja > 1.3 ? -0.006 : 0), 0.104], [0, s * 0.15, -s * (R.ceja > 1.3 ? 0.25 : 0.12)], 0.005);
    c.esf('cabeza', mat('piel', R.piel), [0.026, 0.012, 0.012], [s * 0.04, 0.123, 0.103]); // párpado inferior (arruga)
  });
  c.caja('cabeza', mat('goma', R.boca), [0.04, 0.007, 0.01], [0, 0.047, 0.1], null, 0.003);
  if (R.cicatriz) c.caja('cabeza', mat('goma', 0xb06a60), [0.006, 0.05, 0.004], [0.05, 0.12, 0.105], [0, 0.2, 0.5], 0.002);
  // Barba
  if (R.barba === 'espesa') {
    c.esf('cabeza', pelo, [0.088 * j, 0.062, 0.078], [0, 0.04, 0.032]);
    c.esf('cabeza', pelo, [0.05, 0.026, 0.04], [0, 0.035, 0.088]);
    c.caja('cabeza', pelo, [0.06, 0.014, 0.018], [0, 0.068, 0.105], null, 0.006);
    lados((s) => c.esf('cabeza', pelo, [0.02, 0.05, 0.05], [s * 0.088, 0.075, 0.02]));
  } else if (R.barba === 'bigote') {
    c.caja('cabeza', pelo, [0.065, 0.018, 0.02], [0, 0.07, 0.108], null, 0.008);
    lados((s) => c.esf('cabeza', pelo, [0.014, 0.02, 0.014], [s * 0.034, 0.062, 0.108]));
    c.esf('cabeza', pelo, [0.08 * j, 0.02, 0.07], [0, 0.03, 0.06]);              // sombra de barba
  }
  // Pelo
  const ph = R.peloEstilo;
  if (ph === 'corto') {
    c.domo('cabeza', pelo, [0.108, 0.112, 0.118], [0, 0.138, -0.004], [-0.1, 0, 0]);
    c.caja('cabeza', pelo, [0.15, 0.03, 0.03], [0, 0.178, 0.085], [0.5, 0, 0], 0.012);
    lados((s) => c.caja('cabeza', pelo, [0.02, 0.07, 0.05], [s * 0.1, 0.125, 0.0], null, 0.008));
  } else if (ph === 'cola') {
    c.domo('cabeza', pelo, [0.109, 0.115, 0.119], [0, 0.136, -0.006], [-0.12, 0, 0]);
    c.cap('cabeza', pelo, 0.04, 0.16, [0, 0.07, -0.145], [-0.35, 0, 0]);
    c.esf('cabeza', pelo, [0.035, 0.035, 0.035], [0, 0.16, -0.12]);
    lados((s) => c.cap('cabeza', pelo, 0.022, 0.08, [s * 0.1, 0.13, 0.04], [0, 0, s * 0.1]));
    c.caja('cabeza', pelo, [0.14, 0.03, 0.04], [0.02, 0.19, 0.085], [0.45, 0, -0.2], 0.012);
  } else if (ph === 'revuelto') {
    c.domo('cabeza', pelo, [0.109, 0.112, 0.12], [0, 0.138, -0.004], [-0.1, 0, 0]);
    for (let i = 0; i < 7; i++) { const a = i * 0.9 + 0.3; c.cono('cabeza', pelo, 0.028, 0.07, [Math.sin(a) * 0.065, 0.2 + (i % 3) * 0.008, Math.cos(a) * 0.06 - 0.01], [Math.cos(a) * 0.8, 0, -Math.sin(a) * 0.8]); }
  } else if (ph === 'trenza') {
    c.domo('cabeza', pelo, [0.109, 0.116, 0.119], [0, 0.136, -0.006], [-0.12, 0, 0]);
    c.caja('cabeza', pelo, [0.14, 0.03, 0.035], [0, 0.185, 0.085], [0.4, 0, 0.12], 0.012);
    for (let i = 0; i < 6; i++) c.esf('cabeza', pelo, [0.03 - i * 0.002, 0.04, 0.03 - i * 0.002], [0.015 + Math.sin(i) * 0.008, 0.08 - i * 0.052, -0.12 - i * 0.012], [0.3, 0, 0]);
    lados((s) => c.cap('cabeza', pelo, 0.016, 0.06, [s * 0.103, 0.13, 0.03], [0, 0, s * 0.05]));
  } else { // calvo: casquete de piel, solo barba y cejas
    c.domo('cabeza', piel, [0.1032, 0.1245, 0.1145], [0, 0.126, 0]);
    c.esf('cabeza', mat('pelo', R.pelo), [0.104, 0.03, 0.1], [0, 0.2, -0.006]); // sombra de pelo rapado
  }
}
