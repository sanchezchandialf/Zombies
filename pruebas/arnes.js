// Arnés para páginas de prueba de un módulo aislado.
// Monta un Juego con el render real (o provisional), el sistema de FX, un suelo opcional y una cámara orbital.
//
//   import { crearArnes } from './arnes.js';
//   const a = await crearArnes({ eraIdx: 0, hora: 0.5, suelo: true, camara: { dist: 12, alto: 8, objetivo: [0, 1, 0] } });
//   a.juego            → instancia de Juego (a.juego.render.escena para añadir cosas)
//   a.alCuadro(fn)     → fn(dt) cada cuadro (antes del render)
//   a.orbita           → OrbitControls (ratón) ;  a.camaraJuego(true) devuelve el control a la cámara del render
//   a.lista()          → marca window.__lista = true (para pruebas/captura.mjs)
// Parámetros de URL útiles: ?era=3&hora=0.75
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { Juego } from '../src/nucleo/juego.js';
import { crearRender } from '../src/render/index.js';
import { crearFx } from '../src/fx/index.js';

export async function crearArnes(o = {}) {
  document.body.style.cssText = 'margin:0;background:#07080a;overflow:hidden';
  const contenedor = document.createElement('div');
  contenedor.style.cssText = 'position:fixed;inset:0';
  document.body.appendChild(contenedor);
  const juego = new Juego({ contenedor });
  const eraIdx = juego.opciones.era ?? o.eraIdx ?? 0;
  const hora = juego.opciones.hora ?? o.hora ?? 0.5;
  juego.estado.eraIdx = eraIdx;
  juego.registrar('render', crearRender(juego));
  if (o.fx !== false) juego.registrar('fx', crearFx(juego));
  for (const [nombre, fabrica] of Object.entries(o.sistemas || {})) juego.registrar(nombre, fabrica(juego));

  const fns = [];
  juego.registrar('arnes', { siempre: true, actualizar: (dt) => { for (const f of fns) f(juego.tiempo.dtReal); } }, 5);
  await juego.iniciar();
  juego.render.establecerAmbiente?.(eraIdx);
  juego.render.establecerHora?.(hora);
  juego.estado.fase = 'jugando'; // para que la simulación avance

  if (o.suelo !== false) {
    const suelo = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: 0x5a5648, roughness: 0.95 }));
    suelo.rotation.x = -Math.PI / 2; suelo.receiveShadow = true; suelo.name = 'sueloArnes';
    juego.render.escena.add(suelo);
  }
  // Cámara orbital propia: sustituimos la cámara del render cada cuadro tras su actualización.
  const cam = juego.render.camara;
  const c = o.camara || {};
  const objetivo = new THREE.Vector3(...(c.objetivo || [0, 1, 0]));
  let orbitaActiva = o.orbita !== false;
  const orbita = new OrbitControls(cam, juego.render.renderer.domElement);
  orbita.target.copy(objetivo);
  const posIni = new THREE.Vector3(c.x ?? 0, c.alto ?? 8, c.dist ?? 12).add(new THREE.Vector3(objetivo.x, 0, objetivo.z));
  cam.position.copy(posIni); cam.lookAt(objetivo);
  const guard = { pos: posIni.clone(), quat: cam.quaternion.clone() };
  // El render puede recolocar la cámara en su actualizar(); la restauramos justo antes (prioridad 99) con la órbita.
  juego.registrar('arnesCam', {
    siempre: true,
    actualizar: () => {
      if (!orbitaActiva) return;
      cam.position.copy(guard.pos); cam.quaternion.copy(guard.quat);
      orbita.update();
      guard.pos.copy(cam.position); guard.quat.copy(cam.quaternion);
      juego.render.camaraExterna = true; // el render real debe respetar esta bandera y no mover la cámara
    },
  }, 99);

  return {
    juego, orbita, THREE,
    alCuadro(fn) { fns.push(fn); },
    camaraJuego(v = true) { orbitaActiva = !v; juego.render.camaraExterna = !v; },
    mirar(x, y, z, tx = 0, ty = 1, tz = 0) { guard.pos.set(x, y, z); cam.position.set(x, y, z); orbita.target.set(tx, ty, tz); cam.lookAt(tx, ty, tz); guard.quat.copy(cam.quaternion); },
    lista() { window.__lista = true; },
  };
}
