// PROVISIONAL — lo sustituye el agente Director. API en docs/ARQUITECTURA.md §Director.
export function crearDirector(juego) {
  return {
    iniciarPartida(opciones) {},
    terminarPartida() {},
    actualizar(dt) {},
  };
}
