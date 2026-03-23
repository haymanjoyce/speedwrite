import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import { BUILT_IN_TEMPLATES } from '../data/templates'

function TemplateCard({ title, description, onSelect, onDelete }) {
  return (
    <div
      onClick={onSelect}
      className="relative border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-300 hover:shadow-sm transition-all"
    >
      {onDelete && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete() }}
          className="absolute top-2 right-2 text-gray-300 hover:text-gray-500 text-lg leading-none"
          title="Delete template"
        >
          ×
        </button>
      )}
      <div className="text-sm font-medium text-gray-900 mb-1 pr-4">{title}</div>
      <div className="text-xs text-gray-500 leading-relaxed">{description}</div>
    </div>
  )
}

export default function TemplatePickerOverlay({ onClose }) {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('builtin')
  const [myTemplates, setMyTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    setLoadingTemplates(true)
    api.listTemplates()
      .then(setMyTemplates)
      .catch(console.error)
      .finally(() => setLoadingTemplates(false))
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        if (selectedTemplate) setSelectedTemplate(null)
        else onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [selectedTemplate, onClose])

  const handleSelectBuiltin = (template) => {
    setSelectedTemplate(template)
    setDescription('')
  }

  const handleSelectMy = async (template) => {
    try {
      const full = await api.getTemplate(template.id)
      setSelectedTemplate(full)
      setDescription('')
    } catch (err) {
      console.error('Failed to load template', err)
    }
  }

  const handleDeleteMy = async (id) => {
    try {
      await api.deleteTemplate(id)
      setMyTemplates((prev) => prev.filter((t) => t.id !== id))
    } catch (err) {
      console.error('Failed to delete template', err)
    }
  }

  const handleCreateWithout = async () => {
    setCreating(true)
    try {
      const doc = await api.createDocument({ title: selectedTemplate.title, content: selectedTemplate.content })
      navigate(`/document/${doc.id}`)
      onClose()
    } catch (err) {
      console.error('Failed to create document', err)
      setCreating(false)
    }
  }

  const handleCreateWithAI = async () => {
    setCreating(true)
    try {
      const { content } = await api.prefillTemplate({
        template_content: selectedTemplate.content,
        description,
      })
      const doc = await api.createDocument({ title: selectedTemplate.title, content })
      navigate(`/document/${doc.id}`)
      onClose()
    } catch (err) {
      console.error('Failed to create document with AI', err)
      setCreating(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-start justify-center"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-2xl mx-4 mt-16 bg-white rounded-xl shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          {selectedTemplate ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => setSelectedTemplate(null)}
                className="text-gray-400 hover:text-gray-600 text-sm"
              >
                ←
              </button>
              <span className="text-lg font-semibold text-gray-900">{selectedTemplate.title}</span>
            </div>
          ) : (
            <span className="text-lg font-semibold text-gray-900">Choose a template</span>
          )}
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Picker screen */}
        {!selectedTemplate && (
          <>
            {/* Tabs */}
            <div className="flex border-b border-gray-100 px-6">
              {['builtin', 'my'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`text-sm px-4 py-3 font-medium transition-colors border-b-2 -mb-px ${
                    activeTab === tab
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab === 'builtin' ? 'Built-in' : 'My Templates'}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="p-6 max-h-96 overflow-y-auto">
              {activeTab === 'builtin' && (
                <div className="grid grid-cols-2 gap-3">
                  {BUILT_IN_TEMPLATES.map((t) => (
                    <TemplateCard
                      key={t.id}
                      title={t.title}
                      description={t.description}
                      onSelect={() => handleSelectBuiltin(t)}
                    />
                  ))}
                </div>
              )}
              {activeTab === 'my' && (
                loadingTemplates ? (
                  <p className="text-sm text-gray-400 text-center py-8">Loading…</p>
                ) : myTemplates.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">
                    No saved templates yet. Save any document as a template from the document view.
                  </p>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {myTemplates.map((t) => (
                      <TemplateCard
                        key={t.id}
                        title={t.title}
                        description={t.description}
                        onSelect={() => handleSelectMy(t)}
                        onDelete={() => handleDeleteMy(t.id)}
                      />
                    ))}
                  </div>
                )
              )}
            </div>
          </>
        )}

        {/* AI pre-fill screen */}
        {selectedTemplate && (
          <div className="p-6">
            <p className="text-sm text-gray-600 mb-4">
              Briefly describe what you're writing about and the AI will fill in this template for you.
            </p>
            <textarea
              autoFocus
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. A research report on climate change adaptation in coastal cities"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-4 py-3 text-sm text-gray-800 outline-none focus:border-blue-400 transition-colors resize-none"
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={handleCreateWithout}
                disabled={creating}
                className="flex-1 border border-gray-200 rounded-lg py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating…' : 'Create without AI'}
              </button>
              <button
                onClick={handleCreateWithAI}
                disabled={creating || !description.trim()}
                className="flex-1 bg-blue-600 rounded-lg py-2 text-sm text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? 'Creating…' : 'Create with AI'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
