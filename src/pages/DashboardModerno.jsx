// dashboard/src/pages/DashboardModerno.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Chip,
  Paper,
  IconButton,
  Button,
  Menu,
  MenuItem,
  Grow,
  Avatar,
  Divider,
  alpha,
  Tooltip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Radio,
  RadioGroup,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Store as StoreIcon,
  Assignment as AssignmentIcon,
  Person as PersonIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CalendarToday as CalendarIcon,
  EmojiEvents as EmojiEventsIcon,
  Timeline as TimelineIcon,
  Speed as SpeedIcon,
  ThumbUp as ThumbUpIcon,
  ThumbDown as ThumbDownIcon,
  Flag as FlagIcon,
  TrackChanges as TrackChangesIcon,
  ExpandMore as ExpandMoreIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Add as AddIcon,
  Phone as PhoneIcon,
  AttachMoney as MoneyIcon,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  EXCELENTE: '#10b981',
  'MUY BUENO': '#34d399',
  BUENO: '#3b82f6',
  REGULAR: '#f59e0b',
  MALO: '#ef4444',
  PÉSIMO: '#dc2626',
  primary: '#d32f2f',
  primaryLight: '#ef5350',
  secondary: '#7c3aed',
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  background: '#f8fafc',
  surface: '#ffffff',
};

const MotionCard = motion(Card);

// Componente de tarjeta KPI
const KPICard = ({ title, value, icon, color, subtitle, delay }) => {
  return (
    <Grow in timeout={delay}>
      <MotionCard
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: delay / 1000 }}
        sx={{
          borderRadius: 3,
          background: `linear-gradient(135deg, ${color} 0%, ${alpha(color, 0.8)} 100%)`,
          boxShadow: `0 10px 25px -5px ${alpha(color, 0.3)}`,
          transition: 'transform 0.3s ease',
          '&:hover': { transform: 'translateY(-4px)' },
        }}
      >
        <CardContent sx={{ p: 2.5 }}>
          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ opacity: 0.8, letterSpacing: 1 }}>
                {title}
              </Typography>
              <Typography variant="h4" fontWeight={800} sx={{ fontSize: { xs: 28, md: 32 }, lineHeight: 1.2, mt: 0.5 }}>
                {value}
              </Typography>
              {subtitle && (
                <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                  {subtitle}
                </Typography>
              )}
            </Box>
            <Avatar sx={{ bgcolor: alpha('#fff', 0.2), width: 48, height: 48, borderRadius: 2 }}>
              <Box component="span" fontSize={24}>{icon}</Box>
            </Avatar>
          </Box>
        </CardContent>
      </MotionCard>
    </Grow>
  );
};

// Componente de tarjeta de meta
const MetaCard = ({ meta, canEdit, onEdit, onDelete }) => {
  const getColor = () => {
    if (meta.porcentajeCumplimiento >= 90) return COLORS.success;
    if (meta.porcentajeCumplimiento >= 70) return COLORS.info;
    if (meta.porcentajeCumplimiento >= 50) return COLORS.warning;
    return COLORS.error;
  };

  const getTipoLabel = (tipo) => {
    const tipos = {
      promedioGeneral: 'Promedio General',
      asistenciaAdmin: 'Asistencia Admin',
      reclamosPorVisita: 'Reclamos x Visita',
      revisionesPorMes: 'Revisiones por Mes'
    };
    return tipos[tipo] || tipo;
  };

  return (
    <MotionCard whileHover={{ scale: 1.02 }} sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center">
          <Box sx={{ flex: 1 }}>
            <Typography variant="caption" color="textSecondary">
              {meta.localNombre} • {getTipoLabel(meta.tipo)}
            </Typography>
            <Typography variant="subtitle2" fontWeight={700} noWrap>
              {meta.nombre}
            </Typography>
            <Typography variant="h5" fontWeight={700}>
              {meta.valorActual?.toFixed(1)} / {meta.valorObjetivo}
            </Typography>
          </Box>
          <Avatar sx={{ bgcolor: alpha(getColor(), 0.1), color: getColor(), width: 40, height: 40 }}>
            <TrackChangesIcon />
          </Avatar>
        </Box>
        <LinearProgress
          variant="determinate"
          value={meta.porcentajeCumplimiento}
          sx={{ mt: 1.5, height: 6, borderRadius: 3, bgcolor: alpha(getColor(), 0.2), '& .MuiLinearProgress-bar': { bgcolor: getColor() } }}
        />
        <Box display="flex" justifyContent="space-between" alignItems="center" mt={0.5}>
          <Typography variant="caption" color="textSecondary">
            {meta.porcentajeCumplimiento.toFixed(0)}% cumplido
          </Typography>
          {canEdit && (
            <Box>
              <IconButton size="small" onClick={() => onEdit(meta)}>
                <EditIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" onClick={() => onDelete(meta)}>
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          )}
        </Box>
        {meta.cumplida && (
          <Chip label="¡Meta cumplida!" size="small" color="success" sx={{ mt: 1, height: 20, fontSize: '0.7rem' }} />
        )}
      </CardContent>
    </MotionCard>
  );
};

// Componente de tarjeta de reclamo
const ReclamoCard = ({ reclamo, onActualizar }) => {
  const [estado, setEstado] = useState(reclamo.estado);
  
  const handleCambiarEstado = async (nuevoEstado) => {
    try {
      await api.put(`/estadisticas/reclamos/${reclamo.id}`, {
        estado: nuevoEstado,
        solucion: nuevoEstado === 'Resuelto' ? 'Solucionado' : ''
      });
      setEstado(nuevoEstado);
      onActualizar();
    } catch (error) {
      console.error('Error:', error);
    }
  };
  
  return (
    <Card sx={{ mb: 2, bgcolor: alpha(COLORS.warning, 0.05), borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" flexWrap="wrap" gap={1}>
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Box display="flex" alignItems="center" gap={1} mb={0.5}>
              <WarningIcon sx={{ color: COLORS.warning, fontSize: 18 }} />
              <Typography variant="subtitle2" fontWeight={700}>
                {reclamo.tipo}
              </Typography>
              <Chip 
                label={reclamo.estado} 
                size="small" 
                color={reclamo.estado === 'Resuelto' ? 'success' : 'error'}
                sx={{ height: 20, fontSize: '0.7rem' }}
              />
            </Box>
            <Typography variant="caption" color="textSecondary" display="block">
              {reclamo.localNombre} • {new Date(reclamo.fecha).toLocaleDateString('es-CL')}
            </Typography>
            {reclamo.telefono && reclamo.telefono !== 'No registrado' && (
              <Typography variant="caption" display="flex" alignItems="center" gap={0.5} mt={0.5}>
                <PhoneIcon sx={{ fontSize: 12 }} /> {reclamo.telefono}
              </Typography>
            )}
            {reclamo.montoCompensacion && reclamo.montoCompensacion !== '0' && (
              <Typography variant="caption" display="flex" alignItems="center" gap={0.5}>
                <MoneyIcon sx={{ fontSize: 12 }} /> ${reclamo.montoCompensacion}
              </Typography>
            )}
            <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
              Supervisor: {reclamo.supervisor}
            </Typography>
          </Box>
          <RadioGroup row value={estado} onChange={(e) => handleCambiarEstado(e.target.value)}>
            <FormControlLabel value="Resuelto" control={<Radio size="small" />} label="✅" />
            <FormControlLabel value="Pendiente" control={<Radio size="small" />} label="⏳" />
          </RadioGroup>
        </Box>
      </CardContent>
    </Card>
  );
};

// Componente principal
export default function DashboardModerno() {
  const [kpiData, setKpiData] = useState(null);
  const [itemsFallados, setItemsFallados] = useState(null);
  const [comparativa, setComparativa] = useState(null);
  const [metas, setMetas] = useState([]);
  const [reclamos, setReclamos] = useState(null);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState('mensual');
  const [selectedLocal, setSelectedLocal] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [dialogMetaOpen, setDialogMetaOpen] = useState(false);
  const [editingMeta, setEditingMeta] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  const [filtroLocalReclamos, setFiltroLocalReclamos] = useState('');
  const [filtroEstadoReclamos, setFiltroEstadoReclamos] = useState('todos');
  const [nuevaMeta, setNuevaMeta] = useState({
    nombre: '',
    tipo: 'promedioGeneral',
    valorObjetivo: '',
    localId: '',
    periodo: 'mensual'
  });
  const { user } = useAuth();

  const canManageMetas = user?.rol === 'master' || user?.rol === 'gerencia';

  useEffect(() => {
    cargarLocales();
  }, []);

  useEffect(() => {
    cargarTodosLosDatos();
  }, [periodo, selectedLocal]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/estadisticas/mis-locales');
      setLocales(response.data);
    } catch (error) {
      console.error('Error cargando locales:', error);
    }
  };

  const cargarTodosLosDatos = async () => {
    setLoading(true);
    try {
      const params = { periodo };
      if (selectedLocal) params.localId = selectedLocal;
      
      const [kpiRes, itemsRes, comparativaRes, metasRes, reclamosRes] = await Promise.all([
        api.get('/estadisticas/kpi/completo', { params }),
        api.get('/estadisticas/kpi/items-fallados', { params }),
        api.get('/estadisticas/kpi/comparativa', { params: { tipo: periodo === 'mensual' ? 'mensual' : 'trimestral', localId: selectedLocal || undefined } }),
        api.get('/estadisticas/metas', { params: { localId: selectedLocal || undefined } }),
        api.get('/estadisticas/reclamos/detalle', { params: { localId: selectedLocal || undefined } }),
      ]);
      setKpiData(kpiRes.data);
      setItemsFallados(itemsRes.data);
      setComparativa(comparativaRes.data);
      setMetas(metasRes.data);
      setReclamos(reclamosRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePeriodoChange = (nuevoPeriodo) => {
    setPeriodo(nuevoPeriodo);
    setAnchorEl(null);
  };

  const handleGuardarMeta = async () => {
    try {
      let localNombre = 'Todos los locales';
      if (nuevaMeta.localId) {
        const localEncontrado = locales.find(l => l._id === nuevaMeta.localId);
        localNombre = localEncontrado?.nombre || 'Local';
      }
      
      const metaData = {
        nombre: nuevaMeta.nombre,
        tipo: nuevaMeta.tipo,
        valorObjetivo: parseFloat(nuevaMeta.valorObjetivo),
        periodo: nuevaMeta.periodo,
        localId: nuevaMeta.localId || null,
        localNombre
      };
      
      if (editingMeta) {
        await api.put(`/estadisticas/metas/${editingMeta._id}`, metaData);
      } else {
        await api.post('/estadisticas/metas', metaData);
      }
      
      cargarTodosLosDatos();
      setDialogMetaOpen(false);
      setEditingMeta(null);
      setNuevaMeta({ nombre: '', tipo: 'promedioGeneral', valorObjetivo: '', localId: '', periodo: 'mensual' });
    } catch (error) {
      console.error('Error guardando meta:', error);
      alert('Error al guardar la meta');
    }
  };

  const handleEliminarMeta = async (meta) => {
    if (window.confirm(`¿Eliminar la meta "${meta.nombre}"?`)) {
      try {
        await api.delete(`/estadisticas/metas/${meta._id}`);
        cargarTodosLosDatos();
      } catch (error) {
        console.error('Error eliminando meta:', error);
        alert('Error al eliminar la meta');
      }
    }
  };

  const abrirEditarMeta = (meta) => {
    setEditingMeta(meta);
    setNuevaMeta({
      nombre: meta.nombre,
      tipo: meta.tipo,
      valorObjetivo: meta.valorObjetivo.toString(),
      localId: meta.localId || '',
      periodo: meta.periodo
    });
    setDialogMetaOpen(true);
  };

  const reclamosFiltrados = reclamos?.reclamos?.filter(r => {
    if (filtroLocalReclamos && r.localId !== filtroLocalReclamos) return false;
    if (filtroEstadoReclamos !== 'todos' && r.estado !== filtroEstadoReclamos) return false;
    return true;
  }) || [];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="70vh">
        <CircularProgress sx={{ color: COLORS.primary }} />
      </Box>
    );
  }

  const kpis = kpiData?.kpis || [];
  const resumen = kpiData?.resumenGlobal;
  const localesData = kpiData?.detallePorLocal || [];
  
  const distribucionData = resumen?.distribucionCategorias ? 
    Object.entries(resumen.distribucionCategorias)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({ 
        name, 
        value, 
        porcentaje: resumen.totalRevisiones > 0 ? (value / resumen.totalRevisiones) * 100 : 0,
        color: COLORS[name] 
      })) : [];

  const asistenciaData = [
    { name: 'Admin', porcentaje: resumen?.tasaAsistenciaAdmin || 0, color: COLORS.primary },
    { name: 'SubAdmin', porcentaje: resumen?.tasaAsistenciaSubAdmin || 0, color: COLORS.secondary },
  ];

  const comparativaData = comparativa?.periodoActual?.datos && comparativa?.periodoAnterior?.datos ? [
    { nombre: 'Promedio General', actual: comparativa.periodoActual.datos.promedioGeneral, anterior: comparativa.periodoAnterior.datos.promedioGeneral },
    { nombre: 'Asistencia Admin', actual: comparativa.periodoActual.datos.tasaAsistenciaAdmin, anterior: comparativa.periodoAnterior.datos.tasaAsistenciaAdmin },
    { nombre: 'Reclamos x Visita', actual: comparativa.periodoActual.datos.promedioReclamosPorVisita, anterior: comparativa.periodoAnterior.datos.promedioReclamosPorVisita },
  ] : [];

  return (
    <Box sx={{ bgcolor: COLORS.background, minHeight: '100vh', p: 2 }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          background: `linear-gradient(135deg, ${COLORS.primary} 0%, ${COLORS.primaryLight} 100%)`,
          borderRadius: 3,
          p: 3,
          mb: 3,
          color: '#fff',
        }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap" gap={2}>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              👋 ¡Bienvenido, {user?.nombre}!
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.9 }}>
              Dashboard Moderno • KPIs • Metas por Local • Gestión de Reclamos <></>
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
            <FormControl size="small" sx={{ minWidth: 160, bgcolor: alpha('#fff', 0.1), borderRadius: 1 }}>
              <InputLabel sx={{ color: '#fff', fontSize: '0.8rem' }}>Local</InputLabel>
              <Select
                value={selectedLocal}
                onChange={(e) => setSelectedLocal(e.target.value)}
                label="Local"
                sx={{ color: '#fff', fontSize: '0.8rem', height: 40, '& .MuiOutlinedInput-notchedOutline': { borderColor: alpha('#fff', 0.3) } }}
              >
                <MenuItem value="">Todos los locales</MenuItem>
                {locales.map(local => (
                  <MenuItem key={local._id} value={local._id}>{local.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Tooltip title="Actualizar">
              <IconButton onClick={cargarTodosLosDatos} sx={{ bgcolor: alpha('#fff', 0.1), color: '#fff' }}>
                <RefreshIcon />
              </IconButton>
            </Tooltip>
            
            <Button
              variant="contained"
              onClick={(e) => setAnchorEl(e.currentTarget)}
              sx={{ bgcolor: alpha('#fff', 0.15), height: 40, '&:hover': { bgcolor: alpha('#fff', 0.25) } }}
              endIcon={<CalendarIcon />}
              size="small"
            >
              {periodo === 'semanal' && 'Semanal'}
              {periodo === 'mensual' && 'Mensual'}
              {periodo === 'trimestral' && 'Trimestral'}
              {periodo === 'anual' && 'Anual'}
            </Button>
            
            <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}>
              <MenuItem onClick={() => handlePeriodoChange('semanal')}>📅 Semanal</MenuItem>
              <MenuItem onClick={() => handlePeriodoChange('mensual')}>📆 Mensual</MenuItem>
              <MenuItem onClick={() => handlePeriodoChange('trimestral')}>🗓️ Trimestral</MenuItem>
              <MenuItem onClick={() => handlePeriodoChange('anual')}>📅 Anual</MenuItem>
            </Menu>
          </Box>
        </Box>
        
        {/* Stats rápidos */}
        <Grid container spacing={2} sx={{ mt: 2 }}>
          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: alpha('#fff', 0.15), width: 40, height: 40 }}><AssignmentIcon /></Avatar>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Revisiones</Typography>
                <Typography variant="h6" fontWeight={700}>{resumen?.totalRevisiones || 0}</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: alpha('#fff', 0.15), width: 40, height: 40 }}><StoreIcon /></Avatar>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Promedio</Typography>
                <Typography variant="h6" fontWeight={700}>{resumen?.promedioGeneral?.toFixed(1) || 0}%</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: alpha('#fff', 0.15), width: 40, height: 40 }}><PersonIcon /></Avatar>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Asistencia</Typography>
                <Typography variant="h6" fontWeight={700}>{resumen?.tasaAsistenciaAdmin?.toFixed(0) || 0}%</Typography>
              </Box>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box display="flex" alignItems="center" gap={1.5}>
              <Avatar sx={{ bgcolor: alpha('#fff', 0.15), width: 40, height: 40 }}><WarningIcon /></Avatar>
              <Box>
                <Typography variant="caption" sx={{ opacity: 0.8 }}>Reclamos</Typography>
                <Typography variant="h6" fontWeight={700}>{resumen?.totalReclamos || 0}</Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Tabs value={tabValue} onChange={(e, v) => setTabValue(v)} sx={{ mb: 2, bgcolor: COLORS.surface, borderRadius: 2 }}>
        <Tab label="📊 KPIs" />
        <Tab label="🎯 Metas" />
        <Tab label="📈 Comparativa" />
        <Tab label="⚠️ Items" />
        <Tab label="📞 Reclamos" />
      </Tabs>

      {/* Tab 1: KPIs */}
      {tabValue === 0 && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            {kpis.slice(0, 6).map((kpi, idx) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                <KPICard
                  title={kpi.titulo}
                  value={kpi.valor}
                  icon={kpi.icono}
                  color={kpi.color}
                  subtitle={kpi.descripcion}
                  delay={idx * 100}
                />
              </Grid>
            ))}
          </Grid>

          <Grid container spacing={3}>
            {/* Gráfico de distribución */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  🎯 Distribución por Categoría
                </Typography>
                {distribucionData.length > 0 ? (
                  <>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart
                        data={distribucionData}
                        layout="vertical"
                        margin={{ left: 60, right: 20, top: 20, bottom: 20 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" domain={[0, 'dataMax']} />
                        <YAxis type="category" dataKey="name" width={80} />
                        <RechartsTooltip formatter={(value, name, props) => [`${props.payload.porcentaje.toFixed(1)}%`, 'Porcentaje']} />
                        <Bar dataKey="value" fill={COLORS.primary} radius={[0, 4, 4, 0]}>
                          {distribucionData.map((entry, idx) => (
                            <Cell key={`cell-${idx}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                    <Box display="flex" flexWrap="wrap" justifyContent="center" gap={1} mt={1}>
                      {distribucionData.map(item => (
                        <Chip 
                          key={item.name}
                          label={`${item.name}: ${item.value} (${item.porcentaje.toFixed(0)}%)`}
                          size="small"
                          sx={{ bgcolor: item.color, color: '#fff', height: 24 }}
                        />
                      ))}
                    </Box>
                  </>
                ) : (
                  <Box sx={{ height: 280, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="textSecondary">No hay datos</Typography>
                  </Box>
                )}
              </Paper>
            </Grid>

            {/* Gráfico de asistencia */}
            <Grid item xs={12} md={6}>
              <Paper sx={{ borderRadius: 3, p: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom>
                  👔 Asistencia de Administradores
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={asistenciaData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis domain={[0, 100]} unit="%" />
                    <RechartsTooltip formatter={(value) => [`${value.toFixed(1)}%`, 'Asistencia']} />
                    <Bar dataKey="porcentaje" fill={COLORS.primary} radius={[4, 4, 0, 0]}>
                      <Cell fill={COLORS.primary} />
                      <Cell fill={COLORS.secondary} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <Box display="flex" justifyContent="center" gap={3} mt={1}>
                  <Chip label={`Admin: ${asistenciaData[0]?.porcentaje.toFixed(0)}%`} size="small" sx={{ bgcolor: COLORS.primary, color: '#fff' }} />
                  <Chip label={`SubAdmin: ${asistenciaData[1]?.porcentaje.toFixed(0)}%`} size="small" sx={{ bgcolor: COLORS.secondary, color: '#fff' }} />
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Locales */}
          <Paper sx={{ borderRadius: 3, p: 2, mt: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              🏢 Rendimiento por Local
            </Typography>
            <Grid container spacing={2}>
              {localesData.map((local, idx) => (
                <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
                  <Card sx={{ borderRadius: 2, '&:hover': { boxShadow: 4 } }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Typography variant="subtitle2" fontWeight={700} noWrap>{local.localNombre}</Typography>
                      <Typography variant="h4" color="primary" fontWeight={700}>
                        {local.promedioPorcentaje?.toFixed(1)}%
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {local.totalRevisiones} revisiones
                      </Typography>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" justifyContent="space-between" flexWrap="wrap" gap={0.5}>
                        <Chip label={`Admin: ${local.tasaAsistenciaAdmin?.toFixed(0)}%`} size="small" variant="outlined" />
                        <Chip label={`Reclamos: ${local.promedioReclamosPorVisita?.toFixed(1)}`} size="small" variant="outlined" />
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
              {localesData.length === 0 && (
                <Grid item xs={12}>
                  <Typography textAlign="center" color="textSecondary" py={4}>
                    No hay datos disponibles
                  </Typography>
                </Grid>
              )}
            </Grid>
          </Paper>
        </>
      )}

      {/* Tab 2: Metas */}
      {tabValue === 1 && (
        <>
          {canManageMetas && (
            <Box display="flex" justifyContent="flex-end" mb={2}>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { 
                  setEditingMeta(null); 
                  setNuevaMeta({ nombre: '', tipo: 'promedioGeneral', valorObjetivo: '', localId: '', periodo: 'mensual' });
                  setDialogMetaOpen(true); 
                }}
                sx={{ bgcolor: COLORS.primary, height: 36 }}
                size="small"
              >
                Agregar Meta
              </Button>
            </Box>
          )}

          <Grid container spacing={2}>
            {metas.map((meta, idx) => (
              <Grid item xs={12} sm={6} md={4} key={idx}>
                <MetaCard
                  meta={meta}
                  canEdit={canManageMetas}
                  onEdit={abrirEditarMeta}
                  onDelete={handleEliminarMeta}
                />
              </Grid>
            ))}
            {metas.length === 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3, textAlign: 'center' }}>
                  <Typography color="textSecondary">
                    No hay metas configuradas.
                  </Typography>
                </Paper>
              </Grid>
            )}
          </Grid>

          {metas.length > 0 && (
            <Paper sx={{ borderRadius: 3, p: 2, mt: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                📊 Resumen de Cumplimiento
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} md={4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="textSecondary">Metas cumplidas</Typography>
                    <Typography variant="h4" fontWeight={700} color="success.main">
                      {metas.filter(m => m.cumplida).length} / {metas.length}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} md={4}>
                  <Box textAlign="center">
                    <Typography variant="caption" color="textSecondary">Promedio cumplimiento</Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {(metas.reduce((sum, m) => sum + (m.porcentajeCumplimiento || 0), 0) / metas.length).toFixed(0)}%
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={4}>
                  <LinearProgress
                    variant="determinate"
                    value={metas.filter(m => m.cumplida).length / metas.length * 100}
                    sx={{ height: 8, borderRadius: 4, mt: 3 }}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}
        </>
      )}

      {/* Tab 3: Comparativa */}
      {tabValue === 2 && comparativa && (
        <>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ borderRadius: 3, p: 2, textAlign: 'center', bgcolor: alpha(COLORS.primary, 0.05) }}>
                <Typography variant="subtitle2" fontWeight={700}>Período Actual</Typography>
                <Typography variant="h3" fontWeight={700}>
                  {comparativa.periodoActual?.datos?.promedioGeneral?.toFixed(1) || 0}%
                </Typography>
                <Typography variant="caption" color="textSecondary">Promedio General</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{comparativa.periodoActual?.datos?.totalRevisiones || 0} revisiones</Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper sx={{ borderRadius: 3, p: 2, textAlign: 'center', bgcolor: alpha(COLORS.secondary, 0.05) }}>
                <Typography variant="subtitle2" fontWeight={700}>Período Anterior</Typography>
                <Typography variant="h3" fontWeight={700}>
                  {comparativa.periodoAnterior?.datos?.promedioGeneral?.toFixed(1) || 0}%
                </Typography>
                <Typography variant="caption" color="textSecondary">Promedio General</Typography>
                <Typography variant="body2" sx={{ mt: 1 }}>{comparativa.periodoAnterior?.datos?.totalRevisiones || 0} revisiones</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ borderRadius: 3, p: 2, mt: 3 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              📊 Comparativa de Métricas
            </Typography>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={comparativaData} margin={{ left: 20, right: 20, top: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nombre" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="actual" name="Período Actual" fill={COLORS.primary} />
                <Bar dataKey="anterior" name="Período Anterior" fill={COLORS.secondary} />
              </BarChart>
            </ResponsiveContainer>

            {comparativa.variaciones && (
              <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center" p={1} sx={{ bgcolor: alpha(COLORS.info, 0.1), borderRadius: 2 }}>
                    <Typography variant="caption" color="textSecondary">Promedio</Typography>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      {comparativa.variaciones.promedioGeneral > 0 ? 
                        <TrendingUpIcon sx={{ color: COLORS.success, fontSize: 16 }} /> : 
                        <TrendingDownIcon sx={{ color: COLORS.error, fontSize: 16 }} />}
                      <Typography fontWeight={700} fontSize={14} color={comparativa.variaciones.promedioGeneral > 0 ? 'success.main' : 'error.main'}>
                        {Math.abs(comparativa.variaciones.promedioGeneral).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Box textAlign="center" p={1} sx={{ bgcolor: alpha(COLORS.info, 0.1), borderRadius: 2 }}>
                    <Typography variant="caption" color="textSecondary">Revisiones</Typography>
                    <Box display="flex" alignItems="center" justifyContent="center" gap={0.5}>
                      {comparativa.variaciones.totalRevisiones > 0 ? 
                        <TrendingUpIcon sx={{ color: COLORS.success, fontSize: 16 }} /> : 
                        <TrendingDownIcon sx={{ color: COLORS.error, fontSize: 16 }} />}
                      <Typography fontWeight={700} fontSize={14}>
                        {Math.abs(comparativa.variaciones.totalRevisiones).toFixed(1)}%
                      </Typography>
                    </Box>
                  </Box>
                </Grid>
              </Grid>
            )}
          </Paper>
        </>
      )}

      {/* Tab 4: Items Fallados */}
      {tabValue === 3 && itemsFallados && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ borderRadius: 3, p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">Ítems con fallos</Typography>
                <Typography variant="h4" fontWeight={700} color="error.main">
                  {itemsFallados.totalItemsFalladosUnicos || 0}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={6} sm={3}>
              <Paper sx={{ borderRadius: 3, p: 2, textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">Total Fallos</Typography>
                <Typography variant="h4" fontWeight={700} color="warning.main">
                  {itemsFallados.totalFallos || 0}
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ borderRadius: 3, p: 2 }}>
            <Typography variant="h6" fontWeight={700} gutterBottom>
              ⚠️ Top Ítems que más fallan
            </Typography>
            <List dense>
              {itemsFallados.topItemsFallados?.map((item, idx) => (
                <ListItem key={idx} divider sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
                  <Box display="flex" alignItems="center" width="100%" gap={1}>
                    <Avatar sx={{ width: 24, height: 24, bgcolor: alpha(COLORS.error, 0.1), color: COLORS.error, fontSize: 12 }}>{idx + 1}</Avatar>
                    <Typography variant="subtitle2" fontWeight={700}>{item.id}</Typography>
                    <Chip label={`${item.count} fallos`} size="small" color="error" sx={{ ml: 'auto', height: 20 }} />
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, ml: 4 }}>
                    {item.texto}
                  </Typography>
                </ListItem>
              ))}
              {(!itemsFallados.topItemsFallados || itemsFallados.topItemsFallados.length === 0) && (
                <ListItem>
                  <Typography textAlign="center" color="textSecondary" py={2}>
                    No hay ítems fallados en el período
                  </Typography>
                </ListItem>
              )}
            </List>
          </Paper>

          {itemsFallados.observacionesRecientes?.length > 0 && (
            <Paper sx={{ borderRadius: 3, p: 2, mt: 3 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                💬 Observaciones
              </Typography>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography variant="body2">Ver {itemsFallados.observacionesRecientes.length} observaciones</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  {itemsFallados.observacionesRecientes.map((obs, idx) => (
                    <Card key={idx} sx={{ mb: 1.5, bgcolor: alpha(COLORS.warning, 0.05), borderRadius: 2 }}>
                      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                        <Typography variant="caption" fontWeight={700} color="warning.main">
                          {obs.preguntaId} • {obs.seccion === 'servicioCliente' ? 'Servicio Cliente' : obs.seccion === 'cuartoFrio' ? 'Cuarto Frío' : 'Cuarto Caliente'}
                        </Typography>
                        <Typography variant="caption" display="block" color="textSecondary">
                          {obs.texto}
                        </Typography>
                        <Typography variant="body2" sx={{ mt: 0.5, fontStyle: 'italic' }}>
                          "{obs.observacion}"
                        </Typography>
                        <Typography variant="caption" color="textSecondary" display="block" mt={0.5}>
                          📍 {obs.localNombre} • 📅 {new Date(obs.fecha).toLocaleDateString('es-CL')}
                        </Typography>
                      </CardContent>
                    </Card>
                  ))}
                </AccordionDetails>
              </Accordion>
            </Paper>
          )}
        </>
      )}

      {/* Tab 5: Reclamos */}
      {tabValue === 4 && reclamos && (
        <>
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={4}>
              <Paper sx={{ borderRadius: 3, p: 2, textAlign: 'center', bgcolor: alpha(COLORS.info, 0.1) }}>
                <Typography variant="caption" color="textSecondary">Total</Typography>
                <Typography variant="h4" fontWeight={700}>{reclamos.resumen?.total || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ borderRadius: 3, p: 2, textAlign: 'center', bgcolor: alpha(COLORS.success, 0.1) }}>
                <Typography variant="caption" color="textSecondary">Resueltos</Typography>
                <Typography variant="h4" fontWeight={700} color="success.main">{reclamos.resumen?.resueltos || 0}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={4}>
              <Paper sx={{ borderRadius: 3, p: 2, textAlign: 'center', bgcolor: alpha(COLORS.error, 0.1) }}>
                <Typography variant="caption" color="textSecondary">Pendientes</Typography>
                <Typography variant="h4" fontWeight={700} color="error.main">{reclamos.resumen?.pendientes || 0}</Typography>
              </Paper>
            </Grid>
          </Grid>

          <Paper sx={{ borderRadius: 3, p: 2, mb: 2, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Local</InputLabel>
              <Select value={filtroLocalReclamos} onChange={(e) => setFiltroLocalReclamos(e.target.value)} label="Local">
                <MenuItem value="">Todos</MenuItem>
                {locales.map(local => (
                  <MenuItem key={local._id} value={local._id}>{local.nombre}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Estado</InputLabel>
              <Select value={filtroEstadoReclamos} onChange={(e) => setFiltroEstadoReclamos(e.target.value)} label="Estado">
                <MenuItem value="todos">Todos</MenuItem>
                <MenuItem value="Resuelto">✅ Resueltos</MenuItem>
                <MenuItem value="Pendiente">⏳ Pendientes</MenuItem>
              </Select>
            </FormControl>
            <Button size="small" onClick={() => { setFiltroLocalReclamos(''); setFiltroEstadoReclamos('todos'); }}>
              Limpiar
            </Button>
          </Paper>

          <Typography variant="subtitle2" fontWeight={700} gutterBottom>
            📋 Listado de Reclamos ({reclamosFiltrados.length})
          </Typography>
          {reclamosFiltrados.length > 0 ? (
            reclamosFiltrados.map(reclamo => (
              <ReclamoCard key={reclamo.id} reclamo={reclamo} onActualizar={cargarTodosLosDatos} />
            ))
          ) : (
            <Paper sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="textSecondary">No hay reclamos con los filtros seleccionados</Typography>
            </Paper>
          )}
        </>
      )}

      {/* Diálogo Meta */}
      <Dialog open={dialogMetaOpen} onClose={() => { 
        setDialogMetaOpen(false); 
        setEditingMeta(null);
        setNuevaMeta({ nombre: '', tipo: 'promedioGeneral', valorObjetivo: '', localId: '', periodo: 'mensual' });
      }} maxWidth="sm" fullWidth>
        <DialogTitle>{editingMeta ? '✏️ Editar Meta' : '🎯 Nueva Meta'}</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Nombre"
            margin="normal"
            size="small"
            value={nuevaMeta.nombre}
            onChange={(e) => setNuevaMeta({ ...nuevaMeta, nombre: e.target.value })}
            placeholder="Ej: Alcanzar 85% de cumplimiento"
          />
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Tipo</InputLabel>
            <Select
              label="Tipo"
              value={nuevaMeta.tipo}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, tipo: e.target.value })}
            >
              <MenuItem value="promedioGeneral">Promedio General (%)</MenuItem>
              <MenuItem value="asistenciaAdmin">Asistencia Admin (%)</MenuItem>
              <MenuItem value="reclamosPorVisita">Reclamos x Visita</MenuItem>
              <MenuItem value="revisionesPorMes">Revisiones por Mes</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label="Valor Objetivo"
            type="number"
            margin="normal"
            size="small"
            value={nuevaMeta.valorObjetivo}
            onChange={(e) => setNuevaMeta({ ...nuevaMeta, valorObjetivo: e.target.value })}
          />
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Local</InputLabel>
            <Select
              label="Local"
              value={nuevaMeta.localId}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, localId: e.target.value })}
            >
              <MenuItem value="">Todos los locales (General)</MenuItem>
              {locales.map(local => (
                <MenuItem key={local._id} value={local._id}>{local.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal" size="small">
            <InputLabel>Período</InputLabel>
            <Select
              label="Período"
              value={nuevaMeta.periodo}
              onChange={(e) => setNuevaMeta({ ...nuevaMeta, periodo: e.target.value })}
            >
              <MenuItem value="mensual">Mensual</MenuItem>
              <MenuItem value="trimestral">Trimestral</MenuItem>
              <MenuItem value="anual">Anual</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setDialogMetaOpen(false); setEditingMeta(null); setNuevaMeta({ nombre: '', tipo: 'promedioGeneral', valorObjetivo: '', localId: '', periodo: 'mensual' }); }}>
            Cancelar
          </Button>
          <Button onClick={handleGuardarMeta} variant="contained" sx={{ bgcolor: COLORS.primary }}>
            {editingMeta ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}