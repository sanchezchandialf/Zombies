# Encargo común para los autores de mapas de ERA Z

Eres el autor de UN mapa (indicado en tu encargo). Lee primero `docs/AGENTES.md` y síguelo (incluye ARQUITECTURA, DISENO, ARTE),
después **`docs/ESCENARIOS.md`** (contrato de `construir(juego, kit)`, referencia del kit, presupuesto, reglas de diseño y lista de comprobación)
y `docs/MATERIALES.md`. Mira `src/escenarios/campo_pruebas.js` como ejemplo de referencia y las capturas del juego original en
`pruebas/referencia/` (arenas de bloques con pasillos y cuellos de botella; suelo legible donde la sangre acumulada destaca).
Debemos **superar** al original en calidad visual conservando su lectura táctica inmediata.

## Tu archivo
`src/escenarios/<id>.js` con `export function construir(juego, kit)` (puede ser async). Puedes crear una carpeta `src/escenarios/<id>/`
para submódulos. **No edites** el kit, el gestor ni otros mapas; si al kit le falta algo, constrúyelo dentro de tu carpeta.
Escribe archivos completos a disco pronto y con frecuencia: los agentes se cortan por límites de uso.

## Requisitos
- Arena de ~90×90 m con centro abierto para luchar, 3–5 masas grandes que creen calles y cuellos de botella de ≥4 m
  (jefes ≥3,6 m), sin callejones sin salida, 10–16 puntos de aparición (bordes + algunos interiores temáticos), 2 inicios de jugador.
- Elementos jugables con `juego.mundo?.crear?.(tipo, { x, z, rot, eraIdx })`: 6–12 `'explosivo'`, 6–10 `'caja'`, 1–2 `'emplazamiento'`,
  los interactivos de tu era (`ERAS[i].interactivos`) y algún `'empujable'`; 1–2 vehículos con `juego.vehiculos?.crear?.(ERAS[i].vehiculo, { x, z, rot })`.
  Estos módulos pueden estar aún incompletos: llamadas protegidas, y que el mapa funcione sin ellos.
- Composición para la cámara cenital a 55° mirando al norte: fachadas visibles al sur, tejados cuidados, nada alto en el borde sur.
- Suelo rico y legible (varias zonas mezcladas, parches, charcos, detalles dispersos), sin tonos rojizos saturados que oculten la sangre.
- Ambientación de la era: props de época abundantes y coherentes, emisivos y ≤10 luces locales para la noche.
- Presupuesto: ≤ ~250 llamadas de dibujo, ≤ ~400 colisionadores. Precarga los materiales que uses (`kit.precargar` / `materiales.precargar`).
- Al cargar, la validación del gestor no debe dar avisos (apariciones conectadas, paso de jefes, inicios libres).

## Verificación
Página `pruebas/mapa-<id>.html` (copia el patrón de `pruebas/escenarios.html`) y capturas **≤ 960×540** (las mayores fallan con el
render por software; usa 640×360 si se cuelga y una captura a la vez). Captura: vista de juego en varios puntos, vista alta completa,
`?depurar=colision`, y de día (hora 0.25) y de noche (0.75). **Mira cada imagen** y repite hasta que el mapa parezca un escenario de
juego comercial: rico, coherente, bien iluminado y legible. Comprueba también con `?auto=1&dia=<primer día de tu era>` en la página
principal (`http://127.0.0.1:5173/?auto=1&dia=N&sinui=1`) que el juego carga tu mapa y aparecen zombis sin errores.

Termina con el informe breve de AGENTES.md (incluye la validación del gestor: avisos, colisionadores, mallas).
