import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import BottomNav from '../components/BottomNav'
import { getSoundEnabled, setSoundEnabled, playSaveSound } from '../lib/soundEngine'

function Settings() {
  const navigate = useNavigate()
  const [soundOn, setSoundOn] = useState(getSoundEnabled())

  function toggleSound() {
    const next = !soundOn
    setSoundOn(next)
    setSoundEnabled(next)
    if (next) playSaveSound() // quick confirmation cue when turning back on
  }

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h1 style={styles.title}>Settings</h1>
      </div>

      <div style={styles.content}>
        <p style={styles.sectionLabel}>APP</p>

        <div style={styles.row}>
          <div style={styles.rowText}>
            <span style={styles.rowLabel}>Sound effects</span>
            <span style={styles.rowHint}>
              Plays a short sound when you save a grocery item, fixed cost, or Quick Log entry.
            </span>
          </div>
          <button
            style={soundOn ? { ...styles.toggle, ...styles.toggleOn } : styles.toggle}
            onClick={toggleSound}
            aria-label="Toggle sound effects"
          >
            <span style={soundOn ? { ...styles.toggleKnob, ...styles.toggleKnobOn } : styles.toggleKnob} />
          </button>
        </div>

        <p style={styles.note}>
          Note: your phone's silent/vibrate switch can't be read by web apps,
          so this toggle is the reliable way to turn sound on or off here.
        </p>
      </div>

      <div style={{ height: '80px' }} />
      <BottomNav />
    </div>
  )
}

const styles = {
  page: { minHeight: '100vh', backgroundColor: '#f9fafb', fontFamily: 'sans-serif', paddingBottom: '2rem' },
  header: { padding: '1rem 1rem 0.75rem', background: '#fff', borderBottom: '1px solid #f3f4f6' },
  title: { fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111' },
  content: { maxWidth: 'clamp(320px, 94vw, 560px)', margin: '0 auto', padding: '1.25rem 1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' },
  sectionLabel: { fontSize: '0.7rem', fontWeight: '700', color: '#9ca3af', letterSpacing: '0.08em', margin: '0 0 0.5rem' },
  row: {
    background: '#fff', borderRadius: '14px', padding: '1rem 1.1rem',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  rowText: { display: 'flex', flexDirection: 'column', gap: '0.3rem' },
  rowLabel: { fontSize: '0.95rem', fontWeight: '600', color: '#111' },
  rowHint: { fontSize: '0.78rem', color: '#9ca3af', lineHeight: '1.4' },
  toggle: {
    width: '46px', height: '26px', borderRadius: '999px', background: '#e5e7eb',
    border: 'none', cursor: 'pointer', position: 'relative', flexShrink: 0, padding: 0,
    transition: 'background 0.2s ease',
  },
  toggleOn: { background: '#4f46e5' },
  toggleKnob: {
    position: 'absolute', top: '3px', left: '3px', width: '20px', height: '20px',
    borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
    transition: 'transform 0.2s ease',
  },
  toggleKnobOn: { transform: 'translateX(20px)' },
  note: { fontSize: '0.75rem', color: '#aaa', lineHeight: '1.5', margin: '0.5rem 0 0' },
}

export default Settings