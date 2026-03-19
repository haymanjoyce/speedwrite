import { useEffect, useRef, useState } from 'react'
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
  const [contextText, setContextText] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [editorContentOverride, setEditorContentOverride] = useState(null)
  const [pendingProposal, setPendingProposal] = useState(null)
  const editorRef = useRef(null)

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

  const handleAccept = () => {
    setEditorContentOverride(pendingProposal)
    setPendingProposal(null)
  }

  const handleReject = () => {
    setPendingProposal(null)
  }

  const contextBarActions = pendingProposal
    ? [
        { label: 'Accept', onClick: handleAccept, variant: 'default' },
        { label: 'Reject', onClick: handleReject, variant: 'default' },
      ]
    : [
        ...(selectedText ? [{ label: 'Add to chat', onClick: handleAddToChat, variant: 'default' }] : []),
        { label: 'Evidence', onClick: () => navigate(`/document/${id}/evidence`), variant: 'default' },
        { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
      ]

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} />
      <ContextBar actions={contextBarActions} statusText={saveStatus} />
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar
          document={doc}
          onHeadingClick={(text) => editorRef.current?.scrollToHeading(text)}
          onSectionSelect={(text) => setContextText(text)}
        />
        <Editor
          ref={editorRef}
          document={doc}
          onUpdate={handleUpdate}
          onSelectText={setSelectedText}
          onSaveStatus={setSaveStatus}
          contentOverride={editorContentOverride}
          pendingProposal={pendingProposal}
        />
        <ChatPanel
          docId={id}
          document={doc}
          onProposedChange={setPendingProposal}
          contextText={contextText}
          onClearContext={() => setContextText('')}
        />
      </div>
    </div>
  )
}
