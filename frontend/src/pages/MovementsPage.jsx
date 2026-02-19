import React, { useEffect, useState, useMemo } from 'react'
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
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import InfoIcon from '@mui/icons-material/Info'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import dayjs from 'dayjs'

export default function MovementsPage() {
  const { token } = useAuth()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [user, setUser] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [selected, setSelected] = useState(null)

  useEffect(() => {
    (async () => {
      const res = await api(token).get('/api/movements')
      setRows(res.data)
    })()
  }, [token])

  const downloadCsv = async () => {
    // Exportar solo los movimientos filtrados
    const csvRows = [
      ['Fecha','Tipo','Código','Usuario','De','A','Nota']
    ]
    filtered.forEach(r => {
      csvRows.push([
        dayjs(r.createdAt).format('YYYY-MM-DD HH:mm'),
        r.type,
        r.pallet?.code || '',
        r.user?.email || '',
        r.fromLocation ? `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}` : '',
        r.toLocation ? `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}` : '',
        r.note || ''
      ])
    })
    const csv = csvRows.map(r => r.map(x => '"'+String(x).replace(/"/g,'""')+'"').join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'movimientos.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  // Filtros y búsqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r =>
      (r.pallet?.code || '').toLowerCase().includes(q.toLowerCase()) ||
      (r.user?.email || '').toLowerCase().includes(q.toLowerCase()) ||
      (r.note || '').toLowerCase().includes(q.toLowerCase())
    )
    if (type) list = list.filter(r => r.type === type)
    if (user) list = list.filter(r => (r.user?.email || '') === user)
    if (dateFrom) list = list.filter(r => dayjs(r.createdAt).isAfter(dayjs(dateFrom).startOf('day')))
    if (dateTo) list = list.filter(r => dayjs(r.createdAt).isBefore(dayjs(dateTo).endOf('day')))
    return list
  }, [rows, q, type, user, dateFrom, dateTo])

  // Paginación
  const paginated = useMemo(() => {
    const start = (page-1)*pageSize
    return filtered.slice(start, start+pageSize)
  }, [filtered, page])

  // Resumen superior
  const resumen = useMemo(() => {
    return {
      total: filtered.length,
      entradas: filtered.filter(r => r.type === 'IN').length,
      salidas: filtered.filter(r => r.type === 'OUT').length
    }
  }, [filtered])

  // Usuarios únicos para filtro
  const usuarios = useMemo(() => {
    const set = new Set()
    rows.forEach(r => { if (r.user?.email) set.add(r.user.email) })
    return Array.from(set)
  }, [rows])

  // Copiar código
  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
  }

  // Detalle de movimiento (modal simple)
  const [showDetail, setShowDetail] = useState(false)
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Movimientos</Typography>
      {/* Resumen superior */}
      <Stack direction="row" spacing={2} sx={{ mb:2 }}>
        <Tooltip title="Total movimientos"><Button variant="contained">Total: {resumen.total}</Button></Tooltip>
        <Tooltip title="Entradas"><Button variant="outlined" startIcon={<ArrowDownwardIcon sx={{ color:'#22c55e' }} />}>Entradas: {resumen.entradas}</Button></Tooltip>
        <Tooltip title="Salidas"><Button variant="outlined" startIcon={<ArrowUpwardIcon sx={{ color:'#ef4444' }} />}>Salidas: {resumen.salidas}</Button></Tooltip>
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={downloadCsv}>Exportar CSV</Button>
      </Stack>
      {/* Filtros y búsqueda */}
      <Paper elevation={1} sx={{ p:2, borderRadius:3, mb:2 }}>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems={{ xs:'stretch', md:'center' }}>
          <TextField label="Buscar código, usuario o nota" value={q} onChange={e=>setQ(e.target.value)} sx={{ minWidth: 220 }} />
          <TextField select label="Tipo" value={type} onChange={e=>setType(e.target.value)} sx={{ minWidth: 120 }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="IN">Entrada</MenuItem>
            <MenuItem value="OUT">Salida</MenuItem>
          </TextField>
          <TextField select label="Usuario" value={user} onChange={e=>setUser(e.target.value)} sx={{ minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {usuarios.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>
          <TextField type="date" label="Desde" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140 }} />
          <TextField type="date" label="Hasta" value={dateTo} onChange={e=>setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140 }} />
        </Stack>
      </Paper>
      {/* Tabla moderna con iconos y tooltips */}
      <Paper elevation={1} sx={{ p:0, borderRadius:3 }}>
        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ background:'#101c2b', position:'sticky', top:0, zIndex:1 }}>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Fecha</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Tipo</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Código</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Usuario</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>De</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>A</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700 }}>Nota</TableCell>
              <TableCell sx={{ color:'#fff', fontWeight:700, textAlign:'center' }}>Acción</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {paginated.map((r, idx) => {
              const isIn = r.type === 'IN'
              const typeIcon = isIn ? <ArrowDownwardIcon sx={{ color:'#22c55e', verticalAlign:'middle' }} fontSize="small" /> : <ArrowUpwardIcon sx={{ color:'#ef4444', verticalAlign:'middle' }} fontSize="small" />
              return (
                <TableRow key={r._id} sx={{ background: idx % 2 === 0 ? '#19233a' : '#101c2b', '&:hover': { background:'#22304d' } }}>
                  <TableCell sx={{ color:'#fff' }}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                  <TableCell sx={{ color:'#fff' }}>
                    <Tooltip title={isIn ? 'Entrada' : 'Salida'} arrow>{typeIcon}</Tooltip>
                    <Typography variant="caption" sx={{ ml:1, color:'#fff' }}>{r.type}</Typography>
                  </TableCell>
                  <TableCell sx={{ fontFamily:'monospace', color:'#fff' }}>
                    <Tooltip title="Ver detalle"><IconButton size="small" onClick={()=>openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                    {r.pallet?.code || '—'}
                    <Tooltip title="Copiar código"><IconButton size="small" onClick={()=>copyCode(r.pallet?.code || '')}><FileCopyIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                  <TableCell sx={{ color:'#fff' }}>{r.user?.email || '—'}</TableCell>
                  <TableCell sx={{ color:'#fff' }}>{r.fromLocation ? `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}` : '—'}</TableCell>
                  <TableCell sx={{ color:'#fff' }}>{r.toLocation ? `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}` : '—'}</TableCell>
                  <TableCell sx={{ color:'#fff', maxWidth:180, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    <Tooltip title={r.note || '—'} arrow>
                      <span>{(r.note || '—').length > 25 ? (r.note || '—').slice(0, 25) + '…' : (r.note || '—')}</span>
                    </Tooltip>
                  </TableCell>
                  <TableCell sx={{ textAlign:'center' }}>
                    <Tooltip title="Ver detalle"><IconButton size="small" onClick={()=>openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        {/* Paginación simple */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py:2 }}>
          <Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</Button>
          <Typography> Página {page} de {Math.max(1, Math.ceil(filtered.length/pageSize))} </Typography>
          <Button disabled={page*pageSize>=filtered.length} onClick={()=>setPage(p=>p+1)}>Siguiente</Button>
        </Stack>
      </Paper>
      {/* Modal de detalle de movimiento */}
      {showDetail && selected && (
        <Paper elevation={3} sx={{ position:'fixed', top:'50%', left:'50%', transform:'translate(-50%,-50%)', zIndex:2000, minWidth:340, maxWidth:480, p:3 }}>
          <Typography variant="h6" sx={{ mb:2 }}>Detalle de movimiento</Typography>
          <Typography variant="body2"><b>Fecha:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
          <Typography variant="body2"><b>Tipo:</b> {selected.type}</Typography>
          <Typography variant="body2"><b>Código:</b> {selected.pallet?.code || '—'}</Typography>
          <Typography variant="body2"><b>Usuario:</b> {selected.user?.email || '—'}</Typography>
          <Typography variant="body2"><b>De:</b> {selected.fromLocation ? `${selected.fromLocation.area}-${selected.fromLocation.level}${selected.fromLocation.position}` : '—'}</Typography>
          <Typography variant="body2"><b>A:</b> {selected.toLocation ? `${selected.toLocation.area}-${selected.toLocation.level}${selected.toLocation.position}` : '—'}</Typography>
          <Typography variant="body2"><b>Nota:</b> {selected.note || '—'}</Typography>
          <Button sx={{ mt:2 }} variant="contained" onClick={closeDetail}>Cerrar</Button>
        </Paper>
      )}
    </Box>
  )
}
