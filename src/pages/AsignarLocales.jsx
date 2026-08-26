import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  CircularProgress,
  Alert,
  Checkbox,
  FormControlLabel,
  FormGroup,
} from '@mui/material';
import { Assignment as AssignmentIcon, Save as SaveIcon } from '@mui/icons-material';
import api from '../services/api';

export default function AsignarLocales() {
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedLocales, setSelectedLocales] = useState([]);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });
  const [saving, setSaving] = useState(false);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      // Obtener usuarios (todos o solo administradores)
      const [usuariosRes, localesRes] = await Promise.all([
        api.get('/usuarios'),  // Obtener todos los usuarios
        api.get('/locales')
      ]);
      
      // Filtrar solo administradores y supervisores (pueden tener locales asignados)
      const usuariosFiltrados = usuariosRes.data.filter(
        u => u.rol === 'administrador' || u.rol === 'supervisor'
      );
      
      setUsuarios(usuariosFiltrados);
      setLocales(localesRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showMsg(error.response?.data?.error || 'Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirAsignacion = async (user) => {
    setSelectedUser(user);
    // Cargar locales actualmente asignados
    try {
      // Los locales asignados vienen en el objeto usuario
      const localesAsignados = user.localesAsignados?.map(l => l._id || l) || [];
      setSelectedLocales(localesAsignados);
      setDialogOpen(true);
    } catch (error) {
      console.error('Error:', error);
      showMsg('Error al cargar locales asignados', 'error');
    }
  };

  const handleToggleLocal = (localId) => {
    setSelectedLocales(prev => 
      prev.includes(localId)
        ? prev.filter(id => id !== localId)
        : [...prev, localId]
    );
  };

  const handleSelectAll = () => {
    if (selectedLocales.length === locales.length) {
      setSelectedLocales([]);
    } else {
      setSelectedLocales(locales.map(l => l._id));
    }
  };

  const handleGuardar = async () => {
    setSaving(true);
    try {
      await api.post(`/usuarios/${selectedUser._id}/asignar-locales`, {
        localesIds: selectedLocales
      });
      
      showMsg(`Locales asignados correctamente a ${selectedUser.nombre}`, 'success');
      setDialogOpen(false);
      
      // Recargar datos para actualizar la tabla
      await cargarDatos();
    } catch (error) {
      console.error('Error asignando locales:', error);
      showMsg(error.response?.data?.error || 'Error al asignar locales', 'error');
    } finally {
      setSaving(false);
    }
  };

  const showMsg = (text, type = 'success') => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje({ text: '', type: 'success' }), 3000);
  };

  // Obtener nombres de locales asignados
  const getLocalesNombres = (user) => {
    if (!user.localesAsignados || user.localesAsignados.length === 0) {
      return 'Sin locales asignados';
    }
    return user.localesAsignados.map(l => typeof l === 'object' ? l.nombre : l).join(', ');
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Asignación de Locales
      </Typography>
      <Typography variant="body2" color="textSecondary" gutterBottom>
        Administradores y Supervisores: selecciona los locales que cada usuario podrá supervisar
      </Typography>

      {mensaje.text && (
        <Alert severity={mensaje.type} sx={{ mb: 2 }} onClose={() => setMensaje({ text: '', type: 'success' })}>
          {mensaje.text}
        </Alert>
      )}

      {usuarios.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="textSecondary">
            No hay administradores o supervisores registrados.
            Crea usuarios con rol "administrador" o "supervisor" primero.
          </Typography>
        </Paper>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#d32f2f' }}>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Usuario</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Email</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Rol</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Locales Asignados</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {usuarios.map((user) => (
                <TableRow key={user._id} hover>
                  <TableCell>
                    <strong>{user.nombre}</strong>
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.rol} 
                      size="small" 
                      color={user.rol === 'administrador' ? 'warning' : 'primary'} 
                    />
                  </TableCell>
                  <TableCell>
                    {user.localesAsignados && user.localesAsignados.length > 0 ? (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {user.localesAsignados.map((local, idx) => {
                          const localNombre = typeof local === 'object' ? local.nombre : local;
                          return (
                            <Chip 
                              key={idx} 
                              label={localNombre} 
                              size="small" 
                              variant="outlined" 
                            />
                          );
                        })}
                      </Box>
                    ) : (
                      <Typography variant="caption" color="textSecondary">
                        Sin locales asignados
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="small"
                      variant="outlined"
                      startIcon={<AssignmentIcon />}
                      onClick={() => abrirAsignacion(user)}
                      sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                    >
                      Asignar Locales
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Diálogo de asignación */}
      <Dialog 
        open={dialogOpen} 
        onClose={() => !saving && setDialogOpen(false)} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: '#fff' }}>
          Asignar Locales a {selectedUser?.nombre}
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Typography variant="body2" color="textSecondary" gutterBottom>
            Selecciona los locales que este usuario podrá supervisar:
          </Typography>
          
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedLocales.length === locales.length && locales.length > 0}
                indeterminate={selectedLocales.length > 0 && selectedLocales.length < locales.length}
                onChange={handleSelectAll}
              />
            }
            label="Seleccionar todos los locales"
            sx={{ mb: 2 }}
          />
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2, maxHeight: 400, overflow: 'auto' }}>
            {locales.map((local) => (
              <Chip
                key={local._id}
                label={local.nombre}
                onClick={() => handleToggleLocal(local._id)}
                color={selectedLocales.includes(local._id) ? 'primary' : 'default'}
                sx={{ 
                  cursor: 'pointer',
                  '&:hover': { opacity: 0.8 },
                  bgcolor: selectedLocales.includes(local._id) ? '#d32f2f' : undefined,
                  color: selectedLocales.includes(local._id) ? '#fff' : undefined,
                }}
              />
            ))}
          </Box>
          
          {locales.length === 0 && (
            <Typography color="error" sx={{ mt: 2 }}>
              No hay locales registrados. Crea locales primero.
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleGuardar} 
            variant="contained" 
            disabled={saving}
            sx={{ bgcolor: '#d32f2f' }}
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
          >
            {saving ? 'Guardando...' : 'Guardar Asignación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}