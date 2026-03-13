import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'
import { api } from '../services/api'
import { usePageStyles } from '../ui/pageStyles'

import Box from '@mui/material/Box'
import Paper from '@mui/material/Paper'
import Typography from '@mui/material/Typography'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import Alert from '@mui/material/Alert'
import Stack from '@mui/material/Stack'
import Link from '@mui/material/Link'
import InputAdornment from '@mui/material/InputAdornment'
import useMediaQuery from '@mui/material/useMediaQuery'
import { useTheme } from '@mui/material/styles'

import BadgeOutlinedIcon from '@mui/icons-material/BadgeOutlined'
import LockOutlinedIcon from '@mui/icons-material/LockOutlined'
import WarehouseIcon from '@mui/icons-material/Warehouse'
import InventoryIcon from '@mui/icons-material/Inventory'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import BarChartIcon from '@mui/icons-material/BarChart'
import SecurityIcon from '@mui/icons-material/Security'

export default function LoginPage() {
  const nav = useNavigate()
  const { login } = useAuth()
  const ps = usePageStyles()
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const isDark = theme.palette.mode === 'dark'

  const [employeeNumber, setEmployeeNumber] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await api().post('/api/auth/login', { employeeNumber, password })
      login(res.data.token, res.data.user)
      nav('/')
    } catch (err) {
      setError(err?.message || 'Credenciales incorrectas. Verifica tu numero de empleado y contrasena.')
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: <WarehouseIcon sx={{ fontSize: 20 }} />, title: 'Gestion de Almacen', desc: 'Control completo de racks, ubicaciones e inventario' },
    { icon: <LocalShippingIcon sx={{ fontSize: 20 }} />, title: 'Logistica Integrada', desc: 'Recepciones, despachos y transferencias en tiempo real' },
    { icon: <BarChartIcon sx={{ fontSize: 20 }} />, title: 'Productividad', desc: 'Metricas de operacion y rendimiento por operador' },
    { icon: <InventoryIcon sx={{ fontSize: 20 }} />, title: 'Trazabilidad', desc: 'Historial completo de movimientos y auditoria' },
  ]

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      bgcolor: isDark ? '#020617' : '#F8FAFC',
    }}>
      {/* Left panel — Brand & features (desktop only) */}
      {!isMobile && (
        <Box sx={{
          width: '45%', maxWidth: 560,
          display: 'flex', flexDirection: 'column',
          justifyContent: 'center',
          px: 6, py: 5,
          bgcolor: '#0F172A',
          position: 'relative',
          overflow: 'hidden',
        }}>
          {/* Subtle background pattern */}
          <Box sx={{
            position: 'absolute', inset: 0,
            background: 'radial-gradient(ellipse 600px 400px at 20% 30%, rgba(59,130,246,0.08), transparent 70%)',
          }} />

          <Box sx={{ position: 'relative', zIndex: 1 }}>
            {/* Logo */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 5 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: 2,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 15, color: 'white',
              }}>MT</Box>
              <Box>
                <Typography sx={{ fontWeight: 700, fontSize: 18, color: 'white', lineHeight: 1.2, letterSpacing: -0.3 }}>
                  MiTechnologies
                </Typography>
                <Typography sx={{ fontSize: 11, color: 'rgba(148,163,184,0.70)', fontWeight: 500, letterSpacing: 0.3 }}>
                  Warehouse Management System
                </Typography>
              </Box>
            </Box>

            {/* Headline */}
            <Typography sx={{
              fontWeight: 700, fontSize: 28, color: 'white',
              lineHeight: 1.25, letterSpacing: -0.5, mb: 1.5,
            }}>
              Operacion eficiente,{'\n'}control total
            </Typography>
            <Typography sx={{
              fontSize: 14, color: 'rgba(148,163,184,0.80)',
              lineHeight: 1.6, mb: 5, maxWidth: 380,
            }}>
              Plataforma integral para la gestion de almacenes, inventario y logistica empresarial.
            </Typography>

            {/* Feature list */}
            <Stack spacing={2.5}>
              {features.map((f, i) => (
                <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                  <Box sx={{
                    width: 36, height: 36, borderRadius: 1.5, flexShrink: 0,
                    bgcolor: 'rgba(59,130,246,0.10)',
                    border: '1px solid rgba(59,130,246,0.12)',
                    display: 'grid', placeItems: 'center',
                    color: '#60A5FA',
                  }}>
                    {f.icon}
                  </Box>
                  <Box>
                    <Typography sx={{ fontWeight: 600, fontSize: 13, color: 'white', mb: 0.25 }}>
                      {f.title}
                    </Typography>
                    <Typography sx={{ fontSize: 12, color: 'rgba(148,163,184,0.65)', lineHeight: 1.4 }}>
                      {f.desc}
                    </Typography>
                  </Box>
                </Box>
              ))}
            </Stack>
          </Box>
        </Box>
      )}

      {/* Right panel — Login form */}
      <Box sx={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        px: { xs: 2, sm: 4 },
        py: 4,
      }}>
        <Box sx={{ width: '100%', maxWidth: 400 }}>
          {/* Mobile logo */}
          {isMobile && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 4, justifyContent: 'center' }}>
              <Box sx={{
                width: 36, height: 36, borderRadius: 1.5,
                background: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
                display: 'grid', placeItems: 'center',
                fontWeight: 700, fontSize: 13, color: 'white',
              }}>MT</Box>
              <Typography sx={{ fontWeight: 700, fontSize: 16, color: 'text.primary', letterSpacing: -0.2 }}>
                MiTechnologies
              </Typography>
            </Box>
          )}

          {/* Form header */}
          <Box sx={{ mb: 3.5 }}>
            <Typography sx={{
              fontWeight: 700, fontSize: { xs: 22, sm: 26 },
              color: 'text.primary', letterSpacing: -0.4, mb: 0.5,
            }}>
              Iniciar sesion
            </Typography>
            <Typography sx={{ fontSize: 14, color: 'text.secondary' }}>
              Ingresa tus credenciales para acceder al sistema
            </Typography>
          </Box>

          {error && (
            <Alert
              severity="error"
              sx={{ mb: 2.5, '& .MuiAlert-message': { fontSize: 13 } }}
            >
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={onSubmit}>
            <Stack spacing={2.5}>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
                  Numero de empleado
                </Typography>
                <TextField
                  placeholder="Ej: 0001"
                  value={employeeNumber}
                  onChange={(e) => setEmployeeNumber(e.target.value)}
                  autoComplete="off"
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <BadgeOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: isDark ? 'rgba(255,255,255,.03)' : '#FFFFFF',
                    },
                  }}
                />
              </Box>

              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, color: 'text.primary', mb: 0.75 }}>
                  Contrasena
                </Typography>
                <TextField
                  placeholder="Ingresa tu contrasena"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  fullWidth
                  size="small"
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <LockOutlinedIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: isDark ? 'rgba(255,255,255,.03)' : '#FFFFFF',
                    },
                  }}
                />
              </Box>

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={loading}
                sx={{
                  py: 1.2,
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  mt: 0.5,
                }}
              >
                {loading ? 'Verificando...' : 'Acceder al sistema'}
              </Button>

              <Box sx={{ textAlign: 'center', pt: 0.5 }}>
                <Link
                  component="button"
                  type="button"
                  underline="hover"
                  sx={{ fontWeight: 500, color: 'text.secondary', fontSize: 13, '&:hover': { color: 'primary.main' } }}
                  onClick={() => nav('/forgot-password')}
                >
                  Olvidaste tu contrasena?
                </Link>
              </Box>
            </Stack>
          </Box>

          {/* Security badge */}
          <Box sx={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 0.75, mt: 4, pt: 3,
            borderTop: '1px solid',
            borderColor: isDark ? 'rgba(255,255,255,0.06)' : '#E2E8F0',
          }}>
            <SecurityIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.6 }} />
            <Typography sx={{ fontSize: 11, color: 'text.secondary', opacity: 0.6 }}>
              Conexion segura · Acceso autorizado
            </Typography>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
