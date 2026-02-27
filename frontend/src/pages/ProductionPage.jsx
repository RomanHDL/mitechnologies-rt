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
  { code: 'P3', label: 'Palletizing' },
  { code: 'P4', label: 'OpenCell' },
]

const SUBAREAS_BY_AREA = {
  P1: ['Sorting'],
  P2: ['Palletizado', 'Produccion'],
  P3: ['Midea', 'O.C', 'ACC', 'OC'],
  P4: ['OpenCell', 'Technical'],
}

function areaLabel(code) {
  return AREAS.find(a => a.code === code)?.label || code
}

function isFftAccesorios(areaCode, subarea) {
  return areaCode === 'P2' && String(subarea || '').toLowerCase() === 'accesorios'
}

export default function ProductionPage() {
  const { token } = useAuth()

  const [rows, setRows] = useState([])

  // ✅ selección real
  const [area, setArea] = useState('P2') // FFT por default
  const [subarea, setSubarea] = useState('Accesorios')

  const [sku, setSku] = useState('TV-55-4K')
  const [qty, setQty] = useState(1)
  const [note, setNote] = useState('')

  const load = async () => {
    const res = await api(token).get('/api/production')
    setRows(Array.isArray(res.data) ? res.data : [])
  }

  useEffect(() => { load() }, [token])

  // ✅ si cambia area, elegir subarea default válida
  useEffect(() => {
    const list = SUBAREAS_BY_AREA[area] || []
    if (!list.includes(subarea)) setSubarea(list[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area])

  const create = async () => {
    await api(token).post('/api/production', {
      area, // P1..P4 (DB)
      subarea, // NUEVO
      items: [{ sku, qty: Number(qty) }],
      note
    })
    setNote('')
    await load()
  }

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

  const [filtroStatus, setFiltroStatus] = useState('')
  const filteredRows = rows.filter(r => !filtroStatus || r.status === filtroStatus)

  const headerSubtitle = useMemo(() => {
    const title = `${areaLabel(area)} > ${subarea}`
    if (isFftAccesorios(area, subarea)) return `${title}  (modo especial: estantes H1–H5)`
    return `${title}  (modo normal)`
  }, [area, subarea])

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

      {/* Nueva solicitud */}
      <Paper elevation={1} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 2 }}>
          Nueva solicitud
        </Typography>

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField
            select
            label="Área"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            sx={{ minWidth: 180 }}
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
            sx={{ minWidth: 220 }}
          >
            {(SUBAREAS_BY_AREA[area] || []).map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          <TextField label="SKU" value={sku} onChange={(e) => setSku(e.target.value)} fullWidth />
          <TextField label="Qty" type="number" value={qty} onChange={(e) => setQty(e.target.value)} sx={{ width: 120 }} />
          <TextField label="Nota" value={note} onChange={(e) => setNote(e.target.value)} fullWidth />
          <Button variant="contained" onClick={create}>Crear</Button>
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