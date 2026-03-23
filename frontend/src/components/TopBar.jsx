import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearch } from '../context/SearchContext'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function TopBar({ user, onLogout, docTitle, isRenaming, onRenameSave, onRenameCancel }) {
  const { open: openSearch } = useSearch()
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isRenaming) setInputValue(docTitle || '')
  }, [isRenaming])

  const breadcrumbTitle = docTitle ? `SpeedWrite / ${docTitle}` : 'SpeedWrite'

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); onRenameSave?.(inputValue.trim()) }
    if (e.key === 'Escape') { onRenameCancel?.() }
  }

  return (
    <div className="h-11 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center text-sm min-w-0 overflow-hidden whitespace-nowrap" title={breadcrumbTitle}>
        {docTitle ? (
          <>
            <Link to="/" className="text-gray-400 hover:text-gray-700 font-semibold tracking-tight transition-colors flex-shrink-0">
              SpeedWrite
            </Link>
            <span className="mx-2 flex-shrink-0" />
            {isRenaming ? (
              <input
                ref={inputRef}
                autoFocus
                onFocus={(e) => e.target.select()}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => onRenameSave?.(inputValue.trim())}
                size={Math.max(10, inputValue.length + 2)}
                className="text-gray-900 border-b border-blue-400 outline-none bg-transparent"
              />
            ) : (
              <span className="text-gray-900 truncate max-w-xs">{docTitle}</span>
            )}
          </>
        ) : (
          <span className="text-gray-900 font-semibold tracking-tight">SpeedWrite</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={openSearch}
          title={`Search (${isMac ? '⌘K' : 'Ctrl+K'})`}
          className="flex items-center gap-1.5 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
        <span className="text-xs text-gray-500">{user?.email}</span>
        <button
          onClick={onLogout}
          className="text-xs text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
