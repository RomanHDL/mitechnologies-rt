import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
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

/** =========================
 *  ZONAS por rango de rack
 *  ========================= */
const ZONE_RULES = [
  { zone: 'MIDEA', from: 1, to: 12 },
  { zone: 'ALMACEN', from: 16, to: 47 },
  { zone: 'BOX', from: 67, to: 70 },
  { zone: 'INSUMOS', from: 71, to: 78 },
  { zone: 'LAMPARAS', from: 110, to: 118 },
]

// Opciones del filtro "Área (zona)"
const AREAS = ['MIDEA', 'ALMACEN', 'BOX', 'INSUMOS', 'LAMPARAS', 'SIN ZONA']

// UI label para alturas (tu DB usa A/B/C)
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

// extrae rack/level/pos desde code si viniera así (fallback)
function parseCodeFallback(code) {
  const c = String(code || '').trim().toUpperCase()

  // ejemplo: A01-F059-012  -> level=A rack=F059 pos=12
  let m = c.match(/^([A-Z])\d{2}-(F\d{3})-(\d{3})$/)
  if (m) return { level: m[1], rack: m[2], position: Number(m[3]) }

  // ejemplo: FFT-ACC-F001-001 -> rack F001 pos 1 (level desconocido)
  m = c.match(/(F\d{3})-(\d{3})$/)
  if (m) return { rack: m[1], position: Number(m[2]) }

  return {}
}

// Acepta:
// - A-F059-012 (nuevo formato real)
// - A1-F059-012 (por compatibilidad vieja; A1 aquí se ignora para altura)
// - A F59 12
// - F059 / 59 (solo rack)
function smartParse(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return null

  // A-F059-012
  let m = raw.match(/^([A-C])-(F\d{3})-(\d{3})$/)
  if (m) return { height: m[1], rackCode: m[2], slot: Number(m[3]) }

  const cleaned = raw.replace(/[_/\\]+/g, ' ').replace(/-+/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)

  if (parts.length === 1) {
    const rk = normalizeRackCode(parts[0])
    if (/^F\d{3}$/.test(rk)) return { rackCode: rk }
    return null
  }

  // A F59 12
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

function chipSxForState(st, isDark = false) {
  if (st === 'OCUPADO') return { bgcolor: 'rgba(34,197,94,.18)', border: '1px solid rgba(34,197,94,.25)', color: isDark ? '#e5e7eb' : '#1b5e20' }
  if (st === 'BLOQUEADO') return { bgcolor: 'rgba(239,68,68,.16)', border: '1px solid rgba(239,68,68,.25)', color: isDark ? '#e5e7eb' : '#b71c1c' }
  return { bgcolor: isDark ? 'rgba(148,163,184,.16)' : 'rgba(21,101,192,.10)', border: isDark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(21,101,192,.20)', color: isDark ? '#e5e7eb' : '#1565C0' }
}

function cellBgForState(st, isDark = false) {
  if (st === 'OCUPADO') return 'rgba(34,197,94,.14)'
  if (st === 'BLOQUEADO') return 'rgba(239,68,68,.12)'
  return isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.04)'
}

export default function LocationsPage() {
  const { token, user } = useAuth()
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(user?.role)
  const client = useMemo(() => api(token), [token])

  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // filtros
  const [area, setArea] = useState('MIDEA')
  const [rack, setRack] = useState('')
  const [state, setState] = useState('')
  const [q, setQ] = useState('')

  // vista
  const [view, setView] = useState('LISTA')

  // highlight / detalle
  const [highlightKey, setHighlightKey] = useState(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailItem, setDetailItem] = useState(null)

  // dialog editar/bloquear
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [type, setType] = useState('RACK')
  const [maxPallets, setMaxPallets] = useState(1)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('Mantenimiento')

  const load = async () => {
    setLoading(true)
    try {
      const res = await client.get('/api/locations')
      setRows(Array.isArray(res.data) ? res.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  // ✅ cuando cambia rack manualmente: ajustar zona automáticamente
  useEffect(() => {
    if (!rack) return
    const zone = rackToArea(rack)
    if (zone && zone !== area) setArea(zone)
  }, [rack]) // a propósito sin "area" para evitar loops

  // ✅ adaptar lo que viene de DB a lo que tu UI espera
  const enriched = useMemo(() => {
    return (rows || []).map((l) => {
      const fallback = parseCodeFallback(l.code)

      const rackCode = String(l.rackCode || l.rack || fallback.rack || '').toUpperCase()
      const height = String(l.level || fallback.level || '').toUpperCase() // A/B/C
      const slot = Number(l.position ?? fallback.position ?? 0) // 1..12

      const slot3 = String(slot || 0).padStart(3, '0')

      // ✅ zona calculada (si tu backend luego trae l.area, aquí puedes priorizarlo)
      const computedArea = rackToArea(rackCode)

      const key = `${height}-${rackCode}-${slot3}`

      return {
        ...l,
        _id: l.id ?? l._id ?? l.code, // fallback seguro
        rackCode,
        height,
        slot,
        _area: computedArea,
        _state: l.state || 'VACIO',
        _slot3: slot3,
        _key: key,
      }
    })
  }, [rows])

  const filtered = useMemo(() => {
    let list = enriched
    if (area) list = list.filter(l => l._area === area)
    if (rack) list = list.filter(l => String(l.rackCode).toUpperCase() === String(rack).toUpperCase())
    if (state) list = list.filter(l => l._state === state)
    return list
  }, [enriched, area, rack, state])

  const summary = useMemo(() => {
    const s = { total: filtered.length, VACIO: 0, OCUPADO: 0, BLOQUEADO: 0 }
    for (const l of filtered) {
      const st = l._state
      if (s[st] !== undefined) s[st]++
    }
    return s
  }, [filtered])

  const perRackSummary = useMemo(() => {
    const map = new Map()
    for (const l of filtered) {
      const rk = String(l.rackCode).toUpperCase()
      if (!rk) continue
      if (!map.has(rk)) map.set(rk, { rackCode: rk, total: 0, VACIO: 0, OCUPADO: 0, BLOQUEADO: 0 })
      const o = map.get(rk)
      o.total++
      o[l._state] = (o[l._state] || 0) + 1
    }
    return Array.from(map.values()).sort((a, b) => a.rackCode.localeCompare(b.rackCode))
  }, [filtered])

  const openEdit = (l) => {
    setSelected(l)
    setType(l.type || 'RACK')
    setMaxPallets(l.maxPallets || 1)
    setNotes(l.notes || '')
    setReason(l.blockedReason || 'Mantenimiento')
    setOpen(true)
  }

  const save = async () => {
    await client.patch(`/api/locations/${selected._id}`, { type, maxPallets: Number(maxPallets), notes })
    await load()
    setOpen(false)
  }

  const block = async () => {
    await client.patch(`/api/locations/${selected._id}/block`, { reason })
    await load()
    setOpen(false)
  }

  const unblock = async () => {
    await client.patch(`/api/locations/${selected._id}/unblock`)
    await load()
    setOpen(false)
  }

  const clearFilters = () => {
    setArea('MIDEA')
    setRack('')
    setState('')
    setQ('')
    setHighlightKey(null)
  }

  const openDetail = (l) => {
    setDetailItem(l)
    setDetailOpen(true)
  }

  const applySmartSearch = () => {
    const parsed = smartParse(q)
    if (!parsed) return

    if (parsed.rackCode && !parsed.height) {
      // solo rack
      setRack(parsed.rackCode)
      setArea(rackToArea(parsed.rackCode))
      setState('')
      setHighlightKey(null)
      setView('MAPA')
      return
    }

    // búsqueda exacta height+rack+slot
    setRack(parsed.rackCode)
    setArea(rackToArea(parsed.rackCode))
    setState('')
    const slot3 = String(parsed.slot).padStart(3, '0')
    const key = `${parsed.height}-${parsed.rackCode}-${slot3}`
    setHighlightKey(key)
    setView('MAPA')

    const found = enriched.find(x => x._key === key)
    if (found) {
      openDetail(found)
      setTimeout(() => setHighlightKey(null), 4000)
    } else {
      setTimeout(() => setHighlightKey(null), 4000)
    }
  }

  const kpiClick = (k) => {
    if (k === 'TOTAL') setState('')
    if (k === 'VACIO') setState('VACIO')
    if (k === 'OCUPADO') setState('OCUPADO')
    if (k === 'BLOQUEADO') setState('BLOQUEADO')
  }

  const rackForMap = useMemo(() => {
    if (rack) return String(rack).toUpperCase()
    const first = filtered[0]?.rackCode
    return first ? String(first).toUpperCase() : ''
  }, [rack, filtered])

  const mapForRack = useMemo(() => {
    const m = new Map()
    for (const l of filtered) {
      if (String(l.rackCode).toUpperCase() !== rackForMap) continue
      m.set(`${l.height}-${String(l.slot).padStart(3, '0')}`, l)
    }
    return m
  }, [filtered, rackForMap])

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Ubicaciones</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={view === 'LISTA' ? 'Lista' : view === 'MAPA' ? 'Mapa' : 'Resumen'}
            sx={{ ...chipSxForState('VACIO', isDark), fontWeight: 900 }}
          />
        </Stack>
      </Box>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        {!canEdit && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Solo ADMIN/SUPERVISOR puede editar ubicaciones y bloquear/desbloquear.
          </Alert>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            size="small"
            label='Buscar ubicación / rack (ej: A-F059-012 | A F59 12 | F059)'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySmartSearch()}
            sx={{ flex: 1 }}
          />
          <Button variant="contained" onClick={applySmartSearch} sx={{ minWidth: 140 }}>
            Buscar / Ir
          </Button>

          <Tooltip title="Limpiar filtros">
            <IconButton onClick={clearFilters} sx={{ bgcolor: isDark ? 'rgba(255,255,255,.07)' : 'rgba(21,101,192,.08)', border: isDark ? '1px solid rgba(255,255,255,.12)' : '1px solid rgba(21,101,192,.20)' }}>
              <RestartAltIcon color="primary" />
            </IconButton>
          </Tooltip>

          <Button size="small" onClick={load} disabled={loading} sx={{ minWidth: 120 }}>
            {loading ? 'Cargando...' : 'Recargar'}
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField select size="small" label="Área (zona)" value={area} onChange={(e) => setArea(e.target.value)} sx={{ minWidth: 180 }}>
            {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>

          <TextField
            select
            size="small"
            label="Rack"
            value={rack}
            onChange={(e) => {
              const nextRack = e.target.value
              setRack(nextRack)
              if (nextRack) setArea(rackToArea(nextRack)) // ✅ FIX: cambia zona al elegir rack
            }}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {rackOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          <TextField
            select
            size="small"
            label="Estado"
            value={state}
            onChange={(e) => setState(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="VACIO">VACÍO</MenuItem>
            <MenuItem value="OCUPADO">OCUPADO</MenuItem>
            <MenuItem value="BLOQUEADO">BLOQUEADO</MenuItem>
          </TextField>

          <Box sx={{ flex: 1 }} />

          <Stack direction="row" spacing={1}>
            <Button
              variant={view === 'LISTA' ? 'contained' : 'outlined'}
              startIcon={<ViewListIcon />}
              onClick={() => setView('LISTA')}
              sx={{ borderRadius: 2 }}
            >
              Lista
            </Button>
            <Button
              variant={view === 'MAPA' ? 'contained' : 'outlined'}
              startIcon={<GridViewIcon />}
              onClick={() => setView('MAPA')}
              sx={{ borderRadius: 2 }}
            >
              Mapa
            </Button>
            <Button
              variant={view === 'RESUMEN' ? 'contained' : 'outlined'}
              startIcon={<InsightsIcon />}
              onClick={() => setView('RESUMEN')}
              sx={{ borderRadius: 2 }}
            >
              Resumen
            </Button>
          </Stack>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip
            clickable
            onClick={() => kpiClick('TOTAL')}
            size="small"
            label={`Total: ${summary.total}`}
            sx={{
              bgcolor: state === '' ? 'rgba(21,101,192,.22)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
              border: isDark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(21,101,192,.20)',
              color: isDark ? '#e5e7eb' : '#1565C0',
              fontWeight: 900,
            }}
          />
          <Chip
            clickable
            onClick={() => kpiClick('VACIO')}
            size="small"
            label={`VACÍO: ${summary.VACIO}`}
            sx={{
              ...chipSxForState('VACIO', isDark),
              bgcolor: state === 'VACIO' ? (isDark ? 'rgba(148,163,184,.28)' : 'rgba(21,101,192,.20)') : chipSxForState('VACIO', isDark).bgcolor,
              fontWeight: 900,
            }}
          />
          <Chip
            clickable
            onClick={() => kpiClick('OCUPADO')}
            size="small"
            label={`OCUPADO: ${summary.OCUPADO}`}
            sx={{
              ...chipSxForState('OCUPADO', isDark),
              bgcolor: state === 'OCUPADO' ? 'rgba(34,197,94,.28)' : chipSxForState('OCUPADO', isDark).bgcolor,
              fontWeight: 900,
            }}
          />
          <Chip
            clickable
            onClick={() => kpiClick('BLOQUEADO')}
            size="small"
            label={`BLOQUEADO: ${summary.BLOQUEADO}`}
            sx={{
              ...chipSxForState('BLOQUEADO', isDark),
              bgcolor: state === 'BLOQUEADO' ? 'rgba(239,68,68,.26)' : chipSxForState('BLOQUEADO', isDark).bgcolor,
              fontWeight: 900,
            }}
          />
        </Stack>
      </Paper>

      {/* ====== CONTENIDO: LISTA / MAPA / RESUMEN + PANEL DETALLE ====== */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' },
        gap: 2,
        alignItems: 'start'
      }}>
        {/* IZQ */}
        <Box>
          {view === 'LISTA' && (
            <Paper elevation={0} sx={{ width: '100%', overflow: 'auto', borderRadius: 3, mb: 2 }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <Box component="thead" sx={{ background: isDark ? 'rgba(15,23,42,.65)' : 'rgba(21,101,192,.07)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <Box component="tr">
                    <Box component="th" sx={{ fontWeight: 900, p: 1.5, textAlign: 'left', minWidth: 140, color: isDark ? '#fff' : '#1565C0' }}>Ubicación</Box>
                    <Box component="th" sx={{ fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 110, color: isDark ? '#fff' : '#1565C0' }}>Estado</Box>
                    <Box component="th" sx={{ fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 90, color: isDark ? '#fff' : '#1565C0' }}>Tipo</Box>
                    <Box component="th" sx={{ fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 90, color: isDark ? '#fff' : '#1565C0' }}>Capacidad</Box>
                    <Box component="th" sx={{ fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 160, color: isDark ? '#fff' : '#1565C0' }}>Notas / Motivo</Box>
                    <Box component="th" sx={{ fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 120, color: isDark ? '#fff' : '#1565C0' }}>Acción</Box>
                  </Box>
                </Box>

                <Box component="tbody">
                  {filtered.map((l, idx) => {
                    const st = l._state
                    const areaLabel = l._area
                    const heightLabel = HEIGHT_LABEL[l.height] || l.height

                    let stateIcon = <Inventory2Icon sx={{ color: '#94a3b8', verticalAlign: 'middle' }} fontSize="small" />
                    if (st === 'OCUPADO') stateIcon = <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
                    if (st === 'BLOQUEADO') stateIcon = <BlockIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />

                    const noteText = l.blocked ? `Motivo: ${l.blockedReason || 'Bloqueado'}` : (l.notes || '—')
                    const isHi = highlightKey && l._key === highlightKey

                    return (
                      <Box
                        component="tr"
                        key={l._id}
                        onClick={() => openDetail(l)}
                        sx={{
                          cursor: 'pointer',
                          background: idx % 2 === 0
                            ? (isDark ? 'rgba(255,255,255,.03)' : 'rgba(21,101,192,.025)')
                            : 'transparent',
                          transition: 'background 0.15s ease, box-shadow .15s ease',
                          outline: isHi ? '2px solid rgba(59,130,246,.85)' : 'none',
                          outlineOffset: -2,
                          '&:hover': { background: isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.06)' },
                        }}
                      >
                        <Box component="td" sx={{ p: 1.5, fontFamily: 'monospace', fontWeight: 900 }}>
                          {l.code || `${l.height}${String(l.slot).padStart(2, '0')}-${l.rackCode}-${String(l.slot).padStart(3, '0')}`}
                          <Typography variant="caption" sx={{ display: 'block', opacity: 0.72, fontWeight: 700 }}>
                            Zona: <b>{areaLabel}</b> · Rack: <b>{l.rackCode || '—'}</b> · Altura: <b>{l.height} ({heightLabel})</b> · Slot: <b>{l._slot3}</b>
                          </Typography>
                        </Box>

                        <Box component="td" sx={{ p: 1.5, textAlign: 'center' }}>
                          <Tooltip title={st} arrow>{stateIcon}</Tooltip>
                          <Typography variant="caption" sx={{ display: 'block', fontWeight: 900 }}>{st}</Typography>
                        </Box>

                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', fontWeight: 800 }}>{l.type || 'RACK'}</Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', fontWeight: 800 }}>{l.maxPallets || 1}</Box>

                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          <Tooltip title={noteText} arrow>
                            <span>{noteText.length > 30 ? noteText.slice(0, 30) + '…' : noteText}</span>
                          </Tooltip>
                        </Box>

                        <Box component="td" sx={{ p: 1.5, textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<EditIcon />}
                            onClick={() => openEdit(l)}
                            sx={{ borderRadius: 2 }}
                          >
                            Editar
                          </Button>
                        </Box>
                      </Box>
                    )
                  })}
                </Box>
              </Box>
            </Paper>
          )}

          {view === 'MAPA' && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 900 }}>
                  Mapa del Rack {rackForMap || '—'} <span style={{ opacity: .7, fontWeight: 800 }}>(A/B/C · 001–012)</span>
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" label="VACÍO" sx={{ ...chipSxForState('VACIO', isDark) }} />
                  <Chip size="small" label="OCUPADO" sx={{ ...chipSxForState('OCUPADO', isDark) }} />
                  <Chip size="small" label="BLOQUEADO" sx={{ ...chipSxForState('BLOQUEADO', isDark) }} />
                </Stack>
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              {!rackForMap ? (
                <Typography sx={{ opacity: .75 }}>
                  No hay resultados para mostrar mapa. Ajusta filtros o busca un rack (ej: <b>F059</b>).
                </Typography>
              ) : (
                <Box sx={{ display: 'grid', gap: 1 }}>
                  <Box sx={{ display: 'grid', gridTemplateColumns: '70px repeat(12, 1fr)', gap: 1, alignItems: 'center', mb: 0.5 }}>
                    <Box />
                    {SLOTS.map(s => (
                      <Typography key={s} sx={{ fontSize: 12, opacity: .8, fontWeight: 900, textAlign: 'center' }}>
                        {String(s).padStart(3, '0')}
                      </Typography>
                    ))}
                  </Box>

                  {HEIGHTS.map(h => (
                    <Box key={h} sx={{ display: 'grid', gridTemplateColumns: '70px repeat(12, 1fr)', gap: 1, alignItems: 'center' }}>
                      <Typography sx={{ fontWeight: 900, opacity: .9 }}>
                        {h}
                      </Typography>

                      {SLOTS.map(s => {
                        const slot3 = String(s).padStart(3, '0')
                        const l = mapForRack.get(`${h}-${slot3}`)
                        const st = l?._state || 'VACIO'
                        const key = `${h}-${rackForMap}-${slot3}`
                        const isHi = highlightKey && highlightKey === key

                        return (
                          <Box
                            key={slot3}
                            role="button"
                            onClick={() => l && openDetail(l)}
                            sx={{
                              cursor: l ? 'pointer' : 'default',
                              p: 1,
                              borderRadius: 2,
                              textAlign: 'center',
                              bgcolor: cellBgForState(st, isDark),
                              border: isHi ? '2px solid rgba(59,130,246,.85)' : (isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.15)'),
                              transition: 'transform .08s ease, box-shadow .12s ease',
                              '&:hover': l ? { transform: 'translateY(-1px)', boxShadow: '0 12px 26px rgba(0,0,0,.25)' } : {}
                            }}
                          >
                            <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 12 }}>
                              {h}-{slot3}
                            </Typography>
                            <Typography sx={{ fontWeight: 900, fontSize: 11, opacity: .9 }}>
                              {st}
                            </Typography>
                          </Box>
                        )
                      })}
                    </Box>
                  ))}
                </Box>
              )}
            </Paper>
          )}

          {view === 'RESUMEN' && (
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
              <Typography sx={{ fontWeight: 900, mb: 1 }}>
                Resumen por Rack <span style={{ opacity: .7, fontWeight: 800 }}>(según filtros)</span>
              </Typography>
              <Divider sx={{ my: 1.5 }} />

              {perRackSummary.length === 0 ? (
                <Typography sx={{ opacity: .75 }}>No hay datos para resumir.</Typography>
              ) : (
                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' },
                  gap: 2
                }}>
                  {perRackSummary.map(rk => {
                    const occPct = rk.total ? Math.round((rk.OCUPADO / rk.total) * 100) : 0
                    return (
                      <Paper
                        key={rk.rackCode}
                        elevation={0}
                        sx={{
                          p: 2,
                          borderRadius: 3,
                          cursor: 'pointer',
                          transition: 'transform .1s ease',
                          '&:hover': { transform: 'translateY(-2px)' },
                        }}
                        onClick={() => { setRack(rk.rackCode); setArea(rackToArea(rk.rackCode)); setView('MAPA') }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{rk.rackCode}</Typography>
                          <Chip size="small" label={`${occPct}% Ocup.`} sx={{ bgcolor: 'rgba(21,101,192,.18)', border: '1px solid rgba(21,101,192,.25)', color: isDark ? '#64B5F6' : '#1565C0', fontWeight: 900 }} />
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={`Total ${rk.total}`} sx={{ ...chipSxForState('VACIO', isDark) }} />
                          <Chip size="small" label={`Vacío ${rk.VACIO}`} sx={{ ...chipSxForState('VACIO', isDark) }} />
                          <Chip size="small" label={`Ocupado ${rk.OCUPADO}`} sx={{ ...chipSxForState('OCUPADO', isDark) }} />
                          <Chip size="small" label={`Bloq. ${rk.BLOQUEADO}`} sx={{ ...chipSxForState('BLOQUEADO', isDark) }} />
                        </Stack>

                        <Typography sx={{ mt: 1.2, opacity: .7, fontSize: 12 }}>
                          Click para abrir mapa del rack
                        </Typography>
                      </Paper>
                    )
                  })}
                </Box>
              )}
            </Paper>
          )}
        </Box>

        {/* DER: Panel de detalle (solo en desktop). En tablet se abre como modal. */}
        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Paper elevation={0} sx={{
            p: 2,
            borderRadius: 3,
            position: 'sticky',
            top: 92,
          }}>
            <Typography sx={{ fontWeight: 900 }}>Detalle</Typography>
            <Divider sx={{ my: 1.5 }} />

            {!detailItem ? (
              <Typography sx={{ opacity: .75, fontSize: 13 }}>
                Selecciona una ubicación (lista o mapa) para ver detalles aquí.
              </Typography>
            ) : (
              <Box>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 16 }}>
                  {detailItem.code}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                  <Chip size="small" label={detailItem._state} sx={{ ...chipSxForState(detailItem._state, isDark), fontWeight: 900 }} />
                  <Chip size="small" label={`Rack ${detailItem.rackCode}`} sx={{ ...chipSxForState('VACIO', isDark), fontWeight: 900 }} />
                  <Chip size="small" label={`${detailItem.height}-${detailItem._slot3}`} sx={{ ...chipSxForState('VACIO', isDark), fontWeight: 900 }} />
                  <Chip size="small" label={`Zona ${detailItem._area}`} sx={{ ...chipSxForState('VACIO', isDark), fontWeight: 900 }} />
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, columnGap: 1.5 }}>
                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Zona</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{detailItem._area}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Tipo</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{detailItem.type || 'RACK'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Capacidad</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 900 }}>{detailItem.maxPallets || 1}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Notas/Motivo</Typography>
                  <Typography sx={{ fontSize: 12, fontWeight: 800, opacity: .9 }}>
                    {detailItem.blocked ? `Motivo: ${detailItem.blockedReason || 'Bloqueado'}` : (detailItem.notes || '—')}
                  </Typography>
                </Box>

                <Divider sx={{ my: 1.5 }} />

                <Stack direction="row" spacing={1}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<EditIcon />}
                    onClick={() => openEdit(detailItem)}
                    sx={{ borderRadius: 2 }}
                  >
                    Editar
                  </Button>
                </Stack>

                <Typography sx={{ mt: 1, opacity: .6, fontSize: 11 }}>
                  *Acciones de bloquear/desbloquear/guardar se mantienen en el diálogo de edición.
                </Typography>
              </Box>
            )}
          </Paper>
        </Box>
      </Box>

      {/* MODAL detalle (tablet / mobile) */}
      <Dialog open={detailOpen && isMobile} onClose={() => setDetailOpen(false)} fullScreen>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          Detalle de ubicación
          <Box sx={{ flex: 1 }} />
          <IconButton onClick={() => setDetailOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {!detailItem ? (
            <Typography sx={{ opacity: .75 }}>Sin selección.</Typography>
          ) : (
            <Box>
              <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18 }}>
                {detailItem.code}
              </Typography>

              <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
                <Chip size="small" label={detailItem._state} sx={{ ...chipSxForState(detailItem._state), fontWeight: 900 }} />
                <Chip size="small" label={`Rack ${detailItem.rackCode}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb', fontWeight: 900 }} />
                <Chip size="small" label={`${detailItem.height}-${detailItem._slot3}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb', fontWeight: 900 }} />
                <Chip size="small" label={`Zona ${detailItem._area}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb', fontWeight: 900 }} />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Button variant="contained" startIcon={<EditIcon />} onClick={() => openEdit(detailItem)} fullWidth>
                Editar
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog EDITAR */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar ubicación</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ opacity: .8, mb: 2 }}>
            {selected ? `${selected.code} · Rack ${selected.rackCode} · ${selected.height} · Slot ${String(selected.slot).padStart(3, '0')}` : ''}
          </Typography>
          <Stack spacing={2}>
            <TextField select label="Tipo" value={type} onChange={(e) => setType(e.target.value)}>
              {['RACK', 'FLOOR', 'QUARANTINE', 'RETURNS'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Capacidad (max tarimas)" type="number" value={maxPallets} onChange={(e) => setMaxPallets(e.target.value)} />
            <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} />
            <TextField label="Motivo de bloqueo" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
          <Box sx={{ flex: 1 }} />
          <Button disabled={!canEdit} color="error" onClick={block}>Bloquear</Button>
          <Button disabled={!canEdit} onClick={unblock}>Desbloquear</Button>
          <Button disabled={!canEdit} variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}