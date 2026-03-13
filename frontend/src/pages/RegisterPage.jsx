import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'

export default function RegisterPage() {
  const nav = useNavigate()
  const ps = usePageStyles()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [fullName, setFullName] = useState('')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    setLoading(true)
    try {
      await api().post('/api/auth/register', { fullName, employeeNumber, email, password })
      setOk('Cuenta creada. Redirigiendo al login...')
      setTimeout(() => nav('/login'), 700)
    } catch (err) {
      setError(err?.message || 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  const inputSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: isDark ? 'rgba(255,255,255,.03)' : '#FFFFFF',
    },
  }

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      px: 2, py: 4,
      bgcolor: isDark ? '#020617' : '#F8FAFC',
    }}>
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 4, justifyContent: 'center' }}>
          <Box sx={{
            width: 36, height: 36, borderRadius: 1.5,
            background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
            display: 'grid', placeItems: 'center',
            fontWeight: 700, fontSize: 13, color: 'white',
          }}>MT</Box>
          <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'text.primary', letterSpacing: -0.2 }}>
            MiTechnologies
          </Typography>
        </Box>

        <Box sx={{ mb: 3 }}>
          <Typography sx={{ fontWeight: 700, fontSize: 24, color: 'text.primary', letterSpacing: -0.4, mb: 0.5 }}>
            Crear cuenta
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Registro de nuevo usuario en el sistema
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>Nombre completo</Typography>
              <TextField sx={inputSx} placeholder="Nombre y apellidos" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>Numero de empleado</Typography>
              <TextField sx={inputSx} placeholder="Ej: 0001" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>Correo</Typography>
              <TextField sx={inputSx} placeholder="correo@empresa.com" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth size="small" />
            </Box>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>Contrasena</Typography>
              <TextField sx={inputSx} placeholder="Minimo 8 caracteres" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth size="small" />
            </Box>
            <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.2, mt: 0.5 }} disabled={loading}>
              {loading ? 'Creando...' : 'Crear cuenta'}
            </Button>
            <Button variant="text" fullWidth onClick={() => nav('/login')} sx={{ fontWeight: 500, color: 'text.secondary' }}>
              Volver al login
            </Button>
          </Stack>
        </Box>
      </Box>
    </Box>
  )
}
