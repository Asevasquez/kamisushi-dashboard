import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, IconButton, Chip,
  CircularProgress, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, Alert, Grid,
} from '@mui/material';
import { Edit as EditIcon, Add as AddIcon } from '@mui/icons-material';
import api from '../services/api';

const emptyForm = { nombre: '', email: '', telefono: '', activo: true };

export default function Supervisores() {
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });

  useEffect(() => { cargarSupervisores(); }, []);

  const cargarSupervisores = async () => {
    try {
      const response = await api.get('/supervisores');
      setSupervisores(response.data);
    } catch (error) {
      console.error('Error cargando supervisores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAbrir = (sup = null) => {
    if (sup) {
      setFormData({ nombre: sup.nombre, email: sup.email, telefono: sup.telefono || '', activo: sup.activo });
      setEditingId(sup._id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    try {
      if (editingId) {
        // El backend de supervisores solo tiene GET, pero si se agrega PUT en el futuro:
        // await api.put(`/supervisores/${editingId}`, formData);
        // Por ahora actualizar vía usuarios si es necesario
        showMsg('Funcionalidad de edición en desarrollo');
      } else {
        // Crear supervisor + usuario vinculado desde /usuarios
        await api.post('/usuarios', {
          nombre: formData.nombre,
          email: formData.email,
          password: 'Supervisor123!', // contraseña temporal
          rol: 'supervisor',
        });
        showMsg('Supervisor creado. Contraseña temporal: Supervisor123!');
      }
      setDialogOpen(false);
      cargarSupervisores();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Error al guardar', 'error');
    }
  };

  const showMsg = (text, type = 'success') => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje({ text: '', type: 'success' }), 5000);
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>Gestión de Supervisores</Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#d32f2f' }} onClick={() => handleAbrir()}>
          Nuevo Supervisor
        </Button>
      </Box>

      {mensaje.text && <Alert severity={mensaje.type} sx={{ mb: 2 }}>{mensaje.text}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#d32f2f' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Teléfono</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Estado</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {supervisores.map((sup) => (
              <TableRow key={sup._id} hover>
                <TableCell><strong>{sup.nombre}</strong></TableCell>
                <TableCell>{sup.email}</TableCell>
                <TableCell>{sup.telefono || '—'}</TableCell>
                <TableCell>
                  <Chip label={sup.activo ? 'Activo' : 'Inactivo'} color={sup.activo ? 'success' : 'error'} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton size="small" color="primary" onClick={() => handleAbrir(sup)} title="Editar">
                    <EditIcon />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Supervisor' : 'Nuevo Supervisor'}</DialogTitle>
        <DialogContent>
          {!editingId && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Se creará un usuario con contraseña temporal: <strong>Supervisor123!</strong>
            </Alert>
          )}
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12}>
              <TextField fullWidth label="Nombre completo" value={formData.nombre}
                onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Email" type="email" value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Teléfono" value={formData.telefono}
                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" sx={{ bgcolor: '#d32f2f' }}>
            {editingId ? 'Guardar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
