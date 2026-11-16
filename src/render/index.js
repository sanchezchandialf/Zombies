// PROVISIONAL — lo sustituye el agente de Render. API en docs/ARQUITECTURA.md §Render.
import * as THREE from 'three';
export function crearRender(juego) {
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  juego.contenedor.appendChild(renderer.domElement);
  const escena = new THREE.Scene();
  escena.background = new THREE.Color(0x20242c);
  const camara = new THREE.PerspectiveCamera(35, 1, 0.5, 400);
  const sol = new THREE.DirectionalLight(0xfff0d8, 2.5); sol.position.set(20, 40, 15); sol.castShadow = true;
  sol.shadow.camera.left = sol.shadow.camera.bottom = -40; sol.shadow.camera.right = sol.shadow.camera.top = 40;
  sol.shadow.mapSize.set(2048, 2048);
  escena.add(sol, new THREE.HemisphereLight(0x8899bb, 0x332820, 0.9));
  const centro = new THREE.Vector3(), rc = new THREE.Raycaster(), plano = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), ndc = new THREE.Vector2();
  let objetivos = [];
  const api = {
    siempre: true, escena, camara, renderer, camaraExterna: false,
    iniciar() { api.redimensionar(juego.contenedor.clientWidth || innerWidth, juego.contenedor.clientHeight || innerHeight); },
    redimensionar(w, h) { renderer.setSize(w, h, false); camara.aspect = w / h; camara.updateProjectionMatrix(); },
    establecerAmbiente() {}, establecerHora() {}, calidad() {},
    seguir(lista) { objetivos = lista || []; },
    sacudir() {}, retroceso() {}, zoom() {},
    transicionEra(alMedio) { alMedio && alMedio(); return Promise.resolve(); },
    puntoEnSuelo(cx, cy, y = 0, out = new THREE.Vector3()) {
      const r = renderer.domElement.getBoundingClientRect();
      ndc.set(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1);
      rc.setFromCamera(ndc, camara); plano.constant = -y;
      return rc.ray.intersectPlane(plano, out) || out.set(0, y, 0);
    },
    proyectar(p, out = { x: 0, y: 0, visible: true }) {
      const v = new THREE.Vector3(p.x, p.y ?? 0, p.z).project(camara), r = renderer.domElement.getBoundingClientRect();
      out.x = (v.x * 0.5 + 0.5) * r.width; out.y = (-v.y * 0.5 + 0.5) * r.height; out.visible = v.z < 1; return out;
    },
    luzPuntual() { return { pos: new THREE.Vector3(), quitar() {} }; },
    actualizar() {
      if (objetivos.length) { centro.set(0, 0, 0); for (const o of objetivos) centro.add(o.pos); centro.multiplyScalar(1 / objetivos.length); }
      if (!api.camaraExterna) { camara.position.set(centro.x, centro.y + 30, centro.z + 21); camara.lookAt(centro); }
      renderer.render(escena, camara);
    },
  };
  return api;
}
