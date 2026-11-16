# Instrucciones comunes para los subagentes de ERA Z

Formas parte de un equipo de agentes que construye **ERA Z**, un juego original de supervivencia por oleadas contra zombis
(1800 → 2100) en Three.js y en español. El proyecto está en `/home/user/zombies`. Varios agentes trabajan **a la vez** en
módulos distintos sobre el mismo disco.

## Antes de escribir código
1. Lee **`docs/ARQUITECTURA.md`** entero (contrato y reglas generales; son obligatorias).
2. Lee **`docs/DISENO.md`** y **`docs/ARTE.md`**.
3. Lee los archivos de `src/datos/` y de `src/nucleo/` que te afecten, y el archivo provisional que vas a sustituir.

## Reglas
- **Edita solo los archivos de tu módulo** (los indica tu encargo). Puedes crear los que necesites dentro de tus carpetas y tu página de prueba en `pruebas/`.
- Conserva exactamente las firmas del contrato. Puedes **añadir** API; documenta lo añadido en tu informe.
- Otros módulos pueden ser aún provisionales (no hacen nada) o estar a medio escribir: llama a otros sistemas con encadenamiento opcional y no dependas de que funcionen para probar lo tuyo.
- No toques git. No instales paquetes. No lances otro servidor: usa `http://127.0.0.1:5173/`.
- Todo procedural, sin recursos externos, sin red. Texto visible en español correcto.
- Obra original: no imites ningún juego existente.

## Listón de calidad
El cliente exige acabado **AAA**: «absolutamente perfecto, visualmente impresionante, cada detalle perfeccionado, desde las texturas
hasta la física». Después de ti, un **revisor muy exigente** juzgará tu trabajo con capturas de pantalla y lo rechazará si parece
un prototipo. No entregues lo primero que funcione: itera. Prefiere menos elementos impecables a muchos mediocres, pero
cubre todo tu encargo.

## Verificación (obligatoria)
- Página de prueba propia `pruebas/<modulo>.html` + `.js` (patrón en `pruebas/ejemplo.js`, arnés en `pruebas/arnes.js`).
- Captura: `node pruebas/captura.mjs <url> pruebas/capturas/<nombre>.png [--eval "js"] [--espera ms] [--ancho 1600 --alto 900]`
  y **mira la imagen** (herramienta Read). Repite hasta que no haya errores de consola y el resultado sea excelente.
  Capturas de 1280×720 o menores cargan más rápido; usa primeros planos para juzgar el detalle y planos a distancia de juego (cámara a ~25 m) para juzgar la legibilidad.
- El render por software va a 1–5 fps: es normal. Para juzgar animación, captura series (`--serie 6 --intervalo 300`) o avanza el tiempo a mano con `--eval`.
- Antes de terminar: `cd /home/user/zombies && npx vite build 2>&1 | tail -15` debe compilar (si falla por un archivo ajeno, indícalo y sigue).

## Informe final (breve, máx. ~250 palabras)
Tu respuesta final la lee el orquestador, no el usuario. Incluye solo: archivos creados, API añadida fuera del contrato,
qué verificaste y con qué capturas (rutas), y **carencias conocidas honestas** (lo que no terminaste o no pudiste comprobar).
Sin adornos.
