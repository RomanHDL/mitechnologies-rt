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
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'

export default function CountsPage() {
  const { token, user } = useAuth()
  const can = ['ADMIN','SUPERVISOR'].includes(user?.role)
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [area, setArea] = useState('A1')
  const [scope, setScope] = useState('AREA')
  const [level, setLevel] = useState('A')
  const [name, setName] = useState('')

  const load = async () => {
    const res = await client.get('/api/counts')
    setRows(res.data)
  }
  useEffect(() => { load() }, [token])

  const create = async () => {
    await client.post('/api/counts', { name, scope, area, level })
    setName('')
    await load()
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Conteos cíclicos</Typography>
      <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2 }}>
        {!can && <Alert severity="warning">Solo ADMIN/SUPERVISOR puede crear y capturar conteos.</Alert>}
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mt:1 }}>
          <TextField label="Nombre" value={name} onChange={(e)=>setName(e.target.value)} fullWidth />
          <TextField select label="Scope" value={scope} onChange={(e)=>setScope(e.target.value)} sx={{ minWidth: 140 }}>
            <MenuItem value="AREA">Área</MenuItem>
            <MenuItem value="LEVEL">Nivel</MenuItem>
          </TextField>
          <TextField select label="Área" value={area} onChange={(e)=>setArea(e.target.value)} sx={{ minWidth: 120 }}>
            {['A1','A2','A3','A4'].map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>
          <TextField disabled={scope!=='LEVEL'} select label="Nivel" value={level} onChange={(e)=>setLevel(e.target.value)} sx={{ minWidth: 120 }}>
            {['A','B','C'].map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
          </TextField>
          <Button disabled={!can} variant="contained" onClick={create}>Crear conteo</Button>
        </Stack>
        <Alert severity="info" sx={{ mt:2 }}>
          Crea conteos con snapshot por ubicación. Captura por ubicación se hace vía API (/counts/:id/line/:locationId).
        </Alert>
      </Paper>

      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb:2 }}>Conteos</Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nombre</TableCell>
              <TableCell>Scope</TableCell>
              <TableCell>Área</TableCell>
              <TableCell>Nivel</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Creó</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(r => (
              <TableRow key={r._id}>
                <TableCell>{r.name}</TableCell>
                <TableCell>{r.scope}</TableCell>
                <TableCell>{r.area}</TableCell>
                <TableCell>{r.level || '—'}</TableCell>
                <TableCell><Chip size="small" label={r.status} /></TableCell>
                <TableCell>{r.createdBy?.email || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
