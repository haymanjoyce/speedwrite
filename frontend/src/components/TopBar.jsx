export default function TopBar({ user, onLogout }) {
  return (
    <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center justify-between px-4 flex-shrink-0">
      <span className="text-white font-semibold tracking-tight">LogbookLM</span>
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
