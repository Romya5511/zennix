import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Home from './pages/Home'
import Setup from './pages/Setup'
import Join from './pages/Join'
import Dashboard from './pages/Dashboard'
import ListPage from './pages/ListPage'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)

      // Save profile whenever we detect a session on load
      if (session?.user) {
        saveProfile(session.user)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)

      // Save profile on every sign-in event
      if (session?.user) {
        saveProfile(session.user)
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
        {/* Public route — always accessible */}
        <Route path="/join" element={<Join />} />

        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            <Route path="/"          element={<Home />} />
            <Route path="/setup"     element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/list/:id"  element={<ListPage />} />
            <Route path="*"          element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App