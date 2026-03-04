import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'
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
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import InfoIcon from '@mui/icons-material/Info'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import dayjs from 'dayjs'

export default function MovementsPage() {
  const { token } = useAuth()
  const ps = usePageStyles()
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

  // Detalle de movimiento (modal)
  const [showDetail, setShowDetail] = useState(false)
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  return (
    <Box>
      <Typography variant="h6" sx={{ ...ps.pageTitle, mb: 2 }}>Movimientos</Typography>
      {/* Resumen superior */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Chip label={`Total: ${resumen.total}`} sx={ps.metricChip('default')} />
        <Chip
          icon={<ArrowDownwardIcon sx={{ color: 'inherit' }} />}
          label={`Entradas: ${resumen.entradas}`}
          sx={ps.metricChip('ok')}
        />
        <Chip
          icon={<ArrowUpwardIcon sx={{ color: 'inherit' }} />}
          label={`Salidas: ${resumen.salidas}`}
          sx={ps.metricChip('bad')}
        />
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={downloadCsv}>Exportar CSV</Button>
      </Stack>
      {/* Filtros y búsqueda */}
      <Paper elevation={1} sx={{ ...ps.card, p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField label="Buscar código, usuario o nota" value={q} onChange={e=>setQ(e.target.value)} sx={{ minWidth: 220, ...ps.inputSx }} />
          <TextField select label="Tipo" value={type} onChange={e=>setType(e.target.value)} sx={{ minWidth: 120, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="IN">Entrada</MenuItem>
            <MenuItem value="OUT">Salida</MenuItem>
          </TextField>
          <TextField select label="Usuario" value={user} onChange={e=>setUser(e.target.value)} sx={{ minWidth: 180, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            {usuarios.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>
          <TextField type="date" label="Desde" value={dateFrom} onChange={e=>setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140, ...ps.inputSx }} />
          <TextField type="date" label="Hasta" value={dateTo} onChange={e=>setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140, ...ps.inputSx }} />
        </Stack>
      </Paper>
      {/* Tabla moderna con iconos y tooltips */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ ...ps.tableHeaderRow, position: 'sticky', top: 0, zIndex: 1 }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Código</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>De</TableCell>
                <TableCell>A</TableCell>
                <TableCell>Nota</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.map((r, idx) => {
                const isIn = r.type === 'IN'
                const typeIcon = isIn
                  ? <ArrowDownwardIcon sx={ps.actionBtn('success')} fontSize="small" />
                  : <ArrowUpwardIcon sx={ps.actionBtn('error')} fontSize="small" />
                return (
                  <TableRow key={r._id} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellText}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                    <TableCell sx={ps.cellText}>
                      <Tooltip title={isIn ? 'Entrada' : 'Salida'} arrow>{typeIcon}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.primary' }}>{r.type}</Typography>
                    </TableCell>
                    <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>
                      <Tooltip title="Ver detalle"><IconButton size="small" onClick={()=>openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                      {r.pallet?.code || '—'}
                      <Tooltip title="Copiar código"><IconButton size="small" onClick={()=>copyCode(r.pallet?.code || '')}><FileCopyIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                    <TableCell sx={ps.cellText}>{r.user?.email || '—'}</TableCell>
                    <TableCell sx={ps.cellText}>{r.fromLocation ? `${r.fromLocation.area}-${r.fromLocation.level}${r.fromLocation.position}` : '—'}</TableCell>
                    <TableCell sx={ps.cellText}>{r.toLocation ? `${r.toLocation.area}-${r.toLocation.level}${r.toLocation.position}` : '—'}</TableCell>
                    <TableCell sx={{ ...ps.cellText, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.note || '—'} arrow>
                        <span>{(r.note || '—').length > 25 ? (r.note || '—').slice(0, 25) + '…' : (r.note || '—')}</span>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" sx={ps.actionBtn('primary')} onClick={()=>openDetail(r)}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>
        {/* Paginación simple */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</Button>
          <Typography sx={ps.cellText}> Página {page} de {Math.max(1, Math.ceil(filtered.length/pageSize))} </Typography>
          <Button disabled={page*pageSize>=filtered.length} onClick={()=>setPage(p=>p+1)}>Siguiente</Button>
        </Stack>
      </Paper>
      {/* Modal de detalle de movimiento */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>Detalle de movimiento</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>Fecha:</b> {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm')}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Tipo:</b> {selected.type}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Código:</b> {selected.pallet?.code || '—'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Usuario:</b> {selected.user?.email || '—'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>De:</b> {selected.fromLocation ? `${selected.fromLocation.area}-${selected.fromLocation.level}${selected.fromLocation.position}` : '—'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>A:</b> {selected.toLocation ? `${selected.toLocation.area}-${selected.toLocation.level}${selected.toLocation.position}` : '—'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Nota:</b> {selected.note || '—'}</Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
