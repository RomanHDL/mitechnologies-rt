import React, { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/auth'
import { apiFetch } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'

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
  const ps = usePageStyles()
  const isAdmin = user?.role === 'ADMIN'

  const [msg, setMsg] = useState('')
  const [err, setErr] = useState('')
  const [q, setQ] = useState('')
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [listErr, setListErr] = useState('')
  const [filter, setFilter] = useState('ALL')

  const [openCreate, setOpenCreate] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('User123!')
  const [employeeNumber, setEmployeeNumber] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState('OPERADOR')
  const [position, setPosition] = useState('Ayudante')

  const [openEdit, setOpenEdit] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [editSaving, setEditSaving] = useState(false)
  const [resetPass, setResetPass] = useState('')
  const [resetPin, setResetPin] = useState('')
  const [modalMsg, setModalMsg] = useState('')
  const [modalErr, setModalErr] = useState('')

  const roleChipSx = (r) => {
    if (r === 'ADMIN') return { bgcolor: 'primary.dark', color: 'white', fontWeight: 800 }
    if (r === 'SUPERVISOR') return { bgcolor: 'primary.main', color: 'white', fontWeight: 800 }
    return { bgcolor: ps.isDark ? 'rgba(255,255,255,.10)' : 'rgba(13,59,102,.08)', color: 'text.primary', fontWeight: 800 }
  }

  const statusChipSx = (active) => active
    ? { ...ps.statusChip('COMPLETADA'), fontWeight: 700 }
    : { ...ps.statusChip('CANCELADA'), fontWeight: 700 }

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

  useEffect(() => { loadUsers() }, [loadUsers])

  const filteredUsers = useMemo(() => {
    let list = [...users]
    if (filter === 'ACTIVE') list = list.filter(u => u.isActive)
    if (filter === 'INACTIVE') list = list.filter(u => !u.isActive)
    if (filter === 'ADMIN') list = list.filter(u => u.role === 'ADMIN')
    if (filter === 'SUPERVISOR') list = list.filter(u => u.role === 'SUPERVISOR')
    if (filter === 'OPERADOR') list = list.filter(u => u.role === 'OPERADOR')
    return list
  }, [users, filter])

  const totals = useMemo(() => ({
    total: users.length,
    active: users.filter(u => u.isActive).length,
    inactive: users.filter(u => !u.isActive).length,
    admins: users.filter(u => u.role === 'ADMIN').length,
    supervisors: users.filter(u => u.role === 'SUPERVISOR').length,
    operators: users.filter(u => u.role === 'OPERADOR').length,
  }), [users])

  const openEditDialog = (u) => {
    setEditUser({ ...u })
    setResetPass('')
    setResetPin('')
    setModalMsg('')
    setModalErr('')
    setOpenEdit(true)
  }

  const create = async () => {
    setMsg(''); setErr('')
    setModalMsg(''); setModalErr('')
    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, employeeNumber, fullName, role, position })
      })
      setMsg('Usuario creado')
      setEmail(''); setEmployeeNumber(''); setFullName('')
      setRole('OPERADOR'); setPosition('Ayudante'); setPassword('User123!')
      setOpenCreate(false)
      await loadUsers()
    } catch (e) {
      const m = e?.message || 'Error'
      setErr(m); setModalErr(m)
    }
  }

  const saveEdit = async () => {
    if (!editUser?.id) return
    setEditSaving(true); setListErr(''); setModalErr('')
    try {
      await apiFetch(`/api/users/${editUser.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: editUser.email, employeeNumber: editUser.employeeNumber,
          fullName: editUser.fullName, role: editUser.role,
          position: editUser.position, isActive: editUser.isActive
        })
      })
      setOpenEdit(false)
      await loadUsers()
    } catch (e) {
      const m = e?.message || 'Error guardando cambios'
      setListErr(m); setModalErr(m)
    } finally { setEditSaving(false) }
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
    } catch (e) { setListErr(e?.message || 'Error actualizando usuario') }
  }

  const doResetPassword = async () => {
    if (!editUser?.id) return
    setModalMsg(''); setModalErr(''); setListErr('')
    const newPassword = String(resetPass || '')
    if (!newPassword || newPassword.length < 6) {
      const m = 'La nueva contrasena debe tener minimo 6 caracteres'
      setModalErr(m); setListErr(m); return
    }
    try {
      await apiFetch(`/api/admin/users/${editUser.id}/reset-password`, {
        method: 'PATCH', body: JSON.stringify({ newPassword })
      })
      setModalMsg('Password reseteado'); setMsg('Password reseteado'); setResetPass('')
    } catch (eAdmin) {
      try {
        await apiFetch(`/api/users/${editUser.id}/reset-password`, {
          method: 'POST', body: JSON.stringify({ newPassword })
        })
        setModalMsg('Password reseteado'); setMsg('Password reseteado'); setResetPass('')
      } catch (eUsers) {
        const m = eUsers?.message || eAdmin?.message || 'Error reseteando password'
        setModalErr(m); setListErr(m)
      }
    }
  }

  const doResetPin = async () => {
    if (!editUser?.id) return
    setModalMsg(''); setModalErr(''); setListErr('')
    try {
      await apiFetch(`/api/admin/users/${editUser.id}/reset-pin`, {
        method: 'PATCH', body: JSON.stringify(resetPin ? { newPin: resetPin } : {})
      })
      setModalMsg('PIN reseteado'); setMsg('PIN reseteado'); setResetPin('')
    } catch (e) {
      const m = e?.message || 'Error reseteando PIN'
      setModalErr(m); setListErr(m)
    }
  }

  const filterChipSx = (key) => ({
    fontWeight: 700,
    border: '1px solid',
    borderColor: filter === key ? 'primary.main' : 'divider',
    bgcolor: filter === key ? 'primary.main' : 'transparent',
    color: filter === key ? 'white' : 'text.primary',
    '&:hover': { bgcolor: filter === key ? 'primary.dark' : (ps.isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.06)') },
  })

  return (
    <Box sx={ps.page}>
      {/* Header */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.cardHeader}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={ps.cardHeaderTitle}>Control de Personal</Typography>
            <Typography sx={ps.cardHeaderSubtitle}>Gestion de operadores, supervisores y administradores</Typography>
          </Box>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip size="small" label={`Total: ${totals.total}`} sx={ps.metricChip('default')} />
            <Chip size="small" label={`Activos: ${totals.active}`} sx={ps.metricChip('ok')} />
            <Chip size="small" label={`Inactivos: ${totals.inactive}`} sx={ps.metricChip(totals.inactive > 0 ? 'warn' : 'default')} />
            <Chip size="small" label={`Admins: ${totals.admins}`} sx={ps.metricChip('info')} />
            <Chip size="small" label={`Supervisores: ${totals.supervisors}`} sx={ps.metricChip('info')} />
            <Chip size="small" label={`Operadores: ${totals.operators}`} sx={ps.metricChip('default')} />
          </Stack>
        </Box>
      </Paper>

      {msg && <Alert sx={{ mb: 2 }} severity="success">{msg}</Alert>}
      {err && <Alert sx={{ mb: 2 }} severity="error">{err}</Alert>}

      {/* Toolbar */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={{ ...ps.filterBar, flexDirection: { xs: 'column', md: 'row' } }}>
          <TextField
            size="small"
            label="Buscar (empleado/correo/nombre)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 240, flex: 1 }}
          />

          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {[
              { key: 'ALL', label: 'Todos' },
              { key: 'ACTIVE', label: 'Activos' },
              { key: 'INACTIVE', label: 'Inactivos' },
              { key: 'ADMIN', label: 'Admins' },
              { key: 'SUPERVISOR', label: 'Supervisores' },
              { key: 'OPERADOR', label: 'Operadores' },
            ].map(f => (
              <Chip key={f.key} clickable label={f.label} onClick={() => setFilter(f.key)} sx={filterChipSx(f.key)} />
            ))}
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Refrescar">
              <span>
                <IconButton onClick={loadUsers} disabled={!isAdmin || loading} sx={ps.actionBtn('primary')}>
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>

            <Button
              disabled={!isAdmin}
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setOpenCreate(true); setModalErr(''); setModalMsg('') }}
            >
              Nuevo Usuario
            </Button>
          </Stack>
        </Box>

        {!isAdmin && <Alert sx={{ m: 2 }} severity="warning">Inicia sesion como ADMIN para gestionar usuarios.</Alert>}
        {listErr && <Alert sx={{ m: 2 }} severity="error">{listErr}</Alert>}
      </Paper>

      {/* Table */}
      <Paper elevation={0} sx={{ ...ps.card, overflow: 'hidden' }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>Empleado</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Puesto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredUsers.map((u, idx) => (
                <TableRow key={u.id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 800 }}>
                    {u.employeeNumber}
                  </TableCell>
                  <TableCell sx={ps.cellText}>{u.fullName}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{u.email}</TableCell>
                  <TableCell>
                    <Chip size="small" label={u.role} sx={roleChipSx(u.role)} />
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{u.position || '-'}</TableCell>
                  <TableCell>
                    <Chip size="small" label={u.isActive ? 'ACTIVO' : 'INACTIVO'} sx={statusChipSx(u.isActive)} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title="Editar">
                        <IconButton size="small" onClick={() => openEditDialog(u)} sx={ps.actionBtn('primary')}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={u.isActive ? 'Desactivar' : 'Activar'}>
                        <IconButton size="small" onClick={() => toggleActive(u)} sx={ps.actionBtn(u.isActive ? 'error' : 'success')}>
                          {u.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}

              {!filteredUsers.length && (
                <TableRow>
                  <TableCell colSpan={7} sx={ps.emptyText}>
                    {loading ? 'Cargando...' : 'No hay usuarios para mostrar.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      {/* Create Dialog */}
      <Dialog open={openCreate} onClose={() => setOpenCreate(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>Nuevo Usuario</DialogTitle>
        <DialogContent>
          {!isAdmin && <Alert severity="warning" sx={{ mt: 2 }}>Solo ADMIN puede crear usuarios.</Alert>}
          {modalErr && <Alert severity="error" sx={{ mt: 2 }}>{modalErr}</Alert>}
          <Stack spacing={2} sx={{ mt: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Datos del empleado</Typography>
            <TextField disabled={!isAdmin} label="Numero de empleado" value={employeeNumber} onChange={(e) => setEmployeeNumber(e.target.value)} InputProps={{ startAdornment: <BadgeIcon sx={{ mr: 1, opacity: 0.5 }} /> }} sx={ps.inputSx} />
            <TextField disabled={!isAdmin} label="Nombre completo" value={fullName} onChange={(e) => setFullName(e.target.value)} sx={ps.inputSx} />
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Acceso</Typography>
            <TextField disabled={!isAdmin} label="Correo" value={email} onChange={(e) => setEmail(e.target.value)} InputProps={{ startAdornment: <EmailIcon sx={{ mr: 1, opacity: 0.5 }} /> }} sx={ps.inputSx} />
            <TextField disabled={!isAdmin} label="Contrasena" value={password} onChange={(e) => setPassword(e.target.value)} InputProps={{ startAdornment: <KeyIcon sx={{ mr: 1, opacity: 0.5 }} /> }} sx={ps.inputSx} />
            <Divider />
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Rol y puesto</Typography>
            <TextField disabled={!isAdmin} select label="Rol" value={role} onChange={(e) => setRole(e.target.value)} sx={ps.inputSx}>
              {['ADMIN', 'SUPERVISOR', 'OPERADOR'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
            </TextField>
            <TextField disabled={!isAdmin} label="Puesto" value={position} onChange={(e) => setPosition(e.target.value)} InputProps={{ startAdornment: <WorkIcon sx={{ mr: 1, opacity: 0.5 }} /> }} sx={ps.inputSx} />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreate(false)}>Cancelar</Button>
          <Button disabled={!isAdmin} variant="contained" onClick={create}>Crear Usuario</Button>
        </DialogActions>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={openEdit} onClose={() => setOpenEdit(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={ps.cardHeaderTitle}>Editar Usuario</DialogTitle>
        <DialogContent>
          {modalMsg && <Alert severity="success" sx={{ mt: 2 }}>{modalMsg}</Alert>}
          {modalErr && <Alert severity="error" sx={{ mt: 2 }}>{modalErr}</Alert>}
          {editUser && (
            <Stack spacing={2} sx={{ mt: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Datos</Typography>
              <TextField label="Correo" value={editUser.email || ''} onChange={(e) => setEditUser({ ...editUser, email: e.target.value })} sx={ps.inputSx} />
              <TextField label="Numero de empleado" value={editUser.employeeNumber || ''} onChange={(e) => setEditUser({ ...editUser, employeeNumber: e.target.value })} sx={ps.inputSx} />
              <TextField label="Nombre" value={editUser.fullName || ''} onChange={(e) => setEditUser({ ...editUser, fullName: e.target.value })} sx={ps.inputSx} />
              <TextField select label="Rol" value={editUser.role || 'OPERADOR'} onChange={(e) => setEditUser({ ...editUser, role: e.target.value })} sx={ps.inputSx}>
                {['ADMIN', 'SUPERVISOR', 'OPERADOR'].map(r => <MenuItem key={r} value={r}>{r}</MenuItem>)}
              </TextField>
              <TextField label="Puesto" value={editUser.position || ''} onChange={(e) => setEditUser({ ...editUser, position: e.target.value })} sx={ps.inputSx} />
              <TextField select label="Activo" value={editUser.isActive ? '1' : '0'} onChange={(e) => setEditUser({ ...editUser, isActive: e.target.value === '1' })} sx={ps.inputSx}>
                <MenuItem value="1">Si</MenuItem>
                <MenuItem value="0">No</MenuItem>
              </TextField>
              <Divider />
              <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'text.secondary' }}>Seguridad</Typography>
              <TextField label="Nueva contrasena (min 6)" value={resetPass} onChange={(e) => setResetPass(e.target.value)} sx={ps.inputSx} />
              <Button variant="outlined" onClick={doResetPassword} startIcon={<KeyIcon />}>Resetear Password</Button>
              <Divider />
              <TextField label="Nuevo PIN (opcional)" value={resetPin} onChange={(e) => setResetPin(e.target.value)} sx={ps.inputSx} />
              <Button variant="outlined" onClick={doResetPin} startIcon={<PinIcon />}>Resetear PIN</Button>
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
