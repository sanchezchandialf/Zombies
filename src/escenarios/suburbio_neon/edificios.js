// ERA Z · Avenida Neón: edificios a medida (motel, diner de cromo, gasolinera, lavandería, kiosco del autocine, taquilla).
// Todo cuelga de lotes del kit; los ventanales y rótulos son lienzos emisivos (utiles.js).
import * as THREE from 'three';
import { ROSA, TURQUESA } from './utiles.js';

export function crearEdificios(kit, U) {
  const lote = kit.lote0, M = kit.matriz, CR = kit.cajaRedondeada;
  const mat = (n, o) => kit.mat(n, o);
  const pint = (c, o = {}) => kit.mat('acero_pintado', { color: c, desgaste: 0.3, ...o });
  const cromo = mat('cromo'), cepillado = mat('acero_cepillado'), hierro = mat('hierro_forjado'), oxido = mat('hierro_oxidado');
  const A = (g, m, mm, o) => lote.anadir(g, m, mm, o);
  const caja = (m, cx, cy, cz, w, h, d, o = {}) => lote.caja(m, cx, cy, cz, w, h, d, o);
  const base = (m, cx, y0, cz, w, h, d, o = {}) => lote.cajaBase(m, cx, y0, cz, w, h, d, o);
  const E = {};

  /** Tejado plano con antepecho, membrana asfáltica, aparatos de aire y respiraderos. */
  E.techo = ({ x, z, w, d, y, color = 0xdcd6cc, parapeto = 0.45, equipos = 3, semilla = 1, desde = null }) => {
    const r = kit.rng(semilla * 13 + 7);
    caja(mat('tela_asfaltica', { color: 0x59595c }), x, y + 0.07, z, w - 0.2, 0.14, d - 0.2, { radio: 0.02, uv: true });
    const pa = pint(color, { desgaste: 0.45 });
    for (const s of [-1, 1]) {
      base(pa, x, y, z + s * (d / 2 - 0.12), w, parapeto, 0.24, { radio: 0.03 });
      base(pa, x + s * (w / 2 - 0.12), y, z, 0.24, parapeto, d - 0.24, { radio: 0.03 });
    }
    base(cepillado, x, y + parapeto, z + d / 2 - 0.12, w + 0.06, 0.05, 0.34, { radio: 0.02 });
    for (let i = 0; i < equipos; i++) {
      const ex = x + r.rango(-w / 2 + 1.6, w / 2 - 1.6), ez = z + r.rango(-d / 2 + 1.4, d / 2 - 1.4), s = r.rango(0.85, 1.3);
      base(cepillado, ex, y + 0.14, ez, 1.3 * s, 0.75 * s, 1.0 * s, { radio: 0.06 });
      A(kit.cilindro(0.38 * s, 0.38 * s, 0.06, 14, 0.015), hierro, M(ex, y + 0.14 + 0.75 * s, ez), { uv: false });
      base(pint(0x39434d), ex + 0.9 * s, y + 0.14, ez, 0.34, 0.4, 0.5, { radio: 0.03 });
    }
    for (let i = 0; i < 2; i++) {
      const ex = x + r.rango(-w / 2 + 1, w / 2 - 1), ez = z + r.rango(-d / 2 + 1, d / 2 - 1);
      A(kit.cilindro(0.12, 0.12, 0.9, 8, 0.02), cepillado, M(ex, y + 0.14, ez), { uv: false }); A(kit.cilindro(0.2, 0.05, 0.14, 8, 0.01), cepillado, M(ex, y + 1.04, ez), { uv: false });
    }
  };

  // ───────────── MOTEL ─────────────
  E.motel = ({ cx = -29, cz = -26, W = 26, D = 7 }) => {
    const x0 = cx - W / 2, zS = cz + D / 2, alto = 3.2;
    const pared = mat('ladrillo_encalado', { color: 0xf3d4da }), zoc = pint(0x2fc9bd), cornisa = pint(0xff7ac0);
    base(pared, cx, 0, cz, W, alto, D, { radio: 0.05 });
    base(zoc, cx, 0, cz, W + 0.1, 0.8, D + 0.1, { radio: 0.04 });
    base(cornisa, cx, alto - 0.3, cz, W + 0.2, 0.34, D + 0.2, { radio: 0.04 });
    base(cepillado, cx, alto + 0.0, cz, W + 0.3, 0.08, D + 0.3, { radio: 0.02 });
    E.techo({ x: cx, z: cz, w: W + 0.3, d: D + 0.3, y: alto + 0.06, color: 0xf3d4da, equipos: 5, semilla: 4, parapeto: 0.4 });
    kit.muro(cx, cz, W, D, 0, { nombre: 'motel' });
    // marquesina del pasillo con postes
    const mar = pint(0x2fc9bd);
    base(mar, cx, 2.62, zS + 0.85, W + 0.2, 0.14, 1.7, { radio: 0.03 });
    base(cepillado, cx, 2.55, zS + 1.72, W + 0.2, 0.1, 0.07, { radio: 0.02 });
    caja(kit.emisivo(ROSA, 2.2), cx, 2.5, zS + 1.76, W + 0.1, 0.05, 0.05, { uv: false, radio: 0.01 });
    const placas = [];
    const xs = [];
    for (let i = 0; i < 7; i++) xs.push(x0 + 1.5 + i * 3);
    for (let i = 0; i <= 6; i++) {
      const px = x0 + 0.1 + i * (W - 4.6) / 6 * 1.0;
      void px;
    }
    for (const px of [x0 + 0.2, x0 + 7.6, x0 + 14.6, x0 + 21.4]) {
      base(cepillado, px, 0, zS + 1.62, 0.12, 2.62, 0.12, { radio: 0.02 }); kit.pilar(px, zS + 1.62, 0.13, { nombre: 'poste_motel', bloqueaBalas: false });
    }
    // habitaciones
    const rr = kit.rng(31), colPuerta = [0x2fc9bd, 0xff7ac0];
    xs.forEach((rx, i) => {
      const dx = rx - 0.5, wx = rx + 0.75, cp = colPuerta[i % 2];
      base(pint(0xf6f1e6), dx, 0, zS + 0.04, 1.25, 2.3, 0.08, { radio: 0.02 });                              // marco
      base(pint(cp, { desgaste: 0.25 }), dx, 0, zS + 0.09, 0.98, 2.15, 0.06, { radio: 0.02 });               // puerta
      caja(cromo, dx + 0.34, 1.05, zS + 0.15, 0.05, 0.18, 0.05, { radio: 0.01 });
      for (const k of [0, 1]) caja(pint(0xf6f1e6), dx, 0.55 + k * 1.0, zS + 0.13, 0.7, 0.05, 0.02, { uv: false, radio: 0.005 });
      caja(kit.emisivo(0xffd9a0, 2.0), dx, 2.45, zS + 0.18, 0.3, 0.12, 0.14, { uv: false, radio: 0.03 });   // lámpara
      // ventana
      const v = rr(), lit = v < 0.4 ? kit.vidrio(true, 0xffc27a) : v < 0.62 ? kit.emisivo(0x7fe8ff, 0.9) : v < 0.78 ? kit.emisivo(0xff9ac8, 0.8) : kit.vidrio(false);
      caja(lit, wx, 1.45, zS + 0.03, 1.05, 1.0, 0.04, { uv: false, radio: 0.005 });
      const mf = pint(0xf6f1e6);
      caja(mf, wx, 1.97, zS + 0.07, 1.25, 0.1, 0.1, { radio: 0.02 }); caja(mf, wx, 0.93, zS + 0.09, 1.25, 0.1, 0.16, { radio: 0.02 });
      for (const s of [-1, 1]) caja(mf, wx + s * 0.58, 1.45, zS + 0.07, 0.09, 1.0, 0.1, { radio: 0.02 });
      caja(mf, wx, 1.45, zS + 0.08, 0.05, 0.95, 0.06, { radio: 0.01 });
      // cortina
      if (v < 0.78) caja(pint(i % 2 ? 0xff9ac8 : 0x9ef0f0), wx - 0.32, 1.45, zS + 0.065, 0.34, 0.95, 0.025, { uv: false, radio: 0.01 });
      placas.push({ x: dx, y: 2.28, z: zS + 0.21, n: i });
    });
    // números de puerta
    const cv = document.createElement('canvas'); cv.width = 512; cv.height = 256; const g = cv.getContext('2d');
    for (let i = 0; i < 8; i++) {
      const cxx = (i % 4) * 128, cyy = Math.floor(i / 4) * 128;
      g.fillStyle = '#1b2230'; g.fillRect(cxx, cyy, 128, 128); g.strokeStyle = '#ffd36b'; g.lineWidth = 6; g.strokeRect(cxx + 8, cyy + 8, 112, 112);
      g.fillStyle = '#ffe9a8'; g.font = '800 84px "Trebuchet MS",Arial,sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String(i + 1), cxx + 64, cyy + 68);
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const mp = new THREE.MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.9, roughness: 0.5 });
    kit._propios.push(tex, mp);
    const pos = [], uv = [], idx = [];
    placas.forEach((p, k) => {
      const w = 0.3, h = 0.2, u0 = (p.n % 4) / 4, v0 = 1 - (Math.floor(p.n / 4) + 1) / 2, du = 0.25, dv = 0.5, b = pos.length / 3;
      pos.push(p.x - w / 2, p.y - h / 2, p.z, p.x + w / 2, p.y - h / 2, p.z, p.x + w / 2, p.y + h / 2, p.z, p.x - w / 2, p.y + h / 2, p.z);
      uv.push(u0, v0, u0 + du, v0, u0 + du, v0 + dv, u0, v0 + dv); idx.push(b, b + 1, b + 2, b, b + 2, b + 3); void k;
    });
    const gp = new THREE.BufferGeometry(); gp.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); gp.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); gp.setIndex(idx); gp.computeVertexNormals();
    kit.anadir(new THREE.Mesh(gp, mp));
    // oficina (extremo este)
    const ox = x0 + W - 2.3;
    base(pint(0xf6f1e6), ox, 0, zS + 0.05, 4.2, 2.9, 0.1, { radio: 0.03 });
    U.ventanal({ tipo: 'motel', x: ox - 0.3, y: 1.6, z: zS + 0.1, w: 2.6, h: 1.6 });
    for (const s of [-1, 1]) caja(cromo, ox - 0.3 + s * 1.33, 1.6, zS + 0.14, 0.08, 1.7, 0.08, { radio: 0.015 });
    caja(cromo, ox - 0.3, 2.45, zS + 0.14, 2.7, 0.08, 0.08, { radio: 0.015 }); caja(cromo, ox - 0.3, 0.75, zS + 0.14, 2.7, 0.08, 0.08, { radio: 0.015 });
    base(pint(0x2fc9bd), ox + 1.45, 0, zS + 0.1, 0.9, 2.15, 0.06, { radio: 0.02 }); caja(kit.vidrio(true, 0xffd9a0), ox + 1.45, 1.3, zS + 0.14, 0.55, 1.3, 0.03, { uv: false });
    U.rotulo({ x: ox - 0.3, y: 3.62, z: zS + 0.05, w: 3.0, h: 0.62, lineas: [{ t: 'OFICINA', color: TURQUESA, tam: 0.6 }], borde: ROSA, px: 120, redondeo: 0.3 });
    return { puertas: xs.map((rx) => ({ x: rx - 0.5, z: zS + 1.0 })), zS, x0, W, ox };
  };

  // ───────────── DINER DE CROMO ─────────────
  E.diner = ({ cx = 31, cz = -12, W = 17, D = 9 }) => {
    const zS = cz + D / 2, zN = cz - D / 2, x0 = cx - W / 2, alto = 3.7;
    const turq = pint(0x2fc9bd, { desgaste: 0.2 });
    base(turq, cx, 0, cz, W + 0.1, 0.95, D + 0.1, { radio: 0.04 });
    base(cepillado, cx, 0.95, cz, W, alto - 0.95, D, { radio: 0.05 });
    base(turq, cx, 3.2, cz, W + 0.14, 0.26, D + 0.14, { radio: 0.04 });
    base(pint(0xff7ac0), cx, 3.46, cz, W + 0.14, 0.12, D + 0.14, { radio: 0.02 });
    kit.muro(cx, cz, W, D, 0, { nombre: 'diner' });
    // techo en bóveda
    const sh = new THREE.Shape(); sh.moveTo(-D / 2 - 0.1, 0); sh.quadraticCurveTo(0, 2.3, D / 2 + 0.1, 0); sh.lineTo(-D / 2 - 0.1, 0);
    const bov = new THREE.ExtrudeGeometry(sh, { depth: W - 0.1, bevelEnabled: true, bevelThickness: 0.06, bevelSize: 0.06, bevelSegments: 1, curveSegments: 14 });
    bov.translate(0, 0, -(W - 0.1) / 2);
    A(bov, cepillado, M(cx, alto, cz, Math.PI / 2));
    for (let i = 0; i <= 8; i++) { // costillas
      const px = x0 + 0.5 + i * (W - 1) / 8;
      const g2 = new THREE.ExtrudeGeometry(sh, { depth: 0.14, bevelEnabled: false, curveSegments: 14 }); g2.translate(0, 0, -0.07);
      A(g2, pint(i % 2 ? 0x2fc9bd : 0xff7ac0), M(px, alto + 0.02, cz, Math.PI / 2).multiply(M(0, 0.0, 0)), { uv: false });
    }
    // ventanales (dos paños y puerta central)
    const yv = 1.78, hv = 1.5;
    U.ventanal({ tipo: 'diner', x: cx - 4.55, y: yv, z: zS + 0.02, w: 7.3, h: hv });
    U.ventanal({ tipo: 'diner', x: cx + 4.55, y: yv, z: zS + 0.02, w: 7.3, h: hv });
    for (const s of [-1, 1]) {
      for (let i = 0; i <= 4; i++) caja(cromo, cx + s * (0.95 + i * 1.82), yv, zS + 0.06, 0.09, hv + 0.14, 0.1, { radio: 0.02 });
      caja(cromo, cx + s * 4.55, yv + hv / 2 + 0.05, zS + 0.06, 7.5, 0.12, 0.12, { radio: 0.02 }); caja(cromo, cx + s * 4.55, yv - hv / 2 - 0.05, zS + 0.06, 7.5, 0.12, 0.14, { radio: 0.02 });
    }
    // puerta
    caja(kit.emisivo(0xfff1d0, 0.9), cx, 1.2, zS + 0.05, 1.7, 2.3, 0.06, { uv: false, radio: 0.02 });
    for (const dx of [-0.85, 0, 0.85]) caja(cromo, cx + dx, 1.2, zS + 0.09, 0.07, 2.4, 0.07, { radio: 0.015 });
    for (const dx of [-0.2, 0.2]) caja(cromo, cx + dx, 1.15, zS + 0.14, 0.04, 0.6, 0.04, { radio: 0.01 });
    caja(cromo, cx, 2.45, zS + 0.09, 1.9, 0.1, 0.1, { radio: 0.02 });
    base(mat('hormigon'), cx, 0, zS + 0.5, 2.8, 0.18, 1.0, { radio: 0.03 }); base(mat('hormigon'), cx, 0, zS + 0.35, 3.1, 0.09, 0.7, { radio: 0.02 });
    // toldo rosa con ribete luminoso
    base(pint(0xff7ac0), cx, 2.78, zS + 0.75, W + 0.3, 0.14, 1.5, { radio: 0.03 });
    base(cromo, cx, 2.74, zS + 1.5, W + 0.3, 0.2, 0.05, { radio: 0.02 });
    caja(kit.emisivo(TURQUESA, 2.6), cx, 2.55, zS + 1.5, W + 0.2, 0.06, 0.06, { uv: false, radio: 0.02 });
    caja(kit.emisivo(ROSA, 2.4), cx, 2.5, zS + 0.07, W - 0.1, 0.045, 0.045, { uv: false, radio: 0.01 });
    // rótulo grande sobre el tejado
    for (const s of [-1, 1]) base(cepillado, cx + s * 3.4, 3.9, cz + 2.7, 0.2, 1.15, 0.2, { radio: 0.03 });
    U.rotulo({ x: cx, y: 6.2, z: cz + 2.85, w: 9.0, h: 2.9, lineas: [{ t: 'CAFÉ ESTRELLA', color: ROSA, tam: 0.36, y: 0.37, esp: 0.03 }, { t: 'COMIDA CASERA · 24 H', color: TURQUESA, tam: 0.16, y: 0.74, esp: 0.05 }], borde: TURQUESA, parpadeo: { vel: 11, fase: 1.2, prof: 0.08 } });
    U.rotulo({ x: cx + 5.2, y: 2.05, z: zS + 0.1, w: 1.7, h: 0.62, lineas: [{ t: 'ABIERTO', color: ROSA, tam: 0.5 }], borde: TURQUESA, px: 150, redondeo: 0.3, parpadeo: { vel: 5, fase: 2, prof: 0.1, apaga: -0.2 } });
    // trasera: puerta de servicio, extractores, depósito
    base(pint(0x39434d), cx - 5, 0, zN - 0.05, 1.1, 2.1, 0.1, { radio: 0.02 });
    caja(kit.emisivo(0xffe2a8, 2.0), cx - 5, 2.4, zN - 0.15, 0.4, 0.14, 0.12, { uv: false, radio: 0.03 });
    E.techo({ x: cx, z: cz, w: 0.1, d: 0.1, y: 0, equipos: 0 });
    for (let i = 0; i < 3; i++) {
      const ex = cx - 4 + i * 3.6;
      base(cepillado, ex, alto + 1.05, cz - 1.5, 0.9, 0.45, 0.9, { radio: 0.05 }); A(kit.cilindro(0.3, 0.3, 0.05, 14, 0.01), hierro, M(ex, alto + 1.5, cz - 1.5), { uv: false });
    }
    return { puerta: { x: cx, z: zS + 1.6 }, zS, zN };
  };

  // ───────────── GASOLINERA ─────────────
  E.gasolinera = ({ tx = -37, tz = 17.25, TW = 9, TD = 6.5, mx = -21.5, mz = 19, MW = 15, MD = 8, alto = 4.9 }) => {
    // tienda
    const zS = tz + TD / 2, h = 3.4;
    base(mat('estuco_desconchado', { color: 0xf1eee4 }), tx, 0, tz, TW, h, TD, { radio: 0.05 });
    base(pint(0x2fc9bd), tx, 0, tz, TW + 0.1, 0.8, TD + 0.1, { radio: 0.04 });
    base(pint(0xff7ac0), tx, h - 0.45, tz, TW + 0.2, 0.45, TD + 0.2, { radio: 0.04 });
    base(cepillado, tx, h, tz, TW + 0.3, 0.07, TD + 0.3, { radio: 0.02 });
    E.techo({ x: tx, z: tz, w: TW + 0.3, d: TD + 0.3, y: h + 0.06, color: 0xf1eee4, equipos: 2, semilla: 9 });
    kit.muro(tx, tz, TW, TD, 0, { nombre: 'tienda_gasolinera' });
    U.ventanal({ tipo: 'tienda', x: tx + 1.2, y: 1.85, z: zS + 0.02, w: 5.2, h: 1.6 });
    for (let i = 0; i <= 4; i++) caja(cromo, tx - 1.4 + i * 1.3, 1.85, zS + 0.06, 0.08, 1.7, 0.1, { radio: 0.015 });
    caja(cromo, tx + 1.2, 2.7, zS + 0.06, 5.3, 0.1, 0.12, { radio: 0.02 }); caja(cromo, tx + 1.2, 1.0, zS + 0.06, 5.3, 0.1, 0.12, { radio: 0.02 });
    base(pint(0x2fc9bd), tx - 3.2, 0, zS + 0.05, 1.3, 2.3, 0.1, { radio: 0.02 }); caja(kit.vidrio(true, 0xffe2a8), tx - 3.2, 1.2, zS + 0.1, 0.95, 1.9, 0.04, { uv: false });
    base(mat('hormigon'), tx - 3.2, 0, zS + 0.6, 1.8, 0.16, 1.1, { radio: 0.03 });
    U.rotulo({ x: tx, y: 4.35, z: zS + 0.15, w: 5.4, h: 1.1, lineas: [{ t: 'TIENDA · REFRESCOS', color: TURQUESA, tam: 0.5, esp: 0.03 }], borde: ROSA, parpadeo: { vel: 9, fase: 0.4, prof: 0.07 } });
    for (const s of [-1, 1]) base(cepillado, tx + s * 2.0, h, zS - 0.5, 0.14, 0.9, 0.14, { radio: 0.02 });
    // marquesina
    const x0 = mx - MW / 2, zS2 = mz + MD / 2, zN2 = mz - MD / 2;
    const blanco = pint(0xf3f3ee, { desgaste: 0.2 }), turq = pint(0x2fc9bd);
    base(blanco, mx, alto - 0.5, mz, MW, 0.5, MD, { radio: 0.05 });
    base(turq, mx, alto - 0.12, mz, MW + 0.3, 0.52, MD + 0.3, { radio: 0.05 });
    for (let i = 0; i < 9; i++) base(i % 2 ? pint(0xff7ac0) : pint(0xf3f3ee), x0 + 0.9 + i * (MW - 1.8) / 8, alto + 0.4, mz, 0.9, 0.04, MD - 0.4, { radio: 0.01, uv: false });
    base(cepillado, mx, alto + 0.42, mz, 2.2, 0.35, 1.5, { radio: 0.04 });
    for (const s of [-1, 1]) caja(kit.emisivo(TURQUESA, 2.8), mx, alto - 0.12 + 0.0, mz + s * (MD / 2 + 0.17), MW + 0.3, 0.08, 0.04, { uv: false, radio: 0.01 });
    for (const s of [-1, 1]) caja(kit.emisivo(ROSA, 2.6), mx + s * (MW / 2 + 0.17), alto - 0.12, mz, 0.04, 0.08, MD + 0.3, { uv: false, radio: 0.01 });
    caja(kit.emisivo(0xdff6ff, 1.6), mx, alto - 0.78, mz, MW - 1, 0.04, MD - 1, { uv: false });
    for (const [px, pz] of [[x0 + 1.6, mz - 2.7], [x0 + 1.6, mz + 2.7], [x0 + MW - 1.6, mz - 2.7], [x0 + MW - 1.6, mz + 2.7]]) {
      A(kit.cilindro(0.33, 0.33, alto - 0.5, 14, 0.04), blanco, M(px, 0, pz)); A(kit.cilindro(0.4, 0.4, 0.3, 14, 0.04), cromo, M(px, 0, pz));
      A(kit.cilindro(0.345, 0.345, 0.06, 14, 0.01), kit.emisivo(TURQUESA, 2.2), M(px, 1.7, pz), { uv: false });
      kit.pilar(px, pz, 0.38, { nombre: 'columna_gasolinera' });
    }
    U.rotulo({ x: mx, y: alto - 0.13, z: zS2 + 0.2, w: 7.0, h: 0.8, lineas: [{ t: 'GASOLINA · ESTRELLA', color: ROSA, tam: 0.56, esp: 0.03 }], borde: null, fondo: '#102a30', px: 120, intensidad: 2.0 });
    // islas
    for (const ix of [-24, -19]) { base(mat('hormigon'), ix, 0, mz, 4.6, 0.17, 1.1, { radio: 0.05 }); for (const s of [-1, 1]) base(pint(0xf0c93a), ix + s * 2.1, 0.17, mz, 0.2, 0.7, 0.2, { radio: 0.06 }); }
    // pilón de precios
    const px = -11.8, pz = 12.6;
    A(kit.cilindro(0.2, 0.2, 7.2, 10, 0.03), cepillado, M(px, 0, pz)); kit.pilar(px, pz, 0.28, { nombre: 'pilon' });
    U.rotulo({ x: px, y: 7.6, z: pz, w: 3.4, h: 2.5, lineas: [{ t: 'SÚPER', color: TURQUESA, tam: 0.2, y: 0.2 }, { t: '0,29', color: ROSA, tam: 0.3, y: 0.46 }, { t: 'EXTRA  0,34', color: TURQUESA, tam: 0.16, y: 0.72 }, { t: 'AGUA · AIRE', color: ROSA, tam: 0.12, y: 0.9 }], borde: ROSA, px: 110 });
    return { puerta: { x: tx - 3.2, z: zS + 1.6 } };
  };

  // ───────────── LAVANDERÍA ─────────────
  E.lavanderia = ({ cx = 30, cz = 22, W = 14, D = 8 }) => {
    const zS = cz + D / 2, h = 3.5;
    base(mat('panel_prefabricado', { color: 0xbdeeea }), cx, 0, cz, W, h, D, { radio: 0.05 });
    base(pint(0xff7ac0), cx, 0, cz, W + 0.1, 0.7, D + 0.1, { radio: 0.04 });
    base(pint(0x2fc9bd), cx, h - 0.35, cz, W + 0.2, 0.35, D + 0.2, { radio: 0.04 });
    base(cepillado, cx, h, cz, W + 0.3, 0.07, D + 0.3, { radio: 0.02 });
    E.techo({ x: cx, z: cz, w: W + 0.3, d: D + 0.3, y: h + 0.06, color: 0xbdeeea, equipos: 4, semilla: 12 });
    base(pint(0x59606a), cx + 3.5, h + 0.2, cz - 1, 2.2, 2.4, 2.2, { radio: 0.1 }); A(kit.cilindro(1.1, 0.2, 0.7, 12, 0.03), oxido, M(cx + 3.5, h + 2.6, cz - 1), { uv: true });
    kit.muro(cx, cz, W, D, 0, { nombre: 'lavanderia' });
    U.ventanal({ tipo: 'lavanderia', x: cx - 3.3, y: 1.85, z: zS + 0.02, w: 5.6, h: 1.7 }); U.ventanal({ tipo: 'lavanderia', x: cx + 3.7, y: 1.85, z: zS + 0.02, w: 5.6, h: 1.7 });
    for (const bx of [cx - 3.3, cx + 3.7]) { for (let i = 0; i <= 4; i++) caja(cromo, bx - 2.8 + i * 1.4, 1.85, zS + 0.06, 0.08, 1.8, 0.1, { radio: 0.015 }); caja(cromo, bx, 2.75, zS + 0.06, 5.7, 0.1, 0.12); caja(cromo, bx, 0.95, zS + 0.06, 5.7, 0.1, 0.12); }
    base(pint(0xf6f1e6), cx + 0.2, 0, zS + 0.05, 1.5, 2.3, 0.1, { radio: 0.02 }); caja(kit.vidrio(true, 0xbff4ff), cx + 0.2, 1.2, zS + 0.1, 1.1, 2.0, 0.04, { uv: false });
    base(mat('hormigon'), cx + 0.2, 0, zS + 0.6, 2.0, 0.16, 1.1, { radio: 0.03 });
    U.rotulo({ x: cx, y: 4.7, z: zS + 0.1, w: 7.6, h: 1.5, lineas: [{ t: 'LAVANDERÍA 24 H', color: ROSA, tam: 0.46, y: 0.4, esp: 0.03 }, { t: 'CAMISAS · SÁBANAS', color: TURQUESA, tam: 0.2, y: 0.78 }], borde: TURQUESA, parpadeo: { vel: 6, fase: 3, prof: 0.1 } });
    for (const s of [-1, 1]) base(cepillado, cx + s * 2.8, h, zS - 0.1, 0.14, 1.0, 0.14, { radio: 0.02 });
    return { puerta: { x: cx + 0.2, z: zS + 1.6 } };
  };

  // ───────────── KIOSCO / CABINA DE PROYECCIÓN ─────────────
  E.kiosco = ({ cx = 3, cz = -30, W = 9, D = 5.5 }) => {
    const zS = cz + D / 2, h = 3.8;
    base(mat('ladrillo_encalado', { color: 0xf6e3b0 }), cx, 0, cz, W, h, D, { radio: 0.05 });
    base(pint(0x2fc9bd), cx, 0, cz, W + 0.1, 0.9, D + 0.1, { radio: 0.04 });
    base(pint(0xff7ac0), cx, h - 0.4, cz, W + 0.2, 0.4, D + 0.2, { radio: 0.04 });
    E.techo({ x: cx, z: cz, w: W + 0.3, d: D + 0.3, y: h + 0.0, color: 0xf6e3b0, equipos: 2, semilla: 21 });
    base(pint(0x39434d), cx - 1.5, h + 0.2, cz - 0.6, 2.6, 1.5, 1.8, { radio: 0.06 });
    A(kit.cilindro(0.25, 0.28, 0.7, 12, 0.02), cromo, M(cx - 1.5, h + 0.75, cz + 0.45, 0, Math.PI / 2 * 0.0).multiply(M(0, 0, 0, 0, -Math.PI / 2)), { uv: false });
    kit.muro(cx, cz, W, D, 0, { nombre: 'kiosco' });
    U.ventanal({ tipo: 'kiosco', x: cx + 0.5, y: 1.95, z: zS + 0.02, w: 6.2, h: 1.5 });
    caja(cromo, cx + 0.5, 1.2, zS + 0.15, 6.4, 0.1, 0.4, { radio: 0.03 }); caja(cromo, cx + 0.5, 2.78, zS + 0.07, 6.4, 0.1, 0.1);
    for (let i = 0; i < 8; i++) base(i % 2 ? pint(0xf6f6f2) : pint(0xff7ac0), cx - W / 2 + (i + 0.5) * W / 8, 2.95, zS + 0.65, W / 8, 0.07, 1.3, { radio: 0.01, uv: false });
    for (const s of [-1, 1]) base(cepillado, cx + s * (W / 2 - 0.2), 0, zS + 1.2, 0.1, 3.0, 0.1, { radio: 0.02 });
    base(pint(0x2fc9bd), cx - 3.7, 0, zS + 0.05, 1.1, 2.2, 0.1, { radio: 0.02 });
    U.rotulo({ x: cx + 0.5, y: 4.2, z: zS + 0.1, w: 6.4, h: 1.1, lineas: [{ t: 'PALOMITAS · REFRESCOS', color: TURQUESA, tam: 0.44, esp: 0.03 }], borde: ROSA, parpadeo: { vel: 8, fase: 5, prof: 0.08 } });
    return { puerta: { x: cx - 3.7, z: zS + 1.4 } };
  };

  // ───────────── TAQUILLA DEL AUTOCINE ─────────────
  E.taquilla = ({ x, z }) => {
    base(pint(0xf6f1e6), x, 0, z, 2.2, 2.5, 2.2, { radio: 0.05 }); base(pint(0x2fc9bd), x, 0, z, 2.3, 0.7, 2.3, { radio: 0.04 });
    base(pint(0xff7ac0), x, 2.6, z, 3.6, 0.14, 3.0, { radio: 0.04 });
    caja(kit.emisivo(0xffe2a8, 1.4), x, 1.55, z + 1.12, 1.3, 0.8, 0.03, { uv: false });
    kit.muro(x, z, 2.2, 2.2, 0, { nombre: 'taquilla' });
    U.rotulo({ x, y: 3.45, z: z + 1.45, w: 2.8, h: 0.7, lineas: [{ t: 'TAQUILLA', color: TURQUESA, tam: 0.56 }], borde: ROSA, px: 140, redondeo: 0.3, dorso: false });
    for (let i = 0; i < 6; i++) base(i % 2 ? pint(0xf6f6f2) : pint(0xd33c4e), x + 3.4 + i * 0.5, 0.9, z + 0.4, 0.5, 0.1, 0.1, { radio: 0.01 });
    base(cepillado, x + 3.0, 0, z + 0.4, 0.14, 1.0, 0.14, { radio: 0.02 });
  };
  return E;
}
