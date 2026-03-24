import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ContextBar from '../components/ContextBar'
import MarkdownPreview from '../components/MarkdownPreview'
import TopBar from '../components/TopBar'

const TRIGGER_ICONS = { auto: '💾', rewrite: '🤖', manual: '📌', restore: '🔄' }

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

export default function History() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [doc, setDoc] = useState(null)
  const [snapshots, setSnapshots] = useState([])
  const [selectedSnapshot, setSelectedSnapshot] = useState(null)
  const [snapshotContent, setSnapshotContent] = useState(null)
  const [loadingContent, setLoadingContent] = useState(false)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/'))
    api.listHistory(id).then(setSnapshots).catch(console.error)
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleSelect = async (snapshot) => {
    setSelectedSnapshot(snapshot)
    setSnapshotContent(null)
    setLoadingContent(true)
    try {
      const full = await api.getSnapshot(id, snapshot.id)
      setSnapshotContent(full.content)
    } catch (err) {
      console.error('Failed to load snapshot', err)
      setSnapshotContent('')
    } finally {
      setLoadingContent(false)
    }
  }

  const handleRestore = () => {
    navigate(`/document/${id}`, {
      state: {
        restoreContent: snapshotContent,
        restoreSnapshotId: selectedSnapshot.id,
        restoreSnapshotLabel: selectedSnapshot.label,
      },
    })
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} />
      <ContextBar
        tabs={[
          { label: 'Document', active: false, onClick: () => navigate(`/document/${id}`) },
          { label: 'Evidence', active: false, onClick: () => navigate(`/document/${id}/evidence`) },
          { label: 'Log', active: false, onClick: () => navigate(`/document/${id}/log`) },
          { label: 'History', active: true, onClick: () => {} },
        ]}
        actions={[
          { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
        ]}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">History</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {snapshots.length === 0 && (
              <p className="text-gray-400 text-xs px-4 py-2">No versions saved yet.</p>
            )}
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                onClick={() => handleSelect(snap)}
                className={`px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-100 ${
                  snap.id === selectedSnapshot?.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span>{TRIGGER_ICONS[snap.trigger] ?? '💾'}</span>
                  <span className="text-sm font-medium truncate">{snap.label}</span>
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{timeAgo(snap.timestamp)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <main className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Version</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            {!selectedSnapshot ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Select a version to preview it
              </div>
            ) : loadingContent ? (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Loading…
              </div>
            ) : (
              <div className="flex flex-col h-full">
                <div className="px-6 pt-6 pb-4 border-b border-gray-100 flex items-center justify-between flex-shrink-0">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{TRIGGER_ICONS[selectedSnapshot.trigger] ?? '💾'}</span>
                      <h2 className="text-base font-semibold text-gray-900">{selectedSnapshot.label}</h2>
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{formatFullTime(selectedSnapshot.timestamp)}</p>
                  </div>
                  <button
                    onClick={handleRestore}
                    className="text-xs text-white bg-blue-600 border border-blue-600 hover:bg-blue-700 rounded px-3 py-1 transition-colors cursor-pointer"
                  >
                    Restore this version
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto">
                  <MarkdownPreview content={snapshotContent ?? ''} />
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  )
}
