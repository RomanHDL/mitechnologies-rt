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

import QrCode2Icon from '@mui/icons-material/QrCode2'
import PrintIcon from '@mui/icons-material/Print'
import SelectAllIcon from '@mui/icons-material/SelectAll'
import DeselectIcon from '@mui/icons-material/Deselect'

import dayjs from 'dayjs'

export default function QrPrintPage() {
  const { token, user } = useAuth()
  const ps = usePageStyles()
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [q, setQ] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 15
  const [selectedIds, setSelectedIds] = useState([])
  const [generating, setGenerating] = useState(false)
  const [genResult, setGenResult] = useState(null)
  const [showPreview, setShowPreview] = useState(false)
  const [previewLabels, setPreviewLabels] = useState([])

  const load = async () => {
    try {
      const res = await client.get('/api/pallets')
      setRows(Array.isArray(res.data) ? res.data : [])
    } catch (e) { console.error('Error loading pallets:', e) }
  }

  useEffect(() => { load() }, [token])

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
    return list
  }, [rows, q])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize
    return filtered.slice(start, start + pageSize)
  }, [filtered, page, totalPages])

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

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    let html = '<html><head><title>Etiquetas QR</title>'
    html += '<style>body{font-family:Arial,sans-serif;} .label{display:inline-block;margin:10px;padding:15px;border:1px solid #ccc;text-align:center;page-break-inside:avoid;} .label img{width:150px;height:150px;} .code{font-family:monospace;font-size:14px;font-weight:bold;margin-top:8px;}</style>'
    html += '</head><body>'
    previewLabels.forEach(function(label) {
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
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = function() { printWindow.print() }
  }

  return (
    <Box sx={ps.page}>
      <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between" sx={{ mb: 2 }} spacing={1.5}>
        <Box>
          <Typography variant="h6" sx={ps.pageTitle}>Impresion de Etiquetas QR</Typography>
          <Typography sx={ps.pageSubtitle}>Selecciona tarimas para generar e imprimir etiquetas QR</Typography>
        </Box>
        <Stack direction="row" spacing={1}>
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

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Chip label={'Total tarimas: ' + filtered.length} sx={ps.metricChip('info')} />
        <Chip label={'Seleccionadas: ' + selectedIds.length} sx={ps.metricChip(selectedIds.length > 0 ? 'ok' : 'default')} />
      </Stack>

      {genResult && genResult.error && (
        <Alert severity="error" sx={{ mb: 2 }}>{genResult.error}</Alert>
      )}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <TextField label="Buscar codigo, SKU o status" value={q} onChange={e => setQ(e.target.value)} sx={{ ...ps.inputSx, minWidth: 280 }} />
      </Stack>

      <Paper elevation={1} sx={{ ...ps.card, p: 0, overflowX: 'auto' }}>
        <Table size="small" sx={{ minWidth: 700 }}>
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
                  <TableCell sx={ps.cellText}>
                    <Chip size="small" label={r.status || 'IN_STOCK'} sx={ps.metricChip(r.status === 'IN_STOCK' ? 'ok' : r.status === 'OUT' ? 'bad' : 'default')} />
                  </TableCell>
                  <TableCell sx={ps.cellText}>{loc}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{dayjs(r.createdAt).format('YYYY-MM-DD')}</TableCell>
                </TableRow>
              )
            })}
            {!paginated.length && (
              <TableRow><TableCell colSpan={6}><Typography sx={ps.emptyText}>Sin tarimas para mostrar.</Typography></TableCell></TableRow>
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
          {previewLabels.length === 0 && (
            <Typography sx={ps.emptyText}>No se generaron etiquetas.</Typography>
          )}
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, justifyContent: 'center', pt: 1 }}>
            {previewLabels.map((label, i) => (
              <Paper key={i} variant="outlined" sx={{ p: 2, borderRadius: 2, textAlign: 'center', minWidth: 180 }}>
                {(label.qrDataUrl || label.qrUrl) && (
                  <Box component="img" src={label.qrDataUrl || label.qrUrl} sx={{ width: 140, height: 140, mb: 1 }} />
                )}
                <Typography sx={{ fontFamily: 'monospace', fontWeight: 800, fontSize: 14 }}>{label.code || label.palletCode || ''}</Typography>
                {label.sku && <Typography variant="caption" display="block" sx={ps.cellTextSecondary}>{label.sku}</Typography>}
                {label.lot && <Typography variant="caption" display="block" sx={ps.cellTextSecondary}>Lote: {label.lot}</Typography>}
                {label.location && <Typography variant="caption" display="block" sx={{ ...ps.cellTextSecondary, fontWeight: 700 }}>Ubic: {label.location}</Typography>}
                {label.totalQty != null && <Typography variant="caption" display="block" sx={ps.cellTextSecondary}>Cant: {label.totalQty}</Typography>}
              </Paper>
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowPreview(false)}>Cerrar</Button>
          <Button variant="contained" startIcon={<PrintIcon />} onClick={handlePrint}>Imprimir</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
