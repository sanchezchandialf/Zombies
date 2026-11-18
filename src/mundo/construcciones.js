// Construcciones del Ingeniero: torreta de la era y barricada de la era.
//   mundo.desplegarTorreta(jugador) / desplegarBarricada(jugador) → estructura | null   (también mundo.crear('torreta'|'barricada', {...}))
// Ambas son Dañables (bando 'jugadores'), reparables (el jugador mantiene E), están en mundo.estructuras y emiten
// estructura:creada / estructura:destruida. Respetan mods: torretas, torretaVida, torretaDanio, barricadaVida.
import * as THREE from 'three';
import { CAPA } from '../nucleo/fisica.js';
import { girarHacia, difAngulo } from '../nucleo/util.js';
import { ARMAS } from '../datos/armas.js';
import { ROLES } from '../datos/roles.js';
import { crearModeloTorreta } from '../armas/modelos.js';
import { registrarTipo } from './registro.js';
import { crearDaniable, crearCuerpoProp, modeloCacheado, emitir, sonar } from './util.js';
import { barricadaEra } from './modelos.js';

const ARMAS_TORRETA = [
  { base: 'pistolas_duelo', over: { id: 'torreta_0', danio: 46, cadencia: 3.4, auto: true, dispersion: 3 } },
  { base: 'revolveres_gemelos', over: { id: 'torreta_1', danio: 30, cadencia: 8, auto: true } },
  { base: 'carabina_m', over: { id: 'torreta_2', danio: 34, cadencia: 9, auto: true, dispersion: 3 } },
  { base: 'subfusil_compacto', over: { id: 'torreta_3', danio: 36, cadencia: 11, auto: true } },
  { base: 'pdw', over: { id: 'torreta_4', danio: 42, cadencia: 12, auto: true } },
  { base: 'rifle_pulsos', over: { id: 'torreta_5', danio: 58, cadencia: 9, auto: true, perforacion: 2 } },
];
const ALCANCE = 24;

export function instalarConstrucciones(juego, mundo) {
  registrarTipo('torreta', (j, o) => crearTorreta(j, mundo, o));
  registrarTipo('barricada', (j, o) => crearBarricada(j, mundo, o));

  /** Primer sitio libre por delante del jugador: [distancia, desvío lateral]. */
  function buscarSitio(jugador, radio, distancias, ancho = 0) {
    const f = juego.fisica, rot = jugador.rot ?? 0;
    const fx = Math.sin(rot), fz = Math.cos(rot), lx = Math.cos(rot), lz = -Math.sin(rot);
    const mascara = CAPA.ESTATICO | CAPA.ESTRUCTURA | CAPA.VEHICULO | CAPA.PROP;
    for (const d of distancias) for (const lat of [0, 0.9, -0.9, 1.8, -1.8]) {
      const x = jugador.pos.x + fx * d + lx * lat, z = jugador.pos.z + fz * d + lz * lat;
      let ok = true;
      for (const k of ancho ? [-ancho, 0, ancho] : [0]) { if (!f.libre(x + lx * k, z + lz * k, radio, mascara)) { ok = false; break; } }
      const lim = f.limites; if (lim && (x < lim.minX + 1 || x > lim.maxX - 1 || z < lim.minZ + 1 || z > lim.maxZ - 1)) ok = false;
      if (ok) return { x, z, rot };
    }
    return null;
  }

  return {
    desplegarTorreta(jugador) {
      const maxT = Math.max(1, Math.round(jugador.mods?.torretas ?? 1));
      const sitio = buscarSitio(jugador, 0.65, [1.9, 1.4, 2.6]);
      if (!sitio) return null;
      const propias = mundo.objetos.filter((o) => o.tipo === 'torreta' && o.duenio === jugador && o.vivo && !o.caducando);
      while (propias.length >= maxT) propias.shift().caducar();
      return mundo.crear('torreta', { ...sitio, jugador, eraIdx: juego.estado?.eraIdx ?? 0 });
    },
    desplegarBarricada(jugador) {
      const sitio = buscarSitio(jugador, 0.5, [2.3, 1.8, 3.0], 1.1);
      if (!sitio) return null;
      return mundo.crear('barricada', { ...sitio, jugador, eraIdx: juego.estado?.eraIdx ?? 0 });
    },
    limpiar() {}, actualizar() {}, posFisica() {},
  };
}

// ───────────────────────────── Torreta ─────────────────────────────
function crearTorreta(juego, mundo, o) {
  const era = Math.max(0, Math.min(5, o.eraIdx ?? 0));
  const dueno = o.jugador ?? null;
  const x = o.x ?? 0, z = o.z ?? 0, rotBase = o.rot ?? 0;
  const modelo = crearModeloTorreta(era);
  const ud = modelo.userData;
  modelo.position.set(x, 0, z);
  juego.render?.escena?.add(modelo);
  const duracion = ROLES.ingeniero?.habilidad?.duracion ?? 40;
  const vidaMax = (200 + 45 * era) * (dueno?.mods?.torretaVida ?? 1);
  const obj = {
    tipo: 'torreta', grupo: modelo, duenio: dueno, etiqueta: 'Torreta', restante: duracion, duracion, caducando: false, nacer: 0, morir: -1,
    rotCabeza: rotBase, objetivo: null, tBusca: 0, recul: 0, idle: Math.random() * 6, calor: 0,
    mods: { danio: 1, cadencia: 1, municionInfinita: true, explosivos: 1 },
    _origen: new THREE.Vector3(),
  };
  crearDaniable(obj, {
    juego, x, z, radio: (ud.radio ?? 0.5) * 0.9, vida: vidaMax, material: 'metal', bando: 'jugadores', resistencias: { veneno: 0 },
    alDanio() { emitir(juego, 'chispas', this.pos.x, 0.9, this.pos.z, { escala: 0.5, cantidad: 3 }); },
    alMorir() { destruirConEfecto(); },
  });
  obj.cuerpo = crearCuerpoProp(juego, { x, z, radio: (ud.radio ?? 0.5) * 0.85, masa: 0, capa: CAPA.ESTRUCTURA, datos: obj, bloqueaBalas: false });
  const c = juego.combate;
  const def = { ...(ARMAS[ARMAS_TORRETA[era].base] ?? {}), ...ARMAS_TORRETA[era].over, cargador: 99999, reserva: -1, municionInfinita: true };
  obj.arma = c?.crearArma ? c.crearArma(ARMAS_TORRETA[era].base, obj) : null;
  if (obj.arma) { obj.arma.def = def; obj.arma.municion = 99999; obj.arma.cargador = 99999; obj.arma.reserva = -1; }
  mundo.registrarEstructura(obj);
  emitir(juego, 'polvo', x, 0.2, z, { escala: 0.9 });
  sonar(juego, 'despliegue', x, z);

  function destruirConEfecto() {
    emitir(juego, 'explosion', obj.pos.x, 0.6, obj.pos.z, { escala: 0.7 });
    try { juego.fx?.escombros?.({ x: obj.pos.x, y: 0.6, z: obj.pos.z, cantidad: 10, material: 'metal', fuerza: 5 }); } catch (e) { /* */ }
    mundo.quitar(obj);
  }
  obj.caducar = function () { if (obj.caducando) return; obj.caducando = true; obj.morir = 0; };

  function elegirObjetivo() {
    let mejor = null, md = ALCANCE * ALCANCE;
    const px = obj.pos.x, pz = obj.pos.z;
    for (const zb of juego.zombis) {
      if (!zb.vivo) continue;
      const d = (zb.pos.x - px) ** 2 + (zb.pos.z - pz) ** 2;
      if (d >= md) continue;
      if (!juego.fisica.lineaLibre(px, pz, zb.pos.x, zb.pos.z)) continue;
      md = d; mejor = zb;
    }
    return mejor;
  }

  obj.actualizar = function actualizar(dt) {
    if (!obj.vivo && obj.morir < 0) return;
    obj.nacer = Math.min(1, obj.nacer + dt / 0.6);
    // despliegue elástico / repliegue
    let k = 1 - Math.pow(1 - obj.nacer, 3);
    if (obj.nacer < 1) k *= 1 + Math.sin(obj.nacer * Math.PI) * 0.12;
    if (obj.morir >= 0) {
      obj.morir += dt / 0.5; k *= Math.max(0, 1 - obj.morir);
      if (obj.morir >= 1) { emitir(juego, 'humo', obj.pos.x, 0.5, obj.pos.z, { escala: 0.8 }); mundo.quitar(obj); return; }
    } else {
      obj.restante -= dt;
      if (obj.restante <= 0) obj.caducar();
    }
    modelo.scale.setScalar(Math.max(0.01, k));
    if (obj.nacer < 0.7 || obj.morir >= 0) { if (c && obj.arma) c.actualizarArma?.(obj.arma, dt, obj); return; }
    const m = dueno?.mods ?? {};
    obj.mods.danio = m.torretaDanio ?? 1;
    obj.mods.explosivos = m.explosivos ?? 1;
    if (c && obj.arma) c.actualizarArma?.(obj.arma, dt, obj);
    // adquisición cada 0.2 s con línea de visión; mantiene el blanco mientras sea válido
    obj.tBusca -= dt;
    const t = obj.objetivo;
    if (t && (!t.vivo || !juego.fisica.lineaLibre(obj.pos.x, obj.pos.z, t.pos.x, t.pos.z) || Math.hypot(t.pos.x - obj.pos.x, t.pos.z - obj.pos.z) > ALCANCE + 2)) { obj.objetivo = null; obj.tBusca = 0; }
    if (!obj.objetivo && obj.tBusca <= 0) { obj.objetivo = elegirObjetivo(); obj.tBusca = 0.2; }
    let deseado;
    if (obj.objetivo) deseado = Math.atan2(obj.objetivo.pos.x - obj.pos.x, obj.objetivo.pos.z - obj.pos.z);
    else { obj.idle += dt * 0.7; deseado = rotBase + Math.sin(obj.idle) * 0.9; }
    obj.rotCabeza = girarHacia(obj.rotCabeza, deseado, (obj.objetivo ? 7 : 1.6) * dt);
    ud.cabeza.rotation.y = obj.rotCabeza;
    if (obj.objetivo && c?.gatillo && obj.arma && Math.abs(difAngulo(obj.rotCabeza, deseado)) < 0.14) {
      modelo.updateMatrixWorld(true);
      if (ud.boca) { obj._origen.copy(ud.boca); ud.cabeza.localToWorld(obj._origen); } else obj._origen.set(obj.pos.x, 1, obj.pos.z);
      if (c.gatillo(obj, obj.arma, obj._origen, obj.rotCabeza, true, true)) obj.recul = 1;
    }
    if (ud.canones) ud.canones.position.z = -0.06 * obj.recul;
    obj.recul = Math.max(0, obj.recul - dt * 10);
    // aviso de caducidad: parpadeo en los últimos 4 s
    modelo.visible = !(obj.restante < 4 && Math.sin(obj.restante * 14) < -0.6);
  };

  obj.destruir = function destruir() {
    if (obj.cuerpo) juego.fisica.eliminarCuerpo(obj.cuerpo); obj.cuerpo = null;
    modelo.parent?.remove(modelo);
  };
  return obj;
}

// ───────────────────────────── Barricada ─────────────────────────────
function crearBarricada(juego, mundo, o) {
  const era = Math.max(0, Math.min(5, o.eraIdx ?? 0));
  const dueno = o.jugador ?? null;
  const x = o.x ?? 0, z = o.z ?? 0, rot = o.rot ?? 0;
  const modelo = modeloCacheado('barr:' + era, () => barricadaEra(era));
  const raiz = new THREE.Group(); raiz.add(modelo); raiz.position.set(x, 0, z); raiz.rotation.y = rot;
  juego.render?.escena?.add(raiz);
  const segs = modelo.children.filter((c) => c.name.startsWith('seg'));
  const panel = modelo.children.find((c) => c.name === 'panelEnergia');
  const ancho = 3.0, fondo = era === 3 ? 0.7 : era === 4 ? 0.55 : 0.5;
  const orden = segs.map((_, i) => i).sort((a, b) => ((a * 7 + 3) % 5) - ((b * 7 + 3) % 5));
  const vidaMax = (260 + 70 * era) * (dueno?.mods?.barricadaVida ?? 1);
  const obj = { tipo: 'barricada', grupo: raiz, duenio: dueno, etiqueta: 'Barricada', nacer: 0, estado: -1, tAviso: 0 };
  crearDaniable(obj, {
    juego, x, z, radio: 1.3, vida: vidaMax, material: era === 5 ? 'energia' : era <= 1 ? 'madera' : era === 2 ? 'carne' : 'piedra', bando: 'jugadores',
    resistencias: { veneno: 0 },
    alDanio(info) {
      this.tAviso = 0.25;
      emitir(juego, era === 5 ? 'electrico' : era <= 1 ? 'astillas' : 'polvo', info.x ?? this.pos.x, 0.6, info.z ?? this.pos.z, { escala: 0.55, cantidad: 3 });
      aplicarDegradacion();
    },
    alReparar() { aplicarDegradacion(); },
    alMorir() {
      try { juego.fx?.escombros?.({ x: this.pos.x, y: 0.5, z: this.pos.z, cantidad: 14, material: era <= 1 ? 'madera' : era === 5 ? 'metal' : 'piedra', fuerza: 5 }); } catch (e) { /* */ }
      emitir(juego, 'polvo', this.pos.x, 0.4, this.pos.z, { escala: 1.2 });
      mundo.quitar(this);
    },
  });
  obj.cuerpo = crearCuerpoProp(juego, { x, z, hx: ancho / 2, hz: fondo / 2, rot, masa: 0, capa: CAPA.ESTRUCTURA, datos: obj, bloqueaBalas: true });
  mundo.registrarEstructura(obj);
  emitir(juego, 'polvo', x, 0.2, z, { escala: 1 });

  function aplicarDegradacion() {
    const frac = obj.vida / obj.vidaMax;
    const ocultar = Math.floor((1 - frac) * segs.length * 0.85);
    segs.forEach((s) => { s.visible = true; s.rotation.z = 0; s.position.y = 0; });
    for (let i = 0; i < segs.length; i++) {
      const s = segs[orden[i]];
      if (i < ocultar) s.visible = false;
      else if (frac < 0.7) { s.rotation.z = (((orden[i] % 2) ? 1 : -1) * (0.7 - frac) * 0.25); s.position.y = -(0.7 - frac) * 0.12; }
    }
    if (panel) panel.scale.y = Math.max(0.15, frac);
  }
  obj.vidaMax = vidaMax; obj.vida = vidaMax;

  obj.actualizar = function (dt) {
    if (obj.nacer < 1) {
      obj.nacer = Math.min(1, obj.nacer + dt / 0.3);
      raiz.scale.set(1, Math.max(0.02, 1 - Math.pow(1 - obj.nacer, 3)), 1);
    }
    if (obj.tAviso > 0) { obj.tAviso -= dt; const t = juego.tiempo?.real ?? 0; modelo.position.x = Math.sin(t * 90) * 0.012 * (obj.tAviso / 0.25); } else modelo.position.x = 0;
    if (panel) panel.material.opacity = 0.26 + 0.12 * Math.sin((juego.tiempo?.real ?? 0) * 5) * (obj.vida / obj.vidaMax);
  };
  obj.destruir = function () { if (obj.cuerpo) juego.fisica.eliminarCuerpo(obj.cuerpo); obj.cuerpo = null; raiz.parent?.remove(raiz); };
  return obj;
}
