// Audio de ERA Z — todo sintetizado con WebAudio (sin archivos). Contrato en docs/ARQUITECTURA.md §Audio.
// Añadidos: audio.ctx, audio.buses, audio.estado(), audio.destruir(), audio.NOMBRES (efectos disponibles).
import { crearBuses } from './ayudas.js';
import { EFECTOS, NOMBRES_EFECTOS } from './sintesis.js';
import { BUCLES, nombreAmbiente } from './bucles.js';
import { Secuenciador } from './musica.js';
import { conectarVoces } from './voces.js';

const CLAVE = 'eraz.audio.v1';
const MAX_VOCES = 40, ALCANCE = 58;
const lim = (v, a, b) => Math.min(b, Math.max(a, v));

export function crearAudio(juego) {
  let ctx = null, buses = null, sec = null, relojMusica = 0;
  const vol = { maestro: 0.85, musica: 0.6, efectos: 0.9 };
  try { const g = JSON.parse(localStorage.getItem(CLAVE) || 'null'); if (g) { vol.maestro = lim(+g[0] || 0, 0, 1); vol.musica = lim(+g[1] || 0, 0, 1); vol.efectos = lim(+g[2] || 0, 0, 1); } } catch { /* sin almacenamiento */ }
  const offs = [];
  let voces = [];
  const ultimo = new Map();
  const bucles = new Set();
  let ambiente = null, ambienteEra = -1;
  let musicaPend = null;
  let pausado = false;
  const aviso = new Set();

  // ───────── posición del oyente ─────────
  const oyente = () => {
    const c = juego.render?.centroVista;
    if (c && Number.isFinite(c.x)) return c;
    return juego.jugadores?.[0]?.pos ?? { x: 0, z: 0 };
  };
  /** Devuelve { g, pan, lejos } para una fuente en (x,z). */
  function espacial(x, z) {
    const o = oyente(), dx = x - o.x, dz = z - o.z, d = Math.hypot(dx, dz);
    const g = d < 6 ? 1 : Math.pow(lim(1 - (d - 6) / (ALCANCE - 6), 0, 1), 1.6);
    return { g, pan: lim(dx / 24, -1, 1) * 0.9, d };
  }

  // ───────── motor ─────────
  function iniciarCtx() {
    if (ctx) return true;
    const AC = typeof window !== 'undefined' ? (window.AudioContext || window.webkitAudioContext) : null;
    if (!AC) return false;
    try { ctx = new AC({ latencyHint: 'interactive' }); } catch { ctx = null; return false; }
    buses = crearBuses(ctx, ctx.destination, vol);
    aplicarVolumen();
    sec = new Secuenciador({ ctx, destino: buses.musica, rev: musicaRev() });
    if (musicaPend) { sec.configurar(musicaPend); }
    if (ambienteEra >= 0) { const e = ambienteEra; ambienteEra = -1; poner(e); }
    return true;
  }
  let revMusica = null;
  function musicaRev() { if (!revMusica) { revMusica = ctx.createGain(); revMusica.gain.value = 0.55; revMusica.connect(buses.rev); } return revMusica; }
  function aplicarVolumen() {
    if (!buses) return;
    const t = ctx.currentTime;
    buses.maestro.gain.setTargetAtTime(vol.maestro, t, 0.03);
    buses.musica.gain.setTargetAtTime(vol.musica * (pausado ? 0.55 : 1), t, 0.05);
    buses.efectos.gain.setTargetAtTime(vol.efectos, t, 0.03);
    buses.ambiente.gain.setTargetAtTime(0.5 * vol.efectos, t, 0.05);
  }
  function listo() { return !!ctx && ctx.state === 'running'; }

  // ───────── efectos de un disparo ─────────
  function reproducir(nombre, o = {}) {
    if (!listo()) return null;
    const def = EFECTOS[nombre];
    if (!def) { if (!aviso.has(nombre)) { aviso.add(nombre); console.warn('[audio] sonido desconocido:', nombre); } return null; }
    const ahora = ctx.currentTime;
    const ult = ultimo.get(nombre) ?? -9;
    if (ahora - ult < (def.enf ?? 0.02)) return null;
    // atenuación espacial
    let g = (o.volumen ?? 1) * def.g, pan = 0, d = 0;
    if (o.x !== undefined && o.z !== undefined) {
      const e = espacial(o.x, o.z); d = e.d; pan = e.pan;
      g *= e.g;
      if (e.g < 0.02 && def.prio < 9) return null;
    }
    if (g < 0.004) return null;
    // límite de voces con prioridad
    voces = voces.filter((v) => v.fin > ahora);
    if (voces.length >= MAX_VOCES) {
      let peor = null;
      for (const v of voces) if (!peor || v.prio < peor.prio || (v.prio === peor.prio && v.fin < peor.fin)) peor = v;
      if (!peor || peor.prio >= def.prio) return null;
      try { peor.nodo.gain.setTargetAtTime(0, ahora, 0.01); } catch { /* ok */ }
      peor.fin = 0; setTimeout(() => { try { peor.nodo.disconnect(); } catch { /* ok */ } }, 120);
    }
    const mismas = voces.filter((v) => v.nombre === nombre);
    if (mismas.length >= (def.max ?? 6)) {
      const m = mismas.reduce((a, b) => (a.fin < b.fin ? a : b));
      try { m.nodo.gain.setTargetAtTime(0, ahora, 0.015); } catch { /* ok */ }
      m.fin = 0; setTimeout(() => { try { m.nodo.disconnect(); } catch { /* ok */ } }, 150);
    }
    ultimo.set(nombre, ahora);
    const variacion = o.variacion ?? 0.05;
    const r = Math.random();
    const p = (o.tono ?? 1) * (1 + (Math.random() - 0.5) * 2 * variacion);
    const gv = g * (1 - Math.random() * 0.12);
    const voz = ctx.createGain(); voz.gain.value = gv;
    let n = voz;
    if (d > 14) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = Math.max(1500, 16000 - (d - 14) * 330); n.connect(f); n = f; }
    if (pan) { const pp = ctx.createStereoPanner(); pp.pan.value = pan; n.connect(pp); n = pp; }
    n.connect(buses.efectos);
    const envio = ctx.createGain(); envio.gain.value = gv; envio.connect(buses.rev);
    const t = ahora + (o.retardo ?? 0) + 0.004;
    try { def.f({ ctx, dest: voz, rev: envio }, t, { p, r, era: o.era ?? juego.estado?.eraIdx ?? 0 }); }
    catch (err) { console.error('[audio]', nombre, err); }
    const fin = t + def.dur + 0.15;
    const reg = { nombre, prio: def.prio, fin, nodo: voz };
    voces.push(reg);
    setTimeout(() => { try { voz.disconnect(); envio.disconnect(); n.disconnect(); } catch { /* ok */ } }, (fin - ahora + 2.5) * 1000);
    return { detener() { try { voz.gain.setTargetAtTime(0, ctx.currentTime, 0.02); } catch { /* ok */ } } };
  }

  // ───────── bucles ─────────
  function bucle(nombre, o = {}) {
    const stub = { detener() {}, ajustar() {} };
    if (!listo()) return stub;
    let hecho = BUCLES[nombre];
    const ef = EFECTOS[nombre];
    if (!hecho && !ef) return stub;
    if (!hecho) hecho = (c, op) => { // un efecto puntual se repite como bucle
      const inst = { tono: 1, c, tick(t) { if (!inst.prox || t >= inst.prox - 0.05) { inst.prox = Math.max(t, inst.prox || t) + ef.dur * 0.92; ef.f({ ctx, dest: c.dest, rev: c.rev }, Math.max(t, inst.prox - ef.dur * 0.92), { p: inst.tono, r: Math.random() }); } }, ajustar(p) { if (p.tono !== undefined) inst.tono = p.tono; }, parar() { inst.vivo = false; } };
      return inst;
    };
    let x = o.x, z = o.z, vl = o.volumen ?? 1;
    const salida = ctx.createGain(); let pan = null;
    const nodo = ctx.createStereoPanner(); nodo.pan.value = 0; salida.connect(nodo); nodo.connect(buses.efectos); pan = nodo;
    const revE = ctx.createGain(); revE.gain.value = 0.5; revE.connect(buses.rev);
    const aplica = () => {
      let gg = 1;
      if (x !== undefined && z !== undefined) { const e = espacial(x, z); gg = e.g; pan.pan.setTargetAtTime(e.pan, ctx.currentTime, 0.05); }
      salida.gain.setTargetAtTime(gg * 0.9, ctx.currentTime, 0.06);
      revE.gain.setTargetAtTime(gg * 0.4 * vl, ctx.currentTime, 0.1);
    };
    aplica();
    const inst = hecho({ ctx, dest: salida, rev: revE }, { volumen: vl });
    inst.ajustar?.({ volumen: vl, tono: o.tono ?? 1 });
    const h = {
      inst, vivo: true,
      detener() { if (!h.vivo) return; h.vivo = false; bucles.delete(h); try { inst.parar?.(); } catch { /* ok */ } setTimeout(() => { try { salida.disconnect(); revE.disconnect(); nodo.disconnect(); } catch { /* ok */ } }, 900); },
      ajustar(p = {}) {
        if (!h.vivo) return;
        if (p.x !== undefined) x = p.x; if (p.z !== undefined) z = p.z;
        if (p.volumen !== undefined) vl = p.volumen;
        aplica();
        inst.ajustar?.({ volumen: p.volumen !== undefined ? vl : undefined, tono: p.tono });
      },
    };
    bucles.add(h);
    return h;
  }

  // ───────── ambiente por era ─────────
  function poner(eraIdx) {
    if (!listo() && !ctx) { ambienteEra = eraIdx; return; }
    if (eraIdx === ambienteEra) return;
    ambienteEra = eraIdx;
    if (!buses) return;
    const viejo = ambiente; ambiente = null;
    if (viejo) viejo.detener();
    if (eraIdx < 0) return;
    const f = BUCLES[nombreAmbiente(eraIdx)];
    if (!f) return;
    const salida = ctx.createGain(); salida.connect(buses.ambiente);
    const rv = ctx.createGain(); rv.gain.value = 0.4; rv.connect(buses.rev);
    const inst = f({ ctx, dest: salida, rev: rv }, { volumen: 1 });
    ambiente = { detener() { try { inst.parar(); } catch { /* ok */ } setTimeout(() => { try { salida.disconnect(); rv.disconnect(); } catch { /* ok */ } }, 900); }, inst };
  }

  // ───────── música ─────────
  function musica(o = {}) {
    const modoAnt = musicaPend?.modo;
    musicaPend = { eraIdx: o.eraIdx ?? juego.estado?.eraIdx ?? 0, intensidad: o.intensidad ?? 0.3, modo: o.modo ?? 'combate' };
    if (sec) sec.configurar(musicaPend);
    if (modoAnt !== musicaPend.modo && (musicaPend.modo === 'victoria' || musicaPend.modo === 'derrota')) reproducir(musicaPend.modo === 'victoria' ? 'victoria_sting' : 'derrota_sting', { volumen: 0.8 });
  }

  // ───────── eventos del juego ─────────
  const suenaArma = (d, retardo = 0) => d?.arma?.sonido;
  const pos = (e) => e ? { x: e.x ?? e.pos?.x, z: e.z ?? e.pos?.z } : {};
  const en = (n, f) => offs.push(juego.eventos.en(n, (d) => { try { f(d || {}); } catch (e) { console.error('[audio] evento', n, e); } }));
  const ultDisparo = new Map();   // portador → t del último disparo de lanzallamas
  const llamas = new Map();       // portador → bucle
  const racha = { n: 0, t: 0 };

  en('arma:disparo', (d) => {
    const def = d.arma; if (!def?.sonido) return;
    const o = d.origen;
    if (d.cuerpo) return; // el golpe suena en arma:golpe
    if (def.sonido === 'lanzallamas') {
      const k = d.portador ?? 0; ultDisparo.set(k, performance.now());
      if (!llamas.has(k)) llamas.set(k, bucle('lanzallamas', { x: o?.x, z: o?.z, volumen: 0.9 }));
      else llamas.get(k).ajustar({ x: o?.x, z: o?.z });
      return;
    }
    reproducir(def.sonido, { x: o?.x, z: o?.z, volumen: def.sonido.startsWith('explosion') ? 1 : 1, variacion: 0.04 });
    if (def.casquillo) reproducir('casquillo', { x: o?.x, z: o?.z, volumen: 0.5, retardo: 0.18 + Math.random() * 0.15 });
  });
  en('arma:golpe', (d) => { const def = d.arma; if (def?.sonido) reproducir(def.sonido, { x: d.origen?.x, z: d.origen?.z }); });
  en('arma:lanzar', (d) => reproducir('lanzar', { x: d.origen?.x, z: d.origen?.z }));
  en('arma:vacia', (d) => reproducir('arma_vacia', pos(d.portador)));
  en('arma:recarga', (d) => {
    const def = d.arma, p = pos(d.portador), dur = d.duracion ?? 1.5;
    if (!def) return;
    if (def.era === 0) reproducir('recarga_polvora', { ...p, volumen: 0.8 });
    else if (def.era >= 5 || def.tipo === 'energia') reproducir('recarga_energia', { ...p, volumen: 0.8 });
    else if (def.recargaTipo === 'cartucho') { /* cada cartucho suena en arma:cartucho */ }
    else { reproducir('cargador_sale', { ...p, volumen: 0.8 }); reproducir('cargador_entra', { ...p, volumen: 0.9, retardo: Math.max(0.2, dur * 0.65) }); }
  });
  en('arma:cartucho', (d) => reproducir('recarga_cartucho', { ...pos(d.portador), volumen: 0.8 }));
  en('arma:recargada', (d) => { const def = d.arma; if (!def) return; if (def.recargaTipo === 'cartucho') reproducir('bombeo', pos(d.portador)); else if (def.era < 5 && def.era > 1) reproducir('cerrojo', { ...pos(d.portador), volumen: 0.6 }); });
  en('arma:sobrecalentada', (d) => reproducir('arma_sobrecalentada', pos(d.portador)));
  en('arma:enfriada', (d) => reproducir('arma_fria', pos(d.portador)));
  en('impacto', (d) => {
    const m = d.material, t = d.tipo;
    const nom = m === 'carne' ? 'impacto_carne' : m === 'metal' ? 'impacto_metal' : m === 'madera' ? 'impacto_madera' : m === 'piedra' ? 'impacto_piedra' : m === 'energia' || t === 'energia' ? 'impacto_energia' : 'impacto_suelo';
    reproducir(nom, { x: d.x, z: d.z, volumen: m === 'carne' ? 0.8 : 0.7 });
    if (d.critico) reproducir('critico', { x: d.x, z: d.z, volumen: 0.6 });
  });
  en('explosion', (d) => {
    const era = juego.estado?.eraIdx ?? 0, r = d.radio ?? 4;
    let n = r < 3 ? 'explosion_pequena' : r < 5.8 ? 'explosion' : 'explosion_grande';
    if (d.tipo === 'energia' || era >= 5) n = r >= 5.8 ? 'explosion_grande' : 'explosion_energia';
    else if (r >= 3 && r < 5.8) n = era === 0 ? 'explosion_polvora' : era === 1 ? 'explosion_dinamita' : 'explosion';
    reproducir(n, { x: d.x, z: d.z });
    if (d.tipo === 'fuego') reproducir('llamarada', { x: d.x, z: d.z, retardo: 0.05 });
  });
  en('zona:crear', (d) => {
    const z = d.zona; if (!z) return; const tp = z.tipo ?? z.def?.tipo, p = pos(z);
    if (tp === 'fuego') reproducir('llamarada', p); else if (tp === 'gas' || tp === 'veneno') reproducir('gas', p); else if (tp === 'acido') reproducir('acido', p); else if (tp === 'gravedad') reproducir('zona_gravedad', p);
  });
  en('zombi:aparece', (d) => { const z = d.zombi; if (z && !z.esJefe && Math.random() < 0.35) reproducir('zombi_aparece', { ...pos(z), volumen: 0.7 }); });
  en('zombi:grito', (d) => { const z = d.zombi; if (z) reproducir('zombi_' + (z.def?.id ?? 'caminante'), { ...pos(z), volumen: 0.9 }); });
  en('zombi:muerte', (d) => {
    const z = d.zombi; if (!z) return;
    const id = z.def?.id, p = pos(z);
    if (z.esJefe) return;
    const tono = id === 'mole' ? 0.55 : id === 'acorazado' ? 0.75 : id === 'corredor' || id === 'aullador' ? 1.25 : 1;
    reproducir('zombi_muerte', { ...p, tono, volumen: id === 'mole' ? 1 : 0.8 });
  });
  en('danio', (d) => { const o = d.objetivo; if (o?.bando === 'zombis' && !d.continuo && Math.random() < 0.18 && !o.esJefe) reproducir('zombi_dolor', { ...pos(o), volumen: 0.6, tono: o.def?.id === 'mole' ? 0.6 : 1 }); });
  en('jefe:aparece', (d) => { const j = d.jefe; if (j) reproducir('jefe_' + (j.def?.id ?? 'coracero'), { volumen: 1 }); });
  en('jefe:ataque', (d) => { let h = 0; for (const ch of String(d.ataque ?? '')) h = (h * 31 + ch.charCodeAt(0)) % 97; reproducir('jefe_ataque', { ...pos(d.jefe), tono: 0.85 + (h % 7) * 0.05 }); });
  en('jefe:fase', (d) => reproducir('jefe_fase', { volumen: 1 }));
  en('jefe:muerte', (d) => reproducir('jefe_muerte', { volumen: 1 }));
  en('jugador:danio', (d) => { const j = d.jugador; reproducir('jugador_danio', { ...pos(j), tono: (j?.indice ?? 0) % 2 ? 1.12 : 1 }); });
  en('jugador:muerte', (d) => reproducir('jugador_muerte', pos(d.jugador)));
  en('jugador:reanimado', (d) => reproducir('reanimar', pos(d.jugador)));
  en('jugador:curado', (d) => reproducir('curacion', { ...pos(d.jugador), volumen: 0.7 }));
  en('jugador:esquiva', (d) => reproducir('esquivar', pos(d.jugador)));
  en('jugador:habilidad', (d) => { const id = d.habilidad?.id; reproducir(EFECTOS['habilidad_' + id] ? 'habilidad_' + id : 'habilidad_generica', pos(d.jugador)); });
  en('jugador:arma', () => { /* el propio jugador suena cambio_arma */ });
  en('recogida', (d) => { const t = d.tipo; reproducir(t === 'municion' ? 'recogida_municion' : t === 'vida' || t === 'salud' || t === 'botiquin' ? 'recogida_vida' : 'recogida_generica', pos(d.jugador)); });
  en('puntos', (d) => {
    const ahora = ctx?.currentTime ?? 0;
    racha.n = ahora - racha.t < 1.2 ? Math.min(racha.n + 1, 12) : 0; racha.t = ahora;
    reproducir('puntos', { volumen: 0.5, tono: 1 + racha.n * 0.05, variacion: 0.01 });
  });
  en('mejora:aplicada', () => reproducir('mejora'));
  en('mensaje', (d) => { if (d.tipo === 'logro') reproducir('logro', { volumen: 0.7 }); else if (d.tipo === 'aviso') reproducir('aviso', { volumen: 0.7 }); });
  en('oleada:inicio', (d) => reproducir(d.jefe ? 'oleada_jefe' : 'oleada_anuncio', { era: d.eraIdx }));
  en('oleada:fin', () => reproducir('dia_superado'));
  en('intermedio:inicio', () => reproducir('intermedio_inicio'));
  en('era:cambio', (d) => { reproducir('salto_temporal'); poner(d.eraIdx ?? 0); });
  en('partida:inicio', () => { reproducir('inicio_partida'); poner(juego.estado?.eraIdx ?? 0); });
  en('escenario:cargado', (d) => poner(d.eraIdx ?? juego.estado?.eraIdx ?? 0));
  en('juego:listo', () => poner(juego.estado?.eraIdx ?? 0));
  en('ui:menu', () => { poner(juego.estado?.eraIdx ?? 0); });
  en('ui:jugar', () => reproducir('ui_confirmar'));
  en('ui:elegirMejora', () => reproducir('ui_confirmar'));
  en('juego:pausa', (d) => { pausado = !!d.pausado; aplicarVolumen(); if (buses) buses.filtroMusica.frequency.setTargetAtTime(pausado ? 700 : 20000, ctx.currentTime, 0.08); reproducir('pausa'); });
  en('vehiculo:destruido', (d) => reproducir('explosion', pos(d.vehiculo)));
  en('interactivo:usado', (d) => {
    const o = d.objeto, id = o?.tipo ?? o?.id ?? o?.def?.id;
    const alias = { palanca_tren: 'silbato_tren', carreta: 'interactivo_usar', mina_terrestre: 'mina', farol_aceite: 'interactivo_usar', deposito_agua: 'interactivo_usar', vagoneta: 'interactivo_usar', puerta_energia: 'zumbido_electrico', dron_suministros: 'interactivo_usar', celula_plasma: 'zumbido_electrico', surtidor_gasolina: 'interactivo_usar' };
    const n = EFECTOS[id] ? id : (alias[id] ?? 'interactivo_usar');
    reproducir(n, pos(o));
  });

  // interfaz: DOM
  const doc = typeof document !== 'undefined' ? document : null;
  let ultHover = null;
  const esBoton = (e) => e?.closest?.('button, [role="button"], .boton, .btn, a[href], [data-sonido]');
  const alHover = (e) => { const b = esBoton(e.target); if (b && b !== ultHover && !b.disabled) { ultHover = b; reproducir('ui_hover'); } else if (!b) ultHover = null; };
  const alClic = (e) => { const b = esBoton(e.target); if (!b) return; if (b.disabled || b.getAttribute('aria-disabled') === 'true') reproducir('ui_error'); else reproducir(b.dataset?.sonido && EFECTOS[b.dataset.sonido] ? b.dataset.sonido : 'ui_clic'); };
  if (doc) { doc.addEventListener('pointerover', alHover, { passive: true }); doc.addEventListener('click', alClic, { passive: true, capture: true }); }

  // pasos y voces ambientales de zombis
  const pasosJ = new Map();
  let tGrunido = 1;
  let tAmbMusica = 0;

  const api = {
    siempre: true,
    NOMBRES: NOMBRES_EFECTOS,
    get ctx() { return ctx; },
    get buses() { return buses; },
    desbloquear() {
      if (!iniciarCtx()) return;
      if (ctx.state === 'suspended') ctx.resume?.().catch?.(() => {});
    },
    reproducir,
    bucle,
    musica,
    volumen(maestro, musicaV, efectos) {
      if (maestro !== undefined) vol.maestro = lim(+maestro, 0, 1);
      if (musicaV !== undefined) vol.musica = lim(+musicaV, 0, 1);
      if (efectos !== undefined) vol.efectos = lim(+efectos, 0, 1);
      aplicarVolumen();
      try { localStorage.setItem(CLAVE, JSON.stringify([vol.maestro, vol.musica, vol.efectos])); } catch { /* sin almacenamiento */ }
    },
    estado() { return { listo: listo(), voces: voces.length, bucles: bucles.size, vol: { ...vol }, ambiente: ambienteEra }; },
    actualizar(dt) {
      if (!ctx) return;
      if (ctx.state === 'suspended' && !pausado) ctx.resume?.().catch?.(() => {});
      if (!listo()) return;
      const t = ctx.currentTime;
      // secuenciador de música (con antelación)
      if (sec) sec.avanzar(t + 0.35);
      for (const h of bucles) h.inst.tick?.(t, dt);
      ambiente?.inst.tick?.(t, dt);
      // lanzallamas: parar si no hay disparos
      const ahora = performance.now();
      for (const [k, h] of llamas) if (ahora - (ultDisparo.get(k) ?? 0) > 160) { h.detener(); llamas.delete(k); }
      if (dt > 0 && juego.simulando) {
        // pasos
        for (const j of juego.jugadores ?? []) {
          if (!j.vivo || !j.pos) continue;
          let p = pasosJ.get(j); if (!p) { p = { x: j.pos.x, z: j.pos.z, acum: 0 }; pasosJ.set(j, p); }
          const dd = Math.hypot(j.pos.x - p.x, j.pos.z - p.z);
          p.x = j.pos.x; p.z = j.pos.z;
          if (dd < 1.5) p.acum += dd;
          if (p.acum > 1.7) { p.acum = 0; if (!j.vehiculo && !j.enVehiculo) reproducir('paso_' + lim(juego.estado?.eraIdx ?? 0, 0, 5), { x: j.pos.x, z: j.pos.z, volumen: 0.55 }); }
        }
        // gruñidos ambientales
        tGrunido -= dt;
        if (tGrunido <= 0) {
          tGrunido = 0.5 + Math.random() * 1.6;
          const zs = juego.zombis; const o = oyente();
          if (zs?.length) {
            const z = zs[(Math.random() * zs.length) | 0];
            if (z?.vivo && z.pos && Math.hypot(z.pos.x - o.x, z.pos.z - o.z) < 32 && !z.esJefe) {
              const id = z.def?.id ?? 'caminante';
              reproducir(EFECTOS['zombi_' + id] ? 'zombi_' + id : 'zombi_caminante', { x: z.pos.x, z: z.pos.z, volumen: 0.45 });
            }
          }
        }
      }
    },
    destruir() {
      for (const o of offs) try { o(); } catch { /* ok */ }
      offs.length = 0;
      if (doc) { doc.removeEventListener('pointerover', alHover); doc.removeEventListener('click', alClic, true); }
      for (const h of [...bucles]) h.detener();
      ambiente?.detener(); sec?.detener(0.1);
      try { ctx?.close(); } catch { /* ok */ }
      ctx = null;
    },
  };
  conectarVoces(juego, api, en); // voces reales en español (public/voces); opcional
  return api;
}
