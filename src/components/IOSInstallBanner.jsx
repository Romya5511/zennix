import { useState, useEffect } from 'react'

// Shows a one-time-per-session banner on iPhone/iPad
// when the app is NOT running in standalone (installed) mode
function IOSInstallBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)
    const isStandalone = window.navigator.standalone === true
    const dismissed = sessionStorage.getItem('ios_banner_dismissed')

    if (isIOS && !isStandalone && !dismissed) {
      setShow(true)
    }
  }, [])

  function dismiss() {
    sessionStorage.setItem('ios_banner_dismissed', '1')
    setShow(false)
  }

  if (!show) return null

  return (
    <div style={styles.banner}>
      <div style={styles.content}>
        <span style={styles.icon}>📲</span>
        <span style={styles.text}>
          Install Zennix: tap the{' '}
          <strong>Share</strong> button then{' '}
          <strong>"Add to Home Screen"</strong>
        </span>
      </div>
      <button style={styles.dismiss} onClick={dismiss}>✕</button>
    </div>
  )
}

const styles = {
  banner: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#1e1b4b',
    color: '#fff',
    padding: '0.85rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    zIndex: 999,
    boxShadow: '0 -4px 16px rgba(0,0,0,0.2)',
  },
  content: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.6rem',
    flex: 1,
  },
  icon: {
    fontSize: '1.3rem',
    flexShrink: 0,
  },
  text: {
    fontSize: '0.85rem',
    lineHeight: '1.4',
    color: '#e0e7ff',
  },
  dismiss: {
    background: 'none',
    border: 'none',
    color: '#a5b4fc',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.25rem',
    flexShrink: 0,
  },
}

export default IOSInstallBanner
