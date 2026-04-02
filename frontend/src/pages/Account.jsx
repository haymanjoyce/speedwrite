import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import FeedbackBar from '../components/FeedbackBar'
import TopBar from '../components/TopBar'
import { FREE_ACTION_CAP } from '../constants/limits'

function useFlash(setter) {
  const timer = useRef(null)
  return (msg) => {
    setter(msg)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setter(''), 3000)
  }
}

export default function Account() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)

  // Profile
  const [displayName, setDisplayName] = useState('')
  const [profileSuccess, setProfileSuccess] = useState('')
  const [profileError, setProfileError] = useState('')
  const flashProfileSuccess = useFlash(setProfileSuccess)

  // Change email
  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailSuccess, setEmailSuccess] = useState('')
  const [emailError, setEmailError] = useState('')
  const flashEmailSuccess = useFlash(setEmailSuccess)

  // Change password
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const flashPasswordSuccess = useFlash(setPasswordSuccess)

  // BYOK
  const [hasByokKey, setHasByokKey] = useState(false)
  const [byokKeyMasked, setByokKeyMasked] = useState(null)
  const [byokKey, setByokKey] = useState('')
  const [byokSuccess, setByokSuccess] = useState('')
  const [byokError, setByokError] = useState('')
  const flashByokSuccess = useFlash(setByokSuccess)

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    api.me().then((u) => {
      setUser(u)
      setDisplayName(u.display_name || '')
      setHasByokKey(u.has_byok_key || false)
      setByokKeyMasked(u.byok_key_masked || null)
    }).catch(() => {
      localStorage.removeItem('token')
      navigate('/login')
    })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  const handleProfileSubmit = async (e) => {
    e.preventDefault()
    setProfileError('')
    try {
      await api.updateProfile(displayName)
      flashProfileSuccess('Saved')
    } catch (err) {
      setProfileError(err.message)
    }
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setEmailError('')
    try {
      await api.changeEmail(newEmail, emailPassword)
      flashEmailSuccess('Email updated')
      setNewEmail('')
      setEmailPassword('')
      const updated = await api.me()
      setUser(updated)
    } catch (err) {
      setEmailError(err.message)
    }
  }

  const handlePasswordSubmit = async (e) => {
    e.preventDefault()
    setPasswordError('')
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match')
      return
    }
    try {
      await api.changePassword(currentPassword, newPassword)
      flashPasswordSuccess('Password updated')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setPasswordError(err.message)
    }
  }

  const handleByokSave = async (e) => {
    e.preventDefault()
    setByokError('')
    try {
      await api.saveByokKey(byokKey)
      const updated = await api.me()
      setHasByokKey(updated.has_byok_key)
      setByokKeyMasked(updated.byok_key_masked)
      setByokKey('')
      flashByokSuccess('API key saved')
    } catch (err) {
      setByokError(err.message)
    }
  }

  const handleByokRemove = async () => {
    setByokError('')
    try {
      await api.removeByokKey()
      setHasByokKey(false)
      setByokKeyMasked(null)
      flashByokSuccess('API key removed')
    } catch (err) {
      setByokError(err.message)
    }
  }

  const handleDeleteConfirm = async () => {
    setDeleteError('')
    try {
      await api.deleteAccount(deletePassword)
      localStorage.removeItem('token')
      navigate('/login')
    } catch (err) {
      setDeleteError(err.message)
    }
  }

  if (!user) {
    return (
      <div className="h-screen flex flex-col overflow-hidden">
        <TopBar user={null} onLogout={handleLogout} />
        <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
          Loading…
        </div>
      </div>
    )
  }

  const fieldCls = 'w-full border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:border-blue-500'
  const outlinedBtn = 'border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors'

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        pageTitle="Account Settings"
        hasByokKey={user?.has_byok_key ?? false}
        actionsRemaining={user ? (user.has_byok_key ? null : Math.max(0, FREE_ACTION_CAP - (user.ai_actions_used ?? 0))) : null}
        onFeedbackClick={() => setShowFeedback(true)}
      />
      {showFeedback && <FeedbackBar onClose={() => setShowFeedback(false)} />}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto py-10 px-4">
          <h1 className="text-xl font-semibold text-gray-900 mb-6">Account settings</h1>

          {/* Profile */}
          <form onSubmit={handleProfileSubmit}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Profile</h2>
            {profileError && <p className="text-red-500 text-sm mb-2">{profileError}</p>}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">Display name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className={fieldCls}
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={outlinedBtn}>Save</button>
              {profileSuccess && <span className="text-green-600 text-sm">{profileSuccess}</span>}
            </div>
          </form>

          <hr className="border-gray-100 my-6" />

          {/* Change email */}
          <form onSubmit={handleEmailSubmit}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Change email</h2>
            <p className="text-xs text-gray-400 mb-3">Current: {user.email}</p>
            {emailError && <p className="text-red-500 text-sm mb-2">{emailError}</p>}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">New email address</label>
              <input
                type="email"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className={fieldCls}
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">Current password</label>
              <input
                type="password"
                value={emailPassword}
                onChange={(e) => setEmailPassword(e.target.value)}
                className={fieldCls}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={outlinedBtn}>Update email</button>
              {emailSuccess && <span className="text-green-600 text-sm">{emailSuccess}</span>}
            </div>
          </form>

          <hr className="border-gray-100 my-6" />

          {/* Change password */}
          <form onSubmit={handlePasswordSubmit}>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Change password</h2>
            {passwordError && <p className="text-red-500 text-sm mb-2">{passwordError}</p>}
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">Current password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={fieldCls}
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">New password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={fieldCls}
                required
              />
            </div>
            <div className="mb-3">
              <label className="block text-sm text-gray-600 mb-1">Confirm new password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={fieldCls}
                required
              />
            </div>
            <div className="flex items-center gap-3">
              <button type="submit" className={outlinedBtn}>Update password</button>
              {passwordSuccess && <span className="text-green-600 text-sm">{passwordSuccess}</span>}
            </div>
          </form>

          <hr className="border-gray-100 my-6" />

          {/* Anthropic API Key */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-1">Anthropic API Key</h2>
            <p className="text-xs text-gray-400 mb-3">Bring your own Anthropic API key to use Sonnet and other models. Your key is encrypted at rest.</p>
            {byokError && <p className="text-red-500 text-sm mb-2">{byokError}</p>}
            {hasByokKey ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-700 font-mono">{byokKeyMasked}</span>
                <button type="button" onClick={handleByokRemove} className="text-red-600 border border-red-300 rounded px-3 py-1.5 text-sm hover:bg-red-50 transition-colors">Remove</button>
                {byokSuccess && <span className="text-green-600 text-sm">{byokSuccess}</span>}
              </div>
            ) : (
              <form onSubmit={handleByokSave}>
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">API key</label>
                  <input
                    type="password"
                    value={byokKey}
                    onChange={(e) => setByokKey(e.target.value)}
                    className={fieldCls}
                    placeholder="sk-ant-..."
                    required
                  />
                </div>
                <div className="flex items-center gap-3">
                  <button type="submit" className={outlinedBtn}>Save</button>
                  {byokSuccess && <span className="text-green-600 text-sm">{byokSuccess}</span>}
                </div>
              </form>
            )}
          </div>

          <hr className="border-gray-100 my-6" />

          {/* Delete account */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-3">Delete account</h2>
            <p className="text-sm text-gray-500 mb-3">
              This permanently deletes your account and all your documents. This cannot be undone.
            </p>
            {!showDeleteConfirm && (
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                className="text-red-600 border border-red-300 rounded px-3 py-1.5 text-sm hover:bg-red-50 transition-colors"
              >
                Delete account
              </button>
            )}
            {showDeleteConfirm && (
              <div className="bg-red-50 border border-red-100 rounded p-3 mt-3">
                {deleteError && <p className="text-red-500 text-sm mb-2">{deleteError}</p>}
                <div className="mb-3">
                  <label className="block text-sm text-gray-600 mb-1">Enter your password to confirm</label>
                  <input
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    className={fieldCls}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDeleteConfirm}
                    className="text-red-600 border border-red-300 rounded px-3 py-1.5 text-sm hover:bg-red-50 transition-colors"
                  >
                    Delete my account
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); setDeleteError('') }}
                    className="border border-gray-300 rounded px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
