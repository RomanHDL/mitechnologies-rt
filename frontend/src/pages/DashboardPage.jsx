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
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import PlaceIcon from '@mui/icons-material/Place'
import GridViewIcon from '@mui/icons-material/GridView'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import UploadFileIcon from '@mui/icons-material/UploadFile'

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

function KpiCard({ title, value, subtitle, children, accent = 'blue', onClick, ps }) {
  return (
    <Paper elevation={0} onClick={onClick} sx={ps.kpiCard(accent)}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: 12 }}>{title}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 800, mt: 0.5, letterSpacing: -0.5, color: 'text.primary' }}>{value}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary', mb: children ? 1 : 0 }}>{subtitle}</Typography>
      {children}
    </Paper>
  )
}

function Pill({ label, icon, ps }) {
  return (
    <Chip
      size="small"
      icon={icon}
      label={label}
      sx={ps.metricChip('info')}
      variant="outlined"
    />
  )
}

// ✅ lee role del JWT sin verificar (solo UI)
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

export default function DashboardPage() {
  const { token, user } = useAuth()
  const nav = useNavigate()
  const ps = usePageStyles()

  const [stats, setStats] = useState({ occupancyPct: 0, occupied: 0, total: 0, entradasHoy: 0, salidasHoy: 0 })
  const [series, setSeries] = useState([])
  const [top, setTop] = useState([])
  const [latest, setLatest] = useState([])
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState('')
  const [range, setRange] = useState('7D')
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  // ✅ Import Excel UI
  const fileRef = useRef(null)
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  // ✅ Admin detection robusto:
  const roleFromState = String(user?.role || '').toUpperCase()
  const roleFromToken = getRoleFromToken(token)
  const isAdmin = Boolean(
    user?.isAdmin === true ||
    roleFromState === 'ADMIN' ||
    roleFromToken === 'ADMIN'
  )

  const refresh = async () => {
    let alive = true

    const buildSeriesFromMovements = (movements) => {
      const base = (movements || []).slice(0, 24).reverse()
      if (base.length) {
        const map = {}
        base.forEach((m) => {
          const d = new Date(m.createdAt || Date.now())
          const key = `${d.getMonth() + 1}/${d.getDate()}`
          map[key] = (map[key] || 0) + 1
        })
        return Object.entries(map).map(([name, v]) => ({ name, v }))
      }
      return [
        { name: 'Lun', v: 3 }, { name: 'Mar', v: 5 }, { name: 'Mie', v: 2 },
        { name: 'Jue', v: 6 }, { name: 'Vie', v: 4 }, { name: 'Sab', v: 7 }, { name: 'Dom', v: 5 }
      ]
    }

    setErr('')
    try {
      const results = await Promise.allSettled([
        apiFetch('/api/dashboard'),
        apiFetch('/api/movements?limit=10'),
        apiFetch('/api/inventory/top?limit=5'),
        apiFetch('/api/orders'),
      ])

      const s = results[0].status === 'fulfilled' ? results[0].value : null
      const mov = results[1].status === 'fulfilled' ? results[1].value : null
      const inv = results[2].status === 'fulfilled' ? results[2].value : null
      const ord = results[3].status === 'fulfilled' ? results[3].value : null

      if (s) setStats(s)

      const movList = (mov?.data || mov || [])
      setLatest(movList)

      const invList = (inv?.data || inv || [])
      setTop(invList)

      const ordList = (ord?.data || ord || [])
      setOrders((ordList || []).slice(0, 6))

      setSeries(buildSeriesFromMovements(movList))

      const fails = results
        .map((r, idx) => ({ r, idx }))
        .filter(x => x.r.status === 'rejected')
        .map(x => x.r.reason?.message || `Fallo en endpoint #${x.idx + 1}`)

      if (fails.length && alive) setErr(fails.join(' | '))

      setLastUpdatedAt(new Date())
    } catch (e) {
      if (!alive) return
      setErr(e?.message || 'Error cargando dashboard')
    }

    return () => { alive = false }
  }

  // ✅ Socket.IO realtime
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

    socket.on('dashboard:update', onAnyUpdate)
    socket.on('palletDashboard:update', onAnyUpdate)
    socket.on('production:update', onAnyUpdate)

    socket.on('connect_error', () => {
      // no romper UI
    })

    return () => {
      socket.off('dashboard:update', onAnyUpdate)
      socket.off('palletDashboard:update', onAnyUpdate)
      socket.off('production:update', onAnyUpdate)
      socket.disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    let alive = true
    ;(async () => {
      await refresh()
      if (!alive) return
    })()
    return () => { alive = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  const occupancyPct = Number(stats.occupancyPct || 0)
  const blockedCount = Number(stats.bloqueadas || stats.blocked || 0)
  const alertsCount = blockedCount

  const lastUpdatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleString()
    : '---'

  const quickActions = [
    { label: 'Escanear', icon: <QrCodeScannerIcon fontSize="small" />, to: '/scan' },
    { label: 'Buscar Ubicacion', icon: <PlaceIcon fontSize="small" />, to: '/ubicaciones' },
    { label: 'Ver Racks', icon: <GridViewIcon fontSize="small" />, to: '/racks' },
    { label: 'Movimientos', icon: <SwapHorizIcon fontSize="small" />, to: '/movimientos' },
    { label: 'Ordenes', icon: <AssignmentIcon fontSize="small" />, to: '/ordenes' },
    { label: 'Produccion', icon: <PrecisionManufacturingIcon fontSize="small" />, to: '/produccion' },
  ]

  const doImportExcel = async (file) => {
    if (!file) return
    setImportMsg('')
    setErr('')
    setImporting(true)
    try {
      const resp = await apiUpload('/api/admin/import-excel', file)
      setImportMsg(`✅ Importado correctamente`)
      await refresh()
    } catch (e) {
      setErr(e?.message || 'Error importando Excel')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  return (
    <Box sx={ps.page}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: { xs: 'flex-start', md: 'flex-end' }, justifyContent: 'space-between', flexDirection: { xs: 'column', md: 'row' }, gap: 1.5, mb: 2.5 }}>
        <Box>
          <Typography variant="h5" sx={ps.pageTitle}>
            Centro de Operaciones
          </Typography>
          <Typography variant="body2" sx={ps.pageSubtitle}>
            Estado general del almacen - Ultima actualizacion: <b>{lastUpdatedLabel}</b>
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
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

          {/* ✅ Import Excel (solo admin - pero si no eres admin el backend igual bloquea) */}
          <TooltipMUI title={isAdmin ? "Importar Excel (solo admin)" : "Solo admin puede importar"}>
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
            <IconButton onClick={refresh} sx={ps.actionBtn('primary')}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </TooltipMUI>
        </Stack>
      </Box>

      {importing && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 2, p: 1.5 }}>
          <Typography sx={{ fontWeight: 800, mb: 1 }}>Importando Excel...</Typography>
          <LinearProgress />
        </Paper>
      )}

      {importMsg && <Alert severity="success" sx={{ mb: 2 }}>{importMsg}</Alert>}
      {err && <Alert severity="warning" sx={{ mb: 2 }}>Dashboard cargo con fallas: {err}</Alert>}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={12} sm={6} md={4}>
          <KpiCard
            title="Ocupacion del Almacen"
            value={`${occupancyPct}%`}
            subtitle={`${stats.occupied || 0} / ${stats.total || 0} ubicaciones ocupadas`}
            accent="blue"
            onClick={() => nav('/ubicaciones')}
            ps={ps}
          >
            <Box sx={{ mt: 1 }}>
              <Box sx={ps.progressBar}>
                <Box sx={ps.progressFill(occupancyPct)} />
              </Box>
              <Box sx={{ height: 80, mt: 1.5 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Area dataKey="v" strokeWidth={2} fillOpacity={0.20} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            </Box>
          </KpiCard>
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <KpiCard
            title="Entradas Hoy"
            value={`${stats.entradasHoy || 0}`}
            subtitle="Movimientos de tipo ENTRADA"
            accent="green"
            onClick={() => nav('/movimientos')}
            ps={ps}
          >
            <Box sx={{ height: 80 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={series}>
                  <XAxis dataKey="name" hide />
                  <YAxis hide />
                  <Tooltip />
                  <Bar dataKey="v" />
                </BarChart>
              </ResponsiveContainer>
            </Box>
          </KpiCard>
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <KpiCard title="Salidas Hoy" value={`${stats.salidasHoy || 0}`} subtitle="Movimientos de tipo SALIDA" accent="blue" onClick={() => nav('/movimientos')} ps={ps} />
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <KpiCard title="Ubicaciones Bloqueadas" value={`${blockedCount || 0}`} subtitle="Revisar mantenimiento / auditoria" accent="red" onClick={() => nav('/ubicaciones')} ps={ps} />
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <KpiCard title="Top SKUs (hoy)" value={`${top?.length || 0}`} subtitle="Mas inventario por SKU" accent="blue" onClick={() => nav('/inventario')} ps={ps} />
        </Grid>

        <Grid item xs={6} sm={6} md={4}>
          <KpiCard title="Alertas" value={`${alertsCount || 0}`} subtitle="Pendientes por validar" accent="amber" onClick={() => nav('/ubicaciones')} ps={ps} />
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2.5 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Acciones rapidas</Typography>
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={ps.cardHeaderSubtitle}>Para operador y admin</Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={1.5}>
            {quickActions.map((a) => (
              <Grid key={a.label} item xs={6} sm={4} md={2}>
                <Button
                  fullWidth
                  variant="outlined"
                  onClick={() => nav(a.to)}
                  startIcon={a.icon}
                  sx={{
                    borderRadius: 2.5,
                    py: 1.4,
                    justifyContent: 'flex-start',
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {a.label}
                </Button>
              </Grid>
            ))}
          </Grid>
        </Box>
      </Paper>

      {/* Main content 70/30 */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Actividad (Movimientos)</Typography>
              <Box sx={{ flex: 1 }} />
              <Stack direction="row" spacing={1}>
                <Pill label={`${latest?.length || 0} recientes`} icon={<SwapHorizIcon fontSize="small" />} ps={ps} />
                <Pill label={`${orders?.length || 0} ordenes`} icon={<AssignmentIcon fontSize="small" />} ps={ps} />
              </Stack>
            </Box>

            <Box sx={{ p: 2.5 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Movimientos diarios (segun datos recientes). Rango visual: <b>{range}</b>
              </Typography>

              <Box sx={{ height: 260 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="v" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1, color: 'text.primary' }}>
                Ultimos movimientos
              </Typography>

              <Stack spacing={1}>
                {latest.slice(0, 8).map(m => {
                  const typ = (m.type || 'MOV').toUpperCase()
                  const icon =
                    typ === 'ENTRADA' ? <CheckCircleIcon sx={{ fontSize: 16 }} /> :
                    typ === 'SALIDA' ? <SwapHorizIcon sx={{ fontSize: 16 }} /> :
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
                        '&:hover': { transform: 'translateY(-1px)', bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)' }
                      }}
                      onClick={() => nav('/movimientos')}
                    >
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" icon={icon} label={typ} sx={ps.statusChip(typ === 'ENTRADA' ? 'COMPLETADA' : 'PENDIENTE')} />
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
              </Stack>
            </Box>
          </Paper>
        </Grid>

        {/* Right column */}
        <Grid item xs={12} md={4}>
          {/* Alerts */}
          <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Alertas / Pendientes</Typography>
              <Box sx={{ flex: 1 }} />
              <WarningAmberIcon sx={{ color: 'warning.main', fontSize: 20 }} />
            </Box>

            <Box sx={{ p: 2 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1.5 }}>
                Acciones que requieren atencion.
              </Typography>

              <Stack spacing={1}>
                {[
                  { icon: <BlockIcon sx={{ color: 'error.main' }} fontSize="small" />, label: 'Ubicaciones bloqueadas', count: blockedCount || 0, to: '/ubicaciones' },
                  { icon: <AssignmentIcon color="primary" fontSize="small" />, label: 'Ordenes recientes', count: orders?.length || 0, to: '/ordenes' },
                  { icon: <Inventory2Icon color="primary" fontSize="small" />, label: 'Revisar inventario (Top SKUs)', count: top?.length || 0, to: '/inventario' },
                ].map((item) => (
                  <Paper
                    key={item.label}
                    variant="outlined"
                    sx={{
                      p: 1.2, borderRadius: 2, cursor: 'pointer',
                      '&:hover': { bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)' }
                    }}
                    onClick={() => nav(item.to)}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      {item.icon}
                      <Typography sx={{ fontWeight: 700, flex: 1, fontSize: 13, color: 'text.primary' }}>{item.label}</Typography>
                      <Chip size="small" label={item.count} sx={ps.metricChip('default')} />
                    </Stack>
                  </Paper>
                ))}
              </Stack>
            </Box>
          </Paper>

          {/* Top SKUs */}
          <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Top SKUs</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1}>
                {top.map((t) => (
                  <Paper
                    key={t.sku}
                    variant="outlined"
                    sx={{
                      p: 1.2, borderRadius: 2, cursor: 'pointer',
                      '&:hover': { bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)' }
                    }}
                    onClick={() => nav('/inventario')}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.primary' }}>{t.sku}</Typography>
                      <Chip size="small" label={t.totalQty} sx={ps.metricChip('info')} />
                    </Stack>
                  </Paper>
                ))}
                {!top?.length && <Typography sx={ps.emptyText}>Sin datos de Top SKUs por ahora.</Typography>}
              </Stack>
            </Box>
          </Paper>

          {/* Orders */}
          <Paper elevation={0} sx={ps.card}>
            <Box sx={ps.cardHeader}>
              <Typography sx={ps.cardHeaderTitle}>Ordenes de salida</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <Stack spacing={1}>
                {orders.map(o => (
                  <Paper
                    key={o._id || o.id || o.orderNumber}
                    variant="outlined"
                    sx={{
                      p: 1.2, borderRadius: 2, cursor: 'pointer',
                      '&:hover': { bgcolor: ps.isDark ? 'rgba(66,165,245,.04)' : 'rgba(21,101,192,.03)' }
                    }}
                    onClick={() => nav('/ordenes')}
                  >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'text.primary' }}>{o.orderNumber || 'ORD'}</Typography>
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
    </Box>
  )
}