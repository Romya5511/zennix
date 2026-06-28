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
import IOSInstallBanner from './components/IOSInstallBanner'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ── Strip the # hash that Supabase OAuth adds to the URL ──
    // This prevents React Router from getting confused by /#
    if (window.location.hash) {
      window.history.replaceState(null, '', window.location.pathname || '/')
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
      if (session?.user) {
        saveProfile(session.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        saveProfile(session.user)
        // After auth state change, make sure we are on home not a stale route
        if (window.location.hash) {
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
        <Route path="/join" element={<Join />} />

        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            <Route path="/"            element={<Home />} />
            <Route path="/setup"       element={<Setup />} />
            <Route path="/list/:id"    element={<ListPage />} />
            <Route path="/fixed-costs" element={<FixedCosts />} />
            <Route path="/spend"       element={<SpendPage />} />
            <Route path="*"            element={<Navigate to="/" replace />} />
          </>
        )}
      </Routes>
      <IOSInstallBanner />
    </BrowserRouter>
  )
}

export default App