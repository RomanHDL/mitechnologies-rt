import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { api } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'
import {
  AREA_CODES, PALLET_STATUS_MAP, ADMIN_ROLES,
  palletStatusLabel,
} from '../lib/constants'
import * as XLSX from 'xlsx'

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
import Grid from '@mui/material/Grid'
import Select from '@mui/material/Select'
import InputLabel from '@mui/material/InputLabel'
import FormControl from '@mui/material/FormControl'

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
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import InventoryIcon from '@mui/icons-material/Inventory'
import TableChartIcon from '@mui/icons-material/TableChart'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'

/* ─── Helpers ─── */
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

function smartParse(input) {
  const raw = safeUpper(input)
  if (!raw) return null

  let m = raw.match(/^(A1|A2|A3|A4|B2|C3)-(F\d{3})-(\d{3})$/)
  if (m) return { type: 'LOCATION_CODE', value: raw }

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

  const rk2 = normalizeRackCode(raw)
  if (/^F\d{3}$/.test(rk2)) return { type: 'RACK', value: rk2 }

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

/** Backend status label + color mapping (importado de constants) */
const BACKEND_STATUS_MAP = PALLET_STATUS_MAP

function backendStatusLabel(s) {
  return palletStatusLabel(s)
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

/** Build location display string from pallet */
function locationDisplay(p) {
  const loc = p?.location
  if (!loc) return '—'
  if (loc.code) return loc.code
  const parts = [loc.area, loc.rack, loc.level, loc.position].filter(Boolean)
  return parts.length ? parts.join('-') : '—'
}

/* ═══════════════════════════════════════════════════════════════
   InventoryPage – Enterprise Inventory Management
   ═══════════════════════════════════════════════════════════════ */
export default function InventoryPage() {
  const { token, user } = useAuth()
  const nav = useNavigate()
  const ps = usePageStyles()

  // core data
  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)

  // operator mode
  const [operatorMode, setOperatorMode] = useState(() => localStorage.getItem('inv_operator_mode') === '1')

  // view mode
  const [view, setView] = useState('TABLE')

  // filters
  const [statusFilter, setStatusFilter] = useState('')       // frontend qty-based: DISPONIBLE | BAJO | AGOTADO
  const [backendStatusFilter, setBackendStatusFilter] = useState('') // backend status: IN_STOCK | QUARANTINE | DAMAGED | RETURNED | OUT
  const [areaFilter, setAreaFilter] = useState('')
  const [rackFilter, setRackFilter] = useState('')
  const [lotFilter, setLotFilter] = useState('')
  const [sortBy, setSortBy] = useState('RECENT')
  const [showStaleOnly, setShowStaleOnly] = useState(false)

  // detail dialog
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)

  // snackbar
  const [snack, setSnack] = useState('')

  // movements dialog
  const [movOpen, setMovOpen] = useState(false)
  const [movLoading, setMovLoading] = useState(false)
  const [movErr, setMovErr] = useState('')
  const [movRows, setMovRows] = useState([])
  const [movMode, setMovMode] = useState('PALLET')
  const [movSku, setMovSku] = useState('')

  // no-move (stale inventory)
  const [noMoveDays, setNoMoveDays] = useState(() => Number(localStorage.getItem('inv_nomove_days') || '30'))
  const [noMoveLoading, setNoMoveLoading] = useState(false)
  const [noMoveErr, setNoMoveErr] = useState('')
  const [noMoveList, setNoMoveList] = useState([])
  const [noMoveOpen, setNoMoveOpen] = useState(false)

  // change status dialog
  const [statusDlgOpen, setStatusDlgOpen] = useState(false)
  const [statusDlgPallet, setStatusDlgPallet] = useState(null)
  const [statusDlgValue, setStatusDlgValue] = useState('IN_STOCK')
  const [statusDlgNote, setStatusDlgNote] = useState('')
  const [statusDlgLoading, setStatusDlgLoading] = useState(false)

  // adjust inventory dialog
  const [adjustDlgOpen, setAdjustDlgOpen] = useState(false)
  const [adjustDlgPallet, setAdjustDlgPallet] = useState(null)
  const [adjustDlgItems, setAdjustDlgItems] = useState([])
  const [adjustDlgLoading, setAdjustDlgLoading] = useState(false)

  const client = useMemo(() => api(), [token])

  const canAdmin = ADMIN_ROLES.includes(user?.role)

  /* ─── Data loading ─── */
  const load = async () => {
    setLoading(true)
    try {
      const res = await client.get('/api/pallets', { params: { q } })
      setRows(Array.isArray(res.data) ? res.data : [])
      setLastUpdatedAt(new Date())
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, q])

  /* ─── No-move ─── */
  const loadNoMove = async (days = noMoveDays) => {
    setNoMoveLoading(true)
    setNoMoveErr('')
    try {
      const res = await client.get('/api/movements/no-move', { params: { days, limit: 500 } })
      setNoMoveList(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setNoMoveErr(e?.message || 'Error cargando "sin movimiento"')
      setNoMoveList([])
    } finally {
      setNoMoveLoading(false)
    }
  }

  useEffect(() => {
    loadNoMove(noMoveDays)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    localStorage.setItem('inv_nomove_days', String(noMoveDays || 30))
  }, [noMoveDays])

  useEffect(() => {
    localStorage.setItem('inv_operator_mode', operatorMode ? '1' : '0')
  }, [operatorMode])

  /* ─── Stale pallet IDs set for fast lookup ─── */
  const stalePalletIds = useMemo(() => {
    const s = new Set()
    for (const x of noMoveList) {
      if (x.palletId) s.add(String(x.palletId))
    }
    return s
  }, [noMoveList])

  /* ─── Summary / KPIs ─── */
  const resumen = useMemo(() => {
    let total = rows.length
    let bajo = 0, agotado = 0, disponible = 0
    let inStock = 0, quarantine = 0, damaged = 0, returned = 0, out = 0
    let palletsConUbicacion = 0
    let totalQty = 0
    const skuSet = new Set()

    for (const p of rows) {
      const qty = sumQty(p.items)
      totalQty += qty

      if (qty === 0) agotado++
      else if (qty < 5) bajo++
      else disponible++

      // count backend statuses
      const bs = safeUpper(p.status)
      if (bs === 'IN_STOCK') inStock++
      else if (bs === 'QUARANTINE') quarantine++
      else if (bs === 'DAMAGED') damaged++
      else if (bs === 'RETURNED') returned++
      else if (bs === 'OUT') out++
      else inStock++ // default to in_stock if no status

      if (p?.location?.code) palletsConUbicacion++

      for (const it of (p.items || [])) {
        if (it?.sku) skuSet.add(String(it.sku))
      }
    }

    return {
      total, bajo, agotado, disponible,
      inStock, quarantine, damaged, returned, out,
      totalQty, uniqueSkus: skuSet.size, palletsConUbicacion
    }
  }, [rows])

  /* ─── Enriched rows ─── */
  const enriched = useMemo(() => {
    return rows.map((p) => {
      const qty = sumQty(p.items)
      const status = statusFromQty(qty)
      const locCode = locationDisplay(p)
      const area = getAreaFromLocationCode(locCode)
      const rack = getRackFromLocationCode(locCode)
      const slot = getSlotFromLocationCode(locCode)
      const lot = p?.lot || ''
      const itemsText = (p.items || []).map(it => `${it.sku}(${it.qty})`).join(', ')
      const mainSku = (p.items && p.items[0] && p.items[0].sku) ? String(p.items[0].sku) : ''
      const backendStatus = safeUpper(p.status) || 'IN_STOCK'
      return { ...p, _qty: qty, _status: status, _locCode: locCode, _area: area, _rack: rack, _slot: slot, _lot: lot, _itemsText: itemsText, _mainSku: mainSku, _backendStatus: backendStatus }
    })
  }, [rows])

  /* ─── Filtered + sorted rows ─── */
  const filtered = useMemo(() => {
    let list = enriched

    if (statusFilter) list = list.filter(p => p._status === statusFilter)
    if (backendStatusFilter) list = list.filter(p => p._backendStatus === backendStatusFilter)
    if (areaFilter) list = list.filter(p => p._area === areaFilter)
    if (rackFilter) list = list.filter(p => safeUpper(p._rack) === safeUpper(rackFilter))
    if (lotFilter) list = list.filter(p => safeUpper(p._lot).includes(safeUpper(lotFilter)))
    if (showStaleOnly) list = list.filter(p => stalePalletIds.has(String(p._id)))

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
  }, [enriched, statusFilter, backendStatusFilter, areaFilter, rackFilter, lotFilter, sortBy, showStaleOnly, stalePalletIds])

  /* ─── Alerts ─── */
  const alerts = useMemo(() => {
    const res = []
    if (resumen.agotado > 0) res.push({ key: 'agotado', label: `Agotado: ${resumen.agotado}`, tone: 'error', action: () => setStatusFilter('AGOTADO') })
    if (resumen.bajo > 0) res.push({ key: 'bajo', label: `Bajo stock: ${resumen.bajo}`, tone: 'warning', action: () => setStatusFilter('BAJO') })
    const sinUb = resumen.total - resumen.palletsConUbicacion
    if (sinUb > 0) res.push({ key: 'sinub', label: `Sin ubicación: ${sinUb}`, tone: 'info', action: () => { /* UI */ } })
    if (noMoveList.length > 0) res.push({ key: 'nomove', label: `Sin movimiento ${noMoveDays} días: ${noMoveList.length}`, tone: 'warning', action: () => setNoMoveOpen(true) })
    return res.slice(0, 4)
  }, [resumen, noMoveList.length, noMoveDays])

  /* ─── Smart search hint ─── */
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
    setBackendStatusFilter('')
    setAreaFilter('')
    setRackFilter('')
    setLotFilter('')
    setSortBy('RECENT')
    setShowStaleOnly(false)
  }

  /* ─── Excel Export ─── */
  const exportFilteredExcel = () => {
    const header = ['Código', 'Ubicación', 'Estado (Backend)', 'Estado (Qty)', 'Cantidad', 'Items', 'Lote', 'Área', 'Rack', 'Última actualización']
    const body = filtered.map(p => ([
      p.code || '',
      p._locCode || '—',
      backendStatusLabel(p._backendStatus),
      statusUI(p._status).label,
      p._qty || 0,
      p._itemsText || '',
      p._lot || '—',
      p._area || '—',
      p._rack || '—',
      formatDateTime(p.updatedAt || p.createdAt)
    ]))
    const ws = XLSX.utils.aoa_to_sheet([header, ...body])
    // auto column widths
    ws['!cols'] = header.map((_, i) => ({ wch: Math.max(header[i].length, 14) }))
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Inventario')
    XLSX.writeFile(wb, `inventario_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  /* ─── CSV Export (legacy) ─── */
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

  /* ─── Detail dialog ─── */
  const openDetail = (p) => {
    setSelected(p)
    setOpen(true)
  }

  const copyText = async (text) => {
    try {
      await navigator.clipboard.writeText(String(text || ''))
      setSnack('Copiado')
    } catch {
      setSnack('No se pudo copiar')
    }
  }

  /* ─── Map model ─── */
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

  /* ─── Movements for pallet ─── */
  const openMovementsForPallet = async (pallet) => {
    if (!pallet?._id) return
    setMovMode('PALLET')
    setMovSku('')
    setMovOpen(true)
    setMovLoading(true)
    setMovErr('')
    setMovRows([])
    try {
      const res = await client.get(`/api/movements`, { params: { palletId: pallet._id, limit: 200 } })
      setMovRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setMovErr(e?.message || 'No se pudieron cargar movimientos')
    } finally {
      setMovLoading(false)
    }
  }

  /* ─── Movements by SKU ─── */
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
      setMovErr(e?.message || 'No se pudieron cargar movimientos por SKU')
    } finally {
      setMovLoading(false)
    }
  }

  /* ─── Navigate to racks ─── */
  const openInRacks = (locCode) => {
    const rack = getRackFromLocationCode(locCode)
    if (!rack) return
    nav('/racks', { state: { rackCode: rack, highlight: safeUpper(locCode) } })
  }

  /* ─── Change Status ─── */
  const openChangeStatus = (pallet) => {
    setStatusDlgPallet(pallet)
    setStatusDlgValue(pallet._backendStatus || pallet.status || 'IN_STOCK')
    setStatusDlgNote('')
    setStatusDlgOpen(true)
  }

  const submitChangeStatus = async () => {
    if (!statusDlgPallet?._id) return
    setStatusDlgLoading(true)
    try {
      await client.patch(`/api/pallets/${statusDlgPallet._id}/status`, {
        status: statusDlgValue,
        note: statusDlgNote || undefined
      })
      setSnack(`Status cambiado a ${backendStatusLabel(statusDlgValue)}`)
      setStatusDlgOpen(false)
      load() // reload data
    } catch (e) {
      setSnack(e?.message || 'Error al cambiar status')
    } finally {
      setStatusDlgLoading(false)
    }
  }

  /* ─── Adjust Inventory ─── */
  const openAdjustInventory = (pallet) => {
    setAdjustDlgPallet(pallet)
    setAdjustDlgItems((pallet.items || []).map(it => ({ sku: it.sku || '', qty: it.qty || 0 })))
    setAdjustDlgOpen(true)
  }

  const updateAdjustItem = (index, field, value) => {
    setAdjustDlgItems(prev => {
      const copy = [...prev]
      copy[index] = { ...copy[index], [field]: field === 'qty' ? Number(value) || 0 : value }
      return copy
    })
  }

  const addAdjustItem = () => {
    setAdjustDlgItems(prev => [...prev, { sku: '', qty: 0 }])
  }

  const removeAdjustItem = (index) => {
    setAdjustDlgItems(prev => prev.filter((_, i) => i !== index))
  }

  const submitAdjustInventory = async () => {
    if (!adjustDlgPallet?._id) return
    const validItems = adjustDlgItems.filter(it => it.sku && it.qty >= 0)
    if (!validItems.length) { setSnack('Agrega al menos un item válido'); return }
    setAdjustDlgLoading(true)
    try {
      await client.post(`/api/pallets/${adjustDlgPallet._id}/adjust`, validItems)
      setSnack('Inventario ajustado correctamente')
      setAdjustDlgOpen(false)
      load()
    } catch (e) {
      setSnack(e?.message || 'Error al ajustar inventario')
    } finally {
      setAdjustDlgLoading(false)
    }
  }

  /* ═══════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════ */
  return (
    <Box>
      {/* ─── HEADER ─── */}
      <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>
            Inventario
          </Typography>
          <Typography variant="body2" sx={ps.pageSubtitle}>
            Centro de Inventario · Última actualización: <b>{lastUpdatedAt ? lastUpdatedAt.toLocaleString() : '—'}</b>
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <FormControlLabel
            sx={{ mr: 0.5, userSelect: 'none' }}
            control={<Switch checked={operatorMode} onChange={(e) => setOperatorMode(e.target.checked)} />}
            label={<Typography sx={{ fontWeight: 700, fontSize: 13, color: 'text.primary' }}>Modo operador</Typography>}
          />

          <Tooltip title="Recargar">
            <IconButton onClick={load} sx={ps.actionBtn('primary')}>
              <RefreshIcon color="primary" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Exportar Excel (filtrado)">
            <IconButton onClick={exportFilteredExcel} sx={ps.actionBtn('primary')}>
              <TableChartIcon color="primary" />
            </IconButton>
          </Tooltip>

          <Tooltip title="Exportar CSV (filtrado)">
            <IconButton onClick={exportFilteredCSV} sx={ps.actionBtn('primary')}>
              <DownloadIcon color="primary" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Box>

      {/* ─── 5 KPI CARDS ─── */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
        gap: 2,
        mb: 2
      }}>
        <Paper elevation={0} onClick={() => { setBackendStatusFilter(''); setStatusFilter('') }} sx={ps.kpiCard('blue')}>
          <Typography variant="subtitle2" sx={ps.pageSubtitle}>Total Tarimas</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{resumen.total}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            SKUs únicos: <b>{resumen.uniqueSkus}</b>
          </Typography>
        </Paper>

        <Paper elevation={0} onClick={() => { setBackendStatusFilter('IN_STOCK'); setStatusFilter('') }} sx={ps.kpiCard('green')}>
          <Typography variant="subtitle2" sx={ps.pageSubtitle}>En Stock</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{resumen.inStock}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Inventario activo</Typography>
        </Paper>

        <Paper elevation={0} onClick={() => { setBackendStatusFilter('QUARANTINE'); setStatusFilter('') }} sx={ps.kpiCard('amber')}>
          <Typography variant="subtitle2" sx={ps.pageSubtitle}>En Cuarentena</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{resumen.quarantine}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>En revisión</Typography>
        </Paper>

        <Paper elevation={0} onClick={() => { setBackendStatusFilter('DAMAGED'); setStatusFilter('') }} sx={ps.kpiCard('red')}>
          <Typography variant="subtitle2" sx={ps.pageSubtitle}>Dañadas</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{resumen.damaged}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Requieren atención</Typography>
        </Paper>

        <Paper elevation={0} onClick={() => { setBackendStatusFilter(''); setStatusFilter('') }} sx={ps.kpiCard('blue')}>
          <Typography variant="subtitle2" sx={ps.pageSubtitle}>Piezas Totales</Typography>
          <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary' }}>{resumen.totalQty.toLocaleString()}</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>Suma de items</Typography>
        </Paper>
      </Box>

      {/* ─── ALERTS ─── */}
      {!!alerts.length && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {alerts.map(a => (
            <Alert
              key={a.key}
              severity={a.tone}
              sx={{ borderRadius: 2 }}
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

      {/* ─── SEARCH + FILTERS ─── */}
      <Paper elevation={0} sx={{ ...ps.card, p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            size="small"
            label='Buscar: SKU, "A1-F059-012", "F059", lote...'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySmart()}
            sx={{ flex: 1, ...ps.inputSx }}
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

        {/* hint + active filter chips */}
        {(smartHint || statusFilter || backendStatusFilter || areaFilter || rackFilter || lotFilter || showStaleOnly) && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1.25 }} flexWrap="wrap" useFlexGap>
            {smartHint && <Chip size="small" label={`${smartHint.label}: ${smartHint.value}`} sx={{ ...ps.metricChip('info'), fontWeight: 700 }} />}
            {!!statusFilter && <Chip size="small" label={`Filtro estado: ${statusUI(statusFilter).label}`} sx={{ ...ps.metricChip('warn'), fontWeight: 700 }} />}
            {!!backendStatusFilter && <Chip size="small" label={`Status: ${backendStatusLabel(backendStatusFilter)}`} sx={{ ...ps.metricChip('info'), fontWeight: 700 }} onDelete={() => setBackendStatusFilter('')} />}
            {!!areaFilter && <Chip size="small" label={`Área: ${areaFilter}`} sx={{ ...ps.metricChip('default'), fontWeight: 700 }} />}
            {!!rackFilter && <Chip size="small" label={`Rack: ${rackFilter}`} sx={{ ...ps.metricChip('default'), fontWeight: 700 }} />}
            {!!lotFilter && <Chip size="small" label={`Lote: ${lotFilter}`} sx={{ ...ps.metricChip('default'), fontWeight: 700 }} />}
            {showStaleOnly && (
              <Chip
                size="small"
                icon={<WarningAmberIcon />}
                label={`Sin Movimiento (${noMoveDays}d)`}
                sx={{ ...ps.metricChip('warn'), fontWeight: 700 }}
                onDelete={() => setShowStaleOnly(false)}
              />
            )}
            {(statusFilter || backendStatusFilter || areaFilter || rackFilter || lotFilter || sortBy !== 'RECENT' || showStaleOnly) && (
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
            label="Status (backend)"
            value={backendStatusFilter}
            onChange={(e) => setBackendStatusFilter(e.target.value)}
            sx={{ minWidth: 180, ...ps.inputSx }}
          >
            <MenuItem value="">Todos</MenuItem>
            {Object.entries(PALLET_STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
          </TextField>

          <TextField
            select
            size="small"
            label="Estado (qty)"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            sx={{ minWidth: 180, ...ps.inputSx }}
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
            sx={{ minWidth: 160, ...ps.inputSx }}
          >
            <MenuItem value="">Todas</MenuItem>
            {AREA_CODES.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
            <MenuItem value="B2">B2</MenuItem>
            <MenuItem value="C3">C3</MenuItem>
          </TextField>

          <TextField
            size="small"
            label="Rack / BIN"
            value={rackFilter}
            onChange={(e) => setRackFilter(normalizeRackCode(e.target.value))}
            sx={{ minWidth: 170, ...ps.inputSx }}
          />

          <TextField
            size="small"
            label="SKU"
            value={lotFilter}
            onChange={(e) => setLotFilter(e.target.value)}
            sx={{ minWidth: 160, ...ps.inputSx }}
          />

          <TextField
            select
            size="small"
            label="Ordenar"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            sx={{ minWidth: 190, ...ps.inputSx }}
          >
            <MenuItem value="RECENT">Más reciente</MenuItem>
            <MenuItem value="QTY_DESC">Cantidad (mayor-menor)</MenuItem>
            <MenuItem value="QTY_ASC">Cantidad (menor-mayor)</MenuItem>
            <MenuItem value="CODE">Código (A-Z)</MenuItem>
          </TextField>

          <Box sx={{ flex: 1 }} />

          <Button size="small" onClick={load} disabled={loading}>
            {loading ? 'Cargando...' : 'Recargar'}
          </Button>
        </Stack>

        {/* Sin Movimiento chip + SKU search bar */}
        <Divider sx={{ my: 2 }} />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <Chip
            icon={<WarningAmberIcon />}
            label={showStaleOnly
              ? `Sin Movimiento: ${stalePalletIds.size} (activo)`
              : `Sin Movimiento (${noMoveDays}d): ${noMoveList.length}`}
            onClick={() => setShowStaleOnly(prev => !prev)}
            sx={{
              ...ps.metricChip(showStaleOnly ? 'bad' : 'warn'),
              fontWeight: 700,
              cursor: 'pointer',
              px: 1,
            }}
          />

          <TextField
            size="small"
            label="Movimientos por SKU"
            value={movSku}
            onChange={(e) => setMovSku(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchMovementsBySku()}
            sx={{ minWidth: 260, ...ps.inputSx }}
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
            sx={{ width: 160, ...ps.inputSx }}
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
          <Alert severity="warning" sx={{ mt: 1.5, borderRadius: 2 }}>
            No se pudo cargar "sin movimiento": {noMoveErr}
          </Alert>
        )}
      </Paper>

      {/* ─── MAP VIEW ─── */}
      {view === 'MAP' ? (
        <Paper elevation={0} sx={{ ...ps.card, p: 2, mb: 2 }}>
          <Box sx={ps.cardHeader}>
            <Typography variant="subtitle2" sx={ps.cardHeaderTitle}>
              Vista Ubicaciones (preview)
            </Typography>
            <Typography variant="caption" sx={ps.cardHeaderSubtitle}>
              *Modo seguro: agrupa por rack con tarimas encontradas
            </Typography>
          </Box>

          <Divider sx={{ my: 1.5 }} />

          <Stack spacing={2} sx={{ px: 2, pb: 2 }}>
            {mapModel.length === 0 && (
              <Typography variant="body2" sx={ps.emptyText}>
                No hay datos para mostrar en mapa todavía.
              </Typography>
            )}

            {mapModel.map(group => (
              <Paper key={group.rack} variant="outlined" sx={{ ...ps.card, p: 1.6 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', color: 'text.primary' }}>
                    Rack: {group.rack}
                  </Typography>
                  <Chip size="small" label={`${group.count} tarimas`} sx={ps.metricChip('default')} />
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
                          <Typography sx={{ fontWeight: 700, fontFamily: 'monospace', flex: 1, color: 'text.primary' }}>
                            {p.code}
                          </Typography>
                        </Stack>
                        <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block' }}>
                          {p._locCode || '—'}
                        </Typography>
                        <Stack direction="row" spacing={1} sx={{ mt: 0.75 }} alignItems="center">
                          <Chip size="small" label={ui.label} sx={ui.chipSx} />
                          <Chip size="small" label={`Qty: ${p._qty}`} sx={ps.metricChip('default')} />
                        </Stack>
                      </Paper>
                    )
                  })}
                </Box>

                {group.items.length > 12 && (
                  <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1 }}>
                    Mostrando 12 de {group.items.length} tarimas en este rack.
                  </Typography>
                )}
              </Paper>
            ))}
          </Stack>
        </Paper>
      ) : null}

      {/* ─── TABLE VIEW ─── */}
      {view === 'TABLE' ? (
        <Paper elevation={1} sx={{ ...ps.card, p: 0, overflow: 'auto' }}>
          <Table size="small" sx={{ minWidth: 1150 }}>
            <TableHead>
              <TableRow sx={{ ...ps.tableHeaderRow, position: 'sticky', top: 0, zIndex: 1 }}>
                <TableCell>Código</TableCell>
                <TableCell>Ubicación</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Estatus Qty</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Lote</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((p, idx) => {
                const ui = statusUI(p._status)
                const itemsText = p._itemsText || ''
                const loc = p._locCode || '—'
                const isStale = stalePalletIds.has(String(p._id))

                return (
                  <TableRow
                    key={p._id}
                    sx={{
                      ...ps.tableRow(idx),
                      ...(isStale ? { borderLeft: '3px solid #f59e0b' } : {})
                    }}
                  >
                    <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 700 }}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span>{p.code}</span>
                        <Tooltip title="Copiar código">
                          <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => copyText(p.code)}>
                            <ContentCopyIcon fontSize="inherit" />
                          </IconButton>
                        </Tooltip>
                        {isStale && (
                          <Tooltip title={`Sin movimiento > ${noMoveDays} días`}>
                            <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 16 }} />
                          </Tooltip>
                        )}
                      </Stack>
                      <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                        Área: <b>{p._area || '—'}</b> · Rack: <b>{p._rack || '—'}</b>
                      </Typography>
                    </TableCell>

                    <TableCell sx={ps.cellText}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <span style={{ fontFamily: loc !== '—' ? 'monospace' : undefined }}>{loc}</span>

                        {loc !== '—' && (
                          <>
                            <Tooltip title="Copiar ubicación">
                              <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => copyText(loc)}>
                                <ContentCopyIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Abrir en Racks">
                              <IconButton
                                size="small"
                                sx={ps.actionBtn('primary')}
                                onClick={() => openInRacks(loc)}
                              >
                                <RoomIcon fontSize="inherit" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </Stack>
                    </TableCell>

                    <TableCell sx={ps.cellText}>
                      <Chip
                        size="small"
                        label={backendStatusLabel(p._backendStatus)}
                        color={BACKEND_STATUS_MAP[p._backendStatus]?.color || 'default'}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                      />
                    </TableCell>

                    <TableCell sx={ps.cellText}>
                      <Tooltip title={ui.label} arrow>{ui.icon}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.primary', fontWeight: 700 }}>
                        {ui.label}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ ...ps.cellText, fontWeight: 700 }}>
                      {p._qty}
                    </TableCell>

                    <TableCell sx={{ ...ps.cellText, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={itemsText} arrow>
                        <span>{itemsText.length > 30 ? itemsText.slice(0, 30) + '...' : itemsText}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={ps.cellText}>{p._lot || '—'}</TableCell>

                    <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(p)}>
                          <SearchIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Ver Movimientos">
                        <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openMovementsForPallet(p)}>
                          <HistoryIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Cambiar Status">
                        <IconButton size="small" sx={ps.actionBtn('warning')} onClick={() => openChangeStatus(p)}>
                          <SwapHorizIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      {canAdmin && (
                        <Tooltip title="Ajustar Inventario">
                          <IconButton size="small" sx={ps.actionBtn('success')} onClick={() => openAdjustInventory(p)}>
                            <InventoryIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}

                      <Tooltip title="Editar (UI)">
                        <span>
                          <IconButton size="small" sx={ps.actionBtn('warning')} disabled={!canAdmin}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Eliminar (UI)">
                        <span>
                          <IconButton size="small" sx={ps.actionBtn('error')} disabled={!canAdmin}>
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
                  <TableCell colSpan={8} sx={ps.emptyText}>
                    No hay resultados con los filtros actuales.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      ) : null}

      {/* ═══ MODAL: DETALLE ═══ */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>
          Detalle de tarima
        </DialogTitle>
        <DialogContent>
          {!selected ? null : (
            <Box>
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 18, color: 'text.primary' }}>
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
                <InfoRow label="Status (backend)" value={backendStatusLabel(selected._backendStatus || selected.status)} />
                <InfoRow label="Estado (qty)" value={statusUI(selected._status).label} />
                <InfoRow label="Cantidad total" value={String(selected._qty || 0)} />
                <InfoRow label="Lote" value={selected._lot || '—'} />
                <InfoRow label="Área / Rack" value={`${selected._area || '—'} · ${selected._rack || '—'}`} />
              </Stack>

              <Divider sx={{ my: 2 }} />

              {/* ─── Items mini table ─── */}
              <Typography sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Items</Typography>
              {(selected.items || []).length ? (
                <Paper variant="outlined" sx={{ ...ps.card, overflow: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={ps.tableHeaderRow}>
                        <TableCell>SKU</TableCell>
                        <TableCell sx={{ textAlign: 'right' }}>Cantidad</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(selected.items || []).map((it, i) => (
                        <TableRow key={`${it.sku}-${i}`} sx={ps.tableRow(i)}>
                          <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 700 }}>{it.sku}</TableCell>
                          <TableCell sx={{ ...ps.cellText, textAlign: 'right', fontWeight: 700 }}>{it.qty || 0}</TableCell>
                        </TableRow>
                      ))}
                      <TableRow>
                        <TableCell sx={{ ...ps.cellText, fontWeight: 700 }}>Total</TableCell>
                        <TableCell sx={{ ...ps.cellText, textAlign: 'right', fontWeight: 700 }}>{selected._qty || 0}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </Paper>
              ) : (
                <Paper variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>Sin items</Typography>
                </Paper>
              )}

              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
                *Este detalle usa tu /api/pallets y el historial usa /api/movements?palletId=X.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          {selected && (
            <>
              <Button onClick={() => { setOpen(false); openChangeStatus(selected) }} startIcon={<SwapHorizIcon />}>
                Cambiar Status
              </Button>
              {canAdmin && (
                <Button onClick={() => { setOpen(false); openAdjustInventory(selected) }} startIcon={<InventoryIcon />}>
                  Ajustar
                </Button>
              )}
            </>
          )}
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ═══ MODAL: CAMBIAR STATUS ═══ */}
      <Dialog open={statusDlgOpen} onClose={() => setStatusDlgOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>
          Cambiar Status
        </DialogTitle>
        <DialogContent>
          {statusDlgPallet && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Tarima: <b style={{ fontFamily: 'monospace' }}>{statusDlgPallet.code}</b>
              </Typography>

              <TextField
                select
                fullWidth
                size="small"
                label="Nuevo Status"
                value={statusDlgValue}
                onChange={(e) => setStatusDlgValue(e.target.value)}
                sx={{ mb: 2, ...ps.inputSx }}
              >
                {Object.entries(PALLET_STATUS_MAP).map(([k, v]) => <MenuItem key={k} value={k}>{v.label}</MenuItem>)}
              </TextField>

              <TextField
                fullWidth
                size="small"
                label="Nota (opcional)"
                value={statusDlgNote}
                onChange={(e) => setStatusDlgNote(e.target.value)}
                multiline
                rows={2}
                sx={ps.inputSx}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusDlgOpen(false)} disabled={statusDlgLoading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={submitChangeStatus}
            disabled={statusDlgLoading}
          >
            {statusDlgLoading ? 'Guardando...' : 'Cambiar Status'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ MODAL: AJUSTAR INVENTARIO ═══ */}
      <Dialog open={adjustDlgOpen} onClose={() => setAdjustDlgOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>
          Ajustar Inventario
        </DialogTitle>
        <DialogContent>
          {adjustDlgPallet && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="body2" sx={{ color: 'text.secondary', mb: 2 }}>
                Tarima: <b style={{ fontFamily: 'monospace' }}>{adjustDlgPallet.code}</b>
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow sx={ps.tableHeaderRow}>
                    <TableCell>SKU</TableCell>
                    <TableCell sx={{ width: 120 }}>Cantidad</TableCell>
                    <TableCell sx={{ width: 50, textAlign: 'center' }}></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {adjustDlgItems.map((it, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          value={it.sku}
                          onChange={(e) => updateAdjustItem(i, 'sku', e.target.value)}
                          placeholder="SKU"
                          sx={ps.inputSx}
                        />
                      </TableCell>
                      <TableCell>
                        <TextField
                          size="small"
                          fullWidth
                          type="number"
                          value={it.qty}
                          onChange={(e) => updateAdjustItem(i, 'qty', e.target.value)}
                          inputProps={{ min: 0 }}
                          sx={ps.inputSx}
                        />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <IconButton size="small" sx={ps.actionBtn('error')} onClick={() => removeAdjustItem(i)}>
                          <RemoveIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addAdjustItem}
                sx={{ mt: 1 }}
              >
                Agregar item
              </Button>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdjustDlgOpen(false)} disabled={adjustDlgLoading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={submitAdjustInventory}
            disabled={adjustDlgLoading}
          >
            {adjustDlgLoading ? 'Guardando...' : 'Guardar Ajuste'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ═══ MODAL: MOVIMIENTOS ═══ */}
      <Dialog open={movOpen} onClose={() => setMovOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>
          Movimientos {movMode === 'SKU' ? `· SKU ${safeUpper(movSku)}` : ''}
        </DialogTitle>
        <DialogContent>
          {movErr && (
            <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
              {movErr}
            </Alert>
          )}

          {movLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>Cargando movimientos...</Typography>
            </Stack>
          ) : (
            <>
              {!movRows.length ? (
                <Typography sx={{ color: 'text.secondary' }}>
                  No hay movimientos para mostrar.
                </Typography>
              ) : (
                <Paper variant="outlined" sx={{ ...ps.card, overflow: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 900 }}>
                    <TableHead>
                      <TableRow sx={ps.tableHeaderRow}>
                        <TableCell>Fecha</TableCell>
                        <TableCell>Tipo</TableCell>
                        <TableCell>Tarima</TableCell>
                        <TableCell>De</TableCell>
                        <TableCell>A</TableCell>
                        <TableCell>Nota</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {movRows.map((m, i) => {
                        const from = m?.fromLocation?.code || (m?.fromLocation ? `${m.fromLocation.area}-${m.fromLocation.level}${m.fromLocation.position}` : '—')
                        const to = m?.toLocation?.code || (m?.toLocation ? `${m.toLocation.area}-${m.toLocation.level}${m.toLocation.position}` : '—')
                        return (
                          <TableRow key={m.id || `${m.type}-${m.createdAt}-${i}`} sx={ps.tableRow(i)}>
                            <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{formatDateTime(m.createdAt)}</TableCell>
                            <TableCell sx={ps.cellText}>
                              <Chip size="small" label={m.type || '—'} sx={{ ...ps.metricChip('info'), fontWeight: 700 }} />
                            </TableCell>
                            <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 700 }}>
                              {m?.pallet?.code || '—'}
                              {m?.pallet?.code && (
                                <Tooltip title="Copiar código tarima">
                                  <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => copyText(m.pallet.code)}>
                                    <ContentCopyIcon fontSize="inherit" />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </TableCell>
                            <TableCell sx={{ ...ps.cellText, fontFamily: from !== '—' ? 'monospace' : undefined }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <span>{from}</span>
                                {from !== '—' && from.includes('-F') && (
                                  <Tooltip title="Abrir en Racks">
                                    <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openInRacks(from)}><RoomIcon fontSize="inherit" /></IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ ...ps.cellText, fontFamily: to !== '—' ? 'monospace' : undefined }}>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <span>{to}</span>
                                {to !== '—' && to.includes('-F') && (
                                  <Tooltip title="Abrir en Racks">
                                    <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openInRacks(to)}><RoomIcon fontSize="inherit" /></IconButton>
                                  </Tooltip>
                                )}
                              </Stack>
                            </TableCell>
                            <TableCell sx={{ ...ps.cellText, maxWidth: 380 }}>
                              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
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

      {/* ═══ MODAL: NO MOVE ═══ */}
      <Dialog open={noMoveOpen} onClose={() => setNoMoveOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>
          Sin movimiento · {noMoveDays} días
        </DialogTitle>
        <DialogContent>
          {noMoveLoading ? (
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ py: 2 }}>
              <CircularProgress size={18} />
              <Typography sx={{ fontWeight: 600, color: 'text.secondary' }}>Cargando...</Typography>
            </Stack>
          ) : (
            <>
              {!noMoveList.length ? (
                <Typography sx={{ color: 'text.secondary' }}>
                  No hay tarimas "sin movimiento" con este criterio.
                </Typography>
              ) : (
                <Paper variant="outlined" sx={{ ...ps.card, overflow: 'auto' }}>
                  <Table size="small" sx={{ minWidth: 850 }}>
                    <TableHead>
                      <TableRow sx={ps.tableHeaderRow}>
                        <TableCell>Tarima</TableCell>
                        <TableCell>Último movimiento</TableCell>
                        <TableCell>Días</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>Acción</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {noMoveList.slice(0, 200).map((x, idx) => (
                        <TableRow key={x.palletId} sx={ps.tableRow(idx)}>
                          <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 700 }}>{x.palletCode}</TableCell>
                          <TableCell sx={ps.cellText}>{formatDateTime(x.lastMovementAt)}</TableCell>
                          <TableCell sx={ps.cellText}>
                            <Chip size="small" label={`${x.daysSince ?? '—'} días`} sx={{ ...ps.metricChip('warn'), fontWeight: 700 }} />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              startIcon={<HistoryIcon />}
                              onClick={() => {
                                const found = enriched.find(p => String(p._id) === String(x.palletId))
                                if (found) openMovementsForPallet(found)
                                else {
                                  setMovSku('')
                                  setMovMode('PALLET')
                                  setMovOpen(true)
                                  setMovLoading(true)
                                  setMovErr('')
                                  client.get('/api/movements', { params: { palletId: x.palletId, limit: 200 } })
                                    .then(r => setMovRows(Array.isArray(r.data) ? r.data : []))
                                    .catch(e => setMovErr(e?.message || 'No se pudieron cargar movimientos'))
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
              <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', mt: 1.5 }}>
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

      {/* ─── SNACKBAR ─── */}
      <Snackbar
        open={!!snack}
        autoHideDuration={1500}
        onClose={() => setSnack('')}
        message={snack}
      />
    </Box>
  )
}

/* ═══════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════ */
function InfoRow({ label, value, onCopy }) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
      <Typography sx={{ color: 'text.secondary', fontWeight: 600 }}>{label}</Typography>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography sx={{ fontWeight: 700, fontFamily: label === 'Ubicación' ? 'monospace' : 'inherit', color: 'text.primary' }}>{value}</Typography>
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
