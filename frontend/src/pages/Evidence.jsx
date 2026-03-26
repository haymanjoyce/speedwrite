import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import AddSourceModal from '../components/AddSourceModal'
import EvidenceChatPanel from '../components/EvidenceChatPanel'
import EvidenceSidebar from '../components/EvidenceSidebar'
import SourceDetail from '../components/SourceDetail'
import ContextBar from '../components/ContextBar'
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
  const [reindexStatus, setReindexStatus] = useState('')
  const [pendingDelete, setPendingDelete] = useState(false)
  const [refreshingId, setRefreshingId] = useState(null)
  const [updatingAllSources, setUpdatingAllSources] = useState(false)
  const initialSelectDoneRef = useRef(false)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/'))
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
    navigate('/login')
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

  const handleSync = async () => {
    try {
      const updated = await api.syncEvidence(id, selectedItem.id)
      setSelectedItem(updated)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } catch (err) {
      console.error('Sync failed', err)
    }
  }

  const handleFetchLiveContent = async () => {
    const sourceDoc = await api.getDocument(selectedItem.source_doc_id)
    return sourceDoc.content ?? ''
  }

  const handleToggleSync = async (syncOn) => {
    try {
      const updated = await api.updateEvidence(id, selectedItem.id, { sync: syncOn })
      setSelectedItem(updated)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
    } catch (err) {
      console.error('Toggle sync failed', err)
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

  const handleRefresh = async (evidenceId) => {
    setRefreshingId(evidenceId)
    try {
      const updated = await api.refreshEvidence(id, evidenceId)
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      if (selectedItem?.id === evidenceId) setSelectedItem(updated)
    } catch (err) {
      console.error('Refresh failed', err)
    } finally {
      setRefreshingId(null)
    }
  }

  const handleUpdateAllSources = async () => {
    setUpdatingAllSources(true)
    try {
      const urlItems = items.filter((i) => i.type === 'url')
      for (const item of urlItems) {
        await handleRefresh(item.id)
      }
    } finally {
      setUpdatingAllSources(false)
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
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} />
      <ContextBar
        tabs={[
          { label: 'Document', active: false, onClick: () => navigate(`/document/${id}`) },
          { label: 'Evidence', active: true, onClick: () => {} },
          { label: 'History', active: false, onClick: () => navigate(`/document/${id}/history`) },
        ]}
        controls={reindexStatus ? <span className="text-xs text-gray-400">{reindexStatus}</span> : null}
        actions={[
          ...(items.length > 0 ? [{ label: 'Reindex', onClick: handleReindex, variant: 'default' }] : []),
          ...(selectedItem?.type === 'document' && selectedItem?.sync === false ? [{ label: 'Sync now', onClick: handleSync, variant: 'default' }] : []),
          ...(selectedItem ? [{ label: 'Delete', onClick: () => setPendingDelete(true), variant: 'default' }] : []),
          { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
        ]}
      />
      {pendingDelete && selectedItem && (
        <div className="bg-red-50 border-b border-red-100 px-6 py-2 flex items-center gap-3 flex-shrink-0">
          <span className="text-sm text-red-700 flex-1">Delete "{selectedItem.title}"? This cannot be undone.</span>
          <button
            onClick={handleDelete}
            className="text-xs bg-red-600 hover:bg-red-700 text-white rounded px-3 py-1 transition-colors"
          >
            Delete
          </button>
          <button
            onClick={() => setPendingDelete(false)}
            className="text-xs text-gray-500 hover:text-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <EvidenceSidebar
          items={items}
          selectedId={selectedItem?.id}
          onSelect={handleSelect}
          onAdd={() => setShowModal(true)}
          onUpdateAllSources={handleUpdateAllSources}
          updatingAllSources={updatingAllSources}
        />
        <SourceDetail
          item={selectedItem}
          allItems={items}
          onToggleSync={handleToggleSync}
          onFetchLiveContent={handleFetchLiveContent}
          onRefresh={() => handleRefresh(selectedItem.id)}
          refreshing={refreshingId === selectedItem?.id}
        />
        <EvidenceChatPanel docId={id} evidenceSources={items} document={doc} />
      </div>
      {showModal && (
        <AddSourceModal onAdd={handleAdd} onClose={() => setShowModal(false)} docId={id} />
      )}
    </div>
  )
}
