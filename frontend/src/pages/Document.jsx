import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import ActionsDropdown from '../components/ActionsDropdown'
import ChatPanel from '../components/ChatPanel'
import DocumentSidebar from '../components/DocumentSidebar'
import Editor from '../components/Editor'
import ContextBar from '../components/ContextBar'
import InstructionBar from '../components/InstructionBar'
import SegmentedControl from '../components/SegmentedControl'
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

const REDRAFT_LABELS = {
  rewrite: 'Rewrite',
  restructure: 'Restructure',
  expand: 'Expand',
  condense: 'Condense',
  simplify: 'Simplify',
  formalise: 'Formalise',
}

const REDRAFT_PROMPTS = {
  rewrite: 'Rewrite this entire document.',
  restructure: 'Restructure this document for better organisation and flow.',
  expand: 'Expand this document by fleshing out thin sections and adding more detail throughout.',
  condense: 'Condense this document by removing redundancy while preserving all key information.',
  simplify: 'Rewrite this document in simpler language. Reduce jargon, shorten sentences, and make it accessible to a non-specialist audience while preserving all key information.',
  formalise: 'Rewrite this document in a more formal, professional tone. Remove casual language, tighten the writing, and ensure it is appropriate for a professional or academic audience.',
}

const INSIGHTS_PROMPTS = {
  summarise: 'Summarise this document in 3-4 sentences.',
  extract_key_points: 'Extract the key points from this document as a bullet list.',
  critique: 'Critically review this document. Identify weaknesses, gaps, inconsistencies, unsupported claims, or areas that need more development. Be specific and constructive.',
  suggest_improvements: 'Review this document and suggest specific improvements. Consider structure, clarity, completeness, tone, and persuasiveness. Provide actionable recommendations.',
}

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

  const handleSectionRewritePrefill = (sectionContent, headingText) => {
    chatPanelRef.current?.prefillRewrite(sectionContent, headingText)
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

  const handleActionSelect = (action, instructions) => {
    if (instructions === null) {
      setPendingAction(action)
    } else {
      // Insights: fire immediately via chat panel
      chatPanelRef.current?.fireInsight(INSIGHTS_PROMPTS[action])
    }
  }

  const runAction = (action, instructions) => {
    setPendingAction(null)
    const base = REDRAFT_PROMPTS[action]
    const prompt = instructions.trim() ? `${base} ${instructions.trim()}` : base
    chatPanelRef.current?.fireInsight(prompt)
  }

  const handleRename = async () => {
    const newName = window.prompt('Rename document:', doc?.title)
    if (!newName || !newName.trim()) return
    try {
      const updated = await api.updateDocument(id, { title: newName.trim() })
      setDoc(updated)
    } catch (err) {
      console.error('Rename failed', err)
    }
  }

  const contextBarActions = pendingProposal
    ? [
        { label: 'Accept', onClick: handleAccept, variant: 'default' },
        { label: 'Reject', onClick: handleReject, variant: 'default' },
      ]
    : [
        ...(selectedText ? [{ label: 'Add to chat', onClick: handleAddToChat, variant: 'primary' }] : []),
        { label: 'Rename', onClick: handleRename, variant: 'default' },
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

  const redraftControl = !pendingProposal && (
    <ActionsDropdown
      title="Redraft"
      actions={[
        { label: 'Rewrite', action: 'rewrite' },
        { label: 'Restructure', action: 'restructure' },
        { label: 'Expand', action: 'expand' },
        { label: 'Condense', action: 'condense' },
        { label: 'Simplify', action: 'simplify' },
        { label: 'Formalise', action: 'formalise' },
      ]}
      onAction={(action) => handleActionSelect(action, null)}
    />
  )

  const insightsControl = !pendingProposal && (
    <ActionsDropdown
      title="Insights"
      actions={[
        { label: 'Summarise', action: 'summarise' },
        { label: 'Extract key points', action: 'extract_key_points' },
        { label: 'Critique', action: 'critique' },
        { label: 'Suggest improvements', action: 'suggest_improvements' },
      ]}
      onAction={(action) => handleActionSelect(action, '')}
    />
  )

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} />
      <ContextBar
        actions={contextBarActions}
        statusText={pendingProposal ? 'Reviewing changes…' : saveStatus}
        controls={
          (redraftControl || insightsControl || editPreviewControl)
            ? <div className="flex items-center gap-2">{redraftControl}{insightsControl}{editPreviewControl}</div>
            : null
        }
      />
      {pendingAction && (
        <InstructionBar
          action={REDRAFT_LABELS[pendingAction]}
          onRun={(instructions) => runAction(pendingAction, instructions)}
          onCancel={() => setPendingAction(null)}
        />
      )}
      <div className="flex flex-1 overflow-hidden">
        <DocumentSidebar
          document={doc}
          onHeadingClick={(text) => editorRef.current?.scrollToHeading(text)}
          onSectionRewrite={handleSectionRewritePrefill}
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
          headings={parseHeadingsWithContent(doc?.content)}
          evidenceSources={doc?.evidence || []}
        />
      </div>
    </div>
  )
}
