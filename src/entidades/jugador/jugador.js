// Entidad Jugador (Dañable, bando 'jugadores'). Doble palanca cenital: movimiento ágil, apuntado preciso, esquiva,
// armas, recarga, cuerpo a cuerpo, arrojadizas, interacción, reanimación, estados y habilidades de rol.
// Contrato en docs/ARQUITECTURA.md §Jugadores.
import * as THREE from 'three';
import { CAPA, TODAS } from '../../nucleo/fisica.js';
import { difAngulo, girarHacia, limitar } from '../../nucleo/util.js';
import { intencionVacia } from '../../nucleo/entrada.js';
import { ERAS } from '../../datos/eras.js';
import { ARMAS } from '../../datos/armas.js';
import { crearModeloArma } from '../../armas/modelos.js';
import { AJUSTE } from './constantes.js';
import { comportamientoDe } from './habilidades.js';
import { crearEstados, aplicarEstado, quitarEstado, quitarTodos, actualizarEstados } from './estados.js';

const _boca = new THREE.Vector3();
const _origen = new THREE.Vector3();
const _vacio = intencionVacia();
const MASCARA_ESQUIVA = TODAS & ~CAPA.ZOMBI;
const MASCARA_CHOQUE = CAPA.ESTATICO | CAPA.ESTRUCTURA | CAPA.VEHICULO;

/** Visual de reserva si el sistema de personajes aún no entrega uno: todo son no-operaciones. */
function visualNulo() {
  const n = () => {};
  return { altura: 1.8, colocar: n, mover: n, accion: n, estado: n, equipar: n, vestir: n, destello: n, visible: n, morir: n, liberar: n, boca: (o = new THREE.Vector3()) => o };
}

export class Jugador {
  constructor(juego, indice, rol, x, z) {
    this.juego = juego;
    this.indice = indice;
    this.rol = rol;
    this.bando = 'jugadores';
    this.material = 'carne';
    this.pos = new THREE.Vector3(x, 0, z);
    this.rot = 0;
    this.radio = AJUSTE.radio;
    this.eraIdx = juego.estado?.eraIdx ?? 0;

    this.comp = comportamientoDe(rol.id);
    this.rasgos = this.comp.rasgos;

    // ── vida y estado de vida ──
    this.vidaMax = rol.vida; this.vida = rol.vida;
    this.vivo = true;          // false mientras está caído o muerto
    this.caido = false;        // abatido y reanimable (cooperativo)
    this.muerto = false;       // muerte definitiva (solitario)
    this.progresoReanimar = 0; // 0..1 sobre el jugador caído (lo lee la UI)
    this.escudo = 0;
    this.invulT = 0; this.graciaT = 0; this.sinDanioT = 99;
    this.dios = false;

    // ── mods: copia mutable de rol.mods; los efectos temporales se aplican y se retiran por diferencia ──
    this.mods = { ...rol.mods };
    this._temp = { danio: 1, cadencia: 1, recarga: 1, critico: 0, infinita: false };
    this._infinitaPuesta = false;
    this.mejoras = [];
    this.segundaUsos = 0;   // usos de «segundo aliento» en esta oleada (mods.segundaOportunidad)

    // ── estados ──
    this.estados = crearEstados();
    this.factorEstado = 1;
    this.invisible = false;
    this.silenciado = 0;

    // ── movimiento ──
    this.vx = 0; this.vz = 0; this._sx = 0; this._sz = 0;       // velocidad controlada y última enviada al cuerpo
    this.esq = { activa: false, t: 0, dur: AJUSTE.esquiva.duracion, dx: 0, dz: 1, v0: 0, restante: 0, total: AJUSTE.esquiva.enfriamiento, buffer: 0 };
    this.derribadoT = 0;
    this.lungeT = 0;
    this.disparandoT = 0; this.cuerpoT = 0; this.cuerpoCd = 0;

    // ── armas ──
    this.armas = []; this.armaIdx = 0; this.arma = null;
    this.modelos = [null, null];
    this.cambioT = 0; this.bufDisparo = 0; this.autoRecargaT = 0;
    this.arrojadizas = rol.equipo.arrojadizas ?? 0; this.arrojadizasMax = this.arrojadizas;
    this.lanzarCd = 0; this.cargandoLanzar = false; this.destinoLanzar = { x: 0, z: 0, valido: false };
    this._marcador = null;

    // ── habilidad ──
    this.habilidad = { def: rol.habilidad, restante: 0, total: rol.habilidad.enfriamiento, activa: false, tiempoActiva: 0, secundaria: null };
    this.retardos = [];
    this._avisoT = 0;

    // ── interacción ──
    this.interactivo = null; this.usoT = 0; this.usoBloqueado = false; this._usoObj = null;
    this.vehiculo = null; this.emplazamiento = null; this._montado = false; this._ocultoPorMonta = false;
    this.intencion = _vacio;
    this.apuntando = { x: x, z: z + 5 };
    this.foco = { pos: new THREE.Vector3(x, 0, z) };
    this._parpadeo = 0;

    // ── cuerpo físico ──
    this.cuerpo = juego.fisica.crearCuerpo({
      forma: 'circulo', x, z, radio: this.radio, masa: AJUSTE.masa, capa: CAPA.JUGADOR, mascara: TODAS,
      amortiguacion: 0, rigidez: 1, datos: this,
    });
    if (this.rasgos.masa) this.cuerpo.establecerMasa(this.rasgos.masa);   // Demoledor: inamovible

    // ── visual ──
    this.visual = juego.personajes?.crearJugador?.(rol.id, this.eraIdx) ?? visualNulo();
    this._envolverVisual();
    this.visual.colocar?.(x, z, 0);

    this.equipar(this.eraIdx, false);
    this.comp.iniciar?.(this);
  }

  /** Cuenta las acciones de disparo/recarga que ya hizo otro sistema (combate) para no duplicar la animación. */
  _envolverVisual() {
    const v = this.visual, orig = v.accion?.bind(v);
    this._accion = { disparar: -1, recargar: -1 };
    if (!orig) return;
    v.accion = (nombre, o) => { if (nombre in this._accion) this._accion[nombre] = this.juego.tiempo.cuadro; return orig(nombre, o); };
  }
  _accionar(nombre, o) {
    if (this._accion[nombre] !== this.juego.tiempo.cuadro) this.visual.accion?.(nombre, o);
  }

  // ───────────────────────────── Utilidades ─────────────────────────────
  audio(nombre, x = this.pos.x, z = this.pos.z) { try { this.juego.audio?.reproducir?.(nombre, { x, z }); } catch { /* audio opcional */ } }
  vibrar(fuerza, dur) { try { this.juego.entrada?.vibrar?.(this.indice, fuerza, dur); } catch { /* sin mando */ } }
  /** Efecto de rol: destello de luz del color del rol + partículas alrededor del jugador. */
  fxRol(nombre, escala = 1) {
    const fx = this.juego.fx;
    fx?.emitir?.(nombre, { x: this.pos.x, y: 0.9, z: this.pos.z }, { escala });
    fx?.destello?.({ x: this.pos.x, y: 1.1, z: this.pos.z }, this.rol.color, 2.2, 0.3, 5);
  }
  retardo(seg, fn) { this.retardos.push({ t: seg, fn }); }
  supresionActiva() { return this.rol.id === 'soldado' && this.habilidad.activa; }
  get habilidadActiva() { return this.habilidad.activa; }

  /** Enfriamiento de la habilidad con las mejoras (mods.habilidadEnfriamiento ×). */
  iniciarEnfriamiento(seg) {
    const h = this.habilidad;
    h.total = (seg ?? h.def.enfriamiento) * (this.mods.habilidadEnfriamiento ?? 1);
    h.restante = h.total;
  }
  /** Marca la habilidad como activa durante `dur` s (× mods.habilidadDuracion). Devuelve la duración real. */
  iniciarActiva(dur) { const h = this.habilidad; dur *= this.mods.habilidadDuracion ?? 1; h.activa = true; h.tiempoActiva = dur; h.duracion = dur; return dur; }
  get potenciaHabilidad() { return this.mods.habilidadPotencia ?? 1; }

  // ───────────────────────────── Armas y equipo ─────────────────────────────
  armaIdsDeEra(eraIdx) {
    const era = ERAS[Math.min(ERAS.length - 1, Math.max(0, eraIdx))];
    const eq = this.rol.equipo;
    return [era.armas[eq.primaria] ?? era.armas.fusil, era.armas[eq.secundaria] ?? era.armas.pistola, era.armas.arrojadiza, era.armas.cuerpo];
  }

  /** (Re)crea el equipo de la era: armas con munición llena, modelos, arrojadizas y atuendo. */
  equipar(eraIdx, avisar = true) {
    this.eraIdx = eraIdx;
    const ids = this.armaIdsDeEra(eraIdx);
    this.armaIds = ids;
    const c = this.juego.combate;
    this.armas = [ids[0], ids[1]].map((id) => c?.crearArma?.(id, this) ?? { def: ARMAS[id], id, municion: ARMAS[id]?.cargador ?? 0, reserva: 0, recargando: false, progresoRecarga: 0, enfriamiento: 0 });
    for (let i = 0; i < 2; i++) {
      this.modelos[i]?.removeFromParent?.();
      try { this.modelos[i] = crearModeloArma(ids[i]); } catch { this.modelos[i] = null; }
    }
    this.defArrojadiza = ARMAS[ids[2]] ?? null;
    this.defCuerpo = ARMAS[ids[3]] ?? null;
    this.arrojadizas = this.arrojadizasMax = Math.max(this.arrojadizasMax, this.rol.equipo.arrojadizas ?? 0);
    this.armaIdx = 0; this.arma = this.armas[0];
    this.cambioT = 0; this.bufDisparo = 0;
    this.visual.vestir?.(eraIdx);
    this.visual.equipar?.(this.modelos[0]);
    if (avisar) this.juego.eventos.emitir('jugador:arma', { jugador: this, arma: this.arma?.def ?? null, inst: this.arma, eraIdx });
  }

  cambiarArma(idx) {
    if (this.armas.length < 2) return false;
    idx = ((idx % 2) + 2) % 2;
    if (idx === this.armaIdx) return false;
    this.juego.combate?.cancelarRecarga?.(this.arma);
    this.armaIdx = idx; this.arma = this.armas[idx];
    this.cambioT = AJUSTE.cambioArma;
    this.bufDisparo = 0;
    this.visual.equipar?.(this.modelos[idx]);
    this.audio('cambio_arma');
    this.juego.eventos.emitir('jugador:arma', { jugador: this, arma: this.arma?.def ?? null, inst: this.arma, eraIdx: this.eraIdx });
    return true;
  }

  /** Munición: fracción (0..1) de la reserva máxima de cada arma. 1 = llena también los cargadores. */
  darMunicion(fraccion = 1) {
    fraccion = limitar(fraccion, 0, 1);
    const c = this.juego.combate;
    for (const inst of this.armas) {
      const d = inst?.def; if (!d || d.reserva === -1) continue;
      if (c?.darMunicion) { c.darMunicion(inst, fraccion, this); if (fraccion >= 1 && inst.cargador) inst.municion = inst.cargador; continue; }
      const max = Math.ceil((d.reserva ?? 0) * (d.cargador ?? 1) * (this.mods.reserva ?? 1));
      if (inst.reserva >= 0) inst.reserva = Math.min(max, (inst.reserva ?? 0) + Math.ceil(max * fraccion));
      if (fraccion >= 1) inst.municion = d.cargador ?? inst.municion;
    }
    this.juego.eventos.emitir('recogida', { jugador: this, tipo: 'municion', cantidad: fraccion });
  }

  darArrojadizas(n = 1) { this.arrojadizas = Math.min(this.arrojadizasMax, this.arrojadizas + n); }

  aplicarMejora(def) {
    if (!def) return;
    try { def.aplicar?.(this); } catch (e) { console.error('[jugadores] error al aplicar la mejora', def?.id, e); }
    this.mejoras.push(def.id ?? def);
    this.vida = Math.min(this.vida, this.vidaMax);
  }

  // ───────────────────────────── Vida ─────────────────────────────
  curar(cantidad, silencioso = false) {
    if (!(cantidad > 0) || this.muerto || this.caido) return 0;
    const antes = this.vida;
    this.vida = Math.min(this.vidaMax, this.vida + cantidad);
    const real = this.vida - antes;
    if (real > 0.05 && !silencioso) {
      this.juego.eventos.emitir('jugador:curado', { jugador: this, cantidad: real });
      this.juego.fx?.emitir?.('curacion', { x: this.pos.x, y: 1, z: this.pos.z }, { escala: 0.8, cantidad: 6 });
    }
    return real;
  }

  aplicarEstado(nombre, duracion, datos) { return aplicarEstado(this, nombre, duracion, datos); }
  tieneEstado(nombre) { return this.estados.has(nombre); }
  quitarEstado(nombre) { quitarEstado(this, nombre); }

  derribar(dur) { this.derribadoT = Math.max(this.derribadoT, dur); this.visual.accion?.('golpe', { duracion: dur }); }

  recibirDanio(info) {
    if (!this.vivo || !info) return 0;
    const juego = this.juego;
    let c = +info.cantidad || 0;
    if (c <= 0) return 0;
    const tipo = info.tipo ?? 'golpe';
    if (this.rasgos.inmune?.includes(tipo)) return 0;
    if (this.invulT > 0) return 0;
    if (juego.opciones?.dios) { this._retroalimentar(info, 0, tipo); return 0; }
    c *= this.rasgos.resiste?.[tipo] ?? 1;
    c *= (this.mods.resistencia ?? 1) * (this.mods.danioRecibido ?? 1);
    if (tipo === 'veneno') c *= this.mods.resistenciaVeneno ?? 1;
    else if (tipo === 'acido') c *= this.mods.resistenciaAcido ?? 1;
    if (!info.dot && this.graciaT > 0 && (tipo === 'golpe' || tipo === 'bala' || tipo === 'acido')) c *= AJUSTE.graciaFactor;
    if (this.escudo > 0) {
      const a = Math.min(this.escudo, c);
      this.escudo -= a; c -= a;
      if (this.escudo <= 0) quitarEstado(this, 'escudo');
      juego.fx?.destello?.({ x: this.pos.x, y: 1, z: this.pos.z }, 0x6ad0ff, 1.5, 0.15, 3);
    }
    if (c <= 0.01) return 0;
    c = Math.min(c, this.vida + 0.001);
    this.vida -= c;
    this.sinDanioT = 0;
    if (!info.dot && tipo !== 'explosivo' && tipo !== 'fuego') this.graciaT = AJUSTE.gracia;
    this.comp.alDanio?.(this, info, c);

    // Empuje (el Demoledor no se mueve; la esquiva lo ignora)
    if (info.empuje > 0 && !info.dot && !this.rasgos.inamovible && !this.esq.activa) {
      const m = Math.hypot(info.dirX ?? 0, info.dirZ ?? 0);
      if (m > 1e-3) {
        const v = Math.min(9, info.empuje * (70 / AJUSTE.masa)) * (this.mods.empujeRecibido ?? 1);
        this.vx += (info.dirX / m) * v; this.vz += (info.dirZ / m) * v;
      }
    }
    if (this.vida <= 0.001 && this.segundaUsos < Math.floor(this.mods.segundaOportunidad ?? 0)) {
      this.segundaUsos++; this.vida = 1; this.invulT = Math.max(this.invulT, 1.4);
      juego.eventos.emitir('mensaje', { texto: '¡Segundo aliento!', tipo: 'logro', duracion: 1.6 });
      juego.fx?.destello?.({ x: this.pos.x, y: 1.1, z: this.pos.z }, 0xffd070, 3, 0.4, 5);
    }
    this._retroalimentar(info, c, tipo);
    if (this.vida <= 0.001) this._caer(info);
    return c;
  }

  _retroalimentar(info, c, tipo) {
    const juego = this.juego;
    if (info.dot) {
      this._dotEvento = (this._dotEvento ?? 0);
      if (juego.tiempo.ahora - this._dotEvento < 0.9) return;
      this._dotEvento = juego.tiempo.ahora;
      juego.eventos.emitir('jugador:danio', { jugador: this, cantidad: c, tipo, dirX: 0, dirZ: 0 });
      this.visual.destello?.(tipo === 'fuego' ? 0xff8030 : 0x70d060);
      return;
    }
    const f = limitar(0.25 + c / 45, 0.25, 1);
    this.visual.destello?.();
    this.visual.accion?.('golpe', { dirX: info.dirX ?? 0, dirZ: info.dirZ ?? 0, duracion: 0.25 });
    this.vibrar(f, 0.18 + 0.12 * f);
    juego.render?.sacudir?.(0.12 + 0.3 * f, 0.18);
    juego.eventos.emitir('jugador:danio', { jugador: this, cantidad: c, tipo, dirX: info.dirX ?? 0, dirZ: info.dirZ ?? 0 });
  }

  /** Sin vida: caído (cooperativo con compañeros) o muerto. */
  _caer(info) {
    if (!this.vivo) return;
    const juego = this.juego;
    this.vida = 0; this.vivo = false;
    this._soltarMontura();
    this.cargandoLanzar = false; this._ocultarMarcador();
    this.esq.activa = false; this.cuerpo.mascara = TODAS;
    this.interactivo = null; this.usoT = 0;
    quitarTodos(this);
    const otros = juego.jugadores.some((o) => o !== this && !o.muerto);
    if (otros) {
      this.caido = true; this.progresoReanimar = 0;
      this.cuerpo.sensor = true; this.vx = this.vz = 0; this.cuerpo.vx = this.cuerpo.vz = 0;
      this.visual.estado?.('caido', true);
      juego.eventos.emitir('jugador:caido', { jugador: this });
      juego.audio?.reproducir?.('jugador_caido', { x: this.pos.x, z: this.pos.z });
      // Si ya no queda nadie en pie, la escuadra ha caído: nadie puede reanimar a nadie.
      if (!juego.jugadores.some((o) => o.vivo)) for (const o of juego.jugadores) if (o.caido) o._morir(info);
    } else this._morir(info);
  }

  _morir(info) {
    if (this.muerto) return;
    const juego = this.juego;
    this.caido = false; this.vivo = false; this.muerto = true;
    this.visual.estado?.('caido', false);
    this.visual.morir?.({ dirX: info?.dirX ?? 0, dirZ: info?.dirZ ?? 1, fuerza: limitar((info?.empuje ?? 6) / 10, 0.3, 1.4), tipo: info?.tipo ?? 'golpe' });
    if (this.cuerpo?.activo) juego.fisica.eliminarCuerpo(this.cuerpo);
    juego.eventos.emitir('jugador:muerte', { jugador: this });
  }

  /** Reanima a un caído (por un compañero o al terminar la oleada). */
  reanimar(fraccion = AJUSTE.reanimarVida, invuln = AJUSTE.reanimarInvuln) {
    if (this.muerto || this.vivo) return false;
    this.caido = false; this.vivo = true;
    this.vida = Math.max(this.vida, this.vidaMax * fraccion);
    this.progresoReanimar = 0; this.invulT = Math.max(this.invulT, invuln); this.graciaT = 0;
    this.cuerpo.sensor = false; this.cuerpo.mascara = TODAS;
    this.visual.estado?.('caido', false);
    this.juego.fx?.emitir?.('curacion', { x: this.pos.x, y: 1, z: this.pos.z }, { escala: 1.4, cantidad: 14 });
    this.juego.eventos.emitir('jugador:reanimado', { jugador: this });
    return true;
  }

  /** Al empezar o acabar una oleada se renuevan los «segundo aliento». */
  nuevaOleada() { this.segundaUsos = 0; }

  teletransportar(x, z) {
    this.pos.set(x, 0, z);
    this.cuerpo.x = x; this.cuerpo.z = z; this.cuerpo.vx = this.cuerpo.vz = 0;
    this.vx = this.vz = this._sx = this._sz = 0;
    this.esq.activa = false;
    this.visual.colocar?.(x, z, this.rot);
    this.foco.pos.set(x, 0, z);
  }

  // ───────────────────────────── Vehículos y emplazamientos ─────────────────────────────
  _soltarMontura() {
    const o = this.vehiculo ?? this.emplazamiento;
    if (o) { try { o.bajar?.(); } catch (e) { console.error('[jugadores] error al bajar', e); } }
    this.vehiculo = null; this.emplazamiento = null;
    this._sincronizarMontura();
  }

  /** Detecta el paso a/desde un vehículo o emplazamiento: el cuerpo se desactiva y el visual se oculta según el objeto. */
  _sincronizarMontura() {
    const obj = this.vehiculo ?? this.emplazamiento;
    const montado = !!obj;
    if (montado && !this._montado) {
      this._montado = true;
      this._ocultoPorMonta = !!obj.ocultaConductor;
      const c = this.cuerpo;
      c.capa = 0; c.mascara = 0; c.sensor = true; c.vx = c.vz = 0; this.vx = this.vz = this._sx = this._sz = 0;
      this.esq.activa = false; this.cargandoLanzar = false; this._ocultarMarcador();
      if (this._ocultoPorMonta) this.visual.visible?.(false);
      this.interactivo = null; this.usoT = 0;
    } else if (!montado && this._montado) {
      this._montado = false;
      const c = this.cuerpo;
      c.capa = CAPA.JUGADOR; c.mascara = TODAS; c.sensor = this.caido;
      this.visual.visible?.(true); this._ocultoPorMonta = false;
      // Sale al lado: primer hueco libre alrededor de la posición actual.
      this._ponerEnHueco(this.pos.x, this.pos.z);
      this.usoBloqueado = true;
    }
    if (montado) {
      if (obj.pos && this.vehiculo) { this.pos.x = obj.pos.x; this.pos.z = obj.pos.z; this.cuerpo.x = this.pos.x; this.cuerpo.z = this.pos.z; }
      else if (obj.pos && obj.ocultaConductor) { this.pos.x = obj.pos.x; this.pos.z = obj.pos.z; this.cuerpo.x = this.pos.x; this.cuerpo.z = this.pos.z; }
      this.cuerpo.vx = this.cuerpo.vz = 0;
    }
  }

  _ponerEnHueco(x, z) {
    const f = this.juego.fisica;
    const m = CAPA.ESTATICO | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;
    for (let r = 0; r <= 4.5; r += 0.75) {
      const n = r === 0 ? 1 : 10;
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + 0.6;
        const px = x + Math.sin(a) * (r + (r ? 1.2 : 0)), pz = z + Math.cos(a) * (r + (r ? 1.2 : 0));
        if (f.libre(px, pz, this.radio + 0.05, m)) { this.teletransportar(px, pz); return; }
      }
    }
    this.teletransportar(x, z);
  }

  // ───────────────────────────── Bucle principal ─────────────────────────────
  actualizar(dt) {
    if (this.muerto) return;
    const juego = this.juego;
    const it = juego.entrada?.de?.(this.indice) ?? _vacio;
    this.intencion = it;
    this.dios = !!juego.opciones?.dios;

    // temporizadores
    this.invulT = Math.max(0, this.invulT - dt);
    this.graciaT = Math.max(0, this.graciaT - dt);
    this.sinDanioT += dt;
    this.cambioT = Math.max(0, this.cambioT - dt);
    this.lanzarCd = Math.max(0, this.lanzarCd - dt);
    this.cuerpoCd = Math.max(0, this.cuerpoCd - dt);
    this.disparandoT = Math.max(0, this.disparandoT - dt);
    this.cuerpoT = Math.max(0, this.cuerpoT - dt);
    this.derribadoT = Math.max(0, this.derribadoT - dt);
    this.autoRecargaT = Math.max(0, this.autoRecargaT - dt);
    this._avisoT = Math.max(0, this._avisoT - dt);
    if (this.dios && this.vida < this.vidaMax) this.vida = this.vidaMax;
    for (let i = this.retardos.length - 1; i >= 0; i--) {
      const r = this.retardos[i]; r.t -= dt;
      if (r.t <= 0) { this.retardos.splice(i, 1); try { r.fn(); } catch (e) { console.error('[jugadores] error en retardo', e); } }
    }

    // armas siempre al día (la recarga continúa aunque el jugador esté caído o montado)
    const c = juego.combate;
    for (let i = 0; i < this.armas.length; i++) c?.actualizarArma?.(this.armas[i], dt, this);

    if (this.caido) { this._actualizarCaido(dt); this._parpadeoVisual(dt); return; }
    if (!this.vivo) return;

    actualizarEstados(this, dt);
    if (!this.vivo) return;

    // habilidad: enfriamiento y duración
    const h = this.habilidad;
    if (h.restante > 0) h.restante = Math.max(0, h.restante - dt);
    if (h.activa) {
      h.tiempoActiva -= dt;
      if (h.tiempoActiva <= 0) { h.activa = false; h.tiempoActiva = 0; this.comp.alTerminarActiva?.(this); }
    }
    this.comp.actualizar?.(this, dt);

    this.esq.restante = Math.max(0, this.esq.restante - dt);
    this.esq.buffer = Math.max(0, this.esq.buffer - dt);

    this._sincronizarMontura();
    const montado = this._montado;

    this._actualizarMods();

    if (montado) {
      this.cuerpo.vx = this.cuerpo.vz = 0;
      this._aimMontado(it);
      this._usar(it);
      this._parpadeoVisual(dt);
      return;
    }

    if (it.pausa) { /* la gestiona la entrada */ }
    const incapacitado = this.derribadoT > 0;
    if (!incapacitado) {
      if (it.habilidad) this.usarHabilidad();
      if (it.esquivar) this.esq.buffer = AJUSTE.esquiva.buffer;
      if (this.esq.buffer > 0 && !this.esq.activa && this.esq.restante <= 0) this._iniciarEsquiva(it);
    }
    this._mover(dt, it, incapacitado);
    this._girar(dt, it);
    if (!incapacitado && !this.esq.activa) this._acciones(dt, it);
    else if (this.esq.activa) { this._usar(it, true); }
    this._parpadeoVisual(dt);
  }

  /** Los multiplicadores temporales se suman a `mods` por diferencia, para no pisar mejoras que cambien mods a mano. */
  _actualizarMods() {
    const m = { danio: 1, cadencia: 1, recarga: 1, critico: 0, infinita: false };
    const pot = this.estados.get('potenciado');
    if (pot) { m.danio *= pot.datos.danio ?? 1.35; m.cadencia *= pot.datos.cadencia ?? 1.15; }
    this.comp.multiplicadores?.(this, m);
    const t = this._temp, mo = this.mods;
    mo.danio = (mo.danio ?? 1) / t.danio * m.danio;
    mo.cadencia = (mo.cadencia ?? 1) / t.cadencia * m.cadencia;
    mo.recarga = (mo.recarga ?? 1) / t.recarga * m.recarga;
    mo.critico = (mo.critico ?? 0) - t.critico + m.critico;
    if (m.infinita && !mo.municionInfinita) { mo.municionInfinita = true; this._infinitaPuesta = true; }
    else if (!m.infinita && this._infinitaPuesta) { mo.municionInfinita = false; this._infinitaPuesta = false; }
    this._temp = m;
  }

  // ───────────────────────────── Habilidad ─────────────────────────────
  usarHabilidad() {
    if (this.caido || !this.vivo) return false;
    const h = this.habilidad;
    if (this.silenciado > 0) {
      if (this._avisoT <= 0) { this._avisoT = 1.2; this.juego.eventos.emitir('mensaje', { texto: '¡Habilidad silenciada!', tipo: 'aviso', duracion: 1.2 }); this.audio('habilidad_bloqueada'); }
      return false;
    }
    const puede = this.comp.puedeActivar ? this.comp.puedeActivar(this) : h.restante <= 0;
    if (!puede) { if (this._avisoT <= 0) { this._avisoT = 0.6; this.audio('habilidad_bloqueada'); } return false; }
    const r = this.comp.activar?.(this);
    if (!r) return false;
    if (r !== 'sin-enfriamiento-principal') {
      this.visual.accion?.('habilidad', { duracion: 0.5 });
      this.juego.eventos.emitir('jugador:habilidad', { jugador: this, habilidad: h.def });
    }
    return true;
  }

  // ───────────────────────────── Esquiva ─────────────────────────────
  _iniciarEsquiva(it) {
    const E = AJUSTE.esquiva, e = this.esq;
    let dx = it.moverX, dz = it.moverZ;
    const m = Math.hypot(dx, dz);
    if (m > 0.2) { dx /= m; dz /= m; }
    else {                                   // quieto: rueda hacia atrás respecto a la mira
      const a = Math.hypot(it.dirApuntar.x, it.dirApuntar.z) || 1;
      dx = -it.dirApuntar.x / a; dz = -it.dirApuntar.z / a;
    }
    const dist = E.distancia * (this.rasgos.esquivaDistancia ?? 1) * (this.mods.esquiva ?? 1);
    e.activa = true; e.t = 0; e.dur = E.duracion; e.dx = dx; e.dz = dz;
    e.v0 = dist * (E.curva + 1) / E.duracion;
    e.total = E.enfriamiento * (this.mods.esquivaEnfriamiento ?? 1); e.restante = e.total + E.duracion;
    e.buffer = 0;
    this.invulT = Math.max(this.invulT, E.duracion + E.extra);
    this.cuerpo.mascara = MASCARA_ESQUIVA;
    this.cargandoLanzar = false; this._ocultarMarcador();
    this.cuerpoT = 0;
    // Rodar apaga las llamas a medias.
    const f = this.estados.get('ardiendo'); if (f) f.resta = Math.max(0, f.resta - 1.4);
    this.visual.accion?.('esquivar', { duracion: E.duracion, dirX: dx, dirZ: dz });
    this.juego.fx?.emitir?.('polvo', { x: this.pos.x, y: 0.1, z: this.pos.z }, { dirX: -dx, dirZ: -dz, escala: 0.9, cantidad: 8 });
    this.audio('esquivar');
    this.vibrar(0.25, 0.1);
    this.juego.eventos.emitir('jugador:esquiva', { jugador: this, dirX: dx, dirZ: dz });
  }

  // ───────────────────────────── Movimiento ─────────────────────────────
  _mover(dt, it, incapacitado) {
    const c = this.cuerpo, e = this.esq;
    // Cambios de velocidad ajenos (choques, empujes de zombis, explosiones) desde la última física.
    this.vx += c.vx - this._sx; this.vz += c.vz - this._sz;

    let vmaxBase = this.rol.velocidad * (this.mods.velocidad ?? 1) * this.factorEstado;
    if (this.derribadoT > 0) vmaxBase *= 0;
    let tx = 0, tz = 0;

    if (e.activa) {
      e.t += dt;
      const u = e.t / e.dur;
      if (u >= 1) { e.activa = false; c.mascara = TODAS; this.vx = e.dx * vmaxBase * 0.9; this.vz = e.dz * vmaxBase * 0.9; }
      else {
        let s = e.v0 * Math.pow(1 - u, AJUSTE.esquiva.curva);
        // Sin atravesar muros aunque el cuadro sea largo.
        const paso = s * dt + this.radio + 0.04;
        const g = this.juego.fisica.rayo(this.pos.x, this.pos.z, e.dx, e.dz, paso, MASCARA_CHOQUE, null, false);
        if (g) { const libre = Math.max(0, g.dist - this.radio - 0.02); s = Math.min(s, libre / Math.max(dt, 1e-4)); if (libre < 0.02) { e.activa = false; c.mascara = TODAS; s = 0; } }
        this.vx = e.dx * s; this.vz = e.dz * s;
      }
    } else {
      // Velocidad deseada con penalizaciones de combate.
      let k = 1;
      const m = Math.hypot(it.moverX, it.moverZ);
      if (m > 0.01 && !incapacitado) {
        const a = Math.hypot(it.dirApuntar.x, it.dirApuntar.z) || 1;
        const d = (it.moverX * it.dirApuntar.x + it.moverZ * it.dirApuntar.z) / (m * a);
        if (d < 0) k *= 1 - AJUSTE.atras * -d;
      }
      const def = this.arma?.def;
      if (this.disparandoT > 0 && def) k *= AJUSTE.disparando[def.arquetipo] ?? AJUSTE.disparando.defecto;
      if (this.arma?.recargando) k *= AJUSTE.recargando;
      if (this.cuerpoT > 0) k *= AJUSTE.cuerpo;
      if (this.pisoton > 0) k *= 0.25;
      if (this.cargandoLanzar) k *= 0.85;
      if (!incapacitado) { tx = it.moverX * vmaxBase * k; tz = it.moverZ * vmaxBase * k; }
      if (this.lungeT > 0) { this.lungeT -= dt; }

      const vm = Math.hypot(this.vx, this.vz);
      const tope = Math.max(vmaxBase, 0.1) * AJUSTE.exceso;
      if (vm > tope) {
        // Velocidad por encima de la normal (impulso, explosión): se disipa suavemente hacia la deseada.
        const f = Math.exp(-AJUSTE.disipacion * dt);
        this.vx = tx + (this.vx - tx) * f; this.vz = tz + (this.vz - tz) * f;
      } else {
        const dx = tx - this.vx, dz = tz - this.vz, d = Math.hypot(dx, dz);
        if (d > 1e-5) {
          const acelera = Math.hypot(tx, tz) > vm;
          const paso = (acelera ? AJUSTE.acel : AJUSTE.freno) * dt;
          if (d <= paso) { this.vx = tx; this.vz = tz; } else { this.vx += (dx / d) * paso; this.vz += (dz / d) * paso; }
        }
      }
    }
    c.vx = this.vx; c.vz = this.vz; this._sx = this.vx; this._sz = this.vz;
  }

  _girar(dt, it) {
    const objetivo = Math.atan2(it.dirApuntar.x, it.dirApuntar.z);
    if (this.derribadoT > 0) return;
    const def = this.arma?.def;
    let giro = AJUSTE.giro;
    if (this.disparandoT > 0 && def?.arquetipo === 'pesada') giro = AJUSTE.giroPesado;
    if (this.rol.id === 'demoledor') giro = Math.min(giro, AJUSTE.giroDemoledor * 2.2);
    this.rot = girarHacia(this.rot, objetivo, giro * dt);
  }

  _aimMontado(it) {
    this.rot = Math.atan2(it.dirApuntar.x, it.dirApuntar.z);
  }

  // ───────────────────────────── Combate, armas, objetos ─────────────────────────────
  /** Dirección de disparo: desde la boca real del arma hacia el punto de mira, sin separarse mucho del cuerpo. */
  _origenYDireccion(it, out) {
    const px = this.pos.x, pz = this.pos.z;
    let ok = false;
    try { this.visual.boca?.(_boca); ok = Number.isFinite(_boca.x) && Number.isFinite(_boca.z) && Math.hypot(_boca.x - px, _boca.z - pz) < 3; } catch { ok = false; }
    const fx = Math.sin(this.rot), fz = Math.cos(this.rot);
    if (!ok) _boca.set(px + fx * 0.9, 1.2, pz + fz * 0.9);
    // Si la boca queda tras un muro (apoyado contra una pared) se dispara desde el pecho.
    const dx = _boca.x - px, dz = _boca.z - pz, d = Math.hypot(dx, dz);
    if (d > 0.05) {
      const g = this.juego.fisica.rayo(px, pz, dx / d, dz / d, d, CAPA.ESTATICO | CAPA.ESTRUCTURA, null, true);
      if (g) _boca.set(px + fx * 0.25, 1.15, pz + fz * 0.25);
    }
    out.origen.copy(_boca);
    // Rotación de tiro: hacia el punto apuntado desde la boca si es coherente con la del cuerpo.
    const ax = it.apuntar.x - _boca.x, az = it.apuntar.z - _boca.z;
    let rot = this.rot;
    if (Math.hypot(ax, az) > 1.8) {
      const r = Math.atan2(ax, az);
      if (Math.abs(difAngulo(this.rot, r)) < 1.5) rot = r;   // el tiro sale hacia la mira aunque el cuerpo aún esté girando
    }
    out.rot = rot;
    return out;
  }

  _acciones(dt, it) {
    const juego = this.juego, c = juego.combate;
    // Cambio de arma
    if (it.ranura >= 0 && it.ranura < this.armas.length) this.cambiarArma(it.ranura);
    else if (it.cambiar) this.cambiarArma(this.armaIdx + (it.cambiar > 0 ? 1 : -1));

    // Recarga manual
    const inst = this.arma;
    if (it.recargar && inst && !inst.recargando && this.cambioT <= 0) this._recargar(inst);

    // Arrojadiza y cuerpo a cuerpo
    this._arrojadiza(dt, it);
    this._cuerpoACuerpo(dt, it);

    // Disparo
    if (it.disparoPulsado) this.bufDisparo = AJUSTE.bufferDisparo; else this.bufDisparo = Math.max(0, this.bufDisparo - dt);
    if (inst && this.cambioT <= 0 && !this.cargandoLanzar && this.cuerpoT <= 0.08) {
      const auto = inst.def?.auto;
      const reciente = it.disparoPulsado || (!auto && this.bufDisparo > 0);
      const tir = this._tiro ?? (this._tiro = { origen: new THREE.Vector3(), rot: 0 });
      this._origenYDireccion(it, tir);
      let disparo = false;
      try { disparo = !!c?.gatillo?.(this, inst, tir.origen, tir.rot, it.disparar, reciente); } catch (e) { this._errorUnaVez('gatillo', e); }
      if (disparo) {
        this.disparandoT = 0.28; this.bufDisparo = 0;
        this._accionar('disparar');
        this.comp.alDisparo?.(this);
      } else if (it.disparar && inst.municion <= 0 && !inst.recargando) this._recargar(inst);
      // Recarga automática
      if (inst.municion <= 0 && !inst.recargando && this.autoRecargaT <= 0) this._recargar(inst);
    }
    this._usar(it);
  }

  _errorUnaVez(clave, e) {
    this._errores = this._errores ?? {};
    if (this._errores[clave]) return;
    this._errores[clave] = true; console.error(`[jugadores] error en ${clave}`, e);
  }

  _recargar(inst) {
    this.autoRecargaT = AJUSTE.autoRecarga;
    const ok = this.juego.combate?.recargar?.(inst, this);
    if (ok) this._accionar('recargar', { duracion: inst.def?.recarga });
    return ok;
  }

  _cuerpoACuerpo(dt, it) {
    const def = this.defCuerpo;
    if (!def || !(it.cuerpo || it.cuerpoMantenido) || this.cuerpoCd > 0 || this.cargandoLanzar) return;
    const cad = def.cadencia ?? 1.5;
    this.cuerpoCd = 1 / (cad * (this.mods.cadenciaCuerpo ?? 1));
    this.cuerpoT = Math.min(0.35, this.cuerpoCd);
    const fx = Math.sin(this.rot), fz = Math.cos(this.rot);
    _origen.set(this.pos.x + fx * 0.4, 1.1, this.pos.z + fz * 0.4);
    this._accionar('cuerpo', { duracion: this.cuerpoCd });
    this.visual.accion?.('cuerpo', { duracion: this.cuerpoCd });
    // Pequeña embestida hacia delante: el golpe se siente.
    const k = this.rasgos.inamovible ? 2.2 : 3.2;
    this.vx += fx * k; this.vz += fz * k;
    try { this.juego.combate?.golpear?.(this, def.id, _origen, this.rot); } catch (e) { this._errorUnaVez('golpear', e); }
    this.audio('golpe_cuerpo');
  }

  _arrojadiza(dt, it) {
    const def = this.defArrojadiza;
    if (!def) return;
    if (it.lanzar && !this.cargandoLanzar) {
      if (this.arrojadizas <= 0) { if (this._avisoT <= 0) { this._avisoT = 0.6; this.audio('sin_municion'); this.juego.eventos.emitir('mensaje', { texto: 'Sin arrojadizas', tipo: 'aviso', duracion: 1 }); } }
      else if (this.lanzarCd <= 0) this.cargandoLanzar = true;
    }
    if (!this.cargandoLanzar) return;
    // Destino acotado al alcance del arma.
    const it0 = it, d = this.destinoLanzar;
    let dx = it0.apuntar.x - this.pos.x, dz = it0.apuntar.z - this.pos.z;
    const dd = Math.hypot(dx, dz) || 1, alc = Math.max(AJUSTE.lanzarMin, Math.min(dd, def.alcance ?? 16));
    d.x = this.pos.x + (dx / dd) * alc; d.z = this.pos.z + (dz / dd) * alc; d.valido = true;
    this._mostrarMarcador(d.x, d.z, def.radio ?? 3);
    if (!it.lanzarMantenido) {
      this.cargandoLanzar = false; this._ocultarMarcador();
      if (this.arrojadizas <= 0) return;
      this.arrojadizas--; this.lanzarCd = AJUSTE.lanzarEnfriamiento;
      const destino = { x: d.x, z: d.z };
      this.visual.accion?.('lanzar', { duracion: 0.4 });
      this.retardo(0.12, () => {
        if (!this.vivo) return;
        const fx = Math.sin(this.rot), fz = Math.cos(this.rot);
        _origen.set(this.pos.x + fx * 0.5, 1.4, this.pos.z + fz * 0.5);
        try { this.juego.combate?.lanzar?.(this, def.id, _origen, destino); } catch (e) { this._errorUnaVez('lanzar', e); }
      });
      this.audio('lanzar');
    }
  }

  _mostrarMarcador(x, z, radio) {
    if (!this._marcador) {
      const g = new THREE.RingGeometry(0.93, 1, 40);
      const m = new THREE.MeshBasicMaterial({ color: this.rol.color, transparent: true, opacity: 0.75, depthWrite: false, side: THREE.DoubleSide });
      const malla = new THREE.Mesh(g, m); malla.rotation.x = -Math.PI / 2; malla.renderOrder = 5;
      const punto = new THREE.Mesh(new THREE.CircleGeometry(0.12, 12), m); punto.rotation.x = -Math.PI / 2; punto.renderOrder = 5;
      const grupo = new THREE.Group(); grupo.add(malla, punto); grupo.userData.dispose = [g, m, punto.geometry];
      this.juego.render?.escena?.add(grupo);
      this._marcador = grupo;
    }
    this._marcador.visible = true; this._marcador.position.set(x, 0.07, z);
    this._marcador.children[0].scale.setScalar(Math.max(0.5, radio));
  }
  _ocultarMarcador() { if (this._marcador) this._marcador.visible = false; }

  // ───────────────────────────── Interacción: usar, reanimar, reparar ─────────────────────────────
  _usar(it, soloLeer = false) {
    const juego = this.juego;
    if (soloLeer) return;
    // 1) Montado: E baja.
    if (this._montado) {
      this.interactivo = { obj: this.vehiculo ?? this.emplazamiento, etiqueta: 'Bajar', tipo: 'bajar', progreso: 0, mantener: 0 };
      if (it.usar && !this.usoBloqueado) { const o = this.vehiculo ?? this.emplazamiento; try { o?.bajar?.(); } catch (e) { console.error(e); } }
      if (!it.usarMantenido) this.usoBloqueado = false;
      return;
    }
    if (!it.usarMantenido) this.usoBloqueado = false;

    // 2) Reanimar a un compañero caído cercano (prioridad máxima).
    const caido = this._caidoCercano();
    if (caido) {
      const t = (this.rol.id === 'medico' ? AJUSTE.reanimarMedica : AJUSTE.reanimarTiempo) / Math.max(0.1, this.mods.reanimacion ?? 1);
      this.interactivo = { obj: caido, etiqueta: `Reanimar${caido.rol ? ' a ' + caido.rol.nombre : ''}`, tipo: 'reanimar', progreso: caido.progresoReanimar, mantener: t };
      this.usoT = 0;
      if (it.usarMantenido && !this.usoBloqueado) {
        caido.progresoReanimar = Math.min(1, caido.progresoReanimar + juego.tiempo.dt / t);
        caido._reanimadoPor = this;
        caido._reanimandoT = 0.15;
        if (caido.progresoReanimar >= 1) { caido.reanimar(); this.usoBloqueado = true; this.audio('reanimar'); this.visual.accion?.('habilidad', { duracion: 0.4 }); }
      }
      return;
    }

    // 3) Interactivo del mundo
    let obj = null;
    try { obj = juego.mundo?.interactivoCercano?.(this) ?? null; } catch (e) { this._errorUnaVez('interactivoCercano', e); }
    if (obj && obj.puedeUsar && !obj.puedeUsar(this)) obj = null;

    // 4) Reparación (Ingeniero): mantener E junto a una estructura o vehículo dañado
    const rep = this.rol.id === 'ingeniero' ? this._reparable() : null;
    const mantener = obj?.mantener > 0;
    if (rep && !mantener) {
      const frac = rep.vida / rep.vidaMax;
      if (obj) {
        // Hay ambas cosas: un toque usa el objeto, mantener repara.
        this.interactivo = { obj, etiqueta: obj.etiqueta ?? 'Usar', tipo: 'usar', progreso: 0, mantener: 0, reparable: rep };
        if (it.usarMantenido && !this.usoBloqueado) {
          this.usoT += juego.tiempo.dt;
          if (this.usoT > 0.3) this._reparar(rep, juego.tiempo.dt);
        } else {
          if (this.usoT > 0 && this.usoT <= 0.3 && !it.usarMantenido) this._usarObjeto(obj);
          this.usoT = 0;
        }
      } else {
        this.interactivo = { obj: rep, etiqueta: 'Reparar', tipo: 'reparar', progreso: frac, mantener: 0 };
        if (it.usarMantenido && !this.usoBloqueado) this._reparar(rep, juego.tiempo.dt);
        this.usoT = 0;
      }
      return;
    }

    if (!obj) { this.interactivo = null; this.usoT = 0; this._usoObj = null; return; }
    if (obj !== this._usoObj) { this._usoObj = obj; this.usoT = 0; }
    const hold = obj.mantener > 0 ? obj.mantener : 0;
    this.interactivo = { obj, etiqueta: obj.etiqueta ?? 'Usar', tipo: 'usar', progreso: hold ? this.usoT / hold : 0, mantener: hold };
    if (hold) {
      if (it.usarMantenido && !this.usoBloqueado) {
        this.usoT += juego.tiempo.dt;
        if (this.usoT >= hold) { this.usoT = 0; this.usoBloqueado = true; this._usarObjeto(obj); }
      } else this.usoT = Math.max(0, this.usoT - juego.tiempo.dt * 2);
    } else {
      this.usoT = 0;
      if (it.usar && !this.usoBloqueado) this._usarObjeto(obj);
    }
  }

  _usarObjeto(obj) {
    try { obj.usar?.(this); } catch (e) { console.error('[jugadores] error al usar', obj?.etiqueta, e); }
    this.visual.accion?.('habilidad', { duracion: 0.3 });
  }

  _caidoCercano() {
    let mejor = null, md = AJUSTE.reanimarRadio;
    const l = this.juego.jugadores;
    for (let i = 0; i < l.length; i++) {
      const o = l[i];
      if (o === this || !o.caido) continue;
      const d = Math.hypot(o.pos.x - this.pos.x, o.pos.z - this.pos.z);
      if (d < md) { md = d; mejor = o; }
    }
    return mejor;
  }

  _reparable() {
    const juego = this.juego, px = this.pos.x, pz = this.pos.z;
    let mejor = null, md = Infinity;
    const probar = (o) => {
      if (!o || o.vivo === false || !(o.vidaMax > 0) || o.vida >= o.vidaMax - 0.01 || !o.pos) return;
      const d = Math.hypot(o.pos.x - px, o.pos.z - pz) - (o.radio ?? 0.8);
      if (d < AJUSTE.repararAlcance && d < md) { md = d; mejor = o; }
    };
    const es = juego.mundo?.estructuras; if (es) for (let i = 0; i < es.length; i++) probar(es[i]);
    const vs = juego.vehiculos?.lista; if (vs) for (let i = 0; i < vs.length; i++) probar(vs[i]);
    return mejor;
  }

  _reparar(o, dt) {
    const k = (o.def?.vehiculo || o.conductor !== undefined) ? (this.mods.vehiculos ?? 1) : 1;
    const cantidad = o.vidaMax * AJUSTE.reparar * k * (this.mods.reparacion ?? 1) * dt;
    if (o.reparar) o.reparar(cantidad); else o.vida = Math.min(o.vidaMax, o.vida + cantidad);
    this._repT = (this._repT ?? 0) - dt;
    if (this._repT <= 0) {
      this._repT = 0.22;
      this.juego.fx?.emitir?.('chispas', { x: o.pos.x, y: 0.9, z: o.pos.z }, { escala: 0.7, cantidad: 5 });
      this.audio('reparar', o.pos.x, o.pos.z);
    }
    this.visual.accion?.('cuerpo', { duracion: 0.2 });
  }

  // ───────────────────────────── Caído ─────────────────────────────
  _actualizarCaido(dt) {
    // La barra de reanimación decae sola si nadie la mantiene.
    this._reanimandoT = Math.max(0, (this._reanimandoT ?? 0) - dt);
    if (this._reanimandoT <= 0 && this.progresoReanimar > 0) this.progresoReanimar = Math.max(0, this.progresoReanimar - dt * 0.6);
    this.cuerpo.vx = this.cuerpo.vz = 0; this.vx = this.vz = this._sx = this._sz = 0;
    this.interactivo = null;
  }

  _parpadeoVisual(dt) {
    // Parpadeo tras la reanimación/ invulnerabilidad larga (no en la esquiva).
    if (this.invulT > 0.4 && !this.esq.activa && !this._montado) {
      this._parpadeo += dt;
      this.visual.visible?.(Math.floor(this._parpadeo * 14) % 2 === 0);
      this._parpadeando = true;
    } else if (this._parpadeando) { this._parpadeando = false; if (!this._ocultoPorMonta) this.visual.visible?.(true); }
  }

  // ───────────────────────────── Sincronía con la física ─────────────────────────────
  posFisica(dt) {
    if (this.muerto) return;
    const c = this.cuerpo;
    if (!this._montado) { this.pos.x = c.x; this.pos.z = c.z; }
    const mirar = this.caido ? this.rot : this.rot;
    if (!this._montado || !this._ocultoPorMonta) this.visual.colocar?.(this.pos.x, this.pos.z, mirar);
    this.visual.mover?.(this.caido || this._montado ? 0 : c.vx, this.caido || this._montado ? 0 : c.vz);
  }

  destruir() {
    this._soltarMontura();
    if (this.cuerpo?.activo) this.juego.fisica.eliminarCuerpo(this.cuerpo);
    quitarTodos(this);
    this.visual.liberar?.();
    if (this._marcador) {
      this._marcador.removeFromParent();
      for (const d of this._marcador.userData.dispose ?? []) d.dispose?.();
      this._marcador = null;
    }
    this.retardos.length = 0;
    this.vivo = false;
  }
}
