// dashboard/src/pages/DashboardProducto.jsx
//
// Dashboard de Auditoría de Producto (basado en el de Supervisión). Lo ven master y gerencia.
//   · Resumen: KPIs, distribución por categoría, evolución, CUMPLIMIENTO POR SECCIÓN (con el % de cada
//     una y el plan de acción que le corresponde), locales y compromisos de Producto.
//   · Auditorías: lista con filtros y detalle (resumen, respuestas, plan de acción y compromisos).
//   · Comparativo: mapa de calor de locales por sección.
// Consume /auditorias-producto/{meses, resumen, plan, (lista), :id}.
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box, Grid, Typography, FormControl, InputLabel, Select, MenuItem, CircularProgress, Paper, Button,
  Tabs, Tab, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TablePagination, Checkbox,
  ListItemText, IconButton, Collapse, Dialog, DialogTitle, DialogContent, DialogActions, Tooltip, Alert, Snackbar,
} from '@mui/material';
import {
  Refresh as RefreshIcon, RestartAlt as RestartAltIcon, Download as DownloadIcon, Visibility as VisibilityIcon,
  DeleteOutlined as DeleteIcon, ExpandMore as ExpandMoreIcon, Close as CloseIcon,
} from '@mui/icons-material';
import {
  PieChart, Pie, Cell, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, LineChart, Line,
} from 'recharts';
import ExcelJS from 'exceljs';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

const CATEGORIAS = ['EXCELENTE', 'MUY BUENO', 'BUENO', 'REGULAR', 'MALO', 'PÉSIMO'];
const COLOR_CATEGORIA = { 'EXCELENTE': '#4caf50', 'MUY BUENO': '#8bc34a', 'BUENO': '#2196f3', 'REGULAR': '#ff9800', 'MALO': '#f44336', 'PÉSIMO': '#f20000' };
const CHIP = {
  'EXCELENTE': { bg: '#e3f4e5', fg: '#1b5e20' },
  'MUY BUENO': { bg: '#eaf5d7', fg: '#33691e' },
  'BUENO': { bg: '#e3f0fb', fg: '#0b4f8a' },
  'REGULAR': { bg: '#fff1dc', fg: '#7a4300' },
  'MALO': { bg: '#fde3e0', fg: '#8a1c14' },
  'PÉSIMO': { bg: '#f9d6d6', fg: '#7a0000' },
};
const NOMBRES_MES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const ESTADO_COMPROMISO = { abierto: 'Abierto', en_revision: 'En revisión', vencido: 'Vencido', cerrado: 'Cerrado' };

const labelMes = (valor) => { const [a, m] = String(valor).split('-').map(Number); return `${NOMBRES_MES[m - 1]} ${a}`; };
const labelMesCorto = (valor) => { const [a, m] = String(valor).split('-').map(Number); return `${NOMBRES_MES[m - 1].slice(0, 3)} ${String(a).slice(2)}`; };
const fmtPct = (n) => (n === null || n === undefined ? '—' : `${Number(n).toFixed(1).replace('.', ',')}%`);
const fmtNum = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(1).replace('.', ','));
const fmtFecha = (f) => {
  const d = new Date(f);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getUTCDate()).padStart(2, '0')}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${d.getUTCFullYear()}`;
};
const colorPct = (pct) => (pct === null || pct === undefined ? '#9e9e9e' : pct >= 80 ? '#2e7d32' : pct >= 70 ? '#ef6c00' : '#c62828');

// Dice el motivo real de un fallo de carga (antes: siempre el mismo mensaje genérico).
function motivoError(e, que) {
  const st = e && e.response && e.response.status;
  const msg = e && e.response && e.response.data && e.response.data.error;
  if (msg) return msg;
  if (!e || !e.response) return `${que}: no hay conexión con el servidor.`;
  if (st === 404) return `${que}: el servidor no tiene el módulo de Auditoría de Producto (error 404). Falta desplegar el servidor o registrar la ruta /api/auditorias-producto en server.js.`;
  if (st === 401) return 'Tu sesión expiró. Vuelve a iniciar sesión.';
  if (st === 403) return `${que}: no tienes acceso (error 403).`;
  return `${que} (error ${st}).`;
}

async function descargarWorkbook(workbook, nombreArchivo) {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/octet-stream' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nombreArchivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
}

function ChipCategoria({ categoria, size = 'medium' }) {
  if (!categoria) return <span>—</span>;
  const c = CHIP[categoria] || { bg: '#eee', fg: '#333' };
  return (
    <Box component="span" sx={{ display: 'inline-block', px: size === 'small' ? 1.2 : 1.75, py: size === 'small' ? 0.15 : 0.4, borderRadius: 3, bgcolor: c.bg, color: c.fg, fontWeight: 700, fontSize: size === 'small' ? 11.5 : 13, whiteSpace: 'nowrap' }}>
      {categoria}
    </Box>
  );
}

function KpiCard({ label, value, sub, color, children }) {
  return (
    <Paper sx={{ p: 3, borderRadius: 3, height: '100%', borderBottom: `3px solid ${color || '#e0e0e0'}`, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <Typography variant="body2" sx={{ color: 'text.secondary', letterSpacing: 0.5, fontWeight: 600, fontSize: 13 }}>{label.toUpperCase()}</Typography>
      <Typography variant="h3" fontWeight={800} sx={{ color: color || 'text.primary', mt: 0.75, fontSize: typeof value === 'string' && value.length > 14 ? 22 : undefined, lineHeight: 1.2 }}>{value}</Typography>
      {sub && <Typography variant="body2" color="text.secondary" fontSize={13} component="div">{sub}</Typography>}
      {children}
    </Paper>
  );
}

function BarraPct({ pct, grosor = 8 }) {
  return (
    <Box sx={{ height: grosor, borderRadius: grosor / 2, bgcolor: 'action.hover', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', width: `${Math.max(0, Math.min(pct || 0, 100))}%`, bgcolor: colorPct(pct), borderRadius: grosor / 2 }} />
    </Box>
  );
}

// Las acciones de un rango (tabla definida por el negocio)
function ListaAcciones({ acciones }) {
  return (
    <Box component="ol" sx={{ m: 0, p: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 1 }}>
      {(acciones || []).map((a, i) => (
        <Box component="li" key={i} sx={{ display: 'flex', gap: 1.25, alignItems: 'flex-start', p: 1.25, borderRadius: 2, bgcolor: 'action.hover' }}>
          <Box sx={{ flex: 'none', width: 22, height: 22, borderRadius: '50%', bgcolor: '#1a1a1a', color: '#fff', fontSize: 11.5, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</Box>
          <Typography variant="body2" sx={{ lineHeight: 1.5 }}>{a}</Typography>
        </Box>
      ))}
    </Box>
  );
}

function PlanDeCategoria({ categoria, plan, tituloPlan }) {
  const p = plan?.[categoria];
  if (!p) return null;
  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} flexWrap="wrap" mb={0.5}>
        <ChipCategoria categoria={categoria} size="small" />
        <Typography variant="caption" color="text.secondary">{p.rango}</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={1}>{tituloPlan}</Typography>
      <ListaAcciones acciones={p.acciones} />
    </Box>
  );
}

// ─── Una sección de "Cumplimiento por sección": % + categoría + el plan que le corresponde ───
function FilaSeccion({ s, plan, tituloPlan }) {
  const [abierta, setAbierta] = useState(false);
  const tiene = s.porcentaje !== null && s.porcentaje !== undefined;
  return (
    <Box sx={{ borderBottom: '1px solid', borderColor: 'divider', py: 1.25 }} data-testid={`seccion-${s.id}`}>
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
        <Typography variant="body2" sx={{ flex: '1 1 220px', minWidth: 0 }}>{s.nombre}</Typography>
        <Box sx={{ flex: '2 1 200px', minWidth: 140 }}><BarraPct pct={s.porcentaje} /></Box>
        <Typography variant="body2" fontWeight={800} sx={{ width: 64, textAlign: 'right', color: colorPct(s.porcentaje) }}>{fmtPct(s.porcentaje)}</Typography>
        <Box sx={{ width: 110 }}><ChipCategoria categoria={s.categoria} size="small" /></Box>
        <Tooltip title={abierta ? 'Ocultar el plan de acción' : 'Ver el plan de acción'}>
          <span>
            <IconButton size="small" disabled={!tiene} onClick={() => setAbierta((a) => !a)} aria-expanded={abierta}
              aria-label={`${abierta ? 'Ocultar' : 'Ver'} el plan de acción de ${s.nombre}`}>
              <ExpandMoreIcon sx={{ transform: abierta ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
      <Typography variant="caption" color="text.secondary">
        {tiene ? `${s.auditorias} auditoría${s.auditorias === 1 ? '' : 's'} · ${s.si} Sí · ${s.no} No · ${s.na} N/A` : 'Sin datos en el período'}
      </Typography>
      <Collapse in={abierta} unmountOnExit>
        <Box sx={{ mt: 1.5, p: 1.5, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>PLAN DE ACCIÓN · {s.nombre.toUpperCase()}</Typography>
          <PlanDeCategoria categoria={s.categoria} plan={plan} tituloPlan={tituloPlan} />
        </Box>
      </Collapse>
    </Box>
  );
}

// ═══════════════════════════════════════════════════════════════
// RESUMEN
// ═══════════════════════════════════════════════════════════════
function TabResumen({ resumen, plan, tituloPlan, onIrCompromisos }) {
  const distribucion = (resumen.distribucion || []).filter((d) => d.cantidad > 0).map((d) => ({ name: d.categoria, value: d.cantidad, color: COLOR_CATEGORIA[d.categoria] }));
  const serie = (resumen.serie || []).map((s) => ({ ...s, etiqueta: labelMesCorto(s.mes) }));
  const debil = resumen.seccionMasDebil;
  const comp = resumen.compromisos || {};
  const [localAbierto, setLocalAbierto] = useState(null);

  return (
    <>
      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Promedio general" value={fmtPct(resumen.promedioGeneral)} color={colorPct(resumen.promedioGeneral)}
            sub={<><ChipCategoria categoria={resumen.categoriaGeneral} size="small" /></>} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Auditorías" value={resumen.totalAuditorias} color="#1976d2" sub={`en ${resumen.totalLocales} local${resumen.totalLocales === 1 ? '' : 'es'}`} />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Locales bajo 70%" value={resumen.localesBajo70} color="#c62828" sub="MALO o PÉSIMO" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <KpiCard label="Sección más débil" value={debil ? debil.nombre : '—'} color="#424242" sub={debil ? `${fmtPct(debil.porcentaje)} en promedio` : 'Sin datos'} />
        </Grid>
      </Grid>

      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">DISTRIBUCIÓN POR CATEGORÍA</Typography>
            <Box display="flex" alignItems="center" gap={3} flexWrap="wrap" mt={1.5}>
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie data={distribucion} dataKey="value" nameKey="name" innerRadius={52} outerRadius={90}>
                    {distribucion.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <RechartsTooltip />
                </PieChart>
              </ResponsiveContainer>
              <Box>
                {(resumen.distribucion || []).map((d) => (
                  <Box key={d.categoria} display="flex" alignItems="center" gap={1} mb={0.75}>
                    <Box sx={{ width: 11, height: 11, borderRadius: '50%', bgcolor: COLOR_CATEGORIA[d.categoria] }} />
                    <Typography variant="body2" fontSize={14}>{d.categoria} {d.cantidad}</Typography>
                  </Box>
                ))}
              </Box>
            </Box>
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">EVOLUCIÓN DEL PROMEDIO (ÚLTIMOS 6 MESES)</Typography>
            <Box mt={1.5} sx={{ width: '100%', height: 210 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={serie} margin={{ top: 8, right: 16, bottom: 0, left: -12 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="etiqueta" tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tick={{ fontSize: 12 }} />
                  <RechartsTooltip formatter={(v) => (v === null ? 'Sin auditorías' : `${v}%`)} />
                  <Line type="monotone" dataKey="porcentaje" stroke="#1976d2" strokeWidth={3} dot={{ r: 4 }} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Cumplimiento por sección: % de cada una y el plan de acción */}
      <Paper sx={{ p: 3, mb: 3, borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">CUMPLIMIENTO POR SECCIÓN (ÁREA)</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Porcentaje de cada sección y el plan de acción que corresponde a su rango. Abre una sección para ver las acciones.
        </Typography>
        <Box>{(resumen.porSeccion || []).map((s) => <FilaSeccion key={s.id} s={s} plan={plan} tituloPlan={tituloPlan} />)}</Box>
      </Paper>

      <Grid container spacing={2} sx={{ mb: 3, width: '100%' }}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">PLAN DE ACCIÓN GENERAL</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Según el promedio general del período ({fmtPct(resumen.promedioGeneral)}).</Typography>
            {resumen.planGeneral
              ? <PlanDeCategoria categoria={resumen.planGeneral.categoria} plan={plan || { [resumen.planGeneral.categoria]: resumen.planGeneral }} tituloPlan={tituloPlan} />
              : <Typography variant="body2" color="text.secondary">Sin auditorías en el período.</Typography>}
          </Paper>
        </Grid>
        <Grid size={{ xs: 12, md: 5 }}>
          <Paper sx={{ p: 3, borderRadius: 3, height: '100%', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">COMPROMISOS DE PRODUCTO</Typography>
            <Grid container spacing={1.5} sx={{ mt: 0.5 }}>
              {[['Abiertos', comp.abiertos, '#1565c0'], ['En revisión', comp.enRevision, '#8a5200'], ['Vencidos', comp.vencidos, '#c62828'], ['Cerrados', comp.cerrados, '#2e7d32']].map(([l, v, c]) => (
                <Grid key={l} size={6}>
                  <Typography variant="h4" fontWeight={800} sx={{ color: c }}>{v ?? 0}</Typography>
                  <Typography variant="body2" color="text.secondary">{l}</Typography>
                </Grid>
              ))}
            </Grid>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1.5 }}>
              {comp.asumidos ? `${comp.asumidos} acordados · cumplimiento a tiempo ${comp.pctATiempo === null || comp.pctATiempo === undefined ? 'sin datos aún' : `${comp.pctATiempo}%`}` : 'Aún no hay compromisos de producto en el período.'}
            </Typography>
            <Button size="small" sx={{ mt: 1.5 }} variant="outlined" onClick={onIrCompromisos}>Ver compromisos de Producto</Button>
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <Box sx={{ p: 3, pb: 1.5 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary">LOCALES (DEL MÁS BAJO AL MÁS ALTO)</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                <TableCell>Local</TableCell><TableCell align="center">Auditorías</TableCell><TableCell>Promedio</TableCell>
                <TableCell>Categoría</TableCell><TableCell>Sección más débil</TableCell><TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {(resumen.locales || []).map((l) => (
                <React.Fragment key={l.localId}>
                  <TableRow hover>
                    <TableCell sx={{ fontWeight: 700 }}>{l.localNombre}</TableCell>
                    <TableCell align="center">{l.auditorias}</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: colorPct(l.porcentaje) }}>{fmtPct(l.porcentaje)}</TableCell>
                    <TableCell><ChipCategoria categoria={l.categoria} size="small" /></TableCell>
                    <TableCell>{l.seccionMasDebil ? `${l.seccionMasDebil.nombre} (${fmtPct(l.seccionMasDebil.porcentaje)})` : '—'}</TableCell>
                    <TableCell align="right">
                      <Button size="small" onClick={() => setLocalAbierto(localAbierto === l.localId ? null : l.localId)} aria-expanded={localAbierto === l.localId}>
                        {localAbierto === l.localId ? 'Ocultar plan' : 'Ver plan'}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {localAbierto === l.localId && (
                    <TableRow>
                      <TableCell colSpan={6} sx={{ bgcolor: 'action.hover' }}>
                        <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>PLAN DE ACCIÓN · {l.localNombre}</Typography>
                        <PlanDeCategoria categoria={l.categoria} plan={plan} tituloPlan={tituloPlan} />
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
              {(resumen.locales || []).length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin auditorías en el período</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// COMPARATIVO (mapa de calor)
// ═══════════════════════════════════════════════════════════════
const celda = (v) => {
  if (v === null || v === undefined) return { bg: 'transparent', fg: '#9e9e9e', w: 400 };
  if (v >= 90) return { bg: '#d8efdc', fg: '#14501e', w: 500 };
  if (v >= 80) return { bg: '#e9f5d9', fg: '#2f5d12', w: 500 };
  if (v >= 70) return { bg: '#fff1dc', fg: '#7a4300', w: 500 };
  if (v >= 60) return { bg: '#fde3e0', fg: '#8a1c14', w: 500 };
  return { bg: '#f9d6d6', fg: '#7a0000', w: 800 };
};
const CORTO = { arroz: 'Arroz y mise', salsas: 'Salsas y plaquetas', ceviche: 'Ceviche y salmón', cuartoCaliente: 'Cuarto caliente', materiasPrimas: 'Materias primas', productosTerminados: 'Prod. terminados', empaque: 'Empaque', equipos: 'Equipos', implementos: 'Implementos', bpm: 'Libro de BPM' };

function TabComparativo({ resumen, onExportar }) {
  const secs = resumen.porSeccion || [];
  return (
    <>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 1.5 }}>
        <Typography variant="body2" fontWeight={700}>Cumplimiento por sección:</Typography>
        {[['90% o más', 90], ['80 a 89,9%', 80], ['70 a 79,9%', 70], ['60 a 69,9%', 60], ['menos de 60%', 0]].map(([t, v]) => {
          const c = celda(v);
          return <Box key={t} component="span" sx={{ px: 1.25, py: 0.25, borderRadius: 1, bgcolor: c.bg, color: c.fg, fontSize: 12.5, fontWeight: c.w }}>{t}</Box>;
        })}
        <Button size="small" startIcon={<DownloadIcon />} onClick={onExportar} sx={{ ml: 'auto' }}>Exportar a Excel</Button>
      </Paper>
      <Paper sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 1100 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#e60000', '& th': { color: '#fff', fontWeight: 700, textAlign: 'center', borderBottom: 0 } }}>
                <TableCell sx={{ textAlign: 'left !important' }}>Local</TableCell>
                {secs.map((s) => <Tooltip key={s.id} title={s.nombre}><TableCell>{CORTO[s.id] || s.nombre}</TableCell></Tooltip>)}
                <TableCell sx={{ textAlign: 'left !important' }}>Total</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(resumen.locales || []).map((l) => (
                <TableRow key={l.localId}>
                  <TableCell component="th" scope="row" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{l.localNombre}</TableCell>
                  {secs.map((s) => {
                    const v = l.secciones?.[s.id];
                    const c = celda(v);
                    return <TableCell key={s.id} align="center" sx={{ bgcolor: c.bg, color: c.fg, fontWeight: c.w, borderBottom: '1px solid #fff' }}>{v === null || v === undefined ? '—' : fmtNum(v)}</TableCell>;
                  })}
                  <TableCell sx={{ whiteSpace: 'nowrap' }}><strong style={{ marginRight: 8 }}>{fmtPct(l.porcentaje)}</strong><ChipCategoria categoria={l.categoria} size="small" /></TableCell>
                </TableRow>
              ))}
              <TableRow sx={{ bgcolor: 'action.hover', '& td, & th': { fontWeight: 700 } }}>
                <TableCell component="th" scope="row">Promedio</TableCell>
                {secs.map((s) => <TableCell key={s.id} align="center">{fmtNum(s.porcentaje)}</TableCell>)}
                <TableCell>{fmtPct(resumen.promedioGeneral)}</TableCell>
              </TableRow>
              {(resumen.locales || []).length === 0 && (
                <TableRow><TableCell colSpan={12} align="center" sx={{ py: 4, color: 'text.secondary' }}>Sin auditorías en el período</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// DETALLE DE UNA AUDITORÍA
// ═══════════════════════════════════════════════════════════════
const VALOR_CHIP = { si: { t: 'Sí', bg: '#e3f4e5', fg: '#1b5e20' }, no: { t: 'No', bg: '#f9d6d6', fg: '#7a0000' }, na: { t: 'N/A', bg: '#eeeeee', fg: '#424242' } };

function DetalleDialog({ id, plan, tituloPlan, puedeEliminar, onClose, onEliminar, onVerCompromisos }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('resumen');
  const [confirmar, setConfirmar] = useState(false);

  useEffect(() => {
    let vivo = true;
    setData(null); setError(''); setTab('resumen');
    api.get(`/auditorias-producto/${id}`)
      .then((r) => { if (vivo) setData(r.data); })
      .catch((e) => { if (vivo) setError(motivoError(e, 'No se pudo cargar la auditoría')); });
    return () => { vivo = false; };
  }, [id]);

  const preguntasNo = data ? data.detalle.flatMap((s) => s.preguntas.filter((p) => p.valor === 'no').map((p) => ({ ...p, seccion: s.nombre }))) : [];
  const totales = data ? data.detalle.reduce((a, s) => ({ si: a.si + (s.si || 0), no: a.no + (s.no || 0), na: a.na + (s.na || 0) }), { si: 0, no: 0, na: 0 }) : null;

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth aria-labelledby="titulo-detalle-producto">
      <DialogTitle id="titulo-detalle-producto" sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{data ? data.localNombre : 'Auditoría de producto'}</Typography>
          {data && <Typography variant="body2" color="text.secondary">Auditoría de producto · {fmtFecha(data.fechaAuditoria)} · Auditora: {data.auditorNombre}</Typography>}
        </Box>
        <IconButton onClick={onClose} aria-label="Cerrar"><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {!data && !error && <Box display="flex" justifyContent="center" py={6}><CircularProgress /></Box>}
        {error && <Alert severity="error">{error}</Alert>}
        {data && (
          <>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, borderRadius: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 2, bgcolor: 'action.hover' }}>
              <Box display="flex" alignItems="center" gap={2}>
                <Typography variant="h3" fontWeight={800} data-testid="detalle-pct">{fmtPct(data.porcentajeTotal)}</Typography>
                <Box>
                  <ChipCategoria categoria={data.categoria} />
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{fmtNum(data.puntosTotal)} puntos · rango {data.planAccion?.rango}</Typography>
                </Box>
              </Box>
              <Box display="flex" gap={3}>
                {[['Sí', totales.si, '#1b6b28'], ['No', totales.no, '#a40000'], ['N/A', totales.na, '#4a4a4a']].map(([l, v, c]) => (
                  <Box key={l} textAlign="center"><Typography variant="h5" fontWeight={800} sx={{ color: c }}>{v}</Typography><Typography variant="caption" color="text.secondary">{l}</Typography></Box>
                ))}
              </Box>
            </Paper>

            <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 2, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
              <Tab label="Resumen" value="resumen" />
              <Tab label="Respuestas (75)" value="respuestas" />
              <Tab label="Plan de acción" value="plan" />
            </Tabs>

            {tab === 'resumen' && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 7 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">PUNTAJE POR SECCIÓN (10 PUNTOS CADA UNA)</Typography>
                  <Table size="small">
                    <TableHead><TableRow sx={{ '& th': { fontWeight: 500, color: 'text.secondary' } }}>
                      <TableCell>Sección</TableCell><TableCell align="center">Sí</TableCell><TableCell align="center">No</TableCell><TableCell align="center">N/A</TableCell><TableCell sx={{ width: 150 }}>Cumplimiento</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {data.detalle.map((s, i) => (
                        <TableRow key={s.id}>
                          <TableCell><Box component="span" sx={{ color: 'text.secondary', fontWeight: 700, mr: 0.75 }}>{i + 1}</Box>{s.nombre}</TableCell>
                          <TableCell align="center">{s.si}</TableCell><TableCell align="center">{s.no}</TableCell><TableCell align="center">{s.na}</TableCell>
                          <TableCell>
                            <Box display="flex" alignItems="center" gap={1}>
                              <Box sx={{ flex: 1 }}><BarraPct pct={s.porcentaje} grosor={6} /></Box>
                              <Typography variant="body2" fontWeight={700} sx={{ width: 52, textAlign: 'right' }}>{fmtPct(s.porcentaje)}</Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Grid>
                <Grid size={{ xs: 12, md: 5 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">PREGUNTAS RESPONDIDAS CON “NO” ({preguntasNo.length})</Typography>
                  <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 1, maxHeight: 360, overflowY: 'auto' }}>
                    {preguntasNo.length === 0 && <Typography variant="body2" color="text.secondary">Ninguna.</Typography>}
                    {preguntasNo.map((p) => (
                      <Box key={p.n} sx={{ p: 1.25, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                        <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                          <Box component="span" sx={{ px: 1, borderRadius: 1, bgcolor: '#fde3e0', color: '#8a1c14', fontSize: 12, fontWeight: 700 }}>N° {p.n}</Box>
                          <Typography variant="caption" color="text.secondary">{p.seccion}</Typography>
                        </Box>
                        <Typography variant="body2" sx={{ mt: 0.5 }}>{p.texto}</Typography>
                        {p.observacion && <Typography variant="caption" sx={{ display: 'block', mt: 0.5, p: 0.75, borderRadius: 1, bgcolor: 'action.hover' }}><strong>Observación: </strong>{p.observacion}</Typography>}
                      </Box>
                    ))}
                  </Box>
                </Grid>
              </Grid>
            )}

            {tab === 'respuestas' && (
              <Box>
                {data.detalle.map((s, i) => (
                  <Box key={s.id} sx={{ mb: 2.5 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="baseline" sx={{ borderBottom: '2px solid', borderColor: 'divider', pb: 0.5, mb: 0.5 }}>
                      <Typography variant="subtitle2" fontWeight={700}>{i + 1}. {s.nombre}</Typography>
                      <Typography variant="subtitle2" fontWeight={800} sx={{ color: colorPct(s.porcentaje) }}>{fmtPct(s.porcentaje)}</Typography>
                    </Box>
                    {s.preguntas.map((p) => {
                      const v = VALOR_CHIP[p.valor] || { t: '—', bg: '#eee', fg: '#333' };
                      return (
                        <Box key={p.n} sx={{ display: 'flex', gap: 1.5, py: 0.75, alignItems: 'flex-start', borderBottom: '1px solid', borderColor: 'divider' }}>
                          <Typography variant="caption" color="text.secondary" sx={{ width: 24, pt: 0.4, fontWeight: 700 }}>{p.n}</Typography>
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2">{p.texto}</Typography>
                            {p.observacion && <Typography variant="caption" color="text.secondary" display="block">Observación: {p.observacion}</Typography>}
                          </Box>
                          <Box component="span" sx={{ px: 1.25, py: 0.15, borderRadius: 3, bgcolor: v.bg, color: v.fg, fontSize: 12, fontWeight: 700, minWidth: 34, textAlign: 'center' }}>{v.t}</Box>
                        </Box>
                      );
                    })}
                  </Box>
                ))}
                {data.observacionesEquipo && (
                  <Box><Typography variant="caption" fontWeight={700} color="text.secondary">OBSERVACIONES DEL EQUIPO</Typography><Typography variant="body2" sx={{ mt: 0.5 }}>{data.observacionesEquipo}</Typography></Box>
                )}
              </Box>
            )}

            {tab === 'plan' && (
              <Grid container spacing={3}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>PLAN DE ACCIÓN · {data.categoria}</Typography>
                  {data.planAccion && (
                    <>
                      <Typography variant="caption" color="text.secondary" display="block" mb={1}>{data.tituloPlan || tituloPlan} · rango {data.planAccion.rango}</Typography>
                      <ListaAcciones acciones={data.planAccion.acciones} />
                    </>
                  )}
                </Grid>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={1}>COMPROMISOS ({(data.compromisos || []).length})</Typography>
                  {(data.compromisos || []).length === 0 && <Typography variant="body2" color="text.secondary">No se acordaron compromisos en esta auditoría.</Typography>}
                  {(data.compromisos || []).map((c) => (
                    <Box key={c._id} sx={{ p: 1.25, mb: 1, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
                      <Typography variant="body2">{c.texto}</Typography>
                      <Typography variant="caption" color="text.secondary">{c.responsableNombre} · vence {String(c.fechaLimite).split('-').reverse().join('-')} · {ESTADO_COMPROMISO[c.estadoVisible] || c.estadoVisible}</Typography>
                    </Box>
                  ))}
                  {(data.compromisos || []).length > 0 && <Button size="small" variant="outlined" onClick={onVerCompromisos}>Ver seguimiento en Compromisos</Button>}
                </Grid>
              </Grid>
            )}
          </>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        {puedeEliminar && data && <Button color="error" startIcon={<DeleteIcon />} onClick={() => setConfirmar(true)} sx={{ mr: 'auto' }}>Eliminar</Button>}
        <Button variant="contained" onClick={onClose}>Cerrar</Button>
      </DialogActions>

      <Dialog open={confirmar} onClose={() => setConfirmar(false)}>
        <DialogTitle>Eliminar auditoría</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Se eliminará la auditoría de <strong>{data?.localNombre}</strong> del {data && fmtFecha(data.fechaAuditoria)} y también sus {(data?.compromisos || []).length} compromiso(s) con su evidencia e historial. Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmar(false)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => { setConfirmar(false); onEliminar(id); }}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

// ═══════════════════════════════════════════════════════════════
// AUDITORÍAS (lista)
// ═══════════════════════════════════════════════════════════════
function TabAuditorias({ params, secciones, recarga, puedeEliminar, onVer, onEliminarFila }) {
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState(20);
  const [seccionDebil, setSeccionDebil] = useState('');
  const [datos, setDatos] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => { setPage(0); }, [params, seccionDebil]);
  useEffect(() => {
    let vivo = true;
    setLoading(true); setError('');
    api.get('/auditorias-producto', { params: { ...params, ...(seccionDebil ? { seccionDebil } : {}), page: page + 1, limit: rows } })
      .then((r) => { if (vivo) setDatos(r.data); })
      .catch((e) => { if (vivo) setError(motivoError(e, 'No se pudo cargar la lista')); })
      .finally(() => { if (vivo) setLoading(false); });
    return () => { vivo = false; };
  }, [params, seccionDebil, page, rows, recarga]);

  const exportar = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Auditorías de producto');
    ws.columns = [{ header: 'Local', key: 'local', width: 26 }, { header: 'Fecha', key: 'fecha', width: 12 }, { header: 'Auditora', key: 'auditora', width: 22 },
      { header: 'Total %', key: 'pct', width: 10 }, { header: 'Categoría', key: 'cat', width: 14 }, { header: 'Sección más débil', key: 'debil', width: 40 }, { header: '% sección más débil', key: 'pdebil', width: 18 }];
    ws.getRow(1).font = { bold: true };
    let pagina = 1, total = 0;
    do {
      const { data } = await api.get('/auditorias-producto', { params: { ...params, ...(seccionDebil ? { seccionDebil } : {}), page: pagina, limit: 100 } });
      total = data.total;
      data.data.forEach((a) => ws.addRow({ local: a.localNombre, fecha: fmtFecha(a.fechaAuditoria), auditora: a.auditorNombre, pct: a.porcentajeTotal, cat: a.categoria, debil: a.seccionMasDebil?.nombre || '', pdebil: a.seccionMasDebil?.porcentaje ?? '' }));
      pagina++;
    } while ((pagina - 1) * 100 < total && pagina < 60);
    await descargarWorkbook(wb, 'auditorias-producto.xlsx');
  };

  return (
    <>
      <Paper sx={{ p: 2, mb: 2, borderRadius: 3, display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 2 }}>
        <FormControl size="small" sx={{ minWidth: 260 }}>
          <InputLabel>Sección más débil</InputLabel>
          <Select value={seccionDebil} label="Sección más débil" onChange={(e) => setSeccionDebil(e.target.value)}>
            <MenuItem value="">Cualquiera</MenuItem>
            {secciones.map((s) => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<DownloadIcon />} onClick={exportar} sx={{ ml: 'auto' }}>Exportar a Excel</Button>
        {loading && <CircularProgress size={20} />}
      </Paper>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Paper sx={{ borderRadius: 3, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#e60000', '& th': { color: '#fff', fontWeight: 700, borderBottom: 0 } }}>
                <TableCell>Local</TableCell><TableCell>Fecha</TableCell><TableCell>Auditora</TableCell><TableCell>Total</TableCell>
                <TableCell>Categoría</TableCell><TableCell>Sección más débil</TableCell><TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {datos.data.map((a) => (
                <TableRow key={a._id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{a.localNombre}</TableCell>
                  <TableCell>{fmtFecha(a.fechaAuditoria)}</TableCell>
                  <TableCell>{a.auditorNombre}</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>{fmtPct(a.porcentajeTotal)}</TableCell>
                  <TableCell><ChipCategoria categoria={a.categoria} size="small" /></TableCell>
                  <TableCell>{a.seccionMasDebil ? `${a.seccionMasDebil.nombre} (${fmtPct(a.seccionMasDebil.porcentaje)})` : '—'}</TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver detalle"><IconButton size="small" onClick={() => onVer(a._id)} aria-label={`Ver detalle de ${a.localNombre}`}><VisibilityIcon /></IconButton></Tooltip>
                    {puedeEliminar && <Tooltip title="Eliminar"><IconButton size="small" color="error" onClick={() => onEliminarFila(a)} aria-label={`Eliminar auditoría de ${a.localNombre}`}><DeleteIcon /></IconButton></Tooltip>}
                  </TableCell>
                </TableRow>
              ))}
              {!loading && datos.data.length === 0 && (
                <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.secondary' }}>No hay auditorías con estos filtros</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination component="div" count={datos.total || 0} page={page} onPageChange={(e, p) => setPage(p)} rowsPerPage={rows}
          onRowsPerPageChange={(e) => { setRows(parseInt(e.target.value, 10)); setPage(0); }} rowsPerPageOptions={[10, 20, 50]}
          labelRowsPerPage="Filas" labelDisplayedRows={({ from, to, count }) => `${from}–${to} de ${count}`} />
      </Paper>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════
// PÁGINA
// ═══════════════════════════════════════════════════════════════
export default function DashboardProducto() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const puedeEliminar = ['master', 'gerencia'].includes(user?.rol);

  const [tab, setTab] = useState('resumen'); // 'resumen' | 'auditorias' | 'comparativo'
  const [meses, setMeses] = useState([]);
  const [locales, setLocales] = useState([]);
  const [plan, setPlan] = useState(null);
  const [mes, setMes] = useState('');
  const [localIds, setLocalIds] = useState([]);
  const [categoria, setCategoria] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detalleId, setDetalleId] = useState(null);
  const [recarga, setRecarga] = useState(0);
  const [snack, setSnack] = useState({ open: false, msg: '', sev: 'success' });
  const [aEliminar, setAEliminar] = useState(null);

  useEffect(() => {
    api.get('/auditorias-producto/meses').then((r) => { setMeses(r.data || []); if ((r.data || []).length > 0) setMes(r.data[0]); }).catch(() => {});
    api.get('/estadisticas/mis-locales').then((r) => setLocales(r.data || [])).catch(() => {});
    api.get('/auditorias-producto/plan').then((r) => setPlan(r.data)).catch(() => {});
  }, []);

  const params = useMemo(() => {
    const p = {};
    if (mes) p.mes = mes;
    if (localIds.length > 0) p.localId = localIds.join(',');
    if (categoria.length > 0) p.categoria = categoria.join(',');
    return p;
  }, [mes, localIds, categoria]);

  const cargar = useCallback(() => {
    setLoading(true); setError('');
    api.get('/auditorias-producto/resumen', { params })
      .then((r) => setResumen(r.data))
      .catch((e) => setError(motivoError(e, 'No se pudo cargar el dashboard de Producto')))
      .finally(() => setLoading(false));
  }, [params]);
  useEffect(() => { cargar(); }, [cargar]);

  const resetFiltros = () => { setLocalIds([]); setCategoria([]); if (meses.length > 0) setMes(meses[0]); };
  const notificar = (msg, sev = 'success') => setSnack({ open: true, msg, sev });

  const eliminar = async (id) => {
    try {
      await api.delete(`/auditorias-producto/${id}`);
      setDetalleId(null); setAEliminar(null); setRecarga((n) => n + 1); cargar();
      notificar('Auditoría eliminada');
    } catch (e) {
      notificar(e.response?.data?.error || 'No se pudo eliminar', 'error');
    }
  };

  const exportarComparativo = async () => {
    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Comparativo');
    const secs = resumen.porSeccion || [];
    ws.columns = [{ header: 'Local', key: 'local', width: 26 }, { header: 'Auditorías', key: 'n', width: 11 }, ...secs.map((s) => ({ header: `${s.nombre} (%)`, key: s.id, width: 22 })), { header: 'Total %', key: 'total', width: 10 }, { header: 'Categoría', key: 'cat', width: 14 }];
    ws.getRow(1).font = { bold: true };
    (resumen.locales || []).forEach((l) => ws.addRow({ local: l.localNombre, n: l.auditorias, ...Object.fromEntries(secs.map((s) => [s.id, l.secciones?.[s.id] ?? ''])), total: l.porcentaje, cat: l.categoria }));
    const prom = ws.addRow({ local: 'Promedio', ...Object.fromEntries(secs.map((s) => [s.id, s.porcentaje ?? ''])), total: resumen.promedioGeneral, cat: resumen.categoriaGeneral });
    prom.font = { bold: true };
    await descargarWorkbook(wb, 'comparativo-producto.xlsx');
  };

  return (
    <Box sx={{ width: '100%', maxWidth: '100%' }}>
      <Box display="flex" alignItems="flex-end" justifyContent="space-between" flexWrap="wrap" gap={2} mb={2}>
        <Box>
          <Typography variant="h5" fontWeight={500}>Auditoría de Producto</Typography>
          <Typography variant="body2" color="text.secondary">
            {resumen ? `${resumen.totalAuditorias} auditorías · ${resumen.totalLocales} locales` : 'Calificación del producto y de las buenas prácticas (BPM) en cada local'}
          </Typography>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Mes</InputLabel>
          <Select value={mes} label="Mes" onChange={(e) => setMes(e.target.value)}>
            <MenuItem value="">Todos</MenuItem>
            {meses.map((m) => <MenuItem key={m} value={m} sx={{ textTransform: 'capitalize' }}>{labelMes(m)}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 230 }}>
          <InputLabel>Local</InputLabel>
          <Select multiple value={localIds} label="Local" onChange={(e) => setLocalIds(e.target.value)}
            renderValue={(sel) => (sel.length === 0 ? 'Todos' : sel.length === 1 ? (locales.find((l) => l._id === sel[0])?.nombre || '') : `${sel.length} locales seleccionados`)}>
            {locales.map((l) => (
              <MenuItem key={l._id} value={l._id}><Checkbox size="small" checked={localIds.indexOf(l._id) > -1} /><ListItemText primary={l.nombre} /></MenuItem>
            ))}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 170 }}>
          <InputLabel>Categoría</InputLabel>
          <Select multiple value={categoria} label="Categoría" onChange={(e) => setCategoria(e.target.value)}
            renderValue={(sel) => (sel.length === 0 ? 'Todas' : sel.length === 1 ? sel[0] : `${sel.length} categorías`)}>
            {CATEGORIAS.map((c) => (
              <MenuItem key={c} value={c}><Checkbox size="small" checked={categoria.indexOf(c) > -1} /><ListItemText primary={c} /></MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button size="small" startIcon={<RestartAltIcon />} onClick={resetFiltros}>Resetear</Button>
        <Button size="small" onClick={() => { cargar(); setRecarga((n) => n + 1); }} startIcon={<RefreshIcon fontSize="small" />} sx={{ ml: 'auto' }}>Actualizar</Button>
        {loading && <CircularProgress size={20} />}
      </Paper>

      <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ mb: 3, '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' } }}>
        <Tab label="Resumen" value="resumen" />
        <Tab label="Auditorías" value="auditorias" />
        <Tab label="Comparativo por local y sección" value="comparativo" />
      </Tabs>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {tab === 'resumen' && resumen && <TabResumen resumen={resumen} plan={plan?.plan} tituloPlan={plan?.titulo || resumen.tituloPlan} onIrCompromisos={() => navigate('/compromisos-producto')} />}
      {tab === 'comparativo' && resumen && <TabComparativo resumen={resumen} onExportar={exportarComparativo} />}
      {tab === 'auditorias' && (
        <TabAuditorias params={params} secciones={plan?.secciones || []} recarga={recarga} puedeEliminar={puedeEliminar}
          onVer={setDetalleId} onEliminarFila={setAEliminar} />
      )}

      {detalleId && (
        <DetalleDialog id={detalleId} plan={plan?.plan} tituloPlan={plan?.titulo} puedeEliminar={puedeEliminar} onClose={() => setDetalleId(null)} onEliminar={eliminar}
          onVerCompromisos={() => navigate('/compromisos-producto')} />
      )}

      <Dialog open={!!aEliminar} onClose={() => setAEliminar(null)}>
        <DialogTitle>Eliminar auditoría</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            ¿Eliminar la auditoría de <strong>{aEliminar?.localNombre}</strong> del {aEliminar && fmtFecha(aEliminar.fechaAuditoria)}? También se eliminarán sus compromisos con su evidencia e historial. No se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAEliminar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => eliminar(aEliminar._id)}>Eliminar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={snack.open} autoHideDuration={4000} onClose={() => setSnack((s) => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snack.sev} variant="filled" onClose={() => setSnack((s) => ({ ...s, open: false }))}>{snack.msg}</Alert>
      </Snackbar>
    </Box>
  );
}
