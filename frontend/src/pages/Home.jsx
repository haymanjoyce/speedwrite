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
    if (!window.confirm(`Delete "${selectedDoc.title}"?`)) return
    try {
      await api.deleteDocument(selectedDoc.id)
      setDocuments((prev) => prev.filter((d) => d.id !== selectedDoc.id))
      setSelectedDoc(null)
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} />
      <ContextBar actions={[
        { label: 'New Document', icon: '+', onClick: handleNewDocument, variant: 'primary' },
      ]} />
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel */}
        <div className="w-64 bg-gray-700 border-r border-gray-600 flex flex-col flex-shrink-0">
          <div className="px-4 pt-4 pb-3 border-b border-gray-600">
            <p className="text-white font-semibold tracking-tight">Documents</p>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {documents.length === 0 && (
              <p className="text-gray-500 text-xs px-4 py-2">No documents yet.</p>
            )}
            {documents.map((doc) => (
              <div
                key={doc.id}
                onClick={() => setSelectedDoc(doc)}
                className={`px-4 py-2 cursor-pointer text-sm truncate transition-colors ${
                  doc.id === selectedDoc?.id
                    ? 'bg-gray-600 text-white'
                    : 'text-gray-300 hover:bg-gray-700 hover:text-white'
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
              <p className="text-sm text-gray-400 mb-8">
                Last updated {new Date(selectedDoc.updated_at).toLocaleString()}
              </p>
              <p className="text-gray-400 italic mb-10">No description yet.</p>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => navigate(`/document/${selectedDoc.id}`, { state: { doc: selectedDoc } })}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded font-medium transition-colors"
                >
                  Open →
                </button>
                <button
                  onClick={() => navigate(`/document/${selectedDoc.id}/evidence`)}
                  className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2.5 rounded font-medium text-sm transition-colors"
                >
                  Evidence
                </button>
                <button
                  onClick={handleDelete}
                  className="text-red-400 hover:text-red-600 text-sm transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
