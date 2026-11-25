// Recogidas y botín: 'botiquin', 'municion', 'potenciador' y mundo.soltarBotin(x, z, { suerte }).
// Flotan y giran con un haz de luz; el imán (jugador.mods.iman) las atrae; caducan con parpadeo.
//   mundo.crear('botiquin', { x, z, eraIdx?, cantidad?, duracion? })
import * as THREE from 'three';
import { registrarTipo } from './registro.js';
import { modeloCacheado, anilloSuelo, emitir, sonar } from './util.js';
import { botiquinEra, municionEra, potenciadorEra } from './modelos.js';

const TIPOS = {
  botiquin: { modelo: botiquinEra, color: 0x55ff8a, cantidad: 40, escala: 1.55, nombre: 'Botiquín' },
  municion: { modelo: municionEra, color: 0xff4a36, cantidad: 0.5, escala: 1.5, nombre: 'Munición' },
  potenciador: { modelo: potenciadorEra, color: 0xffc233, cantidad: 12, escala: 1.35, nombre: 'Potenciador' },
};
const RADIO_RECOGER = 0.95, RADIO_IMAN = 2.4, CADUCIDAD = 28, PARPADEO = 7, MAX_ACTIVAS = 16;

let texHaz = null;
const hazMats = new Map();
let hazGeo = null;
function materialHaz(color) {
  let m = hazMats.get(color);
  if (m) return m;
  if (!texHaz) {
    const c = document.createElement('canvas'); c.width = 4; c.height = 64;
    const g = c.getContext('2d'); const gr = g.createLinearGradient(0, 64, 0, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0.9)'); gr.addColorStop(0.35, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 4, 64);
    texHaz = new THREE.CanvasTexture(c); texHaz.colorSpace = THREE.SRGBColorSpace;
  }
  m = new THREE.MeshBasicMaterial({ map: texHaz, color, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
  hazMats.set(color, m);
  return m;
}

export function instalarRecogidas(juego, mundo) {
  for (const tipo of Object.keys(TIPOS)) registrarTipo(tipo, (j, o) => crearRecogida(j, mundo, tipo, o));
  let activas = 0;

  function crearRecogida(juego, mundo, tipo, o) {
    const def = TIPOS[tipo];
    const era = Math.max(0, Math.min(5, o.eraIdx ?? juego.estado?.eraIdx ?? 0));
    const x = o.x ?? 0, z = o.z ?? 0;
    const raiz = new THREE.Group(); raiz.name = 'recogida_' + tipo;
    const modelo = modeloCacheado(tipo + ':' + era, () => def.modelo(era));
    modelo.scale.setScalar(def.escala);
    const flota = new THREE.Group(); flota.add(modelo);
    raiz.add(flota);
    if (!hazGeo) hazGeo = new THREE.CylinderGeometry(0.2, 0.34, 2.6, 14, 1, true);
    const haz = new THREE.Mesh(hazGeo, materialHaz(def.color)); haz.position.y = 1.3; haz.renderOrder = 2; haz.frustumCulled = false;
    raiz.add(haz);
    const anillo = anilloSuelo(0.75, def.color, 0.7); anillo.position.y = 0.05;
    raiz.add(anillo);
    raiz.position.set(x, 0, z);
    juego.render?.escena?.add(raiz);
    activas++;
    const obj = {
      tipo, pos: new THREE.Vector3(x, 0, z), grupo: raiz, t: 0, caduca: o.duracion ?? CADUCIDAD, cantidad: o.cantidad ?? def.cantidad,
      fase: Math.random() * 6.28, vx: 0, vz: 0, recogido: false,
    };
    // salto inicial al aparecer
    obj.vx = (o.vx ?? (Math.random() - 0.5) * 2.5); obj.vz = (o.vz ?? (Math.random() - 0.5) * 2.5);

    obj.actualizar = function (dt) {
      if (obj.recogido) return;
      obj.t += dt; obj.caduca -= dt;
      if (obj.caduca <= 0) { obj.eliminar = true; return; }
      // deslizamiento inicial
      obj.pos.x += obj.vx * dt; obj.pos.z += obj.vz * dt;
      const fr = Math.exp(-4 * dt); obj.vx *= fr; obj.vz *= fr;
      // imán y recogida
      let mejor = null, md = Infinity;
      for (const j of juego.jugadores) {
        if (!j.vivo || j.caido || j.emplazamiento && false) continue;
        const d = Math.hypot(j.pos.x - obj.pos.x, j.pos.z - obj.pos.z);
        if (d < md && puedeRecoger(tipo, j)) { md = d; mejor = j; }
      }
      if (mejor) {
        const radioIman = RADIO_IMAN * (mejor.mods?.iman ?? 1);
        if (md < RADIO_RECOGER) { recoger(mejor); return; }
        if (md < radioIman && obj.t > 0.5) {
          const v = (3 + (1 - md / radioIman) * 9) * dt;
          obj.pos.x += (mejor.pos.x - obj.pos.x) / md * v; obj.pos.z += (mejor.pos.z - obj.pos.z) / md * v;
        }
      }
      const tt = obj.t + obj.fase;
      flota.position.y = 0.62 + Math.sin(tt * 2.4) * 0.1;
      flota.rotation.y = tt * 1.6;
      haz.material.opacity = 0.45 + Math.sin(tt * 3) * 0.1;
      anillo.scale.setScalar(1 + Math.sin(tt * 3) * 0.07);
      // parpadeo al caducar
      raiz.visible = !(obj.caduca < PARPADEO && Math.sin(obj.caduca * (obj.caduca < 2 ? 22 : 11)) < -0.3);
      raiz.position.set(obj.pos.x, 0, obj.pos.z);
    };

    function recoger(j) {
      obj.recogido = true;
      let cantidad = obj.cantidad;
      if (tipo === 'botiquin') j.curar?.(cantidad);
      else if (tipo === 'municion') { j.darMunicion?.(cantidad); j.darArrojadizas?.(1); cantidad = 1; }
      else j.aplicarEstado?.('potenciado', cantidad);
      juego.eventos.emitir('recogida', { jugador: j, tipo, cantidad });
      emitir(juego, tipo === 'botiquin' ? 'curacion' : 'chispas', obj.pos.x, 0.8, obj.pos.z, { escala: 0.9 });
      sonar(juego, 'recogida_' + tipo, obj.pos.x, obj.pos.z);
      obj.eliminar = true;
    }
    obj.destruir = function () {
      if (obj.contado) return; obj.contado = true; activas = Math.max(0, activas - 1);
      anillo.material.dispose(); anillo.geometry.dispose();
      raiz.parent?.remove(raiz);
    };
    return obj;
  }

  function puedeRecoger(tipo, j) {
    if (tipo === 'botiquin') return j.vida < j.vidaMax - 0.5;
    return true;
  }

  /** Probabilidad y tipo de botín según la necesidad del grupo. */
  function soltarBotin(x, z, o = {}) {
    const js = juego.jugadores.filter((j) => j.vivo && !j.caido);
    if (activas >= MAX_ACTIVAS) return null;
    const suerteJug = js.reduce((m, j) => Math.max(m, j.mods?.suerte ?? 0), 0);
    const base = o.caja ? 0.7 : 0.1;
    const p = Math.min(0.95, base * (o.suerte ?? 1) + suerteJug);
    if (!juego.rng.prob(p)) return null;
    let vida = 1, muni = 1;
    if (js.length) {
      vida = js.reduce((s, j) => s + j.vida / j.vidaMax, 0) / js.length;
      muni = js.reduce((s, j) => { const a = j.arma; if (!a || !(a.reservaMax > 0)) return s + 1; return s + Math.min(1, (a.reserva + a.municion) / (a.reservaMax + a.cargador)); }, 0) / js.length;
    }
    const tipo = juego.rng.ponderado([
      ['botiquin', 0.25 + 1.1 * (1 - vida)],
      ['municion', 0.4 + 1.1 * (1 - muni)],
      ['potenciador', 0.07 * (o.suerte ?? 1)],
    ]);
    return mundo.crear(tipo, { x, z, eraIdx: juego.estado?.eraIdx ?? 0 });
  }
  return { soltarBotin };
}
