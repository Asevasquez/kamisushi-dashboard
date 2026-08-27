import React, { useState } from 'react';
import {
  AppBar, Box, Toolbar, Typography, Button, Drawer,
  List, ListItem, ListItemIcon, ListItemText, Avatar,
  Divider, Tooltip, IconButton,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Store as StoreIcon,
  Assessment as AssessmentIcon,
  ExitToApp as LogoutIcon,
  People as PeopleIcon,
  Assignment as AssignmentIcon,
  Menu as MenuIcon,
  RestaurantMenu as SushiIcon,
} from '@mui/icons-material';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const DRAWER_WIDTH = 240;

const menuItems = [
  { path: '/dashboard', label: 'Dashboard', icon: <DashboardIcon />, roles: ['master', 'gerencia', 'administrador', 'supervisor'] },
  { path: '/revisiones', label: 'Revisiones', icon: <AssessmentIcon />, roles: ['master', 'gerencia', 'administrador', 'supervisor'] },
  { path: '/usuarios', label: 'Usuarios', icon: <PeopleIcon />, roles: ['master'] },
  { path: '/asignar-locales', label: 'Asignar Locales', icon: <AssignmentIcon />, roles: ['master'] },
  { path: '/locales', label: 'Locales', icon: <StoreIcon />, roles: ['master'] },
  { path: '/supervisores', label: 'Supervisores', icon: <PeopleIcon />, roles: ['master'] },
];

const ROL_COLOR = {
  master: '#d32f2f',
  gerencia: '#7c3aed',
  administrador: '#f59e0b',
  supervisor: '#2196f3',
};

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const filteredMenu = menuItems.filter(item => item.roles.includes(user?.rol));
  const rolColor = ROL_COLOR[user?.rol] || '#d32f2f';

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1, bgcolor: '#d32f2f', boxShadow: '0 2px 8px rgba(211,47,47,0.3)' }}>
        <Toolbar>
          <Box display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1 }}>
            <Typography fontSize={22}>🍣</Typography>
            <Box>
              <Typography variant="h6" fontWeight={800} lineHeight={1}>KamiSushi</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, lineHeight: 1 }}>Sistema de Supervisión</Typography>
            </Box>
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: rolColor, width: 32, height: 32, fontSize: 13, fontWeight: 700 }}>
              {user?.nombre?.[0]?.toUpperCase()}
            </Avatar>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="body2" fontWeight={600} lineHeight={1.2}>{user?.nombre}</Typography>
              <Typography variant="caption" sx={{ opacity: 0.8, textTransform: 'capitalize' }}>{user?.rol}</Typography>
            </Box>
            <Tooltip title="Cerrar sesión">
              <IconButton color="inherit" onClick={logout} sx={{ ml: 1 }}>
                <LogoutIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Drawer variant="permanent" sx={{
        width: DRAWER_WIDTH, flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: DRAWER_WIDTH, boxSizing: 'border-box', borderRight: '1px solid #f0f0f0' },
      }}>
        <Toolbar />
        <Box sx={{ overflow: 'auto', pt: 1 }}>
          <List>
            {filteredMenu.map((item) => {
              const selected = location.pathname === item.path;
              return (
                <ListItem
                  button key={item.path}
                  selected={selected}
                  onClick={() => navigate(item.path)}
                  sx={{
                    mx: 1, mb: 0.5, borderRadius: 2, width: 'calc(100% - 16px)',
                    '&.Mui-selected': {
                      bgcolor: '#d32f2f',
                      '& .MuiListItemIcon-root': { color: '#fff' },
                      '& .MuiListItemText-primary': { color: '#fff', fontWeight: 700 },
                      '&:hover': { bgcolor: '#b71c1c' },
                    },
                    '&:hover': { bgcolor: 'rgba(211,47,47,0.08)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38, color: selected ? '#fff' : '#666' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{ fontSize: 14 }}
                  />
                </ListItem>
              );
            })}
          </List>

          <Divider sx={{ mx: 2, mt: 2, mb: 1 }} />

          {/* Info usuario en sidebar */}
          <Box sx={{ px: 2, py: 1 }}>
            <Box sx={{ p: 1.5, bgcolor: '#fff5f5', borderRadius: 2, border: '1px solid #ffcdd2' }}>
              <Typography variant="caption" color="textSecondary" display="block">Sesión activa</Typography>
              <Typography variant="body2" fontWeight={600} noWrap>{user?.nombre}</Typography>
              <Box sx={{ display: 'inline-block', bgcolor: rolColor, px: 1, py: 0.2, borderRadius: 1, mt: 0.5 }}>
                <Typography variant="caption" color="#fff" fontWeight={700} textTransform="capitalize">
                  {user?.rol}
                </Typography>
              </Box>
            </Box>
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3, bgcolor: '#f8fafc', minHeight: '100vh' }}>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}
