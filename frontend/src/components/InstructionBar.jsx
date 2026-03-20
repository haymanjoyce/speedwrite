import { useRef } from 'react'

export default function InstructionBar({ action, onRun, onCancel }) {
  const inputRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onRun(inputRef.current?.value ?? '')
    }
    if (e.key === 'Escape') {
      onCancel()
    }
  }

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center gap-3 flex-shrink-0">
      <span className="text-sm font-medium text-gray-600 capitalize">{action}</span>
      <input
        ref={inputRef}
        type="text"
        placeholder="Additional instructions (optional)"
        onKeyDown={handleKeyDown}
        autoFocus
        className="flex-1 border border-gray-200 rounded px-3 py-1 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors bg-white"
      />
      <button
        onClick={() => onRun(inputRef.current?.value ?? '')}
        className="rounded px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
      >
        Run
      </button>
      <button
        onClick={onCancel}
        className="rounded px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        Cancel
      </button>
    </div>
  )
}
