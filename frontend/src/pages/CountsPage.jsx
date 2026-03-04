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
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import EditIcon from '@mui/icons-material/Edit'
import DoneIcon from '@mui/icons-material/Done'
import CancelIcon from '@mui/icons-material/Cancel'
import InfoIcon from '@mui/icons-material/Info'
import DownloadIcon from '@mui/icons-material/Download'
import * as XLSX from 'xlsx'
import Alert from '@mui/material/Alert'

export default function CountsPage() {
  const { token, user } = useAuth()
  const can = ['ADMIN','SUPERVISOR'].includes(user?.role)
  const client = useMemo(() => api(token), [token])
  const ps = usePageStyles()

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)
  const [showDetail, setShowDetail] = useState(false)
  const [page, setPage] = useState(1)
  const pageSize = 10
  const [area, setArea] = useState('A1')
  const [scope, setScope] = useState('AREA')
  const [level, setLevel] = useState('A')
  const [name, setName] = useState('')

  const load = async () => {
    const res = await client.get('/api/counts')
    setRows(res.data)
  }
  useEffect(() => { load() }, [token])

  const create = async () => {
    await client.post('/api/counts', { name, scope, area, level })
    setName('')
    await load()
  }

  // Filtros y busqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r => (r.name || '').toLowerCase().includes(q.toLowerCase()))
    if (status) list = list.filter(r => r.status === status)
    return list
  }, [rows, q, status])

  // Resumen superior
  const resumen = useMemo(() => {
    return {
      total: filtered.length,
      abiertos: filtered.filter(r => r.status === 'OPEN').length,
      cerrados: filtered.filter(r => r.status === 'CLOSED').length,
      validados: filtered.filter(r => r.status === 'VALIDATED').length
    }
  }, [filtered])

  // Exportar a Excel
  const exportExcel = () => {
    const data = filtered.map(r => ({
      Nombre: r.name,
      Scope: r.scope,
      Area: r.area,
      Nivel: r.level,
      Status: r.status,
      Creo: r.createdBy?.email || ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conteos')
    XLSX.writeFile(wb, 'conteos_ciclicos.xlsx')
  }

  // Acciones rapidas
  const closeCount = async (id) => {
    await client.patch(`/api/counts/${id}/status`, { status: 'CLOSED' })
    await load()
  }
  const validateCount = async (id) => {
    await client.patch(`/api/counts/${id}/status`, { status: 'VALIDATED' })
    await load()
  }

  // Modal de detalle
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  // Paginacion
  const paginated = useMemo(() => {
    const start = (page-1)*pageSize
    return filtered.slice(start, start+pageSize)
  }, [filtered, page])

  /** Map count statuses to metricChip tones */
  const statusTone = (s) => {
    const map = { OPEN: 'warn', CLOSED: 'info', VALIDATED: 'ok' }
    return map[s] || 'default'
  }

  return (
    <Box sx={ps.page}>
      <Typography variant="h6" sx={{ ...ps.pageTitle, mb: 2 }}>Conteos ciclicos</Typography>

      {/* Resumen superior */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Total: ${resumen.total}`} sx={ps.metricChip('default')} />
        <Chip label={`Abiertos: ${resumen.abiertos}`} sx={ps.metricChip('warn')} />
        <Chip label={`Cerrados: ${resumen.cerrados}`} sx={ps.metricChip('info')} />
        <Chip label={`Validados: ${resumen.validados}`} sx={ps.metricChip('ok')} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Exportar a Excel">
          <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')}>
            <DownloadIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* Filtros y busqueda */}
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField
          label="Buscar conteo"
          value={q}
          onChange={e => setQ(e.target.value)}
          sx={{ minWidth: 220, ...ps.inputSx }}
        />
        <TextField
          select
          label="Status"
          value={status}
          onChange={e => setStatus(e.target.value)}
          sx={{ minWidth: 140, ...ps.inputSx }}
        >
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="OPEN">Abierto</MenuItem>
          <MenuItem value="CLOSED">Cerrado</MenuItem>
          <MenuItem value="VALIDATED">Validado</MenuItem>
        </TextField>
        <Button disabled={!can} variant="contained" onClick={() => setShowDetail(false) || setOpenCreate(true)}>
          Nuevo conteo
        </Button>
      </Stack>

      {/* Tabla de conteos */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 700, md: 1000 } }}>
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>Nombre</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Area</TableCell>
                <TableCell>Nivel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Creo</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Accion</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography sx={ps.emptyText}>No se encontraron conteos</Typography>
                  </TableCell>
                </TableRow>
              )}
              {paginated.map((r, idx) => (
                <TableRow key={r._id} sx={ps.tableRow(idx)}>
                  <TableCell sx={ps.cellText}>{r.name}</TableCell>
                  <TableCell sx={ps.cellText}>{r.scope}</TableCell>
                  <TableCell sx={ps.cellText}>{r.area}</TableCell>
                  <TableCell sx={ps.cellText}>{r.level || '\u2014'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={r.status} sx={ps.metricChip(statusTone(r.status))} />
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.createdBy?.email || '\u2014'}</TableCell>
                  <TableCell sx={{ textAlign: 'center' }}>
                    <Tooltip title="Ver detalle">
                      <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}>
                        <InfoIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Cerrar conteo">
                      <span>
                        <IconButton
                          size="small"
                          sx={{ ...ps.actionBtn('warning'), ml: 0.5 }}
                          onClick={() => closeCount(r._id)}
                          disabled={r.status !== 'OPEN'}
                        >
                          <DoneIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                    <Tooltip title="Validar conteo">
                      <span>
                        <IconButton
                          size="small"
                          sx={{ ...ps.actionBtn('success'), ml: 0.5 }}
                          onClick={() => validateCount(r._id)}
                          disabled={r.status !== 'CLOSED'}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>

        {/* Paginacion */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Pagina {page} de {Math.max(1, Math.ceil(filtered.length / pageSize))}
          </Typography>
          <Button disabled={page * pageSize >= filtered.length} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* Modal de detalle de conteo */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>Detalle de conteo</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Typography variant="body2"><b>Nombre:</b> {selected.name}</Typography>
              <Typography variant="body2"><b>Scope:</b> {selected.scope}</Typography>
              <Typography variant="body2"><b>Area:</b> {selected.area}</Typography>
              <Typography variant="body2"><b>Nivel:</b> {selected.level || '\u2014'}</Typography>
              <Typography variant="body2"><b>Status:</b> {selected.status}</Typography>
              <Typography variant="body2"><b>Creo:</b> {selected.createdBy?.email || '\u2014'}</Typography>
              <Typography variant="body2" sx={{ mt: 2, mb: 1 }}><b>Lineas del conteo:</b></Typography>
              {/* Aqui podrias mostrar lineas reales si la API lo permite */}
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                (Simulacion de lineas, diferencias, incidencias, historial...)
              </Typography>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button variant="contained" onClick={closeDetail}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
