interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddings = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export default function Card({ children, className = '', padding = 'md' }: CardProps) {
  return (
    <div className={`rounded-xl border bg-white shadow-sm ${paddings[padding]} ${className}`}>
      {children}
    </div>
  )
}
