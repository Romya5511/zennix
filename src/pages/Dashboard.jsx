import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

function Dashboard() {
  const [household, setHousehold] = useState(null)
  const [members, setMembers] = useState([])
  const [currentUser, setCurrentUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadDashboard() {
      // Get logged in user
      const { data: { user } } = await supabase.auth.getUser()
      setCurrentUser(user)

      // Get their household membership
      const { data: membership } = await supabase
        .from('household_members')
        .select('household_id')
        .eq('user_id', user.id)
        .maybeSingle()

      if (!membership) {
        setLoading(false)
        return
      }

      // Get household details
      const { data: householdData } = await supabase
        .from('households')
        .select('id, name')
        .eq('id', membership.household_id)
        .single()

      setHousehold(householdData)

      // Get all members of this household + their profiles
      const { data: membersData } = await supabase
        .from('household_members')
        .select(`
          role,
          profiles (
            id,
            full_name,
            avatar_url
          )
        `)
        .eq('household_id', membership.household_id)

      setMembers(membersData || [])
      setLoading(false)
    }

    loadDashboard()
  }, [])

  async function signOut() {
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  function getInitials(name) {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ color: '#888', fontFamily: 'sans-serif' }}>Loading your household...</p>
      </div>
    )
  }

  if (!household) {
    return (
      <div style={styles.page}>
        <p style={{ color: '#888', fontFamily: 'sans-serif' }}>
          No household found. <a href="/setup">Set one up →</a>
        </p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Header */}
        <div style={styles.header}>
          <div>
            <p style={styles.appName}>Zennix 🏠</p>
            <h1 style={styles.householdName}>{household.name}</h1>
          </div>
          <button style={styles.signOutBtn} onClick={signOut}>Sign out</button>
        </div>

        {/* Members */}
        <div style={styles.membersCard}>
          <p style={styles.sectionLabel}>HOUSEHOLD MEMBERS</p>
          <div style={styles.membersList}>
            {members.map((member) => {
              const profile = member.profiles
              const isMe = profile?.id === currentUser?.id
              return (
                <div key={profile?.id} style={styles.memberRow}>
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.full_name}
                      style={styles.avatar}
                    />
                  ) : (
                    <div style={styles.avatarFallback}>
                      {getInitials(profile?.full_name)}
                    </div>
                  )}
                  <div>
                    <p style={styles.memberName}>
                      {profile?.full_name || 'Unknown'} {isMe && '(you)'}
                    </p>
                    <p style={styles.memberRole}>{member.role}</p>
                  </div>
                </div>
              )
            })}

            {/* If only 1 member, show waiting slot */}
            {members.length === 1 && (
              <div style={styles.memberRow}>
                <div style={{ ...styles.avatarFallback, background: '#f3f4f6', color: '#aaa' }}>
                  ?
                </div>
                <div>
                  <p style={styles.memberName}>Waiting for partner...</p>
                  <p style={styles.memberRole}>Share your invite link to add them</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Balance summary — placeholder for Day 5 */}
        <div style={styles.balanceCard}>
          <p style={styles.sectionLabel}>BALANCE</p>
          <p style={styles.balanceAmount}>₹0.00</p>
          <p style={styles.balanceNote}>No expenses yet — add your first one below!</p>
        </div>

        {/* Add expense button — will be wired up on Day 5 */}
        <button style={styles.addButton} onClick={() => alert('Coming on Day 5! 🎉')}>
          + Add expense
        </button>

      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'sans-serif',
    padding: '1rem',
  },
  container: {
    maxWidth: '480px',
    margin: '0 auto',
    paddingTop: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1.5rem',
  },
  appName: {
    fontSize: '0.85rem',
    color: '#888',
    margin: '0 0 0.25rem',
  },
  householdName: {
    fontSize: '1.4rem',
    fontWeight: '700',
    margin: 0,
    color: '#111',
  },
  signOutBtn: {
    background: 'none',
    border: '1px solid #ddd',
    borderRadius: '8px',
    padding: '0.4rem 0.75rem',
    fontSize: '0.85rem',
    cursor: 'pointer',
    color: '#666',
  },
  membersCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '1.25rem',
    marginBottom: '1rem',
    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#aaa',
    letterSpacing: '0.08em',
    margin: '0 0 1rem',
  },
  membersList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
  },
  memberRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  avatar: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    objectFit: 'cover',
  },
  avatarFallback: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    background: '#e0e7ff',
    color: '#4f46e5',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '700',
    fontSize: '0.85rem',
    flexShrink: 0,
  },
  memberName: {
    margin: 0,
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#111',
  },
  memberRole: {
    margin: 0,
    fontSize: '0.8rem',
    color: '#888',
    textTransform: 'capitalize',
  },
  balanceCard: {
    background: '#4f46e5',
    borderRadius: '16px',
    padding: '1.25rem',
    marginBottom: '1rem',
    color: '#fff',
  },
  balanceAmount: {
    fontSize: '2rem',
    fontWeight: '700',
    margin: '0 0 0.25rem',
  },
  balanceNote: {
    fontSize: '0.85rem',
    opacity: 0.8,
    margin: 0,
  },
  addButton: {
    width: '100%',
    padding: '1rem',
    fontSize: '1rem',
    fontWeight: '700',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '14px',
    cursor: 'pointer',
  },
}

export default Dashboard