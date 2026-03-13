import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'

export default function RegisterPage() {
  const nav = useNavigate()
  const ps = usePageStyles()

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
      setOk('Cuenta creada. Ahora inicia sesion.')
      setTimeout(() => nav('/login'), 700)
    } catch (err) {
      setError(err?.message || 'No se pudo crear la cuenta')
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
              width: 56, height: 56, borderRadius: 3,
              bgcolor: 'primary.main', display: 'grid', placeItems: 'center',
              mx: 'auto', mb: 2, boxShadow: '0 4px 14px rgba(21,101,192,.25)',
            }}
          >
            <Typography sx={{ fontWeight: 800, fontSize: 20, color: 'white' }}>MT</Typography>
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Crear cuenta</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Registro de nuevo usuario</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField sx={ps.authInput} label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} fullWidth />
            <TextField sx={ps.authInput} label="Numero de empleado" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} fullWidth />
            <TextField sx={ps.authInput} label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <TextField sx={ps.authInput} label="Contrasena" type="password" value={password} onChange={(e) => setPassword(e.target.value)} fullWidth />
            <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.3 }} disabled={loading}>
              {loading ? 'Creando...' : 'Crear'}
            </Button>
            <Button variant="text" fullWidth onClick={() => nav('/login')} sx={{ fontWeight: 600 }}>Volver a login</Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
