// Ejemplo mínimo de página de prueba. Copia este patrón para tu módulo.
import * as THREE from 'three';
import { crearArnes } from './arnes.js';

const a = await crearArnes({ eraIdx: 0, hora: 0.5, camara: { dist: 9, alto: 6, objetivo: [0, 1, 0] } });
const cubo = new THREE.Mesh(new THREE.BoxGeometry(1, 2, 1), new THREE.MeshStandardMaterial({ color: 0xcc8844 }));
cubo.position.y = 1; cubo.castShadow = true;
a.juego.render.escena.add(cubo);
a.alCuadro((dt) => { cubo.rotation.y += dt; });
window.arnes = a;
a.lista();
