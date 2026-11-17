// FX de respaldo para la página de prueba del combate: implementa la interfaz de src/fx con sprites aditivos sencillos.
// Solo se usa si el módulo FX real aún es el provisional. No forma parte del juego.
import * as THREE from 'three';

function texBrillo() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const g = cv.getContext('2d'), gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,0.6)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

export function crearFxPrueba(juego) {
  const escena = juego.render.escena;
  const tex = texBrillo();
  const matAd = new THREE.SpriteMaterial({ map: tex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false });
  const parts = [];
  const libres = [];
  const rng = juego.rng;
  const lineas = [];

  function particula(pos, o) {
    let s = libres.pop();
    if (!s) { s = new THREE.Sprite(matAd.clone()); escena.add(s); }
    s.visible = true; s.position.set(pos.x, pos.y, pos.z);
    s.material.color.setHex(o.color ?? 0xffffff); s.material.blending = o.normal ? THREE.NormalBlending : THREE.AdditiveBlending;
    s.material.opacity = 1; s.material.needsUpdate = true;
    parts.push({ s, vx: o.vx ?? 0, vy: o.vy ?? 0, vz: o.vz ?? 0, vida: o.vida ?? 0.4, t: 0, tam0: o.tam ?? 0.4, tam1: o.tam1 ?? (o.tam ?? 0.4) * 0.3, grav: o.grav ?? 0, arrastre: o.arrastre ?? 1, op: o.op ?? 1 });
  }
  const rv = (k) => (rng() - 0.5) * 2 * k;

  function ráfaga(n, pos, base, o = {}) {
    for (let i = 0; i < n; i++) {
      const a = rng() * 6.283, v = (o.vel ?? 3) * (0.3 + rng());
      particula(pos, { ...base, vx: Math.cos(a) * v + (o.dirX ?? 0) * (o.avance ?? 0) * rng(), vz: Math.sin(a) * v + (o.dirZ ?? 0) * (o.avance ?? 0) * rng(), vy: (o.vy ?? 1.5) * rng(), vida: (base.vida ?? 0.4) * (0.6 + rng() * 0.8) });
    }
  }

  const fx = {
    emitir(nombre, pos, op = {}) {
      const e = op.escala ?? 1, p = { x: pos.x, y: pos.y ?? 1, z: pos.z };
      switch (nombre) {
        case 'fogonazo': {
          const col = op.color ?? ({ plasma: 0x66e8ff, riel: 0xbfd6ff, electrico: 0xb08cff, onda: 0xff8ae6 }[op.tipo] ?? 0xffc66a);
          particula(p, { color: col, tam: 1.6 * e, tam1: 0.4, vida: 0.07, op: 1 });
          ráfaga(4, p, { color: 0xffe0a0, tam: 0.18, vida: 0.14 }, { vel: 6 * e, dirX: op.dirX, dirZ: op.dirZ, avance: 8, vy: 0.5 });
          break;
        }
        case 'humo': for (let i = 0; i < (op.cantidad ?? 3); i++) particula(p, { color: op.color ?? 0x55504a, normal: true, tam: 0.3 * e, tam1: 1.4 * e, vida: 0.9 + rng() * 0.5, vx: (op.dirX ?? 0) * 1.2 + rv(0.4), vz: (op.dirZ ?? 0) * 1.2 + rv(0.4), vy: 0.6 + rng() * 0.5, op: 0.55, arrastre: 2 }); break;
        case 'sangre': case 'sangre_grande': ráfaga(op.cantidad ?? 6, p, { color: 0xaa1014, tam: 0.16, vida: 0.5, grav: 12 }, { vel: 3.2, dirX: op.dirX, dirZ: op.dirZ, avance: 5, vy: 2.5 }); break;
        case 'chispas': ráfaga(op.cantidad ?? 5, p, { color: 0xffd070, tam: 0.12, vida: 0.4, grav: 9 }, { vel: 4.5 * e, dirX: op.dirX, dirZ: op.dirZ, avance: 4, vy: 3 }); break;
        case 'polvo': case 'piedra': case 'astillas': ráfaga(op.cantidad ?? 4, p, { color: 0x9c8e78, normal: true, tam: 0.25, tam1: 0.7, vida: 0.7, op: 0.6 }, { vel: 1.8, vy: 1 }); break;
        case 'casquillo': particula(p, { color: 0xd8b04a, tam: 0.07, vida: 0.5, vx: (op.dirX ?? 1) * 2.2 + rv(0.4), vz: (op.dirZ ?? 0) * 2.2 + rv(0.4), vy: 2.4, grav: 14 }); break;
        case 'electrico': particula(p, { color: 0xb8a4ff, tam: 0.9 * e, tam1: 0.2, vida: 0.1 }); ráfaga(3, p, { color: 0xd8ccff, tam: 0.1, vida: 0.15 }, { vel: 3 }); break;
        case 'plasma': particula(p, { color: 0x55e0ff, tam: 0.5 * e, tam1: 0.1, vida: 0.3 }); break;
        case 'llama': for (let i = 0; i < (op.cantidad ?? 3); i++) { const j = rv(0.2); particula(p, { color: rng() < 0.5 ? 0xff7a1c : 0xffc040, tam: 0.35, tam1: 1.3 * e, vida: 0.32 + rng() * 0.12, vx: ((op.dirX ?? 0) + j) * 15 * e, vz: ((op.dirZ ?? 1) + j) * 15 * e, vy: rv(0.4) + 0.3, arrastre: 1.5 }); } break;
        case 'fuego': ráfaga(op.cantidad ?? 5, p, { color: 0xff8a2a, tam: 0.5 * e, tam1: 0.1, vida: 0.6 }, { vel: 1.2 * e, vy: 3 }); break;
        case 'singularidad': ráfaga(6, p, { color: 0xb070ff, tam: 0.5 * e, tam1: 0.05, vida: 0.7 }, { vel: 2 * e, vy: 0.2 }); break;
        case 'curacion': particula(p, { color: 0x62e0a1, tam: 0.35, tam1: 0.1, vida: 0.9, vy: 1.4 }); break;
        case 'gas_toxico': particula(p, { color: 0x9bd64a, normal: true, tam: 0.8 * e, tam1: 2 * e, vida: 1.4, vy: 0.6, op: 0.35 }); break;
        case 'acido': particula(p, { color: 0x9dff3a, tam: 0.4 * e, tam1: 0.1, vida: 0.5, vy: 1.8, grav: 6 }); break;
        case 'explosion': case 'explosion_grande': {
          const R = op.escala ?? 3;
          particula({ x: p.x, y: 0.8, z: p.z }, { color: 0xfff0b0, tam: R * 2.6, tam1: R * 0.6, vida: 0.14 });
          for (let i = 0; i < 16; i++) { const a = rng() * 6.283, r = R * 0.55 * rng(); particula({ x: p.x + Math.cos(a) * r, y: 0.5 + rng() * 1.5, z: p.z + Math.sin(a) * r }, { color: rng() < 0.5 ? 0xff7a22 : 0xffb040, tam: R * 0.5, tam1: R * 1.5, vida: 0.4 + rng() * 0.3, vy: 2 + rng() * 2 }); }
          for (let i = 0; i < 10; i++) { const a = rng() * 6.283; particula(p, { color: 0x3a3632, normal: true, tam: R * 0.5, tam1: R * 1.8, vida: 1.2 + rng(), vx: Math.cos(a) * R * 0.8, vz: Math.sin(a) * R * 0.8, vy: 2 + rng() * 2, op: 0.7, arrastre: 2.5 }); }
          ráfaga(22, p, { color: 0xffc860, tam: 0.14, vida: 0.7, grav: 10 }, { vel: R * 3.5, vy: 6 });
          break;
        }
        default: particula(p, { color: 0xffffff, tam: 0.3 * e, vida: 0.2 });
      }
    },
    crearEmisor(nombre, pos, op = {}) {
      const em = { pos, activo: true, escala: op.escala ?? 1, t: 0, nombre, detener() { this.activo = false; } };
      emisores.push(em); return em;
    },
    trazadora(a, b, op = {}) {
      const col = op.color ?? ({ bala: 0xffe2a0, pulso: 0x66e8ff, riel: 0xdfe8ff, aguja: 0xff7ad9, arco: 0xb8a4ff, laser: 0xff4040 }[op.tipo] ?? 0xffe2a0);
      const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(a.x, a.y, a.z), new THREE.Vector3(b.x, b.y, b.z)]);
      const m = new THREE.LineBasicMaterial({ color: col, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
      const l = new THREE.Line(g, m); l.frustumCulled = false; escena.add(l);
      lineas.push({ l, t: 0, dur: op.tipo === 'riel' ? 0.3 : op.tipo === 'arco' ? 0.12 : 0.07 });
    },
    calco() {}, escombros() {}, destello(pos, color, inten, dur) { particula({ x: pos.x, y: pos.y ?? 1, z: pos.z }, { color: color ?? 0xffc27a, tam: 2.4, tam1: 0.6, vida: Math.max(0.05, dur ?? 0.06), op: 0.5 }); },
    limpiar() {},
    actualizar(dt) {
      for (const em of emisores) {
        if (!em.activo) continue;
        em.t -= dt;
        if (em.t <= 0) { em.t = em.nombre === 'fuego' ? 0.07 : 0.12; fx.emitir(em.nombre, { x: em.pos.x + rv(em.escala * 0.5), y: 0.2, z: em.pos.z + rv(em.escala * 0.5) }, { escala: em.escala * 0.6, cantidad: 1 }); }
      }
      for (let i = emisores.length - 1; i >= 0; i--) if (!emisores[i].activo) emisores.splice(i, 1);
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.t += dt;
        const f = p.t / p.vida;
        if (f >= 1) { p.s.visible = false; libres.push(p.s); parts.splice(i, 1); continue; }
        const ar = Math.exp(-p.arrastre * dt);
        p.vx *= ar; p.vz *= ar; p.vy = p.vy * ar - p.grav * dt;
        p.s.position.x += p.vx * dt; p.s.position.z += p.vz * dt; p.s.position.y = Math.max(0.02, p.s.position.y + p.vy * dt);
        p.s.scale.setScalar(p.tam0 + (p.tam1 - p.tam0) * f);
        p.s.material.opacity = p.op * (1 - f * f);
      }
      for (let i = lineas.length - 1; i >= 0; i--) {
        const l = lineas[i]; l.t += dt;
        l.l.material.opacity = Math.max(0, 1 - l.t / l.dur);
        if (l.t >= l.dur) { l.l.removeFromParent(); l.l.geometry.dispose(); l.l.material.dispose(); lineas.splice(i, 1); }
      }
    },
  };
  const emisores = [];

  // Como el FX real, escucha impactos y explosiones por su cuenta
  juego.eventos.en('impacto', (d) => {
    const p = { x: d.x, y: d.y, z: d.z };
    if (d.material === 'carne') { fx.emitir('sangre', p, { dirX: d.dirX ?? -d.nx, dirZ: d.dirZ ?? -d.nz, cantidad: d.critico ? 12 : 5 }); }
    else if (d.material === 'metal') fx.emitir('chispas', p, { dirX: d.nx, dirZ: d.nz, cantidad: 7 });
    else { fx.emitir('chispas', p, { dirX: d.nx, dirZ: d.nz, cantidad: 3 }); fx.emitir('polvo', p, {}); }
  });
  juego.eventos.en('explosion', (d) => {
    fx.emitir('explosion', { x: d.x, y: 0.5, z: d.z }, { escala: Math.max(1.2, d.radio * 0.5) });
  });
  return fx;
}
