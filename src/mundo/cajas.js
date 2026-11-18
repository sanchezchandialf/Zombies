// Cajas destructibles ('caja') y objetos empujables ('empujable'), con aspecto por era.
//   mundo.crear('caja', { x, z, rot?, eraIdx?, escala?, botin? })     se rompe en tablas/astillas y suelta botín (doble con jugador.chatarrero)
//   mundo.crear('empujable', { x, z, rot?, eraIdx?, masa? })           masa y vuelco visual; indestructible salvo que se pase vida
import * as THREE from 'three';
import { CAPA } from '../nucleo/fisica.js';
import { registrarTipo } from './registro.js';
import { crearDaniable, crearCuerpoProp, crearInclinacion, modeloCacheado, emitir } from './util.js';
import { cajaEra, empujableEra } from './modelos.js';

const MAT_CAJA = ['madera', 'madera', 'metal', 'madera', 'metal', 'metal'];
const ESC_CAJA = ['madera', 'madera', 'metal', 'madera', 'metal', 'metal'];
const VIDA_CAJA = [38, 42, 70, 45, 80, 90];
const MASA_EMP = [45, 55, 70, 38, 60, 50];
const RADIO_EMP = [0.5, 0.45, 0.45, 0.32, 0.5, 0.4];

export function instalarCajas(juego, mundo) {
  registrarTipo('caja', (j, o) => crearCaja(j, mundo, o));
  registrarTipo('empujable', (j, o) => crearEmpujable(j, mundo, o));
}

function montar(juego, modelo, x, z, rot, escala) {
  const raiz = new THREE.Group();
  modelo.rotation.y = rot; modelo.scale.setScalar(escala);
  raiz.add(modelo); raiz.position.set(x, 0, z); raiz.rotation.order = 'YXZ';
  juego.render?.escena?.add(raiz);
  return raiz;
}

function crearCaja(juego, mundo, o) {
  const era = Math.max(0, Math.min(5, o.eraIdx ?? 0));
  const escala = o.escala ?? (0.9 + Math.random() * 0.25);
  const x = o.x ?? 0, z = o.z ?? 0, rot = o.rot ?? Math.random() * Math.PI * 2;
  const modelo = modeloCacheado('caja:' + era, () => cajaEra(era));
  const raiz = montar(juego, modelo, x, z, rot, escala);
  const obj = { tipo: 'caja', grupo: raiz, tAviso: 0, etiqueta: 'Caja' };
  crearDaniable(obj, {
    juego, x, z, radio: 0.5 * escala, vida: VIDA_CAJA[era] * escala, material: MAT_CAJA[era], bando: 'neutral',
    resistencias: { veneno: 0, acido: 1.5 },
    alDanio(info) { this.tAviso = 0.2; emitir(juego, 'astillas', this.pos.x, 0.5, this.pos.z, { escala: 0.5, cantidad: 3, dirX: info.dirX, dirZ: info.dirZ }); },
    alMorir(info) {
      const x0 = this.pos.x, z0 = this.pos.z;
      try { juego.fx?.escombros?.({ x: x0, y: 0.5, z: z0, cantidad: 9, material: ESC_CAJA[era], fuerza: 5, dirX: info.dirX, dirZ: info.dirZ }); } catch (e) { /* FX opcional */ }
      emitir(juego, 'polvo', x0, 0.3, z0, { escala: 0.8 });
      if (o.botin !== false) {
        const doble = (info.atacante?.chatarrero || juego.jugadores.some((j) => j.chatarrero && Math.hypot(j.pos.x - x0, j.pos.z - z0) < 4)) ? 2 : 1;
        const rng = juego.rng;
        for (let i = 0; i < doble; i++) mundo.soltarBotin(x0 + (i ? (rng() - 0.5) : 0), z0 + (i ? (rng() - 0.5) : 0), { suerte: 1.8, caja: true });
      }
      this.eliminar = true;
    },
  });
  obj.cuerpo = crearCuerpoProp(juego, { x, z, radio: 0.48 * escala, masa: 30, amortiguacion: 6, rebote: 0.15, rot, datos: obj });
  const inc = crearInclinacion({ sensibilidad: 0.06 });
  obj.posFisica = function (dt) {
    const c = obj.cuerpo; if (!c) return;
    obj.pos.x = c.x; obj.pos.z = c.z;
    if (obj.tAviso > 0) obj.tAviso -= dt;
    const s = inc.actualizar(c, dt);
    const t = juego.tiempo?.real ?? 0, sh = obj.tAviso > 0 ? Math.sin(t * 80) * 0.015 : 0;
    raiz.position.set(c.x + sh, s.y, c.z);
    raiz.rotation.set(s.x, 0, s.z);
  };
  obj.destruir = function () { if (obj.cuerpo) juego.fisica.eliminarCuerpo(obj.cuerpo); obj.cuerpo = null; raiz.parent?.remove(raiz); };
  return obj;
}

function crearEmpujable(juego, mundo, o) {
  const era = Math.max(0, Math.min(5, o.eraIdx ?? 0));
  const x = o.x ?? 0, z = o.z ?? 0, rot = o.rot ?? Math.random() * Math.PI * 2;
  const modelo = modeloCacheado('emp:' + era, () => empujableEra(era));
  const raiz = montar(juego, modelo, x, z, rot, 1);
  const r = RADIO_EMP[era];
  const obj = { tipo: 'empujable', grupo: raiz, etiqueta: 'Objeto' };
  if (o.vida > 0) crearDaniable(obj, {
    juego, x, z, radio: r, vida: o.vida, material: 'madera', bando: 'neutral',
    alMorir() { try { juego.fx?.escombros?.({ x: this.pos.x, y: 0.4, z: this.pos.z, cantidad: 7, material: 'madera', fuerza: 4 }); } catch (e) { /* */ } this.eliminar = true; },
  });
  else { obj.pos = new THREE.Vector3(x, 0, z); obj.radio = r; obj.vivo = true; }
  obj.cuerpo = crearCuerpoProp(juego, { x, z, radio: r, masa: o.masa ?? MASA_EMP[era], amortiguacion: 4.5, rebote: 0.2, rot, datos: obj.recibirDanio ? obj : null, capa: CAPA.PROP });
  const inc = crearInclinacion({ rigidez: 55, amort: 5.5, sensibilidad: 0.08 });
  obj.posFisica = function (dt) {
    const c = obj.cuerpo; if (!c) return;
    obj.pos.x = c.x; obj.pos.z = c.z;
    const s = inc.actualizar(c, dt);
    raiz.position.set(c.x, s.y, c.z);
    raiz.rotation.set(s.x, 0, s.z);
    // gira ligeramente al ser arrastrado
    modelo.rotation.y += (c.vx * 0.2 - c.vz * 0.0) * dt * 0.5;
  };
  obj.destruir = function () { if (obj.cuerpo) juego.fisica.eliminarCuerpo(obj.cuerpo); obj.cuerpo = null; raiz.parent?.remove(raiz); };
  return obj;
}
