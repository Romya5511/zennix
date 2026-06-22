import { useState } from 'react'
import { supabase } from '../lib/supabase'

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

function PushPermissionModal({ userId, onDone }) {
  const [loading, setLoading] = useState(false)

  async function handleAllow() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'granted') {
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        })
        await supabase
          .from('profiles')
          .update({ push_subscription: subscription.toJSON() })
          .eq('id', userId)
      }
    } catch (err) {
      console.error('Push subscription error:', err)
    }
    setLoading(false)
    onDone()
  }

  async function handleSkip() {
    // Mark as seen so we don't ask again this session
    sessionStorage.setItem('push_prompt_seen', '1')
    onDone()
  }

  return (
    <>
      <div style={styles.overlay} />
      <div style={styles.modal}>
        <div style={styles.iconWrap}>🔔</div>
        <h2 style={styles.title}>Stay in sync with your household</h2>
        <p style={styles.subtitle}>
          Get notified when your partner adds items, enters prices, or finishes the list.
        </p>
        <button
          style={loading ? { ...styles.allowBtn, opacity: 0.6 } : styles.allowBtn}
          onClick={handleAllow}
          disabled={loading}
        >
          {loading ? 'Setting up…' : 'Allow notifications'}
        </button>
        <button style={styles.skipBtn} onClick={handleSkip}>
          Not now
        </button>
      </div>
    </>
  )
}

const styles = {
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.5)',
    zIndex: 200,
  },
  modal: {
    position: 'fixed',
    top: '50%', left: '50%',
    transform: 'translate(-50%, -50%)',
    background: '#fff',
    borderRadius: '20px',
    padding: '2rem 1.5rem',
    width: '88%',
    maxWidth: '380px',
    zIndex: 201,
    textAlign: 'center',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem',
    boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
  },
  iconWrap: { fontSize: '2.5rem' },
  title: { fontSize: '1.15rem', fontWeight: '700', color: '#111', margin: 0 },
  subtitle: { fontSize: '0.875rem', color: '#6b7280', margin: 0, lineHeight: '1.5' },
  allowBtn: {
    width: '100%', padding: '0.9rem',
    fontSize: '1rem', fontWeight: '700',
    background: '#6C63FF', color: '#fff',
    border: 'none', borderRadius: '12px',
    cursor: 'pointer', marginTop: '0.5rem',
  },
  skipBtn: {
    background: 'none', border: 'none',
    color: '#9ca3af', fontSize: '0.9rem',
    cursor: 'pointer', padding: '0.25rem',
  },
}

export default PushPermissionModal
