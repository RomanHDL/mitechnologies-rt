import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'
import * as XLSX from 'xlsx'

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
import Grid from '@mui/material/Grid'
import Stepper from '@mui/material/Stepper'
import Step from '@mui/material/Step'
import StepLabel from '@mui/material/StepLabel'
import Radio from '@mui/material/Radio'
import RadioGroup from '@mui/material/RadioGroup'
import FormControlLabel from '@mui/material/FormControlLabel'
import FormControl from '@mui/material/FormControl'
import FormLabel from '@mui/material/FormLabel'
/* Timeline built with core MUI (no @mui/lab needed) */

import AddIcon from '@mui/icons-material/Add'
import InfoIcon from '@mui/icons-material/Info'
import DeleteIcon from '@mui/icons-material/Delete'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import SearchIcon from '@mui/icons-material/Search'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ErrorIcon from '@mui/icons-material/Error'
import BuildIcon from '@mui/icons-material/Build'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import InventoryIcon from '@mui/icons-material/Inventory'
import ThumbUpIcon from '@mui/icons-material/ThumbUp'
import ThumbDownIcon from '@mui/icons-material/ThumbDown'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import DownloadIcon from '@mui/icons-material/Download'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'

import dayjs from 'dayjs'

/* ── Backend-aligned constants ── */

const STATUS_MAP = {
  PENDING: 'PENDIENTE',
  INSPECTING: 'EN INSPECCION',
  APPROVED: 'APROBADA',
  RESTOCKED: 'RESTOCK',
  QUARANTINED: 'CUARENTENA',
  DISPOSED: 'DESCARTADA',
  CANCELLED: 'CANCELADA',
}

const STATUS_LABEL = {
  PENDING: 'Pendiente',
  INSPECTING: 'En Inspeccion',
  APPROVED: 'Aprobada',
  RESTOCKED: 'Restock',
  QUARANTINED: 'Cuarentena',
  DISPOSED: 'Descartada',
  CANCELLED: 'Cancelada',
}

const STATUS_FILTER_CHIPS = [
  { value: '', label: 'TODAS' },
  { value: 'PENDING', label: 'PENDIENTE' },
  { value: 'INSPECTING', label: 'INSPECCION' },
  { value: 'APPROVED', label: 'APROBADA' },
  { value: 'RESTOCKED', label: 'RESTOCK' },
  { value: 'QUARANTINED', label: 'CUARENTENA' },
  { value: 'DISPOSED', label: 'DESCARTADA' },
  { value: 'CANCELLED', label: 'CANCELADA' },
]

const REASON_FILTER_CHIPS = [
  { value: '', label: 'TODAS' },
  { value: 'DEFECTIVE', label: 'DEFECTUOSO' },
  { value: 'WRONG_ITEM', label: 'INCORRECTO' },
  { value: 'DAMAGED', label: 'DANADO' },
  { value: 'OVERSTOCK', label: 'EXCEDENTE' },
  { value: 'OTHER', label: 'OTRO' },
]

const REASON_OPTIONS = [
  { value: 'DEFECTIVE', label: 'Defectuoso' },
  { value: 'WRONG_ITEM', label: 'Articulo incorrecto' },
  { value: 'DAMAGED', label: 'Danado' },
  { value: 'OVERSTOCK', label: 'Excedente / Sobrante' },
  { value: 'OTHER', label: 'Otro' },
]

const REASON_LABEL = {
  DEFECTIVE: 'Defectuoso',
  WRONG_ITEM: 'Art. incorrecto',
  DAMAGED: 'Danado',
  OVERSTOCK: 'Excedente',
  OTHER: 'Otro',
  /* legacy mappings */
  DEFECTO: 'Defecto',
  DANADO: 'Danado',
  EQUIVOCADO: 'Equivocado',
  SOBRANTE: 'Sobrante',
}

const QC_RESULT_OPTIONS = [
  { value: 'PASS', label: 'Aprobado (PASS)' },
  { value: 'FAIL', label: 'Rechazado (FAIL)' },
  { value: 'PARTIAL', label: 'Parcial (PARTIAL)' },
]

const DISPOSITION_OPTIONS = [
  { value: 'RESTOCK', label: 'Restock - Regresa a inventario' },
  { value: 'QUARANTINE', label: 'Cuarentena - Revision adicional' },
  { value: 'DISPOSE', label: 'Descarte - Desechar' },
]

/* ── Workflow stepper steps ── */
const WORKFLOW_STEPS = ['PENDING', 'INSPECTING', 'APPROVED', 'RESTOCKED']
const WORKFLOW_STEPS_QUARANTINE = ['PENDING', 'INSPECTING', 'APPROVED', 'QUARANTINED']
const WORKFLOW_STEPS_DISPOSE = ['PENDING', 'INSPECTING', 'APPROVED', 'DISPOSED']
const WORKFLOW_STEPS_CANCELLED = ['PENDING', 'CANCELLED']

function getStepsForStatus(status) {
  if (status === 'CANCELLED') return WORKFLOW_STEPS_CANCELLED
  if (status === 'QUARANTINED') return WORKFLOW_STEPS_QUARANTINE
  if (status === 'DISPOSED') return WORKFLOW_STEPS_DISPOSE
  return WORKFLOW_STEPS
}

function getWorkflowIndex(status) {
  var steps = getStepsForStatus(status)
  var idx = steps.indexOf(status)
  return idx !== -1 ? idx : 0
}

function isTerminalStatus(status) {
  return status === 'RESTOCKED' || status === 'QUARANTINED' || status === 'DISPOSED' || status === 'CANCELLED'
}

/* ── Reason chip colors ── */
function reasonChipSx(reason) {
  var map = {
    DEFECTIVE:  { bg: 'rgba(239,68,68,.12)', color: '#C62828', border: 'rgba(239,68,68,.25)' },
    DEFECTO:    { bg: 'rgba(239,68,68,.12)', color: '#C62828', border: 'rgba(239,68,68,.25)' },
    DAMAGED:    { bg: 'rgba(239,68,68,.12)', color: '#C62828', border: 'rgba(239,68,68,.25)' },
    DANADO:     { bg: 'rgba(239,68,68,.12)', color: '#C62828', border: 'rgba(239,68,68,.25)' },
    WRONG_ITEM: { bg: 'rgba(66,165,245,.12)', color: '#1565C0', border: 'rgba(21,101,192,.25)' },
    EQUIVOCADO: { bg: 'rgba(66,165,245,.12)', color: '#1565C0', border: 'rgba(21,101,192,.25)' },
    OVERSTOCK:  { bg: 'rgba(245,158,11,.12)', color: '#E65100', border: 'rgba(245,158,11,.25)' },
    SOBRANTE:   { bg: 'rgba(245,158,11,.12)', color: '#E65100', border: 'rgba(245,158,11,.25)' },
    OTHER:      { bg: 'rgba(158,158,158,.12)', color: '#616161', border: 'rgba(158,158,158,.25)' },
    OTRO:       { bg: 'rgba(158,158,158,.12)', color: '#616161', border: 'rgba(158,158,158,.25)' },
  }
  var s = map[reason] || map['OTHER']
  return {
    fontWeight: 700,
    borderRadius: '8px',
    height: 28,
    bgcolor: s.bg,
    color: s.color,
    border: '1px solid ' + s.border,
  }
}

/* ── Disposition chip colors ── */
function dispositionChipSx(disposition) {
  var map = {
    RESTOCK:    { bg: 'rgba(34,197,94,.12)', color: '#2E7D32', border: 'rgba(46,125,50,.25)' },
    QUARANTINE: { bg: 'rgba(245,158,11,.12)', color: '#E65100', border: 'rgba(245,158,11,.25)' },
    DISPOSE:    { bg: 'rgba(239,68,68,.12)', color: '#C62828', border: 'rgba(239,68,68,.25)' },
  }
  var s = map[disposition] || { bg: 'rgba(158,158,158,.12)', color: '#616161', border: 'rgba(158,158,158,.25)' }
  return {
    fontWeight: 700,
    borderRadius: '8px',
    height: 28,
    bgcolor: s.bg,
    color: s.color,
    border: '1px solid ' + s.border,
  }
}

function statusTone(st) {
  if (st === 'APPROVED' || st === 'RESTOCKED') return 'ok'
  if (st === 'DISPOSED' || st === 'CANCELLED') return 'bad'
  if (st === 'INSPECTING') return 'info'
  if (st === 'QUARANTINED') return 'warn'
  /* legacy */
  if (st === 'APROBADA' || st === 'COMPLETADA') return 'ok'
  if (st === 'RECHAZADA' || st === 'CANCELADA') return 'bad'
  if (st === 'EN INSPECCION') return 'info'
  return 'warn'
}

/* ── QC result indicator ── */
function QcResultBadge({ result }) {
  if (!result) return null
  var config = {
    PASS:       { icon: <CheckCircleIcon fontSize="small" />, label: 'Aprobado (PASS)', color: '#2E7D32', bg: 'rgba(34,197,94,.12)' },
    FAIL:       { icon: <ErrorIcon fontSize="small" />,       label: 'Rechazado (FAIL)', color: '#C62828', bg: 'rgba(239,68,68,.12)' },
    PARTIAL:    { icon: <BuildIcon fontSize="small" />,       label: 'Parcial', color: '#E65100', bg: 'rgba(245,158,11,.12)' },
    /* legacy */
    APROBADO:   { icon: <CheckCircleIcon fontSize="small" />, label: 'Aprobado', color: '#2E7D32', bg: 'rgba(34,197,94,.12)' },
    RECHAZADO:  { icon: <ErrorIcon fontSize="small" />,       label: 'Rechazado', color: '#C62828', bg: 'rgba(239,68,68,.12)' },
    REPARACION: { icon: <BuildIcon fontSize="small" />,       label: 'Reparacion', color: '#E65100', bg: 'rgba(245,158,11,.12)' },
  }
  var c = config[result] || config['FAIL']
  return (
    <Box sx={{
      display: 'inline-flex', alignItems: 'center', gap: 0.5,
      px: 1.5, py: 0.5, borderRadius: 2,
      bgcolor: c.bg, color: c.color, fontWeight: 700, fontSize: 13,
    }}>
      {c.icon} {c.label}
    </Box>
  )
}

/* ── Status workflow stepper component ── */
function StatusStepper({ status }) {
  var steps = getStepsForStatus(status)
  var activeStep = getWorkflowIndex(status)
  var isBad = status === 'CANCELLED' || status === 'DISPOSED'

  return (
    <Stepper
      activeStep={activeStep}
      alternativeLabel
      sx={{
        py: 1,
        '& .MuiStepLabel-label': { fontSize: 11, fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' },
        '& .MuiStepIcon-root.Mui-completed': { color: isBad ? '#C62828' : '#2E7D32' },
        '& .MuiStepIcon-root.Mui-active': { color: isBad ? '#C62828' : '#1565C0' },
      }}
    >
      {steps.map(function(label) {
        return (
          <Step key={label} completed={steps.indexOf(label) <= activeStep}>
            <StepLabel error={isBad && label === status}>{STATUS_LABEL[label] || label}</StepLabel>
          </Step>
        )
      })}
    </Stepper>
  )
}

/* ── Trazabilidad timeline component ── */
function TrazabilidadTimeline({ history }) {
  if (!history || history.length === 0) {
    return (
      <Typography variant="body2" sx={{ color: 'text.secondary', fontStyle: 'italic', py: 1 }}>
        Sin historial de cambios registrado.
      </Typography>
    )
  }

  const dotSx = (tone) => {
    const colorMap = { ok: 'success.main', bad: 'error.main', info: 'info.main', warn: 'warning.main' }
    return { width: 12, height: 12, borderRadius: '50%', bgcolor: colorMap[tone] || 'warning.main', flexShrink: 0, mt: 0.5 }
  }

  return (
    <Box sx={{ pl: 1 }}>
      {history.map(function(entry, idx) {
        var tone = statusTone(entry.status || entry.newStatus || '')
        return (
          <Box key={idx} sx={{ display: 'flex', gap: 1.5, pb: 1.5 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <Box sx={dotSx(tone)} />
              {idx < history.length - 1 && <Box sx={{ width: 2, flex: 1, bgcolor: 'divider', mt: 0.5 }} />}
            </Box>
            <Box sx={{ pb: 1 }}>
              <Typography variant="body2" sx={{ fontWeight: 700 }}>
                {STATUS_LABEL[entry.status] || STATUS_LABEL[entry.newStatus] || entry.status || entry.newStatus || entry.action || 'Cambio'}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                {dayjs(entry.timestamp || entry.createdAt || entry.date).format('YYYY-MM-DD HH:mm:ss')}
              </Typography>
              {(entry.user || entry.changedBy || entry.email) && (
                <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                  Por: {entry.user?.email || entry.changedBy?.email || entry.changedBy || entry.email || '-'}
                </Typography>
              )}
              {entry.notes && (
                <Typography variant="caption" sx={{ color: 'text.secondary', fontStyle: 'italic', display: 'block' }}>
                  {entry.notes}
                </Typography>
              )}
            </Box>
          </Box>
        )
      })}
    </Box>
  )
}

export default function ReturnsPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [reasonFilter, setReasonFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  // Create dialog
  const [openCreate, setOpenCreate] = useState(false)
  const [rmaOrderRef, setRmaOrderRef] = useState('')
  const [rmaReason, setRmaReason] = useState('DEFECTIVE')
  const [rmaNotes, setRmaNotes] = useState('')
  const [rmaLines, setRmaLines] = useState([{ sku: '', qty: 1 }])
  const [createErr, setCreateErr] = useState('')

  // Inspect dialog
  const [openInspect, setOpenInspect] = useState(false)
  const [inspectReturn, setInspectReturn] = useState(null)
  const [inspectQcResult, setInspectQcResult] = useState('PASS')
  const [inspectQcNotes, setInspectQcNotes] = useState('')
  const [inspectDisposition, setInspectDisposition] = useState('RESTOCK')
  const [inspectErr, setInspectErr] = useState('')

  // Detail dialog
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const load = async () => {
    try {
      var params = {}
      if (statusFilter) params.status = statusFilter
      var res = await client.get('/api/returns', { params })
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading returns:', e) }
  }

  useEffect(() => { load() }, [token])
  useEffect(() => { load() }, [statusFilter])

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.rmaNumber || '').toLowerCase().includes(qq) ||
        (r.originalOrderId || '').toLowerCase().includes(qq) ||
        (r.customer || '').toLowerCase().includes(qq) ||
        (r.reason || '').toLowerCase().includes(qq) ||
        (r.createdBy?.email || '').toLowerCase().includes(qq)
      )
    }
    if (reasonFilter) list = list.filter(r => (r.reason || '') === reasonFilter)
    return list
  }, [rows, q, reasonFilter])

  const resumen = useMemo(() => ({
    total: rows.length,
    pendientes: rows.filter(r => r.status === 'PENDING').length,
    enInspeccion: rows.filter(r => r.status === 'INSPECTING').length,
    completadas: rows.filter(r => r.status === 'APPROVED' || r.status === 'RESTOCKED' || r.status === 'QUARANTINED' || r.status === 'DISPOSED').length,
  }), [rows])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  // Create RMA
  const addRmaLine = () => setRmaLines(function(prev) { return prev.concat([{ sku: '', qty: 1 }]) })
  const removeRmaLine = (idx) => setRmaLines(function(prev) { return prev.filter(function(_, i) { return i !== idx }) })
  const updateRmaLine = (idx, field, value) => setRmaLines(function(prev) { return prev.map(function(l, i) { return i === idx ? Object.assign({}, l, { [field]: value }) : l }) })

  const handleCreate = async () => {
    setCreateErr('')
    if (rmaLines.length === 0 || rmaLines.every(l => !l.sku.trim())) { setCreateErr('Agrega al menos un item con SKU'); return }
    try {
      await client.post('/api/returns', {
        originalOrderId: rmaOrderRef.trim() || undefined,
        reason: rmaReason,
        notes: rmaNotes,
        items: rmaLines.filter(l => l.sku.trim()).map(function(l) { return { sku: l.sku.trim(), qty: Number(l.qty) || 1 } }),
      })
      setOpenCreate(false)
      setRmaOrderRef(''); setRmaNotes(''); setRmaReason('DEFECTIVE')
      setRmaLines([{ sku: '', qty: 1 }])
      await load()
    } catch (e) { setCreateErr(e?.response?.data?.message || 'Error al crear devolucion') }
  }

  // Inspect
  const openInspectDialog = (ret) => {
    setInspectReturn(ret)
    setInspectQcResult('PASS')
    setInspectQcNotes('')
    setInspectDisposition('RESTOCK')
    setInspectErr('')
    setOpenInspect(true)
  }

  const handleInspect = async () => {
    setInspectErr('')
    if (!inspectReturn) return
    try {
      await client.patch('/api/returns/' + (inspectReturn.id || inspectReturn._id) + '/inspect', {
        qcResult: inspectQcResult,
        qcNotes: inspectQcNotes,
        disposition: inspectDisposition,
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

  // Excel export
  const exportExcel = () => {
    const data = filtered.map(r => ({
      RMA: r.rmaNumber || (r.id || r._id),
      'Orden Original': r.originalOrderId || '-',
      Razon: REASON_LABEL[r.reason] || r.reason || '-',
      Status: STATUS_LABEL[r.status] || r.status || '-',
      Items: (r.items || r.lines || []).map(function(l) { return l.sku + ' x' + (l.qty || 0) }).join(', '),
      'QC Resultado': r.qcResult || '-',
      Disposicion: r.disposition || '-',
      'QC Notas': r.qcNotes || '-',
      Notas: r.notes || '-',
      'Creado por': r.createdBy?.email || '-',
      'Inspeccionado por': r.inspectedBy?.email || '-',
      'Fecha creacion': r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm') : '',
      'Fecha inspeccion': r.inspectedAt ? dayjs(r.inspectedAt).format('YYYY-MM-DD HH:mm') : '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Devoluciones')
    XLSX.writeFile(wb, 'devoluciones_' + dayjs().format('YYYYMMDD_HHmm') + '.xlsx')
  }

  /* helper: get items array (backend may use "items" or "lines") */
  const getItems = (r) => r.items || r.lines || []

  /* ── Next valid statuses per current status ── */
  const getNextActions = (status) => {
    switch (status) {
      case 'PENDING': return [
        { label: 'Iniciar Inspeccion', nextStatus: 'INSPECTING', color: 'primary', icon: <PlayArrowIcon fontSize="small" /> },
        { label: 'Cancelar', nextStatus: 'CANCELLED', color: 'error', icon: <CancelIcon fontSize="small" /> },
      ]
      case 'INSPECTING': return [
        { label: 'Aprobar', nextStatus: 'APPROVED', color: 'success', icon: <DoneIcon fontSize="small" /> },
        { label: 'Cancelar', nextStatus: 'CANCELLED', color: 'error', icon: <CancelIcon fontSize="small" /> },
      ]
      case 'APPROVED': return [
        { label: 'Restock', nextStatus: 'RESTOCKED', color: 'success', icon: <WarehouseIcon fontSize="small" /> },
        { label: 'Cuarentena', nextStatus: 'QUARANTINED', color: 'warning', icon: <ReportProblemIcon fontSize="small" /> },
        { label: 'Descartar', nextStatus: 'DISPOSED', color: 'error', icon: <DeleteIcon fontSize="small" /> },
      ]
      default: return []
    }
  }

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Devoluciones / RMA</Typography>
          <Typography sx={ps.pageSubtitle}>Gestion de devoluciones e inspecciones de calidad</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Exportar a Excel">
            <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}><DownloadIcon /></IconButton>
          </Tooltip>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ borderRadius: 2 }}>Crear RMA</Button>
        </Stack>
      </Stack>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={ps.kpiCard('blue')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AssignmentReturnIcon sx={{ color: '#1565C0', fontSize: 28 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>{resumen.total}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total devoluciones</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={ps.kpiCard('amber')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <HourglassEmptyIcon sx={{ color: '#E65100', fontSize: 28 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>{resumen.pendientes}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pendientes</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={ps.kpiCard('blue')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <SearchIcon sx={{ color: '#1565C0', fontSize: 28 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>{resumen.enInspeccion}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>En Inspeccion</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper sx={ps.kpiCard('green')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <ThumbUpIcon sx={{ color: '#2E7D32', fontSize: 28 }} />
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>{resumen.completadas}</Typography>
              </Stack>
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Completadas</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Status filter chips ── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>Filtrar por status</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {STATUS_FILTER_CHIPS.map(chip => (
            <Chip
              key={chip.value}
              label={chip.label}
              size="small"
              onClick={() => setStatusFilter(chip.value)}
              sx={{
                ...ps.metricChip(statusFilter === chip.value ? 'info' : 'default'),
                cursor: 'pointer',
                fontWeight: statusFilter === chip.value ? 800 : 600,
                opacity: statusFilter === chip.value ? 1 : 0.75,
                transition: 'all .15s ease',
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* ── Reason filter chips ── */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5, mb: 0.5, display: 'block' }}>Filtrar por razon</Typography>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {REASON_FILTER_CHIPS.map(chip => (
            <Chip
              key={chip.value}
              label={chip.label}
              size="small"
              onClick={() => setReasonFilter(chip.value)}
              sx={{
                ...ps.metricChip(reasonFilter === chip.value ? 'warn' : 'default'),
                cursor: 'pointer',
                fontWeight: reasonFilter === chip.value ? 800 : 600,
                opacity: reasonFilter === chip.value ? 1 : 0.75,
                transition: 'all .15s ease',
              }}
            />
          ))}
        </Stack>
      </Box>

      {/* ── Search ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar RMA, orden, razon..." value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 300 }} InputProps={{ startAdornment: <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} /> }} />
      </Stack>

      {/* ── Summary chips ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip icon={<AssignmentReturnIcon sx={{ color: 'inherit' }} />} label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip label={'Pendientes: ' + resumen.pendientes} sx={ps.metricChip('warn')} />
        <Chip label={'En Inspeccion: ' + resumen.enInspeccion} sx={ps.metricChip('info')} />
        <Chip label={'Completadas: ' + resumen.completadas} sx={ps.metricChip('ok')} />
      </Stack>

      {/* ── Main table ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>RMA</TableCell>
            <TableCell>Orden Ref.</TableCell>
            <TableCell>Razon</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Disposicion</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map(function(r, idx) {
              var id = r.id || r._id
              var st = r.status || 'PENDING'
              var items = getItems(r)
              var actions = getNextActions(st)
              var canInspect = st === 'PENDING' || st === 'INSPECTING'
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.rmaNumber || id}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.originalOrderId || '-'}</TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={REASON_LABEL[r.reason] || r.reason || '-'} sx={reasonChipSx(r.reason)} />
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={STATUS_LABEL[st] || st} sx={ps.metricChip(statusTone(st))} />
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    {r.disposition ? (
                      <Chip size="small" label={r.disposition} sx={dispositionChipSx(r.disposition)} />
                    ) : '-'}
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    {items.map(function(l) { return l.sku + ' x' + (l.qty || 0) }).join(', ') || '-'}
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {canInspect && (
                      <Tooltip title="Inspeccionar QC">
                        <IconButton size="small" sx={{ ...ps.actionBtn('warning'), ml: 0.5 }} onClick={() => openInspectDialog(r)}>
                          <FactCheckIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    {actions.map(function(act) {
                      return (
                        <Tooltip key={act.nextStatus} title={act.label}>
                          <IconButton size="small" sx={{ ...ps.actionBtn(act.color), ml: 0.5 }} onClick={() => changeStatus(id, act.nextStatus)}>
                            {act.icon}
                          </IconButton>
                        </Tooltip>
                      )
                    })}
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={8}><Typography sx={ps.emptyText}>Sin devoluciones para mostrar.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* ── Detail dialog ── */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Devolucion</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {/* ── Status Workflow Stepper ── */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Flujo de estado</Typography>
                <StatusStepper status={selected.status || 'PENDING'} />
              </Paper>

              {/* ── Basic info ── */}
              <Typography variant="body2" sx={ps.cellText}><b>RMA:</b> {selected.rmaNumber || (selected.id || selected._id)}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Orden Original:</b> {selected.originalOrderId || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Razon:</b>{' '}
                <Chip size="small" label={REASON_LABEL[selected.reason] || selected.reason || '-'} sx={reasonChipSx(selected.reason)} />
              </Typography>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Status:</b>{' '}
                <Chip size="small" label={STATUS_LABEL[selected.status] || selected.status || 'Pendiente'} sx={ps.metricChip(statusTone(selected.status || 'PENDING'))} />
              </Typography>
              {selected.disposition && (
                <Typography variant="body2" sx={ps.cellText}>
                  <b>Disposicion:</b>{' '}
                  <Chip size="small" label={selected.disposition} sx={dispositionChipSx(selected.disposition)} />
                </Typography>
              )}
              <Typography variant="body2" sx={ps.cellText}><b>Notas:</b> {selected.notes || '-'}</Typography>

              <Divider />

              {/* ── Inspection Result ── */}
              {(selected.qcResult || selected.inspectionResult || selected.qcNotes || selected.inspectionNotes) && (
                <>
                  <Paper variant="outlined" sx={{
                    p: 2, borderRadius: 2,
                    bgcolor: (selected.qcResult === 'PASS' || selected.inspectionResult === 'APROBADO') ? 'rgba(34,197,94,.06)' :
                             (selected.qcResult === 'FAIL' || selected.inspectionResult === 'RECHAZADO') ? 'rgba(239,68,68,.06)' :
                             'rgba(245,158,11,.06)',
                    borderColor: (selected.qcResult === 'PASS' || selected.inspectionResult === 'APROBADO') ? 'rgba(34,197,94,.25)' :
                                 (selected.qcResult === 'FAIL' || selected.inspectionResult === 'RECHAZADO') ? 'rgba(239,68,68,.25)' :
                                 'rgba(245,158,11,.25)',
                  }}>
                    <Stack spacing={1.5}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <PlaylistAddCheckIcon sx={{ fontSize: 22 }} />
                        <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Resultado de Inspeccion</Typography>
                      </Stack>
                      {(selected.qcResult || selected.inspectionResult) && (
                        <QcResultBadge result={selected.qcResult || selected.inspectionResult} />
                      )}
                      {selected.disposition && (
                        <Box>
                          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>Disposicion: </Typography>
                          <Chip size="small" label={selected.disposition} sx={dispositionChipSx(selected.disposition)} />
                        </Box>
                      )}
                      {(selected.qcNotes || selected.inspectionNotes) && (
                        <Typography variant="body2" sx={ps.cellTextSecondary}>
                          <b>Notas QC:</b> {selected.qcNotes || selected.inspectionNotes}
                        </Typography>
                      )}
                    </Stack>
                  </Paper>
                  <Divider />
                </>
              )}

              {/* ── Inspector info ── */}
              {(selected.inspectedBy || selected.inspectedAt) && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack spacing={0.5}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Datos de Inspeccion</Typography>
                    {selected.inspectedBy && (
                      <Typography variant="body2" sx={ps.cellText}>
                        <b>Inspector:</b> {selected.inspectedBy?.email || selected.inspectedBy?.name || (typeof selected.inspectedBy === 'string' ? selected.inspectedBy : '-')}
                      </Typography>
                    )}
                    {selected.inspectedAt && (
                      <Typography variant="body2" sx={ps.cellTextSecondary}>
                        <b>Fecha inspeccion:</b> {dayjs(selected.inspectedAt).format('YYYY-MM-DD HH:mm')}
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              )}

              <Divider />

              {/* ── Items table ── */}
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Items</Typography>
              <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow sx={ps.tableHeaderRow}>
                      <TableCell>SKU</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>Cantidad</TableCell>
                      <TableCell>QC Resultado</TableCell>
                      <TableCell>Notas QC</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {getItems(selected).map(function(l, i) {
                      return (
                        <TableRow key={i} sx={ps.tableRow(i)}>
                          <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 700 }}>{l.sku}</TableCell>
                          <TableCell sx={{ ...ps.cellText, textAlign: 'center' }}>{l.qty || 0}</TableCell>
                          <TableCell>{l.qcResult ? <QcResultBadge result={l.qcResult} /> : '-'}</TableCell>
                          <TableCell sx={ps.cellTextSecondary}>{l.qcNotes || '-'}</TableCell>
                        </TableRow>
                      )
                    })}
                    {getItems(selected).length === 0 && (
                      <TableRow><TableCell colSpan={4}><Typography sx={{ ...ps.emptyText, py: 1 }}>Sin items</Typography></TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </Paper>

              <Divider />

              {/* ── Trazabilidad / Timeline ── */}
              <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Trazabilidad</Typography>
                <TrazabilidadTimeline history={selected.history || selected.statusHistory || selected.audit || []} />
              </Paper>

              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creado por:</b> {selected.createdBy?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Fecha creacion:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
              {selected.updatedAt && (
                <Typography variant="body2" sx={ps.cellTextSecondary}><b>Ultima actualizacion:</b> {dayjs(selected.updatedAt).format('YYYY-MM-DD HH:mm')}</Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* ── Create dialog ── */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crear Devolucion / RMA</DialogTitle>
        <DialogContent>
          {createErr && <Alert severity="error" sx={{ mb: 2 }}>{createErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Orden original (opcional)" value={rmaOrderRef} onChange={e => setRmaOrderRef(e.target.value)} sx={ps.inputSx} fullWidth
              helperText="ID de la orden original si aplica" />
            <TextField select label="Razon de devolucion" value={rmaReason} onChange={e => setRmaReason(e.target.value)} sx={ps.inputSx} fullWidth>
              {REASON_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </TextField>
            <TextField label="Notas" value={rmaNotes} onChange={e => setRmaNotes(e.target.value)} sx={ps.inputSx} fullWidth multiline rows={2} />
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Items de devolucion</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addRmaLine}>Agregar item</Button>
            </Stack>
            <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={ps.tableHeaderRow}>
                    <TableCell sx={{ width: '50%' }}>SKU</TableCell>
                    <TableCell sx={{ width: '30%', textAlign: 'center' }}>Cantidad</TableCell>
                    <TableCell sx={{ width: '20%', textAlign: 'center' }}>Quitar</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rmaLines.map(function(l, i) {
                    return (
                      <TableRow key={i}>
                        <TableCell>
                          <TextField
                            size="small" placeholder="SKU del producto" value={l.sku}
                            onChange={e => updateRmaLine(i, 'sku', e.target.value)}
                            sx={ps.inputSx} fullWidth variant="outlined"
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          <TextField
                            size="small" type="number" value={l.qty}
                            onChange={e => updateRmaLine(i, 'qty', e.target.value)}
                            sx={{ ...ps.inputSx, width: 100 }} variant="outlined"
                            inputProps={{ min: 1 }}
                          />
                        </TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>
                          {rmaLines.length > 1 && (
                            <IconButton size="small" onClick={() => removeRmaLine(i)} sx={ps.actionBtn('error')}>
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </Paper>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Inspect dialog ── */}
      <Dialog open={openInspect} onClose={() => setOpenInspect(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Inspeccion de Calidad (QC)</DialogTitle>
        <DialogContent dividers>
          {inspectErr && <Alert severity="error" sx={{ mb: 2 }}>{inspectErr}</Alert>}
          {inspectReturn && (
            <Stack spacing={3} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}>
                <b>RMA:</b> {inspectReturn.rmaNumber || (inspectReturn.id || inspectReturn._id)}
              </Typography>
              {inspectReturn.originalOrderId && (
                <Typography variant="body2" sx={ps.cellTextSecondary}>
                  <b>Orden:</b> {inspectReturn.originalOrderId}
                </Typography>
              )}

              {/* Items summary */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Items a inspeccionar</Typography>
                <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
                  <Table size="small">
                    <TableHead><TableRow sx={ps.tableHeaderRow}>
                      <TableCell>SKU</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>Cantidad</TableCell>
                    </TableRow></TableHead>
                    <TableBody>
                      {getItems(inspectReturn).map(function(l, i) {
                        return (
                          <TableRow key={i} sx={ps.tableRow(i)}>
                            <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{l.sku}</TableCell>
                            <TableCell sx={{ ...ps.cellText, textAlign: 'center' }}>{l.qty || 0}</TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              </Box>

              <Divider />

              {/* QC Result radio buttons */}
              <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontWeight: 800, mb: 1 }}>Resultado QC</FormLabel>
                <RadioGroup value={inspectQcResult} onChange={e => setInspectQcResult(e.target.value)}>
                  <FormControlLabel value="PASS" control={<Radio color="success" />} label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CheckCircleIcon sx={{ color: '#2E7D32', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>PASS - Aprobado</Typography>
                    </Box>
                  } />
                  <FormControlLabel value="FAIL" control={<Radio color="error" />} label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <ErrorIcon sx={{ color: '#C62828', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>FAIL - Rechazado</Typography>
                    </Box>
                  } />
                  <FormControlLabel value="PARTIAL" control={<Radio color="warning" />} label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <BuildIcon sx={{ color: '#E65100', fontSize: 20 }} />
                      <Typography variant="body2" sx={{ fontWeight: 700 }}>PARTIAL - Parcial</Typography>
                    </Box>
                  } />
                </RadioGroup>
              </FormControl>

              {/* QC Notes */}
              <TextField
                label="Notas de inspeccion QC"
                value={inspectQcNotes}
                onChange={e => setInspectQcNotes(e.target.value)}
                sx={ps.inputSx} fullWidth multiline rows={3}
                placeholder="Observaciones de la inspeccion..."
              />

              {/* Disposition dropdown */}
              <TextField
                select label="Disposicion" value={inspectDisposition}
                onChange={e => setInspectDisposition(e.target.value)}
                sx={ps.inputSx} fullWidth
                helperText="Que hacer con los items despues de la inspeccion"
              >
                {DISPOSITION_OPTIONS.map(o => (
                  <MenuItem key={o.value} value={o.value}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Box sx={{
                        width: 10, height: 10, borderRadius: '50%',
                        bgcolor: o.value === 'RESTOCK' ? '#2E7D32' : o.value === 'QUARANTINE' ? '#E65100' : '#C62828',
                      }} />
                      <Typography variant="body2">{o.label}</Typography>
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenInspect(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleInspect} startIcon={<FactCheckIcon />}>Guardar Inspeccion</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
