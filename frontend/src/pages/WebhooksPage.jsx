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
import Grid from '@mui/material/Grid'
import Collapse from '@mui/material/Collapse'
import MenuItem from '@mui/material/MenuItem'

import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import SendIcon from '@mui/icons-material/Send'
import WebhookIcon from '@mui/icons-material/Webhook'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import ErrorIcon from '@mui/icons-material/Error'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

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

/* Resolve an event value to its Spanish label */
function eventLabel(value) {
  var found = EVENT_TYPES.find(function (e) { return e.value === value })
  return found ? found.label : value
}

/* Delivery status: 'ok' | 'error' | 'never' */
function getDeliveryStatus(wh) {
  if (!wh.lastSentAt && wh.lastStatus == null && !wh.lastError) return 'never'
  if (wh.lastError) return 'error'
  var s = Number(wh.lastStatus)
  if (s >= 200 && s <= 299) return 'ok'
  if (s > 0) return 'error'
  return 'never'
}

function getDeliveryTooltip(wh) {
  var status = getDeliveryStatus(wh)
  if (status === 'never') return 'Nunca enviado'
  if (status === 'ok') return 'OK - Status ' + wh.lastStatus
  if (wh.lastError) return 'Error: ' + wh.lastError
  return 'Status ' + (wh.lastStatus || 'desconocido')
}

var DELIVERY_DOT = { ok: '#4caf50', error: '#f44336', never: '#9e9e9e' }
var DELIVERY_LABEL = { ok: 'Exitoso', error: 'Error', never: 'Sin envios' }

export default function WebhooksPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [eventFilter, setEventFilter] = useState('')
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

  // Test
  const [testing, setTesting] = useState(false)
  const [testingId, setTestingId] = useState(null)
  const [testResult, setTestResult] = useState(null)

  // Delete confirmation
  const [deleteId, setDeleteId] = useState(null)
  const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false)

  // Expanded row for detail
  const [expandedRow, setExpandedRow] = useState(null)

  const load = async () => {
    try {
      var res = await client.get('/api/webhooks')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading webhooks:', e) }
  }

  useEffect(() => { load() }, [token])

  /* ── KPI computations (over ALL rows, not filtered) ── */
  const kpis = useMemo(() => {
    var total = rows.length
    var activos = rows.filter(function (r) { return r.active !== false }).length
    var inactivos = rows.filter(function (r) { return r.active === false }).length
    var conErrores = rows.filter(function (r) { return r.lastError != null && r.lastError !== '' }).length
    return { total, activos, inactivos, conErrores }
  }, [rows])

  /* ── Filtered list (search + event type) ── */
  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.name || '').toLowerCase().includes(qq) ||
        (r.url || '').toLowerCase().includes(qq)
      )
    }
    if (eventFilter) {
      list = list.filter(r => Array.isArray(r.events) && r.events.includes(eventFilter))
    }
    return list
  }, [rows, q, eventFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  // Toggle event in selection
  const toggleEvent = (eventValue) => {
    setWhEvents(function (prev) {
      if (prev.includes(eventValue)) return prev.filter(function (e) { return e !== eventValue })
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
    setTestingId(id)
    setTestResult(null)
    var startTime = Date.now()
    try {
      var res = await client.post('/api/webhooks/' + id + '/test')
      var elapsed = Date.now() - startTime
      setTestResult({
        success: res.data?.ok !== false,
        message: res.data?.message || 'Test enviado correctamente',
        status: res.data?.status || res.status || null,
        error: res.data?.error || null,
        responseTime: elapsed,
      })
    } catch (e) {
      var elapsed2 = Date.now() - startTime
      setTestResult({
        success: false,
        message: e?.response?.data?.message || 'Error al probar webhook',
        status: e?.response?.status || null,
        error: e?.response?.data?.error || null,
        responseTime: elapsed2,
      })
    } finally { setTesting(false); setTestingId(null) }
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

  const toggleExpand = (id) => {
    setExpandedRow(function (prev) { return prev === id ? null : id })
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

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <WebhookIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{kpis.total}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total Webhooks</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('green')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CheckCircleIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{kpis.activos}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Activos</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('amber')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CancelIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{kpis.inactivos}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Inactivos</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('red')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <WarningAmberIcon sx={{ color: ps.isDark ? '#FCA5A5' : '#C62828', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{kpis.conErrores}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Con Errores</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Test result alert with status code ── */}
      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 2 }} onClose={() => setTestResult(null)}>
          <Stack spacing={0.5}>
            <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap">
              <Typography variant="body2" sx={{ fontWeight: 700 }}>{testResult.message}</Typography>
              {testResult.status != null && (
                <Chip size="small" label={'HTTP ' + testResult.status} sx={ps.metricChip(testResult.success ? 'ok' : 'bad')} />
              )}
              {testResult.responseTime != null && (
                <Chip size="small" label={testResult.responseTime + ' ms'} sx={ps.metricChip('info')} />
              )}
            </Stack>
            {testResult.error && (
              <Typography variant="caption" sx={{ color: 'error.main', fontFamily: 'monospace' }}>
                {'Error: ' + testResult.error}
              </Typography>
            )}
          </Stack>
        </Alert>
      )}

      {/* ── Filters: search + event type ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }} alignItems="center">
        <TextField label="Buscar nombre o URL" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 280 }} size="small" />
        <TextField
          select
          label="Filtrar por evento"
          value={eventFilter}
          onChange={e => { setEventFilter(e.target.value); setPage(1) }}
          sx={{ ...ps.inputSx, minWidth: 220 }}
          size="small"
        >
          <MenuItem value="">Todos los eventos</MenuItem>
          {EVENT_TYPES.map(function (evt) {
            return <MenuItem key={evt.value} value={evt.value}>{evt.label}</MenuItem>
          })}
        </TextField>
      </Stack>

      {/* ── Table ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell sx={{ width: 40 }} />
            <TableCell>Nombre</TableCell>
            <TableCell>URL</TableCell>
            <TableCell>Eventos</TableCell>
            <TableCell>Activo</TableCell>
            <TableCell>Estado Entrega</TableCell>
            <TableCell>Ultimo envio</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map(function (r, idx) {
              var id = r.id || r._id
              var isActive = r.active !== false
              var delivery = getDeliveryStatus(r)
              var isExpanded = expandedRow === id

              return (
                <React.Fragment key={id}>
                  <TableRow sx={ps.tableRow(idx)}>
                    {/* Expand toggle */}
                    <TableCell sx={{ width: 40, px: 0.5 }}>
                      <IconButton size="small" onClick={() => toggleExpand(id)}>
                        {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                      </IconButton>
                    </TableCell>
                    <TableCell sx={{ ...ps.cellText, fontWeight: 700 }}>{r.name || '-'}</TableCell>
                    <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.url || '-'}><span>{r.url || '-'}</span></Tooltip>
                    </TableCell>
                    <TableCell sx={ps.cellText}>
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        {(r.events || []).slice(0, 3).map(function (ev) {
                          return <Chip key={ev} size="small" label={eventLabel(ev)} sx={ps.metricChip('default')} />
                        })}
                        {(r.events || []).length > 3 && (
                          <Chip size="small" label={'+ ' + ((r.events || []).length - 3)} sx={ps.metricChip('info')} />
                        )}
                      </Stack>
                    </TableCell>
                    <TableCell sx={ps.cellText}>
                      <Chip size="small" label={isActive ? 'Activo' : 'Inactivo'} sx={ps.metricChip(isActive ? 'ok' : 'default')} />
                    </TableCell>
                    {/* Delivery status indicator: dot + label + optional status chip */}
                    <TableCell>
                      <Tooltip title={getDeliveryTooltip(r)}>
                        <Stack direction="row" alignItems="center" spacing={0.75}>
                          <FiberManualRecordIcon sx={{ fontSize: 12, color: DELIVERY_DOT[delivery] }} />
                          <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>
                            {DELIVERY_LABEL[delivery]}
                          </Typography>
                          {r.lastStatus != null && (
                            <Chip
                              size="small"
                              label={r.lastStatus}
                              sx={ps.metricChip(delivery === 'ok' ? 'ok' : 'bad')}
                            />
                          )}
                        </Stack>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={ps.cellTextSecondary}>{r.lastSentAt ? dayjs(r.lastSentAt).format('YYYY-MM-DD HH:mm') : '-'}</TableCell>
                    <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Editar">
                        <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openEditDialog(r)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                      <Tooltip title="Probar webhook">
                        <span>
                          <IconButton size="small" sx={ps.actionBtn('warning')} onClick={() => testWebhook(id)} disabled={testing && testingId === id}>
                            {testing && testingId === id ? <CircularProgress size={18} /> : <SendIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Eliminar">
                        <IconButton size="small" sx={ps.actionBtn('error')} onClick={() => confirmDelete(id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>

                  {/* ── Expandable detail row ── */}
                  <TableRow>
                    <TableCell colSpan={8} sx={{ py: 0, px: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                      <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                        <Box sx={{ p: 2.5, bgcolor: ps.isDark ? 'rgba(255,255,255,.02)' : 'rgba(21,101,192,.02)' }}>
                          <Grid container spacing={3}>
                            {/* Full event list (no truncation) */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Eventos suscritos</Typography>
                              <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                                {(r.events || []).map(function (ev) {
                                  return <Chip key={ev} size="small" label={eventLabel(ev) + ' (' + ev + ')'} sx={ps.metricChip('info')} />
                                })}
                                {(!r.events || r.events.length === 0) && (
                                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Sin eventos configurados</Typography>
                                )}
                              </Stack>
                            </Grid>

                            {/* Last status, last error, createdBy */}
                            <Grid item xs={12} md={6}>
                              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>Detalles de entrega</Typography>
                              <Stack spacing={1}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 100 }}>Status:</Typography>
                                  {r.lastStatus != null ? (
                                    <Chip
                                      size="small"
                                      label={'HTTP ' + r.lastStatus}
                                      sx={ps.metricChip(delivery === 'ok' ? 'ok' : 'bad')}
                                    />
                                  ) : (
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>-</Typography>
                                  )}
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="flex-start">
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 100 }}>Error:</Typography>
                                  {r.lastError ? (
                                    <Typography variant="body2" sx={{ color: 'error.main', fontFamily: 'monospace', fontSize: 12, wordBreak: 'break-all' }}>
                                      {r.lastError}
                                    </Typography>
                                  ) : (
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Ninguno</Typography>
                                  )}
                                </Stack>
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 100 }}>Enviado:</Typography>
                                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                    {r.lastSentAt ? dayjs(r.lastSentAt).format('YYYY-MM-DD HH:mm:ss') : '-'}
                                  </Typography>
                                </Stack>
                                {r.createdBy && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 100 }}>Creado por:</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                                      {typeof r.createdBy === 'object' ? (r.createdBy.name || r.createdBy.email || '-') : r.createdBy}
                                    </Typography>
                                  </Stack>
                                )}
                                {r.secret && (
                                  <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.secondary', minWidth: 100 }}>Secret:</Typography>
                                    <Typography variant="body2" sx={{ color: 'text.secondary', fontFamily: 'monospace' }}>
                                      {'*'.repeat(Math.min(r.secret.length, 20))}
                                    </Typography>
                                  </Stack>
                                )}
                              </Stack>
                            </Grid>
                          </Grid>
                        </Box>
                      </Collapse>
                    </TableCell>
                  </TableRow>
                </React.Fragment>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={8}><Typography sx={ps.emptyText}>Sin webhooks configurados.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(function (p) { return Math.max(1, p - 1) })}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(function (p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
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
              {EVENT_TYPES.map(function (evt) {
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
