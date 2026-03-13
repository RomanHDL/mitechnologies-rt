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
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Alert from '@mui/material/Alert'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'
import LinearProgress from '@mui/material/LinearProgress'
import Fade from '@mui/material/Fade'
import Collapse from '@mui/material/Collapse'

import ListAltIcon from '@mui/icons-material/ListAlt'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import InfoIcon from '@mui/icons-material/Info'
import DoneIcon from '@mui/icons-material/Done'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import AssignmentIcon from '@mui/icons-material/Assignment'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'
import PersonIcon from '@mui/icons-material/Person'
import ReportProblemIcon from '@mui/icons-material/ReportProblem'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import ArrowForwardIcon from '@mui/icons-material/ArrowForward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import VerifiedIcon from '@mui/icons-material/Verified'

import dayjs from 'dayjs'

/* ── Priority badge helper ── */
const PRIORITY_COLORS = {
  URGENTE: { bg: '#FFEBEE', color: '#C62828', darkBg: 'rgba(239,68,68,.18)', darkColor: '#FCA5A5' },
  ALTA:    { bg: '#FFF3E0', color: '#E65100', darkBg: 'rgba(245,158,11,.18)', darkColor: '#FCD34D' },
  NORMAL:  { bg: '#E3F2FD', color: '#1565C0', darkBg: 'rgba(66,165,245,.18)', darkColor: '#64B5F6' },
  BAJA:    { bg: '#F3E5F5', color: '#6A1B9A', darkBg: 'rgba(156,39,176,.18)', darkColor: '#CE93D8' },
}

export default function PickingPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [tab, setTab] = useState(0)

  // Orders tab
  const [orders, setOrders] = useState([])
  const [orderQ, setOrderQ] = useState('')
  const [orderPage, setOrderPage] = useState(1)
  const orderPageSize = 12

  // My picks tab
  const [myPicks, setMyPicks] = useState([])
  const [myPicksPage, setMyPicksPage] = useState(1)

  // Pick list for specific order
  const [pickList, setPickList] = useState([])
  const [pickOrderId, setPickOrderId] = useState(null)
  const [pickListPage, setPickListPage] = useState(1)

  const [generating, setGenerating] = useState(false)
  const [genErr, setGenErr] = useState('')

  // Confirm dialog (QR scan)
  const [openConfirm, setOpenConfirm] = useState(false)
  const [confirmPick, setConfirmPick] = useState(null)
  const [scanCode, setScanCode] = useState('')
  const [confirmErr, setConfirmErr] = useState('')
  const [confirmSuccess, setConfirmSuccess] = useState(false)
  const [confirming, setConfirming] = useState(false)

  // Short pick dialog
  const [openShortPick, setOpenShortPick] = useState(false)
  const [shortPickItem, setShortPickItem] = useState(null)
  const [shortPickReason, setShortPickReason] = useState('')
  const [shortPickErr, setShortPickErr] = useState('')
  const [shortPickSubmitting, setShortPickSubmitting] = useState(false)

  // Completion summary
  const [showSummary, setShowSummary] = useState(false)

  const isAdmin = user?.role === 'ADMIN' || user?.role === 'SUPERVISOR'

  // Row color by status
  const pickRowSx = (idx, status) => {
    const base = ps.tableRow(idx)
    const s = (status || '').toUpperCase()
    if (s === 'PICKED' || s === 'COMPLETADA' || s === 'CONFIRMADO') return { ...base, bgcolor: ps.isDark ? 'rgba(46,125,50,.08)' : 'rgba(46,125,50,.04)' }
    if (s === 'SHORT' || s === 'CANCELADA') return { ...base, bgcolor: ps.isDark ? 'rgba(245,158,11,.08)' : 'rgba(245,158,11,.04)' }
    if (s === 'ASSIGNED' || s === 'ASIGNADA') return { ...base, bgcolor: ps.isDark ? 'rgba(21,101,192,.08)' : 'rgba(21,101,192,.04)' }
    return base
  }

  const loadOrders = async () => {
    try {
      const res = await client.get('/api/orders')
      setOrders(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading orders:', e) }
  }

  const loadMyPicks = async () => {
    try {
      const res = await client.get('/api/picking/my')
      setMyPicks(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading my picks:', e) }
  }

  const loadPickList = async (orderId) => {
    try {
      const res = await client.get('/api/picking/order/' + orderId)
      setPickList(Array.isArray(res.data) ? res.data : [])
      setPickOrderId(orderId)
      setTab(2)
    } catch (e) { console.error('Error loading pick list:', e) }
  }

  useEffect(() => { loadOrders(); loadMyPicks() }, [token])

  const generatePickList = async (orderId) => {
    setGenerating(true)
    setGenErr('')
    try {
      await client.post('/api/picking/generate/' + orderId)
      await loadPickList(orderId)
    } catch (e) {
      setGenErr(e?.response?.data?.message || 'Error al generar lista de picking')
    } finally { setGenerating(false) }
  }

  // ── KPI calculations ──
  const kpiData = useMemo(() => {
    const allPicks = myPicks || []
    const todayStr = dayjs().format('YYYY-MM-DD')

    const pendientes = allPicks.filter(p => (p.status || '') === 'PENDIENTE' || (p.status || '') === 'ASIGNADA').length
    const completadosHoy = allPicks.filter(p =>
      ((p.status || '') === 'COMPLETADA' || (p.status || '') === 'CONFIRMADO') &&
      p.updatedAt && dayjs(p.updatedAt).format('YYYY-MM-DD') === todayStr
    ).length
    const asignados = allPicks.filter(p =>
      (p.status || '') === 'ASIGNADA' || (p.status || '') === 'PENDIENTE'
    ).length
    const shortPicks = allPicks.filter(p => (p.status || '') === 'SHORT' || (p.status || '') === 'CANCELADA').length

    return { pendientes, completadosHoy, asignados, shortPicks }
  }, [myPicks])

  // ── Progress per order in pick list ──
  const pickListProgress = useMemo(() => {
    if (!pickList.length) return { completed: 0, total: 0, pct: 0 }
    const completed = pickList.filter(p => (p.status || '') === 'COMPLETADA' || (p.status || '') === 'CONFIRMADO').length
    const total = pickList.length
    return { completed, total, pct: total > 0 ? Math.round((completed / total) * 100) : 0 }
  }, [pickList])

  // Completion summary for pick list
  const completionSummary = useMemo(() => {
    if (!pickList.length) return null
    const picked = pickList.filter(p => { const s = (p.status || ''); return s === 'PICKED' || s === 'COMPLETADA' || s === 'CONFIRMADO' })
    const shorts = pickList.filter(p => { const s = (p.status || ''); return s === 'SHORT' || s === 'CANCELADA' })
    const pending = pickList.length - picked.length - shorts.length
    const totalQtyReq = pickList.reduce((s, p) => s + (p.qtyRequested || p.qty || 0), 0)
    const totalQtyPicked = picked.reduce((s, p) => s + (p.qtyPicked || p.qty || 0), 0)
    const accuracy = totalQtyReq > 0 ? Math.round((totalQtyPicked / totalQtyReq) * 100) : 0
    const allDone = pending === 0
    return { picked: picked.length, shorts: shorts.length, pending, totalQtyReq, totalQtyPicked, accuracy, allDone }
  }, [pickList])

  // Auto-show summary when all picks done
  useEffect(() => {
    if (completionSummary?.allDone && pickList.length > 0) setShowSummary(true)
  }, [completionSummary?.allDone, pickList.length])

  // Orders filtering
  const filteredOrders = useMemo(() => {
    let list = orders
    if (orderQ) {
      const qq = orderQ.toLowerCase()
      list = list.filter(r =>
        (r.orderNumber || '').toLowerCase().includes(qq) ||
        (r.destinationType || '').toLowerCase().includes(qq) ||
        (r.destinationRef || '').toLowerCase().includes(qq)
      )
    }
    return list
  }, [orders, orderQ])

  const orderTotalPages = Math.max(1, Math.ceil(filteredOrders.length / orderPageSize))
  const paginatedOrders = useMemo(() => {
    const start = (orderPage - 1) * orderPageSize
    return filteredOrders.slice(start, start + orderPageSize)
  }, [filteredOrders, orderPage, orderTotalPages])

  // My picks pagination
  const myPicksTotalPages = Math.max(1, Math.ceil(myPicks.length / orderPageSize))
  const paginatedMyPicks = useMemo(() => {
    const start = (myPicksPage - 1) * orderPageSize
    return myPicks.slice(start, start + orderPageSize)
  }, [myPicks, myPicksPage, myPicksTotalPages])

  // Pick list pagination
  const pickListTotalPages = Math.max(1, Math.ceil(pickList.length / orderPageSize))
  const paginatedPickList = useMemo(() => {
    const start = (pickListPage - 1) * orderPageSize
    return pickList.slice(start, start + orderPageSize)
  }, [pickList, pickListPage, pickListTotalPages])

  // Confirm pick with QR scan
  const openConfirmDialog = (pick) => {
    setConfirmPick(pick)
    setScanCode('')
    setConfirmErr('')
    setConfirmSuccess(false)
    setOpenConfirm(true)
  }

  // Find next pending pick for auto-advance
  const findNextPendingPick = useCallback((currentPickId) => {
    const source = tab === 1 ? myPicks : pickList
    const currentIdx = source.findIndex(p => (p.id || p._id) === currentPickId)
    for (let i = currentIdx + 1; i < source.length; i++) {
      const s = source[i].status || ''
      if (s !== 'COMPLETADA' && s !== 'CONFIRMADO' && s !== 'CANCELADA' && s !== 'SHORT') {
        return source[i]
      }
    }
    return null
  }, [myPicks, pickList, tab])

  const handleConfirm = async () => {
    setConfirmErr('')
    if (!scanCode.trim()) { setConfirmErr('Escanea o ingresa el codigo QR'); return }
    if (!confirmPick) return
    setConfirming(true)
    try {
      await client.patch('/api/picking/' + (confirmPick.id || confirmPick._id) + '/confirm', { scannedCode: scanCode })

      // Show success animation
      setConfirmSuccess(true)

      // Wait for animation, then auto-advance or close
      setTimeout(async () => {
        const nextPick = findNextPendingPick(confirmPick.id || confirmPick._id)

        if (pickOrderId) await loadPickList(pickOrderId)
        await loadMyPicks()

        if (nextPick) {
          // Auto-advance to next pick
          setConfirmPick(nextPick)
          setScanCode('')
          setConfirmErr('')
          setConfirmSuccess(false)
        } else {
          setOpenConfirm(false)
          setConfirmSuccess(false)
        }
        setConfirming(false)
      }, 1200)
    } catch (e) {
      setConfirmErr(e?.response?.data?.message || 'Error al confirmar')
      setConfirming(false)
    }
  }

  // Manual confirm (admin/supervisor only - no QR required)
  const handleManualConfirm = async (pick) => {
    if (!pick) return
    try {
      await client.patch('/api/picking/' + (pick.id || pick._id) + '/confirm', {
        scannedCode: pick.palletCode || pick.pallet?.code || 'MANUAL',
        qtyPicked: pick.qtyRequested || pick.qty || 0,
      })
      if (pickOrderId) await loadPickList(pickOrderId)
      await loadMyPicks()
    } catch (e) { console.error('Manual confirm error:', e) }
  }

  // ── Short pick reporting ──
  const openShortPickDialog = (pick) => {
    setShortPickItem(pick)
    setShortPickReason('')
    setShortPickErr('')
    setOpenShortPick(true)
  }

  const handleShortPick = async () => {
    setShortPickErr('')
    if (!shortPickReason.trim()) { setShortPickErr('Ingresa una razon para el short pick'); return }
    if (!shortPickItem) return
    setShortPickSubmitting(true)
    try {
      await client.patch('/api/picking/' + (shortPickItem.id || shortPickItem._id) + '/confirm', {
        scannedCode: '__SHORT_PICK__',
        shortPick: true,
        reason: shortPickReason,
      })
      setOpenShortPick(false)
      if (pickOrderId) await loadPickList(pickOrderId)
      await loadMyPicks()
    } catch (e) {
      setShortPickErr(e?.response?.data?.message || 'Error al reportar short pick')
    } finally { setShortPickSubmitting(false) }
  }

  // ── Priority badge renderer ──
  const PriorityBadge = ({ priority }) => {
    const p = (priority || 'NORMAL').toUpperCase()
    const c = PRIORITY_COLORS[p] || PRIORITY_COLORS.NORMAL
    return (
      <Chip
        size="small"
        label={p}
        sx={{
          fontWeight: 700,
          fontSize: '0.68rem',
          bgcolor: ps.isDark ? c.darkBg : c.bg,
          color: ps.isDark ? c.darkColor : c.color,
          border: '1px solid',
          borderColor: ps.isDark ? c.darkColor + '33' : c.color + '22',
        }}
      />
    )
  }

  // ── Order progress bar ──
  const OrderProgressBar = ({ picks }) => {
    if (!picks || !picks.length) return null
    const completed = picks.filter(p => (p.status || '') === 'COMPLETADA' || (p.status || '') === 'CONFIRMADO').length
    const total = picks.length
    const pct = total > 0 ? Math.round((completed / total) * 100) : 0
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
        <Box sx={{ flex: 1, ...ps.progressBar }}>
          <Box sx={ps.progressFill(pct, pct === 100 ? 'rgba(46,125,50,.65)' : 'rgba(21,101,192,.65)')} />
        </Box>
        <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
          {completed}/{total} ({pct}%)
        </Typography>
      </Box>
    )
  }

  const Pagination = function(props) {
    return (
      <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
        <Button disabled={props.page === 1} onClick={() => props.setPage(function(p) { return Math.max(1, p - 1) })}>Anterior</Button>
        <Typography sx={ps.cellText}>{'Pagina ' + props.page + ' de ' + props.total}</Typography>
        <Button disabled={props.page >= props.total} onClick={() => props.setPage(function(p) { return Math.min(props.total, p + 1) })}>Siguiente</Button>
      </Stack>
    )
  }

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Picking Guiado</Typography>
          <Typography sx={ps.pageSubtitle}>Genera y gestiona listas de picking para ordenes de salida</Typography>
        </Box>
      </Stack>

      {/* ── KPI Summary Cards ── */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('amber')} onClick={() => setTab(1)}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <PendingActionsIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                  {kpiData.pendientes}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                  Picks Pendientes
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('green')} onClick={() => setTab(1)}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CheckCircleOutlineIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                  {kpiData.completadosHoy}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                  Completados Hoy
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')} onClick={() => setTab(1)}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <PersonIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                  {kpiData.asignados}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                  Asignados a Mi
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={6} sm={3}>
          <Paper elevation={0} sx={ps.kpiCard('red')} onClick={() => setTab(1)}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <ReportProblemIcon sx={{ color: ps.isDark ? '#FCA5A5' : '#C62828', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                  {kpiData.shortPicks}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                  Short Picks
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {genErr && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setGenErr('')}>{genErr}</Alert>}

      <Paper elevation={1} sx={{ ...ps.card, mb: 2 }}>
        <Tabs value={tab} onChange={(e, v) => setTab(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tab label="Ordenes" icon={<AssignmentIcon />} iconPosition="start" />
          <Tab label="Mis Picks" icon={<PlaylistAddCheckIcon />} iconPosition="start" />
          <Tab label="Lista de Picking" icon={<ListAltIcon />} iconPosition="start" disabled={!pickOrderId} />
        </Tabs>
      </Paper>

      {/* Tab 0: Orders */}
      {tab === 0 && (
        <Box>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
            <TextField label="Buscar orden, destino" value={orderQ} onChange={e => setOrderQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 260 }} />
          </Stack>
          <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead><TableRow sx={ps.tableHeaderRow}>
                <TableCell>Orden</TableCell>
                <TableCell>Prioridad</TableCell>
                <TableCell>Destino</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Progreso</TableCell>
                <TableCell>Lineas</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {paginatedOrders.map((r, idx) => {
                  const id = r.id || r._id
                  return (
                    <TableRow key={id} sx={ps.tableRow(idx)}>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.orderNumber || id}</TableCell>
                      <TableCell sx={ps.cellText}>
                        <PriorityBadge priority={r.priority} />
                      </TableCell>
                      <TableCell sx={ps.cellText}>{(r.destinationType || '') + (r.destinationRef ? ' - ' + r.destinationRef : '')}</TableCell>
                      <TableCell sx={ps.cellText}><Chip size="small" label={r.status || 'PENDIENTE'} sx={ps.statusChip(r.status || 'PENDIENTE')} /></TableCell>
                      <TableCell sx={ps.cellText}>
                        <OrderProgressBar picks={r.picks || r.pickTasks} />
                      </TableCell>
                      <TableCell sx={ps.cellText}>{(r.lines || []).map(function(l) { return l.sku + '(' + l.qty + ')' }).join(', ') || '-'}</TableCell>
                      <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        <Tooltip title="Generar lista de picking">
                          <span>
                            <IconButton
                              size="small"
                              sx={ps.actionBtn('primary')}
                              onClick={() => generatePickList(id)}
                              disabled={generating}
                            >
                              {generating ? <CircularProgress size={18} /> : <ListAltIcon fontSize="small" />}
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Ver lista de picking">
                          <IconButton size="small" sx={ps.actionBtn('success')} onClick={() => loadPickList(id)}><PlaylistAddCheckIcon fontSize="small" /></IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!paginatedOrders.length && (<TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin ordenes para mostrar.</Typography></TableCell></TableRow>)}
              </TableBody>
            </Table>
            <Pagination page={orderPage} setPage={setOrderPage} total={orderTotalPages} />
          </Paper>
        </Box>
      )}

      {/* Tab 1: My Picks */}
      {tab === 1 && (
        <Box>
          {/* KPI strip for Mis Picks */}
          <Grid container spacing={1.5} sx={{ mb: 2 }}>
            {[
              { label: 'Total Asignados', value: kpiData.asignados + kpiData.completadosHoy + kpiData.shortPicks, accent: 'blue', icon: <AssignmentIcon sx={{ fontSize: 20 }} /> },
              { label: 'Completados', value: kpiData.completadosHoy, accent: 'green', icon: <CheckCircleOutlineIcon sx={{ fontSize: 20 }} /> },
              { label: 'Pendientes', value: kpiData.pendientes, accent: 'amber', icon: <PendingActionsIcon sx={{ fontSize: 20 }} /> },
              { label: 'Short Picks', value: kpiData.shortPicks, accent: 'red', icon: <ReportProblemIcon sx={{ fontSize: 20 }} /> },
            ].map(function(k) {
              const accentColors = {
                blue: { color: ps.isDark ? '#64B5F6' : '#1565C0', bg: ps.isDark ? 'rgba(66,165,245,.08)' : 'rgba(21,101,192,.04)', border: ps.isDark ? 'rgba(66,165,245,.18)' : 'rgba(21,101,192,.12)' },
                green: { color: ps.isDark ? '#86EFAC' : '#2E7D32', bg: ps.isDark ? 'rgba(34,197,94,.08)' : 'rgba(46,125,50,.04)', border: ps.isDark ? 'rgba(34,197,94,.18)' : 'rgba(46,125,50,.12)' },
                amber: { color: ps.isDark ? '#FCD34D' : '#E65100', bg: ps.isDark ? 'rgba(245,158,11,.08)' : 'rgba(245,158,11,.04)', border: ps.isDark ? 'rgba(245,158,11,.18)' : 'rgba(245,158,11,.12)' },
                red: { color: ps.isDark ? '#FCA5A5' : '#C62828', bg: ps.isDark ? 'rgba(239,68,68,.08)' : 'rgba(198,40,40,.04)', border: ps.isDark ? 'rgba(239,68,68,.18)' : 'rgba(198,40,40,.12)' },
              }
              const ac = accentColors[k.accent] || accentColors.blue
              return (
                <Grid item xs={6} sm={3} key={k.label}>
                  <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, bgcolor: ac.bg, border: '1px solid ' + ac.border }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box sx={{ color: ac.color }}>{k.icon}</Box>
                      <Box>
                        <Typography sx={{ fontSize: 20, fontWeight: 800, color: ac.color, lineHeight: 1.1 }}>{k.value}</Typography>
                        <Typography sx={{ fontSize: 10, fontWeight: 700, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: 0.5 }}>{k.label}</Typography>
                      </Box>
                    </Stack>
                  </Paper>
                </Grid>
              )
            })}
          </Grid>

          <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 750 }}>
              <TableHead><TableRow sx={ps.tableHeaderRow}>
                <TableCell sx={{ width: 50, textAlign: 'center' }}>#</TableCell>
                <TableCell>Orden</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Ubicacion</TableCell>
                <TableCell>Tarima</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {paginatedMyPicks.map((r, idx) => {
                  const id = r.id || r._id
                  const s = r.status || ''
                  const isConfirmed = s === 'CONFIRMADO' || s === 'COMPLETADA' || s === 'PICKED'
                  const isShort = s === 'SHORT' || s === 'CANCELADA'
                  const seq = r.sequence || (idx + 1 + (myPicksPage - 1) * orderPageSize)
                  const isNextPick = !isConfirmed && !isShort && idx === paginatedMyPicks.findIndex(function(p) {
                    var ps2 = p.status || ''; return ps2 !== 'CONFIRMADO' && ps2 !== 'COMPLETADA' && ps2 !== 'PICKED' && ps2 !== 'SHORT' && ps2 !== 'CANCELADA'
                  })
                  return (
                    <TableRow key={id} sx={pickRowSx(idx, s)}>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.3}>
                          <Typography sx={{ fontWeight: 800, fontSize: 14, color: isNextPick ? (ps.isDark ? '#64B5F6' : '#1565C0') : 'text.secondary' }}>{seq}</Typography>
                          {isNextPick && <ArrowForwardIcon sx={{ fontSize: 14, color: ps.isDark ? '#64B5F6' : '#1565C0' }} />}
                        </Stack>
                      </TableCell>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.orderNumber || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>{r.sku || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>{r.qty || 0}</TableCell>
                      <TableCell sx={ps.cellText}>{r.location || '-'}</TableCell>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.palletCode || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>
                        <Chip size="small" label={r.status || 'PENDIENTE'} sx={ps.metricChip(isConfirmed ? 'ok' : isShort ? 'bad' : 'warn')} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {!isConfirmed && !isShort && (
                          <>
                            <Tooltip title="Confirmar con escaneo QR">
                              <IconButton size="small" sx={ps.actionBtn('success')} onClick={() => openConfirmDialog(r)}><QrCodeScannerIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title="Confirmar sin escaneo">
                                <IconButton size="small" sx={{ ...ps.actionBtn('primary'), ml: 0.5 }} onClick={() => handleManualConfirm(r)}><VerifiedIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Reportar Short Pick">
                              <IconButton size="small" sx={{ ...ps.actionBtn('warning'), ml: 0.5 }} onClick={() => openShortPickDialog(r)}>
                                <WarningAmberIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!paginatedMyPicks.length && (<TableRow><TableCell colSpan={8}><Typography sx={ps.emptyText}>Sin picks asignados.</Typography></TableCell></TableRow>)}
              </TableBody>
            </Table>
            <Pagination page={myPicksPage} setPage={setMyPicksPage} total={myPicksTotalPages} />
          </Paper>
        </Box>
      )}

      {/* Tab 2: Pick List for order */}
      {tab === 2 && (
        <Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ sm: 'center' }} justifyContent="space-between" spacing={1.5} sx={{ mb: 2 }}>
            <Typography variant="subtitle1" sx={{ ...ps.cellText, fontWeight: 700 }}>
              {'Lista de Picking - Orden: ' + (pickOrderId || '-')}
            </Typography>
            {/* Pick list progress summary */}
            <Stack direction="row" alignItems="center" spacing={2} sx={{ minWidth: 220 }}>
              <Box sx={{ flex: 1, ...ps.progressBar, height: 10 }}>
                <Box sx={ps.progressFill(pickListProgress.pct, pickListProgress.pct === 100 ? 'rgba(46,125,50,.65)' : 'rgba(21,101,192,.65)')} />
              </Box>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                {pickListProgress.completed}/{pickListProgress.total} ({pickListProgress.pct}%)
              </Typography>
            </Stack>
          </Stack>
          <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead><TableRow sx={ps.tableHeaderRow}>
                <TableCell sx={{ width: 50, textAlign: 'center' }}>#</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell>Qty</TableCell>
                <TableCell>Ubicacion</TableCell>
                <TableCell>Tarima</TableCell>
                <TableCell>Asignado</TableCell>
                <TableCell>Status</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {paginatedPickList.map((r, idx) => {
                  const id = r.id || r._id
                  const s = r.status || ''
                  const isConfirmed = s === 'CONFIRMADO' || s === 'COMPLETADA' || s === 'PICKED'
                  const isShort = s === 'SHORT' || s === 'CANCELADA'
                  const seq = r.sequence || (idx + 1 + (pickListPage - 1) * orderPageSize)
                  const isNextPick = !isConfirmed && !isShort && idx === paginatedPickList.findIndex(p => {
                    const ps2 = p.status || ''; return ps2 !== 'CONFIRMADO' && ps2 !== 'COMPLETADA' && ps2 !== 'PICKED' && ps2 !== 'SHORT' && ps2 !== 'CANCELADA'
                  })
                  return (
                    <TableRow key={id} sx={pickRowSx(idx, s)}>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Stack direction="row" alignItems="center" justifyContent="center" spacing={0.3}>
                          <Typography sx={{ fontWeight: 800, fontSize: 14, color: isNextPick ? (ps.isDark ? '#64B5F6' : '#1565C0') : 'text.secondary' }}>{seq}</Typography>
                          {isNextPick && <ArrowForwardIcon sx={{ fontSize: 14, color: ps.isDark ? '#64B5F6' : '#1565C0' }} />}
                        </Stack>
                      </TableCell>
                      <TableCell sx={ps.cellText}>{r.sku || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>{r.qtyRequested || r.qty || 0}</TableCell>
                      <TableCell sx={ps.cellText}>{r.location?.code || r.location || '-'}</TableCell>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.pallet?.code || r.palletCode || '-'}</TableCell>
                      <TableCell sx={ps.cellTextSecondary}>{r.assignedTo?.fullName || r.assignedTo?.email || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>
                        <Chip size="small" label={r.status || 'PENDIENTE'} sx={ps.metricChip(isConfirmed ? 'ok' : isShort ? 'bad' : 'warn')} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                        {!isConfirmed && !isShort && (
                          <>
                            <Tooltip title="Confirmar con escaneo QR">
                              <IconButton size="small" sx={ps.actionBtn('success')} onClick={() => openConfirmDialog(r)}><QrCodeScannerIcon fontSize="small" /></IconButton>
                            </Tooltip>
                            {isAdmin && (
                              <Tooltip title="Confirmar sin escaneo">
                                <IconButton size="small" sx={{ ...ps.actionBtn('primary'), ml: 0.5 }} onClick={() => handleManualConfirm(r)}><VerifiedIcon fontSize="small" /></IconButton>
                              </Tooltip>
                            )}
                            <Tooltip title="Reportar Short Pick">
                              <IconButton size="small" sx={{ ...ps.actionBtn('warning'), ml: 0.5 }} onClick={() => openShortPickDialog(r)}>
                                <WarningAmberIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!paginatedPickList.length && (<TableRow><TableCell colSpan={8}><Typography sx={ps.emptyText}>Sin items en lista de picking.</Typography></TableCell></TableRow>)}
              </TableBody>
            </Table>
            <Pagination page={pickListPage} setPage={setPickListPage} total={pickListTotalPages} />
          </Paper>
        </Box>
      )}

      {/* Completion Summary dialog */}
      <Dialog open={showSummary} onClose={() => setShowSummary(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ ...ps.pageTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
          <CheckCircleOutlineIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32' }} />
          Picking Completado
        </DialogTitle>
        <DialogContent dividers>
          {completionSummary && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Box sx={{ textAlign: 'center', py: 1 }}>
                <Typography sx={{ fontSize: 48, fontWeight: 900, color: ps.isDark ? '#86EFAC' : '#2E7D32', lineHeight: 1 }}>{completionSummary.accuracy}%</Typography>
                <Typography sx={{ fontSize: 13, color: 'text.secondary', fontWeight: 600 }}>Precisión</Typography>
              </Box>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', flex: 1 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: ps.isDark ? '#86EFAC' : '#2E7D32' }}>{completionSummary.picked}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Completados</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', flex: 1 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800, color: ps.isDark ? '#FCA5A5' : '#C62828' }}>{completionSummary.shorts}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Short Picks</Typography>
                </Paper>
              </Stack>
              <Stack direction="row" spacing={2} justifyContent="center">
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', flex: 1 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{completionSummary.totalQtyPicked}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Pzas Pickeadas</Typography>
                </Paper>
                <Paper variant="outlined" sx={{ p: 1.5, borderRadius: 2, textAlign: 'center', flex: 1 }}>
                  <Typography sx={{ fontSize: 20, fontWeight: 800 }}>{completionSummary.totalQtyReq}</Typography>
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Pzas Solicitadas</Typography>
                </Paper>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowSummary(false)}>Cerrar</Button>
          <Button variant="contained" onClick={() => { setShowSummary(false); setTab(0) }}>Volver a Órdenes</Button>
        </DialogActions>
      </Dialog>

      {/* QR Confirm dialog with success animation */}
      <Dialog open={openConfirm} onClose={() => { if (!confirming) setOpenConfirm(false) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Confirmar Pick con QR</DialogTitle>
        <DialogContent dividers>
          {confirmErr && <Alert severity="error" sx={{ mb: 2 }}>{confirmErr}</Alert>}

          {/* Success animation overlay */}
          <Collapse in={confirmSuccess}>
            <Box sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              py: 3,
            }}>
              <Fade in={confirmSuccess} timeout={400}>
                <CheckCircleOutlineIcon sx={{
                  fontSize: 64,
                  color: ps.isDark ? '#86EFAC' : '#2E7D32',
                  animation: confirmSuccess ? 'pickSuccessPulse 0.6s ease-in-out' : 'none',
                  '@keyframes pickSuccessPulse': {
                    '0%': { transform: 'scale(0.3)', opacity: 0 },
                    '50%': { transform: 'scale(1.15)' },
                    '100%': { transform: 'scale(1)', opacity: 1 },
                  },
                }} />
              </Fade>
              <Typography sx={{ mt: 1, fontWeight: 700, color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 16 }}>
                Pick confirmado exitosamente
              </Typography>
              <Typography sx={{ fontSize: 12, color: 'text.secondary', mt: 0.5 }}>
                Avanzando al siguiente pick...
              </Typography>
            </Box>
          </Collapse>

          {/* Normal confirm form */}
          <Collapse in={!confirmSuccess}>
            {confirmPick && (
              <Stack spacing={2} sx={{ pt: 1 }}>
                <Typography variant="body2" sx={ps.cellText}><b>SKU:</b> {confirmPick.sku || '-'}</Typography>
                <Typography variant="body2" sx={ps.cellText}><b>Qty:</b> {confirmPick.qty || 0}</Typography>
                <Typography variant="body2" sx={ps.cellText}><b>Ubicacion:</b> {confirmPick.location || '-'}</Typography>
                <Typography variant="body2" sx={ps.cellText}><b>Tarima esperada:</b> {confirmPick.palletCode || '-'}</Typography>
                <TextField
                  label="Escanear o ingresar codigo QR"
                  value={scanCode}
                  onChange={e => setScanCode(e.target.value)}
                  sx={ps.inputSx}
                  fullWidth
                  autoFocus
                  onKeyDown={function(e) { if (e.key === 'Enter') handleConfirm() }}
                />
              </Stack>
            )}
          </Collapse>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)} disabled={confirming}>Cancelar</Button>
          <Button
            variant="contained"
            startIcon={confirming ? <CircularProgress size={16} color="inherit" /> : <DoneIcon />}
            onClick={handleConfirm}
            disabled={confirming || confirmSuccess}
          >
            Confirmar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Short Pick Report dialog */}
      <Dialog open={openShortPick} onClose={() => { if (!shortPickSubmitting) setOpenShortPick(false) }} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ ...ps.pageTitle, display: 'flex', alignItems: 'center', gap: 1 }}>
          <WarningAmberIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100' }} />
          Reportar Short Pick
        </DialogTitle>
        <DialogContent dividers>
          {shortPickErr && <Alert severity="error" sx={{ mb: 2 }}>{shortPickErr}</Alert>}
          <Alert severity="warning" sx={{ mb: 2 }}>
            Un short pick indica que el item no fue encontrado en la ubicacion esperada. Esta accion marcara el pick como no completado.
          </Alert>
          {shortPickItem && (
            <Stack spacing={2} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>SKU:</b> {shortPickItem.sku || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Qty esperada:</b> {shortPickItem.qty || 0}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Ubicacion:</b> {shortPickItem.location || '-'}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Tarima:</b> {shortPickItem.palletCode || '-'}</Typography>
              <TextField
                select
                label="Razon del short pick"
                value={shortPickReason}
                onChange={e => setShortPickReason(e.target.value)}
                sx={ps.inputSx}
                fullWidth
              >
                <MenuItem value="NO_ENCONTRADO">Producto no encontrado en ubicacion</MenuItem>
                <MenuItem value="CANTIDAD_INSUFICIENTE">Cantidad insuficiente</MenuItem>
                <MenuItem value="UBICACION_VACIA">Ubicacion vacia</MenuItem>
                <MenuItem value="PRODUCTO_DANADO">Producto danado</MenuItem>
                <MenuItem value="ETIQUETA_ILEGIBLE">Etiqueta ilegible</MenuItem>
                <MenuItem value="OTRO">Otro</MenuItem>
              </TextField>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenShortPick(false)} disabled={shortPickSubmitting}>Cancelar</Button>
          <Button
            variant="contained"
            color="warning"
            startIcon={shortPickSubmitting ? <CircularProgress size={16} color="inherit" /> : <ReportProblemIcon />}
            onClick={handleShortPick}
            disabled={shortPickSubmitting}
          >
            Reportar Short Pick
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
