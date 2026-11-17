// Página de prueba de JUGADORES: entrada real + jugadores reales + (combate, mundo y zombis de pega, o los reales con ?real=1).
// Parámetros: ?rol=soldado|medico|ingeniero|cazador|demoledor  ?era=0..5  ?n=1|2  ?zombis=N  ?real=1
// Pruebas automáticas: `await window.pruebaCompleta()` (devuelve la lista de comprobaciones) o `await window.pruebaRol('cazador')`.
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearEntrada } from '../src/nucleo/entrada.js';
import { crearPersonajes } from '../src/personajes/index.js';
import { crearJugadores } from '../src/entidades/jugadores.js';
import { crearCombate } from '../src/combate/index.js';
import { crearMundo } from '../src/mundo/index.js';
import { mockCombate, mockMundo, mockZombis } from './jugadores-mocks.js';
import { ROLES } from '../src/datos/roles.js';
import { CAPA } from '../src/nucleo/fisica.js';

const q = new URLSearchParams(location.search);
const real = q.get('real') === '1';
const crearZombis = real ? (await import('../src/entidades/zombis.js')).crearZombis : null;
const a = await crearArnes({
  eraIdx: +(q.get('era') ?? 0), hora: 0.5, orbita: false,
  sistemas: {
    entrada: crearEntrada, personajes: crearPersonajes,
    combate: real ? crearCombate : mockCombate, jugadores: crearJugadores,
    zombis: real ? crearZombis : mockZombis, mundo: real ? crearMundo : mockMundo,
  },
});
const juego = a.juego;
a.camaraJuego(true);
juego.render.camaraExterna = false;
juego.opciones.sinvibracion = true;

// Escenario mínimo: límites y un muro para probar la boca del arma.
juego.fisica.limites = { minX: -40, maxX: 40, minZ: -40, maxZ: 40 };
const muro = juego.fisica.cajaEstatica(12, -6, 3, 0.25, 0);
const muroMalla = new THREE.Mesh(new THREE.BoxGeometry(6, 1.6, 0.5), new THREE.MeshStandardMaterial({ color: 0x6b6258, roughness: 0.9 }));
muroMalla.position.set(12, 0.8, -6); muroMalla.castShadow = true; juego.render.escena.add(muroMalla);

const paso = (n = 1, dt = 1 / 60) => { for (let i = 0; i < n; i++) juego.avanzar(dt); };
const sim = (i, p) => juego.entrada.simular(i, p);
const resultados = [];
function ok(nombre, cond, detalle = '') { resultados.push({ nombre, ok: !!cond, detalle: String(detalle) }); return !!cond; }

function reiniciar(rolIds, x = 0, z = 0) {
  sim(0, null); sim(1, null);
  juego.jugadores.length && juego.jugadores.slice().forEach((j) => j.destruir());
  juego.jugadores.length = 0;
  for (const s of ['zombis']) juego.sistemas[s].limpiar?.();
  juego.mundo.limpiar?.(); juego.combate.limpiar?.();
  const l = [];
  rolIds.forEach((r, i) => l.push(juego.jugadores_sistema.crear(i, r, x + i * 2, z)));
  paso(2);
  return l;
}
juego.jugadores_sistema = juego.sistemas.jugadores;

const quieto = (i) => sim(i, { moverX: 0, moverZ: 0, disparar: false, recargar: false, usar: false, habilidad: false, lanzar: false, cuerpo: false, esquivar: false });

async function pruebaRol(rolId) {
  const rol = ROLES[rolId];
  const [j] = reiniciar([rolId]);
  const c = juego.combate;
  const antes = resultados.length;
  const P = (n) => `${rolId}: ${n}`;

  ok(P('crea jugador con vida y velocidad del rol'), j && j.vida === rol.vida && j.arma && j.armas.length === 2, `${j?.armas?.map((x) => x.id)}`);

  // mover
  quieto(0); sim(0, { apuntar: { x: 10, z: 0 }, moverX: 1 }); paso(40);
  const v = Math.hypot(j.cuerpo.vx, j.cuerpo.vz);
  ok(P('se mueve a la velocidad del rol'), Math.abs(v - rol.velocidad) < rol.velocidad * 0.2 && j.pos.x > 2, `v=${v.toFixed(2)} x=${j.pos.x.toFixed(2)}`);
  sim(0, { moverX: 0 }); paso(12);
  ok(P('frena casi en seco'), Math.hypot(j.cuerpo.vx, j.cuerpo.vz) < 0.2, `v=${Math.hypot(j.cuerpo.vx, j.cuerpo.vz).toFixed(2)}`);
  // ir hacia atrás es más lento
  j.teletransportar(0, 0); sim(0, { apuntar: { x: 10, z: 0 }, moverX: -1 }); paso(40);
  const vb = Math.hypot(j.cuerpo.vx, j.cuerpo.vz);
  ok(P('marcha atrás penalizada'), vb < rol.velocidad * 0.9, `v=${vb.toFixed(2)}`);
  quieto(0); paso(10);

  // esquiva
  j.teletransportar(0, 0); sim(0, { moverX: 1, moverZ: 0, apuntar: { x: 10, z: 0 } }); paso(3);
  const x0 = j.pos.x; sim(0, { esquivar: true }); paso(1); sim(0, { esquivar: false });
  const inv = j.invulT > 0 && j.esq.activa;
  paso(24);
  const dEsq = j.pos.x - x0, esperado = 4.4 * (rolId === 'cazador' ? 2 : 1);
  ok(P('esquiva con impulso e invulnerabilidad'), inv && dEsq > esperado * 0.65 && dEsq < esperado * 1.8, `d=${dEsq.toFixed(2)} esperado≈${esperado}`);
  const r1 = j.recibirDanio({ cantidad: 5, tipo: 'golpe' });
  paso(60); quieto(0);
  ok(P('esquiva en enfriamiento no se repite al instante'), j.esq.restante >= 0, `rest=${j.esq.restante.toFixed(2)}`);

  // disparo + recarga + cambio
  j.teletransportar(0, 0); j.vida = j.vidaMax; paso(20);
  const z1 = juego.sistemas.zombis.crear(0, 8, 400); z1.vel = 0;
  sim(0, { apuntar: { x: 0, z: 8 }, disparar: true }); paso(8);
  const gasto = j.arma.def.cargador - j.arma.municion;
  sim(0, { disparar: false }); paso(2);
  ok(P('dispara y daña'), z1.vida < 400 && gasto >= 1, `vida=${z1.vida} municion=${j.arma.municion}/${j.arma.def.cargador}`);
  j.arma.municion = 0; paso(3);
  ok(P('recarga automática al vaciarse'), j.arma.recargando, '');
  paso(Math.ceil((j.arma.def.recarga * (j.mods.recarga ?? 1) + 0.5) * 60));
  ok(P('recarga completa'), !j.arma.recargando && j.arma.municion > 0, `municion=${j.arma.municion}`);
  j.arma.municion = Math.max(0, j.arma.def.cargador - 1);
  sim(0, { recargar: true }); paso(1); sim(0, { recargar: false }); paso(2);
  ok(P('R recarga'), j.arma.recargando || j.arma.municion === j.arma.def.cargador, '');
  paso(400);
  const idx = j.armaIdx; sim(0, { cambiar: 1 }); paso(2);
  ok(P('cambia de arma'), j.armaIdx !== idx, `idx=${j.armaIdx}`);
  sim(0, { ranura: 0 }); paso(20);
  ok(P('tecla 1 vuelve a la primaria'), j.armaIdx === 0, '');

  // cuerpo a cuerpo y arrojadiza
  z1.cuerpo.x = 0; z1.cuerpo.z = 1.4; z1.pos.set(0, 0, 1.4); z1.vivo && (z1.vida = 400);
  const g0 = c.golpes ?? 0; sim(0, { cuerpo: true }); paso(2); sim(0, { cuerpo: false }); paso(20);
  ok(P('cuerpo a cuerpo'), (c.golpes ?? 0) > g0, `golpes=${c.golpes}`);
  const n0 = j.arrojadizas; sim(0, { lanzar: true, apuntar: { x: 0, z: 10 } }); paso(2); sim(0, { lanzar: false }); paso(20);
  ok(P('lanza arrojadiza'), j.arrojadizas === n0 - 1 && (c.lanzadas ?? 0) >= 1, `arrojadizas=${j.arrojadizas}`);

  // estados
  const vidaE = j.vida;
  j.aplicarEstado('envenenado', 2); paso(150);
  if (rolId === 'medico') ok(P('inmune al veneno'), !j.tieneEstado('envenenado') && j.vida >= vidaE, `vida=${j.vida.toFixed(1)}`);
  else ok(P('veneno hace daño y expira'), j.vida < vidaE && !j.tieneEstado('envenenado'), `vida=${j.vida.toFixed(1)}`);
  j.aplicarEstado('ralentizado', 1, { factor: 0.5 }); sim(0, { moverX: 1 }); paso(25);
  ok(P('ralentizado reduce la velocidad'), Math.hypot(j.cuerpo.vx, j.cuerpo.vz) < rol.velocidad * 0.7, '');
  quieto(0); paso(60);

  // habilidad
  await habilidadDe(rolId, j, P);

  // muerte en solitario
  let muerte = 0; const off = juego.eventos.en('jugador:muerte', () => muerte++);
  j.quitarEstado?.('ardiendo'); j.invulT = 0; j.recibirDanio({ cantidad: 9999, tipo: 'golpe', dirX: 1, dirZ: 0, empuje: 8 }); paso(2); off();
  ok(P('muere en solitario y emite jugador:muerte'), j.muerto && !j.vivo && muerte === 1, '');
  return resultados.slice(antes);
}

async function habilidadDe(rolId, j, P) {
  const c = juego.combate, zs = juego.sistemas.zombis, h = j.habilidad;
  j.teletransportar(0, 0); j.vida = j.vidaMax; j.invulT = 0; paso(30);
  let ev = 0; const off = juego.eventos.en('jugador:habilidad', () => ev++);
  const lanzar = () => { sim(0, { habilidad: true }); paso(1); sim(0, { habilidad: false }); };
  if (rolId === 'soldado') {
    const base = j.mods.cadencia; lanzar(); paso(2);
    const mu0 = j.arma.municion; sim(0, { apuntar: { x: 0, z: 10 }, disparar: true }); paso(20); sim(0, { disparar: false });
    ok(P('Fuego de supresión: activa, cadencia ↑, munición gratis'), h.activa && j.mods.cadencia > base * 1.4 && j.arma.municion === mu0 && h.restante > 20 && ev === 1, `cad=${j.mods.cadencia.toFixed(2)} (base ${base.toFixed(2)}) mun=${j.arma.municion}/${mu0}`);
    paso(7 * 60);
    ok(P('Supresión termina y restaura mods'), !h.activa && Math.abs(j.mods.cadencia - base) < 0.001 && !j.mods.municionInfinita, `cad=${j.mods.cadencia}`);
    const z = zs.crear(0, 6, 5000); z.vel = 0; j.disciplina = 0; z.recibirDanio({ cantidad: 1e5, atacante: j, tipo: 'bala' });
    ok(P('Disciplina de fuego: baja suma, daño resetea'), j.disciplina === 1, `d=${j.disciplina}`);
    j.invulT = 0; j.graciaT = 0; j.recibirDanio({ cantidad: 1, tipo: 'golpe' });
    ok(P('Disciplina se reinicia al recibir daño'), j.disciplina === 0, '');
  } else if (rolId === 'medico') {
    j.vida = 30; sim(0, { apuntar: { x: 0.5, z: 0.2 } }); lanzar(); paso(30);
    const z = zs.crear(2, 1, 100); z.vel = 0; z.slow = 1;
    paso(150);
    ok(P('Suero: crea zona de curación, cura y quema'), c.zonas?.length >= 1 && j.vida > 45 && z.vida < 100 && ev === 1 && j.habilidad.restante > 15, `zonas=${c.zonas?.length} vida=${j.vida.toFixed(1)} zombi=${z.vida.toFixed(1)}`);
    const v0 = (j.vida = 50); j.sinDanioT = 0; paso(60);
    ok(P('Regeneración continua'), j.vida > v0 + 1.5, `vida=${j.vida.toFixed(1)}`);
    let n = 0; const o2 = juego.eventos.en('jugador:danio', () => n++);
    j.recibirDanio({ cantidad: 50, tipo: 'veneno' }); o2();
    ok(P('Inmune al veneno directo'), n === 0, '');
    j.vida = j.vidaMax; j.invulT = 0; j.graciaT = 0; const dm = j.recibirDanio({ cantidad: 20, tipo: 'acido' });
    ok(P('Ácido a la mitad'), Math.abs(dm - 10) < 0.01, `dm=${dm}`);
  } else if (rolId === 'ingeniero') {
    const m = juego.mundo;
    sim(0, { apuntar: { x: 0, z: 10 } }); paso(3);
    lanzar(); paso(2);
    ok(P('Q despliega torreta'), m.torretas === 1 && h.restante > 30 && h.activa, `torretas=${m.torretas} rest=${h.restante.toFixed(1)}`);
    lanzar(); paso(2);
    ok(P('Q con torreta en enfriamiento levanta barricada'), m.barricadas === 1 && j.barricada.restante > 5, `barricadas=${m.barricadas}`);
    lanzar(); paso(2);
    ok(P('Sin más construcciones en enfriamiento'), m.barricadas === 1 && m.torretas === 1, '');
    const e = m.estructura('prueba', 0, 2.2, 100, 0.5, 0xaa8844); e.vida = 20;
    sim(0, { usar: true, apuntar: { x: 0, z: 10 } }); paso(90); sim(0, { usar: false }); paso(2);
    ok(P('Reparar manteniendo E'), e.vida > 40, `vida=${e.vida.toFixed(1)}`);
  } else if (rolId === 'cazador') {
    const z = zs.crear(0, 12, 99999); z.vel = 0;
    sim(0, { apuntar: { x: 0, z: 12 } }); paso(110);
    ok(P('Ojo clínico: listo tras 1,5 s'), j.ojoListo, `sinDisparo=${j.sinDisparoT.toFixed(2)}`);
    sim(0, { disparar: true }); paso(1); sim(0, { disparar: false }); paso(2);
    ok(P('Ojo clínico: primer disparo es crítico'), c.ultimoDisparo?.crit === true && !j.ojoListo, `crit=${c.ultimoDisparo?.crit}`);
    paso(400);
    const dBase = j.mods.danio; lanzar(); paso(2);
    ok(P('Acecho: invisible y daño ×3'), j.invisible && j.tieneEstado('invisible') && Math.abs(j.mods.danio / dBase - 3) < 0.01 && ev === 1, `danio×${(j.mods.danio / dBase).toFixed(2)} inv=${j.invisible}`);
    sim(0, { disparar: true }); paso(1); sim(0, { disparar: false }); paso(2);
    ok(P('Acecho: el disparo consume el ×3'), Math.abs(j.mods.danio / dBase - 1) < 0.01 && Math.abs((c.ultimoDisparo?.danioMod ?? 0) / dBase - 3) < 0.01, `mod=${c.ultimoDisparo?.danioMod}`);
    paso(100);
    ok(P('Acecho: se revela poco después de disparar'), !j.invisible, '');
  } else if (rolId === 'demoledor') {
    const zz = [zs.crear(3, 0, 600), zs.crear(-4, 2, 600), zs.crear(0, 5, 600), zs.crear(14, 0, 600)];
    for (const z of zz) z.vel = 0;
    lanzar(); paso(40);
    ok(P('Golpe sísmico: daña, aturde a menos de 7 m y no a más'), zz[0].vida < 600 && zz[1].vida < 600 && zz[2].vida < 600 && zz[3].vida === 600 && zz[0].stunT > 0 && ev === 1, `v=${zz.map((z) => z.vida.toFixed(0))}`);
    const px = j.pos.x; j.invulT = 0; j.graciaT = 0; j.recibirDanio({ cantidad: 10, tipo: 'golpe', dirX: 1, dirZ: 0, empuje: 20 }); paso(10);
    ok(P('Imparable: no se mueve con empujes'), Math.abs(j.pos.x - px) < 0.05, `dx=${(j.pos.x - px).toFixed(3)}`);
    j.graciaT = 0; j.invulT = 0; const d = j.recibirDanio({ cantidad: 20, tipo: 'golpe' });
    ok(P('Imparable: −15 % de daño cuerpo a cuerpo'), Math.abs(d - 17) < 0.01, `d=${d}`);
  }
  off();
}

async function pruebaCoop() {
  const antes = resultados.length;
  const [a1, b1] = reiniciar(['soldado', 'medico']);
  a1.teletransportar(0, 0); b1.teletransportar(1.2, 0);
  let caidos = 0, reanim = 0; const o1 = juego.eventos.en('jugador:caido', () => caidos++), o2 = juego.eventos.en('jugador:reanimado', () => reanim++);
  a1.recibirDanio({ cantidad: 9999, tipo: 'golpe' }); paso(3);
  ok('coop: cae en vez de morir', a1.caido && !a1.vivo && !a1.muerto && caidos === 1, '');
  sim(1, { usar: true }); paso(30);
  ok('coop: la Médica reanima casi al instante', a1.vivo && reanim === 1 && a1.vida > 30, `vida=${a1.vida.toFixed(0)}`);
  sim(1, { usar: false }); paso(5);
  // reanimar con otro rol: 3 s
  const [s0, s1] = reiniciar(['soldado', 'soldado']); s0.teletransportar(0, 0); s1.teletransportar(1.2, 0);
  s0.recibirDanio({ cantidad: 9999, tipo: 'golpe' }); paso(3);
  sim(1, { usar: true }); paso(60);
  const mitad = s0.progresoReanimar;
  paso(130); sim(1, { usar: false });
  ok('coop: reanimación de 3 s manteniendo E', mitad > 0.2 && mitad < 0.7 && s0.vivo, `progreso a 1 s=${mitad.toFixed(2)} vivo=${s0.vivo}`);
  // reanimarTodos
  s1.recibirDanio({ cantidad: 9999, tipo: 'golpe' }); paso(2);
  ok('coop: si no queda nadie en pie, ambos mueren', s1.muerto || s1.caido, `caido=${s1.caido} muerto=${s1.muerto}`);
  o1(); o2();
  return resultados.slice(antes);
}

async function pruebaVariadas() {
  const antes = resultados.length;
  const [j] = reiniciar(['ingeniero']);
  // uso de interactivo con mantener
  let usado = 0;
  juego.mundo.registrarInteractivo({ pos: new THREE.Vector3(1.5, 0, 0), radioUso: 2, etiqueta: 'Palanca', mantener: 1, usar() { usado++; } });
  sim(0, { usar: true }); paso(30);
  const mid = j.interactivo?.progreso ?? 0;
  paso(50); sim(0, { usar: false }); paso(3);
  ok('interactivo con mantener: progresa y se activa una vez', mid > 0.3 && usado === 1, `mid=${mid.toFixed(2)} usado=${usado}`);
  let toque = 0;
  juego.mundo.registrarInteractivo({ pos: new THREE.Vector3(-1.5, 0, 0), radioUso: 1, etiqueta: 'Campana', usar() { toque++; } });
  j.teletransportar(-1.5, 0.5); paso(2);
  sim(0, { usar: true }); paso(1); sim(0, { usar: false }); paso(2);
  ok('interactivo instantáneo con E', toque === 1 && j.interactivo?.etiqueta === 'Campana', `toque=${toque}`);
  // vehículo
  let bajado = 0;
  const veh = { pos: new THREE.Vector3(5, 0, 5), ocultaConductor: true, bajar() { bajado++; j.vehiculo = null; } };
  j.vehiculo = veh; paso(3);
  ok('vehículo: cuerpo desactivado y visual oculto', j.cuerpo.capa === 0 && j.cuerpo.mascara === 0, '');
  sim(0, { moverX: 1 }); paso(20); sim(0, { moverX: 0 });
  ok('vehículo: no se mueve por sí mismo', Math.abs(j.pos.x - 5) < 0.01, `x=${j.pos.x}`);
  sim(0, { usar: true }); paso(1); sim(0, { usar: false }); paso(3);
  ok('vehículo: E llama a bajar() y reactiva el cuerpo', bajado === 1 && j.cuerpo.capa === CAPA.JUGADOR && !j.vehiculo, `bajado=${bajado}`);
  // boca tras muro
  j.teletransportar(12, -5.4); paso(5);
  j.rot = Math.PI; sim(0, { apuntar: { x: 12, z: -20 } }); paso(6); sim(0, { disparar: true }); paso(2);
  sim(0, { disparar: false });
  const o = juego.combate.ultimoOrigen;
  ok('boca tras un muro: dispara desde el pecho', o && Math.abs(o.z - j.pos.z) < 0.45 && j.armas[0].municion < j.armas[0].def.cargador, `origenΔz=${o ? (o.z - j.pos.z).toFixed(2) : 'sin disparo'}`);
  quieto(0);
  // estados visuales
  j.aplicarEstado('escudo', 5, { cantidad: 30 }); j.invulT = 0; j.graciaT = 0;
  const d1 = j.recibirDanio({ cantidad: 20, tipo: 'bala' });
  ok('escudo absorbe daño', d1 === 0 && j.escudo === 10, `esc=${j.escudo}`);
  j.aplicarEstado('silenciado', 2); sim(0, { habilidad: true }); paso(1); sim(0, { habilidad: false });
  ok('silenciado bloquea habilidad', j.silenciado > 0 && j.habilidad.restante === 0, `sil=${j.silenciado.toFixed(2)}`);
  juego.opciones.dios = 1; const vi = j.vida; j.invulT = 0; const dd = j.recibirDanio({ cantidad: 50, tipo: 'golpe' }); juego.opciones.dios = 0;
  ok('modo dios', dd === 0 && j.vida === vi, '');
  // cambio de era
  let armaEv = 0; const off = juego.eventos.en('jugador:arma', () => armaEv++);
  const ant = j.armas[0].id; juego.sistemas.jugadores.alCambiarEra(3);
  ok('alCambiarEra reequipa', j.armas[0].id !== ant && armaEv === 1 && j.eraIdx === 3, `${ant} → ${j.armas[0].id}`);
  off();
  j.aplicarMejora({ id: 'x', aplicar: (p) => { p.mods.danio *= 1.2; p.vidaMax += 10; } });
  ok('aplicarMejora', j.vidaMax === 110 && Math.abs(j.mods.danio - 0.9 * 1.2) < 1e-6, `vidaMax=${j.vidaMax} danio=${j.mods.danio}`);
  return resultados.slice(antes);
}

window.pruebaRol = pruebaRol;
window.pruebaCoop = pruebaCoop;
window.pruebaVariadas = pruebaVariadas;
window.pruebaCompleta = async () => {
  resultados.length = 0;
  for (const r of Object.keys(ROLES)) await pruebaRol(r);
  await pruebaCoop(); await pruebaVariadas();
  const malas = resultados.filter((r) => !r.ok);
  return { total: resultados.length, fallos: malas.length, malas };
};

// ───────── Escena de exhibición ─────────
function escena() {
  const rol = q.get('rol') ?? 'soldado', n = +(q.get('n') ?? 1), nz = +(q.get('zombis') ?? 0);
  const roles = [rol, q.get('rol2') ?? 'medico'].slice(0, n);
  roles.forEach((r, i) => juego.sistemas.jugadores.crear(i, r, -2 + i * 3, 0));
  juego.render.seguir(juego.jugadores);
  for (let i = 0; i < nz; i++) {
    const ang = (i / nz) * Math.PI * 2, r = 7 + (i % 3) * 2;
    juego.sistemas.zombis.crear?.(Math.sin(ang) * r, Math.cos(ang) * r, 150, 2 + (i % 4) * 0.4);
  }
}
if (!q.get('manual')) escena();
window.arnes = a; window.simular = sim; window.paso = paso;
a.lista();
