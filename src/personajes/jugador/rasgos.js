// Complexión, rostro y paleta por rol. Las medidas están en metros para un cuerpo base de ~1,83 m.
export const RASGOS = {
  soldado: {
    esc: 1.0, w: 1.0, hom: 1.0, cab: 1.1, piel: 0xc99572, pelo: 0x3a2a1c, peloEstilo: 'corto', mand: 1.05, nariz: 1.0, ceja: 1.0,
    barba: null, ojo: 0x2a3a4a, boca: 0x8a4a3e, cicatriz: false,
  },
  medico: {
    esc: 0.96, w: 0.88, hom: 0.9, cab: 1.1, piel: 0xe2b595, pelo: 0x7a3418, peloEstilo: 'cola', mand: 0.82, nariz: 0.85, ceja: 0.8,
    barba: null, ojo: 0x3e6a4e, boca: 0xa85a52, cicatriz: false,
  },
  ingeniero: {
    esc: 0.98, w: 1.04, hom: 1.0, cab: 1.12, piel: 0xa9755a, pelo: 0x231c16, peloEstilo: 'revuelto', mand: 1.0, nariz: 1.15, ceja: 1.15,
    barba: 'bigote', ojo: 0x3a2c20, boca: 0x7a4034, cicatriz: false, barriga: 0.03,
  },
  cazador: {
    esc: 1.02, w: 0.84, hom: 0.86, cab: 1.08, piel: 0xd8a888, pelo: 0x1a1a22, peloEstilo: 'trenza', mand: 0.78, nariz: 0.8, ceja: 0.9,
    barba: null, ojo: 0x6a5a8a, boca: 0x9a4a56, cicatriz: false,
  },
  demoledor: {
    esc: 1.07, w: 1.3, hom: 1.08, cab: 1.12, piel: 0x8d5b41, pelo: 0x14100c, peloEstilo: 'calvo', mand: 1.35, nariz: 1.2, ceja: 1.5,
    barba: 'espesa', ojo: 0x2a1c14, boca: 0x6a3a2e, cicatriz: true,
  },
};
export const hex = (s) => parseInt(String(s).replace('#', ''), 16);
