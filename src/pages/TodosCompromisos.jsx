import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, TablePagination, CircularProgress, Chip, TextField, MenuItem, InputAdornment,
  ToggleButton, ToggleButtonGroup, Snackbar, Alert, Tooltip, Button,
} from '@mui/material';
import { Search as SearchIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { KpiCard, EstadoChip, DetalleDialog, useTono } from './Compromisos';
import CompromisoMentoriaDialog from '../components/CompromisoMentoriaDialog';

// ────────────────────────────────────────────────────────────
// Todos los compromisos: Supervisión (compromisos de revisión) + Mentoría y Tutoría
// en una sola vista. No usa un endpoint propio: pide a los dos módulos que ya
// existen, y cada uno aplica sus propios permisos (administrador: sus locales;
// mentor: sus tres listas; gerencia/master: todo).
// ────────────────────────────────────────────────────────────

const ESTADO_INFO = {
  abierto: { label: 'ABIERTOS', color: '#0a4a8a', sub: 'dentro de plazo' },
  en_revision: { label: 'EN REVISIÓN', color: '#8a5200', sub: 'esperan validación' },
  vencido: { label: 'VENCIDOS', color: '#a40000', sub: 'sin evidencia a la fecha' },
  cerrado: { label: 'CERRADOS', color: '#1b6b28', sub: 'compromisos cumplidos' },
};
const ORDEN_ESTADOS = ['abierto', 'en_revision', 'vencido', 'cerrado'];

const ORIGEN = {
  revision: { label: 'Supervisión', color: '#c62828' },
  mentoria: { label: 'Mentoría', color: '#1e5aa8' },
  tutoria: { label: 'Tutoría', color: '#00897b' },
};

const PESTANAS = [
  { valor: 'pendientes', label: 'Pendientes' },
  { valor: 'vencido', label: 'Vencidos' },
  { valor: 'abierto', label: 'Abiertos' },
  { valor: 'en_revision', label: 'En revisión' },
  { valor: 'cerrado', label: 'Cerrados' },
  { valor: 'todos', label: 'Todos' },
];
const ESTADOS_DE_PESTANA = {
  pendientes: ['vencido', 'abierto', 'en_revision'],
  vencido: ['vencido'], abierto: ['abierto'], en_revision: ['en_revision'], cerrado: ['cerrado'],
  todos: ['vencido', 'abierto', 'en_revision', 'cerrado'],
};

const PAGINA = 100;      // máximo que acepta /compromisos por página
const MAX_PAGINAS = 20;  // tope de seguridad (2.000 compromisos por estado)

const pct = (n, total) => (total ? Math.round((n / total) * 1000) / 10 : 0);
const conteosVacios = () => ({ abierto: 0, en_revision: 0, vencido: 0, cerrado: 0 });

// Fechas: los de revisión vienen como "YYYY-MM-DD"; los de mentoría como ISO
const aFecha = (v) => {
  if (!v) return null;
  const d = /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T12:00:00`) : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
};
const fmtFecha = (d) => (d ? d.toLocaleDateString('es-CL') : '—');
const diasHasta = (d) => {
  if (!d) return null;
  const hoy = new Date(); hoy.setHours(12, 0, 0, 0);
  const f = new Date(d); f.setHours(12, 0, 0, 0);
  return Math.round((f - hoy) / 864e5);
};

// ── Normalización: los dos tipos de compromiso con la misma forma ──
function desdeRevision(c, soloLectura) {
  const fecha = aFecha(c.fechaLimite);
  return {
    clave: `rev:${c._id}`,
    origen: 'revision',
    id: c._id,
    localId: String(c.localId || ''),
    localNombre: c.localNombre,
    titulo: c.texto,
    detalle: `${c.seccionLabel || c.seccion || ''}${c.fechaRevision ? ` · revisión del ${fmtFecha(aFecha(c.fechaRevision))}` : ''}`,
    responsable: c.responsableNombre || '—',
    asignadoPor: c.supervisorNombre || '—',
    fecha,
    dias: c.diasRestantes ?? diasHasta(fecha),
    estado: c.estadoVisible || c.estado,
    soloLectura,
  };
}

function desdeMentoria(c) {
  const fecha = aFecha(c.fechaCompromiso);
  const tipo = c.tipo === 'tutoria' ? 'tutoria' : 'mentoria';
  return {
    clave: `men:${c.mentoriaId}:${c._id}`,
    origen: tipo,
    id: c._id,
    mentoriaId: c.mentoriaId,
    localId: String(c.localId || ''),
    localNombre: c.localNombre,
    titulo: c.compromisoAlumno,
    detalle: `${String(c.preguntaNumero).padStart(2, '0')} · ${c.ambito || ''} · ${c.puntaje}/10`,
    responsable: c.responsable || '—',
    asignadoPor: c.mentorNombre || '—',
    fecha,
    dias: diasHasta(fecha),
    estado: c.estado === 'abierto' && c.vencido ? 'vencido' : c.estado,
    soloLectura: c.miRol === 'supervisor', // el supervisor los ve, pero no actúa sobre ellos
    original: c,
  };
}

const ordenar = (a, b) => {
  const peso = { vencido: 0, abierto: 1, en_revision: 2, cerrado: 3 };
  return (peso[a.estado] - peso[b.estado]) || ((a.fecha?.getTime() || 0) - (b.fecha?.getTime() || 0)) || String(a.localNombre).localeCompare(String(b.localNombre));
};

export default function TodosCompromisos() {
  const { user } = useAuth();
  const { tono, fondo } = useTono();
  const rol = user?.rol;
  const esMentor = rol === 'mentor';

  const [pestana, setPestana] = useState('pendientes');
  const [origen, setOrigen] = useState('todos');
  const [localId, setLocalId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [locales, setLocales] = useState([]);

  const [revision, setRevision] = useState({ items: [], conteos: conteosVacios(), disponible: true });
  const [mentoria, setMentoria] = useState({ items: [], disponible: true });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);

  const [detRevision, setDetRevision] = useState(null);
  const [detMentoria, setDetMentoria] = useState(null);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const notificar = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  useEffect(() => {
    api.get('/locales/activos').then((r) => setLocales(r.data || [])).catch(() => setLocales([]));
  }, []);

  // ── Compromisos de revisión (paginado en el servidor: se traen todas las páginas) ──
  const traerRevision = useCallback(async (estados) => {
    // El mentor tiene dos alcances que no se cruzan: "propios" (locales que administra)
    // y "mentoria" (locales que mentorea o tutorea, solo lectura)
    const alcances = esMentor ? ['propios', 'mentoria'] : [null];
    const conteos = conteosVacios();
    const vistos = new Map();
    for (const alcance of alcances) {
      let conteosDelAlcance = null;
      for (const estado of estados) {
        let pagina = 1;
        let recibidos = 0;
        let total = 0;
        do {
          const params = { estado, page: pagina, limit: PAGINA };
          if (alcance) params.alcance = alcance;
          if (localId) params.localId = localId;
          const { data } = await api.get('/compromisos', { params });
          (data.data || []).forEach((c) => { if (!vistos.has(c._id)) vistos.set(c._id, desdeRevision(c, alcance === 'mentoria')); });
          recibidos += (data.data || []).length;
          total = data.total || 0;
          conteosDelAlcance = conteosDelAlcance || data.conteos;
          pagina += 1;
        } while (recibidos < total && pagina <= MAX_PAGINAS);
      }
      if (!estados.length) {
        // Sin estados que listar: igual se piden los conteos (1 resultado basta)
        const params = { estado: 'todos', page: 1, limit: 1 };
        if (alcance) params.alcance = alcance;
        if (localId) params.localId = localId;
        const { data } = await api.get('/compromisos', { params });
        conteosDelAlcance = data.conteos;
      }
      ORDEN_ESTADOS.forEach((e) => { conteos[e] += conteosDelAlcance?.[e] || 0; });
    }
    return { items: [...vistos.values()], conteos };
  }, [esMentor, localId]);

  const cargar = useCallback(async () => {
    setLoading(true);
    const estados = ESTADOS_DE_PESTANA[pestana];
    const [rev, men] = await Promise.allSettled([
      traerRevision(origen === 'revision' || origen === 'todos' ? estados : []),
      api.get('/mentorias/compromisos', { params: localId ? { localId } : {} }),
    ]);
    if (rev.status === 'fulfilled') setRevision({ ...rev.value, disponible: true });
    else setRevision({ items: [], conteos: conteosVacios(), disponible: rev.reason?.response?.status !== 403 });
    if (men.status === 'fulfilled') setMentoria({ items: (men.value.data || []).map(desdeMentoria), disponible: true });
    // 403: el rol no tiene Mentorías (supervisor) → se muestra solo Supervisión
    else setMentoria({ items: [], disponible: men.reason?.response?.status !== 403 ? true : false });
    setLoading(false);
  }, [pestana, origen, localId, traerRevision]);

  useEffect(() => { cargar(); }, [cargar]);
  useEffect(() => { setPage(0); }, [pestana, origen, localId, busqueda]);

  // ── Conteos por origen (Mentoría y Tutoría se calculan de la lista completa) ──
  const conteosMentoria = useMemo(() => {
    const c = { mentoria: conteosVacios(), tutoria: conteosVacios() };
    mentoria.items.forEach((i) => { c[i.origen][i.estado] = (c[i.origen][i.estado] || 0) + 1; });
    return c;
  }, [mentoria.items]);

  const conteos = useMemo(() => {
    const total = conteosVacios();
    const sumar = (c) => ORDEN_ESTADOS.forEach((e) => { total[e] += c[e] || 0; });
    if (origen === 'todos' || origen === 'revision') sumar(revision.conteos);
    if (origen === 'todos' || origen === 'mentoria') { sumar(conteosMentoria.mentoria); sumar(conteosMentoria.tutoria); }
    return total;
  }, [origen, revision.conteos, conteosMentoria]);
  const totalConteos = ORDEN_ESTADOS.reduce((s, e) => s + conteos[e], 0);

  const desglose = (estado) => {
    const partes = [];
    if (origen !== 'mentoria') partes.push(`Supervisión ${revision.conteos[estado] || 0}`);
    if (origen !== 'revision' && mentoria.disponible) {
      partes.push(`Mentoría ${conteosMentoria.mentoria[estado] || 0}`);
      if (conteosMentoria.tutoria[estado]) partes.push(`Tutoría ${conteosMentoria.tutoria[estado]}`);
    }
    return partes.join(' · ');
  };

  // ── Lista visible ──
  const lista = useMemo(() => {
    const estados = new Set(ESTADOS_DE_PESTANA[pestana]);
    const q = busqueda.trim().toLowerCase();
    const items = [
      ...(origen === 'todos' || origen === 'revision' ? revision.items : []),
      ...(origen === 'todos' || origen === 'mentoria' ? mentoria.items : []),
    ];
    return items
      .filter((i) => estados.has(i.estado))
      .filter((i) => !q || [i.localNombre, i.titulo, i.responsable, i.asignadoPor, i.detalle].some((t) => String(t || '').toLowerCase().includes(q)))
      .sort(ordenar);
  }, [pestana, origen, busqueda, revision.items, mentoria.items]);

  const visibles = lista.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const abrir = (i) => {
    if (i.origen === 'revision') setDetRevision(i.id);
    else setDetMentoria(i);
  };

  const subtitulo = {
    administrador: 'Todos los compromisos de tus locales, de supervisión y de mentoría, en un solo lugar.',
    mentor: 'Tus locales como administrador, mentor y tutor: compromisos de supervisión y de mentoría juntos.',
    supervisor: 'Compromisos de supervisión y, en solo lectura, los de mentoría y tutoría de todos los locales.',
    supervisorinterno: 'Compromisos de supervisión de tus locales.',
  }[rol] || 'Compromisos de supervisión y de mentoría de todos los locales.';

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={2} flexWrap="wrap">
        <Box>
          <Typography variant="h5" fontWeight={500}>Todos los compromisos</Typography>
          <Typography variant="caption" color="text.secondary">{subtitulo}</Typography>
        </Box>
        <Button startIcon={<RefreshIcon />} onClick={cargar} disabled={loading}>Actualizar</Button>
      </Box>

      {/* ─── Tarjetas con % ─── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2, mt: 2 }}>
        {ORDEN_ESTADOS.map((e) => (
          <KpiCard key={e} label={ESTADO_INFO[e].label} value={conteos[e]} pct={pct(conteos[e], totalConteos)}
            color={ESTADO_INFO[e].color} sub={`${ESTADO_INFO[e].sub} · ${desglose(e)}`} />
        ))}
      </Box>

      {/* ─── Distribución ─── */}
      {totalConteos > 0 && (
        <Paper sx={{ p: 2, mt: 2, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <Box display="flex" justifyContent="space-between" mb={1}>
            <Typography variant="body2" fontWeight={700}>Distribución de {totalConteos} compromisos</Typography>
            <Typography variant="body2" color="text.secondary">
              Cumplidos {String(pct(conteos.cerrado, totalConteos)).replace('.', ',')}% · Vencidos {String(pct(conteos.vencido, totalConteos)).replace('.', ',')}%
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', bgcolor: 'action.hover' }}>
            {ORDEN_ESTADOS.filter((e) => conteos[e] > 0).map((e) => (
              <Tooltip key={e} title={`${ESTADO_INFO[e].label}: ${conteos[e]} (${String(pct(conteos[e], totalConteos)).replace('.', ',')}%)`}>
                <Box sx={{ width: `${pct(conteos[e], totalConteos)}%`, bgcolor: tono(ESTADO_INFO[e].color) }} />
              </Tooltip>
            ))}
          </Box>
        </Paper>
      )}

      {/* ─── Filtros ─── */}
      <Paper sx={{ mt: 2, mb: 2, p: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <ToggleButtonGroup exclusive size="small" value={origen} onChange={(_, v) => v && setOrigen(v)}>
          <ToggleButton value="todos" sx={{ fontWeight: 700, px: 2 }}>Todos</ToggleButton>
          <ToggleButton value="revision" sx={{ fontWeight: 700, px: 2 }}>Supervisión</ToggleButton>
          {mentoria.disponible && <ToggleButton value="mentoria" sx={{ fontWeight: 700, px: 2 }}>Mentoría y tutoría</ToggleButton>}
        </ToggleButtonGroup>
        {locales.length > 1 && (
          <TextField select size="small" label="Local" value={localId} onChange={(e) => setLocalId(e.target.value)} sx={{ width: 200 }}>
            <MenuItem value="">Todos</MenuItem>
            {locales.map((l) => <MenuItem key={l._id} value={l._id}>{l.nombre}</MenuItem>)}
          </TextField>
        )}
        <TextField size="small" placeholder="Buscar compromiso, responsable…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
          sx={{ flex: 1, minWidth: 220 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }} />
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Tabs value={pestana} onChange={(_, v) => setPestana(v)} variant="scrollable" allowScrollButtonsMobile sx={{ px: 1, borderBottom: 1, borderColor: 'divider' }}>
          {PESTANAS.map((p) => <Tab key={p.valor} value={p.valor} label={p.label} />)}
        </Tabs>
        {loading ? (
          <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>
        ) : (
          <>
            <TableContainer sx={{ maxHeight: 640 }}>
              <Table stickyHeader size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Origen</TableCell>
                    <TableCell>Local</TableCell>
                    <TableCell>Compromiso</TableCell>
                    <TableCell>Responsable</TableCell>
                    <TableCell>Fecha límite</TableCell>
                    <TableCell>Asignado por</TableCell>
                    <TableCell>Estado</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibles.map((i) => {
                    const o = ORIGEN[i.origen];
                    const vencido = i.estado === 'vencido';
                    return (
                      <TableRow key={i.clave} hover sx={{ cursor: 'pointer' }} onClick={() => abrir(i)}>
                        <TableCell>
                          <Chip size="small" label={o.label} sx={{ bgcolor: fondo(o.color), color: tono(o.color), fontWeight: 700 }} />
                          {i.soloLectura && <Typography variant="caption" display="block" color="text.secondary">solo lectura</Typography>}
                        </TableCell>
                        <TableCell><b>{i.localNombre}</b></TableCell>
                        <TableCell sx={{ maxWidth: 380 }}>
                          <Typography variant="body2">{i.titulo}</Typography>
                          <Typography variant="caption" color="text.secondary">{i.detalle}</Typography>
                        </TableCell>
                        <TableCell>{i.responsable}</TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap', color: vencido ? tono('#a40000') : 'inherit', fontWeight: vencido ? 700 : 400 }}>
                          {fmtFecha(i.fecha)}
                          {i.estado !== 'cerrado' && i.dias != null && (
                            <Typography variant="caption" display="block" color={vencido ? 'inherit' : 'text.secondary'}>
                              {i.dias < 0 ? `hace ${-i.dias} día${i.dias === -1 ? '' : 's'}` : i.dias === 0 ? 'vence hoy' : `en ${i.dias} día${i.dias === 1 ? '' : 's'}`}
                            </Typography>
                          )}
                        </TableCell>
                        <TableCell>{i.asignadoPor}</TableCell>
                        <TableCell><EstadoChip estado={i.estado} /></TableCell>
                      </TableRow>
                    );
                  })}
                  {visibles.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>No hay compromisos con estos filtros.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination component="div" count={lista.length} page={page} rowsPerPage={rowsPerPage}
              onPageChange={(_, p) => setPage(p)} onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
              rowsPerPageOptions={[25, 50, 100]} labelRowsPerPage="Filas por página"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
          </>
        )}
      </Paper>

      {/* Detalle de Supervisión: el mismo diálogo de Compromisos Revisión (sin eliminar desde aquí) */}
      <DetalleDialog id={detRevision} onClose={() => setDetRevision(null)} onChanged={cargar} notificar={notificar} />

      {/* Detalle de Mentoría / Tutoría */}
      <CompromisoMentoriaDialog
        open={!!detMentoria}
        mentoriaId={detMentoria?.mentoriaId}
        compromiso={detMentoria?.original}
        contexto={detMentoria ? `${detMentoria.localNombre} · ${ORIGEN[detMentoria.origen].label}` : ''}
        onClose={() => setDetMentoria(null)}
        onActualizado={cargar}
      />

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
