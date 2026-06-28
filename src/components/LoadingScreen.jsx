import { useEffect, useState } from 'react'

// ── Page-specific loading configs ─────────────────────────────────────────────
const configs = {
  home: {
    emoji: '🏠',
    color: '#4f46e5',
    lightColor: '#ede9fe',
    title: 'Zennix',
    items: ['🛒 Syncing your list...', '💰 Calculating spend...', '🏠 Loading household...', '📊 Crunching numbers...'],
    type: 'dots',
  },
  list: {
    emoji: null,
    color: '#4f46e5',
    lightColor: '#ede9fe',
    title: 'Loading your list',
    subtitle: 'Fetching items from your household...',
    groceryItems: ['🥛 Doodh', '🧅 Pyaaz', '🍅 Tamatar', '🫙 Tel', '🍚 Chawal', '🧴 Shampoo'],
    type: 'grocery',
  },
  spend: {
    emoji: '📊',
    color: '#4f46e5',
    lightColor: '#ede9fe',
    title: 'Spend Analytics',
    bars: [40, 65, 30, 80, 55, 70, 45],
    type: 'chart',
  },
  history: {
    emoji: '🛒',
    color: '#4f46e5',
    lightColor: '#ede9fe',
    title: 'List History',
    type: 'history',
  },
  fixed: {
    emoji: '📅',
    color: '#f59e0b',
    lightColor: '#fef9c3',
    title: 'Fixed Costs',
    costs: ['🏠 Rent', '⚡ Electricity', '📶 WiFi', '🍳 Cook', '💧 Water'],
    type: 'fixed',
  },
}

// ── Dots loader (Home) ────────────────────────────────────────────────────────
function DotsLoader({ config }) {
  const [dot, setDot] = useState(0)
  const [tipIndex, setTipIndex] = useState(0)

  useEffect(() => {
    const d = setInterval(() => setDot(i => (i + 1) % 4), 400)
    const t = setInterval(() => setTipIndex(i => (i + 1) % config.items.length), 1800)
    return () => { clearInterval(d); clearInterval(t) }
  }, [])

  return (
    <div style={s.page}>
      <div style={s.centerCard}>
        <div style={{ ...s.iconBox, background: config.lightColor }}>
          <span style={s.bigEmoji}>{config.emoji}</span>
        </div>
        <p style={{ ...s.bigTitle, color: config.color }}>{config.title}</p>
        <p style={s.tagline}>Spend together. Stay calm.</p>
        <div style={s.dotsRow}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{
              ...s.dot,
              background: i === dot ? config.color : '#e0e7ff',
              transform: i === dot ? 'scale(1.5)' : 'scale(1)',
            }} />
          ))}
        </div>
        <p style={s.tip}>{config.items[tipIndex]}</p>
      </div>
    </div>
  )
}

// ── Grocery list loader (ListPage) ────────────────────────────────────────────
function GroceryLoader({ config }) {
  const [visible, setVisible] = useState([])
  const [tick, setTick] = useState(false)

  useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < config.groceryItems.length) { setVisible(v => [...v, i]); i++ }
      else clearInterval(timer)
    }, 250)
    const t = setInterval(() => setTick(x => !x), 600)
    return () => { clearInterval(timer); clearInterval(t) }
  }, [])

  return (
    <div style={s.page}>
      <div style={{ ...s.tallCard, width: '75%' }}>
        <p style={s.cardTitle}>{config.title}</p>
        <p style={s.cardSubtitle}>{config.subtitle}</p>
        <div style={s.groceryList}>
          {config.groceryItems.map((item, i) => (
            <div key={i} style={{
              ...s.groceryRow,
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? 'translateX(0)' : 'translateX(-20px)',
              transition: 'all 0.3s ease',
            }}>
              <div style={{
                ...s.checkbox,
                background: visible.includes(i) && i % 3 === 0 ? config.color : '#fff',
                borderColor: visible.includes(i) && i % 3 === 0 ? config.color : '#d1d5db',
              }}>
                {visible.includes(i) && i % 3 === 0 && <span style={{ color: '#fff', fontSize: '0.55rem', fontWeight: '800' }}>✓</span>}
              </div>
              <span style={s.groceryName}>{item}</span>
              <div style={{ ...s.shimmer, width: `${35 + (i * 11) % 28}px` }} />
            </div>
          ))}
        </div>
        <div style={s.dotsRow}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              ...s.dot,
              background: (tick && i === 1) || (!tick && i !== 1) ? config.color : '#e0e7ff',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Chart loader (SpendPage) ──────────────────────────────────────────────────
function ChartLoader({ config }) {
  const [heights, setHeights] = useState(config.bars.map(() => 0))
  const [showDonut, setShowDonut] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => {
      setHeights(config.bars)
      setTimeout(() => setShowDonut(true), 600)
    }, 200)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div style={s.page}>
      <div style={{ ...s.tallCard, width: '78%' }}>
        <div style={{ ...s.iconBox, background: config.lightColor, marginBottom: '0.5rem' }}>
          <span style={s.bigEmoji}>{config.emoji}</span>
        </div>
        <p style={s.cardTitle}>{config.title}</p>

        {/* Bar chart animation */}
        <div style={s.barChart}>
          {heights.map((h, i) => (
            <div key={i} style={s.barWrap}>
              <div style={{
                ...s.bar,
                height: `${h}%`,
                background: i === 3 ? config.color : '#c7d2fe',
                transition: `height ${0.3 + i * 0.08}s ease`,
              }} />
            </div>
          ))}
        </div>

        {/* Donut placeholder */}
        <div style={{ ...s.donutWrap, opacity: showDonut ? 1 : 0, transition: 'opacity 0.4s ease' }}>
          <svg viewBox="0 0 80 80" style={{ width: '70px', height: '70px' }}>
            <circle cx="40" cy="40" r="28" fill="none" stroke="#c7d2fe" strokeWidth="14" />
            <circle cx="40" cy="40" r="28" fill="none" stroke={config.color} strokeWidth="14"
              strokeDasharray="88 88" strokeDashoffset="22" strokeLinecap="round"
              style={{ transition: 'stroke-dasharray 0.8s ease' }} />
            <circle cx="40" cy="40" r="18" fill="#fff" />
          </svg>
          <div style={s.donutLegend}>
            <div style={s.legendRow}><div style={{ ...s.legendDot, background: config.color }} /><span style={s.legendText}>Grocery</span></div>
            <div style={s.legendRow}><div style={{ ...s.legendDot, background: '#f59e0b' }} /><span style={s.legendText}>Fixed</span></div>
          </div>
        </div>

        <div style={s.dotsRow}>
          {[0,1,2].map(i => (
            <div key={i} style={{ ...s.dot, background: i === 1 ? config.color : '#e0e7ff' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── History loader ────────────────────────────────────────────────────────────
function HistoryLoader({ config }) {
  const [cards, setCards] = useState([])
  const mockCards = [
    { date: '24 Jun 2026', amt: '₹840', items: 12 },
    { date: '18 Jun 2026', amt: '₹1,240', items: 18 },
    { date: '11 Jun 2026', amt: '₹960', items: 14 },
  ]

  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      if (i < mockCards.length) { setCards(c => [...c, i]); i++ }
      else clearInterval(t)
    }, 350)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={s.page}>
      <div style={{ ...s.tallCard, width: '78%' }}>
        <div style={{ ...s.iconBox, background: config.lightColor }}>
          <span style={s.bigEmoji}>{config.emoji}</span>
        </div>
        <p style={s.cardTitle}>{config.title}</p>
        <p style={s.cardSubtitle}>Fetching your past lists...</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
          {mockCards.map((card, i) => (
            <div key={i} style={{
              ...s.historyCard,
              opacity: cards.includes(i) ? 1 : 0,
              transform: cards.includes(i) ? 'translateY(0)' : 'translateY(12px)',
              transition: 'all 0.35s ease',
            }}>
              <div style={{ flex: 1 }}>
                <div style={s.shimmerText} />
                <div style={{ ...s.shimmerText, width: '60%', marginTop: '4px' }} />
              </div>
              <div style={{ ...s.shimmerText, width: '45px' }} />
            </div>
          ))}
        </div>

        <div style={{ ...s.dotsRow, marginTop: '1rem' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ ...s.dot, background: i === 1 ? config.color : '#e0e7ff' }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Fixed costs loader ────────────────────────────────────────────────────────
function FixedLoader({ config }) {
  const [visible, setVisible] = useState([])

  useEffect(() => {
    let i = 0
    const t = setInterval(() => {
      if (i < config.costs.length) { setVisible(v => [...v, i]); i++ }
      else clearInterval(t)
    }, 300)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={s.page}>
      <div style={{ ...s.tallCard, width: '78%' }}>
        <div style={{ ...s.iconBox, background: config.lightColor }}>
          <span style={s.bigEmoji}>{config.emoji}</span>
        </div>
        <p style={s.cardTitle}>{config.title}</p>
        <p style={s.cardSubtitle}>Loading your monthly costs...</p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', width: '100%', marginTop: '0.5rem' }}>
          {config.costs.map((cost, i) => (
            <div key={i} style={{
              ...s.fixedCostRow,
              opacity: visible.includes(i) ? 1 : 0,
              transform: visible.includes(i) ? 'translateX(0)' : 'translateX(-16px)',
              transition: 'all 0.3s ease',
            }}>
              <span style={s.fixedCostName}>{cost}</span>
              <div style={{ ...s.shimmer, width: '50px', borderRadius: '999px' }} />
            </div>
          ))}
        </div>

        <div style={{ ...s.dotsRow, marginTop: '1rem' }}>
          {[0,1,2].map(i => (
            <div key={i} style={{ ...s.dot, background: i === 1 ? config.amber : '#fde68a', }} />
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Main export ───────────────────────────────────────────────────────────────
export default function LoadingScreen({ type = 'home' }) {
  const config = configs[type] || configs.home
  if (config.type === 'dots') return <DotsLoader config={config} />
  if (config.type === 'grocery') return <GroceryLoader config={config} />
  if (config.type === 'chart') return <ChartLoader config={config} />
  if (config.type === 'history') return <HistoryLoader config={config} />
  if (config.type === 'fixed') return <FixedLoader config={config} />
  return <DotsLoader config={config} />
}

// ── Shared styles ─────────────────────────────────────────────────────────────
const s = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f3ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'sans-serif',
  },
  centerCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '2.5rem 2rem',
    background: '#fff',
    borderRadius: '24px',
    boxShadow: '0 8px 40px rgba(79,70,229,0.12)',
    width: '75%',
    maxWidth: '320px',
  },
  tallCard: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.6rem',
    padding: '2rem 1.5rem',
    background: '#fff',
    borderRadius: '24px',
    boxShadow: '0 8px 40px rgba(79,70,229,0.12)',
    maxWidth: '340px',
  },
  iconBox: {
    width: '64px',
    height: '64px',
    borderRadius: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bigEmoji: { fontSize: '1.75rem' },
  bigTitle: { fontSize: '1.6rem', fontWeight: '800', margin: 0, letterSpacing: '-0.02em' },
  tagline: { fontSize: '0.82rem', color: '#9ca3af', margin: 0 },
  cardTitle: { fontSize: '1.05rem', fontWeight: '700', color: '#111', margin: 0, textAlign: 'center' },
  cardSubtitle: { fontSize: '0.78rem', color: '#9ca3af', margin: 0, textAlign: 'center' },
  dotsRow: { display: 'flex', gap: '0.45rem', alignItems: 'center', marginTop: '0.5rem' },
  dot: { width: '9px', height: '9px', borderRadius: '50%', transition: 'all 0.3s ease' },
  tip: { fontSize: '0.8rem', color: '#6b7280', margin: 0, textAlign: 'center' },

  // Grocery
  groceryList: { display: 'flex', flexDirection: 'column', gap: '0.55rem', width: '100%', margin: '0.25rem 0' },
  groceryRow: { display: 'flex', alignItems: 'center', gap: '0.6rem' },
  checkbox: { width: '18px', height: '18px', borderRadius: '50%', border: '2px solid #d1d5db', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.3s ease' },
  groceryName: { flex: 1, fontSize: '0.82rem', color: '#374151' },
  shimmer: { height: '7px', background: '#f3f4f6', borderRadius: '4px' },
  shimmerText: { height: '8px', background: '#f3f4f6', borderRadius: '4px', width: '100%' },

  // Chart
  barChart: { display: 'flex', alignItems: 'flex-end', gap: '5px', height: '80px', width: '100%', padding: '0 4px' },
  barWrap: { flex: 1, display: 'flex', alignItems: 'flex-end', height: '100%' },
  bar: { width: '100%', borderRadius: '4px 4px 0 0', minHeight: '4px' },
  donutWrap: { display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' },
  donutLegend: { display: 'flex', flexDirection: 'column', gap: '0.4rem' },
  legendRow: { display: 'flex', alignItems: 'center', gap: '0.4rem' },
  legendDot: { width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0 },
  legendText: { fontSize: '0.75rem', color: '#6b7280' },

  // History
  historyCard: { background: '#f9fafb', borderRadius: '10px', padding: '0.6rem 0.75rem', display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' },

  // Fixed
  fixedCostRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fffbeb', borderRadius: '10px', padding: '0.55rem 0.75rem', width: '100%' },
  fixedCostName: { fontSize: '0.82rem', color: '#374151', fontWeight: '500' },
}