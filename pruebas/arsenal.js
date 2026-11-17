// Página de prueba del Arsenal (src/armas). Vistas por parámetro de URL:
//   (nada)                  parrilla de las 48 armas por era (filas) y arquetipo (columnas), con nombre
//   ?fila=N                 solo la era N (0..5) en grande
//   ?arma=id                primer plano girando (?giro=0 lo detiene, ?ang=rad ángulo inicial, ?lado=1 desde el lado izquierdo)
//   ?juego=N                escala de juego: 8 figuras de 1,8 m con las armas de la era N, cámara a ~25 m (?rot=rad, ?dist=m)
//   ?torreta=N | ?emplazamiento=N      primer plano (?cabeza=rad gira la cabeza, ?canones=rad gira los cañones)
//   ?vista=torretas | emplazamientos   las seis de cada tipo en fila
//   ?vista=iconos           tira de iconos de las 48 armas
//   ?era=N&hora=H           atmósfera del arnés
import * as THREE from 'three';
import { crearArnes } from './arnes.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { crearModeloArma, crearModeloTorreta, crearModeloEmplazamiento, crearIconoArma } from '../src/armas/modelos.js';
import { ARMAS } from '../src/datos/armas.js';
import { ERAS, ARQUETIPOS } from '../src/datos/eras.js';

const q = new URLSearchParams(location.search);
const num = (k, d) => (q.has(k) ? Number(q.get(k)) : d);

function etiqueta(texto, tam = 0.16, color = '#f2e6c8') {
  const c = document.createElement('canvas'); c.width = 512; c.height = 64;
  const g = c.getContext('2d'); g.font = 'bold 30px Georgia, serif'; g.textAlign = 'center'; g.fillStyle = color; g.shadowColor = '#000'; g.shadowBlur = 6;
  g.fillText(texto, 256, 42);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
  s.scale.set(tam * 8, tam, 1);
  return s;
}

// Los modelos miran a +Z; en la parrilla se giran para que el cañón apunte a la derecha de la pantalla.
function expositor(id, x, y, z = 0) {
  const m = crearModeloArma(id);
  const g = new THREE.Group();
  m.rotation.y = Math.PI / 2 * (q.has('lado') ? -1 : 1);
  g.add(m);
  const caja = new THREE.Box3().setFromObject(m);
  const cx = (caja.min.x + caja.max.x) / 2;
  m.position.x -= cx; // centrado (solo para exponer)
  g.position.set(x, y, z);
  return { g, m };
}

function figura() {
  const g = new THREE.Group();
  const piel = new THREE.MeshStandardMaterial({ color: 0xc89a78, roughness: 0.8 });
  const ropa = new THREE.MeshStandardMaterial({ color: 0x4d5b45, roughness: 0.85 });
  const pant = new THREE.MeshStandardMaterial({ color: 0x3a3a40, roughness: 0.85 });
  const add = (geo, mat, x, y, z, rx = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, 0, rz); m.castShadow = true; g.add(m); return m; };
  add(new THREE.CapsuleGeometry(0.09, 0.78, 4, 8), pant, -0.1, 0.46, 0); add(new THREE.CapsuleGeometry(0.09, 0.78, 4, 8), pant, 0.1, 0.46, 0);
  add(new THREE.CapsuleGeometry(0.2, 0.42, 6, 10), ropa, 0, 1.2, 0).scale.set(1.15, 1, 0.8);
  add(new THREE.SphereGeometry(0.125, 14, 12), piel, 0, 1.68, 0.02);
  return g;
}
function brazo(g, de, a, mat) {
  const d = new THREE.Vector3(...a).sub(new THREE.Vector3(...de)), len = d.length();
  const codo = new THREE.Vector3(...de).addScaledVector(d, 0.5).add(new THREE.Vector3(0, -0.12, -0.06));
  for (const [p, r] of [[new THREE.Vector3(...de), codo], [codo, new THREE.Vector3(...a)]]) {
    const dd = r.clone().sub(p), l = dd.length();
    const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.055, l - 0.11, 4, 8), mat); m.castShadow = true;
    m.position.copy(p).addScaledVector(dd, 0.5); m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dd.normalize()); g.add(m);
  }
}
function soldado(id) {
  const f = figura();
  const ropa = new THREE.MeshStandardMaterial({ color: 0x4d5b45, roughness: 0.85 });
  const arma = crearModeloArma(id);
  const ud = arma.userData, pose = ud.pose;
  const mano = new THREE.Vector3(-0.2, 1.12, 0.32);
  if (pose === 'pistola') mano.set(-0.2, 1.3, 0.42);
  if (pose === 'cuerpo') mano.set(-0.28, 1.1, 0.32);
  if (pose === 'arrojadiza') mano.set(-0.3, 1.5, 0.3);
  arma.position.copy(mano);
  if (pose === 'cuerpo') arma.rotation.x = -0.5;
  f.add(arma);
  brazo(f, [-0.27, 1.45, 0], [mano.x, mano.y, mano.z], ropa);
  let izq = [0.2, 1.1, 0.3];
  if (ud.manoIzq) izq = [mano.x + ud.manoIzq.x, mano.y + ud.manoIzq.y, mano.z + ud.manoIzq.z];
  else if (pose === 'cuerpo' || pose === 'arrojadiza') izq = [0.2, 1.0, 0.1];
  brazo(f, [0.27, 1.45, 0], izq, ropa);
  return f;
}

const vista = q.get('vista');
// Visor ligero (por defecto): entorno de estudio + luz principal con sombras, sin posproceso → capturas rápidas por software.
// ?arnes=1 usa el arnés del juego (atmósfera real de la era y bloom) para juzgar emisivos y luz de juego.
async function visorLigero() {
  document.body.style.cssText = 'margin:0;background:#16181c;overflow:hidden';
  const r = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
  r.setPixelRatio(1); r.setSize(innerWidth, innerHeight);
  r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = num('exp', 1.0);
  document.body.appendChild(r.domElement);
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(num('fondo', 0x3a3f47));
  const pm = new THREE.PMREMGenerator(r);
  escena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture; escena.environmentIntensity = 0.9;
  const sol = new THREE.DirectionalLight(0xfff0dc, 3.2); sol.position.set(4, 8, 6); sol.castShadow = true;
  sol.shadow.mapSize.set(2048, 2048); Object.assign(sol.shadow.camera, { left: -8, right: 8, top: 8, bottom: -8, near: 1, far: 30 }); sol.shadow.bias = -0.0004;
  escena.add(sol);
  const rel = new THREE.DirectionalLight(0x9ab8ff, 1.2); rel.position.set(-5, 3, -4); escena.add(rel);
  const camara = new THREE.PerspectiveCamera(36, innerWidth / innerHeight, 0.05, 200);
  const fns = []; let activo = false;
  const dibujar = () => r.render(escena, camara);
  let t0 = performance.now();
  const bucle = () => { const t = performance.now(); const dt = Math.min(0.1, (t - t0) / 1000); t0 = t; for (const f of fns) f(dt); dibujar(); if (activo) requestAnimationFrame(bucle); };
  return {
    juego: { render: { escena, camara }, opciones: {} }, THREE,
    alCuadro(f) { fns.push(f); activo = true; },
    mirar(x, y, z, tx = 0, ty = 1, tz = 0) { camara.position.set(x, y, z); camara.lookAt(tx, ty, tz); },
    lista() { camara.updateProjectionMatrix(); bucle(); window.__lista = true; },
  };
}
const a = q.has('arnes') ? await crearArnes({ eraIdx: num('era', 0), hora: num('hora', 0.25), camara: { dist: 10, alto: 2, objetivo: [0, 1, 0] } }) : await visorLigero();
const esc = a.juego.render.escena;
window.arnes = a;
let giratorios = [];
let h = 0;

if (q.has('arma') && q.get('arma').includes(',')) {
  // varias armas normalizadas en una rejilla (comparar detalle): ?arma=a,b,c,d&cols=2
  const ids = q.get('arma').split(','), cols = num('cols', 2), L = 1.5, cw = L * 1.1, ch = num('alto', 0.75);
  ids.forEach((id, i) => {
    const m = crearModeloArma(id), caja = new THREE.Box3().setFromObject(m), c = caja.getCenter(new THREE.Vector3()), t = caja.getSize(new THREE.Vector3());
    const g = new THREE.Group(); m.position.sub(c); g.add(m); g.rotation.y = Math.PI / 2 * (q.has('lado') ? -1 : 1);
    const e = new THREE.Group(); e.add(g); e.scale.setScalar(Math.min(L / Math.max(t.z, t.x), (ch * 0.85) / t.y));
    e.position.set((i % cols - (cols - 1) / 2) * cw, -Math.floor(i / cols) * ch, 0); esc.add(e);
  });
  const rows = Math.ceil(ids.length / cols), cam = a.juego.render.camara;
  cam.aspect = innerWidth / innerHeight; cam.fov = 30; cam.updateProjectionMatrix();
  const tf = Math.tan(cam.fov * Math.PI / 360), Wt = cols * cw, Ht = rows * ch;
  const dist = Math.max(Ht / 2 / tf, Wt / 2 / (tf * cam.aspect)) * 1.02;
  a.mirar(0, -(rows - 1) * ch / 2, dist, 0, -(rows - 1) * ch / 2, 0);
} else if (q.has('arma')) {
  const id = q.get('arma');
  const m = crearModeloArma(id);
  const pivote = new THREE.Group(); pivote.add(m); esc.add(pivote);
  const caja = new THREE.Box3().setFromObject(m), c = caja.getCenter(new THREE.Vector3()), tam = caja.getSize(new THREE.Vector3());
  m.position.sub(c); pivote.position.set(0, 1.2, 0);
  pivote.rotation.y = num('ang', Math.PI / 2);
  const cam = a.juego.render.camara, L = Math.max(tam.x, tam.z) * 0.62 * num('zoom', 0.52);
  const dist = L / Math.tan((cam.fov * Math.PI / 180) / 2 * Math.min(1, cam.aspect)) * 1.0;
  a.mirar(0, 1.2 + dist * 0.18, dist, 0, 1.2, 0);
  if (num('giro', 1)) a.alCuadro((dt) => { pivote.rotation.y += dt * 0.5; });
  if (q.has('ejes')) { esc.add(new THREE.AxesHelper(0.3).translateY(1.2)); }
  console.log(id, JSON.stringify({ boca: m.userData.boca, manoIzq: m.userData.manoIzq, doble: m.userData.doble, pose: m.userData.pose, long: m.userData.longitud }));
} else if (q.has('juego')) {
  const e = num('juego', 0), rot = num('rot', Math.PI / 2);
  const ids = ARQUETIPOS.map((k) => ERAS[e].armas[k]);
  ids.forEach((id, i) => {
    const s = soldado(id); s.position.set((i - 3.5) * 2.6, 0, 0); s.rotation.y = rot; esc.add(s);
  });
  const d = num('dist', 25);
  a.mirar(0, d * 0.62, d * 0.74, 0, 0.8, 0);
  a.juego.render.camara.fov = num('fov', 28); a.juego.render.camara.updateProjectionMatrix();
} else if (q.has('torreta') || q.has('emplazamiento')) {
  const t = q.has('torreta');
  const i = num(t ? 'torreta' : 'emplazamiento', 0);
  const m = t ? crearModeloTorreta(i) : crearModeloEmplazamiento(i);
  esc.add(m);
  if (q.has('cabeza')) m.userData.cabeza.rotation.y = num('cabeza', 0);
  if (q.has('canones') && m.userData.canones) m.userData.canones.rotation.z = num('canones', 0);
  const R = num('dist', 3.6);
  const ang = num('ang', 0.6);
  a.mirar(Math.sin(ang) * R, R * 0.5, Math.cos(ang) * R, 0, m.userData.altura * 0.5, 0);
  if (m.userData.asiento) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.06), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
    s.position.copy(m.userData.asiento); esc.add(s);
  }
  if (q.has('boca')) {
    const s = new THREE.Mesh(new THREE.SphereGeometry(0.04), new THREE.MeshBasicMaterial({ color: 0x00ff00 }));
    s.position.copy(m.userData.boca); m.userData.cabeza.add(s);
  }
  if (num('giro', 0)) a.alCuadro((dt) => { m.rotation.y += dt * 0.5; });
  window.__m = m;
} else if (vista === 'torretas' || vista === 'emplazamientos') {
  for (let i = 0; i < 6; i++) {
    const m = vista === 'torretas' ? crearModeloTorreta(i) : crearModeloEmplazamiento(i);
    m.position.set((i - 2.5) * 3.2, 0, 0); m.rotation.y = num('ang', 0.5); esc.add(m);
    const e = etiqueta(ERAS[i].nombre + ' · ' + (vista === 'torretas' ? ERAS[i].torreta : ERAS[i].emplazamiento), 0.2); e.position.set((i - 2.5) * 3.2, -0.2, 1.4); esc.add(e);
  }
  a.mirar(0, 4.4, 15, 0, 0.9, 0);
  a.juego.render.camara.fov = 32; a.juego.render.camara.updateProjectionMatrix();
} else if (vista === 'iconos') {
  document.body.style.background = '#14161a';
  const cont = document.createElement('div');
  cont.style.cssText = 'position:fixed;inset:0;z-index:5;background:#14161a;padding:10px;display:grid;grid-template-columns:repeat(8,1fr);gap:6px;font:12px Georgia;color:#cdbf9e;overflow:auto';
  for (let e = 0; e < 6; e++) for (const k of ARQUETIPOS) {
    const id = ERAS[e].armas[k], cel = document.createElement('div');
    cel.style.cssText = 'text-align:center;background:#1d2026;padding:4px;border-radius:4px';
    const c = crearIconoArma(id, num('tam', 190)); c.style.cssText = 'display:block;margin:auto;max-width:100%';
    cel.append(c, document.createTextNode(ARMAS[id].nombre));
    cont.append(cel);
  }
  document.body.append(cont);
} else {
  // parrilla
  const fila = q.has('fila') ? num('fila', 0) : null;
  const filas = fila === null ? [0, 1, 2, 3, 4, 5] : [fila];
  const dx = fila === null ? 2.25 : 2.35, dy = fila === null ? 1.05 : 1.3;
  const cols = fila === null ? 8 : 4;
  const filasN = fila === null ? 6 : 2;
  filas.forEach((e, fi) => {
    ARQUETIPOS.forEach((k, ci) => {
      const id = ERAS[e].armas[k];
      let cx, cy;
      if (fila === null) { cx = (ci - 3.5) * dx; cy = (5 - fi) * dy; }
      else { cx = ((ci % cols) - 1.5) * dx; cy = (1 - Math.floor(ci / cols)) * dy; }
      const { g } = expositor(id, cx, cy);
      esc.add(g);
      const t = etiqueta(ARMAS[id].nombre, fila === null ? 0.17 : 0.17); t.position.set(cx, cy - dy * 0.36, 0.6); esc.add(t);
    });
  });
  const W = cols * dx + 0.6, H = filasN * dy + 0.4, cyc = fila === null ? 2.5 * dy : 0;
  const cam = a.juego.render.camara; cam.fov = 36; cam.aspect = innerWidth / innerHeight; cam.updateProjectionMatrix();
  const tf = Math.tan(cam.fov * Math.PI / 360);
  const dist = Math.max(H / 2 / tf, W / 2 / (tf * cam.aspect)) * 1.04;
  const fondo = new THREE.Mesh(new THREE.PlaneGeometry(60, 40), new THREE.MeshStandardMaterial({ color: 0x23262c, roughness: 0.95 }));
  fondo.position.set(0, cyc, -1.4); esc.add(fondo);
  a.mirar(0, cyc + 0.3, dist, 0, cyc + 0.3, 0);
}
a.lista();
