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

// FFT: solo 5 filas y 5 niveles, 1 bin por nivel
const FFT_ROWS = ['F001', 'F002', 'F003', 'F004', 'F005']
const FFT_LEVELS = [1, 2, 3, 4, 5] // nivel 1..5 (cada nivel = 1 bin)

export default function FftPage() {
  const client = useMemo(() => api(), [])

  const [rowCode, setRowCode] = useState('F001') // fila FFT (F001..F005)
  const [locs, setLocs] = useState([])
  const [filter, setFilter] = useState('TODOS') // TODOS | VACIO | OCUPADO | BLOQUEADO
  const [selected, setSelected] = useState(null)

  const load = async (r = rowCode) => {
    // Reutilizamos tu endpoint existente. No rompe nada.
    const res = await client.get(`/api/locations/racks/${r}`)
    setLocs(res.data?.locations || [])
  }

  useEffect(() => { load(rowCode) }, [rowCode])

  // tiempo real
  useEffect(() => {
    const onRackUpdate = (ev) => {
      if (!ev?.rackCode) return
      if (String(ev.rackCode).toUpperCase() === String(rowCode).toUpperCase()) load(rowCode)
    }
    socket.on('rack:update', onRackUpdate)
    return () => socket.off('rack:update', onRackUpdate)
  }, [rowCode])

  // Mapear: usamos position 1..5 como "nivel/bin" (1 bin por nivel)
  const mapByLevel = useMemo(() => {
    const m = new Map()
    for (const l of locs) {
      const lvl = Number(l.position || 0)
      if (lvl >= 1 && lvl <= 5) m.set(lvl, l)
    }
    return m
  }, [locs])

  const capacity = FFT_LEVELS.length

  const getBin = (lvl) => {
    const l = mapByLevel.get(lvl)
    const state = l?.state || 'VACIO'
    const code = l?.code || `FFT-${rowCode}-N${String(lvl).padStart(3, '0')}` // solo display
    return { raw: l || null, state, code }
  }

  const matchesFilter = (state) => {
    if (filter === 'TODOS') return true
    if (filter === 'VACIO') return state === 'VACIO'
    return state === filter
  }

  const stats = useMemo(() => {
    let ocupadas = 0, bloqueadas = 0, vacias = 0
    for (const lvl of FFT_LEVELS) {
      const { state } = getBin(lvl)
      if (state === 'OCUPADO') ocupadas++
      else if (state === 'BLOQUEADO') bloqueadas++
      else vacias++
    }
    const pct = capacity ? Math.round((ocupadas / capacity) * 100) : 0
    return { ocupadas, bloqueadas, vacias, pct }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapByLevel, rowCode])

  const onBinClick = (lvl) => {
    const { raw, state, code } = getBin(lvl)
    setSelected({ lvl, raw, state, code })
  }

  return (
    <Box sx={{ color: '#e5e7eb' }}>
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb:2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900 }}>
          FFT (Accesorios)
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

      <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', lg:'1fr 360px' }, gap:2 }}>
        {/* IZQ */}
        <Box>
          {/* KPIs */}
          <Box sx={{ display:'grid', gridTemplateColumns:{ xs:'1fr', sm:'repeat(2,1fr)', md:'repeat(4,1fr)' }, gap:2, mb:2 }}>
            <Paper elevation={0} sx={{ p:2, borderRadius:3, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.04)' }}>
              <Typography sx={{ opacity:.75, fontSize:12 }}>Fila FFT</Typography>
              <Typography sx={{ fontWeight:900, fontSize:26 }}>{rowCode}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p:2, borderRadius:3, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.04)' }}>
              <Typography sx={{ opacity:.75, fontSize:12 }}>Capacidad</Typography>
              <Typography sx={{ fontWeight:900, fontSize:26 }}>{capacity}</Typography>
              <Typography sx={{ opacity:.7, fontSize:12, mt:.5 }}>1 bin por nivel</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p:2, borderRadius:3, border:'1px solid rgba(34,197,94,.20)', background:'rgba(34,197,94,.08)' }}>
              <Typography sx={{ opacity:.75, fontSize:12 }}>Ocupadas</Typography>
              <Typography sx={{ fontWeight:900, fontSize:26 }}>{stats.ocupadas}</Typography>
            </Paper>
            <Paper elevation={0} sx={{ p:2, borderRadius:3, border:'1px solid rgba(239,68,68,.20)', background:'rgba(239,68,68,.08)' }}>
              <Typography sx={{ opacity:.75, fontSize:12 }}>Bloqueadas</Typography>
              <Typography sx={{ fontWeight:900, fontSize:26 }}>{stats.bloqueadas}</Typography>
            </Paper>
          </Box>

          {/* Filtros */}
          <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.04)' }}>
            <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems={{ xs:'stretch', md:'center' }}>
              <TextField
                select
                size="small"
                label="Fila (FFT)"
                value={rowCode}
                onChange={(e)=>setRowCode(e.target.value)}
                sx={{ width:{ xs:'100%', md:220 }, '& .MuiInputBase-root':{ bgcolor:'rgba(0,0,0,.18)' } }}
              >
                {FFT_ROWS.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>

              <TextField
                select
                size="small"
                label="Filtro"
                value={filter}
                onChange={(e)=>setFilter(e.target.value)}
                sx={{ width:{ xs:'100%', md:220 }, '& .MuiInputBase-root':{ bgcolor:'rgba(0,0,0,.18)' } }}
              >
                <MenuItem value="TODOS">Todos</MenuItem>
                <MenuItem value="VACIO">Vacíos</MenuItem>
                <MenuItem value="OCUPADO">Ocupados</MenuItem>
                <MenuItem value="BLOQUEADO">Bloqueados</MenuItem>
              </TextField>

              <Box sx={{ flex:1 }} />

              <Button onClick={() => load(rowCode)} variant="outlined" sx={{ borderRadius:2 }}>
                Recargar
              </Button>
            </Stack>
          </Paper>

          {/* MAPA FFT: una columna (N1..N5) */}
          <Paper elevation={0} sx={{ p:2, borderRadius:3, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.04)' }}>
            <Typography sx={{ fontWeight:900, mb:1 }}>
              FFT {rowCode} · Bins por nivel <span style={{ opacity:.7 }}>(1–5)</span>
            </Typography>
            <Divider sx={{ my:1.5, borderColor:'rgba(255,255,255,.06)' }} />

            <Box sx={{ display:'grid', gap:1 }}>
              {FFT_LEVELS.map((lvl) => {
                const { state, code } = getBin(lvl)
                const dim = !matchesFilter(state)
                const isSel = selected && selected.lvl === lvl

                return (
                  <Box
                    key={lvl}
                    onClick={() => onBinClick(lvl)}
                    role="button"
                    sx={{
                      cursor:'pointer',
                      userSelect:'none',
                      p: 1.3,
                      borderRadius: 2,
                      border: isSel ? '2px solid rgba(59,130,246,.75)' : cellBorder(state),
                      bgcolor: cellColor(state),
                      opacity: dim ? 0.35 : 1,
                      transition:'transform .08s ease, box-shadow .15s ease',
                      '&:hover': { transform: dim ? 'none' : 'translateY(-1px)', boxShadow: dim ? 'none' : '0 10px 25px rgba(0,0,0,.25)' }
                    }}
                  >
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography sx={{ fontWeight: 900 }}>
                          Nivel {lvl} · BIN {String(lvl).padStart(3,'0')}
                        </Typography>
                        <Typography sx={{ opacity:.75, fontSize: 12 }}>
                          {code}
                        </Typography>
                      </Box>

                      <Chip
                        size="small"
                        label={state}
                        sx={{
                          bgcolor:'rgba(255,255,255,.06)',
                          color:'#e5e7eb',
                          border:'1px solid rgba(255,255,255,.10)',
                          fontWeight: 900
                        }}
                      />
                    </Stack>
                  </Box>
                )
              })}
            </Box>
          </Paper>
        </Box>

        {/* DER */}
        <Box>
          <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.04)' }}>
            <Typography sx={{ fontWeight:900, mb:1 }}>Detalle FFT</Typography>
            <Divider sx={{ mb:2, borderColor:'rgba(255,255,255,.06)' }} />

            {!selected ? (
              <Typography sx={{ opacity:.75, fontSize:13 }}>
                Selecciona un nivel/bin para ver detalles.
              </Typography>
            ) : (
              <Box>
                <Typography sx={{ fontWeight:900, fontSize:16, mb:1 }}>
                  {selected.code}
                </Typography>

                <Stack direction="row" spacing={1} sx={{ mb:2, flexWrap:'wrap' }} useFlexGap>
                  <Chip size="small" label={`Fila ${rowCode}`} sx={{ bgcolor:'rgba(255,255,255,.06)', color:'#e5e7eb' }} />
                  <Chip size="small" label={`Nivel ${selected.lvl}`} sx={{ bgcolor:'rgba(255,255,255,.06)', color:'#e5e7eb' }} />
                  <Chip size="small" label={selected.state} sx={{ bgcolor:'rgba(255,255,255,.06)', color:'#e5e7eb', fontWeight: 900 }} />
                </Stack>

                <Box sx={{ display:'grid', gridTemplateColumns:'120px 1fr', rowGap:1, columnGap:1.5 }}>
                  <Typography sx={{ opacity:.7, fontSize:12 }}>Tarima</Typography>
                  <Typography sx={{ fontSize:12 }}>
                    {selected.raw?.pallet?.code || selected.raw?.palletCode || '--'}
                  </Typography>

                  <Typography sx={{ opacity:.7, fontSize:12 }}>SKU</Typography>
                  <Typography sx={{ fontSize:12 }}>
                    {selected.raw?.pallet?.sku || selected.raw?.sku || '--'}
                  </Typography>

                  <Typography sx={{ opacity:.7, fontSize:12 }}>Qty</Typography>
                  <Typography sx={{ fontSize:12 }}>
                    {selected.raw?.pallet?.qty || selected.raw?.qty || '--'}
                  </Typography>

                  <Typography sx={{ opacity:.7, fontSize:12 }}>Último mov.</Typography>
                  <Typography sx={{ fontSize:12 }}>
                    {selected.raw?.lastMoveAt || '--'}
                  </Typography>

                  <Typography sx={{ opacity:.7, fontSize:12 }}>Usuario</Typography>
                  <Typography sx={{ fontSize:12 }}>
                    {selected.raw?.lastMoveBy || '--'}
                  </Typography>
                </Box>
              </Box>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p:2, borderRadius:3, border:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.04)' }}>
            <Typography sx={{ fontWeight:900, mb:1 }}>Ocupación</Typography>
            <Divider sx={{ mb:2, borderColor:'rgba(255,255,255,.06)' }} />
            <Stack spacing={1.2}>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ opacity:.75, fontSize:12 }}>Ocupación</Typography>
                  <Typography sx={{ fontWeight:900, fontSize:12 }}>{stats.pct}%</Typography>
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

              <Box sx={{ display:'grid', gridTemplateColumns:'1fr auto', gap:1 }}>
                <Typography sx={{ opacity:.75, fontSize:12 }}>Vacías</Typography>
                <Typography sx={{ fontWeight:900, fontSize:12 }}>{stats.vacias}</Typography>
                <Typography sx={{ opacity:.75, fontSize:12 }}>Ocupadas</Typography>
                <Typography sx={{ fontWeight:900, fontSize:12 }}>{stats.ocupadas}</Typography>
                <Typography sx={{ opacity:.75, fontSize:12 }}>Bloqueadas</Typography>
                <Typography sx={{ fontWeight:900, fontSize:12 }}>{stats.bloqueadas}</Typography>
              </Box>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </Box>
  )
}