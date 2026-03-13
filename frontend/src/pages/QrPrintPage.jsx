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
import Checkbox from '@mui/material/Checkbox'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import CircularProgress from '@mui/material/CircularProgress'
import Grid from '@mui/material/Grid'

import QrCode2Icon from '@mui/icons-material/QrCode2'
import PrintIcon from '@mui/icons-material/Print'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import DeselectIcon from '@mui/icons-material/Deselect'
import InventoryIcon from '@mui/icons-material/Inventory'
import CheckBoxIcon from '@mui/icons-material/CheckBox'
import LabelIcon from '@mui/icons-material/Label'

import dayjs from 'dayjs'

const STATUS_OPTIONS = [
  { value: 'TODAS', label: 'Todas' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'QUARANTINE', label: 'Cuarentena' },
  { value: 'DAMAGED', label: 'Dañado' },
]

const AREA_OPTIONS = [
  { value: 'TODAS', label: 'Todas las áreas' },
  { value: 'A1', label: 'Area A1' },
  { value: 'A2', label: 'Area A2' },
  { value: 'A3', label: 'Area A3' },
  { value: 'A4', label: 'Area A4' },
]

const LABEL_SIZES = [
  { value: 'small', label: 'Pequeña (5cm)', imgWidth: 100, printWidth: '5cm' },
  { value: 'medium', label: 'Mediana (7.5cm)', imgWidth: 150, printWidth: '7.5cm' },
  { value: 'large', label: 'Grande (10cm)', imgWidth: 200, printWidth: '10cm' },
]

export default function QrPrintPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [statusFilter, setStatusFilter] = useState('TODAS')
  const [areaFilter, setAreaFilter] = useState('TODAS')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [selectedIds, setSelectedIds] = useState([])
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewLabels, setPreviewLabels] = useState([])
  const [labelSize, setLabelSize] = useState('medium')

  const load = async (search) => {
    try {
      const params = search ? { q: search } : {}
      const res = await client.get('/api/pallets', { params })
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading pallets:', e) }
  }

  useEffect(() => { load() }, [token])

  /* Debounced server-side search */
  useEffect(() => {
    if (!q) { load(); return }
    const timer = setTimeout(() => load(q), 400)
    return () => clearTimeout(timer)
  }, [q]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = rows
    if (q) {
      const qq = q.toLowerCase()
      list = list.filter(r =>
        (r.code || '').toLowerCase().includes(qq) ||
        (r.sku || '').toLowerCase().includes(qq) ||
        (r.status || '').toLowerCase().includes(qq)
      )
    }
    if (statusFilter !== 'TODAS') {
      list = list.filter(r => (r.status || 'IN_STOCK') === statusFilter)
    }
    if (areaFilter !== 'TODAS') {
      list = list.filter(r => r.location && r.location.area === areaFilter)
    }
    return list
  }, [rows, q, statusFilter, areaFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page])

  useEffect(() => { if (page > totalPages) setPage(totalPages) }, [totalPages, page])

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id)
      return [...prev, id]
    })
  }

  const selectAll = () => {
    const allIds = filtered.map(r => r.id || r._id)
    setSelectedIds(allIds)
  }

  const deselectAll = () => setSelectedIds([])

  const selectPage = () => {
    const pageIds = paginated.map(r => r.id || r._id)
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      pageIds.forEach(id => newSet.add(id))
      return Array.from(newSet)
    })
  }

  const togglePageAll = () => {
    const pageIds = paginated.map(r => r.id || r._id)
    const allSelected = pageIds.every(id => selectedIds.includes(id))
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)))
    } else {
      setSelectedIds(prev => {
        const newSet = new Set(prev)
        pageIds.forEach(id => newSet.add(id))
        return Array.from(newSet)
      })
    }
  }

  const generateQr = async () => {
    if (selectedIds.length === 0) return
    setGenerating(true)
    setGenResult(null)
    try {
      const res = await client.post('/api/qr/batch', { palletIds: selectedIds })
      setGenResult(res.data)
      setPreviewLabels(Array.isArray(res.data.labels) ? res.data.labels : [])
      setShowPreview(true)
    } catch (e) {
      console.error('Error generating QR:', e)
      setGenResult({ error: e?.response?.data?.message || 'Error al generar QR' })
    } finally { setGenerating(false) }
  }

  const currentLabelSize = LABEL_SIZES.find(s => s.value === labelSize) || LABEL_SIZES[1]

  const buildPrintHtml = (labels) => {
    const imgW = currentLabelSize.printWidth
    let html = '<html><head><title>Etiquetas QR</title>'
    html += '<style>body{font-family:Arial,sans-serif;} .label{display:inline-block;margin:10px;padding:15px;border:1px solid #ccc;text-align:center;page-break-inside:avoid;} .label img{width:' + imgW + ';height:' + imgW + ';} .code{font-family:monospace;font-size:14px;font-weight:bold;margin-top:8px;}</style>'
    html += '</head><body>'
    labels.forEach(function(label) {
      html += '<div class="label">'
      if (label.qrDataUrl) {
        html += '<img src="' + label.qrDataUrl + '" />'
      } else if (label.qrUrl) {
        html += '<img src="' + label.qrUrl + '" />'
      }
      html += '<div class="code">' + (label.code || label.palletCode || '') + '</div>'
      if (label.sku) html += '<div style="font-size:12px;color:#555;">' + label.sku + '</div>'
      if (label.lot) html += '<div style="font-size:11px;color:#777;">Lote: ' + label.lot + '</div>'
      if (label.location) html += '<div style="font-size:11px;color:#333;font-weight:bold;">Ubic: ' + label.location + '</div>'
      if (label.totalQty != null) html += '<div style="font-size:11px;color:#555;">Cant: ' + label.totalQty + '</div>'
      html += '</div>'
    })
    html += '</body></html>'
    return html
  }

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(buildPrintHtml(previewLabels))
    printWindow.document.close()
    printWindow.onload = function() { printWindow.print() }
  }

  const handlePrintSingle = (label) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(buildPrintHtml([label]))
    printWindow.document.close()
    printWindow.onload = function() { printWindow.print() }
  }

  /* KPI calculations */
  const labelsGenerated = genResult && !genResult.error && Array.isArray(genResult.labels) ? genResult.labels.length : 0

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Impresion de Etiquetas QR</Typography>
          <Typography sx={ps.pageSubtitle}>Selecciona tarimas para generar e imprimir etiquetas QR</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
          <Tooltip title="Seleccionar pagina">
            <IconButton onClick={selectPage} sx={ps.actionBtn('primary')}><CheckBoxIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Seleccionar todos">
            <IconButton onClick={selectAll} sx={ps.actionBtn('primary')}><SelectAllIcon /></IconButton>
          </Tooltip>
          <Tooltip title="Deseleccionar todos">
            <IconButton onClick={deselectAll} sx={ps.actionBtn('error')}><DeselectIcon /></IconButton>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={generating ? <CircularProgress size={18} color="inherit" /> : <QrCode2Icon />}
            onClick={generateQr}
            disabled={generating || selectedIds.length === 0}
            sx={{ borderRadius: 2 }}
          >
            {generating ? 'Generando...' : 'Generar QR (' + selectedIds.length + ')'}
          </Button>
        </Stack>
      </Stack>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <InventoryIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                  {filtered.length}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                  Total Tarimas
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={ps.kpiCard(selectedIds.length > 0 ? 'amber' : 'blue')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CheckBoxIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                  {selectedIds.length}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                  Seleccionadas
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper elevation={0} sx={ps.kpiCard(labelsGenerated > 0 ? 'green' : 'blue')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <LabelIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 28 }} />
              <Box>
                <Typography sx={{ fontSize: 22, fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>
                  {labelsGenerated}
                </Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'text.secondary', mt: 0.3 }}>
                  Etiquetas Generadas
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {genResult && genResult.error && (
        <Alert severity="error" sx={{ mb: 2 }}>{genResult.error}</Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar codigo, SKU o status" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 280 }} />
        <TextField
          select
          label="Status"
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1) }}
          sx={{ ...ps.inputSx, minWidth: 160 }}
        >
          {STATUS_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
        <TextField
          select
          label="Area"
          value={areaFilter}
          onChange={e => { setAreaFilter(e.target.value); setPage(1) }}
          sx={{ ...ps.inputSx, minWidth: 160 }}
        >
          {AREA_OPTIONS.map(o => <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>)}
        </TextField>
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 850 }}>
          <TableHead><TableRow sx={ps.tableHeaderRow}>
            <TableCell padding="checkbox">
              <Checkbox
                checked={paginated.length > 0 && paginated.every(r => selectedIds.includes(r.id || r._id))}
                indeterminate={paginated.some(r => selectedIds.includes(r.id || r._id)) && !paginated.every(r => selectedIds.includes(r.id || r._id))}
                onChange={togglePageAll}
              />
            </TableCell>
            <TableCell>Codigo</TableCell>
            <TableCell>SKU</TableCell>
            <TableCell>Lote</TableCell>
            <TableCell>Items</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Ubicacion</TableCell>
            <TableCell>Fecha</TableCell>
          </TableRow></TableHead>
          <TableBody>
            {paginated.map((r, idx) => {
              const id = r.id || r._id
              const isSelected = selectedIds.includes(id)
              const loc = r.location
                ? (r.location.code || (r.location.area + '-' + r.location.level + r.location.position))
                : '-'
              return (
                <TableRow key={id} sx={{ ...ps.tableRow(idx), cursor: 'pointer' }} onClick={() => toggleSelect(id)} selected={isSelected}>
                  <TableCell padding="checkbox">
                    <Checkbox checked={isSelected} onChange={() => toggleSelect(id)} onClick={e => e.stopPropagation()} />
                  </TableCell>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 700 }}>{r.code || id}</TableCell>
                  <TableCell sx={ps.cellText}>{r.sku || '-'}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{r.lot || r.lote || '-'}</TableCell>
                  <TableCell sx={ps.cellText}>{r.itemCount != null ? r.itemCount : (r.items ? r.items.length : '-')}</TableCell>
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={r.status || 'IN_STOCK'} sx={ps.metricChip(
                      r.status === 'IN_STOCK' ? 'ok'
                        : r.status === 'QUARANTINE' ? 'warn'
                        : r.status === 'DAMAGED' ? 'bad'
                        : r.status === 'OUT' ? 'bad'
                        : 'default'
                    )} />
                  </TableCell>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontSize: 12 }}>{loc}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD')}</TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (
              <TableRow><TableCell colSpan={8}><Typography sx={ps.emptyText}>Sin tarimas para mostrar.</Typography></TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center" sx={{ py: 2 }}>
          <Button disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>Anterior</Button>
          <Typography sx={ps.cellText}>{'Pagina ' + page + ' de ' + totalPages}</Typography>
          <Button disabled={page >= totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Siguiente</Button>
        </Stack>
      </Paper>

      <Dialog open={showPreview} onClose={() => setShowPreview(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={ps.pageTitle}>Vista Previa de Etiquetas</DialogTitle>
        <DialogContent dividers>
          {/* Label size selector */}
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ mb: 2 }}>
            <TextField
              select
              label="Tamano de etiqueta"
              value={labelSize}
              onChange={e => setLabelSize(e.target.value)}
              sx={{ ...ps.inputSx, minWidth: 200 }}
              size="small"
            >
              {LABEL_SIZES.map(s => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </TextField>
            <Typography variant="caption" sx={ps.cellTextSecondary}>
              {previewLabels.length + ' etiqueta(s) generada(s)'}
            </Typography>
          </Stack>

          {previewLabels.length === 0 && (
            <Typography sx={ps.emptyText}>No se generaron etiquetas.</Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', pt: 1 }}>
            {previewLabels.map((label, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', minWidth: 180 }}>
                {(label.qrDataUrl || label.qrUrl) && (
                  <Box component="img" src={label.qrDataUrl || label.qrUrl} sx={{ width: currentLabelSize.imgWidth, height: currentLabelSize.imgWidth, mb: 1 }} />
                )}
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{label.code || label.palletCode || ''}</Typography>
                {label.sku && <Typography variant="caption" display="block" sx={ps.cellTextSecondary}>{label.sku}</Typography>}
                {label.lot && <Typography variant="caption" display="block" sx={ps.cellTextSecondary}>Lote: {label.lot}</Typography>}
                {label.location && <Typography variant="caption" display="block" sx={{ ...ps.cellTextSecondary, fontWeight: 700 }}>Ubic: {label.location}</Typography>}
                {label.totalQty != null && <Typography variant="caption" display="block" sx={ps.cellTextSecondary}>Cant: {label.totalQty}</Typography>}
                <Button
                  size="small"
                  startIcon={<PrintIcon />}
                  onClick={() => handlePrintSingle(label)}
                  sx={{ mt: 1, fontSize: 11, textTransform: 'none' }}
                >
                  Imprimir Individual
                </Button>
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Cerrar</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Imprimir Todas</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
