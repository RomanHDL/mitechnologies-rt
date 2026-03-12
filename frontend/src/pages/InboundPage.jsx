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
import DownloadIcon from '@mui/icons-material/Download'
import InfoIcon from '@mui/icons-material/Info'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import DeleteIcon from '@mui/icons-material/Delete'
import InventoryIcon from '@mui/icons-material/Inventory'

import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: '', label: 'Todos' },
  { value: 'PENDIENTE', label: 'Pendiente' },
  { value: 'EN PROCESO', label: 'En Proceso' },
  { value: 'COMPLETADA', label: 'Completada' },
  { value: 'CANCELADA', label: 'Cancelada' },
]

export default function InboundPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 12

  const [openCreate, setOpenCreate] = useState(false)
  const [supplier, setSupplier] = useState('')
  const [poNumber, setPoNumber] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState([{ sku: '', description: '', qtyExpected: 1 }])
  const [createErr, setCreateErr] = useState('')

  const [openReceive, setOpenReceive] = useState(false)
  const [receiveOrder, setReceiveOrder] = useState(null)
  const [receiveLines, setReceiveLines] = useState([])
  const [receiveNote, setReceiveNote] = useState('')
  const [receiveErr, setReceiveErr] = useState('')

  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  const load = async () => {
    try {
      const res = await client.get('/api/inbound')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading inbound:', e) }
  }

  useEffect(() => { load() }, [token])

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      const qq = q.toLowerCase()
      list = list.filter(r =>
        (r.poNumber || '').toLowerCase().includes(qq) ||
        (r.supplier || '').toLowerCase().includes(qq) ||
        (r.orderNumber || '').toLowerCase().includes(qq) ||
        (r.createdBy?.email || '').toLowerCase().includes(qq)
      )
    }
    if (statusFilter) list = list.filter(r => (r.status || '').toUpperCase() === statusFilter)
    return list
  }, [rows, q, statusFilter])

  const resumen = useMemo(() => ({
    total: filtered.length,
    pendientes: filtered.filter(r => (r.status || '') === 'PENDIENTE').length,
    enProceso: filtered.filter(r => (r.status || '') === 'EN PROCESO').length,
    completadas: filtered.filter(r => (r.status || '') === 'COMPLETADA').length,
    canceladas: filtered.filter(r => (r.status || '') === 'CANCELADA').length,
  }), [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  const exportExcel = () => {
    const data = filtered.map(r => ({
      Orden: r.orderNumber || r.poNumber || '',
      Proveedor: r.supplier || '',
      PO: r.poNumber || '',
      Status: r.status || '',
      Lineas: (r.lines || []).map(l => l.sku + '(' + l.qtyExpected + ')').join(', '),
      Creado: r.createdBy?.email || '',
      Fecha: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inbound')
    XLSX.writeFile(wb, 'inbound_recibos.xlsx')
  }

  const addLine = () => setLines(prev => [...prev, { sku: '', description: '', qtyExpected: 1 }])
  const removeLine = (idx) => setLines(prev => prev.filter((_, i) => i !== idx))
  const updateLine = (idx, field, value) => setLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))

  const handleCreate = async () => {
    setCreateErr('')
    if (!supplier.trim()) { setCreateErr('Proveedor requerido'); return }
    if (lines.length === 0) { setCreateErr('Agrega al menos una linea'); return }
    try {
      await client.post('/api/inbound', {
        supplier, poNumber, notes,
        lines: lines.map(l => ({ sku: l.sku, description: l.description, qtyExpected: Number(l.qtyExpected) || 1 })),
      })
      setOpenCreate(false); setSupplier(''); setPoNumber(''); setNotes('')
      setLines([{ sku: '', description: '', qtyExpected: 1 }])
      await load()
    } catch (e) { setCreateErr(e?.response?.data?.message || 'Error al crear') }
  }

  const changeStatus = async (id, newStatus) => {
    try { await client.patch('/api/inbound/' + id + '/status', { status: newStatus }); await load() }
    catch (e) { console.error('Error:', e) }
  }

  const openReceiveDialog = (order) => {
    setReceiveOrder(order)
    setReceiveLines((order.lines || []).map(l => ({
      sku: l.sku, qtyExpected: l.qtyExpected || 0,
      qtyReceived: l.qtyReceived || l.qtyExpected || 0, note: '',
    })))
    setReceiveNote(''); setReceiveErr(''); setOpenReceive(true)
  }

  const updateReceiveLine = (idx, field, value) => setReceiveLines(prev => prev.map((l, i) => i === idx ? { ...l, [field]: value } : l))

  const handleReceive = async () => {
    setReceiveErr('')
    if (!receiveOrder) return
    try {
      await client.patch('/api/inbound/' + (receiveOrder.id || receiveOrder._id) + '/receive', {
        lines: receiveLines.map(l => ({ sku: l.sku, qtyReceived: Number(l.qtyReceived) || 0, note: l.note })),
        note: receiveNote,
      })
      setOpenReceive(false); await load()
    } catch (e) { setReceiveErr(e?.response?.data?.message || 'Error al recibir') }
  }

  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => setShowDetail(false)

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Recibos de Entrada</Typography>
          <Typography sx={ps.pageSubtitle}>Gestion de ordenes de recibo (inbound)</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setOpenCreate(true)} sx={{ borderRadius: 2 }}>Crear Recibo</Button>
          <Tooltip title="Exportar a Excel"><IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}><DownloadIcon /></IconButton></Tooltip>
        </Stack>
      </Stack>

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip label={'Pendientes: ' + resumen.pendientes} sx={ps.metricChip('warn')} />
        <Chip label={'En Proceso: ' + resumen.enProceso} sx={ps.metricChip('default')} />
        <Chip label={'Completadas: ' + resumen.completadas} sx={ps.metricChip('ok')} />
        <Chip label={'Canceladas: ' + resumen.canceladas} sx={ps.metricChip('bad')} />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar orden, proveedor o usuario" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 260 }} />
        <TextField select label="Status" value={statusFilter} onChange={e => setStatusFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 180 }}>
          {STATUS_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
        </TextField>
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Orden</TableCell><TableCell>Proveedor</TableCell><TableCell>PO</TableCell>
            <TableCell>Status</TableCell><TableCell>Lineas</TableCell><TableCell>Fecha</TableCell>
            <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map((r, idx) => {
              const st = r.status || 'PENDIENTE'
              const id = r.id || r._id
              const isPending = st === 'PENDIENTE'
              const isEnProceso = st === 'EN PROCESO'
              const isDone = st === 'COMPLETADA' || st === 'CANCELADA'
              return (
                <TableRow key={id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.orderNumber || id}</TableCell>
                  <TableCell sx={ps.cellText}>{r.supplier || '-'}</TableCell>
                  <TableCell sx={ps.cellText}>{r.poNumber || '-'}</TableCell>
                  <TableCell sx={ps.cellText}><Chip size="small" label={st} sx={ps.statusChip(st)} /></TableCell>
                  <TableCell sx={ps.cellText}>{(r.lines || []).map(l => l.sku + '(' + (l.qtyExpected || 0) + ')').join(', ') || '-'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver detalle"><IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Recibir mercancia"><span><IconButton size="small" sx={ps.actionBtn('success')} onClick={() => openReceiveDialog(r)} disabled={isDone}><InventoryIcon fontSize="small" /></IconButton></span></Tooltip>
                    {isPending && (<Tooltip title="Marcar En Proceso"><IconButton size="small" sx={ps.actionBtn('warning')} onClick={() => changeStatus(id, 'EN PROCESO')}><LocalShippingIcon fontSize="small" /></IconButton></Tooltip>)}
                    {(isPending || isEnProceso) && (<Tooltip title="Completar"><IconButton size="small" sx={ps.actionBtn('success')} onClick={() => changeStatus(id, 'COMPLETADA')}><DoneIcon fontSize="small" /></IconButton></Tooltip>)}
                    {!isDone && (<Tooltip title="Cancelar"><IconButton size="small" sx={ps.actionBtn('error')} onClick={() => changeStatus(id, 'CANCELADA')}><CancelIcon fontSize="small" /></IconButton></Tooltip>)}
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin recibos para mostrar.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </Stack>
      </Paper>

      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de Recibo</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>Orden:</b> {selected.orderNumber || (selected.id || selected._id)}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Proveedor:</b> {selected.supplier || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>PO:</b> {selected.poNumber || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Status:</b> <Chip size="small" label={selected.status || 'PENDIENTE'} sx={ps.statusChip(selected.status || 'PENDIENTE')} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Notas:</b> {selected.notes || '-'}</Typography>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lineas</Typography>
              {(selected.lines || []).map((l, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Typography variant="body2" sx={ps.cellText}><b>SKU:</b> {l.sku} | <b>Esperado:</b> {l.qtyExpected || 0} | <b>Recibido:</b> {l.qtyReceived || 0}</Typography>
                  {l.description && <Typography variant="caption" sx={ps.cellTextSecondary}>{l.description}</Typography>}
                </Paper>
              ))}
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creado por:</b> {selected.createdBy?.email || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Fecha:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>

      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="md" fullWidth>
        <DialogTitle>Crear Recibo de Entrada</DialogTitle>
        <DialogContent>
          {createErr && <Alert severity="error" sx={{ mb: 2 }}>{createErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Proveedor" value={supplier} onChange={e => setSupplier(e.target.value)} sx={ps.inputSx} fullWidth />
            <TextField label="Numero de PO (opcional)" value={poNumber} onChange={e => setPoNumber(e.target.value)} sx={ps.inputSx} fullWidth />
            <TextField label="Notas" value={notes} onChange={e => setNotes(e.target.value)} sx={ps.inputSx} fullWidth multiline rows={2} />
            <Divider />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lineas de recibo</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addLine}>Agregar linea</Button>
            </Stack>
            {lines.map((l, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                  <TextField label="SKU" value={l.sku} onChange={e => updateLine(i, 'sku', e.target.value)} sx={{ ...ps.inputSx, flex: 1 }} />
                  <TextField label="Descripcion" value={l.description} onChange={e => updateLine(i, 'description', e.target.value)} sx={{ ...ps.inputSx, flex: 1 }} />
                  <TextField label="Qty esperada" type="number" value={l.qtyExpected} onChange={e => updateLine(i, 'qtyExpected', e.target.value)} sx={{ ...ps.inputSx, width: 120 }} />
                  {lines.length > 1 && (<IconButton size="small" onClick={() => removeLine(i)} sx={ps.actionBtn('error')}><DeleteIcon fontSize="small" /></IconButton>)}
                </Stack>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleCreate}>Guardar</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openReceive} onClose={() => setOpenReceive(false)} maxWidth="md" fullWidth>
        <DialogTitle>Recibir Mercancia</DialogTitle>
        <DialogContent dividers>
          {receiveErr && <Alert severity="error" sx={{ mb: 2 }}>{receiveErr}</Alert>}
          {receiveOrder && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Orden:</b> {receiveOrder.orderNumber || (receiveOrder.id || receiveOrder._id)} | <b>Proveedor:</b> {receiveOrder.supplier || '-'}
              </Typography>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Ajustar cantidades recibidas</Typography>
              {receiveLines.map((l, i) => (
                <Paper key={i} variant="outlined" sx={{ p: 1.5, borderRadius: 2 }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                    <Typography sx={{ ...ps.cellText, minWidth: 120, fontWeight: 700 }}>{l.sku}</Typography>
                    <Typography sx={ps.cellTextSecondary}>{'Esperado: ' + l.qtyExpected}</Typography>
                    <TextField label="Qty recibida" type="number" value={l.qtyReceived} onChange={e => updateReceiveLine(i, 'qtyReceived', e.target.value)} sx={{ ...ps.inputSx, width: 130 }} />
                    <TextField label="Nota" value={l.note} onChange={e => updateReceiveLine(i, 'note', e.target.value)} sx={{ ...ps.inputSx, flex: 1 }} />
                  </Stack>
                </Paper>
              ))}
              <TextField label="Nota general de recepcion" value={receiveNote} onChange={e => setReceiveNote(e.target.value)} sx={ps.inputSx} fullWidth multiline rows={2} />
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenReceive(false)}>Cancelar</Button>
          <Button variant="contained" onClick={handleReceive}>Confirmar Recepcion</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
