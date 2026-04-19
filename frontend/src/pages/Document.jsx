import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ChatPanel from '../components/ChatPanel'
import DocumentSidebar from '../components/DocumentSidebar'
import Editor from '../components/Editor'
import ContextBar from '../components/ContextBar'
import ActionsDropdown from '../components/ActionsDropdown'
import SegmentedControl from '../components/SegmentedControl'
import FeedbackBar from '../components/FeedbackBar'
import TopBar from '../components/TopBar'

function parseHeadingsWithContent(content) {
  const lines = (content || '').split('\n')
  const headings = []
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(/^(#{1,3})\s+(.+)/)
    if (match) {
      const level = match[1].length
      const text = match[2]
      const sectionLines = [lines[i]]
      for (let j = i + 1; j < lines.length; j++) {
        const nextMatch = lines[j].match(/^(#{1,3})\s+/)
        if (nextMatch && nextMatch[1].length <= level) break
        sectionLines.push(lines[j])
      }
      headings.push({ text, level, content: sectionLines.join('\n') })
    }
  }
  return headings
}


export default function Document() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [doc, setDoc] = useState(null)
  const [contextText, setContextText] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [editorContentOverride, setEditorContentOverride] = useState(null)
  const [pendingProposal, setPendingProposal] = useState(null)
  const [pendingProposalReason, setPendingProposalReason] = useState('ai_rewrite')
  const [editorMode, setEditorMode] = useState('edit')
  const [protectedSections, setProtectedSections] = useState([])
  const [structureLocked, setStructureLocked] = useState(false)
  const [restoreSnapshotId, setRestoreSnapshotId] = useState(null)
  const [restoreSnapshotLabel, setRestoreSnapshotLabel] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [saveVersionStatus, setSaveVersionStatus] = useState('idle') // idle | saving | saved
  const [welcomeSaveStatus, setWelcomeSaveStatus] = useState('idle') // idle | saving | saved
  const editorRef = useRef(null)
  const chatPanelRef = useRef(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
  }, [])

  useEffect(() => {
    if (!id) return
    api.getDocument(id).then((data) => {
      setDoc(data)
      setProtectedSections(data.protected_sections ?? [])
      setStructureLocked(data.structure_locked ?? false)
      const saved = localStorage.getItem(`editorMode:${id}`)
      if (saved === 'edit' || saved === 'preview') {
        setEditorMode(saved)
      } else {
        setEditorMode((data.content?.trim().length ?? 0) > 50 ? 'preview' : 'edit')
      }
      if (location.state?.restoreContent) {
        setPendingProposal(location.state.restoreContent)
        setPendingProposalReason('restore')
        setRestoreSnapshotId(location.state.restoreSnapshotId ?? null)
        setRestoreSnapshotLabel(location.state.restoreSnapshotLabel ?? null)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }).catch(() => navigate('/home'))
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const handleUpdate = (updated) => {
    setDoc(updated)
  }

  const handleToggleProtection = async (headingText) => {
    const isProtected = protectedSections.includes(headingText)
    const updated = isProtected
      ? protectedSections.filter((h) => h !== headingText)
      : [...protectedSections, headingText]
    setProtectedSections(updated)
    try {
      if (isProtected) {
        await api.unprotectSection(id, headingText)
      } else {
        await api.protectSection(id, headingText)
      }
    } catch (err) {
      console.error('Toggle protection failed', err)
      setProtectedSections(protectedSections) // revert on error
    }
  }

  const handleToggleStructureLock = async () => {
    const newLocked = !structureLocked
    setStructureLocked(newLocked)
    try {
      if (newLocked) {
        await api.lockStructure(id)
      } else {
        await api.unlockStructure(id)
      }
    } catch (err) {
      console.error('Toggle structure lock failed', err)
      setStructureLocked(structureLocked)
    }
  }

  const handleAddToChat = () => {
    setContextText(selectedText)
    setSelectedText('')
  }

  const handleSectionAddToChat = (sectionContent, headingText) => {
    chatPanelRef.current?.prefillRewrite(sectionContent, headingText)
  }

  const handleAccept = () => {
    setEditorContentOverride(pendingProposal)
    setPendingProposal(null)
    if (pendingProposalReason === 'restore') {
      setPendingProposalReason('ai_rewrite')
      api.createSnapshot(id, 'Before restore', 'restore', restoreSnapshotId, restoreSnapshotLabel).catch(() => {})
      setRestoreSnapshotId(null)
      setRestoreSnapshotLabel(null)
    } else {
      api.createSnapshot(id, 'Before AI rewrite', 'rewrite').catch(() => {})
    }
  }

  const handleReject = () => {
    setPendingProposal(null)
    chatPanelRef.current?.appendMessages(null, 'Changes rejected.')
  }


  const handleSaveAsWelcome = async () => {
    setWelcomeSaveStatus('saving')
    try {
      await api.saveAsWelcome(id)
      setWelcomeSaveStatus('saved')
      setTimeout(() => setWelcomeSaveStatus('idle'), 3000)
    } catch (err) {
      console.error('Save as welcome failed', err)
      setWelcomeSaveStatus('idle')
    }
  }

  const handleExport = async (format) => {
    try {
      await api.downloadExport(id, format)
    } catch (err) {
      console.error('Export failed', err)
    }
  }

  const handleSaveVersion = async () => {
    setSaveVersionStatus('saving')
    try {
      await api.createSnapshot(id)
      setSaveVersionStatus('saved')
      setTimeout(() => setSaveVersionStatus('idle'), 3000)
    } catch (err) {
      console.error('Save version failed', err)
      setSaveVersionStatus('idle')
    }
  }

  const contextBarTabs = [
    { label: 'Document', active: true, onClick: () => {} },
    { label: 'Evidence', active: false, onClick: () => navigate(`/document/${id}/evidence`) },
    { label: 'History', active: false, onClick: () => navigate(`/document/${id}/history`) },
    { label: 'Images', active: false, onClick: () => navigate(`/document/${id}/images`) },
  ]

  const contextBarActions = pendingProposal
    ? [
        { label: 'Accept', onClick: handleAccept, variant: 'primary' },
        { label: 'Reject', onClick: handleReject, variant: 'default' },
      ]
    : []


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
        tabs={pendingProposal ? [] : contextBarTabs}
        actions={contextBarActions}
        rightControls={
          <>
            {!pendingProposal && (
              <SegmentedControl
                options={[{ value: 'edit', label: 'Edit' }, { value: 'preview', label: 'Preview' }]}
                value={editorMode}
                onChange={(mode) => {
                  setEditorMode(mode)
                  localStorage.setItem(`editorMode:${id}`, mode)
                }}
              />
            )}
            {!pendingProposal && (
              <>
                <button
                  onClick={handleAddToChat}
                  disabled={!selectedText}
                  className={`text-xs rounded px-3 py-1 border font-medium transition-colors ${selectedText ? 'bg-blue-600 text-white border-blue-700 hover:bg-blue-700' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-default'}`}
                >
                  Add to chat
                </button>
                <button
                  onClick={handleSaveVersion}
                  disabled={saveVersionStatus === 'saving'}
                  className="text-xs rounded px-3 py-1 border border-gray-200 font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:text-gray-400 transition-colors"
                >
                  {saveVersionStatus === 'saving' ? 'Saving…' : saveVersionStatus === 'saved' ? 'Saved ✓' : 'Save version'}
                </button>
                {user?.is_admin && (
                  <button
                    onClick={handleSaveAsWelcome}
                    disabled={welcomeSaveStatus === 'saving'}
                    className="text-xs rounded px-3 py-1 border border-gray-200 font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:text-gray-400 transition-colors"
                  >
                    {welcomeSaveStatus === 'saving' ? 'Saving…' : welcomeSaveStatus === 'saved' ? 'Saved ✓' : 'Save as welcome'}
                  </button>
                )}
                <ActionsDropdown
                  title="Export ▾"
                  actions={[
                    { action: 'txt', label: '.txt' },
                    { action: 'md', label: '.md' },
                    { action: 'pdf', label: '.pdf' },
                  ]}
                  onAction={(fmt) => handleExport(fmt)}
                />
              </>
            )}
          </>
        }
      />
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar
          document={doc}
          onHeadingClick={(text) => editorMode === 'preview' ? editorRef.current?.scrollToHeadingPreview(text) : editorRef.current?.scrollToHeading(text)}
          onSectionRewrite={handleSectionAddToChat}
          protectedSections={protectedSections}
          onToggleProtection={handleToggleProtection}
          structureLocked={structureLocked}
          onToggleStructureLock={handleToggleStructureLock}
          pendingProposal={!!pendingProposal}
        />
        <Editor
          ref={editorRef}
          document={doc}
          onUpdate={handleUpdate}
          onSelectText={setSelectedText}
          contentOverride={editorContentOverride}
          onContentOverrideApplied={() => setEditorContentOverride(null)}
          pendingProposal={pendingProposal}
          editorMode={editorMode}
          protectedSections={protectedSections}
          structureLocked={structureLocked}
        />
        <div className={pendingProposal ? 'hidden' : 'contents'}>
          <ChatPanel
            ref={chatPanelRef}
            docId={id}
            document={doc}
            onProposedChange={setPendingProposal}
            contextText={contextText}
            onClearContext={() => setContextText('')}
            headings={parseHeadingsWithContent(doc?.content)}
            evidenceSources={doc?.evidence || []}
            pendingProposal={pendingProposal}
            structureLocked={structureLocked}
            actionsUsed={user?.ai_actions_used ?? 0}
            hasByokKey={user?.has_byok_key ?? false}
            onActionComplete={() => { api.me().then(setUser).catch(() => {}) }}
          />
        </div>
      </div>
    </div>
  )
}
