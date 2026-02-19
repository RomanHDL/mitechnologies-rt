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
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import InfoIcon from '@mui/icons-material/Info'
import DownloadIcon from '@mui/icons-material/Download'
import * as XLSX from 'xlsx'
import Alert from '@mui/material/Alert'

export default function CountsPage() {
  const { token, user } = useAuth()
  const can = ['ADMIN','SUPERVISOR'].includes(user?.role)
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
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

  // Filtros y búsqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r => (r.name || '').toLowerCase().includes(q.toLowerCase()))
    if (status) list = list.filter(r => r.status === status)
    return list
  }, [rows, q, status])

  // Resumen superior
  const resumen = useMemo(() => {
    return {
      total: filtered.length,
      abiertos: filtered.filter(r => r.status === 'OPEN').length,
      cerrados: filtered.filter(r => r.status === 'CLOSED').length,
      validados: filtered.filter(r => r.status === 'VALIDATED').length
    }
  }, [filtered])

  // Exportar a Excel
  const exportExcel = () => {
    const data = filtered.map(r => ({
      Nombre: r.name,
      Scope: r.scope,
      Área: r.area,
      Nivel: r.level,
      Status: r.status,
      Creó: r.createdBy?.email || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conteos')
    XLSX.writeFile(wb, 'conteos_ciclicos.xlsx')
  }

  // Acciones rápidas
  const closeCount = async (id) => {
    await client.patch(`/api/counts/${id}/status`, { status: 'CLOSED' })
    await load()
  }
  const validateCount = async (id) => {
    await client.patch(`/api/counts/${id}/status`, { status: 'VALIDATED' })
    await load()
  }

  // Modal de detalle (simulado)
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  // Paginación
  const paginated = useMemo(() => {
    const start = (page-1)*pageSize
    return filtered.slice(start, start+pageSize)
  }, [filtered, page])

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Conteos cíclicos</Typography>
      {/* Resumen superior */}
      <Stack direction="row" spacing={2} sx={{ mb:2 }}>
        <Chip label={`Total: ${resumen.total}`} color="primary" />
        <Chip label={`Abiertos: ${resumen.abiertos}`} sx={{ bgcolor:'#fef9c3', color:'#a16207' }} />
        <Chip label={`Cerrados: ${resumen.cerrados}`} sx={{ bgcolor:'#bae6fd', color:'#0369a1' }} />
        <Chip label={`Validados: ${resumen.validados}`} sx={{ bgcolor:'#dcfce7', color:'#166534' }} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Exportar a Excel"><IconButton onClick={exportExcel}><DownloadIcon /></IconButton></Tooltip>
      </Stack>
      {/* Filtros y búsqueda */}
      <Stack direction={{ xs:'column', md:'row' }} spacing={2} sx={{ mb:2 }}>
        <TextField label="Buscar conteo" value={q} onChange={e=>setQ(e.target.value)} sx={{ minWidth:220 }} />
        <TextField select label="Status" value={status} onChange={e=>setStatus(e.target.value)} sx={{ minWidth:140 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="OPEN">Abierto</MenuItem>
          <MenuItem value="CLOSED">Cerrado</MenuItem>
          <MenuItem value="VALIDATED">Validado</MenuItem>
        </TextField>
        <Button disabled={!can} variant="contained" onClick={()=>setShowDetail(false) || setOpenCreate(true)}>Nuevo conteo</Button>
      </Stack>
      {/* Tabla de conteos */}
      <Paper elevation={1} sx={{ p:0, borderRadius:3 }}>
        <Table size="small" sx={{ minWidth:1000 }}>
          <TableHead>
            <TableRow sx={{ background:'#101c2b', position:'sticky', top:0, zIndex:1 }}>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Nombre</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Scope</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Área</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Nivel</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Status</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Creó</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700, textAlign:'center' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((r, idx) => (
              <TableRow key={r._id} sx={{ background: idx % 2 === 0 ? '#19233a' : '#101c2b', transition:'background 0.2s', '&:hover': { background:'#22304d' } }}>
                <TableCell sx={{ color:'#fff' }}>{r.name}</TableCell>
                <TableCell sx={{ color:'#fff' }}>{r.scope}</TableCell>
                <TableCell sx={{ color:'#fff' }}>{r.area}</TableCell>
                <TableCell sx={{ color:'#fff' }}>{r.level || '—'}</TableCell>
                <TableCell sx={{ color:'#fff' }}><Chip size="small" label={r.status} /></TableCell>
                <TableCell sx={{ color:'#fff' }}>{r.createdBy?.email || '—'}</TableCell>
                <TableCell sx={{ textAlign:'center' }}>
                  <Tooltip title="Ver detalle"><IconButton size="small" sx={{ color:'#0369a1' }} onClick={()=>openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Cerrar conteo"><IconButton size="small" sx={{ color:'#eab308' }} onClick={()=>closeCount(r._id)} disabled={r.status!=='OPEN'}><DoneIcon fontSize="small" /></IconButton></Tooltip>
                  <Tooltip title="Validar conteo"><IconButton size="small" sx={{ color:'#22c55e' }} onClick={()=>validateCount(r._id)} disabled={r.status!=='CLOSED'}><EditIcon fontSize="small" /></IconButton></Tooltip>
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
      {/* Modal de detalle de conteo */}
      {showDetail && selected && (
        <Paper elevation={3} sx={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:2000, minWidth:340, maxWidth:600, p:3 }}>
          <Typography variant="h6" sx={{ mb:2 }}>Detalle de conteo</Typography>
          <Typography variant="body2"><b>Nombre:</b> {selected.name}</Typography>
          <Typography variant="body2"><b>Scope:</b> {selected.scope}</Typography>
          <Typography variant="body2"><b>Área:</b> {selected.area}</Typography>
          <Typography variant="body2"><b>Nivel:</b> {selected.level || '—'}</Typography>
          <Typography variant="body2"><b>Status:</b> {selected.status}</Typography>
          <Typography variant="body2"><b>Creó:</b> {selected.createdBy?.email || '—'}</Typography>
          <Typography variant="body2" sx={{ mt:2, mb:1 }}><b>Líneas del conteo:</b></Typography>
          {/* Aquí podrías mostrar líneas reales si la API lo permite */}
          <Typography variant="caption">(Simulación de líneas, diferencias, incidencias, historial...)</Typography>
          <Button sx={{ mt:2 }} variant="contained" onClick={closeDetail}>Cerrar</Button>
        </Paper>
      )}
    </Box>
  )
}
