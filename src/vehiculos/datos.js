// Definiciones de los seis vehículos. Unidades SI. `def.vehiculo` en ERAS apunta a estos ids.
// Dimensiones: hx = semiancho, hz = semilargo de la caja de colisión (el modelo mira a +Z).
// Física arcade: acel (m/s²), freno (m/s²), vmax (m/s), giro (rad/s máx. de guiñada), agarre (1/s de eliminación del deslizamiento
// lateral: bajo = derrapa), resist (arrastre aerodinámico cuadrático), rodadura (m/s² constante).
export const VEHICULOS = {
  caballo: {
    id: 'caballo', nombre: 'Caballo de guerra', etiqueta: 'Montar caballo', era: 0, tipo: 'montura',
    masa: 620, hx: 0.36, hz: 1.05, vida: 420, material: 'carne', blindaje: 1.0,
    vmax: 11.5, vmaxEsprint: 15.5, vmaxAtras: 2.2, acel: 8.5, freno: 13, giro: 3.6, giroMin: 0.65, agarre: 13, resist: 0.004, rodadura: 1.6,
    atropello: 1.0, durezaChoque: 1.6, ocultaConductor: false, asiento: [0, 1.45, -0.12],
    arma: null, combustible: true,
  },
  locomovil: {
    id: 'locomovil', nombre: 'Locomóvil de vapor', etiqueta: 'Conducir locomóvil', era: 1, tipo: 'tractor',
    masa: 3000, hx: 1.3, hz: 2.55, vida: 2000, material: 'metal', blindaje: 0.55,
    vmax: 6.6, vmaxAtras: 2.0, acel: 2.4, freno: 6, giro: 0.95, giroMin: 0.0, agarre: 11, resist: 0.01, rodadura: 0.7,
    atropello: 1.7, durezaChoque: 0.5, ocultaConductor: true, asiento: [0, 2.0, -0.6],
    arma: null,
  },
  autoblindado: {
    id: 'autoblindado', nombre: 'Autoblindado Maxim', etiqueta: 'Conducir autoblindado', era: 2, tipo: 'coche',
    masa: 2500, hx: 1.05, hz: 2.3, vida: 1250, material: 'metal', blindaje: 0.5,
    vmax: 14.5, vmaxAtras: 4.5, acel: 5.2, freno: 11, giro: 1.9, giroMin: 0.0, agarre: 6.5, resist: 0.006, rodadura: 0.9,
    atropello: 1.15, durezaChoque: 0.8, ocultaConductor: true, asiento: [0, 1.6, -0.3],
    arma: 'carabina_m', armaMods: { danio: 1.5, municionInfinita: true, sobrecalentamiento: true }, alturaArma: 2.05, giroArma: 6,
  },
  muscle_car: {
    id: 'muscle_car', nombre: 'Muscle car', etiqueta: 'Conducir muscle car', era: 3, tipo: 'coche',
    masa: 1650, hx: 0.98, hz: 2.45, vida: 720, material: 'metal', blindaje: 0.85,
    vmax: 27, vmaxAtras: 6, acel: 10.5, freno: 17, giro: 2.5, giroMin: 0.0, agarre: 3.0, resist: 0.0042, rodadura: 0.5,
    atropello: 1.0, durezaChoque: 1.2, ocultaConductor: true, asiento: [0, 1.0, -0.2],
    arma: null,
  },
  blindado_tactico: {
    id: 'blindado_tactico', nombre: 'Blindado táctico', etiqueta: 'Conducir blindado táctico', era: 4, tipo: 'coche',
    masa: 3000, hx: 1.3, hz: 2.8, vida: 2300, material: 'metal', blindaje: 0.4,
    vmax: 18.5, vmaxAtras: 5, acel: 6.3, freno: 13, giro: 1.6, giroMin: 0.0, agarre: 8, resist: 0.005, rodadura: 0.8,
    atropello: 1.3, durezaChoque: 0.55, ocultaConductor: true, asiento: [0, 1.7, 0.2],
    arma: 'carabina_tactica', armaMods: { danio: 1.4, municionInfinita: true, sobrecalentamiento: true }, alturaArma: 2.55, giroArma: 7,
  },
  aerodeslizador: {
    id: 'aerodeslizador', nombre: 'Aerodeslizador', etiqueta: 'Pilotar aerodeslizador', era: 5, tipo: 'aero',
    masa: 1400, hx: 1.05, hz: 2.2, vida: 900, material: 'metal', blindaje: 0.75,
    vmax: 21, vmaxAtras: 9, acel: 8.2, freno: 7, giro: 3.4, giroMin: 1.4, agarre: 1.25, resist: 0.0035, rodadura: 0.35,
    atropello: 0.9, durezaChoque: 1.0, ocultaConductor: false, asiento: [0, 0.85, -0.45],
    arma: 'rifle_pulsos', armaMods: { danio: 1.3, municionInfinita: true, sobrecalentamiento: true }, alturaArma: 1.2, giroArma: 9,
  },
};
export const IDS = Object.keys(VEHICULOS);
