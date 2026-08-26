import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, CircularProgress, Alert, IconButton,
} from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import api from '../services/api';

const emptyForm = { nombre: '', email: '', password: '', rol: 'supervisor' };

const ROL_COLORS = {
  master: 'error',
  gerencia: 'secondary',
  administrador: 'warning',
  supervisor: 'primary',
};

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [supervisores, setSupervisores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '' });
  const [formData, setFormData] = useState(emptyForm);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [usuariosRes, supervisoresRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/supervisores'),
      ]);
      setUsuarios(usuariosRes.data);
      setSupervisores(supervisoresRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCrearUsuario = async () => {
    try {
      await api.post('/usuarios', formData);
      showMsg('Usuario creado exitosamente');
      setDialogOpen(false);
      setFormData(emptyForm);
      cargarDatos();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Error al crear usuario', 'error');
    }
  };

  const handleEliminar = async () => {
    // El backend no tiene DELETE /usuarios, pero lo preparamos para cuando se agregue
    showMsg('Funcionalidad de eliminación no disponible en el backend aún', 'warning');
    setDeleteDialog({ open: false, id: null, nombre: '' });
  };

  const showMsg = (text, type = 'success') => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje({ text: '', type: 'success' }), 4000);
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" fontWeight={600}>Gestión de Usuarios</Typography>
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#d32f2f' }} onClick={() => setDialogOpen(true)}>
          Nuevo Usuario
        </Button>
      </Box>

      {mensaje.text && <Alert severity={mensaje.type} sx={{ mb: 2 }}>{mensaje.text}</Alert>}

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#d32f2f' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Nombre</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Email</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Rol</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Estado</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.map((u) => (
              <TableRow key={u._id} hover>
                <TableCell><strong>{u.nombre}</strong></TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip label={u.rol} color={ROL_COLORS[u.rol] || 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={u.activo ? 'Activo' : 'Inactivo'} color={u.activo ? 'success' : 'error'} size="small" />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small" color="error"
                    onClick={() => setDeleteDialog({ open: true, id: u._id, nombre: u.nombre })}
                    title="Eliminar"
                    disabled={u.rol === 'master'}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog crear usuario */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Nuevo Usuario</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nombre" margin="normal" value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          <TextField fullWidth label="Email" type="email" margin="normal" value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <TextField fullWidth label="Contraseña" type="password" margin="normal" value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
          <TextField select fullWidth label="Rol" margin="normal" value={formData.rol}
            onChange={(e) => setFormData({ ...formData, rol: e.target.value, supervisorId: '' })}>
            <MenuItem value="supervisor">Supervisor</MenuItem>
            <MenuItem value="administrador">Administrador</MenuItem>
            <MenuItem value="gerencia">Gerencia</MenuItem>
            <MenuItem value="master">Master</MenuItem>
          </TextField>
          {formData.rol === 'supervisor' && (
            <TextField select fullWidth label="Supervisor vinculado (opcional)" margin="normal"
              value={formData.supervisorId || ''}
              onChange={(e) => setFormData({ ...formData, supervisorId: e.target.value })}>
              <MenuItem value="">Sin vincular</MenuItem>
              {supervisores.map((s) => (
                <MenuItem key={s._id} value={s._id}>{s.nombre}</MenuItem>
              ))}
            </TextField>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleCrearUsuario} variant="contained" sx={{ bgcolor: '#d32f2f' }}
            disabled={!formData.nombre || !formData.email || !formData.password}>
            Crear
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog eliminar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nombre: '' })}>
        <DialogTitle>Confirmar Eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Eliminar al usuario <strong>{deleteDialog.nombre}</strong>?</Typography>
          <Typography variant="caption" color="error">Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, nombre: '' })}>Cancelar</Button>
          <Button onClick={handleEliminar} color="error" variant="contained">Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
