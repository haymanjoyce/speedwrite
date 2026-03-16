import { Link } from 'react-router-dom'

export default function TopBar({ user, onLogout, docTitle }) {
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
      <div className="flex items-center gap-4">
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

