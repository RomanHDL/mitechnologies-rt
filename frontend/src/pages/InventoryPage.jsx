import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { useTheme } from '@mui/material/styles'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Stack from '@mui/material/Stack'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Button from '@mui/material/Button'
import Divider from '@mui/material/Divider'
import MenuItem from '@mui/material/MenuItem'
import Alert from '@mui/material/Alert'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Snackbar from '@mui/material/Snackbar'
import Switch from '@mui/material/Switch'
import FormControlLabel from '@mui/material/FormControlLabel'
import CircularProgress from '@mui/material/CircularProgress'

import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningIcon from '@mui/icons-material/Warning'
import ErrorIcon from '@mui/icons-material/Error'
import DownloadIcon from '@mui/icons-material/Download'
import RefreshIcon from '@mui/icons-material/Refresh'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ViewListIcon from '@mui/icons-material/ViewList'
import GridViewIcon from '@mui/icons-material/GridView'
import SearchIcon from '@mui/icons-material/Search'
import FilterAltIcon from '@mui/icons-material/FilterAlt'
import CloseIcon from '@mui/icons-material/Close'
import HistoryIcon from '@mui/icons-material/History'
import RoomIcon from '@mui/icons-material/Room'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

/**
 * Helpers (solo frontend)
 */
function safeUpper(s) {
  return String(s || '').trim().toUpperCase()
}

function normalizeRackCode(input) {
  const s = safeUpper(input)
  if (!s) return ''
  if (/^\d{1,3}$/.test(s)) return `F${s.padStart(3, '0')}`
  if (/^F\d{1,3}$/.test(s)) return `F${s.slice(1).padStart(3, '0')}`
  if (/^F\d{3}$/.test(s)) return s
  return s
}

// Acepta:
// - SKU (TV-55-4K)
// - Rack F059 / 59
// - Ubicación A1-F059-012 (o A1 F59 12)
// - Lote (cualquier texto)
function smartParse(input) {
  const raw = safeUpper(input)
  if (!raw) return null

  // exacto A1-F059-012
  let m = raw.match(/^(A1|A2|A3|A4|B2|C3)-(F\d{3})-(\d{3})$/)
  if (m) return { type: 'LOCATION_CODE', value: raw }

  // A1 F59 12
  const cleaned = raw.replace(/[_/\\]+/g, ' ').replace(/-+/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)
  if (parts.length >= 3 && /^(A1|A2|A3|A4|B2|C3)$/.test(parts[0])) {
    const rk = normalizeRackCode(parts[1])
    const slot = String(parts[2]).replace(/\D/g, '')
    if (/^F\d{3}$/.test(rk) && slot) {
      const slot3 = String(Number(slot)).padStart(3, '0')
      return { type: 'LOCATION_CODE', value: `${parts[0]}-${rk}-${slot3}` }
    }
  }

  // rack solo
  const rk2 = normalizeRackCode(raw)
  if (/^F\d{3}$/.test(rk2)) return { type: 'RACK', value: rk2 }

  // si parece SKU/texto
  if (/^[A-Z0-9][A-Z0-9-_]{1,}$/.test(raw) && raw.length >= 3) return { type: 'SKU_OR_TEXT', value: raw }

  return { type: 'TEXT', value: raw }
}

function sumQty(items) {
  return (items || []).reduce((a, b) => a + (b?.qty || 0), 0)
}

function statusFromQty(qty) {
  if (qty === 0) return 'AGOTADO'
  if (qty < 5) return 'BAJO'
  return 'DISPONIBLE'
}

function statusUI(status) {
  if (status === 'AGOTADO') {
    return {
      icon: <ErrorIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />,
      label: 'Agotado',
      chipSx: { bgcolor: '#fee2e2', color: '#991b1b' }
    }
  }
  if (status === 'BAJO') {
    return {
      icon: <WarningIcon sx={{ color: '#eab308', verticalAlign: 'middle' }} fontSize="small" />,
      label: 'Bajo',
      chipSx: { bgcolor: '#fef9c3', color: '#a16207' }
    }
  }
  return {
    icon: <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />,
    label: 'Disponible',
    chipSx: { bgcolor: '#dcfce7', color: '#166534' }
  }
}

function getAreaFromLocationCode(locCode) {
  const s = safeUpper(locCode)
  const m = s.match(/^(A1|A2|A3|A4|B2|C3)-/)
  return m ? m[1] : ''
}

function getRackFromLocationCode(locCode) {
  const s = safeUpper(locCode)
  const m = s.match(/-(F\d{3})-/)
  return m ? m[1] : ''
}

function getSlotFromLocationCode(locCode) {
  const s = safeUpper(locCode)
  const m = s.match(/-(\d{3})$/)
  return m ? Number(m[1]) : null
}

function csvEscape(v) {
  const s = String(v ?? '')
  if (/[",\n]/.test(s)) return `"${s.replaceAll('"', '""')}"`
  return s
}

function downloadCSV(filename, rows) {
  const csv = rows.map(r => r.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

function formatDateTime(dt) {
  try {
    if (!dt) return '—'
    const d = new Date(dt)
    if (Number.isNaN(d.getTime())) return '—'
    return d.toLocaleString()
  } catch {
    return '—'
  }
}

function daysSince(dt) {
  if (!dt) return null
  const d = new Date(dt).getTime()
  if (!d) return null
  return Math.floor((Date.now() - d) / (24 * 60 * 60 * 1000))
}

export default function InventoryPage() {
  const { token, user } = useAuth()
  const nav = useNavigate()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  // ✅ lo tuyo
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])

  // extras pro (UI)
  const [loading, setLoading] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  // modo operador/admin (UI)
  const [operatorMode, setOperatorMode] = useState(() => localStorage.getItem('inv_operator_mode') === '1')

  // vista
  const [view, setView] = useState('TABLE') // TABLE | MAP

  // filtros
  const [statusFilter, setStatusFilter] = useState('') // DISPONIBLE | BAJO | AGOTADO
  const [areaFilter, setAreaFilter] = useState('')
  const [rackFilter, setRackFilter] = useState('')
  const [lotFilter, setLotFilter] = useState('')
  const [sortBy, setSortBy] = useState('RECENT') // RECENT | QTY_DESC | QTY_ASC | CODE

  // detalle
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  // feedback copy
  const [snack, setSnack] = useState('')

  // ✅ NUEVO: historial movimientos (por pallet o por SKU)
  const [movOpen, setMovOpen] = useState(false)
  const [movLoading, setMovLoading] = useState(false)
  const [movErr, setMovErr] = useState('')
  const [movRows, setMovRows] = useState([])
  const [movMode, setMovMode] = useState('PALLET') // PALLET | SKU
  const [movSku, setMovSku] = useState('')

  // ✅ NUEVO: alertas reales "sin movimiento"
  const [noMoveDays, setNoMoveDays] = useState(() => Number(localStorage.getItem('inv_nomove_days') || '30'))
  const [noMoveLoading, setNoMoveLoading] = useState(false)
  const [noMoveErr, setNoMoveErr] = useState('')
  const [noMoveList, setNoMoveList] = useState([]) // [{palletId,palletCode,lastMovementAt,daysSince,inactive}]
  const [noMoveOpen, setNoMoveOpen] = useState(false)

  const client = useMemo(() => api(token), [token])

  const load = async () => {
    setLoading(true)
    try {
      const res = await client.get('/api/pallets', { params: { q } }) // ✅ tu query sigue igual
      setRows(Array.isArray(res.data) ? res.data : [])
      setLastUpdatedAt(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // ✅ mantiene tu comportamiento: recarga cuando q cambia
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, q])

  // Resumen superior
  const resumen = useMemo(() => {
    let total = rows.length
    let bajo = 0, agotado = 0, disponible = 0

    let palletsConUbicacion = 0
    let totalQty = 0
    const skuSet = new Set()

    for (const p of rows) {
      const qty = sumQty(p.items)
      totalQty += qty

      if (qty === 0) agotado++
      else if (qty < 5) bajo++
      else disponible++

      if (p?.location?.code) palletsConUbicacion++

      for (const it of (p.items || [])) {
        if (it?.sku) skuSet.add(String(it.sku))
      }
    }

    return {
      total,
      bajo,
      agotado,
      disponible,
      totalQty,
      uniqueSkus: skuSet.size,
      palletsConUbicacion
    }
  }, [rows])

  // filas enriquecidas
  const enriched = useMemo(() => {
    return rows.map((p) => {
      const qty = sumQty(p.items)
      const status = statusFromQty(qty)
      const locCode = p?.location?.code || ''
      const area = getAreaFromLocationCode(locCode)
      const rack = getRackFromLocationCode(locCode)
      const slot = getSlotFromLocationCode(locCode)
      const lot = p?.lot || ''
      const itemsText = (p.items || []).map(it => `${it.sku}(${it.qty})`).join(', ')
      const mainSku = (p.items && p.items[0] && p.items[0].sku) ? String(p.items[0].sku) : ''
      return { ...p, _qty: qty, _status: status, _locCode: locCode, _area: area, _rack: rack, _slot: slot, _lot: lot, _itemsText: itemsText, _mainSku: mainSku }
    })
  }, [rows])

  const filtered = useMemo(() => {
    let list = enriched

    if (statusFilter) list = list.filter(p => p._status === statusFilter)
    if (areaFilter) list = list.filter(p => p._area === areaFilter)
    if (rackFilter) list = list.filter(p => safeUpper(p._rack) === safeUpper(rackFilter))
    if (lotFilter) list = list.filter(p => safeUpper(p._lot).includes(safeUpper(lotFilter)))

    if (sortBy === 'QTY_DESC') list = [...list].sort((a, b) => (b._qty || 0) - (a._qty || 0))
    if (sortBy === 'QTY_ASC') list = [...list].sort((a, b) => (a._qty || 0) - (b._qty || 0))
    if (sortBy === 'CODE') list = [...list].sort((a, b) => String(a.code || '').localeCompare(String(b.code || '')))
    if (sortBy === 'RECENT') {
      list = [...list].sort((a, b) => {
        const da = new Date(a.updatedAt || a.createdAt || 0).getTime()
        const db = new Date(b.updatedAt || b.createdAt || 0).getTime()
        return db - da
      })
    }

    return list
  }, [enriched, statusFilter, areaFilter, rackFilter, lotFilter, sortBy])

  // Alertas UI (más plus: sin movimiento)
  const alerts = useMemo(() => {
    const res = []
    if (resumen.agotado > 0) res.push({ key: 'agotado', label: `Agotado: ${resumen.agotado}`, tone: 'error', action: () => setStatusFilter('AGOTADO') })
    if (resumen.bajo > 0) res.push({ key: 'bajo', label: `Bajo stock: ${resumen.bajo}`, tone: 'warning', action: () => setStatusFilter('BAJO') })
    const sinUb = resumen.total - resumen.palletsConUbicacion
    if (sinUb > 0) res.push({ key: 'sinub', label: `Sin ubicación: ${sinUb}`, tone: 'info', action: () => { /* UI */ } })
    if (noMoveList.length > 0) res.push({ key: 'nomove', label: `Sin movimiento ${noMoveDays} días: ${noMoveList.length}`, tone: 'warning', action: () => setNoMoveOpen(true) })
    return res.slice(0, 4)
  }, [resumen, noMoveList.length, noMoveDays])

  // smart hint
  const smartHint = useMemo(() => {
    const p = smartParse(q)
    if (!p) return null
    if (p.type === 'LOCATION_CODE') return { label: 'Ubicación detectada', value: p.value }
    if (p.type === 'RACK') return { label: 'Rack detectado', value: p.value }
    if (p.type === 'SKU_OR_TEXT') return { label: 'SKU/texto detectado', value: p.value }
    return { label: 'Texto', value: p.value }
  }, [q])

  const applySmart = () => {
    const parsed = smartParse(q)
    if (!parsed) return

    if (parsed.type === 'RACK') {
      setRackFilter(parsed.value)
      setAreaFilter('')
      setLotFilter('')
    } else if (parsed.type === 'LOCATION_CODE') {
      const area = getAreaFromLocationCode(parsed.value)
      const rack = getRackFromLocationCode(parsed.value)
      setAreaFilter(area || '')
      setRackFilter(rack || '')
    }
  }

  const clearFilters = () => {
    setStatusFilter('')
    setAreaFilter('')
    setRackFilter('')
    setLotFilter('')
    setSortBy('RECENT')
  }

  const exportFilteredCSV = () => {
    const header = ['Código', 'Ubicación', 'Estado', 'Cantidad', 'Items', 'Lote', 'Área', 'Rack']
    const body = filtered.map(p => ([
      p.code || '',
      p._locCode || '—',
      statusUI(p._status).label,
      String(p._qty || 0),
      p._itemsText || '',
      p._lot || '—',
      p._area || '—',
      p._rack || '—'
    ]))
    downloadCSV(`inventario_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
  }

  const openDetail = (p) => {
    setSelected(p)
    setOpen(true)
  }

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ''))
      setSnack('Copiado ✅')
    } catch {
      setSnack('No se pudo copiar')
    }
  }

  // grid simple por rack
  const mapModel = useMemo(() => {
    const racks = new Map()
    for (const p of filtered) {
      const rk = p._rack || '—'
      if (!racks.has(rk)) racks.set(rk, [])
      racks.get(rk).push(p)
    }
    const list = Array.from(racks.entries()).slice(0, 6).map(([rack, items]) => ({
      rack,
      count: items.length,
      items
    }))
    return list
  }, [filtered])

  useEffect(() => {
    localStorage.setItem('inv_operator_mode', operatorMode ? '1' : '0')
  }, [operatorMode])

  const canAdmin = ['ADMIN', 'SUPERVISOR'].includes(user?.role)

  // ✅ NUEVO: cargar no-move real
  const loadNoMove = async (days = noMoveDays) => {
    setNoMoveLoading(true)
    setNoMoveErr('')
    try {
      const res = await client.get('/api/movements/no-move', { params: { days, limit: 500 } })
      setNoMoveList(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setNoMoveErr(e?.response?.data?.message || e?.message || 'Error cargando “sin movimiento”')
      setNoMoveList([])
    } finally {
      setNoMoveLoading(false)
    }
  }

  // ✅ NUEVO: inicializa “no move” al entrar (modo seguro: si endpoint no existe, no rompe)
  useEffect(() => {
    loadNoMove(noMoveDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    localStorage.setItem('inv_nomove_days', String(noMoveDays || 30))
  }, [noMoveDays])

  // ✅ NUEVO: abrir movimientos por pallet
  const openMovementsForPallet = async (pallet) => {
    if (!pallet?._id) return
    setMovMode('PALLET')
    setMovSku('')
    setMovOpen(true)
    setMovLoading(true)
    setMovErr('')
    setMovRows([])
    try {
      const res = await client.get(`/api/pallets/${pallet._id}/movements`, { params: { limit: 200 } })
      setMovRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setMovErr(e?.response?.data?.message || e?.message || 'No se pudieron cargar movimientos')
    } finally {
      setMovLoading(false)
    }
  }

  // ✅ NUEVO: buscar movimientos por SKU
  const searchMovementsBySku = async () => {
    const sku = safeUpper(movSku)
    if (!sku) return
    setMovMode('SKU')
    setMovOpen(true)
    setMovLoading(true)
    setMovErr('')
    setMovRows([])
    try {
      const res = await client.get('/api/movements', { params: { sku, limit: 500 } })
      setMovRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setMovErr(e?.response?.data?.message || e?.message || 'No se pudieron cargar movimientos por SKU')
    } finally {
      setMovLoading(false)
    }
  }

  // ✅ NUEVO: abrir en Racks (navegar)
  const openInRacks = (locCode) => {
    const rack = getRackFromLocationCode(locCode)
    if (!rack) return
    nav('/racks', { state: { rackCode: rack, highlight: safeUpper(locCode) } })
  }

  return (
    <Box>
      {/* HEADER PRO */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 900, letterSpacing: -0.2 }}>
            Inventario
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75, fontWeight: 700 }}>
            Centro de Inventario · Última actualización: <b>{lastUpdatedAt ? lastUpdatedAt.toLocaleString() : '—'}</b>
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            sx={{ mr: 0.5, userSelect: 'none' }}
            control={<Switch checked={operatorMode} onChange={(e) => setOperatorMode(e.target.checked)} />}
            label={<Typography sx={{ fontWeight: 900, fontSize: 13 }}>Modo operador</Typography>}
          />

          <Tooltip title="Recargar">
            <IconButton
              onClick={load}
              sx={{
                bgcolor: isDark ? 'rgba(255,255,255,.07)' : 'rgba(21,101,192,.08)',
                border: isDark ? '1px solid rgba(255,255,255,.12)' : '1px solid rgba(21,101,192,.20)',
                borderRadius: 2,
              }}
            >
              <RefreshIcon color="primary" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Exportar CSV (filtrado)">
            <IconButton
              onClick={exportFilteredCSV}
              sx={{
                bgcolor: isDark ? 'rgba(255,255,255,.07)' : 'rgba(21,101,192,.08)',
                border: isDark ? '1px solid rgba(255,255,255,.12)' : '1px solid rgba(21,101,192,.20)',
                borderRadius: 2,
              }}
            >
              <DownloadIcon color="primary" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ALERTAS */}
      {!!alerts.length && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {alerts.map(a => (
            <Alert
              key={a.key}
              severity={a.tone}
              sx={{ borderRadius: 3 }}
              action={
                <Button size="small" color="inherit" onClick={a.action} startIcon={<FilterAltIcon />}>
                  Ver
                </Button>
              }
            >
              <b>Alerta:</b> {a.label}
            </Alert>
          ))}
        </Stack>
      )}

      {/* BUSCADOR + FILTROS */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            size="small"
            label='Buscar: SKU, "A1-F059-012", "F059", lote...'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySmart()}
            sx={{ flex: 1 }}
            InputProps={{
              startAdornment: <SearchIcon sx={{ opacity: 0.7, mr: 1 }} />
            }}
          />

          <Button variant="contained" onClick={applySmart} sx={{ minWidth: 120 }}>
            Buscar
          </Button>

          <Button
            variant="outlined"
            onClick={() => setView(v => (v === 'TABLE' ? 'MAP' : 'TABLE'))}
            startIcon={view === 'TABLE' ? <GridViewIcon /> : <ViewListIcon />}
          >
            {view === 'TABLE' ? 'Vista mapa' : 'Vista tabla'}
          </Button>
        </Stack>

        {/* hint */}
        {smartHint && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
            <Chip size="small" label={`${smartHint.label}: ${smartHint.value}`} sx={{ fontWeight: 900 }} />
            {!!statusFilter && <Chip size="small" label={`Filtro estado: ${statusUI(statusFilter).label}`} sx={{ fontWeight: 900 }} />}
            {!!areaFilter && <Chip size="small" label={`Área: ${areaFilter}`} sx={{ fontWeight: 900 }} />}
            {!!rackFilter && <Chip size="small" label={`Rack: ${rackFilter}`} sx={{ fontWeight: 900 }} />}
            {!!lotFilter && <Chip size="small" label={`Lote: ${lotFilter}`} sx={{ fontWeight: 900 }} />}
            {(statusFilter || areaFilter || rackFilter || lotFilter || sortBy !== 'RECENT') && (
              <Button size="small" startIcon={<CloseIcon />} onClick={clearFilters}>
                Limpiar filtros
              </Button>
            )}
          </Stack>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            select
            size="small"
            label="Estado"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="DISPONIBLE">Disponible</MenuItem>
            <MenuItem value="BAJO">Bajo</MenuItem>
            <MenuItem value="AGOTADO">Agotado</MenuItem>
          </TextField>

          <TextField
            select
            size="small"
            label="Área"
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todas</MenuItem>
            <MenuItem value="A1">A1</MenuItem>
            <MenuItem value="A2">A2</MenuItem>
            <MenuItem value="A3">A3</MenuItem>
            <MenuItem value="A4">A4</MenuItem>
            <MenuItem value="B2">B2</MenuItem>
            <MenuItem value="C3">C3</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Rack / BIN"
            value={rackFilter}
            onChange={(e) => setRackFilter(normalizeRackCode(e.target.value))}
            sx={{ minWidth: 170 }}
          />

          <TextField
            size="small"
            label="SKU"
            value={lotFilter}
            onChange={(e) => setLotFilter(e.target.value)}
            sx={{ minWidth: 160 }}
          />

          <TextField
            select
            size="small"
            label="Ordenar"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 190 }}
          >
            <MenuItem value="RECENT">Más reciente</MenuItem>
            <MenuItem value="QTY_DESC">Cantidad (mayor→menor)</MenuItem>
            <MenuItem value="QTY_ASC">Cantidad (menor→mayor)</MenuItem>
            <MenuItem value="CODE">Código (A→Z)</MenuItem>
          </TextField>

          <Box sx={{ flex: 1 }} />

          <Button size="small" onClick={load} disabled={loading}>
            {loading ? 'Cargando...' : 'Recargar'}
          </Button>
        </Stack>

        {/* ✅ NUEVO: barra rápida Movimientos por SKU + NoMove */}
        <Divider sx={{ my: 2 }} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            size="small"
            label="Movimientos por SKU"
            value={movSku}
            onChange={(e) => setMovSku(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchMovementsBySku()}
            sx={{ minWidth: 260 }}
          />
          <Button variant="outlined" startIcon={<HistoryIcon />} onClick={searchMovementsBySku}>
            Ver movimientos
          </Button>

          <Box sx={{ flex: 1 }} />

          <TextField
            size="small"
            type="number"
            label="No mov. (días)"
            value={noMoveDays}
            onChange={(e) => setNoMoveDays(Number(e.target.value || 30))}
            sx={{ width: 160 }}
          />
          <Button
            variant="outlined"
            startIcon={<WarningAmberIcon />}
            onClick={() => { loadNoMove(noMoveDays); setNoMoveOpen(true) }}
            disabled={noMoveLoading}
          >
            {noMoveLoading ? 'Cargando...' : 'Sin movimiento'}
          </Button>
        </Stack>

        {noMoveErr && (
          <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 3 }}>
            No se pudo cargar “sin movimiento”: {noMoveErr}
          </Alert>
        )}
      </Paper>

      {/* KPIs CLICKEABLES */}
      <GridKpis
        resumen={resumen}
        onAll={() => setStatusFilter('')}
        onDisponible={() => setStatusFilter('DISPONIBLE')}
        onBajo={() => setStatusFilter('BAJO')}
        onAgotado={() => setStatusFilter('AGOTADO')}
      />

      {/* VISTA MAPA */}
      {view === 'MAP' ? (
        <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              Vista Ubicaciones (preview)
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.7, fontWeight: 800 }}>
              *Modo seguro: agrupa por rack con tarimas encontradas
            </Typography>
          </Stack>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={2}>
            {mapModel.length === 0 && (
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                No hay datos para mostrar en mapa todavía.
              </Typography>
            )}

            {mapModel.map(group => (
              <Paper key={group.rack} variant="outlined" sx={{ p: 1.6, borderRadius: 3 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 900, fontFamily: 'monospace' }}>
                    Rack: {group.rack}
                  </Typography>
                  <Chip size="small" label={`${group.count} tarimas`} />
                </Stack>

                <Box sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(4, 1fr)' },
                  gap: 1
                }}>
                  {group.items.slice(0, 12).map(p => {
                    const ui = statusUI(p._status)
                    return (
                      <Paper
                        key={p._id}
                        variant="outlined"
                        onClick={() => openDetail(p)}
                        sx={{
                          p: 1.2,
                          borderRadius: 2,
                          cursor: 'pointer',
                          transition: 'transform .12s ease',
                          '&:hover': { transform: 'translateY(-1px)' }
                        }}
                      >
                        <Stack direction="row" spacing={1} alignItems="center">
                          {ui.icon}
                          <Typography sx={{ fontWeight: 900, fontFamily: 'monospace', flex: 1 }}>
                            {p.code}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ opacity: 0.75, display: 'block' }}>
                          {p._locCode || '—'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} alignItems="center">
                          <Chip size="small" label={ui.label} sx={ui.chipSx} />
                          <Chip size="small" label={`Qty: ${p._qty}`} />
                        </Stack>
                      </Paper>
                    )
                  })}
                </Box>

                {group.items.length > 12 && (
                  <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1 }}>
                    Mostrando 12 de {group.items.length} tarimas en este rack.
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {/* TABLA */}
      {view === 'TABLE' ? (
        <Paper elevation={1} sx={{ p: 0, borderRadius: 3, overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1050 }}>
            <TableHead>
              <TableRow sx={{ background: '#101c2b', position: 'sticky', top: 0, zIndex: 1 }}>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Código</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Ubicación</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Estatus</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Cantidad</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Items</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Lote</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900, textAlign: 'center' }}>Acción</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((p, idx) => {
                const ui = statusUI(p._status)
                const itemsText = p._itemsText || ''
                const loc = p._locCode || '—'

                return (
                  <TableRow
                    key={p._id}
                    sx={{
                      background: idx % 2 === 0 ? '#19233a' : '#101c2b',
                      '&:hover': { background: '#22304d' }
                    }}
                  >
                    <TableCell sx={{ fontFamily: 'monospace', color: '#fff', fontWeight: 900 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{p.code}</span>
                        <Tooltip title="Copiar código">
                          <IconButton size="small" sx={{ color: '#fff' }} onClick={() => copyText(p.code)}>
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                      <Typography variant="caption" sx={{ display: 'block', opacity: 0.75 }}>
                        Área: <b>{p._area || '—'}</b> · Rack: <b>{p._rack || '—'}</b>
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#fff' }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span style={{ fontFamily: loc !== '—' ? 'monospace' : undefined }}>{loc}</span>

                        {loc !== '—' && (
                          <>
                            <Tooltip title="Copiar ubicación">
                              <IconButton size="small" sx={{ color: '#fff' }} onClick={() => copyText(loc)}>
                                <ContentCopyIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Abrir en Racks">
                              <IconButton
                                size="small"
                                sx={{ color: '#fff' }}
                                onClick={() => openInRacks(loc)}
                              >
                                <RoomIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell sx={{ color: '#fff' }}>
                      <Tooltip title={ui.label} arrow>{ui.icon}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: '#fff', fontWeight: 900 }}>
                        {ui.label}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#fff', fontWeight: 900 }}>
                      {p._qty}
                    </TableCell>

                    <TableCell sx={{ color: '#fff', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={itemsText} arrow>
                        <span>{itemsText.length > 30 ? itemsText.slice(0, 30) + '…' : itemsText}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ color: '#fff' }}>{p._lot || '—'}</TableCell>

                    <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => openDetail(p)}>
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Movimientos (tarima)">
                        <IconButton size="small" sx={{ color: '#fff' }} onClick={() => openMovementsForPallet(p)}>
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Editar (UI)">
                        <span>
                          <IconButton size="small" sx={{ color: '#fff' }} disabled={!canAdmin}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Eliminar (UI)">
                        <span>
                          <IconButton size="small" sx={{ color: '#fff' }} disabled={!canAdmin}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}

              {!filtered.length && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ color: '#fff', textAlign: 'center', py: 4, opacity: 0.8 }}>
                    No hay resultados con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      ) : null}

      {/* MODAL DETALLE */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Detalle de tarima
        </DialogTitle>
        <DialogContent>
          {!selected ? null : (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: 18 }}>
                  {selected.code}
                </Typography>
                <Button size="small" startIcon={<ContentCopyIcon />} onClick={() => copyText(selected.code)}>
                  Copiar
                </Button>
                <Box sx={{ flex: 1 }} />
                <Button size="small" variant="outlined" startIcon={<HistoryIcon />} onClick={() => openMovementsForPallet(selected)}>
                  Movimientos
                </Button>
              </Stack>

              <Stack spacing={1}>
                <InfoRow label="Ubicación" value={selected._locCode || '—'} onCopy={selected._locCode ? () => copyText(selected._locCode) : null} />
                <InfoRow label="Estado" value={statusUI(selected._status).label} />
                <InfoRow label="Cantidad total" value={String(selected._qty || 0)} />
                <InfoRow label="Lote" value={selected._lot || '—'} />
                <InfoRow label="Área / Rack" value={`${selected._area || '—'} · ${selected._rack || '—'}`} />
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Typography sx={{ fontWeight: 900, mb: 1 }}>Items</Typography>
              <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                {(selected.items || []).length ? (
                  <Stack spacing={1}>
                    {(selected.items || []).map((it, i) => (
                      <Stack key={`${it.sku}-${i}`} direction="row" justifyContent="space-between" alignItems="center">
                        <Typography sx={{ fontFamily: 'monospace', fontWeight: 900 }}>{it.sku}</Typography>
                        <Chip size="small" label={`Qty: ${it.qty || 0}`} />
                      </Stack>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" sx={{ opacity: 0.75 }}>Sin items</Typography>
                )}
              </Paper>

              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1.5 }}>
                *Este detalle usa tu /api/pallets y el historial usa /api/pallets/:id/movements.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ✅ MODAL MOVIMIENTOS */}
      <Dialog open={movOpen} onClose={() => setMovOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Movimientos {movMode === 'SKU' ? `· SKU ${safeUpper(movSku)}` : ''}
        </DialogTitle>
        <DialogContent>
          {movErr && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 3 }}>
              {movErr}
            </Alert>
          )}

          {movLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontWeight: 800, opacity: 0.8 }}>Cargando movimientos...</Typography>
            </Stack>
          ) : (
            <>
              {!movRows.length ? (
                <Typography sx={{ opacity: 0.75 }}>
                  No hay movimientos para mostrar.
                </Typography>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={{ background: 'rgba(15,23,42,0.35)' }}>
                        <TableCell sx={{ fontWeight: 900 }}>Fecha</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Tipo</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Tarima</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>De</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>A</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Nota</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movRows.map((m, i) => {
                        const from = m?.fromLocation?.code || (m?.fromLocation ? `${m.fromLocation.area}-${m.fromLocation.level}${m.fromLocation.position}` : '—')
                        const to = m?.toLocation?.code || (m?.toLocation ? `${m.toLocation.area}-${m.toLocation.level}${m.toLocation.position}` : '—')
                        return (
                          <TableRow key={m.id || `${m.type}-${m.createdAt}-${i}`}>
                            <TableCell sx={{ fontFamily: 'monospace' }}>{formatDateTime(m.createdAt)}</TableCell>
                            <TableCell>
                              <Chip size="small" label={m.type || '—'} sx={{ fontWeight: 900 }} />
                            </TableCell>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 900 }}>
                              {m?.pallet?.code || '—'}
                              {m?.pallet?.code && (
                                <Tooltip title="Copiar código tarima">
                                  <IconButton size="small" onClick={() => copyText(m.pallet.code)}>
                                    <ContentCopyIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell sx={{ fontFamily: from !== '—' ? 'monospace' : undefined }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <span>{from}</span>
                                {from !== '—' && from.includes('-F') && (
                                  <Tooltip title="Abrir en Racks">
                                    <IconButton size="small" onClick={() => openInRacks(from)}><RoomIcon fontSize="inherit" /></IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ fontFamily: to !== '—' ? 'monospace' : undefined }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <span>{to}</span>
                                {to !== '—' && to.includes('-F') && (
                                  <Tooltip title="Abrir en Racks">
                                    <IconButton size="small" onClick={() => openInRacks(to)}><RoomIcon fontSize="inherit" /></IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ maxWidth: 380 }}>
                              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                                {m.note || '—'}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </Paper>
              )}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMovOpen(false)}>Cerrar</Button>
          {movMode === 'SKU' && (
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => {
                const header = ['Fecha', 'Tipo', 'Tarima', 'De', 'A', 'Nota']
                const body = movRows.map(m => ([
                  formatDateTime(m.createdAt),
                  m.type || '',
                  m?.pallet?.code || '',
                  m?.fromLocation?.code || '',
                  m?.toLocation?.code || '',
                  m.note || ''
                ]))
                downloadCSV(`movimientos_sku_${safeUpper(movSku)}_${new Date().toISOString().slice(0, 10)}.csv`, [header, ...body])
              }}
            >
              Exportar
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* ✅ MODAL NO MOVE */}
      <Dialog open={noMoveOpen} onClose={() => setNoMoveOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontWeight: 900 }}>
          Sin movimiento · {noMoveDays} días
        </DialogTitle>
        <DialogContent>
          {noMoveLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontWeight: 800, opacity: 0.8 }}>Cargando...</Typography>
            </Stack>
          ) : (
            <>
              {!noMoveList.length ? (
                <Typography sx={{ opacity: 0.75 }}>
                  No hay tarimas “sin movimiento” con este criterio.
                </Typography>
              ) : (
                <Paper variant="outlined" sx={{ borderRadius: 3, overflow: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 850 }}>
                    <TableHead>
                      <TableRow sx={{ background: 'rgba(15,23,42,0.35)' }}>
                        <TableCell sx={{ fontWeight: 900 }}>Tarima</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Último movimiento</TableCell>
                        <TableCell sx={{ fontWeight: 900 }}>Días</TableCell>
                        <TableCell sx={{ fontWeight: 900, textAlign: 'center' }}>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {noMoveList.slice(0, 200).map((x) => (
                        <TableRow key={x.palletId}>
                          <TableCell sx={{ fontFamily: 'monospace', fontWeight: 900 }}>{x.palletCode}</TableCell>
                          <TableCell>{formatDateTime(x.lastMovementAt)}</TableCell>
                          <TableCell>
                            <Chip size="small" label={`${x.daysSince ?? '—'} días`} sx={{ fontWeight: 900 }} />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<HistoryIcon />}
                              onClick={() => {
                                // buscamos ese pallet en rows para abrir movimientos, si existe
                                const found = enriched.find(p => String(p._id) === String(x.palletId))
                                if (found) openMovementsForPallet(found)
                                else {
                                  // fallback: buscarlos por palletCode desde /api/movements
                                  setMovSku('')
                                  setMovMode('PALLET')
                                  setMovOpen(true)
                                  setMovLoading(true)
                                  setMovErr('')
                                  client.get('/api/movements', { params: { palletCode: x.palletCode, limit: 200 } })
                                    .then(r => setMovRows(Array.isArray(r.data) ? r.data : []))
                                    .catch(e => setMovErr(e?.response?.data?.message || e?.message || 'No se pudieron cargar movimientos'))
                                    .finally(() => setMovLoading(false))
                                }
                              }}
                            >
                              Ver
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Paper>
              )}
              <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 1.5 }}>
                *Datos desde <b>/api/movements/no-move</b>.
              </Typography>
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoMoveOpen(false)}>Cerrar</Button>
          <Button variant="outlined" onClick={() => loadNoMove(noMoveDays)} startIcon={<RefreshIcon />}>
            Actualizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* SNACK */}
      <Snackbar
        open={!!snack}
        autoHideDuration={1500}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  )
}

/**
 * Subcomponentes (mismo archivo para pegar)
 */
function GridKpis({ resumen, onAll, onDisponible, onBajo, onAgotado }) {
  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' },
          gap: 2
        }}
      >
        <Paper
          elevation={0}
          onClick={onAll}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            transition: 'transform .12s ease',
            '&:hover': { transform: 'translateY(-1px)' }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 900, opacity: 0.82 }}>Total tarimas</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{resumen.total}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>
            SKUs únicos: <b>{resumen.uniqueSkus}</b> · Qty total: <b>{resumen.totalQty}</b>
          </Typography>
        </Paper>

        <Paper
          elevation={0}
          onClick={onDisponible}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            border: '1px solid rgba(34,197,94,.22)',
            transition: 'transform .12s ease',
            '&:hover': { transform: 'translateY(-1px)' }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 900, opacity: 0.82 }}>Disponible</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{resumen.disponible}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>Pallets con stock estable</Typography>
        </Paper>

        <Paper
          elevation={0}
          onClick={onBajo}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            border: '1px solid rgba(245,158,11,.22)',
            transition: 'transform .12s ease',
            '&:hover': { transform: 'translateY(-1px)' }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 900, opacity: 0.82 }}>Bajo</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{resumen.bajo}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>Requiere reposición</Typography>
        </Paper>

        <Paper
          elevation={0}
          onClick={onAgotado}
          sx={{
            p: 2,
            borderRadius: 3,
            cursor: 'pointer',
            border: '1px solid rgba(239,68,68,.22)',
            transition: 'transform .12s ease',
            '&:hover': { transform: 'translateY(-1px)' }
          }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 900, opacity: 0.82 }}>Agotado</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900 }}>{resumen.agotado}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.72 }}>Sin stock</Typography>
        </Paper>
      </Box>
    </Box>
  )
}

function InfoRow({ label, value, onCopy }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Typography sx={{ opacity: 0.75, fontWeight: 800 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontWeight: 900, fontFamily: label === 'Ubicación' ? 'monospace' : 'inherit' }}>{value}</Typography>
        {onCopy && (
          <Tooltip title="Copiar">
            <IconButton size="small" onClick={onCopy}>
              <ContentCopyIcon fontSize="inherit" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>
    </Stack>
  )
}