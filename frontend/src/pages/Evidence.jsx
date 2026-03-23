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
  const initialSelectDoneRef = useRef(false)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/'))
    api.listEvidence(id).then(setItems).catch(console.error)
  }, [id])

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
    try {
      await api.reindexEvidence(id)
      setReindexStatus('Reindex started')
    } catch (err) {
      setReindexStatus('Reindex failed')
    } finally {
      setTimeout(() => setReindexStatus(''), 3000)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete "${selectedItem.title}"? This cannot be undone.`)) return
    try {
      await api.deleteEvidence(id, selectedItem.id)
      setItems((prev) => prev.filter((i) => i.id !== selectedItem.id))
      setSelectedItem(null)
    } catch (err) {
      console.error('Delete failed', err)
    }
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar user={user} onLogout={handleLogout} docTitle={doc?.title} docId={id} subPageLabel="Evidence" />
      <ContextBar
        statusText={reindexStatus}
        actions={[
          { label: 'Document', onClick: () => navigate(`/document/${id}`), variant: 'default' },
          { label: 'Log', onClick: () => navigate(`/document/${id}/log`), variant: 'default' },
          { label: 'Reindex', onClick: handleReindex, variant: 'default' },
          ...(selectedItem?.type === 'document' && selectedItem?.sync === false ? [{ label: 'Sync now', onClick: handleSync, variant: 'default' }] : []),
          ...(selectedItem ? [{ label: 'Delete', onClick: handleDelete, variant: 'default' }] : []),
          { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
        ]}
      />
      <div className="flex flex-1 overflow-hidden">
        <EvidenceSidebar
          items={items}
          selectedId={selectedItem?.id}
          onSelect={handleSelect}
          onAdd={() => setShowModal(true)}
        />
        <SourceDetail item={selectedItem} onToggleSync={handleToggleSync} onFetchLiveContent={handleFetchLiveContent} />
        <EvidenceChatPanel docId={id} evidenceSources={items} document={doc} />
      </div>
      {showModal && (
        <AddSourceModal onAdd={handleAdd} onClose={() => setShowModal(false)} docId={id} />
      )}
    </div>
  )
}
