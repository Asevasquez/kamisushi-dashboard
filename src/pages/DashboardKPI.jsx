import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Collapse,
  Button,
  Tab,
  Tabs,
  LinearProgress,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  ExpandMore as ExpandMoreIcon,
  ExpandLess as ExpandLessIcon,
  Store as StoreIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  People as PeopleIcon,
  Warning as WarningIcon,
  CheckCircle as CheckCircleIcon,
  BarChart as BarChartIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  EXCELENTE: '#4caf50',
  'MUY BUENO': '#8bc34a',
  BUENO: '#2196f3',
  REGULAR: '#ff9800',
  MALO: '#f44336',
  PÉSIMO: '#d32f2f',
};

const getCategoriaColor = (categoria) => {
  return COLORS[categoria] || '#9e9e9e';
};

export default function DashboardKPI() {
  const [kpiData, setKpiData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mensual');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [locales, setLocales] = useState([]);
  const [expandedLocal, setExpandedLocal] = useState(null);
  const [detalleLocal, setDetalleLocal] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    cargarLocales();
  }, []);

  useEffect(() => {
    cargarKPIs();
  }, [periodo, selectedLocal]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/estadisticas/mis-locales');
      setLocales(response.data);
      if (response.data.length > 0 && !selectedLocal) {
        setSelectedLocal(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error cargando locales:', error);
    }
  };

  const cargarKPIs = async () => {
    setLoading(true);
    try {
      const params = { periodo };
      if (selectedLocal) params.localId = selectedLocal;
      const response = await api.get('/estadisticas/kpi/completo', { params });
      setKpiData(response.data);
    } catch (error) {
      console.error('Error cargando KPIs:', error);
    } finally {
      setLoading(false);
    }
  };

  const cargarDetalleLocal = async (localId) => {
    try {
      const response = await api.get(`/estadisticas/kpi/local/${localId}`, {
        params: { periodo }
      });
      setDetalleLocal(response.data);
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  const handleExpandLocal = async (localId) => {
    if (expandedLocal === localId) {
      setExpandedLocal(null);
      setDetalleLocal(null);
    } else {
      setExpandedLocal(localId);
      await cargarDetalleLocal(localId);
    }
  };

  const renderKPICards = () => {
    if (!kpiData?.kpis) return null;
    
    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {kpiData.kpis.map((kpi, index) => (
          <Grid item xs={12} sm={6} md={4} key={index}>
            <Card sx={{ 
              borderTop: `4px solid ${kpi.color}`,
              transition: 'transform 0.2s',
              '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
            }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography variant="h2" fontSize={36} fontWeight={700} color={kpi.color}>
                      {kpi.valor}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      {kpi.descripcion}
                    </Typography>
                  </Box>
                  <Typography fontSize={40}>{kpi.icono}</Typography>
                </Box>
                <Typography variant="subtitle2" color="textSecondary" sx={{ mt: 1 }}>
                  {kpi.titulo}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    );
  };

  const renderResumenGlobal = () => {
    if (!kpiData?.resumenGlobal) return null;
    
    const resumen = kpiData.resumenGlobal;
    
    // Datos para gráfico de distribución
    const distribucionData = Object.entries(resumen.distribucionCategorias || {}).map(([name, value]) => ({
      name,
      value,
      color: COLORS[name]
    })).filter(d => d.value > 0);
    
    return (
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          📈 Resumen Global del Período
        </Typography>
        
        <Grid container spacing={3}>
          {/* Resumen en números */}
          <Grid item xs={12} md={6}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">Total Revisiones</Typography>
                <Typography variant="h6" fontWeight={600}>{resumen.totalRevisiones}</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={resumen.promedioGeneral} 
                sx={{ height: 8, borderRadius: 4 }}
              />
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">Promedio General</Typography>
                <Typography variant="h6" fontWeight={600} color="primary">
                  {resumen.promedioGeneral.toFixed(1)}%
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  <PersonIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  Asistencia Admin
                </Typography>
                <Chip 
                  label={`${resumen.tasaAsistenciaAdmin.toFixed(1)}%`}
                  size="small"
                  color={resumen.tasaAsistenciaAdmin >= 80 ? 'success' : resumen.tasaAsistenciaAdmin >= 50 ? 'warning' : 'error'}
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  <PeopleIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  Asistencia SubAdmin
                </Typography>
                <Chip 
                  label={`${resumen.tasaAsistenciaSubAdmin.toFixed(1)}%`}
                  size="small"
                  color={resumen.tasaAsistenciaSubAdmin >= 80 ? 'success' : resumen.tasaAsistenciaSubAdmin >= 50 ? 'warning' : 'error'}
                />
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  <WarningIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  Reclamos x Visita
                </Typography>
                <Typography variant="h6" fontWeight={600} color="error">
                  {resumen.promedioReclamosPorVisita.toFixed(1)}
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="body2" color="textSecondary">
                  <CheckCircleIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
                  Cumplimiento Items
                </Typography>
                <Typography variant="h6" fontWeight={600} color="success.main">
                  {resumen.tasaCumplimientoItems.toFixed(1)}%
                </Typography>
              </Box>
            </Box>
          </Grid>
          
          {/* Gráfico de distribución */}
          <Grid item xs={12} md={6}>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              Distribución por Categoría
            </Typography>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={distribucionData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {distribucionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Mejor y peor local */}
            <Box display="flex" justifyContent="space-between" mt={2}>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingUpIcon sx={{ color: '#4caf50' }} />
                <Typography variant="body2">Mejor Local</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {resumen.mejorLocal?.nombre || '—'}
                </Typography>
                <Chip 
                  label={`${resumen.mejorLocal?.promedio?.toFixed(1) || 0}%`}
                  size="small"
                  color="success"
                />
              </Box>
              <Box display="flex" alignItems="center" gap={1}>
                <TrendingDownIcon sx={{ color: '#f44336' }} />
                <Typography variant="body2">Peor Local</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {resumen.peorLocal?.nombre || '—'}
                </Typography>
                <Chip 
                  label={`${resumen.peorLocal?.promedio?.toFixed(1) || 0}%`}
                  size="small"
                  color="error"
                />
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>
    );
  };

  const renderDetallePorLocal = () => {
    if (!kpiData?.detallePorLocal || kpiData.detallePorLocal.length === 0) {
      return (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="textSecondary">No hay datos de locales en el período seleccionado</Typography>
        </Paper>
      );
    }
    
    return (
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" fontWeight={600} gutterBottom>
          🏢 Detalle por Local
        </Typography>
        
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#d32f2f' }}>
                <TableCell sx={{ color: '#fff' }}>Local</TableCell>
                <TableCell sx={{ color: '#fff' }} align="center">Revisiones</TableCell>
                <TableCell sx={{ color: '#fff' }} align="center">Promedio</TableCell>
                <TableCell sx={{ color: '#fff' }} align="center">Asistencia Admin</TableCell>
                <TableCell sx={{ color: '#fff' }} align="center">Reclamos x Visita</TableCell>
                <TableCell sx={{ color: '#fff' }} align="center">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {kpiData.detallePorLocal.map((local) => (
                <React.Fragment key={local.localId}>
                  <TableRow hover>
                    <TableCell>
                      <strong>{local.localNombre}</strong>
                    </TableCell>
                    <TableCell align="center">{local.totalRevisiones}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${local.promedioPorcentaje.toFixed(1)}%`}
                        size="small"
                        sx={{
                          bgcolor: getCategoriaColor(
                            local.promedioPorcentaje >= 90 ? 'EXCELENTE' :
                            local.promedioPorcentaje >= 80 ? 'MUY BUENO' :
                            local.promedioPorcentaje >= 70 ? 'BUENO' :
                            local.promedioPorcentaje >= 60 ? 'REGULAR' : 'MALO'
                          ),
                          color: '#fff'
                        }}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${local.tasaAsistenciaAdmin.toFixed(1)}%`}
                        size="small"
                        color={local.tasaAsistenciaAdmin >= 80 ? 'success' : 'warning'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Chip
                        label={local.promedioReclamosPorVisita.toFixed(1)}
                        size="small"
                        color={local.promedioReclamosPorVisita > 2 ? 'error' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="center">
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => handleExpandLocal(local.localId)}
                        endIcon={expandedLocal === local.localId ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                      >
                        {expandedLocal === local.localId ? 'Ocultar' : 'Ver Detalle'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  
                  {/* Fila expandida con detalle */}
                  <TableRow>
                    <TableCell colSpan={6} style={{ paddingBottom: 0, paddingTop: 0 }}>
                      <Collapse in={expandedLocal === local.localId} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 2, p: 2, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                          {detalleLocal?.estadisticas ? (
                            <Grid container spacing={2}>
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>Estadísticas Detalladas</Typography>
                                <Box display="flex" flexDirection="column" gap={1}>
                                  <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2">Tasa Asistencia SubAdmin</Typography>
                                    <Chip label={`${detalleLocal.estadisticas.tasaAsistenciaSubAdmin?.toFixed(1) || 0}%`} size="small" />
                                  </Box>
                                  <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2">Total Reclamos</Typography>
                                    <Chip label={detalleLocal.estadisticas.totalReclamos || 0} size="small" color="warning" />
                                  </Box>
                                  <Box display="flex" justifyContent="space-between">
                                    <Typography variant="body2">Cumplimiento Items</Typography>
                                    <Chip label={`${detalleLocal.estadisticas.tasaCumplimientoItems?.toFixed(1) || 0}%`} size="small" color="success" />
                                  </Box>
                                </Box>
                                
                                {/* Top reclamos por tipo */}
                                {detalleLocal.estadisticas.reclamosPorTipo?.length > 0 && (
                                  <Box mt={2}>
                                    <Typography variant="subtitle2" gutterBottom>Top Reclamos</Typography>
                                    {detalleLocal.estadisticas.reclamosPorTipo.slice(0, 3).map((reclamo, idx) => (
                                      <Box key={idx} display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
                                        <Typography variant="caption">{reclamo.tipo?.substring(0, 30)}</Typography>
                                        <Chip label={reclamo.count} size="small" variant="outlined" />
                                      </Box>
                                    ))}
                                  </Box>
                                )}
                              </Grid>
                              
                              <Grid item xs={12} md={6}>
                                <Typography variant="subtitle2" gutterBottom>Distribución Categorías</Typography>
                                <Box display="flex" flexWrap="wrap" gap={1}>
                                  {Object.entries(detalleLocal.estadisticas.distribucionCategorias || {}).map(([cat, count]) => 
                                    count > 0 && (
                                      <Chip 
                                        key={cat}
                                        label={`${cat}: ${count}`}
                                        size="small"
                                        sx={{ bgcolor: COLORS[cat], color: '#fff' }}
                                      />
                                    )
                                  )}
                                </Box>
                              </Grid>
                            </Grid>
                          ) : (
                            <CircularProgress size={24} />
                          )}
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    );
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        📊 Panel de Control de KPIs
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Asistencia de administradores, reclamos, cumplimiento y clasificaciones
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Período</InputLabel>
          <Select value={periodo} onChange={(e) => setPeriodo(e.target.value)} label="Período">
            <MenuItem value="semanal">Semanal</MenuItem>
            <MenuItem value="mensual">Mensual</MenuItem>
            <MenuItem value="trimestral">Trimestral</MenuItem>
            <MenuItem value="anual">Anual</MenuItem>
          </Select>
        </FormControl>
        
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Local</InputLabel>
          <Select value={selectedLocal} onChange={(e) => setSelectedLocal(e.target.value)} label="Local">
            {locales.map((local) => (
              <MenuItem key={local._id} value={local._id}>{local.nombre}</MenuItem>
            ))}
          </Select>
        </FormControl>
        
        <Button variant="contained" onClick={cargarKPIs} sx={{ bgcolor: '#d32f2f' }}>
          Actualizar
        </Button>
      </Paper>

      {/* KPIs Cards */}
      {renderKPICards()}

      {/* Resumen Global */}
      {renderResumenGlobal()}

      {/* Detalle por Local */}
      {renderDetallePorLocal()}
    </Box>
  );
}