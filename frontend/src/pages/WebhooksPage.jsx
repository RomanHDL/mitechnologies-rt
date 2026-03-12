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
import FormControlLabel from '@mui/material/FormControlLabel'
import Checkbox from '@mui/material/Checkbox'
import Switch from '@mui/material/Switch'
import CircularProgress from '@mui/material/CircularProgress'

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SendIcon from '@mui/icons-material/Send'
import WebhookIcon from '@mui/icons-material/Webhook'

import dayjs from 'dayjs'

const EVENT_TYPES = [
  { value: 'pallet.created', label: 'Tarima Creada' },
  { value: 'pallet.updated', label: 'Tarima Actualizada' },
  { value: 'pallet.deleted', label: 'Tarima Eliminada' },
  { value: 'movement.created', label: 'Movimiento Creado' },
  { value: 'order.created', label: 'Orden Creada' },
  { value: 'order.fulfilled', label: 'Orden Surtida' },
  { value: 'order.cancelled', label: 'Orden Cancelada' },
  { value: 'inbound.created', label: 'Recibo Creado' },
  { value: 'inbound.received', label: 'Recibo Recibido' },
  { value: 'alert.triggered', label: 'Alerta Disparada' },
  { value: 'task.completed', label: 'Tarea Completada' },
  { value: 'return.created', label: 'Devolucion Creada' },
]

export default function WebhooksPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  // Create/edit dialog
  const [openDialog, setOpenDialog] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [editId, setEditId] = useState(null)
  const [whName, setWhName] = useState('')
  const [whUrl, setWhUrl] = useState('')
  const [whSecret, setWhSecret] = useState('')
  const [whActive, setWhActive] = useState(true)
  const [whEvents, setWhEvents] = useState([])
  const [dialogErr, setDialogErr] = useState('')

  // Test dialog
  const [testing, setTesting] = useState(false)
  const [testResult, setTestResult] = useState(null)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null)
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false)

  const load = async () => {
    try {
      var res = await client.get('/api/webhooks')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading webhooks:', e) }
  }

  useEffect(() => { load() }, [token])

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.name || '').toLowerCase().includes(qq) ||
        (r.url || '').toLowerCase().includes(qq)
      )
    }
    return list
  }, [rows, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  // Toggle event in selection
  const toggleEvent = (eventValue) => {
    setWhEvents(function(prev) {
      if (prev.includes(eventValue)) return prev.filter(function(e) { return e !== eventValue })
      return prev.concat([eventValue])
    })
  }

  // Open create dialog
  const openCreateDialog = () => {
    setEditMode(false)
    setEditId(null)
    setWhName('')
    setWhUrl('')
    setWhSecret('')
    setWhActive(true)
    setWhEvents([])
    setDialogErr('')
    setOpenDialog(true)
  }

  // Open edit dialog
  const openEditDialog = (wh) => {
    setEditMode(true)
    setEditId(wh.id || wh._id)
    setWhName(wh.name || '')
    setWhUrl(wh.url || '')
    setWhSecret(wh.secret || '')
    setWhActive(wh.active !== false)
    setWhEvents(Array.isArray(wh.events) ? wh.events.slice() : [])
    setDialogErr('')
    setOpenDialog(true)
  }

  const handleSave = async () => {
    setDialogErr('')
    if (!whName.trim()) { setDialogErr('Nombre requerido'); return }
    if (!whUrl.trim()) { setDialogErr('URL requerida'); return }
    if (whEvents.length === 0) { setDialogErr('Selecciona al menos un evento'); return }

    var payload = {
      name: whName,
      url: whUrl,
      secret: whSecret,
      active: whActive,
      events: whEvents,
    }

    try {
      if (editMode && editId) {
        await client.patch('/api/webhooks/' + editId, payload)
      } else {
        await client.post('/api/webhooks', payload)
      }
      setOpenDialog(false)
      await load()
    } catch (e) { setDialogErr(e?.response?.data?.message || 'Error al guardar') }
  }

  // Test webhook
  const testWebhook = async (id) => {
    setTesting(true)
    setTestResult(null)
    try {
      var res = await client.post('/api/webhooks/' + id + '/test')
      setTestResult({ success: true, message: res.data?.message || 'Test enviado correctamente' })
    } catch (e) {
      setTestResult({ success: false, message: e?.response?.data?.message || 'Error al probar webhook' })
    } finally { setTesting(false) }
  }

  // Delete webhook
  const confirmDelete = (id) => {
    setDeleteId(id)
    setOpenDeleteConfirm(true)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await client.delete('/api/webhooks/' + deleteId)
      setOpenDeleteConfirm(false)
      setDeleteId(null)
      await load()
    } catch (e) { console.error('Error deleting webhook:', e) }
  }

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Configuracion de Webhooks</Typography>
          <Typography sx={ps.pageSubtitle}>Notificaciones HTTP para eventos del sistema</Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={openCreateDialog} sx={{ borderRadius: 2 }}>Crear Webhook</Button>
      </Stack>

      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setTestResult(null)}>
          {testResult.message}
        </Alert>
      )}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Chip icon={<WebhookIcon sx={{ color: 'inherit' }} />} label={'Total: ' + filtered.length} sx={ps.metricChip('info')} />
        <Chip label={'Activos: ' + filtered.filter(function(r) { return r.active !== false }).length} sx={ps.metricChip('ok')} />
        <Chip label={'Inactivos: ' + filtered.filter(function(r) { return r.active === false }).length} sx={ps.metricChip('default')} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar nombre o URL" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 280 }} />
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Nombre</TableCell>
            <TableCell>URL</TableCell>
            <TableCell>Eventos</TableCell>
            <TableCell>Activo</TableCell>
            <TableCell>Ultimo envio</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map(function(r, idx) {
              var id = r.id || r._id
              var isActive = r.active !== false
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontWeight: 700 }}>{r.name || '-'}</TableCell>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.url || '-'}><span>{r.url || '-'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                      {(r.events || []).slice(0, 3).map(function(ev) {
                        return <Chip key={ev} size="small" label={ev} sx={ps.metricChip('default')} />
                      })}
                      {(r.events || []).length > 3 && (
                        <Chip size="small" label={'+ ' + ((r.events || []).length - 3)} sx={ps.metricChip('info')} />
                      )}
                    </Stack>
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={isActive ? 'Activo' : 'Inactivo'} sx={ps.metricChip(isActive ? 'ok' : 'default')} />
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.lastSentAt ? dayjs(r.lastSentAt).format('YYYY-MM-DD HH:mm') : '-'}</TableCell>
                  <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Editar">
                      <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openEditDialog(r)}><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Probar webhook">
                      <span>
                        <IconButton size="small" sx={ps.actionBtn('warning')} onClick={() => testWebhook(id)} disabled={testing}>
                          {testing ? <CircularProgress size={18} /> : <SendIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Eliminar">
                      <IconButton size="small" sx={ps.actionBtn('error')} onClick={() => confirmDelete(id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={6}><Typography sx={ps.emptyText}>Sin webhooks configurados.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* Create/Edit dialog */}
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editMode ? 'Editar Webhook' : 'Crear Webhook'}</DialogTitle>
        <DialogContent>
          {dialogErr && <Alert severity="error" sx={{ mb: 2 }}>{dialogErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Nombre" value={whName} onChange={e => setWhName(e.target.value)} sx={ps.inputSx} fullWidth />
            <TextField label="URL del webhook" value={whUrl} onChange={e => setWhUrl(e.target.value)} sx={ps.inputSx} fullWidth placeholder="https://ejemplo.com/webhook" />
            <TextField label="Secret (opcional)" value={whSecret} onChange={e => setWhSecret(e.target.value)} sx={ps.inputSx} fullWidth />
            <FormControlLabel
              control={<Switch checked={whActive} onChange={e => setWhActive(e.target.checked)} />}
              label="Activo"
            />
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Eventos a suscribir</Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {EVENT_TYPES.map(function(evt) {
                var isChecked = whEvents.includes(evt.value)
                return (
                  <FormControlLabel
                    key={evt.value}
                    control={<Checkbox checked={isChecked} onChange={() => toggleEvent(evt.value)} size="small" />}
                    label={<Typography variant="body2">{evt.label}</Typography>}
                    sx={{ minWidth: 200 }}
                  />
                )
              })}
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleSave}>{editMode ? 'Actualizar' : 'Guardar'}</Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={openDeleteConfirm} onClose={() => setOpenDeleteConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Confirmar Eliminacion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={ps.cellText}>
            Estas seguro de eliminar este webhook? Esta accion no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteConfirm(false)}>Cancelar</Button>
          <Button variant="contained" color="error" onClick={handleDelete}>Eliminar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
