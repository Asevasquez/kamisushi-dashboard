import React, { useState, useEffect } from 'react';
import {
  Grid, Card, CardContent, Typography, Box, CircularProgress,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Chip,
} from '@mui/material';
import {
  Assessment as AssessmentIcon,
  Store as StoreIcon,
  People as PeopleIcon,
  TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const getCategoriaColor = (promedio) => {
  if (promedio >= 90) return '#4caf50';
  if (promedio >= 80) return '#8bc34a';
  if (promedio >= 70) return '#2196f3';
  if (promedio >= 60) return '#ff9800';
  return '#f44336';
};

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [revisionesMes, setRevisionesMes] = useState({});
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      const [statsRes, mesRes] = await Promise.all([
        api.get('/estadisticas/dashboard').catch(() => ({ data: null })),
        api.get('/revisiones/estadisticas-por-local').catch(() => ({ data: {} })),
      ]);
      setStats(statsRes.data);
      setRevisionesMes(mesRes.data || {});
    } catch (error) {
      console.error('Error cargando datos:', error);
    } finally {
      setLoading(false);
    }
  };

  const cards = [
    {
      title: 'Total Revisiones',
      value: stats?.resumen?.totalRevisiones ?? Object.values(revisionesMes).reduce((a, v) => a + v.totalRevisiones, 0),
      icon: <AssessmentIcon sx={{ fontSize: 40, color: '#d32f2f' }} />,
      bg: '#fff5f5',
    },
    {
      title: 'Promedio General',
      value: `${stats?.resumen?.promedioGeneral ?? '—'}%`,
      icon: <TrendingUpIcon sx={{ fontSize: 40, color: '#4caf50' }} />,
      bg: '#f5fff5',
    },
    {
      title: 'Locales',
      value: stats?.estadisticasPorLocal?.length ?? Object.keys(revisionesMes).length,
      icon: <StoreIcon sx={{ fontSize: 40, color: '#2196f3' }} />,
      bg: '#f5f8ff',
    },
    {
      title: 'Supervisores',
      value: stats?.estadisticasSupervisores?.length ?? '—',
      icon: <PeopleIcon sx={{ fontSize: 40, color: '#ff9800' }} />,
      bg: '#fff8f0',
    },
  ];

  if (loading) {
    return <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px"><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={600} gutterBottom>
        Bienvenido, {user?.nombre}
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Panel de control — KamiSushi Sistema de Supervisión
      </Typography>

      {/* Tarjetas resumen */}
      <Grid container spacing={3} sx={{ mt: 1 }}>
        {cards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ bgcolor: card.bg, border: '1px solid #eee' }}>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Box>
                    <Typography color="textSecondary" variant="body2" gutterBottom>
                      {card.title}
                    </Typography>
                    <Typography variant="h4" fontWeight={700}>
                      {card.value}
                    </Typography>
                  </Box>
                  {card.icon}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabla: revisiones del mes por local */}
      {Object.keys(revisionesMes).length > 0 && (
        <Box mt={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📅 Revisiones del Mes Actual por Local
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#d32f2f' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Local</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }} align="center">Revisiones</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }} align="center">Promedio</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Última Revisión</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {Object.entries(revisionesMes).map(([nombre, data]) => {
                  const ultima = data.revisiones[data.revisiones.length - 1];
                  return (
                    <TableRow key={nombre} hover>
                      <TableCell><strong>{nombre}</strong></TableCell>
                      <TableCell align="center">{data.totalRevisiones}</TableCell>
                      <TableCell align="center">
                        <Chip
                          label={`${data.promedioPorcentaje.toFixed(1)}%`}
                          size="small"
                          sx={{
                            bgcolor: getCategoriaColor(data.promedioPorcentaje),
                            color: '#fff',
                            fontWeight: 700,
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        {ultima ? new Date(ultima.fecha).toLocaleDateString('es-CL') : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {/* Tabla: rendimiento por local (estadísticas generales) */}
      {stats?.estadisticasPorLocal?.length > 0 && (
        <Box mt={4}>
          <Typography variant="h6" fontWeight={600} gutterBottom>
            📊 Rendimiento General por Local
          </Typography>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#424242' }}>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }}>Local</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }} align="center">Revisiones</TableCell>
                  <TableCell sx={{ color: '#fff', fontWeight: 600 }} align="center">Promedio</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {stats.estadisticasPorLocal.map((item) => (
                  <TableRow key={item.local} hover>
                    <TableCell><strong>{item.local}</strong></TableCell>
                    <TableCell align="center">{item.totalRevisiones}</TableCell>
                    <TableCell align="center">
                      <Chip
                        label={`${item.promedio}%`}
                        size="small"
                        sx={{
                          bgcolor: getCategoriaColor(parseFloat(item.promedio)),
                          color: '#fff',
                          fontWeight: 700,
                        }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}
    </Box>
  );
}
