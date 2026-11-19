import { crearMuscleCar } from './muscle_car.js';
import { crearCaballo } from './caballo.js';
import { crearLocomovil } from './locomovil.js';
import { crearAutoblindado } from './autoblindado.js';
import { crearBlindado } from './blindado_tactico.js';
import { crearAerodeslizador } from './aerodeslizador.js';
export const MODELOS = {
  caballo: crearCaballo, locomovil: crearLocomovil, autoblindado: crearAutoblindado,
  muscle_car: crearMuscleCar, blindado_tactico: crearBlindado, aerodeslizador: crearAerodeslizador,
};
