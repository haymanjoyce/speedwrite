import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="h-screen flex flex-col bg-white">
      <nav className="px-8 pt-8 pb-0 flex items-center justify-between flex-shrink-0">
        <span className="text-base font-semibold text-gray-900">SpeedWrite</span>
        <Link to="/login" className="text-base text-gray-600 hover:text-gray-900 transition-colors">
          Sign in
        </Link>
      </nav>

      <main className="flex-1 flex items-start justify-center pt-[18vh]">
        <div className="flex flex-col items-center gap-0">
          <span className="text-lg font-normal text-gray-900">Create document</span>
          <span className="text-lg font-medium text-gray-900 py-3">↓</span>
          <span className="text-lg font-normal text-gray-900">Add sources</span>
          <span className="text-lg font-medium text-gray-900 py-3">↓</span>
          <span className="text-lg font-normal text-gray-900">Write with AI</span>
          <Link to="/register" className="mt-16 px-8 py-3 text-base bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
            Create account
          </Link>
        </div>
      </main>

      <footer className="border-t border-gray-100 py-4 text-xs text-gray-400 text-center flex-shrink-0">
        © 2026 SpeedWrite
      </footer>
    </div>
  )
}
