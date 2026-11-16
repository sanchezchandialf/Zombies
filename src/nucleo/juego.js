// Núcleo: contiene el estado global, el registro de sistemas y el bucle principal.
// Cada sistema es un objeto con métodos opcionales:
//   iniciar()            → una vez, al arrancar (puede ser async)
//   actualizar(dt)       → cada cuadro, en orden de prioridad (menor primero)
//   posFisica(dt)        → justo después del paso de física (sincronizar pos ← cuerpo y colocar visuales)
//   redimensionar(w, h)  → al cambiar el tamaño de la ventana
//   siempre: true        → se actualiza también en pausa/menús (render, ui, audio, entrada) con dt de simulación 0
import { Eventos } from './eventos.js';
import { MundoFisico } from './fisica.js';
import { crearRng } from './util.js';

/** Orden de actualización de los sistemas. */
export const PRIORIDAD = {
  entrada: 10, jugadores: 20, zombis: 30, vehiculos: 40, mundo: 45, combate: 50,
  fisica: 60, escenarios: 65, director: 70, personajes: 80, fx: 85, audio: 90, ui: 95, render: 100,
};

function leerOpciones() {
  const o = {};
  try {
    const p = new URLSearchParams(location.search);
    for (const [k, v] of p) o[k] = v === '' ? true : isNaN(Number(v)) ? v : Number(v);
  } catch { /* sin URL */ }
  return o;
}

export class Juego {
  /** @param {{contenedor: HTMLElement}} o */
  constructor({ contenedor }) {
    this.contenedor = contenedor;
    this.eventos = new Eventos();
    this.fisica = new MundoFisico();
    /** Opciones de depuración por URL: ?rol=soldado&dia=11&auto=1&dios=1&semilla=7&calidad=alta&sinui=1 */
    this.opciones = leerOpciones();
    this.rng = crearRng(this.opciones.semilla ?? (Date.now() & 0xffff));
    this.tiempo = {
      ahora: 0,     // tiempo de simulación acumulado (s); se detiene en pausa
      dt: 0,        // paso de simulación de este cuadro (s), ya con escala
      real: 0,      // tiempo real acumulado (s)
      dtReal: 0,    // paso real de este cuadro (s)
      escala: 1,    // cámara lenta / congelación de impacto
      cuadro: 0,
    };
    /** Estado de partida. Lo escribe el director (src/oleadas); el resto solo lee. */
    this.estado = {
      fase: 'menu',        // 'menu' | 'jugando' | 'intermedio' | 'transicion' | 'victoria' | 'derrota'
      pausado: false,
      dia: 0, anio: 1800, eraIdx: 0,
      zombisRestantes: 0, zombisTotales: 0,
      puntos: 0, racha: 0, multiplicador: 1, bajas: 0,
      dificultad: 'normal',
      hora: 0.5,           // 0 amanecer · 0.25 mediodía · 0.5 atardecer · 0.75 medianoche
    };
    /** Entidades vivas. Las gestionan sus sistemas (entidades/jugadores.js y entidades/zombis.js). */
    this.jugadores = [];
    this.zombis = [];
    this.sistemas = {};
    this._orden = [];
    this._escalaObjetivo = 1; this._escalaT = 0;
    this._ultimo = 0; this._andando = false;
    this._cuadro = this._cuadro.bind(this);

    this.registrar('fisica', {
      actualizar: (dt) => {
        this.fisica.paso(dt);
        for (const s of this._orden) if (s.sis.posFisica) this._seguro(s, 'posFisica', dt);
      },
    }, PRIORIDAD.fisica);
  }

  /** Registra un sistema. Queda accesible como juego.sistemas[nombre] y juego[nombre]. */
  registrar(nombre, sis, prioridad = PRIORIDAD[nombre] ?? 75) {
    this.sistemas[nombre] = sis;
    if (!(nombre in this)) this[nombre] = sis;
    this._orden.push({ nombre, sis, prioridad });
    this._orden.sort((a, b) => a.prioridad - b.prioridad);
    return sis;
  }

  _seguro(s, metodo, ...args) {
    try { return s.sis[metodo](...args); }
    catch (e) {
      s.errores = (s.errores || 0) + 1;
      if (s.errores <= 5) console.error(`[juego] error en ${s.nombre}.${metodo}`, e);
    }
  }

  async iniciar() {
    for (const s of this._orden) {
      if (s.sis.iniciar) {
        try { await s.sis.iniciar(); } catch (e) { console.error(`[juego] error al iniciar ${s.nombre}`, e); }
      }
    }
    const alRedim = () => {
      const w = this.contenedor.clientWidth || innerWidth, h = this.contenedor.clientHeight || innerHeight;
      for (const s of this._orden) if (s.sis.redimensionar) this._seguro(s, 'redimensionar', w, h);
    };
    addEventListener('resize', alRedim);
    this._andando = true;
    this._ultimo = performance.now();
    requestAnimationFrame(this._cuadro);
    this.eventos.emitir('juego:listo', {});
  }

  /** ¿Avanza la simulación este cuadro? */
  get simulando() {
    const f = this.estado.fase;
    return !this.estado.pausado && (f === 'jugando' || f === 'intermedio' || f === 'transicion');
  }

  pausar(v = true) {
    if (this.estado.pausado === v) return;
    this.estado.pausado = v;
    this.eventos.emitir('juego:pausa', { pausado: v });
  }

  /** Cámara lenta o congelación de impacto: escala de tiempo `escala` durante `duracion` segundos reales. */
  camaraLenta(escala, duracion) {
    this._escalaObjetivo = escala; this._escalaT = Math.max(this._escalaT, duracion);
  }

  _cuadro(ms) {
    if (!this._andando) return;
    requestAnimationFrame(this._cuadro);
    const dtReal = Math.min(Math.max((ms - this._ultimo) / 1000, 0), 1 / 20);
    this._ultimo = ms;
    this.avanzar(dtReal);
  }

  /** Avanza un cuadro a mano (lo usa el bucle; también sirve para pruebas deterministas). */
  avanzar(dtReal) {
    const t = this.tiempo;
    t.dtReal = dtReal; t.real += dtReal; t.cuadro++;
    if (this._escalaT > 0) { this._escalaT -= dtReal; t.escala = this._escalaObjetivo; if (this._escalaT <= 0) t.escala = 1; }
    const sim = this.simulando;
    t.dt = sim ? dtReal * t.escala : 0;
    t.ahora += t.dt;
    for (const s of this._orden) {
      if (!s.sis.actualizar) continue;
      if (sim || s.sis.siempre) this._seguro(s, 'actualizar', t.dt);
    }
  }

  detener() { this._andando = false; }
}
