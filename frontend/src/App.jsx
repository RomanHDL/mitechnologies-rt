import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './state/auth'

import LoginPage from './pages/LoginPage'
import Layout from './ui/Layout'
import DashboardPage from './pages/DashboardPage'
import InventoryPage from './pages/InventoryPage'
import RacksPage from './pages/RacksPage'
import MovementsPage from './pages/MovementsPage'
import UsersPage from './pages/UsersPage'
import ProductionPage from './pages/ProductionPage'
import ScanPage from './pages/ScanPage'
import ProductsPage from './pages/ProductsPage'
import OrdersPage from './pages/OrdersPage'
import CountsPage from './pages/CountsPage'
import LocationsPage from './pages/LocationsPage'

function PrivateRoute({ children }) {
  const { token } = useAuth()
  return token ? children : <Navigate to="/login" replace />
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<DashboardPage />} />
        <Route path="inventario" element={<InventoryPage />} />
        <Route path="racks" element={<RacksPage />} />
        <Route path="produccion" element={<ProductionPage />} />
        <Route path="movimientos" element={<MovementsPage />} />
        <Route path="productos" element={<ProductsPage />} />
        <Route path="ordenes" element={<OrdersPage />} />
        <Route path="conteos" element={<CountsPage />} />
        <Route path="ubicaciones" element={<LocationsPage />} />
        <Route path="usuarios" element={<UsersPage />} />
        <Route path="scan" element={<ScanPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
