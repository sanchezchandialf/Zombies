// Puntuación, racha y récord de ERA Z. Lo usa el Director (src/oleadas/index.js); escribe `juego.estado.{puntos, racha, multiplicador, bajas, mejorRacha}`.
//
// · Cada baja suma (puntos de la clase × multiplicador × dificultad). Los élites valen ×1,5.
// · La racha (nº de bajas seguidas del equipo) sube con cada baja. Si pasan GRACIA s sin matar, decae cada vez más rápido;
//   al recibir daño un jugador pierde la mitad. El multiplicador sale de la racha: ×2 (5) · ×3 (15) · ×4 (30) · ×5 (50).
// · Bonus al terminar la oleada: «sin daño» y «tiempo» (no se multiplican por la racha).
// · Récord en localStorage (clave `eraz.record.v1`), con try/catch; `juego.almacen` permite inyectar otro almacén (pruebas).
import { dificultadDe } from '../datos/oleadas.js';

export const GRACIA_RACHA = 3.5;
export const UMBRALES_RACHA = [0, 5, 15, 30, 50]; // índice+1 = multiplicador
const HITOS_RACHA = [10, 25, 50, 100, 200];
const HITOS_BAJAS = [100, 250, 500, 1000, 2500, 5000];
const CLAVE_RECORD = 'eraz.record.v1';

export const multiplicadorDeRacha = (racha) => {
  let m = 1;
  for (let i = 1; i < UMBRALES_RACHA.length; i++) if (racha >= UMBRALES_RACHA[i]) m = i + 1;
  return m;
};

export function crearPuntuacion(juego) {
  const estado = juego.estado;
  let rachaF = 0, sinMatar = 0, hitoRacha = 0, hitoBajas = 0;
  let dificultad = dificultadDe('normal');
  let danioEnOleada = false;
  let bajasOleada = 0;

  const almacen = () => { try { return juego.almacen ?? (typeof localStorage !== 'undefined' ? localStorage : null); } catch { return null; } };
  const msg = (texto, tipo = 'logro', duracion = 2.5) => juego.eventos.emitir('mensaje', { texto, tipo, duracion });

  const api = {
    /** Pone a cero la puntuación (nueva partida). */
    reiniciar(dificultadId = 'normal') {
      dificultad = dificultadDe(dificultadId);
      rachaF = 0; sinMatar = 0; hitoRacha = 0; hitoBajas = 0; danioEnOleada = false; bajasOleada = 0;
      estado.puntos = 0; estado.racha = 0; estado.multiplicador = 1; estado.bajas = 0; estado.mejorRacha = 0; estado.rachaRestante = 0;
    },
    alIniciarOleada() { danioEnOleada = false; bajasOleada = 0; },
    get recibioDanio() { return danioEnOleada; },
    get bajasOleada() { return bajasOleada; },

    /** Una baja de zombi (o jefe). Devuelve los puntos concedidos. */
    alMatar(zombi) {
      const base = zombi?.clase?.puntos ?? zombi?.def?.puntos ?? zombi?.puntos ?? 10;
      rachaF += 1; sinMatar = 0;
      estado.racha = Math.floor(rachaF);
      const mult = multiplicadorDeRacha(estado.racha);
      if (mult > estado.multiplicador && mult >= 4) msg(`¡Multiplicador ×${mult}!`, 'logro', 1.6);
      estado.multiplicador = mult;
      if (estado.racha > estado.mejorRacha) estado.mejorRacha = estado.racha;
      const pts = Math.round(base * mult * dificultad.puntos * (zombi?.elite ? 1.5 : 1));
      estado.puntos += pts;
      estado.bajas++; bajasOleada++;
      juego.eventos.emitir('puntos', { cantidad: pts, multiplicador: mult, racha: estado.racha, zombi, x: zombi?.pos?.x ?? 0, z: zombi?.pos?.z ?? 0 });
      // Hitos
      while (hitoRacha < HITOS_RACHA.length && estado.racha >= HITOS_RACHA[hitoRacha]) msg(`¡Racha de ${HITOS_RACHA[hitoRacha++]}!`);
      while (hitoBajas < HITOS_BAJAS.length && estado.bajas >= HITOS_BAJAS[hitoBajas]) msg(`${HITOS_BAJAS[hitoBajas++]} zombis abatidos`);
      return pts;
    },

    /** Un jugador recibe daño: la racha cae a la mitad y se pierde el bonus «sin daño». */
    alDanioJugador() {
      danioEnOleada = true;
      rachaF = Math.floor(rachaF * 0.5);
      estado.racha = Math.floor(rachaF);
      estado.multiplicador = multiplicadorDeRacha(estado.racha);
    },

    actualizar(dt) {
      if (rachaF <= 0) { estado.rachaRestante = 0; return; }
      sinMatar += dt;
      estado.rachaRestante = Math.max(0, 1 - sinMatar / GRACIA_RACHA);
      if (sinMatar > GRACIA_RACHA) {
        rachaF = Math.max(0, rachaF - dt * (3 + rachaF * 0.35));
        estado.racha = Math.floor(rachaF);
        estado.multiplicador = multiplicadorDeRacha(estado.racha);
      }
    },

    /** Bonus de fin de oleada. `duracion` en s, `total` nº de zombis, `jefe` bool. Devuelve { sinDanio, tiempo }. */
    alFinOleada({ dia, duracion, total, jefe }) {
      const r = { sinDanio: 0, tiempo: 0 };
      if (!danioEnOleada) r.sinDanio = Math.round((600 + 100 * dia) * dificultad.puntos);
      const par = (jefe ? 75 : 35) + total * 1.5; // tiempo de referencia (s)
      if (duracion < par) r.tiempo = Math.min(4000, Math.round((par - duracion) * 8 * (1 + 0.08 * dia) * dificultad.puntos));
      estado.puntos += r.sinDanio + r.tiempo;
      if (r.sinDanio) msg(`Oleada sin daño: +${r.sinDanio}`);
      if (r.tiempo >= 100) msg(`Bonus de tiempo: +${r.tiempo}`, 'info');
      return r;
    },

    /** Bonus de victoria. */
    bonusVictoria() { const b = Math.round(20000 * dificultad.puntos); estado.puntos += b; return b; },

    // --- récord ---------------------------------------------------------------------------------------------------
    leerRecord() {
      try { const a = almacen(); const t = a?.getItem(CLAVE_RECORD); return t ? JSON.parse(t) : null; } catch { return null; }
    },
    /** Guarda si supera el récord. Devuelve { record: bool, anterior }. */
    guardarRecord(datos) {
      const anterior = api.leerRecord();
      const nuevo = !anterior || datos.puntos > (anterior.puntos || 0);
      if (nuevo) { try { almacen()?.setItem(CLAVE_RECORD, JSON.stringify({ ...datos, fecha: Date.now() })); } catch { /* sin almacenamiento */ } }
      return { record: nuevo && datos.puntos > 0, anterior };
    },
  };
  return api;
}
