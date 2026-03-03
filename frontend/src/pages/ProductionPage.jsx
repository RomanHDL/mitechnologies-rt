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
    rows: [],
  })

  // 🎨 estilos (moderno empresarial azul/blanco)
  const pageBg = {
    borderRadius: 4,
    p: { xs: 1, md: 2 },
  }

  const card = {
    p: 2,
    borderRadius: 4,
    mb: 2,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
    backdropFilter: 'blur(10px)',
  }

  const sectionTitle = {
    fontWeight: 900,
    letterSpacing: 0.2,
  }

  const tablePaper = {
    p: 0,
    borderRadius: 4,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))',
    border: '1px solid rgba(255,255,255,0.08)',
    boxShadow: '0 14px 40px rgba(0,0,0,0.25)',
    overflow: 'hidden',
  }

  const tableHeaderRow = {
    background: 'rgba(10, 30, 60, 0.9)',
    position: 'sticky',
    top: 0,
    zIndex: 2,
  }

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
      note,
    })
    setNote('')
    setSku('')
    setQty(1)
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
      Nota: r.note || '',
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
    canceladas: rows.filter(r => r.status === 'CANCELADA').length,
  }), [rows])

  const headerSubtitle = useMemo(() => {
    const title = `${areaLabel(area)} > ${subarea}`
    if (isFftAccesorios(area, subarea)) return `${title}  (modo especial: estantes H1–H5)`
    if (isFftPaletizado) return `${title}  (control diario)`
    return `${title}  (modo normal)`
  }, [area, subarea, isFftPaletizado])

  return (
    <Box sx={pageBg}>
      {/* Header */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 1000, letterSpacing: 0.3 }}>
          Producción
        </Typography>
        <Typography sx={{ opacity: 0.75, fontSize: 13 }}>
          {headerSubtitle}
        </Typography>
      </Box>

      {/* Resumen + acciones */}
      <Paper elevation={0} sx={{ ...card, mb: 2 }}>
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap alignItems="center">
          <Tooltip title="Total solicitudes">
            <Chip label={`Total: ${resumen.total}`} color="primary" variant="filled" />
          </Tooltip>
          <Tooltip title="Pendientes">
            <Chip label={`Pendientes: ${resumen.pendientes}`} sx={{ bgcolor: 'rgba(255, 244, 163, 0.9)', color: '#7a4a00', fontWeight: 700 }} />
          </Tooltip>
          <Tooltip title="En proceso">
            <Chip label={`En proceso: ${resumen.enproceso}`} sx={{ bgcolor: 'rgba(156, 232, 255, 0.85)', color: '#004e78', fontWeight: 700 }} />
          </Tooltip>
          <Tooltip title="Completadas">
            <Chip label={`Completadas: ${resumen.completadas}`} sx={{ bgcolor: 'rgba(187, 255, 210, 0.85)', color: '#0b5a24', fontWeight: 700 }} />
          </Tooltip>
          <Tooltip title="Canceladas">
            <Chip label={`Canceladas: ${resumen.canceladas}`} sx={{ bgcolor: 'rgba(255, 200, 200, 0.85)', color: '#7a1010', fontWeight: 700 }} />
          </Tooltip>

          <Box sx={{ flex: 1 }} />

          <Tooltip title="Exportar a Excel">
            <IconButton onClick={exportExcel} sx={{ color: '#fff' }}>
              <DownloadIcon />
            </IconButton>
          </Tooltip>
        </Stack>
      </Paper>

      {/* ✅ 1) DASHBOARD SIEMPRE ARRIBA (cuando aplica) */}
      {isFftPaletizado && (
        <Paper elevation={0} sx={card}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            alignItems={{ xs: 'stretch', md: 'center' }}
            flexWrap="wrap"
            useFlexGap
          >
            <Box>
              <Typography variant="subtitle1" sx={sectionTitle}>
                FFT &gt; Paletizado — Control diario
              </Typography>
              <Typography sx={{ opacity: 0.7, fontSize: 12 }}>
                Consulta por día y marca pallets como procesados/pendientes.
              </Typography>
            </Box>

            <Box sx={{ flex: 1 }} />

            {/* ✅ DD/MM/YYYY (UI) */}
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
                minWidth: 210,
                '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' },
              }}
              placeholder="27/02/2026"
              helperText={`Consultando (ISO): ${dashDayISO}`}
            />

            <Chip label={`Total: ${dash.resumen?.total ?? 0}`} sx={{ fontWeight: 700 }} />
            <Chip label={`Pendientes: ${dash.resumen?.pendientes ?? 0}`} sx={{ fontWeight: 700 }} />
            <Chip label={`Procesados: ${dash.resumen?.procesados ?? 0}`} sx={{ fontWeight: 700 }} />
          </Stack>

          <Divider sx={{ my: 2, opacity: 0.12 }} />

          {/* Tabla dashboard (contenida para que NO se “baje” raro) */}
          <Box sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
            <Box sx={{ maxHeight: 340, overflow: 'auto' }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow sx={tableHeaderRow}>
                    <TableCell sx={{ color: '#fff', fontWeight: 900 }}>PalletID</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Status</TableCell>
                    <TableCell sx={{ color: '#fff', fontWeight: 900, textAlign: 'center' }}>Acción</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {(dash.rows || []).map(r => (
                    <TableRow key={r.id} sx={{ background: 'rgba(255,255,255,0.02)' }}>
                      <TableCell sx={{ color: '#fff', fontWeight: 800 }}>{r.palletId}</TableCell>
                      <TableCell sx={{ color: '#fff' }}>{r.status}</TableCell>
                      <TableCell sx={{ textAlign: 'center' }}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => setDashStatus(r.id, r.status === 'PROCESADO' ? 'PENDIENTE' : 'PROCESADO')}
                          sx={{
                            borderColor: 'rgba(255,255,255,0.3)',
                            color: '#fff',
                            '&:hover': { borderColor: 'rgba(255,255,255,0.6)' },
                          }}
                        >
                          {r.status === 'PROCESADO' ? 'Marcar Pendiente' : 'Marcar Procesado'}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                  {(!dash.rows || dash.rows.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={3} sx={{ opacity: 0.8, color: '#fff' }}>
                        No hay pallets cargados para este día. (Importa el Excel o cambia la fecha)
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </Box>
          </Box>
        </Paper>
      )}

      {/* ✅ 2) NUEVA SOLICITUD (siempre debajo del dashboard cuando aplica) */}
      <Paper elevation={0} sx={card}>
        <Typography variant="subtitle1" sx={sectionTitle}>
          Nueva solicitud
        </Typography>
        <Typography sx={{ opacity: 0.7, fontSize: 12, mb: 2 }}>
          Registra una solicitud para el área/sub-área seleccionada.
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="Área"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            sx={{ minWidth: 170, flex: '1 1 170px', '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' } }}
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
            sx={{ minWidth: 190, flex: '1 1 190px', '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            {(SUBAREAS_BY_AREA[area] || []).map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="PalletID"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            sx={{ flex: '2 1 240px', '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' } }}
          />

          <TextField
            label="Items"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            sx={{ minWidth: 120, flex: '1 1 120px', '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' } }}
            inputProps={{ min: 1 }}
          />

          <TextField
            label="Nota"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ flex: '2 1 240px', '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' } }}
          />

          <Button
            variant="contained"
            onClick={create}
            sx={{ height: 56, px: 4, whiteSpace: 'nowrap', fontWeight: 900 }}
            disabled={!area || !subarea || !sku || Number(qty) <= 0}
          >
            Crear
          </Button>
        </Stack>

        {isFftAccesorios(area, subarea) && (
          <Typography sx={{ mt: 1.5, fontSize: 12, opacity: 0.75 }}>
            *FFT &gt; Accesorios usará estantes H1–H5 en el siguiente paso (BINs/estantes).
          </Typography>
        )}
      </Paper>

      {/* ✅ 3) TABLA FINAL (siempre al final, bien contenida) */}
      <Paper elevation={0} sx={tablePaper}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2, alignItems: 'center' }}>
          <Typography sx={{ fontWeight: 900, opacity: 0.9 }}>
            Solicitudes registradas
          </Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            select
            label="Filtrar status"
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            sx={{ minWidth: 210, '& .MuiInputBase-root': { bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="PENDIENTE">Pendiente</MenuItem>
            <MenuItem value="EN PROCESO">En proceso</MenuItem>
            <MenuItem value="COMPLETADA">Completada</MenuItem>
            <MenuItem value="CANCELADA">Cancelada</MenuItem>
          </TextField>
        </Stack>

        <Box sx={{ maxHeight: 520, overflow: 'auto' }}>
          <Table size="small" stickyHeader sx={{ minWidth: 1000 }}>
            <TableHead>
              <TableRow sx={tableHeaderRow}>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Área</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Sub-área</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Status</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Items</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Solicitó</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900 }}>Nota</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 900, textAlign: 'center' }}>Acción</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredRows.map((r, idx) => {
                let statusIcon = <HourglassEmptyIcon sx={{ color: '#eab308', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'EN PROCESO') statusIcon = <EditIcon sx={{ color: '#38bdf8', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'COMPLETADA') statusIcon = <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'CANCELADA') statusIcon = <CancelIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />

                const itemsText = (r.items || []).map(i => `${i.sku}(${i.qty})`).join(', ')
                const rowKey = r._id || r.id || `${r.area}-${r.subarea}-${idx}`

                return (
                  <TableRow
                    key={rowKey}
                    sx={{
                      background: idx % 2 === 0 ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.015)',
                      '&:hover': { background: 'rgba(56,189,248,0.08)' },
                    }}
                  >
                    <TableCell sx={{ color: '#fff', fontWeight: 900 }}>{areaLabel(r.area)}</TableCell>
                    <TableCell sx={{ color: '#fff' }}>{r.subarea || '—'}</TableCell>

                    <TableCell sx={{ color: '#fff' }}>
                      <Tooltip title={r.status} arrow>{statusIcon}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: '#fff', fontWeight: 700 }}>{r.status}</Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#fff', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={itemsText} arrow>
                        <span>{itemsText.length > 32 ? itemsText.slice(0, 32) + '…' : itemsText}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ color: '#fff' }}>{r.requestedBy?.email || '—'}</TableCell>

                    <TableCell sx={{ color: '#fff', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.note || '—'} arrow>
                        <span>{(r.note || '—').length > 32 ? (r.note || '—').slice(0, 32) + '…' : (r.note || '—')}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Marcar como completada">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ color: '#22c55e' }}
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
                            sx={{ color: '#ef4444' }}
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
                  <TableCell colSpan={7} sx={{ color: '#fff', opacity: 0.8, p: 3 }}>
                    No hay solicitudes para mostrar con ese filtro.
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