import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { 
  Plus, Trash2, Save, DollarSign, QrCode, X, ShoppingBag
} from 'lucide-react'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const Ventas = () => {
  const [cart, setCart] = useState([])
  const [inventoryProducts, setInventoryProducts] = useState([])
  const [clienteNombre, setClienteNombre] = useState('')
  const [clienteCiNit, setClienteCiNit] = useState('')
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    fetchInventory()
  }, [])

  const fetchInventory = async () => {
    try {
      const { data, error } = await supabase
        .from('inventario')
        .select('*')
        .order('nombre')
      
      if (error) throw error
      setInventoryProducts(data || [])
    } catch (error) {
      console.error('Error fetching inventory:', error)
    }
  }

  const addToCart = () => {
    if (!selectedProduct) {
      alert('Por favor selecciona un producto')
      return
    }

    const product = inventoryProducts.find(p => p.id === selectedProduct)
    if (!product) return

    if (product.cantidad < quantity) {
      alert(`Stock insuficiente. Disponible: ${product.cantidad}`)
      return
    }

    const existingItem = cart.find(p => p.id === product.id)
    
    if (existingItem) {
      const newQuantity = existingItem.cantidad + quantity
      if (product.cantidad < newQuantity) {
        alert(`Stock insuficiente. Disponible: ${product.cantidad}`)
        return
      }
      setCart(cart.map(p => 
        p.id === product.id 
          ? { ...p, cantidad: newQuantity, total: newQuantity * p.precio_unitario }
          : p
      ))
    } else {
      const newItem = {
        id: product.id,
        nombre: product.nombre,
        marca: product.marca,
        origen: product.origen,
        cantidad: quantity,
        precio_unitario: product.precio_bob || product.precio_usd * 6.96,
        total: quantity * (product.precio_bob || product.precio_usd * 6.96),
        stock_actual: product.cantidad
      }
      setCart([...cart, newItem])
    }

    setSelectedProduct('')
    setQuantity(1)
  }

  const removeFromCart = (id) => {
    setCart(cart.filter(p => p.id !== id))
  }

  const updateCartQuantity = (id, newQuantity) => {
    const product = inventoryProducts.find(p => p.id === id)
    if (product && product.cantidad < newQuantity) {
      alert(`Stock insuficiente. Disponible: ${product.cantidad}`)
      return
    }
    
    setCart(cart.map(p => {
      if (p.id === id) {
        return {
          ...p,
          cantidad: newQuantity,
          total: newQuantity * p.precio_unitario
        }
      }
      return p
    }))
  }

  const total = cart.reduce((sum, p) => sum + p.total, 0)

  const generateInvoiceNumber = () => {
    const date = new Date()
    const year = date.getFullYear().toString().slice(-2)
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `FAC-${year}${month}${day}-${String(Date.now()).slice(-4)}`
  }

  const saveVenta = async () => {
  if (!clienteNombre.trim()) {
    alert('Por favor ingresa el nombre del cliente')
    return
  }

  if (cart.length === 0) {
    alert('Por favor agrega al menos un producto')
    return
  }

  const numeroFactura = generateInvoiceNumber()

  // ✅ Asegurar que los datos estén completos
  const ventaData = {
    numero_factura: numeroFactura,
    cliente_nombre: clienteNombre,
    cliente_ci_nit: clienteCiNit || null, // ✅ null en lugar de ''
    fecha_venta: new Date().toISOString(),
    productos: cart.map(p => ({
      id: p.id,
      nombre: p.nombre,
      marca: p.marca || null,
      origen: p.origen || null,
      cantidad: p.cantidad,
      precio_unitario: p.precio_unitario,
      total: p.total
    })),
    subtotal: total,
    iva: 0,
    total: total,
    metodo_pago: metodoPago,
    estado: 'completada'
    // ✅ Eliminar 'creado_por' si no existe en la tabla
  }

  try {
    setLoading(true)
    
    console.log('📝 Guardando venta:', ventaData)
    
    const { data, error } = await supabase
      .from('ventas')
      .insert([ventaData])
      .select()
    
    if (error) {
      console.error('❌ Error de Supabase:', error)
      throw error
    }
    
    console.log('✅ Venta guardada:', data)
    
    // Actualizar stock de cada producto
    for (const item of cart) {
      // ✅ Buscar el producto en inventoryProducts
      const product = inventoryProducts.find(p => p.id === item.id)
      if (product) {
        const newStock = Math.max(0, product.cantidad - item.cantidad)
        
        const { error: updateError } = await supabase
          .from('inventario')
          .update({ cantidad: newStock })
          .eq('id', item.id)
        
        if (updateError) {
          console.error('❌ Error actualizando stock:', updateError)
          throw updateError
        }
      }
    }

    // ✅ Mostrar mensaje de éxito
    alert(`✅ Venta registrada exitosamente\nFactura: ${numeroFactura}`)
    
    // Generar recibo (si la función existe)
    if (typeof generateReceipt === 'function') {
      generateReceipt(data[0])
    }
    
    // Limpiar carrito
    setCart([])
    setClienteNombre('')
    setClienteCiNit('')
    
    // Recargar inventario
    await fetchInventory()
    
  } catch (error) {
    console.error('❌ Error al guardar venta:', error)
    alert('❌ Error al guardar la venta: ' + (error.message || 'Error desconocido'))
  } finally {
    setLoading(false)
  }
}

  const generateReceipt = (venta) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      
      doc.setFontSize(24)
      doc.setTextColor(0, 150, 200)
      doc.setFont('helvetica', 'bold')
      doc.text('Aqualaars', pageWidth / 2, 25, { align: 'center' })
      
      doc.setFontSize(10)
      doc.setTextColor(100, 150, 200)
      doc.setFont('helvetica', 'normal')
      doc.text('Todo para su piscina', pageWidth / 2, 33, { align: 'center' })
      
      doc.setFontSize(16)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text('COMPROBANTE DE VENTA', pageWidth / 2, 45, { align: 'center' })
      
      doc.setDrawColor(0, 150, 200)
      doc.setLineWidth(0.5)
      doc.line(pageWidth / 2 - 60, 50, pageWidth / 2 + 60, 50)
      
      let yPos = 60
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(50, 50, 50)
      
      doc.text(`Factura: ${venta.numero_factura}`, 20, yPos)
      doc.text(`Fecha: ${format(new Date(venta.fecha_venta), 'dd/MM/yyyy HH:mm')}`, pageWidth - 20, yPos, { align: 'right' })
      yPos += 8
      
      doc.text(`Cliente: ${venta.cliente_nombre}`, 20, yPos)
      if (venta.cliente_ci_nit) {
        doc.text(`CI/NIT: ${venta.cliente_ci_nit}`, pageWidth - 20, yPos, { align: 'right' })
      }
      yPos += 8
      
      const metodoPagoText = venta.metodo_pago === 'efectivo' ? 'EFECTIVO' : 'QR'
      doc.text(`Método de pago: ${metodoPagoText}`, 20, yPos)
      yPos += 12
      
      const tableData = venta.productos.map(p => [
        p.nombre,
        p.cantidad.toString(),
        `Bs. ${p.precio_unitario.toFixed(2)}`,
        `Bs. ${p.total.toFixed(2)}`
      ])
      
      doc.autoTable({
        startY: yPos,
        head: [['Producto', 'Cant.', 'Precio Unit.', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { 
          fillColor: [0, 150, 200],
          textColor: [255, 255, 255],
          fontSize: 10,
          fontStyle: 'bold'
        },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 70 },
          1: { cellWidth: 25, halign: 'center' },
          2: { cellWidth: 45, halign: 'right' },
          3: { cellWidth: 45, halign: 'right' }
        }
      })
      
      const finalY = doc.lastAutoTable.finalY + 10
      
      doc.setFontSize(14)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 150, 200)
      doc.text(`TOTAL: Bs. ${venta.total.toFixed(2)}`, pageWidth - 20, finalY, { align: 'right' })
      
      const footerY = doc.internal.pageSize.getHeight() - 20
      doc.setDrawColor(200, 215, 230)
      doc.setLineWidth(0.3)
      doc.line(20, footerY - 5, pageWidth - 20, footerY - 5)
      
      doc.setFontSize(11)
      doc.setTextColor(0, 150, 200)
      doc.setFont('helvetica', 'bold')
      doc.text('Aqualaars', pageWidth / 2, footerY + 5, { align: 'center' })
      
      doc.setFontSize(8)
      doc.setTextColor(150, 180, 200)
      doc.setFont('helvetica', 'normal')
      doc.text('Todo para su piscina', pageWidth / 2, footerY + 13, { align: 'center' })
      doc.text('¡Gracias por su compra!', pageWidth / 2, footerY + 21, { align: 'center' })
      
      doc.save(`Recibo_${venta.numero_factura}.pdf`)
      
    } catch (error) {
      console.error('Error generando recibo:', error)
    }
  }

  const clearCart = () => {
    if (cart.length === 0) return
    if (confirm('¿Estás seguro de limpiar el carrito?')) {
      setCart([])
    }
  }

return (
  <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
    {/* Header */}
    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
      <h1 className="text-xl sm:text-2xl font-bold text-gray-800">💰 Nueva Venta</h1>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      {/* Panel izquierdo */}
      <div className="lg:col-span-2 space-y-4 sm:space-y-6">
        {/* Datos del Cliente */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Datos del Cliente</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <input
              type="text"
              placeholder="Nombre del cliente *"
              value={clienteNombre}
              onChange={(e) => setClienteNombre(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
            <input
              type="text"
              placeholder="CI o NIT"
              value={clienteCiNit}
              onChange={(e) => setClienteCiNit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
          </div>
        </div>

        {/* Agregar Productos */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Agregar Productos</h3>
          <div className="flex flex-col gap-3">
            <select
              value={selectedProduct}
              onChange={(e) => setSelectedProduct(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            >
              <option value="">Selecciona un producto</option>
              {inventoryProducts
                .filter(p => p.cantidad > 0)
                .map(p => {
                  let label = p.nombre
                  if (p.marca) label += ` - ${p.marca}`
                  if (p.origen) label += ` (${p.origen})`
                  label += ` (Stock: ${p.cantidad})`
                  return (
                    <option key={p.id} value={p.id}>
                      {label}
                    </option>
                  )
                })}
            </select>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                min="1"
              />
              <button
                onClick={addToCart}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition duration-300 flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={18} />
                Agregar al Carrito
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho - Carrito */}
      <div className="lg:col-span-1">
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md sticky top-4">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4 flex items-center gap-2">
            🛒 Carrito
            <span className="text-xs sm:text-sm text-gray-500 ml-auto">
              {cart.length} {cart.length === 1 ? 'producto' : 'productos'}
            </span>
          </h3>

          {cart.length === 0 ? (
            <div className="text-center py-6 sm:py-8 text-gray-500">
              <ShoppingBag className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No hay productos en el carrito</p>
            </div>
          ) : (
            <>
              <div className="max-h-60 sm:max-h-80 overflow-y-auto space-y-2 mb-4 pr-1">
                {cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg border">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0 mr-2">
                        <p className="font-medium text-sm truncate">{item.nombre}</p>
                        {item.marca && (
                          <p className="text-xs text-gray-500 truncate">
                            {item.marca} {item.origen && `(${item.origen})`}
                          </p>
                        )}
                        <p className="text-xs text-gray-400">Stock: {item.stock_actual}</p>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 flex-shrink-0"
                      >
                        <X size={16} />
                      </button>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <input
                        type="number"
                        value={item.cantidad}
                        onChange={(e) => updateCartQuantity(item.id, parseInt(e.target.value) || 1)}
                        className="w-14 text-center px-1 py-1 border border-gray-300 rounded text-sm"
                        min="1"
                      />
                      <span className="text-xs sm:text-sm text-gray-600">
                        x Bs. {item.precio_unitario.toFixed(2)}
                      </span>
                      <span className="text-xs sm:text-sm font-bold ml-auto">
                        Bs. {item.total.toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="border-t pt-3 sm:pt-4">
                <div className="flex justify-between text-base sm:text-lg font-bold text-cyan-600">
                  <span>Total:</span>
                  <span>Bs. {total.toFixed(2)}</span>
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-1">
                  Método de Pago
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMetodoPago('efectivo')}
                    className={`p-2 rounded-lg border text-xs sm:text-sm flex items-center justify-center gap-1 ${
                      metodoPago === 'efectivo'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <DollarSign size={16} />
                    Efectivo
                  </button>
                  <button
                    onClick={() => setMetodoPago('qr')}
                    className={`p-2 rounded-lg border text-xs sm:text-sm flex items-center justify-center gap-1 ${
                      metodoPago === 'qr'
                        ? 'border-cyan-500 bg-cyan-50 text-cyan-700'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <QrCode size={16} />
                    QR
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-2 mt-3 sm:mt-4">
                <button
                  onClick={clearCart}
                  className="w-full sm:flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-300 text-sm"
                >
                  Limpiar
                </button>
                <button
                  onClick={saveVenta}
                  disabled={cart.length === 0 || !clienteNombre.trim() || loading}
                  className="w-full sm:flex-1 bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 transition duration-300 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  <Save size={18} />
                  {loading ? 'Procesando...' : 'Registrar'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  </div>
);
}

export default Ventas