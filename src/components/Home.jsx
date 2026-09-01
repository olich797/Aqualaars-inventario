import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Package, FileText, BarChart3, Search, ShoppingCart, TrendingUp } from 'lucide-react'
import { supabase } from '../services/supabase'

const Home = () => {
  const navigate = useNavigate()
  const [searchTerm, setSearchTerm] = useState('')
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [dailyRevenue, setDailyRevenue] = useState(0)
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [allProducts, setAllProducts] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [stockThreshold] = useState(30) // ✅ Cambiado a 30%

  useEffect(() => {
    fetchProducts()
    fetchDailyRevenue()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      
      const productsData = data || []
      
      // Usar el stock_maximo de la tabla
      const productsWithMaxStock = productsData.map((p) => {
        const stockMaximo = p.stock_maximo || p.cantidad
        
        return {
          ...p,
          stock_maximo: stockMaximo,
          stock_actual: p.cantidad,
          porcentaje_stock: Math.round((p.cantidad / stockMaximo) * 100)
        }
      })
      
      setAllProducts(productsWithMaxStock)
      
      // Filtrar productos con stock menor al porcentaje definido (30%)
      const lowStock = productsWithMaxStock.filter(p => {
        const porcentaje = (p.cantidad / p.stock_maximo) * 100
        return porcentaje <= stockThreshold
      })
      
      setLowStockProducts(lowStock)
      setProducts(lowStock)
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchDailyRevenue = async () => {
    try {
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: ventasData, error } = await supabase
        .from('ventas')
        .select('total')
        .eq('estado', 'completada')
        .gte('fecha_venta', today.toISOString())
        .lt('fecha_venta', tomorrow.toISOString())

      if (error) throw error

      const total = ventasData?.reduce((sum, v) => sum + (v.total || 0), 0) || 0
      setDailyRevenue(total)
    } catch (error) {
      console.error('Error fetching daily revenue:', error)
    }
  }

  const handleSearch = (term) => {
    setSearchTerm(term)
    
    if (term.trim() === '') {
      setIsSearching(false)
      setProducts(lowStockProducts)
    } else {
      setIsSearching(true)
      const filtered = allProducts.filter(product =>
        product.nombre.toLowerCase().includes(term.toLowerCase()) ||
        (product.marca && product.marca.toLowerCase().includes(term.toLowerCase())) ||
        (product.origen && product.origen.toLowerCase().includes(term.toLowerCase()))
      )
      setProducts(filtered)
    }
  }

  // Función para obtener el estado del stock basado en porcentaje
  const getStockStatus = (product) => {
    const porcentaje = (product.cantidad / product.stock_maximo) * 100
    
    if (porcentaje <= 30) {
      return { 
        estado: 'Crítico', 
        color: 'bg-red-100 text-red-700',
        icon: '🔴'
      }
    } else if (porcentaje <= 50) {
      return { 
        estado: 'Bajo', 
        color: 'bg-yellow-100 text-yellow-700',
        icon: '🟡'
      }
    } else if (porcentaje <= 70) {
      return { 
        estado: 'Moderado', 
        color: 'bg-orange-100 text-orange-700',
        icon: '🟠'
      }
    } else {
      return { 
        estado: 'Óptimo', 
        color: 'bg-green-100 text-green-700',
        icon: '✅'
      }
    }
  }

  // Contar productos en estado crítico (menos del 30%)
  const criticalCount = allProducts.filter(p => {
    const porcentaje = (p.cantidad / p.stock_maximo) * 100
    return porcentaje <= 30
  }).length

  // Determinar si un producto está en bajo stock (menos del 30%)
  const isLowStock = (product) => {
    const porcentaje = (product.cantidad / product.stock_maximo) * 100
    return porcentaje <= stockThreshold
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">📊 Panel de Control</h1>
        <p className="text-sm text-gray-500 mt-1">Bienvenido al sistema de gestión de inventario</p>
      </div>

      {/* Tarjetas de Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 sm:mb-8">
        <div className="bg-gradient-to-r from-cyan-500 to-blue-500 p-5 sm:p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-white/80 font-medium">💰 Ingresos de Hoy</p>
              <p className="text-2xl sm:text-3xl font-bold text-white">Bs. {dailyRevenue.toFixed(2)}</p>
              <p className="text-xs text-white/60 mt-1">
                {new Date().toLocaleDateString('es-ES', { 
                  weekday: 'long', 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}
              </p>
            </div>
            <div className="bg-white/20 p-3 sm:p-4 rounded-xl">
              <TrendingUp className="w-8 h-8 sm:w-10 sm:h-10 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-white p-5 sm:p-6 rounded-xl shadow-md border-l-4 border-red-500">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 font-medium">🔴 Productos Críticos</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{criticalCount}</p>
              <p className="text-xs text-gray-400 mt-1">Stock por debajo del 30%</p>
            </div>
            <div className="bg-red-50 p-3 sm:p-4 rounded-xl">
              <Package className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Accesos Rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <button
          onClick={() => navigate('/inventario')}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-center border-2 border-transparent hover:border-cyan-500 group"
        >
          <Package className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">Inventario</h3>
          <p className="text-xs text-gray-600">Gestiona tus productos</p>
        </button>

        <button
          onClick={() => navigate('/ventas')}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-center border-2 border-transparent hover:border-green-500 group"
        >
          <ShoppingCart className="w-8 h-8 sm:w-10 sm:h-10 text-green-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">Ventas</h3>
          <p className="text-xs text-gray-600">Registra tus ventas</p>
        </button>

        <button
          onClick={() => navigate('/proforma')}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-center border-2 border-transparent hover:border-cyan-500 group"
        >
          <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">Proforma</h3>
          <p className="text-xs text-gray-600">Genera nuevas proformas</p>
        </button>

        <button
          onClick={() => navigate('/reportes')}
          className="bg-white p-4 sm:p-5 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 text-center border-2 border-transparent hover:border-cyan-500 group"
        >
          <BarChart3 className="w-8 h-8 sm:w-10 sm:h-10 text-cyan-600 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <h3 className="text-sm sm:text-base font-semibold text-gray-800">Reportes</h3>
          <p className="text-xs text-gray-600">Visualiza tus proformas</p>
        </button>
      </div>

      {/* Tabla de Productos */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800">
              {isSearching ? '🔍 Resultados de Búsqueda' : '⚠️ Productos con Bajo Stock'}
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              {isSearching 
                ? `Mostrando resultados para "${searchTerm}"` 
                : 'Productos con menos del 30% de stock disponible'}
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Buscar producto..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-600">Cargando productos...</div>
        ) : products.length > 0 ? (
          <>
            {/* Tabla Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className={`border-b ${isSearching ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Marca</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Origen</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Stock</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio USD</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio BOB</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => {
                    const isLow = isLowStock(product)
                    const status = getStockStatus(product)
                    
                    return (
                      <tr key={product.id} className={`border-b ${isLow ? 'hover:bg-red-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-800">{product.nombre}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.marca || <span className="text-gray-400">Sin marca</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {product.origen || <span className="text-gray-400">N/A</span>}
                        </td>
                        <td className={`px-4 py-3 text-sm text-right ${isLow ? 'font-bold text-red-600' : 'text-gray-800'}`}>
                          {product.cantidad}
                          {isLow && <span className="ml-1 text-red-500">⚠️</span>}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-gray-800">${product.precio_usd?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm text-right text-gray-800">Bs. {product.precio_bob?.toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 text-xs rounded-full ${status.color}`}>
                            {status.icon} {status.estado}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {products.map((product) => {
                const isLow = isLowStock(product)
                const status = getStockStatus(product)
                
                return (
                  <div key={product.id} className={`py-4 ${isLow ? 'hover:bg-red-50/50' : 'hover:bg-gray-50'} transition-colors`}>
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="text-sm font-semibold text-gray-800 truncate">{product.nombre}</p>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mt-0.5">
                          {product.marca && <span>{product.marca}</span>}
                          {product.origen && <span>• {product.origen}</span>}
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-sm font-bold text-gray-800">Bs. {product.precio_bob?.toFixed(2)}</p>
                        <p className="text-xs text-gray-500">${product.precio_usd?.toFixed(2)}</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Stock:</span>
                        <span className={`text-sm font-medium ${isLow ? 'text-red-600 font-bold' : 'text-gray-800'}`}>
                          {product.cantidad}
                        </span>
                        {isLow && <span className="text-red-500">⚠️</span>}
                      </div>
                      <span className={`px-2 py-1 text-[10px] rounded-full ${status.color}`}>
                        {status.icon} {status.estado}
                      </span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-4 pt-4 border-t flex justify-between items-center">
              <span className="text-xs sm:text-sm text-gray-500">
                Mostrando {products.length} {products.length === 1 ? 'producto' : 'productos'}
                {isSearching && ` encontrados`}
              </span>
              {isSearching && (
                <button
                  onClick={() => {
                    setSearchTerm('')
                    setIsSearching(false)
                    setProducts(lowStockProducts)
                  }}
                  className="text-xs sm:text-sm text-cyan-600 hover:text-cyan-700 font-medium hover:underline"
                >
                  Ver solo bajo stock
                </button>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8 text-gray-600">
            <Package className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="text-base font-medium text-gray-700">
              {isSearching ? '🔍 No se encontraron resultados' : '✅ Todo en orden'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {isSearching 
                ? `No se encontraron productos para "${searchTerm}"`
                : 'No hay productos con bajo stock'}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Home