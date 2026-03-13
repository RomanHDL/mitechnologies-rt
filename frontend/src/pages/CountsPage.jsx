import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../services/api'
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
      <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.secondary', fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {title}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, color: 'text.primary', mt: 0.5 }}>
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

export default function CountsPage() {
  const { token, user } = useAuth()
  const role = String(user?.role || '').toUpperCase()
  const can = ['ADMIN', 'SUPERVISOR'].includes(role)

  const client = useMemo(() => api(), [token])
  const ps = usePageStyles()

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
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

  // Diferencias tab toggle
  const [showDiffs, setShowDiffs] = useState(false)

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
      setErr(e?.message || 'Error cargando conteos')
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
      if (scope !== 'CUSTOM' && !String(area || '').trim()) return setErr('Area requerida')
      if (!String(scope || '').trim()) return setErr('Scope requerido')

      setLoading(true)
      await client.post('/api/counts', {
        name: name || undefined,
        scope,
        area: scope !== 'CUSTOM' ? area : (area || undefined),
        level: scope === 'LEVEL' ? level : undefined,
        notes: notes || undefined
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
      setErr(e?.message || 'Error creando conteo')
    } finally {
      setLoading(false)
    }
  }

  // Filtros y busqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r => (r.name || '').toLowerCase().includes(q.toLowerCase()))
    if (status) list = list.filter(r => String(r.status || '') === status)
    return list
  }, [rows, q, status])

  // Resumen superior
  const resumen = useMemo(() => {
    const st = (s) => String(s || '')
    return {
      total: filtered.length,
      abiertos: filtered.filter(r => st(r.status) === 'OPEN').length,
      review: filtered.filter(r => st(r.status) === 'REVIEW').length,
      aprobados: filtered.filter(r => st(r.status) === 'APPROVED').length,
      cerrados: filtered.filter(r => st(r.status) === 'CLOSED').length,
    }
  }, [filtered])

  // Exportar a Excel — includes variance data from lines
  const exportExcel = () => {
    const summaryData = filtered.map(r => ({
      Nombre: r.name,
      Scope: r.scope,
      Area: r.area,
      Nivel: r.level || '',
      Status: statusLabel(r.status),
      Creo: r.createdBy?.email || '',
      Aprobo: r.approvedBy?.email || '',
      Creado: r.createdAt ? dayjs(r.createdAt).format('DD/MM/YYYY HH:mm') : ''
    }))

    // Build variance detail rows from all counts that have lines
    const varianceData = []
    filtered.forEach(r => {
      const lines = r.lines || []
      lines.forEach(line => {
        const locCode = line.location?.code || line.locationId || line._id || ''
        const diffs = line.difference || []
        const countedItems = line.countedItems || []
        const systemItems = line.systemItems || []
        systemItems.forEach(si => {
          const ci = countedItems.find(c => c.sku === si.sku)
          const diffObj = diffs.find(d => d.sku === si.sku)
          const diff = diffObj ? diffObj.diff : (ci ? ci.qty - si.qty : null)
          const systemQty = si.qty || 0
          const countedQty = ci ? ci.qty : null
          const pct = systemQty > 0 && diff !== null ? Math.abs(diff / systemQty * 100) : 0
          varianceData.push({
            Conteo: r.name || safeId(r),
            Ubicacion: locCode,
            SKU: si.sku,
            'Qty Sistema': systemQty,
            'Qty Contada': countedQty !== null ? countedQty : '',
            Diferencia: diff !== null ? diff : '',
            '% Varianza': diff !== null ? `${pct.toFixed(1)}%` : '',
          })
        })
      })
    })

    const wb = XLSX.utils.book_new()
    const ws1 = XLSX.utils.json_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(wb, ws1, 'Conteos')

    if (varianceData.length > 0) {
      const ws2 = XLSX.utils.json_to_sheet(varianceData)
      XLSX.utils.book_append_sheet(wb, ws2, 'Varianzas')
    }

    XLSX.writeFile(wb, 'conteos_ciclicos.xlsx')
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
      setErr(e?.message || 'Error actualizando status')
    } finally {
      setBusyId('')
    }
  }

  const sendToReview = async (id) => patchStatus(id, 'REVIEW')
  const closeCount = async (id) => patchStatus(id, 'CLOSED')
  const cancelCount = async (id) => patchStatus(id, 'CANCELLED')

  // Approve via dedicated endpoint
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
        setErr(e2?.message || e?.message || 'Error aprobando conteo')
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
      setCaptureErr(e?.message || 'Error cargando detalle del conteo')
    } finally {
      setCaptureLoading(false)
    }
  }, [client, token])

  const openCapture = async (row) => {
    setShowDetail(false)
    setShowCapture(true)
    setShowDiffs(false)
    setSelected(row)
    await loadCountDetail(safeId(row))
  }

  const closeCapture = () => {
    setShowCapture(false)
    setCaptureDetail(null)
    setCountedValues({})
    setCaptureMsg('')
    setCaptureErr('')
    setShowDiffs(false)
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
      setCaptureErr(e?.message || 'Error guardando conteo')
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

    lines.forEach(line => {
      const diffs = line.difference || []
      const counted = line.countedItems || []
      if (counted.length === 0) {
        uncountedCount++
        return
      }
      const hasDiscrepancy = diffs.some(d => d.diff !== 0)
      if (hasDiscrepancy) {
        discrepancyCount++
        diffs.forEach(d => { totalVariance += Math.abs(d.diff || 0) })
      } else {
        matchCount++
      }
    })

    return { matchCount, discrepancyCount, uncountedCount, totalVariance, total: lines.length }
  }, [captureDetail])

  // Diferencias: locations with variances sorted by largest absolute diff first
  const varianceLines = useMemo(() => {
    if (!captureDetail?.lines?.length) return []
    return captureDetail.lines
      .filter(line => {
        const counted = line.countedItems || []
        const diffs = line.difference || []
        return counted.length > 0 && diffs.some(d => d.diff !== 0)
      })
      .map(line => {
        const diffs = line.difference || []
        const maxAbsDiff = Math.max(...diffs.map(d => Math.abs(d.diff || 0)), 0)
        return { ...line, _maxAbsDiff: maxAbsDiff }
      })
      .sort((a, b) => b._maxAbsDiff - a._maxAbsDiff)
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

  // Export capture detail with variances
  const exportCaptureExcel = () => {
    if (!captureDetail) return
    const lines = captureDetail.lines || []
    const data = []
    lines.forEach(line => {
      const locCode = line.location?.code || line.locationId || line._id || ''
      const systemItems = line.systemItems || []
      const countedItems = line.countedItems || []
      const diffs = line.difference || []
      systemItems.forEach(si => {
        const ci = countedItems.find(c => c.sku === si.sku)
        const diffObj = diffs.find(d => d.sku === si.sku)
        const diff = diffObj ? diffObj.diff : (ci ? ci.qty - si.qty : null)
        const systemQty = si.qty || 0
        const pct = systemQty > 0 && diff !== null ? Math.abs(diff / systemQty * 100) : 0
        data.push({
          Ubicacion: locCode,
          SKU: si.sku,
          'Qty Sistema': systemQty,
          'Qty Contada': ci ? ci.qty : '',
          Diferencia: diff !== null ? diff : '',
          '% Varianza': diff !== null ? `${pct.toFixed(1)}%` : '',
        })
      })
    })
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Detalle Conteo')
    XLSX.writeFile(wb, `conteo_${captureDetail.name || safeId(captureDetail)}.xlsx`)
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

  const scopeLabel = (s) => {
    const map = { AREA: 'Area', LEVEL: 'Nivel', CUSTOM: 'Personalizado' }
    return map[String(s || '')] || String(s || '--')
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  /** Color for difference values — green=match, yellow=<10%, red=>10% */
  const varianceColor = (diff, systemQty) => {
    if (diff === 0) return ps.isDark ? '#86EFAC' : '#2E7D32'
    const pct = systemQty > 0 ? Math.abs(diff / systemQty * 100) : 100
    if (pct <= 10) return ps.isDark ? '#FCD34D' : '#E65100'
    return ps.isDark ? '#FCA5A5' : '#C62828'
  }

  const varianceBg = (diff, systemQty) => {
    if (diff === 0) return ps.isDark ? 'rgba(34,197,94,.10)' : 'rgba(46,125,50,.06)'
    const pct = systemQty > 0 ? Math.abs(diff / systemQty * 100) : 100
    if (pct <= 10) return ps.isDark ? 'rgba(245,158,11,.10)' : 'rgba(245,158,11,.08)'
    return ps.isDark ? 'rgba(239,68,68,.10)' : 'rgba(198,40,40,.06)'
  }

  /** Legacy diffColor/diffBg for backward compat in simple spots */
  const diffColor = (diff) => varianceColor(diff, 0)
  const diffBg = (diff) => varianceBg(diff, 0)

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
                  borderRadius: 2,
                  fontWeight: 700,
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

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="Total Conteos"
            value={resumen.total}
            subtitle="Todos los conteos"
            accent="blue"
            ps={ps}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="Abiertos"
            value={resumen.abiertos}
            subtitle="Pendientes de conteo"
            accent="amber"
            ps={ps}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="En Revision"
            value={resumen.review}
            subtitle="Esperando aprobacion"
            accent="blue"
            ps={ps}
          />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard
            title="Aprobados"
            value={resumen.aprobados}
            subtitle="Conteos confirmados"
            accent="green"
            ps={ps}
          />
        </Grid>
      </Grid>

      {/* Resumen chips */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Total: ${resumen.total}`} sx={ps.metricChip('default')} />
        <Chip label={`Abiertos: ${resumen.abiertos}`} sx={ps.metricChip('warn')} />
        <Chip label={`Revision: ${resumen.review}`} sx={ps.metricChip('info')} />
        <Chip label={`Aprobados: ${resumen.aprobados}`} sx={ps.metricChip('ok')} />
        <Chip label={`Cerrados: ${resumen.cerrados}`} sx={ps.metricChip('default')} />
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
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
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
                <TableCell>Scope</TableCell>
                <TableCell>Area / Nivel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Creo</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography sx={ps.emptyText}>No se encontraron conteos</Typography>
                  </TableCell>
                </TableRow>
              )}

              {paginated.map((r, idx) => {
                const id = safeId(r)
                const st = String(r.status || '')
                const isBusy = (k) => busyId === `${id}:${k}`

                // Build scope info string
                const scopeInfo = (() => {
                  const parts = [r.area || '']
                  if (r.scope === 'LEVEL' && r.level) parts.push(`Niv: ${r.level}`)
                  return parts.filter(Boolean).join(' / ')
                })()

                return (
                  <TableRow key={id || idx} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellText}>{r.name || '--'}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={scopeLabel(r.scope)}
                        sx={{
                          ...ps.metricChip(r.scope === 'CUSTOM' ? 'info' : 'default'),
                          fontSize: 11,
                          height: 24,
                        }}
                      />
                    </TableCell>
                    <TableCell sx={ps.cellText}>{scopeInfo || '--'}</TableCell>
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

                      {/* REVIEW -> APPROVED */}
                      <Tooltip title="Aprobar conteo">
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
              Crea un conteo por <b>AREA</b>, por <b>NIVEL</b> o <b>PERSONALIZADO</b>. Se generaran lineas por ubicacion y quedara en <b>ABIERTO</b>.
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
                disabled={scope === 'CUSTOM'}
                helperText={scope === 'CUSTOM' ? 'No aplica para scope personalizado' : ''}
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
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Typography variant="body2"><b>Nombre:</b> {selected.name || '--'}</Typography>
              <Typography variant="body2">
                <b>Scope:</b> {scopeLabel(selected.scope)}
                {selected.scope === 'AREA' && selected.area ? ` — Area: ${selected.area}` : ''}
                {selected.scope === 'LEVEL' && selected.area ? ` — Area: ${selected.area}, Nivel: ${selected.level || '--'}` : ''}
                {selected.scope === 'CUSTOM' ? ' — Personalizado' : ''}
              </Typography>
              <Typography variant="body2"><b>Status:</b> {statusLabel(selected.status)}</Typography>
              <Typography variant="body2"><b>Creo:</b> {selected.createdBy?.email || '--'}</Typography>
              <Typography variant="body2"><b>Aprobo:</b> {selected.approvedBy?.email || '--'}</Typography>
              <Typography variant="body2"><b>Fecha:</b> {selected.createdAt ? dayjs(selected.createdAt).format('DD/MM/YYYY HH:mm') : '--'}</Typography>

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
              <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary', fontWeight: 400, mt: 0.3 }}>
                {captureDetail.name || 'Sin nombre'} | {scopeLabel(captureDetail.scope)}: {captureDetail.area || '--'}
                {captureDetail.scope === 'LEVEL' ? ` / Niv: ${captureDetail.level || '--'}` : ''}
                {' | '}{statusLabel(captureDetail.status)}
              </Typography>
            )}
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            <Tooltip title="Exportar detalle a Excel">
              <span>
                <IconButton onClick={exportCaptureExcel} sx={ps.actionBtn('primary')} disabled={!captureDetail}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
            <IconButton onClick={closeCapture} sx={ps.actionBtn('primary')}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers>
          {captureLoading && (
            <Box sx={{ py: 4, textAlign: 'center' }}>
              <CircularProgress size={32} />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary' }}>Cargando detalle...</Typography>
            </Box>
          )}

          {captureErr && <Alert severity="error" sx={{ mb: 2 }}>{captureErr}</Alert>}
          {captureMsg && <Alert severity="success" sx={{ mb: 2 }}>{captureMsg}</Alert>}

          {!captureLoading && captureDetail && (
            <Stack spacing={3} sx={{ pt: 1 }}>

              {/* ── Variance Summary ── */}
              {varianceSummary && varianceSummary.total > 0 && (
                <Paper elevation={0} sx={{ ...ps.card, p: 2, border: ps.isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(13,59,102,.08)' }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1.5, color: 'text.primary' }}>
                    Resumen de varianzas
                  </Typography>

                  <Grid container spacing={2}>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>{varianceSummary.total}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Total ubicaciones</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: ps.isDark ? '#86EFAC' : '#2E7D32' }}>{varianceSummary.matchCount}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Coinciden</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: ps.isDark ? '#FCA5A5' : '#C62828' }}>{varianceSummary.discrepancyCount}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Discrepancias</Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="h5" sx={{ fontWeight: 700, color: ps.isDark ? '#FCD34D' : '#E65100' }}>{varianceSummary.uncountedCount}</Typography>
                        <Typography variant="caption" sx={{ color: 'text.secondary' }}>Sin contar</Typography>
                      </Box>
                    </Grid>
                  </Grid>

                  {/* Progress bar showing how many are counted */}
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

                  {varianceSummary.totalVariance > 0 && (
                    <Alert severity="warning" sx={{ mt: 1.5, fontSize: 13 }}>
                      Varianza total absoluta: <b>{varianceSummary.totalVariance}</b> unidades
                    </Alert>
                  )}
                </Paper>
              )}

              {/* ── Toggle: Todas las ubicaciones / Solo diferencias ── */}
              {varianceLines.length > 0 && (
                <Stack direction="row" spacing={1}>
                  <Button
                    variant={!showDiffs ? 'contained' : 'outlined'}
                    size="small"
                    onClick={() => setShowDiffs(false)}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Todas ({(captureDetail.lines || []).length})
                  </Button>
                  <Button
                    variant={showDiffs ? 'contained' : 'outlined'}
                    size="small"
                    color="error"
                    onClick={() => setShowDiffs(true)}
                    startIcon={<WarningAmberIcon />}
                    sx={{ borderRadius: 2, fontWeight: 700 }}
                  >
                    Diferencias ({varianceLines.length})
                  </Button>
                </Stack>
              )}

              {/* ── Diferencias section (sorted by largest variance) ── */}
              {showDiffs && varianceLines.length > 0 && (
                <Paper elevation={0} sx={{
                  ...ps.card,
                  p: 0,
                  border: ps.isDark ? '1px solid rgba(239,68,68,.20)' : '1px solid rgba(198,40,40,.15)',
                }}>
                  <Box sx={{
                    ...ps.cardHeader,
                    background: ps.isDark
                      ? 'linear-gradient(90deg, rgba(239,68,68,.10), rgba(239,68,68,.03))'
                      : 'linear-gradient(90deg, rgba(198,40,40,.06), rgba(198,40,40,.02))',
                  }}>
                    <WarningAmberIcon sx={{ fontSize: 18, color: ps.isDark ? '#FCA5A5' : '#C62828' }} />
                    <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      Diferencias — Solo ubicaciones con varianzas (mayor a menor)
                    </Typography>
                  </Box>
                  <Box sx={{ overflowX: 'auto' }}>
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={ps.tableHeaderRow}>
                          <TableCell>Ubicacion</TableCell>
                          <TableCell>SKU</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>Qty Sistema</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>Qty Contada</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>Diferencia</TableCell>
                          <TableCell sx={{ textAlign: 'right' }}>% Var</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {varianceLines.map((line, lineIdx) => {
                          const locCode = line.location?.code || line.locationId || line._id || `Ubicacion ${lineIdx + 1}`
                          const diffs = (line.difference || []).filter(d => d.diff !== 0)
                          const systemItems = line.systemItems || []
                          const countedItems = line.countedItems || []

                          return diffs.map((d, di) => {
                            const si = systemItems.find(s => s.sku === d.sku)
                            const ci = countedItems.find(c => c.sku === d.sku)
                            const systemQty = si ? si.qty : 0
                            const countedQty = ci ? ci.qty : 0
                            const pct = systemQty > 0 ? Math.abs(d.diff / systemQty * 100) : 0

                            return (
                              <TableRow key={`${locCode}-${d.sku}`} sx={ps.tableRow(lineIdx + di)}>
                                {di === 0 ? (
                                  <TableCell rowSpan={diffs.length} sx={{ ...ps.cellText, fontWeight: 700, verticalAlign: 'top' }}>
                                    {locCode}
                                  </TableCell>
                                ) : null}
                                <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{d.sku}</TableCell>
                                <TableCell sx={{ ...ps.cellText, textAlign: 'right' }}>{systemQty}</TableCell>
                                <TableCell sx={{ ...ps.cellText, textAlign: 'right' }}>{countedQty}</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>
                                  <Box
                                    component="span"
                                    sx={{
                                      fontWeight: 600,
                                      color: varianceColor(d.diff, systemQty),
                                      bgcolor: varianceBg(d.diff, systemQty),
                                      px: 1.2, py: 0.3, borderRadius: 1,
                                      fontSize: 13, fontFamily: 'monospace'
                                    }}
                                  >
                                    {d.diff > 0 ? `+${d.diff}` : d.diff}
                                  </Box>
                                </TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>
                                  <Typography
                                    variant="caption"
                                    sx={{
                                      fontWeight: 700,
                                      color: varianceColor(d.diff, systemQty),
                                    }}
                                  >
                                    {pct.toFixed(1)}%
                                  </Typography>
                                </TableCell>
                              </TableRow>
                            )
                          })
                        })}
                      </TableBody>
                    </Table>
                  </Box>
                </Paper>
              )}

              {/* ── Location lines (all) ── */}
              {!showDiffs && (
                <>
                  {(captureDetail.lines || []).length === 0 && (
                    <Alert severity="info">Este conteo no tiene lineas/ubicaciones generadas.</Alert>
                  )}

                  {(captureDetail.lines || []).map((line, lineIdx) => {
                    const locId = line.locationId || line._id
                    const locCode = line.location?.code || locId || `Ubicacion ${lineIdx + 1}`
                    const systemItems = line.systemItems || []
                    const diffs = line.difference || []
                    const hasCounted = (line.countedItems || []).length > 0
                    const hasDiscrepancy = diffs.some(d => d.diff !== 0)
                    const isSaving = savingLocation === locId

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
                            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: 'text.primary' }}>
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
                          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                            {systemItems.length} item{systemItems.length !== 1 ? 's' : ''} en sistema
                          </Typography>
                        </Box>

                        {/* Items table */}
                        <Box sx={{ overflowX: 'auto' }}>
                          <Table size="small">
                            <TableHead>
                              <TableRow sx={ps.tableHeaderRow}>
                                <TableCell>SKU</TableCell>
                                <TableCell sx={{ textAlign: 'right' }}>Qty Sistema</TableCell>
                                <TableCell sx={{ textAlign: 'center', minWidth: 120 }}>Qty Contada</TableCell>
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
                                const activeDiff = diff !== null && diff !== undefined ? diff : liveDiff
                                const pct = systemQty > 0 && activeDiff !== null ? Math.abs(activeDiff / systemQty * 100) : null

                                return (
                                  <TableRow key={sku || itemIdx} sx={ps.tableRow(itemIdx)}>
                                    <TableCell sx={{ ...ps.cellText, fontWeight: 700, fontFamily: 'monospace' }}>{sku}</TableCell>
                                    <TableCell sx={{ ...ps.cellText, textAlign: 'right' }}>{systemQty}</TableCell>
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
                                        disabled={!['OPEN', 'REVIEW'].includes(String(captureDetail.status || ''))}
                                      />
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>
                                      {/* Show saved diff if available, otherwise show live diff */}
                                      {diff !== null && diff !== undefined ? (
                                        <Box
                                          component="span"
                                          sx={{
                                            fontWeight: 600,
                                            color: varianceColor(diff, systemQty),
                                            bgcolor: varianceBg(diff, systemQty),
                                            px: 1.2,
                                            py: 0.3,
                                            borderRadius: 1,
                                            fontSize: 13,
                                            fontFamily: 'monospace'
                                          }}
                                        >
                                          {diff > 0 ? `+${diff}` : diff}
                                        </Box>
                                      ) : liveDiff !== null ? (
                                        <Box
                                          component="span"
                                          sx={{
                                            fontWeight: 600,
                                            color: varianceColor(liveDiff, systemQty),
                                            bgcolor: varianceBg(liveDiff, systemQty),
                                            px: 1.2,
                                            py: 0.3,
                                            borderRadius: 1,
                                            fontSize: 13,
                                            fontFamily: 'monospace',
                                            opacity: 0.7
                                          }}
                                        >
                                          {liveDiff > 0 ? `+${liveDiff}` : liveDiff}
                                        </Box>
                                      ) : (
                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>--</Typography>
                                      )}
                                    </TableCell>
                                    <TableCell sx={{ textAlign: 'right' }}>
                                      {pct !== null ? (
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontWeight: 700,
                                            color: varianceColor(activeDiff, systemQty),
                                            opacity: diff !== null && diff !== undefined ? 1 : 0.7,
                                          }}
                                        >
                                          {pct.toFixed(1)}%
                                        </Typography>
                                      ) : (
                                        <Typography variant="caption" sx={{ color: 'text.disabled' }}>--</Typography>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                )
                              })}
                            </TableBody>
                          </Table>
                        </Box>

                        {/* Save button per location */}
                        {['OPEN', 'REVIEW'].includes(String(captureDetail.status || '')) && (
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
                  })}
                </>
              )}
            </Stack>
          )}
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          {/* Workflow buttons: OPEN -> REVIEW -> APPROVED */}
          {captureDetail && can && String(captureDetail.status || '') === 'OPEN' && (
            <Button
              variant="contained"
              color="primary"
              startIcon={busyId === `${safeId(captureDetail)}:REVIEW` ? <CircularProgress size={16} /> : <RateReviewIcon />}
              onClick={sendToReviewFromCapture}
              disabled={busyId === `${safeId(captureDetail)}:REVIEW`}
              sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
            >
              Enviar a revision
            </Button>
          )}
          {captureDetail && can && ['OPEN', 'REVIEW'].includes(String(captureDetail.status || '')) && (
            <Button
              variant="contained"
              color="success"
              startIcon={busyId === `${safeId(captureDetail)}:APPROVED` ? <CircularProgress size={16} /> : <CheckCircleIcon />}
              onClick={approveFromCapture}
              disabled={busyId === `${safeId(captureDetail)}:APPROVED`}
              sx={{ borderRadius: 2, fontWeight: 700, px: 3 }}
            >
              Aprobar conteo
            </Button>
          )}
          <Button variant="outlined" onClick={closeCapture}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
