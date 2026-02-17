import React, { useEffect, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import dayjs from 'dayjs'

export default function MovementsPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState([])

  useEffect(() => {
    (async () => {
      const res = await api(token).get('/api/movements')
      setRows(res.data)
    })()
  }, [token])

  const downloadCsv = async () => {
    const base = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000'
    const url = `${base}/api/movements?export=csv`
    const a = document.createElement('a')
    a.href = url
    a.target = '_blank'
    a.rel = 'noreferrer'
    a.click()
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Movimientos</Typography>
      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Box sx={{ display:'flex', justifyContent:'space-between', mb:2 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Bitácora</Typography>
          <Button variant="outlined" onClick={downloadCsv}>Exportar CSV</Button>
        </Box>

        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>De</TableCell>
              <TableCell>A</TableCell>
              <TableCell>Nota</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r._id}>
                <TableCell>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                <TableCell>{r.type}</TableCell>
                <TableCell sx={{ fontFamily:'monospace' }}>{r.pallet?.code || '—'}</TableCell>
                <TableCell>{r.user?.email || '—'}</TableCell>
                <TableCell>{r.fromLocation ? `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}` : '—'}</TableCell>
                <TableCell>{r.toLocation ? `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}` : '—'}</TableCell>
                <TableCell>{r.note || '—'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
