import { useEffect, useRef, useState } from 'react'

export default function ActionsDropdown({ title, actions, onAction, disabled }) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="text-xs text-gray-600 border border-gray-200 rounded px-3 py-1 hover:bg-gray-50 hover:border-gray-300 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {title}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-md py-1 z-50 min-w-40">
          {actions.map((a) => (
            <button
              key={a.action}
              onClick={() => { setOpen(false); onAction(a.action) }}
              className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 px-4 py-1.5 cursor-pointer"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
