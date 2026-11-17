// ERA Z · Campo de pruebas: mapa de reserva y EJEMPLO DE REFERENCIA del kit (docs/ESCENARIOS.md).
// Se usa cuando el escenario de una era aún no existe o falla. Se adapta al aspecto de la era (?era=N en pruebas/escenarios.html).
//
// Estructura recomendada de un mapa:
//   1) precargar materiales   2) suelo (+ pintura, zonas, parches)   3) edificios y obstáculos grandes (calles ≥ 4 m)
//   4) vallas y mobiliario    5) detalles (hojas, charcos, árboles)   6) luces   7) jugabilidad (explosivos, cajas, vehículos…)
//   8) return { grupo, limites, inicioJugadores, puntosAparicion }
import { ERAS } from '../datos/eras.js';

// Paleta por era: el campo de pruebas cambia de piel pero conserva la planta.
const PIEL = [
  { estilo: 'colonial', base: 'tierra', mezcla: 'hierba', plaza: 'adoquin', farola: 'aceite', vallas: 'madera', mojado: 0, obstaculo: 'silleria', tinte: 0xe6d3a8 },
  { estilo: 'madera', base: 'tierra', mezcla: 'arena', plaza: 'tablones', farola: 'gas', vallas: 'tablas', mojado: 0, obstaculo: 'tablas_viejas', tinte: 0x9a3b2e },
  { estilo: 'ladrillo', base: 'barro', mezcla: 'hierba', plaza: 'hormigon', farola: 'gas', vallas: 'alambre', mojado: 0.35, obstaculo: 'saco_arena', tinte: 0x8a8f6a },
  { estilo: 'prefabricado', base: 'asfalto_mojado', mezcla: 'losas_acera', plaza: 'losas_acera', farola: 'sodio', vallas: 'cadena', mojado: 0.5, obstaculo: 'hormigon', tinte: 0xe8b8c8 },
  { estilo: 'prefabricado', base: 'hormigon', mezcla: 'losas_acera', plaza: 'baldosa_hospital', farola: 'led', vallas: 'cadena', mojado: 0, obstaculo: 'hormigon', tinte: 0xd9dde0 },
  { estilo: 'futurista', base: 'composite_futurista', mezcla: 'hormigon', plaza: 'composite_futurista', farola: 'sintetica', vallas: 'hierro', mojado: 0.2, obstaculo: 'casco_nave', tinte: 0x35e6ff },
];

export async function construir(juego, kit) {
  const eraIdx = kit.eraIdx, era = ERAS[eraIdx], P = PIEL[eraIdx] ?? PIEL[0];
  const rng = kit.rng(eraIdx + 11);
  await kit.precargar([P.base, P.mezcla, P.plaza, 'silleria', 'estuco_desconchado', 'ladrillo_rojo', 'ladrillo_encalado', 'teja_arabe', 'tablas_pintadas',
    'tablas_viejas', 'hierro_forjado', 'chapa_ondulada', 'hormigon', 'tablones', 'troncos', 'hierro_oxidado', 'tela_asfaltica', P.obstaculo]);

  // ───────────── 1. SUELO ─────────────
  // Mezcla de dos suelos pintada a mano: 0 = base, 1 = mezcla. Una cruz de caminos y la plaza central quedan limpias de hierba.
  kit.suelo({
    tam: 160, material: P.base, mezcla: P.mezcla, mojado: P.mojado, semilla: 3,
    relieve: { amp: 0.06, escala: 16, centroPlano: 55 },
    pintura: (p) => {
      p.fondo(0.0);
      p.rect(-80, -80, 80, -49, 1, 4).rect(-80, 49, 80, 80, 1, 4).rect(-80, -80, -49, 80, 1, 4).rect(49, -80, 80, 80, 1, 4);   // periferia
      p.salpicar(-48, -48, 48, 48, 26, 2, 5, 1, 1.4);                                    // matas dispersas
      p.circulo(0, 0, 17, 0, 3).camino([[-48, 0], [0, 0], [48, 0]], 8, 0, 2).camino([[0, -48], [0, 0], [0, 48]], 7, 0, 2);   // plaza y cruz de caminos despejados
      p.romper(6, 0.32);
    },
  });
  // Plaza central elevada con borde de piedra.
  kit.zona({ circulo: { x: 0, z: 0, r: 13 }, material: P.plaza, alto: 0.03, borde: { material: 'silleria', ancho: 0.4, alto: 0.12 }, mojado: P.mojado });

  // ───────────── 2. EDIFICIOS (3-5 volúmenes grandes que crean calles) ─────────────
  const casa = kit.edificio({ x: -28, z: -23, ancho: 14, fondo: 9, pisos: 2, estilo: P.estilo, colorMuro: P.tinte, tejado: { chimenea: true }, balcon: eraIdx < 2, puertas: [{ cara: 'sur', u: -2.5, arco: eraIdx === 0 }], luzPuertas: true, semilla: 1, nombre: 'casa_norte' });
  kit.edificio({ x: 26, z: -26, ancho: 13, fondo: 9, pisos: 1, alto: 5.2, estilo: eraIdx >= 3 ? P.estilo : 'industrial', puertas: [{ cara: 'sur', u: 0, ancho: 2.6, alto: 3.2 }], ventanas: { sep: 3.6, luz: 0.35 }, semilla: 2, nombre: 'almacen' });
  kit.edificio({ x: -31, z: 20, ancho: 9, fondo: 7, pisos: 1, estilo: eraIdx === 0 ? 'encalado' : P.estilo, rot: 0.1, tejado: { chimenea: eraIdx < 3 }, puertas: [{ cara: 'sur', u: 1 }], semilla: 3, nombre: 'casa_oeste' });
  kit.edificio({ x: 31, z: 23, ancho: 8, fondo: 11, pisos: 1, alto: 5.6, estilo: eraIdx < 2 ? 'piedra' : P.estilo, tejado: { eje: 'z', pendiente: 0.7 }, puertas: [{ cara: 'oeste', u: 0, arco: true }], semilla: 4, nombre: 'capilla' });

  // ───────────── 3. OBSTÁCULOS Y VALLAS (cuellos de botella ≥ 4 m) ─────────────
  // Barreras que forman una chicane al oeste y otra al este de la plaza.
  kit.valla({ puntos: [[-14, -9], [-6, -9]], tipo: 'barrera', colision: 'alta' });
  kit.valla({ puntos: [[-12, 12], [-4, 12]], tipo: 'barrera', colision: 'alta' });
  kit.valla({ puntos: [[6, 10], [14, 10]], tipo: 'barrera', colision: 'alta' });
  // Corral al noreste: dos tramos con una puerta de 5 m.
  kit.valla({ puntos: [[10, -14], [22, -14]], tipo: P.vallas, colision: 'baja' });
  kit.valla({ puntos: [[22, -14], [22, -4]], tipo: P.vallas, colision: 'baja' });
  kit.valla({ puntos: [[10, -9], [10, -4]], tipo: P.vallas, colision: 'baja' });
  // Muro bajo de piedra/sacos junto al camino sur y rocas.
  kit.bloque({ x: -17, z: 33, ancho: 7, fondo: 1.2, alto: 1.1, material: P.obstaculo, nombre: 'muro_sur' });
  kit.bloque({ x: 18, z: 34, ancho: 5, fondo: 1.2, alto: 1.1, material: P.obstaculo, rot: 0.3, nombre: 'muro_sur2' });
  kit.roca({ x: -38, z: -6, radio: 1.7, semilla: 1 }); kit.roca({ x: 39, z: 4, radio: 1.4, semilla: 2 }); kit.roca({ x: 6, z: -36, radio: 1.2, semilla: 3 });
  // Árboles (muertos en las eras bélicas)
  const arboles = kit.dispersar({ area: [{ x0: -44, z0: -44, x1: -34, z1: 44 }, { x0: 34, z0: -44, x1: 44, z1: 44 }], cantidad: 8, distMin: 7, libre: 3, semilla: 5 });
  for (const a of arboles) kit.arbol({ x: a.x, z: a.z, tipo: eraIdx === 1 || eraIdx === 2 ? 'muerto' : 'roble', escala: a.esc, semilla: Math.floor(a.u * 100) });

  // Postes y catenaria cruzando la calle central
  const pa = kit.poste({ x: -8, z: -40, alto: 7.5, tipo: eraIdx >= 3 ? 'metal' : 'madera' }), pb = kit.poste({ x: 8, z: -40, alto: 7.5, tipo: eraIdx >= 3 ? 'metal' : 'madera' });
  kit.catenaria({ desde: [-8, pa.puntaY, -40], hasta: [8, pb.puntaY, -40], caida: 0.9 });

  // ───────────── 4. DETALLES DE SUELO ─────────────
  const evitar = kit._edificios.map((e) => ({ x: e.x, z: e.z, hx: e.ancho / 2, hz: e.fondo / 2, rot: e.rot, margen: 1 }));
  kit.parches({ tipo: 'charco', area: { x0: -40, z0: -40, x1: 40, z1: 40 }, cantidad: P.mojado > 0 ? 12 : 5, radio: [0.9, 2.4], evitar, semilla: 7 });
  kit.parches({ tipo: 'mancha', area: { x0: -40, z0: -40, x1: 40, z1: 40 }, cantidad: 14, radio: [0.7, 1.8], evitar, color: 0x2b2118, opacidad: 0.55, semilla: 8 });
  for (let i = 0; i < 7; i++) kit.parche({ tipo: 'hojas', x: rng.rango(-38, 38), z: rng.rango(-38, 38), radio: rng.rango(2, 4), cantidad: 26, semilla: i });

  // ───────────── 5. LUCES (≤ 10 locales) ─────────────
  const posFarolas = [[-9, -4], [9, -4], [-9, 5], [9, 5]];
  for (const [x, z] of posFarolas) kit.farola({ x, z, tipo: P.farola, rot: x < 0 ? 0 : Math.PI });
  kit.farola({ x: 0, z: -17, tipo: P.farola, rot: Math.PI / 2, luz: false }); // sin luz local: solo el emisivo

  // ───────────── 6. JUGABILIDAD (llamadas de ejemplo; los otros sistemas pueden aún no existir) ─────────────
  const m = juego.mundo, vh = juego.vehiculos;
  const explosivos = kit.dispersar({ area: [{ x0: -38, z0: -36, x1: 38, z1: 36 }], cantidad: 8, distMin: 12, libre: 1.2, semilla: 21, evitar: [{ x: 0, z: 0, r: 9 }, ...evitar] });
  for (const p of explosivos) m?.crear?.('explosivo', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  const cajas = kit.dispersar({ area: [{ x0: -38, z0: -36, x1: 38, z1: 36 }], cantidad: 7, distMin: 9, libre: 1, semilla: 22, evitar: [{ x: 0, z: 0, r: 6 }, ...evitar] });
  for (const p of cajas) m?.crear?.('caja', { x: p.x, z: p.z, rot: p.rot, eraIdx });
  m?.crear?.('emplazamiento', { x: -16, z: 2, rot: Math.PI / 2, eraIdx });
  m?.crear?.('emplazamiento', { x: 17, z: -22, rot: -Math.PI / 2, eraIdx });
  vh?.crear?.(era.vehiculo, { x: 0, z: 22, rot: Math.PI });
  vh?.crear?.(era.vehiculo, { x: -20, z: -4, rot: 0.4 });
  for (const id of era.interactivos) { const p = rng.elegir(explosivos); m?.crear?.(id, { x: p.x + 2.5, z: p.z + 1.5, eraIdx }); }

  // ───────────── 7. DATOS DEL MAPA ─────────────
  const puerta = casa.puertas[0];
  return {
    grupo: kit.grupo,
    limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 },
    inicioJugadores: [{ x: -1.5, z: 3 }, { x: 1.5, z: 3 }],
    puntosAparicion: [
      { x: -42, z: -32, tipo: 'borde' }, { x: -42, z: 0, tipo: 'borde' }, { x: -42, z: 32, tipo: 'borde' },
      { x: 42, z: -32, tipo: 'borde' }, { x: 42, z: 0, tipo: 'borde' }, { x: 42, z: 32, tipo: 'borde' },
      { x: -22, z: -42, tipo: 'borde' }, { x: 0, z: -42, tipo: 'borde' }, { x: 22, z: -42, tipo: 'borde' },
      { x: -22, z: 42, tipo: 'borde' }, { x: 0, z: 42, tipo: 'borde' }, { x: 22, z: 42, tipo: 'borde' },
      { x: puerta.x, z: puerta.z + 1.5, tipo: 'interior', peso: 0.6 },        // la puerta de la casa norte
      { x: 16, z: -9, tipo: 'interior', peso: 0.6 },                           // el corral
    ],
    zonas: [{ id: 'plaza', x: 0, z: 0, r: 13 }],
  };
}
