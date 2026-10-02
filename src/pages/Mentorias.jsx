import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  IconButton, Tooltip, Tabs, Tab, LinearProgress, Divider, Link,
} from '@mui/material';
import {
  Close as CloseIcon, PictureAsPdf as PdfIcon, Delete as DeleteIcon,
  Visibility as VisibilityIcon, Place as PlaceIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CompromisoMentoriaDialog, {
  ChipEstadoCompromiso, descargarPdfMentoria, fmtFecha, fmtFechaHora,
} from '../components/CompromisoMentoriaDialog';

// Mismos colores de categoría que Auditoría
const CATEGORIA_COLOR = {
  EXCELENTE: '#1565c0', 'MUY BUENO': '#2e7d32', BUENO: '#43a047',
  REGULAR: '#f57c00', MALO: '#ef6c00', 'PÉSIMO': '#c62828',
};
const colorCategoria = (cat) => CATEGORIA_COLOR[cat] || '#999';

function KpiCard({ label, value, sub, color }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, height: '100%', borderBottom: `3px solid ${color || '#e0e0e0'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', letterSpacing: 0.5, fontWeight: 600, fontSize: 13 }}>
        {label.toUpperCase()}
      </Typography>
      <Typography variant="h3" fontWeight={800} sx={{ color: color || 'text.primary', mt: 0.75 }}>{value}</Typography>
      {sub && <Typography variant="body2" color="text.secondary" fontSize={13}>{sub}</Typography>}
    </Paper>
  );
}

const linkMapa = (p) => (p && p.latitud != null ? `https://www.google.com/maps?q=${p.latitud},${p.longitud}` : null);

function duracion(ini, fin) {
  if (!ini || !fin) return '—';
  const min = Math.round((new Date(fin) - new Date(ini)) / 60000);
  if (!(min > 0)) return '—';
  return min >= 60 ? `${Math.floor(min / 60)} h ${min % 60} min` : `${min} min`;
}

const FILTROS_VACIOS = { mes: '', localId: '', mentorId: '', categoria: '', estado: '' };

export default function Mentorias() {
  const { user } = useAuth();
  const esGlobal = ['gerencia', 'master'].includes(user?.rol);

  const [catalogo, setCatalogo] = useState({ preguntas: [], umbralPlanAccion: 7 });
  const [locales, setLocales] = useState([]);
  const [mentores, setMentores] = useState([]);
  const [filters, setFilters] = useState(FILTROS_VACIOS);

  const [resumen, setResumen] = useState(null);
  const [mentorias, setMentorias] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [loading, setLoading] = useState(true);

  const [detalle, setDetalle] = useState(null);
  const [tab, setTab] = useState(0);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [compromisoAbierto, setCompromisoAbierto] = useState(null); // { mentoriaId, compromiso, contexto }

  useEffect(() => {
    api.get('/mentorias/preguntas').then((r) => setCatalogo(r.data)).catch(() => {});
    api.get('/locales/activos').then((r) => setLocales(r.data)).catch(() => setLocales([]));
    if (esGlobal) {
      // Si el rol no tiene acceso a /usuarios, simplemente no se muestra el filtro por mentor
      api.get('/usuarios')
        .then((r) => setMentores((r.data || []).filter((u) => u.rol === 'mentor')))
        .catch(() => setMentores([]));
    }
  }, [esGlobal]);

  const paramsFiltro = useCallback(() => {
    const p = {};
    Object.entries(filters).forEach(([k, v]) => { if (v) p[k] = v; });
    return p;
  }, [filters]);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = paramsFiltro();
      const [lista, res] = await Promise.all([
        api.get('/mentorias', { params: { ...params, page: page + 1, limit: rowsPerPage } }),
        api.get('/mentorias/resumen', { params: { mes: params.mes, localId: params.localId, mentorId: params.mentorId } }),
      ]);
      setMentorias(lista.data.data || []);
      setTotal(lista.data.total || 0);
      setResumen(res.data);
    } catch (e) {
      console.error('Error cargando mentorías:', e);
    } finally {
      setLoading(false);
    }
  }, [paramsFiltro, page, rowsPerPage]);

  useEffect(() => { cargar(); }, [cargar]);

  const textoPregunta = (n) => catalogo.preguntas.find((p) => p.numero === n) || {};

  const verDetalle = async (id) => {
    try {
      const { data } = await api.get(`/mentorias/${id}`);
      setDetalle(data);
      setTab(0);
    } catch (e) {
      alert('No se pudo cargar el detalle de la mentoría');
    }
  };

  const refrescarDetalle = async () => {
    cargar();
    if (detalle) {
      const { data } = await api.get(`/mentorias/${detalle._id}`);
      setDetalle(data);
    }
  };

  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar el borrador de ${m.localNombre}?`)) return;
    try {
      await api.delete(`/mentorias/${m._id}`);
      cargar();
    } catch (e) {
      alert(e.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const pdf = async (m) => {
    setPdfLoading(true);
    try {
      await descargarPdfMentoria(m._id, `Mentoria_${m.localNombre}_${m.numeroInforme || m._id}.pdf`);
    } catch (e) {
      alert('No se pudo generar el PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const umbral = catalogo.umbralPlanAccion || 7;
  const columnas = esGlobal ? 11 : 10;

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Typography variant="h5" fontWeight={500}>Mentorías</Typography>
      <Typography variant="caption" color="text.secondary">Evaluación de administradores y seguimiento de compromisos</Typography>

      {/* ─── KPIs ─── */}
      <Grid container spacing={2} sx={{ my: 2, width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Mentorías finalizadas" value={resumen?.totalMentorias ?? '—'} color="#1976d2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Cumplimiento promedio" value={resumen ? `${resumen.cumplimientoPromedio}%` : '—'} color="#1e5aa8" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Compromisos abiertos" value={resumen?.compromisosAbiertos ?? '—'}
            sub={resumen ? `${resumen.compromisosEnRevision} en revisión` : ''} color="#c2410c" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Compromisos vencidos" value={resumen?.compromisosVencidos ?? '—'} color="#c62828" />
        </Grid>
      </Grid>

      {/* ─── Filtros ─── */}
      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <TextField type="month" size="small" label="Mes" value={filters.mes}
          onChange={(e) => { setPage(0); setFilters({ ...filters, mes: e.target.value }); }}
          InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <TextField select size="small" label="Local" value={filters.localId}
          onChange={(e) => { setPage(0); setFilters({ ...filters, localId: e.target.value }); }} sx={{ width: 180 }}>
          <MenuItem value="">Todos</MenuItem>
          {locales.map((l) => <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>)}
        </TextField>
        {esGlobal && mentores.length > 0 && (
          <TextField select size="small" label="Mentor" value={filters.mentorId}
            onChange={(e) => { setPage(0); setFilters({ ...filters, mentorId: e.target.value }); }} sx={{ width: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {mentores.map((u) => <MenuItem key={u._id} value={u._id}>{u.nombre}</MenuItem>)}
          </TextField>
        )}
        <TextField select size="small" label="Categoría" value={filters.categoria}
          onChange={(e) => { setPage(0); setFilters({ ...filters, categoria: e.target.value }); }} sx={{ width: 160 }}>
          <MenuItem value="">Todas</MenuItem>
          {Object.keys(CATEGORIA_COLOR).map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Estado" value={filters.estado}
          onChange={(e) => { setPage(0); setFilters({ ...filters, estado: e.target.value }); }} sx={{ width: 150 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="finalizada">Finalizadas</MenuItem>
          <MenuItem value="borrador">Borradores</MenuItem>
        </TextField>
        <Button size="small" onClick={() => { setPage(0); setFilters(FILTROS_VACIOS); }}>Limpiar</Button>
      </Paper>

      {/* ─── Puntaje por pregunta + por vencer ─── */}
      <Grid container spacing={2} sx={{ mb: 2, width: '100%' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Typography variant="subtitle1" fontWeight={700}>Puntaje promedio por pregunta</Typography>
            <Typography variant="caption" color="text.secondary">Escala 0 a 10 · bajo {umbral} requiere plan de acción</Typography>
            <Box mt={1.5}>
              {(resumen?.promedioPorPregunta || []).map((p) => {
                const v = p.promedio;
                const color = v === null ? '#bbb' : v < umbral ? '#c2410c' : '#1e5aa8';
                return (
                  <Box key={p.numero} display="grid" gridTemplateColumns="minmax(150px, 230px) 1fr 40px" gap={1.5} alignItems="center" py={0.6}>
                    <Typography variant="body2" noWrap title={p.ambito}>{String(p.numero).padStart(2, '0')} · {p.ambito}</Typography>
                    <LinearProgress variant="determinate" value={v === null ? 0 : v * 10}
                      sx={{ height: 10, borderRadius: 5, bgcolor: 'action.hover', '& .MuiLinearProgress-bar': { bgcolor: color, borderRadius: 5 } }} />
                    <Typography variant="body2" fontWeight={700} textAlign="right">{v === null ? '—' : v.toFixed(1).replace('.', ',')}</Typography>
                  </Box>
                );
              })}
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={1}>Compromisos por vencer</Typography>
            {(resumen?.porVencer || []).length === 0 && (
              <Typography variant="body2" color="text.secondary">Sin compromisos pendientes.</Typography>
            )}
            {(resumen?.porVencer || []).map((c) => (
              <Box key={c._id} display="flex" justifyContent="space-between" gap={1.5} py={1} sx={{ borderBottom: '1px solid', borderColor: 'divider' }}>
                <Box minWidth={0}>
                  <Typography variant="body2" fontWeight={700}>
                    {c.localNombre} <Typography component="span" variant="body2" color="text.secondary">· Preg. {c.preguntaNumero}</Typography>
                  </Typography>
                  <Typography variant="body2" color="text.secondary" noWrap title={c.compromisoAlumno}>{c.compromisoAlumno}</Typography>
                </Box>
                <Box textAlign="right" flexShrink={0}>
                  <Typography variant="caption" color="text.secondary" display="block">{fmtFecha(c.fechaCompromiso)}</Typography>
                  <ChipEstadoCompromiso estado={c.estado} vencido={c.vencido} />
                </Box>
              </Box>
            ))}
          </Paper>
        </Grid>
      </Grid>

      {/* ─── Tabla ─── */}
      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 600 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Local</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Mentor</TableCell>
                  <TableCell>Administrador</TableCell>
                  <TableCell align="center">Puntaje</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell align="center">Compromisos</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>N° informe</TableCell>
                  {esGlobal && <TableCell>Ubicación</TableCell>}
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {mentorias.map((m) => {
                  const comp = m.compromisos || [];
                  const cerrados = comp.filter((c) => c.estado === 'cerrado').length;
                  const mapa = linkMapa(m.geolocalizacion?.inicio);
                  return (
                    <TableRow key={m._id} hover>
                      <TableCell><b>{m.localNombre}</b></TableCell>
                      <TableCell>{fmtFecha(m.fechaMentoria)}</TableCell>
                      <TableCell>{m.mentorNombre}</TableCell>
                      <TableCell>{m.alumnoNombre || '—'}</TableCell>
                      <TableCell align="center"><b>{m.puntajeTotal}/100</b></TableCell>
                      <TableCell>
                        {m.esBorrador
                          ? <Typography variant="body2" color="text.secondary">—</Typography>
                          : <Chip size="small" label={m.categoria} sx={{ bgcolor: colorCategoria(m.categoria), color: '#fff', fontWeight: 700 }} />}
                      </TableCell>
                      <TableCell align="center">{m.esBorrador ? '—' : `${cerrados} / ${comp.length}`}</TableCell>
                      <TableCell>
                        <Chip size="small" variant={m.esBorrador ? 'outlined' : 'filled'}
                          label={m.esBorrador ? 'Borrador' : 'Finalizada'}
                          sx={m.esBorrador ? {} : { bgcolor: '#1e5aa8', color: '#fff' }} />
                      </TableCell>
                      <TableCell>{m.numeroInforme || '—'}</TableCell>
                      {esGlobal && (
                        <TableCell>
                          {mapa
                            ? <Link href={mapa} target="_blank" rel="noreferrer" underline="hover" sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}><PlaceIcon fontSize="small" />Ver mapa</Link>
                            : <Typography variant="body2" color="text.secondary">Sin datos</Typography>}
                        </TableCell>
                      )}
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Ver detalle">
                          <IconButton size="small" onClick={() => verDetalle(m._id)}><VisibilityIcon fontSize="small" /></IconButton>
                        </Tooltip>
                        {!m.esBorrador && (
                          <Tooltip title="Descargar PDF">
                            <span>
                              <IconButton size="small" onClick={() => pdf(m)} disabled={pdfLoading}><PdfIcon fontSize="small" /></IconButton>
                            </span>
                          </Tooltip>
                        )}
                        {m.esBorrador && user?.rol === 'master' && (
                          <Tooltip title="Eliminar borrador">
                            <IconButton size="small" color="error" onClick={() => eliminar(m)}><DeleteIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {mentorias.length === 0 && (
                  <TableRow><TableCell colSpan={columnas} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin mentorías para este filtro.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination
          component="div" count={total} page={page} rowsPerPage={rowsPerPage}
          onPageChange={(_, p) => setPage(p)}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[20, 50, 100]} labelRowsPerPage="Filas por página"
          labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`}
        />
      </Paper>

      {/* ─── Detalle ─── */}
      <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth>
        {detalle && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: detalle.esBorrador ? '#616161' : colorCategoria(detalle.categoria), color: '#fff' }}>
              <Box>
                <Typography variant="h6">
                  {detalle.localNombre} — {detalle.puntajeTotal}/100 {detalle.esBorrador ? '(borrador)' : `(${detalle.categoria})`}
                </Typography>
                <Typography variant="caption">
                  {fmtFecha(detalle.fechaMentoria)} · Mentor {detalle.mentorNombre} · Administrador {detalle.alumnoNombre || '—'}
                  {detalle.numeroInforme ? ` · ${detalle.numeroInforme}` : ''}
                </Typography>
              </Box>
              <IconButton onClick={() => setDetalle(null)} sx={{ color: '#fff' }} aria-label="Cerrar"><CloseIcon /></IconButton>
            </DialogTitle>
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Tab label="Evaluación" />
              <Tab label={`Compromisos (${detalle.compromisos?.length || 0})`} />
              <Tab label="Observaciones" />
              {esGlobal && <Tab label="Ubicación" />}
            </Tabs>
            <DialogContent dividers sx={{ minHeight: 360 }}>
              {/* Evaluación */}
              {tab === 0 && [...(detalle.preguntas || [])].sort((a, b) => a.numero - b.numero).map((p) => {
                const def = textoPregunta(p.numero);
                const bajo = p.puntaje !== null && p.puntaje < umbral;
                return (
                  <Box key={p.numero} sx={{ py: 1.25, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <Box display="flex" justifyContent="space-between" gap={2} alignItems="flex-start">
                      <Box flex={1}>
                        <Typography variant="caption" fontWeight={800} color="text.secondary">
                          {String(p.numero).padStart(2, '0')} · {(def.ambito || '').toUpperCase()}
                        </Typography>
                        <Typography variant="body2">{def.pregunta}</Typography>
                        {p.comentario && <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mt: 0.5 }}>{p.comentario}</Typography>}
                      </Box>
                      <Typography variant="h6" fontWeight={800} sx={{ color: bajo ? '#c2410c' : '#1e5aa8', whiteSpace: 'nowrap' }}>
                        {p.puntaje ?? '—'}/10
                      </Typography>
                    </Box>
                    {/* En borradores el plan todavía vive en la pregunta */}
                    {detalle.esBorrador && bajo && p.plan && (
                      <Paper variant="outlined" sx={{ p: 1.5, mt: 1, bgcolor: 'action.hover' }}>
                        <Typography variant="caption" fontWeight={700}>PLAN DE ACCIÓN (borrador)</Typography>
                        <Typography variant="body2">{p.plan.compromisoAlumno || 'Sin compromiso aún'}</Typography>
                      </Paper>
                    )}
                  </Box>
                );
              })}

              {/* Compromisos */}
              {tab === 1 && (
                <>
                  {detalle.esBorrador && <Typography variant="body2" color="text.secondary">Los compromisos se generan al finalizar la mentoría.</Typography>}
                  {!detalle.esBorrador && (detalle.compromisos || []).length === 0 && (
                    <Typography variant="body2" color="text.secondary">Todas las preguntas obtuvieron {umbral} o más. Sin compromisos.</Typography>
                  )}
                  {(detalle.compromisos || []).map((c) => (
                    <Paper key={c._id} variant="outlined" sx={{ p: 1.5, mb: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                      onClick={() => setCompromisoAbierto({ mentoriaId: detalle._id, compromiso: c, contexto: `${detalle.localNombre} · ${detalle.numeroInforme || ''}` })}>
                      <Box display="flex" justifyContent="space-between" gap={2}>
                        <Typography variant="caption" fontWeight={800} sx={{ color: '#c2410c' }}>
                          {String(c.preguntaNumero).padStart(2, '0')} · {(c.ambito || '').toUpperCase()} · {c.puntaje}/10
                        </Typography>
                        <ChipEstadoCompromiso estado={c.estado}
                          vencido={c.estado === 'abierto' && c.fechaCompromiso && new Date(c.fechaCompromiso).setHours(23, 59, 59, 999) < Date.now()} />
                      </Box>
                      <Typography variant="body2" fontWeight={600} mt={0.5}>{c.compromisoAlumno}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {c.responsable} · vence {fmtFecha(c.fechaCompromiso)} · {c.evidencias?.length || 0} evidencias
                      </Typography>
                    </Paper>
                  ))}
                </>
              )}

              {/* Observaciones */}
              {tab === 2 && [
                ['Sin filtro · SAC', detalle.observaciones?.sac],
                ['Sin filtro · Cocina', detalle.observaciones?.cocina],
                ['Sin filtro · Liderazgo', detalle.observaciones?.liderazgo],
                ['Finanzas', detalle.observaciones?.finanzas],
              ].map(([t, v]) => (
                <Paper key={t} sx={{ p: 1.5, mb: 1.5, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">{t.toUpperCase()}</Typography>
                  <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{v || 'Sin observaciones.'}</Typography>
                </Paper>
              ))}

              {/* Ubicación (solo master/gerencia) */}
              {esGlobal && tab === 3 && (
                <Box>
                  {[['Inicio de la visita', detalle.geolocalizacion?.inicio], ['Término de la visita', detalle.geolocalizacion?.fin]].map(([t, p]) => (
                    <Paper key={t} variant="outlined" sx={{ p: 2, mb: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{t}</Typography>
                      {p && p.latitud != null ? (
                        <>
                          <Typography variant="body2">{p.latitud}, {p.longitud}{p.precision ? ` · precisión ${Math.round(p.precision)} m` : ''}</Typography>
                          <Typography variant="body2" color="text.secondary">{fmtFechaHora(p.fecha)}</Typography>
                          <Link href={linkMapa(p)} target="_blank" rel="noreferrer" underline="hover">Abrir en Google Maps</Link>
                        </>
                      ) : <Typography variant="body2" color="text.secondary">Sin ubicación registrada.</Typography>}
                    </Paper>
                  ))}
                  <Divider sx={{ my: 1.5 }} />
                  <Typography variant="body2">Duración de la visita: <b>{duracion(detalle.fechaMentoria, detalle.fechaFin)}</b></Typography>
                </Box>
              )}
            </DialogContent>
            <DialogActions>
              {!detalle.esBorrador && (
                <Button onClick={() => pdf(detalle)} disabled={pdfLoading} startIcon={pdfLoading ? <CircularProgress size={16} /> : <PdfIcon />}>
                  Descargar PDF
                </Button>
              )}
              <Button onClick={() => setDetalle(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      <CompromisoMentoriaDialog
        open={!!compromisoAbierto}
        mentoriaId={compromisoAbierto?.mentoriaId}
        compromiso={compromisoAbierto?.compromiso}
        contexto={compromisoAbierto?.contexto}
        onClose={() => setCompromisoAbierto(null)}
        onActualizado={refrescarDetalle}
      />
    </Box>
  );
}
