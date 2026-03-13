import { useEffect, useMemo, useState } from "react";
import {
  adminCreateUser,
  adminGetUsers,
  adminResetPassword,
  adminResetPin,
  adminToggleUser,
} from "../services/adminApi";
import { usePageStyles } from '../ui/pageStyles';

import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Grid from '@mui/material/Grid';

import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import KeyIcon from '@mui/icons-material/Key';
import PinIcon from '@mui/icons-material/Pin';

export default function AdminUsers() {
  const ps = usePageStyles();

  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const [createForm, setCreateForm] = useState({
    email: "",
    password: "",
    employeeNumber: "",
    fullName: "",
    role: "OPERADOR",
    position: "",
    isActive: true,
  });

  const canSearch = useMemo(() => search.trim().length > 0, [search]);

  async function loadUsers(q = "") {
    setLoading(true);
    setErr("");
    try {
      const { data } = await adminGetUsers(q);
      setUsers(data.users || []);
    } catch (e) {
      setErr(e?.message || "Error cargando usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUsers("");
  }, []);

  async function onCreate(e) {
    e.preventDefault();
    setLoading(true);
    setMsg(""); setErr("");
    try {
      await adminCreateUser(createForm);
      setMsg("Usuario creado");
      setCreateForm({
        email: "", password: "", employeeNumber: "",
        fullName: "", role: "OPERADOR", position: "", isActive: true,
      });
      await loadUsers("");
    } catch (e2) {
      setErr(e2?.message || "Error creando usuario");
    } finally {
      setLoading(false);
    }
  }

  async function onToggle(id) {
    setLoading(true); setErr("");
    try {
      await adminToggleUser(id);
      await loadUsers(canSearch ? search : "");
    } catch (e) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPass(id) {
    const newPassword = prompt("Nueva contrasena:");
    if (!newPassword) return;
    setLoading(true); setErr("");
    try {
      await adminResetPassword(id, newPassword);
      setMsg("Contrasena actualizada");
    } catch (e) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  async function onResetPin(id) {
    const newPin = prompt("Nuevo PIN (o deja vacio para borrar PIN y forzar set):");
    setLoading(true); setErr("");
    try {
      await adminResetPin(id, newPin || "");
      setMsg("PIN actualizado");
      await loadUsers(canSearch ? search : "");
    } catch (e) {
      setErr(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: { xs: 1.5, md: 3 } }}>
      {/* Header */}
      <Box sx={{ mb: 2.5 }}>
        <Typography variant="h5" sx={ps.pageTitle}>Panel Admin - Usuarios</Typography>
        <Typography sx={ps.pageSubtitle}>Buscar, crear, activar/desactivar y resetear credenciales.</Typography>
      </Box>

      {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg("")}>{msg}</Alert>}
      {err && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>{err}</Alert>}

      {/* Search bar */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.filterBar}>
          <TextField
            size="small"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por # empleado (ej. 3647)"
            sx={{ ...ps.inputSx, flex: 1, minWidth: 200 }}
          />
          <Button
            variant="contained"
            onClick={() => loadUsers(search.trim())}
            disabled={loading}
            startIcon={<SearchIcon />}
            size="small"
          >
            Buscar
          </Button>
          <Button
            variant="outlined"
            onClick={() => { setSearch(""); loadUsers(""); }}
            disabled={loading}
            startIcon={<RefreshIcon />}
            size="small"
          >
            Ver todos
          </Button>
        </Box>
      </Paper>

      {/* Create form */}
      <Paper elevation={0} sx={{ ...ps.card, mb: 2 }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Crear usuario</Typography>
        </Box>
        <Box component="form" onSubmit={onCreate} sx={{ p: 2.5 }}>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Numero de empleado" value={createForm.employeeNumber}
                onChange={(e) => setCreateForm((p) => ({ ...p, employeeNumber: e.target.value }))} sx={ps.inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Email" value={createForm.email}
                onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))} sx={ps.inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Contrasena inicial" type="password" value={createForm.password}
                onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))} sx={ps.inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Nombre completo" value={createForm.fullName}
                onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))} sx={ps.inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" label="Puesto" value={createForm.position}
                onChange={(e) => setCreateForm((p) => ({ ...p, position: e.target.value }))} sx={ps.inputSx} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth size="small" select label="Rol" value={createForm.role}
                onChange={(e) => setCreateForm((p) => ({ ...p, role: e.target.value }))} sx={ps.inputSx}>
                <MenuItem value="OPERADOR">OPERADOR</MenuItem>
                <MenuItem value="SUPERVISOR">SUPERVISOR</MenuItem>
                <MenuItem value="ADMIN">ADMIN</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControlLabel
                control={<Switch checked={!!createForm.isActive} onChange={(e) => setCreateForm((p) => ({ ...p, isActive: e.target.checked }))} />}
                label="Activo"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <Button type="submit" variant="contained" disabled={loading} fullWidth>
                {loading ? 'Creando...' : 'Crear'}
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      {/* Users table */}
      <Paper elevation={0} sx={{ ...ps.card, overflow: 'hidden' }}>
        <Box sx={ps.cardHeader}>
          <Typography sx={ps.cardHeaderTitle}>Usuarios</Typography>
          <Box sx={{ flex: 1 }} />
          <Chip size="small" label={loading ? "Cargando..." : `${users.length} encontrados`} sx={ps.metricChip('default')} />
        </Box>

        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small" sx={{ minWidth: 700 }}>
            <TableHead>
              <TableRow sx={ps.tableHeaderRow}>
                <TableCell>Empleado</TableCell>
                <TableCell>Nombre</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Rol</TableCell>
                <TableCell>Activo</TableCell>
                <TableCell align="right">Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u, idx) => (
                <TableRow key={u.id} sx={ps.tableRow(idx)}>
                  <TableCell sx={{ ...ps.cellText, fontFamily: 'monospace', fontWeight: 700 }}>{u.employeeNumber}</TableCell>
                  <TableCell sx={ps.cellText}>{u.fullName}</TableCell>
                  <TableCell sx={ps.cellTextSecondary}>{u.email}</TableCell>
                  <TableCell>
                    <Chip size="small" label={u.role} sx={ps.metricChip(u.role === 'ADMIN' ? 'info' : 'default')} />
                  </TableCell>
                  <TableCell>
                    <Chip size="small" label={u.isActive ? 'ACTIVO' : 'INACTIVO'} sx={ps.statusChip(u.isActive ? 'COMPLETADA' : 'CANCELADA')} />
                  </TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} justifyContent="flex-end">
                      <Tooltip title={u.isActive ? 'Desactivar' : 'Activar'}>
                        <IconButton size="small" onClick={() => onToggle(u.id)} disabled={loading} sx={ps.actionBtn(u.isActive ? 'error' : 'success')}>
                          {u.isActive ? <LockIcon fontSize="small" /> : <LockOpenIcon fontSize="small" />}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset Password">
                        <IconButton size="small" onClick={() => onResetPass(u.id)} disabled={loading} sx={ps.actionBtn('warning')}>
                          <KeyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reset PIN">
                        <IconButton size="small" onClick={() => onResetPin(u.id)} disabled={loading} sx={ps.actionBtn('primary')}>
                          <PinIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}

              {!users.length && !loading && (
                <TableRow>
                  <TableCell colSpan={6} sx={ps.emptyText}>No hay usuarios para mostrar.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      </Paper>

      <Typography variant="caption" sx={{ display: 'block', mt: 2, color: 'text.secondary' }}>
        Nota: Esta pantalla solo funciona si entraste como ADMIN (tu token).
      </Typography>
    </Box>
  );
}
