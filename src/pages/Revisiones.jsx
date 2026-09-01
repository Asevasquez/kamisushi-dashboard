import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton,
  TextField, MenuItem, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Typography, CircularProgress,
  Divider, Tooltip, Tabs, Tab, LinearProgress, ImageList,
  ImageListItem, Accordion, AccordionSummary, AccordionDetails,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
  PictureAsPdf as PdfIcon,
  ExpandMore as ExpandMoreIcon,
  Cancel as CancelIcon,
  Image as ImageIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useTheme } from '@mui/material/styles';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://supervision-back.vertigs.net';

// ─── Diccionario de preguntas ─────────────────────────────
const PREGUNTAS = {
  'SC-01': 'El local cumple con la presentación y estado físico del local',
  'SC-02': 'Hay presencia del encargado en el local',
  'SC-03': 'No existen reclamos de clientes',
  'SC-04': 'Cumple con el protocolo de atención al cliente',
  'SC-05': 'Cumple con la persuasión de promociones LUX — Presencial',
  'SC-06': 'Cumple con la persuasión de promociones LUX — Llamadas',
  'SC-07': 'Cumple con la persuasión de promociones LUX — WhatsApp',
  'SC-08': 'Cuenta con publicidad física vigente y en buen estado',
  'SC-09': 'Se realiza el ofrecimiento de adicionales',
  'SC-10': 'Tiene las respuestas rápidas en WhatsApp Business',
  'SC-11': 'Tiene promociones vigentes y actualizadas',
  'SC-12': 'Sin listas de difusión masiva — WhatsApp',
  'SC-13': 'Tiene los contactos de clientes guardados correctamente',
  'SC-14': 'Existe conocimiento de carta por parte del equipo',
  'SC-15': 'Cuentan con los equipos operativos',
  'SC-16': 'Ruta de flyers realizada',
  'SC-17': 'Cumple con el protocolo de empaque',
  'CF-01': 'Realizan el lavado de arroz correctamente',
  'CF-02': 'Realizan el aliño del arroz correctamente',
  'CF-03': 'Realizan la cocción del arroz correctamente',
  'CF-04': 'Mise en place en condiciones adecuadas',
  'CF-05': 'Cumple con los gramajes estándar',
  'CF-06': 'Se realiza la rotulación de salsas',
  'CF-07': 'Plaquetas con gramaje adecuado',
  'CF-09': 'Realizan correctamente la dilución de antioxidante',
  'CF-10': 'Lavado y almacenamiento de verduras correcto',
  'CF-11': 'Control de temperatura en refrigeración',
  'CF-12': 'Descongelación correcta de pollo y reineta',
  'CF-13': 'Ceviche correcto',
  'CF-14': 'Sellado de rollos correcto',
  'CC-01': 'Batido del huevo correcto (para apanado)',
  'CC-02': 'Proceso de apanado correcto — rollo y pollo',
  'CC-03': 'Control de temperatura de freidora',
  'CC-04': 'Sellado de puntas en rolls fritos',
  'CC-05': 'Control de grumos en harina, huevo y panko',
  'CC-06': 'Uso correcto de tablas de cortar (código de colores)',
  'CC-07': 'Estandarización de cortes del roll',
  'CC-08': 'Afilado y mantenimiento de cuchillos',
  'CC-09': 'Aliñado del pollo correcto',
  'CC-10': 'Elaboración correcta de recetas de salsas',
  'CC-11': 'Calidad y estado del aceite de fritura',
  'CC-12': 'Presentan dudas en elaboraciones básicas o de alta complejidad',
  'CC-13': 'Campana extractora operativa y limpia',
  'CC-14': 'Limpieza diaria y profunda de las áreas',
  'CC-15': 'Limpieza y sanitización del área de trabajo',
  'CC-16': 'Utilizan elementos de protección e higiene personal',
};

const getCategoriaColor = (categoria) => {
  const map = { 'EXCELENTE': 'success', 'MUY BUENO': 'success', 'BUENO': 'primary', 'REGULAR': 'warning', 'MALO': 'error', 'PÉSIMO': 'error' };
  return map[categoria] || 'default';
};

const getPorcentajeColor = (p) => {
  if (p >= 95) return '#4caf50';
  if (p >= 80) return '#2196f3';
  if (p >= 70) return '#ff9800';
  if (p >= 60) return '#f44336';
  return '#d32f2f';
};

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  return null;
};

function FotoItem({ src, alt }) {
  const [open, setOpen] = useState(false);
  const url = getImageUrl(src);
  if (!url) return null;
  return (
    <>
      <ImageListItem onClick={() => setOpen(true)}
        sx={{ cursor: 'pointer', borderRadius: 1, overflow: 'hidden', border: '2px solid #eee',
          '&:hover': { borderColor: '#d32f2f', transform: 'scale(1.02)', transition: 'all 0.2s' } }}>
        <img src={url} alt={alt} style={{ width: '100%', height: 100, objectFit: 'cover' }} />
      </ImageListItem>
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="md">
        <DialogContent sx={{ p: 0 }}>
          <img src={url} alt={alt} style={{ width: '100%', maxHeight: '80vh', objectFit: 'contain' }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
          <Button href={url} target="_blank" variant="contained" sx={{ bgcolor: '#d32f2f' }}>Abrir en nueva pestaña</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function SeccionDetalle({ titulo, respuestas, color }) {
  const items = Object.entries(respuestas || {});
  const cumplidos = items.filter(([, v]) => v.cumple === true).length;
  const total = items.length;
  const pct = total > 0 ? (cumplidos / total) * 100 : 0;
  const incumplidos = items.filter(([, v]) => v.cumple === false);
  const todasFotos = items.flatMap(([id, v]) => (v.fotos || []).map(f => ({ id, foto: f })));

  return (
    <Accordion defaultExpanded={incumplidos.length > 0}>
      <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ bgcolor: color + '15' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
          <Typography fontWeight={700} sx={{ color }}>{titulo}</Typography>
          <Chip label={`${cumplidos}/${total}`} size="small" />
          <Box sx={{ flex: 1, mx: 2 }}>
            <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 4,
              '& .MuiLinearProgress-bar': { bgcolor: getPorcentajeColor(pct) } }} />
          </Box>
          <Typography fontWeight={700} sx={{ color: getPorcentajeColor(pct) }}>{pct.toFixed(0)}%</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        {todasFotos.length > 0 && (
          <Box mb={2}>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <ImageIcon fontSize="small" /> {todasFotos.length} imagen(es) de evidencia
            </Typography>
            <ImageList cols={4} gap={8} sx={{ mt: 1 }}>
              {todasFotos.map(({ id, foto }, i) => <FotoItem key={i} src={foto} alt={`Evidencia ${id}`} />)}
            </ImageList>
          </Box>
        )}
        {incumplidos.length === 0 ? (
          <Typography color="success.main" variant="body2">✅ Sin incumplimientos en esta sección</Typography>
        ) : (
          incumplidos.map(([id, v]) => (
            <Box key={id} sx={{ mb: 1.5, p: 2, bgcolor: isDark ? '#2d1515' : '#fff5f5', borderRadius: 1, borderLeft: '3px solid #d32f2f' }}>
              <Box display="flex" alignItems="flex-start" gap={1} mb={0.5}>
                <CancelIcon fontSize="small" color="error" sx={{ mt: 0.3, flexShrink: 0 }} />
                <Box>
                  <Box display="flex" alignItems="center" gap={1}>
                    <Typography variant="caption" fontWeight={800} color="error"
                      sx={{ bgcolor: '#fee2e2', px: 0.8, py: 0.1, borderRadius: 1 }}>
                      {id}
                    </Typography>
                  </Box>
                  <Typography variant="body2" color="text.primary" fontWeight={500} sx={{ mt: 0.3 }}>
                    {PREGUNTAS[id] || id}
                  </Typography>
                </Box>
              </Box>
              {v.observacion && (
                <Box sx={{ ml: 3.5, mt: 0.5, p: 1, bgcolor: isDark ? '#1a1a1a' : '#fff', borderRadius: 1, border: `1px solid ${isDark ? '#5d2020' : '#fecaca'}` }}>
                  <Typography variant="caption" color="error" fontWeight={600}>Observación: </Typography>
                  <Typography variant="caption" color="textSecondary">{v.observacion}</Typography>
                </Box>
              )}
              {v.fotos?.length > 0 && (
                <ImageList cols={4} gap={4} sx={{ mt: 1, ml: 3.5 }}>
                  {v.fotos.map((f, i) => <FotoItem key={i} src={f} alt={`${id} foto ${i + 1}`} />)}
                </ImageList>
              )}
            </Box>
          ))
        )}
      </AccordionDetails>
    </Accordion>
  );
}

export default function Revisiones() {
  const [revisiones, setRevisiones] = useState([]);
  const [locales, setLocales] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({ localId: '', supervisorId: '', fechaInicio: null, fechaFin: null });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, revision: null });
  const [tabDetalle, setTabDetalle] = useState(0);
  const { user } = useAuth();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';

  useEffect(() => { loadData(); }, []);
  useEffect(() => { loadRevisiones(); }, [filters]);

  const loadData = async () => {
    try {
      const promises = [api.get('/locales/activos')];
      if (['master', 'gerencia'].includes(user?.rol)) promises.push(api.get('/supervisores'));
      const results = await Promise.all(promises);
      setLocales(results[0].data);
      if (results[1]) setSupervisores(results[1].data);
    } catch (error) { console.error(error); }
  };

  const loadRevisiones = async () => {
    setLoading(true);
    try {
      const response = await api.get('/revisiones');
      let data = response.data;
      if (filters.localId) data = data.filter(r => r.localId === filters.localId || r.localId?._id === filters.localId);
      if (filters.supervisorId) data = data.filter(r => r.supervisorId === filters.supervisorId || r.supervisorId?._id === filters.supervisorId);
      if (filters.fechaInicio) data = data.filter(r => new Date(r.fechaRevision) >= filters.fechaInicio);
      if (filters.fechaFin) data = data.filter(r => new Date(r.fechaRevision) <= filters.fechaFin);
      setRevisiones(data);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleVerDetalle = async (id) => {
    try {
      const response = await api.get(`/revisiones/${id}`);
      setDetailDialog({ open: true, revision: response.data });
      setTabDetalle(0);
    } catch (error) { console.error(error); }
  };

  const handleDescargarPDF = async (id) => {
    setPdfLoading(id);
    try {
      const response = await api.get(`/revisiones/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `revision_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) { console.error(error); }
    finally { setPdfLoading(null); }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/revisiones/${deleteDialog.id}`);
      loadRevisiones();
      setDeleteDialog({ open: false, id: null });
    } catch (error) { console.error(error); }
  };

  const getNombreLocal = (revision) => {
    if (revision.localNombre) return revision.localNombre;
    const local = locales.find(l => l._id === revision.localId);
    return local?.nombre || revision.localId || '—';
  };

  const rev = detailDialog.revision;

  const todasLasFotos = rev ? [
    ...Object.entries(rev.servicioCliente?.respuestas || {}).flatMap(([id, v]) => (v.fotos || []).map(f => ({ seccion: 'Servicio al Cliente', id, url: f }))),
    ...Object.entries(rev.cuartoFrio?.respuestas || {}).flatMap(([id, v]) => (v.fotos || []).map(f => ({ seccion: 'Cuarto Frío', id, url: f }))),
    ...Object.entries(rev.cuartoCaliente?.respuestas || {}).flatMap(([id, v]) => (v.fotos || []).map(f => ({ seccion: 'Cuarto Caliente', id, url: f }))),
    ...(rev.servicioCliente?.reclamos || []).filter(r => r.foto).map(r => ({ seccion: 'Reclamo', id: r.tipo, url: r.foto })),
  ] : [];

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>Revisiones</Typography>
        <Typography variant="body2" color="textSecondary">{revisiones.length} revisión(es)</Typography>
      </Box>

      <Paper sx={{ p: 2, mb: 2 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField select fullWidth label="Local" size="small" value={filters.localId}
                onChange={(e) => setFilters({ ...filters, localId: e.target.value })}>
                <MenuItem value="">Todos los locales</MenuItem>
                {locales.map(l => <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>)}
              </TextField>
            </Grid>
            {['master', 'gerencia'].includes(user?.rol) && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField select fullWidth label="Supervisor" size="small" value={filters.supervisorId}
                  onChange={(e) => setFilters({ ...filters, supervisorId: e.target.value })}>
                  <MenuItem value="">Todos los supervisores</MenuItem>
                  {supervisores.map(s => <MenuItem key={s._id} value={s._id}>{s.nombre}</MenuItem>)}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker label="Desde" value={filters.fechaInicio}
                onChange={(date) => setFilters({ ...filters, fechaInicio: date })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker label="Hasta" value={filters.fechaFin}
                onChange={(date) => setFilters({ ...filters, fechaFin: date })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }} />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button variant="outlined" fullWidth
                onClick={() => setFilters({ localId: '', supervisorId: '', fechaInicio: null, fechaFin: null })}>
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>

      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#d32f2f' }}>
                {['Local', 'Supervisor', 'Fecha', 'Porcentaje', 'Categoría', 'Tipo', 'Acciones'].map(h => (
                  <TableCell key={h} sx={{ color: '#fff', fontWeight: 600 }}>{h}</TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {revisiones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                    No hay revisiones con los filtros aplicados
                  </TableCell>
                </TableRow>
              ) : (
                revisiones.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage).map((revision) => (
                  <TableRow key={revision._id} hover>
                    <TableCell><strong>{getNombreLocal(revision)}</strong></TableCell>
                    <TableCell>{revision.supervisorNombre || '—'}</TableCell>
                    <TableCell>{new Date(revision.fechaRevision).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <LinearProgress variant="determinate" value={revision.porcentajeTotal || 0}
                          sx={{ width: 60, height: 6, borderRadius: 3,
                            '& .MuiLinearProgress-bar': { bgcolor: getPorcentajeColor(revision.porcentajeTotal) } }} />
                        <strong>{revision.porcentajeTotal?.toFixed(1) || 0}%</strong>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={revision.categoria || '—'} color={getCategoriaColor(revision.categoria)} size="small" />
                    </TableCell>
                    <TableCell>
                      <Chip label={revision.esBorrador ? 'Borrador' : 'Final'} size="small" variant="outlined"
                        color={revision.esBorrador ? 'warning' : 'success'} />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" color="primary" onClick={() => handleVerDetalle(revision._id)}>
                          <ViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar PDF">
                        <IconButton size="small" color="secondary"
                          onClick={() => handleDescargarPDF(revision._id)}
                          disabled={pdfLoading === revision._id}>
                          {pdfLoading === revision._id ? <CircularProgress size={16} /> : <PdfIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      {user?.rol === 'master' && (
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error"
                            onClick={() => setDeleteDialog({ open: true, id: revision._id })}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination rowsPerPageOptions={[5, 10, 25]} component="div"
            count={revisiones.length} rowsPerPage={rowsPerPage} page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            labelRowsPerPage="Filas por página" />
        </TableContainer>
      )}

      {/* DIALOG DETALLE */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, revision: null })} maxWidth="lg" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: '#fff', pb: 1 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="h6">{rev?.localNombre || '—'} — {rev ? new Date(rev.fechaRevision).toLocaleDateString('es-CL') : ''}</Typography>
            {rev && (
              <Chip label={`${rev.porcentajeTotal?.toFixed(1)}% — ${rev.categoria}`}
                sx={{ bgcolor: getPorcentajeColor(rev.porcentajeTotal), color: '#fff', fontWeight: 700 }} />
            )}
          </Box>
        </DialogTitle>

        <Tabs value={tabDetalle} onChange={(_, v) => setTabDetalle(v)}
          sx={{ borderBottom: 1, borderColor: 'divider', px: 2 }}>
          <Tab label="Resumen" />
          <Tab label="Secciones" />
          <Tab label={`Fotos (${todasLasFotos.length})`} />
          <Tab label={`Reclamos (${rev?.servicioCliente?.reclamos?.length || 0})`} />
        </Tabs>

        <DialogContent sx={{ pt: 2, minHeight: 400 }}>
          {rev && (
            <>
              {tabDetalle === 0 && (
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Local</Typography>
                    <Typography fontWeight={600}>{rev.localNombre || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Supervisor</Typography>
                    <Typography fontWeight={600}>{rev.supervisorNombre || '—'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Fecha</Typography>
                    <Typography>{new Date(rev.fechaRevision).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6} md={3}>
                    <Typography variant="caption" color="textSecondary">Tipo</Typography>
                    <Box mt={0.5}>
                      <Chip label={rev.esBorrador ? 'Borrador' : 'Final'} color={rev.esBorrador ? 'warning' : 'success'} size="small" />
                    </Box>
                  </Grid>
                  <Grid item xs={12}><Divider /></Grid>
                  {[
                    { key: 'servicioCliente', label: 'Servicio al Cliente', peso: 40, color: '#2196f3' },
                    { key: 'cuartoFrio', label: 'Cuarto Frío', peso: 30, color: '#4caf50' },
                    { key: 'cuartoCaliente', label: 'Cuarto Caliente', peso: 30, color: '#ff9800' },
                  ].map(({ key, label, peso, color }) => {
                    const respuestas = rev[key]?.respuestas || {};
                    const total = Object.keys(respuestas).length;
                    const cumplidos = Object.values(respuestas).filter(r => r.cumple).length;
                    const incumplidos = total - cumplidos;
                    const pct = total > 0 ? (cumplidos / total) * 100 : 0;
                    const pColor = getPorcentajeColor(pct);
                    return (
                      <Grid item xs={12} sm={4} key={key}>
                        <Paper variant="outlined" sx={{ p: 2, borderTop: `4px solid ${color}`, borderRadius: 2, bgcolor: isDark ? '#1e1e1e' : 'background.paper' }}>
                          <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                            <Box>
                              <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                              <Typography variant="caption" color="textSecondary">Peso: {peso}%</Typography>
                            </Box>
                            <Typography variant="h5" fontWeight={800} sx={{ color: pColor }}>
                              {pct.toFixed(0)}%
                            </Typography>
                          </Box>
                          <Box mt={1.5}>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ height: 8, borderRadius: 4, bgcolor: `${pColor}22`,
                                '& .MuiLinearProgress-bar': { bgcolor: pColor } }} />
                          </Box>
                          <Box display="flex" justifyContent="space-between" mt={1}>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#4caf50' }} />
                              <Typography variant="caption" color="textSecondary">{cumplidos} cumplidos</Typography>
                            </Box>
                            <Box display="flex" alignItems="center" gap={0.5}>
                              <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: '#f44336' }} />
                              <Typography variant="caption" color="textSecondary">{incumplidos} incumplidos</Typography>
                            </Box>
                          </Box>
                        </Paper>
                      </Grid>
                    );
                  })}
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">Administrador</Typography>
                    <Typography>{rev.administrador?.nombre || '—'} {rev.administrador?.presente ? '✅' : '❌'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">Sub-Administrador</Typography>
                    <Typography>{rev.subAdministrador?.nombre || '—'} {rev.subAdministrador?.presente ? '✅' : '❌'}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" color="textSecondary">¿Borran Reclamos?</Typography>
                    <Typography>{rev.borranReclamos || '—'}</Typography>
                  </Grid>
                  {rev.comentariosGenerales && (
                    <Grid item xs={12}>
                      <Typography variant="caption" color="textSecondary">Comentarios Generales</Typography>
                      <Typography sx={{ mt: 0.5, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>{rev.comentariosGenerales}</Typography>
                    </Grid>
                  )}
                  <Grid item xs={12}><Divider /></Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Creado por</Typography>
                    <Typography variant="body2">{rev.creadoPor || '—'} · {rev.creadoEn ? new Date(rev.creadoEn).toLocaleDateString('es-CL') : ''}</Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="caption" color="textSecondary">Última modificación</Typography>
                    <Typography variant="body2">{rev.modificadoPor || '—'} · {rev.modificadoEn ? new Date(rev.modificadoEn).toLocaleDateString('es-CL') : ''}</Typography>
                  </Grid>
                </Grid>
              )}

              {tabDetalle === 1 && (
                <Box>
                  <SeccionDetalle titulo="Servicio al Cliente (40%)" respuestas={rev.servicioCliente?.respuestas} color="#2196f3" />
                  <SeccionDetalle titulo="Cuarto Frío (30%)" respuestas={rev.cuartoFrio?.respuestas} color="#4caf50" />
                  <SeccionDetalle titulo="Cuarto Caliente (30%)" respuestas={rev.cuartoCaliente?.respuestas} color="#ff9800" />
                </Box>
              )}

              {tabDetalle === 2 && (
                <Box>
                  {todasLasFotos.length === 0 ? (
                    <Typography color="textSecondary" align="center" py={4}>No hay imágenes en esta revisión</Typography>
                  ) : (
                    <>
                      <Typography variant="body2" color="textSecondary" mb={2}>
                        {todasLasFotos.length} imagen(es) — haz clic para ampliar
                      </Typography>
                      <ImageList cols={4} gap={8}>
                        {todasLasFotos.map(({ seccion, id, url }, i) => (
                          <Box key={i}>
                            <FotoItem src={url} alt={`${seccion} - ${id}`} />
                            <Typography variant="caption" color="textSecondary" noWrap>{seccion} · {id}</Typography>
                          </Box>
                        ))}
                      </ImageList>
                    </>
                  )}
                </Box>
              )}

              {tabDetalle === 3 && (
                <Box>
                  {(rev.servicioCliente?.reclamos || []).length === 0 ? (
                    <Typography color="success.main" align="center" py={4}>✅ No se registraron reclamos</Typography>
                  ) : (
                    rev.servicioCliente.reclamos.map((r, i) => (
                      <Paper key={i} variant="outlined" sx={{ p: 2, mb: 2, borderLeft: '4px solid #d32f2f' }}>
                        <Grid container spacing={2} alignItems="center">
                          <Grid item xs={12} sm={r.foto ? 8 : 12}>
                            <Typography fontWeight={700} color="error">Reclamo #{i + 1}: {r.tipo}</Typography>
                            {r.telefono && <Typography variant="body2">📞 {r.telefono}</Typography>}
                            {r.fecha && <Typography variant="body2">📅 {new Date(r.fecha).toLocaleDateString('es-CL')}</Typography>}
                            <Typography variant="body2">
                              Solución: <Chip label={r.entregoSolucion || 'No'} size="small"
                                color={r.entregoSolucion === 'Sí' || r.entregoSolucion === 'Si' ? 'success' : 'error'} />
                            </Typography>
                            {r.montoCompensacion && r.montoCompensacion !== '0' && (
                              <Typography variant="body2">💰 Compensación: ${r.montoCompensacion}</Typography>
                            )}
                          </Grid>
                          {r.foto && getImageUrl(r.foto) && (
                            <Grid item xs={12} sm={4}>
                              <FotoItem src={r.foto} alt={`Reclamo ${r.tipo}`} />
                            </Grid>
                          )}
                        </Grid>
                      </Paper>
                    ))
                  )}
                </Box>
              )}
            </>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDetailDialog({ open: false, revision: null })}>Cerrar</Button>
          {rev && (
            <Button variant="contained" startIcon={pdfLoading === rev._id ? <CircularProgress size={16} color="inherit" /> : <PdfIcon />}
              onClick={() => handleDescargarPDF(rev._id)} disabled={pdfLoading === rev._id} sx={{ bgcolor: '#d32f2f' }}>
              Descargar PDF
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro que deseas eliminar esta revisión?</Typography>
          <Typography variant="caption" color="error">Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
