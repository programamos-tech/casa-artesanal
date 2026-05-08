import { PaymentRecord, Sale } from '@/types'
import { StoresService } from '@/lib/stores-service'
import { getCurrentUserStoreId } from '@/lib/store-helper'

/**
 * Abre el diálogo de impresión con el ticket HTML de la factura (misma lógica que la lista de ventas).
 */
export async function printSaleTicket(sale: Sale): Promise<void> {
  try {
  const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
  const storeIdForTicket = sale.storeId || getCurrentUserStoreId()

  let currentStore
  if (!storeIdForTicket || storeIdForTicket === MAIN_STORE_ID) {
    currentStore = await StoresService.getMainStore()
  } else {
    currentStore = await StoresService.getStoreById(storeIdForTicket)
  }

  const storeName = currentStore?.name ?? 'ZONA T'
  if (!currentStore) {
    currentStore = {
      id: MAIN_STORE_ID,
      name: storeName,
      nit: '',
      logo: '/logo.ya.png',
      address: '',
      city: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  }

  const client = {
    id: sale.clientId,
    name: sale.clientName,
    email: 'N/A',
    phone: 'N/A',
    document: 'N/A',
    address: 'N/A',
    city: 'N/A',
    state: 'N/A',
    type: 'consumidor_final' as const,
    creditLimit: 0,
    currentDebt: 0,
    status: 'active' as const,
    nit: 'N/A',
    createdAt: sale.createdAt
  }

  const printWindow = window.open('', '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes')
  if (!printWindow) {
    alert('No se pudo abrir la ventana de impresión. Verifica que los pop-ups estén habilitados.')
    return
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount)
  }

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

  const showCreditOnTicket =
    sale.paymentMethod === 'credit' ||
    (sale.paymentMethod === 'mixed' && sale.payments?.some((p) => p.paymentType === 'credit'))

  let creditBlockHtml = ''
  if (showCreditOnTicket) {
    try {
      const { CreditsService } = await import('@/lib/credits-service')
      let credit = await CreditsService.getCreditBySaleId(sale.id)
      if (!credit && sale.invoiceNumber) {
        const inv = sale.invoiceNumber.replace(/^#\s*/, '').trim()
        credit = await CreditsService.getCreditByInvoiceNumber(sale.invoiceNumber)
        if (!credit && inv !== sale.invoiceNumber) {
          credit = await CreditsService.getCreditByInvoiceNumber(inv)
        }
      }
      if (credit) {
        let history: PaymentRecord[] = []
        try {
          history = await CreditsService.getPaymentHistory(credit.id)
        } catch {
          history = []
        }
        const active = history.filter((p) => p.status !== 'cancelled')
        const sorted = [...active].sort(
          (a, b) => new Date(a.paymentDate).getTime() - new Date(b.paymentDate).getTime()
        )
        const dueStr = credit.dueDate
          ? new Date(credit.dueDate).toLocaleDateString('es-CO', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })
          : '—'

        const abonosHtml =
          sorted.length > 0
            ? sorted
                .map((p, i) => {
                  const d = new Date(p.paymentDate)
                  const dateStr = `${d.toLocaleDateString('es-CO')} ${d.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}`
                  const desc = p.description ? `<div class="abono-desc">${escHtml(p.description)}</div>` : ''
                  return `
                  <div class="abono-item">
                    <div class="detail-row"><span><strong>#${i + 1}</strong></span><span>${formatCurrency(p.amount)}</span></div>
                    <div class="detail-row abono-meta"><span>${dateStr}</span><span>${payMethodLabel(p.paymentMethod)}</span></div>
                    <div class="detail-row abono-meta"><span>Registró: ${escHtml(p.userName || '—')}</span><span></span></div>
                    ${desc}
                  </div>`
                })
                .join('')
            : `<div class="credit-empty">Sin abonos registrados aún.</div>`

        creditBlockHtml = `
            <div class="credit-section">
              <div class="client-title">CRÉDITO Y ABONOS</div>
              <div class="detail-row"><span>Total crédito</span><span><strong>${formatCurrency(credit.totalAmount)}</strong></span></div>
              <div class="detail-row"><span>Total pagado</span><span>${formatCurrency(credit.paidAmount)}</span></div>
              <div class="detail-row"><span>Saldo pendiente</span><span><strong>${formatCurrency(credit.pendingAmount)}</strong></span></div>
              <div class="detail-row"><span>Estado</span><span>${creditStatusLabel(credit.status)}</span></div>
              <div class="detail-row"><span>Vencimiento</span><span>${dueStr}</span></div>
              <div class="abonos-title">Historial de abonos</div>
              ${abonosHtml}
            </div>`
      } else {
        creditBlockHtml = `
            <div class="credit-section">
              <div class="client-title">CRÉDITO</div>
              <div class="credit-empty">No se encontró el registro de crédito para esta venta.</div>
            </div>`
      }
    } catch {
      creditBlockHtml = `
            <div class="credit-section">
              <div class="client-title">CRÉDITO</div>
              <div class="credit-empty">No se pudo cargar el historial del crédito.</div>
            </div>`
    }
  }

  const invoiceHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>${storeName} - Factura</title>
          <style>
            body { 
              font-family: 'Courier New', monospace; 
              margin: 0; 
              padding: 5px; 
              color: #000; 
              background: #fff;
              font-size: 12px;
              line-height: 1.2;
            }
            .ticket { 
              color: #000 !important;
            }
            .ticket * {
              color: #000 !important;
            }
            .product-details, .product-details *, .product-details span, .product-details strong {
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-ref, .product-ref *, .product-ref strong {
              color: #000 !important;
              font-weight: bold !important;
            }
            [style*="color: #d32f2f"], [style*="color:#d32f2f"] {
              color: #d32f2f !important;
            }
            .ticket { 
              width: 300px; 
              margin: 0 auto; 
              border: 1px solid #000;
            }
            .header { 
              text-align: center; 
              padding: 10px 5px; 
              border-bottom: 1px dashed #000;
            }
            .logo {
              width: 64px;
              height: 64px;
              border-radius: 50%;
              object-fit: cover;
              margin: 0 auto 6px auto;
              display: block;
            }
            .company-name { 
              font-size: 16px; 
              font-weight: bold; 
              margin-bottom: 5px;
            }
            .company-info { 
              font-size: 10px; 
              line-height: 1.1;
              color: #000;
            }
            .invoice-title { 
              text-align: center; 
              font-size: 14px; 
              font-weight: bold; 
              padding: 8px 0;
              border-bottom: 1px dashed #000;
            }
            .invoice-details { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .detail-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0; 
              font-size: 11px;
              color: #000;
            }
            .detail-row strong {
              font-weight: bold;
              color: #000;
            }
            .client-info { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .client-title { 
              font-weight: bold; 
              margin-bottom: 5px; 
              font-size: 12px;
              color: #000;
            }
            .client-details { 
              font-size: 11px; 
              line-height: 1.3;
              font-weight: 600;
              color: #000;
            }
            .products { 
              border-bottom: 1px dashed #000;
            }
            .product-item { 
              padding: 5px; 
              border-bottom: 1px dotted #ccc;
            }
            .product-name { 
              font-weight: bold; 
              font-size: 11px; 
              margin-bottom: 2px;
              color: #000;
            }
            .product-details { 
              display: flex; 
              justify-content: space-between; 
              font-size: 11px;
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-details span {
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-details * {
              color: #000 !important;
              font-weight: bold !important;
            }
            .product-price {
              font-weight: bold;
              color: #000;
              font-size: 11px;
            }
            .product-ref { 
              font-size: 10px; 
              color: #000 !important; 
              margin-top: 2px;
              font-weight: bold !important;
            }
            .product-ref * {
              color: #000 !important;
              font-weight: bold !important;
            }
            .summary { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .summary-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 3px 0; 
              font-size: 11px;
              font-weight: bold;
              color: #000;
            }
            .subtotal-row {
              background-color: #f5f5f5;
              padding: 4px 5px;
              margin: 5px 0;
              border: 1px solid #000;
            }
            .total-row { 
              border-top: 2px solid #000; 
              padding-top: 8px; 
              margin-top: 8px; 
              font-weight: bold; 
              font-size: 14px;
              color: #000;
            }
            .total-row span {
              font-size: 14px;
              font-weight: bold;
            }
            .payment-info { 
              padding: 8px 5px; 
              border-bottom: 1px dashed #000;
            }
            .payment-info .detail-row {
              font-weight: 600;
              color: #000;
            }
            .credit-section {
              padding: 8px 5px;
              border-bottom: 1px dashed #000;
              font-size: 10px;
              color: #000;
            }
            .credit-section .client-title {
              margin-bottom: 6px;
              font-size: 11px;
            }
            .credit-section .detail-row {
              font-size: 10px;
              font-weight: 600;
            }
            .abonos-title {
              margin-top: 8px;
              margin-bottom: 4px;
              font-size: 10px;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 0.02em;
            }
            .abono-item {
              padding: 6px 0;
              border-top: 1px dotted #999;
            }
            .abono-item .detail-row {
              font-size: 10px;
              font-weight: 600;
            }
            .abono-meta {
              font-size: 9px !important;
              font-weight: 600 !important;
              color: #333 !important;
            }
            .abono-desc {
              margin-top: 3px;
              font-size: 9px;
              line-height: 1.25;
              color: #333;
            }
            .credit-empty {
              margin-top: 4px;
              font-size: 10px;
              font-style: italic;
              color: #333;
            }
            .footer { 
              text-align: center; 
              padding: 10px 5px; 
              font-size: 10px; 
              line-height: 1.3;
              color: #000;
              font-weight: 600;
            }
            .separator { 
              text-align: center; 
              margin: 5px 0; 
              font-size: 10px;
            }
            @media print {
              body { margin: 0; padding: 0; }
              .ticket { border: none; }
              .no-print { display: none !important; }
            }
            @page {
              margin: 0;
              size: 80mm auto;
            }
            @media print {
              @page {
                margin: 0;
                size: 80mm auto;
              }
              body {
                margin: 0 !important;
                padding: 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .ticket {
                border: none !important;
                margin: 0 !important;
                padding: 0 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="ticket">
            <div class="header">
              <img src="${currentStore.logo || '/logo.ya.png'}" class="logo" alt="${currentStore.name}" />
              <div class="company-name">${currentStore.name}</div>
              <div class="company-info">
                ${currentStore.nit ? `<strong>NIT ${currentStore.nit}</strong><br>` : ''}
                ${currentStore.address ? `<strong>${currentStore.address}${currentStore.city ? `, ${currentStore.city}` : ''}</strong><br>` : ''}
                ${currentStore.phone ? `<strong>Tel: ${currentStore.phone}</strong>` : ''}
              </div>
            </div>

            <div class="invoice-title">FACTURA DE VENTA</div>

            <div class="invoice-details">
              <div class="detail-row">
                <span><strong>No. Factura:</strong></span>
                <span><strong>${sale.invoiceNumber}</strong></span>
              </div>
              <div class="detail-row">
                <span><strong>Fecha:</strong></span>
                <span><strong>${new Date(sale.createdAt).toLocaleDateString('es-CO')}</strong></span>
              </div>
              <div class="detail-row">
                <span><strong>Hora:</strong></span>
                <span><strong>${new Date(sale.createdAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}</strong></span>
              </div>
            </div>

            <div class="client-info">
              <div class="client-title">CLIENTE:</div>
              <div class="client-details">
                <strong>${client.name}</strong><br>
                ${client.nit && client.nit !== 'N/A' ? `<strong>NIT: ${client.nit}</strong>` : ''}
              </div>
            </div>

            <div class="products">
              ${sale.items
                .map(item => {
                  const baseTotal = item.quantity * item.unitPrice
                  const discountAmount =
                    item.discountType === 'percentage'
                      ? (baseTotal * (item.discount || 0)) / 100
                      : item.discount || 0
                  const subtotalAfterDiscount = Math.max(0, baseTotal - discountAmount)

                  return `
                  <div class="product-item">
                    <div class="product-name">${item.productName}</div>
                    <div class="product-details" style="color: #000 !important; font-weight: bold !important;">
                      <span style="color: #000 !important; font-weight: bold !important;"><strong style="color: #000 !important; font-weight: bold !important;">${item.quantity} x ${formatCurrency(item.unitPrice)}</strong></span>
                      <span class="product-price" style="color: #000 !important; font-weight: bold !important;">${formatCurrency(subtotalAfterDiscount)}</span>
                    </div>
                    ${
                      item.discount && item.discount > 0
                        ? `
                      <div style="font-size: 9px; color: #d32f2f !important;">
                        <strong>Desc: ${item.discountType === 'percentage' ? `${item.discount}%` : formatCurrency(item.discount)}</strong>
                      </div>
                    `
                        : ''
                    }
                    <div class="product-ref" style="color: #000 !important; font-weight: bold !important;"><strong style="color: #000 !important; font-weight: bold !important;">Ref: ${item.productReferenceCode || 'N/A'}</strong></div>
                  </div>
                `
                })
                .join('')}
            </div>

            <div class="summary">
              <div class="summary-row subtotal-row">
                <span><strong>Subtotal:</strong></span>
                <span><strong>${formatCurrency(
                  sale.items.reduce((sum, item) => {
                    const baseTotal = item.quantity * item.unitPrice
                    const discountAmount =
                      item.discountType === 'percentage'
                        ? (baseTotal * (item.discount || 0)) / 100
                        : item.discount || 0
                    return sum + Math.max(0, baseTotal - discountAmount)
                  }, 0)
                )}</strong></span>
              </div>
              ${
                sale.discount && sale.discount > 0.001
                  ? `
                <div class="summary-row" style="color: #d32f2f;">
                  <span>Descuento:</span>
                  <span>${sale.discountType === 'percentage' ? `-${sale.discount}%` : `-${formatCurrency(sale.discount)}`}</span>
                </div>
              `
                  : ''
              }
              ${
                sale.tax && sale.tax > 0
                  ? `
                <div class="summary-row">
                  <span>IVA (19%):</span>
                  <span>${formatCurrency(sale.tax)}</span>
                </div>
              `
                  : ''
              }
              <div class="summary-row total-row">
                <span><strong>TOTAL:</strong></span>
                <span><strong>${formatCurrency(sale.total)}</strong></span>
              </div>
            </div>

            <div class="payment-info">
              <div class="detail-row">
                <span>Método de Pago:</span>
                <span>${sale.paymentMethod === 'cash' ? 'Efectivo' : sale.paymentMethod === 'credit' ? 'Crédito' : sale.paymentMethod === 'nequi' ? 'Nequi' : sale.paymentMethod === 'bancolombia' ? 'Bancolombia' : sale.paymentMethod === 'transfer' ? 'Transferencia (otro / sin canal)' : sale.paymentMethod === 'card' ? 'Tarjeta' : sale.paymentMethod === 'warranty' ? 'Garantía' : 'Mixto'}</span>
              </div>
              ${
                sale.paymentMethod === 'mixed' && sale.payments && sale.payments.length > 0
                  ? `
                <div style="margin-top: 8px;">
                  <div style="font-weight: bold; margin-bottom: 4px;">Desglose de Pago:</div>
                  ${sale.payments
                    .map(
                      payment => `
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px; font-size: 11px;">
                      <span>${payment.paymentType === 'cash' ? 'Efectivo' : payment.paymentType === 'nequi' ? 'Nequi' : payment.paymentType === 'bancolombia' ? 'Bancolombia' : payment.paymentType === 'transfer' ? 'Transferencia (otro / sin canal)' : payment.paymentType === 'card' ? 'Tarjeta' : payment.paymentType === 'credit' ? 'Crédito' : 'Garantía'}${payment.notes ? ` (${payment.notes})` : ''}:</span>
                      <span>${formatCurrency(payment.amount)}</span>
                    </div>
                  `
                    )
                    .join('')}
                </div>
              `
                  : ''
              }
              <div class="detail-row">
                <span>Estado:</span>
                <span>${sale.status === 'completed' ? 'Completada' : sale.status === 'pending' ? 'Pendiente' : 'Anulada'}</span>
              </div>
            </div>

            ${creditBlockHtml}

            <div class="footer">
              <div class="separator">═══════════════════════════════</div>
              <div><strong>Factura: ${sale.invoiceNumber}</strong></div>
              <div>¡Gracias por su compra!</div>
              <div>${storeName}</div>
              <div class="separator">═══════════════════════════════</div>
            </div>
          </div>
        </body>
        </html>
      `

  printWindow.document.write(invoiceHTML)
  printWindow.document.close()

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 500)
  }
  } catch {
    alert('Error al generar la factura. Intenta nuevamente.')
  }
}
