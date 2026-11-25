// Voces reales en español (mp3 generados con ElevenLabs, en public/voces/). Locutor épico + voz monstruosa de los jefes.
// Se precargan con fetch + decodeAudioData en el AudioContext del motor y suenan por el bus de efectos.
// Si falta algún archivo (o no hay red), ese clip se ignora y el juego sigue igual.
// Registro: conectarVoces(juego, audio, en) lo llama src/audio/index.js.

const BASE = (typeof import.meta !== 'undefined' && import.meta.env?.BASE_URL) || './';
export const RUTA_VOCES = BASE + 'voces/';

/** id de archivo → texto (guion). Locutor: Ezequiel · Jefes: Gaspar. */
export const GUION = {
  locutor_primer_dia: 'Primer día. Año mil ochocientos.',
  locutor_dia_superado: 'Día superado.',
  locutor_salto_temporal: 'Salto temporal.',
  locutor_era_polvora: 'Era de la Pólvora.',
  locutor_era_vapor: 'Era del Vapor.',
  locutor_era_trincheras: 'Era de las Trincheras.',
  locutor_era_atomica: 'Era Atómica.',
  locutor_era_digital: 'Era Digital.',
  locutor_era_sintetica: 'Era Sintética.',
  locutor_jefe_cerca: 'Se acerca un jefe.',
  locutor_victoria: '¡Victoria!',
  locutor_has_caido: 'Has caído.',
  locutor_racha: 'Racha imparable.',
  jefe_coracero: '¡A la carga, carne fresca!',
  jefe_fogonero: '¡Más carbón para la caldera!',
  jefe_mariscal: '¡Ni un paso atrás, soldados!',
  jefe_rey_asfalto: '¡La carretera es mía!',
  jefe_paciente_cero: 'Todo esto empezó conmigo.',
  jefe_omega: 'Yo soy el final de la humanidad.',
};

const ERA_ID = ['polvora', 'vapor', 'trincheras', 'atomica', 'digital', 'sintetica'];

export function conectarVoces(juego, audio, en) {
  const buffers = new Map();       // id → AudioBuffer
  const fallidos = new Set();
  let cargando = false, cargado = false;
  let actual = null;               // { fuente, fin }
  const cola = [];                 // { id, t }
  let ultRacha = -99;

  async function precargar() {
    if (cargando || cargado) return;
    const ctx = audio.ctx;
    if (!ctx || typeof fetch === 'undefined') return;
    cargando = true;
    await Promise.all(Object.keys(GUION).map(async (id) => {
      try {
        const r = await fetch(RUTA_VOCES + id + '.mp3');
        if (!r.ok) throw new Error(String(r.status));
        const ab = await r.arrayBuffer();
        buffers.set(id, await ctx.decodeAudioData(ab));
      } catch { fallidos.add(id); }
    }));
    cargando = false; cargado = true;
  }

  function siguiente() {
    actual = null;
    const ahora = performance.now();
    while (cola.length) {
      const it = cola.shift();
      if (ahora - it.t < 5000) { sonar(it.id); return; }
    }
  }

  function sonar(id) {
    const ctx = audio.ctx, buses = audio.buses, buf = buffers.get(id);
    if (!ctx || !buses || !buf || ctx.state !== 'running') return false;
    const g = ctx.createGain(); g.gain.value = 1.15;
    const src = ctx.createBufferSource(); src.buffer = buf;
    src.connect(g); g.connect(buses.efectos);
    if (buses.rev) { const e = ctx.createGain(); e.gain.value = id.startsWith('jefe_') ? 0.35 : 0.2; g.connect(e); e.connect(buses.rev); }
    const reg = { fuente: src, g };
    actual = reg;
    src.onended = () => { try { g.disconnect(); } catch { /* ok */ } if (actual === reg) siguiente(); };
    src.start();
    return true;
  }

  /** Reproduce una voz. urgente = corta la actual y vacía la cola (victoria/derrota). */
  function decir(id, { urgente = false } = {}) {
    if (!cargado) { precargar(); return false; }
    if (!buffers.has(id)) return false;
    if (urgente) {
      cola.length = 0;
      if (actual) { try { actual.g.gain.setTargetAtTime(0, audio.ctx.currentTime, 0.03); actual.fuente.stop(audio.ctx.currentTime + 0.1); } catch { /* ok */ } actual = null; }
      return sonar(id);
    }
    if (actual) { if (cola.length < 3 && !cola.some((c) => c.id === id)) cola.push({ id, t: performance.now() }); return true; }
    return sonar(id);
  }

  // Precarga en cuanto el contexto exista (primer gesto del usuario).
  const desbloquear = audio.desbloquear?.bind(audio);
  audio.desbloquear = () => { desbloquear?.(); precargar(); };
  audio.voces = { decir, precargar, GUION, get cargadas() { return [...buffers.keys()]; }, get fallidas() { return [...fallidos]; }, get listo() { return cargado; } };

  en('oleada:inicio', (d) => {
    if (d.jefe) decir('locutor_jefe_cerca');
    else if ((d.dia ?? 0) === 1) decir('locutor_primer_dia');
  });
  en('oleada:fin', () => decir('locutor_dia_superado'));
  en('era:cambio', (d) => {
    if (d.anterior !== undefined && d.anterior !== null && d.anterior >= 0) decir('locutor_salto_temporal');
    const id = d.era?.id ?? ERA_ID[d.eraIdx];
    if (id) decir('locutor_era_' + id);
  });
  en('jefe:aparece', (d) => { const id = d.jefe?.def?.id; if (id) decir('jefe_' + id); });
  en('partida:fin', (d) => decir(d.victoria ? 'locutor_victoria' : 'locutor_has_caido', { urgente: true }));
  en('mensaje', (d) => {
    if (d.tipo !== 'logro' || !/^¡?Racha de/i.test(String(d.texto ?? ''))) return;
    const t = performance.now() / 1000;
    if (t - ultRacha < 25) return;
    ultRacha = t; decir('locutor_racha');
  });
  en('juego:listo', () => { precargar(); });
}
