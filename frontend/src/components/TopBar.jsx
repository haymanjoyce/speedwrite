import { Link } from 'react-router-dom'

export default function TopBar({ user, onLogout, docTitle, docId, subPageLabel }) {
  return (
    <div className="h-12 bg-white border-b border-gray-200 flex items-center justify-between px-4 flex-shrink-0">
      <div className="flex items-center text-sm">
        {docTitle ? (
          <>
            <Link to="/" className="text-gray-400 hover:text-gray-700 font-semibold tracking-tight transition-colors">
              SpeedWrite
            </Link>
            <span className="text-gray-200 mx-2">/</span>
            {docId && subPageLabel ? (
              <Link to={`/document/${docId}`} className="text-gray-400 hover:text-gray-700 truncate max-w-xs transition-colors">
                {docTitle}
              </Link>
            ) : (
              <span className="text-gray-900 truncate max-w-xs">{docTitle}</span>
            )}
            {subPageLabel && (
              <>
                <span className="text-gray-200 mx-2">/</span>
                <span className="text-gray-900">{subPageLabel}</span>
              </>
            )}
          </>
        ) : (
          <span className="text-gray-900 font-semibold tracking-tight">SpeedWrite</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <span className="text-gray-500 text-sm">{user?.email}</span>
        <button
          onClick={onLogout}
          className="text-gray-500 hover:text-gray-900 text-sm transition-colors"
        >
          Logout
        </button>
      </div>
    </div>
  )
}
