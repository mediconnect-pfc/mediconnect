'use client'

import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastConfig {
  message: string
  type?: ToastType
  duration?: number
  onClose?: () => void
}

let toastFn: ((config: ToastConfig) => void) | null = null

export function toast(config: ToastConfig) {
  toastFn?.(config)
}

const icons: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle size={18} className="text-green-500" />,
  error: <AlertCircle size={18} className="text-red-500" />,
  info: <Info size={18} className="text-blue-500" />,
  warning: <AlertTriangle size={18} className="text-yellow-500" />,
}

const bgColors: Record<ToastType, string> = {
  success: 'border-green-200 bg-green-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
  warning: 'border-yellow-200 bg-yellow-50',
}

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

let nextId = 0

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    toastFn = (config) => {
      const id = nextId++
      setItems((prev) => [...prev, { id, message: config.message, type: config.type || 'info' }])
      setTimeout(() => {
        setItems((prev) => prev.filter((t) => t.id !== id))
        config.onClose?.()
      }, config.duration || 4000)
    }
    return () => { toastFn = null }
  }, [])

  if (items.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {items.map((item) => (
        <div
          key={item.id}
          className={`flex items-start gap-3 rounded-lg border px-4 py-3 shadow-lg ${bgColors[item.type]}`}
        >
          {icons[item.type]}
          <p className="text-sm text-gray-800">{item.message}</p>
          <button
            onClick={() => setItems((prev) => prev.filter((t) => t.id !== item.id))}
            className="ml-auto text-gray-400 hover:text-gray-600"
          >
            <X size={16} />
          </button>
        </div>
      ))}
    </div>
  )
}
