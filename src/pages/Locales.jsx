import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, IconButton, Chip,
  CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Grid,
} from '@mui/material';
import { Edit as EditIcon, Delete as DeleteIcon, Add as AddIcon } from '@mui/icons-material';
import api from '../services/api';

const emptyForm = { nombre: '', direccion: '', ciudad: '', activo: true };

export default function Locales() {
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null });
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });

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
      setFormData({ nombre: local.nombre, direccion: local.direccion, ciudad: local.ciudad, activo: local.activo });
      setEditingId(local._id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    try {
      if (editingId) {
        await api.put(`/locales/${editingId}`, formData);
        showMsg('Local actualizado correctamente');
      } else {
        await api.post('/locales', formData);
        showMsg('Local creado correctamente');
      }
      setDialogOpen(false);
      cargarLocales();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Error al guardar', 'error');
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
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#d32f2f' }} onClick={() => handleAbrir()}>
          Nuevo Local
        </Button>
      </Box>

      {mensaje.text && <Alert severity={mensaje.type} sx={{ mb: 2 }}>{mensaje.text}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#d32f2f' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Nombre</TableCell>
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
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Dirección" value={formData.direccion}
                onChange={(e) => setFormData({ ...formData, direccion: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="Ciudad" value={formData.ciudad}
                onChange={(e) => setFormData({ ...formData, ciudad: e.target.value })} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField select fullWidth label="Estado" value={formData.activo}
                onChange={(e) => setFormData({ ...formData, activo: e.target.value === 'true' })}>
                <option value="true">Activo</option>
                <option value="false">Inactivo</option>
              </TextField>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" sx={{ bgcolor: '#d32f2f' }}>
            {editingId ? 'Actualizar' : 'Crear'}
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
