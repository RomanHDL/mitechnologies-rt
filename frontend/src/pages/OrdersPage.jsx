import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'
import dayjs from 'dayjs'

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
import Divider from '@mui/material/Divider'
import Grid from '@mui/material/Grid'
import CircularProgress from '@mui/material/CircularProgress'
import LinearProgress from '@mui/material/LinearProgress'
import Autocomplete from '@mui/material/Autocomplete'

import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import DownloadIcon from '@mui/icons-material/Download'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import AddIcon from '@mui/icons-material/Add'
import AssignmentIcon from '@mui/icons-material/Assignment'
import VisibilityIcon from '@mui/icons-material/Visibility'
import FactoryIcon from '@mui/icons-material/Factory'
import PersonIcon from '@mui/icons-material/Person'
import MoreHorizIcon from '@mui/icons-material/MoreHoriz'
import InventoryIcon from '@mui/icons-material/Inventory'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'

import * as XLSX from 'xlsx'

/**
 * Normalize backend status values to UI labels.
 */
function normalizeStatus(s) {
  const x = String(s || '').toUpperCase().trim()
  if (x === 'PENDING_PICK' || x === 'DRAFT' || x === 'PICKED') return 'PENDIENTE'
  if (x === 'SHIPPED') return 'COMPLETADA'
  if (x === 'CANCELLED') return 'CANCELADA'
  if (x === 'OUT' || x === 'IN_STOCK') return x
  if (x === 'PENDIENTE' || x === 'COMPLETADA' || x === 'CANCELADA') return x
  return x || 'PENDIENTE'
}

const DEST_LABELS = {
  PRODUCTION: { label: 'Produccion', icon: FactoryIcon },
  CLIENT: { label: 'Cliente', icon: PersonIcon },
  OTHER: { label: 'Otro', icon: MoreHorizIcon },
}

const STATUS_FILTERS = [
  { value: '', label: 'TODAS' },
  { value: 'PENDIENTE', label: 'PENDIENTE' },
  { value: 'COMPLETADA', label: 'COMPLETADA' },
  { value: 'CANCELADA', label: 'CANCELADA' },
]

const DATE_FILTERS = [
  { value: 'all', label: 'Todas' },
  { value: 'today', label: 'Hoy' },
  { value: 'week', label: 'Esta Semana' },
  { value: 'month', label: 'Este Mes' },
]

export default function OrdersPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()

  const canCreate =
    user?.role === 'ADMIN' ||
    user?.role === 'SUPERVISOR' ||
    ['Supervisor', 'Coordinador', 'Gerente'].includes((user?.position || '').trim())

  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [dateFilter, setDateFilter] = useState('all')
  const [page, setPage] = useState(1)
  const pageSize = 10

  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)

  // crear orden
  const [openCreate, setOpenCreate] = useState(false)
  const [destType, setDestType] = useState('PRODUCTION')
  const [destRef, setDestRef] = useState('P1')
  const [sku, setSku] = useState('TV-55-4K')
  const [qty, setQty] = useState(1)
  const [notes, setNotes] = useState('')
  const [err, setErr] = useState('')

  // product search for create dialog
  const [productOptions, setProductOptions] = useState([])
  const [productLoading, setProductLoading] = useState(false)
  const productSearchTimer = useRef(null)

  // surtir orden (fulfill)
  const [openFulfill, setOpenFulfill] = useState(false)
  const [fulfillOrder, setFulfillOrder] = useState(null)
  const [palletCode, setPalletCode] = useState('')
  const [palletsSelected, setPalletsSelected] = useState([])
  const [fulfillNote, setFulfillNote] = useState('')
  const [fulfillErr, setFulfillErr] = useState('')
  const [fulfilling, setFulfilling] = useState(false)

  // picking
  const [generatingPicking, setGeneratingPicking] = useState(null)
  const [showPicking, setShowPicking] = useState(false)
  const [pickingOrder, setPickingOrder] = useState(null)
  const [pickTasks, setPickTasks] = useState([])
  const [pickingLoading, setPickingLoading] = useState(false)

  const load = async () => {
    const res = await client.get('/api/orders')
    const list = Array.isArray(res.data) ? res.data : []
    setRows(list)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // product autocomplete search
  const searchProducts = useCallback((query) => {
    if (productSearchTimer.current) clearTimeout(productSearchTimer.current)
    const term = String(query || '').trim()
    if (term.length < 2) {
      setProductOptions([])
      return
    }
    setProductLoading(true)
    productSearchTimer.current = setTimeout(async () => {
      try {
        const res = await client.get('/api/products', { params: { q: term } })
        const list = Array.isArray(res.data) ? res.data : (res.data?.rows || [])
        setProductOptions(list)
      } catch {
        setProductOptions([])
      } finally {
        setProductLoading(false)
      }
    }, 350)
  }, [client])

  const create = async () => {
    setErr('')
    try {
      await client.post('/api/orders', {
        destinationType: destType,
        destinationRef: destRef,
        notes,
        lines: [{ sku, qty: Number(qty), description: '' }]
      })
      setOpenCreate(false)
      setNotes('')
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Error')
    }
  }

  // filtros
  const filtered = useMemo(() => {
    let list = rows.map(r => ({ ...r, status: normalizeStatus(r.status) }))

    if (q) {
      const qq = q.toLowerCase()
      list = list.filter(r =>
        (r.orderNumber || '').toLowerCase().includes(qq) ||
        (r.destinationType || '').toLowerCase().includes(qq) ||
        (r.destinationRef || '').toLowerCase().includes(qq) ||
        (r.createdBy?.email || '').toLowerCase().includes(qq)
      )
    }

    if (status) {
      const st = normalizeStatus(status)
      list = list.filter(r => normalizeStatus(r.status) === st)
    }

    // date filter
    if (dateFilter !== 'all') {
      const now = dayjs()
      list = list.filter(r => {
        const d = dayjs(r.createdAt)
        if (!d.isValid()) return false
        if (dateFilter === 'today') return d.isSame(now, 'day')
        if (dateFilter === 'week') return d.isSame(now, 'week')
        if (dateFilter === 'month') return d.isSame(now, 'month')
        return true
      })
    }

    return list
  }, [rows, q, status, dateFilter])

  // KPI computed from ALL rows (not filtered)
  const kpis = useMemo(() => {
    const all = rows.map(r => normalizeStatus(r.status))
    return {
      total: all.length,
      pendientes: all.filter(s => s === 'PENDIENTE').length,
      completadas: all.filter(s => s === 'COMPLETADA').length,
      canceladas: all.filter(s => s === 'CANCELADA').length,
    }
  }, [rows])

  // export excel
  const exportExcel = () => {
    const data = filtered.map(r => ({
      Orden: r.orderNumber,
      'Tipo Destino': r.destinationType,
      Referencia: r.destinationRef || '',
      Status: normalizeStatus(r.status),
      Lineas: (r.lines || []).map(l => `${l.sku}(${l.qty})`).join(', '),
      Creo: r.createdBy?.email || '',
      Fecha: r.createdAt ? dayjs(r.createdAt).format('YYYY-MM-DD HH:mm') : '',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Ordenes')
    XLSX.writeFile(wb, 'ordenes_salida.xlsx')
  }

  // acciones status
  const markCompleted = async (id) => {
    await client.patch(`/api/orders/${id}/status`, { status: 'COMPLETADA' })
    await load()
  }
  const markCancelled = async (id) => {
    await client.patch(`/api/orders/${id}/status`, { status: 'CANCELADA' })
    await load()
  }
  const deleteOrder = async (id) => {
    await client.delete(`/api/orders/${id}`)
    await load()
  }

  // generar picking
  const generatePicking = async (order) => {
    const oid = order.id || order._id
    setGeneratingPicking(oid)
    try {
      await client.post(`/api/picking/generate/${oid}`)
      await load()
    } catch (e) {
      // silently fail or could show snackbar
      console.error('Error generando picking:', e?.response?.data?.message || e.message)
    } finally {
      setGeneratingPicking(null)
    }
  }

  // ver picking
  const viewPicking = async (order) => {
    const oid = order.id || order._id
    setPickingOrder(order)
    setPickTasks([])
    setPickingLoading(true)
    setShowPicking(true)
    try {
      const res = await client.get(`/api/picking/order/${oid}`)
      const list = Array.isArray(res.data) ? res.data : (res.data?.tasks || [])
      setPickTasks(list)
    } catch {
      setPickTasks([])
    } finally {
      setPickingLoading(false)
    }
  }

  // paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => {
    if (page > totalPages) setPage(totalPages)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalPages])

  // detalle
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => setShowDetail(false)

  // fulfill UI
  const openFulfillDialog = (order) => {
    setFulfillErr('')
    setFulfilling(false)
    setFulfillOrder(order)
    setPalletCode('')
    setPalletsSelected([])
    setFulfillNote('')
    setOpenFulfill(true)
  }

  const addPalletByCode = async () => {
    setFulfillErr('')
    const code = String(palletCode || '').trim()
    if (!code) return

    try {
      const res = await client.get('/api/pallets/by-code', { params: { code } })
      const p = res.data

      if (!p?.id) {
        setFulfillErr('Tarima invalida')
        return
      }

      const exists = palletsSelected.some(x => x.id === p.id)
      if (exists) {
        setFulfillErr('Esa tarima ya esta agregada')
        return
      }

      if (String(p.status || '').toUpperCase() !== 'IN_STOCK') {
        setFulfillErr(`Tarima ${p.code} no esta disponible (status: ${p.status})`)
        return
      }

      setPalletsSelected(prev => [...prev, p])
      setPalletCode('')
    } catch (e) {
      setFulfillErr(e?.response?.data?.message || 'No encontrado')
    }
  }

  const removePallet = (id) => {
    setPalletsSelected(prev => prev.filter(p => p.id !== id))
  }

  const doFulfill = async () => {
    if (!fulfillOrder?.id) return
    setFulfillErr('')
    setFulfilling(true)
    try {
      const palletIds = palletsSelected.map(p => p.id)
      if (!palletIds.length) {
        setFulfillErr('Agrega al menos 1 tarima')
        setFulfilling(false)
        return
      }

      await client.post(`/api/orders/${fulfillOrder.id}/fulfill`, {
        palletIds,
        note: fulfillNote || ''
      })

      setOpenFulfill(false)
      await load()
    } catch (e) {
      setFulfillErr(e?.response?.data?.message || 'Error al surtir')
    } finally {
      setFulfilling(false)
    }
  }

  // helper: destination display
  const DestLabel = ({ type, refVal }) => {
    const info = DEST_LABELS[type] || DEST_LABELS.OTHER
    const Icon = info.icon
    return (
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Icon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography variant="body2" sx={ps.cellText}>
          {info.label}{refVal ? ` · ${refVal}` : ''}
        </Typography>
      </Stack>
    )
  }

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Typography variant="h6" sx={{ ...ps.pageTitle }}>Ordenes de salida</Typography>

        <Stack direction="row" spacing={1}>
          <Tooltip title={canCreate ? 'Crear orden' : 'No autorizado'}>
            <span>
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => setOpenCreate(true)}
                disabled={!canCreate}
                sx={{ borderRadius: 2 }}
              >
                Crear
              </Button>
            </span>
          </Tooltip>

          <Tooltip title="Exportar a Excel">
            <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2.5 }}>
        {[
          { label: 'Total Ordenes', value: kpis.total, accent: 'blue', icon: <InventoryIcon sx={{ fontSize: 28 }} /> },
          { label: 'Pendientes', value: kpis.pendientes, accent: 'amber', icon: <PendingActionsIcon sx={{ fontSize: 28 }} /> },
          { label: 'Completadas', value: kpis.completadas, accent: 'green', icon: <CheckCircleIcon sx={{ fontSize: 28 }} /> },
          { label: 'Canceladas', value: kpis.canceladas, accent: 'red', icon: <BlockIcon sx={{ fontSize: 28 }} /> },
        ].map(kpi => (
          <Grid item xs={6} md={3} key={kpi.label}>
            <Paper elevation={0} sx={ps.kpiCard(kpi.accent)}>
              <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                <Box>
                  <Typography variant="caption" sx={{ ...ps.pageSubtitle, textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    {kpi.label}
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', mt: 0.5 }}>
                    {kpi.value}
                  </Typography>
                </Box>
                <Box sx={{ color: 'text.secondary', opacity: 0.5 }}>{kpi.icon}</Box>
              </Stack>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Status filter chips */}
      <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map(sf => {
          const active = status === sf.value
          return (
            <Chip
              key={sf.value}
              label={sf.label}
              variant={active ? 'filled' : 'outlined'}
              onClick={() => { setStatus(sf.value); setPage(1) }}
              sx={{
                fontWeight: 700,
                cursor: 'pointer',
                ...(active && sf.value === '' && { bgcolor: 'primary.main', color: '#fff' }),
                ...(active && sf.value === 'PENDIENTE' && ps.statusChip('PENDIENTE')),
                ...(active && sf.value === 'COMPLETADA' && ps.statusChip('COMPLETADA')),
                ...(active && sf.value === 'CANCELADA' && ps.statusChip('CANCELADA')),
              }}
            />
          )
        })}

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Date filter chips */}
        {DATE_FILTERS.map(df => {
          const active = dateFilter === df.value
          return (
            <Chip
              key={df.value}
              label={df.label}
              size="small"
              variant={active ? 'filled' : 'outlined'}
              onClick={() => { setDateFilter(df.value); setPage(1) }}
              sx={{
                fontWeight: 600,
                cursor: 'pointer',
                ...(active && { bgcolor: 'primary.main', color: '#fff' }),
              }}
            />
          )
        })}
      </Stack>

      {/* Search */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar orden, destino o usuario"
          value={q}
          onChange={e => setQ(e.target.value)}
          sx={{ ...ps.inputSx, minWidth: 260 }}
        />
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: { xs: 700, md: 1100 } }}>
          <TableHead>
            <TableRow sx={ps.tableHeaderRow}>
              <TableCell>Orden</TableCell>
              <TableCell>Destino</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Lineas</TableCell>
              <TableCell>Creo</TableCell>
              <TableCell>Fecha</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginated.map((r, idx) => {
              const st = normalizeStatus(r.status)
              const disabledDone = st === 'COMPLETADA' || st === 'CANCELADA'
              const disabledCancel = st === 'COMPLETADA' || st === 'CANCELADA'
              const canFulfill = st === 'PENDIENTE'
              const rid = r.id || r._id

              return (
                <TableRow key={rid} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.orderNumber}</TableCell>
                  <TableCell sx={ps.cellText}>
                    <DestLabel type={r.destinationType} refVal={r.destinationRef} />
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={st} sx={ps.statusChip(st)} />
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    {(r.lines || []).map(l => `${l.sku}(${l.qty})`).join(', ')}
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.createdBy?.email || '\u2014'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>
                    {r.createdAt ? dayjs(r.createdAt).format('DD/MM/YY HH:mm') : '\u2014'}
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Surtir (fulfill)">
                      <span>
                        <IconButton
                          size="small"
                          sx={ps.actionBtn('warning')}
                          onClick={() => openFulfillDialog(r)}
                          disabled={!canCreate || !canFulfill}
                        >
                          <LocalShippingIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Generar Picking">
                      <span>
                        <IconButton
                          size="small"
                          sx={ps.actionBtn('primary')}
                          onClick={() => generatePicking(r)}
                          disabled={!canFulfill || generatingPicking === rid}
                        >
                          {generatingPicking === rid
                            ? <CircularProgress size={16} />
                            : <AssignmentIcon fontSize="small" />}
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Ver Picking">
                      <span>
                        <IconButton
                          size="small"
                          sx={ps.actionBtn('primary')}
                          onClick={() => viewPicking(r)}
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Marcar como completada">
                      <span>
                        <IconButton
                          size="small"
                          sx={ps.actionBtn('success')}
                          onClick={() => markCompleted(rid)}
                          disabled={disabledDone || !canCreate}
                        >
                          <DoneIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Cancelar">
                      <span>
                        <IconButton
                          size="small"
                          sx={ps.actionBtn('error')}
                          onClick={() => markCancelled(rid)}
                          disabled={disabledCancel || !canCreate}
                        >
                          <CancelIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>

                    <Tooltip title="Eliminar">
                      <span>
                        <IconButton
                          size="small"
                          sx={ps.actionBtn('error')}
                          onClick={() => deleteOrder(rid)}
                          disabled={!canCreate}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}

            {!paginated.length && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography sx={ps.emptyText}>Sin ordenes para mostrar.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Paginacion */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Typography sx={ps.cellText}>Pagina {page} de {totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* Modal detalle */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Detalle de orden</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <Typography variant="body2" sx={ps.cellText}><b>Orden:</b> {selected.orderNumber}</Typography>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Destino:</b>{' '}
                {(DEST_LABELS[selected.destinationType] || DEST_LABELS.OTHER).label}
                {selected.destinationRef ? ` · ${selected.destinationRef}` : ''}
              </Typography>
              <Typography variant="body2" sx={ps.cellText}>
                <b>Status:</b>{' '}
                <Chip size="small" label={normalizeStatus(selected.status)} sx={ps.statusChip(normalizeStatus(selected.status))} />
              </Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Notas:</b> {selected.notes || '\u2014'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creo:</b> {selected.createdBy?.email || '\u2014'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}>
                <b>Fecha:</b> {selected.createdAt ? dayjs(selected.createdAt).format('DD/MM/YYYY HH:mm') : '\u2014'}
              </Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}>
                <b>Tarimas:</b> {(selected.pallets || []).length ? (selected.pallets || []).join(', ') : '\u2014'}
              </Typography>

              {/* Order lines table */}
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Lineas de la orden</Typography>

              {(selected.lines || []).length > 0 ? (
                <Table size="small">
                  <TableHead>
                    <TableRow sx={ps.tableHeaderRow}>
                      <TableCell>SKU</TableCell>
                      <TableCell sx={{ textAlign: 'right' }}>Cantidad Solicitada</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {(selected.lines || []).map((l, i) => (
                      <TableRow key={i} sx={ps.tableRow(i)}>
                        <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{l.sku}</TableCell>
                        <TableCell sx={{ ...ps.cellText, textAlign: 'right', fontWeight: 700 }}>{l.qty}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <Typography variant="body2" sx={ps.cellTextSecondary}>Sin lineas.</Typography>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog crear orden */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Crear orden de salida</DialogTitle>
        <DialogContent>
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField select label="Destino" value={destType} onChange={(e) => setDestType(e.target.value)} sx={ps.inputSx}>
              <MenuItem value="PRODUCTION">Produccion</MenuItem>
              <MenuItem value="CLIENT">Cliente</MenuItem>
              <MenuItem value="OTHER">Otro</MenuItem>
            </TextField>
            <TextField label="Referencia (P1/Cliente/Orden)" value={destRef} onChange={(e) => setDestRef(e.target.value)} sx={ps.inputSx} />

            {/* Product autocomplete */}
            <Autocomplete
              freeSolo
              options={productOptions}
              getOptionLabel={(opt) => typeof opt === 'string' ? opt : (opt.sku || opt.name || '')}
              inputValue={sku}
              onInputChange={(_e, val) => {
                setSku(val)
                searchProducts(val)
              }}
              onChange={(_e, val) => {
                if (val && typeof val === 'object') {
                  setSku(val.sku || val.name || '')
                }
              }}
              loading={productLoading}
              renderOption={(props, option) => (
                <li {...props} key={option.id || option.sku}>
                  <Stack>
                    <Typography variant="body2" sx={{ fontWeight: 700, fontFamily: 'monospace' }}>
                      {option.sku}
                    </Typography>
                    {option.name && (
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {option.name}
                      </Typography>
                    )}
                  </Stack>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="SKU (buscar producto)"
                  sx={ps.inputSx}
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {productLoading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
            />

            <TextField label="Qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} sx={ps.inputSx} />
            <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} sx={ps.inputSx} />
            <Alert severity="info">
              Puedes crear la orden y luego surtirla con el boton de Fulfill agregando tarimas por codigo.
            </Alert>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button disabled={!canCreate} variant="contained" onClick={create}>Guardar</Button>
        </DialogActions>
      </Dialog>

      {/* Dialog surtir (fulfill) */}
      <Dialog open={openFulfill} onClose={() => setOpenFulfill(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Surtir orden (Fulfill)</DialogTitle>
        <DialogContent dividers>
          {fulfillErr && <Alert severity="error" sx={{ mb: 2 }}>{fulfillErr}</Alert>}

          <Typography variant="body2" sx={{ mb: 1 }}>
            <b>Orden:</b> {fulfillOrder?.orderNumber || '\u2014'}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
            <TextField
              label="Codigo de tarima"
              value={palletCode}
              onChange={(e) => setPalletCode(e.target.value)}
              sx={{ ...ps.inputSx, flex: 1 }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addPalletByCode()
              }}
            />
            <Button variant="contained" onClick={addPalletByCode}>Agregar</Button>
          </Stack>

          <TextField
            label="Nota de surtido (opcional)"
            value={fulfillNote}
            onChange={(e) => setFulfillNote(e.target.value)}
            sx={{ ...ps.inputSx, mb: 2 }}
            fullWidth
          />

          <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1 }}>
            Tarimas seleccionadas ({palletsSelected.length})
          </Typography>

          <Stack spacing={1}>
            {palletsSelected.map((p) => (
              <Paper key={p.id} variant="outlined" sx={{ p: 1.2, borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                  <Box>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900 }}>
                      {p.code}
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                      Status: {p.status} {p.location ? `| Ubicacion: ${p.location.code || `${p.location.area}-${p.location.level}${p.location.position}`}` : ''}
                    </Typography>
                  </Box>

                  <Button size="small" color="error" onClick={() => removePallet(p.id)}>
                    Quitar
                  </Button>
                </Stack>
              </Paper>
            ))}

            {!palletsSelected.length && (
              <Typography sx={{ color: 'text.secondary' }}>
                Agrega tarimas por codigo para surtir la orden.
              </Typography>
            )}
          </Stack>

          <Alert severity="info" sx={{ mt: 2 }}>
            Al surtir: las tarimas pasan a <b>OUT</b> y se crea un movimiento <b>OUT</b> por cada tarima.
          </Alert>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenFulfill(false)}>Cerrar</Button>
          <Button disabled={!palletsSelected.length || fulfilling || !canCreate} variant="contained" onClick={doFulfill}>
            {fulfilling ? 'Surtendo...' : 'Confirmar surtido'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog ver picking */}
      <Dialog open={showPicking} onClose={() => setShowPicking(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={ps.pageTitle}>
          Picking &mdash; {pickingOrder?.orderNumber || ''}
        </DialogTitle>
        <DialogContent dividers>
          {pickingLoading && (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <CircularProgress />
              <Typography sx={{ mt: 1, color: 'text.secondary' }}>Cargando tareas de picking...</Typography>
            </Box>
          )}

          {!pickingLoading && pickTasks.length === 0 && (
            <Typography sx={ps.emptyText}>No hay tareas de picking para esta orden.</Typography>
          )}

          {!pickingLoading && pickTasks.length > 0 && (() => {
            const total = pickTasks.length
            const completed = pickTasks.filter(t =>
              String(t.status || '').toUpperCase() === 'COMPLETED' ||
              String(t.status || '').toUpperCase() === 'DONE'
            ).length
            const pct = total > 0 ? Math.round((completed / total) * 100) : 0

            return (
              <Stack spacing={2}>
                {/* Progress summary */}
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      Progreso: {completed} / {total} tareas
                    </Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>
                      {pct}%
                    </Typography>
                  </Stack>
                  <Box sx={ps.progressBar}>
                    <Box sx={ps.progressFill(pct)} />
                  </Box>
                </Paper>

                {/* Tasks table */}
                <Table size="small">
                  <TableHead>
                    <TableRow sx={ps.tableHeaderRow}>
                      <TableCell>#</TableCell>
                      <TableCell>SKU</TableCell>
                      <TableCell>Cantidad</TableCell>
                      <TableCell>Ubicacion</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Asignado</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {pickTasks.map((t, i) => {
                      const ts = String(t.status || '').toUpperCase()
                      const isDone = ts === 'COMPLETED' || ts === 'DONE'
                      return (
                        <TableRow key={t.id || i} sx={ps.tableRow(i)}>
                          <TableCell sx={ps.cellTextSecondary}>{i + 1}</TableCell>
                          <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{t.sku || t.productSku || '\u2014'}</TableCell>
                          <TableCell sx={ps.cellText}>{t.qty || t.quantity || '\u2014'}</TableCell>
                          <TableCell sx={ps.cellText}>{t.locationCode || t.location || '\u2014'}</TableCell>
                          <TableCell>
                            <Chip
                              size="small"
                              label={isDone ? 'COMPLETADA' : 'PENDIENTE'}
                              sx={ps.statusChip(isDone ? 'COMPLETADA' : 'PENDIENTE')}
                            />
                          </TableCell>
                          <TableCell sx={ps.cellTextSecondary}>
                            {t.assignedTo?.name || t.assignedTo?.email || '\u2014'}
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </Stack>
            )
          })()}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={() => setShowPicking(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
