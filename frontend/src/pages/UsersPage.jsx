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
import Tooltip from '@mui/material/Tooltip'
import IconButton from '@mui/material/IconButton'

import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import EditIcon from '@mui/icons-material/Edit'
import LockIcon from '@mui/icons-material/Lock'
import LockOpenIcon from '@mui/icons-material/LockOpen'
import BadgeIcon from '@mui/icons-material/Badge'
import EmailIcon from '@mui/icons-material/Email'
import WorkIcon from '@mui/icons-material/Work'
import KeyIcon from '@mui/icons-material/Key'
import PinIcon from '@mui/icons-material/Pin'

export default function UsersPage() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  // ====== Mensajes globales ======
  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')

  // ====== LISTA + EDICIÓN ======
  const [q, setQ] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [listErr, setListErr] = useState('')

  const [filter, setFilter] = useState('ALL') // ALL | ACTIVE | INACTIVE | ADMIN | SUPERVISOR | OPERADOR

  // ====== Modal NUEVO USUARIO (B1) ======
  const [openCreate, setOpenCreate] = useState(false)

  // ---- CREAR (tu form original, conservado, ahora en modal) ----
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('User123!')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('OPERADOR')
  const [position, setPosition] = useState('Ayudante')

  // ====== Modal EDITAR ======
  const [openEdit, setOpenEdit] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [resetPass, setResetPass] = useState('')
  const [resetPin, setResetPin] = useState('')

  const [modalMsg, setModalMsg] = useState('')
  const [modalErr, setModalErr] = useState('')

  const roleChipSx = (r) => {
    if (r === 'ADMIN') return { bgcolor: '#F97316', color: '#111827', fontWeight: 900 }     // naranja industrial
    if (r === 'SUPERVISOR') return { bgcolor: '#1E3A8A', color: 'white', fontWeight: 900 }  // azul acero
    return { bgcolor: '#374151', color: 'white', fontWeight: 900 }                          // gris metal
  }

  const statusChip = (active) => (
    <Chip
      size="small"
      label={active ? '● ACTIVO' : '● INACTIVO'}
      sx={{
        fontWeight: 900,
        letterSpacing: 0.2,
        bgcolor: active ? '#16A34A' : '#DC2626',
        color: 'white'
      }}
    />
  )

  const loadUsers = useMemo(() => {
    return async () => {
      if (!isAdmin) return
      setLoading(true)
      setListErr('')
      try {
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

  const filteredUsers = useMemo(() => {
    let list = [...users]
    if (filter === 'ACTIVE') list = list.filter(u => u.isActive)
    if (filter === 'INACTIVE') list = list.filter(u => !u.isActive)
    if (filter === 'ADMIN') list = list.filter(u => u.role === 'ADMIN')
    if (filter === 'SUPERVISOR') list = list.filter(u => u.role === 'SUPERVISOR')
    if (filter === 'OPERADOR') list = list.filter(u => u.role === 'OPERADOR')
    return list
  }, [users, filter])

  const totals = useMemo(() => {
    const total = users.length
    const active = users.filter(u => u.isActive).length
    const admins = users.filter(u => u.role === 'ADMIN').length
    return { total, active, admins }
  }, [users])

  const openEditDialog = (u) => {
    setEditUser({ ...u })
    setResetPass('')
    setResetPin('')
    setModalMsg('')
    setModalErr('')
    setOpenEdit(true)
  }

  // ====== CREAR (B1): crea, cierra modal, refresca ======
  const create = async () => {
    setMsg(''); setErr('')
    setModalMsg(''); setModalErr('')
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, employeeNumber, fullName, role, position })
      })
      setMsg('Usuario creado ✅')
      // limpiar
      setEmail('')
      setEmployeeNumber('')
      setFullName('')
      setRole('OPERADOR')
      setPosition('Ayudante')
      setPassword('User123!')
      // B1: cerrar modal
      setOpenCreate(false)
      // refrescar lista
      await loadUsers()
    } catch (e) {
      const m = e?.message || 'Error'
      setErr(m)
      setModalErr(m)
    }
  }

  const saveEdit = async () => {
    if (!editUser?.id) return
    setEditSaving(true)
    setListErr('')
    setModalErr('')
    try {
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
      const m = e?.message || 'Error guardando cambios'
      setListErr(m)
      setModalErr(m)
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

    try {
      await apiFetch(`/api/users/${editUser.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ newPassword })
      })
      setModalMsg('Password reseteado ✅')
      setMsg('Password reseteado ✅')
      setResetPass('')
    } catch (e1) {
      // fallback si alguien lo dejó en /api/admin
      try {
        await apiFetch(`/api/admin/users/${editUser.id}/reset-password`, {
          method: 'PATCH',
          body: JSON.stringify({ newPassword })
        })
        setModalMsg('Password reseteado ✅')
        setMsg('Password reseteado ✅')
        setResetPass('')
      } catch (e2) {
        const m = e2?.message || e1?.message || 'Error reseteando password'
        setModalErr(m)
        setListErr(m)
      }
    }
  }

  const doResetPin = async () => {
    if (!editUser?.id) return
    setModalMsg('')
    setModalErr('')
    setListErr('')
    try {
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
      {/* ====== HEADER INDUSTRIAL ====== */}
      <Paper elevation={0} sx={{ p: 2.2, borderRadius: 3, mb: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={{ fontWeight: 950, letterSpacing: 0.6 }}>
              ⚙ CONTROL DE PERSONAL
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.8 }}>
              Gestión de operadores, supervisores y administradores
            </Typography>
          </Box>

          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" label={`TOTAL: ${totals.total}`} sx={{ fontWeight: 900, bgcolor: '#374151', color: 'white' }} />
            <Chip size="small" label={`ACTIVOS: ${totals.active}`} sx={{ fontWeight: 900, bgcolor: '#16A34A', color: 'white' }} />
            <Chip size="small" label={`ADMINS: ${totals.admins}`} sx={{ fontWeight: 900, bgcolor: '#F97316', color: '#111827' }} />
          </Stack>
        </Stack>
      </Paper>

      {/* Mensajes globales */}
      {msg && <Alert sx={{ mb: 2 }} severity="success">{msg}</Alert>}
      {err && <Alert sx={{ mb: 2 }} severity="error">{err}</Alert>}

      {/* ====== TOOLBAR ====== */}
      <Paper elevation={0} sx={{ p: 2, borderRadius: 3, mb: 2, border: '1px solid rgba(0,0,0,0.08)' }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
          <TextField
            size="small"
            label="Buscar (empleado/correo/nombre)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            fullWidth
          />

          <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ justifyContent: { xs: 'flex-start', md: 'center' } }}>
            <Chip clickable label="Todos" onClick={() => setFilter('ALL')}
              sx={{ fontWeight: 900, bgcolor: filter === 'ALL' ? '#1E3A8A' : 'transparent', color: filter === 'ALL' ? 'white' : 'inherit', border: '1px solid rgba(0,0,0,0.15)' }} />
            <Chip clickable label="Activos" onClick={() => setFilter('ACTIVE')}
              sx={{ fontWeight: 900, bgcolor: filter === 'ACTIVE' ? '#16A34A' : 'transparent', color: filter === 'ACTIVE' ? 'white' : 'inherit', border: '1px solid rgba(0,0,0,0.15)' }} />
            <Chip clickable label="Inactivos" onClick={() => setFilter('INACTIVE')}
              sx={{ fontWeight: 900, bgcolor: filter === 'INACTIVE' ? '#DC2626' : 'transparent', color: filter === 'INACTIVE' ? 'white' : 'inherit', border: '1px solid rgba(0,0,0,0.15)' }} />
            <Chip clickable label="Admins" onClick={() => setFilter('ADMIN')}
              sx={{ fontWeight: 900, bgcolor: filter === 'ADMIN' ? '#F97316' : 'transparent', color: filter === 'ADMIN' ? '#111827' : 'inherit', border: '1px solid rgba(0,0,0,0.15)' }} />
          </Stack>

          <Stack direction="row" spacing={1} justifyContent="flex-end">
            <Tooltip title="Refrescar">
              <span>
                <IconButton onClick={loadUsers} disabled={!isAdmin || loading}>
                  <RefreshIcon />
                </IconButton>
              </span>
            </Tooltip>

            <Button
              disabled={!isAdmin}
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setOpenCreate(true); setModalErr(''); setModalMsg(''); }}
              sx={{
                bgcolor: '#F97316',
                color: '#111827',
                fontWeight: 950,
                '&:hover': { bgcolor: '#fb8b24' }
              }}
            >
              Nuevo Usuario
            </Button>
          </Stack>
        </Stack>

        {!isAdmin && <Alert sx={{ mt: 2 }} severity="warning">Inicia sesión como ADMIN para gestionar usuarios.</Alert>}
        {listErr && <Alert sx={{ mt: 2 }} severity="error">{listErr}</Alert>}
      </Paper>

      {/* ====== TABLA ====== */}
      <Paper elevation={0} sx={{ borderRadius: 3, overflow: 'hidden', border: '1px solid rgba(0,0,0,0.08)' }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ bgcolor: '#1E3A8A' }}>
              <TableCell sx={{ color: 'white', fontWeight: 950 }}><b>EMPLEADO</b></TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 950 }}><b>NOMBRE</b></TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 950 }}><b>CORREO</b></TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 950 }}><b>ROL</b></TableCell>
              <TableCell sx={{ color: 'white', fontWeight: 950 }}><b>ESTADO</b></TableCell>
              <TableCell align="right" sx={{ color: 'white', fontWeight: 950 }}><b>ACCIONES</b></TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredUsers.map((u, idx) => (
              <TableRow
                key={u.id}
                sx={{
                  bgcolor: idx % 2 === 0 ? 'rgba(0,0,0,0.02)' : 'transparent',
                  '&:hover': { bgcolor: 'rgba(249,115,22,0.10)' }
                }}
              >
                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 950 }}>
                  {u.employeeNumber}
                </TableCell>
                <TableCell>{u.fullName}</TableCell>
                <TableCell sx={{ opacity: 0.9 }}>{u.email}</TableCell>
                <TableCell>
                  <Chip size="small" label={u.role} sx={roleChipSx(u.role)} />
                </TableCell>
                <TableCell>{statusChip(u.isActive)}</TableCell>
                <TableCell align="right">
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    <Tooltip title="Editar">
                      <IconButton size="small" onClick={() => openEditDialog(u)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title={u.isActive ? 'Desactivar' : 'Activar'}>
                      <IconButton
                        size="small"
                        onClick={() => toggleActive(u)}
                        sx={{
                          bgcolor: u.isActive ? 'rgba(220,38,38,0.12)' : 'rgba(22,163,74,0.12)'
                        }}
                      >
                        {u.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                      </IconButton>
                    </Tooltip>
                  </Stack>
                </TableCell>
              </TableRow>
            ))}

            {!filteredUsers.length && (
              <TableRow>
                <TableCell colSpan={6} sx={{ opacity: 0.7, p: 2 }}>
                  {loading ? 'Cargando...' : 'No hay usuarios para mostrar.'}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* ====== MODAL NUEVO USUARIO (B1) ====== */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>
          🟧 NUEVO USUARIO OPERATIVO
        </DialogTitle>

        <DialogContent>
          {!isAdmin && <Alert severity="warning" sx={{ mt: 2 }}>Solo ADMIN puede crear usuarios.</Alert>}
          {modalErr && <Alert severity="error" sx={{ mt: 2 }}>{modalErr}</Alert>}

          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography sx={{ fontWeight: 950, opacity: 0.85 }}>DATOS DEL EMPLEADO</Typography>
            <TextField
              disabled={!isAdmin}
              label="Número de empleado"
              value={employeeNumber}
              onChange={(e) => setEmployeeNumber(e.target.value)}
              InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.6 }} /> }}
            />
            <TextField
              disabled={!isAdmin}
              label="Nombre completo"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
            />

            <Divider />

            <Typography sx={{ fontWeight: 950, opacity: 0.85 }}>ACCESO</Typography>
            <TextField
              disabled={!isAdmin}
              label="Correo"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, opacity: 0.6 }} /> }}
            />
            <TextField
              disabled={!isAdmin}
              label="Contraseña"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.6 }} /> }}
            />

            <Divider />

            <Typography sx={{ fontWeight: 950, opacity: 0.85 }}>ROL Y PUESTO</Typography>
            <TextField
              disabled={!isAdmin}
              select
              label="Rol"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {['ADMIN', 'SUPERVISOR', 'OPERADOR'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>

            <TextField
              disabled={!isAdmin}
              label="Puesto (Supervisor/Coordinador/Gerente/etc)"
              value={position}
              onChange={(e) => setPosition(e.target.value)}
              InputProps={{ startAdornment: <WorkIcon sx={{ mr: 1, opacity: 0.6 }} /> }}
            />
          </Stack>
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button
            disabled={!isAdmin}
            variant="contained"
            onClick={create}
            sx={{
              bgcolor: '#F97316',
              color: '#111827',
              fontWeight: 950,
              '&:hover': { bgcolor: '#fb8b24' }
            }}
          >
            Crear Usuario
          </Button>
        </DialogActions>
      </Dialog>

      {/* ====== MODAL EDITAR ====== */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 950 }}>⚙ EDITAR USUARIO</DialogTitle>

        <DialogContent>
          {modalMsg && <Alert severity="success" sx={{ mt: 2 }}>{modalMsg}</Alert>}
          {modalErr && <Alert severity="error" sx={{ mt: 2 }}>{modalErr}</Alert>}

          {editUser && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography sx={{ fontWeight: 950, opacity: 0.85 }}>DATOS</Typography>
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

              <Typography sx={{ fontWeight: 950, opacity: 0.85 }}>SEGURIDAD</Typography>

              <Typography sx={{ fontWeight: 900 }}>Reset Password</Typography>
              <TextField label="Nueva contraseña (mín 6)" value={resetPass} onChange={(e) => setResetPass(e.target.value)} />
              <Button variant="outlined" onClick={doResetPassword} startIcon={<KeyIcon />}>
                Resetear Password
              </Button>

              <Divider />

              <Typography sx={{ fontWeight: 900 }}>Reset PIN</Typography>
              <TextField label="Nuevo PIN (opcional)" value={resetPin} onChange={(e) => setResetPin(e.target.value)} />
              <Button variant="outlined" onClick={doResetPin} startIcon={<PinIcon />}>
                Resetear PIN
              </Button>
            </Stack>
          )}
        </DialogContent>

        <DialogActions>
          <Button onClick={() => setOpenEdit(false)}>Cerrar</Button>
          <Button
            disabled={editSaving}
            variant="contained"
            onClick={saveEdit}
            sx={{
              bgcolor: '#1E3A8A',
              fontWeight: 950,
              '&:hover': { bgcolor: '#2747a6' }
            }}
          >
            {editSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}