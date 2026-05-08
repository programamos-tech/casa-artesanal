'use client'

import { useState } from 'react'
import { ProductTable } from '@/components/products/product-table'
import { ProductModal } from '@/components/products/product-modal'
import { CategoryModal } from '@/components/categories/category-modal'
import { StockTransferModal } from '@/components/products/stock-transfer-modal'
import { StockAdjustmentModal } from '@/components/products/stock-adjustment-modal'
import { ConfirmModal } from '@/components/ui/confirm-modal'
import { RoleProtectedRoute } from '@/components/auth/role-protected-route'
import { useProducts } from '@/contexts/products-context'
import { useCategories } from '@/contexts/categories-context'
import { Product, Category, StockTransfer } from '@/types'
import { toast } from 'sonner'

export default function ProductsPage() {
  const { products, loading, currentPage, totalProducts, hasMore, isSearching, stockFilter, setStockFilter, createProduct, updateProduct, deleteProduct, transferStock, adjustStock, refreshProducts, goToPage, searchProducts, productsLastUpdated } = useProducts()
  const { categories, createCategory, toggleCategoryStatus, deleteCategory } = useCategories()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null)
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false)
  const [productToTransfer, setProductToTransfer] = useState<Product | null>(null)
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false)
  const [productToAdjust, setProductToAdjust] = useState<Product | null>(null)

  const handleEdit = (product: Product) => {
    setSelectedProduct(product)
    setIsModalOpen(true)
  }

  const handleDelete = (product: Product) => {
    setProductToDelete(product)
    setIsDeleteModalOpen(true)
  }

  const confirmDelete = async () => {
    if (productToDelete) {
      const result = await deleteProduct(productToDelete.id)
      if (result.success) {
        toast.success('Producto eliminado exitosamente')
        setIsDeleteModalOpen(false)
        setProductToDelete(null)
      } else {
        toast.error(result.error || 'Error eliminando producto')
      }
    }
  }

  const handleStockAdjustment = (product: Product) => {
    setProductToAdjust(product)
    setIsAdjustmentModalOpen(true)
  }

  const handleAdjustStock = async (productId: string, location: 'warehouse' | 'store', newQuantity: number, reason: string) => {
    const success = await adjustStock(productId, location, newQuantity, reason)
    
    if (success) {
      toast.success('Stock ajustado exitosamente')
      setIsAdjustmentModalOpen(false)
      setProductToAdjust(null)
    } else {
      toast.error('No se guardaron los cambios', {
        description:
          'No pudimos confirmar el ajuste en el servidor. Revisa tu conexión o permisos e inténtalo de nuevo.',
      })
    }
  }

  const handleStockTransfer = (product: Product) => {
    setProductToTransfer(product)
    setIsTransferModalOpen(true)
  }

  const handleTransferStock = async (transferData: Omit<StockTransfer, 'id' | 'createdAt' | 'userId' | 'userName'>) => {
    const success = await transferStock(
      transferData.productId,
      transferData.fromLocation,
      transferData.toLocation,
      transferData.quantity
    )
    
    if (success) {
      toast.success('Stock transferido exitosamente')
      setIsTransferModalOpen(false)
      setProductToTransfer(null)
    } else {
      toast.error('Error transfiriendo stock')
    }
  }

  const handleManageCategories = () => {
    setSelectedCategory(null)
    setIsCategoryModalOpen(true)
  }

  const handleSaveCategory = async (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const success = await createCategory(categoryData)
    if (success) {
      toast.success('Categoría creada exitosamente')
      // No cerrar el modal para que el usuario pueda ver la categoría creada
      // setIsCategoryModalOpen(false)
      // setSelectedCategory(null)
    } else {
      toast.error('Error creando categoría')
    }
  }

  const handleToggleCategoryStatus = async (categoryId: string, newStatus: 'active' | 'inactive') => {
    const success = await toggleCategoryStatus(categoryId, newStatus)
    if (success) {
      const statusText = newStatus === 'active' ? 'habilitada' : 'deshabilitada'
      toast.success(`Categoría ${statusText} exitosamente`)
    } else {
      toast.error('Error cambiando estado de categoría')
    }
  }

  const handleDeleteCategory = async (categoryId: string) => {
    const success = await deleteCategory(categoryId)
    if (success) {
      toast.success('Categoría eliminada exitosamente')
    } else {
      toast.error('Error eliminando categoría')
    }
  }

  const handleCreate = () => {
    setSelectedProduct(null)
    setIsModalOpen(true)
  }

  const handleRefresh = async () => {
    await refreshProducts()
    toast.success('Productos actualizados')
  }

  const handleSaveProduct = async (productData: Omit<Product, 'id'>) => {
    if (selectedProduct) {
      // Edit existing product
      const success = await updateProduct(selectedProduct.id, productData)
      if (success) {
        toast.success('Producto actualizado exitosamente')
        setIsModalOpen(false)
        setSelectedProduct(null)
      } else {
        toast.error('Error actualizando producto')
      }
    } else {
      // Create new product
      const success = await createProduct(productData)
      if (success) {
        toast.success('Producto creado exitosamente')
        setIsModalOpen(false)
      } else {
        toast.error('Error creando producto')
      }
    }
  }


  // Siempre renderizamos la página para no perder el estado del buscador

  return (
    <RoleProtectedRoute module="products" requiredAction="view">
      <div className="space-y-4 bg-gray-50 py-4 dark:bg-neutral-950 max-xl:pb-1 md:space-y-6 md:py-6">
      <ProductTable
        products={products}
        categories={categories}
        loading={loading}
        currentPage={currentPage}
        totalProducts={totalProducts}
        hasMore={hasMore}
        isSearching={isSearching}
        stockFilter={stockFilter}
        onFilterChange={setStockFilter}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onCreate={handleCreate}
        onManageCategories={handleManageCategories}
        onStockAdjustment={handleStockAdjustment}
        onStockTransfer={handleStockTransfer}
        onRefresh={handleRefresh}
        onPageChange={goToPage}
        onSearch={searchProducts}
      />

      <ProductModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setSelectedProduct(null)
        }}
        onSave={handleSaveProduct}
        product={selectedProduct}
        categories={categories}
      />

      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => {
          setIsCategoryModalOpen(false)
          setSelectedCategory(null)
        }}
        onSave={handleSaveCategory}
        onToggleStatus={handleToggleCategoryStatus}
        onDelete={handleDeleteCategory}
        categories={categories}
      />

              <StockTransferModal
                isOpen={isTransferModalOpen}
                onClose={() => {
                  setIsTransferModalOpen(false)
                  setProductToTransfer(null)
                }}
                onTransfer={handleTransferStock}
                product={productToTransfer}
              />

              <StockAdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => {
                  setIsAdjustmentModalOpen(false)
                  setProductToAdjust(null)
                }}
                onAdjust={handleAdjustStock}
                product={productToAdjust}
              />

              <ConfirmModal
                isOpen={isDeleteModalOpen}
                onClose={() => {
                  setIsDeleteModalOpen(false)
                  setProductToDelete(null)
                }}
                onConfirm={confirmDelete}
                title="Eliminar Producto"
                message={`¿Estás seguro de que quieres eliminar el producto "${productToDelete?.name}"? Esta acción no se puede deshacer.`}
                confirmText="Eliminar"
                cancelText="Cancelar"
                type="danger"
              />

      </div>
    </RoleProtectedRoute>
  )
}
