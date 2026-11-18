// Entidad Vehículo: física arcade, conducción, atropellos, daño, destrucción y efectos. Dañable (contrato §Interfaz Dañable).
import * as THREE from 'three';
import { CAPA, TODAS } from '../nucleo/fisica.js';
import { limitar, difAngulo, girarHacia, amortiguar } from '../nucleo/util.js';
import { MODELOS } from './modelos/index.js';

const _v = new THREE.Vector3();
const PI = Math.PI;
const MASCARA_SUELTOS = CAPA.ESTATICO | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;

export class Vehiculo {
  constructor(sis, def, { x = 0, z = 0, rot = 0 } = {}) {
    const juego = sis.juego;
    this.sis = sis; this.juego = juego; this.def = def; this.id = def.id;
    this.bando = 'neutral'; this.vivo = true; this.material = def.material;
    this.pos = new THREE.Vector3(x, 0, z); this.rot = rot;
    this.radio = (def.hx + def.hz) * 0.5 + 0.1;
    this.vidaMax = def.vida; this.vida = def.vida;
    this.conductor = null; this.ultimoConductor = null;
    this.ocultaConductor = def.ocultaConductor;
    this.velocidad = 0; this.combustible = 1; this.esVehiculo = true;
    this.mando = null;           // gancho de pruebas/IA: { moverX, moverZ, esquivar, disparar, disparoPulsado, apuntar:{x,z} } sustituye a la entrada
    this.estado = { vf: 0, vl: 0, w: 0, steer: 0, thr: 0, vel: 0, t: Math.random() * 20, esprint: false, derrape: 0, af: 0, marchaAtras: false, cansado: false };
    this.fisicoT = 0; this.tChoque = -9; this.combo = 0; this.comboT = 0; this.zoomT = 0;
    this.etapaDanio = 0; this.emisores = []; this.luzFaros = null; this.luzFuego = null; this.bucle = null;
    this.tPolvo = 0; this.tMarca = 0; this.tHumoEscape = 0; this.retro = 0;
    this.pitch = 0; this.roll = 0; this.pitchV = 0; this.rollV = 0; this.bob = 0; this.bobV = 0;
    this.armaInst = null; this.portador = null; this.yawArma = 0; this.cuerpoRestos = null; this.interactivo = null;

    const fisica = juego.fisica;
    this.cuerpo = fisica.crearCuerpo({
      forma: 'caja', x, z, hx: def.hx, hz: def.hz, rot, masa: def.masa, capa: CAPA.VEHICULO, mascara: TODAS,
      amortiguacion: 0, rebote: 0.1, rigidez: 1, datos: this,
      alColisionar: (o, nx, nz, sol, vr) => this._contacto(o, nx, nz, sol, vr),
    });

    // Modelo
    this.modelo = MODELOS[def.id]({ eraIdx: def.era, juego });
    this.grupo = this.modelo.grupo;
    this.grupo.position.set(x, 0, z); this.grupo.rotation.y = rot;
    juego.render?.escena?.add(this.grupo);
    this.etiqueta = def.etiqueta;
    this._registrar();
  }

  // ───────────────────────── Interactivo ─────────────────────────
  _registrar() {
    const mundo = this.juego.mundo;
    if (!mundo?.registrarInteractivo) return;
    try {
      this.interactivo = mundo.registrarInteractivo({
        pos: this.pos, radioUso: this.radio + 1.6, etiqueta: this.def.etiqueta, objeto: this, esVehiculo: true,
        puedeUsar: (j) => this.vivo && !this.conductor && !j.vehiculo && !j.emplazamiento && !j.caido,
        usar: (j) => this.subir(j),
      });
    } catch (e) { console.error('[vehiculos] registrarInteractivo', e); }
  }
  _quitarInteractivo() {
    if (this.interactivo) { try { this.juego.mundo?.quitarInteractivo?.(this.interactivo); } catch { /* mundo provisional */ } this.interactivo = null; }
  }

  // ───────────────────────── Conducción ─────────────────────────
  subir(j) {
    if (!this.vivo || this.conductor || !j || j.vehiculo || j.emplazamiento) return false;
    this.conductor = j; this.ultimoConductor = j; j.vehiculo = this;
    this.bando = 'jugadores';
    this.estado.cansado = false;
    const juego = this.juego, a = this.def.arma;
    if (a && juego.combate?.crearArma) {
      const km = j.mods?.danio ?? 1;
      const mods = { ...this.def.armaMods }; mods.danio = (mods.danio ?? 1) * km;
      this.portador = {
        bando: 'jugadores', pos: this.pos, mods, cuerpo: this.cuerpo, indice: j.indice, vehiculo: this, conductor: j,
        rot: this.rot, distApuntado: 18, visual: { accion() {} }, rol: j.rol, esVehiculo: true,
      };
      if (!this.armaInst) this.armaInst = juego.combate.crearArma(a, this.portador);
      this.armaInst.calor = 0; this.armaInst.sobrecalentado = false;
    }
    this.yawArma = 0;
    this._iniciarMotor();
    juego.render?.zoom?.(1.25, 0.9); this.zoomT = 0.5;
    juego.audio?.reproducir?.('vehiculo_subir', { x: this.pos.x, z: this.pos.z, volumen: 0.7 });
    juego.eventos.emitir('vehiculo:subir', { vehiculo: this, jugador: j });
    return true;
  }

  /** Baja al conductor al lado libre. Idempotente. */
  bajar(expulsado = false) {
    const j = this.conductor;
    if (!j) return;
    this.conductor = null;
    if (j.vehiculo === this) j.vehiculo = null;
    if (this.vivo) this.bando = 'neutral';
    this._pararMotor();
    this.mando && (this.mando.disparar = false);
    const f = this.juego.fisica, d = this.def;
    const cs = Math.cos(this.rot), sn = Math.sin(this.rot);
    const radioJ = (j.radio ?? 0.4) + 0.08;
    let hecho = false;
    const lado = [1, -1];
    // si hay objetivo, bajamos por el lado más alejado del peligro: probamos ambos lados y varias posiciones longitudinales
    for (const off of expulsado ? [d.hx + 2.4, d.hx + 3.4, d.hx + 4.6] : [d.hx + radioJ + 0.25, d.hx + radioJ + 0.9]) {
      for (const ll of [0, -0.35, 0.35, -0.7]) {
        for (const s of lado) {
          const lx = s * off, lz = ll * d.hz;
          const px = this.pos.x + lx * cs + lz * sn, pz = this.pos.z - lx * sn + lz * cs;
          if (f.libre(px, pz, radioJ, MASCARA_SUELTOS | CAPA.ZOMBI * 0)) { j.teletransportar?.(px, pz); if (expulsado) { const l = Math.hypot(lx, lz) || 1; const k = 5; if (j.cuerpo) { j.cuerpo.vx = lx / l * k * cs; j.cuerpo.vz = -lx / l * k * sn; j.vx = j.cuerpo.vx; j.vz = j.cuerpo.vz; } } hecho = true; break; }
        }
        if (hecho) break;
      }
      if (hecho) break;
    }
    this.juego.audio?.reproducir?.('vehiculo_bajar', { x: this.pos.x, z: this.pos.z, volumen: 0.5 });
    this.juego.eventos.emitir('vehiculo:bajar', { vehiculo: this, jugador: j });
    if (this.modelo.alBajar) this.modelo.alBajar();
  }

  reparar(cantidad) {
    if (!this.vivo || cantidad <= 0) return;
    this.vida = Math.min(this.vidaMax, this.vida + cantidad);
    this._etapaDanio();
  }

  _iniciarMotor() {
    if (this.bucle || !this.juego.audio?.bucle) return;
    try { this.bucle = this.juego.audio.bucle('motor_' + this.id, { volumen: 0.5, x: this.pos.x, z: this.pos.z }); } catch { this.bucle = null; }
  }
  _pararMotor() { if (this.bucle) { try { this.bucle.detener?.(); } catch { /* audio provisional */ } this.bucle = null; } }

  _entrada() {
    if (this.mando) return this.mando;
    const j = this.conductor;
    if (!j) return null;
    return this.juego.entrada?.de?.(j.indice) ?? null;
  }

  // ───────────────────────── Física arcade ─────────────────────────
  actualizar(dt) {
    if (!this.vivo || dt <= 0) return;
    const d = this.def, E = this.estado, c = this.cuerpo;
    E.t += dt;
    // piloto automático (pruebas / IA)
    if (this.piloto && !this.conductor) this.mando = this.piloto(this, dt) ?? this.mando;
    const it = (this.conductor || this.mando) ? this._entrada() : null;
    const mx = it?.moverX ?? 0, mz = it?.moverZ ?? 0;
    let mag = Math.min(1, Math.hypot(mx, mz));
    const mano = !!it?.esquivar;
    // 1) velocidad actual del cuerpo (los choques la habrán modificado) → ejes del vehículo
    let vx = c.vx, vz = c.vz;
    const cs0 = Math.cos(this.rot), sn0 = Math.sin(this.rot);
    // 2) orden de dirección
    let vf = vx * sn0 + vz * cs0;
    let steerObj = 0, thr = 0;
    if (mag > 0.12) {
      const objRot = Math.atan2(mx, mz);
      let dif = difAngulo(this.rot, objRot);
      const adif = Math.abs(dif);
      let atras = E.marchaAtras;
      if (!atras && adif > 2.35 && vf < 2.2 && !d.sinMarchaAtras) atras = true;
      else if (atras && adif < 1.75) atras = false;
      if (d.tipo === 'montura' || d.tipo === 'aero') { if (adif < 2.6) atras = false; }
      E.marchaAtras = atras;
      if (atras) { dif = difAngulo(this.rot + PI, objRot); thr = -mag; }
      else if (adif > 2.35 && vf > 2.2 && d.tipo !== 'montura') thr = -mag * 0.9;    // frenar antes de dar la vuelta
      else thr = mag * (adif < 1.9 ? 1 : 0.55);
      steerObj = dif;
    } else E.marchaAtras = false;
    this._pasos(dt, d, E, c, it, mano, mag, thr, steerObj, vx, vz);
  }

  _pasos(dt, d, E, c, it, mano, mag, thr, steerObj, vx, vz) {
    // Aguante del caballo
    let vmax = d.vmax;
    E.esprint = false;
    if (d.combustible) {
      if (it && mano && !E.cansado && this.combustible > 0.02 && thr > 0.1) { E.esprint = true; vmax = d.vmaxEsprint; this.combustible = Math.max(0, this.combustible - dt * 0.17); if (this.combustible <= 0.02) E.cansado = true; }
      else { this.combustible = Math.min(1, this.combustible + dt * (Math.abs(E.vf) > 6 ? 0.045 : 0.12)); if (E.cansado && this.combustible > 0.35) E.cansado = false; }
    }
    vmax *= 1 - (this.vida < this.vidaMax * 0.25 ? 0.25 : this.vida < this.vidaMax * 0.5 ? 0.1 : 0);
    // 3) guiñada
    const vfAbs = Math.abs(E.vf);
    const frac = limitar(vfAbs / Math.max(1, d.vmax), 0, 1);
    let wmax = d.giro / (1 + frac * (d.tipo === 'montura' ? 0.5 : d.tipo === 'aero' ? 0.8 : 1.5));
    const cap = d.giroMin + (1 - d.giroMin / Math.max(d.giro, 0.01)) * limitar(vfAbs / 3.2, 0, 1) * d.giro;
    wmax = Math.min(wmax, Math.max(cap, d.giroMin));
    if (mano && d.tipo === 'coche') wmax *= 1.55;
    const wObj = limitar(steerObj * 3.2, -1, 1) * wmax * (Math.abs(thr) > 0.01 || d.giroMin > 0 || d.tipo === 'montura' ? 1 : 0);
    const gw = d.tipo === 'aero' ? 3.2 : d.tipo === 'montura' ? 9 : 6.5;
    E.w = amortiguar(E.w, wObj, gw, dt);
    this.rot += E.w * dt;
    if (this.rot > PI) this.rot -= 2 * PI; else if (this.rot < -PI) this.rot += 2 * PI;
    // 4) descomposición con el rumbo nuevo
    const cs = Math.cos(this.rot), sn = Math.sin(this.rot);
    let vf = vx * sn + vz * cs, vl = vx * cs - vz * sn;
    const vfAntes = vf;
    // 5) longitudinal
    if (thr > 0.01) {
      const f = 1 - Math.pow(limitar(vf / vmax, 0, 1.2), 2);
      vf += d.acel * thr * Math.max(0, f) * dt;
      if (vf > vmax * 1.001 && !E.esprint) vf = Math.max(vmax, vf - d.freno * 0.5 * dt);
    } else if (thr < -0.01) {
      if (vf > 0.4) vf = Math.max(0, vf - d.freno * (-thr) * dt);
      else { const f = 1 - Math.pow(limitar(-vf / d.vmaxAtras, 0, 1.2), 2); vf -= d.acel * 0.6 * (-thr) * Math.max(0, f) * dt; }
    } else {
      const fr = (d.rodadura + d.freno * 0.12) * dt;
      vf = Math.abs(vf) <= fr ? 0 : vf - Math.sign(vf) * fr;
    }
    // arrastre y freno de mano
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), d.resist * vf * vf * dt);
    if (mano && d.tipo !== 'montura') vf -= Math.sign(vf) * Math.min(Math.abs(vf), d.freno * 0.55 * dt);
    if (vf < -d.vmaxAtras) vf = -d.vmaxAtras;
    // 6) agarre lateral
    let grip = d.agarre;
    if (mano && d.tipo === 'coche') grip *= 0.12;
    const slip = Math.abs(vl);
    const vlAntes = vl;
    vl *= Math.exp(-grip * dt);
    // el derrape cuesta velocidad
    vf -= Math.sign(vf) * Math.min(Math.abs(vf), (Math.abs(vlAntes) - Math.abs(vl)) * 0.22);
    E.derrape = amortiguar(E.derrape, limitar((slip - 2.2) / 6, 0, 1), 8, dt);
    // 7) a mundo
    c.vx = vf * sn + vl * cs; c.vz = vf * cs - vl * sn;
    c.rot = this.rot;
    E.af = (vf - vfAntes) / dt * 0.0 + amortiguar(E.af, (vf - E.vf) / dt, 10, dt);
    E.vf = vf; E.vl = vl; E.thr = thr; E.vel = Math.hypot(c.vx, c.vz);
    E.steer = amortiguar(E.steer, limitar(steerObj * 0.9, -0.55, 0.55), 9, dt);
    this.velocidad = vf;
    // 8) arma montada
    if (this.def.arma && this.conductor && this.armaInst) this._arma(dt, it);
    // 9) zoom persistente
    if (this.conductor && (this.zoomT -= dt) <= 0) { this.zoomT = 0.45; this.juego.render?.zoom?.(1.25, 0.9); }
  }

  _arma(dt, it) {
    const juego = this.juego, m = this.modelo.arma, inst = this.armaInst, p = this.portador;
    juego.combate?.actualizarArma?.(inst, dt, p);
    if (!m || !it) return;
    const ap = it.apuntar ?? { x: this.pos.x + Math.sin(this.rot) * 10, z: this.pos.z + Math.cos(this.rot) * 10 };
    m.yaw.getWorldPosition(_v);
    const ax = ap.x - _v.x, az = ap.z - _v.z;
    const aim = Math.atan2(ax, az);
    const objetivoLocal = difAngulo(this.rot, aim);
    this.yawArma = girarHacia(this.yawArma, objetivoLocal, (this.def.giroArma ?? 6) * dt);
    m.yaw.rotation.y = this.yawArma;
    const rotTiro = this.rot + this.yawArma;
    p.rot = rotTiro; p.distApuntado = Math.hypot(ax, az);
    const alin = Math.abs(difAngulo(rotTiro, aim)) < 0.3;
    if (it.disparar && alin) {
      (m.boca ?? m.yaw).getWorldPosition(_v);
      _v.y = Math.max(0.9, _v.y);
      if (juego.combate?.gatillo?.(p, inst, _v, rotTiro, true, !!it.disparoPulsado)) this.retro = 1;
    }
  }

  // ───────────────────────── Contactos ─────────────────────────
  _contacto(otro, nx, nz, solape, vr) {
    if (!this.vivo) return;
    const juego = this.juego, ahora = juego.tiempo.ahora, d = this.def;
    const e = otro.datos;
    const vel = Math.abs(this.estado.vf);
    if (e && e.bando === 'zombis') {
      if (e.vivo === false) return;
      const v = Math.max(vr, vel * 0.5);
      if (vr < 0.8 || v < 2.3) return;
      if (ahora - (e._atrT ?? -9) < 0.3) return;
      e._atrT = ahora;
      this._atropello(e, otro, nx, nz, v);
      return;
    }
    if (e && (e.bando === 'jugadores' || otro.capa & CAPA.JUGADOR)) return;
    // Obstáculo
    if (vr < 4.2) return;
    if (ahora - this.tChoque < 0.16) return;
    this.tChoque = ahora;
    const bruto = otro.estatico || !e || (otro.capa & CAPA.VEHICULO) || e.recibirDanio === undefined;
    const dano = d.durezaChoque * Math.pow(vr - 3.6, 1.5) * 4.2 * (bruto ? 1 : 0.5);
    this._danioPropio(dano, 'choque');
    this.estado.vf *= 0.9;
    const px = this.pos.x + nx * (d.hz * 0.6), pz = this.pos.z + nz * (d.hz * 0.6);
    juego.fx?.emitir?.('chispas', { x: px, y: 0.8, z: pz }, { dirX: -nx, dirZ: -nz, cantidad: 10 });
    juego.fx?.emitir?.('polvo', { x: px, y: 0.3, z: pz }, { escala: 1 + vr * 0.05, cantidad: 4 });
    if (this.conductor) { juego.render?.sacudir?.(limitar(vr * 0.02, 0.1, 0.5), 0.25); juego.entrada?.vibrar?.(this.conductor.indice, limitar(vr * 0.04, 0.2, 0.9), 0.25); }
    juego.audio?.reproducir?.('choque_vehiculo', { x: this.pos.x, z: this.pos.z, volumen: limitar(vr / 14, 0.3, 1) });
    this.pitchV -= limitar(vr * 0.02, 0, 0.3) * Math.sign(this.estado.vf || 1);
    if (e && e.recibirDanio && e.bando !== 'zombis' && e.vivo !== false) {
      juego.combate?.aplicarDanio?.(e, { tipo: 'golpe', cantidad: vr * 14 * (d.masa / 1500), empuje: 0, atacante: this.conductor ?? this.ultimoConductor, dirX: nx, dirZ: nz, x: otro.x, z: otro.z });
    }
  }

  _atropello(z, otro, nx, nz, v) {
    const juego = this.juego, d = this.def, c = this.cuerpo;
    const grande = z.esJefe || z.clase?.id === 'mole' || (z.masa ?? 70) >= 400;
    const vm = Math.hypot(c.vx, c.vz) || 1;
    // dirección de salida: mezcla de la marcha del vehículo y la normal de contacto
    let dx = (c.vx / vm) * 0.65 + nx * 0.35, dz = (c.vz / vm) * 0.65 + nz * 0.35;
    const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const base = d.masa / 1000 * 14 * v * d.atropello * (0.9 + juego.rng() * 0.2);
    const atacante = this.conductor ?? this.ultimoConductor;
    const empuje = limitar(v * 0.95 + 3, 3, 20);
    const mat0 = z.vivo;
    const real = juego.combate?.aplicarDanio?.(z, {
      tipo: 'golpe', cantidad: base * (grande ? 0.8 : 1), empuje: grande ? empuje * 0.3 : empuje, atacante, dirX: dx, dirZ: dz,
      aturdimiento: grande ? 1.2 : 0.7, x: z.pos?.x ?? otro.x, z: z.pos?.z ?? otro.z, sinMods: true, y: 0.9,
    }) ?? 0;
    juego.eventos.emitir('vehiculo:atropello', { vehiculo: this, objetivo: z, velocidad: v });
    // el vehículo pierde algo de velocidad; jefes y Moles lo detienen
    const E = this.estado;
    if (grande) {
      E.vf *= 0.4; c.vx *= 0.4; c.vz *= 0.4;
      this._danioPropio(Math.min(this.vidaMax * 0.08, (z.masa ?? 450) * v * 0.06), 'choque');
      if (this.conductor) juego.render?.sacudir?.(0.45, 0.35);
      juego.fx?.emitir?.('chispas', { x: otro.x, y: 1, z: otro.z }, { dirX: dx, dirZ: dz, cantidad: 8 });
    } else {
      const k = limitar((z.masa ?? 70) / (d.masa + (z.masa ?? 70)) * 1.1 * (d.tipo === 'tractor' ? 0.1 : 1), 0, 0.2);
      E.vf *= 1 - k; c.vx *= 1 - k; c.vz *= 1 - k;
      if (this.conductor) juego.render?.sacudir?.(limitar(0.05 + v * 0.008, 0.06, 0.22), 0.13);
    }
    this.pitchV -= 0.5 * Math.sign(E.vf || 1) * limitar(v / 20, 0.1, 1);
    this.bobV += 0.8;
    if (this.conductor) juego.entrada?.vibrar?.(this.conductor.indice, 0.3, 0.1);
    juego.audio?.reproducir?.('atropello', { x: otro.x, z: otro.z, volumen: limitar(v / 14, 0.45, 1), tono: 0.9 + juego.rng() * 0.2 });
    if (real > 0 && z.vivo === false) {
      this.combo = this.comboT > 0 ? this.combo + 1 : 1; this.comboT = 1.6;
      if (this.conductor && [4, 8, 12, 20, 30].includes(this.combo)) juego.eventos.emitir('mensaje', { texto: `¡${this.combo} arrollados de un golpe!`, tipo: 'logro', duracion: 1.8 });
    }
    void mat0;
  }

  // ───────────────────────── Daño ─────────────────────────
  recibirDanio(info) {
    if (!this.vivo) return 0;
    const t = info.tipo ?? 'bala', d = this.def;
    const metal = d.material === 'metal';
    let k = 1;
    switch (t) {
      case 'acido': k = 3; break;
      case 'bala': k = metal ? 0.3 : 1; break;
      case 'perforante': k = metal ? 0.5 : 1; break;
      case 'energia': k = 0.8; break;
      case 'fuego': k = 0.5; break;
      case 'golpe': k = d.blindaje; break;
      case 'veneno': k = 0; break;
      default: k = 1;
    }
    let c = (info.cantidad ?? 0) * k;
    const kv = this.conductor?.mods?.vehiculos ?? this.conductor?.rol?.mods?.vehiculos ?? 1;
    if (kv > 1) c /= kv;
    if (this.juego.opciones?.dios && this.conductor) c = 0;
    return this._aplicar(c, info.atacante);
  }

  _danioPropio(c, causa) {
    const kv = this.conductor?.mods?.vehiculos ?? this.conductor?.rol?.mods?.vehiculos ?? 1;
    if (this.juego.opciones?.dios && this.conductor) return 0;
    return this._aplicar(kv > 1 ? c / kv : c, null, causa);
  }

  _aplicar(c, atacante) {
    if (!(c > 0) || !this.vivo) return 0;
    const real = Math.min(this.vida, c);
    this.vida -= real;
    this.tDanio = this.juego.tiempo.ahora;
    this.modelo.golpe?.(real / this.vidaMax);
    if (this.vida <= 0.0001) { this.vida = 0; this.destruir(atacante); return real; }
    this._etapaDanio();
    return real;
  }

  _etapaDanio() {
    const f = this.vida / this.vidaMax;
    const e = f < 0.28 ? 2 : f < 0.58 ? 1 : 0;
    if (e === this.etapaDanio) return;
    this.etapaDanio = e;
    for (const m of this.emisores) m.detener?.();
    this.emisores.length = 0;
    this.luzFuego?.quitar?.(); this.luzFuego = null;
    const fx = this.juego.fx;
    if (!fx?.crearEmisor || this.def.tipo === 'montura') return;
    const p = this._pHumo ??= { x: this.pos.x, y: 1.2, z: this.pos.z };
    if (e >= 1) this.emisores.push(fx.crearEmisor('humo', p, { escala: e === 2 ? 1.1 : 0.7 }));
    if (e >= 2) {
      this.emisores.push(fx.crearEmisor('fuego', p, { escala: 0.8 }));
      this.luzFuego = this.juego.render?.luzPuntual?.({ x: p.x, y: 1.6, z: p.z, color: 0xff7a22, intensidad: 30, distancia: 9 }) ?? null;
    }
  }

  destruir(atacante = null) {
    if (!this.vivo) return;
    const juego = this.juego, d = this.def;
    this.vivo = false;
    const j = this.conductor;
    this.bajar(true);
    this._quitarInteractivo();
    for (const m of this.emisores) m.detener?.();
    this.emisores.length = 0;
    this.luzFuego?.quitar?.(); this.luzFuego = null; this.luzFaros?.quitar?.(); this.luzFaros = null;
    this._pararMotor();
    // cuerpo dinámico → obstáculo estático (restos)
    const f = juego.fisica, c = this.cuerpo;
    this.pos.x = c.x; this.pos.z = c.z;
    f.eliminarCuerpo(c);
    this.bando = 'neutral';
    const resto = (d.tipo === 'montura') ? { hx: d.hx * 1.2, hz: d.hz * 0.8 } : { hx: d.hx * 0.88, hz: d.hz * 0.88 };
    this.cuerpoRestos = f.crearCuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: resto.hx, hz: resto.hz, rot: this.rot, masa: 0, capa: CAPA.ESTATICO, bloqueaBalas: false, bloqueaVision: false });
    this.modelo.restos?.(this);
    this.vida = 0;
    const jugador = j ?? this.ultimoConductor;
    if (d.tipo === 'montura') {
      juego.fx?.emitir?.('sangre_grande', { x: this.pos.x, y: 0.8, z: this.pos.z }, { cantidad: 12 });
      juego.fx?.emitir?.('polvo', { x: this.pos.x, y: 0.2, z: this.pos.z }, { escala: 1.6, cantidad: 8 });
      juego.audio?.reproducir?.('caballo_muerte', { x: this.pos.x, z: this.pos.z, volumen: 0.9 });
    } else {
      juego.fx?.emitir?.('explosion_grande', { x: this.pos.x, y: 1, z: this.pos.z }, { escala: 1.3 });
      juego.fx?.destello?.({ x: this.pos.x, y: 1.5, z: this.pos.z }, 0xffa040, 9, 0.35, 16);
      juego.combate?.explotar?.({ x: this.pos.x, z: this.pos.z, radio: 5.4 + d.masa / 2500, danio: 200 + this.vidaMax * 0.08, tipo: 'explosivo', atacante: jugador ?? atacante ?? null, empuje: 10, y: 1 });
      this._llamasRestos = juego.fx?.crearEmisor?.('fuego', { x: this.pos.x, y: 0.3, z: this.pos.z }, { escala: 0.9, duracion: 26 }) ?? null;
    }
    juego.render?.sacudir?.(0.6, 0.5);
    juego.zombis?.navegacion?.reconstruir?.();
    juego.eventos.emitir('vehiculo:destruido', { vehiculo: this });
    const i = this.sis.lista.indexOf(this); if (i >= 0) this.sis.lista.splice(i, 1);
    this.sis.restos.push(this);
  }

  // ───────────────────────── Visual y efectos (tras la física) ─────────────────────────
  posFisica(dt) {
    if (!this.vivo) { this.modelo.animRestos?.(dt, this); return; }
    const c = this.cuerpo, E = this.estado, d = this.def, juego = this.juego;
    this.pos.x = c.x; this.pos.z = c.z;
    // el choque con muros ha podido cambiar la velocidad: refresca la lectura de frenada
    const sp = Math.hypot(c.vx, c.vz);
    this.comboT = Math.max(0, this.comboT - dt);
    // suspensión (muelles amortiguados): cabeceo por aceleración, balanceo por fuerza centrífuga
    const objPitch = -limitar(E.af * 0.0085, -0.07, 0.07) * (d.tipo === 'montura' ? 0.7 : 1);
    const objRoll = limitar(E.w * E.vf * 0.0065, -0.09, 0.09) * (d.tipo === 'aero' ? 1.6 : 1);
    const kk = 90, cc = 9;
    this.pitchV += ((objPitch - this.pitch) * kk - this.pitchV * cc) * dt; this.pitch += this.pitchV * dt;
    this.rollV += ((objRoll - this.roll) * kk - this.rollV * cc) * dt; this.roll += this.rollV * dt;
    this.bobV += ((0 - this.bob) * 140 - this.bobV * 10) * dt; this.bob += this.bobV * dt;
    const m = this.modelo;
    this.grupo.position.set(this.pos.x, 0, this.pos.z);
    this.grupo.rotation.y = this.rot;
    m.chasis.rotation.x = this.pitch; m.chasis.rotation.z = this.roll;
    m.chasis.position.y = this.bob + (d.tipo === 'aero' ? Math.sin(E.t * 2.3) * 0.025 : 0) + (d.tipo === 'coche' && sp > 4 ? Math.sin(E.t * 38) * 0.004 * Math.min(1, sp / 15) : 0);
    // ruedas
    const R = m.ruedas;
    for (let i = 0; i < R.length; i++) {
      const r = R[i];
      if (r.giro && r.radio > 0) r.giro.rotation.x += (E.vf / r.radio) * dt;
      if (r.virar) r.virar.rotation.y = E.steer * (r.sentido ?? 1);
    }
    m.anim?.(dt, { ...E, vel: sp, af: E.af, conductor: !!this.conductor, vida: this.vida / this.vidaMax, rot: this.rot, vx: c.vx, vz: c.vz }, this);
    this.retro = Math.max(0, this.retro - dt * 9);
    if (m.arma?.retroceso) m.arma.retroceso.position.z = -this.retro * 0.09;
    this.grupo.updateMatrixWorld(true);
    this._efectos(dt, sp);
    this._jinete();
    // audio
    if (this.bucle) {
      const r = limitar(sp / d.vmax, 0, 1.3);
      try { this.bucle.ajustar?.({ volumen: 0.35 + 0.5 * r, tono: 0.7 + 0.9 * r + (E.thr > 0 ? 0.08 : 0), x: this.pos.x, z: this.pos.z }); } catch { /* audio */ }
    }
  }

  _jinete() {
    const j = this.conductor;
    if (!j || this.def.ocultaConductor || !j.visual?.colocar || !this.modelo.asiento) return;
    this.modelo.asiento.getWorldPosition(_v);
    j.visual.colocar(_v.x, _v.z, this.rot);
    if (j.visual.root) { j.visual.root.position.y = _v.y - 0.89 + (this.def.tipo === 'montura' ? 0.0 : 0.0); j.visual.root.rotation.x = this.pitch * 0.6; }
    // el tronco apunta con el arma: el visual lo hace con su propio `rot`; aquí mantenemos las piernas alineadas al vehículo
  }

  _posRueda(r, out) {
    const cs = Math.cos(this.rot), sn = Math.sin(this.rot);
    out.x = this.pos.x + r.x * cs + r.z * sn; out.z = this.pos.z - r.x * sn + r.z * cs; return out;
  }

  _efectos(dt, sp) {
    const juego = this.juego, fx = juego.fx, d = this.def, E = this.estado, m = this.modelo;
    const cs = Math.cos(this.rot), sn = Math.sin(this.rot);
    // humo/fuego de avería siguen al capó
    if (this._pHumo) { const o = m.humoAveria ?? { x: 0, y: 1.2, z: d.hz * 0.5 }; this._pHumo.x = this.pos.x + o.x * cs + o.z * sn; this._pHumo.z = this.pos.z - o.x * sn + o.z * cs; this._pHumo.y = o.y; }
    if (this.luzFuego) { this.luzFuego.pos.set(this.pos.x, 1.6, this.pos.z); this.luzFuego.intensidad = 26 + Math.sin(E.t * 23) * 9 + Math.random() * 6; }
    // faros de noche
    const noche = (juego.estado?.hora ?? 0.25) > 0.46 || (juego.estado?.hora ?? 0.25) < 0.05;
    const quiere = noche && !!this.conductor && m.faros?.length;
    if (quiere) {
      if (!this.luzFaros) this.luzFaros = juego.render?.luzPuntual?.({ x: this.pos.x, y: 1.2, z: this.pos.z, color: d.id === 'aerodeslizador' ? 0xa8e8ff : d.id === 'caballo' ? 0xffc060 : 0xfff0d0, intensidad: 55, distancia: 17 }) ?? null;
      if (this.luzFaros) this.luzFaros.pos.set(this.pos.x + sn * 5.2, 1.3, this.pos.z + cs * 5.2);
    } else if (this.luzFaros) { this.luzFaros.quitar?.(); this.luzFaros = null; }
    if (m.encender) m.encender(quiere || (noche && !!this.conductor));
    if (!fx) return;
    // polvo en las ruedas / pezuñas
    this.tPolvo -= dt;
    const rapido = sp > 3;
    if (this.tPolvo <= 0 && rapido && m.ruedas.length) {
      this.tPolvo = d.tipo === 'montura' ? 0.12 : 0.07;
      const dirX = -Math.sin(this.rot), dirZ = -Math.cos(this.rot);
      const n = m.ruedas.length;
      for (let k = 0; k < (d.tipo === 'montura' ? 2 : 1); k++) {
        const r = m.ruedas[(Math.floor(E.t * 11) + k * 2) % n];
        this._posRueda(r, _w);
        if (d.tipo === 'aero') fx.emitir('polvo', { x: _w.x, y: 0.2, z: _w.z }, { dirX: (Math.random() - 0.5), dirZ: (Math.random() - 0.5), escala: 1.2 + sp * 0.03, cantidad: 2 });
        else fx.emitir('polvo', { x: _w.x, y: 0.12, z: _w.z }, { dirX, dirZ, escala: 0.6 + E.derrape * 1.1 + sp * 0.02, cantidad: 1 + (E.derrape > 0.3 ? 2 : 0) });
      }
    }
    // humo de neumáticos y marcas de derrape
    this.tMarca -= dt;
    if (E.derrape > 0.18 && sp > 3.5 && d.tipo === 'coche' && this.tMarca <= 0) {
      this.tMarca = 0.07;
      const trasera = m.ruedas.filter((r) => !r.delantera);
      for (const r of trasera) {
        this._posRueda(r, _w);
        fx.calco?.('huella', _w.x, _w.z, 0.38, { dirX: c2(E, this.rot, 0), dirZ: c2(E, this.rot, 1) });
        if (E.derrape > 0.4) fx.emitir('humo', { x: _w.x, y: 0.2, z: _w.z }, { escala: 0.7 + E.derrape * 0.6, cantidad: 1, color: 0xb9b6b0, dirX: -Math.sin(this.rot), dirZ: -Math.cos(this.rot) });
      }
      if (this.conductor && E.derrape > 0.5 && Math.random() < 0.12) juego.audio?.reproducir?.('derrape', { x: this.pos.x, z: this.pos.z, volumen: 0.5 });
    }
    // escape / chimenea
    this.tHumoEscape -= dt;
    if (m.escapes?.length && this.tHumoEscape <= 0) {
      const ocupado = !!this.conductor;
      this.tHumoEscape = d.id === 'locomovil' ? 0.12 : (ocupado ? 0.2 - Math.min(0.1, sp * 0.004) : 0.55);
      for (const e of m.escapes) {
        const px = this.pos.x + e.x * cs + e.z * sn, pz = this.pos.z - e.x * sn + e.z * cs;
        if (d.id === 'locomovil') fx.emitir('humo', { x: px, y: this.grupo.position.y + e.y, z: pz }, { dirY: 1, escala: 1.1 + Math.abs(E.vf) * 0.04, cantidad: 1, color: 0x3b3835 });
        else if (ocupado || sp > 0.5) fx.emitir('humo', { x: px, y: e.y, z: pz }, { dirX: -sn * 0.5, dirZ: -cs * 0.5, escala: 0.35 + (E.thr > 0.2 ? 0.25 : 0), cantidad: 1, color: 0x8a8782 });
      }
    }
    if (d.id === 'locomovil' && m.vapor && this.conductor && E.thr !== 0) {
      // purga de vapor lateral cuando se arranca
      this._tVapor = (this._tVapor ?? 0) - dt;
      if (this._tVapor <= 0) { this._tVapor = 0.9 + Math.random(); for (const v of m.vapor) { const px = this.pos.x + v.x * cs + v.z * sn, pz = this.pos.z - v.x * sn + v.z * cs; fx.emitir('vapor', { x: px, y: v.y, z: pz }, { dirX: cs * Math.sign(v.x || 1), dirZ: -sn * Math.sign(v.x || 1), escala: 0.8, cantidad: 3 }); } }
    }
    if (this._llamasRestos === undefined) return;
  }

  /** Quita todo del escenario. */
  liberar() {
    this._quitarInteractivo();
    this._pararMotor();
    for (const m of this.emisores) m.detener?.();
    this.emisores.length = 0;
    this._llamasRestos?.detener?.();
    this.luzFuego?.quitar?.(); this.luzFaros?.quitar?.();
    if (this.cuerpo?.activo) this.juego.fisica.eliminarCuerpo(this.cuerpo);
    if (this.cuerpoRestos?.activo) this.juego.fisica.eliminarCuerpo(this.cuerpoRestos);
    if (this.conductor) { const j = this.conductor; this.conductor = null; if (j.vehiculo === this) j.vehiculo = null; }
    this.grupo.removeFromParent();
    this.modelo.liberar?.();
  }
}

const _w = { x: 0, z: 0 };
// dirección del rumbo para orientar la marca de rodadura (el calco la usa como ángulo)
function c2(E, rot, k) { return k === 0 ? Math.cos(rot) : -Math.sin(rot); }
