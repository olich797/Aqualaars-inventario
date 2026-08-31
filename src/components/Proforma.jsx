import React, { useState, useEffect, useRef } from 'react'
import { supabase } from '../services/supabase'
import { Plus, Trash2, Save, FileText, Search } from 'lucide-react'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const Proforma = () => {
  const [products, setProducts] = useState([])
  const [inventoryProducts, setInventoryProducts] = useState([])
  const [clientName, setClientName] = useState('')
  const [ciNit, setCiNit] = useState('')
  const [emissionDate, setEmissionDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [expirationDate, setExpirationDate] = useState(format(new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'))
  const [selectedProduct, setSelectedProduct] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [manualProduct, setManualProduct] = useState({ nombre: '', marca: '', origen: '', precio: 0, cantidad: 1 })
  const [exchangeRate, setExchangeRate] = useState(6.96)
  
  // Estados para el buscador con autocompletado
  const [searchTerm, setSearchTerm] = useState('')
  const [showDropdown, setShowDropdown] = useState(false)
  const [filteredProducts, setFilteredProducts] = useState([])
  const dropdownRef = useRef(null)

  useEffect(() => {
    fetchInventory()
    fetchExchangeRate()
  }, [])

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
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

  // Filtrar productos por búsqueda (incluye categoría)
  const handleSearchChange = (e) => {
    const value = e.target.value
    setSearchTerm(value)
    setSelectedProduct('')
    
    if (value.trim() === '') {
      setFilteredProducts([])
      setShowDropdown(false)
      return
    }

    const filtered = inventoryProducts
      .filter(p => p.cantidad > 0)
      .filter(p => 
        p.nombre.toLowerCase().includes(value.toLowerCase()) ||
        (p.categoria && p.categoria.toLowerCase().includes(value.toLowerCase())) ||
        (p.marca && p.marca.toLowerCase().includes(value.toLowerCase())) ||
        (p.origen && p.origen.toLowerCase().includes(value.toLowerCase()))
      )
      .slice(0, 10)
    
    setFilteredProducts(filtered)
    setShowDropdown(filtered.length > 0)
  }

  // Seleccionar un producto del dropdown
  const selectProduct = (product) => {
    setSelectedProduct(product.id)
    setSearchTerm(`${product.nombre} ${product.marca ? `- ${product.marca}` : ''} ${product.origen ? `(${product.origen})` : ''}`)
    setShowDropdown(false)
  }

  const addFromInventory = () => {
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

    const newProduct = {
      id: Date.now(),
      nombre: product.nombre,
      marca: product.marca || null,
      origen: product.origen || null,
      categoria: product.categoria || null,
      cantidad: quantity,
      precio_unitario: product.precio_bob || product.precio_usd * exchangeRate,
      precio_total: quantity * (product.precio_bob || product.precio_usd * exchangeRate),
      inventory_id: product.id
    }

    setProducts([...products, newProduct])
    setSelectedProduct('')
    setSearchTerm('')
    setQuantity(1)
    setShowDropdown(false)
  }

  const addManualProduct = () => {
    if (!manualProduct.nombre.trim() || manualProduct.precio <= 0) {
      alert('Por favor completa todos los campos del producto manual')
      return
    }

    const newProduct = {
      id: Date.now(),
      nombre: manualProduct.nombre,
      marca: manualProduct.marca || null,
      origen: manualProduct.origen || null,
      cantidad: manualProduct.cantidad,
      precio_unitario: manualProduct.precio,
      precio_total: manualProduct.cantidad * manualProduct.precio,
      isManual: true
    }

    setProducts([...products, newProduct])
    setManualProduct({ nombre: '', marca: '', origen: '', precio: 0, cantidad: 1 })
  }

  const removeProduct = (id) => {
    setProducts(products.filter(p => p.id !== id))
  }

  const updateProductQuantity = (id, newQuantity) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          cantidad: newQuantity,
          precio_total: newQuantity * p.precio_unitario
        }
      }
      return p
    }))
  }

  const updateProductPrice = (id, newPrice) => {
    setProducts(products.map(p => {
      if (p.id === id) {
        return {
          ...p,
          precio_unitario: newPrice,
          precio_total: p.cantidad * newPrice
        }
      }
      return p
    }))
  }

  const totalProforma = products.reduce((sum, p) => sum + p.precio_total, 0)

  // 📄 Función para generar PDF con diseño profesional
  const generatePDF = (proforma) => {
    try {
      console.log('📄 Generando PDF con datos:', proforma)
      
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // === ENCABEZADO ===
      doc.setFontSize(38)
      doc.setTextColor(0, 150, 200)
      doc.setFont('helvetica', 'bold')
      doc.text('Aqualaars', pageWidth / 2, 28, { align: 'center' })
      
      doc.setFontSize(10)
      doc.setTextColor(100, 150, 200)
      doc.setFont('helvetica', 'normal')
      doc.text('Todo para su piscina', pageWidth / 2, 35, { align: 'center' })
      
      doc.setFontSize(22)
      doc.setTextColor(0, 0, 0)
      doc.setFont('helvetica', 'bold')
      doc.text('PROFORMA', pageWidth / 2, 52, { align: 'center' })
      
      doc.setDrawColor(0, 150, 200)
      doc.setLineWidth(0.8)
      doc.line(pageWidth / 2 - 60, 59, pageWidth / 2 + 60, 59)
      
      // === DATOS DEL CLIENTE ===
      let yPos = 76
      
      const nombreCliente = proforma.nombre_cliente || clientName || 'Cliente'
      const ciNitValue = proforma.ci_nit || ciNit || 'N/A'
      const fechaEmision = proforma.fecha_emision || emissionDate
      const fechaVencimiento = proforma.fecha_vencimiento || expirationDate
      
      doc.setFillColor(245, 250, 255)
      doc.roundedRect(20, yPos - 5, pageWidth - 40, 38, 3, 3, 'F')
      doc.roundedRect(20, yPos - 5, pageWidth - 40, 38, 3, 3, 'S')
      
      doc.setFontSize(8)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 150, 200)
      doc.text('INFORMACIÓN DEL CLIENTE', 25, yPos + 4)
      
      doc.setFontSize(9)
      doc.setTextColor(50, 50, 50)
      doc.setFont('helvetica', 'normal')
      doc.text(`Cliente: ${nombreCliente}`, 25, yPos + 15)
      doc.text(`CI/NIT: ${ciNitValue}`, 25, yPos + 26)
      
      doc.text(`Emisión: ${format(new Date(fechaEmision), 'dd/MM/yyyy')}`, pageWidth - 25, yPos + 15, { align: 'right' })
      doc.text(`Vencimiento: ${format(new Date(fechaVencimiento), 'dd/MM/yyyy')}`, pageWidth - 25, yPos + 26, { align: 'right' })
      
      yPos += 48
      
      // === TABLA DE PRODUCTOS ===
      const productosLista = proforma.productos || products
      
      if (!productosLista || productosLista.length === 0) {
        doc.text('No hay productos en esta proforma', pageWidth / 2, yPos + 20, { align: 'center' })
        doc.save(`Proforma_${proforma.id || Date.now()}.pdf`)
        return
      }
      
      const tableData = productosLista.map(p => [
        p.nombre || 'Producto',
        p.marca ? `${p.marca}${p.origen ? ` (${p.origen})` : ''}` : (p.origen ? `(${p.origen})` : 'Sin marca'),
        (p.cantidad || 0).toString(),
        `Bs. ${(p.precio_unitario || 0).toFixed(2)}`,
        `Bs. ${(p.precio_total || 0).toFixed(2)}`
      ])
      
      const total = proforma.total || totalProforma || tableData.reduce((sum, row) => sum + parseFloat(row[4].replace('Bs. ', '')), 0)
      
      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: yPos,
          head: [['Producto', 'Marca / Origen', 'Cant.', 'Precio Unit.', 'Precio Total']],
          body: tableData,
          theme: 'striped',
          headStyles: { 
            fillColor: [0, 150, 200],
            textColor: [255, 255, 255],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'center',
            cellPadding: 5
          },
          styles: { 
            fontSize: 9,
            cellPadding: 5,
            valign: 'middle'
          },
          columnStyles: {
            0: { cellWidth: 40, halign: 'left' },
            1: { cellWidth: 45, halign: 'left' },
            2: { cellWidth: 20, halign: 'center' },
            3: { cellWidth: 35, halign: 'right' },
            4: { cellWidth: 35, halign: 'right' }
          },
          alternateRowStyles: {
            fillColor: [248, 252, 255]
          },
          margin: { left: 20, right: 20 },
          tableWidth: pageWidth - 40
        })
        
        // === TOTAL ===
        const finalY = doc.lastAutoTable.finalY + 12
        
        doc.setDrawColor(0, 150, 200)
        doc.setLineWidth(0.5)
        doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY)
        
        doc.setFontSize(16)
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(0, 150, 200)
        doc.text(`TOTAL: Bs. ${total.toFixed(2)}`, pageWidth / 2, finalY + 10, { align: 'center' })
        
        // === PIE DE PÁGINA ===
        const footerY = pageHeight - 20
        
        doc.setDrawColor(200, 215, 230)
        doc.setLineWidth(0.3)
        doc.line(20, footerY - 3, pageWidth - 20, footerY - 3)
        
        doc.setFontSize(13)
        doc.setTextColor(0, 150, 200)
        doc.setFont('helvetica', 'bold')
        doc.text('Aqualaars', pageWidth / 2, footerY + 6, { align: 'center' })
        
        doc.setFontSize(8)
        doc.setTextColor(150, 180, 200)
        doc.setFont('helvetica', 'normal')
        doc.text('Todo para su piscina', pageWidth / 2, footerY + 15, { align: 'center' })
        
        const proformaId = proforma.id || Date.now().toString()
        doc.setFontSize(7)
        doc.setTextColor(180, 180, 180)
        doc.text(`ID: ${proformaId.substring(0, 8)}`, pageWidth - 20, footerY + 6, { align: 'right' })
        doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, footerY + 6, { align: 'left' })
        
      } else {
        // Fallback sin autoTable
        doc.setFontSize(10)
        doc.setFont('helvetica', 'bold')
        doc.text('Producto', 20, yPos)
        doc.text('Marca/Origen', 65, yPos)
        doc.text('Cant.', 110, yPos)
        doc.text('Precio Unit.', 130, yPos)
        doc.text('Precio Total', 160, yPos)
        yPos += 5
        doc.line(20, yPos, 190, yPos)
        yPos += 5
        
        doc.setFont('helvetica', 'normal')
        productosLista.forEach((p) => {
          if (yPos > 270) {
            doc.addPage()
            yPos = 20
          }
          doc.text(p.nombre || 'Producto', 20, yPos)
          const marcaText = p.marca ? `${p.marca}${p.origen ? ` (${p.origen})` : ''}` : (p.origen ? `(${p.origen})` : 'Sin marca')
          doc.text(marcaText, 65, yPos)
          doc.text((p.cantidad || 0).toString(), 110, yPos)
          doc.text(`Bs. ${(p.precio_unitario || 0).toFixed(2)}`, 130, yPos)
          doc.text(`Bs. ${(p.precio_total || 0).toFixed(2)}`, 160, yPos)
          yPos += 8
        })
        
        yPos += 10
        doc.setFontSize(14)
        doc.setFont('helvetica', 'bold')
        doc.text(`Total: Bs. ${(total || 0).toFixed(2)}`, 160, yPos)
      }
      
      const fileName = `Proforma_${proforma.id || Date.now()}.pdf`
      doc.save(fileName)
      console.log('✅ PDF generado y guardado como:', fileName)
      
    } catch (error) {
      console.error('❌ Error generando PDF:', error)
      throw new Error('Error al generar el PDF: ' + error.message)
    }
  }

  // 💾 Función para guardar proforma
  const saveProforma = async () => {
    if (!clientName.trim()) {
      alert('Por favor ingresa el nombre del cliente')
      return
    }

    if (products.length === 0) {
      alert('Por favor agrega al menos un producto')
      return
    }

    const proformaData = {
      nombre_cliente: clientName,
      ci_nit: ciNit || '',
      fecha_emision: emissionDate,
      fecha_vencimiento: expirationDate,
      productos: products.map(p => ({
        nombre: p.nombre,
        marca: p.marca || null,
        origen: p.origen || null,
        cantidad: p.cantidad,
        precio_unitario: p.precio_unitario,
        precio_total: p.precio_total
      })),
      total: totalProforma,
      created_at: new Date().toISOString()
    }

    try {
      console.log('📝 Guardando proforma...', proformaData)
      
      const { data, error } = await supabase
        .from('proformas')
        .insert([proformaData])
        .select()
      
      if (error) {
        console.error('❌ Error de Supabase:', error)
        throw error
      }
      
      if (!data || data.length === 0) {
        throw new Error('No se recibió respuesta de la base de datos')
      }
      
      const proformaGuardada = data[0]
      console.log('✅ Proforma guardada:', proformaGuardada)
      
      alert(`✅ Proforma guardada exitosamente con ID: ${proformaGuardada.id}`)
      
      try {
        const pdfData = {
          ...proformaGuardada,
          productos: proformaGuardada.productos || products
        }
        generatePDF(pdfData)
      } catch (pdfError) {
        console.error('❌ Error generando PDF:', pdfError)
        alert('⚠️ La proforma se guardó correctamente, pero hubo un error al generar el PDF.\n\nPuedes descargarlo desde la sección de Reportes.')
      }
      
      setProducts([])
      setClientName('')
      setCiNit('')
      
    } catch (error) {
      console.error('❌ Error al guardar proforma:', error)
      alert('❌ Error al guardar la proforma: ' + (error.message || 'Error desconocido'))
    }
  }

  const clearProforma = () => {
    if (products.length === 0) return
    if (confirm('¿Estás seguro de limpiar todos los productos de la proforma?')) {
      setProducts([])
    }
  }

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">📝 Generar Proforma</h1>
      </div>

      {/* Datos del Cliente */}
      <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-4 sm:mb-6">
        <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Datos del Cliente</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <input
            type="text"
            placeholder="Nombre del Cliente"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
          <input
            type="text"
            placeholder="CI o NIT"
            value={ciNit}
            onChange={(e) => setCiNit(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
          <input
            type="date"
            value={emissionDate}
            onChange={(e) => setEmissionDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
          <input
            type="date"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
          />
        </div>
      </div>

      {/* Agregar Productos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        {/* Desde Inventario con buscador */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Seleccionar del Inventario</h3>
          <div className="space-y-3">
            {/* Buscador con autocompletado */}
            <div className="relative" ref={dropdownRef}>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                <input
                  type="text"
                  placeholder="Buscar por nombre, categoría, marca u origen..."
                  value={searchTerm}
                  onChange={handleSearchChange}
                  onFocus={() => {
                    if (searchTerm.trim() && filteredProducts.length > 0) {
                      setShowDropdown(true)
                    }
                  }}
                  className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                />
              </div>
              
              {/* Dropdown de resultados */}
              {showDropdown && filteredProducts.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {filteredProducts.map((product) => (
                    <button
                      key={product.id}
                      onClick={() => selectProduct(product)}
                      className="w-full px-4 py-2 text-left hover:bg-cyan-50 transition-colors flex justify-between items-center border-b border-gray-100 last:border-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-800">{product.nombre}</p>
                        <p className="text-xs text-gray-500">
                          {product.categoria && (
                            <span className="inline-block px-1.5 py-0.5 bg-cyan-100 text-cyan-700 rounded text-[10px] mr-1">
                              {product.categoria}
                            </span>
                          )}
                          {product.marca || 'Sin marca'} 
                          {product.origen && ` • ${product.origen}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-cyan-600">
                          Stock: {product.cantidad}
                        </p>
                        <p className="text-xs text-gray-500">
                          Bs. {(product.precio_bob || product.precio_usd * exchangeRate).toFixed(2)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                min="1"
              />
              <button
                onClick={addFromInventory}
                disabled={!selectedProduct}
                className={`flex-1 px-4 py-2 rounded-lg transition duration-300 flex items-center justify-center gap-2 text-sm ${
                  selectedProduct 
                    ? 'bg-cyan-600 text-white hover:bg-cyan-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>
          </div>
        </div>

        {/* Producto Manual */}
        <div className="bg-white p-4 sm:p-6 rounded-xl shadow-md">
          <h3 className="text-base sm:text-lg font-semibold mb-3 sm:mb-4">Agregar Producto Manual</h3>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre del producto"
              value={manualProduct.nombre}
              onChange={(e) => setManualProduct({ ...manualProduct, nombre: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
            />
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Marca"
                value={manualProduct.marca || ''}
                onChange={(e) => setManualProduct({ ...manualProduct, marca: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
              <input
                type="text"
                placeholder="Origen"
                value={manualProduct.origen || ''}
                onChange={(e) => setManualProduct({ ...manualProduct, origen: e.target.value })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="number"
                placeholder="Cantidad"
                value={manualProduct.cantidad}
                onChange={(e) => setManualProduct({ ...manualProduct, cantidad: parseInt(e.target.value) || 1 })}
                className="w-full sm:w-24 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                min="1"
              />
              <input
                type="number"
                placeholder="Precio BOB"
                value={manualProduct.precio}
                onChange={(e) => setManualProduct({ ...manualProduct, precio: parseFloat(e.target.value) || 0 })}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                min="0.01"
                step="0.01"
              />
              <button
                onClick={addManualProduct}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition duration-300 flex items-center justify-center gap-2 text-sm"
              >
                <Plus size={18} />
                Agregar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lista de Productos en la Proforma */}
      {products.length > 0 && (
        <div className="bg-white rounded-xl shadow-md overflow-hidden mt-4 sm:mt-6">
          {/* Tabla Desktop */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Producto</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-600">Marca / Origen</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Cantidad</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Precio Unitario</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">Precio Total</th>
                  <th className="px-4 py-3 text-center text-sm font-semibold text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-800">{product.nombre}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {product.marca ? (
                        <span className="font-medium">{product.marca}</span>
                      ) : (
                        <span className="text-gray-400">Sin marca</span>
                      )}
                      {product.origen && (
                        <span className="text-xs text-gray-500 ml-1">({product.origen})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="number"
                        value={product.cantidad}
                        onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value) || 1)}
                        className="w-20 text-center px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                        min="1"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <input
                        type="number"
                        value={product.precio_unitario}
                        onChange={(e) => updateProductPrice(product.id, parseFloat(e.target.value) || 0)}
                        className="w-28 text-right px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                        min="0.01"
                        step="0.01"
                      />
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-800">
                      Bs. {product.precio_total.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => removeProduct(product.id)}
                        className="text-red-600 hover:text-red-800 transition duration-200 p-1"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cards Mobile */}
          <div className="md:hidden divide-y divide-gray-100">
            {products.map((product) => (
              <div key={product.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-sm font-semibold text-gray-800 truncate">{product.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {product.marca ? product.marca : 'Sin marca'}
                      {product.origen && <span className="ml-1">({product.origen})</span>}
                    </p>
                  </div>
                  <button
                    onClick={() => removeProduct(product.id)}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2 items-center">
                  <div>
                    <label className="text-xs text-gray-500 block">Cantidad</label>
                    <input
                      type="number"
                      value={product.cantidad}
                      onChange={(e) => updateProductQuantity(product.id, parseInt(e.target.value) || 1)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      min="1"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block">Precio Unit.</label>
                    <input
                      type="number"
                      value={product.precio_unitario}
                      onChange={(e) => updateProductPrice(product.id, parseFloat(e.target.value) || 0)}
                      className="w-full px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-cyan-500 text-sm"
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  <div className="text-right">
                    <label className="text-xs text-gray-500 block">Total</label>
                    <p className="text-sm font-bold text-gray-800">
                      Bs. {product.precio_total.toFixed(2)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Total y Botones */}
          <div className="px-4 sm:px-6 py-4 bg-gray-50 border-t flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4">
            <span className="text-base sm:text-lg font-bold text-gray-800">
              Total: Bs. {totalProforma.toFixed(2)}
            </span>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <button
                onClick={clearProforma}
                className="w-full sm:w-auto px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-300 text-sm"
              >
                🗑️ Limpiar
              </button>
              <button
                onClick={saveProforma}
                className="w-full sm:w-auto px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition duration-300 flex items-center justify-center gap-2 text-sm"
              >
                <Save size={18} />
                Guardar Proforma
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje cuando no hay productos */}
      {products.length === 0 && (
        <div className="bg-white rounded-xl shadow-md p-8 sm:p-12 text-center text-gray-600 mt-4 sm:mt-6">
          <p className="text-base sm:text-lg">No se han agregado productos a la proforma.</p>
          <p className="text-sm text-gray-400 mt-2">Selecciona productos del inventario o agrega manualmente.</p>
        </div>
      )}
    </div>
  )
}

export default Proforma