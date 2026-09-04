// dashboard/src/pages/DashboardSupervision.jsx
// Página nueva e independiente (no reemplaza Dashboard.jsx / DashboardKPI.jsx / DashboardModerno.jsx).
// Consume /dashboard-supervision/meses, /resumen y /reclamos (backend nuevo).
import React, { useState, useEffect, useMemo } from 'react';
import {
  Box, Grid, Typography, FormControl, InputLabel, Select, MenuItem,
  CircularProgress, Paper, Button, Tabs, Tab, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, Divider,
} from '@mui/material';
import { Refresh as RefreshIcon, RestartAlt as RestartAltIcon } from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line,
} from 'recharts';
import api from '../services/api';

const COLOR_CATEGORIA = {
  'PÉSIMO': '#d32f2f',
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
  return '#d32f2f';
}

function KpiCard({ label, value, sub, color }) {
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
      <Typography variant="caption" sx={{ color: 'text.secondary', letterSpacing: 0.5, fontWeight: 600 }}>
        {label.toUpperCase()}
      </Typography>
      <Typography variant="h4" fontWeight={800} sx={{ color: color || 'text.primary', mt: 0.5 }}>
        {value}
      </Typography>
      {sub && <Typography variant="caption" color="text.secondary">{sub}</Typography>}
    </Paper>
  );
}

function BarraCumplimiento({ label, pct, color }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box display="flex" justifyContent="space-between" mb={0.5}>
        <Typography variant="body2">{label}</Typography>
        <Typography variant="body2" fontWeight={700} sx={{ color }}>{fmtPct(pct)}</Typography>
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
  const [localId, setLocalId] = useState('');
  const [categoria, setCategoria] = useState('');

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
    if (localId) p.localId = localId;
    if (categoria) p.categoria = categoria;
    return p;
  }, [mes, supervisorId, localId, categoria]);

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
    setSupervisorId(''); setLocalId(''); setCategoria('');
    if (meses.length > 0) setMes(meses[0]);
  };

  if (loading && !resumen) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: '#d32f2f' }} />
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
    <Box>
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
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Local</InputLabel>
          <Select value={localId} label="Local" onChange={(e) => setLocalId(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {locales.map(l => <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>)}
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
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Cumplimiento general" value={fmtPct(resumen.cumplimientoGeneral)} sub={`${resumen.totalRevisiones} revisiones`} color="#1976d2" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Locales evaluados" value={resumen.localesEvaluados} sub={`${resumen.totalRevisiones} visitas`} />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Reclamos promedio" value={(resumen.reclamosPromedioPorVisita || 0).toFixed(1)} sub="Por visita" color="#d32f2f" />
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <KpiCard label="Pésimo + Malo" value={resumen.pesimoMalo} sub={`${fmtPct(resumen.pesimoMaloPct)} del total`} color="#d32f2f" />
            </Grid>
          </Grid>

          {/* Distribución + Cumplimiento por área */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">DISTRIBUCIÓN POR CATEGORÍA</Typography>
                <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mt={1}>
                  <ResponsiveContainer width={180} height={180}>
                    <PieChart>
                      <Pie data={distribucionData} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75}>
                        {distribucionData.map((d, i) => <Cell key={i} fill={d.color} />)}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box>
                    {distribucionData.map(d => (
                      <Box key={d.name} display="flex" alignItems="center" gap={1} mb={0.5}>
                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color }} />
                        <Typography variant="body2">{d.name} {d.value}</Typography>
                      </Box>
                    ))}
                  </Box>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">CUMPLIMIENTO POR ÁREA</Typography>
                <Box mt={1.5}>
                  <BarraCumplimiento label="Servicio al cliente y caja" pct={resumen.cumplimientoPorArea.servicioCliente} color={colorPorCumplimiento(resumen.cumplimientoPorArea.servicioCliente)} />
                  <BarraCumplimiento label="Cuarto frío" pct={resumen.cumplimientoPorArea.cuartoFrio} color={colorPorCumplimiento(resumen.cumplimientoPorArea.cuartoFrio)} />
                  <BarraCumplimiento label="Cuarto caliente" pct={resumen.cumplimientoPorArea.cuartoCaliente} color={colorPorCumplimiento(resumen.cumplimientoPorArea.cuartoCaliente)} />
                </Box>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="caption" fontWeight={700} color="text.secondary">PRESENCIA DEL PERSONAL</Typography>
                <Box mt={1.5}>
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
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">SUPERVISORES</Typography>
                <Box sx={{ width: '100%', height: 280 }}>
                  <ResponsiveContainer>
                    <BarChart data={resumen.supervisores} layout="vertical" margin={{ left: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="nombre" width={90} tick={{ fontSize: 12 }} />
                      <RechartsTooltip formatter={(v) => `${v.toFixed(1)}%`} />
                      <Bar dataKey="promedio" radius={[0, 6, 6, 0]}>
                        {resumen.supervisores.map((s, i) => (
                          <Cell key={i} fill={colorPorCumplimiento(s.promedio)} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">EVOLUCIÓN DEL CUMPLIMIENTO</Typography>
                <Box sx={{ width: '100%', height: 280 }}>
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
          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">PREGUNTAS CON MAYOR INCUMPLIMIENTO</Typography>
            <Tabs value={preguntasTab} onChange={(e, v) => setPreguntasTab(v)} sx={{ mb: 2, mt: 0.5, minHeight: 36 }}>
              {Object.entries(preguntasMap).map(([key, s]) => (
                <Tab key={key} value={key} label={s.label} sx={{ minHeight: 36, textTransform: 'none', fontWeight: 600 }} />
              ))}
            </Tabs>
            {preguntasMap[preguntasTab].data.map(p => (
              <BarraCumplimiento key={p.id} label={p.texto} pct={p.porcentajeFallo} color={p.porcentajeFallo >= 50 ? '#d32f2f' : p.porcentajeFallo >= 25 ? '#f57c00' : '#1976d2'} />
            ))}
            {preguntasMap[preguntasTab].data.length === 0 && (
              <Typography color="text.secondary" textAlign="center" py={2}>Sin datos para esta sección en el período seleccionado.</Typography>
            )}
          </Paper>

          {/* Reclamos del período + Detalle por supervisor */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={4}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">RECLAMOS DEL PERÍODO</Typography>
                <Grid container spacing={1} sx={{ mt: 0.5 }}>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={800} color="#d32f2f">{resumen.reclamosDelPeriodo.graves}</Typography>
                      <Typography variant="caption" color="text.secondary">GRAVES</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={800} color="#f57c00">{resumen.reclamosDelPeriodo.medios}</Typography>
                      <Typography variant="caption" color="text.secondary">MEDIOS</Typography>
                    </Box>
                  </Grid>
                  <Grid item xs={4}>
                    <Box textAlign="center">
                      <Typography variant="h5" fontWeight={800} color="#1976d2">{resumen.reclamosDelPeriodo.bajos}</Typography>
                      <Typography variant="caption" color="text.secondary">BAJOS</Typography>
                    </Box>
                  </Grid>
                </Grid>
                <Divider sx={{ my: 1.5 }} />
                <Typography variant="body2" color="text.secondary">Promedio por visita</Typography>
                <Typography variant="h5" fontWeight={800} color="#d32f2f">{(resumen.reclamosDelPeriodo.promedioPorVisita || 0).toFixed(1)}</Typography>
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
                        <TableCell align="center">S.C.</TableCell>
                        <TableCell align="center">C.F.</TableCell>
                        <TableCell align="center">C.C.</TableCell>
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
          <Paper sx={{ p: 2.5, borderRadius: 3 }}>
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
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={2.4}><KpiCard label="Total Reclamos" value={reclamos.resumen.total} sub="Individuales" color="#d32f2f" /></Grid>
            <Grid item xs={6} sm={2.4}><KpiCard label="Resueltos" value={reclamos.resumen.resueltos} sub={`${fmtPct(reclamos.resumen.tasaResolucion)} del total`} color="#2e7d32" /></Grid>
            <Grid item xs={6} sm={2.4}><KpiCard label="Sin solución" value={reclamos.resumen.sinSolucion} sub={`${fmtPct(100 - reclamos.resumen.tasaResolucion)} del total`} color="#d32f2f" /></Grid>
            <Grid item xs={6} sm={2.4}><KpiCard label="Tipos distintos" value={reclamos.resumen.tiposDistintos} sub="Categorías únicas" /></Grid>
            <Grid item xs={12} sm={2.4}><KpiCard label="Compensaciones" value={`$${(reclamos.resumen.compensaciones || 0).toLocaleString('es-CL')}`} sub="Monto total" color="#f57c00" /></Grid>
          </Grid>

          <Paper sx={{ p: 2.5, borderRadius: 3, mb: 3 }}>
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
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">TIPOS DE RECLAMO — FRECUENCIA</Typography>
                <Box sx={{ width: '100%', height: Math.max(300, reclamos.tiposFrecuencia.length * 24) }}>
                  <ResponsiveContainer>
                    <BarChart data={reclamos.tiposFrecuencia} layout="vertical" margin={{ left: 40 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                      <XAxis type="number" />
                      <YAxis type="category" dataKey="tipo" width={140} tick={{ fontSize: 10 }} />
                      <RechartsTooltip />
                      <Bar dataKey="total" fill="#1976d2" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', overflowY: 'auto', maxHeight: 400 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">RESOLUCIÓN POR TIPO</Typography>
                <Box mt={1}>
                  {reclamos.resolucionPorTipo.map(t => (
                    <BarraCumplimiento
                      key={t.tipo}
                      label={`${t.tipo} — ${t.casos} casos`}
                      pct={t.resueltoPct}
                      color={t.resueltoPct >= 80 ? '#2e7d32' : t.resueltoPct >= 50 ? '#f57c00' : '#d32f2f'}
                    />
                  ))}
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Por local + últimos reclamos */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} md={7}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%' }}>
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
                          <TableCell align="right" sx={{ color: l.sinSolucion > 0 ? '#d32f2f' : 'text.secondary' }}>{l.sinSolucion}</TableCell>
                          <TableCell align="right" sx={{ color: l.resolucionPct >= 80 ? '#2e7d32' : '#f57c00', fontWeight: 700 }}>{fmtPct(l.resolucionPct)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={5}>
              <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', overflowY: 'auto', maxHeight: 400 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">ÚLTIMOS RECLAMOS REGISTRADOS</Typography>
                {reclamos.ultimosReclamos.map((r) => (
                  <Box key={r.id} sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" fontWeight={700}>{r.tipo}</Typography>
                      <Chip
                        label={r.entregoSolucion === 'Sí' ? 'Resuelto' : 'Pendiente'}
                        size="small"
                        color={r.entregoSolucion === 'Sí' ? 'success' : 'error'}
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
            <Box p={2}>
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                TABLA COMPLETA — TODOS LOS RECLAMOS ({reclamos.reclamos.length})
              </Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 500 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Fecha</TableCell>
                    <TableCell>Tipo</TableCell>
                    <TableCell>Local</TableCell>
                    <TableCell>Supervisor</TableCell>
                    <TableCell align="center">Solución</TableCell>
                    <TableCell align="right">Monto</TableCell>
                    <TableCell>Teléfono</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {reclamos.reclamos.map((r) => {
                    const monto = parseFloat(String(r.montoCompensacion || '0').replace(/[^\d.-]/g, '')) || 0;
                    return (
                      <TableRow key={r.id} hover>
                        <TableCell>{new Date(r.fecha).toLocaleDateString('es-CL', { weekday: 'short' })}</TableCell>
                        <TableCell>{r.tipo}</TableCell>
                        <TableCell>{r.localNombre}</TableCell>
                        <TableCell>{r.supervisor}</TableCell>
                        <TableCell align="center" sx={{ color: r.entregoSolucion === 'Sí' ? '#2e7d32' : '#d32f2f', fontWeight: 700 }}>
                          {r.entregoSolucion}
                        </TableCell>
                        <TableCell align="right">{monto > 0 ? `$${monto.toLocaleString('es-CL')}` : '—'}</TableCell>
                        <TableCell>{r.telefono || '—'}</TableCell>
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
