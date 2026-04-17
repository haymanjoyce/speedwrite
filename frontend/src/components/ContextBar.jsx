export default function ContextBar({ actions = [], controls, rightControls, tabs = [] }) {
  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center px-6 flex-shrink-0">
      <div className="flex items-center gap-4">
        {tabs.map((tab, i) => (
          <button
            key={i}
            onClick={tab.onClick}
            className={`text-sm px-1 cursor-pointer self-stretch flex items-center border-b-2 ${
              tab.active
                ? 'text-gray-900 border-gray-900'
                : 'text-gray-400 border-transparent hover:text-gray-700 hover:border-gray-300 transition-colors'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {controls}
      <div className="ml-auto flex items-center gap-3">
        {rightControls}
        {actions.map((action, i) => (
          <button
            key={i}
            onClick={action.onClick}
            disabled={action.disabled}
            title={action.title}
            className={`text-xs rounded px-3 py-1 transition-colors ${action.disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${
              action.variant === 'primary'
                ? 'font-medium text-white bg-gray-900 border border-gray-900 hover:bg-gray-800'
                : action.variant === 'danger'
                ? 'font-medium text-red-600 border border-red-200 hover:bg-red-50'
                : 'font-medium bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200'
            }`}
          >
            {action.label}
          </button>
        ))}
      </div>
    </div>
  )
}
