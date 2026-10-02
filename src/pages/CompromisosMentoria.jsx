import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, CircularProgress, IconButton, Tooltip, TextField, MenuItem,
} from '@mui/material';
import { Visibility as VisibilityIcon, PictureAsPdf as PdfIcon } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import CompromisoMentoriaDialog, {
  ChipEstadoCompromiso, descargarPdfMentoria, fmtFecha,
} from '../components/CompromisoMentoriaDialog';

const PESTANAS = [
  { valor: 'abierto', label: 'Abiertos' },
  { valor: 'en_revision', label: 'En revisión' },
  { valor: 'vencido', label: 'Vencidos' },
  { valor: 'cerrado', label: 'Cerrados' },
  { valor: '', label: 'Todos' },
];

export default function CompromisosMentoria() {
  const { user } = useAuth();
  const rol = user?.rol;
  const [estado, setEstado] = useState(rol === 'mentor' ? 'en_revision' : 'abierto');
  const [localId, setLocalId] = useState('');
  const [locales, setLocales] = useState([]);
  const [lista, setLista] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seleccionado, setSeleccionado] = useState(null);

  useEffect(() => {
    api.get('/locales/activos').then((r) => setLocales(r.data)).catch(() => setLocales([]));
  }, []);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (estado) params.estado = estado;
      if (localId) params.localId = localId;
      const { data } = await api.get('/mentorias/compromisos', { params });
      setLista(data || []);
    } catch (e) {
      console.error('Error cargando compromisos:', e);
      setLista([]);
    } finally {
      setLoading(false);
    }
  }, [estado, localId]);

  useEffect(() => { cargar(); }, [cargar]);

  const subtitulo = {
    administrador: 'Compromisos de tus locales: envía la evidencia de cada uno antes de su fecha límite.',
    mentor: 'Compromisos de tus mentorías: revisa la evidencia y aprueba o pide corrección.',
  }[rol] || 'Seguimiento de todos los compromisos generados en mentorías.';

  const pdf = async (c) => {
    try {
      await descargarPdfMentoria(c.mentoriaId, `Mentoria_${c.localNombre}_${c.numeroInforme || c.mentoriaId}.pdf`);
    } catch (e) {
      alert('No se pudo generar el PDF');
    }
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Typography variant="h5" fontWeight={500}>Compromisos de mentoría</Typography>
      <Typography variant="caption" color="text.secondary">{subtitulo}</Typography>

      <Paper sx={{ mt: 2, mb: 2, px: 2, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Tabs value={estado} onChange={(_, v) => setEstado(v)} variant="scrollable" allowScrollButtonsMobile>
          {PESTANAS.map((p) => <Tab key={p.label} value={p.valor} label={p.label} />)}
        </Tabs>
        {locales.length > 1 && (
          <TextField select size="small" label="Local" value={localId} onChange={(e) => setLocalId(e.target.value)} sx={{ width: 200, my: 1 }}>
            <MenuItem value="">Todos</MenuItem>
            {locales.map((l) => <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>)}
          </TextField>
        )}
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : (
          <TableContainer sx={{ maxHeight: 640 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Local</TableCell>
                  <TableCell>Pregunta</TableCell>
                  <TableCell>Compromiso</TableCell>
                  <TableCell>Responsable</TableCell>
                  <TableCell>Fecha límite</TableCell>
                  <TableCell>Mentor</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="center">Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.map((c) => (
                  <TableRow key={c._id} hover sx={{ cursor: 'pointer' }} onClick={() => setSeleccionado(c)}>
                    <TableCell><b>{c.localNombre}</b><Typography variant="caption" display="block" color="text.secondary">{fmtFecha(c.fechaMentoria)}</Typography></TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{String(c.preguntaNumero).padStart(2, '0')} · {c.ambito}<Typography variant="caption" display="block" color="text.secondary">{c.puntaje}/10</Typography></TableCell>
                    <TableCell sx={{ maxWidth: 360 }}>{c.compromisoAlumno}</TableCell>
                    <TableCell>{c.responsable}</TableCell>
                    <TableCell sx={{ color: c.vencido ? '#c62828' : 'inherit', fontWeight: c.vencido ? 700 : 400 }}>{fmtFecha(c.fechaCompromiso)}</TableCell>
                    <TableCell>{c.mentorNombre}</TableCell>
                    <TableCell><ChipEstadoCompromiso estado={c.estado} vencido={c.vencido} /></TableCell>
                    <TableCell align="center" sx={{ whiteSpace: 'nowrap' }} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Ver compromiso">
                        <IconButton size="small" onClick={() => setSeleccionado(c)}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Informe de la mentoría (PDF)">
                        <IconButton size="small" onClick={() => pdf(c)}><PdfIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {lista.length === 0 && (
                  <TableRow><TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay compromisos en esta pestaña.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </Paper>

      <CompromisoMentoriaDialog
        open={!!seleccionado}
        mentoriaId={seleccionado?.mentoriaId}
        compromiso={seleccionado}
        contexto={seleccionado ? `${seleccionado.localNombre} · Mentoría del ${fmtFecha(seleccionado.fechaMentoria)} · ${seleccionado.numeroInforme || ''}` : ''}
        onClose={() => setSeleccionado(null)}
        onActualizado={cargar}
      />
    </Box>
  );
}
