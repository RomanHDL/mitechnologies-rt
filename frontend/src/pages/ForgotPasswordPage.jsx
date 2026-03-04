import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { usePageStyles } from '../ui/pageStyles'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'

export default function ForgotPasswordPage() {
  const nav = useNavigate()
  const ps = usePageStyles()

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
          <Typography variant="h5" sx={{ fontWeight: 800, color: 'text.primary' }}>Recuperar contrasena</Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary', mt: 0.5 }}>Ingresa tu correo para contactar al administrador</Typography>
        </Box>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {ok && <Alert severity="success" sx={{ mb: 2 }}>{ok}</Alert>}

        <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            <TextField sx={ps.authInput} label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <Button type="submit" variant="contained" size="large" fullWidth sx={{ py: 1.3 }}>
              Contactar administrador
            </Button>
            <Button variant="text" fullWidth onClick={() => nav('/login')} sx={{ fontWeight: 600 }}>Volver a login</Button>
          </Stack>
        </Box>
      </Paper>
    </Box>
  )
}
