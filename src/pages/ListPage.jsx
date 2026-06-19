import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const SEED_ITEMS = [
  'Atta', 'Chawal', 'Dal', 'Doodh', 'Dahi',
  'Sabzi', 'Pyaaz', 'Tamatar', 'Aloo', 'Lahsun',
  'Adrak', 'Tel', 'Namak', 'Cheeni', 'Chai',
  'Sabun', 'Shampoo', 'Toothpaste', 'Eggs', 'Bread'
]

function ListPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = id === 'new'

  const [loading, setLoading] = useState(true)
  const [listId, setListId] = useState(null)
  const [householdId, setHouseholdId] = useState(null)
  const [libraryItems, setLibraryItems] = useState([])
  const [listItems, setListItems] = useState([])
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState('to_buy')
  const [showLibrary, setShowLibrary] = useState(false)

  useEffect(() => { setup() }, [])

  async function setup() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { navigate('/'); return }

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) { navigate('/'); return }
    const hid = membership.household_id
    setHouseholdId(hid)

    let lid = id

    if (isNew) {
      const { data: newList, error } = await supabase
        .from('grocery_lists')
        .insert({ household_id: hid, created_by: user.id, status: 'active' })
        .select()
        .single()
      if (error) { navigate('/'); return }
      lid = newList.id
      setListId(lid)
      window.history.replaceState(null, '', `/list/${lid}`)
    } else {
      setListId(id)
      const { data: items } = await supabase
        .from('list_items')
        .select('*')
        .eq('list_id', id)
        .order('display_order', { ascending: true })
      setListItems(items || [])
    }

    // Load or seed library
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

    setLoading(false)
  }

  async function addItem(libraryItem) {
    const currentListId = listId || id
    if (!currentListId) return

    const already = listItems.find(
      i => i.item_name.toLowerCase() === libraryItem.item_name.toLowerCase()
        && i.tab_status === 'to_buy'
    )
    if (already) return

    const newItem = {
      list_id: currentListId,
      household_item_id: libraryItem.id,
      item_name: libraryItem.item_name,
      quantity: libraryItem.last_quantity || '1',
      tab_status: 'to_buy',
      display_order: listItems.length,
    }

    const { data, error } = await supabase
      .from('list_items').insert(newItem).select().single()

    if (!error && data) {
      setListItems(prev => [...prev, data])
      setSearch('')
    }
  }

  async function addCustomItem() {
    const name = search.trim()
    if (!name) return

    const { data: libItem } = await supabase
      .from('household_items')
      .insert({ household_id: householdId, item_name: name, last_quantity: '1', times_added: 1 })
      .select().single()

    if (libItem) {
      setLibraryItems(prev => [libItem, ...prev])
      await addItem(libItem)
    }
  }

  async function updateQty(itemId, qty) {
    setListItems(prev => prev.map(i => i.id === itemId ? { ...i, quantity: qty } : i))
    await supabase.from('list_items').update({ quantity: qty }).eq('id', itemId)
  }

  async function removeItem(itemId) {
    setListItems(prev => prev.filter(i => i.id !== itemId))
    await supabase.from('list_items').delete().eq('id', itemId)
  }

  // Filter items by tab — this is the key fix
  const toBuyItems = listItems.filter(i => i.tab_status === 'to_buy')
  const pricingItems = listItems.filter(i => i.tab_status === 'pricing')
  const doneItems = listItems.filter(i => i.tab_status === 'done')

  const filteredLibrary = libraryItems.filter(item =>
    item.item_name.toLowerCase().includes(search.toLowerCase())
  )

  const showAddCustom = search.trim().length > 0 &&
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
        >
          To Buy ({toBuyItems.length})
        </button>
        <button
          style={activeTab === 'pricing' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab('pricing')}
        >
          Pricing ({pricingItems.length})
        </button>
        <button
          style={activeTab === 'done' ? { ...styles.tab, ...styles.tabActive } : styles.tab}
          onClick={() => setActiveTab('done')}
        >
          Done ({doneItems.length})
        </button>
      </div>

      {/* Tab content */}
      <div style={styles.content}>

        {/* TO BUY TAB */}
        {activeTab === 'to_buy' && (
          <div>
            {toBuyItems.length === 0 ? (
              <p style={styles.emptyNote}>
                No items yet. Tap "+ Add items" below to add from the library.
              </p>
            ) : (
              toBuyItems.map(item => (
                <div key={item.id} style={styles.itemRow}>
                  <span style={styles.itemName}>{item.item_name}</span>
                  <input
                    style={styles.qtyInput}
                    value={item.quantity || ''}
                    onChange={e => updateQty(item.id, e.target.value)}
                    placeholder="Qty"
                  />
                  <button style={styles.removeBtn} onClick={() => removeItem(item.id)}>
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <p style={styles.emptyNote}>
            Items you've bought appear here. We build this on Day 6.
          </p>
        )}

        {/* DONE TAB */}
        {activeTab === 'done' && (
          <p style={styles.emptyNote}>
            Completed items appear here. We build this on Day 6.
          </p>
        )}

      </div>

      {/* Item Library drawer */}
      {showLibrary && (
        <div style={styles.libraryDrawer}>
          <div style={styles.libraryHeader}>
            <p style={styles.libraryTitle}>Add items</p>
            <button style={styles.closeBtn} onClick={() => setShowLibrary(false)}>✕</button>
          </div>

          <input
            style={styles.searchInput}
            placeholder="Search or type a new item..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />

          {showAddCustom && (
            <button style={styles.addCustomBtn} onClick={addCustomItem}>
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
                  style={inList ? { ...styles.chip, ...styles.chipAdded } : styles.chip}
                  onClick={() => addItem(item)}
                >
                  {inList ? '✓ ' : ''}{item.item_name}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Floating Add Items button */}
      {activeTab === 'to_buy' && (
        <button style={styles.fab} onClick={() => setShowLibrary(true)}>
          + Add items
        </button>
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
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    margin: 0,
    color: '#111',
  },
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
  itemRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#fff',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  itemName: {
    flex: 1,
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#111',
  },
  qtyInput: {
    width: '60px',
    padding: '0.35rem 0.5rem',
    fontSize: '0.85rem',
    border: '1px solid #e5e7eb',
    borderRadius: '8px',
    textAlign: 'center',
  },
  removeBtn: {
    background: 'none',
    border: 'none',
    color: '#ccc',
    fontSize: '1rem',
    cursor: 'pointer',
    padding: '0.25rem',
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
  },
  libraryDrawer: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderRadius: '20px 20px 0 0',
    padding: '1.25rem',
    boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
    zIndex: 100,
    maxHeight: '70vh',
    overflowY: 'auto',
  },
  libraryHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem',
  },
  libraryTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#111',
    margin: 0,
  },
  closeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '1.1rem',
    color: '#aaa',
    cursor: 'pointer',
  },
  searchInput: {
    width: '100%',
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
    boxSizing: 'border-box',
    marginBottom: '0.75rem',
  },
  addCustomBtn: {
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
  },
  grid: {
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
}

export default ListPage