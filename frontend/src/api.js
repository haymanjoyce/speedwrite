const BASE_URL = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(method, path, body, signal) {
  const headers = { 'Content-Type': 'application/json' }
  const token = getToken()
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  })

  if (res.status === 401) {
    if (localStorage.getItem('token')) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }
    const err = await res.json().catch(() => ({ detail: 'Invalid credentials' }))
    throw new Error(err.detail || 'Invalid credentials')
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
  requestPasswordReset: (email) =>
    request('POST', '/auth/reset-password/request', { email }),
  confirmPasswordReset: (token, new_password) =>
    request('POST', '/auth/reset-password/confirm', { token, new_password }),
  changePassword: (current_password, new_password) =>
    request('POST', '/auth/change-password', { current_password, new_password }),
  changeEmail: (new_email, password) =>
    request('POST', '/auth/change-email', { new_email, password }),
  updateProfile: (display_name) =>
    request('POST', '/auth/update-profile', { display_name }),
  deleteAccount: (password) =>
    request('DELETE', '/auth/account', { password }),
  saveByokKey: (api_key) => request('POST', '/auth/byok', { api_key }),
  removeByokKey: () => request('DELETE', '/auth/byok'),

  // Admin
  getAdminUsers: () => request('GET', '/admin/users'),

  // Documents
  listDocuments: () => request('GET', '/documents/'),
  getDocument: (id) => request('GET', `/documents/${id}?_=${Date.now()}`),
  createDocument: (data) => request('POST', '/documents/', data),
  updateDocument: (id, data) => request('PUT', `/documents/${id}`, data),
  deleteDocument: (id) => request('DELETE', `/documents/${id}`),

  // Chat
  chatMessage: (docId, message, context, ignoreHistory = false, provider = null, contextLabel = null, signal = null, structureLocked = false) =>
    request('POST', `/documents/${docId}/chat`, { message, context, ignore_history: ignoreHistory, provider, context_label: contextLabel, structure_locked: structureLocked }, signal),
  documentAction: (docId, action, instructions = '', provider = null, structureLocked = false) =>
    request('POST', `/documents/${docId}/action`, { action, instructions, provider, structure_locked: structureLocked }),

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
  ragQuery: (docId, evidenceId, query, signal = null) =>
    request('POST', `/documents/${docId}/evidence/${evidenceId}/rag-query`, { query }, signal),
  refreshEvidence: (docId, evidenceId) =>
    request('POST', `/documents/${docId}/evidence/${evidenceId}/refresh`),

  // Evidence chat
  evidenceChat: (docId, message, context, contextLabel, ignoreHistory = false, signal = null) =>
    request('POST', `/documents/${docId}/evidence-chat`, {
      message,
      context,
      context_label: contextLabel,
      ignore_history: ignoreHistory,
    }, signal),

  // Search
  search: (query) => request('POST', '/search', { query }),

  // Templates
  listTemplates: () => request('GET', '/templates'),
  getTemplate: (id) => request('GET', `/templates/${id}`),
  createTemplate: (data) => request('POST', '/templates', data),
  deleteTemplate: (id) => request('DELETE', `/templates/${id}`),
  prefillTemplate: (data) => request('POST', '/templates/prefill', data),

  // Document history
  listHistory: (docId) =>
    request('GET', `/documents/${docId}/history`),
  getSnapshot: (docId, snapshotId) =>
    request('GET', `/documents/${docId}/history/${snapshotId}`),
  createSnapshot: (docId, label = '', trigger = 'manual', sourceSnapshotId = null, sourceSnapshotLabel = null) =>
    request('POST', `/documents/${docId}/snapshot`, { label, trigger, source_snapshot_id: sourceSnapshotId, source_snapshot_label: sourceSnapshotLabel }),

  // Sharing
  shareSnapshot: (docId, snapshotId) =>
    request('POST', `/documents/${docId}/history/${snapshotId}/share`),
  unshareSnapshot: (docId, snapshotId) =>
    request('POST', `/documents/${docId}/history/${snapshotId}/unshare`),
  deleteComment: (docId, snapshotId, commentId) =>
    request('DELETE', `/documents/${docId}/history/${snapshotId}/comments/${commentId}`),
  getSharedVersion: (token) =>
    request('GET', `/shared/${token}`),
  postComment: (token, name, body) =>
    request('POST', `/shared/${token}/comments`, { name, body }),
  postOwnerComment: (docId, snapshotId, body) =>
    request('POST', `/documents/${docId}/history/${snapshotId}/comments`, { body }),

  // Export
  downloadExport: async (docId, format) => {
    const token = getToken()
    const res = await fetch(`${BASE_URL}/documents/${docId}/export/${format}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (res.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
      return
    }
    if (!res.ok) throw new Error('Export failed')
    const blob = await res.blob()
    const disposition = res.headers.get('Content-Disposition') || ''
    const match = disposition.match(/filename="([^"]+)"/)
    const filename = match ? match[1] : `export.${format}`
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  },

  // Section protection
  protectSection: (docId, heading) =>
    request('POST', `/documents/${docId}/protect`, { heading }),
  unprotectSection: (docId, heading) =>
    request('DELETE', `/documents/${docId}/protect`, { heading }),
  lockStructure: (docId) =>
    request('POST', `/documents/${docId}/lock-structure`),
  unlockStructure: (docId) =>
    request('POST', `/documents/${docId}/unlock-structure`),
}
