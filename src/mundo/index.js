// PROVISIONAL — lo sustituye el agente de Mundo. API en docs/ARQUITECTURA.md §Mundo.
export function crearMundo(juego) {
  const interactivos = [];
  return {
    interactivos, estructuras: [],
    crear(tipo, opciones) { return null; },
    registrarInteractivo(obj) { interactivos.push(obj); return obj; },
    quitarInteractivo(obj) { const i = interactivos.indexOf(obj); if (i >= 0) interactivos.splice(i, 1); },
    interactivoCercano(jugador) { return null; },
    soltarBotin(x, z, opciones) {},
    desplegarTorreta(jugador) { return null; },
    desplegarBarricada(jugador) { return null; },
    limpiar() { interactivos.length = 0; },
    actualizar(dt) {}, posFisica(dt) {},
  };
}
