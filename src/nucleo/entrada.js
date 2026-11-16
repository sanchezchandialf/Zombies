// PROVISIONAL — lo sustituye el agente de Jugadores. API en docs/ARQUITECTURA.md §Entrada.
export function intencionVacia() {
  return {
    moverX: 0, moverZ: 0,            // −1..1 en ejes del mundo (+X derecha, +Z hacia la cámara/abajo en pantalla)
    apuntar: { x: 0, z: 0 },         // punto del mundo al que apunta (ratón) — válido si !usaMando
    dirApuntar: { x: 0, z: 1 },      // dirección normalizada de apuntado (siempre válida)
    usaMando: false,
    disparar: false, disparoPulsado: false,
    recargar: false, usar: false, usarMantenido: false, habilidad: false, lanzar: false, cuerpo: false, esquivar: false,
    cambiar: 0, ranura: -1,
  };
}
export function crearEntrada(juego) {
  const vacia = intencionVacia();
  return { siempre: true, de(indice) { return vacia; }, actualizar(dt) {}, vibrar(indice, fuerza, duracion) {} };
}
