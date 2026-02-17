import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'

export default function InventoryPage() {
  const { token } = useAuth()
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])

  useEffect(() => {
    (async () => {
      const res = await api(token).get('/api/pallets', { params: { q } })
      setRows(res.data)
    })()
  }, [token, q])

  const filtered = useMemo(() => rows, [rows])

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Inventario</Typography>
      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
          <TextField label="Buscar (SKU, lote, código)" value={q} onChange={(e)=>setQ(e.target.value)} fullWidth />
        </Stack>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Código</TableCell>
              <TableCell>Ubicación</TableCell>
              <TableCell>Estatus</TableCell>
              <TableCell>Items</TableCell>
              <TableCell>Lote</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p) => (
              <TableRow key={p._id}>
                <TableCell sx={{ fontFamily:'monospace' }}>{p.code}</TableCell>
                <TableCell>
                  {p.location ? `${p.location.area}-${p.location.level}${p.location.position}` : '—'}
                </TableCell>
                <TableCell><Chip size="small" label={p.status} /></TableCell>
                <TableCell>
                  {(p.items || []).map(it => `${it.sku}(${it.qty})`).join(', ')}
                </TableCell>
                <TableCell>{p.lot || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
