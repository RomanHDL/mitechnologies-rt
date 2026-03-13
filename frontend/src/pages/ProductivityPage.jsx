import React, { useEffect, useMemo, useState, useCallback } from 'react'
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
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PersonIcon from '@mui/icons-material/Person'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import BarChartIcon from '@mui/icons-material/BarChart'
import AvTimerIcon from '@mui/icons-material/AvTimer'

import {
  BarChart, Bar, XAxis, YAxis, Cell,
  Tooltip as RechartsTooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'

import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

/* ── Medal accent colors for top 3 ── */
const MEDAL_COLORS = {
  0: { border: 'rgba(255,215,0,.60)', bg: 'rgba(255,215,0,.08)', icon: '#FFD700', label: 'Oro' },
  1: { border: 'rgba(192,192,192,.55)', bg: 'rgba(192,192,192,.08)', icon: '#C0C0C0', label: 'Plata' },
  2: { border: 'rgba(205,127,50,.50)', bg: 'rgba(205,127,50,.08)', icon: '#CD7F32', label: 'Bronce' },
}

/* ── Movement type colors ── */
const TYPE_COLORS = {
  IN: { fill: '#43A047', label: 'Entradas' },
  OUT: { fill: '#E53935', label: 'Salidas' },
  TRANSFER: { fill: '#1E88E5', label: 'Transferencias' },
  ADJUST: { fill: '#FB8C00', label: 'Ajustes' },
}

/* ── Period preset options ── */
const PERIOD_OPTIONS = [
  { key: 7, label: '7 dias' },
  { key: 14, label: '14 dias' },
  { key: 30, label: '30 dias' },
]

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
  const [periodDays, setPeriodDays] = useState(7)

  /* ── New state for productivity API + task stats ── */
  const [prodData, setProdData] = useState(null)
  const [taskStats, setTaskStats] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      var params = {}
      if (dateFrom) params.from = dateFrom
      if (dateTo) params.to = dateTo

      /* Original endpoints */
      var res1 = await client.get('/api/productivity/operators', { params: params })
      setOperators(Array.isArray(res1.data) ? res1.data : [])
      var res2 = await client.get('/api/productivity/summary', { params: params })
      setSummary(res2.data || null)

      /* New: productivity report endpoint (days param) */
      try {
        var prodRes = await client.get('/api/reports/productivity', { params: { days: periodDays } })
        setProdData(prodRes.data || null)
      } catch (_) { setProdData(null) }

      /* New: task stats endpoint */
      try {
        var taskRes = await client.get('/api/tasks/stats', { params: { from: dateFrom, to: dateTo } })
        setTaskStats(taskRes.data || null)
      } catch (_) { setTaskStats(null) }
    } catch (e) { console.error('Error loading productivity:', e) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [token])

  /* ── Period quick filters (original) ── */
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

  /* ── Period days selector handler ── */
  const handlePeriodDaysChange = useCallback((days) => {
    setPeriodDays(days)
    const today = dayjs()
    setDateFrom(today.subtract(days, 'day').format('YYYY-MM-DD'))
    setDateTo(today.format('YYYY-MM-DD'))
  }, [])

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

  /* ── Merge task stats per user onto operators ── */
  const enrichedFiltered = useMemo(() => {
    if (!taskStats || !taskStats.byUser) return filtered
    return filtered.map(r => {
      const userId = r.userId || r._id || r.id
      const userTasks = taskStats.byUser[userId]
      if (!userTasks) return r
      return { ...r, taskStatsTotal: userTasks.total || 0, taskStatsByType: userTasks.byType || {} }
    })
  }, [filtered, taskStats])

  /* ── Build sorted ranking list ── */
  const rankedOperators = useMemo(() => {
    /* Combine operator data with prodData rows if available */
    let list = enrichedFiltered.map(r => {
      const userId = r.userId || r._id || r.id
      let byType = { IN: 0, OUT: 0, TRANSFER: 0, ADJUST: 0 }

      /* Try to pull byType from prodData */
      if (prodData && prodData.rows) {
        const prodRow = prodData.rows.find(pr => pr.user === userId || pr.user === r.email)
        if (prodRow && prodRow.byType) {
          byType = {
            IN: (prodRow.byType.IN || 0),
            OUT: (prodRow.byType.OUT || 0),
            TRANSFER: (prodRow.byType.TRANSFER || 0),
            ADJUST: (prodRow.byType.ADJUST || 0),
          }
        }
      }

      const totalMovements = (r.movementCount || 0)
      const totalTasks = r.taskStatsTotal || (r.taskCount || 0)

      return {
        ...r,
        totalMovements,
        totalTasks,
        totalCombined: totalMovements + totalTasks,
        byType,
      }
    })

    list.sort((a, b) => b.totalCombined - a.totalCombined)
    return list
  }, [enrichedFiltered, prodData])

  /* ── KPI computations (improved) ── */
  const kpis = useMemo(() => {
    const totalMov = rankedOperators.reduce((s, r) => s + r.totalMovements, 0)
    const activeOps = rankedOperators.filter(r => r.totalCombined > 0).length
    const avg = activeOps ? Math.round(totalMov / activeOps) : 0
    const topOp = rankedOperators.length > 0 && rankedOperators[0].totalCombined > 0
      ? { name: rankedOperators[0].name || rankedOperators[0].email || '-', total: rankedOperators[0].totalCombined }
      : { name: '-', total: 0 }
    const totalTasks = rankedOperators.reduce((s, r) => s + r.totalTasks, 0)
    return { totalMov, activeOps, avg, topOp, totalTasks }
  }, [rankedOperators])

  /* ── Top 10 for bar chart (existing) ── */
  const chartData = useMemo(() => {
    return rankedOperators
      .map(r => ({
        name: (r.name || r.email || 'Sin nombre').split(' ')[0],
        fullName: r.name || r.email || 'Sin nombre',
        movimientos: r.totalMovements,
        tareas: r.totalTasks,
        total: r.totalCombined,
      }))
      .slice(0, 10)
  }, [rankedOperators])

  /* ── Movement type distribution data ── */
  const typeDistributionData = useMemo(() => {
    const totals = { IN: 0, OUT: 0, TRANSFER: 0, ADJUST: 0 }
    rankedOperators.forEach(r => {
      totals.IN += r.byType.IN
      totals.OUT += r.byType.OUT
      totals.TRANSFER += r.byType.TRANSFER
      totals.ADJUST += r.byType.ADJUST
    })
    return Object.entries(totals)
      .filter(([, v]) => v > 0)
      .map(([key, value]) => ({
        name: TYPE_COLORS[key]?.label || key,
        value,
        fill: TYPE_COLORS[key]?.fill || '#999',
        type: key,
      }))
  }, [rankedOperators])

  /* ── Max total for relative progress bars ── */
  const maxTotal = useMemo(() => {
    if (!rankedOperators.length) return 1
    return Math.max(1, ...rankedOperators.map(r => r.totalCombined))
  }, [rankedOperators])

  const totalPages = Math.max(1, Math.ceil(rankedOperators.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return rankedOperators.slice(start, start + pageSize)
  }, [rankedOperators, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  /* ── Excel export (improved with ranking + byType) ── */
  const exportExcel = () => {
    /* Ranking sheet */
    var rankData = rankedOperators.map((r, idx) => ({
      Ranking: idx + 1,
      Operador: r.name || r.email || '',
      Email: r.email || '',
      'Total Movimientos': r.totalMovements,
      Entradas: r.byType.IN,
      Salidas: r.byType.OUT,
      Transferencias: r.byType.TRANSFER,
      Ajustes: r.byType.ADJUST,
      'Tareas Completadas': r.totalTasks,
      'Total Combinado': r.totalCombined,
      Picks: r.pickCount || 0,
      'Tiempo Promedio': r.avgTimeMinutes != null ? (r.avgTimeMinutes + ' min') : '-',
    }))
    var ws1 = XLSX.utils.json_to_sheet(rankData)

    /* Summary sheet */
    var sumData = []
    sumData.push({ Metrica: 'Periodo', Valor: dateFrom + ' a ' + dateTo })
    sumData.push({ Metrica: 'Total Movimientos (Periodo)', Valor: kpis.totalMov })
    sumData.push({ Metrica: 'Operadores Activos', Valor: kpis.activeOps })
    sumData.push({ Metrica: 'Promedio por Operador', Valor: kpis.avg })
    sumData.push({ Metrica: 'Mejor Operador', Valor: kpis.topOp.name + ' (' + kpis.topOp.total + ')' })
    sumData.push({ Metrica: 'Total Tareas Completadas', Valor: kpis.totalTasks })
    if (summary) {
      sumData.push({ Metrica: 'Total Picks', Valor: summary.totalPicks || 0 })
      sumData.push({ Metrica: 'Tiempo Promedio (min)', Valor: summary.avgTimeMinutes || 0 })
    }
    var ws2 = XLSX.utils.json_to_sheet(sumData)

    /* Type distribution sheet */
    var typeData = typeDistributionData.map(d => ({
      Tipo: d.name,
      Cantidad: d.value,
    }))
    var ws3 = XLSX.utils.json_to_sheet(typeData.length > 0 ? typeData : [{ Tipo: '-', Cantidad: 0 }])

    /* Task stats sheet */
    var taskSheetData = []
    if (taskStats && taskStats.byUser) {
      Object.entries(taskStats.byUser).forEach(function(entry) {
        var userId = entry[0]
        var stats = entry[1]
        taskSheetData.push({
          Usuario: userId,
          'Total Tareas': stats.total || 0,
          'Por Tipo': stats.byType ? JSON.stringify(stats.byType) : '-',
        })
      })
    }
    var ws4 = XLSX.utils.json_to_sheet(taskSheetData.length > 0 ? taskSheetData : [{ Info: 'Sin datos de tareas' }])

    var wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws1, 'Ranking Operadores')
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen')
    XLSX.utils.book_append_sheet(wb, ws3, 'Por Tipo')
    XLSX.utils.book_append_sheet(wb, ws4, 'Tareas')
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

      {/* ── Period days selector (NEW - improvement #2) ── */}
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        {PERIOD_OPTIONS.map(p => (
          <Chip
            key={p.key}
            label={p.label}
            clickable
            onClick={() => handlePeriodDaysChange(p.key)}
            variant={periodDays === p.key ? 'filled' : 'outlined'}
            color={periodDays === p.key ? 'primary' : 'default'}
            sx={{ fontWeight: 700, fontSize: 13 }}
          />
        ))}
      </Stack>

      {/* ── Period quick filters (existing) ── */}
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

      {/* ── KPI Summary Cards (improved - #1) ── */}
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
                Total Movimientos
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
              {kpis.totalMov.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>
              {dateFrom + ' - ' + dateTo}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('green')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <PersonIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Operadores Activos
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
              {kpis.activeOps}
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('blue')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AvTimerIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Promedio por Operador
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
              {kpis.avg.toLocaleString()}
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600 }}>
              movimientos / operador
            </Typography>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('amber')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <EmojiEventsIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Mejor Operador
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
      </Box>

      {/* ── Task completion KPI (NEW - #4) ── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' }, gap: 2, mb: 3 }}>
        <Paper elevation={0} sx={ps.kpiCard('green')}>
          <Stack spacing={0.5}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <AssignmentTurnedInIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 22 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Total Tareas Completadas
              </Typography>
            </Stack>
            <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
              {(taskStats ? taskStats.total : kpis.totalTasks).toLocaleString()}
            </Typography>
          </Stack>
        </Paper>
        {taskStats && taskStats.total > 0 && (
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack spacing={0.5}>
              <Stack direction="row" alignItems="center" spacing={1}>
                <TrendingUpIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Promedio Tareas / Operador
                </Typography>
              </Stack>
              <Typography sx={{ fontSize: 28, fontWeight: 800, color: 'text.primary' }}>
                {kpis.activeOps > 0 ? Math.round(taskStats.total / kpis.activeOps) : 0}
              </Typography>
            </Stack>
          </Paper>
        )}
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

      {/* ── Movimientos por Tipo breakdown chart (NEW - #5) ── */}
      {typeDistributionData.length > 0 && (
        <Paper elevation={1} sx={{ ...ps.card, mb: 3 }}>
          <Box sx={ps.cardHeader}>
            <BarChartIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 20 }} />
            <Typography sx={ps.cardHeaderTitle}>Movimientos por Tipo</Typography>
          </Box>
          <Box sx={{ px: 2, pt: 2, pb: 1 }}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={typeDistributionData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
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
                />
                <Bar dataKey="value" name="Cantidad" radius={[4, 4, 0, 0]}>
                  {typeDistributionData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <Stack direction="row" spacing={3} justifyContent="center" sx={{ pb: 1, flexWrap: 'wrap' }}>
              {Object.entries(TYPE_COLORS).map(([key, val]) => (
                <Stack key={key} direction="row" spacing={0.5} alignItems="center">
                  <Box sx={{ width: 12, height: 12, borderRadius: 1, bgcolor: val.fill }} />
                  <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary' }}>{val.label}</Typography>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Paper>
      )}

      {/* ── Bar chart: Top 10 operators (existing) ── */}
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

      {/* ── Top 3 Highlight: Gold / Silver / Bronze (NEW - #6) ── */}
      {rankedOperators.length >= 1 && rankedOperators[0].totalCombined > 0 && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(' + Math.min(3, rankedOperators.filter(r => r.totalCombined > 0).length) + ', 1fr)' },
            gap: 2,
            mb: 3,
          }}
        >
          {rankedOperators.slice(0, 3).filter(r => r.totalCombined > 0).map((r, idx) => {
            const medal = MEDAL_COLORS[idx]
            return (
              <Paper
                key={r.email || idx}
                elevation={0}
                sx={{
                  p: 2.5,
                  borderRadius: 3,
                  border: '2px solid ' + medal.border,
                  bgcolor: medal.bg,
                  textAlign: 'center',
                  transition: 'transform .15s ease, box-shadow .15s ease',
                  '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 8px 28px ' + medal.border },
                }}
              >
                <EmojiEventsIcon sx={{ fontSize: 36, color: medal.icon, mb: 0.5 }} />
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: medal.icon, textTransform: 'uppercase', letterSpacing: 1 }}>
                  {medal.label}
                </Typography>
                <Typography sx={{ fontSize: 16, fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                  {r.name || r.email || '-'}
                </Typography>
                <Typography sx={{ fontSize: 26, fontWeight: 900, color: 'text.primary', mt: 0.5 }}>
                  {r.totalCombined.toLocaleString()}
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', fontWeight: 600, mb: 1 }}>acciones totales</Typography>
                <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                  <Chip size="small" label={'Mov: ' + r.totalMovements} sx={{ ...ps.metricChip('info'), height: 22, fontSize: 10 }} />
                  <Chip size="small" label={'Tareas: ' + r.totalTasks} sx={{ ...ps.metricChip('ok'), height: 22, fontSize: 10 }} />
                </Stack>
                {/* Mini type breakdown bar */}
                {(r.byType.IN + r.byType.OUT + r.byType.TRANSFER + r.byType.ADJUST) > 0 && (
                  <Box sx={{ display: 'flex', height: 6, borderRadius: 999, overflow: 'hidden', mt: 1.5 }}>
                    {Object.entries(r.byType).filter(([, v]) => v > 0).map(([type, count]) => {
                      const typeTotal = r.byType.IN + r.byType.OUT + r.byType.TRANSFER + r.byType.ADJUST
                      return (
                        <Tooltip key={type} title={(TYPE_COLORS[type]?.label || type) + ': ' + count}>
                          <Box sx={{ width: ((count / typeTotal) * 100) + '%', bgcolor: TYPE_COLORS[type]?.fill || '#999' }} />
                        </Tooltip>
                      )
                    })}
                  </Box>
                )}
              </Paper>
            )
          })}
        </Box>
      )}

      {/* ── Operator Ranking Table (NEW - #3) ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto', mb: 3 }}>
        <Box sx={ps.cardHeader}>
          <EmojiEventsIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 20 }} />
          <Typography sx={ps.cardHeaderTitle}>Ranking de Operadores</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>{'Periodo: ' + dateFrom + ' a ' + dateTo + ' | ' + rankedOperators.length + ' operadores'}</Typography>
        </Box>
        <Table size="small">
          <TableHead>
            <TableRow sx={ps.tableHeaderRow}>
              <TableCell sx={{ width: 60 }}>Rank</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell align="right">Entradas</TableCell>
              <TableCell align="right">Salidas</TableCell>
              <TableCell align="right">Transferencias</TableCell>
              <TableCell align="right">Ajustes</TableCell>
              <TableCell align="right">Tareas</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rankedOperators.length === 0 && (
              <TableRow>
                <TableCell colSpan={8}>
                  <Typography sx={ps.emptyText}>Sin datos de productividad.</Typography>
                </TableCell>
              </TableRow>
            )}
            {rankedOperators.map((r, idx) => {
              const medal = idx <= 2 && r.totalCombined > 0 ? MEDAL_COLORS[idx] : null
              return (
                <TableRow
                  key={r.email || idx}
                  sx={{
                    ...ps.tableRow(idx),
                    ...(medal ? { borderLeft: '3px solid ' + medal.border, bgcolor: medal.bg } : {}),
                  }}
                >
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      {medal && <EmojiEventsIcon sx={{ color: medal.icon, fontSize: 18 }} />}
                      <Typography sx={{ fontWeight: 800, fontSize: 14, color: 'text.primary' }}>{idx + 1}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <Typography sx={{ fontWeight: medal ? 800 : 700, fontSize: 13, color: 'text.primary' }}>
                      {r.name || r.email || '-'}
                    </Typography>
                    {r.email && r.name && (
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{r.email}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontWeight: 800, fontSize: 14, color: 'text.primary' }}>{r.totalCombined.toLocaleString()}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: TYPE_COLORS.IN.fill }}>{r.byType.IN}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: TYPE_COLORS.OUT.fill }}>{r.byType.OUT}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: TYPE_COLORS.TRANSFER.fill }}>{r.byType.TRANSFER}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography sx={{ fontSize: 13, fontWeight: 600, color: TYPE_COLORS.ADJUST.fill }}>{r.byType.ADJUST}</Typography>
                  </TableCell>
                  <TableCell align="right" sx={ps.cellText}>{r.totalTasks}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>

      {/* ── Operator cards grid (existing) ── */}
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
            const total = r.totalCombined
            const pct = maxTotal > 0 ? Math.round((total / maxTotal) * 100) : 0
            const globalIdx = rankedOperators.indexOf(r)
            const medal = globalIdx >= 0 && globalIdx <= 2 && r.totalCombined > 0 ? MEDAL_COLORS[globalIdx] : null

            return (
              <Paper
                key={r.email || idx}
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: medal
                    ? ('1.5px solid ' + medal.border)
                    : (ps.isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(13,59,102,.08)'),
                  bgcolor: medal
                    ? medal.bg
                    : (ps.isDark ? 'rgba(17,34,64,.50)' : 'rgba(255,255,255,.80)'),
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
                        bgcolor: medal
                          ? medal.border
                          : (ps.isDark ? 'rgba(66,165,245,.15)' : 'rgba(21,101,192,.08)'),
                        color: medal
                          ? medal.icon
                          : (ps.isDark ? '#64B5F6' : '#1565C0'),
                      }}
                    >
                      {medal ? (
                        <Typography sx={{ fontWeight: 900, fontSize: 14, color: medal.icon }}>
                          {'#' + (globalIdx + 1)}
                        </Typography>
                      ) : (
                        <PersonIcon sx={{ fontSize: 20 }} />
                      )}
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
                  {medal && (
                    <Tooltip title={medal.label}>
                      <EmojiEventsIcon sx={{ color: medal.icon, fontSize: 20 }} />
                    </Tooltip>
                  )}
                </Stack>

                {/* Metrics row */}
                <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                  <Box sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 1.5, bgcolor: ps.isDark ? 'rgba(66,165,245,.08)' : 'rgba(21,101,192,.04)' }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>{r.totalMovements}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>Movimientos</Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 1.5, bgcolor: ps.isDark ? 'rgba(34,197,94,.08)' : 'rgba(46,125,50,.04)' }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>{r.totalTasks}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>Tareas</Typography>
                  </Box>
                  <Box sx={{ flex: 1, textAlign: 'center', py: 0.75, borderRadius: 1.5, bgcolor: ps.isDark ? 'rgba(245,158,11,.08)' : 'rgba(245,158,11,.04)' }}>
                    <Typography sx={{ fontSize: 18, fontWeight: 800, color: 'text.primary' }}>{r.pickCount || 0}</Typography>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase' }}>Picks</Typography>
                  </Box>
                </Stack>

                {/* Movement type mini-bar (NEW - #5 per card) */}
                {(r.byType.IN + r.byType.OUT + r.byType.TRANSFER + r.byType.ADJUST) > 0 && (
                  <Box sx={{ mb: 1.5 }}>
                    <Typography sx={{ fontSize: 10, fontWeight: 600, color: 'text.secondary', mb: 0.5 }}>Distribucion por tipo</Typography>
                    <Box sx={{ display: 'flex', height: 8, borderRadius: 999, overflow: 'hidden' }}>
                      {Object.entries(r.byType).filter(([, v]) => v > 0).map(([type, count]) => {
                        const typeTotal = r.byType.IN + r.byType.OUT + r.byType.TRANSFER + r.byType.ADJUST
                        const typePct = typeTotal > 0 ? (count / typeTotal) * 100 : 0
                        return (
                          <Tooltip key={type} title={(TYPE_COLORS[type]?.label || type) + ': ' + count}>
                            <Box sx={{
                              width: typePct + '%',
                              bgcolor: TYPE_COLORS[type]?.fill || '#999',
                              transition: 'width .3s ease',
                            }} />
                          </Tooltip>
                        )
                      })}
                    </Box>
                  </Box>
                )}

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
