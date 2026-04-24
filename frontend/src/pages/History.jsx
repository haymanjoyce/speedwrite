import { useEffect, useState } from 'react'
import ResizableGutter from '../components/ResizableGutter'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import Button from '../components/Button'
import ContextBar from '../components/ContextBar'
import FeedbackBar from '../components/FeedbackBar'
import MarkdownPreview from '../components/MarkdownPreview'
import TopBar from '../components/TopBar'


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

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
function formatSnapshotTime(isoString) {
  const date = new Date(isoString + 'Z')
  const day = String(date.getDate()).padStart(2, '0')
  const mon = MONTHS[date.getMonth()]
  const hh = String(date.getHours()).padStart(2, '0')
  const mm = String(date.getMinutes()).padStart(2, '0')
  return `${day} ${mon} ${hh}:${mm}`
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
  const [ownerCommentBody, setOwnerCommentBody] = useState('')
  const [ownerCommentSubmitting, setOwnerCommentSubmitting] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [ownerCommentError, setOwnerCommentError] = useState(null)
  const [copyStatus, setCopyStatus] = useState('idle')

  const [leftWidth, setLeftWidth] = useState(() => {
    try {
      const s = localStorage.getItem('speedwrite_panel_widths_history')
      if (s) { const p = JSON.parse(s); if (typeof p.left === 'number') return p.left }
    } catch {}
    return 256
  })
  const [rightWidth, setRightWidth] = useState(() => {
    try {
      const s = localStorage.getItem('speedwrite_panel_widths_history')
      if (s) { const p = JSON.parse(s); if (typeof p.right === 'number') return p.right }
    } catch {}
    return 320
  })

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/home'))
    api.listHistory(id).then(setSnapshots).catch(console.error)
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const handleSelect = async (snapshot) => {
    setSelectedSnapshot(snapshot)
    setSnapshotContent(null)
    setShareToken(null)
    setShareComments([])
    setOwnerCommentBody('')
    setOwnerCommentError(null)
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
      setSnapshots((prev) =>
        prev.map((s) =>
          s.id === selectedSnapshot.id ? { ...s, comment_count: Math.max(0, s.comment_count - 1) } : s
        )
      )
    } catch (err) {
      console.error('Failed to delete comment', err)
    }
  }

  const handleOwnerComment = async () => {
    if (!ownerCommentBody.trim()) return
    setOwnerCommentSubmitting(true)
    setOwnerCommentError(null)
    try {
      const comment = await api.postOwnerComment(id, selectedSnapshot.id, ownerCommentBody.trim())
      setShareComments((prev) => [...prev, comment])
      setOwnerCommentBody('')
      setSnapshots((prev) =>
        prev.map((s) =>
          s.id === selectedSnapshot.id ? { ...s, comment_count: s.comment_count + 1 } : s
        )
      )
    } catch (err) {
      setOwnerCommentError(err.message)
    } finally {
      setOwnerCommentSubmitting(false)
    }
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.origin + '/shared/' + shareToken)
    setCopyStatus('copied')
    setTimeout(() => setCopyStatus('idle'), 3000)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        docTitle={doc?.title}
        showBack={true}
        onFeedbackClick={() => setShowFeedback(true)}
      />
      {showFeedback && <FeedbackBar onClose={() => setShowFeedback(false)} />}
      <ContextBar
        tabs={[
          { label: 'Document', active: false, onClick: () => navigate(`/document/${id}`) },
          { label: 'Evidence', active: false, onClick: () => navigate(`/document/${id}/evidence`) },
          { label: 'History', active: true, onClick: () => {} },
          { label: 'Images', active: false, onClick: () => navigate(`/document/${id}/images`) },
        ]}
        actions={[
          ...(selectedSnapshot && shareToken
            ? [{ label: 'Revoke', onClick: handleUnshare, variant: 'default', disabled: !selectedSnapshot }]
            : [{ label: 'Share this version', onClick: handleShare, variant: 'default', disabled: !selectedSnapshot || sharing }]),
          { label: copyStatus === 'copied' ? 'Copied ✓' : 'Copy link', onClick: handleCopyLink, variant: 'default', disabled: !selectedSnapshot || !shareToken },
          { label: 'Restore this version', onClick: handleRestore, variant: 'primary', disabled: !selectedSnapshot },
        ]}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel — snapshot list */}
        <div style={{ width: leftWidth, flexShrink: 0 }} className="bg-gray-50 border-r border-gray-200 flex flex-col">
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
                className={`px-4 py-2 cursor-pointer transition-colors text-sm flex items-center gap-2 min-w-0 overflow-hidden ${
                  snap.id === selectedSnapshot?.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className={`font-mono text-xs flex-shrink-0 ${snap.id === selectedSnapshot?.id ? 'text-gray-900' : 'text-gray-500'}`}>
                  {formatSnapshotTime(snap.timestamp)}
                </span>
                <span className="truncate">{snap.label}</span>
              </div>
            ))}
          </div>
        </div>

        <ResizableGutter
          side="left"
          currentWidth={leftWidth}
          onResize={setLeftWidth}
          onResizeEnd={(w) => localStorage.setItem('speedwrite_panel_widths_history', JSON.stringify({ left: w, right: rightWidth }))}
          min={180}
          max={window.innerWidth - rightWidth - 300}
        />

        {/* Middle panel — version detail */}
        <main className="flex-1 min-w-0 bg-white flex flex-col overflow-hidden">
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
              <>
                <div className="bg-white border-b border-gray-100 p-6 flex-shrink-0">
                  <div className="space-y-1">
                  <div className="flex gap-3 text-xs">
                    <span className="text-gray-400 flex-shrink-0 w-24">Label</span>
                    <span className="text-gray-700">{selectedSnapshot.label}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-gray-400 flex-shrink-0 w-24">Saved</span>
                    <span className="text-gray-700">{formatFullTime(selectedSnapshot.timestamp)}</span>
                  </div>
                  <div className="flex gap-3 text-xs">
                    <span className="text-gray-400 flex-shrink-0 w-24">Trigger</span>
                    <span className="text-gray-700 capitalize">{selectedSnapshot.trigger}</span>
                  </div>
                  {selectedSnapshot.is_shared && (
                    <div className="flex gap-3 text-xs">
                      <span className="text-gray-400 flex-shrink-0 w-24">Shared</span>
                      <span className="text-gray-700">Yes</span>
                    </div>
                  )}
                  {selectedSnapshot.comment_count > 0 && (
                    <div className="flex gap-3 text-xs">
                      <span className="text-gray-400 flex-shrink-0 w-24">Comments</span>
                      <span className="text-gray-700">{selectedSnapshot.comment_count}</span>
                    </div>
                  )}
                  </div>
                </div>
                <MarkdownPreview content={snapshotContent ?? ''} />
              </>
            )}
          </div>
        </main>

        <ResizableGutter
          side="right"
          currentWidth={rightWidth}
          onResize={setRightWidth}
          onResizeEnd={(w) => localStorage.setItem('speedwrite_panel_widths_history', JSON.stringify({ left: leftWidth, right: w }))}
          min={300}
          max={window.innerWidth - leftWidth - 300}
        />

        {/* Right panel — sharing & comments */}
        <div style={{ width: rightWidth, flexShrink: 0 }} className="border-l border-gray-200 flex flex-col">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Comments</span>
          </div>

          <div className="flex-1 flex flex-col overflow-hidden">
            {!selectedSnapshot ? null : (
              <>
                {/* Comments list */}
                <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {!shareToken && shareComments.length === 0 && (
                    <p className="text-sm text-gray-400">Share this version to collect feedback</p>
                  )}
                  {shareToken && shareComments.length === 0 && (
                    <p className="text-sm text-gray-400">No comments yet.</p>
                  )}
                  {shareComments.map((c) => (
                    <div
                      key={c.id}
                      className={`text-sm group rounded px-2 py-1.5 ${c.is_owner ? 'bg-blue-50' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-semibold text-gray-900 truncate">{c.name}</span>
                          {c.is_owner && (
                            <span className="text-xs text-blue-500 flex-shrink-0">Owner</span>
                          )}
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
                {/* Owner comment form */}
                <div className="border-t border-gray-200 p-4 flex-shrink-0">
                  <textarea
                    placeholder="Add a note…"
                    value={ownerCommentBody}
                    onChange={(e) => setOwnerCommentBody(e.target.value)}
                    maxLength={2000}
                    rows={3}
                    className="w-full text-sm border border-gray-200 rounded px-3 py-1.5 mb-2 focus:outline-none focus:border-gray-400 resize-none"
                  />
                  {ownerCommentError && (
                    <p className="text-xs text-red-600 mb-2">{ownerCommentError}</p>
                  )}
                  <Button variant="secondary" size="sm" onClick={handleOwnerComment} disabled={ownerCommentSubmitting || !ownerCommentBody.trim()} className="w-full">
                    {ownerCommentSubmitting ? 'Submitting…' : 'Submit'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
