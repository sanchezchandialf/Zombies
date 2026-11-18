// 1850 · Palanca de tren: tras 3 s de aviso (silbato, vía parpadeando) una locomotora de vapor con dos vagones cruza la vía
// arrollando todo lo que haya en la franja. Enfriamiento largo.
// Opciones de crear: { x, z, rot, via:{x1,z1,x2,z2} (por defecto 6 m al frente del lever, ±40 m), dibujarVia=false, aviso=3, velocidad=24, enfriamiento=40, ancho=3 }
import { registrarTipo } from '../registro.js';
import { Interactivo, THREE, CAPA, caja, cil, torno, toro, esfera, tubo, emisivo, matAditivo, lim } from './comun.js';

const LARGO_TREN = 19;

function dibujarVia(inst, x1, z1, x2, z2) {
  const L = Math.hypot(x2 - x1, z2 - z1), ang = Math.atan2(x2 - x1, z2 - z1);
  const g = new THREE.Group(); g.position.set(x1, 0, z1); g.rotation.y = ang;
  const m = inst.malla();
  m.add(caja(2.6, 0.12, L, 0.05), ['hormigon_bunker', { color: 0x8a8378, desgaste: 0.8 }], { p: [0, 0.04, L / 2] });
  for (let s = 0.5; s < L; s += 0.75) m.add(caja(2.1, 0.12, 0.22, 0.025), 'tablas_viejas', { p: [0, 0.16, s] });
  for (const k of [-0.72, 0.72]) m.add(caja(0.09, 0.15, L, 0.02), ['hierro_oxidado', { desgaste: 0.3 }], { p: [k, 0.29, L / 2] });
  m.construir(g, { sombra: false });
  inst.propioObj(g, inst._escena || inst.grupo);
  inst._extras.push(g);
  return g;
}

class PalancaTren extends Interactivo {
  constructor(juego, o) {
    super(juego, 'palanca_tren', o, { vida: 150, material: 'metal', radio: 0.5 });
    const v = o.via || { x1: this.pos.x - 40, z1: this.pos.z - 6, x2: this.pos.x + 40, z2: this.pos.z - 6 };
    this.via = v;
    const dx = v.x2 - v.x1, dz = v.z2 - v.z1; this.L = Math.hypot(dx, dz); this.d = { x: dx / this.L, z: dz / this.L };
    this.aviso = o.aviso ?? 3; this.vel = o.velocidad ?? 24; this.ancho = o.ancho ?? 3; this.enfri = o.enfriamiento ?? 40;
    this.fase = 'reposo'; this.tFase = 0; this.s = 0; this.golpeados = new Set(); this.palanca = 0;
    this._modelo();
    if (o.dibujarVia) dibujarVia(this, v.x1, v.z1, v.x2, v.z2);
    this.cuerpo({ forma: 'caja', x: this.pos.x, z: this.pos.z, hx: 0.35, hz: 0.3, rot: this.rot, masa: 0, capa: CAPA.ESTRUCTURA });
    this.registrar({ radioUso: 2.2, etiqueta: () => (this.fase === 'reposo' ? (this.listo ? 'Accionar la palanca' : 'Vía ocupada') : 'El tren se acerca'), puedeUsar: () => this.fase === 'reposo' && this.listo, usar: () => this.accionar() });
  }

  _modelo() {
    const m = this.malla(), hi = ['hierro_forjado', { color: 0x202326 }];
    m.add(caja(0.8, 0.14, 0.7, 0.04), 'hormigon', { p: [0, 0.07, 0] });
    m.add(caja(0.62, 0.7, 0.42, 0.06), ['acero_pintado', { color: 0x315a3a, desgaste: 0.6 }], { p: [0, 0.49, 0] });
    m.add(caja(0.5, 0.22, 0.02, 0.01), 'laton_bronce', { p: [0, 0.62, 0.215] });
    m.add(cil(0.04, 0.04, 0.2, 10), hi, { p: [0, 0.8, 0], r: [0, 0, Math.PI / 2] });
    for (const s of [-1, 1]) m.add(caja(0.06, 0.3, 0.06, 0.02), hi, { p: [s * 0.25, 0.95, 0] });
    m.add(caja(0.7, 0.05, 0.08, 0.015), hi, { p: [0, 1.08, 0] });
    this.construir(m);
    this.brazo = new THREE.Group(); this.brazo.position.set(0, 0.8, 0.0); this.grupo.add(this.brazo);
    const b = this.malla();
    b.add(cil(0.028, 0.028, 1.15, 10), hi, { p: [0, 0.55, 0] });
    b.add(esfera(0.085, 16), ['acero_pintado', { color: 0xb02020 }], { p: [0, 1.17, 0] });
    this.construir(b, this.brazo);
    this.brazo.rotation.x = -0.55;
    // piloto
    this.mPiloto = this.propio(emisivo(0x30ff60, 2.5));
    this.piloto = new THREE.Mesh(esfera(0.05, 10), this.mPiloto); this.piloto.position.set(0.18, 0.78, 0.22);
    this.grupo.add(this.piloto); this._extras.push(this.piloto.geometry);
  }

  _construirTren() {
    const t = new THREE.Group();
    const m = this.malla(), neg = ['hierro_forjado', { color: 0x15171a }], lat = ['laton_bronce', { desgaste: 0.3 }], rojo = ['acero_pintado', { color: 0x7a1c14, desgaste: 0.6 }];
    // chasis
    m.add(caja(1.9, 0.35, 8.2, 0.06), neg, { p: [0, 0.8, 0.2] });
    // caldera
    m.add(torno([[0, -3], [0.82, -3], [0.88, -2.9], [0.86, 3.2], [0.8, 3.45], [0, 3.5]].map(([r, z]) => [r, z + 3]).sort((a, b) => a[1] - b[1]), 28), ['hierro_forjado', { color: 0x1a1d1f, desgaste: 0.5 }], { p: [0, 1.8, 0.35 - 3], r: [Math.PI / 2, 0, 0] });
    for (const z of [-0.6, 0.6, 1.8, 2.9]) m.add(toro(0.875, 0.035, 28, 8), lat, { p: [0, 1.8, z] });
    // cámara de humos delantera + puerta
    m.add(cil(0.9, 0.9, 0.5, 28), neg, { p: [0, 1.8, 3.55], r: [Math.PI / 2, 0, 0] });
    m.add(cil(0.65, 0.65, 0.05, 24), lat, { p: [0, 1.8, 3.83], r: [Math.PI / 2, 0, 0] });
    // chimenea
    m.add(torno([[0.0, 0], [0.18, 0], [0.2, 0.35], [0.3, 0.7], [0.36, 0.9], [0.3, 0.92], [0, 0.92]], 20), neg, { p: [0, 2.55, 3.25] });
    m.add(toro(0.34, 0.03, 20, 6), lat, { p: [0, 3.42, 3.25], r: [Math.PI / 2, 0, 0] });
    // domos
    m.add(torno([[0, 0], [0.34, 0], [0.34, 0.15], [0.26, 0.3], [0.0, 0.4]], 18), lat, { p: [0, 2.62, 1.6] });
    m.add(torno([[0, 0], [0.26, 0], [0.26, 0.2], [0.2, 0.34], [0.0, 0.42]], 18), neg, { p: [0, 2.62, 0.5] });
    // cabina
    m.add(caja(2.2, 0.12, 2.8, 0.04), rojo, { p: [0, 3.55, -2.2] });
    for (const s of [-1, 1]) { m.add(caja(0.1, 2.3, 2.5, 0.03), rojo, { p: [s * 1.05, 2.35, -2.2] }); m.add(caja(0.12, 0.7, 0.9, 0.02), ['cristal', {}], { p: [s * 1.06, 2.8, -2.2] }); }
    m.add(caja(2.1, 2.2, 0.1, 0.03), rojo, { p: [0, 2.3, -3.5] });
    // topes delanteros y quitapiedras
    m.add(extruirPala(), neg, {});
    // faro
    m.add(cil(0.28, 0.32, 0.4, 16), lat, { p: [0, 2.55, 3.3], r: [Math.PI / 2, 0, 0], s: 0.01 });
    m.add(cil(0.26, 0.3, 0.38, 18), lat, { p: [0, 2.35, 3.8], r: [Math.PI / 2, 0, 0] });
    // bielas y ruedas
    const ruedas = [];
    for (const s of [-1, 1]) {
      m.add(caja(0.09, 0.12, 4.3, 0.02), lat, { p: [s * 1.0, 0.95, 1.2] });
      m.add(caja(0.28, 0.35, 0.7, 0.04), neg, { p: [s * 1.0, 1.0, 3.0] });
    }
    this.construir(m, t);
    const faro = new THREE.Mesh(esfera(0.22, 14), this.propio(emisivo(0xfff0c0, 6)));
    faro.position.set(0, 2.35, 4.0); t.add(faro); this._extras.push(faro.geometry);
    // ruedas (grupo animado)
    const rueda = (R, z, x, ngr) => {
      const w = new THREE.Group(); w.position.set(x, R, z);
      const r = this.malla();
      r.add(torno([[R - 0.06, -0.08], [R, -0.07], [R + 0.03, -0.04], [R + 0.03, 0.06], [R - 0.06, 0.08]], 32), neg, { r: [0, 0, Math.PI / 2] });
      for (let i = 0; i < ngr; i++) { const a = (i / ngr) * Math.PI * 2; r.add(cil(0.03, 0.03, R - 0.08, 6), neg, { p: [0, Math.cos(a) * R * 0.5, Math.sin(a) * R * 0.5], r: [a, 0, 0] }); }
      r.add(cil(0.1, 0.1, 0.22, 12), lat, { r: [0, 0, Math.PI / 2] });
      this.construir(r, w); t.add(w); return w;
    };
    const R = 0.75;
    this.ruedasTren = [];
    for (const z of [-0.6, 0.9, 2.4]) for (const x of [-1.0, 1.0]) this.ruedasTren.push(rueda(R, z, x, 10));
    for (const x of [-1.0, 1.0]) this.ruedasTren.push(rueda(0.45, 3.6 - 0.0, x * 0.95, 8)); // delantera pequeña
    // vagones
    const vag = (z0, color) => {
      const v = new THREE.Group(); v.position.z = z0; t.add(v);
      const vm = this.malla();
      vm.add(caja(2.1, 0.3, 6.6, 0.05), neg, { p: [0, 0.75, 0] });
      vm.add(caja(2.3, 2.3, 6.2, 0.07), ['tablas_pintadas', { color }], { p: [0, 2.05, 0] });
      vm.add(caja(2.5, 0.14, 6.5, 0.05), neg, { p: [0, 3.25, 0] });
      vm.add(caja(0.08, 2.0, 1.6, 0.02), 'tablas_viejas', { p: [1.17, 2.0, 0] });
      vm.add(caja(0.08, 2.0, 1.6, 0.02), 'tablas_viejas', { p: [-1.17, 2.0, 0] });
      for (const k of [-2.9, 2.9]) { vm.add(caja(0.5, 0.2, 0.2, 0.05), neg, { p: [0, 0.8, k * 1.14] }); }
      this.construir(vm, v);
      for (const zz of [-2.2, 2.2]) for (const x of [-0.95, 0.95]) { const w = rueda(0.5, zz, x, 8); v.add(w); this.ruedasTren.push(w); }
      return v;
    };
    vag(-7.2, 0x5b3a22); vag(-14.3, 0x2f4a5a);
    t.traverse((n) => { if (n.isMesh) n.castShadow = true; });
    return t;
  }

  accionar() {
    if (this.fase !== 'reposo' || !this.listo) return;
    this.fase = 'aviso'; this.tFase = 0; this.estado = 'activo';
    this.sonido('silbato_tren', { x: this.via.x1 + this.d.x * 6, z: this.via.z1 + this.d.z * 6, volumen: 1 });
    this.fx('vapor', this.pos.x, 0.9, this.pos.z, { escala: 1 });
    this.mensaje('¡Se oye un silbato! Despeja la vía.', 'aviso', 3);
    // franja de aviso
    const g = new THREE.PlaneGeometry(this.ancho + 0.6, this.L); g.rotateX(-Math.PI / 2);
    this.franja = new THREE.Mesh(g, matAditivo(0xff2a10, 0.0)); this.franja.renderOrder = 3;
    this.franja.position.set((this.via.x1 + this.via.x2) / 2, 0.06, (this.via.z1 + this.via.z2) / 2);
    this.franja.rotation.y = Math.atan2(this.d.x, this.d.z);
    this.propioObj(this.franja, this._escena || this.grupo);
  }

  _salir() {
    this.fase = 'cruce'; this.s = -LARGO_TREN; this.golpeados.clear();
    this.tren = this._construirTren(); this.tren.rotation.y = Math.atan2(this.d.x, this.d.z);
    this.propioObj(this.tren, this._escena || this.grupo);
    this.luzTren = this.luz({ x: this.via.x1, y: 2.4, z: this.via.z1, color: 0xfff0c8, intensidad: 90, distancia: 16 });
    this.humo = this.emisor('humo', 0, 3.6, 0, { escala: 1.8 });
    this.sonido('tren_vapor', { x: this.via.x1, z: this.via.z1, volumen: 1 });
  }

  _colocarTren() {
    const fx_ = this.via.x1 + this.d.x * this.s, fz_ = this.via.z1 + this.d.z * this.s;
    this.tren.position.set(fx_, 0, fz_);
    const hx = fx_ - this.d.x * 0 , hz = fz_;
    // el modelo mira a +Z con la parte delantera en z≈+4; el origen se sitúa en el frente
    this.tren.position.x = fx_ - this.d.x * 4.0; this.tren.position.z = fz_ - this.d.z * 4.0;
    if (this.luzTren) { this.luzTren.pos.set(fx_ + this.d.x * 2, 2.4, fz_ + this.d.z * 2); }
    if (this.humo) { this.humo.pos.x = fx_ - this.d.x * 0.7; this.humo.pos.y = 3.7; this.humo.pos.z = fz_ - this.d.z * 0.7; }
  }

  _arrollar() {
    const dx = this.d.x, dz = this.d.z, x1 = this.via.x1, z1 = this.via.z1, hw = this.ancho / 2;
    const trasero = this.s - LARGO_TREN, delantero = this.s + 0.3;
    const prueba = (e, danio, empuje) => {
      if (!e || e.vivo === false || this.golpeados.has(e) || !e.pos) return;
      const rx = e.pos.x - x1, rz = e.pos.z - z1, a = rx * dx + rz * dz, l = rx * -dz + rz * dx;
      if (a < trasero - 0.5 || a > delantero || Math.abs(l) > hw + (e.radio ?? 0.4)) return;
      this.golpeados.add(e);
      const sg = l >= 0 ? 1 : -1;
      const info = { cantidad: danio, tipo: 'golpe', atacante: null, x: e.pos.x, z: e.pos.z, dirX: -dz * sg * 0.6 + dx * 0.8, dirZ: dx * sg * 0.6 + dz * 0.8, empuje, critico: false };
      this.danioA(e, info);
      e.cuerpo?.impulso?.(info.dirX * 900, info.dirZ * 900);
      this.fx('sangre_grande', e.pos.x, 1, e.pos.z, { dirX: info.dirX, dirZ: info.dirZ });
    };
    for (const z of this.juego.zombis || []) prueba(z, 9999, 10);
    for (const j of this.juego.jugadores || []) prueba(j, 70, 8);
    for (const o of this.juego.mundo?.objetos || []) if (o !== this && o.recibirDanio && !o.__noTren) prueba(o, 500, 6);
    for (const o of this.juego.mundo?.estructuras || []) prueba(o, 500, 6);
    for (const o of this.juego.vehiculos?.lista || []) prueba(o, 250, 4);
  }

  paso(dt) {
    // aspecto de la palanca
    const objetivo = this.fase === 'reposo' ? -0.55 : 0.55;
    this.brazo.rotation.x += (objetivo - this.brazo.rotation.x) * Math.min(1, dt * 7);
    if (this.fase === 'aviso') {
      this.tFase += dt;
      this.mPiloto.emissiveIntensity = Math.sin(this.t * 14) > 0 ? 4 : 0.3; this.mPiloto.emissive.setHex(0xff2a10);
      if (this.franja) this.franja.material.opacity = (0.15 + 0.35 * (0.5 + 0.5 * Math.sin(this.t * 12))) * lim(this.tFase / 0.4, 0, 1);
      if (this.tFase >= this.aviso) this._salir();
    } else if (this.fase === 'cruce') {
      this.s += this.vel * dt;
      this._colocarTren(); this._arrollar();
      for (const w of this.ruedasTren) w.rotation.x += (this.vel / 0.7) * dt;
      this.tren.position.y = Math.sin(this.t * 40) * 0.006;
      if (this.franja) this.franja.material.opacity = 0.15 + 0.2 * Math.sin(this.t * 20);
      if (this.s - LARGO_TREN > this.L + 2) this._fin();
    } else {
      this.mPiloto.emissive.setHex(this.listo ? 0x30ff60 : 0xffa020);
      this.mPiloto.emissiveIntensity = this.listo ? 2.5 : 1.2;
      if (this.fase === 'reposo' && !this.listo) this.estado = 'enfriamiento';
      else if (this.fase === 'reposo') this.estado = 'disponible';
    }
  }

  _fin() {
    this.fase = 'reposo'; this.iniciarEnfriamiento(this.enfri); this.estado = 'enfriamiento';
    this.quitarLuz(this.luzTren); this.luzTren = null; this.quitarEmisor(this.humo); this.humo = null;
    if (this.tren) { this.tren.removeFromParent(); this.tren.traverse((n) => { n.geometry?.dispose?.(); }); this.tren = null; }
    if (this.franja) { this.franja.removeFromParent(); this.franja.geometry.dispose(); this.franja.material.dispose(); this.franja = null; }
  }

  alDanio(info) { this.fx('chispas', info.x ?? this.pos.x, 0.8, info.z ?? this.pos.z, { cantidad: 5 }); }
  alDestruirse() { this.fase = this.fase === 'cruce' ? 'cruce' : 'reposo'; this.grupo.visible = false; if (this._reg) { this.juego.mundo?.quitarInteractivo?.(this._reg); this._reg = null; } }
}

// pala quitapiedras (cowcatcher) como cuña extruida en perfil lateral, mirando a +Z
function extruirPala() {
  const g = new THREE.BufferGeometry();
  const w = 1.9, y0 = 0.35, y1 = 1.0, z0 = 4.0, z1 = 3.55;
  const v = [[-w / 2, y0, z0 + 0.6], [w / 2, y0, z0 + 0.6], [w / 2, y1, z1], [-w / 2, y1, z1], [-w / 2, y0 + 0.2, z1 - 0.1], [w / 2, y0 + 0.2, z1 - 0.1]];
  const tri = [[0, 1, 2], [0, 2, 3], [0, 4, 5], [0, 5, 1], [0, 3, 4], [1, 5, 2], [3, 2, 5], [3, 5, 4]];
  const pos = []; for (const t of tri) for (const i of t) pos.push(...v[i]);
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
  return g;
}
registrarTipo('palanca_tren', (juego, o) => new PalancaTren(juego, o));
