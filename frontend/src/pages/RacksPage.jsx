import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import ToggleButton from '@mui/material/ToggleButton'
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'

const levels = ['A','B','C']
const positions = Array.from({ length: 12 }, (_, i) => i + 1)

function cellColor(state) {
  if (state === 'BLOQUEADO') return '#fee2e2'
  if (state === 'OCUPADO') return '#dcfce7'
  return '#f3f4f6'
}

export default function RacksPage() {
  const { token } = useAuth()
  const [area, setArea] = useState('A1')
  const [locs, setLocs] = useState([])

  useEffect(() => {
    (async () => {
      const res = await api(token).get('/api/locations', { params: { area } })
      setLocs(res.data)
    })()
  }, [token, area])

  const map = useMemo(() => {
    const m = new Map()
    for (const l of locs) m.set(`${l.level}-${l.position}`, l)
    return m
  }, [locs])

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Racks</Typography>

      <Paper elevation={0} sx={{ p:2, borderRadius:3, mb:2 }}>
        <Stack direction="row" spacing={2} alignItems="center">
          <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Área</Typography>
          <ToggleButtonGroup value={area} exclusive onChange={(e,v)=>v && setArea(v)} size="small">
            {['A1','A2','A3','A4'].map(a => <ToggleButton key={a} value={a}>{a}</ToggleButton>)}
          </ToggleButtonGroup>
          <Box sx={{ flex:1 }} />
          <Chip size="small" label="VACÍO" sx={{ bgcolor:'#f3f4f6' }} />
          <Chip size="small" label="OCUPADO" sx={{ bgcolor:'#dcfce7' }} />
          <Chip size="small" label="BLOQUEADO" sx={{ bgcolor:'#fee2e2' }} />
        </Stack>
      </Paper>

      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 800, mb:2 }}>Mapa {area} (A–C / 1–12)</Typography>

        <Box sx={{ display:'grid', gap:1 }}>
          {levels.map(level => (
            <Box key={level} sx={{ display:'grid', gridTemplateColumns:'80px repeat(12, 1fr)', gap:1, alignItems:'center' }}>
              <Typography sx={{ fontWeight: 900 }}>{level}</Typography>
              {positions.map(pos => {
                const l = map.get(`${level}-${pos}`)
                const state = l?.state || 'VACIO'
                return (
                  <Box key={pos} sx={{
                    p:1,
                    borderRadius:2,
                    border:'1px solid #e5e7eb',
                    bgcolor: cellColor(state),
                    textAlign:'center',
                    fontSize: 12
                  }}>
                    <div style={{ fontWeight: 800 }}>{pos}</div>
                    <div style={{ opacity: .75 }}>{state}</div>
                  </Box>
                )
              })}
            </Box>
          ))}
        </Box>
      </Paper>
    </Box>
  )
}
