export default function ContextBar({ actions = [], statusText }) {
  return (
    <div className="h-9 bg-[#2d2d2d] flex items-center px-6 gap-6 flex-shrink-0">
      {actions.map((action, i) => (
        <span
          key={i}
          onClick={action.onClick}
          className={`text-sm cursor-pointer transition-colors ${
            action.variant === 'toggle' && action.active
              ? 'text-white'
              : 'text-gray-400 hover:text-white'
          }`}
        >
          {action.label}
        </span>
      ))}
      {statusText && <span className="ml-auto text-xs text-gray-500">{statusText}</span>}
    </div>
  )
}
