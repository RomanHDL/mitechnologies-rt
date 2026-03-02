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

const AREAS = ['A1', 'A2', 'A3', 'A4']

// UI label para alturas (tu DB usa A/B/C)
const HEIGHT_LABEL = { A: 'PLANTA BAJA', B: 'MEDIA', C: 'ALTA' }
const HEIGHTS = ['A', 'B', 'C']
const SLOTS = Array.from({ length: 12 }, (_, i) => i + 1)

// Puedes dejar 125 aquí si en tu DB existen F121..F125
const rackOptions = Array.from({ length: 125 }, (_, i) => `F${String(i + 1).padStart(3, '0')}`)

// ✅ 30 racks por área (120 total). Si hay >120, lo mandamos a A4.
function rackToArea(rackCode) {
  const n = Number(String(rackCode || '').replace(/[^\d]/g, '')) || 0
  if (n >= 1 && n <= 30) return 'A1'
  if (n >= 31 && n <= 60) return 'A2'
  if (n >= 61 && n <= 90) return 'A3'
  if (n >= 91 && n <= 120) return 'A4'
  if (n > 120) return 'A4'
  return 'A1'
}

function normalizeRackCode(input) {
  const s = String(input || '').trim().toUpperCase()
  if (!s) return ''
  if (/^\d{1,3}$/.test(s)) return `F${s.padStart(3, '0')}`
  if (/^F\d{1,3}$/.test(s)) return `F${s.slice(1).padStart(3, '0')}`
  if (/^F\d{3}$/.test(s)) return s

  // ✅ por si viene "F125." o "F125," o "F125 " etc
  const m = s.match(/F(\d{1,3})/)
  if (m) return `F${String(m[1]).padStart(3, '0')}`

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
// - A1-A-F059-012 (compat)
// - A F59 12
// - F059 / 59 (solo rack)
function smartParse(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return null

  // A-F059-012
  let m = raw.match(/^([A-C])-(F\d{3})-(\d{3})$/)
  if (m) return { height: m[1], rackCode: m[2], slot: Number(m[3]) }

  // A1-A-F059-012
  m = raw.match(/^(A1|A2|A3|A4)-([A-C])-(F\d{3})-(\d{3})$/)
  if (m) return { area: m[1], height: m[2], rackCode: m[3], slot: Number(m[4]) }

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

function chipSxForState(st) {
  if (st === 'OCUPADO') return { bgcolor: 'rgba(34,197,94,.18)', border: '1px solid rgba(34,197,94,.22)', color: '#e5e7eb' }
  if (st === 'BLOQUEADO') return { bgcolor: 'rgba(239,68,68,.16)', border: '1px solid rgba(239,68,68,.22)', color: '#e5e7eb' }
  return { bgcolor: 'rgba(148,163,184,.16)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb' }
}

function cellBgForState(st) {
  if (st === 'OCUPADO') return 'rgba(34,197,94,.14)'
  if (st === 'BLOQUEADO') return 'rgba(239,68,68,.12)'
  return 'rgba(255,255,255,.04)'
}

export default function LocationsPage() {
  const { token, user } = useAuth()
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(user?.role)

  // OJO: tu api() normalmente toma token del storage; pero no rompe si se lo pasas
  const client = useMemo(() => api(token), [token])

  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // filtros
  const [area, setArea] = useState('A1')
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

  // ✅ FIX REAL: adaptar lo que viene de DB a lo que tu UI espera
  const enriched = useMemo(() => {
    return (rows || []).map((l) => {
      const fallback = parseCodeFallback(l.code)

      // DB puede traer: rackCode / rack
      const rackCode = normalizeRackCode(l.rackCode || l.rack || fallback.rack || '')
      // DB puede traer: level (A/B/C)
      const height = String(l.level || fallback.level || l.height || '').toUpperCase()
      // DB puede traer: position (1..12)
      const slot = Number(l.position ?? l.slot ?? fallback.position ?? 0)

      const slot3 = String(slot || 0).padStart(3, '0')

      // ✅ SIEMPRE calcular por rack (NO confiar en l.area)
      const computedArea = rackToArea(rackCode)

      const key = `${height}-${rackCode}-${slot3}`

      return {
        ...l,
        // por si tu backend manda id y la UI usa _id
        _id: l._id || l.id,
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
    setArea('A1')
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
      setRack(parsed.rackCode)
      setArea(rackToArea(parsed.rackCode))
      setState('')
      setHighlightKey(null)
      setView('MAPA')
      return
    }

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
    <Box sx={{ color: '#e5e7eb' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>Ubicaciones</Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Chip
            size="small"
            label={view === 'LISTA' ? 'Lista' : view === 'MAPA' ? 'Mapa' : 'Resumen'}
            sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb', fontWeight: 900 }}
          />
        </Stack>
      </Box>

      <Paper elevation={0} sx={{
        p: 2, borderRadius: 3, mb: 2,
        background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(17,24,39,.25))',
        border: '1px solid rgba(255,255,255,.06)'
      }}>
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
            <IconButton onClick={clearFilters} sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)' }}>
              <RestartAltIcon sx={{ color: '#e5e7eb' }} />
            </IconButton>
          </Tooltip>

          <Button size="small" onClick={load} disabled={loading} sx={{ minWidth: 120 }}>
            {loading ? 'Cargando...' : 'Recargar'}
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField select size="small" label="Área (zona)" value={area} onChange={(e) => setArea(e.target.value)} sx={{ minWidth: 140 }}>
            {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>

          <TextField
            select
            size="small"
            label="Rack"
            value={rack}
            onChange={(e) => setRack(e.target.value)}
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
              bgcolor: state === '' ? 'rgba(59,130,246,.22)' : 'rgba(255,255,255,.06)',
              border: '1px solid rgba(255,255,255,.10)',
              color: '#e5e7eb',
              fontWeight: 900
            }}
          />
          <Chip
            clickable
            onClick={() => kpiClick('VACIO')}
            size="small"
            label={`VACÍO: ${summary.VACIO}`}
            sx={{
              ...(chipSxForState('VACIO')),
              bgcolor: state === 'VACIO' ? 'rgba(148,163,184,.28)' : chipSxForState('VACIO').bgcolor,
              fontWeight: 900
            }}
          />
          <Chip
            clickable
            onClick={() => kpiClick('OCUPADO')}
            size="small"
            label={`OCUPADO: ${summary.OCUPADO}`}
            sx={{
              ...(chipSxForState('OCUPADO')),
              bgcolor: state === 'OCUPADO' ? 'rgba(34,197,94,.28)' : chipSxForState('OCUPADO').bgcolor,
              fontWeight: 900
            }}
          />
          <Chip
            clickable
            onClick={() => kpiClick('BLOQUEADO')}
            size="small"
            label={`BLOQUEADO: ${summary.BLOQUEADO}`}
            sx={{
              ...(chipSxForState('BLOQUEADO')),
              bgcolor: state === 'BLOQUEADO' ? 'rgba(239,68,68,.26)' : chipSxForState('BLOQUEADO').bgcolor,
              fontWeight: 900
            }}
          />
        </Stack>
      </Paper>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' },
        gap: 2,
        alignItems: 'start'
      }}>
        <Box>
          {view === 'LISTA' && (
            <Paper elevation={0} sx={{ width: '100%', overflow: 'auto', borderRadius: 3, mb: 2 }}>
              <Box component="table" sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                <Box component="thead" sx={{ background: 'rgba(15,23,42,.65)', position: 'sticky', top: 0, zIndex: 1 }}>
                  <Box component="tr">
                    <Box component="th" sx={{ color: '#fff', fontWeight: 900, p: 1.5, textAlign: 'left', minWidth: 140 }}>Ubicación</Box>
                    <Box component="th" sx={{ color: '#fff', fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 110 }}>Estado</Box>
                    <Box component="th" sx={{ color: '#fff', fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 90 }}>Tipo</Box>
                    <Box component="th" sx={{ color: '#fff', fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 90 }}>Capacidad</Box>
                    <Box component="th" sx={{ color: '#fff', fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 160 }}>Notas / Motivo</Box>
                    <Box component="th" sx={{ color: '#fff', fontWeight: 900, p: 1.5, textAlign: 'center', minWidth: 120 }}>Acción</Box>
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
                          background: idx % 2 === 0 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.02)',
                          transition: 'background 0.15s ease, box-shadow .15s ease',
                          outline: isHi ? '2px solid rgba(96,165,250,.85)' : 'none',
                          outlineOffset: -2,
                          '&:hover': { background: 'rgba(255,255,255,.06)' }
                        }}
                      >
                        <Box component="td" sx={{ p: 1.5, fontFamily: 'monospace', fontWeight: 900, color: '#fff' }}>
                          {l.code || `${l.height}${String(l.slot).padStart(2, '0')}-${l.rackCode}-${String(l.slot).padStart(3, '0')}`}
                          <Typography variant="caption" sx={{ display: 'block', color: 'rgba(229,231,235,.75)', fontWeight: 700 }}>
                            Área: <b>{areaLabel}</b> · Rack: <b>{l.rackCode || '—'}</b> · Altura: <b>{l.height} ({heightLabel})</b> · Slot: <b>{l._slot3}</b>
                          </Typography>
                        </Box>

                        <Box component="td" sx={{ p: 1.5, textAlign: 'center' }}>
                          <Tooltip title={st} arrow>{stateIcon}</Tooltip>
                          <Typography variant="caption" sx={{ display: 'block', color: '#fff', fontWeight: 900 }}>{st}</Typography>
                        </Box>

                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', color: '#fff', fontWeight: 800 }}>{l.type || 'RACK'}</Box>
                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', color: '#fff', fontWeight: 800 }}>{l.maxPallets || 1}</Box>

                        <Box component="td" sx={{ p: 1.5, textAlign: 'center', color: '#fff', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
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
                            sx={{ color: '#e5e7eb', borderColor: 'rgba(255,255,255,.18)', '&:hover': { borderColor: 'rgba(255,255,255,.35)', background: 'rgba(255,255,255,.06)' } }}
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
            <Paper elevation={0} sx={{
              p: 2, borderRadius: 3,
              background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(17,24,39,.25))',
              border: '1px solid rgba(255,255,255,.06)'
            }}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'stretch', md: 'center' }} justifyContent="space-between" sx={{ mb: 1 }}>
                <Typography sx={{ fontWeight: 900 }}>
                  Mapa del Rack {rackForMap || '—'} <span style={{ opacity: .7, fontWeight: 800 }}>(A/B/C · 001–012)</span>
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip size="small" label="VACÍO" sx={{ ...chipSxForState('VACIO') }} />
                  <Chip size="small" label="OCUPADO" sx={{ ...chipSxForState('OCUPADO') }} />
                  <Chip size="small" label="BLOQUEADO" sx={{ ...chipSxForState('BLOQUEADO') }} />
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
                              bgcolor: cellBgForState(st),
                              border: isHi ? '2px solid rgba(96,165,250,.85)' : '1px solid rgba(255,255,255,.08)',
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
            <Paper elevation={0} sx={{
              p: 2, borderRadius: 3,
              background: 'linear-gradient(180deg, rgba(255,255,255,.04), rgba(17,24,39,.25))',
              border: '1px solid rgba(255,255,255,.06)'
            }}>
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
                          border: '1px solid rgba(255,255,255,.06)',
                          background: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.02))',
                          cursor: 'pointer'
                        }}
                        onClick={() => { setRack(rk.rackCode); setView('MAPA') }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Typography sx={{ fontWeight: 900, fontSize: 18 }}>{rk.rackCode}</Typography>
                          <Chip size="small" label={`${occPct}% Ocup.`} sx={{ bgcolor: 'rgba(59,130,246,.18)', border: '1px solid rgba(59,130,246,.20)', color: '#e5e7eb', fontWeight: 900 }} />
                        </Stack>

                        <Divider sx={{ my: 1.5 }} />

                        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                          <Chip size="small" label={`Total ${rk.total}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb' }} />
                          <Chip size="small" label={`Vacío ${rk.VACIO}`} sx={{ ...chipSxForState('VACIO') }} />
                          <Chip size="small" label={`Ocupado ${rk.OCUPADO}`} sx={{ ...chipSxForState('OCUPADO') }} />
                          <Chip size="small" label={`Bloq. ${rk.BLOQUEADO}`} sx={{ ...chipSxForState('BLOQUEADO') }} />
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

        <Box sx={{ display: { xs: 'none', lg: 'block' } }}>
          <Paper elevation={0} sx={{
            p: 2,
            borderRadius: 3,
            background: 'linear-gradient(180deg, rgba(255,255,255,.05), rgba(17,24,39,.25))',
            border: '1px solid rgba(255,255,255,.06)',
            position: 'sticky',
            top: 92
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
                  <Chip size="small" label={detailItem._state} sx={{ ...chipSxForState(detailItem._state), fontWeight: 900 }} />
                  <Chip size="small" label={`Rack ${detailItem.rackCode}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb', fontWeight: 900 }} />
                  <Chip size="small" label={`${detailItem.height}-${detailItem._slot3}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.10)', color: '#e5e7eb', fontWeight: 900 }} />
                </Stack>

                <Divider sx={{ my: 1.5 }} />

                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, columnGap: 1.5 }}>
                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Área</Typography>
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
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, columnGap: 1.5 }}>
                <Typography sx={{ opacity: .7, fontSize: 12 }}>Área</Typography>
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

              <Divider sx={{ my: 2 }} />

              <Button variant="contained" startIcon={<EditIcon />} onClick={() => openEdit(detailItem)} fullWidth>
                Editar
              </Button>

              <Typography sx={{ mt: 1.5, opacity: .6, fontSize: 11 }}>
                *Acciones de bloquear/desbloquear/guardar se mantienen en el diálogo de edición.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

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