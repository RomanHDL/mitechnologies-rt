import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { api } from '../services/api'
import { Html5Qrcode } from 'html5-qrcode'
import { usePageStyles } from '../ui/pageStyles'
import dayjs from 'dayjs'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import TextField from '@mui/material/TextField'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Chip from '@mui/material/Chip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import CircularProgress from '@mui/material/CircularProgress'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableBody from '@mui/material/TableBody'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import MenuItem from '@mui/material/MenuItem'
import Select from '@mui/material/Select'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'

const STATUS_OPTIONS = [
  { value: 'IN_STOCK', label: 'En Stock' },
  { value: 'QUARANTINE', label: 'Cuarentena' },
  { value: 'DAMAGED', label: 'Dañado' },
]

export default function ScanPage() {
  const { token } = useAuth()
  const client = useMemo(() => api(), [token])
  const ps = usePageStyles()
  const navigate = useNavigate()
  const [tab, setTab] = useState(0)
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [suggest, setSuggest] = useState(null)
  const [suggestErr, setSuggestErr] = useState('')
  const [error, setError] = useState('')

  /* ── Recent scans history (in-memory, last 10) ── */
  const [recentScans, setRecentScans] = useState([])

  /* ── Today's scan counter (session) ── */
  const [scanCount, setScanCount] = useState(0)

  /* ── Movement history modal ── */
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  /* ── Transfer dialog ── */
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)
  const [transferError, setTransferError] = useState('')
  const [transferSuccess, setTransferSuccess] = useState('')
  const [transferLocationId, setTransferLocationId] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [locations, setLocations] = useState([])
  const [locationsLoading, setLocationsLoading] = useState(false)

  /* ── Status change dialog ── */
  const [statusOpen, setStatusOpen] = useState(false)
  const [statusLoading, setStatusLoading] = useState(false)
  const [statusError, setStatusError] = useState('')
  const [statusSuccess, setStatusSuccess] = useState('')
  const [newStatus, setNewStatus] = useState('')
  const [statusNote, setStatusNote] = useState('')

  /* ── Outbound dialog ── */
  const [outOpen, setOutOpen] = useState(false)
  const [outLoading, setOutLoading] = useState(false)
  const [outError, setOutError] = useState('')
  const [outSuccess, setOutSuccess] = useState('')
  const [outDestType, setOutDestType] = useState('')
  const [outDestRef, setOutDestRef] = useState('')
  const [outNote, setOutNote] = useState('')

  const qrRef = useRef(null)
  const scannerRef = useRef(null)

  const addToRecent = useCallback((palletData) => {
    setRecentScans((prev) => {
      const filtered = prev.filter((s) => s.code !== palletData.code)
      const next = [{
        code: palletData.code,
        status: palletData.status,
        _id: palletData._id,
        location: palletData.location
          ? `${palletData.location.area}-${palletData.location.level}${palletData.location.position}`
          : null,
      }, ...filtered]
      return next.slice(0, 10)
    })
    setScanCount((c) => c + 1)
  }, [])

  const fetchSuggest = useCallback(async (sku) => {
    try {
      setSuggest(null)
      setSuggestErr('')
    } catch (e) {
      setSuggestErr(e?.message || '')
    }
  }, [])

  const lookup = async (c) => {
    setError('')
    setResult(null)
    try {
      const res = await client.get('/api/pallets/by-code', { params: { code: c } })
      setResult(res.data)
      addToRecent(res.data)
      const mainSku = (res.data?.items?.[0]?.sku) || ''
      if (mainSku) fetchSuggest(mainSku)
    } catch (e) {
      setError(e?.message || 'No encontrado')
    }
  }

  /* ── Re-fetch pallet after an action ── */
  const refreshPallet = async () => {
    if (!result?.code) return
    try {
      const res = await client.get('/api/pallets/by-code', { params: { code: result.code } })
      setResult(res.data)
      // Update recent scans entry too
      setRecentScans((prev) =>
        prev.map((s) =>
          s.code === res.data.code
            ? {
                ...s,
                status: res.data.status,
                location: res.data.location
                  ? `${res.data.location.area}-${res.data.location.level}${res.data.location.position}`
                  : null,
              }
            : s
        )
      )
    } catch {}
  }

  const startScan = async () => {
    setError('')
    const elId = 'qr-reader'
    if (!scannerRef.current) {
      scannerRef.current = new Html5Qrcode(elId)
    }
    try {
      await scannerRef.current.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 260, height: 260 } },
        async (decodedText) => {
          await stopScan()
          setCode(decodedText)
          lookup(decodedText)
        }
      )
    } catch (e) {
      setError('No se pudo iniciar la cámara. Revisa permisos.')
    }
  }

  const stopScan = async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop()
      }
    } catch {}
  }

  /* ── Fetch locations for transfer dialog ── */
  const fetchLocations = async () => {
    setLocationsLoading(true)
    try {
      const res = await client.get('/api/locations')
      const locs = Array.isArray(res.data) ? res.data : (res.data?.data || [])
      setLocations(locs)
    } catch {
      setLocations([])
    } finally {
      setLocationsLoading(false)
    }
  }

  /* ── Quick-action handlers ── */

  // Transfer
  const handleOpenTransfer = () => {
    setTransferOpen(true)
    setTransferError('')
    setTransferSuccess('')
    setTransferLocationId('')
    setTransferNote('')
    fetchLocations()
  }

  const handleTransferSubmit = async () => {
    if (!result?._id || !transferLocationId) return
    setTransferLoading(true)
    setTransferError('')
    setTransferSuccess('')
    try {
      await client.patch(`/api/pallets/${result._id}/transfer`, {
        toLocationId: transferLocationId,
        note: transferNote,
      })
      setTransferSuccess('Transferencia realizada correctamente')
      await refreshPallet()
      setTimeout(() => setTransferOpen(false), 1200)
    } catch (e) {
      setTransferError(e?.message || 'Error al transferir')
    } finally {
      setTransferLoading(false)
    }
  }

  // Status change
  const handleOpenStatus = () => {
    setStatusOpen(true)
    setStatusError('')
    setStatusSuccess('')
    setNewStatus(result?.status || '')
    setStatusNote('')
  }

  const handleStatusSubmit = async () => {
    if (!result?._id || !newStatus) return
    setStatusLoading(true)
    setStatusError('')
    setStatusSuccess('')
    try {
      await client.patch(`/api/pallets/${result._id}/status`, {
        status: newStatus,
        note: statusNote,
      })
      setStatusSuccess('Estatus actualizado correctamente')
      await refreshPallet()
      setTimeout(() => setStatusOpen(false), 1200)
    } catch (e) {
      setStatusError(e?.message || 'Error al cambiar estatus')
    } finally {
      setStatusLoading(false)
    }
  }

  // Outbound
  const handleOpenOut = () => {
    setOutOpen(true)
    setOutError('')
    setOutSuccess('')
    setOutDestType('')
    setOutDestRef('')
    setOutNote('')
  }

  const handleOutSubmit = async () => {
    if (!result?._id || !outDestType) return
    setOutLoading(true)
    setOutError('')
    setOutSuccess('')
    try {
      await client.post(`/api/pallets/${result._id}/out`, {
        destinationType: outDestType,
        destinationRef: outDestRef,
        note: outNote,
      })
      setOutSuccess('Salida registrada correctamente')
      await refreshPallet()
      setTimeout(() => setOutOpen(false), 1200)
    } catch (e) {
      setOutError(e?.message || 'Error al registrar salida')
    } finally {
      setOutLoading(false)
    }
  }

  // History
  const handleViewHistory = async () => {
    if (!result?._id) return
    setHistoryOpen(true)
    setHistoryLoading(true)
    setHistoryError('')
    setHistoryData([])
    try {
      const res = await client.get('/api/movements', { params: { palletId: result._id } })
      setHistoryData(Array.isArray(res.data) ? res.data : (res.data?.data || []))
    } catch (e) {
      setHistoryError(e?.message || 'Error al cargar historial')
    } finally {
      setHistoryLoading(false)
    }
  }

  const handlePrintLabel = () => {
    navigate('/etiquetas')
  }

  const handleGoToRack = () => {
    if (!result?.location) return
    const rackCode = result.location.rackCode || `${result.location.area}-${result.location.level}${result.location.position}`
    navigate(`/racks?rackCode=${encodeURIComponent(rackCode)}`)
  }

  /* ── Build location string ── */
  const locationStr = result?.location
    ? `${result.location.area}-${result.location.level}${result.location.position}`
    : null

  const itemCount = (result?.items || []).reduce((sum, it) => sum + (it.qty || 0), 0)

  /* ── Last movement date from result ── */
  const lastMovementDate = result?.lastMovement || result?.updatedAt || result?.createdAt || null

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary' }}>Escanear Tarima</Typography>
        <Chip
          label={`${scanCount} escaneo${scanCount !== 1 ? 's' : ''} hoy`}
          size="small"
          sx={ps.metricChip('info')}
        />
      </Stack>

      <Paper elevation={0} sx={ps.card}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 0.8fr' } }}>
          <Box sx={{ p: { xs: 1.5, sm: 2.2 } }}>
            <Tabs value={tab} onChange={(e,v)=>setTab(v)}>
              <Tab label="Escanear QR" />
              <Tab label="Ingresar código" />
            </Tabs>

            <Divider sx={{ my:2 }} />

            {tab === 0 && (
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <Paper variant="outlined" sx={{ p:2, borderRadius:3 }}>
                  <div id="qr-reader" ref={qrRef} style={{ width: '100%' }} />
                </Paper>
                <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                  <Button variant="contained" onClick={startScan}>Iniciar cámara</Button>
                  <Button onClick={stopScan}>Detener</Button>
                </Stack>
              </Stack>
            )}

            {tab === 1 && (
              <Stack spacing={2}>
                {error && <Alert severity="error">{error}</Alert>}
                <TextField label="Código (QR payload)" value={code} onChange={(e)=>setCode(e.target.value)} sx={ps.inputSx} />
                <Button variant="contained" onClick={()=>lookup(code)}>Buscar</Button>
              </Stack>
            )}

            {/* ── Recent scans chips ── */}
            {recentScans.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700, mb: 0.5, display: 'block' }}>
                  Escaneos recientes
                </Typography>
                <Stack spacing={0.5}>
                  {recentScans.map((s) => (
                    <Paper
                      key={s.code}
                      variant="outlined"
                      sx={{
                        p: 1,
                        borderRadius: 2,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 1,
                        '&:hover': {
                          bgcolor: ps.isDark ? 'rgba(66,165,245,.06)' : 'rgba(21,101,192,.04)',
                        },
                      }}
                      onClick={() => { setCode(s.code); lookup(s.code) }}
                    >
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 700, fontSize: 12, color: 'text.primary' }}>
                        {s.code}
                      </Typography>
                      <Stack direction="row" spacing={0.5} alignItems="center">
                        {s.location && (
                          <Chip
                            label={s.location}
                            size="small"
                            sx={{ fontSize: 10, fontFamily: 'monospace', fontWeight: 600, ...ps.metricChip('default'), height: 22 }}
                          />
                        )}
                        <Chip
                          label={s.status || 'SIN ESTATUS'}
                          size="small"
                          sx={{
                            fontWeight: 700,
                            fontSize: 10,
                            height: 22,
                            ...ps.statusChip(s.status || 'PENDIENTE'),
                          }}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </Box>
            )}

            <Divider sx={{ my:2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb:1, color: 'text.primary' }}>Resultado del escaneo</Typography>
            {!result && !error && <Typography sx={{ color: 'text.secondary' }}>Escanea o ingresa un código para ver la tarima.</Typography>}

            {result && (
              <Paper variant="outlined" sx={{ p:2, borderRadius:3 }}>
                <Stack spacing={1.5}>
                  {/* ── Prominent header with code + status chip ── */}
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1.1rem', color: 'text.primary' }}>
                      {result.code}
                    </Typography>
                    <Chip
                      label={result.status || 'SIN ESTATUS'}
                      size="small"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        ...ps.statusChip(result.status || 'PENDIENTE'),
                      }}
                    />
                  </Stack>

                  {/* ── Detail rows: lot, last movement ── */}
                  {result.lot && <Row label="Lote" value={result.lot} mono />}
                  {lastMovementDate && (
                    <Row label="Último movimiento" value={dayjs(lastMovementDate).format('DD/MM/YYYY HH:mm')} />
                  )}

                  {/* ── Location prominent display ── */}
                  {locationStr && (
                    <Paper variant="outlined" sx={{
                      p: 1.5,
                      borderRadius: 2,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1.5,
                      background: ps.isDark
                        ? 'rgba(66,165,245,0.06)'
                        : 'rgba(21,101,192,0.04)',
                    }}>
                      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>Ubicación</Typography>
                      <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '1rem', color: 'text.primary' }}>
                        {locationStr}
                      </Typography>
                    </Paper>
                  )}

                  {/* ── Item count KPI ── */}
                  <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap' }}>
                    <Chip
                      label={`${(result.items || []).length} SKU${(result.items || []).length !== 1 ? 's' : ''}`}
                      size="small"
                      sx={ps.metricChip('info')}
                    />
                    <Chip
                      label={`${itemCount} unidades`}
                      size="small"
                      sx={ps.metricChip('default')}
                    />
                  </Stack>

                  <Divider sx={{ my:1 }} />

                  {/* ── Items mini table ── */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary' }}>Items</Typography>
                  {(result.items || []).length > 0 ? (
                    <Table size="small">
                      <TableHead>
                        <TableRow sx={ps.tableHeaderRow}>
                          <TableCell>SKU</TableCell>
                          <TableCell align="right">Cantidad</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {(result.items || []).map((it, idx) => (
                          <TableRow key={idx} sx={ps.tableRow(idx)}>
                            <TableCell sx={{ fontFamily: 'monospace', fontWeight: 700, ...ps.cellText }}>
                              {it.sku}
                              {it.description && (
                                <Typography variant="caption" sx={{ display: 'block', color: 'text.secondary' }}>
                                  {it.description}
                                </Typography>
                              )}
                            </TableCell>
                            <TableCell align="right" sx={{ fontWeight: 900, ...ps.cellText }}>
                              {it.qty}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>Sin items registrados.</Typography>
                  )}

                  <Divider sx={{ my:1 }} />

                  {/* ── Quick actions ── */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary' }}>Acciones rápidas</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" sx={ps.actionBtn('primary')} onClick={handleOpenTransfer}>
                      Transferir
                    </Button>
                    <Button size="small" sx={ps.actionBtn('warning')} onClick={handleOpenStatus}>
                      Cambiar Status
                    </Button>
                    <Button size="small" sx={ps.actionBtn('error')} onClick={handleOpenOut}>
                      Salida
                    </Button>
                    <Button size="small" sx={ps.actionBtn('primary')} onClick={handleViewHistory}>
                      Historial
                    </Button>
                    <Button size="small" sx={ps.actionBtn('success')} onClick={handlePrintLabel}>
                      Imprimir Etiqueta
                    </Button>
                    {result.location && (
                      <Button size="small" sx={ps.actionBtn('warning')} onClick={handleGoToRack}>
                        Ir al Rack
                      </Button>
                    )}
                  </Stack>
                </Stack>
              </Paper>
            )}
          </Box>

          <Box sx={{
            p: { xs: 1.5, sm: 2.2 },
            background: ps.isDark
              ? 'linear-gradient(135deg, rgba(66,165,245,0.08), rgba(66,165,245,0.03))'
              : 'linear-gradient(135deg, rgba(21,101,192,0.06), rgba(21,101,192,0.02))',
            borderLeft: {
              xs: 'none',
              md: ps.isDark
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(13,59,102,0.06)',
            },
            borderTop: {
              xs: ps.isDark
                ? '1px solid rgba(255,255,255,0.06)'
                : '1px solid rgba(13,59,102,0.06)',
              md: 'none',
            },
          }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb:1, color: 'text.primary' }}>Tips rápidos</Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary', mb:2 }}>
              En celular, permite cámara. Para escáner físico, usa "Ingresar código" y pega el texto del QR.
            </Typography>
            <Paper variant="outlined" sx={{ p:2, borderRadius:3 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 900, mb:1, color: 'text.primary' }}>Acción sugerida</Typography>
              <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                Desde aquí se puede agregar "Confirmar movimiento" (entrada/salida/transferencia) con 1 click.
              </Typography>
            </Paper>
          </Box>
        </Box>
      </Paper>

      {/* ── Transfer dialog ── */}
      <Dialog
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Transferir Tarima
          {result?.code && (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {result.code}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {transferError && <Alert severity="error">{transferError}</Alert>}
            {transferSuccess && <Alert severity="success">{transferSuccess}</Alert>}
            <FormControl fullWidth sx={ps.inputSx}>
              <InputLabel>Ubicación destino</InputLabel>
              <Select
                value={transferLocationId}
                onChange={(e) => setTransferLocationId(e.target.value)}
                label="Ubicación destino"
                disabled={locationsLoading}
              >
                {locationsLoading && <MenuItem value="" disabled>Cargando ubicaciones...</MenuItem>}
                {locations.map((loc) => (
                  <MenuItem key={loc._id} value={loc._id}>
                    {loc.area}-{loc.level}{loc.position}
                    {loc.status === 'DISPONIBLE' ? ' (Disponible)' : loc.status === 'OCUPADA' ? ' (Ocupada)' : ''}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Nota (opcional)"
              value={transferNote}
              onChange={(e) => setTransferNote(e.target.value)}
              multiline
              rows={2}
              sx={ps.inputSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTransferOpen(false)} disabled={transferLoading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleTransferSubmit}
            disabled={transferLoading || !transferLocationId}
          >
            {transferLoading ? <CircularProgress size={20} /> : 'Transferir'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Status change dialog ── */}
      <Dialog
        open={statusOpen}
        onClose={() => setStatusOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Cambiar Estatus
          {result?.code && (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {result.code}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {statusError && <Alert severity="error">{statusError}</Alert>}
            {statusSuccess && <Alert severity="success">{statusSuccess}</Alert>}
            <FormControl fullWidth sx={ps.inputSx}>
              <InputLabel>Nuevo estatus</InputLabel>
              <Select
                value={newStatus}
                onChange={(e) => setNewStatus(e.target.value)}
                label="Nuevo estatus"
              >
                {STATUS_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Nota (opcional)"
              value={statusNote}
              onChange={(e) => setStatusNote(e.target.value)}
              multiline
              rows={2}
              sx={ps.inputSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setStatusOpen(false)} disabled={statusLoading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleStatusSubmit}
            disabled={statusLoading || !newStatus}
          >
            {statusLoading ? <CircularProgress size={20} /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Outbound dialog ── */}
      <Dialog
        open={outOpen}
        onClose={() => setOutOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Registrar Salida
          {result?.code && (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {result.code}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {outError && <Alert severity="error">{outError}</Alert>}
            {outSuccess && <Alert severity="success">{outSuccess}</Alert>}
            <FormControl fullWidth sx={ps.inputSx}>
              <InputLabel>Tipo de destino</InputLabel>
              <Select
                value={outDestType}
                onChange={(e) => setOutDestType(e.target.value)}
                label="Tipo de destino"
              >
                <MenuItem value="CLIENTE">Cliente</MenuItem>
                <MenuItem value="PLANTA">Planta</MenuItem>
                <MenuItem value="DEVOLUCION">Devolución</MenuItem>
                <MenuItem value="OTRO">Otro</MenuItem>
              </Select>
            </FormControl>
            <TextField
              label="Referencia destino"
              value={outDestRef}
              onChange={(e) => setOutDestRef(e.target.value)}
              placeholder="Ej: nombre del cliente, número de orden..."
              sx={ps.inputSx}
            />
            <TextField
              label="Nota (opcional)"
              value={outNote}
              onChange={(e) => setOutNote(e.target.value)}
              multiline
              rows={2}
              sx={ps.inputSx}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOutOpen(false)} disabled={outLoading}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleOutSubmit}
            disabled={outLoading || !outDestType}
          >
            {outLoading ? <CircularProgress size={20} /> : 'Registrar Salida'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ── Movement history dialog ── */}
      <Dialog
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: 3 } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Historial de Movimientos
          {result?.code && (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
              {result.code}
            </Typography>
          )}
        </DialogTitle>
        <DialogContent dividers>
          {historyLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress size={32} />
            </Box>
          )}
          {historyError && <Alert severity="error" sx={{ mb: 2 }}>{historyError}</Alert>}
          {!historyLoading && !historyError && historyData.length === 0 && (
            <Typography sx={ps.emptyText}>No hay movimientos registrados para esta tarima.</Typography>
          )}
          {!historyLoading && historyData.length > 0 && (
            <Table size="small">
              <TableHead>
                <TableRow sx={ps.tableHeaderRow}>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Origen</TableCell>
                  <TableCell>Destino</TableCell>
                  <TableCell>Fecha</TableCell>
                  <TableCell>Estatus</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {historyData.map((mov, idx) => (
                  <TableRow key={mov._id || idx} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellText}>{mov.type || '—'}</TableCell>
                    <TableCell sx={ps.cellText}>{mov.origin || mov.from || '—'}</TableCell>
                    <TableCell sx={ps.cellText}>{mov.destination || mov.to || '—'}</TableCell>
                    <TableCell sx={ps.cellTextSecondary}>
                      {mov.createdAt ? dayjs(mov.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={mov.status || '—'}
                        size="small"
                        sx={{ fontSize: 11, ...ps.statusChip(mov.status || 'PENDIENTE') }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setHistoryOpen(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}

function Row({ label, value, mono }) {
  return (
    <Stack direction="row" justifyContent="space-between" spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>{label}</Typography>
      <Typography variant="body2" sx={{ fontWeight: 900, fontFamily: mono ? 'monospace' : 'inherit', color: 'text.primary' }}>{value}</Typography>
    </Stack>
  )
}
