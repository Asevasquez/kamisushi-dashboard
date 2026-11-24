// Cálculos y formatos del módulo Ventas Diarias.
// Las fechas viajan como número AAAAMMDD (ej. 20261118) y los meses como AAAAMM (ej. 202611).
//
// Qué trae cada fila (un local en un día): venta del día, acumulado del mes, ticket promedio, GP % y pedidos, cada uno
// con su valor de comparación según las fechas que indica el propio Excel. Los pedidos y el ticket son ACUMULADOS
// DEL MES (el Excel no los trae por día).
//   Ticket promedio = acumulado del mes ÷ pedidos del mes (ponderado)
//   GP %            = promedio ponderado por el acumulado del mes, sin los locales nuevos

export const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

// ---------- fechas ----------
export const anioDe = (f) => Math.floor(f / 10000);
export const mesDe = (f) => Math.floor((f % 10000) / 100);
export const diaDe = (f) => f % 100;
export const aFecha = (d) => d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate();
export const aDate = (f) => new Date(Date.UTC(anioDe(f), mesDe(f) - 1, diaDe(f)));
export const sumarDias = (f, n) => { const d = aDate(f); d.setUTCDate(d.getUTCDate() + n); return aFecha(d); };
export const diasEntre = (a, b) => Math.round((aDate(b) - aDate(a)) / 86400000);
export const diaSemana = (f) => DIAS[aDate(f).getUTCDay()];
const dd = (n) => String(n).padStart(2, '0');
export const fechaTexto = (f) => `${dd(diaDe(f))}-${dd(mesDe(f))}-${anioDe(f)}`;                          // 18-11-2026
export const fechaLarga = (f) => `${diaSemana(f)} ${fechaTexto(f)}`;                                        // miércoles 18-11-2026
export const fechaCorta = (f) => `${diaDe(f)}/${mesDe(f)}`;                                                  // 18/11
export const fechaDiaMes = (f) => `${diaSemana(f).slice(0, 3)} ${dd(diaDe(f))}-${MESES[mesDe(f) - 1].slice(0, 3)}`; // mié 18-nov
export const nombreMes = (m) => `${MESES[(m % 100) - 1]} ${Math.floor(m / 100)}`;                            // noviembre 2026
export const nombreMesCorto = (m) => MESES[(m % 100) - 1];                                                  // noviembre
export const mesDeFecha = (f) => Math.floor(f / 100);

// ---------- números ----------
const nf0 = new Intl.NumberFormat('es-CL', { maximumFractionDigits: 0 });
const nf1 = new Intl.NumberFormat('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
export const fmtNum = (v) => (v == null || !Number.isFinite(v) ? '—' : nf0.format(v));
export const fmtPesos = (v) => (v == null || !Number.isFinite(v) ? '—' : `$${nf0.format(v)}`);
export const fmtMM = (v) => (v == null || !Number.isFinite(v) ? '—' : `$${nf1.format(v / 1e6)} M`);
export const fmtPct = (v) => (v == null || !Number.isFinite(v) ? '—' : `${nf1.format(v * 100)}%`);
export const fmtVar = (v) => {
  if (v == null || !Number.isFinite(v)) return '—';
  const x = v * 100;
  const s = x > 0 && nf1.format(x) !== '0,0' ? '+' : x < 0 && nf1.format(-x) !== '0,0' ? '−' : '';
  return `${s}${nf1.format(Math.abs(x))}%`;
};
export const fmtVarEntera = (v) => {
  if (v == null || !Number.isFinite(v)) return '—';
  const x = Math.round(v * 100);
  return `${x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x)}%`;
};

export const variacion = (a, b) => (b ? a / b - 1 : null);

// ---------- totales ----------
// Una fila "comparable" es la de un local que ya existía en la fecha de comparación
export const comparable = (f) => !f.nuevo && f.ventaDiaComp > 0;

export function totalizar(filas) {
  const t = { ventaDia: 0, ventaDiaComp: 0, acumMes: 0, acumMesComp: 0, pedidos: 0, pedidosComp: 0, locales: filas.length, nuevos: 0 };
  let gpPeso = 0; let gpSuma = 0; let gpN = 0;
  for (const f of filas) {
    t.ventaDia += f.ventaDia || 0; t.ventaDiaComp += f.ventaDiaComp || 0;
    t.acumMes += f.acumMes || 0; t.acumMesComp += f.acumMesComp || 0;
    t.pedidos += f.pedidos || 0; t.pedidosComp += f.pedidosComp || 0;
    if (f.nuevo) { t.nuevos++; continue; }
    if (f.gp != null && f.acumMes > 0) { gpSuma += f.gp * f.acumMes; gpPeso += f.acumMes; gpN++; }
  }
  t.ticket = t.pedidos ? t.acumMes / t.pedidos : null;
  t.ticketComp = t.pedidosComp ? t.acumMesComp / t.pedidosComp : null;
  t.gp = gpPeso ? gpSuma / gpPeso : null;
  t.gpLocales = gpN;
  t.varDia = variacion(t.ventaDia, t.ventaDiaComp);
  t.varAcum = variacion(t.acumMes, t.acumMesComp);
  t.varTicket = t.ticket != null && t.ticketComp ? t.ticket / t.ticketComp - 1 : null;
  t.varPedidos = variacion(t.pedidos, t.pedidosComp);
  return t;
}

export function totalesPorDivision(filas) {
  const m = new Map();
  for (const f of filas) { const k = f.division || 'SIN DIVISIÓN'; if (!m.has(k)) m.set(k, []); m.get(k).push(f); }
  return [...m.entries()].map(([division, fs]) => ({ division, ...totalizar(fs) })).sort((a, b) => b.ventaDia - a.ventaDia);
}

// Mayores subas y bajas del día (solo locales comparables)
export function rankingDia(filas) {
  const c = filas.filter(comparable).map((f) => ({ ...f, varDia: f.ventaDia / f.ventaDiaComp - 1 }));
  const orden = [...c].sort((a, b) => b.varDia - a.varDia);
  return { subas: orden.slice(0, 5), bajas: orden.slice(-5).reverse(), conAlza: c.filter((f) => f.varDia > 0).length, conBaja: c.filter((f) => f.varDia < 0).length, comparables: c.length };
}

// Fila lista para mostrar en la tabla "Por local" (variaciones calculadas, no las del Excel)
export const conVariaciones = (f) => ({
  ...f,
  varDia: f.ventaDiaComp > 0 ? f.ventaDia / f.ventaDiaComp - 1 : null,
  varAcum: f.acumMesComp > 0 ? f.acumMes / f.acumMesComp - 1 : null,
  varTicket: f.ticketComp ? (f.ticket ?? 0) / f.ticketComp - 1 : null,
  varPedidos: f.pedidosComp > 0 ? f.pedidos / f.pedidosComp - 1 : null,
  gpRevisar: f.gp != null && (f.gp < 0.1 || f.gp > 1),
});

export const ORDENES = [
  { id: 'varAcumAsc', label: 'Var. acumulada · peores primero', cmp: (a, b) => (a.varAcum ?? Infinity) - (b.varAcum ?? Infinity) },
  { id: 'varAcumDesc', label: 'Var. acumulada · mejores primero', cmp: (a, b) => (b.varAcum ?? -Infinity) - (a.varAcum ?? -Infinity) },
  { id: 'ventaDesc', label: 'Venta del día · mayor a menor', cmp: (a, b) => b.ventaDia - a.ventaDia },
  { id: 'varDiaAsc', label: 'Variación del día · peores primero', cmp: (a, b) => (a.varDia ?? Infinity) - (b.varDia ?? Infinity) },
  { id: 'nombre', label: 'Local · A–Z', cmp: (a, b) => a.sucursal.localeCompare(b.sucursal, 'es') },
];

// ---------- series diarias ----------
// puntos: [{ sucursal, division, fecha, origen, ventaDia }] → [{ fecha, ventaDia, origen, locales }] ordenado
export function totalesPorFecha(puntos) {
  const m = new Map();
  for (const p of puntos) {
    const e = m.get(p.fecha) || { fecha: p.fecha, ventaDia: 0, locales: 0, archivo: 0 };
    e.ventaDia += p.ventaDia || 0; e.locales++; if (p.origen === 'archivo') e.archivo++;
    m.set(p.fecha, e);
  }
  return [...m.values()].map((e) => ({ ...e, origen: e.archivo > 0 ? 'archivo' : 'comparacion' })).sort((a, b) => a.fecha - b.fecha);
}

// Ventana de N días corridos terminando en `hasta`; los días sin datos quedan con valor null
export function ventana(totales, hasta, dias) {
  const porFecha = new Map(totales.map((t) => [t.fecha, t]));
  const out = [];
  for (let i = dias - 1; i >= 0; i--) {
    const f = sumarDias(hasta, -i);
    const t = porFecha.get(f);
    out.push({ fecha: f, ventaDia: t ? t.ventaDia : null, origen: t ? t.origen : null });
  }
  return out;
}

// ---------- calendario de cargas ----------
// Días del mes con su estado: 'cargado' | 'falta' | 'antes' (anterior a la primera carga del mes) | 'futuro'.
// `hasta` es el último día cargado. Un día solo "falta" si queda entre la primera carga del mes y la última.
export function calendarioMes(mes, fechasCargadas, hasta) {
  const anio = Math.floor(mes / 100); const m = mes % 100;
  const total = new Date(Date.UTC(anio, m, 0)).getUTCDate();
  const cargadas = new Set(fechasCargadas);
  const delMes = fechasCargadas.filter((f) => Math.floor(f / 100) === mes);
  const primera = delMes.length ? Math.min(...delMes) : null;
  const primero = new Date(Date.UTC(anio, m - 1, 1)).getUTCDay(); // 0 = domingo
  const huecos = (primero + 6) % 7; // semana que empieza en lunes
  const dias = [];
  for (let d = 1; d <= total; d++) {
    const f = anio * 10000 + m * 100 + d;
    let estado;
    if (cargadas.has(f)) estado = 'cargado';
    else if (f > hasta) estado = 'futuro';
    else if (primera == null || f < primera) estado = 'antes';
    else estado = 'falta';
    dias.push({ dia: d, fecha: f, estado });
  }
  return { huecos, dias, faltan: dias.filter((x) => x.estado === 'falta') };
}
