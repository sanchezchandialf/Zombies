// Textos y nombres visibles que la interfaz necesita y que no están en los datos del juego.
// Todo en español. Los ids son los de src/datos/*.
import { ERAS } from '../datos/eras.js';

export const NOMBRE_VEHICULO = {
  caballo: 'Caballo de guerra', locomovil: 'Locomóvil', autoblindado: 'Autoblindado',
  muscle_car: 'Muscle car', blindado_tactico: 'Blindado táctico', aerodeslizador: 'Aerodeslizador',
};
export const NOMBRE_EMPLAZAMIENTO = {
  canon_campana: 'Cañón de campaña', gatling: 'Ametralladora Gatling', ametralladora_pesada: 'Ametralladora pesada',
  m60_fija: 'M60 fija', minigun_fija: 'Minigun fija', canon_plasma_fijo: 'Cañón de plasma',
};
export const NOMBRE_TORRETA = {
  organo_relojeria: 'Órgano de relojería', mini_gatling: 'Minigatling', torreta_maxim: 'Torreta Maxim',
  torreta_centinela: 'Torreta centinela', torreta_automatica: 'Torreta automática', torreta_laser: 'Torreta láser',
};
export const NOMBRE_EXPLOSIVO = {
  barril_polvora: 'Barriles de pólvora', caja_dinamita: 'Cajas de dinamita', bidon_combustible: 'Bidones de combustible',
  surtidor_gasolina: 'Surtidores de gasolina', bombona_gas: 'Bombonas de gas', celula_plasma: 'Células de plasma',
};
export const NOMBRE_INTERACTIVO = {
  campana_iglesia: 'Campana de la iglesia', farol_aceite: 'Faroles de aceite', carreta: 'Carreta',
  palanca_tren: 'Palanca del tren', deposito_agua: 'Depósito de agua', vagoneta: 'Vagoneta',
  alambrada: 'Alambradas', mina_terrestre: 'Minas terrestres', sirena_antiaerea: 'Sirena antiaérea',
  alarma_coche: 'Alarma de coche', surtidor_gasolina: 'Surtidor de gasolina', transformador: 'Transformador',
  valla_electrica: 'Valla eléctrica', generador: 'Generador', dron_suministros: 'Dron de suministros',
  torre_tesla: 'Torres Tesla', puerta_energia: 'Puertas de energía', celula_plasma: 'Células de plasma',
};
export const NOMBRE_ATAQUE = {
  carga: 'Carga', tajo_amplio: 'Tajo amplio', invocar: 'Invoca a la horda', lluvia_carbon: 'Lluvia de carbón',
  chorro_vapor: 'Chorro de vapor', mortero: 'Bombardeo de mortero', nube_gas: 'Nube de gas', derrape: 'Derrape',
  latigazo_cadena: 'Latigazo de cadena', rastro_fuego: 'Rastro de fuego', tentaculos: 'Tentáculos', esporas: 'Esporas',
  salto_aplastante: 'Salto aplastante', regenerar: 'Regeneración', barrido_laser: 'Barrido láser',
  enjambre_drones: 'Enjambre de drones', pulso_iem: 'Pulso IEM', nucleo_expuesto: 'Núcleo expuesto',
};
export const NOMBRE_DANIO = {
  bala: 'Bala', perforante: 'Perforante', explosivo: 'Explosivo', fuego: 'Fuego',
  golpe: 'Golpe', energia: 'Energía', veneno: 'Veneno', acido: 'Ácido',
};
export const NOMBRE_ARQUETIPO = {
  fusil: 'Fusil', pistola: 'Pistola', precision: 'Precisión', pesada: 'Pesada', ligera: 'Ligera',
  herramienta: 'Herramienta', arrojadiza: 'Arrojadiza', cuerpo: 'Cuerpo a cuerpo',
};
export const NOMBRE_COMPORTAMIENTO = {
  perseguir: 'Persigue sin descanso', embestir: 'Embiste en zigzag', distancia: 'Ataca a distancia',
  cargar: 'Carga en línea recta', apoyo: 'Apoya a la horda', suicida: 'Suicida',
};

/** Dificultades: el id viaja en `ui:jugar`. */
export const DIFICULTADES = [
  { id: 'facil', nombre: 'Recluta', nota: 'Hordas más pequeñas y zombis más blandos. Para aprender.' },
  { id: 'normal', nombre: 'Veterano', nota: 'La experiencia pensada por los diseñadores.' },
  { id: 'dificil', nombre: 'Pesadilla', nota: 'Más zombis, más élites y ningún respiro.' },
];
export const CALIDADES = [
  { id: 'baja', nombre: 'Baja' }, { id: 'media', nombre: 'Media' }, { id: 'alta', nombre: 'Alta' }, { id: 'ultra', nombre: 'Ultra' },
];

/** Estados del jugador que el HUD sabe pintar: id → { nombre, icono, tono }. */
export const ESTADOS = {
  envenenado: { nombre: 'Envenenado', icono: 'veneno', tono: 'malo' },
  ardiendo: { nombre: 'Ardiendo', icono: 'fuego', tono: 'malo' },
  acido: { nombre: 'Corroído', icono: 'acido', tono: 'malo' },
  silenciado: { nombre: 'Silenciado', icono: 'silencio', tono: 'malo' },
  ralentizado: { nombre: 'Ralentizado', icono: 'lento', tono: 'malo' },
  aturdido: { nombre: 'Aturdido', icono: 'aturdido', tono: 'malo' },
  potenciado: { nombre: 'Potenciado', icono: 'potenciado', tono: 'bueno' },
  invisible: { nombre: 'Invisible', icono: 'hab_acecho', tono: 'bueno' },
  curando: { nombre: 'Curándose', icono: 'curacion', tono: 'bueno' },
  escudo: { nombre: 'Protegido', icono: 'escudo', tono: 'bueno' },
  supresion: { nombre: 'Supresión', icono: 'hab_supresion', tono: 'bueno' },
  furia: { nombre: 'Furia', icono: 'potenciado', tono: 'bueno' },
};

/** Sabor de cada era para los momentos de la partida. */
export const SABOR_ERA = [
  { // Pólvora
    sello: 'Anno Domini', saltoRotulo: 'Salto temporal',
    dias: ['La niebla trae pasos.', 'Tañen las campanas a muerto.', 'Pólvora seca y pulso firme.', 'Los faroles tiemblan en la plaza.', 'Se oye una carga de caballería…'],
    superado: 'Amanece sobre Santa Ceniza.',
  },
  { // Vapor
    sello: 'Territorio de frontera', saltoRotulo: 'Salto temporal',
    dias: ['El polvo se levanta en el horizonte.', 'El telégrafo ha enmudecido.', 'Nadie baja del tren de las seis.', 'Carbón, plomo y malas noticias.', 'La caldera ruge bajo tierra…'],
    superado: 'El sol sale rojo sobre la vía.',
  },
  { // Trincheras
    sello: 'Parte de guerra', saltoRotulo: 'Salto temporal',
    dias: ['Bengalas sobre la alambrada.', 'El barro se mueve solo.', 'Calad bayonetas.', 'Llega gas desde el este.', 'El Mariscal pasa revista…'],
    superado: 'Alto el fuego hasta nueva orden.',
  },
  { // Atómica
    sello: 'Sesión doble', saltoRotulo: 'Salto temporal',
    dias: ['Esta noche, en el autocine: ellos.', 'La radio solo emite estática.', 'Depósito lleno, cargador lleno.', 'El neón parpadea y algo gruñe.', 'Ruge un V8 en la oscuridad…'],
    superado: 'Amanece sobre la Avenida Neón.',
  },
  { // Digital
    sello: 'Protocolo de contención', saltoRotulo: 'Salto temporal',
    dias: ['Brecha en el perímetro.', 'Señal perdida con el sector 4.', 'Contención en nivel rojo.', 'Evacuación cancelada.', 'El origen del brote ha despertado…'],
    superado: 'Perímetro asegurado. Por ahora.',
  },
  { // Sintética
    sello: 'Aurora // enlace activo', saltoRotulo: 'Salto temporal',
    dias: ['Anomalía biológica detectada.', 'La red de la ciudad susurra.', 'Lluvia ácida, munición fría.', 'El enjambre recalcula.', 'Faltan horas para 2100.', 'OMEGA está en línea.'],
    superado: 'Ciclo completado. Sigues con vida.',
  },
];

/** Subtítulo temático del día: usa el sabor de la era y el índice del día dentro de ella. */
export function subtituloDeDia(dia, eraIdx, hayJefe) {
  const s = SABOR_ERA[eraIdx] || SABOR_ERA[0];
  const primer = eraIdx * 5 + 1;
  let i = Math.max(0, dia - primer);
  if (hayJefe) i = s.dias.length - 1;
  return s.dias[Math.min(i, s.dias.length - 1)];
}

export const rangoDeEra = (era) => `${era.anios[0]} — ${era.anios[1]}`;
export const eraPorIdx = (i) => ERAS[Math.max(0, Math.min(ERAS.length - 1, i | 0))];

/** Controles (teclado y mando) para la pantalla de ayuda. */
export const CONTROLES = [
  { accion: 'Moverse', teclas: ['W', 'A', 'S', 'D'], mando: ['Stick izq.'] },
  { accion: 'Apuntar', teclas: ['Ratón'], mando: ['Stick der.'] },
  { accion: 'Disparar', teclas: ['Clic izq.'], mando: ['RT'] },
  { accion: 'Cuerpo a cuerpo', teclas: ['Clic der.', 'F'], mando: ['RB'] },
  { accion: 'Recargar', teclas: ['R'], mando: ['X'] },
  { accion: 'Usar · montar · reparar (mantener)', teclas: ['E'], mando: ['B'] },
  { accion: 'Habilidad del rol', teclas: ['Q'], mando: ['LB'] },
  { accion: 'Arrojadiza', teclas: ['G'], mando: ['LT'] },
  { accion: 'Cambiar de arma', teclas: ['1', '2', 'Rueda'], mando: ['Y'] },
  { accion: 'Esquivar', teclas: ['Espacio'], mando: ['A'] },
  { accion: 'Pausa', teclas: ['Esc', 'P'], mando: ['Start'] },
];
