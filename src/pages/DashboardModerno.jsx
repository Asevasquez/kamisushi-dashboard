import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Chip, Paper, IconButton, Button, Tooltip, LinearProgress,
  Alert, Avatar, Divider, Tab, Tabs, List, ListItem,
  ListItemText, ListItemIcon,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Store as StoreIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
  EmojiEvents as TrophyIcon,
  People as PeopleIcon,
} from '@mui/icons-material';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Colores ────────────────────────────────────────────────
const C = {
  primary: '#d32f2f',
  primaryLight: '#ef5350',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  purple: '#7c3aed',
  bg: '#f8fafc',
};

const CAT_COLORS = {
  'EXCELENTE': '#10b981',
  'MUY BUENO': '#34d399',
  'BUENO': '#3b82f6',
  'REGULAR': '#f59e0b',
  'MALO': '#ef4444',
  'PÉSIMO': '#d32f2f',
};

const getPColor = (p) => {
  if (p >= 95) return C.success;
  if (p >= 80) return C.info;
  if (p >= 70) return C.warning;
  if (p >= 60) return C.error;
  return C.primary;
};

const getCat = (p) => {
  if (p >= 95) return 'MUY BUENO';
  if (p >= 80) return 'BUENO';
  if (p >= 70) return 'REGULAR';
  if (p >= 60) return 'MALO';
  return 'PÉSIMO';
};

// ─── Componentes ─────────────────────────────────────────────

function KPICard({ title, value, subtitle, icon, color, trend }) {
  return (
    <Card sx={{
      borderRadius: 3,
      background: `linear-gradient(135deg, ${color} 0%, ${color}cc 100%)`,
      color: '#fff',
      boxShadow: `0 8px 20px -4px ${color}55`,
      transition: 'transform 0.2s',
      '&:hover': { transform: 'translateY(-4px)' },
    }}>
      <CardContent sx={{ p: 2.5 }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography variant="caption" sx={{ opacity: 0.85, letterSpacing: 0.5 }}>{title}</Typography>
            <Typography variant="h4" fontWeight={800} sx={{ lineHeight: 1.2, mt: 0.3 }}>{value}</Typography>
            {subtitle && (
              <Typography variant="caption" sx={{ opacity: 0.75, display: 'block', mt: 0.3 }}>{subtitle}</Typography>
            )}
          </Box>
          <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 48, height: 48, borderRadius: 2 }}>
            <Box fontSize={24}>{icon}</Box>
          </Avatar>
        </Box>
        {trend !== undefined && (
          <Box display="flex" alignItems="center" gap={0.5} mt={1}>
            {trend > 0
              ? <TrendingUpIcon fontSize="small" sx={{ opacity: 0.8 }} />
              : <TrendingDownIcon fontSize="small" sx={{ opacity: 0.8 }} />}
            <Typography variant="caption" sx={{ opacity: 0.8 }}>
              {trend > 0 ? '+' : ''}{trend.toFixed(1)}% vs mes anterior
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
}

function LocalCard({ nombre, pct, revisiones, ciudad }) {
  const color = getPColor(pct);
  return (
    <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: 4 }, transition: 'box-shadow 0.2s' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle2" fontWeight={700} noWrap>{nombre}</Typography>
            {ciudad && <Typography variant="caption" color="textSecondary">{ciudad}</Typography>}
          </Box>
          <Chip label={getCat(pct)} size="small"
            sx={{ bgcolor: color, color: '#fff', fontWeight: 600, fontSize: '0.65rem' }} />
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ color, lineHeight: 1 }}>{pct.toFixed(1)}%</Typography>
        <Box mt={1}>
          <LinearProgress variant="determinate" value={pct}
            sx={{ height: 6, borderRadius: 3, bgcolor: `${color}22`,
              '& .MuiLinearProgress-bar': { bgcolor: color } }} />
        </Box>
        <Typography variant="caption" color="textSecondary" mt={0.5} display="block">
          {revisiones} revisión{revisiones !== 1 ? 'es' : ''}
        </Typography>
      </CardContent>
    </Card>
  );
}

// ─── Componente principal ────────────────────────────────────
export default function DashboardModerno() {
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

  // ─── Cálculos ────────────────────────────────────────────
  const localesSinRevision = localesActivos.filter(l => !Object.keys(revisionesMes).includes(l.nombre));
  const localesCriticos = Object.entries(revisionesMes).filter(([, d]) => d.promedioPorcentaje < 60);

  const promedioGeneral = (() => {
    const vals = Object.values(revisionesMes);
    if (!vals.length) return stats?.resumen?.promedioGeneral || 0;
    return vals.reduce((a, v) => a + v.promedioPorcentaje, 0) / vals.length;
  })();

  const totalRevisiones = stats?.resumen?.totalRevisiones ||
    Object.values(revisionesMes).reduce((a, v) => a + v.totalRevisiones, 0);

  const mejorLocal = Object.entries(revisionesMes)
    .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje)[0];
  const peorLocal = Object.entries(revisionesMes)
    .sort(([, a], [, b]) => a.promedioPorcentaje - b.promedioPorcentaje)[0];

  // Datos para gráficos
  const distribucionData = (() => {
    if (!stats?.distribucionCategorias) return [];
    return Object.entries(stats.distribucionCategorias)
      .filter(([, v]) => v > 0)
      .map(([name, value]) => ({ name, value, color: CAT_COLORS[name] || '#999' }));
  })();

  const localesBarData = Object.entries(revisionesMes)
    .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje)
    .slice(0, 10)
    .map(([nombre, data]) => ({
      nombre: nombre.length > 12 ? nombre.substring(0, 12) + '…' : nombre,
      promedio: parseFloat(data.promedioPorcentaje.toFixed(1)),
      color: getPColor(data.promedioPorcentaje),
    }));

  const supervisoresData = (stats?.estadisticasSupervisores || [])
    .sort((a, b) => parseFloat(b.promedio) - parseFloat(a.promedio));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: C.primary }} />
      </Box>
    );
  }

  return (
    <Box sx={{ bgcolor: C.bg, minHeight: '100vh' }}>

      {/* ─── HEADER ─────────────────────────────────────── */}
      <Paper elevation={0} sx={{
        background: `linear-gradient(135deg, ${C.primary} 0%, ${C.primaryLight} 100%)`,
        borderRadius: 3, p: 3, mb: 3, color: '#fff',
      }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={800}>🍣 KamiSushi — Supervisión</Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              Bienvenido, {user?.nombre} · {user?.rol}
            </Typography>
            {ultimaAct && (
              <Typography variant="caption" sx={{ opacity: 0.7 }}>
                Actualizado: {ultimaAct.toLocaleTimeString('es-CL')}
              </Typography>
            )}
          </Box>
          <Tooltip title="Actualizar">
            <IconButton onClick={() => cargarDatos(true)} disabled={refreshing}
              sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
              {refreshing ? <CircularProgress size={20} color="inherit" /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>

        {/* Stats rápidos */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          {[
            { label: 'Revisiones', value: totalRevisiones, icon: <AssignmentIcon /> },
            { label: 'Promedio', value: `${promedioGeneral.toFixed(1)}%`, icon: <TrendingUpIcon /> },
            { label: 'Locales revisados', value: `${Object.keys(revisionesMes).length}/${localesActivos.length}`, icon: <StoreIcon /> },
            { label: 'Supervisores', value: supervisoresData.length || '—', icon: <PeopleIcon /> },
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

      {/* ─── ALERTAS ────────────────────────────────────── */}
      {localesCriticos.length > 0 && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{localesCriticos.length} local(es) con puntaje crítico (&lt;60%):</strong>{' '}
          {localesCriticos.map(([n]) => n).join(', ')}
        </Alert>
      )}
      {localesSinRevision.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          <strong>{localesSinRevision.length} local(es) sin revisión este mes:</strong>{' '}
          {localesSinRevision.map(l => l.nombre).join(', ')}
        </Alert>
      )}
      {localesSinRevision.length === 0 && Object.keys(revisionesMes).length > 0 && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          ✅ Todos los locales tienen revisión este mes.
        </Alert>
      )}

      {/* ─── KPI CARDS ──────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Total Revisiones" value={totalRevisiones}
            subtitle="Este mes" icon="📋" color={C.primary} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard title="Promedio General" value={`${promedioGeneral.toFixed(1)}%`}
            subtitle={getCat(promedioGeneral)} icon="📊" color={getPColor(promedioGeneral)} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Mejor Local" icon="🏆"
            value={mejorLocal ? mejorLocal[0].substring(0, 10) : '—'}
            subtitle={mejorLocal ? `${mejorLocal[1].promedioPorcentaje.toFixed(1)}%` : ''}
            color={C.success} />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Requiere Atención" icon="⚠️"
            value={localesCriticos.length + localesSinRevision.length}
            subtitle="Locales críticos o sin revisión"
            color={localesCriticos.length > 0 ? C.error : C.warning} />
        </Grid>
      </Grid>

      {/* ─── TABS ───────────────────────────────────────── */}
      <Paper sx={{ borderRadius: 2, mb: 2 }}>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable">
          <Tab label="📅 Este Mes" />
          <Tab label="📊 Gráficos" />
          <Tab label="🏢 Locales" />
          <Tab label="👥 Supervisores" />
        </Tabs>
      </Paper>

      {/* ─── TAB 0: Este mes ───────────────────────────── */}
      {tab === 0 && (
        <Grid container spacing={3}>
          {/* Tabla mes */}
          <Grid item xs={12} lg={8}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <Box sx={{ bgcolor: C.primary, p: 2 }}>
                <Typography variant="h6" color="#fff" fontWeight={700}>
                  Revisiones del Mes Actual
                </Typography>
              </Box>
              {Object.keys(revisionesMes).length === 0 ? (
                <Box p={4} textAlign="center">
                  <Typography color="textSecondary">Sin revisiones este mes</Typography>
                </Box>
              ) : (
                <Box>
                  {Object.entries(revisionesMes)
                    .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje)
                    .map(([nombre, data]) => {
                      const pct = data.promedioPorcentaje;
                      const color = getPColor(pct);
                      const ultima = data.revisiones[data.revisiones.length - 1];
                      return (
                        <Box key={nombre} sx={{
                          display: 'flex', alignItems: 'center', p: 2,
                          borderBottom: '1px solid #f0f0f0',
                          bgcolor: pct < 60 ? '#fff5f5' : 'inherit',
                          '&:last-child': { borderBottom: 0 },
                        }}>
                          <Box sx={{ flex: 1 }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              {pct < 60 && <WarningIcon fontSize="small" color="error" />}
                              <Typography fontWeight={600}>{nombre}</Typography>
                            </Box>
                            <Typography variant="caption" color="textSecondary">
                              {data.totalRevisiones} revisión{data.totalRevisiones !== 1 ? 'es' : ''} ·
                              última: {ultima ? new Date(ultima.fecha).toLocaleDateString('es-CL') : '—'}
                            </Typography>
                          </Box>
                          <Box sx={{ width: 120, mx: 2, display: { xs: 'none', sm: 'block' } }}>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ height: 8, borderRadius: 4, bgcolor: `${color}22`,
                                '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                          </Box>
                          <Typography fontWeight={800} sx={{ color, minWidth: 50, textAlign: 'right' }}>
                            {pct.toFixed(1)}%
                          </Typography>
                        </Box>
                      );
                    })}
                </Box>
              )}
            </Paper>
          </Grid>

          {/* Panel lateral */}
          <Grid item xs={12} lg={4}>
            {/* Mejor/Peor */}
            <Paper sx={{ borderRadius: 3, p: 2, mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>🏆 Destacados</Typography>
              {mejorLocal && (
                <Box display="flex" alignItems="center" gap={1} mb={1}
                  sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #86efac' }}>
                  <TrophyIcon sx={{ color: C.success }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">Mejor local</Typography>
                    <Typography fontWeight={700}>{mejorLocal[0]}</Typography>
                  </Box>
                  <Chip label={`${mejorLocal[1].promedioPorcentaje.toFixed(1)}%`} size="small"
                    sx={{ ml: 'auto', bgcolor: C.success, color: '#fff', fontWeight: 700 }} />
                </Box>
              )}
              {peorLocal && (
                <Box display="flex" alignItems="center" gap={1}
                  sx={{ p: 1.5, bgcolor: '#fff5f5', borderRadius: 2, border: '1px solid #fca5a5' }}>
                  <WarningIcon sx={{ color: C.error }} />
                  <Box>
                    <Typography variant="caption" color="textSecondary">Requiere atención</Typography>
                    <Typography fontWeight={700}>{peorLocal[0]}</Typography>
                  </Box>
                  <Chip label={`${peorLocal[1].promedioPorcentaje.toFixed(1)}%`} size="small"
                    sx={{ ml: 'auto', bgcolor: getPColor(peorLocal[1].promedioPorcentaje), color: '#fff', fontWeight: 700 }} />
                </Box>
              )}
            </Paper>

            {/* Locales sin revisión */}
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

      {/* ─── TAB 1: Gráficos ───────────────────────────── */}
      {tab === 1 && (
        <Grid container spacing={3}>
          {/* Gráfico de barras por local */}
          <Grid item xs={12} md={7}>
            <Paper sx={{ borderRadius: 3, p: 2 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>📊 Promedio por Local</Typography>
              {localesBarData.length > 0 ? (
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={localesBarData} margin={{ left: 0, right: 20, top: 10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="nombre" angle={-35} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} unit="%" tick={{ fontSize: 11 }} />
                    <RechartsTooltip formatter={(v) => [`${v}%`, 'Promedio']} />
                    <Bar dataKey="promedio" radius={[4, 4, 0, 0]}>
                      {localesBarData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Box p={4} textAlign="center"><Typography color="textSecondary">Sin datos</Typography></Box>
              )}
            </Paper>
          </Grid>

          {/* Gráfico de distribución */}
          <Grid item xs={12} md={5}>
            <Paper sx={{ borderRadius: 3, p: 2, height: '100%' }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>🎯 Distribución por Categoría</Typography>
              {distribucionData.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={240}>
                    <PieChart>
                      <Pie data={distribucionData} dataKey="value" nameKey="name"
                        cx="50%" cy="50%" outerRadius={90} label={({ name, percent }) =>
                          `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                        {distribucionData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1} mt={1}>
                    {distribucionData.map(d => (
                      <Chip key={d.name} label={`${d.name}: ${d.value}`} size="small"
                        sx={{ bgcolor: d.color, color: '#fff', fontSize: '0.65rem' }} />
                    ))}
                  </Box>
                </>
              ) : (
                <Box p={4} textAlign="center"><Typography color="textSecondary">Sin datos</Typography></Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* ─── TAB 2: Locales ───────────────────────────── */}
      {tab === 2 && (
        <Grid container spacing={2}>
          {Object.entries(revisionesMes)
            .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje)
            .map(([nombre, data]) => {
              const local = localesActivos.find(l => l.nombre === nombre);
              return (
                <Grid item xs={12} sm={6} md={4} lg={3} key={nombre}>
                  <LocalCard nombre={nombre} pct={data.promedioPorcentaje}
                    revisiones={data.totalRevisiones} ciudad={local?.ciudad} />
                </Grid>
              );
            })}
          {localesSinRevision.map(l => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={l._id}>
              <Card sx={{ borderRadius: 2, opacity: 0.6, border: '2px dashed #ccc' }}>
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                  <Typography variant="subtitle2" fontWeight={700}>{l.nombre}</Typography>
                  <Typography variant="caption" color="textSecondary">{l.ciudad}</Typography>
                  <Box mt={1}>
                    <Chip label="Sin revisión este mes" size="small" color="warning" variant="outlined" />
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {localesActivos.length === 0 && (
            <Grid item xs={12}>
              <Typography textAlign="center" color="textSecondary" py={4}>Sin locales registrados</Typography>
            </Grid>
          )}
        </Grid>
      )}

      {/* ─── TAB 3: Supervisores ──────────────────────── */}
      {tab === 3 && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
          <Box sx={{ bgcolor: '#5c6bc0', p: 2 }}>
            <Typography variant="h6" color="#fff" fontWeight={700}>👥 Rendimiento por Supervisor</Typography>
          </Box>
          {supervisoresData.length === 0 ? (
            <Box p={4} textAlign="center">
              <Typography color="textSecondary">Sin datos de supervisores</Typography>
            </Box>
          ) : (
            supervisoresData.map((sup, i) => {
              const pct = parseFloat(sup.promedio);
              const color = getPColor(pct);
              return (
                <Box key={i} sx={{
                  display: 'flex', alignItems: 'center', p: 2,
                  borderBottom: '1px solid #f0f0f0',
                  '&:last-child': { borderBottom: 0 },
                }}>
                  <Avatar sx={{ bgcolor: color, mr: 2, width: 36, height: 36, fontSize: 14, fontWeight: 700 }}>
                    {i + 1}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography fontWeight={600}>{sup.supervisorNombre || '—'}</Typography>
                    <Typography variant="caption" color="textSecondary">
                      {sup.total} revisión{sup.total !== 1 ? 'es' : ''}
                    </Typography>
                  </Box>
                  <Box sx={{ width: 120, mx: 2, display: { xs: 'none', sm: 'block' } }}>
                    <LinearProgress variant="determinate" value={pct}
                      sx={{ height: 8, borderRadius: 4, bgcolor: `${color}22`,
                        '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                  </Box>
                  <Typography fontWeight={800} sx={{ color, minWidth: 50, textAlign: 'right' }}>
                    {sup.promedio.toFixed ? sup.promedio.toFixed(1) : sup.promedio}%
                  </Typography>
                </Box>
              );
            })
          )}
        </Paper>
      )}
    </Box>
  );
}
