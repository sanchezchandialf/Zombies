// ERA Z · Avenida Neón: utilidades de construcción (coches de los 50, palmeras, rótulos de neón, ventanales pintados, mobiliario).
// Todo se funde en los lotes del kit; los rótulos y ventanales son mallas sueltas con lienzos procedurales (emisivos).
import * as THREE from 'three';
import { crearPintura } from './pintura.js';

export const PINTURAS = [0x4fd1c5, 0xf08cb5, 0xf0e6c8, 0x8fd8b0, 0x7fb4e8, 0xe8c968, 0x1f7a7a, 0x2b3a55, 0x9b3d56, 0xe8ecef];
export const ROSA = 0xff3fa8, TURQUESA = 0x2ff0ff;

const css = (c) => (typeof c === 'string' ? c : '#' + c.toString(16).padStart(6, '0'));
function lienzo(w, h) { const c = document.createElement('canvas'); c.width = Math.max(8, Math.round(w)); c.height = Math.max(8, Math.round(h)); return c; }
function rrect(g, x, y, w, h, r) {
  g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath();
}
/** Texto de neón: tubo de color con brillo y núcleo claro. */
function neonTexto(g, texto, cx, cy, tam, color, o = {}) {
  g.save();
  g.font = `${o.peso ?? 800} ${tam}px ${o.fuente ?? '"Trebuchet MS","Segoe UI","DejaVu Sans",Arial,sans-serif'}`;
  g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
  if (g.letterSpacing !== undefined) g.letterSpacing = `${Math.round(tam * (o.espaciado ?? 0.06))}px`;
  g.shadowColor = css(color); g.shadowBlur = tam * 0.45;
  g.strokeStyle = css(color); g.lineWidth = tam * 0.12;
  g.strokeText(texto, cx, cy); g.strokeText(texto, cx, cy);
  g.shadowBlur = tam * 0.15; g.lineWidth = tam * 0.07; g.strokeStyle = css(color); g.strokeText(texto, cx, cy);
  g.shadowBlur = 0; g.fillStyle = o.nucleo ?? '#fff4fb'; g.fillText(texto, cx, cy);
  g.restore();
}

export function crearUtiles(kit) {
  const lote = kit.lote0, M = kit.matriz, rng = kit.rng(77);
  const mat = (n, o) => kit.mat(n, o);
  const pintura = crearPintura(kit), pint = (color, o = {}) => pintura(color);
  const cromo = mat('cromo'), goma = mat('goma'), cepillado = mat('acero_cepillado'), hierro = mat('hierro_forjado');
  const vidrioOff = kit.vidrio(false);
  const faro = kit.emisivo(0xfff0c8, 1.3), piloto = kit.emisivo(0xff2a2a, 1.6);
  const cajaRR = kit.cajaRedondeada;
  const A = (g, m, mm, o) => lote.anadir(g, m, mm, o);
  const propio = (x) => { kit._propios.push(x); return x; };
  const U = { rotulos: [] };

  // ───────────── COCHES ─────────────
  const cacheGeo = new Map();
  const geoPerfil = (clave, pts, ancho, bisel = 0.07) => {
    const k = clave + '|' + ancho;
    let g = cacheGeo.get(k);
    if (g) return g;
    const sh = new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y)));
    const prof = ancho - 2 * bisel;
    g = new THREE.ExtrudeGeometry(sh, { depth: prof, bevelEnabled: true, bevelThickness: bisel, bevelSize: bisel, bevelOffset: -bisel, bevelSegments: 2, curveSegments: 4 });
    g.translate(0, 0, -prof / 2);
    cacheGeo.set(k, g);
    return g;
  };
  const TIPOS = {
    sedan: {
      bajo: [[-2.45, 0.3], [2.4, 0.3], [2.47, 0.52], [2.4, 0.78], [1.5, 0.88], [0.85, 0.93], [-1.2, 0.93], [-1.7, 0.97], [-2.3, 1.0], [-2.47, 0.9]],
      cab: [[0.85, 0.93], [0.35, 1.42], [-0.95, 1.42], [-1.55, 0.97]], techo: [-0.3, 1.46, 1.36], aletas: true,
    },
    cupe: {
      bajo: [[-2.4, 0.3], [2.5, 0.3], [2.55, 0.5], [2.45, 0.76], [1.7, 0.86], [0.9, 0.93], [-1.0, 0.93], [-1.8, 0.96], [-2.4, 0.9]],
      cab: [[0.55, 0.93], [0.1, 1.36], [-0.85, 1.36], [-1.3, 0.97]], techo: [-0.38, 1.4, 1.0], aletas: false,
    },
    ranchera: {
      bajo: [[-2.45, 0.3], [2.4, 0.3], [2.47, 0.52], [2.4, 0.78], [1.5, 0.88], [0.9, 0.93], [-2.3, 0.95], [-2.47, 0.88]],
      cab: [[0.9, 0.93], [0.45, 1.44], [-1.75, 1.44], [-1.9, 0.97]], techo: [-0.65, 1.48, 2.2], aletas: false,
    },
  };

  /** Coche de los años 50 fundido en el lote. Frente = +X local; rot = giro Y. */
  U.coche = ({ x, z, rot = 0, color = PINTURAS[0], tipo = 'sedan', colision = true, color2 = null }) => {
    const B = M(x, 0, z, rot);
    const L = (lx, ly, lz, ry = 0, rx = 0, rz = 0) => B.clone().multiply(M(lx, ly, lz, ry, rx, rz));
    const t = TIPOS[tipo] ?? TIPOS.sedan, pa = pint(color), pa2 = color2 ? pint(color2) : pa;
    A(geoPerfil('b' + tipo, t.bajo, 1.9), pa, L(0, 0, 0));
    A(geoPerfil('c' + tipo, t.cab, 1.66, 0.05), vidrioOff, L(0, 0, 0));
    const [tx, ty, tl] = t.techo;
    A(cajaRR(tl, 0.07, 1.72, 0.03, 1), pa2, L(tx, ty, 0));
    const p0 = t.cab[0], p1 = t.cab[1], p2 = t.cab[t.cab.length - 2], p3 = t.cab[t.cab.length - 1];
    for (const s of [-1, 1]) {
      A(cajaRR(0.09, Math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + 0.02, 0.07, 0.02, 1), pa, L((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, s * 0.83, 0, 0, Math.atan2(p1[1] - p0[1], p1[0] - p0[0]) - Math.PI / 2));
      A(cajaRR(0.11, Math.hypot(p3[0] - p2[0], p3[1] - p2[1]) + 0.02, 0.07, 0.02, 1), pa, L((p2[0] + p3[0]) / 2, (p2[1] + p3[1]) / 2, s * 0.83, 0, 0, Math.atan2(p3[1] - p2[1], p3[0] - p2[0]) - Math.PI / 2));
    }
    for (const s of [-1, 1]) {
      if (t.aletas) { A(cajaRR(0.75, 0.14, 0.13, 0.04, 1), pa, L(-2.18, 1.08, s * 0.84, 0, 0, 0.18)); A(cajaRR(0.07, 0.1, 0.1, 0.02, 1), piloto, L(-2.53, 1.0, s * 0.8)); }
      else A(cajaRR(0.05, 0.1, 0.28, 0.02, 1), piloto, L(-2.49, 0.78, s * 0.7));
      A(cajaRR(0.1, 0.22, 0.26, 0.05, 1), cromo, L(2.44, 0.7, s * 0.72)); A(cajaRR(0.06, 0.15, 0.2, 0.04, 1), faro, L(2.5, 0.7, s * 0.72));
      A(cajaRR(3.3, 0.045, 0.02, 0.01, 1), cromo, L(0.1, 0.6, s * 0.955));
    }
    A(cajaRR(0.2, 0.2, 1.98, 0.07, 2), cromo, L(2.5, 0.42, 0)); A(cajaRR(0.2, 0.2, 1.98, 0.07, 2), cromo, L(-2.5, 0.42, 0));
    A(cajaRR(0.05, 0.16, 1.2, 0.02, 1), cromo, L(2.5, 0.66, 0)); A(cajaRR(0.22, 0.03, 0.16, 0.01, 1), cromo, L(1.9, 0.9, 0));
    for (const sx of [1.5, -1.45]) for (const s of [-1, 1]) {
      A(kit.cilindro(0.34, 0.34, 0.24, 12, 0.03), goma, L(sx, 0.34, s * 0.86 - 0.12, 0, Math.PI / 2), { uv: false });
      A(kit.cilindro(0.19, 0.17, 0.05, 10, 0.01), cromo, L(sx, 0.34, s * 0.86 + (s > 0 ? 0.1 : -0.15), 0, Math.PI / 2), { uv: false });
    }
    if (colision) return kit.muro(x, z, 4.95, 1.95, rot, { nombre: 'coche' });
    return null;
  };

  // ───────────── PALMERAS ─────────────
  const geoFronda = (() => {
    const N = 14, L = 2.8, pos = [], uv = [], idx = [];
    for (let i = 0; i <= N; i++) {
      const s = i / N, w = 0.62 * Math.sin(Math.PI * Math.pow(s, 0.65)) * (1 - 0.35 * s) * (i % 2 ? 0.62 : 1) + 0.02;
      const y = 0.75 * s - 1.35 * s * s, x = L * s;
      pos.push(x, y - w * 0.22, -w / 2, x, y, 0, x, y - w * 0.22, w / 2);
      uv.push(s, 0, s, 0.5, s, 1);
      if (i < N) { const a = i * 3, b = a + 3; idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2); }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  })();
  const fronda = [];
  U.palmera = ({ x, z, alto = 7, escala = 1, semilla = 1, colision = true }) => {
    const r = kit.rng(semilla * 31 + 5), H = alto * escala;
    const lean = r.rango(0.6, 1.8) * (r() < 0.5 ? -1 : 1), lean2 = r.rango(-0.8, 0.8);
    const curva = new THREE.CatmullRomCurve3([new THREE.Vector3(x, 0, z), new THREE.Vector3(x + lean * 0.15, H * 0.35, z + lean2 * 0.15), new THREE.Vector3(x + lean * 0.6, H * 0.7, z + lean2 * 0.6), new THREE.Vector3(x + lean, H, z + lean2)]);
    A(new THREE.TubeGeometry(curva, 9, 0.17 * escala, 7, false), mat('troncos', { color: 0x8a7a66 }), null);
    A(kit.cilindro(0.3 * escala, 0.19 * escala, 0.5, 8, 0.03), mat('troncos', { color: 0x8a7a66 }), M(x, 0, z));
    const cx = x + lean, cz = z + lean2;
    for (let i = 0; i < 3; i++) A(new THREE.SphereGeometry(0.1 * escala, 6, 5), mat('hierro_forjado'), M(cx + r.rango(-0.2, 0.2), H - 0.15, cz + r.rango(-0.2, 0.2)), { uv: false });
    const n = 12;
    for (let i = 0; i < n; i++) fronda.push({ x: cx, y: H - 0.05, z: cz, rot: (i / n) * 6.283 + r.rango(-0.2, 0.2), rotZ: r.rango(-0.15, 0.55), esc: escala * r.rango(0.85, 1.15), color: r() < 0.5 ? 0x5d8a43 : 0x3f6b38 });
    if (colision) kit.pilar(x + lean * 0.12, z + lean2 * 0.12, 0.28 * escala, { nombre: 'palmera' });
  };
  U.cerrarPalmeras = () => {
    if (!fronda.length) return;
    const m = propio(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.75, side: THREE.DoubleSide }));
    m.name = 'fronda';
    kit.instancias(geoFronda, m, fronda, { sombras: true, nombre: 'frondas' });
  };

  // ───────────── RÓTULOS DE NEÓN (lienzo emisivo) ─────────────
  /**
   * Rótulo: panel oscuro con borde y líneas de neón. `lineas`: [{ t, color, tam (fracción de h), y (fracción 0..1 desde arriba) }].
   * parpadeo: { fase, vel, prof } hace titilar el brillo desde `actualizar`.
   */
  U.rotulo = ({ x, y, z, w, h, rot = 0, lineas, borde = TURQUESA, fondo = '#0a0e1f', px = 96, intensidad = 1.9, parpadeo = null, marco = true, redondeo = 0.1, dorso = true }) => {
    const W = Math.min(2048, w * px), Hh = (W / w) * h, cv = lienzo(W, Hh), g = cv.getContext('2d');
    g.fillStyle = fondo; g.fillRect(0, 0, cv.width, cv.height);
    if (borde != null) {
      const e = Hh * 0.07;
      g.save(); g.shadowColor = css(borde); g.shadowBlur = e * 1.2; g.strokeStyle = css(borde); g.lineWidth = e * 0.55;
      rrect(g, e * 1.2, e * 1.2, cv.width - e * 2.4, cv.height - e * 2.4, Hh * redondeo); g.stroke(); g.stroke();
      g.shadowBlur = 0; g.strokeStyle = '#fff'; g.globalAlpha = 0.65; g.lineWidth = e * 0.18; g.stroke(); g.restore();
    }
    for (const l of lineas) neonTexto(g, l.t, cv.width / 2 + (l.dx ?? 0) * cv.width, Hh * (l.y ?? 0.5), Hh * (l.tam ?? 0.4), l.color, { espaciado: l.esp, peso: l.peso, fuente: l.fuente, nucleo: l.nucleo });
    const tex = propio(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = propio(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: intensidad, roughness: 0.55, metalness: 0.05 }));
    m.name = 'rotulo';
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    const sn = Math.sin(rot), cs = Math.cos(rot);
    mesh.position.set(x + sn * 0.1, y, z + cs * 0.1); mesh.rotation.y = rot;
    kit.anadir(mesh);
    if (dorso) lote.caja(pint(0x20262e), x, y, z, w + 0.22, h + 0.22, 0.18, { rotY: rot, radio: 0.05, uv: false });
    if (parpadeo) U.rotulos.push({ m, base: intensidad, ...parpadeo });
    return mesh;
  };

  // ───────────── PANTALLA DE AUTOCINE ─────────────
  U.pantallaCine = ({ x, z, w = 30, h = 13, y0 = 2.2 }) => {
    const W = 1536, Hh = Math.round(W * h / w), cv = lienzo(W, Hh), g = cv.getContext('2d');
    const cielo = g.createLinearGradient(0, 0, 0, Hh);
    cielo.addColorStop(0, '#120c3a'); cielo.addColorStop(0.45, '#5a2a80'); cielo.addColorStop(0.72, '#e8508f'); cielo.addColorStop(1, '#ffb86b');
    g.fillStyle = cielo; g.fillRect(0, 0, W, Hh);
    const r0 = kit.rng(5);
    for (let i = 0; i < 140; i++) { g.fillStyle = `rgba(255,255,255,${r0() * 0.8})`; g.fillRect(r0() * W, r0() * Hh * 0.5, 2 + r0() * 2, 2 + r0() * 2); }
    const luna = g.createRadialGradient(W * 0.72, Hh * 0.3, 10, W * 0.72, Hh * 0.3, Hh * 0.2);
    luna.addColorStop(0, '#fff6dc'); luna.addColorStop(0.7, '#ffe7a8'); luna.addColorStop(1, 'rgba(255,200,140,0)');
    g.fillStyle = luna; g.beginPath(); g.arc(W * 0.72, Hh * 0.3, Hh * 0.2, 0, 7); g.fill();
    // platillo
    g.save(); g.translate(W * 0.3, Hh * 0.33); g.fillStyle = '#c9e6f2';
    g.beginPath(); g.ellipse(0, 0, W * 0.11, Hh * 0.05, 0, 0, 7); g.fill(); g.fillStyle = '#8fd0e6'; g.beginPath(); g.ellipse(0, -Hh * 0.04, W * 0.045, Hh * 0.05, 0, Math.PI, 0); g.fill();
    for (let i = -3; i <= 3; i++) { g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(i * W * 0.027, Hh * 0.008, 7, 0, 7); g.fill(); }
    const haz = g.createLinearGradient(0, 0, 0, Hh * 0.5); haz.addColorStop(0, 'rgba(190,255,230,0.55)'); haz.addColorStop(1, 'rgba(190,255,230,0)');
    g.fillStyle = haz; g.beginPath(); g.moveTo(-W * 0.04, Hh * 0.04); g.lineTo(W * 0.04, Hh * 0.04); g.lineTo(W * 0.1, Hh * 0.5); g.lineTo(-W * 0.1, Hh * 0.5); g.fill(); g.restore();
    // ciudad en silueta
    g.fillStyle = '#1a1030';
    let cx = 0; const r1 = kit.rng(9);
    while (cx < W) { const bw = 30 + r1() * 70, bh = Hh * (0.12 + r1() * 0.26); g.fillRect(cx, Hh - bh, bw, bh); for (let k = 0; k < 6; k++) { g.fillStyle = r1() < 0.5 ? '#ffd36b' : '#f78fc2'; g.fillRect(cx + 6 + r1() * (bw - 14), Hh - bh + 8 + r1() * (bh - 16), 5, 7); } g.fillStyle = '#1a1030'; cx += bw + 2; }
    neonTexto(g, 'ATAQUE DESDE LA NIEBLA', W / 2, Hh * 0.1, Hh * 0.1, 0xff5fb8, { espaciado: 0.04 });
    neonTexto(g, 'ESTRENO  ·  TECNICOLOR', W / 2, Hh * 0.2, Hh * 0.045, TURQUESA, { espaciado: 0.1, peso: 700 });
    const tex = propio(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const m = propio(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 1.05, roughness: 0.7 }));
    m.name = 'pantalla_cine';
    const yc = y0 + h / 2, zf = z + 0.62;
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); pl.position.set(x, yc, zf); kit.anadir(pl);
    // marco y estructura
    const oscuro = pint(0x2a323c);
    lote.caja(oscuro, x, yc, z, w + 1.4, h + 1.4, 1.0, { radio: 0.05, uv: false });
    const tubo = (c, cx, cy, ww, hh, g = 0.16) => {
      const e = kit.emisivo(c, 2.6);
      for (const s of [-1, 1]) {
        lote.caja(e, cx, cy + s * hh / 2, zf + 0.05, ww + g, g, g, { uv: false, radio: 0.03 });
        lote.caja(e, cx + s * ww / 2, cy, zf + 0.05, g, hh + g, g, { uv: false, radio: 0.03 });
      }
    };
    tubo(0xff3fa8, x, yc, w + 0.9, h + 0.9, 0.2); tubo(0x2ff0ff, x, yc, w - 0.1, h - 0.1, 0.12);
    // patas y riostras (detrás)
    for (const px of [-w * 0.42, -w * 0.14, w * 0.14, w * 0.42]) {
      lote.cajaBase(mat('hierro_oxidado'), x + px, 0, z + 0.9, 0.7, y0 + 1, 0.7, { radio: 0.05 });
      const L = Math.hypot(3.4, h * 0.55);
      lote.caja(mat('hierro_oxidado'), x + px, y0 + h * 0.3, z + 2.2, 0.22, L, 0.22, { rotX: Math.atan2(3.4, h * 0.55) * -1 + 0.0, radio: 0.03, uv: false });
      lote.cajaBase(mat('hormigon'), x + px, 0, z + 3.8, 1.0, 0.5, 1.0, { radio: 0.06 });
    }
    kit.muro(x, z + 0.6, w + 1, 1.2, 0, { nombre: 'pantalla_cine' });
    return pl;
  };

  // ───────────── VENTANALES PINTADOS (interiores emisivos) ─────────────
  const pintores = {
    diner(g, W, H) {
      const f = g.createLinearGradient(0, 0, 0, H); f.addColorStop(0, '#fff0cf'); f.addColorStop(1, '#ffc58a'); g.fillStyle = f; g.fillRect(0, 0, W, H);
      for (let i = 0; i < W; i += H * 0.22) { g.fillStyle = (i / (H * 0.22)) % 2 ? '#2a2a33' : '#f2f2f2'; g.fillRect(i, H * 0.86, H * 0.22, H * 0.14); }
      g.fillStyle = '#2fc9bd'; g.fillRect(0, H * 0.36, W, H * 0.06); // franja trasera
      for (let i = 0; i < 6; i++) { // reservados del fondo
        const bx = (i + 0.2) * W / 6; g.fillStyle = i % 2 ? '#ff5aa8' : '#2fc9bd'; rrect(g, bx, H * 0.45, W / 6 * 0.6, H * 0.3, 10); g.fill();
        g.fillStyle = '#fff'; g.fillRect(bx + W / 6 * 0.1, H * 0.42, W / 6 * 0.4, H * 0.04);
      }
      g.fillStyle = '#d8dde2'; g.fillRect(0, H * 0.7, W, H * 0.07); g.fillStyle = '#a9b0b8'; g.fillRect(0, H * 0.77, W, H * 0.09); // barra cromada
      for (let i = 0; i < 12; i++) { const sx = (i + 0.5) * W / 12; g.fillStyle = i % 2 ? '#ff5aa8' : '#2fc9bd'; g.beginPath(); g.ellipse(sx, H * 0.66, W / 12 * 0.2, H * 0.05, 0, 0, 7); g.fill(); g.fillRect(sx - 3, H * 0.66, 6, H * 0.2); }
      for (let i = 0; i < 7; i++) { const lx = (i + 0.5) * W / 7; g.fillStyle = '#fffbe8'; g.beginPath(); g.arc(lx, H * 0.1, H * 0.055, 0, 7); g.fill(); g.fillRect(lx - 1, 0, 2, H * 0.06); }
    },
    motel(g, W, H) {
      g.fillStyle = '#ffe2b5'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#9b5b3a'; g.fillRect(0, H * 0.62, W, H * 0.38); g.fillStyle = '#c98a5a'; g.fillRect(W * 0.1, H * 0.58, W * 0.55, H * 0.12);
      g.fillStyle = '#2fc9bd'; rrect(g, W * 0.7, H * 0.12, W * 0.24, H * 0.5, 8); g.fill();
      for (let i = 0; i < 8; i++) { g.fillStyle = '#ffd36b'; g.fillRect(W * 0.72 + (i % 4) * W * 0.055, H * 0.2 + Math.floor(i / 4) * H * 0.2, 10, H * 0.12); }
      g.fillStyle = '#fff'; g.beginPath(); g.arc(W * 0.2, H * 0.28, H * 0.1, 0, 7); g.fill();
    },
    lavanderia(g, W, H) {
      g.fillStyle = '#dff6ff'; g.fillRect(0, 0, W, H);
      const n = 8, ww = W / n;
      for (let i = 0; i < n; i++) {
        g.fillStyle = '#f4f6f8'; rrect(g, i * ww + ww * 0.08, H * 0.18, ww * 0.84, H * 0.78, 12); g.fill();
        const rg = g.createRadialGradient(i * ww + ww / 2, H * 0.52, 4, i * ww + ww / 2, H * 0.52, ww * 0.3);
        rg.addColorStop(0, '#9afaff'); rg.addColorStop(0.7, '#2fc9e8'); rg.addColorStop(1, '#1d7f9a'); g.fillStyle = rg; g.beginPath(); g.arc(i * ww + ww / 2, H * 0.52, ww * 0.3, 0, 7); g.fill();
        g.fillStyle = '#ff5aa8'; g.fillRect(i * ww + ww * 0.15, H * 0.24, ww * 0.25, H * 0.05);
      }
      g.fillStyle = '#2a2f38'; g.fillRect(0, H * 0.96, W, H * 0.04);
    },
    tienda(g, W, H) {
      g.fillStyle = '#fff3d6'; g.fillRect(0, 0, W, H);
      const cols = ['#ff5aa8', '#2fc9bd', '#ffd36b', '#8fd8b0', '#7fb4e8', '#fff'];
      for (let r = 0; r < 4; r++) { g.fillStyle = '#6b5a4a'; g.fillRect(0, H * (0.2 + r * 0.22), W, H * 0.025); for (let i = 0; i < 26; i++) { g.fillStyle = cols[(i * 7 + r * 3) % 6]; g.fillRect(i * W / 26 + 4, H * (0.2 + r * 0.22) - H * 0.14, W / 26 - 8, H * 0.14); } }
    },
    kiosco(g, W, H) {
      g.fillStyle = '#ffe9bd'; g.fillRect(0, 0, W, H);
      g.fillStyle = '#f2f2f2'; g.fillRect(W * 0.08, H * 0.25, W * 0.2, H * 0.55); g.fillStyle = '#ff5aa8'; g.fillRect(W * 0.08, H * 0.25, W * 0.2, H * 0.1);
      for (let i = 0; i < 14; i++) { g.fillStyle = '#fff8c8'; g.beginPath(); g.arc(W * 0.14 + (i % 4) * 14, H * 0.45 + Math.floor(i / 4) * 12, 7, 0, 7); g.fill(); }
      g.fillStyle = '#2fc9bd'; g.fillRect(W * 0.4, H * 0.18, W * 0.52, H * 0.22);
      g.fillStyle = '#fff'; g.fillRect(W * 0.44, H * 0.24, W * 0.44, 6); g.fillRect(W * 0.44, H * 0.31, W * 0.3, 6);
    },
  };
  /** Ventanal emisivo en una cara. `rot` = giro Y del plano (0 mira al sur). */
  U.ventanal = ({ tipo, x, y, z, w, h, rot = 0, intensidad = 1.1 }) => {
    const px = 150, W = Math.min(2048, w * px), Hh = Math.max(32, W * h / w), cv = lienzo(W, Hh), g = cv.getContext('2d');
    (pintores[tipo] ?? pintores.tienda)(g, cv.width, cv.height);
    const tex = propio(new THREE.CanvasTexture(cv)); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = propio(new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: intensidad, roughness: 0.4, metalness: 0 }));
    m.name = 'ventanal';
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m);
    mesh.position.set(x + Math.sin(rot) * 0.02, y, z + Math.cos(rot) * 0.02); mesh.rotation.y = rot;
    kit.anadir(mesh);
    return mesh;
  };

  // ───────────── MOBILIARIO ─────────────
  U.cabina = ({ x, z, rot = 0 }) => {
    const B = M(x, 0, z, rot), L = (lx, ly, lz, ry = 0) => B.clone().multiply(M(lx, ly, lz, ry));
    const verde = pint(0x2fc9bd), blanco = pint(0xeef2f4), luz = kit.emisivo(0xdff6ff, 2.2);
    A(cajaRR(1.0, 0.18, 1.0, 0.03, 1), pint(0x39434d), L(0, 0.09, 0));
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) A(cajaRR(0.07, 2.2, 0.07, 0.02, 1), verde, L(sx * 0.46, 1.28, sz * 0.46));
    for (const y of [0.55, 1.05, 1.55, 2.0]) {
      A(cajaRR(0.95, 0.045, 0.045, 0.01, 1), cromo, L(0, y, 0.47)); A(cajaRR(0.95, 0.045, 0.045, 0.01, 1), cromo, L(0, y, -0.47));
      A(cajaRR(0.045, 0.045, 0.95, 0.01, 1), cromo, L(0.47, y, 0)); A(cajaRR(0.045, 0.045, 0.95, 0.01, 1), cromo, L(-0.47, y, 0));
    }
    A(cajaRR(1.06, 0.28, 1.06, 0.05, 1), blanco, L(0, 2.5, 0)); A(cajaRR(1.0, 0.18, 1.0, 0.03, 1), luz, L(0, 2.5, 0.032));
    A(cajaRR(0.3, 0.42, 0.12, 0.03, 1), cromo, L(0, 1.2, -0.38)); A(cajaRR(0.18, 0.06, 0.06, 0.02, 1), hierro, L(0, 1.0, -0.3));
    kit.muro(x, z, 1.0, 1.0, rot, { nombre: 'cabina' });
  };
  U.expendedora = ({ x, z, rot = 0, color = 0xe8507f, panel = 0xbff0ff }) => {
    const B = M(x, 0, z, rot), L = (lx, ly, lz) => B.clone().multiply(M(lx, ly, lz));
    A(cajaRR(0.95, 1.85, 0.8, 0.05, 1), pint(color), L(0, 0.93, 0));
    A(cajaRR(0.7, 1.1, 0.03, 0.01, 1), kit.emisivo(panel, 1.5), L(-0.06, 1.15, 0.405));
    const cols = [0xff5aa8, 0x2fc9bd, 0xffffff, 0xffd36b];
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) A(cajaRR(0.12, 0.2, 0.05, 0.02, 1), pint(cols[(r + c) % 4]), L(-0.28 + c * 0.15, 0.78 + r * 0.26, 0.4));
    A(cajaRR(0.95, 0.16, 0.06, 0.02, 1), kit.emisivo(ROSA, 2.0), L(0, 1.78, 0.4));
    A(cajaRR(0.18, 0.5, 0.04, 0.01, 1), cromo, L(0.36, 1.15, 0.41)); A(cajaRR(0.6, 0.22, 0.04, 0.02, 1), pint(0x222a30), L(-0.06, 0.28, 0.41));
    kit.muro(x, z, 0.95, 0.8, rot, { nombre: 'expendedora' });
  };
  U.papelera = ({ x, z }) => {
    A(kit.cilindro(0.27, 0.3, 0.85, 12, 0.03), cepillado, M(x, 0, z));
    A(kit.cilindro(0.31, 0.31, 0.06, 12, 0.02), pint(0x39434d), M(x, 0.85, z));
    kit.pilar(x, z, 0.3, { nombre: 'papelera' });
  };
  U.contenedor = ({ x, z, rot = 0, color = 0x2d6a58 }) => {
    const B = M(x, 0, z, rot), L = (lx, ly, lz, rz = 0) => B.clone().multiply(M(lx, ly, lz, 0, 0, rz));
    A(cajaRR(2.2, 1.15, 1.2, 0.05, 1), pint(color, { desgaste: 0.6 }), L(0, 0.72, 0));
    A(cajaRR(2.3, 0.08, 1.3, 0.03, 1), pint(0x1f2a2e), L(0, 1.34, 0, 0.0));
    A(cajaRR(2.2, 0.1, 0.1, 0.02, 1), hierro, L(0, 0.2, 0.6)); A(cajaRR(2.2, 0.1, 0.1, 0.02, 1), hierro, L(0, 0.2, -0.6));
    kit.muro(x, z, 2.2, 1.2, rot, { nombre: 'contenedor' });
  };
  U.hidrante = ({ x, z }) => {
    A(kit.cilindro(0.17, 0.15, 0.7, 10, 0.02), pint(0xd04a3a), M(x, 0, z)); A(kit.cilindro(0.2, 0.2, 0.06, 10, 0.01), pint(0xd04a3a), M(x, 0.68, z));
    A(new THREE.SphereGeometry(0.15, 8, 6), pint(0xd04a3a), M(x, 0.76, z), { uv: false });
    A(cajaRR(0.5, 0.12, 0.12, 0.03, 1), cromo, M(x, 0.45, z)); kit.pilar(x, z, 0.2, { nombre: 'hidrante' });
  };
  U.cono = ({ x, z, rot = 0 }) => {
    A(cajaRR(0.4, 0.04, 0.4, 0.01, 1), pint(0x222222), M(x, 0.02, z, rot));
    A(kit.cilindro(0.15, 0.04, 0.62, 10, 0.01), pint(0xff7a2a, { desgaste: 0.4 }), M(x, 0.04, z, rot));
    A(kit.cilindro(0.1, 0.07, 0.1, 10, 0.005), pint(0xf4f4f4), M(x, 0.3, z, rot));
  };
  U.banco = ({ x, z, rot = 0 }) => {
    const B = M(x, 0, z, rot), L = (lx, ly, lz, rx = 0) => B.clone().multiply(M(lx, ly, lz, 0, rx));
    for (let i = 0; i < 4; i++) A(cajaRR(1.6, 0.05, 0.1, 0.01, 1), mat('tablas_viejas', { color: i % 2 ? 0x2fc9bd : 0xff7ac0 }), L(0, 0.45, -0.1 + i * 0.1));
    for (let i = 0; i < 3; i++) A(cajaRR(1.6, 0.1, 0.04, 0.01, 1), mat('tablas_viejas', { color: 0x2fc9bd }), L(0, 0.68 + i * 0.13, -0.22, -0.2));
    for (const s of [-1, 1]) A(cajaRR(0.06, 0.45, 0.45, 0.01, 1), hierro, L(s * 0.7, 0.22, 0));
    kit.muro(x, z, 1.7, 0.55, rot, { nombre: 'banco', bloqueaBalas: false });
  };
  U.neumaticos = ({ x, z, pilas = 3 }) => {
    for (let i = 0; i < pilas; i++) A(kit.cilindro(0.34, 0.34, 0.24, 12, 0.07), goma, M(x + (i === 2 ? 0.3 : 0), i * 0.24, z + (i === 1 ? 0.04 : 0)));
    kit.pilar(x, z, 0.38, { nombre: 'neumaticos', bloqueaBalas: false });
  };
  U.tumbona = ({ x, z, rot = 0, color = 0xff7ac0 }) => {
    const B = M(x, 0, z, rot), L = (lx, ly, lz, rx = 0) => B.clone().multiply(M(lx, ly, lz, 0, rx));
    A(cajaRR(0.62, 0.07, 1.25, 0.02, 1), pint(color), L(0, 0.32, 0.2)); A(cajaRR(0.62, 0.07, 0.75, 0.02, 1), pint(color), L(0, 0.55, -0.62, -0.7));
    for (const s of [-1, 1]) A(cajaRR(0.04, 0.3, 0.04, 0.01, 1), cromo, L(s * 0.3, 0.15, 0.7));
  };
  U.sombrilla = ({ x, z, color = 0xff7ac0 }) => {
    A(kit.cilindro(0.04, 0.04, 2.3, 8, 0.01), cromo, M(x, 0, z));
    A(kit.cilindro(0.9, 0.05, 0.5, 12, 0.01), pint(color, { desgaste: 0.1 }), M(x, 2.2, z));
    A(kit.cilindro(0.42, 0.42, 0.06, 12, 0.01), pint(0x333c44), M(x, 0, z));
    kit.pilar(x, z, 0.2, { nombre: 'sombrilla', bloqueaBalas: false });
  };
  U.surtidorDecor = ({ x, z, rot = 0 }) => {
    const B = M(x, 0, z, rot), L = (lx, ly, lz) => B.clone().multiply(M(lx, ly, lz));
    A(cajaRR(0.56, 1.1, 0.36, 0.05, 1), pint(0xd9d2c4), L(0, 0.65, 0)); A(cajaRR(0.58, 0.3, 0.38, 0.05, 1), cromo, L(0, 1.0, 0));
    A(cajaRR(0.4, 0.2, 0.02, 0.01, 1), kit.emisivo(TURQUESA, 1.8), L(0, 1.0, 0.2)); kit.muro(x, z, 0.6, 0.4, rot, { nombre: 'surtidor' });
  };

  // ───────────── actualizar: titileo de neones ─────────────
  U.actualizar = (t) => {
    for (const r of U.rotulos) {
      const k = Math.sin(t * (r.vel ?? 7) + (r.fase ?? 0));
      let f = 1 - (r.prof ?? 0.15) * (0.5 + 0.5 * Math.sin(t * 3.1 + (r.fase ?? 0)));
      if (r.apaga) f *= k > r.apaga ? 1 : 0.18;
      r.m.emissiveIntensity = r.base * f;
    }
  };
  return U;
}
