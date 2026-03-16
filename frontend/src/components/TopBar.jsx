import { Link } from 'react-router-dom'

export default function TopBar({ user, onLogout, docTitle, isChatOpen, onToggleChat }) {
  return (
    <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center text-sm">
        {docTitle ? (
          <>
            <Link to="/" className="text-gray-400 hover:text-white font-semibold tracking-tight transition-colors">
              LogbookLM
            </Link>
            <span className="text-gray-600 mx-2">/</span>
            <span className="text-white truncate max-w-xs">{docTitle}</span>
          </>
        ) : (
          <span className="text-white font-semibold tracking-tight">LogbookLM</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        {onToggleChat && (
          <button
            onClick={onToggleChat}
            className={`text-sm px-3 py-1 rounded transition-colors ${
              isChatOpen
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-white border border-gray-600 hover:border-gray-400'
            }`}
          >
            Chat
          </button>
        )}
        <span className="text-gray-600">|</span>
        <span className="text-gray-400 text-sm">{user?.email}</span>
        <button
          onClick={onLogout}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
