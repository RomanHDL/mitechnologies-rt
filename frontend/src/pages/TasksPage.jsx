import React, { useEffect, useMemo, useState, useCallback } from 'react'
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

const TYPE_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PICK', label: 'Picking' },
  { value: 'PUTAWAY', label: 'Acomodo' },
  { value: 'MOVE', label: 'Movimiento' },
  { value: 'COUNT', label: 'Conteo' },
  { value: 'RESTOCK', label: 'Reabastecimiento' },
  { value: 'OTHER', label: 'Otro' },
]

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'ASIGNADA', label: 'Asignada' },
  { value: 'EN PROCESO', label: 'En Proceso' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

const PRIORITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'URGENTE', label: 'Urgente' },
  { value: 'ALTA', label: 'Alta' },
  { value: 'NORMAL', label: 'Normal' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
]

/* ── Priority color coding ── */
function priorityTone(p) {
  if (p === 'URGENTE') return 'bad'
  if (p === 'ALTA') return 'warn'
  if (p === 'NORMAL') return 'info'
  if (p === 'MEDIA') return 'warn'
  return 'default'
}

function priorityChipSx(p, isDark) {
  const d = isDark
  const map = {
    URGENTE: { bg: d ? 'rgba(239,68,68,.18)' : '#FFEBEE', color: d ? '#FCA5A5' : '#C62828', border: d ? 'rgba(239,68,68,.30)' : 'rgba(198,40,40,.30)' },
    ALTA:    { bg: d ? 'rgba(245,158,11,.18)' : '#FFF3E0', color: d ? '#FCD34D' : '#E65100', border: d ? 'rgba(245,158,11,.30)' : 'rgba(245,158,11,.35)' },
    NORMAL:  { bg: d ? 'rgba(66,165,245,.15)' : '#E3F2FD', color: d ? '#64B5F6' : '#1565C0', border: d ? 'rgba(66,165,245,.25)' : 'rgba(21,101,192,.25)' },
    MEDIA:   { bg: d ? 'rgba(245,158,11,.12)' : '#FFF8E1', color: d ? '#FCD34D' : '#E65100', border: d ? 'rgba(245,158,11,.20)' : 'rgba(245,158,11,.25)' },
    BAJA:    { bg: d ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.04)', color: d ? '#B0BEC5' : '#607D8B', border: d ? 'rgba(255,255,255,.10)' : 'rgba(0,0,0,.12)' },
  }
  const s = map[p] || map.BAJA
  return { bgcolor: s.bg, color: s.color, border: `1px solid ${s.border}`, fontWeight: 700 }
}

/* ── Aging helper for pending tasks ── */
function agingLabel(createdAt) {
  const now = dayjs()
  const created = dayjs(createdAt)
  const diffHours = now.diff(created, 'hour')
  const diffDays = now.diff(created, 'day')

  if (diffHours < 1) return 'hace menos de 1 hora'
  if (diffHours < 24) return `hace ${diffHours}h`
  if (diffDays === 1) return 'hace 1 dia'
  return `hace ${diffDays} dias`
}

function agingColor(createdAt, isDark) {
  const now = dayjs()
  const created = dayjs(createdAt)
  const diffDays = now.diff(created, 'day', true)

  if (diffDays < 1) return isDark ? '#86EFAC' : '#2E7D32'   // green
  if (diffDays <= 3) return isDark ? '#FCD34D' : '#E65100'   // yellow/amber
  return isDark ? '#FCA5A5' : '#C62828'                       // red
}

export default function TasksPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [priorityFilter, setPriorityFilter] = useState('')
  const [myTasksOnly, setMyTasksOnly] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 12

  const [openCreate, setOpenCreate] = useState(false)
  const [taskType, setTaskType] = useState('PICK')
  const [taskPriority, setTaskPriority] = useState('MEDIA')
  const [taskDescription, setTaskDescription] = useState('')
  const [taskLocation, setTaskLocation] = useState('')
  const [createErr, setCreateErr] = useState('')

  const [openAssign, setOpenAssign] = useState(false)
  const [assignTask, setAssignTask] = useState(null)
  const [assignEmail, setAssignEmail] = useState('')
  const [assignErr, setAssignErr] = useState('')

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

  const load = async () => {
    try {
      const res = await client.get('/api/tasks')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading tasks:', e) }
  }

  useEffect(() => { load(); loadUsers() }, [token])

  /* ── Filtering ── */
  const filtered = useMemo(() => {
    let list = rows
    if (myTasksOnly && user?.email) {
      list = list.filter(r => (r.assignedTo?.email || '').toLowerCase() === user.email.toLowerCase())
    }
    if (q) {
      const qq = q.toLowerCase()
      list = list.filter(r =>
        (r.description || '').toLowerCase().includes(qq) ||
        (r.type || '').toLowerCase().includes(qq) ||
        (r.assignedTo?.email || '').toLowerCase().includes(qq) ||
        (r.location || '').toLowerCase().includes(qq)
      )
    }
    if (typeFilter) list = list.filter(r => (r.type || '') === typeFilter)
    if (statusFilter) list = list.filter(r => (r.status || '') === statusFilter)
    if (priorityFilter) list = list.filter(r => (r.priority || '') === priorityFilter)
    return list
  }, [rows, q, typeFilter, statusFilter, priorityFilter, myTasksOnly, user])

  const resumen = useMemo(() => ({
    total: filtered.length,
    pendientes: filtered.filter(r => (r.status || '') === 'PENDIENTE').length,
    asignadas: filtered.filter(r => (r.status || '') === 'ASIGNADA').length,
    enProceso: filtered.filter(r => (r.status || '') === 'EN PROCESO').length,
    completadas: filtered.filter(r => (r.status || '') === 'COMPLETADA').length,
  }), [filtered])

  /* ── KPI: completadas hoy ── */
  const completadasHoy = useMemo(() => {
    const todayStr = dayjs().format('YYYY-MM-DD')
    return rows.filter(r =>
      (r.status || '') === 'COMPLETADA' &&
      r.completedAt &&
      dayjs(r.completedAt).format('YYYY-MM-DD') === todayStr
    ).length
  }, [rows])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  const handleCreate = async () => {
    setCreateErr('')
    if (!taskDescription.trim()) { setCreateErr('Descripcion requerida'); return }
    try {
      await client.post('/api/tasks', {
        type: taskType,
        priority: taskPriority,
        description: taskDescription,
        location: taskLocation,
      })
      setOpenCreate(false)
      setTaskDescription(''); setTaskLocation('')
      await load()
    } catch (e) { setCreateErr(e?.response?.data?.message || 'Error al crear') }
  }

  const openAssignDialog = (task) => {
    setAssignTask(task)
    setAssignEmail('')
    setAssignErr('')
    setOpenAssign(true)
  }

  const handleAssign = async () => {
    setAssignErr('')
    if (!assignEmail.trim()) { setAssignErr('Email requerido'); return }
    if (!assignTask) return
    try {
      await client.patch('/api/tasks/' + (assignTask.id || assignTask._id) + '/assign', { email: assignEmail })
      setOpenAssign(false)
      await load()
    } catch (e) { setAssignErr(e?.response?.data?.message || 'Error al asignar') }
  }

  const startTask = async (id) => {
    try { await client.patch('/api/tasks/' + id + '/start'); await load() }
    catch (e) { console.error('Error:', e) }
  }

  const completeTask = async (id) => {
    try { await client.patch('/api/tasks/' + id + '/complete'); await load() }
    catch (e) { console.error('Error:', e) }
  }

  const cancelTask = async (id) => {
    try { await client.patch('/api/tasks/' + id + '/cancel'); await load() }
    catch (e) { console.error('Error:', e) }
  }

  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => setShowDetail(false)

  return (
    <Box sx={ps.page}>
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
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ borderRadius: 2 }}>Crear Tarea</Button>
        </Stack>
      </Stack>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <AssignmentIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Tareas</Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{resumen.total}</Typography>
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
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{resumen.pendientes}</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <LoopIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>En Proceso</Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{resumen.enProceso}</Typography>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('green')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <CheckCircleOutlineIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Completadas Hoy</Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{completadasHoy}</Typography>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Existing metric chips row ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip label={'Pendientes: ' + resumen.pendientes} sx={ps.metricChip('warn')} />
        <Chip label={'Asignadas: ' + resumen.asignadas} sx={ps.metricChip('default')} />
        <Chip label={'En Proceso: ' + resumen.enProceso} sx={ps.metricChip('info')} />
        <Chip label={'Completadas: ' + resumen.completadas} sx={ps.metricChip('ok')} />
      </Stack>

      {/* ── Filters ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar descripcion, tipo o asignado" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 260 }} />
        <TextField select label="Tipo" value={typeFilter} onChange={e => setTypeFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 140 }}>
          {TYPE_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
        <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 150 }}>
          {STATUS_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
        <TextField select label="Prioridad" value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 140 }}>
          {PRIORITY_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
      </Stack>

      {/* ── Tasks Table ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1050 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Tipo</TableCell>
            <TableCell>Prioridad</TableCell>
            <TableCell>Descripcion</TableCell>
            <TableCell>Ubicacion</TableCell>
            <TableCell>Asignado</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Fecha</TableCell>
            <TableCell>Antiguedad</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map((r, idx) => {
              const id = r.id || r._id
              const st = r.status || 'PENDIENTE'
              const isDone = st === 'COMPLETADA' || st === 'CANCELADA'
              const canStart = st === 'ASIGNADA'
              const canComplete = st === 'EN PROCESO'
              const canAssign = st === 'PENDIENTE'
              const isPending = st === 'PENDIENTE' || st === 'ASIGNADA' || st === 'EN PROCESO'
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={ps.cellText}><Chip size="small" label={r.type || 'OTHER'} sx={ps.metricChip('default')} /></TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={r.priority || 'MEDIA'} sx={priorityChipSx(r.priority || 'MEDIA', ps.isDark)} />
                  </TableCell>
                  <TableCell sx={{ ...ps.cellText, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.description || '-'}><span>{r.description || '-'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={ps.cellText}>{r.location || '-'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.assignedTo?.email || '-'}</TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={st} sx={ps.statusChip(st)} /></TableCell>
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
                    {canComplete && (<Tooltip title="Completar"><IconButton size="small" sx={ps.actionBtn('success')} onClick={() => completeTask(id)}><DoneIcon fontSize="small" /></IconButton></Tooltip>)}
                    {!isDone && (<Tooltip title="Cancelar"><IconButton size="small" sx={ps.actionBtn('error')} onClick={() => cancelTask(id)}><CancelIcon fontSize="small" /></IconButton></Tooltip>)}
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={9}><Typography sx={ps.emptyText}>Sin tareas para mostrar.</Typography></TableCell></TableRow>)}
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
              <Typography variant="body2" sx={ps.cellText}><b>Tipo:</b> {selected.type || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Prioridad:</b> <Chip size="small" label={selected.priority || 'MEDIA'} sx={priorityChipSx(selected.priority || 'MEDIA', ps.isDark)} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Status:</b> <Chip size="small" label={selected.status || 'PENDIENTE'} sx={ps.statusChip(selected.status || 'PENDIENTE')} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Descripcion:</b> {selected.description || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Ubicacion:</b> {selected.location || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Asignado a:</b> {selected.assignedTo?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creado por:</b> {selected.createdBy?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Fecha creacion:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
              {selected.createdAt && (['PENDIENTE', 'ASIGNADA', 'EN PROCESO'].includes(selected.status)) && (
                <Typography variant="body2" sx={{ fontWeight: 700, color: agingColor(selected.createdAt, ps.isDark) }}>
                  <b>Antiguedad:</b> {agingLabel(selected.createdAt)}
                </Typography>
              )}
              {selected.startedAt && <Typography variant="body2" sx={ps.cellTextSecondary}><b>Iniciada:</b> {dayjs(selected.startedAt).format('YYYY-MM-DD HH:mm')}</Typography>}
              {selected.completedAt && <Typography variant="body2" sx={ps.cellTextSecondary}><b>Completada:</b> {dayjs(selected.completedAt).format('YYYY-MM-DD HH:mm')}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* ── Create Dialog ── */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear Tarea</DialogTitle>
        <DialogContent>
          {createErr && <Alert severity="error" sx={{ mb: 2 }}>{createErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Tipo" value={taskType} onChange={e => setTaskType(e.target.value)} sx={ps.inputSx} fullWidth>
              {TYPE_OPTIONS.filter(o => o.value).map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </TextField>
            <TextField select label="Prioridad" value={taskPriority} onChange={e => setTaskPriority(e.target.value)} sx={ps.inputSx} fullWidth>
              {PRIORITY_OPTIONS.filter(o => o.value).map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
            </TextField>
            <TextField label="Descripcion" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} sx={ps.inputSx} fullWidth multiline rows={3} />
            <TextField label="Ubicacion (opcional)" value={taskLocation} onChange={e => setTaskLocation(e.target.value)} sx={ps.inputSx} fullWidth />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Assign Dialog (with user dropdown) ── */}
      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Asignar Tarea</DialogTitle>
        <DialogContent>
          {assignErr && <Alert severity="error" sx={{ mb: 2 }}>{assignErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={ps.cellText}><b>Tarea:</b> {assignTask?.description || '-'}</Typography>
            {usersList.length > 0 ? (
              <TextField
                select
                label="Operador"
                value={assignEmail}
                onChange={e => setAssignEmail(e.target.value)}
                sx={ps.inputSx}
                fullWidth
              >
                {usersList.map(u => (
                  <MenuItem key={u.id || u._id || u.email} value={u.email}>
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
              <TextField label="Email del operador" value={assignEmail} onChange={e => setAssignEmail(e.target.value)} sx={ps.inputSx} fullWidth />
            )}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenAssign(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleAssign}>Asignar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
