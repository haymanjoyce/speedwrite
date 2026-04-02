import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'
import FeedbackBar from '../components/FeedbackBar'
import TopBar from '../components/TopBar'
import { FREE_ACTION_CAP } from '../constants/limits'

export default function Admin() {
  const navigate = useNavigate()
  const [user, setUser] = useState(null)
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [showFeedback, setShowFeedback] = useState(false)

  useEffect(() => {
    api.me().then((u) => {
      setUser(u)
      return api.getAdminUsers()
    }).then((d) => {
      setData(d)
    }).catch((err) => {
      if (err.message === 'Access denied') {
        setError('Access denied')
      } else if (err.message) {
        setError(err.message)
      } else {
        setError('Failed to load admin data')
      }
    })
  }, [])

  const handleLogout = () => {
    localStorage.removeItem('token')
    navigate('/login')
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <TopBar
        user={user}
        onLogout={handleLogout}
        pageTitle="Administration"
        hasByokKey={user?.has_byok_key ?? false}
        actionsRemaining={user ? (user.has_byok_key ? null : Math.max(0, FREE_ACTION_CAP - (user.ai_actions_used ?? 0))) : null}
        onFeedbackClick={() => setShowFeedback(true)}
      />
      {showFeedback && <FeedbackBar onClose={() => setShowFeedback(false)} />}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto py-10 px-4">
          {error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : !data ? (
            <p className="text-sm text-gray-400">Loading…</p>
          ) : (
            <>
              <p className="text-sm text-gray-400 mb-6">
                {data.summary.total_users} users · {data.summary.total_actions_this_month} AI actions this month
              </p>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    {['Email', 'Plan', 'Actions used', 'Actions left', 'BYOK', 'Documents', 'Admin'].map((col) => (
                      <th key={col} className="text-xs font-semibold text-gray-500 uppercase tracking-wide py-3 px-4">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.users.map((u) => {
                    const actionsLeft = u.has_byok_key
                      ? 'Unlimited'
                      : Math.max(0, FREE_ACTION_CAP - u.ai_actions_used)
                    return (
                      <tr key={u.id} className="border-b border-gray-100">
                        <td className="text-sm text-gray-800 py-3 px-4">{u.email}</td>
                        <td className="text-sm py-3 px-4 capitalize">{u.plan}</td>
                        <td className="text-sm py-3 px-4">{u.ai_actions_used}</td>
                        <td className="text-sm py-3 px-4">{actionsLeft}</td>
                        <td className="text-sm py-3 px-4">{u.has_byok_key ? 'Yes' : '—'}</td>
                        <td className="text-sm py-3 px-4">{u.document_count}</td>
                        <td className="text-sm py-3 px-4">{u.is_admin ? 'Yes' : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
