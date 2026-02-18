import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Link from '@mui/material/Link'
import InputAdornment from '@mui/material/InputAdornment'
import IconButton from '@mui/material/IconButton'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

export default function LoginPage() {
  const nav = useNavigate()
  const { login } = useAuth()

  // ✅ sin datos automáticos
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api().post('/api/auth/login', { employeeNumber, email, password })

      // ✅ tu AuthProvider espera login({token,user})
      login({ token: res.data.token, user: res.data.user })

      nav('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  // ✅ estilo para que SIEMPRE se vea lo que escribes (texto, label, borde)
  const fieldSx = {
    '& .MuiInputBase-input': { color: 'rgba(15,23,42,0.92)' },
    '& .MuiInputLabel-root': { color: 'rgba(15,23,42,0.70)' },
    '& .MuiInputLabel-root.Mui-focused': { color: 'rgba(15,23,42,0.85)' },
    '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15,23,42,0.18)' },
    '& .MuiOutlinedInput-root:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(15,23,42,0.30)' },
    '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(30,91,184,0.65)' }
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'grid',
        placeItems: 'center',
        px: 2,
        backgroundImage: `
          radial-gradient(1200px 500px at 15% 20%, rgba(30,91,184,0.35), transparent 60%),
          radial-gradient(900px 420px at 85% 15%, rgba(15,118,110,0.28), transparent 60%),
          linear-gradient(135deg, rgba(2,6,23,0.35), rgba(2,6,23,0.10)),
          url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=60")
        `,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundBlendMode: 'screen, screen, normal, normal'
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: 'min(520px, 100%)',
          p: 4,
          borderRadius: 4,
          backdropFilter: 'blur(10px)',
          background: 'rgba(255,255,255,0.86)',
          border: '1px solid rgba(15, 23, 42, 0.10)'
        }}
      >
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, textAlign: 'center', color: 'rgba(15,23,42,0.92)' }}>
          Iniciar Sesión
        </Typography>
        <Typography variant="body2" sx={{ opacity: 0.75, textAlign: 'center', mb: 3, color: 'rgba(15,23,42,0.75)' }}>
          Acceso al sistema de almacén
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              sx={fieldSx}
              label="Número de Empleado"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              autoComplete="off"
            />

            <TextField
              sx={fieldSx}
              label="Correo Electrónico"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />

            <TextField
              sx={fieldSx}
              label="Contraseña"
              type={showPass ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPass(v => !v)} edge="end" aria-label="toggle password visibility">
                      {showPass ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                )
              }}
            />

            <Button type="submit" variant="contained" size="large" sx={{ py: 1.25 }} disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            {/* ✅ links reales */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2 }}>
              <Link
                component="button"
                type="button"
                underline="hover"
                sx={{ fontWeight: 700, opacity: 0.85 }}
                onClick={() => nav('/forgot-password')}
              >
                ¿Olvidaste tu contraseña?
              </Link>

              <Link
                component="button"
                type="button"
                underline="hover"
                sx={{ fontWeight: 700, opacity: 0.85 }}
                onClick={() => nav('/register')}
              >
                Crear cuenta
              </Link>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
