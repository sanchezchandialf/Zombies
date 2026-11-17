// Sistema de jugadores (§Jugadores del contrato). La entidad está en ./jugador/jugador.js; las habilidades de rol en
// ./jugador/habilidades.js y los estados en ./jugador/estados.js.
//
// API del contrato: crear(indice, rolId, x, z) · limpiar() · alCambiarEra(eraIdx) · reanimarTodos()
// API añadida:      porIndice(i) · vivos() · destruir()
// Notas para otros módulos:
//  · `jugador.vivo` es false tanto si está caído (jugador.caido, reanimable) como si ha muerto (jugador.muerto).
//  · La cámara (render.seguir) la gestiona el Director; este sistema no la toca.
import { ROLES } from '../datos/roles.js';
import { Jugador } from './jugador/jugador.js';

export function crearJugadores(juego) {
  const offs = [];

  const api = {
    /** Crea un jugador y lo añade a juego.jugadores. Un índice repetido sustituye al anterior. */
    crear(indice, rolId, x = 0, z = 0) {
      const rol = ROLES[rolId] ?? ROLES.soldado;
      const previo = api.porIndice(indice);
      if (previo) { previo.destruir(); const i = juego.jugadores.indexOf(previo); if (i >= 0) juego.jugadores.splice(i, 1); }
      const j = new Jugador(juego, indice, rol, x, z);
      juego.jugadores.push(j);
      juego.jugadores.sort((a, b) => a.indice - b.indice);
      return j;
    },

    porIndice(i) { return juego.jugadores.find((j) => j.indice === i) ?? null; },
    vivos() { return juego.jugadores.filter((j) => j.vivo); },

    limpiar() {
      for (const j of juego.jugadores) { try { j.destruir?.(); } catch (e) { console.error('[jugadores] error al limpiar', e); } }
      juego.jugadores.length = 0;
    },

    /** Reequipa a todos con las armas y el atuendo de la nueva era (munición llena). */
    alCambiarEra(eraIdx) {
      for (const j of juego.jugadores) {
        try { j.equipar?.(eraIdx, true); } catch (e) { console.error('[jugadores] error al reequipar', e); }
      }
    },

    /** Al acabar una oleada: los caídos vuelven a la lucha. */
    reanimarTodos() {
      for (const j of juego.jugadores) { j.nuevaOleada(); if (j.caido) j.reanimar(0.6, 2.5); }
    },

    actualizar(dt) {
      for (const j of juego.jugadores) j.actualizar(dt);
    },
    posFisica(dt) {
      for (const j of juego.jugadores) j.posFisica(dt);
    },

    destruir() { for (const f of offs) f(); offs.length = 0; api.limpiar(); },
  };

  // Pasivas que dependen de eventos del combate.
  offs.push(juego.eventos.en('zombi:muerte', (d) => {
    const a = d?.atacante ?? d?.info?.atacante;
    if (a && a.bando === 'jugadores' && a.comp) a.comp.alBaja?.(a, d.zombi);
  }));
  offs.push(juego.eventos.en('danio', (d) => {
    const a = d?.atacante;
    if (!a || a.bando !== 'jugadores' || !a.comp) return;
    a.comp.alImpacto?.(a, d);
    // Robo de vida (mejoras): fracción del daño infligido a zombis.
    const rv = a.mods?.robovida;
    if (rv > 0 && a.vivo && d.objetivo?.bando === 'zombis' && d.cantidad > 0) a.curar(Math.min(d.cantidad, 400) * rv, true);
  }));
  offs.push(juego.eventos.en('oleada:inicio', () => { for (const j of juego.jugadores) j.nuevaOleada(); }));

  return api;
}
