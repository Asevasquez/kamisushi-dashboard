import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Grid, TextField, MenuItem, Button,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Chip, Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
  IconButton, Tooltip, ImageList, ImageListItem, Divider,
} from '@mui/material';
import { Close as CloseIcon, PictureAsPdf as PdfIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const API_BASE = 'https://supervision-back.vertigs.net';

const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:image')) return url; // base64 directo
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  return null;
};

// Mismo texto que se muestra en la app (AuditoriaScreen.js) — así el
// dashboard no muestra solo el código (SC-A1, COC-A2, etc.) sino la
// pregunta completa, entendible sin tener que memorizar los códigos.
const TEXTO_PREGUNTA = {
  'SC-A1': '¿Supervisa que los pedidos salgan completos, correctamente agendados y validados antes de ser entregados al cliente?',
  'SC-A2': '¿Gestiona y da solución oportuna a los reclamos, evitando clientes sin respuesta o casos sin seguimiento?',
  'SC-A3': '¿Aplican los protocolos de atención enfocados a subir el ticket promedio y mejorar la experiencia de nuestros clientes?',
  'COC-A1': '¿Pueden identificar una preparación que no cumple el estándar de calidad?',
  'COC-A2': '¿Cumple con la preparación del día (mise en place)?',
  'COC-A3': '¿Supervisan correctamente la conservación, rotulación, temperaturas, descongelación y manipulación de los alimentos?',
};

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
      <Typography variant="h3" fontWeight={800} sx={{ color: color || 'text.primary', mt: 0.75 }}>
        {value}
      </Typography>
      {sub && <Typography variant="body2" color="text.secondary" fontSize={13}>{sub}</Typography>}
    </Paper>
  );
}

export default function Auditorias() {
  const { user } = useAuth();
  const [auditorias, setAuditorias] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [detalle, setDetalle] = useState(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [filters, setFilters] = useState({ mes: '', localId: '', categoria: '' });
  const [locales, setLocales] = useState([]);

  useEffect(() => {
    api.get('/locales/activos').then(res => setLocales(res.data)).catch(() => setLocales([]));
  }, []);

  const cargar = async () => {
    setLoading(true);
    try {
      const params = { page: page + 1, limit: 20 };
      if (filters.mes) params.mes = filters.mes;
      if (filters.localId) params.localId = filters.localId;
      if (filters.categoria) params.categoria = filters.categoria;
      const { data } = await api.get('/auditorias', { params });
      setAuditorias(data.data || []);
      setTotal(data.total || 0);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { cargar(); }, [page, filters]);

  // KPIs simples calculados sobre la página actual + total general
  const promedio = auditorias.length > 0
    ? (auditorias.reduce((acc, a) => acc + (a.puntajeTotal || 0), 0) / auditorias.length).toFixed(1)
    : '—';
  const totalReclamos = auditorias.reduce((acc, a) => acc + (a.reclamos?.length || 0), 0);

  const verDetalle = async (id) => {
    try {
      const { data } = await api.get(`/auditorias/${id}`);
      setDetalle(data);
    } catch (e) {
      alert('No se pudo cargar el detalle de la auditoría');
    }
  };

  const eliminar = async (id) => {
    if (!window.confirm('¿Eliminar esta auditoría?')) return;
    try {
      await api.delete(`/auditorias/${id}`);
      cargar();
    } catch (e) {
      alert(e.response?.data?.error || 'No se pudo eliminar');
    }
  };

  const descargarPDF = async (id) => {
    setPdfLoading(true);
    try {
      const res = await api.get(`/auditorias/${id}/pdf`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_${id}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (e) {
      alert('No se pudo generar el PDF (esta parte todavía no está implementada en el backend)');
    } finally {
      setPdfLoading(false);
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Typography variant="h5" fontWeight={500}>Auditoría</Typography>
      <Typography variant="caption" color="text.secondary">Evaluaciones a revisiones ya finalizadas</Typography>

      <Grid container spacing={2} sx={{ my: 2, width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Auditorías (esta página)" value={auditorias.length} sub={`${total} en total`} color="#1976d2" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Promedio general" value={`${promedio}%`} color="#2e7d32" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Reclamos detectados" value={totalReclamos} color="#f57c00" />
        </Grid>
      </Grid>

      <Paper sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <TextField type="month" size="small" label="Mes" value={filters.mes}
          onChange={(e) => setFilters({ ...filters, mes: e.target.value })} InputLabelProps={{ shrink: true }} sx={{ width: 160 }} />
        <TextField select size="small" label="Local" value={filters.localId}
          onChange={(e) => setFilters({ ...filters, localId: e.target.value })} sx={{ width: 180 }}>
          <MenuItem value="">Todos</MenuItem>
          {locales.map(l => <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Categoría" value={filters.categoria}
          onChange={(e) => setFilters({ ...filters, categoria: e.target.value })} sx={{ width: 160 }}>
          <MenuItem value="">Todas</MenuItem>
          {Object.keys(CATEGORIA_COLOR).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <Button size="small" onClick={() => setFilters({ mes: '', localId: '', categoria: '' })}>Limpiar</Button>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 560 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Local</TableCell>
                  <TableCell>Fecha revisión</TableCell>
                  <TableCell>Supervisora</TableCell>
                  <TableCell>Fecha auditoría</TableCell>
                  <TableCell>Auditor</TableCell>
                  <TableCell align="center">SC</TableCell>
                  <TableCell align="center">Cocina</TableCell>
                  <TableCell align="center">Reclamos</TableCell>
                  <TableCell align="center">Total</TableCell>
                  <TableCell>Categoría</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {auditorias.map((a) => (
                  <TableRow key={a._id} hover>
                    <TableCell><b>{a.localNombre}</b></TableCell>
                    <TableCell>{new Date(a.fechaRevision).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>{a.supervisorNombre}</TableCell>
                    <TableCell>{new Date(a.fechaAuditoria).toLocaleDateString('es-CL')}</TableCell>
                    <TableCell>{a.auditorNombre}</TableCell>
                    <TableCell align="center">{a.puntajeServicioCliente}/30</TableCell>
                    <TableCell align="center">{a.puntajeCocina}/30</TableCell>
                    <TableCell align="center">{a.reclamos?.length || 0}</TableCell>
                    <TableCell align="center"><b>{a.puntajeTotal}%</b></TableCell>
                    <TableCell>
                      <Chip size="small" label={a.categoria} sx={{ bgcolor: colorCategoria(a.categoria), color: '#fff', fontWeight: 700 }} />
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" onClick={() => verDetalle(a._id)}>👁️</IconButton>
                      </Tooltip>
                      <Tooltip title="Descargar PDF">
                        <IconButton size="small" onClick={() => descargarPDF(a._id)}><PdfIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      {user?.rol === 'master' && (
                        <Tooltip title="Eliminar">
                          <IconButton size="small" color="error" onClick={() => eliminar(a._id)}><DeleteIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
                {auditorias.length === 0 && (
                  <TableRow><TableCell colSpan={11} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin auditorías para este filtro.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      {/* ─── Detalle de una auditoría (con fotos de reclamos) ─── */}
      <Dialog open={!!detalle} onClose={() => setDetalle(null)} maxWidth="md" fullWidth>
        {detalle && (
          <>
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: colorCategoria(detalle.categoria), color: '#fff' }}>
              <Box>
                <Typography variant="h6">{detalle.localNombre} — {detalle.puntajeTotal}% ({detalle.categoria})</Typography>
                <Typography variant="caption">Revisión del {new Date(detalle.fechaRevision).toLocaleDateString('es-CL')} · Auditado por {detalle.auditorNombre} el {new Date(detalle.fechaAuditoria).toLocaleDateString('es-CL')}</Typography>
              </Box>
              <IconButton onClick={() => setDetalle(null)} sx={{ color: '#fff' }}><CloseIcon /></IconButton>
            </DialogTitle>
            <DialogContent dividers>
              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                SERVICIO AL CLIENTE Y CAJA — {detalle.puntajeServicioCliente}/30
              </Typography>
              {(detalle.servicioCliente?.preguntas || []).map((p, i) => (
                <Box key={p.id} display="flex" justifyContent="space-between" alignItems="flex-start" py={0.75} gap={2}>
                  <Typography variant="body2" sx={{ flex: 1 }}>{TEXTO_PREGUNTA[p.id] || p.id}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{p.puntaje}/10</Typography>
                </Box>
              ))}
              {detalle.servicioCliente?.observacionSAC && (
                <Paper sx={{ p: 1.5, mt: 1, mb: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">OBSERVACIÓN SAC</Typography>
                  <Typography variant="body2">{detalle.servicioCliente.observacionSAC}</Typography>
                </Paper>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                COCINA — {detalle.puntajeCocina}/30
              </Typography>
              {(detalle.cocina?.preguntas || []).map((p) => (
                <Box key={p.id} display="flex" justifyContent="space-between" alignItems="flex-start" py={0.75} gap={2}>
                  <Typography variant="body2" sx={{ flex: 1 }}>{TEXTO_PREGUNTA[p.id] || p.id}</Typography>
                  <Typography variant="body2" fontWeight={700} sx={{ whiteSpace: 'nowrap' }}>{p.puntaje}/10</Typography>
                </Box>
              ))}
              {detalle.cocina?.observacionCocina && (
                <Paper sx={{ p: 1.5, mt: 1, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">OBSERVACIÓN COCINA</Typography>
                  <Typography variant="body2">{detalle.cocina.observacionCocina}</Typography>
                </Paper>
              )}
              {detalle.cocina?.observacionSupervision && (
                <Paper sx={{ p: 1.5, mt: 1, mb: 2, bgcolor: 'action.hover' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">OBSERVACIÓN SUPERVISIÓN</Typography>
                  <Typography variant="body2">{detalle.cocina.observacionSupervision}</Typography>
                </Paper>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" fontWeight={700} color="text.secondary" gutterBottom>
                RECLAMOS DE LA AUDITORÍA ({detalle.reclamos?.length || 0})
              </Typography>
              {(detalle.reclamos || []).map((r) => (
                <Paper key={r.id} sx={{ p: 1.5, mb: 1.5 }} variant="outlined">
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2" fontWeight={700} color="error">{r.tipo}</Typography>
                    <Chip size="small" label={r.entregoSolucion} sx={{ bgcolor: r.entregoSolucion !== 'NO' ? '#2e7d32' : '#c62828', color: '#fff' }} />
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    📞 {r.telefono} · {new Date(r.fecha).toLocaleDateString('es-CL')}
                    {r.montoCompensacion && r.montoCompensacion !== '0' ? ` · $${r.montoCompensacion}` : ''}
                  </Typography>
                  {r.comentario && <Typography variant="body2" sx={{ mt: 0.5 }}>{r.comentario}</Typography>}
                  {r.foto && (
                    <Box sx={{ mt: 1 }}>
                      <img src={getImageUrl(r.foto)} alt="Evidencia reclamo" style={{ maxWidth: 220, maxHeight: 220, borderRadius: 8, border: '1px solid #eee' }} />
                    </Box>
                  )}
                </Paper>
              ))}
              {(!detalle.reclamos || detalle.reclamos.length === 0) && (
                <Typography variant="body2" color="text.secondary">Sin reclamos registrados en esta auditoría.</Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => descargarPDF(detalle._id)} disabled={pdfLoading} startIcon={pdfLoading ? <CircularProgress size={16} /> : <PdfIcon />}>
                Descargar PDF
              </Button>
              <Button onClick={() => setDetalle(null)}>Cerrar</Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
