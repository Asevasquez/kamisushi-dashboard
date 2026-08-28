import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, TextField, Button, Typography, Alert,
  CircularProgress, InputAdornment, IconButton,
} from '@mui/material';
import { Visibility, VisibilityOff, EmailOutlined, LockOutlined } from '@mui/icons-material';
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
    setError(''); setErrorCode('');
    if (!email.trim()) { setError('Ingresa tu correo electrónico'); setErrorCode('EMAIL_NOT_FOUND'); return; }
    if (!password) { setError('Ingresa tu contraseña'); setErrorCode('WRONG_PASSWORD'); return; }
    setLoading(true);
    const result = await login(email.trim(), password);
    if (result.success) { navigate('/dashboard'); }
    else { setError(result.error || 'Error al iniciar sesión'); setErrorCode(result.code || ''); }
    setLoading(false);
  };

  const emailError = errorCode === 'EMAIL_NOT_FOUND';
  const passwordError = errorCode === 'WRONG_PASSWORD';

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #c62828 0%, #ef5350 50%, #b71c1c 100%)',
    }}>
      {/* Panel izquierdo decorativo */}
      <Box sx={{
        flex: 1, display: { xs: 'none', md: 'flex' },
        flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        color: '#fff', px: 6,
      }}>
        {/* Ícono sol naciente grande */}
        <Box sx={{ mb: 3 }}>
          <svg viewBox="0 0 200 200" width="160" height="160">
            <g transform="translate(100,100)">
              {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((deg, i) => (
                <polygon key={i} points="0,0 7,-95 -7,-95" fill="rgba(255,255,255,0.35)"
                  transform={`rotate(${deg})`} />
              ))}
              <circle cx="0" cy="0" r="60" fill="rgba(255,255,255,0.15)" />
              <circle cx="0" cy="0" r="52" fill="rgba(255,255,255,0.2)" />
            </g>
            <text x="100" y="92" fontFamily="Impact, Arial Black" fontSize="32" fontWeight="900"
              fill="white" textAnchor="middle">KAMI</text>
            <text x="100" y="124" fontFamily="Impact, Arial Black" fontSize="26" fontWeight="900"
              fill="white" textAnchor="middle">SUSHI</text>
          </svg>
        </Box>
        <Typography variant="h4" fontWeight={800} sx={{ mb: 1 }}>KamiSushi</Typography>
        <Typography variant="h6" sx={{ opacity: 0.85, textAlign: 'center', lineHeight: 1.4 }}>
          Sistema de Supervisión
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.65, mt: 2, textAlign: 'center' }}>
          Gestiona y supervisa el cumplimiento<br />de estándares en tus locales
        </Typography>
      </Box>

      {/* Panel derecho — formulario */}
      <Box sx={{
        width: { xs: '100%', md: '420px' },
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        bgcolor: '#fff', p: 4,
      }}>
        <Box sx={{ width: '100%', maxWidth: 360 }}>
          {/* Logo en mobile */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, justifyContent: 'center', mb: 3 }}>
            <svg viewBox="0 0 120 120" width="80" height="80">
              <rect x="0" y="0" width="120" height="120" rx="24" fill="white" />
              <g transform="translate(60,60)">
                {[0,22.5,45,67.5,90,112.5,135,157.5,180,202.5,225,247.5,270,292.5,315,337.5].map((deg, i) => (
                  <polygon key={i} points="0,0 4,-65 -4,-65" fill="#e53935"
                    transform={`rotate(${deg})`} />
                ))}
                <circle cx="0" cy="0" r="40" fill="#e53935" />
              </g>
              <text x="60" y="56" fontFamily="Impact,Arial Black" fontSize="18" fontWeight="900"
                fill="black" textAnchor="middle">KAMI</text>
              <text x="60" y="74" fontFamily="Impact,Arial Black" fontSize="15" fontWeight="900"
                fill="black" textAnchor="middle">SUSHI</text>
            </svg>
          </Box>

          <Typography variant="h5" fontWeight={700} color="#1a1a1a" gutterBottom>
            Iniciar Sesión
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Ingresa tus credenciales para continuar
          </Typography>

          {error && !emailError && !passwordError && (
            <Alert severity={errorCode === 'ACCOUNT_DISABLED' ? 'warning' : 'error'}
              sx={{ mb: 2, borderRadius: 1.5 }}
              onClose={() => { setError(''); setErrorCode(''); }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit}>
            <TextField
              fullWidth label="Correo electrónico" type="email" margin="normal"
              value={email} onChange={(e) => { setEmail(e.target.value); setError(''); setErrorCode(''); }}
              error={emailError}
              helperText={emailError ? error : ''}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <EmailOutlined fontSize="small" color={emailError ? 'error' : 'action'} />
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />
            <TextField
              fullWidth label="Contraseña" type={showPassword ? 'text' : 'password'} margin="normal"
              value={password} onChange={(e) => { setPassword(e.target.value); setError(''); setErrorCode(''); }}
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
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
            />

            <Button type="submit" fullWidth variant="contained" disabled={loading}
              sx={{
                mt: 3, mb: 2, py: 1.4, borderRadius: 2, fontWeight: 700,
                fontSize: 14, letterSpacing: 1, bgcolor: '#d32f2f',
                '&:hover': { bgcolor: '#b71c1c' },
                boxShadow: '0 4px 14px rgba(211,47,47,0.35)',
              }}>
              {loading ? <CircularProgress size={22} color="inherit" /> : 'INICIAR SESIÓN'}
            </Button>
          </Box>

          <Typography variant="caption" color="text.disabled" display="block" textAlign="center" mt={2}>
            PCM · KamiSushi Sistema de Supervisión
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}
