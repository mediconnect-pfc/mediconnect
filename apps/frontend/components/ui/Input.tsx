'use client'

import { type InputHTMLAttributes, forwardRef } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  icon?: React.ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(({ label, error, icon, id, className = '', ...props }, ref) => {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700">{label}</label>
      <div className="relative mt-1">
        {icon && <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-gray-400">{icon}</div>}
        <input
          ref={ref}
          id={id}
          className={`block w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition focus:ring-2 ${
            icon ? 'pl-10' : ''
          } ${
            error ? 'border-red-400 focus:ring-red-300' : 'border-gray-300 focus:border-blue-500 focus:ring-blue-200'
          } ${className}`}
          {...props}
        />
      </div>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  )
})

Input.displayName = 'Input'
export default Input
