globalThis.document = { createElement: () => ({ width: 0, height: 0, getContext: () => new Proxy({}, { get: () => () => {}, set: () => true }) }) };
const m = await import('../src/armas/index.js');
const { ARMAS } = await import('../src/datos/armas.js');
let n = 0, tri = 0;
for (const id of Object.keys(ARMAS)) {
  try { const g = m.crearModeloArma(id); let t = 0; g.traverse((o) => { if (o.geometry) t += o.geometry.attributes.position.count / 3; }); tri += t; n++; if (!g.userData.boca) console.log('SIN BOCA', id); if (t > 60000) console.log('PESADO', id, Math.round(t)); }
  catch (e) { console.log('ERROR', id, e.message); }
}
console.log('armas', n, 'tris', Math.round(tri));
for (let i = 0; i < 6; i++) for (const f of ['crearModeloTorreta', 'crearModeloEmplazamiento']) {
  try { const g = m[f](i); let t = 0; g.traverse((o) => { if (o.geometry) t += o.geometry.attributes.position.count / 3; }); console.log(f, i, Math.round(t), g.userData.cabeza?.position.y); } catch (e) { console.log('ERROR', f, i, e.stack.split('\n').slice(0,3).join(' | ')); }
}
