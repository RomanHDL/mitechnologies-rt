import React, { useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { api } from '../lib/api'
import { socket } from '../lib/socket'
import { usePageStyles } from '../ui/pageStyles'

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
import { useTheme } from '@mui/material/styles'

const levels = ['A','B','C']
const positions = Array.from({ length: 12 }, (_, i) => i + 1)

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

const rackOptions = Array.from({ length: 125 }, (_, i) => `F${String(i+1).padStart(3,'0')}`)

export default function RacksPage() {
  const client = useMemo(() => api(), [])
  const routerLoc = useLocation() // ✅ NUEVO: para recibir state desde Inventory
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'
  const ps = usePageStyles()

  const [rackCode, setRackCode] = useState('F001')
  const [locs, setLocs] = useState([])
  const [q, setQ] = useState('') // búsqueda por código completo
  const [highlight, setHighlight] = useState(null)

  // UI extra (no afecta lógica)
  const [filter, setFilter] = useState('TODOS') // TODOS | VACIO | OCUPADO | BLOQUEADO
  const [selected, setSelected] = useState(null) // { level, pos, code, state, raw }

  // ✅ NUEVO: si vienes desde Inventario con nav('/racks', { state: { rackCode, highlight } })
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

  const load = async (r = rackCode) => {
    const res = await client.get(`/api/locations/racks/${r}`)
    setLocs(res.data?.locations || [])
  }

  useEffect(() => { load(rackCode) }, [rackCode])

  // tiempo real
  useEffect(() => {
    const onRackUpdate = (ev) => {
      if (!ev?.rackCode) return
      if (String(ev.rackCode).toUpperCase() === rackCode) load(rackCode)
    }
    socket.on('rack:update', onRackUpdate)
    return () => socket.off('rack:update', onRackUpdate)
  }, [rackCode])

  const map = useMemo(() => {
    const m = new Map()
    for (const l of locs) m.set(`${l.level}-${l.position}`, l)
    return m
  }, [locs])

  const capacity = levels.length * positions.length

  const getCell = (level, pos) => {
    const l = map.get(`${level}-${pos}`)
    const state = l?.state || 'VACIO'
    // OJO: con tu formato original (no lo cambio)
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
    // formato esperado: A01-F059-012
    const parts = text.split('-')
    if (parts.length >= 2) {
      const r = parts[1] // F059
      if (r.startsWith('F')) {
        setRackCode(r)
        setHighlight(text)
        setTimeout(() => setHighlight(null), 4000)
      }
    }
  }

  // Si cambia de rack, limpia selección para que no "confunda"
  useEffect(() => {
    setSelected(null)
  }, [rackCode])

  const matchesFilter = (state) => {
    if (filter === 'TODOS') return true
    if (filter === 'VACIO') return state === 'VACIO'
    return state === filter
  }

  const onCellClick = (level, pos) => {
    const { raw, state, code } = getCell(level, pos)
    setSelected({ level, pos, raw, state, code })
  }

  return (
    <Box>
      {/* Título */}
      <Box sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', mb: 2 }}>
        <Typography variant="h6" sx={{ fontWeight: 900, color: 'text.primary' }}>
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

      {/* Layout principal: Izq (mapa) + Der (detalles) */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs:'1fr', lg:'1fr 360px' },
          gap: 2
        }}
      >
        {/* =================== IZQUIERDA =================== */}
        <Box>
          {/* Tarjetas superiores */}
          <Box
            sx={{
              display:'grid',
              gridTemplateColumns: { xs:'1fr', sm:'repeat(2, 1fr)', md:'repeat(5, 1fr)' },
              gap: 2,
              mb: 2
            }}
          >
            <Paper elevation={0} sx={{ ...ps.kpiCard('blue') }}>
              <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Rack</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{rackCode}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>Activo</Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...ps.kpiCard() }}>
              <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Capacidad</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{capacity}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>Posiciones</Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...ps.kpiCard('green') }}>
              <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Ocupadas</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{stats.ocupadas}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>
                {Math.round((stats.ocupadas / capacity) * 100)}%
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...ps.kpiCard() }}>
              <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Vacías</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{stats.vacias}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>
                {Math.round((stats.vacias / capacity) * 100)}%
              </Typography>
            </Paper>

            <Paper elevation={0} sx={{ ...ps.kpiCard('red') }}>
              <Typography sx={{ color: 'text.secondary', fontSize:12 }}>Bloqueadas</Typography>
              <Typography sx={{ fontWeight: 900, fontSize: 28, lineHeight: 1.1, color: 'text.primary' }}>{stats.bloqueadas}</Typography>
              <Typography sx={{ color: 'text.secondary', fontSize:12, mt:.5 }}>
                {Math.round((stats.bloqueadas / capacity) * 100)}%
              </Typography>
            </Paper>
          </Box>

          {/* Barra superior: Rack + búsqueda + filtros */}
          <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2 }}>
            <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems={{ xs:'stretch', md:'center' }}>
              <TextField
                select
                size="small"
                label="Rack"
                value={rackCode}
                onChange={(e)=>setRackCode(e.target.value)}
                sx={{ width: { xs:'100%', md: 220 }, ...ps.inputSx }}
              >
                {rackOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>

              <TextField
                size="small"
                label='Escanear o escribir ubicación (A01-F059-012)'
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
                  fontWeight: 900,
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
                  label="Vacíos"
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

              {/* Leyenda */}
              <Box sx={{ display:'flex', gap:1, justifyContent:'flex-end', flexWrap:'wrap' }}>
                <Chip size="small" label="VACÍO" sx={{ bgcolor: isDark ? 'rgba(148,163,184,.18)' : 'rgba(21,101,192,.10)', color: isDark ? '#E8EDF4' : '#1565C0', border: isDark ? '1px solid rgba(255,255,255,.08)' : '1px solid rgba(21,101,192,.20)' }} />
                <Chip size="small" label="OCUPADO" sx={{ bgcolor:'rgba(34,197,94,.18)', color: isDark ? '#86EFAC' : '#2E7D32', border:'1px solid rgba(34,197,94,.25)' }} />
                <Chip size="small" label="BLOQUEADO" sx={{ bgcolor:'rgba(239,68,68,.16)', color: isDark ? '#FCA5A5' : '#C62828', border:'1px solid rgba(239,68,68,.25)' }} />
              </Box>
            </Stack>
          </Paper>

          {/* Mapa */}
          <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, mb: 1, color: 'text.primary' }}>
              Mapa del Rack {rackCode} <span style={{ opacity:.75 }}>(A–C / 01–12)</span>
            </Typography>

            <Divider sx={{ my:1.5 }} />

            {/* Encabezado de columnas */}
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

            {/* Filas */}
            <Box sx={{ display:'grid', gap:1 }}>
              {levels.map(level => (
                <Box
                  key={level}
                  sx={{ display:'grid', gridTemplateColumns:'64px repeat(12, 1fr)', gap:1, alignItems:'center' }}
                >
                  <Typography sx={{ fontWeight: 900, color: 'text.primary' }}>{level}</Typography>

                  {positions.map(pos => {
                    const { state, code } = getCell(level, pos)
                    const isHi = highlight && code === highlight
                    const isSelected = selected && selected.level === level && selected.pos === pos

                    const dim = !matchesFilter(state)

                    return (
                      <Box
                        key={pos}
                        onClick={() => onCellClick(level, pos)}
                        role="button"
                        sx={{
                          cursor: 'pointer',
                          userSelect: 'none',
                          p: 1,
                          borderRadius: 2,
                          border: isHi
                            ? '2px solid #60a5fa'
                            : isSelected
                              ? '2px solid rgba(59,130,246,.75)'
                              : cellBorder(state, isDark),
                          bgcolor: cellColor(state, isDark),
                          textAlign: 'center',
                          fontSize: 12,
                          transition: 'transform .08s ease, box-shadow .15s ease, opacity .15s ease',
                          opacity: dim ? 0.35 : 1,
                          '&:hover': {
                            transform: dim ? 'none' : 'translateY(-1px)',
                            boxShadow: dim ? 'none' : '0 10px 25px rgba(0,0,0,.25)'
                          }
                        }}
                      >
                        <div style={{ fontWeight: 900, fontSize: 13, color: 'inherit' }}>
                          {level}{String(pos).padStart(2,'0')}
                        </div>
                        <div style={{ opacity: .85, fontSize: 11, color: 'inherit' }}>
                          {state}
                        </div>
                      </Box>
                    )
                  })}
                </Box>
              ))}
            </Box>

            <Divider sx={{ my:2 }} />

            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
              Tip: escribe un código como <b>A01-F059-012</b> y te cambia al rack automáticamente.
            </Typography>
          </Paper>
        </Box>

        {/* =================== DERECHA (PANEL) =================== */}
        <Box>
          <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'text.primary' }}>Detalles de Ubicación</Typography>
            <Divider sx={{ mb: 2 }} />

            {!selected ? (
              <Typography sx={{ color: 'text.secondary', fontSize: 13 }}>
                Da clic en una posición del mapa para ver detalles aquí.
              </Typography>
            ) : (
              <Box>
                <Typography sx={{ fontWeight: 900, fontSize: 18, mb: 1, color: 'text.primary' }}>
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
                    Estante: <b>{selected.level}</b> · Posición: <b>{String(selected.pos).padStart(2,'0')}</b>
                  </Typography>
                </Stack>

                {/* Estos campos NO rompen nada: si no existen, se muestran como -- */}
                <Box sx={{ display:'grid', gridTemplateColumns:'120px 1fr', rowGap: 1, columnGap: 1.5 }}>
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>SKU / Producto</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{selected.raw?.sku || selected.raw?.productName || '--'}</Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Lote</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{selected.raw?.lot || '--'}</Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Último mov.</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{selected.raw?.lastMoveAt || '--'}</Typography>

                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Usuario</Typography>
                  <Typography sx={{ fontSize: 12, color: 'text.primary' }}>{selected.raw?.lastMoveBy || '--'}</Typography>
                </Box>

                <Divider sx={{ my:2 }} />

                <Stack direction="row" spacing={1}>
                  <Button
                    variant="contained"
                    fullWidth
                    sx={{ textTransform:'none', fontWeight: 900, borderRadius: 2 }}
                    onClick={() => {}}
                  >
                    Registrar movimiento
                  </Button>
                </Stack>

                <Typography sx={{ mt:1.5, color: 'text.secondary', fontSize: 11 }}>
                  *Botón listo para conectar a tu modal/flujo actual (si ya existe).
                </Typography>
              </Box>
            )}
          </Paper>

          <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
            <Typography sx={{ fontWeight: 900, mb: 1, color: 'text.primary' }}>Estadísticas del Rack</Typography>
            <Divider sx={{ mb: 2 }} />

            <Stack spacing={1.2}>
              <Box>
                <Stack direction="row" justifyContent="space-between">
                  <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Ocupación</Typography>
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
                <Typography sx={{ color: 'text.secondary', fontSize: 12 }}>Vacías</Typography>
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
    </Box>
  )
}
