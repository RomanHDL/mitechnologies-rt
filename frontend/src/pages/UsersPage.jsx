import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { apiFetch } from '../services/api'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import MenuItem from '@mui/material/MenuItem'
import Stack from '@mui/material/Stack'
import Alert from '@mui/material/Alert'
import Divider from '@mui/material/Divider'
import Table from '@mui/material/Table'
import TableBody from '@mui/material/TableBody'
import TableCell from '@mui/material/TableCell'
import TableHead from '@mui/material/TableHead'
import TableRow from '@mui/material/TableRow'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import Chip from '@mui/material/Chip'

export default function UsersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // ---- CREAR (tu form original, conservado) ----
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
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, employeeNumber, fullName, role, position })
      })
      setMsg('Usuario creado')
      setEmail(''); setEmployeeNumber(''); setFullName('')
      // refrescar lista
      await loadUsers()
    } catch (e) {
      setErr(e?.message || 'Error')
    }
  }

  // ---- LISTA + EDICIÓN ----
  const [q, setQ] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [listErr, setListErr] = useState('')

  const [openEdit, setOpenEdit] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [resetPass, setResetPass] = useState('')
  const [resetPin, setResetPin] = useState('')

  // ✅ extra: mensaje dentro del modal (para que veas “Password reseteado ✅” ahí mismo)
  const [modalMsg, setModalMsg] = useState('')
  const [modalErr, setModalErr] = useState('')

  const loadUsers = useMemo(() => {
    return async () => {
      if (!isAdmin) return
      setLoading(true)
      setListErr('')
      try {
        // users.routes.js => GET /api/users?q=&page=&limit=
        const res = await apiFetch(`/api/users?q=${encodeURIComponent(q)}&page=1&limit=50`)
        setUsers(res?.data || [])
      } catch (e) {
        setListErr(e?.message || 'Error cargando usuarios')
        setUsers([])
      } finally {
        setLoading(false)
      }
    }
  }, [isAdmin, q])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  const openEditDialog = (u) => {
    setEditUser({ ...u })
    setResetPass('')
    setResetPin('')
    setModalMsg('')
    setModalErr('')
    setOpenEdit(true)
  }

  const saveEdit = async () => {
    if (!editUser?.id) return
    setEditSaving(true)
    setListErr('')
    setModalErr('')
    try {
      // users.routes.js => PATCH /api/users/:id
      await apiFetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: editUser.email,
          employeeNumber: editUser.employeeNumber,
          fullName: editUser.fullName,
          role: editUser.role,
          position: editUser.position,
          isActive: editUser.isActive
        })
      })
      setOpenEdit(false)
      await loadUsers()
    } catch (e) {
      setListErr(e?.message || 'Error guardando cambios')
      setModalErr(e?.message || 'Error guardando cambios')
    } finally {
      setEditSaving(false)
    }
  }

  const toggleActive = async (u) => {
    if (!u?.id) return
    setListErr('')
    try {
      await apiFetch(`/api/users/${u.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: !u.isActive })
      })
      await loadUsers()
    } catch (e) {
      setListErr(e?.message || 'Error actualizando usuario')
    }
  }

  // ✅ CAMBIO IMPORTANTE: reset password con fallback a /api/admin/users
  const doResetPassword = async () => {
    if (!editUser?.id) return

    setModalMsg('')
    setModalErr('')
    setListErr('')

    const newPassword = String(resetPass || '')
    if (!newPassword || newPassword.length < 6) {
      const m = 'La nueva contraseña debe tener mínimo 6 caracteres'
      setModalErr(m)
      setListErr(m)
      return
    }

    const payload = { newPassword }

    // 1) intentamos la ruta “principal”
    try {
      await apiFetch(`/api/users/${editUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify(payload)
      })
      setModalMsg('Password reseteado ✅')
      setMsg('Password reseteado ✅')
      setResetPass('')
      return
    } catch (e1) {
      // Si falla porque tu backend lo tiene en /api/admin/users o con PATCH, probamos fallback
      const m1 = e1?.message || 'Error reseteando password'
      // 2) fallback: /api/admin/users/:id/reset-password (PATCH)
      try {
        await apiFetch(`/api/admin/users/${editUser.id}/reset-password`, {
          method: 'PATCH',
          body: JSON.stringify({ newPassword })
        })
        setModalMsg('Password reseteado ✅')
        setMsg('Password reseteado ✅')
        setResetPass('')
        return
      } catch (e2) {
        const m2 = e2?.message || m1
        setModalErr(m2)
        setListErr(m2)
      }
    }
  }

  const doResetPin = async () => {
    if (!editUser?.id) return
    setModalMsg('')
    setModalErr('')
    setListErr('')
    try {
      // admin.routes.js => PATCH /api/admin/users/:id/reset-pin
      await apiFetch(`/api/admin/users/${editUser.id}/reset-pin`, {
        method: 'PATCH',
        body: JSON.stringify(resetPin ? { newPin: resetPin } : {})
      })
      setModalMsg('PIN reseteado ✅')
      setMsg('PIN reseteado ✅')
      setResetPin('')
    } catch (e) {
      const m = e?.message || 'Error reseteando PIN'
      setModalErr(m)
      setListErr(m)
    }
  }

  return (
    <Box>
      <Typography variant="h6" sx={{ fontWeight: 900, mb: 2 }}>Usuarios</Typography>

      <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
        {!isAdmin && <Alert severity="warning">Solo ADMIN puede crear usuarios.</Alert>}
        {msg && <Alert sx={{ mt: 2 }} severity="success">{msg}</Alert>}
        {err && <Alert sx={{ mt: 2 }} severity="error">{err}</Alert>}

        <Stack spacing={2} sx={{ mt: 2 }}>
          <TextField disabled={!isAdmin} label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} />
          <TextField disabled={!isAdmin} label="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />
          <TextField disabled={!isAdmin} label="Número de empleado" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} />
          <TextField disabled={!isAdmin} label="Nombre" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          <TextField disabled={!isAdmin} select label="Rol" value={role} onChange={(e) => setRole(e.target.value)}>
            {['ADMIN', 'SUPERVISOR', 'OPERADOR'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
          </TextField>
          <TextField disabled={!isAdmin} label="Puesto (Supervisor/Coordinador/Gerente/etc)" value={position} onChange={(e) => setPosition(e.target.value)} />
          <Button disabled={!isAdmin} variant="contained" onClick={create}>Crear usuario</Button>
        </Stack>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* LISTA */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 900, flex: 1 }}>Lista de usuarios</Typography>
          <TextField
            size="small"
            label="Buscar (empleado/correo/nombre)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <Button variant="outlined" onClick={loadUsers} disabled={!isAdmin || loading}>
            {loading ? 'Cargando...' : 'Refrescar'}
          </Button>
        </Stack>

        {!isAdmin && <Alert severity="info">Inicia sesión como ADMIN para ver la lista.</Alert>}
        {listErr && <Alert severity="error" sx={{ mb: 2 }}>{listErr}</Alert>}

        {isAdmin && (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell><b>Empleado</b></TableCell>
                <TableCell><b>Nombre</b></TableCell>
                <TableCell><b>Correo</b></TableCell>
                <TableCell><b>Rol</b></TableCell>
                <TableCell><b>Activo</b></TableCell>
                <TableCell align="right"><b>Acciones</b></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map(u => (
                <TableRow key={u.id}>
                  <TableCell sx={{ fontFamily: 'monospace', fontWeight: 900 }}>{u.employeeNumber}</TableCell>
                  <TableCell>{u.fullName}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell><Chip size="small" label={u.role} /></TableCell>
                  <TableCell>{u.isActive ? 'Sí' : 'No'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                      <Button size="small" variant="outlined" onClick={() => openEditDialog(u)}>Editar</Button>
                      <Button size="small" variant="contained" onClick={() => toggleActive(u)}>
                        {u.isActive ? 'Desactivar' : 'Activar'}
                      </Button>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
              {!users.length && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ opacity: 0.7 }}>
                    {loading ? 'Cargando...' : 'No hay usuarios para mostrar.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>

      {/* EDIT DIALOG */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Editar usuario</DialogTitle>
        <DialogContent>
          {modalMsg && <Alert severity="success" sx={{ mt: 2 }}>{modalMsg}</Alert>}
          {modalErr && <Alert severity="error" sx={{ mt: 2 }}>{modalErr}</Alert>}

          {editUser && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <TextField label="Correo" value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} />
              <TextField label="Número de empleado" value={editUser.employeeNumber || ''} onChange={(e) => setEditUser({ ...editUser, employeeNumber: e.target.value })} />
              <TextField label="Nombre" value={editUser.fullName || ''} onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })} />

              <TextField select label="Rol" value={editUser.role || 'OPERADOR'} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}>
                {['ADMIN', 'SUPERVISOR', 'OPERADOR'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>

              <TextField label="Puesto" value={editUser.position || ''} onChange={(e) => setEditUser({ ...editUser, position: e.target.value })} />

              <TextField select label="Activo" value={editUser.isActive ? '1' : '0'} onChange={(e) => setEditUser({ ...editUser, isActive: e.target.value === '1' })}>
                <MenuItem value="1">Sí</MenuItem>
                <MenuItem value="0">No</MenuItem>
              </TextField>

              <Divider />

              <Typography sx={{ fontWeight: 900 }}>Reset Password</Typography>
              <TextField label="Nueva contraseña (mín 6)" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
              <Button variant="outlined" onClick={doResetPassword}>Resetear Password</Button>

              <Divider />

              <Typography sx={{ fontWeight: 900 }}>Reset PIN</Typography>
              <TextField label="Nuevo PIN (opcional)" value={resetPin} onChange={(e) => setResetPin(e.target.value)} />
              <Button variant="outlined" onClick={doResetPin}>Resetear PIN</Button>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cerrar</Button>
          <Button disabled={editSaving} variant="contained" onClick={saveEdit}>
            {editSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}