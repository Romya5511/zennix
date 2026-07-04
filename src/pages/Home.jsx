import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import PushPermissionModal from '../components/PushPermissionModal'
import BottomNav from '../components/BottomNav'
import LoadingScreen from '../components/LoadingScreen'
import QuickLogGrid from '../components/QuickLogGrid'
import { supabase } from '../lib/supabase'

function Home() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [showPushModal, setShowPushModal] = useState(false)
  const [currentUserId, setCurrentUserId] = useState(null)
  const [profile, setProfile] = useState(null)
  const [activeList, setActiveList] = useState(null)
  const [completedList, setCompletedList] = useState(null)
  const [itemCount, setItemCount] = useState(0)
  const [creatorName, setCreatorName] = useState('')
  const [unseenList, setUnseenList] = useState(null)
  const [showUnseenModal, setShowUnseenModal] = useState(false)
  const [weekTotal, setWeekTotal] = useState(0)
  const [lastWeekTotal, setLastWeekTotal] = useState(0)
  const channelRef = useRef(null)
  const householdIdRef = useRef(null)
  const currentUserIdRef = useRef(null)

  useEffect(() => {
    loadHome()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function loadHome() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }

    const { data: profileData } = await supabase
      .from('profiles').select('id, full_name').eq('id', user.id).maybeSingle()
    setProfile(profileData)
    setCurrentUserId(user.id)
    currentUserIdRef.current = user.id

    if (!sessionStorage.getItem('push_prompt_seen')) {
      const { data: profileFull } = await supabase
        .from('profiles').select('push_subscription').eq('id', user.id).maybeSingle()
      if (!profileFull?.push_subscription && 'Notification' in window && 'serviceWorker' in navigator) {
        setShowPushModal(true)
      }
      sessionStorage.setItem('push_prompt_seen', '1')
    }

    const { data: membership } = await supabase
      .from('household_members').select('household_id').eq('user_id', user.id).maybeSingle()
    if (!membership) { navigate('/setup'); return }

    const hid = membership.household_id
    householdIdRef.current = hid

    await checkLists(hid, user.id)
    await loadWeeklySpend(hid)
    subscribeToHousehold(hid)
    setLoading(false)
  }

  async function loadWeeklySpend(hid) {
    const now = new Date()
    const dayOfWeek = now.getDay()
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek)
    const thisMonday = new Date(now)
    thisMonday.setDate(now.getDate() + diffToMonday)
    thisMonday.setHours(0, 0, 0, 0)
    const lastMonday = new Date(thisMonday)
    lastMonday.setDate(thisMonday.getDate() - 7)
    const lastSunday = new Date(thisMonday)
    lastSunday.setMilliseconds(-1)

    const { data: thisWeekData } = await supabase
      .from('household_bucket').select('amount').eq('household_id', hid)
      .gte('bought_at', thisMonday.toISOString())
    const { data: lastWeekData } = await supabase
      .from('household_bucket').select('amount').eq('household_id', hid)
      .gte('bought_at', lastMonday.toISOString()).lte('bought_at', lastSunday.toISOString())

    setWeekTotal((thisWeekData || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))
    setLastWeekTotal((lastWeekData || []).reduce((s, e) => s + (parseFloat(e.amount) || 0), 0))
  }

  async function checkLists(hid, uid) {
    const { data: activeLists } = await supabase
      .from('grocery_lists')
      .select('id, created_at, created_by, status, notification_seen_by')
      .eq('household_id', hid).eq('status', 'active')
      .order('created_at', { ascending: false }).limit(5)

    if (activeLists && activeLists.length > 0) {
      for (const list of activeLists) {
        const { count } = await supabase
          .from('list_items').select('id', { count: 'exact', head: true }).eq('list_id', list.id)
        if (count && count > 0) {
          setActiveList(list)
          setCompletedList(null)
          setItemCount(count)
          const { data: creator } = await supabase
            .from('profiles').select('full_name').eq('id', list.created_by).maybeSingle()
          setCreatorName(creator?.full_name || 'Someone')
          const seenBy = list.notification_seen_by || []
          if (uid && !seenBy.includes(uid)) {
            setUnseenList({ ...list, creatorName: creator?.full_name || 'Someone', itemCount: count })
            setShowUnseenModal(true)
          }
          return
        } else {
          await supabase.from('grocery_lists').delete().eq('id', list.id)
        }
      }
    }

    const { data: completed } = await supabase
      .from('grocery_lists').select('id, completed_at, total_amount, status')
      .eq('household_id', hid).eq('status', 'completed')
      .order('completed_at', { ascending: false }).limit(1).maybeSingle()

    if (completed) {
      const { count: doneCount } = await supabase
        .from('list_items').select('id', { count: 'exact', head: true }).eq('list_id', completed.id)
      setCompletedList({ ...completed, itemCount: doneCount || 0 })
      setActiveList(null); setItemCount(0); setCreatorName('')
    } else {
      setActiveList(null); setCompletedList(null); setItemCount(0); setCreatorName('')
    }
  }

  function subscribeToHousehold(hid) {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase.channel(`home_${hid}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'grocery_lists', filter: `household_id=eq.${hid}` },
        async () => { await checkLists(householdIdRef.current, currentUserIdRef.current) })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'list_items' },
        async () => { await checkLists(householdIdRef.current, currentUserIdRef.current) })
      // NEW — Day 16: keep the weekly spend total live when either member
      // logs a Quick Log entry (or any household_bucket row changes),
      // without needing a manual refresh.
      .on('postgres_changes', { event: '*', schema: 'public', table: 'household_bucket', filter: `household_id=eq.${hid}` },
        async () => { await loadWeeklySpend(householdIdRef.current) })
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
    return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function weekChangeText() {
    if (lastWeekTotal === 0) return null
    const diff = weekTotal - lastWeekTotal
    const pct = Math.abs(Math.round((diff / lastWeekTotal) * 100))
    if (diff > 0) return { text: `↑ ${pct}% vs last week` }
    if (diff < 0) return { text: `↓ ${pct}% vs last week` }
    return { text: 'Same as last week' }
  }

  if (loading) return <LoadingScreen type="home" />

  const change = weekChangeText()

  return (
    <div style={styles.page}>
      <div style={styles.container}>

        <div style={styles.greeting}>
          <p style={styles.greetingText}>{getGreeting()}, {getFirstName(profile?.full_name)} 👋</p>
          <p style={styles.subText}>What needs to be done today?</p>
        </div>

        {/* Weekly spend summary card */}
        <div style={styles.spendSummaryCard} onClick={() => navigate('/spend')}>
          <div style={styles.spendSummaryLeft}>
            <p style={styles.spendSummaryLabel}>This week's spend</p>
            <p style={styles.spendSummaryTotal}>₹{weekTotal.toFixed(2)}</p>
            {change ? (
              <p style={styles.spendSummaryChange}>{change.text}</p>
            ) : (
              <p style={styles.spendSummaryChange}>Tap to see full history</p>
            )}
          </div>
          <span style={styles.spendSummaryArrow}>→</span>
        </div>

        {activeList ? (
          <div style={styles.listCard}>
            <div style={styles.listCardTop}>
              <span style={styles.activeBadge}>● Active list</span>
              <span style={styles.listDate}>{formatDate(activeList.created_at)}</span>
            </div>
            <div style={styles.listCardBody}>
              <p style={styles.listStat}>🛒 <strong>{itemCount}</strong> {itemCount === 1 ? 'item' : 'items'}</p>
              <p style={styles.listCreator}>Created by {creatorName}</p>
            </div>
            <button style={styles.openListBtn} onClick={() => navigate(`/list/${activeList.id}`)}>
              Open list →
            </button>
          </div>

        ) : completedList ? (
          <div style={styles.completionCard}>
            <div style={styles.completionTop}>
              <span style={styles.completionEmoji}>🎉</span>
              <span style={styles.completionBadge}>List complete!</span>
            </div>
            <div style={styles.completionBody}>
              <p style={styles.completionTotal}>₹{parseFloat(completedList.total_amount || 0).toFixed(2)}</p>
              <p style={styles.completionMeta}>
                {completedList.itemCount} {completedList.itemCount === 1 ? 'item' : 'items'} · {formatDate(completedList.completed_at)}
              </p>
            </div>
            <button style={styles.openListBtn} onClick={() => navigate(`/list/${completedList.id}?tab=done`)}>
              View list →
            </button>
            <button style={styles.startNewBtn} onClick={() => setCompletedList(null)}>
              + Start new list
            </button>
          </div>

        ) : (
          <div style={styles.emptyCard}>
            <p style={styles.emptyText}>No active grocery list</p>
            <p style={styles.emptySubText}>Tap below to start one — your partner will be notified.</p>
            <button style={styles.createBtn} onClick={() => navigate('/list/new')}>
              + Create grocery list
            </button>
          </div>
        )}

        {/* NEW — Day 16: Quick Log category grid, placed below the grocery
            list section per the finalized design. */}
        {currentUserId && (
          <QuickLogGrid
            householdId={householdIdRef.current}
            userId={currentUserId}
            onSaved={() => loadWeeklySpend(householdIdRef.current)}
          />
        )}

      </div>

      {showPushModal && (
        <PushPermissionModal userId={currentUserId} onDone={() => setShowPushModal(false)} />
      )}

      {showUnseenModal && unseenList && (
        <div style={modalStyles.overlay}>
          <div style={modalStyles.modal}>
            <div style={modalStyles.iconWrap}>🛒</div>
            <h2 style={modalStyles.title}>New grocery list!</h2>
            <p style={modalStyles.body}>
              <strong>{getFirstName(unseenList.creatorName)}</strong> started a grocery list
              with <strong>{unseenList.itemCount} {unseenList.itemCount === 1 ? 'item' : 'items'}</strong>.
              You haven't seen it yet.
            </p>
            <button style={modalStyles.viewBtn} onClick={() => { setShowUnseenModal(false); navigate(`/list/${unseenList.id}`) }}>
              View list →
            </button>
            <button style={modalStyles.laterBtn} onClick={() => setShowUnseenModal(false)}>
              I'll check later
            </button>
          </div>
        </div>
      )}

      {/* Bottom nav spacer */}
      <div style={{ height: '80px' }} />
      <BottomNav />
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', padding: 'clamp(0.75rem, 3vw, 1.5rem)' },
  container: { maxWidth: 'clamp(320px, 94vw, 560px)', margin: '0 auto', paddingTop: 'clamp(1.25rem, 4vw, 2rem)', display: 'flex', flexDirection: 'column', gap: 'clamp(1rem, 3vw, 1.5rem)' },
  greeting: { marginBottom: '0.5rem' },
  greetingText: { fontSize: 'clamp(1.25rem, 4vw, 1.75rem)', fontWeight: '700', color: '#111', margin: '0 0 0.25rem' },
  subText: { fontSize: 'clamp(0.85rem, 2.2vw, 1rem)', color: '#888', margin: 0 },
  spendSummaryCard: { background: '#4f46e5', borderRadius: '16px', padding: 'clamp(1rem, 3vw, 1.5rem)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 4px 16px rgba(79,70,229,0.25)' },
  spendSummaryLeft: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  spendSummaryLabel: { fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  spendSummaryTotal: { fontSize: 'clamp(1.5rem, 5vw, 2rem)', fontWeight: '800', color: '#fff', margin: 0 },
  spendSummaryChange: { fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)', fontWeight: '600', color: 'rgba(255,255,255,0.8)', margin: 0 },
  spendSummaryArrow: { fontSize: '1.25rem', color: 'rgba(255,255,255,0.7)' },
  listCard: { background: '#fff', borderRadius: '16px', padding: 'clamp(1rem, 3vw, 1.5rem)', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '1rem' },
  listCardTop: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  activeBadge: { fontSize: '0.75rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' },
  listDate: { fontSize: '0.8rem', color: '#aaa' },
  listCardBody: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  listStat: { fontSize: 'clamp(1rem, 2.6vw, 1.15rem)', color: '#111', margin: 0 },
  listCreator: { fontSize: '0.85rem', color: '#888', margin: 0 },
  openListBtn: { width: '100%', padding: 'clamp(0.75rem, 2.4vw, 0.95rem)', fontSize: 'clamp(0.95rem, 2.4vw, 1.05rem)', fontWeight: '700', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer' },
  completionCard: { background: '#fff', borderRadius: '16px', padding: 'clamp(1rem, 3vw, 1.5rem)', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px solid #bbf7d0' },
  completionTop: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  completionEmoji: { fontSize: '1.25rem' },
  completionBadge: { fontSize: '0.85rem', fontWeight: '700', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.05em' },
  completionBody: { display: 'flex', flexDirection: 'column', gap: '0.25rem' },
  completionTotal: { fontSize: 'clamp(1.6rem, 5vw, 2.1rem)', fontWeight: '800', color: '#111', margin: 0 },
  completionMeta: { fontSize: '0.875rem', color: '#888', margin: 0 },
  startNewBtn: { width: '100%', padding: 'clamp(0.75rem, 2.4vw, 0.95rem)', fontSize: 'clamp(0.95rem, 2.4vw, 1.05rem)', fontWeight: '700', backgroundColor: '#fff', color: '#4f46e5', border: '2px solid #4f46e5', borderRadius: '12px', cursor: 'pointer' },
  emptyCard: { background: '#fff', borderRadius: '16px', padding: 'clamp(1.25rem, 4vw, 1.75rem)', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'center' },
  emptyText: { fontSize: 'clamp(0.95rem, 2.4vw, 1.05rem)', fontWeight: '600', color: '#111', margin: 0 },
  emptySubText: { fontSize: '0.875rem', color: '#888', margin: 0, lineHeight: '1.5' },
  createBtn: { width: '100%', padding: 'clamp(0.75rem, 2.4vw, 0.95rem)', fontSize: 'clamp(0.95rem, 2.4vw, 1.05rem)', fontWeight: '700', backgroundColor: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '0.25rem' },
}

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' },
  modal: { background: '#fff', borderRadius: '20px', padding: '2rem 1.5rem', maxWidth: '360px', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem', boxShadow: '0 8px 40px rgba(0,0,0,0.18)' },
  iconWrap: { fontSize: '2.5rem', marginBottom: '0.25rem' },
  title: { fontSize: '1.25rem', fontWeight: '800', color: '#111', margin: 0, textAlign: 'center' },
  body: { fontSize: '0.95rem', color: '#444', textAlign: 'center', lineHeight: '1.6', margin: 0 },
  viewBtn: { width: '100%', padding: '0.9rem', fontSize: '1rem', fontWeight: '700', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer', marginTop: '0.5rem' },
  laterBtn: { width: '100%', padding: '0.75rem', fontSize: '0.9rem', fontWeight: '600', background: 'none', color: '#888', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer' },
}

export default Home