import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const INVITE_KEY = 'zennix_invite_id'

function Join() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    async function handleJoin() {
      // 1. Read invite ID from URL — if present, save it to localStorage
      //    so it survives the Google sign-in redirect
      const idFromUrl = searchParams.get('invite')
      if (idFromUrl) {
        localStorage.setItem(INVITE_KEY, idFromUrl)
      }

      // 2. Read from localStorage as fallback (works after Google redirect)
      const householdId = idFromUrl || localStorage.getItem(INVITE_KEY)

      if (!householdId) {
        setStatus('error')
        setErrorMsg('This invite link looks broken. Ask your household member to send it again.')
        return
      }

      // 3. Check if the user is signed in
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        // Not signed in yet — show the Google button
        setStatus('needsLogin')
        return
      }

      // 4. User is signed in — save/update their profile
      await supabase.from('profiles').upsert({
        id: user.id,
        full_name: user.user_metadata.full_name,
        avatar_url: user.user_metadata.avatar_url,
      }, { onConflict: 'id' })

      // 5. Check if they're already in this household
      const { data: existing } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .eq('household_id', householdId)
        .maybeSingle()

      if (existing) {
        // Already a member — clean up and go to dashboard
        localStorage.removeItem(INVITE_KEY)
        navigate('/dashboard')
        return
      }

      // 6. Check the household exists
      const { data: household, error: householdError } = await supabase
        .from('households')
        .select('id, name')
        .eq('id', householdId)
        .maybeSingle()

      if (householdError || !household) {
        setStatus('error')
        setErrorMsg('This household no longer exists. Ask your household member to create a new invite.')
        return
      }

      setStatus('joining')

      // 7. Add the user as a member
      const { error: joinError } = await supabase
        .from('household_members')
        .insert({ household_id: householdId, user_id: user.id, role: 'member' })

      if (joinError) {
        setStatus('error')
        setErrorMsg('Could not join the household. Please try again.')
        return
      }

      // 8. Clean up localStorage and go to dashboard
      localStorage.removeItem(INVITE_KEY)
      setStatus('done')
      setTimeout(() => navigate('/dashboard'), 1500)
    }

    handleJoin()
  }, [])

  async function signInWithGoogle() {
    const householdId = searchParams.get('invite') || localStorage.getItem(INVITE_KEY)

    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        // After Google sign-in, come back to /join (no query param needed —
        // the invite ID is already saved in localStorage)
        redirectTo: `https://zennix.vercel.app/join`,
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