import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { supabase } from '../lib/supabase'
import { getSoundEnabled, setSoundEnabled, playSaveSound } from '../lib/soundEngine'

function getFirstName(fullName) {
  if (!fullName) return 'Someone'
  return fullName.split(' ')[0]
}

function Settings() {
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useState(getSoundEnabled())
  const [loadingHousehold, setLoadingHousehold] = useState(true)
  const [householdId, setHouseholdId] = useState(null)
  const [members, setMembers] = useState([])
  const [currentUserId, setCurrentUserId] = useState(null)

  useEffect(() => { loadHouseholdInfo() }, [])

  async function loadHouseholdInfo() {
    // PERF — see Home.jsx for why getSession() replaces getUser() here.
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { navigate('/'); return }
    setCurrentUserId(user.id)

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (membership) {
      setHouseholdId(membership.household_id)
      const { data: memberRows } = await supabase
        .from('household_members')
        .select('user_id, profiles(full_name)')
        .eq('household_id', membership.household_id)
      setMembers(memberRows || [])
    }
    setLoadingHousehold(false)
  }

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) playSaveSound() // quick confirmation cue when turning back on
  }

  // NEW — lets a solo user invite their partner later, reusing the exact
  // same WhatsApp invite link pattern used during initial household setup.
  function shareInviteLink() {
    if (!householdId) return
    const joinUrl = `https://zennix.in/join?invite=${householdId}`
    const message = `Hey! I'm using Zennix to track our shared expenses. Join our household here: ${joinUrl}`
    const waLink = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(waLink, '_blank', 'noopener,noreferrer')
  }

  const isSolo = members.length < 2

  // NEW — the only working signOut() in the codebase lived in the unused
  // Dashboard.jsx (not wired to any route). This is the first reachable
  // Sign Out in the live app.
  async function handleSignOut() {
    await supabase.auth.signOut()
    navigate('/')
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Settings</h1>
      </div>

      <div style={styles.content}>

        <p style={styles.sectionLabel}>HOUSEHOLD</p>

        {loadingHousehold ? (
          <div style={styles.row}>
            <span style={styles.rowHint}>Loading...</span>
          </div>
        ) : isSolo ? (
          <div style={styles.row}>
            <div style={styles.rowText}>
              <span style={styles.rowLabel}>Invite your partner</span>
              <span style={styles.rowHint}>
                Using Zennix alone for now? Send an invite whenever you're ready to share it.
              </span>
            </div>
            <button style={styles.inviteBtn} onClick={shareInviteLink}>
              📲 Invite
            </button>
          </div>
        ) : (
          <div style={styles.row}>
            <div style={styles.rowText}>
              <span style={styles.rowLabel}>Household members</span>
              <span style={styles.rowHint}>
                {members.map(m => getFirstName(m.profiles?.full_name)).join(' & ')}
              </span>
            </div>
          </div>
        )}

        <p style={{ ...styles.sectionLabel, marginTop: '1.5rem' }}>APP</p>

        <div style={styles.row}>
          <div style={styles.rowText}>
            <span style={styles.rowLabel}>Sound effects</span>
            <span style={styles.rowHint}>
              Plays a short sound when you save a grocery item, fixed cost, or Quick Log entry.
            </span>
          </div>
          <button
            style={soundOn ? { ...styles.toggle, ...styles.toggleOn } : styles.toggle}
            onClick={toggleSound}
            aria-label="Toggle sound effects"
          >
            <span style={soundOn ? { ...styles.toggleKnob, ...styles.toggleKnobOn } : styles.toggleKnob} />
          </button>
        </div>

        <p style={styles.note}>
          Note: your phone's silent/vibrate switch can't be read by web apps,
          so this toggle is the reliable way to turn sound on or off here.
        </p>

        <p style={{ ...styles.sectionLabel, marginTop: '1.5rem' }}>ACCOUNT</p>
        <div style={styles.row}>
          <div style={styles.rowText}>
            <span style={styles.rowLabel}>Signed in</span>
            <span style={styles.rowHint}>
              If this device is shared, or you manage more than one household, sign out here to switch accounts.
            </span>
          </div>
          <button style={styles.signOutBtn} onClick={handleSignOut}>
            Sign out
          </button>
        </div>
      </div>

      <div style={{ height: '80px' }} />
      <BottomNav />
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: '"Inter", sans-serif', paddingBottom: '2rem' },
  header: { padding: '1rem 1rem 0.75rem', background: '#fff', borderBottom: '1px solid #f3f4f6' },
  title: { fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111' },
  content: { maxWidth: 'clamp(320px, 94vw, 560px)', margin: '0 auto', padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  sectionLabel: { fontSize: '0.7rem', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.08em', margin: '0 0 0.5rem' },
  row: {
    background: '#fff', borderRadius: '14px', padding: '1rem 1.1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  rowText: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  rowLabel: { fontSize: '0.95rem', fontWeight: '600', color: '#111' },
  rowHint: { fontSize: '0.78rem', color: '#9ca3af', lineHeight: '1.4' },
  inviteBtn: {
    padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: '700',
    background: '#25D366', color: '#fff', border: 'none', borderRadius: '999px',
    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  },
  signOutBtn: {
    padding: '0.55rem 1rem', fontSize: '0.85rem', fontWeight: '700',
    background: '#fff', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: '999px',
    cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap',
  },
  toggle: {
    width: '46px', height: '26px', borderRadius: '999px', background: '#e5e7eb',
    border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0,
    transition: 'background 0.2s ease',
  },
  toggleOn: { background: '#4f46e5' },
  toggleKnob: {
    position: 'absolute', top: '3px', left: '3px', width: '20px', height: '20px',
    borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s ease',
  },
  toggleKnobOn: { transform: 'translateX(20px)' },
  note: { fontSize: '0.75rem', color: '#aaa', lineHeight: '1.5', margin: '0.5rem 0 0' },
}

export default Settings