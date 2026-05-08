import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

const MAX_BYTES = 5 * 1024 * 1024

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No se proporcionó ningún archivo' }, { status: 400 })
    }

    if (!file.type.startsWith('image/')) {
      return NextResponse.json({ error: 'El archivo debe ser una imagen' }, { status: 400 })
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: 'La imagen no debe superar los 5MB' }, { status: 400 })
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp']
    const finalExt = validExtensions.includes(fileExt) ? fileExt : 'jpg'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${finalExt}`
    const filePath = `catalog/${fileName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await supabaseAdmin.storage
      .from('product-images')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      console.error('upload-product-image:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Error al subir la imagen' },
        { status: 500 }
      )
    }

    const { data: urlData } = supabaseAdmin.storage.from('product-images').getPublicUrl(filePath)

    if (!urlData?.publicUrl) {
      return NextResponse.json({ error: 'No se pudo obtener la URL pública del archivo' }, { status: 500 })
    }

    return NextResponse.json({ url: urlData.publicUrl, path: filePath })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Error al procesar la imagen'
    console.error('upload-product-image:', error)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
