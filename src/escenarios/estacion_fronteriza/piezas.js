// ERA Z · Estación Cruz del Diablo: piezas de interés cerca del centro (diligencia abandonada y horca).
import * as THREE from 'three';
import { marco } from '../villa_colonial/props.js';

/** Diligencia de línea abandonada: caja pintada, baca con baúles, cuatro ruedas de radios y varas caídas. */
export function diligencia(kit, x, z, rot = 0) {
  const f = marco(kit, x, z, rot);
  const cuerpo = kit.mat('tablas_pintadas', { color: 0x8a2f26 }), friso = kit.mat('tablas_pintadas', { color: 0xd9c9a0 });
  const mad = kit.mat('tablas_viejas', { color: 0x5a4332 }), hierro = kit.mat('hierro_forjado'), cuero = kit.mat('cuero', { color: 0x4a3426 });
  const lona = kit.mat('lona', { color: 0x8a7a58 });
  // chasis y caja
  f.caja(mad, 0, 0.62, 0, 2.5, 0.14, 1.2, { radio: 0.03, uv: 'tablas_viejas' });
  f.caja(cuerpo, 0, 1.3, 0, 2.3, 1.1, 1.3, { radio: 0.07, uv: 'tablas_pintadas' });
  f.caja(friso, 0, 1.78, 0, 2.4, 0.1, 1.38, { radio: 0.03, uv: 'tablas_pintadas' });
  f.caja(friso, 0, 0.82, 0, 2.36, 0.06, 1.34, { radio: 0.02, uv: 'tablas_pintadas' });
  for (const s of [-1, 1]) {
    f.caja(kit.vidrio?.(false) ?? hierro, 0, 1.38, s * 0.665, 1.2, 0.55, 0.03, { radio: 0.01, uv: false });      // ventanilla
    f.caja(friso, 0, 1.38, s * 0.672, 1.32, 0.64, 0.02, { radio: 0.01, uv: false });
    f.caja(kit.vidrio?.(false) ?? hierro, 0, 1.38, s * 0.678, 1.16, 0.5, 0.02, { radio: 0.01, uv: false });
  }
  // baca con baúles, cuerda y lona
  f.caja(hierro, 0, 1.86, 0, 2.2, 0.04, 1.2, { radio: 0.01, uv: false });
  for (const [lx, lz, w, d, r] of [[-0.55, 0.15, 0.9, 0.6, 0.08], [0.45, -0.2, 0.8, 0.55, -0.12]]) f.caja(cuero, lx, 2.08, lz, w, 0.42, d, { radio: 0.05, ry: r, uv: false });
  f.caja(lona, 0.7, 2.0, 0.3, 0.8, 0.22, 0.7, { radio: 0.07, ry: 0.3, uv: false });
  f.caja(kit.mat('cuerda'), -0.5, 2.1, 0.15, 0.05, 0.46, 0.64, { radio: 0.01, uv: false });
  // pescante del cochero
  f.caja(cuerpo, 1.5, 1.2, 0, 0.9, 0.9, 1.1, { radio: 0.05, uv: 'tablas_pintadas' });
  f.caja(cuero, 1.55, 1.78, 0, 0.5, 0.12, 1.0, { radio: 0.04, uv: false });
  // ruedas: llanta de hierro, felpa de madera y ocho radios (la trasera, mayor)
  const llanta = new THREE.TorusGeometry(1, 0.06, 6, 28), felpa = new THREE.TorusGeometry(1, 0.1, 6, 28);
  for (const [lx, R] of [[-0.85, 0.62], [1.2, 0.48]]) for (const s of [-1, 1]) {
    const zz = s * 0.82;
    f.geo(llanta, hierro, lx, R, zz, { e: R, uv: false }); f.geo(felpa, mad, lx, R, zz, { e: R * 0.92, uv: false });
    f.geo(kit.cilindro(0.1, 0.1, 0.24, 10, 0.02), mad, lx, R, zz, { rx: Math.PI / 2, uv: false });
    for (let i = 0; i < 4; i++) f.caja(mad, lx, R, zz, 0.06, R * 1.8, 0.06, { radio: 0.01, rz: (i * Math.PI) / 4 + 0.15, uv: false });
  }
  f.caja(hierro, -0.85, 0.62, 0, 0.07, 0.07, 1.7, { radio: 0.01, uv: false }); f.caja(hierro, 1.2, 0.48, 0, 0.07, 0.07, 1.7, { radio: 0.01, uv: false });
  // varas caídas al suelo
  for (const s of [-1, 1]) f.caja(mad, 2.8, 0.1, s * 0.34, 2.6, 0.08, 0.1, { radio: 0.02, ry: s * 0.05, uv: 'tablas_viejas' });
  // farol del pescante encendido
  f.caja(hierro, 1.95, 1.95, -0.4, 0.04, 0.5, 0.04, { radio: 0.005, uv: false });
  f.caja(kit.emisivo(0xffb25a, 3.6), 1.95, 2.28, -0.4, 0.2, 0.28, 0.2, { radio: 0.03, uv: false });
  const l = f.mundo(1.95, -0.4); kit.luz({ x: l[0], y: 2.4, z: l[1], color: 0xffa94c, intensidad: 17, distancia: 11 });
  const c = f.mundo(0.3, 0);
  kit.muro(c[0], c[1], 3.2, 1.9, rot, { nombre: 'diligencia', material: 'madera' });
}

/** Horca: tarima con escalera, dos postes, viga, soga con nudo corredizo y palanca. */
export function horca(kit, x, z, rot = 0) {
  const f = marco(kit, x, z, rot);
  const mad = kit.mat('tablas_viejas', { color: 0x6e5238 }), tab = kit.mat('tablones', { color: 0x9a8062 }), hierro = kit.mat('hierro_forjado'), cuerda = kit.mat('cuerda');
  f.caja(tab, 0, 0.45, 0, 3.0, 0.12, 2.2, { radio: 0.02, uv: 'tablones' });
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) f.caja(mad, sx * 1.35, 0.2, sz * 0.95, 0.16, 0.4, 0.16, { radio: 0.02, uv: 'tablas_viejas' });
  f.caja(mad, 0, 0.18, 1.1, 2.8, 0.14, 0.06, { radio: 0.01, uv: 'tablas_viejas' });
  for (let i = 0; i < 3; i++) f.caja(tab, -2.0 + 0.0, 0.14 + i * 0.14, 0.2 + 0, 0.7 - i * 0.12 + 0.3, 0.1, 0.8, { radio: 0.015, uv: 'tablones' });
  for (const s of [-1, 1]) f.caja(mad, s * 1.2, 2.0, -0.6, 0.2, 3.1, 0.2, { radio: 0.03, uv: 'tablas_viejas' });
  f.caja(mad, 0, 3.5, -0.6, 2.9, 0.2, 0.22, { radio: 0.03, uv: 'tablas_viejas' });
  for (const s of [-1, 1]) f.caja(mad, s * 0.95, 3.2, -0.6, 0.12, 0.7, 0.12, { radio: 0.02, rz: s * 0.75, uv: 'tablas_viejas' });
  f.geo(kit.cilindro(0.02, 0.02, 1.2, 6, 0.005), cuerda, 0.2, 2.8, -0.6, { uv: false });
  f.geo(new THREE.TorusGeometry(0.14, 0.025, 6, 12), cuerda, 0.2, 2.1, -0.6, { ry: Math.PI / 2, uv: false });
  f.caja(hierro, 1.1, 0.9, 0.5, 0.06, 0.8, 0.06, { radio: 0.01, rz: -0.4, uv: false });
  // antorcha clavada junto a la escalera
  f.caja(mad, -1.55, 0.95, 1.0, 0.07, 1.5, 0.07, { radio: 0.01, uv: false });
  f.caja(kit.emisivo(0xff8a30, 4.2), -1.55, 1.78, 1.0, 0.14, 0.2, 0.14, { radio: 0.04, uv: false });
  const t = f.mundo(-1.55, 1.0); kit.luz({ x: t[0], y: 2.0, z: t[1], color: 0xff8a3a, intensidad: 18, distancia: 12 });
  const c = f.mundo(0, -0.1);
  kit.muro(c[0], c[1], 3.1, 2.3, rot, { nombre: 'horca', material: 'madera' });
}
