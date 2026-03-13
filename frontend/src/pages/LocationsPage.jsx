import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'
import { useNavigate } from 'react-router-dom'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Grid from '@mui/material/Grid'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import ViewListIcon from '@mui/icons-material/ViewList'
import GridViewIcon from '@mui/icons-material/GridView'
import InsightsIcon from '@mui/icons-material/Insights'
import CloseIcon from '@mui/icons-material/Close'
import RestartAltIcon from '@mui/icons-material/RestartAlt'
import HistoryIcon from '@mui/icons-material/History'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import PlaceIcon from '@mui/icons-material/Place'
import RefreshIcon from '@mui/icons-material/Refresh'

import dayjs from 'dayjs'

/* ═══════════════════════════════════════════
   CONSTANTES Y HELPERS (preservados del original)
   ═══════════════════════════════════════════ */
const ZONE_RULES = [
  { zone: 'MIDEA', from: 1, to: 12 },
  { zone: 'ALMACEN', from: 16, to: 47 },
  { zone: 'BOX', from: 67, to: 70 },
  { zone: 'INSUMOS', from: 71, to: 78 },
  { zone: 'LAMPARAS', from: 110, to: 118 },
]
const AREAS = ['MIDEA', 'ALMACEN', 'BOX', 'INSUMOS', 'LAMPARAS', 'SIN ZONA']
const HEIGHT_LABEL = { A: 'PLANTA BAJA', B: 'MEDIA', C: 'ALTA' }
const HEIGHTS = ['A', 'B', 'C']
const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1)
const rackOptions = Array.from({ length: 125 }, (_, i) => `F${String(i + 1).padStart(3, '0')}`)

function rackToArea(rackCode) {
  const n = Number(String(rackCode || '').replace(/[^\d]/g, '')) || 0
  const rule = ZONE_RULES.find(r => n >= r.from && n <= r.to)
  return rule?.zone || 'SIN ZONA'
}

function normalizeRackCode(input) {
  const s = String(input || '').trim().toUpperCase()
  if (!s) return ''
  if (/^\d{1,3}$/.test(s)) return `F${s.padStart(3, '0')}`
  if (/^F\d{1,3}$/.test(s)) return `F${s.slice(1).padStart(3, '0')}`
  if (/^F\d{3}$/.test(s)) return s
  return s
}

function parseCodeFallback(code) {
  const c = String(code || '').trim().toUpperCase()
  let m = c.match(/^([A-Z])\d{2}-(F\d{3})-(\d{3})$/)
  if (m) return { level: m[1], rack: m[2], position: Number(m[3]) }
  m = c.match(/(F\d{3})-(\d{3})$/)
  if (m) return { rack: m[1], position: Number(m[2]) }
  return {}
}

function smartParse(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return null
  let m = raw.match(/^([A-C])-(F\d{3})-(\d{3})$/)
  if (m) return { height: m[1], rackCode: m[2], slot: Number(m[3]) }
  const cleaned = raw.replace(/[_/\\]+/g, ' ').replace(/-+/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length === 1) {
    const rk = normalizeRackCode(parts[0])
    if (/^F\d{3}$/.test(rk)) return { rackCode: rk }
    return null
  }
  if (parts.length >= 3) {
    const height = parts[0]
    const rackCode = normalizeRackCode(parts[1])
    const slotNum = Number(String(parts[2]).replace(/\D/g, ''))
    if (!['A', 'B', 'C'].includes(height)) return null
    if (!/^F\d{3}$/.test(rackCode)) return null
    if (!Number.isFinite(slotNum) || slotNum < 1 || slotNum > 12) return null
    return { height, rackCode, slot: slotNum }
  }
  return null
}

/* ═══════════════════════════════════════════
   ESTILOS DE ESTADO
   ═══════════════════════════════════════════ */
function chipSxForState(st, isDark = false) {
  if (st === 'OCUPADO') return {
    bgcolor: isDark ? 'rgba(34,197,94,.15)' : '#E8F5E9',
    border: isDark ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(46,125,50,.25)',
    color: isDark ? '#86EFAC' : '#2E7D32',
  }
  if (st === 'BLOQUEADO') return {
    bgcolor: isDark ? 'rgba(239,68,68,.15)' : '#FFEBEE',
    border: isDark ? '1px solid rgba(239,68,68,.25)' : '1px solid rgba(198,40,40,.25)',
    color: isDark ? '#FCA5A5' : '#C62828',
  }
  return {
    bgcolor: isDark ? 'rgba(66,165,245,.12)' : '#E3F2FD',
    border: isDark ? '1px solid rgba(66,165,245,.25)' : '1px solid rgba(21,101,192,.25)',
    color: isDark ? '#64B5F6' : '#1565C0',
  }
}

function cellBgForState(st, isDark = false) {
  if (st === 'OCUPADO') return 'rgba(34,197,94,.14)'
  if (st === 'BLOQUEADO') return 'rgba(239,68,68,.12)'
  return isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)'
}

const stateIcon = (st) => {
  if (st === 'OCUPADO') return <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
  if (st === 'BLOQUEADO') return <BlockIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />
  return <Inventory2Icon sx={{ color: '#94a3b8', verticalAlign: 'middle' }} fontSize="small" />
}

/* ═══════════════════════════════════════════
   COMPONENTE KPI CARD
   ═══════════════════════════════════════════ */
function KpiCard({ label, value, sub, accent, icon, onClick, isDark }) {
  const colors = {
    blue: { bg: isDark ? 'rgba(59,130,246,.12)' : 'rgba(59,130,246,.08)', border: isDark ? 'rgba(59,130,246,.25)' : 'rgba(59,130,246,.20)', text: isDark ? '#93C5FD' : '#1D4ED8' },
    green: { bg: isDark ? 'rgba(34,197,94,.12)' : 'rgba(34,197,94,.08)', border: isDark ? 'rgba(34,197,94,.25)' : 'rgba(34,197,94,.20)', text: isDark ? '#86EFAC' : '#166534' },
    red: { bg: isDark ? 'rgba(239,68,68,.12)' : 'rgba(239,68,68,.08)', border: isDark ? 'rgba(239,68,68,.25)' : 'rgba(239,68,68,.20)', text: isDark ? '#FCA5A5' : '#991B1B' },
    amber: { bg: isDark ? 'rgba(245,158,11,.12)' : 'rgba(245,158,11,.08)', border: isDark ? 'rgba(245,158,11,.25)' : 'rgba(245,158,11,.20)', text: isDark ? '#FCD34D' : '#92400E' },
    purple: { bg: isDark ? 'rgba(139,92,246,.12)' : 'rgba(139,92,246,.08)', border: isDark ? 'rgba(139,92,246,.25)' : 'rgba(139,92,246,.20)', text: isDark ? '#C4B5FD' : '#5B21B6' },
  }
  const c = colors[accent] || colors.blue
  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        p: 2, borderRadius: 3, cursor: onClick ? 'pointer' : 'default',
        bgcolor: c.bg, border: `1px solid ${c.border}`,
        transition: 'transform .1s ease, box-shadow .1s ease',
        '&:hover': onClick ? { transform: 'translateY(-2px)', boxShadow: `0 8px 24px ${c.border}` } : {},
      }}
    >
      <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
        <Box>
          <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary', letterSpacing: .5 }}>{label}</Typography>
          <Typography sx={{ fontSize: 28, fontWeight: 900, color: c.text, lineHeight: 1.2, mt: .5 }}>{value}</Typography>
          {sub && <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mt: .3 }}>{sub}</Typography>}
        </Box>
        {icon && <Box sx={{ color: c.text, opacity: .6, mt: .5 }}>{icon}</Box>}
      </Stack>
    </Paper>
  )
}

/* ═══════════════════════════════════════════
   COMPONENTE PRINCIPAL
   ═══════════════════════════════════════════ */
export default function LocationsPage() {
  const { token, user } = useAuth()
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(user?.role)
  const client = useMemo(() => api(token), [token])
  const navigate = useNavigate()

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const ps = usePageStyles()

  /* ── State: datos ── */
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  /* ── State: filtros ── */
  const [area, setArea] = useState('MIDEA')
  const [rack, setRack] = useState('')
  const [state, setState] = useState('')
  const [level, setLevel] = useState('')
  const [locType, setLocType] = useState('')
  const [q, setQ] = useState('')

  /* ── State: vista ── */
  const [view, setView] = useState('LISTA')

  /* ── State: highlight / detalle ── */
  const [highlightKey, setHighlightKey] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)
  const [detailPallet, setDetailPallet] = useState(null)
  const [detailMovements, setDetailMovements] = useState([])
  const [detailLoading, setDetailLoading] = useState(false)

  /* ── State: historial modal ── */
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyMovements, setHistoryMovements] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)

  /* ── State: rack detail for map ── */
  const [rackDetailData, setRackDetailData] = useState(null)
  const [rackDetailLoading, setRackDetailLoading] = useState(false)

  /* ── State: dialog editar/bloquear ── */
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [type, setType] = useState('RACK')
  const [maxPallets, setMaxPallets] = useState(1)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('Mantenimiento')

  /* ── State: stale locations ── */
  const [staleData, setStaleData] = useState([])

  /* ═══════════════════════════════════════════
     DATA LOADING
     ═══════════════════════════════════════════ */
  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await client.get('/api/locations')
      setRows(Array.isArray(res.data) ? res.data : [])
    } finally { setLoading(false) }
  }, [client])

  const loadStale = useCallback(async () => {
    try {
      const res = await client.get('/api/movements/no-move?days=30')
      setStaleData(Array.isArray(res.data) ? res.data : [])
    } catch { setStaleData([]) }
  }, [client])

  useEffect(() => { load(); loadStale() }, [token])

  // auto-adjust zone when rack changes
  useEffect(() => {
    if (!rack) return
    const zone = rackToArea(rack)
    if (zone && zone !== area) setArea(zone)
  }, [rack])

  /* ═══════════════════════════════════════════
     ENRICHMENT & FILTERING
     ═══════════════════════════════════════════ */
  const enriched = useMemo(() => {
    return (rows || []).map((l) => {
      const fallback = parseCodeFallback(l.code)
      const rackCode = String(l.rackCode || l.rack || fallback.rack || '').toUpperCase()
      const height = String(l.level || fallback.level || '').toUpperCase()
      const slot = Number(l.position ?? fallback.position ?? 0)
      const slot3 = String(slot || 0).padStart(3, '0')
      const computedArea = rackToArea(rackCode)
      const key = `${height}-${rackCode}-${slot3}`
      return {
        ...l, _id: l.id ?? l._id ?? l.code, rackCode, height, slot,
        _area: computedArea, _state: l.state || 'VACIO', _slot3: slot3, _key: key,
      }
    })
  }, [rows])

  const filtered = useMemo(() => {
    let list = enriched
    if (area) list = list.filter(l => l._area === area)
    if (rack) list = list.filter(l => String(l.rackCode).toUpperCase() === String(rack).toUpperCase())
    if (state) list = list.filter(l => l._state === state)
    if (level) list = list.filter(l => l.height === level)
    if (locType) list = list.filter(l => (l.type || 'RACK') === locType)
    return list
  }, [enriched, area, rack, state, level, locType])

  /* ═══════════════════════════════════════════
     METRICS
     ═══════════════════════════════════════════ */
  const globalSummary = useMemo(() => {
    const s = { total: enriched.length, VACIO: 0, OCUPADO: 0, BLOQUEADO: 0 }
    for (const l of enriched) { if (s[l._state] !== undefined) s[l._state]++ }
    s.occPct = s.total ? Math.round((s.OCUPADO / s.total) * 100) : 0
    s.capacity = enriched.reduce((acc, l) => acc + (l.maxPallets || 1), 0)
    return s
  }, [enriched])

  const summary = useMemo(() => {
    const s = { total: filtered.length, VACIO: 0, OCUPADO: 0, BLOQUEADO: 0 }
    for (const l of filtered) { if (s[l._state] !== undefined) s[l._state]++ }
    s.occPct = s.total ? Math.round((s.OCUPADO / s.total) * 100) : 0
    return s
  }, [filtered])

  const perRackSummary = useMemo(() => {
    const map = new Map()
    for (const l of filtered) {
      const rk = String(l.rackCode).toUpperCase()
      if (!rk) continue
      if (!map.has(rk)) map.set(rk, { rackCode: rk, total: 0, VACIO: 0, OCUPADO: 0, BLOQUEADO: 0 })
      const o = map.get(rk)
      o.total++; o[l._state] = (o[l._state] || 0) + 1
    }
    return Array.from(map.values()).sort((a, b) => a.rackCode.localeCompare(b.rackCode))
  }, [filtered])

  const zoneSummary = useMemo(() => {
    const map = new Map()
    for (const l of enriched) {
      const z = l._area
      if (!map.has(z)) map.set(z, { zone: z, total: 0, VACIO: 0, OCUPADO: 0, BLOQUEADO: 0 })
      const o = map.get(z)
      o.total++; o[l._state] = (o[l._state] || 0) + 1
    }
    return Array.from(map.values()).sort((a, b) => a.zone.localeCompare(b.zone))
  }, [enriched])

  const staleLocationIds = useMemo(() => {
    return new Set(staleData.map(s => s.locationId))
  }, [staleData])

  /* ═══════════════════════════════════════════
     DETAIL PANEL LOGIC
     ═══════════════════════════════════════════ */
  const loadDetailForLocation = useCallback(async (loc) => {
    setDetailItem(loc)
    setDetailOpen(true)
    setDetailPallet(null)
    setDetailMovements([])
    setDetailLoading(true)
    try {
      // Fetch rack detail which includes pallet info per location
      const rk = loc.rackCode
      if (rk) {
        const res = await client.get(`/api/locations/racks/${rk}`)
        const locations = res.data?.locations || []
        const match = locations.find(rl =>
          String(rl.level || '').toUpperCase() === loc.height &&
          Number(rl.position) === loc.slot
        )
        if (match) {
          setDetailPallet(match.pallet || null)
          // If there's a pallet, fetch its recent movements
          if (match.pallet?.id) {
            try {
              const mvRes = await client.get(`/api/movements?palletId=${match.pallet.id}&limit=5`)
              setDetailMovements(Array.isArray(mvRes.data) ? mvRes.data : [])
            } catch { setDetailMovements([]) }
          }
        }
      }
    } catch { /* silently fail */ }
    finally { setDetailLoading(false) }
  }, [client])

  const openDetail = (l) => loadDetailForLocation(l)

  /* ═══════════════════════════════════════════
     MOVEMENT HISTORY MODAL
     ═══════════════════════════════════════════ */
  const openHistory = async (palletId) => {
    if (!palletId) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    setHistoryMovements([])
    try {
      const res = await client.get(`/api/movements?palletId=${palletId}&limit=50`)
      setHistoryMovements(Array.isArray(res.data) ? res.data : [])
    } catch { setHistoryMovements([]) }
    finally { setHistoryLoading(false) }
  }

  /* ═══════════════════════════════════════════
     RACK DETAIL FOR MAP (enriched with pallet data)
     ═══════════════════════════════════════════ */
  const rackForMap = useMemo(() => {
    if (rack) return String(rack).toUpperCase()
    const first = filtered[0]?.rackCode
    return first ? String(first).toUpperCase() : ''
  }, [rack, filtered])

  const loadRackDetail = useCallback(async (rackCode) => {
    if (!rackCode) return
    setRackDetailLoading(true)
    try {
      const res = await client.get(`/api/locations/racks/${rackCode}`)
      setRackDetailData(res.data)
    } catch { setRackDetailData(null) }
    finally { setRackDetailLoading(false) }
  }, [client])

  // Fetch enriched rack data when switching to MAP view or when rack changes
  useEffect(() => {
    if (view === 'MAPA' && rackForMap) loadRackDetail(rackForMap)
  }, [view, rackForMap])

  const mapForRack = useMemo(() => {
    const m = new Map()
    // Use enriched rack data if available, fall back to basic filtered data
    if (rackDetailData?.locations) {
      for (const rl of rackDetailData.locations) {
        const h = String(rl.level || '').toUpperCase()
        const s = String(rl.position || 0).padStart(3, '0')
        const st = rl.blocked ? 'BLOQUEADO' : (rl.pallet ? 'OCUPADO' : 'VACIO')
        m.set(`${h}-${s}`, { ...rl, _state: rl.state || st, height: h, _slot3: s, rackCode: rackForMap, _area: rackToArea(rackForMap), _id: rl.id })
      }
    } else {
      for (const l of filtered) {
        if (String(l.rackCode).toUpperCase() !== rackForMap) continue
        m.set(`${l.height}-${String(l.slot).padStart(3, '0')}`, l)
      }
    }
    return m
  }, [filtered, rackForMap, rackDetailData])

  /* ═══════════════════════════════════════════
     ACTIONS
     ═══════════════════════════════════════════ */
  const openEdit = (l) => {
    setSelected(l)
    setType(l.type || 'RACK')
    setMaxPallets(l.maxPallets || 1)
    setNotes(l.notes || '')
    setReason(l.blockedReason || 'Mantenimiento')
    setOpen(true)
  }

  const save = async () => {
    await client.patch(`/api/locations/${selected._id || selected.id}`, { type, maxPallets: Number(maxPallets), notes })
    await load(); setOpen(false)
  }

  const block = async () => {
    await client.patch(`/api/locations/${selected._id || selected.id}/block`, { reason })
    await load(); setOpen(false)
  }

  const unblock = async () => {
    await client.patch(`/api/locations/${selected._id || selected.id}/unblock`)
    await load(); setOpen(false)
  }

  const clearFilters = () => {
    setArea('MIDEA'); setRack(''); setState(''); setLevel(''); setLocType(''); setQ(''); setHighlightKey(null)
  }

  const applySmartSearch = () => {
    const parsed = smartParse(q)
    if (!parsed) return
    if (parsed.rackCode && !parsed.height) {
      setRack(parsed.rackCode); setArea(rackToArea(parsed.rackCode)); setState(''); setHighlightKey(null); setView('MAPA')
      return
    }
    setRack(parsed.rackCode); setArea(rackToArea(parsed.rackCode)); setState('')
    const slot3 = String(parsed.slot).padStart(3, '0')
    const key = `${parsed.height}-${parsed.rackCode}-${slot3}`
    setHighlightKey(key); setView('MAPA')
    const found = enriched.find(x => x._key === key)
    if (found) { openDetail(found); setTimeout(() => setHighlightKey(null), 4000) }
    else { setTimeout(() => setHighlightKey(null), 4000) }
  }

  const kpiClick = (k) => {
    if (k === 'TOTAL') setState('')
    if (k === 'VACIO') setState('VACIO')
    if (k === 'OCUPADO') setState('OCUPADO')
    if (k === 'BLOQUEADO') setState('BLOQUEADO')
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <Box>
      {/* ══════ HEADER ══════ */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900 }}>Ubicaciones</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Gestion y visibilidad de ubicaciones del almacen</Typography>
        </Box>
        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Recargar datos">
            <IconButton onClick={() => { load(); loadStale() }} disabled={loading} sx={ps.actionBtn('primary')}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ══════ KPI CARDS ══════ */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Total Ubicaciones" value={globalSummary.total.toLocaleString()} accent="blue" isDark={isDark}
            icon={<PlaceIcon />} onClick={() => { setState(''); setArea(''); setRack('') }} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Vacias" value={globalSummary.VACIO.toLocaleString()}
            sub={`${globalSummary.total ? Math.round((globalSummary.VACIO / globalSummary.total) * 100) : 0}% disponible`}
            accent="blue" isDark={isDark} icon={<Inventory2Icon />} onClick={() => kpiClick('VACIO')} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Ocupadas" value={globalSummary.OCUPADO.toLocaleString()}
            sub={`${globalSummary.occPct}% ocupacion`}
            accent="green" isDark={isDark} icon={<CheckCircleIcon />} onClick={() => kpiClick('OCUPADO')} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Bloqueadas" value={globalSummary.BLOQUEADO.toLocaleString()}
            sub={globalSummary.BLOQUEADO > 0 ? 'Requiere atencion' : 'Sin bloqueos'}
            accent={globalSummary.BLOQUEADO > 0 ? 'red' : 'blue'} isDark={isDark}
            icon={<BlockIcon />} onClick={() => kpiClick('BLOQUEADO')} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Ocupacion %" value={`${globalSummary.occPct}%`}
            sub={<LinearProgress variant="determinate" value={globalSummary.occPct} sx={{ mt: .5, height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(0,0,0,.08)' }} />}
            accent="purple" isDark={isDark} />
        </Grid>
        <Grid item xs={6} sm={4} md={2}>
          <KpiCard label="Sin Movimiento" value={staleData.length}
            sub={staleData.length > 0 ? '30+ dias inactivas' : 'Todo activo'}
            accent={staleData.length > 0 ? 'amber' : 'green'} isDark={isDark}
            icon={<WarningAmberIcon />} />
        </Grid>
      </Grid>

      {/* ══════ ALERTAS RÁPIDAS ══════ */}
      {globalSummary.BLOQUEADO > 0 && (
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}
          action={<Button size="small" color="inherit" onClick={() => { setState('BLOQUEADO'); setArea(''); setRack('') }}>Ver bloqueadas</Button>}>
          <b>{globalSummary.BLOQUEADO}</b> ubicacion(es) bloqueada(s) en el almacen.
        </Alert>
      )}

      {/* ══════ FILTROS ══════ */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        {!canEdit && (
          <Alert severity="warning" sx={{ mb: 2 }}>Solo ADMIN/SUPERVISOR puede editar ubicaciones y bloquear/desbloquear.</Alert>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField size="small" label='Buscar ubicacion (ej: A-F059-012 | F059)' value={q}
            onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && applySmartSearch()}
            sx={{ flex: 1, ...ps.inputSx }} />
          <Button variant="contained" onClick={applySmartSearch} sx={{ minWidth: 120, borderRadius: 2 }}>Buscar</Button>
          <Tooltip title="Limpiar filtros">
            <IconButton onClick={clearFilters} sx={ps.actionBtn('primary')}><RestartAltIcon /></IconButton>
          </Tooltip>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} flexWrap="wrap" useFlexGap>
          <TextField select size="small" label="Zona" value={area} onChange={(e) => setArea(e.target.value)} sx={{ minWidth: 150, ...ps.inputSx }}>
            <MenuItem value="">Todas</MenuItem>
            {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Rack" value={rack}
            onChange={(e) => { const v = e.target.value; setRack(v); if (v) setArea(rackToArea(v)) }}
            sx={{ minWidth: 130, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            {rackOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Nivel" value={level} onChange={(e) => setLevel(e.target.value)} sx={{ minWidth: 130, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            {HEIGHTS.map(h => <MenuItem key={h} value={h}>{h} ({HEIGHT_LABEL[h]})</MenuItem>)}
          </TextField>

          <TextField select size="small" label="Estado" value={state} onChange={(e) => setState(e.target.value)} sx={{ minWidth: 140, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="VACIO">VACIO</MenuItem>
            <MenuItem value="OCUPADO">OCUPADO</MenuItem>
            <MenuItem value="BLOQUEADO">BLOQUEADO</MenuItem>
          </TextField>

          <TextField select size="small" label="Tipo" value={locType} onChange={(e) => setLocType(e.target.value)} sx={{ minWidth: 140, ...ps.inputSx }}>
            <MenuItem value="">Todos</MenuItem>
            {['RACK', 'FLOOR', 'QUARANTINE', 'RETURNS'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
          </TextField>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            {[
              { key: 'LISTA', icon: <ViewListIcon />, label: 'Lista' },
              { key: 'MAPA', icon: <GridViewIcon />, label: 'Mapa' },
              { key: 'RESUMEN', icon: <InsightsIcon />, label: 'Resumen' },
            ].map(v => (
              <Button key={v.key} variant={view === v.key ? 'contained' : 'outlined'}
                startIcon={v.icon} onClick={() => setView(v.key)} sx={{ borderRadius: 2 }}>
                {v.label}
              </Button>
            ))}
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {/* Quick filter chips */}
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          {[
            { key: '', label: `Filtrados: ${summary.total}`, accent: 'default' },
            { key: 'VACIO', label: `Vacios: ${summary.VACIO}`, accent: 'info' },
            { key: 'OCUPADO', label: `Ocupados: ${summary.OCUPADO}`, accent: 'ok' },
            { key: 'BLOQUEADO', label: `Bloqueados: ${summary.BLOQUEADO}`, accent: summary.BLOQUEADO > 0 ? 'bad' : 'default' },
          ].map(c => (
            <Chip key={c.key} clickable size="small" label={c.label}
              onClick={() => setState(c.key === state ? '' : c.key)}
              sx={{ ...ps.metricChip(c.accent), fontWeight: 900, opacity: (!state || state === c.key) ? 1 : .5 }} />
          ))}
        </Stack>
      </Paper>

      {/* ══════ CONTENIDO: LISTA / MAPA / RESUMEN + PANEL DETALLE ══════ */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 380px' }, gap: 2, alignItems: 'start' }}>

        {/* ── IZQUIERDA ── */}
        <Box>
          {/* ─── VISTA LISTA ─── */}
          {view === 'LISTA' && (
            <Paper elevation={0} sx={{ width: '100%', overflow: 'auto', borderRadius: 3 }}>
              <Table size="small" sx={{ minWidth: 800 }}>
                <TableHead>
                  <TableRow sx={ps.tableHeaderRow}>
                    <TableCell>Ubicacion</TableCell>
                    <TableCell align="center">Estado</TableCell>
                    <TableCell align="center">Nivel</TableCell>
                    <TableCell align="center">Tipo</TableCell>
                    <TableCell align="center">Cap.</TableCell>
                    <TableCell>Notas / Motivo</TableCell>
                    <TableCell align="center">Accion</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((l, idx) => {
                    const st = l._state
                    const isHi = highlightKey && l._key === highlightKey
                    const isStale = staleLocationIds.has(l._id || l.id)
                    const noteText = l.blocked ? `Motivo: ${l.blockedReason || 'Bloqueado'}` : (l.notes || '—')
                    return (
                      <TableRow key={l._id} hover onClick={() => openDetail(l)}
                        sx={{ cursor: 'pointer', outline: isHi ? '2px solid rgba(59,130,246,.85)' : 'none', ...ps.tableRow(idx) }}>
                        <TableCell>
                          <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13 }}>
                            {l.code || `${l.height}${String(l.slot).padStart(2, '0')}-${l.rackCode}-${l._slot3}`}
                          </Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            Zona: <b>{l._area}</b> · Rack: <b>{l.rackCode}</b>
                          </Typography>
                        </TableCell>
                        <TableCell align="center">
                          <Stack direction="row" spacing={.5} alignItems="center" justifyContent="center">
                            {stateIcon(st)}
                            <Chip size="small" label={st} sx={{ ...chipSxForState(st, isDark), fontWeight: 800, fontSize: 11 }} />
                          </Stack>
                          {isStale && (
                            <Chip size="small" label="Sin mov." icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                              sx={{ mt: .5, fontSize: 10, bgcolor: isDark ? 'rgba(245,158,11,.12)' : 'rgba(245,158,11,.08)', color: isDark ? '#FCD34D' : '#92400E' }} />
                          )}
                        </TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>
                          {l.height} <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>{HEIGHT_LABEL[l.height] || ''}</Typography>
                        </TableCell>
                        <TableCell align="center" sx={ps.cellText}>{l.type || 'RACK'}</TableCell>
                        <TableCell align="center" sx={{ fontWeight: 800 }}>{l.maxPallets || 1}</TableCell>
                        <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Tooltip title={noteText}><span style={{ fontSize: 13 }}>{noteText}</span></Tooltip>
                        </TableCell>
                        <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                          <Stack direction="row" spacing={.5} justifyContent="center">
                            <Tooltip title="Editar">
                              <IconButton size="small" onClick={() => openEdit(l)} sx={ps.actionBtn('primary')}><EditIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            {canEdit && st !== 'BLOQUEADO' && (
                              <Tooltip title="Bloquear">
                                <IconButton size="small" onClick={() => { setSelected(l); setReason('Mantenimiento'); block() }} sx={ps.actionBtn('error')}><LockIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            {canEdit && st === 'BLOQUEADO' && (
                              <Tooltip title="Desbloquear">
                                <IconButton size="small" onClick={() => { setSelected(l); unblock() }} sx={ps.actionBtn('success')}><LockOpenIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                          </Stack>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {!filtered.length && (
                    <TableRow><TableCell colSpan={7} sx={ps.emptyText}>{loading ? 'Cargando...' : 'Sin ubicaciones para estos filtros.'}</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </Paper>
          )}

          {/* ─── VISTA MAPA ─── */}
          {view === 'MAPA' && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mb: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography sx={{ fontWeight: 900 }}>
                    Rack {rackForMap || '—'}
                  </Typography>
                  <Chip size="small" label={rackToArea(rackForMap)} sx={{ ...ps.metricChip('info'), fontWeight: 800 }} />
                  {rackDetailLoading && <CircularProgress size={18} />}
                </Stack>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" label="VACIO" sx={chipSxForState('VACIO', isDark)} />
                  <Chip size="small" label="OCUPADO" sx={chipSxForState('OCUPADO', isDark)} />
                  <Chip size="small" label="BLOQUEADO" sx={chipSxForState('BLOQUEADO', isDark)} />
                  <Button size="small" startIcon={<OpenInNewIcon />}
                    onClick={() => navigate(`/racks?rackCode=${rackForMap}`)} sx={{ fontSize: 12 }}>
                    Abrir en Racks
                  </Button>
                </Stack>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {!rackForMap ? (
                <Typography sx={{ opacity: .75 }}>No hay resultados. Busca un rack (ej: <b>F059</b>).</Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  {/* Header de slots */}
                  <Box sx={{ display: 'grid', gridTemplateColumns: '70px repeat(12, 1fr)', gap: 1, alignItems: 'center', mb: .5 }}>
                    <Box />
                    {SLOTS.map(s => (
                      <Typography key={s} sx={{ fontSize: 12, opacity: .8, fontWeight: 900, textAlign: 'center' }}>
                        {String(s).padStart(3, '0')}
                      </Typography>
                    ))}
                  </Box>

                  {HEIGHTS.map(h => (
                    <Box key={h} sx={{ display: 'grid', gridTemplateColumns: '70px repeat(12, 1fr)', gap: 1, alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 900, opacity: .9, fontSize: 13 }}>
                        {h} <Typography variant="caption" sx={{ display: 'block', fontSize: 9, color: 'text.secondary' }}>{HEIGHT_LABEL[h]}</Typography>
                      </Typography>

                      {SLOTS.map(s => {
                        const slot3 = String(s).padStart(3, '0')
                        const l = mapForRack.get(`${h}-${slot3}`)
                        const st = l?._state || l?.state || 'VACIO'
                        const key = `${h}-${rackForMap}-${slot3}`
                        const isHi = highlightKey && highlightKey === key
                        const hasPallet = l?.pallet

                        return (
                          <Box key={slot3} role="button" onClick={() => l && openDetail(l)}
                            sx={{
                              cursor: l ? 'pointer' : 'default', p: .8, borderRadius: 2, textAlign: 'center',
                              bgcolor: cellBgForState(st, isDark),
                              border: isHi ? '2px solid rgba(59,130,246,.85)' : (isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.15)'),
                              transition: 'transform .08s ease, box-shadow .12s ease',
                              '&:hover': l ? { transform: 'translateY(-1px)', boxShadow: '0 8px 20px rgba(0,0,0,.20)' } : {}
                            }}>
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 11 }}>{h}-{slot3}</Typography>
                            <Typography sx={{ fontWeight: 800, fontSize: 10, opacity: .9, color: st === 'OCUPADO' ? (isDark ? '#86EFAC' : '#166534') : st === 'BLOQUEADO' ? (isDark ? '#FCA5A5' : '#991B1B') : 'text.secondary' }}>
                              {st}
                            </Typography>
                            {hasPallet && (
                              <Typography sx={{ fontFamily: 'monospace', fontSize: 9, fontWeight: 700, color: isDark ? '#93C5FD' : '#1E40AF', mt: .2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {hasPallet.code?.slice(0, 8) || ''}
                              </Typography>
                            )}
                          </Box>
                        )
                      })}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {/* ─── VISTA RESUMEN ─── */}
          {view === 'RESUMEN' && (
            <Box>
              {/* Ocupación por zona */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
                <Typography sx={{ fontWeight: 900, mb: 2 }}>Ocupacion por Zona</Typography>
                {zoneSummary.map(z => {
                  const pct = z.total ? Math.round((z.OCUPADO / z.total) * 100) : 0
                  const blkPct = z.total ? Math.round((z.BLOQUEADO / z.total) * 100) : 0
                  return (
                    <Box key={z.zone} sx={{ mb: 2, cursor: 'pointer' }} onClick={() => { setArea(z.zone); setView('LISTA') }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: .5 }}>
                        <Typography sx={{ fontWeight: 800, fontSize: 14 }}>{z.zone}</Typography>
                        <Stack direction="row" spacing={1}>
                          <Chip size="small" label={`${z.total} ubic.`} sx={ps.metricChip('default')} />
                          <Chip size="small" label={`${pct}% ocup.`} sx={ps.metricChip(pct > 80 ? 'bad' : pct > 50 ? 'warn' : 'ok')} />
                          {z.BLOQUEADO > 0 && <Chip size="small" label={`${z.BLOQUEADO} bloq.`} sx={ps.metricChip('bad')} />}
                        </Stack>
                      </Stack>
                      <Box sx={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden', bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)' }}>
                        <Box sx={{ width: `${pct}%`, bgcolor: '#22c55e', transition: 'width .3s ease' }} />
                        <Box sx={{ width: `${blkPct}%`, bgcolor: '#ef4444', transition: 'width .3s ease' }} />
                      </Box>
                    </Box>
                  )
                })}
              </Paper>

              {/* Resumen por rack */}
              <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
                <Typography sx={{ fontWeight: 900, mb: 1 }}>
                  Resumen por Rack <span style={{ opacity: .7, fontWeight: 800 }}>(segun filtros)</span>
                </Typography>
                <Divider sx={{ my: 1.5 }} />

                {perRackSummary.length === 0 ? (
                  <Typography sx={{ opacity: .75 }}>No hay datos para resumir.</Typography>
                ) : (
                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
                    {perRackSummary.map(rk => {
                      const occPct = rk.total ? Math.round((rk.OCUPADO / rk.total) * 100) : 0
                      const barColor = occPct > 85 ? '#ef4444' : occPct > 60 ? '#f59e0b' : '#22c55e'
                      return (
                        <Paper key={rk.rackCode} elevation={0}
                          sx={{ p: 2, borderRadius: 3, cursor: 'pointer', transition: 'transform .1s', '&:hover': { transform: 'translateY(-2px)' },
                            borderLeft: `4px solid ${barColor}` }}
                          onClick={() => { setRack(rk.rackCode); setArea(rackToArea(rk.rackCode)); setView('MAPA') }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{rk.rackCode}</Typography>
                            <Chip size="small" label={`${occPct}%`} sx={{ fontWeight: 900, bgcolor: `${barColor}22`, color: barColor, border: `1px solid ${barColor}44` }} />
                          </Stack>
                          <LinearProgress variant="determinate" value={occPct}
                            sx={{ mt: 1, mb: 1, height: 6, borderRadius: 3, bgcolor: isDark ? 'rgba(255,255,255,.06)' : 'rgba(0,0,0,.06)',
                              '& .MuiLinearProgress-bar': { bgcolor: barColor, borderRadius: 3 } }} />
                          <Stack direction="row" spacing={.5} flexWrap="wrap" useFlexGap>
                            <Chip size="small" label={`V ${rk.VACIO}`} sx={{ ...chipSxForState('VACIO', isDark), fontSize: 11 }} />
                            <Chip size="small" label={`O ${rk.OCUPADO}`} sx={{ ...chipSxForState('OCUPADO', isDark), fontSize: 11 }} />
                            {rk.BLOQUEADO > 0 && <Chip size="small" label={`B ${rk.BLOQUEADO}`} sx={{ ...chipSxForState('BLOQUEADO', isDark), fontSize: 11 }} />}
                          </Stack>
                        </Paper>
                      )
                    })}
                  </Box>
                )}
              </Paper>
            </Box>
          )}
        </Box>

        {/* ── DERECHA: PANEL DETALLE (desktop) ── */}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, position: 'sticky', top: 92 }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Detalle de Ubicacion</Typography>
            <Divider sx={{ mb: 1.5 }} />

            {!detailItem ? (
              <Typography sx={{ opacity: .65, fontSize: 13 }}>
                Selecciona una ubicacion de la lista o mapa para ver detalles.
              </Typography>
            ) : (
              <Box>
                {/* Location code */}
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16, mb: 1 }}>{detailItem.code}</Typography>

                {/* State + zone chips */}
                <Stack direction="row" spacing={.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                  <Chip size="small" icon={stateIcon(detailItem._state)} label={detailItem._state} sx={{ ...chipSxForState(detailItem._state, isDark), fontWeight: 900 }} />
                  <Chip size="small" label={`Rack ${detailItem.rackCode}`} sx={{ ...ps.metricChip('default'), fontWeight: 800 }} />
                  <Chip size="small" label={`${detailItem.height} (${HEIGHT_LABEL[detailItem.height] || ''})`} sx={{ ...ps.metricChip('default'), fontWeight: 800 }} />
                  <Chip size="small" label={detailItem._area} sx={{ ...ps.metricChip('info'), fontWeight: 800 }} />
                </Stack>

                {/* Property grid */}
                <Box sx={{ display: 'grid', gridTemplateColumns: '100px 1fr', rowGap: .8, columnGap: 1, mb: 1.5 }}>
                  <Typography sx={{ opacity: .6, fontSize: 12 }}>Tipo</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{detailItem.type || 'RACK'}</Typography>
                  <Typography sx={{ opacity: .6, fontSize: 12 }}>Capacidad</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800 }}>{detailItem.maxPallets || 1} pallet(s)</Typography>
                  <Typography sx={{ opacity: .6, fontSize: 12 }}>Notas</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 700 }}>
                    {detailItem.blocked ? `Bloqueado: ${detailItem.blockedReason || 'Sin motivo'}` : (detailItem.notes || '—')}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                {/* Pallet info */}
                <Typography sx={{ fontWeight: 800, fontSize: 13, mb: 1 }}>
                  <LocalShippingIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: .5 }} />
                  Pallet en esta ubicacion
                </Typography>

                {detailLoading ? (
                  <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>
                ) : !detailPallet ? (
                  <Typography sx={{ opacity: .6, fontSize: 12, fontStyle: 'italic' }}>Sin pallet asignado (ubicacion vacia).</Typography>
                ) : (
                  <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, mb: 1 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 13 }}>{detailPallet.code}</Typography>
                    <Box sx={{ display: 'grid', gridTemplateColumns: '70px 1fr', rowGap: .5, mt: .5 }}>
                      <Typography sx={{ opacity: .6, fontSize: 11 }}>Status</Typography>
                      <Chip size="small" label={detailPallet.status || 'IN_STOCK'} sx={{ ...ps.metricChip(detailPallet.status === 'IN_STOCK' ? 'ok' : 'warn'), fontSize: 10, height: 20 }} />
                      <Typography sx={{ opacity: .6, fontSize: 11 }}>Lote</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{detailPallet.lot || '—'}</Typography>
                      <Typography sx={{ opacity: .6, fontSize: 11 }}>SKU</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{detailPallet.sku || (detailPallet.items?.[0]?.sku) || '—'}</Typography>
                      <Typography sx={{ opacity: .6, fontSize: 11 }}>Cantidad</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700 }}>{detailPallet.qty ?? (detailPallet.items?.reduce((a, i) => a + (i.qty || 0), 0)) ?? '—'}</Typography>
                    </Box>
                  </Paper>
                )}

                {/* Recent movements */}
                {detailMovements.length > 0 && (
                  <>
                    <Typography sx={{ fontWeight: 800, fontSize: 13, mt: 1.5, mb: 1 }}>
                      <HistoryIcon sx={{ fontSize: 16, verticalAlign: 'middle', mr: .5 }} />
                      Ultimos Movimientos
                    </Typography>
                    {detailMovements.slice(0, 3).map((mv, i) => (
                      <Box key={mv.id || i} sx={{ display: 'flex', gap: 1, mb: .8, alignItems: 'flex-start' }}>
                        <Box sx={{ width: 8, height: 8, borderRadius: '50%', mt: .6, flexShrink: 0,
                          bgcolor: mv.type === 'IN' ? '#22c55e' : mv.type === 'OUT' ? '#ef4444' : mv.type === 'TRANSFER' ? '#3b82f6' : '#f59e0b' }} />
                        <Box sx={{ flex: 1 }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 800 }}>
                            {mv.type} · {dayjs(mv.createdAt).format('DD/MM HH:mm')}
                          </Typography>
                          <Typography sx={{ fontSize: 10, color: 'text.secondary' }}>
                            {mv.user?.email || '—'}{mv.note ? ` · ${mv.note}` : ''}
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                    {detailPallet?.id && (
                      <Button size="small" startIcon={<HistoryIcon />} onClick={() => openHistory(detailPallet.id)} sx={{ fontSize: 11, mt: .5 }}>
                        Ver historial completo
                      </Button>
                    )}
                  </>
                )}

                <Divider sx={{ my: 1.5 }} />

                {/* Actions */}
                <Stack spacing={1}>
                  <Button fullWidth variant="outlined" size="small" startIcon={<EditIcon />}
                    onClick={() => openEdit(detailItem)} sx={{ borderRadius: 2, justifyContent: 'flex-start' }}>
                    Editar ubicacion
                  </Button>
                  {canEdit && detailItem._state !== 'BLOQUEADO' && (
                    <Button fullWidth variant="outlined" size="small" color="error" startIcon={<LockIcon />}
                      onClick={() => { openEdit(detailItem) }} sx={{ borderRadius: 2, justifyContent: 'flex-start' }}>
                      Bloquear
                    </Button>
                  )}
                  {canEdit && detailItem._state === 'BLOQUEADO' && (
                    <Button fullWidth variant="outlined" size="small" color="success" startIcon={<LockOpenIcon />}
                      onClick={() => { setSelected(detailItem); unblock() }} sx={{ borderRadius: 2, justifyContent: 'flex-start' }}>
                      Desbloquear
                    </Button>
                  )}
                  <Button fullWidth variant="outlined" size="small" startIcon={<OpenInNewIcon />}
                    onClick={() => navigate(`/racks?rackCode=${detailItem.rackCode}`)} sx={{ borderRadius: 2, justifyContent: 'flex-start' }}>
                    Ver rack completo
                  </Button>
                  {detailPallet?.id && (
                    <Button fullWidth variant="outlined" size="small" startIcon={<HistoryIcon />}
                      onClick={() => openHistory(detailPallet.id)} sx={{ borderRadius: 2, justifyContent: 'flex-start' }}>
                      Historial de movimientos
                    </Button>
                  )}
                </Stack>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* ══════ MODAL DETALLE (mobile/tablet) ══════ */}
      <Dialog open={detailOpen && isMobile} onClose={() => setDetailOpen(false)} fullScreen>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Detalle de ubicacion
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => setDetailOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent>
          {!detailItem ? (
            <Typography sx={{ opacity: .75 }}>Sin seleccion.</Typography>
          ) : (
            <Box>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18 }}>{detailItem.code}</Typography>
              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                <Chip size="small" label={detailItem._state} sx={{ ...chipSxForState(detailItem._state, isDark), fontWeight: 900 }} />
                <Chip size="small" label={`Rack ${detailItem.rackCode}`} sx={{ ...ps.metricChip('default'), fontWeight: 900 }} />
                <Chip size="small" label={detailItem._area} sx={{ ...ps.metricChip('info'), fontWeight: 900 }} />
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* Pallet info mobile */}
              {detailLoading ? (
                <Stack alignItems="center" sx={{ py: 2 }}><CircularProgress size={24} /></Stack>
              ) : detailPallet ? (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
                  <Typography sx={{ fontWeight: 800, mb: 1 }}>Pallet: {detailPallet.code}</Typography>
                  <Typography variant="body2">Status: {detailPallet.status}</Typography>
                  <Typography variant="body2">Lote: {detailPallet.lot || '—'}</Typography>
                  <Typography variant="body2">SKU: {detailPallet.sku || (detailPallet.items?.[0]?.sku) || '—'}</Typography>
                </Paper>
              ) : (
                <Typography sx={{ opacity: .6, mb: 2, fontStyle: 'italic' }}>Sin pallet asignado.</Typography>
              )}

              <Stack spacing={1}>
                <Button variant="contained" startIcon={<EditIcon />} onClick={() => openEdit(detailItem)} fullWidth>Editar</Button>
                <Button variant="outlined" startIcon={<OpenInNewIcon />} onClick={() => navigate(`/racks?rackCode=${detailItem.rackCode}`)} fullWidth>Ver rack</Button>
                {detailPallet?.id && (
                  <Button variant="outlined" startIcon={<HistoryIcon />} onClick={() => openHistory(detailPallet.id)} fullWidth>Historial</Button>
                )}
              </Stack>
            </Box>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setDetailOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* ══════ MODAL HISTORIAL DE MOVIMIENTOS ══════ */}
      <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Historial de Movimientos
          <IconButton onClick={() => setHistoryOpen(false)} sx={{ position: 'absolute', right: 8, top: 8 }}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading ? (
            <Stack alignItems="center" sx={{ py: 4 }}><CircularProgress /></Stack>
          ) : historyMovements.length === 0 ? (
            <Typography sx={{ opacity: .6, textAlign: 'center', py: 4 }}>Sin movimientos registrados.</Typography>
          ) : (
            <Table size="small">
              <TableHead>
                <TableRow sx={ps.tableHeaderRow}>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Desde</TableCell>
                  <TableCell>Hacia</TableCell>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Nota</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyMovements.map((mv, i) => (
                  <TableRow key={mv.id || i} sx={ps.tableRow(i)}>
                    <TableCell sx={{ fontSize: 12 }}>{dayjs(mv.createdAt).format('DD/MM/YY HH:mm')}</TableCell>
                    <TableCell>
                      <Chip size="small" label={mv.type}
                        sx={{ fontWeight: 800, fontSize: 11,
                          bgcolor: mv.type === 'IN' ? 'rgba(34,197,94,.12)' : mv.type === 'OUT' ? 'rgba(239,68,68,.12)' : mv.type === 'TRANSFER' ? 'rgba(59,130,246,.12)' : 'rgba(245,158,11,.12)',
                          color: mv.type === 'IN' ? '#166534' : mv.type === 'OUT' ? '#991B1B' : mv.type === 'TRANSFER' ? '#1D4ED8' : '#92400E',
                        }} />
                    </TableCell>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{mv.fromLocation?.code || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, fontFamily: 'monospace' }}>{mv.toLocation?.code || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12 }}>{mv.user?.email || '—'}</TableCell>
                    <TableCell sx={{ fontSize: 12, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={mv.note || ''}><span>{mv.note || '—'}</span></Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions><Button onClick={() => setHistoryOpen(false)}>Cerrar</Button></DialogActions>
      </Dialog>

      {/* ══════ DIALOG EDITAR ══════ */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>Editar ubicacion</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ opacity: .8, mb: 2 }}>
            {selected ? `${selected.code} · Rack ${selected.rackCode} · ${selected.height} · Slot ${String(selected.slot).padStart(3, '0')}` : ''}
          </Typography>
          <Stack spacing={2}>
            <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value)} sx={ps.inputSx}>
              {['RACK', 'FLOOR', 'QUARANTINE', 'RETURNS'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Capacidad (max tarimas)" type="number" value={maxPallets} onChange={(e) => setMaxPallets(e.target.value)} sx={ps.inputSx} />
            <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} multiline rows={2} sx={ps.inputSx} />
            <Divider />
            <TextField label="Motivo de bloqueo" value={reason} onChange={(e) => setReason(e.target.value)} sx={ps.inputSx}
              helperText="Solo aplica al bloquear" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
          <Box sx={{ flex: 1 }} />
          <Button disabled={!canEdit} color="error" variant="outlined" startIcon={<LockIcon />} onClick={block}>Bloquear</Button>
          <Button disabled={!canEdit} color="success" variant="outlined" startIcon={<LockOpenIcon />} onClick={unblock}>Desbloquear</Button>
          <Button disabled={!canEdit} variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
