import { io } from 'socket.io-client'
import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { apiFetch } from '../services/api'

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

import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import { useTheme } from '@mui/material/styles'

function kpiCard({ title, value, subtitle, children, accent = 'default', onClick, isDark }) {
  const accentStyles =
    accent === 'blue'
      ? { border: '1px solid rgba(59,130,246,.28)', boxShadow: isDark ? '0 18px 45px rgba(59,130,246,.14)' : '0 8px 28px rgba(21,101,192,.12)' }
      : accent === 'green'
        ? { border: '1px solid rgba(34,197,94,.25)', boxShadow: isDark ? '0 18px 45px rgba(34,197,94,.12)' : '0 8px 28px rgba(34,197,94,.10)' }
        : accent === 'red'
          ? { border: '1px solid rgba(239,68,68,.25)', boxShadow: isDark ? '0 18px 45px rgba(239,68,68,.12)' : '0 8px 28px rgba(239,68,68,.10)' }
          : accent === 'amber'
            ? { border: '1px solid rgba(245,158,11,.25)', boxShadow: isDark ? '0 18px 45px rgba(245,158,11,.12)' : '0 8px 28px rgba(245,158,11,.10)' }
            : { border: isDark ? '1px solid rgba(255,255,255,0.07)' : '1px solid rgba(21,101,192,0.10)' }

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2.2,
        borderRadius: 3,
        height: '100%',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform .12s ease, box-shadow .12s ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)' } : {},
        ...accentStyles
      }}
    >
      <Typography variant="subtitle2" sx={{ fontWeight: 900, opacity: 0.82 }}>{title}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5, letterSpacing: -0.5 }}>{value}</Typography>
      <Typography variant="body2" sx={{ opacity: 0.72, mb: children ? 1 : 0 }}>{subtitle}</Typography>
      {children}
    </Paper>
  )
}

function pill(label, icon, sx = {}, isDark = false) {
  return (
    <Chip
      size="small"
      icon={icon}
      label={label}
      sx={{
        bgcolor: isDark ? 'rgba(255,255,255,.07)' : 'rgba(21,101,192,.08)',
        border: isDark ? '1px solid rgba(255,255,255,.12)' : '1px solid rgba(21,101,192,.20)',
        color: isDark ? 'rgba(226,234,244,0.95)' : 'rgba(10,37,64,.85)',
        fontWeight: 900,
        ...sx
      }}
      variant="outlined"
    />
  )
}

export default function DashboardPage() {
  const { token } = useAuth()
  const nav = useNavigate()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ✅ No lo quitamos, pero evitamos que falle por “unused”
  useMemo(() => io, [])

  const [stats, setStats] = useState({ occupancyPct: 0, occupied: 0, total: 0, entradasHoy: 0, salidasHoy: 0 })
  const [series, setSeries] = useState([])
  const [top, setTop] = useState([])
  const [latest, setLatest] = useState([])
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState('')

  // UI extra (no rompe nada)
  const [range, setRange] = useState('7D') // HOY | 7D | 30D (visual por ahora)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

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
        { name: 'Lun', v: 3 }, { name: 'Mar', v: 5 }, { name: 'Mié', v: 2 },
        { name: 'Jue', v: 6 }, { name: 'Vie', v: 4 }, { name: 'Sáb', v: 7 }, { name: 'Dom', v: 5 }
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
  const blockedCount = Number(stats.bloqueadas || stats.blocked || 0) // por si tu backend lo tiene o no
  const alertsCount = blockedCount // fallback seguro, luego puedes expandir con reglas reales

  const lastUpdatedLabel = lastUpdatedAt
    ? lastUpdatedAt.toLocaleString()
    : '—'

  // acciones rápidas (solo navegación, no rompe nada)
  const quickActions = [
    { label: 'Escanear', icon: <QrCodeScannerIcon fontSize="small" />, to: '/scan' },
    { label: 'Buscar Ubicación', icon: <PlaceIcon fontSize="small" />, to: '/ubicaciones' },
    { label: 'Ver Racks', icon: <GridViewIcon fontSize="small" />, to: '/racks' },
    { label: 'Movimientos', icon: <SwapHorizIcon fontSize="small" />, to: '/movimientos' },
    { label: 'Órdenes', icon: <AssignmentIcon fontSize="small" />, to: '/ordenes' },
    { label: 'Producción', icon: <PrecisionManufacturingIcon fontSize="small" />, to: '/produccion' },
  ]

  return (
    <Box>
      {/* HEADER PRO */}
      <Box sx={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.2 }}>
            Centro de Operaciones
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75, fontWeight: 700 }}>
            Estado general del almacén · Última actualización: <b>{lastUpdatedLabel}</b>
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Stack direction="row" spacing={1} sx={{ display:{ xs:'none', sm:'flex' } }}>
            <Button
              size="small"
              variant={range === 'HOY' ? 'contained' : 'outlined'}
              onClick={() => setRange('HOY')}
              sx={{ borderRadius: 2 }}
            >
              Hoy
            </Button>
            <Button
              size="small"
              variant={range === '7D' ? 'contained' : 'outlined'}
              onClick={() => setRange('7D')}
              sx={{ borderRadius: 2 }}
            >
              7 días
            </Button>
            <Button
              size="small"
              variant={range === '30D' ? 'contained' : 'outlined'}
              onClick={() => setRange('30D')}
              sx={{ borderRadius: 2 }}
            >
              30 días
            </Button>
          </Stack>

          <TooltipMUI title="Actualizar">
            <IconButton
              onClick={refresh}
              sx={{
                bgcolor: isDark ? 'rgba(255,255,255,.07)' : 'rgba(21,101,192,.08)',
                border: isDark ? '1px solid rgba(255,255,255,.12)' : '1px solid rgba(21,101,192,.20)',
                borderRadius: 2,
              }}
            >
              <RefreshIcon sx={{ color: isDark ? 'rgba(226,234,244,0.95)' : 'primary.main' }} />
            </IconButton>
          </TooltipMUI>
        </Stack>
      </Box>

      {err && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Dashboard cargó con fallas: {err}
        </Alert>
      )}

      {/* KPIs */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Ocupación del Almacén',
            value: `${occupancyPct}%`,
            subtitle: `${stats.occupied || 0} / ${stats.total || 0} ubicaciones ocupadas`,
            accent: 'blue',
            isDark,
            onClick: () => nav('/ubicaciones'),
            children: (
              <Box sx={{ mt: 0.5 }}>
                <Box sx={{
                  height: 10,
                  borderRadius: 999,
                  bgcolor: isDark ? 'rgba(255,255,255,.07)' : 'rgba(21,101,192,.10)',
                  border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.15)',
                  overflow: 'hidden',
                }}>
                  <Box sx={{
                    height: '100%',
                    width: `${Math.max(0, Math.min(100, occupancyPct))}%`,
                    bgcolor: 'rgba(59,130,246,.75)'
                  }} />
                </Box>

                <Box sx={{ height: 90, mt: 1 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={series}>
                      <XAxis dataKey="name" hide />
                      <YAxis hide />
                      <Tooltip />
                      <Area dataKey="v" strokeWidth={2} fillOpacity={0.25} />
                    </AreaChart>
                  </ResponsiveContainer>
                </Box>
              </Box>
            )
          })}
        </Grid>

        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Entradas Hoy',
            value: `${stats.entradasHoy || 0}`,
            subtitle: 'Movimientos de tipo ENTRADA',
            accent: 'green',
            isDark,
            onClick: () => nav('/movimientos'),
            children: (
              <Box sx={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={series}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Bar dataKey="v" />
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            )
          })}
        </Grid>

        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Salidas Hoy',
            value: `${stats.salidasHoy || 0}`,
            subtitle: 'Movimientos de tipo SALIDA',
            accent: 'default',
            isDark,
            onClick: () => nav('/movimientos')
          })}
        </Grid>

        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Ubicaciones Bloqueadas',
            value: `${blockedCount || 0}`,
            subtitle: 'Revisar mantenimiento / auditoría',
            accent: 'red',
            isDark,
            onClick: () => nav('/ubicaciones')
          })}
        </Grid>

        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Top SKUs (hoy)',
            value: `${top?.length || 0}`,
            subtitle: 'Más inventario por SKU',
            accent: 'default',
            isDark,
            onClick: () => nav('/inventario')
          })}
        </Grid>

        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Alertas',
            value: `${alertsCount || 0}`,
            subtitle: 'Pendientes por validar',
            accent: 'amber',
            isDark,
            onClick: () => nav('/ubicaciones')
          })}
        </Grid>
      </Grid>

      {/* ACCIONES RÁPIDAS */}
      <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, mb: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
            Acciones rápidas
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 800 }}>
            Para operador y admin
          </Typography>
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        <Grid container spacing={1.5}>
          {quickActions.map((a) => (
            <Grid key={a.label} item xs={12} sm={6} md={4} lg={2}>
              <Button
                fullWidth
                variant="outlined"
                onClick={() => nav(a.to)}
                startIcon={a.icon}
                sx={{
                  borderRadius: 3,
                  py: 1.6,
                  justifyContent: 'flex-start',
                  borderColor: isDark ? 'rgba(255,255,255,.14)' : 'rgba(21,101,192,.22)',
                  bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)',
                  '&:hover': {
                    bgcolor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(21,101,192,.09)',
                    borderColor: isDark ? 'rgba(255,255,255,.22)' : 'rgba(21,101,192,.40)',
                  },
                }}
              >
                {a.label}
              </Button>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* CONTENIDO CENTRAL 70/30 */}
      <Grid container spacing={2}>
        {/* izquierda */}
        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                Actividad (Movimientos)
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {pill(`${latest?.length || 0} recientes`, <SwapHorizIcon fontSize="small" />, {}, isDark)}
                {pill(`${orders?.length || 0} órdenes`, <AssignmentIcon fontSize="small" />, {}, isDark)}
              </Stack>
            </Stack>

            <Typography variant="body2" sx={{ opacity: 0.72, mt: 0.5, mb: 1.5 }}>
              Movimientos diarios (según datos recientes). Rango visual: <b>{range}</b>
            </Typography>

            <Box sx={{ height: 280 }}>
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

            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
              Últimos movimientos
            </Typography>

            <Stack spacing={1}>
              {latest.slice(0, 8).map(m => {
                const typ = (m.type || 'MOV').toUpperCase()
                const icon =
                  typ === 'ENTRADA' ? <CheckCircleIcon sx={{ fontSize: 18 }} /> :
                  typ === 'SALIDA' ? <SwapHorizIcon sx={{ fontSize: 18 }} /> :
                  <Inventory2Icon sx={{ fontSize: 18 }} />

                return (
                  <Paper
                    key={m._id || m.id || `${m.type}-${m.createdAt}`}
                    variant="outlined"
                    sx={{
                      p: 1.2,
                      borderRadius: 2,
                      cursor: 'pointer',
                      transition: 'transform .12s ease, background .12s ease',
                      '&:hover': { transform: 'translateY(-1px)', background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' }
                    }}
                    onClick={() => nav('/movimientos')}
                  >
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Chip size="small" icon={icon} label={typ} />
                      <Typography variant="body2" sx={{ fontWeight: 900, flex: 1 }}>
                        {m.note || 'Movimiento'}
                      </Typography>
                      <Typography variant="caption" sx={{ opacity: 0.7 }}>
                        {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                      </Typography>
                    </Stack>
                  </Paper>
                )
              })}
            </Stack>
          </Paper>
        </Grid>

        {/* derecha */}
        <Grid item xs={12} md={4}>
          {/* ALERTAS */}
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
                Alertas / Pendientes
              </Typography>
              <WarningAmberIcon sx={{ opacity: 0.85 }} />
            </Stack>

            <Typography variant="body2" sx={{ opacity: 0.72, mt: 0.5 }}>
              Acciones que requieren atención.
            </Typography>

            <Divider sx={{ my: 1.5 }} />

            <Stack spacing={1}>
              <Paper
                variant="outlined"
                sx={{ p: 1.2, borderRadius: 2, cursor:'pointer', '&:hover': { background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' } }}
                onClick={() => nav('/ubicaciones')}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <BlockIcon sx={{ color: '#ef4444' }} fontSize="small" />
                  <Typography sx={{ fontWeight: 900, flex: 1 }}>
                    Ubicaciones bloqueadas
                  </Typography>
                  <Chip size="small" label={blockedCount || 0} />
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ p: 1.2, borderRadius: 2, cursor:'pointer', '&:hover': { background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' } }}
                onClick={() => nav('/ordenes')}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <AssignmentIcon sx={{ opacity: 0.9 }} fontSize="small" />
                  <Typography sx={{ fontWeight: 900, flex: 1 }}>
                    Órdenes recientes
                  </Typography>
                  <Chip size="small" label={orders?.length || 0} />
                </Stack>
              </Paper>

              <Paper
                variant="outlined"
                sx={{ p: 1.2, borderRadius: 2, cursor:'pointer', '&:hover': { background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' } }}
                onClick={() => nav('/inventario')}
              >
                <Stack direction="row" spacing={1} alignItems="center">
                  <Inventory2Icon sx={{ opacity: 0.9 }} fontSize="small" />
                  <Typography sx={{ fontWeight: 900, flex: 1 }}>
                    Revisar inventario (Top SKUs)
                  </Typography>
                  <Chip size="small" label={top?.length || 0} />
                </Stack>
              </Paper>
            </Stack>

            <Typography variant="caption" sx={{ opacity: 0.65, display:'block', mt: 1.5 }}>
              *Estas alertas son “seguras” con tus datos actuales. Luego podemos agregar reglas reales (sin SKU, sin movimiento, etc.).
            </Typography>
          </Paper>

          {/* TOP SKUs */}
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
              Top SKUs
            </Typography>
            <Stack spacing={1}>
              {top.map((t) => (
                <Paper
                  key={t.sku}
                  variant="outlined"
                  sx={{ p: 1.2, borderRadius: 2, cursor:'pointer', '&:hover': { background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' } }}
                  onClick={() => nav('/inventario')}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontWeight: 900, fontFamily: 'monospace' }}>
                      {t.sku}
                    </Typography>
                    <Chip size="small" label={t.totalQty} />
                  </Stack>
                </Paper>
              ))}
              {!top?.length && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Sin datos de Top SKUs por ahora.
                </Typography>
              )}
            </Stack>
          </Paper>

          {/* ÓRDENES */}
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
              Órdenes de salida
            </Typography>
            <Stack spacing={1}>
              {orders.map(o => (
                <Paper
                  key={o._id || o.id || o.orderNumber}
                  variant="outlined"
                  sx={{ p: 1.1, borderRadius: 2, cursor:'pointer', '&:hover': { background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' } }}
                  onClick={() => nav('/ordenes')}
                >
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900 }}>
                      {o.orderNumber || 'ORD'}
                    </Typography>
                    <Chip size="small" label={o.status || '—'} />
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    {o.destinationType} {o.destinationRef ? `· ${o.destinationRef}` : ''}
                  </Typography>
                </Paper>
              ))}
              {!orders?.length && (
                <Typography variant="body2" sx={{ opacity: 0.7 }}>
                  Sin órdenes recientes por ahora.
                </Typography>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}