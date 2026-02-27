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
  padding: '9px 12px',
  borderRadius: 14,
  textDecoration: 'none',
  fontWeight: 900,
  fontSize: 13,
  whiteSpace: 'nowrap',
  letterSpacing: 0.2,
  opacity: isActive ? 1 : 0.82,
  color: 'white',
  background: isActive ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.04)',
  border: isActive ? '1px solid rgba(255,255,255,0.18)' : '1px solid rgba(255,255,255,0.08)',
  transition: 'transform .12s ease, background .12s ease, opacity .12s ease',
})

function NavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      style={(args) => ({
        ...linkStyle(args),
        ...(args.isActive ? { transform: 'translateY(-1px)' } : null)
      })}
    >
      {icon}
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  // ✅ lo dejo igual (aunque no lo uses todavía)
  const [alertsCount, setAlertsCount] = React.useState(0)

  const nav = useNavigate()
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useUi()

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar
        position="sticky"
        elevation={0}
        sx={{
          // ✅ solo UI
          backdropFilter: 'blur(10px)',
          borderBottom: '1px solid rgba(255,255,255,0.10)'
        }}
      >
        {/* Barra superior */}
        <Toolbar sx={{ gap: 2, minHeight: 64 }}>
          <Box sx={{ display:'flex', alignItems:'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 12,
                background: 'rgba(255,255,255,0.14)',
                border: '1px solid rgba(255,255,255,0.18)',
                display:'grid',
                placeItems:'center',
                fontWeight: 900
              }}
            >
              MT
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 900, letterSpacing: 0.2, lineHeight: 1.05 }}>
                MyTechnologies
              </Typography>
              <Typography sx={{ opacity: 0.85, fontSize: 12, fontWeight: 800 }}>
                Almacén · Panel
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1 }} />

          {/* Modo */}
          <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            <IconButton onClick={toggleMode} color="inherit" sx={{ borderRadius: 2 }}>
              {mode === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
            </IconButton>
          </Tooltip>

          {/* Usuario */}
          <Chip
            size="small"
            label={user?.role || '—'}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.30)',
              bgcolor: 'rgba(255,255,255,0.06)',
              fontWeight: 900
            }}
            variant="outlined"
          />
          <Chip
            size="small"
            label={user?.position || '—'}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.30)',
              bgcolor: 'rgba(255,255,255,0.06)',
              fontWeight: 900
            }}
            variant="outlined"
          />

          <Button
            color="inherit"
            onClick={() => { logout(); nav('/login') }}
            sx={{
              fontWeight: 900,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.12)',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.10)' }
            }}
          >
            Salir
          </Button>
        </Toolbar>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)' }} />

        {/* Barra de navegación (tabs) */}
        <Toolbar
          variant="dense"
          sx={{
            py: 0.75,
            gap: 0.75,
            overflowX: 'auto',
            // oculta scrollbar en algunos navegadores sin romper scroll
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.16)', borderRadius: 999 },
            '&::-webkit-scrollbar-track': { background: 'transparent' }
          }}
        >
          <NavItem to="/" icon={<DashboardIcon fontSize="small" />} label="Dashboard" />
          <NavItem to="/inventario" icon={<Inventory2Icon fontSize="small" />} label="Inventario" />
          <NavItem to="/racks" icon={<GridViewIcon fontSize="small" />} label="Racks" />
          <NavItem to="/produccion" icon={<PrecisionManufacturingIcon fontSize="small" />} label="Producción" />
          <NavItem to="/movimientos" icon={<SwapHorizIcon fontSize="small" />} label="Movimientos" />
          <NavItem to="/productos" icon={<Inventory2Icon fontSize="small" />} label="Pallet Items" />
          <NavItem to="/ordenes" icon={<AssignmentIcon fontSize="small" />} label="Órdenes" />
          <NavItem to="/conteos" icon={<FactCheckIcon fontSize="small" />} label="Conteos" />
          <NavItem to="/ubicaciones" icon={<PlaceIcon fontSize="small" />} label="Ubicaciones" />
          <NavItem to="/usuarios" icon={<PeopleAltIcon fontSize="small" />} label="Usuarios" />
          <NavItem to="/scan" icon={<QrCodeScannerIcon fontSize="small" />} label="Escanear" />
        </Toolbar>
      </AppBar>

      <Container
        maxWidth="lg"
        sx={{
          py: 3,
          // ✅ fondo suave dentro del contenido para sentir "dashboard"
          minHeight: 'calc(100vh - 120px)'
        }}
      >
        <Outlet />
      </Container>
    </Box>
  )
}