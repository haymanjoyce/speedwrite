import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ContextBar from '../components/ContextBar'
import TopBar from '../components/TopBar'

const EVENT_LABELS = {
  document_created: 'Created',
  document_edited: 'Saved',
  document_renamed: 'Renamed',
  rewrite_accepted: 'Rewrite accepted',
  rewrite_rejected: 'Rewrite rejected',
  version_restored: 'Version restored',
  manual_checkpoint: 'Version saved',
  evidence_added: 'Source added',
  evidence_deleted: 'Source deleted',
  section_locked: 'Section locked',
  section_unlocked: 'Section unlocked',
  structure_locked: 'Structure locked',
  structure_unlocked: 'Structure unlocked',
  template_created: 'Template saved',
  document_deleted: 'Document deleted',
}

const METADATA_LABELS = {
  title: 'Title',
  from: 'From',
  to: 'To',
  word_count: 'Word count',
  heading: 'Section',
  source_type: 'Source type',
  url: 'URL',
  file_size: 'File size',
  source_doc_id: 'Source document ID',
  label: 'Label',
  source_snapshot_id: 'Snapshot ID',
  source_snapshot_label: 'Snapshot label',
  template_title: 'Template title',
}

function formatRelativeTime(isoString) {
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

export default function Log() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [doc, setDoc] = useState(null)
  const [entries, setEntries] = useState([])
  const [selectedEntry, setSelectedEntry] = useState(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/'))
    api.listLog(id).then(setEntries).catch(console.error)
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} />
      <ContextBar
        tabs={[
          { label: 'Document', active: false, onClick: () => navigate(`/document/${id}`) },
          { label: 'Evidence', active: false, onClick: () => navigate(`/document/${id}/evidence`) },
          { label: 'Log', active: true, onClick: () => {} },
          { label: 'History', active: false, onClick: () => navigate(`/document/${id}/history`) },
        ]}
        actions={[
          { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
        ]}
      />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Log</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {entries.length === 0 && (
              <p className="text-gray-400 text-xs px-4 py-2">No log entries yet.</p>
            )}
            {entries.map((entry) => (
              <div
                key={entry.id}
                onClick={() => setSelectedEntry(entry)}
                className={`px-4 py-2.5 cursor-pointer transition-colors border-b border-gray-100 ${
                  entry.id === selectedEntry?.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <div className="text-sm font-medium truncate">
                  {EVENT_LABELS[entry.event] ?? entry.event}
                </div>
                {(entry.summary || entry.detail) && (
                  <div className="text-xs text-gray-500 mt-0.5 truncate">
                    {entry.summary || entry.detail}
                  </div>
                )}
                <div className="text-xs text-gray-400 mt-0.5">
                  {formatRelativeTime(entry.timestamp)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <main className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Entry Detail</span>
          </div>
          <div className="flex-1 overflow-y-auto">
          {!selectedEntry ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select an entry to view details
            </div>
          ) : (
            <div className="p-10 max-w-xl">
              <h1 className="text-2xl font-bold text-gray-900 mb-1">
                {EVENT_LABELS[selectedEntry.event] ?? selectedEntry.event}
              </h1>
              <p className="text-sm text-gray-400 mb-6">
                {formatFullTime(selectedEntry.timestamp)}
              </p>
              {(selectedEntry.summary || selectedEntry.detail) && (
                <p className="text-gray-700 text-sm mb-6">{selectedEntry.summary || selectedEntry.detail}</p>
              )}
              {selectedEntry.metadata && Object.keys(selectedEntry.metadata).length > 0 && (
                <div className="mb-8 space-y-2">
                  {Object.entries(selectedEntry.metadata).map(([key, value]) => (
                    <div key={key} className="flex gap-3 text-sm">
                      <span className="text-gray-400 w-36 flex-shrink-0">{METADATA_LABELS[key] ?? key}</span>
                      <span className="text-gray-700 break-all">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-300 font-mono">{selectedEntry.id}</p>
            </div>
          )}
          </div>
        </main>
      </div>
    </div>
  )
}
