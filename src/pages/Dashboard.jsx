import React, { useState, useEffect } from 'react';
import {
  Box, Grid, Card, CardContent, Typography, CircularProgress,
  Paper, IconButton, Tooltip, LinearProgress, Alert, Divider,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip,
} from '@mui/material';
import {
  TrendingUp as TrendingUpIcon,
  Store as StoreIcon,
  Assignment as AssignmentIcon,
  Warning as WarningIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  EmojiEvents as TrophyIcon,
  People as PeopleIcon,
  Cancel as CancelIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';

const getPColor = (p) => {
  if (p >= 95) return '#10b981';
  if (p >= 80) return '#3b82f6';
  if (p >= 70) return '#f59e0b';
  if (p >= 60) return '#ef4444';
  return '#f20000';
};

const getCat = (p) => {
  if (p >= 95) return 'MUY BUENO';
  if (p >= 80) return 'BUENO';
  if (p >= 70) return 'REGULAR';
  if (p >= 60) return 'MALO';
  return 'PÉSIMO';
};

const getCAT_BG = (isDark) => ({
  'MUY BUENO': { bg: isDark ? '#1b3a1b' : '#e8f5e9', color: isDark ? '#81c784' : '#2e7d32' },
  'BUENO':     { bg: isDark ? '#0d2137' : '#e3f2fd', color: isDark ? '#64b5f6' : '#1565c0' },
  'REGULAR':   { bg: isDark ? '#3d2e00' : '#fff8e1', color: isDark ? '#ffcc02' : '#f57f17' },
  'MALO':      { bg: isDark ? '#3d1515' : '#ffebee', color: isDark ? '#ef9a9a' : '#c62828' },
  'PÉSIMO':    { bg: isDark ? '#3d1515' : '#ffebee', color: isDark ? '#ef9a9a' : '#b71c1c' },
});

function KPICard({ title, value, subtitle, color, icon }) {
  return (
    <Card sx={{
      borderRadius: 2, borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 4px rgba(0,0,0,0.06)', height: '100%',
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

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revisionesMes, setRevisionesMes] = useState({});
  const [localesActivos, setLocalesActivos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [ultimaAct, setUltimaAct] = useState(null);
  const [sinLocalesAsignados, setSinLocalesAsignados] = useState(false);
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const [statsRes, mesRes, localesRes] = await Promise.all([
        api.get('/estadisticas/dashboard'),
        api.get('/revisiones/estadisticas-por-local').catch(() => ({ data: {} })),
        api.get('/estadisticas/mis-locales').catch(() => ({ data: [] })),
      ]);
      setStats(statsRes.data);
      setSinLocalesAsignados(statsRes.data?.sinLocalesAsignados || false);
      setRevisionesMes(mesRes.data || {});
      setLocalesActivos(localesRes.data || []);
      setUltimaAct(new Date());
    } catch (e) { console.error(e); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const localesSinRevision = localesActivos.filter(l => !Object.keys(revisionesMes).includes(l.nombre));
  const localesCriticos = Object.entries(revisionesMes).filter(([, d]) => d.promedioPorcentaje < 60);
  const promedioGeneral = parseFloat(stats?.resumen?.promedioGeneral || 0);
  const totalRevisiones = stats?.resumen?.totalRevisiones || 0;
  const supervisores = (stats?.estadisticasSupervisores || []).filter(s => s.supervisorNombre);
  const localesOrdenados = Object.entries(revisionesMes)
    .sort(([, a], [, b]) => b.promedioPorcentaje - a.promedioPorcentaje);
  const mejorLocal = localesOrdenados[0];
  const peorLocal = localesOrdenados[localesOrdenados.length - 1];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress sx={{ color: '#f20000' }} />
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      {/* ─── Título ──────────────────────────────────────── */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={500} color="text.primary">
            Panel de Control
          </Typography>
          <Typography variant="caption" color="textSecondary">
            KamiSushi — Sistema de Supervisión
          </Typography>
        </Box>
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

      {/* ─── Banner actualizando ──────────────────────────── */}
      {refreshing && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5,
          p: 1.2, bgcolor: isDark ? '#1a2a1a' : '#e8f5e9', borderRadius: 2 }}>
          <CircularProgress size={14} sx={{ color: '#4caf50' }} />
          <Typography variant="caption" sx={{ color: '#2e7d32', fontWeight: 500 }}>
            Actualizando datos...
          </Typography>
        </Box>
      )}

      {/* ─── KPI Cards ───────────────────────────────────── */}
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="TOTAL REVISIONES" value={totalRevisiones}
            subtitle="Este mes" color="#f20000" icon={<AssignmentIcon />} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="PROMEDIO GENERAL"
            value={`${promedioGeneral.toFixed(1)}%`}
            subtitle={getCat(promedioGeneral)}
            color={getPColor(promedioGeneral)} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="MEJOR LOCAL"
            value={mejorLocal ? mejorLocal[0].substring(0, 12) : '—'}
            subtitle={mejorLocal ? `${mejorLocal[1].promedioPorcentaje.toFixed(1)}%` : ''}
            color="#10b981" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KPICard title="LOCALES REVISADOS"
            value={`${Object.keys(revisionesMes).length}/${localesActivos.length}`}
            subtitle={localesSinRevision.length > 0 ? `${localesSinRevision.length} sin revisar` : 'Todos revisados'}
            color="#3b82f6" />
        </Grid>
      </Grid>

      {/* ─── Tabla locales del mes ───────────────────────── */}
      {localesOrdenados.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', mb: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Box sx={{ bgcolor: '#f20000', px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff' }} fontWeight={500}>
              Revisiones del mes actual por local
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? '#2a2a2a' : '#fafafa' }}>
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
                  const catStyle = getCAT_BG(isDark)[cat] || { bg: isDark ? '#2a2a2a' : '#f5f5f5', color: isDark ? '#aaa' : '#666' };
                  const ultima = data.revisiones?.[data.revisiones.length - 1];
                  return (
                    <TableRow key={nombre} hover sx={{ bgcolor: pct < 60 ? (isDark ? '#2d1515' : '#fff5f5') : 'inherit' }}>
                      <TableCell sx={{ py: 1.2 }}>
                        <Box display="flex" alignItems="center" gap={0.8}>
                          {pct < 60 && <WarningIcon sx={{ fontSize: 14, color: '#ef4444' }} />}
                          <Typography variant="body2" fontWeight={500}>{nombre}</Typography>
                        </Box>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <LinearProgress variant="determinate" value={pct}
                          sx={{ height: 6, borderRadius: 3, bgcolor: `${color}22`,
                            '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Typography variant="body2" fontWeight={500} sx={{ color }}>
                          {pct.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell sx={{ py: 1.2 }}>
                        <Box sx={{ display: 'inline-block', bgcolor: catStyle.bg,
                          color: catStyle.color, fontSize: 10, fontWeight: 600,
                          px: 1, py: 0.3, borderRadius: 1 }}>
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
      )}

      {/* ─── Destacados del mes: franja de 4 tarjetas con degradado (igual al mockup) ─── */}
      {(mejorLocal || peorLocal) && (
        <Box sx={{ display: 'flex', gap: 1.5, mb: 3, flexWrap: { xs: 'wrap', md: 'nowrap' } }}>
          {mejorLocal && (
            <Box sx={{
              flex: 1, minWidth: { xs: '100%', sm: 220 }, borderRadius: 2.5, p: 2.2,
              background: 'linear-gradient(135deg, #43a047, #2e7d32)', color: '#fff',
            }}>
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                🏆 Mejor local del mes
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.2 }}>{mejorLocal[0]}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.95 }}>{mejorLocal[1].promedioPorcentaje.toFixed(1)}% de cumplimiento</Typography>
            </Box>
          )}
          {peorLocal && localesOrdenados.length > 1 && (
            <Box sx={{
              flex: 1, minWidth: { xs: '100%', sm: 220 }, borderRadius: 2.5, p: 2.2,
              background: 'linear-gradient(135deg, #f20000, #c00000)', color: '#fff',
            }}>
              <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
                ⚠️ Requiere atención
              </Typography>
              <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.2 }}>{peorLocal[0]}</Typography>
              <Typography variant="body2" sx={{ opacity: 0.95 }}>{peorLocal[1].promedioPorcentaje.toFixed(1)}% de cumplimiento</Typography>
            </Box>
          )}
          <Box sx={{
            flex: 1, minWidth: { xs: '100%', sm: 220 }, borderRadius: 2.5, p: 2.2,
            background: 'linear-gradient(135deg, #1976d2, #1565c0)', color: '#fff',
          }}>
            <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              📊 Promedio general
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.2 }}>{promedioGeneral.toFixed(1)}%</Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>{totalRevisiones} revisiones este mes</Typography>
          </Box>
          <Box sx={{
            flex: 1, minWidth: { xs: '100%', sm: 220 }, borderRadius: 2.5, p: 2.2,
            background: 'linear-gradient(135deg, #fb8c00, #ef6c00)', color: '#fff',
          }}>
            <Typography variant="caption" sx={{ opacity: 0.9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.3 }}>
              📍 Locales sin revisar
            </Typography>
            <Typography variant="h5" fontWeight={800} sx={{ mt: 0.5, lineHeight: 1.2 }}>
              {localesSinRevision.length} / {localesActivos.length}
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.95 }}>
              {((localesSinRevision.length / (localesActivos.length || 1)) * 100).toFixed(1)}% pendiente
            </Typography>
          </Box>
        </Box>
      )}

      {/* ─── Fila inferior: Sin revisión + Supervisores (2 columnas más anchas) ─── */}
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        {/* Locales sin revisión */}
        {localesSinRevision.length > 0 && (
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: '100%' }}>
              <Box sx={{ bgcolor: isDark ? '#2a2a2a' : '#fafafa', borderBottom: `0.5px solid ${isDark ? '#333' : '#f0f0f0'}`, px: 2, py: 1.2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Sin revisión este mes ({localesSinRevision.length})
                </Typography>
              </Box>
              <Box sx={{ p: 1.5, maxHeight: 400, overflowY: 'auto', display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1 }}>
                {localesSinRevision.map((l, i) => (
                  <Box key={l._id} display="flex" alignItems="center" gap={1} sx={{
                    px: 1.5, py: 1, borderRadius: 1.5,
                    bgcolor: isDark ? '#3d2f10' : '#fffbeb',
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
          <Grid size={{ xs: 12, md: 6 }}>
            <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)', height: '100%' }}>
              <Box sx={{ bgcolor: isDark ? '#2a2a2a' : '#fafafa', borderBottom: `0.5px solid ${isDark ? '#333' : '#f0f0f0'}`, px: 2, py: 1.2 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.4 }}>
                  Ranking de supervisores ({supervisores.length})
                </Typography>
              </Box>
              <Box sx={{ maxHeight: 460, overflowY: 'auto' }}>
                {supervisores.map((sup, i) => {
                  const pct = parseFloat(sup.promedio);
                  const medalla = ['🥇', '🥈', '🥉'][i];
                  return (
                    <Box key={i} display="flex" alignItems="center" gap={2} sx={{
                      px: 2, py: 1.8,
                      borderBottom: i < supervisores.length - 1 ? `0.5px solid ${isDark ? '#333' : '#f0f0f0'}` : 'none',
                    }}>
                      <Box sx={{ width: 26, textAlign: 'center', fontSize: 20 }}>
                        {medalla || <Typography variant="body2" color="text.secondary" fontWeight={600}>{i + 1}</Typography>}
                      </Box>
                      <Box sx={{ width: 42, height: 42, borderRadius: '50%', bgcolor: getPColor(pct),
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Typography sx={{ color: '#fff', fontSize: 16, fontWeight: 600 }}>
                          {sup.supervisorNombre?.[0]?.toUpperCase()}
                        </Typography>
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body1" fontWeight={600} noWrap>{sup.supervisorNombre}</Typography>
                        <LinearProgress variant="determinate" value={pct}
                          sx={{ height: 7, borderRadius: 3, mt: 0.5, bgcolor: `${getPColor(pct)}22`,
                            '& .MuiLinearProgress-bar': { bgcolor: getPColor(pct) } }} />
                      </Box>
                      <Box sx={{ textAlign: 'right', minWidth: 70 }}>
                        <Typography variant="h6" fontWeight={700} sx={{ color: getPColor(pct), lineHeight: 1.1 }}>
                          {pct.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">{sup.total ? `${sup.total} rev.` : ''}</Typography>
                      </Box>
                    </Box>
                  );
                })}
              </Box>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Histórico por local */}
      {stats?.estadisticasPorLocal?.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Box sx={{ bgcolor: isDark ? '#333' : '#424242', px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff' }} fontWeight={500}>
              Rendimiento histórico por local (12 meses)
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: isDark ? '#2a2a2a' : '#fafafa' }}>
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
                    const catStyle = getCAT_BG(isDark)[cat] || { bg: isDark ? '#2a2a2a' : '#f5f5f5', color: isDark ? '#aaa' : '#666' };
                    return (
                      <TableRow key={item.local} hover>
                        <TableCell sx={{ py: 1.2 }}>
                          <Box sx={{ width: 22, height: 22, borderRadius: '50%', bgcolor: color,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography sx={{ color: '#fff', fontSize: 10, fontWeight: 600 }}>{i + 1}</Typography>
                          </Box>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Typography variant="body2" fontWeight={500}>{item.local}</Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <LinearProgress variant="determinate" value={pct}
                            sx={{ height: 6, borderRadius: 3, bgcolor: `${color}22`,
                              '& .MuiLinearProgress-bar': { bgcolor: color } }} />
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Typography variant="body2" fontWeight={500} sx={{ color }}>
                            {item.promedio}%
                          </Typography>
                        </TableCell>
                        <TableCell sx={{ py: 1.2 }}>
                          <Box sx={{ display: 'inline-block', bgcolor: catStyle.bg,
                            color: catStyle.color, fontSize: 10, fontWeight: 600,
                            px: 1, py: 0.3, borderRadius: 1 }}>
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

      {/* ─── Ubicaciones (solo master/gerencia) ─── */}
      {['master', 'gerencia'].includes(user?.rol) && localesOrdenados.length > 0 && (
        <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Box sx={{ bgcolor: '#1565c0', px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" sx={{ color: '#fff' }} fontWeight={500}>
              📍 Ubicaciones de revisiones del mes
            </Typography>
          </Box>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  {['Local', 'Supervisor', 'Fecha', 'Inicio', 'Fin', 'Duración', 'Coordenadas inicio'].map(h => (
                    <TableCell key={h} sx={{ fontWeight: 600, fontSize: 11, color: 'text.secondary', py: 1 }}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {(() => {
                  const todas = Object.entries(revisionesMes)
                    .flatMap(([nombre, data]) =>
                      (data.revisiones || []).map(r => ({ ...r, localNombre: nombre }))
                    )
                    .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

                  if (todas.length === 0) {
                    return (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                          Sin revisiones este mes
                        </TableCell>
                      </TableRow>
                    );
                  }

                  return todas.map((r, i) => {
                    const geo = r.geolocalizacion;
                    const tieneGeo = geo?.inicio?.latitude;
                    const duracion = geo?.inicio?.timestamp && geo?.fin?.timestamp
                      ? (() => {
                          const diff = new Date(geo.fin.timestamp) - new Date(geo.inicio.timestamp);
                          return `${Math.floor(diff / 3600000)}h ${Math.floor((diff % 3600000) / 60000)}m`;
                        })()
                      : '—';

                    return (
                      <TableRow key={i} hover>
                        <TableCell><Typography variant="body2" fontWeight={500}>{r.localNombre}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{r.supervisor || '—'}</Typography></TableCell>
                        <TableCell><Typography variant="caption">{new Date(r.fecha).toLocaleDateString('es-CL')}</Typography></TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {geo?.inicio?.timestamp ? new Date(geo.inicio.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption">
                            {geo?.fin?.timestamp ? new Date(geo.fin.timestamp).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' }) : '—'}
                          </Typography>
                        </TableCell>
                        <TableCell><Typography variant="caption">{duracion}</Typography></TableCell>
                        <TableCell>
                          {tieneGeo ? (
                            <Box>
                              <Typography variant="caption" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
                                {geo.inicio.latitude.toFixed(4)}, {geo.inicio.longitude.toFixed(4)}
                              </Typography>
                              <Box>
                                <Typography
                                  variant="caption"
                                  sx={{ color: '#1565c0', cursor: 'pointer', fontSize: 10 }}
                                  component="a"
                                  href={`https://www.google.com/maps?q=${geo.inicio.latitude},${geo.inicio.longitude}`}
                                  target="_blank"
                                >
                                  Ver mapa ↗
                                </Typography>
                              </Box>
                            </Box>
                          ) : (
                            <Typography variant="caption" color="textSecondary">Sin geo</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  });
                })()}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}

      {Object.keys(revisionesMes).length === 0 && !stats && (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Typography color="textSecondary">No hay datos disponibles para este mes.</Typography>
        </Paper>
      )}
    </Box>
  );
}
