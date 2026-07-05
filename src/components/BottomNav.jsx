import { useNavigate, useLocation } from 'react-router-dom'

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  const tabs = [
    { label: 'Home', icon: '🏠', route: '/' },
    { label: 'Fixed Costs', icon: '📅', route: '/fixed-costs' },
    { label: 'Spend', icon: '📊', route: '/spend' },
    { label: 'History', icon: '🛒', route: '/history' },
    // NEW — Day 17: Settings tab, added at the end of the nav per the plan.
    { label: 'Settings', icon: '⚙️', route: '/settings' },
  ]

  // NEW — keeps the browser history stack shallow so the back button
  // behaves predictably: one back from ANY tab returns to Home, and one
  // more back from Home exits the app — instead of unwinding every tab
  // you've visited in order (Settings → History → Spend → Home → exit).
  //
  // How: Home is always the one "anchor" entry at the bottom of the
  // stack. Leaving Home pushes a single new entry. Switching between two
  // non-Home tabs replaces that same entry instead of stacking a new one.
  // Returning to Home goes back one step (collapsing the stacked entry)
  // rather than pushing yet another entry on top.
  //
  // Caveat: this assumes normal in-app navigation starting from Home
  // (true for typical use, and for how login/setup redirects work in this
  // app). If someone opens a non-Home page directly via a bookmark or
  // deep link, the very first back-tap's behavior may vary slightly.
  function goToTab(route) {
    if (route === path) return

    if (path === '/') {
      navigate(route) // leaving Home — push the one stacked entry
    } else if (route === '/') {
      navigate(-1) // returning to Home — collapse the stacked entry
    } else {
      navigate(route, { replace: true }) // switching between two non-Home tabs
    }
  }

  return (
    <div style={styles.nav}>
      {tabs.map(tab => {
        const isActive = path === tab.route
        return (
          <button
            key={tab.route}
            style={styles.tab}
            onClick={() => goToTab(tab.route)}
          >
            <span style={styles.icon}>{tab.icon}</span>
            <span style={{
              ...styles.label,
              color: isActive ? '#4f46e5' : '#9ca3af',
              fontWeight: isActive ? '700' : '500',
            }}>
              {tab.label}
            </span>
            {isActive && <div style={styles.activeDot} />}
          </button>
        )
      })}
    </div>
  )
}

const styles = {
  nav: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-around',
    padding: '0.5rem 0 0.75rem',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
    zIndex: 100,
  },
  tab: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.2rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem 0.1rem',
    position: 'relative',
  },
  icon: { fontSize: '1.35rem' },
  label: { fontSize: '0.62rem', textAlign: 'center', lineHeight: '1.2' },
  activeDot: {
    position: 'absolute',
    bottom: '-0.5rem',
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    background: '#4f46e5',
  },
}

export default BottomNav