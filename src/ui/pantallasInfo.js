// Pantallas informativas y de ajustes: bestiario (8 clases y 6 jefes), controles y opciones.
import { ERAS } from '../datos/eras.js';
import { ROLES } from '../datos/roles.js';
import { ZOMBIS, LISTA_ZOMBIS, JEFES } from '../datos/zombis.js';
import { icono } from './iconos.js';
import { retratoRol, retratoZombi, retratoJefe } from './retratos.js';
import { CONTROLES, NOMBRE_COMPORTAMIENTO, NOMBRE_ATAQUE, NOMBRE_DANIO, DIFICULTADES, CALIDADES } from './textos.js';
import { PIE_AYUDA } from './comun.js';
import { html, contenido, texto, clase, estilo, escapar, decimal, numero, limitar, relanzar } from './util.js';

const TIPOS_VISIBLES = ['bala', 'perforante', 'explosivo', 'fuego', 'golpe', 'energia'];
const ICONO_DANIO = { bala: 'bala', perforante: 'perforante', explosivo: 'explosivo', fuego: 'fuego', golpe: 'golpe', energia: 'energia' };
const volver = (extra = '') => `<button type="button" class="btn mini" data-foco data-a="atras">${icono('atras')}<span>Volver</span></button>${extra}`;

function resistencias(res = {}) {
  return TIPOS_VISIBLES.map((t) => {
    const m = res[t] ?? 1;
    const tono = m < 0.95 ? 'resiste' : m > 1.05 ? 'vulnera' : 'normal';
    const w = limitar(Math.abs(m - 1) / 1.1, 0, 1) * 50;
    const barra = m < 1 ? `left:${50 - w}%;width:${w}%` : `left:50%;width:${w}%`;
    return `<div class="rs ${tono}"><span class="rs-n">${icono(ICONO_DANIO[t])}${escapar(NOMBRE_DANIO[t])}</span><div class="rs-barra"><i style="${barra}"></i></div><b class="num">×${decimal(m, 1)}</b></div>`;
  }).join('');
}
const chipsRol = (lista, tono) => (lista || []).map((id) => `<span class="chip ${tono}"><span class="chip-r" style="--rol:${ROLES[id]?.color ?? '#fff'}">${retratoRol(id)}</span>${escapar(ROLES[id]?.nombre ?? id)}</span>`).join('') || '<span class="tenue">—</span>';

// ══ Bestiario ══════════════════════════════════════════════════════════════════════════════════════════════════
export function crearBestiario(ctx, gestor) {
  const el = html(`
<section class="pn pn-bestiario" hidden>
  <header class="pn-cab">${volver()}<h2 class="titulo">Bestiario</h2>
    <div class="bs-tabs"><button type="button" class="btn mini sel" data-foco data-t="zombis">${icono('calavera')}<span>Infectados</span></button><button type="button" class="btn mini" data-foco data-t="jefes">${icono('corona')}<span>Jefes</span></button></div></header>
  <div class="bs-cuerpo"><div class="bs-lista"></div><div class="bs-det panel orn"></div></div>
  ${PIE_AYUDA}
</section>`);
  const lista = el.querySelector('.bs-lista'), det = el.querySelector('.bs-det');
  const tabs = Array.from(el.querySelectorAll('[data-t]'));
  const S = { tab: 'zombis', id: 'caminante' };

  function pintarLista() {
    const items = S.tab === 'zombis' ? LISTA_ZOMBIS : Object.values(JEFES);
    contenido(lista, items.map((z) => `<button type="button" class="bs-ficha${z.id === S.id ? ' sel' : ''}" data-foco data-id="${z.id}" style="--c:${z.color ?? '#ff6a5f'}">
      <span class="bs-retr">${S.tab === 'zombis' ? retratoZombi(z.id) : retratoJefe(z.id)}</span><span class="bs-nombre titulo">${escapar(z.nombre)}</span>
      <span class="bs-sub">${S.tab === 'zombis' ? 'Desde el día ' + z.desdeDia : ERAS[z.era]?.nombre ?? ''}</span></button>`).join(''));
    tabs.forEach((t) => clase(t, 'sel', t.dataset.t === S.tab));
    el.dataset.tab = S.tab;
  }
  function pintarDetalle() {
    if (S.tab === 'zombis') {
      const z = ZOMBIS[S.id] ?? LISTA_ZOMBIS[0];
      contenido(det, `
        <div class="bd-cab"><div class="bd-retr" style="--c:${z.color}">${retratoZombi(z.id)}</div>
          <div class="bd-id"><div class="bd-nombre titulo">${escapar(z.nombre)}</div>
            <div class="bd-chips"><span class="chip">${icono('calavera')}${escapar(NOMBRE_COMPORTAMIENTO[z.comportamiento] ?? z.comportamiento)}</span><span class="chip">${icono('sol')}Desde el día ${z.desdeDia}</span></div>
            <p class="bd-desc">${escapar(z.descripcion)}</p></div></div>
        <div class="bd-cifras"><div><span class="rotulo">Vida</span><b class="num">${numero(z.vida)}</b></div><div><span class="rotulo">Velocidad</span><b class="num">${decimal(z.velocidad)} m/s</b></div><div><span class="rotulo">Daño</span><b class="num">${z.danio}</b></div><div><span class="rotulo">Puntos</span><b class="num">${z.puntos}</b></div></div>
        <div class="bd-consejo">${icono('estrella')}<p><b>Consejo.</b> ${escapar(z.consejo)}</p></div>
        <div class="bd-cols"><div><div class="rotulo">Resistencias por tipo de daño</div><div class="rs-lista">${resistencias(z.resistencias)}</div>
          <div class="rs-leyenda rotulo"><span class="resiste">◄ Resiste</span><span class="vulnera">Vulnerable ►</span></div></div>
          <div><div class="rotulo malo-t">Contrarresta a</div><div class="bd-roles">${chipsRol(z.counterDe, 'malo')}</div>
          <div class="rotulo bueno-t" style="margin-top:.8em">Es débil ante</div><div class="bd-roles">${chipsRol(z.debilAnte, 'bueno')}</div></div></div>`);
    } else {
      const j = JEFES[S.id] ?? JEFES.coracero;
      contenido(det, `
        <div class="bd-cab"><div class="bd-retr" style="--c:#ff6a5f">${retratoJefe(j.id)}</div>
          <div class="bd-id"><div class="bd-nombre titulo">${escapar(j.nombre)}</div><div class="bd-tit">${escapar(j.titulo)}</div>
            <div class="bd-chips"><span class="chip">${icono('corona')}${j.final ? 'Jefe final · año 2100' : 'Jefe de la ' + escapar(ERAS[j.era].nombre)}</span></div>
            <p class="bd-desc">${escapar(j.descripcion)}</p></div></div>
        <div class="bd-cifras"><div><span class="rotulo">Vida</span><b class="num">${numero(j.vida)}</b></div><div><span class="rotulo">Velocidad</span><b class="num">${decimal(j.velocidad)} m/s</b></div><div><span class="rotulo">Daño</span><b class="num">${j.danio}</b></div><div><span class="rotulo">Puntos</span><b class="num">${numero(j.puntos)}</b></div></div>
        <div class="bd-cols"><div><div class="rotulo">Resistencias por tipo de daño</div><div class="rs-lista">${resistencias(j.resistencias)}</div>
          <div class="rs-leyenda rotulo"><span class="resiste">◄ Resiste</span><span class="vulnera">Vulnerable ►</span></div></div>
          <div><div class="rotulo">Ataques</div><div class="bd-roles">${j.ataques.map((a) => `<span class="chip">${escapar(NOMBRE_ATAQUE[a] ?? a)}</span>`).join('')}</div>
          <div class="bd-consejo" style="margin-top:.8em">${icono('estrella')}<p><b>Consejo.</b> ${j.final ? 'Destruye su núcleo cuando se exponga y no te quedes sin munición: la horda no cesa.' : 'Mantente en movimiento, aprovecha el escenario y reserva tu habilidad para sus ataques más duros.'}</p></div></div></div>`);
    }
    relanzar(det, 'anim-fundido');
  }
  function pintar() { pintarLista(); pintarDetalle(); }

  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-a="atras"]')) { gestor.atras(); return; }
    const tab = t.closest('[data-t]');
    if (tab) { S.tab = tab.dataset.t; S.id = S.tab === 'zombis' ? 'caminante' : 'coracero'; pintar(); return; }
    const f = t.closest('.bs-ficha'); if (f) { S.id = f.dataset.id; pintar(); }
  });
  el.addEventListener('pointerover', (ev) => { const f = ev.target.closest('.bs-ficha'); if (f && f.dataset.id !== S.id) { S.id = f.dataset.id; lista.querySelectorAll('.bs-ficha').forEach((x) => clase(x, 'sel', x === f)); pintarDetalle(); } });
  let focoPrev = null;
  return {
    el, foco: '.bs-ficha.sel', alAbrir() { pintar(); },
    actualizar() {
      const f = ctx.nav.foco;
      if (f !== focoPrev) { focoPrev = f; if (f?.classList?.contains('bs-ficha') && el.contains(f) && f.dataset.id !== S.id) { S.id = f.dataset.id; lista.querySelectorAll('.bs-ficha').forEach((x) => clase(x, 'sel', x === f)); pintarDetalle(); } }
    },
  };
}

// ══ Controles ══════════════════════════════════════════════════════════════════════════════════════════════════
export function crearControles(ctx, gestor) {
  const filas = [...CONTROLES, { accion: 'Minimapa', teclas: ['M'], mando: [] }];
  const el = html(`
<section class="pn pn-controles" hidden>
  <header class="pn-cab">${volver()}<h2 class="titulo">Controles</h2></header>
  <div class="ct-caja panel orn">
    <div class="ct-cab rotulo"><span>Acción</span><span>${icono('teclado')} Teclado y ratón</span><span>${icono('mando')} Mando</span></div>
    ${filas.map((f) => `<div class="ct-fila"><span class="ct-a">${escapar(f.accion)}</span><span class="ct-t">${f.teclas.map((k) => `<span class="tecla">${escapar(k)}</span>`).join('')}</span><span class="ct-m">${f.mando.length ? f.mando.map((k) => `<span class="tecla mando">${escapar(k)}</span>`).join('') : '<span class="tenue">—</span>'}</span></div>`).join('')}
    <div class="ct-nota"><b>Dos jugadores.</b> El jugador 1 usa teclado y ratón (o un mando). El jugador 2 se une con un mando desde la selección de rol (botón <span class="tecla mando">Y</span>).</div>
  </div>
  ${PIE_AYUDA}
</section>`);
  el.addEventListener('click', (ev) => { if (ev.target.closest('[data-a="atras"]')) gestor.atras(); });
  return { el, foco: '[data-a="atras"]' };
}

// ══ Opciones ═══════════════════════════════════════════════════════════════════════════════════════════════════
export function crearOpciones(ctx, gestor) {
  const A = ctx.ajustes;
  const VOLS = [['Maestro', 0], ['Música', 1], ['Efectos', 2]];
  const el = html(`
<section class="pn pn-opciones" hidden>
  <header class="pn-cab">${volver()}<h2 class="titulo">Opciones</h2></header>
  <div class="op-caja panel orn">
    <div class="op-sec"><div class="rotulo">Dificultad</div><div class="op-fila">${DIFICULTADES.map((d) => `<button type="button" class="btn mini" data-foco data-dif="${d.id}"><span>${escapar(d.nombre)}</span></button>`).join('')}</div><div class="op-nota" data-nota="dif"></div></div>
    <div class="op-sec"><div class="rotulo">Calidad gráfica</div><div class="op-fila">${CALIDADES.map((c) => `<button type="button" class="btn mini" data-foco data-cal="${c.id}"><span>${escapar(c.nombre)}</span></button>`).join('')}</div></div>
    <div class="op-sec"><div class="rotulo">Volumen</div>${VOLS.map(([n, i]) => `<div class="op-vol"><span>${n}</span><div class="slider" data-foco data-vol="${i}" role="slider" tabindex="-1"><i></i><b></b></div><span class="op-v num"></span></div>`).join('')}</div>
    <div class="op-sec"><div class="rotulo">Interfaz</div><div class="op-fila">
      <button type="button" class="btn mini" data-foco data-tg="minimapa">${icono('mapa')}<span>Minimapa</span><b class="op-onoff"></b></button>
      <button type="button" class="btn mini" data-foco data-tg="numeros">${icono('danio')}<span>Números de daño</span><b class="op-onoff"></b></button></div></div>
  </div>
  ${PIE_AYUDA}
</section>`);
  const sliders = Array.from(el.querySelectorAll('.slider'));
  const nota = el.querySelector('[data-nota="dif"]');
  function pintar() {
    el.querySelectorAll('[data-dif]').forEach((b) => clase(b, 'sel', b.dataset.dif === A.dificultad));
    el.querySelectorAll('[data-cal]').forEach((b) => clase(b, 'sel', b.dataset.cal === A.calidad));
    el.querySelectorAll('[data-tg]').forEach((b) => { const on = !!A[b.dataset.tg]; clase(b, 'sel', on); texto(b.querySelector('.op-onoff'), on ? 'Sí' : 'No'); });
    sliders.forEach((s) => { const v = A.vol[Number(s.dataset.vol)]; estilo(s.querySelector('i'), 'width', Math.round(v * 100) + '%'); texto(s.parentNode.querySelector('.op-v'), Math.round(v * 100) + ' %'); s.setAttribute('aria-valuenow', Math.round(v * 100)); });
    texto(nota, DIFICULTADES.find((d) => d.id === A.dificultad)?.nota ?? '');
  }
  function guardar() { ctx.guardarAjustes(); ctx.aplicarAjustes(); pintar(); }
  function fijarVol(s, v) { A.vol[Number(s.dataset.vol)] = limitar(Math.round(v * 20) / 20, 0, 1); guardar(); }
  sliders.forEach((s) => {
    s.__ajustar = (d) => fijarVol(s, A.vol[Number(s.dataset.vol)] + d * 0.05);
    const desde = (ev) => { const r = s.getBoundingClientRect(); fijarVol(s, (ev.clientX - r.left) / r.width); };
    s.addEventListener('pointerdown', (ev) => { s.setPointerCapture?.(ev.pointerId); desde(ev); s.__arr = true; });
    s.addEventListener('pointermove', (ev) => { if (s.__arr) desde(ev); });
    s.addEventListener('pointerup', () => { s.__arr = false; });
  });
  el.addEventListener('click', (ev) => {
    const t = ev.target;
    if (t.closest('[data-a="atras"]')) { gestor.atras(); return; }
    const d = t.closest('[data-dif]'); if (d) { A.dificultad = d.dataset.dif; guardar(); return; }
    const c = t.closest('[data-cal]'); if (c) { A.calidad = c.dataset.cal; guardar(); return; }
    const g = t.closest('[data-tg]'); if (g) { A[g.dataset.tg] = !A[g.dataset.tg]; guardar(); }
  });
  return { el, foco: '[data-dif]', alAbrir() { pintar(); } };
}
