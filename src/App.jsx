import { useEffect, useState } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check if user is already logged in
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })

    // Listen for login/logout changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <p style={{ padding: '2rem' }}>Loading...</p>

  if (!user) return <Login />

  return (
    <div style={{ padding: '2rem', fontFamily: 'sans-serif' }}>
      <h1>Zennix 🏠</h1>
      <p>Welcome, {user.user_metadata.full_name}! 👋</p>
      <button onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}

export default App