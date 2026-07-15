import { useNavigate, useLocation } from 'react-router-dom'
import { Home as HomeIcon, Calendar, BarChart3, History as HistoryIcon, Settings as SettingsIcon } from 'lucide-react'

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  // NEW — Stage 2 of the design pass: real vector icons instead of emoji.
  // One deliberate correction along the way: History was previously shown
  // with 🛒 (a shopping-cart emoji, which never actually matched "History"
  // as a concept — it was really just borrowed from the grocery flow).
  // Lucide's own History icon (clock with a rewind arrow) is the
  // semantically correct choice here, not just a re-skin.
  const tabs = [
    { label: 'Home', Icon: HomeIcon, route: '/' },
    { label: 'Fixed Costs', Icon: Calendar, route: '/fixed-costs' },
    { label: 'Spend', Icon: BarChart3, route: '/spend' },
    { label: 'History', Icon: HistoryIcon, route: '/history' },
    { label: 'Settings', Icon: SettingsIcon, route: '/settings' },
  ]

  // Keeps the browser history stack shallow so the back button behaves
  // predictably: one back from ANY tab returns to Home, and one more back
  // from Home exits the app — instead of unwinding every tab visited in
  // order (Settings → History → Spend → Home → exit).
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
        const Icon = tab.Icon
        return (
          <button
            key={tab.route}
            style={styles.tab}
            onClick={() => goToTab(tab.route)}
          >
            <Icon
              size={22}
              strokeWidth={isActive ? 2.4 : 2}
              color={isActive ? '#4f46e5' : '#9ca3af'}
            />
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
    gap: '0.25rem',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '0.25rem 0.1rem',
    position: 'relative',
    transition: 'transform 0.1s ease',
  },
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