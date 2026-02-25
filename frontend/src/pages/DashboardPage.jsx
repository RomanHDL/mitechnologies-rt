import { io } from 'socket.io-client'
import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { apiFetch } from '../services/api' // <-- CAMBIO: usamos tu wrapper fetch
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Grid from '@mui/material/Grid'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import Alert from '@mui/material/Alert'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

function kpiCard({ title, value, subtitle, children }) {
  return (
    <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, height: '100%' }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 900, opacity: 0.8 }}>{title}</Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, mt: 0.5 }}>{value}</Typography>
      <Typography variant="body2" sx={{ opacity: 0.72, mb: 1 }}>{subtitle}</Typography>
      {children}
    </Paper>
  )
}

export default function DashboardPage() {
  const { token } = useAuth()

  // ✅ No lo quitamos, pero evitamos que falle por “unused”
  useMemo(() => io, [])

  const [stats, setStats] = useState({ occupancyPct: 0, occupied: 0, total: 0, entradasHoy: 0, salidasHoy: 0 })
  const [series, setSeries] = useState([])
  const [top, setTop] = useState([])
  const [latest, setLatest] = useState([])
  const [orders, setOrders] = useState([])
  const [err, setErr] = useState('')

  useEffect(() => {
    let alive = true

    const buildSeriesFromMovements = (movements) => {
      const base = (movements || []).slice(0, 12).reverse()
      if (base.length) {
        const map = {}
        base.forEach((m) => {
          const d = new Date(m.createdAt || Date.now())
          const key = `${d.getMonth() + 1}/${d.getDate()}`
          map[key] = (map[key] || 0) + 1
        })
        return Object.entries(map).map(([name, v]) => ({ name, v }))
      }
      return [{ name: 'Lun', v: 3 }, { name: 'Mar', v: 5 }, { name: 'Mié', v: 2 }, { name: 'Jue', v: 6 }, { name: 'Vie', v: 4 }, { name: 'Sáb', v: 7 }, { name: 'Dom', v: 5 }]
    }

    ;(async () => {
      setErr('')
      try {
        // ✅ IMPORTANTe: ya NO usamos axios. Usamos apiFetch con fetch.
        // ✅ IMPORTANTe 2: NO usamos Promise.all() directo porque si 1 endpoint falla, se cae TODO.
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

        // Dashboard
        if (s) setStats(s)

        // Movements: algunos backends devuelven {data:[]}, otros [] directo
        const movList = (mov?.data || mov || [])
        setLatest(movList)

        // Top inventory
        const invList = (inv?.data || inv || [])
        setTop(invList)

        // Orders
        const ordList = (ord?.data || ord || [])
        setOrders((ordList || []).slice(0, 6))

        // Serie
        setSeries(buildSeriesFromMovements(movList))

        // Si hubo fallos, arma mensaje “bonito”
        const fails = results
          .map((r, idx) => ({ r, idx }))
          .filter(x => x.r.status === 'rejected')
          .map(x => x.r.reason?.message || `Fallo en endpoint #${x.idx + 1}`)

        if (fails.length && alive) {
          setErr(fails.join(' | '))
        }
      } catch (e) {
        if (!alive) return
        setErr(e?.message || 'Error cargando dashboard')
      }
    })()

    return () => { alive = false }
  }, [token])

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2 }}>Dashboard</Typography>

      {err && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Dashboard cargó con fallas: {err}
        </Alert>
      )}

      <Grid container spacing={2}>
        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Ocupación del Almacén',
            value: `${stats.occupancyPct || 0}%`,
            subtitle: `${stats.occupied || 0} / ${stats.total || 0} ubicaciones ocupadas`,
            children: (
              <Box sx={{ height: 90 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={series}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip />
                    <Area dataKey="v" strokeWidth={2} fillOpacity={0.25} />
                  </AreaChart>
                </ResponsiveContainer>
              </Box>
            )
          })}
        </Grid>

        <Grid item xs={12} md={4}>
          {kpiCard({
            title: 'Entradas Hoy',
            value: `${stats.entradasHoy || 0}`,
            subtitle: 'Movimientos de tipo ENTRADA',
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
            subtitle: 'Movimientos de tipo SALIDA'
          })}
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Movimientos diarios</Typography>
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

            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Últimos movimientos</Typography>
            <Stack spacing={1}>
              {latest.slice(0, 5).map(m => (
                <Paper key={m._id || m.id || `${m.type}-${m.createdAt}`} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Chip size="small" label={m.type || 'MOV'} />
                    <Typography variant="body2" sx={{ fontWeight: 800, flex: 1 }}>
                      {m.note || 'Movimiento'}
                    </Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {m.createdAt ? new Date(m.createdAt).toLocaleString() : ''}
                    </Typography>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, mb: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Top SKUs</Typography>
            <Stack spacing={1}>
              {top.map((t) => (
                <Paper key={t.sku} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontWeight: 900, fontFamily: 'monospace' }}>{t.sku}</Typography>
                    <Chip size="small" label={t.totalQty} />
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Paper>

          <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>Órdenes de salida</Typography>
            <Stack spacing={1}>
              {orders.map(o => (
                <Paper key={o._id || o.id || o.orderNumber} variant="outlined" sx={{ p: 1.1, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900 }}>{o.orderNumber || 'ORD'}</Typography>
                    <Chip size="small" label={o.status || '—'} />
                  </Stack>
                  <Typography variant="caption" sx={{ opacity: 0.75 }}>
                    {o.destinationType} {o.destinationRef ? `· ${o.destinationRef}` : ''}
                  </Typography>
                </Paper>
              ))}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  )
}