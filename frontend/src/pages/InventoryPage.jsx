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
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import DownloadIcon from '@mui/icons-material/Download'

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

  // Resumen superior
  const resumen = useMemo(() => {
    let total = rows.length
    let bajo = 0, agotado = 0, disponible = 0
    for (const p of rows) {
      const qty = (p.items || []).reduce((a, b) => a + (b.qty || 0), 0)
      if (qty === 0) agotado++
      else if (qty < 5) bajo++
      else disponible++
    }
    return { total, bajo, agotado, disponible }
  }, [rows])

  const filtered = useMemo(() => rows, [rows])

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Inventario</Typography>
      {/* Resumen superior */}
      <Stack direction="row" spacing={2} sx={{ mb:2 }}>
        <Chip label={`Total: ${resumen.total}`} color="primary" />
        <Chip label={`Disponible: ${resumen.disponible}`} sx={{ bgcolor:'#dcfce7', color:'#166534' }} />
        <Chip label={`Bajo: ${resumen.bajo}`} sx={{ bgcolor:'#fef9c3', color:'#a16207' }} />
        <Chip label={`Agotado: ${resumen.agotado}`} sx={{ bgcolor:'#fee2e2', color:'#991b1b' }} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Exportar a Excel"><IconButton><DownloadIcon /></IconButton></Tooltip>
      </Stack>
      <Paper elevation={1} sx={{ p:0, borderRadius:3, overflow:'auto' }}>
        <Table size="small" sx={{ minWidth: 900 }}>
          <TableHead>
            <TableRow sx={{ background:'#101c2b', position:'sticky', top:0, zIndex:1 }}>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Código</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Ubicación</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Estatus</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Items</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Lote</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700, textAlign:'center' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((p, idx) => {
              // Estado visual
              const qty = (p.items || []).reduce((a, b) => a + (b.qty || 0), 0)
              let statusIcon = <CheckCircleIcon sx={{ color:'#22c55e', verticalAlign:'middle' }} fontSize="small" />
              let statusColor = '#dcfce7'
              let statusText = 'Disponible'
              if (qty === 0) { statusIcon = <ErrorIcon sx={{ color:'#ef4444', verticalAlign:'middle' }} fontSize="small" />; statusColor = '#fee2e2'; statusText = 'Agotado' }
              else if (qty < 5) { statusIcon = <WarningIcon sx={{ color:'#eab308', verticalAlign:'middle' }} fontSize="small" />; statusColor = '#fef9c3'; statusText = 'Bajo' }
              // Tooltip para items
              const itemsText = (p.items || []).map(it => `${it.sku}(${it.qty})`).join(', ')
              return (
                <TableRow key={p._id} sx={{ background: idx % 2 === 0 ? '#19233a' : '#101c2b', '&:hover': { background:'#22304d' } }}>
                  <TableCell sx={{ fontFamily:'monospace', color:'#fff' }}>{p.code}</TableCell>
                  <TableCell sx={{ color:'#fff' }}>{p.location?.code || '—'}</TableCell>
                  <TableCell sx={{ color:'#fff' }}>
                    <Tooltip title={statusText} arrow>{statusIcon}</Tooltip>
                    <Typography variant="caption" sx={{ ml:1, color:'#fff' }}>{statusText}</Typography>
                  </TableCell>
                  <TableCell sx={{ color:'#fff', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    <Tooltip title={itemsText} arrow>
                      <span>{itemsText.length > 25 ? itemsText.slice(0, 25) + '…' : itemsText}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ color:'#fff' }}>{p.lot || '—'}</TableCell>
                  <TableCell sx={{ textAlign:'center' }}>
                    <Tooltip title="Editar"><IconButton size="small" sx={{ color:'#fff' }}><EditIcon fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="Eliminar"><IconButton size="small" sx={{ color:'#fff' }}><DeleteIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}
