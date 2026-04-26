import { useState, useEffect } from 'react'

const API = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function SmartChecklists({ user }) {
  const [lists, setLists] = useState([])
  const [loading, setLoading] = useState(true)
  const [newListTitle, setNewListTitle] = useState('')
  const [addingList, setAddingList] = useState(false)
  const [activeList, setActiveList] = useState(null)

  const uid = user?.telegram_id || user?.email

  useEffect(() => { if (uid) fetchLists() }, [uid])

  const fetchLists = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API}/checklists?user_id=${encodeURIComponent(uid)}`)
      const data = await res.json()
      if (!Array.isArray(data)) { setLists([]); return }
      setLists(data)
      if (data.length && !activeList) setActiveList(data[0].id)
    } catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const createList = async () => {
    if (!newListTitle.trim()) return
    const res = await fetch(`${API}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: uid, title: newListTitle.trim() })
    })
    const data = await res.json()
    setLists(prev => [...prev, data])
    setActiveList(data.id)
    setNewListTitle('')
    setAddingList(false)
  }

  const deleteList = async (id) => {
    await fetch(`${API}/checklists/${id}`, { method: 'DELETE' })
    const remaining = lists.filter(l => l.id !== id)
    setLists(remaining)
    setActiveList(remaining.length ? remaining[0].id : null)
  }

  const addItem = async (listId, text, parentId = null) => {
    if (!text.trim()) return
    const pos = lists.find(l => l.id === listId)?.items?.length || 0
    const res = await fetch(`${API}/checklists/${listId}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: text.trim(), parent_id: parentId, position: pos })
    })
    const item = await res.json()
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: [...(l.items || []), item] } : l))
  }

  const toggleItem = async (listId, itemId, done) => {
    await fetch(`${API}/checklists/items/${itemId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done })
    })
    setLists(prev => prev.map(l => l.id === listId
      ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, done } : i) }
      : l
    ))
  }

  const deleteItem = async (listId, itemId) => {
    await fetch(`${API}/checklists/items/${itemId}`, { method: 'DELETE' })
    setLists(prev => prev.map(l => l.id === listId
      ? { ...l, items: l.items.filter(i => i.id !== itemId && i.parent_id !== itemId) }
      : l
    ))
  }

  const current = lists.find(l => l.id === activeList)
  const rootItems = current?.items?.filter(i => !i.parent_id) || []
  const doneCount = current?.items?.filter(i => i.done).length || 0
  const totalCount = current?.items?.length || 0
  const progress = totalCount ? Math.round((doneCount / totalCount) * 100) : 0

  // SVG ring values
  const r = 28, circ = 2 * Math.PI * r
  const offset = circ - (progress / 100) * circ

  if (loading) return (
    <div className="cl-loading">
      <div className="spinner" />
    </div>
  )

  return (
    <div className="cl-root">

      {/* ── Sidebar ── */}
      <div className="cl-sidebar">
        <div className="cl-sidebar-header">
          <span className="cl-sidebar-title">My Lists</span>
          <button className="cl-add-list-btn" onClick={() => setAddingList(true)} title="New list">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
        </div>

        {addingList && (
          <div className="cl-new-list-form">
            <input
              className="cl-input"
              placeholder="List name..."
              value={newListTitle}
              onChange={e => setNewListTitle(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createList(); if (e.key === 'Escape') setAddingList(false) }}
              autoFocus
            />
            <div className="cl-new-list-actions">
              <button className="cl-btn-primary" onClick={createList}>Create</button>
              <button className="cl-btn-ghost" onClick={() => { setAddingList(false); setNewListTitle('') }}>✕</button>
            </div>
          </div>
        )}

        <div className="cl-list-items">
          {lists.length === 0 && !addingList && (
            <div className="cl-sidebar-empty">
              <p>No lists yet.</p>
              <button className="cl-sidebar-empty-btn" onClick={() => setAddingList(true)}>Create one →</button>
            </div>
          )}
          {lists.map(l => {
            const done = l.items?.filter(i => i.done).length || 0
            const total = l.items?.length || 0
            const pct = total ? Math.round((done / total) * 100) : 0
            return (
              <button key={l.id} className={`cl-list-tab ${activeList === l.id ? 'active' : ''}`} onClick={() => setActiveList(l.id)}>
                <div className="cl-list-tab-inner">
                  <span className="cl-list-tab-name">{l.title}</span>
                  <span className="cl-list-tab-count">{done}/{total}</span>
                </div>
                <div className="cl-list-tab-bar">
                  <div className="cl-list-tab-fill" style={{ width: `${pct}%` }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Main Panel ── */}
      <div className="cl-main">
        {!current ? (
          <div className="cl-empty">
            <div className="cl-empty-icon">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
            </div>
            <p className="cl-empty-title">No list selected</p>
            <p className="cl-empty-sub">Pick a list from the sidebar or create a new one.</p>
            <button className="cl-btn-primary" style={{ marginTop: '1rem' }} onClick={() => setAddingList(true)}>
              + New List
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="cl-main-header">
              <div className="cl-main-header-left">
                {/* Progress ring */}
                <div className="cl-ring-wrap">
                  <svg width="64" height="64" viewBox="0 0 64 64">
                    <circle cx="32" cy="32" r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="5"/>
                    <circle cx="32" cy="32" r={r} fill="none" stroke="#f97316" strokeWidth="5"
                      strokeDasharray={circ} strokeDashoffset={offset}
                      strokeLinecap="round" transform="rotate(-90 32 32)"
                      style={{ transition: 'stroke-dashoffset 0.5s ease' }}
                    />
                  </svg>
                  <div className="cl-ring-label">
                    <span className="cl-ring-pct">{progress}</span>
                    <span className="cl-ring-unit">%</span>
                  </div>
                </div>

                <div>
                  <h3 className="cl-main-title">{current.title}</h3>
                  <span className="cl-main-meta">
                    {doneCount} of {totalCount} task{totalCount !== 1 ? 's' : ''} completed
                  </span>
                  {totalCount > 0 && (
                    <div className="cl-main-bar-wrap">
                      <div className="cl-main-bar">
                        <div className="cl-main-bar-fill" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button className="cl-delete-list" onClick={() => deleteList(current.id)} title="Delete list">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                  <path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                </svg>
              </button>
            </div>

            {/* Divider */}
            <div className="cl-divider" />

            {/* Tasks */}
            <div className="cl-items">
              {rootItems.length === 0 && (
                <div className="cl-tasks-empty">
                  <p>No tasks yet. Add one below ↓</p>
                </div>
              )}
              {rootItems.map(item => (
                <ChecklistItem
                  key={item.id}
                  item={item}
                  subItems={current.items.filter(i => i.parent_id === item.id)}
                  listId={current.id}
                  onToggle={toggleItem}
                  onDelete={deleteItem}
                  onAddSub={(text) => addItem(current.id, text, item.id)}
                />
              ))}
            </div>

            {/* Add task row */}
            <AddItemRow onAdd={(text) => addItem(current.id, text)} />
          </>
        )}
      </div>
    </div>
  )
}

function ChecklistItem({ item, subItems, listId, onToggle, onDelete, onAddSub }) {
  const [addingSub, setAddingSub] = useState(false)
  const [subText, setSubText] = useState('')

  const submitSub = () => {
    if (subText.trim()) { onAddSub(subText); setSubText(''); setAddingSub(false) }
  }

  return (
    <div className="cl-item-wrap">
      <div className={`cl-item-row ${item.done ? 'done' : ''}`}>
        <button className={`cl-checkbox ${item.done ? 'checked' : ''}`} onClick={() => onToggle(listId, item.id, !item.done)}>
          {item.done && (
            <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
              <path d="M1 3.5L3.5 6L8 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>
        <span className="cl-item-text">{item.text}</span>
        {subItems.length > 0 && (
          <span className="cl-sub-count">{subItems.filter(s => s.done).length}/{subItems.length}</span>
        )}
        <div className="cl-item-actions">
          <button className="cl-action-btn" onClick={() => setAddingSub(v => !v)} title="Add sub-task">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          </button>
          <button className="cl-action-btn cl-action-delete" onClick={() => onDelete(listId, item.id)} title="Delete">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>
      </div>

      {subItems.length > 0 && (
        <div className="cl-subitems">
          {subItems.map(sub => (
            <div key={sub.id} className={`cl-item-row cl-subitem-row ${sub.done ? 'done' : ''}`}>
              <div className="cl-sub-indent">
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <path d="M2 2v6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
                </svg>
              </div>
              <button className={`cl-checkbox cl-checkbox-sm ${sub.done ? 'checked' : ''}`} onClick={() => onToggle(listId, sub.id, !sub.done)}>
                {sub.done && (
                  <svg width="7" height="5" viewBox="0 0 9 7" fill="none">
                    <path d="M1 3.5L3.5 6L8 1" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                )}
              </button>
              <span className="cl-item-text">{sub.text}</span>
              <div className="cl-item-actions">
                <button className="cl-action-btn cl-action-delete" onClick={() => onDelete(listId, sub.id)}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {addingSub && (
        <div className="cl-subitems">
          <div className="cl-add-sub-row">
            <div className="cl-sub-indent">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M2 2v6h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.3"/>
              </svg>
            </div>
            <input
              className="cl-input cl-sub-input"
              placeholder="Sub-task..."
              value={subText}
              onChange={e => setSubText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') submitSub(); if (e.key === 'Escape') setAddingSub(false) }}
              autoFocus
            />
            <button className="cl-btn-primary cl-btn-sm" onClick={submitSub}>Add</button>
            <button className="cl-btn-ghost cl-btn-sm" onClick={() => setAddingSub(false)}>✕</button>
          </div>
        </div>
      )}
    </div>
  )
}

function AddItemRow({ onAdd }) {
  const [text, setText] = useState('')
  const [focused, setFocused] = useState(false)
  const submit = () => { if (text.trim()) { onAdd(text); setText('') } }
  return (
    <div className={`cl-add-row ${focused ? 'focused' : ''}`}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="cl-add-icon">
        <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <input
        className="cl-add-input"
        placeholder="Add a task..."
        value={text}
        onChange={e => setText(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        onKeyDown={e => { if (e.key === 'Enter') submit() }}
      />
      {text && <button className="cl-btn-primary cl-btn-sm" onClick={submit}>Add</button>}
    </div>
  )
}
