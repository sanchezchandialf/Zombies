// Telegrafiado de ataques de jefes y clases: marcas en el suelo (disco, línea, cono) que se llenan hasta el instante del golpe.
// Geometrías compartidas, materiales por pieza reutilizados (pool). Sin render (pruebas en Node) solo lleva la cuenta.
import * as THREE from 'three';

const ANGULOS_CONO = [0.5, 0.9, 1.4, 2.0, 2.8];     // semiaberturas disponibles (rad de apertura total)
const MAX_ACTIVOS = 48;

let geoDisco = null, geoAnillo = null, geoLinea = null, geoConos = null;
function geometrias() {
  if (geoDisco) return;
  geoDisco = new THREE.CircleGeometry(1, 48).rotateX(-Math.PI / 2);
  geoAnillo = new THREE.RingGeometry(0.93, 1, 56).rotateX(-Math.PI / 2);
  geoLinea = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2).translate(0, 0, 0.5);
  geoConos = ANGULOS_CONO.map((a) => new THREE.CircleGeometry(1, 28, -Math.PI / 2 - a / 2, a).rotateX(-Math.PI / 2));
}

function nuevoMaterial() {
  return new THREE.MeshBasicMaterial({
    color: 0xff4a2a, transparent: true, opacity: 0.3, depthWrite: false, toneMapped: false,
    polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
  });
}

/**
 * @param {object} juego
 */
export function crearTelegrafos(juego) {
  const activos = [];
  const libres = { disco: [], linea: [], cono: [] };
  const escena = juego.render?.escena ?? null;
  const _c = new THREE.Color();

  function pieza(tipo, cono) {
    if (!escena) return null;
    geometrias();
    const lista = libres[tipo];
    if (lista.length) {
      const r = lista.pop();
      if (tipo === 'cono') { r.base.geometry = geoConos[cono]; r.relleno.geometry = geoConos[cono]; r.cono = cono; }
      return r;
    }
    const geoBase = tipo === 'disco' ? geoDisco : tipo === 'linea' ? geoLinea : null;
    const p = { base: null, relleno: null, borde: null, grupo: new THREE.Group() };
    p.base = new THREE.Mesh(tipo === 'cono' ? geoConos[cono] : geoBase, nuevoMaterial());
    p.relleno = new THREE.Mesh(tipo === 'cono' ? geoConos[cono] : geoBase, nuevoMaterial());
    p.base.renderOrder = 4; p.relleno.renderOrder = 5;
    p.grupo.add(p.base, p.relleno);
    if (tipo === 'disco') { p.borde = new THREE.Mesh(geoAnillo, nuevoMaterial()); p.borde.renderOrder = 6; p.grupo.add(p.borde); }
    p.grupo.position.y = 0.07;
    p.tipo = tipo; p.cono = cono;
    return p;
  }

  function indiceCono(ang) {
    let mejor = 0, md = 1e9;
    for (let i = 0; i < ANGULOS_CONO.length; i++) { const d = Math.abs(ANGULOS_CONO[i] - ang); if (d < md) { md = d; mejor = i; } }
    return mejor;
  }

  function crear(tipo, d) {
    if (activos.length >= MAX_ACTIVOS) quitar(activos[0]);
    const t = {
      tipo, x: d.x, z: d.z, rot: d.rot || 0, a: d.a, b: d.b || 0,        // a: radio | largo | alcance · b: ancho | apertura
      t: -(d.retardo || 0), dur: Math.max(0.05, d.dur), color: d.color || '#ff4a2a', activo: true, pieza: null,
      sigue: d.sigue || null,      // función que actualiza x/z/rot cada cuadro (el atacante se mueve)
      quitar() { quitar(t); },
    };
    if (tipo === 'cono') t.cono = indiceCono(t.b);
    t.pieza = pieza(tipo, tipo === 'cono' ? t.cono : 0);
    if (t.pieza) { escena.add(t.pieza.grupo); aplicarColor(t); }
    activos.push(t);
    return t;
  }

  function aplicarColor(t) {
    _c.set(t.color);
    const p = t.pieza;
    p.base.material.color.copy(_c); p.relleno.material.color.copy(_c);
    if (p.borde) p.borde.material.color.copy(_c);
  }

  function quitar(t) {
    if (!t || !t.activo) return;
    t.activo = false;
    const i = activos.indexOf(t);
    if (i >= 0) { activos[i] = activos[activos.length - 1]; activos.pop(); }
    if (t.pieza) {
      t.pieza.grupo.removeFromParent();
      libres[t.pieza.tipo].push(t.pieza);
      t.pieza = null;
    }
  }

  function dibujar(t) {
    const p = t.pieza;
    if (!p) return;
    const prog = Math.max(0, Math.min(1, t.t / t.dur));
    const pulso = 0.5 + 0.5 * Math.sin(juego.tiempo.real * (10 + prog * 14));
    p.grupo.position.x = t.x; p.grupo.position.z = t.z;
    p.base.material.opacity = 0.16 + 0.08 * pulso + 0.1 * prog;
    p.relleno.material.opacity = 0.18 + 0.4 * prog;
    if (t.tipo === 'disco') {
      p.base.scale.set(t.a, 1, t.a);
      const r = Math.max(0.02, t.a * prog);
      p.relleno.scale.set(r, 1, r);
      p.borde.scale.set(t.a, 1, t.a);
      p.borde.material.opacity = 0.55 + 0.35 * pulso;
      p.grupo.rotation.y = 0;
    } else if (t.tipo === 'linea') {
      p.grupo.rotation.y = t.rot;
      p.base.scale.set(t.b, 1, t.a);
      p.relleno.scale.set(t.b * 0.96, 1, Math.max(0.02, t.a * prog));
    } else {
      p.grupo.rotation.y = t.rot;
      p.base.scale.set(t.a, 1, t.a);
      const r = Math.max(0.02, t.a * prog);
      p.relleno.scale.set(r, 1, r);
    }
  }

  const api = {
    activos,
    /** Disco (área circular) que se rellena durante `dur` s. `retardo`: s de espera antes de empezar a llenarse. */
    disco(x, z, radio, dur, o = {}) { return crear('disco', { x, z, a: radio, dur, ...o }); },
    /** Rectángulo desde (x,z) hacia `rot` (rad, convención del juego) de `largo` × `ancho`. */
    linea(x, z, rot, largo, ancho, dur, o = {}) { return crear('linea', { x, z, rot, a: largo, b: ancho, dur, ...o }); },
    /** Cono desde (x,z) hacia `rot`, alcance `alcance` y apertura total `apertura` (rad). */
    cono(x, z, rot, alcance, apertura, dur, o = {}) { return crear('cono', { x, z, rot, a: alcance, b: apertura, dur, ...o }); },
    /** ¿Algún aviso activo de ese tipo ahora mismo? (pruebas) */
    hay(tipo) { return activos.some((t) => t.activo && (!tipo || t.tipo === tipo)); },
    actualizar(dt) {
      for (let i = activos.length - 1; i >= 0; i--) {
        const t = activos[i];
        if (t.sigue) t.sigue(t);
        t.t += dt;
        if (t.t >= t.dur + 0.06) { quitar(t); continue; }
        dibujar(t);
      }
    },
    limpiar() {
      while (activos.length) quitar(activos[activos.length - 1]);
    },
    liberar() {
      api.limpiar();
      for (const l of Object.values(libres)) for (const p of l) { p.base.material.dispose(); p.relleno.material.dispose(); p.borde?.material.dispose(); }
      for (const l of Object.values(libres)) l.length = 0;
    },
  };
  return api;
}
