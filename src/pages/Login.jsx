import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  Paper,
  CircularProgress,
  InputAdornment,
  IconButton,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  EmailOutlined,
  LockOutlined,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorCode, setErrorCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setErrorCode('');

    // Validación básica en cliente
    if (!email.trim()) {
      setError('Ingresa tu correo electrónico');
      setErrorCode('EMAIL_NOT_FOUND');
      return;
    }
    if (!password) {
      setError('Ingresa tu contraseña');
      setErrorCode('WRONG_PASSWORD');
      return;
    }

    setLoading(true);
    const result = await login(email.trim(), password);

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.error || 'Error al iniciar sesión');
      // Extraer el code del error si viene del backend
      setErrorCode(result.code || '');
    }
    setLoading(false);
  };

  // Determinar qué campo resaltar según el error
  const emailError = errorCode === 'EMAIL_NOT_FOUND' || errorCode === 'MISSING_FIELDS';
  const passwordError = errorCode === 'WRONG_PASSWORD';
  const accountError = errorCode === 'ACCOUNT_DISABLED';

  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper elevation={3} sx={{ p: 4, width: '100%', borderRadius: 2 }}>
          {/* Logo y título */}
          <Box sx={{ textAlign: 'center', mb: 2 }}>
            <Typography variant="h4" sx={{ mb: 0.5 }}>🍣</Typography>
            <Typography component="h1" variant="h5" fontWeight={700} color="#d32f2f">
              KamiSushi
            </Typography>
            <Typography variant="body2" color="textSecondary">
              Sistema de Supervisión
            </Typography>
          </Box>

          {/* Mensaje de error */}
          {error && (
            <Alert
              severity={accountError ? 'warning' : 'error'}
              sx={{ mb: 2, borderRadius: 1 }}
              onClose={() => { setError(''); setErrorCode(''); }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1 }}>
            <TextField
              margin="normal"
              required
              fullWidth
              label="Correo electrónico"
              name="email"
              type="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => { setEmail(e.target.value); setError(''); setErrorCode(''); }}
              error={emailError}
              helperText={emailError ? error : ''}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined fontSize="small" color={emailError ? 'error' : 'action'} />
                  </InputAdornment>
                ),
              }}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Contraseña"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(''); setErrorCode(''); }}
              error={passwordError}
              helperText={passwordError ? error : ''}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <LockOutlined fontSize="small" color={passwordError ? 'error' : 'action'} />
                  </InputAdornment>
                ),
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton
                      onClick={() => setShowPassword(!showPassword)}
                      edge="end"
                      size="small"
                    >
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{
                mt: 3, mb: 2,
                bgcolor: '#d32f2f',
                '&:hover': { bgcolor: '#b71c1c' },
                height: 44,
                fontWeight: 600,
                letterSpacing: 1,
              }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={22} color="inherit" /> : 'INICIAR SESIÓN'}
            </Button>
          </Box>

          <Typography variant="caption" color="textSecondary" align="center" display="block" sx={{ mt: 1 }}>
            PCM · KamiSushi Sistema de Supervisión
          </Typography>
        </Paper>
      </Box>
    </Container>
  );
}
