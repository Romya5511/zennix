import { useNavigate, useLocation } from 'react-router-dom'

function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  const tabs = [
    { label: 'Home', icon: '🏠', route: '/' },
    { label: 'History', icon: '🛒', route: '/history' },
    { label: 'Fixed', icon: '📅', route: '/fixed-costs' },
    { label: 'Spend', icon: '📊', route: '/spend' },
  ]

  return (
    <div style={styles.nav}>
      {tabs.map(tab => {
        const isActive = path === tab.route
        return (
          <button
            key={tab.route}
            style={styles.tab}
            onClick={() => navigate(tab.route)}
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
    padding: '0.25rem 0',
    position: 'relative',
  },
  icon: { fontSize: '1.35rem' },
  label: { fontSize: '0.7rem' },
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