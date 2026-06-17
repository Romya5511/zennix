import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Join() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const householdId = searchParams.get('invite')

  const [status, setStatus] = useState('loading') // loading | needsLogin | joining | error | done
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handleJoin() {
      // Safety check — if no invite ID in URL, something is wrong
      if (!householdId) {
        setStatus('error')
        setErrorMsg('This invite link looks broken. Ask Person A to send it again.')
        return
      }

      // Check if Person B is logged in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not logged in yet — show Google login button
        setStatus('needsLogin')
        return
      }

      // Logged in — save their profile
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      }, { onConflict: 'id' })

      // Check if they're already in THIS household
      const { data: existing } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .eq('household_id', householdId)
        .maybeSingle()

      if (existing) {
        // Already a member — just go to dashboard
        navigate('/dashboard')
        return
      }

      // Check if household actually exists
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('id, name')
        .eq('id', householdId)
        .maybeSingle()

      if (householdError || !household) {
        setStatus('error')
        setErrorMsg('This household no longer exists. Ask Person A to create a new invite.')
        return
      }

      setStatus('joining')

      // Add Person B as member
      const { error: joinError } = await supabase
        .from('household_members')
        .insert({ household_id: householdId, user_id: user.id, role: 'member' })

      if (joinError) {
        setStatus('error')
        setErrorMsg('Could not join the household. Please try again.')
        return
      }

      setStatus('done')
      // Short pause so they can see the success message, then go to dashboard
      setTimeout(() => navigate('/dashboard'), 1500)
    }

    handleJoin()
  }, [householdId])

  async function signInWithGoogle() {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // After login, come back to this same join URL so the flow continues
        redirectTo: `https://zennix.vercel.app/join?invite=${householdId}`,
      },
    })
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏠 Zennix</h1>
        <p style={styles.tagline}>Spend together. Stay calm.</p>

        {status === 'loading' && (
          <p style={styles.message}>Checking your invite...</p>
        )}

        {status === 'needsLogin' && (
          <>
            <p style={styles.message}>
              You've been invited to a shared household! Sign in with Google to join.
            </p>
            <button style={styles.googleButton} onClick={signInWithGoogle}>
              <img
                src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg"
                alt=""
                style={{ width: '20px', height: '20px' }}
              />
              Sign in with Google
            </button>
          </>
        )}

        {status === 'joining' && (
          <p style={styles.message}>Joining your household...</p>
        )}

        {status === 'done' && (
          <p style={{ ...styles.message, color: '#16a34a', fontWeight: '600' }}>
            ✅ You're in! Taking you to your dashboard...
          </p>
        )}

        {status === 'error' && (
          <p style={{ ...styles.message, color: '#dc2626' }}>
            ❌ {errorMsg}
          </p>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f9fafb',
    fontFamily: 'sans-serif',
    padding: '1rem',
  },
  card: {
    background: '#fff',
    borderRadius: '16px',
    padding: '2rem',
    maxWidth: '380px',
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    textAlign: 'center',
  },
  title: { fontSize: '1.6rem', fontWeight: '700', margin: '0 0 0.25rem' },
  tagline: { fontSize: '0.9rem', color: '#888', margin: '0 0 1.5rem' },
  message: { fontSize: '0.95rem', color: '#444', lineHeight: '1.6' },
  googleButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    backgroundColor: '#fff',
    color: '#333',
    border: '1px solid #ddd',
    borderRadius: '10px',
    cursor: 'pointer',
    marginTop: '1rem',
  },
}

export default Join