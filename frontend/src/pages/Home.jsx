import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import Button from '../components/Button'
import ContextBar from '../components/ContextBar'
import TemplatePickerOverlay from '../components/TemplatePickerOverlay'
import TopBar from '../components/TopBar'

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [generatingDescription, setGeneratingDescription] = useState(false)
  const [isRenaming, setIsRenaming] = useState(false)
  const [renameValue, setRenameValue] = useState('')
  const [showTemplatePicker, setShowTemplatePicker] = useState(false)
  const renameInputRef = useRef(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.listDocuments().then(setDocuments).catch(console.error)
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
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

  useEffect(() => { setIsRenaming(false) }, [selectedDoc?.id])

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
    if (!window.confirm(`Are you sure you want to delete "${selectedDoc.title}"? This cannot be undone.`)) return
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
    setGeneratingDescription(true)
    try {
      const res = await api.documentAction(selectedDoc.id, 'summarise')
      const description = res.result
      const updated = { ...selectedDoc, description }
      setSelectedDoc(updated)
      setDocuments((prev) => prev.map((d) => d.id === updated.id ? updated : d))
    } catch (err) {
      console.error('Generate description failed', err)
    } finally {
      setGeneratingDescription(false)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} />
      <ContextBar actions={selectedDoc ? [
        { label: 'Open', onClick: () => navigate(`/document/${selectedDoc.id}`, { state: { doc: selectedDoc } }), variant: 'primary' },
        { label: 'Rename', onClick: handleRename, variant: 'default' },
        { label: 'Evidence', onClick: () => navigate(`/document/${selectedDoc.id}/evidence`), variant: 'default' },
        { label: 'Log', onClick: () => navigate(`/document/${selectedDoc.id}/log`), variant: 'default' },
        { label: 'Delete', onClick: handleDelete, variant: 'default' },
      ] : []} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="h-9 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Documents</span>
          </div>
          <div className="px-4 pt-3 pb-3 border-b border-gray-200 flex flex-col gap-2">
            <Button variant="primary" size="md" onClick={handleNewDocument} className="w-full">
              + New Document
            </Button>
            <Button variant="secondary" size="md" onClick={() => setShowTemplatePicker(true)} className="w-full">
              From template…
            </Button>
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
          <div className="h-9 bg-white border-b border-gray-200 px-4 flex items-center flex-shrink-0">
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
            <div className="p-10 max-w-2xl">
              {isRenaming ? (
                <div className="flex items-center gap-2 mb-2">
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
                    className="text-3xl font-bold text-gray-900 border-b-2 border-blue-400 outline-none bg-transparent flex-1 min-w-0"
                  />
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleRenameSave}
                    className="text-green-600 hover:text-green-800 text-lg flex-shrink-0"
                  >✓</button>
                  <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={handleRenameCancel}
                    className="text-red-500 hover:text-red-700 text-lg flex-shrink-0"
                  >✕</button>
                </div>
              ) : (
                <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedDoc.title}</h1>
              )}
              <p className="text-sm text-gray-400 mb-6">
                Last updated {new Date(selectedDoc.updated_at).toLocaleString()}
              </p>
              {selectedDoc.description ? (
                <p className="text-gray-600 leading-relaxed mb-6">{selectedDoc.description}</p>
              ) : (
                <p className="text-gray-400 italic mb-6">No description yet.</p>
              )}
              <Button variant="secondary" onClick={handleGenerateDescription} disabled={generatingDescription}>
                {generatingDescription ? 'Generating…' : selectedDoc.description ? 'Regenerate description' : 'Generate description'}
              </Button>
            </div>
          )}
          </div>
        </main>
      </div>
      {showTemplatePicker && (
        <TemplatePickerOverlay onClose={() => setShowTemplatePicker(false)} />
      )}
    </div>
  )
}
