import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Setup() {
  const navigate = useNavigate()
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)
  const [inviteLink, setInviteLink] = useState(null)
  const [error, setError] = useState(null)

  async function createHousehold() {
    if (!householdName.trim()) return
    setLoading(true)
    setError(null)

    // ── Explicitly get and set session so JWT is sent with requests ──
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) {
      setError('Not logged in. Please refresh and try again.')
      setLoading(false)
      return
    }
    await supabase.auth.setSession(session)

    const { data: household, error: householdError } = await supabase
      .from('households')
      .insert({ name: householdName.trim(), created_by: user.id })
      .select()
      .single()

    if (householdError) {
      setError('Could not create household. Please try again.')
      setLoading(false)
      return
    }

    const { error: memberError } = await supabase
      .from('household_members')
      .insert({ household_id: household.id, user_id: user.id, role: 'owner' })

    if (memberError) {
      setError('Could not add you to the household. Please try again.')
      setLoading(false)
      return
    }

    const joinUrl = `https://zennix.in/join?invite=${household.id}`
    const message = `Hey! I'm using Zennix to track our shared expenses. Join our household here: ${joinUrl}`
    const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`
    setInviteLink(waLink)
    setLoading(false)
  }

  function goToHome() {
    navigate('/')
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <h1 style={styles.title}>🏠 Create your household</h1>
        <p style={styles.subtitle}>Give your household a name, then invite your partner via WhatsApp.</p>

        {!inviteLink ? (
          <>
            <input
              style={styles.input}
              type="text"
              placeholder="e.g. Naina & Bunny's Home"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              disabled={loading}
            />
            {error && <p style={styles.error}>{error}</p>}
            <button
              style={styles.button}
              onClick={createHousehold}
              disabled={loading || !householdName.trim()}
            >
              {loading ? 'Creating...' : 'Create household'}
            </button>
          </>
        ) : (
          <div style={styles.inviteBox}>
            <p style={styles.successText}>✅ Household created!</p>
            <p style={styles.inviteText}>
              Send this invite to your partner on WhatsApp so they can join.
            </p>

            <a
              href={inviteLink}
              target="_blank"
              rel="noopener noreferrer"
              style={styles.whatsappButton}
            >
              📲 Send WhatsApp invite
            </a>

            <button style={styles.secondaryButton} onClick={goToHome}>
              I've sent it — go to home →
            </button>

            {/* Solo user option */}
            <div style={styles.divider}>
              <span style={styles.dividerText}>or</span>
            </div>

            <button style={styles.soloButton} onClick={goToHome}>
              Haq se Single
            </button>
            <p style={styles.soloNote}>
              You can invite someone later from Settings.
            </p>
          </div>
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
    maxWidth: '420px',
    width: '100%',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
  },
  title: { fontSize: '1.4rem', fontWeight: '600', margin: '0 0 0.5rem' },
  subtitle: { fontSize: '0.9rem', color: '#666', margin: '0 0 1.5rem' },
  input: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #ddd',
    borderRadius: '10px',
    marginBottom: '1rem',
    boxSizing: 'border-box',
  },
  button: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '1rem',
    fontWeight: '600',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  error: { color: '#dc2626', fontSize: '0.85rem', margin: '0 0 1rem' },
  inviteBox: { display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  successText: { fontSize: '1rem', fontWeight: '600', margin: 0 },
  inviteText: { fontSize: '0.9rem', color: '#555', margin: 0 },
  whatsappButton: {
    display: 'block',
    textAlign: 'center',
    padding: '0.75rem',
    backgroundColor: '#25D366',
    color: '#fff',
    borderRadius: '10px',
    textDecoration: 'none',
    fontWeight: '600',
    fontSize: '1rem',
  },
  secondaryButton: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: '10px',
    padding: '0.75rem',
    fontSize: '0.95rem',
    cursor: 'pointer',
    color: '#444',
    width: '100%',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    margin: '0.25rem 0',
  },
  dividerText: {
    fontSize: '0.8rem',
    color: '#aaa',
    margin: '0 auto',
  },
  soloButton: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    background: '#f9fafb',
    color: '#4f46e5',
    border: '1px solid #e0e7ff',
    borderRadius: '10px',
    cursor: 'pointer',
  },
  soloNote: {
    fontSize: '0.78rem',
    color: '#aaa',
    textAlign: 'center',
    margin: 0,
  },
}

export default Setup