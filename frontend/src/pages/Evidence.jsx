import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '../api'
import AddSourceModal from '../components/AddSourceModal'
import EvidenceSidebar from '../components/EvidenceSidebar'
import SourceDetail from '../components/SourceDetail'
import ContextBar from '../components/ContextBar'
import TopBar from '../components/TopBar'

export default function Evidence() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [user, setUser] = useState(null)
  const [doc, setDoc] = useState(null)
  const [items, setItems] = useState([])
  const [selectedItem, setSelectedItem] = useState(null)
  const [showModal, setShowModal] = useState(false)

  useEffect(() => {
    api.me().then(setUser).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
    api.getDocument(id).then(setDoc).catch(() => navigate('/'))
    api.listEvidence(id).then(setItems).catch(console.error)
  }, [id])

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
    } else {
      newItem = await api.addEvidenceText(id, payload.title, payload.content)
    }
    setItems((prev) => [...prev, newItem])
    setSelectedItem(newItem)
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
      <ContextBar actions={[
        { label: 'Document', onClick: () => navigate(`/document/${id}`), variant: 'default' },
        { label: 'Log', onClick: () => navigate(`/document/${id}/log`), variant: 'default' },
        ...(selectedItem ? [{ label: 'Delete', onClick: handleDelete, variant: 'default' }] : []),
        { label: 'Close', onClick: () => navigate('/'), variant: 'default' },
      ]} />
      <div className="flex flex-1 overflow-hidden">
        <EvidenceSidebar
          items={items}
          selectedId={selectedItem?.id}
          onSelect={handleSelect}
          onAdd={() => setShowModal(true)}
        />
        <SourceDetail item={selectedItem} />
      </div>
      {showModal && (
        <AddSourceModal onAdd={handleAdd} onClose={() => setShowModal(false)} />
      )}
    </div>
  )
}
