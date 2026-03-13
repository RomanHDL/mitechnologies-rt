import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
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
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Grid from '@mui/material/Grid'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'

import DownloadIcon from '@mui/icons-material/Download'
import InfoIcon from '@mui/icons-material/Info'
import HistoryIcon from '@mui/icons-material/History'
import ListAltIcon from '@mui/icons-material/ListAlt'
import TodayIcon from '@mui/icons-material/Today'
import PeopleIcon from '@mui/icons-material/People'
import CategoryIcon from '@mui/icons-material/Category'
import TimelineIcon from '@mui/icons-material/Timeline'
import TableChartIcon from '@mui/icons-material/TableChart'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import EditIcon from '@mui/icons-material/Edit'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import SyncAltIcon from '@mui/icons-material/SyncAlt'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'

import * as XLSX from 'xlsx'
import dayjs from 'dayjs'

const ACTION_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'CREATE', label: 'Crear' },
  { value: 'UPDATE', label: 'Actualizar' },
  { value: 'DELETE', label: 'Eliminar' },
  { value: 'LOGIN', label: 'Login' },
  { value: 'STATUS_CHANGE', label: 'Cambio Status' },
]

const ENTITY_OPTIONS = [
  { value: '', label: 'Todas' },
  { value: 'PALLET', label: 'Tarima' },
  { value: 'LOCATION', label: 'Ubicacion' },
  { value: 'ORDER', label: 'Orden' },
  { value: 'INBOUND', label: 'Recibo' },
  { value: 'USER', label: 'Usuario' },
  { value: 'TASK', label: 'Tarea' },
  { value: 'MOVEMENT', label: 'Movimiento' },
  { value: 'PRODUCT', label: 'Producto' },
  { value: 'RETURN_ORDER', label: 'Devolucion' },
  { value: 'CYCLE_COUNT', label: 'Conteo Ciclico' },
]

/* ── Action color mapping ── */
const ACTION_COLOR_MAP = {
  CREATE: { bg: '#E8F5E9', bgDark: 'rgba(34,197,94,.18)', color: '#2E7D32', colorDark: '#86EFAC', border: 'rgba(46,125,50,.25)', borderDark: 'rgba(34,197,94,.30)', icon: AddCircleOutlineIcon },
  UPDATE: { bg: '#E3F2FD', bgDark: 'rgba(66,165,245,.18)', color: '#1565C0', colorDark: '#64B5F6', border: 'rgba(21,101,192,.25)', borderDark: 'rgba(66,165,245,.30)', icon: EditIcon },
  DELETE: { bg: '#FFEBEE', bgDark: 'rgba(239,68,68,.18)', color: '#C62828', colorDark: '#FCA5A5', border: 'rgba(198,40,40,.25)', borderDark: 'rgba(239,68,68,.30)', icon: DeleteOutlineIcon },
  STATUS_CHANGE: { bg: '#FFF8E1', bgDark: 'rgba(245,158,11,.18)', color: '#E65100', colorDark: '#FCD34D', border: 'rgba(245,158,11,.25)', borderDark: 'rgba(245,158,11,.30)', icon: SyncAltIcon },
  LOGIN: { bg: '#F3E5F5', bgDark: 'rgba(171,71,188,.18)', color: '#7B1FA2', colorDark: '#CE93D8', border: 'rgba(123,31,162,.25)', borderDark: 'rgba(171,71,188,.30)', icon: PeopleIcon },
}

function actionTone(action) {
  if (action === 'CREATE') return 'ok'
  if (action === 'UPDATE' || action === 'STATUS_CHANGE') return 'info'
  if (action === 'DELETE') return 'bad'
  if (action === 'LOGIN') return 'default'
  return 'default'
}

function parseChanges(changes) {
  if (!changes) return null
  if (typeof changes === 'string') {
    try { return JSON.parse(changes) } catch (e) { return null }
  }
  return changes
}

function formatJsonChanges(changes) {
  if (!changes) return '-'
  if (typeof changes === 'string') {
    try { changes = JSON.parse(changes) } catch (e) { return changes }
  }
  return JSON.stringify(changes, null, 2)
}

/* ── Action chip with color coding ── */
function ActionChip({ action, isDark }) {
  const cfg = ACTION_COLOR_MAP[action]
  if (!cfg) {
    return <Chip size="small" label={action || '-'} sx={{ fontWeight: 700, borderRadius: '8px', height: 28 }} />
  }
  const Icon = cfg.icon
  return (
    <Chip
      size="small"
      icon={<Icon sx={{ fontSize: 14, color: 'inherit !important' }} />}
      label={action}
      sx={{
        fontWeight: 700,
        borderRadius: '8px',
        height: 28,
        bgcolor: isDark ? cfg.bgDark : cfg.bg,
        color: isDark ? cfg.colorDark : cfg.color,
        border: `1px solid ${isDark ? cfg.borderDark : cfg.border}`,
        '& .MuiChip-icon': { color: 'inherit' },
      }}
    />
  )
}

/* ── Before/After diff renderer ── */
function ChangesDiff({ changes, isDark }) {
  const parsed = parseChanges(changes)
  if (!parsed) return <Typography variant="body2" sx={{ color: 'text.secondary' }}>Sin datos de cambios</Typography>

  // If changes has before/after or old/new structure
  const hasBefore = parsed.before || parsed.old || parsed.previous
  const hasAfter = parsed.after || parsed.new || parsed.current
  const beforeData = parsed.before || parsed.old || parsed.previous
  const afterData = parsed.after || parsed.new || parsed.current

  if (hasBefore && hasAfter) {
    const allKeys = [...new Set([...Object.keys(beforeData || {}), ...Object.keys(afterData || {})])]
    return (
      <Box>
        <Table size="small" sx={{ '& td, & th': { fontSize: 12, py: 0.75 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '25%', color: 'text.secondary' }}>Campo</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '35%', color: isDark ? '#FCA5A5' : '#C62828' }}>Antes</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '5%' }}></TableCell>
              <TableCell sx={{ fontWeight: 600, width: '35%', color: isDark ? '#86EFAC' : '#2E7D32' }}>Despues</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {allKeys.map(key => {
              const bVal = beforeData?.[key]
              const aVal = afterData?.[key]
              const changed = JSON.stringify(bVal) !== JSON.stringify(aVal)
              return (
                <TableRow key={key} sx={changed ? { bgcolor: isDark ? 'rgba(66,165,245,.06)' : 'rgba(21,101,192,.03)' } : {}}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>{key}</TableCell>
                  <TableCell sx={{
                    fontFamily: 'monospace',
                    color: changed ? (isDark ? '#FCA5A5' : '#C62828') : 'text.secondary',
                    bgcolor: changed ? (isDark ? 'rgba(239,68,68,.06)' : 'rgba(239,68,68,.04)') : 'transparent',
                    wordBreak: 'break-all',
                  }}>
                    {bVal !== undefined ? String(typeof bVal === 'object' ? JSON.stringify(bVal) : bVal) : '-'}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    {changed && <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />}
                  </TableCell>
                  <TableCell sx={{
                    fontFamily: 'monospace',
                    color: changed ? (isDark ? '#86EFAC' : '#2E7D32') : 'text.secondary',
                    bgcolor: changed ? (isDark ? 'rgba(34,197,94,.06)' : 'rgba(34,197,94,.04)') : 'transparent',
                    wordBreak: 'break-all',
                  }}>
                    {aVal !== undefined ? String(typeof aVal === 'object' ? JSON.stringify(aVal) : aVal) : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    )
  }

  // Fallback: if changes is a flat object with field-level changes like { field: { from, to } }
  const entries = Object.entries(parsed)
  const hasFromTo = entries.length > 0 && entries.some(([, v]) => v && typeof v === 'object' && ('from' in v || 'to' in v || 'old' in v || 'new' in v))
  if (hasFromTo) {
    return (
      <Box>
        <Table size="small" sx={{ '& td, & th': { fontSize: 12, py: 0.75 } }}>
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 600, width: '25%', color: 'text.secondary' }}>Campo</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '35%', color: isDark ? '#FCA5A5' : '#C62828' }}>Antes</TableCell>
              <TableCell sx={{ fontWeight: 600, width: '5%' }}></TableCell>
              <TableCell sx={{ fontWeight: 600, width: '35%', color: isDark ? '#86EFAC' : '#2E7D32' }}>Despues</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map(([key, val]) => {
              if (!val || typeof val !== 'object') return null
              const bVal = val.from !== undefined ? val.from : val.old
              const aVal = val.to !== undefined ? val.to : val.new
              return (
                <TableRow key={key} sx={{ bgcolor: isDark ? 'rgba(66,165,245,.06)' : 'rgba(21,101,192,.03)' }}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>{key}</TableCell>
                  <TableCell sx={{
                    fontFamily: 'monospace',
                    color: isDark ? '#FCA5A5' : '#C62828',
                    bgcolor: isDark ? 'rgba(239,68,68,.06)' : 'rgba(239,68,68,.04)',
                    wordBreak: 'break-all',
                  }}>
                    {bVal !== undefined ? String(typeof bVal === 'object' ? JSON.stringify(bVal) : bVal) : '-'}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <ArrowForwardIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
                  </TableCell>
                  <TableCell sx={{
                    fontFamily: 'monospace',
                    color: isDark ? '#86EFAC' : '#2E7D32',
                    bgcolor: isDark ? 'rgba(34,197,94,.06)' : 'rgba(34,197,94,.04)',
                    wordBreak: 'break-all',
                  }}>
                    {aVal !== undefined ? String(typeof aVal === 'object' ? JSON.stringify(aVal) : aVal) : '-'}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Box>
    )
  }

  // Final fallback: raw JSON
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2,
        borderRadius: 2,
        maxHeight: 400,
        overflow: 'auto',
        fontFamily: 'monospace',
        fontSize: 12,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-all',
        backgroundColor: isDark ? 'rgba(11,25,41,.60)' : 'rgba(245,247,250,.80)',
      }}
    >
      {formatJsonChanges(changes)}
    </Paper>
  )
}

/* ── Timeline entry component ── */
function TimelineEntry({ row, idx, isLast, isSameEntity, isDark, ps, onDetail }) {
  const cfg = ACTION_COLOR_MAP[row.action] || ACTION_COLOR_MAP.LOGIN || {}
  const accentColor = isDark ? (cfg.colorDark || '#64B5F6') : (cfg.color || '#1565C0')
  const connectorColor = isSameEntity ? accentColor : (isDark ? 'rgba(255,255,255,.10)' : 'rgba(13,59,102,.10)')

  return (
    <Box sx={{ display: 'flex', gap: 2, position: 'relative', minHeight: 80 }}>
      {/* Timeline connector */}
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 40, flexShrink: 0 }}>
        <Box sx={{
          width: 12,
          height: 12,
          borderRadius: '50%',
          bgcolor: accentColor,
          border: `2px solid ${isDark ? 'rgba(17,34,64,1)' : '#fff'}`,
          boxShadow: `0 0 0 3px ${isDark ? cfg.borderDark || 'rgba(66,165,245,.30)' : cfg.border || 'rgba(21,101,192,.25)'}`,
          zIndex: 1,
          mt: 1,
        }} />
        {!isLast && (
          <Box sx={{
            width: isSameEntity ? 3 : 1,
            flex: 1,
            bgcolor: connectorColor,
            borderRadius: 1,
            mt: 0.5,
            mb: -1,
            transition: 'all .2s',
          }} />
        )}
      </Box>

      {/* Entry card */}
      <Paper
        elevation={0}
        sx={{
          ...ps.card,
          flex: 1,
          p: 2,
          mb: 1.5,
          border: isDark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(13,59,102,.06)',
          bgcolor: isDark ? 'rgba(17,34,64,.40)' : 'rgba(255,255,255,.80)',
          transition: 'all .15s',
          '&:hover': {
            bgcolor: isDark ? 'rgba(17,34,64,.60)' : 'rgba(255,255,255,1)',
            boxShadow: isDark ? '0 4px 12px rgba(0,0,0,.20)' : '0 4px 12px rgba(13,59,102,.08)',
          },
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Box sx={{ flex: 1 }}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <ActionChip action={row.action} isDark={isDark} />
              <Chip size="small" label={row.entity || '-'} variant="outlined" sx={{ fontSize: 11, fontWeight: 600, height: 24, borderRadius: '6px' }} />
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                {dayjs(row.createdAt).format('HH:mm:ss')}
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'text.primary', fontWeight: 600, mt: 0.5 }}>
              {row.description || `${row.action} en ${row.entity}`}
            </Typography>
            <Stack direction="row" spacing={2} sx={{ mt: 0.5 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ID: <Box component="span" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>{row.entityId || '-'}</Box>
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Usuario: {row.user?.email || '-'}
              </Typography>
            </Stack>
          </Box>
          <Tooltip title="Ver detalle">
            <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => onDetail(row)}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>
    </Box>
  )
}

export default function AuditPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [actionFilter, setActionFilter] = useState('')
  const [entityFilter, setEntityFilter] = useState('')
  const [userFilter, setUserFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15

  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [viewMode, setViewMode] = useState(0) // 0 = table, 1 = timeline

  const load = async () => {
    try {
      var res = await client.get('/api/audit')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading audit:', e) }
  }

  useEffect(() => { load() }, [token])

  // Unique users for filter
  const users = useMemo(() => {
    var set = new Set()
    rows.forEach(function(r) { if (r.user?.email) set.add(r.user.email) })
    return Array.from(set)
  }, [rows])

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      var qq = q.toLowerCase()
      list = list.filter(r =>
        (r.entityId || '').toLowerCase().includes(qq) ||
        (r.description || '').toLowerCase().includes(qq) ||
        (r.user?.email || '').toLowerCase().includes(qq) ||
        (r.entity || '').toLowerCase().includes(qq)
      )
    }
    if (actionFilter) list = list.filter(r => (r.action || '') === actionFilter)
    if (entityFilter) list = list.filter(r => (r.entity || '') === entityFilter)
    if (userFilter) list = list.filter(r => (r.user?.email || '') === userFilter)
    if (dateFrom) list = list.filter(r => dayjs(r.createdAt).isAfter(dayjs(dateFrom).startOf('day')))
    if (dateTo) list = list.filter(r => dayjs(r.createdAt).isBefore(dayjs(dateTo).endOf('day')))
    return list
  }, [rows, q, actionFilter, entityFilter, userFilter, dateFrom, dateTo])

  const resumen = useMemo(() => ({
    total: filtered.length,
    creates: filtered.filter(r => (r.action || '') === 'CREATE').length,
    updates: filtered.filter(r => (r.action || '') === 'UPDATE').length,
    deletes: filtered.filter(r => (r.action || '') === 'DELETE').length,
  }), [filtered])

  /* ── KPI computations ── */
  const kpis = useMemo(() => {
    const today = dayjs().format('YYYY-MM-DD')
    const todayActions = filtered.filter(r => dayjs(r.createdAt).format('YYYY-MM-DD') === today).length
    const uniqueUsers = new Set()
    filtered.forEach(r => { if (r.user?.email) uniqueUsers.add(r.user.email) })
    // Most frequent entity
    const entityCounts = {}
    filtered.forEach(r => {
      const e = r.entity || 'N/A'
      entityCounts[e] = (entityCounts[e] || 0) + 1
    })
    let topEntity = '-'
    let topCount = 0
    Object.entries(entityCounts).forEach(([e, c]) => {
      if (c > topCount) { topEntity = e; topCount = c }
    })
    return {
      total: filtered.length,
      todayActions,
      uniqueUsers: uniqueUsers.size,
      topEntity,
      topEntityCount: topCount,
    }
  }, [filtered])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    var start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  const exportExcel = () => {
    var data = filtered.map(r => ({
      Fecha: dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      Accion: r.action || '',
      Entidad: r.entity || '',
      EntityId: r.entityId || '',
      Usuario: r.user?.email || '',
      Descripcion: r.description || '',
      Cambios: typeof r.changes === 'object' ? JSON.stringify(r.changes) : (r.changes || ''),
    }))
    var ws = XLSX.utils.json_to_sheet(data)
    var wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Audit')
    XLSX.writeFile(wb, 'audit_log.xlsx')
  }

  const openDetail = useCallback((r) => { setSelected(r); setShowDetail(true) }, [])
  const closeDetail = () => setShowDetail(false)

  /* ── Timeline grouping by date ── */
  const timelineGroups = useMemo(() => {
    const groups = {}
    paginated.forEach(r => {
      const dateKey = dayjs(r.createdAt).format('YYYY-MM-DD')
      if (!groups[dateKey]) groups[dateKey] = []
      groups[dateKey].push(r)
    })
    return Object.entries(groups).sort((a, b) => b[0].localeCompare(a[0]))
  }, [paginated])

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Bitacora de Auditoria</Typography>
          <Typography sx={ps.pageSubtitle}>Registro de todas las acciones del sistema</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Exportar a Excel">
            <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}><DownloadIcon /></IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center',
                bgcolor: ps.isDark ? 'rgba(66,165,245,.12)' : 'rgba(21,101,192,.08)',
              }}>
                <ListAltIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Total registros</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{kpis.total.toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('green')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center',
                bgcolor: ps.isDark ? 'rgba(34,197,94,.12)' : 'rgba(46,125,50,.08)',
              }}>
                <TodayIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Acciones hoy</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{kpis.todayActions.toLocaleString()}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('amber')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center',
                bgcolor: ps.isDark ? 'rgba(245,158,11,.12)' : 'rgba(245,158,11,.08)',
              }}>
                <PeopleIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Usuarios activos</Typography>
                <Typography sx={{ fontSize: 24, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{kpis.uniqueUsers}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('red')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2, display: 'grid', placeItems: 'center',
                bgcolor: ps.isDark ? 'rgba(239,68,68,.12)' : 'rgba(198,40,40,.08)',
              }}>
                <CategoryIcon sx={{ color: ps.isDark ? '#FCA5A5' : '#C62828', fontSize: 22 }} />
              </Box>
              <Box>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>Entidad mas frecuente</Typography>
                <Typography sx={{ fontSize: 20, fontWeight: 600, color: 'text.primary', lineHeight: 1.1 }}>{kpis.topEntity}</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{kpis.topEntityCount} registros</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Existing metric chips ── */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip icon={<HistoryIcon sx={{ color: 'inherit' }} />} label={'Total: ' + resumen.total} sx={ps.metricChip('info')} />
        <Chip label={'Creaciones: ' + resumen.creates} sx={ps.metricChip('ok')} />
        <Chip label={'Actualizaciones: ' + resumen.updates} sx={ps.metricChip('warn')} />
        <Chip label={'Eliminaciones: ' + resumen.deletes} sx={ps.metricChip('bad')} />
      </Stack>

      {/* ── Filters ── */}
      <Paper elevation={1} sx={{ ...ps.card, p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ flexWrap: 'wrap' }}>
          <TextField label="Buscar ID, descripcion o usuario" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 240 }} />
          <TextField select label="Accion" value={actionFilter} onChange={e => setActionFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 150 }}>
            {ACTION_OPTIONS.map(o => (<MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>))}
          </TextField>

          {/* ── Entity type filter dropdown (enhanced) ── */}
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="entity-filter-label">Tipo de Entidad</InputLabel>
            <Select
              labelId="entity-filter-label"
              value={entityFilter}
              label="Tipo de Entidad"
              onChange={e => setEntityFilter(e.target.value)}
              sx={{
                ...ps.inputSx,
                '& .MuiOutlinedInput-notchedOutline': {},
              }}
            >
              {ENTITY_OPTIONS.map(o => (
                <MenuItem key={o.value} value={o.value}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{o.label}</Typography>
                    {o.value && (
                      <Chip size="small" label={o.value} sx={{ fontSize: 10, height: 18, fontWeight: 600, opacity: 0.6 }} />
                    )}
                  </Stack>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <TextField select label="Usuario" value={userFilter} onChange={e => setUserFilter(e.target.value)} sx={{ ...ps.inputSx, minWidth: 180 }}>
            <MenuItem value="">Todos</MenuItem>
            {users.map(u => (<MenuItem key={u} value={u}>{u}</MenuItem>))}
          </TextField>
          <TextField type="date" label="Desde" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...ps.inputSx, minWidth: 150 }} />
          <TextField type="date" label="Hasta" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} sx={{ ...ps.inputSx, minWidth: 150 }} />
        </Stack>
      </Paper>

      {/* ── View mode toggle ── */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2, border: ps.isDark ? '1px solid rgba(255,255,255,.06)' : '1px solid rgba(13,59,102,.06)' }}>
        <Tabs
          value={viewMode}
          onChange={(_, v) => setViewMode(v)}
          sx={{
            minHeight: 42,
            '& .MuiTab-root': { minHeight: 42, textTransform: 'none', fontWeight: 700, fontSize: 13 },
            '& .MuiTabs-indicator': { height: 3, borderRadius: '3px 3px 0 0' },
          }}
        >
          <Tab icon={<TableChartIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Tabla" />
          <Tab icon={<TimelineIcon sx={{ fontSize: 18 }} />} iconPosition="start" label="Timeline" />
        </Tabs>
      </Paper>

      {/* ── Table view ── */}
      {viewMode === 0 && (
        <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1000 }}>
            <TableHead><TableRow sx={ps.tableHeaderRow}>
              <TableCell>Fecha</TableCell>
              <TableCell>Accion</TableCell>
              <TableCell>Entidad</TableCell>
              <TableCell>ID Entidad</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Descripcion</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>Detalle</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {paginated.map(function(r, idx) {
                var id = r.id || r._id
                return (
                  <TableRow key={id} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD HH:mm:ss')}</TableCell>
                    <TableCell sx={ps.cellText}>
                      <ActionChip action={r.action} isDark={ps.isDark} />
                    </TableCell>
                    <TableCell sx={ps.cellText}>{r.entity || '-'}</TableCell>
                    <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.entityId || '-'}><span>{r.entityId || '-'}</span></Tooltip>
                    </TableCell>
                    <TableCell sx={ps.cellTextSecondary}>{r.user?.email || '-'}</TableCell>
                    <TableCell sx={{ ...ps.cellText, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.description || '-'}><span>{r.description || '-'}</span></Tooltip>
                    </TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Ver detalle y cambios">
                        <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}><InfoIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
              {!paginated.length && (<TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin registros de auditoria.</Typography></TableCell></TableRow>)}
            </TableBody>
          </Table>
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
            <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
            <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
            <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
          </Stack>
        </Paper>
      )}

      {/* ── Timeline view ── */}
      {viewMode === 1 && (
        <Box>
          {timelineGroups.length === 0 && (
            <Paper elevation={1} sx={{ ...ps.card, p: 4 }}>
              <Typography sx={ps.emptyText}>Sin registros de auditoria.</Typography>
            </Paper>
          )}
          {timelineGroups.map(([dateKey, entries]) => (
            <Box key={dateKey} sx={{ mb: 3 }}>
              {/* Date header */}
              <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5 }}>
                <Chip
                  size="small"
                  label={dayjs(dateKey).format('dddd, DD MMM YYYY')}
                  sx={{
                    ...ps.metricChip('info'),
                    fontWeight: 600,
                    textTransform: 'capitalize',
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 600 }}>
                  {entries.length} {entries.length === 1 ? 'registro' : 'registros'}
                </Typography>
              </Stack>

              {/* Timeline entries */}
              <Box sx={{ pl: 1 }}>
                {entries.map((r, idx) => {
                  const nextEntry = entries[idx + 1]
                  const isSameEntity = nextEntry && nextEntry.entity === r.entity && nextEntry.entityId === r.entityId
                  return (
                    <TimelineEntry
                      key={r.id || r._id}
                      row={r}
                      idx={idx}
                      isLast={idx === entries.length - 1}
                      isSameEntity={isSameEntity}
                      isDark={ps.isDark}
                      ps={ps}
                      onDetail={openDetail}
                    />
                  )
                })}
              </Box>
            </Box>
          ))}
          {/* Pagination for timeline too */}
          <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
            <Button disabled={page === 1} onClick={() => setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
            <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
            <Button disabled={page >= totalPages} onClick={() => setPage(function(p) { return Math.min(totalPages, p + 1) })}>Siguiente</Button>
          </Stack>
        </Box>
      )}

      {/* ── Detail modal (enhanced with before/after diff) ── */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="md" fullWidth>
        <DialogTitle sx={{ ...ps.pageTitle, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          Detalle de Registro de Auditoria
          {selected && <ActionChip action={selected.action} isDark={ps.isDark} />}
        </DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              {/* Info grid */}
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: ps.isDark ? 'rgba(11,25,41,.40)' : 'rgba(245,247,250,.60)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Fecha</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{dayjs(selected.createdAt).format('YYYY-MM-DD HH:mm:ss')}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: ps.isDark ? 'rgba(11,25,41,.40)' : 'rgba(245,247,250,.60)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Entidad</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{selected.entity || '-'} / {selected.entityId || '-'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: ps.isDark ? 'rgba(11,25,41,.40)' : 'rgba(245,247,250,.60)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Usuario</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'text.primary' }}>{selected.user?.email || '-'}</Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, bgcolor: ps.isDark ? 'rgba(11,25,41,.40)' : 'rgba(245,247,250,.60)' }}>
                    <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>IP</Typography>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.primary' }}>{selected.ip || '-'}</Typography>
                  </Paper>
                </Grid>
              </Grid>

              {selected.description && (
                <Box>
                  <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, textTransform: 'uppercase', fontSize: 10 }}>Descripcion</Typography>
                  <Typography variant="body2" sx={{ color: 'text.primary', mt: 0.25 }}>{selected.description}</Typography>
                </Box>
              )}

              <Divider />

              {/* Changes section with diff */}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Cambios</Typography>
                <ChangesDiff changes={selected.changes} isDark={ps.isDark} />
              </Box>
            </Stack>
          )}
        </DialogContent>
        <DialogActions><Button variant="contained" onClick={closeDetail}>Cerrar</Button></DialogActions>
      </Dialog>
    </Box>
  )
}
