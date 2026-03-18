export default function ContextBar({ actions = [], controls, statusText }) {
  return (
    <div className="h-9 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      <div className="flex items-center gap-6">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`text-xs px-3 py-0.5 rounded border transition-colors ${
              action.variant === 'primary'
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : action.variant === 'toggle' && action.active
                ? 'bg-blue-600 text-white border-blue-600 hover:bg-blue-700'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {statusText && <span className="text-xs text-gray-400">{statusText}</span>}
        {controls}
      </div>
    </div>
  )
}
