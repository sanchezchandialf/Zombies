// 1850 · Depósito de agua: torre de madera con tanque. Al destruir dos de sus patas se derrumba: la riada empuja y derriba
// zombis en un cono y deja barro que los ralentiza.
// Opciones de crear: { x, z, rot, vidaPata=90, alcance=13 (m del cono), barroDuracion=14 (s) }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, matAditivo, lim, suave } from './comun.js';

class Pata {
  constructor(padre, i, x, z, vida) {
    this.padre = padre; this.i = i; this.bando = 'neutral'; this.material = 'madera'; this.radio = 0.3; this.vida = vida; this.vidaMax = vida;
    this.vivo = true; this.pos = new THREE.Vector3(padre.pos.x + x, 0, padre.pos.z + z); this.lx = x; this.lz = z;
  }
  recibirDanio(info) {
    if (!this.vivo || this.padre.caida > 0) return 0;
    const c = info.cantidad || 0; if (c <= 0) return 0;
    this.vida -= c; this.padre.fx('astillas', info.x ?? this.pos.x, 1.2, info.z ?? this.pos.z, { cantidad: 4 });
    if (this.vida <= 0) { this.vivo = false; this.padre.alPerderPata(this); }
    return c;
  }
}

class DepositoAgua extends Interactivo {
  constructor(juego, o) {
    super(juego, 'deposito_agua', o, { vida: 360, material: 'madera', radio: 1.6 });
    this.caida = 0; this.vel = 0; this.alcance = o.alcance ?? 13; this.tRiada = 0; this.barroT = 0; this.barroDur = o.barroDuracion ?? 14;
    this.torre = new THREE.Group(); this.pivote = new THREE.Group(); this.grupo.add(this.pivote); this.pivote.add(this.torre);
    this.patasM = [];
    this._modelo();
    const vp = o.vidaPata ?? 90;
    this.patas = [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]].map(([x, z], i) => {
      const c = Math.cos(this.rot), s = Math.sin(this.rot);
      const p = new Pata(this, i, x * c + z * s, -x * s + z * c, vp);
      p.cb = this.cuerpo({ forma: 'circulo', x: p.pos.x, z: p.pos.z, radio: 0.26, masa: 0, capa: CAPA.ESTRUCTURA, datos: p });
      return p;
    });
    this.bloque = this.patas;
  }
  get vida() { return this.patas ? this.patas.reduce((s, p) => s + Math.max(0, p.vida), 0) : this._v ?? 360; }
  set vida(v) { this._v = v; }
  recibirDanio(info) { // el cuerpo del tanque sin patas: reparte al apoyo más cercano
    if (!this.vivo || !info) return 0;
    let mejor = null, dm = 1e9;
    for (const p of this.patas) if (p.vivo) { const d = Math.hypot(p.pos.x - (info.x ?? this.pos.x), p.pos.z - (info.z ?? this.pos.z)); if (d < dm) { dm = d; mejor = p; } }
    return mejor ? mejor.recibirDanio({ ...info, cantidad: (info.cantidad || 0) * 0.5 }) : 0;
  }

  _modelo() {
    const t = this.torre, m = this.malla(), mad = 'tablas_viejas', hi = ['hierro_oxidado', { desgaste: 0.6 }];
    // patas independientes
    [[-1.2, -1.2], [1.2, -1.2], [1.2, 1.2], [-1.2, 1.2]].forEach(([x, z], i) => {
      const g = new THREE.Group(); t.add(g); const pm = this.malla();
      const ix = -Math.sign(x) * 0.09, iz = -Math.sign(z) * 0.09;
      pm.add(caja(0.3, 4.3, 0.3, 0.05), mad, { p: [x, 2.15, z], r: [Math.sign(z) * 0.035, 0, -Math.sign(x) * 0.035] });
      pm.add(caja(0.5, 0.18, 0.5, 0.05), 'silleria', { p: [x * 1.02, 0.09, z * 1.02] });
      pm.add(caja(0.12, 0.12, 0.12, 0.02), hi, { p: [x + ix, 0.9, z + iz] });
      this.construir(pm, g); this.patasM.push(g);
    });
    // riostras en X entre patas
    const diag = (x1, z1, x2, z2, y1, y2) => {
      const dx = x2 - x1, dz = z2 - z1, dy = y2 - y1, L = Math.hypot(dx, dy, dz);
      const mid = [(x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2];
      const yaw = Math.atan2(dx, dz), pit = -Math.atan2(dy, Math.hypot(dx, dz));
      m.add(caja(0.1, 0.1, L, 0.02), mad, { p: mid, r: [pit, yaw, 0] });
    };
    for (const [yb, yt] of [[0.8, 2.5], [2.6, 4.1]]) {
      diag(-1.2, -1.2, 1.2, -1.2, yb, yt); diag(1.2, -1.2, -1.2, -1.2, yb, yt);
      diag(-1.2, 1.2, 1.2, 1.2, yb, yt); diag(1.2, 1.2, -1.2, 1.2, yb, yt);
      diag(-1.2, -1.2, -1.2, 1.2, yb, yt); diag(-1.2, 1.2, -1.2, -1.2, yb, yt);
      diag(1.2, -1.2, 1.2, 1.2, yb, yt); diag(1.2, 1.2, 1.2, -1.2, yb, yt);
    }
    for (const y of [2.55, 4.15]) for (const [x, z, w, d] of [[0, -1.2, 2.5, 0.12], [0, 1.2, 2.5, 0.12], [-1.2, 0, 0.12, 2.5], [1.2, 0, 0.12, 2.5]]) m.add(caja(w, 0.14, d, 0.03), mad, { p: [x, y, z] });
    // plataforma
    m.add(caja(3.1, 0.16, 3.1, 0.04), 'tablones', { p: [0, 4.3, 0] });
    // tanque de duelas con aros
    const per = [[0, 0], [1.38, 0], [1.5, 0.12], [1.62, 0.5], [1.66, 1.2], [1.62, 1.9], [1.5, 2.25], [1.42, 2.3], [0, 2.3]];
    m.add(torno(per, 40), ['tablas_viejas', { color: 0xb08a5a }], { p: [0, 4.38, 0] });
    for (const [y, r] of [[0.25, 1.55], [0.8, 1.64], [1.35, 1.66], [1.9, 1.61]]) m.add(toro(r + 0.01, 0.035, 44, 6), hi, { p: [0, 4.38 + y, 0], r: [Math.PI / 2, 0, 0] });
    // tapa cónica
    m.add(torno([[0, 0], [1.6, 0], [1.55, 0.06], [1.0, 0.7], [0.35, 1.15], [0.0, 1.25]], 36), ['teja_arabe', { color: 0x6a4a34 }], { p: [0, 6.68, 0] });
    m.add(esfera(0.1, 10), hi, { p: [0, 7.95, 0] });
    // escalera
    for (let i = 0; i < 12; i++) m.add(caja(0.5, 0.05, 0.05, 0.01), mad, { p: [0.0, 0.4 + i * 0.36, 1.78] });
    for (const s of [-1, 1]) m.add(caja(0.06, 4.6, 0.06, 0.015), mad, { p: [s * 0.27, 2.45, 1.78], r: [0.05, 0, 0] });
    // caño de descarga
    m.add(tubo([[1.1, 4.6, 0.9], [1.7, 4.4, 1.5], [2.3, 3.7, 2.3], [2.4, 3.2, 2.4]], 0.11, 18, 8), ['hierro_oxidado', { desgaste: 0.7 }], {});
    m.add(cil(0.18, 0.14, 0.12, 12), hi, { p: [2.4, 3.15, 2.4] });
    this.construir(m, t);
  }

  alPerderPata(p) {
    const g = this.patasM[p.i]; g.visible = false;
    this.quitarCuerpo(p.cb);
    this.escombros({ x: p.pos.x, y: 1.5, z: p.pos.z, cantidad: 10, material: 'madera', fuerza: 4 });
    this.fx('polvo', p.pos.x, 0.5, p.pos.z, { escala: 1 });
    this.sonido('madera_rotura', { volumen: 0.9 });
    const rotas = this.patas.filter((q) => !q.vivo);
    if (rotas.length >= 2) {
      let cx = 0, cz = 0; for (const q of rotas) { cx += q.lx; cz += q.lz; }
      if (Math.hypot(cx, cz) < 0.1) { cx = rotas[0].lx; cz = rotas[0].lz; }
      this.derrumbar(cx, cz);
    } else { this.torre.rotation.z += 0.012; this.torre.rotation.x += 0.012; this.sonido('crujido_madera', { volumen: 0.7 }); }
  }

  derrumbar(dxw, dzw) {
    if (this.caida > 0) return;
    const l = Math.hypot(dxw, dzw) || 1; dxw /= l; dzw /= l; this.dirW = { x: dxw, z: dzw };
    const c = Math.cos(this.rot), s = Math.sin(this.rot);
    const lx = dxw * c - dzw * s, lz = dxw * s + dzw * c; this.dirL = { x: lx, z: lz };
    this.pivote.position.set(lx * 1.5, 0, lz * 1.5); this.torre.position.set(-lx * 1.5, 0, -lz * 1.5);
    this.torre.rotation.set(0, 0, 0);
    this.caida = 0.001; this.estado = 'activo';
    for (const p of this.patas) { if (p.vivo) { p.vivo = false; this.quitarCuerpo(p.cb); } }
    this.sonido('crujido_madera', { volumen: 1 });
  }

  _riada() {
    this.tRiada = 0.001;
    const x = this.pos.x + this.dirW.x * 1.8, z = this.pos.z + this.dirW.z * 1.8;
    this.fx('salpicadura', x, 0.5, z, { escala: 3, cantidad: 40 }); this.fx('polvo', x, 0.5, z, { escala: 3 });
    this.sacudir(0.5, 0.6); this.sonido('riada', { volumen: 1 });
    // abanico de agua
    const ang = Math.atan2(this.dirW.x, this.dirW.z), A = Math.PI * 0.42;
    const g = new THREE.CircleGeometry(1, 40, Math.PI / 2 - ang - A, A * 2); g.rotateX(-Math.PI / 2);
    const m = new THREE.MeshStandardMaterial({ color: 0x6f95a8, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.75, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.agua = new THREE.Mesh(g, m); this.agua.position.set(this.pos.x, 0.07, this.pos.z); this.agua.renderOrder = 2; this.agua.scale.setScalar(0.01);
    this.escena_ = this._escena; this.propioObj(this.agua, this._escena || this.grupo);
    const gb = new THREE.CircleGeometry(1, 40, Math.PI / 2 - ang - A, A * 2); gb.rotateX(-Math.PI / 2);
    const mb = new THREE.MeshStandardMaterial({ color: 0x3b2a1b, roughness: 0.35, metalness: 0, transparent: true, opacity: 0, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
    this.barro = new THREE.Mesh(gb, mb); this.barro.position.set(this.pos.x, 0.05, this.pos.z); this.barro.scale.setScalar(this.alcance); this.barro.renderOrder = 1;
    this.propioObj(this.barro, this._escena || this.grupo);
    this.A = A; this.aImpactadas = new Set();
  }

  _enCono(e) {
    const dx = e.pos.x - this.pos.x, dz = e.pos.z - this.pos.z, d = Math.hypot(dx, dz);
    if (d > this.alcance || d < 0.01) return d < 0.01;
    return (dx * this.dirW.x + dz * this.dirW.z) / d > Math.cos(this.A);
  }

  paso(dt) {
    if (this.caida > 0 && this.caida < 1.45) {
      this.vel += 7 * dt; this.caida = Math.min(1.5, this.caida + this.vel * dt);
      const eje = this._eje || (this._eje = new THREE.Vector3()); eje.set(this.dirL.z, 0, -this.dirL.x);
      this.pivote.quaternion.setFromAxisAngle(eje, this.caida);
      if (this.caida >= 1.45) { this.caida = 1.5; this.pivote.quaternion.setFromAxisAngle(eje, 1.5); this._riada(); this.escombros({ x: this.pos.x + this.dirW.x * 3, y: 1, z: this.pos.z + this.dirW.z * 3, cantidad: 20, material: 'madera', fuerza: 6 }); }
    }
    if (this.tRiada > 0) {
      this.tRiada += dt;
      const f = suave(this.tRiada / 1.3);
      this.agua.scale.setScalar(Math.max(0.01, this.alcance * f));
      this.agua.material.opacity = 0.75 * (1 - suave((this.tRiada - 2.5) / 3));
      this.barro.material.opacity = 0.85 * suave((this.tRiada - 0.8) / 2) * (1 - suave((this.tRiada - this.barroDur + 3) / 3));
      if (this.tRiada < 1.6) {
        const lim_ = this.alcance * f;
        this.alrededor(this.pos.x, this.pos.z, lim_ + 0.5, (z) => {
          if (this.aImpactadas.has(z) || !this._enCono(z)) return;
          this.aImpactadas.add(z);
          z.aturdir?.(2.4);
          this.danioA(z, { cantidad: 18, tipo: 'golpe', atacante: null, x: z.pos.x, z: z.pos.z, dirX: this.dirW.x, dirZ: this.dirW.z, empuje: 12 });
          z.empujar?.(this.dirW.x * 520, this.dirW.z * 520);
        }, { jugadores: true });
      }
      if (this.tRiada > 3 && this.tRiada < this.barroDur) {
        this.alrededor(this.pos.x, this.pos.z, this.alcance, (z) => { if (this._enCono(z)) { z.ralentizar?.(0.45, 0.5); } }, { jugadores: true });
      }
      if (this.tRiada >= this.barroDur) { this.barro.visible = false; this.tRiada = -1; this.estado = 'destruido'; }
    }
  }
}
registrarTipo('deposito_agua', (juego, o) => new DepositoAgua(juego, o));
