// ERA Z · Villa de Santa Ceniza: mobiliario de plaza y rincones con interés cerca del centro de la acción.
import { marco, barril } from './props.js';

/** Banco corrido de piedra con patas macizas (largo en X local). Detiene a zombis y jugadores, no a las balas. */
export function bancoPiedra(kit, x, z, rot = 0) {
  const f = marco(kit, x, z, rot);
  const sill = kit.mat('silleria', { color: 0xc4baa2 }), sill2 = kit.mat('silleria', { color: 0xa39a86 });
  for (const s of [-1, 1]) {
    f.caja(sill2, s * 0.72, 0.2, 0, 0.42, 0.4, 0.5, { radio: 0.035 });
    f.caja(sill2, s * 0.72, 0.43, 0, 0.5, 0.06, 0.56, { radio: 0.02 });
  }
  f.caja(sill, 0, 0.5, 0, 1.9, 0.13, 0.52, { radio: 0.04 });
  f.caja(sill2, 0, 0.58, -0.24, 1.86, 0.06, 0.05, { radio: 0.02 });          // respaldo bajo corrido
  kit.vallaBaja(x, z, 1.9, rot, { ancho: 0.55 });
}

/** Saco de grano o harina (tela con boca atada). */
export function saco(kit, x, y, z, rot = 0, color = 0xc9b48a, esc = 1) {
  const m = kit.mat('saco_arena', { color });
  const f = marco(kit, x, z, rot, y);
  f.caja(m, 0, 0.14 * esc, 0, 0.62 * esc, 0.28 * esc, 0.38 * esc, { radio: 0.11 * esc, uv: 'saco_arena' });
  f.caja(m, 0.2 * esc, 0.3 * esc, 0.02, 0.2 * esc, 0.1 * esc, 0.2 * esc, { radio: 0.05 * esc, rz: 0.4, uv: 'saco_arena' });
  f.caja(kit.mat('cuerda'), 0.17 * esc, 0.26 * esc, 0.02, 0.05, 0.05, 0.22 * esc, { radio: 0.015, uv: false });
}

/** Cajón de madera con listones y esquineros. */
export function cajon(kit, x, y, z, rot = 0, lado = 0.8, alto = 0.62, color = 0x9a7a55) {
  const f = marco(kit, x, z, rot, y);
  const m = kit.mat('tablas_viejas', { color }), lis = kit.mat('tablas_viejas', { color: 0x5e452f });
  f.caja(m, 0, alto / 2, 0, lado, alto, lado, { radio: 0.025, uv: 'tablas_viejas' });
  const h = lado / 2 + 0.012, hy = alto / 2;
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.caja(lis, sx * h, hy, sz * h, 0.07, alto + 0.02, 0.07, { radio: 0.01, uv: false });
  for (const yy of [0.05, alto - 0.05]) {
    f.caja(lis, 0, yy, h, lado, 0.07, 0.04, { radio: 0.008, uv: false }); f.caja(lis, 0, yy, -h, lado, 0.07, 0.04, { radio: 0.008, uv: false });
    f.caja(lis, h, yy, 0, 0.04, 0.07, lado, { radio: 0.008, uv: false }); f.caja(lis, -h, yy, 0, 0.04, 0.07, lado, { radio: 0.008, uv: false });
  }
  f.caja(lis, 0, hy, h, 0.07, alto * 1.15, 0.04, { radio: 0.008, rz: 0.85, uv: false });
}

/** Rincón de mercancías: cajones apilados, sacos, un barril y un cuenco de fruta. Una sola colisión. */
export function rinconMercancias(kit, x, z, rot = 0, variante = 0) {
  const f = marco(kit, x, z, rot);
  const p = (lx, lz) => f.mundo(lx, lz);
  let a = p(-0.5, 0); cajon(kit, a[0], 0, a[1], rot + 0.05, 0.85, 0.62);
  a = p(0.45, 0.05); cajon(kit, a[0], 0, a[1], rot - 0.1, 0.8, 0.58, 0x8a6a48);
  a = p(-0.45, 0.02); cajon(kit, a[0], 0.62, a[1], rot + 0.35, 0.68, 0.5, 0xa88a60);
  a = p(0.95, -0.55); saco(kit, a[0], 0, a[1], rot + 0.5, 0xd2bd92);
  a = p(0.1, -0.7); saco(kit, a[0], 0, a[1], rot - 0.2, 0xc4ae82, 1.05); a = p(0.15, -0.7); saco(kit, a[0], 0.27, a[1], rot + 0.3, 0xc9b48a);
  if (variante === 0) { a = p(-1.35, 0.2); barril(kit, a[0], 0, a[1], rot, 0.9); }
  else { a = p(-1.3, -0.4); saco(kit, a[0], 0, a[1], rot + 1.2, 0xbfa97c); a = p(-1.25, 0.35); saco(kit, a[0], 0, a[1], rot - 0.6, 0xd2bd92); }
  const c = p(-0.1, -0.2);
  kit.muro(c[0], c[1], 2.9, 1.8, rot, { bloqueaBalas: false, nombre: 'mercancias', material: 'madera' });
}

/** Tablón de avisos con carteles clavados (bando de la guarnición, «se busca», esquelas). */
export function tablonAvisos(kit, x, z, rot = 0) {
  const f = marco(kit, x, z, rot);
  const mad = kit.mat('tablas_viejas', { color: 0x6b4d33 }), tab = kit.mat('tablas_viejas', { color: 0x8a6a48 });
  for (const s of [-1, 1]) f.caja(mad, s * 0.9, 1.1, 0, 0.14, 2.2, 0.14, { radio: 0.02, uv: 'tablas_viejas' });
  f.caja(tab, 0, 1.55, 0.02, 1.7, 1.0, 0.08, { radio: 0.02, uv: 'tablas_viejas' });
  f.caja(mad, 0, 2.12, 0.02, 2.0, 0.12, 0.2, { radio: 0.02, uv: 'tablas_viejas' });
  const pap = kit.mat('yeso', { color: 0xe9dfc3 }), pap2 = kit.mat('yeso', { color: 0xd8c9a0 });
  [[-0.55, 1.75, 0.34, 0.45, 0.04], [-0.1, 1.62, 0.3, 0.4, -0.06], [0.4, 1.8, 0.36, 0.48, 0.07], [0.5, 1.38, 0.26, 0.32, -0.04], [-0.5, 1.3, 0.28, 0.3, 0.1], [0.0, 1.28, 0.22, 0.26, -0.1]].forEach(([lx, ly, w, h, r], i) =>
    f.caja(i % 2 ? pap2 : pap, lx, ly, 0.075, w, h, 0.012, { radio: 0.004, rz: r, uv: false }));
  f.caja(kit.mat('hierro_forjado'), 0, 1.0, 0.04, 1.7, 0.06, 0.06, { radio: 0.01 });
  kit.muro(x, z, 2.0, 0.35, rot, { bloqueaBalas: false, nombre: 'tablon_avisos', material: 'madera' });
}

/** Cubeta de madera con agua y un cazo, junto al brocal o la fuente. */
export function cubeta(kit, x, z, rot = 0) {
  const f = marco(kit, x, z, rot);
  f.geo(kit.cilindro(0.3, 0.36, 0.42, 14, 0.015), kit.mat('tablas_viejas', { color: 0x7a5a3a }), 0, 0.21, 0, { uv: false });
  f.geo(kit.cilindro(0.31, 0.31, 0.04, 14, 0.01), kit.mat('hierro_forjado'), 0, 0.22, 0, { uv: false });
  f.geo(kit.cilindro(0.29, 0.29, 0.02, 14, 0.005), kit.mat('agua', { color: 0x2a3a40 }), 0, 0.38, 0, { uv: false });
  kit.pilar(x, z, 0.36, { bloqueaBalas: false, nombre: 'cubeta' });
}
