const VARIANT_CLASSES = {
  primary: 'bg-gray-900 hover:bg-gray-800 text-white border border-transparent',
  secondary: 'bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-900 border border-gray-200 hover:border-gray-300',
  danger: 'bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-800 border border-red-200',
  ghost: 'bg-transparent hover:bg-gray-100 text-gray-500 hover:text-gray-900 border border-transparent',
}

const SIZE_CLASSES = {
  sm: 'px-3 py-1 text-xs',
  md: 'px-4 py-2 text-sm',
}

export default function Button({ variant = 'secondary', size = 'sm', disabled, onClick, children, type = 'button', className = '', style }) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={style}
      className={`rounded font-medium transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${VARIANT_CLASSES[variant]} ${SIZE_CLASSES[size]} ${className}`}
    >
      {children}
    </button>
  )
}
