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
import Divider from '@mui/material/Divider'

import AddIcon from '@mui/icons-material/Add'
import InfoIcon from '@mui/icons-material/Info'
import DeleteIcon from '@mui/icons-material/Delete'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import SearchIcon from '@mui/icons-material/Search'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'

import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN INSPECCION', label: 'En Inspeccion' },
  { value: 'APROBADA', label: 'Aprobada' },
  { value: 'RECHAZADA', label: 'Rechazada' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

const REASON_OPTIONS = [
  { value: 'DEFECTO', label: 'Defecto de fabrica' },
  { value: 'DANADO', label: 'Producto danado' },
  { value: 'EQUIVOCADO', label: 'Producto equivocado' },
  { value: 'SOBRANTE', label: 'Sobrante' },
  { value: 'OTRO', label: 'Otro' },
]

const QC_RESULT_OPTIONS = [
  { value: 'APROBADO', label: 'Aprobado - Regresa a stock' },
  { value: 'RECHAZADO', label: 'Rechazado - Descarte' },
  { value: 'REPARACION', label: 'Requiere reparacion' },
]

function statusTone(st) {
  if (st === 'APROBADA' || st === 'COMPLETADA') return 'ok'
  if (st === 'RECHAZADA' || st === 'CANCELADA') return 'bad'
  if (st === 'EN INSPECCION') return 'info'
  return 'warn'
}

export default function ReturnsPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false)
  const [rmaCustomer, setRmaCustomer] = useState('')
  const [rmaReason, setRmaReason] = useState('DEFECTO')
  const [rmaNotes, setRmaNotes] = useState('')
  const [rmaLines, setRmaLines] = useState([{ sku: '', qty: 1, description: '' }])
  const [createErr, setCreateErr] = useState('')

  // Inspect dialog
  const [openInspect, setOpenInspect] = useState(false)
  const [inspectReturn, setInspectReturn] = useState(null)
  const [inspectLines, setInspectLines] = useState([])
  const [inspectNotes, setInspectNotes] = useState('')
  const [inspectErr, setInspectErr] = useState('')

  // Detail dialog
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const load = async () => {
    try {
      var res = await client.get('/api/returns')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading returns:', e) }
  }

  useEffect(() => { load() }, [token])

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.rmaNumber || '').toLowerCase().includes(qq) ||
        (r.customer || '').toLowerCase().includes(qq) ||
        (r.reason || '').toLowerCase().includes(qq) ||
        (r.createdBy?.email || '').toLowerCase().includes(qq)
      )
    }
    if (statusFilter) list = list.filter(r => (r.status || '') === statusFilter)
    return list
  }, [rows, q, statusFilter])

  const resumen = useMemo(() => ({
    total: filtered.length,
    pendientes: filtered.filter(r => (r.status || '') === 'PENDIENTE').length,
    enInspeccion: filtered.filter(r => (r.status || '') === 'EN INSPECCION').length,
    aprobadas: filtered.filter(r => (r.status || '') === 'APROBADA' || (r.status || '') === 'COMPLETADA').length,
    rechazadas: filtered.filter(r => (r.status || '') === 'RECHAZADA' || (r.status || '') === 'CANCELADA').length,
  }), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  // Create RMA
  const addRmaLine = () => setRmaLines(function(prev) { return prev.concat([{ sku: '', qty: 1, description: '' }]) })
  const removeRmaLine = (idx) => setRmaLines(function(prev) { return prev.filter(function(_, i) { return i !== idx }) })
  const updateRmaLine = (idx, field, value) => setRmaLines(function(prev) { return prev.map(function(l, i) { return i === idx ? Object.assign({}, l, { [field]: value }) : l }) })

  const handleCreate = async () => {
    setCreateErr('')
    if (!rmaCustomer.trim()) { setCreateErr('Cliente requerido'); return }
    if (rmaLines.length === 0) { setCreateErr('Agrega al menos un item'); return }
    try {
      await client.post('/api/returns', {
        customer: rmaCustomer,
        reason: rmaReason,
        notes: rmaNotes,
        lines: rmaLines.map(function(l) { return { sku: l.sku, qty: Number(l.qty) || 1, description: l.description } }),
      })
      setOpenCreate(false)
      setRmaCustomer(''); setRmaNotes('')
      setRmaLines([{ sku: '', qty: 1, description: '' }])
      await load()
    } catch (e) { setCreateErr(e?.response?.data?.message || 'Error al crear') }
  }

  // Inspect
  const openInspectDialog = (ret) => {
    setInspectReturn(ret)
    setInspectLines((ret.lines || []).map(function(l) {
      return { sku: l.sku, qty: l.qty || 0, qcResult: 'APROBADO', qcNotes: '' }
    }))
    setInspectNotes('')
    setInspectErr('')
    setOpenInspect(true)
  }

  const updateInspectLine = (idx, field, value) => setInspectLines(function(prev) { return prev.map(function(l, i) { return i === idx ? Object.assign({}, l, { [field]: value }) : l }) })

  const handleInspect = async () => {
    setInspectErr('')
    if (!inspectReturn) return
    try {
      await client.patch('/api/returns/' + (inspectReturn.id || inspectReturn._id) + '/inspect', {
        lines: inspectLines.map(function(l) { return { sku: l.sku, qcResult: l.qcResult, qcNotes: l.qcNotes } }),
        notes: inspectNotes,
      })
      setOpenInspect(false)
      await load()
    } catch (e) { setInspectErr(e?.response?.data?.message || 'Error al inspeccionar') }
  }

  // Status actions
  const changeStatus = async (id, newStatus) => {
    try {
      await client.patch('/api/returns/' + id + '/status', { status: newStatus })
      await load()
    } catch (e) { console.error('Error:', e) }
  }

  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => setShowDetail(false)

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Devoluciones / RMA</Typography>
          <Typography sx={ps.pageSubtitle}>Gestion de devoluciones e inspecciones de calidad</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ borderRadius: 2 }}>Crear RMA</Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip icon={<AssignmentReturnIcon sx={{ color: 'inherit' }} />} label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip label={'Pendientes: ' + resumen.pendientes} sx={ps.metricChip('warn')} />
        <Chip label={'En Inspeccion: ' + resumen.enInspeccion} sx={ps.metricChip('info')} />
        <Chip label={'Aprobadas: ' + resumen.aprobadas} sx={ps.metricChip('ok')} />
        <Chip label={'Rechazadas: ' + resumen.rechazadas} sx={ps.metricChip('bad')} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar RMA, cliente o razon" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 260 }} />
        <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 180 }}>
          {STATUS_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>RMA</TableCell>
            <TableCell>Cliente</TableCell>
            <TableCell>Razon</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map(function(r, idx) {
              var id = r.id || r._id
              var st = r.status || 'PENDIENTE'
              var isDone = st === 'COMPLETADA' || st === 'CANCELADA' || st === 'RECHAZADA'
              var canInspect = st === 'PENDIENTE' || st === 'EN INSPECCION'
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.rmaNumber || id}</TableCell>
                  <TableCell sx={ps.cellText}>{r.customer || '-'}</TableCell>
                  <TableCell sx={ps.cellText}>{r.reason || '-'}</TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={st} sx={ps.metricChip(statusTone(st))} /></TableCell>
                  <TableCell sx={ps.cellText}>{(r.lines || []).map(function(l) { return l.sku + '(' + l.qty + ')' }).join(', ') || '-'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver detalle"><IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                    {canInspect && (<Tooltip title="Inspeccionar QC"><IconButton size="small" sx={ps.actionBtn('warning')} onClick={() => openInspectDialog(r)}><FactCheckIcon fontSize="small" /></IconButton></Tooltip>)}
                    {!isDone && st !== 'APROBADA' && (<Tooltip title="Aprobar"><IconButton size="small" sx={ps.actionBtn('success')} onClick={() => changeStatus(id, 'APROBADA')}><DoneIcon fontSize="small" /></IconButton></Tooltip>)}
                    {!isDone && (<Tooltip title="Rechazar"><IconButton size="small" sx={ps.actionBtn('error')} onClick={() => changeStatus(id, 'RECHAZADA')}><CancelIcon fontSize="small" /></IconButton></Tooltip>)}
                    {st === 'APROBADA' && (<Tooltip title="Completar"><IconButton size="small" sx={ps.actionBtn('success')} onClick={() => changeStatus(id, 'COMPLETADA')}><DoneIcon fontSize="small" /></IconButton></Tooltip>)}
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin devoluciones para mostrar.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* Detail dialog */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Devolucion</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>RMA:</b> {selected.rmaNumber || (selected.id || selected._id)}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Cliente:</b> {selected.customer || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Razon:</b> {selected.reason || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Status:</b> <Chip size="small" label={selected.status || 'PENDIENTE'} sx={ps.metricChip(statusTone(selected.status || 'PENDIENTE'))} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Notas:</b> {selected.notes || '-'}</Typography>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Items</Typography>
              {(selected.lines || []).map(function(l, i) {
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Typography variant="body2" sx={ps.cellText}><b>SKU:</b> {l.sku} | <b>Qty:</b> {l.qty || 0}</Typography>
                    {l.qcResult && <Typography variant="body2" sx={ps.cellText}><b>QC:</b> {l.qcResult}</Typography>}
                    {l.qcNotes && <Typography variant="caption" sx={ps.cellTextSecondary}>{l.qcNotes}</Typography>}
                  </Paper>
                )
              })}
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creado por:</b> {selected.createdBy?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Fecha:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crear Devolucion / RMA</DialogTitle>
        <DialogContent>
          {createErr && <Alert severity="error" sx={{ mb: 2 }}>{createErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Cliente" value={rmaCustomer} onChange={e => setRmaCustomer(e.target.value)} sx={ps.inputSx} fullWidth />
            <TextField select label="Razon" value={rmaReason} onChange={e => setRmaReason(e.target.value)} sx={ps.inputSx} fullWidth>
              {REASON_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </TextField>
            <TextField label="Notas" value={rmaNotes} onChange={e => setRmaNotes(e.target.value)} sx={ps.inputSx} fullWidth multiline rows={2} />
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Items de devolucion</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addRmaLine}>Agregar item</Button>
            </Stack>
            {rmaLines.map(function(l, i) {
              return (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                    <TextField label="SKU" value={l.sku} onChange={e => updateRmaLine(i, 'sku', e.target.value)} sx={{ ...ps.inputSx, flex: 1 }} />
                    <TextField label="Qty" type="number" value={l.qty} onChange={e => updateRmaLine(i, 'qty', e.target.value)} sx={{ ...ps.inputSx, width: 100 }} />
                    <TextField label="Descripcion" value={l.description} onChange={e => updateRmaLine(i, 'description', e.target.value)} sx={{ ...ps.inputSx, flex: 1 }} />
                    {rmaLines.length > 1 && (<IconButton size="small" onClick={() => removeRmaLine(i)} sx={ps.actionBtn('error')}><DeleteIcon fontSize="small" /></IconButton>)}
                  </Stack>
                </Paper>
              )
            })}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Inspect dialog */}
      <Dialog open={openInspect} onClose={() => setOpenInspect(false)} maxWidth="md" fullWidth>
        <DialogTitle>Inspeccion de Calidad (QC)</DialogTitle>
        <DialogContent dividers>
          {inspectErr && <Alert severity="error" sx={{ mb: 2 }}>{inspectErr}</Alert>}
          {inspectReturn && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}>
                <b>RMA:</b> {inspectReturn.rmaNumber || (inspectReturn.id || inspectReturn._id)} | <b>Cliente:</b> {inspectReturn.customer || '-'}
              </Typography>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Resultado de inspeccion por item</Typography>
              {inspectLines.map(function(l, i) {
                return (
                  <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                    <Stack spacing={1.5}>
                      <Typography sx={{ ...ps.cellText, fontWeight: 700 }}>{l.sku + ' (Qty: ' + l.qty + ')'}</Typography>
                      <TextField select label="Resultado QC" value={l.qcResult} onChange={e => updateInspectLine(i, 'qcResult', e.target.value)} sx={ps.inputSx} fullWidth>
                        {QC_RESULT_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
                      </TextField>
                      <TextField label="Notas de inspeccion" value={l.qcNotes} onChange={e => updateInspectLine(i, 'qcNotes', e.target.value)} sx={ps.inputSx} fullWidth />
                    </Stack>
                  </Paper>
                )
              })}
              <TextField label="Notas generales de inspeccion" value={inspectNotes} onChange={e => setInspectNotes(e.target.value)} sx={ps.inputSx} fullWidth multiline rows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInspect(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleInspect}>Guardar Inspeccion</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
