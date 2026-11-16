// Visual provisional (cápsula) que cumple la interfaz VisualPersonaje. Se borra cuando ambos agentes entreguen.
import * as THREE from 'three';
export function visualProvisional(juego, color, alto = 1.8, radio = 0.4) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(radio, alto - radio * 2, 4, 10), new THREE.MeshStandardMaterial({ color }));
  m.position.y = alto / 2; m.castShadow = true; g.add(m);
  const nariz = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.15, 0.5), new THREE.MeshStandardMaterial({ color: 0x222222 }));
  nariz.position.set(0, alto * 0.75, radio); g.add(nariz);
  juego.render.escena.add(g);
  let arma = null;
  return {
    altura: alto,
    colocar(x, z, rot) { g.position.set(x, 0, z); g.rotation.y = rot; },
    mover(vx, vz) {}, accion(nombre, opciones) {}, vestir(eraIdx) {}, destello(color) {},
    equipar(obj) { if (arma) g.remove(arma); arma = obj; if (obj) { obj.position.set(0.25, alto * 0.65, 0.3); g.add(obj); } },
    boca(out = new THREE.Vector3()) { return out.set(0.25, alto * 0.65, 1.0).applyMatrix4(g.matrixWorld); },
    visible(v) { g.visible = v; },
    morir() { g.rotation.x = -Math.PI / 2; setTimeout(() => g.removeFromParent(), 3000); },
    liberar() { g.removeFromParent(); },
  };
}
