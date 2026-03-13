import { io } from 'socket.io-client'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { apiFetch, apiUpload } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import TooltipMUI from '@mui/material/Tooltip'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import { useTheme } from '@mui/material/styles'

import RefreshIcon from '@mui/icons-material/Refresh'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import BalanceIcon from '@mui/icons-material/Balance'
import DownloadIcon from '@mui/icons-material/Download'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import BlockIcon from '@mui/icons-material/Block'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import InventoryIcon from '@mui/icons-material/Inventory'
import AssignmentIcon from '@mui/icons-material/Assignment'

import {
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar, CartesianGrid, Cell,
  PieChart, Pie,
  AreaChart, Area,
} from 'recharts'

import * as XLSX from 'xlsx'

/* ═══════════════════════════════════════════════════
   Helpers
   ═══════════════════════════════════════════════════ */

function getRoleFromToken(token) {
  try {
    if (!token) return ''
    const parts = token.split('.')
    if (parts.length < 2) return ''
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return String(payload.role || payload.rol || payload.Role || '').toUpperCase()
  } catch { return '' }
}

function safeNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function fmtNum(n) {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

function shortDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function timeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Ahora'
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

/* ═══════════════════════════════════════════════════
   Chart palette & theme-aware colors
   ═══════════════════════════════════════════════════ */

const CHART_COLORS = {
  blue: '#3B82F6',
  green: '#16A34A',
  red: '#DC2626',
  amber: '#D97706',
  purple: '#7C3AED',
  cyan: '#0891B2',
  slate: '#64748B',
}

const MOVEMENT_COLORS = {
  IN: '#16A34A',
  OUT: '#DC2626',
  TRANSFER: '#3B82F6',
  ADJUST: '#D97706',
}

const MOVEMENT_LABELS = {
  IN: 'Entradas',
  OUT: 'Salidas',
  TRANSFER: 'Transferencias',
  ADJUST: 'Ajustes',
}

/* ═══════════════════════════════════════════════════
   Reusable chart components
   ═══════════════════════════════════════════════════ */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <Paper elevation={0} sx={{
      px: 1.5, py: 1, borderRadius: 1.5,
      bgcolor: 'rgba(15,23,42,.92)', backdropFilter: 'blur(8px)',
      border: '1px solid rgba(255,255,255,.08)',
    }}>
      <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'rgba(226,232,240,.9)', mb: 0.25 }}>
        {label}
      </Typography>
      {payload.map((p, i) => (
        <Typography key={i} sx={{ fontSize: 11, color: p.color || 'rgba(226,232,240,.7)' }}>
          {p.name || p.dataKey}: <b>{p.value ?? 0}</b>
        </Typography>
      ))}
    </Paper>
  )
}

function SectionHeader({ title, subtitle, action }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
      <Box>
        <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>{title}</Typography>
        {subtitle && <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{subtitle}</Typography>}
      </Box>
      {action}
    </Box>
  )
}

function KpiCard({ title, value, subtitle, icon, trend, trendLabel, color = '#3B82F6' }) {
  const isPositive = trend > 0
  const isNegative = trend < 0
  return (
    <Paper elevation={0} sx={{ p: 2, height: '100%', borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.25 }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 1.5, flexShrink: 0,
          bgcolor: `${color}10`, display: 'grid', placeItems: 'center',
          color: color,
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.4 }}>
          {title}
        </Typography>
      </Stack>
      <Typography sx={{ fontSize: 28, fontWeight: 700, color: 'text.primary', lineHeight: 1, mb: 0.5 }}>
        {value}
      </Typography>
      <Stack direction="row" spacing={0.5} alignItems="center">
        <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>{subtitle}</Typography>
        {typeof trend === 'number' && trend !== 0 && (
          <Chip size="small" label={`${isPositive ? '+' : ''}${trend} ${trendLabel || ''}`} sx={{
            height: 18, fontSize: 10, fontWeight: 600,
            bgcolor: isPositive ? 'rgba(22,163,74,.08)' : 'rgba(220,38,38,.08)',
            color: isPositive ? '#16A34A' : '#DC2626',
            border: `1px solid ${isPositive ? 'rgba(22,163,74,.15)' : 'rgba(220,38,38,.15)'}`,
            '& .MuiChip-label': { px: 0.75 },
          }} />
        )}
      </Stack>
    </Paper>
  )
}

function StatusDot({ color, label, value }) {
  return (
    <Stack direction="row" spacing={0.75} alignItems="center">
      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: color, flexShrink: 0 }} />
      <Typography sx={{ fontSize: 12, color: 'text.secondary', flex: 1 }}>{label}</Typography>
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.primary' }}>{value}</Typography>
    </Stack>
  )
}

/* ═══════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════ */

export default function DashboardPage() {
  const { token, user } = useAuth()
  const nav = useNavigate()
  const ps = usePageStyles()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  /* ── State ── */
  const [stats, setStats] = useState({
    occupancyPct: 0, occupied: 0, total: 0,
    entradasHoy: 0, salidasHoy: 0,
  })
  const [occupancyByArea, setOccupancyByArea] = useState({})
  const [movementsPerDay, setMovementsPerDay] = useState({})
  const [top, setTop] = useState([])
  const [latest, setLatest] = useState([])
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState('')
  const [range, setRange] = useState('7D')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [socketOnline, setSocketOnline] = useState(false)
  const fileRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [activeAlerts, setActiveAlerts] = useState([])
  const [rackFull, setRackFull] = useState([])
  const [lowStock, setLowStock] = useState([])
  const [pendingTasks, setPendingTasks] = useState(0)
  const [pendingInbound, setPendingInbound] = useState(0)

  /* ── Role check ── */
  const roleFromState = String(user?.role || '').toUpperCase()
  const roleFromToken = getRoleFromToken(token)
  const isAdmin = Boolean(
    user?.isAdmin === true || roleFromState === 'ADMIN' || roleFromToken === 'ADMIN'
  )

  /* ── Chart colors ── */
  const gridStroke = isDark ? 'rgba(148,163,184,.10)' : 'rgba(148,163,184,.18)'
  const axisStroke = isDark ? 'rgba(148,163,184,.35)' : 'rgba(100,116,139,.5)'

  /* ── Data fetch ── */
  const refresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setErr('')

    try {
      const results = await Promise.allSettled([
        apiFetch(`/api/dashboard?range=${encodeURIComponent(range)}`),
        apiFetch('/api/movements?limit=10'),
        apiFetch('/api/inventory/top?limit=8'),
        apiFetch('/api/orders'),
        apiFetch('/api/alerts?status=ACTIVE'),
        apiFetch('/api/reports/alerts'),
        apiFetch('/api/tasks?status=PENDING').catch(() => []),
        apiFetch('/api/inbound?status=ESPERADA').catch(() => []),
      ])

      const s = results[0].status === 'fulfilled' ? results[0].value : null
      const mov = results[1].status === 'fulfilled' ? results[1].value : null
      const inv = results[2].status === 'fulfilled' ? results[2].value : null
      const ord = results[3].status === 'fulfilled' ? results[3].value : null
      const alertsRes = results[4].status === 'fulfilled' ? results[4].value : null
      const reportsRes = results[5].status === 'fulfilled' ? results[5].value : null
      const tasksRes = results[6].status === 'fulfilled' ? results[6].value : null
      const inboundRes = results[7].status === 'fulfilled' ? results[7].value : null

      if (s) {
        setStats(s)
        if (s.movementsPerDay) setMovementsPerDay(s.movementsPerDay)
        if (s.occupancy?.byArea) setOccupancyByArea(s.occupancy.byArea)
        if (Array.isArray(s.latest) && s.latest.length) setLatest(s.latest)
        if (Array.isArray(s.topSkus) && s.topSkus.length) setTop(s.topSkus)
      }

      const movList = (mov?.data || mov || [])
      if (!s?.latest?.length) setLatest(movList)

      const invList = (inv?.data || inv || [])
      if (!s?.topSkus?.length) setTop(invList)

      const ordList = (ord?.data || ord || [])
      setOrders((ordList || []).slice(0, 8))

      const alertsList2 = Array.isArray(alertsRes?.data) ? alertsRes.data : Array.isArray(alertsRes) ? alertsRes : []
      setActiveAlerts(alertsList2)

      if (reportsRes) {
        setRackFull(Array.isArray(reportsRes.rackFull) ? reportsRes.rackFull : [])
        setLowStock(Array.isArray(reportsRes.lowStock) ? reportsRes.lowStock : [])
      }

      const tasksList = Array.isArray(tasksRes?.data) ? tasksRes.data : Array.isArray(tasksRes) ? tasksRes : []
      setPendingTasks(tasksList.length)

      const inboundList = Array.isArray(inboundRes?.data) ? inboundRes.data : Array.isArray(inboundRes) ? inboundRes : []
      setPendingInbound(inboundList.length)

      const fails = results.slice(0, 6)
        .map((r, idx) => ({ r, idx }))
        .filter(x => x.r.status === 'rejected')
        .map(x => x.r.reason?.message || `Fallo en endpoint #${x.idx + 1}`)
      if (fails.length) setErr(fails.join(' | '))

      setLastUpdatedAt(new Date())
    } catch (e) {
      setErr(e?.message || 'Error cargando dashboard')
    } finally {
      setIsRefreshing(false)
    }
  }

  /* ── Socket.IO ── */
  useEffect(() => {
    if (!token) return
    const base = import.meta.env.VITE_API_URL
    if (!base) return
    const socket = io(String(base).replace(/\/+$/, ''), {
      transports: ['websocket', 'polling'], auth: { token },
    })
    const onUpdate = () => refresh()
    socket.on('connect', () => setSocketOnline(true))
    socket.on('disconnect', () => setSocketOnline(false))
    socket.on('connect_error', () => setSocketOnline(false))
    socket.on('dashboard:update', onUpdate)
    socket.on('palletDashboard:update', onUpdate)
    socket.on('production:update', onUpdate)
    return () => {
      socket.off('dashboard:update', onUpdate)
      socket.off('palletDashboard:update', onUpdate)
      socket.off('production:update', onUpdate)
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range])

  useEffect(() => { if (token) refresh() }, [token, range]) // eslint-disable-line
  useEffect(() => {
    if (!token) return
    const id = setInterval(refresh, 60000)
    return () => clearInterval(id)
  }, [token, range]) // eslint-disable-line

  /* ── Excel import ── */
  const doImportExcel = async (file) => {
    if (!file) return
    setImportMsg(''); setErr(''); setImporting(true)
    try {
      await apiUpload('/api/admin/import-excel', file)
      setImportMsg('Importado correctamente')
      await refresh()
    } catch (e) { setErr(e?.message || 'Error importando Excel') }
    finally { setImporting(false); if (fileRef.current) fileRef.current.value = '' }
  }

  /* ═══════════════════════════════════════════════════
     COMPUTED DATA
     ═══════════════════════════════════════════════════ */

  const occupancyPct = safeNum(stats.occupancyPct)
  const occupied = safeNum(stats.occupied)
  const total = safeNum(stats.total)
  const available = Math.max(total - occupied, 0)
  const blockedCount = safeNum(stats.bloqueadas || stats.blocked || 0)

  const entradasCamiones = safeNum(stats.entradasCamiones ?? stats.camionesEntrada ?? 0)
  const entradasPallets = safeNum(stats.entradasPallets ?? stats.palletsEntrada ?? 0)
  const entradasPiezas = safeNum(stats.entradasPiezas ?? stats.piezasEntrada ?? 0)
  const salidasOrdenes = safeNum(stats.salidasOrdenes ?? stats.ordenesSalida ?? 0)
  const salidasPallets = safeNum(stats.salidasPallets ?? stats.palletsSalida ?? 0)
  const salidasPiezas = safeNum(stats.salidasPiezas ?? stats.piezasSalida ?? 0)

  const diferencialTotal = useMemo(() => entradasPallets - salidasPallets, [entradasPallets, salidasPallets])

  /* Occupancy donut data */
  const occupancyDonut = useMemo(() => [
    { name: 'Ocupado', value: occupied, color: '#3B82F6' },
    { name: 'Disponible', value: available, color: isDark ? '#1E293B' : '#E2E8F0' },
    { name: 'Bloqueado', value: blockedCount, color: '#DC2626' },
  ].filter(d => d.value > 0), [occupied, available, blockedCount, isDark])

  /* Area occupancy for horizontal bars */
  const areaOccupancyData = useMemo(() => {
    const areas = ['A1', 'A2', 'A3', 'A4']
    return areas.map(a => {
      // Try from rackFull report first
      const rf = rackFull.find(r => r.area === a)
      if (rf) return { area: a, pct: safeNum(rf.occupancyPct ?? rf.percentage ?? rf.pct), occupied: safeNum(rf.occupied), total: safeNum(rf.total) }
      // Try from occupancy.byArea
      const val = safeNum(occupancyByArea[a])
      return { area: a, pct: val, occupied: 0, total: 0 }
    })
  }, [rackFull, occupancyByArea])

  /* Movement trend (time series from movementsPerDay) */
  const trendData = useMemo(() => {
    const days = range === 'HOY' ? 1 : range === '7D' ? 7 : 30
    const result = []
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      const dayData = movementsPerDay[key] || {}
      result.push({
        date: `${d.getDate()}/${d.getMonth() + 1}`,
        fullDate: key,
        IN: safeNum(dayData.IN),
        OUT: safeNum(dayData.OUT),
        TRANSFER: safeNum(dayData.TRANSFER),
        ADJUST: safeNum(dayData.ADJUST),
        total: safeNum(dayData.IN) + safeNum(dayData.OUT) + safeNum(dayData.TRANSFER) + safeNum(dayData.ADJUST),
      })
    }
    return result
  }, [movementsPerDay, range])

  /* Entries vs Exits comparative */
  const comparativeData = useMemo(() => [
    { name: 'Operaciones', entradas: entradasCamiones, salidas: salidasOrdenes },
    { name: 'Pallets', entradas: entradasPallets, salidas: salidasPallets },
    { name: 'Piezas', entradas: entradasPiezas, salidas: salidasPiezas },
  ], [entradasCamiones, salidasOrdenes, entradasPallets, salidasPallets, entradasPiezas, salidasPiezas])

  /* Top SKUs for horizontal bar */
  const topSkuData = useMemo(() =>
    (top || []).slice(0, 6).map(t => ({
      sku: t.sku?.length > 16 ? t.sku.slice(0, 16) + '…' : t.sku,
      fullSku: t.sku,
      qty: safeNum(t.totalQty ?? t.qty ?? 0),
    })).reverse()
  , [top])

  /* Order status breakdown */
  const orderStatusData = useMemo(() => {
    const counts = { PENDIENTE: 0, COMPLETADA: 0, CANCELADA: 0 }
    ;(orders || []).forEach(o => {
      const s = String(o.status || 'PENDIENTE').toUpperCase()
      if (s.includes('COMPLET') || s.includes('SHIPPED')) counts.COMPLETADA++
      else if (s.includes('CANCEL')) counts.CANCELADA++
      else counts.PENDIENTE++
    })
    return [
      { name: 'Pendientes', value: counts.PENDIENTE, color: '#D97706' },
      { name: 'Completadas', value: counts.COMPLETADA, color: '#16A34A' },
      { name: 'Canceladas', value: counts.CANCELADA, color: '#DC2626' },
    ].filter(d => d.value > 0)
  }, [orders])

  /* Operation status */
  const opStatus = useMemo(() => {
    if (blockedCount > 0) return { label: 'Atencion', color: '#D97706', bg: 'rgba(217,119,6,.08)' }
    if (diferencialTotal < 0) return { label: 'Bajo salida', color: '#DC2626', bg: 'rgba(220,38,38,.08)' }
    if (entradasPallets === 0 && salidasPallets === 0) return { label: 'Sin movimiento', color: '#64748B', bg: 'rgba(100,116,139,.08)' }
    return { label: 'Operacion estable', color: '#16A34A', bg: 'rgba(22,163,74,.08)' }
  }, [blockedCount, diferencialTotal, entradasPallets, salidasPallets])

  const lastUpdatedLabel = lastUpdatedAt ? lastUpdatedAt.toLocaleString() : '---'

  /* ── Excel export ── */
  const exportDashboardExcel = () => {
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([{
      Rango: range, 'Ultima actualizacion': lastUpdatedLabel,
      'Ocupacion %': occupancyPct, 'Ubicaciones ocupadas': occupied,
      'Ubicaciones totales': total, 'Disponibles': available,
      'Entradas operaciones': entradasCamiones, 'Entradas pallets': entradasPallets,
      'Entradas piezas': entradasPiezas, 'Salidas ordenes': salidasOrdenes,
      'Salidas pallets': salidasPallets, 'Salidas piezas': salidasPiezas,
      'Diferencial pallets': diferencialTotal, 'Bloqueadas': blockedCount,
      'Estado operacion': opStatus.label,
    }]), 'Resumen')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(trendData), 'Tendencia')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (latest || []).map(m => ({ Fecha: m.createdAt ? new Date(m.createdAt).toLocaleString() : '', Tipo: m.type || '', Nota: m.note || '', PalletId: m.palletId || '', Usuario: m.userEmail || m.user?.email || '' }))
    ), 'Movimientos')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (top || []).map(t => ({ SKU: t.sku, Cantidad: t.totalQty ?? t.qty ?? 0 }))
    ), 'TopSKUs')
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(
      (orders || []).map(o => ({ Orden: o.orderNumber || 'ORD', Status: o.status || '', Destino: `${o.destinationType || ''} ${o.destinationRef || ''}`.trim() }))
    ), 'Ordenes')
    XLSX.writeFile(wb, `dashboard_${range.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */

  return (
    <Box sx={ps.page}>
      {/* ── HEADER ── */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'center' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, mb: 2.5 }}>
        <Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="h5" sx={ps.pageTitle}>Centro de Operaciones</Typography>
            <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: socketOnline ? '#16A34A' : '#DC2626', flexShrink: 0 }} />
          </Stack>
          <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.25 }}>
            Ultima actualizacion: {lastUpdatedLabel}
          </Typography>
        </Box>

        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
          {['HOY', '7D', '30D'].map(r => (
            <Button key={r} size="small" variant={range === r ? 'contained' : 'outlined'}
              onClick={() => setRange(r)} sx={{ minWidth: 56, fontSize: 12 }}>
              {r === 'HOY' ? 'Hoy' : r === '7D' ? '7 dias' : '30 dias'}
            </Button>
          ))}
          <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />
          <TooltipMUI title="Exportar Excel">
            <IconButton size="small" onClick={exportDashboardExcel} sx={ps.actionBtn('primary')}>
              <DownloadIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </TooltipMUI>
          {isAdmin && (
            <TooltipMUI title="Importar Excel">
              <IconButton size="small" disabled={importing} onClick={() => fileRef.current?.click()} sx={ps.actionBtn('success')}>
                <UploadFileIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </TooltipMUI>
          )}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={e => doImportExcel(e.target.files?.[0])} />
          <TooltipMUI title="Actualizar">
            <IconButton size="small" onClick={refresh} disabled={isRefreshing} sx={ps.actionBtn('primary')}>
              <RefreshIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </TooltipMUI>
        </Stack>
      </Box>

      {(importing || isRefreshing) && <LinearProgress sx={{ mb: 1.5, borderRadius: 1 }} />}
      {importMsg && <Alert severity="success" sx={{ mb: 1.5 }}>{importMsg}</Alert>}
      {err && <Alert severity="warning" sx={{ mb: 1.5 }}>{err}</Alert>}

      {/* ── ROW 1: KPI STRIP ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Ocupacion" value={`${occupancyPct}%`}
            subtitle={`${occupied} de ${total}`}
            icon={<WarehouseIcon sx={{ fontSize: 18 }} />}
            color={CHART_COLORS.blue} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Entradas" value={fmtNum(entradasPallets)}
            subtitle={`${entradasPiezas} piezas`}
            icon={<TrendingUpIcon sx={{ fontSize: 18 }} />}
            color={CHART_COLORS.green}
            trend={diferencialTotal > 0 ? diferencialTotal : undefined}
            trendLabel="neto" />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Salidas" value={fmtNum(salidasPallets)}
            subtitle={`${salidasOrdenes} ordenes`}
            icon={<LocalShippingIcon sx={{ fontSize: 18 }} />}
            color={CHART_COLORS.amber} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Diferencial" value={diferencialTotal}
            subtitle={diferencialTotal >= 0 ? 'Balance positivo' : 'Mas salida que entrada'}
            icon={diferencialTotal < 0 ? <TrendingDownIcon sx={{ fontSize: 18 }} /> : <BalanceIcon sx={{ fontSize: 18 }} />}
            color={diferencialTotal < 0 ? CHART_COLORS.red : CHART_COLORS.green} />
        </Grid>
      </Grid>

      {/* ── ROW 2: OCCUPANCY + ENTRIES VS EXITS ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Occupancy Donut + Area Breakdown */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <SectionHeader title="Ocupacion del Almacen" subtitle={`${available} ubicaciones disponibles`} />
            <Grid container spacing={1}>
              <Grid item xs={6}>
                <Box sx={{ height: 180, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={occupancyDonut} dataKey="value" innerRadius="65%" outerRadius="90%" paddingAngle={2} startAngle={90} endAngle={-270}>
                        {occupancyDonut.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                      </Pie>
                      <Tooltip content={<ChartTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <Box sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography sx={{ fontSize: 24, fontWeight: 700, color: 'text.primary', lineHeight: 1 }}>
                        {occupancyPct}%
                      </Typography>
                      <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>ocupado</Typography>
                    </Box>
                  </Box>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Stack spacing={1} sx={{ pt: 1 }}>
                  <StatusDot color="#3B82F6" label="Ocupado" value={occupied} />
                  <StatusDot color={isDark ? '#334155' : '#E2E8F0'} label="Disponible" value={available} />
                  <StatusDot color="#DC2626" label="Bloqueado" value={blockedCount} />
                  <Divider sx={{ my: 0.5 }} />
                  <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.3, pt: 0.5 }}>
                    Por area
                  </Typography>
                  {areaOccupancyData.map(a => (
                    <Box key={a.area}>
                      <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.25 }}>
                        <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{a.area}</Typography>
                        <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.primary' }}>{a.pct}%</Typography>
                      </Stack>
                      <Box sx={{ height: 4, borderRadius: 2, bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.05)' }}>
                        <Box sx={{ height: '100%', borderRadius: 2, width: `${Math.min(a.pct, 100)}%`, bgcolor: a.pct > 90 ? '#DC2626' : a.pct > 70 ? '#D97706' : '#3B82F6', transition: 'width .4s ease' }} />
                      </Box>
                    </Box>
                  ))}
                </Stack>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Entries vs Exits Comparative */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <SectionHeader title="Entradas vs Salidas"
              subtitle={range === 'HOY' ? 'Hoy' : range === '7D' ? 'Ultimos 7 dias' : 'Ultimos 30 dias'}
              action={
                <Chip size="small" label={opStatus.label} sx={{
                  fontWeight: 600, fontSize: 11, height: 22,
                  bgcolor: opStatus.bg, color: opStatus.color,
                  border: `1px solid ${opStatus.color}20`,
                }} />
              }
            />
            <Box sx={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparativeData} barGap={4} barCategoryGap="25%">
                  <CartesianGrid stroke={gridStroke} strokeDasharray="3 5" vertical={false} />
                  <XAxis dataKey="name" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis stroke={axisStroke} tickLine={false} axisLine={false} fontSize={11} />
                  <Tooltip content={<ChartTooltip />} />
                  <Bar dataKey="entradas" name="Entradas" fill={CHART_COLORS.green} radius={[4, 4, 0, 0]} />
                  <Bar dataKey="salidas" name="Salidas" fill={CHART_COLORS.red} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Box>
            {/* Mini summary below chart */}
            <Stack direction="row" spacing={2} sx={{ mt: 1, px: 1 }}>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: CHART_COLORS.green }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Entradas: <b>{entradasPallets}</b> pallets, <b>{entradasPiezas}</b> pzas</Typography>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center">
                <Box sx={{ width: 10, height: 10, borderRadius: 1, bgcolor: CHART_COLORS.red }} />
                <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Salidas: <b>{salidasPallets}</b> pallets, <b>{salidasPiezas}</b> pzas</Typography>
              </Stack>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── ROW 3: MOVEMENT TREND ── */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <SectionHeader title="Tendencia de Movimientos"
          subtitle={`Volumen diario — ${trendData.length} dias`} />
        <Box sx={{ height: 220 }}>
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendData}>
              <defs>
                <linearGradient id="gIn" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MOVEMENT_COLORS.IN} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={MOVEMENT_COLORS.IN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gOut" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MOVEMENT_COLORS.OUT} stopOpacity={0.15} />
                  <stop offset="100%" stopColor={MOVEMENT_COLORS.OUT} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gTr" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={MOVEMENT_COLORS.TRANSFER} stopOpacity={0.12} />
                  <stop offset="100%" stopColor={MOVEMENT_COLORS.TRANSFER} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={gridStroke} strokeDasharray="3 5" vertical={false} />
              <XAxis dataKey="date" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={10} />
              <YAxis stroke={axisStroke} tickLine={false} axisLine={false} fontSize={10} width={30} />
              <Tooltip content={<ChartTooltip />} />
              <Area type="monotone" dataKey="IN" name="Entradas" stroke={MOVEMENT_COLORS.IN} fill="url(#gIn)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="OUT" name="Salidas" stroke={MOVEMENT_COLORS.OUT} fill="url(#gOut)" strokeWidth={2} dot={false} />
              <Area type="monotone" dataKey="TRANSFER" name="Transferencias" stroke={MOVEMENT_COLORS.TRANSFER} fill="url(#gTr)" strokeWidth={1.5} dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </Box>
        <Stack direction="row" spacing={2} sx={{ mt: 1, px: 1 }}>
          {['IN', 'OUT', 'TRANSFER', 'ADJUST'].map(t => (
            <Stack key={t} direction="row" spacing={0.5} alignItems="center">
              <Box sx={{ width: 8, height: 8, borderRadius: 1, bgcolor: MOVEMENT_COLORS[t] }} />
              <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>{MOVEMENT_LABELS[t]}</Typography>
            </Stack>
          ))}
        </Stack>
      </Paper>

      {/* ── ROW 4: ALERTS + TOP SKUs + ORDERS ── */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {/* Alerts & Critical */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <SectionHeader title="Alertas Operativas"
              action={
                <Chip size="small" label={activeAlerts.length + lowStock.length + rackFull.length}
                  sx={{ height: 20, fontSize: 10, fontWeight: 600,
                    bgcolor: (activeAlerts.length + lowStock.length + rackFull.length) > 0 ? 'rgba(220,38,38,.08)' : 'rgba(22,163,74,.08)',
                    color: (activeAlerts.length + lowStock.length + rackFull.length) > 0 ? '#DC2626' : '#16A34A',
                    '& .MuiChip-label': { px: 0.75 },
                  }}
                />
              }
            />
            <Stack spacing={1}>
              {/* Alert summary items */}
              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => nav('/alertas')}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <WarningAmberIcon sx={{ fontSize: 16, color: activeAlerts.length > 0 ? '#DC2626' : '#64748B' }} />
                  <Typography sx={{ fontSize: 12, flex: 1, color: 'text.primary' }}>Alertas activas</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: activeAlerts.length > 0 ? '#DC2626' : 'text.primary' }}>{activeAlerts.length}</Typography>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => nav('/inventario')}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <InventoryIcon sx={{ fontSize: 16, color: lowStock.length > 0 ? '#D97706' : '#64748B' }} />
                  <Typography sx={{ fontSize: 12, flex: 1, color: 'text.primary' }}>Stock bajo</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: lowStock.length > 0 ? '#D97706' : 'text.primary' }}>{lowStock.length}</Typography>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => nav('/racks')}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ErrorOutlineIcon sx={{ fontSize: 16, color: rackFull.length > 0 ? '#DC2626' : '#64748B' }} />
                  <Typography sx={{ fontSize: 12, flex: 1, color: 'text.primary' }}>Areas criticas (&gt;90%)</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: rackFull.length > 0 ? '#DC2626' : 'text.primary' }}>{rackFull.length}</Typography>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => nav('/ubicaciones')}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <BlockIcon sx={{ fontSize: 16, color: blockedCount > 0 ? '#DC2626' : '#64748B' }} />
                  <Typography sx={{ fontSize: 12, flex: 1, color: 'text.primary' }}>Ubicaciones bloqueadas</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: blockedCount > 0 ? '#DC2626' : 'text.primary' }}>{blockedCount}</Typography>
                </Stack>
              </Paper>

              <Divider />

              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => nav('/tareas')}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <AssignmentIcon sx={{ fontSize: 16, color: '#3B82F6' }} />
                  <Typography sx={{ fontSize: 12, flex: 1, color: 'text.primary' }}>Tareas pendientes</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{pendingTasks}</Typography>
                </Stack>
              </Paper>

              <Paper variant="outlined" sx={{ p: 1.25, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }} onClick={() => nav('/recepcion')}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <LocalShippingIcon sx={{ fontSize: 16, color: '#0891B2' }} />
                  <Typography sx={{ fontSize: 12, flex: 1, color: 'text.primary' }}>Recepciones esperadas</Typography>
                  <Typography sx={{ fontSize: 14, fontWeight: 700, color: 'text.primary' }}>{pendingInbound}</Typography>
                </Stack>
              </Paper>

              {(activeAlerts.length + lowStock.length + rackFull.length) === 0 && (
                <Stack direction="row" spacing={0.75} alignItems="center" justifyContent="center" sx={{ py: 1 }}>
                  <CheckCircleOutlineIcon sx={{ fontSize: 16, color: '#16A34A' }} />
                  <Typography sx={{ fontSize: 12, color: '#16A34A', fontWeight: 600 }}>Sin alertas activas</Typography>
                </Stack>
              )}
            </Stack>
          </Paper>
        </Grid>

        {/* Top SKUs Horizontal Bar */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <SectionHeader title="Top SKUs" subtitle={`${top.length} productos con mas movimiento`}
              action={<Button size="small" variant="text" onClick={() => nav('/inventario')} sx={{ fontSize: 11, minWidth: 0 }}>Ver todo</Button>}
            />
            {topSkuData.length > 0 ? (
              <Box sx={{ height: 240 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topSkuData} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="3 5" horizontal={false} />
                    <XAxis type="number" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={10} />
                    <YAxis type="category" dataKey="sku" stroke={axisStroke} tickLine={false} axisLine={false} fontSize={10} width={80} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="qty" name="Cantidad" fill={CHART_COLORS.blue} radius={[0, 4, 4, 0]} barSize={14} />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            ) : (
              <Box sx={{ display: 'grid', placeItems: 'center', height: 200 }}>
                <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sin datos de SKUs</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Orders Status + Recent */}
        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 2, height: '100%' }}>
            <SectionHeader title="Ordenes" subtitle={`${orders.length} recientes`}
              action={<Button size="small" variant="text" onClick={() => nav('/ordenes')} sx={{ fontSize: 11, minWidth: 0 }}>Ver todo</Button>}
            />
            {/* Mini donut */}
            {orderStatusData.length > 0 && (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
                <Box sx={{ width: 80, height: 80, flexShrink: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={orderStatusData} dataKey="value" innerRadius="55%" outerRadius="95%" paddingAngle={3} startAngle={90} endAngle={-270}>
                        {orderStatusData.map((d, i) => <Cell key={i} fill={d.color} stroke="none" />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                </Box>
                <Stack spacing={0.5}>
                  {orderStatusData.map(d => (
                    <StatusDot key={d.name} color={d.color} label={d.name} value={d.value} />
                  ))}
                </Stack>
              </Box>
            )}
            {/* Compact order list */}
            <Stack spacing={0.75} sx={{ maxHeight: 180, overflow: 'auto' }}>
              {orders.slice(0, 5).map(o => {
                const st = String(o.status || '').toUpperCase()
                const stColor = st.includes('COMPLET') ? '#16A34A' : st.includes('CANCEL') ? '#DC2626' : '#D97706'
                return (
                  <Paper key={o._id || o.id || o.orderNumber} variant="outlined"
                    sx={{ p: 1, borderRadius: 1.5, cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                    onClick={() => nav('/ordenes')}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontSize: 12, fontWeight: 600, fontFamily: 'monospace', color: 'text.primary' }}>
                        {o.orderNumber || 'ORD'}
                      </Typography>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: stColor }} />
                    </Stack>
                    <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                      {o.destinationType || ''} {o.destinationRef ? `· ${o.destinationRef}` : ''}
                    </Typography>
                  </Paper>
                )
              })}
              {!orders?.length && (
                <Typography sx={{ fontSize: 12, color: 'text.secondary', textAlign: 'center', py: 2 }}>Sin ordenes recientes</Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* ── ROW 5: RECENT ACTIVITY (compact table) ── */}
      <Paper elevation={0} sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Box sx={{ px: 2, py: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid', borderColor: 'divider' }}>
          <Box>
            <Typography sx={{ fontWeight: 600, fontSize: 14, color: 'text.primary' }}>Actividad Reciente</Typography>
            <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{latest.length} ultimos movimientos</Typography>
          </Box>
          <Button size="small" variant="text" onClick={() => nav('/movimientos')} sx={{ fontSize: 11, minWidth: 0 }}>Ver todos</Button>
        </Box>
        {latest.length > 0 ? (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Tipo</TableCell>
                <TableCell>Detalle</TableCell>
                <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>Usuario</TableCell>
                <TableCell align="right">Tiempo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {latest.slice(0, 8).map((m, i) => {
                const typ = String(m.type || 'MOV').toUpperCase()
                const tc = MOVEMENT_COLORS[typ] || '#64748B'
                return (
                  <TableRow key={m._id || m.id || i} hover sx={{ cursor: 'pointer' }} onClick={() => nav('/movimientos')}>
                    <TableCell>
                      <Chip size="small" label={MOVEMENT_LABELS[typ] || typ} sx={{
                        height: 20, fontSize: 10, fontWeight: 600,
                        bgcolor: `${tc}10`, color: tc, border: `1px solid ${tc}20`,
                        '& .MuiChip-label': { px: 0.75 },
                      }} />
                    </TableCell>
                    <TableCell>
                      <Typography sx={{ fontSize: 12, color: 'text.primary' }}>
                        {m.note || 'Movimiento registrado'}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ display: { xs: 'none', sm: 'table-cell' } }}>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                        {m.userEmail || m.user?.email || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Typography sx={{ fontSize: 11, color: 'text.secondary', fontFamily: 'monospace' }}>
                        {timeAgo(m.createdAt)}
                      </Typography>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        ) : (
          <Box sx={{ p: 3, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 13, color: 'text.secondary' }}>Sin movimientos recientes</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  )
}
