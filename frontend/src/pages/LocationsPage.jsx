import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'

export default function LocationsPage() {
  const { token, user } = useAuth()
  const canEdit = ['ADMIN','SUPERVISOR'].includes(user?.role)
  const client = useMemo(() => api(token), [token])

  const [area, setArea] = useState('A1')
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [type, setType] = useState('RACK')
  const [maxPallets, setMaxPallets] = useState(1)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('Mantenimiento')

  const load = async () => {
    const res = await client.get('/api/locations', { params: { area } })
    setRows(res.data)
  }

  useEffect(() => { load() }, [token, area])

  const openEdit = (l) => {
    setSelected(l)
    setType(l.type || 'RACK')
    setMaxPallets(l.maxPallets || 1)
    setNotes(l.notes || '')
    setReason(l.blockedReason || 'Mantenimiento')
    setOpen(true)
  }

  const save = async () => {
    await client.patch(`/api/locations/${selected._id}`, { type, maxPallets: Number(maxPallets), notes })
    await load()
    setOpen(false)
  }

  const block = async () => {
    await client.patch(`/api/locations/${selected._id}/block`, { reason })
    await load()
    setOpen(false)
  }

  const unblock = async () => {
    await client.patch(`/api/locations/${selected._id}/unblock`)
    await load()
    setOpen(false)
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Ubicaciones</Typography>
      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        {!canEdit && <Alert severity="warning" sx={{ mb:2 }}>Solo ADMIN/SUPERVISOR puede editar ubicaciones y bloquear/desbloquear.</Alert>}
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb:2 }}>
          <TextField select label="Área" value={area} onChange={(e)=>setArea(e.target.value)} sx={{ minWidth: 120 }}>
            {['A1','A2','A3','A4'].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
          <Box sx={{ flex:1 }} />
          <Chip size="small" label="VACÍO" sx={{ bgcolor:'#f3f4f6' }} />
          <Chip size="small" label="OCUPADO" sx={{ bgcolor:'#dcfce7' }} />
          <Chip size="small" label="BLOQUEADO" sx={{ bgcolor:'#fee2e2' }} />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Ubicación</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Capacidad</TableCell>
              <TableCell>Notas / Motivo</TableCell>
              <TableCell>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(l => (
              <TableRow key={l._id}>
                <TableCell>{l.area}-{l.level}{l.position}</TableCell>
                <TableCell><Chip size="small" label={l.state} /></TableCell>
                <TableCell>{l.type || 'RACK'}</TableCell>
                <TableCell>{l.maxPallets || 1}</TableCell>
                <TableCell>{l.blocked ? (l.blockedReason || 'Bloqueado') : (l.notes || '—')}</TableCell>
                <TableCell><Button size="small" onClick={()=>openEdit(l)}>Editar</Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      <Dialog open={open} onClose={()=>setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar ubicación</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ opacity:.8, mb:2 }}>
            {selected ? `${selected.area}-${selected.level}${selected.position}` : ''}
          </Typography>
          <Stack spacing={2}>
            <TextField select label="Tipo" value={type} onChange={(e)=>setType(e.target.value)}>
              {['RACK','FLOOR','QUARANTINE','RETURNS'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Capacidad (max tarimas)" type="number" value={maxPallets} onChange={(e)=>setMaxPallets(e.target.value)} />
            <TextField label="Notas" value={notes} onChange={(e)=>setNotes(e.target.value)} />
            <TextField label="Motivo de bloqueo" value={reason} onChange={(e)=>setReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={()=>setOpen(false)}>Cerrar</Button>
          <Box sx={{ flex:1 }} />
          <Button disabled={!canEdit} color="error" onClick={block}>Bloquear</Button>
          <Button disabled={!canEdit} onClick={unblock}>Desbloquear</Button>
          <Button disabled={!canEdit} variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
