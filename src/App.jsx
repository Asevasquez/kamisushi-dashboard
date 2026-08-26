// dashboard/src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import DashboardModerno from './pages/DashboardModerno';  // ← NUEVO
import DashboardEstadisticas from './pages/DashboardEstadisticas';
import Usuarios from './pages/Usuarios';
import Locales from './pages/Locales';
import Supervisores from './pages/Supervisores';
import Revisiones from './pages/Revisiones';
import AsignarLocales from './pages/AsignarLocales';
import Layout from './components/Layout';

const theme = createTheme({
  palette: {
    primary: { main: '#d32f2f' },
    secondary: { main: '#f44336' },
  },
});

function PrivateRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  if (loading) return <div>Cargando...</div>;
  if (!user) return <Navigate to="/login" />;
  if (allowedRoles && !allowedRoles.includes(user.rol)) return <Navigate to="/dashboard" />;
  return children;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />  {/* ← Dashboard original */}
        <Route path="dashboard-moderno" element={<DashboardModerno />} />  {/* ← NUEVA RUTA */}
        <Route path="estadisticas" element={<DashboardEstadisticas />} />
        <Route path="usuarios" element={<PrivateRoute allowedRoles={['master']}><Usuarios /></PrivateRoute>} />
        <Route path="locales" element={<PrivateRoute allowedRoles={['master']}><Locales /></PrivateRoute>} />
        <Route path="supervisores" element={<PrivateRoute allowedRoles={['master']}><Supervisores /></PrivateRoute>} />
        <Route path="revisiones" element={<Revisiones />} />
        <Route path="asignar-locales" element={<PrivateRoute allowedRoles={['master']}><AsignarLocales /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppRoutes />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;