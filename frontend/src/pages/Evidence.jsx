import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import AddSourceModal from '../components/AddSourceModal'
import EvidenceChatPanel from '../components/EvidenceChatPanel'
import EvidenceSidebar from '../components/EvidenceSidebar'
import SourceDetail from '../components/SourceDetail'
import ContextBar from '../components/ContextBar'
import FeedbackBar from '../components/FeedbackBar'
import TopBar from '../components/TopBar'

export default function Evidence() {
  const navigate = useNavigate()
  const location = useLocation()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [doc, setDoc] = useState(null)
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [showModal, setShowModal] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)
  const [reindexStatus, setReindexStatus] = useState('')
  const [describeStatus, setDescribeStatus] = useState('idle') // idle | describing | done
  const [pendingDelete, setPendingDelete] = useState(false)
  const [refreshingId, setRefreshingId] = useState(null)
  const [updateSourceDoneId, setUpdateSourceDoneId] = useState(null)
  const [updateAllStatus, setUpdateAllStatus] = useState('idle') // idle | updating | done
  const initialSelectDoneRef = useRef(false)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/home'))
    api.listEvidence(id).then(setItems).catch(console.error)
  }, [id])

  useEffect(() => { setPendingDelete(false) }, [selectedItem?.id])

  useEffect(() => {
    if (!pendingDelete) return
    const handler = (e) => { if (e.key === 'Escape') setPendingDelete(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [pendingDelete])

  // Pre-select a source when navigated here from search results
  useEffect(() => {
    if (!initialSelectDoneRef.current && location.state?.evidenceId && items.length > 0) {
      const target = items.find((i) => i.id === location.state.evidenceId)
      if (target) {
        initialSelectDoneRef.current = true
        handleSelect(target)
      }
    }
  }, [items])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/')
  }

  const handleSelect = async (item) => {
    try {
      const full = await api.getEvidence(id, item.id)
      setSelectedItem(full)
    } catch (err) {
      console.error('Failed to load source', err)
    }
  }

  const handleAdd = async (type, payload) => {
    let newItem
    if (type === 'file') {
      newItem = await api.addEvidenceFile(id, payload)
    } else if (type === 'url') {
      newItem = await api.addEvidenceUrl(id, payload)
    } else if (type === 'document') {
      newItem = await api.addEvidenceDocument(id, payload)
    } else {
      newItem = await api.addEvidenceText(id, payload.title, payload.content)
    }
    setItems((prev) => [...prev, newItem])
    setSelectedItem(newItem)
  }

  const handleDescribe = async () => {
    if (!selectedItem) return
    setDescribeStatus('describing')
    try {
      const updated = await api.describeEvidence(id, selectedItem.id)
      setSelectedItem(updated)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setDescribeStatus('done')
      setTimeout(() => setDescribeStatus('idle'), 3000)
    } catch (err) {
      console.error('Describe failed', err)
      setDescribeStatus('idle')
    }
  }

  const handleReindex = async () => {
    setReindexStatus('Reindexing…')
    try {
      await api.reindexEvidence(id)
      setReindexStatus('Reindexed')
    } catch (err) {
      setReindexStatus('Reindex failed')
    } finally {
      setTimeout(() => setReindexStatus(''), 3000)
    }
  }

  // Returns true on success, false on error — used by both single and bulk update handlers.
  const handleRefresh = async (evidenceId) => {
    setRefreshingId(evidenceId)
    try {
      const updated = await api.refreshEvidence(id, evidenceId)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      if (selectedItem?.id === evidenceId) setSelectedItem(updated)
      return true
    } catch (err) {
      console.error('Refresh failed', err)
      return false
    } finally {
      setRefreshingId(null)
    }
  }

  const handleUpdateSource = async () => {
    if (!selectedItem) return
    const targetId = selectedItem.id
    const success = await handleRefresh(targetId)
    if (success) {
      setUpdateSourceDoneId(targetId)
      setTimeout(() => setUpdateSourceDoneId((cur) => (cur === targetId ? null : cur)), 3000)
    }
  }

  const handleUpdateAllSources = async () => {
    setUpdateAllStatus('updating')
    const refreshableItems = items.filter((i) => i.type === 'url' || i.type === 'document')
    let anySuccess = false
    for (const item of refreshableItems) {
      const success = await handleRefresh(item.id)
      if (success) anySuccess = true
    }
    if (anySuccess) {
      setUpdateAllStatus('done')
      setTimeout(() => setUpdateAllStatus('idle'), 3000)
    } else {
      setUpdateAllStatus('idle')
    }
  }

  const handleDelete = async () => {
    try {
      await api.deleteEvidence(id, selectedItem.id)
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id))
      setSelectedItem(null)
      setPendingDelete(false)
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

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
        tabs={[
          { label: 'Document', active: false, onClick: () => navigate(`/document/${id}`) },
          { label: 'Evidence', active: true, onClick: () => {} },
          { label: 'History', active: false, onClick: () => navigate(`/document/${id}/history`) },
          { label: 'Images', active: false, onClick: () => navigate(`/document/${id}/images`) },
        ]}
        actions={[
          {
            label: describeStatus === 'describing' ? 'Describing…' : describeStatus === 'done' ? 'Described ✓' : 'Describe',
            onClick: handleDescribe,
            variant: 'default',
            disabled: !selectedItem || describeStatus !== 'idle',
          },
          {
            label: refreshingId === selectedItem?.id ? 'Updating…' : updateSourceDoneId === selectedItem?.id ? 'Updated ✓' : 'Update source',
            onClick: handleUpdateSource,
            variant: 'default',
            disabled: !selectedItem || (selectedItem.type !== 'url' && selectedItem.type !== 'document') || refreshingId === selectedItem?.id || updateSourceDoneId === selectedItem?.id,
          },
          {
            label: updateAllStatus === 'updating' ? 'Updating…' : updateAllStatus === 'done' ? 'Updated ✓' : 'Update all sources',
            onClick: handleUpdateAllSources,
            variant: 'default',
            disabled: !items.some((i) => i.type === 'url' || i.type === 'document') || updateAllStatus !== 'idle',
          },
          {
            label: reindexStatus === 'Reindexing…' ? 'Reindexing…' : reindexStatus === 'Reindexed' ? 'Reindexed ✓' : 'Reindex',
            onClick: handleReindex,
            variant: 'default',
            disabled: items.length === 0 || reindexStatus !== '',
          },
          {
            label: 'Delete',
            onClick: () => setPendingDelete(true),
            variant: 'default',
            disabled: !selectedItem,
          },
          { label: 'Add source', onClick: () => setShowModal(true), variant: 'primary' },
        ]}
      />
      {pendingDelete && selectedItem && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-red-700 flex-1">Delete "{selectedItem.title}"? This cannot be undone.</span>
          <button onClick={handleDelete} className="text-xs text-red-600 hover:text-red-800 font-medium transition-colors">Delete</button>
          <button onClick={() => setPendingDelete(false)} className="text-xs text-gray-500 hover:text-gray-700 transition-colors">Cancel</button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <EvidenceSidebar
          items={items}
          selectedId={selectedItem?.id}
          onSelect={handleSelect}
          docId={id}
          onItemUpdate={(updated) => {
            setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
            if (selectedItem?.id === updated.id) setSelectedItem(updated)
          }}
        />
        <SourceDetail
          item={selectedItem}
          allItems={items}
        />
        <EvidenceChatPanel
          docId={id}
          evidenceSources={items}
          document={doc}
          actionsUsed={user?.ai_actions_used ?? 0}
          hasByokKey={user?.has_byok_key ?? false}
          onActionComplete={() => { api.me().then(setUser).catch(() => {}) }}
        />
      </div>
      {showModal && (
        <AddSourceModal onAdd={handleAdd} onClose={() => setShowModal(false)} docId={id} />
      )}
    </div>
  )
}
