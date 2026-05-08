import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { StoreStockTransfer } from '@/types'

interface PDFOptions {
  logoUrl?: string
  companyName?: string
  companyAddress?: string
  companyPhone?: string
}

export class PDFService {
  private static defaultOptions: PDFOptions = {
    companyName: '',
    companyAddress: '',
    companyPhone: ''
  }

  static async generateTransferPDF(
    transfer: StoreStockTransfer,
    options: PDFOptions = {}
  ): Promise<void> {
    // Usar el nombre de la tienda origen como nombre de la empresa
    const companyName = transfer.fromStoreName || options.companyName || 'Zona T'
    const opts = { ...this.defaultOptions, ...options, companyName }
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    })

    const pageWidth = doc.internal.pageSize.getWidth()
    const margin = 15
    const contentWidth = pageWidth - (margin * 2)

    // Logo (derecha, más pequeño)
    let logoHeight = 0
    let logoWidth = 0
    if (opts.logoUrl) {
      try {
        // Convertir la URL a base64 si es necesario
        const logoDataUrl = await this.getImageAsDataUrl(opts.logoUrl)
        if (logoDataUrl) {
          const logoImg = await this.loadImage(logoDataUrl)
          logoWidth = 30 // Logo más pequeño
          logoHeight = (logoImg.height / logoImg.width) * logoWidth
          // Posicionar logo en la parte superior derecha
          doc.addImage(logoImg, 'PNG', pageWidth - margin - logoWidth, margin, logoWidth, logoHeight)
        }
      } catch (error) {
        console.error('Error loading logo:', error)
      }
    }

    // Title (izquierda)
    const titleY = margin + 5
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('GUÍA DE TRANSFERENCIA', margin, titleY)

    // Header - Company Info (debajo del título, izquierda)
    const headerY = titleY + 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text(opts.companyName || 'Zona T', margin, headerY)

    if (opts.companyAddress) {
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(opts.companyAddress, margin, headerY + 5)
    }

    if (opts.companyPhone) {
      doc.setFontSize(10)
      doc.text(opts.companyPhone, margin, headerY + 10)
    }

    // Transfer Info Section
    let currentY = titleY + 15

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')

    // Transfer Number
    doc.setFont('helvetica', 'bold')
    doc.text('Número de Transferencia:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(transfer.transferNumber || `#${transfer.id.substring(0, 8)}`, margin + 60, currentY)

    currentY += 7

    // From Store
    doc.setFont('helvetica', 'bold')
    doc.text('Origen:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(transfer.fromStoreName || 'N/A', margin + 60, currentY)

    currentY += 7

    // To Store
    doc.setFont('helvetica', 'bold')
    doc.text('Destino:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    doc.text(transfer.toStoreName || 'N/A', margin + 60, currentY)

    currentY += 7

    // Date
    doc.setFont('helvetica', 'bold')
    doc.text('Fecha de Envío:', margin, currentY)
    doc.setFont('helvetica', 'normal')
    const createdDate = new Date(transfer.createdAt)
    const formattedDate = createdDate.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
    doc.text(formattedDate, margin + 60, currentY)

    currentY += 7

    // Created By
    if (transfer.createdByName) {
      doc.setFont('helvetica', 'bold')
      doc.text('Enviado por:', margin, currentY)
      doc.setFont('helvetica', 'normal')
      doc.text(transfer.createdByName, margin + 60, currentY)
      currentY += 7
    }

    // Description
    if (transfer.description) {
      doc.setFont('helvetica', 'bold')
      doc.text('Descripción:', margin, currentY)
      doc.setFont('helvetica', 'normal')
      const descriptionLines = doc.splitTextToSize(transfer.description, contentWidth - 60)
      doc.text(descriptionLines, margin + 60, currentY)
      currentY += descriptionLines.length * 5 + 2
    }

    currentY += 5

    // Products Table
    const tableData: string[][] = []
    let totalQuantity = 0

    if (transfer.items && transfer.items.length > 0) {
      transfer.items.forEach((item, index) => {
        const row = [
          (index + 1).toString(),
          item.productName || 'N/A',
          item.productReference || '-',
          item.fromLocation === 'warehouse' ? 'Bodega' : 'Local',
          item.quantity.toString(),
          item.quantityReceived ? item.quantityReceived.toString() : '-'
        ]
        tableData.push(row)
        totalQuantity += item.quantity
      })
    } else {
      // Legacy support
      tableData.push([
        '1',
        transfer.productName || 'N/A',
        '-',
        'Bodega',
        (transfer.quantity || 0).toString(),
        '-'
      ])
      totalQuantity = transfer.quantity || 0
    }

    // Calcular el ancho total de la tabla
    const tableWidth = 15 + 60 + 40 + 30 + 25 + 25 // Suma de todos los anchos de columna
    // Calcular el margen izquierdo para centrar la tabla
    const tableMargin = (pageWidth - tableWidth) / 2

    autoTable(doc, {
      startY: currentY,
      head: [['#', 'Producto', 'Referencia', 'Origen', 'Cantidad', 'Recibida']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [0, 184, 212], // Cyan color
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 10
      },
      bodyStyles: {
        fontSize: 9
      },
      columnStyles: {
        0: { cellWidth: 15, halign: 'center' },
        1: { cellWidth: 60 },
        2: { cellWidth: 40 },
        3: { cellWidth: 30, halign: 'center' },
        4: { cellWidth: 25, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      },
      margin: { left: tableMargin, right: tableMargin },
      tableWidth: tableWidth
    })

    const finalY = (doc as any).lastAutoTable.finalY || currentY + 50

    // Total
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.text(`Total de Unidades: ${totalQuantity}`, pageWidth - margin, finalY + 10, {
      align: 'right'
    })

    // Status
    const statusY = finalY + 20
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Estado:', margin, statusY)
    doc.setFont('helvetica', 'normal')
    const statusText = transfer.status === 'pending' 
      ? 'Pendiente' 
      : transfer.status === 'received' 
      ? 'Recibida' 
      : transfer.status === 'partially_received'
      ? 'Parcialmente Recibida'
      : transfer.status === 'cancelled'
      ? 'Cancelada'
      : transfer.status
    doc.text(statusText, margin + 60, statusY)

    // Received info if applicable
    if ((transfer.status === 'received' || transfer.status === 'partially_received') && transfer.receivedAt) {
      const receivedY = statusY + 7
      doc.setFont('helvetica', 'bold')
      doc.text('Fecha de Recepción:', margin, receivedY)
      doc.setFont('helvetica', 'normal')
      const receivedDate = new Date(transfer.receivedAt)
      const formattedReceivedDate = receivedDate.toLocaleDateString('es-CO', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
      doc.text(formattedReceivedDate, margin + 60, receivedY)

      if (transfer.receivedByName) {
        const receivedByY = receivedY + 7
        doc.setFont('helvetica', 'bold')
        doc.text('Recibido por:', margin, receivedByY)
        doc.setFont('helvetica', 'normal')
        doc.text(transfer.receivedByName, margin + 60, receivedByY)
      }
    }

    // Footer - Signature section
    const footerY = doc.internal.pageSize.getHeight() - 50
    doc.setDrawColor(200, 200, 200)
    doc.line(margin, footerY, pageWidth - margin, footerY)

    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    doc.text('Firma del Transportador:', margin, footerY + 10)
    doc.text('_________________________', margin, footerY + 20)

    doc.text('Firma del Receptor:', pageWidth - margin, footerY + 10, { align: 'right' })
    doc.text('_________________________', pageWidth - margin, footerY + 20, { align: 'right' })

    // Page number
    const pageCount = doc.getNumberOfPages()
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
      doc.setFontSize(8)
      doc.setFont('helvetica', 'normal')
      doc.text(
        `Página ${i} de ${pageCount}`,
        pageWidth / 2,
        doc.internal.pageSize.getHeight() - 10,
        { align: 'center' }
      )
    }

    // Generate filename
    const filename = `Transferencia_${transfer.transferNumber || transfer.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.pdf`
    
    // Save PDF
    doc.save(filename)
  }

  private static loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => resolve(img)
      img.onerror = reject
      img.src = url
    })
  }

  private static async getImageAsDataUrl(url: string): Promise<string | null> {
    try {
      // Si ya es una data URL, retornarla directamente
      if (url.startsWith('data:')) {
        return url
      }

      // Si es una URL relativa, construir la URL completa
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`
      
      // Cargar la imagen y convertirla a base64
      const response = await fetch(fullUrl)
      const blob = await response.blob()
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
    } catch (error) {
      console.error('Error converting image to data URL:', error)
      return null
    }
  }
}
