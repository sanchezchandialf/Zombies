// Emplazamientos ('emplazamiento'): arma fija tripulable de la era (cañón de campaña → cañón de plasma).
//   mundo.crear('emplazamiento', { x, z, rot?, eraIdx? })
// «Usar <nombre>» (E): el jugador se sienta, la cabeza gira hacia la mira con arco ±70°, dispara con combate.gatillo
// (munición infinita + sobrecalentamiento; `obj.calor` 0..1 para la UI). E de nuevo baja. Dañable (bando jugadores) y reparable.
import * as THREE from 'three';
import { CAPA } from '../nucleo/fisica.js';
import { difAngulo, girarHacia, limitar } from '../nucleo/util.js';
import { ARMAS } from '../datos/armas.js';
import { ERAS } from '../datos/eras.js';
import { crearModeloEmplazamiento } from '../armas/modelos.js';
import { registrarTipo } from './registro.js';
import { crearDaniable, crearCuerpoProp, emitir, sonar } from './util.js';

export const ARCO = (70 * Math.PI) / 180;

/** Armas de los emplazamientos: variantes potentes de armas de la era (la instancia usa esta def; el resto de campos se hereda). */
export const ARMAS_EMPLAZAMIENTO = [
  { base: 'lanzacohetes', over: { id: 'emp_canon', nombre: 'Cañón de campaña', danio: 340, radio: 5.2, velocidad: 38, cadencia: 0.3, auto: false, gravedad: false, tipo: 'explosivo', empuje: 14 } },
  { base: 'revolveres_gemelos', over: { id: 'emp_gatling', nombre: 'Ametralladora Gatling', danio: 44, cadencia: 13, auto: true, calorMax: 5, dispersion: 4, perforacion: 1 } },
  { base: 'carabina_m', over: { id: 'emp_pesada', nombre: 'Ametralladora pesada', danio: 62, cadencia: 10, auto: true, calorMax: 5.5, dispersion: 2.5, perforacion: 2 } },
  { base: 'fusil_asalto', over: { id: 'emp_m60', nombre: 'M60', danio: 70, cadencia: 11, auto: true, calorMax: 5.5, dispersion: 2.2, perforacion: 2 } },
  { base: 'pdw', over: { id: 'emp_minigun', nombre: 'Minigun', danio: 52, cadencia: 26, auto: true, calorMax: 4.5, dispersion: 3.5, perforacion: 2 } },
  { base: 'pistola_plasma', over: { id: 'emp_plasma', nombre: 'Cañón de plasma', danio: 190, radio: 2.4, cadencia: 5.5, auto: true, calorMax: 4, dispersion: 1.5 } },
];

export function defArmaEmplazamiento(eraIdx) {
  const e = ARMAS_EMPLAZAMIENTO[eraIdx];
  const base = ARMAS[e.base] ?? {};
  return { ...base, ...e.over, cargador: 99999, reserva: -1, recarga: 0.1, municionInfinita: true };
}

export function instalarEmplazamientos(juego, mundo) {
  registrarTipo('emplazamiento', (j, o) => crearEmplazamiento(j, mundo, o));
}

function crearEmplazamiento(juego, mundo, o) {
  const era = Math.max(0, Math.min(5, o.eraIdx ?? 0));
  const x = o.x ?? 0, z = o.z ?? 0, rotBase = o.rot ?? 0;
  const modelo = crearModeloEmplazamiento(era);
  const ud = modelo.userData;
  modelo.position.set(x, 0, z); modelo.rotation.y = rotBase;
  juego.render?.escena?.add(modelo);
  const nombre = ERAS[era].emplazamiento ? (ud.nombre || ARMAS_EMPLAZAMIENTO[era].over.nombre) : ARMAS_EMPLAZAMIENTO[era].over.nombre;
  const obj = {
    tipo: 'emplazamiento', grupo: modelo, nombre, rotBase, rotCabeza: rotBase, tirador: null, calor: 0, sobrecalentado: false,
    mods: { danio: 1, cadencia: 1, municionInfinita: true, sobrecalentamiento: true },
    ocultaConductor: false, etiqueta: 'Usar ' + nombre, radioUso: 2.3, colorHalo: 0xffe08a, radioHalo: 1.3,
    _origen: new THREE.Vector3(), _asiento: new THREE.Vector3(), recul: 0,
  };
  crearDaniable(obj, {
    juego, x, z, radio: ud.radio ?? 0.7, vida: (260 + 60 * era), material: 'metal', bando: 'jugadores',
    resistencias: { veneno: 0 },
    alDanio(info) { emitir(juego, 'chispas', this.pos.x, 0.9, this.pos.z, { escala: 0.5, cantidad: 3 }); },
    alMorir() {
      obj.bajar();
      emitir(juego, 'explosion', this.pos.x, 0.6, this.pos.z, { escala: 0.9 });
      try { juego.fx?.escombros?.({ x: this.pos.x, y: 0.7, z: this.pos.z, cantidad: 14, material: 'metal', fuerza: 6 }); juego.fx?.calco?.('quemadura', this.pos.x, this.pos.z, 2.4, {}); } catch (e) { /* */ }
      mundo.quitar(this);
    },
  });
  obj.cuerpo = crearCuerpoProp(juego, { x, z, radio: (ud.radio ?? 0.7) * 0.9, masa: 0, capa: CAPA.ESTRUCTURA, datos: obj, bloqueaBalas: false });
  const c = juego.combate;
  obj.arma = c?.crearArma ? c.crearArma(ARMAS_EMPLAZAMIENTO[era].base, obj) : null;
  if (obj.arma) { obj.arma.def = defArmaEmplazamiento(era); obj.arma.municion = 99999; obj.arma.cargador = 99999; obj.arma.reserva = -1; }

  obj.puedeUsar = (j) => obj.vivo && !obj.tirador && !j.emplazamiento && !j.vehiculo;
  obj.usar = function usar(j) {
    if (!obj.puedeUsar(j)) return;
    obj.tirador = j; j.emplazamiento = obj;
    obj.rotCabeza = ud.cabeza.rotation.y + rotBase;
    juego.eventos.emitir('interactivo:usado', { objeto: obj, jugador: j });
    sonar(juego, 'montar', obj.pos.x, obj.pos.z);
  };
  obj.bajar = function bajar() {
    const j = obj.tirador;
    obj.tirador = null;
    if (j && j.emplazamiento === obj) j.emplazamiento = null;
  };
  mundo.registrarInteractivo(obj);
  mundo.registrarEstructura(obj);

  obj.actualizar = function actualizar(dt) {
    const arma = obj.arma;
    if (arma) c?.actualizarArma?.(arma, dt, obj);
    const j = obj.tirador;
    if (j && (!j.vivo || j.caido || j.emplazamiento !== obj)) obj.bajar();
    const t = obj.tirador;
    if (t) {
      const it = t.intencion ?? {};
      // la mira se mide desde la cabeza; arco ±70° respecto a la orientación base
      const dx = it.apuntar ? it.apuntar.x - obj.pos.x : Math.sin(t.rot), dz = it.apuntar ? it.apuntar.z - obj.pos.z : Math.cos(t.rot);
      const deseado = Math.atan2(dx, dz);
      const rel = limitar(difAngulo(rotBase, deseado), -ARCO, ARCO);
      obj.rotCabeza = girarHacia(obj.rotCabeza, rotBase + rel, 5.5 * dt);
      ud.cabeza.rotation.y = obj.rotCabeza - rotBase;
      modelo.updateMatrixWorld(true);
      if (ud.asiento) { obj._asiento.copy(ud.asiento); modelo.localToWorld(obj._asiento); t.pos.x = obj._asiento.x; t.pos.z = obj._asiento.z; t.cuerpo.x = t.pos.x; t.cuerpo.z = t.pos.z; }
      t.rot = obj.rotCabeza;
      if (arma && c?.gatillo) {
        obj.mods.danio = t.mods?.danio ?? 1;
        obj.mods.explosivos = t.mods?.explosivos ?? 1;
        if (ud.boca) { obj._origen.copy(ud.boca); ud.cabeza.localToWorld(obj._origen); } else obj._origen.set(obj.pos.x, 1.2, obj.pos.z);
        const disparo = c.gatillo(obj, arma, obj._origen, obj.rotCabeza, !!it.disparar, !!it.disparoPulsado);
        if (disparo) obj.recul = 1;
      }
    }
    if (arma) { obj.calor = arma.calor ?? 0; obj.sobrecalentado = !!arma.sobrecalentado; }
    if (ud.canones) ud.canones.position.z = -0.1 * obj.recul;
    obj.recul = Math.max(0, obj.recul - dt * 9);
    // humo de sobrecalentamiento
    if (obj.sobrecalentado && Math.random() < dt * 8) emitir(juego, 'vapor', obj.pos.x, 1.2, obj.pos.z, { escala: 0.6 });
  };

  obj.destruir = function destruir() {
    obj.bajar();
    mundo.quitarInteractivo(obj);
    if (obj.cuerpo) juego.fisica.eliminarCuerpo(obj.cuerpo); obj.cuerpo = null;
    modelo.parent?.remove(modelo);
  };
  return obj;
}
