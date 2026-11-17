// Minimapa circular (opcional: tecla M o ajuste «Minimapa»). Norte arriba, igual que la pantalla (arriba = −Z).
import { ERAS } from '../datos/eras.js';
import { ROLES } from '../datos/roles.js';
import { limitar } from './util.js';

export function crearMinimapa(ctx, canvas) {
  const { juego } = ctx;
  const g = canvas.getContext('2d');
  const R = canvas.width / 2;
  let acum = 1, ultimoHash = '';

  const onTecla = (ev) => {
    if (ev.code !== 'KeyM' || ev.repeat) return;
    if (juego.estado.fase !== 'jugando') return;
    ctx.ajustes.minimapa = !ctx.ajustes.minimapa;
    ctx.guardarAjustes(); ctx.aplicarAjustes();
  };
  addEventListener('keydown', onTecla);

  function dibujar() {
    const est = juego.estado;
    const era = ERAS[est.eraIdx] || ERAS[0];
    const lim = juego.escenarios?.actual?.limites ?? juego.fisica?.limites ?? { minX: -45, maxX: 45, minZ: -45, maxZ: 45 };
    const cx = (lim.minX + lim.maxX) / 2, cz = (lim.minZ + lim.maxZ) / 2;
    const medio = Math.max(lim.maxX - lim.minX, lim.maxZ - lim.minZ) / 2 || 45;
    const k = (R * 0.9) / medio;
    const X = (x) => R + (x - cx) * k, Y = (z) => R + (z - cz) * k;

    g.clearRect(0, 0, canvas.width, canvas.height);
    g.save();
    g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.clip();
    // fondo y límites del mapa
    const fondo = g.createRadialGradient(R, R * 0.8, 4, R, R, R);
    fondo.addColorStop(0, 'rgba(14,18,24,.88)'); fondo.addColorStop(1, 'rgba(4,6,10,.92)');
    g.fillStyle = fondo; g.fillRect(0, 0, canvas.width, canvas.height);
    g.strokeStyle = era.color; g.globalAlpha = 0.28; g.lineWidth = 1.5;
    g.strokeRect(X(lim.minX), Y(lim.minZ), (lim.maxX - lim.minX) * k, (lim.maxZ - lim.minZ) * k);
    // cuadrícula tenue
    g.globalAlpha = 0.07; g.beginPath();
    for (let i = -3; i <= 3; i++) { g.moveTo(R + i * R / 3, 0); g.lineTo(R + i * R / 3, canvas.height); g.moveTo(0, R + i * R / 3); g.lineTo(canvas.width, R + i * R / 3); }
    g.stroke();
    g.globalAlpha = 1;
    // estructuras y vehículos
    g.fillStyle = era.color; g.globalAlpha = 0.75;
    for (const lista of [juego.mundo?.estructuras, juego.vehiculos?.lista]) {
      if (!lista) continue;
      for (const e of lista) { if (e?.vivo === false || !e?.pos) continue; g.fillRect(X(e.pos.x) - 3, Y(e.pos.z) - 3, 6, 6); }
    }
    g.globalAlpha = 1;
    // zombis
    for (const z of juego.zombis) {
      if (z.vivo === false || !z.pos) continue;
      const x = X(z.pos.x), y = Y(z.pos.z);
      if (z.esJefe) {
        g.fillStyle = '#ff3a48'; g.beginPath(); g.arc(x, y, 7, 0, 6.3); g.fill();
        g.strokeStyle = '#fff'; g.lineWidth = 1.6; g.stroke();
      } else {
        g.fillStyle = z.elite ? '#ffb02e' : '#ff5a4a';
        g.fillRect(x - 2.2, y - 2.2, 4.4, 4.4);
      }
    }
    // jugadores
    for (const j of juego.jugadores) {
      if (!j.pos) continue;
      const x = X(j.pos.x), y = Y(j.pos.z);
      const col = ROLES[j.rol?.id]?.color ?? '#fff';
      if (j.vivo === false) {
        g.strokeStyle = col; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x - 5, y); g.lineTo(x + 5, y); g.moveTo(x, y - 5); g.lineTo(x, y + 5); g.stroke();
        continue;
      }
      g.fillStyle = col; g.strokeStyle = '#000'; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, 6, 0, 6.3); g.fill(); g.stroke();
      const rot = j.rot ?? 0;
      g.strokeStyle = col; g.lineWidth = 2.4; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.sin(rot) * 13, y + Math.cos(rot) * 13); g.stroke();
    }
    g.restore();
    // aro
    g.strokeStyle = era.color; g.lineWidth = 3; g.globalAlpha = 0.9;
    g.beginPath(); g.arc(R, R, R - 3, 0, Math.PI * 2); g.stroke();
    g.globalAlpha = 1;
  }

  return {
    actualizar(dt) {
      if (!ctx.ajustes.minimapa || juego.estado.fase === 'menu') return;
      acum += dt;
      if (acum < 1 / 12) return;
      acum = 0;
      dibujar();
    },
    destruir() { removeEventListener('keydown', onTecla); },
  };
}
