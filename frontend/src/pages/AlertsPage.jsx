import React, { useEffect, useMemo, useState } from 'react'
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

import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import InfoIcon from '@mui/icons-material/Info'
import RefreshIcon from '@mui/icons-material/Refresh'
import DoneAllIcon from '@mui/icons-material/DoneAll'
import VisibilityIcon from '@mui/icons-material/Visibility'

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

function severityTone(sev) {
  if (sev === 'CRITICA') return 'bad'
  if (sev === 'ALTA') return 'warn'
  if (sev === 'MEDIA') return 'info'
  return 'default'
}

function statusTone(st) {
  if (st === 'ACTIVA') return 'bad'
  if (st === 'RECONOCIDA') return 'warn'
  if (st === 'RESUELTA') return 'ok'
  return 'default'
}

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

  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const load = async () => {
    try {
      const res = await client.get('/api/alerts')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading alerts:', e) }
  }

  useEffect(() => { load() }, [token])

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

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Alertas de Inventario</Typography>
          <Typography sx={ps.pageSubtitle}>Monitoreo de stock minimo, vencimientos y anomalias</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip icon={<WarningAmberIcon sx={{ color: 'inherit' }} />} label={'Activas: ' + resumen.activas} sx={ps.metricChip('bad')} />
        <Chip label={'Reconocidas: ' + resumen.reconocidas} sx={ps.metricChip('warn')} />
        <Chip icon={<CheckCircleIcon sx={{ color: 'inherit' }} />} label={'Resueltas: ' + resumen.resueltas} sx={ps.metricChip('ok')} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar mensaje, SKU o tipo" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 260 }} />
        <TextField select label="Severidad" value={severityFilter} onChange={e => setSeverityFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 160 }}>
          {SEVERITY_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
        <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 160 }}>
          {STATUS_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
      </Stack>

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
                  <TableCell sx={ps.cellText}>{r.type || '-'}</TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={sev} sx={ps.metricChip(severityTone(sev))} /></TableCell>
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

      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Alerta</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>Tipo:</b> {selected.type || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Severidad:</b> <Chip size="small" label={selected.severity || 'MEDIA'} sx={ps.metricChip(severityTone(selected.severity || 'MEDIA'))} /></Typography>
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
