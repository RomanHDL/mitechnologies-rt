import React, { useEffect, useMemo, useState } from 'react'
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

import ListAltIcon from '@mui/icons-material/ListAlt'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import InfoIcon from '@mui/icons-material/Info'
import DoneIcon from '@mui/icons-material/Done'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import AssignmentIcon from '@mui/icons-material/Assignment'

import dayjs from 'dayjs'

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
    setOpenConfirm(true)
  }

  const handleConfirm = async () => {
    setConfirmErr('')
    if (!scanCode.trim()) { setConfirmErr('Escanea o ingresa el codigo QR'); return }
    if (!confirmPick) return
    try {
      await client.patch('/api/picking/' + (confirmPick.id || confirmPick._id) + '/confirm', { scannedCode: scanCode })
      setOpenConfirm(false)
      if (pickOrderId) await loadPickList(pickOrderId)
      await loadMyPicks()
    } catch (e) { setConfirmErr(e?.response?.data?.message || 'Error al confirmar') }
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
                <TableCell>Destino</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Lineas</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acciones</TableCell>
              </TableRow></TableHead>
              <TableBody>
                {paginatedOrders.map((r, idx) => {
                  const id = r.id || r._id
                  return (
                    <TableRow key={id} sx={ps.tableRow(idx)}>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.orderNumber || id}</TableCell>
                      <TableCell sx={ps.cellText}>{(r.destinationType || '') + (r.destinationRef ? ' - ' + r.destinationRef : '')}</TableCell>
                      <TableCell sx={ps.cellText}><Chip size="small" label={r.status || 'PENDIENTE'} sx={ps.statusChip(r.status || 'PENDIENTE')} /></TableCell>
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
                {!paginatedOrders.length && (<TableRow><TableCell colSpan={5}><Typography sx={ps.emptyText}>Sin ordenes para mostrar.</Typography></TableCell></TableRow>)}
              </TableBody>
            </Table>
            <Pagination page={orderPage} setPage={setOrderPage} total={orderTotalPages} />
          </Paper>
        </Box>
      )}

      {/* Tab 1: My Picks */}
      {tab === 1 && (
        <Box>
          <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead><TableRow sx={ps.tableHeaderRow}>
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
                  const isConfirmed = (r.status || '') === 'CONFIRMADO'
                  return (
                    <TableRow key={id} sx={ps.tableRow(idx)}>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.orderNumber || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>{r.sku || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>{r.qty || 0}</TableCell>
                      <TableCell sx={ps.cellText}>{r.location || '-'}</TableCell>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.palletCode || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>
                        <Chip size="small" label={r.status || 'PENDIENTE'} sx={ps.metricChip(isConfirmed ? 'ok' : 'warn')} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {!isConfirmed && (
                          <Tooltip title="Confirmar con escaneo QR">
                            <IconButton size="small" sx={ps.actionBtn('success')} onClick={() => openConfirmDialog(r)}><QrCodeScannerIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!paginatedMyPicks.length && (<TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin picks asignados.</Typography></TableCell></TableRow>)}
              </TableBody>
            </Table>
            <Pagination page={myPicksPage} setPage={setMyPicksPage} total={myPicksTotalPages} />
          </Paper>
        </Box>
      )}

      {/* Tab 2: Pick List for order */}
      {tab === 2 && (
        <Box>
          <Typography variant="subtitle1" sx={{ ...ps.cellText, mb: 2, fontWeight: 700 }}>
            {'Lista de Picking - Orden: ' + (pickOrderId || '-')}
          </Typography>
          <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
            <Table size="small" sx={{ minWidth: 700 }}>
              <TableHead><TableRow sx={ps.tableHeaderRow}>
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
                  const isConfirmed = (r.status || '') === 'CONFIRMADO'
                  return (
                    <TableRow key={id} sx={ps.tableRow(idx)}>
                      <TableCell sx={ps.cellText}>{r.sku || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>{r.qty || 0}</TableCell>
                      <TableCell sx={ps.cellText}>{r.location || '-'}</TableCell>
                      <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.palletCode || '-'}</TableCell>
                      <TableCell sx={ps.cellTextSecondary}>{r.assignedTo?.email || '-'}</TableCell>
                      <TableCell sx={ps.cellText}>
                        <Chip size="small" label={r.status || 'PENDIENTE'} sx={ps.metricChip(isConfirmed ? 'ok' : 'warn')} />
                      </TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        {!isConfirmed && (
                          <Tooltip title="Confirmar con escaneo QR">
                            <IconButton size="small" sx={ps.actionBtn('success')} onClick={() => openConfirmDialog(r)}><QrCodeScannerIcon fontSize="small" /></IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
                {!paginatedPickList.length && (<TableRow><TableCell colSpan={7}><Typography sx={ps.emptyText}>Sin items en lista de picking.</Typography></TableCell></TableRow>)}
              </TableBody>
            </Table>
            <Pagination page={pickListPage} setPage={setPickListPage} total={pickListTotalPages} />
          </Paper>
        </Box>
      )}

      {/* QR Confirm dialog */}
      <Dialog open={openConfirm} onClose={() => setOpenConfirm(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Confirmar Pick con QR</DialogTitle>
        <DialogContent dividers>
          {confirmErr && <Alert severity="error" sx={{ mb: 2 }}>{confirmErr}</Alert>}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenConfirm(false)}>Cancelar</Button>
          <Button variant="contained" startIcon={<DoneIcon />} onClick={handleConfirm}>Confirmar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
