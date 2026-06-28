import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import LoadingScreen from '../components/LoadingScreen'

const INCOME_BRACKETS = [
  { value: 'under_25k', label: 'Under ₹25,000' },
  { value: '25k_50k', label: '₹25,000 – ₹50,000' },
  { value: '50k_1l', label: '₹50,000 – ₹1,00,000' },
  { value: '1l_2l', label: '₹1,00,000 – ₹2,00,000' },
  { value: 'above_2l', label: 'Above ₹2,00,000' },
]

// ── Month name helper ────────────────────────────────────────────────────────
function monthLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    month: 'long', year: 'numeric'
  })
}

function formatDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric'
  })
}

function getFirstName(fullName) {
  if (!fullName) return 'Someone'
  return fullName.split(' ')[0]
}

// ── Income bracket modal ─────────────────────────────────────────────────────
function IncomeBracketModal({ onSelect, onSkip }) {
  return (
    <div style={modalStyles.overlay}>
      <div style={modalStyles.modal}>
        <p style={modalStyles.emoji}>📊</p>
        <h2 style={modalStyles.title}>One quick question</h2>
        <p style={modalStyles.body}>
          What is your household's approximate monthly income?
          This helps us show how your spending compares.
        </p>
        <div style={modalStyles.options}>
          {INCOME_BRACKETS.map(b => (
            <button
              key={b.value}
              style={modalStyles.optionBtn}
              onClick={() => onSelect(b.value)}
            >
              {b.label}
            </button>
          ))}
        </div>
        <button style={modalStyles.skipBtn} onClick={onSkip}>
          Skip for now
        </button>
      </div>
    </div>
  )
}

// ── List history card ────────────────────────────────────────────────────────
function ListCard({ list, profiles }) {
  const [expanded, setExpanded] = useState(false)
  const [items, setItems] = useState(null)
  const [loadingItems, setLoadingItems] = useState(false)

  async function loadItems() {
    if (items !== null) { setExpanded(e => !e); return }
    setLoadingItems(true)
    const { data } = await supabase
      .from('list_items')
      .select('*')
      .eq('list_id', list.id)
      .order('display_order', { ascending: true })
    setItems(data || [])
    setLoadingItems(false)
    setExpanded(true)
  }

  const doneItems = items ? items.filter(i => i.tab_status === 'done') : []
  const skippedItems = items ? items.filter(i => i.tab_status !== 'done') : []

  return (
    <div style={cardStyles.card}>
      {/* Card header — always visible */}
      <div style={cardStyles.header} onClick={loadItems}>
        <div style={cardStyles.headerLeft}>
          <span style={cardStyles.date}>{formatDate(list.completed_at || list.created_at)}</span>
          <span style={cardStyles.creator}>
            Created by {getFirstName(profiles[list.created_by])}
          </span>
        </div>
        <div style={cardStyles.headerRight}>
          <span style={cardStyles.total}>
            ₹{parseFloat(list.total_amount || 0).toFixed(0)}
          </span>
          <span style={cardStyles.chevron}>{expanded ? '▲' : '▼'}</span>
        </div>
      </div>

      {/* Item count pills */}
      <div style={cardStyles.pills}>
        <span style={cardStyles.pillGreen}>
          ✓ {list.item_count || 0} bought
        </span>
        {list.status === 'completed' ? (
          <span style={cardStyles.pillGrey}>Complete</span>
        ) : (
          <span style={cardStyles.pillAmber}>Partial</span>
        )}
      </div>

      {/* Expanded items */}
      {loadingItems && (
        <p style={cardStyles.loadingNote}>Loading items...</p>
      )}

      {expanded && items && (
        <div style={cardStyles.itemList}>
          <div style={cardStyles.divider} />

          {doneItems.length > 0 && (
            <>
              <p style={cardStyles.sectionLabel}>Bought</p>
              {doneItems.map(item => (
                <div key={item.id} style={cardStyles.itemRow}>
                  <span style={cardStyles.itemName}>{item.item_name}</span>
                  <span style={cardStyles.itemMeta}>
                    {item.quantity ? `${item.quantity} · ` : ''}
                    {getFirstName(profiles[item.ticked_by])}
                  </span>
                  <span style={cardStyles.itemPrice}>
                    ₹{parseFloat(item.price_entered || 0).toFixed(2)}
                  </span>
                </div>
              ))}
            </>
          )}

          {skippedItems.length > 0 && (
            <>
              <p style={{ ...cardStyles.sectionLabel, color: '#9ca3af', marginTop: '0.75rem' }}>
                Not bought ({skippedItems.length})
              </p>
              {skippedItems.map(item => (
                <div key={item.id} style={{ ...cardStyles.itemRow, opacity: 0.5 }}>
                  <span style={cardStyles.itemName}>{item.item_name}</span>
                  <span style={cardStyles.itemMeta}>{item.quantity || ''}</span>
                  <span style={cardStyles.itemPrice}>—</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Main HistoryPage ─────────────────────────────────────────────────────────
function HistoryPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [lists, setLists] = useState([])
  const [profiles, setProfiles] = useState({})
  const [monthlyGrocery, setMonthlyGrocery] = useState(0)
  const [monthlyFixed, setMonthlyFixed] = useState(0)
  const [incomeBracket, setIncomeBracket] = useState(null)
  const [showBracketModal, setShowBracketModal] = useState(false)
  const [householdId, setHouseholdId] = useState(null)

  useEffect(() => { loadHistory() }, [])

  async function loadHistory() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) { navigate('/'); return }
    const hid = membership.household_id
    setHouseholdId(hid)

    // Load profiles
    const { data: members } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', hid)
    if (members) {
      const uids = members.map(m => m.user_id)
      const { data: profileRows } = await supabase
        .from('profiles').select('id, full_name').in('id', uids)
      if (profileRows) {
        const map = {}
        profileRows.forEach(p => { map[p.id] = p.full_name })
        setProfiles(map)
      }
    }

    // Load income bracket from household
    const { data: household } = await supabase
      .from('households')
      .select('income_bracket')
      .eq('id', hid)
      .maybeSingle()

    if (household?.income_bracket) {
      setIncomeBracket(household.income_bracket)
    } else {
      // Show bracket modal on first open
      setShowBracketModal(true)
    }

    // Load all grocery lists (completed + partial) newest first
    const { data: allLists } = await supabase
      .from('grocery_lists')
      .select('id, created_at, completed_at, total_amount, status, created_by')
      .eq('household_id', hid)
      .in('status', ['completed', 'active', 'abandoned'])
      .order('created_at', { ascending: false })

    // For each list get item count
    const listsWithCount = await Promise.all(
      (allLists || []).map(async list => {
        const { count } = await supabase
          .from('list_items')
          .select('id', { count: 'exact', head: true })
          .eq('list_id', list.id)
          .eq('tab_status', 'done')
        return { ...list, item_count: count || 0 }
      })
    )
    setLists(listsWithCount)

    // Monthly summary — current month
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString()

    const { data: monthBucket } = await supabase
      .from('household_bucket')
      .select('amount, source_type')
      .eq('household_id', hid)
      .gte('bought_at', monthStart)
      .lt('bought_at', monthEnd)

    const grocery = (monthBucket || [])
      .filter(e => e.source_type === 'grocery_list')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const fixed = (monthBucket || [])
      .filter(e => e.source_type === 'fixed_cost')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

    setMonthlyGrocery(grocery)
    setMonthlyFixed(fixed)
    setLoading(false)
  }

  async function saveIncomeBracket(value) {
    setIncomeBracket(value)
    setShowBracketModal(false)
    await supabase
      .from('households')
      .update({ income_bracket: value })
      .eq('id', householdId)
  }

  function getBracketLabel(value) {
    return INCOME_BRACKETS.find(b => b.value === value)?.label || ''
  }

  // Income % of bracket midpoints (approximate)
  const bracketMidpoints = {
    under_25k: 20000,
    '25k_50k': 37500,
    '50k_1l': 75000,
    '1l_2l': 150000,
    above_2l: 250000,
  }

  const monthTotal = monthlyGrocery + monthlyFixed
  const midpoint = incomeBracket ? bracketMidpoints[incomeBracket] : null
  const spendPct = midpoint ? Math.round((monthTotal / midpoint) * 100) : null

  if (loading) return <LoadingScreen type="history" />

  const now = new Date()
  const currentMonthLabel = now.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <h1 style={styles.title}>List History</h1>
      </div>

      <div style={styles.content}>

        {/* Monthly summary card */}
        <div style={styles.monthCard}>
          <p style={styles.monthLabel}>{currentMonthLabel}</p>
          <p style={styles.monthTotal}>₹{monthTotal.toFixed(2)}</p>
          <div style={styles.monthBreakdown}>
            <div style={styles.monthItem}>
              <span style={styles.monthItemDot} />
              <span style={styles.monthItemText}>Grocery</span>
              <span style={styles.monthItemAmt}>₹{monthlyGrocery.toFixed(0)}</span>
            </div>
            <div style={styles.monthItem}>
              <span style={{ ...styles.monthItemDot, background: '#f59e0b' }} />
              <span style={styles.monthItemText}>Fixed</span>
              <span style={styles.monthItemAmt}>₹{monthlyFixed.toFixed(0)}</span>
            </div>
          </div>

          {/* Income bracket comparison */}
          {incomeBracket && spendPct !== null && (
            <div style={styles.bracketRow}>
              <span style={styles.bracketText}>
                {spendPct}% of your monthly income
              </span>
              <span
                style={{
                  ...styles.bracketBadge,
                  background: spendPct > 50 ? '#fee2e2' : spendPct > 30 ? '#fef9c3' : '#dcfce7',
                  color: spendPct > 50 ? '#dc2626' : spendPct > 30 ? '#a16207' : '#16a34a',
                }}
              >
                {spendPct > 50 ? 'High' : spendPct > 30 ? 'Moderate' : 'Healthy'}
              </span>
            </div>
          )}

          {!incomeBracket && (
            <button
              style={styles.bracketSetBtn}
              onClick={() => setShowBracketModal(true)}
            >
              + Set income bracket for comparison
            </button>
          )}
        </div>

        {/* List history */}
        <p style={styles.sectionTitle}>Past Lists</p>

        {lists.length === 0 ? (
          <div style={styles.emptyCard}>
            <p style={styles.emptyIcon}>🛒</p>
            <p style={styles.emptyText}>No lists yet.</p>
            <p style={styles.emptySubText}>Complete your first grocery list to see it here.</p>
          </div>
        ) : (
          lists.map(list => (
            <ListCard
              key={list.id}
              list={list}
              profiles={profiles}
            />
          ))
        )}

      </div>

      {/* Income bracket modal */}
      {showBracketModal && (
        <IncomeBracketModal
          onSelect={saveIncomeBracket}
          onSkip={() => setShowBracketModal(false)}
        />
      )}

      {/* Bottom nav */}
      <BottomNav />

    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', paddingBottom: '2rem' },
  loadingText: { padding: '2rem', color: '#888', textAlign: 'center' },
  header: {
    padding: '1rem 1rem 0.75rem',
    background: '#fff',
    borderBottom: '1px solid #f3f4f6',
  },
  title: { fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111' },
  content: { maxWidth: '480px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' },

  // Monthly card
  monthCard: {
    background: '#fff',
    borderRadius: '16px',
    padding: '1.25rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  monthLabel: { fontSize: '0.8rem', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  monthTotal: { fontSize: '2rem', fontWeight: '800', color: '#111', margin: 0 },
  monthBreakdown: { display: 'flex', gap: '1.25rem', marginTop: '0.25rem' },
  monthItem: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  monthItemDot: { width: '8px', height: '8px', borderRadius: '50%', background: '#4f46e5', flexShrink: 0 },
  monthItemText: { fontSize: '0.8rem', color: '#6b7280' },
  monthItemAmt: { fontSize: '0.8rem', fontWeight: '700', color: '#111' },
  bracketRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '0.5rem', paddingTop: '0.75rem', borderTop: '1px solid #f3f4f6' },
  bracketText: { fontSize: '0.82rem', color: '#6b7280' },
  bracketBadge: { fontSize: '0.75rem', fontWeight: '700', padding: '0.2rem 0.6rem', borderRadius: '999px' },
  bracketSetBtn: { marginTop: '0.5rem', background: 'none', border: 'none', color: '#4f46e5', fontSize: '0.82rem', fontWeight: '600', cursor: 'pointer', padding: 0, textAlign: 'left' },

  sectionTitle: { fontSize: '0.8rem', fontWeight: '700', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0.5rem 0 0' },

  emptyCard: { background: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  emptyIcon: { fontSize: '2rem', margin: 0 },
  emptyText: { fontSize: '1rem', fontWeight: '600', color: '#111', margin: 0 },
  emptySubText: { fontSize: '0.875rem', color: '#888', margin: 0 },
}

const cardStyles = {
  card: { background: '#fff', borderRadius: '16px', padding: '1rem 1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', cursor: 'pointer' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
  headerLeft: { display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  headerRight: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  date: { fontSize: '0.9rem', fontWeight: '600', color: '#111' },
  creator: { fontSize: '0.75rem', color: '#9ca3af' },
  total: { fontSize: '1.1rem', fontWeight: '800', color: '#4f46e5' },
  chevron: { fontSize: '0.7rem', color: '#9ca3af' },
  pills: { display: 'flex', gap: '0.5rem', marginTop: '0.6rem' },
  pillGreen: { fontSize: '0.7rem', fontWeight: '600', background: '#dcfce7', color: '#16a34a', padding: '0.2rem 0.55rem', borderRadius: '999px' },
  pillGrey: { fontSize: '0.7rem', fontWeight: '600', background: '#f3f4f6', color: '#6b7280', padding: '0.2rem 0.55rem', borderRadius: '999px' },
  pillAmber: { fontSize: '0.7rem', fontWeight: '600', background: '#fef9c3', color: '#a16207', padding: '0.2rem 0.55rem', borderRadius: '999px' },
  loadingNote: { fontSize: '0.8rem', color: '#9ca3af', textAlign: 'center', padding: '0.5rem 0', margin: 0 },
  divider: { borderTop: '1px solid #f3f4f6', margin: '0.75rem 0' },
  itemList: { marginTop: '0.25rem' },
  sectionLabel: { fontSize: '0.72rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 0.4rem' },
  itemRow: { display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.3rem 0', borderBottom: '1px solid #f9fafb' },
  itemName: { flex: 1, fontSize: '0.85rem', color: '#111' },
  itemMeta: { fontSize: '0.75rem', color: '#9ca3af' },
  itemPrice: { fontSize: '0.85rem', fontWeight: '600', color: '#16a34a', flexShrink: 0 },
}

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  modal: { background: '#fff', borderRadius: '20px 20px 0 0', padding: '1.5rem 1.25rem 2.5rem', width: '100%', maxWidth: '480px', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  emoji: { fontSize: '1.75rem', margin: 0, textAlign: 'center' },
  title: { fontSize: '1.1rem', fontWeight: '800', color: '#111', margin: 0, textAlign: 'center' },
  body: { fontSize: '0.875rem', color: '#6b7280', textAlign: 'center', margin: 0, lineHeight: '1.5' },
  options: { display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' },
  optionBtn: { width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: '600', background: '#f9fafb', color: '#111', border: '1px solid #e5e7eb', borderRadius: '12px', cursor: 'pointer', textAlign: 'left' },
  skipBtn: { background: 'none', border: 'none', color: '#9ca3af', fontSize: '0.875rem', cursor: 'pointer', textAlign: 'center', padding: '0.5rem' },
}

export default HistoryPage