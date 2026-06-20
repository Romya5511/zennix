import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SEED_ITEMS = [
  'Atta', 'Doodh', 'Chawal', 'Dal', 'Chini', 'Namak', 'Tel', 'Sabzi',
  'Pyaaz', 'Tamatar', 'Adrak', 'Lahsun', 'Haldi', 'Jeera', 'Dhaniya',
  'Sabun', 'Shampoo', 'Chai Patti', 'Biscuit', 'Bread'
]

// Returns "2 min ago", "1 hr ago", "just now" etc.
function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} day ago`
}

function ListPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(true)
  const [listId, setListId] = useState(isNew ? null : id)
  const [libraryItems, setLibraryItems] = useState([])
  const [listItems, setListItems] = useState([])
  const [profiles, setProfiles] = useState({}) // { [userId]: full_name }
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('to_buy')
  const [showLibrary, setShowLibrary] = useState(false)
  const [adding, setAdding] = useState(false)
  const [savingChanges, setSavingChanges] = useState(false)

  const listIdRef = useRef(isNew ? null : id)
  const householdIdRef = useRef(null)
  const userIdRef = useRef(null)
  const channelRef = useRef(null)

  useEffect(() => {
    setup()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
  }, [])

  useEffect(() => {
    listIdRef.current = listId
    if (listId) subscribeToListItems(listId)
  }, [listId])

  function subscribeToListItems(lid) {
    if (channelRef.current) supabase.removeChannel(channelRef.current)
    const channel = supabase
      .channel(`list_items_${lid}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'list_items', filter: `list_id=eq.${lid}` },
        async () => {
          const { data } = await supabase
            .from('list_items')
            .select('*')
            .eq('list_id', lid)
            .order('display_order', { ascending: true })
          setListItems(data || [])
        }
      )
      .subscribe()
    channelRef.current = channel
  }

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

    // Load all profiles for this household so we can show display names
    const { data: members } = await supabase
      .from('household_members')
      .select('user_id')
      .eq('household_id', membership.household_id)

    if (members && members.length > 0) {
      const userIds = members.map(m => m.user_id)
      const { data: profileRows } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (profileRows) {
        const profileMap = {}
        profileRows.forEach(p => { profileMap[p.id] = p.full_name })
        setProfiles(profileMap)
      }
    }

    if (!isNew) {
      const { data: items } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', id)
        .order('display_order', { ascending: true })
      setListItems(items || [])
    }

    await loadLibrary(membership.household_id)
    setLoading(false)
  }

  async function loadLibrary(hid) {
    const { data: library } = await supabase
      .from('household_items')
      .select('*')
      .eq('household_id', hid)
      .order('times_added', { ascending: false })

    if (!library || library.length === 0) {
      const seedRows = SEED_ITEMS.map(name => ({
        household_id: hid, item_name: name, last_quantity: '1', times_added: 0,
      }))
      const { data: seeded } = await supabase
        .from('household_items').insert(seedRows).select()
      setLibraryItems(seeded || [])
    } else {
      setLibraryItems(library)
    }
  }

  async function getOrCreateListId() {
    if (listIdRef.current) return listIdRef.current

    const hid = householdIdRef.current
    const uid = userIdRef.current
    if (!hid || !uid) return null

    const { data: existing } = await supabase
      .from('grocery_lists')
      .select('id')
      .eq('household_id', hid)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle()

    if (existing) {
      listIdRef.current = existing.id
      setListId(existing.id)
      window.history.replaceState(null, '', `/list/${existing.id}`)
      const { data: items } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', existing.id)
        .order('display_order', { ascending: true })
      setListItems(items || [])
      return existing.id
    }

    const { data: newList, error } = await supabase
      .from('grocery_lists')
      .insert({ household_id: hid, created_by: uid, status: 'active' })
      .select()
      .single()

    if (error || !newList) return null

    listIdRef.current = newList.id
    setListId(newList.id)
    window.history.replaceState(null, '', `/list/${newList.id}`)
    return newList.id
  }

  async function addItemFromLibrary(libraryItem) {
    if (adding) return
    setAdding(true)

    const currentListId = await getOrCreateListId()
    if (!currentListId) { setAdding(false); return }

    const already = listItems.find(
      i => i.item_name.toLowerCase() === libraryItem.item_name.toLowerCase()
        && i.tab_status === 'to_buy'
    )
    if (already) { setAdding(false); return }

    const { data: inserted, error } = await supabase
      .from('list_items')
      .insert({
        list_id: currentListId,
        household_item_id: libraryItem.id,
        item_name: libraryItem.item_name,
        quantity: libraryItem.last_quantity || '1',
        tab_status: 'to_buy',
        display_order: listItems.length,
        is_ticked: false,
      })
      .select()
      .single()

    if (!error && inserted) {
      setListItems(prev => [...prev, inserted])

      await supabase
        .from('household_items')
        .update({ times_added: (libraryItem.times_added || 0) + 1 })
        .eq('id', libraryItem.id)

      setLibraryItems(prev =>
        prev.map(i => i.id === libraryItem.id
          ? { ...i, times_added: (i.times_added || 0) + 1 }
          : i
        )
      )
    }

    setAdding(false)
  }

  async function addCustomItem() {
    const name = search.trim()
    if (!name) return
    const hid = householdIdRef.current
    if (!hid) return
    setAdding(true)

    const currentListId = await getOrCreateListId()
    if (!currentListId) { setAdding(false); return }

    const { data: libItem } = await supabase
      .from('household_items')
      .insert({
        household_id: hid,
        item_name: name,
        last_quantity: '1',
        times_added: 1,
      })
      .select().single()

    if (libItem) {
      setLibraryItems(prev => [libItem, ...prev])

      const { data: inserted } = await supabase
        .from('list_items')
        .insert({
          list_id: currentListId,
          household_item_id: libItem.id,
          item_name: libItem.item_name,
          quantity: '1',
          tab_status: 'to_buy',
          display_order: listItems.length,
          is_ticked: false,
        })
        .select()
        .single()

      if (inserted) setListItems(prev => [...prev, inserted])
    }

    setAdding(false)
    setSearch('')
  }

  async function updateQty(itemId, qty) {
    setListItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i))
    await supabase.from('list_items').update({ quantity: qty }).eq('id', itemId)
  }

  async function removeItem(itemId) {
    setListItems(prev => prev.filter(i => i.id !== itemId))
    await supabase.from('list_items').delete().eq('id', itemId)
  }

  async function toggleTick(item) {
    const newTicked = !item.is_ticked
    setListItems(prev =>
      prev.map(i => i.id === item.id ? { ...i, is_ticked: newTicked } : i)
    )
    await supabase
      .from('list_items')
      .update({ is_ticked: newTicked })
      .eq('id', item.id)
  }

  async function saveChanges() {
    if (savingChanges) return
    setSavingChanges(true)

    const uid = userIdRef.current
    const tickedItems = toBuyItems.filter(i => i.is_ticked)
    const tickedIds = tickedItems.map(i => i.id)

    if (tickedIds.length === 0) { setSavingChanges(false); return }

    const now = new Date().toISOString()

    setListItems(prev =>
      prev.map(i =>
        tickedIds.includes(i.id)
          ? { ...i, tab_status: 'pricing', ticked_by: uid, ticked_at: now, is_ticked: false }
          : i
      )
    )

    await supabase
      .from('list_items')
      .update({
        tab_status: 'pricing',
        ticked_by: uid,
        ticked_at: now,
        is_ticked: false,
      })
      .in('id', tickedIds)

    setSavingChanges(false)
  }

  // Called when user types a price and presses Enter or taps away
  async function enterPrice(item, priceValue) {
    const price = parseFloat(priceValue)
    if (!priceValue || isNaN(price) || price <= 0) return

    const uid = userIdRef.current
    const hid = householdIdRef.current
    const currentListId = listIdRef.current
    const now = new Date().toISOString()

    // Optimistic update — remove from pricing tab immediately
    setListItems(prev =>
      prev.map(i =>
        i.id === item.id
          ? { ...i, tab_status: 'done', price_entered: price, price_entered_by: uid, price_entered_at: now }
          : i
      )
    )

    // Update list_item in Supabase
    await supabase
      .from('list_items')
      .update({
        price_entered: price,
        price_entered_by: uid,
        price_entered_at: now,
        tab_status: 'done',
      })
      .eq('id', item.id)

    // Insert into household_bucket
    // bought_by = ticked_by (the person who physically bought it)
    await supabase
      .from('household_bucket')
      .insert({
        household_id: hid,
        source_type: 'grocery_list',
        source_id: currentListId,
        item_name: item.item_name,
        quantity: item.quantity,
        amount: price,
        bought_by: item.ticked_by,
        bought_at: now,
      })
  }

  const toBuyItems = listItems.filter(i => i.tab_status === 'to_buy')
  const pricingItems = listItems.filter(i => i.tab_status === 'pricing')
  const doneItems = listItems.filter(i => i.tab_status === 'done')
  const anyTicked = toBuyItems.some(i => i.is_ticked)

  const filteredLibrary = libraryItems.filter(item =>
    item.item_name.toLowerCase().includes(search.toLowerCase())
  )

  const showAddCustomChip = search.trim().length > 0 &&
    !filteredLibrary.find(i => i.item_name.toLowerCase() === search.trim().toLowerCase())

  if (loading) {
    return (
      <div style={styles.page}>
        <p style={{ padding: '2rem', color: '#888', textAlign: 'center' }}>
          Setting up your list...
        </p>
      </div>
    )
  }

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 style={styles.title}>Grocery List</h1>
      </div>

      {/* Tab bar */}
      <div style={styles.tabs}>
        <button
          style={activeTab === 'to_buy' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab('to_buy')}
        >To Buy ({toBuyItems.length})</button>
        <button
          style={activeTab === 'pricing' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab('pricing')}
        >Pricing ({pricingItems.length})</button>
        <button
          style={activeTab === 'done' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab('done')}
        >Done ({doneItems.length})</button>
      </div>

      {/* Tab content */}
      <div style={styles.content}>

        {/* ── TO BUY TAB ── */}
        {activeTab === 'to_buy' && (
          <div>
            {toBuyItems.length === 0 ? (
              <p style={styles.emptyNote}>No items yet. Tap "+ Add items" below.</p>
            ) : (
              toBuyItems.map(item => (
                <div
                  key={item.id}
                  style={item.is_ticked
                    ? { ...styles.itemRow, ...styles.itemRowTicked }
                    : styles.itemRow
                  }
                >
                  <span
                    style={item.is_ticked
                      ? { ...styles.itemName, ...styles.itemNameTicked }
                      : styles.itemName
                    }
                  >
                    {item.item_name}
                  </span>
                  <input
                    style={styles.qtyInput}
                    value={item.quantity || ''}
                    onChange={e => updateQty(item.id, e.target.value)}
                    placeholder="Qty"
                  />
                  <button
                    style={item.is_ticked
                      ? { ...styles.tickBtn, ...styles.tickBtnActive }
                      : styles.tickBtn
                    }
                    onClick={() => toggleTick(item)}
                    aria-label={item.is_ticked ? 'Untick item' : 'Tick item'}
                  >
                    {item.is_ticked ? '✓' : ''}
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── PRICING TAB ── */}
        {activeTab === 'pricing' && (
          <div>
            {pricingItems.length === 0 ? (
              <p style={styles.emptyNote}>
                No items here yet. Tick items in To Buy and tap Save changes.
              </p>
            ) : (
              pricingItems.map(item => (
                <div key={item.id} style={styles.pricingRow}>
                  {/* Left: item name + meta */}
                  <div style={styles.pricingLeft}>
                    <span style={styles.itemName}>{item.item_name}</span>
                    <span style={styles.pricingMeta}>
                      {profiles[item.ticked_by]
                        ? `Bought by ${profiles[item.ticked_by]}`
                        : 'Bought'
                      }
                      {item.ticked_at ? ` · ${timeAgo(item.ticked_at)}` : ''}
                    </span>
                  </div>

                  {/* Middle: editable qty */}
                  <input
                    style={styles.qtyInput}
                    value={item.quantity || ''}
                    onChange={e => updateQty(item.id, e.target.value)}
                    placeholder="Qty"
                  />

                  {/* Right: price input */}
                  <div style={styles.priceWrapper}>
                    <span style={styles.rupeeSymbol}>₹</span>
                    <input
                      style={styles.priceInput}
                      type="number"
                      placeholder="Price"
                      min="0"
                      onBlur={e => enterPrice(item, e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.target.blur()
                        }
                      }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* ── DONE TAB ── */}
        {activeTab === 'done' && (
          <p style={styles.emptyNote}>
            Completed items appear here. Coming on Day 7.
          </p>
        )}

      </div>

      {/* Save changes bar */}
      {activeTab === 'to_buy' && anyTicked && (
        <div style={styles.saveBar}>
          <button
            style={savingChanges ? { ...styles.saveBtn, opacity: 0.6 } : styles.saveBtn}
            onClick={saveChanges}
            disabled={savingChanges}
          >
            {savingChanges ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      {/* Floating Add Items button */}
      {activeTab === 'to_buy' && (
        <button
          style={anyTicked ? { ...styles.fab, bottom: '6rem' } : styles.fab}
          onClick={() => { setShowLibrary(true); setSearch('') }}
        >
          + Add items
        </button>
      )}

      {/* Bottom sheet */}
      {showLibrary && (
        <>
          <div
            style={styles.overlay}
            onClick={() => { setShowLibrary(false); setSearch('') }}
          />
          <div style={styles.bottomSheet}>
            <div style={styles.handle} />
            <div style={styles.sheetHeader}>
              <p style={styles.sheetTitle}>Add items</p>
              <button
                style={styles.closeBtn}
                onClick={() => { setShowLibrary(false); setSearch('') }}
              >✕</button>
            </div>

            <input
              style={styles.searchInput}
              placeholder="Search or type a new item..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
            />

            {showAddCustomChip && (
              <button
                style={styles.addCustomChip}
                onClick={addCustomItem}
                disabled={adding}
              >
                + Add "{search.trim()}"
              </button>
            )}

            <div style={styles.grid}>
              {filteredLibrary.map(item => {
                const inList = toBuyItems.find(
                  i => i.item_name.toLowerCase() === item.item_name.toLowerCase()
                )
                return (
                  <button
                    key={item.id}
                    style={inList
                      ? { ...styles.chip, ...styles.chipAdded }
                      : styles.chip
                    }
                    onClick={() => {
                      if (!inList && !adding) addItemFromLibrary(item)
                    }}
                  >
                    {inList ? '✓ ' : ''}{item.item_name}
                  </button>
                )
              })}
            </div>
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
    paddingBottom: '100px',
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
  tabs: {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #f3f4f6',
    padding: '0 1rem',
  },
  tab: {
    flex: 1,
    padding: '0.75rem 0.25rem',
    fontSize: '0.8rem',
    fontWeight: '600',
    border: 'none',
    borderBottom: '3px solid transparent',
    background: 'none',
    color: '#aaa',
    cursor: 'pointer',
  },
  tabActive: {
    color: '#4f46e5',
    borderBottom: '3px solid #4f46e5',
  },
  content: {
    padding: '1rem',
    maxWidth: '480px',
    margin: '0 auto',
  },
  emptyNote: {
    fontSize: '0.9rem',
    color: '#aaa',
    textAlign: 'center',
    padding: '3rem 1rem',
    margin: 0,
  },

  // To Buy row
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#fff',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'background 0.15s ease',
  },
  itemRowTicked: {
    background: '#f0fdf4',
  },
  itemName: {
    flex: 1,
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#111',
    transition: 'color 0.15s ease',
  },
  itemNameTicked: {
    textDecoration: 'line-through',
    color: '#9ca3af',
  },
  qtyInput: {
    width: '60px',
    padding: '0.35rem 0.5rem',
    fontSize: '0.85rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  tickBtn: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    border: '2px solid #d1d5db',
    background: '#fff',
    color: '#fff',
    fontSize: '1rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'all 0.15s ease',
    padding: 0,
  },
  tickBtnActive: {
    background: '#16a34a',
    borderColor: '#16a34a',
    color: '#fff',
  },

  // Pricing row
  pricingRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#fff',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  pricingLeft: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  pricingMeta: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  priceWrapper: {
    display: 'flex',
    alignItems: 'center',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    overflow: 'hidden',
    width: '100px',
  },
  rupeeSymbol: {
    padding: '0.35rem 0.4rem',
    fontSize: '0.85rem',
    color: '#6b7280',
    background: '#f9fafb',
    borderRight: '1px solid #e5e7eb',
  },
  priceInput: {
    width: '100%',
    padding: '0.35rem 0.4rem',
    fontSize: '0.85rem',
    border: 'none',
    outline: 'none',
    textAlign: 'right',
  },

  // Save bar
  saveBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #f3f4f6',
    padding: '0.75rem 1.25rem',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
    zIndex: 40,
  },
  saveBtn: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '700',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },

  fab: {
    position: 'fixed',
    bottom: '2rem',
    left: '50%',
    transform: 'translateX(-50%)',
    padding: '0.85rem 2rem',
    fontSize: '1rem',
    fontWeight: '700',
    backgroundColor: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: '999px',
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(79,70,229,0.4)',
    zIndex: 50,
    whiteSpace: 'nowrap',
    transition: 'bottom 0.2s ease',
  },
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    zIndex: 90,
  },
  bottomSheet: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '0.75rem 1.25rem 2rem',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 100,
    maxHeight: '75vh',
    overflowY: 'auto',
  },
  handle: {
    width: '40px',
    height: '4px',
    background: '#e5e7eb',
    borderRadius: '999px',
    margin: '0 auto 1rem',
  },
  sheetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  sheetTitle: { fontSize: '1rem', fontWeight: '700', color: '#111', margin: 0 },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: '#aaa',
    cursor: 'pointer',
    padding: '0.25rem',
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
  grid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '0.5rem',
    paddingBottom: '1rem',
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
    cursor: 'default',
  },
}

export default ListPage