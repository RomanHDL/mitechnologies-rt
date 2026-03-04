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

  return (
    <Box sx={ps.page}>
      {/* Header */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1} alignItems={{ xs: 'flex-start', md: 'center' }} sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ ...ps.pageTitle, lineHeight: 1.15 }}>
            Producción
          </Typography>
          <Typography sx={ps.pageSubtitle}>
            {headerSubtitle}
          </Typography>
        </Box>

        <Box sx={{ flex: 1 }} />

        <Tooltip title="Exportar a Excel">
          <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}>
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
          <Chip label={`Total: ${resumen.total}`} sx={ps.metricChip()} />
          <Chip label={`Pendientes: ${resumen.pendientes}`} sx={ps.metricChip('warn')} />
          <Chip label={`En proceso: ${resumen.enproceso}`} sx={ps.metricChip('info')} />
          <Chip label={`Completadas: ${resumen.completadas}`} sx={ps.metricChip('ok')} />
          <Chip label={`Canceladas: ${resumen.canceladas}`} sx={ps.metricChip('bad')} />
        </Stack>
      </Paper>

      {/* ✅ FFT > Paletizado — Dashboard Diario */}
      {isFftPaletizado && (
        <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
          <Box sx={ps.cardHeader}>
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
              sx={{ minWidth: 220, ...ps.inputSx }}
              placeholder="27/02/2026"
              helperText={`Consultando (ISO): ${dashDayISO}`}
              FormHelperTextProps={{ sx: { color: 'text.secondary' } }}
            />
          </Box>

          <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ px: 2, py: 1.5 }}>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Chip label={`Total: ${dash.resumen?.total ?? 0}`} sx={ps.metricChip()} />
              <Chip label={`Pendientes: ${dash.resumen?.pendientes ?? 0}`} sx={ps.metricChip('warn')} />
              <Chip label={`Procesados: ${dash.resumen?.procesados ?? 0}`} sx={ps.metricChip('ok')} />
            </Stack>
            <Box sx={{ flex: 1 }} />
          </Stack>

          <Divider />

          <Box sx={{ p: 2 }}>
            <Table size="small" sx={{ borderRadius: 3, overflow: 'hidden' }}>
              <TableHead>
                <TableRow sx={ps.tableHeaderRow}>
                  <TableCell>PalletID</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>Acción</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {(dash.rows || []).map((r, i) => (
                  <TableRow
                    key={r.id}
                    sx={ps.tableRow(i)}
                  >
                    <TableCell sx={{ ...ps.cellText, fontWeight: 800 }}>{r.palletId}</TableCell>
                    <TableCell sx={ps.cellTextSecondary}>{r.status}</TableCell>
                    <TableCell sx={{ textAlign: 'center' }}>
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => setDashStatus(r.id, r.status === 'PROCESADO' ? 'PENDIENTE' : 'PROCESADO')}
                        sx={{
                          borderRadius: 3,
                          textTransform: 'none',
                          fontWeight: 900,
                        }}
                      >
                        {r.status === 'PROCESADO' ? 'Marcar Pendiente' : 'Marcar Procesado'}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}

                {(!dash.rows || dash.rows.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={3} sx={ps.emptyText}>
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
              sx={{ minWidth: 170, flex: '1 1 170px', ...ps.inputSx }}
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
              sx={{ minWidth: 190, flex: '1 1 190px', ...ps.inputSx }}
            >
              {(SUBAREAS_BY_AREA[area] || []).map(s => (
                <MenuItem key={s} value={s}>{s}</MenuItem>
              ))}
            </TextField>

            <TextField
              label="PalletID"
              value={sku}
              onChange={(e) => setSku(e.target.value)}
              sx={{ flex: '2 1 220px', ...ps.inputSx }}
            />

            <TextField
              label="Items"
              type="number"
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              sx={{ minWidth: 110, flex: '1 1 110px', ...ps.inputSx }}
              inputProps={{ min: 1 }}
            />

            <TextField
              label="Nota"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              sx={{ flex: '2 1 240px', ...ps.inputSx }}
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
      <Paper elevation={0} sx={{ ...ps.card }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Solicitudes</Typography>
          <Box sx={{ flex: 1 }} />
          <TextField
            select
            label="Filtrar status"
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value)}
            sx={{ minWidth: 200, ...ps.inputSx }}
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
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>Área</TableCell>
                <TableCell>Sub-área</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Solicitó</TableCell>
                <TableCell>Nota</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acción</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredRows.map((r, idx) => {
                let statusIcon = <HourglassEmptyIcon sx={{ color: 'warning.main', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'EN PROCESO') statusIcon = <EditIcon sx={{ color: 'info.main', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'COMPLETADA') statusIcon = <CheckCircleIcon sx={{ color: 'success.main', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'CANCELADA') statusIcon = <CancelIcon sx={{ color: 'error.main', verticalAlign: 'middle' }} fontSize="small" />

                const itemsText = (r.items || []).map(i => `${i.sku}(${i.qty})`).join(', ')

                return (
                  <TableRow
                    key={r._id}
                    sx={ps.tableRow(idx)}
                  >
                    <TableCell sx={{ ...ps.cellText, fontWeight: 900 }}>{areaLabel(r.area)}</TableCell>
                    <TableCell sx={ps.cellTextSecondary}>{r.subarea || '—'}</TableCell>

                    <TableCell sx={ps.cellTextSecondary}>
                      <Tooltip title={r.status} arrow>{statusIcon}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: 'text.primary', fontWeight: 800 }}>
                        {r.status}
                      </Typography>
                    </TableCell>

                    <TableCell sx={{ ...ps.cellTextSecondary, maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={itemsText} arrow>
                        <span>{itemsText.length > 30 ? itemsText.slice(0, 30) + '…' : itemsText}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={ps.cellTextSecondary}>{r.requestedBy?.email || '—'}</TableCell>

                    <TableCell sx={{ ...ps.cellTextSecondary, maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.note || '—'} arrow>
                        <span>{(r.note || '—').length > 30 ? (r.note || '—').slice(0, 30) + '…' : (r.note || '—')}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Marcar como completada">
                        <span>
                          <IconButton
                            size="small"
                            sx={ps.actionBtn('success')}
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
                            sx={{ ml: 1, ...ps.actionBtn('error') }}
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
                  <TableCell colSpan={7} sx={ps.emptyText}>
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
