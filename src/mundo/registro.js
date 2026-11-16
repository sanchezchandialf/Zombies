// Registro de tipos de objetos del mundo. Permite que varios módulos aporten tipos sin tocar mundo/index.js.
//   registrarTipo('campana_iglesia', (juego, opciones) => objeto)
// `opciones` = { x, z, rot, eraIdx, ... }. El objeto devuelto debe cumplir:
//   { tipo, pos: Vector3, grupo?: Object3D (ya añadido a la escena), cuerpo?: Cuerpo,
//     actualizar?(dt), posFisica?(dt), destruir() }   (+ interfaz Dañable si puede recibir daño)
// mundo.crear(tipo, opciones) busca aquí la fábrica, guarda el objeto en mundo.objetos, lo actualiza cada cuadro
// y llama a destruir() en mundo.limpiar().
export const fabricas = new Map();
export function registrarTipo(tipo, fabrica) { fabricas.set(tipo, fabrica); }
export function tiposRegistrados() { return [...fabricas.keys()]; }
