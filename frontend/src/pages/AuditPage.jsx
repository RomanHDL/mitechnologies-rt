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
import Divider from '@mui/material/Divider'

import DownloadIcon from '@mui/icons-material/Download'
import InfoIcon from '@mui/icons-material/Info'
import HistoryIcon from '@mui/icons-material/History'

import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

const ACTION_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'CREATE', label: 'Crear' },
  { value: 'UPDATE', label: 'Actualizar' },
  { value: 'DELETE', label: 'Eliminar' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'STATUS_CHANGE', label: 'Cambio Status' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'PALLET', label: 'Tarima' },
  { value: 'LOCATION', label: 'Ubicacion' },
  { value: 'ORDER', label: 'Orden' },
  { value: 'INBOUND', label: 'Recibo' },
  { value: 'USER', label: 'Usuario' },
  { value: 'TASK', label: 'Tarea' },
  { value: 'MOVEMENT', label: 'Movimiento' },
]

function actionTone(action) {
  if (action === 'CREATE') return 'ok'
  if (action === 'UPDATE' || action === 'STATUS_CHANGE') return 'info'
  if (action === 'DELETE') return 'bad'
  if (action === 'LOGIN') return 'default'
  return 'default'
}

function formatJsonChanges(changes) {
  if (!changes) return '-'
  if (typeof changes === 'string') {
    try { changes = JSON.parse(changes) } catch (e) { return changes }
  }
  return JSON.stringify(changes, null, 2)
}

export default function AuditPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const load = async () => {
    try {
      var res = await client.get('/api/audit')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading audit:', e) }
  }

  useEffect(() => { load() }, [token])

  // Unique users for filter
  const users = useMemo(() => {
    var set = new Set()
    rows.forEach(function(r) { if (r.user?.email) set.add(r.user.email) })
    return Array.from(set)
  }, [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.entityId || '').toLowerCase().includes(qq) ||
        (r.description || '').toLowerCase().includes(qq) ||
        (r.user?.email || '').toLowerCase().includes(qq) ||
        (r.entity || '').toLowerCase().includes(qq)
      )
    }
    if (actionFilter) list = list.filter(r => (r.action || '') === actionFilter)
    if (entityFilter) list = list.filter(r => (r.entity || '') === entityFilter)
    if (userFilter) list = list.filter(r => (r.user?.email || '') === userFilter)
    if (dateFrom) list = list.filter(r => dayjs(r.createdAt).isAfter(dayjs(dateFrom).startOf('day')))
    if (dateTo) list = list.filter(r => dayjs(r.createdAt).isBefore(dayjs(dateTo).endOf('day')))
    return list
  }, [rows, q, actionFilter, entityFilter, userFilter, dateFrom, dateTo])

  const resumen = useMemo(() => ({
    total: filtered.length,
    creates: filtered.filter(r => (r.action || '') === 'CREATE').length,
    updates: filtered.filter(r => (r.action || '') === 'UPDATE').length,
    deletes: filtered.filter(r => (r.action || '') === 'DELETE').length,
  }), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  const exportExcel = () => {
    var data = filtered.map(r => ({
      Fecha: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      Accion: r.action || '',
      Entidad: r.entity || '',
      EntityId: r.entityId || '',
      Usuario: r.user?.email || '',
      Descripcion: r.description || '',
      Cambios: typeof r.changes === 'object' ? JSON.stringify(r.changes) : (r.changes || ''),
    }))
    var ws = XLSX.utils.json_to_sheet(data)
    var wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Audit')
    XLSX.writeFile(wb, 'audit_log.xlsx')
  }

  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => setShowDetail(false)

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Bitacora de Auditoria</Typography>
          <Typography sx={ps.pageSubtitle}>Registro de todas las acciones del sistema</Typography>
        </Box>
        <Tooltip title="Exportar a Excel">
          <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}><DownloadIcon /></IconButton>
        </Tooltip>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip icon={<HistoryIcon sx={{ color: 'inherit' }} />} label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip label={'Creaciones: ' + resumen.creates} sx={ps.metricChip('ok')} />
        <Chip label={'Actualizaciones: ' + resumen.updates} sx={ps.metricChip('warn')} />
        <Chip label={'Eliminaciones: ' + resumen.deletes} sx={ps.metricChip('bad')} />
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
          <TextField label="Buscar ID, descripcion o usuario" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 240 }} />
          <TextField select label="Accion" value={actionFilter} onChange={e => setActionFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 150 }}>
            {ACTION_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
          </TextField>
          <TextField select label="Entidad" value={entityFilter} onChange={e => setEntityFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 150 }}>
            {ENTITY_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
          </TextField>
          <TextField select label="Usuario" value={userFilter} onChange={e => setUserFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {users.map(u => (<MenuItem key={u} value={u}>{u}</MenuItem>))}
          </TextField>
          <TextField type="date" label="Desde" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...ps.inputSx, minWidth: 150 }} />
          <TextField type="date" label="Hasta" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...ps.inputSx, minWidth: 150 }} />
        </Stack>
      </Paper>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Fecha</TableCell>
            <TableCell>Accion</TableCell>
            <TableCell>Entidad</TableCell>
            <TableCell>ID Entidad</TableCell>
            <TableCell>Usuario</TableCell>
            <TableCell>Descripcion</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Detalle</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map(function(r, idx) {
              var id = r.id || r._id
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={r.action || '-'} sx={ps.metricChip(actionTone(r.action || ''))} /></TableCell>
                  <TableCell sx={ps.cellText}>{r.entity || '-'}</TableCell>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.entityId || '-'}><span>{r.entityId || '-'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.user?.email || '-'}</TableCell>
                  <TableCell sx={{ ...ps.cellText, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.description || '-'}><span>{r.description || '-'}</span></Tooltip>
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="Ver detalle y cambios">
                      <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}><InfoIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin registros de auditoria.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
        </Stack>
      </Paper>

      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Registro de Auditoria</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>Fecha:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Accion:</b> <Chip size="small" label={selected.action || '-'} sx={ps.metricChip(actionTone(selected.action || ''))} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Entidad:</b> {selected.entity || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>ID Entidad:</b> {selected.entityId || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Descripcion:</b> {selected.description || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Usuario:</b> {selected.user?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>IP:</b> {selected.ip || '-'}</Typography>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Cambios (JSON)</Typography>
              <Paper
                variant="outlined"
                sx={{
                  p: 2,
                  borderRadius: 2,
                  maxHeight: 400,
                  overflow: 'auto',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all',
                  backgroundColor: ps.isDark ? 'rgba(11,25,41,.60)' : 'rgba(245,247,250,.80)',
                }}
              >
                {formatJsonChanges(selected.changes)}
              </Paper>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
