// ERA Z · Villa de Santa Ceniza: capas de detalle del suelo (plaza, calles, bordes, cementerio) y charcos con reflejo.
import { capaSuelo } from './detalle.js';

const VERDES = [0x6f8c3c, 0x84993f, 0x5f7c34, 0x9aa64a, 0x7d9148, 0xa8a457, 0x57722f];
const SECOS = [0xb7a35a, 0xa8935a, 0xc2b070, 0x8f7e4b];
const OTONO = [0xa8742a, 0x8a5a22, 0xb8872e, 0x6b4a1e, 0x7a3e1c, 0x9a8a3a];
const PIEDRA = [0x8f8576, 0xa39a88, 0x7a7266, 0x9c917d, 0x6d665c];
const PAJA = [0xd8bf6c, 0xc9ab58, 0xe6cf86, 0xb8964a];

/** Detalle de la plaza (capa alta, sobre el adoquín elevado) con rosa de piedra, rodadas, hojas y charcos pintados. */
export function detallePlaza(kit, rng) {
  capaSuelo(kit, { x0: -14, z0: -16, x1: 14, z1: 12, ppm: 58, y: 0.088, semilla: 31, rugosidad: 0.85, orden: 2 }, (d) => {
    const g = d.g;
    // desgaste de caminos: tierra y polvo arrastrados desde las calles hacia la plaza
    for (const [x, z, r, a] of [[-12.5, 1, 3.2, 0.34], [12.5, 1, 3.2, 0.34], [0, 11.5, 3.4, 0.3], [0, -13, 2.8, 0.26], [-9, 6, 2.6, 0.2], [9, -7, 2.4, 0.2]]) d.blob(x, z, r, 0x6e5b42, a, { asp: 1.5, rot: rng() * 3, n: 6 });
    // rosa de los vientos: cuatro radios y dos anillos de sillería clara sobre el adoquín
    const C = [0, -3], piedra = 0xa59b86;
    d.anillo(C[0], C[1], 6.9, 0.5, piedra, { alpha: 0.9 });
    d.anillo(C[0], C[1], 10.6, 0.42, 0xa0947f, { alpha: 0.85 });
    for (const a of [0, Math.PI / 2, Math.PI, -Math.PI / 2]) {
      const x1 = C[0] + Math.cos(a) * 5.0, z1 = C[1] + Math.sin(a) * 5.0, x2 = C[0] + Math.cos(a) * 12.7, z2 = C[1] + Math.sin(a) * 12.7;
      d.hilera(x1, z1, x2, z2, 0.62, piedra, { alpha: 0.88 });
    }
    // las cuatro diagonales, más finas y discontinuas
    // sillares sueltos o hundidos, grietas y musgo en las juntas
    for (let i = 0; i < 26; i++) { const a = rng() * 6.28, r = rng.rango(5, 12.4); d.losa(C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, rng.rango(0.3, 0.55), rng.rango(0.25, 0.4), rng() * 3, d.claro(0x8c8272, rng.rango(0.8, 1.1)), { alpha: 0.9 }); }
    for (let i = 0; i < 16; i++) { const a = rng() * 6.28, r = rng.rango(4.8, 12.4); d.grieta(C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, rng.rango(0.6, 1.6), rng() * 6.28, { alpha: 0.55, ancho: 0.02 }); }
    for (let i = 0; i < 22; i++) { const a = rng() * 6.28, r = rng.rango(5, 12.6); d.blob(C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r, rng.rango(0.35, 0.9), 0x5f7a38, 0.3, { n: 3 }); }
    // matas de hierba brotando de las juntas y junto al bordillo
    for (let i = 0; i < 46; i++) {
      const a = rng() * 6.28, r = i < 26 ? rng.rango(12.0, 12.8) : rng.rango(4.9, 12.3);
      d.hierba(C[0] + Math.cos(a) * r, C[1] + Math.sin(a) * r * 0.97 + 3, rng.rango(0.18, 0.4), rng.entero(10, 22), rng() < 0.2 ? SECOS : VERDES, { largo: rng.rango(0.2, 0.34) });
    }
    // rodadas de carretas que cruzan la plaza de este a oeste y hacia el sur
    d.rodada([[-13.5, 1.5], [-6, 1.2], [0, 2.2], [6, 1.6], [13.5, 1.9]], { sep: 1.45, grosor: 0.17, color: 0x2a2118, alpha: 0.3 });
    d.rodada([[0.5, 12], [0.8, 6], [-0.4, 1.8]], { sep: 1.4, grosor: 0.15, color: 0x2a2118, alpha: 0.26 });
    // hojas, paja y restos del mercado
    for (const [x, z, r, n] of [[-8, -9, 2.5, 26], [8.5, 4, 3, 30], [-6, 6, 3, 22], [10, -8, 2.4, 24], [0, 8, 3.2, 20]]) d.hojas(x, z, r, n, OTONO, { tam: 1.1 });
    for (const [x, z, r, n] of [[9.5, -5, 2.6, 36], [11.5, 2, 2.0, 26], [-4, -11, 1.4, 14]]) d.paja(x, z, r, n, PAJA, { largo: 0.36 });
    // charcos pintados (húmedos, con brillo) y manchas de humedad en las juntas
    d.charco(-5.2, 5.6, 1.2, 0.8, { rot: 0.3, agua: 0x44505a, alpha: 0.5 });
    d.charco(6.0, 8.8, 1.0, 0.6, { rot: -0.4, agua: 0x44505a, alpha: 0.5 });
    d.charco(-9.4, -6.8, 0.8, 0.5, { rot: 0.9, agua: 0x44505a, alpha: 0.7 });
    d.charco(9.4, -1.5, 0.9, 0.55, { rot: -0.2, agua: 0x44505a, alpha: 0.7 });
    // cercanías de la fuente: piedra húmeda y salpicaduras
    d.blob(0, -3, 5.4, 0x241d17, 0.2, { n: 7 });
    d.guijarros([-12, -15, 12, 11], 60, PIEDRA, { rMin: 0.03, rMax: 0.07, alpha: 0.9 });
    void g;
  });
}

/** Detalle general de calles, bordes, cementerio y arboledas. */
export function detalleVilla(kit, rng, { edificios, arboles, tumbas }) {
  capaSuelo(kit, { x0: -48, z0: -48, x1: 48, z1: 48, ppm: 30, y: 0.012, semilla: 17, rugosidad: 0.95 }, (d) => {
    // tierra pisada: umbral entre empedrado y campo, puertas, mercado y caminos
    for (let i = 0; i < 36; i++) { const a = rng() * 6.28, r = rng.rango(23.5, 28); d.blob(Math.cos(a) * r, Math.sin(a) * r * 0.9, rng.rango(1.4, 3.2), 0x6a5740, rng.rango(0.22, 0.4), { asp: rng.rango(1, 1.8), rot: rng() * 3 }); }
    for (const e of edificios) {
      for (const p of e.puertas ?? []) d.blob(p.x, p.z, rng.rango(1.6, 2.4), 0x5c4a35, 0.45, { asp: 1.4, rot: rng() * 3 });
    }
    d.blob(29, -7.5, 9, 0x6a5740, 0.3, { asp: 2.2, n: 9 });             // mercado
    d.blob(26, -29, 7, 0x4c3f2c, 0.28, { asp: 1.3, n: 7 });             // camposanto
    d.blob(0, 38, 9, 0x6a5740, 0.3, { asp: 2.4, n: 8 });
    d.blob(-30, 2, 6, 0x6a5740, 0.28, { asp: 2.0, n: 6 });
    // rodadas por las dos calles principales, que se pierden hacia los bordes
    d.rodada([[-45, 1.8], [-34, 1.3], [-22, 2.2], [-14, 1.6]], { sep: 1.5, grosor: 0.2, color: 0x2a2016, alpha: 0.38 });
    d.rodada([[14, 1.7], [24, 2.2], [34, 1.4], [45, 1.9]], { sep: 1.5, grosor: 0.2, color: 0x2a2016, alpha: 0.38 });
    d.rodada([[0.8, 15], [0.4, 24], [1.2, 33], [0.6, 45]], { sep: 1.5, grosor: 0.2, color: 0x2a2016, alpha: 0.36 });
    d.rodada([[-0.6, -45], [0.2, -34], [-0.4, -27]], { sep: 1.5, grosor: 0.18, color: 0x2a2016, alpha: 0.32 });
    d.rodada([[14, -4], [24, -6.5], [34, -9], [45, -8.4]], { sep: 1.5, grosor: 0.17, color: 0x2a2016, alpha: 0.3 });
    // huellas: del mercado a la plaza, a la iglesia y al camposanto
    d.pisadas([[16, -7], [11, -4], [7, -2]], { alpha: 0.36 }); d.pisadas([[3, -23], [2, -17], [3, -12]], { alpha: 0.32 });
    d.pisadas([[26, -20], [26.4, -26], [25.6, -33]], { alpha: 0.4 }); d.pisadas([[-18, 12], [-12, 9], [-8, 7]], { alpha: 0.32 });
    // hierba: pie de muros sur, bordes del mapa y camposanto
    for (const e of edificios) {
      const hw = e.ancho / 2, zs = e.z + e.fondo / 2 + 0.3;
      for (let x = -hw; x < hw; x += rng.rango(0.9, 2.2)) d.hierba(e.x + x, zs + rng() * 0.3, rng.rango(0.22, 0.45), rng.entero(10, 20), rng() < 0.25 ? SECOS : VERDES, { largo: 0.3 });
    }
    for (let i = 0; i < 150; i++) {
      const lado = rng(), x = lado < 0.5 ? rng.rango(-46, 46) : (rng() < 0.5 ? rng.rango(-46, -33) : rng.rango(33, 46)), z = lado < 0.5 ? (rng() < 0.5 ? rng.rango(33, 46) : rng.rango(-46, -39)) : rng.rango(-46, 46);
      if (Math.hypot(x, z) < 27) continue;
      d.hierba(x, z, rng.rango(0.25, 0.6), rng.entero(12, 26), rng() < 0.28 ? SECOS : VERDES, { largo: rng.rango(0.22, 0.42) });
    }
    for (let i = 0; i < 38; i++) d.hierba(rng.rango(14.8, 39.4), rng.rango(-37.4, -21), rng.rango(0.3, 0.6), rng.entero(14, 26), rng() < 0.2 ? SECOS : VERDES, { largo: rng.rango(0.25, 0.42) });
    // musgo y suciedad junto a los muros de la iglesia y las casas
    for (const e of edificios) d.blob(e.x, e.z + e.fondo / 2 + 0.6, e.ancho * 0.45, 0x241d15, 0.22, { asp: e.ancho / 3, n: 5 });
    // flores silvestres y ofrendas en el camposanto
    for (let i = 0; i < 40; i++) {
      const x = rng.rango(15, 39), z = rng.rango(-37, -21), c = [0xf3efe0, 0xe9d36a, 0xd05a5a, 0xb48ad8][i % 4];
      d.g.fillStyle = d.rgba(c, 0.95); d.g.beginPath(); d.g.arc(d.X(x), d.Z(z), d.Mt(0.035), 0, 6.28); d.g.fill();
    }
    // tierra removida junto a las tumbas
    for (const [x, z] of tumbas) d.blob(x, z, 1.5, 0x3a2d20, 0.5, { asp: 1.6, n: 5 });
    // hojas bajo los árboles y por las esquinas
    for (const [x, z] of arboles) { d.hojas(x, z, 3.6, 70, OTONO, { tam: 1.15 }); d.blob(x, z, 3.4, 0x4a3a22, 0.22, { n: 5 }); }
    for (let i = 0; i < 14; i++) d.hojas(rng.rango(-40, 40), rng.rango(-36, 40), rng.rango(1.5, 3), 16, OTONO);
    // paja suelta junto a carros, pajares y establo
    for (const [x, z, r, n] of [[-15.5, 25.5, 3, 60], [-13, 30, 3.4, 70], [28, 27, 3, 60], [-41, -20, 3, 50], [-26, -3.2, 2.4, 40], [8, 35.5, 2.4, 40], [36.5, -16.5, 2.4, 36], [-17, 9, 2.5, 34]]) d.paja(x, z, r, n, PAJA, { largo: 0.4 });
    // charcos pintados en la tierra de los bordes y bajo los aleros
    d.charco(-18, 20, 1.8, 1.1, { rot: 0.2, agua: 0x44505a, alpha: 0.7 });
    d.charco(24, 22, 1.5, 0.9, { rot: -0.5, agua: 0x44505a, alpha: 0.7 });
    d.charco(14, 12, 1.2, 0.7, { rot: 0.9, agua: 0x44505a, alpha: 0.7 });
    d.charco(-22, -6, 1.3, 0.8, { rot: -0.2, agua: 0x44505a, alpha: 0.7 });
    d.charco(5, -17, 1.0, 0.6, { rot: 0.4, agua: 0x44505a, alpha: 0.7 });
    // gravilla y piedras en los caminos de tierra
    d.guijarros([-46, -46, 46, 46], 520, PIEDRA, { rMin: 0.03, rMax: 0.09 });
    // adoquines sueltos y huecos en la calle
    for (let i = 0; i < 40; i++) { const a = rng() * 6.28, r = rng.rango(13.5, 25); d.losa(Math.cos(a) * r, Math.sin(a) * r, rng.rango(0.16, 0.26), rng.rango(0.12, 0.2), rng() * 3, d.claro(0x7d7467, rng.rango(0.8, 1.2)), { alpha: 0.9 }); }
    for (let i = 0; i < 18; i++) { const a = rng() * 6.28, r = rng.rango(13.5, 25); d.blob(Math.cos(a) * r, Math.sin(a) * r, rng.rango(0.3, 0.7), 0x3b2f22, 0.55, { n: 3 }); }
  });
  // Charcos con reflejo real (agua clara, no negra)
  const opc = { color: 0x4c565e, metal: 0.25, rugosidad: 0.12, reflejo: 0.9 };
  for (const [x, z, r, rot] of [[-2.5, 12, 1.4, 0.3], [11, 14, 1.0, 1.0], [-19, 16, 1.3, 0.2], [20, -1.5, 1.1, -0.4], [-6, -16.5, 1.0, 0.6], [30, 12, 1.2, 0.1]]) {
    kit.parche({ tipo: 'charco', x, z, radio: r, rot, alargado: 1.3, ...opc, opacidad: 1 });
  }
}
