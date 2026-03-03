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
  { code: 'P3', label: 'Shipping' }, // ✅ antes: Palletizing
  { code: 'P4', label: 'OpenCell' },
]

const SUBAREAS_BY_AREA = {
  P1: ['Sorting'],
  // ✅ FFT: agregamos "Paletizado" (SIN QUITAR NADA)
  P2: ['Accesorios', 'Produccion', 'Paletizado'],
  // ✅ Shipping como área nueva
  P3: ['Shipping'],
  P4: ['OpenCell', 'Technical'],
}

function areaLabel(code) {
  return AREAS.find(a => a.code === code)?.label || code
}

function isFftAccesorios(areaCode, subarea) {
  return areaCode === 'P2' && String(subarea || '').toLowerCase() === 'accesorios'
}

// ✅ FIX: normaliza día a YYYY-MM-DD (tu DB guarda así)
function toIsoDay(input) {
  if (!input) return ''
  const s = String(input).trim()

  // ya viene en ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s

  // viene como DD/MM/YYYY
  const m = s.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)
  if (m) {
    const [, dd, mm, yyyy] = m
    return `${yyyy}-${mm}-${dd}`
  }

  // fallback: intentar Date()
  const d = new Date(s)
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  return ''
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
  const todayISO = new Date().toISOString().slice(0, 10)
  const [dashDay, setDashDay] = useState(todayISO)
  const [dash, setDash] = useState({
    resumen: { total: 0, pendientes: 0, procesados: 0 },
    rows: []
  })

  const load = async () => {
    const res = await api(token).get('/api/production')
    setRows(Array.isArray(res.data) ? res.data : [])
  }

  const loadDash = async (d) => {
    try {
      const iso = toIsoDay(d)
      if (!iso) {
        setDash({ resumen: { total: 0, pendientes: 0, procesados: 0 }, rows: [] })
        return
      }
      const res = await api(token).get(`/api/pallet-dashboard?day=${encodeURIComponent(iso)}`)
      setDash(res.data)
    } catch (e) {
      // si aún no existe el endpoint o falla, no rompemos Producción
      setDash({ resumen: { total: 0, pendientes: 0, procesados: 0 }, rows: [] })
    }
  }

  const setDashStatus = async (id, status) => {
    // (mandar day NO rompe aunque el backend no lo use)
    await api(token).patch(`/api/pallet-dashboard/${id}/status`, { status, day: toIsoDay(dashDay) })
    await loadDash(dashDay)
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
    if (isFftPaletizado) loadDash(dashDay)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFftPaletizado, dashDay, token])

  const create = async () => {
    await api(token).post('/api/production', {
      area, // P1..P4 (DB)
      subarea, // ✅ ya incluye Paletizado
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
    await api(token).patch(`/api/production/${id}/status`, { status: 'COMPLETADA' })
    await load()
  }

  const markCancelled = async (id) => {
    await api(token).patch(`/api/production/${id}/status`, { status: 'CANCELADA' })
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

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>Producción</Typography>
      <Typography sx={{ opacity: .75, mb: 2, fontSize: 13 }}>
        {headerSubtitle}
      </Typography>

      {/* Resumen */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        <Tooltip title="Total solicitudes"><Chip label={`Total: ${resumen.total}`} color="primary" /></Tooltip>
        <Tooltip title="Pendientes"><Chip label={`Pendientes: ${resumen.pendientes}`} sx={{ bgcolor: '#fef9c3', color: '#a16207' }} /></Tooltip>
        <Tooltip title="En proceso"><Chip label={`En proceso: ${resumen.enproceso}`} sx={{ bgcolor: '#bae6fd', color: '#0369a1' }} /></Tooltip>
        <Tooltip title="Completadas"><Chip label={`Completadas: ${resumen.completadas}`} sx={{ bgcolor: '#dcfce7', color: '#166534' }} /></Tooltip>
        <Tooltip title="Canceladas"><Chip label={`Canceladas: ${resumen.canceladas}`} sx={{ bgcolor: '#fee2e2', color: '#991b1b' }} /></Tooltip>
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Exportar a Excel">
          <IconButton onClick={exportExcel}><DownloadIcon /></IconButton>
        </Tooltip>
      </Stack>

      {/* ✅ FFT > Paletizado — Dashboard Diario */}
      {isFftPaletizado && (
        <Paper elevation={1} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="subtitle2" sx={{ fontWeight: 900 }}>
              FFT &gt; Paletizado — Control diario
            </Typography>

            <Box sx={{ flex: 1 }} />

            <TextField
              type="date"
              label="Día"
              value={toIsoDay(dashDay) || todayISO}
              onChange={(e) => setDashDay(e.target.value)}
              sx={{ minWidth: 180 }}
              InputLabelProps={{ shrink: true }}
            />

            <Chip label={`Total: ${dash.resumen?.total ?? 0}`} />
            <Chip label={`Pendientes: ${dash.resumen?.pendientes ?? 0}`} />
            <Chip label={`Procesados: ${dash.resumen?.procesados ?? 0}`} />
          </Stack>

          <Table size="small" sx={{ mt: 2 }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 800 }}>PalletID</TableCell>
                <TableCell sx={{ fontWeight: 800 }}>Status</TableCell>
                <TableCell sx={{ fontWeight: 800, textAlign: 'center' }}>Acción</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {(dash.rows || []).map(r => (
                <TableRow key={r.id}>
                  <TableCell>{r.palletId}</TableCell>
                  <TableCell>{r.status}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => setDashStatus(r.id, r.status === 'PROCESADO' ? 'PENDIENTE' : 'PROCESADO')}
                    >
                      {r.status === 'PROCESADO' ? 'Marcar Pendiente' : 'Marcar Procesado'}
                    </Button>
                  </TableCell>
                </TableRow>
              ))}

              {(!dash.rows || dash.rows.length === 0) && (
                <TableRow>
                  <TableCell colSpan={3} sx={{ opacity: 0.7 }}>
                    No hay pallets cargados para este día. (Importa el Excel o cambia la fecha)
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Paper>
      )}

      {/* Nueva solicitud */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
          Nueva solicitud
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center" flexWrap="wrap" useFlexGap>
          <TextField
            select
            label="Área"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            sx={{ minWidth: 150, flex: '1 1 150px' }}
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
            sx={{ minWidth: 160, flex: '1 1 160px' }}
          >
            {(SUBAREAS_BY_AREA[area] || []).map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="PalletID"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            sx={{ flex: '2 1 200px' }}
          />
          <TextField
            label="Items"
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            sx={{ minWidth: 100, flex: '1 1 100px' }}
            inputProps={{ min: 1 }}
          />
          <TextField
            label="Nota"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            sx={{ flex: '2 1 200px' }}
          />
          <Button
            variant="contained"
            onClick={create}
            sx={{ height: 56, px: 4, whiteSpace: 'nowrap' }}
            disabled={!area || !subarea || !sku || Number(qty) <= 0}
          >
            Crear
          </Button>
        </Stack>

        {isFftAccesorios(area, subarea) && (
          <Typography sx={{ mt: 1.5, fontSize: 12, opacity: .75 }}>
            *FFT &gt; Accesorios usará estantes H1–H5 en el siguiente paso (BINs/estantes).
          </Typography>
        )}
      </Paper>

      {/* Tabla */}
      <Paper elevation={1} sx={{ p: 0, borderRadius: 3 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2, pb: 0 }}>
          <TextField
            select
            label="Filtrar status"
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="PENDIENTE">Pendiente</MenuItem>
            <MenuItem value="EN PROCESO">En proceso</MenuItem>
            <MenuItem value="COMPLETADA">Completada</MenuItem>
            <MenuItem value="CANCELADA">Cancelada</MenuItem>
          </TextField>
        </Stack>

        <Table size="small" sx={{ minWidth: 1000 }}>
          <TableHead>
            <TableRow sx={{ background: '#101c2b', position: 'sticky', top: 0, zIndex: 1 }}>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Área</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Sub-área</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Items</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Solicitó</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Nota</TableCell>
              <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center' }}>Acción</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredRows.map((r, idx) => {
              let statusIcon = <HourglassEmptyIcon sx={{ color: '#eab308', verticalAlign: 'middle' }} fontSize="small" />
              if (r.status === 'EN PROCESO') statusIcon = <EditIcon sx={{ color: '#0369a1', verticalAlign: 'middle' }} fontSize="small" />
              if (r.status === 'COMPLETADA') statusIcon = <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
              if (r.status === 'CANCELADA') statusIcon = <CancelIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />

              const itemsText = (r.items || []).map(i => `${i.sku}(${i.qty})`).join(', ')

              return (
                <TableRow
                  key={r._id}
                  sx={{
                    background: idx % 2 === 0 ? '#19233a' : '#101c2b',
                    '&:hover': { background: '#22304d' }
                  }}
                >
                  <TableCell sx={{ color: '#fff', fontWeight: 800 }}>{areaLabel(r.area)}</TableCell>
                  <TableCell sx={{ color: '#fff' }}>{r.subarea || '—'}</TableCell>

                  <TableCell sx={{ color: '#fff' }}>
                    <Tooltip title={r.status} arrow>{statusIcon}</Tooltip>
                    <Typography variant="caption" sx={{ ml: 1, color: '#fff' }}>{r.status}</Typography>
                  </TableCell>

                  <TableCell sx={{ color: '#fff', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={itemsText} arrow>
                      <span>{itemsText.length > 25 ? itemsText.slice(0, 25) + '…' : itemsText}</span>
                    </Tooltip>
                  </TableCell>

                  <TableCell sx={{ color: '#fff' }}>{r.requestedBy?.email || '—'}</TableCell>

                  <TableCell sx={{ color: '#fff', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={r.note || '—'} arrow>
                      <span>{(r.note || '—').length > 25 ? (r.note || '—').slice(0, 25) + '…' : (r.note || '—')}</span>
                    </Tooltip>
                  </TableCell>

                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="Marcar como completada">
                      <IconButton
                        size="small"
                        sx={{ color: '#22c55e' }}
                        onClick={() => markCompleted(r._id)}
                        disabled={r.status === 'COMPLETADA' || r.status === 'CANCELADA'}
                      >
                        <DoneIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Cancelar">
                      <IconButton
                        size="small"
                        sx={{ color: '#ef4444' }}
                        onClick={() => markCancelled(r._id)}
                        disabled={r.status === 'COMPLETADA' || r.status === 'CANCELADA'}
                      >
                        <CancelIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  )
}