// Física arcade 2D sobre el plano XZ (vista cenital). Y es solo visual.
// Cuerpos: círculos y cajas orientadas (OBB). Masa 0 = estático. Rejilla espacial para la fase ancha.
// Unidades: metros, segundos, kilogramos.

export const CAPA = {
  ESTATICO: 1,    // muros, edificios, rocas
  JUGADOR: 2,
  ZOMBI: 4,
  VEHICULO: 8,
  PROP: 16,       // barriles, cajas, objetos empujables
  ESTRUCTURA: 32, // torretas, barricadas, emplazamientos
  SENSOR: 64,     // zonas de disparo/recogida (no empujan)
};
export const TODAS = 0xffff;
/** Máscara habitual de lo que detiene una bala. */
export const MASCARA_BALA = CAPA.ESTATICO | CAPA.ZOMBI | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA;

const CELDA = 4;
let _sigId = 1;

export class Cuerpo {
  constructor(o) {
    this.id = _sigId++;
    this.forma = o.forma || 'circulo';      // 'circulo' | 'caja'
    this.x = o.x || 0; this.z = o.z || 0;
    this.vx = 0; this.vz = 0;
    this.rot = o.rot || 0;                    // solo cajas (rad, alrededor de Y)
    this.radio = o.radio ?? 0.5;
    this.hx = o.hx ?? 0.5; this.hz = o.hz ?? 0.5; // semiejes de la caja (X y Z locales)
    this.masa = o.masa ?? 0;
    this.invMasa = this.masa > 0 ? 1 / this.masa : 0;
    this.amortiguacion = o.amortiguacion ?? 0; // freno lineal (1/s). 0 = el dueño controla la velocidad
    this.rebote = o.rebote ?? 0;
    this.rigidez = o.rigidez ?? 1;             // <1 = corrección de solape blanda (hordas)
    this.capa = o.capa ?? CAPA.ESTATICO;
    this.mascara = o.mascara ?? TODAS;
    this.sensor = !!o.sensor;
    this.bloqueaBalas = o.bloqueaBalas ?? true;   // false: vallas bajas, charcos, sensores
    this.bloqueaVision = o.bloqueaVision ?? (this.masa === 0 && !this.sensor);
    this.datos = o.datos ?? null;              // entidad dueña (jugador, zombi, vehículo…)
    this.alColisionar = o.alColisionar ?? null; // (otro, nx, nz, solape, velRel) normal apunta hacia `otro`
    this.activo = true;
    this._mundo = null;
    this._actualizarLimite();
  }
  get estatico() { return this.invMasa === 0; }
  _actualizarLimite() { this.rb = this.forma === 'circulo' ? this.radio : Math.hypot(this.hx, this.hz); }
  establecerMasa(m) { this.masa = m; this.invMasa = m > 0 ? 1 / m : 0; }
  impulso(ix, iz) { this.vx += ix * this.invMasa; this.vz += iz * this.invMasa; }
}

const _c = { nx: 0, nz: 0, pen: 0 };

function circuloCirculo(a, b) {
  const dx = b.x - a.x, dz = b.z - a.z, r = a.radio + b.radio;
  const d2 = dx * dx + dz * dz;
  if (d2 >= r * r) return false;
  const d = Math.sqrt(d2);
  if (d > 1e-6) { _c.nx = dx / d; _c.nz = dz / d; } else { _c.nx = 1; _c.nz = 0; }
  _c.pen = r - d;
  return true;
}

// Círculo `c` contra caja `b`. Normal de c hacia b.
function circuloCaja(c, b) {
  const cs = Math.cos(b.rot), sn = Math.sin(b.rot);
  const dx = c.x - b.x, dz = c.z - b.z;
  // a espacio local de la caja (rotación Y: x' = x·cos − z·sin ; z' = x·sin + z·cos)
  const lx = dx * cs - dz * sn, lz = dx * sn + dz * cs;
  let px = lx < -b.hx ? -b.hx : lx > b.hx ? b.hx : lx;
  let pz = lz < -b.hz ? -b.hz : lz > b.hz ? b.hz : lz;
  let nlx, nlz, pen;
  if (px === lx && pz === lz) {
    // centro dentro de la caja: salir por la cara más cercana
    const ex = b.hx - Math.abs(lx), ez = b.hz - Math.abs(lz);
    if (ex < ez) { nlx = lx > 0 ? -1 : 1; nlz = 0; pen = ex + c.radio; }
    else { nlx = 0; nlz = lz > 0 ? -1 : 1; pen = ez + c.radio; }
  } else {
    const ddx = px - lx, ddz = pz - lz;
    const d2 = ddx * ddx + ddz * ddz;
    if (d2 >= c.radio * c.radio) return false;
    const d = Math.sqrt(d2) || 1e-6;
    nlx = ddx / d; nlz = ddz / d; pen = c.radio - d;
  }
  // a mundo
  _c.nx = nlx * cs + nlz * sn; _c.nz = -nlx * sn + nlz * cs; _c.pen = pen;
  return true;
}

function ejesCaja(b, out) {
  const cs = Math.cos(b.rot), sn = Math.sin(b.rot);
  out[0] = cs; out[1] = -sn;   // eje X local en mundo
  out[2] = sn; out[3] = cs;    // eje Z local en mundo
}
const _ea = [0, 0, 0, 0], _eb = [0, 0, 0, 0];
function cajaCaja(a, b) {
  ejesCaja(a, _ea); ejesCaja(b, _eb);
  const dx = b.x - a.x, dz = b.z - a.z;
  let minPen = Infinity, mnx = 0, mnz = 0;
  for (let i = 0; i < 4; i++) {
    const ax = i < 2 ? _ea[i * 2] : _eb[(i - 2) * 2];
    const az = i < 2 ? _ea[i * 2 + 1] : _eb[(i - 2) * 2 + 1];
    const ra = a.hx * Math.abs(_ea[0] * ax + _ea[1] * az) + a.hz * Math.abs(_ea[2] * ax + _ea[3] * az);
    const rb = b.hx * Math.abs(_eb[0] * ax + _eb[1] * az) + b.hz * Math.abs(_eb[2] * ax + _eb[3] * az);
    const d = dx * ax + dz * az;
    const pen = ra + rb - Math.abs(d);
    if (pen <= 0) return false;
    if (pen < minPen) { minPen = pen; const s = d < 0 ? -1 : 1; mnx = ax * s; mnz = az * s; }
  }
  _c.nx = mnx; _c.nz = mnz; _c.pen = minPen;
  return true;
}

// Deja en _c la normal de a→b y el solape. Devuelve false si no se tocan.
function probar(a, b) {
  const fa = a.forma === 'circulo', fb = b.forma === 'circulo';
  if (fa && fb) return circuloCirculo(a, b);
  if (fa) return circuloCaja(a, b);
  if (fb) { if (!circuloCaja(b, a)) return false; _c.nx = -_c.nx; _c.nz = -_c.nz; return true; }
  return cajaCaja(a, b);
}

class Rejilla {
  constructor() { this.m = new Map(); }
  limpiar() { this.m.clear(); }
  _clave(cx, cz) { return (cx + 512) * 4096 + (cz + 512); }
  insertar(c) {
    const x0 = Math.floor((c.x - c.rb) / CELDA), x1 = Math.floor((c.x + c.rb) / CELDA);
    const z0 = Math.floor((c.z - c.rb) / CELDA), z1 = Math.floor((c.z + c.rb) / CELDA);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const k = this._clave(cx, cz);
      let l = this.m.get(k);
      if (!l) this.m.set(k, (l = []));
      l.push(c);
    }
  }
  /** Llama fn(cuerpo) por cada cuerpo en celdas que toquen el AABB dado (puede repetir cuerpos). */
  consultar(minX, minZ, maxX, maxZ, fn) {
    const x0 = Math.floor(minX / CELDA), x1 = Math.floor(maxX / CELDA);
    const z0 = Math.floor(minZ / CELDA), z1 = Math.floor(maxZ / CELDA);
    for (let cx = x0; cx <= x1; cx++) for (let cz = z0; cz <= z1; cz++) {
      const l = this.m.get(this._clave(cx, cz));
      if (l) for (let i = 0; i < l.length; i++) fn(l[i]);
    }
  }
}

export class MundoFisico {
  constructor() {
    this.estaticos = [];
    this.dinamicos = [];
    this._rejEst = new Rejilla();
    this._rejDin = new Rejilla();
    this._estSucio = false;
    this._marca = 0;
    /** Límites del mapa; los cuerpos dinámicos no pueden salir. null = sin límites. */
    this.limites = null;
  }

  /**
   * Crea y añade un cuerpo.
   * @param {{forma?:'circulo'|'caja', x:number, z:number, radio?:number, hx?:number, hz?:number, rot?:number,
   *   masa?:number, capa?:number, mascara?:number, sensor?:boolean, amortiguacion?:number, rebote?:number,
   *   rigidez?:number, bloqueaBalas?:boolean, bloqueaVision?:boolean, datos?:any, alColisionar?:Function}} o
   */
  crearCuerpo(o) {
    const c = new Cuerpo(o);
    c._mundo = this;
    if (c.estatico) { this.estaticos.push(c); this._estSucio = true; }
    else this.dinamicos.push(c);
    return c;
  }
  circuloEstatico(x, z, radio, extra) { return this.crearCuerpo({ forma: 'circulo', x, z, radio, masa: 0, capa: CAPA.ESTATICO, ...extra }); }
  cajaEstatica(x, z, hx, hz, rot = 0, extra) { return this.crearCuerpo({ forma: 'caja', x, z, hx, hz, rot, masa: 0, capa: CAPA.ESTATICO, ...extra }); }

  eliminarCuerpo(c) {
    if (!c || !c.activo) return;
    c.activo = false;
    const l = c.estatico ? this.estaticos : this.dinamicos;
    const i = l.indexOf(c);
    if (i >= 0) { l[i] = l[l.length - 1]; l.pop(); }
    if (c.estatico) this._estSucio = true;
  }
  /** Llamar si se mueve o redimensiona a mano un cuerpo estático. */
  marcarEstaticosSucios() { this._estSucio = true; }
  /** Quita todos los cuerpos (cambio de mapa). */
  limpiar() {
    for (const c of this.estaticos) c.activo = false;
    for (const c of this.dinamicos) c.activo = false;
    this.estaticos.length = 0; this.dinamicos.length = 0;
    this._rejEst.limpiar(); this._rejDin.limpiar(); this._estSucio = false;
  }

  _reconstruirEstaticos() {
    this._rejEst.limpiar();
    for (const c of this.estaticos) { c._actualizarLimite(); this._rejEst.insertar(c); }
    this._estSucio = false;
  }

  /** Avanza la simulación. Subdivide para evitar atravesar muros a alta velocidad. */
  paso(dt) {
    if (dt <= 0) return;
    const n = Math.max(1, Math.min(4, Math.ceil(dt / (1 / 120))));
    const h = dt / n;
    for (let i = 0; i < n; i++) this._subpaso(h);
  }

  _subpaso(h) {
    if (this._estSucio) this._reconstruirEstaticos();
    const din = this.dinamicos, lim = this.limites;
    this._rejDin.limpiar();
    for (let i = 0; i < din.length; i++) {
      const c = din[i];
      if (c.amortiguacion > 0) { const f = Math.exp(-c.amortiguacion * h); c.vx *= f; c.vz *= f; }
      c.x += c.vx * h; c.z += c.vz * h;
      if (lim) {
        if (c.x < lim.minX + c.rb) { c.x = lim.minX + c.rb; if (c.vx < 0) c.vx = 0; }
        else if (c.x > lim.maxX - c.rb) { c.x = lim.maxX - c.rb; if (c.vx > 0) c.vx = 0; }
        if (c.z < lim.minZ + c.rb) { c.z = lim.minZ + c.rb; if (c.vz < 0) c.vz = 0; }
        else if (c.z > lim.maxZ - c.rb) { c.z = lim.maxZ - c.rb; if (c.vz > 0) c.vz = 0; }
      }
      if (c.forma === 'caja') c._actualizarLimite();
      this._rejDin.insertar(c);
    }
    for (let i = 0; i < din.length; i++) {
      const a = din[i];
      if (!a.activo) continue;
      const marca = ++this._marca;
      const resolver = (b) => {
        if (b === a || b._m === marca || !b.activo) return;
        b._m = marca;
        if (!b.estatico && b.id < a.id) return; // el par dinámico-dinámico lo resuelve el de id menor
        if (!(a.capa & b.mascara) || !(b.capa & a.mascara)) return;
        const dx = b.x - a.x, dz = b.z - a.z, rr = a.rb + b.rb;
        if (dx * dx + dz * dz > rr * rr) return;
        if (!probar(a, b)) return;
        this._resolver(a, b, _c.nx, _c.nz, _c.pen);
      };
      const x0 = a.x - a.rb, z0 = a.z - a.rb, x1 = a.x + a.rb, z1 = a.z + a.rb;
      this._rejEst.consultar(x0, z0, x1, z1, resolver);
      this._rejDin.consultar(x0, z0, x1, z1, resolver);
    }
  }

  _resolver(a, b, nx, nz, pen) {
    const velRel = (b.vx - a.vx) * nx + (b.vz - a.vz) * nz; // <0 = acercándose
    if (!a.sensor && !b.sensor) {
      const total = a.invMasa + b.invMasa;
      if (total > 0) {
        const k = pen * Math.min(a.rigidez, b.rigidez) / total;
        a.x -= nx * k * a.invMasa; a.z -= nz * k * a.invMasa;
        b.x += nx * k * b.invMasa; b.z += nz * k * b.invMasa;
        if (velRel < 0) {
          const e = Math.max(a.rebote, b.rebote);
          const j = -(1 + e) * velRel / total;
          a.vx -= nx * j * a.invMasa; a.vz -= nz * j * a.invMasa;
          b.vx += nx * j * b.invMasa; b.vz += nz * j * b.invMasa;
        }
      }
    }
    if (a.alColisionar) a.alColisionar(b, nx, nz, pen, -velRel);
    if (b.alColisionar) b.alColisionar(a, -nx, -nz, pen, -velRel);
  }

  // ───────────── Consultas ─────────────

  _rayoCuerpo(c, ox, oz, dx, dz, max, out) {
    if (c.forma === 'circulo') {
      const mx = ox - c.x, mz = oz - c.z;
      const b = mx * dx + mz * dz, cc = mx * mx + mz * mz - c.radio * c.radio;
      if (cc > 0 && b > 0) return false;
      const disc = b * b - cc;
      if (disc < 0) return false;
      let t = -b - Math.sqrt(disc);
      if (t < 0) t = 0;
      if (t > max) return false;
      out.dist = t; out.x = ox + dx * t; out.z = oz + dz * t;
      const nx = out.x - c.x, nz = out.z - c.z, l = Math.hypot(nx, nz) || 1;
      out.nx = nx / l; out.nz = nz / l;
      return true;
    }
    const cs = Math.cos(c.rot), sn = Math.sin(c.rot);
    const rx = ox - c.x, rz = oz - c.z;
    const lox = rx * cs - rz * sn, loz = rx * sn + rz * cs;
    const ldx = dx * cs - dz * sn, ldz = dx * sn + dz * cs;
    let tmin = 0, tmax = max, nlx = 0, nlz = 0;
    if (Math.abs(ldx) < 1e-9) { if (lox < -c.hx || lox > c.hx) return false; }
    else {
      let t1 = (-c.hx - lox) / ldx, t2 = (c.hx - lox) / ldx, s = -1;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
      if (t1 > tmin) { tmin = t1; nlx = s; nlz = 0; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return false;
    }
    if (Math.abs(ldz) < 1e-9) { if (loz < -c.hz || loz > c.hz) return false; }
    else {
      let t1 = (-c.hz - loz) / ldz, t2 = (c.hz - loz) / ldz, s = -1;
      if (t1 > t2) { const t = t1; t1 = t2; t2 = t; s = 1; }
      if (t1 > tmin) { tmin = t1; nlx = 0; nlz = s; }
      if (t2 < tmax) tmax = t2;
      if (tmin > tmax) return false;
    }
    out.dist = tmin; out.x = ox + dx * tmin; out.z = oz + dz * tmin;
    out.nx = nlx * cs + nlz * sn; out.nz = -nlx * sn + nlz * cs;
    if (nlx === 0 && nlz === 0) { out.nx = -dx; out.nz = -dz; } // origen dentro
    return true;
  }

  /**
   * Rayo en el plano. (dx,dz) debe estar normalizado.
   * @returns {{cuerpo:Cuerpo,x:number,z:number,nx:number,nz:number,dist:number}|null} impacto más cercano
   * @param {(c:Cuerpo)=>boolean} [filtro] devolver false para ignorar un cuerpo
   */
  rayo(ox, oz, dx, dz, max, mascara = MASCARA_BALA, filtro = null, soloBalas = true) {
    let mejor = null, tmp = { cuerpo: null, x: 0, z: 0, nx: 0, nz: 0, dist: 0 };
    const probarLista = (l) => {
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (!(c.capa & mascara) || c.sensor || (soloBalas && !c.bloqueaBalas)) continue;
        if (filtro && !filtro(c)) continue;
        // descarte rápido: distancia del centro a la recta
        const mx = c.x - ox, mz = c.z - oz, t = mx * dx + mz * dz;
        if (t < -c.rb || t > (mejor ? mejor.dist : max) + c.rb) continue;
        const px = mx - dx * t, pz = mz - dz * t;
        if (px * px + pz * pz > c.rb * c.rb) continue;
        if (this._rayoCuerpo(c, ox, oz, dx, dz, mejor ? mejor.dist : max, tmp)) {
          tmp.cuerpo = c;
          const viejo = mejor; mejor = tmp; tmp = viejo || { cuerpo: null, x: 0, z: 0, nx: 0, nz: 0, dist: 0 };
        }
      }
    };
    probarLista(this.estaticos); probarLista(this.dinamicos);
    return mejor;
  }

  /** Como `rayo` pero devuelve todos los impactos ordenados por distancia (armas perforantes). */
  rayoTodos(ox, oz, dx, dz, max, mascara = MASCARA_BALA, filtro = null) {
    const res = [];
    const probarLista = (l) => {
      for (let i = 0; i < l.length; i++) {
        const c = l[i];
        if (!(c.capa & mascara) || c.sensor || !c.bloqueaBalas) continue;
        if (filtro && !filtro(c)) continue;
        const h = { cuerpo: c, x: 0, z: 0, nx: 0, nz: 0, dist: 0 };
        if (this._rayoCuerpo(c, ox, oz, dx, dz, max, h)) res.push(h);
      }
    };
    probarLista(this.estaticos); probarLista(this.dinamicos);
    res.sort((a, b) => a.dist - b.dist);
    return res;
  }

  /** ¿Hay línea de visión (sin estáticos que bloqueen) entre dos puntos? */
  lineaLibre(x1, z1, x2, z2) {
    const dx = x2 - x1, dz = z2 - z1, d = Math.hypot(dx, dz);
    if (d < 1e-6) return true;
    const ux = dx / d, uz = dz / d, tmp = { x: 0, z: 0, nx: 0, nz: 0, dist: 0 };
    for (let i = 0; i < this.estaticos.length; i++) {
      const c = this.estaticos[i];
      if (!c.bloqueaVision || c.sensor) continue;
      const mx = c.x - x1, mz = c.z - z1, t = mx * ux + mz * uz;
      if (t < -c.rb || t > d + c.rb) continue;
      if (this._rayoCuerpo(c, x1, z1, ux, uz, d, tmp)) return false;
    }
    return true;
  }

  /** Cuerpos (cualquier forma, aproximados por su radio envolvente salvo círculos) dentro de un círculo. */
  enCirculo(x, z, r, mascara = TODAS, out = []) {
    out.length = 0;
    const marca = ++this._marca;
    const fn = (c) => {
      if (c._m === marca || !c.activo || !(c.capa & mascara)) return;
      c._m = marca;
      const rr = r + (c.forma === 'circulo' ? c.radio : c.rb);
      const dx = c.x - x, dz = c.z - z;
      if (dx * dx + dz * dz <= rr * rr) out.push(c);
    };
    if (this._estSucio) this._reconstruirEstaticos();
    this._rejEst.consultar(x - r, z - r, x + r, z + r, fn);
    for (let i = 0; i < this.dinamicos.length; i++) fn(this.dinamicos[i]); // los dinámicos pueden haberse movido desde el último paso
    return out;
  }

  /** ¿Está libre un círculo (sin tocar nada de la máscara)? Útil para colocar apariciones y objetos. */
  libre(x, z, r, mascara = CAPA.ESTATICO | CAPA.VEHICULO | CAPA.PROP | CAPA.ESTRUCTURA) {
    const sonda = { forma: 'circulo', x, z, radio: r, rb: r };
    const lista = this.enCirculo(x, z, r, mascara, []);
    for (const c of lista) { if (c.sensor) continue; if (probar(sonda, c)) return false; }
    return true;
  }

  /** Empuje radial (explosiones). `fuerza` = impulso en N·s en el centro; decae linealmente con la distancia. */
  impulsoRadial(x, z, radio, fuerza, mascara = TODAS) {
    for (let i = 0; i < this.dinamicos.length; i++) {
      const c = this.dinamicos[i];
      if (!(c.capa & mascara) || c.sensor) continue;
      const dx = c.x - x, dz = c.z - z, d = Math.hypot(dx, dz);
      if (d > radio + c.rb) continue;
      const k = fuerza * Math.max(0, 1 - d / radio), l = d || 1;
      c.impulso((dx / l) * k, (dz / l) * k);
    }
  }
}
