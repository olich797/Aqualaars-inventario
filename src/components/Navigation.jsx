import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Package, FileText, BarChart3, Home, LogOut, ShoppingCart, Menu, X } from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'

const Navigation = () => {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  
  // Estado para controlar la apertura del menú en celulares
  const [isOpen, setIsOpen] = useState(false)

  const navItems = [
    { path: '/', icon: Home, label: 'Inicio' },
    { path: '/inventario', icon: Package, label: 'Inventario' },
    { path: '/ventas', icon: ShoppingCart, label: 'Ventas' },
    { path: '/proforma', icon: FileText, label: 'Proforma' },
    { path: '/reportes', icon: BarChart3, label: 'Reportes' },
  ]

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleNavigate = (path) => {
    navigate(path)
    setIsOpen(false) // Cierra el menú automáticamente al hacer clic en móvil
  }

  // ✅ Función para ir al inicio
  const goToHome = () => {
    navigate('/')
    setIsOpen(false)
  }

  return (
    <nav className="bg-white shadow-lg border-b border-gray-200 relative z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo y Menú de Escritorio */}
          <div className="flex items-center gap-8 w-full md:w-auto justify-between md:justify-start">
            {/* ✅ Logo clickeable */}
            <button
              onClick={goToHome}
              className="text-xl font-bold text-cyan-600 hover:text-cyan-700 transition-colors cursor-pointer"
            >
              Aqualaars
            </button>
            
            {/* Botón de Hamburguesa (Solo visible en móviles) */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition duration-200"
              aria-label="Toggle Menu"
            >
              {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Menú Horizontal (Oculto en móvil, visible desde tablets/PC) */}
            <div className="hidden md:flex gap-2">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive = location.pathname === item.path
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigate(item.path)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-lg transition duration-200 ${
                      isActive
                        ? 'bg-cyan-100 text-cyan-700 font-semibold'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Botón Cerrar Sesión (Oculto en móvil, visible en PC) */}
          <div className="hidden md:block">
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition duration-200"
            >
              <LogOut size={18} />
              Cerrar Sesión
            </button>
          </div>
        </div>

        {/* Menú Desplegable Vertical (Solo visible en móviles cuando isOpen es true) */}
        {isOpen && (
          <div className="md:hidden absolute top-16 left-0 w-full bg-white border-b border-gray-200 shadow-xl px-4 py-4 flex flex-col gap-2 transition-all duration-300">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive = location.pathname === item.path
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigate(item.path)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition duration-200 w-full text-left ${
                    isActive
                      ? 'bg-cyan-100 text-cyan-700 font-semibold'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-base">{item.label}</span>
                </button>
              )
            })}
            
            {/* Divisor estético para separar el menú del botón de salida */}
            <div className="border-t border-gray-100 my-2"></div>
            
            <button
              onClick={handleLogout}
              className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition duration-200 w-full text-left"
            >
              <LogOut size={20} />
              <span className="text-base font-medium">Cerrar Sesión</span>
            </button>
          </div>
        )}

      </div>
    </nav>
  )
}

export default Navigation