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
import PersonOutlineIcon from '@mui/icons-material/PersonOutline'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'

/* Sidebar dimensions */
const SIDEBAR_OPEN = 240
const SIDEBAR_CLOSED = 60
const TOPBAR_H = 52

/* Grouped navigation */
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
  const [pinned, setPinned] = useState(true)
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

  /* ── Sidebar colors (always dark) ── */
  const sidebarBg = isDark ? '#0B1120' : '#0F172A'
  const sidebarBorder = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(255,255,255,0.06)'
  const sidebarHover = 'rgba(255,255,255,0.06)'
  const sidebarActive = isDark ? 'rgba(96,165,250,0.12)' : 'rgba(96,165,250,0.10)'
  const sidebarActiveBorder = isDark ? 'rgba(96,165,250,0.25)' : 'rgba(96,165,250,0.20)'
  const sidebarText = 'rgba(255,255,255,0.72)'
  const sidebarTextActive = '#FFFFFF'
  const sidebarLabel = 'rgba(255,255,255,0.28)'

  /* Sidebar content shared by desktop and mobile */
  const sidebarContent = (
    <Box sx={{
      display: 'flex', flexDirection: 'column', height: '100%',
      overflow: 'hidden', bgcolor: sidebarBg,
    }}>
      {/* Logo */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.25,
        px: expanded ? 2 : 0, py: 1.5,
        justifyContent: expanded ? 'flex-start' : 'center',
        minHeight: TOPBAR_H,
      }}>
        <Box sx={{
          width: 32, height: 32, borderRadius: 1.5, flexShrink: 0,
          background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
          display: 'grid', placeItems: 'center',
          fontWeight: 700, fontSize: 12, color: 'white',
          letterSpacing: 0.5,
        }}>MT</Box>
        {expanded && (
          <Box sx={{ overflow: 'hidden', whiteSpace: 'nowrap' }}>
            <Typography sx={{ fontWeight: 700, fontSize: 14, color: 'white', lineHeight: 1.2, letterSpacing: -0.2 }}>
              MiTechnologies
            </Typography>
            <Typography sx={{ fontSize: 10, color: sidebarLabel, fontWeight: 500, letterSpacing: 0.3 }}>
              WMS v2.0
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: sidebarBorder, mx: expanded ? 1.5 : 1 }} />

      {/* Nav sections */}
      <Box sx={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden', py: 0.75,
        '&::-webkit-scrollbar': { width: 3 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.08)', borderRadius: 99 },
        '&::-webkit-scrollbar-track': { background: 'transparent' },
      }}>
        {filteredSections.map((section) => (
          <Box key={section.label} sx={{ mb: 0.25 }}>
            {expanded && (
              <Typography sx={{
                px: 2, pt: 1.5, pb: 0.4,
                fontSize: 11, fontWeight: 600, letterSpacing: 0.6,
                textTransform: 'uppercase',
                color: sidebarLabel,
              }}>
                {section.label}
              </Typography>
            )}
            {!expanded && section.label !== 'Principal' && (
              <Divider sx={{ borderColor: sidebarBorder, mx: 1.5, my: 0.5 }} />
            )}
            <List disablePadding sx={{ px: expanded ? 0.75 : 0.5 }}>
              {section.items.map((item) => {
                const active = checkActive(item.to)
                return (
                  <Tooltip key={item.to} title={expanded ? '' : item.label} placement="right" arrow>
                    <ListItemButton
                      onClick={() => { nav(item.to); if (isMobile) setMobileOpen(false) }}
                      sx={{
                        borderRadius: 1.5, mb: 0.25, minHeight: 36,
                        px: expanded ? 1.25 : 0, py: 0.5,
                        justifyContent: expanded ? 'flex-start' : 'center',
                        bgcolor: active ? sidebarActive : 'transparent',
                        borderLeft: active
                          ? `2px solid ${sidebarActiveBorder}`
                          : '2px solid transparent',
                        '&:hover': {
                          bgcolor: active ? sidebarActive : sidebarHover,
                        },
                        transition: 'background .1s ease',
                      }}
                    >
                      <ListItemIcon sx={{
                        color: active ? '#60A5FA' : sidebarText,
                        minWidth: expanded ? 32 : 'unset',
                        justifyContent: 'center',
                      }}>
                        {React.cloneElement(item.icon, { sx: { fontSize: 19 } })}
                      </ListItemIcon>
                      {expanded && (
                        <ListItemText
                          primary={item.label}
                          primaryTypographyProps={{
                            sx: {
                              fontWeight: active ? 600 : 400,
                              fontSize: 13, whiteSpace: 'nowrap',
                              color: active ? sidebarTextActive : sidebarText,
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

      {/* Bottom: pin toggle + user info */}
      <Divider sx={{ borderColor: sidebarBorder, mx: expanded ? 1.5 : 1 }} />

      {/* User mini card */}
      {expanded && (
        <Box sx={{ px: 1.5, py: 1.25 }}>
          <Box sx={{
            display: 'flex', alignItems: 'center', gap: 1,
            p: 1, borderRadius: 1.5,
            bgcolor: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.05)',
          }}>
            <Box sx={{
              width: 28, height: 28, borderRadius: 1, flexShrink: 0,
              bgcolor: 'rgba(96,165,250,0.15)',
              display: 'grid', placeItems: 'center',
              color: '#60A5FA', fontSize: 14,
            }}>
              <PersonOutlineIcon sx={{ fontSize: 16 }} />
            </Box>
            <Box sx={{ overflow: 'hidden', flex: 1 }}>
              <Typography sx={{ fontSize: 11, fontWeight: 600, color: 'white', lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user?.fullName || user?.email || 'Usuario'}
              </Typography>
              <Typography sx={{ fontSize: 10, color: sidebarLabel, lineHeight: 1.2 }}>
                {user?.role || '---'}
              </Typography>
            </Box>
          </Box>
        </Box>
      )}

      {/* Pin toggle desktop only */}
      {!isMobile && (
        <Box sx={{ px: 1, pb: 1, display: 'flex', justifyContent: 'center' }}>
          <Tooltip title={pinned ? 'Colapsar sidebar' : 'Fijar sidebar'} placement="right">
            <IconButton
              size="small"
              onClick={() => setPinned(p => !p)}
              sx={{
                color: sidebarText,
                borderRadius: 1.5,
                '&:hover': { color: '#fff', bgcolor: sidebarHover },
              }}
            >
              {pinned ? <ChevronLeftIcon fontSize="small" /> : <PushPinOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Box>
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
            transition: 'width 180ms ease, min-width 180ms ease',
            position: 'fixed', top: 0, left: 0, bottom: 0,
            zIndex: theme.zIndex.drawer + 1,
            bgcolor: sidebarBg,
            borderRight: `1px solid ${sidebarBorder}`,
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
          PaperProps={{ sx: { width: SIDEBAR_OPEN, bgcolor: sidebarBg } }}
        >
          {sidebarContent}
        </Drawer>
      )}

      {/* Main area */}
      <Box sx={{
        flex: 1,
        ml: isMobile ? 0 : (sidebarW + 'px'),
        transition: 'margin-left 180ms ease',
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        {/* Top bar */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundImage: 'none !important',
            bgcolor: isDark ? alpha('#020617', 0.88) : alpha('#FFFFFF', 0.88),
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
            boxShadow: 'none',
            color: isDark ? '#F1F5F9' : '#0F172A',
          }}
        >
          <Toolbar sx={{ gap: 0.75, minHeight: TOPBAR_H + ' !important', px: { xs: 1.5, md: 2.5 } }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(true)} sx={{ mr: 0.5 }}>
                <MenuIcon />
              </IconButton>
            )}

            <Typography sx={{ fontWeight: 600, fontSize: 15, letterSpacing: -0.1 }}>
              {getPageTitle(location.pathname)}
            </Typography>

            <Box sx={{ flex: 1 }} />

            <Tooltip title={mode === 'light' ? 'Modo oscuro' : 'Modo claro'}>
              <IconButton
                onClick={toggleMode}
                size="small"
                sx={{
                  borderRadius: 1.5,
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' },
                }}
              >
                {mode === 'light'
                  ? <DarkModeIcon sx={{ fontSize: 18 }} />
                  : <LightModeIcon sx={{ fontSize: 18 }} />
                }
              </IconButton>
            </Tooltip>

            <Tooltip title="Notificaciones">
              <IconButton
                size="small"
                sx={{
                  borderRadius: 1.5,
                  bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
                  '&:hover': { bgcolor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.07)' },
                }}
              >
                <NotificationsNoneIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Tooltip>

            {!isMobile && (
              <Box sx={{
                display: 'flex', alignItems: 'center', gap: 0.75,
                bgcolor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.03)',
                border: '1px solid',
                borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
                borderRadius: 1.5, px: 1.25, py: 0.4,
              }}>
                <Box sx={{
                  width: 24, height: 24, borderRadius: 1,
                  bgcolor: isDark ? 'rgba(96,165,250,0.15)' : '#EFF6FF',
                  display: 'grid', placeItems: 'center',
                }}>
                  <PersonOutlineIcon sx={{ fontSize: 14, color: isDark ? '#60A5FA' : '#3B82F6' }} />
                </Box>
                <Box>
                  <Typography sx={{ fontSize: 12, fontWeight: 600, lineHeight: 1.2 }}>
                    {user?.fullName || user?.email || 'Usuario'}
                  </Typography>
                  <Typography sx={{ fontSize: 10, color: 'text.secondary', lineHeight: 1.2 }}>
                    {user?.role || '---'}{user?.position ? (' · ' + user.position) : ''}
                  </Typography>
                </Box>
              </Box>
            )}

            {isMobile && (
              <Chip
                size="small"
                label={user?.role || '---'}
                sx={{
                  fontWeight: 600, fontSize: 10, height: 22,
                  bgcolor: isDark ? 'rgba(96,165,250,0.12)' : '#EFF6FF',
                  color: isDark ? '#60A5FA' : '#3B82F6',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(96,165,250,0.20)' : '#BFDBFE',
                }}
              />
            )}

            <Tooltip title="Cerrar sesion">
              <IconButton
                size="small"
                onClick={handleLogout}
                sx={{
                  borderRadius: 1.5,
                  bgcolor: isDark ? 'rgba(239,68,68,0.08)' : 'rgba(239,68,68,0.04)',
                  border: '1px solid',
                  borderColor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.10)',
                  color: isDark ? '#FCA5A5' : '#DC2626',
                  '&:hover': { bgcolor: isDark ? 'rgba(239,68,68,0.15)' : 'rgba(239,68,68,0.08)' },
                }}
              >
                <LogoutIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        {/* Page content */}
        <Box sx={{
          flex: 1,
          px: { xs: 1.5, sm: 2, md: 3 },
          py: { xs: 2, md: 2.5 },
          maxWidth: 1440,
          width: '100%',
          mx: 'auto',
        }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  )
}
