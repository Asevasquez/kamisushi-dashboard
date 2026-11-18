// Cálculos del módulo Estado de Resultados.
// Las fórmulas replican la Hoja3 del Excel consolidado:
//   GP %  = Compras / (Ventas totales − Ventas agua − Despachos)
//   GPI % = Indirectos / (Ventas totales − Despachos)
//   ADM % = Adm. y ventas / (Ventas totales − Despachos)
//   REM % = Remuneraciones / (Ventas totales − Ventas agua)
//   MG    = concepto "Margen Neto" de la sección Resumen (planilla de cada local)
//   MG %  = MG / Ventas totales
//   Otros = (Ventas − Compras − Indirectos − Adm. − Remuneraciones) − MG
//           diferencia entre el margen calculado por secciones y el Margen Neto informado

export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
export const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

// Umbrales de alerta (sobre el ratio del período actual)
export const UMBRALES = { gp: 0.38, rem: 0.28, adm: 0.22 };
export const SEMAFORO_MG = { bueno: 0.15, regular: 0.08 };

export const anioDe = (p) => Math.floor(p / 100);
export const mesDe = (p) => p % 100;

export const sumarMeses = (p, n) => {
  const total = anioDe(p) * 12 + (mesDe(p) - 1) + n;
  return Math.floor(total / 12) * 100 + (total % 12) + 1;
};

export const nombrePeriodo = (p) => `${MESES[mesDe(p) - 1]} ${anioDe(p)}`;
export const nombreCorto = (p) => `${MESES_CORTOS[mesDe(p) - 1]} ${String(anioDe(p)).slice(2)}`;

export const nombreRango = (r) => (r.desde === r.hasta
  ? nombrePeriodo(r.hasta)
  : `${nombreCorto(r.desde)} – ${nombreCorto(r.hasta)}`);

export const MODOS = [
  { id: 'mes', label: 'Mes anterior' },
  { id: 'anio', label: 'Mismo mes año anterior' },
  { id: 'trimestre', label: 'Trimestre vs trimestre' },
  { id: 'ytd', label: 'Año a la fecha' },
  { id: 'personalizado', label: 'Personalizado' },
];

// Devuelve los rangos A (actual) y B (comparación) según el modo elegido
export function calcularRangos(modo, periodo, periodoComparacion) {
  switch (modo) {
    case 'anio':
      return { a: { desde: periodo, hasta: periodo }, b: { desde: sumarMeses(periodo, -12), hasta: sumarMeses(periodo, -12) } };
    case 'trimestre':
      return { a: { desde: sumarMeses(periodo, -2), hasta: periodo }, b: { desde: sumarMeses(periodo, -5), hasta: sumarMeses(periodo, -3) } };
    case 'ytd': {
      const inicio = anioDe(periodo) * 100 + 1;
      return { a: { desde: inicio, hasta: periodo }, b: { desde: sumarMeses(inicio, -12), hasta: sumarMeses(periodo, -12) } };
    }
    case 'personalizado': {
      const q = periodoComparacion || sumarMeses(periodo, -1);
      return { a: { desde: periodo, hasta: periodo }, b: { desde: q, hasta: q } };
    }
    default:
      return { a: { desde: periodo, hasta: periodo }, b: { desde: sumarMeses(periodo, -1), hasta: sumarMeses(periodo, -1) } };
  }
}

const CAMPOS = ['ventasTotales', 'ventasAgua', 'despachos', 'compras', 'gpi', 'adm', 'rem', 'margenNeto'];
const vacio = () => Object.fromEntries(CAMPOS.map((c) => [c, 0]));

const div = (a, b) => (b ? a / b : null);

export function conRatios(t) {
  const vt = t.ventasTotales;
  const mg = t.margenNeto;
  const otros = vt - t.compras - t.gpi - t.adm - t.rem - mg;
  return {
    ...t,
    mg,
    otros,
    gpPct: div(t.compras, vt - t.ventasAgua - t.despachos),
    gpiPct: div(t.gpi, vt - t.despachos),
    admPct: div(t.adm, vt - t.despachos),
    remPct: div(t.rem, vt - t.ventasAgua),
    mgPct: div(mg, vt),
  };
}

// Suma las filas (local-mes) dentro del rango y de los locales indicados
export function totalizar(filas, rango, sucursales) {
  const t = vacio();
  for (const f of filas) {
    if (f.periodo < rango.desde || f.periodo > rango.hasta) continue;
    if (sucursales && !sucursales.has(f.sucursal)) continue;
    for (const c of CAMPOS) t[c] += f[c] || 0;
  }
  return conRatios(t);
}

export function totalesPor(filas, rango, sucursales, clave) {
  const m = new Map();
  for (const f of filas) {
    if (f.periodo < rango.desde || f.periodo > rango.hasta) continue;
    if (sucursales && !sucursales.has(f.sucursal)) continue;
    const k = f[clave];
    if (!m.has(k)) m.set(k, vacio());
    const t = m.get(k);
    for (const c of CAMPOS) t[c] += f[c] || 0;
  }
  return new Map([...m.entries()].map(([k, t]) => [k, conRatios(t)]));
}

export function serieMensual(filas, hasta, meses, sucursales) {
  const out = [];
  for (let i = meses - 1; i >= 0; i--) {
    const p = sumarMeses(hasta, -i);
    out.push({ periodo: p, ...totalizar(filas, { desde: p, hasta: p }, sucursales) });
  }
  return out;
}

export const variacion = (a, b) => (b ? a / b - 1 : null);
export const deltaPp = (a, b) => (a == null || b == null ? null : (a - b) * 100);

// ---------- formato (es-CL) ----------
const nf1 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const nf0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });

export const fmtMM = (v) => (v == null ? '—' : `$${nf1.format(v / 1e6)} M`);
export const fmtM = (v) => (v == null ? '—' : nf1.format(v / 1e6));
export const fmtPct = (v) => (v == null ? '—' : `${nf1.format(v * 100)}%`);
export const fmtNum = (v) => (v == null ? '—' : nf0.format(v));
export const fmtSigno = (v, sufijo = '') => {
  if (v == null || !Number.isFinite(v)) return '—';
  const s = v > 0 ? '+' : v < 0 ? '−' : '';
  return `${s}${nf1.format(Math.abs(v))}${sufijo}`;
};
export const fmtVar = (v) => (v == null ? '—' : fmtSigno(v * 100, '%'));
export const fmtPp = (v) => fmtSigno(v, ' pp');
