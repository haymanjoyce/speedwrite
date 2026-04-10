import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ChatPanel from '../components/ChatPanel'
import DocumentSidebar from '../components/DocumentSidebar'
import Editor from '../components/Editor'
import ContextBar from '../components/ContextBar'
import ActionsDropdown from '../components/ActionsDropdown'
import FeedbackBar from '../components/FeedbackBar'
import TopBar from '../components/TopBar'
import { FREE_ACTION_CAP } from '../constants/limits'

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
  const [isRenaming, setIsRenaming] = useState(false)
  const [activeBar, setActiveBar] = useState(null) // null | 'save-template'
  const [showFeedback, setShowFeedback] = useState(false)
  const [saveTemplateTitle, setSaveTemplateTitle] = useState('')
  const [saveTemplateDesc, setSaveTemplateDesc] = useState('')
  const [flashStatus, setFlashStatus] = useState('')
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

  const handleSectionRewritePrefill = (sectionContent, headingText) => {
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


  const handleRename = () => setIsRenaming(true)

  const handleRenameSave = async (newTitle) => {
    setIsRenaming(false)
    if (!newTitle || newTitle === doc?.title) return
    try {
      const oldTitle = doc?.title
      const updated = await api.updateDocument(id, { title: newTitle })
      setDoc(updated)
    } catch (err) {
      console.error('Rename failed', err)
    }
  }

  const handleRenameCancel = () => setIsRenaming(false)

  const handleSaveAsTemplate = () => {
    setSaveTemplateTitle(doc?.title || '')
    setSaveTemplateDesc('')
    setActiveBar('save-template')
  }

  const handleSaveTemplateDone = async () => {
    const title = saveTemplateTitle.trim()
    if (!title) return
    try {
      await api.createTemplate({ title, description: saveTemplateDesc.trim(), content: doc?.content || '' })
      setActiveBar(null)
      setFlashStatus('Template saved')
      setTimeout(() => setFlashStatus(''), 3000)
    } catch (err) {
      console.error('Save template failed', err)
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
    try {
      await api.createSnapshot(id)
      setFlashStatus('Version saved')
      setTimeout(() => setFlashStatus(''), 3000)
    } catch (err) {
      console.error('Save version failed', err)
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
        { label: 'Accept', onClick: handleAccept, variant: 'default' },
        { label: 'Reject', onClick: handleReject, variant: 'default' },
      ]
    : [
        ...(selectedText ? [{ label: 'Add to chat', onClick: handleAddToChat, variant: 'primary' }] : []),
        { label: 'Save version', onClick: handleSaveVersion, variant: 'default' },
        { label: 'Rename', onClick: handleRename, variant: 'default' },
        { label: 'Save as template', onClick: handleSaveAsTemplate, variant: 'default' },
        { label: 'Close', onClick: () => navigate('/home'), variant: 'default' },
      ]


  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        docTitle={doc?.title}
        isRenaming={isRenaming}
        onRenameSave={handleRenameSave}
        onRenameCancel={handleRenameCancel}
        hasByokKey={user?.has_byok_key ?? false}
        actionsRemaining={user ? (user.has_byok_key ? null : Math.max(0, FREE_ACTION_CAP - (user.ai_actions_used ?? 0))) : null}
        onFeedbackClick={() => setShowFeedback(true)}
      />
      {showFeedback && <FeedbackBar onClose={() => setShowFeedback(false)} />}
      <ContextBar
        tabs={pendingProposal ? [] : contextBarTabs}
        actions={contextBarActions}
        rightControls={!pendingProposal ? (
          <ActionsDropdown
            title="Export ▾"
            actions={[
              { action: 'txt', label: '.txt' },
              { action: 'pdf', label: '.pdf' },
            ]}
            onAction={(fmt) => handleExport(fmt)}
          />
        ) : null}
      />
      {activeBar === 'save-template' && (
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm font-medium text-gray-600 flex-shrink-0">Save as template</span>
          <input
            autoFocus
            value={saveTemplateTitle}
            onChange={(e) => setSaveTemplateTitle(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplateDone(); if (e.key === 'Escape') setActiveBar(null) }}
            placeholder="Template title"
            className="border border-gray-200 rounded px-3 py-1 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors bg-white w-48"
          />
          <input
            value={saveTemplateDesc}
            onChange={(e) => setSaveTemplateDesc(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTemplateDone(); if (e.key === 'Escape') setActiveBar(null) }}
            placeholder="Brief description (optional)"
            className="flex-1 border border-gray-200 rounded px-3 py-1 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors bg-white"
          />
          <button
            onClick={handleSaveTemplateDone}
            className="rounded px-3 py-1 text-sm bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Save
          </button>
          <button
            onClick={() => setActiveBar(null)}
            className="rounded px-3 py-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar
          document={doc}
          onHeadingClick={(text) => editorRef.current?.scrollToHeading(text)}
          onSectionRewrite={handleSectionRewritePrefill}
          protectedSections={protectedSections}
          onToggleProtection={handleToggleProtection}
          structureLocked={structureLocked}
          onToggleStructureLock={handleToggleStructureLock}
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
          onEditorModeChange={setEditorMode}
          protectedSections={protectedSections}
          flashStatus={flashStatus}
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
            evidenceCount={doc?.evidence?.length ?? 0}
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
