// ProductionPage.jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'

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

import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadIcon from '@mui/icons-material/Download'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import TodayIcon from '@mui/icons-material/Today'

import * as XLSX from 'xlsx'

// ✅ MAPEO PROFESIONAL (DB sigue igual: P1..P4)
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

function areaLabel(code) {
  return AREAS.find(a => a.code === code)?.label || code
}

function isFftAccesorios(areaCode, subarea) {
  return areaCode === 'P2' && String(subarea || '').toLowerCase() === 'accesorios'
}

// ✅ helpers fecha
function isoToday() {
  return new Date().toISOString().slice(0, 10) // YYYY-MM-DD
}

function isoToDMY(iso) {
  const [y, m, d] = String(iso || '').slice(0, 10).split('-')
  if (!y || !m || !d) return ''
  return `${d}/${m}/${y}`
}

function dmyToISO(dmy) {
  const parts = String(dmy || '').trim().split('/')
  if (parts.length !== 3) return ''
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return ''
  if (yyyy.length !== 4) return ''
  const d = dd.padStart(2, '0')
  const m = mm.padStart(2, '0')
  const y = yyyy
  if (+m < 1 || +m > 12) return ''
  if (+d < 1 || +d > 31) return ''
  return `${y}-${m}-${d}`
}

function isoAddDays(iso, deltaDays) {
  const base = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(base.getTime())) return iso
  base.setDate(base.getDate() + Number(deltaDays || 0))
  return base.toISOString().slice(0, 10)
}

export default function ProductionPage() {
  const { token } = useAuth()

  const [rows, setRows] = useState([])

  // ✅ selección real
  const [area, setArea] = useState('P2') // FFT por default
  const [subarea, setSubarea] = useState('Accesorios')

  const [sku, setSku] = useState('')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  // ✅ Paletizado dashboard (FFT > Paletizado)
  const isFftPaletizado = area === 'P2' && subarea === 'Paletizado'

  const [dashDayISO, setDashDayISO] = useState(isoToday())
  const [dashDayDMY, setDashDayDMY] = useState(isoToDMY(isoToday()))

  const [dash, setDash] = useState({
    resumen: { total: 0, pendientes: 0, procesados: 0 },
    rows: []
  })

  const load = async () => {
    const res = await api().get('/api/production')
    setRows(Array.isArray(res.data) ? res.data : [])
  }

  const loadDash = async (iso) => {
    try {
      const res = await api().get(`/api/pallet-dashboard?day=${iso}`)
      setDash(res.data)
    } catch (e) {
      setDash({ resumen: { total: 0, pendientes: 0, procesados: 0 }, rows: [] })
    }
  }

  const setDashStatus = async (id, status) => {
    await api().patch(`/api/pallet-dashboard/${id}/status`, { status })
    await loadDash(dashDayISO)
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  useEffect(() => {
    const list = SUBAREAS_BY_AREA[area] || []
    if (!list.includes(subarea)) setSubarea(list[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area])

  useEffect(() => {
    if (isFftPaletizado) loadDash(dashDayISO)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFftPaletizado, dashDayISO])

  const create = async () => {
    await api().post('/api/production', {
      area,
      subarea,
      items: [{ sku, qty: Number(qty) }],
      note
    })
    setNote('')
    await load()
  }

  const [filtroStatus, setFiltroStatus] = useState('')
  const filteredRows = rows.filter(r => !filtroStatus || r.status === filtroStatus)

  const exportExcel = () => {
    const data = filteredRows.map(r => ({
      Area: areaLabel(r.area),
      SubArea: r.subarea || '',
      Status: r.status,
      Items: (r.items || []).map(i => `${i.sku}(${i.qty})`).join(', '),
      Solicito: r.requestedBy?.email || '',
      Nota: r.note || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes')
    XLSX.writeFile(wb, 'solicitudes_produccion.xlsx')
  }

  const markCompleted = async (id) => {
    await api().patch(`/api/production/${id}/status`, { status: 'COMPLETADA' })
    await load()
  }

  const markCancelled = async (id) => {
    await api().patch(`/api/production/${id}/status`, { status: 'CANCELADA' })
    await load()
  }

  const resumen = useMemo(() => ({
    total: rows.length,
    pendientes: rows.filter(r => r.status === 'PENDIENTE').length,
    enproceso: rows.filter(r => r.status === 'EN PROCESO').length,
    completadas: rows.filter(r => r.status === 'COMPLETADA').length,
    canceladas: rows.filter(r => r.status === 'CANCELADA').length
  }), [rows])

  const headerSubtitle = useMemo(() => {
    const title = `${areaLabel(area)} > ${subarea}`
    if (isFftAccesorios(area, subarea)) return `${title}  (modo especial: estantes H1–H5)`
    if (isFftPaletizado) return `${title}  (control diario)`
    return `${title}  (modo normal)`
  }, [area, subarea, isFftPaletizado])

  // ✅ ESTILO CLARO TIPO RACKS
  const pageBg = {
    borderRadius: 4,
    p: { xs: 1.5, md: 2.5 },
    backgroundColor: 'transparent',
  }

  const card = {
    borderRadius: 3,
    border: '1px solid rgba(21,101,192,.10)',
    backgroundColor: '#ffffff',
    boxShadow: '0 8px 24px rgba(21,101,192,.08)',
    overflow: 'hidden'
  }

  const cardHeader = {
    px: 2,
    py: 1.5,
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    background: 'linear-gradient(180deg, rgba(21,101,192,.10), rgba(21,101,192,.04))',
    borderBottom: '1px solid rgba(21,101,192,.10)'
  }

  const subtleText = { opacity: .85, fontSize: 12, color: 'text.secondary' }

  const metricChip = (label, tone = 'default') => {
    const base = {
      fontWeight: 900,
      borderRadius: 999,
      height: 34,
      px: 1.2,
      border: '1px solid rgba(21,101,192,.12)',
      background: '#fff',
      color: 'text.primary',
    }

    if (tone === 'warn') return <Chip label={label} sx={{ ...base, background: 'rgba(245,158,11,.10)', color: '#b45309', border: '1px solid rgba(245,158,11,.18)' }} />
    if (tone === 'info') return <Chip label={label} sx={{ ...base, background: 'rgba(56,189,248,.10)', color: '#0369a1', border: '1px solid rgba(56,189,248,.18)' }} />
    if (tone === 'ok') return <Chip label={label} sx={{ ...base, background: 'rgba(34,197,94,.10)', color: '#15803d', border: '1px solid rgba(34,197,94,.18)' }} />
    if (tone === 'bad') return <Chip label={label} sx={{ ...base, background: 'rgba(239,68,68,.10)', color: '#b91c1c', border: '1px solid rgba(239,68,68,.18)' }} />
    return <Chip label={label} sx={base} />
  }

  const inputSx = {
    '& .MuiInputBase-root': {
      borderRadius: 3,
      backgroundColor: '#fff',
      color: 'text.primary'
    },
    '& .MuiInputLabel-root': {
      color: 'text.secondary'
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(21,101,192,.16)'
    },
    '& .MuiInputBase-root:hover .MuiOutlinedInput-notchedOutline': {
      borderColor: 'rgba(21,101,192,.28)'
    },
    '& .MuiInputBase-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
      borderColor: '#1565C0'
    },
    '& .MuiFormHelperText-root': {
      color: 'text.secondary'
    }
  }

  const metricCard = (title, value, tone = 'default') => {
    const tones = {
      default: { border: 'rgba(21,101,192,.12)', bar: '#90caf9' },
      warn: { border: 'rgba(245,158,11,.20)', bar: '#f59e0b' },
      info: { border: 'rgba(56,189,248,.20)', bar: '#38bdf8' },
      ok: { border: 'rgba(34,197,94,.20)', bar: '#22c55e' },
      bad: { border: 'rgba(239,68,68,.20)', bar: '#ef4444' },
    }
    const t = tones[tone] || tones.default

    return (
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: `1px solid ${t.border}`,
          backgroundColor: '#fff',
          boxShadow: '0 8px 22px rgba(21,101,192,.06)',
          overflow: 'hidden',
          minHeight: 96
        }}
      >
        <Typography sx={{ color: 'text.secondary', fontSize: 12, fontWeight: 900, letterSpacing: .4 }}>
          {String(title).toUpperCase()}
        </Typography>

        <Typography sx={{ mt: .6, color: 'text.primary', fontWeight: 950, fontSize: 30, lineHeight: 1 }}>
          {value}
        </Typography>

        <Box sx={{ mt: 1.2 }}>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, Math.max(0, Number(value || 0)))}
            sx={{
              height: 8,
              borderRadius: 999,
              bgcolor: 'rgba(21,101,192,.10)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 999,
                backgroundColor: t.bar
              }
            }}
          />
        </Box>
      </Paper>
    )
  }

  return (
    <Box sx={pageBg}>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={1.2}
        alignItems={{ xs: 'flex-start', md: 'center' }}
        sx={{ mb: 3 }}
      >
        <Box sx={{ minWidth: 260 }}>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: .2, color: 'text.primary', lineHeight: 1.15 }}>
            Producción
          </Typography>
          <Typography sx={{ opacity: .9, fontSize: 13, color: 'text.secondary' }}>
            {headerSubtitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Exportar a Excel">
            <IconButton
              onClick={exportExcel}
              sx={{
                borderRadius: 3,
                border: '1px solid rgba(21,101,192,.14)',
                backgroundColor: '#fff',
                color: '#1565C0',
                '&:hover': { backgroundColor: 'rgba(21,101,192,.05)' }
              }}
            >
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* Resumen PRO */}
      <Paper elevation={0} sx={{ ...card, mb: 4 }}>
        <Box sx={cardHeader}>
          <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>Resumen</Typography>
          <Typography sx={{ ...subtleText }}>
            Estado de solicitudes en Producción
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6} md={2.4}>
              {metricCard('Total', resumen.total, 'default')}
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              {metricCard('Pendientes', resumen.pendientes, 'warn')}
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              {metricCard('En proceso', resumen.enproceso, 'info')}
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              {metricCard('Completadas', resumen.completadas, 'ok')}
            </Grid>
            <Grid item xs={12} sm={6} md={2.4}>
              {metricCard('Canceladas', resumen.canceladas, 'bad')}
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* ✅ ARRIBA: Nueva solicitud + Solicitudes */}
      <Grid container spacing={2.5} sx={{ mb: 4 }}>
        {/* IZQUIERDA: Nueva solicitud */}
        <Grid item xs={12} lg={4}>
          <Paper elevation={0} sx={{ ...card, height: '100%' }}>
            <Box sx={cardHeader}>
              <Typography sx={{ fontWeight: 950, color: 'text.primary' }}>Nueva solicitud</Typography>
              <Typography sx={{ ...subtleText }}>
                Registra una solicitud para el área/sub-área seleccionada.
              </Typography>
            </Box>

            <Box sx={{ p: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Área"
                    value={area}
                    onChange={(e) => setArea(e.target.value)}
                    sx={inputSx}
                  >
                    {AREAS.map(a => (
                      <MenuItem key={a.code} value={a.code}>{a.label}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    select
                    fullWidth
                    label="Sub-área"
                    value={subarea}
                    onChange={(e) => setSubarea(e.target.value)}
                    sx={inputSx}
                  >
                    {(SUBAREAS_BY_AREA[area] || []).map(s => (
                      <MenuItem key={s} value={s}>{s}</MenuItem>
                    ))}
                  </TextField>
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="PalletID"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    sx={inputSx}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Items"
                    type="number"
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                    sx={inputSx}
                    inputProps={{ min: 1 }}
                  />
                </Grid>

                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Nota"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    sx={inputSx}
                  />
                </Grid>

                <Grid item xs={12}>
                  <Button
                    fullWidth
                    variant="contained"
                    onClick={create}
                    sx={{
                      height: 52,
                      borderRadius: 3,
                      fontWeight: 950,
                      textTransform: 'none',
                      background: 'linear-gradient(90deg, #1976d2, #1565c0)',
                      boxShadow: '0 8px 20px rgba(21,101,192,.22)',
                      '&:hover': { filter: 'brightness(1.06)' }
                    }}
                    disabled={!area || !subarea || !sku || Number(qty) <= 0}
                  >
                    Crear
                  </Button>
                </Grid>
              </Grid>

              {isFftAccesorios(area, subarea) && (
                <Typography sx={{ mt: 1.5, fontSize: 12, opacity: .85, color: 'text.secondary' }}>
                  *FFT &gt; Accesorios usará estantes H1–H5 en el siguiente paso (BINs/estantes).
                </Typography>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* DERECHA: Solicitudes */}
        <Grid item xs={12} lg={8}>
          <Paper elevation={0} sx={{ ...card, height: '100%' }}>
            <Box
              sx={{
                ...cardHeader,
                flexDirection: { xs: 'column', md: 'row' },
                alignItems: { xs: 'flex-start', md: 'center' },
                gap: 1.2
              }}
            >
              <Typography sx={{ fontWeight: 950, color: 'text.primary' }}>Solicitudes</Typography>
              <Box sx={{ flex: 1 }} />

              <TextField
                select
                label="Filtrar status"
                value={filtroStatus}
                onChange={e => setFiltroStatus(e.target.value)}
                sx={{
                  ...inputSx,
                  minWidth: { xs: '100%', md: 240 },
                  width: { xs: '100%', md: 'auto' }
                }}
              >
                <MenuItem value="">Todos</MenuItem>
                <MenuItem value="PENDIENTE">Pendiente</MenuItem>
                <MenuItem value="EN PROCESO">En proceso</MenuItem>
                <MenuItem value="COMPLETADA">Completada</MenuItem>
                <MenuItem value="CANCELADA">Cancelada</MenuItem>
              </TextField>
            </Box>

            <Box sx={{ p: 2 }}>
              <TableContainer
                sx={{
                  borderRadius: 3,
                  border: '1px solid rgba(21,101,192,.08)',
                  maxHeight: 520,
                  overflow: 'auto'
                }}
              >
                <Table stickyHeader size="small" sx={{ minWidth: 980 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ background: 'rgba(21,101,192,.08)', color: 'text.primary', fontWeight: 900 }}>Área</TableCell>
                      <TableCell sx={{ background: 'rgba(21,101,192,.08)', color: 'text.primary', fontWeight: 900 }}>Sub-área</TableCell>
                      <TableCell sx={{ background: 'rgba(21,101,192,.08)', color: 'text.primary', fontWeight: 900 }}>Status</TableCell>
                      <TableCell sx={{ background: 'rgba(21,101,192,.08)', color: 'text.primary', fontWeight: 900 }}>Items</TableCell>
                      <TableCell sx={{ background: 'rgba(21,101,192,.08)', color: 'text.primary', fontWeight: 900 }}>Solicitó</TableCell>
                      <TableCell sx={{ background: 'rgba(21,101,192,.08)', color: 'text.primary', fontWeight: 900 }}>Nota</TableCell>
                      <TableCell sx={{ background: 'rgba(21,101,192,.08)', color: 'text.primary', fontWeight: 900, textAlign: 'center' }}>Acción</TableCell>
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {filteredRows.map((r, idx) => {
                      let statusIcon = <HourglassEmptyIcon sx={{ color: '#f59e0b', verticalAlign: 'middle' }} fontSize="small" />
                      if (r.status === 'EN PROCESO') statusIcon = <EditIcon sx={{ color: '#38bdf8', verticalAlign: 'middle' }} fontSize="small" />
                      if (r.status === 'COMPLETADA') statusIcon = <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
                      if (r.status === 'CANCELADA') statusIcon = <CancelIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />

                      const itemsText = (r.items || []).map(i => `${i.sku}(${i.qty})`).join(', ')

                      return (
                        <TableRow
                          key={r._id}
                          sx={{
                            background: idx % 2 === 0 ? '#fff' : 'rgba(21,101,192,.02)',
                            '&:hover': { background: 'rgba(21,101,192,.06)' }
                          }}
                        >
                          <TableCell sx={{ color: 'text.primary', fontWeight: 900 }}>{areaLabel(r.area)}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{r.subarea || '—'}</TableCell>

                          <TableCell sx={{ color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            <Tooltip title={r.status} arrow>{statusIcon}</Tooltip>
                            <Typography variant="caption" sx={{ ml: 1, color: 'text.primary', fontWeight: 800 }}>
                              {r.status}
                            </Typography>
                          </TableCell>

                          <TableCell sx={{ color: 'text.secondary', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Tooltip title={itemsText} arrow>
                              <span>{itemsText.length > 38 ? itemsText.slice(0, 38) + '…' : itemsText}</span>
                            </Tooltip>
                          </TableCell>

                          <TableCell sx={{ color: 'text.secondary' }}>{r.requestedBy?.email || '—'}</TableCell>

                          <TableCell sx={{ color: 'text.secondary', maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            <Tooltip title={r.note || '—'} arrow>
                              <span>{(r.note || '—').length > 38 ? (r.note || '—').slice(0, 38) + '…' : (r.note || '—')}</span>
                            </Tooltip>
                          </TableCell>

                          <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <Tooltip title="Marcar como completada">
                              <span>
                                <IconButton
                                  size="small"
                                  sx={{
                                    color: '#22c55e',
                                    borderRadius: 2,
                                    border: '1px solid rgba(34,197,94,.25)',
                                    background: 'rgba(34,197,94,.08)',
                                    '&:hover': { background: 'rgba(34,197,94,.14)' }
                                  }}
                                  onClick={() => markCompleted(r._id)}
                                  disabled={r.status === 'COMPLETADA' || r.status === 'CANCELADA'}
                                >
                                  <DoneIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>

                            <Tooltip title="Cancelar">
                              <span>
                                <IconButton
                                  size="small"
                                  sx={{
                                    ml: 1,
                                    color: '#ef4444',
                                    borderRadius: 2,
                                    border: '1px solid rgba(239,68,68,.25)',
                                    background: 'rgba(239,68,68,.08)',
                                    '&:hover': { background: 'rgba(239,68,68,.14)' }
                                  }}
                                  onClick={() => markCancelled(r._id)}
                                  disabled={r.status === 'COMPLETADA' || r.status === 'CANCELADA'}
                                >
                                  <CancelIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </TableCell>
                        </TableRow>
                      )
                    })}

                    {filteredRows.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} sx={{ color: 'text.secondary', opacity: 0.8 }}>
                          No hay solicitudes para el filtro seleccionado.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* ✅ ABAJO: FFT > Paletizado — Dashboard Diario */}
      {isFftPaletizado && (
        <Paper elevation={0} sx={{ ...card, mb: 1 }}>
          <Box
            sx={{
              ...cardHeader,
              flexDirection: { xs: 'column', md: 'row' },
              alignItems: { xs: 'flex-start', md: 'center' },
              gap: 1.2
            }}
          >
            <Box>
              <Typography sx={{ fontWeight: 950, color: 'text.primary' }}>
                FFT &gt; Paletizado — Control diario
              </Typography>
              <Typography sx={{ ...subtleText }}>
                Consulta por día y marca pallets como procesados/pendientes.
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            <Stack direction="row" spacing={1} alignItems="center" sx={{ width: { xs: '100%', md: 'auto' } }}>
              <Tooltip title="Día anterior">
                <IconButton
                  onClick={() => {
                    const nextIso = isoAddDays(dashDayISO, -1)
                    setDashDayISO(nextIso)
                    setDashDayDMY(isoToDMY(nextIso))
                  }}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(21,101,192,.14)',
                    backgroundColor: '#fff',
                    color: '#1565C0',
                    '&:hover': { backgroundColor: 'rgba(21,101,192,.05)' }
                  }}
                >
                  <ChevronLeftIcon />
                </IconButton>
              </Tooltip>

              <TextField
                type="date"
                label="Día"
                value={dashDayISO}
                onChange={(e) => {
                  const iso = e.target.value || isoToday()
                  setDashDayISO(iso)
                  setDashDayDMY(isoToDMY(iso))
                }}
                sx={{
                  ...inputSx,
                  minWidth: { xs: '100%', md: 260 },
                  width: { xs: '100%', md: 'auto' }
                }}
                helperText={`Mostrando: ${dashDayDMY}  (ISO: ${dashDayISO})`}
                FormHelperTextProps={{ sx: { color: 'text.secondary' } }}
                InputLabelProps={{ shrink: true }}
              />

              <Tooltip title="Día siguiente">
                <IconButton
                  onClick={() => {
                    const nextIso = isoAddDays(dashDayISO, 1)
                    setDashDayISO(nextIso)
                    setDashDayDMY(isoToDMY(nextIso))
                  }}
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(21,101,192,.14)',
                    backgroundColor: '#fff',
                    color: '#1565C0',
                    '&:hover': { backgroundColor: 'rgba(21,101,192,.05)' }
                  }}
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
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(21,101,192,.14)',
                    backgroundColor: '#fff',
                    color: '#1565C0',
                    '&:hover': { backgroundColor: 'rgba(21,101,192,.05)' }
                  }}
                >
                  <TodayIcon />
                </IconButton>
              </Tooltip>
            </Stack>
          </Box>

          <Box sx={{ p: 2 }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 2,
                    borderRadius: 3,
                    border: '1px solid rgba(21,101,192,.10)',
                    background: '#fff',
                    boxShadow: '0 8px 22px rgba(21,101,192,.05)'
                  }}
                >
                  <Typography sx={{ fontWeight: 950, color: 'text.primary', mb: 1 }}>
                    Estado del día
                  </Typography>

                  <Stack spacing={1.2} sx={{ mb: 2 }}>
                    {metricChip(`Total: ${dash.resumen?.total ?? 0}`)}
                    {metricChip(`Pendientes: ${dash.resumen?.pendientes ?? 0}`, 'warn')}
                    {metricChip(`Procesados: ${dash.resumen?.procesados ?? 0}`, 'ok')}
                  </Stack>

                  <Divider sx={{ my: 2, borderColor: 'rgba(21,101,192,.10)' }} />

                  <Typography sx={{ ...subtleText }}>
                    Tip: desplázate en la tabla (derecha) y marca procesados sin recargar.
                  </Typography>
                </Paper>
              </Grid>

              <Grid item xs={12} md={8}>
                <TableContainer
                  sx={{
                    borderRadius: 3,
                    border: '1px solid rgba(21,101,192,.08)',
                    maxHeight: 380,
                    overflow: 'auto'
                  }}
                >
                  <Table stickyHeader size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ background: 'rgba(21,101,192,.08)', fontWeight: 900, color: 'text.primary' }}>PalletID</TableCell>
                        <TableCell sx={{ background: 'rgba(21,101,192,.08)', fontWeight: 900, color: 'text.primary' }}>Status</TableCell>
                        <TableCell sx={{ background: 'rgba(21,101,192,.08)', fontWeight: 900, color: 'text.primary', textAlign: 'center' }}>Acción</TableCell>
                      </TableRow>
                    </TableHead>

                    <TableBody>
                      {(dash.rows || []).map((r, i) => (
                        <TableRow
                          key={r.id}
                          sx={{
                            background: i % 2 === 0 ? '#fff' : 'rgba(21,101,192,.02)',
                            '&:hover': { background: 'rgba(21,101,192,.06)' }
                          }}
                        >
                          <TableCell sx={{ color: 'text.primary', fontWeight: 800 }}>{r.palletId}</TableCell>
                          <TableCell sx={{ color: 'text.secondary' }}>{r.status}</TableCell>
                          <TableCell sx={{ textAlign: 'center' }}>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => setDashStatus(r.id, r.status === 'PROCESADO' ? 'PENDIENTE' : 'PROCESADO')}
                              sx={{
                                borderRadius: 3,
                                textTransform: 'none',
                                fontWeight: 900,
                                borderColor: 'rgba(21,101,192,.24)',
                                color: '#1565C0',
                                '&:hover': {
                                  borderColor: '#1565C0',
                                  background: 'rgba(21,101,192,.06)'
                                }
                              }}
                            >
                              {r.status === 'PROCESADO' ? 'Marcar Pendiente' : 'Marcar Procesado'}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {(!dash.rows || dash.rows.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={3} sx={{ opacity: 0.8, color: 'text.secondary' }}>
                            No hay pallets cargados para este día. (Importa el Excel o cambia la fecha)
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
    </Box>
  )
}