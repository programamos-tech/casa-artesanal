'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Upload, FileText, AlertCircle, CheckCircle, Package } from 'lucide-react'
import { toast } from 'sonner'

interface CSVImportModalProps {
  isOpen: boolean
  onClose: () => void
  onImport: (products: any[]) => Promise<boolean>
}

interface ParsedProduct {
  reference: string
  name: string
  cost: number
  stock: number
  brand: string
  price: number
}

export function CSVImportModal({ isOpen, onClose, onImport }: CSVImportModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Función para detectar marca del nombre del producto
  const detectBrand = (productName: string): string => {
    const brands = [
      'Samsung', 'Apple', 'iPhone', 'Motorola', 'Moto', 'Xiaomi', 'Redmi', 'Huawei', 
      'Oppo', 'Vivo', 'Nokia', 'ZTE', 'Honor', 'Infinix', 'Tecno', 'Realme',
      'JBL', 'Sony', 'LG', 'Panasonic', 'Philips', 'Marshall', 'Bose',
      'Kingston', 'SanDisk', 'Transcend', 'Corsair', 'HyperX',
      'Logitech', 'Razer', 'SteelSeries', 'Corsair',
      'Stanley', 'Thermos', 'Contigo'
    ]

    const name = productName.toLowerCase()
    for (const brand of brands) {
      if (name.includes(brand.toLowerCase())) {
        return brand
      }
    }
    return 'Genérico'
  }

  // Función para calcular precio de venta (costo + 30%)
  const calculatePrice = (cost: number): number => {
    return Math.round(cost * 1.3)
  }

  // Función para parsear CSV
  const parseCSV = (csvText: string): ParsedProduct[] => {
    const lines = csvText.split('\n').filter(line => line.trim())
    const products: ParsedProduct[] = []
    const newErrors: string[] = []

    // Saltar la primera línea (headers)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      // Parsear línea separada por punto y coma
      const columns = line.split(';')
      
      if (columns.length < 4) {
        newErrors.push(`Línea ${i + 1}: Formato incorrecto. Se esperan 4 columnas.`)
        continue
      }

      const [reference, description, costStr, stockStr] = columns

      // Validar referencia
      if (!reference || !reference.trim()) {
        newErrors.push(`Línea ${i + 1}: Referencia requerida.`)
        continue
      }

      // Validar descripción
      if (!description || !description.trim()) {
        newErrors.push(`Línea ${i + 1}: Descripción requerida.`)
        continue
      }

      // Validar y parsear costo
      const cost = parseFloat(costStr.replace(/[^\d.-]/g, ''))
      if (isNaN(cost) || cost < 0) {
        newErrors.push(`Línea ${i + 1}: Costo inválido.`)
        continue
      }

      // Validar y parsear stock
      const stock = parseInt(stockStr.replace(/[^\d]/g, ''))
      if (isNaN(stock) || stock < 0) {
        newErrors.push(`Línea ${i + 1}: Stock inválido.`)
        continue
      }

      const brand = detectBrand(description)
      const price = calculatePrice(cost)

      products.push({
        reference: reference.trim(),
        name: description.trim(),
        cost,
        stock,
        brand,
        price
      })
    }

    setErrors(newErrors)
    return products
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('Por favor selecciona un archivo CSV válido')
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const csvText = e.target?.result as string
      const products = parseCSV(csvText)
      setParsedProducts(products)
    }
    reader.readAsText(file, 'UTF-8')
  }

  const handleImport = async () => {
    if (parsedProducts.length === 0) {
      toast.error('No hay productos para importar')
      return
    }

    if (errors.length > 0) {
      toast.error('Corrige los errores antes de importar')
      return
    }

    setIsLoading(true)
    try {
      const success = await onImport(parsedProducts)
      if (success) {
        toast.success(`${parsedProducts.length} productos importados exitosamente`)
        handleClose()
      } else {
        toast.error('Error importando productos')
      }
    } catch (error) {
      // Error silencioso en producción
      toast.error('Error importando productos')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setParsedProducts([])
    setErrors([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-950 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[95vh] overflow-hidden flex flex-col border border-gray-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 bg-cyan-50 dark:bg-cyan-900/20 border-b border-cyan-200 dark:border-cyan-800">
          <div className="flex items-center space-x-3">
            <Upload className="h-6 w-6 text-cyan-600 dark:text-cyan-400" />
            <div>
              <h2 className="text-xl font-semibold text-cyan-800 dark:text-cyan-200">
                Importar Productos desde CSV
              </h2>
              <p className="text-sm text-cyan-700 dark:text-cyan-300">
                Importa productos masivamente desde un archivo CSV
              </p>
            </div>
          </div>
          <Button
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 hover:bg-cyan-100 dark:hover:bg-cyan-800/30"
          >
            <X className="h-5 w-5 text-cyan-600 dark:text-cyan-400 hover:text-cyan-800 dark:hover:text-cyan-200" />
          </Button>
        </div>

        <div className="p-6 flex-1 bg-white dark:bg-neutral-950 overflow-y-auto">
          <div className="space-y-6">
            {/* Instrucciones */}
            <Card className="bg-cyan-50 dark:bg-cyan-900/20 border-cyan-200 dark:border-cyan-800">
              <CardHeader>
                <CardTitle className="text-lg text-cyan-800 dark:text-cyan-200 flex items-center">
                  <FileText className="h-5 w-5 mr-2" />
                  Formato del Archivo CSV
                </CardTitle>
              </CardHeader>
              <CardContent className="text-cyan-700 dark:text-cyan-300">
                <p className="mb-2">El archivo CSV debe tener el siguiente formato:</p>
                <div className="bg-white dark:bg-neutral-900 p-3 rounded border font-mono text-sm">
                  Referencia;Descripción;Precio Compra;Stock
                </div>
                <p className="mt-2 text-sm">
                  • <strong>Referencia:</strong> Código único del producto<br/>
                  • <strong>Descripción:</strong> Nombre del producto<br/>
                  • <strong>Precio Compra:</strong> Costo de adquisición<br/>
                  • <strong>Stock:</strong> Cantidad inicial (se asignará a bodega)
                </p>
              </CardContent>
            </Card>

            {/* Upload de archivo */}
            <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white">
                  Seleccionar Archivo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 dark:border-neutral-600 rounded-lg p-6 text-center">
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                  <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-300 mb-2">
                    Haz clic para seleccionar un archivo CSV
                  </p>
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    className="mt-2"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Errores */}
            {errors.length > 0 && (
              <Card className="bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                <CardHeader>
                  <CardTitle className="text-lg text-red-800 dark:text-red-200 flex items-center">
                    <AlertCircle className="h-5 w-5 mr-2" />
                    Errores Encontrados ({errors.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {errors.map((error, index) => (
                      <p key={index} className="text-red-700 dark:text-red-300 text-sm">
                        {error}
                      </p>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Preview de productos */}
            {parsedProducts.length > 0 && (
              <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
                <CardHeader>
                  <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2 text-cyan-500" />
                    Productos a Importar ({parsedProducts.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="max-h-80 overflow-y-auto border border-gray-200 dark:border-neutral-600 rounded-lg bg-gray-50 dark:bg-neutral-900">
                    <div className="space-y-1 p-3">
                      {parsedProducts.map((product, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-white dark:bg-neutral-800 rounded border border-gray-200 dark:border-neutral-600">
                          <div className="flex items-center space-x-2">
                            <Package className="h-3 w-3 text-cyan-500" />
                            <div>
                              <p className="text-sm font-medium text-gray-900 dark:text-white">
                                {product.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                Ref: {product.reference} | {product.brand}
                              </p>
                            </div>
                          </div>
                          <div className="text-right text-xs">
                            <p className="text-gray-600 dark:text-gray-300">
                              ${product.cost.toLocaleString()} → ${product.price.toLocaleString()}
                            </p>
                            <p className="text-gray-600 dark:text-gray-300">
                              Stock: {product.stock}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 bg-white p-6 pt-8 dark:bg-neutral-950">
          <Button
            onClick={handleClose}
            variant="outline"
            className="text-gray-600 dark:text-gray-300 border-gray-300 dark:border-neutral-600"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleImport}
            disabled={parsedProducts.length === 0 || errors.length > 0 || isLoading}
            className="bg-cyan-600 hover:bg-cyan-700 text-white"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Importando...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Importar {parsedProducts.length} Productos
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
