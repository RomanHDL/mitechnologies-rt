import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import LinearProgress from '@mui/material/LinearProgress'

import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PersonIcon from '@mui/icons-material/Person'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import BarChartIcon from '@mui/icons-material/BarChart'
import AvTimerIcon from '@mui/icons-material/AvTimer'

import {
  BarChart, Bar, XAxis, YAxis,
  Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

export default function ProductivityPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [operators, setOperators] = useState([])
  const [summary, setSummary] = useState(null)
  const [dateFrom, setDateFrom] = useState(dayjs().subtract(7, 'day').format('YYYY-MM-DD'))
  const [dateTo, setDateTo] = useState(dayjs().format('YYYY-MM-DD'))
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [loading, setLoading] = useState(false)
  const [shiftFilter, setShiftFilter] = useState('Todos')

  const load = async () => {
    setLoading(true)
    try {
      var params = {}
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo
      var res1 = await client.get('/api/productivity/operators', { params: params })
      setOperators(Array.isArray(res1.data) ? res1.data : [])
      var res2 = await client.get('/api/productivity/summary', { params: params })
      setSummary(res2.data || null)
    } catch (e) { console.error('Error loading productivity:', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  /* ── Period quick filters ── */
  const setPeriod = (key) => {
    const today = dayjs()
    if (key === 'today') {
      setDateFrom(today.format('YYYY-MM-DD'))
      setDateTo(today.format('YYYY-MM-DD'))
    } else if (key === 'week') {
      setDateFrom(today.startOf('week').format('YYYY-MM-DD'))
      setDateTo(today.format('YYYY-MM-DD'))
    } else if (key === 'month') {
      setDateFrom(today.startOf('month').format('YYYY-MM-DD'))
      setDateTo(today.format('YYYY-MM-DD'))
    }
  }

  const activePeriod = useMemo(() => {
    const today = dayjs()
    if (dateFrom === today.format('YYYY-MM-DD') && dateTo === today.format('YYYY-MM-DD')) return 'today'
    if (dateFrom === today.startOf('week').format('YYYY-MM-DD') && dateTo === today.format('YYYY-MM-DD')) return 'week'
    if (dateFrom === today.startOf('month').format('YYYY-MM-DD') && dateTo === today.format('YYYY-MM-DD')) return 'month'
    return null
  }, [dateFrom, dateTo])

  /* ── Filtering (search + shift) ── */
  const filtered = useMemo(() => {
    let list = operators
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.email || '').toLowerCase().includes(qq) ||
        (r.name || '').toLowerCase().includes(qq)
      )
    }
    if (shiftFilter !== 'Todos') {
      list = list.filter(r => (r.shift || r.turno || '') === shiftFilter)
    }
    return list
  }, [operators, q, shiftFilter])

  /* ── KPI computations ── */
  const kpis = useMemo(() => {
    const totalOps = filtered.reduce((s, r) => s + (r.movementCount || 0) + (r.taskCount || 0), 0)
    const avg = filtered.length ? Math.round(totalOps / filtered.length) : 0
    const topOp = filtered.reduce((best, r) => {
      const total = (r.movementCount || 0) + (r.taskCount || 0)
      return total > (best.total || 0) ? { name: r.name || r.email || '-', total } : best
    }, { name: '-', total: 0 })
    const totalTasks = filtered.reduce((s, r) => s + (r.taskCount || 0), 0)
    return { totalOps, avg, topOp, totalTasks }
  }, [filtered])

  /* ── Top 10 for bar chart ── */
  const chartData = useMemo(() => {
    return [...filtered]
      .map(r => ({
        name: (r.name || r.email || 'Sin nombre').split(' ')[0],
        fullName: r.name || r.email || 'Sin nombre',
        movimientos: r.movementCount || 0,
        tareas: r.taskCount || 0,
        total: (r.movementCount || 0) + (r.taskCount || 0),
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }, [filtered])

  /* ── Max total for relative progress bars ── */
  const maxTotal = useMemo(() => {
    if (!filtered.length) return 1
    return Math.max(1, ...filtered.map(r => (r.movementCount || 0) + (r.taskCount || 0)))
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  const exportExcel = () => {
    var sheets = []

    // Operators sheet
    var opData = filtered.map(r => ({
      Operador: r.name || r.email || '',
      Email: r.email || '',
      Movimientos: r.movementCount || 0,
      Picks: r.pickCount || 0,
      Tareas: r.taskCount || 0,
      TiempoPromedio: r.avgTimeMinutes != null ? (r.avgTimeMinutes + ' min') : '-',
    }))
    var ws1 = XLSX.utils.json_to_sheet(opData)

    // Summary sheet
    var sumData = []
    if (summary) {
      sumData.push({
        Metrica: 'Total Movimientos',
        Valor: summary.totalMovements || 0,
      })
      sumData.push({
        Metrica: 'Total Picks',
        Valor: summary.totalPicks || 0,
      })
      sumData.push({
        Metrica: 'Total Tareas Completadas',
        Valor: summary.totalTasksCompleted || 0,
      })
      sumData.push({
        Metrica: 'Tiempo Promedio (min)',
        Valor: summary.avgTimeMinutes || 0,
      })
      sumData.push({
        Metrica: 'Operadores Activos',
        Valor: summary.activeOperators || 0,
      })
    }
    var ws2 = XLSX.utils.json_to_sheet(sumData)

    var wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Operadores')
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen')
    XLSX.writeFile(wb, 'productividad_' + dateFrom + '_' + dateTo + '.xlsx')
  }

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Reportes de Productividad</Typography>
          <Typography sx={ps.pageSubtitle}>Metricas de rendimiento por operador y periodo</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Button variant="outlined" startIcon={<RefreshIcon />} onClick={load} disabled={loading}>
            {loading ? 'Cargando...' : 'Actualizar'}
          </Button>
          <Tooltip title="Exportar a Excel">
            <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}><DownloadIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── Period quick filters ── */}
      <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
        {[
          { key: 'today', label: 'Hoy' },
          { key: 'week', label: 'Esta semana' },
          { key: 'month', label: 'Este mes' },
        ].map(p => (
          <Chip
            key={p.key}
            label={p.label}
            clickable
            onClick={() => setPeriod(p.key)}
            variant={activePeriod === p.key ? 'filled' : 'outlined'}
            color={activePeriod === p.key ? 'primary' : 'default'}
            sx={{ fontWeight: 700, fontSize: 13 }}
          />
        ))}
      </Stack>

      {/* ── Date range + shift filter ── */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          type="date"
          label="Desde"
          value={dateFrom}
          onChange={e => setDateFrom(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ ...ps.inputSx, minWidth: 160 }}
        />
        <TextField
          type="date"
          label="Hasta"
          value={dateTo}
          onChange={e => setDateTo(e.target.value)}
          InputLabelProps={{ shrink: true }}
          sx={{ ...ps.inputSx, minWidth: 160 }}
        />
        <FormControl sx={{ minWidth: 140 }}>
          <InputLabel>Turno</InputLabel>
          <Select
            value={shiftFilter}
            label="Turno"
            onChange={e => setShiftFilter(e.target.value)}
            sx={ps.inputSx}
          >
            <MenuItem value="Todos">Todos</MenuItem>
            <MenuItem value="Dia">Dia</MenuItem>
            <MenuItem value="Noche">Noche</MenuItem>
          </Select>
        </FormControl>
        <Button variant="contained" onClick={load} disabled={loading}>Consultar</Button>
        <Box sx={{ flex: 1 }} />
        <TextField label="Buscar operador" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 220 }} />
      </Stack>

      {/* ── KPI Summary Cards ── */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2,
          mb: 3,
        }}
      >
        <Paper elevation={0} sx={ps.kpiCard('blue')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <BarChartIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Operaciones
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
              {kpis.totalOps.toLocaleString()}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('green')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AvTimerIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Promedio por Operador
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
              {kpis.avg.toLocaleString()}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('amber')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EmojiEventsIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Operador Mas Productivo
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 20, fontWeight: 800, color: 'text.primary', lineHeight: 1.2 }}>
              {kpis.topOp.name}
            </Typography>
            <Typography sx={{ fontSize: 12, color: 'text.secondary', fontWeight: 600 }}>
              {kpis.topOp.total.toLocaleString() + ' acciones'}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('blue')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AssignmentTurnedInIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Tareas Completadas
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
              {kpis.totalTasks.toLocaleString()}
            </Typography>
          </Stack>
        </Paper>
      </Box>

      {/* ── Summary chips (existing) ── */}
      {summary && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Chip icon={<TrendingUpIcon sx={{ color: 'inherit' }} />} label={'Total Movimientos: ' + (summary.totalMovements || 0)} sx={ps.metricChip('info')} />
          <Chip label={'Total Picks: ' + (summary.totalPicks || 0)} sx={ps.metricChip('ok')} />
          <Chip label={'Tareas Completadas: ' + (summary.totalTasksCompleted || 0)} sx={ps.metricChip('ok')} />
          <Chip label={'Tiempo Prom: ' + (summary.avgTimeMinutes != null ? summary.avgTimeMinutes + ' min' : '-')} sx={ps.metricChip('warn')} />
          <Chip icon={<PersonIcon sx={{ color: 'inherit' }} />} label={'Operadores Activos: ' + (summary.activeOperators || 0)} sx={ps.metricChip('default')} />
        </Stack>
      )}

      {/* ── Bar chart: Top 10 operators ── */}
      {chartData.length > 0 && (
        <Paper elevation={1} sx={{ ...ps.card, mb: 3 }}>
          <Box sx={ps.cardHeader}>
            <BarChartIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 20 }} />
            <Typography sx={ps.cardHeaderTitle}>Top 10 Operadores por Acciones</Typography>
          </Box>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={ps.isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)'} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 12, fontWeight: 600, fill: ps.isDark ? '#B0BEC5' : '#546E7A' }}
                  axisLine={{ stroke: ps.isDark ? 'rgba(255,255,255,.12)' : 'rgba(0,0,0,.12)' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: ps.isDark ? '#B0BEC5' : '#546E7A' }}
                  axisLine={false}
                  tickLine={false}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: ps.isDark ? '#112240' : '#fff',
                    border: ps.isDark ? '1px solid rgba(255,255,255,.12)' : '1px solid rgba(0,0,0,.12)',
                    borderRadius: 8,
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                  labelFormatter={(label, payload) => {
                    if (payload && payload.length > 0) return payload[0].payload.fullName
                    return label
                  }}
                />
                <Bar dataKey="movimientos" stackId="a" fill={ps.isDark ? '#42A5F5' : '#1565C0'} name="Movimientos" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tareas" stackId="a" fill={ps.isDark ? '#66BB6A' : '#2E7D32'} name="Tareas" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={3} justifyContent="center" sx={{ pb: 1 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: ps.isDark ? '#42A5F5' : '#1565C0' }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>Movimientos</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: ps.isDark ? '#66BB6A' : '#2E7D32' }} />
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>Tareas</Typography>
              </Stack>
            </Stack>
          </Box>
        </Paper>
      )}

      {/* ── Summary table (existing) ── */}
      {summary && summary.byType && (
        <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto', mb: 3 }}>
          <Box sx={ps.cardHeader}>
            <Typography sx={ps.cardHeaderTitle}>Resumen por Tipo</Typography>
          </Box>
          <Table size="small">
            <TableHead><TableRow sx={ps.tableHeaderRow}>
              <TableCell>Tipo</TableCell>
              <TableCell>Cantidad</TableCell>
              <TableCell>Tiempo Promedio</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {(Array.isArray(summary.byType) ? summary.byType : Object.entries(summary.byType).map(function(entry) { return { type: entry[0], count: entry[1].count || entry[1], avgTime: entry[1].avgTime } })).map(function(r, idx) {
                return (
                  <TableRow key={r.type || idx} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellText}>{r.type || '-'}</TableCell>
                    <TableCell sx={ps.cellText}>{r.count || 0}</TableCell>
                    <TableCell sx={ps.cellTextSecondary}>{r.avgTime != null ? r.avgTime + ' min' : '-'}</TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* ── Operator cards grid ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflow: 'hidden' }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Productividad por Operador</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>{'Periodo: ' + dateFrom + ' a ' + dateTo}</Typography>
        </Box>

        {!paginated.length && (
          <Typography sx={ps.emptyText}>Sin datos de productividad.</Typography>
        )}

        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
            gap: 2,
            p: 2.5,
          }}
        >
          {paginated.map(function(r, idx) {
            const total = (r.movementCount || 0) + (r.taskCount || 0)
            const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0
            const isTop = total === maxTotal && total > 0

            return (
              <Paper
                key={r.email || idx}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: isTop
                    ? (ps.isDark ? '1.5px solid rgba(245,158,11,.40)' : '1.5px solid rgba(245,158,11,.50)')
                    : (ps.isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(13,59,102,.08)'),
                  bgcolor: ps.isDark ? 'rgba(17,34,64,.50)' : 'rgba(255,255,255,.80)',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  '&:hover': {
                    transform: 'translateY(-2px)',
                    boxShadow: ps.isDark
                      ? '0 6px 24px rgba(0,0,0,.30)'
                      : '0 4px 20px rgba(13,59,102,.10)',
                  },
                }}
              >
                {/* Header row */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Box
                      sx={{
                        width: 36, height: 36, borderRadius: '50%',
                        display: 'grid', placeItems: 'center',
                        bgcolor: ps.isDark ? 'rgba(66,165,245,.15)' : 'rgba(21,101,192,.08)',
                        color: ps.isDark ? '#64B5F6' : '#1565C0',
                      }}
                    >
                      <PersonIcon sx={{ fontSize: 20 }} />
                    </Box>
                    <Box>
                      <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'text.primary', lineHeight: 1.2 }}>
                        {r.name || r.email || '-'}
                      </Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {r.email || ''}
                      </Typography>
                    </Box>
                  </Stack>
                  {isTop && (
                    <Tooltip title="Operador mas productivo">
                      <EmojiEventsIcon sx={{ color: '#F59E0B', fontSize: 20 }} />
                    </Tooltip>
                  )}
                </Stack>

                {/* Metrics row */}
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Box sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 1.5, bgcolor: ps.isDark ? 'rgba(66,165,245,.08)' : 'rgba(21,101,192,.04)' }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>{r.movementCount || 0}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>Movimientos</Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 1.5, bgcolor: ps.isDark ? 'rgba(34,197,94,.08)' : 'rgba(46,125,50,.04)' }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>{r.taskCount || 0}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>Tareas</Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 1.5, bgcolor: ps.isDark ? 'rgba(245,158,11,.08)' : 'rgba(245,158,11,.04)' }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>{r.pickCount || 0}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>Picks</Typography>
                  </Box>
                </Stack>

                {/* Avg time chip */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary' }}>Tiempo promedio</Typography>
                  <Chip
                    size="small"
                    label={r.avgTimeMinutes != null ? r.avgTimeMinutes + ' min' : '-'}
                    sx={{
                      ...ps.metricChip(r.avgTimeMinutes != null && r.avgTimeMinutes <= 10 ? 'ok' : r.avgTimeMinutes > 30 ? 'bad' : 'warn'),
                      height: 24,
                      fontSize: 11,
                    }}
                  />
                </Stack>

                {/* Progress bar: relative performance */}
                <Box>
                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary' }}>Rendimiento relativo</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary' }}>{pct + '%'}</Typography>
                  </Stack>
                  <Box sx={ps.progressBar}>
                    <Box sx={ps.progressFill(pct, pct >= 80 ? 'rgba(46,125,50,.70)' : pct >= 50 ? 'rgba(21,101,192,.65)' : 'rgba(245,158,11,.65)')} />
                  </Box>
                </Box>
              </Paper>
            )
          })}
        </Box>

        {/* Pagination */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
        </Stack>
      </Paper>
    </Box>
  )
}
