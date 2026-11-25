// ERA Z · Capa de detalle de suelo (compartida por villa_colonial, estacion_fronteriza y tierra_de_nadie).
// Un lienzo 2D procedural con transparencia se estira sobre el suelo (plano subdividido que sigue el relieve) y se ilumina como
// cualquier otra superficie. Sirve para lo que el suelo de materiales no da: rodadas, huellas, grietas, matas de hierba, hojas,
// paja, guijarros, manchas de tierra pisada y de humedad con borde orgánico. Coordenadas de mundo (m); +z = sur = abajo en el lienzo.
import * as THREE from 'three';

const rgba = (hex, a = 1) => `rgba(${(hex >> 16) & 255},${(hex >> 8) & 255},${hex & 255},${a})`;
const mezcla = (h1, h2, t) => {
  const r = ((h1 >> 16) & 255) * (1 - t) + ((h2 >> 16) & 255) * t, g = ((h1 >> 8) & 255) * (1 - t) + ((h2 >> 8) & 255) * t, b = (h1 & 255) * (1 - t) + (h2 & 255) * t;
  return (Math.round(r) << 16) | (Math.round(g) << 8) | Math.round(b);
};
const claro = (hex, f) => {   // f > 1 aclara, f < 1 oscurece
  const c = (v) => Math.max(0, Math.min(255, Math.round(v * f)));
  return (c((hex >> 16) & 255) << 16) | (c((hex >> 8) & 255) << 8) | c(hex & 255);
};

/**
 * Crea una capa y devuelve la malla. `dibujar(d)` recibe las herramientas de dibujo.
 * o: { x0, z0, x1, z1, ppm = 34 (píxeles por metro), y = 0.012, semilla, rugosidad, orden }
 * Usa límites pares (rejilla de 2 m del suelo) para que la malla coincida con la del suelo y no asome ni se hunda.
 */
export function capaSuelo(kit, o, dibujar) {
  const { x0 = -48, z0 = -48, x1 = 48, z1 = 48 } = o;
  const ppm = o.ppm ?? 34, y = o.y ?? 0.012;
  const W = Math.round((x1 - x0) * ppm), H = Math.round((z1 - z0) * ppm);
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  const rng = kit.rng((o.semilla ?? 1) * 977 + 13);
  const X = (x) => (x - x0) * ppm, Z = (z) => (z - z0) * ppm, Mt = (m) => m * ppm;
  const dentro = (x, z, m = 0) => x > x0 - m && x < x1 + m && z > z0 - m && z < z1 + m;

  const d = {
    g, rng, X, Z, Mt, rgba, mezcla, claro, ppm,
    /** Mancha blanda de contorno irregular (tierra pisada, humedad, musgo, hollín…). */
    blob(x, z, r, color, alpha = 0.4, { asp = 1, rot = 0, n = 5, dureza = 0.55 } = {}) {
      if (!dentro(x, z, r * asp + 2)) return;
      for (let i = 0; i < n; i++) {
        const ox = (rng() - 0.5) * r * 0.9, oz = (rng() - 0.5) * r * 0.9, ri = Mt(r * rng.rango(0.5, 0.95));
        g.save(); g.translate(X(x) + ox * ppm, Z(z) + oz * ppm); g.rotate(rot); g.scale(asp, 1 / Math.sqrt(asp));
        const gr = g.createRadialGradient(0, 0, 0, 0, 0, ri);
        gr.addColorStop(0, rgba(color, alpha)); gr.addColorStop(dureza, rgba(color, alpha * 0.75)); gr.addColorStop(1, rgba(color, 0));
        g.fillStyle = gr; g.beginPath(); g.arc(0, 0, ri, 0, 6.2832); g.fill(); g.restore();
      }
    },
    /** Silueta cerrada irregular de borde definido (charcos, parches de arena, losas rotas). Devuelve el trazo. */
    forma(x, z, rx, rz, { rot = 0, irreg = 0.2, pts = 28 } = {}) {
      const ph = [rng() * 6.28, rng() * 6.28, rng() * 6.28], am = [rng.rango(0.5, 1), rng.rango(0.3, 0.8), rng.rango(0.2, 0.5)];
      const P = [];
      for (let i = 0; i < pts; i++) {
        const t = (i / pts) * 6.2832;
        const k = 1 + irreg * (Math.sin(t * 2 + ph[0]) * am[0] + Math.sin(t * 3 + ph[1]) * am[1] + Math.sin(t * 5 + ph[2]) * am[2]) / 1.8;
        P.push([Math.cos(t) * rx * k, Math.sin(t) * rz * k]);
      }
      const cs = Math.cos(rot), sn = Math.sin(rot);
      const W2 = P.map(([a, b]) => [X(x + a * cs - b * sn), Z(z + a * sn + b * cs)]);
      return () => {
        g.beginPath();
        const m0 = [(W2[0][0] + W2[pts - 1][0]) / 2, (W2[0][1] + W2[pts - 1][1]) / 2];
        g.moveTo(m0[0], m0[1]);
        for (let i = 0; i < pts; i++) { const a = W2[i], b = W2[(i + 1) % pts]; g.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
        g.closePath();
      };
    },
    /** Charco pintado: halo húmedo oscuro, agua con degradado de cielo y brillo. */
    charco(x, z, rx, rz, { rot = 0, agua = 0x6f7f88, borde = 0x1c1712, brillo = 0xffd9a8, alpha = 0.78, irreg = 0.22 } = {}) {
      d.blob(x, z, Math.max(rx, rz) * 1.25, borde, 0.22, { asp: rx / rz, rot, n: 4 });
      const tr = d.forma(x, z, rx, rz, { rot, irreg });
      g.save(); tr(); g.fillStyle = rgba(borde, 0.4); g.fill(); g.strokeStyle = rgba(0xd8c8a8, 0.35); g.lineWidth = Math.max(1, Mt(0.04)); g.stroke(); g.restore();
      g.save(); const tr2 = d.forma(x + rx * 0.02, z, rx * 0.93, rz * 0.9, { rot, irreg: irreg * 0.8 }); tr2();
      const gr = g.createLinearGradient(X(x - rx), Z(z - rz), X(x + rx), Z(z + rz));
      gr.addColorStop(0, rgba(claro(agua, 1.25), alpha)); gr.addColorStop(0.55, rgba(agua, alpha)); gr.addColorStop(1, rgba(claro(agua, 0.62), alpha));
      g.fillStyle = gr; g.fill();
      g.clip();
      d.blob(x - rx * 0.25, z - rz * 0.3, Math.max(rx, rz) * 0.5, brillo, 0.24, { n: 3 });
      g.restore();
    },
    /** Rodadas de ruedas: dos carriles con interrupciones y borde blando. */
    rodada(pts, { sep = 1.5, grosor = 0.2, color = 0x2a2016, alpha = 0.34, luz = 0 } = {}) {
      const S = [];
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.18));
        for (let k = 0; k < n; k++) S.push([ax + (bx - ax) * k / n, az + (bz - az) * k / n]);
      }
      S.push(pts[pts.length - 1]);
      const fase = rng() * 50;
      for (const lado of [-1, 1]) {
        let prev = null;
        for (let i = 0; i < S.length; i++) {
          const a = S[Math.max(0, i - 1)], b = S[Math.min(S.length - 1, i + 1)];
          const tx = b[0] - a[0], tz = b[1] - a[1], tl = Math.hypot(tx, tz) || 1, nx = -tz / tl, nz = tx / tl;
          const wob = Math.sin(i * 0.11 + fase + lado) * 0.1 + Math.sin(i * 0.37 + fase * 1.7) * 0.04;
          const px = S[i][0] + nx * (lado * sep / 2 + wob), pz = S[i][1] + nz * (lado * sep / 2 + wob);
          const corte = Math.sin(i * 0.23 + fase * lado) * Math.sin(i * 0.071 + 2 * fase);
          const a2 = alpha * Math.max(0, Math.min(1, 0.55 + corte * 1.1));
          if (prev && a2 > 0.02) {
            g.lineCap = 'round';
            g.strokeStyle = rgba(color, a2 * 0.3); g.lineWidth = Mt(grosor * 1.7); g.beginPath(); g.moveTo(X(prev[0]), Z(prev[1])); g.lineTo(X(px), Z(pz)); g.stroke();
            g.strokeStyle = rgba(color, a2); g.lineWidth = Mt(grosor); g.beginPath(); g.moveTo(X(prev[0]), Z(prev[1])); g.lineTo(X(px), Z(pz)); g.stroke();
            if (luz) { g.strokeStyle = rgba(luz, a2 * 0.5); g.lineWidth = Mt(grosor * 0.25); g.beginPath(); g.moveTo(X(prev[0] + nx * 0.16 * lado), Z(prev[1] + nz * 0.16 * lado)); g.lineTo(X(px + nx * 0.16 * lado), Z(pz + nz * 0.16 * lado)); g.stroke(); }
          }
          prev = [px, pz];
        }
      }
    },
    /** Pisadas alternas a lo largo de una polilínea. */
    pisadas(pts, { paso = 0.62, color = 0x2a2016, alpha = 0.4, tam = 1 } = {}) {
      let lado = 1, resto = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        const [ax, az] = pts[i], [bx, bz] = pts[i + 1], L = Math.hypot(bx - ax, bz - az), dx = (bx - ax) / L, dz = (bz - az) / L;
        for (let t = resto; t < L; t += paso) {
          const px = ax + dx * t - dz * lado * 0.11 + (rng() - 0.5) * 0.05, pz = az + dz * t + dx * lado * 0.11 + (rng() - 0.5) * 0.05;
          g.save(); g.translate(X(px), Z(pz)); g.rotate(Math.atan2(dz, dx));
          g.fillStyle = rgba(color, alpha * rng.rango(0.6, 1)); g.beginPath(); g.ellipse(0, 0, Mt(0.15 * tam), Mt(0.065 * tam), 0, 0, 6.2832); g.fill();
          g.restore(); lado = -lado;
        }
        resto = 0;
      }
    },
    /** Grieta ramificada. */
    grieta(x, z, largo = 1.5, rot = 0, { color = 0x15110d, alpha = 0.75, ancho = 0.028, rama = 0.28, prof = 2 } = {}) {
      if (!dentro(x, z, largo)) return;
      const paso = (px, pz, ang, rest, w, p) => {
        g.strokeStyle = rgba(color, alpha); g.lineWidth = Math.max(0.8, Mt(w)); g.lineCap = 'round'; g.beginPath(); g.moveTo(X(px), Z(pz));
        let cx = px, cz = pz, a = ang;
        while (rest > 0) {
          a += (rng() - 0.5) * 0.9; const l = rng.rango(0.12, 0.3); cx += Math.cos(a) * l; cz += Math.sin(a) * l; rest -= l; g.lineTo(X(cx), Z(cz));
          if (p > 0 && rng() < rama) paso(cx, cz, a + rng.signo() * rng.rango(0.5, 1.1), rest * rng.rango(0.3, 0.7), w * 0.6, p - 1);
        }
        g.stroke();
      };
      paso(x, z, rot, largo, ancho, prof);
    },
    /** Mata de hierba (vista cenital: hojas que irradian del centro). */
    hierba(x, z, r, n, paleta, { largo = 0.3, ancho = 0.03, sombra = true } = {}) {
      if (!dentro(x, z, r + 1)) return;
      if (sombra) d.blob(x, z, r * 0.9, 0x120f09, 0.28, { n: 2, dureza: 0.3 });
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.2832, rr = Math.sqrt(rng()) * r * 0.55, bx = x + Math.cos(a) * rr, bz = z + Math.sin(a) * rr;
        const l = largo * rng.rango(0.5, 1.15) * (0.6 + rr / r), aa = a + (rng() - 0.5) * 0.9, c = paleta[Math.floor(rng() * paleta.length)];
        const ex = bx + Math.cos(aa) * l, ez = bz + Math.sin(aa) * l, cx = bx + Math.cos(aa + 0.4) * l * 0.6, cz = bz + Math.sin(aa + 0.4) * l * 0.6;
        g.strokeStyle = rgba(claro(c, rng.rango(0.8, 1.2)), 0.95); g.lineWidth = Math.max(1, Mt(ancho * rng.rango(0.8, 1.4)));
        g.beginPath(); g.moveTo(X(bx), Z(bz)); g.quadraticCurveTo(X(cx), Z(cz), X(ex), Z(ez)); g.stroke();
      }
    },
    /** Guijarros y gravilla sueltos en un rectángulo [x0,z0,x1,z1]. */
    guijarros(r, n, paleta, { rMin = 0.035, rMax = 0.11, alpha = 0.95 } = {}) {
      for (let i = 0; i < n; i++) {
        const x = rng.rango(r[0], r[2]), z = rng.rango(r[1], r[3]); if (!dentro(x, z)) continue;
        const rr = rng.rango(rMin, rMax), rot = rng() * 3.14, c = paleta[Math.floor(rng() * paleta.length)];
        g.save(); g.translate(X(x), Z(z)); g.rotate(rot);
        g.fillStyle = rgba(0x0e0b08, 0.4); g.beginPath(); g.ellipse(Mt(rr * 0.25), Mt(rr * 0.3), Mt(rr * 1.1), Mt(rr * 0.8), 0, 0, 6.2832); g.fill();
        g.fillStyle = rgba(c, alpha); g.beginPath(); g.ellipse(0, 0, Mt(rr), Mt(rr * rng.rango(0.65, 0.9)), 0, 0, 6.2832); g.fill();
        g.fillStyle = rgba(claro(c, 1.35), 0.55); g.beginPath(); g.ellipse(-Mt(rr * 0.25), -Mt(rr * 0.25), Mt(rr * 0.5), Mt(rr * 0.3), 0, 0, 6.2832); g.fill();
        g.restore();
      }
    },
    /** Hojas secas o caídas. */
    hojas(x, z, r, n, paleta, { tam = 1 } = {}) {
      if (!dentro(x, z, r + 1)) return;
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.2832, rr = Math.sqrt(rng()) * r, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, c = paleta[Math.floor(rng() * paleta.length)];
        const L = Mt(rng.rango(0.06, 0.12) * tam);
        g.save(); g.translate(X(px), Z(pz)); g.rotate(rng() * 6.28);
        g.fillStyle = rgba(0x0e0b08, 0.3); g.beginPath(); g.ellipse(Mt(0.015), Mt(0.02), L, L * 0.5, 0, 0, 6.2832); g.fill();
        g.fillStyle = rgba(claro(c, rng.rango(0.75, 1.15)), 0.97); g.beginPath(); g.ellipse(0, 0, L, L * rng.rango(0.42, 0.6), 0, 0, 6.2832); g.fill();
        g.strokeStyle = rgba(claro(c, 0.6), 0.7); g.lineWidth = 1; g.beginPath(); g.moveTo(-L, 0); g.lineTo(L * 0.9, 0); g.stroke();
        g.restore();
      }
    },
    /** Briznas de paja o hierba seca tumbadas. */
    paja(x, z, r, n, paleta, { largo = 0.3, ancho = 0.016 } = {}) {
      if (!dentro(x, z, r + 1)) return;
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const a = rng() * 6.2832, rr = Math.sqrt(rng()) * r, px = x + Math.cos(a) * rr, pz = z + Math.sin(a) * rr, b = rng() * 6.28, l = largo * rng.rango(0.4, 1.1);
        const c = paleta[Math.floor(rng() * paleta.length)];
        g.strokeStyle = rgba(claro(c, rng.rango(0.8, 1.2)), 0.95); g.lineWidth = Math.max(1, Mt(ancho * rng.rango(0.7, 1.4)));
        g.beginPath(); g.moveTo(X(px), Z(pz)); g.quadraticCurveTo(X(px + Math.cos(b + 0.5) * l * 0.5), Z(pz + Math.sin(b + 0.5) * l * 0.5), X(px + Math.cos(b) * l), Z(pz + Math.sin(b) * l)); g.stroke();
      }
    },
    /** Losa/adoquín grande suelto o bloque de un dibujo de pavimento: rectángulo rotado con junta. */
    losa(x, z, w, h, rot, color, { alpha = 0.95, junta = 0x1d1812 } = {}) {
      g.save(); g.translate(X(x), Z(z)); g.rotate(rot);
      g.fillStyle = rgba(junta, alpha * 0.9); g.fillRect(-Mt(w / 2 + 0.02), -Mt(h / 2 + 0.02), Mt(w + 0.04), Mt(h + 0.04));
      g.fillStyle = rgba(color, alpha); g.fillRect(-Mt(w / 2), -Mt(h / 2), Mt(w), Mt(h));
      g.fillStyle = rgba(claro(color, 1.18), alpha * 0.45); g.fillRect(-Mt(w / 2), -Mt(h / 2), Mt(w), Mt(h * 0.18));
      g.fillStyle = rgba(claro(color, 0.75), alpha * 0.4); g.fillRect(-Mt(w / 2), Mt(h * 0.34), Mt(w), Mt(h * 0.16));
      g.restore();
    },
    /** Anillo de sillares (r, grosor) entre dos ángulos. */
    anillo(x, z, r, grosor, color, { a0 = 0, a1 = 6.2832, largo = 0.55, alpha = 0.95, variar = 0.12 } = {}) {
      const n = Math.max(6, Math.round(((a1 - a0) * r) / largo));
      for (let i = 0; i < n; i++) {
        const a = a0 + ((i + 0.5) / n) * (a1 - a0);
        d.losa(x + Math.cos(a) * r, z + Math.sin(a) * r, ((a1 - a0) * r / n) * 0.94, grosor, a + Math.PI / 2, claro(color, 1 + (rng() - 0.5) * variar * 2), { alpha });
      }
    },
    /** Hilera de sillares de x1,z1 a x2,z2. */
    hilera(x1, z1, x2, z2, grosor, color, { largo = 0.55, alpha = 0.95, variar = 0.12 } = {}) {
      const L = Math.hypot(x2 - x1, z2 - z1), n = Math.max(1, Math.round(L / largo)), a = Math.atan2(z2 - z1, x2 - x1);
      for (let i = 0; i < n; i++) {
        const t = (i + 0.5) / n;
        d.losa(x1 + (x2 - x1) * t, z1 + (z2 - z1) * t, (L / n) * 0.94, grosor, a, claro(color, 1 + (rng() - 0.5) * variar * 2), { alpha });
      }
    },
  };
  dibujar(d);

  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.needsUpdate = true;
  const mat = new THREE.MeshStandardMaterial({
    map: tex, transparent: true, depthWrite: false, roughness: o.rugosidad ?? 0.92, metalness: 0,
    polygonOffset: true, polygonOffsetFactor: o.offset ?? -3, polygonOffsetUnits: o.offset ?? -3,
  });
  mat.name = 'detalle_suelo';
  const w = x1 - x0, h = z1 - z0;
  const geo = new THREE.PlaneGeometry(w, h, Math.ceil(w / 2), Math.ceil(h / 2));
  geo.rotateX(-Math.PI / 2);
  const p = geo.attributes.position, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  for (let i = 0; i < p.count; i++) {
    const wx = p.getX(i) + cx, wz = p.getZ(i) + cz;
    p.setXYZ(i, wx, (kit.altura?.(wx, wz) ?? 0) + y, wz);
  }
  geo.computeVertexNormals();
  const malla = new THREE.Mesh(geo, mat);
  malla.receiveShadow = true; malla.renderOrder = o.orden ?? 1; malla.name = 'detalle_suelo';
  kit.anadir(malla); kit._propios.push(mat, tex);
  return malla;
}
