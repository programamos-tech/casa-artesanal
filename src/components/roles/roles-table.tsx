'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Shield,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Lock,
  Unlock,
  Users,
  Calendar
} from 'lucide-react'
import { Role } from '@/types'

interface RolesTableProps {
  roles: Role[]
  onView: (role: Role) => void
  onEdit: (role: Role) => void
  onDelete: (role: Role) => void
  onCreate: () => void
}

export function RolesTable({ roles, onView, onEdit, onDelete, onCreate }: RolesTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState('all')

  const getTypeColor = (isSystem: boolean) => {
    return isSystem
      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
  }

  const getTypeLabel = (isSystem: boolean) => {
    return isSystem ? 'Sistema' : 'Personalizado'
  }

  const getTypeIcon = (isSystem: boolean) => {
    return isSystem ? Lock : Unlock
  }

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getModuleLabel = (module: string) => {
    switch (module) {
      case 'dashboard':
        return 'Reportes'
      case 'products':
        return 'Productos'
      case 'clients':
        return 'Clientes'
      case 'sales':
        return 'Ventas'
      case 'payments':
        return 'Abonos'
      case 'roles':
        return 'Roles'
      case 'logs':
        return 'Logs'
      default:
        return module
    }
  }

  const getActionLabel = (action: string) => {
    switch (action) {
      case 'view':
        return 'Ver'
      case 'create':
        return 'Crear'
      case 'edit':
        return 'Editar'
      case 'delete':
        return 'Eliminar'
      case 'cancel':
        return 'Cancelar'
      default:
        return action
    }
  }

  const filteredRoles = roles.filter(role => {
    const matchesSearch = searchTerm === '' ||
      role.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      role.description.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesType = filterType === 'all' ||
      (filterType === 'system' && role.isSystem) ||
      (filterType === 'custom' && !role.isSystem)

    return matchesSearch && matchesType
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Shield className="h-6 w-6 text-emerald-600" />
                Gestión de Roles
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300 mt-1">
                Administra los roles y permisos del sistema
              </p>
            </div>
            <Button onClick={onCreate} className="bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="h-4 w-4 mr-2" />
              Nuevo Rol
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Search and Filters */}
      <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar roles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white dark:bg-neutral-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
            >
              <option value="all">Todos los tipos</option>
              <option value="system">Sistema</option>
              <option value="custom">Personalizado</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card className="bg-white dark:bg-neutral-900 border-gray-200 dark:border-neutral-700">
        <CardContent className="p-0">
          {filteredRoles.length === 0 ? (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No se encontraron roles
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Comienza creando un nuevo rol
              </p>
              <Button 
                onClick={onCreate}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Rol
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-neutral-800">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Permisos
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Creado
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-neutral-900 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredRoles.map((role, index) => {
                    const TypeIcon = getTypeIcon(role.isSystem)
                    return (
                      <tr key={role.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {index + 1}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-3">
                            <div className="h-8 w-8 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center">
                              <Shield className="h-4 w-4 text-emerald-600" />
                            </div>
                            <div>
                              <div className="text-sm font-medium text-gray-900 dark:text-white">
                                {role.name}
                              </div>
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                ID: {role.id}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-600 dark:text-gray-300 max-w-xs">
                            {role.description}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Badge className={getTypeColor(role.isSystem)}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {getTypeLabel(role.isSystem)}
                          </Badge>
                        </td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            {role.permissions.slice(0, 3).map((permission, idx) => (
                              <div key={idx} className="flex items-center space-x-2">
                                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
                                  {getModuleLabel(permission.module)}:
                                </span>
                                <div className="flex space-x-1">
                                  {permission.actions.map((action, actionIdx) => (
                                    <Badge
                                      key={actionIdx}
                                      className="text-xs bg-gray-100 text-gray-700 dark:bg-neutral-800 dark:text-gray-300"
                                    >
                                      {getActionLabel(action)}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                            ))}
                            {role.permissions.length > 3 && (
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                +{role.permissions.length - 3} más...
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center space-x-2">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            <span className="text-sm text-gray-600 dark:text-gray-300">
                              {formatDateTime(role.createdAt)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onView(role)}
                              className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-100"
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onEdit(role)}
                              disabled={role.isSystem}
                              className="text-emerald-600 hover:text-emerald-900 dark:text-emerald-400 dark:hover:text-emerald-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={role.isSystem ? "No se puede editar rol del sistema" : "Editar rol"}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => onDelete(role)}
                              disabled={role.isSystem}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              title={role.isSystem ? "No se puede eliminar rol del sistema" : "Eliminar rol"}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
