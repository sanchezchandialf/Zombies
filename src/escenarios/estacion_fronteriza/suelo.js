// ERA Z · Estación Cruz del Diablo: capa de detalle del suelo (polvo, rodadas, grietas, hierba seca, gravilla, manchas de oficio).
import { capaSuelo } from '../villa_colonial/detalle.js';

const SECAS = [0xd2bd74, 0xc2a85e, 0xe0cd8a, 0xb09a52, 0x9fa862, 0xc9b36a];
const PIEDRA = [0xb89b73, 0x9c8260, 0xc4a87e, 0x7d6a52, 0xa79684, 0x8c7456];
const PAJA = [0xe2c872, 0xd0b25a, 0xecd68c, 0xbf9e48];

export function detalleEstacion(kit, rng, { edificios, abrevaderos }) {
  capaSuelo(kit, { x0: -48, z0: -48, x1: 48, z1: 48, ppm: 30, y: 0.014, semilla: 23, rugosidad: 0.96 }, (d) => {
    // polvo claro arrastrado por el viento sobre la tierra oscura (rompe la mancha uniforme y aclara el suelo para ver la sangre)
    for (let i = 0; i < 90; i++) d.blob(rng.rango(-46, 46), rng.rango(-44, 46), rng.rango(2, 5.5), rng() < 0.7 ? 0xc89c62 : 0xd8b27a, rng.rango(0.12, 0.26), { asp: rng.rango(1, 2.2), rot: rng() * 3.14, n: 5 });
    // tierra pisada oscura en la calle principal y ante las puertas
    d.blob(0, 1, 12, 0xd2a870, 0.2, { asp: 4, n: 14 }); d.blob(-2, 5, 8, 0xd8b27a, 0.14, { asp: 2.4, n: 8 });
    d.blob(-22, -9.5, 5, 0x3c2819, 0.38, { asp: 2.4, n: 5 }); d.blob(-3, -9.5, 3.4, 0x3c2819, 0.36, { asp: 2, n: 4 }); d.blob(19, -9.5, 5.4, 0x3c2819, 0.38, { asp: 2.4, n: 5 });
    d.blob(-17, -26.5, 6, 0x3c2819, 0.3, { asp: 2.6, n: 5 }); d.blob(-30, 29.5, 4, 0x3c2819, 0.38, { asp: 2, n: 4 }); d.blob(28, 31, 4.5, 0x3c2819, 0.36, { asp: 2, n: 4 });
    // rodadas de carretas por la calle y hacia la mina, la herrería y el establo
    d.rodada([[-46, 0.4], [-34, 1.4], [-20, 0.6], [-8, 1.6], [6, 0.8], [20, 1.8], [34, 0.9], [46, 1.4]], { sep: 1.55, grosor: 0.22, color: 0x6a4524, alpha: 0.3 });
    d.rodada([[-46, 3.6], [-30, 4.4], [-10, 3.4], [10, 4.2], [30, 3.2], [46, 3.8]], { sep: 1.5, grosor: 0.18, color: 0x6a4524, alpha: 0.22 });
    d.rodada([[0.6, 12], [-0.4, 22], [0.8, 34], [0.2, 46]], { sep: 1.5, grosor: 0.2, color: 0x6a4524, alpha: 0.26 });
    d.rodada([[-30, 13], [-30.6, 18], [-30, 20]], { sep: 1.4, grosor: 0.18, color: 0x6a4524, alpha: 0.24 });
    d.rodada([[28, 12], [27.6, 18], [28, 22]], { sep: 1.4, grosor: 0.18, color: 0x6a4524, alpha: 0.24 });
    d.rodada([[12, -12], [13, -24], [11, -34]], { sep: 1.4, grosor: 0.16, color: 0x6a4524, alpha: 0.22 });
    // huellas de botas y de caballos entre el saloon, el sheriff y el almacén
    d.pisadas([[-24, -9], [-14, -4], [-4, -8]], { alpha: 0.34 }); d.pisadas([[19, -9], [10, -2], [2, 4]], { alpha: 0.34 }); d.pisadas([[-8, -30], [-6, -20], [-2, -12]], { alpha: 0.32 });
    d.pisadas([[-4, 8], [-2, 16], [-3, 26]], { alpha: 0.3 }); d.pisadas([[30, 10], [33, 2], [36, -8]], { alpha: 0.3 });
    // tierra seca agrietada fuera de la calle
    for (let i = 0; i < 46; i++) {
      const x = rng.rango(-46, 46), z = rng.rango(-44, 46);
      if (Math.abs(z - 1) < 8) continue;
      d.grieta(x, z, rng.rango(1.2, 3.2), rng() * 6.28, { alpha: 0.5, ancho: 0.03, color: 0x1a0f08 });
    }
    // manchas de oficio: carbón (andén y vía), ceniza y hollín (fragua), grasa (locomotora), agua derramada (abrevaderos)
    d.blob(28, -35.5, 3.6, 0x1b1a1c, 0.45, { n: 6 }); d.blob(-22.5, 25, 3.4, 0x211a15, 0.4, { n: 6 }); d.blob(-24, 27, 4.2, 0x2a2018, 0.3, { asp: 1.6, n: 5 });
    d.blob(12, -33.5, 3.6, 0x3a2a1c, 0.35, { n: 5 }); d.blob(36, -19, 4.5, 0x231d18, 0.32, { asp: 1.5, n: 5 });
    for (const [x, z] of abrevaderos) d.charco(x + 0.3, z + 1.5, 1.6, 0.8, { rot: rng() * 0.4, agua: 0x8a7458, borde: 0x3a2814, alpha: 0.4, brillo: 0xffd9a0 });
    d.charco(-8, 5.5, 1.5, 0.8, { rot: 0.2, agua: 0x8a7458, borde: 0x3a2814, alpha: 0.38, brillo: 0xffd9a0 });
    d.charco(13, 7, 1.2, 0.7, { rot: -0.3, agua: 0x8a7458, borde: 0x3a2814, alpha: 0.38, brillo: 0xffd9a0 });
    // balasto desparramado junto a la vía y el andén
    d.guijarros([-47, -43, 47, -36.5], 700, [0x8c867c, 0x6d6760, 0xa39c90, 0x5b5650], { rMin: 0.03, rMax: 0.08 });
    // gravilla y piedras por toda la tierra
    d.guijarros([-46, -42, 46, 46], 800, PIEDRA, { rMin: 0.03, rMax: 0.1 });
    // hierba seca en matas, junto a muros y en los bordes
    for (const e of edificios) {
      for (let x = -e.ancho / 2; x < e.ancho / 2; x += rng.rango(1.2, 2.8)) d.hierba(e.x + x, e.z + e.fondo / 2 + 0.35, rng.rango(0.22, 0.4), rng.entero(10, 18), SECAS, { largo: 0.3 });
    }
    for (let i = 0; i < 170; i++) {
      const x = rng.rango(-46, 46), z = rng.rango(-42, 46);
      if (Math.abs(z - 1) < 7) continue;
      d.hierba(x, z, rng.rango(0.25, 0.55), rng.entero(12, 26), SECAS, { largo: rng.rango(0.25, 0.45) });
    }
    // paja del establo y el corral
    d.paja(14.5, 29, 3, 70, PAJA, { largo: 0.45 }); d.paja(28, 31.5, 3.4, 60, PAJA, { largo: 0.45 }); d.paja(16, 25, 4.2, 40, PAJA, { largo: 0.4 }); d.paja(31, -4.5, 2.5, 30, PAJA);
    // grava de mina
    d.blob(35, -19.5, 3, 0x2a2420, 0.4, { n: 4 });
    d.guijarros([32, -22, 38, -17], 90, [0x3a3430, 0x514941, 0x2a2624], { rMin: 0.04, rMax: 0.12 });
  });
}
