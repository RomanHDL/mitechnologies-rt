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

export default function ForgotPasswordPage() {
  const nav = useNavigate()
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [ok, setOk] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = (e) => {
    e.preventDefault()
    setError('')
    setOk('')
    if (!email || !email.includes('@')) {
      setError('Ingresa un correo válido')
      return
    }
    const subject = encodeURIComponent('Solicitud de recuperación de contraseña')
    const body = encodeURIComponent(`Hola,\n\nSolicito recuperar el acceso a mi cuenta con el correo: ${email}\n\nGracias.`)
    window.location.href = `mailto:romanherrera548@gmail.com?subject=${subject}&body=${body}`
    setOk('Se abrió tu cliente de correo para contactar al administrador.')
  }

  return (
    <Box sx={{ minHeight: '100vh', display: 'grid', placeItems: 'center', px: 2, background: '#0b1220' }}>
      <Paper sx={{ width: 'min(520px, 100%)', p: 4, borderRadius: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 900, mb: 2 }}>Recuperar contraseña</Typography>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}
        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField label="Correo" value={email} onChange={(e)=>setEmail(e.target.value)} />
            <Button type="submit" variant="contained">
              Contactar administrador
            </Button>
            <Button variant="text" onClick={() => nav('/login')}>Volver a login</Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
