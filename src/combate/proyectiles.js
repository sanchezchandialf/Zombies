// Proyectiles (cohetes, granadas de lanzador, plasma, escupitajos, morteros) y objetos lanzados (granadas, molotov, singularidad).
import { CAPA } from '../nucleo/fisica.js';
import { ARMAS } from '../datos/armas.js';
import { GRAVEDAD, entidadDe, filtroBalas, mascaraDeBando, materialDeCuerpo, alturaImpacto } from './util.js';

/** Por encima de esta altura un proyectil en parábola vuela sobre los cuerpos (pero no sobre muros altos). */
const ALTURA_CUERPOS = 1.75;
const ALTURA_MUROS = 3.2;
const MAX_LUCES = 3;

export function instalarProyectiles(c) {
  const { juego, visuales } = c;
  const fisica = juego.fisica;
  const lista = c.proyectiles = [];
  let luces = 0;

  /**
   * proyectil({ x, y=1.1, z, dirX, dirZ, velocidad=30, alcance=40, danio, tipo='bala', radio, radioExplosion, gravedad,
   *   atacante, bando, efecto, alImpactar, visual, destino?, aviso?, empuje, aturdimiento, danioEstructuras, quemadura, escala,
   *   rebota?, mecha?, alMecha?, alSuelo?, estela? })
   *  - gravedad: parábola que aterriza a `alcance` m (o en `destino {x,z}`); por debajo de 1,75 m choca con los cuerpos.
   *  - alImpactar(p, x, z, hit): si devuelve `false` se omite el efecto por defecto (explosión o daño directo).
   *  - aviso: true | { radio, color }: círculo pulsante en el punto de caída (morteros).
   *  - rebota + mecha: objeto lanzado: rebota en suelo y muros y estalla al agotarse la mecha (alMecha).
   */
  c.proyectil = function proyectil(o) {
    let dx = o.dirX ?? 0, dz = o.dirZ ?? 1, alcance = o.alcance ?? 40;
    if (o.destino) {
      const ex = o.destino.x - o.x, ez = o.destino.z - o.z, l = Math.hypot(ex, ez);
      if (l > 1e-3) { dx = ex / l; dz = ez / l; alcance = l; }
    }
    const l0 = Math.hypot(dx, dz) || 1; dx /= l0; dz /= l0;
    const vel = o.velocidad ?? 30;
    const y0 = o.y ?? 1.1;
    const bando = o.bando ?? o.atacante?.bando ?? 'neutral';
    const p = {
      x: o.x, y: y0, z: o.z, vx: dx * vel, vz: dz * vel, vy: 0, dirX: dx, dirZ: dz,
      activo: true, recorrido: 0, t: 0, alcance, atacante: o.atacante ?? null, bando,
      danio: o.danio ?? 0, tipo: o.tipo ?? 'bala', radio: o.radio ?? 0.1, radioExplosion: o.radioExplosion ?? 0,
      gravedad: !!o.gravedad, efecto: o.efecto ?? null, alImpactar: o.alImpactar ?? null, arma: o.arma ?? null,
      empuje: o.empuje ?? 0, aturdimiento: o.aturdimiento ?? 0, danioEstructuras: o.danioEstructuras, quemadura: o.quemadura,
      rebota: !!o.rebota, mecha: o.mecha ?? 0, alMecha: o.alMecha ?? null, alSuelo: o.alSuelo ?? null,
      estela: o.estela ?? o.efectoEstela ?? null, _est: 0, visual: null, sombra: null, aviso: null, luz: null,
      mascara: o.mascara ?? mascaraDeBando(bando), filtro: null,
      giro: o.rebota ? { x: (juego.rng() - 0.5) * 14, y: (juego.rng() - 0.5) * 8, z: (juego.rng() - 0.5) * 14 } : null,
      quitar() { terminar(p); },
    };
    p.filtro = o.filtro ?? filtroDe(o.atacante, bando);
    if (p.gravedad || p.rebota) {
      const t = Math.max(0.15, alcance / vel);
      p.vy = (GRAVEDAD * t * t / 2 - y0) / t;
      if (p.rebota) p.vy = o.vy ?? p.vy;
    }
    p.visual = visuales.proyectil(o.visual ?? 'bala', o.escala ?? 1);
    if (p.visual) { p.visual.obj.position.set(p.x, p.y, p.z); orientar(p); }
    if (p.gravedad || p.rebota) p.sombra = visuales.sombra(0.5);
    if (o.aviso) {
      const a = o.aviso === true ? {} : o.aviso;
      const ax = o.x + dx * alcance, az = o.z + dz * alcance;
      const tEst = alcance / vel;
      p.aviso = visuales.aviso(ax, az, a.radio ?? (p.radioExplosion || 2), a.duracion ?? tEst, a.color);
    }
    if ((p.efecto === 'plasma' || p.visual && o.visual === 'cohete') && luces < MAX_LUCES) {
      p.luz = juego.render?.luzPuntual?.({ x: p.x, y: p.y, z: p.z, color: p.efecto === 'plasma' ? 0x55e0ff : 0xff9a3c, intensidad: 4, distancia: 7 }) ?? null;
      if (p.luz) luces++;
    }
    lista.push(p);
    return p;
  };

  function filtroDe(atacante, bando) {
    return filtroBalas(atacante ?? { bando, cuerpo: null });
  }

  function orientar(p) {
    const v = p.visual; if (!v) return;
    if (p.giro) { v.obj.rotation.x += p.giro.x * 0.016; v.obj.rotation.y += p.giro.y * 0.016; v.obj.rotation.z += p.giro.z * 0.016; return; }
    const hx = p.vx, hz = p.vz, hy = p.vy;
    const l = Math.hypot(hx, hz, hy) || 1;
    v.obj.rotation.set(-Math.asin(hy / l), Math.atan2(hx, hz), 0, 'YXZ');
  }

  function terminar(p) {
    if (!p.activo) return;
    p.activo = false;
    p.visual?.quitar(); p.visual = null;
    p.sombra?.quitar(); p.sombra = null;
    if (p.aviso) { p.aviso.t = p.aviso.dur; p.aviso = null; }
    if (p.luz) { p.luz.quitar?.(); p.luz = null; luces = Math.max(0, luces - 1); }
    const i = lista.indexOf(p); if (i >= 0) { lista[i] = lista[lista.length - 1]; lista.pop(); }
  }

  /** Efecto de fin de vida: explosión, daño directo o nada. */
  function impactar(p, x, z, hit, normal) {
    if (p.alImpactar && p.alImpactar(p, x, z, hit) === false) { terminar(p); return; }
    const y = Math.max(0.2, p.y);
    if (p.radioExplosion > 0) {
      c.explotar({
        x, z, y, radio: p.radioExplosion, danio: p.danio, tipo: p.tipo, atacante: p.atacante, arma: p.arma, empuje: p.empuje,
        aturdimiento: p.aturdimiento, danioEstructuras: p.danioEstructuras, quemadura: p.quemadura, bando: p.atacante ? undefined : p.bando,
      });
    } else if (hit) {
      const ent = entidadDe(hit.cuerpo);
      if (ent) {
        c.aplicarDanio(ent, {
          cantidad: p.danio, tipo: p.tipo, atacante: p.atacante, bando: p.bando, arma: p.arma, x, z, dirX: p.dirX, dirZ: p.dirZ,
          empuje: p.empuje, aturdimiento: p.aturdimiento, quemadura: p.quemadura, nx: hit.nx, nz: hit.nz, puedeCritico: false,
        });
      } else {
        juego.eventos.emitir('impacto', { x, y, z, nx: hit.nx, nz: hit.nz, material: materialDeCuerpo(hit.cuerpo), tipo: p.tipo, objetivo: null });
      }
    } else {
      juego.eventos.emitir('impacto', { x, y: 0.05, z, nx: 0, nz: 0, material: 'suelo', tipo: p.tipo, objetivo: null });
    }
    if (p.efecto && !/^explosion|^fuego|^singularidad/.test(p.efecto)) juego.fx?.emitir?.(p.efecto, { x, y, z }, { escala: Math.max(0.6, p.radioExplosion * 0.5) });
    terminar(p);
  }

  const _h = { x: 0, z: 0 };

  function paso(p, dt) {
    p.t += dt;
    const g = p.gravedad || p.rebota;
    const nx = p.x + p.vx * dt, nz = p.z + p.vz * dt;
    let ny = p.y;
    if (g) { ny = p.y + p.vy * dt - 0.5 * GRAVEDAD * dt * dt; p.vy -= GRAVEDAD * dt; }
    const paso = Math.hypot(nx - p.x, nz - p.z);

    // Barrido anti-túnel contra cuerpos y muros
    if (paso > 1e-6) {
      const ux = (nx - p.x) / paso, uz = (nz - p.z) / paso;
      const bajo = !g || Math.min(p.y, ny) < ALTURA_CUERPOS;
      let mask = p.mascara;
      if (p.rebota && p.mecha > 0) mask = CAPA.ESTATICO; // las granadas con mecha rebotan en muros y atraviesan cuerpos
      else if (!bajo) mask = CAPA.ESTATICO;
      if (Math.min(p.y, ny) > ALTURA_MUROS) mask = 0;
      const hit = mask ? fisica.rayo(p.x, p.z, ux, uz, paso + p.radio, mask, p.filtro) : null;
      if (hit && hit.dist <= paso + p.radio) {
        const ent = entidadDe(hit.cuerpo);
        if (p.rebota && p.mecha > 0) {
          // Rebote en muro: refleja la velocidad horizontal
          const dot = p.vx * hit.nx + p.vz * hit.nz;
          if (dot < 0) { p.vx -= 1.55 * dot * hit.nx; p.vz -= 1.55 * dot * hit.nz; p.vx *= 0.8; p.vz *= 0.8; }
          p.x = hit.x + hit.nx * (p.radio + 0.05); p.z = hit.z + hit.nz * (p.radio + 0.05);
          p.y = ny; return;
        }
        // Se detiene un poco antes de la superficie para que la explosión no quede dentro del muro
        const k = Math.max(0, hit.dist - 0.05);
        p.x += ux * k; p.z += uz * k; p.y = ny;
        impactar(p, p.x, p.z, hit);
        return;
      }
    }
    p.x = nx; p.z = nz; p.y = ny;
    p.recorrido += paso;

    if (p.rebota) {
      if (p.y <= 0.1) {
        p.y = 0.1;
        if (p.mecha <= 0 || p.alSuelo) { // molotov y compañía: se rompe al tocar el suelo
          if (p.alSuelo) p.alSuelo(p, p.x, p.z);
          if (p.mecha <= 0) { impactar(p, p.x, p.z, null); return; }
        }
        if (Math.abs(p.vy) > 2.2) { p.vy = -p.vy * 0.36; p.vx *= 0.32; p.vz *= 0.32; juego.fx?.emitir?.('polvo', { x: p.x, y: 0.1, z: p.z }, { escala: 0.35, cantidad: 2 }); }
        else { p.vy = 0; const f = Math.exp(-7 * dt); p.vx *= f; p.vz *= f; }
      }
      if (p.mecha > 0 && p.t >= p.mecha) {
        const cb = p.alMecha;
        if (cb && cb(p, p.x, p.z) === false) { terminar(p); return; }
        impactar(p, p.x, p.z, null);
        return;
      }
    } else if (p.gravedad) {
      if (p.y <= 0.05) { impactar(p, p.x, p.z, null); return; }
    } else if (p.recorrido >= p.alcance) {
      // Fin de alcance: los explosivos estallan, el resto se desvanece
      if (p.radioExplosion > 0) impactar(p, p.x, p.z, null); else terminar(p);
      return;
    }
    // Vida máxima de seguridad
    if (p.t > 12) { terminar(p); return; }

    if (p.visual) {
      p.visual.obj.position.set(p.x, p.y, p.z);
      if (p.giro) { const o = p.visual.obj; o.rotation.x += p.giro.x * dt; o.rotation.y += p.giro.y * dt; o.rotation.z += p.giro.z * dt; }
      else orientar(p);
      p.visual.actualizar(dt, juego.tiempo.real);
    }
    if (p.sombra) { const a = Math.max(0.25, 1 - p.y / 5); p.sombra.obj.position.set(p.x, 0.045, p.z); p.sombra.obj.scale.setScalar(0.45 * a); }
    if (p.luz) { p.luz.pos?.set?.(p.x, p.y, p.z); }
    // Estela de humo / chispas
    p._est -= dt;
    if (p._est <= 0 && juego.fx?.emitir) {
      const e = p.estela ?? (p.efecto === 'plasma' ? 'plasma' : p.visual && p.visual.obj.userData.llama ? 'humo' : null);
      if (e) { p._est = e === 'humo' ? 0.035 : 0.05; juego.fx.emitir(e, { x: p.x - p.dirX * 0.4, y: p.y, z: p.z - p.dirZ * 0.4 }, { dirX: -p.dirX, dirZ: -p.dirZ, escala: e === 'humo' ? 0.5 : 0.4, cantidad: 1 }); }
      else if (p.visual?.obj.userData.chispa) { p._est = 0.06; juego.fx.emitir('chispas', { x: p.x, y: p.y + 0.15, z: p.z }, { escala: 0.25, cantidad: 1 }); }
      else p._est = 0.1;
    }
  }

  c._actualizarProyectiles = function (dt) {
    for (let i = lista.length - 1; i >= 0; i--) {
      const p = lista[i];
      if (!p.activo) { lista.splice(i, 1); continue; }
      // Subpasos para velocidades muy altas con dt grande
      const n = Math.min(4, Math.ceil(dt / 0.034));
      for (let k = 0; k < n && p.activo; k++) paso(p, dt / n);
    }
  };

  c._limpiarProyectiles = function () { for (const p of lista.slice()) terminar(p); lista.length = 0; luces = 0; };

  // ─────────────────────────── Arrojadizas ───────────────────────────
  /**
   * lanzar(portador, armaId, origen, destino{x,z}): parábola con rebote, mecha y efecto propio del arma:
   * granadas → explosión; molotov → estalla al tocar el suelo y deja una zona de fuego; singularidad → pozo de gravedad que implosiona.
   */
  c.lanzar = function lanzar(portador, armaId, origen, destino) {
    const def = ARMAS[armaId];
    if (!def || def.comportamiento !== 'arrojadiza') return null;
    const ox = origen.x, oz = origen.z;
    let dx = destino.x - ox, dz = destino.z - oz, d = Math.hypot(dx, dz);
    if (d < 0.2) { dx = Math.sin(portador?.rot ?? 0); dz = Math.cos(portador?.rot ?? 0); d = 0.2; } else { dx /= d; dz /= d; }
    const dMax = def.alcance ?? 18;
    const dist = Math.min(d, dMax);
    const T = Math.min(1.15, Math.max(0.5, 0.42 + dist * 0.04));
    const y0 = origen.y ?? 1.2;
    const mecha = def.mecha ?? 0;
    const bando = portador?.bando ?? 'jugadores';
    const aterrizaje = { x: ox + dx * dist, z: oz + dz * dist };
    const radio = def.radio ?? 4;

    const explosionBase = (p, x, z) => ({
      x, z, y: 0.5, radio, danio: def.danio, tipo: def.tipo, atacante: portador, arma: def, empuje: def.empuje ?? 0,
      aturdimiento: def.aturdimiento ?? 0, quemadura: def.quemadura,
    });
    const p = c.proyectil({
      x: ox, y: y0, z: oz, dirX: dx, dirZ: dz, velocidad: dist / T, alcance: dist, atacante: portador, bando, arma: def,
      visual: def.visual ?? 'granada_mecha', rebota: true, mecha, danio: def.danio, tipo: def.tipo,
      // radioExplosion = 0: la lógica de estallido la gestionan alImpactar/alMecha según el arma
      alImpactar: (pp, x, z) => {
        if (def.efecto === 'singularidad') {
          const zona = def.zona ?? { duracion: 2.5, dps: 0 };
          c.crearZona({
            x, z, radio, duracion: zona.duracion, tipo: 'gravedad', dps: zona.dps ?? 0, atacante: portador, afecta: 'zombis',
            alTerminar: () => c.explotar({ ...explosionBase(pp, x, z), tipo: 'energia', empuje: def.empuje ?? -30 }),
          });
          juego.fx?.emitir?.('singularidad', { x, y: 0.6, z }, { escala: radio / 5 });
        } else if (def.efecto === 'fuego') {
          c.explotar({ ...explosionBase(pp, x, z), radio: radio * 0.75, tipo: 'fuego', quemadura: { duracion: 3, dps: 28 } });
          const zona = def.zona ?? { tipo: 'fuego', duracion: 7, dps: 55 };
          c.crearZona({ x, z, radio, duracion: zona.duracion, tipo: zona.tipo, dps: zona.dps, atacante: portador, afecta: portador?.bando === 'jugadores' ? 'todos' : undefined, sinFusion: true });
          juego.fx?.emitir?.('fuego', { x, y: 0.4, z }, { escala: radio * 0.4, cantidad: 12 });
        } else {
          c.explotar(explosionBase(pp, x, z));
        }
        return false;
      },
      escala: 1.8,
    });
    if (!p) return null;
    p.mecha = mecha; // molotov: mecha 0 → se rompe al tocar el suelo (ver paso)
    p.alMecha = null;
    portador?.visual?.accion?.('lanzar', { duracion: 0.35 });
    juego.eventos.emitir('arma:lanzar', { portador, arma: def, origen, destino: aterrizaje });
    return p;
  };
}
