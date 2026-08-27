import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip, LinearProgress, IconButton,
  Tooltip, Alert, Divider,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Store as StoreIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  CheckCircle as CheckIcon,
  TrendingDown as TrendingDownIcon,
  TrendingFlat as TrendingFlatIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const getPorcentajeColor = (p) => {
  if (p >= 95) return '#4caf50';
  if (p >= 80) return '#2196f3';
  if (p >= 70) return '#ff9800';
  if (p >= 60) return '#f44336';
  return '#d32f2f';
};

const getCategoria = (p) => {
  if (p >= 95) return 'MUY BUENO';
  if (p >= 80) return 'BUENO';
  if (p >= 70) return 'REGULAR';
  if (p >= 60) return 'MALO';
  return 'PÉSIMO';
};

// Tarjeta KPI con icono y color
function KpiCard({ title, value, icon, bg, subtitle }) {
  return (
    <Card sx={{ bgcolor: bg, border: '1px solid #eee', height: '100%' }}>
      <CardContent>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Typography color="textSecondary" variant="body2" gutterBottom>{title}</Typography>
            <Typography variant="h4" fontWeight={700}>{value}</Typography>
            {subtitle && (
              <Typography variant="caption" color="textSecondary">{subtitle}</Typography>
            )}
          </Box>
          {icon}
        </Box>
      </CardContent>
    </Card>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revisionesMes, setRevisionesMes] = useState({});
  const [localesActivos, setLocalesActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimaActualizacion, setUltimaActualizacion] = useState(null);
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
      setUltimaActualizacion(new Date());
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Locales sin revisión este mes
  const localesSinRevision = localesActivos.filter(
    l => !Object.keys(revisionesMes).includes(l.nombre)
  );

  // Locales con puntaje crítico (< 60%)
  const localesCriticos = Object.entries(revisionesMes).filter(
    ([, data]) => data.promedioPorcentaje < 60
  );

  const totalRevisiones = stats?.resumen?.totalRevisiones ??
    Object.values(revisionesMes).reduce((a, v) => a + v.totalRevisiones, 0);

  const promedioGeneral = stats?.resumen?.promedioGeneral ??
    (() => {
      const vals = Object.values(revisionesMes);
      if (!vals.length) return '—';
      return (vals.reduce((a, v) => a + v.promedioPorcentaje, 0) / vals.length).toFixed(1);
    })();

  const kpis = [
    {
      title: 'Total Revisiones',
      value: totalRevisiones,
      subtitle: 'Este mes',
      icon: <AssessmentIcon sx={{ fontSize: 40, color: '#d32f2f' }} />,
      bg: '#fff5f5',
    },
    {
      title: 'Promedio General',
      value: promedioGeneral !== '—' ? `${promedioGeneral}%` : '—',
      subtitle: promedioGeneral !== '—' ? getCategoria(parseFloat(promedioGeneral)) : 'Sin datos',
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: getPorcentajeColor(parseFloat(promedioGeneral) || 0) }} />,
      bg: '#f5fff5',
    },
    {
      title: 'Locales con Revisión',
      value: `${Object.keys(revisionesMes).length} / ${localesActivos.length}`,
      subtitle: localesSinRevision.length > 0 ? `${localesSinRevision.length} sin revisar` : '✅ Todos revisados',
      icon: <StoreIcon sx={{ fontSize: 40, color: '#2196f3' }} />,
      bg: '#f5f8ff',
    },
    {
      title: 'Supervisores Activos',
      value: stats?.estadisticasSupervisores?.length ?? '—',
      subtitle: 'Con revisiones este mes',
      icon: <PeopleIcon sx={{ fontSize: 40, color: '#ff9800' }} />,
      bg: '#fff8f0',
    },
  ];

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  return (
    <Box>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
        <Box>
          <Typography variant="h4" fontWeight={600}>
            Bienvenido, {user?.nombre}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Panel de control — KamiSushi Sistema de Supervisión
          </Typography>
        </Box>
        <Box display="flex" alignItems="center" gap={1}>
          {ultimaActualizacion && (
            <Typography variant="caption" color="textSecondary">
              Actualizado: {ultimaActualizacion.toLocaleTimeString('es-CL')}
            </Typography>
          )}
          <Tooltip title="Actualizar datos">
            <IconButton onClick={() => cargarDatos(true)} disabled={refreshing} size="small">
              {refreshing ? <CircularProgress size={20} /> : <RefreshIcon />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Alertas */}
      {localesCriticos.length > 0 && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <strong>{localesCriticos.length} local(es) con puntaje crítico (&lt;60%):</strong>{' '}
          {localesCriticos.map(([nombre]) => nombre).join(', ')}
        </Alert>
      )}
      {localesSinRevision.length > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <strong>{localesSinRevision.length} local(es) sin revisión este mes:</strong>{' '}
          {localesSinRevision.map(l => l.nombre).join(', ')}
        </Alert>
      )}
      {localesSinRevision.length === 0 && Object.keys(revisionesMes).length > 0 && (
        <Alert severity="success" icon={<CheckIcon />} sx={{ mb: 2 }}>
          Todos los locales tienen al menos una revisión este mes.
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={3} sx={{ mt: 0.5, mb: 3 }}>
        {kpis.map((kpi, i) => (
          <Grid item xs={12} sm={6} md={3} key={i}>
            <KpiCard {...kpi} />
          </Grid>
        ))}
      </Grid>

      {/* Tabla: revisiones del mes por local */}
      {Object.keys(revisionesMes).length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📅 Revisiones del Mes Actual por Local
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#d32f2f' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Local</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }} align="center">Revisiones</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Promedio</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Categoría</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Última Revisión</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(revisionesMes)
                  .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje)
                  .map(([nombre, data]) => {
                    const ultima = data.revisiones[data.revisiones.length - 1];
                    const pct = data.promedioPorcentaje;
                    return (
                      <TableRow key={nombre} hover
                        sx={{ bgcolor: pct < 60 ? '#fff5f5' : 'inherit' }}>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            {pct < 60 && <WarningIcon fontSize="small" color="error" />}
                            <strong>{nombre}</strong>
                          </Box>
                        </TableCell>
                        <TableCell align="center">{data.totalRevisiones}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ width: 80, height: 8, borderRadius: 4,
                                '& .MuiLinearProgress-bar': { bgcolor: getPorcentajeColor(pct) } }} />
                            <Typography variant="body2" fontWeight={700}
                              sx={{ color: getPorcentajeColor(pct), minWidth: 45 }}>
                              {pct.toFixed(1)}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={getCategoria(pct)} size="small"
                            sx={{ bgcolor: getPorcentajeColor(pct), color: '#fff', fontWeight: 600 }} />
                        </TableCell>
                        <TableCell>
                          {ultima ? new Date(ultima.fecha).toLocaleDateString('es-CL') : '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Locales sin revisión */}
      {localesSinRevision.length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            ⚠️ Locales Sin Revisión Este Mes
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#ff9800' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Local</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Ciudad</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Estado</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localesSinRevision.map(local => (
                  <TableRow key={local._id} hover sx={{ bgcolor: '#fff8f0' }}>
                    <TableCell><strong>{local.nombre}</strong></TableCell>
                    <TableCell>{local.ciudad || '—'}</TableCell>
                    <TableCell>
                      <Chip label="Sin revisión" size="small" color="warning" variant="outlined" />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Rendimiento general por local */}
      {stats?.estadisticasPorLocal?.length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📊 Rendimiento General por Local (Histórico)
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#424242' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Local</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }} align="center">Revisiones</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Promedio</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Categoría</TableCell>
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
                              sx={{ width: 80, height: 8, borderRadius: 4,
                                '& .MuiLinearProgress-bar': { bgcolor: getPorcentajeColor(pct) } }} />
                            <Typography variant="body2" fontWeight={700}
                              sx={{ color: getPorcentajeColor(pct), minWidth: 45 }}>
                              {item.promedio}%
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip label={getCategoria(pct)} size="small"
                            sx={{ bgcolor: getPorcentajeColor(pct), color: '#fff', fontWeight: 600 }} />
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Supervisores */}
      {stats?.estadisticasSupervisores?.length > 0 && (
        <Box mb={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            👥 Rendimiento por Supervisor
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#5c6bc0' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Supervisor</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }} align="center">Revisiones</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Promedio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.estadisticasSupervisores
                  .sort((a, b) => parseFloat(b.promedio) - parseFloat(a.promedio))
                  .map((sup, i) => {
                    const pct = parseFloat(sup.promedio);
                    return (
                      <TableRow key={i} hover>
                        <TableCell><strong>{sup.supervisorNombre || '—'}</strong></TableCell>
                        <TableCell align="center">{sup.total}</TableCell>
                        <TableCell>
                          <Box display="flex" alignItems="center" gap={1}>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ width: 80, height: 8, borderRadius: 4,
                                '& .MuiLinearProgress-bar': { bgcolor: getPorcentajeColor(pct) } }} />
                            <Typography variant="body2" fontWeight={700}
                              sx={{ color: getPorcentajeColor(pct), minWidth: 45 }}>
                              {sup.promedio.toFixed ? sup.promedio.toFixed(1) : sup.promedio}%
                            </Typography>
                          </Box>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Sin datos */}
      {Object.keys(revisionesMes).length === 0 && !stats && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">No hay datos disponibles para este mes.</Typography>
        </Paper>
      )}
    </Box>
  );
}
