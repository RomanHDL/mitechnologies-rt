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
import AddIcon from '@mui/icons-material/Add'
import CloseIcon from '@mui/icons-material/Close'
import * as XLSX from 'xlsx'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import CircularProgress from '@mui/material/CircularProgress'

export default function CountsPage() {
  const { token, user } = useAuth()
  const role = String(user?.role || '').toUpperCase()
  const can = ['ADMIN', 'SUPERVISOR'].includes(role)

  const client = useMemo(() => api(token), [token])
  const ps = usePageStyles()

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)

  const [showDetail, setShowDetail] = useState(false)
  const [openCreate, setOpenCreate] = useState(false)

  const [page, setPage] = useState(1)
  const pageSize = 10

  // Create form
  const [area, setArea] = useState('A1')
  const [scope, setScope] = useState('AREA')
  const [level, setLevel] = useState('A')
  const [name, setName] = useState('')
  const [notes, setNotes] = useState('')

  // UI state
  const [loading, setLoading] = useState(false)
  const [busyId, setBusyId] = useState('')
  const [err, setErr] = useState('')
  const [okMsg, setOkMsg] = useState('')

  const safeId = (r) => r?.id || r?._id

  const load = async () => {
    if (!token) return
    setErr('')
    setOkMsg('')
    setLoading(true)
    try {
      const res = await client.get('/api/counts')
      setRows(Array.isArray(res.data) ? res.data : [])
      setPage(1)
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Error cargando conteos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token]) // eslint-disable-line react-hooks/exhaustive-deps

  const create = async () => {
    setErr('')
    setOkMsg('')
    try {
      if (!can) return setErr('No tienes permiso para crear conteos')
      if (!String(area || '').trim()) return setErr('Área requerida')
      if (!String(scope || '').trim()) return setErr('Scope requerido')

      setLoading(true)
      await client.post('/api/counts', {
        name,
        scope,
        area,
        level: scope === 'LEVEL' ? level : '',
        notes
      })

      setOpenCreate(false)
      setName('')
      setNotes('')
      setScope('AREA')
      setArea('A1')
      setLevel('A')
      setOkMsg('✅ Conteo creado')
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Error creando conteo')
    } finally {
      setLoading(false)
    }
  }

  // Filtros y búsqueda
  const filtered = useMemo(() => {
    let list = rows
    if (q) list = list.filter(r => (r.name || '').toLowerCase().includes(q.toLowerCase()))
    if (status) list = list.filter(r => String(r.status || '') === status)
    return list
  }, [rows, q, status])

  // Resumen superior
  const resumen = useMemo(() => {
    const st = (s) => String(s || '')
    return {
      total: filtered.length,
      abiertos: filtered.filter(r => st(r.status) === 'OPEN').length,
      review: filtered.filter(r => st(r.status) === 'REVIEW').length,
      aprobados: filtered.filter(r => st(r.status) === 'APPROVED').length,
      cerrados: filtered.filter(r => st(r.status) === 'CLOSED').length,
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
      Creo: r.createdBy?.email || '',
      Aprobó: r.approvedBy?.email || '',
      Creado: r.createdAt ? new Date(r.createdAt).toLocaleString() : ''
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Conteos')
    XLSX.writeFile(wb, 'conteos_ciclicos.xlsx')
  }

  // Acciones
  const patchStatus = async (id, nextStatus) => {
    if (!id) return
    setErr('')
    setOkMsg('')
    setBusyId(`${id}:${nextStatus}`)
    try {
      await client.patch(`/api/counts/${id}/status`, { status: nextStatus })
      setOkMsg(`✅ Status actualizado a ${nextStatus}`)
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || e?.message || 'Error actualizando status')
    } finally {
      setBusyId('')
    }
  }

  const closeCount = async (id) => patchStatus(id, 'CLOSED')
  const approveCount = async (id) => patchStatus(id, 'APPROVED')
  const cancelCount = async (id) => patchStatus(id, 'CANCELLED')

  // Modal de detalle
  const openDetail = (r) => { setSelected(r); setShowDetail(true) }
  const closeDetail = () => { setShowDetail(false) }

  // Paginación
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  /** Map statuses to chip tones */
  const statusTone = (s) => {
    const map = { OPEN: 'warn', REVIEW: 'info', APPROVED: 'ok', CLOSED: 'default', CANCELLED: 'bad' }
    return map[String(s || '')] || 'default'
  }

  const statusLabel = (s) => {
    const map = {
      OPEN: 'ABIERTO',
      REVIEW: 'EN REVISION',
      APPROVED: 'APROBADO',
      CLOSED: 'CERRADO',
      CANCELLED: 'CANCELADO'
    }
    return map[String(s || '')] || String(s || '—')
  }

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))

  return (
    <Box sx={ps.page}>
      <Box sx={{
        display: 'flex',
        alignItems: { xs: 'flex-start', md: 'center' },
        justifyContent: 'space-between',
        flexDirection: { xs: 'column', md: 'row' },
        gap: 1.5,
        mb: 2
      }}>
        <Box>
          <Typography variant="h6" sx={{ ...ps.pageTitle }}>Conteos cíclicos</Typography>
          <Typography variant="body2" sx={ps.pageSubtitle}>
            Administra conteos por área/nivel, cambia estatus y exporta reportes.
          </Typography>
        </Box>

        <Stack direction="row" spacing={1} alignItems="center">
          <Tooltip title="Exportar a Excel">
            <span>
              <IconButton onClick={exportExcel} sx={ps.actionBtn('primary')} disabled={!filtered.length}>
                <DownloadIcon />
              </IconButton>
            </span>
          </Tooltip>

          <Tooltip title={can ? 'Nuevo conteo' : 'Solo ADMIN/SUPERVISOR'}>
            <span>
              <Button
                disabled={!can}
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => { setShowDetail(false); setOpenCreate(true) }}
                sx={{
                  borderRadius: 2.5,
                  fontWeight: 900,
                  px: 2,
                  position: 'relative',
                  overflow: 'hidden',
                  '@keyframes shine': {
                    '0%': { transform: 'translateX(-120%)' },
                    '100%': { transform: 'translateX(220%)' }
                  },
                  '&:after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '40%',
                    height: '100%',
                    background: ps.isDark
                      ? 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)'
                      : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.55), transparent)',
                    transform: 'translateX(-120%)',
                    animation: 'shine 2.6s ease-in-out infinite',
                    pointerEvents: 'none'
                  }
                }}
              >
                Nuevo conteo
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Box>

      {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
      {okMsg && <Alert severity="success" sx={{ mb: 2 }}>{okMsg}</Alert>}

      {/* Resumen superior */}
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ mb: 2, flexWrap: 'wrap' }}>
        <Chip label={`Total: ${resumen.total}`} sx={ps.metricChip('default')} />
        <Chip label={`Abiertos: ${resumen.abiertos}`} sx={ps.metricChip('warn')} />
        <Chip label={`Revisión: ${resumen.review}`} sx={ps.metricChip('info')} />
        <Chip label={`Aprobados: ${resumen.aprobados}`} sx={ps.metricChip('ok')} />
        <Chip label={`Cerrados: ${resumen.cerrados}`} sx={ps.metricChip('default')} />
      </Stack>

      {/* Filtros */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.filterBar}>
          <TextField
            label="Buscar conteo"
            value={q}
            onChange={e => setQ(e.target.value)}
            sx={{ minWidth: 240, ...ps.inputSx }}
          />

          <TextField
            select
            label="Status"
            value={status}
            onChange={e => { setStatus(e.target.value); setPage(1) }}
            sx={{ minWidth: 180, ...ps.inputSx }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="OPEN">Abierto</MenuItem>
            <MenuItem value="REVIEW">En revisión</MenuItem>
            <MenuItem value="APPROVED">Aprobado</MenuItem>
            <MenuItem value="CLOSED">Cerrado</MenuItem>
            <MenuItem value="CANCELLED">Cancelado</MenuItem>
          </TextField>

          <Box sx={{ flex: 1 }} />

          {loading && (
            <Stack direction="row" spacing={1} alignItems="center">
              <CircularProgress size={18} />
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>Cargando...</Typography>
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Tabla */}
      <Paper elevation={1} sx={{ ...ps.card, p: 0 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: { xs: 850, md: 1050 } }}>
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>Nombre</TableCell>
                <TableCell>Scope</TableCell>
                <TableCell>Area</TableCell>
                <TableCell>Nivel</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Creo</TableCell>
                <TableCell sx={{ textAlign: 'center' }}>Acción</TableCell>
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

              {paginated.map((r, idx) => {
                const id = safeId(r)
                const st = String(r.status || '')
                const isBusy = (k) => busyId === `${id}:${k}`

                return (
                  <TableRow key={id || idx} sx={ps.tableRow(idx)}>
                    <TableCell sx={ps.cellText}>{r.name}</TableCell>
                    <TableCell sx={ps.cellText}>{r.scope}</TableCell>
                    <TableCell sx={ps.cellText}>{r.area}</TableCell>
                    <TableCell sx={ps.cellText}>{r.level || '—'}</TableCell>
                    <TableCell>
                      <Chip size="small" label={statusLabel(st)} sx={ps.metricChip(statusTone(st))} />
                    </TableCell>
                    <TableCell sx={ps.cellTextSecondary}>{r.createdBy?.email || '—'}</TableCell>

                    <TableCell sx={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                      <Tooltip title="Ver detalle">
                        <IconButton size="small" sx={ps.actionBtn('primary')} onClick={() => openDetail(r)}>
                          <InfoIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Aprobar conteo (pasa a APROBADO)">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('success'), ml: 0.5 }}
                            onClick={() => approveCount(id)}
                            disabled={!can || !(st === 'OPEN' || st === 'REVIEW')}
                          >
                            {isBusy('APPROVED') ? <CircularProgress size={16} /> : <EditIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Cerrar conteo (pasa a CERRADO)">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('warning'), ml: 0.5 }}
                            onClick={() => closeCount(id)}
                            disabled={!can || st !== 'APPROVED'}
                          >
                            {isBusy('CLOSED') ? <CircularProgress size={16} /> : <DoneIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>

                      <Tooltip title="Cancelar conteo">
                        <span>
                          <IconButton
                            size="small"
                            sx={{ ...ps.actionBtn('error'), ml: 0.5 }}
                            onClick={() => cancelCount(id)}
                            disabled={!can || ['CLOSED', 'CANCELLED'].includes(st)}
                          >
                            {isBusy('CANCELLED') ? <CircularProgress size={16} /> : <CancelIcon fontSize="small" />}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Box>

        {/* Paginación */}
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <Typography sx={{ color: 'text.secondary', fontSize: 14 }}>
            Página {page} de {totalPages}
          </Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Siguiente</Button>
        </Stack>
      </Paper>

      {/* Modal: Crear conteo */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{
          ...ps.cardHeaderTitle,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 1
        }}>
          Nuevo conteo
          <IconButton onClick={() => setOpenCreate(false)} sx={ps.actionBtn('primary')}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Alert severity="info" sx={{ fontSize: 13 }}>
              Crea un conteo por <b>AREA</b> o por <b>LEVEL</b>. Se generarán líneas por ubicación y quedará en <b>ABIERTO</b>.
            </Alert>

            <TextField
              label="Nombre (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              sx={ps.inputSx}
              placeholder="Ej: Conteo A1 - Nivel A"
            />

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
              <TextField
                select
                label="Scope"
                value={scope}
                onChange={(e) => setScope(e.target.value)}
                sx={{ flex: 1, ...ps.inputSx }}
              >
                <MenuItem value="AREA">AREA</MenuItem>
                <MenuItem value="LEVEL">LEVEL</MenuItem>
              </TextField>

              <TextField
                label="Área"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                sx={{ flex: 1, ...ps.inputSx }}
                placeholder="A1"
              />
            </Stack>

            {scope === 'LEVEL' && (
              <TextField
                label="Nivel"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                sx={ps.inputSx}
                placeholder="A"
              />
            )}

            <TextField
              label="Notas (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={ps.inputSx}
              multiline
              minRows={3}
              placeholder="Ej: Conteo programado semanal"
            />

            <Divider />
            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Siguiente paso recomendado: agregar una pantalla de “Detalle” para capturar conteo por ubicación
              (líneas: systemItems vs countedItems). Eso lo conectamos después.
            </Typography>
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button variant="contained" onClick={create} disabled={!can || loading}>
            {loading ? 'Creando...' : 'Crear'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Modal: Detalle */}
      <Dialog open={showDetail && !!selected} onClose={closeDetail} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>Detalle de conteo</DialogTitle>
        <DialogContent dividers>
          {selected && (
            <Stack spacing={1} sx={{ pt: 1 }}>
              <Typography variant="body2"><b>Nombre:</b> {selected.name}</Typography>
              <Typography variant="body2"><b>Scope:</b> {selected.scope}</Typography>
              <Typography variant="body2"><b>Area:</b> {selected.area}</Typography>
              <Typography variant="body2"><b>Nivel:</b> {selected.level || '—'}</Typography>
              <Typography variant="body2"><b>Status:</b> {statusLabel(selected.status)}</Typography>
              <Typography variant="body2"><b>Creo:</b> {selected.createdBy?.email || '—'}</Typography>
              <Typography variant="body2"><b>Aprobó:</b> {selected.approvedBy?.email || '—'}</Typography>

              <Typography variant="body2" sx={{ mt: 2, mb: 1 }}><b>Líneas del conteo:</b></Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                Aún no hay UI de captura por ubicación aquí. Si quieres, te hago:
                “Ver líneas”, “Capturar por ubicación”, “Diferencias”, y “Botón: enviar a ajustes”.
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
