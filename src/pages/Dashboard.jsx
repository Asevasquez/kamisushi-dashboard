import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Chip, Paper, IconButton, Tooltip, LinearProgress, Alert,
  Avatar, Divider, Tab, Tabs, List, ListItem, ListItemText,
  ListItemIcon, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Store as StoreIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  EmojiEvents as TrophyIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RTooltip, PieChart, Pie, Cell,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ─────────────────────────────────────────────────
const getPColor = (p) => {
  if (p >= 95) return '#10b981';
  if (p >= 80) return '#3b82f6';
  if (p >= 70) return '#f59e0b';
  if (p >= 60) return '#ef4444';
  return '#d32f2f';
};

const getCat = (p) => {
  if (p >= 95) return 'MUY BUENO';
  if (p >= 80) return 'BUENO';
  if (p >= 70) return 'REGULAR';
  if (p >= 60) return 'MALO';
  return 'PÉSIMO';
};

const CAT_COLORS = {
  'EXCELENTE': '#10b981', 'MUY BUENO': '#34d399',
  'BUENO': '#3b82f6', 'REGULAR': '#f59e0b',
  'MALO': '#ef4444', 'PÉSIMO': '#d32f2f',
};

// ─── KPI Card ────────────────────────────────────────────────
function KPICard({ title, value, subtitle, icon, color }) {
  return (
    <Card sx={{
      borderRadius: 3,
      background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
      color: '#fff',
      boxShadow: `0 8px 20px -4px ${color}55`,
      transition: 'transform 0.2s',
      '&:hover': { transform: 'translateY(-4px)' },
      height: '100%',
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>{title}</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.1, mt: 0.3 }}>{value}</Typography>
            {subtitle && <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.3 }}>{subtitle}</Typography>}
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 2, fontSize: 24 }}>
            {icon}
          </Avatar>
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Barra de progreso con label ────────────────────────────
function ProgressRow({ label, pct, sub }) {
  const color = getPColor(pct);
  return (
    <Box sx={{ py: 1.5, borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 0 } }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
        <Box display="flex" alignItems="center" gap={1}>
          {pct < 60 && <WarningIcon fontSize="small" color="error" />}
          <Typography variant="body2" fontWeight={600}>{label}</Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          <Chip label={getCat(pct)} size="small"
            sx={{ bgcolor: color, color: '#fff', fontWeight: 600, fontSize: '0.65rem', height: 20 }} />
          <Typography fontWeight={800} sx={{ color, minWidth: 48, textAlign: 'right' }}>
            {pct.toFixed(1)}%
          </Typography>
        </Box>
      </Box>
      <LinearProgress variant="determinate" value={pct}
        sx={{ height: 7, borderRadius: 4, bgcolor: `${color}22`,
          '& .MuiLinearProgress-bar': { bgcolor: color } }} />
      {sub && <Typography variant="caption" color="textSecondary">{sub}</Typography>}
    </Box>
  );
}

// ─── Componente principal ────────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revisionesMes, setRevisionesMes] = useState({});
  const [localesActivos, setLocalesActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState(0);
  const [ultimaAct, setUltimaAct] = useState(null);
  const { user } = useAuth();

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsRes, mesRes, localesRes] = await Promise.all([
        api.get('/estadisticas/dashboard').catch(() => ({ data: null })),
        api.get('/revisiones/estadisticas-por-local').catch(() => ({ data: {} })),
        api.get('/locales/activos').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setRevisionesMes(mesRes.data || {});
      setLocalesActivos(localesRes.data || []);
      setUltimaAct(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  // ─── Cálculos ─────────────────────────────────────────────
  const localesSinRevision = localesActivos.filter(l => !Object.keys(revisionesMes).includes(l.nombre));
  const localesCriticos = Object.entries(revisionesMes).filter(([, d]) => d.promedioPorcentaje < 60);

  const promedioGeneral = (() => {
    if (stats?.resumen?.promedioGeneral) return parseFloat(stats.resumen.promedioGeneral);
    const vals = Object.values(revisionesMes);
    if (!vals.length) return 0;
    return vals.reduce((a, v) => a + v.promedioPorcentaje, 0) / vals.length;
  })();

  const totalRevisiones = stats?.resumen?.totalRevisiones ||
    Object.values(revisionesMes).reduce((a, v) => a + v.totalRevisiones, 0);

  const localesOrdenados = Object.entries(revisionesMes)
    .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje);

  const mejorLocal = localesOrdenados[0];
  const peorLocal = localesOrdenados[localesOrdenados.length - 1];
  const supervisores = stats?.estadisticasSupervisores || [];

  const barData = localesOrdenados.slice(0, 10).map(([nombre, data]) => ({
    nombre: nombre.length > 11 ? nombre.substring(0, 11) + '…' : nombre,
    promedio: parseFloat(data.promedioPorcentaje.toFixed(1)),
    color: getPColor(data.promedioPorcentaje),
  }));

  const pieData = stats?.distribucionCategorias
    ? Object.entries(stats.distribucionCategorias)
        .filter(([, v]) => v > 0)
        .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#999' }))
    : [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: '#d32f2f' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* ─── HEADER ──────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        background: 'linear-gradient(135deg, #d32f2f 0%, #ef5350 100%)',
        borderRadius: 3, p: 3, mb: 3, color: '#fff',
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>🍣 Panel de Control</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Bienvenido, {user?.nombre} — KamiSushi Sistema de Supervisión
            </Typography>
            {ultimaAct && (
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Actualizado: {ultimaAct.toLocaleTimeString('es-CL')}
              </Typography>
            )}
          </Box>
          <Tooltip title="Actualizar">
            <IconButton onClick={() => cargarDatos(true)} disabled={refreshing}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
              {refreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats rápidos */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[
            { label: 'Revisiones este mes', value: totalRevisiones, icon: <AssignmentIcon /> },
            { label: 'Promedio general', value: `${promedioGeneral.toFixed(1)}%`, icon: <TrendingUpIcon /> },
            { label: 'Locales revisados', value: `${Object.keys(revisionesMes).length}/${localesActivos.length}`, icon: <StoreIcon /> },
            { label: 'Supervisores', value: supervisores.length || '—', icon: <PeopleIcon /> },
          ].map((s, i) => (
            <Grid item xs={6} sm={3} key={i}>
              <Box display="flex" alignItems="center" gap={1.5}>
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.15)', width: 36, height: 36 }}>{s.icon}</Avatar>
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.8 }}>{s.label}</Typography>
                  <Typography variant="h6" fontWeight={700}>{s.value}</Typography>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* ─── ALERTAS ─────────────────────────────────────── */}
      {localesCriticos.length > 0 && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{localesCriticos.length} local(es) con puntaje crítico (&lt;60%):</strong>{' '}
          {localesCriticos.map(([n]) => n).join(', ')}
        </Alert>
      )}
      {localesSinRevision.length > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{localesSinRevision.length} local(es) sin revisión este mes:</strong>{' '}
          {localesSinRevision.map(l => l.nombre).join(', ')}
        </Alert>
      )}
      {localesSinRevision.length === 0 && Object.keys(revisionesMes).length > 0 && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          ✅ Todos los locales tienen revisión este mes.
        </Alert>
      )}

      {/* ─── KPI CARDS ───────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Total Revisiones" value={totalRevisiones}
            subtitle="Este mes" icon="📋" color="#d32f2f" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Promedio General" value={`${promedioGeneral.toFixed(1)}%`}
            subtitle={getCat(promedioGeneral)} icon="📊" color={getPColor(promedioGeneral)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Mejor Local" icon="🏆"
            value={mejorLocal ? mejorLocal[0].substring(0, 10) : '—'}
            subtitle={mejorLocal ? `${mejorLocal[1].promedioPorcentaje.toFixed(1)}%` : ''}
            color="#10b981" />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Requiere Atención" icon="⚠️"
            value={localesCriticos.length + localesSinRevision.length}
            subtitle="Locales críticos o sin revisión"
            color={localesCriticos.length > 0 ? '#ef4444' : '#f59e0b'} />
        </Grid>
      </Grid>

      {/* ─── TABS ────────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable"
          TabIndicatorProps={{ style: { backgroundColor: '#d32f2f' } }}>
          <Tab label="📅 Este Mes" />
          <Tab label="📊 Gráficos" />
          <Tab label="🏢 Todos los Locales" />
          <Tab label="👥 Supervisores" />
        </Tabs>
      </Paper>

      {/* ─── TAB 0: Este mes ─────────────────────────────── */}
      {tab === 0 && (
        <Grid container spacing={3}>
          <Grid item xs={12} lg={8}>
            <Paper sx={{ borderRadius: 3 }}>
              <Box sx={{ bgcolor: '#d32f2f', p: 2, borderRadius: '12px 12px 0 0' }}>
                <Typography variant="h6" color="#fff" fontWeight={700}>
                  Revisiones del Mes Actual por Local
                </Typography>
              </Box>
              <Box sx={{ p: 2 }}>
                {Object.keys(revisionesMes).length === 0 ? (
                  <Typography color="textSecondary" textAlign="center" py={3}>
                    Sin revisiones este mes
                  </Typography>
                ) : (
                  localesOrdenados.map(([nombre, data]) => {
                    const ultima = data.revisiones[data.revisiones.length - 1];
                    return (
                      <ProgressRow key={nombre} label={nombre}
                        pct={data.promedioPorcentaje}
                        sub={`${data.totalRevisiones} revisión${data.totalRevisiones !== 1 ? 'es' : ''} · última: ${ultima ? new Date(ultima.fecha).toLocaleDateString('es-CL') : '—'}`} />
                    );
                  })
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} lg={4}>
            {/* Destacados */}
            {(mejorLocal || peorLocal) && (
              <Paper sx={{ borderRadius: 3, p: 2, mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>🏆 Destacados del Mes</Typography>
                {mejorLocal && (
                  <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #86efac', mb: 1 }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <TrophyIcon sx={{ color: '#10b981' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Mejor local</Typography>
                          <Typography fontWeight={700} noWrap>{mejorLocal[0]}</Typography>
                        </Box>
                      </Box>
                      <Chip label={`${mejorLocal[1].promedioPorcentaje.toFixed(1)}%`} size="small"
                        sx={{ bgcolor: '#10b981', color: '#fff', fontWeight: 700 }} />
                    </Box>
                  </Box>
                )}
                {peorLocal && peorLocal !== mejorLocal && (
                  <Box sx={{ p: 1.5, bgcolor: '#fff5f5', borderRadius: 2, border: '1px solid #fca5a5' }}>
                    <Box display="flex" alignItems="center" justifyContent="space-between">
                      <Box display="flex" alignItems="center" gap={1}>
                        <WarningIcon sx={{ color: '#ef4444' }} />
                        <Box>
                          <Typography variant="caption" color="textSecondary">Requiere atención</Typography>
                          <Typography fontWeight={700} noWrap>{peorLocal[0]}</Typography>
                        </Box>
                      </Box>
                      <Chip label={`${peorLocal[1].promedioPorcentaje.toFixed(1)}%`} size="small"
                        sx={{ bgcolor: getPColor(peorLocal[1].promedioPorcentaje), color: '#fff', fontWeight: 700 }} />
                    </Box>
                  </Box>
                )}
              </Paper>
            )}

            {/* Sin revisión */}
            {localesSinRevision.length > 0 && (
              <Paper sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  ⚠️ Sin Revisión ({localesSinRevision.length})
                </Typography>
                <List dense disablePadding>
                  {localesSinRevision.map(l => (
                    <ListItem key={l._id} disableGutters>
                      <ListItemIcon sx={{ minWidth: 28 }}>
                        <CancelIcon fontSize="small" color="warning" />
                      </ListItemIcon>
                      <ListItemText primary={l.nombre} secondary={l.ciudad}
                        primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
                        secondaryTypographyProps={{ variant: 'caption' }} />
                    </ListItem>
                  ))}
                </List>
              </Paper>
            )}
          </Grid>
        </Grid>
      )}

      {/* ─── TAB 1: Gráficos ─────────────────────────────── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={7}>
            <Paper sx={{ borderRadius: 3, p: 2 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Promedio por Local</Typography>
              {barData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={barData} margin={{ left: 0, right: 20, top: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <RTooltip formatter={(v) => [`${v}%`, 'Promedio']} />
                    <Bar dataKey="promedio" radius={[4, 4, 0, 0]}>
                      {barData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography color="textSecondary" textAlign="center" py={4}>Sin datos disponibles</Typography>
              )}
            </Paper>
          </Grid>

          <Grid item xs={12} md={5}>
            <Paper sx={{ borderRadius: 3, p: 2, height: '100%' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>Distribución por Categoría</Typography>
              {pieData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={90}
                        label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                      </Pie>
                      <RTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1} mt={1}>
                    {pieData.map(d => (
                      <Chip key={d.name} label={`${d.name}: ${d.value}`} size="small"
                        sx={{ bgcolor: d.color, color: '#fff', fontSize: '0.65rem' }} />
                    ))}
                  </Box>
                </>
              ) : (
                <Typography color="textSecondary" textAlign="center" py={4}>Sin datos disponibles</Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ─── TAB 2: Todos los locales ────────────────────── */}
      {tab === 2 && (
        <>
          {/* Locales con revisión */}
          {stats?.estadisticasPorLocal?.length > 0 && (
            <Paper sx={{ borderRadius: 3, mb: 3 }}>
              <Box sx={{ bgcolor: '#424242', p: 2, borderRadius: '12px 12px 0 0' }}>
                <Typography variant="h6" color="#fff" fontWeight={700}>Rendimiento Histórico por Local</Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell fontWeight={600}>Local</TableCell>
                      <TableCell align="center">Revisiones</TableCell>
                      <TableCell>Promedio</TableCell>
                      <TableCell>Categoría</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {stats.estadisticasPorLocal
                      .sort((a, b) => parseFloat(b.promedio) - parseFloat(a.promedio))
                      .map((item) => {
                        const pct = parseFloat(item.promedio);
                        return (
                          <TableRow key={item.local} hover>
                            <TableCell><strong>{item.local}</strong></TableCell>
                            <TableCell align="center">{item.totalRevisiones}</TableCell>
                            <TableCell>
                              <Box display="flex" alignItems="center" gap={1}>
                                <LinearProgress variant="determinate" value={pct}
                                  sx={{ width: 70, height: 7, borderRadius: 4,
                                    '& .MuiLinearProgress-bar': { bgcolor: getPColor(pct) } }} />
                                <Typography variant="body2" fontWeight={700} sx={{ color: getPColor(pct) }}>
                                  {item.promedio}%
                                </Typography>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip label={getCat(pct)} size="small"
                                sx={{ bgcolor: getPColor(pct), color: '#fff', fontWeight: 600 }} />
                            </TableCell>
                          </TableRow>
                        );
                      })}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {/* Locales sin revisión este mes */}
          {localesSinRevision.length > 0 && (
            <Paper sx={{ borderRadius: 3 }}>
              <Box sx={{ bgcolor: '#f59e0b', p: 2, borderRadius: '12px 12px 0 0' }}>
                <Typography variant="h6" color="#fff" fontWeight={700}>
                  ⚠️ Sin Revisión Este Mes ({localesSinRevision.length})
                </Typography>
              </Box>
              <TableContainer>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Local</TableCell>
                      <TableCell>Ciudad</TableCell>
                      <TableCell>Estado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {localesSinRevision.map(l => (
                      <TableRow key={l._id} hover sx={{ bgcolor: '#fffbeb' }}>
                        <TableCell><strong>{l.nombre}</strong></TableCell>
                        <TableCell>{l.ciudad || '—'}</TableCell>
                        <TableCell>
                          <Chip label="Sin revisión" size="small" color="warning" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          )}

          {localesActivos.length === 0 && (
            <Typography textAlign="center" color="textSecondary" py={4}>
              Sin locales registrados
            </Typography>
          )}
        </>
      )}

      {/* ─── TAB 3: Supervisores ─────────────────────────── */}
      {tab === 3 && (
        <Paper sx={{ borderRadius: 3 }}>
          <Box sx={{ bgcolor: '#5c6bc0', p: 2, borderRadius: '12px 12px 0 0' }}>
            <Typography variant="h6" color="#fff" fontWeight={700}>Rendimiento por Supervisor</Typography>
          </Box>
          {supervisores.length === 0 ? (
            <Typography textAlign="center" color="textSecondary" py={4}>Sin datos de supervisores</Typography>
          ) : (
            <Box sx={{ p: 2 }}>
              {supervisores
                .sort((a, b) => parseFloat(b.promedio) - parseFloat(a.promedio))
                .map((sup, i) => {
                  const pct = parseFloat(sup.promedio);
                  return (
                    <Box key={i} display="flex" alignItems="center" gap={2}
                      sx={{ py: 1.5, borderBottom: '1px solid #f0f0f0', '&:last-child': { borderBottom: 0 } }}>
                      <Avatar sx={{ bgcolor: getPColor(pct), width: 34, height: 34, fontSize: 13, fontWeight: 700 }}>
                        {i + 1}
                      </Avatar>
                      <Box sx={{ flex: 1 }}>
                        <Typography fontWeight={600}>{sup.supervisorNombre || '—'}</Typography>
                        <Typography variant="caption" color="textSecondary">
                          {sup.total} revisión{sup.total !== 1 ? 'es' : ''}
                        </Typography>
                      </Box>
                      <Box sx={{ width: 120, display: { xs: 'none', sm: 'block' } }}>
                        <LinearProgress variant="determinate" value={pct}
                          sx={{ height: 7, borderRadius: 4,
                            '& .MuiLinearProgress-bar': { bgcolor: getPColor(pct) } }} />
                      </Box>
                      <Typography fontWeight={800} sx={{ color: getPColor(pct), minWidth: 50, textAlign: 'right' }}>
                        {pct.toFixed(1)}%
                      </Typography>
                    </Box>
                  );
                })}
            </Box>
          )}
        </Paper>
      )}
    </Box>
  );
}
