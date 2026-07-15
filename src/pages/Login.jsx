import { supabase } from '../lib/supabase'

function Login() {
  const handleGoogleSignIn = async () => {
    const pendingInvite = localStorage.getItem('zennix_invite_id')
    const redirectTo = pendingInvite
      ? `https://zennix.in/join`
      : `https://zennix.in/`

    // FIX — without queryParams.prompt, Google silently reuses whichever
    // account is already active in this browser/webview instead of
    // letting the person choose. This matters when multiple people share
    // a device, or one person manages more than one household — the app
    // was silently signing in as "whoever was last active" with no way
    // to pick a different account.
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: { prompt: 'select_account' },
      }
    })
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: '"Inter", sans-serif',
      background: '#f9fafb'
    }}>
      <h1 style={{ fontSize: '2.5rem', fontWeight: 'bold', color: '#4F46E5' }}>
        Zennix
      </h1>
      <p style={{ color: '#6b7280', marginBottom: '2rem' }}>
        Spend together. Stay calm.
      </p>
      <button
        onClick={handleGoogleSignIn}
        style={{
          background: '#4F46E5',
          color: 'white',
          border: 'none',
          padding: '0.75rem 2rem',
          borderRadius: '999px',
          fontSize: '1rem',
          cursor: 'pointer'
        }}
      >
        Sign in with Google
      </button>
      <p style={{ color: '#9ca3af', marginTop: '1rem', fontSize: '0.85rem' }}>
        Free for 1 month. No credit card needed.
      </p>
    </div>
  )
}

export default Login