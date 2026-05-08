import { CheckCircle, X } from 'lucide-react'

interface SuccessAlertProps {
  isOpen: boolean
  onClose: () => void
  title: string
  message: string
}

export function SuccessAlert({ isOpen, onClose, title, message }: SuccessAlertProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-md w-full mx-4 border border-gray-200 dark:border-neutral-700">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-neutral-700">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600 dark:text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {title}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
            {message}
          </p>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 pt-0">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>
  )
}
