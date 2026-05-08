import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import { SUPPLIER_INVOICE_MAX_IMAGE_BYTES } from '@/lib/supplier-invoice-image-limits'

const MAX_BYTES = SUPPLIER_INVOICE_MAX_IMAGE_BYTES

export async function POST(request: NextRequest) {
  try {
    if (process.env.VERCEL === '1' && !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error:
            'Falta SUPABASE_SERVICE_ROLE_KEY en el servidor. Configúrala en Vercel (mismo proyecto Supabase que NEXT_PUBLIC_SUPABASE_URL).',
        },
        { status: 503 }
      )
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen no debe superar los 2 MB.' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    const typeExt =
      file.type === 'image/jpeg' || file.type === 'image/jpg'
        ? 'jpg'
        : file.type === 'image/png'
          ? 'png'
          : file.type === 'image/webp'
            ? 'webp'
            : file.type === 'image/gif'
              ? 'gif'
              : null
    const finalExt =
      typeExt && validExtensions.includes(typeExt)
        ? typeExt
        : validExtensions.includes(fileExt)
          ? fileExt
          : 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${finalExt}`
    const filePath = `payments/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('supplier-invoices')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('upload-supplier-payment-receipt:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Error al subir la imagen' },
        { status: 500 }
      )
    }

    const { data: urlData } = supabaseAdmin.storage.from('supplier-invoices').getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'No se pudo obtener la URL pública del archivo' }, { status: 500 })
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al procesar la imagen'
    console.error('upload-supplier-payment-receipt:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
