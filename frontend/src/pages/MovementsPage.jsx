import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../services/api'
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
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import InfoIcon from '@mui/icons-material/Info'
import FileCopyIcon from '@mui/icons-material/FileCopy'
import TodayIcon from '@mui/icons-material/Today'
import DateRangeIcon from '@mui/icons-material/DateRange'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import AllInclusiveIcon from '@mui/icons-material/AllInclusive'
import PersonSearchIcon from '@mui/icons-material/PersonSearch'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import InventoryIcon from '@mui/icons-material/Inventory'
import dayjs from 'dayjs'

/* helper: format a location object to readable string */
const fmtLoc = (loc) => {
  if (!loc) return '—'
  const parts = [loc.area, loc.level, loc.position].filter(Boolean)
  return parts.length ? `${loc.area}-${loc.level}${loc.position}` : loc.name || '—'
}

export default function MovementsPage() {
  const { token } = useAuth()
  const ps = usePageStyles()
  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [type, setType] = useState('')
  const [user, setUser] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [selected, setSelected] = useState(null)
  const [activeQuickDate, setActiveQuickDate] = useState('')

  useEffect(() => {
    (async () => {
      const res = await api().get('/api/movements')
      setRows(res.data)
    })()
  }, [token])

  const downloadCsv = async () => {
    // Exportar solo los movimientos filtrados
    const csvRows = [
      ['Fecha','Tipo','Codigo','Usuario','De','A','Nota']
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

  /* ── Quick date filter helpers ── */
  const applyQuickDate = (key) => {
    setActiveQuickDate(key)
    setPage(1)
    const today = dayjs()
    switch (key) {
      case 'today':
        setDateFrom(today.format('YYYY-MM-DD'))
        setDateTo(today.format('YYYY-MM-DD'))
        break
      case 'week':
        setDateFrom(today.startOf('week').format('YYYY-MM-DD'))
        setDateTo(today.format('YYYY-MM-DD'))
        break
      case 'month':
        setDateFrom(today.startOf('month').format('YYYY-MM-DD'))
        setDateTo(today.format('YYYY-MM-DD'))
        break
      case 'all':
      default:
        setDateFrom('')
        setDateTo('')
        setActiveQuickDate('all')
        break
    }
  }

  // Filtros y busqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r =>
      (r.pallet?.code || '').toLowerCase().includes(q.toLowerCase()) ||
      (r.user?.email || '').toLowerCase().includes(q.toLowerCase()) ||
      (r.note || '').toLowerCase().includes(q.toLowerCase())
    )
    if (type) list = list.filter(r => r.type === type)
    if (user) list = list.filter(r => (r.user?.email || '') === user)
    // User/operator text search filter
    if (userSearch) {
      const term = userSearch.toLowerCase()
      list = list.filter(r =>
        (r.user?.email || '').toLowerCase().includes(term) ||
        (r.user?.name || '').toLowerCase().includes(term) ||
        (r.user?.employeeNumber || '').toLowerCase().includes(term) ||
        (r.userId || '').toString().toLowerCase().includes(term)
      )
    }
    if (dateFrom) list = list.filter(r => dayjs(r.createdAt).isAfter(dayjs(dateFrom).startOf('day')))
    if (dateTo) list = list.filter(r => dayjs(r.createdAt).isBefore(dayjs(dateTo).endOf('day')))
    return list
  }, [rows, q, type, user, userSearch, dateFrom, dateTo])

  // Paginacion
  const paginated = useMemo(() => {
    const start = (page-1)*pageSize
    return filtered.slice(start, start+pageSize)
  }, [filtered, page])

  // Resumen superior (enhanced with TRANSFER count)
  const resumen = useMemo(() => {
    return {
      total: filtered.length,
      entradas: filtered.filter(r => r.type === 'IN').length,
      salidas: filtered.filter(r => r.type === 'OUT').length,
      transferencias: filtered.filter(r => r.type === 'TRANSFER').length,
    }
  }, [filtered])

  // Usuarios unicos para filtro
  const usuarios = useMemo(() => {
    const set = new Set()
    rows.forEach(r => { if (r.user?.email) set.add(r.user.email) })
    return Array.from(set)
  }, [rows])

  // Copiar codigo
  const copyCode = (code) => {
    navigator.clipboard.writeText(code)
  }

  // Detalle de movimiento (modal)
  const [showDetail, setShowDetail] = useState(false)
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  /* ── Type display helper ── */
  const typeLabel = (t) => {
    switch (t) {
      case 'IN': return 'Entrada'
      case 'OUT': return 'Salida'
      case 'TRANSFER': return 'Transferencia'
      default: return t || '—'
    }
  }

  const typeIcon = (t, size = 'small') => {
    switch (t) {
      case 'IN': return <ArrowDownwardIcon sx={ps.actionBtn('success')} fontSize={size} />
      case 'OUT': return <ArrowUpwardIcon sx={ps.actionBtn('error')} fontSize={size} />
      case 'TRANSFER': return <SwapHorizIcon sx={ps.actionBtn('warning')} fontSize={size} />
      default: return <InfoIcon sx={ps.actionBtn('primary')} fontSize={size} />
    }
  }

  // Reset page when filters change
  useEffect(() => { setPage(1) }, [q, type, user, userSearch, dateFrom, dateTo])

  return (
    <Box>
      <Typography variant="h6" sx={{ ...ps.pageTitle, mb: 2 }}>Movimientos</Typography>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Typography variant="caption" sx={{ ...ps.pageSubtitle, display: 'block', mb: 0.5 }}>
              Total movimientos
            </Typography>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {resumen.total}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('green')}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <ArrowDownwardIcon fontSize="small" color="success" />
              <Typography variant="caption" sx={ps.pageSubtitle}>Entradas (IN)</Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {resumen.entradas}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('red')}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <ArrowUpwardIcon fontSize="small" color="error" />
              <Typography variant="caption" sx={ps.pageSubtitle}>Salidas (OUT)</Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {resumen.salidas}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('amber')}>
            <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 0.5 }}>
              <SwapHorizIcon fontSize="small" color="warning" />
              <Typography variant="caption" sx={ps.pageSubtitle}>Transferencias</Typography>
            </Stack>
            <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {resumen.transferencias}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Original metric chips + Export ── */}
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
        <Chip
          icon={<SwapHorizIcon sx={{ color: 'inherit' }} />}
          label={`Transferencias: ${resumen.transferencias}`}
          sx={ps.metricChip('warn')}
        />
        <Box sx={{ flex: 1 }} />
        <Button variant="outlined" onClick={downloadCsv}>Exportar CSV</Button>
      </Stack>

      {/* ── Quick Date Filters ── */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Typography variant="body2" sx={{ ...ps.cellText, fontWeight: 700, alignSelf: 'center', mr: 1 }}>
          Rango rapido:
        </Typography>
        <Chip
          icon={<TodayIcon sx={{ fontSize: 16 }} />}
          label="Hoy"
          onClick={() => applyQuickDate('today')}
          variant={activeQuickDate === 'today' ? 'filled' : 'outlined'}
          color={activeQuickDate === 'today' ? 'primary' : 'default'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          icon={<DateRangeIcon sx={{ fontSize: 16 }} />}
          label="Esta semana"
          onClick={() => applyQuickDate('week')}
          variant={activeQuickDate === 'week' ? 'filled' : 'outlined'}
          color={activeQuickDate === 'week' ? 'primary' : 'default'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          icon={<CalendarMonthIcon sx={{ fontSize: 16 }} />}
          label="Este mes"
          onClick={() => applyQuickDate('month')}
          variant={activeQuickDate === 'month' ? 'filled' : 'outlined'}
          color={activeQuickDate === 'month' ? 'primary' : 'default'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
        <Chip
          icon={<AllInclusiveIcon sx={{ fontSize: 16 }} />}
          label="Todo"
          onClick={() => applyQuickDate('all')}
          variant={activeQuickDate === 'all' ? 'filled' : 'outlined'}
          color={activeQuickDate === 'all' ? 'primary' : 'default'}
          size="small"
          sx={{ fontWeight: 600 }}
        />
      </Stack>

      {/* ── Filters and search ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField label="Buscar codigo, usuario o nota" value={q} onChange={e=>setQ(e.target.value)} sx={{ minWidth: 220, ...ps.inputSx }} />
          <TextField select label="Tipo" value={type} onChange={e=>setType(e.target.value)} sx={{ minWidth: 120, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="IN">Entrada</MenuItem>
            <MenuItem value="OUT">Salida</MenuItem>
            <MenuItem value="TRANSFER">Transferencia</MenuItem>
          </TextField>
          <TextField select label="Usuario" value={user} onChange={e=>setUser(e.target.value)} sx={{ minWidth: 180, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            {usuarios.map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
          </TextField>
          <TextField
            label="Buscar operador / No. empleado"
            value={userSearch}
            onChange={e => setUserSearch(e.target.value)}
            sx={{ minWidth: 200, ...ps.inputSx }}
            InputProps={{
              startAdornment: <PersonSearchIcon fontSize="small" sx={{ mr: 0.5, color: 'text.secondary' }} />,
            }}
          />
          <TextField type="date" label="Desde" value={dateFrom} onChange={e=>{ setDateFrom(e.target.value); setActiveQuickDate('') }} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140, ...ps.inputSx }} />
          <TextField type="date" label="Hasta" value={dateTo} onChange={e=>{ setDateTo(e.target.value); setActiveQuickDate('') }} InputLabelProps={{ shrink: true }} sx={{ minWidth: 140, ...ps.inputSx }} />
        </Stack>
      </Paper>

      {/* ── Table ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ ...ps.tableHeaderRow, position: 'sticky', top: 0, zIndex: 1 }}>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo</TableCell>
                <TableCell>Codigo</TableCell>
                <TableCell>Usuario</TableCell>
                <TableCell>De</TableCell>
                <TableCell>A</TableCell>
                <TableCell>Nota</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography sx={ps.emptyText}>No se encontraron movimientos con los filtros actuales.</Typography>
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((r, idx) => {
                return (
                  <TableRow key={r._id || r.id} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellText}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm')}</TableCell>
                    <TableCell sx={ps.cellText}>
                      <Tooltip title={typeLabel(r.type)} arrow>{typeIcon(r.type)}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.primary' }}>{r.type}</Typography>
                    </TableCell>
                    <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>
                      <Tooltip title="Ver detalle"><IconButton size="small" onClick={()=>openDetail(r)}><InfoIcon fontSize="small" /></IconButton></Tooltip>
                      {r.pallet?.code || '—'}
                      <Tooltip title="Copiar codigo"><IconButton size="small" onClick={()=>copyCode(r.pallet?.code || '')}><FileCopyIcon fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                    <TableCell sx={ps.cellText}>{r.user?.name || r.user?.email || '—'}</TableCell>
                    <TableCell sx={ps.cellText}>{fmtLoc(r.fromLocation)}</TableCell>
                    <TableCell sx={ps.cellText}>{fmtLoc(r.toLocation)}</TableCell>
                    <TableCell sx={{ ...ps.cellText, maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.note || '—'} arrow>
                        <span>{(r.note || '—').length > 25 ? (r.note || '—').slice(0, 25) + '...' : (r.note || '—')}</span>
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
        {/* Paginacion simple */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page===1} onClick={()=>setPage(p=>p-1)}>Anterior</Button>
          <Typography sx={ps.cellText}> Pagina {page} de {Math.max(1, Math.ceil(filtered.length/pageSize))} </Typography>
          <Button disabled={page*pageSize>=filtered.length} onClick={()=>setPage(p=>p+1)}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* ── Enhanced Detail Modal ── */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>
          <Stack direction="row" alignItems="center" spacing={1}>
            {selected && typeIcon(selected.type)}
            <span>Detalle de movimiento</span>
          </Stack>
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Box sx={{ pt: 1 }}>
              {/* Basic info grid */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={ps.pageSubtitle}>Fecha</Typography>
                  <Typography variant="body1" sx={{ ...ps.cellText, fontWeight: 600 }}>
                    {dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm:ss')}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={ps.pageSubtitle}>Tipo</Typography>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    {typeIcon(selected.type)}
                    <Typography variant="body1" sx={{ ...ps.cellText, fontWeight: 600 }}>
                      {typeLabel(selected.type)} ({selected.type})
                    </Typography>
                  </Stack>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={ps.pageSubtitle}>Codigo de pallet</Typography>
                  <Typography variant="body1" sx={{ ...ps.cellText, fontWeight: 600, fontFamily: 'monospace' }}>
                    {selected.pallet?.code || '—'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="caption" sx={ps.pageSubtitle}>ID de movimiento</Typography>
                  <Typography variant="body1" sx={{ ...ps.cellText, fontFamily: 'monospace', fontSize: 13 }}>
                    {selected._id || selected.id || '—'}
                  </Typography>
                </Grid>
              </Grid>

              <Divider sx={{ my: 2 }} />

              {/* From -> To Location */}
              <Typography variant="subtitle2" sx={{ ...ps.cardHeaderTitle, mb: 1.5 }}>
                Ubicaciones
              </Typography>
              <Paper elevation={0} sx={{ ...ps.card, p: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center" justifyContent="center">
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="caption" sx={ps.pageSubtitle}>Origen</Typography>
                    <Typography variant="h6" sx={{ ...ps.cellText, fontWeight: 700 }}>
                      {fmtLoc(selected.fromLocation)}
                    </Typography>
                    {selected.fromLocation?.name && (
                      <Typography variant="caption" sx={ps.cellTextSecondary}>{selected.fromLocation.name}</Typography>
                    )}
                  </Box>
                  <ArrowForwardIcon sx={{ color: 'text.secondary', fontSize: 28 }} />
                  <Box sx={{ textAlign: 'center', flex: 1 }}>
                    <Typography variant="caption" sx={ps.pageSubtitle}>Destino</Typography>
                    <Typography variant="h6" sx={{ ...ps.cellText, fontWeight: 700 }}>
                      {fmtLoc(selected.toLocation)}
                    </Typography>
                    {selected.toLocation?.name && (
                      <Typography variant="caption" sx={ps.cellTextSecondary}>{selected.toLocation.name}</Typography>
                    )}
                  </Box>
                </Stack>
              </Paper>

              {/* User info */}
              <Typography variant="subtitle2" sx={{ ...ps.cardHeaderTitle, mb: 1.5 }}>
                Informacion del usuario
              </Typography>
              <Paper elevation={0} sx={{ ...ps.card, p: 2, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                <Grid container spacing={1}>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={ps.pageSubtitle}>Nombre</Typography>
                    <Typography variant="body2" sx={ps.cellText}>
                      {selected.user?.name || selected.user?.email || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={ps.pageSubtitle}>Email</Typography>
                    <Typography variant="body2" sx={ps.cellText}>
                      {selected.user?.email || '—'}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={4}>
                    <Typography variant="caption" sx={ps.pageSubtitle}>No. empleado / ID</Typography>
                    <Typography variant="body2" sx={ps.cellText}>
                      {selected.user?.employeeNumber || selected.userId || '—'}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>

              {/* Items snapshot */}
              {selected.itemsSnapshot && (
                <>
                  <Typography variant="subtitle2" sx={{ ...ps.cardHeaderTitle, mb: 1.5 }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <InventoryIcon fontSize="small" />
                      <span>Items del pallet (snapshot)</span>
                    </Stack>
                  </Typography>
                  <Paper elevation={0} sx={{ ...ps.card, p: 0, border: '1px solid', borderColor: 'divider', mb: 2 }}>
                    {Array.isArray(selected.itemsSnapshot) && selected.itemsSnapshot.length > 0 ? (
                      <Table size="small">
                        <TableHead>
                          <TableRow sx={ps.tableHeaderRow}>
                            <TableCell>SKU</TableCell>
                            <TableCell>Descripcion</TableCell>
                            <TableCell align="right">Cantidad</TableCell>
                            <TableCell>Lote</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {selected.itemsSnapshot.map((item, i) => (
                            <TableRow key={i} sx={ps.tableRow(i)}>
                              <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{item.sku || item.SKU || '—'}</TableCell>
                              <TableCell sx={ps.cellText}>{item.description || item.name || item.producto || '—'}</TableCell>
                              <TableCell align="right" sx={{ ...ps.cellText, fontWeight: 600 }}>{item.qty ?? item.quantity ?? item.cantidad ?? '—'}</TableCell>
                              <TableCell sx={ps.cellText}>{item.lot || item.lote || item.batch || '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <Typography sx={{ ...ps.emptyText, py: 2 }}>
                        {typeof selected.itemsSnapshot === 'string'
                          ? selected.itemsSnapshot
                          : 'No hay items registrados en el snapshot.'}
                      </Typography>
                    )}
                  </Paper>
                </>
              )}

              {/* Note / reason */}
              <Typography variant="subtitle2" sx={{ ...ps.cardHeaderTitle, mb: 1 }}>
                Nota / Razon
              </Typography>
              <Paper elevation={0} sx={{ ...ps.card, p: 2, border: '1px solid', borderColor: 'divider' }}>
                <Typography variant="body2" sx={ps.cellText}>
                  {selected.note || 'Sin nota registrada.'}
                </Typography>
              </Paper>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
