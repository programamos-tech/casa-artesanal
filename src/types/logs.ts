export interface Log {
  id: string
  type: 'transfer' | 'sale' | 'product_edit' | 'product_create' | 'product_delete' | 'client_edit' | 'client_create' | 'client_delete' | 'category_edit' | 'category_create' | 'category_delete'
  action: string
  description: string
  details: Record<string, any>
  userId: string
  userName: string
  timestamp: string
  ipAddress?: string
  userAgent?: string
}

export interface TransferLog extends Log {
  type: 'transfer'
  details: {
    productId: string
    productName: string
    fromLocation: 'warehouse' | 'store'
    toLocation: 'warehouse' | 'store'
    quantity: number
    reason: string
    stockBefore: {
      warehouse: number
      store: number
      total: number
    }
    stockAfter: {
      warehouse: number
      store: number
      total: number
    }
  }
}

export interface SaleLog extends Log {
  type: 'sale'
  details: {
    saleId: string
    clientId: string
    clientName: string
    total: number
    paymentMethod: string
    items: Array<{
      productId: string
      productName: string
      quantity: number
      unitPrice: number
    }>
  }
}

export interface ProductLog extends Log {
  type: 'product_edit' | 'product_create' | 'product_delete'
  details: {
    productId: string
    productName: string
    changes?: Record<string, { from: any; to: any }>
  }
}

export interface ClientLog extends Log {
  type: 'client_edit' | 'client_create' | 'client_delete'
  details: {
    clientId: string
    clientName: string
    changes?: Record<string, { from: any; to: any }>
  }
}

export interface CategoryLog extends Log {
  type: 'category_edit' | 'category_create' | 'category_delete'
  details: {
    categoryId: string
    categoryName: string
    changes?: Record<string, { from: any; to: any }>
  }
}

export type LogEntry = TransferLog | SaleLog | ProductLog | ClientLog | CategoryLog
