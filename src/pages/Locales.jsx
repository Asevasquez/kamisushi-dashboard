import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, IconButton, Chip,
  CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Grid,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import api from '../services/api';

const emptyForm = { nombre: '', direccion: '', ciudad: '', activo: true, codigoExterno: '' };

export default function Locales() {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });
  const [errorDialogo, setErrorDialogo] = useState('');
  const [intentoGuardar, setIntentoGuardar] = useState(false);
  const [guardando, setGuardando] = useState(false);

  useEffect(() => { cargarLocales(); }, []);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/locales');
      setLocales(response.data);
    } catch (error) {
      console.error('Error cargando locales:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrir = (local = null) => {
    if (local) {
      setFormData({ nombre: local.nombre, direccion: local.direccion, ciudad: local.ciudad, activo: local.activo, codigoExterno: local.codigoExterno || '' });
      setEditingId(local._id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setErrorDialogo('');
    setIntentoGuardar(false);
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    const datos = {
      ...formData,
      nombre: formData.nombre.trim(),
      direccion: formData.direccion.trim(),
      ciudad: formData.ciudad.trim(),
      codigoExterno: (formData.codigoExterno || '').trim(),
    };
    const faltan = [['nombre', 'nombre'], ['direccion', 'dirección'], ['ciudad', 'ciudad']]
      .filter(([campo]) => !datos[campo]).map(([, etiqueta]) => etiqueta);
    setIntentoGuardar(true);
    if (faltan.length > 0) {
      setErrorDialogo(`Completa ${faltan.length > 1 ? 'los campos' : 'el campo'}: ${faltan.join(', ')}.`);
      return;
    }
    setErrorDialogo('');
    setGuardando(true);
    try {
      if (editingId) {
        await api.put(`/locales/${editingId}`, datos);
        showMsg('Local actualizado correctamente');
      } else {
        await api.post('/locales', datos);
        showMsg('Local creado correctamente');
      }
      setDialogOpen(false);
      cargarLocales();
    } catch (error) {
      // El mensaje va DENTRO del diálogo: el aviso de la página queda tapado por el diálogo abierto.
      setErrorDialogo(error.response?.data?.error || 'No se pudo guardar el local. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    try {
      await api.delete(`/locales/${deleteDialog.id}`);
      showMsg('Local eliminado');
      setDeleteDialog({ open: false, id: null });
      cargarLocales();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Error al eliminar', 'error');
    }
  };

  const showMsg = (text, type = 'success') => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje({ text: '', type: 'success' }), 3000);
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>Gestión de Locales</Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#f20000' }} onClick={() => handleAbrir()}>
          Nuevo Local
        </Button>
      </Box>

      {mensaje.text && <Alert severity={mensaje.type} sx={{ mb: 2 }}>{mensaje.text}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f20000' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Código</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Dirección</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Ciudad</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Estado</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {locales.map((local) => (
              <TableRow key={local._id} hover>
                <TableCell fontWeight={600}><strong>{local.nombre}</strong></TableCell>
                <TableCell>{local.codigoExterno || <Typography variant="caption" color="text.secondary">—</Typography>}</TableCell>
                <TableCell>{local.direccion}</TableCell>
                <TableCell>{local.ciudad}</TableCell>
                <TableCell>
                  <Chip label={local.activo ? 'Activo' : 'Inactivo'} color={local.activo ? 'success' : 'error'} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => handleAbrir(local)} title="Editar">
                    <EditIcon />
                  </IconButton>
                  <IconButton size="small" color="error" onClick={() => setDeleteDialog({ open: true, id: local._id })} title="Eliminar">
                    <DeleteIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Local' : 'Nuevo Local'}</DialogTitle>
        <DialogContent>
          {errorDialogo && <Alert severity="error" sx={{ mb: 2 }}>{errorDialogo}</Alert>}
          <Box sx={{ display: 'grid', gap: 2, mt: 0.5, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
            <TextField required fullWidth label="Nombre" value={formData.nombre} sx={{ gridColumn: '1 / -1' }}
              error={intentoGuardar && !formData.nombre.trim()}
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            <TextField fullWidth label="Código (opcional)" value={formData.codigoExterno} sx={{ gridColumn: '1 / -1' }}
              helperText="Código del local en otro sistema (franquicias, POS, etc.), si aplica"
              onChange={(e) => setFormData({ ...formData, codigoExterno: e.target.value })} />
            <TextField required fullWidth label="Dirección" value={formData.direccion} sx={{ gridColumn: '1 / -1' }}
              error={intentoGuardar && !formData.direccion.trim()}
              onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
            <TextField required fullWidth label="Ciudad" value={formData.ciudad}
              error={intentoGuardar && !formData.ciudad.trim()}
              onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })} />
            <TextField select fullWidth label="Estado" value={String(formData.activo)} SelectProps={{ native: true }}
              onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}>
              <option value="true">Activo</option>
              <option value="false">Inactivo</option>
            </TextField>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" sx={{ bgcolor: '#f20000' }} disabled={guardando}>
            {guardando ? 'Guardando…' : editingId ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null })}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Estás seguro que deseas eliminar este local?</Typography>
          <Typography variant="caption" color="error">Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null })}>Cancelar</Button>
          <Button onClick={handleEliminar} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
