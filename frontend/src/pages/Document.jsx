import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ActionsDropdown from '../components/ActionsDropdown'
import ChatPanel from '../components/ChatPanel'
import DocumentSidebar from '../components/DocumentSidebar'
import Editor from '../components/Editor'
import ContextBar from '../components/ContextBar'
import InstructionBar from '../components/InstructionBar'
import ProviderToggle from '../components/ProviderToggle'
import SegmentedControl from '../components/SegmentedControl'
import TopBar from '../components/TopBar'

const ACTION_LABELS = {
  summarise: 'Summarise',
  extract_key_points: 'Extract key points',
  rewrite: 'Rewrite',
  restructure: 'Restructure',
  expand: 'Expand',
  condense: 'Condense',
}

const DIFF_ACTIONS = new Set(['rewrite', 'restructure', 'expand', 'condense'])

export default function Document() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [doc, setDoc] = useState(null)
  const [contextText, setContextText] = useState('')
  const [selectedText, setSelectedText] = useState('')
  const [saveStatus, setSaveStatus] = useState('')
  const [editorContentOverride, setEditorContentOverride] = useState(null)
  const [pendingProposal, setPendingProposal] = useState(null)
  const [editorMode, setEditorMode] = useState('edit')
  const [protectedSections, setProtectedSections] = useState([])
  const [pendingAction, setPendingAction] = useState(null)
  const [isActionRunning, setIsActionRunning] = useState(false)
  const [provider, setProvider] = useState(
    localStorage.getItem('logbooklm_llm_provider') ?? 'anthropic'
  )
  const editorRef = useRef(null)
  const chatPanelRef = useRef(null)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    // Initialise provider from server config only if no localStorage preference saved
    if (!localStorage.getItem('logbooklm_llm_provider')) {
      api.getConfig().then((cfg) => setProvider(cfg.llm_provider)).catch(() => {})
    }
  }, [])

  const handleProviderChange = (p) => {
    setProvider(p)
    localStorage.setItem('logbooklm_llm_provider', p)
  }

  useEffect(() => {
    if (!id) return
    api.getDocument(id).then((data) => {
      setDoc(data)
      setProtectedSections(data.protected_sections ?? [])
    }).catch(() => navigate('/'))
  }, [id])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
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

  const handleAddToChat = () => {
    setContextText(selectedText)
    setSelectedText('')
  }

  const handleSectionRewrite = async (sectionContent) => {
    setSaveStatus('Rewriting…')
    try {
      const res = await api.chatMessage(id, 'Rewrite this section.', sectionContent, true, provider)
      if (res.proposed_content) {
        setPendingProposal(res.proposed_content)
      }
      chatPanelRef.current?.appendMessages(
        'Rewrite this section.',
        res.message || 'Proposed changes ready — accept or reject above.'
      )
    } catch (err) {
      console.error('Rewrite failed', err)
    } finally {
      setSaveStatus('')
      setContextText('')
    }
  }

  const handleAccept = () => {
    setEditorContentOverride(pendingProposal)
    setPendingProposal(null)
    api.addLogEntry(id, 'rewrite_accepted', 'AI rewrite accepted')
  }

  const handleReject = () => {
    setPendingProposal(null)
    chatPanelRef.current?.appendMessages(null, 'Changes rejected.')
    api.addLogEntry(id, 'rewrite_rejected', 'AI rewrite rejected')
  }

  // Called by ActionsDropdown: instructions=null means show instruction bar (diff actions)
  const handleActionSelect = (action, instructions) => {
    if (instructions === null) {
      setPendingAction(action)
    } else {
      runAction(action, instructions)
    }
  }

  const runAction = async (action, instructions) => {
    setPendingAction(null)
    setIsActionRunning(true)
    setSaveStatus('Running…')
    try {
      const res = await api.documentAction(id, action, instructions, provider)
      if (DIFF_ACTIONS.has(action)) {
        if (res.proposed_content) {
          setPendingProposal(res.proposed_content)
        }
        chatPanelRef.current?.appendMessages(
          ACTION_LABELS[action],
          res.result || 'Proposed changes ready — accept or reject above.'
        )
      } else {
        chatPanelRef.current?.appendMessages(ACTION_LABELS[action], res.result)
      }
    } catch (err) {
      console.error('Action failed', err)
    } finally {
      setIsActionRunning(false)
      setSaveStatus('')
    }
  }

  const contextBarActions = pendingProposal
    ? [
        { label: 'Accept', onClick: handleAccept, variant: 'default' },
        { label: 'Reject', onClick: handleReject, variant: 'default' },
      ]
    : [
        ...(selectedText ? [{ label: 'Add to chat', onClick: handleAddToChat, variant: 'default' }] : []),
        { label: 'Evidence', onClick: () => navigate(`/document/${id}/evidence`), variant: 'default' },
        { label: 'Log', onClick: () => navigate(`/document/${id}/log`), variant: 'default' },
        { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
      ]

  const editPreviewControl = !pendingProposal && (
    <SegmentedControl
      options={[
        { value: 'edit', label: 'Edit' },
        { value: 'preview', label: 'Preview' },
      ]}
      value={editorMode}
      onChange={setEditorMode}
    />
  )

  const actionsControl = !pendingProposal && (
    <ActionsDropdown onAction={handleActionSelect} disabled={isActionRunning} />
  )

  const providerControl = !pendingProposal && (
    <ProviderToggle provider={provider} onChange={handleProviderChange} />
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} />
      <ContextBar
        actions={contextBarActions}
        statusText={pendingProposal ? 'Reviewing changes…' : saveStatus}
        controls={
          (actionsControl || providerControl || editPreviewControl)
            ? <div className="flex items-center gap-2">{actionsControl}{providerControl}{editPreviewControl}</div>
            : null
        }
      />
      {pendingAction && (
        <InstructionBar
          action={ACTION_LABELS[pendingAction]}
          onRun={(instructions) => runAction(pendingAction, instructions)}
          onCancel={() => setPendingAction(null)}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar
          document={doc}
          onHeadingClick={(text) => editorRef.current?.scrollToHeading(text)}
          onSectionSelect={(text) => setContextText(text)}
          onSectionRewrite={handleSectionRewrite}
          protectedSections={protectedSections}
          onToggleProtection={handleToggleProtection}
        />
        <Editor
          ref={editorRef}
          document={doc}
          onUpdate={handleUpdate}
          onSelectText={setSelectedText}
          onSaveStatus={setSaveStatus}
          contentOverride={editorContentOverride}
          onContentOverrideApplied={() => setEditorContentOverride(null)}
          pendingProposal={pendingProposal}
          editorMode={editorMode}
          protectedSections={protectedSections}
        />
        <ChatPanel
          ref={chatPanelRef}
          docId={id}
          document={doc}
          onProposedChange={setPendingProposal}
          contextText={contextText}
          onClearContext={() => setContextText('')}
          provider={provider}
        />
      </div>
    </div>
  )
}
