export default function ContextBar({ actions = [], controls, statusText, tabs = [] }) {
  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={tab.onClick}
            className={`text-sm px-1 cursor-pointer transition-colors border-b-2 ${
              tab.active
                ? 'text-gray-900 font-medium border-blue-600'
                : 'text-gray-400 hover:text-gray-700 border-transparent'
            }`}
          >
            {tab.label}
          </button>
        ))}
        {statusText && (
          <span className="text-xs text-gray-400">
            {tabs.length > 0 ? `· ${statusText}` : statusText}
          </span>
        )}
      </div>
      <div className="ml-auto flex items-center gap-3">
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            className={`text-xs rounded-full px-3 py-0.5 transition-colors cursor-pointer ${
            action.variant === 'primary'
              ? 'bg-blue-600 hover:bg-blue-700 text-white'
              : 'text-gray-600 bg-gray-100 hover:bg-gray-200'
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
