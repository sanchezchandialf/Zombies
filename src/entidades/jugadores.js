// PROVISIONAL — lo sustituye el agente de Jugadores. API en docs/ARQUITECTURA.md §Jugadores.
export function crearJugadores(juego) {
  return {
    crear(indice, rolId, x = 0, z = 0) { return null; },
    limpiar() { juego.jugadores.length = 0; },
    alCambiarEra(eraIdx) {},
    actualizar(dt) {}, posFisica(dt) {},
  };
}
