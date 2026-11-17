// Ensambla el catálogo completo.
import suelos from './suelos.js';
import muros from './muros.js';
import cubiertas from './cubiertas.js';
import metales from './metales.js';
import otros from './otros.js';
export const CATALOGO = [...suelos, ...muros, ...cubiertas, ...metales, ...otros];
