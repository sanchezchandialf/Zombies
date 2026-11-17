import { montar, correr } from './zombis.test.mjs';
import { JugadorFalso, pilares } from './falsos.js';
const { juego, sis } = montar({ limites: 45 });
pilares(juego, 14, 5);
const js = [new JugadorFalso(juego, -4, 0, { masa: 1e6 }), new JugadorFalso(juego, 6, 3, { masa: 1e6 })];
js[0].meta = { x: 25, z: -20 }; js[0].vel = 4;
const clases = ['caminante','caminante','caminante','corredor','acorazado','apestado','escupidor','mole','aullador','caminante'];
for (let i = 0; i < 150; i++) { const a = (i/150)*6.28*3, r = 18 + (i%14)*1.6; sis.generar(clases[i%clases.length], Math.sin(a)*r, Math.cos(a)*r, { emerger: false, vida: 1e6 }); }
correr(juego, 6, 1/60);
const nav = sis.navegacion;
const tn = [], tt = [];
const orig = nav.actualizar;
let acc = 0;
nav.actualizar = (dt) => { const t0 = performance.now(); orig(dt); acc = performance.now() - t0; };
for (let i = 0; i < 600; i++) {
  const t0 = performance.now(); sis.actualizar(1/60); const t1 = performance.now();
  juego.fisica.paso(1/60); sis.posFisica(1/60); juego.tiempo.ahora += 1/60;
  for (const q of juego.jugadores) { q.actualizar(1/60); q.posFisica(); }
  tn.push(acc); tt.push(t1 - t0);
}
const q = (a, p) => [...a].sort((x, y) => x - y)[Math.floor(a.length * p)].toFixed(2);
console.log('total med', q(tt, .5), 'p95', q(tt, .95), 'p99', q(tt, .99), 'max', q(tt, .999));
console.log('nav   med', q(tn, .5), 'p95', q(tn, .95), 'p99', q(tn, .99), 'max', q(tn, .999));
tt.forEach((t, i) => { if (t > 2.5) console.log('pico', i, t.toFixed(2), 'nav', tn[i].toFixed(2)); });
