// Sistema FX de ERA Z. API en docs/ARQUITECTURA.md §FX.
//   atlas.js       atlas procedurales (partículas y calcos) calculados por píxel
//   particulas.js  motor instanciado (2 llamadas de dibujo: humo alfa iluminado + brillo aditivo HDR), simulación en shader
//   efectos.js     recetas de todos los efectos nombrados
//   calcos.js      sangre, quemaduras, ácido, cráteres, aceite, huellas (≈450, reciclado, desvanecido lento)
//   escombros.js   trozos 3D con física propia (≈300)
//   trazadoras.js  cintas: bala, pulso, riel, aguja, arco, láser
// Añadidos al contrato: fx.estado(), fx.factor (cantidad según calidad), fx.liberar(), opciones.duracion en crearEmisor,
// fx.resplandor(r,g,b), fx.calcos / fx.escombrosSistema (diagnóstico).
import * as THREE from 'three';
import { crearMotor } from './particulas.js';
import { crearCalcos } from './calcos.js';
import { crearEscombros } from './escombros.js';
import { crearTrazadoras } from './trazadoras.js';
import { crearEfectos } from './efectos.js';
import { liberarAtlas } from './atlas.js';

const FACTOR_CALIDAD = { baja: 0.5, media: 0.75, alta: 1, ultra: 1.25 };
const NOMBRES = ['fogonazo', 'humo', 'sangre', 'sangre_grande', 'chispas', 'astillas', 'polvo', 'piedra', 'explosion', 'explosion_grande', 'fuego', 'gas_toxico', 'acido', 'plasma', 'electrico', 'vapor', 'casquillo', 'curacion', 'onda', 'aparicion', 'salpicadura', 'singularidad', 'llama'];

export function crearFx(juego) {
  let motor = null, calcos = null, escombros = null, trazadoras = null, efectos = null;
  const ctx = { juego, factor: FACTOR_CALIDAD[juego.opciones?.calidad] ?? 1, destello: (...a) => destello(...a) };
  const emisores = [];
  const flashes = [];
  const luzPropia = [];     // reserva propia si el render no ofrece luzPuntual
  const offs = [];
  const amb = { amb: new THREE.Color(0.4, 0.42, 0.46), sol: new THREE.Color(0.6, 0.55, 0.5), dir: new THREE.Vector3(0.4, 0.8, 0.3), niebla: new THREE.Color(0.5, 0.55, 0.6), nieblaD: 0.012 };
  const _v = new THREE.Vector3(), _c = new THREE.Color();
  let escenaAct = null, nImpactos = 0, ultimaExp = { cuadro: -9, x: 0, z: 0 }, avisado = new Set();
  const rng = juego.rng ?? Math.random;

  function asegurar() {
    const escena = juego.render?.escena;
    if (!escena) return false;
    if (motor && escenaAct === escena) return true;
    if (motor) liberarTodo();
    escenaAct = escena;
    motor = crearMotor(juego, escena);
    calcos = crearCalcos(juego, escena, motor.uniformes);
    escombros = crearEscombros(juego, escena);
    trazadoras = crearTrazadoras(juego, escena);
    Object.assign(ctx, { motor, calcos, escombros, trazadoras });
    efectos = crearEfectos(ctx);
    escombros.alAterrizar = (mat, x, z, tam) => {
      if (mat === 'carne') calcos.calco('sangre', x, z, 0.45 + tam * 1.6, undefined);
      else if (mat === 'piedra' || mat === 'metal') efectos.polvo({ x, y: 0.1, z }, { escala: 0.3, cantidad: 1 });
    };
    if (!juego.render?.luzPuntual) for (let i = 0; i < 3; i++) { const l = new THREE.PointLight(0xffffff, 0, 8, 2); l.visible = true; escena.add(l); luzPropia.push({ luz: l, libre: true }); }
    return true;
  }

  function liberarTodo() {
    for (const f of flashes) f.luz?.quitar?.();
    flashes.length = 0;
    for (const l of luzPropia) l.luz.removeFromParent();
    luzPropia.length = 0;
    motor?.liberar(); calcos?.liberar(); escombros?.liberar(); trazadoras?.liberar();
    motor = calcos = escombros = trazadoras = efectos = null;
  }

  const seguro = (nombre, fn) => { try { return fn(); } catch (e) { if (!avisado.has(nombre)) { avisado.add(nombre); console.error('[fx] error en ' + nombre, e); } } };

  // ───────────────────────────── API pública ─────────────────────────────
  function emitir(nombre, pos, opciones) {
    if (!pos || !asegurar()) return;
    const op = opciones ?? {};
    const f = efectos.tabla[nombre];
    if (!f) { if (!avisado.has('n:' + nombre)) { avisado.add('n:' + nombre); console.warn('[fx] efecto desconocido:', nombre); } return; }
    // las explosiones que ya dispararon el evento no se duplican (las lanzan a la vez combate y las entidades)
    if (nombre === 'explosion' || nombre === 'explosion_grande') {
      if (!op._evento && ultimaExp.cuadro >= juego.tiempo.cuadro - 1 && Math.hypot(pos.x - ultimaExp.x, pos.z - ultimaExp.z) < 2.5) return;
    }
    seguro(nombre, () => f(pos, op));
  }

  function crearEmisor(nombre, pos, opciones) {
    const op = opciones ?? {};
    const e = { pos, activo: true, escala: op.escala ?? 1, nombre, op, acum: { a: 0, b: 0, c: 0, d: 0, t: 0 }, resto: op.duracion ?? Infinity, luz: null, detener() { this.activo = false; } };
    if (op.luz) e.luz = juego.render?.luzPuntual?.({ x: pos.x, y: (pos.y ?? 0) + 1, z: pos.z, color: op.colorLuz ?? 0xff8a30, intensidad: 4, distancia: 8 }) ?? null;
    emisores.push(e);
    return e;
  }

  function trazadora(desde, hasta, opciones) {
    if (!desde || !hasta || !asegurar()) return;
    seguro('trazadora', () => trazadoras.crear(desde, hasta, opciones ?? {}));
  }

  function calco(tipo, x, z, tam, opciones) {
    if (!asegurar()) return;
    seguro('calco', () => calcos.calco(tipo, x, z, tam ?? 1.5, opciones));
  }

  function escombrosFn(o) {
    if (!o || !asegurar()) return;
    seguro('escombros', () => escombros.lanzar({ ...o, cantidad: Math.max(1, Math.round((o.cantidad ?? 8) * Math.max(0.5, ctx.factor))) }));
  }

  /** Luz breve. Usa render.luzPuntual (reserva compartida) o, si no existe, una reserva propia. */
  function destello(pos, color, intensidad = 3, duracion = 0.1, radio = 6) {
    if (!pos || !asegurar()) return;
    const dur = Math.max(0.03, duracion);
    if (flashes.length >= 6) {
      // hace sitio al más débil si el nuevo es más fuerte
      let mi = 0; for (let i = 1; i < flashes.length; i++) if (flashes[i].int * (1 - flashes[i].t / flashes[i].dur) < flashes[mi].int * (1 - flashes[mi].t / flashes[mi].dur)) mi = i;
      if (flashes[mi].int * (1 - flashes[mi].t / flashes[mi].dur) >= intensidad) return;
      liberarFlash(flashes[mi]); flashes.splice(mi, 1);
    }
    const c = _c.set(color ?? 0xffc27a);
    let luz = null, prop = null;
    if (juego.render?.luzPuntual) luz = juego.render.luzPuntual({ x: pos.x, y: pos.y ?? 1, z: pos.z, color: c.clone(), intensidad, distancia: radio });
    else { prop = luzPropia.find((l) => l.libre); if (!prop) return; prop.libre = false; prop.luz.position.set(pos.x, pos.y ?? 1, pos.z); prop.luz.color.copy(c); prop.luz.distance = radio; }
    flashes.push({ luz, prop, t: 0, dur, int: intensidad });
  }
  function liberarFlash(f) { f.luz?.quitar?.(); if (f.prop) { f.prop.luz.intensity = 0; f.prop.libre = true; } }

  function limpiar() {
    motor?.limpiar(); calcos?.limpiar(); escombros?.limpiar(); trazadoras?.limpiar();
    for (const f of flashes) liberarFlash(f);
    flashes.length = 0;
    for (const e of emisores) { e.activo = false; e.luz?.quitar?.(); }
    emisores.length = 0;
  }

  // ───────────────────────────── ambiente ─────────────────────────────
  function leerAmbiente() {
    const r = juego.render;
    const atm = r?.ambienteActual?.atm;
    if (atm?.hemiC) {
      amb.amb.copy(atm.hemiC).multiplyScalar(0.3 + 0.55 * (atm.hemiI ?? 0.6));
      if (atm.niebla) amb.amb.lerp(atm.niebla, 0.18);
    }
    const sol = r?.sol;
    if (sol) {
      amb.sol.copy(sol.color).multiplyScalar(Math.min(1.1, (sol.intensity ?? 3) * 0.13));
      if (sol.target) { _v.copy(sol.position).sub(sol.target.position); if (_v.lengthSq() > 1e-6) amb.dir.copy(_v).normalize(); }
    }
    const fog = r?.escena?.fog;
    if (fog) { amb.niebla.copy(fog.color); amb.nieblaD = fog.density ?? 0.012; }
  }

  // ───────────────────────────── bucle ─────────────────────────────
  function actualizar(dt) {
    if (!asegurar()) return;
    nImpactos = 0;
    leerAmbiente();
    motor.actualizar(dt, amb);
    calcos.actualizar(dt);
    escombros.actualizar(dt);
    trazadoras.actualizar(dt);
    // emisores continuos
    if (dt > 0) for (let i = emisores.length - 1; i >= 0; i--) {
      const e = emisores[i];
      if (e.activo) { e.resto -= dt; if (e.resto <= 0) e.activo = false; }
      if (!e.activo) { e.luz?.quitar?.(); emisores.splice(i, 1); continue; }
      seguro('emisor:' + e.nombre, () => pasoEmisor(e, dt));
    }
    // luces
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i]; f.t += dt;
      const k = Math.max(0, 1 - f.t / f.dur), inten = f.int * k * k;
      if (f.luz) f.luz.intensidad = inten;
      if (f.prop) f.prop.luz.intensity = inten * 4;
      if (f.t >= f.dur) { liberarFlash(f); flashes.splice(i, 1); }
    }
  }

  const TASAS = { gas_toxico: 3.2, vapor: 8, humo: 10, acido: 9, curacion: 6, plasma: 4, electrico: 5, singularidad: 2.5, polvo: 6, chispas: 5 };
  function pasoEmisor(e, dt) {
    const p = e.pos, op = e.op, esc = e.escala;
    if (e.nombre === 'fuego') {
      efectos.fuegoCont(p, esc, Math.min(dt, 0.1), e.acum);
      if (e.luz) { e.luz.pos?.set?.(p.x, (p.y ?? 0) + 1 + esc * 0.4, p.z); e.luz.intensidad = (3 + 2 * esc) * (0.75 + 0.25 * Math.sin(juego.tiempo.real * 23 + p.x) + 0.1 * Math.sin(juego.tiempo.real * 57)); e.luz.distancia = 6 + 3 * esc; }
      return;
    }
    const tasa = (TASAS[e.nombre] ?? 6) * Math.pow(esc, e.nombre === 'gas_toxico' ? 1.0 : 0.8) * ctx.factor;
    e.acum.a += Math.min(dt, 0.1) * tasa;
    let n = 0;
    const f = efectos.tabla[e.nombre];
    if (!f) return;
    while (e.acum.a >= 1 && n < 6) { e.acum.a -= 1; n++; f(p, { ...op, escala: esc, cantidad: 1 }); }
    if (e.acum.a > 4) e.acum.a = 0;
  }

  // ───────────────────────────── reacciones a eventos ─────────────────────────────
  const offsEv = [];
  const en = (n, fn) => offsEv.push(juego.eventos.en(n, (d) => { if (asegurar()) seguro('evento:' + n, () => fn(d)); }));

  en('impacto', (d) => {
    if (++nImpactos > 14 && rng() < 0.6) return;
    const p = { x: d.x, y: d.y ?? 1, z: d.z };
    const dmg = d.cantidad ?? 20, crit = !!d.critico;
    const dx = d.dirX ?? -(d.nx ?? 0), dz = d.dirZ ?? -(d.nz ?? 0);
    const sat = nImpactos > 6 ? 0.55 : 1;
    switch (d.material) {
      case 'carne': {
        if (d.tipo === 'fuego') { efectos.tabla.fuego({ x: p.x, y: p.y - 0.2, z: p.z }, { escala: 0.35, cantidad: 2 }); break; }
        if (d.tipo === 'veneno' || d.tipo === 'acido') { efectos.tabla.acido({ x: p.x, y: p.y, z: p.z }, { escala: 0.5, cantidad: 3 }); break; }
        if (d.tipo === 'energia') { efectos.plasma(p, { escala: 0.6 }); }
        const n = Math.round(Math.min(16, 4 + dmg / 14) * (crit ? 1.8 : 1) * sat);
        if (crit || dmg > 160) efectos.sangreGrande(p, { dirX: dx, dirZ: dz, cantidad: Math.round(n * 1.4), escala: 0.7, calco: nImpactos < 8 });
        else efectos.sangre(p, { dirX: dx, dirZ: dz, cantidad: n, escala: 1, calco: nImpactos < 10 && rng() < 0.7 });
        break;
      }
      case 'metal':
        efectos.chispas(p, { dirX: d.nx, dirZ: d.nz, cantidad: Math.round(9 * sat), escala: d.tipo === 'explosivo' ? 1.4 : 1 });
        if (rng() < 0.3 * sat) efectos.polvo(p, { escala: 0.3, cantidad: 1, color: 0x6a665e });
        break;
      case 'madera':
        efectos.astillas(p, { dirX: d.nx, dirZ: d.nz, cantidad: Math.round(7 * sat) });
        if (rng() < 0.45) escombros.lanzar({ x: p.x, y: p.y, z: p.z, cantidad: 1 + (rng() < 0.4 ? 1 : 0), material: 'madera', fuerza: 3.2, dirX: d.nx, dirZ: d.nz });
        break;
      case 'piedra':
        efectos.piedra(p, { dirX: d.nx, dirZ: d.nz, cantidad: Math.round(4 * sat) });
        if (rng() < 0.3) escombros.lanzar({ x: p.x, y: p.y, z: p.z, cantidad: 1, material: 'piedra', fuerza: 3, dirX: d.nx, dirZ: d.nz });
        break;
      case 'energia':
        efectos.plasma(p, { escala: 0.8, color: d.color });
        destello(p, d.color ?? 0x66e8ff, 2.5, 0.09, 5);
        break;
      case 'suelo':
        if (d.tipo === 'explosivo' || d.tipo === 'fuego') break;
        efectos.polvo({ x: p.x, y: 0.12, z: p.z }, { escala: 0.55, cantidad: Math.round(3 * sat) });
        break;
      default:
        efectos.polvo(p, { escala: 0.5, cantidad: 2 });
    }
  });

  en('explosion', (d) => {
    const radio = d.radio ?? 4, e = Math.min(4, Math.max(0.5, radio / 4.5));
    ultimaExp = { cuadro: juego.tiempo.cuadro, x: d.x, z: d.z };
    const tipo = d.tipo ?? 'explosivo';
    const grande = radio >= 7;
    efectos.explosion({ x: d.x, y: d.y ?? 0.6, z: d.z }, { escala: e, tipo: tipo === 'explosivo' || tipo === 'fuego' || tipo === 'energia' || tipo === 'veneno' || tipo === 'acido' ? tipo : 'explosivo', _evento: true }, grande);
    // cámara: más fuerte cuanto más cerca de los jugadores
    let cerca = 1e9;
    for (const j of juego.jugadores ?? []) if (j?.pos) cerca = Math.min(cerca, Math.hypot(j.pos.x - d.x, j.pos.z - d.z));
    if (cerca === 1e9) cerca = 10;
    const atenua = Math.max(0, 1 - cerca / (26 + radio * 2));
    if (atenua > 0.05) juego.render?.sacudir?.(Math.min(1, (0.18 + radio * 0.06) * atenua * 1.4), 0.3 + radio * 0.06);
  });

  en('zombi:muerte', (d) => {
    const z = d.zombi; if (!z?.pos) return;
    const info = d.info ?? {};
    if (info.tipo === 'fuego') { efectos.tabla.fuego({ x: z.pos.x, y: 0.1, z: z.pos.z }, { escala: 0.5, cantidad: 3 }); return; }
    const e = Math.min(2, Math.max(0.8, (z.radio ?? 0.45) / 0.45));
    const p = { x: z.pos.x, y: 0.9, z: z.pos.z };
    const dx = info.dirX ?? 0, dz = info.dirZ ?? 0;
    if (info.tipo === 'veneno' || info.tipo === 'acido') { efectos.tabla.acido(p, { escala: e, cantidad: 6 }); calcos.calco('acido', p.x, p.z, 1.6 * e); return; }
    if (info.tipo === 'explosivo') { efectos.sangreGrande(p, { dirX: dx, dirZ: dz, escala: e * 1.2, cantidad: 34, trozos: 6 }); return; }
    efectos.sangre(p, { dirX: dx, dirZ: dz, cantidad: Math.round(14 * (Math.min(1, ctx.factor) + 0.2)), escala: 1.15 * e, calco: false });
    calcos.calco('sangre', p.x, p.z, rr(2.5, 3.3) * e, { charco: false });
    calcos.programar(0.25, 'sangre', p.x + rr(-0.7, 0.7), p.z + rr(-0.7, 0.7), rr(1.8, 2.5) * e);
    calcos.calco('sangre', p.x + dx * 1.1, p.z + dz * 1.1, rr(1.6, 2.4) * e, (dx || dz) ? { dirX: dx, dirZ: dz } : undefined);
  });
  function rr(a, b) { return a + (b - a) * rng(); }

  en('jefe:muerte', (d) => {
    const z = d.jefe; if (!z?.pos) return;
    const e = Math.max(1.6, (z.radio ?? 1) / 0.6);
    for (let i = 0; i < 3; i++) {
      const a = rng() * 6.28, r = i === 0 ? 0 : rr(0.6, 1.8) * e;
      efectos.sangreGrande({ x: z.pos.x + Math.cos(a) * r, y: 1 + i * 0.5, z: z.pos.z + Math.sin(a) * r }, { escala: e, cantidad: 40, trozos: i === 0 ? 8 : 0 });
    }
    juego.render?.sacudir?.(0.6, 0.7);
  });

  for (const ev of ['jugador:muerte', 'jugador:caido']) en(ev, (d) => {
    const j = d.jugador; if (!j?.pos) return;
    efectos.sangre({ x: j.pos.x, y: 0.9, z: j.pos.z }, { cantidad: 14, escala: 1.1 });
    calcos.calco('sangre', j.pos.x, j.pos.z, 2.0, { charco: false });
  });

  en('zombi:aparece', (d) => {
    const z = d.zombi; if (!z?.pos) return;
    efectos.tabla.aparicion({ x: z.pos.x, y: 0.1, z: z.pos.z }, { escala: 0.55, cantidad: 2, color: 0x8fb89a });
  });

  en('estructura:destruida', (d) => {
    const s = d.estructura; if (!s?.pos) return;
    const p = { x: s.pos.x, y: 0.7, z: s.pos.z }, mat = s.material ?? 'madera', r = s.radio ?? 0.8;
    if (mat === 'madera') { efectos.astillas(p, { cantidad: 12, escala: 1.4 }); escombros.lanzar({ x: p.x, y: 0.6, z: p.z, cantidad: 8, material: 'madera', fuerza: 5 }); efectos.polvo(p, { escala: 1.3, cantidad: 6 }); }
    else if (mat === 'piedra') { efectos.piedra(p, { cantidad: 10, escala: 1.5 }); escombros.lanzar({ x: p.x, y: 0.6, z: p.z, cantidad: 10, material: 'piedra', fuerza: 5.5 }); efectos.polvo(p, { escala: 2, cantidad: 8 }); }
    else if (mat === 'metal') { efectos.chispas(p, { cantidad: 14, escala: 1.4 }); escombros.lanzar({ x: p.x, y: 0.6, z: p.z, cantidad: 7, material: 'metal', fuerza: 5.5 }); efectos.polvo(p, { escala: 1, cantidad: 3, color: 0x6a665e }); }
    else efectos.polvo(p, { escala: 1.2 * Math.max(1, r), cantidad: 6 });
  });

  en('vehiculo:destruido', (d) => {
    const v = d.vehiculo; if (!v?.pos) return;
    escombros.lanzar({ x: v.pos.x, y: 0.8, z: v.pos.z, cantidad: 14, material: 'metal', fuerza: 8 });
    calcos.calco('quemadura', v.pos.x, v.pos.z, 5.5);
    crearEmisor('fuego', { x: v.pos.x, y: 0.1, z: v.pos.z }, { escala: 1.0, duracion: 14 });
    crearEmisor('humo', { x: v.pos.x, y: 1.0, z: v.pos.z }, { escala: 1.4, duracion: 20 });
  });

  juego.eventos.en('partida:inicio', () => limpiar());

  return {
    emitir, crearEmisor, trazadora, calco, escombros: escombrosFn, destello, limpiar, actualizar,
    iniciar() { asegurar(); },
    resplandor(r, g, b) { motor?.resplandor(r, g, b); },
    liberar() { for (const o of offsEv) o?.(); liberarTodo(); liberarAtlas(); },
    get factor() { return ctx.factor; },
    set factor(v) { ctx.factor = v; },
    nombres: NOMBRES,
    get motor() { return motor; }, get calcosSistema() { return calcos; },
    /** Diagnóstico: cuántas partículas/calcos/trozos/trazadoras hay vivos. */
    estado() { return asegurar() ? { particulas: motor.vivas(), calcos: calcos.cuenta(), escombros: escombros.cuenta(), trazadoras: trazadoras.cuenta(), emisores: emisores.length, luces: flashes.length } : null; },
  };
}
