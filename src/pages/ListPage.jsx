import React, { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { sendPush } from '../lib/push'
import { supabase } from '../lib/supabase'
import LoadingScreen from '../components/LoadingScreen'
import { useSaveDelight } from '../components/SaveDelight'
import { Trash2, Check, X, Undo2 } from 'lucide-react'

const SEED_ITEMS = [
  'Atta', 'Doodh', 'Chawal', 'Dal', 'Chini', 'Namak', 'Tel', 'Sabzi',
  'Pyaaz', 'Tamatar', 'Adrak', 'Lahsun', 'Haldi', 'Jeera', 'Dhaniya',
  'Sabun', 'Shampoo', 'Chai Patti', 'Biscuit', 'Bread'
]

function firstName(fullName) {
  if (!fullName) return ''
  return fullName.split(' ')[0]
}

function timeAgo(isoString) {
  if (!isoString) return ''
  const diff = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)} min ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hr ago`
  return `${Math.floor(diff / 86400)} day ago`
}

function SwipeToDelete({ children, onDelete, isOpen, onOpen, onClose }) {
  const startXRef = useRef(null)
  const startYRef = useRef(null)
  const isDraggingRef = useRef(false)
  const THRESHOLD = 50

  function onTouchStart(e) {
    startXRef.current = e.touches[0].clientX
    startYRef.current = e.touches[0].clientY
    isDraggingRef.current = false
  }

  function onTouchMove(e) {
    if (startXRef.current === null) return
    const diffX = startXRef.current - e.touches[0].clientX
    const diffY = Math.abs(startYRef.current - e.touches[0].clientY)
    if (Math.abs(diffX) > diffY && Math.abs(diffX) > 10) {
      isDraggingRef.current = true
      e.preventDefault()
    }
  }

  function onTouchEnd(e) {
    if (!isDraggingRef.current || startXRef.current === null) {
      startXRef.current = null
      isDraggingRef.current = false
      return
    }
    const diffX = startXRef.current - e.changedTouches[0].clientX
    if (diffX > THRESHOLD) {
      onOpen()
    } else if (diffX < -20) {
      onClose()
    }
    startXRef.current = null
    isDraggingRef.current = false
  }

  function onMouseDown(e) {
    startXRef.current = e.clientX
    isDraggingRef.current = false
  }

  function onMouseUp(e) {
    if (startXRef.current === null) return
    const diffX = startXRef.current - e.clientX
    if (Math.abs(diffX) > 10) {
      if (diffX > THRESHOLD) onOpen()
      else if (diffX < -20) onClose()
    }
    startXRef.current = null
  }

  return (
    <div style={swipeStyles.wrapper}>
      <div style={swipeStyles.deleteSlot}>
        <button
          style={{ ...swipeStyles.deleteBtn, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
          onTouchEnd={e => { e.stopPropagation(); onClose(); onDelete() }}
          onClick={() => { onClose(); onDelete() }}
        >
          <Trash2 size={14} /> Delete
        </button>
      </div>
      <div
        style={{
          ...swipeStyles.slider,
          transform: isOpen ? 'translateX(-88px)' : 'translateX(0)',
        }}
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

const swipeStyles = {
  wrapper: {
    position: 'relative',
    marginBottom: '0.5rem',
  },
  deleteSlot: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: '88px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#ef4444',
    borderRadius: '12px',
    zIndex: 0,
  },
  deleteBtn: {
    background: 'none',
    border: 'none',
    color: '#fff',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '0.5rem',
  },
  slider: {
    position: 'relative',
    zIndex: 1,
    transition: 'transform 0.22s ease',
    willChange: 'transform',
  },
}

// ── Animated list loading screen ─────────────────────────────────────────────
function ListLoadingScreen() {
  const items = ['🥛 Doodh', '🧅 Pyaaz', '🍅 Tamatar', '🫙 Tel', '🍚 Chawal', '🧴 Shampoo']
  const [visible, setVisible] = React.useState([])
  const [tick, setTick] = React.useState(false)

  React.useEffect(() => {
    let i = 0
    const timer = setInterval(() => {
      if (i < items.length) {
        setVisible(v => [...v, i])
        i++
      } else {
        clearInterval(timer)
      }
    }, 280)
    return () => clearInterval(timer)
  }, [])

  React.useEffect(() => {
    const t = setInterval(() => setTick(x => !x), 600)
    return () => clearInterval(t)
  }, [])

  return (
    <div style={listLoadStyles.page}>
      <div style={listLoadStyles.card}>
        <p style={listLoadStyles.title}>Loading your list</p>
        <p style={listLoadStyles.sub}>Fetching items from your household...</p>
        <div style={listLoadStyles.itemList}>
          {items.map((item, i) => (
            <div
              key={i}
              style={{
                ...listLoadStyles.item,
                opacity: visible.includes(i) ? 1 : 0,
                transform: visible.includes(i) ? 'translateX(0)' : 'translateX(-16px)',
                transition: 'all 0.3s ease',
              }}
            >
              <div style={{
                ...listLoadStyles.checkbox,
                background: visible.includes(i) && i % 3 === 0 ? '#4f46e5' : '#fff',
                borderColor: visible.includes(i) && i % 3 === 0 ? '#4f46e5' : '#d1d5db',
              }}>
                {visible.includes(i) && i % 3 === 0 && (
                  <span style={{ color: '#fff', fontSize: '0.6rem', fontWeight: '700' }}>✓</span>
                )}
              </div>
              <span style={listLoadStyles.itemName}>{item}</span>
              <div style={{ ...listLoadStyles.shimmer, width: `${40 + (i * 13) % 30}px` }} />
            </div>
          ))}
        </div>
        <div style={listLoadStyles.dotsRow}>
          {[0,1,2].map(i => (
            <div key={i} style={{
              ...listLoadStyles.dot,
              background: tick && i === 1 ? '#4f46e5' : (!tick && i !== 1) ? '#4f46e5' : '#e0e7ff',
            }} />
          ))}
        </div>
      </div>
    </div>
  )
}

const listLoadStyles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: '"Inter", sans-serif',
  },
  card: {
    background: '#fff',
    borderRadius: '20px',
    padding: '1.75rem 1.5rem',
    width: '90%',
    maxWidth: '340px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  title: {
    fontSize: '1.1rem',
    fontWeight: '700',
    color: '#111',
    margin: 0,
  },
  sub: {
    fontSize: '0.8rem',
    color: '#9ca3af',
    margin: '0 0 0.75rem',
  },
  itemList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.6rem',
    marginBottom: '1rem',
  },
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
  },
  checkbox: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    border: '2px solid #d1d5db',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.3s ease',
  },
  itemName: {
    fontSize: '0.9rem',
    color: '#374151',
    flex: 1,
  },
  shimmer: {
    height: '8px',
    background: '#f3f4f6',
    borderRadius: '4px',
  },
  dotsRow: {
    display: 'flex',
    justifyContent: 'center',
    gap: '0.4rem',
  },
  dot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    transition: 'background 0.4s ease',
  },
}

// ── Helper: recompute the true total and write it to
//    grocery_lists.total_amount. Called unconditionally (active OR
//    completed) any time a price is entered, a Done row is edited, or a
//    lump-sum group is created/undone.
//    FIX D — closes the "stale total after post-completion edit" bug.
//    FIX (lump-sum) — sums from household_bucket instead of
//    list_items.price_entered. Grouped items deliberately have
//    price_entered = null (per design), so summing price_entered alone
//    silently excluded every lump-sum group from grocery_lists.total_amount
//    — which is what History's list cards and Home's completed-list card
//    both read. household_bucket already holds one correctly-amounted row
//    per individually-priced item AND per group (both tagged with
//    source_id = this list's id), so summing there is the single source
//    of truth that covers both cases without special-casing either.
async function recalcListTotal(listId) {
  if (!listId) return 0
  const { data: bucketRows } = await supabase
    .from('household_bucket')
    .select('amount')
    .eq('source_type', 'grocery_list')
    .eq('source_id', listId)

  const total = (bucketRows || []).reduce(
    (sum, i) => sum + (parseFloat(i.amount) || 0), 0
  )

  await supabase
    .from('grocery_lists')
    .update({ total_amount: total })
    .eq('id', listId)

  return total
}

// FIX H — shared completion check, called from BOTH enterPrice() (a fresh
// Pricing-tab price entry) AND saveDoneEdits() (correcting an already-Done
// item). Previously the completion check only lived inside enterPrice(),
// so a list where every item had already reached "done" — but which never
// got marked completed due to the old doneEdits guard bug — had no way to
// self-heal. Editing a Done row and saving now also re-checks completion,
// so a stuck list fixes itself the next time anyone touches it, instead of
// needing a manual SQL update.
//
// Returns { completed: boolean, total: number } so callers can decide
// whether to fire the "🎉 List complete!" push notification.
async function checkAndCompleteList(listId, uid) {
  if (!listId) return { completed: false, total: 0 }

  const { count: totalCount } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId)

  const { count: doneCount } = await supabase
    .from('list_items')
    .select('id', { count: 'exact', head: true })
    .eq('list_id', listId)
    .eq('tab_status', 'done')

  const total = await recalcListTotal(listId)

  if (!(totalCount > 0 && totalCount === doneCount)) {
    return { completed: false, total }
  }

  const now = new Date().toISOString()

  // Conditional on status = 'active' so this is safe to call from
  // multiple places / multiple devices without double-firing.
  const { data: completedRows } = await supabase
    .from('grocery_lists')
    .update({
      status: 'completed',
      completed_at: now,
      total_amount: total,
    })
    .eq('id', listId)
    .eq('status', 'active')
    .select('id')

  return { completed: !!(completedRows && completedRows.length > 0), total }
}

function ListPage() {
  const navigate = useNavigate()
  const { id } = useParams()
  const [searchParams] = useSearchParams()
  const isNew = id === 'new'
  const { fire: fireSaveDelight, Overlay: SaveDelightOverlay } = useSaveDelight()

  const [loading, setLoading] = useState(true)
  const [listId, setListId] = useState(isNew ? null : id)
  const [libraryItems, setLibraryItems] = useState([])
  const [listItems, setListItems] = useState([])
  const [profiles, setProfiles] = useState({})
  const [search, setSearch] = useState('')
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'to_buy')
  const [showLibrary, setShowLibrary] = useState(false)
  const [adding, setAdding] = useState(false)
  const [savingChanges, setSavingChanges] = useState(false)
  const [listStatus, setListStatus] = useState('active')
  const [doneEdits, setDoneEdits] = useState({})
  const [savingDoneEdits, setSavingDoneEdits] = useState(false)
  const [dupWarning, setDupWarning] = useState('')
  const [pricingInputs, setPricingInputs] = useState({})
  const [savingPricing, setSavingPricing] = useState(false)
  const [swipedItemId, setSwipedItemId] = useState(null)

  // NEW — lump-sum grouping: select multiple Pricing-tab items and enter
  // one combined total instead of pricing each individually.
  const [pricingSelected, setPricingSelected] = useState({}) // { [itemId]: true }
  const [showLumpModal, setShowLumpModal] = useState(false)
  const [lumpAmount, setLumpAmount] = useState('')
  const [savingLump, setSavingLump] = useState(false)
  const [groupTotals, setGroupTotals] = useState({}) // { [household_bucket.id]: amount }
  const [undoingGroupId, setUndoingGroupId] = useState(null)

  const listIdRef = useRef(isNew ? null : id)
  const householdIdRef = useRef(null)
  const userIdRef = useRef(null)
  const channelRef = useRef(null)

  // FIX G — re-run setup whenever the route's :id changes, and reset all
  // list-scoped state first. Previously this only ran once on mount ([]),
  // so leftover doneEdits/pricingInputs/etc. from a prior list could in
  // theory bleed into a newly-opened list in the same session.
  useEffect(() => {
    setListItems([])
    setDoneEdits({})
    setPricingInputs({})
    setDupWarning('')
    setSwipedItemId(null)
    setListStatus('active')
    setPricingSelected({})
    setShowLumpModal(false)
    setLumpAmount('')
    setGroupTotals({})
    setLoading(true)
    setListId(isNew ? null : id)
    listIdRef.current = isNew ? null : id

    setup()
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    listIdRef.current = listId
    if (listId) subscribeToListItems(listId)
  }, [listId])

  // ── UPDATED: now also listens for grocery_lists status changes ──
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
          loadGroupTotals(data || [])
        }
      )
      .on(
        // if other member completes the list while you have it open,
        // your listStatus updates in real time without needing a refresh
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'grocery_lists', filter: `id=eq.${lid}` },
        (payload) => {
          if (payload.new && payload.new.status) {
            setListStatus(payload.new.status)
          }
        }
      )
      .subscribe()
    channelRef.current = channel
  }

  // NEW — grouped (lump-sum) items have no individual price_entered, so
  // their display amount lives on the shared household_bucket row instead.
  // This fetches those amounts by price_group_id so the Done tab can show
  // "🧾 3 items — ₹850" style cards.
  async function loadGroupTotals(items) {
    const groupIds = [...new Set(items.filter(i => i.price_group_id).map(i => i.price_group_id))]
    if (groupIds.length === 0) { setGroupTotals({}); return }
    const { data } = await supabase
      .from('household_bucket')
      .select('id, amount')
      .in('id', groupIds)
    const map = {}
    ;(data || []).forEach(row => { map[row.id] = parseFloat(row.amount) || 0 })
    setGroupTotals(map)
  }

  async function setup() {
    // PERF — see Home.jsx for why getSession() replaces getUser() here.
    const { data: { session } } = await supabase.auth.getSession()
    const user = session?.user
    if (!user) { navigate('/'); return }
    userIdRef.current = user.id

    const { data: membership } = await supabase
      .from('household_members')
      .select('household_id')
      .eq('user_id', user.id)
      .maybeSingle()

    if (!membership) { navigate('/'); return }
    householdIdRef.current = membership.household_id

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
      loadGroupTotals(items || [])

      // also fetch notification_seen_by so we can mark this user as seen
      const { data: listRow } = await supabase
        .from('grocery_lists')
        .select('status, notification_seen_by')
        .eq('id', id)
        .maybeSingle()

      if (listRow) {
        setListStatus(listRow.status)

        // mark this list as seen by current user
        const seenBy = listRow.notification_seen_by || []
        if (!seenBy.includes(user.id)) {
          await supabase
            .from('grocery_lists')
            .update({ notification_seen_by: [...seenBy, user.id] })
            .eq('id', id)
        }
      }
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
      const { count: doneCount } = await supabase
        .from('list_items')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', existing.id)
        .eq('tab_status', 'done')

      const { count: totalCount } = await supabase
        .from('list_items')
        .select('id', { count: 'exact', head: true })
        .eq('list_id', existing.id)

      if (totalCount && totalCount > 0 && (!doneCount || doneCount < totalCount)) {
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
      } else {
        await supabase
          .from('grocery_lists')
          .update({ status: 'abandoned' })
          .eq('id', existing.id)
      }
    }

    // creator is auto-marked as seen when list is created
    const { data: newList, error } = await supabase
      .from('grocery_lists')
      .insert({
        household_id: hid,
        created_by: uid,
        status: 'active',
        notification_seen_by: [uid],
      })
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

    const alreadyLocal = listItems.find(
      i => i.item_name.toLowerCase() === libraryItem.item_name.toLowerCase()
        && i.tab_status === 'to_buy'
    )
    const { data: alreadyInDb } = await supabase
      .from('list_items')
      .select('id')
      .eq('list_id', currentListId)
      .eq('tab_status', 'to_buy')
      .ilike('item_name', libraryItem.item_name)
      .maybeSingle()

    if (alreadyLocal || alreadyInDb) {
      setDupWarning(libraryItem.item_name)
      clearTimeout(window.__dupTimer)
      window.__dupTimer = setTimeout(() => setDupWarning(''), 3000)
      setAdding(false)
      return
    }

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

      const currentItems = listItems.filter(i => i.tab_status === 'to_buy')
      if (currentItems.length === 0) {
        const { data: profileData } = await supabase
          .from('profiles').select('full_name').eq('id', userIdRef.current).maybeSingle()
        const name = profileData?.full_name?.split(' ')[0] || 'Someone'
        await sendPush({
          householdId: householdIdRef.current,
          senderId: userIdRef.current,
          title: 'New grocery list started',
          body: `${name} started a list. Tap to add items.`,
          url: `/list/${listIdRef.current}`,
        })
      }
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

    const remaining = toBuyItems.filter(i => !tickedIds.includes(i.id)).length
    const { data: profileData } = await supabase
      .from('profiles').select('full_name').eq('id', uid).maybeSingle()
    const name = profileData?.full_name?.split(' ')[0] || 'Someone'
    await sendPush({
      householdId: householdIdRef.current,
      senderId: uid,
      title: 'Items bought',
      body: `${name} bought ${tickedIds.length} item${tickedIds.length > 1 ? 's' : ''}. ${remaining} left to price.`,
      url: `/list/${listIdRef.current}?tab=pricing`,
    })

    setSavingChanges(false)
  }

  async function enterPrice(item, priceValue) {
    const price = parseFloat(priceValue)
    if (!priceValue || isNaN(price) || price <= 0) return

    const uid = userIdRef.current
    const hid = householdIdRef.current
    const currentListId = listIdRef.current
    const now = new Date().toISOString()

    setListItems(prev =>
      prev.map(i =>
        i.id === item.id
          ? { ...i, tab_status: 'done', price_entered: price, price_entered_by: uid, price_entered_at: now }
          : i
      )
    )

    await supabase
      .from('list_items')
      .update({
        price_entered: price,
        price_entered_by: uid,
        price_entered_at: now,
        tab_status: 'done',
      })
      .eq('id', item.id)

    // FIX A — upsert keyed on list_item_id instead of a blind insert.
    // Combined with the DB unique constraint (see migration SQL), this makes
    // it structurally impossible to get two household_bucket rows for the
    // same item, no matter how many times enterPrice() runs for it.
    await supabase
      .from('household_bucket')
      .upsert({
        household_id: hid,
        source_type: 'grocery_list',
        source_id: currentListId,
        list_item_id: item.id,
        item_name: item.item_name,
        quantity: item.quantity,
        amount: price,
        bought_by: item.ticked_by,
        bought_at: now,
      }, { onConflict: 'list_item_id' })

    // Day 17 — Save Delight: fire right after the write succeeds, never
    // before, so the animation/sound can't delay the actual save.
    fireSaveDelight(price)

    // FIX C — the old code had:
    //   if (Object.keys(doneEdits).length > 0) return
    // which silently skipped the completion check (and therefore could
    // permanently block auto-complete) if any Done row was mid-edit,
    // including a *stuck* edit nobody ever saved or cancelled.
    // We now always evaluate completion, via the shared checkAndCompleteList
    // helper (FIX H) — same logic used by saveDoneEdits(), so a list can
    // self-heal from either a fresh price entry OR a Done-tab correction.
    const { completed, total } = await checkAndCompleteList(currentListId, uid)

    if (completed) {
      setListStatus('completed')

      const { data: completionProfile } = await supabase
        .from('profiles').select('full_name').eq('id', uid).maybeSingle()
      const completionName = completionProfile?.full_name?.split(' ')[0] || 'Someone'
      await sendPush({
        householdId: hid,
        senderId: uid,
        title: '🎉 List complete!',
        body: `${completionName} finished the list. Total: ₹${total.toFixed(0)}.`,
        url: `/list/${currentListId}?tab=done`,
      })
    }
  }

  async function saveDoneEdits() {
    if (savingDoneEdits) return
    setSavingDoneEdits(true)

    const editedIds = Object.keys(doneEdits)
    if (editedIds.length === 0) { setSavingDoneEdits(false); return }

    for (const itemId of editedIds) {
      const { qty, price } = doneEdits[itemId]
      const parsedPrice = parseFloat(price)
      if (isNaN(parsedPrice) || parsedPrice <= 0) continue

      await supabase
        .from('list_items')
        .update({ quantity: qty, price_entered: parsedPrice })
        .eq('id', itemId)

      await supabase
        .from('household_bucket')
        .update({ quantity: qty, amount: parsedPrice })
        .eq('list_item_id', itemId)

      setListItems(prev =>
        prev.map(i =>
          i.id === itemId
            ? { ...i, quantity: qty, price_entered: parsedPrice }
            : i
        )
      )
    }

    // FIX D + FIX H — re-check completion (which also recalculates the
    // total internally) every time a Done row is corrected, whether the
    // list is currently active or already completed. This is the
    // self-healing path: a list that got stuck "active" with all items
    // already done (e.g. from the old bug, or any future edge case we
    // haven't thought of) will correct itself the next time anyone edits
    // and saves a Done-tab item — no manual SQL required.
    const uid = userIdRef.current
    const hid = householdIdRef.current
    const currentListId = listIdRef.current
    const { completed, total } = await checkAndCompleteList(currentListId, uid)

    if (completed) {
      setListStatus('completed')
      const { data: completionProfile } = await supabase
        .from('profiles').select('full_name').eq('id', uid).maybeSingle()
      const completionName = completionProfile?.full_name?.split(' ')[0] || 'Someone'
      await sendPush({
        householdId: hid,
        senderId: uid,
        title: '🎉 List complete!',
        body: `${completionName} finished the list. Total: ₹${total.toFixed(0)}.`,
        url: `/list/${currentListId}?tab=done`,
      })
    }

    setDoneEdits({})
    setSavingDoneEdits(false)
  }

  // FIX F — explicit Cancel for the Done tab, so an accidental tap on a
  // row can be backed out of instead of silently lingering in doneEdits
  // forever (which was the direct cause of the "list stuck active" bug
  // reported today).
  function cancelDoneEdits() {
    setDoneEdits({})
  }

  async function savePricingItems() {
    if (savingPricing) return
    const entries = Object.entries(pricingInputs).filter(([, v]) => v && parseFloat(v) > 0)
    if (entries.length === 0) return
    setSavingPricing(true)

    for (const [itemId, priceValue] of entries) {
      const item = pricingItems.find(i => i.id === itemId)
      if (!item) continue
      await enterPrice(item, priceValue)
    }

    const uid = userIdRef.current
    const hid = householdIdRef.current
    const currentListId = listIdRef.current
    const { data: profileData } = await supabase
      .from('profiles').select('full_name').eq('id', uid).maybeSingle()
    const senderName = profileData?.full_name?.split(' ')[0] || 'Someone'
    const { data: allDone } = await supabase
      .from('list_items')
      .select('price_entered')
      .eq('list_id', currentListId)
      .eq('tab_status', 'done')
    const runningTotal = (allDone || []).reduce((sum, i) => sum + (parseFloat(i.price_entered) || 0), 0)
    await sendPush({
      householdId: hid,
      senderId: uid,
      title: 'Prices entered',
      body: `${senderName} entered prices. Total so far: ₹${runningTotal.toFixed(0)}.`,
      url: `/list/${currentListId}?tab=done`,
    })

    setPricingInputs({})
    setSavingPricing(false)
  }

  // NEW — lump-sum grouping functions

  function toggleLumpSelect(itemId) {
    setPricingSelected(prev => {
      const next = { ...prev }
      if (next[itemId]) {
        delete next[itemId]
      } else {
        next[itemId] = true
        // Selecting an item for group pricing is mutually exclusive with
        // typing an individual price for it — clear any typed value so
        // there's no ambiguity about which path wins.
        setPricingInputs(p => {
          const np = { ...p }
          delete np[itemId]
          return np
        })
      }
      return next
    })
  }

  async function saveLumpSum() {
    const parsed = parseFloat(lumpAmount)
    const selectedIds = Object.keys(pricingSelected)
    if (!lumpAmount || isNaN(parsed) || parsed <= 0 || selectedIds.length === 0 || savingLump) return
    setSavingLump(true)

    const uid = userIdRef.current
    const hid = householdIdRef.current
    const currentListId = listIdRef.current
    const now = new Date().toISOString()
    const selectedItems = pricingItems.filter(i => selectedIds.includes(i.id))
    const groupLabel = selectedItems.length === 1
      ? selectedItems[0].item_name
      : `${selectedItems.length} items (${selectedItems.map(i => i.item_name).join(', ')})`

    // One shared household_bucket row for the whole group — this is the
    // "lump total" your chosen design keeps items individually priceless
    // against. list_item_id stays null here since it's not tied to one item.
    const { data: bucketRow, error: bucketError } = await supabase
      .from('household_bucket')
      .insert({
        household_id: hid,
        source_type: 'grocery_list',
        source_id: currentListId,
        category: 'Grocery',
        item_name: groupLabel,
        quantity: String(selectedItems.length),
        amount: parsed,
        bought_by: uid,
        bought_at: now,
      })
      .select()
      .single()

    if (bucketError || !bucketRow) {
      setSavingLump(false)
      return
    }

    await supabase
      .from('list_items')
      .update({
        tab_status: 'done',
        price_group_id: bucketRow.id,
        price_entered: null,
        price_entered_by: uid,
        price_entered_at: now,
      })
      .in('id', selectedIds)

    setListItems(prev =>
      prev.map(i =>
        selectedIds.includes(i.id)
          ? { ...i, tab_status: 'done', price_group_id: bucketRow.id, price_entered: null, price_entered_by: uid, price_entered_at: now }
          : i
      )
    )
    setGroupTotals(prev => ({ ...prev, [bucketRow.id]: parsed }))

    fireSaveDelight(parsed)

    // Same self-healing completion check used everywhere else — a lump
    // group can complete the list just as much as individually priced items.
    const { completed, total } = await checkAndCompleteList(currentListId, uid)
    if (completed) {
      setListStatus('completed')
      const { data: completionProfile } = await supabase
        .from('profiles').select('full_name').eq('id', uid).maybeSingle()
      const completionName = completionProfile?.full_name?.split(' ')[0] || 'Someone'
      await sendPush({
        householdId: hid,
        senderId: uid,
        title: '🎉 List complete!',
        body: `${completionName} finished the list. Total: ₹${total.toFixed(0)}.`,
        url: `/list/${currentListId}?tab=done`,
      })
    }

    setPricingSelected({})
    setLumpAmount('')
    setShowLumpModal(false)
    setSavingLump(false)
  }

  // NEW — Option A: undo dissolves the whole group at any time (not just
  // right after grouping). Deletes the shared lump-sum entry, sends every
  // item in that group back to the Pricing tab, un-links them so they can
  // be individually priced or re-grouped differently.
  async function undoGroup(groupId) {
    if (undoingGroupId) return
    setUndoingGroupId(groupId)

    const groupItemIds = listItems.filter(i => i.price_group_id === groupId).map(i => i.id)

    await supabase
      .from('list_items')
      .update({
        tab_status: 'pricing',
        price_group_id: null,
        price_entered: null,
        price_entered_by: null,
        price_entered_at: null,
      })
      .in('id', groupItemIds)

    await supabase
      .from('household_bucket')
      .delete()
      .eq('id', groupId)

    setListItems(prev =>
      prev.map(i =>
        groupItemIds.includes(i.id)
          ? { ...i, tab_status: 'pricing', price_group_id: null, price_entered: null, price_entered_by: null, price_entered_at: null }
          : i
      )
    )
    setGroupTotals(prev => {
      const next = { ...prev }
      delete next[groupId]
      return next
    })

    // If the list had already completed, undoing a group means it's no
    // longer fully done — reopen it rather than leaving a "completed"
    // list with items sitting back in Pricing.
    const currentListId = listIdRef.current
    if (listStatus === 'completed') {
      await supabase
        .from('grocery_lists')
        .update({ status: 'active', completed_at: null })
        .eq('id', currentListId)
      setListStatus('active')
    }
    await recalcListTotal(currentListId)

    setUndoingGroupId(null)
  }

  const toBuyItems = listItems.filter(i => i.tab_status === 'to_buy')
  const pricingItems = listItems.filter(i => i.tab_status === 'pricing')
  const doneItems = listItems.filter(i => i.tab_status === 'done')
  const anyTicked = toBuyItems.some(i => i.is_ticked)

  // NEW — split Done items into individually-priced vs grouped-by-lump-sum
  const individualDoneItems = doneItems.filter(i => !i.price_group_id)
  const groupedDoneItems = (() => {
    const groups = {}
    doneItems.filter(i => i.price_group_id).forEach(i => {
      if (!groups[i.price_group_id]) groups[i.price_group_id] = []
      groups[i.price_group_id].push(i)
    })
    return groups
  })()

  const filteredLibrary = libraryItems.filter(item =>
    item.item_name.toLowerCase().includes(search.toLowerCase())
  )

  const showAddCustomChip = search.trim().length > 0 &&
    !filteredLibrary.find(i => i.item_name.toLowerCase() === search.trim().toLowerCase())

  if (loading) {
    return <LoadingScreen type="list" />
  }

  return (
    <div style={styles.page}>

      {/* Header */}
      <div style={styles.header}>
        <button style={styles.backBtn} onClick={() => navigate('/')}>← Back</button>
        <h1 style={styles.title}>Grocery List</h1>
      </div>

      {/* Completed banner */}
      {listStatus === 'completed' && (
        <div style={styles.completedBanner}>
          <span style={styles.completedBannerIcon}>🎉</span>
          <span style={styles.completedBannerText}>This list is complete — it's now read-only.</span>
        </div>
      )}

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

        {/* TO BUY TAB */}
        {activeTab === 'to_buy' && (
          <div>
            {dupWarning !== '' && (
              <div style={styles.dupBanner}>
                <span style={styles.dupBannerText}>
                  "{dupWarning}" is already in the list.
                </span>
                <button
                  style={styles.dupBannerDismiss}
                  onClick={() => setDupWarning('')}
                ><X size={14} /></button>
              </div>
            )}

            {toBuyItems.length === 0 ? (
              <p style={styles.emptyNote}>No items yet. Tap "+ Add items" below.</p>
            ) : (
              toBuyItems.map(item => (
                <SwipeToDelete
                  key={item.id}
                  onDelete={() => removeItem(item.id)}
                  isOpen={swipedItemId === item.id}
                  onOpen={() => setSwipedItemId(item.id)}
                  onClose={() => setSwipedItemId(null)}
                >
                  <div
                    style={item.is_ticked
                      ? { ...styles.itemRow, ...styles.itemRowTicked, marginBottom: 0 }
                      : { ...styles.itemRow, marginBottom: 0 }
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
                      onTouchStart={e => {
                        e.stopPropagation()
                        e.currentTarget._touchFired = true
                      }}
                      onTouchEnd={e => {
                        e.stopPropagation()
                        e.preventDefault()
                        if (listStatus !== 'completed') toggleTick(item)
                      }}
                      onMouseDown={e => e.stopPropagation()}
                      onMouseUp={e => {
                        e.stopPropagation()
                        if (e.currentTarget._touchFired) {
                          e.currentTarget._touchFired = false
                          return
                        }
                        if (listStatus !== 'completed') toggleTick(item)
                      }}
                      aria-label={item.is_ticked ? 'Untick item' : 'Tick item'}
                      disabled={listStatus === 'completed'}
                    >
                      {item.is_ticked ? <Check size={16} strokeWidth={3} /> : ''}
                    </button>
                  </div>
                </SwipeToDelete>
              ))
            )}
          </div>
        )}

        {/* PRICING TAB */}
        {activeTab === 'pricing' && (
          <div>
            {pricingItems.length === 0 ? (
              <p style={styles.emptyNote}>
                No items here yet. Tick items in To Buy and tap Save changes.
              </p>
            ) : (
              pricingItems.map(item => {
                const isLumpSelected = !!pricingSelected[item.id]
                return (
                <div key={item.id} style={isLumpSelected ? { ...styles.pricingRow, ...styles.pricingRowSelected } : styles.pricingRow}>
                  {/* NEW — checkbox to select this item for a combined
                      lump-sum total instead of pricing it individually */}
                  {listStatus !== 'completed' && (
                    <button
                      style={isLumpSelected ? { ...styles.lumpCheckbox, ...styles.lumpCheckboxActive } : styles.lumpCheckbox}
                      onClick={() => toggleLumpSelect(item.id)}
                      aria-label={isLumpSelected ? 'Deselect for combined total' : 'Select for combined total'}
                    >
                      {isLumpSelected ? <Check size={14} strokeWidth={3} /> : ''}
                    </button>
                  )}
                  <div style={styles.pricingLeft}>
                    <span style={styles.itemName}>{item.item_name}</span>
                    <span style={styles.pricingMeta}>
                      {isLumpSelected
                        ? 'Selected for combined total'
                        : (profiles[item.ticked_by]
                          ? `Bought by ${firstName(profiles[item.ticked_by])}`
                          : 'Bought')
                      }
                      {!isLumpSelected && item.ticked_at ? ` · ${timeAgo(item.ticked_at)}` : ''}
                    </span>
                  </div>
                  <input
                    style={styles.qtyInput}
                    value={item.quantity || ''}
                    onChange={e => updateQty(item.id, e.target.value)}
                    placeholder="Qty"
                    disabled={isLumpSelected}
                  />
                  <div style={styles.priceWrapper}>
                    <span style={styles.rupeeSymbol}>₹</span>
                    <input
                      style={styles.priceInput}
                      type="number"
                      placeholder={listStatus === 'completed' ? '—' : isLumpSelected ? 'grouped' : 'Price'}
                      min="0"
                      value={pricingInputs[item.id] || ''}
                      onChange={e => {
                        if (listStatus === 'completed') return
                        setPricingInputs(prev => ({ ...prev, [item.id]: e.target.value }))
                      }}
                      readOnly={listStatus === 'completed' || isLumpSelected}
                      disabled={isLumpSelected}
                    />
                  </div>
                  {/* Move back to To Buy button */}
                  {listStatus !== 'completed' && (
                    <button
                      style={styles.moveBackBtn}
                      title="Move back to To Buy"
                      onClick={async () => {
                        // FIX B — a real "undo." Previously this only reset
                        // tab_status/ticked_by/ticked_at/is_ticked, leaving
                        // any already-entered price (and its household_bucket
                        // row) behind. If the item was priced again later,
                        // that created a second household_bucket row for the
                        // same item — the exact cause of the ₹20→₹40
                        // double-counting bug reported today. Now, moving
                        // back fully clears the price fields AND removes the
                        // household_bucket row, so the item looks exactly
                        // like it was never priced.
                        setListItems(prev =>
                          prev.map(i => i.id === item.id
                            ? {
                                ...i,
                                tab_status: 'to_buy',
                                ticked_by: null,
                                ticked_at: null,
                                is_ticked: false,
                                price_entered: null,
                                price_entered_by: null,
                                price_entered_at: null,
                              }
                            : i
                          )
                        )
                        await supabase
                          .from('list_items')
                          .update({
                            tab_status: 'to_buy',
                            ticked_by: null,
                            ticked_at: null,
                            is_ticked: false,
                            price_entered: null,
                            price_entered_by: null,
                            price_entered_at: null,
                          })
                          .eq('id', item.id)
                        await supabase
                          .from('household_bucket')
                          .delete()
                          .eq('list_item_id', item.id)
                        setPricingInputs(prev => {
                          const next = { ...prev }
                          delete next[item.id]
                          return next
                        })
                        setPricingSelected(prev => {
                          const next = { ...prev }
                          delete next[item.id]
                          return next
                        })
                        // Total may have changed if this item had already
                        // been priced once before being moved back.
                        await recalcListTotal(listIdRef.current)
                      }}
                    >
                      <Undo2 size={16} />
                    </button>
                  )}
                </div>
              )})
            )}
          </div>
        )}

        {/* DONE TAB */}
        {activeTab === 'done' && (
          <div>
            {doneItems.length === 0 ? (
              <p style={styles.emptyNote}>
                No completed items yet. Enter prices in the Pricing tab.
              </p>
            ) : (
              <>
                <div style={styles.totalBar}>
                  <span style={styles.totalLabel}>Total so far</span>
                  <span style={styles.totalAmount}>
                    ₹{(
                      individualDoneItems.reduce((sum, i) => {
                        const edited = doneEdits[i.id]
                        const price = edited ? parseFloat(edited.price) || 0 : parseFloat(i.price_entered) || 0
                        return sum + price
                      }, 0)
                      + Object.values(groupTotals).reduce((sum, v) => sum + (parseFloat(v) || 0), 0)
                    ).toFixed(2)}
                  </span>
                </div>

                {/* NEW — grouped (lump-sum) cards, shown above individually
                    priced items so they're easy to spot and undo. */}
                {Object.entries(groupedDoneItems).map(([groupId, items]) => (
                  <div key={groupId} style={styles.groupCard}>
                    <div style={styles.groupCardTop}>
                      <span style={styles.groupCardIcon}>🧾</span>
                      <span style={styles.groupCardTitle}>{items.length} items grouped</span>
                      <span style={styles.groupCardAmount}>
                        ₹{(groupTotals[groupId] ?? 0).toFixed(2)}
                      </span>
                    </div>
                    <p style={styles.groupCardNames}>
                      {items.map(i => i.item_name).join(', ')}
                    </p>
                    {listStatus !== 'completed' && (
                      <button
                        style={{ ...styles.groupUndoBtn, display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                        onClick={() => undoGroup(groupId)}
                        disabled={undoingGroupId === groupId}
                      >
                        {undoingGroupId === groupId ? 'Undoing…' : (<><Undo2 size={14} /> Undo group — re-select & price</>)}
                      </button>
                    )}
                  </div>
                ))}

                {individualDoneItems.map(item => {
                  const isEditing = !!doneEdits[item.id]
                  const editState = doneEdits[item.id] || {
                    qty: item.quantity || '',
                    price: parseFloat(item.price_entered || 0).toFixed(2),
                  }
                  return (
                    <div
                      key={item.id}
                      style={isEditing
                        ? { ...styles.doneRow, ...styles.doneRowEditing }
                        : styles.doneRow
                      }
                      onClick={() => {
                        if (!isEditing) {
                          setDoneEdits(prev => ({
                            ...prev,
                            [item.id]: {
                              qty: item.quantity || '',
                              price: parseFloat(item.price_entered || 0).toFixed(2),
                            }
                          }))
                        }
                      }}
                    >
                      <div style={styles.doneLeft}>
                        <span style={styles.doneItemName}>{item.item_name}</span>
                        {isEditing ? (
                          <span style={{ ...styles.doneMeta, color: '#4f46e5' }}>Tap Save changes to confirm</span>
                        ) : (
                          <span style={styles.doneMeta}>
                            {item.quantity ? `${item.quantity} · ` : ''}
                            {profiles[item.ticked_by]
                              ? `Bought by ${firstName(profiles[item.ticked_by])}`
                              : 'Bought'
                            }
                            {item.price_entered_at ? ` · ${timeAgo(item.price_entered_at)}` : ''}
                          </span>
                        )}
                      </div>

                      {isEditing ? (
                        <input
                          style={styles.qtyInput}
                          value={editState.qty}
                          onClick={e => e.stopPropagation()}
                          onChange={e => setDoneEdits(prev => ({
                            ...prev,
                            [item.id]: { ...prev[item.id], qty: e.target.value }
                          }))}
                          placeholder="Qty"
                        />
                      ) : null}

                      {isEditing ? (
                        <div style={styles.priceWrapper} onClick={e => e.stopPropagation()}>
                          <span style={styles.rupeeSymbol}>₹</span>
                          <input
                            style={styles.priceInput}
                            type="number"
                            value={editState.price}
                            onChange={e => setDoneEdits(prev => ({
                              ...prev,
                              [item.id]: { ...prev[item.id], price: e.target.value }
                            }))}
                            placeholder="Price"
                            min="0"
                          />
                        </div>
                      ) : (
                        <span style={styles.donePrice}>
                          ₹{parseFloat(item.price_entered || 0).toFixed(2)}
                        </span>
                      )}
                    </div>
                  )
                })}
              </>
            )}
          </div>
        )}

      </div>

      {/* Save bar — To Buy tab */}
      {activeTab === 'to_buy' && anyTicked && listStatus !== 'completed' && (
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

      {/* NEW — lump-sum selection bar: shows whenever 1+ items are
          checked for a combined total, independent of the per-item
          Save changes bar below (which handles typed individual prices). */}
      {activeTab === 'pricing' && Object.keys(pricingSelected).length > 0 && listStatus !== 'completed' && (
        <div style={styles.saveBar}>
          <button
            style={styles.lumpBarBtn}
            onClick={() => setShowLumpModal(true)}
          >
            Enter total for {Object.keys(pricingSelected).length} item{Object.keys(pricingSelected).length > 1 ? 's' : ''}
          </button>
        </div>
      )}

      {/* Save bar — Pricing tab */}
      {activeTab === 'pricing' && Object.values(pricingInputs).some(v => v && parseFloat(v) > 0) && listStatus !== 'completed' && (
        <div style={styles.saveBar}>
          <button
            style={savingPricing ? { ...styles.saveBtn, opacity: 0.6 } : styles.saveBtn}
            onClick={savePricingItems}
            disabled={savingPricing}
          >
            {savingPricing ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      {/* Save bar — Done tab. FIX F: added an explicit Cancel button
          alongside Save, so a stray tap can be backed out of cleanly
          instead of silently sitting in doneEdits forever. */}
      {activeTab === 'done' && Object.keys(doneEdits).length > 0 && (
        <div style={styles.saveBarRow}>
          <button
            style={styles.cancelBtn}
            onClick={cancelDoneEdits}
            disabled={savingDoneEdits}
          >
            Cancel
          </button>
          <button
            style={savingDoneEdits ? { ...styles.saveBtn, opacity: 0.6, flex: 1 } : { ...styles.saveBtn, flex: 1 }}
            onClick={saveDoneEdits}
            disabled={savingDoneEdits}
          >
            {savingDoneEdits ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}

      {/* Floating Add Items button */}
      {activeTab === 'to_buy' && listStatus !== 'completed' && (
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

            {/* ── Drag handle ── */}
            <div style={styles.handle} />

            {/* ── Header ── */}
            <div style={styles.sheetHeader}>
              <p style={styles.sheetTitle}>Add items</p>
              <button
                style={styles.closeBtn}
                onClick={() => { setShowLibrary(false); setSearch('') }}
              ><X size={18} /></button>
            </div>

            {/* ── Chips — scrollable, above search ── */}
            <div style={styles.sheetScrollable}>
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
                      {inList ? <Check size={12} strokeWidth={3} style={{ verticalAlign: '-1px', marginRight: '2px' }} /> : ''}{item.item_name}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* ── Search input pinned at bottom above keyboard ── */}
            <div style={styles.sheetSearchBar}>
              <input
                style={styles.searchInput}
                placeholder="Search or type a new item..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoFocus
              />
            </div>

          </div>
        </>
      )}

      {/* NEW — lump-sum entry popup, same fixed-overlay pattern used
          elsewhere in the app (Quick Log) so it doesn't shift the page. */}
      {showLumpModal && (
        <>
          <div style={styles.overlay} onClick={() => { if (!savingLump) setShowLumpModal(false) }} />
          <div style={styles.lumpModal}>
            <div style={styles.handle} />
            <div style={styles.sheetHeader}>
              <p style={styles.sheetTitle}>
                Total for {Object.keys(pricingSelected).length} item{Object.keys(pricingSelected).length > 1 ? 's' : ''}
              </p>
              <button style={styles.closeBtn} onClick={() => setShowLumpModal(false)} disabled={savingLump}><X size={18} /></button>
            </div>
            <p style={styles.lumpItemList}>
              {pricingItems.filter(i => pricingSelected[i.id]).map(i => i.item_name).join(', ')}
            </p>
            <div style={styles.priceWrapper}>
              <span style={styles.rupeeSymbol}>₹</span>
              <input
                style={styles.priceInput}
                type="number"
                min="0"
                placeholder="Total amount"
                value={lumpAmount}
                onChange={e => setLumpAmount(e.target.value)}
                autoFocus
                disabled={savingLump}
              />
            </div>
            <button
              style={savingLump || !lumpAmount ? { ...styles.saveBtn, opacity: 0.6, marginTop: '1rem' } : { ...styles.saveBtn, marginTop: '1rem' }}
              onClick={saveLumpSum}
              disabled={savingLump || !lumpAmount}
            >
              {savingLump ? 'Saving…' : 'Save total'}
            </button>
          </div>
        </>
      )}

      {SaveDelightOverlay}

    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f9fafb',
    fontFamily: '"Inter", sans-serif',
    paddingBottom: '100px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    padding: 'clamp(0.75rem, 3vw, 1.25rem) clamp(0.75rem, 3vw, 1.25rem) 0.5rem',
    background: '#fff',
    borderBottom: '1px solid #f3f4f6',
  },
  backBtn: {
    background: 'none',
    border: 'none',
    fontSize: 'clamp(0.9rem, 2.2vw, 1rem)',
    color: '#4f46e5',
    cursor: 'pointer',
    padding: 0,
    fontWeight: '600',
  },
  title: { fontSize: 'clamp(1rem, 2.6vw, 1.2rem)', fontWeight: '700', margin: 0, color: '#111' },
  tabs: {
    display: 'flex',
    background: '#fff',
    borderBottom: '1px solid #f3f4f6',
    padding: '0 clamp(0.75rem, 3vw, 1.25rem)',
  },
  tab: {
    flex: 1,
    padding: '0.75rem 0.25rem',
    fontSize: 'clamp(0.75rem, 1.8vw, 0.85rem)',
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
    padding: 'clamp(0.75rem, 3vw, 1.25rem)',
    maxWidth: 'clamp(320px, 94vw, 560px)',
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
    padding: 'clamp(0.65rem, 2vw, 0.85rem) clamp(0.75rem, 2.5vw, 1.1rem)',
    marginBottom: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    transition: 'background 0.15s ease',
  },
  itemRowTicked: {
    background: '#f0fdf4',
  },
  itemName: {
    flex: 1,
    fontSize: 'clamp(0.88rem, 2.2vw, 1rem)',
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
  pricingRowSelected: {
    background: '#eff6ff',
    boxShadow: '0 0 0 2px #4f46e5',
  },
  lumpCheckbox: {
    width: '26px',
    height: '26px',
    borderRadius: '8px',
    border: '2px solid #d1d5db',
    background: '#fff',
    color: '#fff',
    fontSize: '0.9rem',
    fontWeight: '700',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    padding: 0,
  },
  lumpCheckboxActive: {
    background: '#4f46e5',
    borderColor: '#4f46e5',
    color: '#fff',
  },
  lumpBarBtn: {
    width: '100%',
    padding: '0.85rem',
    fontSize: '1rem',
    fontWeight: '700',
    background: '#111',
    color: '#fff',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  lumpModal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '90%',
    maxWidth: '380px',
    background: '#fff',
    borderRadius: '20px',
    padding: '1.25rem',
    boxShadow: '0 8px 40px rgba(0,0,0,0.2)',
    zIndex: 110,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.9rem',
  },
  lumpItemList: {
    fontSize: '0.82rem',
    color: '#6b7280',
    margin: 0,
    lineHeight: '1.5',
  },
  groupCard: {
    background: '#fffbeb',
    border: '1px solid #fde68a',
    borderRadius: '14px',
    padding: '0.85rem 1rem',
    marginBottom: '0.6rem',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
  },
  groupCardTop: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
  },
  groupCardIcon: { fontSize: '1.1rem' },
  groupCardTitle: { flex: 1, fontSize: '0.9rem', fontWeight: '700', color: '#92400e' },
  groupCardAmount: { fontSize: '1rem', fontWeight: '800', color: '#111' },
  groupCardNames: { fontSize: '0.8rem', color: '#78716c', margin: 0, lineHeight: '1.4' },
  groupUndoBtn: {
    alignSelf: 'flex-start',
    background: 'none',
    border: 'none',
    color: '#b45309',
    fontSize: '0.8rem',
    fontWeight: '700',
    cursor: 'pointer',
    padding: '0.2rem 0',
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
  moveBackBtn: {
    background: '#f3f4f6',
    border: 'none',
    borderRadius: '8px',
    padding: '0.35rem 0.5rem',
    fontSize: '0.9rem',
    cursor: 'pointer',
    color: '#6b7280',
    flexShrink: 0,
    title: 'Move back to To Buy',
  },
  totalBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#fff',
    borderRadius: '12px',
    padding: 'clamp(0.7rem, 2.2vw, 0.95rem) clamp(0.75rem, 2.5vw, 1.1rem)',
    marginBottom: '0.75rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  totalLabel: {
    fontSize: 'clamp(0.85rem, 2vw, 0.95rem)',
    fontWeight: '600',
    color: '#6b7280',
  },
  totalAmount: {
    fontSize: 'clamp(1rem, 2.6vw, 1.2rem)',
    fontWeight: '700',
    color: '#4f46e5',
  },
  doneRowEditing: {
    background: '#eff6ff',
    borderColor: '#bfdbfe',
    border: '1px solid #bfdbfe',
  },
  doneRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    background: '#fff',
    borderRadius: '12px',
    padding: '0.75rem 1rem',
    marginBottom: '0.5rem',
    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
  },
  doneLeft: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    gap: '0.2rem',
  },
  doneItemName: {
    fontSize: '0.95rem',
    fontWeight: '500',
    color: '#111',
  },
  doneMeta: {
    fontSize: '0.75rem',
    color: '#9ca3af',
  },
  donePrice: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#16a34a',
    flexShrink: 0,
  },
  completedBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    background: '#f0fdf4',
    borderBottom: '1px solid #bbf7d0',
    padding: '0.65rem 1rem',
  },
  completedBannerIcon: {
    fontSize: '1rem',
  },
  completedBannerText: {
    fontSize: '0.85rem',
    fontWeight: '600',
    color: '#16a34a',
  },
  dupBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: '#fef9c3',
    border: '1px solid #fde047',
    borderRadius: '10px',
    padding: '0.6rem 0.85rem',
    marginBottom: '0.75rem',
  },
  dupBannerText: {
    fontSize: '0.875rem',
    fontWeight: '500',
    color: '#854d0e',
    flex: 1,
  },
  dupBannerDismiss: {
    background: 'none',
    border: 'none',
    color: '#a16207',
    fontSize: '0.9rem',
    cursor: 'pointer',
    padding: '0 0.25rem',
    marginLeft: '0.5rem',
  },
  saveBar: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #f3f4f6',
    padding: 'clamp(0.65rem, 2.2vw, 0.85rem) clamp(1rem, 3.5vw, 1.4rem)',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
    zIndex: 40,
  },
  // FIX F — new style: a two-button row (Cancel + Save) for the Done tab,
  // replacing the single full-width Save button used there before.
  saveBarRow: {
    position: 'fixed',
    bottom: 0,
    left: 0,
    right: 0,
    background: '#fff',
    borderTop: '1px solid #f3f4f6',
    padding: '0.75rem 1.25rem',
    boxShadow: '0 -4px 16px rgba(0,0,0,0.06)',
    zIndex: 40,
    display: 'flex',
    gap: '0.75rem',
  },
  cancelBtn: {
    padding: '0.85rem 1.25rem',
    fontSize: '1rem',
    fontWeight: '700',
    background: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
  },
  saveBtn: {
    width: '100%',
    padding: 'clamp(0.75rem, 2.4vw, 0.95rem)',
    fontSize: 'clamp(0.95rem, 2.4vw, 1.05rem)',
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
    boxShadow: '0 -4px 24px rgba(0,0,0,0.15)',
    zIndex: 100,
    maxHeight: '60vh',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sheetSticky: {
    flexShrink: 0,
    padding: '0.75rem 1.25rem 0',
    background: '#fff',
  },
  sheetScrollable: {
    flex: 1,
    overflowY: 'auto',
    padding: '0 1.25rem 0.5rem',
    WebkitOverflowScrolling: 'touch',
  },
  sheetSearchBar: {
    flexShrink: 0,
    padding: '0.75rem 1.25rem 1rem',
    background: '#fff',
    borderTop: '1px solid #f3f4f6',
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
    outline: 'none',
    marginBottom: 0,
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