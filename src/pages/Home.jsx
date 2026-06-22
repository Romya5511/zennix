import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PushPermissionModal from '../components/PushPermissionModal'
import { supabase } from '../lib/supabase'

function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showPushModal, setShowPushModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [activeList, setActiveList] = useState(null)
  const [completedList, setCompletedList] = useState(null) // most recently completed list
  const [itemCount, setItemCount] = useState(0)
  const [creatorName, setCreatorName] = useState('')
  const channelRef = useRef(null)
  const householdIdRef = useRef(null)

  useEffect(() => {
    loadHome()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  async function loadHome() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }

    const { data: profileData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', user.id)
      .maybeSingle()
    setProfile(profileData)
    setCurrentUserId(user.id)

    // Show push permission modal if not already subscribed and not seen this session
    if (!sessionStorage.getItem('push_prompt_seen')) {
      const { data: profileFull } = await supabase
        .from('profiles')
        .select('push_subscription')
        .eq('id', user.id)
        .maybeSingle()
      if (!profileFull?.push_subscription && 'Notification' in window && 'serviceWorker' in navigator) {
        setShowPushModal(true)
      }
      sessionStorage.setItem('push_prompt_seen', '1')
    }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) { navigate('/setup'); return }
    const hid = membership.household_id
    setHouseholdId(hid)
    householdIdRef.current = hid

    await checkLists(hid)
    subscribeToHousehold(hid)
    setLoading(false)
  }

  async function checkLists(hid) {
    // Check for active list first
    const { data: activeLists } = await supabase
      .from('grocery_lists')
      .select('id, created_at, created_by, status')
      .eq('household_id', hid)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(5)

    if (activeLists && activeLists.length > 0) {
      for (const list of activeLists) {
        const { count } = await supabase
          .from('list_items')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', list.id)

        if (count && count > 0) {
          setActiveList(list)
          setCompletedList(null)
          setItemCount(count)
          const { data: creator } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', list.created_by)
            .maybeSingle()
          setCreatorName(creator?.full_name || 'Someone')
          return
        }
      }
    }

    // No active list — check for most recently completed list
    const { data: completed } = await supabase
      .from('grocery_lists')
      .select('id, completed_at, total_amount, status')
      .eq('household_id', hid)
      .eq('status', 'completed')
      .order('completed_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (completed) {
      // Count items in completed list
      const { count: doneCount } = await supabase
        .from('list_items')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', completed.id)
      setCompletedList({ ...completed, itemCount: doneCount || 0 })
      setActiveList(null)
      setItemCount(0)
      setCreatorName('')
    } else {
      setActiveList(null)
      setCompletedList(null)
      setItemCount(0)
      setCreatorName('')
    }
  }

  function subscribeToHousehold(hid) {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    const channel = supabase
      .channel(`home_${hid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'grocery_lists', filter: `household_id=eq.${hid}` },
        async () => { await checkLists(householdIdRef.current) }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items' },
        async () => { await checkLists(householdIdRef.current) }
      )
      .subscribe()

    channelRef.current = channel
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

        <div style={styles.greeting}>
          <p style={styles.greetingText}>
            {getGreeting()}, {getFirstName(profile?.full_name)} 👋
          </p>
          <p style={styles.subText}>What needs to be done today?</p>
        </div>

        {activeList ? (
          // Active list card
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

        ) : completedList ? (
          // Completion card — shows after list is fully done
          <div style={styles.completionCard}>
            <div style={styles.completionTop}>
              <span style={styles.completionEmoji}>🎉</span>
              <span style={styles.completionBadge}>List complete!</span>
            </div>
            <div style={styles.completionBody}>
              <p style={styles.completionTotal}>
                ₹{parseFloat(completedList.total_amount || 0).toFixed(2)}
              </p>
              <p style={styles.completionMeta}>
                {completedList.itemCount} {completedList.itemCount === 1 ? 'item' : 'items'} · {formatDate(completedList.completed_at)}
              </p>
            </div>
            <button
              style={styles.openListBtn}
              onClick={() => navigate(`/list/${completedList.id}?tab=done`)}
            >
              View list →
            </button>
            <button
              style={styles.startNewBtn}
              onClick={() => setCompletedList(null)}
            >
              + Start new list
            </button>
          </div>

        ) : (
          // Empty state — create new list
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No active grocery list</p>
            <p style={styles.emptySubText}>
              Tap below to start one — your partner will be notified.
            </p>
            <button
              style={styles.createBtn}
              onClick={() => navigate('/list/new')}
            >
              + Create grocery list
            </button>
          </div>
        )}

        <div style={styles.placeholderRow}>
          <button style={styles.placeholderBtnActive} onClick={() => navigate('/fixed-costs')}>
            <span style={styles.placeholderIcon}>📅</span>
            <span style={styles.placeholderLabel}>Fixed costs</span>
          </button>
          <button style={styles.placeholderBtn} disabled>
            <span style={styles.placeholderIcon}>📊</span>
            <span style={styles.placeholderLabel}>Spend history</span>
            <span style={styles.comingSoon}>Coming soon</span>
          </button>
        </div>

      </div>
      {showPushModal && (
        <PushPermissionModal
          userId={currentUserId}
          onDone={() => setShowPushModal(false)}
        />
      )}
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', padding: '1rem' },
  container: { maxWidth: '480px', margin: '0 auto', paddingTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' },
  loadingText: { padding: '2rem', color: '#888', textAlign: 'center' },
  greeting: { marginBottom: '0.5rem' },
  greetingText: { fontSize: '1.5rem', fontWeight: '700', color: '#111', margin: '0 0 0.25rem' },
  subText: { fontSize: '0.9rem', color: '#888', margin: 0 },

  // Active list card
  listCard: { background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '1rem' },
  listCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge: { fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' },
  listDate: { fontSize: '0.8rem', color: '#aaa' },
  listCardBody: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  listStat: { fontSize: '1.1rem', color: '#111', margin: 0 },
  listCreator: { fontSize: '0.85rem', color: '#888', margin: 0 },
  openListBtn: { width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: '700', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer' },

  // Completion card
  completionCard: { background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #bbf7d0' },
  completionTop: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  completionEmoji: { fontSize: '1.25rem' },
  completionBadge: { fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' },
  completionBody: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  completionTotal: { fontSize: '2rem', fontWeight: '800', color: '#111', margin: 0 },
  completionMeta: { fontSize: '0.875rem', color: '#888', margin: 0 },
  startNewBtn: { width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: '700', backgroundColor: '#fff', color: '#4f46e5', border: '2px solid #4f46e5', borderRadius: '12px', cursor: 'pointer' },

  // Empty state
  emptyCard: { background: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' },
  emptyText: { fontSize: '1rem', fontWeight: '600', color: '#111', margin: 0 },
  emptySubText: { fontSize: '0.875rem', color: '#888', margin: 0, lineHeight: '1.5' },
  createBtn: { width: '100%', padding: '0.85rem', fontSize: '1rem', fontWeight: '700', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '0.25rem' },

  placeholderRow: { display: 'flex', gap: '0.75rem' },
  placeholderBtnActive: { flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', cursor: 'pointer' },
  placeholderBtn: { flex: 1, background: '#fff', border: '1px solid #e5e7eb', borderRadius: '14px', padding: '1rem 0.75rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.35rem', cursor: 'not-allowed', opacity: 0.6 },
  placeholderIcon: { fontSize: '1.5rem' },
  placeholderLabel: { fontSize: '0.85rem', fontWeight: '600', color: '#444' },
  comingSoon: { fontSize: '0.7rem', color: '#aaa', fontWeight: '500' },
}

export default Home