import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ContextBar from '../components/ContextBar'
import MarkdownPreview from '../components/MarkdownPreview'
import TopBar from '../components/TopBar'
import { FREE_ACTION_CAP } from '../constants/limits'

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
  const [shareToken, setShareToken] = useState(null)
  const [shareComments, setShareComments] = useState([])
  const [sharing, setSharing] = useState(false)

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
    setShareToken(null)
    setShareComments([])
    setLoadingContent(true)
    try {
      const full = await api.getSnapshot(id, snapshot.id)
      setSnapshotContent(full.content)
      setShareToken(full.share_token ?? null)
      setShareComments(full.comments ?? [])
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

  const handleShare = async () => {
    if (!selectedSnapshot || sharing) return
    setSharing(true)
    try {
      const res = await api.shareSnapshot(id, selectedSnapshot.id)
      setShareToken(res.token)
    } catch (err) {
      console.error('Failed to share snapshot', err)
    } finally {
      setSharing(false)
    }
  }

  const handleUnshare = async () => {
    try {
      await api.unshareSnapshot(id, selectedSnapshot.id)
      setShareToken(null)
    } catch (err) {
      console.error('Failed to unshare snapshot', err)
    }
  }

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteComment(id, selectedSnapshot.id, commentId)
      setShareComments((prev) => prev.filter((c) => c.id !== commentId))
    } catch (err) {
      console.error('Failed to delete comment', err)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/shared/' + shareToken)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        docTitle={doc?.title}
        hasByokKey={user?.has_byok_key ?? false}
        actionsRemaining={user ? (user.has_byok_key ? null : Math.max(0, FREE_ACTION_CAP - (user.ai_actions_used ?? 0))) : null}
      />
      <ContextBar
        tabs={[
          { label: 'Document', active: false, onClick: () => navigate(`/document/${id}`) },
          { label: 'Evidence', active: false, onClick: () => navigate(`/document/${id}/evidence`) },
          { label: 'History', active: true, onClick: () => {} },
        ]}
        actions={[
          {
            label: shareToken ? 'Shared ✓' : 'Share version',
            onClick: handleShare,
            disabled: !selectedSnapshot || !!shareToken || sharing,
            variant: 'default',
          },
          { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
        ]}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — snapshot list */}
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

        {/* Middle panel — version detail */}
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

        {/* Right panel — sharing & comments */}
        <div className="w-80 border-l border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center gap-2 flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide flex-1">Comments</span>
            {selectedSnapshot && shareToken && (
              <>
                <button
                  onClick={handleCopyLink}
                  title="Copy share link"
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer rounded hover:bg-gray-100"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </button>
                <button
                  onClick={handleUnshare}
                  className="text-xs text-red-600 border border-red-200 hover:bg-red-50 rounded px-2 py-1 transition-colors cursor-pointer"
                >
                  Revoke
                </button>
              </>
            )}
            {selectedSnapshot && !shareToken && (
              <button
                onClick={handleShare}
                disabled={sharing}
                className="text-xs text-blue-600 border border-blue-200 hover:bg-blue-50 rounded px-2 py-1 transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Share this version
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto">
            {!selectedSnapshot || !shareToken ? (
              selectedSnapshot && !shareToken ? (
                <div className="h-full flex items-center justify-center p-6">
                  <p className="text-sm text-gray-400 text-center">Share this version to collect feedback</p>
                </div>
              ) : null
            ) : (
              <div className="flex flex-col h-full">
                {/* Share URL */}
                <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={window.location.origin + '/shared/' + shareToken}
                      className="flex-1 text-xs bg-gray-50 border border-gray-200 rounded px-2 py-1.5 text-gray-600 min-w-0"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="text-xs text-gray-600 border border-gray-200 hover:bg-gray-50 rounded px-2 py-1.5 transition-colors cursor-pointer flex-shrink-0"
                    >
                      Copy
                    </button>
                  </div>
                </div>
                {/* Comments list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {shareComments.length === 0 && (
                    <p className="text-sm text-gray-400">No comments yet.</p>
                  )}
                  {shareComments.map((c) => (
                    <div key={c.id} className="text-sm group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-gray-900 truncate">{c.name}</span>
                          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(c.created_at)}</span>
                        </div>
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-xs text-red-400 hover:text-red-600 transition-colors cursor-pointer opacity-0 group-hover:opacity-100 flex-shrink-0 leading-none"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-gray-700 mt-0.5 whitespace-pre-wrap">{c.body}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
