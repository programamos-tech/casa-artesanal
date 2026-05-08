'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  X, 
  Receipt, 
  User, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  Download,
  Package,
  Eye,
  Edit,
  Truck
} from 'lucide-react'
import { Sale, CompanyConfig, Client, Credit, PaymentRecord, StoreStockTransfer } from '@/types'
import { CompanyService } from '@/lib/company-service'
import { CreditsService } from '@/lib/credits-service'
import { StoreStockTransferService } from '@/lib/store-stock-transfer-service'
import { InvoiceTemplate } from './invoice-template'
import { StoresService } from '@/lib/stores-service'
import { getCurrentUserStoreId } from '@/lib/store-helper'

interface SaleDetailModalProps {
  isOpen: boolean
  onClose: () => void
  sale: Sale | null
  onCancel?: (saleId: string, reason: string) => Promise<{ success: boolean, totalRefund?: number }>
  onPrint?: (sale: Sale) => void
  onFinalizeDraft?: (saleId: string) => Promise<void>
  onEdit?: (sale: Sale) => void
}

export default function SaleDetailModal({ 
  isOpen, 
  onClose, 
  sale, 
  onCancel,
  onPrint,
  onFinalizeDraft,
  onEdit
}: SaleDetailModalProps) {
  const [showCancelForm, setShowCancelForm] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null)
  const [clientData, setClientData] = useState<Client | null>(null)
  const [isLoadingPrint, setIsLoadingPrint] = useState(false)
  const [cancelSuccessMessage, setCancelSuccessMessage] = useState<string | null>(null)
  const [isFinalizing, setIsFinalizing] = useState(false)
  const cancelFormRef = useRef<HTMLDivElement>(null)
  const [credit, setCredit] = useState<Credit | null>(null)
  const [transfer, setTransfer] = useState<StoreStockTransfer | null>(null)

  // Cargar crédito si la venta es de tipo crédito
  useEffect(() => {
    const loadCredit = async () => {
      if (sale && sale.paymentMethod === 'credit' && sale.invoiceNumber) {
        try {
          const creditData = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
          setCredit(creditData)
        } catch (error) {
          setCredit(null)
        }
      } else {
        setCredit(null)
      }
    }
    
    if (isOpen && sale) {
      loadCredit()
    }
  }, [isOpen, sale])

  // Cargar transferencia si la venta es de tipo transferencia
  useEffect(() => {
    const loadTransfer = async () => {
      const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
      // Solo buscar transferencia asociada para ventas de la tienda principal
      // La transferencia se identifica por tener un registro en stock_transfers, no por método de pago
      if (sale && sale.storeId === MAIN_STORE_ID) {
        try {
          const transferData = await StoreStockTransferService.getTransferBySaleId(sale.id)
          setTransfer(transferData)
        } catch (error) {
          setTransfer(null)
        }
      } else {
        setTransfer(null)
      }
    }
    
    if (isOpen && sale) {
      loadTransfer()
    }
  }, [isOpen, sale])

  // Función helper para generar ID del crédito
  const getCreditId = (credit: Credit): string => {
    const clientInitials = credit.clientName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase())
      .join('')
      .substring(0, 2)
      .padEnd(2, 'X')
    
    const creditSuffix = credit.id.substring(credit.id.length - 6).toLowerCase()
    return `${clientInitials}${creditSuffix}`
  }

  // Función helper para generar ID de la transferencia
  const getTransferId = (transfer: StoreStockTransfer): string => {
    if (transfer.transferNumber) {
      return transfer.transferNumber.replace('TRF-', '')
    }
    // Si no hay transferNumber, usar las últimas 8 letras del ID
    return transfer.id.substring(transfer.id.length - 8).toUpperCase()
  }

  useEffect(() => {
    if (showCancelForm && cancelFormRef.current) {
      cancelFormRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [showCancelForm])

  // Cargar configuración de empresa cuando se abre el modal
  useEffect(() => {
    if (isOpen && sale) {
      const loadCompanyConfig = async () => {
        try {
          let config = await CompanyService.getCompanyConfig()
          if (!config) {
            // Si no existe configuración, crear la por defecto
            config = await CompanyService.initializeDefaultConfig()
          }
          setCompanyConfig(config)
        } catch (error) {
      // Error silencioso en producción
        }
      }
      
      loadCompanyConfig()
    }
  }, [isOpen, sale])

  // Limpiar mensaje de confirmación cuando la venta se anula
  useEffect(() => {

    if (sale?.status === 'cancelled') {
      setShowCancelForm(false)
      setCancelReason('')
      setCancelSuccessMessage(null)
    }
  }, [sale?.status])

  if (!isOpen || !sale) return null

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('es-CO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const generateInvoiceNumber = (sale: Sale) => {
    return `#${sale.invoiceNumber?.toString().padStart(3, '0') || '000'}`
  }

  const getInvoiceNumber = (sale: Sale) => {
    // Si invoiceNumber ya incluye #, devolverlo tal como está
    if (sale.invoiceNumber?.toString().startsWith('#')) {
      return sale.invoiceNumber.toString()
    }
    // Si no incluye #, agregarlo
    return `#${sale.invoiceNumber?.toString().padStart(3, '0') || '000'}`
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'cancelled':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-950 dark:text-gray-200'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'pending':
        return 'Pendiente'
      case 'cancelled':
        return 'Cancelada'
      default:
        return status
    }
  }

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'credit':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'transfer':
      case 'nequi':
      case 'bancolombia':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'card':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'warranty':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'mixed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-950 dark:text-gray-200'
    }
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo/Contado'
      case 'credit':
        return 'Crédito'
      case 'nequi':
        return 'Nequi'
      case 'bancolombia':
        return 'Bancolombia'
      case 'transfer':
        return 'Transferencia (otro / sin canal)'
      case 'card':
        return 'Tarjeta'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

  const handleShowCancelForm = () => {
    setShowCancelForm(true)
      setCancelReason('')
    setCancelSuccessMessage(null)
  }

  const handleCancel = async () => {
    if (!cancelReason.trim() || !onCancel) return

    // Validar que el motivo tenga al menos 10 caracteres
    if (cancelReason.trim().length < 10) {
      setCancelSuccessMessage('⚠️ El motivo de anulación debe tener al menos 10 caracteres para mayor claridad. Por favor, proporciona una descripción más detallada.')
      return
    }

    setIsCancelling(true)
    setCancelSuccessMessage(null)
    try {
      const result = await onCancel(sale.id, cancelReason)
      
      // Mostrar mensaje de confirmación con información del reembolso
      if (result && result.totalRefund && result.totalRefund > 0) {
        setCancelSuccessMessage(`Venta anulada exitosamente.\n\nReembolso total: $${result.totalRefund.toLocaleString()}\nProductos devueltos al stock\nCrédito y abonos anulados`)
      } else {
        setCancelSuccessMessage('Venta anulada exitosamente.\n\nProductos devueltos al stock')
      }
      
      // Cerrar solo el formulario de anulación después de 3 segundos
      setTimeout(() => {
      setShowCancelForm(false)
        setCancelReason('')
        setCancelSuccessMessage(null)
        // NO cerrar el modal, mantenerlo abierto para ver el resultado
      }, 3000)
    } catch (error) {
      // Error silencioso en producción
      setCancelSuccessMessage('Error al anular la venta. Por favor, inténtalo de nuevo.')
    } finally {
      setIsCancelling(false)
    }
  }

  const handleFinalizeDraft = async () => {
    if (!sale || !onFinalizeDraft) return
    
    setIsFinalizing(true)
    try {
      await onFinalizeDraft(sale.id)
      // Cerrar el modal después de facturar
      onClose()
    } catch (error: any) {
      // Mostrar mensaje específico del error
      const errorMessage = error?.message || 'Error al facturar el borrador'
      if (errorMessage.includes('No hay suficiente stock')) {
        alert(`⚠️ ${errorMessage}\n\nPor favor, verifica el inventario antes de finalizar el borrador.`)
      } else {
        alert(`Error al facturar el borrador: ${errorMessage}`)
      }
    } finally {
      setIsFinalizing(false)
    }
  }

  const handlePrint = async () => {
    if (!sale) {
      return
    }

    // Factura siempre con datos de la tienda de la venta (ej. ToroCell - Corozal / Sahagún), sin Zonat/Sincelejo
    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const storeIdForInvoice = sale.storeId || getCurrentUserStoreId()

    let currentStore
    if (!storeIdForInvoice || storeIdForInvoice === MAIN_STORE_ID) {
      currentStore = await StoresService.getMainStore()
    } else {
      currentStore = await StoresService.getStoreById(storeIdForInvoice)
    }

    const addressLine = [currentStore?.address, currentStore?.city].filter(Boolean).join(', ') || ''
    const config: CompanyConfig = {
      id: currentStore?.id ?? 'default',
      name: currentStore?.name ?? '',
      nit: currentStore?.nit ?? '',
      address: addressLine,
      phone: currentStore?.phone ?? '',
      email: '',
      logo: currentStore?.logo ?? undefined,
      dianResolution: undefined,
      numberingRange: undefined,
      createdAt: currentStore?.createdAt ?? new Date().toISOString(),
      updatedAt: currentStore?.updatedAt ?? new Date().toISOString()
    }

    setIsLoadingPrint(true)
    
    try {
      const escHtml = (s: string) =>
        (s || '')
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')

      const creditStatusLabel = (status: string) => {
        switch (status) {
          case 'pending':
            return 'Pendiente'
          case 'partial':
            return 'Parcial'
          case 'completed':
            return 'Pagado'
          case 'overdue':
            return 'Vencido'
          case 'cancelled':
            return 'Cancelado'
          default:
            return status
        }
      }

      const payMethodLabel = (m: string) => {
        switch (m) {
          case 'cash':
            return 'Efectivo'
          case 'nequi':
            return 'Nequi'
          case 'bancolombia':
            return 'Bancolombia'
          case 'transfer':
            return 'Transferencia (otro / sin canal)'
          case 'card':
            return 'Tarjeta'
          case 'mixed':
            return 'Mixto'
          default:
            return m
        }
      }

      const showCreditOnPrint =
        sale.paymentMethod === 'credit' ||
        (sale.paymentMethod === 'mixed' && sale.payments?.some((p) => p.paymentType === 'credit'))

      let creditPrintSection = ''
      if (showCreditOnPrint) {
        try {
          let creditRow = await CreditsService.getCreditBySaleId(sale.id)
          if (!creditRow && sale.invoiceNumber) {
            const inv = sale.invoiceNumber.replace(/^#\s*/, '').trim()
            creditRow = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
            if (!creditRow && inv !== sale.invoiceNumber) {
              creditRow = await CreditsService.getCreditByInvoiceNumber(inv)
            }
          }
          if (creditRow) {
            let history: PaymentRecord[] = []
            try {
              history = await CreditsService.getPaymentHistory(creditRow.id)
            } catch {
              history = []
            }
            const active = history.filter((p) => p.status !== 'cancelled')
            const sorted = [...active].sort(
              (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
            )
            const dueStr = creditRow.dueDate
              ? new Date(creditRow.dueDate).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })
              : '—'

            const abonosRows =
              sorted.length > 0
                ? sorted
                    .map((p, i) => {
                      const d = new Date(p.paymentDate)
                      const dateStr = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                      const note = p.description ? `<br/><span style="font-size:10px;color:#555">${escHtml(p.description)}</span>` : ''
                      return `<tr>
                        <td>${i + 1}</td>
                        <td>${dateStr}</td>
                        <td>${payMethodLabel(p.paymentMethod)}</td>
                        <td style="text-align:right;font-weight:bold">${formatCurrency(p.amount)}</td>
                        <td>${escHtml(p.userName || '—')}${note}</td>
                      </tr>`
                    })
                    .join('')
                : `<tr><td colspan="5" style="font-style:italic;color:#555">Sin abonos registrados aún.</td></tr>`

            creditPrintSection = `
            <div class="section">
              <h3>CRÉDITO Y ABONOS</h3>
              <table>
                <tbody>
                  <tr><td><strong>Total crédito</strong></td><td style="text-align:right"><strong>${formatCurrency(creditRow.totalAmount)}</strong></td></tr>
                  <tr><td>Total pagado</td><td style="text-align:right">${formatCurrency(creditRow.paidAmount)}</td></tr>
                  <tr><td>Saldo pendiente</td><td style="text-align:right"><strong>${formatCurrency(creditRow.pendingAmount)}</strong></td></tr>
                  <tr><td>Estado</td><td style="text-align:right">${creditStatusLabel(creditRow.status)}</td></tr>
                  <tr><td>Vencimiento</td><td style="text-align:right">${dueStr}</td></tr>
                </tbody>
              </table>
              <p style="font-size:12px;font-weight:bold;margin:12px 0 6px 0">Historial de abonos</p>
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Fecha</th>
                    <th>Método</th>
                    <th style="text-align:right">Monto</th>
                    <th>Registró / nota</th>
                  </tr>
                </thead>
                <tbody>${abonosRows}</tbody>
              </table>
            </div>`
          } else {
            creditPrintSection = `
            <div class="section">
              <h3>CRÉDITO</h3>
              <p style="font-size:12px;color:#555">No se encontró el registro de crédito para esta venta.</p>
            </div>`
          }
        } catch {
          creditPrintSection = `
            <div class="section">
              <h3>CRÉDITO</h3>
              <p style="font-size:12px;color:#555">No se pudo cargar el historial del crédito.</p>
            </div>`
        }
      }

      // Crear datos del cliente (usar datos de la venta o valores por defecto)
      const client: Client = {
        id: sale.clientId,
        name: sale.clientName,
        email: 'N/A',
        phone: 'N/A',
        document: 'N/A',
        address: 'N/A',
        city: 'N/A',
        state: 'N/A',
        type: 'consumidor_final',
        creditLimit: 0,
        currentDebt: 0,
        status: 'active',
        nit: 'N/A',
        createdAt: sale.createdAt
      }

      // Crear ventana de impresión
      const printWindow = window.open('', '_blank')
      if (!printWindow) {
        alert('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.')
        return
      }

      // Generar HTML de la factura
      const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Factura ${sale.invoiceNumber}</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              margin: 0; 
              padding: 20px; 
              color: #000; 
              background: #fff;
            }
            .invoice-template { 
              max-width: 800px; 
              margin: 0 auto; 
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #000; 
              padding-bottom: 20px; 
            }
            .company-info h1 { 
              font-size: 24px; 
              margin: 0 0 10px 0; 
            }
            .company-info p { 
              margin: 2px 0; 
              font-size: 12px; 
            }
            .invoice-info { 
              text-align: right; 
            }
            .invoice-info h2 { 
              font-size: 20px; 
              margin: 0 0 15px 0; 
            }
            .invoice-info p { 
              margin: 2px 0; 
              font-size: 12px; 
            }
            .section { 
              margin-bottom: 25px; 
            }
            .section h3 { 
              font-size: 16px; 
              margin-bottom: 10px; 
              border-bottom: 1px solid #ccc; 
              padding-bottom: 5px; 
            }
            .client-info { 
              display: grid; 
              grid-template-columns: 1fr 1fr; 
              gap: 20px; 
            }
            .client-info p { 
              margin: 3px 0; 
              font-size: 12px; 
            }
            table { 
              width: 100%; 
              border-collapse: collapse; 
              margin-bottom: 20px; 
            }
            th, td { 
              border: 1px solid #000; 
              padding: 8px; 
              text-align: left; 
              font-size: 12px; 
            }
            th { 
              background-color: #f0f0f0; 
              font-weight: bold; 
            }
            .summary { 
              display: flex; 
              justify-content: flex-end; 
            }
            .summary-box { 
              width: 300px; 
              border: 1px solid #000; 
              padding: 15px; 
            }
            .summary h3 { 
              margin: 0 0 10px 0; 
              font-size: 14px; 
            }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 5px 0; 
              font-size: 12px; 
            }
            .total-row { 
              border-top: 2px solid #000; 
              padding-top: 10px; 
              font-weight: bold; 
              font-size: 14px; 
            }
            .footer { 
              border-top: 2px solid #000; 
              padding-top: 15px; 
              text-align: center; 
              font-size: 11px; 
              color: #666; 
            }
            @media print {
              body { margin: 0; padding: 10px; }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="invoice-template">
            <!-- Header -->
            <div class="header">
              <div class="company-info">
                ${config.logo ? `<img src="${config.logo}" alt="${config.name}" style="width: 80px; height: 80px; border-radius: 50%; object-fit: cover; display: block; margin-bottom: 10px;" />` : ''}
                <h1>${config.name}</h1>
                ${config.nit ? `<p><strong>NIT:</strong> ${config.nit}</p>` : ''}
                ${config.address ? `<p><strong>Dirección:</strong> ${config.address}</p>` : ''}
                ${config.phone ? `<p><strong>Teléfono:</strong> ${config.phone}</p>` : ''}
                ${config.email ? `<p><strong>Email:</strong> ${config.email}</p>` : ''}
                ${config.dianResolution ? `<p><strong>${config.dianResolution}</strong></p>` : ''}
                ${config.numberingRange ? `<p><strong>Rango autorizado:</strong> ${config.numberingRange}</p>` : ''}
              </div>
              <div class="invoice-info">
                <h2>FACTURA DE VENTA</h2>
                <p><strong>No. Factura:</strong> ${sale.invoiceNumber}</p>
                <p><strong>Fecha:</strong> ${new Date(sale.createdAt).toLocaleDateString('es-CO')}</p>
                <p><strong>Hora:</strong> ${new Date(sale.createdAt).toLocaleTimeString('es-CO')}</p>
              </div>
            </div>

            <!-- Información del Cliente -->
            <div class="section">
              <h3>INFORMACIÓN DEL CLIENTE</h3>
              <div class="client-info">
                <div>
                  <p><strong>Nombre:</strong> ${client.name}</p>
                  <p><strong>NIT:</strong> ${client.nit || 'N/A'}</p>
                  <p><strong>Email:</strong> ${client.email || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Teléfono:</strong> ${client.phone || 'N/A'}</p>
                  <p><strong>Dirección:</strong> ${client.address || 'N/A'}</p>
                  <p><strong>Tipo:</strong> ${client.type === 'mayorista' ? 'Mayorista' : client.type === 'minorista' ? 'Minorista' : 'Consumidor Final'}</p>
                </div>
              </div>
            </div>

            <!-- Productos -->
            <div class="section">
              <h3>DETALLE DE PRODUCTOS</h3>
              <table>
                <thead>
                  <tr>
                    <th>Producto</th>
                    <th style="text-align: center;">Cantidad</th>
                    <th style="text-align: right;">Precio Unit.</th>
                    <th style="text-align: center;">Descuento</th>
                    <th style="text-align: right;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${sale.items.map(item => {
                    const baseTotal = item.quantity * item.unitPrice
                    const discountAmount = item.discountType === 'percentage' 
                      ? (baseTotal * (item.discount || 0)) / 100 
                      : (item.discount || 0)
                    const subtotalAfterDiscount = Math.max(0, baseTotal - discountAmount)
                    
                    return `
                      <tr>
                        <td>
                          <div style="font-weight: bold;">${item.productName}</div>
                          <div style="font-size: 10px; color: #666;">Ref: ${item.productReferenceCode || 'N/A'}</div>
                        </td>
                        <td style="text-align: center;">${item.quantity}</td>
                        <td style="text-align: right;">${formatCurrency(item.unitPrice)}</td>
                        <td style="text-align: center; color: #d32f2f;">
                          ${item.discount && item.discount > 0 
                            ? (item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount))
                            : '-'
                          }
                        </td>
                        <td style="text-align: right; font-weight: bold;">${formatCurrency(subtotalAfterDiscount)}</td>
                      </tr>
                    `
                  }).join('')}
                </tbody>
              </table>
            </div>

            <!-- Resumen Financiero -->
            <div class="summary">
              <div class="summary-box">
                <h3>RESUMEN FINANCIERO</h3>
                <div class="summary-row">
                  <span>Subtotal de productos:</span>
                  <span>${formatCurrency(sale.items.reduce((sum, item) => {
                    const baseTotal = item.quantity * item.unitPrice
                    const discountAmount = item.discountType === 'percentage' 
                      ? (baseTotal * (item.discount || 0)) / 100 
                      : (item.discount || 0)
                    return sum + Math.max(0, baseTotal - discountAmount)
                  }, 0))}</span>
                </div>
                ${sale.discount && sale.discount > 0.001 ? `
                  <div class="summary-row" style="color: #d32f2f;">
                    <span>Descuento por total:</span>
                    <span>${sale.discountType === 'percentage' ? `-${sale.discount}%` : `-${formatCurrency(sale.discount)}`}</span>
                  </div>
                ` : ''}
                <div class="summary-row" style="border-top: 1px solid #ccc; padding-top: 5px;">
                  <span>Subtotal después de descuentos:</span>
                  <span>${formatCurrency(sale.subtotal)}</span>
                </div>
                ${sale.tax && sale.tax > 0 ? `
                  <div class="summary-row" style="color: #1976d2;">
                    <span>IVA (19%):</span>
                    <span>${formatCurrency(sale.tax)}</span>
                  </div>
                ` : ''}
                <div class="summary-row total-row">
                  <span>TOTAL:</span>
                  <span>${formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>

            <!-- Información Adicional -->
            <div class="section">
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; font-size: 12px;">
                <div>
                  <p><strong>Método de Pago:</strong> ${sale.paymentMethod === 'cash' ? 'Efectivo/Contado' : sale.paymentMethod === 'credit' ? 'Crédito' : sale.paymentMethod === 'nequi' ? 'Nequi' : sale.paymentMethod === 'bancolombia' ? 'Bancolombia' : sale.paymentMethod === 'transfer' ? 'Transferencia (otro / sin canal)' : sale.paymentMethod === 'card' ? 'Tarjeta' : sale.paymentMethod === 'warranty' ? 'Garantía' : 'Mixto'}</p>
                  <p><strong>Estado:</strong> ${sale.status === 'completed' ? 'Completada' : sale.status === 'pending' ? 'Pendiente' : 'Anulada'}</p>
                </div>
                <div>
                  <p><strong>Vendedor:</strong> ${sale.sellerName || 'No especificado'}</p>
                  ${sale.sellerEmail ? `<p><strong>Email Vendedor:</strong> ${sale.sellerEmail}</p>` : ''}
                </div>
              </div>
            </div>

            ${creditPrintSection}

            <!-- Footer -->
            <div class="footer">
              <p>Esta factura cumple con los requisitos legales establecidos por la DIAN</p>
              <p>Gracias por su compra - ${config.name}</p>
            </div>
          </div>
        </body>
        </html>
      `

      // Escribir el HTML en la ventana
      printWindow.document.write(invoiceHTML)
      printWindow.document.close()

      // Esperar a que se cargue y luego imprimir
      printWindow.onload = () => {
    setTimeout(() => {
          printWindow.print()
          printWindow.close()
        }, 500)
      }

    } catch (error) {
      // Error silencioso en producción
      alert('Error al generar la factura. Intenta nuevamente.')
    } finally {
      setIsLoadingPrint(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex flex-col p-4 xl:px-6">
      <div className="bg-white dark:bg-neutral-900 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-auto xl:w-auto xl:max-w-[95vw] xl:max-h-[85vh] xl:m-auto flex flex-col border-0 xl:border border-gray-200 dark:border-neutral-700 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200 dark:border-neutral-600 flex-shrink-0 bg-green-50 dark:bg-green-900/20">
          <div className="flex items-center space-x-3">
            <Receipt className="h-6 w-6 text-green-600" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">Detalle de Venta</h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-400">{getInvoiceNumber(sale)}</p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            disabled={isCancelling}
            className="h-8 w-8 p-0 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Mensaje de confirmación de anulación */}
        {cancelSuccessMessage && (
          <div className={`mx-4 md:mx-6 mt-4 p-4 rounded-lg border-2 ${
            cancelSuccessMessage.includes('exitosamente') 
              ? 'border-green-200 bg-green-50 dark:bg-green-900/20 dark:border-green-800'
              : 'border-red-200 bg-red-50 dark:bg-red-900/20 dark:border-red-800'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {cancelSuccessMessage.includes('exitosamente') ? (
                  <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                    <span className="text-white text-sm">✓</span>
                  </div>
                ) : (
                  <div className="w-6 h-6 rounded-full bg-red-500 flex items-center justify-center">
                    <span className="text-white text-sm">⚠</span>
                  </div>
                )}
              </div>
              <div className="ml-3">
                <div className={`text-sm font-medium ${
                  cancelSuccessMessage.includes('exitosamente')
                    ? 'text-green-800 dark:text-green-200'
                    : 'text-red-800 dark:text-red-200'
                }`}>
                  {cancelSuccessMessage.split('\n').map((line, index) => (
                    <div key={index} className={index === 0 ? 'font-semibold' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-white dark:bg-neutral-900">
          <div className="space-y-3 md:space-y-4 mb-4 md:mb-6">
            
            {/* Sale Information */}
            <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white flex items-center">
                  <Receipt className="h-4 w-4 md:h-5 md:w-5 mr-2 text-green-600" />
                  Información de la Venta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3">
                {/* Factura e ID Crédito/Transferencia - Estilo exacto a créditos pero invertido */}
                <div className="flex items-center gap-4 mb-2">
                  {sale.paymentMethod === 'credit' ? (
                    <CreditCard className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0" />
                  ) : transfer ? (
                    <Truck className="h-5 w-5 text-cyan-600 dark:text-cyan-400 flex-shrink-0" />
                  ) : (
                  <Receipt className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                  )}
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Factura</div>
                        <div className="text-xl font-bold text-gray-900 dark:text-white">
                          {getInvoiceNumber(sale)}
                        </div>
                      </div>
                      {sale.paymentMethod === 'credit' && credit && (
                        <div className="border-l border-gray-300 dark:border-neutral-600 pl-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Crédito</div>
                          <div className="text-sm font-mono font-semibold text-blue-600 dark:text-blue-400">
                            #{getCreditId(credit)}
                          </div>
                        </div>
                      )}
                      {transfer &&
                        (sale.paymentMethod === 'transfer' ||
                          sale.paymentMethod === 'nequi' ||
                          sale.paymentMethod === 'bancolombia' ||
                          sale.paymentMethod === 'mixed') && (
                        <div className="border-l border-gray-300 dark:border-neutral-600 pl-3">
                          <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">ID Transferencia</div>
                          <div className="text-sm font-mono font-semibold text-cyan-600 dark:text-cyan-400">
                            {transfer.transferNumber || `#${getTransferId(transfer)}`}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 md:gap-3">
                  <div className="flex items-center space-x-3">
                    <User className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Cliente</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{sale.clientName}</div>
                    </div>
                  </div>
                  
                  {sale.sellerName && (
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-600 dark:text-gray-300">Vendedor</div>
                        <div className="font-semibold text-gray-900 dark:text-white">{sale.sellerName}</div>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Fecha</div>
                      <div className="font-semibold text-gray-900 dark:text-white">{formatDateTime(sale.createdAt)}</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <CreditCard className="h-5 w-5 text-green-600" />
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Tipo de Pago</div>
                      <Badge className={`${getPaymentMethodColor(sale.paymentMethod)} mt-1`}>
                        {getPaymentMethodLabel(sale.paymentMethod)}
                      </Badge>
                    </div>
                  </div>
                </div>
                
                {/* Sección de Pagos Mixtos */}
                {sale.paymentMethod === 'mixed' && sale.payments && sale.payments.length > 0 && (
                  <div className="mt-4 p-4 bg-gray-50 dark:bg-neutral-800 rounded-lg border border-gray-200 dark:border-neutral-600">
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                      Desglose de Pago Mixto
                    </h4>
                    <div className="space-y-2">
                      {sale.payments.map((payment, index) => (
                        <div key={index} className="flex justify-between items-center py-2 px-3 bg-white dark:bg-neutral-700 rounded border border-gray-200 dark:border-neutral-600">
                          <div className="flex items-center space-x-3">
                            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
                              {getPaymentMethodLabel(payment.paymentType)}
                            </Badge>
                            {payment.notes && (
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {payment.notes}
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-gray-900 dark:text-white">
                            ${payment.amount.toLocaleString('es-CO')}
                          </span>
                        </div>
                      ))}
                      <div className="pt-2 border-t border-gray-200 dark:border-neutral-600">
                        <div className="flex justify-between items-center font-medium">
                          <span className="text-gray-900 dark:text-white">Total:</span>
                          <span className="text-emerald-600 dark:text-emerald-400">
                            ${sale.payments.reduce((sum, payment) => sum + payment.amount, 0).toLocaleString('es-CO')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="flex items-center space-x-3">
                    <div className="h-5 w-5 flex items-center justify-center">
                      <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-600 dark:text-gray-300">Estado</div>
                      <Badge className={`${getStatusColor(sale.status)} mt-1`}>
                        {getStatusLabel(sale.status)}
                      </Badge>
                    </div>
                  </div>
                  
                  {/* Motivo de cancelación */}
                  {sale.status === 'cancelled' && sale.cancellationReason && (
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-neutral-600">
                      <div className="flex items-start space-x-3">
                        <AlertTriangle className="h-5 w-5 text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Motivo de anulación:
                          </div>
                          <div className="text-sm text-gray-900 dark:text-white bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-3">
                            {sale.cancellationReason}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Products Table - Full Width */}
          <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700 shadow-sm mt-3 md:mt-4">
            <CardHeader className="pb-2">
              <CardTitle className="text-base md:text-lg text-gray-900 dark:text-white flex items-center">
                <Package className="h-4 w-4 md:h-5 md:w-5 mr-2 text-green-600" />
                Productos Vendidos
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3">
              <div className="overflow-x-auto overflow-y-auto" style={{ maxHeight: '500px' }}>
                <table className="w-full">
                  <thead className="sticky top-0 bg-white dark:bg-neutral-900 z-10">
                    <tr className="border-b border-gray-200 dark:border-neutral-600">
                      <th className="text-left py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Producto</th>
                      <th className="text-center py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Cantidad</th>
                      <th className="text-right py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Precio Unit.</th>
                      <th className="text-center py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Descuento</th>
                      <th className="text-right py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Subtotal</th>
                      <th className="text-left py-2 px-2 md:px-4 font-medium text-gray-700 dark:text-gray-300 text-xs md:text-sm">Vendedor</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sale.items.map((item, index) => {
                      const baseTotal = item.quantity * item.unitPrice
                      const discountAmount = item.discountType === 'percentage' 
                        ? (baseTotal * (item.discount || 0)) / 100 
                        : (item.discount || 0)
                      const subtotalAfterDiscount = Math.max(0, baseTotal - discountAmount)
                      
                      return (
                        <tr key={item.id} className={`border-b border-gray-600 ${index % 2 === 0 ? 'bg-gray-100 dark:bg-neutral-700' : ''}`}>
                          <td className="py-2 md:py-3 px-2 md:px-4">
                          <div className="font-medium text-gray-900 dark:text-white">{item.productName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">Ref: {item.productReferenceCode || 'N/A'}</div>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-center">
                            <span className="inline-flex items-center justify-center w-8 h-8 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded-full text-sm font-medium">
                              {item.quantity}
                            </span>
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-right text-gray-600 dark:text-gray-300">
                            {formatCurrency(item.unitPrice)}
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-center">
                            {item.discount && item.discount > 0 ? (
                              <div className="flex flex-col items-center">
                                <span className="text-red-500 font-medium">
                                  {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
                                </span>
                                {discountAmount > 0 && (
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    ({formatCurrency(discountAmount)})
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="py-2 md:py-3 px-2 md:px-4 text-right">
                            <div className="font-semibold text-gray-900 dark:text-white">
                              {formatCurrency(subtotalAfterDiscount)}
                            </div>
                          </td>
                          <td className="py-6 px-4">
                            <div className="text-sm text-gray-600 dark:text-gray-300">
                              {sale.sellerName || 'No especificado'}
                            </div>
                            {sale.sellerEmail && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {sale.sellerEmail}
                              </div>
                            )}
                        </td>
                      </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Cancel Form */}
          {showCancelForm && (
            <div ref={cancelFormRef} className="mt-4">
              <Card className="bg-gray-50 dark:bg-neutral-800 border-gray-200 dark:border-neutral-600">
              <CardHeader>
                <CardTitle className="text-lg text-red-500 dark:text-red-400 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2 text-red-400" />
                  Anular Factura
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Motivo de anulación: <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={(e) => setCancelReason(e.target.value)}
                    placeholder="Describa detalladamente el motivo de la anulación (mínimo 10 caracteres)..."
                    disabled={isCancelling}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 bg-white dark:bg-neutral-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    rows={4}
                  />
                  <div className="mt-1 text-right">
                    <span className={`text-xs ${cancelReason.length < 10 ? 'text-red-500' : 'text-gray-500'}`}>
                      {cancelReason.length}/10 caracteres mínimo
                    </span>
                  </div>
                </div>
                <div className="flex justify-end space-x-3">
                  <Button
                    onClick={() => setShowCancelForm(false)}
                    variant="outline"
                    disabled={isCancelling}
                    className="border-red-500 text-red-400 hover:bg-red-900/20 hover:border-red-400 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </Button>
                  <Button
                    onClick={handleCancel}
                      disabled={!cancelReason.trim() || cancelReason.trim().length < 10 || isCancelling}
                      className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
                  >
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      {isCancelling ? 'Anulando...' : 'Anular Factura'}
                  </Button>
                </div>
                
              </CardContent>
            </Card>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 md:p-6 border-t border-gray-200 dark:border-neutral-600 bg-gray-50 dark:bg-neutral-900 flex-shrink-0 sticky bottom-0" style={{ paddingBottom: `calc(max(56px, env(safe-area-inset-bottom)) + 1rem)` }}>
          <div className="flex space-x-3">
            {/* Botones de borrador comentados
            {sale.status === 'draft' && onEdit && (
              <Button
                onClick={() => {
                  onEdit(sale)
                  onClose()
                }}
                className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg"
              >
                <Edit className="h-4 w-4 mr-2" />
                Editar Borrador
              </Button>
            )}
            {sale.status === 'draft' && onFinalizeDraft && (
              <Button
                onClick={handleFinalizeDraft}
                disabled={isFinalizing}
                className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
              >
                <Receipt className="h-4 w-4 mr-2" />
                {isFinalizing ? 'Facturando...' : 'Facturar'}
              </Button>
            )}
            */}
            {/* No mostrar botón Anular para facturas de transferencias entre tiendas */}
            {sale.status !== 'cancelled' && sale.status !== 'draft' && !transfer && (
              <Button
                onClick={handleShowCancelForm}
                disabled={isCancelling}
                className="bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white border-0 font-medium px-6 py-2 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-200 rounded-lg disabled:from-gray-400 disabled:to-gray-500 disabled:transform-none disabled:shadow-none disabled:cursor-not-allowed"
              >
                <AlertTriangle className="h-4 w-4 mr-2" />
                Anular Factura
              </Button>
            )}
            {/* Mensaje informativo para facturas de transferencias */}
            {sale.status !== 'cancelled' && transfer && (
              <div className="text-xs text-cyan-600 dark:text-cyan-400 flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" />
                Esta factura solo puede anularse desde Transferencias
              </div>
            )}
          </div>
          
          <div className="flex space-x-3">
            <Button
              onClick={onClose}
              disabled={isCancelling || isFinalizing}
              className="bg-green-600 hover:bg-green-700 text-white font-medium px-6 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cerrar
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}