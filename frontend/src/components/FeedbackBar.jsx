import { useEffect, useState } from 'react'
import { api } from '../api'

export default function FeedbackBar({ onClose }) {
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState('idle') // 'idle' | 'sending' | 'success' | 'error'

  useEffect(() => {
    const onKeyDown = (e) => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const handleSubmit = async () => {
    if (!message.trim() || status === 'sending') return
    setStatus('sending')
    try {
      await api.submitFeedback(message.trim())
      setStatus('success')
      setTimeout(onClose, 2000)
    } catch {
      setStatus('error')
    }
  }

  const sending = status === 'sending'

  return (
    <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center gap-3 flex-shrink-0">
      <span className="text-sm font-medium text-gray-600 flex-shrink-0">Feedback</span>
      {status === 'success' ? (
        <span className="flex-1 text-sm text-gray-600">Thanks for your feedback!</span>
      ) : (
        <>
          <input
            autoFocus
            value={message}
            onChange={(e) => { setMessage(e.target.value); if (status === 'error') setStatus('idle') }}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
            placeholder="Suggest an improvement..."
            maxLength={2000}
            disabled={sending}
            className="flex-1 border border-gray-200 rounded px-3 py-1 text-sm text-gray-800 outline-none focus:border-gray-400 transition-colors bg-white disabled:opacity-60"
          />
          {status === 'error' && (
            <span className="text-xs text-red-500 flex-shrink-0">Failed to send — please try again</span>
          )}
          <button
            onClick={handleSubmit}
            disabled={sending || !message.trim()}
            className="rounded px-3 py-1 text-sm bg-gray-900 text-white hover:bg-gray-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {sending ? 'Sending…' : 'Send'}
          </button>
        </>
      )}
      <button
        onClick={onClose}
        className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0"
      >
        ×
      </button>
    </div>
  )
}
