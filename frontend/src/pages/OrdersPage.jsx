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
import Alert from '@mui/material/Alert'

export default function OrdersPage() {
  const { token, user } = useAuth()
  const canCreate = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR' || ['Supervisor','Coordinador','Gerente'].includes((user?.position||'').trim())

  const client = useMemo(() => api(token), [token])
  const [rows, setRows] = useState([])
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

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Órdenes de salida</Typography>

      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
          <Button disabled={!canCreate} variant="contained" onClick={()=>setOpen(true)}>Crear orden</Button>
          {!canCreate && <Alert severity="warning">Solo Supervisor/Coordinador/Gerente (o rol SUPERVISOR/ADMIN) puede crear órdenes.</Alert>}
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Orden</TableCell>
              <TableCell>Destino</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Líneas</TableCell>
              <TableCell>Creó</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r._id}>
                <TableCell sx={{ fontFamily:'monospace' }}>{r.orderNumber}</TableCell>
                <TableCell>{r.destinationType} {r.destinationRef ? `· ${r.destinationRef}` : ''}</TableCell>
                <TableCell><Chip size="small" label={r.status} /></TableCell>
                <TableCell>{(r.lines||[]).map(l => `${l.sku}(${l.qty})`).join(', ')}</TableCell>
                <TableCell>{r.createdBy?.email || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

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
