import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ChatPanel from '../components/ChatPanel'
import DocumentSidebar from '../components/DocumentSidebar'
import Editor from '../components/Editor'
import TopBar from '../components/TopBar'

export default function Document() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [user, setUser] = useState(null)
  // Seed with data passed from library view for instant render; fetch fresh copy in background
  const [doc, setDoc] = useState(location.state?.doc ?? null)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [contextText, setContextText] = useState('')

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
  }, [])

  useEffect(() => {
    if (!id) return
    api.getDocument(id).then(setDoc).catch(() => navigate('/'))
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleUpdate = (updated) => {
    setDoc(updated)
  }

  // Called when user clicks "Add to chat" in the editor
  const handleSelectText = (text) => {
    setContextText(text)
    setIsChatOpen(true)
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        docTitle={doc?.title}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen((v) => !v)}
      />
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar document={doc} />
        <Editor document={doc} onUpdate={handleUpdate} onSelectText={handleSelectText} />
        {isChatOpen && (
          <ChatPanel
            docId={id}
            document={doc}
            onUpdateDocument={handleUpdate}
            onClose={() => setIsChatOpen(false)}
            contextText={contextText}
            onClearContext={() => setContextText('')}
          />
        )}
      </div>
    </div>
  )
}
