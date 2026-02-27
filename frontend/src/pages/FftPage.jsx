import React, { useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { socket } from '../lib/socket'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import LinearProgress from '@mui/material/LinearProgress'
import Button from '@mui/material/Button'

function cellColor(state) {
  if (state === 'BLOQUEADO') return '#3b0a0a'
  if (state === 'OCUPADO') return '#083a1f'
  return '#111827'
}
function cellBorder(state) {
  if (state === 'BLOQUEADO') return '1px solid rgba(239,68,68,.35)'
  if (state === 'OCUPADO') return '1px solid rgba(34,197,94,.35)'
  return '1px solid rgba(255,255,255,.08)'
}

// ✅ Mapeo UI Profesional (NO rompe DB)
// DB: A1..A4
// UI: Incoming/Sorting/FFT/OpenCell
const AREAS = [
  { db: 'A1', label: 'Incoming' },
  { db: 'A2', label: 'Sorting' },
  { db: 'A3', label: 'FFT' },
  { db: 'A4', label: 'OpenCell' },
]

// ✅ Sub-áreas (ejemplo profesional).
// Aquí puedes ajustar nombres exactos sin tocar BD: solo cambia strings.
const SUBAREAS_BY_AREA = {
  A1: ['Recepción', 'Calidad', 'Staging'],
  A2: ['Clasificación', 'Re-etiquetado', 'Rework'],
  A3: ['Accesorios', 'Picking', 'Empaque'],
  A4: ['OpenCell', 'Buffer', 'Auditoría'],
}

function isFftAccesorios(areaDb, subarea) {
  return areaDb === 'A3' && String(subarea || '').toLowerCase() === 'accesorios'
}

// ✅ Construye el string que se guarda/consulta en DB en subarea.
// (lo dejamos claro y consistente)
function buildSubareaKey(areaDb, subarea) {
  const areaLabel = AREAS.find(a => a.db === areaDb)?.label || areaDb
  // Ej: "FFT > Accesorios"
  return `${areaLabel} > ${subarea}`
}

export default function FftPage() {
  const client = useMemo(() => api(), [])

  // ✅ selector principal
  const [areaDb, setAreaDb] = useState('A3') // FFT por default
  const [subarea, setSubarea] = useState('Accesorios')

  // datos
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('TODOS') // TODOS | VACIO | OCUPADO | BLOQUEADO
  const [selected, setSelected] = useState(null)

  // normal grid bins
  const [locs, setLocs] = useState([])

  // especial FFT accesorios (H1..H5)
  const [heights, setHeights] = useState([])

  const load = async () => {
    setLoading(true)
    try {
      setSelected(null)

      if (isFftAccesorios(areaDb, subarea)) {
        // ✅ Caso especial “estantes por altura”
        const res = await client.get('/api/locations/fft/accesorios', { params: { area: areaDb } })
        setHeights(res.data?.heights || [])
        setLocs([])
      } else {
        // ✅ Caso normal: grid de bins por subárea
        const subareaKey = buildSubareaKey(areaDb, subarea)
        const res = await client.get('/api/locations/bins', { params: { area: areaDb, subarea: subareaKey } })
        setLocs(res.data?.locations || [])
        setHeights([])
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // si cambias area, setea subarea default de esa area
    const list = SUBAREAS_BY_AREA[areaDb] || []
    if (!list.includes(subarea)) setSubarea(list[0] || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaDb])

  useEffect(() => { load() }, [areaDb, subarea]) // recarga cuando cambia selección

  // ✅ Tiempo real: escuchamos cualquier update y recargamos (no rompe tu socket)
  useEffect(() => {
    const onAnyUpdate = () => load()
    socket.on('rack:update', onAnyUpdate) // si ya emites esto, funciona
    socket.on('location:update', onAnyUpdate) // si en el futuro lo agregas, también
    return () => {
      socket.off('rack:update', onAnyUpdate)
      socket.off('location:update', onAnyUpdate)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaDb, subarea])

  const matchesFilter = (state) => {
    if (filter === 'TODOS') return true
    if (filter === 'VACIO') return state === 'VACIO'
    return state === filter
  }

  const stats = useMemo(() => {
    const list = heights.length ? heights.map(h => ({ state: h.state })) : locs
    let ocupadas = 0, bloqueadas = 0, vacias = 0
    for (const x of list) {
      const st = x?.state || 'VACIO'
      if (st === 'OCUPADO') ocupadas++
      else if (st === 'BLOQUEADO') bloqueadas++
      else vacias++
    }
    const cap = list.length || 0
    const pct = cap ? Math.round((ocupadas / cap) * 100) : 0
    return { ocupadas, bloqueadas, vacias, pct, cap }
  }, [locs, heights])

  const headerTitle = useMemo(() => {
    const areaLabel = AREAS.find(a => a.db === areaDb)?.label || areaDb
    if (isFftAccesorios(areaDb, subarea)) return `${areaLabel} > ${subarea} (Estantes)`
    return `${areaLabel} > ${subarea} (BINs)`
  }, [areaDb, subarea])

  // =========================
  // UI Helpers (tarjetas)
  // =========================
  const renderBinCard = (item, key) => {
    const state = item?.state || 'VACIO'
    const dim = !matchesFilter(state)
    const isSel = selected?.key === key

    const code = item?.code || item?.id || key
    const sku = item?.pallet?.sku || item?.sku || null
    const qty = item?.pallet?.qty || item?.qty || null
    const lastMoveAt = item?.lastMoveAt || null

    return (
      <Box
        key={key}
        onClick={() => setSelected({ key, data: item, mode: 'BIN' })}
        role="button"
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          p: 1.3,
          borderRadius: 2,
          border: isSel ? '2px solid rgba(59,130,246,.75)' : cellBorder(state),
          bgcolor: cellColor(state),
          opacity: dim ? 0.35 : 1,
          transition: 'transform .08s ease, box-shadow .15s ease',
          '&:hover': { transform: dim ? 'none' : 'translateY(-1px)', boxShadow: dim ? 'none' : '0 10px 25px rgba(0,0,0,.25)' }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Box sx={{ minWidth: 0 }}>
            <Typography sx={{ fontWeight: 900, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {code}
            </Typography>

            <Typography sx={{ opacity: .75, fontSize: 12, mt: .3 }}>
              {sku ? `SKU: ${sku}` : 'SKU: --'} {qty !== null && qty !== undefined ? ` · Qty: ${qty}` : ''}
            </Typography>

            <Typography sx={{ opacity: .65, fontSize: 12, mt: .2 }}>
              {lastMoveAt ? `Último mov: ${lastMoveAt}` : 'Último mov: --'}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={state}
            sx={{
              bgcolor: 'rgba(255,255,255,.06)',
              color: '#e5e7eb',
              border: '1px solid rgba(255,255,255,.10)',
              fontWeight: 900
            }}
          />
        </Stack>
      </Box>
    )
  }

  const renderHeightCard = (h, idx) => {
    const state = h?.state || 'VACIO'
    const dim = !matchesFilter(state)
    const key = h.height || `H${idx + 1}`
    const isSel = selected?.key === key

    const sku = h?.pallet?.sku || null
    const qty = h?.pallet?.qty || null

    return (
      <Box
        key={key}
        onClick={() => setSelected({ key, data: h, mode: 'HEIGHT' })}
        role="button"
        sx={{
          cursor: 'pointer',
          userSelect: 'none',
          p: 1.3,
          borderRadius: 2,
          border: isSel ? '2px solid rgba(59,130,246,.75)' : cellBorder(state),
          bgcolor: cellColor(state),
          opacity: dim ? 0.35 : 1,
          transition: 'transform .08s ease, box-shadow .15s ease',
          '&:hover': { transform: dim ? 'none' : 'translateY(-1px)', boxShadow: dim ? 'none' : '0 10px 25px rgba(0,0,0,.25)' }
        }}
      >
        <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
          <Box>
            <Typography sx={{ fontWeight: 900 }}>
              {key} · Altura {idx + 1} {idx === 0 ? '(abajo)' : idx === 4 ? '(arriba)' : ''}
            </Typography>

            {state === 'BLOQUEADO' ? (
              <Typography sx={{ opacity: .75, fontSize: 12, mt: .3 }}>
                Motivo: {h?.blockedReason || 'Mantenimiento'}
              </Typography>
            ) : sku ? (
              <Typography sx={{ opacity: .75, fontSize: 12, mt: .3 }}>
                SKU: {sku} {qty !== null && qty !== undefined ? ` · Qty: ${qty}` : ''}
              </Typography>
            ) : (
              <Typography sx={{ opacity: .75, fontSize: 12, mt: .3 }}>
                VACÍO
              </Typography>
            )}

            <Typography sx={{ opacity: .65, fontSize: 12, mt: .2 }}>
              {h?.lastMoveAt ? `Último mov: ${h.lastMoveAt}` : 'Último mov: --'}
            </Typography>
          </Box>

          <Chip
            size="small"
            label={state}
            sx={{
              bgcolor: 'rgba(255,255,255,.06)',
              color: '#e5e7eb',
              border: '1px solid rgba(255,255,255,.10)',
              fontWeight: 900
            }}
          />
        </Stack>
      </Box>
    )
  }

  return (
    <Box sx={{ color: '#e5e7eb' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          {headerTitle}
        </Typography>

        <Chip
          size="small"
          label="Tiempo real"
          sx={{
            bgcolor: 'rgba(34,197,94,.15)',
            color: '#a7f3d0',
            border: '1px solid rgba(34,197,94,.25)'
          }}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', lg: '1fr 360px' }, gap: 2 }}>
        {/* IZQ */}
        <Box>
          {/* KPIs */}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)', md: 'repeat(4,1fr)' }, gap: 2, mb: 2 }}>
            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.04)' }}>
              <Typography sx={{ opacity: .75, fontSize: 12 }}>Área</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 22 }}>
                {AREAS.find(a => a.db === areaDb)?.label}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.04)' }}>
              <Typography sx={{ opacity: .75, fontSize: 12 }}>Capacidad visible</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 22 }}>{stats.cap}</Typography>
              <Typography sx={{ opacity: .7, fontSize: 12, mt: .5 }}>
                {isFftAccesorios(areaDb, subarea) ? 'H1–H5 (1 bin por altura)' : 'Grid de BINs'}
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(34,197,94,.20)', background: 'rgba(34,197,94,.08)' }}>
              <Typography sx={{ opacity: .75, fontSize: 12 }}>Ocupadas</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 22 }}>{stats.ocupadas}</Typography>
            </Paper>

            <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(239,68,68,.20)', background: 'rgba(239,68,68,.08)' }}>
              <Typography sx={{ opacity: .75, fontSize: 12 }}>Bloqueadas</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 22 }}>{stats.bloqueadas}</Typography>
            </Paper>
          </Box>

          {/* Controles */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.04)' }}>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }}>
              <TextField
                select
                size="small"
                label="Área"
                value={areaDb}
                onChange={(e) => setAreaDb(e.target.value)}
                sx={{ width: { xs: '100%', md: 220 }, '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,.18)' } }}
              >
                {AREAS.map(a => <MenuItem key={a.db} value={a.db}>{a.label}</MenuItem>)}
              </TextField>

              <TextField
                select
                size="small"
                label="Sub-área"
                value={subarea}
                onChange={(e) => setSubarea(e.target.value)}
                sx={{ width: { xs: '100%', md: 260 }, '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,.18)' } }}
              >
                {(SUBAREAS_BY_AREA[areaDb] || []).map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
              </TextField>

              <TextField
                select
                size="small"
                label="Filtro"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                sx={{ width: { xs: '100%', md: 220 }, '& .MuiInputBase-root': { bgcolor: 'rgba(0,0,0,.18)' } }}
              >
                <MenuItem value="TODOS">Todos</MenuItem>
                <MenuItem value="VACIO">Vacíos</MenuItem>
                <MenuItem value="OCUPADO">Ocupados</MenuItem>
                <MenuItem value="BLOQUEADO">Bloqueados</MenuItem>
              </TextField>

              <Box sx={{ flex: 1 }} />

              <Button onClick={load} variant="outlined" sx={{ borderRadius: 2 }}>
                Recargar
              </Button>
            </Stack>

            {loading && (
              <Box sx={{ mt: 2 }}>
                <LinearProgress />
              </Box>
            )}
          </Paper>

          {/* Centro: Grid o Estantes */}
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.04)' }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>
              {isFftAccesorios(areaDb, subarea) ? 'Accesorios (FFT) — Estantes por altura' : 'Mapa/Grid de BINs'}
            </Typography>
            <Divider sx={{ my: 1.5, borderColor: 'rgba(255,255,255,.06)' }} />

            {isFftAccesorios(areaDb, subarea) ? (
              <Box sx={{ display: 'grid', gap: 1 }}>
                {heights.map((h, i) => renderHeightCard(h, i))}
              </Box>
            ) : (
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', xl: 'repeat(4, 1fr)' },
                  gap: 1
                }}
              >
                {locs.map((l) => renderBinCard(l, l.id))}
              </Box>
            )}
          </Paper>
        </Box>

        {/* DER (detalle) */}
        <Box>
          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.04)' }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Detalle</Typography>
            <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,.06)' }} />

            {!selected ? (
              <Typography sx={{ opacity: .75, fontSize: 13 }}>
                Selecciona un BIN/altura para ver detalles.
              </Typography>
            ) : (
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 16, mb: 1 }}>
                  {selected.key}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap' }} useFlexGap>
                  <Chip size="small" label={`Área ${AREAS.find(a => a.db === areaDb)?.label}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', color: '#e5e7eb' }} />
                  <Chip size="small" label={`Sub-área ${subarea}`} sx={{ bgcolor: 'rgba(255,255,255,.06)', color: '#e5e7eb' }} />
                  <Chip size="small" label={selected.data?.state || 'VACIO'} sx={{ bgcolor: 'rgba(255,255,255,.06)', color: '#e5e7eb', fontWeight: 900 }} />
                </Stack>

                <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', rowGap: 1, columnGap: 1.5 }}>
                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Código</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.code || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Tarima</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.pallet?.code || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>SKU</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.pallet?.sku || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Qty</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.pallet?.qty ?? '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Último mov.</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.lastMoveAt || '--'}</Typography>

                  <Typography sx={{ opacity: .7, fontSize: 12 }}>Usuario</Typography>
                  <Typography sx={{ fontSize: 12 }}>{selected.data?.lastMoveBy || '--'}</Typography>

                  {selected.data?.state === 'BLOQUEADO' && (
                    <>
                      <Typography sx={{ opacity: .7, fontSize: 12 }}>Motivo</Typography>
                      <Typography sx={{ fontSize: 12 }}>{selected.data?.blockedReason || 'Mantenimiento'}</Typography>
                    </>
                  )}
                </Box>
              </Box>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p: 2, borderRadius: 3, border: '1px solid rgba(255,255,255,.06)', background: 'rgba(255,255,255,.04)' }}>
            <Typography sx={{ fontWeight: 900, mb: 1 }}>Ocupación</Typography>
            <Divider sx={{ mb: 2, borderColor: 'rgba(255,255,255,.06)' }} />

            <Stack spacing={1.2}>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ opacity: .75, fontSize: 12 }}>Ocupación</Typography>
                  <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.pct}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={stats.pct}
                  sx={{
                    height: 10,
                    borderRadius: 99,
                    bgcolor: 'rgba(255,255,255,.08)',
                    '& .MuiLinearProgress-bar': { borderRadius: 99 }
                  }}
                />
              </Box>

              <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 1 }}>
                <Typography sx={{ opacity: .75, fontSize: 12 }}>Vacías</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.vacias}</Typography>

                <Typography sx={{ opacity: .75, fontSize: 12 }}>Ocupadas</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.ocupadas}</Typography>

                <Typography sx={{ opacity: .75, fontSize: 12 }}>Bloqueadas</Typography>
                <Typography sx={{ fontWeight: 900, fontSize: 12 }}>{stats.bloqueadas}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}