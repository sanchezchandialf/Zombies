// Ciclo día/noche y música del Director.
//
// La hora del juego es cíclica: 0 amanecer · 0,25 mediodía · 0,5 atardecer · 0,75 medianoche (1 = 0).
// Internamente se usa una hora «desenrollada» `horaU` entre 0,5 y 1,5 para que el avance sea continuo:
//   oleada:     0,5 (atardecer) → 1,0 (amanecer) según el avance de la oleada (medianoche a mitad)
//   intermedio: 1,0 (amanecer) → 1,5 (otra vez atardecer)
// `estado.hora = horaU % 1`; se avisa a `render.establecerHora(h)` solo cuando cambia de forma apreciable.
import { amortiguar, limitar } from '../nucleo/util.js';

export function crearCiclo(juego) {
  const estado = juego.estado;
  let horaU = 0.5, objetivo = 0.5, rapidez = 1.2, enviada = -1;
  let modoMusica = null, intensidadMusica = -1, tMusica = 0, eraMusica = -1;

  const publicar = (forzar) => {
    const h = ((horaU % 1) + 1) % 1;
    estado.hora = h;
    if (forzar || Math.abs(h - enviada) > 0.0015 || (h < 0.002 && enviada > 0.99)) {
      enviada = h;
      juego.render?.establecerHora?.(h);
    }
  };

  const api = {
    get horaU() { return horaU; },
    /** Salta a una hora desenrollada (0,5 = atardecer). */
    fijar(hU, enviarYa = true) { horaU = hU; objetivo = hU; publicar(enviarYa); },
    /** Hacia dónde avanza la hora y con qué rapidez (1/s de amortiguación). */
    apuntar(hU, k = 1.2) { objetivo = hU; rapidez = k; },
    actualizar(dt) {
      if (Math.abs(objetivo - horaU) > 1e-4) horaU = amortiguar(horaU, objetivo, rapidez, dt);
      publicar(false);
    },

    /** Música adaptativa: se reenvía al cambiar el modo o la intensidad (≥0,06) como mucho cada segundo. */
    musica(modo, intensidad = 0.3, dt = 0) {
      tMusica -= dt;
      const eraIdx = estado.eraIdx;
      const cambia = modo !== modoMusica || eraIdx !== eraMusica;
      if (!cambia && (tMusica > 0 || Math.abs(intensidad - intensidadMusica) < 0.06)) return;
      modoMusica = modo; intensidadMusica = limitar(intensidad, 0, 1); eraMusica = eraIdx; tMusica = 1;
      juego.audio?.musica?.({ eraIdx, intensidad: intensidadMusica, modo });
    },
    olvidarMusica() { modoMusica = null; intensidadMusica = -1; eraMusica = -1; tMusica = 0; },
  };
  return api;
}
