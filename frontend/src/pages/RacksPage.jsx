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

const levels = ['A','B','C']
const positions = Array.from({ length: 12 }, (_, i) => i + 1)

function cellColor(state) {
  if (state === 'BLOQUEADO') return '#fee2e2'
  if (state === 'OCUPADO') return '#dcfce7'
  return '#f3f4f6'
}

const rackOptions = Array.from({ length: 125 }, (_, i) => `F${String(i+1).padStart(3,'0')}`)

export default function RacksPage() {
  const client = useMemo(() => api(), [])
  const [rackCode, setRackCode] = useState('F001')
  const [locs, setLocs] = useState([])
  const [q, setQ] = useState('') // búsqueda por código completo
  const [highlight, setHighlight] = useState(null)

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

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Racks</Typography>

      <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2 }}>
        <Stack direction={{ xs:'column', md:'row' }} spacing={2} alignItems={{ xs:'stretch', md:'center' }}>
          <TextField
            select
            size="small"
            label="Rack"
            value={rackCode}
            onChange={(e)=>setRackCode(e.target.value)}
            sx={{ width: { xs:'100%', md: 220 } }}
          >
            {rackOptions.map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>

          <TextField
            size="small"
            label='Buscar ubicación (A01-F059-012)'
            value={q}
            onChange={(e)=>setQ(e.target.value)}
            onKeyDown={(e)=> e.key === 'Enter' && onSearch()}
            sx={{ flex:1 }}
          />

          <Box sx={{ display:'flex', gap:1, justifyContent:'flex-end' }}>
            <Chip size="small" label="VACÍO" sx={{ bgcolor:'#f3f4f6' }} />
            <Chip size="small" label="OCUPADO" sx={{ bgcolor:'#dcfce7' }} />
            <Chip size="small" label="BLOQUEADO" sx={{ bgcolor:'#fee2e2' }} />
          </Box>
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb:2 }}>
          Mapa {rackCode} (A–C / 1–12)
        </Typography>

        <Box sx={{ display:'grid', gap:1 }}>
          {levels.map(level => (
            <Box
              key={level}
              sx={{ display:'grid', gridTemplateColumns:'80px repeat(12, 1fr)', gap:1, alignItems:'center' }}
            >
              <Typography sx={{ fontWeight: 900 }}>{level}</Typography>

              {positions.map(pos => {
                const l = map.get(`${level}-${pos}`)
                const state = l?.state || 'VACIO'
                const code = l?.code || `${level}${String(pos).padStart(2,'0')}-${rackCode}-${String(pos).padStart(3,'0')}`
                const isHi = highlight && code === highlight

                return (
                  <Box key={pos} sx={{
                    p:1,
                    borderRadius:2,
                    border: isHi ? '2px solid #2563eb' : '1px solid #e5e7eb',
                    bgcolor: cellColor(state),
                    textAlign:'center',
                    fontSize: 12
                  }}>
                    <div style={{ fontWeight: 900 }}>{String(pos).padStart(2,'0')}</div>
                    <div style={{ opacity: .75 }}>{state}</div>
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>

        <Divider sx={{ my:2 }} />

        <Typography variant="caption" sx={{ opacity: 0.75 }}>
          Tip: escribe un código como <b>A01-F059-012</b> y te cambia al rack automáticamente.
        </Typography>
      </Paper>
    </Box>
  )
}
