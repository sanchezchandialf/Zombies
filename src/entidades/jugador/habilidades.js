// Pasivas y habilidades de los cinco roles (datos/roles.js). Cada comportamiento ofrece ganchos opcionales:
//   iniciar(j)                      al crear el jugador
//   actualizar(j, dt)               cada cuadro con el jugador activo (vivo y no montado)
//   puedeActivar(j) → bool          ¿se puede pulsar la habilidad ahora? (por defecto: sin enfriamiento)
//   activar(j) → bool               ejecuta la habilidad; debe llamar a j.iniciarEnfriamiento() si tiene éxito
//   multiplicadores(j, m)           suma sus efectos temporales al acumulador {danio, cadencia, recarga, critico, infinita}
//   alDisparo(j) · alBaja(j, z) · alDanio(j, info, cantidad) · alImpacto(j, d) · alReanimar(j)
import { CAPA } from '../../nucleo/fisica.js';
import { limitar } from '../../nucleo/util.js';
import { RASGOS } from './constantes.js';

const _d = { x: 0, y: 0, z: 0 };
const pt = (x, z, y = 0) => { _d.x = x; _d.y = y; _d.z = z; return _d; };

function mensaje(j, texto, tipo = 'aviso', duracion = 1.6) {
  j.juego.eventos.emitir('mensaje', { texto, tipo, duracion });
}

// ───────────────────────────── Soldado ─────────────────────────────
const soldado = {
  iniciar(j) { j.disciplina = 0; },
  supresion(j) { return j.habilidad.activa; },
  multiplicadores(j, m) {
    // Disciplina de fuego: +2 % de cadencia por baja consecutiva sin recibir daño (máx. 30 %).
    m.cadencia *= 1 + Math.min(0.3, j.disciplina * 0.02);
    // Fuego de supresión: cadencia +60 % y munición gratis mientras dura.
    if (j.habilidad.activa) { m.cadencia *= 1.6; m.infinita = true; }
  },
  alBaja(j) { j.disciplina = Math.min(15, j.disciplina + 1); },
  alDanio(j) { if (j.disciplina > 0) { j.disciplina = 0; } },
  /** Las balas de supresión ralentizan a lo que impactan. */
  alImpacto(j, d) {
    if (!j.habilidad.activa) return;
    const o = d.objetivo;
    if (o?.bando === 'zombis' && o.vivo && (d.tipo === 'bala' || d.tipo === 'perforante')) o.ralentizar?.(0.55, 1.6);
  },
  activar(j) {
    const h = j.habilidad, def = h.def;
    j.iniciarEnfriamiento();
    j.iniciarActiva(def.duracion ?? 6);
    j.visual?.estado?.('furia', true);
    j.fxRol('onda', 1.6);
    j.audio('habilidad_supresion');
    j.juego.render?.sacudir?.(0.25, 0.25);
    return true;
  },
  alTerminarActiva(j) { if (!j.estados.has('potenciado')) j.visual?.estado?.('furia', false); },
};

// ───────────────────────────── Médica ─────────────────────────────
const medico = {
  iniciar(j) { j.regenT = 0; },
  actualizar(j, dt) {
    // Regeneración continua (se duplica tras 4 s sin recibir daño).
    const r = j.mods.regeneracion ?? 0;
    if (r > 0 && j.vida < j.vidaMax) {
      const k = j.sinDanioT > 4 ? 2 : 1;
      j.vida = Math.min(j.vidaMax, j.vida + r * k * dt);
    }
    actualizarNube(j, dt);
  },
  activar(j) {
    const h = j.habilidad, def = h.def;
    // Se lanza al punto de mira (hasta 11 m): la nube se coloca donde haga falta, también sobre ella misma.
    const it = j.intencion;
    let dx = it.apuntar.x - j.pos.x, dz = it.apuntar.z - j.pos.z;
    const d = Math.hypot(dx, dz) || 1;
    const alc = Math.min(d, 11);
    const x = j.pos.x + (dx / d) * alc, z = j.pos.z + (dz / d) * alc;
    j.iniciarEnfriamiento();
    j.iniciarActiva(def.duracion ?? 5);
    j.visual?.accion?.('lanzar', { duracion: 0.4 });
    j.retardo(0.28, () => {
      const c = j.juego.combate;
      const opciones = { x, z, radio: 6, duracion: def.duracion ?? 5, tipo: 'curacion', dps: 12, dpsEnemigos: 12, atacante: j, afecta: 'jugadores' };
      if (c?.crearZona) j.zonaSuero = c.crearZona(opciones);
      else j.zonaSuero = null;
      // Sin sistema de zonas (o sin soporte de 'curacion') la nube cura igualmente a quien esté dentro.
      j.nubeCuracion = { x, z, radio: 6, resta: def.duracion ?? 5, propia: !c?.crearZona };
      j.juego.fx?.emitir?.('curacion', pt(x, z, 0.3), { escala: 2.4, cantidad: 40 });
      j.juego.fx?.destello?.(pt(x, z, 1.2), 0x62e0a1, 3, 0.5, 7);
      j.audio('habilidad_suero', x, z);
    });
    return true;
  },
};
function actualizarNube(j, dt) {
    const n = j.nubeCuracion;
    if (!n) return;
    n.resta -= dt; n.acum = (n.acum ?? 0) + dt;
    if (n.acum >= 0.4) {
      const t = n.acum; n.acum = 0;
      j.juego.fx?.emitir?.('curacion', pt(n.x + (j.juego.rng.rango(-1, 1)) * n.radio * 0.8, n.z + (j.juego.rng.rango(-1, 1)) * n.radio * 0.8, 0.2), { escala: 0.9, cantidad: 3 });
      if (n.propia) {
        for (const o of j.juego.jugadores) {
          if (!o.vivo || Math.hypot(o.pos.x - n.x, o.pos.z - n.z) > n.radio) continue;
          o.curar(12 * t, true);
        }
        for (const z of j.juego.zombis) {
          if (!z.vivo || Math.hypot(z.pos.x - n.x, z.pos.z - n.z) > n.radio) continue;
          j.juego.combate?.aplicarDanio?.(z, { cantidad: 12 * t, tipo: 'acido', atacante: j, x: z.pos.x, z: z.pos.z, dirX: 0, dirZ: 0 });
        }
      }
    }
    if (n.resta <= 0) j.nubeCuracion = null;
}

// ───────────────────────────── Ingeniero ─────────────────────────────
const ingeniero = {
  iniciar(j) { j.chatarrero = true; j.barricada = { restante: 0, total: 7 }; j.habilidad.secundaria = { nombre: 'Barricada', restante: 0, total: 7 }; },
  actualizar(j, dt) {
    const b = j.barricada;
    if (b.restante > 0) b.restante = Math.max(0, b.restante - dt);
    j.habilidad.secundaria.restante = b.restante; j.habilidad.secundaria.total = b.total;
  },
  puedeActivar(j) { return j.habilidad.restante <= 0 || j.barricada.restante <= 0; },
  /** Q despliega la torreta; mientras está en enfriamiento, Q levanta una barricada (enfriamiento corto propio). */
  activar(j) {
    const m = j.juego.mundo;
    if (j.habilidad.restante <= 0) {
      const t = m?.desplegarTorreta?.(j);
      if (!t) { mensaje(j, 'No hay sitio para la torreta', 'aviso'); return false; }
      j.torretaActual = t;
      j.iniciarEnfriamiento();
      j.iniciarActiva(j.habilidad.def.duracion ?? 40);
      j.fxRol('chispas', 1.4);
      j.audio('habilidad_torreta');
      return true;
    }
    const b = m?.desplegarBarricada?.(j);
    if (!b) { mensaje(j, 'No hay sitio para la barricada', 'aviso'); return false; }
    j.barricada.restante = j.barricada.total * (j.mods.enfriamiento ?? 1);
    j.visual?.accion?.('habilidad', { duracion: 0.45 });
    j.juego.eventos.emitir('jugador:habilidad', { jugador: j, habilidad: { id: 'barricada', nombre: 'Barricada', enfriamiento: j.barricada.total } });
    j.fxRol('chispas', 1);
    j.audio('habilidad_barricada');
    return 'sin-enfriamiento-principal';
  },
};

// ───────────────────────────── Cazadora ─────────────────────────────
const cazador = {
  iniciar(j) { j.sinDisparoT = 0; j.ojoListo = false; j.acechoListo = false; },
  actualizar(j, dt) {
    j.sinDisparoT += dt;
    j.ojoListo = j.sinDisparoT >= 1.5 && !j.arma?.recargando;
  },
  multiplicadores(j, m) {
    if (j.ojoListo) m.critico += 1;           // probabilidad ≥ 1 → crítico seguro (Ojo clínico)
    if (j.acechoListo) m.danio *= 3;          // Acecho: el siguiente disparo hace ×3
  },
  alDisparo(j) {
    j.sinDisparoT = 0; j.ojoListo = false;
    if (j.acechoListo) {
      j.acechoListo = false;
      // Al disparar queda al descubierto poco después.
      const e = j.estados.get('invisible');
      if (e) e.resta = Math.min(e.resta, 1.2);
      j.juego.render?.sacudir?.(0.2, 0.2);
    }
  },
  activar(j) {
    const def = j.habilidad.def;
    j.iniciarEnfriamiento();
    j.iniciarActiva(def.duracion ?? 5);
    j.aplicarEstado('invisible', def.duracion ?? 5);
    j.acechoListo = true;
    j.fxRol('humo', 1.5);
    j.audio('habilidad_acecho');
    return true;
  },
  alTerminarActiva(j) { j.acechoListo = false; },
};

// ───────────────────────────── Demoledor ─────────────────────────────
const demoledor = {
  iniciar(j) { j.pisoton = 0; },
  actualizar(j, dt) { if (j.pisoton > 0) j.pisoton -= dt; },
  activar(j) {
    j.iniciarEnfriamiento();
    j.pisoton = 0.5;                                    // se queda casi clavado un instante: el golpe pesa
    j.visual?.accion?.('habilidad', { duracion: 0.55 });
    j.retardo(0.26, () => golpeSismico(j));
    return true;
  },
};

/** Pisotón: daña y derriba en 7 m (más cerca, más fuerte), destroza blindajes, lanza props y sacude la cámara. */
function golpeSismico(j) {
  if (!j.vivo) return;
  const juego = j.juego, R = 7, x = j.pos.x, z = j.pos.z;
  const base = 150 * (j.mods.danio ?? 1) * (j.mods.cuerpo ?? 1) * 0.55;
  for (const o of juego.zombis) {
    if (!o?.vivo || !o.pos) continue;
    const dx = o.pos.x - x, dz = o.pos.z - z, d = Math.hypot(dx, dz);
    if (d > R + (o.radio ?? 0.4)) continue;
    const f = 1 - 0.55 * limitar(d / R, 0, 1);
    const nx = d > 1e-3 ? dx / d : 0, nz = d > 1e-3 ? dz / d : 1;
    const info = { cantidad: base * f * (o.esJefe ? 0.6 : 1), tipo: 'golpe', atacante: j, arma: null, x: o.pos.x, z: o.pos.z, dirX: nx, dirZ: nz, empuje: 16 * f, critico: false, ignoraBlindaje: true, perforaBlindaje: true };
    if (juego.combate?.aplicarDanio) juego.combate.aplicarDanio(o, info); else o.recibirDanio?.(info);
    if (!o.vivo) continue;
    if (!o.esJefe) { o.aturdir?.(1.4 + 0.8 * f); o.empujar?.(nx * 9 * f, nz * 9 * f); }
    else o.aturdir?.(0.5);
  }
  juego.fisica.impulsoRadial(x, z, R, 520, CAPA.PROP | CAPA.VEHICULO);
  juego.render?.sacudir?.(0.9, 0.55);
  juego.render?.zoom?.(1.04, 0.25);
  const fx = juego.fx;
  fx?.emitir?.('onda', pt(x, z, 0.15), { escala: R / 3.2, color: 0xffb070 });
  fx?.emitir?.('polvo', pt(x, z, 0.2), { escala: 2.6, cantidad: 36 });
  fx?.emitir?.('piedra', pt(x, z, 0.2), { escala: 1.4, cantidad: 14 });
  fx?.calco?.('crater', x, z, 3.2, { alfa: 0.7 });
  fx?.destello?.(pt(x, z, 0.6), 0xffa060, 4, 0.25, 9);
  j.audio('habilidad_terremoto', x, z);
  j.vibrar(1, 0.4);
}

export const COMPORTAMIENTOS = { soldado, medico, ingeniero, cazador, demoledor };

export function comportamientoDe(rolId) {
  const c = COMPORTAMIENTOS[rolId] ?? {};
  return { ...c, rasgos: RASGOS[rolId] ?? {} };
}
