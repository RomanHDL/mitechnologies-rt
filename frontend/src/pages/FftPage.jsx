import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { useAuth } from '../state/auth'
import { socket } from '../lib/socket'
import { useTheme } from '@mui/material/styles'
import { usePageStyles } from '../ui/pageStyles'
import dayjs from 'dayjs'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'
import Tooltip from '@mui/material/Tooltip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import IconButton from '@mui/material/IconButton'
import Popover from '@mui/material/Popover'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import CloseIcon from '@mui/icons-material/Close'
import InventoryIcon from '@mui/icons-material/Inventory2Outlined'
import BlockIcon from '@mui/icons-material/BlockOutlined'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PercentIcon from '@mui/icons-material/Percent'
import StorageIcon from '@mui/icons-material/StorageOutlined'

function cellColor(state, isDark = false) {
  if (state === 'BLOQUEADO') return isDark ? '#3b0a0a' : 'rgba(239,68,68,.10)'
  if (state === 'OCUPADO') return isDark ? '#083a1f' : 'rgba(34,197,94,.12)'
  return isDark ? '#111827' : 'rgba(21,101,192,.05)'
}
function cellBorder(state, isDark = false) {
  if (state === 'BLOQUEADO') return '1px solid rgba(239,68,68,.35)'
  if (state === 'OCUPADO') return '1px solid rgba(34,197,94,.35)'
  return isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.15)'
}

// Mapeo UI Profesional (NO rompe DB)
// DB: A1..A4
// UI: Incoming/Sorting/FFT/OpenCell
const AREAS = [
  { db: 'A1', label: 'Incoming' },
  { db: 'A2', label: 'Sorting' },
  { db: 'A3', label: 'FFT' },
  { db: 'A4', label: 'OpenCell' },
]

// Sub-areas (ejemplo profesional).
// Aqui puedes ajustar nombres exactos sin tocar BD: solo cambia strings.
const SUBAREAS_BY_AREA = {
  A1: ['Recepcion', 'Calidad', 'Staging'],
  A2: ['Clasificacion', 'Re-etiquetado', 'Rework'],
  A3: ['Accesorios', 'Picking', 'Empaque'],
  A4: ['OpenCell', 'Buffer', 'Auditoria'],
}

function isFftAccesorios(areaDb, subarea) {
  return areaDb === 'A3' && String(subarea || '').toLowerCase() === 'accesorios'
}

// Construye el string que se guarda/consulta en DB en subarea.
// (lo dejamos claro y consistente)
function buildSubareaKey(areaDb, subarea) {
  const areaLabel = AREAS.find(a => a.db === areaDb)?.label || areaDb
  // Ej: "FFT > Accesorios"
  return `${areaLabel} > ${subarea}`
}

function fmtDate(raw) {
  if (!raw) return '--'
  const d = dayjs(raw)
  return d.isValid() ? d.format('DD/MM/YYYY HH:mm') : String(raw)
}

export default function FftPage() {
  const { token } = useAuth()
  const client = useMemo(() => api(token), [token])
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const ps = usePageStyles()

  // selector principal
  const [areaDb, setAreaDb] = useState('A3') // FFT por default
  const [subarea, setSubarea] = useState('Accesorios')

  // datos
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('TODOS') // TODOS | VACIO | OCUPADO | BLOQUEADO
  const [selected, setSelected] = useState(null)

  // normal grid bins
  const [locs, setLocs] = useState([])

  // especial FFT accesorios (H1..H5)
  const [heights, setHeights] = useState([])

  // area comparison data
  const [areaStats, setAreaStats] = useState({})

  // block/unblock dialog
  const [blockDialog, setBlockDialog] = useState(null) // { id, action: 'block'|'unblock' }
  const [blockReason, setBlockReason] = useState('')
  const [blockLoading, setBlockLoading] = useState(false)

  // popover for quick detail on occupied cells
  const [popoverAnchor, setPopoverAnchor] = useState(null)
  const [popoverData, setPopoverData] = useState(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setSelected(null)

      if (isFftAccesorios(areaDb, subarea)) {
        // Caso especial "estantes por altura"
        const res = await client.get('/api/locations/fft/accesorios', { params: { area: areaDb } })
        setHeights(res.data?.heights || [])
        setLocs([])
      } else {
        // Caso normal: grid de bins por subarea
        const subareaKey = buildSubareaKey(areaDb, subarea)
        const res = await client.get('/api/locations/bins', { params: { area: areaDb, subarea: subareaKey } })
        setLocs(res.data?.locations || [])
        setHeights([])
      }
    } finally {
      setLoading(false)
    }
  }, [areaDb, subarea, client])

  // Load area comparison stats
  const loadAreaStats = useCallback(async () => {
    try {
      const res = await client.get('/api/locations', { params: {} })
      const all = res.data?.locations || res.data || []
      const byArea = {}
      for (const a of AREAS) {
        const areaLocs = Array.isArray(all) ? all.filter(l => l.area === a.db) : []
        let ocu = 0, bloq = 0, total = areaLocs.length
        for (const l of areaLocs) {
          const st = l?.state || 'VACIO'
          if (st === 'OCUPADO') ocu++
          else if (st === 'BLOQUEADO') bloq++
        }
        byArea[a.db] = { total, ocupadas: ocu, bloqueadas: bloq, pct: total ? Math.round((ocu / total) * 100) : 0 }
      }
      setAreaStats(byArea)
    } catch {
      // silently fail - area comparison is supplementary
    }
  }, [client])

  useEffect(() => {
    // si cambias area, setea subarea default de esa area
    const list = SUBAREAS_BY_AREA[areaDb] || []
    if (!list.includes(subarea)) setSubarea(list[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaDb])

  useEffect(() => { load() }, [areaDb, subarea, load]) // recarga cuando cambia seleccion
  useEffect(() => { loadAreaStats() }, [loadAreaStats])

  // Tiempo real: escuchamos cualquier update y recargamos (no rompe tu socket)
  useEffect(() => {
    const onAnyUpdate = () => { load(); loadAreaStats() }
    socket.on('rack:update', onAnyUpdate) // si ya emites esto, funciona
    socket.on('location:update', onAnyUpdate) // si en el futuro lo agregas, tambien
    return () => {
      socket.off('rack:update', onAnyUpdate)
      socket.off('location:update', onAnyUpdate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaDb, subarea])

  const matchesFilter = (state) => {
    if (filter === 'TODOS') return true
    if (filter === 'VACIO') return state === 'VACIO'
    return state === filter
  }

  const stats = useMemo(() => {
    const list = heights.length ? heights.map(h => ({ state: h.state })) : locs
    let ocupadas = 0, bloqueadas = 0, vacias = 0
    for (const x of list) {
      const st = x?.state || 'VACIO'
      if (st === 'OCUPADO') ocupadas++
      else if (st === 'BLOQUEADO') bloqueadas++
      else vacias++
    }
    const cap = list.length || 0
    const pct = cap ? Math.round((ocupadas / cap) * 100) : 0
    return { ocupadas, bloqueadas, vacias, pct, cap }
  }, [locs, heights])

  const headerTitle = useMemo(() => {
    const areaLabel = AREAS.find(a => a.db === areaDb)?.label || areaDb
    if (isFftAccesorios(areaDb, subarea)) return `${areaLabel} > ${subarea} (Estantes)`
    return `${areaLabel} > ${subarea} (BINs)`
  }, [areaDb, subarea])

  // Block / Unblock handlers
  const handleBlock = async () => {
    if (!blockDialog) return
    setBlockLoading(true)
    try {
      if (blockDialog.action === 'block') {
        await client.patch(`/api/locations/${blockDialog.id}/block`, { reason: blockReason || 'Bloqueado manualmente' })
      } else {
        await client.patch(`/api/locations/${blockDialog.id}/unblock`)
      }
      setBlockDialog(null)
      setBlockReason('')
      load()
      loadAreaStats()
    } catch {
      // keep dialog open on error
    } finally {
      setBlockLoading(false)
    }
  }

  // Handle cell click - select + popover for occupied cells
  const handleCellClick = (e, key, item, mode) => {
    setSelected({ key, data: item, mode })
    const state = item?.state || 'VACIO'
    if (state === 'OCUPADO' && item?.pallet) {
      setPopoverAnchor(e.currentTarget)
      setPopoverData({ key, data: item })
    }
  }

  const handlePopoverClose = () => {
    setPopoverAnchor(null)
    setPopoverData(null)
  }

  // =========================
  // Area tab label with badge
  // =========================
  const areaTabLabel = (a) => {
    const st = areaStats[a.db]
    if (st && st.total > 0) return `${a.db} - ${a.label} (${st.ocupadas}/${st.total})`
    return `${a.db} - ${a.label}`
  }

  // =========================
  // UI Helpers (tarjetas)
  // =========================
  const renderBinCard = (item, key) => {
    const state = item?.state || 'VACIO'
    const dim = !matchesFilter(state)
    const isSel = selected?.key === key

    const code = item?.code || item?.id || key
    const palletCode = item?.pallet?.code || item?.palletCode || null
    const truncatedPallet = palletCode && palletCode.length > 12 ? palletCode.slice(0, 12) + '...' : palletCode

    return (
      <Box
        key={key}
        onClick={(e) => handleCellClick(e, key, item, 'BIN')}
        role="button"
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          p: 1.3,
          borderRadius: 2,
          border: isSel ? '2px solid rgba(59,130,246,.75)' : cellBorder(state, isDark),
          bgcolor: cellColor(state, isDark),
          opacity: dim ? 0.35 : 1,
          transition: 'transform .08s ease, box-shadow .15s ease',
          '&:hover': { transform: dim ? 'none' : 'translateY(-1px)', boxShadow: dim ? 'none' : '0 10px 25px rgba(0,0,0,.25)' }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {code}
            </Typography>

            {state === 'OCUPADO' && palletCode && (
              <Tooltip title={palletCode} arrow placement="top">
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a7f3d0' : '#1b5e20', mt: .2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140 }}>
                  {truncatedPallet}
                </Typography>
              </Tooltip>
            )}

            <Typography sx={{ opacity: .65, fontSize: 11, mt: .2 }}>
              {fmtDate(item?.lastMoveAt)}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={state}
            sx={{
              bgcolor: state === 'OCUPADO' ? 'rgba(34,197,94,.18)' : state === 'BLOQUEADO' ? 'rgba(239,68,68,.16)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
              color: state === 'OCUPADO' ? (isDark ? '#a7f3d0' : '#1b5e20') : state === 'BLOQUEADO' ? (isDark ? '#fca5a5' : '#b71c1c') : (isDark ? '#e5e7eb' : '#1565C0'),
              border: state === 'OCUPADO' ? '1px solid rgba(34,197,94,.28)' : state === 'BLOQUEADO' ? '1px solid rgba(239,68,68,.28)' : (isDark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(21,101,192,.20)'),
              fontWeight: 900,
            }}
          />
        </Stack>
      </Box>
    )
  }

  const renderHeightCard = (h, idx) => {
    const state = h?.state || 'VACIO'
    const dim = !matchesFilter(state)
    const key = h.height || `H${idx + 1}`
    const isSel = selected?.key === key

    const palletCode = h?.pallet?.code || h?.code || null
    const truncatedPallet = palletCode && palletCode.length > 16 ? palletCode.slice(0, 16) + '...' : palletCode
    const sku = h?.pallet?.sku || null
    const qty = h?.pallet?.qty || null

    return (
      <Box
        key={key}
        onClick={(e) => handleCellClick(e, key, h, 'HEIGHT')}
        role="button"
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          p: 1.3,
          borderRadius: 2,
          border: isSel ? '2px solid rgba(59,130,246,.75)' : cellBorder(state, isDark),
          bgcolor: cellColor(state, isDark),
          opacity: dim ? 0.35 : 1,
          transition: 'transform .08s ease, box-shadow .15s ease',
          '&:hover': { transform: dim ? 'none' : 'translateY(-1px)', boxShadow: dim ? 'none' : '0 10px 25px rgba(0,0,0,.25)' }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography sx={{ fontWeight: 900 }}>
              {key} {idx === 0 ? '(abajo)' : idx === 4 ? '(arriba)' : ''}
            </Typography>

            {state === 'OCUPADO' && palletCode && (
              <Tooltip title={palletCode} arrow placement="top">
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: isDark ? '#a7f3d0' : '#1b5e20', mt: .2 }}>
                  {truncatedPallet}
                </Typography>
              </Tooltip>
            )}

            {state === 'BLOQUEADO' ? (
              <Typography sx={{ opacity: .75, fontSize: 12, mt: .3 }}>
                Motivo: {h?.blockedReason || 'Mantenimiento'}
              </Typography>
            ) : sku ? (
              <Typography sx={{ opacity: .75, fontSize: 12, mt: .3 }}>
                SKU: {sku} {qty !== null && qty !== undefined ? ` | Qty: ${qty}` : ''}
              </Typography>
            ) : state !== 'OCUPADO' ? (
              <Typography sx={{ opacity: .75, fontSize: 12, mt: .3 }}>
                VACIO
              </Typography>
            ) : null}

            <Typography sx={{ opacity: .65, fontSize: 12, mt: .2 }}>
              {fmtDate(h?.lastMoveAt)}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={state}
            sx={{
              bgcolor: state === 'OCUPADO' ? 'rgba(34,197,94,.18)' : state === 'BLOQUEADO' ? 'rgba(239,68,68,.16)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
              color: state === 'OCUPADO' ? (isDark ? '#a7f3d0' : '#1b5e20') : state === 'BLOQUEADO' ? (isDark ? '#fca5a5' : '#b71c1c') : (isDark ? '#e5e7eb' : '#1565C0'),
              border: state === 'OCUPADO' ? '1px solid rgba(34,197,94,.28)' : state === 'BLOQUEADO' ? '1px solid rgba(239,68,68,.28)' : (isDark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(21,101,192,.20)'),
              fontWeight: 900,
            }}
          />
        </Stack>
      </Box>
    )
  }

  // =========================
  // Legend component
  // =========================
  const renderLegend = () => (
    <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
      {[
        { label: 'Vacio', color: isDark ? '#111827' : 'rgba(21,101,192,.05)', border: isDark ? 'rgba(255,255,255,.08)' : 'rgba(21,101,192,.15)' },
        { label: 'Ocupado', color: isDark ? '#083a1f' : 'rgba(34,197,94,.12)', border: 'rgba(34,197,94,.35)' },
        { label: 'Bloqueado', color: isDark ? '#3b0a0a' : 'rgba(239,68,68,.10)', border: 'rgba(239,68,68,.35)' },
      ].map(item => (
        <Stack key={item.label} direction="row" spacing={0.8} alignItems="center">
          <Box sx={{ width: 14, height: 14, borderRadius: 0.5, bgcolor: item.color, border: `1px solid ${item.border}` }} />
          <Typography sx={{ fontSize: 11, opacity: .8 }}>{item.label}</Typography>
        </Stack>
      ))}
    </Stack>
  )

  // =========================
  // Area comparison bars
  // =========================
  const renderAreaComparison = () => (
    <Paper elevation={0} sx={{ ...ps.card, p: 2, mb: 2 }}>
      <Typography sx={{ fontWeight: 900, mb: 1.5 }}>Comparativa de Areas</Typography>
      <Divider sx={{ mb: 2 }} />
      <Stack spacing={1.5}>
        {AREAS.map(a => {
          const st = areaStats[a.db] || { total: 0, ocupadas: 0, bloqueadas: 0, pct: 0 }
          const isActive = a.db === areaDb
          return (
            <Box
              key={a.db}
              onClick={() => setAreaDb(a.db)}
              sx={{ cursor: 'pointer', p: 1, borderRadius: 1.5, transition: 'background .12s', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' } }}
            >
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.3 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontSize: 12, fontWeight: isActive ? 900 : 600, color: isActive ? (isDark ? '#64B5F6' : '#1565C0') : 'text.primary' }}>
                    {a.label} ({a.db})
                  </Typography>
                  {st.bloqueadas > 0 && (
                    <Chip size="small" label={`${st.bloqueadas} bloq.`} sx={{ ...ps.metricChip('bad'), height: 20, fontSize: 10 }} />
                  )}
                </Stack>
                <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: .8 }}>
                  {st.ocupadas}/{st.total} ({st.pct}%)
                </Typography>
              </Stack>
              <LinearProgress
                variant="determinate"
                value={st.pct}
                sx={{
                  height: 8,
                  borderRadius: 99,
                  bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.06)',
                  '& .MuiLinearProgress-bar': {
                    borderRadius: 99,
                    bgcolor: isActive
                      ? (isDark ? '#64B5F6' : '#1565C0')
                      : (isDark ? 'rgba(255,255,255,.25)' : 'rgba(21,101,192,.30)')
                  }
                }}
              />
            </Box>
          )
        })}
      </Stack>
    </Paper>
  )

  // =========================
  // Detail popover (quick peek)
  // =========================
  const renderPopover = () => {
    const d = popoverData?.data
    if (!d) return null
    return (
      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={handlePopoverClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        transformOrigin={{ vertical: 'top', horizontal: 'center' }}
        slotProps={{ paper: { sx: { borderRadius: 2.5, p: 2, minWidth: 260, maxWidth: 320, border: isDark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(21,101,192,.12)' } } }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography sx={{ fontWeight: 900, fontSize: 14 }}>{popoverData.key}</Typography>
          <IconButton size="small" onClick={handlePopoverClose}><CloseIcon sx={{ fontSize: 16 }} /></IconButton>
        </Stack>

        <Box sx={{ display: 'grid', gridTemplateColumns: '90px 1fr', rowGap: 0.6, columnGap: 1 }}>
          <Typography sx={{ opacity: .6, fontSize: 11 }}>Tarima</Typography>
          <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{d?.pallet?.code || '--'}</Typography>

          <Typography sx={{ opacity: .6, fontSize: 11 }}>SKU</Typography>
          <Typography sx={{ fontSize: 11 }}>{d?.pallet?.sku || '--'}</Typography>

          <Typography sx={{ opacity: .6, fontSize: 11 }}>Lote</Typography>
          <Typography sx={{ fontSize: 11 }}>{d?.pallet?.lot || d?.lot || '--'}</Typography>

          <Typography sx={{ opacity: .6, fontSize: 11 }}>Qty</Typography>
          <Typography sx={{ fontSize: 11 }}>{d?.pallet?.qty ?? '--'}</Typography>

          <Typography sx={{ opacity: .6, fontSize: 11 }}>Ultimo mov.</Typography>
          <Typography sx={{ fontSize: 11 }}>{fmtDate(d?.lastMoveAt)}</Typography>
        </Box>

        <Divider sx={{ my: 1.2 }} />
        <Stack direction="row" spacing={1}>
          <Button
            size="small"
            variant="outlined"
            color="error"
            startIcon={<LockIcon sx={{ fontSize: 14 }} />}
            onClick={() => { handlePopoverClose(); setBlockDialog({ id: d?.id || d?._id || popoverData.key, action: 'block' }) }}
            sx={{ ...ps.actionBtn('error'), textTransform: 'none', fontWeight: 700, fontSize: 11, py: 0.4 }}
          >
            Bloquear
          </Button>
        </Stack>
      </Popover>
    )
  }

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={ps.pageTitle}>
          {headerTitle}
        </Typography>

        <Chip
          size="small"
          label="Tiempo real"
          sx={{
            bgcolor: 'rgba(34,197,94,.15)',
            color: isDark ? '#a7f3d0' : '#1b5e20',
            border: '1px solid rgba(34,197,94,.25)'
          }}
        />
      </Box>

      {/* -- Area Tabs (clickable buttons with occupancy counts) -- */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
        {AREAS.map(a => {
          const st = areaStats[a.db] || { total: 0, ocupadas: 0, pct: 0 }
          const isActive = a.db === areaDb
          return (
            <Button
              key={a.db}
              variant={isActive ? 'contained' : 'outlined'}
              size="small"
              onClick={() => setAreaDb(a.db)}
              sx={{
                borderRadius: 2,
                textTransform: 'none',
                fontWeight: isActive ? 900 : 600,
                minWidth: 0,
                px: 2,
                py: 0.8,
                fontSize: 12,
                ...(isActive
                  ? { bgcolor: isDark ? 'rgba(66,165,245,.18)' : 'rgba(21,101,192,.10)', color: isDark ? '#64B5F6' : '#1565C0', border: `1px solid ${isDark ? 'rgba(66,165,245,.35)' : 'rgba(21,101,192,.30)'}`, '&:hover': { bgcolor: isDark ? 'rgba(66,165,245,.25)' : 'rgba(21,101,192,.15)' } }
                  : { borderColor: isDark ? 'rgba(255,255,255,.12)' : 'rgba(21,101,192,.15)', color: 'text.secondary', '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)' } }
                ),
              }}
            >
              {a.label}
              {st.total > 0 && (
                <Chip
                  size="small"
                  label={`${st.ocupadas}/${st.total}`}
                  sx={{
                    ml: 1,
                    height: 20,
                    fontSize: 10,
                    fontWeight: 800,
                    ...(isActive ? ps.metricChip('info') : ps.metricChip('default')),
                    height: 20,
                  }}
                />
              )}
            </Button>
          )
        })}
      </Stack>

      {/* -- KPI Summary Bar -- */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'repeat(2,1fr)', sm: 'repeat(3,1fr)', md: 'repeat(5,1fr)' }, gap: 2, mb: 2 }}>
        <Paper elevation={0} sx={ps.kpiCard('blue')}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <StorageIcon sx={{ fontSize: 18, opacity: .6 }} />
            <Typography sx={{ opacity: .75, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>Total Posiciones</Typography>
          </Stack>
          <Typography sx={{ fontWeight: 900, fontSize: 26 }}>{stats.cap}</Typography>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('green')}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <InventoryIcon sx={{ fontSize: 18, opacity: .6 }} />
            <Typography sx={{ opacity: .75, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>Ocupadas</Typography>
          </Stack>
          <Typography sx={{ fontWeight: 900, fontSize: 26 }}>{stats.ocupadas}</Typography>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('blue')}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <CheckCircleOutlineIcon sx={{ fontSize: 18, opacity: .6 }} />
            <Typography sx={{ opacity: .75, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>Vacias</Typography>
          </Stack>
          <Typography sx={{ fontWeight: 900, fontSize: 26 }}>{stats.vacias}</Typography>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('red')}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <BlockIcon sx={{ fontSize: 18, opacity: .6 }} />
            <Typography sx={{ opacity: .75, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>Bloqueadas</Typography>
          </Stack>
          <Typography sx={{ fontWeight: 900, fontSize: 26 }}>{stats.bloqueadas}</Typography>
        </Paper>

        <Paper elevation={0} sx={ps.kpiCard('amber')}>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
            <PercentIcon sx={{ fontSize: 18, opacity: .6 }} />
            <Typography sx={{ opacity: .75, fontSize: 11, textTransform: 'uppercase', letterSpacing: .5 }}>% Ocupacion</Typography>
          </Stack>
          <Typography sx={{ fontWeight: 900, fontSize: 26 }}>{stats.pct}%</Typography>
          <LinearProgress
            variant="determinate"
            value={stats.pct}
            sx={{
              mt: 1,
              height: 6,
              borderRadius: 99,
              bgcolor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(245,158,11,.10)',
              '& .MuiLinearProgress-bar': { borderRadius: 99, bgcolor: isDark ? '#FCD34D' : '#E65100' }
            }}
          />
        </Paper>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' }, gap: 2 }}>
        {/* IZQ */}
        <Box>
          {/* Controles */}
          <Paper elevation={0} sx={{ ...ps.card, p: 2, mb: 2 }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                size="small"
                label="Area"
                value={areaDb}
                onChange={(e) => setAreaDb(e.target.value)}
                sx={{ width: { xs: '100%', md: 260 }, ...ps.inputSx }}
              >
                {AREAS.map(a => <MenuItem key={a.db} value={a.db}>{areaTabLabel(a)}</MenuItem>)}
              </TextField>

              <TextField
                select
                size="small"
                label="Sub-area"
                value={subarea}
                onChange={(e) => setSubarea(e.target.value)}
                sx={{ width: { xs: '100%', md: 260 }, ...ps.inputSx }}
              >
                {(SUBAREAS_BY_AREA[areaDb] || []).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>

              <TextField
                select
                size="small"
                label="Filtro"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                sx={{ width: { xs: '100%', md: 220 }, ...ps.inputSx }}
              >
                <MenuItem value="TODOS">Todos</MenuItem>
                <MenuItem value="VACIO">Vacios</MenuItem>
                <MenuItem value="OCUPADO">Ocupados</MenuItem>
                <MenuItem value="BLOQUEADO">Bloqueados</MenuItem>
              </TextField>

              <Box sx={{ flex: 1 }} />

              <Button onClick={() => { load(); loadAreaStats() }} variant="outlined" sx={{ borderRadius: 2 }}>
                Recargar
              </Button>
            </Stack>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
              </Box>
            )}
          </Paper>

          {/* Centro: Grid o Estantes */}
          <Paper elevation={0} sx={{ ...ps.card, p: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 900 }}>
                {isFftAccesorios(areaDb, subarea) ? 'Accesorios (FFT) -- Estantes por altura' : 'Mapa/Grid de BINs'}
              </Typography>
              <Stack direction="row" spacing={1}>
                <Chip size="small" label={`${stats.ocupadas} ocupadas`} sx={ps.metricChip('ok')} />
                <Chip size="small" label={`${stats.vacias} vacias`} sx={ps.metricChip('info')} />
                {stats.bloqueadas > 0 && <Chip size="small" label={`${stats.bloqueadas} bloq.`} sx={ps.metricChip('bad')} />}
              </Stack>
            </Stack>

            {renderLegend()}

            <Divider sx={{ my: 1.5, }} />

            {!loading && stats.cap === 0 ? (
              <Typography sx={ps.emptyText}>
                No se encontraron ubicaciones para esta sub-area.
              </Typography>
            ) : isFftAccesorios(areaDb, subarea) ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {heights.map((h, i) => renderHeightCard(h, i))}
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
                  gap: 1
                }}
              >
                {locs.map((l) => renderBinCard(l, l.id))}
              </Box>
            )}
          </Paper>
        </Box>

        {/* DER (detalle + comparativa) */}
        <Box>
          <Paper elevation={0} sx={{ ...ps.card, p: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Detalle</Typography>
            <Divider sx={{ mb: 2, }} />

            {!selected ? (
              <Typography sx={ps.emptyText}>
                Selecciona un BIN/altura para ver detalles.
              </Typography>
            ) : (
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 16, mb: 1 }}>
                  {selected.key}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
                  <Chip size="small" label={`Area ${AREAS.find(a => a.db === areaDb)?.label}`} sx={ps.metricChip('info')} />
                  <Chip size="small" label={`Sub-area ${subarea}`} sx={ps.metricChip('default')} />
                  <Chip
                    size="small"
                    label={selected.data?.state || 'VACIO'}
                    sx={ps.metricChip(
                      selected.data?.state === 'OCUPADO' ? 'ok'
                      : selected.data?.state === 'BLOQUEADO' ? 'bad'
                      : 'default'
                    )}
                  />
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, columnGap: 1.5 }}>
                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Codigo</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.code || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Tarima</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{selected.data?.pallet?.code || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>SKU</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.pallet?.sku || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Lote</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.pallet?.lot || selected.data?.lot || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Qty</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.pallet?.qty ?? '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Ultimo mov.</Typography>
                  <Typography sx={{ fontSize: 12 }}>{fmtDate(selected.data?.lastMoveAt)}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Usuario</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.lastMoveBy || '--'}</Typography>

                  {selected.data?.state === 'BLOQUEADO' && (
                    <>
                      <Typography sx={{ opacity: .7, fontSize: 12 }}>Motivo</Typography>
                      <Typography sx={{ fontSize: 12 }}>{selected.data?.blockedReason || 'Mantenimiento'}</Typography>
                    </>
                  )}
                </Box>

                {/* Quick Actions: Block / Unblock */}
                <Divider sx={{ my: 2 }} />
                <Typography sx={{ fontWeight: 700, fontSize: 12, mb: 1, opacity: .7 }}>Acciones</Typography>
                <Stack direction="row" spacing={1}>
                  {selected.data?.state === 'BLOQUEADO' ? (
                    <Button
                      size="small"
                      startIcon={<LockOpenIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setBlockDialog({ id: selected.data?.id || selected.data?._id || selected.key, action: 'unblock' })}
                      sx={{ ...ps.actionBtn('success'), textTransform: 'none', fontWeight: 700, px: 2 }}
                    >
                      Desbloquear
                    </Button>
                  ) : (
                    <Button
                      size="small"
                      startIcon={<LockIcon sx={{ fontSize: 16 }} />}
                      onClick={() => setBlockDialog({ id: selected.data?.id || selected.data?._id || selected.key, action: 'block' })}
                      sx={{ ...ps.actionBtn('error'), textTransform: 'none', fontWeight: 700, px: 2 }}
                    >
                      Bloquear
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Paper>

          {/* Ocupacion actual */}
          <Paper elevation={0} sx={{ ...ps.card, p: 2, mb: 2 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Ocupacion</Typography>
            <Divider sx={{ mb: 2, }} />

            <Stack spacing={1.2}>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ opacity: .75, fontSize: 12 }}>Ocupacion</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.pct}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={stats.pct}
                  sx={{
                    height: 10,
                    borderRadius: 99,
                    bgcolor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(21,101,192,.08)',
                    '& .MuiLinearProgress-bar': { borderRadius: 99 }
                  }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1 }}>
                <Typography sx={{ opacity: .75, fontSize: 12 }}>Vacias</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.vacias}</Typography>

                <Typography sx={{ opacity: .75, fontSize: 12 }}>Ocupadas</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.ocupadas}</Typography>

                <Typography sx={{ opacity: .75, fontSize: 12 }}>Bloqueadas</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.bloqueadas}</Typography>
              </Box>
            </Stack>
          </Paper>

          {/* Area Comparison */}
          {renderAreaComparison()}
        </Box>
      </Box>

      {/* Detail Popover for occupied cells */}
      {renderPopover()}

      {/* Block/Unblock Dialog */}
      <Dialog
        open={Boolean(blockDialog)}
        onClose={() => { if (!blockLoading) { setBlockDialog(null); setBlockReason('') } }}
        maxWidth="xs"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 800 }}>
          {blockDialog?.action === 'block' ? 'Bloquear Ubicacion' : 'Desbloquear Ubicacion'}
          <IconButton size="small" onClick={() => { setBlockDialog(null); setBlockReason('') }} disabled={blockLoading}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {blockDialog?.action === 'block' ? (
            <>
              <Typography sx={{ fontSize: 13, mb: 2, opacity: .8 }}>
                Se bloqueara la ubicacion <strong>{blockDialog?.id}</strong>. Ingresa el motivo:
              </Typography>
              <TextField
                fullWidth
                size="small"
                label="Motivo"
                value={blockReason}
                onChange={(e) => setBlockReason(e.target.value)}
                placeholder="Ej: Mantenimiento, dano en rack..."
                sx={ps.inputSx}
              />
            </>
          ) : (
            <Typography sx={{ fontSize: 13, opacity: .8 }}>
              Se desbloqueara la ubicacion <strong>{blockDialog?.id}</strong> y quedara disponible para uso.
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => { setBlockDialog(null); setBlockReason('') }}
            disabled={blockLoading}
            sx={{ textTransform: 'none' }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            color={blockDialog?.action === 'block' ? 'error' : 'success'}
            onClick={handleBlock}
            disabled={blockLoading}
            startIcon={blockLoading ? <CircularProgress size={16} /> : (blockDialog?.action === 'block' ? <LockIcon /> : <LockOpenIcon />)}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {blockDialog?.action === 'block' ? 'Bloquear' : 'Desbloquear'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
