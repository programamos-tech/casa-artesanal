'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
  Shield,
  UserCheck,
  UserX,
  Mail,
  Calendar
} from 'lucide-react'
import { User, Role } from '@/types'

interface UsersTableProps {
  users: User[]
  roles: Role[]
  onView: (user: User) => void
  onEdit: (user: User) => void
  onDelete: (user: User) => void
  onCreate: () => void
}

export function UsersTable({ users, roles, onView, onEdit, onDelete, onCreate }: UsersTableProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterRole, setFilterRole] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const getRoleName = (roleId: string) => {
    const role = roles.find(r => r.id === roleId)
    return role ? role.name : 'N/A'
  }

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      case 'admin':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400'
      case 'vendedor':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
      case 'cajero':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400'
      case 'inventario':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      case 'contador':
        return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-neutral-800 dark:text-gray-300'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'superadmin':
        return 'Super Admin'
      case 'admin':
        return 'Administrador'
      case 'vendedor':
        return 'Vendedor'
      case 'cajero':
        return 'Cajero'
      case 'inventario':
        return 'Inventario'
      case 'contador':
        return 'Contador'
      default:
        return role
    }
  }

  const getStatusColor = (isActive: boolean) => {
    return isActive
      ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
      : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
  }

  const getStatusLabel = (isActive: boolean) => {
    return isActive ? 'Activo' : 'Inactivo'
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

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' ||
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesRole = filterRole === 'all' || user.role === filterRole
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && user.isActive) ||
      (filterStatus === 'inactive' && !user.isActive)

    return matchesSearch && matchesRole && matchesStatus
  })

  return (
    <Card className="border-gray-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center text-gray-900 dark:text-white">
            <Users className="h-5 w-5 mr-2 text-brand-600" />
            Gestión de Usuarios
          </CardTitle>
          <Button onClick={onCreate} className="bg-brand-700 hover:bg-brand-800">
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 h-4 w-4" />
            <input
              type="text"
              placeholder="Buscar usuarios..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900 dark:text-white placeholder-gray-600 dark:placeholder-gray-400 bg-white dark:bg-neutral-800"
            />
          </div>
          <select
            value={filterRole}
            onChange={(e) => setFilterRole(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
          >
            <option value="all">Todos los roles</option>
            <option value="superadmin">Super Admin</option>
            <option value="admin">Administrador</option>
            <option value="vendedor">Vendedor</option>
            <option value="cajero">Cajero</option>
            <option value="inventario">Inventario</option>
            <option value="contador">Contador</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-neutral-600 rounded-md focus:ring-2 focus:ring-brand-500 focus:border-transparent text-gray-900 dark:text-white bg-white dark:bg-neutral-800"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activo</option>
            <option value="inactive">Inactivo</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="border-b border-gray-200 dark:border-neutral-700">
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">#</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Usuario</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Email</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Rol</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Estado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Último Acceso</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Creado</th>
                <th className="text-left py-3 px-4 font-medium text-gray-600 dark:text-gray-300">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user, index) => (
                <tr key={user.id} className="border-b border-gray-100 dark:border-neutral-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="py-4 px-4">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {index + 1}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-3">
                      <div className="h-8 w-8 bg-brand-100 dark:bg-brand-900/20 rounded-full flex items-center justify-center">
                        <Users className="h-4 w-4 text-brand-600" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {user.name}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          ID: {user.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.email}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={getRoleColor(user.role)}>
                      <Shield className="h-3 w-3 mr-1" />
                      {getRoleLabel(user.role)}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <Badge className={getStatusColor(user.isActive)}>
                      {user.isActive ? (
                        <UserCheck className="h-3 w-3 mr-1" />
                      ) : (
                        <UserX className="h-3 w-3 mr-1" />
                      )}
                      {getStatusLabel(user.isActive)}
                    </Badge>
                  </td>
                  <td className="py-4 px-4">
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {user.lastLogin ? formatDateTime(user.lastLogin) : 'Nunca'}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-300">
                        {formatDateTime(user.createdAt)}
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onView(user)}
                        className="h-8 w-8 p-0 text-blue-500 hover:text-blue-700 hover:bg-blue-100 dark:hover:bg-blue-900/20"
                        title="Ver detalles"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onEdit(user)}
                        className="h-8 w-8 p-0 text-brand-500 hover:text-brand-700 hover:bg-brand-100 dark:hover:bg-brand-900/20"
                        title="Editar usuario"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onDelete(user)}
                        className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-100 dark:hover:bg-red-900/20"
                        title="Eliminar usuario"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Users className="h-12 w-12 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
            <p>No se encontraron usuarios</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
