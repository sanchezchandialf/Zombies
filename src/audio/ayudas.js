// Primitivas de síntesis WebAudio compartidas por efectos, ambientes y música.
// Todas reciben `c = { ctx, dest, rev }` y un tiempo absoluto `t` del contexto (en línea o fuera de línea).
// Los nodos son de vida corta: cada fuente se detiene sola al acabar su envolvente.

export const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

const cacheRuido = new WeakMap();
const cacheCurvas = new Map();

/** Búfer de ruido determinista y compartido por contexto. col: 'b' blanco · 'r' rosa · 'm' marrón. */
export function bufRuido(ctx, col = 'b') {
  let m = cacheRuido.get(ctx);
  if (!m) { m = {}; cacheRuido.set(ctx, m); }
  if (m[col]) return m[col];
  const n = Math.floor(ctx.sampleRate * 2);
  const b = ctx.createBuffer(1, n, ctx.sampleRate);
  const d = b.getChannelData(0);
  let seed = 22695477;
  const r = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2147483648 - 1; };
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0, ult = 0, pico = 0;
  for (let i = 0; i < n; i++) {
    const w = r();
    let v;
    if (col === 'r') {
      b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
      b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
      v = b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362; b6 = w * 0.115926;
    } else if (col === 'm') { ult = (ult + 0.02 * w) / 1.02; v = ult * 3.5; }
    else v = w;
    d[i] = v; if (Math.abs(v) > pico) pico = Math.abs(v);
  }
  const k = 1 / (pico || 1);
  // empalme circular sin clic: el final se funde hacia el principio
  const f = 512;
  for (let i = 0; i < f; i++) { const a = i / f; d[n - f + i] = d[n - f + i] * (1 - a) + d[i] * a; }
  m[col] = b;
  return b;
}

/** Curva de saturación suave (tanh normalizada). */
export function curvaSat(k) {
  const clave = Math.round(k * 10);
  let c = cacheCurvas.get(clave);
  if (c) return c;
  const n = 1024; c = new Float32Array(n);
  const kk = Math.max(0.1, k);
  const norm = Math.tanh(kk);
  for (let i = 0; i < n; i++) { const x = (i / (n - 1)) * 2 - 1; c[i] = Math.tanh(kk * x) / norm; }
  cacheCurvas.set(clave, c);
  return c;
}

/** Envolvente sin clics sobre un AudioParam. Devuelve el instante final. */
export function aplicarEnv(param, t, o, dur) {
  const a = Math.max(0.002, o.a ?? 0.003), g = Math.max(0.0002, o.g ?? 0.5);
  param.setValueAtTime(0.0001, t);
  param.linearRampToValueAtTime(g, t + a);
  if (o.s === undefined) {
    const f = t + Math.max(dur, a + 0.01);
    param.exponentialRampToValueAtTime(0.0001, f);
    return f;
  }
  const d = o.d ?? Math.min(0.2, dur * 0.4);
  const s = Math.max(0.0002, g * o.s);
  param.exponentialRampToValueAtTime(s, t + a + d);
  const tf = t + Math.max(dur, a + d + 0.005);
  param.setValueAtTime(s, tf);
  const r = o.r ?? 0.06;
  param.exponentialRampToValueAtTime(0.0001, tf + r);
  return tf + r;
}

/** Cadena común: [saturación] → [filtro con barrido] → [filtro 2] → envolvente → [panorama] → destino (+ envío a reverb). */
export function cadena(c, fuente, t, dur, o = {}) {
  const ctx = c.ctx;
  let n = fuente;
  if (o.sat) { const w = ctx.createWaveShaper(); w.curve = curvaSat(o.sat); n.connect(w); n = w; }
  for (const F of [o.f, o.f2]) {
    if (!F) continue;
    const fl = ctx.createBiquadFilter();
    fl.type = F.t || 'lowpass'; fl.Q.value = F.q ?? 0.7;
    fl.frequency.setValueAtTime(Math.max(20, F.a), t);
    if (F.b !== undefined) fl.frequency.exponentialRampToValueAtTime(Math.max(20, F.b), t + (F.d ?? dur));
    if (F.gain !== undefined) fl.gain.value = F.gain;
    n.connect(fl); n = fl;
  }
  const g = ctx.createGain();
  const fin = aplicarEnv(g.gain, t, o, dur);
  n.connect(g); n = g;
  if (o.pan) { const p = ctx.createStereoPanner(); p.pan.value = Math.max(-1, Math.min(1, o.pan)); n.connect(p); n = p; }
  n.connect(o.dest || c.dest);
  if (c.rev && (o.rev ?? 0) > 0) { const s = ctx.createGain(); s.gain.value = o.rev; n.connect(s); s.connect(c.rev); }
  return { fin, salida: n };
}

/** Oscilador (o pila de osciladores en unísono) con barrido de frecuencia, vibrato y FM opcionales. */
export function osc(c, tipo, f0, t, dur, o = {}) {
  const ctx = c.ctx;
  const n = o.n ?? 1, sp = o.sp ?? 12;
  const mezcla = ctx.createGain(); mezcla.gain.value = 1 / Math.sqrt(n);
  const fuentes = [];
  for (let i = 0; i < n; i++) {
    const s = ctx.createOscillator(); s.type = tipo;
    s.frequency.setValueAtTime(f0, t);
    if (o.f1 !== undefined && o.f1 !== f0) {
      const tf = t + (o.fd ?? dur);
      if (o.lin) s.frequency.linearRampToValueAtTime(o.f1, tf); else s.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1), tf);
    }
    if (n > 1) s.detune.value = (i / (n - 1) - 0.5) * 2 * sp; else if (o.det) s.detune.value = o.det;
    s.connect(mezcla); fuentes.push(s);
  }
  const extra = [];
  if (o.vib) { // [Hz, cents, retardo s]
    const l = ctx.createOscillator(); l.frequency.value = o.vib[0];
    const lg = ctx.createGain(); lg.gain.setValueAtTime(0, t); lg.gain.linearRampToValueAtTime(o.vib[1], t + (o.vib[2] ?? 0.15));
    l.connect(lg); for (const s of fuentes) lg.connect(s.detune);
    extra.push(l);
  }
  if (o.fm) { // { r: razón, i0: índice inicial (múltiplo de f0), i1 }
    const m = ctx.createOscillator(); m.frequency.setValueAtTime(f0 * o.fm.r, t);
    if (o.f1 !== undefined && o.f1 !== f0) m.frequency.exponentialRampToValueAtTime(Math.max(1, o.f1 * o.fm.r), t + (o.fd ?? dur));
    const mg = ctx.createGain();
    mg.gain.setValueAtTime(f0 * o.fm.i0, t);
    mg.gain.exponentialRampToValueAtTime(Math.max(1, f0 * (o.fm.i1 ?? 0.1)), t + dur);
    m.connect(mg); for (const s of fuentes) mg.connect(s.frequency);
    extra.push(m);
  }
  const { fin, salida } = cadena(c, mezcla, t, dur, o);
  const stop = fin + 0.04;
  for (const s of fuentes.concat(extra)) { s.start(t); s.stop(stop); }
  return { fin, salida };
}

/** Ruido filtrado. col: 'b' | 'r' | 'm'. */
export function ruido(c, t, dur, o = {}) {
  const ctx = c.ctx;
  const s = ctx.createBufferSource();
  s.buffer = bufRuido(ctx, o.col || 'b'); s.loop = true;
  if (o.rate) s.playbackRate.value = o.rate;
  const { fin, salida } = cadena(c, s, t, dur, o);
  s.start(t, (o.off ?? Math.random() * 1.2));
  s.stop(fin + 0.04);
  return { fin, salida };
}

/** Voz con formantes: fuente (sierra) → varios pasabanda en paralelo → envolvente. */
export function formantes(c, t, dur, f0, f1, formantesLista, o = {}) {
  const ctx = c.ctx;
  const mezcla = ctx.createGain(); mezcla.gain.value = 1;
  const s = ctx.createOscillator(); s.type = o.tipo || 'sawtooth';
  s.frequency.setValueAtTime(f0, t);
  s.frequency.exponentialRampToValueAtTime(Math.max(10, f1), t + dur);
  const extra = [];
  if (o.vib) {
    const l = ctx.createOscillator(); l.frequency.value = o.vib[0];
    const lg = ctx.createGain(); lg.gain.value = o.vib[1]; l.connect(lg); lg.connect(s.detune); extra.push(l);
  }
  const bruta = ctx.createGain(); bruta.gain.value = 1; s.connect(bruta);
  // garganta rasposa: modulación de amplitud rápida
  let fuente = bruta;
  if (o.rasp) {
    const am = ctx.createGain(); am.gain.value = 1 - o.rasp / 2;
    const l = ctx.createOscillator(); l.frequency.value = o.raspHz ?? 28;
    const lg = ctx.createGain(); lg.gain.value = o.rasp / 2; l.connect(lg); lg.connect(am.gain);
    bruta.connect(am); fuente = am; extra.push(l);
  }
  let ns = null;
  if (o.aire) { // ruido de aliento
    ns = ctx.createBufferSource(); ns.buffer = bufRuido(ctx, 'r'); ns.loop = true;
    const ng = ctx.createGain(); ng.gain.value = o.aire; ns.connect(ng); ng.connect(bruta);
  }
  formantesLista.forEach(([fa, q, gn, fb], i) => {
    const b = ctx.createBiquadFilter(); b.type = 'bandpass'; b.Q.value = q;
    b.frequency.setValueAtTime(fa, t);
    if (fb) b.frequency.linearRampToValueAtTime(fb, t + dur);
    const g = ctx.createGain(); g.gain.value = gn;
    fuente.connect(b); b.connect(g); g.connect(mezcla);
  });
  const { fin } = cadena(c, mezcla, t, dur, o);
  const stop = fin + 0.04;
  s.start(t); s.stop(stop); if (ns) { ns.start(t, Math.random()); ns.stop(stop); }
  for (const e of extra) { e.start(t); e.stop(stop); }
  return { fin };
}

/** Reverb por convolución con impulso generado (ruido estéreo decreciente y oscurecido). */
export function impulsoReverb(ctx, seg = 2.4, oscuridad = 0.6) {
  const n = Math.floor(ctx.sampleRate * seg);
  const b = ctx.createBuffer(2, n, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = b.getChannelData(ch);
    let seed = 1234567 + ch * 7919, lp = 0;
    for (let i = 0; i < n; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const w = seed / 2147483648 - 1;
      const x = i / n;
      const k = 0.15 + oscuridad * x * 0.8; // cada vez más oscuro
      lp += (w - lp) * (1 - k);
      const pre = i < ctx.sampleRate * 0.012 ? i / (ctx.sampleRate * 0.012) : 1;
      d[i] = lp * Math.pow(1 - x, 2.6) * Math.exp(-x * 3.2) * pre;
    }
  }
  return b;
}

/** Cadena maestra: efectos/música/ambiente → maestro → compresor → limitador → saturación suave → salida. */
export function crearBuses(ctx, destino, opciones = {}) {
  const gan = (v) => { const g = ctx.createGain(); g.gain.value = v; return g; };
  const maestro = gan(opciones.maestro ?? 0.85);
  const musica = gan(opciones.musica ?? 0.6);
  const efectos = gan(opciones.efectos ?? 0.9);
  const ambiente = gan(0.5);
  const rev = gan(1); // entrada de la reverb (envíos)
  const conv = ctx.createConvolver(); conv.buffer = impulsoReverb(ctx, opciones.reverbSeg ?? 2.4);
  const retorno = gan(opciones.reverb ?? 0.55);
  rev.connect(conv); conv.connect(retorno);
  const filtroMusica = ctx.createBiquadFilter(); filtroMusica.type = 'lowpass'; filtroMusica.frequency.value = 20000; filtroMusica.Q.value = 0.5;
  musica.connect(filtroMusica);
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -14; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = 0.004; comp.release.value = 0.22;
  const lim = ctx.createDynamicsCompressor();
  lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.001; lim.release.value = 0.08;
  const suave = ctx.createWaveShaper(); suave.curve = curvaSat(0.9);
  const salida = gan(0.92);
  efectos.connect(maestro); ambiente.connect(maestro); filtroMusica.connect(maestro); retorno.connect(maestro);
  maestro.connect(comp); comp.connect(lim); lim.connect(suave); suave.connect(salida); salida.connect(destino || ctx.destination);
  return { maestro, musica, efectos, ambiente, rev, retorno, filtroMusica, comp, lim };
}
