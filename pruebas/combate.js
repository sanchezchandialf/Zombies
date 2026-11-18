// Arnés del combate: un tirador, dianas Dañables de carne y metal, muros, barriles y aliados.
//   Ratón: apuntar · clic: disparar/lanzar/golpear · R: recargar · F: cuerpo a cuerpo · G: arrojadiza · panel: era y arma
//   ?depurar=1 dibuja cuerpos, radios de explosión, zonas, proyectiles y últimos rayos. ?era=3 elige la era inicial.
//   window.prueba: equipar(id) · apuntar(rot) · disparar(seg) · lanzar(x,z) · golpear() · avanzar(seg) · manual(true) · reiniciar() · camara(...)
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { crearCombate } from '../src/combate/index.js';
import { CAPA } from '../src/nucleo/fisica.js';
import { ARMAS, LISTA_ARMAS } from '../src/datos/armas.js';
import { crearModeloArma } from '../src/armas/modelos.js';

const a = await crearArnes({ eraIdx: 0, hora: 0.3, camara: { dist: 26, alto: 26, objetivo: [0, 0, -6] }, sistemas: { combate: crearCombate } });
const juego = a.juego, combate = juego.combate, fisica = juego.fisica, escena = juego.render.escena;
a.orbita.enabled = false;
juego.render.camaraExterna = true;
const opciones = juego.opciones;
let depurar = !!opciones.depurar;

const fx = juego.fx;

// ───────────────────────── Escenario ─────────────────────────
const Z0 = 10; // el tirador está en z=10 y apunta hacia −Z (arriba en pantalla)
const mundoPos = (x, f) => ({ x, z: Z0 - f });
const sueloMat = new THREE.LineBasicMaterial({ color: 0x8a8470, transparent: true, opacity: 0.45 });
{
  const pts = [];
  for (let f = 5; f <= 40; f += 5) { pts.push(new THREE.Vector3(-14, 0.03, Z0 - f), new THREE.Vector3(14, 0.03, Z0 - f)); }
  for (let x = -12; x <= 12; x += 4) pts.push(new THREE.Vector3(x, 0.03, Z0), new THREE.Vector3(x, 0.03, Z0 - 40));
  escena.add(new THREE.LineSegments(new THREE.BufferGeometry().setFromPoints(pts), sueloMat));
}
const matCarne = (c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, metalness: 0.0 });
const geoCuerpo = new THREE.CapsuleGeometry(0.3, 0.85, 4, 10);
const geoCabeza = new THREE.SphereGeometry(0.22, 12, 10);
const geoMetal = new THREE.CylinderGeometry(0.42, 0.46, 1.5, 14);
const geoBarril = new THREE.CylinderGeometry(0.42, 0.42, 0.95, 16);
const geoBanda = new THREE.TorusGeometry(0.43, 0.035, 6, 20);
const matMetalBase = new THREE.MeshStandardMaterial({ color: 0x8993a1, roughness: 0.35, metalness: 0.9 });

const dianas = [];
const flotantes = [];
function crearDiana(x, z, o = {}) {
  const e = {
    nombre: o.nombre ?? 'diana', bando: o.bando ?? 'zombis', material: o.material ?? 'carne', radio: o.radio ?? 0.42,
    vidaMax: o.vida ?? 400, vida: o.vida ?? 400, vivo: true, pos: new THREE.Vector3(x, 0, z), rot: o.rot ?? Math.PI,
    casa: { x, z }, ultimoGolpe: -9, flash: 0, muerte: 0, explosivo: !!o.explosivo, aturdido: 0, recibidoTotal: 0, tipoVisual: o.visual ?? 'zombi',
    recibirDanio(info) {
      if (!this.vivo) return 0;
      let c = info.cantidad;
      if (this.material === 'metal' && (info.tipo === 'bala')) c *= 0.3; // blindaje
      this.vida -= c; this.recibidoTotal += c; this.flash = 1; this.ultimoGolpe = juego.tiempo.ahora;
      if (info.empuje) this.cuerpo?.impulso(info.dirX * info.empuje * 70, info.dirZ * info.empuje * 70);
      numero(this, c, info);
      if (this.vida <= 0) this.morir();
      return c;
    },
    aturdir(s) { this.aturdido = s; }, ralentizar() {}, incendiar() { this.flash = Math.max(this.flash, 0.6); }, aplicarEstado() {}, curar(n) { if (this.vivo) this.vida = Math.min(this.vidaMax, this.vida + n); },
    morir() {
      this.vivo = false; this.muerte = 0; fisica.eliminarCuerpo(this.cuerpo);
      if (this.explosivo) combate.explotar({ x: this.pos.x, z: this.pos.z, radio: 4.2, danio: 180, tipo: 'explosivo', atacante: null, empuje: 14 });
      setTimeout(() => this.reaparecer(), 3200);
    },
    reaparecer() {
      this.vivo = true; this.vida = this.vidaMax; this.muerte = 0; this.mesh.rotation.x = 0; this.mesh.visible = true;
      this.pos.set(this.casa.x, 0, this.casa.z);
      this.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x: this.casa.x, z: this.casa.z, radio: this.radio, masa: this.explosivo ? 40 : 70, capa: this.capa, amortiguacion: 6, datos: this });
    },
  };
  e.capa = e.bando === 'jugadores' ? CAPA.JUGADOR : e.bando === 'neutral' ? CAPA.PROP : CAPA.ZOMBI;
  e.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x, z, radio: e.radio, masa: o.explosivo ? 40 : 70, capa: e.capa, amortiguacion: 6, datos: e });
  const g = new THREE.Group();
  if (o.visual === 'barril') {
    const m = new THREE.MeshStandardMaterial({ color: 0xa8321f, roughness: 0.6, metalness: 0.5 }); e.mats = [m];
    const b = new THREE.Mesh(geoBarril, m); b.position.y = 0.48; b.castShadow = true; g.add(b);
    for (const y of [0.2, 0.75]) { const t = new THREE.Mesh(geoBanda, matMetalBase); t.rotation.x = Math.PI / 2; t.position.y = y; g.add(t); }
  } else if (e.material === 'metal') {
    const m = matMetalBase.clone(); e.mats = [m];
    const c = new THREE.Mesh(geoMetal, m); c.position.y = 0.78; c.castShadow = true; g.add(c);
    const h = new THREE.Mesh(geoCabeza, m); h.position.y = 1.7; h.scale.setScalar(1.3); g.add(h);
  } else {
    const col = e.bando === 'jugadores' ? 0x4a78d0 : 0x7d8f66;
    const m = matCarne(col); e.mats = [m];
    const c = new THREE.Mesh(geoCuerpo, m); c.position.y = 0.88; c.castShadow = true; g.add(c);
    const h = new THREE.Mesh(geoCabeza, matCarne(e.bando === 'jugadores' ? 0xd4b08a : 0x93a37c)); h.position.y = 1.62; e.mats.push(h.material); g.add(h);
  }
  g.position.set(x, 0, z); escena.add(g); e.mesh = g;
  dianas.push(e);
  return e;
}

function numero(ent, cantidad, info) {
  const p = juego.render.proyectar({ x: ent.pos.x, y: 2.2, z: ent.pos.z });
  if (!p.visible) return;
  const d = document.createElement('div'); d.className = 'num';
  d.textContent = Math.round(cantidad);
  d.style.color = info.critico ? '#ffd24a' : info.tipo === 'fuego' ? '#ff9a50' : info.tipo === 'veneno' ? '#a6e05a' : '#fff';
  d.style.fontSize = info.critico ? '22px' : '15px';
  d.style.left = (p.x - 8 + (Math.random() - 0.5) * 24) + 'px'; d.style.top = p.y + 'px';
  document.body.appendChild(d);
  requestAnimationFrame(() => { d.style.transform = 'translateY(-34px)'; d.style.opacity = '0'; });
  setTimeout(() => d.remove(), 700);
}

const muros = [];
function crearMuro(x, z, hx, hz, bloqueaBalas = true) {
  const c = fisica.cajaEstatica(x, z, hx, hz, 0, { bloqueaBalas });
  const m = new THREE.Mesh(new THREE.BoxGeometry(hx * 2, 2.4, hz * 2), new THREE.MeshStandardMaterial({ color: 0x8a7b66, roughness: 0.9 }));
  m.position.set(x, 1.2, z); m.castShadow = m.receiveShadow = true; escena.add(m);
  c.material = 'piedra'; muros.push({ c, m });
}

function montarEscenario() {
  for (const d of dianas) { fisica.eliminarCuerpo(d.cuerpo); d.mesh.removeFromParent(); }
  dianas.length = 0;
  for (const m of muros) { fisica.eliminarCuerpo(m.c); m.m.removeFromParent(); }
  muros.length = 0;
  // Carril central
  for (const f of [6, 10, 14]) { const p = mundoPos(0, f); crearDiana(p.x, p.z, { nombre: 'carril', vida: 600 }); }
  { const p = mundoPos(0, 18); crearDiana(p.x, p.z, { material: 'metal', vida: 900, nombre: 'acorazado', radio: 0.5 }); }
  { const p = mundoPos(0, 30); crearDiana(p.x, p.z, { vida: 600, nombre: 'lejano' }); }
  // Fila para perforación a la izquierda
  for (let i = 0; i < 5; i++) { const p = mundoPos(-3, 8 + i * 2.2); crearDiana(p.x, p.z, { nombre: 'fila', vida: 800 }); }
  // Horda
  let s = 7; const r = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  for (let i = 0; i < 14; i++) { const p = mundoPos(4 + (r() - 0.5) * 7, 19 + (r() - 0.2) * 8); crearDiana(p.x, p.z, { nombre: 'horda', vida: 500 }); }
  // Muro con objetivos detrás
  { const p = mundoPos(-9, 12); crearMuro(p.x, p.z, 2.6, 0.3); }
  for (const x of [-10.5, -7.5]) { const p = mundoPos(x, 15); crearDiana(p.x, p.z, { nombre: 'tras muro', vida: 500 }); }
  // Barriles
  for (let i = 0; i < 5; i++) { const p = mundoPos(8 + i * 2.1, 8 + (i % 2) * 2); crearDiana(p.x, p.z, { bando: 'neutral', visual: 'barril', radio: 0.45, vida: 60, explosivo: true, nombre: 'barril' }); }
  { const p = mundoPos(10, 12); crearDiana(p.x, p.z, { nombre: 'junto a barriles', vida: 700 }); }
  // Aliado (las balas lo atraviesan; las explosiones le hacen el 35 %)
  { const p = mundoPos(3.6, 7); crearDiana(p.x, p.z, { bando: 'jugadores', nombre: 'aliado', vida: 1000 }); }
}

// ───────────────────────── Tirador ─────────────────────────
const tirador = {
  bando: 'jugadores', material: 'carne', radio: 0.4, vivo: true, vida: 100, indice: 0, rot: Math.PI, mods: {},
  pos: new THREE.Vector3(0, 0, Z0), visual: { altura: 1.8, accion(n) { retroceso = n === 'disparar' ? 0.12 : n === 'cuerpo' ? 0.2 : retroceso; } },
  recibirDanio(info) { numero(this, info.cantidad, info); return info.cantidad; },
};
let retroceso = 0;
tirador.cuerpo = fisica.crearCuerpo({ forma: 'circulo', x: 0, z: Z0, radio: 0.4, masa: 0.0001, capa: CAPA.JUGADOR, datos: tirador, mascara: 0 });
tirador.cuerpo.datos = tirador;
const grupoTirador = new THREE.Group();
{
  const m = new THREE.MeshStandardMaterial({ color: 0x3f6fd0, roughness: 0.7 });
  const c = new THREE.Mesh(geoCuerpo, m); c.position.y = 0.88; c.castShadow = true; grupoTirador.add(c);
  const h = new THREE.Mesh(geoCabeza, matCarne(0xd4b08a)); h.position.y = 1.62; grupoTirador.add(h);
  grupoTirador.position.set(0, 0, Z0); escena.add(grupoTirador);
}
let modeloArma = null;
let inst = null, armaId = null;
let apretado = false, antes = false;
let cursor = { x: 0, z: Z0 - 10 };

function equipar(id) {
  const def = ARMAS[id]; if (!def) return;
  armaId = id; inst = combate.crearArma(id, tirador);
  if (modeloArma) modeloArma.removeFromParent();
  modeloArma = crearModeloArma(id); modeloArma.position.set(0.28, 1.05, 0.25); grupoTirador.add(modeloArma);
  actualizarPanel();
}
const bocaTirador = () => new THREE.Vector3(tirador.pos.x + Math.sin(tirador.rot) * 0.9, 1.1, tirador.pos.z + Math.cos(tirador.rot) * 0.9);

let proxLanzar = 0;
juego.registrar('pruebaTirador', {
  actualizar(dt) {
    // Giro hacia el cursor
    const dx = cursor.x - tirador.pos.x, dz = cursor.z - tirador.pos.z;
    if (Math.hypot(dx, dz) > 0.3 && !fijo) tirador.rot = Math.atan2(dx, dz);
    grupoTirador.rotation.y = tirador.rot;
    retroceso = Math.max(0, retroceso - dt);
    grupoTirador.position.set(tirador.pos.x - Math.sin(tirador.rot) * retroceso, 0, tirador.pos.z - Math.cos(tirador.rot) * retroceso);
    if (!inst) return;
    const def = inst.def;
    combate.actualizarArma(inst, dt, tirador);
    tirador.distApuntado = Math.hypot(dx, dz);
    if (def.comportamiento === 'arrojadiza') {
      if (apretado && juego.tiempo.ahora >= proxLanzar) { proxLanzar = juego.tiempo.ahora + 0.7; combate.lanzar(tirador, def.id, bocaTirador(), cursor); }
    } else {
      combate.gatillo(tirador, inst, bocaTirador(), tirador.rot, apretado, apretado && !antes);
    }
    antes = apretado;
  },
}, 20);
let fijo = false;

// Dianas: animación, retorno a casa, daño
juego.registrar('pruebaDianas', {
  actualizar(dt) {
    for (const d of dianas) {
      if (d.vivo) {
        d.pos.x = d.cuerpo.x; d.pos.z = d.cuerpo.z;
        // Vuelve despacio a su sitio cuando lleva un rato sin recibir golpes
        if (juego.tiempo.ahora - d.ultimoGolpe > 0.8 && !d.explosivo) {
          const hx = d.casa.x - d.pos.x, hz = d.casa.z - d.pos.z, l = Math.hypot(hx, hz);
          if (l > 0.05) { d.cuerpo.vx = (hx / l) * Math.min(2.2, l * 3); d.cuerpo.vz = (hz / l) * Math.min(2.2, l * 3); }
        }
        d.mesh.position.set(d.pos.x, 0, d.pos.z);
        const v = Math.hypot(d.cuerpo.vx, d.cuerpo.vz);
        d.mesh.rotation.x = Math.min(0.5, v * 0.05) * 0.0;
        d.flash = Math.max(0, d.flash - dt * 5);
        for (const m of d.mats) { m.emissive = m.emissive || new THREE.Color(); m.emissive.setRGB(d.flash * 1.2, d.flash * 0.35, d.flash * 0.1); }
        d.mesh.scale.set(1 + d.flash * 0.05, 1 - d.flash * 0.04, 1 + d.flash * 0.05);
      } else {
        d.muerte += dt;
        const t = Math.min(1, d.muerte / 0.35);
        d.mesh.rotation.x = -t * Math.PI / 2;
        d.mesh.visible = !(d.explosivo || d.muerte > 2.6 && Math.floor(d.muerte * 12) % 2 === 0);
      }
    }
  },
}, 25);

// ───────────────────────── Depuración propia ─────────────────────────
const MAX_V = 12000;
const depGeo = new THREE.BufferGeometry();
const depPos = new Float32Array(MAX_V * 3), depCol = new Float32Array(MAX_V * 3);
depGeo.setAttribute('position', new THREE.BufferAttribute(depPos, 3).setUsage(THREE.DynamicDrawUsage));
depGeo.setAttribute('color', new THREE.BufferAttribute(depCol, 3).setUsage(THREE.DynamicDrawUsage));
const dep = new THREE.LineSegments(depGeo, new THREE.LineBasicMaterial({ vertexColors: true, depthTest: false, transparent: true }));
dep.renderOrder = 999; dep.frustumCulled = false; escena.add(dep);
let nv = 0;
const colorHex = (h) => [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255];
function seg(x1, y1, z1, x2, y2, z2, col) {
  if (nv + 2 > MAX_V) return;
  const c = colorHex(col);
  depPos.set([x1, y1, z1, x2, y2, z2], nv * 3); depCol.set([...c, ...c], nv * 3); nv += 2;
}
function circulo(x, z, r, col, y = 0.1, n = 28) { for (let i = 0; i < n; i++) { const a1 = i / n * 6.283, a2 = (i + 1) / n * 6.283; seg(x + Math.cos(a1) * r, y, z + Math.sin(a1) * r, x + Math.cos(a2) * r, y, z + Math.sin(a2) * r, col); } }
const rayos = [], explosiones = [];
let ultimaBoca = null;
juego.eventos.en('arma:disparo', (d) => { ultimaBoca = { x: d.origen.x, y: d.origen.y ?? 1.1, z: d.origen.z, t: juego.tiempo.real }; });
juego.eventos.en('impacto', (d) => { if (ultimaBoca && juego.tiempo.real - ultimaBoca.t < 0.05) rayos.push({ x1: ultimaBoca.x, y1: ultimaBoca.y, z1: ultimaBoca.z, x2: d.x, y2: d.y, z2: d.z, t: juego.tiempo.real, col: d.objetivo ? 0xff5a3c : 0xffd24a }); });
juego.eventos.en('explosion', (d) => explosiones.push({ x: d.x, z: d.z, r: d.radio, t: juego.tiempo.real }));
juego.registrar('pruebaDepurar', {
  siempre: true,
  actualizar() {
    dep.visible = depurar;
    if (!depurar) return;
    nv = 0;
    const ahora = juego.tiempo.real;
    for (const d of dianas) if (d.vivo) circulo(d.pos.x, d.pos.z, d.radio, d.bando === 'jugadores' ? 0x5aa0ff : d.bando === 'neutral' ? 0xffaa40 : 0x6aff6a);
    for (const m of muros) { const c = m.c; const cs = Math.cos(c.rot), sn = Math.sin(c.rot); const pts = [[-c.hx, -c.hz], [c.hx, -c.hz], [c.hx, c.hz], [-c.hx, c.hz]].map(([lx, lz]) => [c.x + lx * cs + lz * sn, c.z - lx * sn + lz * cs]); for (let i = 0; i < 4; i++) seg(pts[i][0], 0.1, pts[i][1], pts[(i + 1) % 4][0], 0.1, pts[(i + 1) % 4][1], 0xffffff); }
    for (const e of explosiones) { const f = (ahora - e.t) / 0.8; if (f > 1) continue; circulo(e.x, e.z, e.r, 0xff5030, 0.12, 48); circulo(e.x, e.z, e.r * 0.25, 0xffcc40, 0.12, 24); }
    for (let i = explosiones.length - 1; i >= 0; i--) if (ahora - explosiones[i].t > 0.8) explosiones.splice(i, 1);
    for (const z of combate.zonas) circulo(z.x, z.z, z.radio, { fuego: 0xff8a2a, gas: 0x9bd64a, acido: 0x9dff3a, curacion: 0x62e0a1, gravedad: 0xb070ff }[z.tipo] ?? 0xffffff, 0.14, 40);
    for (const p of combate.proyectiles) { seg(p.x - 0.3, p.y, p.z, p.x + 0.3, p.y, p.z, 0xff40ff); seg(p.x, p.y, p.z - 0.3, p.x, p.y, p.z + 0.3, 0xff40ff); seg(p.x, p.y, p.z, p.x, 0.05, p.z, 0x884488); }
    for (let i = rayos.length - 1; i >= 0; i--) { const r = rayos[i]; if (ahora - r.t > 0.25) { rayos.splice(i, 1); continue; } seg(r.x1, r.y1, r.z1, r.x2, r.y2, r.z2, r.col); }
    // Línea de puntería con el alcance del arma y el cono de las especiales
    if (inst) {
      const def = inst.def, al = def.alcance ?? 20, o = bocaTirador();
      seg(o.x, 0.12, o.z, o.x + Math.sin(tirador.rot) * al, 0.12, o.z + Math.cos(tirador.rot) * al, 0x40c0ff);
      const cono = def.cono ?? (def.arco ?? (def.perdigones ? def.dispersion : 0));
      if (cono) for (const s of [-1, 1]) { const a = tirador.rot + s * cono * Math.PI / 360; seg(o.x, 0.12, o.z, o.x + Math.sin(a) * al, 0.12, o.z + Math.cos(a) * al, 0x2080ff); }
    }
    depGeo.setDrawRange(0, nv); depGeo.attributes.position.needsUpdate = true; depGeo.attributes.color.needsUpdate = true;
  },
}, 98);

// ───────────────────────── Panel y entrada ─────────────────────────
const panel = document.getElementById('panel'), hud = document.getElementById('hud');
const ARQ = ['fusil', 'pistola', 'precision', 'pesada', 'ligera', 'herramienta', 'arrojadiza', 'cuerpo'];
const NOMBRE_ARQ = { fusil: 'Fusil', pistola: 'Pistola', precision: 'Precisión', pesada: 'Pesada', ligera: 'Ligera', herramienta: 'Herramienta', arrojadiza: 'Arrojadiza', cuerpo: 'Cuerpo a cuerpo' };
const ANIOS = ['1800', '1850', '1900', '1950', '2000', '2050'];
let era = juego.opciones.era ?? 0;
function armaDe(arq, e = era) { return LISTA_ARMAS.find((w) => w.era === e && w.arquetipo === arq); }
function construirPanel() {
  panel.innerHTML = '<b>Combate · banco de pruebas</b><br>Ratón apunta · clic dispara · R recarga · F golpe · G granada<br>';
  for (let e = 0; e < 6; e++) { const b = document.createElement('button'); b.textContent = ANIOS[e]; b.className = e === era ? 'on' : ''; b.onclick = () => { era = e; construirPanel(); equipar(armaDe(ARMAS[armaId]?.arquetipo ?? 'fusil').id); }; panel.appendChild(b); }
  panel.appendChild(document.createElement('br'));
  for (const q of ARQ) { const w = armaDe(q); const b = document.createElement('button'); b.textContent = NOMBRE_ARQ[q]; b.className = w.id === armaId ? 'on' : ''; b.onclick = () => equipar(w.id); panel.appendChild(b); }
  panel.appendChild(document.createElement('br'));
  const extra = (t, f) => { const b = document.createElement('button'); b.textContent = t; b.onclick = f; panel.appendChild(b); };
  extra('Reiniciar dianas', () => { montarEscenario(); combate.limpiar(); });
  extra('Depurar', () => { depurar = !depurar; });
  extra('Recargar', () => inst && combate.recargar(inst, tirador));
  const d = document.createElement('div'); d.id = 'desc'; d.style.marginTop = '5px'; panel.appendChild(d);
}
function actualizarPanel() {
  construirPanel();
  const def = ARMAS[armaId]; if (!def) return;
  const d = document.getElementById('desc');
  d.innerHTML = `<b>${def.nombre}</b> · ${def.arquetipo} · ${def.comportamiento}<br>${def.descripcion ?? ''}`;
}
juego.registrar('pruebaHud', {
  siempre: true,
  actualizar() {
    if (!inst) return;
    const def = inst.def;
    const reserva = inst.reserva < 0 ? '∞' : inst.reserva;
    const rec = inst.recargando ? ` · recargando ${Math.round(inst.progresoRecarga * 100)} %` : '';
    hud.textContent = def.cargador ? `${def.nombre} · ${inst.municion}/${inst.cargador} · reserva ${reserva}${rec}` : `${def.nombre}`;
  },
}, 96);

const plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), rc = new THREE.Raycaster(), ndc = new THREE.Vector2();
addEventListener('pointermove', (ev) => {
  ndc.set((ev.clientX / innerWidth) * 2 - 1, -(ev.clientY / innerHeight) * 2 + 1);
  rc.setFromCamera(ndc, juego.render.camara);
  const p = new THREE.Vector3();
  if (rc.ray.intersectPlane(plano, p)) { cursor.x = p.x; cursor.z = p.z; }
});
addEventListener('pointerdown', (ev) => { if (ev.target.closest?.('#panel')) return; apretado = true; });
addEventListener('pointerup', () => { apretado = false; });
addEventListener('keydown', (ev) => {
  if (ev.key === 'r' || ev.key === 'R') inst && combate.recargar(inst, tirador);
  if (ev.key === 'f' || ev.key === 'F') combate.golpear(tirador, armaDe('cuerpo').id, bocaTirador(), tirador.rot);
  if (ev.key === 'g' || ev.key === 'G') combate.lanzar(tirador, armaDe('arrojadiza').id, bocaTirador(), cursor);
  if (ev.key === 'F2') depurar = !depurar;
});

// ───────────────────────── API para capturas ─────────────────────────
let manual = false;
window.prueba = {
  juego, combate, tirador, dianas, get inst() { return inst; },
  equipar(id) { equipar(id); },
  apuntar(rot) { fijo = true; tirador.rot = rot; },
  apuntarA(x, z) { fijo = false; cursor.x = x; cursor.z = z; },
  /** Mantiene el gatillo `seg` s de simulación (modo manual) o hasta soltar (modo vivo). */
  disparar(seg = 0) { apretado = true; if (seg > 0) { this.avanzar(seg); apretado = false; } },
  soltar() { apretado = false; },
  lanzar(x, z) { cursor.x = x; cursor.z = z; combate.lanzar(tirador, inst?.def.comportamiento === 'arrojadiza' ? inst.def.id : armaDe('arrojadiza').id, bocaTirador(), { x, z }); },
  golpear() { return combate.golpear(tirador, inst?.def.comportamiento === 'cuerpo' ? inst.def.id : armaDe('cuerpo').id, bocaTirador(), tirador.rot); },
  reiniciar() { montarEscenario(); combate.limpiar(); },
  depurar(v = true) { depurar = v; },
  /** Congela el bucle vivo y avanza la simulación a mano (sin dibujar salvo el último cuadro). */
  manual(v = true) { manual = v; if (v) juego.detener(); },
  avanzar(seg, dt = 1 / 60) {
    const rend = juego.sistemas.render, orig = rend.actualizar;
    const n = Math.max(1, Math.round(seg / dt));
    for (let i = 0; i < n; i++) {
      if (i < n - 1 && manual) rend.actualizar = () => {};
      juego.avanzar(dt);
      rend.actualizar = orig;
    }
  },
  camara(x, y, z, tx, ty, tz) { a.mirar(x, y, z, tx, ty, tz); },
  cuenta: { eventos: {} },
};
for (const n of ['danio', 'explosion', 'arma:disparo', 'impacto']) juego.eventos.en(n, () => { window.prueba.cuenta.eventos[n] = (window.prueba.cuenta.eventos[n] ?? 0) + 1; });

montarEscenario();
equipar(opciones.arma && ARMAS[opciones.arma] ? opciones.arma : armaDe('fusil').id);
a.mirar(0, 25, 30, 0, 0, -3);
a.lista();
