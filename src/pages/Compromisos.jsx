import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Box, Paper, Typography, Button, IconButton, Tooltip, Chip, Tabs, Tab, TextField, MenuItem,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination,
  Dialog, DialogTitle, DialogContent, CircularProgress, Alert, Snackbar,
  ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { useTheme, alpha, lighten } from '@mui/material/styles';
import {
  Visibility as ViewIcon, Close as CloseIcon, Download as DownloadIcon,
  CheckCircleOutlined as ClosedIcon, Schedule as ReviewIcon, WarningAmber as OverdueIcon,
  RadioButtonUnchecked as OpenIcon, Send as SendIcon, Image as ImageIcon, Check as CheckIcon,
} from '@mui/icons-material';
import ExcelJS from 'exceljs';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// ─── Constantes y utilidades ────────────────────────────────────────────────
const API_BASE = 'https://supervision-back.vertigs.net';
const getImageUrl = (url) => {
  if (!url) return null;
  if (url.startsWith('data:image') || url.startsWith('http')) return url;
  if (url.startsWith('/uploads')) return `${API_BASE}${url}`;
  return null;
};

const SECCIONES = [
  { key: 'servicioCliente', label: 'Servicio al Cliente' },
  { key: 'cocina', label: 'Cocina' },
];
const labelSeccion = (k) => SECCIONES.find((s) => s.key === k)?.label || k;

const ESTADOS = {
  abierto: { label: 'Abierto', color: '#0a4a8a', Icon: OpenIcon },
  en_revision: { label: 'En revisión', color: '#8a5200', Icon: ReviewIcon },
  vencido: { label: 'Vencido', color: '#a40000', Icon: OverdueIcon },
  cerrado: { label: 'Cerrado', color: '#1b6b28', Icon: ClosedIcon },
};
const SEMAFORO = { Bueno: '#1b6b28', Regular: '#8a5200', 'Crítico': '#a40000', 'Sin datos': '#5c5c5c' };
const colorBarra = (pct) => (pct == null ? '#9e9e9e' : pct >= 80 ? '#2e7d32' : pct >= 60 ? '#b86e00' : '#c62828');
const MAX_FOTOS = 5;
const MAX_ANCHO_FOTO = 1000;

const fmtFecha = (str) => {
  if (!str) return '—';
  const [y, m, d] = String(str).slice(0, 10).split('-');
  return `${d}-${m}-${y}`;
};
const fmtFechaISO = (iso) => (iso ? new Date(iso).toLocaleDateString('es-CL') : '—');
const fmtFechaHora = (iso) => (iso
  ? new Date(iso).toLocaleString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : '—');
const relativo = (dias) => {
  if (dias === 0) return 'hoy';
  if (dias === 1) return 'mañana';
  if (dias === -1) return 'ayer';
  return dias > 0 ? `en ${dias} días` : `hace ${Math.abs(dias)} días`;
};
const fmtDias = (n) => (n == null ? '—' : `${String(n).replace('.', ',')} días`);
const fmtPct = (n) => (n == null ? '—' : `${n}%`);
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const nombreMes = (yyyymm) => MESES_CORTOS[Number(String(yyyymm).slice(5, 7)) - 1] || yyyymm;

// Colores que se leen bien tanto en modo claro como oscuro.
function useTono() {
  const theme = useTheme();
  const dark = theme.palette.mode === 'dark';
  return {
    dark,
    tono: (c) => (dark ? lighten(c, 0.55) : c),
    fondo: (c) => alpha(c, dark ? 0.28 : 0.13),
  };
}

// Reduce la foto antes de enviarla (como hace la app: máx. 1000 px, JPEG).
function archivoADataUrl(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const escala = Math.min(1, MAX_ANCHO_FOTO / img.width);
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.6));
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('No se pudo leer la imagen')); };
    img.src = url;
  });
}

async function descargarWorkbook(workbook, nombreArchivo) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

// ─── Piezas visuales ────────────────────────────────────────────────────────
function EstadoChip({ estado }) {
  const { tono, fondo } = useTono();
  const e = ESTADOS[estado] || ESTADOS.abierto;
  return (
    <Chip size="small" icon={<e.Icon style={{ fontSize: 15, color: tono(e.color) }} />} label={e.label}
      sx={{ bgcolor: fondo(e.color), color: tono(e.color), fontWeight: 700, '& .MuiChip-icon': { ml: 0.75 } }} />
  );
}

function SemaforoChip({ valor }) {
  const { tono, fondo } = useTono();
  const c = SEMAFORO[valor] || SEMAFORO['Sin datos'];
  return <Chip size="small" label={valor} sx={{ bgcolor: fondo(c), color: tono(c), fontWeight: 700 }} />;
}

function BarraPct({ pct, ancho = 90 }) {
  return (
    <Box display="flex" alignItems="center" gap={1.25}>
      <Box sx={{ flex: 1, minWidth: ancho, height: 8, borderRadius: 4, bgcolor: 'action.hover', overflow: 'hidden' }}>
        <Box sx={{ width: `${pct ?? 0}%`, height: '100%', bgcolor: colorBarra(pct), borderRadius: 4 }} />
      </Box>
      <Typography sx={{ width: 42, fontWeight: 700, fontSize: 13.5 }}>{fmtPct(pct)}</Typography>
    </Box>
  );
}

function KpiCard({ label, value, sub, color, children }) {
  const { tono } = useTono();
  return (
    <Paper sx={{ p: 2.5, borderRadius: 3, height: '100%', borderBottom: `3px solid ${color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'text.secondary' }}>{label}</Typography>
      <Typography sx={{ mt: 0.5, fontSize: 32, fontWeight: 800, color: tono(color), lineHeight: 1.15 }}>{value}</Typography>
      {sub && <Typography sx={{ fontSize: 12.5, color: 'text.secondary', lineHeight: 1.4 }}>{sub}</Typography>}
      {children}
    </Paper>
  );
}

const gridKpis = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 2 };
const thSx = { color: '#fff', fontWeight: 700 };
const headRowSx = { backgroundColor: '#f20000' };

// ─── Detalle de un compromiso: historial + evidencia / validación ──────────
const ACCION = {
  acordado: { label: 'Compromiso acordado', color: '#1a1a1a' },
  evidencia_enviada: { label: 'Evidencia enviada', color: '#8a5200' },
  correccion_solicitada: { label: 'Corrección solicitada', color: '#a40000' },
  aprobado: { label: 'Aprobado y cerrado', color: '#1b6b28' },
};

function DetalleDialog({ id, onClose, onChanged, notificar }) {
  const { tono, fondo } = useTono();
  const [c, setC] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [comentario, setComentario] = useState('');
  const [fotos, setFotos] = useState([]); // [{ nombre, dataUrl }]
  const [procesando, setProcesando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef(null);

  const cargar = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const { data } = await api.get(`/compromisos/${id}`);
      setC(data);
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudo cargar el compromiso');
      setC(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { setC(null); setComentario(''); setFotos([]); cargar(); }, [cargar]);

  const agregarArchivos = async (lista) => {
    const archivos = Array.from(lista || []).filter((f) => f.type && f.type.startsWith('image/'));
    if (archivos.length === 0) return;
    const cupo = MAX_FOTOS - fotos.length;
    if (cupo <= 0) { notificar(`Máximo ${MAX_FOTOS} fotos`, 'warning'); return; }
    setProcesando(true);
    try {
      const nuevas = [];
      for (const f of archivos.slice(0, cupo)) nuevas.push({ nombre: f.name, dataUrl: await archivoADataUrl(f) });
      setFotos((prev) => [...prev, ...nuevas]);
    } catch (e) {
      notificar('No se pudo leer una de las imágenes', 'error');
    } finally {
      setProcesando(false);
    }
  };

  const enviarEvidencia = async () => {
    if (!comentario.trim() && fotos.length === 0) { notificar('Agrega al menos una foto o un comentario', 'warning'); return; }
    setEnviando(true);
    try {
      const { data } = await api.post(`/compromisos/${id}/evidencia`, { comentario: comentario.trim(), fotos: fotos.map((f) => f.dataUrl) });
      setC(data);
      setComentario('');
      setFotos([]);
      notificar('Evidencia enviada. La supervisora la revisará.');
      onChanged();
    } catch (e) {
      notificar(e.response?.data?.error || 'No se pudo enviar la evidencia', 'error');
    } finally {
      setEnviando(false);
    }
  };

  const revisar = async (decision) => {
    if (decision === 'corregir' && !comentario.trim()) { notificar('Indica qué debe corregir el administrador', 'warning'); return; }
    setEnviando(true);
    try {
      const { data } = await api.put(`/compromisos/${id}/revisar`, { decision, comentario: comentario.trim() });
      setC(data);
      setComentario('');
      notificar(decision === 'aprobar' ? 'Compromiso aprobado y cerrado' : 'Corrección solicitada: volvió a Abierto');
      onChanged();
    } catch (e) {
      notificar(e.response?.data?.error || 'No se pudo guardar la revisión', 'error');
    } finally {
      setEnviando(false);
    }
  };

  // Historial más reciente primero; cada evidencia lleva sus fotos.
  const eventos = (() => {
    if (!c) return [];
    let iEv = 0;
    return (c.historial || [])
      .map((h) => ({ ...h, fotos: h.accion === 'evidencia_enviada' ? ((c.evidencias || [])[iEv++]?.fotos || []) : [] }))
      .reverse();
  })();

  return (
    <Dialog open={!!id} onClose={onClose} maxWidth="md" fullWidth>
      {loading && !c && <Box p={6} textAlign="center"><CircularProgress /></Box>}
      {error && !c && (
        <DialogContent>
          <Alert severity="error" action={<Button color="inherit" size="small" onClick={onClose}>Cerrar</Button>}>{error}</Alert>
        </DialogContent>
      )}
      {c && (
        <>
          <DialogTitle sx={{ pb: 1.5 }}>
            <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2}>
              <Box>
                <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                  <Typography variant="h6" fontWeight={500}>{c.localNombre} — {c.seccionLabel}</Typography>
                  <EstadoChip estado={c.estadoVisible} />
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Revisión del {fmtFechaISO(c.fechaRevision)} · Supervisora: {c.supervisorNombre || '—'}
                </Typography>
              </Box>
              <IconButton aria-label="Cerrar" onClick={onClose} sx={{ mt: -0.5, mr: -1 }}><CloseIcon /></IconButton>
            </Box>
          </DialogTitle>

          <DialogContent dividers>
            <Typography sx={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'text.secondary' }}>COMPROMISO</Typography>
            <Paper variant="outlined" sx={{ mt: 0.75, p: 2, bgcolor: 'action.hover', border: 'none' }}>
              <Typography sx={{ fontSize: 16, lineHeight: 1.5 }}>{c.texto}</Typography>
            </Paper>

            <Box sx={{ mt: 2.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 2 }}>
              <Box>
                <Typography variant="caption" color="text.secondary">Responsable</Typography>
                <Typography fontWeight={500}>{c.responsableNombre || '—'}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Fecha límite</Typography>
                <Typography fontWeight={500} sx={c.estadoVisible === 'vencido' ? { color: tono('#a40000') } : undefined}>
                  {fmtFecha(c.fechaLimite)}{' '}
                  {c.estado !== 'cerrado' && (
                    <Typography component="span" variant="caption" color={c.estadoVisible === 'vencido' ? 'inherit' : 'text.secondary'}>
                      · {relativo(c.diasRestantes)}
                    </Typography>
                  )}
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary">Evidencias enviadas</Typography>
                <Typography fontWeight={500}>{c.evidenciasCount}{c.correcciones > 0 ? ` · ${c.correcciones} corrección(es)` : ''}</Typography>
              </Box>
              {c.estado === 'cerrado' && (
                <Box>
                  <Typography variant="caption" color="text.secondary">Cierre</Typography>
                  <Typography fontWeight={500}>
                    {fmtFechaISO(c.fechaCierre)}{' '}
                    <Typography component="span" variant="caption" sx={{ color: tono(c.cerradoATiempo ? '#1b6b28' : '#a40000') }}>
                      · {c.cerradoATiempo ? 'a tiempo' : 'fuera de plazo'}
                    </Typography>
                  </Typography>
                </Box>
              )}
            </Box>

            <Typography sx={{ mt: 3, mb: 1.5, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'text.secondary' }}>HISTORIAL</Typography>
            {eventos.map((h, i) => {
              const a = ACCION[h.accion] || { label: h.accion, color: '#555' };
              const esCorreccion = h.accion === 'correccion_solicitada';
              return (
                <Box key={h._id || i} display="flex" gap={1.75}>
                  <Box display="flex" flexDirection="column" alignItems="center" sx={{ width: 12, flexShrink: 0 }}>
                    <Box sx={{ width: 12, height: 12, mt: 0.6, borderRadius: '50%', bgcolor: tono(a.color) }} />
                    {i < eventos.length - 1 && <Box sx={{ flex: 1, width: 2, mt: 0.5, bgcolor: 'divider' }} />}
                  </Box>
                  <Box sx={{ flex: 1, pb: 2, ...(esCorreccion ? { bgcolor: fondo('#e65100'), borderRadius: 1.5, px: 1.5, py: 1, mb: 1.5 } : {}) }}>
                    <Typography fontWeight={700} sx={{ fontSize: 14, color: esCorreccion ? tono('#a40000') : 'text.primary' }}>{a.label}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {h.usuarioNombre || '—'} · {fmtFechaHora(h.fecha)}
                      {typeof h.diasValidacion === 'number' ? ` · revisado en ${fmtDias(h.diasValidacion)}` : ''}
                    </Typography>
                    {h.comentario && <Typography sx={{ mt: 0.5, fontSize: 14, lineHeight: 1.45 }}>{h.comentario}</Typography>}
                    {h.fotos.length > 0 && (
                      <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                        {h.fotos.map((f, k) => {
                          const url = getImageUrl(f);
                          return url ? (
                            <a key={k} href={url} target="_blank" rel="noreferrer" aria-label={`Abrir foto ${k + 1} de la evidencia`}>
                              <img src={url} alt={`Evidencia ${k + 1}`} style={{ width: 112, height: 84, objectFit: 'cover', borderRadius: 8, border: '1px solid rgba(128,128,128,0.35)' }} />
                            </a>
                          ) : null;
                        })}
                      </Box>
                    )}
                  </Box>
                </Box>
              );
            })}

            {/* Validación: quien creó la revisión, gerencia o master */}
            {c.puedeRevisar && (
              <Paper variant="outlined" sx={{ mt: 1, p: 2 }}>
                <Typography fontWeight={700} sx={{ fontSize: 14 }}>Tu revisión</Typography>
                <TextField fullWidth multiline minRows={2} size="small" sx={{ mt: 1 }} value={comentario}
                  onChange={(e) => setComentario(e.target.value)}
                  label="Comentario" helperText="Obligatorio si pides corrección" />
                <Box display="flex" justifyContent="flex-end" gap={1.5} mt={2}>
                  <Button variant="outlined" color="inherit" disabled={enviando} onClick={() => revisar('corregir')}
                    sx={{ borderRadius: 6, fontWeight: 700 }}>Pedir corrección</Button>
                  <Button variant="contained" disabled={enviando} onClick={() => revisar('aprobar')} startIcon={<CheckIcon />}
                    sx={{ borderRadius: 6, fontWeight: 700, bgcolor: '#17591f', '&:hover': { bgcolor: '#124516' } }}>Aprobar y cerrar</Button>
                </Box>
              </Paper>
            )}

            {/* Evidencia: administrador del local */}
            {c.puedeEnviarEvidencia && (
              <Paper variant="outlined" sx={{ mt: 1, p: 2 }}>
                <Typography fontWeight={700} sx={{ fontSize: 14 }}>
                  {c.evidenciasCount > 0 ? 'Enviar nueva evidencia' : 'Enviar evidencia'}
                </Typography>
                <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 2 }}>
                  <Box>
                    <Box
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => { e.preventDefault(); agregarArchivos(e.dataTransfer.files); }}
                      sx={{ border: '2px dashed', borderColor: 'divider', borderRadius: 2, p: 2, display: 'flex', alignItems: 'center', gap: 1.5, minHeight: 76 }}>
                      <ImageIcon color="action" />
                      <Box>
                        <Typography sx={{ fontSize: 13.5 }}>
                          Arrastra fotos aquí o{' '}
                          <Button size="small" sx={{ p: 0, minWidth: 0, textDecoration: 'underline', fontWeight: 700 }}
                            onClick={() => inputRef.current?.click()} disabled={procesando}>selecciónalas</Button>
                        </Typography>
                        <Typography variant="caption" color="text.secondary">Máximo {MAX_FOTOS} fotos{procesando ? ' · procesando…' : ''}</Typography>
                      </Box>
                      <input ref={inputRef} type="file" accept="image/*" multiple hidden
                        onChange={(e) => { agregarArchivos(e.target.files); e.target.value = ''; }} />
                    </Box>
                    <Box display="flex" flexWrap="wrap" gap={1} mt={1}>
                      {fotos.map((f, i) => (
                        <Chip key={i} size="small" label={f.nombre} onDelete={() => setFotos((p) => p.filter((_, k) => k !== i))} />
                      ))}
                    </Box>
                  </Box>
                  <TextField fullWidth multiline minRows={3} size="small" label="Comentario" value={comentario}
                    onChange={(e) => setComentario(e.target.value)} />
                </Box>
                <Box display="flex" alignItems="center" justifyContent="space-between" gap={2} mt={2} flexWrap="wrap">
                  <Typography variant="caption" color="text.secondary">
                    Agrega al menos una foto o un comentario. Se enviará a {c.supervisorNombre || 'la supervisora'} para su revisión.
                  </Typography>
                  <Button variant="contained" disabled={enviando || procesando} onClick={enviarEvidencia}
                    startIcon={enviando ? <CircularProgress size={16} color="inherit" /> : <SendIcon />}
                    sx={{ borderRadius: 6, fontWeight: 700, bgcolor: '#f20000' }}>Enviar evidencia</Button>
                </Box>
              </Paper>
            )}
          </DialogContent>
        </>
      )}
    </Dialog>
  );
}

// ─── Seguimiento: lista (supervisoras, administradores, gerencia, master) ──
const TABS = [
  { valor: 'todos', label: 'Todos' },
  { valor: 'abierto', label: 'Abiertos' },
  { valor: 'en_revision', label: 'En revisión' },
  { valor: 'vencido', label: 'Vencidos' },
  { valor: 'cerrado', label: 'Cerrados' },
];

function Seguimiento({ esAdmin, esMentor, localInicial, idAbrir, onCerrarDetalle, notificar }) {
  const { tono, fondo } = useTono();
  const [estado, setEstado] = useState('todos');
  const [filtros, setFiltros] = useState({ localId: localInicial || '', seccion: '', supervisorId: '', mes: '' });
  const [alcance, setAlcance] = useState('propios');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(20);
  const [resp, setResp] = useState({ data: [], total: 0, conteos: { todos: 0, abierto: 0, en_revision: 0, vencido: 0, cerrado: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opciones, setOpciones] = useState({ locales: [], administradores: [], supervisoras: [] });
  const [resumenes, setResumenes] = useState({ propios: null, mentoria: null });
  const [detalleId, setDetalleId] = useState(idAbrir || null);

  useEffect(() => { if (idAbrir) setDetalleId(idAbrir); }, [idAbrir]);

  const cargar = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { estado, page: page + 1, limit: rowsPerPage };
      Object.entries(filtros).forEach(([k, v]) => { if (v) params[k] = v; });
      if (esAdmin) params.alcance = alcance;
      const { data } = await api.get('/compromisos', { params });
      setResp(data);
    } catch (e) {
      setError(e.response?.data?.error || 'No se pudieron cargar los compromisos');
    } finally {
      setLoading(false);
    }
  }, [estado, filtros, page, rowsPerPage, alcance, esAdmin]);
  useEffect(() => { cargar(); }, [cargar]);

  useEffect(() => {
    api.get('/compromisos/filtros', { params: esAdmin ? { alcance } : {} })
      .then((r) => setOpciones(r.data)).catch(() => {});
  }, [esAdmin, alcance]);

  const cargarResumenes = useCallback(async () => {
    if (!esAdmin) return;
    const pedir = (a) => api.get('/compromisos/resumen', { params: { alcance: a, meses: 12 } }).then((r) => r.data).catch(() => null);
    // La mentoría (solo lectura) existe únicamente para el mentor.
    const [propios, mentoria] = await Promise.all([pedir('propios'), esMentor ? pedir('mentoria') : Promise.resolve(null)]);
    setResumenes({ propios, mentoria });
  }, [esAdmin, esMentor]);
  useEffect(() => { cargarResumenes(); }, [cargarResumenes]);

  // El mentor parte en "Mentoría" si en sus locales administrados aún no hay compromisos.
  const alcanceInicialFijado = useRef(false);
  useEffect(() => {
    if (!esMentor || alcanceInicialFijado.current || !resumenes.propios || !resumenes.mentoria) return;
    alcanceInicialFijado.current = true;
    if ((resumenes.propios.totales?.asumidos || 0) === 0 && (resumenes.mentoria.totales?.asumidos || 0) > 0) setAlcance('mentoria');
  }, [esMentor, resumenes]);

  const alCambiar = () => { cargar(); cargarResumenes(); };
  const cambiarEstado = (v) => { setEstado(v); setPage(0); };
  const cambiarFiltro = (k, v) => { setFiltros((f) => ({ ...f, [k]: v })); setPage(0); };
  const cambiarAlcance = (v) => { if (!v) return; setAlcance(v); setFiltros((f) => ({ ...f, localId: '' })); setEstado('todos'); setPage(0); };
  const verMentoreado = (localId) => { setAlcance('mentoria'); setFiltros((f) => ({ ...f, localId })); setEstado('todos'); setPage(0); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const cerrarDetalle = () => { setDetalleId(null); onCerrarDetalle(); };
  const limpiar = () => { setFiltros({ localId: '', seccion: '', supervisorId: '', mes: '' }); setEstado('todos'); setPage(0); };

  const cn = resp.conteos;
  const resumenActual = resumenes[alcance];
  const mentoria = resumenes.mentoria;
  const tieneMentoria = esMentor && (mentoria?.totales?.asumidos || 0) > 0;

  const kpis = esAdmin
    ? [
      { label: 'POR ENTREGAR', value: cn.abierto + cn.vencido, color: cn.vencido > 0 ? '#a40000' : '#0a4a8a',
        sub: `${cn.vencido > 0 ? `${cn.vencido} vencido${cn.vencido > 1 ? 's' : ''} · ` : ''}sube la evidencia antes de la fecha límite` },
      { label: 'EN REVISIÓN', value: cn.en_revision, color: '#8a5200', sub: 'esperan la validación de la supervisora' },
      { label: 'CERRADOS', value: cn.cerrado, color: '#1b6b28', sub: 'compromisos cumplidos' },
    ]
    : [
      { label: 'ABIERTOS', value: cn.abierto, color: '#0a4a8a', sub: 'dentro de plazo' },
      { label: 'EN REVISIÓN', value: cn.en_revision, color: '#8a5200', sub: 'esperan validación' },
      { label: 'VENCIDOS', value: cn.vencido, color: '#a40000', sub: 'sin evidencia a la fecha' },
      { label: 'CERRADOS', value: cn.cerrado, color: '#1b6b28', sub: 'compromisos cumplidos' },
    ];

  const hayFiltros = Object.values(filtros).some(Boolean) || estado !== 'todos';

  return (
    <Box>
      {esMentor && (
        <ToggleButtonGroup exclusive value={alcance} onChange={(_, v) => cambiarAlcance(v)} sx={{ mb: 2 }} aria-label="Alcance">
          <ToggleButton value="propios" sx={{ px: 3, fontWeight: 700 }}>Mis locales</ToggleButton>
          <ToggleButton value="mentoria" sx={{ px: 3, fontWeight: 700 }}>
            Mentoría{mentoria ? ` (${mentoria.totalLocales} local${mentoria.totalLocales !== 1 ? 'es' : ''})` : ''}
          </ToggleButton>
        </ToggleButtonGroup>
      )}
      {esMentor && alcance === 'mentoria' && (
        <Alert severity="info" sx={{ mb: 2 }}>Seguimiento en solo lectura: la evidencia la sube el administrador de cada local.</Alert>
      )}

      <Box sx={{ ...gridKpis, mb: 2 }}>
        {kpis.map((k) => <KpiCard key={k.label} {...k} />)}
        {esAdmin && (
          <KpiCard label="CUMPLIMIENTO A TIEMPO" value={fmtPct(resumenActual?.pctATiempo)} color={colorBarra(resumenActual?.pctATiempo)}
            sub={`${alcance === 'mentoria' ? 'Locales que mentoreas' : 'Tus locales'} · ${resumenActual?.evaluacion || 'Sin datos'}`}>
            <Box mt={1}><BarraPct pct={resumenActual?.pctATiempo} /></Box>
          </KpiCard>
        )}
      </Box>

      <Paper sx={{ mb: 2, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Box display="flex" flexWrap="wrap" alignItems="center" justifyContent="space-between" gap={1} px={2}>
          <Tabs value={estado} onChange={(_, v) => cambiarEstado(v)} variant="scrollable" allowScrollButtonsMobile>
            {TABS.map((t) => (
              <Tab key={t.valor} value={t.valor}
                label={<Box display="flex" alignItems="center" gap={0.75}>{t.label}
                  <Chip size="small" label={cn[t.valor] ?? 0} sx={{ height: 20, fontSize: 12 }} /></Box>} />
            ))}
          </Tabs>
          <Box display="flex" flexWrap="wrap" gap={1.5} py={1}>
            <TextField select size="small" label="Local" value={filtros.localId} onChange={(e) => cambiarFiltro('localId', e.target.value)} sx={{ minWidth: 190 }}>
              <MenuItem value="">Todos los locales</MenuItem>
              {opciones.locales.map((l) => <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>)}
            </TextField>
            <TextField select size="small" label="Sección" value={filtros.seccion} onChange={(e) => cambiarFiltro('seccion', e.target.value)} sx={{ minWidth: 170 }}>
              <MenuItem value="">Ambas secciones</MenuItem>
              {SECCIONES.map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
            </TextField>
            {!esAdmin && (
              <TextField select size="small" label="Supervisora" value={filtros.supervisorId} onChange={(e) => cambiarFiltro('supervisorId', e.target.value)} sx={{ minWidth: 190 }}>
                <MenuItem value="">Todas las supervisoras</MenuItem>
                {opciones.supervisoras.map((s) => <MenuItem key={s._id} value={s._id}>{s.nombre}</MenuItem>)}
              </TextField>
            )}
            <TextField type="month" size="small" label="Mes de la revisión" value={filtros.mes} InputLabelProps={{ shrink: true }}
              onChange={(e) => cambiarFiltro('mes', e.target.value)} sx={{ width: 180 }} />
            {hayFiltros && <Button size="small" onClick={limpiar}>Limpiar</Button>}
          </Box>
        </Box>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : (
          <TableContainer>
            <Table size="small" sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={headRowSx}>
                  <TableCell sx={thSx}>Local</TableCell>
                  <TableCell sx={thSx}>Revisión</TableCell>
                  <TableCell sx={thSx}>Supervisora</TableCell>
                  <TableCell sx={thSx}>Sección y compromiso</TableCell>
                  <TableCell sx={thSx}>Responsable</TableCell>
                  <TableCell sx={thSx}>Fecha límite</TableCell>
                  <TableCell sx={thSx}>Estado</TableCell>
                  <TableCell sx={{ ...thSx, textAlign: 'center' }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {resp.data.map((c) => {
                  const vencido = c.estadoVisible === 'vencido';
                  return (
                    <TableRow key={c._id} hover sx={vencido ? { bgcolor: fondo('#c62828') } : undefined}>
                      <TableCell sx={{ fontWeight: 700 }}>{c.localNombre}</TableCell>
                      <TableCell>{fmtFechaISO(c.fechaRevision)}</TableCell>
                      <TableCell>{c.supervisorNombre}</TableCell>
                      <TableCell sx={{ maxWidth: 340 }}>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.4, color: 'text.secondary' }}>{c.seccionLabel.toUpperCase()}</Typography>
                        <Typography sx={{ fontSize: 13.5, lineHeight: 1.4 }}>{c.texto}</Typography>
                        {c.correcciones > 0 && c.estado === 'abierto' && (
                          <Chip size="small" label="Corrección pedida" sx={{ mt: 0.5, height: 20, fontSize: 11.5, fontWeight: 700, bgcolor: fondo('#e65100'), color: tono('#a84300') }} />
                        )}
                      </TableCell>
                      <TableCell>{c.responsableNombre}</TableCell>
                      <TableCell>
                        <Typography sx={{ fontSize: 13.5, fontWeight: vencido ? 700 : 500, color: vencido ? tono('#a40000') : 'text.primary' }}>{fmtFecha(c.fechaLimite)}</Typography>
                        <Typography sx={{ fontSize: 12, fontWeight: vencido ? 700 : 400, color: vencido ? tono('#a40000') : 'text.secondary' }}>
                          {c.estado === 'cerrado' ? `cerrado el ${fmtFechaISO(c.fechaCierre)}` : relativo(c.diasRestantes)}
                        </Typography>
                      </TableCell>
                      <TableCell><EstadoChip estado={c.estadoVisible} /></TableCell>
                      <TableCell align="center">
                        {c.puedeEnviarEvidencia ? (
                          <Button size="small" variant="contained" startIcon={<SendIcon />} onClick={() => setDetalleId(c._id)}
                            sx={{ borderRadius: 5, fontWeight: 700, whiteSpace: 'nowrap', bgcolor: '#f20000' }}>Enviar evidencia</Button>
                        ) : c.puedeRevisar ? (
                          <Button size="small" variant="outlined" onClick={() => setDetalleId(c._id)} sx={{ borderRadius: 5, fontWeight: 700 }}>Revisar</Button>
                        ) : (
                          <Tooltip title="Ver detalle">
                            <IconButton aria-label={`Ver compromiso de ${c.localNombre}`} onClick={() => setDetalleId(c._id)}><ViewIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
                {resp.data.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No hay compromisos para este filtro.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        )}
        <TablePagination component="div" count={resp.total} page={page} onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[10, 20, 50, 100]} labelRowsPerPage="Filas" />
      </Paper>

      {tieneMentoria && alcance === 'propios' && (
        <Box mt={4}>
          <Box display="flex" flexWrap="wrap" alignItems="baseline" justifyContent="space-between" gap={1}>
            <Typography variant="h6" fontWeight={500}>Locales que mentoreas</Typography>
            <Typography variant="caption" color="text.secondary">Solo lectura: la evidencia la sube el administrador de cada local.</Typography>
          </Box>
          <Box sx={{ mt: 1.5, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 2 }}>
            {mentoria.locales.map((l) => (
              <Paper key={l.localId} sx={{ p: 2.5, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
                  <Box>
                    <Typography fontWeight={700}>{l.localNombre}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Responsables: {(l.responsables || []).join(', ') || '—'}
                    </Typography>
                  </Box>
                  <SemaforoChip valor={l.evaluacion} />
                </Box>
                <Box display="flex" gap={4} mt={2}>
                  <Box><Typography sx={{ fontSize: 22, fontWeight: 800 }}>{l.asumidos}</Typography><Typography variant="caption" color="text.secondary">asumidos</Typography></Box>
                  <Box><Typography sx={{ fontSize: 22, fontWeight: 800, color: tono('#a40000') }}>{l.vencidos}</Typography><Typography variant="caption" color="text.secondary">vencidos</Typography></Box>
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1.5 }}>Cumplimiento a tiempo</Typography>
                <BarraPct pct={l.pctATiempo} />
                <Button size="small" sx={{ mt: 1, p: 0, fontWeight: 700 }} onClick={() => verMentoreado(l.localId)}>Ver compromisos</Button>
              </Paper>
            ))}
          </Box>
        </Box>
      )}

      <DetalleDialog id={detalleId} onClose={cerrarDetalle} onChanged={alCambiar} notificar={notificar} />
    </Box>
  );
}

// ─── Vista general (gerencia y master) ─────────────────────────────────────
function VistaGeneral({ onVerLocal, notificar }) {
  const { tono, fondo } = useTono();
  const [f, setF] = useState({ meses: 6, seccion: '', localId: '', administradorId: '', supervisorId: '' });
  const [topLocales, setTopLocales] = useState(10);
  const [r, setR] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [opciones, setOpciones] = useState({ locales: [], administradores: [], supervisoras: [] });
  const [exportando, setExportando] = useState(false);

  const paramsFiltro = useCallback(() => {
    const p = { meses: f.meses };
    ['seccion', 'localId', 'administradorId', 'supervisorId'].forEach((k) => { if (f[k]) p[k] = f[k]; });
    return p;
  }, [f]);

  useEffect(() => {
    let vigente = true;
    (async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await api.get('/compromisos/resumen', { params: { ...paramsFiltro(), top: topLocales } });
        if (vigente) setR(data);
      } catch (e) {
        if (vigente) setError(e.response?.data?.error || 'No se pudo cargar la vista general');
      } finally {
        if (vigente) setLoading(false);
      }
    })();
    return () => { vigente = false; };
  }, [paramsFiltro, topLocales]);

  useEffect(() => {
    api.get('/compromisos/filtros').then((res) => setOpciones(res.data)).catch(() => {});
  }, []);

  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));

  const exportar = async () => {
    setExportando(true);
    try {
      const [resRes, detRes] = await Promise.all([
        api.get('/compromisos/resumen', { params: { ...paramsFiltro(), top: 500 } }),
        api.get('/compromisos/exportar', { params: paramsFiltro() }),
      ]);
      const R = resRes.data;
      const wb = new ExcelJS.Workbook();
      const hoja = (nombre, columnas, filas) => {
        const ws = wb.addWorksheet(nombre);
        ws.columns = columnas.map((c) => ({ header: c.header, key: c.key, width: c.width || 16 }));
        filas.forEach((fila) => ws.addRow(fila));
        ws.getRow(1).eachCell((cell) => {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF20000' } };
          cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        });
        ws.views = [{ state: 'frozen', ySplit: 1 }];
        return ws;
      };

      hoja('Resumen', [{ header: 'Indicador', key: 'k', width: 34 }, { header: 'Valor', key: 'v', width: 18 }], [
        { k: 'Compromisos asumidos', v: R.totales.asumidos },
        { k: 'Abiertos', v: R.totales.abiertos },
        { k: 'En revisión', v: R.totales.enRevision },
        { k: 'Vencidos', v: R.totales.vencidos },
        { k: 'Cerrados', v: R.totales.cerrados },
        { k: 'Cumplimiento a tiempo (%)', v: R.pctATiempo ?? '' },
        { k: 'Cierre promedio (días)', v: R.cierrePromedioDias ?? '' },
        { k: 'Validación promedio (días)', v: R.validacionPromedioDias ?? '' },
        { k: 'Con corrección (%)', v: R.pctConCorreccion ?? '' },
        ...R.serie.map((s) => ({ k: `Mes ${s.mes}: asumidos / cerrados a tiempo / % a tiempo`, v: `${s.asumidos} / ${s.cerradosATiempo} / ${s.pctATiempo ?? '—'}` })),
        ...R.porSeccion.map((s) => ({ k: `${s.label}: asumidos / % a tiempo`, v: `${s.asumidos} / ${s.pctATiempo ?? '—'}` })),
      ]);
      hoja('Locales', [
        { header: 'Local', key: 'localNombre', width: 28 }, { header: 'Asumidos', key: 'asumidos' }, { header: 'Abiertos', key: 'abiertos' },
        { header: 'En revisión', key: 'enRevision' }, { header: 'Vencidos', key: 'vencidos' }, { header: 'Cerrados', key: 'cerrados' },
        { header: 'Cerrados a tiempo', key: 'cerradosATiempo' }, { header: '% a tiempo', key: 'pctATiempo' },
        { header: 'Cierre prom. (días)', key: 'cierrePromedioDias' }, { header: 'Evaluación', key: 'evaluacion' },
      ], R.locales);
      hoja('Administradores', [
        { header: 'Administrador', key: 'nombre', width: 28 }, { header: 'Locales con compromisos', key: 'localesConCompromisos' },
        { header: 'Asumidos', key: 'asumidos' }, { header: 'Vencidos', key: 'vencidos' }, { header: '% a tiempo', key: 'pctATiempo' },
        { header: 'Evaluación', key: 'evaluacion' }, { header: 'Mentor', key: 'mentor' },
      ], (R.administradores || []).map((a) => ({ ...a, mentor: a.esMentor ? 'Sí' : '' })));
      hoja('Supervisoras', [
        { header: 'Supervisora', key: 'nombre', width: 28 }, { header: 'Creados', key: 'creados' },
        { header: 'Por revisar', key: 'porRevisar' }, { header: 'Validación prom. (días)', key: 'validacionPromedioDias' },
      ], R.supervisoras || []);
      hoja('Compromisos', [
        { header: 'Local', key: 'localNombre', width: 26 }, { header: 'Fecha revisión', key: 'rev', width: 14 },
        { header: 'Supervisora', key: 'supervisorNombre', width: 20 }, { header: 'Sección', key: 'seccionLabel', width: 20 },
        { header: 'Compromiso', key: 'texto', width: 60 }, { header: 'Responsable', key: 'responsableNombre', width: 22 },
        { header: 'Fecha límite', key: 'lim', width: 14 }, { header: 'Estado', key: 'est', width: 14 },
        { header: 'Evidencias', key: 'evidenciasCount' }, { header: 'Correcciones', key: 'correcciones' },
        { header: 'Fecha cierre', key: 'cierre', width: 14 }, { header: 'Cerrado a tiempo', key: 'aTiempo', width: 16 },
      ], detRes.data.map((c) => ({
        ...c,
        rev: fmtFechaISO(c.fechaRevision),
        lim: fmtFecha(c.fechaLimite),
        est: ESTADOS[c.estadoVisible]?.label || c.estadoVisible,
        cierre: c.fechaCierre ? fmtFechaISO(c.fechaCierre) : '',
        aTiempo: c.estado === 'cerrado' ? (c.cerradoATiempo ? 'Sí' : 'No') : '',
      })));

      const hoy = new Date();
      await descargarWorkbook(wb, `compromisos_${String(hoy.getDate()).padStart(2, '0')}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${hoy.getFullYear()}.xlsx`);
    } catch (e) {
      notificar(e.response?.data?.error || 'No se pudo exportar', 'error');
    } finally {
      setExportando(false);
    }
  };

  const T = r?.totales;
  const maxAsum = Math.max(1, ...(r?.serie || []).map((s) => s.asumidos));
  const ALTO_BARRAS = 160;
  const segmentos = T ? [
    { k: 'Abiertos', n: T.abiertos, c: '#2a5fa8' },
    { k: 'En revisión', n: T.enRevision, c: '#d98a00' },
    { k: 'Vencidos', n: T.vencidos, c: '#c62828' },
    { k: 'Cerrados', n: T.cerrados, c: '#2e7d32' },
  ] : [];
  const select = (label, k, items, todos, ancho) => (
    <TextField select size="small" label={label} value={f[k]} onChange={(e) => set(k, e.target.value)} sx={{ minWidth: ancho }}>
      <MenuItem value="">{todos}</MenuItem>
      {items.map((o) => <MenuItem key={o._id} value={o._id}>{o.nombre}</MenuItem>)}
    </TextField>
  );

  return (
    <Box>
      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={1.5} mb={2}>
        <Box>
          <Typography variant="h6" fontWeight={500}>Vista general</Typography>
          <Typography variant="caption" color="text.secondary">Todos los locales · cumplimiento y seguimiento de los compromisos de las revisiones</Typography>
        </Box>
        <Button variant="outlined" color="inherit" onClick={exportar} disabled={exportando || loading}
          startIcon={exportando ? <CircularProgress size={16} color="inherit" /> : <DownloadIcon />}
          sx={{ borderRadius: 6, fontWeight: 700 }}>Exportar a Excel</Button>
      </Box>

      <Paper sx={{ p: 1.5, mb: 2, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', display: 'flex', flexWrap: 'wrap', gap: 1.5 }}>
        <TextField select size="small" label="Período" value={f.meses} onChange={(e) => set('meses', e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value={3}>Últimos 3 meses</MenuItem>
          <MenuItem value={6}>Últimos 6 meses</MenuItem>
          <MenuItem value={12}>Últimos 12 meses</MenuItem>
        </TextField>
        <TextField select size="small" label="Sección" value={f.seccion} onChange={(e) => set('seccion', e.target.value)} sx={{ minWidth: 170 }}>
          <MenuItem value="">Ambas secciones</MenuItem>
          {SECCIONES.map((s) => <MenuItem key={s.key} value={s.key}>{s.label}</MenuItem>)}
        </TextField>
        {select('Local', 'localId', opciones.locales, 'Todos los locales', 200)}
        {select('Administrador', 'administradorId', opciones.administradores, 'Todos los administradores', 200)}
        {select('Supervisora', 'supervisorId', opciones.supervisoras, 'Todas las supervisoras', 190)}
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && !r && <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>}

      {r && (
        <Box sx={{ opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }}>
          <Box sx={{ ...gridKpis, gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))' }}>
            <KpiCard label="ASUMIDOS" value={T.asumidos} color="#1f3d73"
              sub={r.deltaAsumidos == null ? 'en el período' : `${r.deltaAsumidos >= 0 ? '+' : ''}${r.deltaAsumidos} vs. mes anterior`} />
            <KpiCard label="CUMPLIMIENTO A TIEMPO" value={fmtPct(r.pctATiempo)} color={colorBarra(r.pctATiempo)}
              sub={`Cerrados dentro de plazo${r.deltaPuntosATiempo == null ? '' : ` · ${r.deltaPuntosATiempo >= 0 ? '+' : ''}${r.deltaPuntosATiempo} pp vs. mes anterior`}`}>
              <Box mt={1}><BarraPct pct={r.pctATiempo} ancho={60} /></Box>
              <Typography variant="caption" color="text.secondary">Meta: {r.metaCumplimiento}%</Typography>
            </KpiCard>
            <KpiCard label="VENCIDOS" value={T.vencidos} color="#a40000" sub={`${r.pctVencidos}% del total`} />
            <KpiCard label="CIERRE PROMEDIO" value={fmtDias(r.cierrePromedioDias)} color="#555555" sub="Desde que se acuerda" />
            <KpiCard label="VALIDACIÓN PROMEDIO" value={fmtDias(r.validacionPromedioDias)} color="#555555" sub="Lo que tarda la supervisora en revisar la evidencia" />
            <KpiCard label="CON CORRECCIÓN" value={fmtPct(r.pctConCorreccion)} color="#555555" sub="Compromisos a los que se pidió corregir evidencia" />
          </Box>

          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'stretch' }}>
            <Paper sx={{ flex: '1.6 1 520px', minWidth: 0, p: 2.5, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Box display="flex" flexWrap="wrap" justifyContent="space-between" gap={1}>
                <Typography fontWeight={500}>Evolución mensual</Typography>
                <Box display="flex" flexWrap="wrap" gap={2} sx={{ fontSize: 12.5, color: 'text.secondary' }}>
                  <Box display="flex" alignItems="center" gap={0.75}><Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#5b8bc9' }} />Asumidos</Box>
                  <Box display="flex" alignItems="center" gap={0.75}><Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: '#1f3d73' }} />Cerrados a tiempo</Box>
                  <span>Etiqueta: % a tiempo</span>
                </Box>
              </Box>
              <Box display="flex" gap={1} alignItems="flex-end" mt={2}>
                {r.serie.map((s) => (
                  <Box key={s.mes} sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <Box sx={{ height: ALTO_BARRAS + 24, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 0.75 }}>
                      {[{ v: s.asumidos, c: '#5b8bc9' }, { v: s.cerradosATiempo, c: '#1f3d73' }].map((b, i) => (
                        <Box key={i} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}>
                          <Typography sx={{ fontSize: 11.5, color: 'text.secondary' }}>{b.v}</Typography>
                          <Box sx={{ width: 26, height: Math.max(b.v ? 3 : 0, Math.round((b.v / maxAsum) * ALTO_BARRAS)), bgcolor: b.c, borderRadius: '4px 4px 0 0' }} />
                        </Box>
                      ))}
                    </Box>
                    <Box sx={{ width: '100%', borderTop: 1, borderColor: 'divider' }} />
                    <Typography sx={{ mt: 0.75, fontSize: 13 }}>{nombreMes(s.mes)}</Typography>
                    <Chip size="small" label={fmtPct(s.pctATiempo)} sx={{ mt: 0.75, bgcolor: fondo(SEMAFORO[s.evaluacion]), color: tono(SEMAFORO[s.evaluacion]), fontWeight: 700 }} />
                  </Box>
                ))}
              </Box>
            </Paper>

            <Paper sx={{ flex: '1 1 340px', minWidth: 0, p: 2.5, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Typography fontWeight={500}>Estado actual</Typography>
              {T.asumidos === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>Sin compromisos en el período.</Typography>
              ) : (
                <>
                  <Box sx={{ mt: 2, display: 'flex', gap: '2px', height: 28, borderRadius: 1.5, overflow: 'hidden' }} role="img"
                    aria-label={segmentos.map((s) => `${s.k}: ${s.n}`).join(', ')}>
                    {segmentos.filter((s) => s.n > 0).map((s) => <Box key={s.k} sx={{ flex: `${s.n} 1 0`, bgcolor: s.c }} />)}
                  </Box>
                  <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.75, fontSize: 13.5 }}>
                    {segmentos.map((s) => (
                      <Box key={s.k} display="flex" alignItems="center" gap={1}>
                        <Box sx={{ width: 12, height: 12, borderRadius: 0.5, bgcolor: s.c }} />
                        <Box sx={{ flex: 1 }}>{s.k}</Box>
                        <b>{s.n}</b>
                        <Box sx={{ width: 44, textAlign: 'right', color: 'text.secondary' }}>{Math.round((s.n / T.asumidos) * 100)}%</Box>
                      </Box>
                    ))}
                  </Box>
                </>
              )}
              <Typography sx={{ mt: 2.5, pt: 1.75, borderTop: 1, borderColor: 'divider', fontSize: 12, fontWeight: 700, letterSpacing: 0.5, color: 'text.secondary' }}>POR SECCIÓN</Typography>
              <Box sx={{ mt: 1.25, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                {r.porSeccion.map((s) => (
                  <Box key={s.seccion}>
                    <Box display="flex" justifyContent="space-between" sx={{ fontSize: 13.5 }}>
                      <span style={{ fontWeight: 500 }}>{s.label}</span><Box sx={{ color: 'text.secondary' }}>{s.asumidos} asumidos</Box>
                    </Box>
                    <Box mt={0.75}><BarraPct pct={s.pctATiempo} /></Box>
                  </Box>
                ))}
              </Box>
            </Paper>
          </Box>

          <Box sx={{ mt: 2, display: 'flex', flexWrap: 'wrap', gap: 2, alignItems: 'flex-start' }}>
            <Paper sx={{ flex: '1.5 1 600px', minWidth: 0, borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
              <Box px={2.5} pt={2.25} pb={1.5}>
                <Typography fontWeight={500}>Locales con menor cumplimiento</Typography>
                <Typography variant="caption" color="text.secondary">Ordenados de menor a mayor cumplimiento a tiempo</Typography>
              </Box>
              <TableContainer>
                <Table size="small" sx={{ minWidth: 700 }}>
                  <TableHead>
                    <TableRow sx={headRowSx}>
                      <TableCell sx={thSx}>Local</TableCell><TableCell sx={thSx}>Asumidos</TableCell><TableCell sx={thSx}>Vencidos</TableCell>
                      <TableCell sx={thSx}>Cumplimiento a tiempo</TableCell><TableCell sx={thSx}>Cierre prom.</TableCell>
                      <TableCell sx={thSx}>Evaluación</TableCell><TableCell sx={{ ...thSx, textAlign: 'center' }}>Ver</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {r.locales.map((l) => (
                      <TableRow key={l.localId} hover>
                        <TableCell sx={{ fontWeight: 700 }}>{l.localNombre}</TableCell>
                        <TableCell>{l.asumidos}</TableCell>
                        <TableCell sx={{ fontWeight: 700, color: l.vencidos > 0 ? tono('#a40000') : 'text.primary' }}>{l.vencidos}</TableCell>
                        <TableCell sx={{ minWidth: 170 }}><BarraPct pct={l.pctATiempo} /></TableCell>
                        <TableCell>{fmtDias(l.cierrePromedioDias)}</TableCell>
                        <TableCell><SemaforoChip valor={l.evaluacion} /></TableCell>
                        <TableCell align="center">
                          <Tooltip title="Ver los compromisos de este local">
                            <IconButton aria-label={`Ver compromisos de ${l.localNombre}`} onClick={() => onVerLocal(l.localId)}><ViewIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        </TableCell>
                      </TableRow>
                    ))}
                    {r.locales.length === 0 && (
                      <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin datos para este período.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
              <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="center" gap={1} px={2.5} py={1.25} sx={{ borderTop: 1, borderColor: 'divider', fontSize: 12.5, color: 'text.secondary' }}>
                <span>Bueno ≥ {r.metaCumplimiento}% · Regular 60–{r.metaCumplimiento - 1}% · Crítico &lt; 60%</span>
                {r.totalLocales > r.locales.length
                  ? <Button size="small" sx={{ fontWeight: 700 }} onClick={() => setTopLocales(500)}>Ver los {r.totalLocales} locales</Button>
                  : (topLocales > 10 && <Button size="small" sx={{ fontWeight: 700 }} onClick={() => setTopLocales(10)}>Ver menos</Button>)}
              </Box>
            </Paper>

            <Box sx={{ flex: '1 1 380px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <Box px={2.5} pt={2.25} pb={1.5}>
                  <Typography fontWeight={500}>Administradores · ejecución</Typography>
                  <Typography variant="caption" color="text.secondary">Cumplimiento a tiempo de sus locales</Typography>
                </Box>
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 380 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Administrador</TableCell><TableCell sx={{ fontWeight: 700 }}>Locales</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Asumidos</TableCell><TableCell sx={{ fontWeight: 700 }}>A tiempo</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(r.administradores || []).map((a) => (
                        <TableRow key={a.administradorId} hover>
                          <TableCell sx={{ fontWeight: 700 }}>
                            {a.nombre}
                            {a.esMentor && <Chip size="small" label="Mentor" sx={{ ml: 1, height: 20, fontSize: 11.5, fontWeight: 700, bgcolor: fondo('#6d28d9'), color: tono('#3b1e8a') }} />}
                          </TableCell>
                          <TableCell>{a.localesConCompromisos}</TableCell>
                          <TableCell>{a.asumidos}</TableCell>
                          <TableCell sx={{ minWidth: 150 }}><BarraPct pct={a.pctATiempo} /></TableCell>
                        </TableRow>
                      ))}
                      {(r.administradores || []).length === 0 && (
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin datos</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>

              <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                <Box px={2.5} pt={2.25} pb={1.5}>
                  <Typography fontWeight={500}>Supervisoras · seguimiento</Typography>
                  <Typography variant="caption" color="text.secondary">Quienes crean y validan los compromisos</Typography>
                </Box>
                <TableContainer>
                  <Table size="small" sx={{ minWidth: 380 }}>
                    <TableHead>
                      <TableRow sx={{ bgcolor: 'action.hover' }}>
                        <TableCell sx={{ fontWeight: 700 }}>Supervisora</TableCell><TableCell sx={{ fontWeight: 700 }}>Creados</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Por revisar</TableCell><TableCell sx={{ fontWeight: 700 }}>Validación prom.</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(r.supervisoras || []).map((s) => (
                        <TableRow key={s.supervisorId} hover>
                          <TableCell sx={{ fontWeight: 700 }}>{s.nombre}</TableCell>
                          <TableCell>{s.creados}</TableCell>
                          <TableCell>{s.porRevisar}</TableCell>
                          <TableCell sx={{ fontWeight: s.validacionPromedioDias >= 3 ? 700 : 500, color: s.validacionPromedioDias >= 3 ? tono('#a40000') : 'text.primary' }}>{fmtDias(s.validacionPromedioDias)}</TableCell>
                        </TableRow>
                      ))}
                      {(r.supervisoras || []).length === 0 && (
                        <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>Sin datos</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────
export default function Compromisos() {
  const { user } = useAuth();
  const esGlobal = ['master', 'gerencia'].includes(user?.rol);
  // Administrador y mentor suben evidencia en sus locales; solo el mentor tiene además "Mentoría" (solo lectura).
  const esAdmin = ['administrador', 'mentor'].includes(user?.rol);
  const esMentor = user?.rol === 'mentor';
  const [searchParams, setSearchParams] = useSearchParams();
  const [vista, setVista] = useState('seguimiento');
  const [localInicial, setLocalInicial] = useState('');
  const [claveSeg, setClaveSeg] = useState(0); // fuerza a recrear la lista al saltar desde la vista general
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });

  const notificar = (msg, sev = 'success') => setSnack({ open: true, msg, sev });
  const verLocal = (localId) => { setLocalInicial(localId); setClaveSeg((k) => k + 1); setVista('seguimiento'); };
  const cerrarDetalle = () => { if (searchParams.get('id')) setSearchParams({}, { replace: true }); };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box display="flex" flexWrap="wrap" justifyContent="space-between" alignItems="flex-start" gap={2}>
        <Box>
          <Typography variant="h5" fontWeight={500}>Compromisos</Typography>
          <Typography variant="caption" color="text.secondary">
            {esMentor
              ? 'Los de los locales que administras y el seguimiento de los que mentoreas'
              : esAdmin
                ? 'Los compromisos de tus locales: sube la evidencia antes de la fecha límite'
                : 'Seguimiento de los compromisos acordados en las revisiones'}
          </Typography>
        </Box>
        {esGlobal && (
          <ToggleButtonGroup exclusive size="small" value={vista} onChange={(_, v) => v && setVista(v)} aria-label="Vista">
            <ToggleButton value="seguimiento" sx={{ px: 2.5, fontWeight: 700 }}>Seguimiento</ToggleButton>
            <ToggleButton value="general" sx={{ px: 2.5, fontWeight: 700 }}>Vista general</ToggleButton>
          </ToggleButtonGroup>
        )}
      </Box>

      <Box mt={2}>
        {esGlobal && vista === 'general'
          ? <VistaGeneral onVerLocal={verLocal} notificar={notificar} />
          : <Seguimiento key={claveSeg} esAdmin={esAdmin} esMentor={esMentor} localInicial={localInicial}
              idAbrir={searchParams.get('id')} onCerrarDetalle={cerrarDetalle} notificar={notificar} />}
      </Box>

      <Snackbar open={snack.open} autoHideDuration={4500} onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
