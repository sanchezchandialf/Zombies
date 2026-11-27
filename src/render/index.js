// Sistema de Render de ERA Z. API del contrato en docs/ARQUITECTURA.md §Render, más extras documentados al final.
// Piezas: ambientes.js (paletas de era) · cielo.js (cielo + PMREM) · luces.js (sol/luna, sombras, luces puntuales)
//         clima.js (partículas GPU) · camara.js (cámara de juego) · postproceso.js (AO, bloom, gradación, transición).
import * as THREE from 'three';
import { ERAS } from '../datos/eras.js';
import { AMBIENTES, crearEstadoAtmosfera, muestrearAtmosfera, acercarAtmosfera, copiarAtmosfera } from './ambientes.js';
import { crearCielo, crearEntorno } from './cielo.js';
import { crearLuces, MAX_PUNTUALES } from './luces.js';
import { crearClima } from './clima.js';
import { crearCamaraJuego } from './camara.js';
import { crearPostproceso } from './postproceso.js';
import { prepararRecorte, actualizarRecorte, RECORTE } from './recorte.js';

const CALIDADES = {
  baja:  { pr: 1,    sombra: 1024, ao: false, aoN: 8,  bloom: 3, msaa: 0, fxaa: true,  puntuales: 4,  clima: 0.4 },
  media: { pr: 1.25, sombra: 2048, ao: true,  aoN: 8,  bloom: 4, msaa: 0, fxaa: true,  puntuales: 8,  clima: 0.7 },
  alta:  { pr: 1.5,  sombra: 2048, ao: true,  aoN: 12, bloom: 5, msaa: 4, fxaa: false, puntuales: 12, clima: 1 },
  ultra: { pr: 2,    sombra: 4096, ao: true,  aoN: 16, bloom: 5, msaa: 4, fxaa: false, puntuales: 12, clima: 1 },
};

const BLANCO = new THREE.Color(1, 1, 1);
const mod1 = (x) => ((x % 1) + 1) % 1;
const ease = (t) => t * t * (3 - 2 * t);

export function crearRender(juego) {
  const renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', stencil: false, alpha: false });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // el postproceso aplica ACES; se declara por coherencia con el resto
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.setClearColor(0x000000, 1);
  const lienzo = renderer.domElement;
  lienzo.style.cssText = 'display:block;width:100%;height:100%';
  juego.contenedor.appendChild(lienzo);

  const escena = new THREE.Scene();
  escena.fog = new THREE.FogExp2(0x8899aa, 0.014);
  const camara = new THREE.PerspectiveCamera(35, 16 / 9, 0.4, 450);
  camara.position.set(0, 21, 15); camara.lookAt(0, 0.7, 0);

  const cielo = crearCielo();
  escena.add(cielo.malla);
  const entorno = crearEntorno(renderer, escena, cielo);
  const luces = crearLuces(escena);
  // Luz de acción: relleno suave sin sombra que acompaña al foco de la cámara (los jugadores). Crea un charco de luz
  // donde ocurre la acción y deja la periferia en penumbra atmosférica; crece de noche para que nada se pierda.
  const luzAccion = new THREE.PointLight(0xffffff, 0, 48, 1.55);
  luzAccion.name = 'luzAccion'; escena.add(luzAccion);
  const colAccion = new THREE.Color();
  const clima = crearClima(escena, juego.rng ? () => juego.rng() : Math.random);
  const rig = crearCamaraJuego(camara);
  const post = crearPostproceso(renderer);

  // ── estado atmosférico
  const act = crearEstadoAtmosfera(), tgt = crearEstadoAtmosfera();
  const ambienteActual = {
    eraIdx: juego.estado?.eraIdx ?? 0, era: ERAS[juego.estado?.eraIdx ?? 0], def: AMBIENTES[0], hora: juego.opciones?.hora ?? juego.estado?.hora ?? 0.5,
    noche: 0, lluvia: false, clima: null, intensidadClima: 1,
    // referencias vivas a los valores suavizados (solo lectura para FX)
    colorNiebla: act.niebla, colorCielo: act.cenit, colorHorizonte: act.horizonte, colorLuz: luces.sol.color, atm: act,
  };
  let eraObj = ambienteActual.eraIdx, horaObj = ambienteActual.hora, hora = horaObj;
  let copiar = true, climaOpc = 'auto', climaCant = 1, luzFlash = 0, tFlash = 6 + Math.random() * 6;
  let relampagoCola = 0;
  const flashPantalla = { v: 0, dur: 0.3, t: 0, color: new THREE.Color(1, 1, 1) };
  let calidadNivel = 'alta', cfg = CALIDADES.alta;
  let cssW = juego.contenedor.clientWidth || innerWidth, cssH = juego.contenedor.clientHeight || innerHeight;
  let hecho = false;
  let seguidos = [];

  // ── transición de era
  let trans = null; // { fase:'entrada'|'medio'|'salida', t, alMedio, resolver }
  let transValor = 0;
  const transColor = new THREE.Color(0.4, 0.8, 1);

  const centroVista = new THREE.Vector3();
  const rc = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2();
  const _v = new THREE.Vector3(), _w = new THREE.Vector3();
  const P = {
    exp: 1, bloom: 0.5, umbral: 1, ao: 0.8, aoRadio: 1, sat: 1, contraste: 1, vineta: 0.4, grano: 0.03, aberracion: 0.0015,
    sombras: act.sombras, luces: act.luces, tiempo: 0, trans: 0, transColor, flash: 0, flashColor: flashPantalla.color,
  };

  function aplicarCalidad(nivel) {
    if (!CALIDADES[nivel]) nivel = 'alta';
    calidadNivel = nivel; cfg = CALIDADES[nivel];
    if (juego.opciones) juego.opciones.calidad = nivel;
    const msaa = Math.min(cfg.msaa, renderer.capabilities.maxSamples || 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, cfg.pr));
    luces.tamanoSombra(cfg.sombra);
    luces.puntualesActivas(cfg.puntuales);
    clima.escala(cfg.clima);
    post.configurar({ samples: msaa, ao: cfg.ao, aoMuestras: cfg.aoN, bloomNiveles: cfg.bloom, fxaa: cfg.fxaa });
    api.redimensionar(cssW, cssH);
  }

  function climaDeseado() {
    if (climaOpc === false || climaOpc === 'ninguno') return null;
    return climaOpc === 'auto' ? ambienteActual.def.clima.tipo : climaOpc;
  }

  function actualizarCentroVista() {
    // punto del suelo hacia el que mira la cámara (centro de pantalla): ancla sombras, clima y luces
    _v.set(0, 0, -1).applyQuaternion(camara.quaternion);
    if (_v.y < -0.05) {
      const t = -camara.position.y / _v.y;
      centroVista.copy(camara.position).addScaledVector(_v, Math.min(t, 80));
    } else centroVista.copy(camara.position).addScaledVector(_v, 30);
    centroVista.y = 0;
  }

  const api = {
    siempre: true, escena, camara, renderer, camaraExterna: false,
    sol: luces.sol, hemisferica: luces.hemi, ambienteActual, cielo, luces, clima, postproceso: post,
    get hora() { return hora; },
    get calidadActual() { return calidadNivel; },

    iniciar() {
      cssW = juego.contenedor.clientWidth || innerWidth; cssH = juego.contenedor.clientHeight || innerHeight;
      aplicarCalidad(juego.opciones?.calidad ?? 'alta');
      if (juego.opciones?.hora !== undefined) { horaObj = hora = mod1(Number(juego.opciones.hora)); }
      if (juego.opciones?.era !== undefined) { eraObj = ambienteActual.eraIdx = Number(juego.opciones.era); }
      copiar = true;
    },

    redimensionar(w, h) {
      cssW = Math.max(2, w | 0); cssH = Math.max(2, h | 0);
      renderer.setSize(cssW, cssH, false);
      camara.aspect = cssW / cssH; camara.updateProjectionMatrix();
      const b = renderer.getDrawingBufferSize(new THREE.Vector2());
      post.redimensionar(b.x, b.y);
    },

    /** Atmósfera completa de la era: cielo, niebla, luces, gradación y clima. opciones: { inmediato, clima: 'auto'|false|tipo, intensidadClima, hora } */
    establecerAmbiente(eraIdx, opciones = {}) {
      eraObj = Math.max(0, Math.min(AMBIENTES.length - 1, eraIdx | 0));
      if (opciones.clima !== undefined) climaOpc = opciones.clima;
      if (opciones.intensidadClima !== undefined) climaCant = opciones.intensidadClima;
      if (opciones.hora !== undefined) api.establecerHora(opciones.hora, opciones.inmediato);
      if (opciones.inmediato || !hecho || (trans && transValor > 0.85)) copiar = true;
      ambienteActual.eraIdx = eraObj; ambienteActual.era = ERAS[eraObj]; ambienteActual.def = AMBIENTES[eraObj];
    },

    /** 0 amanecer · 0.25 mediodía · 0.5 atardecer · 0.75 medianoche. Interpola por el camino corto; `inmediato` salta. */
    establecerHora(h, inmediato = false) {
      if (!isFinite(h)) return;
      horaObj = mod1(h);
      if (inmediato || !hecho) { hora = horaObj; copiar = true; }
    },

    seguir(objetivos) { seguidos = objetivos || []; rig.seguir(objetivos); },
    sacudir(fuerza, duracion) { rig.sacudir(fuerza, duracion); },
    retroceso(dx, dz, fuerza) { rig.retroceso(dx, dz, fuerza); },
    /** factor < 1 acerca, > 1 aleja (multiplica la distancia) durante `duracion` s y vuelve solo. */
    zoom(factor, duracion) { rig.zoom(factor, duracion); },
    camaraMenu(activo) { rig.menu(activo); },

    transicionEra(alMedio) {
      return new Promise((resolver) => {
        if (trans) { // ya hay una en curso: encadena la petición al cierre de la actual
          Promise.resolve().then(() => alMedio?.()).finally(resolver);
          return;
        }
        trans = { fase: 'entrada', t: 0, alMedio, resolver };
      });
    },

    puntoEnSuelo(clientX, clientY, y = 0, out = new THREE.Vector3()) {
      const r = lienzo.getBoundingClientRect();
      ndc.set(((clientX - r.left) / (r.width || 1)) * 2 - 1, -((clientY - r.top) / (r.height || 1)) * 2 + 1);
      camara.updateMatrixWorld();
      rc.setFromCamera(ndc, camara); plano.constant = -y;
      return rc.ray.intersectPlane(plano, out) || out.set(camara.position.x, y, camara.position.z - 30);
    },

    /** Mundo → píxeles CSS relativos al lienzo. */
    proyectar(pos, out = { x: 0, y: 0, visible: true }) {
      camara.updateMatrixWorld();
      _w.set(pos.x, pos.y ?? 0, pos.z).project(camara);
      out.x = (_w.x * 0.5 + 0.5) * cssW; out.y = (-_w.y * 0.5 + 0.5) * cssH;
      out.visible = _w.z < 1 && _w.z > -1 && Math.abs(_w.x) < 1.2 && Math.abs(_w.y) < 1.2;
      return out;
    },

    /** Luz local sin sombra. `intensidad` en candelas (PointLight, caída cuadrática): farol ≈ 8–20, explosión ≈ 150–400. */
    luzPuntual(o) { return luces.luzPuntual(o); },

    calidad(nivel) { aplicarCalidad(nivel); },

    // ── API añadida (no está en el contrato)
    /** Fuerza un relámpago / fogonazo ambiental de intensidad 0..1. */
    relampago(fuerza = 1) { luzFlash = Math.max(luzFlash, fuerza); },
    /** Destello de color sobre toda la pantalla (daño, curación…): fuerza 0..1, duración s. */
    destelloPantalla(color = 0xffffff, fuerza = 0.4, duracion = 0.25) {
      flashPantalla.color.set(color); flashPantalla.v = fuerza; flashPantalla.dur = Math.max(0.05, duracion); flashPantalla.t = 0;
    },
    /** Cambia el clima: 'auto' (el de la era), false/'ninguno', o 'niebla'|'polvo'|'lluvia'|'neon'|'ceniza'|'luminosa'. */
    establecerClima(tipo = 'auto', cantidad = 1) { climaOpc = tipo; climaCant = cantidad; },
    /** Punto del suelo al que mira la cámara (ancla de sombras/clima). */
    get centroVista() { return centroVista; },
    get camaraJuego() { return rig; },
    get transicionActiva() { return !!trans; },
    /** Hace recortables (agujero sobre el jugador) los materiales de las mallas de `obj` (lo llama el kit al cerrar el mapa). */
    prepararRecorte(obj) { prepararRecorte(obj); },
    /** Uniformes del recorte de oclusores (uRecR radio en m, uRecAlt altura mínima, uRecFuerza 0..1). */
    recorte: RECORTE,
    /** Luz de relleno que sigue a la acción (multiplicador de intensidad; 0 la apaga). */
    luzAccion, luzAccionFactor: 1,

    actualizar() {
      const dtR = Math.min(juego.tiempo?.dtReal ?? 0.016, 0.1);
      const tReal = juego.tiempo?.real ?? 0;

      // hora (camino corto) y atmósfera objetivo
      let dh = ((horaObj - hora + 1.5) % 1) - 0.5; if (dh < -0.5) dh += 1;
      if (Math.abs(dh) < 1e-5) hora = horaObj; else hora = mod1(hora + dh * (1 - Math.exp(-3.2 * dtR)));
      ambienteActual.hora = hora;
      const def = muestrearAtmosfera(eraObj, hora, tgt);
      ambienteActual.def = def; ambienteActual.eraIdx = eraObj; ambienteActual.era = ERAS[eraObj];
      const forzado = copiar;
      if (copiar) { copiarAtmosfera(act, tgt); copiar = false; hecho = true; }
      else acercarAtmosfera(act, tgt, 1 - Math.exp(-3 * dtR));

      // relámpagos (eras con artillería/tormenta) y fogonazos
      if (def.relampagos && !trans) {
        tFlash -= dtR;
        if (tFlash <= 0) { luzFlash = 0.55 + Math.random() * 0.45; relampagoCola = Math.random() < 0.6 ? 0.12 + Math.random() * 0.2 : 0; tFlash = 5 + Math.random() * 11; }
      }
      if (relampagoCola > 0 && luzFlash < 0.2) { relampagoCola -= dtR; if (relampagoCola <= 0) luzFlash = 0.5; }
      luzFlash = Math.max(0, luzFlash - dtR * 3.2);
      const flash = luzFlash * luzFlash;

      // cámara
      rig.actualizar(dtR, !api.camaraExterna);
      camara.updateMatrixWorld();
      actualizarCentroVista();
      actualizarRecorte(camara, rig.menuActivo || api.camaraExterna ? null : seguidos);

      // niebla, luces, cielo
      luces.actualizarAstros(act, hora, centroVista, flash);
      luces.actualizarPuntuales(dtR, centroVista);
      const noche = luces.info.noche;
      ambienteActual.noche = noche;
      // penumbra (sol bajo o ausente): la luz de acción toma el relevo con el tono del cielo y un punto cálido
      const penumbra = Math.max(noche, 1 - Math.min(1, luces.info.f * 2.2));
      colAccion.copy(act.hemiC).lerp(BLANCO, 0.55).lerp(act.sol, 0.15 * (1 - noche));
      luzAccion.color.copy(colAccion);
      luzAccion.intensity = (30 + 150 * penumbra) * (api.luzAccionFactor ?? 1);
      // alta y del lado de la cámara: ilumina las caras que vemos y su reflejo especular cae fuera de cuadro
      luzAccion.position.set(rig.foco.x, 16, rig.foco.z + 9);
      escena.fog.color.copy(act.niebla); escena.fog.density = act.nieblaD;
      escena.environmentIntensity = act.envI * (1 + flash * 0.6);
      cielo.actualizar(act, luces.solDir, luces.lunaDir, noche, tReal, flash);
      entorno.actualizar(dtR);

      // clima
      const tipoClima = climaDeseado();
      clima.establecer(tipoClima, climaCant, act, forzado);
      ambienteActual.clima = tipoClima; ambienteActual.intensidadClima = climaCant;
      ambienteActual.lluvia = tipoClima === 'lluvia' || tipoClima === 'neon' || tipoClima === 'luminosa';
      clima.actualizar(dtR, tReal, centroVista, act, 0.42 + 0.7 * (1 - noche));

      // transición de era
      if (trans) {
        if (trans.fase === 'entrada') {
          trans.t += dtR / 0.85; transValor = ease(Math.min(1, trans.t));
          if (trans.t >= 1) {
            trans.fase = 'medio'; transValor = 1;
            const fin = () => { trans.fase = 'salida'; trans.t = 0; };
            try { Promise.resolve(trans.alMedio?.()).then(fin, (e) => { console.error('[render] transicionEra', e); fin(); }); }
            catch (e) { console.error('[render] transicionEra', e); fin(); }
          }
        } else if (trans.fase === 'salida') {
          trans.t += dtR / 1.15; transValor = 1 - ease(Math.min(1, trans.t));
          if (trans.t >= 1) { const r = trans.resolver; trans = null; transValor = 0; r(); }
        }
      }
      const eraCol = ERAS[eraObj]?.color; if (eraCol) transColor.set(eraCol).multiplyScalar(1.6).lerp(BLANCO, 0.25);

      // destello de pantalla
      if (flashPantalla.v > 0) { flashPantalla.t += dtR; if (flashPantalla.t >= flashPantalla.dur) flashPantalla.v = 0; }
      const fp = flashPantalla.v > 0 ? flashPantalla.v * Math.pow(1 - flashPantalla.t / flashPantalla.dur, 2) : 0;

      // postproceso
      P.exp = act.exp * (1 + flash * 0.3); P.bloom = act.bloom; P.umbral = act.umbral; P.ao = act.ao; P.aoRadio = act.aoRadio;
      P.sat = act.sat; P.contraste = act.contraste; P.vineta = act.vineta; P.grano = act.grano; P.aberracion = act.aberracion;
      P.tiempo = tReal; P.trans = transValor; P.flash = fp;
      post.render(escena, camara, P);
    },

    liberar() {
      clima.liberar(); entorno.liberar(); cielo.liberar(); luces.liberar(); post.liberar();
      renderer.dispose(); lienzo.remove();
    },
  };
  return api;
}
