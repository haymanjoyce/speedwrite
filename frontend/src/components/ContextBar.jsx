export default function ContextBar({ actions = [], controls, statusText }) {
  return (
    <div className="h-9 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      <div className="flex items-center gap-6">
        {actions.map((action, i) => (
          <span
            key={i}
            onClick={action.onClick}
            className={`text-sm cursor-pointer transition-colors ${
              action.variant === 'toggle' && action.active
                ? 'text-blue-600 font-medium'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            {action.label}
          </span>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {statusText && <span className="text-xs text-gray-400">{statusText}</span>}
        {controls}
      </div>
    </div>
  )
}
