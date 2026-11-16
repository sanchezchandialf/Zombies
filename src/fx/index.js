// PROVISIONAL — lo sustituye el agente de FX. API en docs/ARQUITECTURA.md §FX.
export function crearFx(juego) {
  return {
    emitir(nombre, pos, opciones) {},
    crearEmisor(nombre, pos, opciones) { return { pos, activo: true, detener() { this.activo = false; } }; },
    trazadora(desde, hasta, opciones) {},
    calco(tipo, x, z, tam, opciones) {},
    escombros(opciones) {},
    destello(pos, color, intensidad, duracion, radio) {},
    limpiar() {},
    actualizar(dt) {},
  };
}
