import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Box, Button, Checkbox, Chip, CircularProgress, Collapse, FormControl, FormControlLabel,
  IconButton, InputAdornment, InputLabel, LinearProgress, MenuItem, Paper, Popover, Radio, RadioGroup,
  Select, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TableSortLabel,
  Tabs, TextField, ToggleButton, ToggleButtonGroup, Tooltip, Typography, useTheme,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  KeyboardArrowDown as AbiertoIcon,
  KeyboardArrowRight as CerradoIcon,
  Search as SearchIcon,
  InfoOutlined as InfoIcon,
  CheckCircle as OkIcon,
  Refresh as RefreshIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  MODOS, UMBRALES, SEMAFORO_MG, calcularRangos, totalizar, totalesPor, serieMensual, variacion, deltaPp,
  nombrePeriodo, nombreCorto, nombreRango, fmtMM, fmtM, fmtPct, fmtNum, fmtSigno, fmtVar, fmtPp, MESES_CORTOS, mesDe,
} from '../utils/eerr';

const ROJO = '#f20000';
const ROLES_CARGAR = ['master', 'gerencia'];

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
    barraPrev: dark ? '#8a3030' : '#f4a0a0',
    filaSeccion: dark ? 'rgba(255,255,255,0.04)' : '#fafbfc',
  };
}

// ¿El cambio es favorable? sentido: 'sube' (ventas, margen) o 'baja' (gastos, ratios de gasto)
const esBueno = (v, sentido) => (v == null || v === 0 ? null : sentido === 'sube' ? v > 0 : v < 0);

function Delta({ valor, texto, sentido }) {
  const c = useColores();
  const ok = esBueno(valor, sentido);
  if (ok == null) return <Typography component="span" variant="caption" sx={{ color: c.suave }}>{texto}</Typography>;
  return (
    <Box component="span" sx={{
      fontSize: 12, fontWeight: 700, px: 1, py: 0.25, borderRadius: 5,
      color: ok ? c.bueno : c.malo, bgcolor: ok ? c.buenoBg : c.maloBg, whiteSpace: 'nowrap',
    }}>
      {valor > 0 ? '▲' : '▼'} {texto.replace(/^[+−]/, '')}
    </Box>
  );
}

const Panel = ({ children, sx }) => (
  <Paper variant="outlined" sx={{ p: 2.5, borderRadius: 3, minWidth: 0, ...sx }}>{children}</Paper>
);

const Titulo = ({ children, extra }) => (
  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 1.5 }}>
    <Typography variant="subtitle1" fontWeight={700}>{children}</Typography>
    {extra}
  </Box>
);

// =====================================================================================
export default function EstadoResultados() {
  const { user } = useAuth();
  const puedeCargar = ROLES_CARGAR.includes(user?.rol);
  const c = useColores();

  const [meta, setMeta] = useState(null);
  const [filas, setFilas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState(0);

  const [periodo, setPeriodo] = useState(null);
  const [modo, setModo] = useState('mes');
  const [periodoComp, setPeriodoComp] = useState(null);
  const [seleccion, setSeleccion] = useState(null); // Set de sucursales; null = todas
  const [analista, setAnalista] = useState('');
  const [anclaLocales, setAnclaLocales] = useState(null);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [m, d] = await Promise.all([api.get('/eerr/meta'), api.get('/eerr/datos', { timeout: 120000 })]);
      setMeta(m.data);
      setFilas(d.data);
      setPeriodo((prev) => (prev && m.data.periodos.some((p) => p.periodo === prev) ? prev : m.data.ultimoCerrado));
      if (!m.data.periodos.length) setTab(3);
    } catch (e) {
      setError(e.response?.data?.message || 'No se pudieron cargar los datos del Estado de Resultados');
    } finally {
      setCargando(false);
    }
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  // ---- catálogo de locales ----
  const catalogo = useMemo(() => {
    const porLocal = new Map();
    for (const g of meta?.grupos || []) for (const l of g.locales) porLocal.set(l.sucursal, { ...l, un: g.un });
    return porLocal;
  }, [meta]);
  const todos = useMemo(() => new Set(catalogo.keys()), [catalogo]);

  const periodosConVentas = useMemo(
    () => (meta?.periodos || []).filter((p) => p.ventas > 0).map((p) => p.periodo).sort((a, b) => b - a),
    [meta],
  );

  const rangos = useMemo(() => (periodo ? calcularRangos(modo, periodo, periodoComp) : null), [modo, periodo, periodoComp]);

  // Locales con ventas en el período actual (para contar y marcar "sin datos")
  const activosA = useMemo(() => {
    const s = new Set();
    if (!rangos) return s;
    for (const f of filas) if (f.periodo >= rangos.a.desde && f.periodo <= rangos.a.hasta && f.ventasTotales > 0) s.add(f.sucursal);
    return s;
  }, [filas, rangos]);

  const sucursales = useMemo(() => {
    const s = new Set();
    for (const suc of seleccion || todos) {
      if (analista && catalogo.get(suc)?.analista !== analista) continue;
      s.add(suc);
    }
    return s;
  }, [seleccion, todos, analista, catalogo]);

  const filtrado = seleccion != null || !!analista;
  const A = useMemo(() => (rangos ? totalizar(filas, rangos.a, sucursales) : null), [filas, rangos, sucursales]);
  const B = useMemo(() => (rangos ? totalizar(filas, rangos.b, sucursales) : null), [filas, rangos, sucursales]);

  const toggleGrupo = (g) => {
    const actual = new Set(seleccion || todos);
    const locs = g.locales.map((l) => l.sucursal);
    const completo = locs.every((l) => actual.has(l));
    locs.forEach((l) => (completo ? actual.delete(l) : actual.add(l)));
    setSeleccion(actual.size === todos.size ? null : actual);
  };

  const limpiar = () => { setSeleccion(null); setAnalista(''); };

  if (cargando && !meta) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}><CircularProgress sx={{ color: ROJO }} /></Box>;
  }

  const sinDatos = !meta || !meta.periodos.length;
  const incompleto = meta?.periodos.find((p) => p.periodo > (meta.ultimoCerrado || 0));

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      {/* ---------- encabezado ---------- */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 2, flexWrap: 'wrap' }}>
        <Box>
          <Typography variant="h5" fontWeight={800}>Estado de Resultados</Typography>
          {meta?.ultimaCarga && (
            <Typography variant="body2" color="text.secondary">
              {meta.ultimaCarga.archivo} · cargado {new Date(meta.ultimaCarga.createdAt).toLocaleDateString('es-CL')}
              {meta.ultimaCarga.usuarioNombre ? ` por ${meta.ultimaCarga.usuarioNombre}` : ''}
              {' · '}{fmtNum(meta.ultimaCarga.filas)} filas
              {meta.periodos.length ? ` · ${nombreCorto(meta.periodos[0].periodo)} – ${nombreCorto(meta.ultimoCerrado || meta.periodos.at(-1).periodo)}` : ''}
            </Typography>
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="Recargar datos">
            <IconButton onClick={cargarDatos} disabled={cargando}><RefreshIcon /></IconButton>
          </Tooltip>
          {puedeCargar && (
            <Button variant="contained" startIcon={<UploadIcon />} onClick={() => setTab(3)}
              sx={{ bgcolor: ROJO, '&:hover': { bgcolor: '#b71c1c' }, fontWeight: 700, textTransform: 'none' }}>
              Cargar nuevo Excel
            </Button>
          )}
        </Box>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" allowScrollButtonsMobile
        sx={{ borderBottom: 1, borderColor: 'divider', '& .MuiTab-root': { textTransform: 'none', fontSize: 14 },
          '& .Mui-selected': { color: `${ROJO} !important`, fontWeight: 700 }, '& .MuiTabs-indicator': { bgcolor: ROJO, height: 3 } }}>
        <Tab label="Resumen" disabled={sinDatos} />
        <Tab label="Comparativo EERR" disabled={sinDatos} />
        <Tab label="Locales" disabled={sinDatos} />
        <Tab label="Cargas" />
      </Tabs>

      {/* ---------- filtros ---------- */}
      {!sinDatos && tab !== 3 && rangos && (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-end' }}>
          <FormControl size="small" sx={{ minWidth: 170 }}>
            <InputLabel id="eerr-periodo">Período actual</InputLabel>
            <Select labelId="eerr-periodo" label="Período actual" value={periodo || ''} onChange={(e) => setPeriodo(e.target.value)}>
              {periodosConVentas.map((p) => <MenuItem key={p} value={p}>{nombrePeriodo(p)}</MenuItem>)}
            </Select>
          </FormControl>

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>Comparar con</Typography>
            <ToggleButtonGroup size="small" exclusive value={modo} onChange={(_, v) => v && setModo(v)}
              sx={{ flexWrap: 'wrap', '& .MuiToggleButton-root': { textTransform: 'none' },
                '& .Mui-selected': { bgcolor: `${c.dark ? '#e5e7eb' : '#1f2937'} !important`, color: `${c.dark ? '#111' : '#fff'} !important` } }}>
              {MODOS.map((m) => <ToggleButton key={m.id} value={m.id}>{m.label}</ToggleButton>)}
            </ToggleButtonGroup>
          </Box>

          {modo === 'personalizado' && (
            <FormControl size="small" sx={{ minWidth: 170 }}>
              <InputLabel id="eerr-comp">Mes de comparación</InputLabel>
              <Select labelId="eerr-comp" label="Mes de comparación" value={rangos.b.desde}
                onChange={(e) => setPeriodoComp(e.target.value)}>
                {periodosConVentas.filter((p) => p !== periodo).map((p) => <MenuItem key={p} value={p}>{nombrePeriodo(p)}</MenuItem>)}
              </Select>
            </FormControl>
          )}

          <Box sx={{ flex: '1 1 260px' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} display="block" mb={0.5}>Grupo de locales</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
              {meta.grupos.map((g) => {
                const sel = g.locales.filter((l) => (seleccion || todos).has(l.sucursal)).length;
                const activos = g.locales.filter((l) => activosA.has(l.sucursal)).length;
                const estado = sel === 0 ? 'no' : sel === g.locales.length ? 'si' : 'parcial';
                return (
                  <Chip key={g.un} clickable onClick={() => toggleGrupo(g)}
                    label={`${estado === 'si' ? '✓ ' : estado === 'parcial' ? '– ' : ''}${g.un} · ${activos}`}
                    variant={estado === 'no' ? 'outlined' : 'filled'}
                    sx={estado === 'no' ? { fontWeight: 600 } : {
                      fontWeight: 700, color: c.dark ? '#ffb4b4' : '#b00000',
                      bgcolor: c.dark ? 'rgba(242,0,0,0.18)' : '#fff1f1', border: `1px solid ${ROJO}`,
                    }} />
                );
              })}
            </Box>
          </Box>

          <Button variant="outlined" color="inherit" endIcon={<AbiertoIcon />} onClick={(e) => setAnclaLocales(e.currentTarget)}
            sx={{ textTransform: 'none', minHeight: 40, borderColor: 'divider' }}>
            {seleccion ? `${seleccion.size} locales` : `Todos los locales (${activosA.size})`}
          </Button>

          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="eerr-analista">Analista</InputLabel>
            <Select labelId="eerr-analista" label="Analista" value={analista} onChange={(e) => setAnalista(e.target.value)}>
              <MenuItem value="">Todos</MenuItem>
              {meta.analistas.map((a) => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            </Select>
          </FormControl>

          {filtrado && <Button onClick={limpiar} sx={{ color: ROJO, textTransform: 'none', fontWeight: 600 }}>Limpiar filtros</Button>}

          <LocalesPopover ancla={anclaLocales} onClose={() => setAnclaLocales(null)} grupos={meta.grupos}
            seleccion={seleccion || todos} activos={activosA}
            onCambiar={(s) => setSeleccion(s.size === todos.size ? null : s)} />
        </Paper>
      )}

      {!sinDatos && tab !== 3 && incompleto && periodo === meta.ultimoCerrado && (
        <Alert severity="warning" icon={<InfoIcon />}>
          {nombrePeriodo(incompleto.periodo)} viene incompleto en el archivo. Se muestra {nombrePeriodo(meta.ultimoCerrado)} como último mes cerrado.
        </Alert>
      )}
      {!sinDatos && tab !== 3 && B && B.ventasTotales === 0 && (
        <Alert severity="info">No hay datos para {nombreRango(rangos.b)} con los filtros actuales, por eso no hay comparación.</Alert>
      )}
      {!sinDatos && tab !== 3 && A && sucursales.size === 0 && (
        <Alert severity="info">No hay locales seleccionados.</Alert>
      )}

      {sinDatos && tab !== 3 && (
        <Panel><Typography>Aún no hay datos cargados. {puedeCargar ? 'Ve a la pestaña Cargas para subir el Excel consolidado.' : ''}</Typography></Panel>
      )}

      {!sinDatos && rangos && tab === 0 && <TabResumen A={A} B={B} rangos={rangos} filas={filas} sucursales={sucursales} />}
      {!sinDatos && rangos && tab === 1 && (
        <TabComparativo A={A} B={B} rangos={rangos} sucursales={sucursales} filtrado={filtrado} />
      )}
      {!sinDatos && rangos && tab === 2 && (
        <TabLocales rangos={rangos} filas={filas} sucursales={sucursales} catalogo={catalogo}
          onVerSeleccion={(s) => { setSeleccion(s); setAnalista(''); setTab(1); }} />
      )}
      {tab === 3 && <TabCargas puedeCargar={puedeCargar} onCargado={cargarDatos} />}
    </Box>
  );
}

// =====================================================================================
// Selector de locales agrupado
function LocalesPopover({ ancla, onClose, grupos, seleccion, activos, onCambiar }) {
  const c = useColores();
  const [busca, setBusca] = useState('');
  const [abiertos, setAbiertos] = useState(() => new Set());
  const q = busca.trim().toLowerCase();

  const toggle = (sucs, marcar) => {
    const s = new Set(seleccion);
    sucs.forEach((x) => (marcar ? s.add(x) : s.delete(x)));
    onCambiar(s);
  };

  return (
    <Popover open={!!ancla} anchorEl={ancla} onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { width: 380, maxWidth: '95vw', maxHeight: 560, display: 'flex', flexDirection: 'column', borderRadius: 3 } } }}>
      <Box sx={{ p: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography fontWeight={700}>Grupos y locales</Typography>
          <Box>
            <Button size="small" onClick={() => toggle(grupos.flatMap((g) => g.locales.map((l) => l.sucursal)), true)} sx={{ textTransform: 'none' }}>Todos</Button>
            <Button size="small" onClick={() => onCambiar(new Set())} sx={{ textTransform: 'none', color: ROJO }}>Ninguno</Button>
          </Box>
        </Box>
        <TextField size="small" placeholder="Buscar local…" value={busca} onChange={(e) => setBusca(e.target.value)} autoFocus
          slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
      </Box>
      <Box sx={{ overflowY: 'auto', flex: 1, py: 0.5 }}>
        {grupos.map((g) => {
          const locs = g.locales.filter((l) => !q || l.sucursal.toLowerCase().includes(q));
          if (!locs.length) return null;
          const sel = g.locales.filter((l) => seleccion.has(l.sucursal)).length;
          const abierto = !!q || abiertos.has(g.un);
          return (
            <Box key={g.un}>
              <Box sx={{ display: 'flex', alignItems: 'center', px: 1 }}>
                <Checkbox size="small" checked={sel === g.locales.length} indeterminate={sel > 0 && sel < g.locales.length}
                  onChange={(e) => toggle(g.locales.map((l) => l.sucursal), e.target.checked)}
                  sx={{ '&.Mui-checked, &.MuiCheckbox-indeterminate': { color: ROJO } }}
                  slotProps={{ input: { 'aria-label': `Grupo ${g.un}` } }} />
                <Button fullWidth onClick={() => setAbiertos((s) => { const n = new Set(s); n.has(g.un) ? n.delete(g.un) : n.add(g.un); return n; })}
                  endIcon={abierto ? <AbiertoIcon /> : <CerradoIcon />}
                  sx={{ justifyContent: 'space-between', color: 'text.primary', textTransform: 'none', fontWeight: 700 }}>
                  {g.un}<Box component="span" sx={{ ml: 'auto', mr: 1, fontWeight: 400, fontSize: 12, color: c.suave }}>{sel} de {g.locales.length}</Box>
                </Button>
              </Box>
              <Collapse in={abierto}>
                {locs.map((l) => (
                  <FormControlLabel key={l.sucursal} sx={{ display: 'flex', ml: 4, mr: 1 }}
                    control={<Checkbox size="small" checked={seleccion.has(l.sucursal)}
                      onChange={(e) => toggle([l.sucursal], e.target.checked)} sx={{ '&.Mui-checked': { color: ROJO } }} />}
                    label={
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'baseline' }}>
                        <Typography variant="body2" sx={{ color: activos.has(l.sucursal) ? 'text.primary' : 'text.disabled' }}>{l.sucursal}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {activos.has(l.sucursal) ? l.analista : 'sin datos en el período'}
                        </Typography>
                      </Box>
                    } />
                ))}
              </Collapse>
            </Box>
          );
        })}
      </Box>
      <Box sx={{ p: 1.5, borderTop: 1, borderColor: 'divider', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="body2"><b>{seleccion.size}</b> locales seleccionados</Typography>
        <Button variant="contained" onClick={onClose} sx={{ bgcolor: ROJO, '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none', fontWeight: 700 }}>Listo</Button>
      </Box>
    </Popover>
  );
}

// =====================================================================================
function Kpi({ titulo, valor, delta, deltaTexto, sentido, vs, nota }) {
  return (
    <Panel sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 0.75 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>{titulo}</Typography>
      <Typography sx={{ fontSize: 26, fontWeight: 800, lineHeight: 1.1 }}>{valor}</Typography>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
        <Delta valor={delta} texto={deltaTexto} sentido={sentido} />
        <Typography variant="caption" color="text.secondary">vs {vs}</Typography>
      </Box>
      {nota && <Typography variant="caption" color="text.secondary">{nota}</Typography>}
    </Panel>
  );
}

function TabResumen({ A, B, rangos, filas, sucursales }) {
  const c = useColores();
  const serie = useMemo(() => serieMensual(filas, rangos.a.hasta, 12, sucursales), [filas, rangos, sucursales]);
  const porGrupoA = useMemo(() => totalesPor(filas, rangos.a, sucursales, 'un'), [filas, rangos, sucursales]);
  const porGrupoB = useMemo(() => totalesPor(filas, rangos.b, sucursales, 'un'), [filas, rangos, sucursales]);
  const porLocal = useMemo(() => [...totalesPor(filas, rangos.a, sucursales, 'sucursal').entries()]
    .filter(([, t]) => t.ventasTotales > 0).sort((x, y) => y[1].mgPct - x[1].mgPct), [filas, rangos, sucursales]);

  const vVt = variacion(A.ventasTotales, B.ventasTotales);
  const vMg = variacion(A.mg, B.mg);
  const ratio = (k) => ({ delta: deltaPp(A[k], B[k]), deltaTexto: fmtPp(deltaPp(A[k], B[k])), vs: fmtPct(B[k]) });

  const vt = A.ventasTotales || 1;
  const partes = [
    { label: 'Producción (compras)', v: A.compras, color: c.dark ? '#b91c1c' : '#7f1d1d' },
    { label: 'Remuneraciones', v: A.rem, color: '#dc2626' },
    { label: 'Administración y ventas', v: A.adm, color: '#f87171' },
    { label: 'Indirectos de producción', v: A.gpi, color: '#fecaca' },
  ];
  // Diferencia entre el margen por secciones y el Margen Neto informado
  if (Math.abs(A.otros) / vt >= 0.0005) partes.push({ label: 'Otros ajustes', v: A.otros, color: c.dark ? '#6b7280' : '#9ca3af' });

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 1.75 }}>
        <Kpi titulo="Ventas totales" valor={fmtMM(A.ventasTotales)} delta={vVt} deltaTexto={fmtVar(vVt)} sentido="sube"
          vs={fmtMM(B.ventasTotales)} nota={`Agua ${fmtMM(A.ventasAgua)} · Despachos ${fmtMM(A.despachos)}`} />
        <Kpi titulo="Margen neto (MG)" valor={fmtMM(A.mg)} delta={vMg} deltaTexto={fmtVar(vMg)} sentido="sube"
          vs={fmtMM(B.mg)} nota={`MG % ${fmtPct(A.mgPct)} (${fmtPp(deltaPp(A.mgPct, B.mgPct))})`} />
        <Kpi titulo="GP % · Producción" valor={fmtPct(A.gpPct)} sentido="baja" {...ratio('gpPct')}
          nota={`${fmtMM(A.compras)} · sobre ventas − agua − despachos`} />
        <Kpi titulo="REM % · Remuneraciones" valor={fmtPct(A.remPct)} sentido="baja" {...ratio('remPct')}
          nota={`${fmtMM(A.rem)} · sobre ventas − agua`} />
        <Kpi titulo="ADM % · Adm. y ventas" valor={fmtPct(A.admPct)} sentido="baja" {...ratio('admPct')}
          nota={`${fmtMM(A.adm)} · sobre ventas − despachos`} />
        <Kpi titulo="GPI % · Indirectos" valor={fmtPct(A.gpiPct)} sentido="baja" {...ratio('gpiPct')}
          nota={`${fmtMM(A.gpi)} · sobre ventas − despachos`} />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 1.75 }}>
        <Panel>
          <Titulo extra={
            <Box sx={{ display: 'flex', gap: 2, fontSize: 12, color: c.suave }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: ROJO }} />Ventas totales</Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}><Box sx={{ width: 14, height: 2, bgcolor: c.texto }} />MG %</Box>
            </Box>
          }>Ventas y margen · últimos 12 meses</Titulo>
          <GraficoTendencia serie={serie} />
        </Panel>

        <Panel>
          <Titulo>¿A dónde va cada $100 vendidos?</Titulo>
          <Typography variant="caption" color="text.secondary">{nombreRango(rangos.a)} · sobre ventas totales</Typography>
          <Box sx={{ display: 'flex', height: 22, borderRadius: 1.5, overflow: 'hidden', my: 1.5, bgcolor: c.barra }}>
            {partes.map((p) => <Box key={p.label} sx={{ width: `${Math.max(0, (p.v / vt) * 100)}%`, bgcolor: p.color }} />)}
            <Box sx={{ width: `${Math.max(0, (A.mg / vt) * 100)}%`, bgcolor: c.bueno }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.1, fontSize: 13 }}>
            {partes.map((p) => (
              <Box key={p.label} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: p.color }} />
                <Box sx={{ flex: 1 }}>{p.label}</Box><b>${fmtSigno((p.v / vt) * 100).replace('+', '')}</b>
              </Box>
            ))}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, pt: 1, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ width: 10, height: 10, borderRadius: 0.5, bgcolor: c.bueno }} />
              <Box sx={{ flex: 1, fontWeight: 700 }}>Margen neto (MG)</Box>
              <b style={{ color: A.mg >= 0 ? c.bueno : c.malo }}>{A.mg < 0 ? '−' : ''}${fmtSigno(Math.abs(A.mg / vt) * 100).replace('+', '')}</b>
            </Box>
          </Box>
        </Panel>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 1.75 }}>
        <Panel>
          <Titulo>Por grupo de locales · {nombreRango(rangos.a)} vs {nombreRango(rangos.b)}</Titulo>
          <TableContainer>
            <Table size="small" sx={{ minWidth: 640 }}>
              <TableHead>
                <TableRow>
                  {['Grupo', 'Ventas', 'Var.', 'MG %', 'Δ pp', 'GP %', 'REM %', 'ADM %'].map((h, i) => (
                    <TableCell key={h} align={i ? 'right' : 'left'} sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {[...porGrupoA.entries()].sort((x, y) => y[1].ventasTotales - x[1].ventasTotales).map(([g, t]) => {
                  const b = porGrupoB.get(g);
                  const v = b ? variacion(t.ventasTotales, b.ventasTotales) : null;
                  const d = b ? deltaPp(t.mgPct, b.mgPct) : null;
                  return (
                    <TableRow key={g}>
                      <TableCell sx={{ fontWeight: 700 }}>{g}</TableCell>
                      <TableCell align="right">{fmtMM(t.ventasTotales)}</TableCell>
                      <TableCell align="right" sx={{ color: esBueno(v, 'sube') === false ? c.malo : c.bueno, fontWeight: 600 }}>{fmtVar(v)}</TableCell>
                      <TableCell align="right">
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                          <Box sx={{ width: 70, height: 6, bgcolor: c.barra, borderRadius: 1, overflow: 'hidden' }}>
                            <Box sx={{ height: 6, bgcolor: c.bueno, width: `${Math.min(100, Math.max(0, (t.mgPct || 0) / 0.25 * 100))}%` }} />
                          </Box>
                          <b>{fmtPct(t.mgPct)}</b>
                        </Box>
                      </TableCell>
                      <TableCell align="right" sx={{ color: esBueno(d, 'sube') === false ? c.malo : c.bueno, fontWeight: 600 }}>{fmtSigno(d)}</TableCell>
                      <TableCell align="right">{fmtPct(t.gpPct)}</TableCell>
                      <TableCell align="right">{fmtPct(t.remPct)}</TableCell>
                      <TableCell align="right">{fmtPct(t.admPct)}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Panel>

        <Panel>
          <Titulo>MG % por local</Titulo>
          <Typography variant="caption" fontWeight={700} sx={{ color: c.bueno }}>Mejores</Typography>
          {porLocal.slice(0, 5).map(([s, t]) => (
            <Box key={s} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, py: 0.4 }}><span>{s}</span><b>{fmtPct(t.mgPct)}</b></Box>
          ))}
          <Typography variant="caption" fontWeight={700} sx={{ color: c.malo, display: 'block', mt: 1.5 }}>Requieren atención</Typography>
          {porLocal.slice(-5).reverse().map(([s, t]) => (
            <Box key={s} sx={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, py: 0.4 }}><span>{s}</span><b style={{ color: c.malo }}>{fmtPct(t.mgPct)}</b></Box>
          ))}
        </Panel>
      </Box>
    </>
  );
}

function GraficoTendencia({ serie }) {
  const c = useColores();
  const W = 800, H = 262, base = 230, alto = 190, x0 = 60, paso = 58, ancho = 30;
  const maxV = Math.max(...serie.map((s) => s.ventasTotales), 1);
  const pcts = serie.map((s) => s.mgPct).filter((v) => v != null);
  const minP = pcts.length ? Math.floor(Math.min(...pcts) * 100 - 1) / 100 : 0;
  const maxP = pcts.length ? Math.ceil(Math.max(...pcts) * 100 + 1) / 100 : 0.2;
  const yP = (p) => base - ((p - minP) / (maxP - minP || 1)) * alto;
  const puntos = serie.map((s, i) => (s.mgPct == null ? null : [x0 + i * paso + ancho / 2, yP(s.mgPct)]));
  const ult = serie.length - 1;
  const etiqueta = `Ventas mensuales y MG %; ${MESES_CORTOS[mesDe(serie[ult].periodo) - 1]}: ${fmtMM(serie[ult].ventasTotales)}, ${fmtPct(serie[ult].mgPct)}`;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label={etiqueta} style={{ minWidth: 560, display: 'block' }}>
        {[0, 0.5, 1].map((f) => {
          const p = minP + (maxP - minP) * f;
          return (
            <g key={f}>
              <line x1="50" x2="760" y1={yP(p)} y2={yP(p)} stroke={c.linea} strokeDasharray={f ? '4 4' : undefined} />
              <text x="44" y={yP(p) + 4} textAnchor="end" fontSize="11" fill={c.suave}>{fmtPct(p)}</text>
            </g>
          );
        })}
        {serie.map((s, i) => {
          const h = (s.ventasTotales / maxV) * alto;
          const x = x0 + i * paso;
          return (
            <g key={s.periodo}>
              <rect x={x} y={base - h} width={ancho} height={h} rx="4" fill={i === ult ? ROJO : i === ult - 1 ? c.barraPrev : c.barra}>
                <title>{`${nombrePeriodo(s.periodo)}: ${fmtMM(s.ventasTotales)} · MG ${fmtPct(s.mgPct)}`}</title>
              </rect>
              <text x={x + ancho / 2} y="250" textAnchor="middle" fontSize="11" fontWeight={i === ult ? 700 : 400} fill={i === ult ? c.texto : c.suave}>
                {MESES_CORTOS[mesDe(s.periodo) - 1]}
              </text>
            </g>
          );
        })}
        <polyline points={puntos.filter(Boolean).map((p) => p.join(',')).join(' ')} fill="none" stroke={c.texto} strokeWidth="2" />
        {puntos.map((p, i) => p && (
          <circle key={i} cx={p[0]} cy={p[1]} r={i === ult ? 5 : 3.5} fill={i === ult ? c.texto : (c.dark ? '#1e1e1e' : '#fff')} stroke={c.texto} strokeWidth="2" />
        ))}
        {puntos[ult] && (
          <g>
            <rect x={puntos[ult][0] - 31} y={Math.max(4, puntos[ult][1] - 32)} width="62" height="22" rx="4" fill={c.texto} />
            <text x={puntos[ult][0]} y={Math.max(4, puntos[ult][1] - 32) + 15} textAnchor="middle" fontSize="12" fontWeight="700" fill={c.dark ? '#111' : '#fff'}>
              {fmtPct(serie[ult].mgPct)}
            </text>
          </g>
        )}
      </svg>
    </Box>
  );
}

// =====================================================================================
const SECCIONES = [
  { campo: 'compras', label: 'Gastos de producción', ratio: 'gpPct' },
  { campo: 'gpi', label: 'Gastos producción indirectos', ratio: 'gpiPct' },
  { campo: 'rem', label: 'Remuneraciones', ratio: 'remPct' },
  { campo: 'adm', label: 'Gastos de adm. y ventas', ratio: 'admPct' },
];

function TabComparativo({ A, B, rangos, sucursales, filtrado }) {
  const c = useColores();
  const [detalle, setDetalle] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [abiertos, setAbiertos] = useState(() => new Set(['ventas', 'compras']));
  const [completos, setCompletos] = useState(() => new Set());
  const [soloPct, setSoloPct] = useState(false);
  const clave = `${JSON.stringify(rangos)}|${filtrado ? [...sucursales].sort().join(',') : 'todos'}`;
  const ultimaClave = useRef('');

  useEffect(() => {
    ultimaClave.current = clave;
    setCargando(true);
    api.post('/eerr/detalle', { a: rangos.a, b: rangos.b, sucursales: filtrado ? [...sucursales] : undefined })
      .then((r) => { if (ultimaClave.current === clave) setDetalle(r.data); })
      .catch(() => { if (ultimaClave.current === clave) setDetalle([]); })
      .finally(() => { if (ultimaClave.current === clave) setCargando(false); });
  }, [clave]); // eslint-disable-line react-hooks/exhaustive-deps

  const porCampo = useMemo(() => {
    const m = {};
    for (const d of detalle) if (d.a || d.b) (m[d.campo] ||= []).push(d);
    Object.values(m).forEach((l) => l.sort((x, y) => Math.max(y.a, y.b) - Math.max(x.a, x.b)));
    return m;
  }, [detalle]);

  const toggle = (k, set) => set((s) => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });

  const mayores = useMemo(() => detalle.map((d) => ({ ...d, delta: d.a - d.b }))
    .filter((d) => d.delta).sort((x, y) => Math.abs(y.delta) - Math.abs(x.delta)).slice(0, 6), [detalle]);
  const nombreCampo = Object.fromEntries(SECCIONES.map((s) => [s.campo, s.label]));

  const Fila = ({ label, a, b, pctA, pctB, sentido, nivel = 0, caret, onClick, fuerte, fondo, colorLabel, sinVar }) => {
    const dv = a - b;
    const vp = sinVar ? null : variacion(a, b);
    const ok = esBueno(dv, sentido);
    const col = ok == null ? c.suave : ok ? c.bueno : c.malo;
    const pp = deltaPp(pctA, pctB);
    const okPp = esBueno(pp, sentido);
    return (
      <TableRow hover={!!onClick} onClick={onClick} sx={{ cursor: onClick ? 'pointer' : 'default', bgcolor: fondo }}>
        <TableCell sx={{ pl: nivel ? 5 : 1.5, fontWeight: fuerte ? 700 : 400, color: colorLabel }}>
          {caret != null && (caret ? <AbiertoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} /> : <CerradoIcon fontSize="small" sx={{ verticalAlign: 'middle', mr: 0.5 }} />)}
          {label}
        </TableCell>
        {!soloPct && <TableCell align="right" sx={{ color: c.suave }}>{fmtM(b)}</TableCell>}
        {!soloPct && <TableCell align="right" sx={{ fontWeight: fuerte ? 700 : 400 }}>{fmtM(a)}</TableCell>}
        {!soloPct && <TableCell align="right" sx={{ color: col }}>{fmtSigno(dv / 1e6)}</TableCell>}
        <TableCell align="right" sx={{ color: col, fontWeight: 600 }}>{fmtVar(vp)}</TableCell>
        <TableCell align="right">{pctA != null ? fmtPct(pctA) : ''}</TableCell>
        <TableCell align="right" sx={{ color: okPp == null ? c.suave : okPp ? c.bueno : c.malo }}>{pctA != null && pp != null ? fmtSigno(pp) : ''}</TableCell>
      </TableRow>
    );
  };

  const Detalle = ({ campo }) => {
    const lista = porCampo[campo] || [];
    const visibles = completos.has(campo) ? lista : lista.slice(0, 10);
    return (
      <>
        {visibles.map((d) => <Fila key={d.concepto} label={d.concepto} a={d.a} b={d.b} sentido="baja" nivel={1} />)}
        {lista.length > 10 && (
          <TableRow><TableCell colSpan={7} sx={{ pl: 5 }}>
            <Button size="small" onClick={() => toggle(campo, setCompletos)} sx={{ textTransform: 'none', color: ROJO }}>
              {completos.has(campo) ? 'Ver menos' : `Ver los ${lista.length} conceptos`}
            </Button>
          </TableCell></TableRow>
        )}
        {cargando && !lista.length && <TableRow><TableCell colSpan={7} sx={{ pl: 5 }}><LinearProgress sx={{ maxWidth: 200 }} /></TableCell></TableRow>}
      </>
    );
  };

  return (
    <>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, alignItems: 'stretch' }}>
        <Panel sx={{ flex: '1 1 220px', border: `2px solid ${ROJO}`, py: 1.75 }}>
          <Typography variant="caption" fontWeight={700} sx={{ color: ROJO }}>PERÍODO A · ACTUAL</Typography>
          <Typography variant="h6" fontWeight={800}>{nombreRango(rangos.a)}</Typography>
        </Panel>
        <Box sx={{ display: 'flex', alignItems: 'center', fontWeight: 700, color: c.suave }}>vs</Box>
        <Panel sx={{ flex: '1 1 220px', py: 1.75 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">PERÍODO B · COMPARACIÓN</Typography>
          <Typography variant="h6" fontWeight={800}>{nombreRango(rangos.b)}</Typography>
        </Panel>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' }, gap: 1.75 }}>
        <Panel>
          <Titulo extra={
            <ToggleButtonGroup size="small" exclusive value={soloPct ? 'pct' : 'todo'} onChange={(_, v) => v && setSoloPct(v === 'pct')}
              sx={{ '& .MuiToggleButton-root': { textTransform: 'none' } }}>
              <ToggleButton value="todo">$ y %</ToggleButton>
              <ToggleButton value="pct">Solo %</ToggleButton>
            </ToggleButtonGroup>
          }>Estado de resultados · millones de pesos</Titulo>
          <TableContainer>
            <Table size="small" sx={{ minWidth: soloPct ? 420 : 700 }}>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>Concepto</TableCell>
                  {!soloPct && <TableCell align="right" sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>{nombreCorto(rangos.b.hasta)}{rangos.b.desde !== rangos.b.hasta ? ' (B)' : ''}</TableCell>}
                  {!soloPct && <TableCell align="right" sx={{ fontWeight: 700, fontSize: 12 }}>{nombreCorto(rangos.a.hasta)}{rangos.a.desde !== rangos.a.hasta ? ' (A)' : ''}</TableCell>}
                  {!soloPct && <TableCell align="right" sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>Var. $</TableCell>}
                  <TableCell align="right" sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>Var. %</TableCell>
                  <TableCell align="right" sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>Ratio</TableCell>
                  <TableCell align="right" sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>Δ pp</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <Fila label="Ventas totales" a={A.ventasTotales} b={B.ventasTotales} sentido="sube" fuerte fondo={c.filaSeccion}
                  caret={abiertos.has('ventas')} onClick={() => toggle('ventas', setAbiertos)} />
                {abiertos.has('ventas') && (
                  <>
                    <Fila label="Ventas agua" a={A.ventasAgua} b={B.ventasAgua} sentido="sube" nivel={1} />
                    <Fila label="Despachos" a={A.despachos} b={B.despachos} nivel={1} />
                  </>
                )}
                {SECCIONES.map((s) => (
                  <React.Fragment key={s.campo}>
                    <Fila label={s.label} a={A[s.campo]} b={B[s.campo]} pctA={A[s.ratio]} pctB={B[s.ratio]} sentido="baja" fuerte
                      fondo={c.filaSeccion} caret={abiertos.has(s.campo)} onClick={() => toggle(s.campo, setAbiertos)} />
                    {abiertos.has(s.campo) && <Detalle campo={s.campo} />}
                  </React.Fragment>
                ))}
                {(Math.abs(A.otros) >= 1 || Math.abs(B.otros) >= 1) && (
                  <Fila label="Otros ajustes (diferencia con Margen Neto)" a={A.otros} b={B.otros} sentido="baja" fuerte fondo={c.filaSeccion} sinVar />
                )}
                <Fila label="Margen neto (MG)" a={A.mg} b={B.mg} pctA={A.mgPct} pctB={B.mgPct} sentido="sube" fuerte
                  fondo={c.buenoBg} colorLabel={c.bueno} />
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
            Verde = favorable al margen, rojo = desfavorable (en gastos, subir es rojo). Ratios como en Hoja3: Producción sobre ventas − agua − despachos;
            Remuneraciones sobre ventas − agua; Indirectos y Adm. sobre ventas − despachos. Margen neto = concepto «Margen Neto» de la sección Resumen;
            «Otros ajustes» es la diferencia entre ese margen y Ventas − secciones de gasto.
          </Typography>
        </Panel>

        <Panel>
          <Titulo>Puente del margen</Titulo>
          <Typography variant="caption" color="text.secondary">De {fmtMM(B.mg)} ({nombreCorto(rangos.b.hasta)}) a {fmtMM(A.mg)} ({nombreCorto(rangos.a.hasta)})</Typography>
          <GraficoPuente A={A} B={B} rangos={rangos} />
          <Typography variant="subtitle2" fontWeight={700} mt={1}>Mayores variaciones por concepto</Typography>
          {mayores.map((m) => (
            <Box key={`${m.campo}|${m.concepto}`} sx={{ display: 'flex', alignItems: 'center', gap: 1, fontSize: 13, py: 0.75, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ flex: 1 }}>{m.concepto} <Typography component="span" variant="caption" color="text.secondary">· {nombreCampo[m.campo]}</Typography></Box>
              <b style={{ color: m.delta > 0 ? c.malo : c.bueno }}>{fmtSigno(m.delta / 1e6)} M</b>
            </Box>
          ))}
          {!mayores.length && !cargando && <Typography variant="body2" color="text.secondary">Sin variaciones.</Typography>}
        </Panel>
      </Box>
    </>
  );
}

function GraficoPuente({ A, B, rangos }) {
  const c = useColores();
  const pasos = [
    { label: `MG ${nombreCorto(rangos.b.hasta).split(' ')[0]}`, total: B.mg },
    { label: 'Ventas', d: A.ventasTotales - B.ventasTotales },
    { label: 'Producc.', d: -(A.compras - B.compras) },
    { label: 'Indirect.', d: -(A.gpi - B.gpi) },
    { label: 'Remun.', d: -(A.rem - B.rem) },
    { label: 'Adm.', d: -(A.adm - B.adm) },
    { label: 'Otros', d: -(A.otros - B.otros) },
    { label: `MG ${nombreCorto(rangos.a.hasta).split(' ')[0]}`, total: A.mg },
  ];
  let acum = 0;
  const barras = pasos.map((p) => {
    if (p.total != null) { acum = p.total; return { ...p, desde: 0, hasta: p.total }; }
    const desde = acum; acum += p.d; return { ...p, desde, hasta: acum };
  });
  const vals = barras.flatMap((b) => [b.desde, b.hasta]);
  const max = Math.max(...vals, 0), min = Math.min(...vals, 0);
  const top = 30, alto = 190;
  const y = (v) => top + ((max - v) / (max - min || 1)) * alto;
  const paso = 600 / barras.length;

  return (
    <Box sx={{ overflowX: 'auto' }}>
      <svg viewBox="0 0 620 262" width="100%" role="img" style={{ minWidth: 420, display: 'block' }}
        aria-label={barras.map((b) => `${b.label} ${b.total != null ? fmtM(b.total) : fmtSigno(b.d / 1e6)}`).join('; ')}>
        <line x1="10" x2="610" y1={y(0)} y2={y(0)} stroke={c.linea} />
        {barras.map((b, i) => {
          const x = 20 + i * paso;
          const y1 = y(Math.max(b.desde, b.hasta));
          const h = Math.max(2, Math.abs(y(b.desde) - y(b.hasta)));
          const color = b.total != null ? (i === 0 ? '#9ca3af' : c.texto) : b.d >= 0 ? c.bueno : c.malo;
          const txt = b.total != null ? fmtM(b.total) : fmtSigno(b.d / 1e6);
          return (
            <g key={b.label}>
              <rect x={x} y={y1} width={paso - 26} height={h} rx="3" fill={color} />
              <text x={x + (paso - 26) / 2} y={y1 - 6} textAnchor="middle" fontSize="11" fontWeight="700"
                fill={b.total != null ? c.texto : color}>{txt}</text>
              <text x={x + (paso - 26) / 2} y="252" textAnchor="middle" fontSize="11" fill={c.suave}>{b.label}</text>
            </g>
          );
        })}
      </svg>
    </Box>
  );
}

// =====================================================================================
const COLUMNAS_LOCALES = [
  { id: 'sucursal', label: 'Local', align: 'left' },
  { id: 'un', label: 'Grupo', align: 'left' },
  { id: 'analista', label: 'Analista', align: 'left' },
  { id: 'ventas', label: 'Ventas' },
  { id: 'varVentas', label: 'Var.' },
  { id: 'mgPct', label: 'MG %' },
  { id: 'dMg', label: 'Δ pp' },
  { id: 'gpPct', label: 'GP %' },
  { id: 'remPct', label: 'REM %' },
  { id: 'admPct', label: 'ADM %' },
];

function TabLocales({ rangos, filas, sucursales, catalogo, onVerSeleccion }) {
  const c = useColores();
  const [orden, setOrden] = useState({ id: 'ventas', dir: 'desc' });
  const [marcados, setMarcados] = useState(() => new Set());
  const [busca, setBusca] = useState('');

  const filasLocales = useMemo(() => {
    const a = totalesPor(filas, rangos.a, sucursales, 'sucursal');
    const b = totalesPor(filas, rangos.b, sucursales, 'sucursal');
    return [...a.entries()].filter(([, t]) => t.ventasTotales > 0).map(([s, t]) => {
      const p = b.get(s);
      return {
        sucursal: s, un: catalogo.get(s)?.un || '', analista: catalogo.get(s)?.analista || '',
        ventas: t.ventasTotales, varVentas: p ? variacion(t.ventasTotales, p.ventasTotales) : null,
        mgPct: t.mgPct, dMg: p ? deltaPp(t.mgPct, p.mgPct) : null,
        gpPct: t.gpPct, remPct: t.remPct, admPct: t.admPct,
      };
    });
  }, [filas, rangos, sucursales, catalogo]);

  const ordenadas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    const l = filasLocales.filter((f) => !q || f.sucursal.toLowerCase().includes(q));
    const k = orden.id;
    return l.sort((x, y) => {
      const vx = x[k] ?? -Infinity, vy = y[k] ?? -Infinity;
      const r = typeof vx === 'string' ? vx.localeCompare(vy) : vx - vy;
      return orden.dir === 'asc' ? r : -r;
    });
  }, [filasLocales, orden, busca]);

  const cuenta = (f) => filasLocales.filter(f).length;
  const alertas = useMemo(() => {
    const l = [];
    for (const f of filasLocales) {
      if (f.varVentas != null && (f.varVentas > 0.5 || f.varVentas < -0.3)) l.push({ s: f.sucursal, t: `ventas ${fmtVar(f.varVentas)} · revisar dato`, peso: Math.abs(f.varVentas) * 10 });
      if (f.dMg != null && f.dMg <= -5) l.push({ s: f.sucursal, t: `MG ${fmtPp(f.dMg)}`, peso: -f.dMg });
    }
    return l.sort((x, y) => y.peso - x.peso).slice(0, 5);
  }, [filasLocales]);

  const semaforo = (v) => (v == null ? {} : v >= SEMAFORO_MG.bueno ? { bg: c.buenoBg, tx: c.bueno } : v >= SEMAFORO_MG.regular ? { bg: c.ambar, tx: c.ambarTx } : { bg: c.maloBg, tx: c.malo });
  const fondoUmbral = (v, u) => (v != null && v > u ? c.ambar : undefined);

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: 1.75 }}>
        <Panel><Typography variant="caption" color="text.secondary" fontWeight={600}>MG % ≥ {SEMAFORO_MG.bueno * 100}%</Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.bueno }}>{cuenta((f) => f.mgPct >= SEMAFORO_MG.bueno)} <Typography component="span" variant="body2" color="text.secondary">locales</Typography></Typography></Panel>
        <Panel><Typography variant="caption" color="text.secondary" fontWeight={600}>ENTRE {SEMAFORO_MG.regular * 100}% Y {SEMAFORO_MG.bueno * 100}%</Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.ambarTx }}>{cuenta((f) => f.mgPct >= SEMAFORO_MG.regular && f.mgPct < SEMAFORO_MG.bueno)} <Typography component="span" variant="body2" color="text.secondary">locales</Typography></Typography></Panel>
        <Panel><Typography variant="caption" color="text.secondary" fontWeight={600}>BAJO {SEMAFORO_MG.regular * 100}%</Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 800, color: c.malo }}>{cuenta((f) => f.mgPct < SEMAFORO_MG.regular)} <Typography component="span" variant="body2" color="text.secondary">locales</Typography></Typography></Panel>
        <Panel>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>ALERTAS DEL PERÍODO</Typography>
          {alertas.length ? alertas.map((a, i) => (
            <Typography key={i} variant="body2" sx={{ mt: 0.5 }}><b>{a.s}</b> {a.t}</Typography>
          )) : <Typography variant="body2" sx={{ mt: 0.5 }}>Sin alertas.</Typography>}
        </Panel>
      </Box>

      <Panel>
        <Titulo extra={
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <TextField size="small" placeholder="Buscar local…" value={busca} onChange={(e) => setBusca(e.target.value)}
              slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> } }} />
            <Button variant="contained" disabled={!marcados.size} onClick={() => onVerSeleccion(new Set(marcados))}
              sx={{ textTransform: 'none', fontWeight: 600, bgcolor: c.dark ? '#e5e7eb' : '#1f2937', color: c.dark ? '#111' : '#fff', '&:hover': { bgcolor: c.dark ? '#fff' : '#111827' } }}>
              Ver EERR de {marcados.size || ''} seleccionados
            </Button>
          </Box>
        }>Ranking de locales · {nombreRango(rangos.a)} vs {nombreRango(rangos.b)}</Titulo>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 960 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox" />
                {COLUMNAS_LOCALES.map((col) => (
                  <TableCell key={col.id} align={col.align || 'right'} sortDirection={orden.id === col.id ? orden.dir : false}
                    sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>
                    <TableSortLabel active={orden.id === col.id} direction={orden.id === col.id ? orden.dir : 'desc'}
                      onClick={() => setOrden((o) => ({ id: col.id, dir: o.id === col.id && o.dir === 'desc' ? 'asc' : 'desc' }))}>
                      {col.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {ordenadas.map((f) => {
                const sem = semaforo(f.mgPct);
                return (
                  <TableRow key={f.sucursal} hover>
                    <TableCell padding="checkbox">
                      <Checkbox size="small" checked={marcados.has(f.sucursal)} sx={{ '&.Mui-checked': { color: ROJO } }}
                        onChange={() => setMarcados((s) => { const n = new Set(s); n.has(f.sucursal) ? n.delete(f.sucursal) : n.add(f.sucursal); return n; })}
                        slotProps={{ input: { 'aria-label': `Seleccionar ${f.sucursal}` } }} />
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{f.sucursal}</TableCell>
                    <TableCell><Chip size="small" label={f.un} sx={{ fontWeight: 700, fontSize: 11 }} /></TableCell>
                    <TableCell sx={{ color: c.suave }}>{f.analista}</TableCell>
                    <TableCell align="right">{fmtMM(f.ventas)}</TableCell>
                    <TableCell align="right" sx={{ color: f.varVentas == null ? c.suave : f.varVentas >= 0 ? c.bueno : c.malo }}>{fmtVar(f.varVentas)}</TableCell>
                    <TableCell align="right">
                      <Box component="span" sx={{ display: 'inline-block', minWidth: 56, px: 1, py: 0.25, borderRadius: 1.5, fontWeight: 700, bgcolor: sem.bg, color: sem.tx }}>{fmtPct(f.mgPct)}</Box>
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 600, color: f.dMg == null ? c.suave : f.dMg >= 0 ? c.bueno : c.malo }}>{fmtSigno(f.dMg)}</TableCell>
                    <TableCell align="right" sx={{ bgcolor: fondoUmbral(f.gpPct, UMBRALES.gp) }}>{fmtPct(f.gpPct)}</TableCell>
                    <TableCell align="right" sx={{ bgcolor: fondoUmbral(f.remPct, UMBRALES.rem) }}>{fmtPct(f.remPct)}</TableCell>
                    <TableCell align="right" sx={{ bgcolor: fondoUmbral(f.admPct, UMBRALES.adm) }}>{fmtPct(f.admPct)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
        <Typography variant="caption" color="text.secondary" display="block" mt={1.5}>
          Celdas ámbar: ratio sobre el umbral (GP &gt; {UMBRALES.gp * 100}%, REM &gt; {UMBRALES.rem * 100}%, ADM &gt; {UMBRALES.adm * 100}%).
          Se ajustan en <code>UMBRALES</code> de <code>utils/eerr.js</code>.
        </Typography>
      </Panel>
    </>
  );
}

// =====================================================================================
function TabCargas({ puedeCargar, onCargado }) {
  const c = useColores();
  const [archivo, setArchivo] = useState(null);
  const [modo, setModo] = useState('meses');
  const [progreso, setProgreso] = useState(null); // null | 0-100 | 'procesando'
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [historial, setHistorial] = useState([]);
  const [arrastrando, setArrastrando] = useState(false);
  const inputRef = useRef(null);

  const cargarHistorial = useCallback(() => {
    api.get('/eerr/cargas').then((r) => setHistorial(r.data)).catch(() => {});
  }, []);
  useEffect(() => { cargarHistorial(); }, [cargarHistorial]);

  const elegir = (f) => {
    setResultado(null); setError('');
    if (!f) return;
    if (!/\.xlsx$/i.test(f.name)) { setError('El archivo debe ser .xlsx'); return; }
    setArchivo(f);
  };

  const subir = async () => {
    if (!archivo) return;
    setError(''); setResultado(null); setProgreso(0);
    const fd = new FormData();
    fd.append('modo', modo);
    fd.append('archivo', archivo);
    try {
      const r = await api.post('/eerr/cargar', fd, {
        timeout: 10 * 60 * 1000,
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => {
          if (!e.total) return;
          const p = Math.round((e.loaded / e.total) * 100);
          setProgreso(p >= 100 ? 'procesando' : p);
        },
      });
      setResultado(r.data);
      setArchivo(null);
      cargarHistorial();
      onCargado();
    } catch (e) {
      setError(e.response?.data?.message || (e.code === 'ECONNABORTED' ? 'El servidor tardó demasiado en responder' : 'No se pudo cargar el archivo'));
    } finally {
      setProgreso(null);
    }
  };

  const enCurso = progreso != null;
  const rs = resultado?.resumen;

  return (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.75 }}>
        <Panel>
          <Titulo>Cargar archivo consolidado</Titulo>
          {!puedeCargar ? (
            <Alert severity="info">Solo Master y Gerencia pueden cargar el Excel.</Alert>
          ) : (
            <>
              <Box component="label"
                onDragOver={(e) => { e.preventDefault(); setArrastrando(true); }}
                onDragLeave={() => setArrastrando(false)}
                onDrop={(e) => { e.preventDefault(); setArrastrando(false); elegir(e.dataTransfer.files?.[0]); }}
                sx={{
                  border: `2px dashed ${arrastrando ? ROJO : (c.dark ? '#7f2a2a' : '#f4a0a0')}`, borderRadius: 3, p: 4,
                  bgcolor: arrastrando ? (c.dark ? 'rgba(242,0,0,0.12)' : '#ffecec') : (c.dark ? 'rgba(242,0,0,0.05)' : '#fff8f8'),
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, textAlign: 'center',
                  cursor: enCurso ? 'default' : 'pointer',
                }}>
                <UploadIcon sx={{ fontSize: 40, color: ROJO }} />
                <Typography fontWeight={700}>{archivo ? archivo.name : 'Arrastra el Excel aquí o haz clic para buscarlo'}</Typography>
                <Typography variant="caption" color="text.secondary">
                  {archivo ? `${(archivo.size / 1e6).toFixed(1)} MB` : '.xlsx · se lee la hoja EERR_Consolidado · hasta 60 MB'}
                </Typography>
                <input ref={inputRef} type="file" accept=".xlsx" hidden disabled={enCurso}
                  onChange={(e) => { elegir(e.target.files?.[0]); e.target.value = ''; }} />
              </Box>
              <Typography variant="body2" color="text.secondary" mt={1.5}>
                Columnas requeridas: sucursal · un · analista · anio · mes_num · seccion · concepto · valor
              </Typography>
              <RadioGroup value={modo} onChange={(e) => setModo(e.target.value)} sx={{ mt: 1 }}>
                <FormControlLabel value="meses" disabled={enCurso} control={<Radio sx={{ '&.Mui-checked': { color: ROJO } }} />}
                  label="Reemplazar solo los meses que vienen en el archivo" />
                <FormControlLabel value="todo" disabled={enCurso} control={<Radio sx={{ '&.Mui-checked': { color: ROJO } }} />}
                  label="Reemplazar todo el histórico" />
              </RadioGroup>
              {enCurso && (
                <Box sx={{ mt: 1 }}>
                  <LinearProgress variant={progreso === 'procesando' ? 'indeterminate' : 'determinate'} value={typeof progreso === 'number' ? progreso : 0}
                    sx={{ '& .MuiLinearProgress-bar': { bgcolor: ROJO } }} />
                  <Typography variant="caption" color="text.secondary">
                    {progreso === 'procesando' ? 'Procesando el archivo en el servidor… (puede tardar unos segundos)' : `Subiendo ${progreso}%`}
                  </Typography>
                </Box>
              )}
              {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
              <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 2 }}>
                {archivo && !enCurso && <Button onClick={() => setArchivo(null)} sx={{ textTransform: 'none' }} color="inherit">Quitar</Button>}
                <Button variant="contained" disabled={!archivo || enCurso} onClick={subir}
                  sx={{ bgcolor: ROJO, '&:hover': { bgcolor: '#b71c1c' }, textTransform: 'none', fontWeight: 700 }}>
                  Importar
                </Button>
              </Box>
            </>
          )}
        </Panel>

        <Panel>
          <Titulo>Resultado de la última importación</Titulo>
          {!rs ? (
            <Typography variant="body2" color="text.secondary">Aquí aparece la validación del archivo después de importarlo.</Typography>
          ) : (
            [
              { t: `${fmtNum(rs.filas)} filas leídas`, d: `${rs.locales} locales · grupos ${rs.grupos.join(', ')} · ${rs.analistas.length} analistas` },
              { t: `Períodos: ${nombreCorto(rs.periodos[0])} – ${nombreCorto(rs.periodos.at(-1))}`, d: `${rs.periodos.length} meses ${resultado.carga.modo === 'todo' ? '(se reemplazó todo el histórico)' : 'reemplazados'}` },
              rs.conceptosUnificados.length ? {
                t: `${rs.conceptosUnificados.length} conceptos escritos de distintas formas fueron unificados`,
                d: rs.conceptosUnificados.slice(0, 3).map((u) => `«${u.variantes.join('», «')}» → ${u.concepto}`).join(' · '),
              } : null,
              rs.filasOmitidas ? { t: `${fmtNum(rs.filasOmitidas)} filas omitidas`, d: 'Sin sucursal, año o mes' } : null,
            ].filter(Boolean).map((x) => (
              <Box key={x.t} sx={{ display: 'flex', gap: 1.25, py: 1, borderTop: 1, borderColor: 'divider' }}>
                <OkIcon sx={{ color: c.bueno, fontSize: 20, mt: 0.25 }} />
                <Box><Typography variant="body2" fontWeight={600}>{x.t}</Typography><Typography variant="caption" color="text.secondary">{x.d}</Typography></Box>
              </Box>
            ))
          )}
        </Panel>
      </Box>

      <Panel>
        <Titulo>Historial de cargas</Titulo>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 640 }}>
            <TableHead>
              <TableRow>
                {['Fecha', 'Archivo', 'Usuario', 'Meses', 'Filas', 'Modo'].map((h) => (
                  <TableCell key={h} sx={{ color: c.suave, fontWeight: 600, fontSize: 12 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {historial.map((h, i) => (
                <TableRow key={h._id}>
                  <TableCell>{new Date(h.createdAt).toLocaleString('es-CL')}</TableCell>
                  <TableCell>
                    {h.archivo}
                    {i === 0 && <Chip size="small" label="Última" sx={{ ml: 1, fontWeight: 700, bgcolor: c.buenoBg, color: c.bueno }} />}
                  </TableCell>
                  <TableCell>{h.usuarioNombre || '—'}</TableCell>
                  <TableCell>{h.desde ? `${nombreCorto(h.desde)} – ${nombreCorto(h.hasta)}` : '—'}</TableCell>
                  <TableCell>{fmtNum(h.filas)}</TableCell>
                  <TableCell>{h.modo === 'todo' ? 'Todo el histórico' : 'Solo sus meses'}</TableCell>
                </TableRow>
              ))}
              {!historial.length && <TableRow><TableCell colSpan={6} sx={{ color: c.suave }}>Aún no hay cargas.</TableCell></TableRow>}
            </TableBody>
          </Table>
        </TableContainer>
      </Panel>
    </>
  );
}
