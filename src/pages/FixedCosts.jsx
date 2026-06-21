import { useEffect, useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SUGGESTIONS = [
  'Rent', 'Electricity', 'WiFi', 'Gas', 'School fees',
  'Insurance', 'EMI', 'OTT', 'Water', 'Maintenance',
  'Petrol', 'Maid', 'Cook', 'DTH', 'Phone bill'
]

// Lightweight swipe-to-delete for fixed cost tiles
function FCSwipeToDelete({ children, isOpen, onOpen, onClose, onDelete }) {
  const startXRef = useRef(null)
  const isDraggingRef = useRef(false)
  const THRESHOLD = 50

  function onTouchStart(e) {
    startXRef.current = e.touches[0].clientX
    isDraggingRef.current = false
  }

  function onTouchMove(e) {
    if (startXRef.current === null) return
    const diffX = startXRef.current - e.touches[0].clientX
    const diffY = Math.abs(e.touches[0].clientY - (startXRef.startY || e.touches[0].clientY))
    if (Math.abs(diffX) > 10) {
      isDraggingRef.current = true
      e.preventDefault()
    }
  }

  function onTouchEnd(e) {
    if (!isDraggingRef.current || startXRef.current === null) {
      startXRef.current = null; isDraggingRef.current = false; return
    }
    const diffX = startXRef.current - e.changedTouches[0].clientX
    if (diffX > THRESHOLD) onOpen()
    else if (diffX < -20) onClose()
    startXRef.current = null; isDraggingRef.current = false
  }

  function onMouseDown(e) { startXRef.current = e.clientX }
  function onMouseUp(e) {
    if (startXRef.current === null) return
    const diffX = startXRef.current - e.clientX
    if (Math.abs(diffX) > 10) {
      if (diffX > THRESHOLD) onOpen(); else if (diffX < -20) onClose()
    }
    startXRef.current = null
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '14px' }}>
      {/* Delete slot behind */}
      <div style={{
        position: 'absolute', right: 0, top: 0, bottom: 0, width: '88px',
        background: '#ef4444', display: 'flex', alignItems: 'center',
        justifyContent: 'center', borderRadius: '14px', zIndex: 0,
      }}>
        <button
          style={{ background: 'none', border: 'none', color: '#fff', fontSize: '0.8rem', fontWeight: '700', cursor: 'pointer' }}
          onTouchEnd={e => { e.stopPropagation(); onDelete() }}
          onClick={onDelete}
        >🗑 Delete</button>
      </div>
      {/* Sliding content */}
      <div
        style={{ position: 'relative', zIndex: 1, transition: 'transform 0.22s ease', transform: isOpen ? 'translateX(-88px)' : 'translateX(0)' }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
      >
        {children}
      </div>
    </div>
  )
}

// Returns ordinal suffix: 1 → "st", 2 → "nd", 3 → "rd", else "th"
function ordinal(n) {
  if (n === 1) return 'st'
  if (n === 2) return 'nd'
  if (n === 3) return 'rd'
  return 'th'
}

function FixedCosts() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [costs, setCosts] = useState([])
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [selectedDescription, setSelectedDescription] = useState('')
  const [reminderDay, setReminderDay] = useState('')
  const [lastAmount, setLastAmount] = useState('')
  const [saving, setSaving] = useState(false)
  const [editingCost, setEditingCost] = useState(null) // cost row being edited
  const [highlightedId, setHighlightedId] = useState(null) // id of tile to highlight
  const highlightTimerRef = useRef(null)
  const [swipedCostId, setSwipedCostId] = useState(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState(null)
  const [hoveredCostId, setHoveredCostId] = useState(null)
  const channelRef = useRef(null)
  const tileRefs = useRef({}) // refs for each cost tile for scrolling
  const householdIdRef = useRef(null)
  const userIdRef = useRef(null)

  useEffect(() => {
    setup()
    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current)
    }
  }, [])

  async function setup() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }
    userIdRef.current = user.id

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) { navigate('/'); return }
    householdIdRef.current = membership.household_id

    await loadCosts(membership.household_id)
    subscribeToFixedCosts(membership.household_id)
    setLoading(false)
  }

  function subscribeToFixedCosts(hid) {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`fixed_costs_${hid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'fixed_costs', filter: `household_id=eq.${hid}` },
        async () => { await loadCosts(hid) }
      )
      .subscribe()
    channelRef.current = channel
  }

  async function loadCosts(hid) {
    const { data } = await supabase
      .from('fixed_costs')
      .select('*')
      .eq('household_id', hid)
      .order('created_at', { ascending: true })
    setCosts(data || [])
  }

  async function deleteCost(costId) {
    setCosts(prev => prev.filter(c => c.id !== costId))
    await supabase.from('fixed_costs').delete().eq('id', costId)
    setConfirmDeleteId(null)
    setSwipedCostId(null)
  }

  // Called when user taps a chip
  async function handleChipTap(description) {
    const hid = householdIdRef.current

    // Check if already exists (case-insensitive)
    const existing = costs.find(
      c => c.description.toLowerCase() === description.toLowerCase()
    )

    if (existing) {
      // Scroll to it and highlight
      setSearch('')
      setHighlightedId(existing.id)
      clearTimeout(highlightTimerRef.current)
      highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2000)
      tileRefs.current[existing.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    // Open modal for new cost
    setSelectedDescription(description)
    setEditingCost(null)
    setReminderDay('')
    setLastAmount('')
    setShowModal(true)
    setSearch('')
  }

  // Called when user taps an existing cost tile to edit
  function handleTileEdit(cost) {
    setSelectedDescription(cost.description)
    setEditingCost(cost)
    setReminderDay(cost.reminder_day != null ? String(cost.reminder_day) : '')
    setLastAmount(cost.last_amount != null ? String(cost.last_amount) : '')
    setShowModal(true)
  }

  async function saveCost(skip = false) {
    if (saving) return
    setSaving(true)

    const hid = householdIdRef.current
    const uid = userIdRef.current
    const day = skip ? null : (reminderDay !== '' ? parseInt(reminderDay) : null)
    const amount = skip ? null : (lastAmount !== '' ? parseFloat(lastAmount) : null)

    if (editingCost) {
      // Update existing cost
      const { data: updated } = await supabase
        .from('fixed_costs')
        .update({
          reminder_day: day,
          last_amount: amount,
        })
        .eq('id', editingCost.id)
        .select()
        .single()

      if (updated) {
        setCosts(prev => prev.map(c => c.id === updated.id ? updated : c))
      }
    } else {
      // Insert new cost
      const { data: inserted } = await supabase
        .from('fixed_costs')
        .insert({
          household_id: hid,
          description: selectedDescription,
          reminder_day: day,
          last_amount: amount,
          created_by: uid,
        })
        .select()
        .single()

      if (inserted) {
        setCosts(prev => [...prev, inserted])
        // Highlight newly added tile
        setTimeout(() => {
          setHighlightedId(inserted.id)
          tileRefs.current[inserted.id]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
          clearTimeout(highlightTimerRef.current)
          highlightTimerRef.current = setTimeout(() => setHighlightedId(null), 2000)
        }, 100)
      }
    }

    setSaving(false)
    setShowModal(false)
    setEditingCost(null)
    setSelectedDescription('')
    setReminderDay('')
    setLastAmount('')
  }

  function closeModal() {
    setShowModal(false)
    setEditingCost(null)
    setSelectedDescription('')
    setReminderDay('')
    setLastAmount('')
  }

  const filteredSuggestions = SUGGESTIONS.filter(s =>
    s.toLowerCase().includes(search.toLowerCase())
  )

  const showAddCustom = search.trim().length > 0 &&
    !filteredSuggestions.find(s => s.toLowerCase() === search.trim().toLowerCase()) &&
    !costs.find(c => c.description.toLowerCase() === search.trim().toLowerCase())

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ padding: '2rem', color: '#888', textAlign: 'center' }}>Loading...</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 style={styles.title}>Fixed Costs</h1>
      </div>

      <div style={styles.content}>

        {/* Your fixed costs section */}
        <p style={styles.sectionLabel}>YOUR FIXED COSTS</p>
        {costs.length === 0 ? (
          <p style={styles.emptyNote}>No fixed costs added yet.</p>
        ) : (
          <div style={styles.costGrid}>
            {costs.map(cost => (
              <div
                key={cost.id}
                ref={el => tileRefs.current[cost.id] = el}
              >
                {confirmDeleteId === cost.id ? (
                  /* Confirmation row */
                  <div style={styles.confirmRow}>
                    <span style={styles.confirmText}>Delete {cost.description}?</span>
                    <div style={styles.confirmBtns}>
                      <button
                        style={styles.confirmCancel}
                        onClick={() => { setConfirmDeleteId(null); setSwipedCostId(null) }}
                      >Cancel</button>
                      <button
                        style={styles.confirmDelete}
                        onClick={() => deleteCost(cost.id)}
                      >Delete</button>
                    </div>
                  </div>
                ) : (
                  /* Swipeable tile */
                  <FCSwipeToDelete
                    isOpen={swipedCostId === cost.id}
                    onOpen={() => { setSwipedCostId(cost.id); setConfirmDeleteId(null) }}
                    onClose={() => setSwipedCostId(null)}
                    onDelete={() => setConfirmDeleteId(cost.id)}
                  >
                    <div
                      style={highlightedId === cost.id
                        ? { ...styles.costTile, ...styles.costTileHighlight }
                        : styles.costTile
                      }
                      onClick={() => {
                        if (swipedCostId === cost.id) { setSwipedCostId(null); return }
                        handleTileEdit(cost)
                      }}
                      onMouseEnter={() => setHoveredCostId(cost.id)}
                      onMouseLeave={() => setHoveredCostId(null)}
                    >
                      {/* Top row: name + reminder pill + hover trash */}
                      <div style={styles.tileTopRow}>
                        <span style={styles.costName}>{cost.description}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={cost.reminder_day != null
                            ? styles.reminderPill
                            : styles.reminderPillEmpty
                          }>
                            {cost.reminder_day != null
                              ? `Reminds on ${cost.reminder_day}${ordinal(cost.reminder_day)}`
                              : 'No reminder set'
                            }
                          </span>
                          {/* Trash icon — desktop hover only */}
                          {hoveredCostId === cost.id && (
                            <button
                              style={styles.hoverTrashBtn}
                              onClick={e => {
                                e.stopPropagation()
                                setConfirmDeleteId(cost.id)
                              }}
                              title="Delete"
                            >🗑</button>
                          )}
                        </div>
                      </div>
                      {/* Amount hint */}
                      <span style={styles.amountHint}>
                        {cost.last_amount != null
                          ? `Last paid ₹${parseFloat(cost.last_amount).toLocaleString('en-IN')}`
                          : 'Not paid yet'
                        }
                      </span>
                    </div>
                  </FCSwipeToDelete>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Add a cost section */}
        <p style={{ ...styles.sectionLabel, marginTop: '1.5rem' }}>ADD A COST</p>
        <input
          style={styles.searchInput}
          placeholder="Search or type a cost..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />

        {showAddCustom && (
          <button
            style={styles.addCustomChip}
            onClick={() => handleChipTap(search.trim())}
          >
            + Add "{search.trim()}"
          </button>
        )}

        <div style={styles.chipGrid}>
          {filteredSuggestions.map(s => {
            const alreadyAdded = costs.find(
              c => c.description.toLowerCase() === s.toLowerCase()
            )
            return (
              <button
                key={s}
                style={alreadyAdded
                  ? { ...styles.chip, ...styles.chipAdded }
                  : styles.chip
                }
                onClick={() => handleChipTap(s)}
              >
                {alreadyAdded ? '✓ ' : ''}{s}
              </button>
            )
          })}
        </div>

      </div>

      {/* Modal overlay */}
      {showModal && (
        <>
          <div style={styles.overlay} onClick={closeModal} />
          <div style={styles.modal}>
            <div style={styles.modalHandle} />

            <div style={styles.modalHeader}>
              <p style={styles.modalTitle}>
                {editingCost ? `Edit ${selectedDescription}` : `Add ${selectedDescription}`}
              </p>
              <button style={styles.modalCloseBtn} onClick={closeModal}>✕</button>
            </div>

            {/* Reminder day */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Reminder day (1–28)</label>
              <input
                style={styles.fieldInput}
                type="number"
                min="1"
                max="28"
                placeholder="e.g. 5"
                value={reminderDay}
                onChange={e => {
                  const v = parseInt(e.target.value)
                  if (e.target.value === '' || (v >= 1 && v <= 28)) {
                    setReminderDay(e.target.value)
                  }
                }}
              />
              <p style={styles.fieldHint}>Day of the month we remind you to pay</p>
            </div>

            {/* Amount */}
            <div style={styles.fieldGroup}>
              <label style={styles.fieldLabel}>Typical amount</label>
              <div style={styles.amountWrapper}>
                <span style={styles.rupeeSymbol}>₹</span>
                <input
                  style={styles.amountInput}
                  type="number"
                  min="0"
                  placeholder="e.g. 12000"
                  value={lastAmount}
                  onChange={e => setLastAmount(e.target.value)}
                />
              </div>
              <p style={styles.fieldHint}>What you typically pay each month</p>
            </div>

            {/* Save button */}
            <button
              style={saving ? { ...styles.saveBtn, opacity: 0.6 } : styles.saveBtn}
              onClick={() => saveCost(false)}
              disabled={saving}
            >
              {saving ? 'Saving…' : editingCost ? 'Save changes' : 'Add cost'}
            </button>

            {/* Skip */}
            <button
              style={styles.skipBtn}
              onClick={() => saveCost(true)}
              disabled={saving}
            >
              {editingCost ? 'Clear & save' : 'Skip for now'}
            </button>

          </div>
        </>
      )}

    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: 'sans-serif',
    paddingBottom: '2rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: '1rem 1rem 0.5rem',
    background: '#fff',
    borderBottom: '1px solid #f3f4f6',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: '0.95rem',
    color: '#4f46e5',
    cursor: 'pointer',
    padding: 0,
    fontWeight: '600',
  },
  title: { fontSize: '1.1rem', fontWeight: '700', margin: 0, color: '#111' },
  content: {
    padding: '1.25rem 1rem',
    maxWidth: '480px',
    margin: '0 auto',
  },
  sectionLabel: {
    fontSize: '0.7rem',
    fontWeight: '700',
    color: '#9ca3af',
    letterSpacing: '0.08em',
    margin: '0 0 0.75rem',
  },
  emptyNote: {
    fontSize: '0.9rem',
    color: '#aaa',
    margin: '0 0 1rem',
  },
  costGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '0.5rem',
  },
  hoverTrashBtn: {
    background: 'none',
    border: 'none',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0.1rem 0.25rem',
    borderRadius: '6px',
    color: '#ef4444',
    lineHeight: 1,
  },
  confirmRow: {
    background: '#fff',
    border: '1px solid #fca5a5',
    borderRadius: '14px',
    padding: '0.85rem 1rem',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  confirmText: {
    fontSize: '0.9rem',
    fontWeight: '600',
    color: '#ef4444',
  },
  confirmBtns: {
    display: 'flex',
    gap: '0.5rem',
  },
  confirmCancel: {
    padding: '0.4rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  confirmDelete: {
    padding: '0.4rem 0.85rem',
    fontSize: '0.85rem',
    fontWeight: '600',
    background: '#ef4444',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
  },
  costTile: {
    background: '#fff',
    border: '1px solid #e5e7eb',
    borderRadius: '14px',
    padding: '0.85rem 1rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    cursor: 'pointer',
    transition: 'background 0.2s ease, border-color 0.2s ease',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  tileTopRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: '0.5rem',
  },
  reminderPill: {
    fontSize: '0.7rem',
    fontWeight: '600',
    color: '#4f46e5',
    background: '#ede9fe',
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    whiteSpace: 'nowrap',
  },
  reminderPillEmpty: {
    fontSize: '0.7rem',
    fontWeight: '500',
    color: '#9ca3af',
    background: '#f3f4f6',
    borderRadius: '999px',
    padding: '0.2rem 0.6rem',
    whiteSpace: 'nowrap',
  },
  amountHint: {
    fontSize: '0.8rem',
    color: '#6b7280',
  },
  costTileHighlight: {
    background: '#ede9fe',
    borderColor: '#a78bfa',
  },
  costName: {
    fontSize: '0.95rem',
    fontWeight: '600',
    color: '#111',
  },
  costAmount: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#4f46e5',
  },
  costReminder: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  costTap: {
    fontSize: '0.75rem',
    color: '#c4b5fd',
    fontStyle: 'italic',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxSizing: 'border-box',
    marginBottom: '0.75rem',
    outline: 'none',
  },
  addCustomChip: {
    display: 'block',
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    background: '#f0fdf4',
    color: '#16a34a',
    border: '1px solid #bbf7d0',
    borderRadius: '10px',
    cursor: 'pointer',
    marginBottom: '0.75rem',
    textAlign: 'left',
  },
  chipGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
  },
  chip: {
    padding: '0.5rem 0.85rem',
    fontSize: '0.875rem',
    fontWeight: '500',
    background: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: '999px',
    cursor: 'pointer',
    color: '#333',
  },
  chipAdded: {
    background: '#ede9fe',
    border: '1px solid #a78bfa',
    color: '#4f46e5',
  },

  // Modal
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 90,
  },
  modal: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '0.75rem 1.25rem 2.5rem',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 100,
    maxHeight: '80vh',
    overflowY: 'auto',
  },
  modalHandle: {
    width: '40px',
    height: '4px',
    background: '#e5e7eb',
    borderRadius: '999px',
    margin: '0 auto 1rem',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem',
  },
  modalTitle: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#111',
    margin: 0,
  },
  modalCloseBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: '#aaa',
    cursor: 'pointer',
  },
  fieldGroup: {
    marginBottom: '1.25rem',
  },
  fieldLabel: {
    display: 'block',
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
  },
  fieldInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    boxSizing: 'border-box',
    outline: 'none',
  },
  fieldHint: {
    fontSize: '0.75rem',
    color: '#9ca3af',
    margin: '0.35rem 0 0',
  },
  amountWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: '10px',
    overflow: 'hidden',
  },
  rupeeSymbol: {
    padding: '0.75rem 0.75rem',
    fontSize: '1rem',
    color: '#6b7280',
    background: '#f9fafb',
    borderRight: '1px solid #e5e7eb',
  },
  amountInput: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: 'none',
    outline: 'none',
  },
  saveBtn: {
    width: '100%',
    padding: '0.9rem',
    fontSize: '1rem',
    fontWeight: '700',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    marginBottom: '0.75rem',
  },
  skipBtn: {
    width: '100%',
    padding: '0.75rem',
    fontSize: '0.95rem',
    fontWeight: '600',
    background: 'none',
    color: '#9ca3af',
    border: 'none',
    cursor: 'pointer',
  },
}

export default FixedCosts