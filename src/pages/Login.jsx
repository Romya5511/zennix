import { supabase } from '../lib/supabase'

function Login() {
  const handleGoogleSignIn = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin
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
      fontFamily: 'sans-serif',
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