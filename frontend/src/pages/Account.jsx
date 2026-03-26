import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../api'
import TopBar from '../components/TopBar'

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

  // Delete account
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    api.me().then((u) => {
      setUser(u)
      setDisplayName(u.display_name || '')
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
      <TopBar user={user} onLogout={handleLogout} />
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-lg mx-auto py-10 px-4">
          <Link to="/" className="inline-flex items-center gap-1 px-3 py-1.5 text-sm text-gray-600 bg-white border border-gray-200 rounded hover:bg-gray-50 hover:border-gray-300 transition-colors mb-4">
            ← Back
          </Link>
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
