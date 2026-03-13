import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import TableFooter from '@mui/material/TableFooter'
import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import InfoIcon from '@mui/icons-material/Info'
import DownloadIcon from '@mui/icons-material/Download'
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RateReviewIcon from '@mui/icons-material/RateReview'
import * as XLSX from 'xlsx'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'
import dayjs from 'dayjs'

/* ── KPI Card component ── */
function KpiCard({ title, value, subtitle, accent = 'blue', ps }) {
  return (
    <Paper elevation={0} sx={ps.kpiCard(accent)}>
      <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 900, color: 'text.primary', mt: 0.5 }}>
        {value}
      </Typography>
      {subtitle && (
        <Typography variant="caption" sx={{ color: 'text.secondary', mt: 0.5 }}>
          {subtitle}
        </Typography>
      )}
    </Paper>
  )
}

/* ── Scope badge ── */
function ScopeBadge({ scope, area, level, ps }) {
  const label = scope === 'LEVEL'
    ? `${scope} — ${area || '?'} / Nivel ${level || '?'}`
    : scope === 'CUSTOM'
      ? `CUSTOM — ${area || '?'}`
      : `AREA — ${area || '?'}`
  const tone = scope === 'LEVEL' ? 'info' : scope === 'CUSTOM' ? 'warn' : 'default'
  return <Chip size="small" label={label} sx={ps.metricChip(tone)} />
}

export default function CountsPage() {
  const { token, user } = useAuth()
  const role = String(user?.role || '').toUpperCase()
  const can = ['ADMIN', 'SUPERVISOR'].includes(role)

  const client = useMemo(() => api(token), [token])
  const ps = usePageStyles()

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selected, setSelected] = useState(null)

  const [showDetail, setShowDetail] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)

  const [page, setPage] = useState(1)
  const pageSize = 10

  // Create form
  const [area, setArea] = useState('A1')
  const [scope, setScope] = useState('AREA')
  const [level, setLevel] = useState('A')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [err, setErr] = useState('')
  const [okMsg, setOkMsg] = useState('')

  // Line capture state
  const [showCapture, setShowCapture] = useState(false)
  const [captureDetail, setCaptureDetail] = useState(null)
  const [captureLoading, setCaptureLoading] = useState(false)
  const [countedValues, setCountedValues] = useState({}) // { locationId: { sku: qty } }
  const [savingLocation, setSavingLocation] = useState('')
  const [captureMsg, setCaptureMsg] = useState('')
  const [captureErr, setCaptureErr] = useState('')

  // Capture dialog tab: 0=Captura, 1=Diferencias
  const [captureTab, setCaptureTab] = useState(0)

  const safeId = (r) => r?.id || r?._id

  const load = async () => {
    if (!token) return
    setErr('')
    setOkMsg('')
    setLoading(true)
    try {
      const res = await client.get('/api/counts')
      setRows(Array.isArray(res.data) ? res.data : [])
      setPage(1)
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Error cargando conteos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setErr('')
    setOkMsg('')
    try {
      if (!can) return setErr('No tienes permiso para crear conteos')
      if (!String(area || '').trim()) return setErr('Area requerida')
      if (!String(scope || '').trim()) return setErr('Scope requerido')

      setLoading(true)
      await client.post('/api/counts', {
        name,
        scope,
        area,
        level: scope === 'LEVEL' ? level : '',
        notes
      })

      setOpenCreate(false)
      setName('')
      setNotes('')
      setScope('AREA')
      setArea('A1')
      setLevel('A')
      setOkMsg('Conteo creado exitosamente')
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Error creando conteo')
    } finally {
      setLoading(false)
    }
  }

  // Filtros y busqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r => (r.name || '').toLowerCase().includes(q.toLowerCase()))
    if (statusFilter) list = list.filter(r => String(r.status || '') === statusFilter)
    return list
  }, [rows, q, statusFilter])

  // KPIs always from ALL rows (unfiltered)
  const kpis = useMemo(() => {
    const st = (s) => String(s || '')
    return {
      total: rows.length,
      abiertos: rows.filter(r => st(r.status) === 'OPEN').length,
      review: rows.filter(r => st(r.status) === 'REVIEW').length,
      aprobados: rows.filter(r => st(r.status) === 'APPROVED').length,
      cerrados: rows.filter(r => st(r.status) === 'CLOSED').length,
    }
  }, [rows])

  // Exportar lista a Excel
  const exportExcel = () => {
    const data = filtered.map(r => ({
      Nombre: r.name,
      Scope: r.scope,
      Area: r.area,
      Nivel: r.level,
      Status: statusLabel(r.status),
      Creo: r.createdBy?.email || '',
      Aprobo: r.approvedBy?.email || '',
      'Aprobado en': r.approvedAt ? dayjs(r.approvedAt).format('DD/MM/YYYY HH:mm') : '',
      Creado: r.createdAt ? dayjs(r.createdAt).format('DD/MM/YYYY HH:mm') : ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conteos')
    XLSX.writeFile(wb, 'conteos_ciclicos.xlsx')
  }

  // Export count detail with variances to Excel
  const exportDetailExcel = () => {
    if (!captureDetail?.lines?.length) return
    const exportRows = []
    const lines = captureDetail.lines || []
    lines.forEach(line => {
      const locCode = line.location?.code || line.locationId || line._id || ''
      const systemItems = line.systemItems || []
      const diffs = line.difference || []
      systemItems.forEach(item => {
        const diffObj = diffs.find(d => d.sku === item.sku)
        const countedObj = (line.countedItems || []).find(ci => ci.sku === item.sku)
        const systemQty = item.qty || 0
        const countedQty = countedObj ? countedObj.qty : null
        const diff = diffObj ? diffObj.diff : (countedQty !== null ? countedQty - systemQty : null)
        const pctVar = systemQty > 0 && diff !== null ? ((Math.abs(diff) / systemQty) * 100) : null
        exportRows.push({
          Ubicacion: locCode,
          SKU: item.sku,
          'Qty Sistema': systemQty,
          'Qty Contada': countedQty !== null ? countedQty : '',
          Diferencia: diff !== null ? diff : '',
          '% Varianza': pctVar !== null ? `${pctVar.toFixed(1)}%` : '',
          Estado: countedQty === null ? 'Sin contar' : (diff === 0 ? 'Coincide' : 'Discrepancia')
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Conteo')

    // Add a summary sheet
    const summary = []
    const vs = varianceSummary
    if (vs) {
      summary.push({ Metrica: 'Total ubicaciones', Valor: vs.total })
      summary.push({ Metrica: 'Coinciden', Valor: vs.matchCount })
      summary.push({ Metrica: 'Discrepancias', Valor: vs.discrepancyCount })
      summary.push({ Metrica: 'Sin contar', Valor: vs.uncountedCount })
      summary.push({ Metrica: 'Varianza total absoluta', Valor: vs.totalVariance })
      summary.push({ Metrica: 'Total qty sistema', Valor: vs.totalSystemQty })
      summary.push({ Metrica: 'Total qty contada', Valor: vs.totalCountedQty })
      summary.push({ Metrica: 'Precision %', Valor: `${vs.accuracy.toFixed(1)}%` })
    }
    const ws2 = XLSX.utils.json_to_sheet(summary)
    XLSX.utils.book_append_sheet(wb, ws2, 'Resumen')

    const countName = (captureDetail.name || 'conteo').replace(/[^a-zA-Z0-9]/g, '_')
    XLSX.writeFile(wb, `detalle_${countName}.xlsx`)
  }

  // Acciones
  const patchStatus = async (id, nextStatus) => {
    if (!id) return
    setErr('')
    setOkMsg('')
    setBusyId(`${id}:${nextStatus}`)
    try {
      await client.patch(`/api/counts/${id}/status`, { status: nextStatus })
      setOkMsg(`Status actualizado a ${statusLabel(nextStatus)}`)
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Error actualizando status')
    } finally {
      setBusyId('')
    }
  }

  // Status workflow: OPEN -> REVIEW
  const sendToReview = async (id) => patchStatus(id, 'REVIEW')

  // Status workflow: APPROVED -> CLOSED
  const closeCount = async (id) => patchStatus(id, 'CLOSED')

  const cancelCount = async (id) => patchStatus(id, 'CANCELLED')

  // Approve via dedicated endpoint (only from REVIEW)
  const approveCount = async (id) => {
    if (!id) return
    setErr('')
    setOkMsg('')
    setBusyId(`${id}:APPROVED`)
    try {
      await client.post(`/api/counts/${id}/approve`)
      setOkMsg('Conteo aprobado exitosamente')
      await load()
    } catch (e) {
      // Fallback to patch if dedicated endpoint not available
      try {
        await client.patch(`/api/counts/${id}/status`, { status: 'APPROVED' })
        setOkMsg('Conteo aprobado exitosamente')
        await load()
      } catch (e2) {
        setErr(e2?.response?.data?.message || e?.response?.data?.message || e?.message || 'Error aprobando conteo')
      }
    } finally {
      setBusyId('')
    }
  }

  // Modal de detalle
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  // ── Line Capture Logic ──
  const loadCountDetail = useCallback(async (countId) => {
    if (!countId || !token) return
    setCaptureLoading(true)
    setCaptureErr('')
    setCaptureMsg('')
    try {
      const res = await client.get(`/api/counts/${countId}`)
      const detail = res.data
      setCaptureDetail(detail)

      // Initialize counted values from existing countedItems
      const initial = {}
      const lines = detail?.lines || []
      lines.forEach(line => {
        const locId = line.locationId || line._id
        initial[locId] = {}
        const systemItems = line.systemItems || []
        systemItems.forEach(item => {
          const existing = (line.countedItems || []).find(ci => ci.sku === item.sku)
          initial[locId][item.sku] = existing ? String(existing.qty) : ''
        })
      })
      setCountedValues(initial)
    } catch (e) {
      setCaptureErr(e?.response?.data?.message || e?.message || 'Error cargando detalle del conteo')
    } finally {
      setCaptureLoading(false)
    }
  }, [client, token])

  const openCapture = async (row) => {
    setShowDetail(false)
    setShowCapture(true)
    setSelected(row)
    setCaptureTab(0)
    await loadCountDetail(safeId(row))
  }

  const closeCapture = () => {
    setShowCapture(false)
    setCaptureDetail(null)
    setCountedValues({})
    setCaptureMsg('')
    setCaptureErr('')
    setCaptureTab(0)
  }

  const updateCountedValue = (locationId, sku, value) => {
    setCountedValues(prev => ({
      ...prev,
      [locationId]: {
        ...(prev[locationId] || {}),
        [sku]: value
      }
    }))
  }

  const saveLocationCount = async (countId, locationId) => {
    if (!countId || !locationId) return
    setSavingLocation(locationId)
    setCaptureErr('')
    setCaptureMsg('')
    try {
      const locValues = countedValues[locationId] || {}
      const items = Object.entries(locValues)
        .filter(([, v]) => v !== '' && v !== undefined)
        .map(([sku, qty]) => ({ sku, qty: Number(qty) || 0 }))

      if (items.length === 0) {
        setCaptureErr('Ingresa al menos una cantidad para guardar')
        setSavingLocation('')
        return
      }

      await client.post(`/api/counts/${countId}/line/${locationId}`, { countedItems: items })
      setCaptureMsg(`Conteo guardado para ubicacion ${locationId}`)

      // Reload detail to get updated differences
      await loadCountDetail(countId)
    } catch (e) {
      setCaptureErr(e?.response?.data?.message || e?.message || 'Error guardando conteo')
    } finally {
      setSavingLocation('')
    }
  }

  // Variance summary computation
  const varianceSummary = useMemo(() => {
    if (!captureDetail?.lines?.length) return null
    const lines = captureDetail.lines
    let matchCount = 0
    let discrepancyCount = 0
    let uncountedCount = 0
    let totalVariance = 0
    let totalSystemQty = 0
    let totalCountedQty = 0

    lines.forEach(line => {
      const diffs = line.difference || []
      const counted = line.countedItems || []
      const systemItems = line.systemItems || []

      systemItems.forEach(si => { totalSystemQty += (si.qty || 0) })

      if (counted.length === 0) {
        uncountedCount++
        return
      }

      counted.forEach(ci => { totalCountedQty += (ci.qty || 0) })

      const hasDiscrepancy = diffs.some(d => d.diff !== 0)
      if (hasDiscrepancy) {
        discrepancyCount++
        diffs.forEach(d => { totalVariance += Math.abs(d.diff || 0) })
      } else {
        matchCount++
      }
    })

    const accuracy = totalSystemQty > 0
      ? Math.max(0, ((1 - (totalVariance / totalSystemQty)) * 100))
      : 100

    return { matchCount, discrepancyCount, uncountedCount, totalVariance, total: lines.length, totalSystemQty, totalCountedQty, accuracy }
  }, [captureDetail])

  // Locations with variances only, sorted by largest variance first
  const varianceLines = useMemo(() => {
    if (!captureDetail?.lines?.length) return []
    return captureDetail.lines
      .filter(line => {
        const diffs = line.difference || []
        const counted = line.countedItems || []
        return counted.length > 0 && diffs.some(d => d.diff !== 0)
      })
      .map(line => {
        const diffs = line.difference || []
        const totalAbsVariance = diffs.reduce((sum, d) => sum + Math.abs(d.diff || 0), 0)
        return { ...line, totalAbsVariance }
      })
      .sort((a, b) => b.totalAbsVariance - a.totalAbsVariance)
  }, [captureDetail])

  // Approve from capture dialog
  const approveFromCapture = async () => {
    if (!captureDetail) return
    const id = safeId(captureDetail)
    await approveCount(id)
    await loadCountDetail(id)
  }

  // Send to review from capture dialog
  const sendToReviewFromCapture = async () => {
    if (!captureDetail) return
    const id = safeId(captureDetail)
    await patchStatus(id, 'REVIEW')
    await loadCountDetail(id)
  }

  // Close from capture dialog
  const closeFromCapture = async () => {
    if (!captureDetail) return
    const id = safeId(captureDetail)
    await patchStatus(id, 'CLOSED')
    await loadCountDetail(id)
  }

  // Paginacion
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  /** Map statuses to chip tones */
  const statusTone = (s) => {
    const map = { OPEN: 'warn', REVIEW: 'info', APPROVED: 'ok', CLOSED: 'default', CANCELLED: 'bad' }
    return map[String(s || '')] || 'default'
  }

  const statusLabel = (s) => {
    const map = {
      OPEN: 'ABIERTO',
      REVIEW: 'EN REVISION',
      APPROVED: 'APROBADO',
      CLOSED: 'CERRADO',
      CANCELLED: 'CANCELADO'
    }
    return map[String(s || '')] || String(s || '--')
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  /** Variance color by percentage: green=match, yellow=<10%, red=>10% */
  const varianceColor = (diff, systemQty) => {
    if (diff === 0) return { color: ps.isDark ? '#86EFAC' : '#2E7D32', bg: ps.isDark ? 'rgba(34,197,94,.10)' : 'rgba(46,125,50,.06)' }
    const pct = systemQty > 0 ? (Math.abs(diff) / systemQty) * 100 : 100
    if (pct <= 10) return { color: ps.isDark ? '#FCD34D' : '#E65100', bg: ps.isDark ? 'rgba(245,158,11,.10)' : 'rgba(245,158,11,.06)' }
    return { color: ps.isDark ? '#FCA5A5' : '#C62828', bg: ps.isDark ? 'rgba(239,68,68,.10)' : 'rgba(198,40,40,.06)' }
  }

  /** Render a location card with items table (reused in both tabs) */
  const renderLocationCard = (line, lineIdx, showInputs) => {
    const locId = line.locationId || line._id
    const locCode = line.location?.code || locId || `Ubicacion ${lineIdx + 1}`
    const systemItems = line.systemItems || []
    const diffs = line.difference || []
    const hasCounted = (line.countedItems || []).length > 0
    const hasDiscrepancy = diffs.some(d => d.diff !== 0)
    const isSaving = savingLocation === locId
    const canEdit = showInputs && ['OPEN', 'REVIEW'].includes(String(captureDetail?.status || ''))

    // Compute location-level totals
    let locSystemTotal = 0
    let locCountedTotal = 0
    systemItems.forEach(si => { locSystemTotal += (si.qty || 0) })
    if (hasCounted) {
      ;(line.countedItems || []).forEach(ci => { locCountedTotal += (ci.qty || 0) })
    }
    const locDiffTotal = hasCounted ? locCountedTotal - locSystemTotal : null
    const locAccuracy = hasCounted && locSystemTotal > 0
      ? Math.max(0, (1 - (Math.abs(locDiffTotal) / locSystemTotal)) * 100)
      : null

    return (
      <Paper
        key={locId || lineIdx}
        elevation={0}
        sx={{
          ...ps.card,
          border: hasCounted
            ? hasDiscrepancy
              ? (ps.isDark ? '1px solid rgba(239,68,68,.25)' : '1px solid rgba(198,40,40,.20)')
              : (ps.isDark ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(46,125,50,.20)')
            : (ps.isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(13,59,102,.10)'),
          overflow: 'visible'
        }}
      >
        {/* Location header */}
        <Box sx={{
          ...ps.cardHeader,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'text.primary' }}>
              {locCode}
            </Typography>
            {hasCounted && !hasDiscrepancy && (
              <Chip
                icon={<CheckCircleIcon sx={{ fontSize: 14 }} />}
                label="Coincide"
                size="small"
                sx={ps.metricChip('ok')}
              />
            )}
            {hasCounted && hasDiscrepancy && (
              <Chip
                icon={<WarningAmberIcon sx={{ fontSize: 14 }} />}
                label="Discrepancia"
                size="small"
                sx={ps.metricChip('bad')}
              />
            )}
            {!hasCounted && (
              <Chip label="Pendiente" size="small" sx={ps.metricChip('warn')} />
            )}
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            {locAccuracy !== null && (
              <Typography variant="caption" sx={{ fontWeight: 700, color: locAccuracy >= 90 ? (ps.isDark ? '#86EFAC' : '#2E7D32') : (ps.isDark ? '#FCA5A5' : '#C62828') }}>
                {locAccuracy.toFixed(1)}% precision
              </Typography>
            )}
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              {systemItems.length} item{systemItems.length !== 1 ? 's' : ''} en sistema
            </Typography>
          </Stack>
        </Box>

        {/* Items table */}
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>SKU</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>Qty Sistema</TableCell>
                {showInputs ? (
                  <TableCell sx={{ textAlign: 'center', minWidth: 120 }}>Qty Contada</TableCell>
                ) : (
                  <TableCell sx={{ textAlign: 'right' }}>Qty Contada</TableCell>
                )}
                <TableCell sx={{ textAlign: 'right' }}>Diferencia</TableCell>
                <TableCell sx={{ textAlign: 'right' }}>% Var</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {systemItems.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin items en sistema</Typography>
                  </TableCell>
                </TableRow>
              )}
              {systemItems.map((item, itemIdx) => {
                const sku = item.sku
                const systemQty = item.qty || 0
                const currentVal = countedValues[locId]?.[sku] ?? ''
                const diffObj = diffs.find(d => d.sku === sku)
                const diff = diffObj ? diffObj.diff : null
                const countedQty = currentVal !== '' ? Number(currentVal) : null
                const liveDiff = countedQty !== null ? countedQty - systemQty : null
                const displayDiff = diff !== null ? diff : liveDiff
                const vc = displayDiff !== null ? varianceColor(displayDiff, systemQty) : null
                const pctVar = displayDiff !== null && systemQty > 0 ? ((Math.abs(displayDiff) / systemQty) * 100) : null

                return (
                  <TableRow key={sku || itemIdx} sx={ps.tableRow(itemIdx)}>
                    <TableCell sx={{ ...ps.cellText, fontWeight: 700, fontFamily: 'monospace' }}>{sku}</TableCell>
                    <TableCell sx={{ ...ps.cellText, textAlign: 'right' }}>{systemQty}</TableCell>
                    {showInputs && canEdit ? (
                      <TableCell sx={{ textAlign: 'center' }}>
                        <TextField
                          type="number"
                          size="small"
                          value={currentVal}
                          onChange={(e) => updateCountedValue(locId, sku, e.target.value)}
                          placeholder="0"
                          inputProps={{ min: 0, style: { textAlign: 'center' } }}
                          sx={{
                            width: 100,
                            ...ps.inputSx,
                            '& .MuiOutlinedInput-root': {
                              ...ps.inputSx['& .MuiOutlinedInput-root'],
                              height: 36,
                            }
                          }}
                        />
                      </TableCell>
                    ) : (
                      <TableCell sx={{ ...ps.cellText, textAlign: showInputs ? 'center' : 'right', fontFamily: 'monospace' }}>
                        {countedQty !== null ? countedQty : <Typography component="span" variant="caption" sx={{ color: 'text.disabled' }}>--</Typography>}
                      </TableCell>
                    )}
                    <TableCell sx={{ textAlign: 'right' }}>
                      {displayDiff !== null ? (
                        <Box
                          component="span"
                          sx={{
                            fontWeight: 800,
                            color: vc.color,
                            bgcolor: vc.bg,
                            px: 1.2,
                            py: 0.3,
                            borderRadius: 1,
                            fontSize: 13,
                            fontFamily: 'monospace',
                            opacity: diff !== null ? 1 : 0.7
                          }}
                        >
                          {displayDiff > 0 ? `+${displayDiff}` : displayDiff}
                        </Box>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>--</Typography>
                      )}
                    </TableCell>
                    <TableCell sx={{ textAlign: 'right' }}>
                      {pctVar !== null ? (
                        <Typography variant="caption" sx={{ fontWeight: 700, color: vc?.color, fontFamily: 'monospace' }}>
                          {pctVar.toFixed(1)}%
                        </Typography>
                      ) : (
                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>--</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
            {/* Summary row */}
            {hasCounted && systemItems.length > 0 && (
              <TableFooter>
                <TableRow sx={{ '& td': { borderTop: ps.isDark ? '2px solid rgba(255,255,255,.12)' : '2px solid rgba(13,59,102,.12)' } }}>
                  <TableCell sx={{ fontWeight: 800, color: 'text.primary' }}>TOTAL</TableCell>
                  <TableCell sx={{ textAlign: 'right', fontWeight: 800, color: 'text.primary', fontFamily: 'monospace' }}>{locSystemTotal}</TableCell>
                  <TableCell sx={{ textAlign: showInputs ? 'center' : 'right', fontWeight: 800, color: 'text.primary', fontFamily: 'monospace' }}>{locCountedTotal}</TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    {locDiffTotal !== null && (
                      <Box component="span" sx={{
                        fontWeight: 800,
                        color: varianceColor(locDiffTotal, locSystemTotal).color,
                        bgcolor: varianceColor(locDiffTotal, locSystemTotal).bg,
                        px: 1.2, py: 0.3, borderRadius: 1, fontSize: 13, fontFamily: 'monospace'
                      }}>
                        {locDiffTotal > 0 ? `+${locDiffTotal}` : locDiffTotal}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell sx={{ textAlign: 'right' }}>
                    {locAccuracy !== null && (
                      <Typography variant="caption" sx={{ fontWeight: 700, color: varianceColor(locDiffTotal || 0, locSystemTotal).color, fontFamily: 'monospace' }}>
                        {locAccuracy.toFixed(1)}%
                      </Typography>
                    )}
                  </TableCell>
                </TableRow>
              </TableFooter>
            )}
          </Table>
        </Box>

        {/* Save button per location */}
        {showInputs && canEdit && (
          <Box sx={{ px: 2, py: 1.5, display: 'flex', justifyContent: 'flex-end' }}>
            <Button
              variant="contained"
              size="small"
              onClick={() => saveLocationCount(safeId(captureDetail), locId)}
              disabled={isSaving}
              sx={{ borderRadius: 2, fontWeight: 700 }}
            >
              {isSaving ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
              {isSaving ? 'Guardando...' : 'Guardar conteo'}
            </Button>
          </Box>
        )}
      </Paper>
    )
  }

  return (
    <Box sx={ps.page}>
      <Box sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1.5,
        mb: 2
      }}>
        <Box>
          <Typography variant="h6" sx={{ ...ps.pageTitle }}>Conteos ciclicos</Typography>
          <Typography variant="body2" sx={ps.pageSubtitle}>
            Administra conteos por area/nivel, cambia estatus y exporta reportes.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Exportar a Excel">
            <span>
              <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')} disabled={!filtered.length}>
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={can ? 'Nuevo conteo' : 'Solo ADMIN/SUPERVISOR'}>
            <span>
              <Button
                disabled={!can}
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { setShowDetail(false); setOpenCreate(true) }}
                sx={{
                  borderRadius: 2.5,
                  fontWeight: 900,
                  px: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  '@keyframes shine': {
                    '0%': { transform: 'translateX(-120%)' },
                    '100%': { transform: 'translateX(220%)' }
                  },
                  '&:after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40%',
                    height: '100%',
                    background: ps.isDark
                      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                    transform: 'translateX(-120%)',
                    animation: 'shine 2.6s ease-in-out infinite',
                    pointerEvents: 'none'
                  }
                }}
              >
                Nuevo conteo
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {okMsg && <Alert severity="success" sx={{ mb: 2 }}>{okMsg}</Alert>}

      {/* ── KPI Summary Cards (always from ALL rows, not filtered) ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="Total conteos"
            value={kpis.total}
            subtitle="Todos los conteos"
            accent="blue"
            ps={ps}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="Abiertos"
            value={kpis.abiertos}
            subtitle="Pendientes de conteo"
            accent="amber"
            ps={ps}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="En revision"
            value={kpis.review}
            subtitle="Esperando aprobacion"
            accent="blue"
            ps={ps}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="Aprobados"
            value={kpis.aprobados}
            subtitle="Conteos confirmados"
            accent="green"
            ps={ps}
          />
        </Grid>
      </Grid>

      {/* Resumen chips */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Total: ${kpis.total}`} sx={ps.metricChip('default')} />
        <Chip label={`Abiertos: ${kpis.abiertos}`} sx={ps.metricChip('warn')} />
        <Chip label={`Revision: ${kpis.review}`} sx={ps.metricChip('info')} />
        <Chip label={`Aprobados: ${kpis.aprobados}`} sx={ps.metricChip('ok')} />
        <Chip label={`Cerrados: ${kpis.cerrados}`} sx={ps.metricChip('default')} />
      </Stack>

      {/* Filtros */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.filterBar}>
          <TextField
            label="Buscar conteo"
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 240, ...ps.inputSx }}
          />

          <TextField
            select
            label="Status"
            value={statusFilter}
            onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
            sx={{ minWidth: 180, ...ps.inputSx }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="OPEN">Abierto</MenuItem>
            <MenuItem value="REVIEW">En revision</MenuItem>
            <MenuItem value="APPROVED">Aprobado</MenuItem>
            <MenuItem value="CLOSED">Cerrado</MenuItem>
            <MenuItem value="CANCELLED">Cancelado</MenuItem>
          </TextField>

          <Box sx={{ flex: 1 }} />

          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Cargando...</Typography>
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 850, md: 1050 } }}>
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>Nombre</TableCell>
                <TableCell>Scope / Area</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Creo</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography sx={ps.emptyText}>No se encontraron conteos</Typography>
                  </TableCell>
                </TableRow>
              )}

              {paginated.map((r, idx) => {
                const id = safeId(r)
                const st = String(r.status || '')
                const isBusy = (k) => busyId === `${id}:${k}`

                return (
                  <TableRow key={id || idx} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellText}>{r.name || '--'}</TableCell>
                    <TableCell>
                      <ScopeBadge scope={r.scope} area={r.area} level={r.level} ps={ps} />
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabel(st)} sx={ps.metricChip(statusTone(st))} />
                    </TableCell>
                    <TableCell sx={ps.cellTextSecondary}>{r.createdBy?.email || '--'}</TableCell>
                    <TableCell sx={ps.cellTextSecondary}>
                      {r.createdAt ? dayjs(r.createdAt).format('DD/MM/YY HH:mm') : '--'}
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Capturar conteo">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('success'), ml: 0.5 }}
                            onClick={() => openCapture(r)}
                            disabled={!['OPEN', 'REVIEW'].includes(st)}
                          >
                            <PlayArrowIcon fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* OPEN -> REVIEW */}
                      <Tooltip title="Enviar a revision">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('primary'), ml: 0.5 }}
                            onClick={() => sendToReview(id)}
                            disabled={!can || st !== 'OPEN'}
                          >
                            {isBusy('REVIEW') ? <CircularProgress size={16} /> : <RateReviewIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* REVIEW -> APPROVED (approve) */}
                      <Tooltip title="Aprobar conteo (ADMIN/SUPERVISOR)">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('success'), ml: 0.5 }}
                            onClick={() => approveCount(id)}
                            disabled={!can || st !== 'REVIEW'}
                          >
                            {isBusy('APPROVED') ? <CircularProgress size={16} /> : <CheckCircleIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      {/* APPROVED -> CLOSED */}
                      <Tooltip title="Cerrar conteo">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('warning'), ml: 0.5 }}
                            onClick={() => closeCount(id)}
                            disabled={!can || st !== 'APPROVED'}
                          >
                            {isBusy('CLOSED') ? <CircularProgress size={16} /> : <DoneIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Cancelar conteo">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('error'), ml: 0.5 }}
                            onClick={() => cancelCount(id)}
                            disabled={!can || ['CLOSED', 'CANCELLED'].includes(st)}
                          >
                            {isBusy('CANCELLED') ? <CircularProgress size={16} /> : <CancelIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>

        {/* Paginacion */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Pagina {page} de {totalPages}
          </Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* Modal: Crear conteo */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          ...ps.cardHeaderTitle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1
        }}>
          Nuevo conteo
          <IconButton onClick={() => setOpenCreate(false)} sx={ps.actionBtn('primary')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              Crea un conteo por <b>AREA</b>, por <b>LEVEL</b> o <b>CUSTOM</b>. Se generaran lineas por ubicacion y quedara en <b>ABIERTO</b>.
            </Alert>

            <TextField
              label="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={ps.inputSx}
              placeholder="Ej: Conteo A1 - Nivel A"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                sx={{ flex: 1, ...ps.inputSx }}
              >
                <MenuItem value="AREA">AREA</MenuItem>
                <MenuItem value="LEVEL">LEVEL</MenuItem>
                <MenuItem value="CUSTOM">CUSTOM</MenuItem>
              </TextField>

              <TextField
                label="Area"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                sx={{ flex: 1, ...ps.inputSx }}
                placeholder="A1"
              />
            </Stack>

            {scope === 'LEVEL' && (
              <TextField
                label="Nivel"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                sx={ps.inputSx}
                placeholder="A"
              />
            )}

            <TextField
              label="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={ps.inputSx}
              multiline
              minRows={3}
              placeholder="Ej: Conteo programado semanal"
            />

            <Divider />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Una vez creado, usa el boton de captura para registrar cantidades por ubicacion.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={create} disabled={!can || loading}>
            {loading ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Detalle */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>Detalle de conteo</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2"><b>Nombre:</b> {selected.name || '--'}</Typography>

              {/* Scope display */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 0.5 }}>Alcance:</Typography>
                <ScopeBadge scope={selected.scope} area={selected.area} level={selected.level} ps={ps} />
              </Box>

              <Typography variant="body2"><b>Status:</b> {statusLabel(selected.status)}</Typography>
              <Typography variant="body2"><b>Creo:</b> {selected.createdBy?.email || '--'}</Typography>
              <Typography variant="body2"><b>Aprobo:</b> {selected.approvedBy?.email || '--'}</Typography>
              {selected.approvedAt && (
                <Typography variant="body2"><b>Fecha aprobacion:</b> {dayjs(selected.approvedAt).format('DD/MM/YYYY HH:mm')}</Typography>
              )}
              {selected.createdAt && (
                <Typography variant="body2"><b>Creado:</b> {dayjs(selected.createdAt).format('DD/MM/YYYY HH:mm')}</Typography>
              )}
              {selected.notes && (
                <Typography variant="body2"><b>Notas:</b> {selected.notes}</Typography>
              )}

              <Divider sx={{ my: 1 }} />

              {/* Status workflow display */}
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 700, mb: 1 }}>Flujo de estatus:</Typography>
                <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap">
                  {['OPEN', 'REVIEW', 'APPROVED', 'CLOSED'].map((s, i) => {
                    const isCurrent = String(selected.status || '') === s
                    return (
                      <React.Fragment key={s}>
                        {i > 0 && <Typography sx={{ color: 'text.disabled', mx: 0.5 }}>→</Typography>}
                        <Chip
                          size="small"
                          label={statusLabel(s)}
                          sx={{
                            ...ps.metricChip(isCurrent ? statusTone(s) : 'default'),
                            opacity: isCurrent ? 1 : 0.5,
                            fontWeight: isCurrent ? 900 : 600,
                          }}
                        />
                      </React.Fragment>
                    )
                  })}
                </Stack>
              </Box>

              <Divider sx={{ my: 1 }} />

              <Typography variant="body2" sx={{ fontWeight: 700 }}>Lineas del conteo:</Typography>
              {(selected.lines || []).length === 0 ? (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  No hay lineas. Usa el boton de captura para registrar cantidades.
                </Typography>
              ) : (
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {selected.lines.length} ubicaciones. Usa el boton de captura para ver detalle completo.
                </Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          {selected && ['OPEN', 'REVIEW'].includes(String(selected.status || '')) && (
            <Button
              variant="outlined"
              startIcon={<PlayArrowIcon />}
              onClick={() => { closeDetail(); openCapture(selected) }}
            >
              Capturar conteo
            </Button>
          )}
          <Button variant="contained" onClick={closeDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* ── Modal: Line Capture Dialog ── */}
      <Dialog
        open={showCapture}
        onClose={closeCapture}
        maxWidth="lg"
        fullWidth
        PaperProps={{ sx: { minHeight: '70vh' } }}
      >
        <DialogTitle sx={{
          ...ps.cardHeaderTitle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1
        }}>
          <Box>
            Captura de conteo
            {captureDetail && (
              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 400 }}>
                  {captureDetail.name || 'Sin nombre'} | {statusLabel(captureDetail.status)}
                </Typography>
                <ScopeBadge scope={captureDetail.scope} area={captureDetail.area} level={captureDetail.level} ps={ps} />
              </Stack>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Exportar detalle con varianzas">
              <span>
                <IconButton
                  onClick={exportDetailExcel}
                  sx={ps.actionBtn('primary')}
                  disabled={!captureDetail?.lines?.length}
                >
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={closeCapture} sx={ps.actionBtn('primary')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ p: 0 }}>
          {captureLoading && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>Cargando detalle...</Typography>
            </Box>
          )}

          {captureErr && <Alert severity="error" sx={{ m: 2, mb: 0 }}>{captureErr}</Alert>}
          {captureMsg && <Alert severity="success" sx={{ m: 2, mb: 0 }}>{captureMsg}</Alert>}

          {!captureLoading && captureDetail && (
            <Box>
              {/* Tabs: Captura | Diferencias */}
              <Tabs
                value={captureTab}
                onChange={(_, v) => setCaptureTab(v)}
                sx={{
                  px: 2,
                  borderBottom: ps.isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(13,59,102,.08)',
                  '& .MuiTab-root': { fontWeight: 700, textTransform: 'none' }
                }}
              >
                <Tab label="Captura" />
                <Tab
                  label={
                    <Stack direction="row" spacing={0.5} alignItems="center">
                      <span>Diferencias</span>
                      {varianceLines.length > 0 && (
                        <Chip
                          size="small"
                          label={varianceLines.length}
                          sx={{ ...ps.metricChip('bad'), height: 22, fontSize: 11, minWidth: 28 }}
                        />
                      )}
                    </Stack>
                  }
                />
              </Tabs>

              <Box sx={{ p: 2 }}>
                {/* ── Variance Summary (shown on both tabs) ── */}
                {varianceSummary && varianceSummary.total > 0 && (
                  <Paper elevation={0} sx={{ ...ps.card, p: 2, mb: 2.5, border: ps.isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(13,59,102,.08)' }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, color: 'text.primary' }}>
                      Resumen de varianzas
                    </Typography>

                    <Grid container spacing={2}>
                      <Grid item xs={6} sm={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: 'text.primary' }}>{varianceSummary.total}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total ubic.</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: ps.isDark ? '#86EFAC' : '#2E7D32' }}>{varianceSummary.matchCount}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Coinciden</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: ps.isDark ? '#FCA5A5' : '#C62828' }}>{varianceSummary.discrepancyCount}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Discrepancias</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h5" sx={{ fontWeight: 900, color: ps.isDark ? '#FCD34D' : '#E65100' }}>{varianceSummary.uncountedCount}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin contar</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: 'text.primary' }}>{varianceSummary.totalSystemQty}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Qty sistema</Typography>
                        </Box>
                      </Grid>
                      <Grid item xs={6} sm={2}>
                        <Box sx={{ textAlign: 'center' }}>
                          <Typography variant="h6" sx={{ fontWeight: 900, fontFamily: 'monospace', color: 'text.primary' }}>{varianceSummary.totalCountedQty}</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Qty contada</Typography>
                        </Box>
                      </Grid>
                    </Grid>

                    {/* Progress bar + accuracy */}
                    {varianceSummary.total > 0 && (
                      <Box sx={{ mt: 2 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>Progreso de conteo</Typography>
                          <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
                            {Math.round(((varianceSummary.matchCount + varianceSummary.discrepancyCount) / varianceSummary.total) * 100)}%
                          </Typography>
                        </Box>
                        <Box sx={ps.progressBar}>
                          <Box sx={ps.progressFill(((varianceSummary.matchCount + varianceSummary.discrepancyCount) / varianceSummary.total) * 100)} />
                        </Box>
                      </Box>
                    )}

                    {/* Overall accuracy */}
                    <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
                      <Chip
                        label={`Precision: ${varianceSummary.accuracy.toFixed(1)}%`}
                        sx={ps.metricChip(varianceSummary.accuracy >= 95 ? 'ok' : varianceSummary.accuracy >= 85 ? 'warn' : 'bad')}
                      />
                      {varianceSummary.totalVariance > 0 && (
                        <Chip
                          label={`Varianza total: ${varianceSummary.totalVariance} uds`}
                          sx={ps.metricChip('bad')}
                        />
                      )}
                    </Box>
                  </Paper>
                )}

                {/* ── Tab 0: Captura (all locations with inputs) ── */}
                {captureTab === 0 && (
                  <Stack spacing={3}>
                    {(captureDetail.lines || []).length === 0 && (
                      <Alert severity="info">Este conteo no tiene lineas/ubicaciones generadas.</Alert>
                    )}
                    {(captureDetail.lines || []).map((line, lineIdx) => renderLocationCard(line, lineIdx, true))}
                  </Stack>
                )}

                {/* ── Tab 1: Diferencias (only locations with variances, sorted) ── */}
                {captureTab === 1 && (
                  <Stack spacing={3}>
                    {varianceLines.length === 0 ? (
                      <Alert severity="success" sx={{ fontSize: 13 }}>
                        No hay diferencias. Todos los conteos registrados coinciden con el sistema.
                      </Alert>
                    ) : (
                      <>
                        <Alert severity="warning" sx={{ fontSize: 13 }}>
                          Mostrando <b>{varianceLines.length}</b> ubicacion{varianceLines.length !== 1 ? 'es' : ''} con diferencias, ordenadas por mayor varianza.
                        </Alert>
                        {varianceLines.map((line, lineIdx) => renderLocationCard(line, lineIdx, false))}
                      </>
                    )}
                  </Stack>
                )}
              </Box>
            </Box>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          {/* Workflow buttons inside capture dialog */}
          {captureDetail && can && String(captureDetail.status || '') === 'OPEN' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={busyId === `${safeId(captureDetail)}:REVIEW` ? <CircularProgress size={16} /> : <RateReviewIcon />}
              onClick={sendToReviewFromCapture}
              disabled={!!busyId}
              sx={{ borderRadius: 2, fontWeight: 900, px: 3 }}
            >
              Enviar a revision
            </Button>
          )}
          {captureDetail && can && String(captureDetail.status || '') === 'REVIEW' && (
            <Button
              variant="contained"
              color="success"
              startIcon={busyId === `${safeId(captureDetail)}:APPROVED` ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              onClick={approveFromCapture}
              disabled={!!busyId}
              sx={{ borderRadius: 2, fontWeight: 900, px: 3 }}
            >
              Aprobar conteo
            </Button>
          )}
          {captureDetail && can && String(captureDetail.status || '') === 'APPROVED' && (
            <Button
              variant="contained"
              color="warning"
              startIcon={busyId === `${safeId(captureDetail)}:CLOSED` ? <CircularProgress size={16} /> : <DoneIcon />}
              onClick={closeFromCapture}
              disabled={!!busyId}
              sx={{ borderRadius: 2, fontWeight: 900, px: 3 }}
            >
              Cerrar conteo
            </Button>
          )}
          <Button variant="outlined" onClick={closeCapture}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
