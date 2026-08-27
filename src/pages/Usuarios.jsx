import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField,
  MenuItem, CircularProgress, Alert, IconButton, Tooltip,
  Switch, FormControlLabel, Divider,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
} from '@mui/icons-material';
import api from '../services/api';

const emptyForm = { nombre: '', email: '', password: '', rol: 'supervisor', supervisorId: '', activo: true };

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
  const [editingId, setEditingId] = useState(null);
  const [deleteDialog, setDeleteDialog] = useState({ open: false, id: null, nombre: '' });
  const [formData, setFormData] = useState(emptyForm);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });
  const [guardando, setGuardando] = useState(false);

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
      showMsg('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAbrir = (usuario = null) => {
    if (usuario) {
      setFormData({
        nombre: usuario.nombre,
        email: usuario.email,
        password: '',
        rol: usuario.rol,
        supervisorId: usuario.supervisorId || '',
        activo: usuario.activo,
      });
      setEditingId(usuario._id);
    } else {
      setFormData(emptyForm);
      setEditingId(null);
    }
    setDialogOpen(true);
  };

  const handleGuardar = async () => {
    if (!formData.nombre || !formData.email) {
      showMsg('Nombre y email son requeridos', 'error');
      return;
    }
    if (!editingId && !formData.password) {
      showMsg('La contraseña es requerida para nuevos usuarios', 'error');
      return;
    }

    setGuardando(true);
    try {
      const datos = { ...formData };
      // Si editando y no cambió contraseña, no enviarla
      if (editingId && !datos.password.trim()) {
        delete datos.password;
      }

      if (editingId) {
        await api.put(`/usuarios/${editingId}`, datos);
        showMsg('Usuario actualizado correctamente');
      } else {
        await api.post('/usuarios', datos);
        showMsg('Usuario creado exitosamente');
      }
      setDialogOpen(false);
      setFormData(emptyForm);
      setEditingId(null);
      cargarDatos();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Error al guardar', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async () => {
    try {
      await api.delete(`/usuarios/${deleteDialog.id}`);
      showMsg('Usuario desactivado correctamente');
      setDeleteDialog({ open: false, id: null, nombre: '' });
      cargarDatos();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Error al eliminar', 'error');
      setDeleteDialog({ open: false, id: null, nombre: '' });
    }
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
        <Button variant="contained" startIcon={<AddIcon />} sx={{ bgcolor: '#d32f2f' }}
          onClick={() => handleAbrir()}>
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
              <TableRow key={u._id} hover sx={{ opacity: u.activo ? 1 : 0.5 }}>
                <TableCell><strong>{u.nombre}</strong></TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <Chip label={u.rol} color={ROL_COLORS[u.rol] || 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={u.activo ? 'Activo' : 'Inactivo'}
                    color={u.activo ? 'success' : 'error'} size="small" />
                </TableCell>
                <TableCell>
                  <Tooltip title="Editar">
                    <IconButton size="small" color="primary" onClick={() => handleAbrir(u)}
                      disabled={u.rol === 'master'}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={u.activo ? 'Desactivar' : 'Ya desactivado'}>
                    <span>
                      <IconButton size="small" color="error"
                        onClick={() => setDeleteDialog({ open: true, id: u._id, nombre: u.nombre })}
                        disabled={u.rol === 'master' || !u.activo}>
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog crear/editar */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Editar Usuario' : 'Crear Nuevo Usuario'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="Nombre completo" margin="normal" value={formData.nombre}
            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })} />
          <TextField fullWidth label="Email" type="email" margin="normal" value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          <TextField fullWidth
            label={editingId ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña'}
            type="password" margin="normal" value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            helperText={editingId ? 'Solo completa si deseas cambiar la contraseña' : 'Mínimo 6 caracteres'} />
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
          {editingId && (
            <FormControlLabel
              control={
                <Switch checked={formData.activo}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })} />
              }
              label={formData.activo ? 'Usuario activo' : 'Usuario inactivo'}
              sx={{ mt: 1 }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" sx={{ bgcolor: '#d32f2f' }}
            disabled={guardando || !formData.nombre || !formData.email}>
            {guardando ? <CircularProgress size={20} color="inherit" /> : editingId ? 'Actualizar' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog desactivar */}
      <Dialog open={deleteDialog.open} onClose={() => setDeleteDialog({ open: false, id: null, nombre: '' })}>
        <DialogTitle>Confirmar Desactivación</DialogTitle>
        <DialogContent>
          <Typography>¿Desactivar al usuario <strong>{deleteDialog.nombre}</strong>?</Typography>
          <Typography variant="caption" color="textSecondary" display="block" mt={1}>
            El usuario no podrá iniciar sesión pero su historial de revisiones se conserva.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialog({ open: false, id: null, nombre: '' })}>Cancelar</Button>
          <Button onClick={handleEliminar} color="error" variant="contained">Desactivar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
