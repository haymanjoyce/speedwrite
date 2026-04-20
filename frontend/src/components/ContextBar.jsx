import { useEffect, useRef, useState } from 'react'

export default function ContextBar({ actions = [], overflow = [], controls, rightControls, tabs = [] }) {
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef(null)

  useEffect(() => {
    if (!overflowOpen) return
    const handler = (e) => {
      if (overflowRef.current && !overflowRef.current.contains(e.target)) setOverflowOpen(false)
    }
    const keyHandler = (e) => { if (e.key === 'Escape') setOverflowOpen(false) }
    document.addEventListener('mousedown', handler)
    document.addEventListener('keydown', keyHandler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('keydown', keyHandler)
    }
  }, [overflowOpen])

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
        {overflow.length > 0 && (
          <div ref={overflowRef} className="relative">
            <button
              onClick={() => setOverflowOpen((v) => !v)}
              className="p-1 text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <circle cx="12" cy="5" r="1.5" />
                <circle cx="12" cy="12" r="1.5" />
                <circle cx="12" cy="19" r="1.5" />
              </svg>
            </button>
            {overflowOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-md py-1 z-50 min-w-48">
                {overflow.map((action, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      if (action.disabled) return
                      setOverflowOpen(false)
                      action.onClick()
                    }}
                    title={action.title}
                    disabled={action.disabled}
                    className={`w-full text-left text-sm px-4 py-1.5 transition-colors ${
                      action.disabled
                        ? 'text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                    }`}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
