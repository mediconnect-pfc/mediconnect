interface AvatarProps {
  src?: string | null
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const sizes = {
  sm: 'h-8 w-8 text-xs',
  md: 'h-10 w-10 text-sm',
  lg: 'h-14 w-14 text-lg',
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase()
}

const bgColors = [
  'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500',
  'bg-pink-500', 'bg-teal-500', 'bg-indigo-500', 'bg-red-500',
]

function colorFromName(name: string): string {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return bgColors[Math.abs(hash) % bgColors.length]
}

export default function Avatar({ src, alt = '', name, size = 'md', className = '' }: AvatarProps) {
  if (src) {
    return (
      <img
        src={src}
        alt={alt || name || ''}
        className={`rounded-full object-cover ${sizes[size]} ${className}`}
      />
    )
  }

  const displayName = name || alt || '?'
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full font-medium text-white ${sizes[size]} ${colorFromName(displayName)} ${className}`}
      title={displayName}
    >
      {initials(displayName)}
    </div>
  )
}
