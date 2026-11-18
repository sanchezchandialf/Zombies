// Sonidos continuos: lanzallamas, mecha, motores de vehículos y ambientes por era.
// Cada entrada: BUCLES[nombre] = (c, o) → inst, con c = { ctx, dest, rev } (dest = salida ya posicionada)
//   inst = { ajustar({ volumen, tono }), tick(t, dt), parar() }
import { bufRuido, curvaSat, osc, ruido } from './ayudas.js';
import { EFECTOS } from './sintesis.js';

export const BUCLES = {};

/** Base de bucle: ganancia de salida, fuentes continuas y detención con fundido sin clics. */
function lazo(c, vol = 1) {
  const ctx = c.ctx;
  const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(c.dest);
  out.gain.setTargetAtTime(vol, ctx.currentTime, 0.12);
  const fuentes = [];
  let nivel = vol;
  const inst = {
    ctx, out, c: { ctx, dest: out, rev: c.rev }, tono: 1, vivo: true,
    fuentes,
    nodo(n) { return n; },
    ruido(col = 'r') { const s = ctx.createBufferSource(); s.buffer = bufRuido(ctx, col); s.loop = true; s.start(0, Math.random() * 1.5); fuentes.push(s); return s; },
    osc(tipo, f) { const s = ctx.createOscillator(); s.type = tipo; s.frequency.value = f; s.start(); fuentes.push(s); return s; },
    gan(v) { const g = ctx.createGain(); g.gain.value = v; return g; },
    filtro(tipo, f, q = 0.7) { const b = ctx.createBiquadFilter(); b.type = tipo; b.frequency.value = f; b.Q.value = q; return b; },
    sat(k) { const w = ctx.createWaveShaper(); w.curve = curvaSat(k); return w; },
    lfo(f, prof, destino) { const l = inst.osc('sine', f); const g = inst.gan(prof); l.connect(g); g.connect(destino); return l; },
    evento(nombre, t, p = 1, vol = 1) {
      const e = EFECTOS[nombre]; if (!e) return;
      if (vol === 1) { e.f(inst.c, t, { p, r: Math.random() }); return; }
      const g = ctx.createGain(); g.gain.value = vol; g.connect(out);
      e.f({ ctx, dest: g, rev: c.rev }, t, { p, r: Math.random() });
    },
    ajustar(p = {}) {
      if (p.volumen !== undefined) { nivel = p.volumen; out.gain.setTargetAtTime(Math.max(0.0001, p.volumen), ctx.currentTime, 0.08); }
      if (p.tono !== undefined) { inst.tono = p.tono; inst.alTono?.(p.tono, ctx.currentTime); }
    },
    parar() {
      if (!inst.vivo) return; inst.vivo = false;
      const t = ctx.currentTime;
      out.gain.cancelScheduledValues(t); out.gain.setTargetAtTime(0.0001, t, 0.07);
      for (const s of fuentes) { try { s.stop(t + 0.45); } catch { /* ya parada */ } }
      setTimeout(() => { try { out.disconnect(); } catch { /* ok */ } }, 700);
    },
  };
  return inst;
}
// programa un evento periódico: llama a f(t) cuando toca
function periodico(inst, cada, f) {
  let prox = 0;
  const viejo = inst.tick;
  inst.tick = (t, dt) => {
    viejo?.(t, dt);
    if (prox === 0) prox = t + 0.05;
    let n = 0;
    while (prox < t + 0.12 && n++ < 6) { const sig = f(Math.max(prox, t)); prox += typeof sig === 'number' ? sig : (typeof cada === 'function' ? cada() : cada); }
  };
}
const az = (a, b) => a + Math.random() * (b - a);

// ───────────────────────────── armas ─────────────────────────────
BUCLES.lanzallamas = (c, o) => {
  const L = lazo(c, o.volumen ?? 1);
  const r = L.ruido('r'), f1 = L.filtro('bandpass', 900, 0.6), g1 = L.gan(0.4);
  r.connect(f1); f1.connect(g1); g1.connect(L.out);
  L.lfo(7, 350, f1.frequency);
  const m = L.ruido('m'), f2 = L.filtro('lowpass', 420), g2 = L.gan(0.55);
  m.connect(f2); f2.connect(g2); g2.connect(L.out);
  const s = L.ruido('b'), f3 = L.filtro('highpass', 4500), g3 = L.gan(0.05);
  s.connect(f3); f3.connect(g3); g3.connect(L.out);
  periodico(L, () => az(0.03, 0.12), (t) => { ruido(L.c, t, 0.03, { f: { t: 'bandpass', a: az(1500, 5000), q: 3 }, g: az(0.05, 0.14), a: 0.001 }); });
  L.alTono = (k) => { f1.frequency.setTargetAtTime(900 * k, L.ctx.currentTime, 0.1); };
  return L;
};
BUCLES.mecha = (c, o) => {
  const L = lazo(c, o.volumen ?? 0.7);
  const r = L.ruido('b'), f = L.filtro('highpass', 4200, 0.8), am = L.gan(0.0), g = L.gan(0.3);
  am.gain.value = 0.5; L.lfo(23, 0.5, am.gain);
  r.connect(f); f.connect(am); am.connect(g); g.connect(L.out);
  const b = L.osc('sawtooth', 2600); const bg = L.gan(0.015); b.connect(bg); bg.connect(L.out); L.lfo(6, 700, b.frequency); // chisporroteo agudo
  periodico(L, () => az(0.04, 0.2), (t) => { ruido(L.c, t, 0.025, { f: { t: 'bandpass', a: az(2500, 6500), q: 3 }, g: az(0.08, 0.2), a: 0.001 }); });
  L.alTono = (k) => { b.frequency.setTargetAtTime(2600 * k, L.ctx.currentTime, 0.1); };
  return L;
};

// ───────────────────────────── motores ─────────────────────────────
BUCLES.motor_caballo = (c, o) => {
  const L = lazo(c, o.volumen ?? 0.9);
  const r = L.ruido('r'), f = L.filtro('bandpass', 3200, 1), g = L.gan(0.018); r.connect(f); f.connect(g); g.connect(L.out); // arneses
  let fase = 0;
  periodico(L, 0.2, (t) => {
    const k = L.tono, per = 0.46 / Math.max(0.3, k);         // un ciclo de galope
    [0, 0.1, 0.2, 0.34].forEach((d, i) => {
      const tt = t + d / Math.max(0.5, k);
      const f0 = [200, 170, 150, 230][i], v = [0.7, 0.55, 0.9, 0.6][i];
      ruido(L.c, tt, 0.07, { f: { t: 'bandpass', a: az(900, 1300), q: 1.4 }, g: 0.3 * v, a: 0.001 });
      osc(L.c, 'sine', f0, tt, 0.09, { f1: f0 * 0.5, g: 0.42 * v, a: 0.001 });
      osc(L.c, 'triangle', 480, tt, 0.05, { f1: 300, g: 0.07 * v, a: 0.001 });
    });
    fase++;
    return per;
  });
  return L;
};
BUCLES.motor_locomovil = (c, o) => {
  const L = lazo(c, o.volumen ?? 0.9);
  const r = L.ruido('b'), f = L.filtro('highpass', 3500), g = L.gan(0.03); r.connect(f); f.connect(g); g.connect(L.out);   // siseo de vapor
  const d = L.osc('sawtooth', 30), fd = L.filtro('lowpass', 150), gd = L.gan(0.25); d.connect(fd); fd.connect(gd); gd.connect(L.out); // caldera
  L.alTono = (k) => { d.frequency.setTargetAtTime(28 * k, L.ctx.currentTime, 0.2); g.gain.setTargetAtTime(0.02 + 0.02 * k, L.ctx.currentTime, 0.2); };
  periodico(L, 0.2, (t) => {
    const k = Math.max(0.4, L.tono), per = 0.36 / k;
    ruido(L.c, t, 0.2, { col: 'r', f: { t: 'bandpass', a: 800, b: 300, q: 0.8 }, g: 0.35, a: 0.01 });
    osc(L.c, 'sine', 75, t, 0.14, { f1: 38, g: 0.5, a: 0.003 });
    ruido(L.c, t + per * 0.5, 0.12, { col: 'r', f: { t: 'lowpass', a: 700 }, g: 0.18, a: 0.01 });
    return per;
  });
  return L;
};
BUCLES.motor_autoblindado = (c, o) => {
  const L = lazo(c, o.volumen ?? 0.9);
  const a = L.osc('sawtooth', 42), b = L.osc('sawtooth', 42.6), s = L.sat(3), f = L.filtro('lowpass', 420, 0.8), g = L.gan(0.3), tr = L.gan(0.7);
  a.connect(s); b.connect(s); s.connect(f); f.connect(tr); tr.connect(g); g.connect(L.out);
  L.lfo(11, 0.3, tr.gain);
  const r = L.ruido('m'), fr = L.filtro('lowpass', 260), gr = L.gan(0.3); r.connect(fr); fr.connect(gr); gr.connect(L.out);
  L.alTono = (k, t) => { a.frequency.setTargetAtTime(42 * k, t, 0.2); b.frequency.setTargetAtTime(42.6 * k, t, 0.2); f.frequency.setTargetAtTime(420 + 300 * k, t, 0.2); };
  periodico(L, 0.2, (t) => { const k = Math.max(0.5, L.tono); ruido(L.c, t, 0.05, { f: { t: 'bandpass', a: az(1200, 1800), q: 2 }, g: 0.1, a: 0.001 }); return 0.22 / k + Math.random() * 0.05; }); // cadenas
  return L;
};
BUCLES.motor_muscle_car = (c, o) => {
  const L = lazo(c, o.volumen ?? 0.9);
  const a = L.osc('sawtooth', 48), b = L.osc('square', 24), mx = L.gan(1), s = L.sat(3.5), f = L.filtro('lowpass', 520, 1.1), tr = L.gan(0.75), g = L.gan(0.26);
  a.connect(mx); b.connect(mx); mx.connect(s); s.connect(f); f.connect(tr); tr.connect(g); g.connect(L.out);
  const lf = L.lfo(24, 0.25, tr.gain);
  const r = L.ruido('m'), fr = L.filtro('lowpass', 500), gr = L.gan(0.16); r.connect(fr); fr.connect(gr); gr.connect(L.out);
  L.alTono = (k, t) => { a.frequency.setTargetAtTime(48 * k, t, 0.15); b.frequency.setTargetAtTime(24 * k, t, 0.15); lf.frequency.setTargetAtTime(24 * k, t, 0.15); f.frequency.setTargetAtTime(520 + 900 * k, t, 0.15); };
  return L;
};
BUCLES.motor_blindado_tactico = (c, o) => {
  const L = lazo(c, o.volumen ?? 0.9);
  const a = L.osc('sawtooth', 34), b = L.osc('sawtooth', 68.4), mx = L.gan(1), s = L.sat(5), f = L.filtro('lowpass', 520), tr = L.gan(0.7), g = L.gan(0.26);
  a.connect(mx); b.connect(L.gan(0.4)); b.connect(mx); mx.connect(s); s.connect(f); f.connect(tr); tr.connect(g); g.connect(L.out);
  const lf = L.lfo(17, 0.3, tr.gain);
  const w = L.osc('sine', 1100), wg = L.gan(0.012); w.connect(wg); wg.connect(L.out);          // turbo
  L.alTono = (k, t) => { a.frequency.setTargetAtTime(34 * k, t, 0.2); b.frequency.setTargetAtTime(68.4 * k, t, 0.2); lf.frequency.setTargetAtTime(17 * k, t, 0.2); w.frequency.setTargetAtTime(1100 * k, t, 0.2); wg.gain.setTargetAtTime(0.008 + 0.01 * k, t, 0.2); f.frequency.setTargetAtTime(520 + 400 * k, t, 0.2); };
  return L;
};
BUCLES.motor_aerodeslizador = (c, o) => {
  const L = lazo(c, o.volumen ?? 0.85);
  const r = L.ruido('r'), f = L.filtro('bandpass', 900, 0.6), g = L.gan(0.3); r.connect(f); f.connect(g); g.connect(L.out);
  const h1 = L.osc('sine', 118), h2 = L.osc('sine', 177.3), hg = L.gan(0.08); h1.connect(hg); h2.connect(hg); hg.connect(L.out);
  const w = L.osc('sine', 1700), wg = L.gan(0.012); w.connect(wg); wg.connect(L.out);
  const s = L.ruido('b'), fs = L.filtro('highpass', 3000), gs = L.gan(0.04); s.connect(fs); fs.connect(gs); gs.connect(L.out);
  L.lfo(0.4, 120, f.frequency);
  L.alTono = (k, t) => { h1.frequency.setTargetAtTime(118 * k, t, 0.25); h2.frequency.setTargetAtTime(177.3 * k, t, 0.25); w.frequency.setTargetAtTime(1700 * k, t, 0.25); f.frequency.setTargetAtTime(900 * k, t, 0.25); gs.gain.setTargetAtTime(0.03 * k, t, 0.25); };
  return L;
};

// ───────────────────────────── ambientes ─────────────────────────────
function viento(L, f, q, vol, gustoHz = 0.13, prof = 0.4) {
  const r = L.ruido('r'), b = L.filtro('bandpass', f, q), g = L.gan(vol);
  r.connect(b); b.connect(g); g.connect(L.out);
  L.lfo(gustoHz, f * prof, b.frequency); L.lfo(gustoHz * 0.7, vol * 0.6, g.gain);
  return { b, g };
}
function lluvia(L, vol, f = 4200) {
  const r = L.ruido('b'), b = L.filtro('bandpass', f, 0.5), h = L.filtro('highpass', 1200), g = L.gan(vol);
  r.connect(b); b.connect(h); h.connect(g); g.connect(L.out);
  const r2 = L.ruido('r'), b2 = L.filtro('lowpass', 900), g2 = L.gan(vol * 0.8); r2.connect(b2); b2.connect(g2); g2.connect(L.out);
}
function grillos(L, f, vol, rapido) {
  const o = L.osc('sine', f), g = L.gan(0), tot = L.gan(vol);
  g.gain.value = 0.5; L.lfo(rapido, 0.5, g.gain);
  const m = L.osc('sine', 0.35); const mg = L.gan(0.5); m.connect(mg); // modulador lento de frases
  const frase = L.gan(0.5); mg.connect(frase.gain); L.lfo(0.15, 0.3, frase.gain);
  o.connect(g); g.connect(frase); frase.connect(tot); tot.connect(L.out);
}
function zumbidoRed(L, vol) {
  const a = L.osc('sawtooth', 60), s = L.sat(3), f = L.filtro('lowpass', 900), g = L.gan(vol);
  a.connect(s); s.connect(f); f.connect(g); g.connect(L.out);
  const b = L.osc('sine', 120), bg = L.gan(vol * 0.6); b.connect(bg); bg.connect(L.out);
  L.lfo(0.7, vol * 0.3, g.gain);
}

BUCLES.ambiente_0 = (c, o) => {
  const L = lazo(c, o.volumen ?? 1);
  viento(L, 320, 0.7, 0.2, 0.11); grillos(L, 4300, 0.012, 5.2); grillos(L, 4800, 0.008, 6.1);
  periodico(L, () => az(9, 20), (t) => { // lechuza lejana
    [[0, 420, 360], [0.55, 400, 330]].forEach(([d, f0, f1]) => osc(L.c, 'sine', f0, t + d, 0.4, { f1, g: 0.06, a: 0.04, s: 0.7, r: 0.15, vib: [5, 15, 0.1], rev: 0.9 }));
  });
  return L;
};
BUCLES.ambiente_1 = (c, o) => {
  const L = lazo(c, o.volumen ?? 1);
  viento(L, 450, 0.6, 0.26, 0.09, 0.5);
  const r = L.ruido('b'), h = L.filtro('highpass', 3200), g = L.gan(0.03); r.connect(h); h.connect(g); g.connect(L.out); L.lfo(0.1, 0.02, g.gain); // arena
  periodico(L, () => az(12, 26), (t) => { // molino chirriante
    osc(L.c, 'sine', 900, t, 1.4, { f1: 700, g: 0.025, a: 0.2, s: 0.7, r: 0.4, vib: [3.5, 90, 0.1], f: { t: 'bandpass', a: 1000, q: 3 }, rev: 0.7 });
  });
  periodico(L, () => az(14, 30), (t) => { ruido(L.c, t, 2.5, { col: 'r', f: { t: 'bandpass', a: 300, b: 900, q: 0.7, d: 1.2 }, g: 0.16, a: 1.0, s: 0.7, r: 1.0 }); }); // ráfaga
  return L;
};
BUCLES.ambiente_2 = (c, o) => {
  const L = lazo(c, o.volumen ?? 1);
  lluvia(L, 0.11, 4000); viento(L, 200, 0.7, 0.1, 0.07);
  periodico(L, () => az(5, 12), (t) => { // cañoneo lejano
    const k = az(0.8, 1.3);
    ruido(L.c, t, 1.8, { col: 'm', f: { t: 'lowpass', a: 500 * k, b: 60, q: 0.7 }, g: 0.35, a: 0.01, rev: 1 });
    osc(L.c, 'sine', 60 * k, t, 1.2, { f1: 28, g: 0.3, a: 0.01 });
    if (Math.random() < 0.5) ruido(L.c, t + az(1.2, 2), 1.4, { col: 'm', f: { t: 'lowpass', a: 400, b: 50 }, g: 0.18, a: 0.02, rev: 1 });
  });
  periodico(L, () => az(16, 34), (t) => { for (let i = 0; i < 14; i++) ruido(L.c, t + i * 0.07, 0.025, { f: { t: 'bandpass', a: az(900, 1500), q: 2 }, g: 0.05, a: 0.001, rev: 0.8 }); }); // ametralladora distante
  return L;
};
BUCLES.ambiente_3 = (c, o) => {
  const L = lazo(c, o.volumen ?? 1);
  zumbidoRed(L, 0.018); viento(L, 180, 0.6, 0.08, 0.05, 0.3);
  const r = L.ruido('m'), f = L.filtro('bandpass', 180, 0.5), g = L.gan(0.2); r.connect(f); f.connect(g); g.connect(L.out); L.lfo(0.08, 0.08, g.gain); // tráfico
  periodico(L, () => az(5, 11), (t) => { ruido(L.c, t, 2.2, { col: 'r', f: { t: 'bandpass', a: 300, b: 700, q: 0.9, d: 1.1 }, g: 0.1, a: 0.9, s: 0.7, r: 1, pan: az(-0.8, 0.8) }); });
  periodico(L, () => az(18, 40), (t) => { osc(L.c, 'square', 420, t, 0.4, { g: 0.015, a: 0.01, s: 0.9, r: 0.05, f: { t: 'lowpass', a: 1200 }, rev: 0.9 }); }); // bocina lejana
  return L;
};
BUCLES.ambiente_4 = (c, o) => {
  const L = lazo(c, o.volumen ?? 1);
  zumbidoRed(L, 0.014); viento(L, 260, 0.6, 0.12, 0.06);
  periodico(L, () => az(10, 22), (t) => { // sirena a lo lejos
    osc(L.c, 'sawtooth', 500, t, 3.2, { f1: 800, fd: 1.6, lin: true, g: 0.02, a: 0.4, s: 0.9, r: 0.8, f: { t: 'lowpass', a: 1200 }, vib: [0.35, 160, 0.1], rev: 1 });
  });
  periodico(L, () => az(14, 28), (t) => { // megafonía ininteligible
    for (let i = 0; i < 6; i++) { const tt = t + i * 0.28; ruido(L.c, tt, 0.22, { f: { t: 'bandpass', a: az(500, 1700), q: 4 }, g: 0.04, a: 0.03, rev: 0.9 }); osc(L.c, 'sawtooth', az(150, 200), tt, 0.22, { g: 0.012, a: 0.03, f: { t: 'bandpass', a: az(600, 1800), q: 4 }, rev: 0.9 }); }
  });
  periodico(L, () => az(8, 18), (t) => { ruido(L.c, t, 0.05, { col: 'm', f: { t: 'lowpass', a: 400 }, g: 0.1, a: 0.002, rev: 1 }); });
  return L;
};
BUCLES.ambiente_5 = (c, o) => {
  const L = lazo(c, o.volumen ?? 1);
  lluvia(L, 0.07, 5000);
  const a = L.osc('sine', 110), b = L.osc('sine', 110.7), c3 = L.osc('sine', 165.4), g = L.gan(0.03); a.connect(g); b.connect(g); c3.connect(g); g.connect(L.out); L.lfo(0.12, 0.012, g.gain);
  const r = L.ruido('r'), f = L.filtro('bandpass', 700, 1.5), gr = L.gan(0.05); r.connect(f); f.connect(gr); gr.connect(L.out); L.lfo(0.2, 400, f.frequency);
  periodico(L, () => az(6, 14), (t) => { // vehículo aéreo
    const p = az(-0.9, 0.9);
    ruido(L.c, t, 2.4, { col: 'r', f: { t: 'bandpass', a: 300, b: 1800, q: 1.2, d: 1.1 }, g: 0.12, a: 1.0, s: 0.5, r: 1, pan: p, rev: 0.6 });
    osc(L.c, 'sine', 400, t, 2.4, { f1: 900, g: 0.015, a: 1.0, s: 0.6, r: 1, pan: p });
  });
  periodico(L, () => az(9, 22), (t) => { [1760, 2349].forEach((f, i) => osc(L.c, 'sine', f, t + i * 0.12, 0.2, { g: 0.015, a: 0.004, rev: 0.9 })); });
  return L;
};
for (let i = 0; i < 6; i++) BUCLES['ambiente_' + i] ||= BUCLES.ambiente_0;

/** Alias por era para el ambiente. */
export const nombreAmbiente = (eraIdx) => 'ambiente_' + Math.max(0, Math.min(5, eraIdx | 0));
