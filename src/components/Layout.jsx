// dashboard/src/components/Layout.jsx
import React from 'react';
import {
  AppBar, Box, Toolbar, Typography, Button, Drawer,
  List, ListItem, ListItemIcon, ListItemText,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Dashboard as DashboardModernoIcon,  // ← NUEVO ICONO
  Store as StoreIcon,
  Assessment as AssessmentIcon,
  BarChart as BarChartIcon,
  ExitToApp as LogoutIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

const menuItems = [
  { path: '/dashboard', label: 'Dashboard Clásico', icon: <DashboardIcon />, roles: ['master', 'gerencia', 'administrador', 'supervisor'] },
  { path: '/dashboard-moderno', label: 'Dashboard Moderno', icon: <DashboardModernoIcon />, roles: ['master', 'gerencia', 'administrador'] },
  { path: '/estadisticas', label: 'Estadísticas', icon: <BarChartIcon />, roles: ['master', 'gerencia', 'administrador'] },
  { path: '/revisiones', label: 'Revisiones', icon: <AssessmentIcon />, roles: ['master', 'gerencia', 'administrador', 'supervisor'] },
  { path: '/usuarios', label: 'Usuarios', icon: <PeopleIcon />, roles: ['master'] },
  { path: '/asignar-locales', label: 'Asignar Locales', icon: <AssignmentIcon />, roles: ['master'] },
  { path: '/locales', label: 'Locales', icon: <StoreIcon />, roles: ['master'] },
  { path: '/supervisores', label: 'Supervisores', icon: <PeopleIcon />, roles: ['master'] },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.rol));

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#b71c1c' }}>
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 700 }}>
            🍣 KamiSushi — Supervisión
          </Typography>
          <Typography variant="body2" sx={{ mr: 2, opacity: 0.85 }}>
            {user?.nombre} <span style={{ opacity: 0.6 }}>({user?.rol})</span>
          </Typography>
          <Button color="inherit" onClick={logout} startIcon={<LogoutIcon />}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          [`& .MuiDrawer-paper`]: {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            {filteredMenu.map((item) => (
              <ListItem
                button
                key={item.path}
                selected={location.pathname === item.path}
                onClick={() => navigate(item.path)}
                sx={{
                  '&.Mui-selected': {
                    bgcolor: 'rgba(211,47,47,0.12)',
                    borderLeft: '3px solid #d32f2f',
                    '& .MuiListItemIcon-root': { color: '#d32f2f' },
                    '& .MuiListItemText-primary': { color: '#d32f2f', fontWeight: 600 },
                  },
                  '&:hover': { bgcolor: 'rgba(211,47,47,0.06)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}