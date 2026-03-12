import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import { usePageStyles } from '../ui/pageStyles'

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
  const ps = usePageStyles()

  const [employeeNumber, setEmployeeNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api().post('/api/auth/login', { employeeNumber, password })
      login(res.data.token, res.data.user)
      nav('/')
    } catch (err) {
      setError(err?.response?.data?.message || 'Error al iniciar sesion')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={ps.authBackground}>
      <Paper elevation={0} sx={ps.authCard}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Box
            sx={{
              width: 56,
              height: 56,
              borderRadius: 3,
              bgcolor: 'primary.main',
              display: 'grid',
              placeItems: 'center',
              mx: 'auto',
              mb: 2,
              boxShadow: '0 4px 14px rgba(21,101,192,.25)',
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: 'white' }}>MT</Typography>
          </Box>

          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>
            Iniciar Sesion
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>
            Acceso al sistema de almacen
          </Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField
              sx={ps.authInput}
              label="Numero de Empleado"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              autoComplete="off"
              fullWidth
            />
            <TextField
              sx={ps.authInput}
              label="Contrasena"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              fullWidth
            />

            <Button
              type="submit"
              variant="contained"
              size="large"
              fullWidth
              sx={{ py: 1.3 }}
              disabled={loading}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </Button>

            <Box sx={{ textAlign: 'center' }}>
              <Link
                component="button"
                type="button"
                underline="hover"
                sx={{ fontWeight: 600, color: 'primary.main' }}
                onClick={() => nav('/forgot-password')}
              >
                Olvidaste tu contrasena?
              </Link>
            </Box>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
