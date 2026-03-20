import { useEffect, useRef, useState } from 'react'

const CHAT_ACTIONS = [
  { id: 'summarise', label: 'Summarise' },
  { id: 'extract_key_points', label: 'Extract key points' },
]

const DIFF_ACTIONS = [
  { id: 'rewrite', label: 'Rewrite' },
  { id: 'restructure', label: 'Restructure' },
  { id: 'expand', label: 'Expand' },
  { id: 'condense', label: 'Condense' },
]

export default function ActionsDropdown({ onAction, disabled }) {
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

  const handleChat = (actionId) => {
    setOpen(false)
    onAction(actionId, '')
  }

  const handleDiff = (actionId) => {
    setOpen(false)
    onAction(actionId, null) // null instructions = show instruction bar
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={disabled}
        className="rounded-full px-3 py-1 text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Actions
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded shadow-md py-1 z-50 min-w-40">
          {CHAT_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleChat(a.id)}
              className="w-full text-left text-sm text-gray-700 hover:bg-gray-50 px-4 py-1.5 cursor-pointer"
            >
              {a.label}
            </button>
          ))}
          <div className="border-t border-gray-100 my-1" />
          {DIFF_ACTIONS.map((a) => (
            <button
              key={a.id}
              onClick={() => handleDiff(a.id)}
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
