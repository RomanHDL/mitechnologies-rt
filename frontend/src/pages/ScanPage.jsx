import React, { useMemo, useRef, useState } from 'react'
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

export default function ScanPage() {
  const { token } = useAuth()
  const client = useMemo(() => api(token), [token])
  const ps = usePageStyles()
  const [tab, setTab] = useState(0)
  const [code, setCode] = useState('')
  const [result, setResult] = useState(null)
  const [suggest, setSuggest] = useState(null)
  const [suggestErr, setSuggestErr] = useState('')
  const [error, setError] = useState('')

  const qrRef = useRef(null)
  const scannerRef = useRef(null)

  const lookup = async (c) => {
    setError('')
    setResult(null)
    try {
      const res = await client.get('/api/pallets/by-code', { params: { code: c } })
      setResult(res.data)
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

            <Divider sx={{ my:2 }} />

            <Typography variant="subtitle1" sx={{ fontWeight: 900, mb:1, color: 'text.primary' }}>Resultado del escaneo</Typography>
            {!result && !error && <Typography sx={{ color: 'text.secondary' }}>Escanea o ingresa un código para ver la tarima.</Typography>}

            {result && (
              <Paper variant="outlined" sx={{ p:2, borderRadius:3 }}>
                <Stack spacing={1}>
                  <Row label="Código" value={result.code} mono />
                  <Row label="Ubicación" value={result.location ? `${result.location.area}-${result.location.level}${result.location.position}` : '—'} />
                  <Row label="Estatus" value={result.status} />
                  <Divider sx={{ my:1 }} />
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
