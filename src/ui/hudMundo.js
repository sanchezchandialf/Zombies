// HUD anclado al mundo: números de daño flotantes, etiquetas de arma sobre el personaje, indicador de interacción,
// marcadores de borde, barras de vida de estructuras, dirección del daño y retícula. Todo con nodos reutilizados.
import { ROLES } from '../datos/roles.js';
import { icono } from './iconos.js';
import { html, texto, contenido, clase, estilo, visible, relanzar, limitar, crearReserva } from './util.js';

const _p = { x: 0, y: 0, z: 0 };
const _o = { x: 0, y: 0, visible: true };

const COLOR_DANIO = { fuego: '#ffa14a', veneno: '#9be04a', acido: '#c6ff4a', energia: '#6fe6ff', explosivo: '#ffcf4a', perforante: '#f2f2ff', golpe: '#ffe2c0', bala: '#ffffff' };

export function crearHudMundo(ctx, { paneles }) {
  const { juego, capas, ajustes } = ctx;
  const est = juego.estado;
  const mundo = html('<div class="hm"></div>');
  capas.mundo.appendChild(mundo);
  const mk = (cls) => { const e = html(`<div class="${cls}"></div>`); mundo.appendChild(e); return e; };
  const capaEstr = mk('hm-estr'), capaEtq = mk('hm-etq'), capaFlot = mk('hm-flot'), capaDir = mk('hm-dir'),
    capaMarc = mk('hm-marc'), capaInter = mk('hm-inter'), capaRet = mk('hm-ret');

  const proy = (x, y, z) => {
    const r = juego.render;
    if (!r?.proyectar) return null;
    _p.x = x; _p.y = y; _p.z = z;
    return r.proyectar(_p, _o);
  };
  const anchoPantalla = () => juego.contenedor.clientWidth || innerWidth;
  const altoPantalla = () => juego.contenedor.clientHeight || innerHeight;

  // ══ Números de daño flotantes ══════════════════════════════════════════════════════════════════════════════════
  const reservaFlot = crearReserva(capaFlot, () => html('<div class="flot"><span class="flot-n num"></span></div>'), 24);
  const flotantes = []; // { nodo, n, x, y, z, t, dur, valor, jx, crit, ult, objetivo }
  const porObjetivo = new WeakMap();
  const MAX_FLOT = 42;

  function nuevoFlotante(objetivo, x, y, z, valor, crit, tipo, hostil) {
    let f = flotantes.length >= MAX_FLOT ? flotantes.shift() : null;
    if (f) { reservaFlot.soltar(f.nodo); }
    const nodo = reservaFlot.tomar();
    f = { nodo, n: nodo.firstChild, x, y, z, t: 0, dur: crit ? 1.15 : 0.85, valor, jx: (Math.random() - 0.5) * 2.2, crit, ult: 0, objetivo };
    nodo.dataset.tipo = tipo || 'bala';
    nodo.classList.toggle('crit', !!crit);
    nodo.classList.toggle('hostil', !!hostil);
    estilo(nodo, '--c', COLOR_DANIO[tipo] || '#fff');
    texto(f.n, crit ? '★' + valor : valor);
    flotantes.push(f);
    if (objetivo) porObjetivo.set(objetivo, f);
    relanzar(nodo, 'nace');
    return f;
  }

  ctx.en('danio', (d) => {
    if (!ajustes.numeros) return;
    const obj = d.objetivo;
    if (!obj || !(d.cantidad >= 1)) return;
    const hostil = obj.bando === 'jugadores';
    if (!hostil && obj.bando !== 'zombis') return;
    if (!hostil && d.atacante && d.atacante.bando !== 'jugadores') return;
    const valor = Math.round(d.cantidad);
    const alt = (obj.visual?.altura ?? obj.altura ?? 1.8) * 0.92;
    const x = d.x ?? obj.pos?.x ?? 0, z = d.z ?? obj.pos?.z ?? 0;
    const previo = porObjetivo.get(obj);
    // Agrupa los impactos seguidos sobre el mismo objetivo (ráfagas, perdigones, fuego continuo).
    if (previo && previo.t < 0.4 && flotantes.includes(previo) && !!previo.crit === !!d.critico) {
      previo.valor += valor; previo.t = Math.min(previo.t, 0.12); previo.dur = Math.max(previo.dur, previo.t + 0.8);
      texto(previo.n, previo.crit ? '★' + previo.valor : previo.valor);
      relanzar(previo.nodo, 'nace');
      return;
    }
    nuevoFlotante(obj, x, alt, z, valor, !!d.critico, d.tipo, hostil);
  });

  function actualizarFlotantes(dt) {
    for (let i = flotantes.length - 1; i >= 0; i--) {
      const f = flotantes[i];
      f.t += dt;
      if (f.t >= f.dur) { reservaFlot.soltar(f.nodo); flotantes.splice(i, 1); continue; }
      const o = proy(f.x, f.y, f.z);
      if (!o || !o.visible) { estilo(f.nodo, 'opacity', '0'); continue; }
      const u = f.t / f.dur;
      const subida = (1 - Math.pow(1 - Math.min(1, u * 1.3), 2)) * 2.6;
      estilo(f.nodo, 'transform', `translate3d(${(o.x).toFixed(1)}px, ${(o.y).toFixed(1)}px, 0) translate(-50%, -50%) translate(${f.jx}em, ${-subida}em)`);
      estilo(f.nodo, 'opacity', u < 0.65 ? '1' : (1 - (u - 0.65) / 0.35).toFixed(2));
    }
  }

  // ══ Dirección del daño ═════════════════════════════════════════════════════════════════════════════════════════
  const reservaDir = crearReserva(capaDir, () => html('<div class="dd"><i></i></div>'), 8);
  const dirs = [];
  ctx.en('jugador:danio', (d) => {
    const j = d.jugador; if (!j) return;
    const dx = d.dirX || 0, dz = d.dirZ || 0;
    if (Math.abs(dx) + Math.abs(dz) < 0.01) return;
    if (dirs.length >= 8) { const v = dirs.shift(); reservaDir.soltar(v.nodo); }
    const nodo = reservaDir.tomar();
    // El golpe viaja en (dirX, dirZ): el origen está al lado contrario. En pantalla +X es derecha y +Z abajo.
    const ang = Math.atan2(-dz, -dx);
    dirs.push({ nodo, j, ang, t: 0, dur: 1.1, fuerza: limitar((d.cantidad || 10) / 30, 0.4, 1) });
    relanzar(nodo, 'nace');
  });
  function actualizarDirs(dt) {
    for (let i = dirs.length - 1; i >= 0; i--) {
      const d = dirs[i];
      d.t += dt;
      if (d.t >= d.dur) { reservaDir.soltar(d.nodo); dirs.splice(i, 1); continue; }
      const o = proy(d.j.pos.x, 0.9, d.j.pos.z);
      if (!o) { estilo(d.nodo, 'opacity', '0'); continue; }
      estilo(d.nodo, 'transform', `translate3d(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px, 0) rotate(${d.ang.toFixed(3)}rad) translateX(var(--rad))`);
      estilo(d.nodo, 'opacity', (d.fuerza * (1 - d.t / d.dur)).toFixed(2));
    }
  }

  // ══ Etiquetas sobre el personaje ═══════════════════════════════════════════════════════════════════════════════
  const etqs = new Map();
  function crearEtq() {
    const n = html(`<div class="etq"><div class="etq-aviso"></div><div class="etq-fila"><span class="etq-nom"></span><span class="etq-mun num"></span></div><div class="barra fina etq-barra"><i></i></div></div>`);
    capaEtq.appendChild(n);
    return { el: n, nom: n.querySelector('.etq-nom'), mun: n.querySelector('.etq-mun'), barra: n.querySelector('.etq-barra i'), barraEl: n.querySelector('.etq-barra'), aviso: n.querySelector('.etq-aviso') };
  }
  function actualizarEtq(j) {
    let e = etqs.get(j.indice);
    if (!e) { e = crearEtq(); etqs.set(j.indice, e); }
    const inst = j.arma;
    const o = (j.vivo !== false && inst) ? proy(j.pos.x, (j.visual?.altura ?? 1.8) + 0.55, j.pos.z) : null;
    if (!o || !o.visible) { visible(e.el, false); return; }
    visible(e.el, true);
    estilo(e.el, 'transform', `translate3d(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px, 0) translate(-50%, -100%)`);
    estilo(e.el, '--rol', ROLES[j.rol?.id]?.color ?? '#fff');
    const def = inst.def, cargador = Math.max(1, def?.cargador ?? 1);
    texto(e.nom, (def?.nombre ?? '').toUpperCase());
    texto(e.mun, inst.municion ?? 0);
    const rec = !!inst.recargando;
    estilo(e.barra, '--v', (rec ? limitar(inst.progresoRecarga ?? 0, 0, 1) : limitar((inst.municion ?? 0) / cargador, 0, 1)).toFixed(3));
    clase(e.barraEl, 'recargando', rec);
    const vacio = !rec && (inst.municion ?? 0) <= 0, bajo = !rec && cargador > 2 && (inst.municion ?? 0) <= Math.floor(cargador * 0.2);
    const sinRes = inst.reserva === 0 && def?.reserva !== -1 && !j.mods?.municionInfinita;
    const msg = rec ? '' : vacio && sinRes ? 'SIN MUNICIÓN' : (vacio || bajo) ? '¡RECARGA!' : '';
    texto(e.aviso, msg); visible(e.aviso, !!msg);
    clase(e.barraEl, 'bajo', !!msg);
  }

  // ══ Indicador de interacción ═══════════════════════════════════════════════════════════════════════════════════
  const inters = new Map();
  function crearInter() {
    const n = html(`<div class="inter"><span class="tecla inter-tecla">E</span><svg class="inter-anillo" viewBox="0 0 44 44"><circle class="inter-pista" cx="22" cy="22" r="19"/><circle class="inter-prog" cx="22" cy="22" r="19" transform="rotate(-90 22 22)"/></svg><span class="inter-txt"></span></div>`);
    capaInter.appendChild(n);
    const prog = n.querySelector('.inter-prog'); prog.style.strokeDasharray = (2 * Math.PI * 19).toFixed(2);
    return { el: n, tecla: n.querySelector('.inter-tecla'), txt: n.querySelector('.inter-txt'), prog };
  }
  function actualizarInter(j) {
    let e = inters.get(j.indice);
    if (!e) { e = crearInter(); inters.set(j.indice, e); }
    const it = j.interactivo;
    if (!it || j.vivo === false || est.fase !== 'jugando') { visible(e.el, false); return; }
    const pos = it.obj?.pos ?? j.pos;
    const o = proy(pos.x, it.tipo === 'reanimar' ? 1.2 : 1.5, pos.z);
    if (!o || !o.visible) { visible(e.el, false); return; }
    visible(e.el, true);
    estilo(e.el, 'transform', `translate3d(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px, 0) translate(-50%, -100%)`);
    const mando = juego.entrada?.dispositivo?.(j.indice) === 'mando';
    texto(e.tecla, mando ? 'B' : 'E'); clase(e.tecla, 'mando', mando);
    const mantiene = (it.mantener ?? 0) > 0 || it.tipo === 'reanimar';
    texto(e.txt, it.etiqueta + (mantiene ? ' (mantener)' : it.tipo === 'reparar' ? ' (mantener)' : ''));
    clase(e.el, 'con-anillo', mantiene || it.tipo === 'reparar');
    const pr = limitar(it.progreso ?? 0, 0, 1);
    estilo(e.prog, 'strokeDashoffset', ((1 - pr) * 2 * Math.PI * 19).toFixed(2));
    clase(e.el, 'pulsando', pr > 0.02 && it.tipo !== 'reparar');
    e.el.dataset.tipo = it.tipo || 'usar';
  }

  // ══ Marcadores de borde ════════════════════════════════════════════════════════════════════════════════════════
  const reservaMarc = crearReserva(capaMarc, () => html(`<div class="marc"><i class="marc-flecha">${icono('flecha')}</i><span class="marc-ico"></span><b class="marc-d num"></b></div>`), 8);
  const marcs = [];
  function marcador(i) {
    while (marcs.length <= i) {
      const n = reservaMarc.tomar();
      marcs.push({ el: n, flecha: n.querySelector('.marc-flecha'), ico: n.querySelector('.marc-ico'), d: n.querySelector('.marc-d') });
    }
    return marcs[i];
  }
  let nMarc = 0;
  function ponerMarcador(x, y, z, tipo, color, etiquetaIco, distM) {
    const o = proy(x, y, z);
    if (!o) return;
    const W = anchoPantalla(), H = altoPantalla();
    const margen = 0.05;
    const fuera = !o.visible || o.x < W * margen || o.x > W * (1 - margen) || o.y < H * margen || o.y > H * (1 - margen);
    if (!fuera) return;
    let dx = o.x - W / 2, dy = o.y - H / 2;
    if (!o.visible && ((dx === 0 && dy === 0))) dy = -1;
    const fpx = (parseFloat(ctx.raiz.style.getPropertyValue('--px')) || 1) * 16;
    const mx = 3 * fpx, myS = 9.6 * fpx, myI = 8.4 * fpx;
    const k = Math.min((W / 2 - mx) / Math.max(1e-3, Math.abs(dx)), ((dy < 0 ? H / 2 - myS : H / 2 - myI)) / Math.max(1e-3, Math.abs(dy)));
    const px = W / 2 + dx * k, py = H / 2 + dy * k;
    const m = marcador(nMarc++);
    visible(m.el, true);
    estilo(m.el, 'transform', `translate3d(${px.toFixed(1)}px, ${py.toFixed(1)}px, 0) translate(-50%, -50%)`);
    estilo(m.flecha, 'transform', `rotate(${(Math.atan2(dy, dx) + Math.PI / 2).toFixed(3)}rad)`);
    estilo(m.el, '--c', color);
    m.el.dataset.tipo = tipo;
    contenido(m.ico, etiquetaIco);
    texto(m.d, distM != null ? Math.round(distM) + ' m' : '');
  }
  const icoCalavera = icono('calavera'), icoCruz = icono('cruz'), icoCorona = icono('corona');
  function actualizarMarcadores() {
    nMarc = 0;
    if (est.fase === 'jugando' && !est.pausado) {
      const vivos = juego.jugadores.filter((j) => j.vivo !== false);
      const ref = vivos[0] ?? juego.jugadores[0];
      // Compañeros caídos
      for (const j of juego.jugadores) {
        if (j.caido && !j.muerto) ponerMarcador(j.pos.x, 1, j.pos.z, 'aliado', ROLES[j.rol?.id]?.color ?? '#62d28a', icoCruz, ref ? Math.hypot(j.pos.x - ref.pos.x, j.pos.z - ref.pos.z) : null);
      }
      // Jefe
      const jf = est.jefe;
      if (jf && jf.vivo !== false) ponerMarcador(jf.pos.x, 1.5, jf.pos.z, 'jefe', '#ff4f5a', icoCorona, ref ? Math.hypot(jf.pos.x - ref.pos.x, jf.pos.z - ref.pos.z) : null);
      // Últimos zombis
      const rest = est.zombisRestantes ?? 0;
      if (rest > 0 && rest <= 6 && ref) {
        let n = 0;
        for (const z of juego.zombis) {
          if (z.vivo === false || z.esJefe) continue;
          ponerMarcador(z.pos.x, 1, z.pos.z, 'zombi', '#ff6a5a', icoCalavera, Math.hypot(z.pos.x - ref.pos.x, z.pos.z - ref.pos.z));
          if (++n >= 5) break;
        }
      }
    }
    for (let i = 0; i < marcs.length; i++) if (i >= nMarc) visible(marcs[i].el, false);
  }

  // ══ Barras de vida de estructuras y vehículos ══════════════════════════════════════════════════════════════════
  const reservaEstr = crearReserva(capaEstr, () => html('<div class="eb"><div class="barra fina"><i></i></div></div>'), 10);
  const ebs = [];
  function barraEstr(i) {
    while (ebs.length <= i) { const n = reservaEstr.tomar(); ebs.push({ el: n, i: n.querySelector('i') }); }
    return ebs[i];
  }
  function actualizarEstructuras() {
    let n = 0;
    const fuentes = [juego.mundo?.estructuras, juego.vehiculos?.lista];
    if (est.fase === 'jugando') {
      for (const lista of fuentes) {
        if (!lista) continue;
        for (const e of lista) {
          if (!e || e.vivo === false || !e.vidaMax || !(e.vida < e.vidaMax * 0.995) || !e.pos) continue;
          const o = proy(e.pos.x, (e.altura ?? (e.def?.altura) ?? 2.1) + 0.2, e.pos.z);
          if (!o || !o.visible) continue;
          const b = barraEstr(n++);
          visible(b.el, true);
          estilo(b.el, 'transform', `translate3d(${o.x.toFixed(1)}px, ${o.y.toFixed(1)}px, 0) translate(-50%, -100%)`);
          const f = limitar(e.vida / e.vidaMax, 0, 1);
          estilo(b.i, '--v', f.toFixed(3));
          estilo(b.i, '--c', f < 0.3 ? 'var(--vida)' : f < 0.6 ? 'var(--vida-2)' : 'var(--vida-ok)');
          if (n >= 14) break;
        }
      }
    }
    for (let i = 0; i < ebs.length; i++) if (i >= n) visible(ebs[i].el, false);
  }

  // ══ Retícula ═══════════════════════════════════════════════════════════════════════════════════════════════════
  const raton = { x: -999, y: -999, vivo: false };
  const alRaton = (ev) => {
    const r = juego.contenedor.getBoundingClientRect();
    raton.x = ev.clientX - r.left; raton.y = ev.clientY - r.top; raton.vivo = true;
  };
  addEventListener('pointermove', alRaton, { passive: true });
  const rets = new Map();
  function crearRet() {
    const n = html(`<div class="ret"><i class="t1"></i><i class="t2"></i><i class="t3"></i><i class="t4"></i><b class="punto"></b><span class="x"><i></i><i></i><i></i><i></i></span></div>`);
    capaRet.appendChild(n);
    return { el: n, bloom: 0, gap: 1 };
  }
  ctx.en('arma:disparo', (d) => { const r = rets.get(d.portador?.indice); if (r) r.bloom = Math.min(1.6, r.bloom + 0.6); });
  ctx.en('danio', (d) => {
    const a = d.atacante; if (!a || !(d.objetivo?.bando === 'zombis')) return;
    const r = rets.get(a.indice); if (!r) return;
    relanzar(r.el, d.muerte ? 'baja' : 'acierto');
  });
  let cursorOculto = false;
  function actualizarRets(dt) {
    const jugando = est.fase === 'jugando' && !est.pausado;
    let oculto0 = false;
    for (const j of juego.jugadores) {
      let r = rets.get(j.indice);
      if (!r) { r = crearRet(); rets.set(j.indice, r); }
      const vivo = j.vivo !== false && !j.caido && jugando && !j.vehiculo;
      if (!vivo) { visible(r.el, false); continue; }
      const mando = juego.entrada?.dispositivo?.(j.indice) === 'mando';
      let x, y;
      if (!mando && j.indice === 0 && raton.vivo) { x = raton.x; y = raton.y; if (!oculto0) oculto0 = true; }
      else {
        const ap = j.apuntando ?? j.intencion?.apuntar;
        if (!ap) { visible(r.el, false); continue; }
        const o = proy(ap.x, 0, ap.z);
        if (!o || !o.visible) { visible(r.el, false); continue; }
        x = o.x; y = o.y;
      }
      visible(r.el, true);
      estilo(r.el, 'transform', `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`);
      estilo(r.el, '--rol', ROLES[j.rol?.id]?.color ?? '#fff');
      // Apertura según la dispersión del arma, los modificadores y el retroceso reciente.
      const disp = (j.arma?.def?.dispersion ?? 2) * (j.mods?.dispersion ?? 1);
      r.bloom = Math.max(0, r.bloom - dt * 4.5);
      const objetivo = limitar(0.28 + Math.sqrt(disp) * 0.34 + r.bloom * 0.7, 0.3, 4.2);
      r.gap += (objetivo - r.gap) * Math.min(1, dt * 14);
      estilo(r.el, '--gap', r.gap.toFixed(3) + 'em');
      clase(r.el, 'recarga', !!j.arma?.recargando);
    }
    const quiero = oculto0 && jugando;
    if (quiero !== cursorOculto) { cursorOculto = quiero; juego.contenedor.classList.toggle('ez-cursor-oculto', quiero); }
  }

  return {
    actualizar(dt) {
      const jugando = est.fase !== 'menu';
      if (!jugando) { juego.contenedor.classList.remove('ez-cursor-oculto'); cursorOculto = false; return; }
      actualizarFlotantes(dt);
      actualizarDirs(dt);
      for (const j of juego.jugadores) { actualizarEtq(j); actualizarInter(j); }
      for (const [i, e] of etqs) if (!juego.jugadores.some((j) => j.indice === i)) visible(e.el, false);
      for (const [i, e] of inters) if (!juego.jugadores.some((j) => j.indice === i)) visible(e.el, false);
      actualizarMarcadores();
      actualizarEstructuras();
      actualizarRets(dt);
    },
    destruir() { removeEventListener('pointermove', alRaton); juego.contenedor.classList.remove('ez-cursor-oculto'); mundo.remove(); },
  };
}
