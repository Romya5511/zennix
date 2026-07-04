import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Home from './pages/Home'
import Setup from './pages/Setup'
import Join from './pages/Join'
import ListPage from './pages/ListPage'
import FixedCosts from './pages/FixedCosts'
import SpendPage from './pages/SpendPage'
import HistoryPage from './pages/HistoryPage'
import Settings from './pages/Settings'
import LandingPage from './pages/LandingPage'
import IOSInstallBanner from './components/IOSInstallBanner'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Let Supabase process the hash first, then clean URL
    // Do NOT strip hash immediately — Supabase needs it to establish session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) saveProfile(session.user)
      // Only strip hash after session is established
      if (window.location.hash && !window.location.hash.includes('access_token')) {
        window.history.replaceState(null, '', window.location.pathname || '/')
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        saveProfile(session.user)
        // Clean URL after auth is complete
        if (window.location.hash && !window.location.hash.includes('access_token')) {
          window.history.replaceState(null, '', '/')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function saveProfile(user) {
    await supabase.from('profiles').upsert({
      id: user.id,
      full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
      avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
    }, { onConflict: 'id' })
  }

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/join"  element={<Join />} />
        <Route path="/about" element={<LandingPage />} />

        {!user ? (
          <>
            <Route path="/"  element={<LandingPage />} />
            <Route path="*"  element={<Login />} />
          </>
        ) : (
          <>
            <Route path="/"            element={<Home />} />
            <Route path="/setup"       element={<Setup />} />
            <Route path="/list/:id"    element={<ListPage />} />
            <Route path="/fixed-costs" element={<FixedCosts />} />
            <Route path="/spend"       element={<SpendPage />} />
            <Route path="/history"     element={<HistoryPage />} />
            {/* NEW — Day 17: Settings page (Sound effects toggle) */}
            <Route path="/settings"    element={<Settings />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      <IOSInstallBanner />
    </BrowserRouter>
  )
}

export default App