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
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://supervision-back.vertigs.net';

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
            <Box key={id} sx={{ mb: 1, p: 1.5, bgcolor: '#fff5f5', borderRadius: 1, borderLeft: '3px solid #d32f2f' }}>
              <Box display="flex" alignItems="center" gap={1}>
                <CancelIcon fontSize="small" color="error" />
                <Typography variant="body2" fontWeight={600} color="error">{id}</Typography>
              </Box>
              {v.observacion && (
                <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5, ml: 3 }}>{v.observacion}</Typography>
              )}
              {v.fotos?.length > 0 && (
                <ImageList cols={4} gap={4} sx={{ mt: 1, ml: 3 }}>
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
                    { key: 'servicioCliente', label: 'Servicio al Cliente', peso: 40 },
                    { key: 'cuartoFrio', label: 'Cuarto Frío', peso: 30 },
                    { key: 'cuartoCaliente', label: 'Cuarto Caliente', peso: 30 },
                  ].map(({ key, label, peso }) => {
                    const respuestas = rev[key]?.respuestas || {};
                    const total = Object.keys(respuestas).length;
                    const cumplidos = Object.values(respuestas).filter(r => r.cumple).length;
                    const pct = total > 0 ? (cumplidos / total) * 100 : 0;
                    return (
                      <Grid item xs={12} sm={4} key={key}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                          <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                          <Typography variant="caption" color="textSecondary">Peso: {peso}%</Typography>
                          <Box display="flex" alignItems="center" gap={1} mt={1}>
                            <LinearProgress variant="determinate" value={pct}
                              sx={{ flex: 1, height: 8, borderRadius: 4,
                                '& .MuiLinearProgress-bar': { bgcolor: getPorcentajeColor(pct) } }} />
                            <Typography fontWeight={700} sx={{ color: getPorcentajeColor(pct), minWidth: 45 }}>
                              {pct.toFixed(0)}%
                            </Typography>
                          </Box>
                          <Typography variant="body2" color="textSecondary" mt={0.5}>
                            {cumplidos}/{total} ítems cumplidos
                          </Typography>
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
