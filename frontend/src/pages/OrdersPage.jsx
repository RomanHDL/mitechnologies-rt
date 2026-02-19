import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
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
import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import DownloadIcon from '@mui/icons-material/Download'
import * as XLSX from 'xlsx'
import Alert from '@mui/material/Alert'

export default function OrdersPage() {
  const { token, user } = useAuth()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || ['Supervisor','Coordinador','Gerente'].includes((user?.position||'').trim())

  const client = useMemo(() => api(token), [token])
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [open, setOpen] = useState(false)
  const [destType, setDestType] = useState('PRODUCTION')
  const [destRef, setDestRef] = useState('P1')
  const [sku, setSku] = useState('TV-55-4K')
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')

  const load = async () => {
    const res = await client.get('/api/orders')
    setRows(res.data)
  }

  useEffect(() => { load() }, [token])

  const create = async () => {
    setErr('')
    try {
      await client.post('/api/orders', {
        destinationType: destType,
        destinationRef: destRef,
        notes,
        lines: [{ sku, qty: Number(qty), description: '' }]
      })
      setOpen(false)
      setNotes('')
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Error')
    }
  }

  // Filtros y búsqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r =>
      (r.orderNumber || '').toLowerCase().includes(q.toLowerCase()) ||
      (r.destinationType || '').toLowerCase().includes(q.toLowerCase()) ||
      (r.destinationRef || '').toLowerCase().includes(q.toLowerCase()) ||
      (r.createdBy?.email || '').toLowerCase().includes(q.toLowerCase())
    )
    if (status) list = list.filter(r => r.status === status)
    return list
  }, [rows, q, status])

  // Resumen superior
  const resumen = useMemo(() => {
    return {
      total: filtered.length,
      pendientes: filtered.filter(r => r.status === 'PENDIENTE').length,
      completadas: filtered.filter(r => r.status === 'COMPLETADA').length,
      canceladas: filtered.filter(r => r.status === 'CANCELADA').length
    }
  }, [filtered])

  // Exportar a Excel
  const exportExcel = () => {
    const data = filtered.map(r => ({
      Orden: r.orderNumber,
      Destino: r.destinationType + (r.destinationRef ? `· ${r.destinationRef}` : ''),
      Status: r.status,
      Líneas: (r.lines||[]).map(l => `${l.sku}(${l.qty})`).join(', '),
      Creó: r.createdBy?.email || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Órdenes')
    XLSX.writeFile(wb, 'ordenes_salida.xlsx')
  }

  // Acciones rápidas
  const markCompleted = async (id) => {
    await client.patch(`/api/orders/${id}/status`, { status: 'COMPLETADA' })
    await load()
  }
  const markCancelled = async (id) => {
    await client.patch(`/api/orders/${id}/status`, { status: 'CANCELADA' })
    await load()
  }
  const deleteOrder = async (id) => {
    await client.delete(`/api/orders/${id}`)
    await load()
  }

  // Paginación
  const paginated = useMemo(() => {
    const start = (page-1)*pageSize
    return filtered.slice(start, start+pageSize)
  }, [filtered, page])

  // Modal de detalle
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Órdenes de salida</Typography>
      {/* Resumen superior */}
      <Stack direction="row" spacing={2} sx={{ mb:2 }}>
        <Chip label={`Total: ${resumen.total}`} color="primary" />
        <Chip label={`Pendientes: ${resumen.pendientes}`} sx={{ bgcolor:'#fef9c3', color:'#a16207' }} />
        <Chip label={`Completadas: ${resumen.completadas}`} sx={{ bgcolor:'#dcfce7', color:'#166534' }} />
        <Chip label={`Canceladas: ${resumen.canceladas}`} sx={{ bgcolor:'#fee2e2', color:'#991b1b' }} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Exportar a Excel"><IconButton onClick={exportExcel}><DownloadIcon /></IconButton></Tooltip>
      </Stack>
      {/* Filtros y búsqueda */}
      <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
        <TextField label="Buscar orden, destino o usuario" value={q} onChange={e=>setQ(e.target.value)} sx={{ minWidth:220 }} />
        <TextField select label="Status" value={status} onChange={e=>setStatus(e.target.value)} sx={{ minWidth:140 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="PENDIENTE">Pendiente</MenuItem>
          <MenuItem value="COMPLETADA">Completada</MenuItem>
          <MenuItem value="CANCELADA">Cancelada</MenuItem>
        </TextField>
      </Stack>
      <Paper elevation={1} sx={{ p:0, borderRadius:3 }}>
        <Table size="small" sx={{ minWidth:1000 }}>
          <TableHead>
            <TableRow sx={{ background:'#101c2b', position:'sticky', top:0, zIndex:1 }}>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Orden</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Destino</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Status</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Líneas</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Creó</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700, textAlign:'center' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map(r => (
              <TableRow key={r._id} sx={{ transition:'background 0.2s', '&:hover': { background:'#22304d' } }}>
                <TableCell sx={{ fontFamily:'monospace', color:'#fff' }}>{r.orderNumber}</TableCell>
                <TableCell sx={{ color:'#fff' }}>{r.destinationType} {r.destinationRef ? `· ${r.destinationRef}` : ''}</TableCell>
                <TableCell sx={{ color:'#fff' }}><Chip size="small" label={r.status} /></TableCell>
                <TableCell sx={{ color:'#fff' }}>{(r.lines||[]).map(l => `${l.sku}(${l.qty})`).join(', ')}</TableCell>
                <TableCell sx={{ color:'#fff' }}>{r.createdBy?.email || '—'}</TableCell>
                <TableCell sx={{ textAlign:'center' }}>
                  <Tooltip title="Ver detalle"><IconButton size="small" sx={{ color:'#0369a1' }} onClick={()=>openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Marcar como completada"><IconButton size="small" sx={{ color:'#22c55e' }} onClick={()=>markCompleted(r._id)} disabled={r.status==='COMPLETADA' || r.status==='CANCELADA'}><DoneIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Cancelar"><IconButton size="small" sx={{ color:'#ef4444' }} onClick={()=>markCancelled(r._id)} disabled={r.status==='COMPLETADA' || r.status==='CANCELADA'}><CancelIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Eliminar"><IconButton size="small" sx={{ color:'#991b1b' }} onClick={()=>deleteOrder(r._id)}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {/* Paginación */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py:2 }}>
          <Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</Button>
          <Typography> Página {page} de {Math.max(1, Math.ceil(filtered.length/pageSize))} </Typography>
          <Button disabled={page*pageSize>=filtered.length} onClick={()=>setPage(p=>p+1)}>Siguiente</Button>
        </Stack>
      </Paper>
      {/* Modal de detalle */}
      {showDetail && selected && (
        <Paper elevation={3} sx={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:2000, minWidth:340, maxWidth:480, p:3 }}>
          <Typography variant="h6" sx={{ mb:2 }}>Detalle de orden</Typography>
          <Typography variant="body2"><b>Orden:</b> {selected.orderNumber}</Typography>
          <Typography variant="body2"><b>Destino:</b> {selected.destinationType} {selected.destinationRef ? `· ${selected.destinationRef}` : ''}</Typography>
          <Typography variant="body2"><b>Status:</b> {selected.status}</Typography>
          <Typography variant="body2"><b>Líneas:</b> {(selected.lines||[]).map(l => `${l.sku}(${l.qty})`).join(', ')}</Typography>
          <Typography variant="body2"><b>Notas:</b> {selected.notes || '—'}</Typography>
          <Typography variant="body2"><b>Creó:</b> {selected.createdBy?.email || '—'}</Typography>
          <Button sx={{ mt:2 }} variant="contained" onClick={closeDetail}>Cerrar</Button>
        </Paper>
      )}

      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear orden de salida</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField select label="Destino" value={destType} onChange={(e)=>setDestType(e.target.value)}>
              <MenuItem value="PRODUCTION">Producción</MenuItem>
              <MenuItem value="CLIENT">Cliente</MenuItem>
              <MenuItem value="OTHER">Otro</MenuItem>
            </TextField>
            <TextField label="Referencia (P1/Cliente/Orden)" value={destRef} onChange={(e)=>setDestRef(e.target.value)} />
            <TextField label="SKU" value={sku} onChange={(e)=>setSku(e.target.value)} />
            <TextField label="Qty" type="number" value={qty} onChange={(e)=>setQty(e.target.value)} />
            <TextField label="Notas" value={notes} onChange={(e)=>setNotes(e.target.value)} />
            <Alert severity="info">La API permite surtir la orden seleccionando tarimas con /fulfill (UI de surtido se puede agregar).</Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button disabled={!canCreate} variant="contained" onClick={create}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
