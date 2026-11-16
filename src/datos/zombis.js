// Clases de zombi. Cada una contrarresta a ciertos roles y es débil ante otros.
// resistencias: multiplicador del daño recibido por tipo (1 = normal, <1 resiste, >1 vulnerable).
// Tipos de daño: bala · perforante · explosivo · fuego · golpe · energia · veneno · acido
export const TIPOS_DANIO = ['bala', 'perforante', 'explosivo', 'fuego', 'golpe', 'energia', 'veneno', 'acido'];

export const ZOMBIS = {
  caminante: {
    id: 'caminante', nombre: 'Caminante', color: '#8fa37a',
    descripcion: 'El muerto común. Lento y torpe, pero nunca viene solo.',
    vida: 60, velocidad: 2.0, danio: 10, cadenciaAtaque: 1.0, alcance: 1.1, radio: 0.42, masa: 70, puntos: 10,
    resistencias: { bala: 1, perforante: 1, explosivo: 1.2, fuego: 1.2, golpe: 1, energia: 1 },
    comportamiento: 'perseguir', desdeDia: 1, peso: 10,
    counterDe: [], debilAnte: ['ingeniero', 'demoledor'],
    consejo: 'Peligroso solo en masa. Las torretas y los vehículos los arrasan.',
  },
  corredor: {
    id: 'corredor', nombre: 'Corredor', color: '#c9b458',
    descripcion: 'Esprinta en zigzag y salta sobre su presa. Poca vida, mucha prisa.',
    vida: 35, velocidad: 6.4, danio: 8, cadenciaAtaque: 1.6, alcance: 1.0, radio: 0.36, masa: 55, puntos: 15,
    resistencias: { bala: 1.2, perforante: 1, explosivo: 1, fuego: 1.3, golpe: 1, energia: 1 },
    comportamiento: 'embestir', desdeDia: 2, peso: 5,
    counterDe: ['cazador', 'demoledor'], debilAnte: ['soldado', 'ingeniero'],
    consejo: 'Desborda a quien dispara lento o no puede huir. El fuego automático y las torretas lo frenan en seco.',
  },
  acorazado: {
    id: 'acorazado', nombre: 'Acorazado', color: '#8d99a8',
    descripcion: 'Lleva la coraza de su época: del peto de coracero al exoesqueleto. Las balas corrientes rebotan.',
    vida: 180, velocidad: 1.7, danio: 18, cadenciaAtaque: 0.8, alcance: 1.2, radio: 0.5, masa: 140, puntos: 30,
    resistencias: { bala: 0.3, perforante: 1.3, explosivo: 1.5, fuego: 0.8, golpe: 0.7, energia: 1.2 },
    blindajeFrontal: true, // por la espalda recibe daño de bala normal
    comportamiento: 'perseguir', desdeDia: 3, peso: 3,
    counterDe: ['soldado', 'medico'], debilAnte: ['cazador', 'demoledor', 'ingeniero'],
    consejo: 'Usa perforantes, explosivos o rodéalo: su espalda no está blindada.',
  },
  escupidor: {
    id: 'escupidor', nombre: 'Escupidor', color: '#9be04a',
    descripcion: 'Vomita ácido a distancia. Derrite barricadas, torretas y carrocerías.',
    vida: 55, velocidad: 2.4, danio: 14, cadenciaAtaque: 0.45, alcance: 15, radio: 0.42, masa: 65, puntos: 25,
    resistencias: { bala: 1, perforante: 1.2, explosivo: 1, fuego: 1, golpe: 1.2, energia: 1 },
    danioEstructuras: 3, // multiplicador contra estructuras y vehículos
    comportamiento: 'distancia', desdeDia: 4, peso: 3,
    counterDe: ['ingeniero', 'demoledor'], debilAnte: ['cazador', 'medico', 'soldado'],
    consejo: 'Mantiene la distancia y castiga al que se queda quieto. Cázalo desde lejos antes de que derrita tus defensas.',
  },
  apestado: {
    id: 'apestado', nombre: 'Apestado', color: '#7fbf6a',
    descripcion: 'Hinchado de gas pútrido. Envenena a quien se acerca y revienta en una nube tóxica al morir.',
    vida: 110, velocidad: 1.6, danio: 12, cadenciaAtaque: 0.9, alcance: 1.2, radio: 0.6, masa: 120, puntos: 25,
    resistencias: { bala: 1, perforante: 0.9, explosivo: 1, fuego: 1.6, golpe: 0.8, energia: 1 },
    nube: { radio: 4, duracion: 7, dps: 9 }, // el fuego inflama la nube (explosión)
    comportamiento: 'perseguir', desdeDia: 6, peso: 2.5,
    counterDe: ['demoledor', 'soldado'], debilAnte: ['medico', 'cazador'],
    consejo: 'Nunca lo mates de cerca… salvo que seas Médica. El fuego hace estallar su nube.',
  },
  mole: {
    id: 'mole', nombre: 'Mole', color: '#a8695c',
    descripcion: 'Una montaña de músculo podrido. Carga en línea recta y arrasa barricadas, torretas y coches.',
    vida: 650, velocidad: 2.2, danio: 35, cadenciaAtaque: 0.6, alcance: 1.8, radio: 0.95, masa: 450, puntos: 80,
    resistencias: { bala: 0.8, perforante: 1.2, explosivo: 1.1, fuego: 0.9, golpe: 0.5, energia: 1 },
    puntoDebil: 'espalda', // críticos ×2 por detrás; aturdido tras chocar con un muro al cargar
    danioEstructuras: 4,
    comportamiento: 'cargar', desdeDia: 8, peso: 1,
    counterDe: ['ingeniero', 'medico'], debilAnte: ['cazador', 'demoledor'],
    consejo: 'Esquiva su carga para que se estrelle y quede aturdido; entonces dispara a la espalda.',
  },
  aullador: {
    id: 'aullador', nombre: 'Aullador', color: '#d98fd0',
    descripcion: 'Su chillido enloquece a la horda (velocidad +40 %) y silencia las habilidades cercanas.',
    vida: 70, velocidad: 2.6, danio: 8, cadenciaAtaque: 0.8, alcance: 1.0, radio: 0.4, masa: 60, puntos: 35,
    resistencias: { bala: 1.2, perforante: 1.2, explosivo: 1, fuego: 1, golpe: 1, energia: 1 },
    grito: { radio: 12, duracion: 5, enfriamiento: 9, silencio: 4 },
    comportamiento: 'apoyo', desdeDia: 9, peso: 1.2,
    counterDe: ['medico', 'ingeniero'], debilAnte: ['soldado', 'cazador'],
    consejo: 'Se esconde tras la horda. Es prioridad absoluta: mátalo antes de que chille.',
  },
  detonador: {
    id: 'detonador', nombre: 'Detonador', color: '#ff8a3c',
    descripcion: 'Carga el explosivo de su época —barril, dinamita, bombona, célula de plasma— y corre hacia ti.',
    vida: 45, velocidad: 4.6, danio: 70, cadenciaAtaque: 1, alcance: 1.6, radio: 0.42, masa: 70, puntos: 30,
    resistencias: { bala: 1.3, perforante: 1.3, explosivo: 2, fuego: 2, golpe: 1, energia: 1.3 },
    explosion: { radio: 4.5, danio: 70, danioEstructuras: 3 },
    comportamiento: 'suicida', desdeDia: 7, peso: 1.8,
    counterDe: ['ingeniero', 'cazador'], debilAnte: ['soldado', 'medico'],
    consejo: 'Reviéntalo lejos y en medio de la horda: su explosión también mata zombis.',
  },
};
export const LISTA_ZOMBIS = Object.values(ZOMBIS);

// Jefes: uno por era (último día de cada era) y el jefe final en 2100.
export const JEFES = {
  coracero: {
    id: 'coracero', nombre: 'El Coracero', era: 0, titulo: 'Capitán de la carga eterna',
    descripcion: 'Un coracero gigantesco, fundido con su peto y su sable. Carga como caballería.',
    vida: 2600, velocidad: 2.6, danio: 40, radio: 1.2, masa: 800, puntos: 1000,
    resistencias: { bala: 0.6, perforante: 1, explosivo: 1.2, fuego: 1, golpe: 0.5, energia: 1 },
    ataques: ['carga', 'tajo_amplio', 'invocar'],
  },
  fogonero: {
    id: 'fogonero', nombre: 'El Fogonero', era: 1, titulo: 'Corazón de caldera',
    descripcion: 'Un maquinista con una caldera incrustada en el torso. Escupe carbón ardiente y vapor a presión.',
    vida: 4200, velocidad: 2.3, danio: 45, radio: 1.3, masa: 1000, puntos: 1500,
    resistencias: { bala: 0.8, perforante: 1, explosivo: 1, fuego: 0.2, golpe: 0.6, energia: 1.2 },
    ataques: ['lluvia_carbon', 'chorro_vapor', 'carga', 'invocar'],
  },
  mariscal: {
    id: 'mariscal', nombre: 'El Mariscal', era: 2, titulo: 'Señor de la tierra de nadie',
    descripcion: 'Un oficial con máscara antigás y abrigo hecho de alambre de espino. Ordena bombardeos de mortero y gas.',
    vida: 6200, velocidad: 2.4, danio: 50, radio: 1.3, masa: 1000, puntos: 2000,
    resistencias: { bala: 0.8, perforante: 1, explosivo: 0.7, fuego: 1, golpe: 0.6, energia: 1 },
    ataques: ['mortero', 'nube_gas', 'tajo_amplio', 'invocar'],
  },
  rey_asfalto: {
    id: 'rey_asfalto', nombre: 'El Rey del Asfalto', era: 3, titulo: 'Motor V8 con hambre',
    descripcion: 'Un motero colosal fusionado con su moto: tubos de escape en la espalda y cadenas por brazos.',
    vida: 8800, velocidad: 3.4, danio: 55, radio: 1.4, masa: 1400, puntos: 2500,
    resistencias: { bala: 0.8, perforante: 1, explosivo: 0.9, fuego: 0.6, golpe: 0.6, energia: 1.2 },
    ataques: ['derrape', 'latigazo_cadena', 'rastro_fuego', 'invocar'],
  },
  paciente_cero: {
    id: 'paciente_cero', nombre: 'Paciente Cero', era: 4, titulo: 'El origen del brote',
    descripcion: 'El primer infectado, mutado durante décadas en un laboratorio. Tentáculos, esporas y regeneración.',
    vida: 12500, velocidad: 2.8, danio: 60, radio: 1.5, masa: 1600, puntos: 3500,
    resistencias: { bala: 0.9, perforante: 1.1, explosivo: 1, fuego: 1.3, golpe: 0.6, energia: 1 },
    ataques: ['tentaculos', 'esporas', 'salto_aplastante', 'regenerar', 'invocar'],
  },
  omega: {
    id: 'omega', nombre: 'OMEGA', era: 5, titulo: 'La plaga perfecta', final: true,
    descripcion: 'Un coloso mitad carne mitad máquina, la síntesis de tres siglos de plaga. Láseres, enjambres y un núcleo expuesto.',
    vida: 20000, velocidad: 3.0, danio: 70, radio: 1.7, masa: 2500, puntos: 10000,
    resistencias: { bala: 0.8, perforante: 1, explosivo: 0.9, fuego: 0.8, golpe: 0.5, energia: 0.7 },
    ataques: ['barrido_laser', 'enjambre_drones', 'pulso_iem', 'carga', 'nucleo_expuesto', 'invocar'],
  },
};
