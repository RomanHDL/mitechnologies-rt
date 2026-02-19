import React from 'react'
import { Outlet, useNavigate, NavLink } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { useUi } from '../state/ui'

import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import Container from '@mui/material/Container'
import Stack from '@mui/material/Stack'
import Chip from '@mui/material/Chip'
import Divider from '@mui/material/Divider'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'

import DashboardIcon from '@mui/icons-material/Dashboard'
import GridViewIcon from '@mui/icons-material/GridView'
import SwapHorizIcon from '@mui/icons-material/SwapHoriz'
import QrCodeScannerIcon from '@mui/icons-material/QrCodeScanner'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import PeopleAltIcon from '@mui/icons-material/PeopleAlt'
import PrecisionManufacturingIcon from '@mui/icons-material/PrecisionManufacturing'
import AssignmentIcon from '@mui/icons-material/Assignment'
import FactCheckIcon from '@mui/icons-material/FactCheck'
import PlaceIcon from '@mui/icons-material/Place'
import DarkModeIcon from '@mui/icons-material/DarkMode'
import LightModeIcon from '@mui/icons-material/LightMode'

const linkStyle = ({ isActive }) => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '10px 12px',
  borderRadius: 12,
  textDecoration: 'none',
  fontWeight: 800,
  opacity: isActive ? 1 : 0.85,
  background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent'
})

function NavItem({ to, icon, label }) {
  return (
    <NavLink to={to} style={linkStyle}>
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const [alertsCount, setAlertsCount] = React.useState(0)

  const nav = useNavigate()
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useUi()

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="sticky" elevation={0}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography sx={{ fontWeight: 900, letterSpacing: 0.2 }}>
            MyTechnologies · Almacén
          </Typography>

          <Box sx={{ flex: 1 }} />

          <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            <IconButton onClick={toggleMode} color="inherit">
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          <Chip size="small" label={user?.role || '—'} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.35)' }} variant="outlined" />
          <Chip size="small" label={user?.position || '—'} sx={{ color: 'white', borderColor: 'rgba(255,255,255,0.35)' }} variant="outlined" />
          <Button color="inherit" onClick={() => { logout(); nav('/login') }}>Salir</Button>
        </Toolbar>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />

        <Toolbar variant="dense" sx={{ py: 0.5, gap: 0.5, overflowX: 'auto' }}>
          <NavItem to="/" icon={<DashboardIcon fontSize="small" />} label="Dashboard" />
          <NavItem to="/inventario" icon={<Inventory2Icon fontSize="small" />} label="Inventario" />
          <NavItem to="/racks" icon={<GridViewIcon fontSize="small" />} label="Racks" />
          <NavItem to="/produccion" icon={<PrecisionManufacturingIcon fontSize="small" />} label="Producción" />
          <NavItem to="/movimientos" icon={<SwapHorizIcon fontSize="small" />} label="Movimientos" />
          <NavItem to="/productos" icon={<Inventory2Icon fontSize="small" />} label="Productos" />
          <NavItem to="/ordenes" icon={<AssignmentIcon fontSize="small" />} label="Órdenes" />
          <NavItem to="/conteos" icon={<FactCheckIcon fontSize="small" />} label="Conteos" />
          <NavItem to="/ubicaciones" icon={<PlaceIcon fontSize="small" />} label="Ubicaciones" />
          <NavItem to="/usuarios" icon={<PeopleAltIcon fontSize="small" />} label="Usuarios" />
          <NavItem to="/scan" icon={<QrCodeScannerIcon fontSize="small" />} label="Escanear" />
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 3 }}>
        <Outlet />
      </Container>
    </Box>
  )
}
