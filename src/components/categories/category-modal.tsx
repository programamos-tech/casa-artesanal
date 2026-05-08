'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { X, Tag, Plus, Trash2, FileText } from 'lucide-react'
import { Category } from '@/types'

interface CategoryModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (category: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => void
  onToggleStatus: (categoryId: string, newStatus: 'active' | 'inactive') => void
  onDelete: (categoryId: string) => void
  categories: Category[]
}

export function CategoryModal({ 
  isOpen, 
  onClose, 
  onSave,
  onToggleStatus, 
  onDelete,
  categories 
}: CategoryModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'active' as 'active' | 'inactive'
  })

  const [errors, setErrors] = useState<Record<string, string>>({})

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/20 dark:text-cyan-400'
      case 'inactive':
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-950/20 dark:text-gray-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-950/20 dark:text-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return 'Activa'
      case 'inactive':
        return 'Inactiva'
      default:
        return status
    }
  }

  const validateForm = () => {
    const newErrors: Record<string, string> = {}
    
    if (!formData.name.trim()) {
      newErrors.name = 'El nombre es requerido'
    }
    if (!formData.description.trim()) {
      newErrors.description = 'La descripción es requerida'
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }))
    }
  }

  const handleSave = () => {
    if (validateForm()) {
      onSave({
        name: formData.name.trim(),
        description: formData.description.trim(),
        status: formData.status
      })
      // Limpiar el formulario después de crear una categoría
      setFormData({
        name: '',
        description: '',
        status: 'active'
      })
      setErrors({})
    }
  }

  const handleClose = () => {
    setFormData({
      name: '',
      description: '',
      status: 'active'
    })
    setErrors({})
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-white/70 dark:bg-black/60 backdrop-blur-sm z-50 flex flex-col xl:items-center xl:justify-center p-4">
      <div className="bg-white dark:bg-neutral-950 rounded-none xl:rounded-2xl shadow-2xl w-full h-full xl:h-auto xl:w-auto xl:max-w-6xl xl:max-h-[95vh] overflow-hidden flex flex-col border-0 xl:border border-gray-200 dark:border-neutral-700">
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain flex flex-col">
        <div className="flex items-center justify-between border-b border-gray-200 bg-gradient-to-r from-cyan-50 to-cyan-100 p-4 dark:border-neutral-700 dark:from-cyan-900/20 dark:to-cyan-800/20 md:p-6">
          <div className="flex items-center gap-3">
            <Tag className="h-5 w-5 md:h-8 md:w-8 text-cyan-600" />
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">
                Gestión de Categorías
              </h2>
              <p className="text-xs md:text-sm text-gray-600 dark:text-gray-300">
                Crea nuevas categorías y gestiona las existentes
              </p>
            </div>
          </div>
          <Button
            type="button"
            onClick={handleClose}
            variant="ghost"
            size="sm"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); handleSave() }}
          className="flex flex-col p-4 md:p-6"
          style={{ paddingBottom: 'max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))' }}
        >
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
            {/* Información de la Categoría */}
            <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <FileText className="h-5 w-5 text-cyan-600" />
                  Información de la Categoría
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-neutral-800 ${
                      errors.name ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'
                    }`}
                    placeholder="Nombre de la categoría"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-500">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Descripción *
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-neutral-800 ${
                      errors.description ? 'border-red-500' : 'border-gray-300 dark:border-neutral-600'
                    }`}
                    placeholder="Descripción de la categoría"
                    rows={3}
                  />
                  {errors.description && (
                    <p className="mt-1 text-sm text-red-500">{errors.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Estado
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => handleInputChange('status', 'active')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.status === 'active'
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${formData.status === 'active' ? 'bg-cyan-500' : 'bg-gray-400'}`}></div>
                        <div className="text-left">
                          <div className={`font-medium ${formData.status === 'active' ? 'text-cyan-600' : 'text-gray-700 dark:text-gray-300'}`}>
                            Activa
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Categoría disponible
                          </div>
                        </div>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInputChange('status', 'inactive')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.status === 'inactive'
                          ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-900/20'
                          : 'border-gray-300 dark:border-neutral-600 hover:border-gray-400 dark:hover:border-gray-500'
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-3 h-3 rounded-full ${formData.status === 'inactive' ? 'bg-cyan-500' : 'bg-gray-400'}`}></div>
                        <div className="text-left">
                          <div className={`font-medium ${formData.status === 'inactive' ? 'text-cyan-600' : 'text-gray-700 dark:text-gray-300'}`}>
                            Inactiva
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            Categoría deshabilitada
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Categorías Existentes */}
            <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
              <CardHeader>
                <CardTitle className="text-lg text-gray-900 dark:text-white flex items-center gap-2">
                  <Tag className="h-5 w-5 text-cyan-600" />
                  Categorías Existentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {categories
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map((cat) => (
                    <div key={cat.id} className="flex items-center justify-between p-3 border border-gray-200 dark:border-neutral-600 rounded-lg bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 transition-colors">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900 dark:text-white">{cat.name}</h4>
                          <Badge className={getStatusColor(cat.status)}>
                            {getStatusLabel(cat.status)}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{cat.description}</p>
                      </div>
                      <div className="flex items-center space-x-3">
                        {/* Toggle estilo iOS */}
                        <button
                          onClick={() => onToggleStatus(cat.id, cat.status === 'active' ? 'inactive' : 'active')}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:ring-offset-2 ${
                            cat.status === 'active' 
                              ? 'bg-cyan-600' 
                              : 'bg-gray-200 dark:bg-neutral-700'
                          }`}
                          title={cat.status === 'active' ? 'Desactivar categoría' : 'Activar categoría'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              cat.status === 'active' ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        
                        {/* Botón de eliminar */}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onDelete(cat.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                          title="Eliminar categoría"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {categories.length === 0 && (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                      <Tag className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
                      <p>No hay categorías creadas</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="mt-6 flex items-center justify-end space-x-3 pt-2">
            <Button
              type="button"
              onClick={handleClose}
              variant="outline"
              className="border-gray-300 dark:border-neutral-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Cancelar
            </Button>
            <Button type="submit" className="bg-cyan-600 hover:bg-cyan-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Crear Categoría
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  )
}
