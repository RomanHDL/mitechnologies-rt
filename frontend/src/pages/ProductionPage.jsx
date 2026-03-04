import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'

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

import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import DownloadIcon from '@mui/icons-material/Download'

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
  // acepta DD/MM/YYYY
  const parts = String(dmy || '').trim().split('/')
  if (parts.length !== 3) return ''
  const [dd, mm, yyyy] = parts
  if (!dd || !mm || !yyyy) return ''
  if (yyyy.length !== 4) return ''
  const d = dd.padStart(2, '0')
  const m = mm.padStart(2, '0')
  const y = yyyy
  // validación simple
  if (+m < 1 || +m > 12) return ''
  if (+d < 1 || +d > 31) return ''
  return `${y}-${m}-${d}`
}

export default function ProductionPage() {
  const { token } = useAuth()
  const ps = usePageStyles()

  const [rows, setRows] = useState([])

  // ✅ selección real
  const [area, setArea] = useState('P2') // FFT por default
  const [subarea, setSubarea] = useState('Accesorios')

  const [sku, setSku] = useState('')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  // ✅ Paletizado dashboard (FFT > Paletizado)
  const isFftPaletizado = area === 'P2' && subarea === 'Paletizado'

  // guardamos ISO real para request
  const [dashDayISO, setDashDayISO] = useState(isoToday())
  // UI en DD/MM/YYYY
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

  // ✅ si cambia area, elegir subarea default válida
  useEffect(() => {
    const list = SUBAREAS_BY_AREA[area] || []
    if (!list.includes(subarea)) setSubarea(list[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area])

  // ✅ cargar dashboard SOLO cuando esté en FFT > Paletizado
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

  // Exportar a Excel
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

  // ✅ estilos “empresariales”
  const pageBg = {
    borderRadius: 4,
    p: { xs: 1.5, md: 2.5 },
    background: 'linear-gradient(180deg, rgba(10,35,66,.22), rgba(10,35,66,.06))',
  }

  const card = {
    borderRadius: 4,
    border: '1px solid rgba(255,255,255,.08)',
    background: 'linear-gradient(180deg, rgba(255,255,255,.06), rgba(255,255,255,.03))',
    boxShadow: '0 10px 30px rgba(0,0,0,.18)',
    overflow: 'hidden'
  }

  const cardHeader = {
    px: 2,
    py: 1.5,
    display: 'flex',
    alignItems: 'center',
    gap: 1.5,
    background: 'linear-gradient(90deg, rgba(14,54,96,.55), rgba(14,54,96,.18))',
    borderBottom: '1px solid rgba(255,255,255,.08)'
  }

  const subtleText = { opacity: .75, fontSize: 12 }

  const metricChip = (label, tone = 'default') => {
    const base = {
      fontWeight: 800,
      borderRadius: 999,
      height: 34,
      px: 1,
      border: '1px solid rgba(255,255,255,.10)',
      background: 'rgba(255,255,255,.06)',
      color: '#eaf2ff',
    }

    if (tone === 'warn') return <Chip label={label} sx={{ ...base, background: 'rgba(250,204,21,.14)', color: '#fde68a' }} />
    if (tone === 'info') return <Chip label={label} sx={{ ...base, background: 'rgba(56,189,248,.14)', color: '#bae6fd' }} />
    if (tone === 'ok') return <Chip label={label} sx={{ ...base, background: 'rgba(34,197,94,.14)', color: '#bbf7d0' }} />
    if (tone === 'bad') return <Chip label={label} sx={{ ...base, background: 'rgba(239,68,68,.14)', color: '#fecaca' }} />
    return <Chip label={label} sx={base} />
  }

  return (
    <Box sx={ps.page}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 950, letterSpacing: .2, color: '#eaf2ff', lineHeight: 1.15 }}>
            Producción
          </Typography>
          <Typography sx={ps.pageSubtitle}>
            {headerSubtitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Exportar a Excel">
          <IconButton onClick={exportExcel} sx={{
            borderRadius: 2.5,
            border: '1px solid rgba(255,255,255,.12)',
            background: 'rgba(255,255,255,.06)',
            color: '#eaf2ff',
            '&:hover': { background: 'rgba(255,255,255,.10)' }
          }}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Resumen */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Resumen</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>
            Estado de solicitudes en Producción
          </Typography>
        </Box>

        <Stack direction="row" spacing={1.2} sx={{ p: 2 }} flexWrap="wrap" useFlexGap>
          {metricChip(`Total: ${resumen.total}`)}
          {metricChip(`Pendientes: ${resumen.pendientes}`, 'warn')}
          {metricChip(`En proceso: ${resumen.enproceso}`, 'info')}
          {metricChip(`Completadas: ${resumen.completadas}`, 'ok')}
          {metricChip(`Canceladas: ${resumen.canceladas}`, 'bad')}
        </Stack>
      </Paper>

      {/* ✅ FFT > Paletizado — Dashboard Diario */}
      {isFftPaletizado && (
        <Paper elevation={0} sx={{ ...card, mb: 2 }}>
          <Box sx={cardHeader}>
            <Box>
              <Typography sx={ps.cardHeaderTitle}>
                FFT &gt; Paletizado — Control diario
              </Typography>
              <Typography sx={ps.cardHeaderSubtitle}>
                Consulta por día y marca pallets como procesados/pendientes.
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* Fecha */}
            <TextField
              label="Día (DD/MM/AAAA)"
              value={dashDayDMY}
              onChange={(e) => {
                const v = e.target.value
                setDashDayDMY(v)
                const iso = dmyToISO(v)
                if (iso) setDashDayISO(iso)
              }}
              sx={{
                minWidth: 220,
                '& .MuiInputBase-root': {
                  borderRadius: 3,
                  backgroundColor: 'rgba(255,255,255,.06)',
                  color: '#eaf2ff',
                },
                '& .MuiInputLabel-root': { color: 'rgba(234,242,255,.75)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.14)' },
              }}
              placeholder="27/02/2026"
              helperText={`Consultando (ISO): ${dashDayISO}`}
              FormHelperTextProps={{ sx: { color: 'text.secondary' } }}
            />
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ px: 2, py: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {metricChip(`Total: ${dash.resumen?.total ?? 0}`)}
              {metricChip(`Pendientes: ${dash.resumen?.pendientes ?? 0}`, 'warn')}
              {metricChip(`Procesados: ${dash.resumen?.procesados ?? 0}`, 'ok')}
            </Stack>
          </Box>

          <Divider />

          <Box sx={{ p: 2 }}>
            <Table size="small" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableHead>
                <TableRow sx={{ background: 'rgba(14,54,96,.55)' }}>
                  <TableCell sx={{ fontWeight: 900, color: '#eaf2ff' }}>PalletID</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#eaf2ff' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 900, color: '#eaf2ff', textAlign: 'center' }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dash.rows || []).map((r, i) => (
                  <TableRow
                    key={r.id}
                    sx={{
                      background: i % 2 === 0 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.02)',
                      '&:hover': { background: 'rgba(56,189,248,.08)' }
                    }}
                  >
                    <TableCell sx={{ color: '#eaf2ff', fontWeight: 800 }}>{r.palletId}</TableCell>
                    <TableCell sx={{ color: '#cfe3ff' }}>{r.status}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDashStatus(r.id, r.status === 'PROCESADO' ? 'PENDIENTE' : 'PROCESADO')}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 900,
                          borderColor: 'rgba(255,255,255,.18)',
                          color: '#eaf2ff',
                          '&:hover': { borderColor: 'rgba(56,189,248,.55)', background: 'rgba(56,189,248,.10)' }
                        }}
                      >
                        {r.status === 'PROCESADO' ? 'Marcar Pendiente' : 'Marcar Procesado'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {(!dash.rows || dash.rows.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} sx={{ opacity: 0.8, color: '#cfe3ff' }}>
                      No hay pallets cargados para este día. (Importa el Excel o cambia la fecha)
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </Box>
        </Paper>
      )}

      {/* Nueva solicitud */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Nueva solicitud</Typography>
          <Typography sx={ps.cardHeaderSubtitle}>
            Registra una solicitud para el área/sub-área seleccionada.
          </Typography>
        </Box>

        <Box sx={{ p: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <TextField
              select
              label="Área"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              sx={{
                minWidth: 170,
                flex: '1 1 170px',
                '& .MuiInputBase-root': { borderRadius: 3, backgroundColor: 'rgba(255,255,255,.06)', color: '#eaf2ff' },
                '& .MuiInputLabel-root': { color: 'rgba(234,242,255,.75)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.14)' },
              }}
            >
              {AREAS.map(a => (
                <MenuItem key={a.code} value={a.code}>{a.label}</MenuItem>
              ))}
            </TextField>

            <TextField
              select
              label="Sub-área"
              value={subarea}
              onChange={(e) => setSubarea(e.target.value)}
              sx={{
                minWidth: 190,
                flex: '1 1 190px',
                '& .MuiInputBase-root': { borderRadius: 3, backgroundColor: 'rgba(255,255,255,.06)', color: '#eaf2ff' },
                '& .MuiInputLabel-root': { color: 'rgba(234,242,255,.75)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.14)' },
              }}
            >
              {(SUBAREAS_BY_AREA[area] || []).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="PalletID"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              sx={{
                flex: '2 1 220px',
                '& .MuiInputBase-root': { borderRadius: 3, backgroundColor: 'rgba(255,255,255,.06)', color: '#eaf2ff' },
                '& .MuiInputLabel-root': { color: 'rgba(234,242,255,.75)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.14)' },
              }}
            />

            <TextField
              label="Items"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              sx={{
                minWidth: 110,
                flex: '1 1 110px',
                '& .MuiInputBase-root': { borderRadius: 3, backgroundColor: 'rgba(255,255,255,.06)', color: '#eaf2ff' },
                '& .MuiInputLabel-root': { color: 'rgba(234,242,255,.75)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.14)' },
              }}
              inputProps={{ min: 1 }}
            />

            <TextField
              label="Nota"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{
                flex: '2 1 240px',
                '& .MuiInputBase-root': { borderRadius: 3, backgroundColor: 'rgba(255,255,255,.06)', color: '#eaf2ff' },
                '& .MuiInputLabel-root': { color: 'rgba(234,242,255,.75)' },
                '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.14)' },
              }}
            />

            <Button
              variant="contained"
              onClick={create}
              sx={{
                height: 52,
                px: 3,
                borderRadius: 3,
                fontWeight: 950,
                textTransform: 'none',
                background: 'linear-gradient(90deg, rgba(56,189,248,.85), rgba(37,99,235,.85))',
                boxShadow: '0 10px 25px rgba(0,0,0,.18)',
                '&:hover': { filter: 'brightness(1.06)' }
              }}
              disabled={!area || !subarea || !sku || Number(qty) <= 0}
            >
              Crear
            </Button>
          </Stack>

          {isFftAccesorios(area, subarea) && (
            <Typography sx={{ mt: 1.5, fontSize: 12, color: 'text.secondary' }}>
              *FFT &gt; Accesorios usará estantes H1–H5 en el siguiente paso (BINs/estantes).
            </Typography>
          )}
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper elevation={0} sx={{ ...card }}>
        <Box sx={cardHeader}>
          <Typography sx={{ fontWeight: 950, color: '#eaf2ff' }}>Solicitudes</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            select
            label="Filtrar status"
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            sx={{
              minWidth: 200,
              '& .MuiInputBase-root': { borderRadius: 3, backgroundColor: 'rgba(255,255,255,.06)', color: '#eaf2ff' },
              '& .MuiInputLabel-root': { color: 'rgba(234,242,255,.75)' },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(255,255,255,.14)' },
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
          <Table size="small" sx={{ minWidth: 980, borderRadius: 3, overflow: 'hidden' }}>
            <TableHead>
              <TableRow sx={{ background: 'rgba(14,54,96,.55)' }}>
                <TableCell sx={{ color: '#eaf2ff', fontWeight: 900 }}>Área</TableCell>
                <TableCell sx={{ color: '#eaf2ff', fontWeight: 900 }}>Sub-área</TableCell>
                <TableCell sx={{ color: '#eaf2ff', fontWeight: 900 }}>Status</TableCell>
                <TableCell sx={{ color: '#eaf2ff', fontWeight: 900 }}>Items</TableCell>
                <TableCell sx={{ color: '#eaf2ff', fontWeight: 900 }}>Solicitó</TableCell>
                <TableCell sx={{ color: '#eaf2ff', fontWeight: 900 }}>Nota</TableCell>
                <TableCell sx={{ color: '#eaf2ff', fontWeight: 900, textAlign: 'center' }}>Acción</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredRows.map((r, idx) => {
                let statusIcon = <HourglassEmptyIcon sx={{ color: '#fbbf24', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'EN PROCESO') statusIcon = <EditIcon sx={{ color: '#38bdf8', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'COMPLETADA') statusIcon = <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'CANCELADA') statusIcon = <CancelIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />

                  const itemsText = (r.items || []).map(i => `${i.sku}(${i.qty})`).join(', ')

                return (
                  <TableRow
                    key={r._id}
                    sx={{
                      background: idx % 2 === 0 ? 'rgba(255,255,255,.03)' : 'rgba(255,255,255,.02)',
                      '&:hover': { background: 'rgba(56,189,248,.08)' }
                    }}
                  >
                    <TableCell sx={{ color: '#eaf2ff', fontWeight: 900 }}>{areaLabel(r.area)}</TableCell>
                    <TableCell sx={{ color: '#cfe3ff' }}>{r.subarea || '—'}</TableCell>

                    <TableCell sx={{ color: '#cfe3ff' }}>
                      <Tooltip title={r.status} arrow>{statusIcon}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: '#eaf2ff', fontWeight: 800 }}>
                        {r.status}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#cfe3ff', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={itemsText} arrow>
                        <span>{itemsText.length > 30 ? itemsText.slice(0, 30) + '…' : itemsText}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ color: '#cfe3ff' }}>{r.requestedBy?.email || '—'}</TableCell>

                    <TableCell sx={{ color: '#cfe3ff', maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.note || '—'} arrow>
                        <span>{(r.note || '—').length > 30 ? (r.note || '—').slice(0, 30) + '…' : (r.note || '—')}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
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
                  <TableCell colSpan={7} sx={{ color: '#cfe3ff', opacity: 0.8 }}>
                    No hay solicitudes para el filtro seleccionado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>
    </Box>
  )
}
