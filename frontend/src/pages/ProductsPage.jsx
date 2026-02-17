import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
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

export default function ProductsPage() {
  const { token, user } = useAuth()
  const isWriter = ['ADMIN','SUPERVISOR'].includes(user?.role)
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ sku:'', description:'', brand:'', model:'', category:'', unit:'pz' })
  const [err, setErr] = useState('')

  const load = async () => {
    const res = await api(token).get('/api/products', { params: { q } })
    setRows(res.data)
  }

  useEffect(() => { load() }, [token, q])

  const create = async () => {
    setErr('')
    try {
      await api(token).post('/api/products', form)
      setOpen(false)
      setForm({ sku:'', description:'', brand:'', model:'', category:'', unit:'pz' })
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Error')
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Productos (Catálogo SKU)</Typography>
      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
          <TextField label="Buscar (SKU, descripción, marca)" value={q} onChange={(e)=>setQ(e.target.value)} fullWidth />
          <Button disabled={!isWriter} variant="contained" onClick={()=>setOpen(true)}>Nuevo SKU</Button>
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>SKU</TableCell>
              <TableCell>Descripción</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>Marca/Modelo</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Activo</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r._id}>
                <TableCell sx={{ fontFamily:'monospace', fontWeight:800 }}>{r.sku}</TableCell>
                <TableCell>{r.description || '—'}</TableCell>
                <TableCell>{r.category || '—'}</TableCell>
                <TableCell>{[r.brand, r.model].filter(Boolean).join(' / ') || '—'}</TableCell>
                <TableCell>{r.unit || 'pz'}</TableCell>
                <TableCell><Chip size="small" label={r.isActive ? 'Sí' : 'No'} /></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo SKU</DialogTitle>
        <DialogContent>
          {!isWriter && <Alert severity="warning" sx={{ mb:2 }}>Solo ADMIN/SUPERVISOR puede crear SKUs.</Alert>}
          {err && <Alert severity="error" sx={{ mb:2 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ mt:1 }}>
            <TextField label="SKU" value={form.sku} onChange={(e)=>setForm({ ...form, sku: e.target.value })} />
            <TextField label="Descripción" value={form.description} onChange={(e)=>setForm({ ...form, description: e.target.value })} />
            <TextField label="Categoría" value={form.category} onChange={(e)=>setForm({ ...form, category: e.target.value })} />
            <TextField label="Marca" value={form.brand} onChange={(e)=>setForm({ ...form, brand: e.target.value })} />
            <TextField label="Modelo" value={form.model} onChange={(e)=>setForm({ ...form, model: e.target.value })} />
            <TextField label="Unidad" value={form.unit} onChange={(e)=>setForm({ ...form, unit: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cancelar</Button>
          <Button disabled={!isWriter} variant="contained" onClick={create}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
