import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'

export default function RegisterPage() {
  const nav = useNavigate()
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
      setOk('Cuenta creada. Ahora inicia sesión.')
      setTimeout(() => nav('/login'), 700)
    } catch (err) {
      setError(err?.response?.data?.message || 'No se pudo crear la cuenta')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, background: '#0b1220' }}>
      <Paper sx={{ width: 'min(520px, 100%)', p: 4, borderRadius: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>Crear cuenta</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Nombre completo" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
            <TextField label="Número de empleado" value={employeeNumber} onChange={(e)=>setEmployeeNumber(e.target.value)} />
            <TextField label="Correo" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <TextField label="Contraseña" type="password" value={password} onChange={(e)=>setPassword(e.target.value)} />
            <Button type="submit" variant="contained" disabled={loading}>
              {loading ? 'Creando...' : 'Crear'}
            </Button>
            <Button variant="text" onClick={() => nav('/login')}>Volver a login</Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
