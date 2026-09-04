import React, { useState, createContext, useContext, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Usuarios from './pages/Usuarios';
import Locales from './pages/Locales';
import Supervisores from './pages/Supervisores';
import Revisiones from './pages/Revisiones';
import AsignarLocales from './pages/AsignarLocales';
import DashboardSupervision from './pages/DashboardSupervision';
import Layout from './components/Layout';

// Contexto global del modo oscuro
export const ColorModeContext = createContext({ toggleColorMode: () => {}, mode: 'light' });
export const useColorMode = () => useContext(ColorModeContext);

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
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="revisiones" element={<Revisiones />} />
        <Route path="dashboard-supervision" element={<PrivateRoute allowedRoles={['master']}><DashboardSupervision /></PrivateRoute>} />
        <Route path="usuarios" element={<PrivateRoute allowedRoles={['master']}><Usuarios /></PrivateRoute>} />
        <Route path="locales" element={<PrivateRoute allowedRoles={['master']}><Locales /></PrivateRoute>} />
        <Route path="supervisores" element={<PrivateRoute allowedRoles={['master']}><Supervisores /></PrivateRoute>} />
        <Route path="asignar-locales" element={<PrivateRoute allowedRoles={['master']}><AsignarLocales /></PrivateRoute>} />
      </Route>
    </Routes>
  );
}

export default function App() {
  const [mode, setMode] = useState(
    () => localStorage.getItem('colorMode') || 'light'
  );

  const colorMode = useMemo(() => ({
    mode,
    toggleColorMode: () => {
      setMode(prev => {
        const next = prev === 'light' ? 'dark' : 'light';
        localStorage.setItem('colorMode', next);
        return next;
      });
    },
  }), [mode]);

  const theme = useMemo(() => createTheme({
    palette: {
      mode,
      primary: { main: '#d32f2f' },
      secondary: { main: '#f44336' },
      ...(mode === 'dark' && {
        background: { default: '#121212', paper: '#1e1e1e' },
      }),
    },
  }), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
