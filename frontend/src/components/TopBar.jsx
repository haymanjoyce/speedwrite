import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useSearch } from '../context/SearchContext'

const isMac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

export default function TopBar({ user, onLogout, docTitle, isRenaming, onRenameSave, onRenameCancel, pageTitle = null, hasByokKey = false, actionsRemaining = null, onFeedbackClick = null }) {
  const { open: openSearch } = useSearch()
  const [inputValue, setInputValue] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    if (isRenaming) setInputValue(docTitle || '')
  }, [isRenaming])

  useEffect(() => {
    if (!dropdownOpen) return
    const handleMouseDown = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [dropdownOpen])

  const breadcrumbTitle = docTitle ? `SpeedWrite / ${docTitle}` : pageTitle ? `SpeedWrite / ${pageTitle}` : 'SpeedWrite'

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
        ) : pageTitle ? (
          <>
            <Link to="/" className="text-gray-400 hover:text-gray-700 font-semibold tracking-tight transition-colors flex-shrink-0">
              SpeedWrite
            </Link>
            <span className="mx-2 flex-shrink-0" />
            <span className="text-gray-900 truncate max-w-xs">{pageTitle}</span>
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
        {user && hasByokKey && (
          <span className="text-xs text-gray-400">Sonnet</span>
        )}
        {user && !hasByokKey && actionsRemaining !== null && (
          <span className={`text-xs ${actionsRemaining === 0 ? 'text-amber-500' : 'text-gray-400'}`}>
            Haiku · {actionsRemaining} actions left
          </span>
        )}
        {user && (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen((v) => !v)}
              className="flex items-center gap-1 text-sm text-gray-600 cursor-pointer hover:text-gray-900 transition-colors"
            >
              {user.display_name || user.email}
              <span className="text-gray-400 text-xs">▾</span>
            </button>
            {dropdownOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 shadow-sm rounded z-50 min-w-[160px]">
                {user.is_admin && (
                  <Link
                    to="/admin"
                    onClick={() => setDropdownOpen(false)}
                    className="text-sm text-gray-700 hover:bg-gray-50 px-4 py-2 block"
                  >
                    Administration
                  </Link>
                )}
                {onFeedbackClick && (
                  <button
                    onClick={() => { setDropdownOpen(false); onFeedbackClick() }}
                    className="text-sm text-gray-700 hover:bg-gray-50 px-4 py-2 block w-full text-left cursor-pointer"
                  >
                    Give feedback
                  </button>
                )}
                <Link
                  to="/account"
                  onClick={() => setDropdownOpen(false)}
                  className="text-sm text-gray-700 hover:bg-gray-50 px-4 py-2 block"
                >
                  Account settings
                </Link>
                <button
                  onClick={() => { setDropdownOpen(false); onLogout?.() }}
                  className="text-sm text-gray-700 hover:bg-gray-50 px-4 py-2 block w-full text-left cursor-pointer"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
