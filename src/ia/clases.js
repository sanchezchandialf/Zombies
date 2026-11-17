// Comportamientos por clase de zombi (campo `comportamiento` de datos/zombis.js) y extras por id.
// Cada comportamiento: { iniciar?(z, sis), pensar(z, sis) [a ritmo de LOD], actualizar?(z, dt, sis) [cada cuadro],
//   alContacto?(z, otro, cuerpo, nx, nz, velRel), alMorir?(z, info, sis) }
// Los comportamientos solo escriben la intención (z.componer / z.parar / z.tForzado) y lanzan ataques; el movimiento real
// (suavizado, giro, empuje, física) lo hace Zombi.integrar.
import { CAPA } from '../nucleo/fisica.js';
import { limitar } from '../nucleo/util.js';

const _v = { x: 0, z: 0, d: 0 };

// ───────────────────────── Utilidades comunes ─────────────────────────

/** ¿Es una estructura/vehículo/prop destructible que estorba y merece ser golpeada? */
function esEstorbo(z, b) {
  if (!b || b.vivo === false || b.bando === 'zombis' || typeof b.recibirDanio !== 'function') return false;
  const capa = b.cuerpo?.capa ?? 0;
  if (capa & CAPA.ESTRUCTURA) return true;
  if (capa & CAPA.VEHICULO) return !!b.conductor || z.prog < 0.45;
  return z.prog < 0.5;                                  // props / estáticos destructibles: solo si no dejan pasar
}

/** Blanco cuerpo a cuerpo: jugador/vehículo en alcance o estructura que bloquea. */
function blancoMelee(z, sis) {
  const r = z.rec;
  if (r && z.dObj <= z.alcanceA(r.ent) + 0.15) return r.ent;
  if (z.bloqueador && sis.ahora - z.tBloqueo < 0.5 && esEstorbo(z, z.bloqueador)) return z.bloqueador;
  // un jugador pegado a cualquier otro objetivo de la lista (p. ej. el otro de dos)
  for (let i = 0; i < sis.nObjetivos; i++) {
    const o = sis.objetivos[i];
    if (o === r) continue;
    if (Math.hypot(o.x - z.pos.x, o.z - z.pos.z) <= z.alcanceA(o.ent)) return o.ent;
  }
  return null;
}

/** Señuelo de ruido: devuelve true si el zombi está atendiendo a uno y ya ha decidido su movimiento. */
function atenderSenuelo(z, sis) {
  if (z.atraidoHasta <= sis.ahora) return false;
  if (z.rec && z.dObj < 4.5) return false;                         // un jugador pegado pesa más que el ruido
  const x = z.cuerpo.x, zz = z.cuerpo.z, d = Math.hypot(z.atraidoX - x, z.atraidoZ - zz);
  if (d > 2.6) {
    z.guiar(z.atraidoX, z.atraidoZ, d, 'senuelos');
    z.componer(z.gx, z.gz, 0.95);
  } else {
    // alrededor del señuelo: arrastrando los pies
    const a = z.fase + sis.ahora * 0.5 * z.lado;
    z.componer(Math.sin(a) * 0.5, Math.cos(a) * 0.5, 0.3);
    z.mirarX = (z.atraidoX - x) / (d || 1); z.mirarZ = (z.atraidoZ - zz) / (d || 1);
  }
  return true;
}

/** Hordas: empujón de grupo para que no se amontonen. */
function mantenerMirada(z) { if (!z.atk) { z.mirarX = 0; z.mirarZ = 0; } }

// ───────────────────────── Perseguir (Caminante, Acorazado, Apestado) ─────────────────────────

const perseguir = {
  pensar(z, sis) {
    mantenerMirada(z);
    if (atenderSenuelo(z, sis)) return;
    const r = z.rec;
    if (!r) { z.vagar(); return; }
    const obj = blancoMelee(z, sis);
    if (obj) {
      if (z.puedeGolpear()) z.iniciarGolpe(obj);
      const dx = obj.pos.x - z.pos.x, dz = obj.pos.z - z.pos.z, l = Math.hypot(dx, dz) || 1;
      if (!z.atk) { z.mirarX = dx / l; z.mirarZ = dz / l; }
      z.componer(dx / l, dz / l, 0.12, 0.6);
      return;
    }
    z.guiar(r.x, r.z, z.dObj);
    z.componer(z.gx, z.gz, 1);
  },
};

// ───────────────────────── Embestir (Corredor) ─────────────────────────

const embestir = {
  iniciar(z) { z.datosClase.tSalto = 0; z.datosClase.zig = 0.7 + z.rng() * 0.8; },
  pensar(z, sis) {
    mantenerMirada(z);
    if (z.modo !== 'normal') return;
    if (atenderSenuelo(z, sis)) return;
    const r = z.rec;
    if (!r) { z.vagar(); return; }
    const d = z.dObj, dat = z.datosClase;
    const obj = blancoMelee(z, sis);
    if (obj) {
      if (z.puedeGolpear()) z.iniciarGolpe(obj);
      const dx = obj.pos.x - z.pos.x, dz = obj.pos.z - z.pos.z, l = Math.hypot(dx, dz) || 1;
      if (!z.atk) { z.mirarX = dx / l; z.mirarZ = dz / l; }
      z.componer(dx / l, dz / l, 0.2, 0.6);
      return;
    }
    // salto: de 2,2 a 4,2 m y con paso libre
    if (d > 2.2 && d < 4.4 && sis.ahora >= dat.tSalto && z.tCoolAtaque <= sis.ahora && z.tEmerge <= 0 &&
        sis.nav.lineaTransitable(z.pos.x, z.pos.z, r.x, r.z, z.radio)) {
      z.modo = 'agazapar'; z.tModo = 0.3;
      dat.dx = (r.x - z.pos.x) / d; dat.dz = (r.z - z.pos.z) / d;
      z.visual.accion('atacar', { duracion: 0.75, dirX: dat.dx, dirZ: dat.dz, salto: true });
      z.parar(); z.mirarX = dat.dx; z.mirarZ = dat.dz;
      return;
    }
    z.guiar(r.x, r.z, d);
    let gx = z.gx, gz = z.gz;
    // zigzag y flanqueo: se abren en abanico y cierran al llegar
    if (!z.sinCamino && d < 16 && sis.nav.lineaTransitable(z.pos.x, z.pos.z, r.x, r.z, z.radio)) {
      const lejos = limitar((d - 3.5) / 9, 0, 1);
      const ang = z.lado * 0.85 * lejos + Math.sin(sis.ahora * 5.2 * dat.zig + z.fase) * (0.18 + 0.4 * lejos);
      const c = Math.cos(ang), s = Math.sin(ang);
      const tx = (r.x - z.pos.x) / (d || 1), tz = (r.z - z.pos.z) / (d || 1);
      gx = tx * c - tz * s; gz = tx * s + tz * c;
    }
    z.componer(gx, gz, 1);
  },
  actualizar(z, dt, sis) {
    const dat = z.datosClase;
    if (z.modo === 'agazapar') {
      z.tModo -= dt; z.deseoX = z.deseoZ = 0; z.velFactor = 0; z.mirarX = dat.dx; z.mirarZ = dat.dz;
      if (z.rec) { const d = z.dObj || 1; dat.dx += ((z.rec.x - z.pos.x) / d - dat.dx) * 0.3; dat.dz += ((z.rec.z - z.pos.z) / d - dat.dz) * 0.3; }
      if (z.tModo <= 0) { z.modo = 'salto'; z.tModo = 0.36; dat.golpeado = false; }
    } else if (z.modo === 'salto') {
      z.tModo -= dt;
      const l = Math.hypot(dat.dx, dat.dz) || 1;
      z.fVx = dat.dx / l * 11.5; z.fVz = dat.dz / l * 11.5; z.tForzado = 0.05;
      z.mirarX = dat.dx; z.mirarZ = dat.dz;
      if (!dat.golpeado) {
        for (let i = 0; i < sis.nObjetivos; i++) {
          const o = sis.objetivos[i];
          if (Math.hypot(o.x - z.pos.x, o.z - z.pos.z) <= z.alcanceA(o.ent) + 0.25) {
            dat.golpeado = true;
            z.golpear(o.ent, dat.dx, dat.dz, 1.25);
            z.kbX -= dat.dx * 2; z.kbZ -= dat.dz * 2;
            break;
          }
        }
      }
      if (z.tModo <= 0 || dat.golpeado) {
        z.modo = 'recuperar'; z.tModo = dat.golpeado ? 0.55 : 0.7; z.tForzado = 0;
        dat.tSalto = sis.ahora + 2.2 + z.rng() * 1.6;
        z.tCoolAtaque = sis.ahora + 0.35;
      }
    } else if (z.modo === 'recuperar') {
      z.tModo -= dt; z.deseoX = z.deseoZ = 0; z.velFactor = 0;
      if (z.tModo <= 0) { z.modo = 'normal'; z.mirarX = z.mirarZ = 0; }
    }
  },
};

// ───────────────────────── Distancia (Escupidor) ─────────────────────────

const distancia = {
  iniciar(z, sis) { const d = z.datosClase; d.tDisparo = sis.ahora + 1 + z.rng() * 2; d.tBlanco = 0; d.blanco = null; d.tVista = 0; d.vista = false; d.rango = 9.5 + z.rng() * 3.5; },
  pensar(z, sis) {
    mantenerMirada(z);
    if (z.modo === 'escupir') return;
    if (atenderSenuelo(z, sis)) return;
    const r = z.rec;
    const dat = z.datosClase, ahora = sis.ahora;
    if (!r) { z.vagar(); return; }
    const x = z.pos.x, zz = z.pos.z;
    // blanco prioritario: estructura o vehículo cerca; si no, el jugador
    if (ahora >= dat.tBlanco) {
      dat.tBlanco = ahora + 0.6;
      let mejor = r.ent, md = z.dObj;
      const est = sis.estructuras();
      for (let i = 0; i < est.length; i++) {
        const e = est[i];
        if (!e || e.vivo === false) continue;
        const d = Math.hypot(e.pos.x - x, e.pos.z - zz) * 0.62;      // las estructuras pesan más
        if (d < md && d < 15) { md = d; mejor = e; }
      }
      for (let i = 0; i < sis.nObjetivos; i++) {
        const o = sis.objetivos[i];
        if (o.esVehiculo) { const d = Math.hypot(o.x - x, o.z - zz) * 0.7; if (d < md) { md = d; mejor = o.ent; } }
      }
      dat.blanco = mejor;
    }
    const b = dat.blanco && dat.blanco.vivo !== false ? dat.blanco : r.ent;
    const bd = Math.hypot(b.pos.x - x, b.pos.z - zz) || 1;
    const bx = (b.pos.x - x) / bd, bz = (b.pos.z - zz) / bd;
    const esJug = b.bando === 'jugadores' && b.rol;
    // huida: con el jugador encima retrocede
    if (z.dObj < 6.2 && r) {
      const ax = -(r.x - x) / (z.dObj || 1), az = -(r.z - zz) / (z.dObj || 1);
      if (z.prog > 0.3 || z.dObj > 2.6) {
        z.mirarX = -ax; z.mirarZ = -az;
        z.componer(ax * 0.9 + bz * z.lado * 0.4, az * 0.9 - bx * z.lado * 0.4, 1.12);
        // si le acorralan, ataca cuerpo a cuerpo
        return;
      }
      const obj = blancoMelee(z, sis);
      if (obj && z.puedeGolpear()) z.iniciarGolpe(obj);
      z.componer(0, 0, 0);
      return;
    }
    if (ahora - dat.tVista > 0.3) { dat.tVista = ahora; const fin = Math.max(0.5, bd - (b.radio ?? 0.5) - 0.6); dat.vista = sis.fisica.lineaLibre(x, zz, x + bx * fin, zz + bz * fin); }
    const rango = esJug ? dat.rango : Math.min(dat.rango, 11);
    if (bd > rango + 1.5 || !dat.vista) {
      // acercarse: a la estructura/vehículo con paso libre o al jugador por el campo de flujo
      if (b !== r.ent && dat.vista) z.componer(bx, bz, 0.9);
      else { z.guiar(r.x, r.z, z.dObj); z.componer(z.gx, z.gz, 0.95); }
      return;
    }
    // en posición: parado, mirando al blanco, disparando
    z.mirarX = bx; z.mirarZ = bz;
    if (bd < rango - 3 && esJug) { z.componer(-bx * 0.8, -bz * 0.8, 0.7); }
    else z.componer(bz * z.lado * 0.25, -bx * z.lado * 0.25, 0.25);   // pequeño paso lateral
    if (ahora >= dat.tDisparo && z.tAturdido <= 0) {
      z.modo = 'escupir'; z.tModo = 0.55;
      z.parar(); z.visual.accion('escupir', { duracion: 0.7, dirX: bx, dirZ: bz });
      dat.objetivoDisparo = b;
    }
  },
  actualizar(z, dt, sis) {
    if (z.modo !== 'escupir') return;
    const dat = z.datosClase;
    z.tModo -= dt; z.deseoX = z.deseoZ = 0; z.velFactor = 0;
    const b = dat.objetivoDisparo;
    if (b && b.vivo !== false) {
      const dx = b.pos.x - z.pos.x, dz = b.pos.z - z.pos.z, l = Math.hypot(dx, dz) || 1;
      z.mirarX = dx / l; z.mirarZ = dz / l;
    }
    if (z.tModo <= 0) {
      z.modo = 'normal'; z.mirarX = z.mirarZ = 0;
      if (b && b.vivo !== false) escupirAcido(z, sis, b);
      dat.tDisparo = sis.ahora + (1 / z.cadenciaAtaque) * (0.9 + z.rng() * 0.3);
    }
  },
};

function escupirAcido(z, sis, b) {
  const ox = z.pos.x, oz = z.pos.z;
  let tx = b.pos.x, tz = b.pos.z;
  const D0 = Math.hypot(tx - ox, tz - oz);
  const v = 13, T0 = D0 / v;
  if (b.cuerpo && (b.bando === 'jugadores')) { tx += (b.cuerpo.vx || 0) * T0 * 0.75; tz += (b.cuerpo.vz || 0) * T0 * 0.75; }
  const disp = 0.25 + D0 * 0.045;
  tx += (z.rng() - 0.5) * 2 * disp; tz += (z.rng() - 0.5) * 2 * disp;
  const D = Math.hypot(tx - ox, tz - oz), T = Math.max(0.45, D / v);
  const estr = z.def.danioEstructuras || 3, danio = z.danio * 0.9;
  sis.parabola({
    x: ox, z: oz, y: 1.5, tx, tz, tiempo: T, atacante: z, danio: 0, tipo: 'acido', radio: 0, radioAviso: 1.8, efecto: 'acido',
    colorAviso: '#8cff3a',
    alImpactar(px, pz) {
      sis.zona({ x: px, z: pz, radio: 1.9, duracion: 4.5, tipo: 'acido', dps: 7 + z.danio * 0.45, atacante: z, afecta: 'jugadores' });
      sis.fxEmitir('acido', px, 0.2, pz, { escala: 1.1 });
      sis.juego.fx?.calco?.('acido', px, pz, 3.2);
      sis.amigos(px, pz, 1.7, (e) => {
        const dura = !(e.bando === 'jugadores' && e.rol);
        sis.danar(e, { cantidad: danio * (dura ? estr : 1), tipo: 'acido', atacante: z, x: px, z: pz, dirX: 0, dirZ: 0, area: true });
      });
    },
  });
}

// ───────────────────────── Cargar (Mole) ─────────────────────────

const cargar = {
  iniciar(z, sis) { const d = z.datosClase; d.tCarga = sis.ahora + 3 + z.rng() * 3; d.golpeados = []; d.dx = 0; d.dz = 1; d.t = 0; d.dist = 0; d.max = 20; d.tEstr = 0; d.tel = null; },
  pensar(z, sis) {
    mantenerMirada(z);
    if (z.modo !== 'normal') return;
    if (atenderSenuelo(z, sis)) return;
    const r = z.rec, dat = z.datosClase;
    if (!r) { z.vagar(); return; }
    const d = z.dObj;
    const obj = blancoMelee(z, sis);
    if (obj) {
      if (z.puedeGolpear()) z.iniciarGolpe(obj);
      const dx = obj.pos.x - z.pos.x, dz = obj.pos.z - z.pos.z, l = Math.hypot(dx, dz) || 1;
      if (!z.atk) { z.mirarX = dx / l; z.mirarZ = dz / l; }
      z.componer(dx / l, dz / l, 0.1, 0.4);
      return;
    }
    if (sis.ahora >= dat.tCarga && d > 6 && d < 26 && z.tEmerge <= 0) {
      const dx = (r.x - z.pos.x) / d, dz = (r.z - z.pos.z) / d;
      // carrera despejada de muros hasta casi el objetivo
      if (sis.nav.distanciaLibre(z.pos.x, z.pos.z, dx, dz, d, z.radio * 0.9, true) >= d - 1.2) {
        z.modo = 'rugir'; z.tModo = 1.0; dat.dx = dx; dat.dz = dz;
        dat.max = Math.min(40, d + 14);
        z.parar(); z.visual.accion('cargar', { duracion: 1.0, dirX: dx, dirZ: dz });
        z.visual.estado('cargando', true);
        sis.juego.audio?.reproducir?.('mole_rugido', { x: z.pos.x, z: z.pos.z, volumen: 1 });
        const rot0 = Math.atan2(dx, dz);
        dat.tel = sis.tel.linea(z.pos.x, z.pos.z, rot0, dat.max, z.radio * 2.1, 1.0, { color: '#ff3a1c' });
        return;
      }
    }
    z.guiar(r.x, r.z, d);
    z.componer(z.gx, z.gz, 1);
  },
  actualizar(z, dt, sis) {
    const dat = z.datosClase, ahora = sis.ahora;
    switch (z.modo) {
      case 'rugir': {
        z.tModo -= dt; z.deseoX = z.deseoZ = 0; z.velFactor = 0;
        if (z.tModo > 0.4 && z.rec) {      // sigue apuntando hasta 0,4 s antes: ahí está el margen para esquivar
          const d = z.dObj || 1; dat.dx = (z.rec.x - z.pos.x) / d; dat.dz = (z.rec.z - z.pos.z) / d;
        }
        z.mirarX = dat.dx; z.mirarZ = dat.dz;
        if (dat.tel) { dat.tel.rot = Math.atan2(dat.dx, dat.dz); dat.tel.x = z.pos.x; dat.tel.z = z.pos.z; }
        if (z.tModo <= 0) {
          z.modo = 'cargar'; dat.t = 0; dat.dist = 0; dat.golpeados.length = 0;
          dat.tel?.quitar(); dat.tel = null;
          z.atk = null;
        }
        break;
      }
      case 'cargar': {
        dat.t += dt;
        const vel = Math.min(11.5, dat.t * 28) * (dat.freno ?? 1);
        z.fVx = dat.dx * vel; z.fVz = dat.dz * vel; z.tForzado = 0.06;
        z.mirarX = dat.dx; z.mirarZ = dat.dz;
        dat.dist += vel * dt;
        if (ahora - z.muroTocado < 0.07 && dat.t > 0.35 && (z.muroNx * dat.dx + z.muroNz * dat.dz) > 0.3) { chocar(z, sis, true); break; }
        if (dat.dist >= dat.max) { z.modo = 'recuperar'; z.tModo = 0.8; z.tForzado = 0; z.visual.estado('cargando', false); dat.tCarga = ahora + 4 + z.rng() * 3; }
        break;
      }
      case 'recuperar':
        z.tModo -= dt; z.deseoX = z.deseoZ = 0; z.velFactor = 0;
        if (z.tModo <= 0) { z.modo = 'normal'; z.mirarX = z.mirarZ = 0; }
        break;
      case 'aturdida':
        if (z.tAturdido <= 0) { z.modo = 'normal'; z.expuesto = false; z.mirarX = z.mirarZ = 0; dat.tCarga = ahora + 3 + z.rng() * 2; }
        break;
      default: break;
    }
  },
  alContacto(z, d, otro, nx, nz, velRel) {
    if (z.modo !== 'cargar') return;
    const sis = z.sis, dat = z.datosClase;
    if (dat.t < 0.25 || dat.golpeados.includes(d)) { if (!(d.cuerpo?.capa & CAPA.ESTRUCTURA)) return; }
    if (d.bando === 'zombis') {
      if (d.masa < z.masa * 0.5 && !d.esJefe) {
        dat.golpeados.push(d);
        d.recibirDanio({ cantidad: 70 * z.escDanio, tipo: 'golpe', atacante: z, dirX: dat.dx, dirZ: dat.dz, empuje: 14, x: d.pos.x, z: d.pos.z });
        d.aturdir?.(0.8);
      }
      return;
    }
    const capa = d.cuerpo?.capa ?? 0;
    if (capa & (CAPA.ESTRUCTURA | CAPA.ESTATICO | CAPA.PROP)) {
      if (sis.ahora - dat.tEstr < 0.18) return;
      dat.tEstr = sis.ahora;
      sis.danar(d, { cantidad: z.danio * 3.2 * (z.def.danioEstructuras || 4), tipo: 'golpe', atacante: z, x: d.pos.x, z: d.pos.z, dirX: dat.dx, dirZ: dat.dz, empuje: 4 });
      sis.fxEmitir('polvo', d.pos.x, 0.6, d.pos.z, { escala: 1.4 });
      if (d.vivo !== false && (capa & CAPA.ESTRUCTURA || capa & CAPA.ESTATICO)) chocar(z, sis, false);
      else dat.freno = 0.75;
      return;
    }
    dat.golpeados.push(d);
    sis.danar(d, { cantidad: z.danio * 2.3, tipo: 'golpe', atacante: z, x: d.pos.x, z: d.pos.z, dirX: dat.dx, dirZ: dat.dz, empuje: 13 });
    if (capa & CAPA.VEHICULO) chocar(z, sis, false);
  },
};

/** La Mole se estrella: aturdida y con la espalda expuesta. */
function chocar(z, sis, muro) {
  const dat = z.datosClase;
  z.modo = 'aturdida'; z.tForzado = 0; z.expuesto = true;
  z.visual.estado('cargando', false);
  z.aturdir(muro ? 3.2 : 1.6);
  z.kbX -= dat.dx * 2.5; z.kbZ -= dat.dz * 2.5;
  dat.freno = 1;
  sis.juego.render?.sacudir?.(muro ? 0.6 : 0.35, 0.45);
  sis.fxEmitir('polvo', z.pos.x + dat.dx * z.radio, 0.8, z.pos.z + dat.dz * z.radio, { escala: 2 });
  sis.juego.fx?.escombros?.({ x: z.pos.x + dat.dx * z.radio, y: 1, z: z.pos.z + dat.dz * z.radio, cantidad: 10, material: 'piedra', fuerza: 6, dirX: -dat.dx, dirZ: -dat.dz });
  sis.juego.audio?.reproducir?.('choque_pesado', { x: z.pos.x, z: z.pos.z, volumen: 1 });
}

// ───────────────────────── Apoyo (Aullador) ─────────────────────────

const apoyo = {
  iniciar(z, sis) { const d = z.datosClase; d.tGrito = sis.ahora + 3 + z.rng() * 3; d.banda = 11 + z.rng() * 3; },
  pensar(z, sis) {
    mantenerMirada(z);
    if (z.modo === 'gritar') return;
    const r = z.rec, dat = z.datosClase, g = z.def.grito;
    if (!r) { z.vagar(); return; }
    const x = z.pos.x, zz = z.pos.z, d = z.dObj;
    // grita cada ~9 s si hay horda a la vista
    if (sis.ahora >= dat.tGrito && d < 32 && z.tAturdido <= 0) {
      let n = 0;
      const lista = sis.juego.zombis;
      for (let i = 0; i < lista.length && n < 4; i++) { const o = lista[i]; if (o !== z && Math.hypot(o.pos.x - x, o.pos.z - zz) < g.radio * 1.8) n++; }
      if (n >= 3 || sis.ahora >= dat.tGrito + 4) {
        z.modo = 'gritar'; z.tModo = 0.9; z.parar();
        z.visual.accion('gritar', { duracion: 1.0 });
        sis.juego.audio?.reproducir?.('aullador_grito', { x, z: zz, volumen: 1 });
        return;
      }
    }
    const ax = -(r.x - x) / (d || 1), az = -(r.z - zz) / (d || 1);
    if (d < dat.banda - 1.5) {
      z.mirarX = -ax; z.mirarZ = -az;
      if (z.prog < 0.3 && d < 3) { const obj = blancoMelee(z, sis); if (obj && z.puedeGolpear()) z.iniciarGolpe(obj); z.componer(0, 0, 0); return; }
      z.componer(ax + -az * z.lado * 0.35, az + ax * z.lado * 0.35, 1.05);
    } else if (d > dat.banda + 5) {
      z.guiar(r.x, r.z, d); z.componer(z.gx, z.gz, 1);
    } else {
      // se mantiene detrás de la horda, sin perder la vista
      z.mirarX = -ax; z.mirarZ = -az;
      z.componer(-az * z.lado * 0.4, ax * z.lado * 0.4, 0.3);
    }
  },
  actualizar(z, dt, sis) {
    if (z.modo !== 'gritar') return;
    z.tModo -= dt; z.deseoX = z.deseoZ = 0; z.velFactor = 0;
    if (z.tModo <= 0) {
      z.modo = 'normal';
      z.datosClase.tGrito = sis.ahora + z.def.grito.enfriamiento * (0.95 + z.rng() * 0.1);
      sis.gritar(z);
    }
  },
};

// ───────────────────────── Suicida (Detonador) ─────────────────────────

const suicida = {
  iniciar(z, sis) { z.datosClase.mecha = false; z.datosClase.tChispa = 0; z.datosClase.bucle = null; },
  pensar(z, sis) {
    mantenerMirada(z);
    if (atenderSenuelo(z, sis)) return;
    const r = z.rec;
    if (!r) { z.vagar(); return; }
    const d = z.dObj;
    // mecha encendida cuando ve a su presa cerca
    if (!z.datosClase.mecha && d < 16) encenderMecha(z, sis);
    // estorbo: revienta contra lo que le cierra el paso
    const obj = blancoMelee(z, sis);
    if (obj) { detonar(z, sis); return; }
    z.guiar(r.x, r.z, d);
    z.componer(z.gx, z.gz, z.datosClase.mecha ? 1.12 : 1, 0.9);
  },
  actualizar(z, dt, sis) {
    const dat = z.datosClase;
    if (!dat.mecha) return;
    dat.tChispa -= dt;
    if (dat.tChispa <= 0) {
      dat.tChispa = 0.14;
      sis.fxEmitir('chispas', z.pos.x, 1.0, z.pos.z, { cantidad: 3, escala: 0.5 });
    }
    if (dat.bucle?.ajustar) dat.bucle.ajustar({ x: z.pos.x, z: z.pos.z });
    // llega: explota
    const r = z.rec;
    if (r && z.dObj <= z.radio + r.radio + 1.15) detonar(z, sis);
  },
  alMorir(z, info, sis) { if (!z.explotado) detonar(z, sis, true); apagarMecha(z); },
};

function encenderMecha(z, sis) {
  const dat = z.datosClase;
  dat.mecha = true;
  z.visual.estado('cargando', true);
  dat.bucle = sis.juego.audio?.bucle?.('mecha', { x: z.pos.x, z: z.pos.z, volumen: 0.7 }) ?? null;
}
function apagarMecha(z) {
  const dat = z.datosClase;
  dat.bucle?.detener?.(); dat.bucle = null; dat.mecha = false;
  z.visual.estado('cargando', false);
}

function detonar(z, sis, porMuerte = false) {
  if (z.explotado) return;
  z.explotado = true;
  const e = z.def.explosion;
  apagarMecha(z);
  sis.explotar(z.pos.x, z.pos.z, e.radio, e.danio * z.escDanio, { atacante: z, tipo: 'explosivo', danioEstructuras: e.danioEstructuras, empuje: 7 });
  if (!porMuerte && z.vivo) z.morir({ tipo: 'explosivo', silencioso: true, dirX: 0, dirZ: 0, danioFinal: z.vidaMax });
}

// ───────────────────────── Extras por id ─────────────────────────

export const EXTRAS = {
  apestado: {
    iniciar(z, sis) {
      z.datosClase.tAura = 0;
      z.posAura = { x: z.pos.x, y: 1.0, z: z.pos.z };
      z.emisor = sis.juego.fx?.crearEmisor?.('gas_toxico', z.posAura, { escala: 0.75 }) ?? null;
    },
    actualizar(z, dt, sis) {
      if (z.posAura) { z.posAura.x = z.pos.x; z.posAura.z = z.pos.z; }
      z.datosClase.tAura -= dt;
      if (z.datosClase.tAura > 0 || z.tEmerge > 0) return;
      z.datosClase.tAura = 0.5;
      const radio = 3.3, dps = 4.5 + z.danio * 0.45;
      const js = sis.juego.jugadores;
      for (let i = 0; i < js.length; i++) {
        const j = js[i];
        if (!j || j.vivo === false || j.invisible) continue;
        if (j.rol?.id === 'medico') continue;                              // la Médica es inmune
        if (Math.hypot(j.pos.x - z.pos.x, j.pos.z - z.pos.z) > radio + (j.radio ?? 0.4)) continue;
        sis.danar(j, { cantidad: dps * 0.5, tipo: 'veneno', atacante: z, x: j.pos.x, z: j.pos.z, dirX: 0, dirZ: 0, area: true, continuo: true, dot: true });
        j.aplicarEstado?.('envenenado', 1.5);
      }
    },
    alMorir(z, info, sis) {
      z.emisor?.detener?.(); z.emisor = null;
      const n = z.def.nube, x = z.pos.x, zz = z.pos.z;
      if (info.tipo === 'fuego' || info.tipo === 'explosivo') { sis.detonarNube(x, zz, n.radio, z); return; }
      sis.crearNube(x, zz, n.radio, n.duracion, n.dps * z.escDanio, z);
    },
    liberar(z) { z.emisor?.detener?.(); z.emisor = null; },
  },
};

export const COMPORTAMIENTOS = {
  perseguir, embestir, distancia, cargar, apoyo, suicida,
};
