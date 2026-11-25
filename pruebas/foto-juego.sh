#!/bin/bash
# Foto estándar de una partida real para revisiones visuales.
# Uso: pruebas/foto-juego.sh <dia> <salida.png> [rol] [segundos] [extra-url]
#   Juega <segundos> (por defecto 16) con el bot en modo pasivo (la horda se acerca, el jugador es inmortal),
#   deja correr el bucle real ~8 s sin dibujar (animaciones de la interfaz), lo detiene, pinta un cuadro final y captura a 1280×720 con la interfaz. Añade "&sinui=1" en extra-url para la escena sola
#   y "&hora=0.25" o similares si el director lo permite. Tarda 1–3 min con el render por software.
dia=${1:-1}; salida=${2:-pruebas/capturas/foto.png}; rol=${3:-soldado}; seg=${4:-16}; extra=${5:-}
cd "$(dirname "$0")/.." || exit 1
node pruebas/captura.mjs "http://127.0.0.1:5173/?auto=1&dia=$dia&rol=$rol&calidad=alta&dios=1&semilla=11$extra" "$salida" \
  --ancho 1280 --alto 720 --espera 15000 \
  --eval "import('/pruebas/bot.js').then(m=>m.correr({segundos:$seg, foto:true, pasivo:true})).then(r=>new Promise(ok=>{const R=juego.render.renderer, dib=R.render; R.render=()=>{}; setTimeout(()=>{juego.detener(); R.render=dib; setTimeout(()=>{juego.avanzar(1/30); R.getContext().finish(); ok({zombisVivos:r.zombisVivos, hora:+juego.render.hora.toFixed(3), errores:r.errores})},1500)},8000)}))" \
  --tras 1500
