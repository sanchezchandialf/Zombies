// Ajustes de sensación del jugador (doble palanca cenital). Todo en metros y segundos.
export const AJUSTE = {
  radio: 0.42, masa: 80, altura: 1.8,
  // Movimiento: aceleración y frenada altas para un control seco; por encima de `exceso`×vel. máx. (explosiones,
  // empujes, esquiva) la velocidad se disipa de forma exponencial en vez de frenar en seco.
  acel: 72, freno: 100, exceso: 1.22, disipacion: 6.5,
  giro: 32, giroPesado: 15, giroDemoledor: 11,
  // Penalizaciones de velocidad
  atras: 0.22,                       // hasta −22 % al ir de espaldas a la mira
  disparando: { pesada: 0.62, precision: 0.74, defecto: 0.93 },
  recargando: 0.96, cuerpo: 0.7,
  // Esquiva
  esquiva: { distancia: 4.4, duracion: 0.3, curva: 1.6, enfriamiento: 0.95, buffer: 0.18, extra: 0.05 },
  // Armas
  cambioArma: 0.26, bufferDisparo: 0.13, autoRecarga: 0.25,
  lanzarEnfriamiento: 0.55, lanzarMin: 1.6,
  // Reanimación
  reanimarRadio: 1.9, reanimarTiempo: 3, reanimarMedica: 0.3, reanimarVida: 0.45, reanimarInvuln: 2.2,
  gracia: 0.18,                      // ventana tras un golpe en la que el siguiente hace menos daño (evita el «triturado» instantáneo)
  graciaFactor: 0.4,
  usarRadioExtra: 0.3,
  // Reparación del Ingeniero (fracción de vida máxima por segundo)
  reparar: 0.14, repararAlcance: 2.6, repararGolpe: 0.28,
};

/** Rasgos propios de cada rol que no son habilidades: se leen en recibirDanio, esquiva y movimiento. */
export const RASGOS = {
  soldado: {},
  medico: { inmune: ['veneno', 'gas', 'infeccion'], resiste: { acido: 0.5 } },
  ingeniero: {},
  cazador: { esquivaDistancia: 2 },
  demoledor: { resiste: { golpe: 0.85 }, inamovible: true, masa: 900 },
};

/** Estados temporales con efecto: valores por defecto. */
export const ESTADOS = {
  envenenado: { dps: 4, tipo: 'veneno' },
  ardiendo: { dps: 7, tipo: 'fuego' },
  ralentizado: { factor: 0.6 },
  potenciado: { danio: 1.35, cadencia: 1.15 },
  escudo: { cantidad: 60 },
};
