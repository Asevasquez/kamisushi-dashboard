import React, { useState, useEffect, useMemo, useRef, useContext, createContext, useCallback } from 'react';
import {
  Box, Paper, Typography, Tabs, Tab, Button, IconButton, Tooltip, Alert, Chip, CircularProgress, FormControl, InputLabel,
  Select, MenuItem, TextField, Autocomplete, Checkbox, createFilterOptions, Popper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, FormControlLabel, Radio, RadioGroup, LinearProgress, ToggleButton, ToggleButtonGroup, useTheme,
} from '@mui/material';
import {
  CloudUpload as UploadIcon, Refresh as RefreshIcon, ArrowBack as BackIcon, FileDownload as DownloadIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  diaSemana, fechaTexto, fechaLarga, fechaCorta, fechaDiaMes, nombreMes, nombreMesCorto, sumarDias, mesDeFecha,
  fmtNum, fmtPesos, fmtMM, fmtPct, fmtVar, fmtVarEntera, variacion,
  totalizar, totalesPorDivision, rankingDia, conVariaciones, ORDENES, totalesPorFecha, ventana, calendarioMes,
} from '../utils/ventasDiarias';

const ROJO = '#d90000';
const ROLES_CARGAR = ['master', 'gerencia'];

// =====================================================================================
//  Colores y piezas visuales (mismo formato que Estado de Resultados)
// =====================================================================================
function useColores() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return {
    dark,
    bueno: dark ? '#4ade80' : '#0b6b50',
    buenoBg: dark ? 'rgba(74,222,128,0.14)' : '#e6f4ee',
    malo: dark ? '#f87171' : '#a3261b',
    maloBg: dark ? 'rgba(248,113,113,0.14)' : '#fdecea',
    ambar: dark ? 'rgba(251,191,36,0.16)' : '#fff4dc',
    ambarTx: dark ? '#fbbf24' : '#7a4700',
    texto: theme.palette.text.primary,
    suave: theme.palette.text.secondary,
    linea: theme.palette.divider,
    barra: dark ? '#3d3d3d' : '#e5e7eb',
    barraSel: dark ? '#f87171' : '#d90000',
    barraOtro: dark ? '#6b2f2f' : '#efb3b3',
    barraComp: dark ? '#8b8f97' : '#9ca3af',
    barraDato: dark ? '#4b4f57' : '#d1d5db',
    fila: dark ? 'rgba(255,255,255,0.04)' : '#fafbfc',
    cabecera: dark ? '#262626' : '#fafafa',
    grilla: dark ? '#2d2d2d' : '#eceff1',
  };
}

// ¿El cambio es favorable? (aquí siempre "sube = bueno")
function Delta({ valor, texto }) {
  const c = useColores();
  if (valor == null || !Number.isFinite(valor) || texto === '0,0%') {
    return <Typography component="span" variant="caption" sx={{ color: c.suave }}>{texto || '—'}</Typography>;
  }
  const ok = valor > 0;
  return (
    <Box component="span" sx={{
      fontSize: 12, fontWeight: 700, px: 1, py: 0.25, borderRadius: 5, whiteSpace: 'nowrap', display: 'inline-block',
      color: ok ? c.bueno : c.malo, bgcolor: ok ? c.buenoBg : c.maloBg,
    }}>
      {valor > 0 ? '▲' : '▼'} {texto.replace(/^[+−]/, '')}
    </Box>
  );
}

const Panel = ({ children, sx, ...resto }) => (
  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, minWidth: 0, ...sx }} {...resto}>{children}</Paper>
);

const Titulo = ({ children, extra }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
    <Typography component="h3" variant="subtitle1" fontWeight={700}>{children}</Typography>
    {extra}
  </Box>
);

function Kpi({ titulo, valor, delta, deltaTexto, vs, nota }) {
  return (
    <Panel sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{titulo}</Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{valor}</Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        {deltaTexto != null ? <Delta valor={delta} texto={deltaTexto} /> : <Typography variant="caption" color="text.secondary">sin comparación</Typography>}
        {vs && <Typography variant="caption" color="text.secondary">vs {vs}</Typography>}
      </Box>
      {nota && <Typography variant="caption" color="text.secondary">{nota}</Typography>}
    </Panel>
  );
}

const GridKpi = ({ children }) => (
  <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.75 }}>{children}</Box>
);
const Fila2 = ({ izq, der }) => (
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.75, alignItems: 'stretch' }}>
    <Box sx={{ flex: '2 1 480px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>{izq}</Box>
    <Box sx={{ flex: '1 1 300px', minWidth: 0, display: 'flex', flexDirection: 'column' }}>{der}</Box>
  </Box>
);

function Leyenda({ items }) {
  const c = useColores();
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', fontSize: 12, color: c.suave, mt: 1 }}>
      {items.map(([color, texto]) => (
        <Box key={texto} sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: color }} />{texto}
        </Box>
      ))}
    </Box>
  );
}

// =====================================================================================
//  Gráfico de barras: venta de cada día
// =====================================================================================
function GraficoBarras({ puntos, sel, comp, alto = 250 }) {
  const c = useColores();
  const W = 700; const H = alto; const ml = 46; const mb = 34; const mt = 16;
  const valores = puntos.map((p) => p.ventaDia).filter((v) => v != null);
  if (!valores.length) return <Typography variant="body2" color="text.secondary" sx={{ py: 4, textAlign: 'center' }}>Aún no hay días con datos en este período.</Typography>;
  const mx = Math.max(...valores) * 1.12;
  const bw = (W - ml - 10) / puntos.length;
  const etq = (v) => `${(v / 1e6).toLocaleString('es-CL', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`;
  const resumen = `Venta de cada uno de los últimos ${puntos.length} días; ${valores.length} con datos. Máximo ${etq(Math.max(...valores))}.`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={resumen} style={{ display: 'block' }}>
      {[0, 1, 2, 3, 4].map((k) => {
        const y = mt + (H - mt - mb) * (1 - k / 4);
        return (
          <g key={k}>
            <line x1={ml} y1={y} x2={W - 6} y2={y} stroke={c.grilla} strokeWidth="1" />
            <text x={ml - 6} y={y + 4} fontSize="11" textAnchor="end" fill={c.suave}>{etq((mx * k) / 4)}</text>
          </g>
        );
      })}
      {puntos.map((p, i) => {
        const x = ml + i * bw + bw * 0.14; const w = bw * 0.72;
        const esSel = p.fecha === sel; const esComp = p.fecha === comp;
        const h = p.ventaDia == null ? 0 : ((H - mt - mb) * p.ventaDia) / mx;
        const color = esSel ? c.barraSel : esComp ? c.barraComp : p.origen === 'comparacion' ? c.barraDato : c.barraOtro;
        return (
          <g key={p.fecha}>
            {p.ventaDia != null && <rect x={x} y={H - mb - h} width={w} height={h} rx="2" fill={color}><title>{`${fechaLarga(p.fecha)}: ${etq(p.ventaDia)}`}</title></rect>}
            {(i % 5 === 0 || esSel || esComp) && <text x={x + w / 2} y={H - mb + 16} fontSize="11" textAnchor="middle" fill={c.suave}>{fechaCorta(p.fecha)}</text>}
            {(esSel || esComp) && p.ventaDia != null && <text x={x + w / 2} y={H - mb - h - 5} fontSize="11" fontWeight="700" textAnchor="middle" fill={c.texto}>{etq(p.ventaDia)}</text>}
          </g>
        );
      })}
    </svg>
  );
}

// =====================================================================================
//  Filtro de locales: selección múltiple con buscador (igual que en Revisiones)
// =====================================================================================
const CtxLocales = createContext(null);
const sinTildes = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const filtrarLocales = createFilterOptions({ ignoreAccents: true, stringify: (l) => l });

function resaltar(nombre, texto) {
  const buscado = sinTildes(texto).trim();
  if (!buscado) return nombre;
  const i = sinTildes(nombre).indexOf(buscado);
  if (i < 0) return nombre;
  return <>{nombre.slice(0, i)}<strong>{nombre.slice(i, i + buscado.length)}</strong>{nombre.slice(i + buscado.length)}</>;
}

function PopperLocales(props) {
  return <Popper {...props} placement="bottom-start" style={{ ...props.style, width: 'fit-content', minWidth: 'min(340px, 92vw)', maxWidth: '92vw' }} />;
}

const PaperLocales = React.forwardRef(function PaperLocales({ children, ...props }, ref) {
  const ctx = useContext(CtxLocales);
  if (!ctx) return <Paper ref={ref} {...props}>{children}</Paper>;
  const visibles = ctx.visiblesRef.current || [];
  const elegidos = new Set(ctx.value);
  const faltan = visibles.filter((l) => !elegidos.has(l));
  const sinPerderFoco = (e) => e.preventDefault();
  return (
    <Paper ref={ref} {...props}>
      <Box onMouseDown={sinPerderFoco} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, px: 1.75, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">{visibles.length} de {ctx.total} locales</Typography>
        <Button size="small" disabled={faltan.length === 0} onClick={() => ctx.agregar(faltan)} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>
          {visibles.length === ctx.total ? 'Seleccionar todos' : `Seleccionar los ${visibles.length} resultados`}
        </Button>
      </Box>
      {children}
      <Box onMouseDown={sinPerderFoco} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 0.5, px: 1.75, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
        <Typography variant="caption" color="text.secondary">
          {ctx.value.length === 0 ? 'Ningún local elegido: se muestran todos' : `${ctx.value.length} ${ctx.value.length === 1 ? 'local elegido' : 'locales elegidos'}`}
        </Typography>
        <Button size="small" disabled={ctx.value.length === 0} onClick={ctx.limpiar} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Limpiar selección</Button>
      </Box>
    </Paper>
  );
});

function FiltroLocales({ locales, value, onChange }) {
  const visiblesRef = useRef(locales);
  const [texto, setTexto] = useState('');
  const ctx = {
    visiblesRef, value, total: locales.length,
    agregar: (lista) => onChange([...value, ...lista.filter((l) => !value.includes(l))]),
    limpiar: () => onChange([]),
  };
  return (
    <CtxLocales.Provider value={ctx}>
      <Autocomplete
        multiple disableCloseOnSelect fullWidth size="small" limitTags={2}
        options={locales} value={value}
        filterOptions={(opciones, estado) => { const r = filtrarLocales(opciones, estado); visiblesRef.current = r; return r; }}
        onChange={(_, v) => onChange(v)}
        inputValue={texto}
        onInputChange={(_, v, motivo) => { if (motivo === 'input') setTexto(v); else if (motivo === 'clear' || motivo === 'blur') setTexto(''); }}
        renderOption={(props, option, { selected }) => {
          const { key, ...resto } = props;
          return (
            <li key={key} {...resto}>
              <Checkbox size="small" checked={selected} sx={{ mr: 1, p: 0.5 }} tabIndex={-1} disableRipple />
              <Box sx={{ flex: 1, minWidth: 0, wordBreak: 'break-word' }}>{resaltar(option, texto)}</Box>
            </li>
          );
        }}
        renderInput={(params) => <TextField {...params} label="Locales" placeholder={value.length ? '' : 'Todos los locales'} />}
        slots={{ paper: PaperLocales, popper: PopperLocales }}
        noOptionsText="Ningún local coincide con lo escrito"
        clearText="Quitar todos los locales" openText="Abrir la lista de locales" closeText="Cerrar la lista"
        getLimitTagsText={(mas) => `+${mas}`}
      />
    </CtxLocales.Provider>
  );
}

// =====================================================================================
//  Página
// =====================================================================================
export default function VentasDiarias() {
  const { user } = useAuth();
  const c = useColores();
  const puedeCargar = ROLES_CARGAR.includes(user?.rol);

  const [meta, setMeta] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);
  const [tab, setTab] = useState(0);
  const [fecha, setFecha] = useState(null);
  const [datos, setDatos] = useState([]);
  const [serie, setSerie] = useState([]);
  const [divSel, setDivSel] = useState(null);       // Set de divisiones elegidas (null hasta que cargue meta)
  const [localesSel, setLocalesSel] = useState([]);
  const [localDetalle, setLocalDetalle] = useState(null);

  const cargarTodo = useCallback(async () => {
    setCargando(true); setError('');
    try {
      const { data: m } = await api.get('/ventas-diarias/meta');
      setMeta(m);
      setDivSel((prev) => prev || new Set(m.divisiones.map((d) => d.division)));
      if (!m.ultimaFecha) { setTab(3); setDatos([]); setSerie([]); return; }
      setFecha((prev) => (prev && m.fechas.some((f) => f.fecha === prev && f.origen === 'archivo') ? prev : m.ultimaFecha));
      const { data: s } = await api.get('/ventas-diarias/serie', { params: { desde: sumarDias(m.ultimaFecha, -90), hasta: m.ultimaFecha } });
      setSerie(s);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudieron cargar los datos de Ventas Diarias');
    } finally {
      setCargando(false);
    }
  }, []);
  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  useEffect(() => {
    if (!fecha) return undefined;
    let vivo = true;
    api.get('/ventas-diarias/datos', { params: { fecha } })
      .then((r) => { if (vivo) setDatos(r.data); })
      .catch((e) => { if (vivo) setError(e.response?.data?.message || 'No se pudo cargar el día'); });
    return () => { vivo = false; };
  }, [fecha]);

  const sinDatos = !meta?.ultimaFecha;
  const diasConExcel = useMemo(() => (meta?.fechas || []).filter((f) => f.origen === 'archivo').map((f) => f.fecha).sort((a, b) => b - a), [meta]);
  const todasLasDivisiones = meta?.divisiones || [];
  const todosLosLocales = useMemo(() => todasLasDivisiones.flatMap((d) => d.locales.map((l) => l.sucursal)).sort((a, b) => a.localeCompare(b, 'es')), [todasLasDivisiones]);

  const pasaFiltro = useCallback((f) => (!divSel || divSel.has(f.division || 'SIN DIVISIÓN')) && (localesSel.length === 0 || localesSel.includes(f.sucursal)), [divSel, localesSel]);
  const filas = useMemo(() => datos.filter(pasaFiltro), [datos, pasaFiltro]);
  const serieFiltrada = useMemo(() => serie.filter(pasaFiltro), [serie, pasaFiltro]);
  const fechaComp = datos[0]?.fechaComp;
  const mes = datos[0]?.mes;
  const mesComp = datos[0]?.mesComp;

  const toggleDivision = (nombre) => setDivSel((prev) => {
    const s = new Set(prev);
    if (s.has(nombre)) { if (s.size > 1) s.delete(nombre); } else s.add(nombre);
    return s;
  });

  const uc = meta?.ultimaCarga;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ---------- encabezado ---------- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Ventas Diarias</Typography>
          {uc && (
            <Typography variant="body2" color="text.secondary">
              {uc.archivo} · hoja «Por Local» · cargado {new Date(uc.createdAt).toLocaleDateString('es-CL')}
              {uc.usuarioNombre ? ` por ${uc.usuarioNombre}` : ''} · {fmtNum(uc.locales)} locales
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Recargar datos"><span><IconButton aria-label="Recargar datos" onClick={cargarTodo} disabled={cargando}><RefreshIcon /></IconButton></span></Tooltip>
          {puedeCargar && (
            <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setTab(3)}
              sx={{ bgcolor: ROJO, '&:hover': { bgcolor: '#b71c1c' }, fontWeight: 700, textTransform: 'none' }}>
              Cargar nuevo Excel
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => { setTab(v); if (v !== 1) setLocalDetalle(null); }} variant="scrollable" allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontSize: 14 },
          '& .Mui-selected': { color: `${c.dark ? '#ff8a80' : '#c20000'} !important`, fontWeight: 700 }, '& .MuiTabs-indicator': { bgcolor: ROJO, height: 3 } }}>
        <Tab label="Resumen" disabled={sinDatos} />
        <Tab label="Por local" disabled={sinDatos} />
        <Tab label="Tendencia" disabled={sinDatos} />
        <Tab label="Cargas" />
      </Tabs>

      {/* ---------- filtros ---------- */}
      {!sinDatos && tab !== 3 && fecha && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          {tab !== 2 && (
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel id="vd-dia">Día</InputLabel>
              <Select labelId="vd-dia" label="Día" value={fecha} onChange={(e) => { setFecha(e.target.value); setLocalDetalle(null); }}>
                {diasConExcel.map((f) => <MenuItem key={f} value={f}>{fechaLarga(f)}</MenuItem>)}
              </Select>
            </FormControl>
          )}
          {tab !== 2 && fechaComp && (
            <Box>
              <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>Comparación</Typography>
              <Typography variant="body2" sx={{ minHeight: 40, display: 'flex', alignItems: 'center' }}>
                {fechaLarga(fechaComp)} <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>(la que indica el Excel)</Typography>
              </Typography>
            </Box>
          )}
          <Box sx={{ flex: '1 1 260px' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>División</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {todasLasDivisiones.map((d) => {
                const sel = !divSel || divSel.has(d.division);
                return (
                  <Chip key={d.division} clickable aria-pressed={sel} onClick={() => toggleDivision(d.division)}
                    label={`${sel ? '✓ ' : ''}${d.division} · ${d.locales.length}`}
                    variant={sel ? 'filled' : 'outlined'}
                    sx={sel ? { fontWeight: 700, color: c.dark ? '#ffb4b4' : '#b00000', bgcolor: c.dark ? 'rgba(242,0,0,0.18)' : '#fff1f1', border: `1px solid ${ROJO}` } : { fontWeight: 600 }} />
                );
              })}
            </Box>
          </Box>
          <Box sx={{ flex: '1 1 280px', minWidth: 'min(280px, 100%)', maxWidth: 420 }}>
            <FiltroLocales locales={todosLosLocales} value={localesSel} onChange={setLocalesSel} />
          </Box>
        </Paper>
      )}

      {cargando && !meta && <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}><CircularProgress /></Box>}

      {!sinDatos && tab === 0 && fecha && datos.length > 0 && <TabResumen filas={filas} serie={serieFiltrada} fecha={fecha} fechaComp={fechaComp} mes={mes} mesComp={mesComp} />}
      {!sinDatos && tab === 1 && fecha && datos.length > 0 && (
        <TabPorLocal filas={filas} todas={datos} serie={serie} fecha={fecha} fechaComp={fechaComp} mes={mes} mesComp={mesComp}
          detalle={localDetalle} onDetalle={setLocalDetalle} />
      )}
      {!sinDatos && tab === 2 && <TabTendencia serie={serieFiltrada} ultima={meta.ultimaFecha} />}
      {tab === 3 && <TabCargas puedeCargar={puedeCargar} meta={meta} onCargado={cargarTodo} />}
    </Box>
  );
}

// =====================================================================================
//  Resumen
// =====================================================================================
function TabResumen({ filas, serie, fecha, fechaComp, mes, mesComp }) {
  const c = useColores();
  const T = useMemo(() => totalizar(filas), [filas]);
  const divisiones = useMemo(() => totalesPorDivision(filas), [filas]);
  const rank = useMemo(() => rankingDia(filas), [filas]);
  const puntos = useMemo(() => ventana(totalesPorFecha(serie), fecha, 30), [serie, fecha]);
  const conDatos = puntos.filter((p) => p.ventaDia != null).length;
  const totalDia = T.ventaDia || 1;
  const maxDiv = Math.max(...divisiones.map((d) => d.ventaDia), 1);

  const th = { fontWeight: 700, fontSize: 12, color: c.suave, whiteSpace: 'nowrap' };
  const celdaDiv = (d, total) => (
    <TableRow key={d.division} sx={total ? { bgcolor: c.fila, '& td': { fontWeight: 800 } } : undefined}>
      <TableCell sx={{ fontWeight: total ? 800 : 600 }}>{d.division}</TableCell>
      <TableCell align="right">{fmtNum(d.ventaDiaComp)}</TableCell>
      <TableCell align="right">{fmtNum(d.ventaDia)}</TableCell>
      <TableCell align="right"><Delta valor={d.varDia} texto={fmtVar(d.varDia)} /></TableCell>
      <TableCell align="right">{fmtNum(d.acumMesComp)}</TableCell>
      <TableCell align="right">{fmtNum(d.acumMes)}</TableCell>
      <TableCell align="right"><Delta valor={d.varAcum} texto={fmtVar(d.varAcum)} /></TableCell>
    </TableRow>
  );

  if (!filas.length) return <Alert severity="info">Ningún local coincide con los filtros elegidos.</Alert>;
  return (
    <>
      <GridKpi>
        <Kpi titulo="Venta del día" valor={fmtMM(T.ventaDia)} delta={T.varDia} deltaTexto={fmtVar(T.varDia)} vs={fmtMM(T.ventaDiaComp)}
          nota={`${fechaDiaMes(fecha)} vs ${fechaDiaMes(fechaComp)}`} />
        <Kpi titulo="Acumulado del mes" valor={fmtMM(T.acumMes)} delta={T.varAcum} deltaTexto={fmtVar(T.varAcum)} vs={fmtMM(T.acumMesComp)}
          nota={`${nombreMesCorto(mes)} vs ${nombreMesCorto(mesComp)}`} />
        <Kpi titulo="Ticket promedio" valor={fmtPesos(T.ticket)} delta={T.varTicket} deltaTexto={T.varTicket == null ? null : fmtVar(T.varTicket)} vs={T.ticketComp ? fmtPesos(T.ticketComp) : null}
          nota="acumulado ÷ pedidos" />
        <Kpi titulo="Pedidos (acum.)" valor={fmtNum(T.pedidos)} delta={T.varPedidos} deltaTexto={fmtVar(T.varPedidos)} vs={fmtNum(T.pedidosComp)}
          nota={`${nombreMesCorto(mes)} vs ${nombreMesCorto(mesComp)}`} />
        <Kpi titulo="GP % · compras" valor={fmtPct(T.gp)}
          nota={`ponderado por ventas · ${T.gpLocales} locales${T.nuevos ? ` (excluye ${T.nuevos} ${T.nuevos === 1 ? 'nuevo' : 'nuevos'})` : ''}`} />
      </GridKpi>

      <Fila2
        izq={(
          <Panel sx={{ flex: 1 }}>
            <Titulo extra={<Typography variant="caption" color="text.secondary">{conDatos} de 30 días con datos</Typography>}>Venta diaria · últimos 30 días</Titulo>
            <GraficoBarras puntos={puntos} sel={fecha} comp={fechaComp} />
            <Leyenda items={[[c.barraSel, `${fechaDiaMes(fecha)} (día seleccionado)`], [c.barraComp, `${fechaDiaMes(fechaComp)} (comparación)`], [c.barraOtro, 'Otros días con Excel'], [c.barraDato, 'Días solo de comparación']]} />
          </Panel>
        )}
        der={(
          <Panel sx={{ flex: 1 }}>
            <Titulo>Por división</Titulo>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.25 }}>
              {divisiones.map((d) => (
                <Box key={d.division} sx={{ display: 'flex', flexDirection: 'column', gap: 0.75 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1, fontSize: 13 }}>
                    <b>{d.division}</b>
                    <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 1 }}><b>{fmtMM(d.ventaDia)}</b><Delta valor={d.varDia} texto={fmtVar(d.varDia)} /></Box>
                  </Box>
                  <Box sx={{ height: 10, borderRadius: 5, bgcolor: c.barra, overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.max(2, (d.ventaDia / maxDiv) * 100)}%`, height: '100%', bgcolor: c.barraSel }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">{fmtPct(d.ventaDia / totalDia)} de la venta del día · {fechaDiaMes(fechaComp)} {fmtMM(d.ventaDiaComp)}</Typography>
                </Box>
              ))}
            </Box>
          </Panel>
        )}
      />

      <Panel>
        <Titulo extra={<Typography variant="caption" color="text.secondary">calculado con los locales de la hoja «Por Local»</Typography>}>Por división · detalle</Titulo>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 720 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={th}>División</TableCell>
                <TableCell sx={th} align="right">Venta {fechaDiaMes(fechaComp)}</TableCell>
                <TableCell sx={th} align="right">Venta {fechaDiaMes(fecha)}</TableCell>
                <TableCell sx={th} align="right">Variación</TableCell>
                <TableCell sx={th} align="right">Acum. {nombreMesCorto(mesComp)}</TableCell>
                <TableCell sx={th} align="right">Acum. {nombreMesCorto(mes)}</TableCell>
                <TableCell sx={th} align="right">Var. acumulada</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {divisiones.map((d) => celdaDiv(d, false))}
              {celdaDiv({ division: 'TOTAL', ...T }, true)}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>

      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.75 }}>
        {[['Mayores subas del día', rank.subas, `${rank.conAlza} de ${rank.comparables} locales vendieron más que el ${fechaDiaMes(fechaComp)}`],
          ['Mayores bajas del día', rank.bajas, `${rank.conBaja} locales vendieron menos · es la variación de un solo día: mírala junto al acumulado`]].map(([titulo, lista, nota]) => (
          <Panel key={titulo} sx={{ flex: '1 1 340px' }}>
            <Titulo>{titulo}</Titulo>
            {lista.map((f) => (
              <Box key={f.sucursal} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, py: 1.1, borderBottom: 1, borderColor: 'divider' }}>
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="body2" fontWeight={600}>{f.sucursal}</Typography>
                  <Typography variant="caption" color="text.secondary">{fmtNum(f.ventaDiaComp)} → {fmtNum(f.ventaDia)}</Typography>
                </Box>
                <Delta valor={f.varDia} texto={fmtVarEntera(f.varDia)} />
              </Box>
            ))}
            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1.25 }}>{nota}{T.nuevos ? ` · excluye ${T.nuevos} locales nuevos sin comparación` : ''}</Typography>
          </Panel>
        ))}
      </Box>
    </>
  );
}

// =====================================================================================
//  Por local (la hoja completa) y detalle de un local
// =====================================================================================
async function exportarExcel(filas, { fecha, fechaComp, mes, mesComp }) {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('Por Local');
  ws.addRow(['Local', 'División', `Venta ${fechaTexto(fechaComp)}`, `Venta ${fechaTexto(fecha)}`, 'Variación', `Acum. ${nombreMes(mesComp)}`, `Acum. ${nombreMes(mes)}`, 'Var. acumulada',
    `Ticket prom. ${nombreMesCorto(mesComp)}`, `Ticket prom. ${nombreMesCorto(mes)}`, 'Var. ticket', `GP % ${nombreMesCorto(mes)}`, `Pedidos ${nombreMesCorto(mesComp)}`, `Pedidos ${nombreMesCorto(mes)}`, 'Var. pedidos']);
  ws.getRow(1).font = { bold: true };
  for (const f of filas) {
    ws.addRow([f.sucursal, f.division, f.ventaDiaComp, f.ventaDia, f.varDia, f.acumMesComp, f.acumMes, f.varAcum, f.ticketComp, f.ticket, f.varTicket, f.gp, f.pedidosComp, f.pedidos, f.varPedidos]);
  }
  for (const col of [5, 8, 11, 12, 15]) ws.getColumn(col).numFmt = '0.0%';
  for (const col of [3, 4, 6, 7, 9, 10, 13, 14]) ws.getColumn(col).numFmt = '#,##0';
  ws.getColumn(1).width = 28; ws.getColumn(2).width = 18;
  const buf = await wb.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
  const a = document.createElement('a');
  a.href = url; a.download = `Ventas_Diarias_${fecha}.xlsx`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const Cel = ({ children, ...r }) => <TableCell align="right" sx={{ whiteSpace: 'nowrap', fontSize: 13.5 }} {...r}>{children}</TableCell>;

function TabPorLocal({ filas, todas, serie, fecha, fechaComp, mes, mesComp, detalle, onDetalle }) {
  const c = useColores();
  const [busqueda, setBusqueda] = useState('');
  const [orden, setOrden] = useState('varAcumAsc');
  const [ocultarNuevos, setOcultarNuevos] = useState(false);
  const [pagina, setPagina] = useState(0);
  const [porPagina, setPorPagina] = useState(50);

  const filasVar = useMemo(() => filas.map(conVariaciones), [filas]);
  const visibles = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return filasVar
      .filter((f) => (!ocultarNuevos || !f.nuevo) && (!q || f.sucursal.toLowerCase().includes(q)))
      .sort(ORDENES.find((o) => o.id === orden).cmp);
  }, [filasVar, busqueda, orden, ocultarNuevos]);
  useEffect(() => { setPagina(0); }, [busqueda, orden, ocultarNuevos, filas]);

  const T = useMemo(() => totalizar(filas), [filas]);
  if (detalle) {
    const f = todas.map(conVariaciones).find((x) => x.sucursal === detalle);
    if (f) return <DetalleLocal fila={f} todas={todas} serie={serie} fecha={fecha} fechaComp={fechaComp} mes={mes} mesComp={mesComp} onVolver={() => onDetalle(null)} />;
  }
  const pagFilas = visibles.slice(pagina * porPagina, pagina * porPagina + porPagina);

  const th = { fontWeight: 700, fontSize: 12, color: c.suave, whiteSpace: 'nowrap', bgcolor: c.cabecera, borderBottom: `1px solid ${c.linea}` };
  const thg = { ...th, fontWeight: 800, color: c.texto, textAlign: 'center', borderLeft: `1px solid ${c.linea}` };
  const stick = { position: 'sticky', left: 0, bgcolor: 'background.paper', zIndex: 1 };

  return (
    <Panel>
      <Titulo>{`Todos los locales · ${fechaDiaMes(fecha)} vs ${fechaDiaMes(fechaComp)}`}</Titulo>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, mb: 2 }}>
        <TextField size="small" label="Buscar local" placeholder="Escribe un nombre…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} sx={{ minWidth: 220, flex: '1 1 220px', maxWidth: 320 }} />
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel id="vd-orden">Ordenar por</InputLabel>
          <Select labelId="vd-orden" label="Ordenar por" value={orden} onChange={(e) => setOrden(e.target.value)}>
            {ORDENES.map((o) => <MenuItem key={o.id} value={o.id}>{o.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControlLabel control={<Checkbox size="small" checked={ocultarNuevos} onChange={(e) => setOcultarNuevos(e.target.checked)} />} label="Ocultar locales nuevos" />
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" color="inherit" startIcon={<DownloadIcon />} sx={{ textTransform: 'none', borderColor: 'divider' }}
          onClick={() => exportarExcel(visibles, { fecha, fechaComp, mes, mesComp })}>Exportar a Excel</Button>
      </Box>

      <TableContainer sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
        <Table size="small" sx={{ minWidth: 1560, borderCollapse: 'separate' }}>
          <TableHead>
            <TableRow>
              <TableCell rowSpan={2} sx={{ ...thg, ...stick, textAlign: 'left', borderLeft: 0, zIndex: 3, bgcolor: c.cabecera }}>Local</TableCell>
              <TableCell rowSpan={2} sx={{ ...thg, textAlign: 'left' }}>División</TableCell>
              <TableCell colSpan={3} sx={thg}>Venta del día</TableCell>
              <TableCell colSpan={3} sx={thg}>Acumulado del mes</TableCell>
              <TableCell colSpan={3} sx={thg}>Ticket promedio</TableCell>
              <TableCell rowSpan={2} sx={thg}>GP % ({nombreMesCorto(mes).slice(0, 3)})</TableCell>
              <TableCell colSpan={3} sx={thg}>Pedidos (acum.)</TableCell>
            </TableRow>
            <TableRow>
              {[fechaDiaMes(fechaComp), fechaDiaMes(fecha), 'Var.', nombreMesCorto(mesComp), nombreMesCorto(mes), 'Var.', nombreMesCorto(mesComp), nombreMesCorto(mes), 'Var.', nombreMesCorto(mesComp), nombreMesCorto(mes), 'Var.']
                .map((t, i) => <TableCell key={i} align="right" sx={th}>{t}</TableCell>)}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow sx={{ '& td': { fontWeight: 800, bgcolor: c.fila, borderBottom: `2px solid ${c.linea}` } }}>
              <TableCell sx={{ ...stick, bgcolor: c.fila }}>TOTAL · {T.locales} locales</TableCell><TableCell />
              <Cel>{fmtNum(T.ventaDiaComp)}</Cel><Cel>{fmtNum(T.ventaDia)}</Cel><Cel><Delta valor={T.varDia} texto={fmtVar(T.varDia)} /></Cel>
              <Cel>{fmtNum(T.acumMesComp)}</Cel><Cel>{fmtNum(T.acumMes)}</Cel><Cel><Delta valor={T.varAcum} texto={fmtVar(T.varAcum)} /></Cel>
              <Cel>{fmtNum(T.ticketComp)}</Cel><Cel>{fmtNum(T.ticket)}</Cel><Cel><Delta valor={T.varTicket} texto={fmtVar(T.varTicket)} /></Cel>
              <Cel>{fmtPct(T.gp)}</Cel>
              <Cel>{fmtNum(T.pedidosComp)}</Cel><Cel>{fmtNum(T.pedidos)}</Cel><Cel><Delta valor={T.varPedidos} texto={fmtVar(T.varPedidos)} /></Cel>
            </TableRow>
            {pagFilas.map((f) => (
              <TableRow key={f.sucursal} hover sx={{ cursor: 'pointer' }} onClick={() => onDetalle(f.sucursal)}>
                <TableCell sx={{ ...stick, fontWeight: 600, whiteSpace: 'nowrap' }}>
                  <Box component="button" type="button" onClick={(e) => { e.stopPropagation(); onDetalle(f.sucursal); }} aria-label={`Ver detalle de ${f.sucursal}`}
                    sx={{ all: 'unset', cursor: 'pointer', fontWeight: 600, '&:hover': { textDecoration: 'underline' }, '&:focus-visible': { outline: `2px solid ${ROJO}` } }}>{f.sucursal}</Box>
                  {f.nuevo && <Chip size="small" label="Nuevo" sx={{ ml: 1, height: 20, fontSize: 11, fontWeight: 700, color: c.ambarTx, bgcolor: c.ambar }} />}
                </TableCell>
                <TableCell sx={{ color: c.suave, fontSize: 12.5, whiteSpace: 'nowrap' }}>{f.division}</TableCell>
                <Cel>{fmtNum(f.ventaDiaComp)}</Cel><Cel>{fmtNum(f.ventaDia)}</Cel><Cel><Delta valor={f.varDia} texto={fmtVar(f.varDia)} /></Cel>
                <Cel>{fmtNum(f.acumMesComp)}</Cel><Cel>{fmtNum(f.acumMes)}</Cel><Cel><Delta valor={f.varAcum} texto={fmtVar(f.varAcum)} /></Cel>
                <Cel>{f.nuevo ? '—' : fmtNum(f.ticketComp)}</Cel><Cel>{fmtNum(f.ticket)}</Cel><Cel><Delta valor={f.varTicket} texto={fmtVar(f.varTicket)} /></Cel>
                <Cel>{fmtPct(f.gp)}{f.gpRevisar && <Chip size="small" label="revisar" sx={{ ml: 0.75, height: 20, fontSize: 11, fontWeight: 700, color: c.ambarTx, bgcolor: c.ambar }} />}</Cel>
                <Cel>{fmtNum(f.pedidosComp)}</Cel><Cel>{fmtNum(f.pedidos)}</Cel><Cel><Delta valor={f.varPedidos} texto={fmtVar(f.varPedidos)} /></Cel>
              </TableRow>
            ))}
            {!pagFilas.length && <TableRow><TableCell colSpan={15} align="center" sx={{ py: 4, color: c.suave }}>Ningún local coincide con la búsqueda.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination component="div" count={visibles.length} page={pagina} onPageChange={(_, p) => setPagina(p)} rowsPerPage={porPagina}
        onRowsPerPageChange={(e) => { setPorPagina(Number(e.target.value)); setPagina(0); }} rowsPerPageOptions={[25, 50, 100]}
        labelRowsPerPage="Filas por página" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5, lineHeight: 1.5 }}>
        <b style={{ color: c.ambarTx }}>Nuevo</b>: local sin ventas en el período de comparación, no tiene variación.{' '}
        <b style={{ color: c.ambarTx }}>revisar</b>: el GP % que trae el Excel está fuera de lo esperable (menos de 10 %).
        Los pedidos y el ticket son acumulados del mes: el Excel no los trae por día.
      </Typography>
    </Panel>
  );
}

function DetalleLocal({ fila: f, todas, serie, fecha, fechaComp, mes, mesComp, onVolver }) {
  const c = useColores();
  const propios = useMemo(() => serie.filter((p) => p.sucursal === f.sucursal), [serie, f.sucursal]);
  const puntos = useMemo(() => ventana(totalesPorFecha(propios), fecha, 30), [propios, fecha]);
  const rankDe = (lista, fn, desc = true) => [...lista].sort((a, b) => (desc ? fn(b) - fn(a) : fn(a) - fn(b))).findIndex((x) => x.sucursal === f.sucursal) + 1;
  const mismaDiv = todas.filter((x) => (x.division || '') === (f.division || ''));
  const comparables = todas.filter((x) => !x.nuevo && x.ventaDiaComp > 0);
  const rankRed = rankDe(todas, (x) => x.ventaDia);
  const rankDiv = rankDe(mismaDiv, (x) => x.ventaDia);
  const rankVar = f.varDia == null ? null : rankDe(comparables, (x) => x.ventaDia / x.ventaDiaComp);
  const dias = useMemo(() => {
    const porFecha = new Map(propios.map((p) => [p.fecha, p]));
    return [...propios].sort((a, b) => b.fecha - a.fecha).slice(0, 10).map((p) => {
      const prev = porFecha.get(sumarDias(p.fecha, -7));
      return { ...p, varSemana: prev && prev.ventaDia > 0 ? p.ventaDia / prev.ventaDia - 1 : null };
    });
  }, [propios]);
  const chip = (t) => <Chip key={t} size="small" label={t} variant="outlined" sx={{ fontWeight: 700 }} />;
  const th = { fontWeight: 700, fontSize: 12, color: c.suave };

  return (
    <>
      <Box sx={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 1.5 }}>
        <Button startIcon={<BackIcon />} variant="outlined" color="inherit" size="small" onClick={onVolver} sx={{ textTransform: 'none', borderColor: 'divider' }}>Volver a Por local</Button>
        <Typography variant="body2" color="text.secondary">Por local ›</Typography>
        <Typography component="h2" variant="h6" fontWeight={800}>{f.sucursal}</Typography>
        {chip(f.division || 'SIN DIVISIÓN')}{chip(`#${rankRed} de ${todas.length} en venta del día`)}
        {f.nuevo && <Chip size="small" label="Local nuevo" sx={{ fontWeight: 700, color: c.ambarTx, bgcolor: c.ambar }} />}
      </Box>
      <GridKpi>
        <Kpi titulo="Venta del día" valor={fmtNum(f.ventaDia)} delta={f.varDia} deltaTexto={f.varDia == null ? null : fmtVar(f.varDia)} vs={f.ventaDiaComp ? fmtNum(f.ventaDiaComp) : null} nota={`${fechaDiaMes(fecha)} vs ${fechaDiaMes(fechaComp)}`} />
        <Kpi titulo="Acumulado del mes" valor={fmtMM(f.acumMes)} delta={f.varAcum} deltaTexto={f.varAcum == null ? null : fmtVar(f.varAcum)} vs={f.acumMesComp ? fmtMM(f.acumMesComp) : null} nota={`${nombreMesCorto(mes)} vs ${nombreMesCorto(mesComp)}`} />
        <Kpi titulo="Ticket promedio" valor={fmtPesos(f.ticket)} delta={f.varTicket} deltaTexto={f.varTicket == null ? null : fmtVar(f.varTicket)} vs={f.ticketComp ? fmtPesos(f.ticketComp) : null} nota="acumulado ÷ pedidos" />
        <Kpi titulo="Pedidos (acum.)" valor={fmtNum(f.pedidos)} delta={f.varPedidos} deltaTexto={f.varPedidos == null ? null : fmtVar(f.varPedidos)} vs={f.pedidosComp ? fmtNum(f.pedidosComp) : null} nota={`${nombreMesCorto(mes)} vs ${nombreMesCorto(mesComp)}`} />
        <Kpi titulo="GP % · compras" valor={fmtPct(f.gp)} nota={f.gpRevisar ? 'valor fuera de lo esperable: revisar en el Excel' : 'solo viene el mes actual'} />
      </GridKpi>
      <Fila2
        izq={(
          <Panel sx={{ flex: 1 }}>
            <Titulo extra={<Typography variant="caption" color="text.secondary">{puntos.filter((p) => p.ventaDia != null).length} de 30 días con datos</Typography>}>Venta diaria · últimos 30 días</Titulo>
            <GraficoBarras puntos={puntos} sel={fecha} comp={fechaComp} alto={240} />
            <Leyenda items={[[c.barraSel, fechaDiaMes(fecha)], [c.barraComp, fechaDiaMes(fechaComp)], [c.barraOtro, 'Otros días']]} />
          </Panel>
        )}
        der={(
          <Panel sx={{ flex: 1 }}>
            <Titulo>Dónde está frente a los demás</Titulo>
            {[['Venta del día en su división', `#${rankDiv}`, `de ${mismaDiv.length} locales de ${f.division || 'SIN DIVISIÓN'}`],
              ['Venta del día en toda la red', `#${rankRed}`, `de ${todas.length} locales`],
              ['Variación del día', rankVar ? `#${rankVar}` : '—', rankVar ? `de ${comparables.length} locales con comparación` : 'local nuevo: sin comparación']].map(([a, v, s]) => (
              <Box key={a} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 1.5, py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                <Typography variant="body2">{a}<Typography component="span" variant="caption" color="text.secondary" display="block">{s}</Typography></Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{v}</Typography>
              </Box>
            ))}
          </Panel>
        )}
      />
      <Panel>
        <Titulo>Últimos 10 días</Titulo>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 420 }}>
            <TableHead><TableRow>
              <TableCell sx={th}>Fecha</TableCell><TableCell sx={th}>Día</TableCell><TableCell sx={th} align="right">Venta del día</TableCell><TableCell sx={th} align="right">vs mismo día de la semana anterior</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {dias.map((d) => (
                <TableRow key={d.fecha} sx={d.fecha === fecha ? { bgcolor: c.fila, '& td': { fontWeight: 800 } } : undefined}>
                  <TableCell>{fechaTexto(d.fecha)}</TableCell><TableCell>{diaSemana(d.fecha)}{d.origen === 'comparacion' && <Chip size="small" label="comparación" sx={{ ml: 1, height: 20, fontSize: 11 }} />}</TableCell>
                  <TableCell align="right">{fmtNum(d.ventaDia)}</TableCell><TableCell align="right"><Delta valor={d.varSemana} texto={fmtVar(d.varSemana)} /></TableCell>
                </TableRow>
              ))}
              {!dias.length && <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: c.suave }}>Aún no hay días con datos.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>El Excel no trae pedidos ni ticket por día (solo acumulados del mes): el detalle diario es de venta.</Typography>
      </Panel>
    </>
  );
}

// =====================================================================================
//  Tendencia
// =====================================================================================
function TabTendencia({ serie, ultima }) {
  const c = useColores();
  const [dias, setDias] = useState(30);
  const totales = useMemo(() => totalesPorFecha(serie), [serie]);
  const puntos = useMemo(() => ventana(totales, ultima, dias), [totales, ultima, dias]);
  const porFecha = useMemo(() => new Map(totales.map((t) => [t.fecha, t])), [totales]);
  const lista = useMemo(() => [...totales].filter((t) => t.fecha >= sumarDias(ultima, -(dias - 1))).sort((a, b) => b.fecha - a.fecha), [totales, ultima, dias]);
  const th = { fontWeight: 700, fontSize: 12, color: c.suave, whiteSpace: 'nowrap' };
  return (
    <>
      <Panel>
        <Titulo extra={(
          <ToggleButtonGroup size="small" exclusive value={dias} onChange={(_, v) => v && setDias(v)} aria-label="Período"
            sx={{ '& .MuiToggleButton-root': { textTransform: 'none' }, '& .Mui-selected': { bgcolor: `${c.dark ? '#e5e7eb' : '#1f2937'} !important`, color: `${c.dark ? '#111' : '#fff'} !important` } }}>
            {[30, 60, 90].map((d) => <ToggleButton key={d} value={d}>{d} días</ToggleButton>)}
          </ToggleButtonGroup>
        )}>Venta diaria total</Titulo>
        <GraficoBarras puntos={puntos} sel={ultima} comp={null} />
        <Leyenda items={[[c.barraSel, `${fechaDiaMes(ultima)} (último día cargado)`], [c.barraOtro, 'Días con Excel'], [c.barraDato, 'Días solo de comparación']]} />
      </Panel>
      <Panel>
        <Titulo extra={<Typography variant="caption" color="text.secondary">{lista.length} días con datos</Typography>}>Día por día</Titulo>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table size="small" stickyHeader sx={{ minWidth: 560 }}>
            <TableHead><TableRow>
              <TableCell sx={th}>Fecha</TableCell><TableCell sx={th}>Día</TableCell><TableCell sx={th} align="right">Venta total</TableCell>
              <TableCell sx={th} align="right">vs mismo día de la semana anterior</TableCell><TableCell sx={th} align="right">Locales</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {lista.map((t) => {
                const prev = porFecha.get(sumarDias(t.fecha, -7));
                const v = prev && prev.ventaDia > 0 ? variacion(t.ventaDia, prev.ventaDia) : null;
                return (
                  <TableRow key={t.fecha} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{fechaTexto(t.fecha)}</TableCell>
                    <TableCell>{diaSemana(t.fecha)}{t.origen === 'comparacion' && <Chip size="small" label="solo comparación" sx={{ ml: 1, height: 20, fontSize: 11 }} />}</TableCell>
                    <TableCell align="right">{fmtNum(t.ventaDia)}</TableCell>
                    <TableCell align="right"><Delta valor={v} texto={fmtVar(v)} /></TableCell>
                    <TableCell align="right">{t.locales}</TableCell>
                  </TableRow>
                );
              })}
              {!lista.length && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 4, color: c.suave }}>Aún no hay días con datos.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>Se completa con cada carga diaria. La comparación semanal aparece cuando están cargados ambos días.</Typography>
      </Panel>
    </>
  );
}

// =====================================================================================
//  Cargas
// =====================================================================================
function Item({ ok, children }) {
  const c = useColores();
  return (
    <Box sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', fontSize: 13.5, lineHeight: 1.45 }}>
      <Box component="span" aria-hidden="true" sx={{ flex: '0 0 auto', width: 22, height: 22, borderRadius: '50%', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: ok ? c.bueno : c.ambarTx, bgcolor: ok ? c.buenoBg : c.ambar }}>{ok ? '✓' : '!'}</Box>
      <span>{children}</span>
    </Box>
  )
}

function TabCargas({ puedeCargar, meta, onCargado }) {
  const c = useColores();
  const [archivo, setArchivo] = useState(null);
  const [modo, setModo] = useState('reemplazar');
  const [guardarComp, setGuardarComp] = useState(true);
  const [subiendo, setSubiendo] = useState(false);
  const [progreso, setProgreso] = useState(0);
  const [resultado, setResultado] = useState(null);
  const [errorCarga, setErrorCarga] = useState('');
  const [historial, setHistorial] = useState([]);
  const inputRef = useRef(null);

  const cargarHistorial = useCallback(() => { api.get('/ventas-diarias/cargas').then((r) => setHistorial(r.data)).catch(() => setHistorial([])); }, []);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial, meta?.ultimaCarga?._id]);

  const elegir = (e) => {
    const f = e.target.files && e.target.files[0];
    setResultado(null); setErrorCarga('');
    if (!f) return;
    if (/\.xlsb$/i.test(f.name)) { setArchivo(null); setErrorCarga('El archivo es .xlsb: ábrelo en Excel y guárdalo como .xlsx (Libro de Excel).'); return; }
    if (!/\.xlsx$/i.test(f.name)) { setArchivo(null); setErrorCarga('El archivo debe ser .xlsx.'); return; }
    setArchivo(f);
  };

  const importar = async () => {
    if (!archivo || subiendo) return;
    const fd = new FormData();
    fd.append('archivo', archivo); fd.append('modo', modo); fd.append('guardarComparacion', String(guardarComp));
    setSubiendo(true); setProgreso(0); setErrorCarga(''); setResultado(null);
    try {
      const { data } = await api.post('/ventas-diarias/cargar', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }, timeout: 10 * 60 * 1000,
        onUploadProgress: (ev) => { if (ev.total) setProgreso(Math.round((ev.loaded / ev.total) * 100)); },
      });
      setResultado(data); setArchivo(null); if (inputRef.current) inputRef.current.value = '';
      onCargado(); cargarHistorial();
    } catch (e) {
      setErrorCarga(e.response?.data?.message || 'No se pudo cargar el archivo');
    } finally {
      setSubiendo(false);
    }
  };

  const rs = resultado?.resumen;
  // Calendario del mes del último día cargado
  const ultima = meta?.ultimaFecha;
  const cal = useMemo(() => {
    if (!ultima) return null;
    const mes = mesDeFecha(ultima);
    return { mes, ...calendarioMes(mes, (meta.fechas || []).filter((f) => f.origen === 'archivo').map((f) => f.fecha), ultima) };
  }, [meta, ultima]);

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.75, alignItems: 'stretch' }}>
        <Panel sx={{ flex: '1 1 420px' }}>
          <Titulo>Cargar archivo del día</Titulo>
          {!puedeCargar ? (
            <Alert severity="info">Solo Master y Gerencia pueden cargar el Excel.</Alert>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.75 }}>
              <Box component="label" htmlFor="vd-archivo" sx={{ border: `2px dashed ${ROJO}`, borderRadius: 3, p: 3, textAlign: 'center', cursor: 'pointer', bgcolor: c.dark ? 'rgba(242,0,0,0.08)' : '#fff1f1', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5 }}>
                <UploadIcon sx={{ fontSize: 36, color: ROJO }} />
                <Typography fontWeight={600}>{archivo ? archivo.name : 'Elige el Excel del día'}</Typography>
                <Typography variant="caption" color="text.secondary">{archivo ? `${(archivo.size / 1024).toFixed(0)} KB` : 'Formato .xlsx · máx. 20 MB'}</Typography>
                <input id="vd-archivo" ref={inputRef} type="file" accept=".xlsx" hidden onChange={elegir} />
              </Box>
              <Typography variant="caption" sx={{ lineHeight: 1.5 }}>
                Se lee la hoja <b>«Por Local»</b>. Columnas requeridas: Local · Venta (día) · Variación · Acum. · Var. Acumulada · Ticket Prom. · GP % · Pedidos · Var. Pedidos.
                Las fechas se leen del encabezado de las columnas.
              </Typography>
              <RadioGroup value={modo} onChange={(e) => setModo(e.target.value)}>
                <FormControlLabel value="reemplazar" control={<Radio size="small" />} label="Reemplazar el día si ya estaba cargado" />
                <FormControlLabel value="agregar" control={<Radio size="small" />} label="Agregar solo si el día no existe (no pisa nada)" />
              </RadioGroup>
              <FormControlLabel control={<Checkbox size="small" checked={guardarComp} onChange={(e) => setGuardarComp(e.target.checked)} />}
                label="Guardar también el día de comparación si todavía no está cargado" />
              {subiendo && <LinearProgress variant={progreso < 100 ? 'determinate' : 'indeterminate'} value={progreso} />}
              {errorCarga && <Alert severity="error">{errorCarga}</Alert>}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                <Button color="inherit" disabled={!archivo || subiendo} onClick={() => { setArchivo(null); setErrorCarga(''); if (inputRef.current) inputRef.current.value = ''; }} sx={{ textTransform: 'none', fontWeight: 600 }}>Quitar</Button>
                <Button variant="contained" disabled={!archivo || subiendo} onClick={importar} sx={{ bgcolor: ROJO, '&:hover': { bgcolor: '#b71c1c' }, fontWeight: 700, textTransform: 'none' }}>Importar</Button>
              </Box>
            </Box>
          )}
        </Panel>

        <Panel sx={{ flex: '1 1 420px' }}>
          <Titulo>Resultado de la última importación</Titulo>
          {!rs ? (
            <Typography variant="body2" color="text.secondary">Aquí aparece la validación del archivo después de importarlo.</Typography>
          ) : (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Item ok><b>{fmtNum(rs.locales)} locales</b> leídos de la hoja «Por Local»</Item>
              <Item ok>Día del archivo: <b>{fechaLarga(rs.fecha)}</b> · comparación: {fechaLarga(rs.fechaComp)}</Item>
              {rs.cuadre && (rs.cuadre.ok
                ? <Item ok>Cuadre: la suma de los locales (<b>{fmtPesos(rs.cuadre.totalLocales)}</b>) coincide con el TOTAL de la hoja «Por Division»</Item>
                : <Item ok={false}><b>No cuadra</b>: la suma de los locales ({fmtPesos(rs.cuadre.totalLocales)}) difiere del TOTAL de «Por Division» ({fmtPesos(rs.cuadre.totalHoja)})</Item>)}
              {rs.sinDivision.length === 0
                ? <Item ok>División asignada a los {fmtNum(rs.locales)} locales</Item>
                : <Item ok={false}><b>{rs.sinDivision.length} locales sin división</b>: {rs.sinDivision.slice(0, 4).join(', ')}{rs.sinDivision.length > 4 ? '…' : ''}</Item>}
              {rs.nuevos.length > 0 && <Item ok={false}><b>{rs.nuevos.length} {rs.nuevos.length === 1 ? 'local nuevo' : 'locales nuevos'}</b> sin comparación: {rs.nuevos.join(', ')}</Item>}
              {rs.gpSospechoso.length > 0 && <Item ok={false}><b>GP % sospechoso</b> en {rs.gpSospechoso.length} {rs.gpSospechoso.length === 1 ? 'local' : 'locales'} ({rs.gpSospechoso.map((g) => fmtPct(g.gp)).join(', ')}): se cargan marcados como «revisar»</Item>}
              {rs.advertencias.filter((a) => !/sin división|no coincide con el TOTAL/.test(a)).map((a) => <Item key={a} ok={false}>{a}</Item>)}
              <Typography variant="caption" color="text.secondary" sx={{ pt: 0.5, borderTop: 1, borderColor: 'divider' }}>
                {fmtNum(resultado.carga.registros)} registros guardados para el {fechaTexto(rs.fecha)}
                {resultado.comparacionGuardada > 0 ? ` y ${fmtNum(resultado.comparacionGuardada)} del ${fechaTexto(rs.fechaComp)} (solo su venta)` : ''}
              </Typography>
            </Box>
          )}
        </Panel>
      </Box>

      {cal && (
        <Panel>
          <Titulo>{`Calendario de cargas · ${nombreMes(cal.mes)}`}</Titulo>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 0.75, maxWidth: 560 }}>
            {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => <Typography key={i} variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: 'center' }}>{d}</Typography>)}
            {Array.from({ length: cal.huecos }).map((_, i) => <span key={`h${i}`} />)}
            {cal.dias.map((d) => (
              <Box key={d.dia} data-estado={d.estado} aria-label={`${d.dia}: ${{ cargado: 'cargado', falta: 'falta cargar', antes: 'anterior a la primera carga', futuro: 'aún no corresponde' }[d.estado]}`}
                sx={{
                  height: 52, borderRadius: 2, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700,
                  ...(d.estado === 'cargado' ? { bgcolor: c.buenoBg, color: c.bueno } : d.estado === 'falta' ? { bgcolor: c.ambar, color: c.ambarTx, border: `1px solid ${c.ambarTx}` } : { color: c.suave, border: `1px dashed ${c.linea}` }),
                  ...(d.fecha === ultima ? { outline: `2px solid ${ROJO}`, outlineOffset: 1 } : {}),
                }}>
                {d.dia}{d.estado === 'falta' && <Box component="span" sx={{ fontSize: 10, fontWeight: 700 }}>falta</Box>}
              </Box>
            ))}
          </Box>
          <Leyenda items={[[c.buenoBg, 'Cargado'], [c.ambar, 'Falta cargar'], [c.linea, 'Anterior a la primera carga o aún no corresponde']]} />
          {cal.faltan.length > 0
            ? <Typography variant="body2" sx={{ mt: 1.5, color: c.ambarTx }}><b>{cal.faltan.length === 1 ? 'Falta 1 día' : `Faltan ${cal.faltan.length} días`}: {cal.faltan.map((d) => `${diaSemana(d.fecha)} ${d.dia}`).join(', ')}.</b>{' '}
              <Typography component="span" variant="body2" color="text.secondary">Sin ellos no se puede comparar esos días con la semana anterior.</Typography></Typography>
            : <Typography variant="body2" sx={{ mt: 1.5 }} color="text.secondary">Todos los días del mes hasta el último cargado están cargados.</Typography>}
        </Panel>
      )}

      <Panel>
        <Titulo>Historial de cargas</Titulo>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead><TableRow>
              {['Día cargado', 'Archivo', 'Usuario', 'Locales', 'Venta del día', 'Cargado el'].map((t, i) => <TableCell key={t} align={i === 3 || i === 4 ? 'right' : 'left'} sx={{ fontWeight: 700, fontSize: 12, color: c.suave }}>{t}</TableCell>)}
            </TableRow></TableHead>
            <TableBody>
              {historial.map((h, i) => (
                <TableRow key={h._id} hover>
                  <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fechaTexto(h.fecha)}{i === 0 && <Chip size="small" label="Última" sx={{ ml: 1, height: 20, fontSize: 11, fontWeight: 700, color: c.bueno, bgcolor: c.buenoBg }} />}</TableCell>
                  <TableCell>{h.archivo}</TableCell><TableCell>{h.usuarioNombre || '—'}</TableCell>
                  <TableCell align="right">{fmtNum(h.locales)}</TableCell><TableCell align="right">{fmtPesos(h.ventaTotal)}</TableCell>
                  <TableCell sx={{ color: c.suave, whiteSpace: 'nowrap' }}>{new Date(h.createdAt).toLocaleString('es-CL')}</TableCell>
                </TableRow>
              ))}
              {!historial.length && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: c.suave }}>Aún no hay cargas.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>
    </>
  );
}
