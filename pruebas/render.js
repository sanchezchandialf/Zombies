// Prueba del módulo Render: escena de demostración con suelo, volúmenes PBR, emisivos, figuras a escala humana y un charco.
// URL: ?era=N&hora=H&calidad=alta|media|baja|ultra&cam=orbita|juego|alta|cerca&clima=auto|ninguno|lluvia…&sinclima=1
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { crearArnes } from './arnes.js';

const a = await crearArnes({ eraIdx: 0, hora: 0.5, suelo: false, fx: false });
const R = a.juego.render, escena = R.escena, op = a.juego.opciones;
R.establecerAmbiente(op.era ?? 0, { inmediato: true, clima: op.clima ?? 'auto' });
R.establecerHora(op.hora ?? 0.5, true);

// ── texturas procedurales
function lienzo(n, fn) { const c = document.createElement('canvas'); c.width = c.height = n; fn(c.getContext('2d'), n); return c; }
let sem = 7; const rnd = () => ((sem = (sem * 16807) % 2147483647) / 2147483647);
const adoquines = (color) => lienzo(512, (g, n) => {
  g.fillStyle = color ? '#6d6a62' : '#9a9a9a'; g.fillRect(0, 0, n, n);
  const f = 8, t = n / f;
  for (let y = 0; y < f; y++) for (let x = 0; x < f; x++) {
    const v = rnd(), off = (y % 2) * t / 2;
    if (color) { const l = 78 + v * 38; g.fillStyle = `rgb(${l + rnd() * 8},${l - 2 + rnd() * 6},${l - 8 + rnd() * 6})`; }
    else { const l = 130 + v * 110; g.fillStyle = `rgb(${l},${l},${l})`; }
    g.beginPath(); g.roundRect(x * t + off + 3, y * t + 3, t - 6, t - 6, 9); g.fill();
    if (color) { for (let k = 0; k < 70; k++) { g.fillStyle = `rgba(${rnd() < .5 ? 20 : 150},${rnd() < .5 ? 20 : 150},${rnd() < .5 ? 20 : 150},.07)`; g.fillRect(x * t + off + rnd() * t, y * t + rnd() * t, 2 + rnd() * 6, 2 + rnd() * 4); } }
  }
  for (let k = 0; k < 900; k++) { g.fillStyle = `rgba(0,0,0,${rnd() * .08})`; g.fillRect(rnd() * n, rnd() * n, 1 + rnd() * 3, 1 + rnd() * 3); }
});
const texColor = new THREE.CanvasTexture(adoquines(true)), texRug = new THREE.CanvasTexture(adoquines(false));
for (const t of [texColor, texRug]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(14, 14); t.anisotropy = 8; }
texColor.colorSpace = THREE.SRGBColorSpace;

const sombra = (m) => { m.castShadow = m.receiveShadow = true; return m; };
const M = (o) => new THREE.MeshStandardMaterial(o);

// ── suelo
const suelo = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), M({ map: texColor, roughnessMap: texRug, roughness: 0.95, metalness: 0, color: 0xffffff }));
suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; escena.add(suelo);

// ── charco reflectante
const charco = new THREE.Mesh(new THREE.CircleGeometry(3.2, 48), new THREE.MeshPhysicalMaterial({ color: 0x10141a, roughness: 0.02, metalness: 0.0, ior: 1.9, specularIntensity: 1, clearcoat: 1, clearcoatRoughness: 0.02, envMapIntensity: 3.5 }));
charco.rotation.x = -Math.PI / 2; charco.position.set(-3.5, 0.012, 3.5); charco.scale.set(1.5, 1, 0.9); escena.add(charco);
const charco2 = charco.clone(); charco2.position.set(7, 0.012, 7); charco2.scale.set(0.8, 1, 0.7); escena.add(charco2);

// ── volúmenes PBR
const edificio = sombra(new THREE.Mesh(new RoundedBoxGeometry(9, 7, 6, 4, 0.18), M({ color: 0x8a6f5a, roughness: 0.85 })));
edificio.position.set(-12, 3.5, -8); escena.add(edificio);
const tejado = sombra(new THREE.Mesh(new RoundedBoxGeometry(9.8, 0.7, 6.8, 3, 0.15), M({ color: 0x3a3430, roughness: 0.7 })));
tejado.position.set(-12, 7.3, -8); escena.add(tejado);
for (let i = 0; i < 3; i++) { // ventanas emisivas
  const v = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.7, 0.2, 3, 0.05), M({ color: 0x111111, emissive: 0xffb050, emissiveIntensity: 2.4, roughness: 0.4 }));
  v.position.set(-15 + i * 3, 3.6, -4.95); escena.add(v);
}
const muro = sombra(new THREE.Mesh(new RoundedBoxGeometry(14, 1.6, 0.8, 3, 0.08), M({ color: 0x77706a, roughness: 0.92 })));
muro.position.set(6, 0.8, -3); escena.add(muro);
const metales = [[0xc9ccd0, 1, 0.18], [0xd9a441, 1, 0.35], [0x2a5db0, 0.2, 0.25], [0xb02a2a, 0, 0.6], [0x2e7d3a, 0, 0.9]];
metales.forEach(([c, m, r], i) => {
  const e = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.7, 48, 32), M({ color: c, metalness: m, roughness: r })));
  e.position.set(-3 + i * 1.9, 0.7, 10); escena.add(e);
});
for (let i = 0; i < 5; i++) { // barriles
  const b = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 1.05, 28), M({ color: [0x8b5a2b, 0x6a2a2a, 0x3b5a3a][i % 3], roughness: 0.6, metalness: i % 2 ? 0.6 : 0.1 })));
  b.position.set(11 + (i % 3) * 1.0, 0.525, 3 + Math.floor(i / 3) * 1.1); escena.add(b);
}
for (let i = 0; i < 7; i++) { // cajas
  const c = sombra(new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.07), M({ color: 0x9a7a4a, roughness: 0.8 })));
  c.position.set(2 + (i % 3) * 1.05, 0.5 + Math.floor(i / 5) * 1.0, -8 + Math.floor(i / 3) * 1.1); c.rotation.y = rnd() * 0.5; escena.add(c);
}

// ── farolas y neones (luces puntuales de la reserva)
const farolas = [];
function farola(x, z, color, int) {
  const poste = sombra(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, 3.4, 12), M({ color: 0x1a1a1c, roughness: 0.5, metalness: 0.8 })));
  poste.position.set(x, 1.7, z); escena.add(poste);
  const bulbo = new THREE.Mesh(new THREE.SphereGeometry(0.2, 20, 14), M({ color: 0x000000, emissive: color, emissiveIntensity: 5, roughness: 0.4 }));
  bulbo.position.set(x, 3.5, z); escena.add(bulbo);
  farolas.push(R.luzPuntual({ x, y: 3.3, z, color, intensidad: int, distancia: 13 }));
}
farola(-7, 1, 0xffa347, 22); farola(8, -1, 0xffc27a, 22); farola(1, 6, 0xff5ab4, 26); farola(-1, -5, 0x40e0ff, 26);
const neonA = new THREE.Mesh(new RoundedBoxGeometry(5, 0.9, 0.12, 3, 0.04), M({ color: 0x000000, emissive: 0xff2d95, emissiveIntensity: 4 })); neonA.position.set(-12, 5.6, -4.8); escena.add(neonA);
const neonB = new THREE.Mesh(new RoundedBoxGeometry(0.9, 3.2, 0.12, 3, 0.04), M({ color: 0x000000, emissive: 0x28e6ff, emissiveIntensity: 4 })); neonB.position.set(-7.2, 2.4, -4.8); escena.add(neonB);

// ── figuras a escala humana
function figura(color, acento, p) {
  const g = new THREE.Group();
  const ropa = M({ color, roughness: 0.8 }), piel = M({ color: 0xc9a58a, roughness: 0.7 }), ac = M({ color: acento, roughness: 0.4, emissive: acento, emissiveIntensity: 0.4 });
  const torso = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.26, 0.5, 6, 16), ropa)); torso.position.y = 1.2; torso.scale.set(1.15, 1, 0.8);
  const cab = sombra(new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 16), piel)); cab.position.y = 1.78;
  const pi = [-1, 1].map((s) => { const l = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.62, 4, 10), ropa)); l.position.set(s * 0.12, 0.45, 0); return l; });
  const br = [-1, 1].map((s) => { const l = sombra(new THREE.Mesh(new THREE.CapsuleGeometry(0.08, 0.55, 4, 10), ropa)); l.position.set(s * 0.36, 1.2, 0.05); l.rotation.z = s * 0.12; return l; });
  const banda = sombra(new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.04, 8, 24), ac)); banda.position.y = 1.45; banda.rotation.x = Math.PI / 2; banda.scale.set(1.15, 0.8, 1);
  g.add(torso, cab, ...pi, ...br, banda); g.position.set(...p); return g;
}
const figuras = [
  figura(0x3a4a5a, 0xff4040, [0, 0, 0]), figura(0x5a3a3a, 0x40a0ff, [1.6, 0, 1]), figura(0x445544, 0xffd040, [-1.7, 0, 0.8]),
];
figuras.forEach((f) => escena.add(f));
// horda de siluetas (zombis simplificados) a lo lejos
const hordaGeo = new THREE.CapsuleGeometry(0.26, 1.2, 4, 10);
const horda = new THREE.InstancedMesh(hordaGeo, M({ color: 0x5a6a52, roughness: 0.9 }), 70);
horda.castShadow = horda.receiveShadow = true;
const mt = new THREE.Matrix4();
for (let i = 0; i < 70; i++) { mt.compose(new THREE.Vector3(-8 + rnd() * 22, 0.95, -14 + rnd() * 5 + (i % 3)), new THREE.Quaternion().setFromEuler(new THREE.Euler(0.18 * (rnd() - 0.5), rnd() * 6, 0)), new THREE.Vector3(1, 0.9 + rnd() * 0.2, 1)); horda.setMatrixAt(i, mt); }
escena.add(horda);

const centro = { pos: new THREE.Vector3(0, 0, 0) };
const modo = op.cam ?? 'juego';
if (modo === 'orbita') { /* órbita libre del arnés */ }
else {
  a.camaraJuego(true);
  R.seguir([centro]);
  if (modo === 'alta') R.zoom(1, 0.1);
}
if (modo === 'cerca') { a.camaraJuego(false); a.mirar(5, 2.3, 7, 0, 1.2, 0); }
if (modo === 'bajo') { a.camaraJuego(false); a.mirar(9, 1.6, 12, 0, 1.6, 0); }
if (modo === 'cielo') { a.camaraJuego(false); a.mirar(0, 1.8, 20, 0, 14, -30); }
if (op.menu) R.camaraMenu(true);

a.alCuadro((dt) => {
  const t = performance.now() / 1000;
  figuras.forEach((f, i) => { f.rotation.y = Math.sin(t * 0.5 + i) * 0.5; f.position.y = Math.abs(Math.sin(t * 1.5 + i)) * 0.02; });
  farolas[0].intensidad = 20 + Math.sin(t * 13) * 2 + Math.sin(t * 5.1) * 2;
  if (op.mover) { centro.pos.x = Math.sin(t * 0.4) * 14; centro.pos.z = Math.cos(t * 0.3) * 8; }
});
window.arnes = a; window.R = R; window.escena = escena; window.THREE = THREE;
a.lista();
