import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'

export default function ProductionPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState([])
  const [area, setArea] = useState('P1')
  const [sku, setSku] = useState('TV-55-4K')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  const load = async () => {
    const res = await api(token).get('/api/production')
    setRows(res.data)
  }

  useEffect(() => { load() }, [token])

  const create = async () => {
    await api(token).post('/api/production', { area, items: [{ sku, qty: Number(qty) }], note })
    setNote('')
    await load()
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Producción</Typography>

      <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb:2 }}>Nueva solicitud</Typography>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2}>
          <TextField select label="Área" value={area} onChange={(e)=>setArea(e.target.value)} sx={{ minWidth: 140 }}>
            {['P1','P2','P3','P4'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
          </TextField>
          <TextField label="SKU" value={sku} onChange={(e)=>setSku(e.target.value)} fullWidth />
          <TextField label="Qty" type="number" value={qty} onChange={(e)=>setQty(e.target.value)} sx={{ width: 120 }} />
          <TextField label="Nota" value={note} onChange={(e)=>setNote(e.target.value)} fullWidth />
          <Button variant="contained" onClick={create}>Crear</Button>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb:2 }}>Solicitudes</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Área</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Solicitó</TableCell>
              <TableCell>Nota</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r._id}>
                <TableCell>{r.area}</TableCell>
                <TableCell>{r.status}</TableCell>
                <TableCell>{(r.items||[]).map(i => `${i.sku}(${i.qty})`).join(', ')}</TableCell>
                <TableCell>{r.requestedBy?.email || '—'}</TableCell>
                <TableCell>{r.note || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
