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

      <main className="flex-1 flex flex-col items-center">
        <div className="flex-[1]" />
        <span className="text-lg font-normal text-gray-900">AI-assisted document authoring tool.</span>
        <div className="flex-[1.618]" />
        <Link to="/register" className="-mt-12 px-8 py-3 text-base bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors">
          Create account
        </Link>
        <div className="flex-[2.618]" />
      </main>

      <footer className="border-t border-gray-100 py-4 text-xs text-gray-400 text-center flex-shrink-0">
        © 2026 SpeedWrite
      </footer>
    </div>
  )
}
