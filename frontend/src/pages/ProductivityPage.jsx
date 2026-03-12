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

import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import PersonIcon from '@mui/icons-material/Person'

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

  const filtered = useMemo(() => {
    let list = operators
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.email || '').toLowerCase().includes(qq) ||
        (r.name || '').toLowerCase().includes(qq)
      )
    }
    return list
  }, [operators, q])

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

      {/* Date range filter */}
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
        <Button variant="contained" onClick={load} disabled={loading}>Consultar</Button>
        <Box sx={{ flex: 1 }} />
        <TextField label="Buscar operador" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 220 }} />
      </Stack>

      {/* Summary cards */}
      {summary && (
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 3, flexWrap: 'wrap' }}>
          <Chip icon={<TrendingUpIcon sx={{ color: 'inherit' }} />} label={'Total Movimientos: ' + (summary.totalMovements || 0)} sx={ps.metricChip('info')} />
          <Chip label={'Total Picks: ' + (summary.totalPicks || 0)} sx={ps.metricChip('ok')} />
          <Chip label={'Tareas Completadas: ' + (summary.totalTasksCompleted || 0)} sx={ps.metricChip('ok')} />
          <Chip label={'Tiempo Prom: ' + (summary.avgTimeMinutes != null ? summary.avgTimeMinutes + ' min' : '-')} sx={ps.metricChip('warn')} />
          <Chip icon={<PersonIcon sx={{ color: 'inherit' }} />} label={'Operadores Activos: ' + (summary.activeOperators || 0)} sx={ps.metricChip('default')} />
        </Stack>
      )}

      {/* Summary table */}
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

      {/* Operators table */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Productividad por Operador</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>{'Periodo: ' + dateFrom + ' a ' + dateTo}</Typography>
        </Box>
        <Table size="small" sx={{ minWidth: 800 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell>Operador</TableCell>
            <TableCell>Email</TableCell>
            <TableCell>Movimientos</TableCell>
            <TableCell>Picks</TableCell>
            <TableCell>Tareas</TableCell>
            <TableCell>Tiempo Promedio</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map(function(r, idx) {
              return (
                <TableRow key={r.email || idx} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontWeight: 700 }}>{r.name || r.email || '-'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.email || '-'}</TableCell>
                  <TableCell sx={ps.cellText}>{r.movementCount || 0}</TableCell>
                  <TableCell sx={ps.cellText}>{r.pickCount || 0}</TableCell>
                  <TableCell sx={ps.cellText}>{r.taskCount || 0}</TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip
                      size="small"
                      label={r.avgTimeMinutes != null ? r.avgTimeMinutes + ' min' : '-'}
                      sx={ps.metricChip(r.avgTimeMinutes != null && r.avgTimeMinutes <= 10 ? 'ok' : r.avgTimeMinutes > 30 ? 'bad' : 'warn')}
                    />
                  </TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (<TableRow><TableCell colSpan={6}><Typography sx={ps.emptyText}>Sin datos de productividad.</Typography></TableCell></TableRow>)}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
        </Stack>
      </Paper>
    </Box>
  )
}
