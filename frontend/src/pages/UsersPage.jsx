import React, { useState } from 'react'
import { useAuth } from '../state/auth'
import { api } from '../lib/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'

export default function UsersPage() {
  const { token, user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('User123!')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('OPERADOR')
  const [position, setPosition] = useState('Ayudante')
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  const create = async () => {
    setMsg(''); setErr('')
    try {
      await api(token).post('/api/auth/register', { email, password, employeeNumber, fullName, role, position })
      setMsg('Usuario creado')
      setEmail(''); setEmployeeNumber(''); setFullName('')
      } catch (e) {
    setErr(e?.message || 'Error')
  } }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb:2 }}>Usuarios</Typography>
      <Paper elevation={0} sx={{ p:2, borderRadius:3 }}>
        {!isAdmin && <Alert severity="warning">Solo ADMIN puede crear usuarios.</Alert>}
        {msg && <Alert sx={{ mt:2 }} severity="success">{msg}</Alert>}
        {err && <Alert sx={{ mt:2 }} severity="error">{err}</Alert>}

        <Stack spacing={2} sx={{ mt:2 }}>
          <TextField disabled={!isAdmin} label="Correo" value={email} onChange={(e)=>setEmail(e.target.value)} />
          <TextField disabled={!isAdmin} label="Contraseña" value={password} onChange={(e)=>setPassword(e.target.value)} />
          <TextField disabled={!isAdmin} label="Número de empleado" value={employeeNumber} onChange={(e)=>setEmployeeNumber(e.target.value)} />
          <TextField disabled={!isAdmin} label="Nombre" value={fullName} onChange={(e)=>setFullName(e.target.value)} />
          <TextField disabled={!isAdmin} select label="Rol" value={role} onChange={(e)=>setRole(e.target.value)}>
            {['ADMIN','SUPERVISOR','OPERADOR'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField disabled={!isAdmin} label="Puesto (Supervisor/Coordinador/Gerente/etc)" value={position} onChange={(e)=>setPosition(e.target.value)} />
          <Button disabled={!isAdmin} variant="contained" onClick={create}>Crear usuario</Button>
        </Stack>
      </Paper>
    </Box>
  )
}
