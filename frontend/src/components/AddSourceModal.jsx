import { useRef, useState } from 'react'

const TYPES = [
  { id: 'file', label: '📄 File', desc: '.pdf, .txt, .md, .docx' },
  { id: 'url', label: '🔗 URL', desc: 'Fetch a web page' },
  { id: 'text', label: '📝 Text', desc: 'Paste text directly' },
]

export default function AddSourceModal({ onAdd, onClose }) {
  const [type, setType] = useState('file')
  const [url, setUrl] = useState('')
  const [textTitle, setTextTitle] = useState('')
  const [textContent, setTextContent] = useState('')
  const [file, setFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const fileRef = useRef(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      if (type === 'file') {
        if (!file) { setError('Please select a file.'); setLoading(false); return }
        await onAdd('file', file)
      } else if (type === 'url') {
        if (!url.trim()) { setError('Please enter a URL.'); setLoading(false); return }
        await onAdd('url', url.trim())
      } else {
        if (!textTitle.trim() || !textContent.trim()) {
          setError('Please enter a title and content.')
          setLoading(false)
          return
        }
        await onAdd('text', { title: textTitle.trim(), content: textContent.trim() })
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to add source.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-800">Add Source</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-6 py-4">
          {/* Type selector */}
          <div className="flex gap-2 mb-5">
            {TYPES.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex-1 rounded border py-2 px-2 text-xs transition-colors ${
                  type === t.id
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 text-gray-500 hover:border-gray-300'
                }`}
              >
                <div className="font-medium">{t.label}</div>
                <div className="text-gray-400 mt-0.5">{t.desc}</div>
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {type === 'file' && (
              <div>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.txt,.md,.docx"
                  onChange={(e) => setFile(e.target.files[0] ?? null)}
                  className="block w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-sm file:bg-gray-100 file:text-gray-700 hover:file:bg-gray-200 file:cursor-pointer cursor-pointer"
                />
              </div>
            )}

            {type === 'url' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">URL</label>
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://example.com/article"
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors"
                />
              </div>
            )}

            {type === 'text' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Title</label>
                  <input
                    type="text"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    placeholder="Source title"
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Content</label>
                  <textarea
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    placeholder="Paste your text here…"
                    rows={6}
                    className="w-full border border-gray-200 rounded px-3 py-2 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors resize-none font-mono"
                  />
                </div>
              </>
            )}

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="text-sm bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400 text-white px-5 py-2 rounded transition-colors font-medium"
              >
                {loading ? 'Adding…' : 'Add Source'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
