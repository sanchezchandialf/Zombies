// Pausa (Esc / P / Start) y pantalla de fin de partida.
import { ERAS } from '../datos/eras.js';
import { ROLES } from '../datos/roles.js';
import { DIFICULTADES } from './textos.js';
import { icono } from './iconos.js';
import { retratoRol } from './retratos.js';
import { html, texto, contenido, visible, escapar, numero, reloj, limitar, relanzar } from './util.js';

export function crearPausa(ctx) {
  const { juego, capas } = ctx;
  const est = juego.estado;
  const capa = capas.pausa;

  // ══ Pausa ══════════════════════════════════════════════════════════════════════════════════════════════════════
  const pausa = html(`
<div class="ps" hidden>
  <div class="ps-caja panel orn">
    <div class="ps-tit titulo">Pausa</div>
    <div class="ps-sub rotulo"></div>
    <hr class="sep">
    <nav class="ps-lista">
      <button type="button" class="btn" data-foco data-a="continuar">${icono('jugar')}<span>Continuar</span></button>
      <button type="button" class="btn" data-foco data-a="opciones">${icono('engranaje')}<span>Opciones</span></button>
      <button type="button" class="btn" data-foco data-a="controles">${icono('teclado')}<span>Controles</span></button>
      <button type="button" class="btn" data-foco data-a="bestiario">${icono('libro')}<span>Bestiario</span></button>
      <button type="button" class="btn" data-foco data-a="menu">${icono('flecha')}<span>Abandonar partida</span></button>
    </nav>
    <div class="ps-confirma" hidden>
      <div class="ps-confirma-t">¿Abandonar la partida y volver al menú? Se perderá el progreso de esta partida.</div>
      <div class="ps-confirma-b"><button type="button" class="btn mini" data-foco data-a="menu-si">Sí, abandonar</button><button type="button" class="btn mini" data-foco data-a="menu-no">No, seguir</button></div>
    </div>
    <div class="ps-ayuda rotulo"><span class="tecla">Esc</span> continuar</div>
  </div>
</div>`);
  capa.appendChild(pausa);
  const subPausa = pausa.querySelector('.ps-sub'), confirma = pausa.querySelector('.ps-confirma'), lista = pausa.querySelector('.ps-lista');

  function abrirPausa() {
    const era = ERAS[est.eraIdx] || ERAS[0];
    texto(subPausa, est.dia > 0 ? `Día ${est.dia} · Año ${est.anio} · ${era.nombre}` : era.nombre);
    visible(confirma, false); visible(lista, true);
    visible(pausa, true); relanzar(pausa, 'anim-fundido');
    ctx.nav.empujar(pausa, { atras: () => continuar(), foco: '[data-a="continuar"]' });
  }
  function cerrarPausa() { visible(pausa, false); ctx.nav.sacar(pausa); }
  function continuar() { juego.pausar(false); }

  pausa.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a;
    if (a === 'continuar') continuar();
    else if (a === 'opciones' || a === 'controles' || a === 'bestiario') ctx.pantallas?.abrir?.(a, { desde: 'pausa' });
    else if (a === 'menu') { visible(lista, false); visible(confirma, true); ctx.nav.enfocar(confirma.querySelector('[data-a="menu-no"]')); }
    else if (a === 'menu-no') { visible(confirma, false); visible(lista, true); ctx.nav.enfocar(lista.querySelector('[data-a="menu"]')); }
    else if (a === 'menu-si') { juego.pausar(false); ctx.emitir('ui:menu', {}); }
  });

  ctx.en('juego:pausa', (d) => {
    if (d.pausado && (est.fase === 'jugando' || est.fase === 'intermedio' || est.fase === 'transicion')) abrirPausa();
    else cerrarPausa();
  });

  // Esc / P alternan la pausa durante la partida (la entrada del juego no lo hace: se desactivó en index.js).
  const onTecla = (ev) => {
    if (ev.repeat || (ev.code !== 'Escape' && ev.code !== 'KeyP')) return;
    if (ctx.pantallas?.abierta?.()) return; // un submenú abierto consume Esc para volver atrás
    if (est.fase !== 'jugando' && est.fase !== 'intermedio') return;
    if (est.pausado && ev.code === 'Escape' && !pausa.hidden && !confirma.hidden) { visible(confirma, false); visible(lista, true); return; }
    juego.pausar(!est.pausado);
  };
  addEventListener('keydown', onTecla);
  const quitaNav = ctx.nav.suscribir(({ accion }) => {
    if (accion !== 'start') return false;
    if (est.fase === 'jugando' || est.pausado) { if (ctx.pantallas?.abierta?.()) return false; juego.pausar(!est.pausado); return true; }
    return false;
  });
  // Al perder el foco de la ventana durante la partida se pausa sola.
  const onVis = () => { if (document.hidden && est.fase === 'jugando' && !est.pausado) juego.pausar(true); };
  document.addEventListener('visibilitychange', onVis);

  // ══ Fin de partida ═════════════════════════════════════════════════════════════════════════════════════════════
  const fin = html(`
<div class="fn" hidden>
  <div class="fn-fondo"></div>
  <div class="fn-caja panel orn">
    <div class="fn-sello rotulo"></div>
    <div class="fn-titulo titulo"></div>
    <div class="fn-epitafio"></div>
    <div class="fn-puntos"><span class="fn-pts num">0</span><span class="rotulo">puntos</span><span class="fn-record" hidden>${icono('corona')}Nuevo récord</span></div>
    <div class="fn-record-ant rotulo" hidden></div>
    <div class="fn-stats"></div>
    <div class="fn-roles"></div>
    <div class="fn-acciones">
      <button type="button" class="btn primario" data-foco data-a="reintentar">${icono('recarga')}<span>Reintentar</span></button>
      <button type="button" class="btn" data-foco data-a="menu">${icono('flecha')}<span>Menú principal</span></button>
    </div>
  </div>
</div>`);
  capa.appendChild(fin);
  const F = { sello: fin.querySelector('.fn-sello'), titulo: fin.querySelector('.fn-titulo'), epi: fin.querySelector('.fn-epitafio'), pts: fin.querySelector('.fn-pts'), rec: fin.querySelector('.fn-record'), recAnt: fin.querySelector('.fn-record-ant'), stats: fin.querySelector('.fn-stats'), roles: fin.querySelector('.fn-roles') };
  let cuenta = null, mostrarEn = 0, pendiente = false;

  function pintarFin(d) {
    const r = d.resumen || {};
    const era = ERAS[r.eraIdx ?? est.eraIdx] || ERAS[0];
    fin.dataset.resultado = d.victoria ? 'victoria' : 'derrota';
    texto(F.sello, d.victoria ? 'La plaga ha terminado' : 'Fin de la partida');
    texto(F.titulo, d.victoria ? 'VICTORIA' : 'HAS CAÍDO');
    texto(F.epi, d.victoria
      ? `Tres siglos de pesadilla acaban en ${r.anio ?? 2100}. OMEGA ha caído y la escuadra sigue en pie.`
      : `Caíste el día ${r.dias ?? est.dia} del año ${r.anio ?? est.anio}, en la ${era.nombre}. Los muertos siguen su marcha.`);
    const dif = DIFICULTADES.find((x) => x.id === r.dificultad)?.nombre ?? '—';
    const filas = [
      ['Días superados', numero(r.diasSuperados ?? Math.max(0, (r.dias ?? 1) - 1)), 'sol'],
      ['Año alcanzado', r.anio ?? '—', 'tiempo'],
      ['Zombis abatidos', numero(r.bajas ?? 0), 'calavera'],
      ['Mejor racha', numero(r.mejorRacha ?? 0), 'critico'],
      ['Tiempo de partida', reloj(r.tiempo ?? 0), 'reloj'],
      ['Dificultad', dif, 'habilidad'],
    ];
    if (r.bonusVictoria) filas.push(['Bonus de victoria', '+' + numero(r.bonusVictoria), 'estrella']);
    contenido(F.stats, filas.map((f, i) => `<div class="fn-stat" style="--i:${i}">${icono(f[2])}<span>${f[0]}</span><b class="num">${escapar(f[1])}</b></div>`).join(''));
    contenido(F.roles, (r.roles || []).map((id, i) => `<div class="fn-rol" style="--rol:${ROLES[id]?.color ?? '#fff'}"><span class="fn-rol-retr">${retratoRol(id)}</span><span><b class="jug-tag num">J${i + 1}</b> ${escapar(ROLES[id]?.nombre ?? id)}</span></div>`).join(''));
    visible(F.rec, !!r.record);
    const ant = r.recordAnterior ?? 0;
    visible(F.recAnt, !r.record && ant > 0);
    if (!r.record && ant > 0) texto(F.recAnt, `Récord actual: ${numero(ant)}`);
    cuenta = { t: 0, dur: 1.6, hasta: r.puntos ?? est.puntos ?? 0 };
    texto(F.pts, '0');
  }

  ctx.en('partida:fin', (d) => {
    pintarFin(d);
    pendiente = true; mostrarEn = 1.1;
  });
  ctx.en('partida:inicio', () => cerrarFin());
  ctx.en('ui:menu', () => cerrarFin());
  function cerrarFin() { pendiente = false; visible(fin, false); ctx.nav.sacar(fin); }

  fin.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-a]'); if (!b) return;
    if (b.dataset.a === 'reintentar') { cerrarFin(); ctx.emitir('ui:reiniciar', {}); }
    else if (b.dataset.a === 'menu') { cerrarFin(); ctx.emitir('ui:menu', {}); }
  });

  return {
    actualizar(dt) {
      if (pendiente) {
        mostrarEn -= dt;
        if (mostrarEn <= 0) {
          pendiente = false;
          visible(fin, true); relanzar(fin, 'anim-fundido');
          ctx.nav.empujar(fin, { foco: '[data-a="reintentar"]' });
        }
      }
      if (cuenta && !fin.hidden) {
        cuenta.t += dt;
        const u = limitar(cuenta.t / cuenta.dur, 0, 1), e = 1 - Math.pow(1 - u, 3);
        texto(F.pts, numero(Math.round(cuenta.hasta * e)));
        if (u >= 1) cuenta = null;
      }
      // Si el estado vuelve al menú o a una partida nueva por otra vía, se cierran las capas.
      if (!fin.hidden && (est.fase === 'jugando' || est.fase === 'menu')) cerrarFin();
      if (!pausa.hidden && !est.pausado) cerrarPausa();
    },
    destruir() { removeEventListener('keydown', onTecla); document.removeEventListener('visibilitychange', onVis); quitaNav(); pausa.remove(); fin.remove(); },
  };
}
