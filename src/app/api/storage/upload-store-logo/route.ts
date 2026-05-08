import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json(
        { error: 'No se proporcionó ningún archivo' },
        { status: 400 }
      )
    }

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      )
    }

    // Validar tamaño (máximo 2MB)
    if (file.size > 2 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'La imagen no debe superar los 2MB' },
        { status: 400 }
      )
    }

    // Generar nombre único para el archivo
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png'
    // Asegurar que la extensión sea válida
    const validExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg']
    const finalExt = validExtensions.includes(fileExt) ? fileExt : 'png'
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${finalExt}`
    const filePath = `store-logos/${fileName}`

    // Convertir File a ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    // Subir archivo a Supabase Storage usando supabaseAdmin (bypass RLS)
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('store-logos')
      .upload(filePath, buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type
      })

    if (uploadError) {
      console.error('Error uploading to storage:', uploadError)
      return NextResponse.json(
        { error: uploadError.message || 'Error al subir la imagen' },
        { status: 500 }
      )
    }

    // Obtener URL pública del archivo
    const { data: urlData } = supabaseAdmin.storage
      .from('store-logos')
      .getPublicUrl(filePath)

    console.log('Upload successful, file path:', filePath)
    console.log('Public URL data:', urlData)

    if (!urlData?.publicUrl) {
      return NextResponse.json(
        { error: 'No se pudo obtener la URL pública del archivo' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      url: urlData.publicUrl,
      path: filePath
    })
  } catch (error: any) {
    console.error('Error in upload-store-logo API:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar la imagen' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const filePath = searchParams.get('path')

    if (!filePath) {
      return NextResponse.json(
        { error: 'No se proporcionó la ruta del archivo' },
        { status: 400 }
      )
    }

    // Extraer el nombre del archivo de la ruta completa
    const fileName = filePath.split('store-logos/')[1]?.split('?')[0]
    if (!fileName) {
      return NextResponse.json(
        { error: 'Ruta de archivo inválida' },
        { status: 400 }
      )
    }

    // Eliminar archivo de Supabase Storage
    const { error: deleteError } = await supabaseAdmin.storage
      .from('store-logos')
      .remove([`store-logos/${fileName}`])

    if (deleteError) {
      console.error('Error deleting from storage:', deleteError)
      return NextResponse.json(
        { error: deleteError.message || 'Error al eliminar la imagen' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in delete-store-logo API:', error)
    return NextResponse.json(
      { error: error.message || 'Error al procesar la eliminación' },
      { status: 500 }
    )
  }
}
