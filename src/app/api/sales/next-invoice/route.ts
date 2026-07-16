import { NextRequest, NextResponse } from 'next/server'
import { SalesService } from '@/lib/sales-service'

/**
 * GET /api/sales/next-invoice?storeId=...
 * Siguiente número de factura con service role (evita colisiones por RLS).
 */
export async function GET(request: NextRequest) {
  try {
    const storeId = request.nextUrl.searchParams.get('storeId') || undefined
    const invoiceNumber = await SalesService.getNextInvoiceNumber(storeId || undefined)
    return NextResponse.json({ invoiceNumber })
  } catch (err) {
    console.error('[API next-invoice]', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'No se pudo obtener el número de factura' },
      { status: 500 }
    )
  }
}
