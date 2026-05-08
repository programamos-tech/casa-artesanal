'use client'

import { Sale, CompanyConfig, Client } from '@/types'
import { formatCurrency } from '@/lib/utils'

interface InvoiceTemplateProps {
  sale: Sale
  company: CompanyConfig
  client: Client
}

export function InvoiceTemplate({ sale, company, client }: InvoiceTemplateProps) {
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
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

  const getInvoiceNumber = (sale: Sale) => {
    if (sale.invoiceNumber?.toString().startsWith('#')) {
      return sale.invoiceNumber.toString()
    }
    return `#${sale.invoiceNumber?.toString().padStart(3, '0') || '000'}`
  }

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Efectivo/Contado'
      case 'credit':
        return 'Crédito'
      case 'transfer':
        return 'Transferencia'
      case 'warranty':
        return 'Garantía'
      case 'mixed':
        return 'Mixto'
      default:
        return method
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completada'
      case 'pending':
        return 'Pendiente'
      case 'cancelled':
        return 'Anulada'
      default:
        return status
    }
  }

  return (
    <div className="invoice-template bg-white text-black p-8 max-w-4xl mx-auto">
      <style jsx>{`
        @media print {
          .invoice-template {
            margin: 0;
            padding: 20px;
            max-width: none;
            box-shadow: none;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Header */}
      <div className="flex justify-between items-start mb-8 border-b-2 border-gray-800 pb-6">
        <div className="flex-1">
          {company.logo && (
            <img 
              src={company.logo} 
              alt={company.name}
              className="w-20 h-20 rounded-full object-cover mb-4"
            />
          )}
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.name}</h1>
          <div className="text-sm text-gray-700 space-y-1">
            <p><strong>NIT:</strong> {company.nit}</p>
            <p><strong>Dirección:</strong> {company.address}</p>
            <p><strong>Teléfono:</strong> {company.phone}</p>
            <p><strong>Email:</strong> {company.email}</p>
            {company.dianResolution && (
              <p><strong>{company.dianResolution}</strong></p>
            )}
            {company.numberingRange && (
              <p><strong>Rango autorizado:</strong> {company.numberingRange}</p>
            )}
          </div>
        </div>
        
        <div className="text-right">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">FACTURA DE VENTA</h2>
          <div className="text-sm space-y-1">
            <p><strong>No. Factura:</strong> {getInvoiceNumber(sale)}</p>
            <p><strong>Fecha:</strong> {formatDate(sale.createdAt)}</p>
            <p><strong>Hora:</strong> {formatDateTime(sale.createdAt).split(' ')[1]}</p>
          </div>
        </div>
      </div>

      {/* Información del Cliente */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">
          INFORMACIÓN DEL CLIENTE
        </h3>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <p><strong>Nombre:</strong> {client.name}</p>
            <p><strong>NIT:</strong> {client.nit || 'N/A'}</p>
            <p><strong>Email:</strong> {client.email || 'N/A'}</p>
          </div>
          <div>
            <p><strong>Teléfono:</strong> {client.phone || 'N/A'}</p>
            <p><strong>Dirección:</strong> {client.address || 'N/A'}</p>
            <p><strong>Tipo:</strong> {
              client.type === 'mayorista' ? 'Mayorista' : 
              client.type === 'minorista' ? 'Minorista' : 'Consumidor Final'
            }</p>
          </div>
        </div>
      </div>

      {/* Productos */}
      <div className="mb-8">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 border-b border-gray-300 pb-2">
          DETALLE DE PRODUCTOS
        </h3>
        <table className="w-full border-collapse border border-gray-400">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-gray-400 px-4 py-2 text-left">Producto</th>
              <th className="border border-gray-400 px-4 py-2 text-center">Cantidad</th>
              <th className="border border-gray-400 px-4 py-2 text-right">Precio Unit.</th>
              <th className="border border-gray-400 px-4 py-2 text-center">Descuento</th>
              <th className="border border-gray-400 px-4 py-2 text-right">Subtotal</th>
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
                <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-50' : ''}>
                  <td className="border border-gray-400 px-4 py-2">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-sm text-gray-600">Ref: {item.productReferenceCode || 'N/A'}</div>
                  </td>
                  <td className="border border-gray-400 px-4 py-2 text-center">{item.quantity}</td>
                  <td className="border border-gray-400 px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
                  <td className="border border-gray-400 px-4 py-2 text-center">
                    {item.discount && item.discount > 0 ? (
                      <span className="text-red-600">
                        {item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="border border-gray-400 px-4 py-2 text-right font-medium">
                    {formatCurrency(subtotalAfterDiscount)}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Resumen Financiero */}
      <div className="mb-8">
        <div className="flex justify-end">
          <div className="w-80">
            <div className="border border-gray-400 p-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">RESUMEN FINANCIERO</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal de productos:</span>
                  <span>{formatCurrency(sale.items.reduce((sum, item) => {
                    const baseTotal = item.quantity * item.unitPrice
                    const discountAmount = item.discountType === 'percentage' 
                      ? (baseTotal * (item.discount || 0)) / 100 
                      : (item.discount || 0)
                    return sum + Math.max(0, baseTotal - discountAmount)
                  }, 0))}</span>
                </div>

                {sale.discount && sale.discount > 0.001 && (
                  <div className="flex justify-between text-red-600">
                    <span>Descuento por total:</span>
                    <span>
                      {sale.discountType === 'percentage' 
                        ? `-${sale.discount}%` 
                        : `-${formatCurrency(sale.discount)}`
                      }
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-gray-300 pt-2">
                  <span>Subtotal después de descuentos:</span>
                  <span>{formatCurrency(sale.subtotal)}</span>
                </div>

                {sale.tax && sale.tax > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>IVA (19%):</span>
                    <span>{formatCurrency(sale.tax)}</span>
                  </div>
                )}

                <div className="flex justify-between border-t-2 border-gray-800 pt-2 font-bold text-lg">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(sale.total)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Información Adicional */}
      <div className="mb-8">
        <div className="grid grid-cols-2 gap-8 text-sm">
          <div>
            <p><strong>Método de Pago:</strong> {getPaymentMethodLabel(sale.paymentMethod)}</p>
            <p><strong>Estado:</strong> {getStatusLabel(sale.status)}</p>
          </div>
          <div>
            <p><strong>Vendedor:</strong> {sale.sellerName || 'No especificado'}</p>
            {sale.sellerEmail && (
              <p><strong>Email Vendedor:</strong> {sale.sellerEmail}</p>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="border-t-2 border-gray-800 pt-6 text-center text-sm text-gray-600">
        <p>Esta factura cumple con los requisitos legales establecidos por la DIAN</p>
        <p>Gracias por su compra - {company.name}</p>
      </div>
    </div>
  )
}
