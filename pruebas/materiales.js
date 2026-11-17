// Muestrario de materiales (página autónoma: renderer propio, ACES, entorno de sala procedural).
// Parámetros: ?solo=nombre (primer plano) · ?grupo=suelos|muros|cubiertas|metales|otros · ?desde=0&hasta=12
//             ?calidad=alta|media|baja · ?mojado=0..1 · ?desgaste=0..1 · ?color=ff8800 · ?luz=azimut,elevación (grados)
//             ?cam=x,y,z,tx,ty,tz · ?t=segundos (fija el reloj de los materiales animados) · ?cols=6
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { materiales, uvMundo } from '../src/render/materiales/index.js';

const q = new URLSearchParams(location.search);
const info = document.getElementById('info');
const W = innerWidth, H = innerHeight;
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(W, H); renderer.setPixelRatio(1);
renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.0;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
document.body.appendChild(renderer.domElement);
const escena = new THREE.Scene();
escena.background = new THREE.Color(0x15181c);
const pm = new THREE.PMREMGenerator(renderer);
escena.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
escena.environmentIntensity = 0.55;

const [az, el] = (q.get('luz') || '35,22').split(',').map(Number);
const sol = new THREE.DirectionalLight(0xfff0dc, 3.2);
const ra = az * Math.PI / 180, re = el * Math.PI / 180;
sol.position.set(Math.cos(re) * Math.sin(ra) * 40, Math.sin(re) * 40, Math.cos(re) * Math.cos(ra) * 40);
sol.castShadow = true; sol.shadow.mapSize.set(1024, 1024);
Object.assign(sol.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 120 });
escena.add(sol);
const camara = new THREE.PerspectiveCamera(35, W / H, 0.1, 300);

if (q.get('calidad')) materiales.configurar({ calidad: q.get('calidad') });
const opc = {};
if (q.get('mojado')) opc.mojado = +q.get('mojado');
if (q.get('desgaste')) opc.desgaste = +q.get('desgaste');
if (q.get('color')) opc.color = parseInt(q.get('color'), 16);

const lista = materiales.lista();
const solo = q.get('solo');
let sel = lista;
if (q.get('grupo')) sel = sel.filter((m) => m.grupo === q.get('grupo'));
if (q.get('desde') || q.get('hasta')) sel = sel.slice(+(q.get('desde') || 0), +(q.get('hasta') || 999));
if (solo) sel = lista.filter((m) => m.nombre === solo);

function celda(nombre, x, z, tam = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const inf = materiales.info(nombre);
  const mat = materiales.obtener(nombre, opc);
  // losa con UV por proyección de caja (mundo): comprueba uvMundo
  const geoLosa = uvMundo(new THREE.BoxGeometry(2 * tam, 0.25 * tam, 2 * tam), inf.escala);
  const losa = new THREE.Mesh(geoLosa, mat); losa.position.set(0, 0.125 * tam, 1.3 * tam); losa.castShadow = losa.receiveShadow = true;
  g.add(losa);
  // esfera
  const geoE = new THREE.SphereGeometry(0.85 * tam, 64, 40);
  const uvs = geoE.attributes.uv; for (let i = 0; i < uvs.count; i++) uvs.setXY(i, uvs.getX(i) * 3.5 * tam / inf.escala * 2, uvs.getY(i) * 1.75 * tam / inf.escala * 2);
  const esf = new THREE.Mesh(geoE, mat); esf.position.set(0, 0.85 * tam, -0.75 * tam); esf.castShadow = esf.receiveShadow = true;
  g.add(esf);
  return g;
}

const raiz = new THREE.Group(); escena.add(raiz);
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), new THREE.MeshStandardMaterial({ color: 0x1a1d21, roughness: 1 }));
suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; suelo.position.y = -0.001; escena.add(suelo);

if (solo) {
  const nombre = solo;
  const inf = materiales.info(nombre);
  const mat = materiales.obtener(nombre, opc);
  // plano grande en el suelo, muro al fondo y esfera
  const S = 7;
  const plano = new THREE.Mesh(uvMundo(new THREE.BoxGeometry(S, 0.3, S), inf.escala), mat); plano.position.set(0, -0.15, 0); plano.receiveShadow = plano.castShadow = true; raiz.add(plano);
  const muro = new THREE.Mesh(uvMundo(new THREE.BoxGeometry(S, 3.4, 0.3), inf.escala), mat); muro.position.set(0, 1.7, -S / 2); muro.castShadow = muro.receiveShadow = true; raiz.add(muro);
  const geoE = new THREE.SphereGeometry(0.9, 64, 40);
  const u = geoE.attributes.uv; for (let i = 0; i < u.count; i++) u.setXY(i, u.getX(i) * 6 / inf.escala * 1.0, u.getY(i) * 3 / inf.escala);
  const esf = new THREE.Mesh(geoE, mat); esf.position.set(1.4, 0.9, 0.8); esf.castShadow = esf.receiveShadow = true; raiz.add(esf);
  const cam = (q.get('cam') || '0,2.5,4.8,0,0.5,-0.6').split(',').map(Number);
  camara.position.set(cam[0], cam[1], cam[2]); camara.lookAt(cam[3], cam[4], cam[5]);
  info.textContent = `${nombre} · ${inf.grupo} · mosaico ${inf.escala} m · ${inf.tam}px\n${inf.descripcion}`;
} else {
  const cols = +(q.get('cols') || Math.min(6, Math.ceil(Math.sqrt(sel.length * 1.4))));
  const sp = 2.9;
  const filas = Math.ceil(sel.length / cols);
  sel.forEach((m, i) => {
    const x = (i % cols - (cols - 1) / 2) * sp, z = (Math.floor(i / cols) - (filas - 1) / 2) * sp * 1.15;
    raiz.add(celda(m.nombre, x, z));
  });
  const w = cols * sp, d = filas * sp * 1.15;
  const dist = Math.max(w / (2 * Math.tan(17.5 * Math.PI / 180) * (W / H)), d / (2 * Math.tan(17.5 * Math.PI / 180))) * 1.02;
  const cam = (q.get('cam') || '').split(',').map(Number);
  if (cam.length === 6) { camara.position.set(cam[0], cam[1], cam[2]); camara.lookAt(cam[3], cam[4], cam[5]); }
  else { camara.position.set(0, dist * 0.88, dist * 0.62); camara.lookAt(0, 0.3, 0.1); }
  info.textContent = `${sel.length} materiales · ${sel.map((m) => m.nombre).join(' · ')}`;
}
if (q.get('t')) materiales.tiempo(+q.get('t'));
renderer.compile(escena, camara);
let n = 0;
// Render bajo demanda (el render por software es lento): 2 cuadros y se detiene, salvo con ?anim=1
function bucle() { renderer.render(escena, camara); n++; if (n === 2) window.__lista = true; if (n < 2 || q.get('anim')) setTimeout(bucle, 50); }
setTimeout(bucle, 50);
window.materiales = materiales; window.__renderer = renderer;
