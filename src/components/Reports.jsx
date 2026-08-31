import React, { useState, useEffect } from 'react'
import { supabase } from '../services/supabase'
import { Search, FileText, Download, Trash2, ShoppingCart, ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { jsPDF } from 'jspdf'
import 'jspdf-autotable'

const Reports = () => {
  // Estado para pestañas
  const [activeTab, setActiveTab] = useState('proformas') // 'proformas' | 'ventas'
  
  // Estado para Proformas
  const [proformas, setProformas] = useState([])
  const [filteredProformas, setFilteredProformas] = useState([])
  const [loadingProformas, setLoadingProformas] = useState(false)
  const [searchName, setSearchName] = useState('')
  const [searchCi, setSearchCi] = useState('')
  const [selectedProforma, setSelectedProforma] = useState(null)
  
  // Estado para Ventas
  const [ventas, setVentas] = useState([])
  const [filteredVentas, setFilteredVentas] = useState([])
  const [loadingVentas, setLoadingVentas] = useState(false)
  const [searchVenta, setSearchVenta] = useState('')
  const [selectedVenta, setSelectedVenta] = useState(null)
  const [deletingId, setDeletingId] = useState(null)

  // Estados de paginación para Proformas
  const [currentPageProformas, setCurrentPageProformas] = useState(1)
  const [totalProformas, setTotalProformas] = useState(0)
  const [totalPagesProformas, setTotalPagesProformas] = useState(0)
  const itemsPerPage = 20

  // Estados de paginación para Ventas
  const [currentPageVentas, setCurrentPageVentas] = useState(1)
  const [totalVentas, setTotalVentas] = useState(0)
  const [totalPagesVentas, setTotalPagesVentas] = useState(0)

  // Cargar datos al montar
  useEffect(() => {
    if (activeTab === 'proformas') {
      fetchProformas()
    } else {
      fetchVentas()
    }
  }, [activeTab])

  useEffect(() => {
    if (activeTab === 'proformas') {
      fetchProformas()
    }
  }, [currentPageProformas])

  useEffect(() => {
    if (activeTab === 'ventas') {
      fetchVentas()
    }
  }, [currentPageVentas])

  useEffect(() => {
    filterProformas()
  }, [searchName, searchCi, proformas])

  useEffect(() => {
    filterVentas()
  }, [searchVenta, ventas])

  // ============ PROFORMAS ============
  const fetchProformas = async () => {
    setLoadingProformas(true)
    try {
      const from = (currentPageProformas - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('proformas')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      
      setProformas(data || [])
      setFilteredProformas(data || [])
      setTotalProformas(count || 0)
      setTotalPagesProformas(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching proformas:', error)
    } finally {
      setLoadingProformas(false)
    }
  }

  const fetchSearchProformas = async () => {
    setLoadingProformas(true)
    try {
      let query = supabase
        .from('proformas')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (searchName.trim()) {
        query = query.ilike('nombre_cliente', `%${searchName}%`)
      }

      if (searchCi.trim()) {
        query = query.ilike('ci_nit', `%${searchCi}%`)
      }

      const from = (currentPageProformas - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await query.range(from, to)
      
      if (error) throw error
      
      setProformas(data || [])
      setFilteredProformas(data || [])
      setTotalProformas(count || 0)
      setTotalPagesProformas(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error searching proformas:', error)
    } finally {
      setLoadingProformas(false)
    }
  }

  const filterProformas = () => {
    if (searchName.trim() || searchCi.trim()) {
      fetchSearchProformas()
    } else {
      setFilteredProformas(proformas)
    }
  }

  const viewProformaDetails = (proforma) => {
    setSelectedProforma(proforma)
  }

  // ============ VENTAS ============
  const fetchVentas = async () => {
    setLoadingVentas(true)
    try {
      const from = (currentPageVentas - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await supabase
        .from('ventas')
        .select('*', { count: 'exact' })
        .order('fecha_venta', { ascending: false })
        .range(from, to)
      
      if (error) throw error
      
      setVentas(data || [])
      setFilteredVentas(data || [])
      setTotalVentas(count || 0)
      setTotalPagesVentas(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error fetching ventas:', error)
    } finally {
      setLoadingVentas(false)
    }
  }

  const fetchSearchVentas = async () => {
    setLoadingVentas(true)
    try {
      let query = supabase
        .from('ventas')
        .select('*', { count: 'exact' })
        .order('fecha_venta', { ascending: false })

      if (searchVenta.trim()) {
        query = query.or(
          `cliente_nombre.ilike.%${searchVenta}%,` +
          `cliente_ci_nit.ilike.%${searchVenta}%`
        )
      }

      const from = (currentPageVentas - 1) * itemsPerPage
      const to = from + itemsPerPage - 1

      const { data, error, count } = await query.range(from, to)
      
      if (error) throw error
      
      setVentas(data || [])
      setFilteredVentas(data || [])
      setTotalVentas(count || 0)
      setTotalPagesVentas(Math.ceil((count || 0) / itemsPerPage))
    } catch (error) {
      console.error('Error searching ventas:', error)
    } finally {
      setLoadingVentas(false)
    }
  }

  const filterVentas = () => {
    if (searchVenta.trim()) {
      fetchSearchVentas()
    } else {
      setFilteredVentas(ventas)
    }
  }

  const viewVentaDetails = (venta) => {
    setSelectedVenta(venta)
  }

  // ============ PDF PROFORMA ============
  const downloadPDF = (proforma) => {
    try {
      const doc = new jsPDF('p', 'mm', 'a4')
      const pageWidth = doc.internal.pageSize.getWidth()
      const pageHeight = doc.internal.pageSize.getHeight()
      
      // Logo / Título
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
      
      let yPos = 76
      
      // Información del cliente
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
      doc.text(`Cliente: ${proforma.nombre_cliente || 'N/A'}`, 25, yPos + 15)
      doc.text(`CI/NIT: ${proforma.ci_nit || 'N/A'}`, 25, yPos + 26)
      
      doc.text(`Emisión: ${format(new Date(proforma.fecha_emision), 'dd/MM/yyyy')}`, pageWidth - 25, yPos + 15, { align: 'right' })
      doc.text(`Vencimiento: ${format(new Date(proforma.fecha_vencimiento), 'dd/MM/yyyy')}`, pageWidth - 25, yPos + 26, { align: 'right' })
      
      yPos += 48
      
      if (!proforma.productos || proforma.productos.length === 0) {
        doc.text('No hay productos en esta proforma', pageWidth / 2, yPos + 20, { align: 'center' })
        doc.save(`Proforma_${proforma.id}.pdf`)
        return
      }
      
      const tableData = proforma.productos.map(p => [
        p.nombre || 'Producto',
        p.marca ? `${p.marca}${p.origen ? ` (${p.origen})` : ''}` : (p.origen ? `(${p.origen})` : 'Sin marca'),
        (p.cantidad || 0).toString(),
        `Bs. ${(p.precio_unitario || 0).toFixed(2)}`,
        `Bs. ${(p.precio_total || 0).toFixed(2)}`
      ])
      
      const total = proforma.total || tableData.reduce((sum, row) => sum + parseFloat(row[4].replace('Bs. ', '')), 0)
      
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
          halign: 'center'
        },
        styles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 40, halign: 'left' },
          1: { cellWidth: 45, halign: 'left' },
          2: { cellWidth: 20, halign: 'center' },
          3: { cellWidth: 35, halign: 'right' },
          4: { cellWidth: 35, halign: 'right' }
        },
        margin: { left: 20, right: 20 },
        tableWidth: pageWidth - 40
      })
      
      const finalY = doc.lastAutoTable.finalY + 12
      
      doc.setDrawColor(0, 150, 200)
      doc.setLineWidth(0.5)
      doc.line(pageWidth / 2 - 40, finalY, pageWidth / 2 + 40, finalY)
      
      doc.setFontSize(16)
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(0, 150, 200)
      doc.text(`TOTAL: Bs. ${total.toFixed(2)}`, pageWidth / 2, finalY + 10, { align: 'center' })
      
      // Footer
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
      
      doc.setFontSize(7)
      doc.setTextColor(180, 180, 180)
      doc.text(`ID: ${proforma.id.substring(0, 8)}`, pageWidth - 20, footerY + 6, { align: 'right' })
      doc.text(`Generado: ${format(new Date(), 'dd/MM/yyyy HH:mm')}`, 20, footerY + 6, { align: 'left' })
      
      doc.save(`Proforma_${proforma.id}.pdf`)
      
    } catch (error) {
      console.error('Error generando PDF:', error)
      alert('Error al generar el PDF: ' + error.message)
    }
  }

  // ============ RECIBO DE VENTA ============
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
      alert('Error al generar el recibo: ' + error.message)
    }
  }

  // ============ ELIMINAR PROFORMA ============
  const deleteProforma = async (id, nombreCliente) => {
    if (!confirm(`¿Estás seguro de eliminar la proforma de "${nombreCliente}"?`)) return

    setDeletingId(id)
    try {
      const { error } = await supabase
        .from('proformas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      fetchProformas()
      if (selectedProforma && selectedProforma.id === id) {
        setSelectedProforma(null)
      }
      
      alert(`✅ Proforma de "${nombreCliente}" eliminada correctamente`)
    } catch (error) {
      console.error('Error eliminando proforma:', error)
      alert('Error al eliminar la proforma')
    } finally {
      setDeletingId(null)
    }
  }

  // ============ ELIMINAR VENTA ============
  const deleteVenta = async (id, clienteNombre) => {
    if (!confirm(`¿Estás seguro de eliminar la venta de "${clienteNombre}"?`)) return

    try {
      const { error } = await supabase
        .from('ventas')
        .delete()
        .eq('id', id)
      
      if (error) throw error
      
      fetchVentas()
      if (selectedVenta && selectedVenta.id === id) {
        setSelectedVenta(null)
      }
      
      alert(`✅ Venta de "${clienteNombre}" eliminada correctamente`)
    } catch (error) {
      console.error('Error eliminando venta:', error)
      alert('Error al eliminar la venta')
    }
  }

  // Manejar cambio de página
  const handlePageChangeProformas = (newPage) => {
    if (newPage < 1 || newPage > totalPagesProformas) return
    setCurrentPageProformas(newPage)
  }

  const handlePageChangeVentas = (newPage) => {
    if (newPage < 1 || newPage > totalPagesVentas) return
    setCurrentPageVentas(newPage)
  }

  const getPageNumbers = (currentPage, totalPages) => {
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

  return (
    <div className="px-3 sm:px-4 lg:px-6 py-4 sm:py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800 flex items-center gap-2">
          📊 Reportes
        </h1>
      </div>

      {/* Pestañas */}
      <div className="flex gap-2 mb-4 sm:mb-6 bg-white p-1 rounded-xl shadow-md overflow-x-auto scrollbar-hide">
        <button
          onClick={() => {
            setActiveTab('proformas')
            setCurrentPageProformas(1)
          }}
          className={`flex-1 min-w-[120px] sm:min-w-[140px] px-2 sm:px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${
            activeTab === 'proformas'
              ? 'bg-cyan-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <FileText size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="whitespace-nowrap text-[10px] sm:text-sm">Reporte de Proformas</span>
        </button>
        <button
          onClick={() => {
            setActiveTab('ventas')
            setCurrentPageVentas(1)
          }}
          className={`flex-1 min-w-[120px] sm:min-w-[140px] px-2 sm:px-4 py-2 rounded-lg font-medium transition duration-200 flex items-center justify-center gap-1 sm:gap-2 text-xs sm:text-sm ${
            activeTab === 'ventas'
              ? 'bg-green-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <ShoppingCart size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="whitespace-nowrap text-[10px] sm:text-sm">Reporte de Ventas</span>
        </button>
      </div>

      {/* ============ TAB: PROFORMAS ============ */}
      {activeTab === 'proformas' && (
        <div>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-48 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por cliente"
                  value={searchName}
                  onChange={(e) => {
                    setSearchName(e.target.value)
                    setCurrentPageProformas(1)
                  }}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
              <div className="relative flex-1 sm:w-48 w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Buscar por CI/NIT"
                  value={searchCi}
                  onChange={(e) => {
                    setSearchCi(e.target.value)
                    setCurrentPageProformas(1)
                  }}
                  className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
              </div>
            </div>
            <button
              onClick={() => {
                setCurrentPageProformas(1)
                fetchProformas()
              }}
              className="w-full sm:w-auto px-4 py-1.5 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 transition duration-300 text-sm flex items-center justify-center gap-1"
            >
              🔄 Actualizar
            </button>
          </div>

          <div className="text-sm text-gray-500 mb-2">
            Total: {totalProformas} proformas
          </div>

          {loadingProformas ? (
            <div className="text-center py-8 text-gray-600">Cargando...</div>
          ) : filteredProformas.length > 0 ? (
            <>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Tabla Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                        <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                        <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">CI/NIT</th>
                        <th className="px-3 sm:px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                        <th className="px-3 sm:px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProformas.map((proforma) => (
                        <tr key={proforma.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm">
                            {format(new Date(proforma.fecha_emision), 'dd/MM/yyyy')}
                          </td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm">{proforma.nombre_cliente}</td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm">{proforma.ci_nit || 'N/A'}</td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-right font-medium">
                            Bs. {proforma.total?.toFixed(2) || '0.00'}
                          </td>
                          <td className="px-3 sm:px-4 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => viewProformaDetails(proforma)}
                                className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                                title="Ver detalles"
                              >
                                <FileText size={15} />
                              </button>
                              <button
                                onClick={() => downloadPDF(proforma)}
                                className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded"
                                title="Descargar PDF"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                onClick={() => deleteProforma(proforma.id, proforma.nombre_cliente)}
                                className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards Mobile - Proformas */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredProformas.map((proforma) => (
                    <div key={proforma.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-[80px]">
                          <span className="text-xs text-gray-400">
                            {format(new Date(proforma.fecha_emision), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        <div className="flex-[2] min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{proforma.nombre_cliente}</p>
                          <p className="text-xs text-gray-500">{proforma.ci_nit || 'N/A'}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-end gap-1">
                          <span className="text-sm font-bold text-cyan-600 whitespace-nowrap">
                            Bs. {proforma.total?.toFixed(2) || '0.00'}
                          </span>
                          <div className="flex gap-1">
                            <button
                              onClick={() => viewProformaDetails(proforma)}
                              className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                              title="Ver detalles"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => downloadPDF(proforma)}
                              className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded"
                              title="Descargar PDF"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => deleteProforma(proforma.id, proforma.nombre_cliente)}
                              className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paginación Proformas */}
              {totalPagesProformas > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                  <div className="text-sm text-gray-600">
                    Mostrando {(currentPageProformas - 1) * itemsPerPage + 1} - {Math.min(currentPageProformas * itemsPerPage, totalProformas)} de {totalProformas} proformas
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChangeProformas(currentPageProformas - 1)}
                      disabled={currentPageProformas === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    
                    {getPageNumbers(currentPageProformas, totalPagesProformas).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChangeProformas(page)}
                        className={`px-3 py-1.5 rounded-lg transition duration-200 text-sm font-medium ${
                          currentPageProformas === page
                            ? 'bg-cyan-600 text-white shadow-md'
                            : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChangeProformas(currentPageProformas + 1)}
                      disabled={currentPageProformas === totalPagesProformas}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <p className="text-gray-600">No se encontraron proformas.</p>
            </div>
          )}
        </div>
      )}

      {/* ============ TAB: VENTAS ============ */}
      {activeTab === 'ventas' && (
        <div>
          <div className="flex flex-wrap gap-2 mb-4">
            <div className="relative flex-1 min-w-[150px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Buscar por cliente o CI/NIT"
                value={searchVenta}
                onChange={(e) => {
                  setSearchVenta(e.target.value)
                  setCurrentPageVentas(1)
                }}
                className="w-full pl-8 pr-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
            </div>
            <button
              onClick={() => {
                setCurrentPageVentas(1)
                fetchVentas()
              }}
              className="px-4 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition duration-300 text-sm flex items-center gap-1"
            >
              🔄 Actualizar
            </button>
            {searchVenta && (
              <button
                onClick={() => {
                  setSearchVenta('')
                  setCurrentPageVentas(1)
                  fetchVentas()
                }}
                className="px-3 py-1.5 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition duration-300 text-sm"
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          <div className="text-sm text-gray-500 mb-2">
            Total: {totalVentas} ventas
          </div>

          {loadingVentas ? (
            <div className="text-center py-8 text-gray-600">Cargando...</div>
          ) : filteredVentas.length > 0 ? (
            <>
              <div className="bg-white rounded-xl shadow-md overflow-hidden">
                {/* Tabla Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Factura</th>
                        <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Cliente</th>
                        <th className="px-3 sm:px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Fecha</th>
                        <th className="px-3 sm:px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Total</th>
                        <th className="px-3 sm:px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Estado</th>
                        <th className="px-3 sm:px-4 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredVentas.map((venta) => (
                        <tr key={venta.id} className="border-t hover:bg-gray-50">
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium">{venta.numero_factura}</td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm">
                            {venta.cliente_nombre}
                            {venta.cliente_ci_nit && (
                              <span className="text-xs text-gray-500 ml-1">({venta.cliente_ci_nit})</span>
                            )}
                          </td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm">
                            {format(new Date(venta.fecha_venta), 'dd/MM/yyyy HH:mm')}
                          </td>
                          <td className="px-3 sm:px-4 py-2 text-xs sm:text-sm text-right font-medium">
                            Bs. {venta.total.toFixed(2)}
                          </td>
                          <td className="px-3 sm:px-4 py-2 text-center">
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              venta.estado === 'completada'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {venta.estado}
                            </span>
                          </td>
                          <td className="px-3 sm:px-4 py-2 text-center">
                            <div className="flex justify-center gap-1">
                              <button
                                onClick={() => viewVentaDetails(venta)}
                                className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                                title="Ver detalles"
                              >
                                <FileText size={15} />
                              </button>
                              <button
                                onClick={() => generateReceipt(venta)}
                                className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded"
                                title="Descargar recibo"
                              >
                                <Download size={15} />
                              </button>
                              <button
                                onClick={() => deleteVenta(venta.id, venta.cliente_nombre)}
                                className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded"
                                title="Eliminar"
                              >
                                <Trash2 size={15} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Cards Mobile - Ventas */}
                <div className="md:hidden divide-y divide-gray-100">
                  {filteredVentas.map((venta) => (
                    <div key={venta.id} className="p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-[80px]">
                          <span className="text-xs text-gray-400">
                            {format(new Date(venta.fecha_venta), 'dd/MM/yyyy')}
                          </span>
                        </div>
                        <div className="flex-[2] min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{venta.cliente_nombre}</p>
                          <p className="text-xs text-gray-500">{venta.numero_factura}</p>
                        </div>
                        <div className="flex-1 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-green-600 whitespace-nowrap">
                              Bs. {venta.total.toFixed(2)}
                            </span>
                            <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                              venta.estado === 'completada'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}>
                              {venta.estado}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => viewVentaDetails(venta)}
                              className="text-blue-600 hover:text-blue-800 p-1 bg-blue-50 rounded"
                              title="Ver detalles"
                            >
                              <FileText size={14} />
                            </button>
                            <button
                              onClick={() => generateReceipt(venta)}
                              className="text-green-600 hover:text-green-800 p-1 bg-green-50 rounded"
                              title="Descargar recibo"
                            >
                              <Download size={14} />
                            </button>
                            <button
                              onClick={() => deleteVenta(venta.id, venta.cliente_nombre)}
                              className="text-red-600 hover:text-red-800 p-1 bg-red-50 rounded"
                              title="Eliminar"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Paginación Ventas */}
              {totalPagesVentas > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mt-6">
                  <div className="text-sm text-gray-600">
                    Mostrando {(currentPageVentas - 1) * itemsPerPage + 1} - {Math.min(currentPageVentas * itemsPerPage, totalVentas)} de {totalVentas} ventas
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePageChangeVentas(currentPageVentas - 1)}
                      disabled={currentPageVentas === 1}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      <ChevronLeft size={18} className="text-gray-600" />
                    </button>
                    
                    {getPageNumbers(currentPageVentas, totalPagesVentas).map((page) => (
                      <button
                        key={page}
                        onClick={() => handlePageChangeVentas(page)}
                        className={`px-3 py-1.5 rounded-lg transition duration-200 text-sm font-medium ${
                          currentPageVentas === page
                            ? 'bg-green-600 text-white shadow-md'
                            : 'border border-gray-300 hover:bg-gray-50 text-gray-700'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    
                    <button
                      onClick={() => handlePageChangeVentas(currentPageVentas + 1)}
                      disabled={currentPageVentas === totalPagesVentas}
                      className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition duration-200"
                    >
                      <ChevronRight size={18} className="text-gray-600" />
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12 bg-white rounded-xl shadow-md">
              <p className="text-gray-600">No se encontraron ventas.</p>
            </div>
          )}
        </div>
      )}

      {/* ============ MODAL PROFORMA ============ */}
      {selectedProforma && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Detalles de Proforma</h2>
                <button onClick={() => setSelectedProforma(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div><p className="text-sm text-gray-600">Cliente</p><p className="font-semibold">{selectedProforma.nombre_cliente}</p></div>
                <div><p className="text-sm text-gray-600">CI/NIT</p><p className="font-semibold">{selectedProforma.ci_nit || 'N/A'}</p></div>
                <div><p className="text-sm text-gray-600">Fecha Emisión</p><p className="font-semibold">{format(new Date(selectedProforma.fecha_emision), 'dd/MM/yyyy')}</p></div>
                <div><p className="text-sm text-gray-600">Fecha Vencimiento</p><p className="font-semibold">{format(new Date(selectedProforma.fecha_vencimiento), 'dd/MM/yyyy')}</p></div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">Productos</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600">Producto</th>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600">Marca/Origen</th>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600">Cant.</th>
                      <th className="px-2 sm:px-3 py-2 text-right text-xs font-semibold text-gray-600">Precio Unit.</th>
                      <th className="px-2 sm:px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedProforma.productos?.map((p, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">{p.nombre}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">
                          {p.marca ? p.marca : 'Sin marca'}
                          {p.origen && <span className="text-xs text-gray-500 ml-1">({p.origen})</span>}
                        </td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-center">{p.cantidad}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-right">Bs. {p.precio_unitario.toFixed(2)}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-right font-medium">Bs. {p.precio_total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t text-right">
                <p className="text-base sm:text-lg font-bold text-cyan-600">Total: Bs. {selectedProforma.total?.toFixed(2) || '0.00'}</p>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                <button onClick={() => downloadPDF(selectedProforma)} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                  <Download size={18} /> Descargar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============ MODAL VENTA ============ */}
      {selectedVenta && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg sm:text-xl font-bold text-gray-800">Detalles de Venta</h2>
                <button onClick={() => setSelectedVenta(null)} className="text-gray-500 hover:text-gray-700 text-2xl">✕</button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mb-4">
                <div><p className="text-sm text-gray-600">Factura</p><p className="font-semibold">{selectedVenta.numero_factura}</p></div>
                <div><p className="text-sm text-gray-600">Fecha</p><p className="font-semibold">{format(new Date(selectedVenta.fecha_venta), 'dd/MM/yyyy HH:mm')}</p></div>
                <div><p className="text-sm text-gray-600">Cliente</p><p className="font-semibold">{selectedVenta.cliente_nombre}</p></div>
                <div><p className="text-sm text-gray-600">CI/NIT</p><p className="font-semibold">{selectedVenta.cliente_ci_nit || 'N/A'}</p></div>
                <div><p className="text-sm text-gray-600">Método de Pago</p><p className="font-semibold">{selectedVenta.metodo_pago === 'efectivo' ? 'EFECTIVO' : 'QR'}</p></div>
                <div><p className="text-sm text-gray-600">Estado</p>
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    selectedVenta.estado === 'completada'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {selectedVenta.estado}
                  </span>
                </div>
              </div>
              <h3 className="text-base sm:text-lg font-semibold mb-3">Productos</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 sm:px-3 py-2 text-left text-xs font-semibold text-gray-600">Producto</th>
                      <th className="px-2 sm:px-3 py-2 text-center text-xs font-semibold text-gray-600">Cant.</th>
                      <th className="px-2 sm:px-3 py-2 text-right text-xs font-semibold text-gray-600">Precio Unit.</th>
                      <th className="px-2 sm:px-3 py-2 text-right text-xs font-semibold text-gray-600">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedVenta.productos?.map((p, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm">{p.nombre}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-center">{p.cantidad}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-right">Bs. {p.precio_unitario.toFixed(2)}</td>
                        <td className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-right font-medium">Bs. {p.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 pt-4 border-t text-right">
                <p className="text-base sm:text-lg font-bold text-green-600">Total: Bs. {selectedVenta.total.toFixed(2)}</p>
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-end gap-2">
                <button onClick={() => generateReceipt(selectedVenta)} className="w-full sm:w-auto px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2">
                  <Download size={18} /> Descargar Recibo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Reports