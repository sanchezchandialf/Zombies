// Sistema Mundo de ERA Z. API en docs/ARQUITECTURA.md §Mundo.
//   registro.js          registro de tipos (fábricas) que aportan varios módulos
//   explosivos.js        'explosivo': barril, dinamita, bidón, bombona, surtidor, célula de plasma
//   cajas.js             'caja' (destructible, botín) y 'empujable'
//   recogidas.js         'botiquin', 'municion', 'potenciador' y soltarBotin
//   emplazamientos.js    'emplazamiento': arma fija tripulable
//   construcciones.js    torretas y barricadas del Ingeniero
//   modelos.js           geometría procedural de todo lo anterior
//   interactivos/        (agente MUNDO-ERAS) interactivos propios de cada era
//
// Añadidos al contrato:
//   mundo.quitar(obj)                       destruye y retira un objeto de mundo.objetos
//   mundo.registrarEstructura(e) / quitarEstructura(e)   (añade/retira a mundo.estructuras; emite estructura:creada / destruida)
//   mundo.eraIdx                            era del escenario actual (juego.estado.eraIdx)
//   mundo.util                              ayudas de ./util.js
//   Un objeto con `eliminar === true` se destruye y retira solo al final del cuadro.
import { fabricas, registrarTipo, tiposRegistrados } from './registro.js';
import { crearResaltador, liberarModelos } from './util.js';
import * as util from './util.js';
import { instalarExplosivos } from './explosivos.js';
import { instalarCajas } from './cajas.js';
import { instalarRecogidas } from './recogidas.js';
import { instalarEmplazamientos } from './emplazamientos.js';
import { instalarConstrucciones } from './construcciones.js';

// Carga protegida de los interactivos de era (otro agente): si el archivo no existe o falla, el mundo sigue funcionando.
const modulosInteractivos = import.meta.glob('./interactivos/index.js');

export function crearMundo(juego) {
  const objetos = [];
  const interactivos = [];
  const estructuras = [];
  const avisos = new Set();
  const aviso = (clave, ...a) => { if (!avisos.has(clave)) { avisos.add(clave); console.warn('[mundo]', ...a); } };
  const resaltador = crearResaltador(juego);

  const mundo = {
    siempre: false,
    objetos, interactivos, estructuras, util, tiposRegistrados,
    get eraIdx() { return juego.estado?.eraIdx ?? 0; },

    async iniciar() {
      for (const cargar of Object.values(modulosInteractivos)) {
        try {
          const m = await cargar();
          m.instalar?.(juego, mundo);
          m.default?.(juego, mundo);
        } catch (e) { console.warn('[mundo] no se pudieron cargar los interactivos de era:', e); }
      }
    },

    crear(tipo, opciones = {}) {
      const fabrica = fabricas.get(tipo);
      if (!fabrica) { aviso('tipo:' + tipo, 'tipo desconocido:', tipo); return null; }
      let obj = null;
      try {
        const o = { ...opciones };
        if (o.eraIdx == null) o.eraIdx = juego.estado?.eraIdx ?? 0;
        obj = fabrica(juego, o);
      } catch (e) { console.error('[mundo] error al crear', tipo, e); return null; }
      if (!obj) return null;
      if (!obj.tipo) obj.tipo = tipo;
      objetos.push(obj);
      return obj;
    },

    /** Destruye un objeto creado con crear() y lo retira. */
    quitar(obj) {
      const i = objetos.indexOf(obj);
      if (i >= 0) objetos.splice(i, 1);
      if (obj && !obj._destruido) {
        obj._destruido = true;
        try { obj.destruir?.(); } catch (e) { console.error('[mundo] error al destruir', obj.tipo, e); }
      }
      mundo.quitarEstructura(obj);
    },

    registrarInteractivo(obj) {
      if (obj && !interactivos.includes(obj)) interactivos.push(obj);
      return obj;
    },
    quitarInteractivo(obj) { const i = interactivos.indexOf(obj); if (i >= 0) interactivos.splice(i, 1); },

    /** Interactivo utilizable más cercano al jugador (dentro de su radioUso). Marca el halo pulsante. */
    interactivoCercano(jugador) {
      if (!jugador?.pos) return null;
      const px = jugador.pos.x, pz = jugador.pos.z;
      let mejor = null, md = Infinity;
      for (let i = 0; i < interactivos.length; i++) {
        const o = interactivos[i];
        if (!o?.pos || o.activo === false) continue;
        const d = Math.hypot(o.pos.x - px, o.pos.z - pz);
        if (d > (o.radioUso ?? 1.8) || d >= md) continue;
        if (o.puedeUsar) { let ok = false; try { ok = o.puedeUsar(jugador); } catch (e) { ok = false; } if (!ok) continue; }
        md = d; mejor = o;
      }
      if (mejor) resaltador.marcar(jugador.indice ?? 0, mejor);
      return mejor;
    },

    registrarEstructura(e) {
      if (!e || estructuras.includes(e)) return e;
      estructuras.push(e);
      juego.eventos.emitir('estructura:creada', { estructura: e });
      const nav = juego.sistemas?.zombis?.navegacion;
      (nav?.reconstruirSuave ?? nav?.reconstruir)?.call(nav);
      return e;
    },
    quitarEstructura(e) {
      const i = estructuras.indexOf(e);
      if (i < 0) return;
      estructuras.splice(i, 1);
      juego.eventos.emitir('estructura:destruida', { estructura: e });
      const nav = juego.sistemas?.zombis?.navegacion;
      (nav?.reconstruirSuave ?? nav?.reconstruir)?.call(nav);
    },

    soltarBotin(x, z, opciones) { return mundo._recogidas?.soltarBotin(x, z, opciones); },
    desplegarTorreta(jugador) { return mundo._construcciones?.desplegarTorreta(jugador) ?? null; },
    desplegarBarricada(jugador) { return mundo._construcciones?.desplegarBarricada(jugador) ?? null; },

    limpiar() {
      for (let i = objetos.length - 1; i >= 0; i--) {
        const o = objetos[i];
        if (!o._destruido) { o._destruido = true; try { o.destruir?.(); } catch (e) { console.error('[mundo] destruir', e); } }
      }
      objetos.length = 0;
      for (const e of estructuras) { if (!e._destruido) { e._destruido = true; try { e.destruir?.(); } catch (er) { console.error(er); } } }
      estructuras.length = 0;
      interactivos.length = 0;
      mundo._construcciones?.limpiar?.();
      resaltador.actualizar(0);
    },

    actualizar(dt) {
      const n = objetos.length;
      for (let i = 0; i < n && i < objetos.length; i++) {
        const o = objetos[i];
        if (!o || !o.actualizar) continue;
        try { o.actualizar(dt); } catch (e) { aviso('act:' + o.tipo, 'error al actualizar', o.tipo, e); }
      }
      mundo._construcciones?.actualizar?.(dt);
      for (let i = objetos.length - 1; i >= 0; i--) if (objetos[i]?.eliminar) mundo.quitar(objetos[i]);
      resaltador.actualizar(dt);
    },

    posFisica(dt) {
      for (let i = 0; i < objetos.length; i++) {
        const o = objetos[i];
        if (!o?.posFisica) continue;
        try { o.posFisica(dt); } catch (e) { aviso('pos:' + o.tipo, 'error en posFisica', o.tipo, e); }
      }
      mundo._construcciones?.posFisica?.(dt);
    },

    destruir() { mundo.limpiar(); resaltador.limpiar(); liberarModelos(); },
  };

  instalarExplosivos(juego, mundo);
  instalarCajas(juego, mundo);
  mundo._recogidas = instalarRecogidas(juego, mundo);
  instalarEmplazamientos(juego, mundo);
  mundo._construcciones = instalarConstrucciones(juego, mundo);
  return mundo;
}

export { registrarTipo };
