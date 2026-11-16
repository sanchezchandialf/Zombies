// Arranque: crea el juego y registra todos los sistemas. El orden de actualización lo fija PRIORIDAD (nucleo/juego.js).
import { Juego } from './nucleo/juego.js';
import { crearEntrada } from './nucleo/entrada.js';
import { crearRender } from './render/index.js';
import { crearFx } from './fx/index.js';
import { crearAudio } from './audio/index.js';
import { crearPersonajes } from './personajes/index.js';
import { crearCombate } from './combate/index.js';
import { crearJugadores } from './entidades/jugadores.js';
import { crearZombis } from './entidades/zombis.js';
import { crearVehiculos } from './vehiculos/index.js';
import { crearMundo } from './mundo/index.js';
import { crearEscenarios } from './escenarios/index.js';
import { crearDirector } from './oleadas/index.js';
import { crearUI } from './ui/index.js';

export async function arrancar(contenedor = document.getElementById('juego')) {
  const juego = new Juego({ contenedor });
  // El render va primero: crea juego.render.escena, que el resto necesita al construirse.
  juego.registrar('render', crearRender(juego));
  juego.registrar('entrada', crearEntrada(juego));
  juego.registrar('fx', crearFx(juego));
  juego.registrar('audio', crearAudio(juego));
  juego.registrar('personajes', crearPersonajes(juego));
  juego.registrar('combate', crearCombate(juego));
  juego.registrar('jugadores', crearJugadores(juego));
  juego.registrar('zombis', crearZombis(juego));
  juego.registrar('vehiculos', crearVehiculos(juego));
  juego.registrar('mundo', crearMundo(juego));
  juego.registrar('escenarios', crearEscenarios(juego));
  juego.registrar('director', crearDirector(juego));
  juego.registrar('ui', crearUI(juego));
  await juego.iniciar();
  window.juego = juego; // depuración y pruebas automáticas
  window.__lista = true;
  return juego;
}

arrancar();
