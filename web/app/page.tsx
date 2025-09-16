"use client";

import { useEffect, useState } from 'react'

export default function Home() {
  const [view, setView] = useState<'setup' | 'dashboard'>('setup')
  const [loading, setLoading] = useState(false)
  const [alert, setAlert] = useState<{ message: string, type: 'success' | 'error' | 'info' } | null>(null)
  const [username, setUsername] = useState('')
  const [bearerToken, setBearerToken] = useState('')
  const [stats, setStats] = useState<{ totalFollowers: number, totalUnfollowers: number, lastUpdated: string | null }>({ totalFollowers: 0, totalUnfollowers: 0, lastUpdated: null })
  const [followers, setFollowers] = useState<any[]>([])
  const [unfollowers, setUnfollowers] = useState<any[]>([])

  useEffect(() => { checkAuthStatus() }, [])

  async function checkAuthStatus() {
    try {
      const res = await fetch('/api/stats')
      if (res.ok) {
        const data = await res.json()
        if (data.success) {
          setView('dashboard')
          loadStats(); loadFollowers(); loadUnfollowers()
        } else setView('setup')
      } else setView('setup')
    } catch { setView('setup') }
  }

  function showAlert(message: string, type: 'success' | 'error' | 'info') {
    setAlert({ message, type })
    setTimeout(() => setAlert(null), 5000)
  }

  async function loadStats() { try { const r = await fetch('/api/stats'); const d = await r.json(); if (d.success) setStats(d.stats) } catch {} }
  async function loadFollowers() {
    try { const r = await fetch('/api/followers'); const d = await r.json(); if (d.success) setFollowers(d.followers) } catch {}
  }
  async function loadUnfollowers() {
    try { const r = await fetch('/api/unfollowers'); const d = await r.json(); if (d.success) setUnfollowers(d.unfollowers) } catch {}
  }

  async function onCheck() {
    setLoading(true)
    try {
      const res = await fetch('/api/check-unfollowers', { method: 'POST' })
      const data = await res.json()
      if (data.success) {
        showAlert(`✅ ${data.message || `Found ${data.newUnfollowers?.length || 0} new unfollowers.`}`,'success')
        loadStats(); loadFollowers(); loadUnfollowers()
      } else {
        const isRateLimit = data.error?.includes('Rate limit exceeded')
        showAlert(`❌ Error: ${data.error}`, isRateLimit ? 'info' : 'error')
      }
    } catch { showAlert('❌ Error: Network error', 'error') }
    finally { setLoading(false) }
  }

  async function onSetup(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch('/api/setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, bearerToken }) })
      const data = await res.json()
      if (data.success) {
        showAlert(`✅ ${data.message}`, 'success')
        setView('dashboard')
        loadStats(); loadFollowers(); loadUnfollowers()
      } else {
        const isRateLimit = data.error?.includes('Rate limit exceeded') || res.status === 429
        showAlert(`❌ Setup failed: ${data.error}`, isRateLimit ? 'info' as const : 'error')
      }
    } catch {
      showAlert('❌ Setup failed: Network error', 'error')
    } finally { setLoading(false) }
  }

  function onLogout() {
    document.cookie = 'username=; Max-Age=0; path=/'
    document.cookie = 'bearerToken=; Max-Age=0; path=/'
    setView('setup'); setUsername(''); setBearerToken('')
    setFollowers([]); setUnfollowers([])
    setStats({ totalFollowers: 0, totalUnfollowers: 0, lastUpdated: null })
  }

  return (
    <div className="container">
      <div className="header">
        <h1>X Unfollower Tracker</h1>
        <p>Track who unfollowed you on X (Twitter)</p>
      </div>
      {alert && (
        <div className={`alert ${alert.type === 'success' ? 'alert-success' : alert.type === 'error' ? 'alert-error' : 'alert-info'}`}>{alert.message}</div>
      )}
      {view === 'setup' && (
        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            className="card"
            style={{
              width: '100%',
              maxWidth: 520,
              background: 'rgba(0,0,0,0.45)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.12)'
            }}
          >
            <h2 style={{ color: '#f9fafb' }}>🔧 Setup Your Account</h2>
            <p style={{ marginBottom: 20, color: '#d1d5db' }}>Enter your Twitter username and Bearer Token to start tracking unfollowers.</p>
            <form onSubmit={onSetup}>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#e5e7eb' }}>Twitter Username (without @)</label>
                <input
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: 12, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    outline: 'none',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#e5e7eb'
                  }}
                />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', marginBottom: 8, fontWeight: 600, color: '#e5e7eb' }}>Bearer Token</label>
                <input
                  type="password"
                  value={bearerToken}
                  onChange={e => setBearerToken(e.target.value)}
                  required
                  style={{
                    width: '100%', padding: 12, borderRadius: 10,
                    border: '1px solid rgba(255,255,255,0.18)',
                    outline: 'none',
                    background: 'rgba(255,255,255,0.06)',
                    color: '#e5e7eb'
                  }}
                />
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button className="btn" disabled={loading}>{loading ? 'Setting up...' : 'Setup Account'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
      {view === 'dashboard' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <h3>Welcome!</h3>
              <p style={{ color: '#666', marginTop: 5 }}>Last updated: {stats.lastUpdated ? new Date(stats.lastUpdated).toLocaleString() : 'Never'}</p>
            </div>
            <div>
              <button className="btn btn-secondary" onClick={onLogout}>Logout</button>
            </div>
          </div>
          <div className="grid">
            <div className="stat-card">
              <div className="stat-number">{stats.totalFollowers}</div>
              <div className="stat-label">Total Followers</div>
            </div>
            <div className="stat-card">
              <div className="stat-number">{stats.totalUnfollowers}</div>
              <div className="stat-label">Total Unfollowers</div>
            </div>
          </div>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <button className="btn" onClick={onCheck} disabled={loading}>{loading ? 'Checking...' : '🔍 Check Unfollowers'}</button>
          </div>
          <h3>👥 All Followers</h3>
          <div className="list">
            {followers.length === 0 ? (
              <div className="empty">No followers found.</div>
            ) : followers.map(user => (
              <div key={user.id} className="list-item">
                <img src={user.profile_image_url || ''} alt={user.name} className="avatar" />
                <div>
                  <div className="item-name">{user.name || 'Unknown'}</div>
                  <div className="item-handle">@{user.username || 'unknown'}</div>
                </div>
              </div>
            ))}
          </div>
          <h3 style={{ marginTop: 20 }}>🚫 Unfollowers List</h3>
          <div className="list">
            {unfollowers.length === 0 ? (
              <div className="empty">No unfollowers detected yet. Click "Check Unfollowers" to start tracking.</div>
            ) : unfollowers.map(user => (
              <div key={user.id} className="list-item">
                <img src={user.profile_image_url || ''} alt={user.name} className="avatar" />
                <div>
                  <div className="item-name">{user.name || 'Unknown'}</div>
                  <div className="item-handle">@{user.username || 'unknown'}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
