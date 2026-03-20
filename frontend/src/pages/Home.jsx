import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import ContextBar from '../components/ContextBar'
import TopBar from '../components/TopBar'

export default function Home() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [documents, setDocuments] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [generatingDescription, setGeneratingDescription] = useState(false)

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
      const { description } = await api.generateDescription(selectedDoc.id)
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
        { label: 'Open', onClick: () => navigate(`/document/${selectedDoc.id}`, { state: { doc: selectedDoc } }), variant: 'default' },
        { label: 'Evidence', onClick: () => navigate(`/document/${selectedDoc.id}/evidence`), variant: 'default' },
        { label: 'Log', onClick: () => navigate(`/document/${selectedDoc.id}/log`), variant: 'default' },
        { label: 'Delete', onClick: handleDelete, variant: 'default' },
      ] : []} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 flex flex-col flex-shrink-0">
          <div className="px-4 pt-4 pb-3 border-b border-gray-200">
            <button
              onClick={handleNewDocument}
              className="w-full text-sm bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 transition-colors"
            >
              + New Document
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {documents.length === 0 && (
              <p className="text-gray-400 text-xs px-4 py-2">No documents yet.</p>
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
        <main className="flex-1 bg-white overflow-y-auto">
          {!selectedDoc ? (
            <div className="h-full flex items-center justify-center text-gray-400 text-sm">
              Select a document to view it
            </div>
          ) : (
            <div className="p-10 max-w-2xl">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{selectedDoc.title}</h1>
              <p className="text-sm text-gray-400 mb-6">
                Last updated {new Date(selectedDoc.updated_at).toLocaleString()}
              </p>
              {selectedDoc.description ? (
                <p className="text-gray-600 leading-relaxed mb-6">{selectedDoc.description}</p>
              ) : (
                <p className="text-gray-400 italic mb-6">No description yet.</p>
              )}
              <button
                onClick={handleGenerateDescription}
                disabled={generatingDescription}
                className="text-xs text-blue-600 hover:text-blue-800 cursor-pointer transition-colors disabled:text-gray-400"
              >
                {generatingDescription ? 'Generating…' : selectedDoc.description ? 'Regenerate description' : 'Generate description'}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
