import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, Chip, IconButton,
  TextField, MenuItem, Grid, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Typography, CircularProgress,
  Divider,
} from '@mui/material';
import {
  Delete as DeleteIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { es } from 'date-fns/locale';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const getCategoriaColor = (categoria) => {
  const map = {
    'EXCELENTE': 'success',
    'MUY BUENO': 'success',
    'BUENO': 'primary',
    'REGULAR': 'warning',
    'MALO': 'error',
    'PÉSIMO': 'error',
  };
  return map[categoria] || 'default';
};

export default function Revisiones() {
  const [revisiones, setRevisiones] = useState([]);
  const [locales, setLocales] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    localId: '',
    supervisorId: '',
    fechaInicio: null,
    fechaFin: null,
  });
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [detailDialog, setDetailDialog] = useState({ open: false, revision: null });
  const { user } = useAuth();

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadRevisiones();
  }, [filters]);

  const loadData = async () => {
    try {
      const promises = [api.get('/locales/activos')];
      if (user?.rol === 'master' || user?.rol === 'gerencia') {
        promises.push(api.get('/supervisores'));
      }
      const results = await Promise.all(promises);
      setLocales(results[0].data);
      if (results[1]) setSupervisores(results[1].data);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  };

  const loadRevisiones = async () => {
    setLoading(true);
    try {
      const response = await api.get('/revisiones');
      let data = response.data;

      // Filtrar en cliente
      if (filters.localId) {
        data = data.filter(r => r.localId === filters.localId || r.localId?._id === filters.localId);
      }
      if (filters.supervisorId) {
        data = data.filter(r => r.supervisorId === filters.supervisorId || r.supervisorId?._id === filters.supervisorId);
      }
      if (filters.fechaInicio) {
        data = data.filter(r => new Date(r.fechaRevision) >= filters.fechaInicio);
      }
      if (filters.fechaFin) {
        data = data.filter(r => new Date(r.fechaRevision) <= filters.fechaFin);
      }

      setRevisiones(data);
    } catch (error) {
      console.error('Error loading revisiones:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleVerDetalle = async (id) => {
    try {
      const response = await api.get(`/revisiones/${id}`);
      setDetailDialog({ open: true, revision: response.data });
    } catch (error) {
      console.error('Error cargando detalle:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/revisiones/${deleteDialog.id}`);
      loadRevisiones();
      setDeleteDialog({ open: false, id: null });
    } catch (error) {
      console.error('Error deleting revision:', error);
    }
  };

  const getNombreLocal = (revision) => {
    // El backend devuelve localNombre en el detalle
    if (revision.localNombre) return revision.localNombre;
    const local = locales.find(l => l._id === revision.localId);
    return local?.nombre || revision.localId || '—';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom fontWeight={600}>
        Revisiones
      </Typography>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <LocalizationProvider dateAdapter={AdapterDateFns} adapterLocale={es}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={6} md={3}>
              <TextField
                select fullWidth label="Local" size="small"
                value={filters.localId}
                onChange={(e) => setFilters({ ...filters, localId: e.target.value })}
              >
                <MenuItem value="">Todos los locales</MenuItem>
                {locales.map((local) => (
                  <MenuItem key={local._id} value={local._id}>{local.nombre}</MenuItem>
                ))}
              </TextField>
            </Grid>
            {(user?.rol === 'master' || user?.rol === 'gerencia') && (
              <Grid item xs={12} sm={6} md={3}>
                <TextField
                  select fullWidth label="Supervisor" size="small"
                  value={filters.supervisorId}
                  onChange={(e) => setFilters({ ...filters, supervisorId: e.target.value })}
                >
                  <MenuItem value="">Todos los supervisores</MenuItem>
                  {supervisores.map((sup) => (
                    <MenuItem key={sup._id} value={sup._id}>{sup.nombre}</MenuItem>
                  ))}
                </TextField>
              </Grid>
            )}
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Desde" value={filters.fechaInicio}
                onChange={(date) => setFilters({ ...filters, fechaInicio: date })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <DatePicker
                label="Hasta" value={filters.fechaFin}
                onChange={(date) => setFilters({ ...filters, fechaFin: date })}
                slotProps={{ textField: { fullWidth: true, size: 'small' } }}
              />
            </Grid>
            <Grid item xs={12} sm={6} md={2}>
              <Button variant="outlined" fullWidth onClick={() => setFilters({
                localId: '', supervisorId: '', fechaInicio: null, fechaFin: null,
              })}>
                Limpiar
              </Button>
            </Grid>
          </Grid>
        </LocalizationProvider>
      </Paper>

      {/* Tabla */}
      {loading ? (
        <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
      ) : (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ backgroundColor: '#d32f2f' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Local</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Supervisor</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Fecha</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Porcentaje</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Categoría</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Tipo</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Acciones</TableCell>
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
                revisiones
                  .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                  .map((revision) => (
                    <TableRow key={revision._id} hover>
                      <TableCell>{getNombreLocal(revision)}</TableCell>
                      <TableCell>{revision.supervisorNombre || '—'}</TableCell>
                      <TableCell>
                        {new Date(revision.fechaRevision).toLocaleDateString('es-CL')}
                      </TableCell>
                      <TableCell>
                        <strong>{revision.porcentajeTotal?.toFixed(1) || 0}%</strong>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={revision.categoria || '—'}
                          color={getCategoriaColor(revision.categoria)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {revision.esBorrador ? (
                          <Chip label="Borrador" size="small" variant="outlined" color="warning" />
                        ) : (
                          <Chip label="Final" size="small" variant="outlined" color="success" />
                        )}
                      </TableCell>
                      <TableCell>
                        <IconButton
                          size="small" color="primary"
                          onClick={() => handleVerDetalle(revision._id)}
                          title="Ver detalle"
                        >
                          <ViewIcon fontSize="small" />
                        </IconButton>
                        {(user?.rol === 'master') && (
                          <IconButton
                            size="small" color="error"
                            onClick={() => setDeleteDialog({ open: true, id: revision._id })}
                            title="Eliminar"
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={revisiones.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(e, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            labelRowsPerPage="Filas por página"
          />
        </TableContainer>
      )}

      {/* Dialog: Detalle de Revisión */}
      <Dialog open={detailDialog.open} onClose={() => setDetailDialog({ open: false, revision: null })} maxWidth="md" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: '#fff' }}>
          Detalle de Revisión — {detailDialog.revision?.localNombre || ''}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          {detailDialog.revision && (
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Local</Typography>
                <Typography fontWeight={600}>{detailDialog.revision.localNombre || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Supervisor</Typography>
                <Typography fontWeight={600}>{detailDialog.revision.supervisorNombre || '—'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Fecha de Revisión</Typography>
                <Typography>{new Date(detailDialog.revision.fechaRevision).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' })}</Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="textSecondary">Porcentaje Total</Typography>
                <Typography variant="h5" fontWeight={700} color="primary">
                  {detailDialog.revision.porcentajeTotal?.toFixed(1)}%
                </Typography>
              </Grid>
              <Grid item xs={12} sm={3}>
                <Typography variant="caption" color="textSecondary">Categoría</Typography>
                <Box mt={0.5}>
                  <Chip
                    label={detailDialog.revision.categoria || '—'}
                    color={getCategoriaColor(detailDialog.revision.categoria)}
                  />
                </Box>
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Administrador</Typography>
                <Typography>{detailDialog.revision.administrador?.nombre || '—'} {detailDialog.revision.administrador?.presente ? '✅ Presente' : '❌ Ausente'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Sub-Administrador</Typography>
                <Typography>{detailDialog.revision.subAdministrador?.nombre || '—'} {detailDialog.revision.subAdministrador?.presente ? '✅ Presente' : '❌ Ausente'}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">¿Borran Reclamos?</Typography>
                <Typography>{detailDialog.revision.borranReclamos || '—'}</Typography>
              </Grid>

              <Grid item xs={12}><Divider /></Grid>

              {/* Secciones */}
              {[
                { key: 'servicioCliente', label: 'Servicio al Cliente' },
                { key: 'cuartoFrio', label: 'Cuarto Frío' },
                { key: 'cuartoCaliente', label: 'Cuarto Caliente' },
              ].map(({ key, label }) => {
                const seccion = detailDialog.revision[key];
                const respuestas = seccion?.respuestas || {};
                const total = Object.keys(respuestas).length;
                const cumplidos = Object.values(respuestas).filter(r => r.cumple).length;
                return (
                  <Grid item xs={12} sm={4} key={key}>
                    <Paper variant="outlined" sx={{ p: 1.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
                      <Typography variant="body2" color="textSecondary">
                        {cumplidos}/{total} ítems cumplidos
                      </Typography>
                      {total > 0 && (
                        <Typography variant="h6" color={cumplidos / total >= 0.8 ? 'success.main' : 'error.main'}>
                          {((cumplidos / total) * 100).toFixed(0)}%
                        </Typography>
                      )}
                    </Paper>
                  </Grid>
                );
              })}

              {detailDialog.revision.comentariosGenerales && (
                <Grid item xs={12}>
                  <Typography variant="caption" color="textSecondary">Comentarios Generales</Typography>
                  <Typography sx={{ mt: 0.5, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 1 }}>
                    {detailDialog.revision.comentariosGenerales}
                  </Typography>
                </Grid>
              )}

              <Grid item xs={12}><Divider /></Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Creado por</Typography>
                <Typography variant="body2">{detailDialog.revision.creadoPor || '—'} · {detailDialog.revision.creadoEn ? new Date(detailDialog.revision.creadoEn).toLocaleDateString('es-CL') : ''}</Typography>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Typography variant="caption" color="textSecondary">Última modificación</Typography>
                <Typography variant="body2">{detailDialog.revision.modificadoPor || '—'} · {detailDialog.revision.modificadoEn ? new Date(detailDialog.revision.modificadoEn).toLocaleDateString('es-CL') : ''}</Typography>
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailDialog({ open: false, revision: null })}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog: Confirmar eliminación */}
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
