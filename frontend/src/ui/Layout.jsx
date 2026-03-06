import React, { useState } from 'react'
import { Outlet, useNavigate, NavLink, useLocation } from 'react-router-dom'
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
import Drawer from '@mui/material/Drawer'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

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
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'

const NAV_ITEMS = [
  { to: '/',             icon: <DashboardIcon />,              label: 'Dashboard' },
  { to: '/inventario',   icon: <Inventory2Icon />,             label: 'Inventario' },
  { to: '/racks',        icon: <GridViewIcon />,               label: 'Racks' },
  { to: '/produccion',   icon: <PrecisionManufacturingIcon />, label: 'Produccion' },
  { to: '/movimientos',  icon: <SwapHorizIcon />,              label: 'Movimientos' },
  { to: '/ordenes',      icon: <AssignmentIcon />,             label: 'Ordenes' },
  { to: '/conteos',      icon: <FactCheckIcon />,              label: 'Conteos' },
  { to: '/ubicaciones',  icon: <PlaceIcon />,                  label: 'Ubicaciones' },
  { to: '/usuarios',     icon: <PeopleAltIcon />,              label: 'Usuarios' },
  { to: '/scan',         icon: <QrCodeScannerIcon />,          label: 'Escanear' },
]

const DRAWER_WIDTH = 260

function DesktopNavItem({ to, icon, label }) {
  return (
    <NavLink
      to={to}
      style={({ isActive }) => ({
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 10,
        textDecoration: 'none',
        fontWeight: 700,
        fontSize: 13,
        whiteSpace: 'nowrap',
        letterSpacing: 0.1,
        color: 'white',
        opacity: isActive ? 1 : 0.78,
        background: isActive ? 'rgba(255,255,255,0.14)' : 'transparent',
        border: isActive ? '1px solid rgba(255,255,255,0.16)' : '1px solid transparent',
        transition: 'all .12s ease',
      })}
    >
      {React.cloneElement(icon, { sx: { fontSize: 18 } })}
      <span>{label}</span>
    </NavLink>
  )
}

export default function Layout() {
  const nav = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useUi()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleLogout = () => {
    logout()
    nav('/login')
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
      <AppBar position="sticky" elevation={0}>
        {/* Top bar */}
        <Toolbar sx={{ gap: 1.5, minHeight: { xs: 56, md: 64 } }}>
          {isMobile && (
            <IconButton
              color="inherit"
              onClick={() => setDrawerOpen(true)}
              edge="start"
              sx={{ mr: 0.5 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 2,
                background: 'rgba(255,255,255,0.12)',
                border: '1px solid rgba(255,255,255,0.16)',
                display: 'grid',
                placeItems: 'center',
                fontWeight: 800,
                fontSize: 13,
              }}
            >
              MT
            </Box>

            <Box>
              <Typography sx={{ fontWeight: 800, fontSize: 15, letterSpacing: 0.1, lineHeight: 1.1 }}>
                MyTechnologies
              </Typography>
              <Typography sx={{ opacity: 0.80, fontSize: 11, fontWeight: 600 }}>
                Sistema de Almacen
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1 }} />

          <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
            <IconButton
              onClick={toggleMode}
              color="inherit"
              size="small"
              sx={{ borderRadius: 2 }}
            >
              {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
            </IconButton>
          </Tooltip>

          {!isMobile && (
            <>
              <Chip
                size="small"
                label={user?.role || '---'}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.25)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  fontWeight: 700,
                  fontSize: 11,
                }}
                variant="outlined"
              />
              <Chip
                size="small"
                label={user?.position || '---'}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.25)',
                  bgcolor: 'rgba(255,255,255,0.08)',
                  fontWeight: 700,
                  fontSize: 11,
                }}
                variant="outlined"
              />
            </>
          )}

          <Button
            color="inherit"
            size="small"
            onClick={handleLogout}
            startIcon={<LogoutIcon sx={{ fontSize: 16 }} />}
            sx={{
              fontWeight: 700,
              fontSize: 12,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.10)',
              px: 1.5,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.12)' },
            }}
          >
            {isMobile ? '' : 'Salir'}
          </Button>
        </Toolbar>

        {/* Desktop nav tabs */}
        {!isMobile && (
          <>
            <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)' }} />
            <Toolbar
              variant="dense"
              sx={{
                py: 0.6,
                gap: 0.5,
                overflowX: 'auto',
                '&::-webkit-scrollbar': { height: 4 },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.14)', borderRadius: 999 },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
              }}
            >
              {NAV_ITEMS.map((item) => (
                <DesktopNavItem key={item.to} {...item} />
              ))}
            </Toolbar>
          </>
        )}
      </AppBar>

      {/* Mobile drawer */}
      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        PaperProps={{ sx: { width: DRAWER_WIDTH } }}
      >
        <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.16)',
              display: 'grid',
              placeItems: 'center',
              fontWeight: 800,
              fontSize: 14,
              color: 'white',
            }}
          >
            MT
          </Box>
          <Box>
            <Typography sx={{ fontWeight: 800, fontSize: 15, color: 'white' }}>
              MyTechnologies
            </Typography>
            <Typography sx={{ fontSize: 11, color: 'rgba(255,255,255,0.70)' }}>
              Sistema de Almacen
            </Typography>
          </Box>
        </Box>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)', mx: 1.5 }} />

        {user && (
          <Box sx={{ px: 2.5, py: 1.5 }}>
            <Typography sx={{ color: 'rgba(255,255,255,0.90)', fontWeight: 700, fontSize: 13 }}>
              {user?.name || user?.email || 'Usuario'}
            </Typography>
            <Typography sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 11 }}>
              {user?.role} {user?.position ? `/ ${user.position}` : ''}
            </Typography>
          </Box>
        )}

        <List sx={{ px: 1, flex: 1 }}>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.to ||
              (item.to !== '/' && location.pathname.startsWith(item.to))

            return (
              <ListItemButton
                key={item.to}
                onClick={() => { nav(item.to); setDrawerOpen(false) }}
                sx={{
                  borderRadius: 2,
                  mb: 0.3,
                  px: 2,
                  py: 1,
                  bgcolor: isActive ? 'rgba(255,255,255,0.12)' : 'transparent',
                  border: isActive ? '1px solid rgba(255,255,255,0.14)' : '1px solid transparent',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon sx={{ color: 'white', minWidth: 36, opacity: isActive ? 1 : 0.70 }}>
                  {React.cloneElement(item.icon, { fontSize: 'small' })}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    sx: {
                      fontWeight: isActive ? 700 : 600,
                      fontSize: 13,
                      color: 'white',
                      opacity: isActive ? 1 : 0.80,
                    },
                  }}
                />
              </ListItemButton>
            )
          })}
        </List>

        <Divider sx={{ borderColor: 'rgba(255,255,255,0.10)', mx: 1.5 }} />

        <Box sx={{ p: 2 }}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<LogoutIcon />}
            onClick={handleLogout}
            sx={{
              color: 'white',
              borderColor: 'rgba(255,255,255,0.20)',
              fontWeight: 700,
              borderRadius: 2,
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)', borderColor: 'rgba(255,255,255,0.30)' },
            }}
          >
            Cerrar sesion
          </Button>
        </Box>
      </Drawer>

      {/* Page content */}
      <Container
        maxWidth="xl"
        sx={{
          py: { xs: 2, md: 3 },
          px: { xs: 1.5, sm: 2, md: 3 },
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        <Outlet />
      </Container>
    </Box>
  )
}
