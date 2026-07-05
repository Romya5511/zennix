import { useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { key: 'Food Delivery', emoji: '🍔', bg: '#FFE7E0', accent: '#E85D3E' },
  { key: 'Transport', emoji: '🚕', bg: '#DFF4F1', accent: '#1E9E8F' },
  { key: 'Online Shopping', emoji: '🛍️', bg: '#EEE4FB', accent: '#7C4FE0' },
  { key: 'Fruits & Vegetables', emoji: '🥦', bg: '#E5F5E0', accent: '#3F9142' },
  { key: 'Entertainment', emoji: '🎬', bg: '#FFF3D6', accent: '#C98A0A' },
  { key: 'Medical', emoji: '💊', bg: '#FCE3EC', accent: '#D14C79' },
  // NEW — added on request
  { key: 'Fish/Meat/Egg', emoji: '🍗', bg: '#F6E3D3', accent: '#B8621B' },
  { key: 'Tea/Coffee', emoji: '☕', bg: '#F0E4D6', accent: '#8B5E34' },
  {
    key: 'Liquor', emoji: '🍷', bg: '#F3E1EA', accent: '#9C3B5E',
    warning: "Can't listen to the people who raised you, but you'll listen to an app? Come on.",
  },
  {
    key: 'Cigarettes', emoji: '🚬', bg: '#E9E6E2', accent: '#6B6660',
    warning: "Can't listen to the people who raised you, but you'll listen to an app? Come on.",
  },
]

const QUICK_AMOUNTS = [50, 100, 200, 500]

function todayStr() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function QuickLogGrid({ householdId, userId, onSaved }) {
  const [expanded, setExpanded] = useState(null) // category key or null
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(todayStr())
  const [saving, setSaving] = useState(false)
  const [justSaved, setJustSaved] = useState(null) // category key that just saved, for pulse
  const [saveError, setSaveError] = useState('')

  function openTile(key) {
    if (saving) return
    if (expanded === key) {
      // tapping the already-open tile again collapses it
      setExpanded(null)
      setAmount('')
      setDate(todayStr())
      setSaveError('')
      return
    }
    setExpanded(key)
    setAmount('')
    setDate(todayStr())
    setSaveError('')
  }

  function cancel() {
    if (saving) return
    setExpanded(null)
    setAmount('')
    setDate(todayStr())
    setSaveError('')
  }

  async function save() {
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0 || saving) return
    setSaving(true)
    setSaveError('')

    // Build a timestamp for the chosen date. Selected date is a plain
    // YYYY-MM-DD; if it's today, use the exact current time. If backdated,
    // anchor to noon local time so the entry lands on the intended calendar
    // day regardless of timezone rounding.
    const [y, m, d] = date.split('-').map(Number)
    const isToday = date === todayStr()
    const boughtAt = isToday
      ? new Date().toISOString()
      : new Date(y, m - 1, d, 12, 0, 0).toISOString()

    const { error } = await supabase
      .from('household_bucket')
      .insert({
        household_id: householdId,
        source_type: 'quick_log',
        category: expanded,
        item_name: expanded,
        amount: parsed,
        bought_by: userId,
        bought_at: boughtAt,
      })

    setSaving(false)

    if (error) {
      // Surface the real reason instead of failing silently — this is
      // what let bug #6 (not writing to DB) go unnoticed with no visible
      // feedback to the user.
      console.error('Quick Log save failed:', error)
      setSaveError(error.message || 'Could not save. Please try again.')
      return
    }

    setJustSaved(expanded)
    setTimeout(() => {
      setJustSaved(null)
      setExpanded(null)
      setAmount('')
      setDate(todayStr())
    }, 650)
    if (onSaved) onSaved(parsed)
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.heading}>Quick log</p>
      <div style={styles.grid}>
        {CATEGORIES.map(cat => {
          const isOpen = expanded === cat.key
          const isPulsing = justSaved === cat.key
          return (
            <button
              key={cat.key}
              style={{
                ...styles.tile,
                background: cat.bg,
                transform: isOpen ? 'scale(1.04)' : 'scale(1)',
                boxShadow: isOpen ? `0 0 0 2px ${cat.accent}` : styles.tile.boxShadow,
              }}
              onClick={() => openTile(cat.key)}
            >
              {isPulsing ? (
                <span style={{ ...styles.checkmark, color: cat.accent }}>✓</span>
              ) : (
                <>
                  <span style={styles.emoji}>{cat.emoji}</span>
                  <span style={{ ...styles.label, color: cat.accent }}>{cat.key}</span>
                </>
              )}
            </button>
          )
        })}
      </div>

      {expanded && (
        <>
          <div style={styles.overlay} onClick={cancel} />
          <div style={styles.modal}>
            <div style={styles.formHeader}>
              <span style={styles.formTitle}>
                {CATEGORIES.find(c => c.key === expanded)?.emoji} {expanded}
              </span>
              <button style={styles.closeBtn} onClick={cancel} disabled={saving}>✕</button>
            </div>

            {CATEGORIES.find(c => c.key === expanded)?.warning && (
              <p style={styles.warningNote}>
                {CATEGORIES.find(c => c.key === expanded).warning}
              </p>
            )}

            <div style={styles.amountRow}>
              <span style={styles.rupee}>₹</span>
              <input
                style={styles.amountInput}
                type="number"
                min="0"
                placeholder="0"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                autoFocus
                disabled={saving}
              />
            </div>

            <div style={styles.chipRow}>
              {QUICK_AMOUNTS.map(val => (
                <button
                  key={val}
                  style={styles.chip}
                  onClick={() => setAmount(String(val))}
                  disabled={saving}
                >
                  ₹{val}
                </button>
              ))}
            </div>

            <div style={styles.dateRow}>
              <span style={styles.dateLabel}>Date</span>
              <input
                style={styles.dateInput}
                type="date"
                value={date}
                max={todayStr()}
                onChange={e => setDate(e.target.value)}
                disabled={saving}
              />
            </div>

            {saveError && <p style={styles.errorText}>{saveError}</p>}

            <button
              style={saving || !amount ? { ...styles.saveBtn, opacity: 0.6 } : styles.saveBtn}
              onClick={save}
              disabled={saving || !amount}
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}

const styles = {
  wrap: { display: 'flex', flexDirection: 'column', gap: '0.6rem' },
  heading: { fontSize: '0.95rem', fontWeight: '700', color: '#111', margin: 0 },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '0.6rem',
  },
  tile: {
    border: 'none',
    borderRadius: '14px',
    padding: '0.9rem 0.4rem',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '0.3rem',
    cursor: 'pointer',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'opacity 0.25s ease, transform 0.2s ease, box-shadow 0.2s ease',
    minHeight: '72px',
  },
  emoji: { fontSize: '1.4rem', lineHeight: 1 },
  label: { fontSize: '0.68rem', fontWeight: '700', textAlign: 'center', lineHeight: '1.2' },
  checkmark: { fontSize: '1.6rem', fontWeight: '800' },
  form: {
    background: '#fff',
    borderRadius: '16px',
    padding: '1rem',
    boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.85rem',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.45)',
    zIndex: 90,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '360px',
    background: '#fff',
    borderRadius: '20px',
    padding: '1.25rem',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    zIndex: 100,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  errorText: {
    fontSize: '0.8rem',
    color: '#dc2626',
    margin: 0,
    textAlign: 'center',
  },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#111' },
  warningNote: {
    fontSize: '0.78rem', fontWeight: '600', color: '#9C3B5E',
    background: '#F3E1EA', border: '1px solid #e8c3d6', borderRadius: '10px',
    padding: '0.6rem 0.75rem', margin: 0, lineHeight: '1.4',
  },
  closeBtn: {
    background: 'none', border: 'none', fontSize: '1rem', color: '#aaa', cursor: 'pointer', padding: '0.2rem',
  },
  amountRow: {
    display: 'flex', alignItems: 'center', gap: '0.4rem',
    border: '1px solid #e5e7eb', borderRadius: '12px', padding: '0.5rem 0.9rem',
  },
  rupee: { fontSize: '1.4rem', fontWeight: '700', color: '#6b7280' },
  amountInput: {
    flex: 1, border: 'none', outline: 'none', fontSize: '1.6rem', fontWeight: '700', color: '#111',
  },
  chipRow: { display: 'flex', gap: '0.5rem', flexWrap: 'wrap' },
  chip: {
    padding: '0.4rem 0.85rem', fontSize: '0.85rem', fontWeight: '600',
    background: '#f3f4f6', border: 'none', borderRadius: '999px', cursor: 'pointer', color: '#374151',
  },
  dateRow: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  dateLabel: { fontSize: '0.85rem', fontWeight: '600', color: '#6b7280' },
  dateInput: {
    padding: '0.4rem 0.6rem', fontSize: '0.85rem', border: '1px solid #e5e7eb', borderRadius: '8px',
  },
  saveBtn: {
    width: '100%', padding: '0.8rem', fontSize: '1rem', fontWeight: '700',
    background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '12px', cursor: 'pointer',
  },
}

export default QuickLogGrid