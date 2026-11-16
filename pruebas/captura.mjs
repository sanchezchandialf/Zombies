// Captura de pantalla con Chromium sin cabeza (WebGL por software). Imprime los errores de consola de la página.
// Uso: node pruebas/captura.mjs <url> <salida.png> [--espera ms] [--ancho px] [--alto px] [--escala n]
//        [--eval "codigo JS a ejecutar en la página antes de capturar"] [--tras ms tras el eval]
//        [--teclas "w,w,Space"] [--clic "x,y"] [--serie n --intervalo ms]  (serie: salida-0.png, salida-1.png…)
// La página puede definir window.__lista = true para indicar que está preparada (se espera hasta 20 s).
import { createRequire } from 'node:module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');

const args = process.argv.slice(2);
const url = args[0], salida = args[1];
const op = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
if (!url || !salida) { console.error('uso: node pruebas/captura.mjs <url> <salida.png> [opciones]'); process.exit(1); }

const nav = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'],
});
const pag = await nav.newPage({
  viewport: { width: +op('ancho', 1600), height: +op('alto', 900) },
  deviceScaleFactor: +op('escala', 1),
});
const errores = [];
pag.on('console', (m) => { if (m.type() === 'error') errores.push('[consola] ' + m.text()); });
pag.on('pageerror', (e) => errores.push('[excepción] ' + (e.stack || e.message)));
await pag.goto(url, { waitUntil: 'load', timeout: 60000 });
if (op('clic')) { const [x, y] = op('clic').split(',').map(Number); await pag.mouse.click(x, y); }
await pag.waitForFunction('window.__lista === true', null, { timeout: 20000 }).catch(() => {});
await pag.waitForTimeout(+op('espera', 1500));
if (op('eval')) {
  try { const r = await pag.evaluate(op('eval')); if (r !== undefined) console.log('[eval]', JSON.stringify(r)); }
  catch (e) { errores.push('[eval] ' + e.message); }
  await pag.waitForTimeout(+op('tras', 500));
}
if (op('teclas')) for (const k of op('teclas').split(',')) { await pag.keyboard.press(k); await pag.waitForTimeout(80); }
const serie = +op('serie', 1);
for (let i = 0; i < serie; i++) {
  const ruta = serie > 1 ? salida.replace(/\.png$/, `-${i}.png`) : salida;
  await pag.screenshot({ path: ruta });
  console.log('captura →', ruta);
  if (i < serie - 1) await pag.waitForTimeout(+op('intervalo', 500));
}
if (errores.length) { console.log(`── ${errores.length} error(es) en la página ──`); for (const e of errores.slice(0, 25)) console.log(e); }
else console.log('sin errores de consola');
await nav.close();
