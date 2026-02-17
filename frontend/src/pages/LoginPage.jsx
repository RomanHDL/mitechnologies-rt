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

  export default function LoginPage() {
    const nav = useNavigate()
    const { login } = useAuth()
    const [employeeNumber, setEmployeeNumber] = useState('0001')
    const [email, setEmail] = useState('admin@demo.com')
    const [password, setPassword] = useState('Admin123!')
    const [error, setError] = useState('')

    const onSubmit = async (e) => {
      e.preventDefault()
      setError('')
      try {
        const res = await api().post('/auth/login', { employeeNumber, email, password })

        localStorage.setItem('token', res.data.token)
localStorage.setItem('user', JSON.stringify(res.data.user))

        login({ token: res.data.token, user: res.data.user })

        nav('/')
      } catch (err) {
        setError(err?.response?.data?.message || 'Error al iniciar sesión')
      }
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
          <Typography variant="h5" sx={{ fontWeight: 900, mb: 0.5, textAlign: 'center' }}>
            Iniciar Sesión
          </Typography>
          <Typography variant="body2" sx={{ opacity: 0.75, textAlign: 'center', mb: 3 }}>
            Acceso al sistema de almacén
          </Typography>

          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2}>
              <TextField label="Número de Empleado" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
              <TextField label="Correo Electrónico" value={email} onChange={(e) => setEmail(e.target.value)} />
              <TextField label="Contraseña" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

              <Button type="submit" variant="contained" size="large" sx={{ py: 1.25 }}>
                Entrar
              </Button>

              <Box sx={{ textAlign: 'center' }}>
                <Link href="#" underline="hover" sx={{ fontWeight: 700, opacity: 0.85 }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </Box>
            </Stack>
          </Box>
        </Paper>
      </Box>
    )
  }
