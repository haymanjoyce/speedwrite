export default function ContextBar({ actions = [], controls, statusText, tabs = [] }) {
  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={tab.onClick}
            className={`text-sm px-1 cursor-pointer ${
              tab.active
                ? 'text-gray-900 font-semibold'
                : 'text-gray-400 hover:text-gray-700 transition-colors'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {statusText && (
          <span className="text-xs text-gray-400">
            {statusText}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`text-xs rounded px-3 py-1 transition-colors cursor-pointer ${
              action.variant === 'primary'
                ? 'text-white bg-blue-600 border border-blue-600 hover:bg-blue-700'
                : action.variant === 'danger'
                ? 'text-red-600 border border-red-200 hover:bg-red-50'
                : 'text-gray-600 border border-gray-200 hover:bg-gray-50 hover:border-gray-300'
            }`}
          >
            {action.label}
          </button>
        ))}
        {controls}
      </div>
    </div>
  )
}
