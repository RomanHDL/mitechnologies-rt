import React, { useEffect, useMemo, useState, useCallback } from 'react'
import { useAuth } from '../state/auth'
import { apiFetch } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'
import dayjs from 'dayjs'
import * as XLSX from 'xlsx'

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
import Grid from '@mui/material/Grid'

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
import PeopleIcon from '@mui/icons-material/People'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import SecurityIcon from '@mui/icons-material/Security'
import FileDownloadIcon from '@mui/icons-material/FileDownload'

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
  const [roleFilter, setRoleFilter] = useState('TODOS')
  const [activeFilter, setActiveFilter] = useState('ALL') // ALL, ACTIVE, INACTIVE

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

  const loadUsers = useCallback(async () => {
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
  }, [isAdmin, q])

  useEffect(() => { loadUsers() }, [loadUsers])

  const filteredUsers = useMemo(() => {
    let list = [...users]
    // Role filter
    if (roleFilter !== 'TODOS') {
      list = list.filter(u => u.role === roleFilter)
    }
    // Active/Inactive filter
    if (activeFilter === 'ACTIVE') list = list.filter(u => u.isActive)
    if (activeFilter === 'INACTIVE') list = list.filter(u => !u.isActive)
    return list
  }, [users, roleFilter, activeFilter])

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

  const roleFilterChipSx = (key) => ({
    fontWeight: 700,
    border: '1px solid',
    borderColor: roleFilter === key ? 'primary.main' : 'divider',
    bgcolor: roleFilter === key ? 'primary.main' : 'transparent',
    color: roleFilter === key ? 'white' : 'text.primary',
    '&:hover': { bgcolor: roleFilter === key ? 'primary.dark' : (ps.isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.06)') },
  })

  const activeFilterChipSx = (key) => ({
    fontWeight: 700,
    border: '1px solid',
    borderColor: activeFilter === key ? 'primary.main' : 'divider',
    bgcolor: activeFilter === key ? 'primary.main' : 'transparent',
    color: activeFilter === key ? 'white' : 'text.primary',
    '&:hover': { bgcolor: activeFilter === key ? 'primary.dark' : (ps.isDark ? 'rgba(255,255,255,.06)' : 'rgba(21,101,192,.06)') },
  })

  const exportToExcel = () => {
    const data = filteredUsers.map(u => ({
      'No. Empleado': u.employeeNumber || '',
      'Nombre': u.fullName || '',
      'Correo': u.email || '',
      'Rol': u.role || '',
      'Puesto': u.position || '',
      'Estado': u.isActive ? 'ACTIVO' : 'INACTIVO',
      'Fecha Registro': u.createdAt ? dayjs(u.createdAt).format('YYYY-MM-DD HH:mm') : '-',
      'Ultimo Acceso': u.lastLogin ? dayjs(u.lastLogin).format('YYYY-MM-DD HH:mm') : '-',
    }))
    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios')
    XLSX.writeFile(wb, `usuarios_${dayjs().format('YYYYMMDD_HHmmss')}.xlsx`)
  }

  return (
    <Box sx={ps.page}>
      {/* Header */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.cardHeader}>
          <Box sx={{ flex: 1 }}>
            <Typography sx={ps.cardHeaderTitle}>Control de Personal</Typography>
            <Typography sx={ps.cardHeaderSubtitle}>Gestion de operadores, supervisores y administradores</Typography>
          </Box>
        </Box>
      </Paper>

      {/* KPI Cards */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('blue')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <PeopleIcon sx={{ color: ps.isDark ? '#64B5F6' : '#1565C0', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{totals.total}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Total Usuarios</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('green')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CheckCircleIcon sx={{ color: ps.isDark ? '#86EFAC' : '#2E7D32', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{totals.active}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Activos</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('red')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <CancelIcon sx={{ color: ps.isDark ? '#FCA5A5' : '#C62828', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{totals.inactive}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>Inactivos</Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Paper elevation={0} sx={ps.kpiCard('amber')}>
            <Stack direction="row" alignItems="center" spacing={1.5}>
              <SecurityIcon sx={{ color: ps.isDark ? '#FCD34D' : '#E65100', fontSize: 32 }} />
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, color: 'text.primary', lineHeight: 1.1 }}>{totals.admins + totals.supervisors + totals.operators}</Typography>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: 'text.secondary' }}>por Rol</Typography>
                <Typography sx={{ fontSize: 11, color: 'text.secondary', mt: 0.25 }}>
                  {totals.admins} Admin / {totals.supervisors} Sup / {totals.operators} Op
                </Typography>
              </Box>
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {msg && <Alert sx={{ mb: 2 }} severity="success">{msg}</Alert>}
      {err && <Alert sx={{ mb: 2 }} severity="error">{err}</Alert>}

      {/* Toolbar */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={{ ...ps.filterBar, flexDirection: { xs: 'column', md: 'row' } }}>
          <TextField
            size="small"
            label="Buscar (No. empleado / correo / nombre)"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            sx={{ ...ps.inputSx, minWidth: 280, flex: 1 }}
          />

          {/* Role filter chips */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {[
              { key: 'TODOS', label: 'Todos' },
              { key: 'ADMIN', label: 'Admin' },
              { key: 'SUPERVISOR', label: 'Supervisor' },
              { key: 'OPERADOR', label: 'Operador' },
            ].map(f => (
              <Chip key={f.key} clickable label={f.label} onClick={() => setRoleFilter(f.key)} sx={roleFilterChipSx(f.key)} />
            ))}
          </Stack>

          {/* Active/Inactive toggle chips */}
          <Stack direction="row" spacing={0.5} flexWrap="wrap">
            {[
              { key: 'ALL', label: 'Todos' },
              { key: 'ACTIVE', label: 'Activos' },
              { key: 'INACTIVE', label: 'Inactivos' },
            ].map(f => (
              <Chip key={f.key} clickable label={f.label} onClick={() => setActiveFilter(f.key)} sx={activeFilterChipSx(f.key)} size="small" />
            ))}
          </Stack>

          <Stack direction="row" spacing={1}>
            <Tooltip title="Exportar Excel">
              <span>
                <IconButton onClick={exportToExcel} disabled={!filteredUsers.length} sx={ps.actionBtn('success')}>
                  <FileDownloadIcon fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
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
          <Table size="small" sx={{ minWidth: 850 }}>
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>No. Empleado</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Correo</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Puesto</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Fecha Registro</TableCell>
                <TableCell>Ultimo Acceso</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>

            <TableBody>
              {filteredUsers.map((u, idx) => (
                <TableRow key={u.id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 800, fontSize: '0.95rem' }}>
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <BadgeIcon sx={{ fontSize: 16, opacity: 0.5 }} />
                      <span>{u.employeeNumber}</span>
                    </Stack>
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
                  <TableCell sx={ps.cellTextSecondary}>
                    {u.createdAt ? dayjs(u.createdAt).format('DD/MM/YYYY HH:mm') : '-'}
                  </TableCell>
                  <TableCell sx={ps.cellTextSecondary}>
                    {u.lastLogin ? dayjs(u.lastLogin).format('DD/MM/YYYY HH:mm') : '-'}
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
                  <TableCell colSpan={9} sx={ps.emptyText}>
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
