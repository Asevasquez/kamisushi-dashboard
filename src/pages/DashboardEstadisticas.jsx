import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const COLORS = {
  EXCELENTE: '#4caf50',
  'MUY BUENO': '#8bc34a',
  BUENO: '#2196f3',
  REGULAR: '#ff9800',
  MALO: '#f44336',
  PÉSIMO: '#d32f2f',
};

export default function DashboardEstadisticas() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locales, setLocales] = useState([]);
  const [selectedLocal, setSelectedLocal] = useState('');
  const { user } = useAuth();

  useEffect(() => {
    cargarLocales();
  }, []);

  useEffect(() => {
    cargarEstadisticas();
  }, [selectedLocal]);

  const cargarLocales = async () => {
    try {
      const response = await api.get('/estadisticas/mis-locales');
      setLocales(response.data);
      if (response.data.length > 0 && !selectedLocal) {
        setSelectedLocal(response.data[0]._id);
      }
    } catch (error) {
      console.error('Error cargando locales:', error);
    }
  };

  const cargarEstadisticas = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedLocal) params.localId = selectedLocal;
      const response = await api.get('/estadisticas/dashboard', { params });
      setStats(response.data);
    } catch (error) {
      console.error('Error cargando estadísticas:', error);
    } finally {
      setLoading(false);
    }
  };

  const prepararDatosDistribucion = () => {
    if (!stats?.distribucionCategorias) return [];
    return Object.entries(stats.distribucionCategorias).map(([name, value]) => ({
      name: name,
      value: value,
      color: COLORS[name]
    }));
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        📊 Estadísticas
      </Typography>

      {/* Filtro de local */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={4}>
            <FormControl fullWidth>
              <InputLabel>Local</InputLabel>
              <Select
                value={selectedLocal}
                onChange={(e) => setSelectedLocal(e.target.value)}
                label="Local"
              >
                {locales.map((local) => (
                  <MenuItem key={local._id} value={local._id}>
                    {local.nombre}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {/* Tarjetas de resumen */}
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Total Revisiones
              </Typography>
              <Typography variant="h3">
                {stats?.resumen?.totalRevisiones || 0}
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography color="textSecondary" gutterBottom>
                Promedio General
              </Typography>
              <Typography variant="h3">
                {stats?.resumen?.promedioGeneral || 0}%
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Gráfico de distribución */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Distribución por Categoría
              </Typography>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={prepararDatosDistribucion()}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label
                  >
                    {prepararDatosDistribucion().map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Tabla de rendimiento por local */}
        <Grid item xs={12}>
          <TableContainer component={Paper}>
            <Table>
              <TableHead>
                <TableRow sx={{ backgroundColor: '#d32f2f' }}>
                  <TableCell sx={{ color: '#fff' }}>Local</TableCell>
                  <TableCell sx={{ color: '#fff' }} align="right">
                    Revisiones
                  </TableCell>
                  <TableCell sx={{ color: '#fff' }} align="right">
                    Promedio
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(stats?.estadisticasPorLocal || []).map((item) => (
                  <TableRow key={item.local}>
                    <TableCell>{item.local}</TableCell>
                    <TableCell align="right">{item.totalRevisiones}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${item.promedio}%`}
                        size="small"
                        color={item.promedio >= 80 ? 'success' : item.promedio >= 60 ? 'warning' : 'error'}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Grid>
      </Grid>
    </Box>
  );
}