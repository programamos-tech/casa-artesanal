export interface User {
  id: string
  name: string
  email: string
  password: string
  role: 'superadmin' | 'admin' | 'vendedor' | 'cajero' | 'inventario' | 'contador' | 'supervisor_tienda'
  permissions: Permission[]
  isActive: boolean
  storeId?: string // ID de la tienda a la que pertenece el usuario
  lastLogin?: string
  createdAt: string
  updatedAt: string
}

export interface Permission {
  module: string
  actions: string[]
}

export interface Role {
  id: string
  name: string
  description: string
  permissions: Permission[]
  isSystem: boolean
  createdAt: string
  updatedAt: string
}

export interface Product {
  id: string
  name: string
  reference: string
  description: string
  price: number
  cost: number
  stock: {
    warehouse: number
    store: number
    total: number
  }
  categoryId: string
  brand: string
  status: 'active' | 'inactive' | 'discontinued' | 'out_of_stock'
  /** URL pública (Storage) para catálogo / ficha del producto */
  imageUrl?: string | null
  createdAt: string
  updatedAt: string
}

// StockTransfer antiguo (mantener para compatibilidad)
export interface StockTransfer {
  id: string
  productId: string
  productName: string
  fromLocation: 'warehouse' | 'store'
  toLocation: 'warehouse' | 'store'
  quantity: number
  reason: string
  userId: string
  userName: string
  createdAt: string
}

// Item individual de una transferencia
export interface TransferItem {
  id: string
  transferId: string
  productId: string
  productName: string
  productReference?: string
  quantity: number // Cantidad esperada/enviada
  quantityReceived?: number // Cantidad recibida (solo para recepciones)
  fromLocation?: 'warehouse' | 'store' // Ubicación de origen (bodega o local)
  unitPrice?: number // Precio unitario de transferencia (se convierte en cost para la microtienda)
  notes?: string // Nota específica del item (para recepciones)
  createdAt: string
  updatedAt: string
}

// Transferencia entre tiendas (puede tener múltiples productos)
export interface StoreStockTransfer {
  id: string
  transferNumber?: string // Número único de transferencia (ej: TRF-20260110-0001)
  fromStoreId: string
  fromStoreName?: string
  toStoreId: string
  toStoreName?: string
  status: 'pending' | 'in_transit' | 'received' | 'partially_received' | 'cancelled'
  description?: string // Descripción general de la transferencia
  notes?: string
  createdBy?: string
  createdByName?: string
  receivedBy?: string
  receivedByName?: string
  receivedAt?: string
  createdAt: string
  updatedAt: string
  // Items de la transferencia (múltiples productos)
  items?: TransferItem[]
  // Campos legacy para compatibilidad (deprecated)
  productId?: string
  productName?: string
  quantity?: number
}

export interface StockAdjustment {
  id: string
  productId: string
  productName: string
  location: 'warehouse' | 'store'
  type: 'add' | 'remove'
  quantity: number
  reason: string
  userId: string
  userName: string
  createdAt: string
}

export interface Category {
  id: string
  name: string
  description: string
  status: 'active' | 'inactive'
  storeId?: string // ID de la tienda a la que pertenece la categoría (opcional)
  createdAt: string
  updatedAt: string
}

export interface Client {
  id: string
  name: string
  email: string
  phone: string
  document: string
  address: string
  city: string
  state: string
  type: 'minorista' | 'mayorista' | 'consumidor_final'
  creditLimit: number
  currentDebt: number
  status: 'active' | 'inactive'
  nit?: string
  storeId?: string // ID de la tienda a la que pertenece el cliente
  createdAt: string
}

export interface CompanyConfig {
  id: string
  name: string
  nit: string
  address: string
  phone: string
  email: string
  logo?: string
  dianResolution?: string
  numberingRange?: string
  createdAt: string
  updatedAt: string
}

export interface SalePayment {
  id: string
  saleId: string
  paymentType: 'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'credit' | 'warranty' | 'card'
  amount: number
  reference?: string
  notes?: string
  createdAt: string
  updatedAt: string
}

export interface Warranty {
  id: string
  originalSaleId: string | null
  clientId: string | null
  clientName: string
  productReceivedId: string
  productReceivedName: string
  productReceivedSerial?: string
  productDeliveredId?: string
  productDeliveredName?: string
  reason: string
  status: 'pending' | 'in_progress' | 'completed' | 'rejected' | 'discarded'
  notes?: string
  storeId?: string // ID de la tienda a la que pertenece la garantía
  createdAt: string
  updatedAt: string
  completedAt?: string
  createdBy?: string
  quantityReceived?: number
  quantityDelivered?: number
  // Relaciones
  originalSale?: Sale
  client?: Client
  productReceived?: Product
  productDelivered?: Product
  warrantyProducts?: WarrantyProduct[]
  statusHistory?: WarrantyStatusHistory[]
}

export interface WarrantyProduct {
  id: string
  warrantyId: string
  productId: string
  serialNumber?: string
  condition: 'defective' | 'repaired' | 'discarded'
  notes?: string
  createdAt: string
  updatedAt: string
  // Relaciones
  product?: Product
}

export interface WarrantyStatusHistory {
  id: string
  warrantyId: string
  previousStatus?: string
  newStatus: string
  notes?: string
  changedBy?: string
  changedAt: string
  // Relaciones
  changedByUser?: User
}

export interface Sale {
  id: string
  clientId: string
  clientName: string
  total: number
  subtotal: number
  tax: number
  discount: number
  discountType?: 'percentage' | 'amount'
  status: 'pending' | 'completed' | 'cancelled' | 'draft'
  paymentMethod: 'cash' | 'credit' | 'transfer' | 'nequi' | 'bancolombia' | 'warranty' | 'mixed' | 'card'
  payments?: SalePayment[] // Para pagos mixtos
  invoiceNumber?: string
  sellerId?: string
  sellerName?: string
  sellerEmail?: string
  storeId?: string // ID de la tienda donde se realizó la venta
  createdAt: string
  items: SaleItem[]
  creditStatus?: 'pending' | 'partial' | 'completed' | 'overdue' | 'cancelled' // Estado del crédito asociado (solo para ventas a crédito)
  cancellationReason?: string // Motivo de cancelación si la venta fue anulada
}

export interface SaleItem {
  id: string
  productId: string
  productName: string
  productReferenceCode?: string
  quantity: number
  unitPrice: number
  discount?: number
  discountType?: 'percentage' | 'amount'
  tax?: number
  total: number
  addedAt?: number
}

export interface Credit {
  id: string
  saleId: string
  clientId: string
  clientName: string
  invoiceNumber: string
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  lastPaymentAmount?: number
  lastPaymentDate?: string
  lastPaymentUser?: string
  status: 'pending' | 'partial' | 'completed' | 'overdue' | 'cancelled'
  dueDate?: string
  createdBy?: string
  createdByName?: string
  storeId?: string // ID de la tienda a la que pertenece el crédito
  createdAt: string
  updatedAt: string
  credits?: Credit[] // Para créditos agrupados, contiene los créditos individuales
}

export interface Supplier {
  id: string
  name: string
  contact?: string
  phone?: string
  email?: string
  document?: string
  storeId: string
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export type SupplierInvoiceStatus = 'pending' | 'partial' | 'paid' | 'cancelled'

export interface SupplierInvoice {
  id: string
  supplierId: string
  supplierName?: string
  storeId: string
  invoiceNumber: string
  issueDate: string
  dueDate?: string
  totalAmount: number
  paidAmount: number
  status: SupplierInvoiceStatus
  /** Rutas guardadas en storage o URLs absolutas (hasta 5). */
  attachmentRefs?: string[]
  /** URLs públicas resueltas para mostrar comprobantes. */
  attachmentUrls?: string[]
  /** Primer comprobante (compatibilidad con vistas que solo usaban uno). */
  imageUrl?: string
  notes?: string
  /** Motivo de anulación (solo si status === cancelled) */
  cancellationReason?: string
  createdBy?: string
  createdAt: string
  updatedAt: string
}

export interface SupplierPaymentRecord {
  id: string
  invoiceId: string
  amount: number
  paymentDate: string
  paymentMethod: 'cash' | 'transfer' | 'mixed'
  /** Solo cuando paymentMethod === 'mixed' */
  cashAmount?: number
  /** Solo cuando paymentMethod === 'mixed' */
  transferAmount?: number
  notes?: string
  /** Comprobante del abono (mismo bucket que facturas: ruta `payments/…` o URL). */
  imageUrl?: string
  userId: string
  userName: string
  storeId?: string
  status?: 'active' | 'cancelled'
  createdAt: string
  updatedAt?: string
}

export interface PaymentRecord {
  id: string
  creditId: string
  amount: number
  paymentDate: string
  paymentMethod: 'cash' | 'transfer' | 'nequi' | 'bancolombia' | 'mixed' | 'card'
  /** En abonos mixtos: canal del monto que no es efectivo */
  digitalTransferMethod?: 'nequi' | 'bancolombia'
  cashAmount?: number
  transferAmount?: number
  description?: string
  userId: string
  userName: string
  storeId?: string // ID de la tienda a la que pertenece el registro de pago
  status?: 'active' | 'cancelled'
  cancelledAt?: string
  cancelledBy?: string
  cancelledByName?: string
  cancellationReason?: string
  createdAt: string
}

// Mantener Payment para compatibilidad
export interface Payment extends Credit {}

// Store interface moved to store.ts for better module resolution
export type { Store } from './store'

export interface StoreStock {
  id: string
  storeId: string
  storeName?: string
  productId: string
  productName?: string
  quantity: number
  location?: string
  createdAt: string
  updatedAt: string
}

export interface DashboardStats {
  totalSales: number
  totalInvestment: number
  totalProfit: number
  profitMargin: number
  totalProducts: number
  totalClients: number
  pendingPayments: number
  lowStockProducts: number
}

