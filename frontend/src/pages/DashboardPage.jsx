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

import RefreshIcon from '@mui/icons-material/Refresh'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AssignmentIcon from '@mui/icons-material/Assignment'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import UploadFileIcon from '@mui/icons-material/UploadFile'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'
import TrendingDownIcon from '@mui/icons-material/TrendingDown'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import BalanceIcon from '@mui/icons-material/Balance'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import DownloadIcon from '@mui/icons-material/Download'
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive'
import AddBoxIcon from '@mui/icons-material/AddBox'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

import {
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
} from 'recharts'

import * as XLSX from 'xlsx'

function Pill({ label, icon, ps }) {
  return (
    <Chip
      size="small"
      icon={icon}
      label={label}
      sx={{ ...ps.metricChip('info'), fontSize: '0.6875rem' }}
    />
  )
}

function getRoleFromToken(token) {
  try {
    if (!token) return ''
    const parts = token.split('.')
    if (parts.length < 2) return ''
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return String(payload.role || payload.rol || payload.Role || '').toUpperCase()
  } catch {
    return ''
  }
}

function safeNum(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}

function movementTypeChipSx(type) {
  const t = String(type || '').toUpperCase()
  if (t === 'IN' || t === 'ENTRADA') return { bgcolor: 'rgba(34,197,94,.08)', color: '#15803D', border: '1px solid rgba(34,197,94,.20)', fontWeight: 600 }
  if (t === 'OUT' || t === 'SALIDA') return { bgcolor: 'rgba(239,68,68,.08)', color: '#B91C1C', border: '1px solid rgba(239,68,68,.20)', fontWeight: 600 }
  if (t === 'TRANSFER' || t === 'TRANSFERENCIA') return { bgcolor: 'rgba(59,130,246,.08)', color: '#1D4ED8', border: '1px solid rgba(59,130,246,.20)', fontWeight: 600 }
  if (t === 'ADJUST' || t === 'AJUSTE') return { bgcolor: 'rgba(245,158,11,.08)', color: '#B45309', border: '1px solid rgba(245,158,11,.20)', fontWeight: 600 }
  return { bgcolor: 'rgba(148,163,184,.06)', color: 'text.secondary', border: '1px solid rgba(148,163,184,.15)', fontWeight: 600 }
}

function ElegantTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null
  const v = payload?.[0]?.value

  return (
    <Paper
      elevation={0}
      sx={{
        px: 1.25,
        py: 0.9,
        borderRadius: 2,
        border: '1px solid rgba(148,163,184,.25)',
        bgcolor: 'rgba(2,6,23,.88)',
        backdropFilter: 'blur(10px)',
      }}
    >
      <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'rgba(226,232,240,.95)' }}>
        {label || 'Dato'}
      </Typography>
      <Typography sx={{ fontSize: 12, color: 'rgba(226,232,240,.85)' }}>
        Valor: <b>{v ?? 0}</b>
      </Typography>
    </Paper>
  )
}

function StatusMiniCard({ title, value, subtitle, icon, tone = 'info', progress }) {
  const tones = {
    info: {
      border: 'rgba(59,130,246,.12)',
      iconColor: '#3B82F6',
      iconBg: 'rgba(59,130,246,.08)',
      barColor: '#3B82F6',
    },
    success: {
      border: 'rgba(34,197,94,.12)',
      iconColor: '#16A34A',
      iconBg: 'rgba(34,197,94,.08)',
      barColor: '#16A34A',
    },
    warning: {
      border: 'rgba(245,158,11,.12)',
      iconColor: '#D97706',
      iconBg: 'rgba(245,158,11,.08)',
      barColor: '#D97706',
    },
    danger: {
      border: 'rgba(239,68,68,.12)',
      iconColor: '#DC2626',
      iconBg: 'rgba(239,68,68,.08)',
      barColor: '#DC2626',
    },
  }

  const t = tones[tone] || tones.info

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2,
        borderRadius: 2,
        border: `1px solid`,
        borderColor: t.border,
        height: '100%',
        transition: 'border-color .15s ease',
        '&:hover': { borderColor: 'rgba(0,0,0,.12)' },
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5,
          bgcolor: t.iconBg,
          display: 'grid', placeItems: 'center',
          color: t.iconColor,
        }}>
          {icon}
        </Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.3 }}>
          {title}
        </Typography>
      </Stack>

      <Typography sx={{ fontSize: 26, lineHeight: 1, fontWeight: 700, color: 'text.primary', mb: 0.5 }}>
        {value}
      </Typography>

      <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
        {subtitle}
      </Typography>

      {typeof progress === 'number' && (
        <Box sx={{ mt: 1.25, height: 4, borderRadius: 2, bgcolor: 'rgba(0,0,0,.04)', overflow: 'hidden' }}>
          <Box sx={{
            height: '100%',
            width: `${Math.min(progress, 100)}%`,
            borderRadius: 2,
            bgcolor: progress > 90 ? '#DC2626' : progress > 70 ? '#D97706' : t.barColor,
            transition: 'width 0.5s ease',
          }} />
        </Box>
      )}
    </Paper>
  )
}

export default function DashboardPage() {
  const { token, user } = useAuth()
  const nav = useNavigate()
  const ps = usePageStyles()

  const [stats, setStats] = useState({
    occupancyPct: 0,
    occupied: 0,
    total: 0,
    entradasHoy: 0,
    salidasHoy: 0,
  })

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
  const [alertsExpanded, setAlertsExpanded] = useState(false)
  const [rackFull, setRackFull] = useState([])
  const [lowStock, setLowStock] = useState([])

  const roleFromState = String(user?.role || '').toUpperCase()
  const roleFromToken = getRoleFromToken(token)
  const isAdmin = Boolean(
    user?.isAdmin === true ||
    roleFromState === 'ADMIN' ||
    roleFromToken === 'ADMIN'
  )

  const axisStroke = ps.isDark ? 'rgba(148,163,184,.45)' : 'rgba(100,116,139,.6)'
  const gridStroke = ps.isDark ? 'rgba(148,163,184,.12)' : 'rgba(148,163,184,.22)'

  const refresh = async () => {
    if (isRefreshing) return
    setIsRefreshing(true)
    setErr('')

    try {
      const results = await Promise.allSettled([
        apiFetch(`/api/dashboard?range=${encodeURIComponent(range)}`),
        apiFetch('/api/movements?limit=10'),
        apiFetch('/api/inventory/top?limit=5'),
        apiFetch('/api/orders'),
        apiFetch('/api/alerts?status=ACTIVE'),
        apiFetch('/api/reports/alerts'),
      ])

      const s = results[0].status === 'fulfilled' ? results[0].value : null
      const mov = results[1].status === 'fulfilled' ? results[1].value : null
      const inv = results[2].status === 'fulfilled' ? results[2].value : null
      const ord = results[3].status === 'fulfilled' ? results[3].value : null
      const alertsRes = results[4].status === 'fulfilled' ? results[4].value : null
      const reportsRes = results[5].status === 'fulfilled' ? results[5].value : null

      if (s) {
        setStats(s)
        if (Array.isArray(s.latest) && s.latest.length) {
          setLatest(s.latest)
        }
        if (Array.isArray(s.topSkus) && s.topSkus.length) {
          setTop(s.topSkus)
        }
      }

      const movList = (mov?.data || mov || [])
      if (!s?.latest?.length) setLatest(movList)

      const invList = (inv?.data || inv || [])
      if (!s?.topSkus?.length) setTop(invList)

      const ordList = (ord?.data || ord || [])
      setOrders((ordList || []).slice(0, 6))

      const alertsList2 = Array.isArray(alertsRes?.data) ? alertsRes.data : Array.isArray(alertsRes) ? alertsRes : []
      setActiveAlerts(alertsList2)

      if (reportsRes) {
        setRackFull(Array.isArray(reportsRes.rackFull) ? reportsRes.rackFull : [])
        setLowStock(Array.isArray(reportsRes.lowStock) ? reportsRes.lowStock : [])
      }

      const fails = results
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

  useEffect(() => {
    if (!token) return

    const base = import.meta.env.VITE_API_URL
    if (!base) return

    const socket = io(String(base).replace(/\/+$/, ''), {
      transports: ['websocket', 'polling'],
      auth: { token },
    })

    const onAnyUpdate = () => {
      refresh()
    }

    socket.on('connect', () => setSocketOnline(true))
    socket.on('disconnect', () => setSocketOnline(false))
    socket.on('connect_error', () => setSocketOnline(false))

    socket.on('dashboard:update', onAnyUpdate)
    socket.on('palletDashboard:update', onAnyUpdate)
    socket.on('production:update', onAnyUpdate)

    return () => {
      socket.off('dashboard:update', onAnyUpdate)
      socket.off('palletDashboard:update', onAnyUpdate)
      socket.off('production:update', onAnyUpdate)
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range])

  useEffect(() => {
    if (!token) return
    refresh()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range])

  useEffect(() => {
    if (!token) return
    const id = setInterval(() => {
      refresh()
    }, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, range])

  const doImportExcel = async (file) => {
    if (!file) return
    setImportMsg('')
    setErr('')
    setImporting(true)
    try {
      await apiUpload('/api/admin/import-excel', file)
      setImportMsg('✅ Importado correctamente')
      await refresh()
    } catch (e) {
      setErr(e?.message || 'Error importando Excel')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const occupancyPct = safeNum(stats.occupancyPct)
  const occupied = safeNum(stats.occupied)
  const total = safeNum(stats.total)
  const available = Math.max(total - occupied, 0)

  const blockedCount = safeNum(stats.bloqueadas || stats.blocked || 0)

  const lastUpdatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleString()
    : '---'

  const entradasCamiones = safeNum(stats.entradasCamiones ?? stats.camionesEntrada ?? 0)
  const entradasPallets = safeNum(stats.entradasPallets ?? stats.palletsEntrada ?? 0)
  const entradasPiezas = safeNum(stats.entradasPiezas ?? stats.piezasEntrada ?? 0)

  const salidasOrdenes = safeNum(stats.salidasOrdenes ?? stats.ordenesSalida ?? 0)
  const salidasPallets = safeNum(stats.salidasPallets ?? stats.palletsSalida ?? 0)
  const salidasPiezas = safeNum(stats.salidasPiezas ?? stats.piezasSalida ?? 0)

  const entradasData = [
    { name: 'Camiones', value: entradasCamiones },
    { name: 'Pallets', value: entradasPallets },
    { name: 'Piezas', value: entradasPiezas },
  ]

  const salidasData = [
    { name: 'Órdenes', value: salidasOrdenes },
    { name: 'Pallets', value: salidasPallets },
    { name: 'Piezas', value: salidasPiezas },
  ]

  const diferencialData = [
    { name: 'Operaciones', value: entradasCamiones - salidasOrdenes },
    { name: 'Pallets', value: entradasPallets - salidasPallets },
    { name: 'Piezas', value: entradasPiezas - salidasPiezas },
  ]

  const diferencialTotal = useMemo(() => {
    return safeNum(entradasPallets - salidasPallets)
  }, [entradasPallets, salidasPallets])

  const semaforoOperacion = useMemo(() => {
    if (blockedCount > 0) return { label: 'Atención', tone: 'warning' }
    if (diferencialTotal < 0) return { label: 'Bajo salida', tone: 'danger' }
    if (entradasPallets === 0 && salidasPallets === 0) return { label: 'Sin movimiento', tone: 'info' }
    return { label: 'Estable', tone: 'success' }
  }, [blockedCount, diferencialTotal, entradasPallets, salidasPallets])

  const alertsList = [
    {
      icon: <BlockIcon sx={{ color: 'error.main' }} fontSize="small" />,
      label: 'Ubicaciones bloqueadas',
      count: blockedCount || 0,
      to: '/ubicaciones'
    },
    {
      icon: <AssignmentIcon color="primary" fontSize="small" />,
      label: 'Ordenes recientes',
      count: orders?.length || 0,
      to: '/ordenes'
    },
    {
      icon: <Inventory2Icon color="primary" fontSize="small" />,
      label: 'Top SKUs con movimiento',
      count: top?.length || 0,
      to: '/inventario'
    },
  ]

  const exportDashboardExcel = () => {
    const wb = XLSX.utils.book_new()

    const resumenSheet = XLSX.utils.json_to_sheet([
      {
        Rango: range,
        'Última actualización': lastUpdatedLabel,
        'Ocupación %': occupancyPct,
        'Ubicaciones ocupadas': occupied,
        'Ubicaciones totales': total,
        'Ubicaciones disponibles': available,
        'Entradas operaciones': entradasCamiones,
        'Entradas pallets': entradasPallets,
        'Entradas piezas': entradasPiezas,
        'Salidas órdenes': salidasOrdenes,
        'Salidas pallets': salidasPallets,
        'Salidas piezas': salidasPiezas,
        'Diferencial pallets': diferencialTotal,
        'Ubicaciones bloqueadas': blockedCount,
        'Estado operación': semaforoOperacion.label,
      }
    ])
    XLSX.utils.book_append_sheet(wb, resumenSheet, 'Resumen')

    const entradasSheet = XLSX.utils.json_to_sheet(entradasData)
    XLSX.utils.book_append_sheet(wb, entradasSheet, 'Entradas')

    const salidasSheet = XLSX.utils.json_to_sheet(salidasData)
    XLSX.utils.book_append_sheet(wb, salidasSheet, 'Salidas')

    const diferencialSheet = XLSX.utils.json_to_sheet(diferencialData)
    XLSX.utils.book_append_sheet(wb, diferencialSheet, 'Diferencial')

    const movimientosSheet = XLSX.utils.json_to_sheet(
      (latest || []).map((m) => ({
        Fecha: m.createdAt ? new Date(m.createdAt).toLocaleString() : '',
        Tipo: m.type || '',
        Nota: m.note || '',
        PalletId: m.palletId || '',
        Usuario: m.userEmail || m.user?.email || '',
      }))
    )
    XLSX.utils.book_append_sheet(wb, movimientosSheet, 'Movimientos')

    const alertasSheet = XLSX.utils.json_to_sheet(
      alertsList.map((a) => ({
        Alerta: a.label,
        Cantidad: a.count,
      }))
    )
    XLSX.utils.book_append_sheet(wb, alertasSheet, 'Alertas')

    const topSheet = XLSX.utils.json_to_sheet(
      (top || []).map((t) => ({
        SKU: t.sku,
        Cantidad: t.totalQty ?? t.qty ?? 0,
      }))
    )
    XLSX.utils.book_append_sheet(wb, topSheet, 'TopSKUs')

    const ordenesSheet = XLSX.utils.json_to_sheet(
      (orders || []).map((o) => ({
        Orden: o.orderNumber || 'ORD',
        Status: o.status || '',
        Destino: `${o.destinationType || ''}${o.destinationRef ? ` - ${o.destinationRef}` : ''}`,
      }))
    )
    XLSX.utils.book_append_sheet(wb, ordenesSheet, 'Ordenes')

    XLSX.writeFile(wb, `dashboard_${String(range).toLowerCase()}_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <Box sx={ps.page}>
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', md: 'flex-end' },
          justifyContent: 'space-between',
          flexDirection: { xs: 'column', md: 'row' },
          gap: 1.5,
          mb: 2.5
        }}
      >
        <Box>
          <Typography variant="h5" sx={ps.pageTitle}>
            Centro de Operaciones
          </Typography>

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, flexWrap: 'wrap' }}>
            <Typography variant="body2" sx={ps.pageSubtitle}>
              Estado general del almacen - Ultima actualizacion: <b>{lastUpdatedLabel}</b>
            </Typography>

            <Chip
              size="small"
              label={socketOnline ? 'Realtime: Online' : 'Realtime: Offline'}
              sx={{
                ml: 1,
                fontWeight: 600,
                borderRadius: 1.5,
                bgcolor: socketOnline ? 'rgba(34,197,94,.12)' : 'rgba(244,63,94,.10)',
                border: `1px solid ${socketOnline ? 'rgba(34,197,94,.35)' : 'rgba(244,63,94,.35)'}`,
                color: socketOnline ? 'rgba(34,197,94,.95)' : 'rgba(244,63,94,.95)'
              }}
              variant="outlined"
            />

            <Chip
              size="small"
              label={`Operación: ${semaforoOperacion.label}`}
              sx={{
                fontWeight: 600,
                borderRadius: 1.5,
                bgcolor:
                  semaforoOperacion.tone === 'success' ? 'rgba(34,197,94,.12)' :
                  semaforoOperacion.tone === 'warning' ? 'rgba(245,158,11,.12)' :
                  semaforoOperacion.tone === 'danger' ? 'rgba(239,68,68,.12)' :
                  'rgba(59,130,246,.10)',
                border:
                  semaforoOperacion.tone === 'success' ? '1px solid rgba(34,197,94,.35)' :
                  semaforoOperacion.tone === 'warning' ? '1px solid rgba(245,158,11,.35)' :
                  semaforoOperacion.tone === 'danger' ? '1px solid rgba(239,68,68,.35)' :
                  '1px solid rgba(59,130,246,.25)',
                color:
                  semaforoOperacion.tone === 'success' ? 'rgba(34,197,94,.95)' :
                  semaforoOperacion.tone === 'warning' ? 'rgba(245,158,11,.95)' :
                  semaforoOperacion.tone === 'danger' ? 'rgba(248,113,113,.95)' :
                  'rgba(147,197,253,.95)'
              }}
              variant="outlined"
            />

            {isRefreshing && (
              <Chip
                size="small"
                label="Actualizando…"
                sx={{
                  fontWeight: 600,
                  borderRadius: 1.5,
                  bgcolor: 'rgba(59,130,246,.08)',
                  border: '1px solid rgba(59,130,246,.15)',
                  color: 'rgba(59,130,246,.90)'
                }}
                variant="outlined"
              />
            )}
          </Stack>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          <Stack direction="row" spacing={0.5} sx={{ display: { xs: 'none', sm: 'flex' } }}>
            {['HOY', '7D', '30D'].map((r) => (
              <Button
                key={r}
                size="small"
                variant={range === r ? 'contained' : 'outlined'}
                onClick={() => setRange(r)}
                sx={{ borderRadius: 2, minWidth: 60 }}
              >
                {r === 'HOY' ? 'Hoy' : r === '7D' ? '7 dias' : '30 dias'}
              </Button>
            ))}
          </Stack>

          <TooltipMUI title="Exportar dashboard a Excel">
            <span>
              <Button
                variant="outlined"
                startIcon={<DownloadIcon />}
                onClick={exportDashboardExcel}
                sx={{ borderRadius: 2 }}
              >
                Exportar Excel
              </Button>
            </span>
          </TooltipMUI>

          <TooltipMUI title={isAdmin ? 'Importar Excel (solo admin)' : 'Solo admin puede importar'}>
            <span>
              <Button
                variant="outlined"
                startIcon={<UploadFileIcon />}
                disabled={importing || !token || !isAdmin}
                onClick={() => fileRef.current?.click()}
                sx={{ borderRadius: 2 }}
              >
                Importar Excel
              </Button>
            </span>
          </TooltipMUI>

          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            style={{ display: 'none' }}
            onChange={(e) => doImportExcel(e.target.files?.[0])}
          />

          <TooltipMUI title="Actualizar">
            <span>
              <IconButton
                onClick={refresh}
                disabled={isRefreshing}
                sx={{
                  ...ps.actionBtn('primary'),
                  opacity: isRefreshing ? 0.65 : 1,
                }}
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </span>
          </TooltipMUI>
        </Stack>
      </Box>

      {(importing || isRefreshing) && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: 1.5 }}>
          <Typography sx={{ fontWeight: 600, mb: 1 }}>
            {importing ? 'Importando Excel...' : 'Actualizando dashboard...'}
          </Typography>
          <LinearProgress />
        </Paper>
      )}

      {importMsg && <Alert severity="success" sx={{ mb: 2 }}>{importMsg}</Alert>}
      {err && <Alert severity="warning" sx={{ mb: 2 }}>Dashboard cargo con fallas: {err}</Alert>}

      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatusMiniCard
            title="Ocupación"
            value={`${occupancyPct}%`}
            subtitle={`${occupied}/${total} ubicaciones`}
            icon={<WarehouseIcon fontSize="small" />}
            tone="info"
            progress={occupancyPct}
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatusMiniCard
            title="Entradas del día"
            value={entradasPallets}
            subtitle={`${entradasCamiones} operaciones de entrada`}
            icon={<TrendingUpIcon fontSize="small" />}
            tone="success"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatusMiniCard
            title="Salidas del día"
            value={salidasPallets}
            subtitle={`${salidasOrdenes} operaciones de salida`}
            icon={<LocalShippingIcon fontSize="small" />}
            tone="warning"
          />
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <StatusMiniCard
            title="Diferencial"
            value={diferencialTotal}
            subtitle={diferencialTotal < 0 ? 'Más salida que entrada' : 'Balance operativo'}
            icon={diferencialTotal < 0 ? <TrendingDownIcon fontSize="small" /> : <BalanceIcon fontSize="small" />}
            tone={diferencialTotal < 0 ? 'danger' : 'success'}
          />
        </Grid>
      </Grid>

      {/* ── Alertas Activas + Stock Bajo ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper
            elevation={0}
            sx={{
              ...ps.card,
              p: 2,
              border: '1px solid',
              borderColor: activeAlerts.length > 0 ? 'rgba(239,68,68,.25)' : 'rgba(34,197,94,.20)',
              cursor: 'pointer',
            }}
            onClick={() => setAlertsExpanded((prev) => !prev)}
          >
            <Stack direction="row" spacing={1.5} alignItems="center">
              <NotificationsActiveIcon
                sx={{
                  color: activeAlerts.length > 0 ? 'error.main' : 'success.main',
                  fontSize: 28,
                }}
              />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Alertas Activas
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 26, lineHeight: 1, color: 'text.primary' }}>
                  {activeAlerts.length}
                </Typography>
              </Box>
              {activeAlerts.length > 0 && (
                alertsExpanded
                  ? <ExpandLessIcon sx={{ color: 'text.secondary' }} />
                  : <ExpandMoreIcon sx={{ color: 'text.secondary' }} />
              )}
            </Stack>

            {alertsExpanded && activeAlerts.length > 0 && (
              <Stack spacing={0.8} sx={{ mt: 1.5 }}>
                {activeAlerts.slice(0, 5).map((a, idx) => (
                  <Paper
                    key={a._id || a.id || idx}
                    variant="outlined"
                    sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,.04)' }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <ErrorOutlineIcon sx={{ color: 'error.main', fontSize: 16 }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 700, flex: 1, color: 'text.primary' }}>
                        {a.message || a.title || a.type || 'Alerta'}
                      </Typography>
                      {a.type && (
                        <Chip size="small" label={a.type} sx={ps.metricChip('bad')} />
                      )}
                    </Stack>
                  </Paper>
                ))}
                {activeAlerts.length > 5 && (
                  <Typography
                    variant="caption"
                    sx={{ color: 'text.secondary', textAlign: 'center', cursor: 'pointer', fontWeight: 700 }}
                    onClick={(e) => { e.stopPropagation(); nav('/alertas') }}
                  >
                    Ver todas ({activeAlerts.length})
                  </Typography>
                )}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} sm={6} md={4}>
          <Paper elevation={0} sx={{ ...ps.card, p: 2, border: '1px solid', borderColor: lowStock.length > 0 ? 'rgba(245,158,11,.25)' : 'rgba(148,163,184,.15)' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: lowStock.length > 0 ? 1.5 : 0 }}>
              <Inventory2Icon sx={{ color: lowStock.length > 0 ? 'warning.main' : 'text.secondary', fontSize: 28 }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Stock Bajo
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 26, lineHeight: 1, color: 'text.primary' }}>
                  {lowStock.length}
                </Typography>
              </Box>
              {lowStock.length > 0 && (
                <Chip size="small" label="Requiere atencion" sx={ps.metricChip('warn')} />
              )}
            </Stack>

            {lowStock.length > 0 && (
              <Stack spacing={0.8}>
                {lowStock.slice(0, 3).map((item, idx) => (
                  <Paper
                    key={item.sku || item._id || idx}
                    variant="outlined"
                    sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(245,158,11,.04)', cursor: 'pointer' }}
                    onClick={() => nav('/inventario')}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 13, color: 'text.primary' }}>
                        {item.sku || item.name || 'SKU'}
                      </Typography>
                      <Chip
                        size="small"
                        label={`Qty: ${item.qty ?? item.quantity ?? item.currentStock ?? 0}`}
                        sx={ps.metricChip('warn')}
                      />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ ...ps.card, p: 2, border: '1px solid', borderColor: rackFull.length > 0 ? 'rgba(239,68,68,.25)' : 'rgba(148,163,184,.15)' }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: rackFull.length > 0 ? 1.5 : 0 }}>
              <WarehouseIcon sx={{ color: rackFull.length > 0 ? 'error.main' : 'text.secondary', fontSize: 28 }} />
              <Box sx={{ flex: 1 }}>
                <Typography sx={{ fontWeight: 600, fontSize: 12, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.3 }}>
                  Areas Criticas
                </Typography>
                <Typography sx={{ fontWeight: 700, fontSize: 26, lineHeight: 1, color: 'text.primary' }}>
                  {rackFull.length}
                </Typography>
                <Typography sx={{ fontSize: 12, color: 'text.secondary' }}>
                  Areas con &gt;90% ocupacion
                </Typography>
              </Box>
            </Stack>

            {rackFull.length > 0 && (
              <Stack spacing={0.8}>
                {rackFull.slice(0, 4).map((area, idx) => {
                  const pct = safeNum(area.occupancyPct ?? area.percentage ?? area.pct ?? 0)
                  return (
                    <Paper
                      key={area.area || area.name || area._id || idx}
                      variant="outlined"
                      sx={{ p: 1, borderRadius: 2, bgcolor: 'rgba(239,68,68,.04)', cursor: 'pointer' }}
                      onClick={() => nav('/racks')}
                    >
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: 13, color: 'text.primary' }}>
                          {area.area || area.name || 'Area'}
                        </Typography>
                        <Chip size="small" label={`${pct}%`} sx={ps.metricChip('bad')} />
                      </Stack>
                      <Box sx={ps.progressBar}>
                        <Box sx={ps.progressFill(pct, 'rgba(239,68,68,.65)')} />
                      </Box>
                    </Paper>
                  )
                })}
              </Stack>
            )}

            {rackFull.length === 0 && (
              <Typography sx={{ fontSize: 13, color: 'text.secondary', mt: 0.5 }}>
                Todas las areas dentro de limites normales.
              </Typography>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper elevation={0} sx={{ ...ps.card, mb: 2.5 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Grafica diferencial</Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={ps.cardHeaderSubtitle}>
            Diferencia entre entradas y salidas
          </Typography>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={8}>
              <Box sx={{ height: 280 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={diferencialData}>
                    <CartesianGrid stroke={gridStroke} strokeDasharray="4 6" vertical={false} />
                    <XAxis dataKey="name" stroke={axisStroke} tickLine={false} axisLine={{ stroke: gridStroke }} />
                    <YAxis stroke={axisStroke} tickLine={false} axisLine={{ stroke: gridStroke }} />
                    <Tooltip content={<ElegantTooltip />} />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {diferencialData.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={entry.value <= 0 ? '#DC2626' : '#16A34A'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </Grid>

            <Grid item xs={12} md={4}>
              <Stack spacing={1.2}>
                {diferencialData.map((item) => (
                  <Paper
                    key={item.name}
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      borderColor: item.value <= 0 ? 'error.light' : 'success.light',
                      bgcolor: item.value <= 0 ? 'rgba(220,38,38,.06)' : 'rgba(22,163,74,.06)'
                    }}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontWeight: 700 }}>
                        {item.name}
                      </Typography>
                      <Chip
                        size="small"
                        label={item.value}
                        color={item.value <= 0 ? 'error' : 'success'}
                      />
                    </Stack>
                  </Paper>
                ))}

                <Paper
                  variant="outlined"
                  sx={{
                    p: 1.2,
                    borderRadius: 2,
                    borderColor: 'rgba(59,130,246,.25)',
                    bgcolor: 'rgba(59,130,246,.06)'
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    <PlaylistAddCheckIcon color="primary" fontSize="small" />
                    <Typography sx={{ fontWeight: 700, fontSize: 13 }}>
                      Resumen
                    </Typography>
                  </Stack>
                  <Typography sx={{ mt: 1, fontSize: 13, color: 'text.secondary' }}>
                    {diferencialTotal < 0
                      ? 'La operación está sacando más pallets de los que entran.'
                      : 'La operación se mantiene estable o positiva en pallets.'}
                  </Typography>
                </Paper>
              </Stack>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Actividad reciente</Typography>
              <Box sx={{ flex: 1 }} />
              <Stack direction="row" spacing={1}>
                <Pill label={`${latest?.length || 0} recientes`} icon={<SwapHorizIcon fontSize="small" />} ps={ps} />
                <Pill label={`${orders?.length || 0} ordenes`} icon={<AssignmentIcon fontSize="small" />} ps={ps} />
              </Stack>
            </Box>

            <Box sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Últimos movimientos registrados. Rango visual: <b>{range === 'HOY' ? 'Hoy' : range === '7D' ? '7 dias' : '30 dias'}</b>
              </Typography>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1, color: 'text.primary' }}>
                Ultimos movimientos
              </Typography>

              <Stack spacing={1}>
                {latest.slice(0, 8).map(m => {
                  const typ = (m.type || 'MOV').toUpperCase()
                  const icon =
                    (typ === 'IN' || typ === 'ENTRADA') ? <CheckCircleIcon sx={{ fontSize: 16 }} /> :
                    (typ === 'OUT' || typ === 'SALIDA') ? <LocalShippingIcon sx={{ fontSize: 16 }} /> :
                    (typ === 'TRANSFER' || typ === 'TRANSFERENCIA') ? <SwapHorizIcon sx={{ fontSize: 16 }} /> :
                    (typ === 'ADJUST' || typ === 'AJUSTE') ? <BalanceIcon sx={{ fontSize: 16 }} /> :
                    <Inventory2Icon sx={{ fontSize: 16 }} />

                  return (
                    <Paper
                      key={m._id || m.id || `${m.type}-${m.createdAt}`}
                      variant="outlined"
                      sx={{
                        p: 1.2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'transform .12s ease, background .12s ease',
                        '&:hover': {
                          transform: 'translateY(-1px)',
                          bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)'
                        }
                      }}
                      onClick={() => nav('/movimientos')}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip
                          size="small"
                          icon={icon}
                          label={typ}
                          sx={movementTypeChipSx(typ)}
                        />
                        <Typography variant="body2" sx={{ fontWeight: 700, flex: 1, color: 'text.primary' }}>
                          {m.note || 'Movimiento'}
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                          {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                        </Typography>
                      </Stack>
                    </Paper>
                  )
                })}

                {!latest?.length && (
                  <Typography sx={ps.emptyText}>Sin movimientos recientes por ahora.</Typography>
                )}
              </Stack>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Panel operativo</Typography>
              <Box sx={{ flex: 1 }} />
              <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 20 }} />
            </Box>

            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                Datos que sí requieren atención o seguimiento.
              </Typography>

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Alertas / Pendientes
              </Typography>

              <Stack spacing={1} sx={{ mb: 2 }}>
                {alertsList.map((item) => (
                  <Paper
                    key={item.label}
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)'
                      }
                    }}
                    onClick={() => nav(item.to)}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      {item.icon}
                      <Typography sx={{ fontWeight: 700, flex: 1, fontSize: 13, color: 'text.primary' }}>
                        {item.label}
                      </Typography>
                      <Chip size="small" label={item.count} sx={ps.metricChip('default')} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Top SKUs
              </Typography>

              <Stack spacing={1} sx={{ mb: 2 }}>
                {top.slice(0, 5).map((t) => (
                  <Paper
                    key={t.sku}
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)'
                      }
                    }}
                    onClick={() => nav('/inventario')}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.primary' }}>
                        {t.sku}
                      </Typography>
                      <Chip size="small" label={t.totalQty ?? t.qty ?? 0} sx={ps.metricChip('info')} />
                    </Stack>
                  </Paper>
                ))}

                {!top?.length && <Typography sx={ps.emptyText}>Sin datos de Top SKUs por ahora.</Typography>}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                Ordenes recientes
              </Typography>

              <Stack spacing={1}>
                {orders.slice(0, 4).map(o => (
                  <Paper
                    key={o._id || o.id || o.orderNumber}
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)'
                      }
                    }}
                    onClick={() => nav('/ordenes')}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>
                        {o.orderNumber || 'ORD'}
                      </Typography>
                      <Chip size="small" label={o.status || '---'} sx={ps.statusChip(o.status || 'PENDIENTE')} />
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      {o.destinationType} {o.destinationRef ? `- ${o.destinationRef}` : ''}
                    </Typography>
                  </Paper>
                ))}

                {!orders?.length && <Typography sx={ps.emptyText}>Sin ordenes recientes por ahora.</Typography>}
              </Stack>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ── Atajos Operativos ── */}
      <Paper elevation={0} sx={{ ...ps.card, mt: 2.5 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Atajos Operativos</Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={ps.cardHeaderSubtitle}>Acceso directo a operaciones clave</Typography>
        </Box>

        <Box sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            {[
              { label: 'Nuevo Recibo', icon: <LocalShippingIcon />, to: '/recepcion', color: 'success' },
              { label: 'Nueva Orden', icon: <AddBoxIcon />, to: '/ordenes', color: 'primary' },
              { label: 'Ejecutar Conteo', icon: <FactCheckIcon />, to: '/conteos', color: 'warning' },
              { label: 'Ver Alertas', icon: <NotificationsActiveIcon />, to: '/alertas', color: 'error' },
            ].map((action) => (
              <Grid key={action.label} item xs={12} sm={6} md={3}>
                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={action.icon}
                  onClick={() => nav(action.to)}
                  sx={{
                    ...ps.actionBtn(action.color),
                    py: 1.5,
                    borderRadius: 2,
                    fontSize: 13,
                    fontWeight: 600,
                    textTransform: 'none',
                    justifyContent: 'center',
                  }}
                >
                  {action.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>
    </Box>
  )
}