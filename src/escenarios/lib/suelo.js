// ERA Z · Suelo de escenarios: máscara de pintura (mezcla de dos suelos), relieve suave, zonas elevadas y parches (decals).
import * as THREE from 'three';
import { materiales, uvMundo } from '../../render/materiales/index.js';
import { extruir } from './geometria.js';
import { crearRng } from '../../nucleo/util.js';

// ─────────────────────────── ruido de valor determinista ───────────────────────────
export function crearRuido(semilla = 1) {
  const rng = crearRng(semilla * 7919 + 13);
  const N = 256, perm = new Uint8Array(N * 2), val = new Float32Array(N);
  for (let i = 0; i < N; i++) { perm[i] = i; val[i] = rng(); }
  for (let i = N - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); const t = perm[i]; perm[i] = perm[j]; perm[j] = t; }
  for (let i = 0; i < N; i++) perm[N + i] = perm[i];
  const s = (t) => t * t * (3 - 2 * t);
  const v2 = (x, y) => {
    const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
    const X = xi & 255, Y = yi & 255;
    const a = val[perm[X + perm[Y]]], b = val[perm[X + 1 + perm[Y]]], c = val[perm[X + perm[Y + 1]]], d = val[perm[X + 1 + perm[Y + 1]]];
    const u = s(xf), w = s(yf);
    return a + (b - a) * u + (c - a) * w + (a - b - c + d) * u * w;
  };
  /** fbm 0..1 */
  return (x, y, oct = 3) => { let a = 0, amp = 0.5, f = 1, t = 0; for (let i = 0; i < oct; i++) { a += v2(x * f, y * f) * amp; t += amp; amp *= 0.5; f *= 2.03; } return a / t; };
}

// ─────────────────────────── Pintura: máscara de mezcla ───────────────────────────
/**
 * Lienzo que cubre todo el suelo (tam × tam m) y se reparte con la mezcla de dos materiales: 0 = material A, 1 = material B.
 * Las coordenadas son de MUNDO (x, z). Las formas tienen borde suave (`suave` en metros) y el resultado se rompe con ruido
 * al terminar, así los límites entre suelos son orgánicos. Se envuelve en los bordes (el lienzo se repite), no pintes más allá de `tam`/2.
 */
export class Pintura {
  constructor(tam, res = 1024, semilla = 1) {
    this.tam = tam; this.res = res; this.semilla = semilla;
    this.canvas = document.createElement('canvas'); this.canvas.width = this.canvas.height = res;
    this.g = this.canvas.getContext('2d', { willReadFrequently: true });
    this.fondo(0);
    this.ruidoEscala = 5; this.ruidoAmp = 0.28;
  }
  _x(x) { return ((((x / this.tam) % 1) + 1) % 1) * this.res; }
  _z(z) { return ((((-z / this.tam) % 1) + 1) % 1) * this.res; }
  _m(m) { return (m / this.tam) * this.res; }
  _gris(v) { const n = Math.round(Math.max(0, Math.min(1, v)) * 255); return `rgb(${n},${n},${n})`; }
  _envolver(fn) {
    const g = this.g, R = this.res;
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { g.save(); g.translate(i * R, j * R); fn(g); g.restore(); }
  }
  _suave(trazo, v, suave) {
    const g = this.g, n = suave > 0 ? 6 : 0, w = this._m(suave);
    this._envolver(() => {
      g.fillStyle = g.strokeStyle = this._gris(v); g.lineJoin = 'round'; g.lineCap = 'round';
      for (let k = n; k >= 1; k--) {
        g.globalAlpha = 0.34; g.lineWidth = Math.max(1, 2 * w * (k / n));
        g.beginPath(); trazo(g); g.fill(); g.stroke();
      }
      g.globalAlpha = 1; g.lineWidth = 1; g.beginPath(); trazo(g); g.fill();
    });
    return this;
  }
  /** Rellena todo con un valor. */
  fondo(v = 0) { this.g.globalAlpha = 1; this.g.fillStyle = this._gris(v); this.g.fillRect(0, 0, this.res, this.res); return this; }
  /** Círculo/elipse. `rz` opcional para elipses (sin giro). */
  circulo(x, z, r, v = 1, suave = 2, rz = r) {
    const cx = this._x(x), cz = this._z(z), rx = this._m(r), rzz = this._m(rz);
    return this._suave((g) => { g.ellipse(cx, cz, rx, rzz, 0, 0, Math.PI * 2); }, v, suave);
  }
  /** Rectángulo por esquinas (mundo). */
  rect(x0, z0, x1, z1, v = 1, suave = 2) {
    const a = this._x(Math.min(x0, x1)), b = this._z(Math.max(z0, z1)), w = this._m(Math.abs(x1 - x0)), h = this._m(Math.abs(z1 - z0));
    return this._suave((g) => { g.rect(a, b, w, h); }, v, suave);
  }
  /** Polígono [[x,z],…]. */
  poligono(pts, v = 1, suave = 2) {
    const P = pts.map(([x, z]) => [this._x(x), this._z(z)]);
    // coordenadas continuas respecto al primer punto (para no cortar por el envoltorio)
    const [ox, oz] = P[0];
    const rel = pts.map(([x, z]) => [ox + this._m(x - pts[0][0]), oz + this._m(-(z - pts[0][1]))]);
    return this._suave((g) => { g.moveTo(rel[0][0], rel[0][1]); for (let i = 1; i < rel.length; i++) g.lineTo(rel[i][0], rel[i][1]); g.closePath(); }, v, suave);
  }
  /** Camino (calle, sendero) por una polilínea con ancho en metros. */
  camino(pts, ancho = 4, v = 1, suave = 1.5) {
    const g = this.g, n = 6, w = this._m(ancho);
    const rel = pts.map(([x, z]) => [this._x(pts[0][0]) + this._m(x - pts[0][0]), this._z(pts[0][1]) + this._m(-(z - pts[0][1]))]);
    this._envolver(() => {
      g.strokeStyle = this._gris(v); g.lineJoin = 'round'; g.lineCap = 'round';
      for (let k = n; k >= 1; k--) {
        g.globalAlpha = 0.34; g.lineWidth = w + 2 * this._m(suave) * (k / n);
        g.beginPath(); g.moveTo(rel[0][0], rel[0][1]); for (let i = 1; i < rel.length; i++) g.lineTo(rel[i][0], rel[i][1]); g.stroke();
      }
      g.globalAlpha = 1; g.lineWidth = w;
      g.beginPath(); g.moveTo(rel[0][0], rel[0][1]); for (let i = 1; i < rel.length; i++) g.lineTo(rel[i][0], rel[i][1]); g.stroke();
    });
    return this;
  }
  /** Salpica `cantidad` manchas pequeñas al azar dentro de un área (x0,z0,x1,z1). */
  salpicar(x0, z0, x1, z1, cantidad, rMin = 0.6, rMax = 2, v = 1, suave = 0.6) {
    const rng = crearRng(this.semilla * 31 + cantidad);
    for (let i = 0; i < cantidad; i++) this.circulo(rng.rango(x0, x1), rng.rango(z0, z1), rng.rango(rMin, rMax), v, suave, rng.rango(rMin, rMax));
    return this;
  }
  /** Fija el ruido con que se rompen los bordes (escala en m del rasgo; amp 0..1). */
  romper(escala = 5, amp = 0.28) { this.ruidoEscala = escala; this.ruidoAmp = amp; return this; }
  /** Aplica el ruido y devuelve la textura (única vez). */
  textura() {
    const R = this.res, g = this.g, img = g.getImageData(0, 0, R, R), d = img.data;
    const ruido = crearRuido(this.semilla + 5), e = this.tam / this.ruidoEscala / R, amp = this.ruidoAmp;
    for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) {
      const i = (y * R + x) * 4;
      // el ruido solo actúa donde hay transición (0<v<1) y en toda la zona intermedia
      const v = d[i] / 255;
      const n = ruido(x * e, y * e, 3) - 0.5;
      const f = 4 * v * (1 - v);                        // máximo en 0.5: no altera las zonas puras
      const o = Math.max(0, Math.min(1, v + n * amp * (0.35 + 1.4 * f)));
      const b = Math.round(o * 255);
      d[i] = d[i + 1] = d[i + 2] = b; d[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    const t = new THREE.CanvasTexture(this.canvas);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.flipY = false; t.colorSpace = THREE.NoColorSpace;
    t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = 4; t.generateMipmaps = true;
    t.needsUpdate = true;
    return t;
  }
}

// ─────────────────────────── Suelo ───────────────────────────
/** Función de altura a partir de la opción `relieve`. */
export function crearRelieve(relieve, tam, semilla = 1) {
  if (!relieve) return null;
  if (typeof relieve === 'function') return relieve;
  const { amp = 0.12, escala = 14, centroPlano = 0, bordeSubida = 0 } = relieve;
  const ruido = crearRuido(semilla + 21);
  return (x, z) => {
    const r = Math.hypot(x, z);
    const atenua = centroPlano > 0 ? Math.min(1, Math.max(0, (r - centroPlano) / Math.max(1, centroPlano * 0.6))) : 1;
    let h = (ruido(x / escala + 40, z / escala + 40, 3) - 0.5) * 2 * amp * atenua;
    if (bordeSubida > 0) { const t = Math.max(0, (Math.max(Math.abs(x), Math.abs(z)) - tam * 0.3) / (tam * 0.2)); h += t * t * bordeSubida; }
    return h;
  };
}

export function construirSuelo(kit, o = {}) {
  const tam = o.tam ?? 160;
  const a = o.material ?? 'hierba';
  const escalaA = materiales.info(a)?.escala ?? 2;
  let mat, pintura = null, tex = null;
  if (o.mezcla) {
    pintura = new Pintura(tam, o.resPintura ?? (tam > 110 ? 2048 : 1024), o.semilla ?? 1);
    if (o.pintura) o.pintura(pintura);
    tex = pintura.textura();
    kit._propios.push(tex);
    const escalaB = materiales.info(o.mezcla)?.escala ?? 2;
    mat = materiales.mezclaSuelo(a, o.mezcla, {
      mascara: tex, escalaMascara: escalaA / tam, umbral: o.umbral ?? 0.5, contraste: o.contraste ?? 3,
      repetirB: o.repetirB ?? escalaA / escalaB, desgaste: o.desgaste ?? 0.3, mojado: o.mojado ?? 0,
    });
  } else {
    mat = materiales.obtener(a, { desgaste: o.desgaste, mojado: o.mojado, color: o.color });
  }
  const alturaFn = crearRelieve(o.relieve, tam, o.semilla ?? 1);
  kit.altura = alturaFn ? (x, z) => alturaFn(x, z) : () => 0;
  const seg = alturaFn ? Math.ceil(tam / 2) : 1;
  let g = new THREE.PlaneGeometry(tam, tam, seg, seg);
  g.rotateX(-Math.PI / 2);
  if (alturaFn) {
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, alturaFn(p.getX(i), p.getZ(i)));
    g.computeVertexNormals();
  }
  g = uvMundo(g, escalaA);
  const malla = new THREE.Mesh(g, mat);
  malla.receiveShadow = true; malla.name = 'suelo';
  kit.grupo.add(malla);
  kit.sueloInfo = { tam, malla, material: mat, pintura, textura: tex };
  return kit.sueloInfo;
}

// ─────────────────────────── Zonas elevadas (adoquinado, plaza, losa) ───────────────────────────
function offsetPoligono(pts, d) {
  const n = pts.length, out = [];
  // sentido: área con signo
  let A = 0; for (let i = 0; i < n; i++) { const [x1, z1] = pts[i], [x2, z2] = pts[(i + 1) % n]; A += x1 * z2 - x2 * z1; }
  const s = A > 0 ? 1 : -1;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n];
    const e1x = p1[0] - p0[0], e1z = p1[1] - p0[1], e2x = p2[0] - p1[0], e2z = p2[1] - p1[1];
    const l1 = Math.hypot(e1x, e1z) || 1, l2 = Math.hypot(e2x, e2z) || 1;
    const n1 = [e1z / l1 * s, -e1x / l1 * s], n2 = [e2z / l2 * s, -e2x / l2 * s];
    let bx = n1[0] + n2[0], bz = n1[1] + n2[1]; const bl = Math.hypot(bx, bz) || 1; bx /= bl; bz /= bl;
    const k = d / Math.max(0.3, bx * n1[0] + bz * n1[1]);
    out.push([p1[0] + bx * k, p1[1] + bz * k]);
  }
  return out;
}

export function contornoDe(o) {
  if (o.poligono) return o.poligono;
  if (o.rect) { const [x0, z0, x1, z1] = o.rect; return [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]; }
  if (o.circulo) { const { x, z, r } = o.circulo; const n = o.seg ?? 40; return Array.from({ length: n }, (_, i) => [x + Math.cos((i / n) * Math.PI * 2) * r, z + Math.sin((i / n) * Math.PI * 2) * r]); }
  throw new Error('zona: indica poligono, rect o circulo');
}

export function construirZona(kit, o) {
  const pts = contornoDe(o), alto = o.alto ?? 0.025, y0 = o.y ?? 0;
  const mat = o.mat ?? materiales.obtener(o.material, { mojado: o.mojado, desgaste: o.desgaste, color: o.color });
  const g = extruir(pts, alto, { bisel: Math.min(0.01, alto * 0.4) });
  const m = new THREE.Matrix4().makeTranslation(0, y0, 0);
  kit.lote0.anadir(g, mat, m);
  if (o.borde) {
    const b = o.borde, ancho = b.ancho ?? 0.35, hb = b.alto ?? alto + 0.07;
    const exterior = offsetPoligono(pts, ancho);
    const gb = extruir(exterior, hb, { bisel: 0.02, huecos: [pts.slice().reverse()] });
    kit.lote0.anadir(gb, b.mat ?? materiales.obtener(b.material ?? 'silleria', { color: b.color }), m);
  }
  return { pts };
}

// ─────────────────────────── Parches (decals) ───────────────────────────
const ATLAS = {};
function lienzo(n) { const c = document.createElement('canvas'); c.width = c.height = n; return c; }

function atlasBlobs(tipo, semilla = 1) {
  if (ATLAS[tipo]) return ATLAS[tipo];
  const N = 512, C = 256, cv = lienzo(N), g = cv.getContext('2d');
  const rng = crearRng(semilla * 977 + tipo.length);
  for (let k = 0; k < 4; k++) {
    const cx = (k % 2) * C + C / 2, cy = Math.floor(k / 2) * C + C / 2;
    const arm = Array.from({ length: 5 }, (_, i) => ({ f: i + 2, a: rng() * 6.28, m: rng.rango(0.05, 0.16) / (i * 0.5 + 1) }));
    const radio = (t) => { let r = 1; for (const { f, a, m } of arm) r += Math.sin(t * f + a) * m; return r; };
    const forma = (esc) => {
      g.beginPath();
      for (let i = 0; i <= 64; i++) { const t = (i / 64) * Math.PI * 2, r = radio(t) * C * 0.34 * esc; const x = cx + Math.cos(t) * r * (tipo === 'charco' ? 1.15 : 1), y = cy + Math.sin(t) * r * (tipo === 'charco' ? 0.9 : 1); i ? g.lineTo(x, y) : g.moveTo(x, y); }
      g.closePath();
    };
    g.fillStyle = '#fff';
    if (tipo === 'charco') {
      for (let j = 8; j >= 1; j--) { g.globalAlpha = 0.18; forma(1 + (j / 8) * 0.22); g.fill(); }
      g.globalAlpha = 1; forma(1); g.fill();
    } else {
      // mancha: núcleo irregular + salpicaduras
      for (let j = 9; j >= 1; j--) { g.globalAlpha = 0.13; forma(0.55 + (j / 9) * 0.5); g.fill(); }
      g.globalAlpha = 0.85; forma(0.62); g.fill();
      g.globalAlpha = 1;
      for (let i = 0; i < 26; i++) {
        const t = rng() * 6.28, r = C * rng.rango(0.28, 0.46), rr = rng.rango(1.5, 7);
        g.globalAlpha = rng.rango(0.35, 0.9); g.beginPath(); g.arc(cx + Math.cos(t) * r, cy + Math.sin(t) * r, rr, 0, 6.28); g.fill();
      }
      g.globalAlpha = 1;
    }
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  ATLAS[tipo] = t;
  return t;
}

function atlasHojas() {
  if (ATLAS.hojas) return ATLAS.hojas;
  const N = 256, C = 128, cv = lienzo(N), g = cv.getContext('2d');
  const rng = crearRng(4242);
  for (let k = 0; k < 4; k++) {
    const cx = (k % 2) * C + C / 2, cy = Math.floor(k / 2) * C + C / 2, L = C * rng.rango(0.3, 0.42), W = L * rng.rango(0.35, 0.6);
    g.save(); g.translate(cx, cy); g.rotate(rng.rango(0, 3));
    g.fillStyle = '#fff'; g.beginPath();
    if (k === 0) { g.moveTo(-L, 0); g.quadraticCurveTo(0, -W * 1.6, L, 0); g.quadraticCurveTo(0, W * 1.6, -L, 0); }       // oval
    else if (k === 1) { g.moveTo(-L, 0); g.bezierCurveTo(-L * 0.2, -W * 2, L * 0.5, -W, L, 0); g.bezierCurveTo(L * 0.5, W, -L * 0.2, W * 1.4, -L, 0); } // lanceolada
    else if (k === 2) { for (let i = 0; i < 7; i++) { const t = (i / 7) * 6.28, r = i % 2 ? L * 0.55 : L * 0.95; g.lineTo(Math.cos(t) * r, Math.sin(t) * r * 0.8); } } // lobulada
    else { g.arc(0, 0, L * 0.7, 0, 6.28); }
    g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.4; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L * 0.9, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; t.needsUpdate = true;
  ATLAS.hojas = t; return t;
}

/** Materiales de parche cacheados por tipo y color (los libera kit.limpiar()). */
export function materialParche(kit, tipo, color, extra = {}) {
  const k = `${tipo}|${color}|${JSON.stringify(extra)}`;
  let m = kit._matParche.get(k);
  if (m) return m;
  // Los mapas piden tonos casi negros: se aclaran para que charcos y manchas oscurezcan el suelo sin parecer agujeros.
  if (tipo !== 'hojas') color = new THREE.Color(color).lerp(new THREE.Color(tipo === 'charco' ? 0x3a4652 : 0x3a3128), 0.45).getHex();
  if (tipo === 'charco') {
    // El agua es dieléctrica: con metal 0,8 el charco reflejaba el cielo nocturno y desde la cámara cenital se veía como un agujero negro.
    m = new THREE.MeshStandardMaterial({ map: atlasBlobs('charco'), color, roughness: extra.rugosidad ?? 0.06, metalness: Math.min(extra.metal ?? 0.1, 0.2), envMapIntensity: extra.reflejo ?? 1.2, transparent: true, opacity: 0.6, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  } else if (tipo === 'hojas') {
    m = new THREE.MeshStandardMaterial({ map: atlasHojas(), vertexColors: true, roughness: 0.9, metalness: 0, alphaTest: 0.35, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  } else {
    m = new THREE.MeshStandardMaterial({ map: atlasBlobs('mancha'), color, roughness: extra.rugosidad ?? 0.95, metalness: 0, transparent: true, opacity: Math.min(extra.opacidad ?? 0.5, 0.6), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  }
  m.name = 'parche_' + tipo;
  kit._matParche.set(k, m); kit._propios.push(m);
  return m;
}

/**
 * Añade una pieza de parche a la cola. Se fusionan por material al cerrar el mapa.
 * { tipo:'charco'|'mancha'|'hojas', x, z, radio=1.5, rot, alargado=1, color, opacidad, capa=0, cantidad, variante }
 */
export function anadirParche(kit, o) {
  const tipo = o.tipo ?? 'mancha';
  const rng = kit.rng((o.semilla ?? 1) * 131 + Math.floor((o.x ?? 0) * 7 + (o.z ?? 0) * 13));
  const def = { charco: 0x3a4652, mancha: 0x3a3128, hojas: 0xffffff }[tipo] ?? 0x222222;
  const color = o.color ?? def;
  const mat = materialParche(kit, tipo, color, { opacidad: o.opacidad, rugosidad: o.rugosidad, metal: o.metal, reflejo: o.reflejo });
  let cola = kit._parches.get(mat);
  if (!cola) kit._parches.set(mat, (cola = { pos: [], nor: [], uv: [], col: [], tipo }));
  const capa = o.capa ?? 0;
  const un = (x, z, r, rot, alarg, variante, y, tinte) => {
    const n = tipo === 'hojas' ? 1 : 6;
    const u0 = (variante % 2) * 0.5, v0 = (1 - Math.floor(variante / 2)) * 0.5;
    const cs = Math.cos(rot), sn = Math.sin(rot);
    const V = (i, j) => {
      const lx = (i / n - 0.5) * 2 * r * alarg, lz = (j / n - 0.5) * 2 * r;
      const wx = x + lx * cs + lz * sn, wz = z - lx * sn + lz * cs;
      return [wx, kit.altura(wx, wz) + y, wz, u0 + (i / n) * 0.5, v0 + (j / n) * 0.5];
    };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const a = V(i, j), b = V(i + 1, j), c = V(i + 1, j + 1), d = V(i, j + 1);
      for (const t of [[a, d, c], [a, c, b]]) for (const p of t) { cola.pos.push(p[0], p[1], p[2]); cola.nor.push(0, 1, 0); cola.uv.push(p[3], p[4]); cola.col.push(tinte[0], tinte[1], tinte[2]); }
    }
  };
  const y = 0.03 + capa * 0.003;
  if (tipo === 'hojas') {
    const n = o.cantidad ?? 40, R = o.radio ?? 3;
    const paleta = o.paleta ?? [0x8a5a22, 0xa8742a, 0x6b4a1e, 0x5d6b2a, 0xb8872e, 0x7a3e1c];
    const c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.28, rr = Math.sqrt(rng()) * R;
      c.setHex(paleta[Math.floor(rng() * paleta.length)]).multiplyScalar(rng.rango(0.7, 1.15));
      un(o.x + Math.cos(a) * rr, o.z + Math.sin(a) * rr, rng.rango(0.07, 0.13), rng() * 6.28, rng.rango(1, 1.5), Math.floor(rng() * 4), y + rng() * 0.012, [c.r, c.g, c.b]);
    }
  } else {
    un(o.x, o.z, o.radio ?? 1.5, o.rot ?? rng() * 6.28, o.alargado ?? 1, o.variante ?? Math.floor(rng() * 4), y, [1, 1, 1]);
  }
}

export function construirParches(kit) {
  const g = new THREE.Group(); g.name = 'parches';
  for (const [mat, c] of kit._parches) {
    if (!c.pos.length) continue;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(c.pos, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(c.nor, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(c.uv, 2));
    if (c.tipo === 'hojas') geo.setAttribute('color', new THREE.Float32BufferAttribute(c.col, 3));
    geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, mat);
    m.receiveShadow = true; m.renderOrder = c.tipo === 'charco' ? 3 : 2; m.name = 'parches:' + c.tipo;
    g.add(m);
  }
  kit._parches.clear();
  return g;
}
