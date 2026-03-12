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
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import PersonAddIcon from '@mui/icons-material/PersonAdd'
import AssignmentIcon from '@mui/icons-material/Assignment'

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
  { value: 'ALTA', label: 'Alta' },
  { value: 'MEDIA', label: 'Media' },
  { value: 'BAJA', label: 'Baja' },
]

function priorityTone(p) {
  if (p === 'ALTA') return 'bad'
  if (p === 'MEDIA') return 'warn'
  return 'default'
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

  const load = async () => {
    try {
      const res = await client.get('/api/tasks')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading tasks:', e) }
  }

  useEffect(() => { load() }, [token])

  const filtered = useMemo(() => {
    let list = rows
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
  }, [rows, q, typeFilter, statusFilter, priorityFilter])

  const resumen = useMemo(() => ({
    total: filtered.length,
    pendientes: filtered.filter(r => (r.status || '') === 'PENDIENTE').length,
    asignadas: filtered.filter(r => (r.status || '') === 'ASIGNADA').length,
    enProceso: filtered.filter(r => (r.status || '') === 'EN PROCESO').length,
    completadas: filtered.filter(r => (r.status || '') === 'COMPLETADA').length,
  }), [filtered])

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
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Cola de Tareas</Typography>
          <Typography sx={ps.pageSubtitle}>Gestion y asignacion de tareas operativas</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ borderRadius: 2 }}>Crear Tarea</Button>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip label={'Pendientes: ' + resumen.pendientes} sx={ps.metricChip('warn')} />
        <Chip label={'Asignadas: ' + resumen.asignadas} sx={ps.metricChip('default')} />
        <Chip label={'En Proceso: ' + resumen.enProceso} sx={ps.metricChip('info')} />
        <Chip label={'Completadas: ' + resumen.completadas} sx={ps.metricChip('ok')} />
      </Stack>

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

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 950 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Tipo</TableCell>
            <TableCell>Prioridad</TableCell>
            <TableCell>Descripcion</TableCell>
            <TableCell>Ubicacion</TableCell>
            <TableCell>Asignado</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Fecha</TableCell>
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
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={ps.cellText}><Chip size="small" label={r.type || 'OTHER'} sx={ps.metricChip('default')} /></TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={r.priority || 'MEDIA'} sx={ps.metricChip(priorityTone(r.priority || 'MEDIA'))} /></TableCell>
                  <TableCell sx={{ ...ps.cellText, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.description || '-'}><span>{r.description || '-'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={ps.cellText}>{r.location || '-'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.assignedTo?.email || '-'}</TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={st} sx={ps.statusChip(st)} /></TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
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
            {!paginated.length && (<TableRow><TableCell colSpan={8}><Typography sx={ps.emptyText}>Sin tareas para mostrar.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </Stack>
      </Paper>

      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Tarea</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>Tipo:</b> {selected.type || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Prioridad:</b> <Chip size="small" label={selected.priority || 'MEDIA'} sx={ps.metricChip(priorityTone(selected.priority || 'MEDIA'))} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Status:</b> <Chip size="small" label={selected.status || 'PENDIENTE'} sx={ps.statusChip(selected.status || 'PENDIENTE')} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Descripcion:</b> {selected.description || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Ubicacion:</b> {selected.location || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Asignado a:</b> {selected.assignedTo?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creado por:</b> {selected.createdBy?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Fecha creacion:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
              {selected.startedAt && <Typography variant="body2" sx={ps.cellTextSecondary}><b>Iniciada:</b> {dayjs(selected.startedAt).format('YYYY-MM-DD HH:mm')}</Typography>}
              {selected.completedAt && <Typography variant="body2" sx={ps.cellTextSecondary}><b>Completada:</b> {dayjs(selected.completedAt).format('YYYY-MM-DD HH:mm')}</Typography>}
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>

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

      <Dialog open={openAssign} onClose={() => setOpenAssign(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Asignar Tarea</DialogTitle>
        <DialogContent>
          {assignErr && <Alert severity="error" sx={{ mb: 2 }}>{assignErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <Typography variant="body2" sx={ps.cellText}><b>Tarea:</b> {assignTask?.description || '-'}</Typography>
            <TextField label="Email del operador" value={assignEmail} onChange={e => setAssignEmail(e.target.value)} sx={ps.inputSx} fullWidth />
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
