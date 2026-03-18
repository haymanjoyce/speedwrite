import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ChatPanel from '../components/ChatPanel'
import DocumentSidebar from '../components/DocumentSidebar'
import Editor from '../components/Editor'
import ContextBar from '../components/ContextBar'
import TopBar from '../components/TopBar'

export default function Document() {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const [user, setUser] = useState(null)
  // Seed with data passed from library view for instant render; fetch fresh copy in background
  const [doc, setDoc] = useState(location.state?.doc ?? null)
  const [chatMode, setChatMode] = useState('chat')
  const [contextText, setContextText] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [editorContentOverride, setEditorContentOverride] = useState(null)

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

  const handleAddToChat = () => {
    setContextText(selectedText)
    setSelectedText('')
  }

  const modeControl = (
    <div className="flex border border-gray-200 rounded overflow-hidden ml-auto">
      {['chat', 'agent'].map((m) => (
        <button
          key={m}
          onClick={() => setChatMode(m)}
          className={`px-3 py-0.5 text-xs transition-colors ${
            chatMode === m
              ? 'bg-blue-600 text-white'
              : 'bg-white text-gray-500 hover:bg-gray-50'
          }`}
        >
          {m.charAt(0).toUpperCase() + m.slice(1)}
        </button>
      ))}
    </div>
  )

  const contextBarActions = selectedText
    ? [{ label: 'Add to chat', onClick: handleAddToChat, variant: 'primary' }]
    : []

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} />
      <ContextBar actions={contextBarActions} controls={modeControl} statusText={saveStatus} />
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar document={doc} />
        <Editor
          document={doc}
          onUpdate={handleUpdate}
          onSelectText={setSelectedText}
          onSaveStatus={setSaveStatus}
          contentOverride={editorContentOverride}
        />
        <ChatPanel
          docId={id}
          document={doc}
          onUpdateDocument={handleUpdate}
          onContentUpdate={setEditorContentOverride}
          contextText={contextText}
          onClearContext={() => setContextText('')}
          mode={chatMode}
        />
      </div>
    </div>
  )
}
