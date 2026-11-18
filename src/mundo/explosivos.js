// Explosivos de era ('explosivo'): barril de pólvora, caja de dinamita, bidón de combustible, surtidor, bombona de gas, célula de plasma.
//   mundo.crear('explosivo', { x, z, rot?, eraIdx?, variante? })   variante por defecto: ERAS[eraIdx].explosivo
// Son dañables (neutrales), empujables (círculo dinámico CAPA.PROP) y encadenan explosiones con combate.explotar.
import * as THREE from 'three';
import { ERAS } from '../datos/eras.js';
import { CAPA } from '../nucleo/fisica.js';
import { registrarTipo } from './registro.js';
import { crearDaniable, crearCuerpoProp, crearInclinacion, modeloCacheado, emitir, sonar } from './util.js';
import { barrilPolvora, cajaDinamita, bidonCombustible, surtidorGasolina, bombonaGas, celulaPlasma } from './modelos.js';

export const VARIANTES_EXPLOSIVO = {
  barril_polvora: {
    nombre: 'Barril de pólvora', modelo: barrilPolvora, vida: 22, radioCuerpo: 0.44, masa: 40, material: 'madera', escombros: 'madera',
    explosion: { radio: 4.6, danio: 190, tipo: 'explosivo', empuje: 9 }, res: { fuego: 2.2 }, calco: 'quemadura',
  },
  caja_dinamita: {
    nombre: 'Caja de dinamita', modelo: cajaDinamita, vida: 18, radioCuerpo: 0.42, masa: 34, material: 'madera', escombros: 'madera',
    explosion: { radio: 5.2, danio: 245, tipo: 'explosivo', empuje: 11 }, res: { fuego: 2.5 }, calco: 'quemadura',
  },
  bidon_combustible: {
    nombre: 'Bidón de combustible', modelo: bidonCombustible, vida: 34, radioCuerpo: 0.36, masa: 46, material: 'metal', escombros: 'metal',
    explosion: { radio: 4.0, danio: 125, tipo: 'explosivo', empuje: 8 }, zona: { radio: 3.4, duracion: 7, dps: 26 }, res: { fuego: 1.5 }, calco: 'quemadura',
  },
  surtidor_gasolina: {
    nombre: 'Surtidor de gasolina', modelo: surtidorGasolina, vida: 80, radioCuerpo: 0.5, masa: 280, material: 'metal', escombros: 'metal',
    explosion: { radio: 5.6, danio: 270, tipo: 'explosivo', empuje: 12 }, zona: { radio: 4.2, duracion: 9, dps: 30 }, res: { fuego: 1.2 }, calco: 'quemadura', grande: true,
  },
  bombona_gas: {
    nombre: 'Bombona de gas', modelo: bombonaGas, vida: 30, radioCuerpo: 0.26, masa: 28, material: 'metal', escombros: 'metal',
    explosion: { radio: 4.6, danio: 215, tipo: 'explosivo', empuje: 10 }, propulsa: true, res: { fuego: 1.4 }, calco: 'quemadura',
  },
  celula_plasma: {
    nombre: 'Célula de plasma', modelo: celulaPlasma, vida: 30, radioCuerpo: 0.38, masa: 48, material: 'energia', escombros: 'metal',
    explosion: { radio: 5.2, danio: 235, tipo: 'energia', empuje: 9 }, res: { energia: 1.4 }, calco: 'quemadura', plasma: true,
  },
};

export function instalarExplosivos(juego, mundo) {
  registrarTipo('explosivo', (j, o) => crearExplosivo(j, mundo, o));
}

function crearExplosivo(juego, mundo, o) {
  const eraIdx = o.eraIdx ?? 0;
  const variante = VARIANTES_EXPLOSIVO[o.variante] ? o.variante : (VARIANTES_EXPLOSIVO[ERAS[eraIdx]?.explosivo] ? ERAS[eraIdx].explosivo : 'barril_polvora');
  const def = VARIANTES_EXPLOSIVO[variante];
  const x = o.x ?? 0, z = o.z ?? 0, rot = o.rot ?? (Math.random() * Math.PI * 2);

  const raiz = new THREE.Group(); raiz.name = 'explosivo_' + variante;
  const modelo = modeloCacheado('exp:' + variante, def.modelo);
  modelo.rotation.y = rot;
  raiz.add(modelo);
  raiz.position.set(x, 0, z);
  raiz.rotation.order = 'YXZ';
  juego.render?.escena?.add(raiz);

  const obj = {
    tipo: 'explosivo', variante, nombre: def.nombre, def, grupo: raiz, modelo,
    tAviso: 0, explotado: false, volando: 0, tVuelo: 0, ultimoAtacante: null,
    etiqueta: def.nombre,
  };
  crearDaniable(obj, {
    juego, x, z, radio: def.radioCuerpo, vida: def.vida, material: def.material, bando: 'neutral', resistencias: def.res,
    alDanio(info) {
      this.ultimoAtacante = info.atacante ?? this.ultimoAtacante;
      this.tAviso = 0.5;
      emitir(juego, 'chispas', this.pos.x, 0.8, this.pos.z, { escala: 0.55, cantidad: 4, dirX: -(info.dirX ?? 0), dirZ: -(info.dirZ ?? 0) });
    },
    alMorir(info) {
      this.ultimoAtacante = info.atacante ?? this.ultimoAtacante;
      if (def.propulsa) iniciarVuelo(info);
      else detonar();
    },
  });
  obj.cuerpo = crearCuerpoProp(juego, {
    x, z, radio: def.radioCuerpo, masa: def.masa, amortiguacion: def.grande ? 7 : 4.2, rebote: 0.25, datos: obj,
    alColisionar: (otro) => { if (obj.volando > 0.1 && !otro.sensor && (otro.capa & (CAPA.ESTATICO | CAPA.ZOMBI | CAPA.JUGADOR | CAPA.VEHICULO | CAPA.ESTRUCTURA))) detonar(); },
  });
  obj.cuerpo.sensor = false;
  const inc = crearInclinacion({});
  let emisorGas = null;
  const lleno = new THREE.Vector3();

  function iniciarVuelo(info) {
    // la bombona sale despedida antes de estallar: huye en dirección contraria al golpe (o al azar)
    let dx = info.dirX ?? 0, dz = info.dirZ ?? 0;
    const l = Math.hypot(dx, dz);
    if (l < 0.05) { const a = Math.random() * Math.PI * 2; dx = Math.sin(a); dz = Math.cos(a); } else { dx /= l; dz /= l; }
    obj.volando = 0.001; obj.tVuelo = 0.55 + Math.random() * 0.35;
    obj.dirVuelo = { x: dx, z: dz };
    obj.cuerpo.amortiguacion = 0.15;
    obj.cuerpo.vx = dx * 13; obj.cuerpo.vz = dz * 13;
    obj.cuerpo.rebote = 0.5;
    emisorGas = juego.fx?.crearEmisor?.('vapor', { x: obj.pos.x, y: 0.7, z: obj.pos.z }, { escala: 1.1 }) ?? null;
    emitir(juego, 'chispas', obj.pos.x, 1.0, obj.pos.z, { escala: 0.8, cantidad: 8 });
    sonar(juego, 'silbido', obj.pos.x, obj.pos.z);
  }

  function detonar() {
    if (obj.explotado) return;
    obj.explotado = true; obj.vivo = false;
    const e = def.explosion, c = juego.combate;
    const x0 = obj.pos.x, z0 = obj.pos.z;
    emisorGas?.detener?.(); emisorGas = null;
    const info = { x: x0, z: z0, radio: e.radio, danio: e.danio, tipo: e.tipo, atacante: obj.ultimoAtacante, empuje: e.empuje, danioEstructuras: 1, y: 0.5 };
    if (c?.explotar) c.explotar(info);
    else juego.eventos.emitir('explosion', { x: x0, z: z0, radio: e.radio, danio: e.danio, tipo: e.tipo, atacante: obj.ultimoAtacante });
    // secuelas: quemadura, escombros y fuego/plasma residual
    try { juego.fx?.calco?.(def.calco, x0, z0, e.radio * 0.95, {}); } catch (er) { /* FX opcional */ }
    if (def.grande) try { juego.fx?.calco?.('crater', x0, z0, e.radio * 0.6, {}); } catch (er) { /* */ }
    try { juego.fx?.escombros?.({ x: x0, y: 0.6, z: z0, cantidad: def.grande ? 16 : 11, material: def.escombros, fuerza: 7 }); } catch (er) { /* */ }
    if (def.zona && c?.crearZona) c.crearZona({ x: x0, z: z0, radio: def.zona.radio, duracion: def.zona.duracion, tipo: 'fuego', dps: def.zona.dps, atacante: obj.ultimoAtacante, afecta: 'todos' });
    if (def.zona) emitir(juego, 'fuego', x0, 0.1, z0, { escala: def.zona.radio / 3 });
    if (def.plasma) { emitir(juego, 'plasma', x0, 0.5, z0, { escala: 1.4 }); juego.fx?.destello?.({ x: x0, y: 1, z: z0 }, 0x66e8ff, 6, 0.35, 9); }
    obj.eliminar = true;
  }
  obj.detonar = detonar;

  obj.actualizar = function actualizar(dt) {
    if (obj.explotado) return;
    if (obj.tAviso > 0) obj.tAviso = Math.max(0, obj.tAviso - dt);
    if (obj.volando > 0) {
      obj.volando += dt;
      if (obj.volando >= obj.tVuelo) { detonar(); return; }
      if (emisorGas) { emisorGas.pos.x = obj.pos.x; emisorGas.pos.z = obj.pos.z; emisorGas.pos.y = 0.6; }
      // mantiene la velocidad de salida (la bombona es un cohete torpe)
      obj.cuerpo.vx += obj.dirVuelo.x * 9 * dt; obj.cuerpo.vz += obj.dirVuelo.z * 9 * dt;
    }
  };

  obj.posFisica = function posFisica(dt) {
    if (obj.explotado) return;
    const c = obj.cuerpo;
    obj.pos.x = c.x; obj.pos.z = c.z;
    const t = juego.tiempo?.real ?? 0;
    // parpadeo de aviso: temblor rápido y destello de escala
    let jx = 0, jz = 0, esc = 1;
    if (obj.tAviso > 0) {
      const a = obj.tAviso / 0.5;
      jx = Math.sin(t * 90) * 0.02 * a; jz = Math.cos(t * 77) * 0.02 * a;
      esc = 1 + (Math.sin(t * 60) > 0 ? 0.035 : 0) * a;
    }
    if (obj.volando > 0) {
      const p = Math.min(1, obj.volando / 0.2);
      const yaw = Math.atan2(obj.dirVuelo.x, obj.dirVuelo.z);
      raiz.position.set(c.x, 0.32 * p, c.z);
      raiz.rotation.set(0, 0, 0);
      modelo.rotation.set(0, 0, 0);
      // el cuerpo se tumba apuntando contra el rumbo y gira sobre su eje
      raiz.rotation.y = yaw;
      modelo.rotation.x = -Math.PI / 2 * p;                // tumbada, la válvula apunta hacia atrás respecto al vuelo
      modelo.rotation.y = 0;
      modelo.rotation.z = obj.volando * 14;
      modelo.position.y = 0;
      return;
    }
    const s = inc.actualizar(c, dt);
    raiz.position.set(c.x + jx, s.y, c.z + jz);
    raiz.rotation.set(s.x, 0, s.z);
    raiz.scale.setScalar(esc);
    lleno.set(0, 0, 0);
  };

  obj.destruir = function destruir() {
    emisorGas?.detener?.(); emisorGas = null;
    if (obj.cuerpo) { juego.fisica.eliminarCuerpo(obj.cuerpo); obj.cuerpo = null; }
    raiz.parent?.remove(raiz);
  };

  return obj;
}
