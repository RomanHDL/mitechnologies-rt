import React, { useEffect, useState, useMemo } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Stack from '@mui/material/Stack'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Table from '@mui/material/Table'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import TableCell from '@mui/material/TableCell'
import TableBody from '@mui/material/TableBody'
import Chip from '@mui/material/Chip'
import Alert from '@mui/material/Alert'
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import ImageIcon from '@mui/icons-material/Image'
import DownloadIcon from '@mui/icons-material/Download'
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty'
import CancelIcon from '@mui/icons-material/Cancel'
import * as XLSX from 'xlsx'
import { useTheme } from '@mui/material/styles'

// ✅ NUEVO (Centro de control)
import dayjs from 'dayjs'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import SearchIcon from '@mui/icons-material/Search'

export default function ProductsPage() {
  const { token, user } = useAuth()
  const isWriter = ['ADMIN', 'SUPERVISOR'].includes(user?.role)
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [q, setQ] = useState('')
  const [rows, setRows] = useState([])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ sku: '', description: '', brand: '', model: '', category: '', unit: 'pz' })
  const [err, setErr] = useState('')

  const [view, setView] = useState('table')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterActive, setFilterActive] = useState('')
  const [filterUnit, setFilterUnit] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')

  // ✅ Centro de control (trazabilidad)
  const [traceQ, setTraceQ] = useState('')
  const [traceRows, setTraceRows] = useState([])
  const [traceLoading, setTraceLoading] = useState(false)
  const [traceErr, setTraceErr] = useState('')

  const load = async () => {
    const res = await api().get('/api/products', { params: { q } })
    setRows(res.data)
  }

  useEffect(() => { load() }, [token, q]) // dejo token como estaba (no rompe)

  const create = async () => {
    setErr('')
    try {
      await api().post('/api/products', form)
      setOpen(false)
      setForm({ sku: '', description: '', brand: '', model: '', category: '', unit: 'pz' })
      await load()
    } catch (e) {
      setErr(e?.response?.data?.message || 'Error')
    }
  }

  // ✅ Centro de control: cargar movimientos por SKU o por tarima
  const loadTrace = async () => {
    const term = String(traceQ || '').trim()
    if (!term) {
      setTraceRows([])
      return
    }

    setTraceErr('')
    setTraceLoading(true)
    try {
      // Heurística: si trae letras, asumimos SKU; si no, palletCode
      const looksLikeSku = term.length <= 60 && /[A-Za-z]/.test(term)

      const res = await api().get('/api/movements', {
        params: looksLikeSku
          ? { sku: term, limit: 200 }
          : { palletCode: term, limit: 200 }
      })

      setTraceRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) {
      setTraceErr(e?.response?.data?.message || 'Error cargando trazabilidad')
    } finally {
      setTraceLoading(false)
    }
  }

  // Filtros y búsqueda
  const filtered = useMemo(() => {
    let list = rows
    if (filterCategory) list = list.filter(r => r.category === filterCategory)
    if (filterActive) list = list.filter(r => filterActive === 'Sí' ? r.isActive : !r.isActive)
    if (filterUnit) list = list.filter(r => r.unit === filterUnit)
    return list
  }, [rows, filterCategory, filterActive, filterUnit])

  // Resumen superior
  const resumen = useMemo(() => {
    return {
      total: rows.length,
      activos: rows.filter(r => r.isActive).length,
      categorias: Array.from(new Set(rows.map(r => r.category))).length
    }
  }, [rows])

  // Exportar a Excel
  const exportExcel = () => {
    const data = filtered.map(r => ({
      SKU: r.sku,
      Descripción: r.description,
      Categoría: r.category,
      Marca: r.brand,
      Modelo: r.model,
      Unidad: r.unit,
      Activo: r.isActive ? 'Sí' : 'No'
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Productos')
    XLSX.writeFile(wb, 'catalogo_productos.xlsx')
  }

  // Acciones rápidas
  const toggleActive = async (id, active) => {
    await api().patch(`/api/products/${id}/active`, { isActive: !active })
    await load()
  }
  const deleteProduct = async (id) => {
    await api().delete(`/api/products/${id}`)
    await load()
  }

  // Vista alternable
  const [showImages, setShowImages] = useState(false)

  // Helper function for area labels
  const areaLabel = (area) => {
    const labels = { 'P1': 'Incoming', 'P2': 'Sorting', 'P3': 'FFT', 'P4': 'OpenCell' }
    return labels[area] || area
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: .5 }}>
        Solicitudes (Operación)
      </Typography>
      <Typography variant="caption" sx={{ opacity: .75 }}>
        P1 Incoming · P2 Sorting · P3 FFT (Accesoríos) · P4 OpenCell
      </Typography>

      {/* Resumen superior */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <Chip label={`Total: ${resumen.total}`} color="primary" />
        <Chip label={`Activos: ${resumen.activos}`} sx={{ bgcolor: '#dcfce7', color: '#166534' }} />
        <Chip label={`Categorías: ${resumen.categorias}`} sx={{ bgcolor: '#bae6fd', color: '#0369a1' }} />
        <Box sx={{ flex: 1 }} />
        <Tooltip title="Exportar a Excel"><IconButton onClick={exportExcel}><DownloadIcon /></IconButton></Tooltip>
        <Button variant="outlined" onClick={() => setView(view === 'table' ? 'cards' : 'table')}>
          {view === 'table' ? 'Vista tarjetas' : 'Vista tabla'}
        </Button>
        <Button variant="outlined" onClick={() => setShowImages(v => !v)}>
          {showImages ? 'Ocultar imágenes' : 'Mostrar imágenes'}
        </Button>
      </Stack>

      {/* Filtros */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar (SKU, descripción, marca)" value={q} onChange={(e) => setQ(e.target.value)} sx={{ minWidth: 220 }} />
        <TextField select label="Categoría" value={filterCategory} onChange={e => setFilterCategory(e.target.value)} sx={{ minWidth: 140 }}>
          <MenuItem value="">Todas</MenuItem>
          {Array.from(new Set(rows.map(r => r.category))).map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
        </TextField>
        <TextField select label="Activo" value={filterActive} onChange={e => setFilterActive(e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Todos</MenuItem>
          <MenuItem value="Sí">Sí</MenuItem>
          <MenuItem value="No">No</MenuItem>
        </TextField>
        <TextField select label="Unidad" value={filterUnit} onChange={e => setFilterUnit(e.target.value)} sx={{ minWidth: 120 }}>
          <MenuItem value="">Todas</MenuItem>
          {Array.from(new Set(rows.map(r => r.unit))).map(u => <MenuItem key={u} value={u}>{u}</MenuItem>)}
        </TextField>
        <Button disabled={!isWriter} variant="contained" onClick={() => setOpen(true)}>Nuevo SKU</Button>
      </Stack>

      {/* ✅ Centro de control: Trazabilidad rápida */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            label="Rastreo (SKU o Código de tarima)"
            value={traceQ}
            onChange={(e) => setTraceQ(e.target.value)}
            fullWidth
          />
          <Button
            variant="contained"
            startIcon={<SearchIcon />}
            onClick={loadTrace}
            sx={{ minWidth: 220 }}
          >
            Buscar trazabilidad
          </Button>
        </Stack>

        {traceLoading && (
          <Box sx={{ mt: 2 }}>
            <LinearProgress />
          </Box>
        )}

        {traceErr && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {traceErr}
          </Alert>
        )}

        {!!traceRows.length && (
          <Box sx={{ mt: 2 }}>
            <Divider sx={{ mb: 2 }} />

            <Typography sx={{ fontWeight: 900, mb: 1 }}>
              Últimos movimientos ({traceRows.length})
            </Typography>

            <Box sx={{ maxHeight: 320, overflow: 'auto' }}>
              {traceRows.slice(0, 60).map((m, i) => (
                <Box
                  key={m.id || i}
                  sx={{
                    p: 1.2,
                    mb: 1,
                    borderRadius: 2,
                    border: isDark ? '1px solid rgba(255,255,255,.10)' : '1px solid rgba(21,101,192,.12)',
                    background: isDark ? 'rgba(255,255,255,.04)' : 'rgba(21,101,192,.03)',
                    display: 'grid',
                    gridTemplateColumns: { xs: '1fr', md: '180px 120px 1fr' },
                    gap: 1,
                    alignItems: 'center'
                  }}
                >
                  <Typography sx={{ fontSize: 12, opacity: .85 }}>
                    {m.createdAt ? dayjs(m.createdAt).format('YYYY-MM-DD HH:mm') : '—'}
                  </Typography>

                  <Chip
                    size="small"
                    label={m.type || '—'}
                    sx={{
                      bgcolor: m.type === 'IN' ? 'rgba(34,197,94,.15)' : 'rgba(239,68,68,.15)',
                      color: m.type === 'IN' ? (isDark ? '#e5e7eb' : '#1b5e20') : (isDark ? '#e5e7eb' : '#b71c1c'),
                      border: m.type === 'IN' ? '1px solid rgba(34,197,94,.25)' : '1px solid rgba(239,68,68,.25)',
                      fontWeight: 900,
                    }}
                  />

                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontFamily: 'monospace', fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.pallet?.code || '—'}
                    </Typography>
                    <Typography sx={{ fontSize: 12, opacity: .8, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {m.fromLocation ? (m.fromLocation.code || `${m.fromLocation.area}-${m.fromLocation.level}${m.fromLocation.position}`) : '—'}
                      {'  →  '}
                      {m.toLocation ? (m.toLocation.code || `${m.toLocation.area}-${m.toLocation.level}${m.toLocation.position}`) : '—'}
                      {m.user?.email ? ` · ${m.user.email}` : ''}
                    </Typography>
                    {!!m.note && (
                      <Typography sx={{ fontSize: 12, opacity: .7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {m.note}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ))}
            </Box>
          </Box>
        )}

        {!traceLoading && !traceRows.length && (
          <Typography sx={{ mt: 2, opacity: .75, fontSize: 13 }}>
            Tip: escribe un SKU o un código de tarima para ver su historial de movimientos.
          </Typography>
        )}
      </Paper>

      {view === 'table' ? (
        <Paper elevation={1} sx={{ p: 0, borderRadius: 3 }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ p: 2, pb: 0 }}>
            <TextField
              select
              label="Filtrar estatus"
              value={filtroStatus}
              onChange={e => setFiltroStatus(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              <MenuItem value="">Todos</MenuItem>
              <MenuItem value="PENDIENTE">Pendiente</MenuItem>
              <MenuItem value="EN PROCESO">En proceso</MenuItem>
              <MenuItem value="COMPLETADA">Completada</MenuItem>
              <MenuItem value="CANCELADA">Cancelada</MenuItem>
            </TextField>
          </Stack>

          <Table size="small" sx={{ minWidth: 900 }}>
            <TableHead>
              <TableRow sx={{ background: '#101c2b', position: 'sticky', top: 0, zIndex: 1 }}>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Área</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Status</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Items</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Solicitó</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700 }}>Nota</TableCell>
                <TableCell sx={{ color: '#fff', fontWeight: 700, textAlign: 'center' }}>Acción</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filtered.map((r, idx) => {
                // Ícono de estado
                let statusIcon = <HourglassEmptyIcon sx={{ color: '#eab308', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'EN PROCESO') statusIcon = <EditIcon sx={{ color: '#0369a1', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'COMPLETADA') statusIcon = <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
                if (r.status === 'CANCELADA') statusIcon = <CancelIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />

                const itemsText = (r.items || []).map(i => `${i.sku}(${i.qty})`).join(', ')

                return (
                  <TableRow
                    key={r._id || idx}
                    sx={{
                      background: idx % 2 === 0 ? '#19233a' : '#101c2b',
                      '&:hover': { background: '#22304d' }
                    }}
                  >
                    <TableCell sx={{ color: '#fff' }}>
                      {r.area} — {areaLabel(r.area)}
                    </TableCell>

                    <TableCell sx={{ color: '#fff' }}>
                      <Tooltip title={r.status} arrow>{statusIcon}</Tooltip>
                      <Typography variant="caption" sx={{ ml: 1, color: '#fff' }}>{r.status}</Typography>
                    </TableCell>

                    <TableCell sx={{ color: '#fff', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={itemsText} arrow>
                        <span>{itemsText.length > 35 ? itemsText.slice(0, 35) + '…' : itemsText}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ color: '#fff' }}>{r.requestedBy?.email || '—'}</TableCell>

                    <TableCell sx={{ color: '#fff', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      <Tooltip title={r.note || '—'} arrow>
                        <span>{(r.note || '—').length > 35 ? (r.note || '—').slice(0, 35) + '…' : (r.note || '—')}</span>
                      </Tooltip>
                    </TableCell>

                    <TableCell sx={{ textAlign: 'center' }}>
                      <Tooltip title="Editar (pendiente)">
                        <IconButton size="small" sx={{ color: '#0369a1' }}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Eliminar">
                        <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => deleteProduct(r._id)}>
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title={r.isActive ? 'Desactivar' : 'Activar'}>
                        <IconButton size="small" sx={{ color: '#22c55e' }} onClick={() => toggleActive(r._id, r.isActive)}>
                          {r.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </Paper>
      ) : (
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          {filtered.map((r, idx) => (
            <Paper
              key={r._id || idx}
              elevation={2}
              sx={{
                width: 260,
                p: 2,
                borderRadius: 3,
                mb: 2,
                background: '#19233a',
                color: '#fff',
                transition: 'background 0.2s',
                '&:hover': { background: '#22304d' }
              }}
            >
              <Stack spacing={1} alignItems="center">
                {showImages && (
                  r.imageUrl
                    ? <img src={r.imageUrl} alt={r.sku} style={{ width: 64, height: 64, borderRadius: 8 }} />
                    : <ImageIcon sx={{ color: '#64748b', fontSize: 48 }} />
                )}
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 800 }}>{r.sku}</Typography>
                <Typography variant="body2">{r.description || '—'}</Typography>
                <Typography variant="caption">{r.category || '—'}</Typography>
                <Typography variant="caption">{[r.brand, r.model].filter(Boolean).join(' / ') || '—'}</Typography>
                <Typography variant="caption">Unidad: {r.unit || 'pz'}</Typography>
                <Chip size="small" label={r.isActive ? 'Activo' : 'Inactivo'} color={r.isActive ? 'success' : 'error'} />
                <Stack direction="row" spacing={1}>
                  <Tooltip title="Editar (pendiente)">
                    <IconButton size="small" sx={{ color: '#0369a1' }}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton size="small" sx={{ color: '#ef4444' }} onClick={() => deleteProduct(r._id)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title={r.isActive ? 'Desactivar' : 'Activar'}>
                    <IconButton size="small" sx={{ color: '#22c55e' }} onClick={() => toggleActive(r._id, r.isActive)}>
                      {r.isActive ? <BlockIcon fontSize="small" /> : <CheckCircleIcon fontSize="small" />}
                    </IconButton>
                  </Tooltip>
                </Stack>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Nuevo SKU</DialogTitle>
        <DialogContent>
          {!isWriter && <Alert severity="warning" sx={{ mb: 2 }}>Solo ADMIN/SUPERVISOR puede crear SKUs.</Alert>}
          {err && <Alert severity="error" sx={{ mb: 2 }}>{err}</Alert>}
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="SKU" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            <TextField label="Descripción" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            <TextField label="Categoría" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
            <TextField label="Marca" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            <TextField label="Modelo" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} />
            <TextField label="Unidad" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancelar</Button>
          <Button disabled={!isWriter} variant="contained" onClick={create}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}