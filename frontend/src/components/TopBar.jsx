import { Link } from 'react-router-dom'

export default function TopBar({ user, onLogout, docTitle, docId, subPageLabel }) {
  return (
    <div className="h-12 bg-gray-900 border-b border-gray-600 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center text-sm">
        {docTitle ? (
          <>
            <Link to="/" className="text-gray-400 hover:text-white font-semibold tracking-tight transition-colors">
              LogbookLM
            </Link>
            <span className="text-gray-600 mx-2">/</span>
            {docId && subPageLabel ? (
              <Link to={`/document/${docId}`} className="text-gray-400 hover:text-white truncate max-w-xs transition-colors">
                {docTitle}
              </Link>
            ) : (
              <span className="text-white truncate max-w-xs">{docTitle}</span>
            )}
            {subPageLabel && (
              <>
                <span className="text-gray-600 mx-2">/</span>
                <span className="text-white">{subPageLabel}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-white font-semibold tracking-tight">LogbookLM</span>
        )}
      </div>
      <div className="flex items-center gap-3">
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
