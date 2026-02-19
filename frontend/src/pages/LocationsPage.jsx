import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Button from '@mui/material/Button'
import Chip from '@mui/material/Chip'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Tooltip from '@mui/material/Tooltip'
import EditIcon from '@mui/icons-material/Edit'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import BlockIcon from '@mui/icons-material/Block'
import Inventory2Icon from '@mui/icons-material/Inventory2'

const AREAS = ['A1','A2','A3','A4']
const HEIGHT_LABEL = { A1: 'PLANTA BAJA', B2: 'MEDIA', C3: 'ALTA' }
const rackOptions = Array.from({ length: 125 }, (_, i) => `F${String(i + 1).padStart(3, '0')}`)

function rackToArea(rackCode) {
  // F001..F125 -> A1..A4 (ajústalo si tu almacén lo maneja distinto)
  const n = Number(String(rackCode || '').replace(/[^\d]/g, '')) || 0
  if (n >= 1 && n <= 32) return 'A1'
  if (n >= 33 && n <= 64) return 'A2'
  if (n >= 65 && n <= 96) return 'A3'
  if (n >= 97 && n <= 125) return 'A4'
  return 'A1'
}

function normalizeRackCode(input) {
  const s = String(input || '').trim().toUpperCase()
  if (!s) return ''
  if (/^\d{1,3}$/.test(s)) return `F${s.padStart(3, '0')}`
  if (/^F\d{1,3}$/.test(s)) return `F${s.slice(1).padStart(3, '0')}`
  if (/^F\d{3}$/.test(s)) return s
  return s
}

// Acepta:
// - A1-F059-012 (exacto)
// - A1 F59 12 (inteligente)
// - F059 / 59 (solo rack)
// Devuelve { area?, rackCode?, height?, slot? } o null
function smartParse(input) {
  const raw = String(input || '').trim().toUpperCase()
  if (!raw) return null

  // exacto A1-F059-012
  let m = raw.match(/^(A1|B2|C3)-(F\d{3})-(\d{3})$/)
  if (m) return { height: m[1], rackCode: m[2], slot: Number(m[3]) }

  // limpiar separadores
  const cleaned = raw.replace(/[_/\\]+/g, ' ').replace(/-+/g, ' ').trim()
  const parts = cleaned.split(/\s+/).filter(Boolean)

  // solo rack
  if (parts.length === 1) {
    const rk = normalizeRackCode(parts[0])
    if (/^F\d{3}$/.test(rk)) return { rackCode: rk }
    return null
  }

  // height + rack + slot  (A1 F59 12)
  if (parts.length >= 3) {
    const height = parts[0]
    const rackCode = normalizeRackCode(parts[1])
    const slotNum = Number(String(parts[2]).replace(/\D/g, ''))

    if (!['A1','B2','C3'].includes(height)) return null
    if (!/^F\d{3}$/.test(rackCode)) return null
    if (!Number.isFinite(slotNum) || slotNum < 1 || slotNum > 12) return null

    return { height, rackCode, slot: slotNum }
  }

  return null
}

function stateColor(state) {
  if (state === 'BLOQUEADO') return '#fee2e2'
  if (state === 'OCUPADO') return '#dcfce7'
  return '#f3f4f6'
}

export default function LocationsPage() {
  const { token, user } = useAuth()
  const canEdit = ['ADMIN', 'SUPERVISOR'].includes(user?.role)
  const client = useMemo(() => api(token), [token])

  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(false)

  // filtros
  const [area, setArea] = useState('A1')
  const [rack, setRack] = useState('')        // F059
  const [state, setState] = useState('')      // VACIO/OCUPADO/BLOQUEADO
  const [q, setQ] = useState('')              // buscador inteligente

  // dialog editar/bloquear
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [type, setType] = useState('RACK')
  const [maxPallets, setMaxPallets] = useState(1)
  const [notes, setNotes] = useState('')
  const [reason, setReason] = useState('Mantenimiento')

  const load = async () => {
    setLoading(true)
    try {
      // ✅ pedimos TODO y filtramos en frontend (porque tu modelo actual no guarda "area")
      const res = await client.get('/api/locations')
      setRows(Array.isArray(res.data) ? res.data : [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [token])

  const filtered = useMemo(() => {
    let list = rows.map(l => ({
      ...l,
      _area: rackToArea(l.rackCode)
    }))

    if (area) list = list.filter(l => l._area === area)
    if (rack) list = list.filter(l => String(l.rackCode).toUpperCase() === String(rack).toUpperCase())
    if (state) list = list.filter(l => (l.state || 'VACIO') === state)

    return list
  }, [rows, area, rack, state])

  const summary = useMemo(() => {
    const s = { total: filtered.length, VACIO: 0, OCUPADO: 0, BLOQUEADO: 0 }
    for (const l of filtered) {
      const st = l.state || 'VACIO'
      if (s[st] !== undefined) s[st]++
    }
    return s
  }, [filtered])

  const openEdit = (l) => {
    setSelected(l)
    setType(l.type || 'RACK')
    setMaxPallets(l.maxPallets || 1)
    setNotes(l.notes || '')
    setReason(l.blockedReason || 'Mantenimiento')
    setOpen(true)
  }

  const save = async () => {
    await client.patch(`/api/locations/${selected._id}`, { type, maxPallets: Number(maxPallets), notes })
    await load()
    setOpen(false)
  }

  const block = async () => {
    await client.patch(`/api/locations/${selected._id}/block`, { reason })
    await load()
    setOpen(false)
  }

  const unblock = async () => {
    await client.patch(`/api/locations/${selected._id}/unblock`)
    await load()
    setOpen(false)
  }

  const applySmartSearch = () => {
    const parsed = smartParse(q)
    if (!parsed) return

    if (parsed.rackCode && !parsed.height) {
      // solo rack
      setRack(parsed.rackCode)
      setArea(rackToArea(parsed.rackCode))
      setState('')
      return
    }

    // buscar ubicación exacta
    setRack(parsed.rackCode)
    setArea(rackToArea(parsed.rackCode))
    // filtramos por height/slot localmente:
    // (si quieres, aquí puedes auto-scroll al card exacto)
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Ubicaciones</Typography>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2 }}>
        {!canEdit && (
          <Alert severity="warning" sx={{ mb: 2 }}>
            Solo ADMIN/SUPERVISOR puede editar ubicaciones y bloquear/desbloquear.
          </Alert>
        )}

        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs:'stretch', md:'center' }}>
          <TextField select size="small" label="Área (zona)" value={area} onChange={(e) => setArea(e.target.value)} sx={{ minWidth: 140 }}>
            {AREAS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
          </TextField>

          <TextField
            select
            size="small"
            label="Rack"
            value={rack}
            onChange={(e) => setRack(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            {rackOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          <TextField
            select
            size="small"
            label="Estado"
            value={state}
            onChange={(e) => setState(e.target.value)}
            sx={{ minWidth: 160 }}
          >
            <MenuItem value="">Todos</MenuItem>
            <MenuItem value="VACIO">VACÍO</MenuItem>
            <MenuItem value="OCUPADO">OCUPADO</MenuItem>
            <MenuItem value="BLOQUEADO">BLOQUEADO</MenuItem>
          </TextField>

          <TextField
            size="small"
            label='Buscar: "A1-F059-012" o "A1 F59 12" o "F059"'
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applySmartSearch()}
            sx={{ flex: 1 }}
          />
          <Button variant="contained" onClick={applySmartSearch}>Buscar</Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <Chip size="small" label={`Total: ${summary.total}`} />
          <Chip size="small" label={`VACÍO: ${summary.VACIO}`} sx={{ bgcolor:'#f3f4f6' }} />
          <Chip size="small" label={`OCUPADO: ${summary.OCUPADO}`} sx={{ bgcolor:'#dcfce7' }} />
          <Chip size="small" label={`BLOQUEADO: ${summary.BLOQUEADO}`} sx={{ bgcolor:'#fee2e2' }} />
          <Box sx={{ flex: 1 }} />
          <Button size="small" onClick={load} disabled={loading}>{loading ? 'Cargando...' : 'Recargar'}</Button>
        </Stack>
      </Paper>

      {/* Tabla moderna de ubicaciones */}
      <Paper elevation={1} sx={{ width: '100%', overflow: 'auto', borderRadius: 3, mb: 4 }}>
        <Box component="table" sx={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
          <Box component="thead" sx={{ background: '#101c2b', position: 'sticky', top: 0, zIndex: 1 }}>
            <Box component="tr">
              <Box component="th" sx={{ color: '#fff', fontWeight: 700, p: 1.5, textAlign: 'left', minWidth: 120 }}>Ubicación</Box>
              <Box component="th" sx={{ color: '#fff', fontWeight: 700, p: 1.5, textAlign: 'center', minWidth: 100 }}>Estado</Box>
              <Box component="th" sx={{ color: '#fff', fontWeight: 700, p: 1.5, textAlign: 'center', minWidth: 90 }}>Tipo</Box>
              <Box component="th" sx={{ color: '#fff', fontWeight: 700, p: 1.5, textAlign: 'center', minWidth: 80 }}>Capacidad</Box>
              <Box component="th" sx={{ color: '#fff', fontWeight: 700, p: 1.5, textAlign: 'center', minWidth: 120 }}>Notas / Motivo</Box>
              <Box component="th" sx={{ color: '#fff', fontWeight: 700, p: 1.5, textAlign: 'center', minWidth: 80 }}>Acción</Box>
            </Box>
          </Box>
          <Box component="tbody">
            {filtered.map((l, idx) => {
              const st = l.state || 'VACIO'
              const areaLabel = l._area
              const heightLabel = HEIGHT_LABEL[l.height] || l.height
              let stateIcon = <Inventory2Icon sx={{ color: '#64748b', verticalAlign: 'middle' }} fontSize="small" />
              if (st === 'OCUPADO') stateIcon = <CheckCircleIcon sx={{ color: '#22c55e', verticalAlign: 'middle' }} fontSize="small" />
              if (st === 'BLOQUEADO') stateIcon = <BlockIcon sx={{ color: '#ef4444', verticalAlign: 'middle' }} fontSize="small" />
              const noteText = l.blocked ? `Motivo: ${l.blockedReason || 'Bloqueado'}` : (l.notes || '—')
              return (
                <Box component="tr" key={l._id} sx={{ background: idx % 2 === 0 ? '#19233a' : '#101c2b', transition: 'background 0.2s', '&:hover': { background: '#22304d' } }}>
                  <Box component="td" sx={{ p: 1.5, fontFamily: 'monospace', fontWeight: 900, color: '#fff' }}>
                    {l.code}
                    <Typography variant="caption" sx={{ display: 'block', color: '#cbd5e1', fontWeight: 400 }}>
                      Área: <b>{areaLabel}</b> · Rack: <b>{l.rackCode}</b> · Altura: <b>{l.height} ({heightLabel})</b> · Slot: <b>{String(l.slot).padStart(3,'0')}</b>
                    </Typography>
                  </Box>
                  <Box component="td" sx={{ p: 1.5, textAlign: 'center' }}>
                    <Tooltip title={st} arrow>{stateIcon}</Tooltip>
                    <Typography variant="caption" sx={{ display: 'block', color: '#fff', fontWeight: 700 }}>{st}</Typography>
                  </Box>
                  <Box component="td" sx={{ p: 1.5, textAlign: 'center', color: '#fff' }}>{l.type || 'RACK'}</Box>
                  <Box component="td" sx={{ p: 1.5, textAlign: 'center', color: '#fff' }}>{l.maxPallets || 1}</Box>
                  <Box component="td" sx={{ p: 1.5, textAlign: 'center', color: '#fff', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    <Tooltip title={noteText} arrow>
                      <span>{noteText.length > 25 ? noteText.slice(0, 25) + '…' : noteText}</span>
                    </Tooltip>
                  </Box>
                  <Box component="td" sx={{ p: 1.5, textAlign: 'center' }}>
                    <Button size="small" variant="outlined" startIcon={<EditIcon />} onClick={() => openEdit(l)} sx={{ color: '#fff', borderColor: '#334155', '&:hover': { borderColor: '#64748b', background: '#1e293b' } }}>
                      Editar
                    </Button>
                  </Box>
                </Box>
              )
            })}
          </Box>
        </Box>
      </Paper>

      {/* Dialog */}
      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar ubicación</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ opacity: .8, mb: 2 }}>
            {selected ? `${selected.code} · Rack ${selected.rackCode} · ${selected.height} · Slot ${String(selected.slot).padStart(3,'0')}` : ''}
          </Typography>
          <Stack spacing={2}>
            <TextField select label="Tipo" value={type} onChange={(e)=>setType(e.target.value)}>
              {['RACK','FLOOR','QUARANTINE','RETURNS'].map(t => <MenuItem key={t} value={t}>{t}</MenuItem>)}
            </TextField>
            <TextField label="Capacidad (max tarimas)" type="number" value={maxPallets} onChange={(e)=>setMaxPallets(e.target.value)} />
            <TextField label="Notas" value={notes} onChange={(e)=>setNotes(e.target.value)} />
            <TextField label="Motivo de bloqueo" value={reason} onChange={(e)=>setReason(e.target.value)} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cerrar</Button>
          <Box sx={{ flex: 1 }} />
          <Button disabled={!canEdit} color="error" onClick={block}>Bloquear</Button>
          <Button disabled={!canEdit} onClick={unblock}>Desbloquear</Button>
          <Button disabled={!canEdit} variant="contained" onClick={save}>Guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
