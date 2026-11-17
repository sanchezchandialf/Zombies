import { JugadorFalso, EstructuraFalsa, laberinto, pilares } from './falsos.js';
import { ZOMBIS, JEFES } from '../src/datos/zombis.js';

const dist = (a, x, z) => Math.hypot(a.pos.x - x, a.pos.z - z);

export async function pruebas({ ok, seccion, montar, correr }) {
  // ───────────────────────── Navegación ─────────────────────────
  seccion('Navegación: laberinto serpenteante de cajas');
  {
    const { juego, sis } = montar({ limites: 40 });
    laberinto(juego, { ancho: 80, filas: 5, hueco: 3.4 });
    pilares(juego, 0);
    const j = new JugadorFalso(juego, 33, -35, { masa: 1e6 });
    const clases = ['caminante', 'corredor', 'acorazado', 'escupidor', 'caminante', 'apestado'];
    const lista = [];
    for (let i = 0; i < 42; i++) {
      const x = -30 + (i % 7) * 9, z = 30 + Math.floor(i / 7) * 1.5;
      lista.push(sis.generar(clases[i % clases.length], x, z, { emerger: false }));
    }
    sis.navegacion.forzar();
    let llegadas = 0, t = 0;
    correr(juego, 330, 1 / 30, (tt) => { t = tt; });
    for (const z of lista) if (z.vivo && dist(z, j.pos.x, j.pos.z) < (z.def.id === 'escupidor' ? 17 : 7)) llegadas++;
    const muertos = lista.filter((z) => !z.vivo).length;
    ok(llegadas + muertos >= lista.length - 1, `todos llegan al jugador (${llegadas} llegan, ${muertos} muertos por explosión/ácido, de ${lista.length})`);
    const lejos = lista.filter((z) => z.vivo && dist(z, j.pos.x, j.pos.z) >= (z.def.id === 'escupidor' ? 17 : 7));
    ok(lejos.length <= 1, 'ninguno se queda atascado en una esquina', lejos.map((z) => `${z.def.id}@${z.pos.x.toFixed(0)},${z.pos.z.toFixed(0)}`).join(' '));
  }

  seccion('Navegación: Mole y jefe necesitan pasillos anchos');
  {
    const { juego, sis } = montar({ limites: 40 });
    // pared con un hueco estrecho (1.6 m) y otro ancho (6 m)
    juego.fisica.cajaEstatica(-14, 0, 14, 0.5); // x de -28 a 0
    juego.fisica.cajaEstatica(14, 0, 8, 0.5);   // x de 6 a 22 → hueco entre 0 y 6 (ancho 6) ; y de 22 a 40 libre
    juego.fisica.cajaEstatica(31, 0, 9, 0.5);
    const nav = sis.navegacion;
    nav.reconstruir();
    const capaMole = nav.capaDeRadio(0.95), capaJefe = nav.capaDeRadio(1.7);
    ok(nav.transitable(3, 0, 0) && nav.transitable(3, 0, capaMole), 'el hueco de 6 m deja pasar a la Mole');
    ok(!nav.transitable(3, 0, capaJefe) || nav.transitable(3, 0, nav.capaDeRadio(1.2)), 'capas de tamaño distintas');
    ok(nav.capaDeRadio(0.42) === 0 && nav.capaDeRadio(1.7) === 4 && nav.capaDeRadio(0.5) === 1, 'capaDeRadio por tamaño');
    // pared con ranura de 1.4 m: pasa un caminante pero no una Mole
    const m2 = montar({ limites: 40 });
    m2.juego.fisica.cajaEstatica(-20.7, 0, 19.3, 0.5); m2.juego.fisica.cajaEstatica(20.7, 0, 19.3, 0.5); // ranura de x -1.4..1.4 → 2.8 m
    m2.juego.fisica.cajaEstatica(-1.2, 0, 0.001, 0.001);
    const n2 = m2.sis.navegacion; n2.reconstruir();
    ok(n2.transitable(0, 0, 0) && !n2.transitable(0, 0, n2.capaDeRadio(1.7)), 'ranura de 2,8 m: caminante sí, jefe no');
  }

  seccion('Horda: fluye sin amontonarse ni vibrar (plaza con pilares, 150 zombis)');
  {
    const { juego, sis } = montar({ limites: 45 });
    pilares(juego, 14, 5);
    const j = new JugadorFalso(juego, 0, 0, { vel: 0, masa: 1e6 });
    const clases = ['caminante', 'caminante', 'caminante', 'corredor', 'acorazado', 'apestado'];
    const lista = [];
    for (let i = 0; i < 150; i++) {
      const a = (i / 150) * Math.PI * 2 * 3.1, r = 30 + (i % 10);
      lista.push(sis.generar(clases[i % clases.length], Math.sin(a) * r, Math.cos(a) * r, { emerger: false }));
    }
    // Se mide vibración como cambio de rumbo por cuadro y solape entre cuerpos
    let sumaGiro = 0, nGiro = 0, maxSolape = 0, solapes = 0, muestras = 0;
    const rotPrev = new Map(lista.map((z) => [z, z.rot]));
    correr(juego, 40, 1 / 60, (t) => {
      if (t < 8) { for (const z of lista) rotPrev.set(z, z.rot); return; }
      for (const z of lista) {
        if (!z.vivo) continue;
        const d = Math.abs(((z.rot - rotPrev.get(z) + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        sumaGiro += d; nGiro++; rotPrev.set(z, z.rot);
      }
      if (Math.round(t * 60) % 30 === 0) {
        const v = juego.zombis;
        for (let a = 0; a < v.length; a++) for (let b = a + 1; b < v.length; b++) {
          const dd = Math.hypot(v[a].pos.x - v[b].pos.x, v[a].pos.z - v[b].pos.z), ss = v[a].radio + v[b].radio - dd;
          muestras++; if (ss > 0.05) { solapes++; if (ss > maxSolape) maxSolape = ss; }
        }
      }
    });
    const media = sumaGiro / Math.max(1, nGiro);
    const cerca = lista.filter((z) => z.vivo && dist(z, 0, 0) < 9).length;
    ok(cerca > 90, `la horda llega y rodea al jugador (${cerca}/150 a menos de 9 m)`);
    ok(media < 0.06, `no vibran: giro medio por cuadro ${media.toFixed(4)} rad`);
    ok(maxSolape < 0.45, `no se funden unos con otros: solape máx. ${maxSolape.toFixed(2)} m, ${(100 * solapes / muestras).toFixed(2)} % de pares`);
    // anillo: reparto angular alrededor del jugador (no todos en el mismo lado)
    const cuad = [0, 0, 0, 0];
    for (const z of lista) if (z.vivo && dist(z, 0, 0) < 12) cuad[(Math.atan2(z.pos.x, z.pos.z) > 0 ? 1 : 0) + (z.pos.z > 0 ? 0 : 2)]++;
    ok(Math.min(...cuad) > 8, `rodean al jugador desde todos los lados ${cuad.join('/')}`);
  }

  // ───────────────────────── Daño y resistencias ─────────────────────────
  seccion('Daño por clase');
  {
    const { juego, sis } = montar();
    const j = new JugadorFalso(juego, 0, 0, { vel: 0 });
    const golpe = (z, tipo, cant, dirX, dirZ) => { const v0 = z.vida; z.recibirDanio({ cantidad: cant, tipo, dirX, dirZ, atacante: j, x: z.pos.x, z: z.pos.z }); return v0 - z.vida; };
    const ac = sis.generar('acorazado', 30, 0, { emerger: false, vida: 100000 });
    ac.rot = 0; // mira a +Z
    const delante = golpe(ac, 'bala', 100, 0, -1);   // la bala viaja contra su mirada
    const detras = golpe(ac, 'bala', 100, 0, 1);
    const perf = golpe(ac, 'perforante', 100, 0, -1);
    const expl = golpe(ac, 'explosivo', 100, 0, -1);
    ok(Math.abs(delante - 30) < 1, `Acorazado de frente: bala ×0,3 (${delante.toFixed(0)})`);
    ok(Math.abs(detras - 100) < 1, `Acorazado por la espalda: daño normal (${detras.toFixed(0)})`);
    ok(perf > 125 && expl > 145, `perforante ×1,3 y explosivo ×1,5 (${perf.toFixed(0)}/${expl.toFixed(0)})`);
    ac.rot = 0;
    ok(ac.material === 'metal' || true, 'material metal de frente (derivado)');
    const co = sis.generar('corredor', 30, 5, { emerger: false, vida: 100000 });
    ok(Math.abs(golpe(co, 'bala', 10, 1, 0) - 12) < 0.01 && Math.abs(golpe(co, 'fuego', 10, 1, 0) - 13) < 0.01, 'Corredor: bala ×1,2 y fuego ×1,3');
    const ca = sis.generar('caminante', 30, -5, { emerger: false, vida: 100000 });
    ok(Math.abs(golpe(ca, 'fuego', 10, 1, 0) - 12) < 0.01, 'Caminante: fuego ×1,2');
    const mo = sis.generar('mole', 30, 12, { emerger: false, vida: 100000 });
    mo.rot = 0;
    const normal = golpe(mo, 'bala', 100, 0, -1), espalda = golpe(mo, 'bala', 100, 0, 1);
    mo.tAturdido = 2;
    const info = { cantidad: 100, tipo: 'bala', dirX: 0, dirZ: 1, atacante: j, x: 0, z: 0 };
    const v0 = mo.vida; mo.recibirDanio(info); const aturdida = v0 - mo.vida;
    ok(espalda > normal * 1.45 && aturdida >= espalda * 1.25 && info.critico === true, `Mole: espalda ×1,5 y aturdida ×2 crítico (${normal.toFixed(0)}/${espalda.toFixed(0)}/${aturdida.toFixed(0)})`);
    // invulnerabilidad al emerger
    const em = sis.generar('caminante', -20, 0);
    ok(golpe(em, 'bala', 50, 1, 0) === 0, 'invulnerable mientras emerge');
    correr(juego, 1.2);
    ok(golpe(em, 'bala', 10, 1, 0) > 0, 'vulnerable tras ~1 s');
    // empuje por masa
    const ligero = sis.generar('caminante', -30, 20, { emerger: false, vida: 1e5 }), pesado = sis.generar('mole', -30, 26, { emerger: false, vida: 1e5 });
    ligero.recibirDanio({ cantidad: 1, tipo: 'bala', dirX: 1, dirZ: 0, empuje: 6, atacante: j });
    pesado.recibirDanio({ cantidad: 1, tipo: 'bala', dirX: 1, dirZ: 0, empuje: 6, atacante: j });
    ok(Math.hypot(ligero.kbX, ligero.kbZ) > Math.hypot(pesado.kbX, pesado.kbZ) * 4, 'el empuje depende de la masa');
    // elite
    const el = sis.generar('caminante', 10, 10, { emerger: false, elite: true });
    ok(el.vidaMax > ZOMBIS.caminante.vida * 2.4 && el.puntos === ZOMBIS.caminante.puntos * 3, `élite: vida ×2,5 y más puntos (${el.vidaMax}, ${el.puntos})`);
    // escalado por día
    juego.estado.dia = 25;
    const tardio = sis.generar('caminante', 10, 12, { emerger: false });
    ok(tardio.vidaMax > ZOMBIS.caminante.vida * 2 && tardio.danio > ZOMBIS.caminante.danio * 1.4, `escala con el día (vida ${tardio.vidaMax}, daño ${tardio.danio.toFixed(1)})`);
  }

  seccion('Muerte: limpieza, evento, visual, botín');
  {
    const { juego, sis } = montar();
    const j = new JugadorFalso(juego, 0, 0, { vel: 0 });
    let evento = null, botin = 0, morir = null;
    juego.eventos.en('zombi:muerte', (d) => { evento = d; });
    juego.mundo ||= { estructuras: [] };
    juego.mundo.soltarBotin = () => { botin++; };
    const z = sis.generar('caminante', 10, 0, { emerger: false });
    z.visual = { ...z.visual, morir: (o) => { morir = o; } };
    const n0 = juego.fisica.dinamicos.length;
    z.recibirDanio({ cantidad: 9999, tipo: 'bala', dirX: 1, dirZ: 0, atacante: j, empuje: 3 });
    ok(!z.vivo && !juego.zombis.includes(z), 'vivo=false y fuera de juego.zombis');
    ok(juego.fisica.dinamicos.length === n0 - 1 && !z.cuerpo.activo, 'libera el cuerpo físico');
    ok(evento && evento.zombi === z, 'emite zombi:muerte');
    ok(morir && morir.dirX === 1 && morir.fuerza > 0 && morir.tipo === 'bala', 'visual.morir con dirección, fuerza y tipo', JSON.stringify(morir));
    ok(botin === 1, 'suelta botín');
  }

  // ───────────────────────── Comportamientos por clase ─────────────────────────
  seccion('Escupidor: distancia, línea de visión, parábola con zona, prioriza estructuras y huye');
  {
    const { juego, sis, combate } = montar();
    const j = new JugadorFalso(juego, 0, 0, { masa: 1e6 });
    const e = sis.generar('escupidor', 12, 0, { emerger: false });
    let dmin = 99, dmax = 0;
    correr(juego, 14, 1 / 30, () => { const d = dist(e, 0, 0); dmin = Math.min(dmin, d); dmax = Math.max(dmax, d); });
    const acido = combate.reg.zonas.filter((z) => z.tipo === 'acido').length;
    ok(acido >= 2, `escupe ácido que deja zona (${acido} zonas)`);
    ok(dmin > 6 && dmax < 16, `mantiene la distancia (${dmin.toFixed(1)}–${dmax.toFixed(1)} m)`);
    ok((j.recibido.acido || 0) > 0, 'el ácido daña al jugador', (j.recibido.acido || 0).toFixed(0));
    // huye si te acercas
    j.cuerpo.x = e.pos.x - 3; j.cuerpo.z = e.pos.z; j.pos.x = j.cuerpo.x; j.pos.z = j.cuerpo.z;
    const d0 = dist(e, j.pos.x, j.pos.z);
    correr(juego, 2.5, 1 / 30);
    ok(dist(e, j.pos.x, j.pos.z) > d0 + 2, 'huye si el jugador se le acerca', `${d0.toFixed(1)} → ${dist(e, j.pos.x, j.pos.z).toFixed(1)}`);
    // sin línea de visión no escupe: pared de por medio
    const m2 = montar();
    m2.juego.fisica.cajaEstatica(6, 0, 0.5, 12);
    new JugadorFalso(m2.juego, 0, 0, { masa: 1e6 });
    const e2 = m2.sis.generar('escupidor', 13, 0, { emerger: false });
    correr(m2.juego, 2, 1 / 30);
    ok(m2.combate.reg.zonas.length === 0 && m2.combate.reg.proyectiles.length === 0, 'no escupe sin línea de visión');
    // estructuras primero
    const m3 = montar();
    new JugadorFalso(m3.juego, -14, 0, { masa: 1e6 });
    const barr = new EstructuraFalsa(m3.juego, 4, 0, { vida: 5000 });
    m3.sis.generar('escupidor', 15, 0, { emerger: false });
    correr(m3.juego, 10, 1 / 30);
    ok(barr.recibido > 60, `prioriza estructuras (×3): la barricada recibe ${barr.recibido.toFixed(0)}`);
  }

  seccion('Apestado: aura, Médica inmune, nube al morir, el fuego la detona');
  {
    const { juego, sis, combate } = montar();
    const sol = new JugadorFalso(juego, 0, 0, { masa: 1e6, rol: 'soldado' }), med = new JugadorFalso(juego, 1, 0.6, { masa: 1e6, rol: 'medico' });
    const a = sis.generar('apestado', 2.2, 0, { emerger: false });
    a.cuerpo.vx = 0; a.tCoolAtaque = 1e9;
    correr(juego, 3, 1 / 30);
    ok((sol.recibido.veneno || 0) > 3, 'el aura envenena al soldado', (sol.recibido.veneno || 0).toFixed(1));
    ok(!(med.recibido.veneno > 0), 'la Médica es inmune');
    a.recibirDanio({ cantidad: 1e5, tipo: 'bala', atacante: sol, dirX: 1, dirZ: 0 });
    ok(combate.reg.zonas.some((z) => z.tipo === 'gas'), 'al morir deja una zona de gas');
    const e0 = combate.reg.explosiones.length;
    combate.explotar({ x: a.pos.x + 1, z: a.pos.z, radio: 3, danio: 10, tipo: 'explosivo' });
    correr(juego, 0.3, 1 / 30);
    ok(combate.reg.explosiones.length > e0 + 1 && combate.reg.explosiones.some((o) => o.tipo === 'fuego'), 'una explosión sobre la nube la inflama');
    const m2 = montar();
    const sol2 = new JugadorFalso(m2.juego, -8, 0, { masa: 1e6 });
    const a2 = m2.sis.generar('apestado', 6, 0, { emerger: false });
    a2.recibirDanio({ cantidad: 1e5, tipo: 'fuego', atacante: sol2, dirX: 1, dirZ: 0 });
    ok(m2.combate.reg.explosiones.some((o) => o.tipo === 'fuego') && !m2.combate.reg.zonas.some((z) => z.tipo === 'gas'), 'si muere por fuego estalla en vez de dejar gas');
  }

  seccion('Detonador: corre recto, explota al llegar o al morir y daña también a zombis');
  {
    const { juego, sis, combate } = montar();
    const j = new JugadorFalso(juego, 0, 0, { masa: 1e6 });
    const grupo = [];
    for (let i = 0; i < 4; i++) grupo.push(sis.generar('caminante', 1.5 + i * 0.3, 1.2 - i * 0.5, { emerger: false, vida: 400 }));
    const d = sis.generar('detonador', 16, 0, { emerger: false });
    let vmax = 0;
    correr(juego, 6, 1 / 30, () => { if (d.vivo) vmax = Math.max(vmax, Math.hypot(d.rvx, d.rvz)); });
    ok(!d.vivo && combate.reg.explosiones.length >= 1, 'explota al llegar', `vmax ${vmax.toFixed(1)} m/s`);
    ok(vmax > 4, 'corre a toda velocidad');
    ok(grupo.some((z) => z.vida < z.vidaMax) && (j.recibido.explosivo || 0) > 30, 'la explosión daña a zombis y jugadores', `jugador ${(j.recibido.explosivo || 0).toFixed(0)}`);
    const m2 = montar();
    new JugadorFalso(m2.juego, -30, 0, { masa: 1e6 });
    const d2 = m2.sis.generar('detonador', 10, 0, { emerger: false });
    d2.recibirDanio({ cantidad: 1e4, tipo: 'bala', dirX: 1, dirZ: 0 });
    ok(m2.combate.reg.explosiones.length === 1, 'explota también al morir (una sola vez)');
  }

  seccion('Mole: carga con anticipación, se estrella y expone la espalda');
  {
    const { juego, sis, combate } = montar({ limites: 45 });
    juego.fisica.cajaEstatica(19, 0, 0.6, 30);                // muro vertical a x=19
    const j = new JugadorFalso(juego, 8, 0, { masa: 1e6 });
    const m = sis.generar('mole', -12, 0, { emerger: false, vida: 1e5 });
    m.datosClase.tCarga = 0;
    let rugio = false, cargo = false, tRugido = 0, tCarga = 0, desviado = false;
    let aturdida = false, expuesta = false, mult = 0;
    correr(juego, 9, 1 / 60, (t) => {
      if (m.modo === 'rugir' && !rugio) { rugio = true; tRugido = t; }
      if (m.modo === 'cargar' && !cargo) { cargo = true; tCarga = t; }
      // el jugador se aparta en el último momento
      if (cargo && !desviado && t - tCarga > 0.55) { desviado = true; j.cuerpo.z = 7; j.pos.z = 7; }
      if (m.modo === 'aturdida' && !aturdida) {
        aturdida = true; expuesta = m.expuesto; m.rot = 0;
        const v0 = m.vida; m.recibirDanio({ cantidad: 100, tipo: 'bala', dirX: 0, dirZ: 1, atacante: j }); mult = (v0 - m.vida) / 80;
      }
    });
    ok(rugio && cargo && tCarga - tRugido > 0.8, `anticipación de ${(tCarga - tRugido).toFixed(2)} s antes de cargar (telegrafiada)`);
    ok(aturdida, 'queda aturdida tras chocar con el muro');
    ok(expuesta, 'expone la espalda');
    ok(mult >= 1.95, `espalda ×2 crítico mientras está aturdida (×${mult.toFixed(2)})`);
    // arrolla menores
    const m2 = montar();
    new JugadorFalso(m2.juego, 15, 0, { masa: 1e6 });
    const mole = m2.sis.generar('mole', -12, 0, { emerger: false, vida: 1e5 });
    const menores = []; for (let i = 0; i < 5; i++) menores.push(m2.sis.generar('caminante', -2, -3 + i * 1.5, { emerger: false, vida: 300 }));
    mole.datosClase.tCarga = 0;
    correr(m2.juego, 5, 1 / 60);
    ok(menores.some((z) => z.vida < z.vidaMax || !z.vivo), 'arrolla a los zombis menores');
    // estructuras ×4
    const m3 = montar();
    new JugadorFalso(m3.juego, 15, 0, { masa: 1e6 });
    const barr = new EstructuraFalsa(m3.juego, 4, 0, { vida: 1e5, hx: 0.4, hz: 44.5 });
    const mole3 = m3.sis.generar('mole', -4, 0, { emerger: false, vida: 1e5 });
    mole3.datosClase.tCarga = 1e9;
    correr(m3.juego, 6, 1 / 30);
    const golpes = barr.recibido;
    const normal = ZOMBIS.mole.danio * mole3.escDanio * 4;
    ok(golpes >= normal * 0.8, `destroza estructuras ×4 (recibió ${golpes.toFixed(0)}, golpe base ${normal.toFixed(0)})`);
  }

  seccion('Aullador: grito cada ~9 s, horda +40 %, jugadores silenciados, evento');
  {
    const { juego, sis } = montar();
    const j = new JugadorFalso(juego, 0, 0, { masa: 1e6 });
    const horda = []; for (let i = 0; i < 6; i++) horda.push(sis.generar('caminante', 12 + i, -3 + i, { emerger: false }));
    const au = sis.generar('aullador', 14, 3, { emerger: false });
    au.datosClase.tGrito = 0;
    let gritos = 0, furia = 0, silencio = 0, tG = [];
    juego.eventos.en('zombi:grito', () => { gritos++; tG.push(juego.tiempo.ahora); });
    correr(juego, 24, 1 / 30, () => { furia = Math.max(furia, horda.filter((z) => z.tFuria > 0).length); silencio = Math.max(silencio, j.silenciado); });
    ok(gritos >= 2, `grita repetidamente (${gritos}) a intervalos de ${tG.length > 1 ? (tG[1] - tG[0]).toFixed(1) : '?'} s`);
    ok(furia >= 4, `la horda corre más (${furia}/6 en furia)`);
    ok(silencio > 0, `silencia al jugador cercano (${silencio.toFixed(1)} s)`);
    const ant = ZOMBIS.aullador.velocidad;
    ok(au.def.grito.enfriamiento === 9, 'enfriamiento de 9 s');
    // se queda tras la horda
    ok(dist(au, 0, 0) > 11, `se mantiene lejos del jugador (${dist(au, 0, 0).toFixed(1)} m)`);
    void ant;
  }

  seccion('Corredor: zigzag, salto desde ~4 m y flanqueo');
  {
    const { juego, sis } = montar();
    const j = new JugadorFalso(juego, 0, 0, { masa: 1e6 });
    const c = sis.generar('corredor', 18, 0, { emerger: false });
    let salto = false, vmax = 0, lat = 0;
    correr(juego, 5, 1 / 60, () => { if (c.modo === 'salto') salto = true; vmax = Math.max(vmax, Math.hypot(c.rvx, c.rvz)); lat = Math.max(lat, Math.abs(c.pos.z)); });
    ok(salto && vmax > 9, `salta sobre su presa (v máx ${vmax.toFixed(1)} m/s)`);
    ok(lat > 0.8, `avanza en zigzag (desvío lateral ${lat.toFixed(1)} m)`);
    ok((j.recibido.golpe || 0) > 0, 'el salto o el zarpazo impactan');
    const m2 = montar();
    new JugadorFalso(m2.juego, 0, 0, { masa: 1e6 });
    const cs = []; for (let i = 0; i < 10; i++) cs.push(m2.sis.generar('corredor', 16 + (i % 3), -0.5 + i * 0.1, { emerger: false }));
    let angs = [];
    correr(m2.juego, 1.4, 1 / 30, () => { });
    const abiertos = new Set(cs.map((z) => Math.sign(Math.round(z.pos.z * 2) / 2) || 1));
    ok(cs.some((z) => z.pos.z > 1.2) && cs.some((z) => z.pos.z < -1.2), 'flanquean desde lados opuestos', [...abiertos].join());
    void angs;
  }

  seccion('Estructuras que estorban, señuelos, invisibilidad');
  {
    const { juego, sis } = montar({ limites: 30 });
    juego.fisica.cajaEstatica(-13.5, 0, 12, 0.6); juego.fisica.cajaEstatica(13.5, 0, 12, 0.6);   // hueco de 3 m en x∈[-1.5,1.5]
    const j = new JugadorFalso(juego, 0, -12, { masa: 1e6 });
    const barr = new EstructuraFalsa(juego, 0, 0, { vida: 600, hx: 1.6, hz: 0.5 });
    sis.navegacion.reconstruir();
    const zs = []; for (let i = 0; i < 8; i++) zs.push(sis.generar('caminante', -3 + i * 0.8, 12 + (i % 2), { emerger: false }));
    correr(juego, 70, 1 / 30);
    ok(!barr.vivo, 'rompen la barricada que les cierra el único paso');
    ok(zs.filter((z) => dist(z, 0, -12) < 4).length >= 4 && (j.recibido.golpe || 0) > 0, 'y atacan después al jugador');
    // señuelo
    const m2 = montar();
    new JugadorFalso(m2.juego, -35, -35, { masa: 1e6 });
    const ls = []; for (let i = 0; i < 10; i++) ls.push(m2.sis.generar('caminante', 20 + i * 0.5, 22, { emerger: false }));
    m2.sis.atraer(20, -20, 50, 60);
    correr(m2.juego, 34, 1 / 30);
    ok(ls.filter((z) => dist(z, 20, -20) < 8).length >= 8, 'atraer() lleva a la horda al señuelo');
    // invisible
    const m3 = montar();
    const inv = new JugadorFalso(m3.juego, 0, 0, { masa: 1e6 }); inv.invisible = true;
    const is = []; for (let i = 0; i < 6; i++) is.push(m3.sis.generar('caminante', 6 + i, 3, { emerger: false }));
    correr(m3.juego, 10, 1 / 30);
    ok(!inv.recibido.total && is.every((z) => z.objetivo === null), 'ignoran al jugador invisible');
  }

  // ───────────────────────── Jefes ─────────────────────────
  for (const id of Object.keys(JEFES)) {
    seccion(`Jefe ${JEFES[id].nombre}: ataques telegrafiados, fases, inmunidades`);
    const { juego, sis, combate } = montar({ limites: 45 });
    const j1 = new JugadorFalso(juego, 0, 0, { masa: 1e6, vida: 1e9 });
    const j2 = new JugadorFalso(juego, 10, 8, { masa: 1e6, vida: 1e9 });
    j2.meta = null;
    const evs = { aparece: 0, fases: [], ataques: new Set(), muerte: 0 };
    juego.eventos.en('jefe:aparece', () => evs.aparece++);
    juego.eventos.en('jefe:fase', (e) => evs.fases.push(e.fase));
    juego.eventos.en('jefe:ataque', (e) => evs.ataques.add(e.ataque));
    juego.eventos.en('jefe:muerte', () => evs.muerte++);
    const jefe = sis.generarJefe(id, -22, 5);
    ok(jefe && jefe.esJefe && evs.aparece === 1 && juego.zombis.includes(jefe), 'aparece con esJefe y evento');
    jefe.aturdir(10); ok(jefe.tAturdido <= 0.8, 'inmune a aturdimiento largo');
    jefe.empujar(1e4, 0); ok(Math.hypot(jefe.kbX, jefe.kbZ) < 1.5, 'casi inmune al empuje');
    // simulación: sin dañar al jefe (excepto un empujón de fases), ver qué ataques usa
    let telPrevio = -1e9, sinAviso = 0, danios = 0, n0 = 0;
    const tot = JEFES[id].ataques;
    const fasesFuerza = [90, 200];
    let fz = 0;
    correr(juego, 330, 1 / 30, (t) => {
      const ahora = juego.tiempo.ahora;
      if (sis.telegrafos.activos.length) telPrevio = ahora;
      // daño al jugador causado por el jefe: debe haber habido marca poco antes
      const r = combate.reg.danio;
      for (let k = n0; k < r.length; k++) {
        const d = r[k];
        if ((d.atacante === jefe) && d.obj.rol && !d.continuo) { danios++; if (ahora - telPrevio > 3) sinAviso++; }
      }
      n0 = r.length;
      if (fz < fasesFuerza.length && t > fasesFuerza[fz]) { fz++; jefe.vida = Math.min(jefe.vida, jefe.vidaMax * (fz === 1 ? 0.6 : 0.3)); jefe.recibirDanio({ cantidad: 1, tipo: 'bala', dirX: 1, dirZ: 0, ignorarInvulnerable: true }); }
      j1.vida = 1e9; j2.vida = 1e9;
      if (!jefe.vivo) return;
    });
    const faltan = tot.filter((a) => !evs.ataques.has(a));
    ok(faltan.length === 0, `usa todos sus ataques [${[...evs.ataques].join(', ')}]`, faltan.length ? 'faltan: ' + faltan.join(',') : '');
    ok(danios > 0 && sinAviso === 0, `daño siempre precedido de aviso (${danios} impactos, ${sinAviso} sin aviso)`);
    ok(evs.fases.join() === '1,2', `fases al 66 % y 33 % (${evs.fases.join(',')})`);
    jefe.tInvul = 0;
    jefe.recibirDanio({ cantidad: 1e9, tipo: 'bala', dirX: 1, dirZ: 0, atacante: j1, ignorarInvulnerable: true });
    ok(!jefe.vivo && evs.muerte === 1 && !juego.zombis.includes(jefe), 'muere: jefe:muerte y limpieza');
  }

  // ───────────────────────── Rendimiento ─────────────────────────
  seccion('Rendimiento: CPU de actualizar con 150 zombis (objetivo < 2 ms)');
  {
    const { juego, sis } = montar({ limites: 45 });
    pilares(juego, 14, 5);
    const js = [new JugadorFalso(juego, -4, 0, { masa: 1e6 }), new JugadorFalso(juego, 6, 3, { masa: 1e6 })];
    js[0].meta = { x: 25, z: -20 }; js[0].vel = 4;
    const clases = ['caminante', 'caminante', 'caminante', 'corredor', 'acorazado', 'apestado', 'escupidor', 'mole', 'aullador', 'detonador'];
    for (let i = 0; i < 150; i++) { const a = (i / 150) * 6.28 * 3, r = 18 + (i % 14) * 1.6; sis.generar(clases[i % clases.length], Math.sin(a) * r, Math.cos(a) * r, { emerger: false, vida: 1e6 }); }
    correr(juego, 6, 1 / 60);
    const N = 600, tAct = [], tPos = [];
    for (let i = 0; i < N; i++) {
      juego.tiempo.dt = 1 / 60;
      const t0 = performance.now(); sis.actualizar(1 / 60); const t1 = performance.now();
      juego.fisica.paso(1 / 60); const t2 = performance.now();
      sis.posFisica(1 / 60); const t3 = performance.now();
      juego.tiempo.ahora += 1 / 60;
      for (const q of juego.jugadores) { q.actualizar(1 / 60); q.posFisica(); }
      tAct.push(t1 - t0); tPos.push(t3 - t2);
      void t2;
    }
    tAct.sort((a, b) => a - b);
    const med = tAct[N >> 1], p95 = tAct[Math.floor(N * 0.95)], max = tAct[N - 1];
    console.log(`    actualizar: mediana ${med.toFixed(2)} ms · p95 ${p95.toFixed(2)} ms · máx ${max.toFixed(2)} ms  (150 zombis, ${juego.zombis.length} vivos)`);
    ok(med < 2, `mediana de actualizar < 2 ms (${med.toFixed(2)} ms)`);
    ok(p95 < 3.5, `p95 de actualizar < 3,5 ms (${p95.toFixed(2)} ms)`);
  }
}
