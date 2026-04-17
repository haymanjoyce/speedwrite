import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import ContextBar from '../components/ContextBar'
import FeedbackBar from '../components/FeedbackBar'
import TopBar from '../components/TopBar'

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [generateDescriptionStatus, setGenerateDescriptionStatus] = useState('idle') // idle | generating | done
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [pendingDelete, setPendingDelete] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState(null)
  const renameInputRef = useRef(null)
  const importInputRef = useRef(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.listDocuments().then(setDocuments).catch(console.error)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const handleNewDocument = async () => {
    try {
      const doc = await api.createDocument({ content: '# Untitled\n\n' })
      setDocuments((prev) => [doc, ...prev])
      navigate(`/document/${doc.id}`, { state: { doc } })
    } catch (err) {
      console.error('Failed to create document', err)
    }
  }

  useEffect(() => { setIsRenaming(false); setPendingDelete(false) }, [selectedDoc?.id])

  useEffect(() => {
    if (!pendingDelete) return
    const handler = (e) => { if (e.key === 'Escape') setPendingDelete(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [pendingDelete])

  const handleImport = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    setImporting(true)
    setImportError(null)
    try {
      const doc = await api.importDocument(file)
      navigate(`/document/${doc.id}`)
    } catch (err) {
      setImportError(err.message || 'Import failed')
      setTimeout(() => setImportError(null), 4000)
    } finally {
      setImporting(false)
    }
  }

  const handleDuplicate = async () => {
    try {
      const doc = await api.duplicateDocument(selectedDoc.id)
      setDocuments((prev) => [doc, ...prev])
      setSelectedDoc(doc)
    } catch (err) {
      setImportError(err.message || 'Duplicate failed')
      setTimeout(() => setImportError(null), 4000)
    }
  }

  const handleRename = () => {
    setRenameValue(selectedDoc.title)
    setIsRenaming(true)
  }

  const handleRenameSave = async () => {
    const trimmed = renameValue.trim()
    setIsRenaming(false)
    if (!trimmed || trimmed === selectedDoc.title) return
    try {
      const updated = await api.updateDocument(selectedDoc.id, { title: trimmed })
      setSelectedDoc(updated)
      setDocuments((prev) => prev.map((d) => d.id === updated.id ? updated : d))
    } catch (err) {
      console.error('Rename failed', err)
    }
  }

  const handleRenameCancel = () => setIsRenaming(false)

  const handleDelete = async () => {
    setPendingDelete(false)
    try {
      await api.deleteDocument(selectedDoc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== selectedDoc.id))
      setSelectedDoc(null)
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  const handleGenerateDescription = async () => {
    if (!selectedDoc) return
    setGenerateDescriptionStatus('generating')
    try {
      const res = await api.documentAction(selectedDoc.id, 'generate_description')
      const description = res.result
      const updated = { ...selectedDoc, description }
      setSelectedDoc(updated)
      setDocuments((prev) => prev.map((d) => d.id === updated.id ? updated : d))
      await api.updateDocument(selectedDoc.id, { description })
      setGenerateDescriptionStatus('done')
      setTimeout(() => setGenerateDescriptionStatus('idle'), 3000)
    } catch (err) {
      console.error('Generate description failed', err)
      setGenerateDescriptionStatus('idle')
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        onFeedbackClick={() => setShowFeedback(true)}
      />
      {showFeedback && <FeedbackBar onClose={() => setShowFeedback(false)} />}
      <ContextBar
        actions={[
          { label: 'Import', onClick: () => importInputRef.current.click(), variant: 'default', disabled: importing, title: 'Supports .docx, .md, .txt' },
          { label: generateDescriptionStatus === 'generating' ? 'Describing…' : generateDescriptionStatus === 'done' ? 'Described ✓' : 'Describe', onClick: handleGenerateDescription, variant: 'default', disabled: !selectedDoc || generateDescriptionStatus !== 'idle' },
          { label: 'Rename', onClick: handleRename, variant: 'default', disabled: !selectedDoc },
          { label: 'Duplicate', onClick: handleDuplicate, variant: 'default', disabled: !selectedDoc },
          { label: 'Delete', onClick: () => setPendingDelete(true), variant: 'default', disabled: !selectedDoc },
          { label: 'Open', onClick: () => navigate(`/document/${selectedDoc.id}`, { state: { doc: selectedDoc } }), variant: selectedDoc ? 'primary' : 'default', disabled: !selectedDoc },
          { label: 'New Document', onClick: handleNewDocument, variant: selectedDoc ? 'default' : 'primary' },
        ]}
      />
      {pendingDelete && selectedDoc && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-red-700 flex-1">Delete "{selectedDoc.title}"? This cannot be undone.</span>
          <button
            onClick={handleDelete}
            className="text-xs bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setPendingDelete(false)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      {importError && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex-shrink-0">
          <span className="text-xs text-red-600">{importError}</span>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</span>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {documents.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full px-4 py-8 text-center">
                <span className="text-3xl mb-3">📄</span>
                <p className="text-sm font-medium text-gray-700 mb-1">No documents yet</p>
                <p className="text-xs text-gray-400">Create your first document to get started.</p>
              </div>
            )}
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`px-4 py-2 cursor-pointer text-sm truncate transition-colors ${
                  doc.id === selectedDoc?.id
                    ? 'bg-gray-100 text-gray-900'
                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {doc.title}
              </div>
            ))}
          </div>
        </div>

        {/* Right panel */}
        <main className="flex-1 bg-white flex flex-col overflow-hidden">
          <div className="h-11 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Document Detail</span>
          </div>
          <div className="flex-1 overflow-y-auto">
          {!selectedDoc ? (
            documents.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <div className="text-center max-w-sm px-6">
                  <h1 className="text-xl font-semibold text-gray-800 mb-3">Welcome to SpeedWrite</h1>
                  <p className="text-sm text-gray-500 leading-relaxed">
                    SpeedWrite is an AI-assisted document authoring platform. Create a document, attach evidence sources, and let AI help you write, rewrite, and refine your content.
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                Select a document to view it
              </div>
            )
          ) : (
            <>
              <div className="bg-white border-b border-gray-100 p-6 flex-shrink-0">
                {isRenaming ? (
                  <input
                    ref={renameInputRef}
                    autoFocus
                    onFocus={(e) => e.target.select()}
                    value={renameValue}
                    onChange={(e) => setRenameValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRenameSave()
                      if (e.key === 'Escape') handleRenameCancel()
                    }}
                    onBlur={handleRenameSave}
                    className="text-base font-semibold text-gray-900 border-b border-blue-400 outline-none bg-transparent w-full mb-3"
                  />
                ) : (
                  <h1 className="text-base font-semibold text-gray-900 mb-3">{selectedDoc.title}</h1>
                )}
                <div className="space-y-1">
                  {[
                    ['Created', selectedDoc.created_at ? new Date(selectedDoc.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : null],
                    ['Last updated', new Date(selectedDoc.updated_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })],
                    ['Words', `~${(selectedDoc.content ? selectedDoc.content.split(/\s+/).filter(Boolean).length : 0).toLocaleString()}`],
                  ].filter(([, v]) => v != null).map(([label, value]) => (
                    <div key={label} className="flex gap-3 text-xs">
                      <span className="text-gray-400 flex-shrink-0 w-24">{label}</span>
                      <span className="text-gray-700">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="p-6">
                {selectedDoc.description ? (
                  <div className="space-y-4">
                    {selectedDoc.description.split(/\n(?=## )/).map((block) => {
                      const lines = block.trim().split('\n')
                      const heading = lines[0].replace(/^##\s*/, '').trim()
                      const bullets = lines.slice(1).filter((l) => /^[-*]\s/.test(l.trim())).map((l) => l.replace(/^[-*]\s*/, '').trim())
                      return (
                        <div key={heading}>
                          <p className="text-xs font-semibold text-gray-700 uppercase tracking-wide mb-1">{heading}</p>
                          <ul className="space-y-0.5">
                            {bullets.map((b, i) => (
                              <li key={i} className="text-sm text-gray-600 pl-3 flex gap-2"><span className="flex-shrink-0">·</span><span>{b}</span></li>
                            ))}
                          </ul>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-gray-400 italic">No description yet.</p>
                )}
              </div>
            </>
          )}
          </div>
        </main>
      </div>
      <input ref={importInputRef} type="file" accept=".docx,.md,.txt" className="hidden" onChange={handleImport} />
    </div>
  )
}
