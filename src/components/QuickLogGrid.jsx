import { useState } from 'react'
import { supabase } from '../lib/supabase'

const CATEGORIES = [
  { key: 'Food Delivery', emoji: '🍔', bg: '#FFE7E0', accent: '#E85D3E' },
  { key: 'Transport', emoji: '🚕', bg: '#DFF4F1', accent: '#1E9E8F' },
  { key: 'Online Shopping', emoji: '🛍️', bg: '#EEE4FB', accent: '#7C4FE0' },
  { key: 'Fruits & Vegetables', emoji: '🥦', bg: '#E5F5E0', accent: '#3F9142' },
  { key: 'Entertainment', emoji: '🎬', bg: '#FFF3D6', accent: '#C98A0A' },
  { key: 'Medical', emoji: '💊', bg: '#FCE3EC', accent: '#D14C79' },
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

  function openTile(key) {
    if (saving) return
    if (expanded === key) {
      // tapping the already-open tile again collapses it
      setExpanded(null)
      setAmount('')
      setDate(todayStr())
      return
    }
    setExpanded(key)
    setAmount('')
    setDate(todayStr())
  }

  function cancel() {
    if (saving) return
    setExpanded(null)
    setAmount('')
    setDate(todayStr())
  }

  async function save() {
    const parsed = parseFloat(amount)
    if (!amount || isNaN(parsed) || parsed <= 0 || saving) return
    setSaving(true)

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
        amount: parsed,
        bought_by: userId,
        bought_at: boughtAt,
      })

    setSaving(false)

    if (!error) {
      setJustSaved(expanded)
      setTimeout(() => {
        setJustSaved(null)
        setExpanded(null)
        setAmount('')
        setDate(todayStr())
      }, 650)
      if (onSaved) onSaved()
    }
  }

  return (
    <div style={styles.wrap}>
      <p style={styles.heading}>Quick log</p>
      <div style={styles.grid}>
        {CATEGORIES.map(cat => {
          const isOpen = expanded === cat.key
          const isFaded = expanded !== null && !isOpen
          const isPulsing = justSaved === cat.key
          return (
            <button
              key={cat.key}
              style={{
                ...styles.tile,
                background: cat.bg,
                opacity: isFaded ? 0.35 : 1,
                transform: isOpen ? 'scale(1.04)' : 'scale(1)',
                boxShadow: isOpen ? `0 0 0 2px ${cat.accent}` : styles.tile.boxShadow,
                pointerEvents: saving ? 'none' : 'auto',
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
        <div style={styles.form}>
          <div style={styles.formHeader}>
            <span style={styles.formTitle}>
              {CATEGORIES.find(c => c.key === expanded)?.emoji} {expanded}
            </span>
            <button style={styles.closeBtn} onClick={cancel} disabled={saving}>✕</button>
          </div>

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

          <button
            style={saving || !amount ? { ...styles.saveBtn, opacity: 0.6 } : styles.saveBtn}
            onClick={save}
            disabled={saving || !amount}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
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
    animation: 'none',
  },
  formHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: '0.95rem', fontWeight: '700', color: '#111' },
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