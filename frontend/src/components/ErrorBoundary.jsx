import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (!this.state.error) return this.props.children

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-10 max-w-md w-full text-center">
          <div className="text-xl font-semibold text-gray-900 mb-6">SpeedWrite</div>
          <h1 className="text-lg font-medium text-gray-800 mb-2">Something went wrong</h1>
          <p className="text-sm text-gray-500 mb-6">
            An unexpected error occurred. Please refresh the page or contact support if the problem persists.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium px-4 py-2 rounded transition-colors"
          >
            Refresh page
          </button>
          {this.state.error && (
            <details className="mt-6 text-left">
              <summary className="text-xs text-gray-400 cursor-pointer select-none">Error details</summary>
              <pre className="mt-2 text-xs text-gray-400 font-mono whitespace-pre-wrap break-all bg-gray-50 rounded p-3">
                {this.state.error.message}
                {this.state.error.stack ? '\n\n' + this.state.error.stack : ''}
              </pre>
            </details>
          )}
        </div>
      </div>
    )
  }
}
