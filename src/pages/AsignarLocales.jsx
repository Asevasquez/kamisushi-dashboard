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
  School as SchoolIcon,
} from '@mui/icons-material';
import api from '../services/api';

const ROL_COLORS = {
  supervisor: '#2196f3',
  administrador: '#f59e0b',
  gerencia: '#7c3aed',
  supervisorinterno: '#0288d1',
  mentor: '#6d4c41',
};

// Un mentor no puede mentorear y administrar el mismo local: los de la otra lista aparecen bloqueados.
const idsDe = (lista) => new Set((lista || []).map(l => String(l._id || l)));
const bloqueadosPara = (usuario, modo) => {
  if (!usuario || usuario.rol !== 'mentor') return new Set();
  return modo === 'administrados' ? idsDe(usuario.localesAsignados) : idsDe(usuario.localesAdministrados);
};

export default function AsignarLocales() {
  const [usuarios, setUsuarios] = useState([]);
  const [locales, setLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedUsuario, setSelectedUsuario] = useState(null);
  const [selectedLocales, setSelectedLocales] = useState([]);
  // 'asignados' = lista de siempre (locales que administra/supervisa; en el mentor, los que mentorea)
  // 'administrados' = solo mentores: locales en que además es administrador
  const [modoDialogo, setModoDialogo] = useState('asignados');
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState({ text: '', type: 'success' });

  useEffect(() => { cargarDatos(); }, []);

  const cargarDatos = async () => {
    try {
      const [usuariosRes, localesRes] = await Promise.all([
        api.get('/usuarios'),
        api.get('/locales'),
      ]);
      // Roles que pueden tener locales asignados (el mentor solo ve y evalúa los suyos en Mentorías)
      const filtrados = usuariosRes.data.filter(u =>
        ['supervisor', 'administrador', 'supervisorinterno', 'mentor'].includes(u.rol) && u.activo
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

  const abrirAsignacion = async (usuario, modo = 'asignados') => {
    setSelectedUsuario(usuario);
    setModoDialogo(modo);
    try {
      const url = modo === 'administrados' ? `/compromisos/administrados/${usuario._id}` : `/usuarios/${usuario._id}/locales`;
      const response = await api.get(url);
      const ids = response.data.map(l => l._id || l);
      const bloqueadosAhora = bloqueadosPara(usuario, modo);
      setSelectedLocales(ids.filter(id => !bloqueadosAhora.has(String(id))));
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

  const bloqueados = bloqueadosPara(selectedUsuario, modoDialogo);
  const seleccionables = locales.filter(l => !bloqueados.has(String(l._id)));
  const tituloDialogo = modoDialogo === 'administrados'
    ? 'Locales en que es administrador'
    : (selectedUsuario?.rol === 'mentor' ? 'Locales que mentorea' : 'Asignar Locales');

  const seleccionarTodos = () => {
    if (selectedLocales.length === seleccionables.length) {
      setSelectedLocales([]);
    } else {
      setSelectedLocales(seleccionables.map(l => l._id));
    }
  };

  const handleGuardar = async () => {
    setGuardando(true);
    try {
      if (modoDialogo === 'administrados') {
        await api.put(`/compromisos/administrados/${selectedUsuario._id}`, { localesIds: selectedLocales });
        showMsg(`Locales en que es administrador actualizados para ${selectedUsuario.nombre}`);
      } else {
        await api.post(`/usuarios/${selectedUsuario._id}/asignar-locales`, {
          localesIds: selectedLocales,
        });
        showMsg(`Locales asignados correctamente a ${selectedUsuario.nombre}`);
      }
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
        Asigna uno o más locales a supervisores, administradores y mentores para que puedan gestionar sus revisiones y mentorías.
        A los mentores se les indican dos listas: los locales que mentorean y los locales en que son administradores (donde suben la evidencia de los compromisos).
      </Typography>

      {mensaje.text && <Alert severity={mensaje.type} sx={{ mb: 2 }}>{mensaje.text}</Alert>}

      {/* Resumen rápido */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#fff5f5', border: '1px solid #ffcdd2' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#6b4a4a' }}>Total usuarios</Typography>
              <Typography variant="h5" fontWeight={700} color="#f20000">{usuarios.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#f5f8ff', border: '1px solid #bbdefb' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#4a5a6b' }}>Total locales</Typography>
              <Typography variant="h5" fontWeight={700} color="#2196f3">{locales.length}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Card sx={{ bgcolor: '#f5fff5', border: '1px solid #c8e6c9' }}>
            <CardContent sx={{ py: 1.5 }}>
              <Typography variant="caption" sx={{ color: '#4a6b4f' }}>Con asignación</Typography>
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
            <TableRow sx={{ backgroundColor: '#f20000' }}>
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
                  No hay supervisores, administradores ni mentores activos
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
                        <Typography variant="caption" color="textSecondary">{usuario.rol === 'mentor' ? 'No mentorea ningún local' : 'Sin asignación'}</Typography>
                      ) : (
                        <Box display="flex" flexWrap="wrap" gap={0.5} alignItems="center">
                          {usuario.rol === 'mentor' && <Typography variant="caption" color="textSecondary">Mentorea:</Typography>}
                          {localesAsignados.slice(0, 3).map((local, i) => (
                            <Chip key={i} label={local.nombre || local}
                              size="small" variant="outlined" color="primary" />
                          ))}
                          {localesAsignados.length > 3 && (
                            <Chip label={`+${localesAsignados.length - 3} más`} size="small" />
                          )}
                        </Box>
                      )}
                      {usuario.rol === 'mentor' && (usuario.localesAdministrados?.length || 0) > 0 && (
                        <Chip label={`Administra: ${usuario.localesAdministrados.length} local${usuario.localesAdministrados.length !== 1 ? 'es' : ''}`}
                          size="small" sx={{ mt: 0.5, bgcolor: '#e8e2fb', color: '#3b1e8a', fontWeight: 600 }} />
                      )}
                    </TableCell>
                    <TableCell>
                      <Box display="flex" flexWrap="wrap" gap={1}>
                        {usuario.rol === 'mentor' ? (
                          <>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<SchoolIcon />}
                              onClick={() => abrirAsignacion(usuario)}
                              sx={{ borderColor: '#f20000', color: '#f20000' }}
                            >
                              Locales que mentorea
                            </Button>
                            <Button
                              variant="outlined"
                              size="small"
                              startIcon={<StoreIcon />}
                              onClick={() => abrirAsignacion(usuario, 'administrados')}
                              sx={{ borderColor: '#6d28d9', color: '#6d28d9' }}
                            >
                              Locales en que es administrador
                            </Button>
                          </>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<AssignmentIcon />}
                            onClick={() => abrirAsignacion(usuario)}
                            sx={{ borderColor: '#f20000', color: '#f20000' }}
                          >
                            Asignar Locales
                          </Button>
                        )}
                      </Box>
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
        <DialogTitle sx={{ bgcolor: '#f20000', color: '#fff' }}>
          <Box display="flex" alignItems="center" gap={1}>
            <StoreIcon />
            <Box>
              <Typography variant="h6">{tituloDialogo}</Typography>
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
              const bloqueado = bloqueados.has(String(local._id));
              return (
                <Grid item xs={12} sm={6} key={local._id}>
                  <Paper
                    variant="outlined"
                    onClick={() => !bloqueado && toggleLocal(local._id)}
                    sx={{
                      p: 1.5, cursor: bloqueado ? 'not-allowed' : 'pointer', opacity: bloqueado ? 0.55 : 1,
                      borderColor: asignado ? '#f20000' : 'divider',
                      bgcolor: asignado ? 'rgba(242,0,0,0.08)' : 'background.paper',
                      transition: 'all 0.15s',
                      '&:hover': { borderColor: '#f20000', bgcolor: 'rgba(242,0,0,0.08)' },
                    }}
                  >
                    <Box display="flex" alignItems="center" gap={1}>
                      <Checkbox
                        checked={asignado}
                        disabled={bloqueado}
                        size="small"
                        sx={{ p: 0, color: '#f20000', '&.Mui-checked': { color: '#f20000' } }}
                        onChange={() => toggleLocal(local._id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Box flex={1}>
                        <Typography variant="body2" fontWeight={600}>{local.nombre}</Typography>
                        {local.ciudad && (
                          <Typography variant="caption" color="textSecondary">{local.ciudad}</Typography>
                        )}
                        {bloqueado && (
                          <Typography variant="caption" color="textSecondary" display="block">
                            {modoDialogo === 'administrados' ? 'Ya lo mentorea' : 'Ya es administrador de este local'}
                          </Typography>
                        )}
                      </Box>
                      {asignado && <CheckIcon fontSize="small" sx={{ color: '#f20000' }} />}
                    </Box>
                  </Paper>
                </Grid>
              );
            })}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
          <Button onClick={handleGuardar} variant="contained" sx={{ bgcolor: '#f20000' }}
            disabled={guardando}>
            {guardando ? <CircularProgress size={20} color="inherit" /> : 'Guardar Asignación'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
