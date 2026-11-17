export async function pruebas({ ok, seccion, montar, correr }) {
  const { JugadorFalso } = await import('./falsos.js');
  seccion('Humo');
  const { juego, sis } = montar();
  const j = new JugadorFalso(juego, 0, 0);
  const z = sis.generar('caminante', 20, 0, { emerger: false });
  ok(!!z, 'se genera un caminante');
  correr(juego, 5);
  ok(Math.hypot(z.pos.x, z.pos.z) < 18, 'avanza hacia el jugador', z.pos.x.toFixed(1));
}
