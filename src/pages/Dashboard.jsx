// dashboard/src/pages/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  LinearProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
} from '@mui/material';
import {
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────
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

const CAT_BG = {
  'MUY BUENO': { bg: '#e8f5e9', color: '#2e7d32' },
  'BUENO':     { bg: '#e3f2fd', color: '#1565c0' },
  'REGULAR':   { bg: '#fff8e1', color: '#f57f17' },
  'MALO':      { bg: '#ffebee', color: '#c62828' },
  'PÉSIMO':    { bg: '#ffebee', color: '#b71c1c' },
};

// ─── Componente KPI Card ──────────────────────────────────
function KPICard({ title, value, subtitle, color }) {
  return (
    <Card sx={{
      borderRadius: 2,
      borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
      height: '100%',
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Typography variant="caption" color="textSecondary" sx={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.3 }}>
          {title}
        </Typography>
        <Typography variant="h4" fontWeight={500} sx={{ color, lineHeight: 1.2, mt: 0.5 }}>
          {value}
        </Typography>
        {subtitle && (
          <Typography variant="caption" color="textSecondary" sx={{ fontSize: 10, mt: 0.3, display: 'block' }}>
            {subtitle}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Componente principal ──────────────────────────────────
export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revisionesMes, setRevisionesMes] = useState({});
  const [localesActivos, setLocalesActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [sinLocalesAsignados, setSinLocalesAsignados] = useState(false);
  const { user } = useAuth();

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsRes, mesRes, localesRes] = await Promise.all([
        api.get('/estadisticas/dashboard').catch(() => ({ data: {} })),
        api.get('/revisiones/estadisticas-por-local').catch(() => ({ data: {} })),
        api.get('/estadisticas/mis-locales').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setSinLocalesAsignados(statsRes.data?.sinLocalesAsignados || false);
      setRevisionesMes(mesRes.data || {});
      setLocalesActivos(localesRes.data || []);
      setUltimaAct(new Date());
    } catch (e) { 
      console.error('Error cargando datos:', e); 
    } finally { 
      setLoading(false); 
      setRefreshing(false); 
    }
  };

  // ─── Cálculos ─────────────────────────────────────────────
  const localesSinRevision = localesActivos.filter(l => !Object.keys(revisionesMes).includes(l.nombre));
  const localesCriticos = Object.entries(revisionesMes).filter(([, d]) => d.promedioPorcentaje < 60);
  const promedioGeneral = parseFloat(stats?.resumen?.promedioGeneral || 0);
  const totalRevisiones = stats?.resumen?.totalRevisiones || 0;
  
  const localesOrdenados = Object.entries(revisionesMes)
    .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje);
  const mejorLocal = localesOrdenados[0];
  const peorLocal = localesOrdenados[localesOrdenados.length - 1];

  // Supervisores desde stats
  const supervisores = (stats?.estadisticasSupervisores || [])
    .filter(s => s.supervisorNombre)
    .sort((a, b) => parseFloat(b.promedio) - parseFloat(a.promedio));

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: '#d32f2f' }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* ─── Alertas ─────────────────────────────────────── */}
      {sinLocalesAsignados && (
        <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
          <strong>Sin locales asignados.</strong> Contacta al administrador.
        </Alert>
      )}
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
          Todos los locales tienen revisión este mes.
        </Alert>
      )}

      {/* ─── Header ──────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5" fontWeight={500} color="text.primary">
          Panel de Control
        </Typography>
        <Box display="flex" alignItems="center" gap={1}>
          {ultimaAct && (
            <Typography variant="caption" color="textSecondary">
              {ultimaAct.toLocaleTimeString('es-CL')}
            </Typography>
          )}
          <Tooltip title="Actualizar">
            <IconButton onClick={() => cargarDatos(true)} disabled={refreshing} size="small">
              {refreshing ? <CircularProgress size={18} /> : <RefreshIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* ─── KPI Cards ───────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard 
            title="TOTAL REVISIONES" 
            value={totalRevisiones}
            subtitle="Este mes" 
            color="#d32f2f" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard 
            title="PROMEDIO GENERAL"
            value={`${promedioGeneral.toFixed(1)}%`}
            subtitle={getCat(promedioGeneral)}
            color={getPColor(promedioGeneral)} 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard 
            title="MEJOR LOCAL"
            value={mejorLocal ? mejorLocal[0].substring(0, 12) : '—'}
            subtitle={mejorLocal ? `${mejorLocal[1].promedioPorcentaje.toFixed(1)}%` : ''}
            color="#10b981" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard 
            title="LOCALES REVISADOS"
            value={`${Object.keys(revisionesMes).length}/${localesActivos.length}`}
            subtitle={localesSinRevision.length > 0 ? `${localesSinRevision.length} sin revisar` : 'Todos revisados'}
            color="#3b82f6" 
          />
        </Grid>
      </Grid>

      {/* ─── Tabla de revisiones del mes ────────────────── */}
      {Object.keys(revisionesMes).length > 0 ? (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden', mb: 3, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <Box sx={{ bgcolor: '#d32f2f', px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" color="white" fontWeight={500}>
              Revisiones del mes actual por local
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>Local</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>Progreso</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1, width: 60 }}>%</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>Categoría</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>Última revisión</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1, width: 50 }} align="center">Revs.</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {localesOrdenados.map(([nombre, data]) => {
                  const pct = data.promedioPorcentaje;
                  const color = getPColor(pct);
                  const cat = getCat(pct);
                  const catStyle = CAT_BG[cat] || { bg: '#f5f5f5', color: '#666' };
                  const ultima = data.revisiones?.[data.revisiones.length - 1];
                  return (
                    <TableRow key={nombre} hover sx={{ bgcolor: pct < 60 ? '#fff5f5' : 'inherit' }}>
                      <TableCell sx={{ py: 1.2 }}>
                        <Box display="flex" alignItems="center" gap={0.8}>
                          {pct < 60 && <WarningIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                          <Typography variant="body2" fontWeight={500}>{nombre}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <LinearProgress 
                          variant="determinate" 
                          value={pct}
                          sx={{ 
                            height: 6, 
                            borderRadius: 3, 
                            bgcolor: `${color}22`,
                            '& .MuiLinearProgress-bar': { bgcolor: color } 
                          }} 
                        />
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ color }}>
                          {pct.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Box sx={{ 
                          display: 'inline-block', 
                          bgcolor: catStyle.bg,
                          color: catStyle.color, 
                          fontSize: 10, 
                          fontWeight: 600,
                          px: 1, 
                          py: 0.3, 
                          borderRadius: 1 
                        }}>
                          {cat}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="caption" color="textSecondary">
                          {ultima ? new Date(ultima.fecha).toLocaleDateString('es-CL') : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }} align="center">
                        <Typography variant="caption" color="textSecondary">
                          {data.totalRevisiones}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      ) : (
        <Paper sx={{ p: 3, textAlign: 'center', borderRadius: 2, mb: 3 }}>
          <Typography color="textSecondary">No hay revisiones registradas este mes.</Typography>
        </Paper>
      )}

      {/* ─── Fila inferior ────────────────────────────────── */}
      <Grid container spacing={2}>
        {/* Destacados */}
        {(mejorLocal || peorLocal) && (
          <Grid item xs={12} md={4}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}>
              <Box sx={{ bgcolor: '#fafafa', borderBottom: '0.5px solid #f0f0f0', px: 2, py: 1.2 }}>
                <Typography variant="subtitle2" fontWeight={500} color="text.primary">
                  Destacados del mes
                </Typography>
              </Box>
              <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {mejorLocal && (
                  <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', borderRadius: 1.5, border: '0.5px solid #86efac' }}>
                    <Typography variant="caption" sx={{ color: '#15803d', fontWeight: 600, display: 'block' }}>
                      Mejor local
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#14532d', fontWeight: 500 }}>
                      {mejorLocal[0]}
                    </Typography>
                    <Typography variant="h6" sx={{ color: '#16a34a', fontWeight: 500, lineHeight: 1.2 }}>
                      {mejorLocal[1].promedioPorcentaje.toFixed(1)}%
                    </Typography>
                  </Box>
                )}
                {peorLocal && localesOrdenados.length > 1 && (
                  <Box sx={{ p: 1.5, bgcolor: '#fff5f5', borderRadius: 1.5, border: '0.5px solid #fca5a5' }}>
                    <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600, display: 'block' }}>
                      Requiere atención
                    </Typography>
                    <Typography variant="subtitle2" sx={{ color: '#7f1d1d', fontWeight: 500 }}>
                      {peorLocal[0]}
                    </Typography>
                    <Typography variant="h6" sx={{ color: getPColor(peorLocal[1].promedioPorcentaje), fontWeight: 500, lineHeight: 1.2 }}>
                      {peorLocal[1].promedioPorcentaje.toFixed(1)}%
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Locales sin revisión */}
        {localesSinRevision.length > 0 && (
          <Grid item xs={12} md={4}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}>
              <Box sx={{ bgcolor: '#fafafa', borderBottom: '0.5px solid #f0f0f0', px: 2, py: 1.2 }}>
                <Typography variant="subtitle2" fontWeight={500} color="text.primary">
                  Sin revisión este mes ({localesSinRevision.length})
                </Typography>
              </Box>
              <Box sx={{ p: 0 }}>
                {localesSinRevision.map((l, i) => (
                  <Box key={l._id} display="flex" alignItems="center" gap={1} sx={{
                    px: 2, py: 1.2,
                    borderBottom: i < localesSinRevision.length - 1 ? '0.5px solid #f0f0f0' : 'none',
                  }}>
                    <CancelIcon sx={{ fontSize: 14, color: '#f59e0b' }} />
                    <Box>
                      <Typography variant="body2" fontWeight={500}>{l.nombre}</Typography>
                      {l.ciudad && <Typography variant="caption" color="textSecondary">{l.ciudad}</Typography>}
                    </Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Grid>
        )}

        {/* Supervisores */}
        {supervisores.length > 0 && (
          <Grid item xs={12} md={4}>
            <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%' }}>
              <Box sx={{ bgcolor: '#fafafa', borderBottom: '0.5px solid #f0f0f0', px: 2, py: 1.2 }}>
                <Typography variant="subtitle2" fontWeight={500} color="text.primary">
                  Supervisores
                </Typography>
              </Box>
              <Box>
                {supervisores.slice(0, 5).map((sup, i) => {
                  const pct = parseFloat(sup.promedio);
                  const color = getPColor(pct);
                  return (
                    <Box key={i} display="flex" alignItems="center" gap={1.5} sx={{
                      px: 2, py: 1.2,
                      borderBottom: i < supervisores.slice(0, 5).length - 1 ? '0.5px solid #f0f0f0' : 'none',
                    }}>
                      <Box sx={{ 
                        width: 28, height: 28, borderRadius: '50%', 
                        bgcolor: color,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' 
                      }}>
                        <Typography sx={{ color: '#fff', fontSize: 11, fontWeight: 600 }}>
                          {sup.supervisorNombre?.[0]?.toUpperCase()}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" fontWeight={500} noWrap>{sup.supervisorNombre}</Typography>
                        <LinearProgress 
                          variant="determinate" 
                          value={pct}
                          sx={{ 
                            height: 4, borderRadius: 2, mt: 0.3, 
                            bgcolor: `${color}22`,
                            '& .MuiLinearProgress-bar': { bgcolor: color } 
                          }} 
                        />
                      </Box>
                      <Typography variant="caption" fontWeight={500} sx={{ color: color }}>
                        {pct.toFixed(1)}%
                      </Typography>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* ─── Histórico por local ──────────────────────────── */}
      {stats?.estadisticasPorLocal?.length > 0 && (
        <Paper sx={{ borderRadius: 2, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', mt: 3 }}>
          <Box sx={{ bgcolor: '#424242', px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" color="white" fontWeight={500}>
              Rendimiento histórico por local (12 meses)
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>Local</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>Progreso</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1, width: 60 }}>%</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>Categoría</TableCell>
                  <TableCell sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1, width: 50 }} align="center">Total</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.estadisticasPorLocal
                  .sort((a, b) => parseFloat(b.promedio) - parseFloat(a.promedio))
                  .map((item, i) => {
                    const pct = parseFloat(item.promedio);
                    const color = getPColor(pct);
                    const cat = getCat(pct);
                    const catStyle = CAT_BG[cat] || { bg: '#f5f5f5', color: '#666' };
                    return (
                      <TableRow key={item.local} hover>
                        <TableCell sx={{ py: 1.2 }}>
                          <Box sx={{ 
                            width: 22, height: 22, borderRadius: '50%', 
                            bgcolor: color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' 
                          }}>
                            <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>
                              {i + 1}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Typography variant="body2" fontWeight={500}>{item.local}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <LinearProgress 
                            variant="determinate" 
                            value={pct}
                            sx={{ 
                              height: 6, borderRadius: 3, 
                              bgcolor: `${color}22`,
                              '& .MuiLinearProgress-bar': { bgcolor: color } 
                            }} 
                          />
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Typography variant="body2" fontWeight={500} sx={{ color }}>
                            {item.promedio}%
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Box sx={{ 
                            display: 'inline-block', 
                            bgcolor: catStyle.bg,
                            color: catStyle.color, 
                            fontSize: 10, 
                            fontWeight: 600,
                            px: 1, 
                            py: 0.3, 
                            borderRadius: 1 
                          }}>
                            {cat}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }} align="center">
                          <Typography variant="caption" color="textSecondary">
                            {item.totalRevisiones}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
}