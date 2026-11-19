#!/bin/bash
# Foto estándar de una partida real para revisiones visuales.
# Uso: pruebas/foto-juego.sh <dia> <salida.png> [rol] [segundos] [extra-url]
#   Juega <segundos> (por defecto 16) con el bot en modo pasivo (la horda se acerca, el jugador es inmortal),
#   pinta un cuadro y captura a 1280×720 con la interfaz. Añade "&sinui=1" en extra-url para la escena sola
#   y "&hora=0.25" o similares si el director lo permite. Tarda 1–3 min con el render por software.
dia=${1:-1}; salida=${2:-pruebas/capturas/foto.png}; rol=${3:-soldado}; seg=${4:-16}; extra=${5:-}
cd "$(dirname "$0")/.." || exit 1
node pruebas/captura.mjs "http://127.0.0.1:5173/?auto=1&dia=$dia&rol=$rol&calidad=alta&dios=1&semilla=11$extra" "$salida" \
  --ancho 1280 --alto 720 --espera 15000 \
  --eval "import('/pruebas/bot.js').then(m=>m.correr({segundos:$seg, foto:true, pasivo:true, cuadrosFoto:4})).then(r=>({zombisVivos:r.zombisVivos, errores:r.errores}))" \
  --tras 9000
