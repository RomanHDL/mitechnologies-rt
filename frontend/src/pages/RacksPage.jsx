import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import dayjs from 'dayjs'
import { api } from '../services/api'
import { useAuth } from '../state/auth'
import { socket } from '../lib/socket'
import { usePageStyles } from '../ui/pageStyles'
import {
  AREA_CODES, ALL_RACKS, RACK_LEVELS, RACK_POSITIONS,
  rackToArea,
} from '../lib/constants'

import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import TextField from '@mui/material/TextField'
import MenuItem from '@mui/material/MenuItem'
import Divider from '@mui/material/Divider'
import Button from '@mui/material/Button'
import LinearProgress from '@mui/material/LinearProgress'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import CircularProgress from '@mui/material/CircularProgress'
import Alert from '@mui/material/Alert'
import { useTheme } from '@mui/material/styles'

const levels = RACK_LEVELS
const positions = RACK_POSITIONS

const AREAS = AREA_CODES

function cellColor(state, isDark = false) {
  if (state === 'BLOQUEADO') return isDark ? '#3b0a0a' : 'rgba(239,68,68,.10)'
  if (state === 'OCUPADO') return isDark ? '#083a1f' : 'rgba(34,197,94,.12)'
  return isDark ? '#111827' : 'rgba(21,101,192,.05)'
}

function cellBorder(state, isDark = false) {
  if (state === 'BLOQUEADO') return '1px solid rgba(239,68,68,.35)'
  if (state === 'OCUPADO') return '1px solid rgba(34,197,94,.35)'
  return isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.15)'
}

/* ALL_RACKS y rackToArea importados de ../lib/constants */
const rackArea = rackToArea

export default function RacksPage() {
  const { token } = useAuth()
  const client = useMemo(() => api(), [token])
  const routerLoc = useLocation()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const ps = usePageStyles()

  const [rackCode, setRackCode] = useState('F001')
  const [locs, setLocs] = useState([])
  const [q, setQ] = useState('')
  const [highlight, setHighlight] = useState(null)

  const [filter, setFilter] = useState('TODOS')
  const [selected, setSelected] = useState(null)
  const [areaFilter, setAreaFilter] = useState(null) // null = all areas

  // Action states
  const [blockLoading, setBlockLoading] = useState(false)
  const [transferOpen, setTransferOpen] = useState(false)
  const [transferDest, setTransferDest] = useState('')
  const [transferLoading, setTransferLoading] = useState(false)
  const [actionError, setActionError] = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)
  const [blockReason, setBlockReason] = useState('')

  // Filtered rack options based on area
  const rackOptions = useMemo(() => {
    if (!areaFilter) return ALL_RACKS
    return ALL_RACKS.filter(r => rackArea(r) === areaFilter)
  }, [areaFilter])

  // When area filter changes, jump to first rack in that area if current rack isn't in it
  useEffect(() => {
    if (areaFilter && rackArea(rackCode) !== areaFilter && rackOptions.length > 0) {
      setRackCode(rackOptions[0])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaFilter])

  // Navigation from Inventory page
  useEffect(() => {
    const st = routerLoc?.state
    if (st?.rackCode) {
      const r = String(st.rackCode || '').trim().toUpperCase()
      if (r) setRackCode(r)
    }
    if (st?.highlight) {
      const h = String(st.highlight || '').trim().toUpperCase()
      if (h) {
        setHighlight(h)
        setTimeout(() => setHighlight(null), 4000)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const load = useCallback(async (r = rackCode) => {
    try {
      const res = await client.get(`/api/locations/racks/${r}`)
      setLocs(res.data?.locations || [])
    } catch { /* silently fail */ }
  }, [client, rackCode])

  useEffect(() => { load(rackCode) }, [rackCode, load])

  // Real-time socket updates
  useEffect(() => {
    const onRackUpdate = (ev) => {
      if (!ev?.rackCode) return
      if (String(ev.rackCode).toUpperCase() === rackCode) load(rackCode)
    }
    socket.on('rack:update', onRackUpdate)
    return () => socket.off('rack:update', onRackUpdate)
  }, [rackCode, load])

  const map = useMemo(() => {
    const m = new Map()
    for (const l of locs) m.set(`${l.level}-${l.position}`, l)
    return m
  }, [locs])

  const capacity = levels.length * positions.length

  const getCell = (level, pos) => {
    const l = map.get(`${level}-${pos}`)
    const state = l?.state || 'VACIO'
    const code = l?.code || `${level}${String(pos).padStart(2,'0')}-${rackCode}-${String(pos).padStart(3,'0')}`
    return { raw: l || null, state, code }
  }

  const stats = useMemo(() => {
    let ocupadas = 0, bloqueadas = 0, vacias = 0
    for (const level of levels) {
      for (const pos of positions) {
        const { state } = getCell(level, pos)
        if (state === 'OCUPADO') ocupadas++
        else if (state === 'BLOQUEADO') bloqueadas++
        else vacias++
      }
    }
    const ocupacionPct = capacity ? Math.round((ocupadas / capacity) * 100) : 0
    return { ocupadas, bloqueadas, vacias, ocupacionPct }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, rackCode])

  const onSearch = () => {
    const text = String(q || '').trim().toUpperCase()
    const parts = text.split('-')
    if (parts.length >= 2) {
      const r = parts[1]
      if (r.startsWith('F')) {
        setRackCode(r)
        setHighlight(text)
        setTimeout(() => setHighlight(null), 4000)
      }
    }
  }

  // Clear selection on rack change
  useEffect(() => {
    setSelected(null)
    setActionError(null)
    setActionSuccess(null)
  }, [rackCode])

  const matchesFilter = (state) => {
    if (filter === 'TODOS') return true
    if (filter === 'VACIO') return state === 'VACIO'
    return state === filter
  }

  const onCellClick = (level, pos) => {
    const { raw, state, code } = getCell(level, pos)
    setSelected({ level, pos, raw, state, code })
    setActionError(null)
    setActionSuccess(null)
  }

  // Rack navigation: prev/next
  const rackIdx = rackOptions.indexOf(rackCode)
  const canPrev = rackIdx > 0
  const canNext = rackIdx < rackOptions.length - 1 && rackIdx >= 0

  const goToPrevRack = () => {
    if (canPrev) setRackCode(rackOptions[rackIdx - 1])
  }
  const goToNextRack = () => {
    if (canNext) setRackCode(rackOptions[rackIdx + 1])
  }

  // Block / Unblock action
  const handleBlockToggle = async () => {
    if (!selected?.raw?._id && !selected?.raw?.id) return
    const locId = selected.raw._id || selected.raw.id
    setBlockLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      if (selected.state === 'BLOQUEADO') {
        await client.patch(`/api/locations/${locId}/unblock`)
        setActionSuccess('Ubicacion desbloqueada correctamente.')
      } else {
        await client.patch(`/api/locations/${locId}/block`, { reason: blockReason || 'Bloqueado manualmente' })
        setActionSuccess('Ubicacion bloqueada correctamente.')
      }
      setBlockReason('')
      await load(rackCode)
      // Refresh selected cell
      const { raw, state, code } = getCell(selected.level, selected.pos)
      setSelected(prev => prev ? { ...prev, raw, state, code } : null)
    } catch (err) {
      setActionError(err?.message || 'Error al cambiar estado de bloqueo.')
    } finally {
      setBlockLoading(false)
    }
  }

  // Transfer action
  const handleTransferOpen = () => {
    setTransferDest('')
    setTransferOpen(true)
    setActionError(null)
  }

  const handleTransfer = async () => {
    if (!selected?.raw?.pallet?.id || !transferDest) return
    setTransferLoading(true)
    setActionError(null)
    setActionSuccess(null)
    try {
      await client.patch(`/api/pallets/${selected.raw.pallet.id}/transfer`, {
        toLocationId: transferDest
      })
      setActionSuccess('Pallet transferido correctamente.')
      setTransferOpen(false)
      await load(rackCode)
    } catch (err) {
      setActionError(err?.message || 'Error al transferir pallet.')
    } finally {
      setTransferLoading(false)
    }
  }

  // Build a flat list of all location IDs for transfer destination picker
  const allLocationOptions = useMemo(() => {
    return locs
      .filter(l => l.state === 'VACIO')
      .map(l => ({ id: l._id || l.id, code: l.code }))
  }, [locs])

  return (
    <Box>
      {/* Title */}
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 700, color: 'text.primary' }}>
          Racks
        </Typography>

        <Chip
          size="small"
          label="Tiempo real"
          sx={{
            bgcolor: 'rgba(34,197,94,.15)',
            color: isDark ? '#86EFAC' : '#2E7D32',
            border: '1px solid rgba(34,197,94,.25)'
          }}
        />
      </Box>

      {/* KPI Summary Bar */}
      <Box
        sx={{
          display:'grid',
          gridTemplateColumns: { xs:'1fr 1fr', sm:'repeat(3, 1fr)', md:'repeat(6, 1fr)' },
          gap: 2,
          mb: 2
        }}
      >
        <Paper elevation={0} sx={{ ...ps.kpiCard('blue') }}>
          <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Rack</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{rackCode}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>Activo</Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...ps.kpiCard() }}>
          <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Total Posiciones</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{capacity}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>Capacidad</Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...ps.kpiCard('green') }}>
          <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Ocupadas</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{stats.ocupadas}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>
            {Math.round((stats.ocupadas / capacity) * 100)}%
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...ps.kpiCard() }}>
          <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Vacias</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{stats.vacias}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>
            {Math.round((stats.vacias / capacity) * 100)}%
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...ps.kpiCard('red') }}>
          <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Bloqueadas</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{stats.bloqueadas}</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>
            {Math.round((stats.bloqueadas / capacity) * 100)}%
          </Typography>
        </Paper>

        <Paper elevation={0} sx={{ ...ps.kpiCard('amber') }}>
          <Typography sx={{ color: 'text.secondary', fontSize:12 }}>% Ocupacion</Typography>
          <Typography sx={{ fontWeight: 700, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{stats.ocupacionPct}%</Typography>
          <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>Del rack actual</Typography>
        </Paper>
      </Box>

      {/* Main layout: Left (map) + Right (details) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs:'1fr', lg:'1fr 380px' },
          gap: 2
        }}
      >
        {/* =================== LEFT =================== */}
        <Box>
          {/* Top bar: Area chips + Rack selector + search + filters */}
          <Paper elevation={0} sx={{ p:2, borderRadius:2, mb:2 }}>
            {/* Area filter chips */}
            <Stack direction="row" spacing={1} sx={{ mb: 2 }} alignItems="center">
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mr: 0.5 }}>Area:</Typography>
              <Chip
                size="small"
                label="Todas"
                onClick={() => setAreaFilter(null)}
                sx={{
                  bgcolor: !areaFilter ? 'rgba(21,101,192,.22)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
                  color: isDark ? '#E8EDF4' : '#1565C0',
                  border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)',
                  fontWeight: !areaFilter ? 800 : 600,
                }}
              />
              {AREAS.map(area => (
                <Chip
                  key={area}
                  size="small"
                  label={area}
                  onClick={() => setAreaFilter(areaFilter === area ? null : area)}
                  sx={{
                    bgcolor: areaFilter === area ? 'rgba(21,101,192,.22)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
                    color: isDark ? '#E8EDF4' : '#1565C0',
                    border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)',
                    fontWeight: areaFilter === area ? 800 : 600,
                  }}
                />
              ))}
            </Stack>

            <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems={{ xs:'stretch', md:'center' }}>
              {/* Prev rack button */}
              <Tooltip title="Rack anterior">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!canPrev}
                    onClick={goToPrevRack}
                    sx={{ minWidth: 40, fontWeight: 700, borderRadius: 2 }}
                  >
                    {'<'}
                  </Button>
                </span>
              </Tooltip>

              <TextField
                select
                size="small"
                label="Rack"
                value={rackOptions.includes(rackCode) ? rackCode : ''}
                onChange={(e)=>setRackCode(e.target.value)}
                sx={{ width: { xs:'100%', md: 220 }, ...ps.inputSx }}
              >
                {rackOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>

              {/* Next rack button */}
              <Tooltip title="Rack siguiente">
                <span>
                  <Button
                    variant="outlined"
                    size="small"
                    disabled={!canNext}
                    onClick={goToNextRack}
                    sx={{ minWidth: 40, fontWeight: 700, borderRadius: 2 }}
                  >
                    {'>'}
                  </Button>
                </span>
              </Tooltip>

              <TextField
                size="small"
                label='Escanear o escribir ubicacion (A01-F059-012)'
                value={q}
                onChange={(e)=>setQ(e.target.value)}
                onKeyDown={(e)=> e.key === 'Enter' && onSearch()}
                sx={{ flex:1, ...ps.inputSx }}
              />

              <Button
                variant="contained"
                onClick={onSearch}
                sx={{
                  height: 40,
                  minWidth: 120,
                  fontWeight: 700,
                  borderRadius: 2,
                  textTransform: 'none'
                }}
              >
                Buscar / Ir
              </Button>
            </Stack>

            <Divider sx={{ my:2 }} />

            <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems={{ xs:'stretch', md:'center' }} justifyContent="space-between">
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <Chip
                  size="small"
                  label="Todos"
                  onClick={() => setFilter('TODOS')}
                  sx={{
                    bgcolor: filter==='TODOS' ? 'rgba(21,101,192,.22)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
                    color: isDark ? '#E8EDF4' : '#1565C0',
                    border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)',
                  }}
                />
                <Chip
                  size="small"
                  label="Vacios"
                  onClick={() => setFilter('VACIO')}
                  sx={{
                    bgcolor: filter==='VACIO' ? 'rgba(148,163,184,.22)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
                    color: isDark ? '#E8EDF4' : '#1565C0',
                    border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)',
                  }}
                />
                <Chip
                  size="small"
                  label="Ocupados"
                  onClick={() => setFilter('OCUPADO')}
                  sx={{
                    bgcolor: filter==='OCUPADO' ? 'rgba(34,197,94,.22)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
                    color: filter==='OCUPADO' ? (isDark ? '#86EFAC' : '#2E7D32') : (isDark ? '#E8EDF4' : '#1565C0'),
                    border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)',
                  }}
                />
                <Chip
                  size="small"
                  label="Bloqueados"
                  onClick={() => setFilter('BLOQUEADO')}
                  sx={{
                    bgcolor: filter==='BLOQUEADO' ? 'rgba(239,68,68,.20)' : (isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.08)'),
                    color: filter==='BLOQUEADO' ? (isDark ? '#FCA5A5' : '#C62828') : (isDark ? '#E8EDF4' : '#1565C0'),
                    border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)',
                  }}
                />
              </Stack>

              {/* Legend */}
              <Box sx={{ display:'flex', gap:1, justifyContent:'flex-end', flexWrap:'wrap', alignItems:'center' }}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: 'text.secondary', mr: 0.5 }}>Leyenda:</Typography>
                <Box sx={{ display:'flex', alignItems:'center', gap: 0.5 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: isDark ? '#111827' : 'rgba(21,101,192,.05)', border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.15)' }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Vacio</Typography>
                </Box>
                <Box sx={{ display:'flex', alignItems:'center', gap: 0.5 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: isDark ? '#083a1f' : 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.35)' }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Ocupado</Typography>
                </Box>
                <Box sx={{ display:'flex', alignItems:'center', gap: 0.5 }}>
                  <Box sx={{ width: 14, height: 14, borderRadius: 1, bgcolor: isDark ? '#3b0a0a' : 'rgba(239,68,68,.10)', border: '1px solid rgba(239,68,68,.35)' }} />
                  <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>Bloqueado</Typography>
                </Box>
              </Box>
            </Stack>
          </Paper>

          {/* Rack Map */}
          <Paper elevation={0} sx={{ p:2, borderRadius:2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.primary' }}>
                Mapa del Rack {rackCode} <span style={{ opacity:.75 }}>(A-C / 01-12)</span>
              </Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>
                Area: {rackArea(rackCode)}
              </Typography>
            </Stack>

            <Divider sx={{ my:1.5 }} />

            {/* Column headers */}
            <Box sx={{
              display:'grid',
              gridTemplateColumns:'64px repeat(12, 1fr)',
              gap:1,
              alignItems:'center',
              mb:1
            }}>
              <Box />
              {positions.map(pos => (
                <Typography key={pos} sx={{ textAlign:'center', fontSize:12, color: 'text.secondary', fontWeight:800 }}>
                  {String(pos).padStart(2,'0')}
                </Typography>
              ))}
            </Box>

            {/* Rows */}
            <Box sx={{ display:'grid', gap:1 }}>
              {levels.map(level => (
                <Box
                  key={level}
                  sx={{ display:'grid', gridTemplateColumns:'64px repeat(12, 1fr)', gap:1, alignItems:'center' }}
                >
                  <Typography sx={{ fontWeight: 700, color: 'text.primary' }}>{level}</Typography>

                  {positions.map(pos => {
                    const { state, code, raw } = getCell(level, pos)
                    const isHi = highlight && code === highlight
                    const isSelected = selected && selected.level === level && selected.pos === pos
                    const dim = !matchesFilter(state)
                    const palletCode = raw?.pallet?.code || null

                    return (
                      <Box
                        key={pos}
                        onClick={() => onCellClick(level, pos)}
                        role="button"
                        sx={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          p: 0.75,
                          borderRadius: 2,
                          border: isHi
                            ? '2px solid #60a5fa'
                            : isSelected
                              ? '2px solid rgba(59,130,246,.75)'
                              : cellBorder(state, isDark),
                          bgcolor: cellColor(state, isDark),
                          textAlign: 'center',
                          fontSize: 12,
                          minHeight: 52,
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'center',
                          alignItems: 'center',
                          overflow: 'hidden',
                          transition: 'transform .08s ease, box-shadow .15s ease, opacity .15s ease',
                          opacity: dim ? 0.35 : 1,
                          '&:hover': {
                            transform: dim ? 'none' : 'translateY(-1px)',
                            boxShadow: dim ? 'none' : '0 10px 25px rgba(0,0,0,.25)'
                          }
                        }}
                      >
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'inherit' }}>
                          {level}{String(pos).padStart(2,'0')}
                        </div>
                        {state === 'OCUPADO' && palletCode ? (
                          <div style={{
                            fontSize: 9,
                            fontWeight: 700,
                            color: isDark ? '#86EFAC' : '#2E7D32',
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            lineHeight: 1.2,
                          }}>
                            {palletCode.length > 8 ? palletCode.slice(0, 7) + '..' : palletCode}
                          </div>
                        ) : (
                          <div style={{ opacity: .85, fontSize: 10, color: 'inherit', lineHeight: 1.2 }}>
                            {state === 'VACIO' ? 'Vacio' : state === 'BLOQUEADO' ? 'Bloq.' : 'Ocup.'}
                          </div>
                        )}
                      </Box>
                    )
                  })}
                </Box>
              ))}
            </Box>

            <Divider sx={{ my:2 }} />

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Tip: escribe un codigo como <b>A01-F059-012</b> y te cambia al rack automaticamente. Usa las flechas &lt; &gt; para navegar entre racks.
            </Typography>
          </Paper>
        </Box>

        {/* =================== RIGHT (PANEL) =================== */}
        <Box>
          <Paper elevation={0} sx={{ p:2, borderRadius:2, mb:2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Detalles de Ubicacion</Typography>
            <Divider sx={{ mb: 2 }} />

            {actionSuccess && (
              <Alert severity="success" sx={{ mb: 2, fontSize: 12 }} onClose={() => setActionSuccess(null)}>
                {actionSuccess}
              </Alert>
            )}
            {actionError && (
              <Alert severity="error" sx={{ mb: 2, fontSize: 12 }} onClose={() => setActionError(null)}>
                {actionError}
              </Alert>
            )}

            {!selected ? (
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                Da clic en una posicion del mapa para ver detalles aqui.
              </Typography>
            ) : (
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 18, mb: 1, color: 'text.primary' }}>
                  {selected.code || `${selected.level}${String(selected.pos).padStart(2,'0')}-${rackCode}-${String(selected.pos).padStart(3,'0')}`}
                </Typography>

                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                  <Chip
                    size="small"
                    label={selected.state}
                    sx={{
                      bgcolor:
                        selected.state === 'OCUPADO'
                          ? 'rgba(34,197,94,.20)'
                          : selected.state === 'BLOQUEADO'
                            ? 'rgba(239,68,68,.18)'
                            : (isDark ? 'rgba(148,163,184,.18)' : 'rgba(21,101,192,.10)'),
                      color:
                        selected.state === 'OCUPADO' ? (isDark ? '#86EFAC' : '#2E7D32')
                          : selected.state === 'BLOQUEADO' ? (isDark ? '#FCA5A5' : '#C62828')
                          : (isDark ? '#E8EDF4' : '#1565C0'),
                      border: selected.state === 'OCUPADO' ? '1px solid rgba(34,197,94,.28)'
                        : selected.state === 'BLOQUEADO' ? '1px solid rgba(239,68,68,.28)'
                        : (isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)'),
                    }}
                  />
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>
                    Estante: <b>{selected.level}</b> -- Posicion: <b>{String(selected.pos).padStart(2,'0')}</b>
                  </Typography>
                </Stack>

                {/* Enriched pallet details */}
                <Box sx={{ display:'grid', gridTemplateColumns:'120px 1fr', rowGap: 1, columnGap: 1.5 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Codigo Pallet</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary', fontWeight: 700 }}>
                    {selected.raw?.pallet?.code || '--'}
                  </Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>SKU / Producto</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>
                    {selected.raw?.pallet?.sku || selected.raw?.sku || selected.raw?.productName || '--'}
                  </Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Lote</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>
                    {selected.raw?.pallet?.lot || selected.raw?.lot || '--'}
                  </Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Cantidad</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>
                    {selected.raw?.pallet?.qty != null ? selected.raw.pallet.qty : '--'}
                  </Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Ultimo mov.</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>
                    {selected.raw?.lastMoveAt ? dayjs(selected.raw.lastMoveAt).format('DD/MM/YYYY HH:mm') : '--'}
                  </Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Usuario</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>
                    {selected.raw?.lastMoveBy || '--'}
                  </Typography>
                </Box>

                <Divider sx={{ my:2 }} />

                {/* Quick actions */}
                <Typography sx={{ fontSize: 12, fontWeight: 600, color: 'text.secondary', mb: 1 }}>
                  Acciones rapidas
                </Typography>

                {/* Block/Unblock */}
                {selected.state !== 'OCUPADO' && (
                  <Box sx={{ mb: 1.5 }}>
                    {selected.state !== 'BLOQUEADO' && (
                      <TextField
                        size="small"
                        label="Razon de bloqueo (opcional)"
                        value={blockReason}
                        onChange={(e) => setBlockReason(e.target.value)}
                        fullWidth
                        sx={{ mb: 1, ...ps.inputSx }}
                      />
                    )}
                    <Button
                      variant="contained"
                      fullWidth
                      disabled={blockLoading}
                      onClick={handleBlockToggle}
                      sx={{
                        textTransform:'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        bgcolor: selected.state === 'BLOQUEADO'
                          ? (isDark ? 'rgba(34,197,94,.25)' : '#2E7D32')
                          : (isDark ? 'rgba(239,68,68,.25)' : '#C62828'),
                        color: '#fff',
                        '&:hover': {
                          bgcolor: selected.state === 'BLOQUEADO'
                            ? (isDark ? 'rgba(34,197,94,.35)' : '#1B5E20')
                            : (isDark ? 'rgba(239,68,68,.35)' : '#B71C1C'),
                        },
                      }}
                    >
                      {blockLoading ? (
                        <CircularProgress size={20} sx={{ color: '#fff' }} />
                      ) : selected.state === 'BLOQUEADO' ? 'Desbloquear' : 'Bloquear'}
                    </Button>
                  </Box>
                )}

                {/* Transfer - only for occupied cells with a pallet */}
                {selected.state === 'OCUPADO' && selected.raw?.pallet?.id && (
                  <Box sx={{ mb: 1.5 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      onClick={handleTransferOpen}
                      sx={{
                        textTransform:'none',
                        fontWeight: 700,
                        borderRadius: 2,
                        mb: 1,
                      }}
                    >
                      Transferir Pallet
                    </Button>

                    {/* Block occupied location too */}
                    {selected.raw?._id || selected.raw?.id ? (
                      <>
                        <TextField
                          size="small"
                          label="Razon de bloqueo (opcional)"
                          value={blockReason}
                          onChange={(e) => setBlockReason(e.target.value)}
                          fullWidth
                          sx={{ mb: 1, ...ps.inputSx }}
                        />
                        <Button
                          variant="outlined"
                          fullWidth
                          disabled={blockLoading}
                          onClick={handleBlockToggle}
                          sx={{
                            textTransform:'none',
                            fontWeight: 700,
                            borderRadius: 2,
                            color: isDark ? '#FCA5A5' : '#C62828',
                            borderColor: isDark ? 'rgba(239,68,68,.35)' : '#C62828',
                          }}
                        >
                          {blockLoading ? (
                            <CircularProgress size={20} />
                          ) : 'Bloquear'}
                        </Button>
                      </>
                    ) : null}
                  </Box>
                )}

                {/* For BLOQUEADO cells that are also occupied */}
                {selected.state === 'BLOQUEADO' && selected.raw?.pallet?.id && (
                  <Button
                    variant="contained"
                    fullWidth
                    onClick={handleTransferOpen}
                    sx={{
                      textTransform:'none',
                      fontWeight: 700,
                      borderRadius: 2,
                      mb: 1,
                    }}
                  >
                    Transferir Pallet
                  </Button>
                )}
              </Box>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p:2, borderRadius:2 }}>
            <Typography sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>Estadisticas del Rack</Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.2}>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Ocupacion</Typography>
                  <Typography sx={{ fontWeight:900, fontSize: 12, color: 'text.primary' }}>{stats.ocupacionPct}%</Typography>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={stats.ocupacionPct}
                  sx={{
                    height: 10,
                    borderRadius: 99,
                    bgcolor: isDark ? 'rgba(255,255,255,.08)' : 'rgba(21,101,192,.12)',
                    '& .MuiLinearProgress-bar': { borderRadius: 99 },
                  }}
                />
              </Box>

              <Box sx={{ display:'grid', gridTemplateColumns:'1fr auto', gap: 1 }}>
                <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Vacias</Typography>
                <Typography sx={{ fontWeight:900, fontSize: 12, color: 'text.primary' }}>{stats.vacias}</Typography>

                <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Ocupadas</Typography>
                <Typography sx={{ fontWeight:900, fontSize: 12, color: 'text.primary' }}>{stats.ocupadas}</Typography>

                <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Bloqueadas</Typography>
                <Typography sx={{ fontWeight:900, fontSize: 12, color: 'text.primary' }}>{stats.bloqueadas}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>

      {/* Transfer Dialog */}
      <Dialog
        open={transferOpen}
        onClose={() => !transferLoading && setTransferOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ fontWeight: 700 }}>
          Transferir Pallet
        </DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            Pallet: <b>{selected?.raw?.pallet?.code || '--'}</b>
          </Typography>
          <Typography sx={{ fontSize: 13, color: 'text.secondary', mb: 2 }}>
            Origen: <b>{selected?.code || '--'}</b>
          </Typography>

          {actionError && (
            <Alert severity="error" sx={{ mb: 2, fontSize: 12 }} onClose={() => setActionError(null)}>
              {actionError}
            </Alert>
          )}

          <TextField
            select
            size="small"
            label="Ubicacion destino"
            value={transferDest}
            onChange={(e) => setTransferDest(e.target.value)}
            fullWidth
            sx={{ mt: 1, ...ps.inputSx }}
          >
            {allLocationOptions.length === 0 && (
              <MenuItem value="" disabled>No hay ubicaciones vacias en este rack</MenuItem>
            )}
            {allLocationOptions.map(loc => (
              <MenuItem key={loc.id} value={loc.id}>{loc.code}</MenuItem>
            ))}
          </TextField>

          <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 1.5 }}>
            Solo se muestran ubicaciones vacias del rack actual. Para transferir a otro rack, cambie de rack primero y copie el ID de destino.
          </Typography>

          {/* Manual ID input as fallback */}
          <TextField
            size="small"
            label="O ingrese ID de ubicacion destino manualmente"
            value={transferDest}
            onChange={(e) => setTransferDest(e.target.value)}
            fullWidth
            sx={{ mt: 2, ...ps.inputSx }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={() => setTransferOpen(false)}
            disabled={transferLoading}
            sx={{ textTransform: 'none', fontWeight: 700 }}
          >
            Cancelar
          </Button>
          <Button
            variant="contained"
            onClick={handleTransfer}
            disabled={!transferDest || transferLoading}
            sx={{ textTransform: 'none', fontWeight: 700, borderRadius: 2 }}
          >
            {transferLoading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : 'Transferir'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
