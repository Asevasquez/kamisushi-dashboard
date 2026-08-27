import React, { useState, useEffect } from 'react';
import {
  Box, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, Typography, Button, Dialog, DialogTitle,
  DialogContent, DialogActions, Chip, CircularProgress, Alert,
  Grid, Card, CardContent, Checkbox, FormControlLabel,
  Divider, Tooltip, Avatar,
} from '@mui/material';
import {
  Assignment as AssignmentIcon,
  Store as StoreIcon,
  CheckCircle as CheckIcon,
} from '@mui/icons-material';
import api from '../services/api';

const ROL_COLORS = {
  supervisor: '#2196f3',
  administrador: '#f59e0b',
  gerencia: '#7c3aed',
};

export default function AsignarLocales() {
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [selectedLocales, setSelectedLocales] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [usuariosRes, localesRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/locales'),
      ]);
      // Mostrar supervisores y administradores (los que pueden tener locales asignados)
      const filtrados = usuariosRes.data.filter(u =>
        ['supervisor', 'administrador'].includes(u.rol) && u.activo
      );
      setUsuarios(filtrados);
      setLocales(localesRes.data);
    } catch (error) {
      console.error('Error cargando datos:', error);
      showMsg('Error al cargar datos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const abrirAsignacion = async (usuario) => {
    setSelectedUsuario(usuario);
    try {
      const response = await api.get(`/usuarios/${usuario._id}/locales`);
      setSelectedLocales(response.data.map(l => l._id || l));
      setDialogOpen(true);
    } catch (error) {
      console.error('Error cargando locales asignados:', error);
      setSelectedLocales([]);
      setDialogOpen(true);
    }
  };

  const toggleLocal = (localId) => {
    setSelectedLocales(prev =>
      prev.includes(localId)
        ? prev.filter(id => id !== localId)
        : [...prev, localId]
    );
  };

  const seleccionarTodos = () => {
    if (selectedLocales.length === locales.length) {
      setSelectedLocales([]);
    } else {
      setSelectedLocales(locales.map(l => l._id));
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      await api.post(`/usuarios/${selectedUsuario._id}/asignar-locales`, {
        localesIds: selectedLocales,
      });
      showMsg(`Locales asignados correctamente a ${selectedUsuario.nombre}`);
      setDialogOpen(false);
      cargarDatos();
    } catch (error) {
      showMsg(error.response?.data?.error || 'Error al asignar locales', 'error');
    } finally {
      setGuardando(false);
    }
  };

  const showMsg = (text, type = 'success') => {
    setMensaje({ text, type });
    setTimeout(() => setMensaje({ text: '', type: 'success' }), 4000);
  };

  const getLocalesAsignados = (usuario) => {
    // Intentar obtener localesAsignados del usuario directamente
    return usuario.localesAsignados?.length || 0;
  };

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} mb={1}>Asignar Locales</Typography>
      <Typography variant="body2" color="textSecondary" mb={3}>
        Asigna uno o más locales a supervisores y administradores para que puedan gestionar sus revisiones.
      </Typography>

      {mensaje.text && <Alert severity={mensaje.type} sx={{ mb: 2 }}>{mensaje.text}</Alert>}

      {/* Resumen rápido */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#fff5f5', border: '1px solid #ffcdd2' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="textSecondary">Total usuarios</Typography>
              <Typography variant="h5" fontWeight={700} color="#d32f2f">{usuarios.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#f5f8ff', border: '1px solid #bbdefb' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="textSecondary">Total locales</Typography>
              <Typography variant="h5" fontWeight={700} color="#2196f3">{locales.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#f5fff5', border: '1px solid #c8e6c9' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" color="textSecondary">Con asignación</Typography>
              <Typography variant="h5" fontWeight={700} color="#4caf50">
                {usuarios.filter(u => u.localesAsignados?.length > 0).length}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#d32f2f' }}>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Usuario</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Rol</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Locales Asignados</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {usuarios.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.secondary' }}>
                  No hay supervisores ni administradores activos
                </TableCell>
              </TableRow>
            ) : (
              usuarios.map((usuario) => {
                const localesAsignados = usuario.localesAsignados || [];
                return (
                  <TableRow key={usuario._id} hover>
                    <TableCell>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Avatar sx={{ width: 32, height: 32, bgcolor: ROL_COLORS[usuario.rol] || '#999', fontSize: 13 }}>
                          {usuario.nombre?.[0]?.toUpperCase()}
                        </Avatar>
                        <Box>
                          <Typography variant="body2" fontWeight={600}>{usuario.nombre}</Typography>
                          <Typography variant="caption" color="textSecondary">{usuario.email}</Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={usuario.rol} size="small"
                        sx={{ bgcolor: ROL_COLORS[usuario.rol], color: '#fff', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      {localesAsignados.length === 0 ? (
                        <Typography variant="caption" color="textSecondary">Sin asignación</Typography>
                      ) : (
                        <Box display="flex" flexWrap="wrap" gap={0.5}>
                          {localesAsignados.slice(0, 3).map((local, i) => (
                            <Chip key={i} label={local.nombre || local}
                              size="small" variant="outlined" color="primary" />
                          ))}
                          {localesAsignados.length > 3 && (
                            <Chip label={`+${localesAsignados.length - 3} más`} size="small" />
                          )}
                        </Box>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outlined"
                        size="small"
                        startIcon={<AssignmentIcon />}
                        onClick={() => abrirAsignacion(usuario)}
                        sx={{ borderColor: '#d32f2f', color: '#d32f2f' }}
                      >
                        Asignar Locales
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Dialog asignación */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ bgcolor: '#d32f2f', color: '#fff' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <StoreIcon />
            <Box>
              <Typography variant="h6">Asignar Locales</Typography>
              <Typography variant="caption" sx={{ opacity: 0.85 }}>
                {selectedUsuario?.nombre} — {selectedUsuario?.rol}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Typography variant="body2" color="textSecondary">
              {selectedLocales.length} de {locales.length} locales seleccionados
            </Typography>
            <Button size="small" onClick={seleccionarTodos} variant="outlined" sx={{ fontSize: 11 }}>
              {selectedLocales.length === locales.length ? 'Deseleccionar todos' : 'Seleccionar todos'}
            </Button>
          </Box>
          <Divider sx={{ mb: 2 }} />
          <Grid container spacing={1}>
            {locales.map((local) => {
              const asignado = selectedLocales.includes(local._id);
              return (
                <Grid item xs={12} sm={6} key={local._id}>
                  <Paper
                    variant="outlined"
                    onClick={() => toggleLocal(local._id)}
                    sx={{
                      p: 1.5, cursor: 'pointer',
                      borderColor: asignado ? '#d32f2f' : '#e0e0e0',
                      bgcolor: asignado ? '#fff5f5' : 'white',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#d32f2f', bgcolor: '#fff5f5' },
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Checkbox
                        checked={asignado}
                        size="small"
                        sx={{ p: 0, color: '#d32f2f', '&.Mui-checked': { color: '#d32f2f' } }}
                        onChange={() => toggleLocal(local._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>{local.nombre}</Typography>
                        {local.ciudad && (
                          <Typography variant="caption" color="textSecondary">{local.ciudad}</Typography>
                        )}
                      </Box>
                      {asignado && <CheckIcon fontSize="small" sx={{ color: '#d32f2f' }} />}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" sx={{ bgcolor: '#d32f2f' }}
            disabled={guardando}>
            {guardando ? <CircularProgress size={20} color="inherit" /> : 'Guardar Asignación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
