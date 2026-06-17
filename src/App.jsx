import { useEffect, useState } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Home from './pages/Home'
import Setup from './pages/Setup'
import Join from './pages/Join'
import Dashboard from './pages/Dashboard'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>

  return (
    <BrowserRouter>
      <Routes>
        {/* Public route — always accessible */}
        <Route path="/join" element={<Join />} />

        {/* If not logged in, show Login for everything else */}
        {!user ? (
          <Route path="*" element={<Login />} />
        ) : (
          <>
            <Route path="/"          element={<Home />} />
            <Route path="/setup"     element={<Setup />} />
            <Route path="/dashboard" element={<Dashboard />} />
            {/* Any unknown URL → go home */}
            <Route path="*"          element={<Navigate to="/" />} />
          </>
        )}
      </Routes>
    </BrowserRouter>
  )
}

export default App