import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Nav */}
      <nav className="border-b border-gray-100 px-8 py-4 flex items-center justify-between flex-shrink-0">
        <span className="font-semibold text-gray-900 tracking-tight">SpeedWrite</span>
        <div className="flex items-center gap-4">
          <Link to="/login" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
            Sign in
          </Link>
          <Link
            to="/register"
            className="text-sm bg-blue-600 text-white px-4 py-1.5 rounded hover:bg-blue-700 transition-colors"
          >
            Get started free
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center text-center px-4 py-24">
        <h1 className="text-4xl font-semibold text-gray-900">AI-assisted document authoring</h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto mt-4">
          SpeedWrite helps you go from blank page to polished document — with AI that understands your evidence,
          rewrites on demand, and never loses your work.
        </p>
        <div className="mt-8 flex gap-4 justify-center">
          <Link
            to="/register"
            className="bg-blue-600 text-white px-6 py-2.5 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Get started free
          </Link>
          <Link
            to="/login"
            className="border border-gray-300 text-gray-700 px-6 py-2.5 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            Sign in
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-4xl mx-auto px-4 pb-24 w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Write with AI</h3>
            <p className="text-sm text-gray-500 mt-2">
              An AI agent that rewrites sections, restructures documents, and responds to your instructions — without
              losing your voice.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Ground it in evidence</h3>
            <p className="text-sm text-gray-500 mt-2">
              Attach files, URLs, and documents as sources. SpeedWrite draws on your evidence to keep writing accurate
              and on-point.
            </p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-gray-900">Never lose a version</h3>
            <p className="text-sm text-gray-500 mt-2">
              Every document is automatically versioned. Browse history, restore any version, and share snapshots for
              feedback.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 py-6 px-8 flex justify-between items-center flex-shrink-0">
        <span className="text-xs text-gray-400">© 2026 SpeedWrite</span>
        <Link to="/login" className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
          Sign in
        </Link>
      </footer>
    </div>
  )
}
