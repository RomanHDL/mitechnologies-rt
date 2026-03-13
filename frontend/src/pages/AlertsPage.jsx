import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'

import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import RefreshIcon from '@mui/icons-material/Refresh'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import VisibilityIcon from '@mui/icons-material/Visibility'
import InventoryIcon from '@mui/icons-material/Inventory'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import PlaceIcon from '@mui/icons-material/Place'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'

import dayjs from 'dayjs'

const SEVERITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'CRITICA', label: 'Critica' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'ACTIVA', label: 'Activa' },
  { value: 'RECONOCIDA', label: 'Reconocida' },
  { value: 'RESUELTA', label: 'Resuelta' },
]

/* ── Severity helpers ── */
function severityTone(sev) {
  if (sev === 'CRITICA') return 'bad'
  if (sev === 'ALTA') return 'warn'
  if (sev === 'MEDIA') return 'info'
  return 'default'
}

function severityColor(sev) {
  if (sev === 'CRITICA') return '#EF4444'
  if (sev === 'ALTA') return '#F59E0B'
  if (sev === 'MEDIA') return '#FACC15'
  return '#3B82F6'
}

function statusTone(st) {
  if (st === 'ACTIVA') return 'bad'
  if (st === 'RECONOCIDA') return 'warn'
  if (st === 'RESUELTA') return 'ok'
  return 'default'
}

/* ── Pulsing dot for CRITICAL severity ── */
const pulseKeyframes = `
@keyframes pulse-dot {
  0%   { box-shadow: 0 0 0 0 rgba(239,68,68,.55); }
  70%  { box-shadow: 0 0 0 8px rgba(239,68,68,0); }
  100% { box-shadow: 0 0 0 0 rgba(239,68,68,0); }
}
`

function SeverityDot({ severity }) {
  const color = severityColor(severity)
  const isCritical = severity === 'CRITICA'
  return (
    <>
      {isCritical && <style>{pulseKeyframes}</style>}
      <Box
        component="span"
        sx={{
          display: 'inline-block',
          width: 10,
          height: 10,
          borderRadius: '50%',
          bgcolor: color,
          mr: 1,
          verticalAlign: 'middle',
          ...(isCritical && {
            animation: 'pulse-dot 1.4s infinite',
          }),
        }}
      />
    </>
  )
}

/* ── Alert type icon mapping ── */
function AlertTypeIcon({ type }) {
  const t = (type || '').toLowerCase()
  if (t.includes('stock') || t.includes('inventar') || t.includes('minimo'))
    return <Tooltip title="Stock"><InventoryIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle', opacity: 0.7 }} /></Tooltip>
  if (t.includes('expir') || t.includes('venc') || t.includes('caduc'))
    return <Tooltip title="Vencimiento"><AccessTimeIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle', opacity: 0.7 }} /></Tooltip>
  if (t.includes('ubic') || t.includes('location') || t.includes('lugar'))
    return <Tooltip title="Ubicacion"><PlaceIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle', opacity: 0.7 }} /></Tooltip>
  return <Tooltip title="Alerta"><NotificationsActiveIcon fontSize="small" sx={{ mr: 0.5, verticalAlign: 'middle', opacity: 0.7 }} /></Tooltip>
}

/* ── Auto-refresh interval (ms) ── */
const AUTO_REFRESH_MS = 60_000

export default function AlertsPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [severityFilter, setSeverityFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [checking, setChecking] = useState(false)
  const [bulkAcking, setBulkAcking] = useState(false)

  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  /* ── Last-updated timestamp ── */
  const [lastUpdated, setLastUpdated] = useState(null)

  const load = useCallback(async () => {
    try {
      const res = await client.get('/api/alerts')
      setRows(Array.isArray(res.data) ? res.data : [])
      setLastUpdated(new Date())
    } catch (e) { console.error('Error loading alerts:', e) }
  }, [client])

  /* Initial load */
  useEffect(() => { load() }, [load])

  /* ── Auto-refresh every 60 seconds ── */
  useEffect(() => {
    const id = setInterval(() => { load() }, AUTO_REFRESH_MS)
    return () => clearInterval(id)
  }, [load])

  const checkNow = async () => {
    setChecking(true)
    try {
      await client.post('/api/alerts/check')
      await load()
    } catch (e) { console.error('Error checking alerts:', e) }
    finally { setChecking(false) }
  }

  const acknowledge = async (id) => {
    try {
      await client.patch('/api/alerts/' + id + '/acknowledge')
      await load()
    } catch (e) { console.error('Error acknowledging:', e) }
  }

  const resolve = async (id) => {
    try {
      await client.patch('/api/alerts/' + id + '/resolve')
      await load()
    } catch (e) { console.error('Error resolving:', e) }
  }

  /* ── Bulk acknowledge all active alerts ── */
  const acknowledgeAll = async () => {
    setBulkAcking(true)
    try {
      const activeAlerts = rows.filter(r => (r.status || '') === 'ACTIVA')
      await Promise.all(
        activeAlerts.map(r => client.patch('/api/alerts/' + (r.id || r._id) + '/acknowledge'))
      )
      await load()
    } catch (e) { console.error('Error bulk acknowledging:', e) }
    finally { setBulkAcking(false) }
  }

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      const qq = q.toLowerCase()
      list = list.filter(r =>
        (r.message || '').toLowerCase().includes(qq) ||
        (r.sku || '').toLowerCase().includes(qq) ||
        (r.type || '').toLowerCase().includes(qq)
      )
    }
    if (severityFilter) list = list.filter(r => (r.severity || '') === severityFilter)
    if (statusFilter) list = list.filter(r => (r.status || '') === statusFilter)
    return list
  }, [rows, q, severityFilter, statusFilter])

  /* ── KPI counts (based on ALL rows, not filtered) ── */
  const kpis = useMemo(() => ({
    totalActivas: rows.filter(r => (r.status || '') !== 'RESUELTA').length,
    criticas: rows.filter(r => (r.severity || '') === 'CRITICA' && (r.status || '') !== 'RESUELTA').length,
    advertencias: rows.filter(r => (r.severity || '') === 'ALTA' && (r.status || '') !== 'RESUELTA').length,
    resueltas: rows.filter(r => (r.status || '') === 'RESUELTA').length,
  }), [rows])

  /* ── Summary for filter chips (based on filtered) ── */
  const resumen = useMemo(() => ({
    total: filtered.length,
    activas: filtered.filter(r => (r.status || '') === 'ACTIVA').length,
    reconocidas: filtered.filter(r => (r.status || '') === 'RECONOCIDA').length,
    resueltas: filtered.filter(r => (r.status || '') === 'RESUELTA').length,
  }), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => setShowDetail(false)

  const activeCount = rows.filter(r => (r.status || '') === 'ACTIVA').length

  return (
    <Box sx={ps.page}>
      {/* ── Header ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Alertas de Inventario</Typography>
          <Typography sx={ps.pageSubtitle}>Monitoreo de stock minimo, vencimientos y anomalias</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          {/* Last updated indicator */}
          {lastUpdated && (
            <Typography sx={{ ...ps.cellTextSecondary, fontSize: 12, whiteSpace: 'nowrap' }}>
              Actualizado: {dayjs(lastUpdated).format('HH:mm:ss')}
            </Typography>
          )}
          {/* Manual refresh */}
          <Tooltip title="Actualizar datos">
            <IconButton size="small" sx={ps.actionBtn('primary')} onClick={load}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {/* Bulk acknowledge */}
          <Tooltip title="Marcar todas como leidas">
            <span>
              <Button
                variant="outlined"
                size="small"
                startIcon={bulkAcking ? <CircularProgress size={16} color="inherit" /> : <DoneAllIcon />}
                onClick={acknowledgeAll}
                disabled={bulkAcking || activeCount === 0}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700 }}
              >
                Marcar todas como leidas
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={checking ? <CircularProgress size={18} color="inherit" /> : <RefreshIcon />}
            onClick={checkNow}
            disabled={checking}
            sx={{ borderRadius: 2 }}
          >
            {checking ? 'Verificando...' : 'Verificar Ahora'}
          </Button>
        </Stack>
      </Stack>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper sx={ps.kpiCard('blue')}>
            <Typography sx={{ ...ps.cellTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Total alertas activas
            </Typography>
            <Typography variant="h4" sx={{ ...ps.pageTitle, mt: 0.5 }}>
              {kpis.totalActivas}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={ps.kpiCard('red')}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ErrorOutlineIcon sx={{ fontSize: 16, color: '#EF4444' }} />
              <Typography sx={{ ...ps.cellTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Criticas
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ ...ps.pageTitle, mt: 0.5, color: '#EF4444' }}>
              {kpis.criticas}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={ps.kpiCard('amber')}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <ReportProblemIcon sx={{ fontSize: 16, color: '#F59E0B' }} />
              <Typography sx={{ ...ps.cellTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Advertencias
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ ...ps.pageTitle, mt: 0.5, color: '#F59E0B' }}>
              {kpis.advertencias}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper sx={ps.kpiCard('green')}>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <CheckCircleIcon sx={{ fontSize: 16, color: '#22C55E' }} />
              <Typography sx={{ ...ps.cellTextSecondary, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Resueltas
              </Typography>
            </Stack>
            <Typography variant="h4" sx={{ ...ps.pageTitle, mt: 0.5, color: '#22C55E' }}>
              {kpis.resueltas}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Filter chips ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip icon={<WarningAmberIcon sx={{ color: 'inherit' }} />} label={'Activas: ' + resumen.activas} sx={ps.metricChip('bad')} />
        <Chip label={'Reconocidas: ' + resumen.reconocidas} sx={ps.metricChip('warn')} />
        <Chip icon={<CheckCircleIcon sx={{ color: 'inherit' }} />} label={'Resueltas: ' + resumen.resueltas} sx={ps.metricChip('ok')} />
      </Stack>

      {/* ── Search & filters ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar mensaje, SKU o tipo" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 260 }} />
        <TextField select label="Severidad" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 160 }}>
          {SEVERITY_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
        <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 160 }}>
          {STATUS_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
      </Stack>

      {/* ── Alerts table ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Fecha</TableCell>
            <TableCell>Tipo</TableCell>
            <TableCell>Severidad</TableCell>
            <TableCell>Mensaje</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell>Status</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map((r, idx) => {
              const id = r.id || r._id
              const st = r.status || 'ACTIVA'
              const sev = r.severity || 'MEDIA'
              const isActive = st === 'ACTIVA'
              const isAcked = st === 'RECONOCIDA'
              const isResolved = st === 'RESUELTA'
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell sx={ps.cellText}>
                    <Stack direction="row" alignItems="center">
                      <AlertTypeIcon type={r.type} />
                      {r.type || '-'}
                    </Stack>
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    <Stack direction="row" alignItems="center">
                      <SeverityDot severity={sev} />
                      <Chip size="small" label={sev} sx={ps.metricChip(severityTone(sev))} />
                    </Stack>
                  </TableCell>
                  <TableCell sx={{ ...ps.cellText, maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.message || '-'}><span>{r.message || '-'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.sku || '-'}</TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={st} sx={ps.metricChip(statusTone(st))} /></TableCell>
                  <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}><InfoIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    {isActive && (
                      <Tooltip title="Reconocer">
                        <IconButton size="small" sx={ps.actionBtn('warning')} onClick={() => acknowledge(id)}><VisibilityIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {(isActive || isAcked) && (
                      <Tooltip title="Resolver">
                        <IconButton size="small" sx={ps.actionBtn('success')} onClick={() => resolve(id)}><DoneAllIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (
              <TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin alertas para mostrar.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* ── Detail dialog ── */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Alerta</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Tipo:</b>{' '}
                <AlertTypeIcon type={selected.type} />
                {selected.type || '-'}
              </Typography>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Severidad:</b>{' '}
                <SeverityDot severity={selected.severity || 'MEDIA'} />
                <Chip size="small" label={selected.severity || 'MEDIA'} sx={ps.metricChip(severityTone(selected.severity || 'MEDIA'))} />
              </Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Status:</b> <Chip size="small" label={selected.status || 'ACTIVA'} sx={ps.metricChip(statusTone(selected.status || 'ACTIVA'))} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Mensaje:</b> {selected.message || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>SKU:</b> {selected.sku || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Stock actual:</b> {selected.currentStock != null ? selected.currentStock : '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Stock minimo:</b> {selected.minStock != null ? selected.minStock : '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Reconocido por:</b> {selected.acknowledgedBy?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Resuelto por:</b> {selected.resolvedBy?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Fecha:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
