import React, { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './state/auth'
import Box from '@mui/material/Box'
import CircularProgress from '@mui/material/CircularProgress'

import Layout from './ui/Layout'

/* ── Existing pages (lazy) ── */
const LoginPage = lazy(() => import('./pages/LoginPage'))
const RegisterPage = lazy(() => import('./pages/RegisterPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const RacksPage = lazy(() => import('./pages/RacksPage'))
const MovementsPage = lazy(() => import('./pages/MovementsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const ProductionPage = lazy(() => import('./pages/ProductionPage'))
const ScanPage = lazy(() => import('./pages/ScanPage'))
const OrdersPage = lazy(() => import('./pages/OrdersPage'))
const CountsPage = lazy(() => import('./pages/CountsPage'))
const LocationsPage = lazy(() => import('./pages/LocationsPage'))
const AdminUsers = lazy(() => import('./pages/AdminUsers'))
const FftPage = lazy(() => import('./pages/FftPage'))

/* ── NEW pages (Fase 1-3) ── */
const InboundPage = lazy(() => import('./pages/InboundPage'))
const AlertsPage = lazy(() => import('./pages/AlertsPage'))
const QrPrintPage = lazy(() => import('./pages/QrPrintPage'))
const TasksPage = lazy(() => import('./pages/TasksPage'))
const PickingPage = lazy(() => import('./pages/PickingPage'))
const ProductivityPage = lazy(() => import('./pages/ProductivityPage'))
const AuditPage = lazy(() => import('./pages/AuditPage'))
const ReturnsPage = lazy(() => import('./pages/ReturnsPage'))
const WebhooksPage = lazy(() => import('./pages/WebhooksPage'))

function PageLoader() {
  return (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
      <CircularProgress size={40} />
    </Box>
  )
}

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

/**
 * Role-based route guard.
 * @param {string[]} roles – allowed roles (e.g. ['ADMIN','SUPERVISOR'])
 * If the current user's role is not in the list, silently redirect to Dashboard.
 */
function RoleRoute({ roles, children }) {
  const { user } = useAuth()
  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }
  return children
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* públicas */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />

        {/* privadas */}
        <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route index element={<Navigate to="dashboard" replace />} />

          {/* Existing */}
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="inventario" element={<InventoryPage />} />
          <Route path="racks" element={<RacksPage />} />
          <Route path="produccion" element={<ProductionPage />} />
          <Route path="movimientos" element={<MovementsPage />} />
          <Route path="ordenes" element={<RoleRoute roles={['ADMIN', 'SUPERVISOR']}><OrdersPage /></RoleRoute>} />
          <Route path="conteos" element={<CountsPage />} />
          <Route path="ubicaciones" element={<LocationsPage />} />
          <Route path="usuarios" element={<RoleRoute roles={['ADMIN']}><UsersPage /></RoleRoute>} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="admin/users" element={<RoleRoute roles={['ADMIN']}><AdminUsers /></RoleRoute>} />

          {/* NEW — Fase 1 */}
          <Route path="recepcion" element={<RoleRoute roles={['ADMIN', 'SUPERVISOR']}><InboundPage /></RoleRoute>} />
          <Route path="alertas" element={<AlertsPage />} />
          <Route path="etiquetas" element={<QrPrintPage />} />

          {/* NEW — Fase 2 */}
          <Route path="tareas" element={<TasksPage />} />
          <Route path="picking" element={<PickingPage />} />
          <Route path="productividad" element={<ProductivityPage />} />

          {/* NEW — Fase 3 */}
          <Route path="auditoria" element={<AuditPage />} />
          <Route path="devoluciones" element={<RoleRoute roles={['ADMIN', 'SUPERVISOR']}><ReturnsPage /></RoleRoute>} />
          <Route path="webhooks" element={<RoleRoute roles={['ADMIN']}><WebhooksPage /></RoleRoute>} />
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
