import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Navigation from './components/Navigation'
import Inventory from './components/Inventory'
import Proforma from './components/Proforma'
import Reports from './components/Reports'
import Home from './components/Home'
import Ventas from './components/Ventas'

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-2xl text-gray-600">Cargando...</div>
      </div>
    )
  }
  
  return user ? children : <Navigate to="/login" />
}

const AppContent = () => {
  const { user } = useAuth()
  
  if (!user) {
    return <Login />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/inventario" element={<Inventory />} />
          <Route path="/ventas" element={<Ventas/>} />
          <Route path="/proforma" element={<Proforma />} />
          <Route path="/reportes" element={<Reports />} />
          <Route path="/login" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  )
}

const App = () => {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  )
}

export default App