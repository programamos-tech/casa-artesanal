import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

/**
 * POST /api/credits - Crear crédito (usa service role para evitar fallos por RLS con vendedores)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      saleId,
      clientId,
      clientName,
      invoiceNumber,
      totalAmount,
      paidAmount = 0,
      pendingAmount,
      status = 'pending',
      dueDate,
      lastPaymentAmount,
      lastPaymentDate,
      lastPaymentUser,
      createdBy,
      createdByName,
      storeId
    } = body

    if (!clientId || !clientName || invoiceNumber == null || totalAmount == null || pendingAmount == null) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: clientId, clientName, invoiceNumber, totalAmount, pendingAmount' },
        { status: 400 }
      )
    }

    const MAIN_STORE_ID = '00000000-0000-0000-0000-000000000001'
    const resolvedStoreId = storeId || MAIN_STORE_ID

    // Una venta → un crédito activo (evita duplicados por reintentos)
    if (saleId) {
      const { data: existing } = await supabaseAdmin
        .from('credits')
        .select('*')
        .eq('sale_id', saleId)
        .neq('status', 'cancelled')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (existing) {
        return NextResponse.json({
          id: existing.id,
          saleId: existing.sale_id,
          clientId: existing.client_id,
          clientName: existing.client_name,
          invoiceNumber: existing.invoice_number,
          totalAmount: existing.total_amount,
          paidAmount: existing.paid_amount,
          pendingAmount: existing.pending_amount,
          status: existing.status,
          dueDate: existing.due_date,
          lastPaymentAmount: existing.last_payment_amount,
          lastPaymentDate: existing.last_payment_date,
          lastPaymentUser: existing.last_payment_user,
          createdBy: existing.created_by,
          createdByName: existing.created_by_name,
          storeId: existing.store_id || undefined,
          createdAt: existing.created_at,
          updatedAt: existing.updated_at
        })
      }
    }

    const { data, error } = await supabaseAdmin
      .from('credits')
      .insert([{
        sale_id: saleId ?? null,
        client_id: clientId,
        client_name: clientName,
        invoice_number: String(invoiceNumber),
        total_amount: Number(totalAmount),
        paid_amount: Number(paidAmount),
        pending_amount: Number(pendingAmount),
        status: status || 'pending',
        due_date: dueDate ?? null,
        last_payment_amount: lastPaymentAmount ?? null,
        last_payment_date: lastPaymentDate ?? null,
        last_payment_user: lastPaymentUser ?? null,
        created_by: createdBy ?? null,
        created_by_name: createdByName ?? null,
        store_id: resolvedStoreId
      }])
      .select('*')
      .single()

    if (error) {
      console.error('[API credits] Insert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const credit = {
      id: data.id,
      saleId: data.sale_id,
      clientId: data.client_id,
      clientName: data.client_name,
      invoiceNumber: data.invoice_number,
      totalAmount: data.total_amount,
      paidAmount: data.paid_amount,
      pendingAmount: data.pending_amount,
      status: data.status,
      dueDate: data.due_date,
      lastPaymentAmount: data.last_payment_amount,
      lastPaymentDate: data.last_payment_date,
      lastPaymentUser: data.last_payment_user,
      createdBy: data.created_by,
      createdByName: data.created_by_name,
      storeId: data.store_id || undefined,
      createdAt: data.created_at,
      updatedAt: data.updated_at
    }

    return NextResponse.json(credit)
  } catch (err) {
    console.error('[API credits] Error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Error al crear el crédito' },
      { status: 500 }
    )
  }
}
