import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../services/api'
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
import Grid from '@mui/material/Grid'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'

import AddIcon from '@mui/icons-material/Add'
import InfoIcon from '@mui/icons-material/Info'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AssignmentIcon from '@mui/icons-material/Assignment'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import LoopIcon from '@mui/icons-material/Loop'

import dayjs from 'dayjs'

/* ── Backend-aligned type options ── */
const TYPE_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'PUTAWAY', label: 'Acomodo' },
  { value: 'PICK', label: 'Picking' },
  { value: 'TRANSFER', label: 'Transferencia' },
  { value: 'COUNT', label: 'Conteo' },
  { value: 'INSPECT', label: 'Inspeccion' },
  { value: 'CUSTOM', label: 'Personalizada' },
]

const TYPE_LABELS = {
  PUTAWAY: 'Acomodo',
  PICK: 'Picking',
  TRANSFER: 'Transferencia',
  COUNT: 'Conteo',
  INSPECT: 'Inspeccion',
  CUSTOM: 'Personalizada',
}

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDING', label: 'Pendiente' },
  { value: 'ASSIGNED', label: 'Asignada' },
  { value: 'IN_PROGRESS', label: 'En Progreso' },
  { value: 'COMPLETED', label: 'Completada' },
  { value: 'CANCELLED', label: 'Cancelada' },
]

const STATUS_LABELS = {
  PENDING: 'Pendiente',
  ASSIGNED: 'Asignada',
  IN_PROGRESS: 'En Progreso',
  COMPLETED: 'Completada',
  CANCELLED: 'Cancelada',
}

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'URGENT', label: 'Urgente' },
  { value: 'HIGH', label: 'Alta' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'LOW', label: 'Baja' },
]

const PRIORITY_LABELS = {
  URGENT: 'Urgente',
  HIGH: 'Alta',
  NORMAL: 'Normal',
  LOW: 'Baja',
}

/* ── Priority color coding ── */
function priorityChipSx(p, isDark) {
  const d = isDark
  const map = {
    URGENT: { bg: d ? 'rgba(239,68,68,.18)' : '#FFEBEE', color: d ? '#FCA5A5' : '#C62828', border: d ? 'rgba(239,68,68,.30)' : 'rgba(198,40,40,.30)' },
    HIGH:   { bg: d ? 'rgba(245,158,11,.18)' : '#FFF3E0', color: d ? '#FCD34D' : '#E65100', border: d ? 'rgba(245,158,11,.30)' : 'rgba(245,158,11,.35)' },
    NORMAL: { bg: d ? 'rgba(66,165,245,.15)' : '#E3F2FD', color: d ? '#64B5F6' : '#1565C0', border: d ? 'rgba(66,165,245,.25)' : 'rgba(21,101,192,.25)' },
    LOW:    { bg: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)', color: d ? '#B0BEC5' : '#607D8B', border: d ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.12)' },
  }
  const s = map[p] || map.NORMAL
  const base = { bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 700 }
  if (p === 'URGENT') {
    base.animation = 'urgentPulse 1.5s ease-in-out infinite'
    base['@keyframes urgentPulse'] = {
      '0%, 100%': { opacity: 1 },
      '50%': { opacity: 0.65 },
    }
  }
  return base
}

/* ── Status chip mapping for backend values ── */
function statusChipKey(st) {
  const map = {
    PENDING: 'PENDIENTE',
    ASSIGNED: 'PENDIENTE',
    IN_PROGRESS: 'EN PROCESO',
    COMPLETED: 'COMPLETADA',
    CANCELLED: 'CANCELADA',
  }
  return map[st] || 'PENDIENTE'
}

/* ── Aging helper ── */
function agingLabel(createdAt) {
  const now = dayjs()
  const created = dayjs(createdAt)
  const diffMin = now.diff(created, 'minute')
  const diffHours = now.diff(created, 'hour')
  const diffDays = now.diff(created, 'day')

  if (diffMin < 60) return `hace ${Math.max(1, diffMin)}m`
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays === 1) return 'hace 1 dia'
  return `hace ${diffDays} dias`
}

function agingColor(createdAt, isDark) {
  const now = dayjs()
  const created = dayjs(createdAt)
  const diffHours = now.diff(created, 'hour', true)

  if (diffHours < 1) return isDark ? '#86EFAC' : '#2E7D32'       // green
  if (diffHours < 4) return isDark ? '#FCD34D' : '#E65100'       // yellow
  if (diffHours < 24) return isDark ? '#FDBA74' : '#E65100'      // orange
  return isDark ? '#FCA5A5' : '#C62828'                           // red
}

/* ── Type chip color ── */
function typeChipSx(type, isDark) {
  const d = isDark
  const map = {
    PUTAWAY:   { bg: d ? 'rgba(34,197,94,.12)' : '#E8F5E9', color: d ? '#86EFAC' : '#2E7D32', border: d ? 'rgba(34,197,94,.20)' : 'rgba(46,125,50,.20)' },
    PICK:      { bg: d ? 'rgba(66,165,245,.12)' : '#E3F2FD', color: d ? '#64B5F6' : '#1565C0', border: d ? 'rgba(66,165,245,.20)' : 'rgba(21,101,192,.20)' },
    TRANSFER:  { bg: d ? 'rgba(171,71,188,.12)' : '#F3E5F5', color: d ? '#CE93D8' : '#7B1FA2', border: d ? 'rgba(171,71,188,.20)' : 'rgba(123,31,162,.20)' },
    COUNT:     { bg: d ? 'rgba(245,158,11,.12)' : '#FFF8E1', color: d ? '#FCD34D' : '#E65100', border: d ? 'rgba(245,158,11,.20)' : 'rgba(245,158,11,.25)' },
    INSPECT:   { bg: d ? 'rgba(239,68,68,.12)' : '#FFEBEE', color: d ? '#FCA5A5' : '#C62828', border: d ? 'rgba(239,68,68,.20)' : 'rgba(198,40,40,.20)' },
    CUSTOM:    { bg: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)', color: d ? '#B0BEC5' : '#607D8B', border: d ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.12)' },
  }
  const s = map[type] || map.CUSTOM
  return { bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 700 }
}

export default function TasksPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(), [token])

  const isAdminOrSupervisor = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 12

  /* ── Create dialog state ── */
  const [openCreate, setOpenCreate] = useState(false)
  const [taskType, setTaskType] = useState('PICK')
  const [taskPriority, setTaskPriority] = useState('NORMAL')
  const [taskTitle, setTaskTitle] = useState('')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskAssigneeId, setTaskAssigneeId] = useState('')
  const [taskPalletId, setTaskPalletId] = useState('')
  const [taskLocationId, setTaskLocationId] = useState('')
  const [taskTargetLocationId, setTaskTargetLocationId] = useState('')
  const [createErr, setCreateErr] = useState('')

  /* ── Assign dialog state ── */
  const [openAssign, setOpenAssign] = useState(false)
  const [assignTask, setAssignTask] = useState(null)
  const [assignUserId, setAssignUserId] = useState('')
  const [assignErr, setAssignErr] = useState('')

  /* ── Complete dialog state ── */
  const [openComplete, setOpenComplete] = useState(false)
  const [completeTaskObj, setCompleteTaskObj] = useState(null)
  const [completeNotes, setCompleteNotes] = useState('')

  /* ── Detail dialog state ── */
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  /* ── Users list for operator assignment dropdown ── */
  const [usersList, setUsersList] = useState([])

  const loadUsers = useCallback(async () => {
    try {
      const res = await client.get('/api/users')
      const list = res.data?.data || res.data || []
      setUsersList(Array.isArray(list) ? list.filter(u => u.isActive !== false) : [])
    } catch (e) {
      console.error('Error loading users:', e)
    }
  }, [client])

  const load = useCallback(async () => {
    try {
      const params = {}
      if (myTasksOnly) params.mine = 1
      if (statusFilter) params.status = statusFilter
      if (typeFilter) params.type = typeFilter
      const res = await client.get('/api/tasks', { params })
      const data = res.data?.data || res.data
      setRows(Array.isArray(data) ? data : [])
    } catch (e) { console.error('Error loading tasks:', e) }
  }, [client, myTasksOnly, statusFilter, typeFilter])

  useEffect(() => { load(); loadUsers() }, [load, loadUsers])

  /* ── Client-side filtering (priority + text search) ── */
  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      const qq = q.toLowerCase()
      list = list.filter(r =>
        (r.title || '').toLowerCase().includes(qq) ||
        (r.description || '').toLowerCase().includes(qq) ||
        (r.type || '').toLowerCase().includes(qq) ||
        (r.assignedTo?.email || '').toLowerCase().includes(qq) ||
        (r.assignedTo?.fullName || '').toLowerCase().includes(qq) ||
        (r.pallet?.code || '').toLowerCase().includes(qq) ||
        (r.location?.code || '').toLowerCase().includes(qq)
      )
    }
    if (priorityFilter) list = list.filter(r => (r.priority || '') === priorityFilter)
    return list
  }, [rows, q, priorityFilter])

  /* ── KPI summary from full data ── */
  const resumen = useMemo(() => ({
    total: filtered.length,
    pendientes: filtered.filter(r => r.status === 'PENDING' || r.status === 'ASSIGNED').length,
    enProgreso: filtered.filter(r => r.status === 'IN_PROGRESS').length,
    completadas: filtered.filter(r => r.status === 'COMPLETED').length,
  }), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  /* ── Create task ── */
  const handleCreate = async () => {
    setCreateErr('')
    if (!taskTitle.trim()) { setCreateErr('Titulo requerido'); return }
    try {
      const body = {
        type: taskType,
        priority: taskPriority,
        title: taskTitle,
        description: taskDescription,
      }
      if (taskAssigneeId) body.assignedToId = taskAssigneeId
      if (taskPalletId) body.palletId = taskPalletId
      if (taskLocationId) body.locationId = taskLocationId
      if (taskTargetLocationId) body.targetLocationId = taskTargetLocationId
      await client.post('/api/tasks', body)
      setOpenCreate(false)
      setTaskTitle(''); setTaskDescription(''); setTaskAssigneeId('')
      setTaskPalletId(''); setTaskLocationId(''); setTaskTargetLocationId('')
      setTaskType('PICK'); setTaskPriority('NORMAL')
      await load()
    } catch (e) { setCreateErr(e?.message || 'Error al crear') }
  }

  /* ── Assign task ── */
  const openAssignDialog = (task) => {
    setAssignTask(task)
    setAssignUserId('')
    setAssignErr('')
    setOpenAssign(true)
  }

  const handleAssign = async () => {
    setAssignErr('')
    if (!assignUserId) { setAssignErr('Seleccione un operador'); return }
    if (!assignTask) return
    try {
      await client.patch('/api/tasks/' + (assignTask.id || assignTask._id) + '/assign', { assignedToId: assignUserId })
      setOpenAssign(false)
      await load()
    } catch (e) { setAssignErr(e?.message || 'Error al asignar') }
  }

  /* ── Start task ── */
  const startTask = async (id) => {
    try { await client.patch('/api/tasks/' + id + '/start'); await load() }
    catch (e) { console.error('Error:', e) }
  }

  /* ── Complete task (with notes dialog) ── */
  const openCompleteDialog = (task) => {
    setCompleteTaskObj(task)
    setCompleteNotes('')
    setOpenComplete(true)
  }

  const handleComplete = async () => {
    if (!completeTaskObj) return
    const id = completeTaskObj.id || completeTaskObj._id
    try {
      await client.patch('/api/tasks/' + id + '/complete', { notes: completeNotes || undefined })
      setOpenComplete(false)
      await load()
    } catch (e) { console.error('Error:', e) }
  }

  /* ── Cancel task ── */
  const cancelTask = async (id) => {
    try { await client.patch('/api/tasks/' + id + '/cancel'); await load() }
    catch (e) { console.error('Error:', e) }
  }

  /* ── Detail dialog ── */
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => setShowDetail(false)

  return (
    <Box sx={ps.page}>
      {/* ── Pulsing keyframes for URGENT badges ── */}
      <style>{`@keyframes urgentPulse { 0%,100%{opacity:1} 50%{opacity:.6} }`}</style>

      {/* ── Page Header ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Cola de Tareas</Typography>
          <Typography sx={ps.pageSubtitle}>Gestion y asignacion de tareas operativas</Typography>
        </Box>
        <Stack direction="row" spacing={1.5} alignItems="center">
          <Chip
            icon={<AssignmentIcon sx={{ fontSize: 18 }} />}
            label="Mis Tareas"
            clickable
            onClick={() => setMyTasksOnly(prev => !prev)}
            variant={myTasksOnly ? 'filled' : 'outlined'}
            color={myTasksOnly ? 'primary' : 'default'}
            sx={{
              fontWeight: 700,
              px: 1,
              height: 36,
              ...(myTasksOnly ? {
                bgcolor: ps.isDark ? 'rgba(66,165,245,.25)' : '#1565C0',
                color: '#fff',
                '&:hover': { bgcolor: ps.isDark ? 'rgba(66,165,245,.35)' : '#0D47A1' },
              } : {}),
            }}
          />
          {isAdminOrSupervisor && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ borderRadius: 2 }}>Crear Tarea</Button>
          )}
        </Stack>
      </Stack>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AssignmentIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{resumen.total}</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('amber')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <PendingActionsIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Pendientes</Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{resumen.pendientes}</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LoopIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>En Progreso</Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{resumen.enProgreso}</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('green')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleOutlineIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Completadas</Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{resumen.completadas}</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Type filter chips ── */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {TYPE_OPTIONS.map(o => (
          <Chip
            key={o.value}
            label={o.label}
            clickable
            size="small"
            variant={typeFilter === o.value ? 'filled' : 'outlined'}
            onClick={() => setTypeFilter(o.value)}
            sx={{
              fontWeight: 700,
              ...(typeFilter === o.value ? {
                bgcolor: ps.isDark ? 'rgba(66,165,245,.25)' : '#1565C0',
                color: '#fff',
                '&:hover': { bgcolor: ps.isDark ? 'rgba(66,165,245,.35)' : '#0D47A1' },
              } : {}),
            }}
          />
        ))}
      </Stack>

      {/* ── Priority filter chips ── */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {PRIORITY_OPTIONS.map(o => (
          <Chip
            key={o.value}
            label={o.label}
            clickable
            size="small"
            variant={priorityFilter === o.value ? 'filled' : 'outlined'}
            onClick={() => setPriorityFilter(o.value)}
            sx={{
              fontWeight: 700,
              ...(priorityFilter === o.value
                ? (o.value
                    ? priorityChipSx(o.value, ps.isDark)
                    : { bgcolor: ps.isDark ? 'rgba(66,165,245,.25)' : '#1565C0', color: '#fff', '&:hover': { bgcolor: ps.isDark ? 'rgba(66,165,245,.35)' : '#0D47A1' } })
                : {}),
            }}
          />
        ))}
      </Stack>

      {/* ── Search + Status filter ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar titulo, descripcion o asignado" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 280 }} />
        <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 150 }}>
          {STATUS_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
      </Stack>

      {/* ── Tasks Table ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1100 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Tipo</TableCell>
            <TableCell>Prioridad</TableCell>
            <TableCell>Titulo</TableCell>
            <TableCell>Asignado</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Creada</TableCell>
            <TableCell>Antiguedad</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map((r, idx) => {
              const id = r.id || r._id
              const st = r.status || 'PENDING'
              const isDone = st === 'COMPLETED' || st === 'CANCELLED'
              const canAssign = st === 'PENDING'
              const canStart = st === 'PENDING' || st === 'ASSIGNED'
              const canComplete = st === 'IN_PROGRESS'
              const isPending = st === 'PENDING' || st === 'ASSIGNED' || st === 'IN_PROGRESS'
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={TYPE_LABELS[r.type] || r.type || '-'} sx={typeChipSx(r.type, ps.isDark)} />
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={PRIORITY_LABELS[r.priority] || r.priority || 'Normal'} sx={priorityChipSx(r.priority || 'NORMAL', ps.isDark)} />
                  </TableCell>
                  <TableCell sx={{ ...ps.cellText, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.title || r.description || '-'}><span>{r.title || r.description || '-'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.assignedTo?.fullName || r.assignedTo?.email || '-'}</TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={STATUS_LABELS[st] || st} sx={ps.statusChip(statusChipKey(st))} />
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell>
                    {isPending && r.createdAt ? (
                      <Tooltip title={'Creada: ' + dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}>
                        <Stack direction="row" alignItems="center" spacing={0.5}>
                          <AccessTimeIcon sx={{ fontSize: 15, color: agingColor(r.createdAt, ps.isDark) }} />
                          <Typography sx={{ fontSize: 12, fontWeight: 700, color: agingColor(r.createdAt, ps.isDark) }}>
                            {agingLabel(r.createdAt)}
                          </Typography>
                        </Stack>
                      </Tooltip>
                    ) : (
                      <Typography sx={{ fontSize: 12, color: 'text.disabled' }}>-</Typography>
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver detalle"><IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                    {canAssign && (<Tooltip title="Asignar"><IconButton size="small" sx={ps.actionBtn('warning')} onClick={() => openAssignDialog(r)}><PersonAddIcon fontSize="small" /></IconButton></Tooltip>)}
                    {canStart && (<Tooltip title="Iniciar"><IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => startTask(id)}><PlayArrowIcon fontSize="small" /></IconButton></Tooltip>)}
                    {canComplete && (<Tooltip title="Completar"><IconButton size="small" sx={ps.actionBtn('success')} onClick={() => openCompleteDialog(r)}><DoneIcon fontSize="small" /></IconButton></Tooltip>)}
                    {!isDone && (<Tooltip title="Cancelar"><IconButton size="small" sx={ps.actionBtn('error')} onClick={() => cancelTask(id)}><CancelIcon fontSize="small" /></IconButton></Tooltip>)}
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={8}><Typography sx={ps.emptyText}>Sin tareas para mostrar.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* ── Detail Dialog ── */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Tarea</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Tipo:</b> <Chip size="small" label={TYPE_LABELS[selected.type] || selected.type || '-'} sx={typeChipSx(selected.type, ps.isDark)} />
              </Typography>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Prioridad:</b> <Chip size="small" label={PRIORITY_LABELS[selected.priority] || selected.priority || 'Normal'} sx={priorityChipSx(selected.priority || 'NORMAL', ps.isDark)} />
              </Typography>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Status:</b> <Chip size="small" label={STATUS_LABELS[selected.status] || selected.status || 'Pendiente'} sx={ps.statusChip(statusChipKey(selected.status || 'PENDING'))} />
              </Typography>
              <Divider />
              <Typography variant="body2" sx={ps.cellText}><b>Titulo:</b> {selected.title || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Descripcion:</b> {selected.description || '-'}</Typography>
              <Divider />
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Asignado a:</b> {selected.assignedTo?.fullName || selected.assignedTo?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Pallet:</b> {selected.pallet?.code || selected.palletId || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Ubicacion origen:</b> {selected.location?.code || selected.locationId || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Ubicacion destino:</b> {selected.targetLocation?.code || selected.targetLocationId || '-'}</Typography>
              <Divider />
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creada:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Typography>
              {selected.createdAt && (['PENDING', 'ASSIGNED', 'IN_PROGRESS'].includes(selected.status)) && (
                <Typography variant="body2" sx={{ fontWeight: 700, color: agingColor(selected.createdAt, ps.isDark) }}>
                  <b>Antiguedad:</b> {agingLabel(selected.createdAt)}
                </Typography>
              )}
              {selected.startedAt && <Typography variant="body2" sx={ps.cellTextSecondary}><b>Iniciada:</b> {dayjs(selected.startedAt).format('YYYY-MM-DD HH:mm:ss')}</Typography>}
              {selected.completedAt && <Typography variant="body2" sx={ps.cellTextSecondary}><b>Completada:</b> {dayjs(selected.completedAt).format('YYYY-MM-DD HH:mm:ss')}</Typography>}
              {selected.notes && <Typography variant="body2" sx={ps.cellText}><b>Notas:</b> {selected.notes}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* ── Create Dialog (ADMIN/SUPERVISOR only) ── */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Crear Tarea</DialogTitle>
        <DialogContent>
          {createErr && <Alert severity="error" sx={{ mb: 2 }}>{createErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Tipo" value={taskType} onChange={e => setTaskType(e.target.value)} sx={ps.inputSx} fullWidth>
              {TYPE_OPTIONS.filter(o => o.value).map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </TextField>
            <TextField select label="Prioridad" value={taskPriority} onChange={e => setTaskPriority(e.target.value)} sx={ps.inputSx} fullWidth>
              {PRIORITY_OPTIONS.filter(o => o.value).map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </TextField>
            <TextField label="Titulo" value={taskTitle} onChange={e => setTaskTitle(e.target.value)} sx={ps.inputSx} fullWidth required />
            <TextField label="Descripcion (opcional)" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} sx={ps.inputSx} fullWidth multiline rows={3} />
            {usersList.length > 0 && (
              <TextField select label="Asignar a (opcional)" value={taskAssigneeId} onChange={e => setTaskAssigneeId(e.target.value)} sx={ps.inputSx} fullWidth>
                <MenuItem value="">Sin asignar</MenuItem>
                {usersList.map(u => (
                  <MenuItem key={u.id || u._id} value={u.id || u._id}>
                    {u.fullName || u.email}{u.role ? ` (${u.role})` : ''}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField label="ID Pallet (opcional)" value={taskPalletId} onChange={e => setTaskPalletId(e.target.value)} sx={ps.inputSx} fullWidth />
            <TextField label="ID Ubicacion origen (opcional)" value={taskLocationId} onChange={e => setTaskLocationId(e.target.value)} sx={ps.inputSx} fullWidth />
            <TextField label="ID Ubicacion destino (opcional)" value={taskTargetLocationId} onChange={e => setTaskTargetLocationId(e.target.value)} sx={ps.inputSx} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Dialog (with user dropdown) ── */}
      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Asignar Tarea</DialogTitle>
        <DialogContent>
          {assignErr && <Alert severity="error" sx={{ mb: 2 }}>{assignErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={ps.cellText}><b>Tarea:</b> {assignTask?.title || assignTask?.description || '-'}</Typography>
            {usersList.length > 0 ? (
              <TextField
                select
                label="Operador"
                value={assignUserId}
                onChange={e => setAssignUserId(e.target.value)}
                sx={ps.inputSx}
                fullWidth
              >
                {usersList.map(u => (
                  <MenuItem key={u.id || u._id} value={u.id || u._id}>
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{u.fullName || u.email}</Typography>
                      {u.fullName && (
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>({u.email})</Typography>
                      )}
                      {u.role && (
                        <Chip size="small" label={u.role} sx={{ fontSize: 10, height: 20 }} />
                      )}
                    </Stack>
                  </MenuItem>
                ))}
              </TextField>
            ) : (
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>No hay usuarios disponibles.</Typography>
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAssign} disabled={!assignUserId}>Asignar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Complete Dialog (with notes) ── */}
      <Dialog open={openComplete} onClose={() => setOpenComplete(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Completar Tarea</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={ps.cellText}><b>Tarea:</b> {completeTaskObj?.title || completeTaskObj?.description || '-'}</Typography>
            <TextField
              label="Notas de cierre (opcional)"
              value={completeNotes}
              onChange={e => setCompleteNotes(e.target.value)}
              sx={ps.inputSx}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenComplete(false)}>Cancelar</Button>
          <Button variant="contained" color="success" onClick={handleComplete}>Completar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
