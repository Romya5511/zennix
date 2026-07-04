import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import BottomNav from '../components/BottomNav'
import LoadingScreen from '../components/LoadingScreen'
import SettlingNumber from '../components/SettlingNumber'

function getFirstName(fullName) {
  if (!fullName) return 'Someone'
  return fullName.split(' ')[0]
}

function formatEntryDate(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

// Single source of truth for how every category looks across the app —
// kept in sync with QuickLogGrid.jsx and HistoryPage.jsx so a category is
// always the same color/icon everywhere the user sees it.
const CATEGORY_META = {
  'Grocery': { color: '#4f46e5', icon: '🛒' },
  'Fixed Costs': { color: '#f59e0b', icon: '📅' },
  'Food Delivery': { color: '#E85D3E', icon: '🍔' },
  'Transport': { color: '#1E9E8F', icon: '🚕' },
  'Online Shopping': { color: '#7C4FE0', icon: '🛍️' },
  'Fruits & Vegetables': { color: '#3F9142', icon: '🥦' },
  'Entertainment': { color: '#C98A0A', icon: '🎬' },
  'Medical': { color: '#D14C79', icon: '💊' },
}
const FALLBACK_META = { color: '#6b7280', icon: '💸' }

function categoryOf(entry) {
  // category column is backfilled for all existing rows and always written
  // for new ones (see Day 16 migration) — this fallback only guards against
  // any future row that somehow lands without one.
  if (entry.category) return entry.category
  if (entry.source_type === 'grocery_list') return 'Grocery'
  if (entry.source_type === 'fixed_cost') return 'Fixed Costs'
  return 'Other'
}

function BarChart({ bars, onBarClick, highlightIndex }) {
  const W = 320
  const H = 140
  const PADDING = { top: 16, bottom: 32, left: 8, right: 8 }
  const chartW = W - PADDING.left - PADDING.right
  const chartH = H - PADDING.top - PADDING.bottom
  const maxVal = Math.max(...bars.map(b => b.value), 1)
  const barW = Math.floor(chartW / bars.length) - 3

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', display: 'block' }}>
      {bars.map((bar, i) => {
        const barH = Math.max(2, (bar.value / maxVal) * chartH)
        const x = PADDING.left + i * (chartW / bars.length) + 2
        const y = PADDING.top + chartH - barH
        const isHighlight = highlightIndex === i
        return (
          <g key={i} onClick={() => onBarClick && onBarClick(i)} style={{ cursor: onBarClick ? 'pointer' : 'default' }}>
            <rect
              x={x} y={y}
              width={barW} height={barH}
              rx={4}
              fill={isHighlight ? '#4f46e5' : bar.value > 0 ? '#a5b4fc' : '#e5e7eb'}
            />
            <text
              x={x + barW / 2}
              y={H - 6}
              textAnchor="middle"
              fontSize={bars.length > 8 ? '7' : '9'}
              fill={isHighlight ? '#4f46e5' : '#9ca3af'}
              fontWeight={isHighlight ? '700' : '400'}
            >
              {bar.label}
            </text>
            {bar.value > 0 && isHighlight && (
              <text
                x={x + barW / 2}
                y={y - 4}
                textAnchor="middle"
                fontSize="8"
                fill="#4f46e5"
                fontWeight="700"
              >
                ₹{bar.value >= 1000 ? (bar.value / 1000).toFixed(1) + 'k' : Math.round(bar.value)}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

// NEW — Day 16: replaces the old 2-slice DonutChart. Shows every category
// (Grocery, Fixed Costs, and each Quick Log category) as an animated
// horizontal bar, sorted highest to lowest. Tapping a row expands it
// in place to show the individual entries that made up that total —
// this is what actually answers "what did we spend it on."
function CategoryBreakdown({ categories, total, profiles, expandedCat, onToggle, animateIn }) {
  if (categories.length === 0) {
    return <p style={styles.cardHint}>No spend recorded in this period yet.</p>
  }

  return (
    <div style={styles.categoryList}>
      {categories.map((cat, i) => {
        const meta = CATEGORY_META[cat.name] || FALLBACK_META
        const pct = total > 0 ? Math.round((cat.total / total) * 100) : 0
        const isOpen = expandedCat === cat.name
        return (
          <div key={cat.name} style={styles.categoryBlock}>
            <button
              style={styles.categoryRow}
              onClick={() => onToggle(cat.name)}
            >
              <span style={{ ...styles.categoryIconWrap, background: `${meta.color}1A` }}>
                {meta.icon}
              </span>
              <div style={styles.categoryMid}>
                <div style={styles.categoryTopLine}>
                  <span style={styles.categoryName}>{cat.name}</span>
                  <span style={styles.categoryAmt}>₹{cat.total.toFixed(0)}</span>
                </div>
                <div style={styles.categoryBarTrack}>
                  <div
                    style={{
                      ...styles.categoryBarFill,
                      background: meta.color,
                      width: animateIn ? `${pct}%` : '0%',
                      transitionDelay: `${i * 60}ms`,
                    }}
                  />
                </div>
              </div>
              <span style={styles.categoryChevron}>{isOpen ? '▲' : '▼'}</span>
            </button>

            {isOpen && (
              <div style={styles.categoryEntries}>
                {cat.entries
                  .slice()
                  .sort((a, b) => new Date(b.bought_at) - new Date(a.bought_at))
                  .map(entry => (
                    <div key={entry.id} style={styles.categoryEntryRow}>
                      <span style={styles.categoryEntryName}>
                        {cat.name === entry.item_name ? formatEntryDate(entry.bought_at) : entry.item_name}
                      </span>
                      <span style={styles.categoryEntryMeta}>
                        {cat.name !== entry.item_name ? formatEntryDate(entry.bought_at) + ' · ' : ''}
                        {getFirstName(profiles[entry.bought_by])}
                      </span>
                      <span style={{ ...styles.categoryEntryAmt, color: meta.color }}>
                        ₹{parseFloat(entry.amount || 0).toFixed(2)}
                      </span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function MonthDetailModal({ monthLabel, entries, profiles, onClose }) {
  const groceryEntries = entries.filter(e => categoryOf(e) === 'Grocery')
  const fixedEntries = entries.filter(e => categoryOf(e) === 'Fixed Costs')
  const groceryTotal = groceryEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const fixedTotal = fixedEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
  const grandTotal = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  // Group fixed costs by name
  const fixedByName = {}
  fixedEntries.forEach(e => {
    fixedByName[e.item_name] = (fixedByName[e.item_name] || 0) + (parseFloat(e.amount) || 0)
  })

  // Group grocery by item name and sum
  const groceryByName = {}
  groceryEntries.forEach(e => {
    groceryByName[e.item_name] = (groceryByName[e.item_name] || 0) + (parseFloat(e.amount) || 0)
  })
  const grocerySorted = Object.entries(groceryByName).sort((a, b) => b[1] - a[1])

  // NEW — Day 16: every Quick Log category present this month, each its
  // own section listing individual entries (grouping by name doesn't make
  // sense here since every entry in a category shares the same item_name).
  const quickLogCategoryNames = Object.keys(CATEGORY_META).filter(
    name => name !== 'Grocery' && name !== 'Fixed Costs'
  )
  const quickLogSections = quickLogCategoryNames
    .map(name => {
      const catEntries = entries.filter(e => categoryOf(e) === name)
      const total = catEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      return { name, entries: catEntries, total }
    })
    .filter(s => s.entries.length > 0)
    .sort((a, b) => b.total - a.total)

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.sheet} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.handle} />
        <div style={modalStyles.sheetHeader}>
          <p style={modalStyles.sheetTitle}>{monthLabel}</p>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p style={modalStyles.grandTotal}>₹{grandTotal.toFixed(2)} total</p>

        {/* Fixed costs section */}
        {Object.keys(fixedByName).length > 0 && (
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionHeader}>
              <span style={modalStyles.sectionIcon}>📅</span>
              <span style={modalStyles.sectionName}>Fixed Costs</span>
              <span style={modalStyles.sectionTotal}>₹{fixedTotal.toFixed(2)}</span>
            </div>
            {Object.entries(fixedByName).map(([name, total]) => (
              <div key={name} style={modalStyles.itemRow}>
                <span style={modalStyles.itemName}>{name}</span>
                <span style={modalStyles.itemAmount}>₹{total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Grocery section — ALL items, grouped by name */}
        <div style={modalStyles.section}>
          <div style={modalStyles.sectionHeader}>
            <span style={modalStyles.sectionIcon}>🛒</span>
            <span style={modalStyles.sectionName}>Grocery</span>
            <span style={modalStyles.sectionTotal}>₹{groceryTotal.toFixed(2)}</span>
          </div>
          {grocerySorted.length === 0 ? (
            <p style={modalStyles.emptyNote}>No grocery spend this month</p>
          ) : (
            grocerySorted.map(([name, total]) => (
              <div key={name} style={modalStyles.itemRow}>
                <span style={modalStyles.itemName}>{name}</span>
                <span style={modalStyles.itemAmount}>₹{total.toFixed(2)}</span>
              </div>
            ))
          )}
        </div>

        {/* NEW — Day 16: Quick Log category sections */}
        {quickLogSections.map(section => {
          const meta = CATEGORY_META[section.name] || FALLBACK_META
          return (
            <div key={section.name} style={modalStyles.section}>
              <div style={modalStyles.sectionHeader}>
                <span style={modalStyles.sectionIcon}>{meta.icon}</span>
                <span style={modalStyles.sectionName}>{section.name}</span>
                <span style={modalStyles.sectionTotal}>₹{section.total.toFixed(2)}</span>
              </div>
              {section.entries
                .slice()
                .sort((a, b) => new Date(b.bought_at) - new Date(a.bought_at))
                .map(entry => (
                  <div key={entry.id} style={modalStyles.itemRow}>
                    <span style={modalStyles.itemName}>
                      {formatEntryDate(entry.bought_at)} · {getFirstName(profiles[entry.bought_by])}
                    </span>
                    <span style={modalStyles.itemAmount}>₹{parseFloat(entry.amount || 0).toFixed(2)}</span>
                  </div>
                ))}
            </div>
          )
        })}

      </div>
    </div>
  )
}

function SpendPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('week')
  const [entries, setEntries] = useState([])
  const [profiles, setProfiles] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(null)
  const [highlightBar, setHighlightBar] = useState(null)
  const [expandedCat, setExpandedCat] = useState(null)
  const [animateIn, setAnimateIn] = useState(false)

  useEffect(() => { loadSpend() }, [])

  // NEW — Day 16: trigger the bar-fill animation shortly after data loads
  // (and whenever the week/month toggle changes), so bars visibly grow
  // in rather than appearing instantly — the "wow" motion cue.
  useEffect(() => {
    if (loading) return
    setAnimateIn(false)
    const t = setTimeout(() => setAnimateIn(true), 50)
    return () => clearTimeout(t)
  }, [loading, view])

  async function loadSpend() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!membership) { navigate('/'); return }
    const hid = membership.household_id

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

    const since = new Date()
    since.setMonth(since.getMonth() - 11)
    since.setDate(1)
    since.setHours(0, 0, 0, 0)

    const { data: bucketEntries } = await supabase
      .from('household_bucket')
      .select('*')
      .eq('household_id', hid)
      .gte('bought_at', since.toISOString())
      .order('bought_at', { ascending: true })

    setEntries(bucketEntries || [])
    setLoading(false)
  }

  // NEW — Day 16: build the sorted category breakdown for a given set of
  // entries. Used by both the week and month views.
  function buildCategoryBreakdown(periodEntries) {
    const byCategory = {}
    periodEntries.forEach(e => {
      const name = categoryOf(e)
      if (!byCategory[name]) byCategory[name] = { name, total: 0, entries: [] }
      byCategory[name].total += parseFloat(e.amount) || 0
      byCategory[name].entries.push(e)
    })
    return Object.values(byCategory).sort((a, b) => b.total - a.total)
  }

  function getWeekData() {
    const now = new Date()
    const day = now.getDay()
    const diffToMon = day === 0 ? -6 : 1 - day
    const monday = new Date(now)
    monday.setDate(now.getDate() + diffToMon)
    monday.setHours(0, 0, 0, 0)

    const days = []
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      days.push(d)
    }

    const bars = days.map(d => {
      const nextD = new Date(d); nextD.setDate(d.getDate() + 1)
      const total = entries
        .filter(e => new Date(e.bought_at) >= d && new Date(e.bought_at) < nextD)
        .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      return {
        label: d.toLocaleDateString('en-IN', { weekday: 'short' }).slice(0, 3),
        value: total,
      }
    })

    const weekEntries = entries.filter(e => new Date(e.bought_at) >= monday)
    const perPerson = {}
    weekEntries.forEach(e => {
      if (!e.bought_by) return
      perPerson[e.bought_by] = (perPerson[e.bought_by] || 0) + (parseFloat(e.amount) || 0)
    })
    // FIX — Day 16: total now sums every entry in the period, not just
    // grocery + fixed. Previously Quick Log spend was silently excluded
    // from this number.
    const total = weekEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

    return { bars, perPerson, total, categories: buildCategoryBreakdown(weekEntries) }
  }

  function getMonthData() {
    const now = new Date()
    const months = []
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      months.push(d)
    }

    const bars = months.map(d => {
      const nextM = new Date(d.getFullYear(), d.getMonth() + 1, 1)
      const monthEntries = entries.filter(e => {
        const t = new Date(e.bought_at)
        return t >= d && t < nextM
      })
      const total = monthEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
      return {
        label: d.toLocaleDateString('en-IN', { month: 'short' }).slice(0, 3),
        value: total,
        monthEntries,
        fullLabel: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      }
    })

    const curMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const curEntries = entries.filter(e => {
      const t = new Date(e.bought_at)
      return t >= curMonth && t < nextMonth
    })
    const perPerson = {}
    curEntries.forEach(e => {
      if (!e.bought_by) return
      perPerson[e.bought_by] = (perPerson[e.bought_by] || 0) + (parseFloat(e.amount) || 0)
    })
    // FIX — Day 16: same total fix as getWeekData().
    const total = curEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

    return { bars, perPerson, total, categories: buildCategoryBreakdown(curEntries) }
  }

  if (loading) return <LoadingScreen type="spend" />

  const weekData = getWeekData()
  const monthData = getMonthData()
  const data = view === 'week' ? weekData : monthData

  const maxPerson = Math.max(...Object.values(data.perPerson), 1)

  return (
    <div style={styles.page}>

      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 style={styles.title}>Spend Analytics</h1>
      </div>

      <div style={styles.content}>

        {/* Toggle */}
        <div style={styles.toggle}>
          <button
            style={view === 'week' ? { ...styles.toggleBtn, ...styles.toggleBtnActive } : styles.toggleBtn}
            onClick={() => { setView('week'); setHighlightBar(null); setExpandedCat(null) }}
          >
            This Week
          </button>
          <button
            style={view === 'month' ? { ...styles.toggleBtn, ...styles.toggleBtnActive } : styles.toggleBtn}
            onClick={() => { setView('month'); setHighlightBar(null); setExpandedCat(null) }}
          >
            Monthly
          </button>
        </div>

        {/* Total summary */}
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>
            {view === 'week' ? 'This week' : 'This month'}
          </p>
          <p style={styles.summaryTotal}><SettlingNumber value={data.total} decimals={2} /></p>
        </div>

        {/* Bar chart */}
        <div style={styles.card}>
          <p style={styles.cardTitle}>
            {view === 'week' ? 'Daily Spend (This Week)' : 'Monthly Spend (Last 12 Months)'}
          </p>
          {view === 'month' && (
            <p style={styles.cardHint}>Tap a bar to see that month's breakdown</p>
          )}
          <BarChart
            bars={view === 'week' ? weekData.bars : monthData.bars}
            highlightIndex={highlightBar}
            onBarClick={view === 'month' ? (i) => {
              const bar = monthData.bars[i]
              if (bar.value > 0) {
                setHighlightBar(i)
                setSelectedMonth({ label: bar.fullLabel, entries: bar.monthEntries })
              }
            } : null}
          />
        </div>

        {/* NEW — Day 16: full category breakdown replacing the old
            2-slice "Grocery vs Fixed" donut. Grocery, Fixed Costs, and
            every Quick Log category shown as peers, tap to drill in. */}
        <div style={styles.card}>
          <p style={styles.cardTitle}>Spend by Category</p>
          <p style={styles.cardHint}>Tap a category to see what made it up</p>
          <CategoryBreakdown
            categories={data.categories}
            total={data.total}
            profiles={profiles}
            expandedCat={expandedCat}
            onToggle={(name) => setExpandedCat(prev => prev === name ? null : name)}
            animateIn={animateIn}
          />
        </div>

        {/* Per-person */}
        {Object.keys(data.perPerson).length > 0 && (
          <div style={styles.card}>
            <p style={styles.cardTitle}>By Person</p>
            {Object.entries(data.perPerson).map(([uid, total]) => (
              <div key={uid} style={styles.personRow}>
                <span style={styles.personName}>{getFirstName(profiles[uid])}</span>
                <div style={styles.personBarWrap}>
                  <div style={{ ...styles.personBar, width: animateIn ? `${Math.round((total / maxPerson) * 100)}%` : '0%' }} />
                </div>
                <span style={styles.personAmt}>₹{total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        {entries.length === 0 && (
          <div style={styles.emptyCard}>
            <p style={styles.emptyIcon}>🧾</p>
            <p style={styles.emptyText}>No spend recorded yet.</p>
            <p style={styles.emptySubText}>Complete a grocery list, log a fixed cost, or Quick Log a spend to see it here.</p>
          </div>
        )}

      </div>

      {selectedMonth && (
        <MonthDetailModal
          monthLabel={selectedMonth.label}
          entries={selectedMonth.entries}
          profiles={profiles}
          onClose={() => { setSelectedMonth(null); setHighlightBar(null) }}
        />
      )}

      <div style={{ height: '80px' }} />
      <BottomNav />

    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', paddingBottom: '2rem' },
  loadingText: { padding: '2rem', color: '#888', textAlign: 'center' },
  header: { display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1rem 0.75rem', background: '#fff', borderBottom: '1px solid #f3f4f6' },
  backBtn: { background: 'none', border: 'none', fontSize: '0.95rem', color: '#4f46e5', cursor: 'pointer', padding: 0, fontWeight: '600' },
  title: { fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111' },
  content: { maxWidth: '480px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' },

  toggle: { display: 'flex', background: '#f3f4f6', borderRadius: '12px', padding: '4px', gap: '4px' },
  toggleBtn: { flex: 1, padding: '0.6rem', fontSize: '0.9rem', fontWeight: '600', border: 'none', borderRadius: '9px', background: 'none', color: '#888', cursor: 'pointer' },
  toggleBtnActive: { background: '#fff', color: '#4f46e5', boxShadow: '0 1px 4px rgba(0,0,0,0.1)' },

  summaryCard: { background: '#4f46e5', borderRadius: '16px', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.2rem' },
  summaryLabel: { fontSize: '0.8rem', fontWeight: '700', color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: 0 },
  summaryTotal: { fontSize: '2rem', fontWeight: '800', color: '#fff', margin: 0 },

  card: { background: '#fff', borderRadius: '16px', padding: '1.25rem', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: '0.75rem' },
  cardTitle: { fontSize: '0.85rem', fontWeight: '700', color: '#111', margin: 0 },
  cardHint: { fontSize: '0.75rem', color: '#9ca3af', margin: '-0.5rem 0 0' },

  categoryList: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  categoryBlock: { borderBottom: '1px solid #f3f4f6', paddingBottom: '0.5rem' },
  categoryRow: {
    width: '100%', display: 'flex', alignItems: 'center', gap: '0.65rem',
    background: 'none', border: 'none', padding: '0.4rem 0', cursor: 'pointer', textAlign: 'left',
  },
  categoryIconWrap: {
    width: '34px', height: '34px', borderRadius: '50%', display: 'flex',
    alignItems: 'center', justifyContent: 'center', fontSize: '1rem', flexShrink: 0,
  },
  categoryMid: { flex: 1, display: 'flex', flexDirection: 'column', gap: '0.3rem', minWidth: 0 },
  categoryTopLine: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  categoryName: { fontSize: '0.85rem', fontWeight: '600', color: '#111' },
  categoryAmt: { fontSize: '0.85rem', fontWeight: '700', color: '#111' },
  categoryBarTrack: { background: '#f3f4f6', borderRadius: '999px', height: '6px', overflow: 'hidden' },
  categoryBarFill: { height: '6px', borderRadius: '999px', transition: 'width 0.6s ease' },
  categoryChevron: { fontSize: '0.65rem', color: '#9ca3af', flexShrink: 0 },
  categoryEntries: { paddingLeft: '2.7rem', display: 'flex', flexDirection: 'column', gap: '0.35rem', marginTop: '0.3rem' },
  categoryEntryRow: { display: 'flex', alignItems: 'center', gap: '0.5rem' },
  categoryEntryName: { flex: 1, fontSize: '0.78rem', color: '#444' },
  categoryEntryMeta: { fontSize: '0.72rem', color: '#9ca3af' },
  categoryEntryAmt: { fontSize: '0.78rem', fontWeight: '700', flexShrink: 0 },

  personRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  personName: { fontSize: '0.875rem', fontWeight: '600', color: '#111', width: '60px', flexShrink: 0 },
  personBarWrap: { flex: 1, background: '#f3f4f6', borderRadius: '999px', height: '10px', overflow: 'hidden' },
  personBar: { height: '10px', background: '#4f46e5', borderRadius: '999px', transition: 'width 0.6s ease' },
  personAmt: { fontSize: '0.875rem', fontWeight: '700', color: '#4f46e5', width: '60px', textAlign: 'right', flexShrink: 0 },

  emptyCard: { background: '#fff', borderRadius: '16px', padding: '2rem 1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' },
  emptyIcon: { fontSize: '2rem', margin: 0 },
  emptyText: { fontSize: '1rem', fontWeight: '600', color: '#111', margin: 0 },
  emptySubText: { fontSize: '0.875rem', color: '#888', margin: 0, lineHeight: '1.5' },
}

const modalStyles = {
  overlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' },
  sheet: { background: '#fff', borderRadius: '20px 20px 0 0', padding: '0.75rem 1.25rem 2.5rem', width: '100%', maxWidth: '480px', maxHeight: '80vh', overflowY: 'auto', boxShadow: '0 -4px 24px rgba(0,0,0,0.15)' },
  handle: { width: '40px', height: '4px', background: '#e5e7eb', borderRadius: '999px', margin: '0 auto 1rem' },
  sheetHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' },
  sheetTitle: { fontSize: '1rem', fontWeight: '700', color: '#111', margin: 0 },
  closeBtn: { background: 'none', border: 'none', fontSize: '1.1rem', color: '#aaa', cursor: 'pointer' },
  grandTotal: { fontSize: '1.75rem', fontWeight: '800', color: '#111', margin: '0 0 1.25rem' },
  section: { marginBottom: '1.25rem' },
  sectionHeader: { display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: '1px solid #f3f4f6' },
  sectionIcon: { fontSize: '1rem' },
  sectionName: { flex: 1, fontSize: '0.9rem', fontWeight: '700', color: '#111' },
  sectionTotal: { fontSize: '0.9rem', fontWeight: '700', color: '#4f46e5' },
  itemRow: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.4rem 0', borderBottom: '1px solid #f9fafb' },
  itemName: { fontSize: '0.875rem', color: '#444' },
  itemAmount: { fontSize: '0.875rem', fontWeight: '600', color: '#111' },
  emptyNote: { fontSize: '0.8rem', color: '#aaa', margin: 0 },
}

export default SpendPage