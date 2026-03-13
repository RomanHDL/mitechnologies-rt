// ProductionPage.jsx
import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'
import dayjs from 'dayjs'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import TableContainer from '@mui/material/TableContainer'
import LinearProgress from '@mui/material/LinearProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Collapse from '@mui/material/Collapse'

import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadIcon from '@mui/icons-material/Download'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'

import * as XLSX from 'xlsx'

// ── Area / sub-area mapping ──
const AREAS = [
  { code: 'P1', label: 'Sorting' },
  { code: 'P2', label: 'FFT' },
  { code: 'P3', label: 'Shipping' },
  { code: 'P4', label: 'OpenCell' },
]

const SUBAREAS_BY_AREA = {
  P1: ['Sorting'],
  P2: ['Accesorios', 'Produccion', 'Paletizado'],
  P3: ['Shipping'],
  P4: ['OpenCell', 'Technical'],
}

const STATUS_LIST = ['TODAS', 'PENDIENTE', 'EN PROCESO', 'COMPLETADA', 'CANCELADA']

function areaLabel(code) {
  return AREAS.find(a => a.code === code)?.label || code
}

function isFftAccesorios(areaCode, subarea) {
  return areaCode === 'P2' && String(subarea || '').toLowerCase() === 'accesorios'
}

// ── Date helpers ──
function isoToday() {
  return new Date().toISOString().slice(0, 10)
}

function isoToDMY(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function isoAddDays(iso, deltaDays) {
  const base = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(base.getTime())) return iso
  base.setDate(base.getDate() + Number(deltaDays || 0))
  return base.toISOString().slice(0, 10)
}

// ── Status color helper ──
const STATUS_ICON = {
  PENDIENTE: (ps) => <HourglassEmptyIcon sx={{ color: ps.statusChip('PENDIENTE').color, verticalAlign: 'middle' }} fontSize="small" />,
  'EN PROCESO': (ps) => <EditIcon sx={{ color: ps.statusChip('EN PROCESO').color, verticalAlign: 'middle' }} fontSize="small" />,
  COMPLETADA: (ps) => <CheckCircleIcon sx={{ color: ps.statusChip('COMPLETADA').color, verticalAlign: 'middle' }} fontSize="small" />,
  CANCELADA: (ps) => <CancelIcon sx={{ color: ps.statusChip('CANCELADA').color, verticalAlign: 'middle' }} fontSize="small" />,
}

export default function ProductionPage() {
  const { token } = useAuth()
  const ps = usePageStyles()

  const [rows, setRows] = useState([])

  // ── Selection for area/subarea context ──
  const [area, setArea] = useState('P2')
  const [subarea, setSubarea] = useState('Accesorios')

  // ── Filters ──
  const [filtroStatus, setFiltroStatus] = useState('TODAS')
  const [filtroArea, setFiltroArea] = useState('')

  // ── Create dialog state ──
  const [createOpen, setCreateOpen] = useState(false)
  const [createArea, setCreateArea] = useState('P2')
  const [createSubarea, setCreateSubarea] = useState('Accesorios')
  const [createItems, setCreateItems] = useState([{ sku: '', qty: 1 }])
  const [createNote, setCreateNote] = useState('')
  const [skuSuggestions, setSkuSuggestions] = useState([])
  const [activeSkuIdx, setActiveSkuIdx] = useState(-1)

  // ── Expanded rows (items mini-list) ──
  const [expandedRow, setExpandedRow] = useState(null)

  // ── Paletizado dashboard (FFT > Paletizado) ──
  const isFftPaletizado = area === 'P2' && subarea === 'Paletizado'

  const [dashDayISO, setDashDayISO] = useState(isoToday())
  const [dashDayDMY, setDashDayDMY] = useState(isoToDMY(isoToday()))

  const [dash, setDash] = useState({
    resumen: { total: 0, pendientes: 0, procesados: 0 },
    rows: []
  })

  // ── Data loading ──
  const load = async () => {
    const res = await api(token).get('/api/production')
    setRows(Array.isArray(res.data) ? res.data : [])
  }

  const loadDash = async (iso) => {
    try {
      const res = await api(token).get(`/api/pallet-dashboard?day=${iso}`)
      setDash(res.data)
    } catch (e) {
      setDash({ resumen: { total: 0, pendientes: 0, procesados: 0 }, rows: [] })
    }
  }

  const setDashStatus = async (id, status) => {
    await api(token).patch(`/api/pallet-dashboard/${id}/status`, { status })
    await loadDash(dashDayISO)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // If area changes, pick valid default subarea
  useEffect(() => {
    const list = SUBAREAS_BY_AREA[area] || []
    if (!list.includes(subarea)) setSubarea(list[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area])

  // Load dashboard only when FFT > Paletizado
  useEffect(() => {
    if (isFftPaletizado) loadDash(dashDayISO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFftPaletizado, dashDayISO])

  // ── SKU search / autocomplete ──
  const searchSku = useCallback(async (query) => {
    if (!query || query.length < 2) { setSkuSuggestions([]); return }
    try {
      const res = await api(token).get(`/api/products?q=${encodeURIComponent(query)}`)
      setSkuSuggestions(Array.isArray(res.data) ? res.data.slice(0, 8) : [])
    } catch { setSkuSuggestions([]) }
  }, [token])

  // ── Create dialog helpers ──
  const resetCreateForm = () => {
    setCreateArea('P2')
    setCreateSubarea('Accesorios')
    setCreateItems([{ sku: '', qty: 1 }])
    setCreateNote('')
    setSkuSuggestions([])
    setActiveSkuIdx(-1)
  }

  const openCreateDialog = () => {
    resetCreateForm()
    setCreateOpen(true)
  }

  const addItemRow = () => {
    setCreateItems(prev => [...prev, { sku: '', qty: 1 }])
  }

  const removeItemRow = (idx) => {
    setCreateItems(prev => prev.length <= 1 ? prev : prev.filter((_, i) => i !== idx))
  }

  const updateItem = (idx, field, value) => {
    setCreateItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item))
  }

  const handleCreateSubmit = async () => {
    const validItems = createItems.filter(i => i.sku && Number(i.qty) > 0)
    if (!validItems.length) return
    await api(token).post('/api/production', {
      area: createArea,
      subarea: createSubarea,
      items: validItems.map(i => ({ sku: i.sku, qty: Number(i.qty) })),
      note: createNote,
    })
    setCreateOpen(false)
    resetCreateForm()
    await load()
  }

  // Sync create dialog subarea when area changes
  useEffect(() => {
    const list = SUBAREAS_BY_AREA[createArea] || []
    if (!list.includes(createSubarea)) setCreateSubarea(list[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createArea])

  const canCreate = createArea && createSubarea && createItems.some(i => i.sku && Number(i.qty) > 0)

  // ── Status change actions ──
  const changeStatus = async (id, newStatus) => {
    await api(token).patch(`/api/production/${id}/status`, { status: newStatus })
    await load()
  }

  // ── Computed KPIs ──
  const resumen = useMemo(() => ({
    total: rows.length,
    pendientes: rows.filter(r => r.status === 'PENDIENTE').length,
    enproceso: rows.filter(r => r.status === 'EN PROCESO').length,
    completadas: rows.filter(r => r.status === 'COMPLETADA').length,
    canceladas: rows.filter(r => r.status === 'CANCELADA').length,
  }), [rows])

  // ── Filtered rows ──
  const filteredRows = useMemo(() => {
    return rows.filter(r => {
      if (filtroStatus !== 'TODAS' && r.status !== filtroStatus) return false
      if (filtroArea && r.area !== filtroArea) return false
      return true
    })
  }, [rows, filtroStatus, filtroArea])

  // ── Excel export ──
  const exportExcel = () => {
    const data = filteredRows.map(r => ({
      Area: areaLabel(r.area),
      SubArea: r.subarea || '',
      Status: r.status,
      Items: (r.items || []).map(i => `${i.sku} x${i.qty}`).join(', '),
      Solicito: r.requestedBy?.name || r.requestedBy?.email || '',
      Fecha: r.createdAt ? dayjs(r.createdAt).format('DD/MM/YYYY HH:mm') : '',
      Nota: r.note || '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes')
    XLSX.writeFile(wb, `solicitudes_produccion_${dayjs().format('YYYYMMDD_HHmm')}.xlsx`)
  }

  const headerSubtitle = useMemo(() => {
    const title = `${areaLabel(area)} > ${subarea}`
    if (isFftAccesorios(area, subarea)) return `${title}  (modo especial: estantes H1-H5)`
    if (isFftPaletizado) return `${title}  (control diario)`
    return `${title}  (modo normal)`
  }, [area, subarea, isFftPaletizado])

  // ── KPI Card component ──
  const KpiCard = ({ title, value, accent, total }) => {
    const pct = total > 0 ? Math.round((value / total) * 100) : 0
    return (
      <Paper elevation={0} sx={ps.kpiCard(accent)}>
        <Typography sx={{ ...ps.cardHeaderSubtitle, fontSize: 11, fontWeight: 800, letterSpacing: 0.6, textTransform: 'uppercase' }}>
          {title}
        </Typography>
        <Typography sx={{ ...ps.pageTitle, mt: 0.5, fontSize: 30, lineHeight: 1 }}>
          {value}
        </Typography>
        <Box sx={{ mt: 1.5 }}>
          <Box sx={ps.progressBar}>
            <Box sx={ps.progressFill(pct)} />
          </Box>
        </Box>
      </Paper>
    )
  }

  return (
    <Box sx={ps.page}>
      {/* ── Header ── */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ mb: 3 }}
      >
        <Box sx={{ minWidth: 260 }}>
          <Typography variant="h5" sx={ps.pageTitle}>
            Produccion
          </Typography>
          <Typography sx={ps.pageSubtitle}>
            {headerSubtitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          {/* Area context selector */}
          <TextField
            select
            size="small"
            label="Area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 120 }}
          >
            {AREAS.map(a => (
              <MenuItem key={a.code} value={a.code}>{a.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            select
            size="small"
            label="Sub-area"
            value={subarea}
            onChange={(e) => setSubarea(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 130 }}
          >
            {(SUBAREAS_BY_AREA[area] || []).map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          <Tooltip title="Nueva solicitud">
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreateDialog}
              sx={{
                height: 40,
                borderRadius: 2,
                fontWeight: 800,
                textTransform: 'none',
                px: 2.5,
              }}
            >
              Nueva
            </Button>
          </Tooltip>

          <Tooltip title="Exportar a Excel">
            <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* ── KPI Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Total Solicitudes" value={resumen.total} accent="blue" total={Math.max(resumen.total, 1)} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Pendientes" value={resumen.pendientes} accent="amber" total={resumen.total} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="En Proceso" value={resumen.enproceso} accent="blue" total={resumen.total} />
        </Grid>
        <Grid item xs={6} sm={3}>
          <KpiCard title="Completadas" value={resumen.completadas} accent="green" total={resumen.total} />
        </Grid>
      </Grid>

      {/* ── Solicitudes Card ── */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 4 }}>
        {/* Card header with filters */}
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Solicitudes</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>
            {filteredRows.length} de {rows.length} registros
          </Typography>
          <Box sx={{ flex: 1 }} />

          {/* Area filter */}
          <TextField
            select
            size="small"
            label="Filtrar area"
            value={filtroArea}
            onChange={e => setFiltroArea(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 140 }}
          >
            <MenuItem value="">Todas</MenuItem>
            {AREAS.map(a => (
              <MenuItem key={a.code} value={a.code}>{a.label}</MenuItem>
            ))}
          </TextField>
        </Box>

        {/* Status filter chips */}
        <Box sx={ps.filterBar}>
          {STATUS_LIST.map(s => {
            const isActive = filtroStatus === s
            const toneMap = {
              TODAS: 'default',
              PENDIENTE: 'warn',
              'EN PROCESO': 'info',
              COMPLETADA: 'ok',
              CANCELADA: 'bad',
            }
            const tone = toneMap[s] || 'default'
            const chipStyle = isActive ? ps.metricChip(tone) : {
              ...ps.metricChip('default'),
              opacity: 0.6,
            }
            const countMap = {
              TODAS: resumen.total,
              PENDIENTE: resumen.pendientes,
              'EN PROCESO': resumen.enproceso,
              COMPLETADA: resumen.completadas,
              CANCELADA: resumen.canceladas,
            }
            return (
              <Chip
                key={s}
                label={`${s} (${countMap[s]})`}
                onClick={() => setFiltroStatus(s)}
                sx={{
                  ...chipStyle,
                  cursor: 'pointer',
                  transition: 'all .15s ease',
                  '&:hover': { opacity: 1 },
                }}
              />
            )
          })}
        </Box>

        {/* Table */}
        <Box sx={{ p: 2 }}>
          <TableContainer sx={{ borderRadius: 2, maxHeight: 540, overflow: 'auto' }}>
            <Table stickyHeader size="small" sx={{ minWidth: 1000 }}>
              <TableHead>
                <TableRow sx={ps.tableHeaderRow}>
                  <TableCell />
                  <TableCell>Area</TableCell>
                  <TableCell>Sub-area</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Items</TableCell>
                  <TableCell>Solicito</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Nota</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
                </TableRow>
              </TableHead>

              <TableBody>
                {filteredRows.map((r, idx) => {
                  const itemsText = (r.items || []).map(i => `${i.sku} x${i.qty}`).join(', ')
                  const isExpanded = expandedRow === r._id
                  const statusIconFn = STATUS_ICON[r.status] || STATUS_ICON.PENDIENTE
                  const requester = r.requestedBy?.name || r.requestedBy?.email || '--'
                  const dateStr = r.createdAt ? dayjs(r.createdAt).format('DD/MM/YY HH:mm') : '--'

                  return (
                    <React.Fragment key={r._id}>
                      <TableRow sx={ps.tableRow(idx)}>
                        {/* Expand toggle */}
                        <TableCell sx={{ width: 36, p: 0.5 }}>
                          {(r.items || []).length > 1 && (
                            <IconButton
                              size="small"
                              onClick={() => setExpandedRow(isExpanded ? null : r._id)}
                              sx={{ color: 'text.secondary' }}
                            >
                              {isExpanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
                            </IconButton>
                          )}
                        </TableCell>

                        <TableCell sx={{ ...ps.cellText, fontWeight: 800 }}>{areaLabel(r.area)}</TableCell>
                        <TableCell sx={ps.cellTextSecondary}>{r.subarea || '--'}</TableCell>

                        {/* Color-coded status */}
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          <Chip
                            icon={statusIconFn(ps)}
                            label={r.status}
                            size="small"
                            sx={{
                              ...ps.statusChip(r.status),
                              fontSize: '0.72rem',
                            }}
                          />
                        </TableCell>

                        {/* Items summary */}
                        <TableCell sx={{ ...ps.cellTextSecondary, maxWidth: 220 }}>
                          <Tooltip title={itemsText} arrow>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {(r.items || []).length} item{(r.items || []).length !== 1 ? 's' : ''}
                              {(r.items || []).length === 1 ? `: ${itemsText}` : ''}
                            </span>
                          </Tooltip>
                        </TableCell>

                        {/* Requested by */}
                        <TableCell sx={ps.cellTextSecondary}>{requester}</TableCell>

                        {/* Date */}
                        <TableCell sx={{ ...ps.cellTextSecondary, whiteSpace: 'nowrap' }}>{dateStr}</TableCell>

                        {/* Note */}
                        <TableCell sx={{ ...ps.cellTextSecondary, maxWidth: 200 }}>
                          <Tooltip title={r.note || '--'} arrow>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                              {(r.note || '--').length > 30 ? (r.note || '--').slice(0, 30) + '...' : (r.note || '--')}
                            </span>
                          </Tooltip>
                        </TableCell>

                        {/* Actions: workflow buttons */}
                        <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                          {/* PENDIENTE -> EN PROCESO */}
                          {r.status === 'PENDIENTE' && (
                            <Tooltip title="Iniciar proceso">
                              <IconButton
                                size="small"
                                sx={ps.actionBtn('primary')}
                                onClick={() => changeStatus(r._id, 'EN PROCESO')}
                              >
                                <PlayArrowIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* EN PROCESO -> COMPLETADA */}
                          {r.status === 'EN PROCESO' && (
                            <Tooltip title="Marcar completada">
                              <IconButton
                                size="small"
                                sx={ps.actionBtn('success')}
                                onClick={() => changeStatus(r._id, 'COMPLETADA')}
                              >
                                <DoneIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Cancel (available for PENDIENTE and EN PROCESO) */}
                          {(r.status === 'PENDIENTE' || r.status === 'EN PROCESO') && (
                            <Tooltip title="Cancelar">
                              <IconButton
                                size="small"
                                sx={{ ...ps.actionBtn('error'), ml: 0.5 }}
                                onClick={() => changeStatus(r._id, 'CANCELADA')}
                              >
                                <CancelIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}

                          {/* Completed / cancelled show just a chip */}
                          {(r.status === 'COMPLETADA' || r.status === 'CANCELADA') && (
                            <Typography variant="caption" sx={{ color: 'text.disabled', fontStyle: 'italic' }}>
                              Finalizada
                            </Typography>
                          )}
                        </TableCell>
                      </TableRow>

                      {/* Expandable items mini-list */}
                      {(r.items || []).length > 1 && (
                        <TableRow>
                          <TableCell colSpan={9} sx={{ p: 0, borderBottom: isExpanded ? undefined : 'none' }}>
                            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
                              <Box sx={{ px: 4, py: 1.5 }}>
                                <Typography variant="caption" sx={{ ...ps.cellText, fontWeight: 800, mb: 0.5, display: 'block' }}>
                                  Detalle de items
                                </Typography>
                                <Table size="small" sx={{ maxWidth: 400 }}>
                                  <TableHead>
                                    <TableRow>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }}>SKU</TableCell>
                                      <TableCell sx={{ fontWeight: 700, fontSize: '0.7rem', color: 'text.secondary' }} align="right">Cantidad</TableCell>
                                    </TableRow>
                                  </TableHead>
                                  <TableBody>
                                    {(r.items || []).map((item, ii) => (
                                      <TableRow key={ii}>
                                        <TableCell sx={ps.cellText}>{item.sku}</TableCell>
                                        <TableCell sx={ps.cellText} align="right">{item.qty}</TableCell>
                                      </TableRow>
                                    ))}
                                  </TableBody>
                                </Table>
                              </Box>
                            </Collapse>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })}

                {filteredRows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={9} sx={ps.emptyText}>
                      No hay solicitudes para el filtro seleccionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Paper>

      {/* ── FFT > Paletizado -- Dashboard Diario (ONLY shown for FFT+Paletizado) ── */}
      {isFftPaletizado && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 1 }}>
          <Box
            sx={{
              ...ps.cardHeader,
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 1.2,
            }}
          >
            <Box>
              <Typography sx={ps.cardHeaderTitle}>
                FFT &gt; Paletizado -- Control diario
              </Typography>
              <Typography sx={ps.cardHeaderSubtitle}>
                Consulta por dia y marca pallets como procesados/pendientes.
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Tooltip title="Dia anterior">
                <IconButton
                  onClick={() => {
                    const nextIso = isoAddDays(dashDayISO, -1)
                    setDashDayISO(nextIso)
                    setDashDayDMY(isoToDMY(nextIso))
                  }}
                  sx={ps.actionBtn('primary')}
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>

              <TextField
                type="date"
                label="Dia"
                size="small"
                value={dashDayISO}
                onChange={(e) => {
                  const iso = e.target.value || isoToday()
                  setDashDayISO(iso)
                  setDashDayDMY(isoToDMY(iso))
                }}
                sx={{ ...ps.inputSx, minWidth: { xs: '100%', md: 200 } }}
                helperText={`Mostrando: ${dashDayDMY}`}
                InputLabelProps={{ shrink: true }}
              />

              <Tooltip title="Dia siguiente">
                <IconButton
                  onClick={() => {
                    const nextIso = isoAddDays(dashDayISO, 1)
                    setDashDayISO(nextIso)
                    setDashDayDMY(isoToDMY(nextIso))
                  }}
                  sx={ps.actionBtn('primary')}
                >
                  <ChevronRightIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Ir a hoy">
                <IconButton
                  onClick={() => {
                    const today = isoToday()
                    setDashDayISO(today)
                    setDashDayDMY(isoToDMY(today))
                  }}
                  sx={ps.actionBtn('primary')}
                >
                  <TodayIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              {/* Left panel - day summary */}
              <Grid item xs={12} md={4}>
                <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
                  <Typography sx={{ ...ps.cardHeaderTitle, mb: 1.5 }}>
                    Estado del dia
                  </Typography>
                  <Stack spacing={1.2} sx={{ mb: 2 }}>
                    <Chip label={`Total: ${dash.resumen?.total ?? 0}`} sx={ps.metricChip('default')} />
                    <Chip label={`Pendientes: ${dash.resumen?.pendientes ?? 0}`} sx={ps.metricChip('warn')} />
                    <Chip label={`Procesados: ${dash.resumen?.procesados ?? 0}`} sx={ps.metricChip('ok')} />
                  </Stack>
                  <Divider sx={{ my: 2 }} />
                  <Typography sx={ps.cardHeaderSubtitle}>
                    Tip: desplazate en la tabla (derecha) y marca procesados sin recargar.
                  </Typography>
                </Paper>
              </Grid>

              {/* Right panel - table */}
              <Grid item xs={12} md={8}>
                <TableContainer sx={{ borderRadius: 2, maxHeight: 380, overflow: 'auto' }}>
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow sx={ps.tableHeaderRow}>
                        <TableCell>PalletID</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {(dash.rows || []).map((r, i) => (
                        <TableRow key={r.id} sx={ps.tableRow(i)}>
                          <TableCell sx={{ ...ps.cellText, fontWeight: 800 }}>{r.palletId}</TableCell>
                          <TableCell>
                            <Chip label={r.status} size="small" sx={ps.statusChip(r.status)} />
                          </TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setDashStatus(r.id, r.status === 'PROCESADO' ? 'PENDIENTE' : 'PROCESADO')}
                              sx={{
                                borderRadius: 2,
                                textTransform: 'none',
                                fontWeight: 800,
                              }}
                            >
                              {r.status === 'PROCESADO' ? 'Marcar Pendiente' : 'Marcar Procesado'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {(!dash.rows || dash.rows.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} sx={ps.emptyText}>
                            No hay pallets cargados para este dia. (Importa el Excel o cambia la fecha)
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Grid>
            </Grid>
          </Box>
        </Paper>
      )}

      {/* ── Create Dialog ── */}
      <Dialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 800 }}>Nueva solicitud de produccion</DialogTitle>
        <DialogContent dividers>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            {/* Area */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Area"
                value={createArea}
                onChange={(e) => setCreateArea(e.target.value)}
              >
                {AREAS.map(a => (
                  <MenuItem key={a.code} value={a.code}>{a.label} ({a.code})</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Subarea */}
            <Grid item xs={12} sm={6}>
              <TextField
                select
                fullWidth
                label="Sub-area"
                value={createSubarea}
                onChange={(e) => setCreateSubarea(e.target.value)}
              >
                {(SUBAREAS_BY_AREA[createArea] || []).map(s => (
                  <MenuItem key={s} value={s}>{s}</MenuItem>
                ))}
              </TextField>
            </Grid>

            {/* Items table */}
            <Grid item xs={12}>
              <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1 }}>
                Items
              </Typography>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>SKU / PalletID</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }}>Cantidad</TableCell>
                    <TableCell sx={{ width: 48 }} />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {createItems.map((item, idx) => (
                    <TableRow key={idx}>
                      <TableCell sx={{ p: 0.5 }}>
                        <TextField
                          size="small"
                          fullWidth
                          placeholder="SKU o PalletID"
                          value={item.sku}
                          onChange={(e) => {
                            updateItem(idx, 'sku', e.target.value)
                            setActiveSkuIdx(idx)
                            searchSku(e.target.value)
                          }}
                          onBlur={() => setTimeout(() => setActiveSkuIdx(-1), 200)}
                        />
                        {/* SKU suggestions dropdown */}
                        {activeSkuIdx === idx && skuSuggestions.length > 0 && (
                          <Paper
                            elevation={4}
                            sx={{
                              position: 'absolute',
                              zIndex: 1300,
                              maxHeight: 180,
                              overflow: 'auto',
                              mt: 0.5,
                              minWidth: 220,
                            }}
                          >
                            {skuSuggestions.map((sug, si) => (
                              <MenuItem
                                key={si}
                                dense
                                onMouseDown={() => {
                                  updateItem(idx, 'sku', sug.sku || sug.code || sug.name || '')
                                  setSkuSuggestions([])
                                }}
                              >
                                {sug.sku || sug.code || sug.name || '--'}
                              </MenuItem>
                            ))}
                          </Paper>
                        )}
                      </TableCell>
                      <TableCell sx={{ p: 0.5 }}>
                        <TextField
                          size="small"
                          type="number"
                          fullWidth
                          value={item.qty}
                          onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                          inputProps={{ min: 1 }}
                        />
                      </TableCell>
                      <TableCell sx={{ p: 0.5 }}>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => removeItemRow(idx)}
                          disabled={createItems.length <= 1}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <Button
                size="small"
                startIcon={<AddIcon />}
                onClick={addItemRow}
                sx={{ mt: 1, textTransform: 'none', fontWeight: 700 }}
              >
                Agregar item
              </Button>
            </Grid>

            {/* Note */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                multiline
                minRows={2}
                label="Nota (opcional)"
                value={createNote}
                onChange={(e) => setCreateNote(e.target.value)}
              />
            </Grid>

            {isFftAccesorios(createArea, createSubarea) && (
              <Grid item xs={12}>
                <Typography variant="caption" color="text.secondary">
                  *FFT &gt; Accesorios usara estantes H1-H5 en el siguiente paso (BINs/estantes).
                </Typography>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setCreateOpen(false)} sx={{ textTransform: 'none' }}>
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateSubmit}
            disabled={!canCreate}
            sx={{ textTransform: 'none', fontWeight: 800, px: 3 }}
          >
            Crear solicitud
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
