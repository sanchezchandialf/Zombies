// Página de prueba de la INTERFAZ con estado simulado: jugadores falsos, render falso (proyección plana) y eventos a mano.
// Parámetros: ?pantalla=menu|roles|hud|intermedio|era|jefe|pausa|fin|bestiario|controles|opciones|practica|anuncio|superado|mensajes|salto|cuenta
//             &era=0..5 &jug=1|2 &dia=N &victoria=1 &tab=jefes
import { Juego } from '../src/nucleo/juego.js';
import { crearUI } from '../src/ui/index.js';
import { ERAS, anioDeDia, esDiaDeJefe } from '../src/datos/eras.js';
import { ROLES } from '../src/datos/roles.js';
import { ARMAS } from '../src/datos/armas.js';
import { ZOMBIS, JEFES } from '../src/datos/zombis.js';
import { elegirMejoras, vistaMejora } from '../src/datos/mejoras.js';

const q = new URLSearchParams(location.search);
const pantalla = q.get('pantalla') || 'hud';
const eraIdx = Number(q.get('era') ?? 0);
const nJug = Number(q.get('jug') ?? 2);
const dia = Number(q.get('dia') ?? eraIdx * 5 + 4);
const FONDOS = [
  'radial-gradient(120% 90% at 50% 40%, #6a5a3a 0%, #3b2f20 55%, #17110a 100%)',
  'radial-gradient(120% 90% at 50% 40%, #9a5a34 0%, #4a2a1c 55%, #1a0e08 100%)',
  'radial-gradient(120% 90% at 50% 40%, #5b6a44 0%, #2f3826 55%, #10140c 100%)',
  'radial-gradient(120% 90% at 50% 40%, #3a2c6a 0%, #1c1440 55%, #07041a 100%)',
  'radial-gradient(120% 90% at 50% 40%, #3a5a74 0%, #1c3144 55%, #080f16 100%)',
  'radial-gradient(120% 90% at 50% 40%, #4a2a7a 0%, #1b1146 55%, #06031a 100%)',
];

const contenedor = document.getElementById('juego');
const fondo = document.getElementById('fondo');
fondo.style.background = FONDOS[eraIdx];
const juego = new Juego({ contenedor });
const est = juego.estado;
est.eraIdx = eraIdx;

// ── render falso: proyección plana (arriba = −Z) ──
const W = () => contenedor.clientWidth, H = () => contenedor.clientHeight;
juego.registrar('render', {
  siempre: true,
  proyectar(p, out = { x: 0, y: 0, visible: true }) {
    const k = H() / 36;
    out.x = W() / 2 + p.x * k * 1.4; out.y = H() * 0.56 + p.z * k - (p.y || 0) * k * 1.05;
    out.visible = out.x > -50 && out.x < W() + 50 && out.y > -50 && out.y < H() + 50;
    return out;
  },
});
juego.registrar('entrada', { siempre: true, gestionaPausa: true, dispositivo: (i) => (i === 1 ? 'mando' : 'teclado') });
juego.registrar('escenarios', { actual: { limites: { minX: -45, maxX: 45, minZ: -45, maxZ: 45 } } });
const calidades = [];
juego.audio = { desbloquear() { window.__audioDesbloqueado = true; }, volumen(...v) { window.__vol = v; } };
juego.render.calidad = (c) => calidades.push(c);
if (q.get('director')) { const { crearDirector } = await import('../src/oleadas/index.js'); juego.registrar('director', crearDirector(juego)); }
juego.registrar('ui', crearUI(juego));
window.juego = juego;

// ── jugadores falsos ──
function arma(id, mun, res) { const def = ARMAS[id]; return { def, id, municion: mun ?? def.cargador, reserva: res ?? 60, recargando: false, progresoRecarga: 0 }; }
function jugadorFalso(i, rolId, x, z) {
  const rol = ROLES[rolId], era = ERAS[eraIdx];
  const a = [arma(era.armas[rol.equipo.primaria]), arma(era.armas[rol.equipo.secundaria], undefined, -1)];
  return {
    indice: i, rol, pos: { x, y: 0, z }, rot: 0, vida: rol.vida * 0.72, vidaMax: rol.vida, vivo: true, caido: false, muerto: false, progresoReanimar: 0,
    arma: a[0], armas: a, armaIdx: 0, arrojadizas: 3, arrojadizasMax: Math.max(4, rol.equipo.arrojadizas), mods: { ...rol.mods }, estados: new Map(), silenciado: 0,
    habilidad: { def: rol.habilidad, restante: i === 0 ? 0 : rol.habilidad.enfriamiento * 0.6, total: rol.habilidad.enfriamiento, activa: false, tiempoActiva: 0 },
    interactivo: null, apuntando: { x: x + 7, z: z - 4 }, visual: { altura: 1.8 }, bando: 'jugadores',
  };
}
const roles = ['soldado', 'cazador'];
const jugadores = [];
for (let i = 0; i < nJug; i++) jugadores.push(jugadorFalso(i, roles[i], i === 0 ? -7 : 7, 3));
juego.jugadores.push(...jugadores);

// ── zombis falsos ──
const zombis = [];
for (let i = 0; i < 14; i++) zombis.push({ pos: { x: -30 + (i * 7.3) % 60, y: 0, z: -22 + ((i * 11) % 30) }, vivo: true, bando: 'zombis', visual: { altura: 1.8 }, def: ZOMBIS.caminante });
juego.zombis.push(...zombis);

// ── fondo con figuras para juzgar solapes ──
const figuras = [];
function figura(ent, color, tam) {
  const d = document.createElement('div'); d.className = 'e';
  d.style.cssText = `width:${tam}px;height:${tam}px;background:${color};margin:${-tam / 2}px 0 0 ${-tam / 2}px;box-shadow:0 0 14px rgba(0,0,0,.6)`;
  fondo.appendChild(d); figuras.push({ ent, d });
}
for (const j of jugadores) figura(j, j.rol.color, 26);
for (const z of zombis) figura(z, '#7fa06a', 20);
juego.registrar('fondoFalso', { siempre: true, actualizar() {
  for (const f of figuras) { const o = juego.render.proyectar({ x: f.ent.pos.x, y: 0.9, z: f.ent.pos.z }); f.d.style.transform = `translate(${o.x}px, ${o.y}px)`; f.d.style.display = f.ent.vivo === false ? 'none' : ''; }
} });

// ── escenas ──
function estadoPartida(extra = {}) {
  Object.assign(est, { fase: 'jugando', dia, anio: anioDeDia(dia), eraIdx, zombisRestantes: 37, zombisTotales: 64, puntos: 337900, racha: 27, multiplicador: 3, rachaRestante: 0.62, bajas: 412, hora: 0.5, subfase: 'oleada', dificultad: 'normal', mejorRacha: 41, tiempoPartida: 1260 }, extra);
}
const emit = (n, d) => juego.eventos.emitir(n, d);
function mejorasFalsas() {
  const rng = juego.rng;
  const porJugador = jugadores.map((j) => ({ indice: j.indice, rol: j.rol.id, mejoras: elegirMejoras(rng, j.rol.id, { coraza: 2 }, Math.max(dia, 9), 3).map((d, k) => vistaMejora(d, k === 0 ? 1 : 0)) }));
  return { dia, duracion: 20, mejoras: porJugador[0].mejoras, porJugador, diaSiguiente: dia + 1, anioSiguiente: anioDeDia(dia + 1), eraSiguiente: Math.min(5, eraIdx + ((dia % 5 === 0) ? 1 : 0)) };
}
function escenaHud() {
  estadoPartida();
  const j0 = jugadores[0];
  j0.interactivo = { obj: { pos: { x: -4, y: 0, z: 1 } }, etiqueta: 'Tocar la campana', tipo: 'usar', progreso: 0.4, mantener: 1.2 };
  j0.estados.set('envenenado', { resta: 3.2, total: 4, datos: {} }); j0.estados.set('potenciado', { resta: 6, total: 8, datos: {} });
  j0.arma.municion = 1; j0.arma.reserva = 24;
  if (jugadores[1]) { jugadores[1].arma.recargando = true; jugadores[1].arma.progresoRecarga = 0.55; jugadores[1].habilidad.activa = true; jugadores[1].habilidad.tiempoActiva = 3; jugadores[1].habilidad.duracion = 5; }
  juego.mundo = { estructuras: [{ pos: { x: 0, y: 0, z: -5 }, vida: 40, vidaMax: 100, vivo: true }], objetos: [] };
  juego.zombis[0].pos.x = -70; juego.zombis[1].pos.z = -60; // fuera de pantalla → marcadores
  est.zombisRestantes = 5;
  emit('jugador:danio', { jugador: j0, cantidad: 12, tipo: 'bala', dirX: 1, dirZ: 0.4 });
  const nums = [[zombis[2], 95, false, 'bala'], [zombis[3], 190, true, 'perforante'], [zombis[4], 22, false, 'fuego'], [zombis[5], 14, false, 'acido']];
  for (const [z, c, crit, t] of nums) emit('danio', { objetivo: z, cantidad: c, tipo: t, critico: crit, atacante: j0, x: z.pos.x, z: z.pos.z, muerte: false });
  emit('danio', { objetivo: j0, cantidad: 12, tipo: 'bala', critico: false, atacante: zombis[6], x: j0.pos.x, z: j0.pos.z });
  emit('mensaje', { texto: '¡Multiplicador ×3!', tipo: 'logro', duracion: 600 });
  emit('mensaje', { texto: 'Se oyen campanas en la plaza', tipo: 'aviso', duracion: 600, subtitulo: 'La carga de caballería se acerca' });
  // Mantiene los números de daño vivos: los reemite cada 0,6 s.
  setInterval(() => { for (const [z, c, crit, t] of nums) emit('danio', { objetivo: z, cantidad: c, tipo: t, critico: crit, atacante: j0, x: z.pos.x, z: z.pos.z }); }, 650);
}
const escenas = {
  menu() { est.fase = 'menu'; },
  roles() { est.fase = 'menu'; juego.eventos.una('juego:listo', () => {}); setTimeout(() => { window.juego.ui.abrir('roles', { dia: 1 }); }, 150); },
  practica() { est.fase = 'menu'; setTimeout(() => juego.ui.abrir('practica'), 150); },
  bestiario() { est.fase = 'menu'; setTimeout(() => { juego.ui.abrir('bestiario'); if (q.get('tab') === 'jefes') document.querySelector('[data-t="jefes"]')?.click(); }, 150); },
  controles() { est.fase = 'menu'; setTimeout(() => juego.ui.abrir('controles'), 150); },
  opciones() { est.fase = 'menu'; setTimeout(() => juego.ui.abrir('opciones'), 150); },
  hud: escenaHud,
  intermedio() {
    estadoPartida({ fase: 'intermedio', subfase: 'intermedio', intermedioRestante: 14 });
    const t0 = performance.now();
    setInterval(() => { est.intermedioRestante = Math.max(0, 14 - (performance.now() - t0) / 1000); }, 200);
    emit('intermedio:inicio', mejorasFalsas());
  },
  era() { estadoPartida(); emit('era:cambio', { eraIdx, era: ERAS[eraIdx], anterior: Math.max(0, eraIdx - 1) }); },
  salto() { estadoPartida({ fase: 'transicion', anio: anioDeDia(dia) }); },
  jefe() {
    estadoPartida({ dia: eraIdx * 5 + 5, anio: anioDeDia(eraIdx * 5 + 5), zombisRestantes: 20 });
    const def = JEFES[ERAS[eraIdx].jefe];
    const jefe = { def, nombre: def.nombre, pos: { x: 3, y: 0, z: -12 }, vida: def.vida * 0.64, vidaMax: def.vida, vivo: true, esJefe: true, bando: 'zombis', visual: { altura: 3 } };
    juego.zombis.push(jefe); est.jefe = jefe;
    emit('jefe:aparece', { jefe });
    jugadores[0].arma.municion = 7;
  },
  anuncio() { estadoPartida(); emit('oleada:inicio', { dia, anio: est.anio, eraIdx, total: 64, jefe: null, tematica: { nombre: 'Noche de podredumbre', subtitulo: 'El aire se vuelve irrespirable.' } }); },
  superado() { estadoPartida(); emit('oleada:fin', { dia, anio: est.anio, bonus: { sinDanio: 1000, tiempo: 640 }, bajas: 64, tiempo: 118 }); },
  mensajes() { estadoPartida(); emit('mensaje', { texto: 'Racha de 25', tipo: 'logro', duracion: 600 }); emit('mensaje', { texto: 'Un Aullador ha gritado', tipo: 'aviso', subtitulo: 'Tus habilidades quedan silenciadas', duracion: 600 }); emit('mensaje', { texto: 'Munición repuesta', tipo: 'info', duracion: 600 }); },
  cuenta() { estadoPartida({ subfase: 'cuenta', cuenta: 3 }); },
  pausa() { estadoPartida(); setTimeout(() => juego.pausar(true), 150); },
  fin() {
    estadoPartida({ fase: q.get('victoria') ? 'victoria' : 'derrota' });
    emit('partida:fin', { victoria: !!q.get('victoria'), resumen: { dias: dia, diasSuperados: dia - 1, anio: est.anio, eraIdx, puntos: 337900, bajas: 412, tiempo: 1260, mejorRacha: 41, victoria: !!q.get('victoria'), dificultad: 'normal', roles: jugadores.map((j) => j.rol.id), record: !!q.get('record'), recordAnterior: 280000 } });
  },
};
juego.ui = juego.sistemas.ui;
await juego.iniciar();
(escenas[pantalla] || escenas.hud)();
// Espera a que las animaciones de entrada terminen antes de marcar la página como lista.
setTimeout(() => { window.__lista = true; }, ['fin'].includes(pantalla) ? 3500 : pantalla === 'era' ? 2600 : 1400);
