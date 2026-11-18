// Sistema de vehículos de ERA Z. API: §Vehículos de docs/ARQUITECTURA.md.
// Añadido: vehiculos.restos (calcinados), vehiculo.mando (control externo), vehiculo.piloto(v, dt) (IA/pruebas), VEHICULOS (datos).
import { VEHICULOS } from './datos.js';
import { Vehiculo } from './vehiculo.js';

export { VEHICULOS };

export function crearVehiculos(juego) {
  const lista = [], restos = [];
  const api = {
    lista, restos, VEHICULOS,
    crear(vehiculoId, opciones = {}) {
      const def = VEHICULOS[vehiculoId];
      if (!def) { console.warn('[vehiculos] id desconocido', vehiculoId); return null; }
      const v = new Vehiculo(api, def, opciones);
      lista.push(v);
      return v;
    },
    limpiar() {
      for (const v of lista) v.liberar();
      for (const v of restos) v.liberar();
      lista.length = 0; restos.length = 0;
    },
    actualizar(dt) { for (let i = 0; i < lista.length; i++) { try { lista[i].actualizar(dt); } catch (e) { console.error('[vehiculos]', e); } } },
    posFisica(dt) {
      for (let i = 0; i < lista.length; i++) { try { lista[i].posFisica(dt); } catch (e) { console.error('[vehiculos]', e); } }
      for (let i = 0; i < restos.length; i++) { try { restos[i].posFisica(dt); } catch (e) { console.error('[vehiculos]', e); } }
    },
    juego,
  };
  return api;
}
