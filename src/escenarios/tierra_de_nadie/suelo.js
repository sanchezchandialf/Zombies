// ERA Z · Tierra de Nadie: capa de detalle del suelo (barro variado, cráteres con borde y agua, rodadas de oruga, huellas, hierba seca).
import { capaSuelo } from '../villa_colonial/detalle.js';

const SECAS = [0x7a7a42, 0x8a8450, 0x6a6a38, 0x9a9258, 0x5c6232];
const CASQUILLOS = [0xb98f3c, 0xa07a30, 0xc9a24a, 0x8a6a2c];
const ESQUIRLAS = [0x4a4c4e, 0x5e6062, 0x3a3c3e, 0x6f6a60];
const PIEDRA = [0x7a6e5c, 0x8d806a, 0x655b4b, 0x9a8c74];

/** `craters`: [{x,z,r}]; `tanque`: {x,z,rot}; `masas`: rectángulos/zonas que ya tienen suelo propio y se saltan. */
export function detalleTrincheras(kit, rng, { crateres, tanque }) {
  capaSuelo(kit, { x0: -48, z0: -48, x1: 48, z1: 48, ppm: 30, y: 0.02, semilla: 41, rugosidad: 0.8 }, (d) => {
    // variación de barro: arcilla clara seca, lodo oscuro empapado y musgo oliva
    for (let i = 0; i < 70; i++) d.blob(rng.rango(-46, 46), rng.rango(-44, 46), rng.rango(1.6, 4.6), 0x9a8452, rng.rango(0.1, 0.22), { asp: rng.rango(1, 2), rot: rng() * 3.14, n: 5 });
    for (let i = 0; i < 60; i++) d.blob(rng.rango(-46, 46), rng.rango(-44, 46), rng.rango(1.2, 3.6), 0x241b11, rng.rango(0.12, 0.26), { asp: rng.rango(1, 2.4), rot: rng() * 3.14, n: 5 });
    for (let i = 0; i < 30; i++) d.blob(rng.rango(-46, 46), rng.rango(-44, 46), rng.rango(1.5, 3.4), 0x5a5c30, rng.rango(0.12, 0.2), { n: 4 });
    // cráteres: hollín central, borde de tierra removida más clara, agua turbia en el fondo y casquillos/esquirlas repartidos
    for (const c of crateres) {
      d.blob(c.x, c.z, c.r * 1.05, 0x120f0a, 0.4, { n: 6 });
      for (let k = 0; k < 18; k++) {
        const a = (k / 18) * 6.2832 + rng() * 0.3, rr = c.r * rng.rango(1.0, 1.28);
        d.blob(c.x + Math.cos(a) * rr, c.z + Math.sin(a) * rr, rng.rango(0.5, 1.1), 0x8b7650, rng.rango(0.18, 0.32), { asp: 1.6, rot: a + 1.57, n: 3 });
      }
      for (let k = 0; k < 6; k++) { const a = rng() * 6.28, rr = c.r * rng.rango(0.7, 1.5); d.guijarros([c.x + Math.cos(a) * rr - 0.15, c.z + Math.sin(a) * rr - 0.15, c.x + Math.cos(a) * rr + 0.15, c.z + Math.sin(a) * rr + 0.15], 3, ESQUIRLAS, { rMin: 0.05, rMax: 0.12 }); }
    }
    // oruga del tanque: dos huellas que llegan desde el sur y se pierden en el barro
    const ct = Math.cos(tanque.rot), st = Math.sin(tanque.rot);
    d.rodada([[tanque.x - st * 13, tanque.z - ct * 13 + 6], [tanque.x - st * 6, tanque.z - ct * 6 + 2], [tanque.x - st * 2.5, tanque.z - ct * 2.5]], { sep: 2.5, grosor: 0.55, color: 0x1c150d, alpha: 0.5 });
    // rodadas de carros y camillas entre las trincheras
    d.rodada([[-44, 8], [-30, 10], [-14, 6.5], [2, 9], [20, 7]], { sep: 1.5, grosor: 0.2, color: 0x1c150d, alpha: 0.38 });
    d.rodada([[-40, -6], [-24, -5], [-8, -8], [8, -4]], { sep: 1.5, grosor: 0.2, color: 0x1c150d, alpha: 0.3 });
    d.rodada([[2, 12], [3, 18], [1, 20]], { sep: 1.4, grosor: 0.18, color: 0x1c150d, alpha: 0.34 });
    // botas: de las trincheras al centro y hacia la línea enemiga
    d.pisadas([[-8, 19], [-6, 12], [-3, 6], [-1, 2]], { alpha: 0.4 }); d.pisadas([[8, 19], [7, 11], [4, 5]], { alpha: 0.38 }); d.pisadas([[-14, -10], [-8, -6], [-2, -2]], { alpha: 0.36 });
    d.pisadas([[22, 18], [19, 10], [13, 6]], { alpha: 0.34 }); d.pisadas([[4, -12], [-2, -16], [-5, -30]], { alpha: 0.3 });
    // charcos de lodo repartidos (agua verdosa) y manchas de aceite junto al tanque
    for (let i = 0; i < 18; i++) { const x = rng.rango(-42, 42), z = rng.rango(-32, 38); d.charco(x, z, rng.rango(0.7, 1.7), rng.rango(0.5, 1.0), { rot: rng() * 3, agua: 0x59664f, borde: 0x181309, alpha: 0.5, brillo: 0xdfe8c0 }); }
    d.blob(tanque.x, tanque.z, 4.2, 0x0e0c0a, 0.34, { n: 6 });
    // hierba seca y matorral
    for (let i = 0; i < 160; i++) { const x = rng.rango(-46, 46), z = rng.rango(-44, 46); d.hierba(x, z, rng.rango(0.25, 0.5), rng.entero(10, 22), SECAS, { largo: rng.rango(0.2, 0.4) }); }
    // casquillos, esquirlas y piedras por todo el barro
    d.guijarros([-46, -44, 46, 46], 700, PIEDRA, { rMin: 0.03, rMax: 0.1 });
    d.guijarros([-30, -34, 30, 34], 160, CASQUILLOS, { rMin: 0.025, rMax: 0.045 });
    d.guijarros([-44, -40, 44, 44], 60, ESQUIRLAS, { rMin: 0.06, rMax: 0.15 });
  });
}
