# Plan de producción (estado)

- [x] Fase 0 — Núcleo, datos de diseño, contratos, arnés de pruebas
- [x] Fase 1 — 16 sistemas (render, materiales, fx, audio, personajes, arsenal, combate, jugadores, zombis, vehículos, mundo, escenarios, director, UI)
- [x] Fase 2 — Seis escenarios
- [x] Fase 3 — Integración: partida completa día 1→31 verificada con bot (31 oleadas, 5 saltos de era, 6 jefes, victoria, 0 errores)
- [ ] Fase 4 — Revisión visual (legibilidad, atmósfera, personajes, mapas) + comparativa a ciegas con el original
- [ ] Fase 5 — Beta publicada (Vercel) + voces (ElevenLabs)

## Lecciones de las fases 1–3 (cómo trabajaron los agentes)
- Sonnet resolvió bien la **lógica** (combate 153/153, zombis 105/105, director 26 398/26 398, jugadores 124/124): código correcto y probado a la primera.
- En lo **visual** Sonnet entrega «funciona, pero sin pulir»: varios informes admiten capturas no revisadas o retoques sin verificar; el resultado integrado salió oscuro, con niebla excesiva y personajes poco legibles. Es donde más falla el criterio estético y donde rinde más un modelo superior.
- Los límites de uso cortaron a casi todos: encargos más acotados y archivos guardados a menudo.
- La máquina de pruebas se satura con muchos agentes a la vez (render por software): no más de 3–4 agentes visuales simultáneos.

## Asignación de modelo y esfuerzo por tipo de tarea
| Tarea | Modelo | Esfuerzo | Por qué |
|---|---|---|---|
| Despliegue de la beta (Vercel) | Haiku | low | Mecánico: compilar, desplegar, devolver URL |
| Voces en español (ElevenLabs) e integración en audio | Sonnet | medium | Guion corto + llamadas a herramientas + código sencillo |
| Dirección de fotografía y legibilidad (render, atmósferas, estados visuales) | Opus | high | Criterio estético fino sobre todo el juego; el mayor problema actual |
| Pulido visual de personajes y zombis | Opus | high | Modelado procedural con ojo de artista |
| Pulido de cada mapa | Sonnet | high | Contenido acotado y guiado por la crítica del revisor |
| Revisor visual a ciegas (comparativa con el original) | Opus | medium | Juicio visual exigente, sin escribir código |
| Arreglos de lógica o integración puntuales | Sonnet | medium | Errores concretos con pruebas existentes |
