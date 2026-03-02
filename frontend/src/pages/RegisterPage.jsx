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
    <Box sx={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      px: 2,
      backgroundImage: `
        radial-gradient(1200px 500px at 15% 20%, rgba(21,101,192,0.30), transparent 60%),
        radial-gradient(900px 420px at 85% 15%, rgba(2,136,209,0.22), transparent 60%),
        linear-gradient(135deg, rgba(10,37,64,0.30), rgba(10,37,64,0.08)),
        url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=2000&q=60")
      `,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundBlendMode: 'screen, screen, normal, normal',
    }}>
      <Paper elevation={0} sx={{
        width: 'min(520px, 100%)',
        p: 4,
        borderRadius: 4,
        backdropFilter: 'blur(10px)',
        background: 'rgba(255,255,255,0.88)',
        border: '1px solid rgba(21,101,192,0.12)',
      }}>
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
