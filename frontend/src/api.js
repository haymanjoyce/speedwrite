const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    return
  }

  if (res.status === 204) return null

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Request failed' }))
    throw new Error(err.detail || 'Request failed')
  }

  return res.json()
}

export const api = {
  // Auth
  register: (email, password) =>
    request('POST', '/auth/register', { email, password }),
  login: (email, password) =>
    request('POST', '/auth/login', { email, password }),
  me: () => request('GET', '/auth/me'),
  getConfig: () => request('GET', '/config'),

  // Documents
  listDocuments: () => request('GET', '/documents/'),
  getDocument: (id) => request('GET', `/documents/${id}?_=${Date.now()}`),
  createDocument: (data) => request('POST', '/documents/', data),
  updateDocument: (id, data) => request('PUT', `/documents/${id}`, data),
  deleteDocument: (id) => request('DELETE', `/documents/${id}`),

  // Chat
  chatMessage: (docId, message, context, ignoreHistory = false, provider = null, contextLabel = null) =>
    request('POST', `/documents/${docId}/chat`, { message, context, ignore_history: ignoreHistory, provider, context_label: contextLabel }),
  documentAction: (docId, action, instructions = '', provider = null) =>
    request('POST', `/documents/${docId}/action`, { action, instructions, provider }),

  // Evidence
  listEvidence: (docId) => request('GET', `/documents/${docId}/evidence`),
  getEvidence: (docId, evidenceId) => request('GET', `/documents/${docId}/evidence/${evidenceId}`),
  addEvidenceFile: async (docId, file) => {
    const form = new FormData()
    form.append('file', file)
    const headers = {}
    const token = localStorage.getItem('token')
    if (token) headers['Authorization'] = `Bearer ${token}`
    const res = await fetch(`${BASE_URL}/documents/${docId}/evidence/file`, {
      method: 'POST',
      headers,
      body: form,
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'Upload failed' }))
      throw new Error(err.detail || 'Upload failed')
    }
    return res.json()
  },
  addEvidenceUrl: (docId, url) =>
    request('POST', `/documents/${docId}/evidence/url`, { url }),
  addEvidenceText: (docId, title, content) =>
    request('POST', `/documents/${docId}/evidence/text`, { title, content }),
  deleteEvidence: (docId, evidenceId) =>
    request('DELETE', `/documents/${docId}/evidence/${evidenceId}`),
  addEvidenceDocument: (docId, sourceDocId) =>
    request('POST', `/documents/${docId}/evidence/document`, { source_doc_id: sourceDocId }),
  updateEvidence: (docId, evidenceId, data) =>
    request('PATCH', `/documents/${docId}/evidence/${evidenceId}`, data),
  syncEvidence: (docId, evidenceId) =>
    request('POST', `/documents/${docId}/evidence/${evidenceId}/sync`),
  reindexEvidence: (docId) =>
    request('POST', `/documents/${docId}/evidence/reindex`),

  // Audit log
  listLog: (docId) => request('GET', `/documents/${docId}/log`),
  addLogEntry: (docId, event, detail) =>
    request('POST', `/documents/${docId}/log`, { event, detail }),

  // Section protection
  protectSection: (docId, heading) =>
    request('POST', `/documents/${docId}/protect`, { heading }),
  unprotectSection: (docId, heading) =>
    request('DELETE', `/documents/${docId}/protect`, { heading }),
}
