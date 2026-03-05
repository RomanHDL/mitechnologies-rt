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
import Divider from '@mui/material/Divider'

import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import DeleteIcon from '@mui/icons-material/Delete'
import InfoIcon from '@mui/icons-material/Info'
import DownloadIcon from '@mui/icons-material/Download'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import AddIcon from '@mui/icons-material/Add'

import * as XLSX from 'xlsx'

/**
 * Tu backend ahora ya devuelve status UI (PENDIENTE/COMPLETADA/CANCELADA),
 * pero por si llega algo DB, lo normalizamos aquí igual (NO rompe nada).
 */
function normalizeStatus(s) {
  const x = String(s || '').toUpperCase().trim()
  if (x === 'PENDING_PICK' || x === 'DRAFT' || x === 'PICKED') return 'PENDIENTE'
  if (x === 'SHIPPED') return 'COMPLETADA'
  if (x === 'CANCELLED') return 'CANCELADA'
  if (x === 'OUT' || x === 'IN_STOCK') return x
  // si ya viene UI:
  if (x === 'PENDIENTE' || x === 'COMPLETADA' || x === 'CANCELADA') return x
  return x || 'PENDIENTE'
}

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

  // surtir orden (fulfill)
  const [openFulfill, setOpenFulfill] = useState(false)
  const [fulfillOrder, setFulfillOrder] = useState(null)
  const [palletCode, setPalletCode] = useState('')
  const [palletsSelected, setPalletsSelected] = useState([])
  const [fulfillNote, setFulfillNote] = useState('')
  const [fulfillErr, setFulfillErr] = useState('')
  const [fulfilling, setFulfilling] = useState(false)

  const load = async () => {
    const res = await client.get('/api/orders')
    const list = Array.isArray(res.data) ? res.data : []
    setRows(list)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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

    return list
  }, [rows, q, status])

  const resumen = useMemo(() => {
    const list = filtered
    return {
      total: list.length,
      pendientes: list.filter(r => normalizeStatus(r.status) === 'PENDIENTE').length,
      completadas: list.filter(r => normalizeStatus(r.status) === 'COMPLETADA').length,
      canceladas: list.filter(r => normalizeStatus(r.status) === 'CANCELADA').length
    }
  }, [filtered])

  // export excel
  const exportExcel = () => {
    const data = filtered.map(r => ({
      Orden: r.orderNumber,
      Destino: r.destinationType + (r.destinationRef ? ` · ${r.destinationRef}` : ''),
      Status: normalizeStatus(r.status),
      Lineas: (r.lines || []).map(l => `${l.sku}(${l.qty})`).join(', '),
      Creo: r.createdBy?.email || ''
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

  // paginación
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const safePage = Math.min(Math.max(page, 1), totalPages)
    const start = (safePage - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

  useEffect(() => {
    // si filtras y se reduce pages, evita quedarte “fuera”
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
        setFulfillErr('Tarima inválida')
        return
      }

      // evitar duplicados
      const exists = palletsSelected.some(x => x.id === p.id)
      if (exists) {
        setFulfillErr('Esa tarima ya está agregada')
        return
      }

      if (String(p.status || '').toUpperCase() !== 'IN_STOCK') {
        setFulfillErr(`Tarima ${p.code} no está disponible (status: ${p.status})`)
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

      {/* Resumen */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Total: ${resumen.total}`} sx={ps.metricChip('info')} />
        <Chip label={`Pendientes: ${resumen.pendientes}`} sx={ps.metricChip('warn')} />
        <Chip label={`Completadas: ${resumen.completadas}`} sx={ps.metricChip('ok')} />
        <Chip label={`Canceladas: ${resumen.canceladas}`} sx={ps.metricChip('bad')} />
      </Stack>

      {/* Filtros */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar orden, destino o usuario"
          value={q}
          onChange={e => setQ(e.target.value)}
          sx={{ ...ps.inputSx, minWidth: 260 }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={e => setStatus(e.target.value)}
          sx={{ ...ps.inputSx, minWidth: 180 }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="PENDIENTE">Pendiente</MenuItem>
          <MenuItem value="COMPLETADA">Completada</MenuItem>
          <MenuItem value="CANCELADA">Cancelada</MenuItem>
        </TextField>
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: { xs: 700, md: 1050 } }}>
          <TableHead>
            <TableRow sx={ps.tableHeaderRow}>
              <TableCell>Orden</TableCell>
              <TableCell>Destino</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Lineas</TableCell>
              <TableCell>Creo</TableCell>
              <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {paginated.map((r, idx) => {
              const st = normalizeStatus(r.status)
              const disabledDone = st === 'COMPLETADA' || st === 'CANCELADA'
              const disabledCancel = st === 'COMPLETADA' || st === 'CANCELADA'
              const canFulfill = st === 'PENDIENTE'

              return (
                <TableRow key={r.id || r._id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace' }}>{r.orderNumber}</TableCell>
                  <TableCell sx={ps.cellText}>
                    {r.destinationType} {r.destinationRef ? ` · ${r.destinationRef}` : ''}
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={st} sx={ps.statusChip(st)} />
                  </TableCell>
                  <TableCell sx={ps.cellText}>
                    {(r.lines || []).map(l => `${l.sku}(${l.qty})`).join(', ')}
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.createdBy?.email || '—'}</TableCell>

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

                    <Tooltip title="Marcar como completada">
                      <span>
                        <IconButton
                          size="small"
                          sx={ps.actionBtn('success')}
                          onClick={() => markCompleted(r.id || r._id)}
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
                          onClick={() => markCancelled(r.id || r._id)}
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
                          onClick={() => deleteOrder(r.id || r._id)}
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
                <TableCell colSpan={6}>
                  <Typography sx={ps.emptyText}>Sin ordenes para mostrar.</Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>

        {/* Paginación */}
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
              <Typography variant="body2" sx={ps.cellText}><b>Destino:</b> {selected.destinationType} {selected.destinationRef ? ` · ${selected.destinationRef}` : ''}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Status:</b> <Chip size="small" label={normalizeStatus(selected.status)} sx={ps.statusChip(normalizeStatus(selected.status))} /></Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Lineas:</b> {(selected.lines || []).map(l => `${l.sku}(${l.qty})`).join(', ')}</Typography>
              <Typography variant="body2" sx={ps.cellText}><b>Notas:</b> {selected.notes || '—'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Creo:</b> {selected.createdBy?.email || '—'}</Typography>
              <Typography variant="body2" sx={ps.cellTextSecondary}><b>Tarimas:</b> {(selected.pallets || []).length ? (selected.pallets || []).join(', ') : '—'}</Typography>
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
            <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} sx={ps.inputSx} />
            <TextField label="Qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} sx={ps.inputSx} />
            <TextField label="Notas" value={notes} onChange={(e) => setNotes(e.target.value)} sx={ps.inputSx} />
            <Alert severity="info">
              Puedes crear la orden y luego surtirla con el botón 🚚 (Fulfill) agregando tarimas por código.
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
            <b>Orden:</b> {fulfillOrder?.orderNumber || '—'}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ mb: 1.5 }}>
            <TextField
              label="Código de tarima"
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
                      Status: {p.status} {p.location ? `| Ubicación: ${p.location.code || `${p.location.area}-${p.location.level}${p.location.position}`}` : ''}
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
                Agrega tarimas por código para surtir la orden.
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
    </Box>
  )
}
