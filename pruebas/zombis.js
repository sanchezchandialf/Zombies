// Arnés de zombis e IA. Parámetros de URL:
//   ?clase=caminante&n=150       horda de una clase (o clase=mezcla)
//   ?jefe=omega                  jefe (coracero|fogonero|mariscal|rey_asfalto|paciente_cero|omega)
//   ?mapa=plaza|laberinto|vacio  obstáculos (por defecto plaza)
//   ?quieto=1                    el jugador falso no se mueve (por defecto recorre una ruta)
//   ?manual=1                    detiene el bucle: se avanza con simular(seg) y fotograma()
//   ?elite=1  ?dia=12  ?era=0..5 ?hud=0
// Consola: simular(seg), fotograma(), metricas(), hastaAtaque(id, p), estadoHorda(), zombis, jefe, jugador
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearPersonajes } from '../src/personajes/index.js';
import { crearZombis } from '../src/entidades/zombis.js';
import { crearCombateFalso, JugadorFalso, EstructuraFalsa, laberinto, pilares } from './falsos.js';
import { ZOMBIS, JEFES } from '../src/datos/zombis.js';

const q = new URLSearchParams(location.search);
const claseId = q.get('clase') || (q.get('jefe') ? null : 'mezcla');
const n = +(q.get('n') || 150);
const jefeId = q.get('jefe');
const mapa = q.get('mapa') || 'plaza';
const L = mapa === 'laberinto' ? 40 : 45;

const a = await crearArnes({
  eraIdx: +(q.get('era') || 0), hora: 0.55, suelo: true,
  camara: { dist: 20, alto: 38, objetivo: [0, 0, 0] },
  sistemas: {
    personajes: (j) => crearPersonajes(j),
    combate: (j) => crearCombateFalso(j),
    zombis: (j) => crearZombis(j),
  },
});
const juego = a.juego, sis = juego.sistemas.zombis;
juego.fisica.limites = { minX: -L, maxX: L, minZ: -L, maxZ: L };
juego.estado.dia = +(q.get('dia') || 8);
sis.iniciar?.();
juego.registrar('jugadoresFalsos', { actualizar: (dt) => { for (const j of juego.jugadores) j.actualizar?.(dt); }, posFisica: () => { for (const j of juego.jugadores) { j.posFisica?.(); j.malla?.position.set(j.pos.x, 0, j.pos.z); } } }, 25);

// ── Escenario ──
const escena = juego.render.escena;
const matMuro = new THREE.MeshStandardMaterial({ color: 0x6d675c, roughness: 0.9 });
function mallaCaja(c) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(c.hx * 2, 2.2, c.hz * 2), matMuro);
  m.position.set(c.x, 1.1, c.z); m.rotation.y = c.rot; m.castShadow = m.receiveShadow = true; escena.add(m);
}
function mallaCirculo(c) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(c.radio, c.radio, 2.6, 18), matMuro);
  m.position.set(c.x, 1.3, c.z); m.castShadow = m.receiveShadow = true; escena.add(m);
}
if (mapa === 'laberinto') laberinto(juego, { ancho: 80, filas: 5, hueco: 3.4 });
else if (mapa === 'plaza') pilares(juego, 14, 5);
for (const c of juego.fisica.estaticos) (c.forma === 'caja' ? mallaCaja : mallaCirculo)(c);
if (q.get('barricada')) { const e = new EstructuraFalsa(juego, 0, 8, { hx: 3, hz: 0.5, vida: 800 }); mallaCaja({ x: 0, z: 8, hx: 3, hz: 0.5, rot: 0 }); void e; }

// ── Jugador falso con ruta ──
const jugador = new JugadorFalso(juego, 0, 0, { masa: 1e6, vida: 1e9, vel: 4.5 });
jugador.malla = new THREE.Mesh(new THREE.CapsuleGeometry(0.4, 1.0, 4, 12), new THREE.MeshStandardMaterial({ color: 0x4f9bff, emissive: 0x143a70 }));
jugador.malla.castShadow = true; escena.add(jugador.malla);
jugador.malla.position.y = 0.9;
const ruta = mapa === 'laberinto' ? [[33, -35]] : [[0, 0], [14, 0], [14, 14], [-12, 14], [-12, -10], [10, -12]];
let ir = 0;
if (!q.get('quieto')) juego.registrar('ruta', { actualizar: () => { const r = ruta[ir]; jugador.meta = { x: r[0], z: r[1] }; if (Math.hypot(r[0] - jugador.pos.x, r[1] - jugador.pos.z) < 1) ir = (ir + 1) % ruta.length; } }, 24);
// la malla del jugador queda a media altura
const colocarJug = () => jugador.malla.position.set(jugador.pos.x, 0.9, jugador.pos.z);

// ── Generación ──
let jefe = null;
const clasesMezcla = ['caminante', 'caminante', 'caminante', 'caminante', 'corredor', 'corredor', 'acorazado', 'apestado', 'escupidor', 'detonador', 'mole', 'aullador'];
if (jefeId) jefe = sis.generarJefe(jefeId, -24, 10);
else {
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 * 3.1, r = (mapa === 'laberinto' ? 30 : 28) + (i % 9) * 1.4;
    const x = mapa === 'laberinto' ? -34 + (i % 12) * 6 : Math.sin(ang) * r;
    const z = mapa === 'laberinto' ? 30 + Math.floor(i / 12) * 1.6 : Math.cos(ang) * r;
    const c = claseId === 'mezcla' ? clasesMezcla[i % clasesMezcla.length] : claseId;
    sis.generar(c, x, z, { emerger: false, elite: !!q.get('elite') && i % 5 === 0 });
  }
}

// ── Medidas ──
const hist = []; let acum = 0, cuenta = 0, ultimoHud = 0;
const orig = sis.actualizar.bind(sis);
sis.actualizar = (dt) => { const t0 = performance.now(); orig(dt); acum += performance.now() - t0; cuenta++; };
// reemplazo en el registro (juego guarda la referencia al objeto, no al método)
const hud = document.createElement('pre');
hud.style.cssText = 'position:fixed;left:8px;top:8px;margin:0;padding:6px 8px;background:#000a;color:#bfe;font:12px/1.35 monospace;pointer-events:none;white-space:pre';
if (q.get('hud') !== '0') document.body.appendChild(hud);
function nnStats() {
  const v = juego.zombis; let sumNN = 0, solapes = 0;
  for (let i = 0; i < v.length; i++) {
    let m = 1e9;
    for (let k = 0; k < v.length; k++) if (k !== i) { const d = Math.hypot(v[i].pos.x - v[k].pos.x, v[i].pos.z - v[k].pos.z); if (d < m) m = d; if (k > i && d < v[i].radio + v[k].radio - 0.05) solapes++; }
    sumNN += m;
  }
  return { nn: v.length ? sumNN / v.length : 0, solapes };
}
function metricas() {
  const v = juego.zombis; let cerca = 0, vel = 0;
  for (const z of v) { if (Math.hypot(z.pos.x - jugador.pos.x, z.pos.z - jugador.pos.z) < 10) cerca++; vel += Math.hypot(z.rvx, z.rvz); }
  const s = nnStats();
  return { zombis: v.length, cercaDe10m: cerca, velMedia: +(vel / Math.max(1, v.length)).toFixed(2), distVecinoMedia: +s.nn.toFixed(2), solapes: s.solapes, cpuMs: +(acum / Math.max(1, cuenta)).toFixed(3), telegrafos: sis.telegrafos.activos.length, jefe: jefe ? { vida: Math.round(jefe.vida), fase: jefe.ia.fase, estado: jefe.ia.estado } : null };
}
a.alCuadro(() => {
  colocarJug();
  const t = performance.now();
  if (t - ultimoHud > 400) {
    ultimoHud = t; const m = metricas(); acum = 0; cuenta = 0;
    hud.textContent = `zombis ${m.zombis} · a <10 m: ${m.cercaDe10m} · vel media ${m.velMedia} m/s\nvecino más próximo ${m.distVecinoMedia} m · solapes ${m.solapes}\nCPU actualizar ${m.cpuMs} ms · avisos ${m.telegrafos}` + (m.jefe ? `\n${jefe.def.nombre} · vida ${m.jefe.vida}/${jefe.vidaMax} · fase ${m.jefe.fase} · ${m.jefe.estado}` : '');
  }
});

// ── Control manual para capturas ──
const sinRender = () => { const r = juego.sistemas.render, o = r.actualizar; r.actualizar = () => {}; return () => { r.actualizar = o; }; };
window.simular = (seg, dt = 1 / 30) => { const f = sinRender(); const nPasos = Math.round(seg / dt); for (let i = 0; i < nPasos; i++) juego.avanzar(dt); f(); colocarJug(); return metricas(); };
window.fotograma = () => { juego.avanzar(1 / 60); colocarJug(); };
window.metricas = metricas;
window.hastaAtaque = (id, p = 0.6, max = 120) => {
  const f = sinRender(); let hecho = false;
  for (let i = 0; i < max * 60 && !hecho; i++) {
    juego.avanzar(1 / 60);
    const A = jefe?.ia.ataque;
    if (A && A.id === id && A.etapa === 'aviso' && A.t / A.dur[0] >= p) hecho = true;
    if (jefe?.vida > 0) jefe.vida = jefe.vidaMax;           // el jefe no cae mientras se prueba
  }
  f(); colocarJug(); return { ok: hecho, ataque: jefe?.ia.ataque?.id, avisos: sis.telegrafos.activos.length };
};
window.jefe = jefe; window.zombis = juego.zombis; window.jugador = jugador; window.juego = juego; window.sis = sis;
if (q.get('manual')) juego.detener?.();
// cámara de juego desde el sur-este, a ~25 m
a.mirar(0, 38, 26, 0, 0, 0);
window.__lista = true;
