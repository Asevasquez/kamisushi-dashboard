// dashboard/src/pages/DashboardSupervision.jsx
// Página nueva e independiente (no reemplaza Dashboard.jsx / DashboardKPI.jsx / DashboardModerno.jsx).
// Consume /dashboard-supervision/meses, /resumen y /reclamos (backend nuevo).
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Typography, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Paper, Button, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Divider, Checkbox, ListItemText, TextField,
} from '@mui/material';
import { Refresh as RefreshIcon, RestartAlt as RestartAltIcon, Download as DownloadIcon, CalendarMonth as CalendarMonthIcon } from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line,
} from 'recharts';
import api from '../services/api';
import ExcelJS from 'exceljs';

// Etiqueta y color de severidad para el export "resumen" (mismo criterio que dashboardSupervision.js)
const SEVERIDAD_LABEL = { ALTO: 'CLASIFICACION_GRADO_ALTO', MEDIO: 'CLASIFICACION_GRADO_MEDIO', BAJO: 'CLASIFICACION_GRADO_BAJO' };
const SEVERIDAD_FILL = { ALTO: 'FFC00000', MEDIO: 'FFFFA500', BAJO: 'FF70AD47' }; // rojo, naranjo, verde (ARGB para exceljs)
const SEVERIDAD_FONT = { ALTO: 'FFFFFFFF', MEDIO: 'FF7F3F00', BAJO: 'FFFFFFFF' };

function fmtFechaDDMMAAAA(fecha) {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = d.getFullYear();
  return `${dd}-${mm}-${aaaa}`;
}

function fmtFechaConGuiones(fecha) {
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return '';
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const aaaa = d.getFullYear();
  return `${dd}-${mm}-${aaaa}`;
}

// Deja solo los 8 dígitos del número móvil, quitando el código de país (56)
// y el 9 inicial de celular si vienen incluidos — "+56 9 1234 5678" -> "12345678"
// Deja solo los 9 dígitos del número móvil (el 9 inicial + los 8 siguientes),
// quitando el código de país (56) si viene incluido — "+56 9 1234 5678" -> "912345678"
function limpiarTelefono(tel) {
  if (!tel) return '';
  let d = String(tel).replace(/\D/g, '');
  if (d.startsWith('56') && d.length > 9) d = d.slice(2);
  return d;
}

async function descargarWorkbook(workbook, nombreArchivo) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

const COLOR_CATEGORIA = {
  'PÉSIMO': '#f20000',
  MALO: '#f44336',
  REGULAR: '#ff9800',
  BUENO: '#2196f3',
  'MUY BUENO': '#8bc34a',
  EXCELENTE: '#4caf50',
  'SIN CATEGORÍA': '#9e9e9e',
};

const CATEGORIAS = ['EXCELENTE', 'MUY BUENO', 'BUENO', 'REGULAR', 'MALO', 'PÉSIMO'];

const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

function labelMes(valor) {
  // valor: 'YYYY-MM'
  const [anio, mes] = valor.split('-').map(Number);
  return `${NOMBRES_MES[mes - 1]} ${anio}`;
}

function fmtPct(n) {
  return `${(n || 0).toFixed(1)}%`;
}

function colorPorCumplimiento(pct) {
  if (pct >= 80) return '#2e7d32';
  if (pct >= 60) return '#1976d2';
  if (pct >= 40) return '#f57c00';
  return '#f20000';
}

function KpiCard({ label, value, sub, color, icon }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, height: '100%', borderBottom: `3px solid ${color || '#e0e0e0'}` }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', letterSpacing: 0.5, fontWeight: 600, fontSize: 13 }}>
        {icon ? `${icon} ` : ''}{label.toUpperCase()}
      </Typography>
      <Typography variant="h3" fontWeight={800} sx={{ color: color || 'text.primary', mt: 0.75 }}>
        {value}
      </Typography>
      {sub && <Typography variant="body2" color="text.secondary" fontSize={13}>{sub}</Typography>}
    </Paper>
  );
}

function BarraCumplimiento({ label, pct, color, valueLabel }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color }}>{valueLabel ?? fmtPct(pct)}</Typography>
      </Box>
      <Box sx={{ height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{ height: '100%', width: `${Math.min(pct || 0, 100)}%`, bgcolor: color, borderRadius: 4 }} />
      </Box>
    </Box>
  );
}

export default function DashboardSupervision() {
  const [tab, setTab] = useState('resumen'); // 'resumen' | 'reclamos'
  const [meses, setMeses] = useState([]);
  const [locales, setLocales] = useState([]);
  const [supervisoresLista, setSupervisoresLista] = useState([]);

  const [mes, setMes] = useState('');
  const [supervisorId, setSupervisorId] = useState('');
  const [localIds, setLocalIds] = useState([]);
  const [categoria, setCategoria] = useState('');
  const [exportDesde, setExportDesde] = useState('');
  const [exportHasta, setExportHasta] = useState('');

  const [resumen, setResumen] = useState(null);
  const [reclamos, setReclamos] = useState(null);
  const [preguntasTab, setPreguntasTab] = useState('servicioCliente');
  const [loading, setLoading] = useState(true);

  // Filtros disponibles (meses según acceso del usuario, locales y supervisores de rutas ya existentes)
  useEffect(() => {
    api.get('/dashboard-supervision/meses')
      .then(res => {
        setMeses(res.data || []);
        if ((res.data || []).length > 0) setMes(res.data[0]);
      })
      .catch(err => console.error('Error cargando meses:', err));

    api.get('/estadisticas/mis-locales')
      .then(res => setLocales(res.data || []))
      .catch(err => console.error('Error cargando locales:', err));

    api.get('/supervisores')
      .then(res => setSupervisoresLista(res.data || []))
      .catch(() => setSupervisoresLista([])); // puede no estar disponible para todos los roles
  }, []);

  const params = useMemo(() => {
    const p = {};
    if (mes) p.mes = mes;
    if (supervisorId) p.supervisorId = supervisorId;
    if (localIds.length > 0) p.localId = localIds.join(',');
    if (categoria) p.categoria = categoria;
    return p;
  }, [mes, supervisorId, localIds, categoria]);

  const cargarDatos = () => {
    setLoading(true);
    Promise.all([
      api.get('/dashboard-supervision/resumen', { params }),
      api.get('/dashboard-supervision/reclamos', { params }),
    ]).then(([r1, r2]) => {
      setResumen(r1.data);
      setReclamos(r2.data);
    }).catch(err => console.error('Error cargando Dashboard Supervisión:', err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const resetFiltros = () => {
    setSupervisorId(''); setLocalIds([]); setCategoria('');
    if (meses.length > 0) setMes(meses[0]);
  };

  // ─── Exportar "tabla tal cual" — mismas columnas que se ven en pantalla ───
  // Filtra por la fecha de la REVISIÓN (no la fecha propia del reclamo, que puede
  // ser distinta) — usado solo al exportar, independiente del filtro "Mes" general.
  // Convierte "YYYY-MM-DD" (lo que entrega <input type="date">) a un Date en
  // horario LOCAL a medianoche — new Date("YYYY-MM-DD") lo interpreta como
  // medianoche UTC, lo que en Chile corre la fecha al día anterior por la tarde/noche.
  const parseFechaInputLocal = (str) => {
    const [y, m, d] = str.split('-').map(Number);
    return new Date(y, m - 1, d);
  };

  const filtrarPorFechaRevision = (lista) => {
    if (!exportDesde && !exportHasta) return lista;
    const desde = exportDesde ? parseFechaInputLocal(exportDesde) : null;
    const hasta = exportHasta ? parseFechaInputLocal(exportHasta) : null;
    if (hasta) hasta.setHours(23, 59, 59, 999);
    return lista.filter(r => {
      const f = new Date(r.fechaRevision);
      if (desde && f < desde) return false;
      if (hasta && f > hasta) return false;
      return true;
    });
  };

  const exportarTablaCompleta = async () => {
    const lista = filtrarPorFechaRevision(reclamos?.reclamos || []);
    if (!lista.length) { window.alert('No hay reclamos para exportar con el filtro de fecha actual.'); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Reclamos');
    ws.columns = [
      { header: 'Fecha', key: 'fecha', width: 12 },
      { header: 'Tipo', key: 'tipo', width: 30 },
      { header: 'Local', key: 'local', width: 20 },
      { header: 'Fecha Revisión', key: 'fechaRevision', width: 14 },
      { header: 'Código Local', key: 'codigoLocal', width: 14 },
      { header: 'Supervisor', key: 'supervisor', width: 18 },
      { header: 'Solución', key: 'solucion', width: 14 },
      { header: 'Monto', key: 'monto', width: 12 },
      { header: 'Teléfono', key: 'telefono', width: 15 },
      { header: 'Comentario', key: 'comentario', width: 45 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD32F2F' } };

    lista.forEach(r => {
      const monto = parseFloat(String(r.montoCompensacion || '0').replace(/[^\d.-]/g, '')) || 0;
      ws.addRow({
        fecha: fmtFechaDDMMAAAA(r.fecha),
        tipo: r.tipo,
        local: r.localNombre,
        fechaRevision: fmtFechaDDMMAAAA(r.fechaRevision),
        codigoLocal: r.localCodigo || '',
        supervisor: r.supervisor,
        solucion: r.entregoSolucion,
        monto: monto > 0 ? monto : '',
        telefono: limpiarTelefono(r.telefono),
        comentario: r.comentario || '',
      });
    });

    await descargarWorkbook(wb, `reclamos_tabla_${fmtFechaDDMMAAAA(new Date())}.xlsx`);
  };

  // ─── Exportar "resumen" — formato para carga manual de datos del cliente ───
  const exportarResumen = async () => {
    const lista = filtrarPorFechaRevision(reclamos?.reclamos || []);
    if (!lista.length) { window.alert('No hay reclamos para exportar con el filtro de fecha actual.'); return; }
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Resumen');
    ws.columns = [
      { header: 'CÓDIGO', key: 'codigoLocal', width: 12 },
      { header: 'LOCAL', key: 'local', width: 20 },
      { header: 'FECHA REVISIÓN', key: 'fechaRevision', width: 14 },
      { header: 'FECHA DE INGRESO', key: 'fecha', width: 16 },
      { header: 'DATOS DEL CLIENTE', key: 'cliente', width: 22 },
      { header: 'CONTACTO', key: 'contacto', width: 15 },
      { header: 'TIPO RECLAMO', key: 'tipoReclamo', width: 28 },
      { header: 'CATEGORÍA', key: 'categoria', width: 25 },
    ];
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF000000' } };

    // Agrupa por revisión (manteniendo el orden de aparición de las revisiones ya
    // ordenadas por fecha) y dentro de cada una respeta el orden real en que se
    // ingresaron los reclamos (Reclamo #1, #2, #3...), igual que se ve en el detalle
    // de la revisión en "Revisiones".
    const grupos = new Map();
    lista.forEach(r => {
      if (!grupos.has(r.revisionId)) grupos.set(r.revisionId, []);
      grupos.get(r.revisionId).push(r);
    });
    const reclamosOrdenados = [...grupos.values()].flatMap(grupo =>
      [...grupo].sort((a, b) => a.ordenEnRevision - b.ordenEnRevision)
    );

    reclamosOrdenados.forEach(r => {
      const row = ws.addRow({
        codigoLocal: r.localCodigo || '',
        local: r.localNombre,
        fechaRevision: fmtFechaConGuiones(r.fechaRevision),
        fecha: fmtFechaConGuiones(r.fecha),
        cliente: '', // se llena manualmente después de exportar
        contacto: limpiarTelefono(r.telefono),
        tipoReclamo: SEVERIDAD_LABEL[r.severidad] || '',
        categoria: r.tipo,
      });
      const celdaTipo = row.getCell('tipoReclamo');
      if (SEVERIDAD_FILL[r.severidad]) {
        celdaTipo.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: SEVERIDAD_FILL[r.severidad] } };
        celdaTipo.font = { bold: true, color: { argb: SEVERIDAD_FONT[r.severidad] } };
      }
    });

    await descargarWorkbook(wb, `reclamos_resumen_${fmtFechaDDMMAAAA(new Date())}.xlsx`);
  };

  if (loading && !resumen) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: '#f20000' }} />
      </Box>
    );
  }

  const distribucionData = resumen ? Object.entries(resumen.distribucionCategorias || {})
    .filter(([_, v]) => v > 0)
    .map(([name, value]) => ({ name, value, color: COLOR_CATEGORIA[name] || '#9e9e9e' })) : [];

  const preguntasMap = {
    servicioCliente: { label: 'Servicio / Caja', data: resumen?.preguntasMayorIncumplimiento?.servicioCliente || [] },
    cuartoFrio: { label: 'Cuarto Frío', data: resumen?.preguntasMayorIncumplimiento?.cuartoFrio || [] },
    cuartoCaliente: { label: 'Cuarto Caliente', data: resumen?.preguntasMayorIncumplimiento?.cuartoCaliente || [] },
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={2} mb={1}>
        <Box>
          <Typography variant="h4" fontWeight={800}>Dashboard Supervisión</Typography>
          <Typography variant="body2" color="text.secondary">
            {resumen ? `${resumen.totalRevisiones} revisiones · ${resumen.totalReclamos} reclamos registrados` : '—'}
          </Typography>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Mes</InputLabel>
          <Select value={mes} label="Mes" onChange={(e) => setMes(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {meses.map(m => <MenuItem key={m} value={m} sx={{ textTransform: 'capitalize' }}>{labelMes(m)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Supervisor</InputLabel>
          <Select value={supervisorId} label="Supervisor" onChange={(e) => setSupervisorId(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {supervisoresLista.map(s => <MenuItem key={s._id} value={s._id}>{s.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel>Local</InputLabel>
          <Select
            multiple
            value={localIds}
            label="Local"
            onChange={(e) => setLocalIds(e.target.value)}
            renderValue={(selected) => selected.length === 0
              ? 'Todos'
              : selected.length === 1
                ? (locales.find(l => l._id === selected[0])?.nombre || '')
                : `${selected.length} locales seleccionados`}
          >
            {locales.map(l => (
              <MenuItem key={l._id} value={l._id}>
                <Checkbox size="small" checked={localIds.indexOf(l._id) > -1} />
                <ListItemText primary={l.nombre} />
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Categoría</InputLabel>
          <Select value={categoria} label="Categoría" onChange={(e) => setCategoria(e.target.value)}>
            <MenuItem value="">Todas</MenuItem>
            {CATEGORIAS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<RestartAltIcon />} onClick={resetFiltros}>Resetear</Button>
        <Button size="small" onClick={cargarDatos} startIcon={<RefreshIcon fontSize="small" />} sx={{ ml: 'auto' }}>
          Actualizar
        </Button>
        {loading && <CircularProgress size={20} />}
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
        <Tab label="Resumen" value="resumen" />
        <Tab label="Reclamos" value="reclamos" />
      </Tabs>

      {tab === 'resumen' && resumen && (
        <>
          {/* KPIs principales */}
          <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard icon="📋" label="Cumplimiento general" value={fmtPct(resumen.cumplimientoGeneral)} sub={`${resumen.totalRevisiones} revisiones`} color="#1976d2" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard icon="🏪" label="Locales evaluados" value={resumen.localesEvaluados} sub={`${resumen.totalRevisiones} visitas`} color="#333333" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard icon="📢" label="Reclamos promedio" value={(resumen.reclamosPromedioPorVisita || 0).toFixed(1)} sub="Por visita" color="#f20000" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard icon="⚠️" label="Pésimo + Malo" value={resumen.pesimoMalo} sub={`${fmtPct(resumen.pesimoMaloPct)} del total`} color="#f20000" />
            </Grid>
          </Grid>

          {/* Distribución + Cumplimiento por área + Presencia del personal */}
          <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">DISTRIBUCIÓN POR CATEGORÍA</Typography>
                <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mt={1.5}>
                  <ResponsiveContainer width={200} height={200}>
                    <PieChart>
                      <Pie data={distribucionData} dataKey="value" nameKey="name" innerRadius={52} outerRadius={90}>
                        {distribucionData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box>
                    {distribucionData.map(d => (
                      <Box key={d.name} display="flex" alignItems="center" gap={1} mb={0.75}>
                        <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: d.color }} />
                        <Typography variant="body2" fontSize={14}>{d.name} {d.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">CUMPLIMIENTO POR ÁREA</Typography>
                <Box mt={2}>
                  <BarraCumplimiento label="Servicio al cliente y caja" pct={resumen.cumplimientoPorArea.servicioCliente} color={colorPorCumplimiento(resumen.cumplimientoPorArea.servicioCliente)} />
                  <BarraCumplimiento label="Cuarto frío" pct={resumen.cumplimientoPorArea.cuartoFrio} color={colorPorCumplimiento(resumen.cumplimientoPorArea.cuartoFrio)} />
                  <BarraCumplimiento label="Cuarto caliente" pct={resumen.cumplimientoPorArea.cuartoCaliente} color={colorPorCumplimiento(resumen.cumplimientoPorArea.cuartoCaliente)} />
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">PRESENCIA DEL PERSONAL</Typography>
                <Box mt={2}>
                  <BarraCumplimiento
                    label={`Administrador (${resumen.presenciaPersonal.administrador.presentes}/${resumen.presenciaPersonal.administrador.total})`}
                    pct={resumen.presenciaPersonal.administrador.total > 0 ? (resumen.presenciaPersonal.administrador.presentes / resumen.presenciaPersonal.administrador.total) * 100 : 0}
                    color={colorPorCumplimiento((resumen.presenciaPersonal.administrador.presentes / (resumen.presenciaPersonal.administrador.total || 1)) * 100)}
                  />
                  <BarraCumplimiento
                    label={`Sub / Encargado (${resumen.presenciaPersonal.subAdministrador.presentes}/${resumen.presenciaPersonal.subAdministrador.total})`}
                    pct={resumen.presenciaPersonal.subAdministrador.total > 0 ? (resumen.presenciaPersonal.subAdministrador.presentes / resumen.presenciaPersonal.subAdministrador.total) * 100 : 0}
                    color={colorPorCumplimiento((resumen.presenciaPersonal.subAdministrador.presentes / (resumen.presenciaPersonal.subAdministrador.total || 1)) * 100)}
                  />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Supervisores + Evolución */}
          <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">SUPERVISORES</Typography>
                <Box sx={{ mt: 2, maxHeight: 320, overflowY: 'auto' }}>
                  {resumen.supervisores.map(s => (
                    <BarraCumplimiento key={s.supervisorId} label={s.nombre} pct={s.promedio} color={colorPorCumplimiento(s.promedio)} />
                  ))}
                  {resumen.supervisores.length === 0 && (
                    <Typography color="text.secondary" textAlign="center" py={2} fontSize={13}>Sin datos para el período seleccionado.</Typography>
                  )}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">EVOLUCIÓN DEL CUMPLIMIENTO</Typography>
                <Box sx={{ width: '100%', height: 340 }}>
                  <ResponsiveContainer>
                    <LineChart data={resumen.evolucion}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="fecha" tick={{ fontSize: 11 }} tickFormatter={(f) => new Date(f).toLocaleDateString('es-CL', { weekday: 'short' })} />
                      <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                      <RechartsTooltip formatter={(v) => `${v.toFixed(1)}%`} labelFormatter={(f) => new Date(f).toLocaleDateString('es-CL')} />
                      <Line type="monotone" dataKey="promedio" stroke="#1976d2" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Preguntas con mayor incumplimiento */}
          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">PREGUNTAS CON MAYOR INCUMPLIMIENTO</Typography>
            <Tabs value={preguntasTab} onChange={(e, v) => setPreguntasTab(v)} sx={{ mb: 2, mt: 0.5, minHeight: 36 }}>
              {Object.entries(preguntasMap).map(([key, s]) => (
                <Tab key={key} value={key} label={s.label} sx={{ minHeight: 36, textTransform: 'none', fontWeight: 600 }} />
              ))}
            </Tabs>
            {preguntasMap[preguntasTab].data.map(p => (
              <BarraCumplimiento key={p.id} label={p.texto} pct={p.porcentajeFallo} color={p.porcentajeFallo >= 50 ? '#f20000' : p.porcentajeFallo >= 25 ? '#f57c00' : '#1976d2'} />
            ))}
            {preguntasMap[preguntasTab].data.length === 0 && (
              <Typography color="text.secondary" textAlign="center" py={2}>Sin datos para esta sección en el período seleccionado.</Typography>
            )}
          </Paper>

          {/* Reclamos del período + Detalle por supervisor */}
          <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">RECLAMOS DEL PERÍODO</Typography>
                <Grid container spacing={1.5} sx={{ mt: 1.5 }}>
                  <Grid item xs={4}>
                    <Box textAlign="center" sx={{ bgcolor: 'rgba(242,0,0,0.08)', borderRadius: 2, py: 1.5 }}>
                      <Typography variant="h4" fontWeight={800} color="#f20000">{resumen.reclamosDelPeriodo.graves}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>GRAVES</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center" sx={{ bgcolor: 'rgba(245,124,0,0.08)', borderRadius: 2, py: 1.5 }}>
                      <Typography variant="h4" fontWeight={800} color="#f57c00">{resumen.reclamosDelPeriodo.medios}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>MEDIOS</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center" sx={{ bgcolor: 'rgba(25,118,210,0.08)', borderRadius: 2, py: 1.5 }}>
                      <Typography variant="h4" fontWeight={800} color="#1976d2">{resumen.reclamosDelPeriodo.bajos}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontWeight: 600 }}>BAJOS</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 2 }} />
                <Typography variant="body2" color="text.secondary">Promedio por visita</Typography>
                <Typography variant="h4" fontWeight={800} color="#f20000" sx={{ mt: 0.5 }}>{(resumen.reclamosDelPeriodo.promedioPorVisita || 0).toFixed(1)}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} md={8}>
              <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden', height: '100%' }}>
                <Box p={2}><Typography variant="caption" fontWeight={700} color="text.secondary">DETALLE POR SUPERVISOR</Typography></Box>
                <TableContainer sx={{ maxHeight: 300 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Supervisor</TableCell>
                        <TableCell align="center">Prom.</TableCell>
                        <TableCell align="center">Servicio al Cliente</TableCell>
                        <TableCell align="center">Cuarto Frío</TableCell>
                        <TableCell align="center">Cuarto Caliente</TableCell>
                        <TableCell align="center">N</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resumen.supervisores.map(s => (
                        <TableRow key={s.supervisorId} hover>
                          <TableCell>{s.nombre}</TableCell>
                          <TableCell align="center"><strong style={{ color: '#2e7d32' }}>{fmtPct(s.promedio)}</strong></TableCell>
                          <TableCell align="center">{fmtPct(s.sc)}</TableCell>
                          <TableCell align="center">{fmtPct(s.cf)}</TableCell>
                          <TableCell align="center">{fmtPct(s.cc)}</TableCell>
                          <TableCell align="center">{s.n}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Ranking completo */}
          <Paper sx={{ p: 3, borderRadius: 3 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              RANKING COMPLETO ({resumen.ranking.length} LOCALES)
            </Typography>
            <TableContainer sx={{ mt: 1, maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>#</TableCell>
                    <TableCell>Local</TableCell>
                    <TableCell align="right">Cumpl.</TableCell>
                    <TableCell align="right">Visitas</TableCell>
                    <TableCell align="right">Categoría</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {resumen.ranking.map((l, i) => (
                    <TableRow key={l.localId} hover>
                      <TableCell>{i + 1}</TableCell>
                      <TableCell><strong>{l.nombre}</strong></TableCell>
                      <TableCell align="right" sx={{ color: colorPorCumplimiento(l.cumplimiento), fontWeight: 700 }}>{fmtPct(l.cumplimiento)}</TableCell>
                      <TableCell align="right">{l.visitas}</TableCell>
                      <TableCell align="right">
                        <Chip label={l.categoria} size="small" sx={{ bgcolor: COLOR_CATEGORIA[l.categoria] || '#9e9e9e', color: '#fff', fontSize: '0.65rem' }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}

      {tab === 'reclamos' && reclamos && (
        <>
          {/* KPIs de reclamos */}
          <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={6} sm={2.4}><KpiCard label="Total Reclamos" value={reclamos.resumen.total} sub="Individuales" color="#f20000" /></Grid>
            <Grid item xs={6} sm={2.4}><KpiCard label="Resueltos" value={reclamos.resumen.resueltos} sub={`${fmtPct(reclamos.resumen.tasaResolucion)} del total`} color="#2e7d32" /></Grid>
            <Grid item xs={6} sm={2.4}><KpiCard label="Sin solución" value={reclamos.resumen.sinSolucion} sub={`${fmtPct(100 - reclamos.resumen.tasaResolucion)} del total`} color="#f20000" /></Grid>
            <Grid item xs={6} sm={2.4}><KpiCard label="Tipos distintos" value={reclamos.resumen.tiposDistintos} sub="Categorías únicas" /></Grid>
            <Grid item xs={12} sm={2.4}><KpiCard label="Compensaciones" value={`$${(reclamos.resumen.compensaciones || 0).toLocaleString('es-CL')}`} sub="Monto total" color="#f57c00" /></Grid>
          </Grid>

          <Paper sx={{ p: 3, borderRadius: 3, mb: 3 }}>
            <Box display="flex" justifyContent="space-between" mb={1}>
              <Typography variant="body2">Tasa de resolución global</Typography>
              <Typography variant="h6" fontWeight={800} color="#2e7d32">{fmtPct(reclamos.resumen.tasaResolucion)}</Typography>
            </Box>
            <Box sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', overflow: 'hidden' }}>
              <Box sx={{ height: '100%', width: `${reclamos.resumen.tasaResolucion}%`, bgcolor: '#2e7d32' }} />
            </Box>
            <Box display="flex" justifyContent="space-between" mt={0.5}>
              <Typography variant="caption" color="text.secondary">{reclamos.resumen.resueltos} resueltos</Typography>
              <Typography variant="caption" color="text.secondary">{reclamos.resumen.sinSolucion} sin resolver</Typography>
            </Box>
          </Paper>

          {/* Tipos de reclamo — frecuencia + resolución por tipo */}
          <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">TIPOS DE RECLAMO — FRECUENCIA</Typography>
                <Box sx={{ mt: 2, maxHeight: 340, overflowY: 'auto' }}>
                  {(() => {
                    const maxTotal = Math.max(...reclamos.tiposFrecuencia.map(t => t.total), 1);
                    return reclamos.tiposFrecuencia.map(t => (
                      <BarraCumplimiento
                        key={t.tipo}
                        label={t.tipo}
                        pct={(t.total / maxTotal) * 100}
                        valueLabel={String(t.total)}
                        color="#1976d2"
                      />
                    ));
                  })()}
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%', overflowY: 'auto', maxHeight: 400 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">RESOLUCIÓN POR TIPO</Typography>
                <Box mt={1}>
                  {reclamos.resolucionPorTipo.map(t => (
                    <BarraCumplimiento
                      key={t.tipo}
                      label={`${t.tipo} — ${t.casos} casos`}
                      pct={t.resueltoPct}
                      color={t.resueltoPct >= 80 ? '#2e7d32' : t.resueltoPct >= 50 ? '#f57c00' : '#f20000'}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Por local + últimos reclamos */}
          <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">RECLAMOS POR LOCAL (TOP 15)</Typography>
                <TableContainer sx={{ mt: 1, maxHeight: 340 }}>
                  <Table size="small" stickyHeader>
                    <TableHead>
                      <TableRow>
                        <TableCell>Local</TableCell>
                        <TableCell align="right">Total</TableCell>
                        <TableCell align="right">Sin sol.</TableCell>
                        <TableCell align="right">Resolución</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {reclamos.reclamosPorLocal.map(l => (
                        <TableRow key={l.local} hover>
                          <TableCell>{l.local}</TableCell>
                          <TableCell align="right">{l.total}</TableCell>
                          <TableCell align="right" sx={{ color: l.sinSolucion > 0 ? '#f20000' : 'text.secondary' }}>{l.sinSolucion}</TableCell>
                          <TableCell align="right" sx={{ color: l.resolucionPct >= 80 ? '#2e7d32' : '#f57c00', fontWeight: 700 }}>{fmtPct(l.resolucionPct)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 3, borderRadius: 3, height: '100%', overflowY: 'auto', maxHeight: 400 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">ÚLTIMOS RECLAMOS REGISTRADOS</Typography>
                {reclamos.ultimosReclamos.map((r) => (
                  <Box key={r.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={700}>{r.tipo}</Typography>
                      <Chip
                        label={r.entregoSolucion !== 'NO' ? 'Resuelto' : 'Pendiente'}
                        size="small"
                        color={r.entregoSolucion !== 'NO' ? 'success' : 'error'}
                        sx={{ height: 20, fontSize: '0.65rem' }}
                      />
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {r.localNombre} · {new Date(r.fecha).toLocaleDateString('es-CL')}
                    </Typography>
                  </Box>
                ))}
                {reclamos.ultimosReclamos.length === 0 && (
                  <Typography color="text.secondary" textAlign="center" py={2}>Sin reclamos en el período seleccionado.</Typography>
                )}
              </Paper>
            </Grid>
          </Grid>

          {/* Tabla completa */}
          <Paper sx={{ p: 0, borderRadius: 3, overflow: 'hidden' }}>
            <Box p={2} pb={1.5}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                TABLA COMPLETA — TODOS LOS RECLAMOS ({reclamos.reclamos.length})
              </Typography>
            </Box>
            <Box
              mx={2} mb={2} p={1.5}
              display="flex" alignItems="center" gap={2} flexWrap="wrap"
              sx={{ bgcolor: 'action.hover', borderRadius: 2, border: '1px solid', borderColor: 'divider' }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <CalendarMonthIcon fontSize="small" sx={{ color: 'text.secondary' }} />
                <Typography variant="body2" fontWeight={600} color="text.secondary">
                  Filtrar exportación por fecha de revisión
                </Typography>
              </Box>
              <Box display="flex" alignItems="center" gap={0.75}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">Desde</Typography>
                <TextField size="small" type="date" value={exportDesde} onChange={(e) => setExportDesde(e.target.value)}
                  sx={{ width: 150, bgcolor: 'background.paper', borderRadius: 1 }} />
              </Box>
              <Box display="flex" alignItems="center" gap={0.75}>
                <Typography variant="caption" fontWeight={600} color="text.secondary">Hasta</Typography>
                <TextField size="small" type="date" value={exportHasta} onChange={(e) => setExportHasta(e.target.value)}
                  sx={{ width: 150, bgcolor: 'background.paper', borderRadius: 1 }} />
              </Box>
              <Divider orientation="vertical" flexItem sx={{ display: { xs: 'none', sm: 'block' } }} />
              <Box display="flex" gap={1} flexWrap="wrap" sx={{ ml: { xs: 0, sm: 'auto' } }}>
                <Button size="small" variant="contained" disableElevation startIcon={<DownloadIcon fontSize="small" />} onClick={exportarTablaCompleta}
                  sx={{ bgcolor: '#f20000', '&:hover': { bgcolor: '#c00000' } }}>
                  Exportar tabla
                </Button>
                <Button size="small" variant="outlined" startIcon={<DownloadIcon fontSize="small" />} onClick={exportarResumen}
                  sx={{ borderColor: '#f20000', color: '#f20000', '&:hover': { borderColor: '#c00000', bgcolor: 'rgba(242,0,0,0.04)' } }}>
                  Exportar resumen
                </Button>
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Local</TableCell>
                    <TableCell>Fecha Revisión</TableCell>
                    <TableCell>Código</TableCell>
                    <TableCell>Supervisor</TableCell>
                    <TableCell align="center">Solución</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell>Teléfono</TableCell>
                    <TableCell>Comentario</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reclamos.reclamos.map((r) => {
                    const monto = parseFloat(String(r.montoCompensacion || '0').replace(/[^\d.-]/g, '')) || 0;
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>{fmtFechaDDMMAAAA(r.fecha)}</TableCell>
                        <TableCell>{r.tipo}</TableCell>
                        <TableCell>{r.localNombre}</TableCell>
                        <TableCell>{fmtFechaDDMMAAAA(r.fechaRevision)}</TableCell>
                        <TableCell>{r.localCodigo || '—'}</TableCell>
                        <TableCell>{r.supervisor}</TableCell>
                        <TableCell align="center" sx={{ color: r.entregoSolucion !== 'NO' ? '#2e7d32' : '#f20000', fontWeight: 700 }}>
                          {r.entregoSolucion}
                        </TableCell>
                        <TableCell align="right">{monto > 0 ? `$${monto.toLocaleString('es-CL')}` : '—'}</TableCell>
                        <TableCell>{limpiarTelefono(r.telefono) || '—'}</TableCell>
                        <TableCell sx={{ maxWidth: 220, whiteSpace: 'normal' }}>{r.comentario || '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </>
      )}
    </Box>
  );
}
