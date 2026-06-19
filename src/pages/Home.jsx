import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [profile, setProfile] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [activeList, setActiveList] = useState(null)
  const [itemCount, setItemCount] = useState(0)
  const [creatorName, setCreatorName] = useState('')
  const [creating, setCreating] = useState(false)

  useEffect(() => { loadHome() }, [])

  async function loadHome() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }

    // Get profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle()
    setProfile(profileData)

    // Get household
    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) { navigate('/setup'); return }
    const hid = membership.household_id
    setHouseholdId(hid)

    // Check for active list
    const { data: list } = await supabase
      .from('grocery_lists')
      .select('id, created_at, created_by, status')
      .eq('household_id', hid)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (list) {
      setActiveList(list)

      // Count items
      const { count } = await supabase
        .from('list_items')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', list.id)
      setItemCount(count || 0)

      // Get creator name
      const { data: creator } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', list.created_by)
        .maybeSingle()
      setCreatorName(creator?.full_name || 'Someone')
    }

    setLoading(false)
  }

  async function handleCreateList() {
    if (creating || !householdId) return
    setCreating(true)

    // Get current user
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setCreating(false); return }

    // Check if active list already exists — navigate to it instead
    const { data: existing } = await supabase
      .from('grocery_lists')
      .select('id')
      .eq('household_id', householdId)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (existing) {
      navigate(`/list/${existing.id}`)
      return
    }

    // Create new list
    const { data: newList, error } = await supabase
      .from('grocery_lists')
      .insert({
        household_id: householdId,
        created_by: user.id,
        status: 'active',
      })
      .select()
      .single()

    if (error || !newList) {
      setCreating(false)
      return
    }

    // Navigate to the new list
    // (Push notifications wired up on Day 10)
    navigate(`/list/${newList.id}`)
  }

  function getGreeting() {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good morning'
    if (hour < 17) return 'Good afternoon'
    return 'Good evening'
  }

  function getFirstName(fullName) {
    if (!fullName) return ''
    return fullName.split(' ')[0]
  }

  function formatDate(dateStr) {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={styles.loadingText}>Setting things up...</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        {/* Greeting */}
        <div style={styles.greeting}>
          <p style={styles.greetingText}>
            {getGreeting()}, {getFirstName(profile?.full_name)} 👋
          </p>
          <p style={styles.subText}>What needs to be done today?</p>
        </div>

        {/* Active list card OR create button */}
        {activeList ? (
          <div style={styles.listCard}>
            <div style={styles.listCardTop}>
              <span style={styles.activeBadge}>● Active list</span>
              <span style={styles.listDate}>{formatDate(activeList.created_at)}</span>
            </div>
            <div style={styles.listCardBody}>
              <p style={styles.listStat}>
                🛒 <strong>{itemCount}</strong> {itemCount === 1 ? 'item' : 'items'}
              </p>
              <p style={styles.listCreator}>Created by {creatorName}</p>
            </div>
            <button
              style={styles.openListBtn}
              onClick={() => navigate(`/list/${activeList.id}`)}
            >
              Open list →
            </button>
          </div>
        ) : (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No active grocery list</p>
            <p style={styles.emptySubText}>
              Tap below to start one — your partner will be notified.
            </p>
            <button
              style={{
                ...styles.createBtn,
                opacity: creating ? 0.7 : 1,
              }}
              onClick={handleCreateList}
              disabled={creating}
            >
              {creating ? 'Creating...' : '+ Create grocery list'}
            </button>
          </div>
        )}

        {/* Placeholder buttons */}
        <div style={styles.placeholderRow}>
          <button style={styles.placeholderBtn} disabled>
            <span style={styles.placeholderIcon}>📅</span>
            <span style={styles.placeholderLabel}>Fixed costs</span>
            <span style={styles.comingSoon}>Coming soon</span>
          </button>
          <button style={styles.placeholderBtn} disabled>
            <span style={styles.placeholderIcon}>📊</span>
            <span style={styles.placeholderLabel}>Spend history</span>
            <span style={styles.comingSoon}>Coming soon</span>
          </button>
        </div>

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
    paddingTop: '2rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  },
  loadingText: {
    padding: '2rem',
    color: '#888',
    textAlign: 'center',
  },
  greeting: {
    marginBottom: '0.5rem',
  },
  greetingText: {
    fontSize: '1.5rem',
    fontWeight: '700',
    color: '#111',
    margin: '0 0 0.25rem',
  },
  subText: {
    fontSize: '0.9rem',
    color: '#888',
    margin: 0,
  },
  listCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: '1rem',
  },
  listCardTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  activeBadge: {
    fontSize: '0.75rem',
    fontWeight: '700',
    color: '#16a34a',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
  },
  listDate: {
    fontSize: '0.8rem',
    color: '#aaa',
  },
  listCardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem',
  },
  listStat: {
    fontSize: '1.1rem',
    color: '#111',
    margin: 0,
  },
  listCreator: {
    fontSize: '0.85rem',
    color: '#888',
    margin: 0,
  },
  openListBtn: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '700',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  emptyCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '1.5rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: '1rem',
    fontWeight: '600',
    color: '#111',
    margin: 0,
  },
  emptySubText: {
    fontSize: '0.875rem',
    color: '#888',
    margin: 0,
    lineHeight: '1.5',
  },
  createBtn: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '700',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginTop: '0.25rem',
  },
  placeholderRow: {
    display: 'flex',
    gap: '0.75rem',
  },
  placeholderBtn: {
    flex: 1,
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '1rem 0.75rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.35rem',
    cursor: 'not-allowed',
    opacity: 0.6,
  },
  placeholderIcon: { fontSize: '1.5rem' },
  placeholderLabel: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#444',
  },
  comingSoon: {
    fontSize: '0.7rem',
    color: '#aaa',
    fontWeight: '500',
  },
}

export default Home