// Captura multi-paso para la página personajes-zombis (carga una vez, ejecuta varios eval y capturas).
// uso: node pruebas/pz-captura.mjs <url> <prefijo> [--ancho n --alto n] --pasos "evalA@@nombreA;;evalB@@nombreB"
import { createRequire } from 'node:module';
const require = createRequire('/opt/node-tools/node_modules/');
const { chromium } = require('playwright');
const args = process.argv.slice(2);
const url = args[0], pref = args[1];
const op = (n, d) => { const i = args.indexOf('--' + n); return i >= 0 ? args[i + 1] : d; };
const nav = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--enable-webgl', '--no-sandbox'] });
const pag = await nav.newPage({ viewport: { width: +op('ancho', 1280), height: +op('alto', 720) } });
pag.setDefaultTimeout(240000);
const errores = [];
pag.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errores.push('[' + m.type() + '] ' + m.text()); });
pag.on('pageerror', (e) => errores.push('[excepción] ' + (e.stack || e.message)));
await pag.goto(url, { waitUntil: 'load', timeout: 120000 });
await pag.waitForFunction('window.__lista === true', null, { timeout: 120000 }).catch(() => {});
await pag.waitForFunction('window.P', null, { timeout: 200000 }).catch(() => {});
await pag.waitForTimeout(+op('espera', 1500));
const pasos = (op('pasos', '@@base')).split(';;');
for (const p of pasos) {
  const [ev, nombre] = p.split('@@');
  if (ev.trim()) { try { const r = await pag.evaluate(ev); if (r !== undefined) console.log('[eval]', JSON.stringify(r)); } catch (e) { errores.push('[eval] ' + e.message); } await pag.waitForTimeout(+op('tras', 1200)); }
  const ruta = `${pref}-${nombre || 'x'}.png`;
  await pag.screenshot({ path: ruta, timeout: 240000 });
  console.log('captura →', ruta);
}
if (errores.length) { console.log(`── ${errores.length} aviso(s) ──`); for (const e of errores.slice(0, 20)) console.log(e.slice(0, 600)); } else console.log('sin errores de consola');
await nav.close();
