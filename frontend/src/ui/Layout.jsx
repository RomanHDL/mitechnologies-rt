import React, { useState } from 'react'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { useUi } from '../state/ui'

import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Typography from '@mui/material/Typography'
import Box from '@mui/material/Box'
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
import { useTheme, alpha } from '@mui/material/styles'

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
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import QrCode2Icon from '@mui/icons-material/QrCode2'
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn'
import PlaylistAddCheckIcon from '@mui/icons-material/PlaylistAddCheck'
import BarChartIcon from '@mui/icons-material/BarChart'
import HistoryIcon from '@mui/icons-material/History'
import AssignmentReturnIcon from '@mui/icons-material/AssignmentReturn'
import WebhookIcon from '@mui/icons-material/Webhook'
import PushPinIcon from '@mui/icons-material/PushPin'
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined'
import NotificationsNoneIcon from '@mui/icons-material/NotificationsNone'
import AccountCircleIcon from '@mui/icons-material/AccountCircle'

/* Sidebar dimensions */
const SIDEBAR_OPEN = 248
const SIDEBAR_CLOSED = 64
const TOPBAR_H = 56

/* Grouped navigation
 * items without `roles` are visible to ALL roles.
 * items with `roles` are only visible to those roles.
 */
const NAV_SECTIONS = [
  {
    label: 'Principal',
    items: [
      { to: '/',            icon: <DashboardIcon />,              label: 'Dashboard' },
    ],
  },
  {
    label: 'Operacion',
    items: [
      { to: '/inventario',   icon: <Inventory2Icon />,             label: 'Inventario' },
      { to: '/racks',        icon: <GridViewIcon />,               label: 'Racks' },
      { to: '/ubicaciones',  icon: <PlaceIcon />,                  label: 'Ubicaciones' },
      { to: '/recepcion',    icon: <LocalShippingIcon />,          label: 'Recepcion', roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/movimientos',  icon: <SwapHorizIcon />,              label: 'Movimientos' },
      { to: '/produccion',   icon: <PrecisionManufacturingIcon />, label: 'Produccion' },
      { to: '/scan',         icon: <QrCodeScannerIcon />,          label: 'Escanear' },
    ],
  },
  {
    label: 'Ejecucion',
    items: [
      { to: '/ordenes',      icon: <AssignmentIcon />,             label: 'Ordenes', roles: ['ADMIN', 'SUPERVISOR'] },
      { to: '/picking',      icon: <PlaylistAddCheckIcon />,       label: 'Picking' },
      { to: '/tareas',       icon: <AssignmentTurnedInIcon />,     label: 'Tareas' },
      { to: '/conteos',      icon: <FactCheckIcon />,              label: 'Conteos' },
      { to: '/etiquetas',    icon: <QrCode2Icon />,                label: 'Etiquetas' },
      { to: '/devoluciones', icon: <AssignmentReturnIcon />,       label: 'Devoluciones', roles: ['ADMIN', 'SUPERVISOR'] },
    ],
  },
  {
    label: 'Control',
    items: [
      { to: '/alertas',       icon: <WarningAmberIcon />,          label: 'Alertas' },
      { to: '/productividad', icon: <BarChartIcon />,              label: 'Productividad' },
      { to: '/auditoria',     icon: <HistoryIcon />,               label: 'Auditoria' },
      { to: '/usuarios',      icon: <PeopleAltIcon />,             label: 'Usuarios', roles: ['ADMIN'] },
      { to: '/webhooks',      icon: <WebhookIcon />,               label: 'Webhooks', roles: ['ADMIN'] },
    ],
  },
]

/** Filter NAV_SECTIONS by user role, removing empty sections */
function getFilteredSections(role) {
  return NAV_SECTIONS
    .map(section => ({
      ...section,
      items: section.items.filter(item => !item.roles || item.roles.includes(role)),
    }))
    .filter(section => section.items.length > 0)
}

const ALL_ITEMS = NAV_SECTIONS.flatMap(s => s.items)

function getPageTitle(pathname) {
  if (pathname === '/' || pathname === '/dashboard') return 'Dashboard'
  const item = ALL_ITEMS.find(i => i.to !== '/' && pathname.startsWith(i.to))
  return item ? item.label : ''
}

export default function Layout() {
  const nav = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuth()
  const { mode, toggleMode } = useUi()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))

  const [mobileOpen, setMobileOpen] = useState(false)
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)

  const expanded = isMobile ? mobileOpen : (pinned || hovered)
  const sidebarW = isMobile ? SIDEBAR_OPEN : (expanded ? SIDEBAR_OPEN : SIDEBAR_CLOSED)
  const isDark = theme.palette.mode === 'dark'

  const filteredSections = getFilteredSections(user?.role)

  const handleLogout = () => { logout(); nav('/login') }

  const checkActive = (to) =>
    to === '/'
      ? (location.pathname === '/' || location.pathname === '/dashboard')
      : location.pathname.startsWith(to)

  /* Sidebar content shared by desktop and mobile */
  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Logo */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: expanded ? 2.5 : 0, py: 1.8,
        justifyContent: expanded ? 'flex-start' : 'center',
        minHeight: TOPBAR_H,
      }}>
        <Box sx={{
          width: 34, height: 34, borderRadius: 2, flexShrink: 0,
          background: 'rgba(255,255,255,0.12)',
          border: '1px solid rgba(255,255,255,0.16)',
          display: 'grid', placeItems: 'center',
          fontWeight: 800, fontSize: 13, color: 'white',
        }}>MT</Box>
        {expanded && (
          <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Typography sx={{ fontWeight: 800, fontSize: 14, color: 'white', lineHeight: 1.2 }}>
              MyTechnologies
            </Typography>
            <Typography sx={{ fontSize: 10, color: 'rgba(255,255,255,0.60)', fontWeight: 600 }}>
              Sistema WMS
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: expanded ? 2 : 1 }} />

      {/* Nav sections */}
      <Box sx={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 1,
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.12)', borderRadius: 99 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
      }}>
        {filteredSections.map((section) => (
          <Box key={section.label} sx={{ mb: 0.5 }}>
            {expanded && (
              <Typography sx={{
                px: 2.5, pt: 1.5, pb: 0.5,
                fontSize: 10, fontWeight: 700, letterSpacing: 1,
                textTransform: 'uppercase',
                color: 'rgba(255,255,255,0.35)',
              }}>
                {section.label}
              </Typography>
            )}
            {!expanded && section.label !== 'Principal' && (
              <Divider sx={{ borderColor: 'rgba(255,255,255,0.06)', mx: 1.5, my: 0.5 }} />
            )}
            <List disablePadding sx={{ px: expanded ? 1 : 0.75 }}>
              {section.items.map((item) => {
                const active = checkActive(item.to)
                return (
                  <Tooltip key={item.to} title={expanded ? '' : item.label} placement="right" arrow>
                    <ListItemButton
                      onClick={() => { nav(item.to); if (isMobile) setMobileOpen(false) }}
                      sx={{
                        borderRadius: 2, mb: 0.3, minHeight: 40,
                        px: expanded ? 1.5 : 0, py: 0.6,
                        justifyContent: expanded ? 'flex-start' : 'center',
                        bgcolor: active
                          ? (isDark ? 'rgba(66,165,245,0.15)' : 'rgba(255,255,255,0.18)')
                          : 'transparent',
                        border: active
                          ? ('1px solid ' + (isDark ? 'rgba(66,165,245,0.25)' : 'rgba(255,255,255,0.22)'))
                          : '1px solid transparent',
                        '&:hover': {
                          bgcolor: active
                            ? (isDark ? 'rgba(66,165,245,0.20)' : 'rgba(255,255,255,0.22)')
                            : 'rgba(255,255,255,0.08)',
                        },
                      }}
                    >
                      <ListItemIcon sx={{
                        color: active ? '#fff' : 'rgba(255,255,255,0.65)',
                        minWidth: expanded ? 34 : 'unset',
                        justifyContent: 'center',
                      }}>
                        {React.cloneElement(item.icon, { sx: { fontSize: 20 } })}
                      </ListItemIcon>
                      {expanded && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            sx: {
                              fontWeight: active ? 700 : 500,
                              fontSize: 13, whiteSpace: 'nowrap',
                              color: active ? '#fff' : 'rgba(255,255,255,0.82)',
                            },
                          }}
                        />
                      )}
                    </ListItemButton>
                  </Tooltip>
                )
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* Pin toggle desktop only */}
      {!isMobile && expanded && (
        <>
          <Divider sx={{ borderColor: 'rgba(255,255,255,0.08)', mx: 2 }} />
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Tooltip title={pinned ? 'Desfijar sidebar' : 'Fijar sidebar'}>
              <IconButton
                size="small"
                onClick={() => setPinned(p => !p)}
                sx={{ color: 'rgba(255,255,255,0.60)', '&:hover': { color: '#fff' } }}
              >
                {pinned ? <PushPinIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
              </IconButton>
            </Tooltip>
          </Box>
        </>
      )}
    </Box>
  )

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Desktop sidebar */}
      {!isMobile && (
        <Box
          onMouseEnter={() => { if (!pinned) setHovered(true) }}
          onMouseLeave={() => { if (!pinned) setHovered(false) }}
          sx={{
            width: sidebarW, minWidth: sidebarW, flexShrink: 0,
            transition: 'width 200ms cubic-bezier(.4,0,.2,1), min-width 200ms cubic-bezier(.4,0,.2,1)',
            position: 'fixed', top: 0, left: 0, bottom: 0,
            zIndex: theme.zIndex.drawer + 1,
            backgroundImage: isDark
              ? 'linear-gradient(180deg, #0A2540 0%, #0B1929 100%)'
              : 'linear-gradient(180deg, #1565C0 0%, #0D47A1 50%, #0A2540 100%)',
            boxShadow: expanded ? '4px 0 24px rgba(0,0,0,0.18)' : '2px 0 8px rgba(0,0,0,0.08)',
            color: '#fff',
          }}
        >
          {sidebarContent}
        </Box>
      )}

      {/* Mobile drawer */}
      {isMobile && (
        <Drawer
          anchor="left"
          open={mobileOpen}
          onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: SIDEBAR_OPEN } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main area */}
      <Box sx={{
        flex: 1,
        ml: isMobile ? 0 : (sidebarW + 'px'),
        transition: 'margin-left 200ms cubic-bezier(.4,0,.2,1)',
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundImage: 'none !important',
            bgcolor: isDark ? alpha('#0B1929', 0.85) : alpha('#FFFFFF', 0.80),
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(13,59,102,0.08)',
            boxShadow: isDark
              ? '0 1px 8px rgba(0,0,0,0.20)'
              : '0 1px 4px rgba(13,59,102,0.05)',
            color: isDark ? '#E8EDF4' : '#0A2540',
          }}
        >
          <Toolbar sx={{ gap: 1, minHeight: TOPBAR_H + ' !important', px: { xs: 1.5, md: 3 } }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 0.5 }}>
                <MenuIcon />
              </IconButton>
            )}

            <Typography sx={{ fontWeight: 800, fontSize: 16, letterSpacing: -0.2 }}>
              {getPageTitle(location.pathname)}
            </Typography>

            <Box sx={{ flex: 1 }} />

            <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
              <IconButton onClick={toggleMode} size="small" sx={{ borderRadius: 2 }}>
                {mode === 'light' ? <DarkModeIcon fontSize="small" /> : <LightModeIcon fontSize="small" />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Notificaciones">
              <IconButton size="small" sx={{ borderRadius: 2 }}>
                <NotificationsNoneIcon fontSize="small" />
              </IconButton>
            </Tooltip>

            {!isMobile && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 1,
                bgcolor: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(13,59,102,0.05)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(13,59,102,0.08)',
                borderRadius: 2, px: 1.5, py: 0.5,
              }}>
                <AccountCircleIcon sx={{ fontSize: 22, opacity: 0.7 }} />
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                    {user?.fullName || user?.email || 'Usuario'}
                  </Typography>
                  <Typography sx={{ fontSize: 10, opacity: 0.6, lineHeight: 1.2 }}>
                    {user?.role || '---'}{user?.position ? (' / ' + user.position) : ''}
                  </Typography>
                </Box>
              </Box>
            )}

            {isMobile && (
              <Chip
                size="small"
                label={user?.role || '---'}
                variant="outlined"
                sx={{ fontWeight: 700, fontSize: 10 }}
              />
            )}

            <Tooltip title="Cerrar sesion">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{
                  borderRadius: 2,
                  bgcolor: isDark ? 'rgba(198,40,40,0.12)' : 'rgba(198,40,40,0.06)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(198,40,40,0.25)' : 'rgba(198,40,40,0.12)',
                  color: isDark ? '#EF5350' : '#C62828',
                  '&:hover': { bgcolor: isDark ? 'rgba(198,40,40,0.22)' : 'rgba(198,40,40,0.12)' },
                }}
              >
                <LogoutIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{
          flex: 1,
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          maxWidth: 1400,
          width: '100%',
          mx: 'auto',
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
