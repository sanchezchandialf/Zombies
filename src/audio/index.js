// PROVISIONAL — lo sustituye el agente de Audio. API en docs/ARQUITECTURA.md §Audio.
export function crearAudio(juego) {
  return {
    siempre: true,
    desbloquear() {},
    reproducir(nombre, opciones) {},
    bucle(nombre, opciones) { return { detener() {}, ajustar() {} }; },
    musica(opciones) {},
    volumen(maestro, musica, efectos) {},
    actualizar(dt) {},
  };
}
