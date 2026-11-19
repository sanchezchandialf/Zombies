// ERA Z · Zona de Cuarentena 7 · Constructores de props (vehículos, carpas, torres, contenedores…). Todo va a lotes fusionados.
import * as THREE from 'three';

const mul = (a, b) => new THREE.Matrix4().multiplyMatrices(a, b);

export function crearProps(kit) {
  const mat = (n, o) => kit.mat(n, o);
  const mx = kit.matriz;
  const L0 = kit.lote0;
  const caja = kit.cajaRedondeada;

  // ─── materiales de la paleta (azul clínico · rojo de emergencia · focos blancos · cristal) ───
  const M = {
    hormigon: mat('hormigon', { color: 0xb4b9bd }),
    hormigonOsc: mat('hormigon', { color: 0x7d858c }),
    pintBlanca: mat('hormigon', { color: 0xe9ecee }),
    pintAmarilla: mat('hormigon', { color: 0xe3b81c }),
    acero: mat('acero_cepillado'),
    hierro: mat('hierro_forjado'),
    oxido: mat('hierro_oxidado'),
    goma: mat('goma', { color: 0x1d1f21 }),
    lonaBlanca: mat('yeso', { color: 0xf1f5f8 }),
    lonaTecho: mat('yeso', { color: 0xdbe6ee }),
    lonaAzul: mat('lona', { color: 0x2c77b8 }),
    lonaVerde: mat('lona', { color: 0x5d6a4e }),
    lonaNegra: mat('lona', { color: 0x1c2024 }),
    sacos: mat('saco_arena'),
    rayas: mat('rayas_peligro'),
    vidrio: kit.vidrio(false),
    cristal: mat('cristal', { color: 0x9fd0e8 }),
    prefab: mat('panel_prefabricado', { color: 0xaab5be }),
    placa: mat('placa_antideslizante', { color: 0x66727c }),
    rejilla: mat('rejilla', { color: 0x59646d }),
    verde: mat('acero_pintado', { color: 0x3f4d3a }),
    bomberoRojo: mat('acero_pintado', { color: 0xb3262b }),
    azulMetal: mat('acero_pintado', { color: 0x2d5f95 }),
    cremaMetal: mat('acero_pintado', { color: 0xd9dde0 }),
    emBlanco: kit.emisivo(0xfff6e8, 4.2),
    emFrio: kit.emisivo(0xcfe8ff, 3.2),
    emAzul: kit.emisivo(0x7cc8ff, 2.2),
    emRojo: kit.emisivo(0xff3030, 3.0),
    emAmbar: kit.emisivo(0xffa530, 2.6),
    emVerde: kit.emisivo(0x5dffa0, 2.4),
    emPantalla: kit.emisivo(0x9fe0ff, 2.0),
  };
  // Baliza roja de emergencia: material propio animado desde actualizar()
  const baliza = new THREE.MeshStandardMaterial({ color: 0x2a0606, emissive: new THREE.Color(0xff2418), emissiveIntensity: 2.4, roughness: 0.3 });
  baliza.name = 'baliza'; kit._propios.push(baliza);
  const balizaAzul = new THREE.MeshStandardMaterial({ color: 0x06101f, emissive: new THREE.Color(0x3a8cff), emissiveIntensity: 2.4, roughness: 0.3 });
  balizaAzul.name = 'baliza_azul'; kit._propios.push(balizaAzul);
  M.baliza = baliza; M.balizaAzul = balizaAzul;

  const cont = {
    azul: mat('chapa_ondulada', { color: 0x2c5a8a }), gris: mat('chapa_ondulada', { color: 0x7d8a86 }),
    rojo: mat('chapa_ondulada', { color: 0x9c3028 }), blanco: mat('chapa_ondulada', { color: 0xcdd3d6 }), verde: mat('chapa_ondulada', { color: 0x56654f }),
  };
  const PINT = {
    blanco: mat('acero_pintado', { color: 0xb4bec4 }), plata: mat('acero_pintado', { color: 0x9aa4ab }), azul: mat('acero_pintado', { color: 0x2b4f7e }),
    negro: mat('acero_pintado', { color: 0x2a2e33 }), taxi: mat('acero_pintado', { color: 0xd6a416 }), verdeOsc: mat('acero_pintado', { color: 0x38503f }),
    rojo: mat('acero_pintado', { color: 0x8c2328 }), militar: mat('acero_pintado', { color: 0x55614a }),
  };

  // Pieza con transformación raíz
  const F = (root, lote = L0) => ({
    caja: (m, x, y, z, w, h, d, o = {}) => lote.anadir(caja(w, h, d, o.radio ?? 0.03, o.seg ?? 1), m, mul(root, mx(x, y, z, o.rotY || 0, o.rotX || 0, o.rotZ || 0)), o.uv !== undefined ? { uv: o.uv } : {}),
    geo: (g, m, x, y, z, o = {}) => lote.anadir(g, m, mul(root, mx(x, y, z, o.rotY || 0, o.rotX || 0, o.rotZ || 0, o.esc ?? 1)), o.uv !== undefined ? { uv: o.uv } : {}),
    cil: (m, x, y, z, r1, r2, h, o = {}) => lote.anadir(kit.cilindro(r1, r2, h, o.seg ?? 12, o.bisel ?? 0.015), m, mul(root, mx(x, y, z, o.rotY || 0, o.rotX || 0, o.rotZ || 0)), o.uv !== undefined ? { uv: o.uv } : {}),
  });
  const esfera = (() => { let g = null; return () => { if (!g) { g = new THREE.IcosahedronGeometry(1, 3); g.deleteAttribute('uv'); } return g; }; })();

  const P = {};
  P.M = M; P.PINT = PINT; P.cont = cont; P.F = F;

  // ═════════ COCHES ═════════
  /** Coche abandonado. tipo: 'berlina'|'suv'|'furgon'|'ambulancia'|'policia'. rot=0 → morro hacia +X local (se gira con rot). */
  P.coche = ({ x, z, rot = 0, color = 'blanco', tipo = 'berlina', inclina = 0, puerta = false, quemado = false, colision = true }) => {
    const f = F(mx(x, 0, z, rot, 0, inclina));
    const pm = quemado ? mat('hierro_oxidado', { color: 0x3a342f }) : PINT[color] ?? PINT.blanco;
    const Lg = tipo === 'furgon' || tipo === 'ambulancia' ? 5.3 : tipo === 'suv' ? 4.7 : 4.4, A = tipo === 'suv' ? 1.95 : 1.85;
    if (tipo === 'furgon' || tipo === 'ambulancia') {
      const col = tipo === 'ambulancia' ? PINT.blanco : pm;
      f.caja(col, 0, 1.25, 0, Lg, 1.9, A, { radio: 0.2, seg: 2 });
      f.caja(M.goma, 0, 0.4, 0, Lg + 0.1, 0.4, A + 0.06, { radio: 0.08 });
      f.caja(M.vidrio, Lg / 2 - 0.02, 1.62, 0, 0.06, 0.78, A - 0.28, { radio: 0.02 });
      f.caja(M.vidrio, 0.2, 1.7, A / 2 + 0.01, 1.4, 0.7, 0.04, { radio: 0.02 }); f.caja(M.vidrio, 0.2, 1.7, -A / 2 - 0.01, 1.4, 0.7, 0.04, { radio: 0.02 });
      if (tipo === 'ambulancia') {
        f.caja(M.bomberoRojo, 0, 1.0, A / 2 + 0.012, Lg - 0.4, 0.26, 0.02); f.caja(M.bomberoRojo, 0, 1.0, -A / 2 - 0.012, Lg - 0.4, 0.26, 0.02);
        f.caja(M.bomberoRojo, -0.8, 1.55, A / 2 + 0.014, 0.95, 0.28, 0.02); f.caja(M.bomberoRojo, -0.95, 1.55, A / 2 + 0.016, 0.28, 0.95, 0.02);
        f.caja(M.bomberoRojo, -0.8, 1.55, -A / 2 - 0.014, 0.95, 0.28, 0.02); f.caja(M.bomberoRojo, -0.95, 1.55, -A / 2 - 0.016, 0.28, 0.95, 0.02);
        f.caja(M.baliza, 1.1, 2.28, 0.5, 0.3, 0.14, 0.5, { radio: 0.04 }); f.caja(M.balizaAzul, 1.1, 2.28, -0.5, 0.3, 0.14, 0.5, { radio: 0.04 });
        f.caja(M.acero, 1.1, 2.2, 0, 0.36, 0.06, 1.7, { radio: 0.02 });
      }
    } else {
      const sub = tipo === 'suv' ? 0.62 : 0.5;
      f.caja(pm, 0, 0.62, 0, Lg, 0.66, A, { radio: 0.17, seg: 2 });                                      // carrocería baja
      f.caja(pm, Lg * 0.28, 0.98, 0, Lg * 0.34, 0.1, A - 0.12, { radio: 0.04 });                          // capó
      f.caja(M.vidrio, -0.18, 1.18, 0, tipo === 'suv' ? 2.7 : 2.25, sub, A - 0.2, { radio: 0.14, seg: 2 }); // habitáculo (cristal)
      f.caja(pm, -0.18, 1.18 + sub / 2, 0, (tipo === 'suv' ? 2.5 : 2.05), 0.07, A - 0.3, { radio: 0.03 }); // techo
      for (const s of [-1, 1]) for (const px of [-1.15, -0.1, 0.95]) if (tipo === 'suv' || px !== -1.15) f.caja(pm, px + (tipo === 'suv' ? -0.2 : 0), 1.18, s * (A / 2 - 0.1), 0.07, sub, 0.09, { radio: 0.02 }); // montantes
      f.caja(M.goma, Lg / 2 - 0.05, 0.4, 0, 0.14, 0.2, A - 0.1, { radio: 0.05 }); f.caja(M.goma, -Lg / 2 + 0.05, 0.4, 0, 0.14, 0.2, A - 0.1, { radio: 0.05 });
      if (tipo === 'policia') {
        f.caja(M.lonaNegra, 0, 0.62, 0, Lg + 0.01, 0.2, A + 0.01, { radio: 0.02 }); f.caja(M.cremaMetal, 0.6, 0.98, 0, 0.9, 0.1, A - 0.12);
        f.caja(M.baliza, -0.15, 1.58, 0.35, 0.28, 0.1, 0.5, { radio: 0.03 }); f.caja(M.balizaAzul, -0.15, 1.58, -0.35, 0.28, 0.1, 0.5, { radio: 0.03 });
      }
    }
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const wx = sx * (Lg / 2 - 0.82);
      f.cil(M.goma, wx, 0.36, sz * (A / 2 - 0.14) - 0.13, 0.36, 0.36, 0.26, { rotX: Math.PI / 2, seg: 14, bisel: 0.04 });
    }
    // faros
    const encendido = !quemado && color !== 'negro';
    for (const s of [-1, 1]) {
      f.caja(encendido && Math.abs(inclina) < 0.01 ? M.emFrio : M.vidrio, Lg / 2 + 0.005, 0.66, s * (A / 2 - 0.25), 0.04, 0.14, 0.3, { radio: 0.015 });
      f.caja(M.emRojo, -Lg / 2 - 0.005, 0.7, s * (A / 2 - 0.25), 0.04, 0.12, 0.3, { radio: 0.015 });
    }
    if (puerta) f.caja(pm, 0.35, 0.95, A / 2 + 0.32, 1.1, 0.7, 0.05, { rotY: -0.95, radio: 0.02 });
    if (colision) kit.muro(x, z, Lg + 0.1, A + 0.1, rot, { nombre: 'coche', bloqueaBalas: true, material: 'metal' });
    return { x, z, rot };
  };

  // ═════════ AUTOBÚS VOLCADO ═════════
  P.autobus = ({ x, z, rot = 0 }) => {
    const f = F(mx(x, 0, z, rot));
    f.caja(PINT.blanco, 0, 1.25, 0, 10.4, 2.5, 2.9, { radio: 0.26, seg: 2 });
    f.caja(M.azulMetal, 0, 1.25, 1.455, 10.2, 0.5, 0.03, { radio: 0.01 });          // franja del flanco (la que mira al sur)
    f.caja(M.azulMetal, 0, 1.25, 1.46, 10.2, 0.1, 0.03, { radio: 0.01 });
    for (let i = 0; i < 7; i++) f.caja(M.vidrio, -4.0 + i * 1.25, 2.51, 0.28, 1.05, 0.03, 1.15, { radio: 0.02 });     // ventanas (ahora miran al cielo)
    f.caja(M.vidrio, 4.3, 2.51, 0.28, 0.5, 0.03, 1.15, { radio: 0.02 });
    f.caja(M.pintBlanca, 1.8, 2.52, -0.95, 1.3, 0.04, 0.25, { radio: 0.01 });
    f.caja(M.vidrio, 5.21, 1.25, 0.55, 0.03, 2.1, 1.15, { radio: 0.02 });           // parabrisas
    f.caja(M.acero, -0.8, 1.25, 1.52, 1.5, 0.3, 0.9, { radio: 0.1 });               // aire acondicionado
    f.caja(M.emAmbar, 5.22, 1.25, 1.2, 0.04, 1.4, 0.1, { radio: 0.01 });            // rótulo de destino
    f.caja(M.emRojo, -5.22, 0.45, 0.9, 0.04, 0.3, 0.3, { radio: 0.01 }); f.caja(M.emRojo, -5.22, 2.05, 0.9, 0.04, 0.3, 0.3, { radio: 0.01 });
    for (const px of [-3.3, 3.2]) for (const py of [0.55, 1.95]) f.cil(M.goma, px, py, -1.2, 0.55, 0.55, 0.36, { rotX: Math.PI / 2, seg: 16, bisel: 0.06 });
    f.caja(M.hierro, 0, 1.25, -1.5, 10.0, 0.2, 0.16);                               // bajos
    f.caja(PINT.negro, 5.17, 0.35, -0.2, 0.2, 0.3, 2.3, { radio: 0.06 });
    kit.muro(x, z, 10.6, 3.0, rot, { nombre: 'autobus', bloqueaBalas: true, material: 'metal' });
  };

  // ═════════ CONTENEDORES ═════════
  P.contenedor = ({ x, z, rot = 0, color = 'azul', apilado = false, y = 0, colision = true, puertaAbierta = false }) => {
    const f = F(mx(x, y, z, rot)), m = cont[color] ?? cont.azul;
    const Lc = 6.1, H = 2.6, A = 2.44;
    f.caja(m, 0, H / 2, 0, Lc, H, A, { radio: 0.035, seg: 1 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const sy of [0.05, H - 0.05]) f.caja(M.hierro, sx * (Lc / 2 - 0.09), sy, sz * (A / 2 - 0.09), 0.18, 0.1, 0.18, { radio: 0.015 });
    for (const sz of [-1, 1]) { f.caja(M.hierro, 0, 0.1, sz * (A / 2 + 0.005), Lc, 0.2, 0.03, { radio: 0.01 }); f.caja(M.hierro, 0, H - 0.1, sz * (A / 2 + 0.005), Lc, 0.2, 0.03, { radio: 0.01 }); }
    for (const dz of [-0.55, -0.18, 0.18, 0.55]) f.cil(M.acero, Lc / 2 + 0.05, 0, dz, 0.022, 0.022, H - 0.3, { seg: 6, bisel: 0.004 });
    f.caja(M.hierro, Lc / 2 + 0.01, H / 2, 0, 0.03, H - 0.2, 0.03, { radio: 0.005 });
    f.caja(M.pintBlanca, -1.4, H * 0.62, A / 2 + 0.012, 1.2, 0.28, 0.01, { radio: 0.004 });
    if (colision) kit.muro(x, z, Lc, A, rot, { nombre: 'contenedor', bloqueaBalas: true, material: 'metal' });
  };

  // ═════════ CARPAS DE CAMPAÑA ═════════
  /** Carpa médica/militar: ancho w (X), fondo d (Z), puerta en la cara sur. */
  P.carpa = ({ x, z, w = 14, d = 7, rot = 0, tipo = 'medica', puertas = [-0.25], cruz = true, azul = true }) => {
    const root = mx(x, 0, z, rot), f = F(root);
    const med = tipo === 'medica';
    const mW = med ? M.lonaBlanca : M.lonaVerde, mR = med ? M.lonaTecho : mat('lona', { color: 0x4c5842 });
    const h = 2.25, rise = 1.7, al = 0.5;
    f.caja(mW, 0, h / 2, 0, w, h, d, { radio: 0.05, seg: 1 });
    // faldón del techo
    f.geo(kit.tejadoDosAguas(w + al * 2, d + al * 2, rise), mR, 0, h, 0, { uv: 'lona' });
    f.caja(mR, 0, h + 0.03, (d + al * 2) / 2 - 0.02, w + al * 2 + 0.05, 0.18, 0.06, { radio: 0.02 });
    f.caja(mR, 0, h + 0.03, -(d + al * 2) / 2 + 0.02, w + al * 2 + 0.05, 0.18, 0.06, { radio: 0.02 });
    // franja azul y estructura de aluminio
    if (med && azul) for (const sz of [-1, 1]) f.caja(M.lonaAzul, 0, h - 0.18, sz * (d / 2 + 0.012), w + 0.04, 0.34, 0.03, { radio: 0.01 });
    if (med && azul) for (const sx of [-1, 1]) f.caja(M.lonaAzul, sx * (w / 2 + 0.012), h - 0.18, 0, 0.03, 0.34, d + 0.04, { radio: 0.01 });
    const nx = Math.round(w / 3.5);
    for (let i = 0; i <= nx; i++) for (const sz of [-1, 1]) f.caja(M.acero, -w / 2 + (w / nx) * i, h / 2, sz * (d / 2 + 0.04), 0.1, h, 0.08, { radio: 0.02 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.caja(M.acero, sx * (w / 2 + 0.04), h / 2, sz * (d / 2 + 0.04), 0.12, h + 0.1, 0.12, { radio: 0.02 });
    // puertas: hueco iluminado + faldones + toldo
    for (const u of puertas) {
      const cx = u * w;
      f.caja(M.lonaNegra, cx, 1.05, d / 2 + 0.02, 2.0, 2.1, 0.03, { radio: 0.01 });
      f.caja(med ? M.emAzul : M.emAmbar, cx, 1.05, d / 2 + 0.045, 1.6, 1.8, 0.015, { radio: 0.005 });
      f.caja(mW, cx - 1.18, 1.0, d / 2 + 0.16, 0.5, 2.1, 0.06, { rotY: 0.35, radio: 0.02 }); f.caja(mW, cx + 1.18, 1.0, d / 2 + 0.16, 0.5, 2.1, 0.06, { rotY: -0.35, radio: 0.02 });
      // toldo
      f.caja(mR, cx, 2.3, d / 2 + 1.1, 3.4, 0.07, 2.2, { rotX: 0.12, radio: 0.02 });
      for (const sx of [-1, 1]) f.caja(M.acero, cx + sx * 1.6, 1.15, d / 2 + 2.05, 0.07, 2.25, 0.07, { radio: 0.015 });
    }
    // ventanas iluminadas
    if (med) for (let i = 0; i < nx; i++) {
      const cx = -w / 2 + (w / nx) * (i + 0.5);
      if (puertas.some((u) => Math.abs(u * w - cx) < 1.9)) continue;
      f.caja(M.emAzul, cx, 1.35, d / 2 + 0.02, 1.2, 0.7, 0.02, { radio: 0.01 }); f.caja(M.acero, cx, 1.35, d / 2 + 0.03, 1.28, 0.78, 0.01, { radio: 0.01 });
      f.caja(M.emAzul, cx, 1.35, -d / 2 - 0.02, 1.2, 0.7, 0.02, { radio: 0.01 });
    }
    // cruz roja en el faldón sur del tejado
    if (med && cruz) {
      const run = (d + al * 2) / 2, ang = Math.atan2(rise, run), len = Math.hypot(run, rise);
      const fs = F(mul(root, mx(0, h + rise / 2, run / 2, 0, ang, 0)));
      fs.caja(M.pintBlanca, 0, 0.02, 0, 2.5, 0.025, 2.5, { radio: 0.005 });
      fs.caja(M.bomberoRojo, 0, 0.045, 0, 2.0, 0.03, 0.62, { radio: 0.006 }); fs.caja(M.bomberoRojo, 0, 0.046, 0, 0.62, 0.03, 2.0, { radio: 0.006 });
      void len;
    }
    // vientos y estacas
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const bx = sx * (w / 2 + 1.7), bz = sz * (d / 2 + 1.5), ex = sx * (w / 2 + 0.3), ez = sz * (d / 2 + 0.3);
      const dx = bx - ex, dz = bz - ez, dy = h + 0.2, Lr = Math.hypot(dx, dz, dy);
      const fr = F(mul(root, mx((bx + ex) / 2, dy / 2, (bz + ez) / 2, Math.atan2(-dz, dx), 0, 0)));
      void fr; void Lr;
      f.caja(M.hierro, bx, 0.15, bz, 0.06, 0.3, 0.06, { radio: 0.01 });
    }
    kit.muro(x, z, w, d, rot, { nombre: 'carpa', bloqueaBalas: true, material: 'lona' });
  };

  // ═════════ TORRE DE VIGILANCIA ═════════
  P.torre = ({ x, z, rot = 0 }) => {
    const f = F(mx(x, 0, z, rot));
    const H = 5.3, a = 1.15;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      f.caja(M.verde, sx * a, H / 2, sz * a, 0.2, H, 0.2, { radio: 0.03 });
      f.caja(M.hormigonOsc, sx * a, 0.15, sz * a, 0.5, 0.3, 0.5, { radio: 0.04 });
    }
    for (const sz of [-1, 1]) for (const [y0, y1] of [[0.4, 2.6], [2.6, 5.0]]) for (const dir of [-1, 1]) {
      const Lr = Math.hypot(2 * a, y1 - y0), ang = Math.atan2(y1 - y0, 2 * a) * dir;
      f.caja(M.hierro, 0, (y0 + y1) / 2, sz * a, Lr, 0.08, 0.08, { rotZ: ang, radio: 0.015 });
    }
    for (const sx of [-1, 1]) f.caja(M.hierro, sx * a, 2.6, 0, 0.08, 0.1, a * 2, { radio: 0.015 });
    f.caja(M.placa, 0, H + 0.05, 0, 3.3, 0.14, 3.3, { radio: 0.03 });
    for (const s of [-1, 1]) { f.caja(M.hierro, s * 1.6, H + 0.45, 0, 0.05, 0.7, 3.2, { radio: 0.01 }); f.caja(M.hierro, 0, H + 0.45, s * 1.6, 3.2, 0.05, 0.05, { radio: 0.01 }); }
    // cabina
    f.caja(M.prefab, 0, H + 1.3, -0.15, 2.5, 1.9, 2.2, { radio: 0.05 });
    f.caja(M.vidrio, 0, H + 1.45, 0.97, 2.1, 0.85, 0.03, { radio: 0.02 });
    f.caja(M.emAzul, 0, H + 1.45, 0.99, 1.9, 0.7, 0.01, { radio: 0.01 });
    f.caja(M.vidrio, 1.27, H + 1.45, -0.15, 0.03, 0.85, 1.8, { radio: 0.02 }); f.caja(M.vidrio, -1.27, H + 1.45, -0.15, 0.03, 0.85, 1.8, { radio: 0.02 });
    f.caja(M.lonaNegra, 0, H + 2.34, -0.1, 3.1, 0.14, 2.9, { radio: 0.04 });
    // proyector
    f.caja(M.hierro, 0.0, H + 2.5, 0.7, 0.12, 0.3, 0.12);
    f.caja(M.acero, 0.0, H + 2.7, 0.75, 0.62, 0.55, 0.6, { radio: 0.08, seg: 2 });
    f.caja(M.emBlanco, 0.0, H + 2.7, 1.06, 0.5, 0.44, 0.04, { radio: 0.04 });
    f.caja(M.baliza, 1.3, H + 2.5, -1.1, 0.16, 0.14, 0.16, { radio: 0.05 });
    // escalera
    f.caja(M.hierro, 1.45, 2.6, 1.7, 0.06, 5.4, 0.06, { rotX: -0.28 }); f.caja(M.hierro, 1.0, 2.6, 1.7, 0.06, 5.4, 0.06, { rotX: -0.28 });
    for (let i = 0; i < 9; i++) f.caja(M.hierro, 1.225, 0.5 + i * 0.55, 1.65 - (i * 0.55) * 0.285 + 0.0, 0.5, 0.04, 0.05);
    // sacos de arena en la base
    for (const [sx, sz, r] of [[-1.9, 1.7, 0.2], [-1.2, 2.05, 0], [0.0, 2.1, 0], [1.2, 2.05, 0]]) { f.caja(M.sacos, sx, 0.2, sz, 1.0, 0.4, 0.5, { rotY: r, radio: 0.12, seg: 2 }); f.caja(M.sacos, sx + 0.1, 0.55, sz, 0.9, 0.35, 0.5, { rotY: r, radio: 0.12, seg: 2 }); }
    kit.muro(x, z, 2.7, 2.7, rot, { nombre: 'torre', bloqueaBalas: true, material: 'metal' });
    // posición del foco (mundo)
    const c = Math.cos(rot), s = Math.sin(rot), lx = 0, lz = 1.08;
    return { lampX: x + lx * c + lz * s, lampZ: z - lx * s + lz * c, lampY: H + 2.7 };
  };

  // ═════════ HELICÓPTERO ESTRELLADO ═════════
  P.helicoptero = ({ x, z, rot = 0 }) => {
    const root = mx(x, 0.0, z, rot, 0, 0.0), f = F(root);
    const cuerpo = PINT.verdeOsc;
    const g = esfera();
    // fuselaje (elipsoide) apoyado sobre un costado
    const fb = F(mul(root, mx(0, 1.05, 0, 0, 0, 0.32)));
    fb.geo(g, cuerpo, 0, 0, 0, { esc: [3.1, 1.05, 1.1] });
    fb.geo(g, M.vidrio, 2.25, 0.18, 0, { esc: [1.25, 0.8, 1.0] });                       // cabina: cristal oscuro
    fb.caja(PINT.negro, 0.6, 0.45, 0, 2.3, 0.32, 1.7, { radio: 0.1, seg: 2 });
    fb.caja(M.hierro, 0.2, 1.05, 0, 1.5, 0.4, 1.1, { radio: 0.12, seg: 2 });              // caja de motores
    fb.cil(M.hierro, 0.4, 1.2, 0, 0.12, 0.09, 0.9, { seg: 10 });                         // mástil
    // cola
    fb.cil(cuerpo, -2.6, 0.1, 0, 0.5, 0.17, 5.0, { rotZ: Math.PI / 2, seg: 12 });
    fb.caja(cuerpo, -7.4, 0.55, 0.05, 0.9, 1.2, 0.1, { rotZ: 0.0, radio: 0.04 });
    fb.caja(M.hierro, -7.3, 0.05, 0.05, 0.1, 0.12, 1.3, { radio: 0.03 });
    // rotor: dos palas rotas sobre el suelo y un muñón
    fb.caja(M.hierro, 0.4, 1.9, 0.0, 0.5, 0.06, 0.4, { radio: 0.02 });
    f.caja(PINT.negro, 4.6, 0.12, 3.0, 6.2, 0.06, 0.34, { rotY: 0.55, radio: 0.02 });
    f.caja(PINT.negro, -3.0, 0.1, 2.9, 4.4, 0.06, 0.3, { rotY: -0.25, radio: 0.02 });
    f.caja(PINT.negro, 1.6, 2.3, -1.1, 5.8, 0.06, 0.32, { rotY: 0.2, rotZ: -0.5, radio: 0.02 });
    // patines doblados
    for (const s of [-1, 1]) { f.caja(M.hierro, 0.6 + s * 0, 0.08, s * 1.0, 3.8, 0.1, 0.1, { rotY: s * 0.1, radio: 0.03 }); f.caja(M.hierro, 1.2, 0.35, s * 0.95, 0.08, 0.7, 0.08, { rotX: s * 0.3 }); }
    f.caja(PINT.blanco, -1.3, 1.25, 0.88, 1.2, 0.22, 0.02, { rotZ: 0.32, radio: 0.005 });
    // luces rotas / brasas
    f.caja(M.emAmbar, 0.8, 0.8, 0.5, 0.5, 0.1, 0.4, { radio: 0.04 });
    kit.muro(x - 0.3 * Math.cos(rot), z + 0.3 * Math.sin(rot), 6.4, 2.5, rot, { nombre: 'helicoptero', bloqueaBalas: true, material: 'metal' });
  };

  // ═════════ MOBILIARIO MÉDICO ═════════
  P.camilla = ({ x, z, rot = 0, cuerpo = false, sabana = true }) => {
    const f = F(mx(x, 0, z, rot));
    f.caja(M.acero, 0, 0.55, 0, 1.9, 0.06, 0.58, { radio: 0.02 });
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) { f.caja(M.acero, sx * 0.8, 0.27, sz * 0.23, 0.05, 0.5, 0.05, { radio: 0.01 }); f.cil(M.goma, sx * 0.8, 0.07, sz * 0.23 - 0.03, 0.07, 0.07, 0.06, { rotX: Math.PI / 2, seg: 8, bisel: 0.01 }); }
    f.caja(M.lonaBlanca, 0, 0.63, 0, 1.8, 0.1, 0.52, { radio: 0.04, seg: 2 });
    f.caja(M.lonaBlanca, -0.75, 0.72, 0, 0.3, 0.1, 0.4, { radio: 0.05, seg: 2 });
    if (cuerpo) { f.caja(M.lonaBlanca, 0.05, 0.76, 0, 1.55, 0.2, 0.46, { radio: 0.1, seg: 2 }); f.caja(M.bomberoRojo, 0.5, 0.86, 0, 0.5, 0.01, 0.3, { radio: 0.004 }); }
    else if (sabana) f.caja(M.azulMetal, 0.3, 0.7, 0, 0.9, 0.05, 0.54, { radio: 0.02 });
  };
  P.bolsaCadaver = ({ x, z, rot = 0 }) => {
    const f = F(mx(x, 0, z, rot));
    f.caja(M.lonaNegra, 0, 0.16, 0, 1.85, 0.3, 0.58, { radio: 0.14, seg: 2 });
    f.caja(M.hormigon, 0, 0.316, 0, 1.6, 0.012, 0.03, { radio: 0.004 });
    f.caja(M.hormigon, 0.7, 0.26, 0.24, 0.12, 0.04, 0.02, { radio: 0.004 });
  };
  P.gotero = ({ x, z, rot = 0 }) => {
    const f = F(mx(x, 0, z, rot));
    f.cil(M.acero, 0, 0, 0, 0.18, 0.18, 0.04, { seg: 10, bisel: 0.01 }); f.cil(M.acero, 0, 0.03, 0, 0.022, 0.022, 1.7, { seg: 6, bisel: 0.004 });
    f.caja(M.acero, 0, 1.72, 0, 0.5, 0.025, 0.025); f.caja(M.cristal, -0.2, 1.55, 0, 0.1, 0.28, 0.06, { radio: 0.03 }); f.caja(M.cristal, 0.2, 1.55, 0, 0.1, 0.28, 0.06, { radio: 0.03 });
  };
  P.bombonaO2 = ({ x, z }) => {
    const f = F(mx(x, 0, z));
    f.cil(PINT.verdeOsc, 0, 0, 0, 0.12, 0.12, 0.95, { seg: 10, bisel: 0.05 }); f.cil(M.acero, 0, 0.95, 0, 0.04, 0.03, 0.12, { seg: 8, bisel: 0.01 });
  };
  P.cajaMedica = ({ x, z, rot = 0, apilada = 1 }) => {
    const f = F(mx(x, 0, z, rot));
    for (let i = 0; i < apilada; i++) {
      f.caja(M.pintBlanca, 0, 0.22 + i * 0.44, 0, 0.9, 0.42, 0.6, { radio: 0.04 });
      f.caja(M.bomberoRojo, 0, 0.22 + i * 0.44, 0.305, 0.34, 0.12, 0.01, { radio: 0.004 }); f.caja(M.bomberoRojo, 0, 0.22 + i * 0.44, 0.306, 0.12, 0.34, 0.01, { radio: 0.004 });
    }
  };
  /** Bidón / contenedor de residuos biológicos (rojo con símbolo amarillo). */
  P.bidonBio = ({ x, z, alto = 1.0 }) => {
    const f = F(mx(x, 0, z));
    f.cil(M.bomberoRojo, 0, 0, 0, 0.36, 0.36, alto, { seg: 14, bisel: 0.03 });
    f.cil(M.pintBlanca, 0, alto, 0, 0.38, 0.38, 0.06, { seg: 14, bisel: 0.01 });
    f.caja(M.pintAmarilla, 0, alto * 0.55, 0.365, 0.3, 0.3, 0.01, { radio: 0.004 });
  };

  // ═════════ CONTROL ═════════
  P.garita = ({ x, z, rot = 0, w = 3.3, d = 2.5 }) => {
    const f = F(mx(x, 0, z, rot));
    f.caja(M.prefab, 0, 1.2, 0, w, 2.4, d, { radio: 0.05 });
    f.caja(M.hormigonOsc, 0, 0.15, 0, w + 0.1, 0.3, d + 0.1, { radio: 0.03 });
    f.caja(M.lonaNegra, 0, 2.5, 0, w + 0.5, 0.14, d + 0.5, { radio: 0.04 });
    f.caja(M.vidrio, 0, 1.55, d / 2 + 0.012, w - 0.7, 0.75, 0.03, { radio: 0.02 }); f.caja(M.emFrio, 0, 1.55, d / 2 + 0.03, w - 0.9, 0.55, 0.01, { radio: 0.01 });
    f.caja(M.vidrio, w / 2 + 0.012, 1.55, 0, 0.03, 0.75, d - 0.7, { radio: 0.02 }); f.caja(M.vidrio, -w / 2 - 0.012, 1.55, 0, 0.03, 0.75, d - 0.7, { radio: 0.02 });
    f.caja(M.baliza, 0, 2.66, 0, 0.3, 0.18, 0.3, { radio: 0.06 });
    f.caja(M.rayas, 0, 0.55, d / 2 + 0.014, w - 0.2, 0.5, 0.02, { radio: 0.004 });
    kit.muro(x, z, w + 0.1, d + 0.1, rot, { nombre: 'garita', bloqueaBalas: true, material: 'metal' });
  };
  /** Barrera de pluma levantada (roja y blanca) con su mástil. */
  P.pluma = ({ x, z, rot = 0, alzada = 1.2 }) => {
    const f = F(mx(x, 0, z, rot));
    f.caja(M.acero, 0, 0.55, 0, 0.4, 1.1, 0.4, { radio: 0.05 });
    f.caja(M.baliza, 0, 1.15, 0, 0.2, 0.08, 0.2, { radio: 0.03 });
    const Lp = 4.2, a = alzada;
    for (let i = 0; i < 6; i++) f.caja(i % 2 ? M.pintBlanca : M.bomberoRojo, Math.cos(a) * (0.35 + (i + 0.5) * Lp / 6), 1.0 + Math.sin(a) * (0.35 + (i + 0.5) * Lp / 6), 0, Lp / 6, 0.1, 0.1, { rotZ: a, radio: 0.02 });
  };
  P.pasarela = ({ x, z, ancho = 16, alto = 5.4, rot = 0 }) => {
    const f = F(mx(x, 0, z, rot));
    for (const s of [-1, 1]) { f.caja(M.hierro, s * ancho / 2, alto / 2, 0, 0.45, alto, 0.45, { radio: 0.04 }); f.caja(M.hormigonOsc, s * ancho / 2, 0.15, 0, 0.9, 0.3, 0.9, { radio: 0.04 }); }
    f.caja(M.azulMetal, 0, alto + 0.35, 0, ancho + 0.8, 0.9, 0.5, { radio: 0.06 });
    f.caja(M.hierro, 0, alto - 0.2, 0, ancho + 0.6, 0.12, 0.6, { radio: 0.03 });
    for (const s of [-1, 1]) f.caja(M.emRojo, s * (ancho / 2 + 0.3), alto - 0.1, 0.32, 0.18, 0.18, 0.1, { radio: 0.03 });
  };
  /** Foco/torre de iluminación: mástil con batería de proyectores. */
  P.foco = ({ x, z, rot = 0, alto = 8.5 }) => {
    const f = F(mx(x, 0, z, rot));
    f.cil(M.hormigonOsc, 0, 0, 0, 0.45, 0.4, 0.5, { seg: 8 }); f.cil(M.verde, 0, 0.45, 0, 0.12, 0.08, alto - 0.5, { seg: 10 });
    f.caja(M.verde, 0, alto + 0.2, 0, 2.2, 0.12, 0.25, { radio: 0.03 });
    for (let i = 0; i < 3; i++) for (let j = 0; j < 2; j++) {
      f.caja(M.acero, -0.7 + i * 0.7, alto + 0.55 + j * 0.46, 0.22, 0.6, 0.38, 0.22, { radio: 0.04 });
      f.caja(M.emBlanco, -0.7 + i * 0.7, alto + 0.55 + j * 0.46, 0.345, 0.5, 0.28, 0.03, { radio: 0.02 });
    }
    kit.pilar(x, z, 0.35, { nombre: 'foco' });
    return { lampX: x, lampZ: z + 0.5, lampY: alto + 0.8 };
  };

  // ═════════ ESCOMBROS Y DETALLES ═════════
  P.sacosBio = (lista) => {
    const g = esfera();
    for (const b of lista) {
      const f = F(mx(b.x, 0, b.z, b.rot ?? 0));
      const m = b.rojo ? M.bomberoRojo : mat('lona', { color: 0xd8b21c });
      const s = b.esc ?? 1;
      f.geo(g, m, 0, 0.2 * s, 0, { esc: [0.42 * s, 0.26 * s, 0.34 * s] });
      f.geo(g, m, 0.18 * s, 0.34 * s, 0.05, { esc: [0.28 * s, 0.2 * s, 0.26 * s] });
    }
  };
  P.pila = ({ x, z, radio = 1.6, n = 14, semilla = 1, material = 'hormigon', color = 0x8e949a, alto = 0.9 }) => {
    const r = kit.rng(semilla), m = mat(material, { color });
    for (let i = 0; i < n; i++) {
      const a = r() * 6.28, d = Math.sqrt(r()) * radio, s = r.rango(0.25, 0.75) * (1.2 - d / radio * 0.5);
      const gx = x + Math.cos(a) * d, gz = z + Math.sin(a) * d;
      kit.lote0.anadir(caja(s * r.rango(1, 1.8), s * r.rango(0.5, 1), s * r.rango(0.8, 1.4), 0.07, 1), m, mx(gx, s * 0.3 * (1.1 - d / radio) + 0.1, gz, r() * 6.28, r.rango(-0.3, 0.3), r.rango(-0.3, 0.3)));
    }
    void alto;
  };
  P.conos = (lista) => {
    for (const c of lista) {
      const f = F(mx(c.x, 0, c.z, c.rot ?? 0));
      f.caja(M.goma, 0, 0.025, 0, 0.36, 0.05, 0.36, { radio: 0.015 });
      kit.lote0.anadir(new THREE.ConeGeometry(0.15, 0.62, 10), mat('acero_pintado', { color: 0xe8561a }), mx(c.x, 0.34, c.z), { uv: false });
      f.cil(M.pintBlanca, 0, 0.26, 0, 0.1, 0.08, 0.11, { seg: 10, bisel: 0.004 });
    }
  };
  /** Cinta de precaución entre estacas. puntos [[x,z],…]. */
  P.cinta = (puntos, { alto = 0.95, color = 'amarilla' } = {}) => {
    const segs = kit.segmentos(puntos);
    const m = color === 'roja' ? M.bomberoRojo : M.rayas;
    for (const s of segs) {
      const f = F(mx(s.cx, 0, s.cz, s.rot));
      f.caja(m, 0, alto, 0, s.L, 0.09, 0.012, { radio: 0.003, uv: false });
    }
    for (const [x, z] of puntos) { const f = F(mx(x, 0, z)); f.cil(M.hierro, 0, 0, 0, 0.035, 0.03, alto + 0.12, { seg: 6, bisel: 0.004 }); f.caja(M.goma, 0, 0.02, 0, 0.3, 0.04, 0.3, { radio: 0.01 }); }
  };
  /** Valla de malla soldada de 2 m con alambre de espino (ligera, no bloquea la vista). */
  P.mallado = (puntos, { alto = 2.1, espino = true, colision = true } = {}) => {
    const segs = kit.segmentos(puntos);
    const coil = new THREE.TorusGeometry(0.17, 0.012, 4, 8);
    for (const s of segs) {
      const f = F(mx(s.cx, 0, s.cz, s.rot));
      const n = Math.max(1, Math.round(s.L / 2.8)), paso = s.L / n;
      for (let i = 0; i <= n; i++) f.caja(M.hierro, -s.L / 2 + paso * i, alto / 2, 0, 0.07, alto, 0.07, { radio: 0.015 });
      for (const y of [0.1, alto * 0.5, alto - 0.05]) f.caja(M.hierro, 0, y, 0, s.L, 0.035, 0.035, { radio: 0.008 });
      const nv = Math.floor(s.L / 0.34);
      for (let i = 0; i < nv; i++) f.caja(M.acero, -s.L / 2 + (i + 0.5) * (s.L / nv), alto / 2 - 0.05, 0, 0.012, alto - 0.15, 0.012, { radio: 0.003, uv: false });
      for (const y of [0.35, 0.7, 1.05, 1.4, 1.75]) f.caja(M.acero, 0, y, 0, s.L, 0.01, 0.01, { radio: 0.003, uv: false });
      if (espino) { const nc = Math.floor(s.L / 0.32); for (let i = 0; i < nc; i++) f.geo(coil, M.hierro, -s.L / 2 + (i + 0.5) * (s.L / nc), alto + 0.14, 0, { rotY: Math.PI / 2, uv: false, rotX: 0 }); }
      if (colision) kit.vallaBaja(s.cx, s.cz, s.L, s.rot, { ancho: 0.15 });
    }
  };
  /** Pórtico con banderola grande. */
  P.portico = ({ x, z, ancho = 20, alto = 6.2 }) => {
    const f = F(mx(x, 0, z));
    for (const s of [-1, 1]) { f.caja(M.hierro, s * ancho / 2, alto / 2, 0, 0.5, alto, 0.5, { radio: 0.05 }); f.caja(M.hormigonOsc, s * ancho / 2, 0.2, 0, 1.0, 0.4, 1.0, { radio: 0.05 }); kit.pilar(x + s * ancho / 2, z, 0.5, { nombre: 'portico' }); }
    f.caja(M.hierro, 0, alto + 0.1, 0, ancho + 0.8, 0.4, 0.5, { radio: 0.04 });
    f.caja(M.hierro, 0, alto - 0.35, -0.15, ancho, 0.14, 0.14);
    for (let i = 0; i < 6; i++) f.caja(M.emBlanco, -ancho * 0.4 + i * ancho * 0.16, alto - 0.35, 0.35, 0.55, 0.14, 0.18, { radio: 0.03 });
    for (const s of [-1, 1]) f.caja(M.baliza, s * (ancho / 2 + 0.15), alto + 0.55, 0.0, 0.22, 0.22, 0.22, { radio: 0.06 });
    return { y: alto + 1.35 };
  };

  return P;
}
