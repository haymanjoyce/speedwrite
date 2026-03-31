import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api } from '../api'
import MarkdownPreview from '../components/MarkdownPreview'

function timeAgo(isoString) {
  const date = new Date(isoString + 'Z')
  const now = new Date()
  const diffMs = now - date
  const diffSeconds = Math.floor(diffMs / 1000)
  const diffMinutes = Math.floor(diffSeconds / 60)
  const diffHours = Math.floor(diffMinutes / 60)
  const diffDays = Math.floor(diffHours / 24)
  if (diffSeconds < 60) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes}m ago`
  if (diffHours < 24) return `${diffHours}h ago`
  if (diffDays === 1) return 'yesterday'
  return date.toLocaleDateString()
}

function formatFullTime(isoString) {
  const date = new Date(isoString + 'Z')
  return date.toLocaleString()
}

export default function SharedView() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [notFound, setNotFound] = useState(false)
  const [comments, setComments] = useState([])
  const [name, setName] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState(null)

  useEffect(() => {
    api
      .getSharedVersion(token)
      .then((d) => {
        setData(d)
        setComments(d.comments || [])
      })
      .catch(() => setNotFound(true))
  }, [token])

  const handleSubmit = async () => {
    if (!name.trim() || !body.trim()) return
    setSubmitting(true)
    setSubmitError(null)
    try {
      const comment = await api.postComment(token, name.trim(), body.trim())
      setComments((prev) => [...prev, comment])
      setName('')
      setBody('')
    } catch (err) {
      setSubmitError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (notFound) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-500 text-sm">This shared version is no longer available.</p>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="h-screen flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading…</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Left column — document content */}
      <div className="flex-1 overflow-y-auto px-8 py-10">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">{data.doc_title}</h1>
        <p className="text-sm text-gray-400 mb-8">
          {data.label} &middot; {formatFullTime(data.timestamp)}
        </p>
        <MarkdownPreview content={data.content} />
      </div>

      {/* Right column — comments */}
      <div className="w-80 border-l border-gray-200 flex flex-col flex-shrink-0">
        <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comments</span>
        </div>

        {/* Comment list */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          {comments.length === 0 && (
            <p className="text-sm text-gray-400">No comments yet. Be the first!</p>
          )}
          {comments.map((c) => (
            <div key={c.id} className="text-sm">
              <div className="flex items-center gap-2 mb-0.5">
                <span className="font-semibold text-gray-900">{c.name}</span>
                <span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span>
              </div>
              <p className="text-gray-700 whitespace-pre-wrap">{c.body}</p>
            </div>
          ))}
        </div>

        {/* Comment form */}
        <div className="border-t border-gray-200 p-4 flex-shrink-0">
          <input
            type="text"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 mb-2 focus:outline-none focus:border-gray-400"
          />
          <textarea
            placeholder="Leave a comment…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={2000}
            rows={3}
            className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 mb-2 focus:outline-none focus:border-gray-400 resize-none"
          />
          {submitError && <p className="text-xs text-red-600 mb-2">{submitError}</p>}
          <button
            onClick={handleSubmit}
            disabled={submitting || !name.trim() || !body.trim()}
            className="w-full text-xs text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 rounded px-3 py-1.5 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting…' : 'Submit'}
          </button>
          <p className="text-center mt-4 text-xs text-gray-400">
            Powered by{' '}
            <a
              href="https://speedwrite.app"
              className="hover:text-gray-600 transition-colors"
            >
              SpeedWrite
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}
