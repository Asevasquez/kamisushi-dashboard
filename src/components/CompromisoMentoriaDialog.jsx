import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Chip, Dialog, DialogTitle, DialogContent,
  DialogActions, TextField, IconButton, CircularProgress, Alert, Divider,
} from '@mui/material';
import { Close as CloseIcon, AddPhotoAlternate as AddPhotoIcon } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ────────────────────────────────────────────────────────────
// Utilidades compartidas por Mentorias.jsx y CompromisosMentoria.jsx
// ────────────────────────────────────────────────────────────
const API_BASE = 'https://supervision-back.vertigs.net';

export const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:image')) return url;
  if (url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  return null;
};

export const fmtFecha = (d) => (d ? new Date(d).toLocaleDateString('es-CL') : '—');
export const fmtFechaHora = (d) => (d ? new Date(d).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' }) : '—');

export const ESTADO_COMPROMISO = {
  abierto: { label: 'Abierto', color: '#c2410c' },
  en_revision: { label: 'En revisión', color: '#1e5aa8' },
  cerrado: { label: 'Cerrado', color: '#2e7d32' },
};

export function ChipEstadoCompromiso({ estado, vencido }) {
  if (vencido) return <Chip size="small" label="Vencido" sx={{ bgcolor: '#c62828', color: '#fff', fontWeight: 700 }} />;
  const e = ESTADO_COMPROMISO[estado] || { label: estado, color: '#999' };
  return <Chip size="small" label={e.label} sx={{ bgcolor: e.color, color: '#fff', fontWeight: 700 }} />;
}

export async function descargarPdfMentoria(mentoriaId, nombreArchivo) {
  const res = await api.get(`/mentorias/${mentoriaId}/pdf`, { responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([res.data], { type: 'application/pdf' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo || `mentoria_${mentoriaId}.pdf`;
  a.click();
  window.URL.revokeObjectURL(url);
}

const ACCION_HISTORIAL = {
  creado: 'Compromiso creado',
  evidencia_enviada: 'Evidencia enviada',
  correccion_solicitada: 'Corrección solicitada',
  aprobado: 'Aprobado y cerrado',
};

const leerComoDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(file);
});

function Campo({ label, children }) {
  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography variant="caption" fontWeight={700} color="text.secondary">{label.toUpperCase()}</Typography>
      <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>{children || '—'}</Typography>
    </Box>
  );
}

// ────────────────────────────────────────────────────────────
// Diálogo de un compromiso
//  - administrador (o gerencia/master): envía evidencia si está Abierto
//  - mentor dueño (o gerencia/master): aprueba o pide corrección si está En revisión
//  El backend valida los permisos de verdad; aquí solo se muestra lo que corresponde.
// ────────────────────────────────────────────────────────────
export default function CompromisoMentoriaDialog({ open, mentoriaId, compromiso, contexto, onClose, onActualizado }) {
  const { user } = useAuth();
  const [comentario, setComentario] = useState('');
  const [fotos, setFotos] = useState([]);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setComentario('');
    setFotos([]);
    setError('');
  }, [compromiso?._id, open]);

  if (!compromiso) return null;

  const rol = user?.rol;
  const esGlobal = ['gerencia', 'master'].includes(rol);
  const puedeEnviarEvidencia = compromiso.estado === 'abierto' && (rol === 'administrador' || esGlobal);
  const puedeRevisar = compromiso.estado === 'en_revision' && (rol === 'mentor' || esGlobal);

  const agregarFotos = async (e) => {
    const archivos = Array.from(e.target.files || []).slice(0, 6 - fotos.length);
    const urls = await Promise.all(archivos.map(leerComoDataUrl));
    setFotos((prev) => [...prev, ...urls]);
    e.target.value = '';
  };

  const enviarEvidencia = async () => {
    if (!comentario.trim() && fotos.length === 0) {
      setError('Agrega al menos una foto o un comentario');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await api.post(`/mentorias/${mentoriaId}/compromisos/${compromiso._id}/evidencia`, { comentario, fotos });
      onActualizado && onActualizado();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo enviar la evidencia');
    } finally {
      setEnviando(false);
    }
  };

  const revisar = async (decision) => {
    if (decision === 'corregir' && !comentario.trim()) {
      setError('Indica qué debe corregir el administrador');
      return;
    }
    setEnviando(true);
    setError('');
    try {
      await api.put(`/mentorias/${mentoriaId}/compromisos/${compromiso._id}/revisar`, { decision, comentario });
      onActualizado && onActualizado();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || 'No se pudo guardar la revisión');
    } finally {
      setEnviando(false);
    }
  };

  const evidencias = [...(compromiso.evidencias || [])].reverse();
  const historial = [...(compromiso.historial || [])].reverse();

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 2 }}>
        <Box>
          <Typography variant="overline" sx={{ color: '#c2410c', fontWeight: 800, lineHeight: 1.4 }}>
            {String(compromiso.preguntaNumero).padStart(2, '0')} · {compromiso.ambito} · {compromiso.puntaje}/10
          </Typography>
          <Typography variant="h6" sx={{ color: 'text.primary', lineHeight: 1.3 }}>{compromiso.compromisoAlumno}</Typography>
          {contexto && <Typography variant="caption" color="text.secondary">{contexto}</Typography>}
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box display="flex" gap={1} alignItems="center" mb={2}>
          <ChipEstadoCompromiso estado={compromiso.estado} vencido={compromiso.vencido} />
          <Typography variant="body2" color="text.secondary">
            Responsable: <b>{compromiso.responsable || '—'}</b> · vence {fmtFecha(compromiso.fechaCompromiso)}
          </Typography>
        </Box>

        <Campo label="Deficiencia detectada">{compromiso.deficiencia}</Campo>
        <Campo label="Acción del mentor">{compromiso.accionMentor}</Campo>
        <Campo label="Evidencia solicitada">{compromiso.evidenciaRequerida}</Campo>

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Evidencias enviadas ({evidencias.length})</Typography>
        {evidencias.length === 0 && <Typography variant="body2" color="text.secondary">Aún no se envía evidencia.</Typography>}
        {evidencias.map((ev) => (
          <Paper key={ev._id || ev.fecha} variant="outlined" sx={{ p: 1.5, mb: 1.5 }}>
            <Typography variant="caption" color="text.secondary">{ev.usuarioNombre} · {fmtFechaHora(ev.fecha)}</Typography>
            {ev.comentario && <Typography variant="body2" sx={{ mt: 0.5 }}>{ev.comentario}</Typography>}
            {ev.fotos?.length > 0 && (
              <Box display="flex" gap={1} flexWrap="wrap" mt={1}>
                {ev.fotos.map((f, i) => (
                  <a key={i} href={getImageUrl(f)} target="_blank" rel="noreferrer">
                    <img src={getImageUrl(f)} alt={`Evidencia ${i + 1}`} style={{ width: 96, height: 96, objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }} />
                  </a>
                ))}
              </Box>
            )}
          </Paper>
        ))}

        {(puedeEnviarEvidencia || puedeRevisar) && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="subtitle2" fontWeight={700} gutterBottom>
              {puedeEnviarEvidencia ? 'Enviar evidencia' : 'Revisar evidencia'}
            </Typography>
            <TextField
              fullWidth multiline minRows={3} size="small"
              label={puedeEnviarEvidencia ? 'Comentario para el mentor' : 'Comentario del mentor'}
              value={comentario} onChange={(e) => setComentario(e.target.value)}
            />
            {puedeEnviarEvidencia && (
              <Box display="flex" gap={1} flexWrap="wrap" alignItems="center" mt={1.5}>
                {fotos.map((f, i) => (
                  <Box key={i} sx={{ position: 'relative' }}>
                    <img src={f} alt={`Foto ${i + 1}`} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8 }} />
                    <IconButton size="small" aria-label="Quitar foto"
                      onClick={() => setFotos(fotos.filter((_, j) => j !== i))}
                      sx={{ position: 'absolute', top: -10, right: -10, bgcolor: 'background.paper', boxShadow: 1 }}>
                      <CloseIcon fontSize="inherit" />
                    </IconButton>
                  </Box>
                ))}
                {fotos.length < 6 && (
                  <Button component="label" variant="outlined" startIcon={<AddPhotoIcon />} size="small">
                    Agregar fotos
                    <input hidden type="file" accept="image/*" multiple onChange={agregarFotos} />
                  </Button>
                )}
              </Box>
            )}
          </>
        )}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}

        <Divider sx={{ my: 2 }} />
        <Typography variant="subtitle2" fontWeight={700} gutterBottom>Historial</Typography>
        {historial.map((h, i) => (
          <Box key={i} display="flex" gap={1.5} mb={1}>
            <Box sx={{ width: 10, height: 10, borderRadius: '50%', mt: 0.7, flexShrink: 0, bgcolor: i === 0 ? '#1e5aa8' : '#bbb' }} />
            <Box>
              <Typography variant="body2"><b>{ACCION_HISTORIAL[h.accion] || h.accion}</b> · {h.usuarioNombre} · {fmtFechaHora(h.fecha)}</Typography>
              {h.comentario && <Typography variant="body2" color="text.secondary">{h.comentario}</Typography>}
            </Box>
          </Box>
        ))}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cerrar</Button>
        {puedeEnviarEvidencia && (
          <Button variant="contained" onClick={enviarEvidencia} disabled={enviando} sx={{ bgcolor: '#f20000' }}>
            {enviando ? <CircularProgress size={20} color="inherit" /> : 'Enviar evidencia'}
          </Button>
        )}
        {puedeRevisar && (
          <>
            <Button variant="outlined" color="warning" onClick={() => revisar('corregir')} disabled={enviando}>Pedir corrección</Button>
            <Button variant="contained" onClick={() => revisar('aprobar')} disabled={enviando} sx={{ bgcolor: '#1e5aa8' }}>
              {enviando ? <CircularProgress size={20} color="inherit" /> : 'Aprobar y cerrar'}
            </Button>
          </>
        )}
      </DialogActions>
    </Dialog>
  );
}
