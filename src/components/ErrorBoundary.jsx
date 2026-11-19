import React from 'react';
import { Box, Typography, Button, Alert } from '@mui/material';

// Si una pantalla falla al dibujarse, se muestra qué pasó en vez de dejar la página en blanco
// (el menú y la barra superior siguen funcionando). Al cambiar de página se reinicia sola.
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('Error al mostrar la página:', error, info && info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <Box sx={{ maxWidth: 680, mt: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          <Typography fontWeight={700}>Ocurrió un error al mostrar esta página</Typography>
          <Typography variant="body2" sx={{ mt: 0.5, wordBreak: 'break-word' }}>
            {String((this.state.error && this.state.error.message) || this.state.error)}
          </Typography>
        </Alert>
        <Button variant="outlined" onClick={() => this.setState({ error: null })}>Reintentar</Button>
      </Box>
    );
  }
}
