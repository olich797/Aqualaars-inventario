import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Save, Trash2, Search, Settings, ChevronLeft, ChevronRight } from 'lucide-react'

const Inventory = () => {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [exchangeRate, setExchangeRate] = useState(6.96)
  const [newProduct, setNewProduct] = useState({
    nombre: '',
    categoria: '',
    marca: '',
    origen: '',
    cantidad: 1,
    precio_usd: 0.01
  })
  const [editingProducts, setEditingProducts] = useState({})

  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [totalProducts, setTotalProducts] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const productsPerPage = 20

  // Opciones de origen (países)
  const paises = [
    'Argentina', 'Bolivia', 'Brasil', 'Chile', 'Estados Unidos', 
    'México', 'Paraguay', 'Perú', 'Uruguay', 'China', 'Japón', 'Taiwán', 'Italia'
  ]

  // Opciones de categorías
  const categorias = [
    'Bombas',
    'Filtros',
    'Cloradores',
    'Accesorios',
    'Productos Químicos',
    'Iluminación',
    'Limpieza',
    'Repuestos',
    'Tuberías',
    'Válvulas',
    'Otros'
  ]

  useEffect(() => {
    fetchProducts()
    fetchExchangeRate()
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [currentPage])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const from = (currentPage - 1) * productsPerPage
      const to = from + productsPerPage - 1

      const { data, error, count } = await supabase
        .from('inventario')
        .select('*', { count: 'exact' })
        .order('nombre')
        .range(from, to)
      
      if (error) throw error
      
      setProducts(data || [])
      setTotalProducts(count || 0)
      setTotalPages(Math.ceil((count || 0) / productsPerPage))
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchSearchResults = async (searchTerm) => {
    setLoading(true)
    try {
      let query = supabase
        .from('inventario')
        .select('*', { count: 'exact' })
        .order('nombre')

      if (searchTerm.trim()) {
        query = query.or(
          `nombre.ilike.%${searchTerm}%,` +
          `categoria.ilike.%${searchTerm}%,` +
          `marca.ilike.%${searchTerm}%,` +
          `origen.ilike.%${searchTerm}%`
        )
      }

      const from = (currentPage - 1) * productsPerPage
      const to = from + productsPerPage - 1
      
      const { data, error, count } = await query.range(from, to)
      
      if (error) throw error
      
      setProducts(data || [])
      setTotalProducts(count || 0)
      setTotalPages(Math.ceil((count || 0) / productsPerPage))
    } catch (error) {
      console.error('Error searching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return
    setCurrentPage(newPage)
    document.querySelector('.inventory-table')?.scrollIntoView({ behavior: 'smooth' })
  }

  const fetchExchangeRate = async () => {
    try {
      const { data, error } = await supabase
        .from('configuracion')
        .select('valor')
        .eq('clave', 'tipo_cambio')
        .single()
      
      if (!error && data) {
        setExchangeRate(data.valor)
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error)
    }
  }

  const updateExchangeRate = async (newRate) => {
    if (newRate <= 0) {
      alert('El tipo de cambio debe ser mayor a 0')
      return
    }

    try {
      const { data: existingData, error: checkError } = await supabase
        .from('configuracion')
        .select('id')
        .eq('clave', 'tipo_cambio')
        .single()

      if (checkError && checkError.code === 'PGRST116') {
        await supabase
          .from('configuracion')
          .insert([{ 
            clave: 'tipo_cambio', 
            valor: newRate,
            updated_at: new Date().toISOString()
          }])
      } else if (existingData) {
        await supabase
          .from('configuracion')
          .update({ 
            valor: newRate,
            updated_at: new Date().toISOString()
          })
          .eq('clave', 'tipo_cambio')
      }

      setExchangeRate(newRate)
      await updateAllProductPrices(newRate)
      await fetchProducts()
      alert('✅ Tipo de cambio actualizado y precios recalculados correctamente')
      
    } catch (error) {
      console.error('❌ Error updating exchange rate:', error)
      alert('❌ Error al actualizar el tipo de cambio')
    }
  }

  const updateAllProductPrices = async (newRate) => {
    try {
      const { data: products, error: fetchError } = await supabase
        .from('inventario')
        .select('id, precio_usd')
      
      if (fetchError) throw fetchError
      
      if (products && products.length > 0) {
        for (const product of products) {
          const { error: updateError } = await supabase
            .from('inventario')
            .update({ precio_bob: product.precio_usd * newRate })
            .eq('id', product.id)
          
          if (updateError) throw updateError
        }
      }
    } catch (error) {
      console.error('Error updating prices:', error)
      throw error
    }
  }

  const addProduct = async () => {
    if (!newProduct.nombre.trim()) {
      alert('Por favor ingrese un nombre para el producto')
      return
    }

    const precio_bob = newProduct.precio_usd * exchangeRate
    
    try {
      const { data, error } = await supabase
        .from('inventario')
        .insert([{
          nombre: newProduct.nombre,
          categoria: newProduct.categoria || null,
          marca: newProduct.marca || null,
          origen: newProduct.origen || null,
          cantidad: newProduct.cantidad,
          stock_maximo: newProduct.cantidad,
          precio_usd: newProduct.precio_usd,
          precio_bob: precio_bob
        }])
        .select()
      
      if (error) throw error
      
      setProducts([...products, data[0]])
      setNewProduct({ nombre: '', categoria: '', marca: '', origen: '', cantidad: 1, precio_usd: 0.01 })
      setShowAddForm(false)
      alert('✅ Producto agregado correctamente')
    } catch (error) {
      console.error('Error adding product:', error)
      alert('❌ Error al agregar el producto')
    }
  }

  const updateProduct = async (id, updates) => {
    try {
      const currentProduct = products.find(p => p.id === id)
      
      let newStockMaximo = currentProduct?.stock_maximo || currentProduct?.cantidad || 0
      if (updates.cantidad !== undefined && updates.cantidad > newStockMaximo) {
        newStockMaximo = updates.cantidad
      }

      const updateData = {
        ...updates,
        precio_bob: updates.precio_usd * exchangeRate,
        stock_maximo: newStockMaximo
      }

      const { error } = await supabase
        .from('inventario')
        .update(updateData)
        .eq('id', id)
      
      if (error) throw error
      
      setProducts(products.map(p => 
        p.id === id ? { ...p, ...updates, precio_bob: updates.precio_usd * exchangeRate, stock_maximo: newStockMaximo } : p
      ))
      
      const newEditing = { ...editingProducts }
      delete newEditing[id]
      setEditingProducts(newEditing)
      
      alert('✅ Producto actualizado correctamente')
    } catch (error) {
      console.error('Error updating product:', error)
      alert('❌ Error al actualizar el producto')
    }
  }

  const deleteProduct = async (id, nombre) => {
    if (!confirm(`¿Estás seguro de eliminar el producto "${nombre}"?`)) return
    
    try {
      const { error } = await supabase
        .from('inventario')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      await fetchProducts()
      alert('✅ Producto eliminado correctamente')
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('❌ Error al eliminar el producto')
    }
  }

  const handleEditChange = (id, field, value) => {
    setEditingProducts({
      ...editingProducts,
      [id]: {
        ...editingProducts[id],
        [field]: value
      }
    })
  }

  const handleSearch = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    setCurrentPage(1)
    if (value.trim()) {
      fetchSearchResults(value)
    } else {
      fetchProducts()
    }
  }

  const filteredProducts = products

  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2))
    let end = Math.min(totalPages, start + maxVisible - 1)
    
    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1)
    }
    
    for (let i = start; i <= end; i++) {
      pages.push(i)
    }
    return pages
  }

  // Obtener color de categoría
  const getCategoriaColor = (categoria) => {
    const colores = {
      'Bombas': 'bg-blue-100 text-blue-700',
      'Filtros': 'bg-green-100 text-green-700',
      'Cloradores': 'bg-purple-100 text-purple-700',
      'Accesorios': 'bg-yellow-100 text-yellow-700',
      'Productos Químicos': 'bg-red-100 text-red-700',
      'Iluminación': 'bg-indigo-100 text-indigo-700',
      'Limpieza': 'bg-teal-100 text-teal-700',
      'Repuestos': 'bg-violet-100 text-violet-700',
      'Tuberías': 'bg-gray-100 text-gray-700',
      'Válvulas': 'bg-orange-100 text-orange-700',
      'Otros': 'bg-slate-100 text-slate-700'
    }
    return colores[categoria] || 'bg-gray-100 text-gray-700'
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">📦 Inventario</h1>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition duration-300 text-sm"
        >
          <Plus size={18} />
          Agregar Producto
        </button>
      </div>

      {/* Configuración Tipo de Cambio */}
      <div className="bg-gray-50 p-3 sm:p-4 rounded-lg mb-4 sm:mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 flex-wrap">
        <Settings className="text-gray-600 flex-shrink-0" size={18} />
        <label className="text-xs sm:text-sm font-medium text-gray-700">Tipo de cambio USD → BOB:</label>
        <input
          type="number"
          value={exchangeRate}
          onChange={(e) => setExchangeRate(parseFloat(e.target.value) || 0)}
          className="w-full sm:w-32 px-3 py-1.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          step="0.01"
          min="0.01"
        />
        <button
          onClick={() => {
            const newRate = parseFloat(exchangeRate)
            if (newRate > 0) {
              updateExchangeRate(newRate)
            } else {
              alert('Ingrese un valor válido')
            }
          }}
          className="w-full sm:w-auto px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300 text-sm"
        >
          Guardar
        </button>
        <span className="text-xs text-gray-500">
          (Valor actual: {exchangeRate})
        </span>
      </div>

      {/* Formulario Agregar Producto */}
      {showAddForm && (
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-4 sm:mb-6 border border-cyan-100">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 text-gray-800">➕ Agregar Nuevo Producto</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            {/* Nombre */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Nombre del producto <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ej: Aspiradora 8 ruedas"
                value={newProduct.nombre}
                onChange={(e) => setNewProduct({ ...newProduct, nombre: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Categoría */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Categoría
              </label>
              <select
                value={newProduct.categoria}
                onChange={(e) => setNewProduct({ ...newProduct, categoria: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">Seleccionar categoría</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            
            {/* Marca */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Marca
              </label>
              <input
                type="text"
                placeholder="Ej: Vulcano, Pentair, etc."
                value={newProduct.marca}
                onChange={(e) => setNewProduct({ ...newProduct, marca: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
              />
            </div>

            {/* Origen */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                País de Origen
              </label>
              <select
                value={newProduct.origen}
                onChange={(e) => setNewProduct({ ...newProduct, origen: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent bg-white text-sm"
              >
                <option value="">Seleccionar origen</option>
                {paises.map(pais => (
                  <option key={pais} value={pais}>{pais}</option>
                ))}
              </select>
            </div>
            
            {/* Cantidad */}
            <div>
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                placeholder="Cantidad"
                value={newProduct.cantidad}
                onChange={(e) => setNewProduct({ ...newProduct, cantidad: parseInt(e.target.value) || 1 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                min="1"
              />
            </div>

            {/* Precio */}
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                Precio en USD
              </label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                <input
                  type="number"
                  placeholder="0.00"
                  value={newProduct.precio_usd}
                  onChange={(e) => setNewProduct({ ...newProduct, precio_usd: parseFloat(e.target.value) || 0 })}
                  className="w-full sm:w-1/3 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-sm"
                  min="0.01"
                  step="0.01"
                />
                {newProduct.precio_usd > 0 && (
                  <span className="text-xs sm:text-sm text-gray-500">
                    ≈ Bs. {(newProduct.precio_usd * exchangeRate).toFixed(2)}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Botones */}
          <div className="mt-4 sm:mt-6 flex flex-col sm:flex-row gap-3 border-t pt-4">
            <button
              onClick={addProduct}
              className="w-full sm:w-auto px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition duration-300 flex items-center justify-center gap-2 text-sm"
            >
              <Plus size={16} />
              Guardar Producto
            </button>
            <button
              onClick={() => setShowAddForm(false)}
              className="w-full sm:w-auto px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition duration-300 text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Buscador */}
      <div className="relative mb-4 sm:mb-6">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          placeholder="Buscar por nombre, categoría, marca o país de origen"
          value={searchTerm}
          onChange={handleSearch}
          className="w-full pl-9 sm:pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
        />
      </div>

      {/* Tabla de Productos */}
      {loading ? (
        <div className="text-center py-8 text-gray-600">Cargando productos...</div>
      ) : filteredProducts.length > 0 ? (
        <>
          <div className="bg-white rounded-xl shadow-md overflow-hidden inventory-table">
            {/* Tabla Desktop */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Producto</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Categoría</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Marca / Origen</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Cantidad</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio USD</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Precio BOB</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.map((product) => {
                    const isEditing = editingProducts[product.id] !== undefined
                    const editValues = editingProducts[product.id] || product
                    
                    return (
                      <tr key={product.id} className="border-t hover:bg-gray-50">
                        {/* ✅ Nombre - Ahora editable */}
                        <td className="px-4 py-3 text-sm">
                          {isEditing ? (
                            <input
                              type="text"
                              value={editValues.nombre || ''}
                              onChange={(e) => handleEditChange(product.id, 'nombre', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                              placeholder="Nombre"
                            />
                          ) : (
                            <span className="text-gray-800">{product.nombre}</span>
                          )}
                        </td>
                        
                        {/* Categoría */}
                        <td className="px-4 py-3 text-sm">
                          {isEditing ? (
                            <select
                              value={editValues.categoria || ''}
                              onChange={(e) => handleEditChange(product.id, 'categoria', e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
                            >
                              <option value="">Sin categoría</option>
                              {categorias.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          ) : (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${getCategoriaColor(product.categoria)}`}>
                              {product.categoria || 'Sin categoría'}
                            </span>
                          )}
                        </td>
                        
                        {/* Marca / Origen */}
                        <td className="px-4 py-3 text-sm">
                          {isEditing ? (
                            <div className="flex flex-col gap-1">
                              <input
                                type="text"
                                value={editValues.marca || ''}
                                onChange={(e) => handleEditChange(product.id, 'marca', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                                placeholder="Marca"
                              />
                              <select
                                value={editValues.origen || ''}
                                onChange={(e) => handleEditChange(product.id, 'origen', e.target.value)}
                                className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
                              >
                                <option value="">Origen</option>
                                {paises.map(pais => (
                                  <option key={pais} value={pais}>{pais}</option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <div>
                              {product.marca ? (
                                <span className="font-medium text-gray-800">{product.marca}</span>
                              ) : (
                                <span className="text-gray-400 text-sm">Sin marca</span>
                              )}
                              {product.origen && (
                                <span className="text-xs text-gray-500 ml-1">({product.origen})</span>
                              )}
                            </div>
                          )}
                        </td>
                        
                        {/* Cantidad */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.cantidad}
                              onChange={(e) => handleEditChange(product.id, 'cantidad', parseInt(e.target.value) || 1)}
                              className="w-20 text-right px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                              min="1"
                            />
                          ) : (
                            <span className="text-sm text-gray-800">{product.cantidad}</span>
                          )}
                        </td>
                        
                        {/* Precio USD */}
                        <td className="px-4 py-3 text-right">
                          {isEditing ? (
                            <input
                              type="number"
                              value={editValues.precio_usd}
                              onChange={(e) => handleEditChange(product.id, 'precio_usd', parseFloat(e.target.value) || 0)}
                              className="w-24 text-right px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                              min="0.01"
                              step="0.01"
                            />
                          ) : (
                            <span className="text-sm text-gray-800">${product.precio_usd?.toFixed(2)}</span>
                          )}
                        </td>
                        
                        {/* Precio BOB */}
                        <td className="px-4 py-3 text-right">
                          <span className="text-sm text-gray-800">
                            Bs. {isEditing ? (editValues.precio_usd * exchangeRate).toFixed(2) : product.precio_bob?.toFixed(2)}
                          </span>
                        </td>
                        
                        {/* Acciones */}
                        <td className="px-4 py-3 text-center">
                          <div className="flex justify-center gap-2">
                            {isEditing ? (
                              <button
                                onClick={() => {
                                  const updates = {
                                    nombre: editValues.nombre,
                                    cantidad: editValues.cantidad,
                                    precio_usd: editValues.precio_usd,
                                    categoria: editValues.categoria || null,
                                    marca: editValues.marca || null,
                                    origen: editValues.origen || null
                                  }
                                  updateProduct(product.id, updates)
                                }}
                                className="text-green-600 hover:text-green-800 transition duration-200 p-1"
                              >
                                <Save size={18} />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingProducts({
                                    ...editingProducts,
                                    [product.id]: { ...product }
                                  })
                                }}
                                className="text-blue-600 hover:text-blue-800 transition duration-200 p-1"
                              >
                                ✏️
                              </button>
                            )}
                            <button
                              onClick={() => deleteProduct(product.id, product.nombre)}
                              className="text-red-600 hover:text-red-800 transition duration-200 p-1"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Cards Mobile */}
            <div className="md:hidden divide-y divide-gray-100">
              {filteredProducts.map((product) => {
                const isEditing = editingProducts[product.id] !== undefined
                const editValues = editingProducts[product.id] || product
                
                return (
                  <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1 min-w-0 mr-2">
                        {/* ✅ Nombre editable en mobile */}
                        {isEditing ? (
                          <input
                            type="text"
                            value={editValues.nombre || ''}
                            onChange={(e) => handleEditChange(product.id, 'nombre', e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                            placeholder="Nombre"
                          />
                        ) : (
                          <p className="text-sm font-semibold text-gray-800 truncate">{product.nombre}</p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <span className={`px-2 py-0.5 text-[10px] rounded-full ${getCategoriaColor(product.categoria)}`}>
                            {product.categoria || 'Sin categoría'}
                          </span>
                          <span className="text-xs text-gray-500">
                            {product.marca || 'Sin marca'}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {isEditing ? (
                          <button
                            onClick={() => {
                              const updates = {
                                nombre: editValues.nombre,
                                cantidad: editValues.cantidad,
                                precio_usd: editValues.precio_usd,
                                categoria: editValues.categoria || null,
                                marca: editValues.marca || null,
                                origen: editValues.origen || null
                              }
                              updateProduct(product.id, updates)
                            }}
                            className="text-green-600 hover:text-green-800 p-1"
                          >
                            <Save size={18} />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setEditingProducts({
                                ...editingProducts,
                                [product.id]: { ...product }
                              })
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1"
                          >
                            ✏️
                          </button>
                        )}
                        <button
                          onClick={() => deleteProduct(product.id, product.nombre)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-center">
                      <div>
                        <label className="text-xs text-gray-500 block">Cantidad</label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.cantidad}
                            onChange={(e) => handleEditChange(product.id, 'cantidad', parseInt(e.target.value) || 1)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                            min="1"
                          />
                        ) : (
                          <p className="text-sm font-medium">{product.cantidad}</p>
                        )}
                      </div>
                      <div>
                        <label className="text-xs text-gray-500 block">Precio USD</label>
                        {isEditing ? (
                          <input
                            type="number"
                            value={editValues.precio_usd}
                            onChange={(e) => handleEditChange(product.id, 'precio_usd', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                            min="0.01"
                            step="0.01"
                          />
                        ) : (
                          <p className="text-sm font-medium">${product.precio_usd?.toFixed(2)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <label className="text-xs text-gray-500 block">Precio BOB</label>
                        <p className="text-sm font-bold text-gray-800">
                          Bs. {isEditing ? (editValues.precio_usd * exchangeRate).toFixed(2) : product.precio_bob?.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    {isEditing && (
                      <div className="mt-2 flex flex-col gap-2">
                        <select
                          value={editValues.categoria || ''}
                          onChange={(e) => handleEditChange(product.id, 'categoria', e.target.value)}
                          className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
                        >
                          <option value="">Sin categoría</option>
                          {categorias.map(cat => (
                            <option key={cat} value={cat}>{cat}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={editValues.marca || ''}
                            onChange={(e) => handleEditChange(product.id, 'marca', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                            placeholder="Marca"
                          />
                          <select
                            value={editValues.origen || ''}
                            onChange={(e) => handleEditChange(product.id, 'origen', e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm bg-white"
                          >
                            <option value="">Origen</option>
                            {paises.map(pais => (
                              <option key={pais} value={pais}>{pais}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Paginación */}
          {totalPages > 1 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
              <div className="text-sm text-gray-600">
                Mostrando {(currentPage - 1) * productsPerPage + 1} - {Math.min(currentPage * productsPerPage, totalProducts)} de {totalProducts} productos
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  <ChevronLeft size={18} className="text-gray-600" />
                </button>
                
                {getPageNumbers().map((page) => (
                  <button
                    key={page}
                    onClick={() => handlePageChange(page)}
                    className={`px-3 py-1.5 rounded-lg transition duration-200 text-sm font-medium ${
                      currentPage === page
                        ? 'bg-cyan-600 text-white shadow-md'
                        : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    {page}
                  </button>
                ))}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                >
                  <ChevronRight size={18} className="text-gray-600" />
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8 text-gray-600">
          {searchTerm ? 'No se encontraron productos con esa búsqueda.' : 'No hay productos en el inventario.'}
        </div>
      )}
    </div>
  )
}

export default Inventory