import React, { useCallback, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { Html5Qrcode } from 'html5-qrcode'
import { usePageStyles } from '../ui/pageStyles'

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

export default function ScanPage() {
  const { token } = useAuth()
  const client = useMemo(() => api(token), [token])
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

  /* ── Movement history modal ── */
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyData, setHistoryData] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState('')

  const qrRef = useRef(null)
  const scannerRef = useRef(null)

  const addToRecent = useCallback((palletData) => {
    setRecentScans((prev) => {
      const filtered = prev.filter((s) => s.code !== palletData.code)
      const next = [{ code: palletData.code, status: palletData.status, _id: palletData._id }, ...filtered]
      return next.slice(0, 10)
    })
  }, [])

  const fetchSuggest = useCallback(async (sku) => {
    // placeholder for suggested-action logic (referenced in original)
    try {
      setSuggest(null)
      setSuggestErr('')
    } catch (e) {
      setSuggestErr(e?.response?.data?.message || '')
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
      setError(e?.response?.data?.message || 'No encontrado')
    }
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

  /* ── Quick-action handlers ── */
  const handleTransfer = () => {
    navigate('/movimientos')
  }

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
      setHistoryError(e?.response?.data?.message || 'Error al cargar historial')
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

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2, color: 'text.primary' }}>Escanear Tarima</Typography>

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
                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                  {recentScans.map((s) => (
                    <Chip
                      key={s.code}
                      label={s.code}
                      size="small"
                      onClick={() => { setCode(s.code); lookup(s.code) }}
                      sx={{
                        fontFamily: 'monospace',
                        fontWeight: 700,
                        fontSize: 11,
                        cursor: 'pointer',
                        ...ps.statusChip(s.status || 'PENDIENTE'),
                      }}
                    />
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

                  {/* ── Quick actions ── */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary' }}>Acciones rápidas</Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                    <Button size="small" sx={ps.actionBtn('primary')} onClick={handleTransfer}>
                      Transferir
                    </Button>
                    <Button size="small" sx={ps.actionBtn('primary')} onClick={handleViewHistory}>
                      Ver Historial
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

                  <Divider sx={{ my:1 }} />

                  {/* ── Items list ── */}
                  <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'text.primary' }}>Items</Typography>
                  {(result.items || []).map((it, idx) => (
                    <Paper key={idx} variant="outlined" sx={{ p:1.2, borderRadius:2 }}>
                      <Stack direction="row" justifyContent="space-between" sx={{ flexWrap: 'wrap' }}>
                        <Typography sx={{ fontFamily:'monospace', fontWeight: 900, color: 'text.primary' }}>{it.sku}</Typography>
                        <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>{it.qty}</Typography>
                      </Stack>
                      {it.description ? <Typography variant="caption" sx={{ color: 'text.secondary' }}>{it.description}</Typography> : null}
                      {it.serials?.length ? <Typography variant="caption" sx={{ color: 'text.secondary' }}>Seriales: {it.serials.join(', ')}</Typography> : null}
                    </Paper>
                  ))}
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
                      {mov.createdAt ? new Date(mov.createdAt).toLocaleString('es-MX') : '—'}
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
