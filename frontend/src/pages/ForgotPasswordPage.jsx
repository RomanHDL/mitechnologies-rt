import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageStyles } from '../ui/pageStyles'

import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import { useTheme } from '@mui/material/styles'

export default function ForgotPasswordPage() {
  const nav = useNavigate()
  const ps = usePageStyles()
  const theme = useTheme()
  const isDark = theme.palette.mode === 'dark'

  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')

  const onSubmit = (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (!email || !email.includes('@')) {
      setError('Ingresa un correo valido')
      return
    }
    const subject = encodeURIComponent('Solicitud de recuperacion de contrasena')
    const body = encodeURIComponent(`Hola,\n\nSolicito recuperar el acceso a mi cuenta con el correo: ${email}\n\nGracias.`)
    window.location.href = `mailto:romanherrera548@gmail.com?subject=${subject}&body=${body}`
    setOk('Se abrio tu cliente de correo para contactar al administrador.')
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
            Recuperar contrasena
          </Typography>
          <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
            Ingresa tu correo para contactar al administrador
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <Box>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>Correo</Typography>
              <TextField
                sx={{ '& .MuiOutlinedInput-root': { bgcolor: isDark ? 'rgba(255,255,255,.03)' : '#FFFFFF' } }}
                placeholder="correo@empresa.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
                size="small"
              />
            </Box>
            <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.2 }}>
              Contactar administrador
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
