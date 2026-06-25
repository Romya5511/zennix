import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// ── Helpers ──────────────────────────────────────────────────────────────────

function getFirstName(fullName) {
  if (!fullName) return 'Someone'
  return fullName.split(' ')[0]
}

function getMonthLabel(dateStr) {
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' })
}

function getDayLabel(dateStr) {
  return new Date(dateStr).toLocaleDateString('en-IN', { weekday: 'short' })
}

// ── SVG Bar Chart ─────────────────────────────────────────────────────────────
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

// ── SVG Donut Chart ───────────────────────────────────────────────────────────
function DonutChart({ segments }) {
  const total = segments.reduce((s, seg) => s + seg.value, 0)
  if (total === 0) return (
    <svg viewBox="0 0 120 120" style={{ width: '120px', height: '120px' }}>
      <circle cx="60" cy="60" r="45" fill="none" stroke="#e5e7eb" strokeWidth="18" />
      <text x="60" y="65" textAnchor="middle" fontSize="11" fill="#aaa">No data</text>
    </svg>
  )

  const R = 45
  const CX = 60, CY = 60
  let startAngle = -Math.PI / 2
  const paths = segments.map(seg => {
    const angle = (seg.value / total) * 2 * Math.PI
    const endAngle = startAngle + angle
    const x1 = CX + R * Math.cos(startAngle)
    const y1 = CY + R * Math.sin(startAngle)
    const x2 = CX + R * Math.cos(endAngle)
    const y2 = CY + R * Math.sin(endAngle)
    const largeArc = angle > Math.PI ? 1 : 0
    const d = `M ${CX} ${CY} L ${x1} ${y1} A ${R} ${R} 0 ${largeArc} 1 ${x2} ${y2} Z`
    startAngle = endAngle
    return { d, color: seg.color }
  })

  return (
    <svg viewBox="0 0 120 120" style={{ width: '120px', height: '120px' }}>
      {paths.map((p, i) => <path key={i} d={p.d} fill={p.color} />)}
      <circle cx={CX} cy={CY} r="28" fill="#fff" />
      <text x={CX} y={CY - 4} textAnchor="middle" fontSize="10" fill="#111" fontWeight="700">
        ₹{total >= 1000 ? (total / 1000).toFixed(1) + 'k' : Math.round(total)}
      </text>
      <text x={CX} y={CY + 10} textAnchor="middle" fontSize="8" fill="#888">total</text>
    </svg>
  )
}

// ── Month Detail Modal ────────────────────────────────────────────────────────
function MonthDetailModal({ monthLabel, entries, profiles, onClose }) {
  const groceryEntries = entries.filter(e => e.source_type === 'grocery_list')
  const fixedEntries = entries.filter(e => e.source_type === 'fixed_cost')

  const groceryTotal = groceryEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  // Group fixed costs by item_name
  const fixedByName = {}
  fixedEntries.forEach(e => {
    const key = e.item_name
    fixedByName[key] = (fixedByName[key] || 0) + (parseFloat(e.amount) || 0)
  })

  const grandTotal = entries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

  return (
    <div style={modalStyles.overlay} onClick={onClose}>
      <div style={modalStyles.sheet} onClick={e => e.stopPropagation()}>
        <div style={modalStyles.handle} />
        <div style={modalStyles.sheetHeader}>
          <p style={modalStyles.sheetTitle}>{monthLabel} — Breakdown</p>
          <button style={modalStyles.closeBtn} onClick={onClose}>✕</button>
        </div>

        <p style={modalStyles.grandTotal}>₹{grandTotal.toFixed(2)} total</p>

        {/* Grocery section */}
        <div style={modalStyles.section}>
          <div style={modalStyles.sectionHeader}>
            <span style={modalStyles.sectionIcon}>🛒</span>
            <span style={modalStyles.sectionName}>Grocery</span>
            <span style={modalStyles.sectionTotal}>₹{groceryTotal.toFixed(2)}</span>
          </div>
          {groceryEntries.length === 0 ? (
            <p style={modalStyles.emptyNote}>No grocery spend this month</p>
          ) : (
            groceryEntries.slice(0, 8).map(e => (
              <div key={e.id} style={modalStyles.itemRow}>
                <span style={modalStyles.itemName}>{e.item_name}</span>
                <span style={modalStyles.itemAmount}>₹{parseFloat(e.amount || 0).toFixed(2)}</span>
              </div>
            ))
          )}
          {groceryEntries.length > 8 && (
            <p style={modalStyles.moreNote}>+{groceryEntries.length - 8} more items</p>
          )}
        </div>

        {/* Fixed costs section */}
        {Object.keys(fixedByName).length > 0 && (
          <div style={modalStyles.section}>
            <div style={modalStyles.sectionHeader}>
              <span style={modalStyles.sectionIcon}>📅</span>
              <span style={modalStyles.sectionName}>Fixed Costs</span>
              <span style={modalStyles.sectionTotal}>
                ₹{fixedEntries.reduce((s, e) => s + (parseFloat(e.amount) || 0), 0).toFixed(2)}
              </span>
            </div>
            {Object.entries(fixedByName).map(([name, total]) => (
              <div key={name} style={modalStyles.itemRow}>
                <span style={modalStyles.itemName}>{name}</span>
                <span style={modalStyles.itemAmount}>₹{total.toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main SpendPage ────────────────────────────────────────────────────────────
function SpendPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('week') // 'week' | 'month'
  const [entries, setEntries] = useState([])
  const [profiles, setProfiles] = useState({})
  const [selectedMonth, setSelectedMonth] = useState(null) // { label, entries }
  const [highlightBar, setHighlightBar] = useState(null)

  useEffect(() => { loadSpend() }, [])

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

    // Load last 12 months of data
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

  // ── Week data ──────────────────────────────────────────────────────────────
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
        date: d,
      }
    })

    const weekEntries = entries.filter(e => new Date(e.bought_at) >= monday)
    const grocery = weekEntries.filter(e => e.source_type === 'grocery_list')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const fixed = weekEntries.filter(e => e.source_type === 'fixed_cost')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)

    const perPerson = {}
    weekEntries.forEach(e => {
      if (!e.bought_by) return
      perPerson[e.bought_by] = (perPerson[e.bought_by] || 0) + (parseFloat(e.amount) || 0)
    })

    return { bars, grocery, fixed, perPerson, total: grocery + fixed }
  }

  // ── Month data ─────────────────────────────────────────────────────────────
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
        monthStart: d,
        fullLabel: d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' }),
      }
    })

    // Current month stats for donut + per person
    const curMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const curEntries = entries.filter(e => {
      const t = new Date(e.bought_at)
      return t >= curMonth && t < nextMonth
    })
    const grocery = curEntries.filter(e => e.source_type === 'grocery_list')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const fixed = curEntries.filter(e => e.source_type === 'fixed_cost')
      .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0)
    const perPerson = {}
    curEntries.forEach(e => {
      if (!e.bought_by) return
      perPerson[e.bought_by] = (perPerson[e.bought_by] || 0) + (parseFloat(e.amount) || 0)
    })

    return { bars, grocery, fixed, perPerson, total: grocery + fixed }
  }

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.header}>
          <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
          <h1 style={styles.title}>Spend Analytics</h1>
        </div>
        <p style={styles.loadingText}>Loading your spend data...</p>
      </div>
    )
  }

  const weekData = getWeekData()
  const monthData = getMonthData()
  const data = view === 'week' ? weekData : monthData

  const donutSegments = [
    { label: 'Grocery', value: data.grocery, color: '#4f46e5' },
    { label: 'Fixed', value: data.fixed, color: '#f59e0b' },
  ]

  const maxPerson = Math.max(...Object.values(data.perPerson), 1)

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 style={styles.title}>Spend Analytics</h1>
      </div>

      <div style={styles.content}>

        {/* Toggle */}
        <div style={styles.toggle}>
          <button
            style={view === 'week' ? { ...styles.toggleBtn, ...styles.toggleBtnActive } : styles.toggleBtn}
            onClick={() => { setView('week'); setHighlightBar(null) }}
          >
            This Week
          </button>
          <button
            style={view === 'month' ? { ...styles.toggleBtn, ...styles.toggleBtnActive } : styles.toggleBtn}
            onClick={() => { setView('month'); setHighlightBar(null) }}
          >
            Monthly
          </button>
        </div>

        {/* Total summary */}
        <div style={styles.summaryCard}>
          <p style={styles.summaryLabel}>
            {view === 'week' ? 'This week' : 'This month'}
          </p>
          <p style={styles.summaryTotal}>₹{data.total.toFixed(2)}</p>
        </div>

        {/* Bar chart card */}
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

        {/* Donut + legend card */}
        <div style={styles.card}>
          <p style={styles.cardTitle}>Grocery vs Fixed</p>
          <div style={styles.donutRow}>
            <DonutChart segments={donutSegments} />
            <div style={styles.legend}>
              {donutSegments.map(seg => (
                <div key={seg.label} style={styles.legendItem}>
                  <div style={{ ...styles.legendDot, background: seg.color }} />
                  <div>
                    <p style={styles.legendLabel}>{seg.label}</p>
                    <p style={styles.legendAmount}>₹{seg.value.toFixed(2)}</p>
                    {data.total > 0 && (
                      <p style={styles.legendPct}>
                        {Math.round((seg.value / data.total) * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Per-person card */}
        {Object.keys(data.perPerson).length > 0 && (
          <div style={styles.card}>
            <p style={styles.cardTitle}>By Person</p>
            {Object.entries(data.perPerson).map(([uid, total]) => (
              <div key={uid} style={styles.personRow}>
                <span style={styles.personName}>{getFirstName(profiles[uid])}</span>
                <div style={styles.personBarWrap}>
                  <div
                    style={{
                      ...styles.personBar,
                      width: `${Math.round((total / maxPerson) * 100)}%`,
                    }}
                  />
                </div>
                <span style={styles.personAmt}>₹{total.toFixed(0)}</span>
              </div>
            ))}
          </div>
        )}

        {/* All entries list */}
        {entries.length === 0 && (
          <div style={styles.emptyCard}>
            <p style={styles.emptyIcon}>🧾</p>
            <p style={styles.emptyText}>No spend recorded yet.</p>
            <p style={styles.emptySubText}>Complete a grocery list or log a fixed cost to see it here.</p>
          </div>
        )}

      </div>

      {/* Month detail modal */}
      {selectedMonth && (
        <MonthDetailModal
          monthLabel={selectedMonth.label}
          entries={selectedMonth.entries}
          profiles={profiles}
          onClose={() => { setSelectedMonth(null); setHighlightBar(null) }}
        />
      )}

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

  donutRow: { display: 'flex', alignItems: 'center', gap: '1.5rem' },
  legend: { display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 },
  legendItem: { display: 'flex', alignItems: 'flex-start', gap: '0.6rem' },
  legendDot: { width: '10px', height: '10px', borderRadius: '50%', marginTop: '3px', flexShrink: 0 },
  legendLabel: { fontSize: '0.85rem', fontWeight: '600', color: '#111', margin: 0 },
  legendAmount: { fontSize: '0.95rem', fontWeight: '700', color: '#111', margin: 0 },
  legendPct: { fontSize: '0.75rem', color: '#9ca3af', margin: 0 },

  personRow: { display: 'flex', alignItems: 'center', gap: '0.75rem' },
  personName: { fontSize: '0.875rem', fontWeight: '600', color: '#111', width: '60px', flexShrink: 0 },
  personBarWrap: { flex: 1, background: '#f3f4f6', borderRadius: '999px', height: '10px', overflow: 'hidden' },
  personBar: { height: '10px', background: '#4f46e5', borderRadius: '999px', transition: 'width 0.4s ease' },
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
  moreNote: { fontSize: '0.75rem', color: '#9ca3af', margin: '0.5rem 0 0', textAlign: 'right' },
}

export default SpendPage