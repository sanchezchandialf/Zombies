// ERA Z · Tierra de Nadie: piezas propias del mapa (sacos terreros, muros en ruinas, tanque destrozado, cruces, erizos…).
// Todo se funde en lotes del kit (una malla por material) y registra su colisión a través del kit.
import * as THREE from 'three';

export function crearPiezas(kit) {
  const M = (n, o) => kit.mat(n, o);
  const L = kit.lote0;
  const mat4 = kit.matriz;
  const mm = (A, x, y, z, ry = 0, rx = 0, rz = 0, e = 1) => new THREE.Matrix4().multiplyMatrices(A, mat4(x, y, z, ry, rx, rz, e));
  const Y0 = -0.1; // las piezas se hunden un poco para no flotar sobre el relieve

  const matSaco = [M('saco_arena', { color: 0xb3a374, desgaste: 0.7 }), M('saco_arena', { color: 0x8c8461, desgaste: 0.8 }), M('saco_arena', { color: 0x9b9a78, desgaste: 0.7 })];
  const matTabla = M('tablas_viejas', { desgaste: 0.6 });
  const matTablon = M('tablones', { desgaste: 0.7 });
  const matHierro = M('hierro_oxidado');
  const matForja = M('hierro_forjado');

  /** Dibuja una pieza de caja con una matriz de colocación. */
  const cajaM = (mat, A, lx, ly, lz, w, h, d, o = {}) => L.anadir(kit.cajaRedondeada(w, h, d, o.radio ?? 0.04, o.seg ?? 1), mat, mm(A, lx, ly, lz, o.ry ?? 0, o.rx ?? 0, o.rz ?? 0), { uv: o.uv });

  // ───────────── sacos terreros ─────────────
  /**
   * Parapeto de sacos entre a y b (de oeste a este). lado = ±1: cara que lleva el revestimiento de tablas (+1 = +Z local).
   * Registra una valla baja (frena a zombis y jugadores, no a las balas).
   */
  function sacos(a, b, o = {}) {
    const [x1, z1] = a, [x2, z2] = b;
    const dx = x2 - x1, dz = z2 - z1, largo = Math.hypot(dx, dz), ry = Math.atan2(-dz, dx);
    const cx = (x1 + x2) / 2, cz = (z1 + z2) / 2;
    const gr = o.grosor ?? 0.9, rng = kit.rng((o.semilla ?? 1) * 17 + Math.floor(cx * 3 + cz * 5));
    const A = mat4(cx, 0, cz, ry);
    const trozos = Math.max(1, Math.round(largo / 2.3));
    const tl = largo / trozos;
    for (let i = 0; i < trozos; i++) {
      const u = -largo / 2 + tl * (i + 0.5);
      const ms = matSaco[(i + Math.floor(cx)) % 3 < 0 ? 0 : (i + Math.floor(Math.abs(cx))) % 3];
      const jy = rng.rango(-0.03, 0.03);
      cajaM(ms, A, u, Y0 + 0.37, 0, tl + 0.05, 0.75, gr, { ry: jy, radio: 0.16, seg: 2 });
      cajaM(ms, A, u + rng.rango(-0.08, 0.08), 0.62 + 0.25, rng.rango(-0.04, 0.04), tl - 0.1, 0.5, gr * 0.74, { ry: -jy * 1.5, radio: 0.15, seg: 2 });
    }
    // sacos sueltos en la cresta, desiguales
    const n = Math.floor(largo / 0.72);
    for (let i = 0; i < n; i++) {
      const u = -largo / 2 + (i + 0.5) * (largo / n);
      if (rng() < 0.12) continue;
      cajaM(matSaco[i % 3], A, u, 1.2 + rng.rango(-0.02, 0.04), rng.rango(-0.08, 0.08), 0.62, 0.26, gr * 0.52, { ry: rng.rango(-0.35, 0.35), radio: 0.11, seg: 1 });
    }
    // revestimiento de tablas con postes y larguero
    if (o.lado) {
      const s = o.lado, zc = s * (gr / 2 + 0.06);
      const paneles = Math.max(1, Math.round(largo / 1.25)), pl = largo / paneles;
      for (let i = 0; i < paneles; i++) {
        const u = -largo / 2 + pl * (i + 0.5);
        cajaM(matTabla, A, u, 0.5 + Y0 * 0 , zc, pl - 0.04, 1.0, 0.07, { radio: 0.015 });
      }
      for (let i = 0; i <= paneles; i++) {
        const u = -largo / 2 + pl * i;
        cajaM(matTabla, A, u, 0.66, s * (gr / 2 + 0.13), 0.14, 1.5, 0.14, { radio: 0.02, uv: 'tablas_viejas' });
      }
      cajaM(matTabla, A, 0, 1.28, s * (gr / 2 + 0.13), largo, 0.1, 0.12, { radio: 0.015 });
    }
    kit.vallaBaja(cx, cz, largo, ry, { ancho: gr, nombre: 'parapeto' });
  }

  /** Dos parapetos paralelos con varios tramos y huecos: tramos = [[x0,x1],…]. */
  function lineaSacos(z, tramos, o = {}) {
    for (const [x0, x1] of tramos) sacos([x0, z], [x1, z], o);
  }

  /** Nido de ametralladora en herradura: centro, orientación (0 = abierto hacia -Z, es decir al norte). */
  function nido(x, z, o = {}) {
    const ry = o.rot ?? 0, c = Math.cos(ry), s = Math.sin(ry);
    const W = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    // trasera (a +Z local) y dos flancos
    const at = (p, q) => sacos(W(p[0], p[1]), W(q[0], q[1]), { grosor: 0.8, semilla: o.semilla ?? 3 });
    // orientamos de oeste a este en mundo: ordenar por x
    const seg = (p, q) => { const A = W(...p), B = W(...q); (A[0] <= B[0]) ? sacos(A, B, { grosor: 0.8, semilla: o.semilla ?? 3 }) : sacos(B, A, { grosor: 0.8, semilla: o.semilla ?? 3 }); };
    void at;
    seg([-1.9, 1.3], [1.9, 1.3]);
    seg([-1.9, -1.5], [-1.9, 1.3]);
    seg([1.9, -1.5], [1.9, 1.3]);
  }

  // ───────────── muros en ruinas ─────────────
  /**
   * Muro recto en ruinas, alineado a un eje. perfil = [[u0,u1,alto],…] (alto ≤ 0 = hueco); huecos = ventanas [{u0,u1,y0,y1}].
   * Si z0 === z1 el muro corre a lo largo de X; si x0 === x1, a lo largo de Z. Genera colisión por tramo continuo.
   */
  function muroRuina(x0, z0, x1, z1, o) {
    const alongX = Math.abs(z1 - z0) < 1e-6;
    const gr = o.grosor ?? 0.6, perfil = o.perfil, huecos = o.huecos ?? [];
    const mat = o.mat, rng = kit.rng((o.semilla ?? 1) * 31 + Math.floor(x0 * 7 + z0 * 3));
    const fijo = alongX ? z0 : x0;
    const pos = (u0, u1, y0, y1, extra = 0) => {
      const w = u1 - u0, h = y1 - y0, cu = (u0 + u1) / 2;
      if (alongX) L.anadir(kit.cajaRedondeada(w, h, gr + extra, 0.05, 1), mat, mat4(cu, y0 + h / 2, fijo), { uv: o.uv });
      else L.anadir(kit.cajaRedondeada(gr + extra, h, w, 0.05, 1), mat, mat4(fijo, y0 + h / 2, cu), { uv: o.uv });
    };
    const cortes = new Set();
    for (const [a, b] of perfil) { cortes.add(a); cortes.add(b); }
    for (const h of huecos) { cortes.add(h.u0); cortes.add(h.u1); }
    const cs = [...cortes].sort((p, q) => p - q);
    const altoEn = (m) => { for (const [a, b, h] of perfil) if (m >= a && m <= b) return h; return 0; };
    for (let i = 0; i + 1 < cs.length; i++) {
      const a = cs[i], b = cs[i + 1], m = (a + b) / 2, h = altoEn(m);
      if (h <= 0.1 || b - a < 0.05) continue;
      const hu = huecos.find((q) => m > q.u0 && m < q.u1);
      if (hu) {
        if (hu.y0 > 0.1) pos(a, b, Y0, hu.y0);
        if (h > hu.y1 + 0.05) pos(a, b, hu.y1, h);
      } else {
        pos(a, b, Y0, h);
        // dientes irregulares en la coronación rota
        if (o.dientes !== false && b - a > 0.8) {
          const n = 1 + Math.floor(rng() * 3);
          for (let k = 0; k < n; k++) {
            const w = rng.rango(0.25, 0.7), hh = rng.rango(0.2, 0.75), u = rng.rango(a + w / 2, b - w / 2);
            pos(u - w / 2, u + w / 2, h - 0.04, h + hh, -rng.rango(0.05, 0.25));
          }
        }
      }
    }
    // colisión: tramos continuos con alto > 0
    let ini = null, fin = null;
    const emite = () => {
      if (ini == null) return;
      const l = fin - ini, cu = (ini + fin) / 2;
      if (alongX) kit.muro(cu, fijo, l, gr, 0, { material: 'ladrillo', nombre: 'muro_ruina' });
      else kit.muro(fijo, cu, gr, l, 0, { material: 'ladrillo', nombre: 'muro_ruina' });
      ini = fin = null;
    };
    const lista = perfil.filter((p) => p[2] > 0.1).sort((p, q) => p[0] - q[0]);
    for (const [a, b] of lista) { if (ini != null && Math.abs(a - fin) < 0.05) fin = b; else { emite(); ini = a; fin = b; } }
    emite();
  }

  // ───────────── cruces de tumba y cascos ─────────────
  function tumbas(lista) {
    const mc = M('tablas_viejas', { desgaste: 0.8 }), mCasco = M('acero_pintado', { color: 0x59603f, desgaste: 0.85 });
    const geoCasco = new THREE.SphereGeometry(0.19, 10, 6, 0, Math.PI * 2, 0, Math.PI * 0.55);
    const montones = [];
    for (const t of lista) {
      const A = mat4(t.x, 0, t.z, t.rot ?? 0, 0, t.incl ?? 0);
      L.anadir(kit.cajaRedondeada(0.09, 1.05, 0.05, 0.012, 1), mc, mm(A, 0, 0.45, 0, 0, 0, 0), { uv: 'tablas_viejas' });
      L.anadir(kit.cajaRedondeada(0.55, 0.09, 0.05, 0.012, 1), mc, mm(A, 0, 0.78, 0, 0, 0, 0), { uv: 'tablas_viejas' });
      montones.push({ x: t.x + Math.sin(t.rot ?? 0) * 0.0, z: t.z + 0.55, rot: t.rot ?? 0 });
      if (t.casco) L.anadir(geoCasco, mCasco, mm(A, 0.0, 0.96, 0.02, 0, 0.1, 0), { uv: false });
    }
    // túmulos de tierra (montones bajos)
    const mb = M('barro', { desgaste: 0.5 });
    for (const m of montones) L.anadir(kit.cajaRedondeada(0.75, 0.2, 1.5, 0.09, 2), mb, mat4(m.x, 0.04, m.z, m.rot * 0.2));
  }

  // ───────────── erizos checos (obstáculo de acero) ─────────────
  function erizo(x, z, rot = 0) {
    const A = mat4(x, 0, z, rot);
    const mH = M('hierro_forjado', { desgaste: 0.8 });
    cajaM(mH, A, 0, 0.62, 0, 1.75, 0.13, 0.13, { rz: Math.PI / 4, radio: 0.02 });
    cajaM(mH, A, 0, 0.62, 0, 1.75, 0.13, 0.13, { rz: -Math.PI / 4, radio: 0.02 });
    cajaM(mH, A, 0, 0.62, 0, 0.13, 0.13, 1.75, { rx: Math.PI / 4, radio: 0.02 });
    cajaM(M('hierro_oxidado'), A, 0, 0.1, 0, 0.4, 0.1, 0.4, { radio: 0.02 });
    kit.pilar(x, z, 0.55, { bloqueaBalas: false, nombre: 'erizo' });
  }

  // ───────────── cartel de peligro (campo de minas) ─────────────
  function cartelMinas(x, z, rot = 0) {
    const A = mat4(x, 0, z, rot);
    cajaM(matTabla, A, 0, 0.7, 0, 0.1, 1.4, 0.1, { radio: 0.02, uv: 'tablas_viejas' });
    cajaM(M('rayas_peligro', { desgaste: 0.7 }), A, 0, 1.25, 0.07, 0.8, 0.5, 0.05, { radio: 0.02 });
  }

  // ───────────── caballete con rollo de alambre ─────────────
  function rolloAlambre(x, z, rot = 0, r = 0.5) {
    const g = new THREE.TorusGeometry(r, 0.035, 5, 18);
    const mH = matForja;
    for (let i = 0; i < 4; i++) L.anadir(g, mH, mat4(x, 0.3 + i * 0.12, z, rot + i * 0.4, Math.PI / 2 + (i % 2 ? 0.25 : -0.2), 0), { uv: false });
  }

  // ───────────── poste de telégrafo caído ─────────────
  function posteCaido(x, z, rot, largo = 7) {
    const A = mat4(x, 0.17, z, rot, Math.PI / 2, 0);
    const mp = M('tablas_viejas', { color: 0x6a5a48, desgaste: 0.8 });
    L.anadir(kit.cilindro(0.15, 0.1, largo, 10, 0.02), mp, A, { uv: 'tablas_viejas' });
    const B = mat4(x, 0.17, z, rot);
    const mAisl = M('cristal', { color: 0x4d8b6a });
    const brazo = (u, w) => {
      const P = mm(B, 0, 0.1, u, 0);
      L.anadir(kit.cajaRedondeada(w, 0.1, 0.1, 0.02, 1), mp, P, { uv: 'tablas_viejas' });
      for (const s of [-0.42, 0.42]) L.anadir(kit.cilindro(0.045, 0.03, 0.16, 8, 0.01), mAisl, mm(P, s * w, 0.05, 0));
    };
    brazo(largo - 0.5, 1.8); brazo(largo - 1.2, 1.4);
  }

  // ───────────── tanque destrozado ─────────────
  function tanque(x, z, rot) {
    const A = mat4(x, 0, z, rot);
    const casco = M('acero_pintado', { color: 0x535a3e, desgaste: 0.9 });
    const cascoQ = M('acero_pintado', { color: 0x2c2a24, desgaste: 1 });
    const orugas = M('hierro_oxidado', { desgaste: 0.9 });
    const goma = M('goma', { color: 0x22211d });
    const ascua = kit.emisivo(0xff5a18, 2.2);
    // casco inferior y glacis
    cajaM(casco, A, 0, 0.95, 0, 6.2, 0.95, 2.5, { radio: 0.1, seg: 2 });
    cajaM(casco, A, 3.15, 0.95, 0, 1.4, 0.75, 2.4, { radio: 0.1, seg: 2, rz: -0.55 });   // proa inclinada
    cajaM(casco, A, -3.1, 1.0, 0, 0.5, 1.0, 2.5, { radio: 0.08, seg: 2 });
    cajaM(casco, A, 0.5, 1.6, 0, 4.9, 0.55, 2.3, { radio: 0.09, seg: 2 });                 // superestructura
    cajaM(casco, A, -2.1, 1.65, 0, 0.9, 0.35, 2.1, { radio: 0.06, seg: 1 });
    // orugas: bandas y ruedas
    for (const s of [-1, 1]) {
      cajaM(orugas, A, 0, 0.55, s * 1.4, 6.6, 0.75, 0.62, { radio: 0.3, seg: 3, uv: 'hierro_oxidado' });
      for (let i = 0; i < 7; i++) {
        const gx = -2.7 + i * 0.9;
        L.anadir(kit.cilindro(0.34, 0.34, 0.1, 14, 0.02), goma, mm(A, gx, 0.35, s * 1.76, 0, Math.PI / 2, 0), { uv: false });
      }
      cajaM(casco, A, 0, 1.17, s * 1.5, 6.4, 0.1, 0.9, { radio: 0.03, seg: 1 });             // guardabarros
    }
    // oruga reventada: eslabones sueltos
    for (let i = 0; i < 6; i++) cajaM(orugas, A, 3.7 + i * 0.35, 0.05 + (i % 2) * 0.03, 1.6 + i * 0.38, 0.32, 0.06, 0.38, { ry: 0.3 + i * 0.25, radio: 0.015 });
    // torreta arrancada y ladeada
    const T = mm(A, -0.4, 2.0, 0.1, 0.2, 0.0, 0.16);
    L.anadir(kit.cilindro(1.25, 1.1, 0.75, 20, 0.05), casco, T, { uv: 'acero_pintado' });
    L.anadir(kit.cilindro(0.55, 0.55, 0.28, 14, 0.04), casco, mm(T, 0.35, 0.74, 0.1), { uv: 'acero_pintado' });
    L.anadir(kit.cilindro(0.3, 0.3, 0.1, 12, 0.02), cascoQ, mm(T, 0.35, 0.99, 0.1), { uv: false });   // escotilla abierta
    // cañón caído hacia el suelo
    const C = mm(T, 1.0, 0.4, 0, 0, 0, -Math.PI / 2 + 0.2);
    L.anadir(kit.cilindro(0.14, 0.11, 3.4, 10, 0.02), cascoQ, C, { uv: 'hierro_forjado' });
    L.anadir(kit.cilindro(0.2, 0.2, 0.3, 10, 0.02), cascoQ, mm(C, 0, 3.3, 0), { uv: 'hierro_forjado' });
    // boquete de impacto con interior ardiendo
    cajaM(cascoQ, A, 0.6, 1.0, 1.28, 1.5, 0.7, 0.1, { radio: 0.04, seg: 1 });
    cajaM(ascua, A, 0.6, 1.0, 1.34, 1.0, 0.3, 0.06, { radio: 0.03, seg: 1 });
    cajaM(ascua, A, 0.3, 1.9, 0.2, 0.9, 0.12, 0.5, { radio: 0.03, seg: 1 });
    // cajas de munición y rollo de lona sobre el casco trasero
    cajaM(M('lona', { color: 0x5b5f40, desgaste: 0.8 }), A, -2.3, 2.0, -0.5, 1.2, 0.3, 0.9, { radio: 0.12, seg: 2, ry: 0.3 });
    kit.muro(x, z, 6.9, 3.5, rot, { material: 'metal', nombre: 'tanque' });
  }

  return { sacos, lineaSacos, nido, muroRuina, tumbas, erizo, cartelMinas, rolloAlambre, posteCaido, tanque, cajaM, mm, Y0 };
}
